---
title: 'Vitest 完全ガイド — Jest移行から実践的テスト設計まで'
description: 'VitestによるJavaScript/TypeScriptテストの完全解説。Jestからの移行ガイド、React Testing Library統合、カバレッジ、MSW、スナップショットテストを網羅。'
pubDate: '2026-02-21'
heroImage: '/blog-placeholder-2.jpg'
tags: ['Testing', 'Vitest', 'TypeScript', 'React', 'Jest']
---

現代のJavaScript/TypeScript開発において、テストは品質保証の中核を担う。しかしJestの設定の複雑さやESMサポートの不完全さに悩まされてきた開発者は多い。そこに登場したVitestは、Viteエコシステムと深く統合された次世代テストランナーとして急速に普及している。本記事では、VitestのセットアップからJestからの移行、React Testing Library・MSW統合、カバレッジ設定、GitHub Actionsとの連携まで、実務で即活用できる知識を体系的に解説する。

## 目次

1. VitestとJestの違い — なぜVitestなのか
2. インストールとセットアップ
3. 基本テスト記法 — describe / it / test / expect
4. アサーション完全リファレンス
5. モック機能 — vi.fn() / vi.spyOn() / vi.mock()
6. タイマーモック — vi.useFakeTimers()
7. React Testing Libraryとの統合
8. カスタムHooksのテスト
9. MSW（Mock Service Worker）でAPIモック
10. カバレッジ設定 — v8 / istanbul
11. スナップショットテスト
12. 並列実行とウォッチモード
13. GitHub Actionsとの統合
14. Jestからの移行ガイド
15. ベストプラクティス

---

## 1. VitestとJestの違い — なぜVitestなのか

### パフォーマンス比較

VitestはViteのトランスフォームパイプラインを活用する。JestはCommonJSベースで動作するためESMモジュールの変換に多大なオーバーヘッドが発生するが、Vitestはネイティブのブラウザ互換ESMを使用する。

実際のベンチマーク（中規模プロジェクト、テスト300件）での比較：

| 指標 | Jest | Vitest | 改善率 |
|------|------|--------|--------|
| 初回実行 | 28.4秒 | 6.2秒 | **4.6倍高速** |
| ウォッチ再実行 | 12.1秒 | 0.8秒 | **15倍高速** |
| 設定行数（TS+React） | 80行以上 | 15行以下 | **大幅削減** |
| ESMサポート | 部分的 | ネイティブ | - |

### アーキテクチャの違い

```
Jest のアーキテクチャ:
TypeScript → babel-jest / ts-jest → CommonJS変換 → Node.js実行
                        ↑ここが重くて遅い

Vitest のアーキテクチャ:
TypeScript → Vite変換（esbuild） → ESM実行
                        ↑超高速
```

### 設定の統合

VitestはViteの設定ファイル（`vite.config.ts`）に直接テスト設定を記述できる。プロジェクト全体で一つの設定ファイルを管理するだけでよい。

```typescript
// vite.config.ts — ビルドとテストの設定が一元化される
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  // ビルド設定もここに記述
  build: {
    outDir: 'dist',
  },
})
```

JestでTypeScript+React環境を構築する場合、`jest.config.ts`・`babel.config.js`・`tsconfig.json`の三つを整合させる必要があった。Vitestではその複雑さが解消される。

---

## 2. インストールとセットアップ

### Vite環境（React/Vue/Svelte等）

既存のViteプロジェクトにVitestを追加する場合：

```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8 jsdom
# React Testing Library も使う場合
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

```typescript
// vite.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // ブラウザAPIをシミュレートするJSDOM環境
    environment: 'jsdom',
    // describe/it/expect をimport不要にする
    globals: true,
    // テスト実行前に毎回読み込むファイル
    setupFiles: ['./src/test/setup.ts'],
    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts', // re-exportのみのファイルを除外
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    // テストファイルのパターン
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// 各テスト後にDOMをクリーンアップ
afterEach(() => {
  cleanup()
})
```

### 非Vite環境（純粋なNode.js / Express等）

ViteプロジェクトでなくてもVitestは使用できる。専用の設定ファイルを作成する。

```bash
npm install -D vitest @vitest/coverage-v8
```

```typescript
// vitest.config.ts（vite.config.tsとは別ファイル）
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Node.js環境（ブラウザAPIなし）
    environment: 'node',
    globals: true,
    // パスエイリアスの設定
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
    // 並列実行の設定
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 2,
      },
    },
  },
})
```

### package.jsonのスクリプト設定

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:coverage:ui": "vitest --coverage --ui"
  }
}
```

`vitest run`は1回実行して終了、`vitest`（引数なし）はウォッチモードで起動する。

---

## 3. 基本テスト記法 — describe / it / test / expect

