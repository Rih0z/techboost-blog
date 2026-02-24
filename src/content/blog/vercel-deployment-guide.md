---
title: 'Vercel完全ガイド2026：Next.js・フロントエンドデプロイの決定版'
description: 'Vercelの全機能を徹底解説。自動デプロイ・プレビュー環境・Edge Functions・Analytics・Speed Insights・Blob・Postgres・KV・AI SDK・カスタムドメインまで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['Vercel', 'Deployment', 'DevOps']
---

Vercelは、フロントエンド開発者とフルスタックエンジニアにとって、最も生産性を高めるデプロイプラットフォームの一つだ。Gitプッシュ一発で本番環境・プレビュー環境が立ち上がり、Edge Functions、サーバーレスDB、AI SDKまで統合できる。本記事では2026年時点の最新Vercel機能を徹底的に解説する。

## 目次

1. Vercelとは・他ホスティングサービスとの比較
2. セットアップとGitHub連携
3. 自動デプロイとプレビュー環境
4. 環境変数管理
5. カスタムドメインとSSL証明書
6. Edge Functionsとサーバーレス関数
7. Vercel Analytics・Speed Insights
8. Vercel Blob（ファイルストレージ）
9. Vercel Postgres（サーバーレスDB）
10. Vercel KV（Redis互換キャッシュ）
11. Vercel AI SDK（AI機能統合）
12. Vercel CLI（ローカル開発・デプロイ）
13. Monorepo対応（Turborepo連携）
14. コスト最適化・Proプランの使い方

---

## 1. Vercelとは・他ホスティングサービスとの比較

### Vercelの概要

Vercelは、Next.jsの開発元であるVercel社（旧ZEIT）が提供するフロントエンド特化のクラウドプラットフォームだ。2016年のリリース以来、フロントエンド開発のデファクトスタンダードとしての地位を確立してきた。

主な特徴は以下のとおりだ。

- **ゼロコンフィグデプロイ**: 設定ファイルなしで多くのフレームワークを自動検出
- **グローバルエッジネットワーク**: 世界100以上のリージョンでコンテンツを配信
- **プレビューデプロイ**: プルリクエストごとに独立したプレビューURLを自動生成
- **サーバーレスファースト**: スケーリングの心配なしにAPIを実装
- **統合ストレージ**: Blob、Postgres、KVをダッシュボードから直接プロビジョニング

### 対応フレームワーク一覧

Vercelは以下のフレームワークをネイティブサポートしている。

| フレームワーク | 自動検出 | SSR対応 | Edge対応 |
|---|---|---|---|
| Next.js | あり | あり | あり |
| Nuxt.js | あり | あり | あり |
| SvelteKit | あり | あり | あり |
| Astro | あり | あり | あり |
| Remix | あり | あり | あり |
| Angular | あり | あり | 部分対応 |
| Vue CLI | あり | なし | なし |
| Create React App | あり | なし | なし |
| Gatsby | あり | あり | なし |
| Vite | あり | なし | なし |

### 競合サービスとの比較

#### Vercel vs Netlify

Netlifyは長年Vercelの最大の競合だったが、2026年時点で明確な棲み分けが生まれている。

**Vercel優位な点**:
- Next.jsとの深い統合（App Router、Server Componentsの完全サポート）
- Edge Runtimeの豊富なユースケース
- AI SDKの統合がネイティブ
- より高速なビルドパイプライン

**Netlify優位な点**:
- フォーム処理の組み込みサポート
- A/Bテスト機能がProプランで利用可能
- CMS連携の選択肢が多い

```
# 一般的な推奨分け
- Next.jsプロジェクト         → Vercel
- Hugo / Eleventyなど静的     → Netlifyも選択肢
- フォーム多用サイト          → Netlify
- Edge重視・AI機能必要       → Vercel
```

#### Vercel vs Cloudflare Pages

Cloudflare PagesはWorkers・R2・D1（SQLite）との連携が強みだ。

**Vercel優位な点**:
- Next.js App Routerの完全サポート
- プレビューURLの使い勝手
- ダッシュボードUI・DX（開発者体験）の高さ

**Cloudflare Pages優位な点**:
- 無制限のリクエスト数（Freeプラン）
- Workers KVのスループットが高い
- 独自のエッジアーキテクチャ（V8 isolates）
- ストレージコストが安価

#### Vercel vs AWS Amplify

AWS AmplifyはAWSエコシステムとの親和性が高いが、設定の複雑さでVercelに劣る。

**Vercel優位な点**:
- 圧倒的に簡単なセットアップ
- プレビューデプロイの完成度
- DXの高さ

**AWS Amplify優位な点**:
- AWSサービス（Cognito、DynamoDB、AppSync）との直接統合
- 既存のAWSインフラとの連携が容易
- 大企業向けのコンプライアンス・ガバナンス機能

### Vercelの料金プラン（2026年版）

| プラン | 月額 | 帯域幅 | 関数実行時間 | チームメンバー |
|---|---|---|---|---|
| Hobby | 無料 | 100GB | 100GB-Hrs | 1人 |
| Pro | $20/人 | 1TB | 1,000GB-Hrs | 無制限 |
| Enterprise | カスタム | カスタム | カスタム | 無制限 |

**Hobbyプランの制限事項**:
- 商用利用禁止（個人・非商用プロジェクトのみ）
- カスタムドメインは最大50個
- 同時ビルド数: 1
- Vercel KV・Postgres・Blobは制限あり

---

## 2. セットアップとGitHub連携

### アカウント作成

