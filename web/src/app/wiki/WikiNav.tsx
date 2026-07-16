// 手書き: wiki カテゴリ tree(サイドバー)。抽象→具体の順でカテゴリ別にノードを並べる。
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavNode = { relPath: string; name: string; title: string };
export type NavGroup = { category: string; label: string; nodes: NavNode[] };

function nodeHref(relPath: string): string {
  return "/wiki/p/" + relPath.replace(/\.md$/, "").split("/").map(encodeURIComponent).join("/");
}

export function WikiNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname() ?? "";
  const current = decodeURIComponent(pathname);
  return (
    <div>
      <Link href="/wiki" className="wiki-node" style={{ fontWeight: 700, marginBottom: "var(--sp-2)" }}>
        ← Wiki トップ
      </Link>
      {groups.map((g) => {
        const [main, sub] = g.label.split(" — ");
        return (
          <div key={g.category}>
            <div className="wiki-cat">
              {main} <span className="wiki-cat-sub">{sub ? "· " + sub.split("(")[0] : ""}</span>
            </div>
            {g.nodes.map((n) => {
              const href = nodeHref(n.relPath);
              const active = current === href;
              return (
                <Link key={n.relPath} href={href} className={"wiki-node" + (active ? " active" : "")} title={n.title}>
                  {n.title}
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
