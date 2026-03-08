---
title: "Docker・Kubernetes入門2026【ゼロから本番環境構築まで完全ガイド】"
description: "Dockerの基礎からKubernetesまでのロードマップを完全解説。コンテナ基礎・Docker Compose・Kubernetes・クラウドデプロイまでを段階的に学べます。VPSでの実践環境構築手順付き。"
pubDate: "2026-03-16"
tags: ["docker", "kubernetes", "infrastructure", "beginner"]
heroImage: "../../assets/blog-placeholder-1.jpg"
---

## はじめに

「DockerやKubernetesを学びたいけど、どこから手をつければいいかわからない」という声は多い。

2026年現在、コンテナ技術はWeb開発・インフラ・DevOpsの現場で完全に標準となっており、これらを知らないエンジニアは採用市場でも不利になっている。

この記事では、Dockerの基礎から本番環境のKubernetesまで、完全なロードマップを提供する。

---

## 学習ロードマップ全体像

```
Phase 1: Dockerの基礎（1〜2週間）
  └── コンテナとは何か
  └── Docker基本コマンド
  └── Dockerfileの書き方
  └── イメージのビルドと実行

Phase 2: Docker Compose（1〜2週間）
  └── 複数コンテナの連携
  └── 開発環境の構築
  └── 環境変数・ボリューム管理
  └── ネットワーク設定

Phase 3: Kubernetesの基礎（2〜4週間）
  └── Kubernetesの概念理解
  └── Pod・Deployment・Service
  └── ConfigMap・Secret
  └── minikubeでのローカル実習

Phase 4: 本番環境構築（2〜4週間）
  └── クラウドKubernetes（EKS/GKE/AKS）
  └── CI/CDパイプライン構築
  └── 監視・ロギング
  └── セキュリティ設定
```

---

## Phase 1: Dockerの基礎

### コンテナとは何か

従来の仮想マシン（VM）は、ハードウェアをエミュレートしてゲストOSを丸ごと起動する。これに対してコンテナは、ホストOSのカーネルを共有しながら、プロセスを分離した軽量な実行環境だ。

| 比較項目 | 仮想マシン（VM） | コンテナ |
|---------|---------------|--------|
| **起動時間** | 数分 | 数秒〜1秒未満 |
| **ディスク使用量** | 数GB〜数十GB | 数MB〜数百MB |
| **リソース効率** | 低い | 高い |
| **移植性** | 中程度 | 高い |
| **分離度** | 完全分離 | プロセス分離 |

### Docker基本コマンド

```bash
# イメージの取得
docker pull nginx:latest

# コンテナの起動
docker run -d -p 8080:80 --name my-nginx nginx:latest

# 動作中のコンテナ確認
docker ps

# コンテナのログ確認
docker logs my-nginx

# コンテナへのシェル接続
docker exec -it my-nginx bash

# コンテナの停止・削除
docker stop my-nginx
docker rm my-nginx

# イメージの削除
docker rmi nginx:latest

# 全コンテナ・イメージの一覧
docker ps -a
docker images
```

### Dockerfileの書き方

```dockerfile
# ベースイメージの指定
FROM node:20-alpine

# 作業ディレクトリの設定
WORKDIR /app

# 依存関係ファイルのコピー（キャッシュ活用のため先にコピー）
COPY package*.json ./

# 依存関係のインストール
RUN npm ci --only=production

# アプリケーションのコピー
COPY . .

# ポートの公開宣言
EXPOSE 3000

# コンテナ起動時のコマンド
CMD ["node", "server.js"]
```

**Dockerfile のベストプラクティス**

- ベースイメージは軽量な `alpine` 系を選択
- `RUN` コマンドは可能な限りまとめてレイヤー数を減らす
- `.dockerignore` で不要ファイルを除外
- マルチステージビルドで本番イメージを軽量化
- `COPY` と `RUN` の順序でキャッシュを最大活用

---

## Phase 2: Docker Compose

### 複数コンテナの連携

Webアプリ開発ではフロントエンド・バックエンド・データベースなど複数コンテナが必要になる。Docker Composeで全体をコード化して管理できる。

```yaml
# docker-compose.yml
version: '3.9'

services:
  # Webアプリ
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:password@db:5432/mydb
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules

  # データベース
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 5s
      retries: 5

  # キャッシュ
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

```bash
# 起動
docker compose up -d

# ログ確認
docker compose logs -f app

# 停止
docker compose down

# ボリュームも含めて完全削除
docker compose down -v
```

### 開発環境の構築例

実際の開発現場でよく使われるフルスタック構成:

```yaml
# docker-compose.dev.yml（開発用）
version: '3.9'

services:
  frontend:
    build:
      context: ./frontend
      target: development
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev

  backend:
    build:
      context: ./backend
      target: development
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - DEBUG=true
    command: uvicorn main:app --reload --host 0.0.0.0

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: devdb
```

---

## Phase 3: Kubernetesの基礎

### Kubernetesの主要概念

```
Cluster（クラスター）
└── Node（ノード）: 実際の実行サーバー
    └── Pod（ポッド）: コンテナの最小実行単位
        └── Container（コンテナ）: Dockerコンテナ

