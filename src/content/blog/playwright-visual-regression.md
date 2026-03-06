---
title: 'Playwrightビジュアルリグレッションテスト: スクリーンショット比較でUI変更を検出'
description: 'Playwrightのビジュアルリグレッションテスト機能を使い、スクリーンショット比較でUIの意図しない変更を自動検出する方法を実践的に解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2025-07-22'
updatedDate: '2025-07-22'
tags: ['Playwright', 'Testing', 'Visual Regression', 'E2E', 'UI Testing', 'プログラミング']
---
## はじめに

E2Eテストでは機能の動作は確認できますが、視覚的な変更（レイアウト崩れ、スタイルの意図しない変更、レスポンシブデザインの問題など）を検出するのは困難です。Playwrightのビジュアルリグレッションテスト機能を使えば、スクリーンショット比較により、こうした視覚的な変更を自動的に検出できます。

この記事では、Playwrightのビジュアルリグレッションテスト機能の実践的な使い方、CI/CDでの運用方法、そして効果的なテスト戦略について解説します。

## ビジュアルリグレッションテストとは

ビジュアルリグレッションテストは、アプリケーションのUIを画像として保存し、コード変更後の画像と比較することで、視覚的な変更を検出するテスト手法です。

### 検出できる問題

- レイアウトの崩れ
- CSSの意図しない変更
- フォントやカラーの変更
- レスポンシブデザインの問題
- ブラウザ間の表示差異
- ダークモード対応の問題

## 基本的な使い方

### セットアップ

まず、Playwrightプロジェクトをセットアップします。

```bash
npm init playwright@latest
```

### 最初のビジュアルテスト

`toHaveScreenshot()` マッチャーを使ってビジュアルテストを作成します。

```typescript
// tests/visual/homepage.spec.ts
import { test, expect } from '@playwright/test';

test('ホームページの表示が正しい', async ({ page }) => {
  await page.goto('https://example.com');

  // ページ全体のスクリーンショットを比較
  await expect(page).toHaveScreenshot('homepage.png');
});

test('ログインフォームの表示', async ({ page }) => {
  await page.goto('https://example.com/login');

  // 特定要素のスクリーンショットを比較
  const loginForm = page.locator('form[name="login"]');
  await expect(loginForm).toHaveScreenshot('login-form.png');
});
```

初回実行時、Playwrightはベースライン画像を作成します。

```bash
npm test -- --update-snapshots
```

2回目以降の実行では、現在の画像とベースライン画像を比較し、差異があればテストが失敗します。

```bash
npm test
```

## 高度な設定とオプション

### 許容誤差の設定

完全一致は厳しすぎる場合があります。許容誤差を設定できます。

```typescript
// tests/visual/products.spec.ts
import { test, expect } from '@playwright/test';

test('商品一覧ページ', async ({ page }) => {
  await page.goto('https://example.com/products');

  await expect(page).toHaveScreenshot('products.png', {
    // ピクセル単位の許容誤差（0-1の範囲、デフォルト0.2）
    maxDiffPixelRatio: 0.05,

    // 全体のピクセル数に対する許容割合
    maxDiffPixels: 100,

    // 色の差の閾値（0-1の範囲、デフォルト0.2）
    threshold: 0.3,
  });
});
```

### アニメーションの無効化

アニメーションがあると、スクリーンショットのタイミングで結果が変わります。

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // すべてのアニメーションを無効化
    screenshot: {
      animations: 'disabled',
    },
  },
});
```

テスト内でも個別に設定できます。

```typescript
test('アニメーション無効化', async ({ page }) => {
  await page.goto('https://example.com/animated');

  await expect(page).toHaveScreenshot('no-animation.png', {
    animations: 'disabled',
  });
});
```

### フルページスクリーンショット

デフォルトはビューポート内のみですが、フルページも取得できます。

```typescript
test('フルページスクリーンショット', async ({ page }) => {
  await page.goto('https://example.com/long-page');

  await expect(page).toHaveScreenshot('full-page.png', {
    fullPage: true,
  });
});
```

### マスキングと除外

動的コンテンツ（日時、広告など）をマスキングして除外できます。

```typescript
test('動的要素のマスキング', async ({ page }) => {
  await page.goto('https://example.com/dashboard');

  await expect(page).toHaveScreenshot('dashboard.png', {
    // 特定要素をマスク（ピンク色で塗りつぶし）
    mask: [
      page.locator('.timestamp'),
      page.locator('.advertisement'),
      page.locator('[data-dynamic]'),
    ],
  });
});
```

## レスポンシブデザインのテスト

複数のビューポートサイズでテストします。

```typescript
// tests/visual/responsive.spec.ts
import { test, expect, devices } from '@playwright/test';

