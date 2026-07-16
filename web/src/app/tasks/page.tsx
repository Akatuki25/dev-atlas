// 手書き(アプリ所有の足場を置換): Tasks を状態別ボードで見せる(todo/doing/done の3レーン)。
// カードにプロジェクト名を添える。データの意味(進行状態)に合った形。
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listTasks } from "../../gen/client/task";
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
  useEffect(() => {
    listTasks().then(setTasks).catch(() => {});
    listProjects().then(setProjects).catch(() => {});
  }, []);
  const projName = (id: string) => projects.find((p) => p.id === id)?.name ?? "";

  return (
    <Page
      title="Tasks"
      description="状態別のボード。進行中 → 未着手 → 完了。"
      actions={<Link href="/tasks/new" style={{ fontSize: "var(--text-sm)" }}>+ New</Link>}
    >
      {tasks.length === 0 ? (
        <EmptyState message="タスクがありません" action={<Link href="/tasks/new">+ New</Link>} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--sp-4)", alignItems: "start" }}>
          {LANES.map((lane) => {
            const items = tasks.filter((t) => t.status === lane.key);
            return (
              <section key={lane.key}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
                  <Badge tone={lane.tone}>{lane.label}</Badge>
                  <span style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>{items.length}</span>
                </div>
                <div style={{ display: "grid", gap: "var(--sp-2)" }}>
                  {items.map((t) => (
                    <Link key={t.id} href={"/tasks/" + t.id} style={{ textDecoration: "none", color: "inherit" }}>
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)", padding: "var(--sp-3)", opacity: lane.key === "done" ? 0.65 : 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{t.title}</div>
                        {(projName(t.project_id) || t.note) && (
                          <div style={{ color: "var(--text-faint)", fontSize: "var(--text-xs)", marginTop: 2 }}>
                            {projName(t.project_id)}{t.note ? (projName(t.project_id) ? " · " : "") + t.note : ""}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  {items.length === 0 && <div style={{ color: "var(--text-faint)", fontSize: "var(--text-xs)", padding: "var(--sp-2)" }}>—</div>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Page>
  );
}