1. [vercel.com](https://vercel.com) にアクセス
2. 「Start Deploying」をクリック
3. GitHubアカウントでサインアップ（推奨）

GitHubでサインアップすると、リポジトリのインポートが最も簡単になる。GitLab・Bitbucketも対応している。

### 最初のプロジェクトをデプロイする

#### 方法1: GitHub連携でインポート

```bash
# まずNext.jsプロジェクトを作成
npx create-next-app@latest my-app --typescript --tailwind --eslint
cd my-app

# GitHubリポジトリを作成してプッシュ
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/my-app.git
git push -u origin main
```

GitHubにプッシュ後、Vercelダッシュボードで「Add New Project」→「Import Git Repository」を選択。

#### 方法2: Vercel CLIで直接デプロイ

```bash
# Vercel CLIをインストール
npm install -g vercel

# プロジェクトディレクトリで実行
cd my-app
vercel

# 対話形式でセットアップが進む
# ? Set up and deploy "~/my-app"? [Y/n] y
# ? Which scope do you want to deploy to? My Team
# ? Link to existing project? [y/N] n
# ? What's your project's name? my-app
# ? In which directory is your code located? ./
```

### プロジェクト設定の理解

`vercel.json` はプロジェクトルートに置くVercelの設定ファイルだ。

```json
{
  "version": 2,
  "name": "my-app",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "framework": "nextjs",
  "regions": ["nrt1"],
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/old-path",
      "destination": "/new-path"
    }
  ],
  "redirects": [
    {
      "source": "/legacy/:path*",
      "destination": "/new/:path*",
      "permanent": true
    }
  ]
}
```

### リージョン設定

Vercelのサーバーレス関数を特定のリージョンで実行するよう指定できる。

```json
{
  "regions": ["nrt1", "sin1"]
}
```

主要なリージョンコード:

| リージョン | コード | 所在地 |
|---|---|---|
| 東京 | nrt1 | 日本・東京 |
| シンガポール | sin1 | シンガポール |
| 米国東部 | iad1 | バージニア |
| 米国西部 | sfo1 | サンフランシスコ |
| ロンドン | lhr1 | イギリス |
| フランクフルト | fra1 | ドイツ |
| シドニー | syd1 | オーストラリア |

日本向けサービスには `nrt1`（東京）を指定するとレイテンシが最小化される。

---

## 3. 自動デプロイとプレビュー環境

### Git-based Deploymentの仕組み

Vercelの最大の強みの一つが、Gitワークフローとの完全な統合だ。

```
main ブランチへのプッシュ
  → 本番環境デプロイ (yourdomain.com)
  
feature/* ブランチへのプッシュ
  → プレビューデプロイ (feature-name.yourdomain.vercel.app)
  
プルリクエスト作成
  → プレビューデプロイ + PRにコメントで URL通知
```

### ブランチデプロイの設定

デフォルトでは全ブランチがデプロイされるが、制限することも可能だ。

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": true,
      "feature/**": false
    }
  }
}
```

### プレビューデプロイの活用

プレビューデプロイは、コードレビューとデザインレビューを同時に行うための強力なツールだ。

**実践的なワークフロー例**:

```bash
# 機能ブランチを作成
git checkout -b feature/new-landing-page

# 変更を加える
# ... 開発作業 ...

git add .
git commit -m "feat: new landing page design"
git push origin feature/new-landing-page

# GitHubでPRを作成すると
# Vercel Botが自動でPRにコメント:
# "Visit Preview: https://my-app-abc123.vercel.app"
```

**プレビューURLのパターン**:

```
{project-name}-{unique-hash}.vercel.app
または
{project-name}-git-{branch-name}-{username}.vercel.app
```

### デプロイフックの設定

外部サービスからVercelのデプロイをトリガーするためのWebhookを設定できる。

1. Vercelダッシュボード → Settings → Git → Deploy Hooks
2. 「Create Hook」でフック名とブランチを指定
3. 生成されたURLにPOSTリクエストを送信

```bash
# CMSのコンテンツ更新時にデプロイをトリガーする例
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_xxxx/yyyyyyyy"
```

### Deployment Protection（デプロイ保護）

プレビューデプロイへのアクセスを制限する機能だ。

```
Settings → Deployment Protection
- Password Protection: パスワードで保護
- Vercel Authentication: Vercelアカウント必須
- Trusted IPs: 特定IPのみ許可
```

チーム開発時は「Vercel Authentication」を使うと、チームメンバーのみがプレビューにアクセスできる。

### ビルドキャッシュの最適化

Vercelはビルドキャッシュを自動管理するが、手動制御も可能だ。

```bash
# キャッシュを無効化してデプロイ
vercel --force

# 特定のビルドコマンドでキャッシュを制御
# package.json
{
  "scripts": {
    "build": "next build",
    "build:clean": "rm -rf .next && next build"
  }
}
```

### デプロイ通知の設定

Slackなど外部サービスへのデプロイ通知を設定できる。

```
Vercelダッシュボード → Settings → Notifications
- Email通知
- Slack統合（Marketplaceから）
- カスタムWebhook
```

---

## 4. 環境変数管理

### 環境変数の種類

Vercelでは3つの環境で異なる変数を設定できる。

| 環境 | 用途 | 説明 |
|---|---|---|
| Production | 本番環境 | mainブランチのデプロイに適用 |
| Preview | プレビュー環境 | PRおよびブランチデプロイに適用 |
| Development | ローカル開発 | `vercel env pull`でローカルに取得 |

### ダッシュボードからの設定

```
Settings → Environment Variables → Add New
- Name: DATABASE_URL
- Value: postgres://user:pass@host/db
- Environment: Production, Preview, Development（複数選択可）
```

### CLIからの設定

```bash
# 環境変数を追加
vercel env add DATABASE_URL production
# プロンプトで値を入力

# 環境変数を一覧表示
vercel env ls

# 環境変数をローカルに取得（.env.localに保存）
vercel env pull .env.local

# 環境変数を削除
vercel env rm DATABASE_URL production
```

### Next.jsでの環境変数の扱い

```bash
# .env.local（ローカル開発用、.gitignoreに追加すること）
DATABASE_URL=postgres://localhost/mydb
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# クライアントサイドで使用する変数には NEXT_PUBLIC_ プレフィックスが必要
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

```typescript
// app/api/users/route.ts
// サーバーサイドでのみ利用可能
export async function GET() {
  const dbUrl = process.env.DATABASE_URL; // サーバーサイドのみ
  const apiUrl = process.env.NEXT_PUBLIC_API_URL; // クライアント・サーバー両方
  
  // ...
}
```

