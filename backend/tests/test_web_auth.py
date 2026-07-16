"""Webセッション認証の単体テスト(実DB不要)。"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from middleware.web_auth import (
    WebAuthError,
    requires_auth,
    verify_session_jwt,
)

SECRET = "test-secret"


def _token(email: str = "me@example.com", exp_minutes: int = 15, secret: str = SECRET) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"email": email, "iat": now, "exp": now + timedelta(minutes=exp_minutes)},
        secret, algorithm="HS256",
    )


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("NEXTAUTH_SECRET", SECRET)
    monkeypatch.delenv("ALLOWED_EMAILS", raising=False)
    monkeypatch.setenv("AUTH_MODE", "all")


def test_requires_auth_exempts_known_paths():
    for p in ("/healthz", "/mcp/", "/docs", "/openapi.json"):
        assert requires_auth(p) is False
    assert requires_auth("/api/projects") is True


def test_requires_auth_off_mode(monkeypatch):
    monkeypatch.setenv("AUTH_MODE", "off")
    assert requires_auth("/api/projects") is False


def test_verify_valid_token_returns_session():
    s = verify_session_jwt(_token())
    assert s.email == "me@example.com"


def test_verify_expired_token_raises():
    with pytest.raises(WebAuthError, match="expired"):
        verify_session_jwt(_token(exp_minutes=-1))


def test_verify_bad_signature_raises():
    with pytest.raises(WebAuthError, match="invalid"):
        verify_session_jwt(_token(secret="other-secret"))


def test_verify_disallowed_email_raises(monkeypatch):
    monkeypatch.setenv("ALLOWED_EMAILS", "owner@example.com")
    with pytest.raises(WebAuthError, match="not allowed"):
        verify_session_jwt(_token(email="stranger@example.com"))


def test_verify_allowed_email_passes(monkeypatch):
    monkeypatch.setenv("ALLOWED_EMAILS", "owner@example.com, me@example.com")
    assert verify_session_jwt(_token()).email == "me@example.com"
