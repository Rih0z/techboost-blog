---
title: 'GitHub Copilot Workspace完全ガイド - AI駆動開発環境の実践'
description: 'GitHub Copilot Workspaceの完全ガイド。AI駆動開発環境、自動コード生成、テスト自動化、PR作成、実装計画からデプロイまでの実践的な使い方を詳しく解説。'
pubDate: 'Feb 05 2026'
tags: ['GitHub', 'AI', 'Copilot']
---

# GitHub Copilot Workspace完全ガイド

GitHub Copilot Workspaceは、AIがコーディングを支援するだけでなく、設計から実装、テスト、PRの作成まで一貫してサポートする革新的な開発環境です。本記事では、Copilot Workspaceの使い方から実践的な活用方法まで徹底解説します。

## 目次

1. Copilot Workspaceとは
2. セットアップと基本操作
3. 実装計画の作成
4. コード生成とレビュー
5. テストの自動生成
6. デバッグとリファクタリング
7. PR作成とレビュー
8. 実践的なユースケース
9. ベストプラクティス

## 1. Copilot Workspaceとは

### 従来のCopilotとの違い

| 機能 | GitHub Copilot | Copilot Workspace |
|------|----------------|-------------------|
| コード補完 | ○ | ○ |
| 実装計画作成 | × | ○ |
| マルチファイル編集 | × | ○ |
| テスト自動生成 | △ | ○ |
| PR自動作成 | × | ○ |
| コードレビュー | × | ○ |

### 主な機能

1. **自然言語からの実装計画生成**: 「ユーザー認証機能を追加したい」→ 実装計画を自動作成
2. **マルチファイル同時編集**: 関連するファイルを一括で修正
3. **テスト自動生成**: 実装に合わせたテストコードを自動生成
4. **PR作成**: コミットメッセージからPR本文まで自動作成
5. **コードレビュー**: AIによる自動レビューとフィードバック

## 2. セットアップと基本操作

### アクセス方法

```bash
# GitHub Copilot Workspaceへのアクセス
https://copilot-workspace.githubnext.com/

# または GitHub.comのリポジトリから
# 「Code」→「Open with Copilot Workspace」
```

### 初期設定

```javascript
// .github/copilot-workspace.json
{
  "version": "1.0",
  "settings": {
    "language": "ja",
    "codeStyle": {
      "typescript": {
        "semicolons": true,
        "quotes": "single",
        "trailingComma": "es5"
      }
    },
    "testFramework": "vitest",
    "preferredApproach": "incremental"
  }
}
```

### 基本的な使い方

1. **Issueから開始**

```markdown
<!-- GitHub Issue -->
タイトル: ダークモード機能を追加したい

## 説明
ユーザーがライトモードとダークモードを切り替えられる機能を追加したい。

## 要件
- トグルスイッチでモードを切り替え
- ユーザーの設定を保存
- システムの設定を自動検知
```

2. **Copilot Workspaceで開く**

「Open with Copilot Workspace」をクリック → AIが実装計画を自動生成

## 3. 実装計画の作成

### AIによる自動計画生成

```markdown
# Copilot Workspaceが生成した実装計画

## 1. 状態管理の追加
- `hooks/useTheme.ts` を作成
- localStorage で設定を永続化
- システム設定の検知機能

## 2. UIコンポーネントの追加
- `components/ThemeToggle.tsx` を作成
- トグルスイッチのデザイン
- アニメーション

## 3. テーマの適用
- `styles/themes.css` を作成
- CSS変数でテーマを定義
- ダークモードのスタイル

## 4. テストの追加
- `hooks/useTheme.test.ts`
- `components/ThemeToggle.test.tsx`

## 影響を受けるファイル
- app/layout.tsx
- components/Header.tsx
- styles/globals.css
```

### 計画のカスタマイズ

```typescript
// Copilot Workspaceでの指示例

// プロンプト: 「Zustandを使って状態管理をしてください」
// → AIが計画を修正

// Before
- `hooks/useTheme.ts` を作成

// After
- `store/themeStore.ts` を作成（Zustand使用）
- `hooks/useTheme.ts` を削除
```

## 4. コード生成とレビュー

### 自動コード生成

#### 1. hooks/useTheme.ts

```typescript
// Copilot Workspaceが自動生成したコード

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // システムのテーマ設定を検知
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      }
    };

    // 初期値を設定
    if (theme === 'system') {
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // テーマをlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 初期値をlocalStorageから読み込み
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // テーマをDOMに適用
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };
}
```

#### 2. components/ThemeToggle.tsx