### 機密情報の安全な管理

```bash
# Vercel CLIで機密情報をシークレットとして保存（非推奨・レガシー）
vercel secrets add my-secret-value "secret_value"

# 推奨: ダッシュボードのEnvironment Variablesで設定
# Sensitiveフラグをオンにすると、設定後は値の閲覧が不可になる
```

### 環境変数のベストプラクティス

```
1. 機密情報（APIキー、DBパスワード）は絶対にコードにハードコードしない
2. .env.local は必ず .gitignore に追加する
3. NEXT_PUBLIC_ プレフィックスは本当に必要な変数のみに使用
4. 本番・開発で異なる値が必要な変数は環境別に設定する
5. Vercelダッシュボードの Sensitive フラグを機密変数に適用する
```

### 環境変数の検証

型安全な環境変数管理には `zod` を使うのが現代的なアプローチだ。

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']),
});

export const env = envSchema.parse(process.env);
```

```typescript
// next.config.ts
import { env } from './lib/env';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ビルド時に環境変数を検証
  // env: { ... }
};

export default nextConfig;
```

---

## 5. カスタムドメインとSSL証明書

### カスタムドメインの追加

```
Vercelダッシュボード → Project → Settings → Domains → Add Domain
```

ドメインを追加すると、Vercelが必要なDNSレコードを表示する。

### DNSの設定方法

#### Vercelをネームサーバーとして使用する場合（推奨）

ドメインレジストラのネームサーバーをVercelのものに変更する。

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

メリット: 自動的に最適なDNS設定が行われる

#### 外部DNSを維持する場合

```
# Aレコード（apex domainの場合）
Type: A
Name: @
Value: 76.76.21.21

# CNAMEレコード（サブドメインの場合）
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### SSL/TLS証明書の自動管理

Vercelはカスタムドメインに対してLet's Encrypt証明書を自動発行・自動更新する。

**証明書の種類**:
- 標準SSL: 自動で発行（無料）
- ワイルドカード証明書: `*.yourdomain.com`（Enterprise向け）

### www リダイレクトの設定

```json
{
  "redirects": [
    {
      "source": "https://www.yourdomain.com/(.*)",
      "destination": "https://yourdomain.com/$1",
      "permanent": true
    }
  ]
}
```

または逆方向:

```json
{
  "redirects": [
    {
      "source": "https://yourdomain.com/(.*)",
      "destination": "https://www.yourdomain.com/$1",
      "permanent": true
    }
  ]
}
```

### 複数ドメインの割り当て

一つのプロジェクトに複数のドメインを割り当てられる。

```
プロジェクト → Settings → Domains:
- yourdomain.com (本番)
- www.yourdomain.com (リダイレクト)
- jp.yourdomain.com (日本語バージョン)
- old-domain.com (旧ドメインからのリダイレクト)
```

### ドメイン検証の自動化

```bash
# Vercel CLI でドメインを追加
vercel domains add yourdomain.com

# DNSの設定状況を確認
vercel domains inspect yourdomain.com

# ドメインの一覧
vercel domains ls
```

---

## 6. Edge FunctionsとServerless Functions

### Serverless Functionsの基本

Vercelでは `api/` ディレクトリにファイルを置くだけでサーバーレスAPIが作れる。

```typescript
// api/hello.ts（pages routerの場合）
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  message: string;
  timestamp: number;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  res.status(200).json({
    message: 'Hello from Vercel!',
    timestamp: Date.now(),
  });
}
```

```typescript
// app/api/hello/route.ts（app routerの場合）
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Hello from Vercel!',
    timestamp: Date.now(),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  return NextResponse.json({
    received: body,
    processed: true,
  });
}
```

### Edge Functionsの概要

Edge FunctionsはVercelのエッジネットワーク上で実行される軽量な関数だ。通常のServerless Functionsと異なり、ユーザーの最も近いリージョンで実行されるためレイテンシが極めて低い。

**Edge Functionsの特徴**:
- 起動時間: 0ms（コールドスタートなし）
- 実行制限: 25MB メモリ、30秒タイムアウト
- Node.js APIの一部は利用不可（ファイルシステムなど）
- Web APIベース（Request/Response APIを使用）

```typescript
// middleware.ts（Edge Runtimeで実行）
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 認証トークンの確認
  const token = request.cookies.get('auth-token')?.value;
  
  // 保護されたルートの処理
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // A/Bテスト用のヘッダー追加
  const response = NextResponse.next();
  response.headers.set('x-variant', Math.random() > 0.5 ? 'a' : 'b');
  
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

### Edge RuntimeをAPIルートで使用する

```typescript
// app/api/geolocation/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  // Vercelのエッジでジオロケーション情報が自動付与される
  const country = request.headers.get('x-vercel-ip-country');
  const city = request.headers.get('x-vercel-ip-city');
  const region = request.headers.get('x-vercel-ip-country-region');
  
  return Response.json({
    country,
    city,
    region,
    message: `こんにちは、${city || '世界'}からのユーザーさん！`,
  });
}
```

### Edge ConfigとEdge Middlewareの組み合わせ

Edge Configは、デプロイなしでアプリの設定を更新できる超低レイテンシのデータストアだ。

```bash
# Vercel CLIでEdge Configを作成
vercel edge-config create my-config

# 値を設定
vercel edge-config set my-config '{"maintenance": false, "featureFlags": {"newUI": true}}'
```

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { get } from '@vercel/edge-config';

export async function middleware(request: NextRequest) {
  // Edge Configからメンテナンスモードの設定を取得
  const maintenance = await get<boolean>('maintenance');
  
  if (maintenance) {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }
  
  return NextResponse.next();
}
```

```bash
npm install @vercel/edge-config
```

### フィーチャーフラグの実装

```typescript
// lib/feature-flags.ts
import { get } from '@vercel/edge-config';

export type FeatureFlags = {
  newDashboard: boolean;
  betaFeature: boolean;
  experimentalAPI: boolean;
};

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const flags = await get<FeatureFlags>('featureFlags');
  return flags ?? {
    newDashboard: false,
    betaFeature: false,
    experimentalAPI: false,
  };
}
```

