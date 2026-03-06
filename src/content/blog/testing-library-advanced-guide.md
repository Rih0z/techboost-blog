---
title: 'Testing Library上級テクニック2026'
description: 'Testing Libraryの上級テクニックを徹底解説。ユーザーイベントシミュレーション、非同期処理のテスト、カスタムレンダー関数、アクセシビリティテスト、MSW連携を紹介。Testing・React・TypeScriptに関する実践情報。'
pubDate: '2026-02-05'
tags: ['Testing', 'React', 'TypeScript', 'アクセシビリティ']
---

Testing Libraryは、ユーザー視点でのテストを可能にするライブラリです。本記事では、実践的な上級テクニックを徹底解説します。

## 目次

1. Testing Libraryの哲学
2. ユーザーイベントのシミュレーション
3. 非同期処理のテスト
4. カスタムレンダー関数
5. アクセシビリティテスト
6. MSWによるAPIモック
7. パフォーマンステスト
8. 実践パターン

## Testing Libraryの哲学

### テストの原則

```typescript
/**
 * Testing Libraryの基本原則
 *
 * 1. ユーザーが見るものをテストする
 *    - 実装の詳細ではなく、UIの振る舞い
 *
 * 2. アクセシビリティを重視
 *    - role、label、textで要素を取得
 *
 * 3. 実際のユーザー操作に近い形でテスト
 *    - user-event を使用
 *
 * 4. 非同期処理を適切に扱う
 *    - waitFor、findBy クエリ
 */

// ❌ 悪い例: 実装の詳細に依存
test('bad example', () => {
  const { container } = render(<Component />)
  const button = container.querySelector('.submit-button')
  expect(button?.textContent).toBe('Submit')
})

// ✅ 良い例: ユーザー視点
test('good example', () => {
  render(<Component />)
  const button = screen.getByRole('button', { name: /submit/i })
  expect(button).toBeInTheDocument()
})
```

### クエリの優先順位

```typescript
import { render, screen } from '@testing-library/react'

function LoginForm() {
  return (
    <form>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" />

      <label htmlFor="password">Password</label>
      <input id="password" type="password" />

      <button type="submit">Log in</button>
    </form>
  )
}

test('query priority examples', () => {
  render(<LoginForm />)

  // 1. getByRole (最優先)
  const submitButton = screen.getByRole('button', { name: /log in/i })
  const emailInput = screen.getByRole('textbox', { name: /email/i })

  // 2. getByLabelText (フォーム要素)
  const passwordInput = screen.getByLabelText(/password/i)

  // 3. getByPlaceholderText
  // 4. getByText
  // 5. getByDisplayValue
  // 6. getByAltText (画像)
  // 7. getByTitle

  // 8. getByTestId (最終手段)
  // const element = screen.getByTestId('custom-element')
})
```

## ユーザーイベントのシミュレーション

### user-eventの基本

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  )
}

test('user interactions', async () => {
  // user-eventのセットアップ
  const user = userEvent.setup()

  render(<Counter />)

  // クリック
  const incrementButton = screen.getByRole('button', { name: /increment/i })
  await user.click(incrementButton)

  expect(screen.getByText(/count: 1/i)).toBeInTheDocument()

  // ダブルクリック
  await user.dblClick(incrementButton)

  expect(screen.getByText(/count: 3/i)).toBeInTheDocument()

  // リセット
  const resetButton = screen.getByRole('button', { name: /reset/i })
  await user.click(resetButton)

  expect(screen.getByText(/count: 0/i)).toBeInTheDocument()
})
```

### フォーム入力

```typescript
function SignupForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="username">Username</label>
      <input
        id="username"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
      />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
      />

      <label htmlFor="confirmPassword">Confirm Password</label>
      <input
        id="confirmPassword"
        type="password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
      />

      <label>
        <input
          type="checkbox"
          checked={formData.agreeToTerms}
          onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
        />
        I agree to the terms and conditions
      </label>

      <button type="submit">Sign up</button>
    </form>
  )
}

