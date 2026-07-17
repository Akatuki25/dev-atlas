"""dev-atlas backend — FastAPI エントリポイント(手書き wiring)。
組立順: repo → service → usecase → 生成 router 登録。
MCP サーバー(mcp_server/server.py)を /mcp にマウントする。
"""
from __future__ import annotations
import hmac
import os
import subprocess
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException
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
from middleware.web_auth_middleware import WebAuthMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MCP セッションマネージャの起動(streamable HTTP に必要)
    async with mcp.session_manager.run():
        yield


def create_app() -> FastAPI:
    app = FastAPI(title="dev-atlas", lifespan=lifespan)

    # web(localhost:3000 / WEB_ORIGIN)からのブラウザ fetch を許可
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[os.environ.get("WEB_ORIGIN", "http://localhost:3000")],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Webセッション認証(AUTH_MODE=all のときだけ有効。生成handlerには触れない横断保護)
    app.add_middleware(WebAuthMiddleware)

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/internal/kb-refresh")
    def kb_refresh(x_refresh_token: str = Header(default="")) -> dict[str, str]:
        """KB を private remote から pull する(CI の GitHub Actions が push 時に叩く)。
        KB_REFRESH_TOKEN 共有トークンで保護。未設定なら無効(404)。read-only 同期。"""
        expected = os.environ.get("KB_REFRESH_TOKEN")
        if not expected:
            raise HTTPException(status_code=404, detail="kb-refresh disabled")
        if not hmac.compare_digest(x_refresh_token, expected):
            raise HTTPException(status_code=401, detail="invalid refresh token")
        kb_path = os.environ.get("KB_PATH", "/kb")
        if not os.path.isdir(os.path.join(kb_path, ".git")):
            raise HTTPException(status_code=409, detail="KB is not a git clone (mounted?)")
        try:
            out = subprocess.run(
                ["git", "-C", kb_path, "pull", "--ff-only"],
                capture_output=True, text=True, timeout=30, check=True,
            )
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=(e.stderr or str(e))[:300]) from e
        return {"status": "ok", "git": out.stdout.strip()[:200]}

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
