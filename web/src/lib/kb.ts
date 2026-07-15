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
