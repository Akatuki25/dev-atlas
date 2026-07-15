"""WorkLog usecase 実装(手書き)。生成された WorkLogServiceUsecase interface を満たす。
**トランザクション境界は usecase が張る**(tx.run を忘れると commit されない)。
"""
from __future__ import annotations

from app.domain.service.work_log_service import WorkLogService
from app.dto.work_log import WorkLogDTO, from_entities
from app.infra.db import tx
from app.usecase.work_log_usecase_interface import (
    ListWorkLogsInput,
    ListWorkLogsByCursorInput,
    GetWorkLogInput,
    CreateWorkLogInput,
    UpdateWorkLogInput,
    DeleteWorkLogInput,
)


class WorkLogUsecase:  # implements WorkLogServiceUsecase (Protocol)
    def __init__(self, service: WorkLogService) -> None:
        self._svc = service

    def list_work_logs(self, inp: ListWorkLogsInput) -> list[WorkLogDTO]:
        return tx.run(lambda: from_entities(self._svc.list()))

    def list_work_logs_by_cursor(self, inp: ListWorkLogsByCursorInput) -> list[WorkLogDTO]:
        return tx.run(lambda: from_entities(self._svc.list_by_cursor(inp.limit, inp.after_id)))

    def get_work_log(self, inp: GetWorkLogInput) -> WorkLogDTO | None:
        e = tx.run(lambda: self._svc.get(inp.id))
        return WorkLogDTO.from_entity(e) if e else None

    def create_work_log(self, inp: CreateWorkLogInput) -> WorkLogDTO | None:
        return tx.run(lambda: WorkLogDTO.from_entity(
            self._svc.create(inp.project_id, inp.summary, inp.minutes, inp.source)
        ))

    def update_work_log(self, inp: UpdateWorkLogInput) -> WorkLogDTO | None:
        return tx.run(lambda: WorkLogDTO.from_entity(
            self._svc.update(inp.id, inp.project_id, inp.summary, inp.minutes, inp.source)
        ))

    def delete_work_log(self, inp: DeleteWorkLogInput) -> None:
        tx.run(lambda: self._svc.delete(inp.id))
