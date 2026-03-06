---
title: "Node.js組み込みテストランナー完全ガイド"
description: "Node.js 20で正式リリースされた組み込みテストランナーを徹底解説。Jest/Vitestからの移行方法、モック、カバレッジ取得まで実践的な使い方を紹介します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-05"
category: "Backend"
tags: ["Node.js", "Testing", "JavaScript", "TypeScript", "TDD"]
---
Node.js 20で正式リリースされた組み込みテストランナーは、外部ライブラリなしでユニットテストを実行できる強力な機能です。2026年現在、多くのプロジェクトがJest/Vitestから移行しています。本記事では、Node.js Test Runnerの実践的な使い方を詳しく解説します。

## Node.js Test Runnerとは

Node.js 18で実験的に導入され、Node.js 20で正式リリースされた組み込みテストフレームワークです。

### 主な特徴

- **ゼロ依存**: 外部ライブラリ不要
- **高速**: ネイティブ実装で高速動作
- **TypeScript対応**: `--experimental-strip-types`で直接実行可能（Node.js 22+）
- **並列実行**: デフォルトで並列テスト実行
- **モック機能**: 組み込みモック機能
- **カバレッジ**: `c8`または`--experimental-test-coverage`

## 基本的な使い方

### インストール不要で開始

```javascript
// test/sum.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('1 + 1 = 2', () => {
  assert.equal(1 + 1, 2)
})

test('配列の検証', () => {
  const arr = [1, 2, 3]
  assert.deepEqual(arr, [1, 2, 3])
})

test('非同期テスト', async () => {
  const result = await Promise.resolve(42)
  assert.equal(result, 42)
})
```

```bash
# テスト実行
node --test

# または特定ファイル
node --test test/sum.test.js
```

### TypeScript対応

```typescript
// test/sum.test.ts
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('Math operations', () => {
  test('addition', () => {
    assert.equal(1 + 1, 2)
  })

  test('subtraction', () => {
    assert.equal(5 - 3, 2)
  })
})
```

```bash
# Node.js 22+ (実験的機能)
node --experimental-strip-types --test test/sum.test.ts

# または tsx 使用
npx tsx --test test/sum.test.ts
```

## テストの構造化

### describe / test ネスト

```typescript
import { describe, test, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('User Service', () => {
  let db: Database

  before(async () => {
    // 全テスト開始前に1回実行
    db = await Database.connect()
  })

  after(async () => {
    // 全テスト終了後に1回実行
    await db.disconnect()
  })

  beforeEach(async () => {
    // 各テスト前に実行
    await db.clearUsers()
  })

  afterEach(() => {
    // 各テスト後に実行
    console.log('Test completed')
  })

  describe('createUser', () => {
    test('正常系: ユーザーを作成できる', async () => {
      const user = await createUser({ name: 'Alice', email: 'alice@example.com' })

      assert.ok(user.id)
      assert.equal(user.name, 'Alice')
      assert.equal(user.email, 'alice@example.com')
    })

    test('異常系: メールアドレスが重複している', async () => {
      await createUser({ name: 'Alice', email: 'alice@example.com' })

      await assert.rejects(
        async () => createUser({ name: 'Bob', email: 'alice@example.com' }),
        {
          name: 'DuplicateEmailError',
          message: 'Email already exists',
        }
      )
    })
  })

  describe('getUser', () => {
    test('存在するユーザーを取得', async () => {
      const created = await createUser({ name: 'Alice', email: 'alice@example.com' })
      const user = await getUser(created.id)

      assert.deepEqual(user, created)
    })

    test('存在しないユーザーはnullを返す', async () => {
      const user = await getUser('non-existent-id')
      assert.equal(user, null)
    })
  })
})
```

### テストのスキップ・専用実行

```typescript
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('Math', () => {
  // このテストのみ実行（デバッグ時に便利）
  test.only('focused test', () => {
    assert.equal(1 + 1, 2)
  })

  // このテストをスキップ
  test.skip('skipped test', () => {
    assert.equal(1 + 1, 3) // 実行されない
  })

  // TODO: 後で実装する場合
  test.todo('未実装のテスト')
})
```

