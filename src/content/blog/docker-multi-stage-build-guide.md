---
title: 'Docker マルチステージビルド完全ガイド — イメージサイズを90%削減する最適化テクニック'
description: 'Dockerマルチステージビルドでイメージを最小化。Node.js/Go/Python/Java対応。BuildKit活用・キャッシュ最適化・セキュリティ強化まで実践解説。'
pubDate: '2026-02-21'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['Docker', 'DevOps', 'Container', 'CI/CD', 'Optimization']
---

本番環境にデプロイされているDockerイメージのサイズを確認したことはあるだろうか。何も考えずに作ったNode.jsイメージは1GB超え、Pythonイメージが800MB……そんな状況は珍しくない。

Dockerマルチステージビルドを使えば、同じアプリケーションのイメージを**50MB以下**まで削減することも十分可能だ。CI/CDパイプラインの高速化、本番デプロイの信頼性向上、セキュリティリスクの低減——マルチステージビルドはこれらすべてを一度に実現する現代コンテナ開発の必須技術だ。

本記事では、基本概念の説明から始め、Node.js・Go・Python・Javaの実践的なDockerfileを通じて、イメージ最適化の全技術を網羅する。

---

## 1. シングルステージビルドの問題点

### なぜイメージが肥大化するのか

最初にシングルステージビルドの典型的なアンチパターンを見てみよう。

```dockerfile
# ❌ アンチパターン：シングルステージビルド
FROM node:20

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

このDockerfileでビルドすると何が起こるか。

```
$ docker images
REPOSITORY   TAG     IMAGE ID       SIZE
my-node-app  latest  a1b2c3d4e5f6   1.23 GB
```

**1.23GBのイメージの内訳:**
- node:20ベースイメージ: ~1.1GB（Debian Linux + Node.js + npm + 全開発ツール）
- node_modules（devDependencies含む）: ~150MB
- ソースコード・テストファイル: ~数MB
- ビルド成果物: ~10MB

本番環境で実際に必要なのはビルド成果物の10MBだけなのに、1.23GBを丸ごと本番サーバーに持ち込んでいる。

### セキュリティリスク

サイズだけが問題ではない。開発ツールが含まれたイメージには重大なセキュリティリスクが潜んでいる。

```
$ docker run --rm my-node-app npm --version
9.8.1  # ← 攻撃者がnpmを悪用できる

$ docker run --rm my-node-app sh  # ← シェルが使える
# curl, wget, git ... 攻撃ツールとして利用される
```

**シングルステージビルドの問題点まとめ:**

| 問題 | 影響 |
|------|------|
| イメージサイズ肥大 | レジストリストレージコスト増、デプロイ時間増加 |
| 開発ツール混入 | CVEの表面積拡大、攻撃経路の増加 |
| ビルドキャッシュ非効率 | CI/CDパイプラインの低速化 |
| devDependencies混入 | セキュリティスキャンでの過剰検出 |

---

## 2. マルチステージビルドの基本概念

### 仕組みと原理

マルチステージビルドは、一つのDockerfileの中に複数の `FROM` 命令を記述することで実現する。各ステージは独立した一時的なイメージとして扱われ、前のステージで作られたファイルを **`COPY --from=<stage>`** で選択的に取り込む。

```
┌──────────────────────────────────────────────────────────────┐
│  Stage 1: builder                                             │
│  ┌─────────────────┐                                         │
│  │  node:20        │ ← 開発ツール全部入り                     │
│  │  + devDeps      │                                         │
│  │  + ソースコード  │  RUN npm run build                       │
│  │  + ビルド成果物 ←────────────────────────────┐            │
│  └─────────────────┘                           │            │
│                                                │ COPY --from │
│  Stage 2: runner                               │            │
│  ┌─────────────────┐                          │            │
│  │  node:20-alpine │ ← 軽量ベースイメージ       │            │
│  │  + 本番deps     │                           │            │
│  │  + ビルド成果物 ←────────────────────────────┘            │
│  └─────────────────┘                                         │
│       ↑                                                      │
│       最終イメージ（これだけが docker push される）             │
└──────────────────────────────────────────────────────────────┘
```

**最小限のマルチステージビルド:**

```dockerfile
# Stage 1: ビルドステージ（一時的、最終イメージに含まれない）
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: 実行ステージ（これが最終イメージになる）
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

