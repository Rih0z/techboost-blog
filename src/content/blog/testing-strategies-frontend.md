---
title: 'フロントエンドテスト戦略完全ガイド — Unit/Integration/E2Eテストの使い分け'
description: 'フロントエンドのテスト戦略を徹底解説。Unit、Integration、E2Eテストの違いと使い分け、React/Vueでの実装例、テストピラミッドの実践方法を2026年最新のツールで紹介します。'
pubDate: 'Feb 05 2026'
---

フロントエンドのテスト、何をどこまで書けばいいか迷っていませんか？「とりあえずテストを書く」では、時間ばかりかかってバグは防げません。この記事では、Unit・Integration・E2Eテストの違いを明確にし、効果的なテスト戦略を構築する方法を解説します。

## テストピラミッド — 基本原則

```
       /\
      /  \  E2E Tests (少)
     /    \  - 遅い、壊れやすい、高コスト
    /──────\
   / Integr \  Integration Tests (中)
  /  ation   \  - 中速、安定、中コスト
 /────────────\
/   Unit Tests  \  Unit Tests (多)
──────────────────  - 高速、安定、低コスト
```

**原則:** 下に行くほど数を増やす。

- **Unit Test: 70%** - 関数・コンポーネント単体
- **Integration Test: 20%** - 複数コンポーネントの連携
- **E2E Test: 10%** - 実際のユーザーフロー

## Unit Test（単体テスト）

### 定義と目的

**対象:** 1つの関数・コンポーネントを分離してテスト
**目的:** ロジックの正確性を保証

### 実装例: ユーティリティ関数

```typescript
// src/utils/formatPrice.ts
export function formatPrice(price: number, currency: string = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency
  }).format(price);
}

// src/utils/formatPrice.test.ts
import { describe, it, expect } from 'vitest';
import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('should format JPY correctly', () => {
    expect(formatPrice(1000)).toBe('¥1,000');
  });

  it('should format USD correctly', () => {
    expect(formatPrice(1000, 'USD')).toBe('$1,000.00');
  });

  it('should handle zero', () => {
    expect(formatPrice(0)).toBe('¥0');
  });

  it('should handle negative numbers', () => {
    expect(formatPrice(-500)).toBe('-¥500');
  });

  it('should handle large numbers', () => {
    expect(formatPrice(1234567890)).toBe('¥1,234,567,890');
  });
});
```

### 実装例: Reactコンポーネント

```typescript
// src/components/Button.tsx
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
}

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  const baseClass = 'px-4 py-2 rounded font-semibold';
  const variantClass = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  }[variant];

  return (
    <button className={`${baseClass} ${variantClass}`} {...props}>
      {children}
    </button>
  );
}

// src/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should apply primary variant by default', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-500');
  });

  it('should apply secondary variant', () => {
    render(<Button variant="secondary">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-500');
  });

  it('should apply danger variant', () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-500');
  });

  it('should handle onClick', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
```

### Vueコンポーネントのテスト

```vue
<!-- src/components/Counter.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
const increment = () => count.value++;
const decrement = () => count.value--;
const reset = () => count.value = 0;
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">+</button>
    <button @click="decrement">-</button>
    <button @click="reset">Reset</button>
  </div>
</template>
```

```typescript
// src/components/Counter.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Counter from './Counter.vue';

describe('Counter', () => {
  it('should render initial count', () => {
    const wrapper = mount(Counter);
    expect(wrapper.text()).toContain('Count: 0');
  });

  it('should increment count', async () => {
    const wrapper = mount(Counter);
    await wrapper.find('button:nth-child(2)').trigger('click');
    expect(wrapper.text()).toContain('Count: 1');
  });

  it('should decrement count', async () => {
    const wrapper = mount(Counter);
    await wrapper.find('button:nth-child(3)').trigger('click');
    expect(wrapper.text()).toContain('Count: -1');
  });

  it('should reset count', async () => {
    const wrapper = mount(Counter);
    await wrapper.find('button:nth-child(2)').trigger('click');
    await wrapper.find('button:nth-child(2)').trigger('click');
    await wrapper.find('button:nth-child(4)').trigger('click');
    expect(wrapper.text()).toContain('Count: 0');
  });
});
```