### Cron Jobs（定期実行）

Vercelでは `vercel.json` でCron Jobを設定できる。

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

```typescript
// app/api/cron/daily-report/route.ts
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Cronトークンで認証（セキュリティのため必須）
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 日次レポートの処理
  await generateDailyReport();
  
  return Response.json({ success: true, timestamp: new Date().toISOString() });
}

async function generateDailyReport() {
  // レポート生成ロジック
  console.log('日次レポートを生成しました');
}
```

---

## 7. Vercel AnalyticsとSpeed Insights

### Vercel Analyticsの概要

Vercel Analyticsはプライバシーファーストのウェブアナリティクスツールだ。Google Analyticsと異なり、個人を特定できる情報を収集せず、EUのGDPRにも準拠している。

**特徴**:
- クッキー不使用
- IPアドレスの収集なし
- ページビュー・ユニークビジター・リファラーを追跡
- リアルタイムデータ表示

### Analyticsのセットアップ

```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### カスタムイベントのトラッキング

```typescript
// components/SignupButton.tsx
'use client';

import { track } from '@vercel/analytics';

export function SignupButton() {
  const handleSignup = () => {
    // カスタムイベントを送信
    track('signup_clicked', {
      plan: 'pro',
      source: 'landing_page',
    });
    
    // サインアップ処理
    window.location.href = '/signup';
  };
  
  return (
    <button onClick={handleSignup}>
      今すぐ登録
    </button>
  );
}
```

```typescript
// eコマースのコンバージョントラッキング例
import { track } from '@vercel/analytics';

export function PurchaseButton({ product }: { product: Product }) {
  const handlePurchase = async () => {
    track('purchase', {
      productId: product.id,
      productName: product.name,
      price: product.price,
      currency: 'JPY',
    });
    
    await initiatePurchase(product.id);
  };
  
  return <button onClick={handlePurchase}>購入する</button>;
}
```

### Speed Insightsの概要

Speed InsightsはCore Web Vitalsを実際のユーザーデータ（RUM: Real User Monitoring）で計測するツールだ。

計測指標:
- **LCP (Largest Contentful Paint)**: メインコンテンツの表示速度
- **FID (First Input Delay)**: 最初の入力に対する応答時間
- **CLS (Cumulative Layout Shift)**: レイアウトのズレ
- **FCP (First Contentful Paint)**: 最初のコンテンツ表示時間
- **TTFB (Time To First Byte)**: サーバー応答時間

### Speed Insightsのセットアップ

```bash
npm install @vercel/speed-insights
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Core Web Vitalsの改善戦略

Speed Insightsのデータをもとに改善を行う際の実践的なアプローチだ。

**LCPの改善**:

```typescript
// next.config.ts
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1年
  },
};

// コンポーネントでの実装
import Image from 'next/image';

export function HeroImage() {
  return (
    <Image
      src="/hero.jpg"
      alt="ヒーロー画像"
      width={1920}
      height={1080}
      priority // LCP要素にはpriorityを設定
      sizes="100vw"
    />
  );
}
```

**CLSの改善**:

```typescript
// スケルトンローダーでレイアウトシフトを防ぐ
export function ArticleCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-48 bg-gray-200 rounded-lg mb-4" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}
```

---

## 8. Vercel Blob（ファイルストレージ）

### Vercel Blobの概要

Vercel Blobは、画像・動画・PDFなどのファイルを保存するためのオブジェクトストレージサービスだ。AWS S3に似た機能を持ちながら、Vercelのエコシステムに完全統合されている。

**料金**:
- Hobbyプラン: 500MB無料
- Proプラン: 5GB無料、以降$0.023/GB

### セットアップ

```bash
npm install @vercel/blob
```

```
Vercelダッシュボード → Storage → Create Database → Blob
```

環境変数 `BLOB_READ_WRITE_TOKEN` が自動的にプロジェクトに追加される。

### ファイルのアップロード

```typescript
// app/api/upload/route.ts
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  
  if (!filename) {
    return NextResponse.json(
      { error: 'filenameが必要です' },
      { status: 400 }
    );
  }
  
  if (!request.body) {
    return NextResponse.json(
      { error: 'ファイルが必要です' },
      { status: 400 }
    );
  }
  
  const blob = await put(filename, request.body, {
    access: 'public',
    addRandomSuffix: true, // ファイル名の衝突を防ぐ
  });
  
  return NextResponse.json(blob);
}
```

### クライアントからのアップロード

```typescript
// components/FileUploader.tsx
'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';

export function FileUploader() {
  const [uploading, setUploading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      
      setBlobUrl(blob.url);
      console.log('アップロード完了:', blob.url);
    } catch (error) {
      console.error('アップロードエラー:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
        accept="image/*"
      />
      {uploading && <p>アップロード中...</p>}
      {blobUrl && (
        <div>
          <p>アップロード完了！</p>
          <img src={blobUrl} alt="アップロードされた画像" />
        </div>
      )}
    </div>
  );
}
```

### Server-side Uploadパターン

```typescript
// app/api/upload/route.ts（サーバー側でのClientアップロード処理）
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // アップロード前の認証チェック
        // const session = await getServerSession();
        // if (!session) throw new Error('Unauthorized');
        
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
          maximumSizeInBytes: 5 * 1024 * 1024, // 5MB
          tokenPayload: JSON.stringify({
            // カスタムデータをトークンに含める
            userId: 'user_123',
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // アップロード完了後の処理（DBへの保存など）
        console.log('アップロード完了:', blob.url);
        
        const payload = JSON.parse(tokenPayload ?? '{}');
        // DBにメタデータを保存
        // await db.file.create({ url: blob.url, userId: payload.userId });
      },
    });
    
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
```

### ファイルの一覧取得と削除

