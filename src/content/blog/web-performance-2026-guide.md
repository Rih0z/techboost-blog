---
title: 'Webパフォーマンス最適化完全ガイド2026 - Core Web Vitals、INP、Speculation Rules APIまで徹底解説'
description: 'Core Web Vitals、INP対策、画像最適化、レンダリング戦略、Speculation Rules APIまで。2026年版Webパフォーマンス最適化の決定版ガイド'
pubDate: 'Feb 05 2026'
tags: ['パフォーマンス', 'Web Vitals', '最適化', 'フロントエンド']
---

# Webパフォーマンス最適化完全ガイド2026

Webパフォーマンスは、ユーザー体験、SEO、コンバージョン率に直接影響する重要な要素です。本記事では、2026年時点での最新のパフォーマンス最適化技術を徹底解説します。

## 目次

1. Core Web Vitalsの理解と最適化
2. INP（Interaction to Next Paint）完全攻略
3. 画像最適化の最新技術
4. レンダリング戦略の選択
5. Speculation Rules API
6. フォント最適化
7. JavaScriptパフォーマンス
8. ネットワーク最適化
9. 測定とモニタリング

## Core Web Vitalsの理解と最適化

### Core Web Vitalsとは

Googleが定義するユーザー体験の核となる指標です（2026年版）。

**3つの主要指標**:

1. **LCP（Largest Contentful Paint）**: 最大コンテンツの描画時間
   - 目標: 2.5秒以内

2. **INP（Interaction to Next Paint）**: インタラクション応答性
   - 目標: 200ms以内（FIDから置き換え）

3. **CLS（Cumulative Layout Shift）**: 累積レイアウトシフト
   - 目標: 0.1以下

### LCP最適化

```typescript
// LCP要素の特定と最適化
class LCPOptimizer {
  private observer: PerformanceObserver;

  constructor() {
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      console.log('LCP要素:', lastEntry.element);
      console.log('LCP時間:', lastEntry.startTime);

      // LCP要素にpreloadヒントを追加
      this.optimizeLCPElement(lastEntry.element as HTMLElement);
    });

    this.observer.observe({ type: 'largest-contentful-paint', buffered: true });
  }

  private optimizeLCPElement(element: HTMLElement) {
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement;

      // fetchpriorityを設定
      img.setAttribute('fetchpriority', 'high');

      // preload linkを追加
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = img.src;

      if (img.srcset) {
        link.setAttribute('imagesrcset', img.srcset);
        link.setAttribute('imagesizes', img.sizes || '100vw');
      }

      document.head.appendChild(link);
    }
  }
}

// 使用
new LCPOptimizer();
```

### LCP改善の具体策

```html
<!-- 悪い例 -->
<img src="/hero.jpg" alt="Hero" loading="lazy" />

<!-- 良い例 -->
<link rel="preload" as="image" href="/hero.jpg" fetchpriority="high" />
<img
  src="/hero.jpg"
  alt="Hero"
  fetchpriority="high"
  decoding="async"
  width="1200"
  height="600"
/>
```

```typescript
// 動的インポートでJavaScriptを遅延読み込み
// 悪い例
import HeavyComponent from './HeavyComponent';

// 良い例
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// さらに良い例（viewport内に入ったら読み込み）
function LazyLoadComponent() {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          import('./HeavyComponent').then(mod => {
            setComponent(() => mod.default);
          });
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {Component ? <Component /> : <Skeleton />}
    </div>
  );
}
```

### CLS最適化

```css
/* 画像・動画に明示的なサイズを指定 */
img, video {
  /* アスペクト比を維持しながらサイズを確保 */
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}

/* フォント読み込み中のレイアウトシフト防止 */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom-font.woff2') format('woff2');
  font-display: optional; /* FOIT/FOUTを防ぐ */
  size-adjust: 95%; /* フォールバックフォントとのサイズ調整 */
}

/* 広告スペースの事前確保 */
.ad-container {
  min-height: 250px; /* 広告の最小高さを確保 */
  background: #f0f0f0;
}
```