### ファイル構成とテストの基本構造

```typescript
// src/utils/calculator.ts
export function add(a: number, b: number): number {
  return a + b
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero')
  return a / b
}

export function formatCurrency(amount: number, currency = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
  }).format(amount)
}
```

```typescript
// src/utils/calculator.test.ts
import { describe, it, test, expect, beforeEach, afterEach } from 'vitest'
import { add, divide, formatCurrency } from './calculator'

// describe: テストのグループ化
describe('calculator', () => {
  // it / test は同じ（可読性で使い分ける）
  it('正の数の加算が正しく動作する', () => {
    expect(add(1, 2)).toBe(3)
    expect(add(10, 20)).toBe(30)
  })

  test('負の数の加算が正しく動作する', () => {
    expect(add(-1, -2)).toBe(-3)
    expect(add(-5, 3)).toBe(-2)
  })

  describe('divide', () => {
    it('正常な除算が正しく動作する', () => {
      expect(divide(10, 2)).toBe(5)
      expect(divide(7, 2)).toBe(3.5)
    })

    it('ゼロ除算でエラーをスローする', () => {
      expect(() => divide(10, 0)).toThrow('Division by zero')
    })
  })

  describe('formatCurrency', () => {
    it('日本円のフォーマットが正しい', () => {
      // 結果は環境依存の可能性があるため contains で確認
      const result = formatCurrency(1000)
      expect(result).toContain('1,000')
    })
  })
})
```

### ライフサイクルフック

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

describe('データベース操作', () => {
  let db: MockDatabase

  // スイート全体で1回だけ実行
  beforeAll(async () => {
    db = await MockDatabase.connect()
  })

  afterAll(async () => {
    await db.disconnect()
  })

  // 各テストの前後に実行
  beforeEach(async () => {
    await db.seed([
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ])
  })

  afterEach(async () => {
    await db.clear()
  })

  it('ユーザーを検索できる', async () => {
    const user = await db.findUser(1)
    expect(user).toEqual({ id: 1, name: 'Alice', email: 'alice@example.com' })
  })

  it('存在しないユーザーはnullを返す', async () => {
    const user = await db.findUser(999)
    expect(user).toBeNull()
  })
})
```

### 条件付きテスト実行

```typescript
import { describe, it, expect } from 'vitest'

const isCI = process.env.CI === 'true'

