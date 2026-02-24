---
title: 'Docker入門 — コンテナ化で開発環境を統一する'
description: 'Dockerの基本概念からDockerfile作成、docker-composeまで。チーム全員が同じ環境で開発できるようになる。'
pubDate: '2026-02-14'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['Docker', 'DevOps']
---

Dockerは、アプリケーションをコンテナという軽量な仮想環境で動かすためのプラットフォームです。本記事では、Dockerの基本概念から実践的な使い方、docker-composeによる複数コンテナの管理まで、詳しく解説します。

## Dockerとは

Dockerは、アプリケーションとその依存関係をパッケージ化し、どこでも同じように動作させるためのコンテナプラットフォームです。

### Dockerのメリット

1. **環境の統一**: 「私の環境では動くのに」問題を解消
2. **軽量**: 仮想マシンと比べて起動が速く、リソース効率が良い
3. **ポータビリティ**: 同じコンテナイメージを開発・本番で使用可能
4. **スケーラビリティ**: コンテナを簡単に複製してスケールアウト
5. **依存関係の分離**: 異なるバージョンのツールを同時に使用可能

### Dockerの基本概念

- **イメージ**: アプリケーションとその依存関係を含むテンプレート
- **コンテナ**: イメージから起動された実行環境
- **Dockerfile**: イメージを構築するための設計書
- **Docker Hub**: 公式・コミュニティのイメージが公開されているレジストリ
- **ボリューム**: データを永続化するための仕組み
- **ネットワーク**: コンテナ間の通信を管理

## Dockerのインストール

### macOS

```bash
# Homebrewを使用
brew install --cask docker

# または公式サイトからDocker Desktopをダウンロード
# https://www.docker.com/products/docker-desktop
```

### Linux（Ubuntu）

```bash
# 古いバージョンを削除
sudo apt-get remove docker docker-engine docker.io containerd runc

# 必要なパッケージをインストール
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg lsb-release

# Docker公式のGPGキーを追加
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# リポジトリを追加
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Dockerをインストール
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 動作確認
sudo docker run hello-world
```

### インストール確認

```bash
# Dockerのバージョン確認
docker --version

# Docker Composeのバージョン確認
docker compose version

# システム情報の表示
docker info
```

## 基本的なDockerコマンド

### イメージの操作

```bash
# イメージを検索
docker search nginx

# イメージをダウンロード
docker pull nginx
docker pull nginx:1.25  # 特定のバージョン

# ローカルのイメージ一覧
docker images

# イメージを削除
docker rmi nginx
docker rmi nginx:1.25

# 使用されていないイメージをすべて削除
docker image prune
```

### コンテナの操作

```bash
# コンテナを起動
docker run nginx

# バックグラウンドで起動
docker run -d nginx

# 名前を指定して起動
docker run -d --name my-nginx nginx

# ポートをマッピング（ホストの8080番をコンテナの80番に）
docker run -d -p 8080:80 nginx

# 環境変数を指定
docker run -d -e MYSQL_ROOT_PASSWORD=secret mysql

# ボリュームをマウント
docker run -d -v /host/path:/container/path nginx

# 起動中のコンテナ一覧
docker ps

# すべてのコンテナ一覧（停止中も含む）
docker ps -a

# コンテナを停止
docker stop my-nginx

# コンテナを起動（停止中のコンテナを再開）
docker start my-nginx

# コンテナを再起動
docker restart my-nginx

# コンテナを削除
docker rm my-nginx

# 実行中のコンテナを強制削除
docker rm -f my-nginx

# すべての停止中のコンテナを削除
docker container prune
```

### コンテナ内での操作

```bash
# コンテナ内でコマンドを実行
docker exec my-nginx ls -la

# コンテナ内でシェルを起動
docker exec -it my-nginx bash
docker exec -it my-nginx sh  # bashがない場合

# コンテナのログを表示
docker logs my-nginx
docker logs -f my-nginx  # リアルタイムで表示

# コンテナの詳細情報を表示
docker inspect my-nginx

# コンテナのリソース使用状況を表示
docker stats my-nginx
```

## Dockerfileの作成

Dockerfileは、カスタムイメージを作成するための設計書です。

### 基本的なDockerfile

```dockerfile
# Node.jsアプリケーションの例
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonをコピー
COPY package*.json ./

# 依存パッケージをインストール
RUN npm ci --only=production

# アプリケーションのソースをコピー
COPY . .

# ポート3000を公開
EXPOSE 3000

# アプリケーションを起動
CMD ["node", "server.js"]
```

### Dockerfileの主要な命令

```dockerfile
# ベースイメージを指定
FROM ubuntu:22.04

# メタデータを追加
LABEL maintainer="your-email@example.com"
LABEL version="1.0"
LABEL description="My custom image"

# 環境変数を設定
ENV NODE_ENV=production
ENV PORT=3000

# 作業ディレクトリを設定
WORKDIR /app

# ファイルをコピー
COPY . .
COPY src/ /app/src/

# ファイルを追加（URLからダウンロード可能）
ADD https://example.com/file.tar.gz /tmp/

# コマンドを実行（イメージビルド時）
RUN apt-get update && apt-get install -y curl
RUN npm install

# ポートを公開
EXPOSE 3000
EXPOSE 8080

# ボリュームを定義
VOLUME /data

# ユーザーを切り替え
USER node

# コンテナ起動時のデフォルトコマンド
CMD ["node", "server.js"]

# ENTRYPOINTを設定（常に実行されるコマンド）
ENTRYPOINT ["docker-entrypoint.sh"]
```