## アサーション

### assert/strict の使用

```typescript
import assert from 'node:assert/strict'

// 等価性
assert.equal(actual, expected)
assert.notEqual(actual, expected)

// 深い等価性（オブジェクト・配列）
assert.deepEqual({ a: 1 }, { a: 1 })
assert.notDeepEqual({ a: 1 }, { a: 2 })

// 厳密な等価性（===）
assert.strictEqual(1, 1)
assert.notStrictEqual(1, '1')

// 真偽値
assert.ok(true)
assert.ok(1) // truthy

// 例外のアサーション
assert.throws(() => {
  throw new Error('error')
}, /error/)

// 非同期例外
await assert.rejects(
  async () => {
    throw new Error('async error')
  },
  {
    name: 'Error',
    message: 'async error',
  }
)

// マッチング
assert.match('hello world', /world/)
assert.doesNotMatch('hello', /world/)

// 型チェック
assert.ok(typeof value === 'string')
```

### カスタムマッチャー

```typescript
// test/helpers/matchers.ts
export function assertValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  assert.match(email, emailRegex, `Invalid email: ${email}`)
}

export function assertDateInRange(
  date: Date,
  start: Date,
  end: Date
) {
  assert.ok(
    date >= start && date <= end,
    `Date ${date} is not between ${start} and ${end}`
  )
}

// 使用例
import { assertValidEmail, assertDateInRange } from './helpers/matchers.js'

test('ユーザー登録', async () => {
  const user = await registerUser({ email: 'test@example.com' })

  assertValidEmail(user.email)
  assertDateInRange(user.createdAt, new Date('2026-01-01'), new Date())
})
```

## モック機能

### 関数のモック

```typescript
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

test('関数のモック', () => {
  const mockFn = mock.fn((x: number) => x * 2)

  // 関数を呼び出し
  const result = mockFn(5)

  // 戻り値の検証
  assert.equal(result, 10)

  // 呼び出し回数の検証
  assert.equal(mockFn.mock.calls.length, 1)

  // 引数の検証
  assert.deepEqual(mockFn.mock.calls[0].arguments, [5])

  // 複数回呼び出し
  mockFn(3)
  mockFn(7)

  assert.equal(mockFn.mock.calls.length, 3)
  assert.equal(mockFn.mock.calls[1].arguments[0], 3)
  assert.equal(mockFn.mock.calls[2].result, 14)
})
```

### メソッドのモック

```typescript
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

class UserService {
  async getUser(id: string) {
    // 実際のDB呼び出し
    return db.users.findById(id)
  }
}

test('メソッドのモック', async () => {
  const service = new UserService()

  // メソッドをモック化
  mock.method(service, 'getUser', async (id: string) => {
    return { id, name: 'Mocked User', email: 'mock@example.com' }
  })

  const user = await service.getUser('123')

  assert.equal(user.name, 'Mocked User')
  assert.equal(service.getUser.mock.calls.length, 1)
})
```

### モジュールのモック

```typescript
// src/api.ts
export async function fetchUser(id: string) {
  const response = await fetch(`https://api.example.com/users/${id}`)
  return response.json()
}

// test/api.test.ts
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

test('fetch のモック', async () => {
  // グローバル fetch をモック
  const mockFetch = mock.fn(async (url: string) => {
    return {
      json: async () => ({ id: '123', name: 'Test User' }),
    }
  })

  // @ts-ignore
  global.fetch = mockFetch

  const user = await fetchUser('123')

  assert.equal(user.name, 'Test User')
  assert.equal(mockFetch.mock.calls.length, 1)
  assert.match(
    mockFetch.mock.calls[0].arguments[0] as string,
    /users\/123/
  )
})
```

### タイマーのモック

```typescript
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

