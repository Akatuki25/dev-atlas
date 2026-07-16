// 手書き: KB(knowledge_base) 読み取り層。サーバーコンポーネント専用。
// KB_PATH(コンテナでは /kb に read-only マウント)配下の Markdown wiki を読む。
// [[wikilink]] は /wiki/n/<name> へのリンクに変換し、名前解決はファイル名 / frontmatter id / aliases で行う。
import "server-only";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";

const KB_ROOT = resolve(process.env.KB_PATH ?? "/kb");

export type KbPage = {
  relPath: string;
  title: string;
  frontmatter: Record<string, string>;
  /** [[wikilink]] 変換済みの Markdown 本文 */
  body: string;
};

export type KbNode = {
  relPath: string;
  name: string;          // ファイル名(拡張子なし)= wikilink の解決キー
  title: string;
  category: string;      // wiki/<category>/... の <category>(無ければ "misc")
  type: string;          // frontmatter type(principle/selection/...)
  status: string;
  description: string;   // TL;DR or 本文先頭の一文(一覧カード用)
};

// KB の「抽象 → 具体」の思考段階(INDEX.md の順序に対応)。サイドバー/一覧はこの順で並べる。
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

function firstDescription(body: string): string {
  const lines = body.split("\n");
  // "## TL;DR" 直後の最初の非空行を優先
  const tldr = lines.findIndex((l) => /^#+\s*TL;DR/i.test(l.trim()));
  const start = tldr >= 0 ? tldr + 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith("#") || t.startsWith("---")) continue;
    // markdown 記号を軽く除去して1文に
    return t.replace(/[*_`>[\]]/g, "").replace(/\(\/wiki[^)]*\)/g, "").slice(0, 140);
  }
  return "";
}

function categoryOf(relPath: string): string {
  const parts = relPath.split("/");
  const wi = parts.indexOf("wiki");
  return wi >= 0 && parts[wi + 1] && parts.length > wi + 2 ? parts[wi + 1] : "misc";
}

/** 全ノードを frontmatter + 説明つきで返す(一覧・サイドバー用) */
export function listNodes(): KbNode[] {
  if (!kbAvailable()) return [];
  return listPages()
    .filter((rel) => rel !== "INDEX.md" && !rel.endsWith("MEMORY.md") && !rel.endsWith("TODO.md"))
    .map((rel) => {
      const { fm, body } = parseFrontmatter(readFileSync(join(KB_ROOT, rel), "utf8"));
      const name = rel.split("/").pop()!.replace(/\.md$/, "");
      return {
        relPath: rel,
        name,
        title: fm.title ?? name,
        category: categoryOf(rel),
        type: fm.type ?? "",
        status: fm.status ?? "",
        description: firstDescription(body),
      };
    });
}

/** カテゴリ順(抽象→具体)にグループ化 */
export function nodesByCategory(): { category: string; label: string; nodes: KbNode[] }[] {
  const nodes = listNodes();
  const order = [...CATEGORY_ORDER, "misc"];
  const groups = new Map<string, KbNode[]>();
  for (const n of nodes) {
    if (!groups.has(n.category)) groups.set(n.category, []);
    groups.get(n.category)!.push(n);
  }
  return order
    .filter((c) => groups.has(c))
    .map((c) => ({
      category: c,
      label: CATEGORY_LABEL[c] ?? c,
      nodes: groups.get(c)!.sort((a, b) => a.title.localeCompare(b.title)),
    }));
}

export function kbAvailable(): boolean {
  return existsSync(KB_ROOT);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (name.endsWith(".md")) out.push(abs.slice(KB_ROOT.length + 1));
  }
  return out;
}

export function listPages(): string[] {
  if (!kbAvailable()) return [];
  return walk(KB_ROOT).sort();
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

/** パストラバーサルを拒否して KB 配下の .md を読む */
export function readPage(rel: string): KbPage | null {
  const abs = resolve(KB_ROOT, normalize(rel));
  if (!abs.startsWith(KB_ROOT + "/") || !abs.endsWith(".md") || !existsSync(abs)) return null;
  const { fm, body } = parseFrontmatter(readFileSync(abs, "utf8"));
  const base = rel.split("/").pop()!.replace(/\.md$/, "");
  return {
    relPath: abs.slice(KB_ROOT.length + 1),
    title: fm.title ?? base,
    frontmatter: fm,
    body: convertWikilinks(body),
  };
}

/** [[name]] の解決: ファイル名 → frontmatter id → aliases の順で探す */
export function resolveName(name: string): string | null {
  const target = name.trim().toLowerCase();
  const pages = listPages();
  for (const rel of pages) {
    const base = rel.split("/").pop()!.replace(/\.md$/, "").toLowerCase();
    if (base === target) return rel;
  }
  for (const rel of pages) {
    const raw = readFileSync(join(KB_ROOT, rel), "utf8").slice(0, 2000);
    const { fm } = parseFrontmatter(raw);
    if (fm.id?.toLowerCase() === target) return rel;
    if (fm.aliases?.toLowerCase().includes(`"${target}"`)) return rel;
  }
  return null;
}
