---
title: 'TanStack Query (React Query) 完全ガイド 2026 - サーバー状態管理の決定版'
description: 'TanStack Query v5を使った最新のサーバー状態管理ガイド。データフェッチング、キャッシング、楽観的更新、無限スクロールまで実践的に解説します。Next.js App Router対応。'
pubDate: 'Feb 05 2026'
tags: ['React Query', 'TanStack Query', 'React', 'Next.js', 'TypeScript']
---

TanStack Query（旧React Query）は、サーバー状態管理のデファクトスタンダードです。複雑なデータフェッチングロジックをシンプルに記述でき、キャッシング、リトライ、楽観的更新などを自動で処理してくれます。

## TanStack Queryとは？

TanStack Queryは、サーバーからのデータ取得・更新・キャッシュを管理するライブラリです。

### なぜTanStack Queryが必要なのか?

従来のuseEffectとuseStateによるデータフェッチングには多くの問題があります。

**問題のあるコード:**
```typescript
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;
  return <div>{user.name}</div>;
}
```

**問題点:**
- キャッシュなし（同じデータを何度もフェッチ）
- リトライなし
- バックグラウンド更新なし
- 楽観的更新なし
- コードが冗長

**TanStack Queryを使った改善版:**
```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
  });

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;
  return <div>{data.name}</div>;
}
```

これだけで、キャッシング、自動リトライ、バックグラウンド更新が全て有効になります。

## セットアップ

### インストール

```bash
npm install @tanstack/react-query
npm install -D @tanstack/eslint-plugin-query
```

### プロバイダーの設定

`app/providers.tsx`

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1分
            gcTime: 5 * 60 * 1000, // 5分（旧cacheTime）
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

`app/layout.tsx`

```typescript
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## useQuery - データの取得

### 基本的な使い方

```typescript
import { useQuery } from '@tanstack/react-query';

function Posts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await fetch('/api/posts');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;

  return (
    <ul>
      {data.map((post: any) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### TypeScriptで型安全に

```typescript
interface Post {
  id: number;
  title: string;
  content: string;
}

function Posts() {
  const { data, isLoading } = useQuery<Post[]>({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await fetch('/api/posts');
      return response.json();
    },
  });

  // dataはPost[] | undefinedとして扱われる
  return (
    <div>
      {data?.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

### パラメータ付きクエリ

```typescript
function PostDetail({ postId }: { postId: number }) {
  const { data } = useQuery({
    queryKey: ['post', postId], // queryKeyに含める
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}`);
      return response.json();
    },
    enabled: !!postId, // postIdがある時だけ実行
  });

  return <div>{data?.title}</div>;
}
```

### 依存クエリ

前のクエリの結果を使って次のクエリを実行します。

```typescript
function UserPosts({ userId }: { userId: number }) {
  // まずユーザー情報を取得
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // ユーザー情報が取得できたら投稿を取得
  const { data: posts } = useQuery({
    queryKey: ['posts', user?.id],
    queryFn: () => fetchUserPosts(user!.id),
    enabled: !!user, // userが存在する時だけ実行
  });

  return <div>{/* ... */}</div>;
}
```

## useMutation - データの更新

### 基本的な使い方

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreatePost() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newPost: { title: string; content: string }) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      });
      return response.json();
    },
    onSuccess: () => {
      // 成功したらpostsキャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    mutation.mutate({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="タイトル" required />
      <textarea name="content" placeholder="本文" required />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? '送信中...' : '投稿'}
      </button>
      {mutation.isError && <div>エラー: {mutation.error.message}</div>}
      {mutation.isSuccess && <div>投稿しました!</div>}
    </form>
  );
}
```

### 楽観的更新

UIを即座に更新し、サーバーへのリクエストは後で実行します。

```typescript
function TodoItem({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/todos/${id}/toggle`, { method: 'PATCH' });
    },
    onMutate: async (todoId) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // 前の値を保存
      const previousTodos = queryClient.getQueryData(['todos']);

      // 楽観的にUIを更新
      queryClient.setQueryData(['todos'], (old: Todo[] | undefined) =>
        old?.map((t) =>
          t.id === todoId ? { ...t, completed: !t.completed } : t
        )
      );

      // ロールバック用に前の値を返す
      return { previousTodos };
    },
    onError: (err, todoId, context) => {
      // エラー時はロールバック
      queryClient.setQueryData(['todos'], context?.previousTodos);
    },
    onSettled: () => {
      // 成功/失敗に関わらず再取得
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return (
    <div>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleMutation.mutate(todo.id)}
      />
      <span>{todo.title}</span>
    </div>
  );
}
```

## 無限スクロール（useInfiniteQuery）

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

interface PostsResponse {
  posts: Post[];
  nextCursor: number | null;
}

function InfinitePosts() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/posts?cursor=${pageParam}`);
      return response.json() as Promise<PostsResponse>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  });

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.posts.map((post) => (
            <div key={post.id}>{post.title}</div>
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
          ? 'もっと見る'
          : 'これで全部です'}
      </button>
    </div>
  );
}
```

### Intersection Observerで自動読み込み

```typescript
import { useEffect, useRef } from 'react';

function InfinitePosts() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      // ... 同じ設定
    });

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div>
      {data?.pages.map((page) => (
        // ... ポストを表示
      ))}
      <div ref={observerTarget} />
      {isFetchingNextPage && <div>読み込み中...</div>}
    </div>
  );
}
```

## プリフェッチ

リンクにホバーした時などに事前にデータを取得しておくことで、UXを向上できます。

```typescript
import { useQueryClient } from '@tanstack/react-query';

function PostLink({ postId }: { postId: number }) {
  const queryClient = useQueryClient();

  const prefetchPost = () => {
    queryClient.prefetchQuery({
      queryKey: ['post', postId],
      queryFn: () => fetchPost(postId),
    });
  };

  return (
    <a
      href={`/posts/${postId}`}
      onMouseEnter={prefetchPost} // ホバー時にプリフェッチ
    >
      投稿を見る
    </a>
  );
}
```

## React Query DevTools

開発中はDevToolsを使って、クエリの状態やキャッシュを視覚的に確認できます。

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

画面右下にアイコンが表示され、クリックすると詳細が確認できます。

## ベストプラクティス

### 1. queryKeyの命名規則

```typescript
// 良い例: 階層的で明確
['users'] // 全ユーザー
['users', userId] // 特定ユーザー
['users', userId, 'posts'] // ユーザーの投稿
['users', userId, 'posts', { status: 'published' }] // フィルター付き

// 悪い例: 一貫性がない
['user-123']
['getUserPosts']
```

### 2. カスタムフックで再利用

```typescript
// hooks/usePosts.ts
export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });
}

export function usePost(postId: number) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: () => fetchPost(postId),
    enabled: !!postId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
```

### 3. エラーハンドリング

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // 404はリトライしない
        if (error?.status === 404) return false;
        // それ以外は3回までリトライ
        return failureCount < 3;
      },
    },
  },
});
```

## まとめ

TanStack Query v5は、サーバー状態管理における最強のツールです。

**主要な機能:**
- 自動キャッシング・バックグラウンド更新
- 楽観的更新
- 無限スクロール
- プリフェッチ
- TypeScript完全対応
- DevToolsで可視化

公式ドキュメント: https://tanstack.com/query/latest

useEffectとfetchを手動で管理する時代は終わりました。TanStack Queryで、よりシンプルで保守性の高いコードを書きましょう。
