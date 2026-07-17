"""KB(knowledge_base)を GitHub API 経由で読む(fs に置かない)。

MCP の search_kb / read_kb_node が使う。web の lib/kb.ts と同じ思想:
private repo のトークンで tree/contents を読む → Vercel でも Railway でも同一に動く。
in-process TTL キャッシュで GitHub を叩きすぎない。read-only。
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

REPO = os.environ.get("KB_REPO", "Akatuki25/knowledge_base")
BRANCH = os.environ.get("KB_BRANCH", "main")
CACHE_TTL = int(os.environ.get("KB_CACHE_SECONDS", "300"))

_cache: dict[str, tuple[float, object]] = {}


def _token() -> str:
    return os.environ.get("KB_GITHUB_TOKEN", "")


def available() -> bool:
    return bool(_token())


def _get(url: str, raw: bool) -> bytes | None:
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {_token()}")
    req.add_header("Accept", "application/vnd.github.raw" if raw else "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.read()
    except (urllib.error.URLError, TimeoutError):
        return None


def _cached(key: str, fn):
    now = time.time()
    hit = _cache.get(key)
    if hit and now - hit[0] < CACHE_TTL:
        return hit[1]
    val = fn()
    _cache[key] = (now, val)
    return val


def list_paths() -> list[str]:
    """md ファイルパス一覧(tree API 1回)。"""
    if not _token():
        return []

    def fetch():
        body = _get(f"https://api.github.com/repos/{REPO}/git/trees/{BRANCH}?recursive=1", raw=False)
        if not body:
            return []
        tree = json.loads(body).get("tree", [])
        return sorted(t["path"] for t in tree if t.get("type") == "blob" and t["path"].endswith(".md"))

    return _cached("paths", fetch)


def read_raw(rel: str) -> str | None:
    """1ファイルの生 Markdown。"""
    if not _token():
        return None

    def fetch():
        from urllib.parse import quote
        body = _get(f"https://api.github.com/repos/{REPO}/contents/{quote(rel)}?ref={BRANCH}", raw=True)
        return body.decode("utf-8") if body else None

    return _cached(f"raw:{rel}", fetch)


def _all_contents() -> dict[str, str]:
    """全 md の {path: content}。並列取得 + キャッシュ(検索用)。"""
    paths = list_paths()

    def fetch():
        out: dict[str, str] = {}
        with ThreadPoolExecutor(max_workers=8) as ex:
            for rel, content in zip(paths, ex.map(read_raw, paths)):
                if content is not None:
                    out[rel] = content
        return out

    return _cached("all", fetch)


def search(query: str, limit: int = 10) -> list[dict]:
    q = query.lower()
    hits: list[dict] = []
    for rel, content in _all_contents().items():
        matched = [ln.strip() for ln in content.splitlines() if q in ln.lower()][:2]
        if matched:
            hits.append({"node": rel, "lines": matched})
            if len(hits) >= limit:
                break
    return hits


def read_node(name: str) -> str | None:
    """名前(ファイル名 or frontmatter id)でノード本文を返す。"""
    target = name.strip().lower().removesuffix(".md")
    for rel in list_paths():
        stem = rel.split("/")[-1].removesuffix(".md").lower()
        if stem == target:
            return read_raw(rel)
    # frontmatter id フォールバック
    for rel, content in _all_contents().items():
        head = content[:2000]
        for line in head.splitlines():
            if line.strip().lower() == f"id: {target}":
                return content
    return None
