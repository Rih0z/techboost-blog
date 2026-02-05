---
title: 'Playwright完全ガイド - モダンE2Eテストの決定版'
description: 'PlaywrightでE2Eテストを完全マスター。自動テスト、Visual Regression、CI統合、ベストプラクティスまで実践的に解説します。'
pubDate: 'Feb 05 2026'
tags: ['Playwright', 'Testing', 'E2E', 'CI/CD']
---

# Playwright完全ガイド - モダンE2Eテストの決定版

E2E（End-to-End）テストは、Webアプリケーションの品質を保証する上で欠かせません。Playwrightは、Microsoftが開発した次世代のブラウザ自動化ツールで、高速・安定・多機能なテスト環境を提供します。

この記事では、Playwrightの基本から実践的なテスト手法、CI統合まで、実務で必要な知識を網羅的に解説します。

## Playwrightとは

Playwrightは、Microsoft社が開発したオープンソースのブラウザ自動化フレームワークです。2020年にリリースされ、Seleniumに代わる新しいスタンダードとして急速に普及しています。

### Playwrightの特徴

1. **クロスブラウザ対応**
   - Chromium（Chrome、Edge）
   - Firefox
   - WebKit（Safari）
   - 単一のAPIで全ブラウザをサポート

2. **高速かつ安定**
   - 自動待機機能で flaky test を削減
   - 並列実行による高速化
   - ネットワークインターセプション

3. **強力な開発者体験**
   - TypeScript完全サポート
   - Test Generator（コードジェネレーター）
   - Trace Viewer（デバッグツール）
   - VS Code拡張機能

4. **モダン機能**
   - Visual Regression Testing
   - APIテスト
   - モバイルエミュレーション
   - 多様なブラウザコンテキスト

### Selenium/Cypress との比較

| 特徴 | Playwright | Selenium | Cypress |
|------|-----------|----------|---------|
| ブラウザサポート | Chromium, Firefox, WebKit | 主要ブラウザ全て | Chromium, Firefox, Edge |
| 言語サポート | JS/TS, Python, Java, .NET | 多言語 | JS/TS のみ |
| 自動待機 | 標準搭載 | 要実装 | 標準搭載 |
| 並列実行 | 高速 | 可能だが遅い | 有料版のみ |
| ネットワーク制御 | 強力 | 限定的 | 標準搭載 |
| iFrame対応 | 完全対応 | 対応 | 制限あり |

## インストールとセットアップ

### 新規プロジェクトでのセットアップ

```bash
# npm
npm init playwright@latest

# yarn
yarn create playwright

# pnpm
pnpm create playwright

# bun
bun create playwright
```

インストール時の質問に答えると、以下が自動生成されます。

- `playwright.config.ts` - 設定ファイル
- `tests/` - テストディレクトリ
- `tests-examples/` - サンプルテスト

### 既存プロジェクトへの追加

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 設定ファイル

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // テストディレクトリ
  testDir: './tests',

  // タイムアウト設定
  timeout: 30000,

  // 並列実行数
  workers: process.env.CI ? 1 : undefined,

  // 失敗時の再試行
  retries: process.env.CI ? 2 : 0,

  // レポーター
  reporter: [
    ['html'],
    ['list'],
  ],

  // 全テスト共通の設定
  use: {
    // ベースURL
    baseURL: 'http://localhost:3000',

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // トレース（失敗時のみ）
    trace: 'on-first-retry',

    // ビューポート
    viewport: { width: 1280, height: 720 },
  },

  // ブラウザ設定
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
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // 開発サーバーの自動起動
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

## 基本的なテスト

### 最初のテスト

```typescript
// tests/example.spec.ts
import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  // ページに移動
  await page.goto('https://playwright.dev/');

  // タイトルを検証
  await expect(page).toHaveTitle(/Playwright/);

  // リンクをクリック
  await page.getByRole('link', { name: 'Get started' }).click();

  // URLを検証
  await expect(page).toHaveURL(/.*intro/);
});
```

### テストの実行

```bash
# すべてのテストを実行
npx playwright test

# 特定のファイルのみ
npx playwright test tests/example.spec.ts

# ヘッドモード（ブラウザを表示）
npx playwright test --headed

# デバッグモード
npx playwright test --debug

# 特定のブラウザのみ
npx playwright test --project=chromium

# UI モード（推奨）
npx playwright test --ui
```

