---
title: "Docker + Kubernetes入門2026：最小構成から始めるコンテナ化"
description: "DockerとKubernetesの基礎を実践的に解説。最小構成から始めるコンテナ化の手順、基本的な設計パターン、CI/CD連携の入門知識を紹介。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2026-03-15"
tags: ["Docker", "Kubernetes", "インフラ", "DevOps", "クラウド"]
heroImage: '../../assets/thumbnails/docker-kubernetes-production-guide-2026.jpg'
---
## Dockerがなぜ2026年も必須なのか

コンテナ技術は「流行」ではなく**インフラの標準**になりました。

```
2026年のコンテナ採用率：
- 大企業：約80%がコンテナを本番利用
- スタートアップ：約70%がDockerを採用
- フリーランス案件：「Docker経験必須」が急増
```

---

## Docker基礎：最小構成のWebアプリをコンテナ化

```dockerfile
# ✅ 本番用Dockerfile（マルチステージビルド）
# ビルドステージ
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 実行ステージ（軽量化）
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# セキュリティ：rootで実行しない
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml（開発環境）
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Kubernetes：本番運用の最小構成

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web-app
        image: your-registry/web-app:v1.2.3
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
spec:
  selector:
    app: web-app
  ports:
    - port: 80
      targetPort: 3000
  type: LoadBalancer
```

---

## セキュリティベストプラクティス

```dockerfile
# ✅ セキュアなDockerfile作成の原則

# 1. ベースイメージは公式・最小版を使う
FROM node:20-alpine  # alpine は最小構成

# 2. 脆弱性スキャン
# $ docker scout cves your-image:latest

# 3. シークレットをビルドに含めない
# ❌ 悪い例
ENV API_KEY=secret123  # イメージ履歴に残る

# ✅ 良い例：実行時に環境変数で渡す
# docker run -e API_KEY=secret123 your-image

# 4. .dockerignoreで不要なファイルを除外
# .dockerignore の内容:
# node_modules
# .env
# .env.local
# .git
```

---

## CI/CD連携（GitHub Actions）

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t ${{ secrets.REGISTRY }}/app:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login \
            -u ${{ secrets.REGISTRY_USERNAME }} --password-stdin
          docker push ${{ secrets.REGISTRY }}/app:${{ github.sha }}

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/web-app \
            web-app=${{ secrets.REGISTRY }}/app:${{ github.sha }}
```

GitHub Actionsの詳細な活用法は[GitHub Actions AI自動化2026](/blog/github-actions-ai-automation-2026)で解説しています。

---

## クラウド別Kubernetesサービス比較

| サービス | クラウド | 特徴 | コスト（3ノード） |
|---------|---------|------|----------------|
| **EKS** | AWS | 最も採用例多 | ¥15,000〜/月 |
| **GKE** | GCP | 管理コスト低 | ¥13,000〜/月 |
| **AKS** | Azure | Microsoft製品連携 | ¥14,000〜/月 |

AWS・GCP・Azureの詳細比較は[AWS vs GCP vs Azure比較2026](/blog/aws-vs-gcp-vs-azure-comparison-2026)をご覧ください。

---

## Dockerを使ったローカル開発環境の構築

```bash
# よく使うDockerコマンド集

# コンテナ起動（バックグラウンド）
docker compose up -d

# ログ確認
docker compose logs -f app

# コンテナ内でシェル実行
docker compose exec app sh

# ボリュームごと削除（完全リセット）
docker compose down -v

# イメージのサイズ最適化確認
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# 脆弱性スキャン
docker scout cves your-image:latest
```

---

## ヘルスチェックの設計パターン

本番環境では、コンテナの健全性を適切に監視することが不可欠です。

### Dockerのヘルスチェック

```dockerfile
# Dockerfile — ヘルスチェック付き
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build

# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

```typescript
// src/health.ts — ヘルスチェックエンドポイントの実装
import { Router } from 'express';

const healthRouter = Router();

// Liveness: プロセスが生きているか
healthRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness: リクエストを受け付ける準備ができているか
healthRouter.get('/ready', async (req, res) => {
  try {
    // DB接続チェック
    await db.raw('SELECT 1');
    // Redis接続チェック
    await redis.ping();

    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'ok',
        cache: 'ok',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default healthRouter;
```

Kubernetesでは3種類のProbeを使い分けます。

| Probe | 目的 | 失敗時の動作 |
|-------|------|------------|
| startupProbe | 起動完了の確認 | 起動待ち（他のProbe開始を遅延） |
| livenessProbe | プロセス生存確認 | コンテナ再起動 |
| readinessProbe | トラフィック受付可否 | Serviceから切り離し |

## リソース制限の設計

コンテナのリソース制限は、安定した本番運用に不可欠です。

### Kubernetesのリソース設定ガイド

```yaml
# リソース設定の考え方
spec:
  containers:
  - name: web-app
    resources:
      # requests: スケジューリング時に確保するリソース量
      requests:
        memory: "256Mi"    # 通常時のメモリ使用量
        cpu: "250m"        # 0.25 vCPU
      # limits: 使用可能な上限
      limits:
        memory: "512Mi"    # これを超えるとOOMKill
        cpu: "500m"        # これを超えるとスロットリング
```

### アプリケーション種別ごとの推奨値

```yaml
# APIサーバー（Node.js/Express）
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "1000m"

# バッチ処理（データ変換・集計）
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"

# フロントエンド（Next.js SSR）
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

Namespaceレベルで `ResourceQuota`（全体上限）と `LimitRange`（デフォルト値）を設定すると、リソース設定漏れを防止できます。

## 監視環境の構築

本番Kubernetes環境には、**Prometheus + Grafana**の組み合わせが定番です。

### 監視スタックの構成

```
アプリケーション → /metrics エンドポイント公開
    ↓
Prometheus（メトリクス収集、15秒間隔）
    ↓
Grafana（ダッシュボード表示）
    ↓
AlertManager（閾値超過時にSlack/PagerDuty通知）
```

### アプリケーションメトリクスの公開（Node.js）

```typescript
// src/metrics.ts — prom-clientでメトリクス公開
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register });

const httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'HTTPリクエスト総数',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTPリクエスト処理時間',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// /metrics エンドポイントで公開
export async function metricsHandler(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}
```

## まとめ：Docker/Kubernetesの習得ロードマップ

```
Week 1: Docker基礎
  → docker run / build / compose
  → Dockerfile の書き方

Week 2-3: Docker Compose
  → 複数サービスの連携
  → 開発環境の完全コンテナ化

Month 2: Kubernetes基礎
  → minikube でローカルクラスター
  → Deployment / Service / Ingress

Month 3: 本番運用
  → クラウドKubernetes (EKS/GKE/AKS)
  → Helm でパッケージ管理
  → Monitoring (Prometheus / Grafana)
```

---

## 関連記事

- [GitHub Actions AI自動化2026](/blog/github-actions-ai-automation-2026) — CI/CDパイプラインの自動化
- [Terraform AWS完全ガイド2026](/blog/terraform-aws-guide-2026) — IaCでインフラ管理
- [AWS vs GCP vs Azure比較2026](/blog/aws-vs-gcp-vs-azure-comparison-2026) — クラウドKubernetes比較
- [PostgreSQLパフォーマンス最適化2026](/blog/postgresql-performance-guide-2026) — DBのパフォーマンスチューニング
