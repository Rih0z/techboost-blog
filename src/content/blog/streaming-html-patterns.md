---
title: "ストリーミングHTML完全ガイド — Suspenseとプログレッシブレンダリング"
description: "React 19のストリーミングSSRとSuspense境界設計を徹底解説。Out-of-Order StreamingとProgressive Hydrationで最高のUXを実現する方法。React・Streaming・SSRに関する実践情報。"
pubDate: "2026-02-05"
tags: ["React", "Streaming", "SSR", "Suspense", "Performance"]
heroImage: '../../assets/thumbnails/streaming-html-patterns.jpg'
---
## ストリーミングHTMLとは

従来のSSRでは、サーバーが全てのHTMLを生成してからクライアントに送信していました。ストリーミングSSRでは、準備ができた部分から順次送信することで、初期表示を大幅に高速化できます。

### 従来のSSR

```
[サーバー] データ取得(3秒) → HTML生成 → 送信
[クライアント] 待機(3秒) → 受信 → 表示
```

### ストリーミングSSR

```
[サーバー] 初期HTML送信(即座) → データ取得完了時に追加HTML送信
[クライアント] 初期HTML表示(即座) → 追加部分を動的挿入
```

## React 19のストリーミング機能

### 基本的なSuspense境界

```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <div>
      <h1>ダッシュボード</h1>

      {/* 即座に表示 */}
      <QuickStats />

      {/* 非同期データ読み込み中はフォールバック表示 */}
      <Suspense fallback={<ChartSkeleton />}>
        <SalesChart />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />
      </Suspense>
    </div>
  );
}
```

### 非同期コンポーネント

```tsx
async function SalesChart() {
  // サーバー側で非同期データ取得
  const data = await fetch('https://api.example.com/sales', {
    next: { revalidate: 3600 }
  }).then(r => r.json());

  return (
    <div>
      <h2>売上チャート</h2>
      <Chart data={data} />
    </div>
  );
}

async function RecentOrders() {
  const orders = await db.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10');

  return (
    <table>
      <thead>
        <tr>
          <th>注文ID</th>
          <th>顧客名</th>
          <th>金額</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => (
          <tr key={order.id}>
            <td>{order.id}</td>
            <td>{order.customerName}</td>
            <td>{order.amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Suspense境界設計パターン

### パターン1: ネストされたSuspense

```tsx
export default function BlogPost({ id }: { id: string }) {
  return (
    <article>
      {/* 記事本文は優先度高 */}
      <Suspense fallback={<PostSkeleton />}>
        <PostContent id={id} />

        {/* コメントは優先度低 */}
        <Suspense fallback={<CommentsSkeleton />}>
          <Comments postId={id} />
        </Suspense>
      </Suspense>
    </article>
  );
}
```

### パターン2: 並列ストリーミング

```tsx
export default function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Suspense fallback={<Skeleton />}>
        <MetricCard metric="revenue" />
      </Suspense>

      <Suspense fallback={<Skeleton />}>
        <MetricCard metric="users" />
      </Suspense>

      <Suspense fallback={<Skeleton />}>
        <MetricCard metric="orders" />
      </Suspense>

      <Suspense fallback={<Skeleton />}>
        <MetricCard metric="pageviews" />
      </Suspense>
    </div>
  );
}
```

各カードは独立してストリーミングされ、準備ができた順に表示されます。

### パターン3: ウォーターフォール回避

```tsx
// ❌ 悪い例: シーケンシャル読み込み
async function BadExample() {
  const user = await fetchUser();
  const posts = await fetchPosts(user.id); // userの完了を待つ
  return <div>{/* ... */}</div>;
}

// ✅ 良い例: 並列化
async function GoodExample() {
  const userPromise = fetchUser();
  const postsPromise = fetchPosts(); // 並列実行

  const [user, posts] = await Promise.all([userPromise, postsPromise]);

  return <div>{/* ... */}</div>;
}