test('form submission', async () => {
  const user = userEvent.setup()
  const handleSubmit = vi.fn()

  render(<SignupForm onSubmit={handleSubmit} />)

  // テキスト入力
  const usernameInput = screen.getByLabelText(/username/i)
  await user.type(usernameInput, 'johndoe')
  expect(usernameInput).toHaveValue('johndoe')

  // メール入力
  const emailInput = screen.getByLabelText(/email/i)
  await user.type(emailInput, 'john@example.com')
  expect(emailInput).toHaveValue('john@example.com')

  // パスワード入力
  const passwordInput = screen.getByLabelText(/^password$/i)
  await user.type(passwordInput, 'SecurePass123!')

  const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
  await user.type(confirmPasswordInput, 'SecurePass123!')

  // チェックボックス
  const termsCheckbox = screen.getByRole('checkbox', {
    name: /i agree to the terms/i
  })
  await user.click(termsCheckbox)
  expect(termsCheckbox).toBeChecked()

  // フォーム送信
  const submitButton = screen.getByRole('button', { name: /sign up/i })
  await user.click(submitButton)

  expect(handleSubmit).toHaveBeenCalledWith({
    username: 'johndoe',
    email: 'john@example.com',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    agreeToTerms: true
  })
})
```

### キーボード操作

```typescript
function SearchBox({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(query)
    }
    if (e.key === 'Escape') {
      setQuery('')
    }
  }

  return (
    <input
      type="search"
      placeholder="Search..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  )
}

test('keyboard interactions', async () => {
  const user = userEvent.setup()
  const handleSearch = vi.fn()

  render(<SearchBox onSearch={handleSearch} />)

  const searchInput = screen.getByPlaceholderText(/search/i)

  // 入力
  await user.type(searchInput, 'React Testing Library')
  expect(searchInput).toHaveValue('React Testing Library')

  // Enterキー
  await user.keyboard('{Enter}')
  expect(handleSearch).toHaveBeenCalledWith('React Testing Library')

  // Escapeキー
  await user.keyboard('{Escape}')
  expect(searchInput).toHaveValue('')

  // Tab移動
  await user.tab()
  // 次の要素にフォーカス移動

  // Shift+Tab
  await user.tab({ shift: true })
  // 前の要素にフォーカス移動
})
```

### ドラッグ&ドロップ

```typescript
function DragDropList({ items }: { items: string[] }) {
  const [list, setList] = useState(items)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', index.toString())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'))

    const newList = [...list]
    const [removed] = newList.splice(dragIndex, 1)
    newList.splice(dropIndex, 0, removed)

    setList(newList)
  }

  return (
    <ul>
      {list.map((item, index) => (
        <li
          key={item}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

test('drag and drop', async () => {
  const user = userEvent.setup()
  const items = ['Item 1', 'Item 2', 'Item 3']

  render(<DragDropList items={items} />)

  const items = screen.getAllByRole('listitem')
  const firstItem = items[0]
  const thirdItem = items[2]

  // ドラッグ&ドロップ
  await user.pointer([
    { keys: '[MouseLeft>]', target: firstItem },
    { coords: { x: 0, y: 100 } },
    { keys: '[/MouseLeft]', target: thirdItem }
  ])

  // 順序が変更されたことを確認
  const updatedItems = screen.getAllByRole('listitem')
  expect(updatedItems[0]).toHaveTextContent('Item 2')
  expect(updatedItems[1]).toHaveTextContent('Item 3')
  expect(updatedItems[2]).toHaveTextContent('Item 1')
})
```

## 非同期処理のテスト

### waitForによる待機

```typescript
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div>Loading...</div>
  if (!user) return <div>User not found</div>

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}

test('async data loading', async () => {
  // モックAPI
  const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' }
  vi.mocked(fetchUser).mockResolvedValue(mockUser)

  render(<UserProfile userId="1" />)

  // 初期状態
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  // データ読み込み完了を待つ
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  // データが表示される
  expect(screen.getByText('John Doe')).toBeInTheDocument()
  expect(screen.getByText('john@example.com')).toBeInTheDocument()
})
```

### findByクエリ

```typescript
// findBy = getBy + waitFor の組み合わせ
test('async with findBy', async () => {
  const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' }
  vi.mocked(fetchUser).mockResolvedValue(mockUser)

  render(<UserProfile userId="1" />)

  // findBy は要素が表示されるまで待つ
  const userName = await screen.findByText('John Doe')
  expect(userName).toBeInTheDocument()

  // 同時に複数の要素を取得
  const [name, email] = await Promise.all([
    screen.findByText('John Doe'),
    screen.findByText('john@example.com')
  ])

  expect(name).toBeInTheDocument()
  expect(email).toBeInTheDocument()
})
```

### エラーハンドリング

```typescript
function DataFetcher({ url }: { url: string }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [url])

  if (loading) return <div>Loading...</div>
  if (error) return <div role="alert">Error: {error.message}</div>
  if (!data) return null

  return <div>{JSON.stringify(data)}</div>
}

test('error handling', async () => {
  // エラーをモック
  const errorMessage = 'Network error'
  global.fetch = vi.fn().mockRejectedValue(new Error(errorMessage))

  render(<DataFetcher url="/api/data" />)

  // エラーメッセージが表示されるまで待つ
  const errorElement = await screen.findByRole('alert')
  expect(errorElement).toHaveTextContent(errorMessage)
})
```

### タイムアウトの調整

```typescript
test('slow API response', async () => {
  // 5秒かかるAPI
  vi.mocked(fetchUser).mockImplementation(() =>
    new Promise(resolve =>
      setTimeout(() => resolve(mockUser), 5000)
    )
  )

  render(<UserProfile userId="1" />)

  // デフォルト1秒→5秒に延長
  const userName = await screen.findByText('John Doe', {}, {
    timeout: 6000
  })

  expect(userName).toBeInTheDocument()
})

// またはwaitForのタイムアウト
test('with waitFor timeout', async () => {
  render(<UserProfile userId="1" />)

  await waitFor(
    () => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    },
    { timeout: 6000 }
  )
})
```

## カスタムレンダー関数

### プロバイダーのラップ

```typescript
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  queryClient?: QueryClient
  theme?: 'light' | 'dark'
  user?: User | null
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialEntries = ['/'],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    }),
    theme = 'light',
    user = null,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider initialUser={user}>
            <ThemeProvider initialTheme={theme}>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// 使用例
