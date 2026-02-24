---
title: 'Playwright完全ガイド — E2Eテスト・クロスブラウザ・Visual Regression・CI/CD統合'
description: 'PlaywrightでE2Eテストを構築する完全ガイド。ページオブジェクトモデル・APIモッキング・認証状態保存・Visual Regression・パラレルテスト・GitHub Actions統合まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['Playwright', 'E2Eテスト', 'TypeScript', 'テスト', 'CI/CD']
---

現代のWebアプリケーション開発において、E2E（End-to-End）テストは品質保証の最後の砦として欠かせない存在だ。ユニットテストや統合テストでは検出できない、実際のブラウザ上での動作・ユーザーフローの問題を洗い出すことができる。

そのE2Eテストの世界で近年急速にシェアを伸ばしているのが **Playwright** だ。MicrosoftがオープンソースとしてリリースしたPlaywrightは、クロスブラウザ対応・高速実行・豊富な機能を兼ね備え、CypressやPuppeteerに代わる選択肢として多くのチームで採用されている。

本記事では、Playwrightの基本から応用まで、実際のコードを交えながら徹底解説する。TypeScriptによる型安全な実装、ページオブジェクトモデルによる保守性向上、CI/CD統合まで、プロダクション品質のE2Eテスト環境を構築するための知識をすべて網羅する。

---

## 1. Playwrightとは — Cypress・Puppeteerとの比較

### Playwrightの概要

Playwrightは2020年にMicrosoftがリリースしたNode.js製のE2Eテストフレームワークだ。Chromium・Firefox・WebKitの3エンジンをサポートし、単一のAPIで複数ブラウザのテストを実行できる。

元々Puppeteerの開発チームが中心となって作られたため、APIの設計思想に共通点がある一方、E2Eテストに特化した多数の機能が追加されている。

### Cypress との比較

| 項目 | Playwright | Cypress |
|------|-----------|---------|
| **ブラウザサポート** | Chromium / Firefox / WebKit (Safari) | Chrome系 / Firefox（限定的） |
| **言語** | JS / TS / Python / Java / C# | JS / TS |
| **並列実行** | ネイティブサポート | 有料プランが必要 |
| **iframeサポート** | 完全サポート | 制限あり |
| **ネットワーク制御** | 強力なAPIモッキング | 基本的なインターセプト |
| **実行速度** | 高速（並列・シャーディング） | 中速 |
| **デバッグツール** | Trace Viewer・Playwright Inspector | Cypress Studio |
| **モバイルエミュレーション** | デバイスプリセット豊富 | 限定的 |
| **料金** | 完全無料OSS | 基本無料、CI高度機能は有料 |

Cypressは長年E2Eテストのデファクトスタンダードだったが、Playwrightはクロスブラウザ対応と並列実行の強みで大規模プロジェクトに特に適している。

### Puppeteer との比較

PuppeteerはGoogle製のChrome/Chromium操作ライブラリだ。スクレイピングやPDF生成にも使われるが、テストフレームワークとしての機能は最小限だ。

Playwrightは以下の点でPuppeteerより優れている。

- **マルチブラウザ**: ChromiumだけでなくFirefox・WebKitも対応
- **テスト機能**: アサーション・テストランナー・レポーターが組み込み
- **自動待機**: 要素が操作可能になるまで自動的に待つ（Puppeteerは手動sleep）
- **コンテキスト分離**: テストごとに独立したブラウザコンテキストを使用

---

## 2. インストール・設定

### インストール

```bash
# 新規プロジェクトに追加
npm init playwright@latest

# 既存プロジェクトに追加
npm install -D @playwright/test

# ブラウザをインストール
npx playwright install

# 特定のブラウザのみ
npx playwright install chromium firefox
```

`npm init playwright@latest` を実行すると対話形式でセットアップが進む。TypeScriptの使用・テストディレクトリ・GitHub Actionsファイルの生成を選択できる。

