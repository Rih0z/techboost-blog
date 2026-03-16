---
title: 'Puppeteer完全ガイド：ヘッドレスブラウザ自動化の決定版'
description: 'Puppeteerを使ったWebスクレイピング、自動テスト、PDF生成を徹底解説。ヘッドレスChrome制御の基本操作から実践的なパターン、アンチbot検出の回避テクニックまで完全網羅します。'
pubDate: '2026-02-05'
tags: ['Puppeteer', 'スクレイピング', 'Node.js', '自動化', 'テスト']
heroImage: '../../assets/thumbnails/puppeteer-scraping-guide.jpg'
---

Puppeteerは、Googleが開発したNode.jsライブラリで、ヘッドレスChrome/Chromiumを制御できます。このガイドでは、基本操作から実践的なスクレイピング、自動テストまで徹底解説します。

## Puppeteerとは？

Puppeteerは、Chrome DevTools Protocolを使ってChromeやChromiumを制御するNode.jsライブラリです。

### 主な機能

- **スクレイピング**: 動的なWebページからデータ抽出
- **自動化**: フォーム送信、クリック操作など
- **スクリーンショット**: ページやDOM要素のキャプチャ
- **PDF生成**: WebページをPDFに変換
- **パフォーマンス測定**: ページロード時間、ネットワーク分析
- **自動テスト**: E2Eテスト、UIテスト

### 類似ツールとの比較

| 機能 | Puppeteer | Playwright | Selenium |
|-----|-----------|------------|----------|
| ブラウザ | Chrome/Firefox | Chrome/Firefox/Safari | 全ブラウザ |
| 速度 | 高速 | 高速 | 中速 |
| API | シンプル | 豊富 | 複雑 |
| TypeScript | 完全対応 | 完全対応 | 部分対応 |
| 開発元 | Google | Microsoft | Selenium HQ |

## インストールとセットアップ

### 基本インストール

```bash
# Puppeteerをインストール（Chromiumも自動インストール）
npm install puppeteer

# または軽量版（ブラウザなし）
npm install puppeteer-core

# TypeScript型定義（Puppeteer 19+では不要）
npm install -D @types/puppeteer
```

### プロジェクトセットアップ

```bash
mkdir puppeteer-project
cd puppeteer-project
npm init -y
npm install puppeteer typescript @types/node tsx
npx tsc --init
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## 基本的な使い方

### 最初のスクリプト

```typescript
// src/basic.ts
import puppeteer from 'puppeteer';

