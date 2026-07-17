# web スタックのコンテナ(他スタックの Dockerfile 規約に合わせる / next standalone 出力)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* はビルド時に焼き込むため build arg で受ける(Railway/compose が渡す)
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_AUTH_ENABLED
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_AUTH_ENABLED=$NEXT_PUBLIC_AUTH_ENABLED
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
# KB は GitHub API 経由(fs不要)。Vercel でも動く構成
CMD ["node", "server.js"]