### playwright.config.ts の詳細設定

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // テストファイルのパターン
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  // テスト全体のタイムアウト（ms）
  timeout: 30_000,

  // expect() のタイムアウト
  expect: {
    timeout: 5_000,
  },

  // テスト失敗時のスクリーンショット
  use: {
    // ベースURL（page.goto('/') で利用可能）
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // ブラウザトレースを最初のリトライ時に記録
    trace: 'on-first-retry',

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // ビデオ録画（失敗時のみ）
    video: 'on-first-retry',

    // ヘッドレスモード（CIでは true）
    headless: !!process.env.CI,

    // ビューポート
    viewport: { width: 1280, height: 720 },

    // ロケールとタイムゾーン
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',

    // HTTPSの自動リダイレクトを無効化
    ignoreHTTPSErrors: true,
  },

  // テスト実行後のローカルサーバー起動
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  // 並列実行の設定
  workers: process.env.CI ? 2 : undefined,
  fullyParallel: true,

  // リトライ回数（CIでは2回）
  retries: process.env.CI ? 2 : 0,

  // レポーター設定
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github'] as ['github']] : []),
  ],

  // プロジェクト（ブラウザ）設定
  projects: [
    // デスクトップブラウザ
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

    // モバイルデバイス
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },

    // 認証が必要なテスト（後述のstorageState利用）
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
  ],
});
```

---

## 3. 基本操作

### ページ操作の基本

```typescript
// tests/basic.spec.ts
import { test, expect } from '@playwright/test';

test.describe('基本操作のデモ', () => {
  test('ページ遷移と基本操作', async ({ page }) => {
    // ページに移動（baseURL + パス）
    await page.goto('/');

    // フルURLで移動
    await page.goto('https://example.com');

    // 前のページに戻る
    await page.goBack();

    // 現在のURLを確認
    expect(page.url()).toContain('example.com');
  });

  test('クリックと入力', async ({ page }) => {
    await page.goto('/login');

    // メールアドレス入力
    await page.fill('[name="email"]', 'test@example.com');

    // パスワード入力
    await page.fill('[name="password"]', 'password123');

    // キーボード操作
    await page.press('[name="password"]', 'Enter');

    // またはボタンクリック
    await page.click('button[type="submit"]');

    // ダブルクリック
    await page.dblclick('.item');

    // 右クリック
    await page.click('.menu', { button: 'right' });

    // シフトクリック
    await page.click('.checkbox', { modifiers: ['Shift'] });
  });

  test('テキスト入力の制御', async ({ page }) => {
    await page.goto('/form');

    // 入力フィールドをクリアしてから入力
    await page.locator('#search').clear();
    await page.locator('#search').fill('検索ワード');

    // 文字を1文字ずつ入力（リアルなキーボード操作）
    await page.locator('#slow-input').pressSequentially('Hello', { delay: 100 });

    // テキストエリアへの入力
    await page.locator('textarea').fill('複数行の\nテキスト\n入力');

    // セレクトボックス
    await page.selectOption('select[name="prefecture"]', '東京都');
    await page.selectOption('select[name="tags"]', ['react', 'typescript']);

    // チェックボックス
    await page.check('#agree-checkbox');
    await page.uncheck('#newsletter-checkbox');

    // ファイルアップロード
    await page.setInputFiles('input[type="file"]', 'path/to/file.pdf');
  });

  test('スクロールとホバー', async ({ page }) => {
    await page.goto('/long-page');

    // 要素が見えるようにスクロール
    await page.locator('.target-element').scrollIntoViewIfNeeded();

    // ページ最下部へスクロール
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // ホバー
    await page.hover('.dropdown-trigger');
    await expect(page.locator('.dropdown-menu')).toBeVisible();

    // 要素をドラッグ&ドロップ
    await page.dragAndDrop('#source', '#target');
  });

  test('アサーション（検証）', async ({ page }) => {
    await page.goto('/products');

    // テキストの検証
    await expect(page.locator('h1')).toHaveText('商品一覧');
    await expect(page.locator('.subtitle')).toContainText('全');

    // 要素の存在・表示確認
    await expect(page.locator('.product-card')).toBeVisible();
    await expect(page.locator('.loading-spinner')).toBeHidden();

    // 要素数の確認
    await expect(page.locator('.product-card')).toHaveCount(12);

    // 属性の確認
    await expect(page.locator('a.cta')).toHaveAttribute('href', '/checkout');

    // CSSクラスの確認
    await expect(page.locator('.button')).toHaveClass(/active/);

    // 入力値の確認
    await expect(page.locator('#email')).toHaveValue('test@example.com');

    // チェックボックスの確認
    await expect(page.locator('#agree')).toBeChecked();

    // URLの確認
    await expect(page).toHaveURL('/products');
    await expect(page).toHaveURL(/\/products/);

    // タイトルの確認
    await expect(page).toHaveTitle('商品一覧 | MyShop');
  });
});
```

---

## 4. ロケーター — 要素の選択戦略

Playwrightはアクセシビリティを考慮したロケーターを推奨している。`data-testid` も有効だが、まずロールや表示テキストを使うことがベストプラクティスだ。

```typescript
// tests/locators.spec.ts
import { test, expect } from '@playwright/test';