async function main() {
  // ブラウザ起動
  const browser = await puppeteer.launch({
    headless: true, // ヘッドレスモード（UIなし）
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // 新しいページを開く
  const page = await browser.newPage();

  // ページにアクセス
  await page.goto('https://example.com');

  // タイトル取得
  const title = await page.title();
  console.log('Page title:', title);

  // スクリーンショット撮影
  await page.screenshot({ path: 'screenshot.png' });

  // ブラウザを閉じる
  await browser.close();
}

main().catch(console.error);
```

```bash
# 実行
npx tsx src/basic.ts
```

### ヘッドフルモードでデバッグ

```typescript
const browser = await puppeteer.launch({
  headless: false, // ブラウザUIを表示
  devtools: true,  // DevToolsを自動で開く
  slowMo: 100,     // 操作を100ms遅延させて確認しやすく
});
```

### ビューポートとユーザーエージェント

```typescript
const page = await browser.newPage();

// ビューポートサイズ設定
await page.setViewport({
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
});

// ユーザーエージェント設定
await page.setUserAgent(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
);

// デバイスエミュレーション
const iPhone = puppeteer.KnownDevices['iPhone 13 Pro'];
await page.emulate(iPhone);
```

## ページ操作

### ナビゲーション

```typescript
// ページ遷移
await page.goto('https://example.com', {
  waitUntil: 'networkidle0', // ネットワークが完全に静かになるまで待つ
  timeout: 30000, // 30秒タイムアウト
});

// 戻る/進む
await page.goBack();
await page.goForward();

// リロード
await page.reload();

// 複数の条件で待機
await page.goto('https://example.com', {
  waitUntil: ['load', 'domcontentloaded', 'networkidle2'],
});
```

### 要素の選択と操作

```typescript
// 要素を待機して取得
const button = await page.waitForSelector('#submit-button', {
  visible: true,
  timeout: 5000,
});

// クリック
await button?.click();

// または直接クリック
await page.click('#submit-button');

// 入力
await page.type('#username', 'user@example.com', { delay: 100 });
await page.type('#password', 'password123');

// フォーカス
await page.focus('#search-input');

// 選択（select要素）
await page.select('#country', 'JP');

// チェックボックス/ラジオボタン
await page.click('input[type="checkbox"]');

// ファイルアップロード
const fileInput = await page.$('input[type="file"]');
await fileInput?.uploadFile('./test.jpg');

// ホバー
await page.hover('.menu-item');

// 右クリック
await page.click('.context-menu-trigger', { button: 'right' });

// ダブルクリック
await page.click('.item', { clickCount: 2 });
```

### JavaScriptの実行

```typescript
// ページコンテキストでJavaScript実行
const result = await page.evaluate(() => {
  return document.querySelector('h1')?.textContent;
});

// 引数を渡す
const text = await page.evaluate((selector) => {
  return document.querySelector(selector)?.textContent;
}, 'h1');

// 複数の値を返す
const data = await page.evaluate(() => {
  return {
    title: document.title,
    url: location.href,
    links: Array.from(document.querySelectorAll('a')).map(a => a.href),
  };
});

// DOM要素を返す（ElementHandle）
const element = await page.evaluateHandle(() => {
  return document.querySelector('h1');
});
```

### 待機

```typescript
// セレクタが表示されるまで待つ
await page.waitForSelector('.result', { visible: true });

// セレクタが消えるまで待つ
await page.waitForSelector('.loading', { hidden: true });

// XPathで待つ
await page.waitForXPath('//button[text()="Submit"]');

// 関数が真を返すまで待つ
await page.waitForFunction(() => {
  return document.querySelectorAll('.item').length > 10;
});

// ナビゲーション完了を待つ
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle0' }),
  page.click('a.link'),
]);

// タイムアウト付き待機
await page.waitForTimeout(3000); // 3秒待つ

// リクエスト/レスポンスを待つ
await page.waitForResponse(response =>
  response.url().includes('/api/data') && response.status() === 200
);
```

## データ抽出（スクレイピング）

### 基本的なデータ抽出

```typescript
interface Product {
  title: string;
  price: number;
  image: string;
  url: string;
}

async function scrapeProducts(url: string): Promise<Product[]> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2' });

  const products = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.product'));

    return items.map(item => ({
      title: item.querySelector('.title')?.textContent?.trim() || '',
      price: parseFloat(
        item.querySelector('.price')?.textContent?.replace(/[^0-9.]/g, '') || '0'
      ),
      image: item.querySelector('img')?.src || '',
      url: item.querySelector('a')?.href || '',
    }));
  });

  await browser.close();
  return products;
}

// 使用例
const products = await scrapeProducts('https://example.com/products');
console.log(`Found ${products.length} products`);
```

### ページネーション処理

```typescript
async function scrapeAllPages(baseUrl: string): Promise<Product[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const allProducts: Product[] = [];
  let currentPage = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    console.log(`Scraping page ${currentPage}...`);

    await page.goto(`${baseUrl}?page=${currentPage}`, {
      waitUntil: 'networkidle2',
    });

    const products = await page.evaluate(() => {
      // ... データ抽出ロジック
    });

    allProducts.push(...products);

    // 次のページがあるかチェック
    hasNextPage = await page.evaluate(() => {
      const nextButton = document.querySelector('.pagination .next');
      return nextButton !== null && !nextButton.classList.contains('disabled');
    });

    currentPage++;

    // 負荷軽減のため待機
    await page.waitForTimeout(1000);
  }

  await browser.close();
  return allProducts;
}
```

### 無限スクロール対応

```typescript
async function scrapeInfiniteScroll(url: string): Promise<any[]> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2' });

  // 最後までスクロール
  await autoScroll(page);

  // データ抽出
  const data = await page.evaluate(() => {
    // ... データ抽出ロジック
  });

  await browser.close();
  return data;
}

