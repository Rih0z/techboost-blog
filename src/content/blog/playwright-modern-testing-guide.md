---
title: "Playwright完全ガイド2026: E2Eテスト・ブラウザ自動化・CI統合の実践"
description: "Playwrightを使ったモダンなE2Eテストの完全ガイド。セットアップからページオブジェクトモデル、並列実行、ビジュアルリグレッションテスト、CI/CD統合まで実践的に解説します。Playwright・E2E Testing・Testingに関する実践情報。"
pubDate: "2026-02-06"
category: "Testing"
tags: ["Playwright", "E2E Testing", "Testing", "Automation", "CICD", "プログラミング"]
---
Playwrightは、Microsoft開発の次世代ブラウザ自動化ツールです。本記事では、E2Eテストの基礎からCI/CD統合、ビジュアルリグレッションテストまで、Playwrightの全機能を実践的に解説します。

## Playwrightとは

### 概要

Playwrightは、Chromium、Firefox、WebKitを統一APIで操作できるブラウザ自動化ツールです。

```typescript
// 主な特徴
/**
 * 1. マルチブラウザ対応 - Chrome、Firefox、Safari（WebKit）
 * 2. 高速・信頼性 - 自動待機、リトライ機能
 * 3. モダンWeb対応 - SPA、WebSocket、Shadow DOM
 * 4. 強力なデバッグ - タイムトラベルデバッグ、トレース機能
 * 5. 並列実行 - 複数ブラウザ、複数テストの並列実行
 */
```

### Selenium/Puppeteerとの比較

```typescript
// パフォーマンス比較
/**
 * Selenium:
 * - 古いアーキテクチャ（WebDriver経由）
 * - 待機処理が手動（暗黙的待機）
 * - セットアップが複雑
 *
 * Puppeteer:
 * - Chromeのみ対応
 * - Googleが開発
 * - 高速だが単一ブラウザ
 *
 * Playwright:
 * - 全ブラウザ対応
 * - 自動待機（Auto-wait）
 * - TypeScript完全サポート
 * - テストランナー内蔵
 */
```

## インストールとセットアップ

### 新規プロジェクト

```bash
# npm
npm init playwright@latest

# 対話形式でセットアップ
# → TypeScript / JavaScript
# → テストディレクトリ名
# → GitHub Actionsワークフロー追加
# → ブラウザのインストール

# ブラウザの手動インストール
npx playwright install

# 特定のブラウザのみ
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit

# システム依存関係も含めてインストール（Linux）
npx playwright install --with-deps
```

### 既存プロジェクトに追加

```bash
# Playwrightのインストール
npm install -D @playwright/test

# ブラウザインストール
npx playwright install

# 設定ファイル生成
npm init playwright@latest
```

### 設定ファイル

```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // テストディレクトリ
  testDir: './tests',

  // タイムアウト設定
  timeout: 30000, // 各テスト30秒
  expect: {
    timeout: 5000, // expect の待機時間
  },

  // 並列実行設定
  fullyParallel: true, // すべてのテストを並列実行
  workers: process.env.CI ? 1 : undefined, // CI環境では1ワーカー

  // 失敗時のリトライ
  retries: process.env.CI ? 2 : 0,

  // レポーター
  reporter: [
    ['html'], // HTMLレポート
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
  ],

  // グローバル設定
  use: {
    // ベースURL
    baseURL: 'http://localhost:3000',

    // トレース記録（失敗時のみ）
    trace: 'on-first-retry',

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // ビデオ録画
    video: 'retain-on-failure',

    // ヘッドレスモード
    headless: true,

    // ビューポート
    viewport: { width: 1280, height: 720 },

    // タイムアウト
    actionTimeout: 10000,
    navigationTimeout: 30000,
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
    // モバイル
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // ローカルサーバー起動
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

## 基本的なテスト

### 最初のテスト

```typescript
// tests/example.spec.ts

import { test, expect } from '@playwright/test'

test('basic test', async ({ page }) => {
  // ページに移動
  await page.goto('https://playwright.dev/')

  // タイトル確認
  await expect(page).toHaveTitle(/Playwright/)

  // リンクをクリック
  await page.getByRole('link', { name: 'Get started' }).click()

  // URLの確認
  await expect(page).toHaveURL(/.*intro/)
})