```typescript
// Copilot Workspaceが自動生成したコンポーネント

'use client';

import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

const icons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const Icon = icons[theme];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative"
      aria-label="テーマを切り替え"
    >
      <Icon className="h-5 w-5 transition-transform duration-200 hover:rotate-12" />
      <span className="sr-only">
        現在のテーマ: {theme === 'light' ? 'ライト' : theme === 'dark' ? 'ダーク' : 'システム'}
      </span>
    </Button>
  );
}
```

#### 3. styles/themes.css

```css
/* Copilot Workspaceが自動生成したテーマ定義 */

:root {
  /* Light theme */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --border: 214.3 31.8% 91.4%;
}

.dark {
  /* Dark theme */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
}

/* スムーズなトランジション */
* {
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

### コードレビュー機能

```typescript
// Copilot Workspaceのレビューコメント例

// ✅ 良い点
// - システムテーマの自動検知が実装されている
// - localStorageで設定を永続化している
// - アクセシビリティ対応（aria-label）

// ⚠️ 改善提案
// 1. useEffectの依存配列を見直してください
// 2. エラーハンドリングを追加してください
// 3. SSRとの互換性を考慮してください

// 修正案:
import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // SSR時のエラーを防ぐ
    if (typeof window === 'undefined') return 'system';

    try {
      return (localStorage.getItem('theme') as Theme) || 'system';
    } catch (error) {
      console.error('Failed to load theme from localStorage:', error);
      return 'system';
    }
  });

  // ... 残りの実装
}
```

## 5. テストの自動生成

### ユニットテストの生成

```typescript
// hooks/useTheme.test.ts
// Copilot Workspaceが自動生成したテスト

import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    // localStorageをクリア
    localStorage.clear();
    // HTMLのclass属性をリセット
    document.documentElement.className = '';
  });

  it('デフォルトでsystemテーマを使用する', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
  });

  it('テーマを切り替えられる', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
  });

  it('テーマをlocalStorageに保存する', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('localStorageからテーマを読み込む', () => {
    localStorage.setItem('theme', 'dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
  });

  it('システムのテーマ設定を検知する', () => {
    const { result } = renderHook(() => useTheme());

    // システムテーマを変更
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const event = new MediaQueryListEvent('change', { matches: true });

    act(() => {
      mediaQuery.dispatchEvent(event);
    });

    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('DOMにテーマクラスを適用する', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
```

### E2Eテストの生成

```typescript
// e2e/theme.spec.ts
// Copilot Workspaceが自動生成したE2Eテスト

import { test, expect } from '@playwright/test';

test.describe('テーマ切り替え機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('テーマトグルボタンが表示される', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /テーマを切り替え/ });
    await expect(themeToggle).toBeVisible();
  });

  test('テーマを切り替えられる', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /テーマを切り替え/ });

    // ライトテーマに切り替え
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/light/);

    // ダークテーマに切り替え
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // システムテーマに切り替え
    await themeToggle.click();
    // システムテーマが適用される（実際のテーマはOSの設定に依存）
  });

  test('テーマ設定が永続化される', async ({ page, context }) => {
    const themeToggle = page.getByRole('button', { name: /テーマを切り替え/ });

    // ダークテーマに切り替え
    await themeToggle.click();
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // ページをリロード
    await page.reload();

    // テーマが保持されている
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('システムのテーマ設定を反映する', async ({ page, context }) => {
    // ダークモードを有効化
    await context.emulateMedia({ colorScheme: 'dark' });

    const themeToggle = page.getByRole('button', { name: /テーマを切り替え/ });

    // システムテーマに設定
    await themeToggle.click();
    await themeToggle.click();
    await themeToggle.click();

    // ダークモードが適用されている
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
```

## 6. デバッグとリファクタリング

### AIによるバグ検出

```typescript
// Copilot Workspaceがバグを検出

// ❌ 問題のあるコード
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]); // ⚠️ SSR時にエラーが発生

  // ...
}

// Copilot Workspaceの指摘:
// "SSR時にlocalStorageにアクセスするとエラーになります。
//  window オブジェクトの存在チェックを追加してください。"

// ✅ 修正後のコード
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  // ...
}
```

### リファクタリング提案

```typescript
// Copilot Workspaceのリファクタリング提案

// Before: 長いuseEffect
useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = (e: MediaQueryListEvent) => {
    if (theme === 'system') {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    }
  };
  if (theme === 'system') {
    setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
  }
  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}, [theme]);

// After: 分離して読みやすく
function useSystemTheme() {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return systemTheme;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const systemTheme = useSystemTheme();

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  // ...
}
```

## 7. PR作成とレビュー

### 自動PR生成

```markdown
# Copilot Workspaceが自動生成したPR

## ダークモード機能の追加

### 変更内容

