---
title: 'TanStack Query v5完全ガイド - React開発者のための次世代データフェッチング'
description: 'TanStack Query v5の新機能、変更点、セットアップ方法から実践的なクエリ/ミューテーション、キャッシュ戦略、Suspense対応まで、網羅的に解説します。'
pubDate: 'Feb 05 2026'
tags: ['プログラミング']
---

# TanStack Query v5完全ガイド - React開発者のための次世代データフェッチング

TanStack Query（旧React Query）は、React/Vue/Svelte/Solidなどのフレームワークで非同期状態管理を劇的に簡素化するライブラリです。v5では型安全性の向上、パフォーマンス改善、新しいAPI設計など、多くの革新が導入されました。

本記事では、TanStack Query v5の全機能を実践的に解説します。

## TanStack Query v5の主要な変更点

### 1. 破壊的変更の概要

v4からv5への主な変更点:

```typescript
// v4
import { useQuery } from 'react-query'

// v5
import { useQuery } from '@tanstack/react-query'

// クエリキーは必ず配列
// ❌ v4: useQuery('todos', fetchTodos)
// ✅ v5: useQuery({ queryKey: ['todos'], queryFn: fetchTodos })
```

### 2. 新しいAPI設計

オブジェクトベースのAPIへ統一:

```typescript
// v4 - 位置引数
useQuery(['todos'], fetchTodos, {
  staleTime: 5000
})

// v5 - オブジェクト引数（推奨）
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5000
})
```

### 3. TypeScript型推論の向上

```typescript
// v5では自動的に型推論
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: async () => {
    const res = await fetch(`/api/users/${userId}`)
    return res.json() as Promise<User>
  }
})

// data は User | undefined として型推論される
```

## セットアップと基本設定

### インストール

```bash
npm install @tanstack/react-query
# またはyarn/pnpm
pnpm add @tanstack/react-query
```

DevToolsも推奨:

```bash
pnpm add @tanstack/react-query-devtools
```

### QueryClientの設定

```typescript
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // デフォルトのstaleTime（データが古くなる時間）
            staleTime: 60 * 1000, // 1分
            // デフォルトのcacheTime（キャッシュ保持時間）
            gcTime: 5 * 60 * 1000, // 5分（v5で名称変更: cacheTime -> gcTime）
            // リトライ設定
            retry: 1,
            // リフェッチ設定
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

**重要**: v5では`cacheTime`が`gcTime`（Garbage Collection Time）に名称変更されました。

### App統合（Next.js App Router）

```typescript
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## 基本的なクエリ（useQuery）

### シンプルなデータフェッチ

```typescript
// app/components/TodoList.tsx
'use client'

import { useQuery } from '@tanstack/react-query'

interface Todo {
  id: number
  title: string
  completed: boolean
}

async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch('/api/todos')
  if (!res.ok) throw new Error('Failed to fetch todos')
  return res.json()
}

export function TodoList() {
  const { data, error, isLoading, isError } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  if (isLoading) return <div>読み込み中...</div>
  if (isError) return <div>エラー: {error.message}</div>

  return (
    <ul>
      {data?.map((todo) => (
        <li key={todo.id}>
          {todo.title} {todo.completed && '✓'}
        </li>
      ))}
    </ul>
  )
}
```

### パラメータ付きクエリ

```typescript
function useTodo(todoId: number) {
  return useQuery({
    queryKey: ['todos', todoId],
    queryFn: async () => {
      const res = await fetch(`/api/todos/${todoId}`)
      if (!res.ok) throw new Error('Failed to fetch todo')
      return res.json() as Promise<Todo>
    },
    // このクエリを有効にする条件
    enabled: todoId > 0,
  })
}

// 使用例
function TodoDetail({ id }: { id: number }) {
  const { data: todo } = useTodo(id)

  return <div>{todo?.title}</div>
}
```

### 複数パラメータの管理

```typescript
interface TodosQuery {
  status?: 'all' | 'completed' | 'pending'
  page?: number
  limit?: number
}

function useTodos(query: TodosQuery) {
  return useQuery({
    queryKey: ['todos', query],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query.status) params.set('status', query.status)
      if (query.page) params.set('page', query.page.toString())
      if (query.limit) params.set('limit', query.limit.toString())

      const res = await fetch(`/api/todos?${params}`)
      return res.json()
    },
  })
}
```

## ミューテーション（useMutation）

### 基本的なミューテーション

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface CreateTodoInput {
  title: string
}

async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to create todo')
  return res.json()
}

