# dev-atlas デプロイ + KB 手順

個人利用・複数端末・KBは常に最新。**KB は fs に置かず GitHub API 経由**で read(将来 write も)。
構成: **web = Vercel(Next.js)** / **api + Postgres = Railway**。

## KB の扱い(重要 = この設計の肝)

- KB の真実 = private repo `Akatuki25/knowledge_base`。編集は各端末のローカル(knowledge-base skill)→ push。
- **web も api も、KB を GitHub API(tree/contents)で読む**(`KB_GITHUB_TOKEN` を持たせる)。
  - fs / git clone / pull / volume / CI通知 が一切不要 → Vercel(サーバレス)でも Railway でも同一に動く。
  - 読むたびに GitHub の最新(pull間隔のラグ無し)。`KB_CACHE_SECONDS`(既定300s)でAPI呼びを抑制。
- 複数端末 = 各端末が KB を git で編集/push、閲覧は web(任意の端末のブラウザ)。

### 必要トークン
- **read 用**(今): fine-grained PAT(Repository = knowledge_base のみ / Contents: **Read-only**)。
  web と api の `KB_GITHUB_TOKEN` に設定。
- write(将来 MCP から KB 編集する時)は Contents: Read **and write** の PAT に差し替え。

## 1. Vercel(web)

Next.js は Vercel が本拠。web/ をルートに Vercel プロジェクトを作る。
- Root Directory: `web`
- Environment Variables:
  ```
  KB_GITHUB_TOKEN = <read PAT>
  KB_REPO = Akatuki25/knowledge_base
  NEXT_PUBLIC_API_BASE = https://<api ドメイン>          # Railway の api
  NEXT_PUBLIC_AUTH_ENABLED = 1
  NEXTAUTH_SECRET = <openssl rand -base64 32>
  NEXTAUTH_URL = https://<web ドメイン>.vercel.app
  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
  ALLOWED_EMAILS = you@example.com
  ```
- CLI 例: `cd web && vercel --prod`(初回は `vercel link` / env は `vercel env add`)。

## 2. Railway(api + Postgres)

Railway プロジェクト `dev-atlas` は作成済み(Postgres 稼働)。api は **backend/ の Dockerfile** でビルド。
- **api サービスの Root Directory = `backend`** に設定(★これを設定しないと Railway が repo ルートを
  Railpack で解析して失敗する。今回のビルド失敗の原因)。
- api の Variables:
  ```
  DATABASE_URL = postgresql+psycopg://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
  KB_GITHUB_TOKEN = <read PAT>
  KB_REPO = Akatuki25/knowledge_base
  MCP_TOKEN = <openssl rand -hex 32>
  AUTH_MODE = all
  NEXTAUTH_SECRET = （web と同じ）
  ALLOWED_EMAILS = you@example.com
  WEB_ORIGIN = https://<web ドメイン>.vercel.app
  ```
  (旧 KB_REPO_URL / KB_REFRESH_TOKEN / KB_PATH は不要。設定済みなら削除)
- Postgres は Railway プラグイン。api がマイグレーションを起動時適用。

## 3. Google OAuth(NextAuth)

GCP で OAuth クライアント作成 → 承認済みリダイレクト URI に
`https://<web ドメイン>.vercel.app/api/auth/callback/google` → `GOOGLE_CLIENT_ID/SECRET` を Vercel(web)に。

## 4. 段階
1. まず AUTH off で起動確認してもよい(api: `AUTH_MODE=off` / web: `NEXT_PUBLIC_AUTH_ENABLED=0`)→ /wiki が
   KB を GitHub API で読めるか、CRUD/MCP が動くか確認 → その後 OAuth を入れて auth on。
2. 疎通: web `/wiki` に 110 ノード出る / api `/healthz` 200 / MCP `claude mcp add --transport http dev-atlas https://<api>/mcp`(MCP_TOKEN 必要)。

## メモ
- KB write-back(サーバ→KB)は将来: Contents API PUT で commit。read PAT を write PAT に替え、MCP に `push_kb_node` を足す。
- Railway CLI は非対話(TTY)前提の操作が多く、Root Directory 等はダッシュボードが確実。
