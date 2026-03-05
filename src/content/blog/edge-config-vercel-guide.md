---
title: 'Vercel Edge Config実践: グローバル設定のリアルタイム管理'
description: 'Vercel Edge Configを使ったグローバル設定のリアルタイム管理手法を実践的に解説。Feature Flag、A/Bテスト、動的設定の実装パターンとパフォーマンス最適化テクニックを紹介します。'
pubDate: 2025-09-15
updatedDate: 2025-09-15
tags: ['vercel', 'edge-config', 'edge-computing', 'performance', 'feature-flag', 'インフラ']
category: 'infrastructure'
---

## Edge Configとは

Vercel Edge Configは、エッジランタイムで高速にアクセスできるグローバルなKey-Valueストアです。従来のデータベースやAPIコールと異なり、超低レイテンシ(1ms以下)でデータを取得できるため、Feature Flag、A/Bテスト、動的設定に最適です。

### 主な特徴

- **超低レイテンシ**: エッジネットワーク全体にレプリケーション
- **リアルタイム更新**: 数秒でグローバルに反映
- **バージョン管理**: 設定変更履歴の追跡
- **SDKサポート**: Next.js、SvelteKit等で簡単に利用可能

### 従来の設定管理との比較

```typescript
// 従来: 環境変数 (デプロイが必要)
const FEATURE_ENABLED = process.env.NEXT_PUBLIC_FEATURE_ENABLED === 'true';

// 従来: データベース (レイテンシが高い)
const config = await db.config.findUnique({ where: { key: 'feature' } });

// Edge Config: リアルタイム + 低レイテンシ
import { get } from '@vercel/edge-config';
const featureEnabled = await get('feature_enabled');
```

## セットアップ

### 1. Edge Config作成

Vercelダッシュボードまたはコマンドラインで作成します。

```bash
# Vercel CLIでプロジェクトにEdge Configを接続
vercel env add EDGE_CONFIG
# コンソールで生成されたEdge Config URLを貼り付け

# または直接作成
vercel edge-config create my-config
```

### 2. Next.jsプロジェクトへの統合

```bash
npm install @vercel/edge-config
```

```typescript
// lib/edge-config.ts
import { createClient } from '@vercel/edge-config';

export const edgeConfig = createClient(process.env.EDGE_CONFIG);

// 型安全なラッパー
export interface AppConfig {
  featureFlags: {
    newDashboard: boolean;
    betaFeatures: boolean;
    maintenanceMode: boolean;
  };
  abTests: {
    pricingPageVariant: 'A' | 'B' | 'C';
  };
  limits: {
    maxUploadSize: number;
    rateLimit: number;
  };
}

export async function getConfig<K extends keyof AppConfig>(
  key: K
): Promise<AppConfig[K] | undefined> {
  return edgeConfig.get<AppConfig[K]>(key);
}

// すべての設定を一度に取得
export async function getAllConfig(): Promise<Partial<AppConfig>> {
  return edgeConfig.getAll<AppConfig>();
}
```

### 3. Edge Runtime対応ミドルウェア

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { get } from '@vercel/edge-config';

