---
title: 'Dockerマルチステージビルド: 本番イメージの最適化テクニック'
description: 'Dockerマルチステージビルドを使った本番イメージの劇的なサイズ削減とセキュリティ強化。Node.js、Go、Rust、Python、Javaの実践例から、キャッシュ最適化、セキュリティベストプラクティスまで徹底解説。2026年最新の情報を反映しています。'
pubDate: '2025-03-18'
updatedDate: '2025-03-18'
tags: ['Docker', 'DevOps', 'セキュリティ', 'パフォーマンス', 'コンテナ']
category: 'infrastructure'
---
## マルチステージビルドとは？

Dockerマルチステージビルドは、1つのDockerfileの中で複数の`FROM`命令を使用し、各ステージで異なるベースイメージを使える機能です。2017年にDocker 17.05で導入され、コンテナイメージの肥大化問題を解決する標準的な手法となっています。

### なぜマルチステージビルドが必要なのか？

**従来の問題点：**
- ビルドツール、開発依存関係、ソースコードがすべて本番イメージに含まれる
- イメージサイズが数GB規模に膨れ上がる
- セキュリティリスク（不要なツールやソースコードの混入）
- デプロイ時間の増加

**マルチステージビルドの利点：**
- イメージサイズを**70-90%削減**可能
- ビルドツールや開発依存関係を本番イメージから除外
- セキュリティ向上（攻撃対象面の縮小）
- 1つのDockerfileで完結（管理が容易）

## 基本構文とコンセプト

### シンプルな例

```dockerfile
# ステージ1: ビルドステージ
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ステージ2: 本番ステージ
FROM node:20-alpine AS production
WORKDIR /app
# ビルド成果物だけをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
CMD ["node", "dist/index.js"]
```

**削減効果:**
- シングルステージ: 約350MB
- マルチステージ: 約120MB
- **削減率: 65%**

### 命名されたステージ

```dockerfile
FROM node:20 AS dependencies
# ...

FROM node:20 AS builder
COPY --from=dependencies /app/node_modules ./node_modules
# ...

FROM node:20-alpine AS production
COPY --from=builder /app/dist ./dist
```

ステージに名前を付けることで、`--from`で明示的に参照できます。

## 言語別の実践例

### Node.js + TypeScript

```dockerfile
# ステージ1: 依存関係インストール
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    cp -R node_modules /prod_modules && \
    npm ci

# ステージ2: TypeScriptビルド
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && \
    npm prune --production

# ステージ3: 本番実行環境
FROM node:20-alpine AS runner
WORKDIR /app

# セキュリティ: 非rootユーザー作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# 必要なファイルだけコピー
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=deps --chown=nodejs:nodejs /prod_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
```

**ポイント:**
- 依存関係のインストールを2回実行（本番用とビルド用を分離）
- distilledイメージ（Alpine）でサイズ削減
- 非rootユーザーでセキュリティ強化

### Go言語：究極の最小化

Goはコンパイル言語なので、最も劇的なサイズ削減が可能です。

```dockerfile
# ステージ1: ビルド環境
FROM golang:1.22-alpine AS builder

# ビルドに必要なツール
RUN apk add --no-cache git ca-certificates

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# 静的リンク（外部依存なし）
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /app/server ./cmd/server

# ステージ2: 実行環境（scratchまたはdistroless）
FROM gcr.io/distroless/static-debian12:nonroot AS production

COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 8080
ENTRYPOINT ["/server"]
```

**選択肢:**

**Option 1: `scratch`（最小）**
```dockerfile
FROM scratch
COPY --from=builder /app/server /server
ENTRYPOINT ["/server"]
```
- サイズ: **数MB**（バイナリのみ）
- デバッグ困難（シェルなし）

**Option 2: `distroless`（推奨）**
```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot
```
- サイズ: 10-20MB
- CA証明書、タイムゾーンデータ含む
- 非rootユーザー

**Option 3: `alpine`（デバッグ用）**
```dockerfile
FROM alpine:3.19
RUN apk add --no-cache ca-certificates
```
- サイズ: 20-30MB
- シェル、パッケージマネージャーあり

