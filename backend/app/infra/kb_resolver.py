"""現在の principal の UserSetting から KbClient を解決する(手書き seam)。

PAT は復号してメモリ上のクライアントにだけ渡す(DBには暗号化のまま)。
principal が未設定/未構成なら None。
"""
from __future__ import annotations

import os

from app import kb_github
from app.infra import crypto
from app.infra.db import tx
from app.infra.repository.user_setting_postgres_repository import new_postgres_user_setting_repository


def _env_fallback() -> kb_github.KbClient | None:
    """単一テナント/ローカル用フォールバック: env に共有トークンがあれば使う。
    本番マルチユーザーでは KB_GITHUB_TOKEN を未設定にする(=各自 /settings で構成)。"""
    token = os.environ.get("KB_GITHUB_TOKEN", "")
    repo = os.environ.get("KB_REPO", "")
    if token and repo:
        return kb_github.get_client(token, repo, os.environ.get("KB_BRANCH", "main"))
    return None


def resolve_kb_client() -> kb_github.KbClient | None:
    """current_owner の設定を読み、復号 PAT で KbClient を返す。未構成なら env フォールバック。"""
    repo = new_postgres_user_setting_repository()
    rows = tx.run(lambda: repo.select_all())  # @owned → principal の 1 行
    if rows:
        s = rows[0]
        token = crypto.decrypt(s.github_pat_enc or "")
        if token and s.kb_repo:
            return kb_github.get_client(token, s.kb_repo, s.kb_branch or "main")
    return _env_fallback()
