---
title: 'Docker完全ガイド — コンテナ・イメージ・Compose・本番運用まで'
description: 'Dockerの基礎から本番環境での運用まで完全解説。コンテナ・イメージ・Dockerfile最適化・Docker Compose・マルチステージビルド・セキュリティベストプラクティスをコード例付きで網羅。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

現代のソフトウェア開発において、Dockerはほぼすべての現場で使われるインフラの標準ツールとなった。「自分のマシンでは動くのに本番で動かない」という古典的な問題を根本から解決し、開発・テスト・本番の環境差異をゼロにする。

本記事ではDockerの基礎概念から始め、Dockerfile最適化・Docker Compose・マルチステージビルド・セキュリティ・本番運用Tipsまでを体系的に解説する。コード例を豊富に掲載しているので、手を動かしながら読み進めてほしい。

---

## 1. Dockerとは — コンテナ仮想化の仕組み

### 従来の仮想マシン（VM）との違い

Dockerを理解する第一歩は、従来の仮想マシン（VM）との違いを把握することだ。

**仮想マシン（VM）のアーキテクチャ:**

```
┌─────────────────────────────────────────┐
│              アプリケーション A           │
├─────────────────────────────────────────┤
│          ゲストOS（Ubuntu, CentOS等）    │
├─────────────────────────────────────────┤
│        ハイパーバイザー（VMware等）       │
├─────────────────────────────────────────┤
│         ホストOS（Windows/Linux）        │
├─────────────────────────────────────────┤
│               物理ハードウェア           │
└─────────────────────────────────────────┘
```

**Dockerコンテナのアーキテクチャ:**

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  コンテナ A   │ │  コンテナ B   │ │  コンテナ C   │
│  アプリ + lib │ │  アプリ + lib │ │  アプリ + lib │
├──────────────┴─┴──────────────┴─┴──────────────┤
│                 Docker Engine                    │
├─────────────────────────────────────────────────┤
│              ホストOS（Linux カーネル）           │
├─────────────────────────────────────────────────┤
│                 物理ハードウェア                  │
└─────────────────────────────────────────────────┘
```

| 比較項目       | VM                     | Docker コンテナ         |
|--------------|------------------------|------------------------|
| 起動時間       | 数分                   | 数秒                   |
| ディスク使用量 | GBオーダー             | MBオーダー             |
| メモリ消費     | ゲストOS分も必要       | ホストOSカーネルを共有 |
| 隔離レベル     | 完全なOS隔離           | プロセス・ファイル隔離  |
| 移植性         | ハイパーバイザー依存   | Docker Engine があればどこでも動く |

### Dockerの中核概念

Dockerには3つの核心概念がある。

1. **イメージ（Image）**: アプリケーション実行に必要なすべてのファイル・設定を含む読み取り専用のテンプレート。Dockerfileから生成される。
2. **コンテナ（Container）**: イメージを実行した状態。イメージに薄い書き込み可能レイヤーを追加したもの。
3. **レジストリ（Registry）**: イメージを保存・配布するサービス。Docker Hub, GitHub Container Registry, AWS ECR など。

### Linuxカーネル機能との関係

Dockerはゲア名目上「仮想化」だが、実態はLinuxカーネルの2つの機能を利用したプロセス分離だ。

- **Namespaces**: PID・ネットワーク・マウントポイント・ユーザーIDなどをプロセスごとに分離する
- **cgroups（Control Groups）**: CPU・メモリ・I/O などのリソースをグループ単位で制限・管理する

これによりコンテナはカーネルを共有しつつ、互いに影響しない独立した環境として動作する。

---

## 2. インストールと基本コマンド

### Dockerのインストール

**macOS:**

```bash
# Docker Desktop をダウンロード
# https://www.docker.com/products/docker-desktop/

# または Homebrew 経由
brew install --cask docker
```

**Ubuntu/Debian:**

```bash
# 古いバージョンを削除
sudo apt-get remove docker docker-engine docker.io containerd runc

# 必要なパッケージを追加
sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release

# Docker の公式GPGキーを追加
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# リポジトリを設定
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker Engine をインストール
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# 現在のユーザーを docker グループに追加（sudo なしで使えるように）
sudo usermod -aG docker $USER
newgrp docker
```

インストールの確認:

```bash
docker --version
# Docker version 26.1.0, build a5ee5b1

