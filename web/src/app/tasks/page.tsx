// 手書き(アプリ所有): Tasks 状態別ボード + ドラッグ&ドロップで状態更新。
// カードをレーン間にドラッグ → updateTask で status を変更(楽観的更新 → API)。ライブラリ非依存の native DnD。
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { listTasks, updateTask } from "../../gen/client/task";
import { listProjects } from "../../gen/client/project";
import type { Task } from "../../gen/types/task";
import type { Project } from "../../gen/types/project";
import { Page, EmptyState, Badge, type Tone } from "../../lib/widgets";

const LANES: { key: string; label: string; tone: Tone }[] = [
  { key: "doing", label: "進行中", tone: "accent" },
  { key: "todo", label: "未着手", tone: "neutral" },
  { key: "done", label: "完了", tone: "ok" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overLane, setOverLane] = useState<string | null>(null);
  const dragId_ref = useRef<string | null>(null);

  useEffect(() => {
    listTasks().then(setTasks).catch(() => {});
    listProjects().then(setProjects).catch(() => {});
  }, []);
  const projName = (id: string) => projects.find((p) => p.id === id)?.name ?? "";

  function onDrop(laneKey: string) {
    const id = dragId_ref.current;
    setOverLane(null);
    setDragId(null);
    dragId_ref.current = null;
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === laneKey) return;
    const prev = task.status;
    // 楽観的更新
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: laneKey } : t)));
    updateTask(id, {
      project_id: task.project_id, title: task.title, status: laneKey, note: task.note,
    }).catch(() => {
      // 失敗したら戻す
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: prev } : t)));
    });
  }

  return (
    <Page
      title="Tasks"
      description="状態別のボード。カードをドラッグして状態(進行中/未着手/完了)を変更できる。"
      actions={<Link href="/tasks/new" style={{ fontSize: "var(--text-sm)" }}>+ New</Link>}
    >
      {tasks.length === 0 ? (
        <EmptyState message="タスクがありません" action={<Link href="/tasks/new">+ New</Link>} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--sp-4)", alignItems: "start" }}>
          {LANES.map((lane) => {
            const items = tasks.filter((t) => t.status === lane.key);
            const isOver = overLane === lane.key;
            return (
              <section
                key={lane.key}
                onDragOver={(e) => { e.preventDefault(); setOverLane(lane.key); }}
                onDragLeave={() => setOverLane((l) => (l === lane.key ? null : l))}
                onDrop={() => onDrop(lane.key)}
                style={{
                  borderRadius: "var(--radius-md)", padding: "var(--sp-2)",
                  background: isOver ? "var(--accent-soft)" : "transparent",
                  outline: isOver ? "2px dashed var(--accent)" : "2px dashed transparent",
                  transition: "background .1s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)", padding: "0 var(--sp-1)" }}>
                  <Badge tone={lane.tone}>{lane.label}</Badge>
                  <span style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>{items.length}</span>
                </div>
                <div style={{ display: "grid", gap: "var(--sp-2)", minHeight: 40 }}>
                  {items.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => { setDragId(t.id); dragId_ref.current = t.id; }}
                      onDragEnd={() => { setDragId(null); dragId_ref.current = null; setOverLane(null); }}
                      style={{
                        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                        boxShadow: "var(--shadow-sm)", padding: "var(--sp-3)", cursor: "grab",
                        opacity: dragId === t.id ? 0.4 : lane.key === "done" ? 0.7 : 1,
                      }}
                    >
                      <Link href={"/tasks/" + t.id} draggable={false} style={{ textDecoration: "none", color: "inherit" }}>
                        <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{t.title}</div>
                        {(projName(t.project_id) || t.note) && (
                          <div style={{ color: "var(--text-faint)", fontSize: "var(--text-xs)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {projName(t.project_id)}{t.note ? (projName(t.project_id) ? " · " : "") + t.note : ""}
                          </div>
                        )}
                      </Link>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div style={{ color: "var(--text-faint)", fontSize: "var(--text-xs)", padding: "var(--sp-3)", textAlign: "center" }}>
                      ここにドロップ
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Page>
  );
}