test('タイマーのモック', () => {
  const timers = mock.timers
  timers.enable({ apis: ['setTimeout'] })

  let called = false

  setTimeout(() => {
    called = true
  }, 1000)

  // まだ呼ばれていない
  assert.equal(called, false)

  // 時間を進める
  timers.tick(1000)

  // 呼ばれた
  assert.equal(called, true)

  timers.reset()
})
```

## 非同期テスト

### Promise

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('Promise のテスト', async () => {
  const result = await fetchData()
  assert.equal(result.status, 'success')
})

test('Promise のエラー', async () => {
  await assert.rejects(
    async () => {
      await fetchInvalidData()
    },
    {
      name: 'ValidationError',
    }
  )
})
```

### 並列実行の制御

```typescript
import { test, describe } from 'node:test'

describe('並列実行', { concurrency: 2 }, () => {
  // 最大2並列で実行
  test('test 1', async () => { /* ... */ })
  test('test 2', async () => { /* ... */ })
  test('test 3', async () => { /* ... */ })
  test('test 4', async () => { /* ... */ })
})

describe('直列実行', { concurrency: 1 }, () => {
  // 1つずつ実行
  test('test 1', async () => { /* ... */ })
  test('test 2', async () => { /* ... */ })
})
```

## カバレッジ取得

### c8 を使用

```bash
# c8 インストール
npm install -D c8

# カバレッジ付きでテスト実行
npx c8 node --test
```

```json
// package.json
{
  "scripts": {
    "test": "node --test",
    "test:coverage": "c8 --reporter=lcov --reporter=text node --test"
  }
}
```

### 組み込みカバレッジ（実験的）

```bash
# Node.js 22+
node --experimental-test-coverage --test
```

## 実践的なテストパターン

### API テスト

```typescript
// test/api/users.test.ts
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app } from '../src/app.js'

describe('User API', () => {
  let server: Server

  before(async () => {
    server = app.listen(0) // ランダムポート
  })

  after(() => {
    server.close()
  })

  test('GET /users/:id', async () => {
    const port = server.address().port
    const response = await fetch(`http://localhost:${port}/users/123`)
    const user = await response.json()

    assert.equal(response.status, 200)
    assert.equal(user.id, '123')
  })

  test('POST /users', async () => {
    const port = server.address().port
    const response = await fetch(`http://localhost:${port}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
    })

    assert.equal(response.status, 201)

    const user = await response.json()
    assert.ok(user.id)
    assert.equal(user.name, 'Alice')
  })
})
```

### データベーステスト

```typescript
// test/db/users.test.ts
import { describe, test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { db } from '../src/db.js'

describe('User Repository', () => {
  beforeEach(async () => {
    await db.users.deleteMany()
  })

  test('ユーザー作成', async () => {
    const user = await db.users.create({
      data: {
        name: 'Alice',
        email: 'alice@example.com',
      },
    })

    assert.ok(user.id)
    assert.equal(user.name, 'Alice')

    const found = await db.users.findUnique({
      where: { id: user.id },
    })

    assert.deepEqual(found, user)
  })
})
```

## package.json設定

```json
{
  "name": "my-app",
  "type": "module",
  "scripts": {
    "test": "node --test",
    "test:watch": "node --test --watch",
    "test:coverage": "c8 --reporter=lcov --reporter=text node --test"
  },
  "devDependencies": {
    "c8": "^9.1.0",
    "tsx": "^4.7.0"
  }
}
```

## まとめ

Node.js組み込みテストランナーは、シンプルで強力なテスト環境を提供します。

**メリット**
- 外部依存なしで始められる
- 高速な実行速度
- TypeScript対応
- モック機能が充実

**適用シーン**
- 新規プロジェクト
- 軽量なテスト要件
- Node.js APIのテスト
- ライブラリ開発

**移行のポイント**
- Jest/Vitestからの移行は比較的容易
- 段階的に導入可能
- カバレッジツールはc8を推奨

2026年現在、多くのプロジェクトがNode.js Test Runnerに移行し、依存関係の削減とテスト実行速度の向上を実現しています。

**参考リンク**
- [Node.js Test Runner Documentation](https://nodejs.org/api/test.html)
- [Node.js Assert Documentation](https://nodejs.org/api/assert.html)
- [c8 - Native V8 coverage](https://github.com/bcoe/c8)