```typescript
// 動的コンテンツのCLS対策
class CLSOptimizer {
  // コンテンツ挿入前にスペースを確保
  static async loadDynamicContent(
    container: HTMLElement,
    fetchFn: () => Promise<string>
  ) {
    // プレースホルダーで高さを確保
    const placeholder = document.createElement('div');
    placeholder.style.minHeight = '200px';
    placeholder.className = 'skeleton';
    container.appendChild(placeholder);

    const content = await fetchFn();

    // コンテンツを挿入（高さは維持される）
    container.innerHTML = content;
  }

  // 画像読み込み時のCLS防止
  static setupImagePlaceholders() {
    document.querySelectorAll('img[data-src]').forEach((img) => {
      const element = img as HTMLImageElement;

      // アスペクト比を計算してプレースホルダーを設定
      const width = parseInt(element.getAttribute('width') || '0');
      const height = parseInt(element.getAttribute('height') || '0');

      if (width && height) {
        element.style.aspectRatio = `${width} / ${height}`;
      }
    });
  }
}
```

## INP（Interaction to Next Paint）完全攻略

### INPとは

INPは2024年3月にFIDを置き換えた新しい指標で、ユーザーインタラクションの応答性を測定します。

```typescript
// INPの測定
class INPMonitor {
  private observer: PerformanceObserver;

  constructor() {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const inp = entry as PerformanceEventTiming;

        if (inp.duration > 200) {
          console.warn('INP警告:', {
            type: inp.name,
            duration: inp.duration,
            target: inp.target,
            startTime: inp.startTime,
          });

          // 長時間かかったインタラクションを分析
          this.analyzeSlowInteraction(inp);
        }
      }
    });

    this.observer.observe({
      type: 'event',
      buffered: true,
      durationThreshold: 16 // 16ms以上のイベントを監視
    });
  }

  private analyzeSlowInteraction(entry: PerformanceEventTiming) {
    // 入力遅延
    const inputDelay = entry.processingStart - entry.startTime;

    // 処理時間
    const processingTime = entry.processingEnd - entry.processingStart;

    // プレゼンテーション遅延
    const presentationDelay = entry.startTime + entry.duration - entry.processingEnd;

    console.log('INP分析:', {
      inputDelay,
      processingTime,
      presentationDelay,
      breakdown: {
        input: `${((inputDelay / entry.duration) * 100).toFixed(1)}%`,
        processing: `${((processingTime / entry.duration) * 100).toFixed(1)}%`,
        presentation: `${((presentationDelay / entry.duration) * 100).toFixed(1)}%`,
      }
    });
  }
}

new INPMonitor();
```

### INP改善策

#### 1. 長時間タスクの分割

```typescript
// 悪い例：メインスレッドをブロック
function processLargeDataset(data: any[]) {
  const results = [];
  for (const item of data) {
    results.push(expensiveOperation(item));
  }
  return results;
}

// 良い例：タスクを分割
async function processLargeDatasetOptimized(data: any[]) {
  const results = [];
  const CHUNK_SIZE = 100;

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);

    // チャンクごとに処理
    for (const item of chunk) {
      results.push(expensiveOperation(item));
    }

    // メインスレッドに制御を返す
    if (i + CHUNK_SIZE < data.length) {
      await scheduler.yield(); // Scheduler API
    }
  }

  return results;
}

// Scheduler APIのポリフィル
const scheduler = {
  yield: () => new Promise(resolve => {
    if ('scheduler' in window && 'yield' in window.scheduler) {
      return (window.scheduler as any).yield().then(resolve);
    }
    // フォールバック
    setTimeout(resolve, 0);
  }),
};
```

#### 2. Web Workersの活用

