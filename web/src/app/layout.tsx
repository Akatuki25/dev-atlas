// 手書き: App Router ルートレイアウト(生成物ではない — アプリの外枠)。
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "dev-atlas",
  description: "プロジェクト進捗・工数の自動管理 + 開発ナレッジwiki",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: "system-ui" }}>
        <nav
          style={{
            display: "flex",
            gap: 16,
            padding: "10px 24px",
            borderBottom: "1px solid #ddd",
            fontSize: 14,
          }}
        >
          <Link href="/" style={{ fontWeight: 700, textDecoration: "none", color: "inherit" }}>
            dev-atlas
          </Link>
          <Link href="/p" style={{ textDecoration: "none", color: "inherit" }}>
            Hub
          </Link>
          <Link href="/projects" style={{ textDecoration: "none", color: "inherit" }}>
            Projects
          </Link>
          <Link href="/work_logs" style={{ textDecoration: "none", color: "inherit" }}>
            Work Logs
          </Link>
          <Link href="/wiki" style={{ textDecoration: "none", color: "inherit" }}>
            Wiki
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