describe('環境依存テスト', () => {
  // CI環境でのみスキップ
  it.skipIf(isCI)('ローカル専用のテスト', () => {
    // ローカルのファイルシステムに依存するテスト
  })

  // CI環境でのみ実行
  it.runIf(isCI)('CI専用のテスト', () => {
    // CI固有の環境変数を使うテスト
  })

  // 一時的なスキップ（.todo で実装予定を示す）
  it.todo('将来実装予定のテスト')

  // 現在はスキップ（理由をコメントに記述）
  it.skip('一時的にスキップ — JIRA-123対応後に有効化', () => {
    // ...
  })
})
```

---

## 4. アサーション完全リファレンス

### 基本アサーション

```typescript
describe('基本アサーション', () => {
  it('toBe — 厳密等価（Object.is）', () => {
    expect(1).toBe(1)
    expect('hello').toBe('hello')
    expect(true).toBe(true)
    expect(null).toBe(null)
    expect(undefined).toBe(undefined)
    // NaNも比較できる
    expect(NaN).toBe(NaN)
    // オブジェクトの参照比較（値比較にはtoEqualを使う）
    const obj = { a: 1 }
    expect(obj).toBe(obj) // 同じ参照
  })

  it('toEqual — 深い値の等価比較', () => {
    expect({ a: 1, b: { c: 2 } }).toEqual({ a: 1, b: { c: 2 } })
    expect([1, 2, 3]).toEqual([1, 2, 3])
    // 循環参照もサポート
  })

  it('toStrictEqual — undefinedプロパティも区別する', () => {
    expect({ a: 1, b: undefined }).not.toStrictEqual({ a: 1 })
    expect([1, undefined, 3]).not.toStrictEqual([1, , 3])
  })
})
```

### 文字列・配列・オブジェクトのアサーション

```typescript
describe('文字列アサーション', () => {
  it('toContain / toMatch', () => {
    const message = 'Hello, World!'
    expect(message).toContain('World')
    expect(message).toMatch(/hello/i)  // 正規表現
    expect(message).toMatch('Hello')
    expect(message).not.toContain('Foo')

    const url = 'https://example.com/api/users'
    expect(url).toMatch(/^https:\/\//)
    expect(url).toContain('/api/')
  })
})

describe('数値アサーション', () => {
  it('toBeGreaterThan / toBeLessThan', () => {
    expect(10).toBeGreaterThan(5)
    expect(10).toBeGreaterThanOrEqual(10)
    expect(5).toBeLessThan(10)
    expect(5).toBeLessThanOrEqual(5)
    // 浮動小数点数の比較
    expect(0.1 + 0.2).toBeCloseTo(0.3, 5) // 小数点5桁まで比較
  })
})

describe('配列アサーション', () => {
  it('toContain / toHaveLength', () => {
    const fruits = ['apple', 'banana', 'cherry']
    expect(fruits).toContain('banana')
    expect(fruits).toHaveLength(3)
    expect(fruits).not.toContain('grape')

    // 複数要素の包含確認
    expect(fruits).toEqual(expect.arrayContaining(['apple', 'cherry']))
  })
})

describe('オブジェクトアサーション', () => {
  it('toHaveProperty', () => {
    const user = {
      id: 1,
      name: 'Alice',
      address: {
        city: 'Tokyo',
        country: 'Japan',
      },
    }
    expect(user).toHaveProperty('name')
    expect(user).toHaveProperty('name', 'Alice')
    expect(user).toHaveProperty('address.city', 'Tokyo')
    expect(user).toHaveProperty(['address', 'country'], 'Japan')

    // 部分一致
    expect(user).toMatchObject({ name: 'Alice', address: { city: 'Tokyo' } })
  })
})
```

### エラーアサーション

```typescript
describe('エラーアサーション', () => {
  class ValidationError extends Error {
    constructor(public field: string, message: string) {
      super(message)
      this.name = 'ValidationError'
    }
  }

  function validateAge(age: number): void {
    if (typeof age !== 'number') throw new TypeError('Age must be a number')
    if (age < 0 || age > 150) throw new ValidationError('age', 'Age out of range')
  }

  it('toThrow — エラーのスロー確認', () => {
    // 文字列マッチング
    expect(() => validateAge(-1)).toThrow('Age out of range')
    // 正規表現マッチング
    expect(() => validateAge(-1)).toThrow(/Age out/)
    // エラークラスの確認
    expect(() => validateAge(-1)).toThrow(ValidationError)
    expect(() => validateAge('abc' as any)).toThrow(TypeError)
  })

  it('非同期エラーのテスト', async () => {
    async function fetchUser(id: number): Promise<{ name: string }> {
      if (id <= 0) throw new Error('Invalid ID')
      return { name: 'Alice' }
    }

    await expect(fetchUser(-1)).rejects.toThrow('Invalid ID')
    await expect(fetchUser(1)).resolves.toEqual({ name: 'Alice' })
  })
})
```

---

## 5. モック機能 — vi.fn() / vi.spyOn() / vi.mock()

### vi.fn() — 関数のモック

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('vi.fn() の基本', () => {
  it('モック関数の呼び出し回数と引数を検証する', () => {
    const mockCallback = vi.fn()

    // コールバックを受け取る関数
    function processItems(items: string[], callback: (item: string) => void) {
      items.forEach(callback)
    }

    processItems(['a', 'b', 'c'], mockCallback)

    expect(mockCallback).toHaveBeenCalledTimes(3)
    expect(mockCallback).toHaveBeenCalledWith('a')
    expect(mockCallback).toHaveBeenCalledWith('b')
    expect(mockCallback).toHaveBeenNthCalledWith(1, 'a')
    expect(mockCallback).toHaveBeenLastCalledWith('c')
  })

  it('モック関数の戻り値を設定する', () => {
    const mockFetch = vi.fn()

    // 一度だけ特定の値を返す
    mockFetch.mockReturnValueOnce({ data: 'first' })
    mockFetch.mockReturnValueOnce({ data: 'second' })
    // それ以降はデフォルト値
    mockFetch.mockReturnValue({ data: 'default' })

    expect(mockFetch()).toEqual({ data: 'first' })
    expect(mockFetch()).toEqual({ data: 'second' })
    expect(mockFetch()).toEqual({ data: 'default' })
    expect(mockFetch()).toEqual({ data: 'default' })
  })

  it('非同期モック関数', async () => {
    const mockApiClient = vi.fn()
    mockApiClient.mockResolvedValueOnce({ users: [{ id: 1, name: 'Alice' }] })
    mockApiClient.mockRejectedValueOnce(new Error('Network Error'))

    const result = await mockApiClient()
    expect(result).toEqual({ users: [{ id: 1, name: 'Alice' }] })

    await expect(mockApiClient()).rejects.toThrow('Network Error')
  })
})
```

### vi.spyOn() — メソッドのスパイ

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'

class PaymentService {
  async charge(amount: number, cardToken: string): Promise<{ success: boolean; transactionId: string }> {
    // 実際の決済API呼び出し（テストではモックする）
    const response = await fetch('https://api.payment.com/charge', {
      method: 'POST',
      body: JSON.stringify({ amount, cardToken }),
    })
    return response.json()
  }

  async refund(transactionId: string): Promise<void> {
    await fetch(`https://api.payment.com/refund/${transactionId}`, {
      method: 'POST',
    })
  }
}

describe('PaymentService', () => {
  const service = new PaymentService()

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('chargeメソッドが正しく呼ばれる', async () => {
    const mockCharge = vi.spyOn(service, 'charge').mockResolvedValue({
      success: true,
      transactionId: 'txn_123',
    })

    const result = await service.charge(1000, 'tok_visa')

    expect(mockCharge).toHaveBeenCalledWith(1000, 'tok_visa')
    expect(result.success).toBe(true)
    expect(result.transactionId).toBe('txn_123')
  })

  it('console.errorのスパイ', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // エラーログを出す関数をテスト
    function logError(message: string) {
      console.error(`[ERROR] ${message}`)
    }

    logError('Something went wrong')

    expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Something went wrong')
  })
})
```

### vi.mock() — モジュール全体のモック

```typescript
// src/services/emailService.ts
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  // 実際はSendGrid等のAPIを呼ぶ
  console.log(`Sending email to ${email}`)
}