制御リソース:
├── Deployment: Podの管理・更新・スケール
├── Service: Podへのネットワークアクセス管理
├── Ingress: 外部からのHTTP/Sルーティング
├── ConfigMap: 設定情報の管理
└── Secret: 機密情報の管理
```

### 主要オブジェクトの比較表

| オブジェクト | 用途 | 特徴 |
|-----------|-----|------|
| **Pod** | コンテナの実行 | 最小単位。単独では使わない |
| **Deployment** | Podの管理 | ローリングアップデート・スケール |
| **StatefulSet** | ステートフルアプリ | DB等、状態を持つアプリ向け |
| **DaemonSet** | 全ノードに配置 | ログ収集エージェント等 |
| **Service (ClusterIP)** | 内部通信 | クラスター内専用 |
| **Service (NodePort)** | 外部公開（開発） | ノードのポートを開放 |
| **Service (LoadBalancer)** | 外部公開（本番） | クラウドのLBと連携 |
| **Ingress** | HTTPルーティング | パスベースのルーティング |

### 基本的なDeployment定義

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: my-app:1.0.0
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
```

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

```bash
# minikubeでのローカル実習
minikube start

# リソースの適用
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# 状態確認
kubectl get pods
kubectl get deployments
kubectl get services

# ログ確認
kubectl logs -f deployment/my-app

# スケールアップ
kubectl scale deployment my-app --replicas=5

# ローリングアップデート
kubectl set image deployment/my-app app=my-app:2.0.0

# ロールバック
kubectl rollout undo deployment/my-app
```

---

## Phase 4: 本番環境構築

### VPSでのDocker本番環境構築

開発・個人プロジェクトにはVPSでのDocker環境が最もコスパが良い。

> VPSで本番環境を構築したい場合、XServerVPSが国内屈指のコスパでおすすめです。
> [XServerVPSの詳細はこちら](https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY){rel="noopener sponsored" target="_blank"}

```bash
# Ubuntu 24.04 LTSでのDocker Engine インストール
# Docker公式GPGキー追加
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# リポジトリ追加
echo \
  "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# インストール
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# 現在のユーザーをdockerグループに追加
sudo usermod -aG docker $USER
```

### Traefik + Docker Composeで本番デプロイ

```yaml
# docker-compose.prod.yml
version: '3.9'

services:
  traefik:
    image: traefik:v3
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./acme.json:/acme.json

  app:
    image: my-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`example.com`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### クラウドKubernetes（EKS/GKE/AKS）比較

| クラウド | サービス名 | 月額目安 | 特徴 |
|---------|----------|--------|------|
| AWS | EKS | $73〜 | 最も普及。エコシステムが豊富 |
| Google Cloud | GKE | $72〜 | Kubernetes発祥地。Autopilotモードが便利 |
| Azure | AKS | $70〜 | Microsoftエコシステムとの親和性 |
| DigitalOcean | DOKS | $12〜 | 個人・スタートアップ向けコスパ重視 |

---

## Docker・Kubernetes 学習リソース

### 公式ドキュメント（最優先）
- [Docker公式ドキュメント](https://docs.docker.com/) - 日本語対応
- [Kubernetes公式ドキュメント](https://kubernetes.io/ja/docs/) - 日本語対応
- [Play with Docker](https://labs.play-with-docker.com/) - ブラウザで無料体験

### 試験・資格
| 資格 | 難易度 | 費用 |
|-----|--------|------|
| CKA（Certified Kubernetes Administrator） | ★★★★☆ | $395 |
| CKAD（Certified Kubernetes Application Developer） | ★★★☆☆ | $395 |
| CKS（Certified Kubernetes Security Specialist） | ★★★★★ | $395 |
| Docker Certified Associate | ★★★☆☆ | $195 |

---

## よくある質問

**Q: DockerとDockerfileの違いは何ですか？**

A: Dockerはコンテナを管理する仕組み・ソフトウェア全体を指します。Dockerfileはコンテナのイメージを作成するための設計図（テキストファイル）です。

**Q: Docker ComposeとKubernetesはどう違いますか？**

A: Docker Composeは単一ホスト上での複数コンテナ管理に使います。KubernetesはDockerを複数サーバー（クラスター）で管理するためのオーケストレーションシステムです。スケール・冗長性・自動復旧が必要になったらKubernetesの出番です。

**Q: Kubernetes は個人開発に必要ですか？**

A: 個人開発・小規模プロジェクトには必須ではありません。Docker ComposeとVPS（またはシングルノードのk3s）で十分なケースが多いです。ただし、学習のために試してみることは推奨します。

**Q: M1/M2 MacでDockerは動きますか？**

A: Docker Desktop for MacはApple Silicon (M1/M2/M3)に対応しています。`--platform linux/amd64` フラグでx86イメージも実行できますが、ネイティブのARMイメージを使う方が高速です。

---

## まとめ

Docker・Kubernetesの学習ロードマップをまとめると:

1. **Phase 1 (1〜2週間)**: Docker基本コマンド + Dockerfile作成
2. **Phase 2 (1〜2週間)**: Docker Composeで開発環境構築
3. **Phase 3 (2〜4週間)**: minikubeでKubernetes基礎を習得
4. **Phase 4 (2〜4週間)**: VPSまたはクラウドで本番環境構築

まずはVPSやローカル環境でDockerを実際に動かすことが最重要。手を動かさないと理解が深まらない。

VPSで実践環境を作るなら、コスパ良く始められるXServerVPSが最初の一歩としておすすめだ。

> [XServerVPSで実践環境を構築する](https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY){rel="noopener sponsored" target="_blank"}
