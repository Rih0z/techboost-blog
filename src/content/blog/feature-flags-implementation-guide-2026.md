---
title: 'フィーチャーフラグ実装ガイド2026｜LaunchDarkly・Unleash・自前実装の比較と実践'
description: 'フィーチャーフラグの設計と実装を解説する2026年版ガイド。LaunchDarkly・Unleash・自前実装のコスト比較、React/Next.jsでの統合、A/Bテストや段階的ロールアウトの運用パターン、CI/CD連携までコード例付きで解説。'
pubDate: '2026-03-05'
tags: ['フィーチャーフラグ', 'DevOps', 'React', 'TypeScript', 'アーキテクチャ']
heroImage: '../../assets/thumbnails/feature-flags-implementation-guide-2026.jpg'
---

## フィーチャーフラグとは

フィーチャーフラグ（Feature Flag / Feature Toggle）は、**コードをデプロイせずに機能のON/OFFを切り替える**仕組みです。

### なぜフィーチャーフラグが必要か

```
従来のデプロイ:
  開発 → テスト → デプロイ → 全ユーザーに公開
  問題発生 → 切り戻しデプロイ（数分〜数十分のダウンタイム）

フィーチャーフラグ:
  開発 → テスト → デプロイ（フラグOFF） → 段階的にON
  問題発生 → フラグOFF（数秒で無効化、ダウンタイムなし）
```

### フィーチャーフラグの種類

| 種類 | 用途 | ライフサイクル |
|------|------|-------------|
| **リリースフラグ** | 新機能の段階的公開 | 短期（数日〜数週間） |
| **実験フラグ** | A/Bテスト | 中期（数週間〜数ヶ月） |
| **運用フラグ** | メンテナンスモード切替 | 長期（永続） |
| **パーミッションフラグ** | プラン別機能制御 | 永続 |

---

## ツール比較

| 機能 | LaunchDarkly | Unleash | 自前実装 |
|------|-------------|---------|---------|
| 料金 | $10/月〜 | OSS無料 | 無料 |
| セットアップ | 簡単 | 中程度 | 大変 |
| SDK | 25+言語 | 15+言語 | 自作 |
| A/Bテスト | ◎ | ○ | △ |
| 段階的ロールアウト | ◎ | ◎ | △ |
| 分析ダッシュボード | ◎ | ○ | × |
| セルフホスト | × | ◎ | ◎ |

---

## 自前実装（シンプル版）

### データベーススキーマ

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,

  -- 段階的ロールアウト（0-100%）
  rollout_percentage INTEGER DEFAULT 0,

  -- 対象ユーザー（JSON配列）
  target_users JSONB DEFAULT '[]',

  -- 対象属性条件
  targeting_rules JSONB DEFAULT '[]',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 例: フラグを作成
INSERT INTO feature_flags (key, description, enabled, rollout_percentage)
VALUES ('new_checkout_flow', '新しい決済フロー', true, 30);
```

### フラグ評価ロジック（TypeScript）

```typescript
// lib/feature-flags.ts
import { db } from './database';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers: string[];
  targetingRules: TargetingRule[];
}

interface TargetingRule {
  attribute: string;
  operator: 'eq' | 'neq' | 'in' | 'contains';
  value: string | string[];
}

interface UserContext {
  id: string;
  email?: string;
  plan?: string;
  country?: string;
  [key: string]: unknown;
}

export async function isFeatureEnabled(
  flagKey: string,
  user: UserContext
): Promise<boolean> {
  const flag = await db.query<FeatureFlag>(
    'SELECT * FROM feature_flags WHERE key = $1',
    [flagKey]
  ).then(r => r.rows[0]);

  if (!flag || !flag.enabled) return false;

  // 1. 対象ユーザーリストに含まれるか
  if (flag.targetUsers.includes(user.id)) return true;

  // 2. ターゲティングルールの評価
  if (flag.targetingRules.length > 0) {
    const matchesRules = flag.targetingRules.every(rule =>
      evaluateRule(rule, user)
    );
    if (!matchesRules) return false;
  }

  // 3. ロールアウト率による判定（ユーザーIDのハッシュで決定的に）
  if (flag.rolloutPercentage < 100) {
    const hash = simpleHash(`${flagKey}:${user.id}`);
    const bucket = hash % 100;
    return bucket < flag.rolloutPercentage;
  }

  return true;
}