```typescript
// worker.ts
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  if (type === 'PROCESS_DATA') {
    const result = expensiveComputation(data);
    self.postMessage({ type: 'RESULT', result });
  }
});

function expensiveComputation(data: any) {
  // 重い計算処理
  return data.map((item: any) => {
    // 複雑な計算...
    return processedItem;
  });
}

// main.ts
class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{ data: any; resolve: Function }> = [];

  constructor(size: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.addEventListener('message', (event) => {
        this.handleWorkerMessage(i, event.data);
      });

      this.workers.push(worker);
    }
  }

  async processData(data: any): Promise<any> {
    return new Promise((resolve) => {
      const availableWorker = this.workers.find((w, i) => !this.isWorkerBusy(i));

      if (availableWorker) {
        availableWorker.postMessage({ type: 'PROCESS_DATA', data });
        this.queue.push({ data, resolve });
      } else {
        this.queue.push({ data, resolve });
      }
    });
  }

  private isWorkerBusy(index: number): boolean {
    // ワーカーの状態管理ロジック
    return false;
  }

  private handleWorkerMessage(workerIndex: number, message: any) {
    if (message.type === 'RESULT') {
      const task = this.queue.shift();
      task?.resolve(message.result);

      // 次のタスクを処理
      const nextTask = this.queue.find((t) => !this.isWorkerBusy(workerIndex));
      if (nextTask) {
        this.workers[workerIndex].postMessage({
          type: 'PROCESS_DATA',
          data: nextTask.data,
        });
      }
    }
  }
}

// 使用
const pool = new WorkerPool();
const result = await pool.processData(largeDataset);
```

#### 3. イベントハンドラーのデバウンス/スロットル

```typescript
// デバウンス（最後の呼び出しから指定時間後に実行）
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// スロットル（指定時間内に1回のみ実行）
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 使用例
const handleSearch = debounce((query: string) => {
  performSearch(query);
}, 300);

const handleScroll = throttle(() => {
  updateScrollPosition();
}, 100);

// React Hooksバージョン
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 使用
function SearchComponent() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

## 画像最適化の最新技術

### 次世代フォーマットの活用

```html
<!-- AVIF/WebPのフォールバック付き -->
<picture>
  <source srcset="/image.avif" type="image/avif" />
  <source srcset="/image.webp" type="image/webp" />
  <img
    src="/image.jpg"
    alt="Description"
    width="800"
    height="600"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### レスポンシブイメージ

```html
<!-- デバイス幅に応じた画像配信 -->
<img
  src="/image-800.jpg"
  srcset="
    /image-400.jpg 400w,
    /image-800.jpg 800w,
    /image-1200.jpg 1200w,
    /image-1600.jpg 1600w
  "
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    800px
  "
  alt="Responsive image"
  loading="lazy"
/>
```

### 画像最適化の自動化

```typescript
// Next.js Image Componentの最適な使い方
import Image from 'next/image';

export function OptimizedImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={630}
      quality={85} // 85%が最適なバランス
      placeholder="blur"
      blurDataURL={generateBlurDataURL(src)}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority={false} // LCP要素の場合はtrue
    />
  );
}

// ブラーデータURLの生成
function generateBlurDataURL(src: string): string {
  // 実装例（実際にはビルド時に生成）
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
      <filter id="b" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="20" />
      </filter>
      <image
        preserveAspectRatio="none"
        filter="url(#b)"
        href="${src}"
        width="100%"
        height="100%"
      />
    </svg>
  `)}`;
}
```

### 遅延読み込みの高度な実装

