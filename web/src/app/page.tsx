// 手書き: ホーム(生成物ではない)。生成された各 entity 画面と KB wiki への入口。
import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>dev-atlas</h1>
      <p>進行プロジェクトの進捗・工数の自動管理と、開発ナレッジ(KB)のwiki閲覧。</p>
      <ul style={{ lineHeight: 2.2 }}>
        <li>
          <Link href="/projects">Projects</Link> — 進行プロジェクトと進捗率
        </li>
        <li>
          <Link href="/work_logs">Work Logs</Link> — 作業ログ(工数)。MCP経由でエージェントが自動記録
        </li>
        <li>
          <Link href="/wiki">Wiki</Link> — 開発ナレッジベース(knowledge_base)のブラウズ
        </li>
      </ul>
    </main>
  );
}
