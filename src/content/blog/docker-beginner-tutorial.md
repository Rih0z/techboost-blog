---
title: '【入門】Dockerを1から学ぶ完全ガイド - インストールから実践まで'
description: 'Docker初心者向けの完全入門ガイド。Dockerとは何かの基礎知識から、インストール方法、基本コマンド、Dockerfileの書き方、docker-composeまで、実践例付きで丁寧に解説します。ベストプラクティスと注意点も紹介します。'
pubDate: '2026-02-03'
tags: ['Docker', 'インフラ']
heroImage: '../../assets/thumbnails/docker-beginner-tutorial.jpg'
---
「Dockerって聞いたことあるけど、何がいいの？」「コンテナ？仮想マシンと何が違うの？」そんな疑問を持つ方に向けて、Dockerをゼロから実践レベルまで解説します。

## Dockerとは何か

Dockerは**アプリケーションをコンテナという単位でパッケージ化して実行する**ためのプラットフォームです。

### 従来の問題

開発者なら一度は経験したことがあるはずです。

- 「自分のPCでは動くのに、サーバーで動かない」
- 「開発環境のセットアップに丸1日かかった」
- 「Node.jsのバージョンが違ってエラーが出る」

Dockerはこれらの問題を一気に解決します。

### コンテナと仮想マシンの違い

| 項目 | コンテナ (Docker) | 仮想マシン (VM) |
|------|-----------------|----------------|
| 起動時間 | 数秒 | 数分 |
| サイズ | 数十MB〜数百MB | 数GB |
| OS | ホストOSのカーネル共有 | ゲストOS丸ごと |
| オーバーヘッド | 極めて小さい | 大きい |
| 分離レベル | プロセスレベル | ハードウェアレベル |

コンテナはOSカーネルを共有するため、仮想マシンに比べて圧倒的に軽量かつ高速です。

## Dockerのインストール

### macOSの場合

```bash
# Homebrewを使う方法（推奨）
brew install --cask docker

# インストール後、Docker Desktopを起動
open /Applications/Docker.app
```

### Windowsの場合

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)をダウンロード
2. インストーラーを実行
3. WSL 2バックエンドを有効化（推奨）
4. PCを再起動

### Linuxの場合（Ubuntu）

```bash
# 公式リポジトリを追加してインストール
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io

# sudo無しでdockerコマンドを実行できるようにする
sudo usermod -aG docker $USER
```

### インストール確認

```bash
docker --version
# Docker version 27.x.x, build xxxxx

docker run hello-world
# Hello from Docker! と表示されればOK
```

## 基本コマンドをマスターする

### イメージの操作

```bash
# イメージの検索
docker search nginx

# イメージのダウンロード
docker pull nginx:latest

# ローカルのイメージ一覧
docker images

# イメージの削除
docker rmi nginx:latest
```

### コンテナの操作

```bash
# コンテナの起動（-dはバックグラウンド、-pはポートマッピング）
docker run -d -p 8080:80 --name my-nginx nginx

# 実行中コンテナの一覧
docker ps

# 全コンテナの一覧（停止中含む）
docker ps -a

# コンテナの停止
docker stop my-nginx

# コンテナの再起動
docker start my-nginx

# コンテナの削除
docker rm my-nginx

# コンテナのログ確認
docker logs my-nginx

# コンテナ内にシェルで入る
docker exec -it my-nginx /bin/bash
```

### よく使うオプション

| オプション | 意味 | 例 |
|-----------|------|-----|
| `-d` | バックグラウンド実行 | `docker run -d nginx` |
| `-p` | ポートマッピング | `-p 3000:3000` |
| `-v` | ボリュームマウント | `-v ./data:/app/data` |
| `-e` | 環境変数の設定 | `-e NODE_ENV=production` |
| `--name` | コンテナ名を指定 | `--name my-app` |
| `--rm` | 停止時にコンテナ自動削除 | `docker run --rm nginx` |

