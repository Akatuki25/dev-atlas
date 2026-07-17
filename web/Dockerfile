# web スタックのコンテナ(他スタックの Dockerfile 規約に合わせる / next standalone 出力)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

# git: KB(knowledge_base private repo)の clone/pull に使う
RUN apk add --no-cache git

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY scripts/kb-sync.sh ./scripts/kb-sync.sh

EXPOSE 3000
# 起動時に KB を同期(KB_REPO_URL 未設定なら no-op)してから Next standalone を起動
CMD ["sh", "-c", "sh scripts/kb-sync.sh; node server.js"]
