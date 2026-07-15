"""Project usecase の単体テスト(生成 Mock 使用、実DB不要)。"""
from __future__ import annotations
from datetime import datetime, timezone

import pytest

from app.domain.entity.project import Project
from app.domain.repository.mock.mock_project_repository import MockProjectRepository
from app.domain.repository.project_repository import ProjectNotFoundError
from app.domain.service.project_service import ProjectService
from app.usecase.project_usecase import ProjectUsecase
from app.usecase.project_usecase_interface import (
    CreateProjectInput,
    GetProjectInput,
    ListProjectsInput,
    UpdateProjectInput,
    DeleteProjectInput,
)

FIXED = datetime(2026, 7, 15, tzinfo=timezone.utc)


def _project(id: str = "p1", status: str = "active", progress: int = 30) -> Project:
    return Project(id=id, name="dev-atlas", goal="g", status=status, progress=progress,
                   repo_url="", kb_node="", created_at=FIXED)


def _uc(repo: MockProjectRepository) -> ProjectUsecase:
    return ProjectUsecase(ProjectService(repo, clock=lambda: FIXED))


def test_create_project_returns_dto_with_unix_timestamp():
    repo = MockProjectRepository()
    inserted: list[Project] = []
    repo.insert_func = lambda e: inserted.append(e)

    dto = _uc(repo).create_project(CreateProjectInput(
        name="dev-atlas", goal="進捗と工数の自動管理", status="active",
        progress=0, repo_url="https://github.com/Akatuki25/dev-atlas", kb_node="dev-atlas"))

    assert dto is not None
    assert dto.name == "dev-atlas"
    assert dto.created_at_unix == int(FIXED.timestamp())
    assert len(inserted) == 1 and inserted[0].id  # uuid が採番される


def test_create_project_invalid_status_raises():
    repo = MockProjectRepository()
    with pytest.raises(ValueError):
        _uc(repo).create_project(CreateProjectInput(
            name="x", goal="", status="in-progress", progress=0, repo_url="", kb_node=""))


def test_create_project_progress_out_of_range_raises():
    repo = MockProjectRepository()
    with pytest.raises(ValueError):
        _uc(repo).create_project(CreateProjectInput(
            name="x", goal="", status="active", progress=101, repo_url="", kb_node=""))


def test_get_project_not_found_returns_none():
    repo = MockProjectRepository()
    repo.select_by_pk_func = lambda id: None
    assert _uc(repo).get_project(GetProjectInput(id="nope")) is None


def test_list_projects_returns_dtos():
    repo = MockProjectRepository()
    repo.select_all_func = lambda: [_project("1"), _project("2")]
    out = _uc(repo).list_projects(ListProjectsInput())
    assert [d.id for d in out] == ["1", "2"]


def test_update_project_missing_raises_notfound():
    repo = MockProjectRepository()
    repo.select_by_pk_func = lambda id: None
    with pytest.raises(ProjectNotFoundError):
        _uc(repo).update_project(UpdateProjectInput(
            id="x", name="n", goal="", status="active", progress=0, repo_url="", kb_node=""))


def test_update_project_keeps_created_at():
    repo = MockProjectRepository()
    repo.select_by_pk_func = lambda id: _project(id)
    updated: list[Project] = []
    repo.update_func = lambda e: updated.append(e)
    dto = _uc(repo).update_project(UpdateProjectInput(
        id="p1", name="n2", goal="", status="done", progress=100, repo_url="", kb_node=""))
    assert dto is not None and dto.status == "done"
    assert updated[0].created_at == FIXED  # 既存 created_at を保持


def test_delete_project_delegates_to_repo():
    repo = MockProjectRepository()
    deleted: list[str] = []
    repo.delete_func = lambda id: deleted.append(id)
    assert _uc(repo).delete_project(DeleteProjectInput(id="p1")) is None
    assert deleted == ["p1"]
