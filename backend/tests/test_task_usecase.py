"""Task usecase の単体テスト(生成 Mock 使用、実DB不要)。"""
from __future__ import annotations
from datetime import datetime, timezone

import pytest

from app.domain.entity.project import Project
from app.domain.entity.task import Task
from app.domain.repository.mock.mock_project_repository import MockProjectRepository
from app.domain.repository.mock.mock_task_repository import MockTaskRepository
from app.domain.repository.task_repository import TaskNotFoundError
from app.domain.service.task_service import TaskService
from app.usecase.task_usecase import TaskUsecase
from app.usecase.task_usecase_interface import (
    CreateTaskInput,
    ListTasksInput,
    UpdateTaskInput,
    DeleteTaskInput,
)

FIXED = datetime(2026, 7, 15, tzinfo=timezone.utc)


def _project(id: str = "p1") -> Project:
    return Project(id=id, name="n", goal="", status="active", progress=0,
                   repo_url="", kb_node="", created_at=FIXED)


def _task(id: str = "t1", status: str = "todo") -> Task:
    return Task(id=id, project_id="p1", title="設計", status=status, note="", created_at=FIXED)


def _uc(repo: MockTaskRepository, projects: MockProjectRepository) -> TaskUsecase:
    return TaskUsecase(TaskService(repo, projects, clock=lambda: FIXED))


def test_create_task_defaults_to_todo():
    repo, projects = MockTaskRepository(), MockProjectRepository()
    projects.select_by_pk_func = lambda id: _project(id)
    inserted: list[Task] = []
    repo.insert_func = lambda e: inserted.append(e)
    dto = _uc(repo, projects).create_task(CreateTaskInput(
        project_id="p1", title="hub画面を作る", status="", note=""))
    assert dto is not None and dto.status == "todo"
    assert inserted[0].id


def test_create_task_missing_project_raises():
    repo, projects = MockTaskRepository(), MockProjectRepository()
    projects.select_by_pk_func = lambda id: None
    with pytest.raises(ValueError, match="project not found"):
        _uc(repo, projects).create_task(CreateTaskInput(
            project_id="ghost", title="x", status="todo", note=""))


def test_create_task_invalid_status_raises():
    repo, projects = MockTaskRepository(), MockProjectRepository()
    projects.select_by_pk_func = lambda id: _project(id)
    with pytest.raises(ValueError, match="status"):
        _uc(repo, projects).create_task(CreateTaskInput(
            project_id="p1", title="x", status="wip", note=""))


def test_update_task_missing_raises_notfound():
    repo, projects = MockTaskRepository(), MockProjectRepository()
    repo.select_by_pk_func = lambda id: None
    with pytest.raises(TaskNotFoundError):
        _uc(repo, projects).update_task(UpdateTaskInput(
            id="x", project_id="p1", title="x", status="done", note=""))


def test_update_task_to_done_keeps_created_at():
    repo, projects = MockTaskRepository(), MockProjectRepository()
    repo.select_by_pk_func = lambda id: _task(id)
    projects.select_by_pk_func = lambda id: _project(id)
    updated: list[Task] = []
    repo.update_func = lambda e: updated.append(e)
    dto = _uc(repo, projects).update_task(UpdateTaskInput(
        id="t1", project_id="p1", title="設計", status="done", note=""))
    assert dto is not None and dto.status == "done"
    assert updated[0].created_at == FIXED


def test_list_tasks_returns_dtos():
    repo, projects = MockTaskRepository(), MockProjectRepository()
    repo.select_all_func = lambda: [_task("1"), _task("2", "done")]
    out = _uc(repo, projects).list_tasks(ListTasksInput())
    assert [d.id for d in out] == ["1", "2"]


def test_delete_task_delegates_to_repo():
    repo, projects = MockTaskRepository(), MockProjectRepository()
    deleted: list[str] = []
    repo.delete_func = lambda id: deleted.append(id)
    assert _uc(repo, projects).delete_task(DeleteTaskInput(id="t1")) is None
    assert deleted == ["t1"]
