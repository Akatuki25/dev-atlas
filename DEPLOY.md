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

## マルチユーザー(テナント分離)
- Project/Task/WorkLog は proto の `@owned` で **owner_email 列**を持ち、ログインユーザーごとに分離。
  principal は pure-ASGI `TenancyMiddleware` が JWT から解決し `owner_scope` で全リクエストに張る。
- **KB は各ユーザーが自分の PAT/repo を `/settings` で登録**(per-user)。PAT は `SECRET_ENC_KEY`(Fernet)で
  暗号化して DB 保存し、`/api/kb/*` が復号して**そのユーザーの**KB を GitHub API で読む。web は backend 経由(PATはフロントに出ない)。
- **MCP もユーザー単位**: `/settings` で発行される mcp_token で本人識別 → 本人の Project/Task/KB のみ操作。
- 秘密の単一ソース: `SECRET_ENC_KEY`(暗号鍵)/`NEXTAUTH_SECRET`(セッション鍵)は Railway に設定。
  `KB_GITHUB_TOKEN` env は**使わない**(完全 per-user。設定すると未構成ユーザーの共有フォールバックになる)。

## KB の中身(真実の所在)
- 真実 = 各ユーザーの private repo(例 `Akatuki25/knowledge_base` main)。編集はローカル(skill)→ push。
- 読むたび最新(backend の per-user TTL キャッシュ)。web は `no-store`(ユーザー跨ぎのキャッシュ漏洩を防ぐ)。

## 認証の作り(公開防止の肝)
KB を wiki 描画するのは web の **server component**。守りは2箇所でサーバ検証(クライアント隠しではない):
- **web エッジ** `middleware.ts`: `getToken()` で NextAuth 署名Cookieを検証し全ページを `matcher` でゲート → 未ログインは `/wiki` がレンダリング前に弾かれる。
- **web ログイン** `authOptions.signIn`: `ALLOWED_EMAILS` 許可リスト(アカウント分離)。session に HS256 短命JWTを載せる。
- **backend** `web_auth.verify_session_jwt`: 同じ `NEXTAUTH_SECRET` で署名検証+許可リスト再チェック(web を信用しない二重化)。

**順序が重要**: いま KB は `KB_GITHUB_TOKEN` 未設定で読めない=非公開。**認証をONにしてから KB トークンを入れる**(公開ウィンドウを作らない)。

## 残り2ステップ(スクリプト化済み)

### ① 認証を有効化 → `scripts/setup-auth.sh`
自動化できないのは **OAuth Web クライアント作成だけ**(gcloud/APIに作成手段が無くブラウザ必須)。
1. https://console.cloud.google.com/apis/credentials で「OAuth クライアント ID・種類=ウェブアプリケーション」を作成:
   - 承認済みリダイレクト URI: `https://web-production-79feb.up.railway.app/api/auth/callback/google`
   - 承認済み JavaScript 生成元: `https://web-production-79feb.up.railway.app`
2. 残り(secret生成・全変数投入・api/web再デプロイ・検証)は1コマンド:
   ```
   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy ALLOWED_EMAILS=あなた@gmail.com \
     ./scripts/setup-auth.sh
   ```
   → `NEXTAUTH_SECRET/NEXTAUTH_URL/GOOGLE_*/ALLOWED_EMAILS/AUTH_MODE=all/NEXT_PUBLIC_AUTH_ENABLED=1` を投入し再ビルド。

### ② KB を表示 → `scripts/setup-kb.sh`(①の後に実行)
fine-grained PAT(Repository=knowledge_base のみ / Contents: Read-only)を作り:
```
KB_GITHUB_TOKEN=github_pat_xxx ./scripts/setup-kb.sh
```
→ AUTH_MODE=all を確認してから(未認証なら中断)KB 変数を両サービスへ投入し再デプロイ。
※ 単一ソース化するなら Railway の **Shared Variables** に置き両サービスから参照。

## 秘密の扱い(★repo に値を書かない)
**secret の実値は Railway の環境変数だけに置き、このファイル(git)には絶対に書かない。**
`NEXTAUTH_SECRET` が漏れると、許可リストのメールで有効なセッションJWTを偽造でき Google 認証を
迂回できる(=全データにアクセス可能)。過去に本ファイルへ実値を書いてしまい、ローテーション
(値の再生成→Railway再設定→再デプロイ)で無効化した。git 履歴には旧値が残るが、ローテ後は無効。

- `NEXTAUTH_SECRET`(セッション署名) / `SECRET_ENC_KEY`(PAT暗号) は Railway shared/service var のみ。
- MCP は**ユーザーごとの mcp_token**(`/settings` で発行)で認証。共有 `MCP_TOKEN` env は使わない(空=legacy無効)。
- 鍵生成: `python -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"`

MCP 登録コマンドは web の `/settings` に**本人専用トークン付きで表示**される(それをコピーして実行)。

## Railway 運用メモ(CLI 完結でやった)
- モノレポは `railway up --path-as-root backend --service api --ci`(サブをビルド根に)。`./backend` は不可。
- 502(ビルド成功なのに無応答)= `$PORT` 不一致 → アプリは `$PORT` で待受(修正済み)。
- ビルドログは非TTYシェルに出ない → 失敗原因はダッシュボード。状態は `railway status --json`。
- config 単一ソース: 全部 1 Railway プロジェクト。共有値は Shared Variables に寄せると drift しない。
- KB write-back(将来): read PAT を write PAT に替え、MCP に push_kb_node(Contents API PUT)。