### マルチステージビルド

ビルドと実行を分離して、最終イメージのサイズを削減できます。

```dockerfile
# ビルドステージ
FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 実行ステージ
FROM node:18-alpine

WORKDIR /app

# ビルド成果物のみコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### イメージのビルドと実行

```bash
# Dockerfileからイメージをビルド
docker build -t my-app:1.0 .

# タグを複数指定
docker build -t my-app:1.0 -t my-app:latest .

# 特定のDockerfileを指定
docker build -f Dockerfile.prod -t my-app:prod .

# ビルドしたイメージを実行
docker run -d -p 3000:3000 --name my-app my-app:1.0
```

## 実践例: Next.jsアプリケーション

### Dockerfile

```dockerfile
# Next.jsアプリケーションのDockerfile
FROM node:18-alpine AS base

# 依存パッケージのインストール
FROM base AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ビルドステージ
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# 実行ステージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### .dockerignore

不要なファイルをコピーしないように設定します。

```
# .dockerignore
node_modules
.next
.git
.gitignore
.env*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
README.md
.DS_Store
```

## Docker Compose

Docker Composeは、複数のコンテナを定義・実行するためのツールです。

### 基本的なdocker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Docker Composeコマンド

```bash
# サービスを起動
docker compose up

# バックグラウンドで起動
docker compose up -d

# 特定のサービスのみ起動
docker compose up web

# ビルドしてから起動
docker compose up --build

# サービスを停止
docker compose stop

# サービスを停止して削除
docker compose down

# ボリュームも削除
docker compose down -v

# ログを表示
docker compose logs
docker compose logs -f web  # 特定のサービスのログ

# サービスの一覧
docker compose ps

# コンテナ内でコマンドを実行
docker compose exec web sh
docker compose exec db psql -U postgres

# サービスを再起動
docker compose restart web
```

### 実践例: Webアプリケーションのフルスタック

```yaml
version: '3.8'

services:
  # Next.jsフロントエンド
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:4000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

  # Node.jsバックエンド
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - db
      - redis

  # PostgreSQLデータベース
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Nginx（リバースプロキシ）
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

## ベストプラクティス

### 1. イメージサイズの最小化

```dockerfile
# ❌ 悪い例
FROM ubuntu:22.04
RUN apt-get update
RUN apt-get install -y node npm

# ✅ 良い例
FROM node:18-alpine
# Alpine Linuxは非常に軽量（約5MB）
```

### 2. レイヤーキャッシュの活用

```dockerfile
# ❌ 悪い例: ソースコードの変更のたびに依存パッケージも再インストール
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install

# ✅ 良い例: package.jsonが変更されない限り依存パッケージはキャッシュ
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
```

### 3. 不要なファイルを除外

```
# .dockerignore
node_modules
.git
.env*.local
*.log
.DS_Store
coverage
.next
dist
```

### 4. セキュリティ

```dockerfile
# ❌ 悪い例: rootユーザーで実行
FROM node:18
WORKDIR /app
COPY . .
CMD ["node", "server.js"]

# ✅ 良い例: 非rootユーザーで実行
FROM node:18-alpine
WORKDIR /app

# 非rootユーザーを作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

COPY --chown=nodejs:nodejs . .

USER nodejs

CMD ["node", "server.js"]
```

### 5. ヘルスチェック

```dockerfile
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# ヘルスチェックを追加
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

EXPOSE 3000

CMD ["node", "server.js"]
```

## トラブルシューティング

### コンテナが起動しない

```bash
# ログを確認
docker logs <container-id>

# 詳細情報を確認
docker inspect <container-id>

# コンテナ内でシェルを起動して確認
docker run -it <image-name> sh
```

### ディスク容量の問題

```bash
# 使用されていないリソースをすべて削除
docker system prune -a

# ボリュームも削除
docker system prune -a --volumes

# ディスク使用状況を確認
docker system df
```

### ポートがすでに使用されている

```bash
# 使用中のポートを確認
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# 別のポートを使用
docker run -p 3001:3000 my-app
```

## まとめ

Dockerは、開発環境の統一、デプロイの簡素化、スケーラビリティの向上など、多くのメリットをもたらします。本記事で解説した内容をまとめます。

- **Docker基本**: イメージ、コンテナ、ボリューム、ネットワーク
- **Dockerfile**: カスタムイメージの作成、マルチステージビルド
- **Docker Compose**: 複数コンテナの管理、開発環境の構築
- **ベストプラクティス**: イメージサイズの最小化、セキュリティ、キャッシュの活用

Dockerを使いこなすことで、「私の環境では動くのに」問題を解消し、チーム全体の生産性を向上させることができます。

Docker関連のチートシートや設定テンプレートは、[DevToolBox](https://usedevtools.com)や[BOOTH](https://ezark-devtools.booth.pm)でも公開していますので、ぜひご活用ください。
