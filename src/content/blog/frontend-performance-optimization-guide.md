---
title: 'フロントエンドパフォーマンス最適化完全ガイド2026：Lighthouse 100点への道'
description: 'フロントエンドパフォーマンス最適化を徹底解説。Core Web Vitals・LCP/CLS/FID・コード分割・画像最適化・キャッシュ戦略・Critical CSS・Preloading・Service Worker・Bundle分析まで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

フロントエンドのパフォーマンスは、ユーザー体験とビジネス指標に直結する。Googleの調査によれば、ページの読み込みが1秒遅くなるごとにコンバージョン率が約7%低下し、モバイルユーザーの53%は3秒以上かかるサイトを離脱する。2026年現在、Core Web Vitalsはランキングシグナルとして確立しており、Lighthouse 100点の達成は競合との差別化において重要な意味を持つ。

本稿では、パフォーマンス計測の基礎から高度な最適化テクニックまで、実際のコード例とメトリクスを交えながら体系的に解説する。

---

## 1. パフォーマンス計測の基礎

最適化を始める前に、現状を正確に把握することが不可欠だ。「計測できないものは改善できない」という原則は、フロントエンドパフォーマンスにおいても同様に適用される。

### 1.1 Lighthouse

Lighthouse はGoogleが提供するオープンソースの自動化ツールで、ウェブページのパフォーマンス・アクセシビリティ・SEO・ベストプラクティスを総合的に評価する。Chrome DevTools に統合されているほか、CLIとしても利用できる。

**CLI での実行例：**

```bash
# グローバルインストール
npm install -g lighthouse

# 基本的な実行
lighthouse https://example.com --output=html --output-path=./report.html

# スロットリングなしで実行（ローカル開発環境向け）
lighthouse https://localhost:3000 \
  --throttling-method=provided \
  --output=json \
  --output-path=./lighthouse-report.json

# CI環境向けの実行（スコアが80未満の場合に失敗）
lighthouse https://example.com \
  --output=json \
  --output-path=/tmp/report.json \
  --quiet && \
  node -e "
    const report = require('/tmp/report.json');
    const score = report.categories.performance.score * 100;
    console.log('Performance Score:', score);
    if (score < 80) process.exit(1);
  "
```

**Lighthouse CI（LHCI）の設定：**

```yaml
# lighthouserc.yml
ci:
  collect:
    url:
      - https://example.com
      - https://example.com/about
    numberOfRuns: 3
  assert:
    assertions:
      'categories:performance':
        - warn
        - minScore: 0.9
      'categories:accessibility':
        - error
        - minScore: 0.95
      'first-contentful-paint':
        - warn
        - maxNumericValue: 2000
      'largest-contentful-paint':
        - error
        - maxNumericValue: 2500
      'cumulative-layout-shift':
        - error
        - maxNumericValue: 0.1
  upload:
    target: temporary-public-storage
```

```yaml
# GitHub Actions での LHCI 統合
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci && npm run build
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: './lighthouserc.yml'
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### 1.2 WebPageTest

WebPageTest（webpagetest.org）は、より詳細なウォーターフォール分析と複数地点からの計測が可能なツールだ。実際のブラウザを使用してテストを行い、ビデオ録画・フィルムストリップビューによる視覚的な読み込み過程の分析ができる。

**WebPageTest API の活用：**

```javascript
// WebPageTest APIを使った自動計測
const WebPageTest = require('webpagetest');
const wpt = new WebPageTest('www.webpagetest.org', 'YOUR_API_KEY');

async function runTest(url) {
  return new Promise((resolve, reject) => {
    wpt.runTest(url, {
      location: 'ec2-ap-northeast-1:Chrome',
      connectivity: 'Cable',
      runs: 3,
      firstViewOnly: false,
      video: true,
      lighthouse: true
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

async function analyzePerformance() {
  const result = await runTest('https://example.com');
  const { median } = result.data;
  
  console.log('First View Metrics:');
  console.log('TTFB:', median.firstView.TTFB, 'ms');
  console.log('First Contentful Paint:', median.firstView.firstContentfulPaint, 'ms');
  console.log('Largest Contentful Paint:', median.firstView.LargestContentfulPaint, 'ms');
  console.log('Speed Index:', median.firstView.SpeedIndex);
  console.log('Total Blocking Time:', median.firstView.TotalBlockingTime, 'ms');
  console.log('Cumulative Layout Shift:', median.firstView.chromeUserTiming.CumulativeLayoutShift);
}
```

### 1.3 Chrome DevTools

Chrome DevTools の Performance タブは、ランタイムパフォーマンスを詳細に分析するための主要なツールだ。

**Performance API を使ったカスタム計測：**

```javascript
// Navigation Timing API
const navigationEntries = performance.getEntriesByType('navigation');
const navTiming = navigationEntries[0];

const metrics = {
  // DNS解決時間
  dnsTime: navTiming.domainLookupEnd - navTiming.domainLookupStart,
  // TCP接続時間
  tcpTime: navTiming.connectEnd - navTiming.connectStart,
  // TLS ハンドシェイク時間
  tlsTime: navTiming.secureConnectionStart > 0
    ? navTiming.connectEnd - navTiming.secureConnectionStart
    : 0,
  // Time to First Byte
  ttfb: navTiming.responseStart - navTiming.requestStart,
  // ページ読み込み完了時間
  loadTime: navTiming.loadEventEnd - navTiming.startTime,
  // DOM構築時間
  domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.startTime,
};

console.table(metrics);

// Resource Timing APIでリソースごとの詳細
const resourceEntries = performance.getEntriesByType('resource');
const slowResources = resourceEntries
  .filter(entry => entry.duration > 500)
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 10);

console.log('Slowest Resources:');
slowResources.forEach(entry => {
  console.log(`${entry.name}: ${Math.round(entry.duration)}ms`);
});

// User Timing APIでカスタムマーク
performance.mark('app-init-start');
// ... 初期化処理 ...
performance.mark('app-init-end');
performance.measure('app-init', 'app-init-start', 'app-init-end');

const initMeasure = performance.getEntriesByName('app-init')[0];
console.log('App Init Time:', initMeasure.duration, 'ms');
```

**Long Tasks の検出：**

```javascript
// PerformanceObserver で Long Tasks を監視
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.duration > 50) {
      console.warn('Long Task detected:', {
        name: entry.name,
        duration: Math.round(entry.duration) + 'ms',
        startTime: Math.round(entry.startTime) + 'ms',
        attribution: entry.attribution
      });
    }
  });
});

