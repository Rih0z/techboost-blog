---
title: 'Core Web Vitals最適化完全ガイド - LCP/FID/CLS/INP改善の実践テクニック'
description: 'Googleのコアウェブバイタル（LCP、FID、CLS、INP）を徹底的に改善する方法を解説。具体的な最適化テクニック、計測ツール、継続的モニタリングの実装まで網羅します。'
pubDate: 'Feb 05 2026'
tags: ['プログラミング']
---

# Core Web Vitals最適化完全ガイド - LCP/FID/CLS/INP改善の実践テクニック

Webサイトのパフォーマンスは、ユーザー体験とSEOの両面で極めて重要です。Googleは2024年3月にFIDをINPに置き換え、Core Web Vitalsの指標を更新しました。

本記事では、LCP、INP、CLSの3つの指標を徹底的に改善する方法を、実践的なコード例とともに解説します。

## Core Web Vitalsとは？

Core Web Vitalsは、Googleが定義したユーザー体験の品質を測る3つの指標です。

### 1. LCP (Largest Contentful Paint)

**定義**: ビューポート内で最も大きなコンテンツ要素が表示されるまでの時間

**目標値**:
- Good: 2.5秒以内
- Needs Improvement: 2.5〜4.0秒
- Poor: 4.0秒以上

### 2. INP (Interaction to Next Paint)

**定義**: ユーザー操作から次の画面描画までの時間（FIDの後継）

**目標値**:
- Good: 200ms以内
- Needs Improvement: 200〜500ms
- Poor: 500ms以上

### 3. CLS (Cumulative Layout Shift)

**定義**: ページの視覚的な安定性（予期しないレイアウトのずれ）

**目標値**:
- Good: 0.1以下
- Needs Improvement: 0.1〜0.25
- Poor: 0.25以上

## LCP（Largest Contentful Paint）の最適化

### LCPに影響する要素

```javascript
// LCP要素の特定
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];

  console.log('LCP element:', lastEntry.element);
  console.log('LCP time:', lastEntry.renderTime || lastEntry.loadTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

### 1. 画像の最適化

#### 最新のフォーマットを使用

```html
<!-- WebP/AVIF対応 -->
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Hero image" width="1200" height="600">
</picture>
```

#### 優先度の高い画像をプリロード

```html
<head>
  <!-- LCP画像をプリロード -->
  <link rel="preload" as="image" href="/hero.webp" fetchpriority="high">
</head>

<!-- または直接指定 -->
<img src="hero.webp" alt="Hero" fetchpriority="high">
```

#### レスポンシブ画像の実装

```html
<img
  srcset="
    small.webp 400w,
    medium.webp 800w,
    large.webp 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
  src="large.webp"
  alt="Responsive image"
  width="1200"
  height="600"
  loading="lazy"
>
```

### 2. リソースの読み込み最適化

#### 重要なリソースをプリロード

```html
<head>
  <!-- クリティカルなフォント -->
  <link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>

  <!-- クリティカルなCSS -->
  <link rel="preload" href="/critical.css" as="style">

  <!-- 重要なJavaScript -->
  <link rel="modulepreload" href="/main.js">
</head>
```

#### クリティカルCSSのインライン化

```html
<head>
  <style>
    /* Above-the-fold コンテンツのスタイル */
    .hero {
      background: #f0f0f0;
      min-height: 400px;
    }
    .hero h1 {
      font-size: 3rem;
      color: #333;
    }
  </style>

  <!-- 非クリティカルCSSを遅延読み込み -->
  <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles.css"></noscript>
</head>
```

### 3. サーバー応答時間の改善

#### CDNの活用

```javascript
// Cloudflare Pages設定例
export const onRequest = async (context) => {
  const response = await context.next();

  // キャッシュヘッダーの設定
  response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return response;
};
```

#### 静的サイト生成（SSG）

```javascript
// Next.js
export async function getStaticProps() {
  const data = await fetchData();

  return {
    props: { data },
    revalidate: 3600, // ISR: 1時間ごとに再生成
  };
}

// Astro
---
const data = await fetchData();
---
<div>{data.title}</div>
```

### 4. レンダリングブロックの削減

```html
<!-- JavaScriptを非同期読み込み -->
<script src="/script.js" defer></script>
<script src="/analytics.js" async></script>

