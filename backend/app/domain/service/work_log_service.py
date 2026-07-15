"""WorkLog ドメインサービス(手書き)。工数記録のビジネスロジック。
project の存在検証(集約間参照)はここで行う — MCP 経由の自動記録が
存在しない project_id を握って落ちるのを防ぐ。
"""
from __future__ import annotations
import uuid
from collections.abc import Callable
from datetime import datetime, timezone

from app.domain.entity.work_log import WorkLog
from app.domain.repository.project_repository import ProjectRepository
from app.domain.repository.work_log_repository import (
    WorkLogRepository,
    WorkLogNotFoundError,
)

VALID_SOURCES = ("manual", "mcp", "claude-code")


def _validate(minutes: int, source: str) -> None:
    if minutes < 0:
        raise ValueError(f"minutes must be >= 0: {minutes}")
    if source and source not in VALID_SOURCES:
        raise ValueError(f"source must be one of {VALID_SOURCES}: {source!r}")


class WorkLogService:
    def __init__(self, repo: WorkLogRepository, project_repo: ProjectRepository,
                 clock: Callable[[], datetime] | None = None) -> None:
        self._repo = repo
        self._projects = project_repo
        self._clock = clock or (lambda: datetime.now(timezone.utc))

    def create(self, project_id: str, summary: str, minutes: int, source: str) -> WorkLog:
        # 集約間参照の失敗は「不正な入力」として ValueError に寄せる
        # (生成 handler は WorkLog系例外 + ValueError(→400) だけを捕捉するため)
        if self._projects.select_by_pk(project_id) is None:
            raise ValueError(f"project not found: {project_id}")
        _validate(minutes, source)
        log = WorkLog.new(uuid.uuid4().hex, project_id, summary, minutes,
                          source or "manual", self._clock())
        self._repo.insert(log)
        return log

    def get(self, id: str) -> WorkLog | None:
        return self._repo.select_by_pk(id)

    def list(self) -> list[WorkLog]:
        return self._repo.select_all()

    def list_by_cursor(self, limit: int, after: str | None) -> list[WorkLog]:
        return self._repo.select_by_cursor(limit, after)

    def update(self, id: str, project_id: str, summary: str, minutes: int, source: str) -> WorkLog:
        cur = self._repo.select_by_pk(id)
        if cur is None:
            raise WorkLogNotFoundError()
        if self._projects.select_by_pk(project_id) is None:
            raise ValueError(f"project not found: {project_id}")
        _validate(minutes, source)
        updated = WorkLog.new(id, project_id, summary, minutes,
                              source or cur.source, cur.created_at)  # created_at を保持
        self._repo.update(updated)
        return updated

    def delete(self, id: str) -> None:
        self._repo.delete(id)
