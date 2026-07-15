"""dev-atlas backend — FastAPI エントリポイント(手書き wiring)。
組立順: repo → service → usecase → 生成 router 登録。
"""
from __future__ import annotations
from fastapi import FastAPI

from app.di.handlers import register_routers
from app.domain.service.project_service import ProjectService
from app.domain.service.work_log_service import WorkLogService
from app.infra.repository.project_postgres_repository import new_postgres_project_repository
from app.infra.repository.work_log_postgres_repository import new_postgres_work_log_repository
from app.usecase.project_usecase import ProjectUsecase
from app.usecase.work_log_usecase import WorkLogUsecase


def create_app() -> FastAPI:
    app = FastAPI(title="dev-atlas")

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    project_repo = new_postgres_project_repository()
    work_log_repo = new_postgres_work_log_repository()
    project_service = ProjectService(project_repo)  # clock 未指定 → now
    work_log_service = WorkLogService(work_log_repo, project_repo)
    register_routers(
        app,
        project_usecase=ProjectUsecase(project_service),
        work_log_usecase=WorkLogUsecase(work_log_service),
    )
    return app


app = create_app()