```
$ docker images
REPOSITORY   TAG     IMAGE ID       SIZE
my-node-app  latest  b2c3d4e5f6a7   185 MB  # ← 1.23GB → 185MB（85%削減）
```

---

## 3. Node.js（Next.js）本番向けマルチステージDockerfile

Next.jsアプリケーションは特に最適化の恩恵が大きい。Next.jsの `output: 'standalone'` 設定と組み合わせることで劇的なサイズ削減が実現する。

### next.config.ts の設定

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',  // ← これが重要
  // standaloneモードでは必要な依存関係だけが .next/standalone/ にコピーされる
};

export default nextConfig;
```

### 最適化されたNext.js Dockerfile

```dockerfile
# ============================================================
# Stage 1: 依存関係インストール
# ============================================================
FROM node:20-alpine AS deps
# libc6-compatはAlpineでのネイティブモジュール用
RUN apk add --no-cache libc6-compat
WORKDIR /app

# パッケージファイルのみコピー（ソースコード変更時のキャッシュ効率化）
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ============================================================
# Stage 2: ビルド
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ビルド時環境変数（公開情報のみ）
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================================
# Stage 3: 本番ランナー（最終イメージ）
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# セキュリティ：非rootユーザーの作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 静的アセットのコピー
COPY --from=builder /app/public ./public

# standaloneビルド成果物のコピー（パーミッション設定付き）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**サイズ比較:**

```
シングルステージ（node:20）:       1,234 MB
マルチステージ（node:20-alpine）:    185 MB  ← 85%削減
standalone + alpine:                 ~85 MB  ← 93%削減
```

---

## 4. Go言語 — 究極の最小イメージ

Goは静的バイナリを生成できるため、マルチステージビルドとの相性が最高だ。`scratch`（空イメージ）または`distroless`と組み合わせることで、数MBのイメージが実現できる。

### scratch を使った最小イメージ

```dockerfile
# ============================================================
# Stage 1: ビルド
# ============================================================
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Go モジュールキャッシュの最大活用
COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

# 静的バイナリのビルド
# CGO_ENABLED=0: CGOを無効化して完全静的リンク
# -ldflags="-w -s": デバッグ情報とシンボルテーブルを削除
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s -extldflags '-static'" \
    -trimpath \
    -o /app/server \
    ./cmd/server

# ============================================================
# Stage 2: 最小ランナー（scratch = 空のイメージ）
# ============================================================
FROM scratch AS runner

# タイムゾーンデータ（必要な場合）
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
# CA証明書（HTTPS通信に必要）
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# 非rootユーザー設定（scratchにはuseradd がないため手動設定）
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

COPY --from=builder /app/server /server

USER nobody:nobody

EXPOSE 8080
ENTRYPOINT ["/server"]
```

### distroless を使った安全な最小イメージ

`scratch` はデバッグが困難なため、本番では`distroless`を推奨する。

```dockerfile
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o /app/server \
    ./cmd/server

# ============================================================
# distroless: シェルなし、パッケージマネージャなし、最小限のOSライブラリ
# ============================================================
FROM gcr.io/distroless/static-debian12:nonroot AS runner

COPY --from=builder /app/server /server

EXPOSE 8080
ENTRYPOINT ["/server"]
```

**Goイメージのサイズ比較:**

```
golang:1.23（シングルステージ）:  862 MB
golang:1.23-alpine + scratch:     ~8 MB  ← 99%削減
golang:1.23-alpine + distroless:  ~12 MB ← 98.6%削減
```

---

## 5. Python FastAPI のマルチステージビルド

Pythonは `uv` パッケージマネージャと組み合わせることで、さらに高速なビルドが実現できる。