```typescript
class AdvancedLazyLoader {
  private observer: IntersectionObserver;
  private imageQueue: Set<HTMLImageElement> = new Set();

  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target as HTMLImageElement);
          }
        });
      },
      {
        rootMargin: '50px', // 50px手前から読み込み開始
        threshold: 0.01,
      }
    );

    this.init();
  }

  private init() {
    // data-src属性を持つ画像を検出
    document.querySelectorAll('img[data-src]').forEach((img) => {
      this.observer.observe(img);
    });
  }

  private async loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (!src) return;

    // 画像を優先度付きで読み込み
    const image = new Image();

    if (srcset) {
      image.srcset = srcset;
    }
    image.src = src;

    // 読み込み完了を待つ
    await image.decode();

    // DOM更新（レイアウトシフト防止）
    requestAnimationFrame(() => {
      img.src = src;
      if (srcset) {
        img.srcset = srcset;
      }
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
    });

    this.observer.unobserve(img);
  }
}

new AdvancedLazyLoader();
```

## レンダリング戦略の選択

### SSR vs SSG vs ISR vs CSR

```typescript
// Next.js 15の例

// 1. SSG（Static Site Generation）- 最速
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  return <Article post={post} />;
}

// 2. ISR（Incremental Static Regeneration）- 更新可能
export const revalidate = 3600; // 1時間ごとに再生成

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  return <Product data={product} />;
}

// 3. SSR（Server-Side Rendering）- リアルタイムデータ
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const userData = await getCurrentUser(); // リクエストごとに実行
  return <DashboardView user={userData} />;
}

// 4. PPR（Partial Prerendering）- Next.js 15の新機能
export const experimental_ppr = true;

export default async function HybridPage() {
  return (
    <div>
      {/* 静的部分 */}
      <Header />

      {/* 動的部分（Suspenseで囲む） */}
      <Suspense fallback={<Skeleton />}>
        <DynamicContent />
      </Suspense>

      {/* 静的部分 */}
      <Footer />
    </div>
  );
}
```

### ストリーミングSSR

```typescript
// React 19 + Next.js 15のストリーミング
import { Suspense } from 'react';

async function SlowComponent() {
  // 遅いデータフェッチ
  const data = await fetchSlowData();
  return <div>{data}</div>;
}

export default function Page() {
  return (
    <div>
      <h1>即座に表示</h1>

      {/* 遅いコンポーネントをストリーミング */}
      <Suspense fallback={<LoadingSpinner />}>
        <SlowComponent />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <AnotherSlowComponent />
      </Suspense>
    </div>
  );
}
```

## Speculation Rules API

### 概要

Speculation Rules APIは、ユーザーが次にアクセスする可能性の高いページを事前読み込みする新しいAPI（2024年Chrome採用）です。

```html
<!-- 基本的な使い方 -->
<script type="speculationrules">
{
  "prerender": [
    {
      "source": "list",
      "urls": ["/about", "/contact"]
    }
  ],
  "prefetch": [
    {
      "source": "list",
      "urls": ["/products/*"],
      "requires": ["anonymous-client-ip-when-cross-origin"]
    }
  ]
}
</script>
```

### 動的なSpeculation Rules

