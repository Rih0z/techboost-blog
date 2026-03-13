---
title: "Dockerコンテナパターン集: マルチステージビルドからヘルスチェックまで"
description: "本番環境で使えるDockerfileのベストプラクティスとデザインパターンを徹底解説。マルチステージビルド、ヘルスチェック、セキュリティ対策など実践的なテクニックを紹介します。Docker・Container・DevOpsに関する実践情報。"
pubDate: "2025-02-05"
tags: ["Docker", "Container", "DevOps", "Best Practices", "Security"]
heroImage: '../../assets/thumbnails/container-patterns-docker.jpg'
---
Dockerコンテナは現代のアプリケーション開発に欠かせません。しかし、シンプルなDockerfileを書くのと、本番環境で運用できる最適化されたコンテナを作るのは別物です。本記事では、2026年の最新ベストプラクティスに基づいた実践的なDockerパターンを解説します。

## マルチステージビルドパターン

### 基本パターン: Node.js

```dockerfile
# ビルドステージ
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係のインストール（キャッシュ活用）
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# 本番ステージ
FROM node:20-alpine AS production

# セキュリティ: 非rootユーザーで実行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# ビルド成果物のみコピー
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

USER nodejs

EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/main.js"]
```

### 高度なパターン: Next.js

```dockerfile
# 依存関係ステージ
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ビルダーステージ
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 環境変数（ビルド時のみ必要なもの）
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# 本番依存関係ステージ
FROM node:20-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# ランナーステージ
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# public, .next/static をコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "server.js"]
```

## Python Webアプリケーションパターン

### FastAPI + Poetry

```dockerfile
# ベースイメージ
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    POETRY_VERSION=1.7.1 \
    POETRY_HOME="/opt/poetry" \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false

ENV PATH="$POETRY_HOME/bin:$PATH"

# ビルダーステージ
FROM base AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    build-essential && \
    curl -sSL https://install.python-poetry.org | python3 - && \
    apt-get purge -y --auto-remove curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml poetry.lock ./
RUN poetry install --only main --no-root

COPY . .
RUN poetry install --only main

# 本番ステージ
FROM base AS production

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq5 && \
    rm -rf /var/lib/apt/lists/* && \
    useradd -m -u 1001 appuser

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder --chown=appuser:appuser /app /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD python -c "import requests; requests.get('http://localhost:8000/health').raise_for_status()"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Go アプリケーションパターン

### 最小サイズイメージ

```dockerfile
# ビルドステージ
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# 依存関係のキャッシュ
COPY go.mod go.sum ./
RUN go mod download

# ビルド
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -extldflags "-static"' \
    -a \
    -o app \
    ./cmd/server

# 本番ステージ（scratch使用）
FROM scratch

# タイムゾーンデータとCA証明書をコピー
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# バイナリのみコピー
COPY --from=builder /build/app /app

# 非rootユーザー（builder内で作成）
USER nobody:nobody

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD ["/app", "healthcheck"]

ENTRYPOINT ["/app"]
```

### Distrolessパターン

```dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o app ./cmd/server

# Distroless（最小限のOS）
FROM gcr.io/distroless/static-debian12

COPY --from=builder /build/app /app

USER nonroot:nonroot

EXPOSE 8080

ENTRYPOINT ["/app"]
```

## ヘルスチェックパターン

### Node.js HTTPヘルスチェック

```dockerfile
# Dockerfileで定義
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node /healthcheck.js
```

```javascript
// healthcheck.js
const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  timeout: 2000,
};

const request = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  process.exit(res.statusCode === 200 ? 0 : 1);
});

request.on('error', (err) => {
  console.error('Health check failed:', err);
  process.exit(1);
});

request.end();
```

### PostgreSQL接続チェック

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1
```

### Redis接続チェック

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD redis-cli ping || exit 1
```

## セキュリティパターン

### 最小権限の原則

```dockerfile
FROM node:20-alpine

