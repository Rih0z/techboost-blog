---
title: 'Dockerセキュリティ完全ガイド - 安全なコンテナ運用のベストプラクティス'
description: 'イメージスキャン、rootless実行、Secrets管理、ネットワーク分離など、Dockerの本番運用に必要なセキュリティ対策を徹底解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 'Feb 05 2026'
tags: ['Docker', 'セキュリティ', 'DevOps', 'コンテナ']
---
# Dockerセキュリティ完全ガイド

Dockerは開発から本番まで幅広く使われていますが、セキュリティ対策を怠ると重大な脆弱性につながります。本記事では、安全なコンテナ運用に必要なセキュリティ対策を包括的に解説します。

## なぜDockerのセキュリティが重要なのか

Dockerコンテナは隔離されているように見えますが、適切な設定がなければホストシステムへの攻撃経路となり得ます。

### 主なセキュリティリスク

1. **脆弱なベースイメージ** - 既知の脆弱性を含むイメージの使用
2. **root権限での実行** - コンテナ脱出時の影響範囲拡大
3. **機密情報の漏洩** - 環境変数やレイヤーに埋め込まれたシークレット
4. **過剰な権限付与** - 不要なCapabilityやボリュームマウント
5. **ネットワーク露出** - 不適切なポート公開やネットワーク設定

## イメージスキャン

### Trivy による脆弱性スキャン

Trivyは包括的な脆弱性スキャナーです。

```bash
# Trivyのインストール（macOS）
brew install aquasecurity/trivy/trivy

# イメージのスキャン
trivy image node:20-alpine

# 高・重大な脆弱性のみ表示
trivy image --severity HIGH,CRITICAL nginx:latest

# JSON形式で出力
trivy image --format json --output results.json python:3.12
```

### CI/CDパイプラインへの統合

GitHub Actionsでの自動スキャン例:

```yaml
name: Container Security

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Fail on high severity
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          exit-code: '1'
          severity: 'CRITICAL,HIGH'
```

### Docker Scout

Docker公式のセキュリティツール:

```bash
# Docker Scoutの有効化
docker scout enroll

# イメージの分析
docker scout cves node:20-alpine

# 推奨事項の取得
docker scout recommendations node:20-alpine

# CVEの詳細表示
docker scout cves --format only-packages node:20-alpine
```

### スキャン結果の対処

```dockerfile
# 悪い例：古いベースイメージ
FROM node:16

# 良い例：最新の安定版
FROM node:20-alpine

# さらに良い例：特定バージョンの指定
FROM node:20.11.0-alpine3.19

# ベストプラクティス：マルチステージビルドで最小化
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER node
CMD ["node", "server.js"]
```

## Rootless Docker

コンテナをroot以外のユーザーで実行することで、セキュリティを大幅に向上させます。

### Rootless Dockerのセットアップ

```bash
# 既存のDockerを停止
sudo systemctl stop docker

# rootlessモードのインストール
curl -fsSL https://get.docker.com/rootless | sh

# 環境変数の設定
export PATH=/home/$USER/bin:$PATH
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock

# ~/.bashrcに追加
cat >> ~/.bashrc << 'EOF'
export PATH=/home/$USER/bin:$PATH
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
EOF

# サービスの起動
systemctl --user start docker
systemctl --user enable docker
```

### コンテナ内でのユーザー指定

```dockerfile
# 方法1: USERディレクティブ
FROM node:20-alpine

# アプリケーションディレクトリの作成
WORKDIR /app

# 依存関係のインストール（rootで実行）
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションファイルのコピー
COPY . .

# 非rootユーザーへ切り替え
USER node

CMD ["node", "server.js"]
```

```dockerfile
# 方法2: カスタムユーザーの作成
FROM ubuntu:22.04

# 専用ユーザーの作成
RUN groupadd -r appuser && \
    useradd -r -g appuser -u 1001 appuser

WORKDIR /app

# ファイルのコピーと所有権の設定
COPY --chown=appuser:appuser . .

USER appuser

CMD ["./myapp"]
```

