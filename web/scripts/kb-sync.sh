#!/bin/sh
# KB 同期(デプロイ用): KB_REPO_URL が設定されていれば KB_PATH に clone/pull する。
# 未設定なら no-op(ローカルは docker-compose が KB をマウントするため)。read-only 運用。
set -e

KB_PATH="${KB_PATH:-/kb}"

if [ -z "$KB_REPO_URL" ]; then
  echo "[kb-sync] KB_REPO_URL 未設定 → スキップ(ローカルはマウント想定)"
  exit 0
fi

if [ -d "$KB_PATH/.git" ]; then
  echo "[kb-sync] pull $KB_PATH"
  git -C "$KB_PATH" pull --ff-only --quiet || echo "[kb-sync] pull 失敗(無視して継続)"
else
  echo "[kb-sync] clone → $KB_PATH"
  rm -rf "$KB_PATH"
  git clone --depth 1 --quiet "$KB_REPO_URL" "$KB_PATH"
fi
echo "[kb-sync] done"