```dockerfile
# ============================================================
# Stage 1: 依存関係インストール（uvを使用）
# ============================================================
FROM python:3.12-slim AS builder

# uvのインストール（高速Pythonパッケージマネージャ）
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 仮想環境の作成
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# 依存関係ファイルのコピーと仮想環境構築
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# ============================================================
# Stage 2: アプリケーションのビルド
# ============================================================
FROM python:3.12-slim AS runner

WORKDIR /app

# セキュリティ：非rootユーザー
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --no-create-home appuser

# 仮想環境のコピー（ビルドツール不要）
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# アプリケーションコードのコピー
COPY --chown=appuser:appgroup ./src ./src

USER appuser

EXPOSE 8000

CMD ["uvicorn", "src.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "4"]
```

### FastAPI + Gunicorn 本番設定

```dockerfile
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# ============================================================
# 本番イメージ
# ============================================================
FROM python:3.12-slim AS runner

# セキュリティパッチ適用
RUN apt-get update && apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY --chown=appuser:appgroup ./app ./app

USER appuser

EXPOSE 8000
CMD ["gunicorn", "app.main:app", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "-w", "4", \
     "-b", "0.0.0.0:8000"]
```

**Pythonイメージのサイズ比較:**

```
python:3.12（シングルステージ）:   1,012 MB
python:3.12-slim（マルチステージ）:  ~180 MB  ← 82%削減
```

---

## 6. BuildKit の高度な活用

Docker BuildKit（Docker 23.0以降はデフォルト有効）は、キャッシュマウント・シークレットマウントなど強力な機能を提供する。

### `--mount=type=cache` でビルドを高速化

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./

# ✅ BuildKitキャッシュマウント：npmキャッシュを永続化
# ビルドするたびにnpmキャッシュが蓄積され、2回目以降が激速になる
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

COPY . .

# Next.jsのビルドキャッシュも永続化
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build
```

**Go + goキャッシュ:**

```dockerfile
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./

# Goモジュールキャッシュの永続化
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# ビルドキャッシュの永続化
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 go build -o /app/server ./cmd/server
```

**Python + uvキャッシュ:**

```dockerfile
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./

# uvキャッシュの永続化（2回目以降のビルドが劇的に高速化）
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev
```

### `--mount=type=secret` でシークレットを安全に扱う

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./

# ❌ 危険：ARGで渡すとイメージ履歴に残る
# ARG NPM_TOKEN
# RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc

# ✅ 安全：シークレットマウントはイメージ履歴に残らない
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) && \
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm ci && \
    rm -f .npmrc  # .npmrcも確実に削除
```

**ビルド時のシークレット渡し方:**

```bash
# ファイルから渡す
docker build --secret id=npm_token,src=.npmtoken .

# 環境変数から渡す
echo "$NPM_TOKEN" | docker build --secret id=npm_token,src=- .
```

---

## 7. .dockerignore の最適化

`.dockerignore` を正しく設定しないと、ビルドコンテキストに不要なファイルが含まれ、ビルドが遅くなるだけでなく、機密ファイルがイメージに混入するリスクがある。

### 最適な .dockerignore

```
# バージョン管理
.git
.gitignore
.gitattributes

# CI/CD設定
.github
.circleci
.travis.yml

# ドキュメント
README.md
CHANGELOG.md
docs/

# テスト関連（本番イメージに不要）
**/__tests__
**/*.test.ts
**/*.spec.ts
**/*.test.js
**/*.spec.js
coverage/
.nyc_output/

# ローカル開発設定
.env
.env.local
.env.*.local
.env.development
*.pem
*.key

# IDEとエディタ
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Node.js
node_modules/
npm-debug.log*
yarn-error.log*
.npm/
.yarn/

# Next.js
.next/
out/

# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/
*.egg-info/
dist/
.pytest_cache/
.mypy_cache/

# Go
vendor/（使用している場合のみ除外を検討）

# Docker
Dockerfile
Dockerfile.*
docker-compose*.yml
.dockerignore
```

**ビルドコンテキストサイズへの影響:**

```
.dockerignore なし: ビルドコンテキスト 450 MB（node_modules含む）
.dockerignore あり: ビルドコンテキスト   2 MB  ← 99.5%削減
```

---

## 8. イメージサイズ比較（Before/After）