<!-- 型がmoduleの場合、自動的にdefer -->
<script type="module" src="/app.js"></script>
```

## INP（Interaction to Next Paint）の最適化

### 1. 長時間実行タスクの分割

#### 悪い例

```javascript
function processLargeDataset(data) {
  // 🔴 メインスレッドをブロック
  for (let i = 0; i < data.length; i++) {
    processItem(data[i]);
  }
}
```

#### 良い例: Scheduler APIの使用

```javascript
async function processLargeDataset(data) {
  for (let i = 0; i < data.length; i++) {
    processItem(data[i]);

    // 50ms以上実行していたら譲る
    if (i % 100 === 0) {
      await scheduler.yield();
    }
  }
}

// または手動実装
function yieldToMain() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

async function processLargeDataset(data) {
  for (let i = 0; i < data.length; i++) {
    processItem(data[i]);

    if (i % 100 === 0) {
      await yieldToMain();
    }
  }
}
```

### 2. requestIdleCallbackの活用

```javascript
function performNonCriticalWork() {
  requestIdleCallback((deadline) => {
    while (deadline.timeRemaining() > 0 && tasks.length > 0) {
      const task = tasks.shift();
      task();
    }

    if (tasks.length > 0) {
      performNonCriticalWork();
    }
  });
}
```

### 3. イベントハンドラーの最適化

#### デバウンスとスロットリング

```javascript
// デバウンス: 最後の呼び出しから一定時間後に実行
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// 使用例
const handleSearch = debounce((query) => {
  searchAPI(query);
}, 300);

// スロットリング: 一定間隔でのみ実行
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 使用例
const handleScroll = throttle(() => {
  updateScrollPosition();
}, 100);
```

### 4. Web Workerの活用

```javascript
// worker.js
self.addEventListener('message', (e) => {
  const { data } = e;
  const result = heavyComputation(data);
  self.postMessage(result);
});

// main.js
const worker = new Worker('/worker.js');

worker.addEventListener('message', (e) => {
  console.log('Result:', e.data);
});

worker.postMessage(largeDataset);
```

### 5. React/Vueでの最適化

#### React

```javascript
import { useDeferredValue, useTransition } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Results query={deferredQuery} />
    </>
  );
}

// または useTransition
function App() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('home');

  const selectTab = (nextTab) => {
    startTransition(() => {
      setTab(nextTab);
    });
  };

  return (
    <>
      <TabButton onClick={() => selectTab('home')}>Home</TabButton>
      <TabButton onClick={() => selectTab('about')}>About</TabButton>
      {isPending && <Spinner />}
      <TabContent tab={tab} />
    </>
  );
}
```

#### Vue

```vue
<script setup>
import { ref, computed } from 'vue';

const query = ref('');
const results = computed(() => {
  // 重い計算
  return heavySearch(query.value);
});

// デバウンス付きwatcher
import { watchDebounced } from '@vueuse/core';

watchDebounced(
  query,
  (newQuery) => {
    fetchResults(newQuery);
  },
  { debounce: 300 }
);
</script>
```

## CLS（Cumulative Layout Shift）の最適化

### 1. 画像・動画のサイズ指定

```html
<!-- ✅ Good: サイズを明示 -->
<img src="image.jpg" width="800" height="600" alt="Image">

<!-- ✅ CSSでアスペクト比を指定 -->
<style>
  .image-container {
    aspect-ratio: 16 / 9;
  }
  .image-container img {
    width: 100%;
    height: auto;
  }
</style>

<div class="image-container">
  <img src="image.jpg" alt="Image">
</div>
```

### 2. フォント読み込みの最適化

```html
<head>
  <!-- font-displayでフォント読み込み動作を制御 -->
  <link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>

  <style>
    @font-face {
      font-family: 'Main';
      src: url('/fonts/main.woff2') format('woff2');
      font-display: swap; /* フォールバックフォントを即座に表示 */
    }

    body {
      font-family: 'Main', system-ui, sans-serif;
    }
  </style>
</head>
```

または、Font Loading APIを使用:

```javascript
const font = new FontFace('Main', 'url(/fonts/main.woff2)');

font.load().then(() => {
  document.fonts.add(font);
  document.body.classList.add('font-loaded');
});
```

### 3. 広告・埋め込みコンテンツのスペース確保

```html
<!-- 広告スロットにmin-heightを設定 -->
<div class="ad-slot" style="min-height: 250px;">
  <!-- 広告が読み込まれる -->
</div>