observer.observe({ entryTypes: ['longtask'] });
```

---

## 2. Core Web Vitals の計測と改善

Core Web Vitals は、Googleが定義したユーザー体験の質を測る3つの主要指標だ。2026年現在、INP（Interaction to Next Paint）がFIDの後継として完全移行しており、すべてのサイトに適用されている。

### 2.1 LCP（Largest Contentful Paint）

LCPはビューポート内で最も大きいコンテンツ要素が描画されるまでの時間を計測する。良好な値は2.5秒以内とされている。

**計測コード：**

```javascript
// LCP の計測
new PerformanceObserver((entryList) => {
  const entries = entryList.getEntries();
  const lastEntry = entries[entries.length - 1];
  
  console.log('LCP:', {
    value: Math.round(lastEntry.startTime),
    element: lastEntry.element,
    url: lastEntry.url,
    size: lastEntry.size
  });
  
  // Google Analytics 4 へ送信
  gtag('event', 'LCP', {
    event_category: 'Web Vitals',
    value: Math.round(lastEntry.startTime),
    non_interaction: true
  });
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

**LCP 改善のための具体的な施策：**

```html
<!-- LCP要素（ヒーロー画像）の最適化 -->

<!-- 悪い例：遅延読み込みを使用している -->
<img
  src="/hero.jpg"
  alt="Hero Image"
  loading="lazy"
  width="1200"
  height="600"
/>

<!-- 良い例：fetchpriority と preload を活用 -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
<img
  src="/hero.webp"
  alt="Hero Image"
  fetchpriority="high"
  width="1200"
  height="600"
  decoding="sync"
/>
```

```javascript
// Next.js での LCP 最適化
import Image from 'next/image';
import heroImage from '@/assets/hero.jpg';

export default function Hero() {
  return (
    <Image
      src={heroImage}
      alt="Hero"
      priority={true}        // LCP要素には priority を設定
      quality={85}
      placeholder="blur"     // ブラー表示でCLSを防ぐ
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
    />
  );
}
```

**サーバーサイドの LCP 最適化（TTFB 短縮）：**

```javascript
// Next.js App Router でのサーバーコンポーネント活用
// app/page.tsx
export const revalidate = 3600; // 1時間キャッシュ

async function getHeroData() {
  const data = await fetch('https://api.example.com/hero', {
    next: { revalidate: 3600 }
  });
  return data.json();
}

export default async function Page() {
  const heroData = await getHeroData();
  
  return (
    <main>
      <Hero data={heroData} />
    </main>
  );
}
```

### 2.2 CLS（Cumulative Layout Shift）

CLS はページのライフタイム全体にわたって発生するレイアウトシフトの累積スコアを計測する。良好な値は0.1以下だ。

**計測コード：**

```javascript
// CLS の計測
let clsValue = 0;
let clsEntries = [];

new PerformanceObserver((entryList) => {
  for (const entry of entryList.getEntries()) {
    // ユーザー入力後500ms以内のシフトは除外
    if (!entry.hadRecentInput) {
      clsValue += entry.value;
      clsEntries.push(entry);
    }
  }
  
  console.log('Current CLS:', clsValue);
}).observe({ type: 'layout-shift', buffered: true });

// セッション終了時にGAへ送信
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    gtag('event', 'CLS', {
      event_category: 'Web Vitals',
      value: Math.round(clsValue * 1000),
      non_interaction: true
    });
  }
});
```

**CLS の主な原因と対策：**

```css
/* 悪い例：画像にサイズ指定なし */
img {
  max-width: 100%;
}

/* 良い例：aspect-ratio でスペースを確保 */
img {
  max-width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
}

/* 動的コンテンツ用のスケルトン */
.skeleton {
  min-height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

```javascript
// React でのスケルトン実装
function ProductCard({ product, isLoading }) {
  if (isLoading) {
    return (
      <div className="product-card skeleton">
        <div className="skeleton-image" style={{ aspectRatio: '1', width: '100%' }} />
        <div className="skeleton-text" style={{ height: '1.2rem', marginTop: '0.5rem' }} />
        <div className="skeleton-text" style={{ height: '1rem', width: '60%' }} />
      </div>
    );
  }
  
  return (
    <div className="product-card">
      <img
        src={product.image}
        alt={product.name}
        width={300}
        height={300}
        style={{ aspectRatio: '1' }}
      />
      <h3>{product.name}</h3>
      <p>{product.price}</p>
    </div>
  );
}
```

**フォント読み込みによる CLS の防止：**

```css
/* font-display: optional で CLS を最小化 */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: optional; /* フォールバックを使用し、フォント読み込み後の再レイアウトを防ぐ */
  font-weight: 400;
  font-style: normal;
}

/* フォントサイズが変わらないようにサイズ調整 */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
  size-adjust: 103%; /* フォールバックとのサイズ差を補正 */
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 0%;
}
```

### 2.3 INP（Interaction to Next Paint）

INP は2024年3月にFIDに代わって正式なCore Web Vitalsとなった指標で、ユーザーのすべてのインタラクションに対するレスポンスの質を評価する。良好な値は200ms以下だ。

**計測コード：**

```javascript
// INP の計測
let worstInp = 0;

new PerformanceObserver((entryList) => {
  for (const entry of entryList.getEntries()) {
    if (entry.interactionId) {
      const inp = entry.processingEnd - entry.startTime;
      if (inp > worstInp) {
        worstInp = inp;
        console.log('New worst INP:', {
          value: Math.round(inp),
          type: entry.name,
          target: entry.target?.nodeName
        });
      }
    }
  }
}).observe({ type: 'event', buffered: true, durationThreshold: 16 });
```

**INP 改善：メインスレッドのブロッキング解消：**

```javascript
// 悪い例：重い処理をメインスレッドで直接実行
button.addEventListener('click', () => {
  const result = heavyComputation(largeDataset); // メインスレッドをブロック
  updateUI(result);
});

// 良い例1：Web Worker を使用
const worker = new Worker('/workers/computation.js');

button.addEventListener('click', () => {
  worker.postMessage({ data: largeDataset });
});

worker.onmessage = (event) => {
  updateUI(event.data.result);
};

// workers/computation.js
self.onmessage = (event) => {
  const result = heavyComputation(event.data.data);
  self.postMessage({ result });
};
```

```javascript
// 良い例2：scheduler.yield() で処理を分割
async function processLargeList(items) {
  const results = [];
  
  for (let i = 0; i < items.length; i++) {
    results.push(processItem(items[i]));
    
    // 5件ごとにメインスレッドを解放
    if (i % 5 === 0) {
      await scheduler.yield();
    }
  }
  
  return results;
}

// scheduler.yield() が未対応のブラウザ向けポリフィル
async function yieldToMain() {
  return new Promise(resolve => {
    if ('scheduler' in self && 'yield' in scheduler) {
      return scheduler.yield();
    }
    setTimeout(resolve, 0);
  });
}
```

```javascript
// 良い例3：isInputPending() でUI更新を優先
async function processData(data) {
  let i = 0;
  
  while (i < data.length) {
    // ユーザー入力がある場合は処理を一時停止
    if (navigator.scheduling?.isInputPending()) {
      await yieldToMain();
    }
    
    processItem(data[i]);
    i++;
  }
}
```

---

## 3. コード分割（Code Splitting）と Dynamic Import

コード分割はバンドルサイズを削減し、初期読み込みを高速化するための最も効果的な手法の一つだ。

### 3.1 Route-based Code Splitting

```javascript
// React Router v7 でのルートベース分割
import { createBrowserRouter, lazy } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/',
    component: lazy(() => import('./pages/Home')),
  },
  {
    path: '/dashboard',
    component: lazy(() => import('./pages/Dashboard')),
  },
  {
    path: '/settings',
    component: lazy(() => import('./pages/Settings')),
  },
]);