docker run hello-world
# Hello from Docker!
```

### 基本コマンドリファレンス

**コンテナ操作:**

```bash
# コンテナを起動（イメージがなければ自動でpull）
docker run nginx

# バックグラウンドで起動（detached mode）
docker run -d nginx

# ポートマッピング（ホスト8080 → コンテナ80）
docker run -d -p 8080:80 nginx

# コンテナに名前をつける
docker run -d --name my-nginx -p 8080:80 nginx

# 環境変数を渡す
docker run -d -e NODE_ENV=production my-app

# ボリュームをマウント
docker run -d -v /host/path:/container/path nginx

# インタラクティブモードで起動（シェル操作）
docker run -it ubuntu /bin/bash

# 実行中のコンテナ一覧
docker ps

# 全コンテナ一覧（停止中を含む）
docker ps -a

# コンテナを停止
docker stop my-nginx

# コンテナを強制終了
docker kill my-nginx

# コンテナを削除
docker rm my-nginx

# 停止中の全コンテナを削除
docker container prune

# 実行中コンテナでコマンドを実行
docker exec -it my-nginx /bin/bash

# コンテナのログを表示
docker logs my-nginx

# ログをリアルタイムで追跡
docker logs -f my-nginx

# コンテナの詳細情報を表示
docker inspect my-nginx
```

**イメージ操作:**

```bash
# イメージをpull
docker pull ubuntu:22.04

# ローカルのイメージ一覧
docker images

# イメージを削除
docker rmi ubuntu:22.04

# 未使用イメージを削除
docker image prune

# 全未使用リソースを削除（イメージ・コンテナ・ネットワーク）
docker system prune -a

# イメージのレイヤー構成を確認
docker history nginx

# イメージをビルド
docker build -t my-app:1.0 .

# イメージをレジストリにpush
docker push my-app:1.0
```

---

## 3. Dockerfile作成 — イメージのレシピ

Dockerfileはイメージを作るための設計書だ。各命令がレイヤーとなり、積み重なってイメージが完成する。

### 主要命令の完全解説

```dockerfile
# =====================================================
# Dockerfile完全サンプル — Node.js Webアプリケーション
# =====================================================

# FROM: ベースイメージを指定（必須・最初に記述）
# タグを必ず指定する（latestは本番で禁止）
FROM node:20-alpine

# LABEL: イメージにメタデータを付与
LABEL maintainer="dev@example.com"
LABEL version="1.0"
LABEL description="Node.js Web Application"

# WORKDIR: 以降の命令の作業ディレクトリを設定
# ディレクトリが存在しない場合は自動作成
WORKDIR /app

# ARG: ビルド時のみ使用する変数（docker build --build-arg で渡せる）
ARG NODE_ENV=production

# ENV: 環境変数を設定（コンテナ実行時も有効）
ENV NODE_ENV=${NODE_ENV}
ENV PORT=3000

# COPY: ホストからコンテナにファイルをコピー
# キャッシュを最大限活用するため、変更頻度の低いファイルを先にコピー
COPY package*.json ./

# RUN: ビルド時にコマンドを実行（新しいレイヤーを作成）
# && で繋げて1つのRUNにまとめることでレイヤー数を削減
RUN npm ci --only=production && \
    npm cache clean --force

# アプリケーションのソースをコピー
COPY . .

# EXPOSE: コンテナが使用するポートを宣言（ドキュメント的役割）
# 実際のポートマッピングは docker run -p で行う
EXPOSE 3000

# USER: 以降のコマンドを実行するユーザーを設定
# セキュリティのためrootユーザーは使用しない
USER node

# HEALTHCHECK: コンテナのヘルス状態を確認するコマンド
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# CMD: コンテナ起動時のデフォルトコマンド（上書き可能）
# JSON配列形式（exec form）を推奨
CMD ["node", "server.js"]

# ENTRYPOINT: コンテナのメインコマンド（上書きしにくい）
# CMDと組み合わせて使う場合が多い
# ENTRYPOINT ["node"]
# CMD ["server.js"]
```

### COPY vs ADD の使い分け

```dockerfile
# COPY: シンプルなファイルコピーに使う（推奨）
COPY src/ /app/src/
COPY package.json /app/

# ADD: 特殊な機能が必要な場合のみ使う
# - URLからの自動ダウンロード
# - tar.gz等の自動解凍
ADD https://example.com/config.json /app/config.json
ADD archive.tar.gz /app/

