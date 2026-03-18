---
title: 'Bun Test Runner完全ガイド: Jest互換の超高速テストフレームワーク'
description: 'Bun Test Runnerの高度な使い方、カスタムマッチャー、並列実行制御、CI/CD統合、Jest移行戦略など実践的なテスト設計パターンを解説します。'
pubDate: '2025-09-18'
updatedDate: '2025-09-18'
category: 'テスト'
tags: ['Bun', 'テスト', 'Jest', 'TypeScript', 'パフォーマンス']
---

# Bun Test Runner完全ガイド

Bun Test Runnerは、Bunランタイムに組み込まれた超高速テストフレームワークです。Jest互換のAPIを提供しながら、圧倒的なパフォーマンスを実現します。

本記事では、高度な使い方、カスタムマッチャー、並列実行制御、Jest移行戦略など、実践的なテスト設計パターンを解説します。

## 高度なテスト設計

### テストスイートの構造化

```typescript
// tests/user/user.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { Database } from 'bun:sqlite'
import { UserService } from '@/services/user'

describe('UserService', () => {
  let db: Database
  let userService: UserService

  beforeAll(() => {
    // テスト用DBセットアップ
    db = new Database(':memory:')
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      )
    `)
    userService = new UserService(db)
  })

  afterAll(() => {
    db.close()
  })

  describe('createUser', () => {
    test('正常系: ユーザーを作成できる', async () => {
      const user = await userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
      })

      expect(user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      })
      expect(user.id).toBeGreaterThan(0)
    })

    test('異常系: 重複したメールアドレスでエラー', async () => {
      await userService.createUser({
        email: 'duplicate@example.com',
        name: 'User 1',
      })

      await expect(
        userService.createUser({
          email: 'duplicate@example.com',
          name: 'User 2',
        })
      ).rejects.toThrow('Email already exists')
    })

    test('異常系: バリデーションエラー', async () => {
      await expect(
        userService.createUser({
          email: 'invalid-email',
          name: 'User',
        })
      ).rejects.toThrow('Invalid email format')
    })
  })

  describe('findUserById', () => {
    test('正常系: ユーザーを取得できる', async () => {
      const created = await userService.createUser({
        email: 'find@example.com',
        name: 'Find User',
      })

      const found = await userService.findUserById(created.id)

      expect(found).toEqual(created)
    })

    test('異常系: 存在しないIDでnullを返す', async () => {
      const user = await userService.findUserById(99999)
      expect(user).toBeNull()
    })
  })

  describe('updateUser', () => {
    test('正常系: ユーザー情報を更新できる', async () => {
      const user = await userService.createUser({
        email: 'update@example.com',
        name: 'Original Name',
      })

      const updated = await userService.updateUser(user.id, {
        name: 'Updated Name',
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.email).toBe('update@example.com')
    })
  })

  describe('deleteUser', () => {
    test('正常系: ユーザーを削除できる', async () => {
      const user = await userService.createUser({
        email: 'delete@example.com',
        name: 'Delete User',
      })

      await userService.deleteUser(user.id)

      const deleted = await userService.findUserById(user.id)
      expect(deleted).toBeNull()
    })
  })
})
```

### パラメータ化テスト

```typescript
import { test, expect } from 'bun:test'

// テストケースを配列で定義
const validationCases = [
  { input: 'test@example.com', expected: true },
  { input: 'user.name+tag@example.co.uk', expected: true },
  { input: 'invalid-email', expected: false },
  { input: '@example.com', expected: false },
  { input: 'test@', expected: false },
  { input: '', expected: false },
]

validationCases.forEach(({ input, expected }) => {
  test(`validateEmail("${input}") should return ${expected}`, () => {
    expect(validateEmail(input)).toBe(expected)
  })
})

// より複雑な例
interface PasswordTestCase {
  password: string
  minLength: number
  expected: {
    isValid: boolean
    errors: string[]
  }
}