// Suspense でローディング状態を処理
function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
```

### 3.2 Component-level Code Splitting

```javascript
// 重いコンポーネントの遅延読み込み
import { lazy, Suspense, useState } from 'react';

// チャートライブラリは大きいので遅延読み込み
const AnalyticsChart = lazy(() => 
  import('./components/AnalyticsChart').then(module => ({
    default: module.AnalyticsChart
  }))
);

// リッチテキストエディターも遅延読み込み
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));

function Dashboard() {
  const [showEditor, setShowEditor] = useState(false);
  
  return (
    <div>
      <Suspense fallback={<ChartSkeleton />}>
        <AnalyticsChart data={chartData} />
      </Suspense>
      
      {showEditor && (
        <Suspense fallback={<EditorSkeleton />}>
          <RichTextEditor />
        </Suspense>
      )}
    </div>
  );
}
```

### 3.3 Webpack でのコード分割設定

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // ベンダーライブラリを別チャンクに
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            const packageName = module.context.match(
              /[\\/]node_modules[\\/](.*?)([\\/]|$)/
            )[1];
            return `npm.${packageName.replace('@', '')}`;
          },
          priority: 10,
          reuseExistingChunk: true,
        },
        // React関連を一つのチャンクに
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react-vendor',
          chunks: 'all',
          priority: 20,
        },
        // よく使われるユーティリティ
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    // ランタイムを別チャンクに分離
    runtimeChunk: 'single',
  },
};
```

### 3.4 Vite での設定

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core を別チャンクに
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }
          
          // ルーティング関連
          if (id.includes('react-router')) {
            return 'router';
          }
          
          // UI コンポーネントライブラリ
          if (id.includes('@radix-ui') || id.includes('shadcn')) {
            return 'ui-components';
          }
          
          // チャートライブラリ
          if (id.includes('recharts') || id.includes('chart.js')) {
            return 'charts';
          }
          
          // その他の node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // チャンクファイル名にハッシュを付与
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // チャンクサイズの警告閾値
    chunkSizeWarningLimit: 500,
  },
});
```

**コード分割の効果計測：**

```
# Before（コード分割なし）
main.bundle.js: 1.2MB

# After（コード分割後）
react-core.js:    45KB  (初回読み込み)
router.js:        28KB  (初回読み込み)
ui-components.js: 89KB  (初回読み込み)
main.js:          67KB  (初回読み込み)
charts.js:       312KB  (必要時のみ読み込み)
vendor.js:       180KB  (キャッシュ可能)

初回読み込み: 229KB (80.9%削減)
```

---

## 4. 画像最適化

画像は多くのウェブページで転送量の50-70%を占める。適切な画像最適化は最もROIの高いパフォーマンス改善の一つだ。

### 4.1 モダン画像フォーマット

```html
<!-- picture 要素で複数フォーマットをサポート -->
<picture>
  <!-- AVIF: 最新・最高圧縮率 -->
  <source
    srcset="/images/hero.avif 1x, /images/hero@2x.avif 2x"
    type="image/avif"
  />
  <!-- WebP: 広くサポート -->
  <source
    srcset="/images/hero.webp 1x, /images/hero@2x.webp 2x"
    type="image/webp"
  />
  <!-- JPEG: フォールバック -->
  <img
    src="/images/hero.jpg"
    srcset="/images/hero.jpg 1x, /images/hero@2x.jpg 2x"
    alt="Hero Image"
    width="1200"
    height="600"
    loading="eager"
    decoding="async"
  />
</picture>
```

**フォーマット別ファイルサイズ比較（同等品質）：**

```
元画像（PNG）:    850KB
JPEG (quality 85): 145KB  (82.9%削減)
WebP (quality 80): 98KB   (88.5%削減)
AVIF (quality 60): 61KB   (92.8%削減)
```

### 4.2 Sharp を使った画像変換パイプライン

```javascript
// scripts/optimize-images.js
const sharp = require('sharp');
const glob = require('fast-glob');
const path = require('path');
const fs = require('fs/promises');

const INPUT_DIR = 'public/images/original';
const OUTPUT_DIR = 'public/images/optimized';

const SIZES = [320, 640, 960, 1280, 1920];
const QUALITY = { avif: 60, webp: 80, jpeg: 85 };

async function optimizeImage(inputPath) {
  const filename = path.basename(inputPath, path.extname(inputPath));
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  
  const tasks = [];
  
  for (const width of SIZES) {
    // 元画像より大きくしない
    if (width > metadata.width) continue;
    
    const height = Math.round((width / metadata.width) * metadata.height);
    const resized = image.clone().resize(width, height, {
      fit: 'cover',
      withoutEnlargement: true
    });
    
    // AVIF
    tasks.push(
      resized.clone()
        .avif({ quality: QUALITY.avif })
        .toFile(`${OUTPUT_DIR}/${filename}-${width}w.avif`)
    );
    
    // WebP
    tasks.push(
      resized.clone()
        .webp({ quality: QUALITY.webp })
        .toFile(`${OUTPUT_DIR}/${filename}-${width}w.webp`)
    );
    
    // JPEG
    tasks.push(
      resized.clone()
        .jpeg({ quality: QUALITY.jpeg, progressive: true })
        .toFile(`${OUTPUT_DIR}/${filename}-${width}w.jpg`)
    );
  }
  
  await Promise.all(tasks);
  console.log(`Optimized: ${filename}`);
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const images = await glob(`${INPUT_DIR}/**/*.{jpg,jpeg,png}`);
  
  for (const imagePath of images) {
    await optimizeImage(imagePath);
  }
  
  console.log('All images optimized!');
}

main().catch(console.error);
```

### 4.3 Intersection Observer を使った Lazy Loading

```javascript
// カスタム lazy loading の実装
class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px 0px',
      threshold: 0.01,
      ...options
    };
    
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      this.options
    );
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }
  
  loadImage(img) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;
    
    if (!src) return;
    
    // 画像の読み込み完了を待つ
    const tempImg = new Image();
    
    tempImg.onload = () => {
      img.src = src;
      if (srcset) img.srcset = srcset;
      img.classList.add('loaded');
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
    };
    
    tempImg.onerror = () => {
      img.classList.add('error');
    };
    
    tempImg.src = src;
  }
  
  observe(img) {
    this.observer.observe(img);
  }
  
  observeAll(selector = 'img[data-src]') {
    document.querySelectorAll(selector).forEach(img => this.observe(img));
  }
}