test('search functionality', async ({ page }) => {
  await page.goto('https://example.com')

  // 検索ボックスに入力
  await page.getByPlaceholder('Search...').fill('playwright')

  // 検索ボタンをクリック
  await page.getByRole('button', { name: 'Search' }).click()

  // 結果が表示されるまで待機
  await expect(page.getByText('Search Results')).toBeVisible()

  // 結果の検証
  const results = page.locator('.search-result')
  await expect(results).toHaveCount(10)
})
```

```bash
# テスト実行
npx playwright test

# 特定のファイルのみ
npx playwright test example.spec.ts

# 特定のブラウザのみ
npx playwright test --project=chromium

# ヘッド付きモード（ブラウザ表示）
npx playwright test --headed

# デバッグモード
npx playwright test --debug

# UIモード（インタラクティブ）
npx playwright test --ui
```

### セレクター

```typescript
// tests/selectors.spec.ts

import { test, expect } from '@playwright/test'

test('various selectors', async ({ page }) => {
  await page.goto('https://example.com')

  // テキストで検索
  await page.getByText('Submit').click()

  // ロール（アクセシビリティ）で検索
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com')
  await page.getByRole('link', { name: 'Read more' }).click()

  // ラベルで検索
  await page.getByLabel('Username').fill('john')
  await page.getByLabel('Password').fill('secret')

  // プレースホルダーで検索
  await page.getByPlaceholder('Enter your email').fill('test@example.com')

  // テストIDで検索（推奨）
  await page.getByTestId('submit-button').click()

  // CSSセレクター
  await page.locator('.submit-btn').click()
  await page.locator('#username').fill('john')

  // XPath
  await page.locator('xpath=//button[@type="submit"]').click()

  // 複合条件
  await page.locator('button:has-text("Submit")').click()

  // 親要素から検索
  const form = page.locator('form')
  await form.locator('input[name="email"]').fill('test@example.com')

  // n番目の要素
  await page.locator('button').nth(2).click()
  await page.locator('button').first().click()
  await page.locator('button').last().click()

  // フィルタリング
  await page.locator('button').filter({ hasText: 'Submit' }).click()
  await page.locator('article').filter({ has: page.locator('h2') }).first()
})
```

### アサーション

```typescript
// tests/assertions.spec.ts

import { test, expect } from '@playwright/test'

test('various assertions', async ({ page }) => {
  await page.goto('https://example.com')

  // ページタイトル
  await expect(page).toHaveTitle('Example Domain')
  await expect(page).toHaveTitle(/Example/)

  // URL
  await expect(page).toHaveURL('https://example.com/')
  await expect(page).toHaveURL(/example/)

  // 要素の表示
  await expect(page.getByText('Example Domain')).toBeVisible()
  await expect(page.getByText('Hidden Text')).toBeHidden()

  // 要素の有効/無効
  await expect(page.getByRole('button')).toBeEnabled()
  await expect(page.getByRole('button')).toBeDisabled()

  // テキスト内容
  await expect(page.locator('h1')).toHaveText('Example Domain')
  await expect(page.locator('h1')).toContainText('Example')

  // 属性
  await expect(page.locator('input')).toHaveAttribute('type', 'text')
  await expect(page.locator('input')).toHaveAttribute('placeholder', /Enter/)

  // 値
  await expect(page.locator('input')).toHaveValue('default value')

  // カウント
  await expect(page.locator('li')).toHaveCount(5)

  // クラス
  await expect(page.locator('button')).toHaveClass('btn-primary')
  await expect(page.locator('button')).toHaveClass(/btn-/)

  // CSS
  await expect(page.locator('h1')).toHaveCSS('color', 'rgb(0, 0, 0)')

  // スクリーンショット（ビジュアルリグレッション）
  await expect(page).toHaveScreenshot('homepage.png')
  await expect(page.locator('.hero')).toHaveScreenshot('hero-section.png')
})
```

## ページオブジェクトモデル

### 基本的なページオブジェクト

```typescript
// pages/login.page.ts