- テーマ切り替え機能を実装
- ライト/ダーク/システムの3つのモードをサポート
- ユーザーの設定をlocalStorageに永続化
- システムのテーマ設定を自動検知

### 変更されたファイル

- ✨ `hooks/useTheme.ts` - テーマ管理のカスタムフック
- ✨ `components/ThemeToggle.tsx` - テーマ切り替えUI
- ✨ `styles/themes.css` - テーマのCSS変数定義
- 🔧 `app/layout.tsx` - ThemeToggleの追加
- 🧪 `hooks/useTheme.test.ts` - ユニットテスト
- 🧪 `e2e/theme.spec.ts` - E2Eテスト

### スクリーンショット

[ライトモード]
![Light mode](...)

[ダークモード]
![Dark mode](...)

### テスト結果

✅ ユニットテスト: 6/6 passed
✅ E2Eテスト: 4/4 passed
✅ Lint: No issues
✅ Type check: No errors

### レビューのポイント

1. SSR対応は適切か
2. アクセシビリティは問題ないか
3. パフォーマンスへの影響はないか

### 関連Issue

Closes #123
```

### AIによるコードレビュー

```typescript
// Copilot Workspaceのレビューコメント

// File: hooks/useTheme.ts
// Line: 15-20

// 💡 提案: メモ化を検討してください
// 現在の実装では、コンポーネントがレンダリングされるたびに
// 新しい関数が作成されます。useMemoやuseCallbackを使用することで
// パフォーマンスを改善できます。

// Before
const toggleTheme = () => {
  setTheme((prev) => {
    if (prev === 'light') return 'dark';
    if (prev === 'dark') return 'system';
    return 'light';
  });
};

// After
const toggleTheme = useCallback(() => {
  setTheme((prev) => {
    if (prev === 'light') return 'dark';
    if (prev === 'dark') return 'system';
    return 'light';
  });
}, []);
```

## 8. 実践的なユースケース

### ユースケース1: 新機能の追加

```markdown
# プロンプト例

「ユーザーがお気に入りの記事をブックマークできる機能を追加してください。
以下の要件を満たしてください:

1. 記事一覧ページとdisplayページにブックマークボタンを追加
2. ブックマークした記事は専用ページで確認可能
3. ブックマークのデータはSupabaseに保存
4. 楽観的UIで即座にフィードバック
5. ユニットテストとE2Eテストを含める」
```

Copilot Workspaceが生成する実装計画:

```markdown
## 実装計画

### 1. データベーススキーマの追加
- `supabase/migrations/create_bookmarks.sql` を作成
- bookmarksテーブルの定義
- RLSポリシーの設定

### 2. APIルートの作成
- `app/api/bookmarks/route.ts` - ブックマーク一覧取得
- `app/api/bookmarks/[id]/route.ts` - ブックマーク追加/削除

### 3. カスタムフックの作成
- `hooks/useBookmarks.ts` - ブックマーク管理
- React Queryを使用した楽観的UI

### 4. UIコンポーネントの作成
- `components/BookmarkButton.tsx` - ブックマークボタン
- `components/BookmarksList.tsx` - ブックマーク一覧

### 5. ページの作成
- `app/bookmarks/page.tsx` - ブックマーク一覧ページ

### 6. 既存ファイルの修正
- `app/articles/page.tsx` - ブックマークボタンの追加
- `app/articles/[id]/page.tsx` - ブックマークボタンの追加

### 7. テストの追加
- `hooks/useBookmarks.test.ts`
- `components/BookmarkButton.test.tsx`
- `e2e/bookmarks.spec.ts`
```

### ユースケース2: バグ修正

```typescript
// プロンプト: 「このコンポーネントでメモリリークが発生しています。修正してください。」

// Before (問題のあるコード)
function ArticleList() {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchArticles().then(setArticles);
    }, 5000);
    // ⚠️ クリーンアップ関数がない！
  }, []);

  return <div>...</div>;
}

// Copilot Workspaceの分析:
// "setIntervalのクリーンアップ関数が不足しています。
//  コンポーネントがアンマウントされてもインターバルが継続し、
//  メモリリークとエラーの原因になります。"

// After (修正後のコード)
function ArticleList() {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchArticles().then(setArticles);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return <div>...</div>;
}
```

### ユースケース3: パフォーマンス最適化

```typescript
// プロンプト: 「このコンポーネントのパフォーマンスを最適化してください」

