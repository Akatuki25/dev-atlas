// 手書き: project hub — 進捗・タスク・工数・KBノードを1画面に集約する業務固有画面。
// 生成された client(project/task/work_log)を使う。集計はクライアント側(個人用途の規模)。
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getProject } from "../../../gen/client/project";
import { listTasks } from "../../../gen/client/task";
import { listWorkLogs } from "../../../gen/client/work_log";
import type { Project } from "../../../gen/types/project";
import type { Task } from "../../../gen/types/task";
import type { WorkLog } from "../../../gen/types/work_log";

const STATUS_ORDER = ["doing", "todo", "done"] as const;
const STATUS_LABEL: Record<string, string> = { doing: "進行中", todo: "未着手", done: "完了" };

export default function ProjectHub({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getProject(params.id).then(setProject).catch(() => setErr("project not found"));
    listTasks().then((r) => setTasks(r.filter((t) => t.project_id === params.id))).catch(() => {});
    listWorkLogs().then((r) => setLogs(r.filter((l) => l.project_id === params.id))).catch(() => {});
  }, [params.id]);

  if (err) return <main style={{ margin: "2rem auto", maxWidth: 720 }}>{err}</main>;
  if (!project) return <main style={{ margin: "2rem auto", maxWidth: 720, color: "#888" }}>loading…</main>;

  const totalMinutes = logs.reduce((a, l) => a + l.minutes, 0);
  const recent = [...logs].sort((a, b) => b.created_at_unix - a.created_at_unix).slice(0, 5);
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 16px", fontFamily: "system-ui", lineHeight: 1.6 }}>
      {/* ヘッダ: 本質(名前と現在地)を先に */}
      <div style={{ fontSize: 12, color: "#888" }}><Link href="/p" style={{ color: "#888" }}>Hub</Link> / {project.name}</div>
      <h1 style={{ marginBottom: 4 }}>{project.name}</h1>
      <div style={{ color: "#666", marginBottom: 8 }}>{project.goal}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <div style={{ flex: 1, height: 10, background: "#eee", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ width: project.progress + "%", height: "100%", background: project.status === "done" ? "#4a4" : "#47c" }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{project.progress}%</span>
        <span style={{ fontSize: 12, background: "#f0f0f0", borderRadius: 10, padding: "2px 8px" }}>{project.status}</span>
      </div>
      <div style={{ fontSize: 13, color: "#666", display: "flex", gap: 16, marginBottom: 20 }}>
        <span>累計工数 <b>{Math.floor(totalMinutes / 60)}h{totalMinutes % 60}m</b>({logs.length}件)</span>
        <span>タスク <b>{doneCount}/{tasks.length}</b> 完了</span>
        {project.kb_node && <Link href={"/wiki/n/" + encodeURIComponent(project.kb_node)}>KBノード ↗</Link>}
        {project.repo_url && <a href={project.repo_url} target="_blank" rel="noreferrer">repo ↗</a>}
        <Link href={"/projects/" + project.id + "/edit"}>編集</Link>
      </div>

      {/* タスク: 進行中→未着手→完了 の優先度順 */}
      <h2 style={{ fontSize: 18 }}>タスク <Link href="/tasks/new" style={{ fontSize: 13, fontWeight: 400 }}>+ New</Link></h2>
      {STATUS_ORDER.map((st) => {
        const group = tasks.filter((t) => t.status === st);
        if (group.length === 0) return null;
        return (
          <div key={st} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{STATUS_LABEL[st]}({group.length})</div>
            {group.map((t) => (
              <Link key={t.id} href={"/tasks/" + t.id} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ border: "1px solid #eee", borderRadius: 6, padding: "6px 10px", marginBottom: 4,
                              opacity: st === "done" ? 0.55 : 1 }}>
                  {st === "done" ? "✓ " : ""}{t.title}
                  {t.note && <span style={{ color: "#999", fontSize: 12 }}> — {t.note}</span>}
                </div>
              </Link>
            ))}
          </div>
        );
      })}
      {tasks.length === 0 && <div style={{ color: "#888", fontSize: 14 }}>タスクなし</div>}

      {/* 直近の作業ログ */}
      <h2 style={{ fontSize: 18, marginTop: 24 }}>直近の作業ログ <Link href="/work_logs/new" style={{ fontSize: 13, fontWeight: 400 }}>+ New</Link></h2>
      {recent.map((l) => (
        <div key={l.id} style={{ borderBottom: "1px solid #f0f0f0", padding: "6px 0", fontSize: 14 }}>
          <span>{l.summary}</span>
          <span style={{ color: "#999", fontSize: 12 }}> · {l.minutes}分 · {l.source} · {new Date(l.created_at_unix * 1000).toLocaleDateString()}</span>
        </div>
      ))}
      {recent.length === 0 && <div style={{ color: "#888", fontSize: 14 }}>ログなし</div>}
    </main>
  );
}
