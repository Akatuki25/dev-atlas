"""dev-atlas backend — FastAPI エントリポイント(手書き wiring)。
組立順: repo → service → usecase → 生成 router 登録。
MCP サーバー(mcp_server/server.py)を /mcp にマウントする。
"""
from __future__ import annotations
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.di.handlers import register_routers
from app.handler.kb_router import new_kb_router
from app.domain.service.project_service import ProjectService
from app.domain.service.task_service import TaskService
from app.domain.service.work_log_service import WorkLogService
from app.domain.service.user_setting_service import UserSettingService
from app.infra.repository.project_postgres_repository import new_postgres_project_repository
from app.infra.repository.task_postgres_repository import new_postgres_task_repository
from app.infra.repository.work_log_postgres_repository import new_postgres_work_log_repository
from app.infra.repository.user_setting_postgres_repository import new_postgres_user_setting_repository
from app.usecase.project_usecase import ProjectUsecase
from app.usecase.task_usecase import TaskUsecase
from app.usecase.work_log_usecase import WorkLogUsecase
from app.usecase.user_setting_usecase import UserSettingUsecase
from app.infra.tenancy import DEV_OWNER, TenancyMiddleware
from mcp_server.server import mcp, build_mcp_asgi_app
from middleware.web_auth import WebAuthError, get_auth_mode, verify_session_jwt
from middleware.web_auth_middleware import WebAuthMiddleware


def _principal_from_scope(scope: dict) -> str | None:
    """@owned のテナンシー: リクエストの Bearer JWT から principal(email)を解決。
    AUTH_MODE!=all(ローカル)は DEV_OWNER。JWT 検証自体は WebAuthMiddleware も別途行う。"""
    if get_auth_mode() != "all":
        return DEV_OWNER
    headers = dict(scope.get("headers") or [])
    auth = headers.get(b"authorization", b"").decode()
    if auth.startswith("Bearer "):
        try:
            return verify_session_jwt(auth[len("Bearer "):].strip()).email
        except WebAuthError:
            return None
    return None


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
    # @owned テナンシー: principal を owner_scope で全リクエストに張る(最外・pure-ASGI)。
    # pure-ASGI ゆえ endpoint(threadpool)まで contextvar が伝播する(Depends では届かない)。
    app.add_middleware(TenancyMiddleware, resolve=_principal_from_scope)

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    project_repo = new_postgres_project_repository()
    task_repo = new_postgres_task_repository()
    work_log_repo = new_postgres_work_log_repository()
    user_setting_repo = new_postgres_user_setting_repository()
    project_service = ProjectService(project_repo)  # clock 未指定 → now
    task_service = TaskService(task_repo, project_repo)
    work_log_service = WorkLogService(work_log_repo, project_repo)
    user_setting_service = UserSettingService(user_setting_repo)
    register_routers(
        app,
        project_usecase=ProjectUsecase(project_service),
        task_usecase=TaskUsecase(task_service),
        work_log_usecase=WorkLogUsecase(work_log_service),
        user_setting_usecase=UserSettingUsecase(user_setting_service),
    )

    # KB 読み取り(手書き・非CRUD。principal のPATでそのユーザーのKBを読む)
    app.include_router(new_kb_router())

    # MCP(エージェントからの進捗・工数の自動記録 + KB 検索)
    app.mount("/mcp", build_mcp_asgi_app())
    return app


app = create_app()