実際のプロジェクトでの効果を数値で示す。

### Node.js Express API

```
シングルステージ (node:20)               1,234 MB
↓ alpine ベースに変更                     420 MB  (66%削減)
↓ マルチステージ導入                      185 MB  (85%削減)
↓ devDeps 除外                           145 MB  (88%削減)
↓ .dockerignore 最適化                   143 MB  (88%削減)
```

### Next.js アプリ

```
シングルステージ (node:20)               1,456 MB
↓ マルチステージ + alpine                 320 MB  (78%削減)
↓ standalone モード有効                    98 MB  (93%削減)
↓ 非rootユーザー追加（サイズ変化なし）      98 MB
```

### Go Web API

```
シングルステージ (golang:1.23)            862 MB
↓ マルチステージ + alpine runner           45 MB  (95%削減)
↓ distroless 使用                          12 MB  (99%削減)
↓ scratch 使用                              8 MB  (99%削減)
```

### Python FastAPI

```
シングルステージ (python:3.12)           1,012 MB
↓ マルチステージ + slim                   180 MB  (82%削減)
↓ uv使用 + キャッシュ最適化               165 MB  (84%削減)
```

---

## 9. 特定ステージだけをビルド（--target）

`--target` フラグを使うと、特定のステージまでビルドを止めることができる。開発環境・テスト環境・本番環境の使い分けに非常に有効だ。

```dockerfile
# syntax=docker/dockerfile:1

# ============================================================
# Stage 1: 基本依存関係（全ステージ共通）
# ============================================================
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ============================================================
# Stage 2: 開発環境（ホットリロード対応）
# ============================================================
FROM base AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ============================================================
# Stage 3: テスト実行
# ============================================================
FROM base AS test
COPY . .
RUN npm run lint
RUN npm run type-check
CMD ["npm", "run", "test"]

# ============================================================
# Stage 4: ビルド
# ============================================================
FROM base AS builder
COPY . .
RUN npm run build

# ============================================================
# Stage 5: 本番（最終イメージ）
# ============================================================
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**ステージ別ビルドコマンド:**

```bash
# 開発環境イメージのみビルド
docker build --target development -t myapp:dev .

# テストステージまでビルドしてテスト実行
docker build --target test -t myapp:test .
docker run --rm myapp:test

# 本番イメージのビルド（デフォルト動作）
docker build --target production -t myapp:prod .
# または単に
docker build -t myapp:prod .
```

---

## 10. CI/CD（GitHub Actions）との統合

マルチステージビルドをCI/CDパイプラインに組み込む際のベストプラクティスを解説する。

```yaml
# .github/workflows/docker-build.yml
name: Docker Build & Push

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # テストステージだけビルドしてテスト実行
      - name: Run tests in Docker
        uses: docker/build-push-action@v6
        with:
          context: .
          target: test
          # GitHub Actions キャッシュを活用
          cache-from: type=gha
          cache-to: type=gha,mode=max
          load: true
          tags: myapp:test

      - name: Execute tests
        run: docker run --rm myapp:test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            type=semver,pattern={{version}}

      # 本番イメージのビルドとプッシュ（キャッシュ最大活用）
      - name: Build and push production image
        uses: docker/build-push-action@v6
        with:
          context: .
          target: production
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          # BuildKit シークレット（npm private registry等）
          secrets: |
            npm_token=${{ secrets.NPM_TOKEN }}
          platforms: linux/amd64,linux/arm64

      # セキュリティスキャン（Trivy）
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

---

## 11. Docker Compose での本番/開発環境分離

```yaml
# docker-compose.yml（ベース設定）
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    networks:
      - app-network

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres_data:
```

```yaml
# docker-compose.dev.yml（開発オーバーライド）
version: '3.9'

services:
  app:
    build:
      target: development  # ← 開発ステージを指定
    volumes:
      # ホットリロードのためのボリュームマウント
      - .:/app
      - /app/node_modules  # node_modulesは除外
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development

  db:
    ports:
      - "5432:5432"  # 開発環境ではDBポートを公開

  # 開発環境のみMailhog
  mailhog:
    image: mailhog/mailhog
    ports:
      - "8025:8025"
```

