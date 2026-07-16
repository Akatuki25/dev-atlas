// 手書き: ホーム。ナビはサイドバーに移したので、ここは概要と主要導線の landing。
import Link from "next/link";
import { Page, ListStack, ListRow } from "../lib/widgets";

export default function Home() {
  return (
    <Page
      title="dev-atlas"
      description="進行プロジェクトの進捗・工数を(MCP経由でエージェントが)自動管理し、開発ナレッジを wiki で見る。"
    >
      <ListStack>
        <ListRow href="/p" primary="Hub" secondary="プロジェクトの現在地 — 進捗・タスク・工数・KBを1画面で(まずここ)" />
        <ListRow href="/wiki" primary="Knowledge Base" secondary="開発ナレッジを「抽象 → 具体」の思考段階で構造化した wiki" />
        <ListRow href="/work_logs" primary="Work Logs" secondary="作業ログ(工数)。MCP の log_work でエージェントが自動記録" />
      </ListStack>
      <p style={{ color: "var(--text-faint)", fontSize: "var(--text-xs)", marginTop: "var(--sp-5)" }}>
        MCP: <code>claude mcp add --transport http dev-atlas http://localhost:8000/mcp</code>
      </p>
    </Page>
  );
}
