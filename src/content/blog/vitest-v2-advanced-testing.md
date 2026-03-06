---
title: 'Vitest v2高度なテスト技法ガイド'
description: 'Vitest v2の高度な機能を徹底解説。Browser Mode、型テスト、スナップショットテスト、カスタムマッチャー、ベンチマーク、カバレッジ設定など実践的なテスト技法を網羅します。Vitest・Testing・TypeScriptに関する実践情報。'
pubDate: 2025-02-05
tags: ['Vitest', 'Testing', 'TypeScript', 'JavaScript', 'フロントエンド']
---

Vitest v2は、Viteベースの超高速テストフレームワークです。本記事では、基本的な使い方から一歩進んだ高度なテスト技法を解説します。

## Vitest v2の新機能

2024年末にリリースされたVitest v2では、以下の機能が追加・改善されました。

### 主な新機能

- **Browser Mode**: 実際のブラウザ環境でのテスト
- **Type Testing**: 型レベルのテスト
- **Workspace**: モノレポ対応の強化
- **Benchmark Mode**: パフォーマンスベンチマーク
- **改善されたUI**: より見やすいテスト結果表示

## Browser Mode - 実ブラウザでのテスト

Browser Modeを使うと、実際のブラウザ環境でテストを実行できます。

### セットアップ

```bash
npm install -D vitest @vitest/browser playwright
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      name: 'chromium', // 'firefox', 'webkit'も可
      provider: 'playwright', // または 'webdriverio'
      headless: true,
    },
  },
})
```

### ブラウザAPIのテスト

```typescript
// dom.test.ts
import { expect, test } from 'vitest'
import { page } from '@vitest/browser/context'

test('ローカルストレージの操作', async () => {
  localStorage.setItem('user', 'Alice')
  expect(localStorage.getItem('user')).toBe('Alice')

  localStorage.clear()
  expect(localStorage.getItem('user')).toBeNull()
})

test('DOM操作とイベント', async () => {
  document.body.innerHTML = `
    <button id="btn">Click me</button>
    <div id="output"></div>
  `

  const button = document.getElementById('btn')!
  const output = document.getElementById('output')!

  button.addEventListener('click', () => {
    output.textContent = 'Clicked!'
  })

  button.click()

  expect(output.textContent).toBe('Clicked!')
})

test('ページナビゲーション', async () => {
  // Playwrightのpageオブジェクトを使用
  await page.goto('https://example.com')
  expect(await page.title()).toContain('Example')
})
```

### インタラクティブなテスト

```typescript
// interactive.test.ts
import { expect, test } from 'vitest'
import { userEvent } from '@vitest/browser/context'

test('フォーム送信', async () => {
  document.body.innerHTML = `
    <form id="form">
      <input id="name" type="text" />
      <input id="email" type="email" />
      <button type="submit">Submit</button>
    </form>
  `

  const form = document.getElementById('form') as HTMLFormElement
  const nameInput = document.getElementById('name') as HTMLInputElement
  const emailInput = document.getElementById('email') as HTMLInputElement

  let formData: FormData | null = null

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    formData = new FormData(form)
  })

  // ユーザーアクションのシミュレーション
  await userEvent.type(nameInput, 'Alice')
  await userEvent.type(emailInput, 'alice@example.com')
  await userEvent.click(form.querySelector('button')!)

  expect(formData?.get('name')).toBe('Alice')
  expect(formData?.get('email')).toBe('alice@example.com')
})
```

## Type Testing - 型レベルのテスト

TypeScriptの型が正しいかをテストできます。

### セットアップ

```bash
npm install -D @vitest/type-testing
```

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@vitest/type-testing"]
  }
}
```

### 基本的な型テスト

```typescript
// types.test-d.ts
import { expectTypeOf, assertType } from 'vitest'

// 型が一致することを確認
test('ユーザー型のテスト', () => {
  interface User {
    id: number
    name: string
    email: string
  }

  const user = { id: 1, name: 'Alice', email: 'alice@example.com' }

  expectTypeOf(user).toMatchTypeOf<User>()
  expectTypeOf(user).toEqualTypeOf<User>()
})

// ジェネリック型のテスト
test('ジェネリック関数の型推論', () => {
  function identity<T>(value: T): T {
    return value
  }

  const result = identity('hello')

  expectTypeOf(result).toBeString()
  expectTypeOf(identity(123)).toBeNumber()
  expectTypeOf(identity([1, 2, 3])).toEqualTypeOf<number[]>()
})

