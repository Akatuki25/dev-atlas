// 手書き: wiki トップ。KB の構造(抽象→具体の思考段階)を視覚化し、カテゴリごとにノードを見せる。
import Link from "next/link";
import { kbAvailable, nodesByCategory, CATEGORY_LABEL } from "../../lib/kb";
import { Page, ListStack, ListRow, Badge, EmptyState } from "../../lib/widgets";

export const dynamic = "force-dynamic";

// 抽象→具体の思考段階(この5つを「概念の階層」として前面に出す)
const LADDER = [
  { key: "principles", label: "Principles", note: "設計思想・判断基準" },
  { key: "selection", label: "Selection", note: "技術をどう選ぶか" },
  { key: "architecture", label: "Architecture", note: "FW非依存の設計" },
  { key: "tech", label: "Tech", note: "フレームワークの使い方" },
  { key: "projects", label: "Projects", note: "なぜこの設計か" },
];

function nodeHref(relPath: string): string {
  return "/wiki/p/" + relPath.replace(/\.md$/, "").split("/").map(encodeURIComponent).join("/");
}

export default function WikiIndex() {
  if (!kbAvailable()) {
    return (
      <Page title="Wiki" description="開発ナレッジベース(knowledge_base)を wiki 形式で閲覧する">
        <EmptyState message="KB がマウントされていません。KB_PATH(既定 /kb)に knowledge_base をマウントしてください(README 参照)。" />
      </Page>
    );
  }

  const groups = nodesByCategory();
  const counts = Object.fromEntries(groups.map((g) => [g.category, g.nodes.length]));
  const total = groups.reduce((a, g) => a + g.nodes.length, 0);

  return (
    <Page
      title="Knowledge Base"
      description={`開発ナレッジを「抽象 → 具体」の思考段階で構造化した wiki。全 ${total} ノード。`}
    >
      {/* 概念の階層: 縦スパイン + 番号ドットで「抽象 → 具体」を1本の流れとして見せる */}
      <div style={{ maxWidth: 520, marginBottom: "var(--sp-6)" }}>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "var(--sp-2)" }}>
          概念の階層
        </div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", paddingLeft: 30, marginBottom: 2 }}>抽象 — 判断の核</div>
        <div style={{ position: "relative" }}>
          {/* spine */}
          <div style={{ position: "absolute", left: 10, top: 12, bottom: 12, width: 2, background: "var(--border-strong)" }} />
          {LADDER.map((step, i) => {
            const count = counts[step.key] ?? 0;
            const has = count > 0;
            return (
              <Link
                key={step.key}
                href={"#cat-" + step.key}
                style={{
                  position: "relative", display: "grid", gridTemplateColumns: "22px 1fr auto",
                  alignItems: "center", gap: "var(--sp-3)", padding: "var(--sp-2) var(--sp-2) var(--sp-2) 0",
                  textDecoration: "none", color: "inherit", borderRadius: "var(--radius-sm)",
                }}
              >
                <span
                  style={{
                    width: 22, height: 22, borderRadius: 999, display: "grid", placeItems: "center",
                    fontSize: 11, fontWeight: 700,
                    background: has ? "var(--accent)" : "var(--bg)",
                    color: has ? "var(--on-accent)" : "var(--text-faint)",
                    border: has ? "2px solid var(--accent)" : "2px solid var(--border-strong)",
                    boxShadow: "0 0 0 4px var(--bg)", // spine を dot 背後でマスク
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ display: "flex", alignItems: "baseline", gap: "var(--sp-2)", minWidth: 0 }}>
                  <b style={{ fontSize: "var(--text-md)" }}>{step.label}</b>
                  <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", whiteSpace: "nowrap" }}>{step.note}</span>
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "var(--text-sm)", color: has ? "var(--text-muted)" : "var(--text-faint)" }}>
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", paddingLeft: 30, marginTop: 2 }}>具体 — 実装のなぜ</div>
      </div>

      {/* カテゴリごとのノード一覧 */}
      {groups.map((g) => (
        <section key={g.category} id={"cat-" + g.category} style={{ marginBottom: "var(--sp-6)", scrollMarginTop: "var(--sp-4)" }}>
          <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--sp-1)" }}>
            {(CATEGORY_LABEL[g.category] ?? g.category).split(" — ")[0]}
            <span style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)", fontWeight: 400 }}>
              {"  "}{(CATEGORY_LABEL[g.category] ?? "").split(" — ")[1] ?? ""} · {g.nodes.length}
            </span>
          </h2>
          <ListStack>
            {g.nodes.map((n) => (
              <ListRow
                key={n.relPath}
                href={nodeHref(n.relPath)}
                leading={n.status ? <Badge tone={n.status === "verified" ? "ok" : "neutral"}>{n.type || "note"}</Badge> : undefined}
                primary={n.title}
                secondary={n.description || undefined}
              />
            ))}
          </ListStack>
        </section>
      ))}
    </Page>
  );
}