export function CreateTodoForm() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: createTodo,
    onSuccess: (newTodo) => {
      // キャッシュを無効化して再フェッチ
      queryClient.invalidateQueries({ queryKey: ['todos'] })

      // または、直接キャッシュを更新（楽観的更新）
      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        return old ? [...old, newTodo] : [newTodo]
      })
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    mutation.mutate({ title: formData.get('title') as string })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? '作成中...' : '追加'}
      </button>
      {mutation.isError && <div>エラー: {mutation.error.message}</div>}
    </form>
  )
}
```

**注意**: v5では`isLoading`が`isPending`に変更されました。

### 楽観的更新（Optimistic Updates）

```typescript
function useToggleTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (todoId: number) => {
      const res = await fetch(`/api/todos/${todoId}/toggle`, {
        method: 'PATCH',
      })
      return res.json()
    },

    // 楽観的更新: リクエスト前にUIを即座に更新
    onMutate: async (todoId) => {
      // 進行中のリフェッチをキャンセル
      await queryClient.cancelQueries({ queryKey: ['todos'] })

      // 前の値を保存（ロールバック用）
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos'])

      // 楽観的にキャッシュを更新
      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        return old?.map((todo) =>
          todo.id === todoId
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      })

      // ロールバック関数を返す
      return { previousTodos }
    },

    // エラー時にロールバック
    onError: (err, todoId, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos)
    },

    // 成功・失敗に関わらず、最後に再フェッチ
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
```

## キャッシュ戦略とデータ管理

### staleTimeとgcTimeの違い

```typescript
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,

  // staleTime: データが「古い」と見なされるまでの時間
  // この間は再フェッチしない
  staleTime: 5 * 60 * 1000, // 5分

  // gcTime: キャッシュがメモリに保持される時間
  // コンポーネントがアンマウントされてからの時間
  gcTime: 10 * 60 * 1000, // 10分
})
```

**重要な概念**:
- `staleTime = 0`（デフォルト）: データは即座に古くなり、次のマウント時に再フェッチ
- `staleTime = Infinity`: データは永遠に新鮮と見なされ、手動で無効化するまで再フェッチしない
- `gcTime`: アンマウント後、このキャッシュをいつまでメモリに保持するか

### リフェッチ戦略

```typescript
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,

  // ウィンドウフォーカス時に再フェッチ
  refetchOnWindowFocus: true,

  // マウント時に再フェッチ
  refetchOnMount: true,

  // ネットワーク再接続時に再フェッチ
  refetchOnReconnect: true,

  // インターバルで自動リフェッチ（ポーリング）
  refetchInterval: 10000, // 10秒ごと

  // ウィンドウがフォーカスされている時のみポーリング
  refetchIntervalInBackground: false,
})
```

### キャッシュの手動操作

```typescript
const queryClient = useQueryClient()

// キャッシュデータを取得
const todos = queryClient.getQueryData<Todo[]>(['todos'])

// キャッシュデータを設定
queryClient.setQueryData<Todo[]>(['todos'], (old) => {
  return [...(old || []), newTodo]
})

// キャッシュを無効化（次回アクセス時に再フェッチ）
queryClient.invalidateQueries({ queryKey: ['todos'] })

// 特定条件のクエリのみ無効化
queryClient.invalidateQueries({
  queryKey: ['todos'],
  predicate: (query) => {
    const [, status] = query.queryKey as [string, string?]
    return status === 'completed'
  },
})

// キャッシュを即座に削除
queryClient.removeQueries({ queryKey: ['todos'] })

// 手動でリフェッチ
queryClient.refetchQueries({ queryKey: ['todos'] })
```

## Suspense対応

### 基本的なSuspense統合

```typescript
'use client'

import { Suspense } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'

function TodoList() {
  // useSuspenseQueryは自動的にSuspenseをトリガー
  const { data } = useSuspenseQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  // dataは常に定義されている（undefined チェック不要）
  return (
    <ul>
      {data.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  )
}

export default function TodosPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <TodoList />
    </Suspense>
  )
}
```

### エラーバウンダリとの組み合わせ

```typescript
'use client'

import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div>
      <h2>エラーが発生しました</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>再試行</button>
    </div>
  )
}

