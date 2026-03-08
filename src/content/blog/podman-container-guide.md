---
title: "Podman入門ガイド - Docker互換のデーモンレスコンテナエンジン"
description: "PodmanはRed Hat社開発のDocker互換コンテナエンジンです。デーモンレス・ルートレス設計でセキュリティに優れ、Docker CLIと同じコマンドが使えます。Dockerからの移行方法、Pod機能、Systemd統合、Quadlet設定から本番運用まで解説します。"
pubDate: "2026-03-05"
tags: ['Docker', 'Linux', 'コンテナ', 'インフラ']
heroImage: '../../assets/thumbnails/podman-container-guide.jpg'
---

**Podman**は、Red Hat社が開発するオープンソースのコンテナエンジンです。Docker互換のCLIを持ちながら、デーモンレス・ルートレス設計によりセキュリティと運用性が向上しています。

本記事では、PodmanのインストールからDocker移行、Podman Compose、本番運用のポイントまで解説します。

## Podmanとは？

Podmanは**OCI（Open Container Initiative）準拠**のコンテナエンジンです。Docker Engineの代替として、特にセキュリティを重視する環境で採用が進んでいます。

### 主な特徴

- **デーモンレス**: バックグラウンドプロセス（デーモン）が不要
- **ルートレス**: root権限なしでコンテナを実行可能
- **Docker互換**: `docker` コマンドをそのまま置き換え可能
- **Pod概念**: Kubernetesと同じPod単位の管理
- **Systemd統合**: コンテナをSystemdサービスとして管理
- **セキュリティ強化**: SELinux/Seccomp対応

### Dockerとの比較

| 項目 | Podman | Docker |
|------|--------|--------|
| アーキテクチャ | デーモンレス | デーモン必須 |
| ルートレス | ネイティブ対応 | 追加設定が必要 |
| CLI互換性 | Docker互換 | - |
| Pod対応 | ネイティブ | なし |
| Docker Compose | podman-compose | docker compose |
| Systemd統合 | ネイティブ | 手動設定 |
| ライセンス | Apache 2.0 | Apache 2.0 |
| セキュリティ | 強い | 標準 |
| デスクトップGUI | Podman Desktop | Docker Desktop |

### なぜPodmanを選ぶのか？

Dockerは長年コンテナのデファクトスタンダードですが、以下のケースでPodmanが優位です:

1. **Docker Desktop有料化への対応**: 大企業でのDocker Desktop利用は有料ライセンスが必要
2. **セキュリティ要件**: デーモンのroot権限が問題になる環境
3. **Kubernetes移行**: Pod概念でK8sとの親和性が高い
4. **RHEL/Fedora環境**: 標準パッケージとして提供

## インストール

### macOS

```bash
# Homebrew
brew install podman

# Podmanマシンの初期化（macOSではLinux VMが必要）
podman machine init
podman machine start

# 動作確認
podman info
```

### Linux（Ubuntu/Debian）

```bash
# Ubuntu 22.04以降
sudo apt update
sudo apt install -y podman

# 動作確認
podman --version
podman info
```

### Linux（Fedora/RHEL）

```bash
# Fedora（プリインストール済み）
sudo dnf install -y podman

# RHEL 8+
sudo dnf module install -y container-tools
```

### Windows

```bash
# winget
winget install RedHat.Podman

# または Podman Desktop をインストール
winget install RedHat.Podman-Desktop
```

### Podman Desktop

GUIでコンテナを管理したい場合は、Podman Desktopをインストールします。

```bash
# macOS
brew install --cask podman-desktop

# 公式サイトからダウンロード
# https://podman-desktop.io/
```

## 基本的な使い方

DockerユーザーはPodmanをすぐに使いこなせます。CLIが互換なので、`docker` を `podman` に置き換えるだけです。

### コンテナの実行

```bash
# コンテナ実行（Dockerと同じ）
podman run -d --name nginx -p 8080:80 nginx:alpine

# コンテナ一覧
podman ps

# ログ確認
podman logs nginx

# コンテナに入る
podman exec -it nginx sh

# 停止と削除
podman stop nginx
podman rm nginx
```

### イメージ管理

```bash
# イメージ取得
podman pull node:22-alpine

# イメージ一覧
podman images

# イメージビルド
podman build -t my-app:latest .

# イメージ削除
podman rmi my-app:latest
```

