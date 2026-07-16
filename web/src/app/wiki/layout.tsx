// 手書き: wiki の二段レイアウト(カテゴリ tree + 記事)。グローバルシェルの中にネストする。
import type { ReactNode } from "react";
import { kbAvailable, nodesByCategory } from "../../lib/kb";
import { WikiNav } from "./WikiNav";

export const dynamic = "force-dynamic"; // KB はマウントされた実ファイルを毎回読む

export default function WikiLayout({ children }: { children: ReactNode }) {
  const groups = kbAvailable()
    ? nodesByCategory().map((g) => ({
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
