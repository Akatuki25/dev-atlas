# dev-atlas ロードマップ(2026-07-15 確定: KB=git同期ミラー / デザイン基盤=standard-server側 / 着手順=①Task+hub→②デザイン→③認証→④デプロイ)

v0(現状)は「生成CRUD + KB読み取りwiki + MCP」の最小形。ここから
**デザイン基盤 / 認証 / プロジェクトハブ化 / デプロイ** を、standard-server への還流を意識しながら積む。

## 現状の棚卸し(綺麗じゃない点)

| 領域 | 現状 | 問題 |
|---|---|---|
| デザイン | 生成UIは素の inline style。`web/src/lib/widgets.tsx`(componentMap)が唯一の注入点 | tokens も widget 実装も無い。「まともなデザインを作る仕組み」が存在しない |
| 認証 | なし(ローカル前提) | 公開デプロイに耐えない |
| KB | ホストディレクトリを read-only マウント | リモートから見えない/更新経路がない |
| プロジェクト構造 | Project→WorkLog のフラットな2エンティティ | タスク粒度がない。project 詳細がハブになっていない |
| デプロイ | docker compose(ローカル) | 選択肢未調査 → deep-research 実施中 |

## 方針案(4本柱)

### 1. デザイン基盤 — standard-server 側に作る(全アプリに効かせる)

生成UIは既に **componentMap(widgets.tsx)に委譲する設計** = デザインの注入点は設計済み。作るのは:

- **design tokens**(色・type scale・spacing・radius を CSS variables で1ファイル)
- **widget 実装**(Card/ListRow/Badge/Field/Button/EmptyState…)— tokens だけを参照
- **デザインskill**(`.claude/skills/`): 画面を作る/直すときの観点を KB に接地して固定
  ([[ref-ui-information-design]] / [[selection-design-pattern]] / [[contract-to-ui-codegen]]:
  優先度駆動・列挙にしない・progressive disclosure)。bundled の dataviz skill の形式(原則+検証手順+参照ファイル)を踏襲
- dev-atlas が最初の適用先。うまくいったら web スタックの既定 widgets として還流

### 2. 認証 — hackathon-support-agent の実績構成を移植

**NextAuth(v4, Google provider) + FastAPI 側検証ミドルウェア**(hackathon の `WebAuthMiddleware` 相当)。
まず dev-atlas に手書きで入れ、2例目が必要になった時点で standard-server のオプションに昇格([[right-sized-design]])。
MCP を外に出す場合のみ token 認証を追加(hackathon の TokenAuthMiddleware / OAuth 資産を流用)。

### 3. プロジェクトハブ化 — Task エンティティ + hub 画面

- proto に **Task** を追加(project_id / title / status / order …)→ 再生成。
  **スキーマ進化(migration 差分生成)の dogfooding** を兼ねる
- project 詳細ページを手書きでハブ化: 進捗・タスク一覧・工数集計・関連 KB ノード([[kb_node]] リンク)を1画面に
- MCP に `create_task` / `complete_task` を追加 → エージェントがタスク駆動で進捗を刻める

### 4. KB のリモート化 — 「git が真実、サーバはミラー」を推奨

- (a) **git 同期ミラー(推奨)**: KB の真実は今まで通りローカル git。サーバは clone を持ち、
  push→webhook or 定期 pull で更新。read 経路(wiki/MCP検索)は無変更で動く。編集はローカルの既存ワークフロー
  (knowledge-base skill)のまま — 競合しない
- (b) サーバ主(DB/オブジェクトストレージ + アップロードAPI): 編集経路の再発明になり、
  ローカルの Claude Code ワークフローと二重管理になるため非推奨
- MCP `push_kb_node`(アップロード)は (a) の上に「サーバ側 clone に commit して push」で将来実装可能

## フェーズ順(案)

0. PR #7 merge → dev-atlas へ同期(即)
1. **Task + project hub**(ドメインの完成 — スキーマ進化の実証込み)
2. **デザイン基盤**(tokens + widgets + skill。hub 画面を最初の題材に)
3. **認証**(NextAuth + 検証ミドルウェア)
4. **デプロイ**(deep-research の結果で構成決定。KB は git ミラー)
5. MCP リモート化(必要になったら)

デザインを先にやらない理由: hub 画面という「デザインすべき実物」が先にあるほうが、tokens/widgets が机上にならない。