function evaluateRule(rule: TargetingRule, user: UserContext): boolean {
  const value = user[rule.attribute];
  switch (rule.operator) {
    case 'eq': return value === rule.value;
    case 'neq': return value !== rule.value;
    case 'in': return Array.isArray(rule.value) && rule.value.includes(String(value));
    case 'contains': return String(value).includes(String(rule.value));
    default: return false;
  }
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
```

---

## React/Next.jsでの統合

### フィーチャーフラグProvider

```tsx
// providers/FeatureFlagProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface FeatureFlags {
  [key: string]: boolean;
}

const FeatureFlagContext = createContext<FeatureFlags>({});

export function FeatureFlagProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string;
}) {
  const [flags, setFlags] = useState<FeatureFlags>({});

  useEffect(() => {
    fetch(`/api/feature-flags?userId=${userId}`)
      .then(res => res.json())
      .then(setFlags);
  }, [userId]);

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(key: string): boolean {
  const flags = useContext(FeatureFlagContext);
  return flags[key] ?? false;
}
```

### コンポーネントでの使用

```tsx
// components/CheckoutButton.tsx
'use client';

import { useFeatureFlag } from '@/providers/FeatureFlagProvider';

export function CheckoutButton() {
  const useNewCheckout = useFeatureFlag('new_checkout_flow');

  if (useNewCheckout) {
    return <NewCheckoutFlow />;
  }

  return <LegacyCheckoutFlow />;
}
```

### Server Componentでの使用

```tsx
// app/dashboard/page.tsx
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getUser } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await getUser();

  const showAnalytics = await isFeatureEnabled('dashboard_analytics', {
    id: user.id,
    plan: user.plan,
  });

  return (
    <div>
      <h1>ダッシュボード</h1>
      <Overview />
      {showAnalytics && <AnalyticsPanel />}
    </div>
  );
}
```

---

## Unleash（OSS）での実装

### セットアップ

```bash
# Docker Composeで起動
docker compose up -d

# docker-compose.yml
# services:
#   unleash:
#     image: unleashorg/unleash-server:latest
#     ports:
#       - "4242:4242"
#     environment:
#       DATABASE_URL: postgres://unleash:password@db/unleash
```

### SDK統合（Node.js）

```typescript
import { initialize } from 'unleash-client';

const unleash = initialize({
  url: 'http://localhost:4242/api/',
  appName: 'my-app',
  customHeaders: {
    Authorization: 'default:development.unleash-insecure-api-token',
  },
});

// フラグの評価
function checkFeature(flagName: string, userId: string): boolean {
  return unleash.isEnabled(flagName, {
    userId,
    properties: {
      plan: 'pro',
    },
  });
}
```

### React SDK

```tsx
import { FlagProvider, useFlag } from '@unleash/proxy-client-react';

// プロバイダー設定
function App() {
  return (
    <FlagProvider
      config={{
        url: 'https://unleash-proxy.example.com/proxy',
        clientKey: 'proxy-client-key',
        appName: 'my-react-app',
      }}
    >
      <MyComponent />
    </FlagProvider>
  );
}

// コンポーネントでの使用
function MyComponent() {
  const newUI = useFlag('new_ui_design');

  return newUI ? <NewDesign /> : <OldDesign />;
}
```

---

## A/Bテストの実装

```typescript
// lib/ab-testing.ts
interface Experiment {
  key: string;
  variants: {
    name: string;
    weight: number; // 0-100
  }[];
}

export function getVariant(
  experiment: Experiment,
  userId: string
): string {
  const hash = simpleHash(`${experiment.key}:${userId}`);
  const bucket = hash % 100;

  let accumulated = 0;
  for (const variant of experiment.variants) {
    accumulated += variant.weight;
    if (bucket < accumulated) {
      return variant.name;
    }
  }

  return experiment.variants[0].name;
}

// 使用例
const checkoutExperiment: Experiment = {
  key: 'checkout_redesign',
  variants: [
    { name: 'control', weight: 50 },   // 従来版 50%
    { name: 'variant_a', weight: 25 },  // デザインA 25%
    { name: 'variant_b', weight: 25 },  // デザインB 25%
  ],
};

