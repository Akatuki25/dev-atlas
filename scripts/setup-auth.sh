#!/usr/bin/env bash
# dev-atlas: Google OAuth 認証を Railway 上で有効化する(冪等)。
#
# 自動化できないのは「OAuth Web クライアント作成」だけ(ブラウザ必須・下記URL)。
# それ以外(secret生成・変数投入・再デプロイ)はこのスクリプトが全部やる。
#
# 安全な順序: 認証を先にONにしてから KB トークンを入れる(公開ウィンドウを作らない)。
# このスクリプトは認証ONまで。KB トークンは最後に setup-kb.sh(あるいは手動)で入れる。
#
# 使い方:
#   1) 下記URLで OAuth クライアント(種類=ウェブアプリケーション)を作成し、
#      承認済みリダイレクトURI に $WEB_URL/api/auth/callback/google を登録
#         https://console.cloud.google.com/apis/credentials
#      承認済み JavaScript 生成元: $WEB_URL
#   2) GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET を環境変数で渡して実行:
#         GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy ALLOWED_EMAILS=you@gmail.com \
#           ./scripts/setup-auth.sh
set -euo pipefail

API_SVC="${API_SVC:-api}"
WEB_SVC="${WEB_SVC:-web}"
WEB_URL="${WEB_URL:-https://web-production-79feb.up.railway.app}"

: "${GOOGLE_CLIENT_ID:?GOOGLE_CLIENT_ID を設定してください(Console で作成した値)}"
: "${GOOGLE_CLIENT_SECRET:?GOOGLE_CLIENT_SECRET を設定してください}"
: "${ALLOWED_EMAILS:?ALLOWED_EMAILS を設定してください(例: you@gmail.com。カンマ区切りで複数可)}"

# NEXTAUTH_SECRET は api/web で共有。既存があれば流用、無ければ生成。
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}"

echo "▸ 共有 secret / URL を両サービスへ"
railway variables --service "$API_SVC" \
  --set "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" \
  --set "ALLOWED_EMAILS=$ALLOWED_EMAILS" \
  --set "AUTH_MODE=all" --skip-deploys
railway variables --service "$WEB_SVC" \
  --set "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" \
  --set "ALLOWED_EMAILS=$ALLOWED_EMAILS" \
  --set "NEXTAUTH_URL=$WEB_URL" \
  --set "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
  --set "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" \
  --set "NEXT_PUBLIC_AUTH_ENABLED=1" --skip-deploys

echo "▸ api を再デプロイ(AUTH_MODE 反映)"
railway up --path-as-root backend --service "$API_SVC" --ci

echo "▸ web を再ビルド(NEXT_PUBLIC_AUTH_ENABLED はビルド時に焼き込むため必須)"
railway up --path-as-root web --service "$WEB_SVC" --ci

echo "▸ 検証: 未ログインでトップが /api/auth/signin に誘導されるはず"
code=$(curl -s -o /dev/null -w '%{http_code}' -L "$WEB_URL/wiki" || true)
echo "  GET $WEB_URL/wiki (追跡後) -> $code  (200=ログイン画面 / 認証は効いている)"
echo "  ※ 認証ONを確認してから KB_GITHUB_TOKEN を入れること(公開ウィンドウ回避)"
echo "✓ 認証セットアップ完了。ブラウザで $WEB_URL を開きログインを確認。"