## Dockerfileの書き方

Dockerfileは、カスタムイメージを作成するためのレシピです。

### Node.jsアプリの例

```dockerfile
# ベースイメージ
FROM node:20-alpine

# 作業ディレクトリの設定
WORKDIR /app

# 依存ファイルを先にコピー（キャッシュ効率化）
COPY package*.json ./

# 依存のインストール
RUN npm ci --only=production

# ソースコードをコピー
COPY . .

# ポートの公開（ドキュメント目的）
EXPOSE 3000

# 起動コマンド
CMD ["node", "server.js"]
```

### Pythonアプリの例

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### ビルドと実行

```bash
# イメージをビルド（-tでタグ名を指定）
docker build -t my-app:v1 .

# ビルドしたイメージを実行
docker run -d -p 3000:3000 my-app:v1
```

### Dockerfile のベストプラクティス

1. **軽量なベースイメージを使う** - `alpine`や`slim`タグを選ぶ
2. **レイヤーキャッシュを意識** - 変更が少ないファイル（package.json等）を先にCOPY
3. **マルチステージビルド** - ビルドツールを最終イメージに含めない
4. **.dockerignoreを活用** - `node_modules`や`.git`を除外

## docker-composeで複数コンテナを管理

実際のアプリケーションでは、Webサーバー・データベース・キャッシュなど複数のサービスが連携します。docker-composeを使えば、それらを一括管理できます。

### docker-compose.yml の例

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - db_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  db_data:
```

### docker-composeの基本コマンド

```bash
# 全サービスをビルド＆起動
docker compose up -d

# ログの確認
docker compose logs -f

# 特定サービスのログ
docker compose logs -f app

# 全サービスの停止
docker compose down

# ボリュームも含めて完全削除
docker compose down -v

# サービスの再ビルド
docker compose up -d --build
```

## 実践例: WordPressをDockerで立ち上げる

わずか数行でWordPressの開発環境が手に入ります。

```yaml
# docker-compose.yml
version: '3.8'

services:
  wordpress:
    image: wordpress:latest
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wp_user
      WORDPRESS_DB_PASSWORD: wp_pass
      WORDPRESS_DB_NAME: wordpress
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wp_user
      MYSQL_PASSWORD: wp_pass
      MYSQL_ROOT_PASSWORD: root_pass
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

```bash
docker compose up -d
# ブラウザで http://localhost:8080 にアクセス
```

たった2つのファイルで、WordPressとMySQLの開発環境が完成です。

## よくあるトラブルと解決方法

### ポートが既に使用されている

```bash
# 使用中のポートを確認
lsof -i :3000

# 別のポートにマッピング
docker run -d -p 3001:3000 my-app
```

### ディスク容量が不足している

```bash
# 不要なリソースを一括削除
docker system prune -a

# 使用量の確認
docker system df
```

### コンテナが起動してすぐ終了する

```bash
# ログで原因を確認
docker logs コンテナ名

# 対話モードで起動してデバッグ
docker run -it my-app /bin/sh
```

## まとめ

Dockerは現代のソフトウェア開発において欠かせないツールです。最初は覚えることが多く感じますが、基本コマンドは10個程度です。まずは`docker run`でコンテナを起動するところから始めて、慣れてきたらDockerfileやdocker-composeに進みましょう。

**学習のステップ:**
1. Docker Desktopのインストールと`hello-world`の実行
2. 既存イメージ（nginx, postgres等）の起動・停止
3. 自分のアプリのDockerfile作成
4. docker-composeで複数サービスの連携
5. CI/CDパイプラインへの組み込み

Dockerの基本コマンドを素早く確認したい方は、当サイトのDockerチートシートも合わせてご活用ください。
---

## 関連記事

- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
- [フリーランスエンジニアの収入完全ガイド2026【平均年収・単価・案件獲得】](/blog/2026-03-11-freelance-engineer-income-guide)
- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
