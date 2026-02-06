---
title: "フロントエンドテスト戦略2026 — テストピラミッドの実践"
description: "モダンフロントエンド開発におけるテスト戦略の完全ガイド。Vitest、Testing Library、Playwright、Storybookを組み合わせた実践的なテストピラミッドとMSWによるAPIモックを解説します。"
pubDate: "2026-02-05"
tags: ["Testing", "Vitest", "Playwright", "Storybook", "フロントエンド"]
---

## フロントエンドテストの課題

フロントエンドテストには、以下のような課題があります。

- UIの変更に脆弱なテスト
- 遅いE2Eテストによる開発速度の低下
- APIへの依存によるテストの不安定性
- モックの複雑さ
- テストコードのメンテナンスコスト

これらを解決するには、適切なテスト戦略とツールの選択が不可欠です。

## テストピラミッド

```
        /\
       /  \
      / E2E \        少ない（重要なフロー）
     /--------\
    /          \
   / Integration \   中程度（コンポーネント統合）
  /--------------\
 /                \
/  Unit Tests      \  多い（ロジック、ユーティリティ）
--------------------
```

### 理想的な比率

- **Unit Tests**: 70% - 高速、安定、メンテナンス容易
- **Integration Tests**: 20% - コンポーネント間の連携
- **E2E Tests**: 10% - クリティカルなユーザーフロー

## セットアップ

### Vitest + Testing Library

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.config.*', '**/node_modules/**'],
    },
  },
})
```

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

### Playwright

```bash
pnpm create playwright
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
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
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

## Unit Testing

### ユーティリティ関数のテスト

```typescript
// src/lib/format.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount)
}

// src/lib/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency } from './format'

describe('formatCurrency', () => {
  it('正の数値を正しくフォーマットする', () => {
    expect(formatCurrency(1000)).toBe('¥1,000')
  })

  it('0を正しくフォーマットする', () => {
    expect(formatCurrency(0)).toBe('¥0')
  })

  it('小数点以下を正しく処理する', () => {
    expect(formatCurrency(1234.56)).toBe('¥1,235')
  })
})
```

### カスタムHooksのテスト

```typescript
// src/hooks/use-toggle.ts
import { useState, useCallback } from 'react'

export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue)
  const toggle = useCallback(() => setValue(v => !v), [])
  const setTrue = useCallback(() => setValue(true), [])
  const setFalse = useCallback(() => setValue(false), [])

  return { value, toggle, setTrue, setFalse }
}

// src/hooks/use-toggle.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useToggle } from './use-toggle'

describe('useToggle', () => {
  it('初期値がfalseの場合', () => {
    const { result } = renderHook(() => useToggle())
    expect(result.current.value).toBe(false)
  })

  it('toggleで値が反転する', () => {
    const { result } = renderHook(() => useToggle())

    act(() => {
      result.current.toggle()
    })

    expect(result.current.value).toBe(true)

    act(() => {
      result.current.toggle()
    })

    expect(result.current.value).toBe(false)
  })
})
```

## コンポーネントテスト

### 基本的なコンポーネント

```typescript
// src/components/button.tsx
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  )
}

// src/components/button.test.tsx
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('子要素をレンダリングする', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('クリックイベントを処理する', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click</Button>)

    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disabledの時はクリックできない', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick} disabled>Click</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('variantに応じたclassNameを持つ', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-primary')

    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-secondary')
  })
})
```

### フォームのテスト

```typescript
// src/components/login-form.tsx
'use client'

import { useState } from 'react'

interface LoginFormProps {
  onSubmit: (data: { email: string; password: string }) => Promise<void>
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await onSubmit({ email, password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  )
}

// src/components/login-form.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { LoginForm } from './login-form'

describe('LoginForm', () => {
  it('フォーム入力とサブミット', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<LoginForm onSubmit={handleSubmit} />)

    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('エラーメッセージを表示する', async () => {
    const handleSubmit = vi.fn().mockRejectedValue(new Error('認証に失敗しました'))
    const user = userEvent.setup()

    render(<LoginForm onSubmit={handleSubmit} />)

    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('認証に失敗しました')
    })
  })

  it('送信中はボタンが無効化される', async () => {
    const handleSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
    const user = userEvent.setup()

    render(<LoginForm onSubmit={handleSubmit} />)

    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'password123')

    const button = screen.getByRole('button')
    await user.click(button)

    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('ログイン中...')

    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })
})
```

## MSWによるAPIモック

### セットアップ

```bash
pnpm add -D msw
```

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/user', () => {
    return HttpResponse.json({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
    })
  }),

  http.post('/api/login', async ({ request }) => {
    const { email, password } = await request.json()

    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        token: 'mock-token',
        user: { id: '1', name: 'Test User' },
      })
    }

    return HttpResponse.json(
      { message: '認証に失敗しました' },
      { status: 401 }
    )
  }),
]

// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// vitest.setup.ts に追加
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### テストでの使用

```typescript
// src/lib/api.test.ts
import { describe, it, expect } from 'vitest'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import { fetchUser } from './api'

describe('fetchUser', () => {
  it('ユーザー情報を取得する', async () => {
    const user = await fetchUser('1')

    expect(user).toEqual({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
    })
  })

  it('エラー時に例外を投げる', async () => {
    server.use(
      http.get('/api/user', () => {
        return HttpResponse.json(
          { message: 'Not found' },
          { status: 404 }
        )
      })
    )

    await expect(fetchUser('999')).rejects.toThrow('Not found')
  })
})
```

## E2Eテスト（Playwright）

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test.describe('ログインフロー', () => {
  test('正常なログイン', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('不正な認証情報', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'wrong-password')
    await page.click('button[type="submit"]')

    await expect(page.locator('[role="alert"]')).toContainText('認証に失敗しました')
    await expect(page).toHaveURL('/login')
  })
})

// e2e/checkout.spec.ts
test.describe('購入フロー', () => {
  test('商品の購入', async ({ page }) => {
    await page.goto('/products')

    await page.click('text=商品1')
    await page.click('button:has-text("カートに追加")')
    await page.click('a:has-text("カート")')

    await expect(page.locator('.cart-item')).toHaveCount(1)

    await page.click('button:has-text("購入手続き")')

    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="address"]', '東京都渋谷区...')

    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/order\/\d+/)
    await expect(page.locator('h1')).toContainText('注文完了')
  })
})
```

## CI/CDでの実行

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test:e2e

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## まとめ

効果的なフロントエンドテスト戦略には、以下が重要です。

- テストピラミッドに従った適切なバランス
- Vitestによる高速なUnit/Integration Tests
- MSWによる安定したAPIモック
- PlaywrightによるクリティカルパスのE2Eテスト
- CI/CDへの統合

これらを組み合わせることで、高品質なフロントエンドアプリケーションを効率的に開発できます。
