# python スタックのコンテナ(他スタックの Dockerfile 規約に合わせる)
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# git: KB(knowledge_base private repo)の clone/pull に使う
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

# 依存を先に解決してレイヤキャッシュを効かせる
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

EXPOSE 8000
# 本番起動(Railway 等は Dockerfile CMD を使う): KB同期 → migration適用 → uvicorn。
# ローカルは docker-compose の command が上書き(KBはマウント)。
CMD ["sh", "-c", "sh scripts/kb-sync.sh; uv run --no-sync python tools/apply-migrations.py; uv run --no-sync uvicorn app.main:app --host 0.0.0.0 --port 8000"]
