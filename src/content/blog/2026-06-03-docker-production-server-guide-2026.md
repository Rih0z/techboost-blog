---
title: "Dockerをサーバーで本番運用する完全ガイド2026"
description: "DockerとDocker ComposeでWebアプリを本番VPSにデプロイする全手順を解説。Nginx・SSL・自動起動・ログ管理・ヘルスチェック・ゼロダウンタイムデプロイまで、実用的なdocker-compose.ymlで徹底解説します。"
pubDate: "2026-03-04"
tags: ["server", "docker", "インフラ"]
heroImage: '../../assets/thumbnails/2026-06-03-docker-production-server-guide-2026.jpg'
---

## はじめに

> *本記事にはアフィリエイト広告（A8.net）が含まれます。*

「Dockerは開発環境で使っているが、本番サーバーでの運用方法がわからない」というエンジニアは多い。

この記事ではVPS（Ubuntu 22.04）上でDockerとDocker Composeを使い、**WebアプリをHTTPS対応・自動起動・ゼロダウンタイムデプロイで本番運用する全手順**を解説する。

> **免責事項**: ツールのバージョン・仕様は記事執筆時点の情報です。最新の公式ドキュメントも合わせてご確認ください。

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>Docker本番運用に最適なVPS</strong><br>
NVMe SSD搭載でDockerイメージビルドが高速なXServerVPSが本番環境におすすめ。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ XServerVPS 公式サイトで申し込む</a>
</div>

---

## 前提環境

- OS: Ubuntu 22.04 LTS（VPS初期設定済み）
- VPS: XServerVPS / ConoHa VPS等
- ドメイン: 取得済み・DNSがVPS IPに向いている
- SSH鍵認証でログイン可能

---

## Step 1: DockerとDocker Composeのインストール

```bash
# 既存バージョンを削除（クリーンインストール）
sudo apt remove -y docker docker-engine docker.io containerd runc

# 依存パッケージのインストール
sudo apt update
sudo apt install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release

# Docker公式GPGキーを追加
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Dockerリポジトリを追加
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker CE + Docker Composeのインストール
sudo apt update
sudo apt install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# バージョン確認
docker --version
# Docker version 25.0.x, build xxxx

docker compose version
# Docker Compose version v2.x.x

# 現在のユーザーをdockerグループに追加（sudo不要にする）
sudo usermod -aG docker $USER
newgrp docker  # グループ変更を即時反映

# 起動テスト
docker run hello-world
```

---

## Step 2: プロジェクト構成

本番運用を想定した推奨ディレクトリ構成:

```
/opt/myapp/
├── docker-compose.yml          # 本番用Compose設定
├── docker-compose.override.yml # ローカル開発用（gitignore）
├── .env                        # 環境変数（gitignore必須）
├── nginx/
│   ├── nginx.conf              # Nginx設定
│   └── conf.d/
│       └── app.conf            # バーチャルホスト設定
├── app/
│   ├── Dockerfile              # アプリのDockerfile
│   └── src/                    # アプリケーションコード
├── certbot/
│   ├── conf/                   # Let's Encrypt証明書
│   └── www/                    # ACME challenge用
└── logs/
    ├── nginx/
    └── app/
```

```bash
# ディレクトリ作成
sudo mkdir -p /opt/myapp/{nginx/conf.d,app/src,certbot/{conf,www},logs/{nginx,app}}
sudo chown -R deploy:deploy /opt/myapp
cd /opt/myapp
```

---

## Step 3: アプリケーションのDockerfile

Node.js製WebアプリのDockerfileを例に説明する。

```dockerfile
# /opt/myapp/app/Dockerfile
# マルチステージビルドでイメージサイズを削減
FROM node:20-alpine AS builder

WORKDIR /app

# パッケージファイルを先にコピー（キャッシュ効率化）
COPY package*.json ./
RUN npm ci --only=production

# ソースコードをコピー
COPY . .

# 本番ビルド
RUN npm run build

# ランタイムステージ
FROM node:20-alpine AS runtime

# セキュリティ: 非rootユーザーを使用
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# ビルド成果物をコピー
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

---

## Step 4: Nginx設定（リバースプロキシ）

```nginx
# /opt/myapp/nginx/conf.d/app.conf
upstream app_backend {
    server app:3000;
    keepalive 32;
}

