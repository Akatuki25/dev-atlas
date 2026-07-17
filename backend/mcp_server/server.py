"""dev-atlas MCP server — エージェント(Claude Code 等)が進捗・工数を自動記録し、KB を引くための口。

FastMCP(streamable HTTP, stateless)を FastAPI に /mcp でマウントする。
Claude Code への登録:
    claude mcp add --transport http dev-atlas http://localhost:8000/mcp

設計方針: ツールは usecase ではなく domain service を直接使う(HTTP handler と同じ層を通ると
DTO 変換が冗長なだけで、検証ロジックは service に集約されているため)。
"""
from __future__ import annotations

import hmac
import os

from mcp.server.fastmcp import FastMCP

from app.infra.db import tx
from app.infra.kb_resolver import resolve_kb_client
from app.infra.mcp_auth import email_for_mcp_token
from app.infra.tenancy import DEV_OWNER, owner_scope
from middleware.web_auth import get_auth_mode

mcp = FastMCP("dev-atlas", stateless_http=True, streamable_http_path="/")


def _services():
    """main.py と同じ組み立て(呼び出し毎に生成 — repo はプロセス共有 engine を使う)"""
    from app.domain.service.project_service import ProjectService
    from app.domain.service.task_service import TaskService
    from app.domain.service.work_log_service import WorkLogService
    from app.infra.repository.project_postgres_repository import new_postgres_project_repository
    from app.infra.repository.task_postgres_repository import new_postgres_task_repository
    from app.infra.repository.work_log_postgres_repository import new_postgres_work_log_repository

    project_repo = new_postgres_project_repository()
    task_repo = new_postgres_task_repository()
    work_log_repo = new_postgres_work_log_repository()
    return (ProjectService(project_repo),
            WorkLogService(work_log_repo, project_repo),
            TaskService(task_repo, project_repo))


def _project_dict(p) -> dict:
    return {"id": p.id, "name": p.name, "goal": p.goal, "status": p.status,
            "progress": p.progress, "repo_url": p.repo_url, "kb_node": p.kb_node}


@mcp.tool()
def list_projects() -> list[dict]:
    """進行中プロジェクトの一覧(状態・進捗率つき)を返す。project_id はここで調べる。"""
    ps, _, _ = _services()
    return tx.run(lambda: [_project_dict(p) for p in ps.list()])


@mcp.tool()
def create_project(name: str, goal: str = "", repo_url: str = "", kb_node: str = "") -> dict:
    """新しいプロジェクトを登録する(status=active, progress=0 で開始)。"""
    ps, _, _ = _services()
    return tx.run(lambda: _project_dict(ps.create(name, goal, "active", 0, repo_url, kb_node)))


@mcp.tool()
def project_status(project_id: str) -> dict:
    """プロジェクトの現状把握: 進捗・累計工数(分)・直近の作業ログ5件を返す。"""
    ps, ws, ts = _services()

    def _query() -> dict:
        p = ps.get(project_id)
        if p is None:
            return {"error": f"project not found: {project_id}"}
        logs = [wl for wl in ws.list() if wl.project_id == project_id]  # 個人用途の規模なので全走査で十分
        recent = sorted(logs, key=lambda wl: wl.created_at, reverse=True)[:5]
        tasks = [t for t in ts.list() if t.project_id == project_id]
        return {
            **_project_dict(p),
            "total_minutes": sum(wl.minutes for wl in logs),
            "log_count": len(logs),
            "tasks": {
                "todo": sum(1 for t in tasks if t.status == "todo"),
                "doing": sum(1 for t in tasks if t.status == "doing"),
                "done": sum(1 for t in tasks if t.status == "done"),
                "open_titles": [t.title for t in tasks if t.status != "done"][:10],
            },
            "recent_logs": [
                {"summary": wl.summary, "minutes": wl.minutes, "source": wl.source,
                 "at": wl.created_at.isoformat()} for wl in recent
            ],
        }

    return tx.run(_query)


@mcp.tool()
def update_progress(project_id: str, progress: int, status: str = "") -> dict:
    """進捗率(0-100)を更新する。status(active/paused/done)も任意で変更可。"""
    ps, _, _ = _services()

    def _update() -> dict:
        cur = ps.get(project_id)
        if cur is None:
            return {"error": f"project not found: {project_id}"}
        updated = ps.update(project_id, cur.name, cur.goal, status or cur.status,
                            progress, cur.repo_url, cur.kb_node)
        return _project_dict(updated)

    return tx.run(_update)