test.describe('ロケーターの使い方', () => {
  test('推奨ロケーター（アクセシビリティベース）', async ({ page }) => {
    await page.goto('/');

    // ARIAロールで取得（最も推奨）
    await page.getByRole('button', { name: '送信' }).click();
    await page.getByRole('link', { name: 'ホーム' }).click();
    await page.getByRole('textbox', { name: 'メールアドレス' }).fill('test@example.com');
    await page.getByRole('heading', { name: '商品一覧' }).isVisible();
    await page.getByRole('checkbox', { name: '利用規約に同意' }).check();
    await page.getByRole('combobox', { name: '都道府県' }).selectOption('東京都');

    // テキストで取得
    await page.getByText('ログイン').click();
    await page.getByText('ログイン', { exact: true }).click(); // 完全一致

    // ラベルで取得（フォーム要素）
    await page.getByLabel('メールアドレス').fill('user@example.com');

    // プレースホルダーで取得
    await page.getByPlaceholder('検索キーワードを入力').fill('TypeScript');

    // altテキストで取得（画像）
    await page.getByAltText('会社ロゴ').isVisible();

    // タイトルで取得
    await page.getByTitle('削除する').click();

    // data-testid で取得（テスト専用属性）
    await page.getByTestId('submit-button').click();
    await page.getByTestId('product-card').first().click();
  });

  test('CSSセレクターとXPath', async ({ page }) => {
    await page.goto('/');

    // CSSセレクター
    await page.locator('#main-content').isVisible();
    await page.locator('.nav-item.active').click();
    await page.locator('button[data-variant="primary"]').click();
    await page.locator('input[type="email"]').fill('test@example.com');

    // XPath（必要な場合のみ使用）
    await page.locator('xpath=//button[contains(@class, "primary")]').click();

    // テキストフィルター付きCSS
    await page.locator('li:has-text("TypeScript")').click();

    // :has() 擬似クラス（内部要素でフィルター）
    await page.locator('.product-card:has(.badge-sale)').first().click();
  });

  test('ロケーターの絞り込みとチェーン', async ({ page }) => {
    await page.goto('/products');

    // .filter() で絞り込み
    const saleItems = page.locator('.product-card').filter({
      hasText: 'セール',
    });
    await expect(saleItems).toHaveCount(3);

    // .filter() にロケーターを使用
    const itemsWithBadge = page.locator('.product-card').filter({
      has: page.locator('.badge'),
    });

    // nth() で特定インデックス
    await itemsWithBadge.nth(0).click();

    // first() / last()
    await page.locator('.product-card').first().getByRole('button', { name: 'カートに追加' }).click();

    // ロケーターのチェーン（スコープを絞る）
    const productCard = page.locator('.product-card').first();
    await productCard.getByRole('heading').textContent();
    await productCard.getByRole('button', { name: 'カートに追加' }).click();

    // 複数要素のループ処理
    const cards = page.locator('.product-card');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const title = await cards.nth(i).getByRole('heading').textContent();
      console.log(`商品 ${i + 1}: ${title}`);
    }

    // allTextContents() で全テキスト取得
    const titles = await page.locator('.product-title').allTextContents();
    expect(titles.length).toBeGreaterThan(0);
  });

  test('data-testid の設定方法', async ({ page }) => {
    // HTML側: <button data-testid="add-to-cart-btn">カートに追加</button>
    // playwright.config.ts で testIdAttribute を変更可能
    // use: { testIdAttribute: 'data-cy' } // Cypressからの移行時など

    await page.goto('/');
    const addBtn = page.getByTestId('add-to-cart-btn');
    await addBtn.click();
  });
});
```

---

## 5. ページオブジェクトモデル（POM）

大規模なテストスイートでは、同じUIの操作コードが各テストファイルに散らばりがちだ。ページオブジェクトモデル（POM）はUIの操作をクラスにカプセル化し、保守性を大幅に向上させる。

```typescript
// tests/pages/LoginPage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // ロケーターをプロパティとして定義
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('メールアドレス');
    this.passwordInput = page.getByLabel('パスワード');
    this.submitButton = page.getByRole('button', { name: 'ログイン' });
    this.errorMessage = page.getByRole('alert');
    this.forgotPasswordLink = page.getByRole('link', { name: 'パスワードを忘れた方' });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async expectLoginSuccess() {
    // ログイン成功後はダッシュボードへリダイレクト
    await expect(this.page).toHaveURL('/dashboard');
  }
}
```

```typescript
// tests/pages/ProductListPage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class ProductListPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly productCards: Locator;
  readonly sortSelect: Locator;
  readonly filterPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('searchbox');
    this.searchButton = page.getByRole('button', { name: '検索' });
    this.productCards = page.locator('[data-testid="product-card"]');
    this.sortSelect = page.getByLabel('並び替え');
    this.filterPanel = page.locator('[data-testid="filter-panel"]');
  }

  async goto() {
    await this.page.goto('/products');
    await expect(this.page).toHaveURL('/products');
  }

  async search(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.searchButton.click();
    // 検索結果の読み込みを待つ
    await this.page.waitForLoadState('networkidle');
  }

  async sortBy(option: '価格が安い順' | '価格が高い順' | '新着順' | '人気順') {
    await this.sortSelect.selectOption(option);
    await this.page.waitForLoadState('networkidle');
  }

  async getProductCount(): Promise<number> {
    return await this.productCards.count();
  }

  async clickProduct(index: number) {
    await this.productCards.nth(index).click();
  }

  async addToCart(productName: string) {
    const card = this.productCards.filter({ hasText: productName });
    await card.getByRole('button', { name: 'カートに追加' }).click();
  }

  async expectProductsLoaded() {
    await expect(this.productCards.first()).toBeVisible();
  }
}
```

```typescript
// tests/pages/CartPage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly cartItems: Locator;
  readonly totalPrice: Locator;
  readonly checkoutButton: Locator;
  readonly emptyMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartItems = page.locator('[data-testid="cart-item"]');
    this.totalPrice = page.locator('[data-testid="total-price"]');
    this.checkoutButton = page.getByRole('button', { name: '購入手続きへ' });
    this.emptyMessage = page.getByText('カートに商品がありません');
  }

  async goto() {
    await this.page.goto('/cart');
  }

  async removeItem(index: number) {
    await this.cartItems.nth(index).getByRole('button', { name: '削除' }).click();
  }

  async updateQuantity(index: number, quantity: number) {
    const qtyInput = this.cartItems.nth(index).getByRole('spinbutton');
    await qtyInput.clear();
    await qtyInput.fill(String(quantity));
    await qtyInput.press('Enter');
  }

  async getTotalPriceText(): Promise<string> {
    return (await this.totalPrice.textContent()) ?? '';
  }

  async proceedToCheckout() {
    await this.checkoutButton.click();
    await expect(this.page).toHaveURL('/checkout');
  }
}
```

```typescript
// tests/e2e/shopping-flow.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProductListPage } from '../pages/ProductListPage';
import { CartPage } from '../pages/CartPage';

