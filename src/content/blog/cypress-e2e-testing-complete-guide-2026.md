---
title: 'Cypress E2Eテスト完全ガイド2026｜コンポーネントテスト・CI連携・ベストプラクティス'
description: 'CypressによるE2Eテストとコンポーネントテストの実践ガイド2026年版。セットアップからセレクタ戦略、APIモック、認証テスト、CI/CD連携、Playwrightとの性能・機能比較まで、Webアプリの品質担保に必要な知識をコード例付きで徹底解説します。'
pubDate: '2026-03-05'
tags: ['Cypress', 'テスト', 'E2E', 'フロントエンド', 'TypeScript']
heroImage: '../../assets/thumbnails/cypress-e2e-testing-complete-guide-2026.jpg'
---

Webアプリケーションの品質を担保するうえで、E2E（End-to-End）テストは欠かせない存在です。**Cypress**はブラウザ内で直接テストを実行するアーキテクチャにより、高速かつ安定したE2Eテストを実現するフレームワークとして広く採用されています。本記事では、2026年時点の最新バージョンをベースに、セットアップからCI/CD連携まで実践的に解説します。

## Cypressとは

Cypressは、フロントエンド向けに設計されたJavaScriptベースのテストフレームワークです。ブラウザと同一プロセス内でテストコードが動作するため、DOMへの直接アクセスやネットワークリクエストのインターセプトが可能です。

### 主要フレームワークとの比較

| 項目 | Cypress | Playwright | Selenium |
|------|---------|------------|----------|
| 対応ブラウザ | Chrome, Firefox, Edge, Electron | Chromium, Firefox, WebKit | 全主要ブラウザ |
| 言語 | JavaScript / TypeScript | JS/TS, Python, Java, C# | 多言語対応 |
| 実行速度 | 高速（ブラウザ内実行） | 高速（CDP/独自プロトコル） | 中程度（WebDriver経由） |
| 並列実行 | Cypress Cloud（有料）/ 自前分割 | ネイティブサポート | Grid構成が必要 |
| コンポーネントテスト | ネイティブサポート | 実験的サポート | 非対応 |
| ネットワークモック | cy.intercept（強力） | route/page.route | 外部ライブラリ必要 |
| デバッグ体験 | タイムトラベル・スナップショット | Trace Viewer | ログベース |
| マルチタブ | 非対応 | 対応 | 対応 |
| iframe操作 | プラグイン必要 | ネイティブ対応 | 対応 |
| 学習コスト | 低い | 中程度 | 高い |

Cypressの最大の強みは、**開発者体験（DX）の良さ**です。テスト実行中にブラウザ上でリアルタイムにDOMの状態を確認でき、各コマンドのスナップショットを遡って調べる「タイムトラベルデバッグ」が標準装備されています。

## セットアップとプロジェクト構成

### インストール

```bash
# npm
npm install -D cypress

# pnpm
pnpm add -D cypress

# yarn
yarn add -D cypress
```

### 初期化

```bash
npx cypress open
```

初回起動時にプロジェクトのテンプレートが生成されます。TypeScriptを使用する場合は、`tsconfig.json`が自動的にセットアップされます。

### 推奨ディレクトリ構成

```
cypress/
  e2e/                    # E2Eテストファイル
    auth/
      login.cy.ts
      signup.cy.ts
    dashboard/
      dashboard.cy.ts
  component/              # コンポーネントテスト
    Button.cy.tsx
    Modal.cy.tsx
  fixtures/               # テストデータ（JSON）
    users.json
    products.json
  support/
    commands.ts           # カスタムコマンド定義
    e2e.ts                # E2Eテストのグローバル設定
    component.ts          # コンポーネントテストのグローバル設定
  factories/              # テストデータファクトリ
    user.factory.ts
cypress.config.ts         # Cypress設定ファイル
```

