---
title: 'Webパフォーマンス最適化の決定版 — Core Web Vitals改善テクニック15選'
description: 'Webサイトのパフォーマンスを劇的に改善する実践的なテクニック15選。LCP、FID、CLSなどCore Web Vitalsの最適化方法を、具体的なコード例とともに2026年最新の手法で解説します。ベストプラクティスと注意点も紹介します。'
pubDate: '2026-02-05'
tags: ['データベース', 'バックエンド']
heroImage: '../../assets/thumbnails/performance-optimization-web.jpg'
---
Webサイトが遅くてユーザーが離脱していませんか？Googleの調査によると、ページ表示が1秒遅れるとコンバージョン率が7%低下します。この記事では、Core Web Vitalsを改善し、Webサイトのパフォーマンスを劇的に向上させる15のテクニックを解説します。

## Core Web Vitalsとは？

GoogleがSEOランキングに使用する3つの指標:

### 1. LCP（Largest Contentful Paint）

**最大コンテンツの描画時間** - ページ内で最も大きな要素が表示されるまでの時間。

- **良い:** 2.5秒以内
- **改善が必要:** 2.5〜4.0秒
- **悪い:** 4.0秒以上

### 2. FID（First Input Delay）→ INP（Interaction to Next Paint）

**操作への応答時間** - ユーザーの最初の操作（クリック等）に対する応答時間。

- **良い:** 100ms以内（FID）/ 200ms以内（INP）
- **改善が必要:** 100〜300ms / 200〜500ms
- **悪い:** 300ms以上 / 500ms以上

**注:** 2024年3月からFIDはINPに置き換えられました。

### 3. CLS（Cumulative Layout Shift）

**視覚的安定性** - レイアウトのズレの累積。

- **良い:** 0.1以下
- **改善が必要:** 0.1〜0.25
- **悪い:** 0.25以上

## 計測方法

### Chrome DevTools

```bash
# Lighthouse実行
1. Chrome DevToolsを開く（F12）
2. Lighthouseタブを選択
3. "Analyze page load"をクリック
```

### Web Vitals拡張機能

```bash
# Chrome拡張機能インストール
https://chrome.google.com/webstore/detail/web-vitals/

# リアルタイムでCore Web Vitals表示
```

### PageSpeed Insights

```
https://pagespeed.web.dev/
URLを入力して分析
```

### 実装での計測

```typescript
// web-vitals ライブラリ
import { onCLS, onFID, onLCP, onINP } from 'web-vitals';

onLCP(console.log);
onFID(console.log);
onCLS(console.log);
onINP(console.log);

// Google Analyticsに送信
function sendToAnalytics({ name, value, id }) {
  gtag('event', name, {
    event_category: 'Web Vitals',
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    event_label: id,
    non_interaction: true,
  });
}

onCLS(sendToAnalytics);
onLCP(sendToAnalytics);
onINP(sendToAnalytics);
```

## テクニック1: 画像最適化

### WebP / AVIF形式を使用

```html
<!-- 悪い例 -->
<img src="image.jpg" alt="Example">

<!-- 良い例: 複数フォーマット対応 -->
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Example">
</picture>
```

### 画像の遅延読み込み

```html
<!-- ネイティブ遅延読み込み -->
<img src="image.jpg" loading="lazy" alt="Example">

<!-- 重要な画像は即時読み込み -->
<img src="hero.jpg" loading="eager" alt="Hero">
```

### レスポンシブ画像

```html
<img
  src="image-800.jpg"
  srcset="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Responsive image"
>
```

### Next.jsのImage最適化

```typescript
import Image from 'next/image';

export function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority  // LCP対象なら優先読み込み
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}
```

## テクニック2: フォント最適化

### フォント読み込み戦略

```html
<!-- 悪い例: レンダリングブロック -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto">

<!-- 良い例: preconnect + font-display -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto&display=swap">
```

### CSS font-display

```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;  /* FOIT回避 */
  font-weight: 400;
  font-style: normal;
}
```

### ローカルフォントの活用

