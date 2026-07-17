"""UserSetting ドメインサービス(手書き)。ユーザーごとの KB 接続情報 + MCP トークン。

principal(current_owner)を pk=email として単一行を upsert する「自分の設定」モデル。
- GitHub PAT は平文で受け取り、crypto.encrypt で暗号化して保存(復号は KB 読取時のみ)。
- MCP トークンは初回に生成し以後保持(MCP 登録で本人を識別するのに使う)。
- PAT 未指定の更新は既存 PAT を保持(repo/branch だけ変えられる)。
"""
from __future__ import annotations

import secrets
from collections.abc import Callable
from datetime import datetime, timezone

from app.domain.entity.user_setting import UserSetting
from app.domain.repository.user_setting_repository import UserSettingRepository
from app.infra import crypto
from app.infra.tenancy import current_owner


class UserSettingService:
    def __init__(self, repo: UserSettingRepository, clock: Callable[[], datetime] | None = None) -> None:
        self._repo = repo
        self._clock = clock or (lambda: datetime.now(timezone.utc))

    def get_mine(self) -> UserSetting | None:
        # select_all は @owned で principal に絞られる → 自分の 1 行(なければ空)。
        rows = self._repo.select_all()
        return rows[0] if rows else None

    def upsert_mine(self, github_pat: str, kb_repo: str, kb_branch: str) -> UserSetting:
        email = current_owner()
        existing = self.get_mine()

        # PAT: 新規指定があれば暗号化、無ければ既存を保持。
        if github_pat and github_pat.strip():
            pat_enc = crypto.encrypt(github_pat.strip())
        else:
            pat_enc = existing.github_pat_enc if existing else ""

        # MCP トークン: 初回のみ生成し以後保持。
        mcp_token = (existing.mcp_token if existing and existing.mcp_token else secrets.token_hex(32))

        entity = UserSetting.new(
            email=email,
            github_pat_enc=pat_enc,
            kb_repo=(kb_repo or "").strip(),
            kb_branch=(kb_branch or "main").strip() or "main",
            mcp_token=mcp_token,
            created_at=existing.created_at if existing else self._clock(),
        )
        self._repo.upsert(entity)  # @owned: owner_email は repo が principal で充填
        return entity
