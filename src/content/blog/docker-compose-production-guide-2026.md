---
title: "Docker Compose本番環境構築ガイド2026"
description: "Docker Composeで開発・ステージング・本番の3環境を構築する実践ガイド。Web+API+DB+Redisのマルチサービス設計からヘルスチェック、ログ集約、セキュリティまで網羅します。"
pubDate: "2026-03-06"
tags: ['Docker', 'server', 'インフラ', 'DevOps']
---

Docker Composeは開発環境の構築に使うもの、という認識は過去のものだ。Docker Compose V2の登場と`docker compose`コマンドのネイティブ統合により、中小規模サービスの本番運用にも十分対応できるようになっている。

本記事では、開発環境からステージング、そして本番環境まで、Docker Composeで一貫した環境を構築する方法を実践的に解説する。

---

### 1. 前提知識と環境構成

#### 1-1. Docker Compose V2の確認

Docker Compose V2はDocker CLIにプラグインとして統合されている。従来の`docker-compose`（ハイフン付き）ではなく、`docker compose`（スペース区切り）で実行する。

```bash
## バージョン確認
docker compose version
## Docker Compose version v2.29.0 以上を推奨

## Docker Engine バージョン確認
docker --version
## Docker version 27.x 以上を推奨
```

出典: Docker公式ドキュメント「Docker Compose V2」 https://docs.docker.com/compose/

#### 1-2. 3環境の全体構成

本記事で構築する3つの環境の違いは以下の通りだ。

| 環境 | 用途 | ホスト | ポート | SSL | リソース制限 |
|------|------|-------|--------|-----|-------------|
| development | ローカル開発 | localhost | 3000/8080 | なし | なし |
| staging | 検証・QA | staging.example.com | 80/443 | あり | あり |
| production | 本番サービス | app.example.com | 80/443 | あり | あり（厳格） |

#### 1-3. サービス構成

構築するサービスは以下の4つだ。

```
+-------------------+     +-------------------+
|    Nginx (Web)    |---->|    Node.js (API)  |
|    :80 / :443     |     |    :8080          |
+-------------------+     +--------+----------+
                                   |
                          +--------v----------+
                          |   PostgreSQL (DB)  |
                          |   :5432            |
                          +-------------------+
                                   |
                          +--------v----------+
                          |    Redis (Cache)   |
                          |    :6379           |
                          +-------------------+
```

---

### 2. ディレクトリ構造

```
project/
  docker/
    nginx/
      nginx.conf
      nginx.staging.conf
      nginx.production.conf
      ssl/
    api/
      Dockerfile
      Dockerfile.production
    postgres/
      init.sql
  docker-compose.yml          # ベース（共通定義）
  docker-compose.dev.yml      # 開発環境オーバーライド
  docker-compose.staging.yml  # ステージングオーバーライド
  docker-compose.prod.yml     # 本番オーバーライド
  .env                        # 環境変数（共通）
  .env.development            # 環境変数（開発）
  .env.staging                # 環境変数（ステージング）
  .env.production             # 環境変数（本番）
  Makefile                    # 操作コマンド集
```

---

### 3. ベースのdocker-compose.yml

全環境で共通する定義をベースファイルに記述する。環境固有の設定はオーバーライドファイルで上書きする。

```yaml
## docker-compose.yml -- ベース定義（全環境共通）
name: myapp

services:
  # --- Nginx (リバースプロキシ) ---
  web:
    image: nginx:1.27-alpine
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    networks:
      - frontend
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # --- Node.js API サーバー ---
  api:
    build:
      context: .
      dockerfile: docker/api/Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      REDIS_URL: redis://redis:6379
    networks:
      - backend
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:8080/health').then(r => process.exit(r.ok ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # --- PostgreSQL データベース ---
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # --- Redis キャッシュ ---
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # 外部アクセスを遮断
```

---

### 4. 開発環境 (docker-compose.dev.yml)

開発環境ではホットリロード、デバッグ用ポートの公開、ボリュームマウントによるコード同期を行う。