# 基本的にはCOPYを使い、ADDは特別な理由がある場合のみ使用
```

### CMD vs ENTRYPOINT の違い

```dockerfile
# CMDのみ: docker run my-app echo "hello" で上書き可能
CMD ["node", "server.js"]

# ENTRYPOINTのみ: 常にnode が実行される
# docker run my-app server.js → node server.js が実行される
ENTRYPOINT ["node"]
CMD ["server.js"]

# 実際のユースケース: シェルスクリプトを entrypoint に
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
```

---

## 4. マルチステージビルド — 本番用軽量イメージ

マルチステージビルドはDockerの強力な機能のひとつだ。ビルド環境と実行環境を分離し、本番イメージを最小限のサイズに抑えられる。

### Go アプリケーションの例

```dockerfile
# ================================
# ステージ1: ビルドステージ
# ================================
FROM golang:1.22-alpine AS builder

WORKDIR /build

# 依存関係をキャッシュ（go.modとgo.sumのみ先にコピー）
COPY go.mod go.sum ./
RUN go mod download

# ソースをコピーしてビルド
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
  -ldflags="-w -s" \
  -o /app/server \
  ./cmd/server

# ================================
# ステージ2: 実行ステージ（軽量）
# ================================
FROM scratch

# セキュリティのためCA証明書をコピー（HTTPSリクエストに必要）
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# ビルド済みバイナリのみをコピー
COPY --from=builder /app/server /server

EXPOSE 8080
ENTRYPOINT ["/server"]
```

このアプローチではビルドに使ったGoコンパイラやソースコードが本番イメージに含まれない。`golang:1.22-alpine`が約300MBなのに対し、`scratch`ベースの最終イメージはバイナリのみで数MBになる。

### Node.js アプリケーションのマルチステージビルド

```dockerfile
# ================================
# ステージ1: 依存関係インストール
# ================================
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

# ================================
# ステージ2: ビルド
# ================================
FROM node:20-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ================================
# ステージ3: 本番実行環境
# ================================
FROM node:20-alpine AS runner

# セキュリティ: non-rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# 本番に必要なファイルのみコピー
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# ユーザーを変更
USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

### Python アプリケーションの例

```dockerfile
# ================================
# ステージ1: ビルド・依存関係
# ================================
FROM python:3.12-slim AS builder

WORKDIR /build

# pipのアップグレードとwheelのインストール
RUN pip install --upgrade pip wheel

# 依存関係をwheelとしてビルド
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /wheels -r requirements.txt

# ================================
# ステージ2: 実行環境
# ================================
FROM python:3.12-slim AS runner

# セキュリティ: non-rootユーザー
RUN useradd --create-home appuser
WORKDIR /home/appuser

# ビルド済みwheelをコピーしてインストール
COPY --from=builder /wheels /wheels
COPY --from=builder /build/requirements.txt .
RUN pip install --no-cache /wheels/*

# アプリをコピー
COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 5. .dockerignore の重要性

`.dockerignore`はDockerビルドコンテキストから除外するファイル・ディレクトリを指定するファイルだ。`.gitignore`と同じ構文を使う。

### なぜ重要か

Dockerビルド時、クライアントはカレントディレクトリ全体（ビルドコンテキスト）をDocker Engineに送信する。`.dockerignore`なしでは不要なファイルがすべて送られ、以下の問題が発生する。

- ビルドコンテキストの転送が遅くなる
- キャッシュが無効化されやすくなる
- 機密ファイル（`.env`など）がイメージに含まれるリスクがある

### Node.js プロジェクトの .dockerignore

```dockerignore
# 依存関係（コンテナ内で npm install するため不要）
node_modules
npm-debug.log*

# 開発用ファイル
.env
.env.local
.env.*.local
.env.development
.env.test

# バージョン管理
.git
.gitignore

# テスト・CI
coverage/
.nyc_output/
*.test.js
*.spec.js
__tests__/
jest.config.js
.github/

# ビルド成果物（マルチステージビルドでビルドするため）
.next/
dist/
build/

# ドキュメント
README.md
docs/
*.md

# Docker関連（再帰的なコピーを避ける）
Dockerfile
Dockerfile.*
docker-compose*.yml
.dockerignore

# OS生成ファイル
.DS_Store
Thumbs.db

# エディタ設定
.vscode/
.idea/
*.swp
*.swo