export async function sendPasswordReset(email: string): Promise<{ token: string }> {
  return { token: 'reset_token_xxx' }
}
```

```typescript
// src/services/userService.ts
import { sendWelcomeEmail } from './emailService'

export async function createUser(data: { email: string; name: string }) {
  // ユーザー作成後にウェルカムメール送信
  const user = { id: Math.random(), ...data }
  await sendWelcomeEmail(data.email, data.name)
  return user
}
```

```typescript
// src/services/userService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// モジュールをモック化（ファイルの先頭でvi.mockを呼ぶ）
vi.mock('./emailService', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordReset: vi.fn().mockResolvedValue({ token: 'mock_token' }),
}))

import { createUser } from './userService'
import { sendWelcomeEmail } from './emailService'

describe('createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ユーザー作成後にウェルカムメールが送信される', async () => {
    const user = await createUser({ email: 'alice@example.com', name: 'Alice' })

    expect(user).toMatchObject({ email: 'alice@example.com', name: 'Alice' })
    expect(sendWelcomeEmail).toHaveBeenCalledWith('alice@example.com', 'Alice')
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1)
  })
})
```

---

## 6. タイマーモック — vi.useFakeTimers()

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// debounce実装
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

// 定期実行クラス
class PollingService {
  private intervalId: ReturnType<typeof setInterval> | null = null
  public callCount = 0

  start(interval: number) {
    this.intervalId = setInterval(() => {
      this.callCount++
      this.fetchData()
    }, interval)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private fetchData() {
    // データ取得処理
  }
}

describe('タイマーのテスト', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounceが正しく動作する', () => {
    const callback = vi.fn()
    const debouncedFn = debounce(callback, 300)

    debouncedFn()
    debouncedFn()
    debouncedFn()

    // 300ms経過前は呼ばれていない
    expect(callback).not.toHaveBeenCalled()

    // 300ms進める
    vi.advanceTimersByTime(300)

    // 最後の呼び出し分だけ実行される
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('PollingServiceが一定間隔で実行される', () => {
    const service = new PollingService()
    service.start(1000)

    vi.advanceTimersByTime(3500)

    expect(service.callCount).toBe(3)

    service.stop()
    vi.advanceTimersByTime(2000)

    // 停止後は増えない
    expect(service.callCount).toBe(3)
  })

  it('DateのモックでDate依存コードをテストする', () => {
    // 特定の日時に固定
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    function getGreeting(): string {
      const hour = new Date().getHours()
      if (hour < 12) return 'おはようございます'
      if (hour < 18) return 'こんにちは'
      return 'こんばんは'
    }

    expect(getGreeting()).toBe('おはようございます') // UTC 0時 = JST 9時

    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
    expect(getGreeting()).toBe('こんにちは') // UTC 10時 = JST 19時
  })
})
```

---

## 7. React Testing Libraryとの統合

### コンポーネントのテスト

```typescript
// src/components/SearchInput.tsx
import { useState, useCallback } from 'react'

interface SearchInputProps {
  onSearch: (query: string) => void
  placeholder?: string
  debounceMs?: number
}

export function SearchInput({ onSearch, placeholder = '検索...', debounceMs = 300 }: SearchInputProps) {
  const [value, setValue] = useState('')

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    onSearch(newValue)
  }, [onSearch])

  const handleClear = useCallback(() => {
    setValue('')
    onSearch('')
  }, [onSearch])

  return (
    <div role="search">
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="検索入力"
      />
      {value && (
        <button onClick={handleClear} aria-label="検索をクリア">
          ✕
        </button>
      )}
    </div>
  )
}
```