// 使用例
const loader = new LazyImageLoader({
  rootMargin: '100px 0px' // ビューポートの100px前から読み込み開始
});

loader.observeAll();
```

```css
/* Lazy Loading のCSSアニメーション */
img {
  opacity: 0;
  transition: opacity 0.3s ease;
}

img.loaded {
  opacity: 1;
}

img.error {
  opacity: 0.5;
}
```

### 4.4 Next.js での画像最適化設定

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1年
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.example.com',
        port: '',
        pathname: '/uploads/**',
      },
    ],
  },
};

module.exports = nextConfig;
```

---

## 5. Critical CSS と Above-the-fold 最適化

Critical CSS はファーストビューのレンダリングに必要な最小限のCSSを特定し、インライン化することで、レンダリングブロッキングを解消する技術だ。

### 5.1 Critical CSS の抽出

```javascript
// scripts/extract-critical-css.js
const critical = require('critical');

async function extractCriticalCSS() {
  const result = await critical.generate({
    base: 'dist/',
    src: 'index.html',
    target: {
      html: 'index-optimized.html',
      css: 'critical.css',
      uncritical: 'non-critical.css',
    },
    width: 1300,
    height: 900,
    // モバイルビューも考慮
    dimensions: [
      { width: 375, height: 667 },  // iPhone SE
      { width: 768, height: 1024 }, // iPad
      { width: 1300, height: 900 }, // Desktop
    ],
    inline: true,
    extract: true,
    minify: true,
    ignore: {
      // アニメーションは Critical CSS から除外
      atrule: ['@keyframes'],
      rule: [/\.animation-/, /\.transition-/],
    },
  });
  
  console.log('Critical CSS extracted successfully');
}

extractCriticalCSS();
```

**生成された HTML の構造：**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Example Site</title>
  
  <!-- Critical CSS をインライン化 -->
  <style>
    /* Above-the-fold に必要な最小限のスタイル */
    *,::after,::before{box-sizing:border-box}
    body{margin:0;font-family:'Helvetica Neue',Arial,sans-serif;line-height:1.6}
    .header{display:flex;align-items:center;padding:1rem 2rem;background:#fff}
    .hero{height:100vh;display:flex;align-items:center;justify-content:center}
    .hero-title{font-size:3rem;font-weight:700;color:#1a1a1a}
    /* ... */
  </style>
  
  <!-- 非Critical CSS は非同期読み込み -->
  <link
    rel="preload"
    href="/styles/main.css"
    as="style"
    onload="this.onload=null;this.rel='stylesheet'"
  />
  <noscript>
    <link rel="stylesheet" href="/styles/main.css">
  </noscript>
</head>
```

### 5.2 レンダリングブロッキングの解消

```html
<!-- 悪い例：ブロッキングCSS -->
<head>
  <link rel="stylesheet" href="/styles/main.css">
  <link rel="stylesheet" href="/styles/components.css">
  <link rel="stylesheet" href="/styles/animations.css">
</head>

<!-- 良い例：Critical CSS インライン + 非ブロッキング読み込み -->
<head>
  <!-- インライン Critical CSS -->
  <style>/* ... critical styles ... */</style>
  
  <!-- メインCSSを非同期で読み込む -->
  <link rel="preload" href="/styles/bundled.css" as="style" onload="this.rel='stylesheet'">
  
  <!-- フォールバック -->
  <noscript><link rel="stylesheet" href="/styles/bundled.css"></noscript>
  
  <!-- JavaScript も defer を使用 -->
  <script defer src="/scripts/main.js"></script>
</head>
```

### 5.3 コンテンツの優先度制御

```html
<!-- fetchpriority で優先度を明示的に指定 -->

<!-- LCP画像は高優先度 -->
<img src="/hero.webp" fetchpriority="high" alt="Hero" width="1200" height="600">

<!-- Below-the-fold の画像は低優先度 -->
<img src="/product-1.webp" fetchpriority="low" loading="lazy" alt="Product" width="400" height="400">

<!-- Critical なフォントは高優先度でpreload -->
<link rel="preload" as="font" href="/fonts/main.woff2" crossorigin fetchpriority="high">

<!-- 重要なAPIリクエストも高優先度 -->
<script>
fetch('/api/critical-data', { priority: 'high' })
  .then(r => r.json())
  .then(data => initApp(data));
</script>
```

---

## 6. JavaScript バンドル最適化

### 6.1 Tree Shaking

Tree Shaking は未使用コードをバンドルから除去するプロセスだ。ES Modules の静的解析に依存しているため、正しい書き方が重要になる。

```javascript
// 悪い例：ライブラリ全体をインポート
import _ from 'lodash'; // 70KB+ 全体が含まれる
const result = _.groupBy(items, 'category');

// 良い例1：名前付きインポートで必要な関数のみ
import { groupBy } from 'lodash-es'; // Tree shaking が効く
const result = groupBy(items, 'category');

// 良い例2：サブパッケージからインポート
import groupBy from 'lodash/groupBy'; // 必要な関数のみ
const result = groupBy(items, 'category');

// 良い例3：組み込みの代替を使用
// groupByはネイティブのObject.groupBy(ES2024)で代替可能
const result = Object.groupBy(items, item => item.category);
```

```javascript
// package.json での sideEffects 設定
{
  "name": "my-library",
  "sideEffects": false  // すべてのファイルがside-effect-free
}

// または特定のファイルのみ除外
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js"
  ]
}
```

**不要な polyfill の除去：**

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {
      // 対象ブラウザを指定してpolyfillを最小化
      targets: {
        browsers: [
          'last 2 Chrome versions',
          'last 2 Firefox versions',
          'last 2 Safari versions',
          'last 2 Edge versions'
        ]
      },
      useBuiltIns: 'usage', // 使用している機能のpolyfillのみ
      corejs: 3,
    }]
  ]
};
```

### 6.2 Minification と Compression

```javascript
// vite.config.ts での minification 設定
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  build: {
    minify: 'terser', // esbuild より高い圧縮率
    terserOptions: {
      compress: {
        drop_console: true,    // console.log を削除
        drop_debugger: true,   // debugger を削除
        pure_funcs: ['console.log', 'console.info'],
        passes: 3,             // 複数パスで圧縮
      },
      mangle: {
        safari10: true, // Safari 10 互換
      },
      format: {
        comments: false, // コメントを削除
      },
    },
  },
  plugins: [
    // バンドル分析
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

**gzip/Brotli 圧縮の設定：**

```nginx
# nginx.conf
http {
  # Brotli 圧縮（gzip より高い圧縮率）
  brotli on;
  brotli_comp_level 6;
  brotli_types
    text/plain
    text/css
    application/javascript
    application/json
    image/svg+xml;

  # gzip フォールバック
  gzip on;
  gzip_vary on;
  gzip_comp_level 6;
  gzip_min_length 1024;
  gzip_types
    text/plain
    text/css
    application/javascript
    application/json
    image/svg+xml;
    
  # 静的ファイルの事前圧縮ファイルを使用
  gzip_static on;
}
```

**ファイルサイズの比較：**

```
main.js (非圧縮):  245KB
main.js (gzip):    89KB  (63.7%削減)
main.js (brotli):  76KB  (69.0%削減)