```typescript
class SmartPrefetcher {
  private rules: any = {
    prerender: [],
    prefetch: [],
  };

  constructor() {
    this.setupAnalytics();
  }

  // ユーザー行動に基づいて動的にprefetch
  private setupAnalytics() {
    // リンクにホバーしたら即座にprefetch
    document.addEventListener('mouseover', (e) => {
      const link = (e.target as HTMLElement).closest('a');
      if (link && this.shouldPrefetch(link as HTMLAnchorElement)) {
        this.addPrefetchRule((link as HTMLAnchorElement).href);
      }
    });

    // スクロール位置に基づいてprerender
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            this.addPrerenderRule(link.href);
          }
        });
      },
      { rootMargin: '200px' }
    );

    // 重要なリンクを監視
    document.querySelectorAll('a[data-prerender]').forEach((link) => {
      observer.observe(link);
    });
  }

  private shouldPrefetch(link: HTMLAnchorElement): boolean {
    // 同一オリジンかチェック
    const url = new URL(link.href);
    if (url.origin !== location.origin) return false;

    // すでにprefetch済みかチェック
    if (this.rules.prefetch.includes(link.href)) return false;

    // 接続速度をチェック
    const connection = (navigator as any).connection;
    if (connection && connection.effectiveType === '2g') return false;

    return true;
  }

  private addPrefetchRule(url: string) {
    if (this.rules.prefetch.includes(url)) return;

    this.rules.prefetch.push(url);
    this.updateSpeculationRules();
  }

  private addPrerenderRule(url: string) {
    if (this.rules.prerender.includes(url)) return;

    this.rules.prerender.push(url);
    this.updateSpeculationRules();
  }

  private updateSpeculationRules() {
    // 既存のspeculation rulesを削除
    const existingScript = document.querySelector('script[type="speculationrules"]');
    if (existingScript) {
      existingScript.remove();
    }

    // 新しいrulesを追加
    const script = document.createElement('script');
    script.type = 'speculationrules';
    script.textContent = JSON.stringify({
      prefetch: [
        {
          source: 'list',
          urls: this.rules.prefetch,
        },
      ],
      prerender: [
        {
          source: 'list',
          urls: this.rules.prerender,
        },
      ],
    });

    document.head.appendChild(script);
  }
}

// 使用
new SmartPrefetcher();
```

### Document Rules（より高度な使い方）

```html
<script type="speculationrules">
{
  "prefetch": [
    {
      "source": "document",
      "where": {
        "and": [
          { "href_matches": "/products/*" },
          { "not": { "href_matches": "/products/admin/*" } },
          { "selector_matches": ".product-link" }
        ]
      },
      "eagerness": "moderate"
    }
  ],
  "prerender": [
    {
      "source": "document",
      "where": {
        "href_matches": "/checkout"
      },
      "eagerness": "eager"
    }
  ]
}
</script>
```

## フォント最適化

### フォント読み込み戦略

```css
/* 最適なフォント読み込み */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom-font.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: optional; /* FOIT/FOUTを防ぐ */
  unicode-range: U+0020-007F; /* ASCII文字のみ */
}

/* 可変フォントの活用 */
@font-face {
  font-family: 'InterVariable';
  src: url('/fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900; /* すべてのウェイトを1ファイルで */
  font-display: swap;
}

/* サブセット化 */
@font-face {
  font-family: 'NotoSansJP';
  src: url('/fonts/NotoSansJP-subset.woff2') format('woff2');
  unicode-range: U+3040-309F, U+30A0-30FF; /* ひらがな・カタカナのみ */
}
```

### フォントpreload

```html
<!-- 重要なフォントをpreload -->
<link
  rel="preload"
  href="/fonts/inter-variable.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

### フォールバックフォントの最適化

```css
/* システムフォントに近いサイズ調整 */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom-font.woff2') format('woff2');
  size-adjust: 105%; /* フォールバックとのサイズ差を調整 */
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 0%;
}

/* フォールバックスタック */
body {
  font-family:
    'CustomFont',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'Noto Sans JP',
    sans-serif;
}
```

## JavaScriptパフォーマンス

### コード分割

```typescript
// ルートベース分割（自動）
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

// コンポーネントベース分割
const HeavyChart = lazy(() => import('./components/HeavyChart'));

// ライブラリの遅延読み込み
async function loadMarkdownParser() {
  const { marked } = await import('marked');
  return marked;
}
```

### Tree Shaking

```typescript
// 悪い例：全体をインポート
import _ from 'lodash';
_.debounce(fn, 300);

// 良い例：必要な部分のみインポート
import debounce from 'lodash/debounce';
debounce(fn, 300);

// さらに良い例：Tree Shaking可能なライブラリを使用
import { debounce } from 'lodash-es';
```

### バンドルサイズ分析

```bash
# Viteの場合
npm run build -- --report

# Next.jsの場合
npm install -D @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // 設定...
});
```

## ネットワーク最適化

### リソースヒント

```html
<!-- DNS Prefetch -->
<link rel="dns-prefetch" href="https://api.example.com" />