```yaml
## docker-compose.dev.yml -- 開発環境オーバーライド
services:
  web:
    ports:
      - "3000:80"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro

  api:
    build:
      dockerfile: docker/api/Dockerfile
      target: development
    ports:
      - "8080:8080"
      - "9229:9229"  # Node.jsデバッグポート
    volumes:
      - ./src:/app/src:cached
      - ./package.json:/app/package.json:ro
      - ./tsconfig.json:/app/tsconfig.json:ro
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
    command: npx tsx watch --inspect=0.0.0.0:9229 src/server.ts

  db:
    ports:
      - "5432:5432"  # ローカルからの直接接続用

  redis:
    ports:
      - "6379:6379"  # ローカルからの直接接続用
```

---

### 5. ステージング環境 (docker-compose.staging.yml)

ステージング環境は本番に近い構成だが、リソース制限を緩めに設定する。

```yaml
## docker-compose.staging.yml -- ステージング環境オーバーライド
services:
  web:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.staging.conf:/etc/nginx/conf.d/default.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M

  api:
    build:
      dockerfile: docker/api/Dockerfile.production
    environment:
      NODE_ENV: staging
      LOG_LEVEL: info
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
      replicas: 1

  db:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 1G
    # ステージングではポートを公開しない

  redis:
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
```

---

### 6. 本番環境 (docker-compose.prod.yml)

本番環境では、セキュリティ強化、リソース制限の厳格化、ログ集約の設定を行う。

```yaml
## docker-compose.prod.yml -- 本番環境オーバーライド
services:
  web:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.production.conf:/etc/nginx/conf.d/default.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
      replicas: 1
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
        tag: "{{.Name}}"

  api:
    build:
      dockerfile: docker/api/Dockerfile.production
    environment:
      NODE_ENV: production
      LOG_LEVEL: warn
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 256M
      replicas: 2
      update_config:
        parallelism: 1
        delay: 30s
        order: start-first
      rollback_config:
        parallelism: 1
        delay: 10s
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "10"
        tag: "{{.Name}}"

  db:
    environment:
      POSTGRES_INITDB_ARGS: "--auth-host=scram-sha-256"
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          cpus: "0.5"
          memory: 512M
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

  redis:
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --appendfsync everysec
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 768M
        reservations:
          cpus: "0.25"
          memory: 256M
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "3"
```

---

### 7. Dockerfile（マルチステージビルド）

#### 7-1. 開発用Dockerfile

```dockerfile
## docker/api/Dockerfile
## マルチステージビルド

## ---- ベースステージ ----
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache tini
COPY package.json package-lock.json ./
RUN npm ci

## ---- 開発ステージ ----
FROM base AS development
RUN npm install -g tsx
COPY tsconfig.json ./
## ソースコードはボリュームマウントで提供
EXPOSE 8080 9229
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "watch", "src/server.ts"]

## ---- ビルドステージ ----
FROM base AS build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

## ---- 本番ステージ ----
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache tini curl
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER nodejs
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
```

#### 7-2. 本番用Dockerfile

```dockerfile
## docker/api/Dockerfile.production
## 本番環境に最適化されたビルド

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src/ ./src/
RUN npm run build
RUN npm prune --production

FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache tini curl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package.json ./

USER nodejs

ENV NODE_ENV=production
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
```

出典: Docker公式「Dockerfileのベストプラクティス」 https://docs.docker.com/develop/develop-images/dockerfile_best-practices/

---

### 8. Nginx設定

#### 8-1. 開発用

```nginx
## docker/nginx/nginx.conf -- 開発環境
upstream api {
    server api:8080;
}

server {
    listen 80;
    server_name localhost;

    # ヘルスチェックエンドポイント
    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }

    # APIプロキシ
    location /api/ {
        proxy_pass http://api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静的ファイル
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

#### 8-2. 本番用

```nginx
## docker/nginx/nginx.production.conf -- 本番環境
upstream api {
    server api:8080;
    keepalive 32;
}

## HTTPをHTTPSにリダイレクト
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    # SSL設定
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ヘルスチェック
    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }

    # APIプロキシ
    location /api/ {
        proxy_pass http://api/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # タイムアウト設定
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # レート制限
        limit_req zone=api burst=20 nodelay;
    }

    # 静的ファイル（キャッシュ付き）
    location /static/ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # デフォルト
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        expires 1h;
    }

    # アクセスログ・エラーログ
    access_log /var/log/nginx/access.log combined buffer=512k flush=1m;
    error_log /var/log/nginx/error.log warn;

    # レート制限ゾーン（httpコンテキストで定義）
    # limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

