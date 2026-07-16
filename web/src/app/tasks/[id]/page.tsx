// 手書き(アプリ所有): タスク詳細。Wiki の記事と同じ見せ方 = 大タイトル + メタ + 説明を主役に。
// note は「説明(description)」として本文のように大きく見せる。
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTask } from "../../../gen/client/task";
import { listProjects } from "../../../gen/client/project";
import { TaskDeleteButton } from "../../../gen/ui/task/TaskDeleteButton";
import type { Task } from "../../../gen/types/task";
import type { Project } from "../../../gen/types/project";
import { Page, Badge, EmptyState, type Tone } from "../../../lib/widgets";

const TONE: Record<string, Tone> = { doing: "accent", todo: "neutral", done: "ok" };
const LABEL: Record<string, string> = { doing: "進行中", todo: "未着手", done: "完了" };

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const [task, setTask] = useState<Task | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    getTask(params.id).then(setTask).catch(() => setErr("task not found"));
    listProjects().then(setProjects).catch(() => {});
  }, [params.id]);

  if (err) return <Page title="Tasks"><EmptyState message={err} /></Page>;
  if (!task) return <Page title="…"><p style={{ color: "var(--text-faint)" }}>Loading…</p></Page>;

  const project = projects.find((p) => p.id === task.project_id);

  return (
    <Page
      title={task.title}
      crumb={<Link href="/tasks" style={{ color: "var(--text-faint)" }}>Tasks</Link>}
      actions={
        <span style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center" }}>
          <Link href={"/tasks/" + task.id + "/edit"} style={{ fontSize: "var(--text-sm)" }}>編集</Link>
          <TaskDeleteButton id={task.id} />
        </span>
      }
    >
      <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", marginBottom: "var(--sp-4)" }}>
        <Badge tone={TONE[task.status] ?? "neutral"}>{LABEL[task.status] ?? task.status}</Badge>
        {project && <Link href={"/projects/" + project.id} style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}>{project.name} ↗</Link>}
      </div>
      {task.note ? (
        <div style={{ fontSize: "var(--text-md)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{task.note}</div>
      ) : (
        <div style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>
          説明がありません。<Link href={"/tasks/" + task.id + "/edit"}>編集</Link>で追記できます。
        </div>
      )}
    </Page>
  );
}