test('component with providers', () => {
  const user = { id: '1', name: 'John Doe' }

  renderWithProviders(<MyComponent />, {
    user,
    theme: 'dark',
    initialEntries: ['/dashboard']
  })

  expect(screen.getByText('John Doe')).toBeInTheDocument()
})
```

### React Query対応

```typescript
// test-utils.tsx
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // テスト中はリトライしない
        retry: false,
        // キャッシュを無効化
        cacheTime: 0,
        staleTime: 0
      }
    }
  })
}

export function renderWithQueryClient(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const testQueryClient = createTestQueryClient()

  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>,
    options
  )
}

// 使用例
test('query test', async () => {
  const mockData = { id: '1', title: 'Test Post' }
  server.use(
    http.get('/api/posts/1', () => HttpResponse.json(mockData))
  )

  renderWithQueryClient(<PostDetail postId="1" />)

  expect(await screen.findByText('Test Post')).toBeInTheDocument()
})
```

### Next.js対応

```typescript
// test-utils.tsx
import { render } from '@testing-library/react'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context'

export function renderWithRouter(
  ui: React.ReactElement,
  {
    push = vi.fn(),
    replace = vi.fn(),
    refresh = vi.fn(),
    back = vi.fn(),
    forward = vi.fn(),
    prefetch = vi.fn(),
    ...renderOptions
  } = {}
) {
  const mockRouter = {
    push,
    replace,
    refresh,
    back,
    forward,
    prefetch
  }

  return render(
    <AppRouterContext.Provider value={mockRouter}>
      {ui}
    </AppRouterContext.Provider>,
    renderOptions
  )
}