# HTTP → HTTPS リダイレクト
server {
    listen 80;
    server_name example.com www.example.com;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS メインサーバー
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    # SSL証明書
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # SSL設定（セキュリティ強化）
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip圧縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss;

    # リバースプロキシ設定
    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # 静的ファイルのキャッシュ
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ログ設定
    access_log /var/log/nginx/app.access.log;
    error_log /var/log/nginx/app.error.log;
}
```

---

## Step 5: docker-compose.yml（本番用）

```yaml
# /opt/myapp/docker-compose.yml
version: '3.9'

services:
  # Nginxリバースプロキシ
  nginx:
    image: nginx:1.25-alpine
    container_name: myapp_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      app:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - frontend

  # アプリケーションサーバー
  app:
    build:
      context: ./app
      dockerfile: Dockerfile
      target: runtime
    container_name: myapp_app
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
    volumes:
      - ./logs/app:/app/logs
    expose:
      - "3000"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    networks:
      - frontend
      - backend

  # PostgreSQLデータベース
  db:
    image: postgres:16-alpine
    container_name: myapp_db
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - backend

  # Let's Encrypt自動更新
  certbot:
    image: certbot/certbot:latest
    container_name: myapp_certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done'"
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # 外部からアクセス不可にする
```

---

## Step 6: 環境変数ファイル

```bash
# /opt/myapp/.env
# ⚠️ このファイルは絶対にGitリポジトリにコミットしない
cat > /opt/myapp/.env << 'EOF'
# アプリケーション設定
NODE_ENV=production
SECRET_KEY=your-super-secret-key-here

# データベース設定
DATABASE_URL=postgresql://appuser:password@db:5432/myapp
POSTGRES_DB=myapp
POSTGRES_USER=appuser
POSTGRES_PASSWORD=your-db-password-here
EOF

# 権限を制限（オーナーのみ読み取り可能）
chmod 600 /opt/myapp/.env

# .gitignore に追加
echo ".env" >> /opt/myapp/.gitignore
echo "logs/" >> /opt/myapp/.gitignore
echo "certbot/conf/" >> /opt/myapp/.gitignore
```

---

## Step 7: SSL証明書の初回取得

```bash
# NginxをHTTPのみで一時起動（証明書取得前）
# 証明書取得前はSSL設定をコメントアウトしておく
docker compose up -d nginx

# Let's Encrypt証明書取得
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d example.com \
  -d www.example.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# SSL設定を有効化してNginxを再起動
docker compose restart nginx

# HTTPS確認
curl -I https://example.com
# HTTP/2 200
```

---

## Step 8: 本番デプロイと起動

```bash
cd /opt/myapp

# Dockerイメージをビルド
docker compose build --no-cache

# バックグラウンドで起動
docker compose up -d

# 起動状態確認
docker compose ps
```

```
NAME              IMAGE               STATUS
myapp_nginx       nginx:1.25-alpine   Up (healthy)
myapp_app         myapp-app           Up (healthy)
myapp_db          postgres:16-alpine  Up (healthy)
myapp_certbot     certbot/certbot     Up
```

---

## Step 9: ゼロダウンタイムデプロイ

```bash
#!/bin/bash
# /opt/myapp/scripts/deploy.sh

set -e

APP_DIR="/opt/myapp"
cd "$APP_DIR"

echo "=== デプロイ開始: $(date) ==="

# 最新コードを取得
git pull origin main

# 新しいイメージをビルド（起動中のコンテナには影響しない）
docker compose build app

# ローリングアップデート: 新コンテナを起動してから旧コンテナを停止
docker compose up -d --no-deps --build app