出典: Mozilla「SSL Configuration Generator」 https://ssl-config.mozilla.org/

---

### 9. 環境変数ファイル

環境ごとの変数を`.env`ファイルで管理する。

#### 9-1. 共通 (.env)

```bash
## .env -- 全環境共通の変数
COMPOSE_PROJECT_NAME=myapp
DB_NAME=myapp
```

#### 9-2. 開発用 (.env.development)

```bash
## .env.development
NODE_ENV=development
DB_USER=devuser
DB_PASSWORD=devpassword123
REDIS_PASSWORD=devredis123
LOG_LEVEL=debug
```

#### 9-3. 本番用 (.env.production)

```bash
## .env.production
## 注意: 本番の機密情報はDocker Secretsを使うことを推奨
NODE_ENV=production
DB_USER=produser
DB_PASSWORD=${PROD_DB_PASSWORD}  # CI/CDパイプラインから注入
REDIS_PASSWORD=${PROD_REDIS_PASSWORD}
LOG_LEVEL=warn
```

**重要**: `.env.production` をGitリポジトリにコミットしてはならない。`.gitignore` に追加し、CI/CDパイプラインの環境変数またはDocker Secretsで管理する。

---

### 10. Makefile（操作コマンド集）

各環境の操作を簡潔に実行するためのMakefileを用意する。

```makefile
## Makefile -- Docker Compose操作コマンド集
.PHONY: help dev staging prod down logs clean build test

## デフォルトターゲット
help: ## ヘルプを表示
	@echo "利用可能なコマンド:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

## ===== 開発環境 =====
dev: ## 開発環境を起動
	docker compose -f docker-compose.yml -f docker-compose.dev.yml \
		--env-file .env --env-file .env.development up -d
	@echo "開発環境が起動しました: http://localhost:3000"

dev-build: ## 開発環境をビルドして起動
	docker compose -f docker-compose.yml -f docker-compose.dev.yml \
		--env-file .env --env-file .env.development up -d --build

dev-logs: ## 開発環境のログを表示
	docker compose -f docker-compose.yml -f docker-compose.dev.yml \
		--env-file .env --env-file .env.development logs -f

## ===== ステージング環境 =====
staging: ## ステージング環境を起動
	docker compose -f docker-compose.yml -f docker-compose.staging.yml \
		--env-file .env --env-file .env.staging up -d
	@echo "ステージング環境が起動しました"

staging-build: ## ステージング環境をビルドして起動
	docker compose -f docker-compose.yml -f docker-compose.staging.yml \
		--env-file .env --env-file .env.staging up -d --build

## ===== 本番環境 =====
prod: ## 本番環境を起動
	docker compose -f docker-compose.yml -f docker-compose.prod.yml \
		--env-file .env --env-file .env.production up -d
	@echo "本番環境が起動しました"

prod-build: ## 本番環境をビルドして起動
	docker compose -f docker-compose.yml -f docker-compose.prod.yml \
		--env-file .env --env-file .env.production up -d --build

prod-deploy: ## 本番環境のゼロダウンタイムデプロイ
	docker compose -f docker-compose.yml -f docker-compose.prod.yml \
		--env-file .env --env-file .env.production build api
	docker compose -f docker-compose.yml -f docker-compose.prod.yml \
		--env-file .env --env-file .env.production up -d --no-deps api
	@echo "APIサービスをローリングアップデートしました"

prod-rollback: ## 本番環境を前のバージョンにロールバック
	docker compose -f docker-compose.yml -f docker-compose.prod.yml \
		--env-file .env --env-file .env.production down api
	docker compose -f docker-compose.yml -f docker-compose.prod.yml \
		--env-file .env --env-file .env.production up -d api
	@echo "ロールバックが完了しました"

## ===== 共通操作 =====
down: ## 全サービスを停止
	docker compose down

down-volumes: ## 全サービスを停止しボリュームも削除
	docker compose down -v

logs: ## 全サービスのログを表示
	docker compose logs -f

logs-api: ## APIサービスのログを表示
	docker compose logs -f api

logs-db: ## DBサービスのログを表示
	docker compose logs -f db

status: ## 全サービスのステータスを表示
	docker compose ps -a

health: ## ヘルスチェック結果を表示
	@echo "=== サービスヘルスチェック ==="
	@docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

## ===== メンテナンス =====
clean: ## 未使用のイメージ・コンテナ・ボリュームを削除
	docker system prune -f
	docker volume prune -f
	@echo "クリーンアップが完了しました"

build: ## 全サービスのイメージをビルド
	docker compose build --no-cache

## ===== データベース =====
db-shell: ## PostgreSQLのシェルに接続
	docker compose exec db psql -U $${DB_USER:-devuser} -d $${DB_NAME:-myapp}

db-backup: ## データベースのバックアップを取得
	@mkdir -p backups
	docker compose exec db pg_dump -U $${DB_USER:-devuser} $${DB_NAME:-myapp} \
		| gzip > backups/db-backup-$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "バックアップが完了しました"

db-restore: ## データベースをバックアップから復元（BACKUP_FILE変数で指定）
	@test -n "$(BACKUP_FILE)" || (echo "BACKUP_FILE を指定してください" && exit 1)
	gunzip -c $(BACKUP_FILE) | docker compose exec -T db psql -U $${DB_USER:-devuser} -d $${DB_NAME:-myapp}
	@echo "リストアが完了しました"

## ===== Redis =====
redis-shell: ## Redis CLIに接続
	docker compose exec redis redis-cli -a $${REDIS_PASSWORD:-devredis123}

redis-flush: ## Redisのキャッシュをクリア
	docker compose exec redis redis-cli -a $${REDIS_PASSWORD:-devredis123} FLUSHALL
	@echo "Redisキャッシュをクリアしました"

## ===== テスト =====
test: ## テストを実行
	docker compose -f docker-compose.yml -f docker-compose.dev.yml \
		--env-file .env --env-file .env.development \
		run --rm api npm test

test-integration: ## 統合テストを実行
	docker compose -f docker-compose.yml -f docker-compose.dev.yml \
		--env-file .env --env-file .env.development \
		run --rm api npm run test:integration
```