const passwordCases: PasswordTestCase[] = [
  {
    password: 'short',
    minLength: 8,
    expected: {
      isValid: false,
      errors: ['Password must be at least 8 characters'],
    },
  },
  {
    password: 'ValidPass123!',
    minLength: 8,
    expected: {
      isValid: true,
      errors: [],
    },
  },
  {
    password: 'NoNumbersOrSpecial',
    minLength: 8,
    expected: {
      isValid: false,
      errors: ['Password must contain at least one number or special character'],
    },
  },
]

passwordCases.forEach(({ password, minLength, expected }) => {
  test(`validatePassword("${password}", ${minLength})`, () => {
    const result = validatePassword(password, minLength)
    expect(result).toEqual(expected)
  })
})
```

## カスタムマッチャー

### 独自マッチャーの作成

```typescript
// tests/matchers.ts
import { expect } from 'bun:test'

// カスタムマッチャーの型定義
interface CustomMatchers<R = unknown> {
  toBeWithinRange(min: number, max: number): R
  toBeValidEmail(): R
  toBeValidURL(): R
  toMatchSchema(schema: object): R
}

declare module 'bun:test' {
  interface Matchers<T> extends CustomMatchers<T> {}
  interface AsymmetricMatchers extends CustomMatchers {}
}

// カスタムマッチャーの実装
expect.extend({
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within range ${min} - ${max}`
          : `expected ${received} to be within range ${min} - ${max}`,
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received)
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
    }
  },

  toBeValidURL(received: string) {
    try {
      new URL(received)
      return {
        pass: true,
        message: () => `expected ${received} not to be a valid URL`,
      }
    } catch {
      return {
        pass: false,
        message: () => `expected ${received} to be a valid URL`,
      }
    }
  },

  toMatchSchema(received: any, schema: object) {
    // 簡易的なスキーマバリデーション
    const validateSchema = (data: any, schemaObj: any): boolean => {
      for (const key in schemaObj) {
        if (!(key in data)) return false
        if (typeof data[key] !== typeof schemaObj[key]) return false
      }
      return true
    }

    const pass = validateSchema(received, schema)
    return {
      pass,
      message: () =>
        pass
          ? `expected object not to match schema`
          : `expected object to match schema`,
    }
  },
})
```

### カスタムマッチャーの使用

```typescript
// tests/custom-matchers.test.ts
import { test, expect } from 'bun:test'
import './matchers' // カスタムマッチャーを読み込む

test('toBeWithinRange', () => {
  expect(5).toBeWithinRange(1, 10)
  expect(0).toBeWithinRange(-5, 5)
  expect(100).not.toBeWithinRange(0, 50)
})

test('toBeValidEmail', () => {
  expect('test@example.com').toBeValidEmail()
  expect('user+tag@domain.co.uk').toBeValidEmail()
  expect('invalid-email').not.toBeValidEmail()
})

test('toBeValidURL', () => {
  expect('https://example.com').toBeValidURL()
  expect('http://localhost:3000').toBeValidURL()
  expect('not-a-url').not.toBeValidURL()
})

test('toMatchSchema', () => {
  const user = {
    id: 1,
    name: 'John',
    email: 'john@example.com',
  }

  expect(user).toMatchSchema({
    id: 0,
    name: '',
    email: '',
  })
})
```

## モックの高度な使い方

### 関数モックのライフサイクル

```typescript
import { test, expect, mock, beforeEach, afterEach } from 'bun:test'

let fetchMock: ReturnType<typeof mock>

beforeEach(() => {
  // 各テスト前にモックをリセット
  fetchMock = mock(async (url: string) => {
    return {
      ok: true,
      json: async () => ({ data: 'mocked' }),
    }
  })

  global.fetch = fetchMock as any
})

afterEach(() => {
  // モックをクリア
  fetchMock.mockClear()
})

test('fetch is called with correct URL', async () => {
  await fetch('https://api.example.com/users')

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users')
})

test('fetch returns mocked data', async () => {
  const response = await fetch('https://api.example.com/users')
  const data = await response.json()

  expect(data).toEqual({ data: 'mocked' })
})
```

### 条件付きモック実装

```typescript
import { test, expect, mock } from 'bun:test'

test('条件付きモック', async () => {
  const apiMock = mock((endpoint: string) => {
    // エンドポイントによって異なるレスポンス
    if (endpoint === '/users') {
      return Promise.resolve({
        ok: true,
        json: async () => [{ id: 1, name: 'John' }],
      })
    }

    if (endpoint === '/posts') {
      return Promise.resolve({
        ok: true,
        json: async () => [{ id: 1, title: 'Post 1' }],
      })
    }

    return Promise.resolve({
      ok: false,
      status: 404,
    })
  })

  global.fetch = apiMock as any

  const usersResponse = await fetch('/users')
  const usersData = await usersResponse.json()
  expect(usersData).toHaveLength(1)

  const postsResponse = await fetch('/posts')
  const postsData = await postsResponse.json()
  expect(postsData).toHaveLength(1)

  const notFoundResponse = await fetch('/unknown')
  expect(notFoundResponse.ok).toBe(false)
  expect(notFoundResponse.status).toBe(404)
})
```

### クラスのモック

```typescript
import { test, expect, mock } from 'bun:test'

class DatabaseService {
  async query(sql: string) {
    // 実際のDB接続
    throw new Error('Not implemented')
  }

  async transaction(callback: () => Promise<void>) {
    // トランザクション処理
    throw new Error('Not implemented')
  }
}

test('クラスメソッドのモック', async () => {
  const db = new DatabaseService()

  // メソッドをモック
  const queryMock = mock(async (sql: string) => {
    if (sql.includes('SELECT')) {
      return [{ id: 1, name: 'Test' }]
    }
    return []
  })

  db.query = queryMock

  const result = await db.query('SELECT * FROM users')

  expect(queryMock).toHaveBeenCalledWith('SELECT * FROM users')
  expect(result).toEqual([{ id: 1, name: 'Test' }])
})
```

## 並列実行とパフォーマンス

### 並列実行の制御

```typescript
// bun.test.config.ts
export default {
  // 並列実行数を制限
  concurrency: 4,

  // タイムアウト設定
  timeout: 5000,

  // テストファイルのパターン
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
}
```

```bash
# コマンドラインで並列実行数を指定
bun test --concurrency 8

# 逐次実行
bun test --concurrency 1
```

### テストの分離

```typescript
// tests/isolated.test.ts
import { test, expect } from 'bun:test'

// デフォルトは並列実行
test('並列実行テスト1', async () => {
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(true).toBe(true)
})

test('並列実行テスト2', async () => {
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(true).toBe(true)
})

// 逐次実行が必要な場合
test.serial('逐次実行テスト1', async () => {
  // グローバル状態を変更
  globalThis.sharedState = 'test1'
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(globalThis.sharedState).toBe('test1')
})

test.serial('逐次実行テスト2', async () => {
  globalThis.sharedState = 'test2'
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(globalThis.sharedState).toBe('test2')
})
```

## スナップショットテストの活用

### 動的スナップショット

```typescript
import { test, expect } from 'bun:test'

test('APIレスポンスのスナップショット', async () => {
  const response = await fetch('https://api.example.com/users/1')
  const data = await response.json()

  // タイムスタンプなど動的な値を除外
  const snapshot = {
    ...data,
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  }

  expect(snapshot).toMatchSnapshot()
})
```

### カスタムシリアライザー

```typescript
import { test, expect } from 'bun:test'

// Dateオブジェクトのカスタムシリアライザー
expect.addSnapshotSerializer({
  test: (val) => val instanceof Date,
  serialize: (val: Date) => `Date<${val.toISOString()}>`,
})

test('Dateスナップショット', () => {
  const data = {
    name: 'Test',
    createdAt: new Date('2025-01-01'),
  }

  expect(data).toMatchInlineSnapshot(`
    {
      "name": "Test",
      "createdAt": Date<2025-01-01T00:00:00.000Z>
    }
  `)
})
```

## Jestからの移行

### 設定ファイル変換

```javascript
// jest.config.js → bunfig.toml

// Jest設定
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
}
```

```toml
# bunfig.toml

[test]
# テストファイルのパターン
testMatch = ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"]

# カバレッジ設定
coverage = true
coverageThreshold = 80
coverageReporter = ["text", "html", "lcov"]
coveragePathIgnorePatterns = ["/node_modules/", "/dist/"]

# その他の設定
bail = false
verbose = true
```

### API差異の対応

```typescript
// Jestの機能 → Bunでの代替

// 1. jest.fn() → mock()
import { mock } from 'bun:test'
const mockFn = mock((x) => x * 2)

// 2. jest.spyOn() → spyOn()
import { spyOn } from 'bun:test'
const spy = spyOn(obj, 'method')

// 3. jest.mock() → 現時点では未対応
// 手動でモック実装が必要

// 4. jest.setTimeout() → test()の第3引数
test('long test', async () => {
  // テスト処理
}, 10000) // 10秒

// 5. jest.useFakeTimers() → 現時点では未対応
// 代替案: テストヘルパー関数を使用
```

### 移行スクリプト

```typescript
// scripts/migrate-to-bun.ts

import { readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'

async function migrateTestFile(filePath: string) {
  let content = await readFile(filePath, 'utf-8')

  // import文の置き換え
  content = content.replace(
    /from ['"]@jest\/globals['"]/g,
    'from "bun:test"'
  )
  content = content.replace(
    /from ['"]jest['"]/g,
    'from "bun:test"'
  )

  // jest.fn() → mock()
  content = content.replace(/jest\.fn\(/g, 'mock(')

  // jest.spyOn() → spyOn()
  content = content.replace(/jest\.spyOn\(/g, 'spyOn(')

  await writeFile(filePath, content)
}

// すべてのテストファイルを移行
const files = await glob('**/*.test.ts')
for (const file of files) {
  await migrateTestFile(file)
  console.log(`Migrated: ${file}`)
}
```

## CI/CD統合

### GitHub Actions

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
        bun-version: [latest, canary]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: ${{ matrix.bun-version }}

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run tests
        run: bun test

      - name: Generate coverage
        run: bun test --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
image: oven/bun:latest

stages:
  - test
  - report

test:
  stage: test
  script:
    - bun install
    - bun test --coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/

report:
  stage: report
  dependencies:
    - test
  script:
    - echo "Tests completed"
  only:
    - main
```

## ベストプラクティス

### 1. テストの命名規則

```typescript
// ❌ 悪い例
test('test 1', () => {})
test('it works', () => {})

// ✅ 良い例
test('createUser: メールアドレスが重複している場合エラーを返す', () => {})
test('calculateTotal: 税込み価格を正しく計算する', () => {})
test('formatDate: ISO形式の日付を日本語形式に変換する', () => {})
```

### 2. AAA パターン

```typescript
test('ユーザー作成のテスト', async () => {
  // Arrange (準備)
  const userService = new UserService()
  const userData = {
    email: 'test@example.com',
    name: 'Test User',
  }

  // Act (実行)
  const user = await userService.createUser(userData)

  // Assert (検証)
  expect(user.email).toBe('test@example.com')
  expect(user.name).toBe('Test User')
  expect(user.id).toBeGreaterThan(0)
})
```

### 3. テストデータの管理

```typescript
// tests/fixtures/users.ts
export const testUsers = {
  admin: {
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  },
  user: {
    email: 'user@example.com',
    name: 'Regular User',
    role: 'user',
  },
  guest: {
    email: 'guest@example.com',
    name: 'Guest User',
    role: 'guest',
  },
}

// tests/user.test.ts
import { testUsers } from './fixtures/users'

test('管理者権限のテスト', async () => {
  const admin = await createUser(testUsers.admin)
  expect(admin.role).toBe('admin')
})
```

## まとめ

Bun Test Runnerは、Jest互換のAPIを持ちながら圧倒的なパフォーマンスを実現する次世代テストフレームワークです。

### 主な利点

1. **超高速実行** - Jestの数倍〜数十倍の速度
2. **ゼロコンフィグ** - 設定不要ですぐ使える
3. **TypeScript対応** - トランスパイル不要
4. **Jest互換** - 既存テストの移行が簡単
5. **組み込みツール** - カバレッジ、モック、スナップショット

### 移行のポイント

- 段階的な移行が可能（Jest併用）
- ほとんどのJest APIが動作
- 一部機能は手動実装が必要

高速なテストフィードバックループを求めるプロジェクトには、Bun Test Runnerが最適な選択です。