```typescript
// ファイル一覧の取得
import { list } from '@vercel/blob';

export async function listFiles() {
  const { blobs } = await list({
    prefix: 'uploads/', // 特定のディレクトリのみ
    limit: 50,
  });
  
  return blobs.map(blob => ({
    url: blob.url,
    pathname: blob.pathname,
    size: blob.size,
    uploadedAt: blob.uploadedAt,
  }));
}

// ファイルの削除
import { del } from '@vercel/blob';

export async function deleteFile(url: string) {
  await del(url);
  console.log('削除完了:', url);
}

// 複数ファイルの一括削除
export async function deleteFiles(urls: string[]) {
  await del(urls);
  console.log(`${urls.length}件のファイルを削除しました`);
}
```

---

## 9. Vercel Postgres（サーバーレスDB）

### Vercel Postgresの概要

Vercel Postgresは、NeonをベースにしたサーバーレスPostgreSQLデータベースサービスだ。デプロイ環境（Production/Preview/Development）ごとに独立したデータベースを作成でき、ブランチデプロイと連動した開発ワークフローを実現する。

**特徴**:
- サーバーレス: 使用時のみ課金
- ブランチDB: Previewデプロイごとに独立したDB環境
- 接続プーリング: pgBouncerによる接続管理

### セットアップ

```
Vercelダッシュボード → Storage → Create Database → Postgres
```

プロジェクトに接続すると、以下の環境変数が自動追加される:

```bash
POSTGRES_URL=postgres://user:pass@host/db?sslmode=require
POSTGRES_PRISMA_URL=postgres://user:pass@host/db?sslmode=require&pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgres://user:pass@host/db?sslmode=require
POSTGRES_USER=user
POSTGRES_HOST=host
POSTGRES_PASSWORD=pass
POSTGRES_DATABASE=db
```

### @vercel/postgresを使った基本操作

```bash
npm install @vercel/postgres
```

```typescript
// lib/db.ts
import { sql } from '@vercel/postgres';

// テーブルの作成
export async function createTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      content TEXT,
      published BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

// ユーザーの作成
export async function createUser(email: string, name: string) {
  const { rows } = await sql`
    INSERT INTO users (email, name)
    VALUES (${email}, ${name})
    RETURNING *
  `;
  return rows[0];
}

// ユーザーの取得
export async function getUserByEmail(email: string) {
  const { rows } = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;
  return rows[0] ?? null;
}

// 投稿の一覧取得
export async function getPublishedPosts(limit = 10, offset = 0) {
  const { rows } = await sql`
    SELECT 
      p.*,
      u.name AS author_name,
      u.email AS author_email
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.published = true
    ORDER BY p.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  return rows;
}
```

### DrizzleORMとの統合

```bash
npm install drizzle-orm drizzle-kit
```

```typescript
// lib/schema.ts
import { pgTable, serial, varchar, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content'),
  published: boolean('published').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

```typescript
// lib/db.ts
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

export const db = drizzle(sql, { schema });
```

```typescript
// Drizzle ORMを使ったクエリ
import { db } from '@/lib/db';
import { users, posts } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// ユーザー作成
const newUser = await db.insert(users).values({
  email: 'user@example.com',
  name: '山田太郎',
}).returning();

// 投稿の取得（JOINあり）
const publishedPosts = await db
  .select({
    id: posts.id,
    title: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .leftJoin(users, eq(posts.userId, users.id))
  .where(eq(posts.published, true))
  .orderBy(desc(posts.createdAt))
  .limit(10);
```

### マイグレーションの管理

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.POSTGRES_URL!,
  },
} satisfies Config;
```

```bash
# マイグレーションファイルの生成
npx drizzle-kit generate:pg

# マイグレーションの実行
npx drizzle-kit push:pg

# Drizzle Studioを起動（GUIでDBを操作）
npx drizzle-kit studio
```

---

## 10. Vercel KV（Redis互換キャッシュ）

### Vercel KVの概要

Vercel KVはUpstash Redisをバックエンドとしたサーバーレスのキー・バリューストアだ。セッション管理・キャッシュ・レート制限など、高速な読み書きが必要なユースケースに適している。

**特徴**:
- Redis互換API
- グローバルレプリケーション
- Serverless・Edgeランタイム対応
- 接続なしのHTTPベースAPI

### セットアップ

```
Vercelダッシュボード → Storage → Create Database → KV
```

```bash
npm install @vercel/kv
```

環境変数:
```bash
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=xxx
KV_REST_API_READ_ONLY_TOKEN=xxx
```

### 基本操作

```typescript
// lib/kv.ts
import { kv } from '@vercel/kv';

// 文字列の保存と取得
export async function setString(key: string, value: string, expiresInSeconds?: number) {
  if (expiresInSeconds) {
    await kv.set(key, value, { ex: expiresInSeconds });
  } else {
    await kv.set(key, value);
  }
}

export async function getString(key: string): Promise<string | null> {
  return kv.get<string>(key);
}

// オブジェクトの保存
export async function setObject<T>(key: string, value: T, ttl?: number) {
  await kv.set(key, JSON.stringify(value), ttl ? { ex: ttl } : undefined);
}

export async function getObject<T>(key: string): Promise<T | null> {
  const value = await kv.get<string>(key);
  if (!value) return null;
  return JSON.parse(value) as T;
}

// カウンターの実装
export async function incrementCounter(key: string): Promise<number> {
  return kv.incr(key);
}