// 関数の引数・返り値の型
test('関数の型シグネチャ', () => {
  function createUser(name: string, age: number) {
    return { name, age, createdAt: new Date() }
  }

  expectTypeOf(createUser).parameters.toEqualTypeOf<[string, number]>()
  expectTypeOf(createUser).returns.toMatchTypeOf<{
    name: string
    age: number
    createdAt: Date
  }>()
})

// 型のプロパティテスト
test('型のプロパティ確認', () => {
  interface ApiResponse {
    data: unknown
    error: string | null
  }

  expectTypeOf<ApiResponse>().toHaveProperty('data')
  expectTypeOf<ApiResponse>().toHaveProperty('error')

  expectTypeOf<ApiResponse['error']>().toEqualTypeOf<string | null>()
})
```

### 高度な型テスト

```typescript
// advanced-types.test-d.ts
import { expectTypeOf } from 'vitest'

// 条件型のテスト
test('条件型が正しく動作', () => {
  type IsString<T> = T extends string ? true : false

  expectTypeOf<IsString<string>>().toEqualTypeOf<true>()
  expectTypeOf<IsString<number>>().toEqualTypeOf<false>()
})

// ユーティリティ型のテスト
test('Partial、Pickなどのテスト', () => {
  interface User {
    id: number
    name: string
    email: string
  }

  type PartialUser = Partial<User>
  type UserCredentials = Pick<User, 'email'>

  expectTypeOf<PartialUser>().toMatchTypeOf<{
    id?: number
    name?: string
    email?: string
  }>()

  expectTypeOf<UserCredentials>().toEqualTypeOf<{ email: string }>()
})

// テンプレートリテラル型
test('テンプレートリテラル型', () => {
  type EventName = `on${Capitalize<string>}`

  expectTypeOf<'onClick'>().toMatchTypeOf<EventName>()
  expectTypeOf<'onHover'>().toMatchTypeOf<EventName>()
  expectTypeOf<'click'>().not.toMatchTypeOf<EventName>()
})
```

## Snapshot Testing - スナップショットテスト

UIコンポーネントや複雑なオブジェクトの出力を記録・比較します。

### 基本的なスナップショット

```typescript
// snapshot.test.ts
import { expect, test } from 'vitest'

function formatUser(user: { name: string; age: number }) {
  return {
    displayName: user.name.toUpperCase(),
    yearOfBirth: new Date().getFullYear() - user.age,
    isAdult: user.age >= 18,
  }
}

test('ユーザー情報のフォーマット', () => {
  const user = { name: 'alice', age: 25 }
  const formatted = formatUser(user)

  expect(formatted).toMatchSnapshot()
})

test('複雑なオブジェクト構造', () => {
  const data = {
    users: [
      { id: 1, name: 'Alice', roles: ['admin', 'user'] },
      { id: 2, name: 'Bob', roles: ['user'] },
    ],
    metadata: {
      total: 2,
      timestamp: '2025-02-05',
    },
  }

  expect(data).toMatchSnapshot()
})
```

### インラインスナップショット

```typescript
test('インラインスナップショット', () => {
  const result = { x: 1, y: 2 }

  // スナップショットがファイル内に保存される
  expect(result).toMatchInlineSnapshot(`
    {
      "x": 1,
      "y": 2,
    }
  `)
})
```

### プロパティマッチング

```typescript
test('動的プロパティを含むスナップショット', () => {
  const user = {
    id: 123,
    name: 'Alice',
    createdAt: new Date(),
    sessionId: Math.random(),
  }

  // 動的な値はマッチャーで置き換え
  expect(user).toMatchSnapshot({
    createdAt: expect.any(Date),
    sessionId: expect.any(Number),
  })
})
```

### Reactコンポーネントのスナップショット

```typescript
// UserCard.test.tsx
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import UserCard from './UserCard'

test('UserCardのレンダリング', () => {
  const { container } = render(
    <UserCard name="Alice" email="alice@example.com" />
  )

  expect(container.firstChild).toMatchSnapshot()
})
```

## カスタムマッチャー

独自のアサーション関数を作成できます。

### カスタムマッチャーの定義

```typescript
// setup.ts
import { expect } from 'vitest'

