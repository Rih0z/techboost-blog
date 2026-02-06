---
title: "Core Web Vitals最適化実践ガイド2026"
description: "GoogleのCore Web Vitalsを改善してSEOとユーザー体験を向上させる実践的な手法を解説。LCP、INP、CLSの最適化テクニックを具体例とともに紹介します。"
pubDate: "2025-02-05"
category: "Performance"
tags: ["Web Vitals", "Performance", "SEO", "UX", "Optimization"]
---

GoogleのCore Web Vitalsは、SEOランキングとユーザー体験に直接影響する重要な指標です。2024年のINP導入を経て、2026年現在、これらの指標はさらに重要性を増しています。本記事では、LCP、INP、CLSを実践的に改善する手法を解説します。

## Core Web Vitals 2026の概要

### 3つの主要指標

**LCP (Largest Contentful Paint)**
- 最大コンテンツの描画時間
- 目標: 2.5秒以内
- ページ読み込みのパフォーマンスを測定

**INP (Interaction to Next Paint)**
- インタラクションから次の描画までの時間
- 目標: 200ms以内
- 2024年にFIDを置き換え

**CLS (Cumulative Layout Shift)**
- 累積レイアウトシフト
- 目標: 0.1以下
- 視覚的安定性を測定

## LCP（Largest Contentful Paint）最適化

### 1. 画像最適化

#### 次世代フォーマット使用

```html
<picture>
  <source
    srcset="hero.avif"
    type="image/avif"
  />
  <source
    srcset="hero.webp"
    type="image/webp"
  />
  <img
    src="hero.jpg"
    alt="Hero image"
    width="1200"
    height="600"
    loading="eager"
    fetchpriority="high"
  />
</picture>
```

#### レスポンシブ画像

```html
<img
  srcset="
    hero-400.avif 400w,
    hero-800.avif 800w,
    hero-1200.avif 1200w,
    hero-1600.avif 1600w
  "
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 80vw,
    1200px
  "
  src="hero-1200.avif"
  alt="Hero image"
  width="1200"
  height="600"
  fetchpriority="high"
/>
```

#### Next.js Image最適化

```typescript
import Image from 'next/image'

export default function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero image"
      width={1200}
      height={600}
      priority  // LCP要素には必須
      quality={85}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  )
}
```

### 2. リソースの優先度制御

```html
<!DOCTYPE html>
<html>
<head>
  <!-- 重要なフォントを事前読み込み -->
  <link
    rel="preload"
    href="/fonts/inter-var.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />

  <!-- 重要なCSSをインライン化 -->
  <style>
    /* Critical CSS */
    body { margin: 0; font-family: 'Inter', sans-serif; }
    .hero { min-height: 100vh; }
  </style>

  <!-- 非重要CSSは遅延読み込み -->
  <link
    rel="preload"
    href="/styles/non-critical.css"
    as="style"
    onload="this.onload=null;this.rel='stylesheet'"
  />
  <noscript>
    <link rel="stylesheet" href="/styles/non-critical.css" />
  </noscript>

  <!-- LCP画像を事前読み込み -->
  <link
    rel="preload"
    as="image"
    href="/hero.avif"
    type="image/avif"
    fetchpriority="high"
  />
</head>
</html>
```

### 3. サーバー応答時間の改善

#### Next.js App Router SSR最適化

```typescript
// app/blog/[slug]/page.tsx
import { cache } from 'react'

// データフェッチをキャッシュ
const getPost = cache(async (slug: string) => {
  const post = await db.post.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      content: true,
      // 必要なフィールドのみ取得
    },
  })
  return post
})

// Static Site Generation（可能な場合）
export async function generateStaticParams() {
  const posts = await db.post.findMany({
    select: { slug: true },
  })

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function BlogPost({
  params,
}: {
  params: { slug: string }
}) {
  const post = await getPost(params.slug)

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  )
}
```

#### CDNとエッジキャッシング

```typescript
// Vercel Edge Functions
export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  // エッジでキャッシュ
  const response = await fetch(`https://api.example.com/posts/${id}`, {
    next: { revalidate: 60 }, // 60秒キャッシュ
  })

  const data = await response.json()

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
```

### 4. フォント最適化

```css
/* Variable Font使用 */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap; /* フォント読み込み中もテキスト表示 */
  font-style: normal;
}

/* サブセット化 */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153;
}
```

```typescript
// Next.js Font最適化
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```

## INP（Interaction to Next Paint）最適化

### 1. JavaScript実行の最適化

#### コード分割

```typescript
// React lazy loading
import { lazy, Suspense } from 'react'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  )
}
```

```typescript
// Next.js dynamic import
import dynamic from 'next/dynamic'

const DynamicComponent = dynamic(
  () => import('./HeavyComponent'),
  {
    loading: () => <Loading />,
    ssr: false, // クライアントサイドのみ
  }
)

export default function Page() {
  return <DynamicComponent />
}
```

#### Web Worker活用

```typescript
// worker.ts
self.addEventListener('message', (e: MessageEvent) => {
  const { data } = e

  // 重い計算をワーカーで実行
  const result = expensiveCalculation(data)

  self.postMessage(result)
})

function expensiveCalculation(data: number[]): number {
  return data.reduce((sum, num) => sum + Math.sqrt(num), 0)
}
```

```typescript
// main.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url))