test.describe('購入フロー E2Eテスト', () => {
  test('商品を検索してカートに追加し購入', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const productList = new ProductListPage(page);
    const cartPage = new CartPage(page);

    // ログイン
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    await loginPage.expectLoginSuccess();

    // 商品検索
    await productList.goto();
    await productList.search('TypeScript');
    await productList.expectProductsLoaded();
    await productList.sortBy('価格が安い順');

    // カートに追加
    await productList.addToCart('TypeScript実践入門');

    // カート確認
    await cartPage.goto();
    await expect(cartPage.cartItems).toHaveCount(1);

    // 購入手続き
    await cartPage.proceedToCheckout();
  });

  test('ログイン失敗のエラー表示', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('wrong@example.com', 'wrongpass');
    await loginPage.expectError('メールアドレスまたはパスワードが正しくありません');
  });
});
```

---

## 6. APIモッキング

実際のAPIを呼び出さずにテストを高速化・安定化したい場合、Playwrightのネットワークインターセプト機能が強力だ。

```typescript
// tests/api-mocking.spec.ts
import { test, expect } from '@playwright/test';

test.describe('APIモッキング', () => {
  test('APIレスポンスをモックする', async ({ page }) => {
    // APIリクエストをインターセプトしてモックレスポンスを返す
    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          products: [
            { id: 1, name: 'TypeScript実践入門', price: 2980, inStock: true },
            { id: 2, name: 'Next.js完全ガイド', price: 3500, inStock: false },
          ],
          total: 2,
        }),
      });
    });

    await page.goto('/products');
    await expect(page.locator('.product-card')).toHaveCount(2);
    await expect(page.getByText('TypeScript実践入門')).toBeVisible();
  });

  test('エラーレスポンスのテスト', async ({ page }) => {
    // 500エラーをシミュレート
    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/products');
    // エラーメッセージの表示を確認
    await expect(page.getByRole('alert')).toContainText('エラーが発生しました');
  });

  test('ネットワークエラーのシミュレート', async ({ page }) => {
    // ネットワーク接続エラー
    await page.route('**/api/products', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/products');
    await expect(page.getByText('接続に失敗しました')).toBeVisible();
  });

  test('レスポンスの遅延をシミュレート', async ({ page }) => {
    await page.route('**/api/products', async (route) => {
      // 3秒の遅延を追加
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ products: [] }),
      });
    });

    await page.goto('/products');
    // ローディングスピナーが表示されることを確認
    await expect(page.locator('.loading-spinner')).toBeVisible();
  });

  test('実際のAPIレスポンスを取得してから変更する', async ({ page }) => {
    await page.route('**/api/products', async (route) => {
      // まず実際のAPIを呼び出す
      const response = await route.fetch();
      const json = await response.json();

      // レスポンスを変更して返す
      json.products = json.products.map((p: any) => ({
        ...p,
        price: Math.round(p.price * 0.9), // 10%割引に変更
      }));

      await route.fulfill({ response, json });
    });

    await page.goto('/products');
  });

  test('特定のAPIリクエストを待つ', async ({ page }) => {
    // リクエストを待つPromiseを事前に作成
    const productsRequest = page.waitForRequest('**/api/products');
    const productsResponse = page.waitForResponse('**/api/products');

    await page.goto('/products');

    // リクエストを待つ
    const request = await productsRequest;
    expect(request.method()).toBe('GET');

    // レスポンスを待つ
    const response = await productsResponse;
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('products');
  });

  test('リクエストヘッダーの検証', async ({ page }) => {
    let capturedHeaders: Record<string, string> = {};

    await page.route('**/api/protected', async (route) => {
      capturedHeaders = route.request().headers();
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: 'secret' }),
      });
    });

    await page.goto('/protected');
    expect(capturedHeaders['authorization']).toMatch(/^Bearer /);
  });
});
```

---

## 7. 認証状態の保存と再利用（storageState）

毎回ログイン操作を繰り返すと、テストが遅くなり不安定になる。Playwrightの `storageState` を使えば、認証済みの状態を保存して再利用できる。

```typescript
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('認証状態を保存', async ({ page }) => {
  // ログインページに移動
  await page.goto('/login');

  // ログイン操作
  await page.getByLabel('メールアドレス').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('パスワード').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'ログイン' }).click();

  // ログイン成功を確認
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('navigation')).toContainText('マイアカウント');

  // 認証状態（Cookie・LocalStorage・SessionStorage）を保存
  await page.context().storageState({ path: authFile });
});
```

```typescript
// playwright.config.ts（認証プロジェクト設定）
projects: [
  // まずセットアッププロジェクトを実行
  {
    name: 'setup',
    testMatch: '**/auth.setup.ts',
  },

  // 認証済みプロジェクト（setupに依存）
  {
    name: 'authenticated-chrome',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/user.json',
    },
    dependencies: ['setup'],
  },

  // 未認証プロジェクト（公開ページのテスト）
  {
    name: 'unauthenticated',
    testMatch: '**/public/**/*.spec.ts',
  },
],
```

```typescript
// tests/authenticated/dashboard.spec.ts
// このファイルは自動的に認証済み状態で実行される
import { test, expect } from '@playwright/test';