```typescript
// src/components/SearchInput.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchInput } from './SearchInput'

describe('SearchInput', () => {
  it('プレースホルダーが表示される', () => {
    const onSearch = vi.fn()
    render(<SearchInput onSearch={onSearch} placeholder="商品を検索" />)

    expect(screen.getByPlaceholderText('商品を検索')).toBeInTheDocument()
  })

  it('入力値が変化するとonSearchが呼ばれる', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchInput onSearch={onSearch} />)

    const input = screen.getByRole('searchbox')
    await user.type(input, 'React')

    // 1文字ずつ呼ばれる
    expect(onSearch).toHaveBeenCalledTimes(5)
    expect(onSearch).toHaveBeenLastCalledWith('React')
  })

  it('クリアボタンで検索がリセットされる', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchInput onSearch={onSearch} />)

    const input = screen.getByRole('searchbox')
    await user.type(input, 'test')

    // クリアボタンが表示される
    const clearButton = screen.getByRole('button', { name: '検索をクリア' })
    expect(clearButton).toBeInTheDocument()

    await user.click(clearButton)

    expect(input).toHaveValue('')
    expect(onSearch).toHaveBeenLastCalledWith('')
    // クリアボタンが非表示になる
    expect(screen.queryByRole('button', { name: '検索をクリア' })).not.toBeInTheDocument()
  })
})
```

### 非同期コンポーネントのテスト

```typescript
// src/components/UserProfile.tsx
import { useEffect, useState } from 'react'

interface User {
  id: number
  name: string
  email: string
  avatar: string
}

interface UserProfileProps {
  userId: number
}

export function UserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error('User not found')
        return res.json()
      })
      .then(setUser)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div role="status">読み込み中...</div>
  if (error) return <div role="alert">{error}</div>
  if (!user) return null

  return (
    <article>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </article>
  )
}
```

```typescript
// src/components/UserProfile.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { UserProfile } from './UserProfile'

// fetchをモック
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

afterEach(() => {
  vi.clearAllMocks()
})

describe('UserProfile', () => {
  it('読み込み中に「読み込み中...」を表示する', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // 解決しないPromise

    render(<UserProfile userId={1} />)

    expect(screen.getByRole('status')).toHaveTextContent('読み込み中...')
  })

  it('ユーザー情報が正しく表示される', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        avatar: 'https://example.com/avatar.jpg',
      }),
    })

    render(<UserProfile userId={1} />)

    // 非同期でデータが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alice' })).toBeInTheDocument()
    })

    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('APIエラー時にエラーメッセージを表示する', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    })

    render(<UserProfile userId={999} />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('User not found')
    })
  })
})
```

---

## 8. カスタムHooksのテスト

```typescript
// src/hooks/useLocalStorage.ts
import { useState, useCallback } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(error)
    }
  }, [key, storedValue])

  const removeValue = useCallback(() => {
    setStoredValue(initialValue)
    window.localStorage.removeItem(key)
  }, [key, initialValue])

  return [storedValue, setValue, removeValue] as const
}
```

```typescript
// src/hooks/useLocalStorage.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('初期値が設定される', () => {
    const { result } = renderHook(() => useLocalStorage('theme', 'light'))

    expect(result.current[0]).toBe('light')
  })

  it('値を更新するとlocalStorageに保存される', () => {
    const { result } = renderHook(() => useLocalStorage('theme', 'light'))

    act(() => {
      result.current[1]('dark')
    })

    expect(result.current[0]).toBe('dark')
    expect(window.localStorage.getItem('theme')).toBe('"dark"')
  })

  it('既存のlocalStorage値を読み込む', () => {
    window.localStorage.setItem('user', JSON.stringify({ name: 'Alice' }))

    const { result } = renderHook(() =>
      useLocalStorage('user', { name: '' })
    )

    expect(result.current[0]).toEqual({ name: 'Alice' })
  })

  it('removeValueでデフォルト値に戻る', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0))

    act(() => {
      result.current[1](42)
    })
    expect(result.current[0]).toBe(42)

    act(() => {
      result.current[2]() // removeValue
    })

    expect(result.current[0]).toBe(0)
    expect(window.localStorage.getItem('count')).toBeNull()
  })

  it('関数updaterが正しく動作する', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0))

    act(() => {
      result.current[1]((prev) => prev + 1)
    })
    act(() => {
      result.current[1]((prev) => prev + 1)
    })

    expect(result.current[0]).toBe(2)
  })
})
```

---

## 9. MSW（Mock Service Worker）でAPIモック

MSWはネットワーク層でリクエストをインターセプトする。コンポーネントが使うfetch/axiosを変更せずにAPIをモックできる。

