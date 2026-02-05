---
title: 'Vitestで高速テスト駆動開発 - 2026年版完全ガイド'
description: 'Vite時代の超高速テストフレームワークVitestの実践ガイド。セットアップからモック、カバレッジ、CI連携まで網羅的に解説します。'
pubDate: 'Feb 05 2026'
tags: ['Vitest', 'Testing', 'Vite', 'TDD', 'JavaScript']
---

Viteエコシステムの一員として爆速のテスト体験を提供するVitestは、2026年現在、フロントエンドテストのデファクトスタンダードとなりつつあります。Jest互換のAPIを持ちながら、圧倒的な速度を実現するVitestの魅力と実践方法を徹底解説します。

## Vitestとは？

VitestはViteをベースにした超高速なユニットテストフレームワークです。

### 主な特徴

- **爆速起動**: Viteの恩恵で即座にテスト開始
- **HMR対応**: ファイル変更を検知して高速再実行
- **Jest互換API**: 既存のJestテストをほぼそのまま移行可能
- **ESM/TypeScriptネイティブサポート**: 追加設定不要
- **UI付属**: ブラウザベースのテストUIを標準搭載
- **並列実行**: デフォルトで並列テストをサポート

```bash
# パフォーマンス比較（実測値）
Jest:   テスト500件 → 約45秒
Vitest: テスト500件 → 約8秒（5倍以上高速）
```

## セットアップ

### 基本インストール

```bash
# Vite + Vitestプロジェクトを新規作成
npm create vite@latest my-app -- --template react-ts
cd my-app

# Vitestをインストール
npm install -D vitest @vitest/ui
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // グローバルAPIを有効化（describe, it, expectなど）
    globals: true,

    // DOM環境をシミュレート
    environment: 'jsdom',

    // セットアップファイル
    setupFiles: ['./src/test/setup.ts'],

    // カバレッジ設定
    coverage: {
      provider: 'v8', // または 'istanbul'
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },

    // 並列実行の設定
    threads: true,
    maxThreads: 4,

    // タイムアウト設定
    testTimeout: 10000,
  },
})
```

### セットアップファイル (src/test/setup.ts)

```typescript
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import matchers from '@testing-library/jest-dom/matchers'

// カスタムマッチャーを追加
expect.extend(matchers)

// 各テスト後にクリーンアップ
afterEach(() => {
  cleanup()
})

// グローバルモック
global.fetch = vi.fn()
```

### package.jsonスクリプト

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 基本的なテストの書き方

### シンプルな関数のテスト

```typescript
// src/utils/calc.ts
export function add(a: number, b: number): number {
  return a + b
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero')
  return a / b
}
```

```typescript
// src/utils/calc.test.ts
import { describe, it, expect } from 'vitest'
import { add, divide } from './calc'

describe('calc utils', () => {
  describe('add', () => {
    it('正の数を加算できる', () => {
      expect(add(2, 3)).toBe(5)
    })

    it('負の数を加算できる', () => {
      expect(add(-1, -2)).toBe(-3)
    })

    it('ゼロを加算できる', () => {
      expect(add(5, 0)).toBe(5)
    })
  })

  describe('divide', () => {
    it('除算できる', () => {
      expect(divide(10, 2)).toBe(5)
    })

    it('ゼロ除算でエラーをスローする', () => {
      expect(() => divide(10, 0)).toThrow('Division by zero')
    })
  })
})
```

### 非同期処理のテスト

```typescript
// src/api/user.ts
export async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`)
  if (!response.ok) throw new Error('User not found')
  return response.json()
}
```

```typescript
// src/api/user.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchUser } from './user'

describe('fetchUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ユーザーデータを取得できる', async () => {
    const mockUser = { id: '1', name: 'Alice' }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    })

    const user = await fetchUser('1')

    expect(user).toEqual(mockUser)
    expect(fetch).toHaveBeenCalledWith('/api/users/1')
  })

  it('ユーザーが見つからない場合エラー', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    })

    await expect(fetchUser('999')).rejects.toThrow('User not found')
  })
})
```

## Reactコンポーネントのテスト

### Testing Library統合

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

```typescript
// src/components/Counter.tsx
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  )
}
```

```typescript
// src/components/Counter.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from './Counter'

describe('Counter', () => {
  it('初期値が0', () => {
    render(<Counter />)
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })

  it('Incrementボタンでカウントアップ', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    const button = screen.getByRole('button', { name: 'Increment' })
    await user.click(button)

    expect(screen.getByText('Count: 1')).toBeInTheDocument()
  })

  it('Resetボタンでカウントリセット', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    // 3回インクリメント
    const incrementBtn = screen.getByRole('button', { name: 'Increment' })
    await user.tripleClick(incrementBtn)
    expect(screen.getByText('Count: 3')).toBeInTheDocument()

    // リセット
    const resetBtn = screen.getByRole('button', { name: 'Reset' })
    await user.click(resetBtn)
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })
})
```

## モック機能

### 関数のモック

```typescript
import { vi } from 'vitest'

// モック関数作成
const mockFn = vi.fn()

// 戻り値を設定
mockFn.mockReturnValue(42)
mockFn.mockResolvedValue({ data: 'async result' })

