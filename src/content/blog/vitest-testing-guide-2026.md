---
title: "Vitest完全ガイド2026：Next.js・React・Node.jsの高速テスト環境を構築する"
description: "Vitestを使った現代的なJavaScript/TypeScriptテストを徹底解説。ユニットテスト・統合テスト・Snapshot・モック・カバレッジ計測まで実践的に学ぶ。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2026-03-14"
tags: ["Vitest", "テスト", "TypeScript", "React", "Next.js", "プログラミング"]
heroImage: '../../assets/thumbnails/vitest-testing-guide-2026.jpg'
---
## なぜVitestか：Jestからの移行が進む理由

| | Jest | Vitest |
|--|------|--------|
| **速度** | 遅い（特にTS変換） | Jestの5〜10倍高速 |
| **TypeScript** | 設定が複雑 | ゼロ設定で動作 |
| **ESM** | 混在問題あり | ESMネイティブ対応 |
| **Vite統合** | なし | 設定を共有できる |

---

## セットアップ

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
npm install -D @testing-library/user-event msw
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
```

---

## ユニットテストの基礎

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, calculateTax } from './utils';

describe('formatCurrency', () => {
  it('正の数値を日本円でフォーマットする', () => {
    expect(formatCurrency(1234.56)).toBe('¥1,234.56');
  });

  it('ゼロを正しくフォーマットする', () => {
    expect(formatCurrency(0)).toBe('¥0.00');
  });
});

describe('calculateTax', () => {
  it('標準税率10%を計算する', () => {
    const { tax, total } = calculateTax(1000, 'standard');
    expect(tax).toBe(100);
    expect(total).toBe(1100);
  });
});
```

---

## Reactコンポーネントのテスト

```tsx
// src/components/TodoItem.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TodoItem } from './TodoItem';

const mockTodo = { id: '1', title: '牛乳を買う', completed: false };

describe('TodoItem', () => {
  it('タイトルを表示する', () => {
    render(<TodoItem todo={mockTodo} onToggle={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('牛乳を買う')).toBeInTheDocument();
  });

  it('チェックボックスをクリックするとonToggleが呼ばれる', async () => {
    const onToggle = vi.fn();
    render(<TodoItem todo={mockTodo} onToggle={onToggle} onDelete={vi.fn()} />);

    await userEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('1');
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
```

---

## APIのモック：MSWを使ったネットワークモック

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/todos', () => {
    return HttpResponse.json([
      { id: '1', title: 'Todo 1', completed: false },
      { id: '2', title: 'Todo 2', completed: true },
    ]);
  }),

  http.post('/api/todos', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ id: '3', ...body }, { status: 201 });
  }),

  http.delete('/api/todos/:id', ({ params }) => {
    if (params.id === 'invalid') {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
```

```typescript
// src/test/setup.ts（MSW統合）
import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';
import { afterAll, afterEach, beforeAll } from 'vitest';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Server Actions のテスト（Next.js 15）

```typescript
// src/app/actions/todo.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createTodo } from './todo';

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([
      { id: '123', title: 'Test Todo', completed: false }
    ]),
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('createTodo', () => {
  it('有効なフォームデータでTodoを作成できる', async () => {
    const formData = new FormData();
    formData.append('title', 'テストTodo');

    const result = await createTodo({}, formData);
    expect(result.message).toBe('作成しました！');
  });

  it('空のタイトルはバリデーションエラーになる', async () => {
    const formData = new FormData();
    formData.append('title', '');

    const result = await createTodo({}, formData);
    expect(result.errors.title).toBeDefined();
  });
});
```

---

## テストの実行

```bash
npm test               # 通常の実行
npm test -- --watch    # ウォッチモード
npm test -- --ui       # UIモード（ブラウザで確認）
npm test -- --coverage # カバレッジ計測
```

---

## 高度なモックパターン

テストの品質を高めるには、適切なモック戦略が不可欠です。ここでは実務で頻繁に使うパターンを紹介します。

### モジュール全体のモック

```typescript
// src/services/userService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserProfile } from './userService';

// モジュール全体をモック
vi.mock('./api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// モックされたモジュールをインポート
import { apiClient } from './api/client';

describe('getUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('APIレスポンスを整形して返す', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { id: 1, name: '田中太郎', role: 'admin' },
    });

    const profile = await getUserProfile(1);
    expect(profile).toEqual({
      id: 1,
      displayName: '田中太郎',
      isAdmin: true,
    });
  });

  it('API失敗時にnullを返す', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network Error'));

    const profile = await getUserProfile(1);
    expect(profile).toBeNull();
  });
});
```

---

## CI/CDへの統合

Vitestをチームの開発フローに組み込むことで、コードの品質を継続的に保てます。

### GitHub Actionsでの設定

```yaml
# .github/workflows/test.yml
name: Test
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --reporter=verbose
      - run: npm test -- --coverage
      - name: カバレッジレポートをアップロード
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
```

### pre-commitフックでテストを実行

```bash
# .husky/pre-commit
#!/bin/sh
npx vitest run --changed HEAD~1
```

変更されたファイルに関連するテストだけを実行することで、コミット前の待ち時間を最小限に抑えられます。

---

## カバレッジ設定の最適化

カバレッジを正しく設定することで、テストの品質指標を可視化できます。

```typescript
// vitest.config.ts（カバレッジ詳細設定）
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
        perFile: true,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/types/**',
        'src/test/**',
      ],
    },
  },
});
```

カバレッジレポートはHTMLで出力すると、ファイルごとの未テスト行を視覚的に確認できます。`open coverage/index.html` でブラウザから確認しましょう。

---

## まとめ

```
Vitestを選ぶ理由：
- TypeScriptがゼロ設定で動く
- ESMネイティブ対応
- Jestの5〜10倍高速
- UIモードで視覚的に確認できる

テスト品質のチェックポイント：
- カバレッジ80%以上
- ハッピーパスだけでなくエラーケースも
- 実装ではなく振る舞いをテスト
- MSWでAPIをモック（実際のAPIは叩かない）
```