```dockerfile
# 方法3: 数値UIDの使用（Kubernetes推奨）
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 数値UIDで指定
USER 1000

CMD ["python", "app.py"]
```

### rootが必要な処理の分離

```dockerfile
FROM node:20-alpine AS setup
# root権限が必要な処理
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine
WORKDIR /app
# ビルド済みのnode_modulesをコピー
COPY --from=setup /app/node_modules ./node_modules
COPY --chown=node:node . .

# 最初から非rootユーザーで実行
USER node
CMD ["node", "server.js"]
```

## Secrets管理

機密情報を安全に扱う方法を解説します。

### Docker Secrets（Swarm/Compose）

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: myapp:latest
    secrets:
      - db_password
      - api_key
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      API_KEY_FILE: /run/secrets/api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

アプリケーション側での読み込み:

```javascript
// Node.js example
const fs = require('fs');

function getSecret(secretName) {
  const secretPath = process.env[`${secretName.toUpperCase()}_FILE`];
  if (secretPath) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  // フォールバック: 環境変数から直接読み込み
  return process.env[secretName.toUpperCase()];
}

const dbPassword = getSecret('db_password');
const apiKey = getSecret('api_key');
```

### BuildKit Secrets

ビルド時のみ必要なシークレットの安全な利用:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# ビルド時のみNPM_TOKENを利用
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm ci && \
    rm .npmrc

COPY . .

USER node
CMD ["node", "server.js"]
```

ビルドコマンド:

```bash
# シークレットを渡してビルド
docker build --secret id=npm_token,src=$HOME/.npm_token -t myapp .

# BuildKitの有効化（古いバージョン）
DOCKER_BUILDKIT=1 docker build --secret id=npm_token,src=./.npm_token -t myapp .
```

### 環境変数の安全な使用

```dockerfile
# 悪い例：機密情報をレイヤーに残す
FROM node:20-alpine
ENV API_KEY=secret123
ENV DB_PASSWORD=pass456

# 良い例：実行時に渡す（Dockerfileには記載しない）
FROM node:20-alpine
# 環境変数は実行時に注入
```

実行時の注入:

```bash
# docker run
docker run -e API_KEY=$API_KEY -e DB_PASSWORD=$DB_PASSWORD myapp

# docker-compose.yml
services:
  app:
    image: myapp
    environment:
      - API_KEY=${API_KEY}
      - DB_PASSWORD=${DB_PASSWORD}
```

### .envファイルの管理

```bash
# .env.example（リポジトリにコミット）
API_KEY=your_api_key_here
DB_PASSWORD=your_db_password_here

# .env（.gitignoreに追加、コミットしない）
API_KEY=actual_secret_key
DB_PASSWORD=actual_password
```

```gitignore
# .gitignore
.env
.env.local
secrets/
*.key
*.pem
```

## ネットワーク分離

### カスタムネットワークの作成

```bash
# フロントエンド用ネットワーク
docker network create frontend

# バックエンド用ネットワーク
docker network create backend

# データベース用ネットワーク
docker network create database
```

### docker-composeでの分離

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    networks:
      - frontend
    ports:
      - "80:80"

  api:
    image: myapi:latest
    networks:
      - frontend
      - backend
    # 外部ポートは公開しない

  worker:
    image: myworker:latest
    networks:
      - backend

  postgres:
    image: postgres:16-alpine
    networks:
      - backend
    # 外部からアクセス不可
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # 外部インターネットへのアクセスを遮断

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### ネットワークポリシーの検証

```bash
# コンテナのネットワーク接続確認
docker exec api ping -c 1 postgres
docker exec nginx ping -c 1 postgres  # 失敗するはず

# ネットワークの詳細表示
docker network inspect backend