import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly usernameInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.usernameInput = page.getByLabel('Username')
    this.passwordInput = page.getByLabel('Password')
    this.submitButton = page.getByRole('button', { name: 'Sign in' })
    this.errorMessage = page.getByTestId('error-message')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent()
  }
}
```

```typescript
// tests/login.spec.ts

import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'

test('successful login', async ({ page }) => {
  const loginPage = new LoginPage(page)

  await loginPage.goto()
  await loginPage.login('testuser', 'password123')

  await expect(page).toHaveURL('/dashboard')
})

test('login with invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page)

  await loginPage.goto()
  await loginPage.login('invalid', 'wrong')

  const error = await loginPage.getErrorMessage()
  expect(error).toContain('Invalid credentials')
})
```

### 再利用可能なコンポーネント

```typescript
// components/navbar.component.ts

import { Page, Locator } from '@playwright/test'

export class NavbarComponent {
  readonly page: Page
  readonly homeLink: Locator
  readonly profileLink: Locator
  readonly logoutButton: Locator
  readonly searchInput: Locator

  constructor(page: Page) {
    this.page = page
    const navbar = page.locator('nav[data-testid="navbar"]')
    this.homeLink = navbar.getByRole('link', { name: 'Home' })
    this.profileLink = navbar.getByRole('link', { name: 'Profile' })
    this.logoutButton = navbar.getByRole('button', { name: 'Logout' })
    this.searchInput = navbar.getByPlaceholder('Search...')
  }

  async goToHome() {
    await this.homeLink.click()
  }

  async goToProfile() {
    await this.profileLink.click()
  }

  async logout() {
    await this.logoutButton.click()
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.searchInput.press('Enter')
  }
}
```

### 継承を使ったページオブジェクト

```typescript
// pages/base.page.ts

import { Page } from '@playwright/test'
import { NavbarComponent } from '../components/navbar.component'

export class BasePage {
  readonly page: Page
  readonly navbar: NavbarComponent

  constructor(page: Page) {
    this.page = page
    this.navbar = new NavbarComponent(page)
  }

  async goto(path: string) {
    await this.page.goto(path)
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }
}
```

```typescript
// pages/dashboard.page.ts

import { BasePage } from './base.page'
import { Page, Locator } from '@playwright/test'

export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator
  readonly statsCards: Locator

  constructor(page: Page) {
    super(page)
    this.welcomeMessage = page.getByTestId('welcome-message')
    this.statsCards = page.locator('.stat-card')
  }

  async goto() {
    await super.goto('/dashboard')
  }

  async getWelcomeMessage() {
    return await this.welcomeMessage.textContent()
  }

  async getStatsCount() {
    return await this.statsCards.count()
  }
}
```

## 高度なテクニック

### ネットワークリクエストのモック

```typescript
// tests/mock-api.spec.ts

import { test, expect } from '@playwright/test'

test('mock API response', async ({ page }) => {
  // APIレスポンスをモック
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]),
    })
  })

  await page.goto('/users')

  // モックデータが表示されることを確認
  await expect(page.getByText('Alice')).toBeVisible()
  await expect(page.getByText('Bob')).toBeVisible()
})

test('mock slow API', async ({ page }) => {
  // 遅延を追加
  await page.route('**/api/data', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ data: 'slow response' }),
    })
  })

  await page.goto('/data')

  // ローディング表示の確認
  await expect(page.getByText('Loading...')).toBeVisible()

  // データ表示の確認
  await expect(page.getByText('slow response')).toBeVisible()
})

test('mock API error', async ({ page }) => {
  // エラーレスポンス
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' }),
    })
  })

  await page.goto('/users')

  // エラーメッセージの確認
  await expect(page.getByText('Failed to load users')).toBeVisible()
})
```

### リクエストのインターセプト

```typescript
// tests/intercept.spec.ts

import { test, expect } from '@playwright/test'

test('modify request', async ({ page }) => {
  // リクエストを変更
  await page.route('**/api/users', async (route) => {
    const request = route.request()

    // ヘッダーを追加
    await route.continue({
      headers: {
        ...request.headers(),
        'X-Custom-Header': 'test-value',
      },
    })
  })

  await page.goto('/users')
})

