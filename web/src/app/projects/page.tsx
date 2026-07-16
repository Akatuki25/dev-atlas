// 手書き(アプリ所有の足場を置換): Projects 一覧。生成CRUDでなく情報設計した主要画面。
// 進捗バーを主役にしたカードで見せ、クリックで Hub(/p/[id])へ。
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listProjects } from "../../gen/client/project";
import { listTasks } from "../../gen/client/task";
import { listWorkLogs } from "../../gen/client/work_log";
import type { Project } from "../../gen/types/project";
import type { Task } from "../../gen/types/task";
import type { WorkLog } from "../../gen/types/work_log";
import { Page, ListStack, EmptyState, Badge, ProgressBar, type Tone } from "../../lib/widgets";

const TONE: Record<string, Tone> = { active: "accent", done: "ok", paused: "warn" };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  useEffect(() => {
    listProjects().then(setProjects).catch(() => {});
    listTasks().then(setTasks).catch(() => {});
    listWorkLogs().then(setLogs).catch(() => {});
  }, []);

  return (
    <Page
      title="Projects"
      description="進行中プロジェクトと進捗。カードから Hub(進捗・タスク・工数・KB)へ。"
      actions={<Link href="/projects/new" style={{ fontSize: "var(--text-sm)" }}>+ New</Link>}
    >
      {projects.length === 0 ? (
        <EmptyState message="プロジェクトがありません" action={<Link href="/projects/new">+ New</Link>} />
      ) : (
        <ListStack>
          {projects.map((p) => {
            const pt = tasks.filter((t) => t.project_id === p.id);
            const done = pt.filter((t) => t.status === "done").length;
            const minutes = logs.filter((l) => l.project_id === p.id).reduce((a, l) => a + l.minutes, 0);
            const tone = TONE[p.status] ?? "neutral";
            return (
              <Link key={p.id} href={"/projects/" + p.id} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)", padding: "var(--sp-4)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
                    <span style={{ fontWeight: 700, fontSize: "var(--text-md)" }}>{p.name}</span>
                    <Badge tone={tone}>{p.status}</Badge>
                    {p.goal && <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.goal}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
                    <ProgressBar value={p.progress} tone={tone === "warn" ? "warn" : tone === "ok" ? "ok" : "accent"} />
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, minWidth: 40, textAlign: "right" }}>{p.progress}%</span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", whiteSpace: "nowrap" }}>
                      タスク {done}/{pt.length} · {Math.floor(minutes / 60)}h{minutes % 60}m
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </ListStack>
      )}
    </Page>
  );
}
