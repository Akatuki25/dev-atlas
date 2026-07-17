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