### Dockerfileの使用

```dockerfile
# Dockerfile（Dockerと完全互換）
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# ビルド
podman build -t my-app:latest .

# 実行
podman run -d -p 3000:3000 my-app:latest
```

## Dockerからの移行

### エイリアス設定

最も簡単な移行方法は、エイリアスを設定することです。

```bash
# ~/.bashrc または ~/.zshrc
alias docker=podman

# docker-compose互換
alias docker-compose=podman-compose
```

### Docker Socketの互換設定

DockerのAPIソケットに依存するツールのために、互換ソケットを有効化できます。

```bash
# Podmanソケットの有効化
systemctl --user enable --now podman.socket

# ソケットパスの確認
podman info --format '{{.Host.RemoteSocket.Path}}'

# DOCKER_HOST環境変数の設定
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock
```

### docker-composeからの移行

Podmanはpodman-composeと、Docker Compose v2の両方に対応しています。

```bash
# podman-compose のインストール
pip install podman-compose

# 使い方（docker-composeと同じ）
podman-compose up -d
podman-compose ps
podman-compose down
```

```bash
# Docker Compose v2もPodmanで使用可能
# DOCKER_HOSTを設定した状態で
docker compose up -d
```

## Pod機能

PodmanのPodは、Kubernetesと同じ概念です。複数のコンテナを1つのPodとしてグループ化し、ネットワーク名前空間を共有します。

### Podの作成と管理

```bash
# Pod作成
podman pod create --name my-app-pod -p 3000:3000 -p 5432:5432

# Pod内でコンテナを起動
podman run -d --pod my-app-pod --name db \
  -e POSTGRES_PASSWORD=secret \
  postgres:16-alpine

podman run -d --pod my-app-pod --name app \
  -e DATABASE_URL=postgresql://postgres:secret@localhost:5432/mydb \
  my-app:latest

# Pod状態の確認
podman pod ps
podman pod inspect my-app-pod

# Pod内のコンテナ一覧
podman ps --pod --filter pod=my-app-pod
```

### Kubernetes YAML生成

PodmanのPodからKubernetesマニフェストを自動生成できます。

```bash
# Pod定義をKubernetes YAMLとしてエクスポート
podman generate kube my-app-pod > deployment.yaml
```

生成されるYAML:

```yaml
# deployment.yaml（自動生成）
apiVersion: v1
kind: Pod
metadata:
  name: my-app-pod
spec:
  containers:
    - name: db
      image: postgres:16-alpine
      env:
        - name: POSTGRES_PASSWORD
          value: secret
      ports:
        - containerPort: 5432
    - name: app
      image: my-app:latest
      env:
        - name: DATABASE_URL
          value: postgresql://postgres:secret@localhost:5432/mydb
      ports:
        - containerPort: 3000
```

```bash
# Kubernetes YAMLからPodを起動
podman play kube deployment.yaml

# Pod削除
podman play kube deployment.yaml --down
```

## ルートレスコンテナ

Podmanの最大のセキュリティ機能は、root権限なしでコンテナを実行できることです。

### ルートレスモードの仕組み

```
Docker:
  ユーザー → Docker CLI → Docker Daemon (root) → コンテナ (root)
                           ↑ 単一障害点・権限昇格リスク

Podman:
  ユーザー → Podman CLI → コンテナ (ユーザー権限)
             ↑ デーモンなし・権限最小化
```

### ルートレスの設定確認

```bash
# ルートレスモードで実行されているか確認
podman info --format '{{.Host.Security.Rootless}}'
# true

# ユーザー名前空間の確認
cat /etc/subuid
# user:100000:65536

cat /etc/subgid
# user:100000:65536
```

### ルートレスでの注意点

```bash
# ポート1024未満はルートレスでバインドできない（デフォルト）
podman run -p 80:80 nginx  # エラー

# 解決策1: 高番号ポートを使う
podman run -p 8080:80 nginx

# 解決策2: net.ipv4.ip_unprivileged_port_start を変更
sudo sysctl net.ipv4.ip_unprivileged_port_start=80
```

## Systemd統合

PodmanはSystemdとの統合が強力で、コンテナをサービスとして管理できます。

### Systemdサービスの自動生成

```bash
# コンテナからSystemdユニットファイルを生成
podman generate systemd --new --name nginx > ~/.config/systemd/user/container-nginx.service

# サービスの有効化
systemctl --user daemon-reload
systemctl --user enable --now container-nginx.service

# 状態確認
systemctl --user status container-nginx.service
```

