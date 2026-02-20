---
title: 'Core Web Vitals完全攻略 -- Lighthouseスコア90超えを実現するパフォーマンス最適化の実践手法'
description: 'Core Web Vitalsの3指標（LCP・INP・CLS）を体系的に理解し、Lighthouseスコア90以上を達成するための具体的な最適化手法を解説。画像最適化、レンダリング戦略、JavaScript削減まで、実装コード付きで実践的に学べる。'
pubDate: '2026-02-20'
---

Webサイトのパフォーマンスは、ユーザー体験とSEOの両面で決定的な影響力を持つ。Googleは2021年からCore Web Vitalsをランキング要因に組み込み、2024年3月にはFIDをINPに置き換えるなど、指標の精度を継続的に高めている。

本記事では、Core Web Vitalsの3指標を体系的に理解した上で、Lighthouseスコア90以上を安定的に達成するための実践的な最適化手法を、具体的なコードとともに解説する。

## Core Web Vitalsの3指標

Core Web Vitalsは、ユーザー体験の核となる3つの指標で構成される。

| 指標 | 測定対象 | 良好 | 改善が必要 | 不良 |
|------|---------|------|-----------|------|
| LCP（Largest Contentful Paint） | 最大コンテンツの表示速度 | 2.5秒以下 | 2.5〜4.0秒 | 4.0秒超 |
| INP（Interaction to Next Paint） | インタラクションの応答性 | 200ms以下 | 200〜500ms | 500ms超 |
| CLS（Cumulative Layout Shift） | レイアウトの視覚的安定性 | 0.1以下 | 0.1〜0.25 | 0.25超 |

### LCP -- 最大コンテンツの表示速度

LCPは、ビューポート内で最も大きなコンテンツ要素が表示されるまでの時間を測定する。対象となる要素は以下の通り。

- `<img>` 要素
- `<svg>` 内の `<image>` 要素
- `<video>` のポスター画像
- `background-image` を持つ要素
- テキストノードを含むブロックレベル要素

実務上、LCPの対象は「ヒーロー画像」か「メインの見出しテキスト」になることが多い。

### INP -- インタラクションの応答性

INP（Interaction to Next Paint）は、2024年3月にFID（First Input Delay）に代わって導入された指標である。FIDが「最初の入力」のみを測定していたのに対し、INPはページ上の全てのインタラクション（クリック、タップ、キーボード入力）の応答性を測定する。

ページのライフサイクル全体を通じて、最も遅いインタラクションの応答時間（上位数パーセンタイルを除外）がINPとして報告される。

### CLS -- レイアウトの視覚的安定性

CLSは、ページ読み込み中に発生する予期しないレイアウトのずれを数値化する。広告の遅延読み込みやWebフォントの適用によってコンテンツが跳ねる現象は、ユーザーの誤クリックを誘発し、体験を著しく損なう。

## 測定ツールと測定戦略

最適化の前に、現状を正確に把握する必要がある。ラボデータとフィールドデータの違いを理解することが重要だ。

### ラボデータ vs フィールドデータ

| 種別 | 代表ツール | 特徴 | 用途 |
|------|-----------|------|------|
| ラボデータ | Lighthouse, WebPageTest | 制御された環境で測定 | 開発中のデバッグ・改善確認 |
| フィールドデータ | CrUX, web-vitals.js | 実ユーザーの体験を測定 | 本番環境の実態把握 |

ラボデータは再現性が高く開発中の改善確認に適するが、実ユーザーの体験を反映しない。一方、フィールドデータは実態を示すが、十分なデータ量が必要になる。両者を組み合わせて判断するのが正しいアプローチである。

### web-vitals.jsによるフィールドデータ収集

Googleが提供する `web-vitals` ライブラリを使うことで、実ユーザーのCore Web Vitalsデータを収集できる。