# コンテナのネットワーク一覧
docker inspect api | jq '.[0].NetworkSettings.Networks'
```

## Capabilityの制限

Linuxの Capability を最小限にすることでセキュリティを向上させます。

### デフォルトCapabilityの確認

```bash
# コンテナのCapability確認
docker run --rm alpine sh -c 'apk add -U libcap; capsh --print'
```

### 不要なCapabilityの削除

```yaml
# docker-compose.yml
services:
  app:
    image: myapp:latest
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # 1024番未満のポートをバインド
      - CHOWN             # ファイル所有者の変更
    security_opt:
      - no-new-privileges:true
```

```bash
# docker run
docker run \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --security-opt=no-new-privileges:true \
  myapp:latest
```

### 特権モードの回避

```yaml
# 悪い例：絶対に避けるべき
services:
  app:
    privileged: true

# 良い例：必要最小限の権限のみ
services:
  app:
    cap_drop:
      - ALL
    cap_add:
      - NET_ADMIN  # 本当に必要な場合のみ
```

## Read-onlyファイルシステム

```yaml
services:
  app:
    image: myapp:latest
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
    volumes:
      - app-data:/app/data

volumes:
  app-data:
```

```bash
# docker run
docker run \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /var/run \
  -v app-data:/app/data \
  myapp:latest
```

## コンテナリソース制限

DoS攻撃や暴走を防ぐためのリソース制限:

```yaml
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
      nproc: 512
```

```bash
# docker run
docker run \
  --cpus="0.5" \
  --memory="512m" \
  --memory-swap="512m" \
  --pids-limit=100 \
  myapp:latest
```

## セキュリティスキャンとモニタリング

### Dockerベンチセキュリティ

```bash
# Docker Bench Securityの実行
git clone https://github.com/docker/docker-bench-security.git
cd docker-bench-security
sudo sh docker-bench-security.sh

# Docker コンテナとして実行
docker run --rm --net host --pid host --userns host --cap-add audit_control \
  -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
  -v /etc:/etc:ro \
  -v /usr/bin/containerd:/usr/bin/containerd:ro \
  -v /usr/bin/runc:/usr/bin/runc:ro \
  -v /usr/lib/systemd:/usr/lib/systemd:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --label docker_bench_security \
  docker/docker-bench-security
```

### Falco によるランタイム監視

```yaml
# docker-compose.yml
services:
  falco:
    image: falcosecurity/falco:latest
    privileged: true
    volumes:
      - /var/run/docker.sock:/host/var/run/docker.sock
      - /dev:/host/dev
      - /proc:/host/proc:ro
      - /boot:/host/boot:ro
      - /lib/modules:/host/lib/modules:ro
      - /usr:/host/usr:ro
      - ./falco-rules.yaml:/etc/falco/falco_rules.local.yaml
```

カスタムルール例 (`falco-rules.yaml`):

```yaml
- rule: Unauthorized Process in Container
  desc: Detect unauthorized processes
  condition: >
    spawned_process and
    container and
    not proc.name in (node, npm, sh, bash)
  output: >
    Unauthorized process started
    (user=%user.name command=%proc.cmdline container=%container.id)
  priority: WARNING

- rule: Write below root
  desc: Detect writes to root filesystem
  condition: >
    write and
    container and
    fd.name startswith /
  output: >
    File write below root
    (user=%user.name file=%fd.name container=%container.id)
  priority: ERROR
```

## Content Trust（イメージ署名）

```bash
# Content Trustの有効化
export DOCKER_CONTENT_TRUST=1

# イメージのpush（自動的に署名される）
docker push myregistry.com/myapp:latest

# 署名付きイメージのpull（検証される）
docker pull myregistry.com/myapp:latest

# 署名情報の確認
docker trust inspect myregistry.com/myapp:latest
```

## 実践的なセキュアDockerfile

すべてのベストプラクティスを適用した例:

```dockerfile
# syntax=docker/dockerfile:1

# ビルドステージ
FROM node:20.11.0-alpine3.19 AS builder