# ログ
logs/
*.log
```

### Python プロジェクトの .dockerignore

```dockerignore
# 仮想環境
venv/
.venv/
env/
ENV/

# Python キャッシュ
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.egg-info/
dist/
build/
*.egg

# テスト
.pytest_cache/
.tox/
coverage.xml
*.cover
htmlcov/

# 環境変数・シークレット
.env
.env.*
secrets/
*.key
*.pem

# バージョン管理
.git/
.gitignore

# ドキュメント
docs/
*.md
README*

# IDE
.vscode/
.idea/
*.swp
```

---

## 6. Docker Compose — 複数コンテナの管理

実際のアプリケーションはWebサーバー・データベース・キャッシュなど複数のサービスで構成される。Docker Composeはこれらを宣言的に定義し、一括管理するツールだ。

### フルスタックWebアプリの docker-compose.yml

```yaml
# docker-compose.yml
version: '3.9'

services:
  # ──────────────────────────────
  # フロントエンド（Next.js）
  # ──────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=http://localhost:3000
    container_name: app-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      api:
        condition: service_healthy
    networks:
      - app-network
    restart: unless-stopped

  # ──────────────────────────────
  # バックエンドAPI（FastAPI）
  # ──────────────────────────────
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
      target: runner  # マルチステージビルドのターゲットを指定
    container_name: app-api
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/mydb
      - REDIS_URL=redis://redis:6379
      - SECRET_KEY=${SECRET_KEY}  # .envファイルから読み込む
    env_file:
      - .env.api
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./api/uploads:/app/uploads  # アップロードファイルの永続化
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  # ──────────────────────────────
  # データベース（PostgreSQL）
  # ──────────────────────────────
  db:
    image: postgres:16-alpine
    container_name: app-db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql  # 初期化SQL
    environment:
      POSTGRES_USER: ${DB_USER:-user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
      POSTGRES_DB: ${DB_NAME:-mydb}
    ports:
      - "5432:5432"  # 開発時のみ公開（本番は削除推奨）
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-user} -d ${DB_NAME:-mydb}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  # ──────────────────────────────
  # キャッシュ（Redis）
  # ──────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: app-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redispassword}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - app-network
    restart: unless-stopped

  # ──────────────────────────────
  # リバースプロキシ（Nginx）
  # ──────────────────────────────
  nginx:
    image: nginx:alpine
    container_name: app-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - frontend
      - api
    networks:
      - app-network
    restart: unless-stopped

# ──────────────────────────────
# ボリューム（named volumes）
# ──────────────────────────────
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

# ──────────────────────────────
# ネットワーク
# ──────────────────────────────
networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Docker Compose の主要コマンド

```bash
# サービスを起動（バックグラウンド）
docker compose up -d

# ビルドしてから起動
docker compose up -d --build

# 特定のサービスのみ起動
docker compose up -d db redis

# サービスのログを確認
docker compose logs -f api

# 実行中のサービス一覧
docker compose ps

# サービスを停止
docker compose stop

# サービスを停止して削除（ボリュームは保持）
docker compose down

# サービスを停止して削除（ボリュームも削除）
docker compose down -v

# サービスを再起動
docker compose restart api

# サービス内でコマンドを実行
docker compose exec api bash

# サービスをスケールアップ
docker compose up -d --scale api=3
```

### 開発用と本番用の設定分離

```yaml
# docker-compose.override.yml（開発用。docker compose up で自動的にマージされる）
version: '3.9'

services:
  api:
    build:
      target: development  # 開発用ステージを使う
    volumes:
      - ./api:/app  # ホットリロードのためソースをマウント
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
    ports:
      - "5678:5678"  # デバッガーポート

  db:
    ports:
      - "5432:5432"  # 開発時のみDBポートを公開
```

```bash
# 本番用設定を明示的に使う
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 7. ボリュームとネットワーク

### ボリュームの種類

Dockerには3種類のデータ永続化方法がある。

```bash
# ──────────────────────────────
# 1. Named Volume（推奨）
# Dockerが管理する名前付きボリューム
# ──────────────────────────────
docker volume create mydata
docker run -d -v mydata:/app/data nginx

# ボリューム一覧
docker volume ls

# ボリューム詳細（保存先パスなど）
docker volume inspect mydata

# 未使用ボリュームを削除
docker volume prune

