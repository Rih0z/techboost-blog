---
title: "Next.jsのデプロイ先比較2026：Vercel vs AWS vs レンタルサーバー"
description: "Next.jsアプリのデプロイ先を徹底比較。Vercel・AWS・レンタルサーバー・VPSそれぞれのメリット・デメリット・コストを実際の設定例と共に解説。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2026-03-10"
tags: ["Next.js", "デプロイ", "レンタルサーバー", "サーバー", "Vercel", "インフラ"]
heroImage: '../../assets/thumbnails/nextjs-deployment-vercel-server-2026.jpg'
---
## Next.jsのデプロイ先：2026年の選択肢

Next.jsはデプロイ先が多数あり、用途・コスト・スケールによって最適解が変わります。

| デプロイ先 | 月額コスト | スケール | 難易度 | 最適な用途 |
|-----------|---------|--------|-------|----------|
| **Vercel** | 無料〜$20 | ◎自動 | 低 | 個人・小中規模 |
| **AWS (EC2+ALB)** | ¥5,000〜 | ◎手動 | 高 | 大規模・カスタム |
| **ConoHa VPS** | ¥763〜 | ○手動 | 中 | 中規模・コスパ重視 |
| **Xserver** | ¥990〜 | △ | 低 | WordPress混在 |
| **Cloudflare Pages** | 無料〜 | ◎自動 | 低 | 静的/Edge Functions |

---

## Option 1: Vercel（推奨・最も簡単）

Vercelはコードを書いた会社が運営するPaaSで、**Next.jsのデプロイが最も簡単**です。

```bash
# Vercelへのデプロイ（3コマンドで完了）
npm install -g vercel
vercel login
vercel --prod
```

**Vercel Proプランの費用：**
- 無料枠：帯域幅100GB/月、Serverless Functions実行時間100GB-hours
- Pro：$20/月（帯域幅1TB、商用利用可）
- Enterprise：要問い合わせ

**Vercelが有利な点：**
- CDN自動配信（世界中のエッジで高速配信）
- プレビューデプロイ自動生成（PR毎にURLが発行される）
- Next.jsの全機能（ISR・Server Actions）が動作保証

---

## Option 2: VPS（中規模・コスパ重視）

コスト削減や特殊な要件がある場合はVPSが選択肢になります。

```nginx
# Nginx設定例（Next.jsのreverse proxy）
server {
  listen 80;
  server_name example.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

```bash
# PM2でNext.jsを永続起動
npm install -g pm2
pm2 start npm --name "nextapp" -- start
pm2 save
pm2 startup
```

**おすすめVPS：**
- ConoHa VPS：月¥763〜（SSD・日本リージョン）
- さくらのVPS：月¥880〜（老舗・安定）

詳細なVPS比較は[VPS比較2026](/blog/vps-comparison-2026)をご覧ください。

---

## Option 3: AWS（大規模・エンタープライズ）

```yaml
# docker-compose.yml例（AWS ECS対応）
version: '3.8'
services:
  nextapp:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - .:/app
    command: sh -c "npm ci && npm run build && npm start"
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
```

**AWS構成コスト（中規模SaaS）：**
```
EC2 t3.small: ¥3,200/月
ALB: ¥2,500/月
RDS t3.micro: ¥3,100/月
CloudFront: ¥500/月〜
Route53: ¥60/月

合計: 約¥9,000〜12,000/月
```

---

## Option 4: Cloudflare Pages + Workers

Edge Functionsを活用した最先端デプロイ方法。

```typescript
// next.config.ts（Cloudflare対応設定）
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cloudflare Pagesではstandaloneモードを使用
  output: 'standalone',
};

export default nextConfig;
```

**Cloudflareのメリット：**
- 無料枠が充実（商用サイトも無料で運用可能）
- DDoS保護・WAFが標準付属
- 世界300+のデータセンターでEdge実行

---

## サーバー別パフォーマンス比較

```
【Lighthouse スコア比較（同一アプリ）】

Vercel (Edge Network):
  LCP: 1.2秒 / TTFB: 120ms / PageSpeed: 95

ConoHa VPS (東京):
  LCP: 1.8秒 / TTFB: 200ms / PageSpeed: 88

AWS EC2 t3.medium (東京):
  LCP: 1.5秒 / TTFB: 160ms / PageSpeed: 91

Xserver (共有):
  LCP: 2.2秒 / TTFB: 350ms / PageSpeed: 78
