---
title: "Vitest高度なテスト技法ガイド - モック、スナップショット、カバレッジ活用術"
description: "Viteベースの高速テストフレームワークVitestの高度な使い方を徹底解説。モック・スパイの活用法、スナップショットテスト、カバレッジ設定、並列実行によるCI高速化、カスタムマッチャーの実装方法をコード例付きで紹介。Jestからの移行ガイドも掲載。"
pubDate: "2025-02-06"
tags: ['テスト', 'ビルドツール', 'フロントエンド', '開発ツール', '開発効率化']
heroImage: '../../assets/thumbnails/vitest-advanced-guide.jpg'
---

VitestはViteベースの超高速テストフレームワークです。Jestとの互換性を保ちながら、ESMネイティブサポート、TypeScript標準対応、そして驚異的な実行速度を実現しています。

## Vitestの基本セットアップ

```bash
npm install -D vitest @vitest/ui
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,  // describe, it, expect等をグローバルに
    environment: 'jsdom',  // DOM環境のシミュレーション
    setupFiles: './test/setup.ts',  // セットアップファイル
    coverage: {
      provider: 'v8',  // カバレッジプロバイダー
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
    testTimeout: 10000,  // タイムアウト設定
  },
})
```

## モックの高度なテクニック

### 関数のモック

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('Advanced Mocking', () => {
  // 基本的なモック
  it('should mock a function', () => {
    const mockFn = vi.fn()
    mockFn('hello')

    expect(mockFn).toHaveBeenCalledWith('hello')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  // 戻り値の設定
  it('should return mocked value', () => {
    const mockFn = vi.fn()
      .mockReturnValueOnce('first')
      .mockReturnValueOnce('second')
      .mockReturnValue('default')

    expect(mockFn()).toBe('first')
    expect(mockFn()).toBe('second')
    expect(mockFn()).toBe('default')
    expect(mockFn()).toBe('default')
  })

  // 非同期モック
  it('should mock async function', async () => {
    const mockAsync = vi.fn()
      .mockResolvedValueOnce({ id: 1, name: 'User 1' })
      .mockResolvedValueOnce({ id: 2, name: 'User 2' })
      .mockRejectedValueOnce(new Error('Failed'))

    await expect(mockAsync()).resolves.toEqual({ id: 1, name: 'User 1' })
    await expect(mockAsync()).resolves.toEqual({ id: 2, name: 'User 2' })
    await expect(mockAsync()).rejects.toThrow('Failed')
  })
})
```

### タイマーのモック

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Timer Mocking', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fast-forward timers', () => {
    const callback = vi.fn()

    setTimeout(callback, 1000)

    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should run all timers', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    setTimeout(callback1, 1000)
    setTimeout(callback2, 5000)

    vi.runAllTimers()

    expect(callback1).toHaveBeenCalled()
    expect(callback2).toHaveBeenCalled()
  })
})
```

## スナップショットテスト

### 基本的なスナップショット

```typescript
import { describe, it, expect } from 'vitest'

describe('Snapshot Testing', () => {
  it('should match snapshot', () => {
    const data = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date('2025-01-01'),
    }

    expect(data).toMatchSnapshot()
  })

  // インラインスナップショット
  it('should match inline snapshot', () => {
    const user = { id: 1, name: 'John' }

    expect(user).toMatchInlineSnapshot(`
      {
        "id": 1,
        "name": "John",
      }
    `)
  })
})
```

## カバレッジの最適化

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],

      // カバレッジ基準
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },

      // 除外パターン
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types.ts',
        '**/*.config.ts',
      ],

      // 特定のファイルのみ
      include: ['src/**/*.ts', 'src/**/*.tsx'],

      // カバレッジレポートの出力先
      reportsDirectory: './coverage',
    },
  },
})
```

実行:

```bash
# カバレッジ付きでテスト
vitest --coverage

# HTMLレポート確認
open coverage/index.html
```

## UIモード（Vitest UI）

```bash
# UIモードで起動
vitest --ui

# ブラウザで http://localhost:51204/__vitest__/ を開く
```

Vitest UIでできること:
- テスト実行状況のビジュアル表示
- テストのフィルタリング・検索
- カバレッジレポートの確認
- テストファイルのソースコード表示
- ホットリロード

## スナップショットテストの実践パターン

スナップショットテストは便利ですが、使い方を誤ると保守性が低下します。実務で役立つパターンを紹介します。

### 動的な値を含むスナップショット

日時やランダムIDなど、毎回変わる値は`expect.any()`で対応します。

```typescript
import { describe, it, expect } from 'vitest'

describe('Dynamic Snapshot', () => {
  it('動的なフィールドをマスクする', () => {
    const user = {
      id: crypto.randomUUID(),
      name: 'テストユーザー',
      createdAt: new Date().toISOString(),
    }

    expect(user).toMatchSnapshot({
      id: expect.any(String),
      createdAt: expect.any(String),
    })
  })
})
```

スナップショットファイルが肥大化する場合は `--update` フラグで定期的に整理しましょう。

---

## テストフィクスチャの活用

テストデータの作成を効率化するフィクスチャパターンです。

### ファクトリ関数パターン

```typescript
// test/factories/user.ts
import { faker } from '@faker-js/faker/locale/ja'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'guest'
}

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'user',
    ...overrides,
  }
}
```

テスト内では `createUser({ role: 'admin' })` のように、必要なフィールドだけ上書きして使います。テストの意図が明確になり、不要なデータ定義の重複を排除できます。
```

---

## パフォーマンステストパターン

レスポンス時間やメモリ使用量の回帰テストもVitestで行えます。

```typescript
import { describe, it, expect, bench } from 'vitest'

describe('Performance', () => {
  bench('配列ソート: 10,000要素', () => {
    const arr = Array.from({ length: 10000 }, () => Math.random())
    arr.sort((a, b) => a - b)
  })

  bench('Map検索: 10,000エントリ', () => {
    const map = new Map<number, string>()
    for (let i = 0; i < 10000; i++) {
      map.set(i, `value-${i}`)
    }
    map.get(9999)
  })
})
```

実行時間の上限を設けることで、パフォーマンスの劣化を検知できます。

```typescript
it('重い処理が500ms以内に完了する', async () => {
  const start = performance.now()
  await heavyComputation()
  const duration = performance.now() - start

  expect(duration).toBeLessThan(500)
})
```

CIでベンチマーク結果を記録し、PRごとにパフォーマンスの変化を追跡するとさらに効果的です。

---

## まとめ

Vitestは、高速で強力なテストフレームワークです。主な利点は以下の通りです。

- **超高速**: Viteの恩恵を受けた高速実行
- **型安全**: TypeScriptネイティブサポート
- **Jest互換**: 既存のJestテストも動く
- **優れたDX**: UIモード、ウォッチモード、ホットリロード
- **包括的な機能**: モック、スナップショット、カバレッジ

これらのテクニックを活用して、堅牢で保守性の高いテストスイートを構築しましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