styles.css (非圧縮):  98KB
styles.css (gzip):    18KB  (81.6%削減)
styles.css (brotli):  15KB  (84.7%削減)
```

---

## 7. Preloading・Prefetching・Resource Hints

リソースヒントはブラウザに対してリソースの読み込み戦略を指示するための仕組みだ。

### 7.1 各リソースヒントの使い分け

```html
<!-- preconnect: 接続確立を先行（DNS + TCP + TLS） -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://api.example.com">

<!-- dns-prefetch: DNS解決のみ先行（フォールバック用） -->
<link rel="dns-prefetch" href="https://cdn.example.com">
<link rel="dns-prefetch" href="https://analytics.google.com">

<!-- preload: 現在のページで確実に必要なリソース -->
<link rel="preload" as="font" href="/fonts/main.woff2" type="font/woff2" crossorigin>
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">
<link rel="preload" as="script" href="/scripts/critical.js">
<link rel="preload" as="style" href="/styles/critical.css">

<!-- prefetch: 次のページで使われる可能性があるリソース -->
<link rel="prefetch" href="/pages/about.html">
<link rel="prefetch" href="/images/about-hero.webp">

<!-- prerender: 次のページ全体を先行レンダリング -->
<link rel="prerender" href="https://example.com/next-page">

<!-- modulepreload: ES Modulesの先行読み込み -->
<link rel="modulepreload" href="/modules/app.js">
<link rel="modulepreload" href="/modules/router.js">
```

### 7.2 Speculation Rules API

```html
<!-- Chrome 108+ でサポートされた新しい Prerender/Prefetch API -->
<script type="speculationrules">
{
  "prerender": [
    {
      "where": {
        "href_matches": "/products/*"
      },
      "eagerness": "moderate"
    }
  ],
  "prefetch": [
    {
      "where": {
        "and": [
          { "href_matches": "/*" },
          { "not": { "href_matches": "/logout" } }
        ]
      },
      "eagerness": "conservative"
    }
  ]
}
</script>
```

```javascript
// JavaScript での動的 Speculation Rules
function addSpeculationRule(type, urls, eagerness = 'moderate') {
  if (!HTMLScriptElement.supports?.('speculationrules')) return;
  
  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify({
    [type]: [{
      urls,
      eagerness
    }]
  });
  
  document.head.appendChild(script);
}

// ユーザーがホバーした際に prefetch
document.querySelectorAll('a').forEach(link => {
  link.addEventListener('mouseover', () => {
    addSpeculationRule('prefetch', [link.href], 'moderate');
  });
});
```

### 7.3 Link Header を使ったサーバープッシュ代替

```javascript
// Node.js / Express でのリソースヒントヘッダー
app.use((req, res, next) => {
  if (req.path === '/') {
    res.setHeader('Link', [
      '</fonts/main.woff2>; rel=preload; as=font; crossorigin',
      '</styles/critical.css>; rel=preload; as=style',
      '</scripts/main.js>; rel=preload; as=script',
      '</api/initial-data>; rel=preconnect'
    ].join(', '));
  }
  next();
});
```

---

## 8. フォント最適化

### 8.1 font-display の設定

```css
/* 各 font-display 値の動作 */

/* swap: フォールバック表示後にカスタムフォントに切り替え（FLASHあり） */
@font-face {
  font-family: 'PrimaryFont';
  src: url('/fonts/primary.woff2') format('woff2');
  font-display: swap;
}

/* optional: 短時間待機後にフォールバック（CLS最小） */
@font-face {
  font-family: 'PrimaryFont';
  src: url('/fonts/primary.woff2') format('woff2');
  font-display: optional;
}

/* fallback: 中間的な動作 */
@font-face {
  font-family: 'PrimaryFont';
  src: url('/fonts/primary.woff2') format('woff2');
  font-display: fallback;
}
```

### 8.2 フォントサブセット化

```bash
# pyftsubset でフォントをサブセット化
pip install fonttools brotli zopfli

# 日本語フォントの必要文字のみ抽出
pyftsubset \
  NotoSansJP-Regular.ttf \
  --output-file=NotoSansJP-subset.woff2 \
  --flavor=woff2 \
  --unicodes="U+0020-007E,U+3000-303F,U+3040-309F,U+30A0-30FF,U+4E00-9FFF,U+FF00-FFEF"

# 英数字のみのサブセット
pyftsubset \
  CustomFont.ttf \
  --output-file=CustomFont-latin.woff2 \
  --flavor=woff2 \
  --unicodes="U+0020-007E,U+00C0-00D6,U+00D8-00F6"
```

**サイズ比較：**

```
NotoSansJP-Regular.ttf (フルセット): 4.8MB
NotoSansJP-subset.woff2 (よく使う文字のみ): 380KB (92%削減)
```

### 8.3 Google Fonts の最適化

```html
<!-- 悪い例：同期的な Google Fonts 読み込み -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">

<!-- 良い例：非同期読み込み + preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  rel="preload"
  as="style"
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=optional"
  onload="this.rel='stylesheet'"
>
<noscript>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=optional"
  >
</noscript>
```

**セルフホスティングへの移行（最良の選択）：**

```javascript
// next/font でセルフホスティング（Next.js）
import { Noto_Sans_JP } from 'next/font/google';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'optional',
  preload: true,
  variable: '--font-noto-sans-jp',
});

export default function RootLayout({ children }) {
  return (
    <html className={notoSansJP.variable}>
      <body>{children}</body>
    </html>
  );
}
```

---

## 9. キャッシュ戦略

適切なキャッシュ戦略は、繰り返し訪問時のパフォーマンスを劇的に改善する。

### 9.1 HTTP Cache ヘッダー

```nginx
# nginx.conf でのキャッシュヘッダー設定

# ハッシュ付きの静的アセット（永続キャッシュ）
location ~* \.(js|css|woff2|ico)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
  add_header Vary "Accept-Encoding";
}

# 画像（長期キャッシュ）
location ~* \.(jpg|jpeg|png|gif|webp|avif|svg)$ {
  add_header Cache-Control "public, max-age=2592000"; # 30日
  add_header Vary "Accept-Encoding";
}

# HTML（短期キャッシュ + 再検証）
location ~* \.html$ {
  add_header Cache-Control "public, max-age=0, must-revalidate";
  add_header ETag on;
}

# API レスポンス（キャッシュなし）
location /api/ {
  add_header Cache-Control "no-store";
}
```

```javascript
// Next.js App Router でのキャッシュ制御
// app/api/products/route.ts
export async function GET(request: Request) {
  const products = await fetchProducts();
  
  return Response.json(products, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

// Incremental Static Regeneration
// app/products/page.tsx
export const revalidate = 3600; // 1時間ごとに再生成

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductList products={products} />;
}
```

### 9.2 Service Worker によるキャッシュ

```javascript
// public/sw.js
const CACHE_NAME = 'app-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/styles/main.css',
  '/scripts/app.js',
];