# ヘルスチェック待機
echo "ヘルスチェック待機中..."
for i in {1..30}; do
  if docker compose ps app | grep -q "healthy"; then
    echo "✅ ヘルスチェック成功"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ ヘルスチェックタイムアウト: ロールバックします"
    docker compose rollback
    exit 1
  fi
  sleep 5
done

# 古いイメージを削除
docker image prune -f

echo "=== デプロイ完了: $(date) ==="
```

```bash
# デプロイスクリプトを実行可能にする
chmod +x /opt/myapp/scripts/deploy.sh

# デプロイ実行
/opt/myapp/scripts/deploy.sh
```

---

## Step 10: ログ管理

```bash
# リアルタイムログ確認
docker compose logs -f

# 特定サービスのログ
docker compose logs -f app
docker compose logs -f nginx

# ログローテーション設定
sudo vim /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
```

```bash
# Docker daemon再起動
sudo systemctl restart docker

# ディスク使用量確認
docker system df
docker system prune -f  # 不要なリソースを削除
```

---

## Step 11: 自動起動の設定

```bash
# systemdサービスを作成（サーバー再起動後に自動起動）
sudo vim /etc/systemd/system/myapp.service
```

```ini
[Unit]
Description=MyApp Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0
User=deploy
Group=deploy

[Install]
WantedBy=multi-user.target
```

```bash
# サービスを有効化
sudo systemctl daemon-reload
sudo systemctl enable myapp.service
sudo systemctl start myapp.service

# 確認
sudo systemctl status myapp.service
```

---

## おすすめVPSサービス

<div style="display:flex;flex-direction:column;gap:1em;margin:2em 0;">

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;">
<strong>XServerVPS — Docker本番運用に最適</strong><br>
NVMe SSDでDockerイメージビルドが高速。Dockerテンプレートあり・本番運用に最適なVPS。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ XServerVPS 公式サイトで申し込む</a>
</div>

<div style="padding:1.5em;background:#fff7f0;border-radius:8px;border-left:4px solid #e67e22;">
<strong>ConoHa WING — 小規模・WordPress向け</strong><br>
小規模プロジェクトやWordPressとの併用に。使いやすいUIと時間課金で低リスクで始められる。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZBO0+C968T6+50+5SJPS2" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#e67e22;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ ConoHa WING 公式サイトで詳細を見る</a>
</div>

</div>

---

## トラブルシューティング

### コンテナが起動しない場合

```bash
# ログを確認
docker compose logs app

# コンテナ内に入って確認
docker compose exec app sh

# イメージを再ビルド
docker compose build --no-cache app
```

### メモリ不足の場合

```bash
# メモリ使用量確認
docker stats

# コンテナのメモリ制限を設定（docker-compose.yml）
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

### SSL証明書のエラー

```bash
# 証明書の有効期限確認
docker compose run --rm certbot certificates

# 強制更新
docker compose run --rm certbot renew --force-renewal
docker compose restart nginx
```

---

## まとめ

本番環境でのDocker運用のポイント:

| 項目 | ベストプラクティス |
|------|----------------|
| セキュリティ | 非rootユーザー・.envで認証情報管理 |
| 可用性 | ヘルスチェック・restart: unless-stopped |
| SSL | certbot自動更新・HTTP→HTTPSリダイレクト |
| ログ | ログローテーション・docker logsコマンド |
| デプロイ | ゼロダウンタイムスクリプト |
| 起動 | systemdで自動起動 |

DockerとDocker Composeを使えば、開発環境と本番環境の差異を最小限にしながら、安定したサービス運用が可能になる。

---

## 関連記事

- [VPS初期設定完全ガイド2026（Ubuntu）](/blog/2026-06-02-vps-initial-setup-guide-2026/)
- [XServerVPS vs ConoHa VPS徹底比較2026](/blog/2026-06-01-xservervps-vs-conoha-vps-2026/)
- [さくらVPS vs XServerVPS比較2026](/blog/2026-06-04-sakura-vps-vs-xservervps-2026/)
