// 手書き(アプリ所有): プロジェクト詳細 = 個別プロジェクトのワークスペース。
// 進捗・タスク・工数・KB を1画面に集約。Dashboard(横断)とは役割が違う: こちらは「1プロジェクトの中」。
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getProject } from "../../../gen/client/project";
import { listTasks } from "../../../gen/client/task";
import { listWorkLogs } from "../../../gen/client/work_log";
import type { Project } from "../../../gen/types/project";
import type { Task } from "../../../gen/types/task";
import type { WorkLog } from "../../../gen/types/work_log";
import { Page, Section, ListStack, ListRow, EmptyState, Badge, ProgressBar, type Tone } from "../../../lib/widgets";

const STATUS_ORDER = ["doing", "todo", "done"] as const;
const STATUS_LABEL: Record<string, string> = { doing: "進行中", todo: "未着手", done: "完了" };
const PROJECT_TONE: Record<string, Tone> = { active: "accent", done: "ok", paused: "warn" };

export default function ProjectWorkspace({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getProject(params.id).then(setProject).catch(() => setErr("project not found"));
    listTasks().then((r) => setTasks(r.filter((t) => t.project_id === params.id))).catch(() => {});
    listWorkLogs().then((r) => setLogs(r.filter((l) => l.project_id === params.id))).catch(() => {});
  }, [params.id]);

  if (err) return <Page title="Projects"><EmptyState message={err} /></Page>;
  if (!project) return <Page title="…"><p style={{ color: "var(--text-faint)" }}>Loading…</p></Page>;

  const totalMinutes = logs.reduce((a, l) => a + l.minutes, 0);
  const recent = [...logs].sort((a, b) => b.created_at_unix - a.created_at_unix).slice(0, 5);
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const tone = PROJECT_TONE[project.status] ?? "neutral";

  return (
    <Page
      title={project.name}
      description={project.goal || undefined}
      crumb={<Link href="/projects" style={{ color: "var(--text-faint)" }}>Projects</Link>}
      actions={<Link href={"/projects/" + project.id + "/edit"} style={{ fontSize: "var(--text-sm)" }}>編集</Link>}
    >
      {/* 現在地: 進捗を最大の視覚的重みに */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
        <ProgressBar value={project.progress} tone={tone === "warn" ? "warn" : tone === "ok" ? "ok" : "accent"} />
        <span style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>{project.progress}%</span>
        <Badge tone={tone}>{project.status}</Badge>
      </div>
      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "flex", gap: "var(--sp-4)", marginTop: "var(--sp-2)" }}>
        <span>累計工数 <b style={{ color: "var(--text)" }}>{Math.floor(totalMinutes / 60)}h{totalMinutes % 60}m</b>({logs.length}件)</span>
        <span>タスク <b style={{ color: "var(--text)" }}>{doneCount}/{tasks.length}</b> 完了</span>
        {project.kb_node && <Link href={"/wiki/n/" + encodeURIComponent(project.kb_node)}>KBノード ↗</Link>}
        {project.repo_url && <a href={project.repo_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>repo ↗</a>}
      </div>

      <Section title="タスク" action={<Link href="/tasks/new" style={{ fontSize: "var(--text-sm)" }}>+ New</Link>}>
        {tasks.length === 0 ? (
          <EmptyState message="タスクなし" action={<Link href="/tasks/new">+ New</Link>} />
        ) : (
          <ListStack>
            {STATUS_ORDER.flatMap((st) =>
              tasks.filter((t) => t.status === st).map((t) => (
                <ListRow
                  key={t.id}
                  href={"/tasks/" + t.id}
                  dimmed={st === "done"}
                  leading={<Badge tone={st === "done" ? "ok" : st === "doing" ? "accent" : "neutral"}>{STATUS_LABEL[st]}</Badge>}
                  primary={t.title}
                  secondary={t.note || undefined}
                />
              ))
            )}
          </ListStack>
        )}
      </Section>

      <Section title="直近の作業ログ" action={<Link href="/work_logs/new" style={{ fontSize: "var(--text-sm)" }}>+ New</Link>}>
        {recent.length === 0 ? (
          <EmptyState message="ログなし(MCP の log_work で自動記録できます)" />
        ) : (
          <ListStack>
            {recent.map((l) => (
              <ListRow
                key={l.id}
                href={"/work_logs/" + l.id}
                primary={l.summary}
                secondary={`${l.minutes}分 · ${l.source} · ${new Date(l.created_at_unix * 1000).toLocaleDateString()}`}
              />
            ))}
          </ListStack>
        )}
      </Section>
    </Page>
  );
}
