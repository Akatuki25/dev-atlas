"""KB 読み取り API(手書き・非CRUDの横断機能なので生成対象外)。

principal(require_owner)で保護し、そのユーザーの UserSetting から
復号 PAT で GitHub を読む。生の primitive(paths/raw/search/node)を返し、
ノードのメタ解析(frontmatter→カテゴリ等)は web 側に委ねる。
未構成(PAT/repo 未設定)は 409 で「設定してね」を伝える。
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.infra.kb_resolver import resolve_kb_client
from app.infra.tenancy import require_owner


def new_kb_router() -> APIRouter:
    router = APIRouter(prefix="/api/kb", dependencies=[Depends(require_owner)])

    def _client():
        c = resolve_kb_client()
        if c is None:
            raise HTTPException(status_code=409, detail="KB not configured (set GitHub PAT and repo in /settings)")
        return c

    @router.get("/paths")
    def paths() -> dict:
        return {"paths": _client().list_paths()}

    @router.get("/raw")
    def raw(path: str = Query(...)) -> dict:
        content = _client().read_raw(path)
        if content is None:
            raise HTTPException(status_code=404, detail="not found")
        return {"path": path, "content": content}

    @router.get("/search")
    def search(q: str = Query(...), limit: int = Query(10, ge=1, le=50)) -> dict:
        return {"hits": _client().search(q, limit)}

    @router.get("/node")
    def node(name: str = Query(...)) -> dict:
        content = _client().read_node(name)
        if content is None:
            raise HTTPException(status_code=404, detail="not found")
        return {"name": name, "content": content}

    return router