# 1. セキュリティアップデート
RUN apk upgrade --no-cache

# 2. 非rootユーザー作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 3. ファイルの適切な権限設定
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

COPY --chown=nodejs:nodejs . .

# 4. 読み取り専用ファイルシステム（可能な場合）
RUN mkdir -p /app/tmp && chown nodejs:nodejs /app/tmp

USER nodejs

# 5. 不要なポート公開を避ける
EXPOSE 3000

CMD ["node", "server.js"]
```

### シークレット管理

```dockerfile
# ビルド時のシークレット使用（BuildKit）
# docker buildx build --secret id=npmrc,src=$HOME/.npmrc .

FROM node:20-alpine AS builder

WORKDIR /app

# シークレットを一時的にマウント
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci

COPY . .
RUN npm run build

# シークレットは本番イメージに含まれない
FROM node:20-alpine
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main.js"]
```

## キャッシュ最適化パターン

### レイヤーキャッシュの活用

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 1. 依存関係定義のみコピー（変更頻度が低い）
COPY package*.json ./

# 2. 依存関係インストール（キャッシュされる）
RUN npm ci --only=production

# 3. ソースコード（変更頻度が高い）
COPY . .

CMD ["node", "server.js"]
```

### BuildKit キャッシュマウント

```dockerfile
# syntax=docker/dockerfile:1.4

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# npm キャッシュをマウント
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

COPY . .

CMD ["node", "server.js"]
```

## マルチアーキテクチャビルド

```dockerfile
# syntax=docker/dockerfile:1.4

FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

ARG TARGETPLATFORM
ARG BUILDPLATFORM

RUN echo "Building on $BUILDPLATFORM for $TARGETPLATFORM"

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/main.js"]
```

```bash
# ビルド
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t myapp:latest \
  --push \
  .
```

## 開発環境最適化

### ホットリロード対応

```dockerfile
# Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

# グローバルツールのインストール
RUN npm install -g nodemon

# 依存関係
COPY package*.json ./
RUN npm install

# ソースはvolume マウント
CMD ["nodemon", "--watch", "src", "src/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./src:/app/src
      - /app/node_modules  # node_modulesは除外
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
```

## モノレポ対応パターン

```dockerfile
# syntax=docker/dockerfile:1.4

FROM node:20-alpine AS base

WORKDIR /app

# ルートの依存関係
COPY package*.json ./
COPY turbo.json ./
COPY packages/shared/package*.json ./packages/shared/

# 特定アプリの依存関係
COPY apps/api/package*.json ./apps/api/

RUN npm install

# ビルド
FROM base AS builder

COPY . .

# 特定アプリのみビルド
RUN npx turbo run build --filter=api

# 本番
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/main.js"]
```

## デバッグパターン

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# デバッグポート公開
EXPOSE 3000 9229

# デバッグモードで起動
CMD ["node", "--inspect=0.0.0.0:9229", "src/index.js"]
```

```yaml
# docker-compose.debug.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "9229:9229"  # デバッガー接続用
    volumes:
      - ./src:/app/src
```

## まとめ

本記事で紹介したDockerパターンを適切に使うことで、以下が実現できます。

**パフォーマンス**
- マルチステージビルドでイメージサイズを削減
- レイヤーキャッシュで高速ビルド
- BuildKitで並列ビルド

**セキュリティ**
- 非rootユーザー実行
- 最小限のベースイメージ
- シークレット漏洩防止

**運用性**
- ヘルスチェックで自動復旧
- マルチアーキテクチャ対応
- 開発環境と本番環境の分離

2026年現在、これらのパターンは本番環境での運用に欠かせないベストプラクティスとなっています。

**参考リンク**
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [BuildKit](https://docs.docker.com/build/buildkit/)
---

## 関連記事

- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
- [フリーランスエンジニアの収入完全ガイド2026【平均年収・単価・案件獲得】](/blog/2026-03-11-freelance-engineer-income-guide)
- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