## ロケーター（Locator）

Playwrightの最も重要な概念がロケーターです。要素を特定する方法を理解することが、安定したテストを書く鍵です。

### 推奨されるロケーター

```typescript
import { test, expect } from '@playwright/test';

test('locators demo', async ({ page }) => {
  await page.goto('https://example.com');

  // Role（最も推奨）
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('link', { name: 'About' }).click();
  await page.getByRole('heading', { name: 'Welcome' });

  // Text
  await page.getByText('Welcome to our site').click();
  await page.getByText(/welcome/i); // 正規表現も可能

  // Label（フォーム要素）
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('secret');

  // Placeholder
  await page.getByPlaceholder('Enter your name').fill('John');

  // Alt text（画像）
  await page.getByAltText('Company logo').click();

  // Title
  await page.getByTitle('Close').click();

  // Test ID（data-testid属性）
  await page.getByTestId('submit-button').click();
});
```

### CSS セレクター

```typescript
test('css selectors', async ({ page }) => {
  await page.goto('https://example.com');

  // クラス
  await page.locator('.button-primary').click();

  // ID
  await page.locator('#username').fill('john');

  // 属性
  await page.locator('[data-test="login-btn"]').click();

  // 階層
  await page.locator('form > button').click();

  // 複数要素
  const items = await page.locator('.list-item').all();
  console.log(`Found ${items.length} items`);
});
```

### XPath（非推奨）

```typescript
// XPathは使えるが、CSS セレクターが推奨される
await page.locator('xpath=//button[text()="Submit"]').click();
```

### ロケーターの組み合わせ

```typescript
test('chaining locators', async ({ page }) => {
  await page.goto('https://example.com');

  // 階層的な指定
  const form = page.locator('form');
  await form.getByLabel('Email').fill('test@example.com');
  await form.getByRole('button', { name: 'Submit' }).click();

  // フィルタリング
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Product 1' })
    .getByRole('button', { name: 'Add to cart' })
    .click();

  // n番目の要素
  await page.getByRole('button').nth(2).click();
  await page.getByRole('button').first().click();
  await page.getByRole('button').last().click();
});
```

## インタラクション

### クリック

```typescript
test('clicking', async ({ page }) => {
  await page.goto('https://example.com');

  // 基本的なクリック
  await page.getByRole('button', { name: 'Submit' }).click();

  // ダブルクリック
  await page.getByText('Double click me').dblclick();

  // 右クリック
  await page.getByText('Context menu').click({ button: 'right' });

  // Shift + クリック
  await page.getByText('Link').click({ modifiers: ['Shift'] });

  // 特定の位置をクリック
  await page.getByRole('button').click({ position: { x: 10, y: 10 } });

  // 強制クリック（隠れている要素も）
  await page.getByRole('button').click({ force: true });
});
```

### フォーム入力

```typescript
test('form interactions', async ({ page }) => {
  await page.goto('https://example.com/form');

  // テキスト入力
  await page.getByLabel('Username').fill('john_doe');

  // 段階的な入力（キーボードイベントを発火）
  await page.getByLabel('Search').type('playwright', { delay: 100 });

  // 入力をクリア
  await page.getByLabel('Email').clear();

  // チェックボックス
  await page.getByLabel('I agree to terms').check();
  await page.getByLabel('Subscribe').uncheck();

  // ラジオボタン
  await page.getByLabel('Male').check();

  // セレクトボックス
  await page.getByLabel('Country').selectOption('Japan');
  await page.getByLabel('Country').selectOption({ value: 'jp' });
  await page.getByLabel('Country').selectOption({ label: 'Japan' });

  // 複数選択
  await page.getByLabel('Skills').selectOption(['JavaScript', 'TypeScript', 'Python']);

  // ファイルアップロード
  await page.getByLabel('Upload').setInputFiles('path/to/file.pdf');
  await page.getByLabel('Upload').setInputFiles([
    'path/to/file1.pdf',
    'path/to/file2.pdf',
  ]);

  // ファイルをクリア
  await page.getByLabel('Upload').setInputFiles([]);
});
```

