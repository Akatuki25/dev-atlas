"""dev-atlas backend — FastAPI エントリポイント(手書き wiring)。
組立順: repo → service → usecase → 生成 router 登録。
MCP サーバー(mcp_server/server.py)を /mcp にマウントする。
"""
from __future__ import annotations
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.di.handlers import register_routers
from app.domain.service.project_service import ProjectService
from app.domain.service.task_service import TaskService
from app.domain.service.work_log_service import WorkLogService
from app.infra.repository.project_postgres_repository import new_postgres_project_repository
from app.infra.repository.task_postgres_repository import new_postgres_task_repository
from app.infra.repository.work_log_postgres_repository import new_postgres_work_log_repository
from app.usecase.project_usecase import ProjectUsecase
from app.usecase.task_usecase import TaskUsecase
from app.usecase.work_log_usecase import WorkLogUsecase
from mcp_server.server import mcp, build_mcp_asgi_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MCP セッションマネージャの起動(streamable HTTP に必要)
    async with mcp.session_manager.run():
        yield


def create_app() -> FastAPI:
    app = FastAPI(title="dev-atlas", lifespan=lifespan)

    # web(localhost:3000)からのブラウザ fetch を許可
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    project_repo = new_postgres_project_repository()
    task_repo = new_postgres_task_repository()
    work_log_repo = new_postgres_work_log_repository()
    project_service = ProjectService(project_repo)  # clock 未指定 → now
    task_service = TaskService(task_repo, project_repo)
    work_log_service = WorkLogService(work_log_repo, project_repo)
    register_routers(
        app,
        project_usecase=ProjectUsecase(project_service),
        task_usecase=TaskUsecase(task_service),
        work_log_usecase=WorkLogUsecase(work_log_service),
    )

    # MCP(エージェントからの進捗・工数の自動記録 + KB 検索)
    app.mount("/mcp", build_mcp_asgi_app())
    return app


app = create_app()