test('abort requests', async ({ page }) => {
  // 画像とCSSをブロック（高速化）
  await page.route('**/*.{png,jpg,jpeg,css}', (route) => route.abort())

  await page.goto('/')
})

test('capture API response', async ({ page }) => {
  // レスポンスをキャプチャ
  const responsePromise = page.waitForResponse('**/api/users')

  await page.goto('/users')

  const response = await responsePromise
  const data = await response.json()

  expect(data).toHaveLength(10)
})
```

### ファイルアップロード/ダウンロード

```typescript
// tests/file-operations.spec.ts

import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

test('file upload', async ({ page }) => {
  await page.goto('/upload')

  // ファイル選択
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.join(__dirname, 'fixtures/sample.pdf'))

  // アップロードボタン
  await page.getByRole('button', { name: 'Upload' }).click()

  // 成功メッセージ
  await expect(page.getByText('File uploaded successfully')).toBeVisible()
})

test('multiple file upload', async ({ page }) => {
  await page.goto('/upload')

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles([
    path.join(__dirname, 'fixtures/file1.pdf'),
    path.join(__dirname, 'fixtures/file2.pdf'),
  ])

  await page.getByRole('button', { name: 'Upload' }).click()
})

test('file download', async ({ page }) => {
  await page.goto('/downloads')

  // ダウンロード待機
  const downloadPromise = page.waitForEvent('download')

  await page.getByRole('link', { name: 'Download PDF' }).click()

  const download = await downloadPromise

  // ファイル名確認
  expect(download.suggestedFilename()).toBe('document.pdf')

  // ファイルを保存
  const filePath = path.join(__dirname, 'downloads', download.suggestedFilename())
  await download.saveAs(filePath)

  // ファイルが存在することを確認
  expect(fs.existsSync(filePath)).toBeTruthy()
})
```

### 認証の保存/復元

```typescript
// tests/auth.setup.ts

import { test as setup } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('Username').fill('testuser')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForURL('/dashboard')

  // 認証状態を保存
  await page.context().storageState({ path: authFile })
})
```

```typescript
// playwright.config.ts

export default defineConfig({
  projects: [
    // 認証セットアップ
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // 認証済みテスト
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
  ],
})
```

```typescript
// tests/authenticated.spec.ts

import { test, expect } from '@playwright/test'

// 認証状態が自動的に復元される
test('access dashboard', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(page.getByText('Welcome back')).toBeVisible()
})
```

## ビジュアルリグレッションテスト

### スクリーンショット比較

```typescript
// tests/visual.spec.ts

import { test, expect } from '@playwright/test'

test('homepage visual test', async ({ page }) => {
  await page.goto('/')

  // ページ全体のスクリーンショット
  await expect(page).toHaveScreenshot('homepage.png')
})

test('component visual test', async ({ page }) => {
  await page.goto('/components')

  // 特定要素のスクリーンショット
  await expect(page.locator('.hero-section')).toHaveScreenshot('hero.png')
  await expect(page.locator('.features')).toHaveScreenshot('features.png')
})

test('visual test with options', async ({ page }) => {
  await page.goto('/')

  // オプション指定
  await expect(page).toHaveScreenshot('homepage-custom.png', {
    // 差分の許容範囲
    maxDiffPixels: 100,

    // 特定要素をマスク
    mask: [page.locator('.dynamic-content')],

    // アニメーションを無効化
    animations: 'disabled',

    // フルページスクリーンショット
    fullPage: true,
  })
})
```

```bash
# スクリーンショット生成（初回）
npx playwright test --update-snapshots

# ビジュアルテスト実行
npx playwright test visual.spec.ts

# 差分が出た場合、差分画像が生成される
# - homepage-actual.png
# - homepage-expected.png
# - homepage-diff.png
```

### 複数デバイスでのビジュアルテスト

```typescript
// tests/responsive-visual.spec.ts

import { test, expect, devices } from '@playwright/test'

const viewports = [
  { name: 'Desktop', ...devices['Desktop Chrome'] },
  { name: 'Tablet', ...devices['iPad Pro'] },
  { name: 'Mobile', ...devices['iPhone 13'] },
]

