// 手書き: Dashboard(ホーム)= 全プロジェクト横断のオーバービュー。
// Projects(個別プロジェクトの管理)とは役割が違う: こちらは「今どこに注意すべきか」を横断で見る。
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listProjects } from "../gen/client/project";
import { listTasks } from "../gen/client/task";
import { listWorkLogs } from "../gen/client/work_log";
import type { Project } from "../gen/types/project";
import type { Task } from "../gen/types/task";
import type { WorkLog } from "../gen/types/work_log";
import { Page, Section, ListStack, ListRow, EmptyState, Badge } from "../lib/widgets";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)", padding: "var(--sp-4)", minWidth: 140 }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: "var(--text-2xl)", fontWeight: 700, lineHeight: 1.1, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  useEffect(() => {
    listProjects().then(setProjects).catch(() => {});
    listTasks().then(setTasks).catch(() => {});
    listWorkLogs().then(setLogs).catch(() => {});
  }, []);

  const projName = (id: string) => projects.find((p) => p.id === id)?.name ?? "";
  const active = projects.filter((p) => p.status === "active");
  const totalMin = logs.reduce((a, l) => a + l.minutes, 0);
  const inProgress = tasks.filter((t) => t.status === "doing");
  const todo = tasks.filter((t) => t.status === "todo");
  const recent = [...logs].sort((a, b) => b.created_at_unix - a.created_at_unix).slice(0, 6);

  return (
    <Page
      title="Dashboard"
      description="全プロジェクト横断のオーバービュー。今どこに注意すべきか・何が動いているか。"
    >
      {/* 横断の要約(KPI) */}
      <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", marginBottom: "var(--sp-2)" }}>
        <Stat label="Active Projects" value={String(active.length)} sub={`全 ${projects.length} 件`} />
        <Stat label="累計工数" value={`${Math.floor(totalMin / 60)}h`} sub={`${totalMin % 60}m · ${logs.length}件`} />
        <Stat label="進行中タスク" value={String(inProgress.length)} sub={`未着手 ${todo.length}`} />
      </div>

      {/* いま動いているタスク(横断) */}
      <Section title="進行中のタスク">
        {inProgress.length === 0 ? (
          <EmptyState message="進行中のタスクはありません" />
        ) : (
          <ListStack>
            {inProgress.map((t) => (
              <ListRow
                key={t.id}
                href={"/tasks/" + t.id}
                leading={<Badge tone="accent">進行中</Badge>}
                primary={t.title}
                secondary={projName(t.project_id) || undefined}
              />
            ))}
          </ListStack>
        )}
      </Section>

      {/* 横断の最近の活動 */}
      <Section title="最近の作業ログ" action={<Link href="/work_logs" style={{ fontSize: "var(--text-sm)" }}>すべて →</Link>}>
        {recent.length === 0 ? (
          <EmptyState message="ログがありません" />
        ) : (
          <ListStack>
            {recent.map((l) => (
              <ListRow
                key={l.id}
                href={"/work_logs/" + l.id}
                primary={l.summary}
                secondary={`${projName(l.project_id)} · ${l.minutes}分 · ${new Date(l.created_at_unix * 1000).toLocaleDateString()}`}
              />
            ))}
          </ListStack>
        )}
      </Section>
    </Page>
  );
}