# セキュリティアップデート
RUN apk upgrade --no-cache

WORKDIR /app

# 依存関係のみ先にコピー（キャッシュ効率化）
COPY package*.json ./

# ビルド時のシークレット使用
RUN --mount=type=secret,id=npm_token \
    if [ -f /run/secrets/npm_token ]; then \
      NPM_TOKEN=$(cat /run/secrets/npm_token) \
      echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc; \
    fi && \
    npm ci --only=production && \
    rm -f .npmrc

# アプリケーションコード
COPY . .

# 本番ステージ
FROM node:20.11.0-alpine3.19

# セキュリティアップデート
RUN apk upgrade --no-cache && \
    # 不要なパッケージの削除
    apk del apk-tools && \
    # 一時ファイルのクリーンアップ
    rm -rf /var/cache/apk/* /tmp/*

WORKDIR /app

# ビルド成果物のみコピー
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# 非rootユーザーで実行
USER node

# 最小限のポート公開
EXPOSE 3000

# シグナルハンドリング
STOPSIGNAL SIGTERM

CMD ["node", "server.js"]
```

対応する `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      secrets:
        - npm_token
    image: myapp:latest

    # セキュリティ設定
    read_only: true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true

    # リソース制限
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

    # 一時ファイルシステム
    tmpfs:
      - /tmp
      - /app/tmp

    # ボリューム
    volumes:
      - app-logs:/app/logs:rw

    # ネットワーク
    networks:
      - frontend
      - backend

    # 環境変数（機密情報はsecretsで）
    environment:
      NODE_ENV: production
      PORT: 3000

    secrets:
      - db_password
      - api_key

    # ヘルスチェック
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true

volumes:
  app-logs:
    driver: local

secrets:
  npm_token:
    file: ./secrets/npm_token.txt
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

## セキュリティチェックリスト

本番環境デプロイ前の確認事項:

### イメージ
- [ ] 最新の安定版ベースイメージを使用
- [ ] 脆弱性スキャン（Trivy/Scout）実施
- [ ] マルチステージビルドで最小化
- [ ] 不要なファイル・ツールの削除
- [ ] Content Trust有効化

### ユーザー・権限
- [ ] 非rootユーザーで実行
- [ ] Capabilityを最小化
- [ ] 特権モード未使用
- [ ] Read-onlyファイルシステム
- [ ] no-new-privileges設定

### 機密情報
- [ ] Secrets機能の使用
- [ ] 環境変数に機密情報なし
- [ ] イメージレイヤーに機密情報なし
- [ ] .envファイルを.gitignore

### ネットワーク
- [ ] 必要最小限のポート公開
- [ ] カスタムネットワーク使用
- [ ] サービス間の適切な分離
- [ ] ファイアウォール設定

### リソース
- [ ] CPU/メモリ制限設定
- [ ] PID制限設定
- [ ] ディスクI/O制限

### モニタリング
- [ ] ログ収集設定
- [ ] ヘルスチェック実装
- [ ] ランタイム監視（Falco等）
- [ ] アラート設定

## まとめ

Dockerのセキュリティは、単一の対策ではなく、多層防御の考え方が重要です。

### 重要ポイント

1. **イメージセキュリティ**: 定期的なスキャンと更新
2. **最小権限の原則**: rootless、Capability制限、read-only
3. **機密情報保護**: Secrets機能の活用、環境変数の適切な管理
4. **ネットワーク分離**: カスタムネットワークによる適切な分離
5. **継続的監視**: スキャン自動化とランタイム監視

これらの対策を組み合わせることで、安全なコンテナ運用が実現できます。

### 次のステップ

- Kubernetesのセキュリティ（Pod Security Standards、Network Policies）
- サプライチェーンセキュリティ（SBOM、Sigstore）
- ゼロトラストアーキテクチャの実装
- コンプライアンス対応（CIS Benchmark、NIST）

セキュリティは一度設定して終わりではありません。継続的な改善と監視を心がけましょう。
