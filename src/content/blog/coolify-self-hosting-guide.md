---
title: 'Coolify：セルフホスティングPaaSの完全ガイド'
description: 'Coolifyを使ったセルフホスティングPaaSの構築。インストールからアプリデプロイ、データベース管理、Vercel/Herokuの代替としての活用方法を解説します。'
pubDate: '2026-02-05'
tags: ['Coolify', 'PaaS', 'セルフホスティング', 'Docker', 'DevOps']
heroImage: '../../assets/thumbnails/coolify-self-hosting-guide.jpg'
---

クラウドサービスのコストが上昇する中、セルフホスティングが再び注目を集めています。Coolifyは、Vercel、Heroku、Netlifyのような体験を自前のサーバーで実現できる、オープンソースのPaaS（Platform as a Service）です。

この記事では、Coolifyのセットアップから実践的な活用方法まで詳しく解説します。

## Coolifyとは

Coolifyは、自己ホスト可能なPaaSプラットフォームで、アプリケーションのデプロイ、管理、スケーリングを簡単に行えます。Dockerベースで動作し、様々なプログラミング言語とフレームワークをサポートします。

### 主な特徴

- **完全無料**: オープンソース、ライセンス制限なし
- **Git統合**: GitHub、GitLab、Gitea等から自動デプロイ
- **Docker対応**: Dockerコンテナで何でもデプロイ可能
- **データベース管理**: PostgreSQL、MySQL、MongoDB等を簡単にセットアップ
- **SSL自動化**: Let's Encryptで自動SSL証明書発行
- **環境変数管理**: シークレットと環境変数の安全な管理
- **プレビューデプロイ**: プルリクエストごとのプレビュー環境
- **バックアップ**: 自動バックアップ機能
- **モニタリング**: アプリケーションの健全性監視

### 競合との比較

**Coolify vs CapRover**
- CoolifyはよりモダンなUI
- CapRoverはクラスタリングに強い
- Coolifyはより活発な開発

**Coolify vs Dokku**
- DokkuはHerokuライクなCLI
- CoolifyはWebベースの管理画面
- Coolifyはより多機能

**Coolify vs Vercel/Netlify（セルフホスト版）**
- コスト完全制御
- データの完全な所有権
- 従量課金なし

## セットアップ

### 必要要件

- **サーバー**: VPS、専用サーバー、または自宅サーバー
- **OS**: Ubuntu 22.04 LTS、Debian 11/12（推奨）
- **メモリ**: 最低2GB RAM（4GB以上推奨）
- **ストレージ**: 最低20GB（アプリ数に応じて増加）
- **Docker**: 自動インストールされます

### インストール

最もシンプルな方法は、公式のインストールスクリプトを使用することです。

```bash
# rootユーザーで実行
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

このスクリプトは以下を自動的に行います：

1. Docker Engineのインストール
2. Docker Composeのインストール
3. Coolifyのダウンロードと起動
4. 必要なネットワーク設定

インストール完了後、`http://your-server-ip:8000`でCoolifyにアクセスできます。

### 初期設定

1. **管理者アカウント作成**

ブラウザでCoolifyにアクセスし、初期管理者アカウントを作成します。

```
Email: admin@example.com
Password: 安全なパスワード
```

2. **ドメイン設定**

Coolify自体にドメインを設定します（オプションだが推奨）。

```
Settings → Configuration → Instance Domain
→ coolify.yourdomain.com
```

DNSレコードを追加：

```
A coolify.yourdomain.com → your-server-ip
```

3. **SSLの有効化**

ドメインを設定したら、SSL証明書を自動取得できます。

```
Settings → Configuration → Enable SSL
```

Let's Encryptが自動的に証明書を発行します。

## サーバー管理

### サーバーの追加

Coolifyは複数のサーバーを管理できます。

1. **SSHキーの生成**

```
Servers → Add Server → Generate SSH Key
```

2. **公開鍵をサーバーに追加**

生成された公開鍵を対象サーバーの`~/.ssh/authorized_keys`に追加します。

```bash
# 対象サーバーで実行
echo "ssh-ed25519 AAAA... coolify" >> ~/.ssh/authorized_keys
```