export default function TodosPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<div>読み込み中...</div>}>
        <TodoList />
      </Suspense>
    </ErrorBoundary>
  )
}
```

### 複数クエリのSuspense

```typescript
function TodosWithUser() {
  const { data: todos } = useSuspenseQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  const { data: user } = useSuspenseQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
  })

  // 両方のデータが揃うまでSuspense
  return (
    <div>
      <h1>{user.name}のTODO</h1>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

## 高度なパターン

### Infinite Queries（無限スクロール）

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

interface TodosPage {
  todos: Todo[]
  nextCursor: number | null
}

function useTodosInfinite() {
  return useInfiniteQuery({
    queryKey: ['todos', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/todos?cursor=${pageParam}&limit=20`)
      return res.json() as Promise<TodosPage>
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

function InfiniteTodoList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTodosInfinite()

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.todos.map((todo) => (
            <div key={todo.id}>{todo.title}</div>
          ))}
        </div>
      ))}

      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage
          ? '読み込み中...'
          : hasNextPage
          ? 'さらに読み込む'
          : 'すべて読み込み済み'}
      </button>
    </div>
  )
}
```

### Dependent Queries（依存クエリ）

```typescript
function useTodoWithComments(todoId: number) {
  // 1. まずTodoを取得
  const { data: todo } = useQuery({
    queryKey: ['todos', todoId],
    queryFn: () => fetchTodo(todoId),
  })

  // 2. TodoのIDを使ってコメントを取得
  const { data: comments } = useQuery({
    queryKey: ['comments', todo?.id],
    queryFn: () => fetchComments(todo!.id),
    enabled: !!todo, // todoが取得できるまで実行しない
  })

  return { todo, comments }
}
```

### Parallel Queries（並列クエリ）

```typescript
function useDashboardData() {
  const todos = useQuery({ queryKey: ['todos'], queryFn: fetchTodos })
  const user = useQuery({ queryKey: ['user'], queryFn: fetchUser })
  const stats = useQuery({ queryKey: ['stats'], queryFn: fetchStats })

  return {
    todos,
    user,
    stats,
    isLoading: todos.isLoading || user.isLoading || stats.isLoading,
  }
}

// または useQueries を使用
import { useQueries } from '@tanstack/react-query'

function useDashboardDataV2() {
  const results = useQueries({
    queries: [
      { queryKey: ['todos'], queryFn: fetchTodos },
      { queryKey: ['user'], queryFn: fetchUser },
      { queryKey: ['stats'], queryFn: fetchStats },
    ],
  })

  return {
    todos: results[0].data,
    user: results[1].data,
    stats: results[2].data,
    isLoading: results.some((r) => r.isLoading),
  }
}
```

### Prefetching（プリフェッチ）

```typescript
// サーバーサイドでのプリフェッチ（Next.js App Router）
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'

export default async function TodosPage() {
  const queryClient = new QueryClient()

  // サーバーサイドでプリフェッチ
  await queryClient.prefetchQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TodoList />
    </HydrationBoundary>
  )
}

// クライアントサイドでのプリフェッチ（ホバー時など）
function TodoLink({ todoId }: { todoId: number }) {
  const queryClient = useQueryClient()

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['todos', todoId],
      queryFn: () => fetchTodo(todoId),
    })
  }

  return (
    <a
      href={`/todos/${todoId}`}
      onMouseEnter={handleMouseEnter}
    >
      Todo #{todoId}
    </a>
  )
}
```

## ベストプラクティス

### 1. クエリキーの一貫性

```typescript
// ❌ 避けるべき
useQuery({ queryKey: ['todos'], ... })
useQuery({ queryKey: ['todo', id], ... })

// ✅ 推奨: 階層的な構造
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: TodosQuery) => [...todoKeys.lists(), filters] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
}

// 使用例
useQuery({ queryKey: todoKeys.list({ status: 'completed' }), ... })
useQuery({ queryKey: todoKeys.detail(1), ... })

// 無効化も簡単
queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
```

### 2. カスタムフックの活用

```typescript
// hooks/useTodos.ts
export function useTodos(query: TodosQuery = {}) {
  return useQuery({
    queryKey: todoKeys.list(query),
    queryFn: () => fetchTodos(query),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
    },
  })
}

// コンポーネントでシンプルに使用
function TodoList() {
  const { data } = useTodos({ status: 'pending' })
  const createMutation = useCreateTodo()

  // ...
}
```

### 3. エラーハンドリング

```typescript
// グローバルエラーハンドリング
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        console.error('Query error:', error)
        // トースト通知など
      },
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error)
      },
    },
  },
})

// 個別のエラーハンドリング
const { data, error } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  retry: (failureCount, error) => {
    // 404エラーはリトライしない
    if (error instanceof Error && error.message.includes('404')) {
      return false
    }
    return failureCount < 3
  },
})
```

## まとめ

TanStack Query v5は、以下の点で大きく進化しました:

1. **型安全性の向上**: TypeScript型推論が大幅に改善
2. **API設計の統一**: オブジェクトベースのAPIで可読性向上
3. **Suspense完全対応**: `useSuspenseQuery`で宣言的なローディング
4. **パフォーマンス**: キャッシュ管理の最適化
5. **開発体験**: DevToolsの改善、エラーメッセージの向上

TanStack Queryを使うことで、ボイラープレートを大幅に削減し、キャッシュ管理・エラーハンドリング・ローディング状態を宣言的に扱えるようになります。

v5への移行は、型安全性とパフォーマンスの両面でメリットが大きいため、既存プロジェクトでも積極的に検討する価値があります。

公式ドキュメント: https://tanstack.com/query/latest