<style>
  .ad-slot {
    min-height: 250px;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ad-slot::before {
    content: 'Advertisement';
    color: #999;
  }
</style>
```

### 4. 動的コンテンツの挿入

```javascript
// ✅ Good: transform を使用
element.style.transform = 'translateY(100px)';

// 🔴 Bad: top を変更
element.style.top = '100px';

// ✅ Good: content-visibility を使用
.lazy-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}
```

### 5. アニメーションの最適化

```css
/* ✅ Good: transform/opacityのみアニメーション */
.element {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.element:hover {
  transform: scale(1.1);
  opacity: 0.8;
}

/* 🔴 Bad: width/heightをアニメーション */
.element {
  transition: width 0.3s ease;
}
```

## 計測ツールと継続的モニタリング

### 1. Web Vitals ライブラリ

```bash
npm install web-vitals
```

```javascript
import { onCLS, onINP, onLCP } from 'web-vitals';

onCLS(console.log);
onINP(console.log);
onLCP(console.log);

// Analyticsに送信
function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', { body, method: 'POST', keepalive: true });
  }
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
```

### 2. Performance Observer API

```javascript
// LCPの詳細を取得
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('LCP candidate:', {
      element: entry.element,
      size: entry.size,
      loadTime: entry.loadTime,
      renderTime: entry.renderTime,
      url: entry.url,
    });
  }
});

observer.observe({ type: 'largest-contentful-paint', buffered: true });

// Long Tasksの検出
const longTaskObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn('Long task detected:', {
      duration: entry.duration,
      startTime: entry.startTime,
    });
  }
});

longTaskObserver.observe({ type: 'longtask', buffered: true });

// Layout Shiftsの検出
const layoutShiftObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      console.warn('Layout shift:', {
        value: entry.value,
        sources: entry.sources,
      });
    }
  }
});

layoutShiftObserver.observe({ type: 'layout-shift', buffered: true });
```

### 3. Google Analytics連携

```javascript
// GA4にCore Web Vitalsを送信
import { onCLS, onINP, onLCP } from 'web-vitals';

function sendToGoogleAnalytics({ name, delta, value, id }) {
  gtag('event', name, {
    event_category: 'Web Vitals',
    value: Math.round(name === 'CLS' ? delta * 1000 : delta),
    event_label: id,
    non_interaction: true,
  });
}

onCLS(sendToGoogleAnalytics);
onINP(sendToGoogleAnalytics);
onLCP(sendToGoogleAnalytics);
```

### 4. リアルユーザーモニタリング（RUM）

```javascript
// Sentryでのパフォーマンス監視
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: 'YOUR_DSN',
  integrations: [
    new BrowserTracing(),
    new Sentry.BrowserProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

// カスタムメトリクスを送信
Sentry.metrics.distribution('lcp', lcpValue, {
  tags: { page: window.location.pathname },
  unit: 'millisecond',
});
```

### 5. Lighthouseの自動化

```javascript
// package.json
{
  "scripts": {
    "lighthouse": "lighthouse https://example.com --output html --output-path ./lighthouse-report.html"
  }
}
```

CI/CDでの実行:

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://example.com
            https://example.com/about
          uploadArtifacts: true
          temporaryPublicStorage: true
```

## 実践的な最適化チェックリスト

### LCP改善

```markdown
- [ ] LCP要素を特定
- [ ] 重要な画像にfetchpriority="high"を設定
- [ ] 画像をWebP/AVIF形式に変換
- [ ] クリティカルCSSをインライン化
- [ ] レンダリングブロックリソースを削減
- [ ] CDN/静的サイト生成を導入
- [ ] サーバー応答時間を2秒以内に
```

### INP改善

```markdown
- [ ] 長時間タスクを分割（scheduler.yield使用）
- [ ] イベントハンドラーにデバウンス/スロットリング適用
- [ ] 重い処理をWeb Workerに移行
- [ ] React/VueでuseDeferredValue/useTransition使用
- [ ] requestIdleCallbackで非重要処理を実行
- [ ] パフォーマンスプロファイリング実施
```

### CLS改善

```markdown
- [ ] すべての画像・動画にサイズ指定
- [ ] フォントにfont-display: swapを設定
- [ ] 広告・埋め込みにmin-height設定
- [ ] transformのみでアニメーション
- [ ] content-visibilityで遅延レンダリング
- [ ] Layout Shift Observerで問題箇所特定
```

## まとめ

Core Web Vitalsの最適化は、ユーザー体験とSEOの両面で重要です。

**重要ポイント**:
1. **計測から始める**: Web Vitalsライブラリで現状を把握
2. **優先順位をつける**: 最もインパクトの大きい改善から着手
3. **継続的モニタリング**: RUMで実ユーザーのデータを収集
4. **段階的改善**: 一度にすべてを変えず、小さな改善を積み重ねる

これらの最適化により、Webサイトのパフォーマンスは劇的に向上し、ユーザー満足度とビジネス指標の改善につながります。今日から計測を始めて、一つずつ改善していきましょう。