// キーの削除
export async function deleteKey(key: string): Promise<void> {
  await kv.del(key);
}
```

### レート制限の実装

```typescript
// lib/rate-limit.ts
import { kv } from '@vercel/kv';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  windowInSeconds: number = 60
): Promise<RateLimitResult> {
  const key = `rate_limit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowInSeconds;
  
  // Sliding Window アルゴリズム
  const pipeline = kv.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, { score: now, member: now.toString() });
  pipeline.zcard(key);
  pipeline.expire(key, windowInSeconds);
  
  const results = await pipeline.exec();
  const requestCount = results[2] as number;
  
  return {
    success: requestCount <= limit,
    limit,
    remaining: Math.max(0, limit - requestCount),
    reset: now + windowInSeconds,
  };
}
```

```typescript
// app/api/contact/route.ts
import { rateLimit } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // IPアドレスベースのレート制限
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success, remaining } = await rateLimit(ip, 5, 3600); // 1時間に5回まで
  
  if (!success) {
    return NextResponse.json(
      { error: 'リクエスト上限に達しました。しばらく後にお試しください。' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  }
  
  const body = await request.json();
  // お問い合わせ処理...
  
  return NextResponse.json({ success: true });
}
```

### セッション管理

```typescript
// lib/session.ts
import { kv } from '@vercel/kv';
import { randomUUID } from 'crypto';

interface Session {
  userId: string;
  email: string;
  createdAt: number;
  lastAccessedAt: number;
}

const SESSION_TTL = 60 * 60 * 24 * 7; // 7日間

export async function createSession(userId: string, email: string): Promise<string> {
  const sessionId = randomUUID();
  const session: Session = {
    userId,
    email,
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
  };
  
  await kv.set(`session:${sessionId}`, session, { ex: SESSION_TTL });
  return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const session = await kv.get<Session>(`session:${sessionId}`);
  if (!session) return null;
  
  // アクセス時間を更新
  session.lastAccessedAt = Date.now();
  await kv.set(`session:${sessionId}`, session, { ex: SESSION_TTL });
  
  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await kv.del(`session:${sessionId}`);
}
```

### キャッシュパターンの実装

```typescript
// lib/cache.ts
import { kv } from '@vercel/kv';

// Cache-aside パターン
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlInSeconds: number = 300
): Promise<T> {
  // キャッシュの確認
  const cached = await kv.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // データを取得
  const data = await fetcher();
  
  // キャッシュに保存
  await kv.set(key, data, { ex: ttlInSeconds });
  
  return data;
}

// 使用例
export async function getPopularArticles() {
  return withCache(
    'popular_articles',
    async () => {
      // DBからデータを取得
      const articles = await db.query.posts.findMany({
        where: eq(posts.published, true),
        orderBy: desc(posts.viewCount),
        limit: 10,
      });
      return articles;
    },
    300 // 5分間キャッシュ
  );
}
```

---

## 11. Vercel AI SDK（AI機能統合）

### Vercel AI SDKの概要

Vercel AI SDKは、AIアプリケーションを構築するためのTypeScript/JavaScriptライブラリだ。OpenAI、Anthropic、Google Gemini、Meta Llamaなど主要なLLMプロバイダーに対応している。

**主な機能**:
- ストリーミングレスポンスのネイティブサポート
- テキスト生成・チャット・画像生成
- 構造化データ出力（Structured Output）
- エージェント・ツール呼び出し
- RAG（Retrieval-Augmented Generation）パターン

### インストールとセットアップ

```bash
# Core SDKとプロバイダーをインストール
npm install ai @ai-sdk/openai @ai-sdk/anthropic

# または特定のプロバイダーのみ
npm install ai @ai-sdk/openai
```

```bash
# 環境変数の設定
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

### ストリーミングチャットの実装

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30; // Proプランは最大300秒

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = await streamText({
    model: openai('gpt-4o'),
    system: 'あなたは親切な日本語アシスタントです。',
    messages,
    maxTokens: 2000,
    temperature: 0.7,
  });
  
  return result.toDataStreamResponse();
}
```

```typescript
// app/chat/page.tsx
'use client';

import { useChat } from 'ai/react';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });
  
  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <span>考え中...</span>
            </div>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="メッセージを入力..."
          className="flex-1 border rounded-lg px-4 py-2"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          送信
        </button>
      </form>
    </div>
  );
}
```

### 構造化データ出力

```typescript
// app/api/extract/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().describe('商品名'),
  price: z.number().describe('価格（円）'),
  category: z.enum(['electronics', 'clothing', 'food', 'other']).describe('カテゴリ'),
  features: z.array(z.string()).describe('主な特徴のリスト'),
  rating: z.number().min(0).max(5).describe('評価（0-5）'),
});

export async function POST(req: Request) {
  const { text } = await req.json();
  
  const { object } = await generateObject({
    model: anthropic('claude-opus-4-6'),
    schema: productSchema,
    prompt: `以下のテキストから商品情報を抽出してください:\n\n${text}`,
  });
  
  return Response.json(object);
}
```

### ツール呼び出し（Function Calling）

```typescript
// app/api/agent/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
    tools: {
      // 天気情報ツール
      getWeather: tool({
        description: '指定した都市の天気情報を取得します',
        parameters: z.object({
          city: z.string().describe('都市名（例: 東京、大阪）'),
        }),
        execute: async ({ city }) => {
          // 実際の天気APIを呼び出す
          const weather = await fetchWeather(city);
          return {
            city,
            temperature: weather.temp,
            condition: weather.condition,
            humidity: weather.humidity,
          };
        },
      }),
      
      // 計算ツール
      calculate: tool({
        description: '数式を計算します',
        parameters: z.object({
          expression: z.string().describe('計算式（例: 1 + 2 * 3）'),
        }),
        execute: async ({ expression }) => {
          // 安全な計算実装
          try {
            const result = eval(expression); // 実際はより安全な実装を使用
            return { result, expression };
          } catch {
            return { error: '計算できません' };
          }
        },
      }),
    },
  });
  
  return result.toDataStreamResponse();
}

async function fetchWeather(city: string) {
  // 天気APIの呼び出し（実装省略）
  return { temp: 22, condition: '晴れ', humidity: 60 };
}
```

### マルチモーダル入力

```typescript
// app/api/vision/route.ts
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(req: Request) {
  const formData = await req.formData();
  const image = formData.get('image') as File;
  const question = formData.get('question') as string;
  
  const imageBuffer = await image.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString('base64');
  
  const { text } = await generateText({
    model: openai('gpt-4o'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: base64Image,
            mimeType: image.type as 'image/jpeg' | 'image/png' | 'image/webp',
          },
          {
            type: 'text',
            text: question,
          },
        ],
      },
    ],
  });
  
  return Response.json({ answer: text });
}
```

---

## 12. Vercel CLI（ローカル開発・デプロイ）

### CLIのインストールと認証

```bash
# グローバルインストール
npm install -g vercel

# pnpmの場合
pnpm add -g vercel

# 認証
vercel login

# ブラウザが開いてVercelアカウントでログイン
# または: vercel login --github
```

### プロジェクト管理

```bash
# 新規プロジェクトのセットアップ
vercel

# 特定のプロジェクトにリンク
vercel link

# プロジェクト一覧
vercel ls

# プロジェクトの詳細
vercel inspect

# 環境変数をローカルに取得
vercel env pull .env.local
```

### デプロイコマンド

```bash
# プレビューデプロイ（デフォルト）
vercel

# 本番環境にデプロイ
vercel --prod

# 特定のブランチをデプロイ
vercel --prod --scope my-team

# ローカルビルドをデプロイ（CIに最適）
vercel build
vercel deploy --prebuilt

# デプロイ一覧
vercel deployments

# 特定のデプロイの詳細
vercel inspect [deployment-url]

# デプロイの削除
vercel remove [deployment-url]
```

### ローカル開発サーバー

```bash
# Vercel Devでローカル開発
vercel dev

# これにより以下が有効になる:
# - サーバーレス関数のローカル実行
# - 環境変数の自動読み込み
# - Edge Middlewareのエミュレーション
# - ルーティングのエミュレーション
```

### ログの確認

```bash
# 最新のデプロイログ
vercel logs

# 特定のデプロイのログ
vercel logs [deployment-url]

# リアルタイムログ（ストリーミング）
vercel logs --follow

# フィルタリング
vercel logs --level=error
```

### ドメイン管理

```bash
# ドメインの追加
vercel domains add yourdomain.com

# ドメイン一覧
vercel domains ls

# ドメインの削除
vercel domains rm yourdomain.com

# ドメインの検証状況確認
vercel domains inspect yourdomain.com

# DNSレコードの追加
vercel dns add yourdomain.com A 76.76.21.21
vercel dns add yourdomain.com CNAME www cname.vercel-dns.com

# DNSレコード一覧
vercel dns ls yourdomain.com
```

### チーム管理

```bash
# チームの切り替え
vercel switch my-team

# チームメンバーの招待
vercel teams invite user@example.com

# チーム一覧
vercel teams ls
```

### CI/CD での CLI 使用

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 13. Monorepo対応（Turborepo連携）

### Turborepoとは

TurborepoはVercel社が開発するモノレポ向けのビルドシステムだ。タスクの依存関係グラフを解析し、並列ビルド・キャッシュを活用して開発速度を劇的に向上させる。

### モノレポのセットアップ

```bash
# Turborepoを使った新規モノレポの作成
npx create-turbo@latest my-monorepo

# 既存プロジェクトへの追加
cd existing-project
npx create-turbo@latest
```

**ディレクトリ構造**:

```
my-monorepo/
├── apps/
│   ├── web/           # Next.jsメインサイト
│   ├── admin/         # 管理画面
│   └── docs/          # ドキュメントサイト
├── packages/
│   ├── ui/            # 共有UIコンポーネント
│   ├── config/        # 共有設定（ESLint, TypeScript）
│   ├── database/      # DB関連（Drizzle schema等）
│   └── utils/         # 共有ユーティリティ
├── turbo.json
└── package.json
```

### turbo.json の設定

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "test/**"],
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