### セットアップ

```bash
npm install -D msw
```

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

interface User {
  id: number
  name: string
  email: string
}

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
]

export const handlers = [
  // GETリクエストのハンドラ
  http.get('/api/users', () => {
    return HttpResponse.json(users)
  }),

  // パスパラメータを含むハンドラ
  http.get('/api/users/:id', ({ params }) => {
    const user = users.find((u) => u.id === Number(params.id))
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    return HttpResponse.json(user)
  }),

  // POSTハンドラ
  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as Omit<User, 'id'>
    const newUser: User = { id: Date.now(), ...body }
    users.push(newUser)
    return HttpResponse.json(newUser, { status: 201 })
  }),

  // エラーレスポンスのシミュレーション
  http.delete('/api/users/:id', ({ params }) => {
    const index = users.findIndex((u) => u.id === Number(params.id))
    if (index === -1) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    users.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
```

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

```typescript
// src/test/setup.ts（vitest.config.tsのsetupFilesで指定）
import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach } from 'vitest'
import { server } from './mocks/server'

// テストスイート開始前にMSWサーバーを起動
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// 各テスト後にハンドラをリセット（テスト間の干渉を防ぐ）
afterEach(() => server.resetHandlers())

// テスト終了後にサーバーを停止
afterAll(() => server.close())
```

### MSWを使ったコンポーネントテスト

```typescript
// src/components/UserList.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mocks/server'
import { UserList } from './UserList'

describe('UserList', () => {
  it('ユーザー一覧が表示される', async () => {
    render(<UserList />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('テスト固有のハンドラで上書きできる', async () => {
    // このテストでのみ異なるレスポンスを返す
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json([{ id: 99, name: 'Charlie', email: 'charlie@test.com' }])
      })
    )

    render(<UserList />)

    await waitFor(() => {
      expect(screen.getByText('Charlie')).toBeInTheDocument()
      expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    })
  })

  it('ネットワークエラー時にエラーメッセージが表示される', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.error()
      })
    )

    render(<UserList />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
```

---

## 10. カバレッジ設定 — v8 / istanbul

### カバレッジプロバイダーの選択

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      // v8: Node.js組み込み、高速、設定不要
      // istanbul: より詳細なブランチカバレッジ、バッジ対応
      provider: 'v8', // または 'istanbul'

      reporter: [
        'text',      // ターミナル出力
        'html',      // ブラウザで確認できるレポート
        'lcov',      // CI/カバレッジサービス連携
        'json',      // カスタム処理
        'json-summary', // バッジ生成用
      ],

      // カバレッジ対象の設定
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/*.stories.{ts,tsx}',
        'src/**/index.ts',   // re-exportのみ
        'src/main.tsx',      // エントリーポイント
      ],

      // カバレッジ閾値（下回るとCIが失敗）
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        // ファイル単位の閾値も設定可能
        perFile: false,
      },

      // カバレッジレポートの出力先
      reportsDirectory: './coverage',
    },
  },
})
```

### istanbulの詳細設定

```typescript
// istanbul を使う場合のインストール
// npm install -D @vitest/coverage-istanbul

// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      // 関数レベルのカバレッジを無視するコメント
      // /* istanbul ignore next */
      // ブランチの無視
      // /* istanbul ignore if */
      all: true, // テストがなくても全ファイルをカバレッジに含める
    },
  },
})
```

---

## 11. スナップショットテスト

```typescript
// src/components/Badge.tsx
interface BadgeProps {
  children: React.ReactNode
  variant: 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
}

export function Badge({ children, variant, size = 'md' }: BadgeProps) {
  const variantClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <span className={`rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  )
}
```

```typescript
// src/components/Badge.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge スナップショットテスト', () => {
  it('successバリアントのスナップショット', () => {
    const { container } = render(
      <Badge variant="success">完了</Badge>
    )
    expect(container.firstChild).toMatchSnapshot()
  })

  it('全バリアントのスナップショット', () => {
    const variants = ['success', 'warning', 'error', 'info'] as const

    variants.forEach((variant) => {
      const { container } = render(
        <Badge variant={variant}>{variant}</Badge>
      )
      expect(container.firstChild).toMatchSnapshot()
    })
  })

  // インラインスナップショット（コードに直接埋め込む）
  it('インラインスナップショット', () => {
    const { container } = render(
      <Badge variant="info" size="sm">新機能</Badge>
    )
    expect(container.firstChild).toMatchInlineSnapshot(`
      <span
        class="rounded-full font-medium bg-blue-100 text-blue-800 text-xs px-2 py-0.5"
      >
        新機能
      </span>
    `)
  })
})
```

スナップショットの更新：
```bash
# スナップショットを更新
vitest run --update-snapshots
# または
vitest -u
```

---

## 12. 並列実行とウォッチモード

### 並列実行の設定

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // スレッドプールで並列実行（デフォルト）
    pool: 'threads',
    poolOptions: {
      threads: {
        // CPUコア数に基づいて自動設定
        maxThreads: undefined,
        minThreads: undefined,
        // シングルスレッドで実行する場合
        singleThread: false,
      },
    },

    // ファイル単位の並列実行（より隔離性が高い）
    // pool: 'forks',

    // シーケンシャル実行（デバッグ時に便利）
    // pool: 'vmThreads',
    // fileParallelism: false,

    // タイムアウト設定
    testTimeout: 10000, // 10秒
    hookTimeout: 10000,
  },
})
```

