"""Task ドメインサービス(手書き)。タスクのビジネスロジック。
project の存在検証(集約間参照)はここで行う。
"""
from __future__ import annotations
import uuid
from collections.abc import Callable
from datetime import datetime, timezone

from app.domain.entity.task import Task
from app.domain.repository.project_repository import ProjectRepository
from app.domain.repository.task_repository import TaskRepository, TaskNotFoundError

VALID_STATUSES = ("todo", "doing", "done")


def _validate(status: str) -> None:
    if status not in VALID_STATUSES:
        raise ValueError(f"status must be one of {VALID_STATUSES}: {status!r}")


class TaskService:
    def __init__(self, repo: TaskRepository, project_repo: ProjectRepository,
                 clock: Callable[[], datetime] | None = None) -> None:
        self._repo = repo
        self._projects = project_repo
        self._clock = clock or (lambda: datetime.now(timezone.utc))

    def create(self, project_id: str, title: str, status: str, note: str) -> Task:
        if self._projects.select_by_pk(project_id) is None:
            raise ValueError(f"project not found: {project_id}")
        status = status or "todo"
        _validate(status)
        task = Task.new(uuid.uuid4().hex, project_id, title, status, note, self._clock())
        self._repo.insert(task)
        return task

    def get(self, id: str) -> Task | None:
        return self._repo.select_by_pk(id)

    def list(self) -> list[Task]:
        return self._repo.select_all()

    def list_by_cursor(self, limit: int, after: str | None) -> list[Task]:
        return self._repo.select_by_cursor(limit, after)

    def update(self, id: str, project_id: str, title: str, status: str, note: str) -> Task:
        cur = self._repo.select_by_pk(id)
        if cur is None:
            raise TaskNotFoundError()
        if self._projects.select_by_pk(project_id) is None:
            raise ValueError(f"project not found: {project_id}")
        _validate(status)
        updated = Task.new(id, project_id, title, status, note, cur.created_at)  # created_at を保持
        self._repo.update(updated)
        return updated

    def delete(self, id: str) -> None:
        self._repo.delete(id)
