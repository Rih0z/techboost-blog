---
title: 'Docker Compose 実践ガイド — 開発環境を5分で構築する方法'
description: 'Docker Composeで開発環境を爆速構築。docker-compose.yml書き方の基本から、Node.js+PostgreSQL、Python+Redisなど実用的な組み合わせまで実例付きで解説。Dockerの基礎から実践的な活用法までカバー。'
pubDate: 'Feb 05 2026'
tags: ['Docker', 'インフラ', '開発ツール']
---
## Docker Composeとは？複数コンテナを一括管理

Docker Composeは、複数のDockerコンテナを定義・実行するためのツールです。YAML形式の設定ファイル（docker-compose.yml）に記述するだけで、Webアプリ + データベース + キャッシュサーバーなど複雑な環境を一発で構築できます。

### Docker Composeのメリット

1. **環境構築が爆速**: `docker compose up` 一発で全コンテナ起動
2. **チーム全員が同じ環境**: "俺の環境では動く"問題を撲滅
3. **本番環境に近い構成**: PostgreSQL、Redis等を本番と同じバージョンで
4. **クリーンな環境**: `docker compose down` で完全削除、再構築も容易
5. **ポータビリティ**: Mac/Windows/Linux どこでも同じ

### Docker vs Docker Compose

```bash
# Docker単体（コンテナ1つずつ起動）
docker run -d --name db postgres:16
docker run -d --name app -p 3000:3000 --link db myapp

# Docker Compose（一括起動）
docker compose up -d
```

圧倒的にDocker Composeが楽。

## 環境準備 — Docker Desktopインストール

### インストール

**Mac**:
```bash
brew install --cask docker
```

**Windows**:
Docker Desktop公式サイトからインストーラーダウンロード。

**Linux (Ubuntu)**:
```bash
# Docker Engine インストール
sudo apt update
sudo apt install docker.io docker-compose-v2 -y
sudo systemctl enable --now docker
sudo usermod -aG docker $USER  # 再ログイン要
```

### 動作確認

```bash
docker --version
# Docker version 24.0.7

docker compose version
# Docker Compose version v2.23.0
```

## docker-compose.yml の基本構造

```yaml
version: '3.8'  # Docker Compose仕様バージョン

services:       # 各コンテナの定義
  app:          # サービス名（任意）
    image: node:20-alpine
    ports:
      - "3000:3000"
    volumes:
      - .:/app
    environment:
      - NODE_ENV=development

  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=secret

volumes:        # 永続化ボリューム定義
  db_data:

networks:       # ネットワーク定義（省略可）
  app_network:
```

### 重要なキーワード

- **services**: コンテナ群の定義
- **image**: 使用するDockerイメージ
- **build**: Dockerfileからビルド
- **ports**: ホスト:コンテナ のポートマッピング
- **volumes**: ホストとコンテナ間のファイル共有
- **environment**: 環境変数
- **depends_on**: 起動順序制御

## 実践例1: Node.js + PostgreSQL 開発環境

### プロジェクト構成

```
my-app/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── src/
│   └── index.js
└── .env
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules  # node_modulesはコンテナ内に保持
    environment:
      - DATABASE_URL=postgresql://postgres:secret@db:5432/myapp
      - NODE_ENV=development
    depends_on:
      - db
    command: npm run dev

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data

  adminer:  # DB管理ツール（オプション）
    image: adminer
    ports:
      - "8080:8080"

volumes:
  postgres_data:
```

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### package.json

