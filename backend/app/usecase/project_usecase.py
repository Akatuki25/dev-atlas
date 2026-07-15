"""Project usecase 実装(手書き)。生成された ProjectServiceUsecase interface を満たす。
各メソッド: Input を展開 → service を呼ぶ → 境界で DTO に変換して返す。
**トランザクション境界は usecase が張る**(tx.run を忘れると commit されない)。
"""
from __future__ import annotations

from app.domain.service.project_service import ProjectService
from app.dto.project import ProjectDTO, from_entities
from app.infra.db import tx
from app.usecase.project_usecase_interface import (
    ListProjectsInput,
    ListProjectsByCursorInput,
    GetProjectInput,
    CreateProjectInput,
    UpdateProjectInput,
    DeleteProjectInput,
)


class ProjectUsecase:  # implements ProjectServiceUsecase (Protocol)
    def __init__(self, service: ProjectService) -> None:
        self._svc = service

    def list_projects(self, inp: ListProjectsInput) -> list[ProjectDTO]:
        return tx.run(lambda: from_entities(self._svc.list()))

    def list_projects_by_cursor(self, inp: ListProjectsByCursorInput) -> list[ProjectDTO]:
        return tx.run(lambda: from_entities(self._svc.list_by_cursor(inp.limit, inp.after_id)))

    def get_project(self, inp: GetProjectInput) -> ProjectDTO | None:
        e = tx.run(lambda: self._svc.get(inp.id))
        return ProjectDTO.from_entity(e) if e else None

    def create_project(self, inp: CreateProjectInput) -> ProjectDTO | None:
        return tx.run(lambda: ProjectDTO.from_entity(
            self._svc.create(inp.name, inp.goal, inp.status, inp.progress,
                             inp.repo_url, inp.kb_node)
        ))

    def update_project(self, inp: UpdateProjectInput) -> ProjectDTO | None:
        return tx.run(lambda: ProjectDTO.from_entity(
            self._svc.update(inp.id, inp.name, inp.goal, inp.status, inp.progress,
                             inp.repo_url, inp.kb_node)
        ))

    def delete_project(self, inp: DeleteProjectInput) -> None:
        tx.run(lambda: self._svc.delete(inp.id))
