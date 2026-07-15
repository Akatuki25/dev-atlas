"""Project ドメインサービス(手書き)。ビジネスロジック + Entity 構築。
repository を呼び entity を返す。DTO 変換は usecase の責務(ここではやらない)。
"""
from __future__ import annotations
import uuid
from collections.abc import Callable
from datetime import datetime, timezone

from app.domain.entity.project import Project
from app.domain.repository.project_repository import (
    ProjectRepository,
    ProjectNotFoundError,
)

VALID_STATUSES = ("active", "paused", "done")


def _validate(status: str, progress: int) -> None:
    if status not in VALID_STATUSES:
        raise ValueError(f"status must be one of {VALID_STATUSES}: {status!r}")
    if not (0 <= progress <= 100):
        raise ValueError(f"progress must be 0..100: {progress}")


class ProjectService:
    def __init__(self, repo: ProjectRepository, clock: Callable[[], datetime] | None = None) -> None:
        self._repo = repo
        self._clock = clock or (lambda: datetime.now(timezone.utc))

    def create(self, name: str, goal: str, status: str, progress: int,
               repo_url: str, kb_node: str) -> Project:
        _validate(status, progress)
        project = Project.new(uuid.uuid4().hex, name, goal, status, progress,
                              repo_url, kb_node, self._clock())
        self._repo.insert(project)
        return project

    def get(self, id: str) -> Project | None:
        return self._repo.select_by_pk(id)

    def list(self) -> list[Project]:
        return self._repo.select_all()

    def list_by_cursor(self, limit: int, after: str | None) -> list[Project]:
        return self._repo.select_by_cursor(limit, after)

    def update(self, id: str, name: str, goal: str, status: str, progress: int,
               repo_url: str, kb_node: str) -> Project:
        cur = self._repo.select_by_pk(id)
        if cur is None:
            raise ProjectNotFoundError()
        _validate(status, progress)
        updated = Project.new(id, name, goal, status, progress,
                              repo_url, kb_node, cur.created_at)  # created_at を保持
        self._repo.update(updated)
        return updated

    def delete(self, id: str) -> None:
        self._repo.delete(id)