// Before
function ExpensiveComponent({ data }: { data: Item[] }) {
  const filteredData = data.filter(item => item.active);
  const sortedData = filteredData.sort((a, b) => b.score - a.score);
  const processedData = sortedData.map(item => ({
    ...item,
    computed: heavyComputation(item)
  }));

  return (
    <div>
      {processedData.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

// Copilot Workspaceの提案:
// "1. useMemoで計算結果をメモ化
//  2. React.memoでコンポーネントをメモ化
//  3. 仮想化（react-window）を検討"

// After
import { useMemo, memo } from 'react';
import { FixedSizeList } from 'react-window';

const ItemCard = memo(({ item }: { item: ProcessedItem }) => {
  return <div>...</div>;
});

function ExpensiveComponent({ data }: { data: Item[] }) {
  const processedData = useMemo(() => {
    const filtered = data.filter(item => item.active);
    const sorted = filtered.sort((a, b) => b.score - a.score);
    return sorted.map(item => ({
      ...item,
      computed: heavyComputation(item)
    }));
  }, [data]);

  return (
    <FixedSizeList
      height={600}
      itemCount={processedData.length}
      itemSize={100}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ItemCard item={processedData[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}

export default memo(ExpensiveComponent);
```

## 9. ベストプラクティス

### 1. 明確なプロンプトを書く

```markdown
❌ 悪い例:
「認証を追加してください」

✅ 良い例:
「以下の要件でユーザー認証機能を追加してください:
- Supabase Authを使用
- メール/パスワード認証とGoogle OAuth
- ログイン・サインアップ・パスワードリセット機能
- 認証状態の永続化
- 保護されたルートのミドルウェア
- ユニットテストとE2Eテストを含む」
```

### 2. 段階的に実装する

```markdown
# Phase 1: 基本機能
1. データベーススキーマ
2. 基本的なCRUD API
3. シンプルなUI

# Phase 2: 機能拡張
1. 検索機能
2. フィルタリング
3. ページネーション

# Phase 3: 最適化
1. キャッシング
2. 楽観的UI
3. エラーハンドリング
```

### 3. AIのレビューを活用する

```typescript
// コード生成後、必ずレビューを実行

// プロンプト例:
// "生成されたコードをレビューして、以下の点を確認してください:
//  1. セキュリティの問題
//  2. パフォーマンスの問題
//  3. アクセシビリティの問題
//  4. エッジケースの対応"
```

### 4. テストを必ず含める

```markdown
# 全ての実装にテストを含める

- ユニットテスト（カバレッジ80%以上）
- 統合テスト（主要な機能フロー）
- E2Eテスト（ユーザーシナリオ）
```

### 5. ドキュメントを自動生成

```typescript
// プロンプト: 「実装したコードのドキュメントを生成してください」

/**
 * テーマ管理のカスタムフック
 *
 * @returns {Object} テーマの状態と操作関数
 * @returns {Theme} theme - 現在のテーマ設定 ('light' | 'dark' | 'system')
 * @returns {'light' | 'dark'} resolvedTheme - 実際に適用されているテーマ
 * @returns {(theme: Theme) => void} setTheme - テーマを設定する関数
 * @returns {() => void} toggleTheme - テーマを切り替える関数
 *
 * @example
 * ```tsx
 * function ThemeToggle() {
 *   const { theme, toggleTheme } = useTheme();
 *
 *   return (
 *     <button onClick={toggleTheme}>
 *       Current: {theme}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme() {
  // ...
}
```

## パフォーマンスとコスト

### Copilot Workspaceの料金

- **GitHub Copilot個人**: $10/月（Workspace含む）
- **GitHub Copilot Business**: $19/月
- **GitHub Copilot Enterprise**: $39/月

### 開発速度の向上

- 実装計画作成: 手動30分 → AI 3分（10倍）
- コーディング: 手動2時間 → AI 20分（6倍）
- テスト作成: 手動1時間 → AI 10分（6倍）
- PR作成: 手動15分 → AI 2分（7.5倍）

**合計**: 約4時間 → 約35分（約7倍の効率化）

## まとめ

GitHub Copilot Workspaceは、以下の点で革新的です。

1. **設計から実装まで一貫サポート**: 実装計画の自動生成
2. **マルチファイル編集**: 関連ファイルを一括で修正
3. **高品質なコード生成**: テストやドキュメントも自動生成
4. **継続的な改善**: AIによるレビューとリファクタリング提案
5. **開発速度の向上**: 約7倍の効率化を実現

ただし、以下の点に注意が必要です。

- AIが生成したコードは必ずレビューする
- セキュリティ面での確認は人間が行う
- ビジネスロジックの妥当性は自分で判断
- エッジケースは追加でテストを書く

GitHub Copilot Workspaceを活用することで、インディーハッカーや小規模チームでも、大規模開発に匹敵する生産性を実現できます。

## 参考リンク

- [GitHub Copilot Workspace](https://githubnext.com/projects/copilot-workspace)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Best Practices for Copilot](https://github.blog/2023-06-20-how-to-write-better-prompts-for-github-copilot/)