// 実装を設定
mockFn.mockImplementation((x: number) => x * 2)

// 呼び出し確認
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('arg')
expect(mockFn).toHaveBeenCalledTimes(2)
```

### モジュールのモック

```typescript
// src/services/api.ts
export const api = {
  getUser: async (id: string) => {
    const res = await fetch(`/api/users/${id}`)
    return res.json()
  }
}
```

```typescript
// src/components/UserProfile.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { UserProfile } from './UserProfile'

// モジュール全体をモック
vi.mock('../services/api', () => ({
  api: {
    getUser: vi.fn(),
  }
}))

import { api } from '../services/api'

describe('UserProfile', () => {
  it('ユーザー情報を表示', async () => {
    vi.mocked(api.getUser).mockResolvedValue({
      id: '1',
      name: 'Alice',
      email: 'alice@example.com',
    })

    render(<UserProfile userId="1" />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })
})
```

### タイマーのモック

```typescript
import { vi } from 'vitest'

it('タイマーをテスト', () => {
  vi.useFakeTimers()

  const callback = vi.fn()
  setTimeout(callback, 1000)

  // 1秒進める
  vi.advanceTimersByTime(1000)

  expect(callback).toHaveBeenCalled()

  vi.useRealTimers()
})
```

## スナップショットテスト

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from './Button'

describe('Button snapshot', () => {
  it('デフォルトレンダリング', () => {
    const { container } = render(<Button>Click me</Button>)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('プライマリボタン', () => {
    const { container } = render(<Button variant="primary">Submit</Button>)
    expect(container.firstChild).toMatchSnapshot()
  })
})
```

## カバレッジ測定

### インストール

```bash
npm install -D @vitest/coverage-v8
# または Istanbul
npm install -D @vitest/coverage-istanbul
```

### 実行

```bash
# カバレッジレポート生成
npm run test:coverage

# HTMLレポート確認
open coverage/index.html
```

### カバレッジ閾値設定

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],

      // 閾値設定
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },

      // 除外パターン
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
})
```

## Watch Mode & UI

### Watch Mode

```bash
# ファイル変更を監視して自動再実行
npm run test

# 特定のファイルのみ
vitest src/utils

# フィルタリング
vitest --grep="User"
```

### Vitest UI

```bash
# UIモードで起動
npm run test:ui
```

ブラウザで `http://localhost:51204/__vitest__/` を開くと、視覚的にテスト結果を確認できます。

機能:
- テスト一覧と結果表示
- カバレッジビジュアライズ
- テストの絞り込み
- ソースコード表示

## CI/CD統合

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## ベストプラクティス

### 1. テストの構造化

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    describe('成功ケース', () => {
      it('新規ユーザーを作成できる', () => {})
      it('デフォルト値が設定される', () => {})
    })

    describe('バリデーション', () => {
      it('メールアドレス未入力でエラー', () => {})
      it('重複メールでエラー', () => {})
    })
  })
})
```

### 2. テストの独立性

```typescript
// ❌ 悪い例: テスト間で状態を共有
let user: User
it('ユーザー作成', () => {
  user = createUser({ name: 'Alice' })
})
it('ユーザー更新', () => {
  updateUser(user.id, { name: 'Bob' })
})

// ✅ 良い例: 各テストで独立したデータ
it('ユーザー作成', () => {
  const user = createUser({ name: 'Alice' })
  expect(user.name).toBe('Alice')
})
it('ユーザー更新', () => {
  const user = createUser({ name: 'Alice' })
  const updated = updateUser(user.id, { name: 'Bob' })
  expect(updated.name).toBe('Bob')
})
```

### 3. テストヘルパー活用

```typescript
// src/test/helpers.tsx
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}
```

### 4. テストデータファクトリー

```typescript
// src/test/factories.ts
import { faker } from '@faker-js/faker'

export const userFactory = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  createdAt: faker.date.past(),
  ...overrides,
})

// テストで使用
const user = userFactory({ email: 'test@example.com' })
```

## トラブルシューティング

### ESMモジュールエラー

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Node.jsモジュール解決を調整
    deps: {
      inline: [/problematic-package/],
    },
  },
})
```

### TypeScript型エラー

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

### メモリリーク対策

```typescript
// 各テスト後にクリーンアップ
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})
```

## まとめ

Vitestは速度・DX・機能のすべてで優れた次世代テストフレームワークです。

**Vitestを選ぶべき理由**:
- Viteプロジェクトとの完璧な統合
- 圧倒的な実行速度
- Jest互換で学習コスト低
- TypeScript/ESMネイティブサポート
- リッチなUI・Watch Mode

**移行を検討すべきケース**:
- Vite/Vitestベースの新規プロジェクト
- Jestの起動が遅いプロジェクト
- TypeScript/ESMで苦労しているプロジェクト

2026年、Vitestはフロントエンドテストのスタンダードとなりました。まだJestを使っている方は、ぜひ移行を検討してみてください。

**参考リンク**:
- [Vitest公式サイト](https://vitest.dev/)
- [Vitest GitHub](https://github.com/vitest-dev/vitest)
- [Testing Library](https://testing-library.com/)