---

### 11. ヘルスチェックの設計

ヘルスチェックはコンテナの健全性を監視するための仕組みだ。Docker Composeの`healthcheck`ディレクティブと、アプリケーション側のヘルスチェックエンドポイントの両方を実装する。

#### 11-1. APIサーバーのヘルスチェックエンドポイント

```typescript
// src/health.ts
import type { Request, Response } from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    memory: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'up' | 'down';
  responseTime: number;
  details?: Record<string, unknown>;
}

async function checkDatabase(pool: Pool): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const result = await pool.query('SELECT 1 as health');
    return {
      status: result.rows[0]?.health === 1 ? 'up' : 'down',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      details: { error: (error as Error).message },
    };
  }
}

async function checkRedis(
  client: ReturnType<typeof createClient>
): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const pong = await client.ping();
    return {
      status: pong === 'PONG' ? 'up' : 'down',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      details: { error: (error as Error).message },
    };
  }
}

function checkMemory(): ComponentHealth {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);

  return {
    status: usagePercent < 90 ? 'up' : 'down',
    responseTime: 0,
    details: {
      heapUsedMB,
      heapTotalMB,
      usagePercent,
      rssMB: Math.round(usage.rss / 1024 / 1024),
    },
  };
}

export function createHealthHandler(pool: Pool, redisClient: ReturnType<typeof createClient>) {
  const startTime = Date.now();

  return async (_req: Request, res: Response): Promise<void> => {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabase(pool),
      checkRedis(redisClient),
    ]);
    const memoryHealth = checkMemory();

    const allUp = dbHealth.status === 'up'
      && redisHealth.status === 'up'
      && memoryHealth.status === 'up';

    const anyDown = dbHealth.status === 'down'
      || redisHealth.status === 'down'
      || memoryHealth.status === 'down';

    const healthStatus: HealthStatus = {
      status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - startTime) / 1000),
      version: process.env.APP_VERSION || '1.0.0',
      checks: {
        database: dbHealth,
        redis: redisHealth,
        memory: memoryHealth,
      },
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  };
}
```

#### 11-2. ヘルスチェックのレスポンス例

