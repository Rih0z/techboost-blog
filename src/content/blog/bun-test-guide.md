---
title: 'Bun Test完全ガイド - 超高速Jest互換テストランナー'
description: 'Bun組み込みテストランナーを徹底解説。Jest互換API、スナップショットテスト、モック、カバレッジなど、高速テスト環境の構築方法。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2026-02-05'
tags: ['Bun', 'テスト', 'JavaScript', 'TypeScript']
---

Bun Testは、Bunに組み込まれた超高速なテストランナーです。Jest互換のAPIを提供しながら、圧倒的なパフォーマンスを実現します。追加の設定やインストールは不要で、すぐに使い始めることができます。

この記事では、Bun Testの基本から高度な使い方まで、実践的なテストの書き方を解説します。

## Bun Testとは

Bun Testは、Bunランタイムに統合された高速テストランナーです。

### 主な特徴

- **超高速**: Jestの数倍〜数十倍の速度
- **Jest互換**: 既存のJestテストがそのまま動作
- **ゼロコンフィグ**: 設定ファイル不要
- **TypeScript対応**: トランスパイル不要
- **組み込みモック**: 強力なモック機能
- **Watch モード**: ファイル変更を自動検出

## セットアップ

### Bunのインストール

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# バージョン確認
bun --version
```

### プロジェクト初期化

```bash
# 新規プロジェクト
mkdir my-bun-test-project
cd my-bun-test-project

# package.json作成
bun init

# 依存関係インストール
bun install
```

## 基本的なテスト

### 最初のテスト

```typescript
// math.ts
export function add(a: number, b: number): number {
  return a + b
}

export function multiply(a: number, b: number): number {
  return a * b
}
```

```typescript
// math.test.ts
import { expect, test, describe } from 'bun:test'
import { add, multiply } from './math'

describe('Math utilities', () => {
  test('add should sum two numbers', () => {
    expect(add(2, 3)).toBe(5)
    expect(add(-1, 1)).toBe(0)
  })

  test('multiply should multiply two numbers', () => {
    expect(multiply(2, 3)).toBe(6)
    expect(multiply(-2, 3)).toBe(-6)
  })
})
```

### テスト実行

```bash
# 全テスト実行
bun test

# 特定のファイル
bun test math.test.ts

# パターンマッチ
bun test --test-name-pattern="add"

# Watchモード
bun test --watch
```

## マッチャー

### 基本的なマッチャー

```typescript
import { expect, test } from 'bun:test'

test('equality matchers', () => {
  // 完全一致
  expect(2 + 2).toBe(4)

  // オブジェクト比較
  expect({ name: 'John' }).toEqual({ name: 'John' })

  // 真偽値
  expect(true).toBeTruthy()
  expect(false).toBeFalsy()
  expect(null).toBeNull()
  expect(undefined).toBeUndefined()
})
```

### 数値マッチャー

```typescript
test('number matchers', () => {
  const value = 2 + 2

  expect(value).toBeGreaterThan(3)
  expect(value).toBeGreaterThanOrEqual(4)
  expect(value).toBeLessThan(5)
  expect(value).toBeLessThanOrEqual(4)

  // 浮動小数点
  expect(0.1 + 0.2).toBeCloseTo(0.3)
})
```

### 文字列マッチャー

```typescript
test('string matchers', () => {
  const text = 'Hello, World!'

  expect(text).toMatch(/World/)
  expect(text).toContain('Hello')
  expect(text).toHaveLength(13)
})
```

### 配列マッチャー

```typescript
test('array matchers', () => {
  const fruits = ['apple', 'banana', 'orange']

  expect(fruits).toContain('banana')
  expect(fruits).toHaveLength(3)
  expect(fruits).toEqual(['apple', 'banana', 'orange'])

  // 部分一致
  expect(fruits).toEqual(
    expect.arrayContaining(['apple', 'banana'])
  )
})
```

### オブジェクトマッチャー

```typescript
test('object matchers', () => {
  const user = {
    name: 'John',
    age: 30,
    email: 'john@example.com',
  }

  expect(user).toHaveProperty('name')
  expect(user).toHaveProperty('age', 30)

  // 部分一致
  expect(user).toMatchObject({
    name: 'John',
    age: 30,
  })
})
```

## 非同期テスト

### Promise

```typescript
import { expect, test } from 'bun:test'

async function fetchUser(id: number) {
  return {
    id,
    name: 'John Doe',
  }
}

test('async function with await', async () => {
  const user = await fetchUser(1)
  expect(user.name).toBe('John Doe')
})