### キーボード操作

```typescript
test('keyboard interactions', async ({ page }) => {
  await page.goto('https://example.com');

  // 単一キー
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');

  // 修飾キーとの組み合わせ
  await page.keyboard.press('Control+A'); // Ctrl+A
  await page.keyboard.press('Meta+C'); // Cmd+C (Mac) / Win+C (Windows)

  // 連続入力
  await page.keyboard.type('Hello, World!');

  // キーの押下と解放
  await page.keyboard.down('Shift');
  await page.keyboard.press('A');
  await page.keyboard.press('B');
  await page.keyboard.up('Shift');
});
```

### マウス操作

```typescript
test('mouse interactions', async ({ page }) => {
  await page.goto('https://example.com');

  // 特定の座標に移動
  await page.mouse.move(100, 200);

  // クリック
  await page.mouse.click(100, 200);

  // ダブルクリック
  await page.mouse.dblclick(100, 200);

  // ドラッグ&ドロップ
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(300, 300);
  await page.mouse.up();

  // ホイールスクロール
  await page.mouse.wheel(0, 100);
});
```

### ドラッグ&ドロップ（高レベルAPI）

```typescript
test('drag and drop', async ({ page }) => {
  await page.goto('https://example.com/drag-demo');

  const source = page.locator('#draggable');
  const target = page.locator('#droppable');

  await source.dragTo(target);
});
```

## アサーション（検証）

### 要素の状態

```typescript
test('element assertions', async ({ page }) => {
  await page.goto('https://example.com');

  // 要素の存在
  await expect(page.getByText('Welcome')).toBeVisible();
  await expect(page.getByText('Hidden')).toBeHidden();

  // 有効/無効
  await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Disabled' })).toBeDisabled();

  // チェック状態
  await expect(page.getByLabel('Terms')).toBeChecked();
  await expect(page.getByLabel('Newsletter')).not.toBeChecked();

  // テキスト
  await expect(page.getByRole('heading')).toHaveText('Welcome');
  await expect(page.getByRole('heading')).toContainText('Welcome');
  await expect(page.getByRole('heading')).toHaveText(/welcome/i);

  // 属性
  await expect(page.getByRole('link')).toHaveAttribute('href', '/about');
  await expect(page.getByRole('link')).toHaveAttribute('href', /\/about/);

  // クラス
  await expect(page.getByRole('button')).toHaveClass('btn btn-primary');
  await expect(page.getByRole('button')).toHaveClass(/btn-primary/);

  // CSS
  await expect(page.getByRole('button')).toHaveCSS('color', 'rgb(255, 0, 0)');

  // カウント
  await expect(page.getByRole('listitem')).toHaveCount(5);

  // 値（input要素）
  await expect(page.getByLabel('Email')).toHaveValue('test@example.com');
  await expect(page.getByLabel('Email')).toHaveValue(/test@/);
});
```

### ページの状態

```typescript
test('page assertions', async ({ page }) => {
  await page.goto('https://example.com');

  // URL
  await expect(page).toHaveURL('https://example.com/');
  await expect(page).toHaveURL(/example\.com/);

  // タイトル
  await expect(page).toHaveTitle('Example Domain');
  await expect(page).toHaveTitle(/Example/);

  // スクリーンショット（Visual Regression）
  await expect(page).toHaveScreenshot('homepage.png');

  // 特定の要素のスクリーンショット
  await expect(page.getByRole('navigation')).toHaveScreenshot('nav.png');
});
```

### カスタムアサーション

```typescript
test('custom assertions', async ({ page }) => {
  await page.goto('https://example.com');

  // 複数条件
  const button = page.getByRole('button', { name: 'Submit' });

  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await expect(button).toHaveText('Submit');

  // または、all() で一度に検証
  await expect.soft(button).toBeVisible();
  await expect.soft(button).toBeEnabled();
  // soft を使うとテストが失敗しても続行される
});
```

## 待機とタイミング

Playwrightは自動待機機能を備えていますが、特殊なケースでは明示的な待機が必要です。

### 自動待機