```typescript
// Next.js App Routerでのフォント最適化
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

```css
body {
  font-family: var(--font-inter), sans-serif;
}
```

## テクニック3: JavaScript最適化

### コード分割

```typescript
// 悪い例: すべて初回ロード
import HeavyComponent from './HeavyComponent';
import Chart from './Chart';
import Editor from './Editor';

// 良い例: 動的インポート
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));
const Chart = lazy(() => import('./Chart'));
const Editor = lazy(() => import('./Editor'));

export function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Tree Shaking

```typescript
// 悪い例: ライブラリ全体をインポート
import _ from 'lodash';
const result = _.debounce(fn, 300);

// 良い例: 必要な関数だけインポート
import debounce from 'lodash/debounce';
const result = debounce(fn, 300);

// さらに良い例: 代替ライブラリ
import { debounce } from 'es-toolkit';
```

### バンドルサイズ分析

```bash
# Next.js
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ...
});

# 実行
ANALYZE=true npm run build
```

### 不要なJavaScript削除

```typescript
// 悪い例: 使っていないライブラリ
import moment from 'moment';  // 重い（290KB）

// 良い例: 軽量な代替
import { format } from 'date-fns';  // 軽い（13KB）

// さらに良い例: ネイティブAPI
const formatted = new Intl.DateTimeFormat('ja-JP').format(new Date());
```

## テクニック4: CSS最適化

### クリティカルCSS

```html
<!-- インライン化する -->
<style>
  /* Above-the-foldのスタイルだけ */
  body { margin: 0; font-family: sans-serif; }
  .header { background: #333; color: white; padding: 1rem; }
  .hero { height: 100vh; }
</style>

<!-- その他は非同期読み込み -->
<link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles.css"></noscript>
```

### CSS-in-JSの最適化

```typescript
// 悪い例: ランタイムCSS-in-JS（emotion/styled-components）
import styled from 'styled-components';

const Button = styled.button`
  background: blue;
  color: white;
`;

// 良い例: ゼロランタイムCSS-in-JS（Vanilla Extract / CSS Modules）
import styles from './button.module.css';

export function Button() {
  return <button className={styles.button}>Click</button>;
}
```

### 未使用CSSの削除

```bash
# PurgeCSS（Tailwind CSSは自動対応）
npm install @fullhuman/postcss-purgecss

# postcss.config.js
module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: ['./src/**/*.{js,jsx,ts,tsx}'],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
    })
  ]
};
```

## テクニック5: リソースヒント

### Preconnect

```html
<!-- 外部ドメインへの接続を事前確立 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://api.example.com">
```

### Preload

```html
<!-- 重要なリソースを優先読み込み -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/hero.jpg" as="image">
<link rel="preload" href="/critical.css" as="style">
```

### Prefetch

```html
<!-- 次に必要になりそうなリソースを先読み -->
<link rel="prefetch" href="/page2.js">
<link rel="prefetch" href="/images/background.jpg">
```

### Next.jsでの自動プリフェッチ

```typescript
import Link from 'next/link';

// デフォルトでビューポート内のリンクを自動プリフェッチ
export function Navigation() {
  return (
    <nav>
      <Link href="/about">About</Link>
      <Link href="/contact" prefetch={false}>Contact</Link> {/* 無効化 */}
    </nav>
  );
}
```

## テクニック6: レイアウトシフト防止（CLS改善）

### 画像・動画のサイズ指定

```html
<!-- 悪い例: サイズ未指定 -->
<img src="image.jpg" alt="Example">

<!-- 良い例: widthとheight指定 -->
<img src="image.jpg" alt="Example" width="800" height="600">
```

```css
/* レスポンシブ対応 */
img {
  max-width: 100%;
  height: auto;
}
```

### フォント読み込み時のシフト防止

```css
/* フォールバックフォントのサイズ調整 */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
  size-adjust: 100%;
}
```

### 広告・埋め込みコンテンツの領域確保

```html
<!-- 悪い例: 領域未確保 -->
<div id="ad"></div>

<!-- 良い例: min-heightで領域確保 -->
<div id="ad" style="min-height: 250px;"></div>
```

### Skeletonスクリーン

