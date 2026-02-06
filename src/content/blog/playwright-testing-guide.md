---
title: "Playwrightで始めるE2Eテスト実践ガイド"
description: "Microsoft製のモダンE2EテスティングフレームワークPlaywrightで、信頼性の高いブラウザ自動テストを構築。並列実行、複数ブラウザ対応、デバッグツールなど充実の機能を解説"
pubDate: "2025-02-06"
---

# Playwrightで始めるE2Eテスト実践ガイド

Webアプリケーションの品質保証において、E2E（End-to-End）テストは不可欠です。**Playwright** は、Microsoftが開発した次世代のブラウザ自動化フレームワークで、信頼性が高く高速なE2Eテストを実現します。

本記事では、Playwrightの基本から実践的なテスト戦略まで、詳しく解説します。

## Playwrightとは

Playwrightは、Chromium、Firefox、WebKitをサポートする統一APIを提供するブラウザ自動化ツールです。

### Seleniumとの違い

| 特徴 | Playwright | Selenium |
|------|-----------|----------|
| 速度 | 高速 | 低速 |
| 自動待機 | あり | なし |
| 複数タブ/コンテキスト | ネイティブサポート | 複雑 |
| ネットワークインターセプト | 可能 | 不可 |
| TypeScript対応 | ファーストクラス | サードパーティ |

## セットアップ

### インストール

```bash
# 新規プロジェクト
npm init playwright@latest

# 既存プロジェクトに追加
npm install -D @playwright/test
npx playwright install
```

対話的に以下を選択:
- TypeScript or JavaScript → TypeScript
- tests フォルダ名 → tests
- GitHub Actions workflow → Yes

### 基本設定

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 基本的なテスト

### シンプルなテスト

```typescript
// tests/example.spec.ts
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page).toHaveURL(/.*intro/);
});
```

### テストの実行

```bash
# すべてのテスト実行
npx playwright test

# 特定ファイル実行
npx playwright test tests/example.spec.ts

# ブラウザ指定
npx playwright test --project=chromium

# UIモード(対話的)
npx playwright test --ui

# デバッグモード
npx playwright test --debug
```

## ロケーター戦略

Playwrightは優れたロケーターAPIを提供します。

### 推奨されるロケーター

```typescript
// Role-based(最推奨)
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');

// Label(フォーム用)
await page.getByLabel('Username').fill('johndoe');
await page.getByLabel('Password').fill('secret');

// Placeholder
await page.getByPlaceholder('Search...').fill('Playwright');

// Text
await page.getByText('Welcome back').click();

// Test ID(推奨: 安定性が高い)
await page.getByTestId('submit-button').click();
```

### カスタムロケーター

```typescript
// CSS Selector
await page.locator('.submit-btn').click();

// XPath
await page.locator('xpath=//button[@type="submit"]').click();

// 複合条件
await page.locator('button', { hasText: 'Submit' }).click();

// フィルタリング
await page.locator('li').filter({ hasText: 'Apple' }).click();

// 連鎖
await page
  .locator('article')
  .filter({ has: page.locator('h2', { hasText: 'News' }) })
  .getByRole('link', { name: 'Read more' })
  .click();
```

## Auto-waiting(自動待機)

Playwrightは要素が操作可能になるまで自動で待機します。

```typescript
// 明示的な待機は不要!
await page.getByRole('button').click(); // ボタンが表示され、有効になるまで待つ

// 従来のSeleniumでは...
// await driver.wait(until.elementLocated(By.css('button')));
// await driver.wait(until.elementIsVisible(element));
// await driver.wait(until.elementIsEnabled(element));
// await element.click();
```

### カスタム待機

```typescript
// 特定の状態まで待つ
await page.waitForSelector('.loading', { state: 'hidden' });

// URLの変化を待つ
await page.waitForURL('**/dashboard');

// ネットワークリクエストを待つ
await page.waitForResponse(resp =>
  resp.url().includes('/api/users') && resp.status() === 200
);

// カスタム条件
await page.waitForFunction(() =>
  document.querySelectorAll('.item').length > 10
);
```

## フォームとインタラクション

