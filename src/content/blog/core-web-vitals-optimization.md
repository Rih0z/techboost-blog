---
title: 'Core Web Vitals完全ガイド — LighthouseスコアをAll 90+にする実践的最適化手法'
description: 'LCP・INP・CLSの計測方法から、Next.js・画像・フォント・JavaScript最適化まで。Lighthouseスコアを90点台に引き上げる具体的な手法を解説。'
pubDate: '2026-02-19'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['Core Web Vitals', 'Performance', 'SEO']
---

GoogleのCore Web VitalsはWebサイトのユーザー体験を数値化する指標群で、SEOランキングにも直接影響します。本記事では、LCP・INP・CLSの基本から、実際にLighthouseスコアを90点台に引き上げるための具体的な最適化手法を解説します。

## Core Web Vitalsとは

Core Web Vitalsは、Googleが提唱するWebパフォーマンスの核心指標です。2024年以降、FID（First Input Delay）に代わりINP（Interaction to Next Paint）が正式指標となりました。

### 3つの指標

| 指標 | 良い | 改善が必要 | 悪い |
|------|------|-----------|------|
| **LCP** (最大コンテンツの描画) | 2.5秒以下 | 4.0秒以下 | 4.0秒超 |
| **INP** (次のペイントへの応答) | 200ms以下 | 500ms以下 | 500ms超 |
| **CLS** (累積レイアウトシフト) | 0.1以下 | 0.25以下 | 0.25超 |

### なぜCore Web Vitalsが重要か

- **SEOへの直接影響**: Googleの検索ランキングアルゴリズムに組み込まれている
- **コンバージョン率**: LCPが1秒改善するとコンバージョン率が約7%向上（Google調査）
- **直帰率**: ページ読み込みが3秒超えると直帰率が32%増加

## 計測方法

### Lighthouseを使った計測

```bash
# Chrome DevToolsから実行
# 1. DevToolsを開く (F12)
# 2. 「Lighthouse」タブを選択
# 3. 「Analyze page load」をクリック
```

CLIから実行する場合:

```bash
# Lighthouseのインストール
npm install -g lighthouse

# 計測実行
lighthouse https://example.com --output=html --output-path=./report.html

# Viewportを指定して実行
lighthouse https://example.com \
  --emulated-form-factor=mobile \
  --throttling-method=provided \
  --output=json
```

### web-vitalsライブラリでの実測値取得

実際のユーザー環境での計測には `web-vitals` ライブラリを使用します。

```typescript
// app/layout.tsx (Next.js App Router)
import { WebVitals } from '@/components/WebVitals'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  )
}
```

```typescript
// components/WebVitals.tsx
'use client'

import { useEffect } from 'react'
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals'

type MetricName = 'CLS' | 'INP' | 'LCP' | 'FCP' | 'TTFB'

function sendToAnalytics(metric: { name: MetricName; value: number; id: string }) {
  // Google Analyticsに送信する例
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    })
  }
}

export function WebVitals() {
  useEffect(() => {
    onCLS(sendToAnalytics)
    onINP(sendToAnalytics)
    onLCP(sendToAnalytics)
    onFCP(sendToAnalytics)
    onTTFB(sendToAnalytics)
  }, [])

  return null
}
```

## LCP (Largest Contentful Paint) の最適化

LCPは「ページ内で最も大きなコンテンツ要素が描画されるまでの時間」です。多くの場合、ヒーロー画像やh1タグが対象になります。

### 原因別の対処法

#### 1. 画像の最適化（最も効果大）

```typescript
// ❌ 悪い例: 通常のimgタグ
<img src="/hero.jpg" alt="ヒーロー画像" />

// ✅ 良い例: Next.js Image コンポーネント（LCP要素にはpriority必須）
import Image from 'next/image'

export function HeroSection() {
  return (
    <Image
      src="/hero.jpg"
      alt="ヒーロー画像"
      width={1200}
      height={600}
      priority         // LCP要素には必須: preloadを追加
      quality={85}     // 品質とサイズのバランス
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  )
}
```

#### 2. 画像フォーマットの最適化

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],  // AVIFを優先（WebPより30-50%軽量）
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,  // 1年キャッシュ
  },
}

export default nextConfig
```

#### 3. サードパーティスクリプトの遅延読み込み

```typescript
// ❌ 悪い例: レンダリングをブロックするスクリプト
<Script src="https://analytics.example.com/script.js" />

// ✅ 良い例: afterInteractiveまたはlazyOnloadで遅延
import Script from 'next/script'