```typescript
export function ProductList() {
  const { data, isLoading } = useQuery('products', fetchProducts);

  if (isLoading) {
    return (
      <div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton">
            <div className="skeleton-image" />
            <div className="skeleton-text" />
            <div className="skeleton-text short" />
          </div>
        ))}
      </div>
    );
  }

  return <div>{data.map(product => <ProductCard key={product.id} {...product} />)}</div>;
}
```

```css
.skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-image {
  width: 100%;
  height: 200px;
  background: #e0e0e0;
  border-radius: 8px;
}

.skeleton-text {
  height: 16px;
  background: #e0e0e0;
  border-radius: 4px;
  margin: 8px 0;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## テクニック7: サーバーサイド最適化

### 静的生成（SSG）

```typescript
// Next.js App Router
export async function generateStaticParams() {
  const posts = await fetchPosts();
  return posts.map(post => ({ slug: post.slug }));
}

export default async function PostPage({ params }) {
  const post = await fetchPost(params.slug);
  return <article>{post.content}</article>;
}
```

### インクリメンタル静的再生成（ISR）

```typescript
// Next.js Pages Router
export async function getStaticProps() {
  const data = await fetchData();

  return {
    props: { data },
    revalidate: 60  // 60秒ごとに再生成
  };
}
```

### エッジレンダリング

```typescript
// Vercel Edge Functions
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const data = await fetch('https://api.example.com/data');
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
}
```

## テクニック8: キャッシュ戦略

### HTTP Cache

```typescript
// Next.js API Route
export async function GET(request: Request) {
  const data = await fetchData();

  return new Response(JSON.stringify(data), {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Content-Type': 'application/json',
    },
  });
}
```

### Service Worker

```typescript
// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/styles.css',
        '/script.js',
        '/logo.png',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### React Query（TanStack Query）

```typescript
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5分間キャッシュ
      cacheTime: 10 * 60 * 1000,  // 10分間保持
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserList />
    </QueryClientProvider>
  );
}

function UserList() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{data.map(user => <UserCard key={user.id} {...user} />)}</div>;
}
```

## テクニック9: ネットワーク最適化

### HTTP/2 & HTTP/3

```nginx
# Nginx設定
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;

  # HTTP/3
  listen 443 quic reuseport;
  add_header Alt-Svc 'h3=":443"; ma=86400';
}
```

### Brotli圧縮

```bash
# Nginxでbrotli有効化
# /etc/nginx/nginx.conf
http {
  brotli on;
  brotli_comp_level 6;
  brotli_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

### CDN活用

```typescript
// Vercel / Cloudflare / Fastly
// 静的アセットを自動的にエッジにキャッシュ

