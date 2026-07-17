"""MCP トークン → ユーザー解決(手書き seam)。

MCP クライアント(Claude Code 等)は NextAuth セッションを持たないため、各ユーザーの
UserSetting.mcp_token で本人を識別する。これは「認証情報→本人」の解決なので
principal 未設定の状態で走る = @owned repo(owner 絞り)を通さず生クエリで引く。
"""
from __future__ import annotations

from sqlalchemy import select

from app.domain.entity.user_setting import UserSetting
from app.infra.db import tx


def email_for_mcp_token(token: str) -> str | None:
    if not token:
        return None

    def q() -> str | None:
        row = tx.session().scalars(
            select(UserSetting).where(UserSetting.mcp_token == token)
        ).first()
        return row.email if row else None

    return tx.run(q)