export async function middleware(request: NextRequest) {
  // メンテナンスモードチェック
  const maintenanceMode = await get<boolean>('maintenanceMode');

  if (maintenanceMode && !request.nextUrl.pathname.startsWith('/maintenance')) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // Feature Flagによるルーティング
  const newDashboard = await get<boolean>('featureFlags.newDashboard');

  if (newDashboard && request.nextUrl.pathname === '/dashboard') {
    return NextResponse.rewrite(new URL('/dashboard-v2', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## Feature Flag実装パターン

### 1. コンポーネントレベルのFeature Flag

```typescript
// components/feature-flag.tsx
import { getConfig } from '@/lib/edge-config';

interface FeatureFlagProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export async function FeatureFlag({ flag, children, fallback }: FeatureFlagProps) {
  const flags = await getConfig('featureFlags');
  const isEnabled = flags?.[flag as keyof typeof flags] ?? false;

  if (!isEnabled) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

// 使用例
export default async function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      <FeatureFlag
        flag="newDashboard"
        fallback={<LegacyDashboard />}
      >
        <NewDashboard />
      </FeatureFlag>
    </div>
  );
}
```

### 2. ユーザーセグメント別Feature Flag

```typescript
// lib/feature-flag.ts
import { getConfig } from '@/lib/edge-config';
import { getServerSession } from 'next-auth';

export async function isFeatureEnabled(
  featureName: string,
  userId?: string
): Promise<boolean> {
  const config = await getConfig('featureFlags');
  const feature = config?.[featureName];

  if (!feature) return false;

  // シンプルなBoolean
  if (typeof feature === 'boolean') {
    return feature;
  }

  // ロールアウト率指定
  if (typeof feature === 'object' && 'rollout' in feature) {
    const rollout = feature.rollout as number; // 0-100

    if (!userId) return false;

    // ユーザーIDをハッシュして一貫性のあるロールアウト
    const hash = Array.from(userId).reduce(
      (acc, char) => acc + char.charCodeAt(0),
      0
    );
    return (hash % 100) < rollout;
  }

  // 許可リスト
  if (typeof feature === 'object' && 'allowList' in feature) {
    const allowList = feature.allowList as string[];
    return userId ? allowList.includes(userId) : false;
  }

  return false;
}

// Edge Config設定例
/*
{
  "featureFlags": {
    "newDashboard": true,
    "betaFeatures": {
      "rollout": 25
    },
    "premiumFeature": {
      "allowList": ["user-123", "user-456"]
    }
  }
}
*/
```

### 3. A/Bテスト実装

```typescript
// lib/ab-test.ts
import { getConfig } from '@/lib/edge-config';
import { cookies } from 'next/headers';

export type Variant = 'A' | 'B' | 'C';

export async function getVariant(
  testName: string,
  userId?: string
): Promise<Variant> {
  const cookieStore = cookies();
  const variantCookie = cookieStore.get(`ab_${testName}`);

  // 既存のバリアントがあればそれを使用
  if (variantCookie) {
    return variantCookie.value as Variant;
  }

  // Edge Configから配分設定を取得
  const abTests = await getConfig('abTests');
  const distribution = abTests?.[testName] || { A: 50, B: 50 };

  // ランダムに割り当て
  const variant = assignVariant(distribution, userId);

  // Cookieに保存(クライアント側で設定)
  return variant;
}

function assignVariant(
  distribution: Record<Variant, number>,
  userId?: string
): Variant {
  const random = userId
    ? hashString(userId) % 100
    : Math.floor(Math.random() * 100);

  let cumulative = 0;
  for (const [variant, percentage] of Object.entries(distribution)) {
    cumulative += percentage;
    if (random < cumulative) {
      return variant as Variant;
    }
  }

  return 'A';
}

function hashString(str: string): number {
  return Array.from(str).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

// 使用例
export default async function PricingPage() {
  const variant = await getVariant('pricingPageTest');

  return (
    <div>
      {variant === 'A' && <PricingTableA />}
      {variant === 'B' && <PricingTableB />}
      {variant === 'C' && <PricingTableC />}
    </div>
  );
}
```

## 動的設定管理

### レート制限の動的調整

```typescript
// lib/rate-limit.ts
import { get } from '@vercel/edge-config';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function createRateLimiter() {
  // Edge Configから動的に取得
  const limits = await get<{ rateLimit: number }>('limits');
  const requestsPerMinute = limits?.rateLimit ?? 10;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requestsPerMinute, '1 m'),
  });
}

// API Routeでの使用
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const ratelimit = await createRateLimiter();
  const identifier = request.ip ?? 'anonymous';

  const { success, limit, remaining } = await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  }

  // 処理を続行
  return NextResponse.json({ success: true });
}
```

### 緊急メンテナンスモード

```typescript
// app/layout.tsx
import { get } from '@vercel/edge-config';
import MaintenanceBanner from '@/components/maintenance-banner';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const maintenance = await get<{
    enabled: boolean;
    message: string;
    scheduledAt?: string;
  }>('maintenance');

  return (
    <html lang="ja">
      <body>
        {maintenance?.enabled && (
          <MaintenanceBanner message={maintenance.message} />
        )}
        {children}
      </body>
    </html>
  );
}
```

## パフォーマンス最適化

### 1. バッチ取得で通信回数を削減

```typescript
// ❌ 非効率: 複数回の取得
const feature1 = await get('feature1');
const feature2 = await get('feature2');
const feature3 = await get('feature3');

// ✅ 効率的: 一度に取得
const config = await getAll(['feature1', 'feature2', 'feature3']);
```

### 2. Edge Functionでのキャッシング

```typescript
// lib/cached-config.ts
import { unstable_cache } from 'next/cache';
import { getConfig } from './edge-config';

export const getCachedConfig = unstable_cache(
  async (key: string) => getConfig(key),
  ['edge-config'],
  {
    revalidate: 60, // 60秒キャッシュ
    tags: ['config'],
  }
);

// 必要に応じて手動で再検証
import { revalidateTag } from 'next/cache';

export async function refreshConfig() {
  revalidateTag('config');
}
```

### 3. クライアント側での利用

```typescript
// app/api/config/route.ts
import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/edge-config';

export async function GET() {
  const publicConfig = await getConfig('publicSettings');

  return NextResponse.json(publicConfig, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}

// クライアント側
import useSWR from 'swr';

export function usePublicConfig() {
  return useSWR('/api/config', fetch);
}
```

## 設定更新のベストプラクティス

### Vercel APIを使った自動更新

```typescript
// scripts/update-config.ts
import { fetch } from 'undici';

async function updateEdgeConfig(updates: Record<string, any>) {
  const edgeConfigId = process.env.EDGE_CONFIG_ID!;
  const token = process.env.VERCEL_TOKEN!;

  const response = await fetch(
    `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: Object.entries(updates).map(([key, value]) => ({
          operation: 'update',
          key,
          value,
        })),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update Edge Config: ${await response.text()}`);
  }

  return response.json();
}

// GitHub Actionsでの使用例
/*
name: Update Feature Flags
on:
  workflow_dispatch:
    inputs:
      feature:
        description: 'Feature name'
        required: true
      enabled:
        description: 'Enable feature'
        type: boolean
        required: true

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Update Edge Config
        run: |
          curl -X PATCH \
            "https://api.vercel.com/v1/edge-config/${{ secrets.EDGE_CONFIG_ID }}/items" \
            -H "Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "items": [{
                "operation": "update",
                "key": "featureFlags.${{ inputs.feature }}",
                "value": ${{ inputs.enabled }}
              }]
            }'
*/
```

### 設定スキーマ検証

```typescript
// lib/config-schema.ts
import { z } from 'zod';

export const ConfigSchema = z.object({
  featureFlags: z.object({
    newDashboard: z.boolean(),
    betaFeatures: z.boolean(),
    maintenanceMode: z.boolean(),
  }),
  abTests: z.record(z.string(), z.number()),
  limits: z.object({
    maxUploadSize: z.number().positive(),
    rateLimit: z.number().positive(),
  }),
});

export type ValidatedConfig = z.infer<typeof ConfigSchema>;

// 安全な取得関数
import { getAll } from '@vercel/edge-config';

export async function getValidatedConfig(): Promise<ValidatedConfig> {
  const config = await getAll();
  return ConfigSchema.parse(config);
}
```

## 実践例: カナリアリリース

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { get } from '@vercel/edge-config';

export async function middleware(request: NextRequest) {
  const canaryConfig = await get<{
    enabled: boolean;
    percentage: number;
  }>('canary');

  if (!canaryConfig?.enabled) {
    return NextResponse.next();
  }

  // ユーザーをカナリアグループに振り分け
  const userId = request.cookies.get('user_id')?.value;
  const isCanary = userId
    ? hashString(userId) % 100 < canaryConfig.percentage
    : Math.random() * 100 < canaryConfig.percentage;

  if (isCanary) {
    // 新バージョンにルーティング
    const url = request.nextUrl.clone();
    url.pathname = `/canary${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

function hashString(str: string): number {
  return Array.from(str).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}
```

## まとめ

Vercel Edge Configを活用することで、デプロイ不要でアプリケーション設定をリアルタイムに変更できます。Feature Flag、A/Bテスト、動的レート制限など、現代的なWebアプリケーションに必要な機能を低レイテンシで実現できる強力なツールです。

### 次のステップ

- Edge Configと環境変数の使い分けを検討
- Feature Flagの段階的ロールアウト戦略を設計
- A/Bテスト結果の分析基盤構築
- 設定変更の監査ログ整備