const viewports = [
  { name: 'mobile', ...devices['iPhone 12'] },
  { name: 'tablet', ...devices['iPad Pro'] },
  { name: 'desktop', viewport: { width: 1920, height: 1080 } },
];

for (const device of viewports) {
  test(`レスポンシブ: ${device.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      ...device,
    });
    const page = await context.newPage();

    await page.goto('https://example.com');

    await expect(page).toHaveScreenshot(`homepage-${device.name}.png`);

    await context.close();
  });
}
```

## ダークモード対応のテスト

```typescript
// tests/visual/dark-mode.spec.ts
import { test, expect } from '@playwright/test';

test.describe('ダークモード', () => {
  test.use({
    colorScheme: 'dark',
  });

  test('ダークモードの表示', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveScreenshot('homepage-dark.png');
  });
});

test.describe('ライトモード', () => {
  test.use({
    colorScheme: 'light',
  });

  test('ライトモードの表示', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveScreenshot('homepage-light.png');
  });
});
```

## ブラウザ間の差異テスト

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

各ブラウザで別々のベースライン画像が作成されます。

```
tests/
  visual/
    homepage.spec.ts
    homepage.spec.ts-snapshots/
      homepage-chromium.png
      homepage-firefox.png
      homepage-webkit.png
```

## コンポーネント単位のビジュアルテスト

```typescript
// tests/visual/components.spec.ts
import { test, expect } from '@playwright/test';

test.describe('ボタンコンポーネント', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:6006'); // Storybook
  });

  test('プライマリボタン', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/button--primary');
    const button = page.locator('#storybook-preview-iframe >> button');
    await expect(button).toHaveScreenshot('button-primary.png');
  });

  test('セカンダリボタン', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/button--secondary');
    const button = page.locator('#storybook-preview-iframe >> button');
    await expect(button).toHaveScreenshot('button-secondary.png');
  });

  test('無効状態のボタン', async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/button--disabled');
    const button = page.locator('#storybook-preview-iframe >> button');
    await expect(button).toHaveScreenshot('button-disabled.png');
  });
});
```

## CI/CDでの運用

### GitHub Actionsでの設定

```yaml
# .github/workflows/visual-tests.yml
name: Visual Regression Tests

on:
  pull_request:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run visual tests
        run: npm test

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-test-results
          path: |
            test-results/
            playwright-report/
          retention-days: 30
```

### 差分画像の確認

テストが失敗すると、差分画像が生成されます。

```
test-results/
  visual-homepage-chromium/
    homepage-actual.png      # 実際の画像
    homepage-expected.png    # 期待される画像
    homepage-diff.png        # 差分画像
```

### ベースライン画像の更新フロー

1. ローカルでビジュアル変更を確認
2. 意図した変更であれば、ベースラインを更新

```bash
npm test -- --update-snapshots
```

3. 更新したスクリーンショットをコミット

```bash
git add tests/**/*-snapshots/
git commit -m "Update visual regression baselines"
```

## 実践的なテスト戦略

### ページタイプ別のテスト

```typescript
// tests/visual/pages.spec.ts
import { test, expect } from '@playwright/test';

// 静的ページ: 厳密な比較
test('About ページ', async ({ page }) => {
  await page.goto('https://example.com/about');
  await expect(page).toHaveScreenshot('about.png', {
    maxDiffPixelRatio: 0.01,
  });
});

// 動的コンテンツあり: 部分マスク
test('ダッシュボード', async ({ page }) => {
  await page.goto('https://example.com/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png', {
    mask: [page.locator('.chart'), page.locator('.timestamp')],
    maxDiffPixelRatio: 0.05,
  });
});

// データドリブン: 特定要素のみ
test('商品詳細', async ({ page }) => {
  await page.goto('https://example.com/product/123');
  const productCard = page.locator('.product-card');
  await expect(productCard).toHaveScreenshot('product-card.png', {
    mask: [page.locator('.price'), page.locator('.stock')],
  });
});
```

### インタラクション後のビジュアルテスト

```typescript
// tests/visual/interactions.spec.ts
import { test, expect } from '@playwright/test';

test('モーダル表示', async ({ page }) => {
  await page.goto('https://example.com');

  // モーダルを開く
  await page.click('button[data-modal="open"]');
  await page.waitForSelector('.modal', { state: 'visible' });

  // モーダルのスクリーンショット
  await expect(page.locator('.modal')).toHaveScreenshot('modal.png');
});

test('フォームバリデーション', async ({ page }) => {
  await page.goto('https://example.com/contact');

  // 無効な入力
  await page.fill('input[name="email"]', 'invalid-email');
  await page.click('button[type="submit"]');

  // エラー表示のスクリーンショット
  await expect(page).toHaveScreenshot('form-validation-error.png');
});

test('ホバー状態', async ({ page }) => {
  await page.goto('https://example.com');

  const button = page.locator('button.primary');
  await button.hover();

  await expect(button).toHaveScreenshot('button-hover.png');
});
```

## パフォーマンスとベストプラクティス

### 並列実行の最適化

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ビジュアルテストは並列実行可能
  workers: process.env.CI ? 2 : 4,

  // タイムアウト設定
  timeout: 30000,

  use: {
    // スクリーンショットのタイムアウト
    screenshot: {
      timeout: 5000,
    },
  },
});
```

### テストの分離

```typescript
// tests/visual/critical.spec.ts
// クリティカルなページのみ
test.describe('クリティカルパス', () => {
  test('ホームページ', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('ログインページ', async ({ page }) => {
    await page.goto('https://example.com/login');
    await expect(page).toHaveScreenshot('login.png');
  });
});
```

```typescript
// tests/visual/comprehensive.spec.ts
// 全ページの詳細テスト（nightly実行など）
test.describe('全ページビジュアルテスト', () => {
  // ... より多くのテストケース
});
```

### ストレージの管理

スクリーンショットはファイルサイズが大きいため、Git LFSの使用を検討します。

```bash
# .gitattributes
tests/**/*.png filter=lfs diff=lfs merge=lfs -text
```

## トラブルシューティング

### フォントレンダリングの差異

OSやブラウザによってフォントレンダリングが異なる場合があります。

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // Webフォントの読み込みを待つ
    waitForFonts: true,
  },
});
```

### タイミング問題

画像やコンテンツの読み込みを待ちます。

```typescript
test('画像読み込み待機', async ({ page }) => {
  await page.goto('https://example.com/gallery');

  // すべての画像の読み込みを待つ
  await page.waitForLoadState('networkidle');

  // または特定の画像を待つ
  await page.waitForSelector('img[src*="hero.jpg"]');
  await page.locator('img[src*="hero.jpg"]').evaluate((img: HTMLImageElement) => {
    return img.complete;
  });

  await expect(page).toHaveScreenshot('gallery.png');
});
```

### CI環境での一貫性

Docker環境で実行することで、環境の一貫性を確保できます。

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["npm", "test"]
```

## まとめ

Playwrightのビジュアルリグレッションテストは、UIの意図しない変更を自動的に検出する強力な機能です。適切な許容誤差の設定、動的コンテンツのマスキング、そしてCI/CDへの統合により、効果的なビジュアルテスト戦略を構築できます。

重要なのは、すべてのページを完全にテストしようとするのではなく、クリティカルなページやコンポーネントに焦点を当て、段階的にカバレッジを広げていくことです。ビジュアルリグレッションテストをE2Eテストと組み合わせることで、より堅牢なテストスイートを構築できます。
