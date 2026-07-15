"""Task usecase 実装(手書き)。生成された TaskServiceUsecase interface を満たす。
**トランザクション境界は usecase が張る**(tx.run を忘れると commit されない)。
"""
from __future__ import annotations

from app.domain.service.task_service import TaskService
from app.dto.task import TaskDTO, from_entities
from app.infra.db import tx
from app.usecase.task_usecase_interface import (
    ListTasksInput,
    ListTasksByCursorInput,
    GetTaskInput,
    CreateTaskInput,
    UpdateTaskInput,
    DeleteTaskInput,
)


class TaskUsecase:  # implements TaskServiceUsecase (Protocol)
    def __init__(self, service: TaskService) -> None:
        self._svc = service

    def list_tasks(self, inp: ListTasksInput) -> list[TaskDTO]:
        return tx.run(lambda: from_entities(self._svc.list()))

    def list_tasks_by_cursor(self, inp: ListTasksByCursorInput) -> list[TaskDTO]:
        return tx.run(lambda: from_entities(self._svc.list_by_cursor(inp.limit, inp.after_id)))

    def get_task(self, inp: GetTaskInput) -> TaskDTO | None:
        e = tx.run(lambda: self._svc.get(inp.id))
        return TaskDTO.from_entity(e) if e else None

    def create_task(self, inp: CreateTaskInput) -> TaskDTO | None:
        return tx.run(lambda: TaskDTO.from_entity(
            self._svc.create(inp.project_id, inp.title, inp.status, inp.note)
        ))

    def update_task(self, inp: UpdateTaskInput) -> TaskDTO | None:
        return tx.run(lambda: TaskDTO.from_entity(
            self._svc.update(inp.id, inp.project_id, inp.title, inp.status, inp.note)
        ))

    def delete_task(self, inp: DeleteTaskInput) -> None:
        tx.run(lambda: self._svc.delete(inp.id))
