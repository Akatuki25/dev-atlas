// 手書き: ホーム(生成物ではない)。最優先の導線は Hub — それ以外は従属(frontend-design skill 準拠)。
import Link from "next/link";
import { Page, ListStack, ListRow } from "../lib/widgets";

export default function Home() {
  return (
    <Page title="dev-atlas">
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        進行プロジェクトの進捗・工数の自動管理と、開発ナレッジ(KB)のwiki閲覧。
      </p>
      <ListStack>
        <ListRow href="/p" primary="Hub" secondary="プロジェクトの現在地 — 進捗・タスク・工数・KBを1画面で(まずここ)" />
        <ListRow href="/wiki" primary="Wiki" secondary="開発ナレッジベース(knowledge_base)のブラウズ" />
        <ListRow href="/work_logs" primary="Work Logs" secondary="作業ログ(工数)。MCP経由でエージェントが自動記録" />
      </ListStack>
      <p style={{ color: "var(--text-faint)", fontSize: "var(--text-xs)", marginTop: "var(--sp-5)" }}>
        MCP: <code>claude mcp add --transport http dev-atlas http://localhost:8000/mcp</code>
      </p>
    </Page>
  );
}
