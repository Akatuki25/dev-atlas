"""KB(knowledge_base)を GitHub API 経由で読む(fs に置かない)。

マルチユーザー: token/repo/branch は**ユーザーごと**(UserSetting)。
呼び出し側が KbClient を作る(または get_client でメモ化取得)。
キャッシュは (token, repo, branch) 単位 = 他ユーザーの内容が混ざらない。read-only。
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote

CACHE_TTL = 300


class KbClient:
    def __init__(self, token: str, repo: str, branch: str = "main", cache_ttl: int = CACHE_TTL) -> None:
        self.token = token or ""
        self.repo = repo or ""
        self.branch = branch or "main"
        self.cache_ttl = cache_ttl
        self._cache: dict[str, tuple[float, object]] = {}

    def available(self) -> bool:
        return bool(self.token and self.repo)

    def _get(self, url: str, raw: bool) -> bytes | None:
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Bearer {self.token}")
        req.add_header("Accept", "application/vnd.github.raw" if raw else "application/vnd.github+json")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.read()
        except (urllib.error.URLError, TimeoutError):
            return None

    def _cached(self, key: str, fn):
        now = time.time()
        hit = self._cache.get(key)
        if hit and now - hit[0] < self.cache_ttl:
            return hit[1]
        val = fn()
        self._cache[key] = (now, val)
        return val

    def list_paths(self) -> list[str]:
        if not self.available():
            return []

        def fetch():
            body = self._get(
                f"https://api.github.com/repos/{self.repo}/git/trees/{self.branch}?recursive=1", raw=False)
            if not body:
                return []
            tree = json.loads(body).get("tree", [])
            return sorted(t["path"] for t in tree if t.get("type") == "blob" and t["path"].endswith(".md"))

        return self._cached("paths", fetch)

    def read_raw(self, rel: str) -> str | None:
        if not self.available():
            return None

        def fetch():
            body = self._get(
                f"https://api.github.com/repos/{self.repo}/contents/{quote(rel)}?ref={self.branch}", raw=True)
            return body.decode("utf-8") if body else None

        return self._cached(f"raw:{rel}", fetch)

    def all_contents(self) -> dict[str, str]:
        paths = self.list_paths()

        def fetch():
            out: dict[str, str] = {}
            with ThreadPoolExecutor(max_workers=8) as ex:
                for rel, content in zip(paths, ex.map(self.read_raw, paths)):
                    if content is not None:
                        out[rel] = content
            return out

        return self._cached("all", fetch)

    def search(self, query: str, limit: int = 10) -> list[dict]:
        q = query.lower()
        hits: list[dict] = []
        for rel, content in self.all_contents().items():
            matched = [ln.strip() for ln in content.splitlines() if q in ln.lower()][:2]
            if matched:
                hits.append({"node": rel, "lines": matched})
                if len(hits) >= limit:
                    break
        return hits

    def read_node(self, name: str) -> str | None:
        target = name.strip().lower().removesuffix(".md")
        for rel in self.list_paths():
            stem = rel.split("/")[-1].removesuffix(".md").lower()
            if stem == target:
                return self.read_raw(rel)
        for rel, content in self.all_contents().items():
            head = content[:2000]
            for line in head.splitlines():
                if line.strip().lower() == f"id: {target}":
                    return content
        return None


# (token, repo, branch) 単位でクライアントをメモ化 → キャッシュを跨ぎ再利用しつつユーザー分離。
_clients: dict[tuple[str, str, str], KbClient] = {}


def get_client(token: str, repo: str, branch: str = "main") -> KbClient:
    key = (token or "", repo or "", branch or "main")
    c = _clients.get(key)
    if c is None:
        c = KbClient(token, repo, branch)
        _clients[key] = c
    return c