```typescript
test('auto-waiting', async ({ page }) => {
  await page.goto('https://example.com');

  // 以下の操作は自動的に要素が準備されるまで待機します
  await page.getByRole('button').click(); // visible、enabled になるまで待機
  await page.getByLabel('Email').fill('test@example.com'); // editable になるまで待機
  await expect(page.getByText('Success')).toBeVisible(); // visible になるまで待機
});
```

### 明示的な待機

```typescript
test('explicit waiting', async ({ page }) => {
  await page.goto('https://example.com');

  // 要素が表示されるまで待機
  await page.waitForSelector('.dynamic-content');

  // 要素が消えるまで待機
  await page.waitForSelector('.loading-spinner', { state: 'hidden' });

  // URLが変わるまで待機
  await page.waitForURL('**/dashboard');

  // ネットワークがアイドル状態になるまで待機
  await page.waitForLoadState('networkidle');

  // DOM が完全に読み込まれるまで待機
  await page.waitForLoadState('domcontentloaded');

  // 特定の時間待機（非推奨）
  await page.waitForTimeout(1000);

  // 関数が true を返すまで待機
  await page.waitForFunction(() => {
    return document.querySelectorAll('.item').length > 5;
  });

  // レスポンスを待機
  const response = await page.waitForResponse('**/api/data');
  console.log(await response.json());

  // リクエストを待機
  await page.waitForRequest('**/api/submit');
});
```

## ナビゲーション

```typescript
test('navigation', async ({ page }) => {
  // ページ遷移
  await page.goto('https://example.com');
  await page.goto('https://example.com/about');

  // 戻る
  await page.goBack();

  // 進む
  await page.goForward();

  // リロード
  await page.reload();

  // ナビゲーション完了まで待機
  await page.goto('https://example.com', { waitUntil: 'networkidle' });

  // クリックとナビゲーション
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole('link', { name: 'About' }).click(),
  ]);
});
```

## テストの構造化

### Before/After フック

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  // 各テスト前に実行
  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com/login');
  });

  // 各テスト後に実行
  test.afterEach(async ({ page }) => {
    await page.close();
  });

  // テストグループ全体の前に1回だけ実行
  test.beforeAll(async () => {
    console.log('Starting authentication tests');
  });

  // テストグループ全体の後に1回だけ実行
  test.afterAll(async () => {
    console.log('Finished authentication tests');
  });

  test('should login successfully', async ({ page }) => {
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});
```

### テストの分離

```typescript
test.describe('Test isolation', () => {
  // 各テストは独立したブラウザコンテキストで実行される
  test('test 1', async ({ page }) => {
    await page.goto('https://example.com');
    // このテストの変更は他のテストに影響しない
  });

  test('test 2', async ({ page }) => {
    await page.goto('https://example.com');
    // 完全に新しいコンテキスト
  });
});
```

### 条件付きテスト

```typescript
test('only on chromium', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'This test is only for Chromium');

  await page.goto('https://example.com');
  // Chromium 専用のテスト
});

test('skip in CI', async ({ page }) => {
  test.skip(!!process.env.CI, 'Skip in CI environment');

  await page.goto('https://example.com');
});

test.fixme('broken test', async ({ page }) => {
  // 現在壊れているテストをマーク（スキップされる）
  await page.goto('https://example.com');
});
```

## Fixtures（カスタムコンテキスト）

Fixtureを使うと、テスト間で共通のセットアップロジックを再利用できます。

### 基本的なFixture

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';

type MyFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // セットアップ
    await page.goto('https://example.com/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('**/dashboard');

    // テストに渡す
    await use(page);

    // クリーンアップ（必要に応じて）
    await page.close();
  },
});

export { expect } from '@playwright/test';
```

```typescript
// test.spec.ts
import { test, expect } from './fixtures';

test('dashboard test', async ({ authenticatedPage }) => {
  // すでにログイン済みのページが渡される
  await expect(authenticatedPage.getByText('Welcome')).toBeVisible();
});
```

### Page Object Model (POM)