test.describe('ダッシュボード（認証済み）', () => {
  test('ダッシュボードの基本表示', async ({ page }) => {
    // storageState が適用されているのでログイン不要
    await page.goto('/dashboard');

    // 認証が必要なコンテンツを確認
    await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('プロフィール編集', async ({ page }) => {
    await page.goto('/profile');

    await page.getByLabel('表示名').fill('テストユーザー更新');
    await page.getByRole('button', { name: '保存' }).click();

    await expect(page.getByRole('alert')).toContainText('プロフィールを更新しました');
  });
});
```

```typescript
// 複数ユーザーロールのテスト
// tests/auth.setup.ts（管理者ロールも保存）
const adminAuthFile = path.join(__dirname, '../playwright/.auth/admin.json');

setup('管理者認証状態を保存', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('メールアドレス').fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel('パスワード').fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: '管理者ログイン' }).click();
  await expect(page).toHaveURL('/admin/dashboard');
  await page.context().storageState({ path: adminAuthFile });
});
```

---

## 8. Visual Regression Testing

見た目の変化（CSSの崩れ・レイアウト崩壊）を自動検出するVisual Regression Testingは、UIの品質維持に効果的だ。

```typescript
// tests/visual/screenshots.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Testing', () => {
  test('トップページのスクリーンショット比較', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // スクリーンショットを撮影して前回と比較
    // 初回実行時: スナップショットを生成（tests/visual/screenshots.spec.ts-snapshots/ に保存）
    // 2回目以降: 前回との差分を検出
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('特定要素のスクリーンショット比較', async ({ page }) => {
    await page.goto('/products');

    // ヒーローセクションのみ比較
    await expect(page.locator('[data-testid="hero-section"]')).toHaveScreenshot(
      'hero-section.png'
    );

    // 商品カードの比較（動的コンテンツは除外）
    await expect(page.locator('[data-testid="product-grid"]')).toHaveScreenshot(
      'product-grid.png',
      {
        // 動的に変わる部分をマスク
        mask: [page.locator('.timestamp'), page.locator('.price-badge')],
      }
    );
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    await page.goto('/');

    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page).toHaveScreenshot('homepage-mobile.png');

    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot('homepage-tablet.png');

    // デスクトップサイズ
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page).toHaveScreenshot('homepage-desktop.png');
  });

  test('ダークモードの外観確認', async ({ page }) => {
    // prefers-color-scheme をエミュレート
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await expect(page).toHaveScreenshot('homepage-dark.png');
  });

  test('スクリーンショット比較の閾値設定', async ({ page }) => {
    await page.goto('/chart-page');

    await expect(page.locator('.chart-container')).toHaveScreenshot('chart.png', {
      // ピクセル差分の許容範囲（0〜1、デフォルト0.2）
      maxDiffPixelRatio: 0.05,
      // 絶対ピクセル数での許容値
      // maxDiffPixels: 100,
    });
  });
});
```

スナップショットの更新は以下のコマンドで実行する。

```bash
# スナップショットを更新（UIが意図的に変更された場合）
npx playwright test --update-snapshots