```json
{
  "name": "my-app",
  "scripts": {
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### src/index.js

```javascript
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.get('/', async (req, res) => {
  const result = await pool.query('SELECT NOW()');
  res.json({ time: result.rows[0].now });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### 起動

```bash
# 初回起動（ビルド + 起動）
docker compose up --build

# バックグラウンド起動
docker compose up -d

# ログ確認
docker compose logs -f app

# 停止
docker compose down

# データも含めて完全削除
docker compose down -v
```

**アクセス**:
- アプリ: http://localhost:3000
- DB管理画面: http://localhost:8080 (adminer)

## 実践例2: Python + Redis + Celery 構成

非同期タスクキューを構築。

### docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: .
    command: python app.py
    ports:
      - "5000:5000"
    volumes:
      - .:/app
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

  worker:
    build: .
    command: celery -A tasks worker --loglevel=info
    volumes:
      - .:/app
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  flower:  # Celery監視ツール
    build: .
    command: celery -A tasks flower
    ports:
      - "5555:5555"
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
```

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "app.py"]
```

### requirements.txt

```
flask==3.0.0
celery==5.3.4
redis==5.0.1
flower==2.0.1
```

### app.py

```python
from flask import Flask, jsonify
from tasks import long_task

app = Flask(__name__)

@app.route('/task')
def create_task():
    task = long_task.delay(10)
    return jsonify({'task_id': task.id}), 202

@app.route('/status/<task_id>')
def task_status(task_id):
    from celery.result import AsyncResult
    task = AsyncResult(task_id)
    return jsonify({'status': task.state})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### tasks.py

```python
from celery import Celery
import time
import os

app = Celery('tasks', broker=os.getenv('REDIS_URL'))

@app.task
def long_task(duration):
    time.sleep(duration)
    return f'Task completed after {duration} seconds'
```

### 起動 & 確認

```bash
docker compose up -d

# タスク実行
curl http://localhost:5000/task
# {"task_id":"abc-123"}

# ステータス確認
curl http://localhost:5000/status/abc-123
# {"status":"SUCCESS"}

# Flower（Celery監視画面）
# http://localhost:5555
```

## 実践例3: Next.js + PostgreSQL + Redis

フルスタックWebアプリ構成。

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    environment:
      - DATABASE_URL=postgresql://postgres:secret@db:5432/nextapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    command: npm run dev

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=nextapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx:  # リバースプロキシ（本番想定）
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app

volumes:
  postgres_data:
```

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## よく使うDockerコマンド集

```bash
# コンテナ起動（フォアグラウンド）
docker compose up

# バックグラウンド起動
docker compose up -d

# ビルドしてから起動
docker compose up --build

# 特定サービスのみ起動
docker compose up app db

# ログ確認（リアルタイム）
docker compose logs -f

# 特定サービスのログ
docker compose logs -f app

# 実行中コンテナ一覧
docker compose ps

# コンテナ内でコマンド実行
docker compose exec app bash
docker compose exec db psql -U postgres

# コンテナ停止
docker compose stop

# コンテナ停止 & 削除
docker compose down

# ボリュームも削除（データ完全削除）
docker compose down -v

# イメージも削除
docker compose down --rmi all

# 再ビルド
docker compose build

# キャッシュ無しで再ビルド
docker compose build --no-cache
```

## トラブルシューティング

### ポート番号が既に使用されている

```
Error: bind: address already in use
```

**解決策**:
```bash
# ポート使用中のプロセス確認（Mac/Linux）
lsof -i :3000

# プロセス終了
kill -9 <PID>

# またはdocker-compose.ymlのポート変更
ports:
  - "3001:3000"  # ホスト側を3001に
```

### ボリュームマウントでファイルが見えない

**Windowsの場合**: Docker Desktopの設定でドライブ共有を有効化。

**権限エラー**:
```yaml
volumes:
  - .:/app
user: "1000:1000"  # ホストのUID:GIDに合わせる
```

### データベース接続エラー

```
Error: getaddrinfo ENOTFOUND db
```

**原因**: `depends_on` だけでは起動完了を待たない。

**解決策**: wait-for-itスクリプト使用。

```yaml
services:
  app:
    command: >
      sh -c "
        while ! nc -z db 5432; do sleep 1; done;
        npm run dev
      "
```

または、アプリ側でリトライロジック実装。

### node_modules が遅い

**解決策**: 名前付きボリューム使用。

```yaml
volumes:
  - .:/app
  - node_modules:/app/node_modules

volumes:
  node_modules:
```

## docker-compose.yml のベストプラクティス

### 1. 環境変数は .env ファイルで管理

```bash
# .env
POSTGRES_PASSWORD=secret
REDIS_URL=redis://redis:6379
```

```yaml
# docker-compose.yml
services:
  db:
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
```

### 2. ヘルスチェック設定

```yaml
services:
  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### 3. リソース制限

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### 4. 開発/本番環境の分離

```bash
# 開発環境
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# 本番環境
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

```yaml
# docker-compose.dev.yml
services:
  app:
    command: npm run dev
    volumes:
      - .:/app

# docker-compose.prod.yml
services:
  app:
    command: npm start
    # volumesなし（イメージに含める）
```

## DevToolBox でdocker-compose.yml を検証

当サイトの開発者ツール集「DevToolBox」では、YAML構文チェックツールを提供しています。

**主な機能**:
- YAML構文エラー検出
- インデント自動修正
- docker-compose.yml テンプレート集
- JSON ⇔ YAML 変換

[DevToolBox を今すぐチェック](/tools)

## まとめ: Docker Composeで開発環境を標準化しよう

Docker Composeを使えば、"俺の環境では動く"問題とは永遠にサヨナラできます。

**重要なポイント**:

1. **docker-compose.ymlで全環境を定義** — DB、キャッシュ、全て含める
2. **depends_onで起動順序制御** — ただし起動完了は待たない
3. **ボリュームで開発効率化** — ファイル変更を即反映
4. **.envで秘密情報管理** — パスワードはGitに含めない
5. **docker compose down -v** — クリーンな環境再構築

この記事の例をベースに、自分のプロジェクトに合わせたdocker-compose.ymlを作成しましょう。一度作れば、チーム全員が同じ環境で開発できます。

**関連記事**:
- データベース設計入門 — Docker ComposeでPostgreSQL環境構築
- AWS無料枠 完全ガイド2026 — ECSでDockerコンテナをデプロイ
- VS Code ショートカットキー 完全一覧 — Docker拡張機能で更に便利に

**便利ツール**: [DevToolBox](/tools) でYAML検証・整形が可能です。