```javascript
import { onLCP, onINP, onCLS } from 'web-vitals';

function sendToAnalytics(metric) {
  const payload = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  };

  // Beacon APIで確実に送信
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', JSON.stringify(payload));
  }
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

### Lighthouse CIによる継続的な監視

CI/CDパイプラインにLighthouseを組み込むことで、パフォーマンスの退行を自動検知できる。

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on:
  pull_request:
    branches: [main]

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
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: ./lighthouserc.json
          uploadArtifacts: true
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["warn", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

## LCP最適化の実践

LCPの改善は、最も効果が大きく、取り組みやすい領域である。主な原因と対策を見ていこう。

### 原因1: 画像の最適化不足

画像はLCPの最も一般的なボトルネックである。以下の3つの施策を組み合わせることで、劇的な改善が見込める。

**次世代フォーマットの採用**

```html
<picture>
  <source srcset="/images/hero.avif" type="image/avif">
  <source srcset="/images/hero.webp" type="image/webp">
  <img
    src="/images/hero.jpg"
    alt="サービス概要を示すメインビジュアル"
    width="1200"
    height="630"
    loading="eager"
    fetchpriority="high"
    decoding="async"
  >
</picture>
```

ポイントは3つある。

1. **AVIFを最優先**: WebPより30〜50%軽量。ブラウザ対応率は2026年時点で90%超
2. **`fetchpriority="high"`**: LCP対象の画像にはリソースの優先度を明示的に指定
3. **`loading="eager"`**: LCP画像には遅延読み込みを適用しない（デフォルトのeagerで良いが明示推奨）

**レスポンシブ画像の最適化**

```html
<img
  srcset="
    /images/hero-480.webp 480w,
    /images/hero-768.webp 768w,
    /images/hero-1200.webp 1200w,
    /images/hero-1920.webp 1920w
  "
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
  src="/images/hero-1200.webp"
  alt="メインビジュアル"
  width="1200"
  height="630"
>
```

デバイスの画面幅に応じて最適なサイズの画像を配信することで、モバイルでの不要なデータ転送を防ぐ。

**ビルド時の画像自動最適化（Sharp）**

```javascript
// scripts/optimize-images.mjs
import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join, parse } from 'path';

const INPUT_DIR = './src/images';
const OUTPUT_DIR = './public/images';
const WIDTHS = [480, 768, 1200, 1920];
const QUALITY = { avif: 50, webp: 75, jpeg: 80 };

async function optimizeImage(inputPath) {
  const { name } = parse(inputPath);
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  const tasks = [];

  for (const width of WIDTHS) {
    if (width > metadata.width) continue;

    tasks.push(
      sharp(inputPath)
        .resize(width)
        .avif({ quality: QUALITY.avif })
        .toFile(join(OUTPUT_DIR, `${name}-${width}.avif`))
    );

    tasks.push(
      sharp(inputPath)
        .resize(width)
        .webp({ quality: QUALITY.webp })
        .toFile(join(OUTPUT_DIR, `${name}-${width}.webp`))
    );
  }

  await Promise.all(tasks);
  console.log(`Optimized: ${name} (${tasks.length} variants)`);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const files = await readdir(INPUT_DIR);
  const images = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));

  for (const file of images) {
    await optimizeImage(join(INPUT_DIR, file));
  }
}