# ──────────────────────────────
# 2. Bind Mount
# ホストのディレクトリをコンテナにマウント
# 開発時のホットリロードに便利
# ──────────────────────────────
docker run -d -v /host/path:/container/path nginx
docker run -d -v $(pwd):/app node:20-alpine

# 読み取り専用でマウント
docker run -d -v $(pwd)/config:/app/config:ro nginx

# ──────────────────────────────
# 3. tmpfs Mount
# メモリ上の一時ストレージ（コンテナ停止で消える）
# 機密情報の一時保存に使う
# ──────────────────────────────
docker run -d --tmpfs /app/tmp:rw,size=100m nginx
```

### ネットワークの理解

```bash
# ──────────────────────────────
# デフォルトネットワーク
# ──────────────────────────────
# bridge: デフォルト。コンテナ同士が通信できる
# host: ホストのネットワークを直接使用（Linuxのみ）
# none: ネットワーク無効

# カスタムネットワークを作成
docker network create my-network

# ネットワーク詳細を確認（サブネット・接続コンテナ等）
docker network inspect my-network

# コンテナをネットワークに接続
docker run -d --network my-network --name db postgres
docker run -d --network my-network --name api my-api

# 接続後、コンテナ名でDNS解決できる
# api コンテナから db:5432 でPostgreSQLに接続可能

# コンテナを複数のネットワークに接続
docker network connect frontend-network api
docker network connect backend-network api

# ネットワーク一覧
docker network ls

# 未使用ネットワークを削除
docker network prune
```

### ネットワークセグメンテーション（セキュリティ設計）

```yaml
# docker-compose.yml
version: '3.9'

services:
  nginx:
    networks:
      - frontend  # インターネット側

  api:
    networks:
      - frontend   # nginx から接続受け付け
      - backend    # DB・Redisにアクセス

  db:
    networks:
      - backend    # APIからのみ接続可能（外部からは接続不可）

  redis:
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # このネットワークは外部接続を拒否
```

---

## 8. 環境変数管理 — .envファイルとSecrets

### .envファイルの基本

```bash
# .env（プロジェクトルート）
# このファイルはgitignoreに追加すること！

# アプリケーション設定
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# データベース
DB_HOST=db
DB_PORT=5432
DB_USER=appuser
DB_PASSWORD=supersecretpassword
DB_NAME=myapp_production

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=anotherpassword

# 外部サービス
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx
JWT_SECRET=myjwtsecretkey

# ──────────────────────────────
# .env.example（gitにコミットするテンプレート）
# ──────────────────────────────
# NODE_ENV=development
# PORT=3000
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=
# DB_PASSWORD=
# DB_NAME=
```

### Docker Compose での環境変数読み込み

```yaml
services:
  api:
    environment:
      # 方法1: 直接値を指定
      NODE_ENV: production

      # 方法2: .envファイルから読み込む（変数展開）
      DB_PASSWORD: ${DB_PASSWORD}

      # 方法3: ホスト環境変数からコンテナに渡す
      PATH: $PATH

    # 方法4: env_fileで別ファイルを指定
    env_file:
      - .env
      - .env.production
```

### Docker Secrets（本番環境推奨）

Docker Swarmや本番環境では、Secretsを使って機密情報を安全に管理する。

```yaml
# docker-compose.yml（Swarm mode）
version: '3.9'

services:
  api:
    image: my-api:latest
    secrets:
      - db_password
      - jwt_secret
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret

secrets:
  db_password:
    external: true  # docker secret create で事前作成
  jwt_secret:
    file: ./secrets/jwt_secret.txt  # ファイルから読み込む
```

```bash
# Swarm mode でSecretを作成
echo "mysupersecretpassword" | docker secret create db_password -
docker secret ls
```

アプリ側でのSecrets読み込み（Node.js例）:

```javascript
// secrets.js
const fs = require('fs');

function readSecret(secretName) {
  const secretPath = `/run/secrets/${secretName}`;
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  // フォールバック: 環境変数から読み込む
  return process.env[secretName.toUpperCase()];
}