### カスタムフック（React Hooks）のテスト

```typescript
// src/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

// src/hooks/useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should use initial value when no stored value', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('should use stored value when available', () => {
    localStorage.setItem('test', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test', 'initial'));
    expect(result.current[0]).toBe('stored');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(localStorage.getItem('test')).toBe(JSON.stringify('updated'));
    expect(result.current[0]).toBe('updated');
  });

  it('should handle objects', () => {
    const { result } = renderHook(() => useLocalStorage('user', { name: 'John' }));

    act(() => {
      result.current[1]({ name: 'Jane' });
    });

    expect(result.current[0]).toEqual({ name: 'Jane' });
  });
});
```

## Integration Test（統合テスト）

### 定義と目的

**対象:** 複数のコンポーネント・モジュールが連携する部分
**目的:** コンポーネント間の連携が正しく動作することを保証

### 実装例: フォーム全体のテスト

```typescript
// src/components/LoginForm.tsx
import { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('すべての項目を入力してください');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'ログイン中...' : 'ログイン'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

// src/components/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should render form fields', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByPlaceholderText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('should show error when fields are empty', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(screen.getByRole('alert')).toHaveTextContent('すべての項目を入力してください');
  });

  it('should call onSubmit with email and password', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText('メールアドレス'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('パスワード'), 'password123');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText('メールアドレス'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('パスワード'), 'password123');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(screen.getByRole('button')).toHaveTextContent('ログイン中...');
    expect(screen.getByPlaceholderText('メールアドレス')).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('ログイン');
    });
  });

  it('should show error when submission fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Login failed'));
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText('メールアドレス'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('パスワード'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('ログインに失敗しました');
    });
  });
});
```

### API連携のテスト（MSW使用）

```typescript
// src/api/users.ts
export async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json();
}

// src/components/UserProfile.tsx
import { useEffect, useState } from 'react';
import { fetchUser } from '../api/users';

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(() => setError('ユーザーの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!user) return null;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// src/components/UserProfile.test.tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { UserProfile } from './UserProfile';

const server = setupServer(
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: '田中太郎',
      email: 'tanaka@example.com'
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserProfile', () => {
  it('should show loading state initially', () => {
    render(<UserProfile userId="123" />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('should display user data after loading', async () => {
    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('田中太郎')).toBeInTheDocument();
      expect(screen.getByText('tanaka@example.com')).toBeInTheDocument();
    });
  });

  it('should show error when API fails', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('ユーザーの取得に失敗しました');
    });
  });
});
```

### 状態管理（Zustand）との統合テスト

