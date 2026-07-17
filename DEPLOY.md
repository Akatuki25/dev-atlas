# dev-atlas デプロイ + KB 同期 手順

個人利用・複数端末・KB を比較的同期。デプロイ先は **Railway**([[ref-personal-app-deploy-2026]] の結論)。
KB は **git ミラー方式**: 真実 = private repo `Akatuki25/knowledge_base`、サーバは受け身で clone/pull。

## 全体像

```
[端末] --push--> Akatuki25/knowledge_base(private)
                    │  GitHub Actions(.github/workflows/notify-refresh.yml)
                    │  push時 + 15分cron で ↓ を叩く
   api /internal/kb-refresh ─┐
   web /api/kb-refresh ──────┴─> git pull(各サービスの clone)→ wiki/MCP が最新
サーバ起動時: scripts/kb-sync.sh が KB_REPO_URL から clone(未設定なら no-op)
```

## 1. KB を private repo に(済)

`~/knowledge_base` は git 化し `Akatuki25/knowledge_base`(private)に push 済み。
各端末は clone して使う(編集は knowledge-base skill → commit → push)。

## 2. サーバが KB を読むためのトークン(read-only)

サーバは KB を **read-only** で clone するだけ。read-only の資格情報を用意:
- 推奨: **fine-grained PAT**(Repository access = knowledge_base のみ / Contents: Read-only)。
- `KB_REPO_URL` に埋める: `https://oauth2:<PAT>@github.com/Akatuki25/knowledge_base.git`

## 3. Railway: 3 サービス(db / api / web)

- **db**: Railway の PostgreSQL プラグイン。`DATABASE_URL` を api に渡す(`postgresql+psycopg://...`)。
- **api**(`backend/` の Dockerfile): 起動で kb-sync → migration → uvicorn。
  env:
  ```
  DATABASE_URL=postgresql+psycopg://<railway pg>
  KB_PATH=/kb
  KB_REPO_URL=https://oauth2:<PAT>@github.com/Akatuki25/knowledge_base.git
  KB_REFRESH_TOKEN=<openssl rand -hex 32>
  MCP_TOKEN=<openssl rand -hex 32>
  AUTH_MODE=all
  NEXTAUTH_SECRET=<openssl rand -base64 32>
  ALLOWED_EMAILS=you@example.com
  WEB_ORIGIN=https://<web ドメイン>
  ```
- **web**(`web/` の Dockerfile): 起動で kb-sync → next。
  build args: `NEXT_PUBLIC_API_BASE=https://<api ドメイン>` / `NEXT_PUBLIC_AUTH_ENABLED=1`
  env:
  ```
  KB_PATH=/kb
  KB_REPO_URL=（api と同じ read-only PAT URL）
  KB_REFRESH_TOKEN=（api と同じ）
  NEXT_PUBLIC_AUTH_ENABLED=1
  NEXTAUTH_SECRET=（api と同じ）
  NEXTAUTH_URL=https://<web ドメイン>
  GOOGLE_CLIENT_ID=... / GOOGLE_CLIENT_SECRET=...
  ALLOWED_EMAILS=（api と同じ）
  ```
- **KB は volume 不要**(clone し直せる)。再デプロイのたびに fresh clone される。

## 4. Google OAuth(NextAuth)

GCP でOAuthクライアントを作成し、承認済みリダイレクトURIに
`https://<web ドメイン>/api/auth/callback/google` を登録 → `GOOGLE_CLIENT_ID/SECRET` を web に。

## 5. KB repo の GitHub Actions secrets

`Akatuki25/knowledge_base` → Settings → Secrets and variables → Actions:
```
DEV_ATLAS_API_URL = https://<api ドメイン>   (末尾スラッシュなし)
DEV_ATLAS_WEB_URL = https://<web ドメイン>
KB_REFRESH_TOKEN  = （サーバの KB_REFRESH_TOKEN と同じ）
```
以降、KB を push すると Actions が両サービスの kb-refresh を叩き、数秒〜で反映。15分 cron がフォールバック。

## 動作確認
- `curl -X POST https://<api>/internal/kb-refresh -H "X-Refresh-Token: <token>"` → `{"status":"ok",...}`
- KB を1つ編集して push → Actions 実行 → web の /wiki に反映されるか。

## メモ
- 書き戻し(サーバ→KB)は現状なし(read-only)。将来 MCP `push_kb_node` を足すなら write 権限 PAT + commit/push を api 側に。
- タイムアウト等の一次確認(Railway の compose 非対応・プロキシのアイドル切断)はデプロイ着手時に。