module.exports = {
  dbPassword: readSecret('db_password'),
  jwtSecret: readSecret('jwt_secret'),
};
```

---

## 9. レイヤーキャッシュ最適化 — ビルド高速化

Dockerのレイヤーキャッシュを理解して使いこなすことで、ビルド時間を大幅に短縮できる。

### キャッシュの仕組み

Dockerfileの各命令は1つのレイヤーを生成する。あるレイヤーが変更されると、それ以降のすべてのレイヤーのキャッシュが無効になる。

```
Dockerfile命令          キャッシュ戦略
─────────────────────────────────────────────────────
FROM node:20-alpine  → ほぼ変わらない（キャッシュ有効）
WORKDIR /app         → ほぼ変わらない（キャッシュ有効）
COPY package*.json . → package.jsonが変わった時だけ無効
RUN npm ci           → 上が有効ならキャッシュ使用
COPY . .             → ソース変更で無効（毎回実行）
RUN npm run build    → 上が無効なら毎回実行
```

### 悪い例 vs 良い例

```dockerfile
# ============================================================
# 悪い例: ソースを変えるたびに npm install が実行される
# ============================================================
FROM node:20-alpine
WORKDIR /app
COPY . .                    # ← ここでソース全体をコピー
RUN npm ci                  # ← ソース変更のたびにnpm installが走る
RUN npm run build
CMD ["node", "server.js"]

# ============================================================
# 良い例: 依存関係が変わらない限り npm install はキャッシュ使用
# ============================================================
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./       # ← 依存ファイルのみ先にコピー
RUN npm ci                  # ← package.json変更時のみ実行
COPY . .                    # ← ソースをコピー（頻繁に変わる）
RUN npm run build           # ← ソース変更時に実行
CMD ["node", "server.js"]
```

### BuildKitを使った並列ビルド

Docker BuildKitは並列ビルドをサポートし、マルチステージビルドをより高速化する。

```bash
# BuildKitを有効化（Docker 23.0以降はデフォルト有効）
export DOCKER_BUILDKIT=1

# または --progress=plain で詳細ログを表示
docker build --progress=plain -t my-app .

# キャッシュをリモートに保存（CI/CD環境で有効）
docker build \
  --cache-from type=registry,ref=my-registry/my-app:cache \
  --cache-to type=registry,ref=my-registry/my-app:cache,mode=max \
  -t my-app:latest \
  .
```

### GitHub Actions でのキャッシュ活用

```yaml
# .github/workflows/docker-build.yml
name: Docker Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_HUB_USERNAME }}
          password: ${{ secrets.DOCKER_HUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: myapp:latest
          cache-from: type=gha       # GitHub Actions キャッシュを使用
          cache-to: type=gha,mode=max
```

---

## 10. セキュリティ — Docker セキュリティベストプラクティス

### non-rootユーザーで実行する

デフォルトでDockerコンテナはrootユーザーとして実行される。これはセキュリティリスクとなるため、必ず専用ユーザーを作成すべきだ。

```dockerfile
# Node.js アプリ（node ユーザーが既存）
FROM node:20-alpine
WORKDIR /app
COPY --chown=node:node . .
USER node
CMD ["node", "server.js"]

# カスタムユーザーを作成する場合
FROM python:3.12-slim

# グループとユーザーを作成
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /home/appuser
COPY --chown=appuser:appgroup . .
USER appuser

CMD ["python", "app.py"]
```

### 最小権限のベースイメージを使う

```dockerfile
# 避けるべき（不要な機能が多い）
FROM ubuntu:latest
FROM node:20

# 推奨（最小限のパッケージのみ）
FROM node:20-alpine        # Alpine Linux（~5MB）
FROM python:3.12-slim      # slim variant
FROM debian:bookworm-slim  # slim Debian

# 最も安全（攻撃面が最小）
FROM scratch               # 完全に空（静的バイナリのみ）
FROM gcr.io/distroless/nodejs20-debian12  # Google Distroless
```

### イメージのスキャン

```bash
# Docker Scout（Docker公式）
docker scout quickview my-app:latest
docker scout cves my-app:latest

# Trivy（Aqua Security製、OSS）
# インストール
brew install trivy

# イメージをスキャン
trivy image my-app:latest

# 高・致命的な脆弱性のみ表示
trivy image --severity HIGH,CRITICAL my-app:latest

# Dockerfile のスキャン（ベストプラクティス違反を検出）
trivy config Dockerfile

# Grype（Anchore製）
grype my-app:latest
```

### 読み取り専用ファイルシステム

```bash
# ファイルシステムを読み取り専用でコンテナを起動
docker run --read-only \
  --tmpfs /tmp:rw,size=64m \  # 書き込みが必要な箇所のみ tmpfs
  my-app
```

```yaml
# docker-compose.yml
services:
  api:
    read_only: true
    tmpfs:
      - /tmp:size=64m
      - /var/run
```

### Dockerfile のセキュリティチェック（hadolint）

```bash
# hadolintをインストール
brew install hadolint

# Dockerfileをlint
hadolint Dockerfile

# CI での使用
docker run --rm -i hadolint/hadolint < Dockerfile
```

hadolintが検出する問題例:

```dockerfile
# DL3007: "latest" タグの使用は避ける
FROM ubuntu:latest  # NG
FROM ubuntu:22.04   # OK

# DL3008: バージョン固定なしのaptパッケージ
RUN apt-get install curl         # NG
RUN apt-get install curl=7.81.0* # OK

# DL3009: apt-get update のキャッシュが残る
RUN apt-get update
RUN apt-get install -y curl  # NG

RUN apt-get update && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*  # OK
```

### Capabilities の制限

```bash
# 全Capabilitiesを削除し、必要なもののみ追加
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE my-app

# seccomp プロファイルを指定
docker run --security-opt seccomp=seccomp.json my-app
```

---

## 11. ヘルスチェック設定

ヘルスチェックはコンテナが正常に動作しているかを定期的に確認する仕組みだ。Kubernetes や Docker Swarm のような オーケストレーターがコンテナの状態管理に利用する。

### Dockerfile でのヘルスチェック

```dockerfile
# Web APIのヘルスチェック
HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=10s \
            --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# curlがない場合はwgetを使う
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8000/health || exit 1

# TCP接続チェック（nc コマンド使用）
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD nc -z localhost 5432 || exit 1

# PostgreSQLのヘルスチェック
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1
```

ヘルスチェックのパラメータ:
- `--interval`: チェック間隔（デフォルト: 30s）
- `--timeout`: タイムアウト時間（デフォルト: 30s）
- `--start-period`: 起動猶予時間（デフォルト: 0s）
- `--retries`: 失敗回数の閾値（デフォルト: 3）

### アプリケーション側のヘルスエンドポイント実装

```javascript
// Node.js / Express でのヘルスエンドポイント
const express = require('express');
const app = express();

// シンプルなヘルスチェック
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 詳細なヘルスチェック（DB接続も確認）
app.get('/health/detailed', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'unknown',
  };

  try {
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
    checks.status = 'degraded';
  }

  const httpStatus = checks.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(checks);
});
```

```python
# FastAPI でのヘルスエンドポイント
from fastapi import FastAPI, status
from sqlalchemy import text
import time