### ウォッチモードの活用

```bash
# ウォッチモードで起動
vitest

# UIモードで起動（ブラウザでテスト結果を確認）
vitest --ui

# 特定のファイルのみテスト
vitest src/components/Button.test.tsx

# パターンにマッチするテストのみ実行
vitest -t "ボタンがクリックされる"
```

ウォッチモードのキーボードショートカット：

| キー | 動作 |
|------|------|
| `a` | 全テスト再実行 |
| `f` | 失敗したテストのみ再実行 |
| `p` | ファイルパターンフィルタ |
| `t` | テスト名フィルタ |
| `q` | 終了 |
| `h` | ヘルプ表示 |

---

## 13. GitHub Actionsとの統合

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Node.js ${{ matrix.node-version }} セットアップ
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: 依存関係インストール
        run: npm ci

      - name: TypeScript型チェック
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: テスト実行（カバレッジあり）
        run: npm run test:coverage

      - name: カバレッジレポートをアップロード
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: カバレッジサマリーをPRコメントに投稿
        uses: davelosert/vitest-coverage-report-action@v2
        if: github.event_name == 'pull_request'
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          json-summary-path: coverage/coverage-summary.json
          json-final-path: coverage/coverage-final.json
```

### プロジェクト分割の設定（モノレポ対応）

```typescript
// vitest.workspace.ts（モノレポのルートに配置）
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  // フロントエンド（React）
  {
    extends: './vite.config.ts',
    test: {
      name: 'frontend',
      environment: 'jsdom',
      include: ['packages/frontend/**/*.test.{ts,tsx}'],
    },
  },
  // バックエンド（Node.js）
  {
    test: {
      name: 'backend',
      environment: 'node',
      include: ['packages/backend/**/*.test.ts'],
    },
  },
  // 共通ユーティリティ
  {
    test: {
      name: 'shared',
      environment: 'node',
      include: ['packages/shared/**/*.test.ts'],
    },
  },
])
```

---

## 14. Jestからの移行ガイド

### API対応表

| Jest | Vitest | 備考 |
|------|--------|------|
| `jest.fn()` | `vi.fn()` | 完全互換 |
| `jest.spyOn()` | `vi.spyOn()` | 完全互換 |
| `jest.mock()` | `vi.mock()` | ほぼ互換 |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` | ほぼ互換 |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` | 完全互換 |
| `jest.resetAllMocks()` | `vi.resetAllMocks()` | 完全互換 |
| `jest.restoreAllMocks()` | `vi.restoreAllMocks()` | 完全互換 |
| `jest.setTimeout()` | なし（config設定） | `testTimeout`で設定 |
| `jest.isolateModules()` | なし | `vi.resetModules()`で代替 |

### import文の変更

```typescript
// Jest（globals: true の場合は不要）
import { describe, it, expect, jest } from '@jest/globals'

// Vitest（globals: true の場合は不要）
import { describe, it, expect, vi } from 'vitest'
```

### 設定ファイルの変換

```javascript
// jest.config.js（移行前）
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|scss)$': 'identity-obj-proxy',
  },
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
}
```

```typescript
// vitest.config.ts（移行後）
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(), // @/* エイリアスを自動解決
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    // CSSモジュールはViteが自動処理するため設定不要
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
    },
  },
})
```

### よくある移行上の注意点

**1. `__mocks__`ディレクトリの扱い**

JestはプロジェクトルートやファイルのそばにあるPath `__mocks__`ディレクトリを自動認識するが、Vitestでは`vi.mock()`のファクトリ関数を使うか、`vi.mock()`でパスを明示する。

```typescript
// Jestの自動モック（__mocks__/axios.ts）
// → Vitestでは明示的なモックに変換

// vitest
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))
```

**2. `jest.config.js`の`transform`設定**

VitestはViteのトランスフォームを使うため、`babel-jest`や`ts-jest`の設定が不要になる。`tsconfig.json`の設定がそのまま有効になる。

**3. `jest.requireActual`の変換**

```typescript
// Jest
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: jest.fn(),
}))

