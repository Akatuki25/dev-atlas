"""現在の principal の UserSetting から KbClient を解決する(手書き seam)。

PAT は復号してメモリ上のクライアントにだけ渡す(DBには暗号化のまま)。
principal が未設定/未構成なら None。
"""
from __future__ import annotations

from app import kb_github
from app.infra import crypto
from app.infra.db import tx
from app.infra.repository.user_setting_postgres_repository import new_postgres_user_setting_repository


def resolve_kb_client() -> kb_github.KbClient | None:
    """current_owner の UserSetting を読み、復号 PAT で KbClient を返す。未構成なら None。

    完全 per-user: env の共有トークン(KB_GITHUB_TOKEN)フォールバックは廃止。
    各ユーザーは /settings で自分の PAT/repo を登録する。"""
    repo = new_postgres_user_setting_repository()
    rows = tx.run(lambda: repo.select_all())  # @owned → principal の 1 行
    if not rows:
        return None
    s = rows[0]
    token = crypto.decrypt(s.github_pat_enc or "")
    if not token or not s.kb_repo:
        return None
    return kb_github.get_client(token, s.kb_repo, s.kb_branch or "main")
