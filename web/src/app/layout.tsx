// 手書き: App Router ルートレイアウト(生成物ではない — アプリの外枠)。
// tokens.css(design値)を読み込み、AppShell(サイドバー+全幅メイン)で全ページを包む。
import type { ReactNode } from "react";
import "../lib/tokens.css";
import { AppShell } from "../components/AppShell";

export const metadata = {
  title: "dev-atlas",
  description: "プロジェクト進捗・工数の自動管理 + 開発ナレッジwiki",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