```typescript
// src/store/cartStore.ts
import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  total: () => number;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) => {
    set((state) => {
      const existing = state.items.find(i => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    });
  },
  removeItem: (id) => {
    set((state) => ({ items: state.items.filter(i => i.id !== id) }));
  },
  updateQuantity: (id, quantity) => {
    set((state) => ({
      items: state.items.map(i => i.id === id ? { ...i, quantity } : i)
    }));
  },
  total: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
  clear: () => set({ items: [] })
}));

// src/components/Cart.tsx
import { useCartStore } from '../store/cartStore';

export function Cart() {
  const { items, removeItem, updateQuantity, total } = useCartStore();

  return (
    <div>
      <h2>カート</h2>
      {items.length === 0 ? (
        <p>カートは空です</p>
      ) : (
        <>
          {items.map(item => (
            <div key={item.id}>
              <span>{item.name}</span>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                min="1"
              />
              <span>¥{item.price * item.quantity}</span>
              <button onClick={() => removeItem(item.id)}>削除</button>
            </div>
          ))}
          <div>合計: ¥{total()}</div>
        </>
      )}
    </div>
  );
}

// src/components/Cart.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCartStore } from '../store/cartStore';
import { Cart } from './Cart';

describe('Cart', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it('should show empty cart message', () => {
    render(<Cart />);
    expect(screen.getByText('カートは空です')).toBeInTheDocument();
  });

  it('should display cart items', () => {
    useCartStore.getState().addItem({ id: '1', name: '商品A', price: 1000 });
    useCartStore.getState().addItem({ id: '2', name: '商品B', price: 2000 });

    render(<Cart />);

    expect(screen.getByText('商品A')).toBeInTheDocument();
    expect(screen.getByText('商品B')).toBeInTheDocument();
  });

  it('should calculate total correctly', () => {
    useCartStore.getState().addItem({ id: '1', name: '商品A', price: 1000 });
    useCartStore.getState().addItem({ id: '1', name: '商品A', price: 1000 }); // 同じ商品を追加

    render(<Cart />);

    expect(screen.getByText('合計: ¥2000')).toBeInTheDocument();
  });

  it('should remove item from cart', async () => {
    const user = userEvent.setup();
    useCartStore.getState().addItem({ id: '1', name: '商品A', price: 1000 });

    render(<Cart />);

    await user.click(screen.getByRole('button', { name: '削除' }));

    expect(screen.queryByText('商品A')).not.toBeInTheDocument();
    expect(screen.getByText('カートは空です')).toBeInTheDocument();
  });

  it('should update quantity', async () => {
    const user = userEvent.setup();
    useCartStore.getState().addItem({ id: '1', name: '商品A', price: 1000 });

    render(<Cart />);

    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '3');

    expect(screen.getByText('¥3000')).toBeInTheDocument();
    expect(screen.getByText('合計: ¥3000')).toBeInTheDocument();
  });
});
```

## E2E Test（End-to-End テスト）

### 定義と目的

**対象:** 実際のブラウザで、ユーザーが行う操作全体
**目的:** 本番環境に近い状態で、主要フローが動作することを保証

### Playwright実装例

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    // フォーム入力
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    // ログインボタンクリック
    await page.click('button[type="submit"]');

    // ダッシュボードへリダイレクト
    await expect(page).toHaveURL('http://localhost:3000/dashboard');

    // ユーザー名表示を確認
    await expect(page.locator('text=田中太郎')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // エラーメッセージ表示
    await expect(page.locator('role=alert')).toHaveText('ログインに失敗しました');

    // ログインページにとどまる
    await expect(page).toHaveURL('http://localhost:3000/login');
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await page.click('text=新規登録はこちら');

    await expect(page).toHaveURL('http://localhost:3000/signup');
  });
});
```

### ショッピングフロー全体のE2Eテスト

```typescript
// tests/e2e/shopping.spec.ts
import { test, expect } from '@playwright/test';

test('should complete shopping flow', async ({ page }) => {
  // 1. トップページへ
  await page.goto('http://localhost:3000');

  // 2. 商品検索
  await page.fill('input[placeholder="商品を検索"]', 'ノートPC');
  await page.press('input[placeholder="商品を検索"]', 'Enter');

  // 3. 検索結果から商品選択
  await page.click('text=ThinkPad X1 Carbon');

  // 4. 商品詳細ページで「カートに追加」
  await page.click('button:has-text("カートに追加")');

  // 5. カートページへ
  await page.click('a:has-text("カート")');

  // 6. 数量変更
  await page.fill('input[type="number"]', '2');

  // 7. 合計金額確認
  await expect(page.locator('text=/合計: ¥[0-9,]+/')).toBeVisible();

  // 8. チェックアウト
  await page.click('button:has-text("購入手続きへ")');

  // 9. 配送先入力
  await page.fill('input[name="name"]', '田中太郎');
  await page.fill('input[name="address"]', '東京都渋谷区1-2-3');
  await page.fill('input[name="phone"]', '090-1234-5678');

  // 10. 支払い方法選択
  await page.click('input[value="credit-card"]');

  // 11. 注文確定
  await page.click('button:has-text("注文を確定する")');

  // 12. 完了ページ表示
  await expect(page).toHaveURL(/\/order\/complete/);
  await expect(page.locator('text=ご注文ありがとうございます')).toBeVisible();
});
```

### スクリーンショット比較テスト

```typescript
// tests/e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test('should match visual regression', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // ページ全体のスクリーンショット
  await expect(page).toHaveScreenshot('homepage.png');

  // 特定要素のスクリーンショット
  const header = page.locator('header');
  await expect(header).toHaveScreenshot('header.png');
});
```

## テストカバレッジ

### カバレッジ計測設定

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
```

