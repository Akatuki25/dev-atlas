#!/usr/bin/env bash
# dev-atlas: KB を wiki 表示するための GitHub 読み取りトークンを Railway に入れる(冪等)。
# ★必ず setup-auth.sh で認証を有効化した後に実行すること(認証前に入れると KB が公開される)。
#
# 使い方:
#   KB_GITHUB_TOKEN=github_pat_xxx ./scripts/setup-kb.sh
# トークンは fine-grained PAT: Repository=knowledge_base のみ / Contents: Read-only。
set -euo pipefail

API_SVC="${API_SVC:-api}"
WEB_SVC="${WEB_SVC:-web}"
KB_REPO="${KB_REPO:-Akatuki25/knowledge_base}"
WEB_URL="${WEB_URL:-https://web-production-79feb.up.railway.app}"

: "${KB_GITHUB_TOKEN:?KB_GITHUB_TOKEN(fine-grained PAT, Contents:Read)を設定してください}"

# 認証が有効かを先に確認(未ログインでガードされていなければ中断)
mode=$(railway variables --service "$API_SVC" --json 2>/dev/null | grep -o '"AUTH_MODE"[^,]*' || true)
if ! echo "$mode" | grep -q '"all"'; then
  echo "✗ AUTH_MODE=all になっていません。先に scripts/setup-auth.sh を実行してください(公開防止)。" >&2
  exit 1
fi

echo "▸ KB トークン/リポジトリを両サービスへ"
for svc in "$API_SVC" "$WEB_SVC"; do
  railway variables --service "$svc" \
    --set "KB_GITHUB_TOKEN=$KB_GITHUB_TOKEN" \
    --set "KB_REPO=$KB_REPO" \
    --set "KB_BRANCH=main" --skip-deploys
done

echo "▸ 両サービス再デプロイ"
railway up --path-as-root backend --service "$API_SVC" --ci
railway up --path-as-root web --service "$WEB_SVC" --ci
echo "✓ 完了。$WEB_URL/wiki にログインして KB ノードが並べば成功。"