main();
```

### 原因2: サーバーレスポンス時間（TTFB）

サーバーの応答が遅ければ、その後の全ての処理が遅延する。TTFB（Time to First Byte）は600ms以下を目標とする。

**CDNの活用**

静的サイトであれば、Cloudflare PagesやVercelのEdge Networkを活用することで、ユーザーに最も近いエッジサーバーからコンテンツを配信できる。

**キャッシュヘッダーの適切な設定**

```nginx
# nginx.conf
location ~* \.(jpg|jpeg|png|webp|avif|gif|svg|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location ~* \.(css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location ~* \.html$ {
    add_header Cache-Control "no-cache";
}
```

静的アセットには長期キャッシュとimmutableディレクティブを設定し、HTMLにはno-cacheを指定してコンテンツの更新を即座に反映する。

### 原因3: レンダリングブロッキングリソース

CSSとJavaScriptがレンダリングをブロックすると、LCPの表示が遅延する。

**クリティカルCSSのインライン化**

```html
<head>
  <!-- ファーストビューに必要なCSSをインライン化 -->
  <style>
    :root {
      --color-text: #161616;
      --color-bg: #ffffff;
      --font-body: 'IBM Plex Sans JP', sans-serif;
    }
    body {
      margin: 0;
      font-family: var(--font-body);
      color: var(--color-text);
      background: var(--color-bg);
    }
    .hero {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
  </style>

  <!-- 残りのCSSは非同期で読み込み -->
  <link rel="preload" href="/styles/main.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles/main.css"></noscript>
</head>
```

**リソースヒントの活用**

```html
<head>
  <!-- LCP画像のプリロード -->
  <link rel="preload" as="image" href="/images/hero-1200.webp"
        imagesrcset="/images/hero-480.webp 480w,
                     /images/hero-768.webp 768w,
                     /images/hero-1200.webp 1200w"
        imagesizes="(max-width: 768px) 100vw, 1200px">

  <!-- 外部オリジンへの事前接続 -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- 次のページのプリフェッチ -->
  <link rel="prefetch" href="/about">
</head>
```

## INP最適化の実践

INPは比較的新しい指標であり、多くのサイトで改善の余地がある。メインスレッドの処理時間を短縮することが鍵となる。

### 長時間タスクの分割

50msを超えるJavaScriptタスクは「Long Task」として分類され、INPを悪化させる。`scheduler.yield()` やrequestIdleCallbackを使ってタスクを分割する。

```javascript
// 悪い例: 長時間のブロッキング処理
function processLargeList(items) {
  items.forEach(item => {
    heavyComputation(item);
    updateDOM(item);
  });
}

// 良い例: タスクを分割して実行
async function processLargeList(items) {
  const CHUNK_SIZE = 10;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    chunk.forEach(item => {
      heavyComputation(item);
      updateDOM(item);
    });

    // メインスレッドに制御を戻す
    await yieldToMain();
  }
}

function yieldToMain() {
  if ('scheduler' in globalThis && 'yield' in scheduler) {
    return scheduler.yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}
```

### イベントハンドラの最適化

ユーザーのインタラクションに対するイベントハンドラは、可能な限り軽量に保つ。

```javascript
// 悪い例: クリックハンドラ内で重い処理
button.addEventListener('click', () => {
  const data = expensiveCalculation();
  renderComplexUI(data);
  sendAnalytics(data);
});

// 良い例: UIの即時フィードバック + 重い処理の遅延実行
button.addEventListener('click', () => {
  // 即座に視覚的フィードバック
  button.classList.add('loading');
  button.disabled = true;

  // 重い処理はrequestAnimationFrame後に実行
  requestAnimationFrame(() => {
    setTimeout(() => {
      const data = expensiveCalculation();
      renderComplexUI(data);
      sendAnalytics(data);
      button.classList.remove('loading');
      button.disabled = false;
    }, 0);
  });
});
```

`requestAnimationFrame` と `setTimeout(fn, 0)` を組み合わせることで、ブラウザに描画の機会を与えてから重い処理を実行する。これにより、ユーザーは即座に視覚的フィードバックを受け取れる。

### React/Next.jsにおけるINP改善

Reactアプリケーションでは、`useTransition` と `useDeferredValue` を活用して、UIの応答性を維持できる。

```tsx
import { useState, useTransition, useDeferredValue } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 入力フィールドの更新は即座に反映
    setQuery(e.target.value);
  };

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={handleChange}
        placeholder="検索キーワードを入力"
      />
      {isPending && <span className="loading-indicator">検索中...</span>}
      {/* deferredQueryを使うことでリスト描画の優先度を下げる */}
      <ResultList query={deferredQuery} />
    </div>
  );
}
```

## CLS最適化の実践

CLSは他の2指標と異なり、体感速度ではなく「視覚的な安定性」を測定する。ユーザーが意図しないレイアウトのずれを防ぐことが目的である。

### 画像・動画のアスペクト比指定

```css
/* CSSでアスペクト比を保証 */
.hero-image {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
  object-fit: cover;
}

/* または明示的なwidth/height */
img {
  max-width: 100%;
  height: auto;
}
```

```html
<!-- HTMLで必ずwidth/heightを指定 -->
<img src="/images/photo.webp" alt="説明" width="800" height="450">
```

`width` と `height` 属性を指定することで、ブラウザは画像の読み込み前にアスペクト比を計算し、適切なスペースを確保できる。

### Webフォントによるレイアウトシフトの防止

```css
/* font-displayの適切な設定 */
@font-face {
  font-family: 'IBM Plex Sans JP';
  src: url('/fonts/IBMPlexSansJP-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap; /* テキストを即座に表示し、フォント読み込み後に切り替え */
}

/* フォールバックフォントのサイズ調整 */
@font-face {
  font-family: 'IBM Plex Sans JP Fallback';
  src: local('Hiragino Sans'), local('Yu Gothic');
  ascent-override: 95%;
  descent-override: 25%;
  line-height-override: 1.2;
  size-adjust: 105%;
}

body {
  font-family: 'IBM Plex Sans JP', 'IBM Plex Sans JP Fallback', sans-serif;
}
```

`size-adjust` と各種overrideプロパティを使ってフォールバックフォントのメトリクスを調整することで、Webフォント読み込み時のレイアウトシフトを最小化できる。

### 動的コンテンツの挿入に対する対策

広告やバナー、遅延読み込みコンテンツなど、動的に挿入される要素はCLSの主要因となる。

```css
/* 広告スロットのスペースを事前確保 */
.ad-slot {
  min-height: 250px;
  background-color: #f4f4f4;
  contain: layout;
}

/* 通知バナーをドキュメントフローの外に配置 */
.notification-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  transform: translateY(-100%);
  transition: transform 0.3s ease;
}

