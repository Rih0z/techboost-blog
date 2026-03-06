---
title: 'Docker Compose本番運用ガイド2026｜マルチコンテナ構成・ヘルスチェック・ログ管理'
description: 'Docker Composeを本番環境で使うためのベストプラクティス。マルチステージビルド、ヘルスチェック、ログ管理、セキュリティ、CI/CD連携まで実践的に解説します。'
pubDate: '2026-03-05'
tags: ['Docker', 'インフラ', 'DevOps', 'コンテナ', 'サーバー']
---

## Docker Composeは本番で使えるのか？

結論から言えば、**中小規模のサービスならDocker Composeで十分本番運用可能**です。Kubernetesは強力ですが、月間PV数百万以下のサービスにはオーバーエンジニアリングになりがちです。

### Docker Compose vs Kubernetes：判断基準

| 条件 | Docker Compose | Kubernetes |
|------|---------------|-----------|
| サーバー台数 | 1〜3台 | 3台以上 |
| サービス数 | 〜10個程度 | 10個以上 |
| オートスケール | 不要 or 手動 | 必須 |
| チーム規模 | 〜5人 | 5人以上 |
| 学習コスト | 低 | 高 |

---

## 本番用docker-compose.ymlのテンプレート

### Web + API + DB + Redis構成

```yaml
# docker-compose.prod.yml
version: '3.9'

services:
  # Nginx（リバースプロキシ）
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - static_files:/var/www/static:ro
    depends_on:
      web:
        condition: service_healthy
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # フロントエンド（Next.js）
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        - NODE_ENV=production
    environment:
      - NODE_ENV=production
      - API_URL=http://api:3001
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  # バックエンドAPI（Node.js）
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://app:${DB_PASSWORD}@db:5432/myapp
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  # PostgreSQL
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G

  # Redis（キャッシュ・セッション）
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M

volumes:
  postgres_data:
  redis_data:
  static_files:

networks:
  default:
    driver: bridge
```

---

## マルチステージビルド

### Node.jsアプリのDockerfile

```dockerfile
# Dockerfile.prod
# Stage 1: 依存関係のインストール
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: ビルド
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: 本番用イメージ
FROM node:20-alpine AS runner
WORKDIR /app

# セキュリティ: root以外のユーザーで実行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# 必要なファイルのみコピー
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER appuser

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### ビルドサイズの比較

| 方法 | イメージサイズ |
|------|-------------|
| `node:20` ベース | 〜1.1GB |
| `node:20-slim` ベース | 〜250MB |
| `node:20-alpine` ベース | 〜180MB |
| **マルチステージ + alpine** | **〜80MB** |

---

## ヘルスチェック

### アプリ側のヘルスチェックエンドポイント

```typescript
// Express.jsの例
app.get('/health', async (req, res) => {
  try {
    // DB接続確認
    await db.query('SELECT 1');
    // Redis接続確認
    await redis.ping();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

### Docker Composeのヘルスチェック設定

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
  interval: 30s      # チェック間隔
  timeout: 10s       # タイムアウト
  retries: 3         # リトライ回数
  start_period: 40s  # 起動待ち時間
```

### depends_onとヘルスチェックの連携

```yaml
services:
  api:
    depends_on:
      db:
        condition: service_healthy  # DBが健全になるまで待機
      redis:
        condition: service_healthy  # Redisが健全になるまで待機
```

---

## ログ管理

### ログドライバーの設定

```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "50m"    # ファイルサイズ上限
        max-file: "5"      # ローテーション数
        tag: "{{.Name}}"   # コンテナ名タグ
```

### 構造化ログの実装

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// 使用例
logger.info({ userId: '123', action: 'login' }, 'ユーザーがログインしました');
logger.error({ err: error, requestId: 'abc' }, 'APIエラーが発生');
```

### ログの集約（Loki + Grafana）

```yaml
# docker-compose.monitoring.yml
services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail-config.yml:/etc/promtail/config.yml:ro

  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
```

---

## セキュリティ

### .envファイルの管理

```bash
# .env.prod（本番用 - Gitに含めない）
DB_PASSWORD=strong_random_password_here
JWT_SECRET=another_strong_random_secret
REDIS_PASSWORD=redis_password

# docker-compose起動時
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### セキュリティチェックリスト

```
☐ コンテナはroot以外のユーザーで実行
☐ イメージは特定バージョンを固定（latestタグ禁止）
☐ 不要なポートは公開しない（DBのポートは外部に出さない）
☐ シークレットはenvファイルまたはDocker Secretsで管理
☐ イメージの脆弱性スキャン（Trivy）
☐ ネットワークを分離（フロント/バック/DB）
☐ read_onlyファイルシステム（可能な場合）
☐ リソース制限（memory / cpus）を設定
```

### ネットワーク分離

```yaml
services:
  nginx:
    networks:
      - frontend

  web:
    networks:
      - frontend
      - backend

  api:
    networks:
      - backend
      - database

  db:
    networks:
      - database  # DBは外部からアクセス不可

networks:
  frontend:
  backend:
  database:
```

---

## デプロイ自動化

### GitHub Actions + SSH デプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
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
            docker compose -f docker-compose.prod.yml build --no-cache
            docker compose -f docker-compose.prod.yml up -d
            docker system prune -f
```

### ゼロダウンタイムデプロイ

```bash
#!/bin/bash
# deploy.sh

# 新しいイメージをビルド
docker compose -f docker-compose.prod.yml build

# APIを1つずつ更新（ローリングアップデート）
docker compose -f docker-compose.prod.yml up -d --no-deps --build api

# ヘルスチェックを待つ
echo "Waiting for health check..."
sleep 10

# ヘルスチェック確認
if curl -sf http://localhost:3001/health > /dev/null; then
  echo "Deploy successful!"
else
  echo "Deploy failed! Rolling back..."
  docker compose -f docker-compose.prod.yml up -d --no-deps api
  exit 1
fi
```

---

## バックアップ

### PostgreSQLの自動バックアップ

```yaml
# docker-compose.prod.yml に追加
services:
  db-backup:
    image: postgres:16-alpine
    environment:
      - PGPASSWORD=${DB_PASSWORD}
    volumes:
      - ./backups:/backups
    entrypoint: >
      sh -c "while true; do
        pg_dump -h db -U app myapp | gzip > /backups/myapp_$$(date +%Y%m%d_%H%M%S).sql.gz;
        find /backups -name '*.sql.gz' -mtime +7 -delete;
        sleep 86400;
      done"
    depends_on:
      db:
        condition: service_healthy
```

---

## まとめ

Docker Compose本番運用のチェックリスト：

| カテゴリ | ポイント |
|---------|---------|
| **ビルド** | マルチステージビルドでイメージ軽量化 |
| **ヘルスチェック** | 全サービスにhealthcheckを設定 |
| **依存関係** | `depends_on` + `condition: service_healthy` |
| **ログ** | 構造化ログ + ローテーション設定 |
| **セキュリティ** | 非rootユーザー・ネットワーク分離・シークレット管理 |
| **リソース** | memory/cpus制限の設定 |
| **デプロイ** | CI/CD + ゼロダウンタイム |
| **バックアップ** | DB自動バックアップ + 世代管理 |

Docker Composeは「シンプルだけど本格的」な本番環境を構築できる強力なツールです。まずはこのガイドのテンプレートをベースに、プロジェクトに合わせてカスタマイズしてみてください。