```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
  }

  async goto() {
    await this.page.goto('https://example.com/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

```typescript
// test.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test('login with POM', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('test@example.com', 'password');

  await expect(page).toHaveURL(/.*dashboard/);
});
```

## ネットワーク制御

### リクエストのインターセプト

```typescript
test('intercept requests', async ({ page }) => {
  // すべてのAPIリクエストをブロック
  await page.route('**/api/**', route => route.abort());

  // 特定のリクエストをモック
  await page.route('**/api/users', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]),
    });
  });

  // リクエストを変更
  await page.route('**/api/data', route => {
    route.continue({
      headers: {
        ...route.request().headers(),
        'Authorization': 'Bearer fake-token',
      },
    });
  });

  await page.goto('https://example.com');
});
```

### レスポンスのインターセプト

```typescript
test('intercept responses', async ({ page }) => {
  await page.route('**/api/config', async route => {
    const response = await route.fetch();
    const json = await response.json();

    // レスポンスを変更
    json.featureFlag = true;

    route.fulfill({
      response,
      json,
    });
  });

  await page.goto('https://example.com');
});
```

### ネットワーク状況のエミュレート

```typescript
test('offline mode', async ({ page, context }) => {
  // オフラインモード
  await context.setOffline(true);
  await page.goto('https://example.com');

  // オンラインに戻す
  await context.setOffline(false);
});

test('slow network', async ({ page, context }) => {
  // ネットワークを遅くする
  await page.route('**/*', route => {
    setTimeout(() => route.continue(), 1000);
  });

  await page.goto('https://example.com');
});
```

## Visual Regression Testing

Playwrightの強力な機能の一つが、Visual Regression Testing（視覚回帰テスト）です。

### 基本的なスクリーンショット比較

```typescript
test('visual regression', async ({ page }) => {
  await page.goto('https://example.com');

  // ページ全体のスクリーンショット
  await expect(page).toHaveScreenshot('homepage.png');

  // 特定の要素のみ
  await expect(page.getByRole('navigation')).toHaveScreenshot('nav.png');

  // オプション付き
  await expect(page).toHaveScreenshot('homepage-full.png', {
    fullPage: true,
    maxDiffPixels: 100, // 許容する差分ピクセル数
  });
});
```

### スクリーンショットの更新

```bash
# スクリーンショットを更新
npx playwright test --update-snapshots
```

### マスキング

特定の要素を比較から除外します（動的コンテンツなど）。

```typescript
test('screenshot with masking', async ({ page }) => {
  await page.goto('https://example.com');

  await expect(page).toHaveScreenshot({
    // 特定の要素をマスク
    mask: [
      page.getByText('Current time:'), // 時刻表示を除外
      page.locator('.advertisement'), // 広告を除外
    ],
  });
});
```

## モバイルエミュレーション

```typescript
import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 12'],
});

test('mobile test', async ({ page }) => {
  await page.goto('https://example.com');

  // モバイル表示での要素確認
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
});
```

### カスタムデバイス

```typescript
test.use({
  viewport: { width: 375, height: 667 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

test('custom mobile test', async ({ page }) => {
  await page.goto('https://example.com');
});
```

## 認証の永続化

ログイン状態を保存して、各テストで再ログインを避けます。

### グローバルセットアップ

```typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://example.com/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();

  // 認証状態を保存
  await page.context().storageState({ path: 'auth.json' });

  await browser.close();
}

export default globalSetup;
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  use: {
    storageState: 'auth.json', // すべてのテストで認証状態を使用
  },
});
```

### プロジェクトごとの認証

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'authenticated',
      use: { storageState: 'auth.json' },
      dependencies: ['setup'],
    },
  ],
});
```

```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.context().storageState({ path: 'auth.json' });
});
```

## デバッグ

### UI Mode（推奨）

```bash
npx playwright test --ui
```

UI Modeでは以下が可能です。

- テストをステップごとに実行
- 各ステップでのDOMの状態を確認
- タイムトラベル
- ロケーターのピックアップ

### Trace Viewer

```bash
# トレースを有効にしてテスト実行
npx playwright test --trace on

# トレースを表示
npx playwright show-trace trace.zip
```

### Inspector

```bash
# デバッグモードで実行
npx playwright test --debug
```

### VS Code拡張機能

VS Code Playwrightエクステンションを使うと、エディタ内でテストの実行・デバッグが可能になります。

```bash
# インストール
code --install-extension ms-playwright.playwright
```

