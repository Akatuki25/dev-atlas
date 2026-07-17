// 手書き: wiki の二段レイアウト(カテゴリ tree + 記事)。グローバルシェルの中にネストする。
import type { ReactNode } from "react";
import { kbAvailable, nodesByCategory } from "../../lib/kb";
import { WikiNav } from "./WikiNav";

export const dynamic = "force-dynamic"; // KB は GitHub API を毎回読む(キャッシュは lib/kb 側)

export default async function WikiLayout({ children }: { children: ReactNode }) {
  const groups = (await kbAvailable())
    ? (await nodesByCategory()).map((g) => ({
        category: g.category,
        label: g.label,
        nodes: g.nodes.map((n) => ({ relPath: n.relPath, name: n.name, title: n.title })),
      }))
    : [];
  return (
    <div className="wiki-shell">
      {groups.length > 0 && (
        <nav className="wiki-nav">
          <WikiNav groups={groups} />
        </nav>
      )}
      <div className="wiki-main">{children}</div>
    </div>
  );
}