```yaml
# docker-compose.prod.yml（本番オーバーライド）
version: '3.9'

services:
  app:
    build:
      target: production  # ← 本番ステージを指定
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - app
```

**起動コマンド:**

```bash
# 開発環境起動
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# 本番環境起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 12. セキュリティ強化

### 非rootユーザーの設定

```dockerfile
# ❌ デフォルトはroot実行（危険）
FROM node:20-alpine
WORKDIR /app
COPY . .
CMD ["node", "index.js"]
# → RootでNode.jsが動くため、コンテナ侵害時の被害が最大化

# ✅ 非rootユーザーで実行
FROM node:20-alpine AS runner
WORKDIR /app

# ユーザー・グループの作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

COPY --chown=nodeuser:nodejs . .
USER nodeuser

CMD ["node", "index.js"]
```

### distrolessイメージの選択

```dockerfile
# gcr.io/distroless シリーズ

# Node.js アプリ
FROM gcr.io/distroless/nodejs20-debian12:nonroot

# 静的バイナリ（Go等）
FROM gcr.io/distroless/static-debian12:nonroot

# 動的リンクライブラリが必要なアプリ
FROM gcr.io/distroless/base-debian12:nonroot

# nonroot タグで自動的に非rootユーザーが適用される
```

### Trivyでのセキュリティスキャン

```bash
# イメージのスキャン
trivy image --severity CRITICAL,HIGH myapp:latest

# Dockerfile自体のスキャン
trivy config Dockerfile

# CI/CDでの統合（終了コードで失敗を検知）
trivy image --exit-code 1 --severity CRITICAL myapp:latest
```

**スキャン結果の例:**

```
myapp:latest (alpine 3.19.0)

Total: 0 (CRITICAL: 0, HIGH: 0)
# ← distroless + 最新alpine でゼロ脆弱性を達成
```

---

## 13. レイヤーキャッシュの最適化テクニック

Dockerのレイヤーキャッシュは、変更されたレイヤーより下位のキャッシュをすべて無効化する。この特性を理解してDockerfileを設計することが重要だ。

### キャッシュを壊さないCOPYの順序

```dockerfile
# ❌ キャッシュ効率が悪い
FROM node:20-alpine AS builder
WORKDIR /app

# ソースコードを先にコピーすると、コード変更のたびにnpm ciが再実行される
COPY . .
RUN npm ci  # ← ソースコードが変わるたびにキャッシュ無効
RUN npm run build
```

```dockerfile
# ✅ キャッシュ効率が良い
FROM node:20-alpine AS builder
WORKDIR /app

# 変更頻度の低いものを先にコピー
COPY package.json package-lock.json ./
# ← package.jsonが変わらない限りnpm ciのキャッシュが有効
RUN npm ci

# 変更頻度の高いソースコードは後でコピー
COPY . .
RUN npm run build
```

### モノレポでのキャッシュ最適化

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app

# ルートのpackage.jsonとワークスペース設定
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/

# 特定ワークスペースの依存関係のみインストール
RUN npm ci --workspace=packages/api --workspace=packages/shared

FROM deps AS builder
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api
RUN npm run build --workspace=packages/api
```

---

## 14. COPY --link フラグ（BuildKit新機能）

Docker BuildKit 1.4以降で利用可能な `COPY --link` は、レイヤーの依存関係を切り離し、並列ビルドとキャッシュ効率を大幅に向上させる。

```dockerfile
# syntax=docker/dockerfile:1.4

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

# --link を使うと、このCOPYはビルダーステージの変更に依存しない
# → キャッシュヒット率が向上、並列ビルドが可能になる
COPY --link --from=builder /app/dist /app/dist

# 複数のCOPY --link は並列実行される
COPY --link --from=builder /app/public /app/public
COPY --link --from=builder /app/node_modules /app/node_modules
```

**`--link` の効果:**