// ✅ より良い例: Suspense境界で分離
export default function Profile() {
  return (
    <>
      <Suspense fallback={<UserSkeleton />}>
        <UserInfo />
      </Suspense>

      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts />
      </Suspense>
    </>
  );
}
```

## Out-of-Order Streaming

React 19では、Suspense境界の完了順に関係なく、HTML内の正しい位置に挿入されます。

### 実装例

```tsx
export default function Page() {
  return (
    <main>
      {/* 1. 即座に表示 */}
      <Header />

      {/* 2. 5秒かかるクエリ */}
      <Suspense fallback={<div>読み込み中...</div>}>
        <SlowComponent />
      </Suspense>

      {/* 3. 1秒で完了 */}
      <Suspense fallback={<div>読み込み中...</div>}>
        <FastComponent />
      </Suspense>

      {/* 4. 即座に表示 */}
      <Footer />
    </main>
  );
}
```

**レンダリング順序**:
1. Header (0秒)
2. Footer (0秒)
3. FastComponent (1秒) ← 先に完了してもSlowComponentの後ろに挿入されない
4. SlowComponent (5秒)

### 実際のHTML出力

```html
<!-- 初期レスポンス -->
<main>
  <header>...</header>
  <div>読み込み中...</div> <!-- SlowComponent fallback -->
  <div>読み込み中...</div> <!-- FastComponent fallback -->
  <footer>...</footer>
</main>

<!-- 1秒後のストリーム -->
<template id="B:1">
  <div>FastComponentの内容</div>
</template>
<script>
  // 正しい位置に挿入
  document.getElementById('suspense-2').replaceWith(
    document.getElementById('B:1').content
  );
</script>

<!-- 5秒後のストリーム -->
<template id="B:0">
  <div>SlowComponentの内容</div>
</template>
<script>
  document.getElementById('suspense-1').replaceWith(
    document.getElementById('B:0').content
  );
</script>
```

## プログレッシブハイドレーション

### Selective Hydration

React 19では、ストリーミングされたコンポーネントを選択的にハイドレーションします。

```tsx
'use client';

import { useState } from 'react';

export function InteractiveChart({ data }: { data: ChartData }) {
  const [filter, setFilter] = useState('all');

  return (
    <div>
      <select value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">全期間</option>
        <option value="month">今月</option>
        <option value="week">今週</option>
      </select>
      <Chart data={data} filter={filter} />
    </div>
  );
}
```

このコンポーネントがストリーミングで届いた後、ユーザーがクリックする前にハイドレーションが完了していなくても、クリックイベントは記録され、ハイドレーション完了後に実行されます。

### 優先度付きハイドレーション

```tsx
import { use } from 'react';

export default function Page() {
  return (
    <>
      {/* 高優先度: ユーザーがすぐに操作する可能性が高い */}
      <Suspense fallback={<div>...</div>}>
        <SearchBar />
      </Suspense>

      {/* 低優先度: スクロールしないと見えない */}
      <Suspense fallback={<div>...</div>}>
        <Footer />
      </Suspense>
    </>
  );
}
```

React は画面に見えているコンポーネントを優先的にハイドレーションします。

## Next.js App Routerでの実践

### app/layout.tsx

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {/* 静的なヘッダーは即座に表示 */}
        <header>
          <nav>
            <a href="/">ホーム</a>
            <a href="/about">概要</a>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}
```

### app/dashboard/page.tsx

```tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>ダッシュボード</h1>

      {/* 複数のSuspense境界で並列ストリーミング */}
      <div className="grid grid-cols-3 gap-4">
        <Suspense fallback={<MetricSkeleton />}>
          <RevenueMetric />
        </Suspense>

        <Suspense fallback={<MetricSkeleton />}>
          <UsersMetric />
        </Suspense>

        <Suspense fallback={<MetricSkeleton />}>
          <OrdersMetric />
        </Suspense>
      </div>

      <Suspense fallback={<ChartSkeleton />}>
        <SalesChart />
      </Suspense>
    </div>
  );
}

async function RevenueMetric() {
  const revenue = await fetchRevenue();
  return <MetricCard title="売上" value={revenue} />;
}

// 他のコンポーネントも同様...
```

## パフォーマンス測定

### Core Web Vitals改善

```tsx
// app/components/metrics.tsx
'use client';

import { useEffect } from 'react';

export function WebVitals() {
  useEffect(() => {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    });
  }, []);

  return null;
}
```

### ストリーミング効果の測定

```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const start = Date.now();

  const response = NextResponse.next();

  response.headers.set('Server-Timing', `total;dur=${Date.now() - start}`);

  return response;
}
```

## まとめ

ストリーミングHTMLとSuspenseを適切に設計することで、以下の効果が得られます。

1. **TTFB改善**: 初期HTMLを即座に送信
2. **FCP改善**: 静的コンテンツを先に表示
3. **LCP改善**: 重要なコンテンツを優先的にストリーミング
4. **ユーザー体験向上**: 段階的な表示で体感速度を改善

React 19とNext.js 15の組み合わせで、これらの最適化がデフォルトで有効になります。Suspense境界を適切に配置し、非同期コンポーネントを活用することが、モダンなWebアプリケーション開発の鍵となります。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