```

---

## CI/CDパイプライン：GitHub Actionsでの自動デプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy Next.js

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  deploy-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Docker マルチステージビルド

```dockerfile
# Dockerfile（Next.js本番用）
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

```bash
# ビルド & 実行
docker build -t my-nextapp .
docker run -p 3000:3000 --env-file .env.production my-nextapp

# イメージサイズ比較
# マルチステージ: 約150MB
# シングルステージ: 約800MB+
```

---

## SSL/HTTPS設定（VPS向け・Certbot + Nginx）

```bash
# Let's Encrypt SSL証明書の取得（無料）
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

```nginx
# SSL有効化後のNginx設定（自動生成される）
server {
  listen 443 ssl http2;
  server_name example.com;

  ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  # セキュリティヘッダー
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Content-Type-Options nosniff;
  add_header X-Frame-Options SAMEORIGIN;

  # gzip圧縮
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;
  gzip_min_length 1000;

  # Next.js プロキシ
  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }

  # 静的ファイルのキャッシュ
  location /_next/static/ {
    proxy_pass http://localhost:3000;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
}

# HTTPからHTTPSへリダイレクト
server {
  listen 80;
  server_name example.com;
  return 301 https://$server_name$request_uri;
}
```

```bash
# SSL自動更新の設定
sudo certbot renew --dry-run
# cronに自動更新を追加（月2回）
echo "0 0 1,15 * * certbot renew --quiet" | sudo tee -a /etc/crontab
```

---

## PV別コスト比較：実際にいくらかかる？

```
【月間1万PV】
Vercel無料: ¥0
Cloudflare: ¥0
ConoHa VPS: ¥763
→ 推奨: Vercel無料枠

【月間10万PV】
Vercel Pro: ¥3,000（$20）
ConoHa VPS: ¥1,408（2GB）
AWS: ¥12,000〜
→ 推奨: Vercel Pro（管理コストゼロ）

【月間50万PV】
Vercel Pro: ¥3,000 + 帯域超過分
ConoHa VPS 4GB: ¥2,901
AWS: ¥20,000〜
→ 推奨: VPS（コスパ重視）or Vercel（運用楽さ重視）

【月間100万PV以上】
Vercel Enterprise: 要問い合わせ
AWS: ¥30,000〜（スケーラブル）
ConoHa VPS 8GB: ¥5,802 + CDN
→ 推奨: AWS or GCP（カスタムスケーリング）
```

---

## 環境変数の安全な管理

```bash
# .env.local（ローカル開発用・gitignoreに含める）
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
NEXT_PUBLIC_API_URL=http://localhost:3000/api
SECRET_KEY=dev-secret-key-change-in-production

# Vercelでの環境変数設定
vercel env add DATABASE_URL production
vercel env add SECRET_KEY production

# VPS/AWSでの環境変数管理
# PM2 ecosystem.config.js
module.exports = {
  apps: [{
    name: 'nextapp',
    script: 'node_modules/.bin/next',
    args: 'start',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
};
```

**環境変数のベストプラクティス：**

```
✅ .env.local はgitignoreに含める
✅ NEXT_PUBLIC_ プレフィックスはクライアントに公開される（注意）
✅ シークレットはVercel/AWS Secrets Managerで管理
✅ 本番のDB接続文字列は絶対にコードに書かない
❌ .env.production をリポジトリにコミットしない
```

---

## デプロイ先の選び方フローチャート

```
Q1: 月のトラフィックは？
  → 10万PV未満：Vercel無料枠で十分
  → 10万〜100万PV：Vercel Pro ($20/月) または VPS
  → 100万PV以上：AWS/GCP検討

Q2: カスタム設定が必要か？
  → Cronジョブ・WebSocket・SSH必要：VPS or AWS
  → 不要：Vercel/Cloudflare

Q3: コスト優先か？
  → 最安：Cloudflare Pages（無料）
  → 次点：ロリポップ/ConoHa WING（¥678〜）
  → 機能優先：Vercel/AWS
```

---

## 関連記事

- [レンタルサーバー徹底比較2026](/blog/rental-server-comparison-2026) — WordPress・静的サイト向けサーバー比較
- [VPS比較2026](/blog/vps-comparison-2026) — 上級者向けVPS選び
- [Next.js 15完全ガイド2026](/blog/nextjs15-app-router-complete-guide-2026) — App Routerの全機能
- [Terraform AWS完全ガイド](/blog/terraform-aws-guide-2026) — AWSインフラをコードで管理
