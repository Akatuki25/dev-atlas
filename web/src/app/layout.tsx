// 手書き: App Router ルートレイアウト(生成物ではない — アプリの外枠)。
// tokens.css をここで読み込む(design tokens は全画面共通)。
import type { ReactNode } from "react";
import Link from "next/link";
import "../lib/tokens.css";

export const metadata = {
  title: "dev-atlas",
  description: "プロジェクト進捗・工数の自動管理 + 開発ナレッジwiki",
};

const navLink = { textDecoration: "none", color: "var(--text-muted)", fontSize: "var(--text-sm)" } as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <nav
          style={{
            display: "flex",
            gap: "var(--sp-4)",
            alignItems: "baseline",
            padding: "var(--sp-3) var(--sp-5)",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <Link href="/" style={{ ...navLink, fontWeight: 700, color: "var(--text)" }}>dev-atlas</Link>
          <Link href="/p" style={navLink}>Hub</Link>
          <Link href="/projects" style={navLink}>Projects</Link>
          <Link href="/work_logs" style={navLink}>Work Logs</Link>
          <Link href="/tasks" style={navLink}>Tasks</Link>
          <Link href="/wiki" style={navLink}>Wiki</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
