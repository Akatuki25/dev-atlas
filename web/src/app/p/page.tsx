// 手書き: hub 入口 — プロジェクトを選んで /p/[id](ハブ)へ。
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listProjects } from "../../gen/client/project";
import type { Project } from "../../gen/types/project";

export default function HubIndex() {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    listProjects().then(setProjects).catch(() => {});
  }, []);
  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1>Hub</h1>
      <p style={{ color: "#666", fontSize: 14 }}>プロジェクトの進捗・タスク・工数・KBを1画面で。</p>
      <div style={{ display: "grid", gap: 8 }}>
        {projects.map((p) => (
          <Link key={p.id} href={"/p/" + p.id} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{p.name}</div>
              <div style={{ color: "#666", fontSize: 13 }}>{p.status} · {p.progress}%</div>
            </div>
          </Link>
        ))}
        {projects.length === 0 && <div style={{ color: "#888" }}>プロジェクトがありません(/projects/new で作成)</div>}
      </div>
    </main>
  );
}