```bash
# カバレッジ計測
npm run test -- --coverage

# レポート確認
open coverage/index.html
```

### カバレッジの目標設定

```typescript
// 理想的なカバレッジ目標
{
  "lines": 80,        // 全行の80%
  "functions": 80,    // 全関数の80%
  "branches": 75,     // 全分岐の75%
  "statements": 80    // 全ステートメントの80%
}
```

**注意:** 100%を目指す必要はありません。テストのコスパを考えましょう。

## CI/CDでの自動テスト

### GitHub Actions設定

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run unit tests
      run: npm run test:unit

    - name: Run integration tests
      run: npm run test:integration

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright
      run: npx playwright install --with-deps

    - name: Run E2E tests
      run: npm run test:e2e

    - name: Upload Playwright report
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: playwright-report
        path: playwright-report/
```

## テストのベストプラクティス

### 1. AAA パターン

```typescript
test('should add item to cart', () => {
  // Arrange（準備）
  const cart = new Cart();
  const item = { id: '1', name: '商品A', price: 1000 };

  // Act（実行）
  cart.addItem(item);

  // Assert（検証）
  expect(cart.items).toHaveLength(1);
  expect(cart.total()).toBe(1000);
});
```

### 2. テストの独立性

```typescript
// ❌ 悪い例: テスト間で状態を共有
let user;

test('create user', () => {
  user = createUser();
  expect(user).toBeDefined();
});

test('update user', () => {
  user.name = 'Updated'; // 前のテストに依存
  expect(user.name).toBe('Updated');
});

// ✅ 良い例: 各テストが独立
test('create user', () => {
  const user = createUser();
  expect(user).toBeDefined();
});

test('update user', () => {
  const user = createUser();
  user.name = 'Updated';
  expect(user.name).toBe('Updated');
});
```

### 3. 意味のあるテスト名

```typescript
// ❌ 悪い例
test('test1', () => { ... });
test('it works', () => { ... });

// ✅ 良い例
test('should return empty array when no items match filter', () => { ... });
test('should throw error when email is invalid', () => { ... });
```

### 4. モック・スタブの適切な使用

```typescript
// src/services/emailService.ts
export async function sendEmail(to: string, subject: string, body: string) {
  // 実際のメール送信処理
}

// src/services/userService.ts
import { sendEmail } from './emailService';

export async function registerUser(email: string, password: string) {
  const user = await db.users.create({ email, password });
  await sendEmail(user.email, 'Welcome', 'Welcome to our service!');
  return user;
}

// src/services/userService.test.ts
import { vi } from 'vitest';
import { registerUser } from './userService';
import * as emailService from './emailService';

vi.mock('./emailService');

test('should send welcome email after registration', async () => {
  const sendEmailMock = vi.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);

  await registerUser('test@example.com', 'password123');

  expect(sendEmailMock).toHaveBeenCalledWith(
    'test@example.com',
    'Welcome',
    'Welcome to our service!'
  );
});
```

## まとめ

効果的なテスト戦略のポイント:

### テストピラミッドを守る
- Unit: 70% - 高速・安定・低コスト
- Integration: 20% - 中速・中コスト
- E2E: 10% - 遅い・高コスト

### 優先順位
1. ビジネスロジック（Unit）
2. ユーザーフロー（Integration/E2E）
3. エッジケース（Unit）

### ツール選択（2026年）
- **Unit/Integration:** Vitest（高速）
- **E2E:** Playwright（安定）
- **API Mock:** MSW
- **Coverage:** V8

### CI/CD統合
- プルリクエストで自動実行
- カバレッジ可視化
- E2Eは本番デプロイ前に実行

テスト開発に役立つツールを探しているなら、[DevToolBox](https://devtoolbox.app)もチェックしてみてください。テストデータのJSON生成や正規表現テスターなど、開発効率を上げるツールが揃っています。