export default function Layout() {
  return (
    <>
      {/* Google Analytics: ページ表示後に読み込み */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
        strategy="afterInteractive"
      />
      {/* チャットウィジェットなど: ユーザー操作後に読み込み */}
      <Script
        src="https://chat-widget.example.com/widget.js"
        strategy="lazyOnload"
      />
    </>
  )
}
```

#### 4. フォントの最適化

```typescript
// ❌ 悪い例: 外部フォントの遅延読み込み
// <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP&display=swap" rel="stylesheet">

// ✅ 良い例: Next.jsのフォント最適化
import { Noto_Sans_JP } from 'next/font/google'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',      // テキストを即座に表示（フォント読み込み中はシステムフォントで）
  preload: true,        // クリティカルフォントをprelead
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSansJP.className}>
      <body>{children}</body>
    </html>
  )
}
```

## INP (Interaction to Next Paint) の最適化

INPは「ユーザー操作（クリック、タップ、キーボード入力）に対して、次のフレームが描画されるまでの時間」です。

### JavaScriptの実行時間を削減

```typescript
// ❌ 悪い例: 重い処理をメインスレッドで同期実行
function handleClick() {
  const result = heavyCalculation(data)  // メインスレッドをブロック
  setResult(result)
}

// ✅ 良い例: Web Workerで重い処理をオフロード
// workers/heavy-calculation.worker.ts
self.onmessage = (event: MessageEvent) => {
  const result = heavyCalculation(event.data)
  self.postMessage(result)
}

// コンポーネント
function MyComponent() {
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/heavy-calculation.worker.ts', import.meta.url)
    )
    workerRef.current.onmessage = (event) => {
      setResult(event.data)
    }
    return () => workerRef.current?.terminate()
  }, [])

  function handleClick() {
    workerRef.current?.postMessage(data)  // メインスレッドをブロックしない
  }

  return <button onClick={handleClick}>計算実行</button>
}
```

### useTransitionで優先度を制御

```typescript
import { useTransition, useState } from 'react'

function SearchComponent() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)  // 緊急更新: 即座に反映

    startTransition(() => {
      // 非緊急更新: ユーザー操作をブロックしない
      setResults(performSearch(e.target.value))
    })
  }

  return (
    <>
      <input
        value={query}
        onChange={handleChange}
        placeholder="検索..."
      />
      {isPending ? (
        <div>検索中...</div>
      ) : (
        <ul>
          {results.map((result) => (
            <li key={result}>{result}</li>
          ))}
        </ul>
      )}
    </>
  )
}
```

### コンポーネントの遅延読み込み

```typescript
import { lazy, Suspense } from 'react'

// ❌ 悪い例: 初期バンドルに含める
import HeavyChart from '@/components/HeavyChart'

// ✅ 良い例: 必要になったときに読み込む
const HeavyChart = lazy(() => import('@/components/HeavyChart'))

function Dashboard() {
  return (
    <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded" />}>
      <HeavyChart data={data} />
    </Suspense>
  )
}
```

## CLS (Cumulative Layout Shift) の最適化

CLSは「ページの読み込み中にコンテンツが予期せずズレる量」の累積値です。0.1以下が目標です。

### 画像・動画にサイズを明示する

```typescript
// ❌ 悪い例: サイズ未指定のためレイアウトシフトが発生
<img src="/photo.jpg" alt="写真" />

// ✅ 良い例: width・heightを明示、またはaspect-ratioを使用
// パターン1: Next.js Image（自動でサイズ管理）
import Image from 'next/image'
<Image src="/photo.jpg" alt="写真" width={800} height={600} />

// パターン2: CSSのaspect-ratio
<div style={{ aspectRatio: '16/9', position: 'relative' }}>
  <img src="/video-thumbnail.jpg" alt="動画サムネイル" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
</div>
```

### フォント読み込みによるレイアウトシフトを防ぐ

```css
/* ❌ 悪い例: フォント読み込み前後でレイアウトが変化 */
body {
  font-family: 'Noto Sans JP', sans-serif;
}

/* ✅ 良い例: size-adjust で代替フォントとのサイズ差を補正 */
@font-face {
  font-family: 'Noto Sans JP Fallback';
  src: local('Hiragino Kaku Gothic ProN');
  font-weight: 400;
  /* システムフォントのサイズをWebフォントに合わせる */
  size-adjust: 100.06%;
  ascent-override: 100%;
  descent-override: normal;
  line-gap-override: normal;
}
```

### 動的コンテンツのスペースを確保

```typescript
// ❌ 悪い例: 広告・バナーが後から挿入されてシフトが発生
function AdBanner() {
  const [ad, setAd] = useState<string | null>(null)

  useEffect(() => {
    loadAd().then(setAd)
  }, [])

  return ad ? <div>{ad}</div> : null  // 後から挿入されてシフト発生
}