```json
{
  "status": "healthy",
  "timestamp": "2026-03-06T10:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 3
    },
    "redis": {
      "status": "up",
      "responseTime": 1
    },
    "memory": {
      "status": "up",
      "responseTime": 0,
      "details": {
        "heapUsedMB": 45,
        "heapTotalMB": 128,
        "usagePercent": 35,
        "rssMB": 80
      }
    }
  }
}
```

---

### 12. ログ集約

#### 12-1. 構造化ログの実装

本番環境ではJSON形式の構造化ログを出力し、ログ集約ツールで分析できるようにする。

```typescript
// src/logger.ts
import { createWriteStream } from 'fs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  traceId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private service: string;
  private minLevel: number;

  constructor(service: string, level: LogLevel = 'info') {
    this.service = service;
    this.minLevel = LOG_LEVELS[level];
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      ...metadata,
    };

    const output = JSON.stringify(entry);

    if (level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log('error', message, metadata);
  }
}

export const logger = new Logger(
  process.env.SERVICE_NAME || 'api',
  (process.env.LOG_LEVEL as LogLevel) || 'info'
);
```

#### 12-2. ログの収集と閲覧

Docker Composeでは`json-file`ログドライバーがデフォルトだ。ログの確認は以下のコマンドで行う。

```bash
## 全サービスのログ（最新100行）
docker compose logs --tail 100

## 特定サービスのログ（リアルタイム）
docker compose logs -f api

## 特定時間帯のログ
docker compose logs --since 2026-03-06T10:00:00 api

## ログをファイルに出力
docker compose logs api > /tmp/api-logs.txt

## ログのサイズ確認
docker compose ps -q | xargs docker inspect --format='{{.Name}} {{.LogPath}}' | \
  while read name path; do echo "$name: $(du -sh $path 2>/dev/null)"; done
```

---

### 13. セキュリティ対策

#### 13-1. Docker Secrets（機密情報管理）

```yaml
## docker-compose.prod.yml に追加
services:
  api:
    secrets:
      - db_password
      - redis_password
      - jwt_secret
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      REDIS_PASSWORD_FILE: /run/secrets/redis_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret

  db:
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
  redis_password:
    file: ./secrets/redis_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

```typescript
// src/config.ts -- Secrets読み込み
import { readFileSync, existsSync } from 'fs';

function readSecret(envKey: string, fileEnvKey: string, fallback: string): string {
  // Docker Secretsファイルから読み込み
  const filePath = process.env[fileEnvKey];
  if (filePath && existsSync(filePath)) {
    return readFileSync(filePath, 'utf-8').trim();
  }
  // 環境変数から読み込み
  return process.env[envKey] || fallback;
}

export const config = {
  db: {
    password: readSecret('DB_PASSWORD', 'DB_PASSWORD_FILE', ''),
  },
  redis: {
    password: readSecret('REDIS_PASSWORD', 'REDIS_PASSWORD_FILE', ''),
  },
  jwt: {
    secret: readSecret('JWT_SECRET', 'JWT_SECRET_FILE', ''),
  },
};
```

#### 13-2. コンテナセキュリティのベストプラクティス

```yaml
## セキュリティ強化の設定例
services:
  api:
    # rootユーザーでの実行を禁止
    user: "1001:1001"
    # ファイルシステムを読み取り専用に
    read_only: true
    # 書き込みが必要なディレクトリのみtmpfsでマウント
    tmpfs:
      - /tmp:size=100M
    # 新しい特権の取得を禁止
    security_opt:
      - no-new-privileges:true
    # Linux Capabilitiesの制限
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    # PID制限（フォーク爆弾対策）
    pids_limit: 100
```

出典: Docker公式「Dockerセキュリティ」 https://docs.docker.com/engine/security/

---

### 14. バックアップ戦略

#### 14-1. PostgreSQLの自動バックアップ

```bash
#!/bin/bash
## scripts/backup-db.sh -- データベース自動バックアップスクリプト

set -euo pipefail

BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/myapp_${TIMESTAMP}.sql.gz"

## バックアップディレクトリの作成
mkdir -p "${BACKUP_DIR}"

## Docker Compose経由でダンプを取得
docker compose exec -T db pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=custom \
  --compress=9 \
  > "${BACKUP_FILE}"

