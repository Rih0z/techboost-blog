---
title: 'Coolify：セルフホスト型PaaS入門ガイド'
description: 'オープンソースのセルフホスト型PaaSプラットフォームCoolifyの完全ガイド。Docker、デプロイ自動化、SSL証明書、データベース管理など、実践的な使い方を詳しく解説します。'
pubDate: 'Feb 06 2026'
tags: ['Coolify', 'PaaS', 'Docker', 'DevOps', 'セルフホスト', 'デプロイ']
---

Coolifyは、Heroku、Vercel、Netlifyのような使いやすさを持ちながら、完全にセルフホスト可能なオープンソースPaaSプラットフォームです。この記事では、Coolifyのセットアップから実践的な活用法まで詳しく解説します。

## Coolifyとは

Coolifyは、アプリケーションのデプロイ、データベース管理、SSL証明書の自動発行などを提供するセルフホスト型PaaSです。

### 主な特徴

- **オープンソース** - AGPLv3ライセンス、完全無料
- **セルフホスト** - 自分のサーバーで完全にコントロール
- **Dockerベース** - あらゆる言語・フレームワークに対応
- **自動SSL** - Let's Encryptで自動的にHTTPS化
- **データベース対応** - PostgreSQL、MySQL、MongoDB、Redis等
- **Git連携** - GitHub、GitLab、Bitbucketから自動デプロイ
- **Webhooks** - プッシュ時に自動デプロイ
- **環境変数管理** - セキュアな環境変数の管理

## インストール

### 必要な環境

- Ubuntu 22.04 LTS以上（推奨）
- 最低2GB RAM（本番環境は4GB以上推奨）
- Docker対応サーバー
- ドメイン名（SSL用）

### ワンコマンドインストール

```bash
# Coolifyをインストール
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# インストール完了後、以下のURLにアクセス
# http://your-server-ip:8000
```

### 手動インストール（詳細版）

```bash
# Dockerのインストール
curl -fsSL https://get.docker.com | sh

# Dockerサービスを有効化
sudo systemctl enable docker
sudo systemctl start docker

# Docker Composeのインストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Coolifyをクローン
git clone https://github.com/coollabsio/coolify.git
cd coolify

# 環境変数を設定
cp .env.production.example .env.production
nano .env.production

# Coolifyを起動
docker compose -f docker-compose.prod.yml up -d
```

### 初期設定

ブラウザで `http://your-server-ip:8000` にアクセスし、初期設定を行います。

1. **管理者アカウント作成**
   - メールアドレス
   - パスワード（強力なものを使用）

2. **サーバー設定**
   - サーバー名
   - IPアドレス
   - SSHキー（自動生成またはカスタム）

3. **ドメイン設定**
   - coolify.yourdomain.com などのサブドメインを設定
   - DNSでAレコードを設定

## 最初のアプリケーションをデプロイ

### Next.jsアプリのデプロイ

1. **Projectを作成**

Coolifyダッシュボードで「New Project」をクリック。

2. **Resourceを追加**

「Add Resource」→「Public Repository」を選択。

3. **リポジトリ情報を入力**

```
Repository URL: https://github.com/your-username/nextjs-app
Branch: main
Build Pack: Nixpacks (自動検出)
```

4. **ビルド設定**

Coolifyは自動的にNext.jsを検出し、以下のようなビルドコマンドを設定します。

```bash
# ビルドコマンド（自動設定）
npm install
npm run build

# 起動コマンド
npm start
```

5. **ドメインを設定**

```
Domain: myapp.yourdomain.com
```

DNSで該当ドメインをサーバーIPに向けます。

6. **デプロイ**

「Deploy」ボタンをクリックすると、自動的に以下が実行されます。

- Gitリポジトリからクローン
- 依存関係のインストール
- ビルド
- Dockerイメージの作成
- コンテナの起動
- SSL証明書の自動発行（Let's Encrypt）

### 環境変数の設定

```bash
# Coolifyダッシュボードで環境変数を追加
DATABASE_URL=postgresql://user:pass@postgres:5432/mydb
API_KEY=your-secret-api-key
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

環境変数は暗号化されて保存され、デプロイ時に自動的にコンテナに注入されます。

## データベースのデプロイ

### PostgreSQLの追加

1. **New Resource** → **Database** → **PostgreSQL**

2. **設定**

```yaml
Database Name: myapp-db
Username: myuser
Password: [自動生成または手動入力]
Version: 16 (latest)
```

3. **接続情報**

Coolifyは以下のような接続文字列を自動生成します。

```bash
# 内部接続（同じCoolifyプロジェクト内）
postgresql://myuser:password@postgres:5432/myapp-db

# 外部接続
postgresql://myuser:password@your-server-ip:5432/myapp-db
```

### Redisの追加

```yaml
Resource: Redis
Version: 7-alpine
Persistence: Enabled
```

接続情報:

```bash
redis://redis:6379
```

### データベースバックアップ

Coolifyは自動バックアップをサポートしています。

```yaml
Backup Settings:
  Frequency: Daily
  Retention: 7 days
  Storage: S3 or Local