3. **サーバーの検証**

Coolifyで「Validate」をクリックし、接続を確認します。

### サーバーリソース監視

```
Servers → Your Server → Resources
```

以下が表示されます：
- CPU使用率
- メモリ使用量
- ディスク使用量
- ネットワークトラフィック

## アプリケーションのデプロイ

### 方法1：Git統合（最も一般的）

#### Next.jsアプリのデプロイ

1. **プロジェクト作成**

```
Projects → Create Project → "My Next.js App"
```

2. **リソースの追加**

```
Add Resource → Application
→ Git Repository
→ GitHub（またはGitLab、Gitea）
```

3. **リポジトリの選択**

GitHubを認証し、リポジトリを選択します。

```
Repository: username/my-nextjs-app
Branch: main
Build Pack: Nixpacks（自動検出）
```

4. **環境変数の設定**

```
Environment → Add Variable
→ DATABASE_URL: postgresql://...
→ NEXT_PUBLIC_API_URL: https://api.example.com
```

5. **ドメインの設定**

```
Domains → Add Domain
→ myapp.example.com
```

DNSレコードを追加：

```
A myapp.example.com → your-server-ip
```

6. **デプロイ**

```
Deploy
```

Coolifyが自動的に以下を実行します：
- Gitからコードをクローン
- 依存関係のインストール
- ビルドの実行
- Dockerイメージの作成
- コンテナの起動
- SSL証明書の発行

#### 自動デプロイの設定

GitHubでWebhookを設定し、プッシュ時に自動デプロイを有効化します。

```
Settings → Webhooks → GitHub
→ Copy Webhook URL

GitHub Repository → Settings → Webhooks → Add Webhook
→ Paste URL
→ Events: Push events
```

### 方法2：Dockerfileを使用

既存のDockerfileがある場合：

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

Coolifyで：

```
Build Pack: Dockerfile
Dockerfile Location: ./Dockerfile
Port: 3000
```

### 方法3：Docker Composeを使用

複数のサービスを含むアプリケーション：

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

Coolifyで：

```
Build Pack: Docker Compose
Compose File: ./docker-compose.yml
```

## データベース管理

### PostgreSQLのセットアップ

1. **データベースの作成**

```
Resources → Add Resource → Database → PostgreSQL
```

2. **設定**

```
Name: my-postgres
Version: 15（または最新）
Password: 自動生成または指定
Port: 5432（デフォルト）
```

3. **接続情報の取得**

```
Connection String:
postgresql://postgres:password@postgres-xxxx:5432/postgres
```

この接続文字列をアプリの環境変数に設定します。

### データベースバックアップ

自動バックアップの設定：

```
Database → Backups → Enable
→ Frequency: Daily
→ Time: 02:00
→ Retention: 7 days
```

バックアップはS3互換ストレージに保存できます：

```
Backups → S3 Configuration
→ Endpoint: s3.amazonaws.com
→ Bucket: my-backups
→ Access Key: AKIA...
→ Secret Key: ...
```

### 他のデータベース

Coolifyは以下もサポートします：

- **MySQL/MariaDB**
- **MongoDB**
- **Redis**
- **MinIO（S3互換ストレージ）**
- **Elasticsearch**

すべて同じ手順でセットアップできます。

## 高度な機能

### プレビューデプロイ

プルリクエストごとに自動的にプレビュー環境を作成します。

```
Application → Settings → Preview Deployments
→ Enable
→ Auto Delete: 7 days after PR close
```

各PRに一意のURLが割り当てられます：

```
pr-123.myapp.example.com
```

### カスタムビルドコマンド

デフォルトのビルドプロセスをカスタマイズ：

```
Build → Custom Build Command
→ npm run build:production
```

### カスタム起動コマンド

```
Deploy → Custom Start Command
→ node server.js --port 3000
```

### ヘルスチェック

アプリケーションの健全性を監視：

```
Settings → Health Check
→ Path: /api/health
→ Interval: 30 seconds
→ Timeout: 5 seconds
→ Retries: 3
```

ヘルスチェックが失敗すると、自動的にコンテナが再起動されます。

