---
title: "Vitest高度なテスト技法ガイド - モック、スナップショット、カバレッジ活用術"
description: "ViteベースのテストフレームワークVitestの高度な使い方を徹底解説。"
pubDate: "2025-02-06"
tags: ['テスト', 'ビルドツール', 'フロントエンド', '開発ツール', '開発効率化']
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

## まとめ

Vitestは、高速で強力なテストフレームワークです。主な利点は以下の通りです。

- **超高速**: Viteの恩恵を受けた高速実行
- **型安全**: TypeScriptネイティブサポート
- **Jest互換**: 既存のJestテストも動く
- **優れたDX**: UIモード、ウォッチモード、ホットリロード
- **包括的な機能**: モック、スナップショット、カバレッジ

これらのテクニックを活用して、堅牢で保守性の高いテストスイートを構築しましょう。
