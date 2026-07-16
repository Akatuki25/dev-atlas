// 手書き(アプリ所有の足場を置換): Work Logs を日付タイムラインで見せる。
// 日ごとにグループ化し、その日の合計工数を出す(ログの意味=時系列の記録)。
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listWorkLogs } from "../../gen/client/work_log";
import { listProjects } from "../../gen/client/project";
import type { WorkLog } from "../../gen/types/work_log";
import type { Project } from "../../gen/types/project";
import { Page, EmptyState, Badge } from "../../lib/widgets";

function dayKey(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString();
}
function hm(min: number): string {
  return `${Math.floor(min / 60)}h${min % 60}m`;
}

export default function WorkLogsPage() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    listWorkLogs().then(setLogs).catch(() => {});
    listProjects().then(setProjects).catch(() => {});
  }, []);
  const projName = (id: string) => projects.find((p) => p.id === id)?.name ?? "";

  const sorted = [...logs].sort((a, b) => b.created_at_unix - a.created_at_unix);
  const days: { day: string; items: WorkLog[]; total: number }[] = [];
  for (const l of sorted) {
    const k = dayKey(l.created_at_unix);
    let g = days.find((d) => d.day === k);
    if (!g) { g = { day: k, items: [], total: 0 }; days.push(g); }
    g.items.push(l);
    g.total += l.minutes;
  }
  const grandTotal = logs.reduce((a, l) => a + l.minutes, 0);

  return (
    <Page
      title="Work Logs"
      description={`作業ログ(工数)の時系列。累計 ${hm(grandTotal)} / ${logs.length}件。MCP の log_work でエージェントが自動記録。`}
      actions={<Link href="/work_logs/new" style={{ fontSize: "var(--text-sm)" }}>+ New</Link>}
    >
      {logs.length === 0 ? (
        <EmptyState message="ログがありません" action={<Link href="/work_logs/new">+ New</Link>} />
      ) : (
        <div style={{ display: "grid", gap: "var(--sp-5)" }}>
          {days.map((d) => (
            <section key={d.day}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "var(--sp-2)", marginBottom: "var(--sp-2)", position: "sticky", top: 0 }}>
                <h2 style={{ margin: 0, fontSize: "var(--text-md)", fontWeight: 700 }}>{d.day}</h2>
                <span style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>{hm(d.total)} · {d.items.length}件</span>
              </div>
              <div style={{ display: "grid", gap: "var(--sp-2)", borderLeft: "2px solid var(--border)", paddingLeft: "var(--sp-4)" }}>
                {d.items.map((l) => (
                  <Link key={l.id} href={"/work_logs/" + l.id} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "var(--sp-2)" }}>
                      <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{l.summary}</span>
                      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{l.minutes}分</span>
                      {projName(l.project_id) && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{projName(l.project_id)}</span>}
                      <span style={{ marginLeft: "auto" }}><Badge tone={l.source === "mcp" ? "accent" : "neutral"}>{l.source}</Badge></span>
                    </div>
                    {l.detail && <div style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.detail}</div>}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