app = FastAPI()
start_time = time.time()

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/health/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    checks = {
        "status": "ok",
        "uptime_seconds": time.time() - start_time,
        "database": "unknown",
    }

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"
        checks["status"] = "degraded"

    status_code = status.HTTP_200_OK if checks["status"] == "ok" \
                  else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(content=checks, status_code=status_code)
```

### ヘルスチェックの確認

```bash
# コンテナのヘルス状態を確認
docker inspect --format='{{.State.Health.Status}}' my-container

# ヘルスチェック履歴を確認
docker inspect --format='{{json .State.Health}}' my-container | jq

# psコマンドでもSTATUSに(healthy)が表示される
docker ps
# CONTAINER ID   IMAGE     ...   STATUS
# abc123         my-app    ...   Up 2 minutes (healthy)
```

---

## 12. 本番運用Tips — ログ管理・リソース制限

### ログ管理

```bash
# ログドライバーを指定
docker run -d \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  my-app

# fluentdにログを送信
docker run -d \
  --log-driver fluentd \
  --log-opt fluentd-address=localhost:24224 \
  --log-opt tag=myapp.api \
  my-app

# Splunk・CloudWatch・Datadogなどへの転送も可能
```

```yaml
# docker-compose.yml でのログ設定
services:
  api:
    image: my-api:latest
    logging:
      driver: json-file
      options:
        max-size: "10m"     # ファイル最大サイズ
        max-file: "5"       # ローテーション数
        labels: "app_name"  # ラベルでフィルタリング
        tag: "{{.Name}}"    # コンテナ名をタグに
```

### リソース制限

本番環境ではコンテナのリソース使用量を制限し、他のサービスへの影響を防ぐことが重要だ。

```bash
# CPU・メモリの制限
docker run -d \
  --memory="512m" \          # メモリ上限
  --memory-swap="1g" \       # スワップを含むメモリ上限
  --memory-reservation="256m" \ # ソフトリミット（推奨使用量）
  --cpus="1.5" \             # CPU コア数の制限
  --cpu-shares=1024 \        # 相対的なCPU優先度
  my-app

