"""Webセッション認証ミドルウェア(hackathon-support-agent から移植)。

エンドポイント個別に Depends を付けず、1枚で横断的に保護する
= 生成された handler/router には何も足さない(生成境界を保つ)。
CORS はブラウザしか守らないため、サーバー側の実質的なアクセス制御はここ。
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from middleware.web_auth import WebAuthError, requires_auth, verify_session_jwt


class WebAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if not requires_auth(request.url.path):
            return await call_next(request)

        authorization = request.headers.get("authorization", "")
        if not authorization.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "authentication required"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            session = verify_session_jwt(authorization[len("Bearer "):].strip())
        except WebAuthError as e:
            return JSONResponse(
                status_code=401,
                content={"detail": str(e)},
                headers={"WWW-Authenticate": "Bearer"},
            )

        request.state.web_session = session  # 後続ハンドラ/ログから参照可能
        return await call_next(request)