// インストール時に静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ戦略の実装
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 静的アセット: Cache First
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // 画像: Stale While Revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  
  // API: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // HTMLページ: Network First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request).catch(() => 
        caches.match('/offline.html')
      )
    );
    return;
  }
  
  event.respondWith(networkFirst(request));
});

// Cache First 戦略
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

// Stale While Revalidate 戦略
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  const networkPromise = fetch(request).then(response => {
    cache.put(request, response.clone());
    return response;
  });
  
  return cached || networkPromise;
}

// Network First 戦略
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match(request);
  }
}
```

### 9.3 CDN 設定と Edge Caching

```javascript
// Cloudflare Workers でのキャッシュ最適化
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    
    // キャッシュから取得を試みる
    let response = await cache.match(cacheKey);
    
    if (!response) {
      // オリジンから取得
      response = await fetch(request);
      
      // レスポンスをクローンしてキャッシュに保存
      const responseToCache = response.clone();
      ctx.waitUntil(
        cache.put(cacheKey, responseToCache)
      );
    }
    
    // キャッシュ状態をヘッダーに追加
    const headers = new Headers(response.headers);
    headers.set('X-Cache-Status', response.cf?.cacheStatus || 'MISS');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
```

---

## 10. レンダリング最適化

### 10.1 React.memo と useMemo

```javascript
// 不要な再レンダリングを防ぐ
import { memo, useMemo, useCallback } from 'react';

// React.memo: propsが変わらない限り再レンダリングしない
const ProductCard = memo(function ProductCard({ product, onAddToCart }) {
  console.log('ProductCard rendered:', product.id);
  
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} width={200} height={200} />
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      <button onClick={() => onAddToCart(product)}>カートに追加</button>
    </div>
  );
});

// カスタム比較関数でより細かい制御
const ExpensiveComponent = memo(
  function ExpensiveComponent({ data, filters }) {
    return <DataTable data={data} />;
  },
  (prevProps, nextProps) => {
    // filtersが変わらなければ再レンダリングしない
    return JSON.stringify(prevProps.filters) === JSON.stringify(nextProps.filters);
  }
);