for (const viewport of viewports) {
  test(`visual test on ${viewport.name}`, async ({ browser }) => {
    const context = await browser.newContext(viewport)
    const page = await context.newPage()

    await page.goto('/')

    await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`)

    await context.close()
  })
}
```

## CI/CD統合

### GitHub Actions

```yaml
# .github/workflows/playwright.yml

name: Playwright Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### 並列実行（シャーディング）

```yaml
# .github/workflows/playwright-parallel.yml

name: Playwright Tests (Parallel)

on: push

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test --shard=${{ matrix.shard }}/4

      - name: Upload blob report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/
          retention-days: 1

  merge-reports:
    if: always()
    needs: [test]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

### Docker

```dockerfile
# Dockerfile

FROM mcr.microsoft.com/playwright:v1.42.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx playwright install

CMD ["npx", "playwright", "test"]
```

```yaml
# docker-compose.yml

version: '3.8'

services:
  playwright:
    build: .
    volumes:
      - ./tests:/app/tests
      - ./playwright-report:/app/playwright-report
    environment:
      - CI=true
```

## デバッグとトラブルシューティング

### デバッグモード

```bash
# Playwright Inspector（ステップ実行）
npx playwright test --debug

# 特定のテストのみデバッグ
npx playwright test example.spec.ts:10 --debug

# ブラウザを表示
npx playwright test --headed

# スローモーション
npx playwright test --headed --slow-mo=1000
```

### トレース

```typescript
// playwright.config.ts

export default defineConfig({
  use: {
    trace: 'on-first-retry', // 失敗時のみトレース
    // trace: 'on', // すべてのテストでトレース
  },
})
```

```bash
# トレースビューアー
npx playwright show-trace test-results/example-chromium/trace.zip
```

### コードジェネレーター

```bash
# コードジェネレーター起動
npx playwright codegen https://example.com

# 特定デバイスでコード生成
npx playwright codegen --device="iPhone 13" https://example.com

# 認証付きでコード生成
npx playwright codegen --load-storage=auth.json https://example.com
```

### よくある問題

```typescript
// tests/troubleshooting.spec.ts

import { test, expect } from '@playwright/test'

test('wait for element', async ({ page }) => {
  await page.goto('/')

  // 要素が表示されるまで待機
  await page.waitForSelector('.dynamic-element')

  // ネットワークが安定するまで待機
  await page.waitForLoadState('networkidle')

  // 特定のURLまで待機
  await page.waitForURL('**/dashboard')

  // カスタム条件で待機
  await page.waitForFunction(() => {
    return document.querySelectorAll('.item').length > 10
  })
})

test('handle timeouts', async ({ page }) => {
  // タイムアウト延長
  await page.goto('/', { timeout: 60000 })

  // 個別のアクションでタイムアウト指定
  await page.locator('button').click({ timeout: 5000 })
})

test('retry assertions', async ({ page }) => {
  await page.goto('/')

  // 自動リトライ（最大5秒）
  await expect(page.locator('.dynamic-text')).toHaveText('Expected Text', {
    timeout: 5000,
  })
})
```

## まとめ

Playwrightは、モダンなブラウザ自動化とE2Eテストのための強力なツールです。

**主な利点**
- マルチブラウザ対応（Chrome、Firefox、Safari）
- 高速・信頼性の高い自動待機
- TypeScript完全サポート
- 強力なデバッグ機能（トレース、タイムトラベル）
- CI/CD統合が容易

**適用場面**
- E2Eテスト自動化
- ブラウザ自動化スクリプト
- ビジュアルリグレッションテスト
- パフォーマンステスト

**ベストプラクティス**
- ページオブジェクトモデルを使用
- テストIDを使ったセレクター
- 認証状態の再利用
- 並列実行でテスト高速化

2026年現在、Playwrightは急速に普及しており、多くのプロジェクトでSeleniumからの移行が進んでいます。

**参考リンク**
- [Playwright公式ドキュメント](https://playwright.dev/)
- [Playwright GitHub](https://github.com/microsoft/playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