// ✅ 良い例: 事前にスペースを確保
function AdBanner() {
  const [ad, setAd] = useState<string | null>(null)

  useEffect(() => {
    loadAd().then(setAd)
  }, [])

  return (
    // 広告の高さ分のスペースを事前確保
    <div style={{ minHeight: '90px', width: '100%' }}>
      {ad && <div>{ad}</div>}
    </div>
  )
}
```

## バンドルサイズの最適化

### Bundle Analyzerで問題を特定

```bash
# Next.jsのバンドル分析
npm install @next/bundle-analyzer

# next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // 既存の設定
})

# 分析実行
ANALYZE=true npm run build
```

### Tree Shakingを活用

```typescript
// ❌ 悪い例: ライブラリ全体をインポート
import _ from 'lodash'  // 70KB+

// ✅ 良い例: 必要な関数のみインポート
import debounce from 'lodash/debounce'  // 数KB

// date-fnsの例
// ❌
import { format, parseISO, addDays } from 'date-fns'  // tree-shakingが効く場合もあるが注意

// ✅ ESM版を明示的に使用
import format from 'date-fns/format'
import parseISO from 'date-fns/parseISO'
```

### 動的インポートでコード分割

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // サーバーコンポーネントの外部パッケージをバンドルしない
  serverExternalPackages: ['sharp'],

  // 実験的機能: より積極的なコード分割
  experimental: {
    optimizeCss: true,        // CSS最適化
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}
```

## キャッシュ戦略の最適化

### HTTPキャッシュヘッダーの設定

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            // 静的アセット: 1年キャッシュ
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            // HTMLページ: stale-while-revalidate
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
}
```

### ISR（Incremental Static Regeneration）の活用

```typescript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

// データの再生成間隔を設定（秒）
export const revalidate = 3600  // 1時間ごとに再生成

async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  return <article>{post.content}</article>
}
```

## 実践: Lighthouseスコアを90点台にするチェックリスト

### パフォーマンス（Performance）

- [ ] LCP要素（ヒーロー画像等）に `priority` を設定
- [ ] 画像をWebP/AVIFフォーマットに変換
- [ ] 使用されていないJavaScript/CSSを削除
- [ ] クリティカルCSSをインライン化
- [ ] サードパーティスクリプトを `afterInteractive` または `lazyOnload` で読み込み
- [ ] フォントを `display: swap` で読み込み

### アクセシビリティ（Accessibility）

- [ ] 全ての画像に適切な `alt` テキストを設定
- [ ] カラーコントラスト比 4.5:1 以上（WCAG AA準拠）
- [ ] フォームの入力フィールドに `<label>` を関連付け
- [ ] キーボード操作で全機能を使用可能
- [ ] 見出し階層を正しく設定（h1 → h2 → h3）

### SEO

- [ ] 各ページに固有の `<title>` と `<meta description>` を設定
- [ ] 構造化データ（JSON-LD）を追加
- [ ] robots.txt と sitemap.xml を設置
- [ ] Canonical URLを設定

### ベストプラクティス

- [ ] HTTPSを使用
- [ ] 使用されていないCookieを削除
- [ ] コンソールエラーを解消

## まとめ

Core Web Vitalsの最適化は、ユーザー体験の向上とSEOの両面で重要です。本記事の内容をまとめると:

- **LCP改善**: 画像の `priority` 設定、WebP/AVIF採用、フォント最適化、サードパーティ遅延読み込み
- **INP改善**: Web Workerへの処理オフロード、`useTransition` の活用、コンポーネントの遅延読み込み
- **CLS改善**: 画像サイズの明示、フォント読み込み戦略、動的コンテンツのスペース確保
- **バンドル最適化**: Bundle Analyzer、Tree Shaking、コード分割

Lighthouseスコアを90点台に乗せることは、適切なツールと手法を使えば決して難しくありません。まずは計測から始め、スコアが低い項目から優先的に対処していくことをお勧めします。

パフォーマンス診断ツールや最適化チェックシートは、[DevToolBox](https://usedevtools.com)でも利用可能です。ぜひ日々の開発にお役立てください。