### Quadlet（推奨方法）

Podman 4.4以降では、Quadletという宣言的な設定形式が推奨されています。

```ini
# ~/.config/containers/systemd/webapp.container
[Container]
Image=my-app:latest
PublishPort=3000:3000
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://localhost:5432/mydb
Volume=app-data:/app/data

[Service]
Restart=always
TimeoutStartSec=30

[Install]
WantedBy=default.target
```

```bash
# Quadletファイルを配置後
systemctl --user daemon-reload
systemctl --user start webapp

# ログ確認
journalctl --user -u webapp -f
```

## セキュリティ設定

### Seccompプロファイル

```bash
# デフォルトSeccompプロファイルで実行（推奨）
podman run --security-opt seccomp=default nginx

# カスタムプロファイル
podman run --security-opt seccomp=custom-profile.json nginx
```

### SELinux

```bash
# SELinuxラベル付きボリュームマウント
podman run -v /data:/data:Z nginx  # プライベートラベル
podman run -v /data:/data:z nginx  # 共有ラベル
```

### read-onlyファイルシステム

```bash
# 読み取り専用コンテナ
podman run --read-only \
  --tmpfs /tmp \
  --tmpfs /var/cache/nginx \
  -p 8080:80 \
  nginx:alpine
```

## Podman Compose実践

### Webアプリケーションスタック

```yaml
# docker-compose.yml（Podmanでもそのまま使用可能）
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:secret@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

```bash
# podman-composeで起動
podman-compose up -d

# 状態確認
podman-compose ps

# ログ
podman-compose logs -f app
```

## CI/CDでのPodman

### GitHub Actionsでの利用

```yaml
# .github/workflows/build.yml
name: Build with Podman
on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: |
          podman build -t my-app:${{ github.sha }} .

      - name: Run tests
        run: |
          podman run --rm my-app:${{ github.sha }} npm test

      - name: Push to registry
        run: |
          podman login ghcr.io -u ${{ github.actor }} -p ${{ secrets.GITHUB_TOKEN }}
          podman tag my-app:${{ github.sha }} ghcr.io/${{ github.repository }}/my-app:latest
          podman push ghcr.io/${{ github.repository }}/my-app:latest
```

## トラブルシューティング

### よくあるエラーと解決法

**`WARN[0000] "/" is not a shared mount`**:

```bash
# マウントの共有設定
sudo mount --make-rshared /
```

**`Error: short-name resolution enforced`**:

```bash
# 完全なレジストリ名を指定
podman pull docker.io/library/nginx:alpine
# または設定で短縮名を許可
echo 'unqualified-search-registries = ["docker.io"]' | sudo tee -a /etc/containers/registries.conf
```

**ルートレスでボリュームの権限エラー**:

```bash
# UID/GIDマッピングの確認
podman unshare cat /proc/self/uid_map

# 権限修正
podman unshare chown -R 1000:1000 /path/to/volume
```

### パフォーマンスチューニング

```bash
# ストレージドライバの確認（overlayが推奨）
podman info --format '{{.Store.GraphDriverName}}'

# 不要なイメージ・コンテナの削除
podman system prune -af
```

## まとめ

Podmanは**Docker互換でありながらセキュリティに優れた**コンテナエンジンです。

### Podmanを選ぶべきケース

- **セキュリティ重視**: ルートレス・デーモンレスでリスクを最小化
- **Docker Desktop代替**: ライセンスコスト削減
- **Kubernetes移行準備**: Pod概念・YAML生成でスムーズな移行
- **RHEL/Fedora環境**: 標準コンポーネントとして提供

### Dockerから移行すべきか？

既存のDockerワークフローが問題なく動作しているなら、無理に移行する必要はありません。ただし、新規プロジェクトやセキュリティ要件が厳しい環境では、Podmanの採用を検討する価値があります。

### 学習リソース

- [Podman公式ドキュメント](https://docs.podman.io/)
- [Podman Desktop](https://podman-desktop.io/)
- [GitHub: containers/podman](https://github.com/containers/podman)
- [Red Hat Podman Guide](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/)

Docker CLIと互換性があるため、移行のハードルは非常に低いです。まずは `alias docker=podman` から始めてみてください。