# 特定のテストのみ更新
npx playwright test visual/screenshots.spec.ts --update-snapshots
```

---

## 9. パラレルテスト・シャーディング

Playwrightは標準でパラレルテストをサポートしており、大規模なテストスイートの実行時間を大幅に削減できる。

```typescript
// playwright.config.ts のパラレル設定
export default defineConfig({
  // ファイル間での並列実行（デフォルトtrue）
  fullyParallel: true,

  // ワーカー数（CPUコア数に基づいて自動設定）
  workers: process.env.CI ? 4 : undefined,
});
```

```typescript
// テストファイル内での並列制御
import { test } from '@playwright/test';

// このdescribeブロック内のテストを並列実行
test.describe.parallel('並列実行グループ', () => {
  test('テスト1', async ({ page }) => { /* ... */ });
  test('テスト2', async ({ page }) => { /* ... */ });
  test('テスト3', async ({ page }) => { /* ... */ });
});

// 直列実行が必要な場合（ステートフルなテスト）
test.describe.serial('直列実行グループ', () => {
  test('ステップ1: データ作成', async ({ page }) => { /* ... */ });
  test('ステップ2: データ確認', async ({ page }) => { /* ... */ });
  test('ステップ3: データ削除', async ({ page }) => { /* ... */ });
});

// 特定のテストだけ直列化
test('並列非対応テスト', async ({ page }) => {
  // このテストは他のテストと同時に実行しない
  test.setTimeout(60_000);
  /* ... */
});
```

### シャーディング（大規模CIでの活用）

```bash
# テストを4分割してそれぞれ並列実行（CIの複数マシンで実行）
npx playwright test --shard=1/4
npx playwright test --shard=2/4
npx playwright test --shard=3/4
npx playwright test --shard=4/4

# GitHub Actionsでのシャーディング
# .github/workflows/playwright.yml の matrix 設定で実現
```

```yaml
# .github/workflows/playwright-sharded.yml
jobs:
  test:
    strategy:
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

```typescript
// フィクスチャを使った共有セットアップ
import { test as base } from '@playwright/test';

// カスタムフィクスチャの型定義
type MyFixtures = {
  loggedInPage: Page;
  testUser: { email: string; name: string };
};

// フィクスチャを拡張
export const test = base.extend<MyFixtures>({
  // テストユーザーデータのフィクスチャ
  testUser: async ({}, use) => {
    const user = { email: 'test@example.com', name: 'テストユーザー' };
    await use(user);
    // テスト後のクリーンアップ（データ削除など）
  },

  // ログイン済みページのフィクスチャ
  loggedInPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('password123');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await page.waitForURL('/dashboard');

    await use(page);
  },
});

export { expect } from '@playwright/test';
```

---

## 10. レポート — HTML Reporter・Trace Viewer

### HTML レポート

```bash
# テスト実行とレポート生成
npx playwright test

# レポートをブラウザで開く
npx playwright show-report
```

HTMLレポートには各テストの成功・失敗・スクリーンショット・ビデオが含まれる。

### Trace Viewer

Trace Viewerはテストの実行をステップごとに再生できる強力なデバッグツールだ。