function ProductList({ products, filters }) {
  // useMemo: 重い計算をメモ化
  const filteredProducts = useMemo(() => {
    console.log('Filtering products...');
    return products
      .filter(p => filters.categories.includes(p.category))
      .filter(p => p.price >= filters.minPrice && p.price <= filters.maxPrice)
      .sort((a, b) => b.rating - a.rating);
  }, [products, filters]);
  
  // useCallback: 関数をメモ化（子コンポーネントへの props として渡す場合）
  const handleAddToCart = useCallback((product) => {
    addToCart(product);
    trackEvent('add_to_cart', { product_id: product.id });
  }, []); // 依存なし
  
  return (
    <div>
      {filteredProducts.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  );
}
```

### 10.2 Virtualization（仮想化）

```javascript
// react-window での仮想リスト実装
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const ITEM_HEIGHT = 80;

const Row = ({ index, style, data }) => {
  const item = data[index];
  
  return (
    <div style={style} className="list-item">
      <img src={item.avatar} alt={item.name} width={40} height={40} />
      <span>{item.name}</span>
      <span>{item.email}</span>
    </div>
  );
};

function VirtualizedList({ items }) {
  return (
    <AutoSizer>
      {({ height, width }) => (
        <FixedSizeList
          height={height}
          itemCount={items.length}
          itemSize={ITEM_HEIGHT}
          width={width}
          itemData={items}
          overscanCount={5} // ビューポート外に追加描画する数
        >
          {Row}
        </FixedSizeList>
      )}
    </AutoSizer>
  );
}

// TanStack Virtual での実装（より現代的）
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualTable({ rows }) {
  const parentRef = React.useRef(null);
  
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10,
  });
  
  return (
    <div
      ref={parentRef}
      style={{ height: '600px', overflow: 'auto' }}
    >
      <div
        style={{ height: virtualizer.getTotalSize() + 'px', position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size + 'px',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <TableRow row={rows[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 10.3 CSS Containment

```css
/* CSS Containment でレンダリングスコープを制限 */

/* layout containment: 子要素の変更が外部レイアウトに影響しない */
.card {
  contain: layout;
}

/* paint containment: 子要素のペイントが境界外に出ない */
.widget {
  contain: paint;
}

/* strict containment: size + layout + paint + style */
.isolated-component {
  contain: strict;
}

/* content-visibility: スクリーン外の要素のレンダリングをスキップ */
.article-card {
  content-visibility: auto;
  contain-intrinsic-size: 0 300px; /* 推定サイズでスクロールバーを安定化 */
}

/* will-change: ハードウェアアクセラレーションを有効化 */
.animated-element {
  will-change: transform, opacity; /* アニメーション直前に設定 */
}

/* アニメーション後は will-change を解除 */
.animated-element.animation-done {
  will-change: auto;
}
```

---

## 11. ネットワーク最適化

### 11.1 HTTP/3 と QUIC

```nginx
# nginx.conf での HTTP/3 有効化
http {
  server {
    listen 443 quic reuseport;
    listen 443 ssl;
    
    http2 on;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # HTTP/3 の Alt-Svc ヘッダー
    add_header Alt-Svc 'h3=":443"; ma=86400, h3-29=":443"; ma=86400';
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    
    # 103 Early Hints
    http2_push_preload on;
  }
}
```

### 11.2 103 Early Hints

```javascript
// Node.js での 103 Early Hints 実装
import http2 from 'http2';

const server = http2.createSecureServer(options);

server.on('request', (req, res) => {
  if (req.headers[':path'] === '/') {
    // クリティカルなリソースを事前通知
    res.writeEarlyHints({
      link: [
        '</styles/critical.css>; rel=preload; as=style',
        '</scripts/app.js>; rel=preload; as=script',
        '</fonts/main.woff2>; rel=preload; as=font; crossorigin',
      ].join(', ')
    });
    
    // ... 通常のレスポンス処理 ...
    generateAndSendPage(res);
  }
});
```

### 11.3 Request Batching と GraphQL

```javascript
// DataLoader でのN+1問題解決
const DataLoader = require('dataloader');

// バッチ関数: 複数のIDを一度のクエリで取得
const userLoader = new DataLoader(async (userIds) => {
  const users = await db.query(
    'SELECT * FROM users WHERE id IN (?)',
    [userIds]
  );
  
  // IDの順序を保って返す
  return userIds.map(id => users.find(u => u.id === id));
});

// GraphQL リゾルバーでの使用
const resolvers = {
  Post: {
    // N+1問題: 各投稿の著者を個別に取得
    // author: (post) => db.query('SELECT * FROM users WHERE id = ?', [post.authorId])
    
    // DataLoaderでバッチ化: 1回のクエリで全著者を取得
    author: (post) => userLoader.load(post.authorId),
  }
};
```

**Apollo Client でのキャッシュ設定：**

```javascript
// Apollo Client のキャッシュ最適化
import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache({
    typePolicies: {
      Product: {
        fields: {
          // 無限スクロール用のページネーションキャッシュ
          reviews: {
            keyArgs: ['productId'],
            merge(existing = { items: [], total: 0 }, incoming) {
              return {
                ...incoming,
                items: [...(existing.items || []), ...incoming.items],
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network', // キャッシュ表示後にネットワーク更新
    },
  },
});
```

---

## 12. Bundle 分析ツール

### 12.1 Webpack Bundle Analyzer

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE ? 'server' : 'disabled',
      analyzerHost: 'localhost',
      analyzerPort: 8888,
      openAnalyzer: true,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
      statsOptions: {
        source: false
      },
    }),
  ],
};
```

```bash
# 分析実行
ANALYZE=true npm run build
```

### 12.2 rollup-plugin-visualizer（Vite）

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    visualizer({
      filename: 'dist/bundle-stats.html',
      open: mode === 'analyze',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // treemap | sunburst | network
    }),
  ],
}));
```

```bash
# 分析モードで実行
npm run build -- --mode analyze
```

### 12.3 import-cost の VSCode 拡張

```javascript
// import-cost で依存関係のサイズを可視化
// VSCode 上で以下のように表示される:
import { groupBy } from 'lodash';          // 70.9 kB (gzipped: 25.1 kB)
import { groupBy } from 'lodash-es';       // 4.1 kB (gzipped: 1.8 kB)
import groupBy from 'lodash/groupBy';      // 1.2 kB (gzipped: 0.6 kB)
import { clsx } from 'clsx';              // 0.5 kB (gzipped: 0.3 kB)
import dayjs from 'dayjs';               // 6.8 kB (gzipped: 2.9 kB)
import { format } from 'date-fns';       // 1.1 kB (gzipped: 0.6 kB)
```

### 12.4 依存関係の監査と代替

```bash
# bundle-phobia でパッケージサイズを事前確認
npx bundle-phobia react
npx bundle-phobia lodash

# bundlejs.com API 経由での自動チェック
curl "https://bundlejs.com/api?q=axios&config={\"esbuild\":{\"minify\":true}}"

# depcheck で未使用の依存を検出
npx depcheck

# npm-check-updates で依存関係を更新
npx npm-check-updates -u
npm install
```

**依存関係の軽量代替：**

```
重い依存 -> 軽量代替
moment.js (67.9KB) -> dayjs (2KB) / date-fns (必要なものだけ)
axios (13.5KB)     -> ky (4.3KB) / native fetch
lodash (70KB)      -> lodash-es (tree shakable) / ES2024 native
styled-components  -> CSS Modules / vanilla-extract
chart.js (62KB)    -> lightweight-charts / uPlot
```

---

## 13. Partytown と Third-party Script 最適化

### 13.1 Partytown の仕組みと設定

Partytown は、サードパーティスクリプト（アナリティクス、広告、チャットウィジェット等）をWeb Workerで実行することで、メインスレッドへの影響を最小化するライブラリだ。

```javascript
// Next.js での Partytown 設定
// app/layout.tsx
import { Partytown } from '@builder.io/partytown/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Partytown
          debug={process.env.NODE_ENV === 'development'}
          forward={['dataLayer.push', 'gtag']}
        />
        
        {/* Google Analytics を Partytown 経由で実行 */}
        <script
          type="text/partytown"
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
        />
        <script
          type="text/partytown"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX');
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 13.2 Script の遅延読み込み戦略

```javascript
// サードパーティスクリプトの段階的読み込み
class ScriptLoader {
  constructor() {
    this.loaded = new Set();
  }
  
  // インタラクション後に読み込む
  loadOnInteraction(src, id) {
    const events = ['mousedown', 'keydown', 'touchstart', 'wheel'];
    
    const load = () => {
      if (!this.loaded.has(id)) {
        this.loadScript(src, id);
        events.forEach(e => document.removeEventListener(e, load));
      }
    };
    
    events.forEach(e => document.addEventListener(e, load, { once: true }));
  }
  
  // アイドル時に読み込む
  loadOnIdle(src, id, timeout = 4000) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.loadScript(src, id), { timeout });
    } else {
      setTimeout(() => this.loadScript(src, id), timeout);
    }
  }
  
  // スクロール後に読み込む
  loadOnScroll(src, id, threshold = 300) {
    const load = () => {
      if (window.scrollY > threshold) {
        this.loadScript(src, id);
        window.removeEventListener('scroll', load);
      }
    };
    window.addEventListener('scroll', load, { passive: true });
  }
  
  loadScript(src, id) {
    if (this.loaded.has(id)) return;
    
    const script = document.createElement('script');
    script.src = src;
    script.id = id;
    script.async = true;
    document.body.appendChild(script);
    this.loaded.add(id);
  }
}

const loader = new ScriptLoader();

// チャットウィジェットはインタラクション後に読み込む
loader.loadOnInteraction(
  'https://chat-widget.example.com/chat.js',
  'chat-widget'
);

// アナリティクスはアイドル時に読み込む
loader.loadOnIdle(
  'https://analytics.example.com/track.js',
  'analytics'
);

// コメントウィジェットはスクロール後に読み込む
loader.loadOnScroll(
  'https://comments.example.com/embed.js',
  'comments'
);
```

### 13.3 Facade パターン

```javascript
// YouTube 動画の Facade パターン
// 実際の埋め込みは再生ボタンが押されるまで遅延

function YouTubeFacade({ videoId, title }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  
  if (!isLoaded) {
    return (
      <div
        className="youtube-facade"
        style={{ aspectRatio: '16/9', position: 'relative', cursor: 'pointer' }}
        onClick={() => setIsLoaded(true)}
      >
        <img
          src={thumbnailUrl}
          alt={title}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div className="play-button" aria-label={`${title}を再生`}>
          <svg viewBox="0 0 68 48" width="68" height="48">
            <path
              d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z"
              fill="#f00"
            />
            <path d="M 45,24 27,14 27,34" fill="#fff" />
          </svg>
        </div>
      </div>
    );
  }
  
  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{ aspectRatio: '16/9', width: '100%', border: 'none' }}
    />
  );
}
```

---

## 14. パフォーマンスモニタリング（Real User Monitoring）

### 14.1 Web Vitals ライブラリ

```javascript
// web-vitals ライブラリで全メトリクスを収集
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

const vitals = {};

