"""Webセッション認証(hackathon-support-agent の実績構成を単一ユーザー向けに簡素化)。

フロント(Next.js/NextAuth)が NEXTAUTH_SECRET を共有鍵に HS256 で署名した短命JWTを検証する。
横断関心なので**生成コードには一切触れず**、main.py の組立(ミドルウェア)にだけ現れる。

AUTH_MODE:
  off : 検証しない(既定 — ローカル開発)
  all : 免除パス以外のすべてを保護(デプロイ時)
"""
from __future__ import annotations

import os
from dataclasses import dataclass

import jwt

ALGORITHM = "HS256"

# 認証を要求しないパス(プレフィックス一致)。/mcp は将来独自のトークン認証を持つ。
EXEMPT_PREFIXES = (
    "/healthz",
    "/mcp",
    "/internal/",  # サーバ間(CI)呼び出し。独自トークンで保護するため session 認証は免除
    "/docs",
    "/redoc",
    "/openapi.json",
)


class WebAuthError(Exception):
    """セッションJWTが無効"""


@dataclass(frozen=True)
class WebSession:
    email: str


def get_auth_mode() -> str:
    return os.getenv("AUTH_MODE", "off")


def requires_auth(path: str) -> bool:
    if get_auth_mode() != "all":
        return False
    return not any(path.startswith(p) for p in EXEMPT_PREFIXES)


def verify_session_jwt(token: str) -> WebSession:
    secret = os.getenv("NEXTAUTH_SECRET")
    if not secret:
        raise WebAuthError("NEXTAUTH_SECRET is not configured")
    try:
        claims = jwt.decode(token, secret, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as e:
        raise WebAuthError("session token expired") from e
    except jwt.InvalidTokenError as e:
        raise WebAuthError("invalid session token") from e

    email = claims.get("email", "")
    if not email:
        raise WebAuthError("session token has no email")

    allowed = [e.strip() for e in os.getenv("ALLOWED_EMAILS", "").split(",") if e.strip()]
    if allowed and email not in allowed:
        raise WebAuthError(f"email not allowed: {email}")

    return WebSession(email=email)