| シナリオ | COPY（通常） | COPY --link |
|---------|-------------|-------------|
| ビルド成果物のみ変更 | RUNNERステージ全キャッシュ無効 | COPYのみ再実行 |
| ベースイメージ更新 | 全レイヤー再ビルド | COPYレイヤーは再利用 |
| 複数アセットのコピー | 直列実行 | 並列実行 |

---

## 15. ベストプラクティスチェックリスト

Dockerfileをレビューする際に使用できる完全チェックリストだ。

### ビルド効率

- [ ] `package.json` などの依存関係ファイルをソースコードより先にCOPYしているか
- [ ] `--mount=type=cache` でパッケージマネージャのキャッシュを永続化しているか
- [ ] `.dockerignore` で不要ファイル（`node_modules/`, `.git/`, `coverage/` 等）を除外しているか
- [ ] `COPY --link` でレイヤーキャッシュを最適化しているか（BuildKit 1.4+）
- [ ] 変更頻度の低いレイヤーをDockerfileの上部に配置しているか

### イメージサイズ

- [ ] マルチステージビルドを使用し、ビルドツールを本番イメージから除外しているか
- [ ] `alpine` または `slim` ベースイメージを使用しているか
- [ ] Goの場合、`scratch` または `distroless` で数MB以下を目指しているか
- [ ] 不要なファイル（ドキュメント、テスト、設定ファイル）を本番イメージに含めていないか
- [ ] `RUN apt-get install` の後に `rm -rf /var/lib/apt/lists/*` を実行しているか

### セキュリティ

- [ ] 非rootユーザー（`USER` 命令）で実行しているか
- [ ] シークレット（APIキー、トークン）を `--mount=type=secret` で渡しているか（ARG/ENV禁止）
- [ ] `distroless` または最小ベースイメージでアタックサーフェスを最小化しているか
- [ ] Trivy等でCVEスキャンをCI/CDパイプラインに組み込んでいるか
- [ ] `COPY` に `--chown` でファイルオーナーを設定しているか

### CI/CD統合

- [ ] GitHub Actions等でGitHubキャッシュ（`type=gha`）を使ってキャッシュを永続化しているか
- [ ] `--target` でテストステージと本番ステージを分けてビルドしているか
- [ ] イメージにコンテンツハッシュ（git SHA）でタグを付けているか
- [ ] `docker/metadata-action` でタグとラベルを自動生成しているか
- [ ] マルチアーキテクチャ（`linux/amd64,linux/arm64`）ビルドを検討しているか

### 運用

- [ ] `HEALTHCHECK` 命令を設定しているか
- [ ] `CMD` に代わり `ENTRYPOINT` + `CMD` を使い、シグナルハンドリングを適切にしているか
- [ ] PID 1問題に対応するため `init` プロセス（`tini` 等）を使っているか
- [ ] `docker compose` で本番/開発設定を分離しているか
- [ ] イメージサイズを定期的に計測し、肥大化を検知しているか

---

## まとめ

Dockerマルチステージビルドは、単なるイメージサイズ削減の技術ではない。セキュリティ強化・CI/CD高速化・開発体験の向上をすべて同時に実現する、現代コンテナ開発の中核技術だ。

**効果の総まとめ:**

| 技術 | イメージサイズへの効果 | 副次効果 |
|------|----------------------|---------|
| マルチステージ基本 | 60〜85%削減 | devDeps除外 |
| alpine/slim採用 | さらに70%削減 | 攻撃面積縮小 |
| distroless/scratch | さらに80〜95%削減 | シェルなし最高セキュリティ |
| BuildKitキャッシュ | サイズ変化なし | ビルド50〜80%高速化 |
| .dockerignore最適化 | ビルドコンテキスト99%削減 | 初回ビルド高速化 |
| COPY --link | サイズ変化なし | キャッシュヒット率向上 |

まずは既存のDockerfileに `AS builder` / `AS runner` を追加するだけでも大きな効果が出る。そこから段階的に `alpine` ベースへの移行・BuildKitキャッシュ・セキュリティ強化と進めていこう。

本記事のDockerfileサンプルはすべてそのまま実際のプロジェクトに適用できる形で書いている。ぜひ手を動かして、あなたのイメージを最小化してみてほしい。
