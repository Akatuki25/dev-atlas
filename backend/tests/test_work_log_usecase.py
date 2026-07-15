"""WorkLog usecase の単体テスト(生成 Mock 使用、実DB不要)。
project 存在検証(集約間参照)が効いていることを重点的に見る。
"""
from __future__ import annotations
from datetime import datetime, timezone

import pytest

from app.domain.entity.project import Project
from app.domain.entity.work_log import WorkLog
from app.domain.repository.mock.mock_project_repository import MockProjectRepository
from app.domain.repository.mock.mock_work_log_repository import MockWorkLogRepository
from app.domain.service.work_log_service import WorkLogService
from app.usecase.work_log_usecase import WorkLogUsecase
from app.usecase.work_log_usecase_interface import (
    CreateWorkLogInput,
    ListWorkLogsInput,
    DeleteWorkLogInput,
)

FIXED = datetime(2026, 7, 15, tzinfo=timezone.utc)


def _project(id: str = "p1") -> Project:
    return Project(id=id, name="n", goal="", status="active", progress=0,
                   repo_url="", kb_node="", created_at=FIXED)


def _uc(repo: MockWorkLogRepository, projects: MockProjectRepository) -> WorkLogUsecase:
    return WorkLogUsecase(WorkLogService(repo, projects, clock=lambda: FIXED))


def test_create_work_log_returns_dto():
    repo, projects = MockWorkLogRepository(), MockProjectRepository()
    projects.select_by_pk_func = lambda id: _project(id)
    inserted: list[WorkLog] = []
    repo.insert_func = lambda e: inserted.append(e)

    dto = _uc(repo, projects).create_work_log(CreateWorkLogInput(
        project_id="p1", summary="ruff導入と警告全解消", minutes=90, source="mcp"))

    assert dto is not None
    assert dto.project_id == "p1" and dto.minutes == 90
    assert dto.created_at_unix == int(FIXED.timestamp())
    assert len(inserted) == 1 and inserted[0].id


def test_create_work_log_missing_project_raises():
    repo, projects = MockWorkLogRepository(), MockProjectRepository()
    projects.select_by_pk_func = lambda id: None  # project が存在しない
    with pytest.raises(ValueError, match="project not found"):
        _uc(repo, projects).create_work_log(CreateWorkLogInput(
            project_id="ghost", summary="s", minutes=10, source="mcp"))


def test_create_work_log_negative_minutes_raises():
    repo, projects = MockWorkLogRepository(), MockProjectRepository()
    projects.select_by_pk_func = lambda id: _project(id)
    with pytest.raises(ValueError):
        _uc(repo, projects).create_work_log(CreateWorkLogInput(
            project_id="p1", summary="s", minutes=-1, source="mcp"))


def test_create_work_log_invalid_source_raises():
    repo, projects = MockWorkLogRepository(), MockProjectRepository()
    projects.select_by_pk_func = lambda id: _project(id)
    with pytest.raises(ValueError):
        _uc(repo, projects).create_work_log(CreateWorkLogInput(
            project_id="p1", summary="s", minutes=1, source="teleport"))


def test_create_work_log_empty_source_defaults_to_manual():
    repo, projects = MockWorkLogRepository(), MockProjectRepository()
    projects.select_by_pk_func = lambda id: _project(id)
    inserted: list[WorkLog] = []
    repo.insert_func = lambda e: inserted.append(e)
    _uc(repo, projects).create_work_log(CreateWorkLogInput(
        project_id="p1", summary="s", minutes=5, source=""))
    assert inserted[0].source == "manual"


def test_list_work_logs_returns_dtos():
    repo, projects = MockWorkLogRepository(), MockProjectRepository()
    repo.select_all_func = lambda: [
        WorkLog(id="w1", project_id="p1", summary="a", minutes=10, source="manual", created_at=FIXED),
        WorkLog(id="w2", project_id="p1", summary="b", minutes=20, source="mcp", created_at=FIXED),
    ]
    out = _uc(repo, projects).list_work_logs(ListWorkLogsInput())
    assert [d.id for d in out] == ["w1", "w2"]


def test_delete_work_log_delegates_to_repo():
    repo, projects = MockWorkLogRepository(), MockProjectRepository()
    deleted: list[str] = []
    repo.delete_func = lambda id: deleted.append(id)
    assert _uc(repo, projects).delete_work_log(DeleteWorkLogInput(id="w1")) is None
    assert deleted == ["w1"]