```typescript
// playwright.config.ts
use: {
  // トレースオプション
  // 'off' | 'on' | 'retain-on-failure' | 'on-first-retry'
  trace: 'on-first-retry',
}
```

```bash
# 特定のテストのトレースを収集
npx playwright test --trace on

# トレースファイルを開く
npx playwright show-trace trace.zip

# テスト失敗時のトレースを自動で開く
npx playwright test --reporter=html --trace on
```

### Playwright Inspector（対話的デバッグ）

```bash
# テストをステップ実行できるデバッグモード
npx playwright test --debug

# 特定のテストをデバッグ
npx playwright test login.spec.ts --debug

# ブラウザを表示してゆっくり実行
npx playwright test --headed --slowMo=500
```

```typescript
// コード内でブレークポイント
test('デバッグ用テスト', async ({ page }) => {
  await page.goto('/');

  // ここで一時停止してInspectorで操作確認
  await page.pause();

  await page.getByRole('button', { name: 'クリック' }).click();
});
```

### Allure レポート統合

```bash
npm install -D allure-playwright allure-commandline
```

```typescript
// playwright.config.ts
reporter: [
  ['allure-playwright'],
  ['html'],
],
```

```bash
# レポート生成と表示
npx allure generate allure-results --clean
npx allure open
```

---

## 11. モバイルエミュレーション・デバイス設定

```typescript
// tests/mobile.spec.ts
import { test, expect, devices } from '@playwright/test';

// デバイスプリセットを使用したテスト
test.use({ ...devices['iPhone 14'] });

test.describe('iPhone 14 でのテスト', () => {
  test('モバイルナビゲーション', async ({ page }) => {
    await page.goto('/');

    // ハンバーガーメニューが表示されることを確認
    await expect(page.locator('.hamburger-menu')).toBeVisible();

    // ハンバーガーメニューをクリック
    await page.locator('.hamburger-menu').click();
    await expect(page.locator('.mobile-nav')).toBeVisible();
  });
});
```

```typescript
// playwright.config.ts でデバイスプロジェクトを定義
projects: [
  {
    name: 'Desktop Chrome',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'iPhone 14',
    use: { ...devices['iPhone 14'] },
  },
  {
    name: 'iPad Pro',
    use: { ...devices['iPad Pro'] },
  },
  {
    name: 'Pixel 7',
    use: { ...devices['Pixel 7'] },
  },
  // カスタムデバイス
  {
    name: 'Custom Mobile',
    use: {
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
  },
],
```

```typescript
// テスト内でデバイス設定を上書き
test('特定デバイスのテスト', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['Samsung Galaxy S21'],
    locale: 'ja-JP',
    geolocation: { longitude: 139.6917, latitude: 35.6895 }, // 東京
    permissions: ['geolocation'],
  });

  const page = await context.newPage();
  await page.goto('/location-service');
  // 位置情報サービスのテスト
  await context.close();
});

test('タッチ操作のテスト', async ({ page }) => {
  // タッチイベントを発火
  await page.touchscreen.tap(100, 200);

  // スワイプ（pinchIn/pinchOut）
  await page.evaluate(() => {
    // カスタムタッチイベント
    const touchStart = new TouchEvent('touchstart', {
      touches: [new Touch({ identifier: 1, target: document.body, clientX: 200, clientY: 300 })],
    });
    document.body.dispatchEvent(touchStart);
  });
});
```

---

## 12. アクセシビリティテスト（axe-playwright）

```bash
npm install -D @axe-core/playwright
```

```typescript
// tests/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('アクセシビリティテスト', () => {
  test('トップページのアクセシビリティ違反を検出', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    // アクセシビリティ違反がないことを確認
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('WCAG 2.1 AA 基準でのチェック', async ({ page }) => {
    await page.goto('/products');

    const results = await new AxeBuilder({ page })
      // 特定のWCAG基準のみチェック
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // 違反内容を出力（デバッグ用）
    if (results.violations.length > 0) {
      console.log('アクセシビリティ違反:');
      results.violations.forEach((v) => {
        console.log(`- ${v.id}: ${v.description}`);
        v.nodes.forEach((n) => console.log(`  対象: ${n.html}`));
      });
    }

    expect(results.violations).toEqual([]);
  });

  test('特定要素のアクセシビリティチェック', async ({ page }) => {
    await page.goto('/');

    // ナビゲーションのみチェック
    const results = await new AxeBuilder({ page })
      .include('nav')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('特定のルールを除外してチェック', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      // 既知の問題を一時的に除外（要修正）
      .disableRules(['color-contrast'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('フォームのアクセシビリティ', async ({ page }) => {
    await page.goto('/contact');

    const results = await new AxeBuilder({ page })
      .include('form')
      .withTags(['wcag2a'])
      .analyze();

    // 不完全（incomplete）な項目も確認
    console.log('要確認項目:', results.incomplete.length);

    expect(results.violations).toEqual([]);
  });
});
```

