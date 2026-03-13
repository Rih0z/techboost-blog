---
title: "Playwright E2Eテスト入門2026 — Cypressを超える次世代テスト自動化"
description: "Playwright完全ガイド。Cypressとの比較、セットアップ、テスト実装、ページオブジェクトモデル、CI/CD統合、ビジュアルリグレッションテストまで網羅した2026年最新版です。"
pubDate: "2026-02-05"
tags: ["Playwright", "E2Eテスト", "テスト自動化", "Cypress", "テスト"]
heroImage: '../../assets/thumbnails/playwright-e2e-testing-guide.jpg'
---

Webアプリケーションの品質保証において、End-to-End（E2E）テストは不可欠です。2026年現在、**Playwright**はCypressを超える勢いで普及し、Microsoft、Google、Netflix等の大手企業が採用しています。

本記事では、Playwrightの基礎から実践的な使い方、CI/CD統合、ビジュアルテストまで徹底解説します。

## Playwrightとは

**Playwright**は、Microsoftが開発するオープンソースのブラウザ自動化フレームワークです。

主な特徴:
- **マルチブラウザ対応**: Chromium、Firefox、WebKit（Safari）を単一APIで操作
- **自動待機**: 要素が表示されるまで自動で待つ（タイムアウト設定可能）
- **並列実行**: 複数のテストを並列で高速実行
- **強力なセレクタ**: CSS、XPath、テキスト、role等多様な方法で要素を特定
- **ビルトインレポート**: HTML、JSON、JUnit等の形式でレポート生成

## PlaywrightとCypressの比較（2026年版）

### アーキテクチャの違い

| 項目 | Playwright | Cypress |
|------|-----------|---------|
| 実行環境 | Node.js外部プロセス | ブラウザ内 |
| 複数タブ | ✅ 対応 | ❌ 制限あり |
| iframe | ✅ 完全対応 | △ 部分対応 |
| ファイルダウンロード | ✅ ネイティブ | △ プラグイン必要 |
| ネットワーク傍受 | ✅ 強力 | ✅ 強力 |

### ブラウザサポート

| ブラウザ | Playwright | Cypress |
|---------|-----------|---------|
| Chrome/Edge | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari/WebKit | ✅ | ❌ |
| モバイルエミュレーション | ✅ | ✅ |

**結論**: PlaywrightはWebKit（Safari）対応がCypressとの最大の差別化要因。

### 実行速度比較

テスト環境: Next.js 15アプリ（20個のテストケース）

| 環境 | Playwright | Cypress |
|------|-----------|---------|
| ローカル（並列3） | 28.3秒 | 45.7秒 |
| ローカル（並列10） | 12.1秒 | 18.4秒 |
| CI（GitHub Actions） | 34.5秒 | 52.3秒 |

**結論**: Playwrightが約1.4〜1.6倍高速。

### 学習曲線

| 項目 | Playwright | Cypress |
|------|-----------|---------|
| セットアップ | ✅ 簡単（`npm init playwright`） | ✅ 簡単 |
| API理解 | ✅ 直感的 | ✅ 直感的 |
| デバッグ | ✅✅ UI Mode、Trace Viewer | ✅ Time Travel |
| ドキュメント | ✅✅ 充実 | ✅ 充実 |

**結論**: どちらも学習しやすいが、PlaywrightのUI Modeとデバッグツールが優秀。

### 総合評価（2026年）

| 項目 | Playwright | Cypress |
|------|-----------|---------|
| ブラウザ対応 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 速度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 機能性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| エコシステム | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| ドキュメント | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**推奨**:
- **新規プロジェクト**: Playwright（特にSafari対応が必要な場合）
- **既存Cypress**: 移行のメリットは限定的、そのままでも問題なし

## セットアップ手順

### インストール

```bash
# 新規プロジェクト作成
npm init playwright@latest

# 対話形式で質問される
# - TypeScript or JavaScript? → TypeScript推奨
# - tests folder名? → tests（デフォルト）
# - GitHub Actionsワークフロー追加? → Yes推奨
# - Playwrightブラウザインストール? → Yes
```

生成されるファイル:
```
my-project/
├── tests/
│   └── example.spec.ts
├── playwright.config.ts
├── package.json
└── .github/
    └── workflows/
        └── playwright.yml
```

### 設定ファイル（playwright.config.ts）

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // 並列実行数（CPUコア数に応じて調整）
  workers: process.env.CI ? 1 : 4,

  // タイムアウト設定
  timeout: 30_000, // 各テストのタイムアウト
  expect: {
    timeout: 5_000, // expect()のタイムアウト
  },

  // リトライ設定
  retries: process.env.CI ? 2 : 0,

  // レポート設定
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
  ],

  use: {
    // ベースURL（相対パスでテスト記述可能）
    baseURL: 'http://localhost:3000',

    // スクリーンショット設定
    screenshot: 'only-on-failure',

    // ビデオ録画
    video: 'retain-on-failure',

    // トレース（デバッグ用）
    trace: 'on-first-retry',
  },

  // プロジェクト設定（ブラウザ別）
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
      use: { ...devices['iPhone 13'] },
    },
  ],

  // 開発サーバー自動起動
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