async function autoScroll(page: puppeteer.Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
```

### 動的コンテンツの待機

```typescript
async function scrapeDynamicContent(url: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url);

  // ボタンクリックでコンテンツを読み込む
  await page.click('.load-more');

  // データが読み込まれるまで待つ
  await page.waitForSelector('.dynamic-content', { visible: true });

  // または特定の条件まで待つ
  await page.waitForFunction(() => {
    const items = document.querySelectorAll('.item');
    return items.length >= 20;
  });

  const data = await page.evaluate(() => {
    // データ抽出
  });

  await browser.close();
  return data;
}
```

## スクリーンショットとPDF生成

### スクリーンショット

```typescript
async function takeScreenshots() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://example.com');

  // ページ全体のスクリーンショット
  await page.screenshot({
    path: 'fullpage.png',
    fullPage: true,
  });

  // 特定の要素のスクリーンショット
  const element = await page.$('.header');
  await element?.screenshot({ path: 'element.png' });

  // クリップ指定
  await page.screenshot({
    path: 'clip.png',
    clip: {
      x: 0,
      y: 0,
      width: 500,
      height: 500,
    },
  });

  // 品質指定（JPEG）
  await page.screenshot({
    path: 'screenshot.jpg',
    type: 'jpeg',
    quality: 80,
  });

  // バッファとして取得
  const buffer = await page.screenshot();
  // 画像処理ライブラリで加工など

  await browser.close();
}
```

### PDF生成

```typescript
async function generatePDF() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://example.com', { waitUntil: 'networkidle2' });

  await page.pdf({
    path: 'output.pdf',
    format: 'A4',
    printBackground: true,
    margin: {
      top: '1cm',
      right: '1cm',
      bottom: '1cm',
      left: '1cm',
    },
  });

  await browser.close();
}

// カスタムヘッダー/フッター付きPDF
async function generatePDFWithHeaderFooter() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://example.com', { waitUntil: 'networkidle2' });

  await page.pdf({
    path: 'output.pdf',
    format: 'A4',
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:10px; text-align:center; width:100%;">Header</div>',
    footerTemplate: '<div style="font-size:10px; text-align:center; width:100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: {
      top: '2cm',
      bottom: '2cm',
    },
  });

  await browser.close();
}
```

## ネットワーク制御

### リクエストインターセプト

```typescript
async function interceptRequests() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // リクエストインターセプトを有効化
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    // 画像・CSS・フォントをブロック（高速化）
    if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });

  await page.goto('https://example.com');
  await browser.close();
}

// リクエストの改変
async function modifyRequests() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setRequestInterception(true);

  page.on('request', (request) => {
    // ヘッダーを追加
    const headers = Object.assign({}, request.headers(), {
      'X-Custom-Header': 'value',
    });

    request.continue({ headers });
  });

  await page.goto('https://example.com');
  await browser.close();
}
```

### レスポンス監視

```typescript
async function monitorResponses() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // レスポンスを記録
  const responses: any[] = [];

  page.on('response', async (response) => {
    if (response.url().includes('/api/')) {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        body: await response.json().catch(() => null),
      });
    }
  });

  await page.goto('https://example.com');

  console.log('API Responses:', responses);
  await browser.close();
}
```

### オフラインモード

```typescript
// オフライン状態をシミュレート
await page.setOfflineMode(true);

// ネットワーク速度をシミュレート
await page.emulateNetworkConditions({
  offline: false,
  downloadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
  uploadThroughput: (750 * 1024) / 8, // 750 Kbps
  latency: 40, // 40ms
});
```

## アンチ検出テクニック

### Stealth Plugin

```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

```typescript
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function stealthScraping() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = await browser.newPage();

  // 追加のカモフラージュ
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  await page.goto('https://example.com');
  await browser.close();
}
```

### カスタムヘッダーとCookie

```typescript
async function withAuthenticationHeader() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // カスタムヘッダー
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ja-JP,ja;q=0.9',
    'Accept': 'text/html,application/xhtml+xml',
  });

  // Cookie設定
  await page.setCookie({
    name: 'session_id',
    value: 'abc123',
    domain: 'example.com',
  });

  await page.goto('https://example.com');
  await browser.close();
}
```

## エラーハンドリングとリトライ

```typescript
async function robustScraping(url: string, maxRetries = 3) {
  let browser;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox'],
      });

      const page = await browser.newPage();

      // タイムアウト設定
      page.setDefaultNavigationTimeout(30000);
      page.setDefaultTimeout(30000);

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      const data = await page.evaluate(() => {
        // データ抽出
      });

      await browser.close();
      return data;

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);

      if (browser) {
        await browser.close().catch(() => {});
      }

      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts`);
      }

      // 指数バックオフ
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}
```

## パフォーマンス最適化

### ブラウザプール

```typescript
class BrowserPool {
  private browsers: puppeteer.Browser[] = [];
  private maxBrowsers = 5;