---

## 13. GitHub Actions CI統合・Docker実行

### GitHub Actions ワークフロー

```yaml
# .github/workflows/playwright.yml
name: Playwright E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    steps:
      - name: チェックアウト
        uses: actions/checkout@v4

      - name: Node.js セットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 依存関係インストール
        run: npm ci

      - name: Playwrightブラウザインストール
        run: npx playwright install --with-deps

      - name: アプリをビルド
        run: npm run build
        env:
          NODE_ENV: production

      - name: E2Eテスト実行
        run: npx playwright test
        env:
          CI: true
          BASE_URL: http://localhost:3000
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: テストレポートをアップロード
        uses: actions/upload-artifact@v4
        if: always() # テスト失敗時もアップロード
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: テストトレースをアップロード
        uses: actions/upload-artifact@v4
        if: failure() # 失敗時のみ
        with:
          name: playwright-traces
          path: test-results/
          retention-days: 7
```

### シャーディングを使った高速CI

```yaml
# .github/workflows/playwright-parallel.yml
name: Playwright Tests (Sharded)

on: [push, pull_request]

jobs:
  playwright-tests:
    timeout-minutes: 30
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npx playwright install --with-deps

      - name: シャード ${{ matrix.shardIndex }}/${{ matrix.shardTotal }} を実行
        run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
        env:
          CI: true

      - name: blob レポートをアップロード
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1

  # 全シャードのレポートをマージ
  merge-reports:
    if: always()
    needs: [playwright-tests]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci

      - name: blob レポートをダウンロード
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: レポートをマージ
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: HTMLレポートをアップロード
        uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report/
          retention-days: 14
```

### Docker での実行

```dockerfile
# Dockerfile.playwright
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# テスト実行（デフォルトコマンド）
CMD ["npx", "playwright", "test", "--reporter=html"]
```

```yaml
# docker-compose.yml（ローカルDocker実行）
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=test

  playwright:
    build:
      context: .
      dockerfile: Dockerfile.playwright
    depends_on:
      - app
    environment:
      - BASE_URL=http://app:3000
      - CI=true
    volumes:
      - ./playwright-report:/app/playwright-report
    command: npx playwright test
```

```bash
# Dockerでテスト実行
docker-compose up --abort-on-container-exit playwright

# レポートをホストで確認
npx playwright show-report playwright-report
```

---

## まとめ：Playwrightで実現する品質保証の体制

本記事ではPlaywrightの基本から実践的な活用方法まで幅広く解説した。重要なポイントをまとめると以下のとおりだ。

**基本実装**
- `playwright.config.ts` でプロジェクト全体の設定を一元管理
- `getByRole`・`getByLabel`・`getByTestId` などのアクセシビリティベースのロケーターを優先
- ページオブジェクトモデルでテストコードの重複を排除し保守性を向上

**高度な機能**
- `page.route()` でAPIをモックし、ネットワーク依存なしで安定したテストを実現
- `storageState` で認証状態を保存し、毎回のログイン操作を省略
- `toHaveScreenshot()` でUIの見た目の変化を自動検出

**CI/CD統合**
- GitHub Actionsでの並列実行でフィードバックループを短縮
- シャーディングで大規模テストスイートを複数マシンで分散実行
- Trace Viewer・HTML Reporterで失敗原因を迅速に特定

E2Eテストでは、APIレスポンスの検証が重要な場面も多い。JSONレスポンスの構造確認やAPIデバッグには、**[DevToolBox](https://usedevtools.com/)** のJSONフォーマッター・差分比較ツールが役立つ。テスト実行中に `await response.json()` で取得したレスポンスをDevToolBoxに貼り付けて構造を確認したり、モックデータのJSON作成に活用したりすることで、E2Eテスト開発の効率が上がる。

Playwrightは活発に開発されており、新機能が継続的に追加されている。公式ドキュメント（playwright.dev）と合わせて本記事を参照し、プロダクションレベルのE2Eテスト環境を構築してほしい。

---

## 参考リンク

- [Playwright 公式ドキュメント](https://playwright.dev/)
- [Playwright GitHub](https://github.com/microsoft/playwright)
- [@playwright/test API リファレンス](https://playwright.dev/docs/api/class-playwright)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [axe-playwright](https://github.com/abhinaba-ghosh/axe-playwright)
- [DevToolBox — JSON/APIデバッグツール](https://usedevtools.com/)
