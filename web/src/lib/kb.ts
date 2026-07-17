// 手書き: KB(knowledge_base)読み取り層。**GitHub API 経由**(fs に置かない)。
// private repo のトークンで tree/contents を読む → Vercel(サーバレス)でも Railway でも同一に動く。
// 読むたびに最新(pull間隔のラグ無し)。Next の fetch キャッシュ(revalidate)で GitHub を叩きすぎない。
import "server-only";

const REPO = process.env.KB_REPO ?? "Akatuki25/knowledge_base";
const BRANCH = process.env.KB_BRANCH ?? "main";
const TOKEN = process.env.KB_GITHUB_TOKEN ?? "";
const REVALIDATE = Number(process.env.KB_CACHE_SECONDS ?? "300"); // 既定5分キャッシュ

export type KbPage = {
  relPath: string;
  title: string;
  frontmatter: Record<string, string>;
  body: string; // [[wikilink]] 変換済み
};

export type KbNode = {
  relPath: string;
  name: string;
  title: string;
  category: string;
  type: string;
  status: string;
  description: string;
};

export const CATEGORY_ORDER = [
  "principles", "selection", "architecture", "tech",
  "projects", "references", "pitfalls", "domains", "categories",
] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  principles: "Principles — 設計思想(最も抽象)",
  selection: "Selection — 技術選定の考え方",
  architecture: "Architecture — FW非依存の設計",
  tech: "Tech — フレームワークの使い方",
  projects: "Projects — 各プロジェクトのなぜ(最も具体)",
  references: "References — 論文・記事の要点",
  pitfalls: "Pitfalls — ハマり・落とし穴",
  domains: "Domains — ドメイン知識",
  categories: "Categories — 横断ビュー",
  misc: "その他",
};

function ghHeaders(raw = false): HeadersInit {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function kbAvailable(): Promise<boolean> {
  if (!TOKEN) return false;
  return (await listPaths()).length > 0;
}

/** repo の md ファイルパス一覧(tree API 1回)。 */
async function listPaths(): Promise<string[]> {
  if (!TOKEN) return [];
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`,
    { headers: ghHeaders(), next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { tree?: { path: string; type: string }[] };
  return (data.tree ?? [])
    .filter((t) => t.type === "blob" && t.path.endsWith(".md"))
    .map((t) => t.path)
    .sort();
}

/** 生 Markdown を取得(contents API raw)。存在しなければ null。 */
async function readRaw(rel: string): Promise<string | null> {
  if (!TOKEN) return null;
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${encodeURI(rel)}?ref=${BRANCH}`,
    { headers: ghHeaders(true), next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) return null;
  return res.text();
}

function parseFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: raw };
  const fm: Record<string, string> = {};
  for (const line of raw.slice(3, end).split("\n")) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return { fm, body: raw.slice(end + 4).replace(/^\n/, "") };
}

function convertWikilinks(md: string): string {
  return md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, name: string, label?: string) => {
    const n = name.trim();
    return `[${label?.trim() ?? n}](/wiki/n/${encodeURIComponent(n)})`;
  });
}

function firstDescription(body: string): string {
  const lines = body.split("\n");
  const tldr = lines.findIndex((l) => /^#+\s*TL;DR/i.test(l.trim()));
  const start = tldr >= 0 ? tldr + 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith("#") || t.startsWith("---")) continue;
    return t.replace(/[*_`>[\]]/g, "").replace(/\(\/wiki[^)]*\)/g, "").slice(0, 140);
  }
  return "";
}

function categoryOf(relPath: string): string {
  const parts = relPath.split("/");
  const wi = parts.indexOf("wiki");
  return wi >= 0 && parts[wi + 1] && parts.length > wi + 2 ? parts[wi + 1] : "misc";
}

/** 1ノードを読む(パストラバーサル不要 = GitHub 側で解決)。 */
export async function readPage(rel: string): Promise<KbPage | null> {
  if (!rel.endsWith(".md")) return null;
  const raw = await readRaw(rel);
  if (raw == null) return null;
  const { fm, body } = parseFrontmatter(raw);
  const base = rel.split("/").pop()!.replace(/\.md$/, "");
  return { relPath: rel, title: fm.title ?? base, frontmatter: fm, body: convertWikilinks(body) };
}

/** 全ノードを frontmatter + 説明つきで(index/サイドバー用)。各ファイルを並列取得(キャッシュ有)。 */
export async function listNodes(): Promise<KbNode[]> {
  const paths = (await listPaths()).filter(
    (rel) => rel !== "INDEX.md" && !rel.endsWith("MEMORY.md") && !rel.endsWith("TODO.md"),
  );
  const nodes = await Promise.all(paths.map(async (rel) => {
    const raw = (await readRaw(rel)) ?? "";
    const { fm, body } = parseFrontmatter(raw);
    const name = rel.split("/").pop()!.replace(/\.md$/, "");
    return {
      relPath: rel, name, title: fm.title ?? name, category: categoryOf(rel),
      type: fm.type ?? "", status: fm.status ?? "", description: firstDescription(body),
    };
  }));
  return nodes;
}

export async function nodesByCategory(): Promise<{ category: string; label: string; nodes: KbNode[] }[]> {
  const nodes = await listNodes();
  const order = [...CATEGORY_ORDER, "misc"];
  const groups = new Map<string, KbNode[]>();
  for (const n of nodes) {
    if (!groups.has(n.category)) groups.set(n.category, []);
    groups.get(n.category)!.push(n);
  }
  return order
    .filter((c) => groups.has(c))
    .map((c) => ({
      category: c, label: CATEGORY_LABEL[c] ?? c,
      nodes: groups.get(c)!.sort((a, b) => a.title.localeCompare(b.title)),
    }));
}

/** [[name]] の解決: ファイル名 → frontmatter id → aliases。ファイル名一致はtreeだけで済む(read不要)。 */
export async function resolveName(name: string): Promise<string | null> {
  const target = name.trim().toLowerCase();
  const paths = await listPaths();
  for (const rel of paths) {
    const base = rel.split("/").pop()!.replace(/\.md$/, "").toLowerCase();
    if (base === target) return rel;
  }
  for (const rel of paths) {
    const raw = await readRaw(rel);
    if (!raw) continue;
    const { fm } = parseFrontmatter(raw.slice(0, 2000));
    if (fm.id?.toLowerCase() === target) return rel;
    if (fm.aliases?.toLowerCase().includes(`"${target}"`)) return rel;
  }
  return null;
}