### 共有パッケージの作成

```typescript
// packages/ui/src/components/Button.tsx
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  type = 'button',
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    ghost: 'text-gray-700 hover:bg-gray-100',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-md font-medium transition-colors
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  );
}
```

```json
// packages/ui/package.json
{
  "name": "@my-monorepo/ui",
  "version": "0.0.0",
  "exports": {
    ".": "./src/index.ts"
  },
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

```json
// apps/web/package.json
{
  "name": "web",
  "dependencies": {
    "@my-monorepo/ui": "*",
    "@my-monorepo/utils": "*"
  }
}
```

### Vercelでのモノレポデプロイ

```
Vercelダッシュボード → New Project → Import Repository → Configure:
- Root Directory: apps/web（デプロイするアプリを指定）
- Build Command: cd ../.. && turbo run build --filter=web
- Install Command: npm install
```

`vercel.json` での設定（ルートに配置）:

```json
{
  "buildCommand": "turbo run build --filter=web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "npm install"
}
```

### Turboのリモートキャッシュ

VercelはTurborepoのリモートキャッシュとして機能する。ローカルとCI環境でビルドキャッシュを共有できる。

```bash
# Vercelのリモートキャッシュに接続
npx turbo login
npx turbo link

# キャッシュが有効な状態でビルド
npx turbo run build
# キャッシュHIT時: "cache hit, replaying logs"
```

```yaml
# GitHub ActionsでのTurboキャッシュ設定
- name: Build
  run: npx turbo run build
  env:
    TURBO_TOKEN: ${{ secrets.VERCEL_TOKEN }}
    TURBO_TEAM: ${{ vars.VERCEL_TEAM_ID }}
