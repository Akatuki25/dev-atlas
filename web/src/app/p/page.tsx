// 手書き: hub 入口 — プロジェクトを選んで /p/[id](ハブ)へ。widgets/tokens 準拠。
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listProjects } from "../../gen/client/project";
import type { Project } from "../../gen/types/project";
import { Page, ListStack, ListRow, EmptyState, Badge, ProgressBar } from "../../lib/widgets";

const TONE: Record<string, "accent" | "ok" | "warn"> = { active: "accent", done: "ok", paused: "warn" };

export default function HubIndex() {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    listProjects().then(setProjects).catch(() => {});
  }, []);
  return (
    <Page title="Hub" actions={<Link href="/projects/new" style={{ fontSize: "var(--text-sm)" }}>+ New</Link>}>
      {projects.length === 0 ? (
        <EmptyState message="プロジェクトがありません" action={<Link href="/projects/new">+ New</Link>} />
      ) : (
        <ListStack>
          {projects.map((p) => (
            <ListRow
              key={p.id}
              href={"/p/" + p.id}
              leading={<Badge tone={TONE[p.status] ?? "neutral"}>{p.status}</Badge>}
              primary={p.name}
              secondary={
                <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", minWidth: 200 }}>
                  <ProgressBar value={p.progress} tone={TONE[p.status] ?? "accent"} /> {p.progress}%
                </span>
              }
            />
          ))}
        </ListStack>
      )}
    </Page>
  );
}
