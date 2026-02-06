---
title: "Docker Compose本番運用ガイド — マルチサービス構成のベストプラクティス"
description: "Docker Composeを使った本番環境でのマルチサービス構成の完全ガイド。セキュリティ、パフォーマンス、監視、CI/CD統合まで実践的なベストプラクティスを徹底解説します。"
pubDate: "2026-02-06"
tags: ["Docker", "Docker Compose", "DevOps", "インフラ", "本番運用"]
---

Docker Composeは、開発環境だけでなく、本番環境でのマルチサービス構成にも活用できます。この記事では、Docker Composeを使った本番環境の構築から、セキュリティ、パフォーマンス最適化、監視、CI/CD統合まで、実践的なベストプラクティスを徹底的に解説します。

## Docker Compose本番運用の概要

Docker Composeは、複数のコンテナを定義・管理するためのツールです。本番環境での使用には以下の利点があります。

- **インフラのコード化** - YAML形式で環境を定義
- **再現性** - 環境の一貫性を保証
- **スケーラビリティ** - サービスの簡単なスケール
- **依存関係管理** - サービス間の起動順序を制御
- **ネットワーク分離** - セキュアなサービス間通信

## 基本的な構成例

### フルスタックアプリケーション

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Next.jsアプリケーション
  web:
    build:
      context: ./web
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # PostgreSQLデータベース
  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redisキャッシュ
  cache:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Nginx リバースプロキシ
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - web
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## 本番用Dockerfile

### マルチステージビルド

```dockerfile
# web/Dockerfile.prod
# Stage 1: 依存関係のインストール
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: ビルド
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: 本番実行
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### APIサーバー（Express）

```dockerfile
# api/Dockerfile.prod
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

USER apiuser

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

## 環境変数管理

### .envファイルの使用

```env
# .env.production
NODE_ENV=production

# データベース
POSTGRES_USER=myapp_user
POSTGRES_PASSWORD=super_secret_password
POSTGRES_DB=myapp_prod

# Redis
REDIS_PASSWORD=redis_secret

# アプリケーション
DATABASE_URL=postgresql://myapp_user:super_secret_password@db:5432/myapp_prod
REDIS_URL=redis://:redis_secret@cache:6379

# セキュリティ
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key

# 外部API
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=SG...
```

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  web:
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
    # その他の設定...

  db:
    env_file:
      - .env.production
    # その他の設定...
```

### シークレット管理（Docker Swarm）

```yaml
version: '3.8'

services:
  web:
    secrets:
      - db_password
      - jwt_secret
    environment:
      - DATABASE_PASSWORD_FILE=/run/secrets/db_password
      - JWT_SECRET_FILE=/run/secrets/jwt_secret

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
```

## Nginxリバースプロキシ設定

### 基本設定

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream web {
        server web:3000;
    }

    # レート制限
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # ログ形式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # gzip圧縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

    server {
        listen 80;
        server_name example.com www.example.com;

        # HTTPSへリダイレクト
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name example.com www.example.com;

        # SSL証明書
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # SSL設定
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # セキュリティヘッダー
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # 静的ファイルのキャッシュ
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
            proxy_pass http://web;
            proxy_cache_valid 200 30d;
            add_header Cache-Control "public, immutable";
        }

        # APIエンドポイント
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            limit_conn addr 10;

            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # その他のリクエスト
        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

## データ永続化とバックアップ

### ボリューム戦略

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    volumes:
      # 名前付きボリューム（推奨）
      - postgres_data:/var/lib/postgresql/data
      # バックアップ用バインドマウント
      - ./backups:/backups
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password

volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      device: /data/postgres
      o: bind
```

### バックアップスクリプト

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# PostgreSQLバックアップ
docker compose exec -T db pg_dump -U user myapp > "$BACKUP_DIR/db_$DATE.sql"

# 圧縮
gzip "$BACKUP_DIR/db_$DATE.sql"

# 古いバックアップを削除（7日以上前）
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: db_$DATE.sql.gz"
```

### 自動バックアップ（cron）

```yaml
# docker-compose.yml
services:
  backup:
    image: alpine:latest
    volumes:
      - ./backup.sh:/backup.sh
      - ./backups:/backups
      - /var/run/docker.sock:/var/run/docker.sock
    command: sh -c "apk add --no-cache docker-cli && crond -f"
    restart: unless-stopped
```

```cron
# crontab
0 2 * * * /backup.sh
```

## 監視とログ管理

### Prometheusとグラフana

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    command:
      - '--path.rootfs=/host'
    volumes:
      - '/:/host:ro,rslave'
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

### Prometheus設定

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'web'
    static_configs:
      - targets: ['web:3000']
    metrics_path: '/api/metrics'
```

### ログ集約（Loki + Promtail）

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki/loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./promtail/promtail-config.yml:/etc/promtail/config.yml
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped

volumes:
  loki_data:
```

## スケーリングとロードバランシング

### 水平スケーリング

```yaml
version: '3.8'

services:
  web:
    build: ./web
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    environment:
      - NODE_ENV=production

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx-lb.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
    depends_on:
      - web
```

### Nginxロードバランサー設定

```nginx
# nginx/nginx-lb.conf
http {
    upstream web_cluster {
        least_conn;
        server web_1:3000 weight=3;
        server web_2:3000 weight=3;
        server web_3:3000 weight=3;
    }

    server {
        listen 80;

        location / {
            proxy_pass http://web_cluster;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## セキュリティベストプラクティス

### ネットワーク分離

```yaml
version: '3.8'

services:
  web:
    networks:
      - frontend
      - backend

  db:
    networks:
      - backend

  cache:
    networks:
      - backend

  nginx:
    networks:
      - frontend
    ports:
      - "80:80"
      - "443:443"

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # 外部アクセス不可
```

### リソース制限

```yaml
version: '3.8'

services:
  web:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  db:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

### セキュリティスキャン

```bash
# Trivyでイメージスキャン
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image myapp:latest
```

## CI/CD統合

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./web
          file: ./web/Dockerfile.prod
          push: true
          tags: myapp/web:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app
            docker compose pull
            docker compose up -d
            docker system prune -f
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA ./web
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | ssh-add -
  script:
    - ssh $SERVER_USER@$SERVER_HOST "
        cd /app &&
        docker compose pull &&
        docker compose up -d &&
        docker system prune -f"
  only:
    - main
```

## ゼロダウンタイムデプロイ

### ローリングアップデート

```yaml
version: '3.8'

services:
  web:
    image: myapp/web:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      rollback_config:
        parallelism: 1
        delay: 5s
```

### ヘルスチェック

```yaml
services:
  web:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## トラブルシューティング

### ログ確認

```bash
# 全サービスのログ
docker compose logs -f

# 特定サービスのログ
docker compose logs -f web

# 最新100行のみ
docker compose logs --tail=100 web
```

### コンテナの再起動

```bash
# 特定サービスの再起動
docker compose restart web

# 全サービスの再起動
docker compose restart
```

### リソース使用状況

```bash
# コンテナのリソース使用状況
docker stats

# ディスク使用量
docker system df
```

## まとめ

Docker Composeを使った本番環境の運用には、適切な設定とベストプラクティスの実践が重要です。

**重要なポイント:**
- マルチステージビルドで最適化
- 環境変数とシークレットの適切な管理
- Nginxでのリバースプロキシとロードバランシング
- データの永続化とバックアップ
- 監視とログ管理の実装
- セキュリティとネットワーク分離
- CI/CDとの統合

これらのベストプラクティスを実践することで、スケーラブルで安全な本番環境を構築できます。
