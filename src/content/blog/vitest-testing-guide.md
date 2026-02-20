---
title: 'Vitest + Testing Library 実践ガイド — React/Next.jsアプリのテスト戦略を完全解説'
description: 'VitestとReact Testing Libraryを使ったモダンなフロントエンドテスト手法を解説。ユニットテスト・統合テスト・E2Eテストの使い分け、非同期処理・APIモック・カスタムフックのテスト、CI/CD連携まで実践コード付き。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['Vitest', 'Testing Library', 'テスト', 'React', 'Next.js']
---

テストを書くことは「後から書くもの」ではなく、高品質なアプリを継続的に維持するための**必須インフラ**です。本記事では、VitestとReact Testing Libraryを使ったモダンなテスト戦略を体系的に解説します。

## なぜVitestか

JestからVitestへの移行が進んでいる理由は明確です：

| 比較軸 | Jest | Vitest |
|--------|------|--------|
| 実行速度 | 遅い（CommonJSトランスフォーム） | **高速**（Viteパイプライン活用） |
| 設定 | 複雑（babel設定必要） | **ゼロ設定**（vite.config.tsと共有） |
| ESM対応 | 部分的（transformIgnore要設定） | **ネイティブESM** |
| TypeScript | ts-jest等が必要 | **組み込みサポート** |
| Watch Mode | 遅い | **インクリメンタル更新** |

---

## セットアップ

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

```ts
// vite.config.ts / vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
})
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom'
```

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## テストの3層構造

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx        ← ユニットテスト
├── hooks/
│   ├── useCart.ts
│   └── useCart.test.ts        ← フックテスト
├── features/
│   ├── checkout/
│   │   ├── CheckoutForm.tsx
│   │   └── CheckoutForm.test.tsx ← 統合テスト
└── e2e/
    └── checkout.spec.ts       ← E2E（Playwright）
```

---

## ユニットテスト — コンポーネント

### 基本的なレンダリングテスト

```tsx
// components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('テキストが正しく表示される', () => {
    render(<Button>クリック</Button>)
    expect(screen.getByRole('button', { name: 'クリック' })).toBeInTheDocument()
  })

  it('クリックでonClickが呼ばれる', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<Button onClick={handleClick}>送信</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('disabled時はクリックされない', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<Button onClick={handleClick} disabled>送信</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('loading状態が正しく表示される', () => {
    render(<Button loading>送信</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByLabelText('読み込み中')).toBeInTheDocument()
  })
})
```

### フォームのテスト

```tsx
// components/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('必須フィールドの未入力でエラー表示', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument()
    expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument()
  })

  it('正しい入力でonSubmitが呼ばれる', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()
    render(<LoginForm onSubmit={handleSubmit} />)

    await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'password123')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })
})
```

---

## カスタムフックのテスト

```tsx
// hooks/useCounter.test.ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCounter } from './useCounter'

describe('useCounter', () => {
  it('初期値が正しい', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })

  it('incrementで増加', () => {
    const { result } = renderHook(() => useCounter())

    act(() => result.current.increment())
    expect(result.current.count).toBe(1)

    act(() => result.current.increment())
    expect(result.current.count).toBe(2)
  })

  it('resetで初期値に戻る', () => {
    const { result } = renderHook(() => useCounter(5))

    act(() => result.current.increment())
    act(() => result.current.reset())

    expect(result.current.count).toBe(5)
  })
})
```

---

## APIモック — vi.mock と MSW

### vi.mockによるシンプルなモック

```tsx
// features/user/UserProfile.test.tsx
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { UserProfile } from './UserProfile'

// モジュール全体をモック
vi.mock('@/lib/api', () => ({
  fetchUser: vi.fn(),
}))

import { fetchUser } from '@/lib/api'
const mockFetchUser = vi.mocked(fetchUser)

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ユーザー情報を正しく表示', async () => {
    mockFetchUser.mockResolvedValue({
      id: '1',
      name: '山田太郎',
      email: 'yamada@example.com',
    })

    render(<UserProfile userId="1" />)

    // ローディング中
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    // データ取得後
    await waitFor(() => {
      expect(screen.getByText('山田太郎')).toBeInTheDocument()
    })
    expect(screen.getByText('yamada@example.com')).toBeInTheDocument()
  })

  it('エラー時のフォールバック表示', async () => {
    mockFetchUser.mockRejectedValue(new Error('Network Error'))

    render(<UserProfile userId="1" />)

    await waitFor(() => {
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
    })
  })
})
```

### MSW（Mock Service Worker）でリアルなAPIモック

```ts
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id,
      name: 'テストユーザー',
      email: 'test@example.com',
    })
  }),

  http.post('/api/posts', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { id: 'new-post-id', ...body },
      { status: 201 }
    )
  }),
]
```

```ts
// src/test/setup.ts
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## 非同期処理のテスト

```tsx
// 複雑な非同期シナリオ
describe('CheckoutForm', () => {
  it('支払い完了フローのテスト', async () => {
    const user = userEvent.setup()
    const { container } = render(<CheckoutForm />)

    // カード番号入力
    await user.type(screen.getByLabelText('カード番号'), '4242424242424242')
    await user.type(screen.getByLabelText('有効期限'), '12/26')
    await user.type(screen.getByLabelText('CVC'), '123')

    // 送信
    await user.click(screen.getByRole('button', { name: '支払う' }))

    // 処理中の表示確認
    expect(screen.getByText('処理中...')).toBeInTheDocument()

    // 完了後のリダイレクト確認
    await waitFor(() => {
      expect(screen.getByText('お支払いが完了しました')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
```

---

## アクセシビリティテスト — jest-axe

```tsx
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

describe('アクセシビリティテスト', () => {
  it('NavigationコンポーネントがWCAG準拠', async () => {
    const { container } = render(<Navigation />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

---

## カバレッジ目標と戦略

実務でのカバレッジ目標：

| レイヤー | 目標カバレッジ | 優先度 |
|---------|-------------|--------|
| ビジネスロジック（hooks、utils） | 90%+ | 最高 |
| UIコンポーネント（条件分岐） | 80%+ | 高 |
| Page コンポーネント | 70%+ | 中 |
| 静的コンポーネント | 60%+ | 低 |

```bash
# カバレッジレポート生成
npm run test:coverage

# HTML レポートでブランチ別カバレッジを確認
open coverage/index.html
```

---

## CI/CDへの組み込み

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

---

## まとめ：テストを「書きたくなる」工夫

1. **テストを最初に書く（TDD）**: 仕様が明確になる
2. **describe/itの命名を日本語に**: 意図が伝わりやすい
3. **Testing Libraryの哲学を守る**: 実装でなくユーザー行動をテスト
4. **`screen.debug()`でDOMを確認**: テストが失敗したら即確認
5. **`--watch`モードを常用**: コード変更時に即フィードバック

テストは書いた瞬間から資産になります。継続的なリファクタリングを安心して行えるのは、テストが支えているからです。