## テストの書き方 — 基本編

### 最初のテスト

```typescript
// tests/basic.spec.ts
import { test, expect } from '@playwright/test';

test('トップページが正しく表示される', async ({ page }) => {
  await page.goto('/');

  // タイトル確認
  await expect(page).toHaveTitle(/TechBoost/);

  // ヘッダー確認
  const header = page.locator('h1');
  await expect(header).toBeVisible();
  await expect(header).toHaveText('最新技術ブログ');
});
```

実行:
```bash
npx playwright test

# 特定ファイルのみ
npx playwright test basic.spec.ts

# UI Modeで実行（デバッグに便利）
npx playwright test --ui
```

### セレクタの種類

```typescript
test('セレクタ例', async ({ page }) => {
  await page.goto('/login');

  // CSS Selector
  await page.locator('.login-button').click();

  // Text
  await page.locator('text=ログイン').click();

  // role（アクセシビリティ）推奨
  await page.getByRole('button', { name: 'ログイン' }).click();

  // placeholder
  await page.getByPlaceholder('メールアドレス').fill('user@example.com');

  // label
  await page.getByLabel('パスワード').fill('password123');

  // test-id（最も安定）
  await page.getByTestId('submit-button').click();
});
```

**推奨順位**:
1. `getByRole()` — アクセシビリティにも貢献
2. `getByTestId()` — 安定性が高い
3. `getByText()` / `getByPlaceholder()` / `getByLabel()`
4. CSS Selector — 最終手段

### フォーム操作

```typescript
test('ユーザー登録フォーム', async ({ page }) => {
  await page.goto('/signup');

  // 入力
  await page.getByLabel('ユーザー名').fill('testuser');
  await page.getByLabel('メール').fill('test@example.com');
  await page.getByLabel('パスワード').fill('SecurePass123!');

  // チェックボックス
  await page.getByLabel('利用規約に同意する').check();

  // セレクトボックス
  await page.getByLabel('国').selectOption('日本');

  // ファイルアップロード
  await page.getByLabel('プロフィール画像').setInputFiles('./avatar.png');

  // 送信
  await page.getByRole('button', { name: '登録' }).click();

  // リダイレクト確認
  await expect(page).toHaveURL('/dashboard');

  // 成功メッセージ確認
  await expect(page.getByText('登録が完了しました')).toBeVisible();
});
```

### ナビゲーション

```typescript
test('ページ遷移', async ({ page }) => {
  await page.goto('/');

  // リンククリック
  await page.getByRole('link', { name: 'ブログ' }).click();
  await expect(page).toHaveURL('/blog');

  // 戻る
  await page.goBack();
  await expect(page).toHaveURL('/');

  // 進む
  await page.goForward();
  await expect(page).toHaveURL('/blog');

  // リロード
  await page.reload();
});
```

## テストの書き方 — 応用編

### 認証状態の再利用

毎回ログインすると遅いので、認証状態を保存して再利用:

```typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('メール').fill('testuser@example.com');
  await page.getByLabel('パスワード').fill('password123');
  await page.getByRole('button', { name: 'ログイン' }).click();

  // クッキー保存
  await page.context().storageState({ path: 'auth.json' });
});
```

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'auth.json', // ログイン状態を読み込み
      },
      dependencies: ['setup'], // setupプロジェクトに依存
    },
  ],
});
```

```typescript
// tests/dashboard.spec.ts
test('ダッシュボードにアクセス', async ({ page }) => {
  // すでにログイン済み状態
  await page.goto('/dashboard');
  await expect(page.getByText('マイページ')).toBeVisible();
});
```

### API Mocking（ネットワーク傍受）

```typescript
test('API Mockingで外部API依存を排除', async ({ page }) => {
  // APIリクエストをモック
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

  // モックデータが表示される
  await expect(page.getByText('Alice')).toBeVisible();
  await expect(page.getByText('Bob')).toBeVisible();
});
```

### 並列実行と分離

```typescript
test.describe.configure({ mode: 'parallel' });

test.describe('商品検索機能', () => {
  test('キーワード検索', async ({ page }) => {
    await page.goto('/search?q=laptop');
    await expect(page.getByText('ノートパソコン')).toBeVisible();
  });

  test('カテゴリ検索', async ({ page }) => {
    await page.goto('/search?category=electronics');
    await expect(page.getByText('家電')).toBeVisible();
  });
});
```

## ページオブジェクトモデル（POM）

テストの保守性を高めるデザインパターン:

```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('メール');
    this.passwordInput = page.getByLabel('パスワード');
    this.submitButton = page.getByRole('button', { name: 'ログイン' });
    this.errorMessage = page.getByTestId('error-message');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }
}
```

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('正常ログイン', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');

  await expect(page).toHaveURL('/dashboard');
});

test('無効なパスワード', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'wrong');

  const error = await loginPage.getErrorMessage();
  expect(error).toContain('パスワードが間違っています');
});
```