function sendToAnalytics(metric) {
  vitals[metric.name] = metric.value;
  
  // Beacon API でデータを送信（ページ離脱時も確実に送れる）
  if (navigator.sendBeacon) {
    const data = JSON.stringify({
      url: window.location.href,
      metric: metric.name,
      value: metric.value,
      rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
      navigationType: metric.navigationType,
      id: metric.id,
    });
    
    navigator.sendBeacon('/api/vitals', data);
  }
  
  // Google Analytics 4
  if (typeof gtag !== 'undefined') {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
}

// 全メトリクスを監視
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### 14.2 カスタム RUM の実装

```javascript
// rum.js - Real User Monitoring
class RealUserMonitoring {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.data = {
      sessionId: crypto.randomUUID(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connection: navigator.connection?.effectiveType,
      deviceMemory: navigator.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      metrics: {},
      errors: [],
      interactions: [],
    };
    
    this.init();
  }
  
  init() {
    this.collectNavigationTiming();
    this.collectWebVitals();
    this.collectErrors();
    this.collectInteractions();
    this.sendOnUnload();
  }
  
  collectNavigationTiming() {
    window.addEventListener('load', () => {
      const nav = performance.getEntriesByType('navigation')[0];
      
      this.data.metrics.navigation = {
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        fcp: this.getFCP(),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
        loadComplete: Math.round(nav.loadEventEnd),
        transferSize: nav.transferSize,
        encodedBodySize: nav.encodedBodySize,
        decodedBodySize: nav.decodedBodySize,
      };
    });
  }
  
  getFCP() {
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    return fcpEntry ? Math.round(fcpEntry.startTime) : null;
  }
  
  collectErrors() {
    window.addEventListener('error', (event) => {
      this.data.errors.push({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now(),
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.data.errors.push({
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        timestamp: Date.now(),
      });
    });
  }
  
  collectInteractions() {
    ['click', 'keydown', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.data.interactions.push({
          type: eventType,
          timestamp: Date.now(),
        });
      }, { passive: true, capture: true });
    });
  }
  
  sendOnUnload() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.send();
      }
    });
    
    window.addEventListener('beforeunload', () => {
      this.send();
    });
  }
  
  send() {
    const payload = JSON.stringify(this.data);
    
    if (navigator.sendBeacon(this.endpoint, payload)) {
      return;
    }
    
    // フォールバック
    fetch(this.endpoint, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}

// 初期化
const rum = new RealUserMonitoring('/api/rum');
```

### 14.3 パフォーマンスバジェットの設定

```javascript
// performance-budget.js
const PERFORMANCE_BUDGET = {
  // ファイルサイズ制限 (bytes)
  bundles: {
    javascript: 170 * 1024,  // 170KB gzip
    css: 50 * 1024,          // 50KB gzip
    images: 500 * 1024,      // 500KB per page
    fonts: 100 * 1024,       // 100KB
  },
  // タイミング制限 (ms)
  timings: {
    fcp: 1800,    // First Contentful Paint
    lcp: 2500,    // Largest Contentful Paint
    ttfb: 800,    // Time to First Byte
    tbt: 200,     // Total Blocking Time
  },
  // Lighthouse スコア
  lighthouse: {
    performance: 90,
    accessibility: 95,
    'best-practices': 95,
    seo: 95,
  },
};

// webpack での使用
module.exports = {
  performance: {
    hints: 'error',
    maxAssetSize: PERFORMANCE_BUDGET.bundles.javascript,
    maxEntrypointSize: PERFORMANCE_BUDGET.bundles.javascript,
    assetFilter: (assetFilename) => /\.(js|css)$/.test(assetFilename),
  },
};
```

---

## パフォーマンス改善の全体的な効果

以下は、本ガイドの手法を一つのプロジェクトで適用した際の実際の改善結果だ。

### Before（最適化前）

```
Lighthouse Performance Score: 42
First Contentful Paint:        3.8s
Largest Contentful Paint:      7.2s
Total Blocking Time:           1,240ms
Cumulative Layout Shift:       0.42
Speed Index:                   5.1s

転送量合計: 4.2MB
初回読み込みJS: 1.8MB
```

### After（最適化後）

```
Lighthouse Performance Score: 97
First Contentful Paint:        0.9s  (76.3%改善)
Largest Contentful Paint:      1.8s  (75.0%改善)
Total Blocking Time:           45ms  (96.4%改善)
Cumulative Layout Shift:       0.03  (92.9%改善)
Speed Index:                   1.2s  (76.5%改善)

転送量合計: 680KB (83.8%削減)
初回読み込みJS: 178KB (90.1%削減)
```

### 適用した主な施策とインパクト

```
施策                          スコア改善  実施難易度
--------------------------------
画像フォーマット最適化（WebP/AVIF）  +15pts    低
Critical CSS のインライン化         +12pts    中
コード分割の実装                   +18pts    中
フォント最適化                     +8pts     低
Service Worker キャッシュ           +10pts    高
Third-party Script の遅延読み込み   +14pts    中
```

---

## 開発ツールとしての活用

パフォーマンス最適化の作業を効率化するために、適切な開発ツールを活用することが重要だ。[DevToolBox](https://usedevtools.com) は、フロントエンド開発に必要なユーティリティツールを一箇所に集約したウェブアプリケーションだ。Base64エンコード/デコード、JSON フォーマッター、正規表現テスター、カラーパレット生成など、日常的な開発作業を効率化する多数のツールを提供している。

パフォーマンス最適化の過程では、JSONレスポンスの確認や設定ファイルの検証など、さまざまなデータ変換作業が発生する。このようなツールを活用することで、開発の流れを止めることなく作業を進めることができる。

---

## まとめ

フロントエンドパフォーマンス最適化は、一度やれば終わりではなく、継続的な改善サイクルが必要なプロセスだ。本ガイドで解説した内容を実践する際は、以下の優先順位で取り組むことを推奨する。

### 優先度高（即効性が高い施策）

1. 画像フォーマットの最適化（WebP/AVIF変換）
2. フォントの `font-display: optional` 設定
3. JavaScriptとCSSの非同期/遅延読み込み
4. Critical CSSのインライン化
5. `<img>` タグへの `width`/`height` 属性付与（CLS防止）

### 優先度中（構造的な改善が必要な施策）

6. コード分割とDynamic Import
7. サードパーティスクリプトの遅延読み込み
8. キャッシュ戦略の整備
9. 画像のLazy Loading実装
10. Lighthouse CI の導入

### 優先度低（高度な最適化）

11. Service Worker の実装
12. HTTP/3 の有効化
13. Bundle 分析と依存関係の最適化
14. RUM（Real User Monitoring）の導入
15. Partytown によるサードパーティスクリプト最適化

パフォーマンス改善は、ユーザー体験の向上とビジネス指標の改善に直結する投資だ。Lighthouse スコアの向上を目標とするだけでなく、実際のユーザー体験（Core Web Vitals のフィールドデータ）を継続的に監視し、改善を続けることが重要だ。

計測 -> 分析 -> 改善 -> 検証というサイクルを回し続けることで、Lighthouse 100点だけでなく、ユーザーに本当に価値のある高速なウェブ体験を提供することができる。

