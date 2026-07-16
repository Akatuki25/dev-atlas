// 手書き(アプリ所有): 作業ログ詳細。Wiki の記事と同じ見せ方 = summary を大タイトル、detail を本文に。
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getWorkLog } from "../../../gen/client/work_log";
import { listProjects } from "../../../gen/client/project";
import { WorkLogDeleteButton } from "../../../gen/ui/work_log/WorkLogDeleteButton";
import type { WorkLog } from "../../../gen/types/work_log";
import type { Project } from "../../../gen/types/project";
import { Page, Badge, EmptyState } from "../../../lib/widgets";

export default function WorkLogDetailPage({ params }: { params: { id: string } }) {
  const [log, setLog] = useState<WorkLog | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    getWorkLog(params.id).then(setLog).catch(() => setErr("work log not found"));
    listProjects().then(setProjects).catch(() => {});
  }, [params.id]);

  if (err) return <Page title="Work Logs"><EmptyState message={err} /></Page>;
  if (!log) return <Page title="…"><p style={{ color: "var(--text-faint)" }}>Loading…</p></Page>;

  const project = projects.find((p) => p.id === log.project_id);

  return (
    <Page
      title={log.summary}
      crumb={<Link href="/work_logs" style={{ color: "var(--text-faint)" }}>Work Logs</Link>}
      actions={
        <span style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center" }}>
          <Link href={"/work_logs/" + log.id + "/edit"} style={{ fontSize: "var(--text-sm)" }}>編集</Link>
          <WorkLogDeleteButton id={log.id} />
        </span>
      }
    >
      <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", flexWrap: "wrap", marginBottom: "var(--sp-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        <Badge tone={log.source === "mcp" ? "accent" : "neutral"}>{log.source}</Badge>
        <span><b style={{ color: "var(--text)" }}>{log.minutes}分</b></span>
        <span>{new Date(log.created_at_unix * 1000).toLocaleString()}</span>
        {project && <Link href={"/projects/" + project.id} style={{ color: "var(--accent)" }}>{project.name} ↗</Link>}
      </div>
      {log.detail ? (
        <div style={{ fontSize: "var(--text-md)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{log.detail}</div>
      ) : (
        <div style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>
          詳細がありません。<Link href={"/work_logs/" + log.id + "/edit"}>編集</Link>で追記できます。
        </div>
      )}
    </Page>
  );
}
