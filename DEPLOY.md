# dev-atlas デプロイ状況 + 残り手順

**全部 Railway・単一プロジェクト**(config の単一ソース性が高い)。KB は **fs に置かず GitHub API 直読み**。

## 稼働中(2026-07-17 デプロイ済み)

Railway プロジェクト `dev-atlas`(あかつき's Projects):
| サービス | URL / 状態 |
|---|---|
| **api**(FastAPI + MCP) | https://api-production-c07a.up.railway.app — healthz 200 / CRUD+DB OK / MCP(トークン保護) |
| **web**(Next.js) | https://web-production-79feb.up.railway.app — 200 |
| **Postgres** | 稼働(マイグレーション適用済み) |

現状は **auth off**・**KB トークン未設定**(wiki は「KB を読めません」表示)。CRUD/Dashboard/MCP は動く。

## KB の扱い(この設計の肝)
- 真実 = private repo `Akatuki25/knowledge_base`(main)。編集はローカル(skill)→ push。
- api も web も **GitHub API(tree/contents)をトークンで読む**(`KB_GITHUB_TOKEN`)。fs/clone/pull/CI 不要。
- 更新の行き渡り: push すれば、読むたび最新(`KB_CACHE_SECONDS` 既定300sキャッシュ)。**単一ソース=GitHub main**。

## 残り2ステップ(あなた)

### ① KB を表示する → read PAT を設定(wiki 復活)
1. GitHub → fine-grained PAT: Repository = **knowledge_base のみ** / Contents: **Read-only**。
2. 両サービスに設定(CLI 例):
   ```
   railway variables --service api --set 'KB_GITHUB_TOKEN=<PAT>'
   railway variables --service web --set 'KB_GITHUB_TOKEN=<PAT>'
   ```
   ※ 単一ソース化するなら Railway の **Shared Variables** に `KB_GITHUB_TOKEN` を置き、両サービスから参照。

### ② ログインを有効化 → Google OAuth + フラグ
1. GCP で OAuth クライアント作成 → 承認済みリダイレクト URI:
   `https://web-production-79feb.up.railway.app/api/auth/callback/google`
2. 変数(生成済みの共有 secret は下記「値」参照):
   ```
   # api
   railway variables --service api --set 'AUTH_MODE=all'
   # web(NEXT_PUBLIC_AUTH_ENABLED はビルドarg → 再デプロイで焼き込み)
   railway variables --service web \
     --set 'NEXT_PUBLIC_AUTH_ENABLED=1' \
     --set 'GOOGLE_CLIENT_ID=<...>' --set 'GOOGLE_CLIENT_SECRET=<...>' \
     --set 'ALLOWED_EMAILS=あなたのGmail'
   railway variables --service api --set 'ALLOWED_EMAILS=あなたのGmail'
   railway up --path-as-root web --service web --ci   # 再ビルド(NEXT_PUBLIC_ 焼き込み)
   ```

## 生成済みの共有 secret(api/web で同一)
```
NEXTAUTH_SECRET = YULwC19t9A2+7IZtVEnAYaIbSjHg+XYxY+sQ6FkrWZM=
MCP_TOKEN(api) = a22c247cf56722818750de29cc22f370817c219755ae736436715e0b10e7aa53
```
MCP 登録: `claude mcp add --transport http dev-atlas https://api-production-c07a.up.railway.app/mcp --header "Authorization: Bearer <MCP_TOKEN>"`

## Railway 運用メモ(CLI 完結でやった)
- モノレポは `railway up --path-as-root backend --service api --ci`(サブをビルド根に)。`./backend` は不可。
- 502(ビルド成功なのに無応答)= `$PORT` 不一致 → アプリは `$PORT` で待受(修正済み)。
- ビルドログは非TTYシェルに出ない → 失敗原因はダッシュボード。状態は `railway status --json`。
- config 単一ソース: 全部 1 Railway プロジェクト。共有値は Shared Variables に寄せると drift しない。
- KB write-back(将来): read PAT を write PAT に替え、MCP に push_kb_node(Contents API PUT)。