// Reactコンポーネント
function CheckoutPage({ userId }: { userId: string }) {
  const variant = getVariant(checkoutExperiment, userId);

  switch (variant) {
    case 'variant_a': return <CheckoutA />;
    case 'variant_b': return <CheckoutB />;
    default: return <CheckoutControl />;
  }
}
```

### 結果の追跡

```typescript
// イベント送信
async function trackExperimentEvent(
  experimentKey: string,
  variant: string,
  userId: string,
  event: string
) {
  await fetch('/api/analytics/experiment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      experimentKey,
      variant,
      userId,
      event, // 'purchase', 'signup', 'click_cta' 等
      timestamp: new Date().toISOString(),
    }),
  });
}
```

---

## 段階的ロールアウト

### カナリアリリース

```typescript
// 段階的に公開範囲を広げる
const rolloutSchedule = [
  { percentage: 1, duration: '1日', check: 'エラー率 < 0.1%' },
  { percentage: 5, duration: '1日', check: 'レスポンスタイム正常' },
  { percentage: 25, duration: '2日', check: 'ユーザーフィードバック確認' },
  { percentage: 50, duration: '3日', check: 'KPI確認' },
  { percentage: 100, duration: '-', check: '全ユーザーに公開' },
];
```

### ロールアウト管理API

```typescript
// app/api/feature-flags/[key]/rollout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  const { percentage } = await request.json();

  if (percentage < 0 || percentage > 100) {
    return NextResponse.json(
      { error: 'percentageは0-100で指定してください' },
      { status: 400 }
    );
  }

  await db.query(
    'UPDATE feature_flags SET rollout_percentage = $1, updated_at = NOW() WHERE key = $2',
    [percentage, params.key]
  );

  return NextResponse.json({
    key: params.key,
    rolloutPercentage: percentage,
    message: `${percentage}%のユーザーに公開中`,
  });
}
```

---

## ベストプラクティス

### 命名規則

```
# 機能名_動作_詳細
new_checkout_flow          # リリースフラグ
experiment_pricing_page    # 実験フラグ
ops_maintenance_mode       # 運用フラグ
plan_advanced_analytics    # パーミッションフラグ
```

### フラグの棚卸し

```typescript
// scripts/audit-flags.ts
// 古いフラグを検出するスクリプト
const staleFlags = await db.query(`
  SELECT key, updated_at
  FROM feature_flags
  WHERE enabled = true
    AND rollout_percentage = 100
    AND updated_at < NOW() - INTERVAL '30 days'
`);

// 100%ロールアウトで30日以上経過 → コード化してフラグ削除の候補
for (const flag of staleFlags.rows) {
  console.log(`⚠ 棚卸し候補: ${flag.key}（最終更新: ${flag.updated_at}）`);
}
```

### テスト戦略

```typescript
// テストではフラグを明示的に制御
describe('CheckoutButton', () => {
  it('新決済フローが有効な場合', () => {
    // フラグをモック
    jest.spyOn(featureFlags, 'useFeatureFlag')
      .mockReturnValue(true);

    render(<CheckoutButton />);
    expect(screen.getByText('新しい決済')).toBeInTheDocument();
  });

  it('旧決済フローがデフォルト', () => {
    jest.spyOn(featureFlags, 'useFeatureFlag')
      .mockReturnValue(false);

    render(<CheckoutButton />);
    expect(screen.getByText('購入する')).toBeInTheDocument();
  });
});
```

---

## まとめ

| 判断基準 | LaunchDarkly | Unleash | 自前実装 |
|---------|-------------|---------|---------|
| チーム10人以上 | ◎ | ○ | △ |
| 予算あり | ◎ | ○ | ◎ |
| セルフホスト必須 | × | ◎ | ◎ |
| A/Bテスト重視 | ◎ | ○ | △ |
| 小規模プロジェクト | △ | ○ | ◎ |

フィーチャーフラグは**デプロイとリリースを分離**する強力な仕組みです。まずは自前のシンプルな実装から始め、規模が大きくなったらUnleashやLaunchDarklyへ移行するのが現実的なアプローチです。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