### スケーリング

水平スケーリング（複数インスタンス）：

```
Settings → Scaling
→ Instances: 3
→ Load Balancer: Enabled
```

Coolifyが自動的にロードバランサーを設定します。

### カスタムドメインとワイルドカードSSL

複数のサブドメインを持つアプリ：

```
Domains → Add Domain
→ *.myapp.example.com
```

ワイルドカードDNSレコードを追加：

```
A *.myapp.example.com → your-server-ip
```

Let's EncryptがワイルドカードSSL証明書を発行します（DNS-01チャレンジ使用）。

## 実践例

### 1. Next.jsアプリ + PostgreSQL

```
# プロジェクト構成
- Next.js Application（ビルドパック: Nixpacks）
  - Domain: app.example.com
  - Environment:
    - DATABASE_URL: postgresql://...
    - NEXTAUTH_SECRET: ...
    - NEXTAUTH_URL: https://app.example.com

- PostgreSQL Database
  - Version: 15
  - Auto Backup: Enabled
```

### 2. フルスタックアプリ（Docker Compose）

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
    environment:
      - NEXT_PUBLIC_API_URL=https://api.example.com
    labels:
      - "coolify.domain=app.example.com"
      - "coolify.port=3000"

  backend:
    build:
      context: ./backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    labels:
      - "coolify.domain=api.example.com"
      - "coolify.port=8000"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 3. 静的サイト（Astro）

```
Build Pack: Static
Build Command: npm run build
Publish Directory: dist
Domain: blog.example.com
```

## トラブルシューティング

### ビルドが失敗する

ログを確認：

```
Application → Logs → Build Logs
```

よくある原因：
- 環境変数の未設定
- ビルドコマンドの誤り
- メモリ不足

### アプリが起動しない

デプロイログを確認：

```
Application → Logs → Deployment Logs
```

ポート設定を確認：

```
Settings → Port
→ 3000（アプリがリッスンしているポート）
```

### SSLが機能しない

DNS設定を確認：

```bash
dig myapp.example.com
```

正しいIPアドレスを指しているか確認します。

ファイアウォールを確認：

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## ベストプラクティス

### 1. 環境ごとのプロジェクト分離

```
Projects:
- my-app-production
- my-app-staging
- my-app-development
```

### 2. シークレット管理

環境変数を安全に管理：

```
Environment → Mark as Secret
```

シークレットとマークされた変数はログに表示されません。

### 3. 定期的なバックアップ

すべてのデータベースで自動バックアップを有効化：

```
Database → Backups
→ Enable
→ S3 Storage（オフサイトバックアップ）
```

### 4. モニタリング

外部モニタリングサービスと統合：

- **Uptime Kuma**（Coolify内で直接デプロイ可能）
- **Prometheus + Grafana**
- **Better Stack**

### 5. リソース制限

各アプリに適切なリソース制限を設定：

```
Settings → Resources
→ Memory Limit: 512MB
→ CPU Limit: 1 core
```

## コスト比較

### Vercel vs Coolify

**Vercel（Proプラン）**: $20/月
- 100GB帯域幅
- 1,000ビルド分/月

**Coolify（Hetzner VPS）**: €5.39/月（約$6）
- 無制限の帯域幅（20TB）
- 無制限のビルド
- 完全な制御

**節約**: 年間約$168

### Heroku vs Coolify

**Heroku**: $25/月（Basicプラン×5アプリ）

**Coolify**: €11/月（約$12）
- 無制限のアプリ
- より高性能

**節約**: 年間約$156

## まとめ

Coolifyは、コスト効率的で柔軟なセルフホスティングPaaSソリューションです。主な利点は以下の通りです。

- **コスト削減**: 従量課金なし、予測可能なコスト
- **完全な制御**: データとインフラの完全な所有権
- **簡単なセットアップ**: 数分でPaaS環境を構築
- **柔軟性**: あらゆるアプリケーションをデプロイ可能

Vercel、Heroku、Netlifyの代替として、Coolifyは優れた選択肢です。特に複数のプロジェクトを運用している場合、大幅なコスト削減が可能です。