**削減効果:**
- ビルドイメージ: 約800MB
- 本番イメージ（distroless）: **約15MB**
- **削減率: 98%**

### Rust：パフォーマンスとセキュリティ

```dockerfile
# ステージ1: 依存関係ビルド（キャッシュ最適化）
FROM rust:1.75-slim AS planner
WORKDIR /app
RUN cargo install cargo-chef

COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# ステージ2: 依存関係のビルド
FROM rust:1.75-slim AS cacher
WORKDIR /app
RUN cargo install cargo-chef
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

# ステージ3: アプリケーションビルド
FROM rust:1.75-slim AS builder
WORKDIR /app
COPY . .
COPY --from=cacher /app/target target
COPY --from=cacher /usr/local/cargo /usr/local/cargo
RUN cargo build --release

# ステージ4: 実行環境
FROM debian:bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/myapp /usr/local/bin/myapp
RUN useradd -ms /bin/bash appuser
USER appuser

CMD ["myapp"]
```

**cargo-chefを使う理由:**
- 依存関係のビルドをキャッシュ
- コード変更時に依存関係を再ビルドしない
- ビルド時間を大幅短縮

### Python：仮想環境の活用

```dockerfile
# ステージ1: ビルド環境
FROM python:3.12-slim AS builder

# システム依存関係
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    python3-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 仮想環境作成
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ステージ2: 実行環境
FROM python:3.12-slim AS runtime

# 最小限のシステムパッケージ
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq5 && \
    rm -rf /var/lib/apt/lists/*

# 仮想環境をコピー
COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY . .

# 非rootユーザー
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

CMD ["python", "app.py"]
```

**ポイント:**
- gccなどビルドツールは本番イメージに含めない
- 仮想環境ごとコピーして依存関係を分離
- `--no-cache-dir`でpipキャッシュを削除

### Java/Spring Boot：JREのみで実行

```dockerfile
# ステージ1: ビルド環境
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# ステージ2: 実行環境（JREのみ）
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# セキュリティ
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", \
    "app.jar"]
```

**最適化:**
- JDK（約400MB）からJRE（約150MB）に変更で大幅削減
- `-XX:+UseContainerSupport`でコンテナリソース認識
- Layered JARsで更新効率化

**Layered JARsの活用（Spring Boot 2.3+）:**
```dockerfile
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# JARを展開
COPY --from=builder /app/target/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# レイヤー別にコピー（キャッシュ効率化）
COPY --from=0 /app/dependencies/ ./
COPY --from=0 /app/spring-boot-loader/ ./
COPY --from=0 /app/snapshot-dependencies/ ./
COPY --from=0 /app/application/ ./

ENTRYPOINT ["java", "org.springframework.boot.loader.JarLauncher"]
```

## ビルドキャッシュの最適化

### 依存関係とソースコードを分離

```dockerfile
# ❌ キャッシュが効かない
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci  # ソースが変わるたびに再実行

# ✅ キャッシュを活用
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci  # package.jsonが変わらなければキャッシュ
COPY . .
```

### .dockerignoreの活用

```plaintext
# .dockerignore
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
dist
build
*.md
.vscode
.idea
coverage
.DS_Store
```

不要なファイルをコピーしないことで、ビルドコンテキストのサイズを削減しキャッシュ効率を向上させます。

### BuildKitの並列ビルド

```dockerfile
# syntax=docker/dockerfile:1.4

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build
```

**BuildKitの機能:**
- `--mount=type=cache`: ビルド間でキャッシュを共有
- 並列ステージ実行
- 差分転送による高速化

**有効化:**
```bash
export DOCKER_BUILDKIT=1
docker build -t myapp .
```

## セキュリティベストプラクティス

### 1. 非rootユーザーで実行

```dockerfile
FROM node:20-alpine
WORKDIR /app

# ユーザー作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --chown=nodejs:nodejs . .

USER nodejs
CMD ["node", "index.js"]
```

### 2. 最小限のベースイメージ