# ディスクI/Oの制限
docker run -d \
  --device-read-bps /dev/sda:30mb \   # 読み取り速度制限
  --device-write-bps /dev/sda:30mb \  # 書き込み速度制限
  my-app
```

```yaml
# docker-compose.yml でのリソース制限
services:
  api:
    image: my-api:latest
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
    restart: unless-stopped
```

### 再起動ポリシー

```yaml
services:
  api:
    # no: 再起動しない（デフォルト）
    # always: 常に再起動（手動停止も再起動）
    # unless-stopped: 手動停止以外は再起動（推奨）
    # on-failure: 異常終了時のみ再起動
    restart: unless-stopped

  # 異常終了時に最大5回まで再起動
  worker:
    restart: on-failure:5
```

### 本番用 docker-compose.prod.yml

```yaml
# docker-compose.prod.yml
version: '3.9'

services:
  api:
    image: registry.example.com/my-app/api:${TAG:-latest}  # CI でビルドしたイメージを使う
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    environment:
      - NODE_ENV=production
    read_only: true
    tmpfs:
      - /tmp

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

secrets:
  db_password:
    external: true

volumes:
  postgres_data:
    external: true  # 既存のボリュームを使う（誤削除防止）
```

### コンテナの監視

```bash
# リソース使用量をリアルタイムで確認
docker stats

# 特定コンテナのみ
docker stats my-api my-db

# JSON形式で出力（モニタリングツールに送る場合）
docker stats --no-stream --format \
  '{"container":"{{.Container}}","cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}"}' \
  | jq
```

---

## まとめ — Dockerを使いこなすためのチェックリスト

本記事で解説したベストプラクティスを一覧にまとめる。

**Dockerfile:**
- [ ] タグを必ず固定する（`latest`禁止）
- [ ] 変更頻度の低いものを先にCOPY（キャッシュ最適化）
- [ ] RUN命令を`&&`で連結してレイヤー数を削減
- [ ] `.dockerignore`を必ず作成する
- [ ] マルチステージビルドで本番イメージを軽量化
- [ ] non-rootユーザーを使用する
- [ ] HEALTHCHECKを設定する

**Docker Compose:**
- [ ] 本番用と開発用の設定を分離する
- [ ] ネットワークセグメンテーションでセキュリティを向上
- [ ] named volumeでデータを永続化
- [ ] リソース制限を設定する
- [ ] 再起動ポリシーを設定する

**セキュリティ:**
- [ ] trivy等でイメージの脆弱性をスキャン
- [ ] hadolintでDockerfileをlint
- [ ] シークレットを環境変数に直書きしない
- [ ] read_onlyでファイルシステムを保護
- [ ] 最小権限のベースイメージを使用

**運用:**
- [ ] ログローテーションを設定する
- [ ] `docker system prune`で定期的にクリーンアップ
- [ ] `docker stats`でリソース使用量を監視
- [ ] ヘルスチェックエンドポイントを実装する

---

## 付録: Docker APIレスポンスのデバッグ

Docker EngineはREST APIを提供しており、プログラムからコンテナを操作できる。APIレスポンスはJSON形式で返ってくるため、デバッグ時にはJSONの整形・バリデーションが欠かせない。

```bash
# Docker APIを直接叩く例
curl --unix-socket /var/run/docker.sock \
  http://localhost/v1.43/containers/json | jq '.[].Names'

# コンテナの詳細情報（複雑なJSONが返ってくる）
curl --unix-socket /var/run/docker.sock \
  http://localhost/v1.43/containers/my-container/json
```

このようなDocker APIレスポンスの解析・バリデーション・整形作業には、**[DevToolBox](https://usedevtools.com/)** が便利だ。JSONのフォーマット・パス検索・スキーマバリデーションを即座に行えるため、Dockerの設定ファイルやAPIレスポンスの確認作業を大幅に効率化できる。

コンテナ設定のJSONデバッグや、`docker inspect`の出力解析など、Docker運用で頻繁に遭遇するJSON処理タスクに積極的に活用してほしい。

---

Dockerは学習コストはあるものの、一度身につければ開発・デプロイの効率が劇的に向上する。本記事のベストプラクティスを実践し、安全で効率的なコンテナ運用を実現してほしい。