### 設定ファイル

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    retries: {
      runMode: 2,    // CI実行時のリトライ回数
      openMode: 0,   // GUI実行時はリトライしない
    },
    setupNodeEvents(on, config) {
      // プラグインの設定
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
```

### TypeScript設定

```json
// cypress/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["cypress"],
    "strict": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

## 基本的なテストの書き方

### 最初のテスト

```typescript
// cypress/e2e/home.cy.ts
describe('トップページ', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('ページタイトルが正しく表示される', () => {
    cy.title().should('include', 'MyApp');
  });

  it('ナビゲーションリンクが表示される', () => {
    cy.get('nav').within(() => {
      cy.contains('ホーム').should('be.visible');
      cy.contains('ダッシュボード').should('be.visible');
      cy.contains('設定').should('be.visible');
    });
  });

  it('検索フォームが機能する', () => {
    cy.get('[data-testid="search-input"]').type('Cypress');
    cy.get('[data-testid="search-button"]').click();
    cy.url().should('include', '?q=Cypress');
    cy.get('[data-testid="search-results"]')
      .should('exist')
      .children()
      .should('have.length.greaterThan', 0);
  });
});
```

### コマンドチェーンとアサーション

Cypressのコマンドはチェーン形式で記述します。各コマンドは自動的にリトライされるため、明示的な`waitFor`は不要です。

```typescript
// cypress/e2e/form.cy.ts
describe('お問い合わせフォーム', () => {
  it('バリデーションエラーが表示される', () => {
    cy.visit('/contact');

    // 空のまま送信
    cy.get('[data-testid="submit-button"]').click();

    // エラーメッセージの確認
    cy.get('[data-testid="error-name"]')
      .should('be.visible')
      .and('contain', '名前は必須です');

    cy.get('[data-testid="error-email"]')
      .should('be.visible')
      .and('contain', 'メールアドレスは必須です');
  });

  it('正常に送信できる', () => {
    cy.visit('/contact');

    cy.get('[data-testid="input-name"]').type('田中太郎');
    cy.get('[data-testid="input-email"]').type('tanaka@example.com');
    cy.get('[data-testid="input-message"]').type('テストメッセージです');
    cy.get('[data-testid="submit-button"]').click();

    cy.get('[data-testid="success-message"]')
      .should('be.visible')
      .and('contain', '送信が完了しました');
  });
});
```

## セレクタ戦略（data-testid）

テストの安定性を左右する最も重要な要素がセレクタの選び方です。

### セレクタの優先順位

```typescript
// 推奨度: 高 → 低

// 1. data-testid（最も安定）
cy.get('[data-testid="login-button"]');

// 2. data-cy（Cypress専用属性）
cy.get('[data-cy="login-button"]');

// 3. アクセシビリティ属性（意味的に正しい）
cy.get('[role="dialog"]');
cy.get('[aria-label="閉じる"]');

// 4. テキストコンテンツ（変更されやすいが可読性が高い）
cy.contains('ログイン');

// 5. CSSクラス（非推奨: スタイル変更で壊れる）
cy.get('.btn-primary');  // 避ける

// 6. タグ + 構造（非推奨: DOM構造に依存）
cy.get('div > form > button');  // 避ける
```

### コンポーネント側の実装例

```tsx
// React コンポーネント
interface ButtonProps {
  label: string;
  onClick: () => void;
  testId?: string;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, testId }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    className="btn-primary"
  >
    {label}
  </button>
);

// 使用側
<Button
  label="ログイン"
  onClick={handleLogin}
  testId="login-button"
/>
```

### カスタムセレクタの設定

`data-testid`属性を短く書けるようにカスタマイズします。

```typescript
// cypress.config.ts
export default defineConfig({
  e2e: {
    // ...
  },
  // Cypress Testing Library のセレクタ設定
  env: {
    testIdAttribute: 'data-testid',
  },
});
```

## APIモック（cy.intercept）

`cy.intercept`はネットワークリクエストをインターセプトし、レスポンスを差し替える強力な機能です。テストの安定性と速度を大幅に向上させます。

### 基本的なモック

```typescript
// cypress/e2e/dashboard.cy.ts
describe('ダッシュボード', () => {
  it('ユーザー一覧を表示する', () => {
    // APIレスポンスをモック
    cy.intercept('GET', '/api/users', {
      statusCode: 200,
      body: [
        { id: 1, name: '田中太郎', email: 'tanaka@example.com' },
        { id: 2, name: '佐藤花子', email: 'sato@example.com' },
      ],
    }).as('getUsers');

    cy.visit('/dashboard');
    cy.wait('@getUsers');

    cy.get('[data-testid="user-list"]')
      .children()
      .should('have.length', 2);
  });

  it('APIエラー時にエラーメッセージを表示する', () => {
    cy.intercept('GET', '/api/users', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('getUsersError');

    cy.visit('/dashboard');
    cy.wait('@getUsersError');

    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'データの取得に失敗しました');
  });
});
```

### 条件付きインターセプト

```typescript
describe('検索API', () => {
  it('検索結果をフィルタリングする', () => {
    cy.intercept('GET', '/api/search*', (req) => {
      const query = new URL(req.url).searchParams.get('q');

      if (query === 'react') {
        req.reply({
          statusCode: 200,
          body: {
            results: [
              { id: 1, title: 'React入門' },
              { id: 2, title: 'React Hooks完全ガイド' },
            ],
            total: 2,
          },
        });
      } else {
        req.reply({
          statusCode: 200,
          body: { results: [], total: 0 },
        });
      }
    }).as('search');

    cy.visit('/search');
    cy.get('[data-testid="search-input"]').type('react');
    cy.get('[data-testid="search-button"]').click();
    cy.wait('@search');

    cy.get('[data-testid="result-count"]').should('contain', '2件');
  });
});
```

### リクエストの検証

```typescript
it('正しいパラメータでAPIが呼ばれる', () => {
  cy.intercept('POST', '/api/orders', (req) => {
    // リクエストボディの検証
    expect(req.body).to.deep.include({
      productId: 'prod-001',
      quantity: 3,
    });
    expect(req.headers['content-type']).to.include('application/json');

    req.reply({ statusCode: 201, body: { orderId: 'order-123' } });
  }).as('createOrder');

  cy.visit('/products/prod-001');
  cy.get('[data-testid="quantity-input"]').clear().type('3');
  cy.get('[data-testid="order-button"]').click();
  cy.wait('@createOrder');
});
```

## 認証フローのテスト

認証が必要なページのテストでは、毎回ログインUIを操作するのは非効率です。APIを利用したプログラム的なログインを推奨します。

### ログインコマンドの実装

```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      loginByApi(email: string, password: string): Chainable<void>;
    }
  }
}

// UI経由のログイン（ログインページ自体のテスト用）
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('not.include', '/login');
});

// API経由のログイン（認証後ページのテスト用）
Cypress.Commands.add('loginByApi', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { email, password },
  }).then((response) => {
    expect(response.status).to.eq(200);
    // トークンをローカルストレージに保存
    window.localStorage.setItem('authToken', response.body.token);
  });
});

export {};
```

### 認証テストの実装

```typescript
// cypress/e2e/auth/login.cy.ts
describe('ログイン', () => {
  it('正しい認証情報でログインできる', () => {
    cy.login('user@example.com', 'password123');
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-avatar"]').should('be.visible');
  });

  it('不正な認証情報でエラーが表示される', () => {
    cy.login('user@example.com', 'wrong-password');
    cy.get('[data-testid="login-error"]')
      .should('be.visible')
      .and('contain', 'メールアドレスまたはパスワードが正しくありません');
  });
});

// cypress/e2e/dashboard/dashboard.cy.ts
describe('ダッシュボード（認証済み）', () => {
  beforeEach(() => {
    // API経由で高速にログイン
    cy.loginByApi('user@example.com', 'password123');
  });

  it('ダッシュボードが表示される', () => {
    cy.visit('/dashboard');
    cy.get('[data-testid="dashboard-title"]')
      .should('contain', 'ダッシュボード');
  });
});
```

### セッション管理の最適化

Cypress 12以降では`cy.session`を使い、ログインセッションをキャッシュできます。

```typescript
// cypress/support/commands.ts
Cypress.Commands.add('loginByApi', (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: { email, password },
      }).then((response) => {
        window.localStorage.setItem('authToken', response.body.token);
      });
    },
    {
      validate() {
        // セッションの有効性を確認
        cy.request({
          url: '/api/auth/me',
          headers: {
            Authorization: `Bearer ${window.localStorage.getItem('authToken')}`,
          },
        }).its('status').should('eq', 200);
      },
    }
  );
});
```

## コンポーネントテスト

Cypress 12以降では、E2Eテストに加えてコンポーネント単体のテストも実行できます。アプリケーション全体を起動せずに、個々のコンポーネントを隔離してテストする手法です。

### Reactコンポーネントのテスト

```tsx
// cypress/component/TodoItem.cy.tsx
import TodoItem from '../../src/components/TodoItem';

describe('TodoItem', () => {
  it('タスク名が表示される', () => {
    cy.mount(
      <TodoItem
        todo={{ id: '1', title: '買い物', completed: false }}
        onToggle={cy.stub()}
        onDelete={cy.stub()}
      />
    );

    cy.get('[data-testid="todo-title"]').should('contain', '買い物');
  });

  it('完了チェックボックスをクリックするとonToggleが呼ばれる', () => {
    const onToggle = cy.stub().as('onToggle');

    cy.mount(
      <TodoItem
        todo={{ id: '1', title: '買い物', completed: false }}
        onToggle={onToggle}
        onDelete={cy.stub()}
      />
    );

    cy.get('[data-testid="todo-checkbox"]').click();
    cy.get('@onToggle').should('have.been.calledOnceWith', '1');
  });

  it('完了済みタスクには取り消し線が表示される', () => {
    cy.mount(
      <TodoItem
        todo={{ id: '1', title: '買い物', completed: true }}
        onToggle={cy.stub()}
        onDelete={cy.stub()}
      />
    );

    cy.get('[data-testid="todo-title"]')
      .should('have.css', 'text-decoration-line', 'line-through');
  });

  it('削除ボタンをクリックするとonDeleteが呼ばれる', () => {
    const onDelete = cy.stub().as('onDelete');

    cy.mount(
      <TodoItem
        todo={{ id: '1', title: '買い物', completed: false }}
        onToggle={cy.stub()}
        onDelete={onDelete}
      />
    );

    cy.get('[data-testid="todo-delete"]').click();
    cy.get('@onDelete').should('have.been.calledOnceWith', '1');
  });
});
```

### フォームコンポーネントのテスト

```tsx
// cypress/component/SearchForm.cy.tsx
import SearchForm from '../../src/components/SearchForm';

describe('SearchForm', () => {
  it('入力値を送信する', () => {
    const onSearch = cy.stub().as('onSearch');

    cy.mount(<SearchForm onSearch={onSearch} />);

    cy.get('[data-testid="search-input"]').type('Cypress テスト');
    cy.get('[data-testid="search-form"]').submit();

    cy.get('@onSearch').should('have.been.calledOnceWith', 'Cypress テスト');
  });

  it('空文字では送信できない', () => {
    const onSearch = cy.stub().as('onSearch');

    cy.mount(<SearchForm onSearch={onSearch} />);

    cy.get('[data-testid="search-form"]').submit();

    cy.get('@onSearch').should('not.have.been.called');
    cy.get('[data-testid="search-error"]')
      .should('contain', '検索キーワードを入力してください');
  });
});
```

## カスタムコマンド

テストコード内で繰り返し使用する操作は、カスタムコマンドとして抽出しましょう。

### 定義と型安全性

```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      /** data-testid属性でエレメントを取得する */
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
      /** テーブルの行数を検証する */
      tableRowCount(testId: string, count: number): Chainable<void>;
      /** トースト通知の表示を検証する */
      shouldShowToast(message: string, type?: 'success' | 'error' | 'info'): Chainable<void>;
      /** ドラッグ&ドロップ操作 */
      dragTo(targetSelector: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

Cypress.Commands.add('tableRowCount', (testId: string, count: number) => {
  cy.getByTestId(testId)
    .find('tbody tr')
    .should('have.length', count);
});

Cypress.Commands.add('shouldShowToast', (message: string, type = 'success') => {
  cy.get(`[data-testid="toast-${type}"]`)
    .should('be.visible')
    .and('contain', message);

  // 自動消去を待つ
  cy.get(`[data-testid="toast-${type}"]`, { timeout: 6000 })
    .should('not.exist');
});

Cypress.Commands.add(
  'dragTo',
  { prevSubject: 'element' },
  (subject: JQuery<HTMLElement>, targetSelector: string) => {
    cy.wrap(subject).trigger('dragstart');
    cy.get(targetSelector).trigger('drop');
    cy.wrap(subject).trigger('dragend');
  }
);

export {};
```

### カスタムコマンドの使用例

```typescript
// cypress/e2e/users.cy.ts
describe('ユーザー管理', () => {
  beforeEach(() => {
    cy.loginByApi('admin@example.com', 'admin123');
    cy.visit('/admin/users');
  });

  it('ユーザーテーブルに10件表示される', () => {
    cy.tableRowCount('user-table', 10);
  });

  it('ユーザー削除後にトースト通知が表示される', () => {
    cy.getByTestId('delete-user-1').click();
    cy.getByTestId('confirm-delete').click();
    cy.shouldShowToast('ユーザーを削除しました', 'success');
  });
});
```

## フィクスチャとファクトリ

テストデータの管理はテストの保守性に直結します。フィクスチャとファクトリを適切に使い分けましょう。

### フィクスチャ（静的データ）

```json
// cypress/fixtures/users.json
{
  "admin": {
    "id": "user-001",
    "name": "管理者太郎",
    "email": "admin@example.com",
    "role": "admin"
  },
  "member": {
    "id": "user-002",
    "name": "一般花子",
    "email": "member@example.com",
    "role": "member"
  }
}
```

```typescript
// フィクスチャの使用
describe('ユーザープロフィール', () => {
  it('管理者情報を表示する', () => {
    cy.fixture('users').then((users) => {
      cy.intercept('GET', '/api/users/me', users.admin).as('getMe');
      cy.visit('/profile');
      cy.wait('@getMe');
      cy.getByTestId('user-name').should('contain', '管理者太郎');
      cy.getByTestId('user-role').should('contain', '管理者');
    });
  });
});
```

### ファクトリ（動的データ生成）

```typescript
// cypress/factories/user.factory.ts
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  createdAt: string;
}

let userCounter = 0;

export function createUser(overrides: Partial<User> = {}): User {
  userCounter++;
  return {
    id: `user-${String(userCounter).padStart(3, '0')}`,
    name: `テストユーザー${userCounter}`,
    email: `user${userCounter}@example.com`,
    role: 'member',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createUsers(count: number, overrides: Partial<User> = {}): User[] {
  return Array.from({ length: count }, () => createUser(overrides));
}
```

```typescript
// ファクトリの使用
import { createUser, createUsers } from '../factories/user.factory';

describe('ユーザー一覧', () => {
  it('ページネーションが正しく動作する', () => {
    const users = createUsers(25);

    cy.intercept('GET', '/api/users?page=1', {
      body: { data: users.slice(0, 10), total: 25 },
    }).as('page1');

    cy.intercept('GET', '/api/users?page=2', {
      body: { data: users.slice(10, 20), total: 25 },
    }).as('page2');

    cy.visit('/admin/users');
    cy.wait('@page1');
    cy.tableRowCount('user-table', 10);

    cy.getByTestId('pagination-next').click();
    cy.wait('@page2');
    cy.tableRowCount('user-table', 10);
  });

  it('管理者ユーザーにはバッジが表示される', () => {
    const admin = createUser({ role: 'admin', name: '管理者' });
    const member = createUser({ role: 'member', name: '一般ユーザー' });

    cy.intercept('GET', '/api/users*', {
      body: { data: [admin, member], total: 2 },
    });

    cy.visit('/admin/users');
    cy.contains('管理者').parent().find('[data-testid="admin-badge"]').should('exist');
    cy.contains('一般ユーザー').parent().find('[data-testid="admin-badge"]').should('not.exist');
  });
});
```

## CI/CD連携（GitHub Actions）

CypressテストをCI環境で自動実行する設定です。

### GitHub Actionsワークフロー

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        containers: [1, 2, 3]  # 3並列で実行

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Cypress run
        uses: cypress-io/github-action@v6
        with:
          start: npm run preview
          wait-on: 'http://localhost:4173'
          wait-on-timeout: 120
          browser: chrome
          record: true
          parallel: true
          group: 'e2e-chrome'
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload screenshots on failure
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: cypress-screenshots-${{ matrix.containers }}
          path: cypress/screenshots
          retention-days: 7

      - name: Upload videos
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: cypress-videos-${{ matrix.containers }}
          path: cypress/videos
          retention-days: 3

  component:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - name: Component tests
        uses: cypress-io/github-action@v6
        with:
          component: true
          browser: chrome
```

### テスト結果のレポート

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    // CI環境でのスクリーンショット・動画設定
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    video: true,
    screenshotOnRunFailure: true,
    // JUnitレポーター（CI連携用）
    reporter: 'junit',
    reporterOptions: {
      mochaFile: 'cypress/results/results-[hash].xml',
      toConsole: false,
    },
  },
});
```

## Cypress Cloud

Cypress Cloudは、テスト結果の可視化・並列実行・フレーキーテスト検出を提供するSaaSサービスです。

### 主な機能

- **テスト分析ダッシュボード**: 実行時間、成功率、フレーキーテストの傾向をグラフで確認
- **スマート並列実行**: テストの実行時間に基づき、複数CIマシンに最適分配
- **フレーキーテスト検出**: 不安定なテストを自動特定し、優先修正候補を提示
- **テスト再生**: 失敗時のスクリーンショット・動画・DOMスナップショットを保存

### セットアップ

```bash
# プロジェクトIDの取得
npx cypress open
# Cypress Cloud タブから "Connect to Cypress Cloud" を選択
# プロジェクトIDとレコードキーが発行される
```

```typescript
// cypress.config.ts
export default defineConfig({
  projectId: 'your-project-id',  // Cypress Cloudのプロジェクト識別子
  e2e: {
    // ...
  },
});
```

```bash
# レコードキー付きで実行
npx cypress run --record --key YOUR_RECORD_KEY
```

### 無料プランの制限

Cypress Cloudの無料プラン（Starter）では月間500テスト結果まで記録可能です。小規模プロジェクトやOSSでは十分に活用できますが、CIの実行回数が多い場合は有料プラン（Team以上）の検討が必要になります。

### 無料の代替手段

Cypress Cloudを使わずに並列実行を実現する方法もあります。

```yaml
# specパターンで手動分割する例
jobs:
  e2e-auth:
    steps:
      - uses: cypress-io/github-action@v6
        with:
          spec: 'cypress/e2e/auth/**/*.cy.ts'

  e2e-dashboard:
    steps:
      - uses: cypress-io/github-action@v6
        with:
          spec: 'cypress/e2e/dashboard/**/*.cy.ts'
```

## Playwrightとの使い分け

CypressとPlaywrightはそれぞれ異なる強みを持っています。プロジェクトの要件に応じて最適なツールを選択しましょう。

### Cypressが適しているケース

- **フロントエンド中心のSPA/SSRアプリ**: Reactの状態やDOMを直接操作・検証できる
- **コンポーネントテストとE2Eを統一したい**: 同一フレームワークでコンポーネントテストとE2Eテストの両方を実行可能
- **チーム内にテスト経験が少ないメンバーがいる**: タイムトラベルデバッグやインタラクティブなGUIが学習をサポート
- **APIモックを多用する**: `cy.intercept`の直感的なAPIが強力

### Playwrightが適しているケース

- **マルチブラウザ対応が必須**: WebKit（Safari相当）でのテストが必要
- **マルチタブ・マルチウィンドウ操作**: OAuth認証のポップアップ、新規タブでの遷移など
- **iframeの複雑な操作**: 決済フォームや埋め込みウィジェットのテスト
- **大規模なテストスイート**: ネイティブの並列実行により高速に処理
- **Python/Java/C#チーム**: JavaScript以外の言語でテストを書きたい場合

### 併用パターン

実際のプロジェクトでは両方を併用するケースもあります。

```
テスト戦略
  コンポーネントテスト → Cypress Component Testing
  E2Eテスト（主要フロー） → Cypress
  クロスブラウザテスト → Playwright
  ビジュアルリグレッション → Playwright + Percy/Argos
```

### 判断フローチャート

```
マルチタブ・iframe操作が必要？
  → Yes → Playwright
  → No
    コンポーネントテストも統一したい？
      → Yes → Cypress
      → No
        WebKit対応が必須？
          → Yes → Playwright
          → No
            チームのJS習熟度が低い？
              → Yes → Cypress（DXが優れる）
              → No → どちらでも可（好みで選択）
```

## まとめ

Cypressは2026年現在も、フロントエンドE2Eテストの定番ツールとして進化を続けています。本記事で解説した内容を振り返ります。

- **セットアップ**: `npm install -D cypress`で導入し、`cypress.config.ts`でTypeScript環境を構築
- **セレクタ戦略**: `data-testid`を基本とし、DOM構造やCSSクラスへの依存を排除
- **APIモック**: `cy.intercept`でバックエンドに依存しない安定したテストを実現
- **認証テスト**: `cy.session`でログインセッションをキャッシュし、テスト速度を最適化
- **コンポーネントテスト**: E2Eと同じフレームワークでコンポーネント単体の検証が可能
- **カスタムコマンド**: 型安全なカスタムコマンドで重複を排除し、保守性を向上
- **CI/CD**: GitHub Actionsとの連携により、PR単位での自動テスト実行を構築
- **Playwrightとの比較**: 要件に応じた使い分けが重要。併用も有効な選択肢

テストは書くこと自体が目的ではなく、**アプリケーションの品質に対する信頼性を継続的に担保する仕組み**です。まずは主要なユーザーフローからE2Eテストを導入し、段階的にカバレッジを広げていくことをおすすめします。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