interface CustomMatchers<R = unknown> {
  toBeWithinRange(min: number, max: number): R
  toBeValidEmail(): R
  toHaveBeenCalledWithMatch(expected: unknown): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within range ${min} - ${max}`
          : `Expected ${received} to be within range ${min} - ${max}`,
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received)

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid email`
          : `Expected ${received} to be a valid email`,
    }
  },
})
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./setup.ts'],
  },
})
```

### カスタムマッチャーの使用

```typescript
// custom-matchers.test.ts
import { expect, test } from 'vitest'

test('数値が範囲内', () => {
  expect(15).toBeWithinRange(10, 20)
  expect(5).not.toBeWithinRange(10, 20)
})

test('メールアドレスのバリデーション', () => {
  expect('user@example.com').toBeValidEmail()
  expect('invalid-email').not.toBeValidEmail()
})
```

### 非同期カスタムマッチャー

```typescript
expect.extend({
  async toBeResolvingTo(received: Promise<unknown>, expected: unknown) {
    try {
      const value = await received
      const pass = value === expected

      return {
        pass,
        message: () =>
          pass
            ? `Expected promise not to resolve to ${expected}`
            : `Expected promise to resolve to ${expected}, but got ${value}`,
      }
    } catch (error) {
      return {
        pass: false,
        message: () => `Expected promise to resolve, but it rejected with ${error}`,
      }
    }
  },
})
```

## Benchmark Mode - パフォーマンステスト

関数のパフォーマンスを測定・比較できます。

```typescript
// benchmark.bench.ts
import { bench, describe } from 'vitest'

describe('配列操作のパフォーマンス', () => {
  const data = Array.from({ length: 10000 }, (_, i) => i)

  bench('for loop', () => {
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      sum += data[i]
    }
    return sum
  })

  bench('forEach', () => {
    let sum = 0
    data.forEach((n) => {
      sum += n
    })
    return sum
  })

  bench('reduce', () => {
    return data.reduce((acc, n) => acc + n, 0)
  })
})

describe('文字列連結', () => {
  const items = Array.from({ length: 1000 }, (_, i) => `item${i}`)

  bench('配列join', () => {
    return items.join(',')
  })

  bench('文字列連結', () => {
    let result = ''
    for (const item of items) {
      result += item + ','
    }
    return result
  })

  bench('テンプレートリテラル', () => {
    return items.map((item) => `${item}`).join(',')
  })
})
```

実行:

```bash
npx vitest bench
```

## カバレッジ設定

コードカバレッジを測定します。

### セットアップ

```bash
npm install -D @vitest/coverage-v8
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8', // または 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/types.ts',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
})
```

実行:

```bash
npx vitest --coverage
```

### 特定のファイルだけカバレッジ測定

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/generated/**'],
    },
  },
})
```

## Workspace - モノレポ対応

複数のプロジェクトを一度にテストできます。

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  // フロントエンド
  {
    extends: './vitest.config.ts',
    test: {
      name: 'frontend',
      include: ['apps/web/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
    },
  },

  // バックエンド
  {
    test: {
      name: 'backend',
      include: ['apps/api/**/*.test.ts'],
      environment: 'node',
    },
  },

  // ブラウザテスト
  {
    test: {
      name: 'browser',
      include: ['apps/e2e/**/*.test.ts'],
      browser: {
        enabled: true,
        name: 'chromium',
      },
    },
  },
])
```

実行:

```bash
# すべてのワークスペース
npx vitest

# 特定のワークスペースのみ
npx vitest --project frontend
```

## まとめ

Vitest v2の高度な機能を解説しました。

### 主要機能のまとめ

- **Browser Mode**: 実ブラウザでの正確なテスト
- **Type Testing**: 型安全性の保証
- **Snapshot Testing**: UI変更の検出
- **カスタムマッチャー**: ドメイン固有のアサーション
- **Benchmark**: パフォーマンス測定
- **Workspace**: モノレポ対応

### ベストプラクティス

1. **適切なテスト環境**: Node.js、jsdom、ブラウザを使い分け
2. **型テストの活用**: TypeScript型の正確性を保証
3. **スナップショットの適切な使用**: 過度な使用は避ける
4. **カバレッジ目標**: 80%以上を目指す
5. **ベンチマークで最適化**: パフォーマンスクリティカルな箇所

Vitestの高度な機能を活用して、信頼性の高いテストスイートを構築しましょう。