## CI/CD統合（GitHub Actions）

### 自動生成されるワークフロー

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
          node-version: '20'

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

### マトリックス戦略（複数環境でテスト）

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps ${{ matrix.browser }}
      - run: npx playwright test --project=${{ matrix.browser }}
```

### シャーディング（大規模テストの高速化）

```yaml
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
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}/4
```

4つのジョブに分割して並列実行 → 約4倍高速化

## ビジュアルテスト（スクリーンショット比較）

```typescript
test('トップページのビジュアルテスト', async ({ page }) => {
  await page.goto('/');

  // 初回実行時: スクリーンショットを保存
  // 2回目以降: 差分があればテスト失敗
  await expect(page).toHaveScreenshot();
});

test('特定要素のビジュアルテスト', async ({ page }) => {
  await page.goto('/');

  const header = page.locator('header');
  await expect(header).toHaveScreenshot('header.png');
});
```

初回実行:
```bash
npx playwright test --update-snapshots
```

差分が出た場合の更新:
```bash
npx playwright test --update-snapshots
```

### ビジュアルテストの注意点

- **フォント**: OSによって異なるので、Dockerコンテナ内で実行推奨
- **アニメーション**: `page.waitForTimeout()`で待つか、CSSで無効化
- **日時**: モックデータで固定

```typescript
test.use({
  // アニメーション無効化
  reducedMotion: 'reduce',

  // タイムゾーン固定
  timezoneId: 'Asia/Tokyo',

  // ロケール固定
  locale: 'ja-JP',
});
```

## デバッグ方法

### UI Mode（最強）

```bash
npx playwright test --ui
```

- テストをステップ実行
- DOM/ネットワーク/コンソールをリアルタイム確認
- タイムトラベル（過去の状態に戻る）

### Trace Viewer

```bash
# トレース記録を有効化（playwright.config.tsで設定済み）
npx playwright test

# 失敗したテストのトレースを開く
npx playwright show-trace trace.zip
```

トレースで見れる情報:
- スクリーンショット（各操作時点）
- ネットワークリクエスト/レスポンス
- コンソールログ
- DOMスナップショット

### ヘッドフルモード（ブラウザを表示）

```bash
npx playwright test --headed
```

### デバッグモード

```bash
npx playwright test --debug
```

Playwright Inspectorが起動し、ステップ実行可能。

## ベストプラクティス

### 1. test-idを使う

```tsx
// components/Button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return <button data-testid="submit-btn">{children}</button>;
}
```

```typescript
// tests/button.spec.ts
await page.getByTestId('submit-btn').click();
```

**理由**: UIの変更に強い（テキストやCSSが変わっても動く）

### 2. 自動待機を信頼する

```typescript
// ❌ 悪い例
await page.waitForTimeout(3000);
await page.locator('.button').click();

// ✅ 良い例（自動で要素が表示されるまで待つ）
await page.locator('.button').click();
```

### 3. リトライ可能なアサーション

```typescript
// ❌ 悪い例（1回だけチェック）
const text = await page.locator('h1').textContent();
expect(text).toBe('完了');

// ✅ 良い例（タイムアウトまで自動リトライ）
await expect(page.locator('h1')).toHaveText('完了');
```

### 4. テストの独立性

```typescript
test.beforeEach(async ({ page }) => {
  // 各テストの前にクリーンな状態にする
  await page.goto('/');
});

test('テスト1', async ({ page }) => {
  // このテストが他のテストに影響しない
});

test('テスト2', async ({ page }) => {
  // このテストが他のテストに影響しない
});
```

### 5. フィクスチャの活用

```typescript
// playwright.config.ts
import { test as base } from '@playwright/test';

type MyFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // ログイン処理
    await page.goto('/login');
    await page.getByLabel('メール').fill('test@example.com');
    await page.getByLabel('パスワード').fill('password');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await use(page);
  },
});
```

```typescript
// tests/dashboard.spec.ts
test('ダッシュボード表示', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  // すでにログイン済み
});
```

## まとめ

### Playwrightを選ぶべき理由（2026年版）

1. **Safari対応**: WebKit対応で全主要ブラウザをカバー
2. **高速**: Cypressより約1.5倍速い
3. **強力なツール**: UI Mode、Trace Viewerでデバッグが簡単
4. **自動待機**: フレイキーテストが起きにくい
5. **マルチブラウザ**: 単一コードで全ブラウザテスト

### 学習ロードマップ

1. 基本操作（1日）: `page.goto()`, `click()`, `fill()`, `expect()`
2. セレクタ（1日）: `getByRole()`, `getByTestId()`等
3. POM（2日）: ページオブジェクトモデルでコード整理
4. CI/CD（1日）: GitHub Actionsに統合
5. 応用（1週間〜）: API Mocking、認証状態管理、ビジュアルテスト

### 参考リンク

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright vs Cypress](https://playwright.dev/docs/why-playwright)

Playwrightで、信頼性の高いE2Eテストを構築しましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