@mcp.tool()
def log_work(project_id: str, summary: str, minutes: int, detail: str = "", source: str = "mcp") -> dict:
    """作業ログ(工数)を記録する。エージェントは作業の区切り(コミット・タスク完了時)に呼ぶ。
    summary は一行の要約、detail は詳細(何を・なぜ・どう解決したか)を任意で。"""
    _, ws, _ = _services()
    e = tx.run(lambda: ws.create(project_id, summary, detail, minutes, source))
    return {"id": e.id, "project_id": e.project_id, "summary": e.summary,
            "detail": e.detail, "minutes": e.minutes, "source": e.source}


def _task_dict(t) -> dict:
    return {"id": t.id, "project_id": t.project_id, "title": t.title,
            "status": t.status, "note": t.note}


@mcp.tool()
def list_tasks(project_id: str, include_done: bool = False) -> list[dict]:
    """プロジェクトのタスク一覧を返す(既定は未完了のみ)。"""
    _, _, ts = _services()

    def _query() -> list[dict]:
        tasks = [t for t in ts.list() if t.project_id == project_id]
        if not include_done:
            tasks = [t for t in tasks if t.status != "done"]
        return [_task_dict(t) for t in tasks]

    return tx.run(_query)


@mcp.tool()
def create_task(project_id: str, title: str, note: str = "") -> dict:
    """タスクを登録する(status=todo で開始)。作業の分解時にエージェントが呼ぶ。"""
    _, _, ts = _services()
    return tx.run(lambda: _task_dict(ts.create(project_id, title, "todo", note)))


@mcp.tool()
def complete_task(task_id: str) -> dict:
    """タスクを完了(done)にする。着手中への変更は status='doing' を渡す update_task 相当として扱わずこのツールは done 専用。"""
    _, _, ts = _services()

    def _done() -> dict:
        cur = ts.get(task_id)
        if cur is None:
            return {"error": f"task not found: {task_id}"}
        return _task_dict(ts.update(task_id, cur.project_id, cur.title, "done", cur.note))

    return tx.run(_done)


@mcp.tool()
def search_kb(query: str, limit: int = 10) -> list[dict]:
    """KB(開発ナレッジwiki)を全文検索し、ヒットしたノードとマッチ行を返す。"""
    c = resolve_kb_client()
    if c is None:
        return [{"error": "KB 未設定。/settings で GitHub PAT と repo を登録してください"}]
    return c.search(query, limit)


@mcp.tool()
def read_kb_node(name: str) -> str:
    """KBノードを名前(ファイル名 or frontmatter id)で読み、本文(Markdown)を返す。"""
    c = resolve_kb_client()
    if c is None:
        return "KB 未設定。/settings で GitHub PAT と repo を登録してください"
    return c.read_node(name) or f"KB node not found: {name}"


class _McpTokenGuard:
    """MCP のユーザー識別 + principal 設定を行う ASGI ラッパ。

    MCP クライアント(Claude Code 等)は NextAuth セッションを持たないため、各ユーザーの
    UserSetting.mcp_token(Bearer)で本人を識別し、そのユーザーとして owner_scope を張る
    → ツールは本人の Project/Task/WorkLog/KB だけを触る(Web と同じテナント分離)。

    互換: 環境変数 MCP_TOKEN(共有・単一ユーザー時代)も許可し MCP_OWNER_EMAIL にマップ。
    ローカル(AUTH_MODE != all かつトークン無し)は DEV_OWNER で素通し。
    """

    def __init__(self, app) -> None:
        self._app = app

    def _resolve_owner(self, token: str) -> str | None:
        # 1) per-user トークン(UserSetting.mcp_token)
        email = email_for_mcp_token(token) if token else None
        if email:
            return email
        # 2) 互換: 共有 MCP_TOKEN → MCP_OWNER_EMAIL
        legacy = os.environ.get("MCP_TOKEN")
        if legacy and token and hmac.compare_digest(token, legacy):
            return os.environ.get("MCP_OWNER_EMAIL", DEV_OWNER)
        # 3) ローカル素通し(本番 AUTH_MODE=all では不可)
        if get_auth_mode() != "all" and not legacy and not token:
            return DEV_OWNER
        return None

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self._app(scope, receive, send)
            return
        headers = dict(scope.get("headers") or [])
        auth = headers.get(b"authorization", b"").decode()
        token = auth[7:].strip() if auth.startswith("Bearer ") else ""
        owner = self._resolve_owner(token)
        if owner is None:
            from starlette.responses import JSONResponse
            await JSONResponse({"detail": "mcp authentication required"}, status_code=401)(scope, receive, send)
            return
        with owner_scope(owner):
            await self._app(scope, receive, send)


def build_mcp_asgi_app():
    return _McpTokenGuard(mcp.streamable_http_app())