.notification-banner.visible {
  transform: translateY(0);
}
```

`position: fixed` や `position: absolute` で配置された要素はドキュメントフローに影響しないため、CLSに計上されない。

## パフォーマンスバジェットの設定

最適化は一度行えば終わりではない。パフォーマンスバジェットを設定し、継続的に監視することが重要である。

```json
// performance-budget.json
{
  "budgets": [
    {
      "resourceType": "document",
      "budget": 50
    },
    {
      "resourceType": "script",
      "budget": 150
    },
    {
      "resourceType": "stylesheet",
      "budget": 30
    },
    {
      "resourceType": "image",
      "budget": 300
    },
    {
      "resourceType": "font",
      "budget": 100
    },
    {
      "resourceType": "total",
      "budget": 500
    }
  ],
  "timings": [
    {
      "metric": "largest-contentful-paint",
      "budget": 2500
    },
    {
      "metric": "cumulative-layout-shift",
      "budget": 0.1
    },
    {
      "metric": "interactive",
      "budget": 3500
    }
  ]
}
```

各リソースタイプのサイズ上限と、各指標の数値上限を定義する。Lighthouse CIやwebpackのperformance設定と組み合わせることで、バジェット超過を自動検知できる。

## チェックリスト

最後に、Core Web Vitals最適化のチェックリストをまとめる。

### LCP対策

- [ ] LCP対象要素を特定しているか
- [ ] 画像をAVIF/WebPフォーマットで配信しているか
- [ ] レスポンシブ画像（srcset/sizes）を設定しているか
- [ ] LCP画像に `fetchpriority="high"` を指定しているか
- [ ] LCP画像に `loading="lazy"` を設定していないか
- [ ] LCP画像を `<link rel="preload">` でプリロードしているか
- [ ] TTFBが600ms以下であるか
- [ ] クリティカルCSSをインライン化しているか

### INP対策

- [ ] 50msを超えるLong Taskを分割しているか
- [ ] イベントハンドラで即座に視覚的フィードバックを返しているか
- [ ] サードパーティスクリプトを遅延読み込みしているか
- [ ] React使用時、`useTransition` / `useDeferredValue` を活用しているか

### CLS対策

- [ ] 全ての画像・動画に `width` / `height` を指定しているか
- [ ] Webフォントに `font-display: swap` を設定しているか
- [ ] フォールバックフォントの `size-adjust` を調整しているか
- [ ] 動的コンテンツの挿入領域を事前確保しているか
- [ ] 広告・バナーが既存コンテンツを押し下げていないか

### 運用

- [ ] web-vitals.jsでフィールドデータを収集しているか
- [ ] Lighthouse CIをCI/CDパイプラインに組み込んでいるか
- [ ] パフォーマンスバジェットを設定しているか
- [ ] 定期的にCrUXレポートを確認しているか

## まとめ

Core Web Vitalsの最適化は、小さな改善の積み重ねで実現される。単一の「銀の弾丸」は存在しないが、本記事で解説した手法を体系的に適用することで、Lighthouseスコア90以上は十分に達成可能である。

特に効果が大きいのは以下の3点だ。

1. **画像の最適化**（AVIF/WebP + レスポンシブ + fetchpriority）: LCPを大幅に改善
2. **Long Taskの分割**（scheduler.yield + requestAnimationFrame）: INPを改善
3. **レイアウトの事前確保**（width/height + aspect-ratio + font size-adjust）: CLSを改善

パフォーマンスは機能である。ユーザーが快適にサイトを利用でき、検索エンジンから正当に評価されるための基盤として、Core Web Vitalsの最適化に継続的に取り組むことを推奨する。
