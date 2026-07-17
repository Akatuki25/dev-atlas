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
        # CORS プリフライト(OPTIONS)は認証ヘッダを持たない。ここで 401 にすると
        # ブラウザが本リクエストをブロックする → 素通しして CORSMiddleware に処理させる。
        if request.method == "OPTIONS":
            return await call_next(request)
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
        # @owned のテナンシー規約: principal を state に置く(生成 repo が require_owner 経由で読む)
        request.state.principal_email = session.email
        return await call_next(request)
