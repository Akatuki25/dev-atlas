# INDEX — サンプル knowledge base

これは dev-atlas に同梱されたサンプルKBです。`KB_HOST_PATH` 環境変数で自分の
knowledge base ディレクトリを指定すると、そちらが `/kb` にマウントされます。

## ノード一覧

- [[sample-pitfall]] — ハマりの記録例(wikilink 解決のデモ)
- [[sample-decision]] — 設計判断の記録例

## 歩き方

各ノードは frontmatter(type/status/confidence)を持ち、二重角括弧の wikilink で相互リンクします。
dev-atlas の wiki ビューアはファイル名・frontmatter `id`・`aliases` からリンクを解決します。