  async getBrowser(): Promise<puppeteer.Browser> {
    if (this.browsers.length < this.maxBrowsers) {
      const browser = await puppeteer.launch();
      this.browsers.push(browser);
      return browser;
    }

    // ランダムにブラウザを返す
    return this.browsers[Math.floor(Math.random() * this.browsers.length)];
  }

  async closeAll() {
    await Promise.all(this.browsers.map(b => b.close()));
    this.browsers = [];
  }
}

// 使用例
const pool = new BrowserPool();

async function scrapeMultiplePages(urls: string[]) {
  const results = await Promise.all(
    urls.map(async (url) => {
      const browser = await pool.getBrowser();
      const page = await browser.newPage();
      await page.goto(url);
      const data = await page.evaluate(() => { /* ... */ });
      await page.close();
      return data;
    })
  );

  await pool.closeAll();
  return results;
}
```

### キャッシュの活用

```typescript
async function withCache() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // キャッシュを有効化
  await page.setCacheEnabled(true);

  await page.goto('https://example.com');
  await browser.close();
}
```

## 実践例：総合スクレイピングシステム

```typescript
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';

puppeteer.use(StealthPlugin());

interface ScrapingConfig {
  url: string;
  selectors: {
    items: string;
    title: string;
    price: string;
    image: string;
  };
  pagination?: {
    nextButton: string;
    maxPages: number;
  };
}

class WebScraper {
  private browser: puppeteer.Browser | null = null;

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async scrape(config: ScrapingConfig) {
    if (!this.browser) throw new Error('Browser not initialized');

    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const allData: any[] = [];
    let currentPage = 1;

    try {
      await page.goto(config.url, { waitUntil: 'networkidle2' });

      while (true) {
        console.log(`Scraping page ${currentPage}...`);

        await page.waitForSelector(config.selectors.items);

        const pageData = await page.evaluate((selectors) => {
          const items = Array.from(document.querySelectorAll(selectors.items));

          return items.map(item => ({
            title: item.querySelector(selectors.title)?.textContent?.trim() || '',
            price: item.querySelector(selectors.price)?.textContent?.trim() || '',
            image: (item.querySelector(selectors.image) as HTMLImageElement)?.src || '',
          }));
        }, config.selectors);

        allData.push(...pageData);

        // ページネーション
        if (!config.pagination || currentPage >= config.pagination.maxPages) {
          break;
        }

        const hasNext = await page.$(config.pagination.nextButton);
        if (!hasNext) break;

        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          page.click(config.pagination.nextButton),
        ]);

        currentPage++;
        await page.waitForTimeout(2000); // レート制限対策
      }

      return allData;

    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 使用例
async function main() {
  const scraper = new WebScraper();
  await scraper.init();

  const config: ScrapingConfig = {
    url: 'https://example.com/products',
    selectors: {
      items: '.product-item',
      title: '.product-title',
      price: '.product-price',
      image: '.product-image',
    },
    pagination: {
      nextButton: '.pagination-next',
      maxPages: 5,
    },
  };

  const data = await scraper.scrape(config);

  await fs.writeFile('output.json', JSON.stringify(data, null, 2));
  console.log(`Scraped ${data.length} items`);

  await scraper.close();
}

main().catch(console.error);
```

---

## 関連記事

- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026](/blog/2026-03-09-engineer-career-change-guide-2026)

## まとめ

Puppeteerは、ヘッドレスブラウザ自動化の強力なツールです。

### 主な用途

- **スクレイピング**: 動的Webサイトからのデータ抽出
- **自動化**: 定型作業の自動化
- **テスト**: E2Eテスト、UIテスト
- **PDF生成**: WebページのPDF変換
- **モニタリング**: Webサイトの監視

### ベストプラクティス

- ロボット検出を避ける（ヘッダー、遅延、Stealth Plugin）
- エラーハンドリングとリトライ
- レート制限の遵守
- リソース管理（ブラウザ/ページのクローズ）
- robots.txtとToSの確認

Puppeteerで、次世代のWeb自動化ソリューションを構築しましょう。
