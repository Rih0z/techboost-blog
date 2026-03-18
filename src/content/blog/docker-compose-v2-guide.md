---
title: 'Docker Compose V2実践ガイド - マルチコンテナ環境を構築する'
description: 'Docker Compose V2の基本から、Webアプリ+DB+Redisの実践的な環境構築、開発ワークフロー、本番デプロイまで徹底解説。docker compose watchの活用方法も紹介。'
pubDate: 'Feb 05 2026'
tags: ['Docker', 'Docker Compose', 'DevOps']
---

# Docker Compose V2実践ガイド - マルチコンテナ環境を構築する

Docker Compose V2は、複数のDockerコンテナを定義・実行するためのツールです。YAML形式の設定ファイルで、Webアプリ、データベース、キャッシュなどを一括管理できます。

## Docker Compose V2の新機能

### V1（docker-compose）からV2（docker compose）への移行

| 機能 | V1 | V2 |
|------|----|----|
| コマンド | `docker-compose up` | `docker compose up` |
| 実装言語 | Python | Go |
| パフォーマンス | 遅い | 高速 |
| Dockerとの統合 | 別ツール | Docker CLIに統合 |
| GPU対応 | 限定的 | 完全サポート |
| watch機能 | なし | あり |

### V2の主な新機能

1. **docker compose watch** - ファイル変更の自動検知
2. **profiles** - 環境ごとに異なるサービスセット
3. **depends_on拡張** - ヘルスチェック待機
4. **GPUサポート** - NVIDIAなどのGPU対応

## インストール

### Docker Desktopの場合

Docker Desktop（Windows/Mac）にはDocker Compose V2が含まれています。

```bash
docker compose version
# Docker Compose version v2.24.0
```

### Linuxの場合

```bash
# Docker Composeプラグインをインストール
sudo apt-get update
sudo apt-get install docker-compose-plugin

# バージョン確認
docker compose version
```

## 基本的な使い方

### docker-compose.ymlの基本構造

```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

### 基本コマンド

```bash
# サービス起動（バックグラウンド）
docker compose up -d

# ログ確認
docker compose logs -f

# サービス一覧
docker compose ps

# サービス停止
docker compose down

# サービス停止＋ボリューム削除
docker compose down -v

# 特定サービスのみ起動
docker compose up -d web

# 再ビルド＋起動
docker compose up -d --build
```

## 実践例: Next.js + PostgreSQL + Redis

### プロジェクト構成

```
my-app/
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── src/
├── package.json
└── next.config.js
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  # Next.jsアプリ
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: package.json

  # PostgreSQL
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  # Adminer（DB管理ツール）
  adminer:
    image: adminer:latest
    ports:
      - "8080:8080"
    depends_on:
      - db
    profiles:
      - tools

volumes:
  db-data:
  redis-data:
```

### Dockerfile（Next.js）

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 依存関係インストール
COPY package.json package-lock.json ./
RUN npm ci

# ソースコードコピー
COPY . .

EXPOSE 3000

# 開発モード
CMD ["npm", "run", "dev"]
```

### .dockerignore

```
node_modules
.next
.git
.env.local
dist
build
*.log
```

### init.sql（PostgreSQL初期化スクリプト）

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, name) VALUES
  ('alice@example.com', 'Alice'),
  ('bob@example.com', 'Bob');
```

## 開発ワークフロー

### 起動とログ確認

```bash
# 全サービス起動
docker compose up -d

# ログをリアルタイム表示
docker compose logs -f app

# 特定サービスのログ
docker compose logs -f db redis
```

### ファイル変更の自動反映（watch機能）

```bash
# watchモードで起動
docker compose up --watch

# または
docker compose watch
```

`docker-compose.yml`の`develop.watch`設定により:
- `src/`内のファイル変更 → コンテナに自動同期
- `package.json`変更 → 自動再ビルド

### コンテナ内でコマンド実行

```bash
# アプリコンテナでシェル起動
docker compose exec app sh

# データベースマイグレーション
docker compose exec app npm run migrate

# PostgreSQLにログイン
docker compose exec db psql -U postgres -d mydb

# Redisにログイン
docker compose exec redis redis-cli
```

### サービスの再起動

```bash
# 特定サービスのみ再起動
docker compose restart app

# 再ビルド＋再起動
docker compose up -d --build app
```

## プロファイルの活用

開発時のみ使うツールを`profiles`で制御します。

```yaml
services:
  adminer:
    image: adminer
    ports:
      - "8080:8080"
    profiles:
      - tools

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    profiles:
      - tools
```

```bash
# プロファイル指定で起動
docker compose --profile tools up -d

# 通常起動（toolsサービスは起動しない）
docker compose up -d
```

## 環境変数の管理

### .env.localファイル

```env
# .env.local
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb
REDIS_URL=redis://localhost:6379
```

### docker-compose.yml

```yaml
services:
  app:
    env_file:
      - .env.local
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - DATABASE_URL=${DATABASE_URL}
```

### 環境別の設定ファイル

```bash
# 開発環境
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 本番環境
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

```yaml
# docker-compose.dev.yml
services:
  app:
    build:
      target: development
    volumes:
      - .:/app

# docker-compose.prod.yml
services:
  app:
    build:
      target: production
    restart: always
```

## ヘルスチェックと依存関係

### ヘルスチェックの定義

```yaml
services:
  db:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

### 依存関係の制御

```yaml
services:
  app:
    depends_on:
      db:
        condition: service_healthy  # DBがヘルシーになるまで待機
      redis:
        condition: service_started  # Redisが起動したら開始
```

## ボリュームとデータ永続化

### 名前付きボリューム

```yaml
services:
  db:
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
    driver: local
```

### バインドマウント

```yaml
services:
  app:
    volumes:
      - ./src:/app/src  # ホストのsrcをコンテナにマウント
      - /app/node_modules  # node_modulesは除外
```

### ボリューム操作

```bash
# ボリューム一覧
docker volume ls

# ボリューム削除
docker compose down -v

# 特定ボリューム削除
docker volume rm my-app_db-data
```

## トラブルシューティング

### ポート競合

```bash
# ポート使用状況確認
lsof -i :3000

# ポート番号変更
# docker-compose.yml
ports:
  - "3001:3000"
```

### コンテナが起動しない

```bash
# 詳細ログ確認
docker compose logs app

# コンテナのステータス確認
docker compose ps

# 強制再ビルド
docker compose build --no-cache app
docker compose up -d app
```

### ディスク容量不足

```bash
# 未使用コンテナ・イメージ削除
docker system prune -a

# ボリューム含めて全削除
docker system prune -a --volumes
```

## 本番環境へのデプロイ

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: production
    restart: always
    environment:
      - NODE_ENV=production
    ports:
      - "80:3000"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - db-data:/var/lib/postgresql/data

secrets:
  db_password:
    file: ./secrets/db_password.txt

volumes:
  db-data:
```

### デプロイコマンド

```bash
# 本番用設定でデプロイ
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# ログ確認
docker compose -f docker-compose.prod.yml logs -f
```

## まとめ

Docker Compose V2は以下の点で優れています:

1. **統一された環境** - 開発から本番まで一貫性
2. **高速な開発サイクル** - watch機能で自動反映
3. **簡単なマルチコンテナ管理** - 1コマンドで起動
4. **プロファイル機能** - 環境別の柔軟な構成

Webアプリ開発では、Docker Composeを使うことで、チーム全体で同じ環境を共有でき、「ローカルでは動くのに…」という問題を解決できます。