```typescript
test('form submission', async ({ page }) => {
  await page.goto('/signup');

  // 入力
  await page.getByLabel('Username').fill('johndoe');
  await page.getByLabel('Email').fill('john@example.com');
  await page.getByLabel('Password').fill('SecurePass123!');

  // チェックボックス
  await page.getByLabel('I agree to terms').check();
  expect(await page.getByLabel('I agree to terms').isChecked()).toBeTruthy();

  // ラジオボタン
  await page.getByLabel('Premium Plan').check();

  // セレクトボックス
  await page.selectOption('select#country', 'Japan');

  // ファイルアップロード
  await page.setInputFiles('input[type="file"]', 'path/to/file.pdf');

  // 送信
  await page.getByRole('button', { name: 'Sign up' }).click();

  // 成功メッセージを確認
  await expect(page.getByText('Account created successfully')).toBeVisible();
});
```

## アサーション

```typescript
import { expect } from '@playwright/test';

// 表示確認
await expect(page.getByText('Success')).toBeVisible();
await expect(page.getByText('Error')).toBeHidden();

// テキスト内容
await expect(page.getByTestId('status')).toHaveText('Active');
await expect(page.getByRole('heading')).toContainText('Welcome');

// 属性
await expect(page.getByRole('link')).toHaveAttribute('href', '/about');
await expect(page.getByRole('button')).toBeDisabled();

// カウント
await expect(page.getByRole('listitem')).toHaveCount(5);

// URL
await expect(page).toHaveURL(/.*dashboard/);
await expect(page).toHaveTitle('Dashboard | My App');

// CSS
await expect(page.getByTestId('banner')).toHaveCSS('background-color', 'rgb(255, 0, 0)');
```

## ネットワークインターセプト

APIレスポンスをモックして、テストを安定化します。

```typescript
test('mock API response', async ({ page }) => {
  // APIレスポンスをモック
  await page.route('**/api/users', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]),
    });
  });

  await page.goto('/users');
  await expect(page.getByText('Alice')).toBeVisible();
  await expect(page.getByText('Bob')).toBeVisible();
});

test('intercept and modify', async ({ page }) => {
  await page.route('**/api/config', async route => {
    const response = await route.fetch();
    const json = await response.json();
    json.featureFlag = true; // フラグを強制的にON
    await route.fulfill({ response, json });
  });

  await page.goto('/');
  await expect(page.getByTestId('new-feature')).toBeVisible();
});
```

## Visual Regressionテスト

スクリーンショット比較でUIの意図しない変更を検出します。

```typescript
test('visual regression', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});

test('component screenshot', async ({ page }) => {
  await page.goto('/pricing');
  const card = page.getByTestId('premium-plan');
  await expect(card).toHaveScreenshot('premium-card.png');
});
```

初回実行でベースライン画像が生成され、2回目以降は差分を検出します。

```bash
# スクリーンショット更新
npx playwright test --update-snapshots
```

## CI/CD統合

### GitHub Actions

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
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

## ベストプラクティス

### Page Object Model

```typescript
// pages/LoginPage.ts
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Log in' }).click();
  }

  async getErrorMessage() {
    return this.page.getByTestId('error-message').textContent();
  }
}

// tests/auth.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('login with invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('wrong@example.com', 'wrongpass');
  const error = await loginPage.getErrorMessage();
  expect(error).toContain('Invalid credentials');
});
```

### テストデータの分離

```typescript
// fixtures/users.ts
export const testUsers = {
  admin: { email: 'admin@test.com', password: 'Admin123!' },
  user: { email: 'user@test.com', password: 'User123!' },
};

// tests/dashboard.spec.ts
import { testUsers } from '../fixtures/users';

test('admin can access admin panel', async ({ page }) => {
  // ログイン処理を再利用
  await page.goto('/login');
  await page.getByLabel('Email').fill(testUsers.admin.email);
  await page.getByLabel('Password').fill(testUsers.admin.password);
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('link', { name: 'Admin Panel' })).toBeVisible();
});
```

## まとめ

Playwrightは、モダンなE2Eテストに必要な機能をすべて備えています。

- 自動待機でフレーキーなテストを削減
- 強力なロケーターで保守性の高いテスト
- Visual Regressionで意図しないUI変更を検出
- CI/CD統合が簡単

SeleniumやCypressからの移行も検討する価値があります。

公式ドキュメント: https://playwright.dev/