// next.config.js
module.exports = {
  images: {
    domains: ['cdn.example.com'],
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://cdn.example.com' : '',
};
```

## テクニック10: データベースクエリ最適化

### N+1問題の解決

```typescript
// 悪い例: N+1クエリ
const posts = await db.posts.findMany();
for (const post of posts) {
  post.author = await db.users.findUnique({ where: { id: post.authorId } });
}

// 良い例: 1クエリで取得
const posts = await db.posts.findMany({
  include: {
    author: true,
  },
});
```

### インデックス追加

```sql
-- postsテーブルのauthorIdにインデックス
CREATE INDEX idx_posts_author_id ON posts(author_id);

-- 複合インデックス
CREATE INDEX idx_posts_status_created ON posts(status, created_at DESC);
```

### クエリキャッシュ

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export async function getUser(id: string) {
  // キャッシュ確認
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  // DBクエリ
  const user = await db.users.findUnique({ where: { id } });

  // キャッシュ保存（1時間）
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user));

  return user;
}
```

## テクニック11: Third-Party Script最適化

### Google Analytics最適化

```typescript
// 悪い例: 同期読み込み
<script src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>

// 良い例: Partytown（Web Workerで実行）
import { Partytown } from '@builder.io/partytown/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Partytown forward={['dataLayer.push']} />
        <script
          type="text/partytown"
          src="https://www.googletagmanager.com/gtag/js?id=GA_ID"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Script Strategy

```typescript
import Script from 'next/script';

export default function Page() {
  return (
    <>
      {/* 最優先（ブロッキング） */}
      <Script src="/critical.js" strategy="beforeInteractive" />

      {/* ページロード後 */}
      <Script src="/analytics.js" strategy="afterInteractive" />

      {/* アイドル時 */}
      <Script src="/ads.js" strategy="lazyOnload" />
    </>
  );
}
```

## テクニック12: レンダリング最適化

### React.memo

```typescript
// 不要な再レンダリングを防ぐ
import { memo } from 'react';

const UserCard = memo(function UserCard({ user }: { user: User }) {
  return (
    <div>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
});
```

### useMemo / useCallback

```typescript
import { useMemo, useCallback } from 'react';

export function UserList({ users, searchTerm }) {
  // 重い計算をメモ化
  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // 関数をメモ化
  const handleClick = useCallback((userId: string) => {
    console.log('Clicked user:', userId);
  }, []);

  return (
    <div>
      {filteredUsers.map(user => (
        <UserCard key={user.id} user={user} onClick={handleClick} />
      ))}
    </div>
  );
}
```

### Virtual Scrolling

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function LargeList({ items }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## テクニック13: Web Workers

```typescript
// heavy-calculation.worker.ts
self.addEventListener('message', (e) => {
  const result = performHeavyCalculation(e.data);
  self.postMessage(result);
});

function performHeavyCalculation(data: number[]) {
  // 重い計算処理
  return data.reduce((sum, n) => sum + Math.sqrt(n), 0);
}

// main.ts
const worker = new Worker(new URL('./heavy-calculation.worker.ts', import.meta.url));

worker.postMessage([1, 2, 3, 4, 5]);

worker.addEventListener('message', (e) => {
  console.log('Result:', e.data);
});
```

## テクニック14: モニタリング

### Real User Monitoring（RUM）

```typescript
// Sentry Performance Monitoring
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10%のトラフィックを計測
  integrations: [
    new Sentry.BrowserTracing(),
  ],
});

// カスタムトランザクション
const transaction = Sentry.startTransaction({ name: 'Checkout Flow' });
// ... 処理
transaction.finish();
```

### Performance Observer

```typescript
// LCP計測
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
});
observer.observe({ type: 'largest-contentful-paint', buffered: true });

// Long Task検出
const longTaskObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn('Long task detected:', entry.duration, 'ms');
  }
});
longTaskObserver.observe({ type: 'longtask', buffered: true });
```

## テクニック15: Progressive Web App（PWA）

```typescript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // Next.js設定
});
```

```json
// public/manifest.json
{
  "name": "My App",
  "short_name": "MyApp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 関連記事

- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026](/blog/2026-03-09-engineer-career-change-guide-2026)

## まとめ

Webパフォーマンス最適化の15テクニック:

1. **画像最適化** - WebP/AVIF、遅延読み込み
2. **フォント最適化** - font-display: swap
3. **JavaScript最適化** - コード分割、Tree Shaking
4. **CSS最適化** - クリティカルCSS、未使用削除
5. **リソースヒント** - preconnect、preload
6. **レイアウトシフト防止** - サイズ指定、Skeleton
7. **サーバーサイド最適化** - SSG、ISR、Edge
8. **キャッシュ戦略** - HTTP Cache、Service Worker
9. **ネットワーク最適化** - HTTP/2、Brotli、CDN
10. **DB最適化** - N+1解決、インデックス
11. **Third-Party最適化** - Partytown
12. **レンダリング最適化** - React.memo、Virtual Scroll
13. **Web Workers** - 重い処理をバックグラウンド実行
14. **モニタリング** - RUM、Performance Observer
15. **PWA** - オフライン対応

優先順位:
1. LCP改善（画像・フォント・CSS）
2. CLS改善（サイズ指定・Skeleton）
3. INP改善（JavaScript最適化）

Web開発に役立つツールを探しているなら、[DevToolBox](https://devtoolbox.app)もチェックしてみてください。画像圧縮やパフォーマンス分析など、開発効率を上げるツールが揃っています。