function processData(data: number[]) {
  return new Promise((resolve) => {
    worker.postMessage(data)
    worker.onmessage = (e) => {
      resolve(e.data)
    }
  })
}

// 使用例
const result = await processData([1, 2, 3, 4, 5])
```

### 2. イベントハンドラの最適化

#### デバウンス・スロットル

```typescript
// デバウンス（最後のイベントのみ処理）
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// スロットル（一定間隔で処理）
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// 使用例
const handleSearch = debounce((query: string) => {
  // API呼び出し
  fetch(`/api/search?q=${query}`)
}, 300)

const handleScroll = throttle(() => {
  // スクロール処理
  updateScrollPosition()
}, 100)
```

#### React 19のuseTransition

```typescript
import { useState, useTransition } from 'react'

function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isPending, startTransition] = useTransition()

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value) // 即座に更新

    // 重い処理を低優先度に
    startTransition(() => {
      const filtered = heavySearchOperation(value)
      setResults(filtered)
    })
  }

  return (
    <>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="検索..."
      />
      {isPending && <Loading />}
      <SearchResults results={results} />
    </>
  )
}
```

### 3. Virtual Scrolling

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // 推定高さ
    overscan: 5, // バッファ
  })

  return (
    <div
      ref={parentRef}
      style={{ height: '600px', overflow: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ItemComponent item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## CLS（Cumulative Layout Shift）最適化

### 1. 画像・動画のサイズ指定

```html
<!-- 必ずwidth/height属性を指定 -->
<img
  src="image.jpg"
  alt="Description"
  width="800"
  height="600"
/>

<!-- アスペクト比を保持 -->
<style>
  img {
    width: 100%;
    height: auto;
  }
</style>
```

```css
/* CSS aspect-ratio */
.video-container {
  aspect-ratio: 16 / 9;
  width: 100%;
}

.video-container iframe {
  width: 100%;
  height: 100%;
}
```

### 2. フォント読み込みの最適化

```css
/* フォールバックフォントのサイズ調整 */
@font-face {
  font-family: 'Custom Font';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
  size-adjust: 107%; /* フォールバックに合わせて調整 */
}
```

```typescript
// Next.js Font調整
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: true, // 自動調整
})
```

### 3. 動的コンテンツのスペース確保

```typescript
// スケルトンスクリーン
function ArticleCard() {
  const { data, isLoading } = useQuery(['article'], fetchArticle)

  if (isLoading) {
    return (
      <div className="article-card">
        <div className="skeleton skeleton-image" style={{ height: '200px' }} />
        <div className="skeleton skeleton-title" style={{ height: '24px', marginTop: '16px' }} />
        <div className="skeleton skeleton-text" style={{ height: '16px', marginTop: '8px' }} />
      </div>
    )
  }

  return (
    <div className="article-card">
      <img src={data.image} alt={data.title} />
      <h3>{data.title}</h3>
      <p>{data.excerpt}</p>
    </div>
  )
}
```

```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 4. 広告・埋め込みコンテンツ

```html
<!-- 広告スペースを事前に確保 -->
<div class="ad-container" style="min-height: 250px;">
  <div id="ad-slot"></div>
</div>
```

```typescript
// Intersection Observer で遅延読み込み
function AdSlot() {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ minHeight: '250px' }}>
      {isVisible && <AdComponent />}
    </div>
  )
}
```

## 計測とモニタリング

### Web Vitals計測

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
```

### カスタム計測

```typescript
import { onCLS, onINP, onLCP } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  })

  // Beacon API（ページ離脱時も送信）
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body)
  } else {
    fetch('/analytics', { body, method: 'POST', keepalive: true })
  }
}

onCLS(sendToAnalytics)
onINP(sendToAnalytics)
onLCP(sendToAnalytics)
```

## パフォーマンス予算

```javascript
// lighthouse-budget.json
{
  "resourceSizes": [
    {
      "resourceType": "script",
      "budget": 300
    },
    {
      "resourceType": "image",
      "budget": 500
    },
    {
      "resourceType": "total",
      "budget": 1000
    }
  ],
  "resourceCounts": [
    {
      "resourceType": "third-party",
      "budget": 10
    }
  ],
  "timings": [
    {
      "metric": "interactive",
      "budget": 3000
    },
    {
      "metric": "largest-contentful-paint",
      "budget": 2500
    }
  ]
}
```

## まとめ

Core Web Vitalsの最適化は継続的な取り組みが必要です。

**LCP改善のポイント**
- 画像最適化（次世代フォーマット、レスポンシブ）
- リソースの優先度制御
- サーバー応答時間短縮

**INP改善のポイント**
- JavaScript実行の最適化
- イベントハンドラの効率化
- コード分割とWeb Worker活用

**CLS改善のポイント**
- すべてのメディアにサイズ指定
- フォント読み込み最適化
- 動的コンテンツのスペース確保

2026年現在、これらの指標はSEOだけでなく、ユーザー体験の質を測る重要な基準となっています。継続的な計測と改善でビジネス成果につなげましょう。

**参考リンク**
- [Web Vitals](https://web.dev/vitals/)
- [Chrome User Experience Report](https://developers.google.com/web/tools/chrome-user-experience-report)
- [PageSpeed Insights](https://pagespeed.web.dev/)