// 使用例
test('navigation', async () => {
  const user = userEvent.setup()
  const push = vi.fn()

  renderWithRouter(<NavigationComponent />, { push })

  const link = screen.getByRole('link', { name: /dashboard/i })
  await user.click(link)

  expect(push).toHaveBeenCalledWith('/dashboard')
})
```

## アクセシビリティテスト

### jest-axeによる自動テスト

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />)

  const results = await axe(container)

  expect(results).toHaveNoViolations()
})

// 特定のルールを無効化
test('with disabled rules', async () => {
  const { container } = render(<MyComponent />)

  const results = await axe(container, {
    rules: {
      // color-contrastルールを無効化
      'color-contrast': { enabled: false }
    }
  })

  expect(results).toHaveNoViolations()
})
```

### ロールベースのテスト

```typescript
function AccessibleForm() {
  return (
    <form>
      <label htmlFor="name">Name</label>
      <input
        id="name"
        type="text"
        aria-required="true"
        aria-describedby="name-help"
      />
      <span id="name-help">Enter your full name</span>

      <button type="submit">Submit</button>
    </form>
  )
}

test('form accessibility', () => {
  render(<AccessibleForm />)

  // ロールでアクセス
  const nameInput = screen.getByRole('textbox', { name: /name/i })
  expect(nameInput).toHaveAccessibleName('Name')
  expect(nameInput).toHaveAccessibleDescription('Enter your full name')
  expect(nameInput).toBeRequired()

  const submitButton = screen.getByRole('button', { name: /submit/i })
  expect(submitButton).toBeInTheDocument()
})
```

### キーボードナビゲーション

```typescript
function Modal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div role="dialog" aria-modal="true">
      <h2 id="modal-title">Modal Title</h2>
      <p id="modal-description">Modal content</p>
      <button onClick={onClose}>Close</button>
    </div>
  )
}

test('keyboard navigation', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()

  render(<Modal isOpen={true} onClose={onClose} />)

  // Escapeキーで閉じる
  await user.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalled()
})

test('focus trap', async () => {
  const user = userEvent.setup()

  render(<Modal isOpen={true} onClose={vi.fn()} />)

  const closeButton = screen.getByRole('button', { name: /close/i })
  closeButton.focus()

  expect(closeButton).toHaveFocus()

  // Tabキーでフォーカス移動
  await user.tab()

  // モーダル内にフォーカスが留まる
  expect(document.activeElement).not.toBe(document.body)
})
```

## MSWによるAPIモック

### セットアップ

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  // GET /api/users
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Smith' }
    ])
  }),

  // GET /api/users/:id
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id,
      name: `User ${id}`
    })
  }),

  // POST /api/users
  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { id: '3', ...body },
      { status: 201 }
    )
  })
]

// mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// setup.ts
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### テストでの使用

```typescript
test('fetch users', async () => {
  render(<UserList />)

  // MSWがリクエストをインターセプト
  expect(await screen.findByText('John Doe')).toBeInTheDocument()
  expect(screen.getByText('Jane Smith')).toBeInTheDocument()
})

test('error handling', async () => {
  // テスト固有のハンドラー
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      )
    })
  )

  render(<UserList />)

  expect(await screen.findByText(/error/i)).toBeInTheDocument()
})
```

## まとめ

Testing Libraryの上級テクニックを活用することで、より堅牢で保守性の高いテストを書くことができます。

**主要ポイント**:

1. **ユーザー視点**: 実装ではなくUIをテスト
2. **user-event**: 実際のユーザー操作をシミュレーション
3. **非同期処理**: waitFor、findByで適切に待機
4. **カスタムレンダー**: プロバイダーを一元管理
5. **アクセシビリティ**: jest-axeで自動チェック
6. **MSW**: APIモックを簡潔に

**2026年のベストプラクティス**:

- アクセシビリティを最優先
- 実装の詳細に依存しない
- 非同期処理を適切に扱う
- カスタムレンダーで DRY 原則を守る
- MSWでリアルなAPIモック

Testing Libraryを活用して、信頼性の高いテストスイートを構築しましょう。