<!-- Preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Prefetch（将来使う可能性のあるリソース） -->
<link rel="prefetch" href="/next-page.js" />

<!-- Preload（現在のページで必要なリソース） -->
<link rel="preload" href="/critical.css" as="style" />
<link rel="preload" href="/hero.jpg" as="image" />
```

### HTTP/3とQUIC

```nginx
# Nginxでの設定例
server {
    listen 443 quic reuseport;
    listen 443 ssl;

    http3 on;

    # ALT-SVCヘッダーでHTTP/3を通知
    add_header Alt-Svc 'h3=":443"; ma=86400';
}
```

### キャッシング戦略

```typescript
// Service Workerでのキャッシング
const CACHE_NAME = 'v1';
const STATIC_ASSETS = ['/index.html', '/app.js', '/styles.css'];

self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event: any) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // キャッシュヒット
      if (response) {
        return response;
      }

      // ネットワークから取得
      return fetch(event.request).then((response) => {
        // 有効なレスポンスのみキャッシュ
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
```

## 測定とモニタリング

### Web Vitalsの測定

```typescript
import { onCLS, onFID, onLCP, onINP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });

  // ビーコンAPIで送信（ページ離脱時も確実に送信）
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', {
      method: 'POST',
      body,
      keepalive: true,
    });
  }
}

// 各指標を監視
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### Performance Observer

```typescript
class PerformanceMonitor {
  constructor() {
    this.observeLongTasks();
    this.observeLayoutShifts();
    this.observeResourceTiming();
  }

  private observeLongTasks() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('長時間タスク検出:', {
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      }
    });

    observer.observe({ type: 'longtask', buffered: true });
  }

  private observeLayoutShifts() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) {
          console.warn('レイアウトシフト:', {
            value: layoutShift.value,
            sources: layoutShift.sources,
          });
        }
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });
  }

  private observeResourceTiming() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;

        if (resource.duration > 1000) {
          console.warn('遅いリソース:', {
            name: resource.name,
            duration: resource.duration,
            transferSize: resource.transferSize,
          });
        }
      }
    });

    observer.observe({ type: 'resource', buffered: true });
  }
}

new PerformanceMonitor();
```

### リアルユーザーモニタリング（RUM）

```typescript
class RUMCollector {
  private metrics: Map<string, number[]> = new Map();

  collectMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);

    // バッファがいっぱいになったら送信
    if (this.metrics.get(name)!.length >= 10) {
      this.flush(name);
    }
  }

  private flush(metricName?: string) {
    const metricsToSend = metricName
      ? { [metricName]: this.metrics.get(metricName) }
      : Object.fromEntries(this.metrics);

    fetch('/rum-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metrics: metricsToSend,
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection?.effectiveType,
        timestamp: Date.now(),
      }),
      keepalive: true,
    });

    if (metricName) {
      this.metrics.delete(metricName);
    } else {
      this.metrics.clear();
    }
  }

  // ページ離脱時に送信
  setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }
}

const rum = new RUMCollector();
rum.setupBeforeUnload();
```

## まとめ

2026年のWebパフォーマンス最適化は、以下のポイントが重要です。

1. **Core Web Vitals対応**
   - LCP < 2.5s
   - INP < 200ms
   - CLS < 0.1

2. **画像最適化**
   - AVIF/WebP使用
   - レスポンシブイメージ
   - 遅延読み込み

3. **JavaScript最適化**
   - コード分割
   - Tree Shaking
   - Web Workers活用

4. **新技術の活用**
   - Speculation Rules API
   - Partial Prerendering
   - HTTP/3

5. **継続的な測定**
   - Web Vitals監視
   - RUMの実装
   - Performance Observer活用

パフォーマンス最適化は一度やれば終わりではなく、継続的な改善が必要です。本記事の技術を活用して、高速で快適なWebサイトを実現してください。
