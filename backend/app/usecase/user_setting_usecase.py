"""UserSetting usecase 実装(手書き)。tx 境界を張り、レスポンスでは PAT をマスクする。

暗号化 PAT(github_pat_enc)は本人にも生の値を返さない。設定済みかどうかだけ分かる
マーカー("set"/"")に置き換えて返す(mcp_token は本人が MCP 登録に使うので返す)。
"""
from __future__ import annotations

from app.domain.service.user_setting_service import UserSettingService
from app.dto.user_setting import UserSettingDTO
from app.infra.db import tx
from app.usecase.user_setting_usecase_interface import (
    GetMySettingsInput,
    UpsertMySettingsInput,
)

_PAT_SET = "set"  # PAT が保存済みであることを示すマーカー(生値は返さない)


def _mask(dto: UserSettingDTO) -> UserSettingDTO:
    dto.github_pat_enc = _PAT_SET if dto.github_pat_enc else ""
    return dto


class UserSettingUsecase:  # implements UserSettingServiceUsecase (Protocol)
    def __init__(self, service: UserSettingService) -> None:
        self._svc = service

    def get_my_settings(self, inp: GetMySettingsInput) -> UserSettingDTO | None:
        e = tx.run(lambda: self._svc.get_mine())
        return _mask(UserSettingDTO.from_entity(e)) if e else None

    def upsert_my_settings(self, inp: UpsertMySettingsInput) -> UserSettingDTO | None:
        e = tx.run(lambda: self._svc.upsert_mine(inp.github_pat, inp.kb_repo, inp.kb_branch))
        return _mask(UserSettingDTO.from_entity(e))