```

---

## 14. コスト最適化・Proプランの使い方

### Hobbyプランの上限を知る

Hobbyプランでは商用利用が禁止されているが、個人プロジェクトやオープンソースには十分な機能が提供される。

**Hobbyプランの実用的な制限**:

```
帯域幅: 100GB/月
サーバーレス関数実行時間: 100GB-Hours/月
ビルド時間: 6,000分/月
同時ビルド: 1
Vercel KV: 30MB, 30,000リクエスト/日
Vercel Postgres: 256MB, 60時間コンピュート/月
Vercel Blob: 500MB ストレージ
```

### Proプランへのアップグレードを検討するタイミング

```
1. 商用プロジェクトへの移行時
2. 帯域幅が100GB/月を超えそうな時
3. チームでの共同開発が必要な時
4. 高度な分析機能（Analyticsの詳細データ）が必要な時
5. サーバーレス関数の実行時間を延ばしたい時
```

### コスト最適化のテクニック

#### 帯域幅の最適化

```typescript
// next.config.ts
const nextConfig = {
  images: {
    // 適切なサイズの画像を生成
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // WebP/AVIFで圧縮
    formats: ['image/avif', 'image/webp'],
    // 長期キャッシュ
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  
  // 静的ファイルの長期キャッシュ
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

#### サーバーレス関数の最適化

```typescript
// 関数のコールドスタートを最小化するためのベストプラクティス

// 悪い例: 関数ごとに重いライブラリをインポート
import { HeavyLibrary } from 'heavy-library'; // バンドルサイズが増大

// 良い例: 動的インポートで必要な時だけロード
export async function GET() {
  const { processData } = await import('@/lib/processor');
  const result = await processData();
  return Response.json(result);
}
```

```json
// vercel.json で関数サイズと実行時間を制御
{
  "functions": {
    "api/heavy-process.ts": {
      "maxDuration": 60,
      "memory": 1024
    },
    "api/simple-query.ts": {
      "maxDuration": 10,
      "memory": 256
    }
  }
}
```

#### ISR（インクリメンタル静的再生成）の活用

ISRは静的生成のパフォーマンスとサーバーサイドレンダリングの鮮度を両立する技術だ。

```typescript
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';

interface Props {
  params: { slug: string };
}

// 静的パスの生成
export async function generateStaticParams() {
  const posts = await fetchAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// ISRの設定: 60秒ごとに再生成
export const revalidate = 60;

export default async function BlogPost({ params }: Props) {
  const post = await fetchPost(params.slug);
  
  if (!post) {
    notFound();
  }
  
  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}

async function fetchPost(slug: string) {
  // CMSやDBからデータ取得
  const res = await fetch(`https://api.example.com/posts/${slug}`, {
    next: { revalidate: 60 },
  });
  
  if (!res.ok) return null;
  return res.json();
}
```

#### キャッシュ戦略の最適化

```typescript
// app/api/products/route.ts
export async function GET() {
  const products = await fetchProducts();
  
  return Response.json(products, {
    headers: {
      // 5分間のブラウザキャッシュ + Vercel CDNキャッシュ
      'Cache-Control': 's-maxage=300, stale-while-revalidate=59',
    },
  });
}
```

### Proプラン活用のベストプラクティス

#### チームワークフロー

```
1. Deployment Protection を全プレビューに設定
   → 競合・顧客への事前公開を防止

2. 本番デプロイの承認フロー
   Settings → General → Deployment Protection → Require Approval
   → シニアエンジニアのApprovalなしで本番デプロイ不可

3. ブランチデプロイの整理
   → 古いプレビューURLを定期的に削除して容量削減
```

#### コスト監視

```
Vercelダッシュボード → Usage
- 帯域幅の使用量をリアルタイム確認
- 関数実行時間の監視
- Spending Limitsを設定してコスト上限を管理
```

```json
// vercel.json でSpending Limitsを設定
{
  "spendingLimits": {
    "analyticsUsageLimitInDollars": 10,
    "bandwidthUsageLimitInGB": 500
  }
}
```

### Enterpriseプランが必要なケース

```
1. SLA保証が必要な場合（99.99%アップタイム）
2. SOC 2 Type II コンプライアンスが必要
3. シングルテナント環境が必要
4. IP制限・VPN接続が必要
5. 高度なアクセス制御（SAML SSO）が必要
6. カスタムSLA・専任サポートが必要
```

---

## まとめ

Vercelは、フロントエンド開発からフルスタックアプリケーションまで、モダンなWebアプリケーションを最速でデプロイできるプラットフォームだ。

2026年時点での主要ポイントをまとめる。

**デプロイの核心**:
- Gitプッシュで自動デプロイ・プレビュー環境が即座に立ち上がる
- `vercel.json` で細かいルーティング・ヘッダー・リダイレクトを制御
- CLIを使ったCI/CDパイプラインの構築が容易

**ストレージの統合**:
- Blob: ファイルアップロードを5行で実装
- Postgres: サーバーレスSQLをDrizzle ORMと組み合わせて型安全に
- KV: セッション管理・レート制限・キャッシュをRedis互換APIで

**パフォーマンス**:
- Edge Functionsでコールドスタートゼロの超低レイテンシAPIを実現
- Speed Insightsで実際のユーザーデータに基づいたCore Web Vitals改善
- ISRとキャッシュ戦略でサーバーコストを最小化

**AI統合**:
- Vercel AI SDKでストリーミングチャット・構造化出力・マルチモーダル入力を数十行で実装
- OpenAI・Anthropic・Gemini等の主要LLMをプロバイダー抽象化で切り替え可能

**コスト管理**:
- 個人プロジェクトはHobbyプランで十分な場合が多い
- ISR・CDNキャッシュ・適切な関数サイジングでコストを最適化
- Spending Limitsで予期しない課金を防止

---

## 開発ツールの紹介

Vercelでデプロイしたアプリケーションの開発効率をさらに上げたい場合は、**DevToolBox**（[usedevtools.com](https://usedevtools.com)）が役に立つ。

DevToolBoxは開発者向けのオールインワンツールセットだ。JSONフォーマッター・Base64エンコーダー・カラーピッカー・正規表現テスター・JWT デコーダーなど、日常的な開発作業で繰り返し使うツールを一か所に集約している。

特にVercel上のAPI開発では、レスポンスのJSONを素早くフォーマットしたり、JWTトークンの内容を確認したりする作業が頻繁に発生する。DevToolBoxをブラウザのブックマークに登録しておくだけで、ターミナルとブラウザを行き来する手間が大幅に減る。

---

## 参考リソース

- [Vercel公式ドキュメント](https://vercel.com/docs)
- [Vercel AI SDK ドキュメント](https://sdk.vercel.ai/docs)
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [Turborepo公式ドキュメント](https://turbo.build/repo/docs)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team)
- [Vercel Blob ドキュメント](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Postgres ドキュメント](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel KV ドキュメント](https://vercel.com/docs/storage/vercel-kv)