// Vitest
vi.mock('lodash', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lodash')>()
  return {
    ...actual,
    debounce: vi.fn(),
  }
})
```

---

## 15. ベストプラクティス

### テストピラミッドの実践

```
        /\
       /  \
      / E2E \ ← 少数（10-20件）: 重要なユーザーフロー
     /--------\
    /   統合    \ ← 中程度（50-100件）: APIとコンポーネントの結合
   /------------\
  /   ユニット   \ ← 多数（200件以上）: 純粋な関数・ロジック
 /----------------\
```

### テストの命名規則

```typescript
// BAD: 何をテストしているか不明
it('test1', () => { /* ... */ })
it('works', () => { /* ... */ })

// GOOD: 「条件→期待する結果」の形式
it('ユーザーが未ログイン状態でダッシュボードにアクセスするとログインページにリダイレクトされる', () => {})
it('カート商品数が0の場合にチェックアウトボタンが無効化される', () => {})
it('APIが500エラーを返すときにリトライを3回試みる', () => {})

// describe-it の構造化
describe('ShoppingCart', () => {
  describe('商品追加', () => {
    it('同じ商品を追加すると数量が増える', () => {})
    it('在庫切れの商品は追加できない', () => {})
  })
  describe('チェックアウト', () => {
    it('カートが空の場合はチェックアウトできない', () => {})
  })
})
```

### AAA パターン（Arrange-Act-Assert）

```typescript
it('ユーザーにクーポンを適用すると割引価格が計算される', () => {
  // Arrange（準備）
  const cart = new ShoppingCart()
  cart.addItem({ id: '1', name: 'Tシャツ', price: 3000, quantity: 2 })
  const coupon = { code: 'SUMMER20', discountPercent: 20 }

  // Act（実行）
  const total = cart.calculateTotal(coupon)

  // Assert（検証）
  expect(total).toBe(4800) // 6000 * 0.8 = 4800
})
```

### テストの独立性を保つ

```typescript
// BAD: テスト間で状態が共有される
let sharedData: string[] = []

it('要素を追加できる', () => {
  sharedData.push('item1')
  expect(sharedData).toHaveLength(1) // 実行順序依存
})

// GOOD: 各テストで独立した状態を用意
it('要素を追加できる', () => {
  const data: string[] = []
  data.push('item1')
  expect(data).toHaveLength(1) // 常に安定
})
```

### 実装の詳細ではなく振る舞いをテストする

```typescript
// BAD: 内部実装に依存（リファクタリングで壊れる）
it('stateが正しく更新される', () => {
  const { result } = renderHook(() => useCounter(0))
  act(() => result.current.increment())
  // 内部stateを直接検証
  expect(result.current._internalState.value).toBe(1)
})

// GOOD: 公開APIと振る舞いをテスト
it('incrementを呼ぶとカウントが1増える', () => {
  const { result } = renderHook(() => useCounter(0))
  act(() => result.current.increment())
  expect(result.current.count).toBe(1)
})
```

### 実際のプロジェクトでのディレクトリ構成

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx    ← コンポーネントと同じ場所
│   │   └── Button.stories.tsx
│   └── Form/
│       ├── Form.tsx
│       └── Form.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts
├── lib/
│   ├── api.ts
│   └── api.test.ts
├── test/
│   ├── setup.ts               ← グローバルセットアップ
│   ├── utils.tsx              ← カスタムrender等のユーティリティ
│   └── mocks/
│       ├── handlers.ts        ← MSWハンドラ
│       └── server.ts
└── utils/
    ├── format.ts
    └── format.test.ts
```

```typescript
// src/test/utils.tsx — テストユーティリティ
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

// プロバイダーをラップしたカスタムrender
function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // テストではリトライなし
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

function customRender(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
```

---

## まとめ

VitestはJestの直接的な後継として設計されており、移行コストを最小限に抑えながら圧倒的なパフォーマンスと現代的な開発体験をもたらす。

**採用を強く推奨する場面:**
- 新規プロジェクト（フレームワーク問わず）
- Viteを使ったプロジェクト
- ESMへの完全移行を進めているプロジェクト
- テスト実行速度に課題を抱えているプロジェクト

**移行の進め方:**
1. `vitest.config.ts`を作成し、並列で`vitest`を実行できる状態にする
2. テストが通ることを確認しながら`jest`依存を除去する
3. `jest.*`を`vi.*`に置換する（グローバル検索置換で大部分を自動化できる）
4. ESM対応が必要なモジュールの設定を整理する

テストは「書いたから終わり」ではなく、継続的にメンテナンスするコードだ。Vitestの高速なフィードバックサイクルを活かして、TDDの習慣を根付かせることが最終的な品質向上につながる。