```dockerfile
# イメージサイズ比較
FROM ubuntu:22.04      # 77MB
FROM debian:12-slim    # 74MB
FROM alpine:3.19       # 7.3MB
FROM scratch           # 0MB（バイナリのみ）
FROM gcr.io/distroless/static-debian12  # 2.4MB
```

### 3. 脆弱性スキャン

```bash
# Trivyでスキャン
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image myapp:latest

# 重大な脆弱性のみ表示
trivy image --severity HIGH,CRITICAL myapp:latest
```

### 4. シークレット管理

```dockerfile
# ❌ 危険：シークレットがレイヤーに残る
FROM node:20-alpine
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm ci && \
    rm .npmrc  # 削除してもレイヤーに残る

# ✅ BuildKit Secretsを使用
# syntax=docker/dockerfile:1.4
FROM node:20-alpine
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci
```

**ビルド:**
```bash
docker build --secret id=npmrc,src=$HOME/.npmrc -t myapp .
```

### 5. ヘルスチェック

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node healthcheck.js || exit 1

CMD ["node", "index.js"]
```

## 実践的なパターン

### パターン1: フロントエンド（Next.js）

```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 必要なファイルだけコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

**next.config.js:**
```javascript
module.exports = {
  output: 'standalone', // 最小限の依存関係だけ含める
};
```

### パターン2: マイクロサービス（gRPC）

```dockerfile
# ステージ1: Protoファイルのコンパイル
FROM golang:1.22-alpine AS proto
RUN apk add --no-cache protobuf protobuf-dev
WORKDIR /proto
COPY proto/*.proto ./
RUN protoc --go_out=. --go-grpc_out=. *.proto

# ステージ2: ビルド
FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=proto /proto/*.pb.go ./proto/
RUN CGO_ENABLED=0 go build -o /app/service ./cmd/service

# ステージ3: 実行
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /app/service /service
EXPOSE 50051
ENTRYPOINT ["/service"]
```

### パターン3: データ処理（Python + ML）

```dockerfile
# ステージ1: Wheelビルド
FROM python:3.12-slim AS builder
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /wheels
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir=/wheels -r requirements.txt

# ステージ2: 実行環境
FROM python:3.12-slim
WORKDIR /app

# Wheelからインストール（コンパイル不要）
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* && \
    rm -rf /wheels

COPY . .
RUN useradd -m -u 1000 mluser && chown -R mluser:mluser /app
USER mluser

CMD ["python", "main.py"]
```

## トラブルシューティング

### ビルドが遅い

```bash
# キャッシュ状況を確認
docker history myapp:latest

# BuildKitでビルドログ詳細表示
DOCKER_BUILDKIT=1 docker build --progress=plain -t myapp .

# 並列ビルド
docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t myapp .
```

### イメージサイズが大きい

```bash
# レイヤーサイズを分析
docker image inspect myapp:latest | jq '.[0].RootFS.Layers'

# dive で詳細分析
dive myapp:latest
```

### 依存関係の問題

```dockerfile
# デバッグ用ステージを追加
FROM node:20-alpine AS production
# ...

FROM production AS debug
RUN apk add --no-cache curl vim
CMD ["sh"]
```

```bash
# デバッグイメージでビルド
docker build --target=debug -t myapp:debug .
docker run -it myapp:debug
```

## まとめ

Dockerマルチステージビルドは、本番環境のコンテナイメージを最適化する強力な手法です。

**重要ポイント:**

1. **ビルドと実行を分離** - 開発ツールを本番から除外
2. **最小限のベースイメージ** - Alpine、Distroless、Scratchを活用
3. **キャッシュ最適化** - 依存関係を先にコピー
4. **セキュリティ** - 非rootユーザー、脆弱性スキャン
5. **BuildKit活用** - キャッシュマウント、並列ビルド

**削減効果の実例:**
- Node.js: 350MB → 120MB（65%削減）
- Go: 800MB → 15MB（98%削減）
- Java: 500MB → 180MB（64%削減）
- Python: 450MB → 150MB（67%削減）

マルチステージビルドを習得することで、デプロイ速度の向上、ストレージコストの削減、セキュリティリスクの低減を実現できます。2026年のコンテナ開発において、必須のテクニックです。