```

## 継続的デプロイ（CD）

### GitHubとの連携

1. **Webhookを設定**

Coolifyダッシュボードで「Webhook URL」をコピー。

2. **GitHubリポジトリで設定**

Settings → Webhooks → Add webhook

```
Payload URL: [CoolifyのWebhook URL]
Content type: application/json
Events: Just the push event
```

3. **自動デプロイの確認**

mainブランチにプッシュすると、自動的に以下が実行されます。

- コードの取得
- ビルド
- テスト（設定している場合）
- デプロイ
- ゼロダウンタイムデプロイ（ローリングアップデート）

### カスタムビルドスクリプト

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Coolifyは自動的にDockerfileを検出してビルドします。

## 高度な機能

### カスタムドメインとSSL

```bash
# 複数ドメインの設定
myapp.com
www.myapp.com
app.myapp.com

# ワイルドカードSSL（DNS認証が必要）
*.myapp.com
```

Coolifyは自動的にLet's Encrypt証明書を取得し、90日ごとに自動更新します。

### Health Check

```yaml
Health Check:
  Path: /api/health
  Interval: 30s
  Timeout: 10s
  Retries: 3
```

アプリケーションが応答しない場合、自動的に再起動されます。

### リソース制限

```yaml
Resource Limits:
  CPU: 1 core
  Memory: 512MB
  Storage: 10GB
```

コンテナごとにリソースを制限できます。

### 複数環境の管理

```bash
# Staging環境
staging.myapp.com → staging branch

# Production環境
myapp.com → main branch
```

同じリポジトリで複数の環境を管理できます。

## Docker Composeのデプロイ

### docker-compose.ymlを使ったデプロイ

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Coolifyで「Docker Compose」リソースを選択し、上記ファイルをインポートするだけでデプロイできます。

## モニタリングとログ

### リアルタイムログ

```bash
# Coolifyダッシュボードで
Logs → Real-time

# ログをフィルタリング
[ERROR] を含むログのみ表示
[WARN] を含むログのみ表示
```

### メトリクス

Coolifyは以下のメトリクスを提供します。

- CPU使用率
- メモリ使用率
- ネットワークトラフィック
- ディスク使用量

### アラート設定

```yaml
Alerts:
  - Type: Email
    Trigger: Memory > 80%
    Recipients: admin@yourdomain.com

  - Type: Webhook
    Trigger: App Down
    URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## S3ストレージの連携

### MinIOの設定

Coolifyは内蔵のMinIO（S3互換ストレージ）を提供します。

```yaml
Storage:
  Type: MinIO
  Bucket: uploads
  Public: false
```

### アプリケーションからの利用

```typescript
// Next.js + S3
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

export async function uploadFile(file: File) {
  const command = new PutObjectCommand({
    Bucket: 'uploads',
    Key: file.name,
    Body: file,
  });

  await s3Client.send(command);
}
```

## コスト比較

### Heroku vs Coolify

| プラン | Heroku | Coolify (VPS) |
|--------|--------|---------------|
| 512MB RAM | $7/月 | $5/月（全アプリ） |
| 1GB RAM | $25/月 | $10/月（全アプリ） |
| Postgres | $9/月 | 込み |
| Redis | $15/月 | 込み |
| SSL証明書 | 無料 | 無料 |
| 月額合計 | $56+ | $10 |

Coolifyを使えば、月額$10程度のVPSで複数のアプリとデータベースをホストできます。

## トラブルシューティング

### デプロイが失敗する

```bash
# ログを確認
Logs → Build Logs

# よくある原因
1. 環境変数の未設定
2. ポート番号の不一致（Coolifyは自動的にPORTを注入）
3. ビルドコマンドのエラー
```

### アプリにアクセスできない

```bash
# DNSの確認
dig myapp.yourdomain.com

# ファイアウォールの確認（VPS側）
sudo ufw allow 80
sudo ufw allow 443
```

### SSL証明書の取得に失敗

```bash
# DNSが正しく設定されているか確認
# Let's Encryptは80/443ポートでのHTTP/HTTPS検証が必要

# 手動で証明書を取得
Settings → SSL → Force HTTPS
```

## まとめ

Coolifyの主な利点をまとめます。

- **コスト削減** - Herokuの1/5以下のコスト
- **完全なコントロール** - データとインフラを完全に管理
- **簡単なデプロイ** - Gitプッシュだけで自動デプロイ
- **自動SSL** - Let's Encryptで無料HTTPS
- **データベース統合** - PostgreSQL、MySQL、Redisを簡単にデプロイ
- **モニタリング** - リアルタイムログとメトリクス

Coolifyを使えば、VercelやHerokuのような開発者体験を、完全に自分の管理下で実現できます。スタートアップや個人開発者にとって、最もコスト効率の良い選択肢の一つです。

今すぐ$5/月のVPSでCoolifyを始めて、複数のアプリを無制限にデプロイしましょう。