機能:
- テストの実行ボタン
- ブレークポイント
- ステップ実行
- ロケーターピッカー

### ログ出力

```typescript
test('debug with console', async ({ page }) => {
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', err => console.error('Page error:', err));

  await page.goto('https://example.com');

  // スクリーンショット
  await page.screenshot({ path: 'debug.png' });

  // HTMLを保存
  const html = await page.content();
  console.log(html);
});
```

## CI/CD統合

### GitHub Actions

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Docker

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npx", "playwright", "test"]
```

### 並列実行

```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 4 : undefined,
  retries: process.env.CI ? 2 : 0,
});
```

## APIテスト

Playwrightはブラウザテストだけでなく、APIテストにも使えます。

```typescript
import { test, expect } from '@playwright/test';

test('API test', async ({ request }) => {
  // GET リクエスト
  const response = await request.get('https://api.example.com/users');
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(data).toHaveLength(10);

  // POST リクエスト
  const createResponse = await request.post('https://api.example.com/users', {
    data: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  const user = await createResponse.json();
  expect(user).toHaveProperty('id');
  expect(user.name).toBe('John Doe');

  // PUT リクエスト
  await request.put(`https://api.example.com/users/${user.id}`, {
    data: {
      name: 'Jane Doe',
    },
  });

  // DELETE リクエスト
  await request.delete(`https://api.example.com/users/${user.id}`);

  // カスタムヘッダー
  await request.get('https://api.example.com/protected', {
    headers: {
      'Authorization': 'Bearer token',
    },
  });
});
```

## パフォーマンステスト

```typescript
test('performance', async ({ page }) => {
  await page.goto('https://example.com');

  // パフォーマンスメトリクスを取得
  const metrics = await page.evaluate(() => JSON.stringify(window.performance));
  console.log(metrics);

  // Largest Contentful Paint (LCP) を測定
  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.renderTime || lastEntry.loadTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
  });

  expect(lcp).toBeLessThan(2500); // 2.5秒以内
});
```

## ベストプラクティス

### 1. ロケーター選択の優先順位

```typescript
// 推奨度: 高 → 低
page.getByRole('button', { name: 'Submit' }); // 1. Role（最推奨）
page.getByLabel('Email'); // 2. Label
page.getByPlaceholder('Enter email'); // 3. Placeholder
page.getByText('Welcome'); // 4. Text
page.getByTestId('submit-btn'); // 5. Test ID
page.locator('.submit-button'); // 6. CSS セレクター（最終手段）
```

### 2. 自動待機を活用

```typescript
// 悪い例
await page.waitForTimeout(1000);
await page.locator('.button').click();

// 良い例
await page.locator('.button').click(); // 自動待機
```

### 3. Page Object Model を使う

テストコードとページロジックを分離し、保守性を向上させます。

### 4. 並列実行を活用

```typescript
// playwright.config.ts
export default defineConfig({
  workers: 4, // 4つのワーカーで並列実行
});
```

### 5. トレースとスクリーンショットを活用

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

### 6. テストデータの管理

```typescript
// test-data.ts
export const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
  },
  user: {
    email: 'user@example.com',
    password: 'user123',
  },
};
```

```typescript
// test.spec.ts
import { testUsers } from './test-data';

test('login as admin', async ({ page }) => {
  await loginPage.login(testUsers.admin.email, testUsers.admin.password);
});
```

## まとめ

Playwrightは、モダンWebアプリケーションのE2Eテストにおいて、最も強力で使いやすいツールの一つです。

### Playwrightの主な利点

1. **クロスブラウザ対応**: 単一のAPIで全ブラウザをサポート
2. **自動待機**: flaky testを大幅に削減
3. **高速実行**: 並列実行と効率的なリソース管理
4. **強力なデバッグツール**: UI Mode、Trace Viewer、Inspector
5. **Visual Regression**: スクリーンショット比較が標準搭載
6. **優れたTypeScriptサポート**: 型安全なテストコード

### 学習リソース

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Playwright GitHub](https://github.com/microsoft/playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)

Playwrightをマスターすることで、信頼性の高いテスト自動化を実現し、アプリケーションの品質を大幅に向上させることができます。