## バックアップサイズの確認
BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[$(date)] バックアップ完了: ${BACKUP_FILE} (${BACKUP_SIZE})"

## 古いバックアップの削除
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] ${RETENTION_DAYS}日以上前のバックアップを削除しました"
```

#### 14-2. バックアップのcron設定

```bash
## crontab -e で追加
## 毎日AM3:00にバックアップを実行
0 3 * * * cd /path/to/project && bash scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

---

### 15. 監視とアラート

#### 15-1. コンテナ監視スクリプト

```bash
#!/bin/bash
## scripts/monitor.sh -- Docker Composeサービスの監視スクリプト

set -euo pipefail

WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

check_service() {
  local service=$1
  local status
  status=$(docker compose -f "${PROJECT_DIR}/docker-compose.yml" \
    -f "${PROJECT_DIR}/docker-compose.prod.yml" \
    ps --format json "$service" 2>/dev/null | jq -r '.Health // .State')

  if [ "$status" != "healthy" ] && [ "$status" != "running" ]; then
    echo "[ALERT] ${service} is ${status}"
    if [ -n "$WEBHOOK_URL" ]; then
      curl -s -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"[ALERT] ${service} is ${status} at $(date)\"}"
    fi
    return 1
  fi
  echo "[OK] ${service}: ${status}"
  return 0
}

echo "=== Docker Compose ヘルスチェック $(date) ==="
ERRORS=0
for service in web api db redis; do
  check_service "$service" || ERRORS=$((ERRORS + 1))
done

if [ $ERRORS -gt 0 ]; then
  echo "[SUMMARY] ${ERRORS} サービスに問題があります"
  exit 1
fi
echo "[SUMMARY] 全サービス正常"
```

---

### 16. CI/CDパイプラインとの統合

#### 16-1. GitHub Actionsでの自動デプロイ

```yaml
## .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

env:
  DOCKER_BUILDKIT: 1
  COMPOSE_DOCKER_CLI_BUILD: 1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: |
          cp .env.development .env.test
          docker compose -f docker-compose.yml -f docker-compose.dev.yml \
            --env-file .env --env-file .env.test \
            run --rm api npm test

      - name: Run integration tests
        run: |
          docker compose -f docker-compose.yml -f docker-compose.dev.yml \
            --env-file .env --env-file .env.test \
            up -d
          sleep 10
          curl -f http://localhost:3000/health
          docker compose down

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/myapp
            git pull origin main
            make prod-deploy
            sleep 10
            curl -f http://localhost/health || make prod-rollback
```

出典: GitHub Actions公式ドキュメント https://docs.github.com/ja/actions

---

### まとめ

本記事では、Docker Composeを使って開発・ステージング・本番の3環境を一貫した構成で構築する方法を解説した。主要なポイントを振り返る。

1. **ベース + オーバーライド構成**: `docker-compose.yml` に共通定義、環境固有設定はオーバーライドファイルで管理
2. **マルチステージビルド**: Dockerfileで開発用と本番用のイメージを効率的にビルド
3. **ヘルスチェック**: Docker側とアプリケーション側の両方でヘルスチェックを実装
4. **セキュリティ**: Docker Secrets、read_only、cap_drop、non-rootユーザーで防御
5. **ログ集約**: 構造化ログ（JSON）で運用時の問題切り分けを効率化
6. **Makefile**: 環境操作をコマンド1つで実行できるように標準化
7. **CI/CD統合**: GitHub Actionsでテスト・デプロイを自動化

Docker Composeは「開発環境専用」ではない。適切に設計すれば、中小規模サービスの本番運用に十分耐えうるインフラ基盤となる。

---

**参考文献**

- Docker公式ドキュメント「Compose file reference」 https://docs.docker.com/compose/compose-file/
- Docker公式「Dockerfileのベストプラクティス」 https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- Docker公式「Dockerセキュリティ」 https://docs.docker.com/engine/security/
- Mozilla「SSL Configuration Generator」 https://ssl-config.mozilla.org/
- GitHub Actions公式ドキュメント https://docs.github.com/ja/actions
- PostgreSQL 17 Documentation https://www.postgresql.org/docs/17/
- Redis 7 Documentation https://redis.io/docs/