test('async function with resolves', async () => {
  await expect(fetchUser(1)).resolves.toMatchObject({
    id: 1,
    name: 'John Doe',
  })
})

test('async function with rejects', async () => {
  await expect(
    Promise.reject(new Error('Failed'))
  ).rejects.toThrow('Failed')
})
```

### タイムアウト

```typescript
test('long running test', async () => {
  await new Promise((resolve) => setTimeout(resolve, 3000))
}, 5000) // 5秒のタイムアウト
```

## モック

### 関数のモック

```typescript
import { expect, test, mock } from 'bun:test'

test('mock function', () => {
  const mockFn = mock((a: number, b: number) => a + b)

  mockFn(1, 2)
  mockFn(2, 3)

  // 呼び出し回数
  expect(mockFn).toHaveBeenCalledTimes(2)

  // 呼び出し引数
  expect(mockFn).toHaveBeenCalledWith(1, 2)
  expect(mockFn).toHaveBeenLastCalledWith(2, 3)

  // 戻り値
  expect(mockFn.mock.results[0].value).toBe(3)
})
```

### モック実装

```typescript
import { expect, test, mock } from 'bun:test'

test('mock implementation', () => {
  const mockFn = mock((x: number) => x * 2)

  expect(mockFn(2)).toBe(4)
  expect(mockFn(3)).toBe(6)
})

test('mock return value', () => {
  const mockFn = mock()

  mockFn.mockReturnValue(42)
  expect(mockFn()).toBe(42)

  mockFn.mockReturnValueOnce(100)
  expect(mockFn()).toBe(100)
  expect(mockFn()).toBe(42)
})
```

### モジュールのモック

```typescript
import { expect, test, mock } from 'bun:test'

// api.ts
export async function fetchData() {
  const response = await fetch('https://api.example.com/data')
  return response.json()
}

// api.test.ts
test('mock fetch', async () => {
  const mockFetch = mock(() =>
    Promise.resolve({
      json: () => Promise.resolve({ data: 'mocked' }),
    })
  )

  global.fetch = mockFetch as any

  const data = await fetchData()

  expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data')
  expect(data).toEqual({ data: 'mocked' })
})
```

## スパイ

### spyOn

```typescript
import { expect, test, spyOn } from 'bun:test'

class Calculator {
  add(a: number, b: number) {
    return a + b
  }

  multiply(a: number, b: number) {
    return a * b
  }
}

test('spyOn method', () => {
  const calculator = new Calculator()
  const spy = spyOn(calculator, 'add')

  calculator.add(2, 3)

  expect(spy).toHaveBeenCalledWith(2, 3)
  expect(spy).toHaveReturnedWith(5)
})

test('mock method implementation', () => {
  const calculator = new Calculator()
  const spy = spyOn(calculator, 'add').mockImplementation(
    (a, b) => a * b
  )

  expect(calculator.add(2, 3)).toBe(6) // 加算ではなく乗算

  spy.mockRestore() // 元の実装に戻す
  expect(calculator.add(2, 3)).toBe(5)
})
```

## スナップショットテスト

### 基本的なスナップショット

```typescript
import { expect, test } from 'bun:test'

function renderComponent() {
  return {
    type: 'div',
    props: {
      className: 'container',
      children: 'Hello, World!',
    },
  }
}

test('component snapshot', () => {
  const component = renderComponent()
  expect(component).toMatchSnapshot()
})
```

### インラインスナップショット

```typescript
test('inline snapshot', () => {
  const data = { name: 'John', age: 30 }
  expect(data).toMatchInlineSnapshot(`
    {
      "name": "John",
      "age": 30
    }
  `)
})
```

### スナップショット更新

```bash
# スナップショット更新
bun test --update-snapshots
```

## セットアップとティアダウン

### beforeEach / afterEach

```typescript
import { expect, test, beforeEach, afterEach } from 'bun:test'

let database: any

beforeEach(() => {
  database = {
    users: [],
  }
  console.log('Setup: database initialized')
})

afterEach(() => {
  database = null
  console.log('Teardown: database cleaned up')
})

test('add user', () => {
  database.users.push({ id: 1, name: 'John' })
  expect(database.users).toHaveLength(1)
})

test('remove user', () => {
  database.users.push({ id: 1, name: 'John' })
  database.users = []
  expect(database.users).toHaveLength(0)
})
```

### beforeAll / afterAll

```typescript
import { beforeAll, afterAll, test } from 'bun:test'

let server: any

beforeAll(async () => {
  server = await startServer()
  console.log('Server started')
})

afterAll(async () => {
  await server.close()
  console.log('Server closed')
})

test('server is running', async () => {
  const response = await fetch('http://localhost:3000')
  expect(response.status).toBe(200)
})
```

## テストのスキップと限定

### skip

```typescript
import { test } from 'bun:test'

test('this test will run', () => {
  expect(true).toBe(true)
})

test.skip('this test will be skipped', () => {
  expect(false).toBe(true)
})
```

### only

```typescript
import { test } from 'bun:test'

test.only('only this test will run', () => {
  expect(true).toBe(true)
})

test('this test will be skipped', () => {
  expect(true).toBe(true)
})
```

### if / skipIf

```typescript
import { test } from 'bun:test'

const isCI = process.env.CI === 'true'

test.if(isCI)('run only on CI', () => {
  expect(true).toBe(true)
})

test.skipIf(isCI)('skip on CI', () => {
  expect(true).toBe(true)
})
```

## カバレッジ

### カバレッジ有効化

```bash
# カバレッジ測定
bun test --coverage

# HTML レポート生成
bun test --coverage --coverage-reporter=html
```

### カバレッジ設定

```json
// bunfig.toml
[test]
coverage = true
coverageThreshold = 80
coverageReporter = ["text", "html", "lcov"]
```

## DOM テスト

### happy-dom

```bash
bun add -d happy-dom
```

```typescript
import { expect, test, beforeAll } from 'bun:test'
import { Window } from 'happy-dom'

let window: Window
let document: Document

beforeAll(() => {
  window = new Window()
  document = window.document
  global.document = document as any
  global.window = window as any
})

test('DOM manipulation', () => {
  document.body.innerHTML = '<div id="app">Hello</div>'

  const app = document.getElementById('app')
  expect(app?.textContent).toBe('Hello')

  app!.textContent = 'World'
  expect(app?.textContent).toBe('World')
})
```

## パフォーマンステスト

### ベンチマーク

```typescript
import { bench, run } from 'bun:test'

bench('Array.push', () => {
  const arr: number[] = []
  for (let i = 0; i < 1000; i++) {
    arr.push(i)
  }
})

bench('Array spread', () => {
  let arr: number[] = []
  for (let i = 0; i < 1000; i++) {
    arr = [...arr, i]
  }
})

await run()
```

## 統合テスト例

### APIテスト

```typescript
import { expect, test, beforeAll, afterAll } from 'bun:test'

let server: any

beforeAll(async () => {
  server = Bun.serve({
    port: 3000,
    fetch(request) {
      const url = new URL(request.url)

      if (url.pathname === '/api/users') {
        return new Response(
          JSON.stringify([
            { id: 1, name: 'John' },
            { id: 2, name: 'Jane' },
          ]),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      return new Response('Not found', { status: 404 })
    },
  })
})

afterAll(() => {
  server.stop()
})

test('GET /api/users', async () => {
  const response = await fetch('http://localhost:3000/api/users')
  const users = await response.json()

  expect(response.status).toBe(200)
  expect(users).toHaveLength(2)
  expect(users[0]).toMatchObject({
    id: 1,
    name: 'John',
  })
})
```

## 実践的なテストパターン

### ユーティリティ関数テスト

```typescript
// utils/string.ts
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

// utils/string.test.ts
import { expect, test, describe } from 'bun:test'
import { capitalize, truncate } from './string'

describe('String utilities', () => {
  describe('capitalize', () => {
    test('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
    })

    test('converts rest to lowercase', () => {
      expect(capitalize('hELLO')).toBe('Hello')
    })

    test('handles empty string', () => {
      expect(capitalize('')).toBe('')
    })
  })

  describe('truncate', () => {
    test('truncates long string', () => {
      expect(truncate('Hello, World!', 5)).toBe('Hello...')
    })

    test('keeps short string', () => {
      expect(truncate('Hello', 10)).toBe('Hello')
    })
  })
})
```

## CI/CD統合

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun test

      - name: Generate coverage
        run: bun test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## まとめ

Bun Testは、Jest互換のAPIを持ちながら圧倒的なパフォーマンスを実現する次世代テストランナーです。

主なメリット:

- **超高速実行**: Jestの数倍〜数十倍の速度
- **ゼロコンフィグ**: 設定不要ですぐ使える
- **TypeScript対応**: トランスパイル不要
- **Jest互換**: 既存テストの移行が簡単

高速なテストフィードバックループを求めるプロジェクトには、Bun Testが最適な選択です。

## 参考リンク

- [Bun公式サイト](https://bun.sh/)
- [Bun Test ドキュメント](https://bun.sh/docs/cli/test)
- [Jest](https://jestjs.io/)
