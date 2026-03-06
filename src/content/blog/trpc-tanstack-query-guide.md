---
title: "tRPC + TanStack Query統合ガイド — 型安全なデータフェッチングの極意"
description: "tRPCとTanStack Queryを組み合わせた高度なデータフェッチング戦略を解説。キャッシュ管理、楽観的更新、Suspense統合、無限スクロール、プリフェッチ、エラーハンドリングまで完全網羅。基礎から応用まで幅広くカバーしています。"
pubDate: "2026-02-06"
tags: ["tRPC", "TanStack Query", "React Query", "TypeScript", "キャッシュ", "データフェッチング"]
---
tRPCとTanStack Query（旧React Query）を組み合わせることで、型安全かつ高性能なデータフェッチングを実現できます。

この記事では、基本的な統合方法から高度なキャッシュ戦略、楽観的更新、無限スクロールまで、実践的なパターンを詳しく解説します。

## tRPC + TanStack Queryの利点

### なぜこの組み合わせが強力なのか

**tRPCの強み:**
- エンドツーエンド型安全
- スキーマ定義不要
- コード生成不要

**TanStack Queryの強み:**
- 自動キャッシュ管理
- バックグラウンド再取得
- 楽観的更新
- 無限スクロール対応

**組み合わせると:**
- 型安全 + 自動キャッシュ
- サーバー状態管理の完全自動化
- ユーザー体験の大幅向上

## セットアップ

### パッケージインストール

```bash
npm install @trpc/server @trpc/client @trpc/react-query @tanstack/react-query
npm install zod
```

### tRPCクライアントの設定

```typescript
// lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === 'development' ||
          (opts.direction === 'down' && opts.result instanceof Error),
      }),
      httpBatchLink({
        url: '/api/trpc',
        headers() {
          return {
            authorization: getAuthToken(),
          };
        },
      }),
    ],
  });
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1分
        gcTime: 5 * 60 * 1000, // 5分（旧 cacheTime）
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // 4xx エラーはリトライしない
          if (error instanceof Error && 'statusCode' in error) {
            const statusCode = (error as any).statusCode;
            if (statusCode >= 400 && statusCode < 500) return false;
          }
          return failureCount < 3;
        },
      },
    },
  });
}
```

### Providerの設定

```typescript
// app/providers.tsx
'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { trpc, createTRPCClient, createQueryClient } from '@/lib/trpc';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

## 基本的なクエリとミューテーション

### クエリの使用

```typescript
// components/UserProfile.tsx
'use client';

import { trpc } from '@/lib/trpc';

export function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error, refetch } = trpc.user.getById.useQuery(
    { id: userId },
    {
      // クエリオプション
      staleTime: 5 * 60 * 1000, // 5分間は再フェッチしない
      enabled: !!userId, // userIdがある場合のみ実行
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

### ミューテーションの使用

```typescript
// components/UpdateProfileForm.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export function UpdateProfileForm({ userId }: { userId: string }) {
  const [name, setName] = useState('');
  const utils = trpc.useUtils();

  const updateProfile = trpc.user.update.useMutation({
    onSuccess: (updatedUser) => {
      // キャッシュを直接更新（楽観的更新の完了）
      utils.user.getById.setData({ id: userId }, updatedUser);

      // 関連するクエリを無効化
      utils.user.list.invalidate();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ id: userId, name });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New name"
      />
      <button type="submit" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? 'Updating...' : 'Update'}
      </button>
    </form>
  );
}
```

## 高度なキャッシュ戦略

### キャッシュの手動更新

```typescript
// hooks/usePostMutations.ts
import { trpc } from '@/lib/trpc';

export function usePostMutations() {
  const utils = trpc.useUtils();

  const createPost = trpc.post.create.useMutation({
    onMutate: async (newPost) => {
      // 進行中のクエリをキャンセル
      await utils.post.list.cancel();

      // 以前のデータを取得（ロールバック用）
      const previousPosts = utils.post.list.getData();

      // キャッシュを楽観的に更新
      utils.post.list.setData(undefined, (old) => {
        if (!old) return [newPost];
        return [{ ...newPost, id: 'temp-id', createdAt: new Date() }, ...old];
      });

      return { previousPosts };
    },
    onError: (err, newPost, context) => {
      // エラー時にロールバック
      if (context?.previousPosts) {
        utils.post.list.setData(undefined, context.previousPosts);
      }
    },
    onSettled: () => {
      // 成功・失敗に関わらず、最新データを取得
      utils.post.list.invalidate();
    },
  });

  const deletePost = trpc.post.delete.useMutation({
    onMutate: async (deletedId) => {
      await utils.post.list.cancel();
      const previousPosts = utils.post.list.getData();

      utils.post.list.setData(undefined, (old) => {
        return old?.filter((post) => post.id !== deletedId.id);
      });

      return { previousPosts };
    },
    onError: (err, deletedId, context) => {
      if (context?.previousPosts) {
        utils.post.list.setData(undefined, context.previousPosts);
      }
    },
    onSettled: () => {
      utils.post.list.invalidate();
    },
  });

  return { createPost, deletePost };
}
```

### 部分的なキャッシュ更新

```typescript
// components/LikeButton.tsx
'use client';

import { trpc } from '@/lib/trpc';

export function LikeButton({ postId }: { postId: string }) {
  const utils = trpc.useUtils();

  const likePost = trpc.post.like.useMutation({
    onMutate: async ({ postId }) => {
      // 単一の投稿キャッシュを更新
      utils.post.getById.setData({ id: postId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          likes: old.likes + 1,
          isLiked: true,
        };
      });

      // リスト内の投稿も更新
      utils.post.list.setData(undefined, (old) => {
        if (!old) return old;
        return old.map((post) =>
          post.id === postId
            ? { ...post, likes: post.likes + 1, isLiked: true }
            : post
        );
      });
    },
  });

  const handleLike = () => {
    likePost.mutate({ postId });
  };

  return (
    <button onClick={handleLike} disabled={likePost.isPending}>
      Like
    </button>
  );
}
```

## 無限スクロールの実装

### サーバー側の設定

```typescript
// server/routers/post.ts
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const postRouter = router({
  infinitePosts: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor } = input;

      const posts = await db.post.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: string | undefined = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return {
        posts,
        nextCursor,
      };
    }),
});
```

### クライアント側の実装

```typescript
// components/InfinitePostList.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

export function InfinitePostList() {
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = trpc.post.infinitePosts.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      {data.pages.map((page, i) => (
        <div key={i}>
          {page.posts.map((post) => (
            <article key={post.id}>
              <h2>{post.title}</h2>
              <p>{post.content}</p>
            </article>
          ))}
        </div>
      ))}

      {/* 監視用の要素 */}
      <div ref={ref} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && <div>Loading more...</div>}
      </div>

      {!hasNextPage && <div>No more posts</div>}
    </div>
  );
}
```

## プリフェッチとSSR

### Server Componentsでのプリフェッチ

```typescript
// app/posts/[id]/page.tsx
import { createServerSideHelpers } from '@trpc/react-query/server';
import { appRouter } from '@/server/routers/_app';
import { PostDetail } from './PostDetail';

export default async function PostPage({ params }: { params: { id: string } }) {
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: {},
  });

  // サーバー側でデータをプリフェッチ
  await helpers.post.getById.prefetch({ id: params.id });

  return (
    <div>
      <PostDetail postId={params.id} />
    </div>
  );
}
```

### クライアントでのプリフェッチ

```typescript
// components/PostLink.tsx
'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';

export function PostLink({ postId, title }: { postId: string; title: string }) {
  const utils = trpc.useUtils();

  const handleMouseEnter = () => {
    // ホバー時にデータをプリフェッチ
    utils.post.getById.prefetch({ id: postId });
  };

  return (
    <Link
      href={`/posts/${postId}`}
      onMouseEnter={handleMouseEnter}
      className="text-blue-600 hover:underline"
    >
      {title}
    </Link>
  );
}
```

## Suspenseとの統合

### Suspense対応のクエリ

```typescript
// components/UserProfileSuspense.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { Suspense } from 'react';

function UserProfileContent({ userId }: { userId: string }) {
  const [user] = trpc.user.getById.useSuspenseQuery({ id: userId });

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

export function UserProfile({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<div>Loading user...</div>}>
      <UserProfileContent userId={userId} />
    </Suspense>
  );
}
```

### 複数のSuspenseクエリ

```typescript
// components/DashboardSuspense.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { Suspense } from 'react';

function UserStats({ userId }: { userId: string }) {
  const [stats] = trpc.user.stats.useSuspenseQuery({ userId });
  return <div>Posts: {stats.postCount}</div>;
}

function UserPosts({ userId }: { userId: string }) {
  const [posts] = trpc.post.byUser.useSuspenseQuery({ userId });
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

export function Dashboard({ userId }: { userId: string }) {
  return (
    <div>
      <Suspense fallback={<div>Loading stats...</div>}>
        <UserStats userId={userId} />
      </Suspense>

      <Suspense fallback={<div>Loading posts...</div>}>
        <UserPosts userId={userId} />
      </Suspense>
    </div>
  );
}
```

## エラーハンドリング

### グローバルエラーハンドリング

```typescript
// lib/trpc-client.ts
import { TRPCClientError } from '@trpc/client';
import { toast } from 'sonner';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        onError: (error) => {
          if (error instanceof TRPCClientError) {
            switch (error.data?.code) {
              case 'UNAUTHORIZED':
                toast.error('Please login to continue');
                // リダイレクト処理
                break;
              case 'FORBIDDEN':
                toast.error('You do not have permission');
                break;
              case 'NOT_FOUND':
                toast.error('Resource not found');
                break;
              default:
                toast.error('An error occurred');
            }
          } else {
            toast.error('Network error');
          }
        },
      },
    },
  });
}
```

### コンポーネント単位のエラーハンドリング

```typescript
// components/UserList.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { TRPCClientError } from '@trpc/client';

export function UserList() {
  const { data, error, refetch } = trpc.user.list.useQuery();

  if (error) {
    if (error instanceof TRPCClientError) {
      return (
        <div className="error-container">
          <p>Error: {error.message}</p>
          <p>Code: {error.data?.code}</p>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      );
    }
    return <div>Unknown error occurred</div>;
  }

  if (!data) return <div>Loading...</div>;

  return (
    <ul>
      {data.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## パフォーマンス最適化

### 選択的なデータ取得

```typescript
// components/UserName.tsx
'use client';

import { trpc } from '@/lib/trpc';

export function UserName({ userId }: { userId: string }) {
  const { data } = trpc.user.getById.useQuery(
    { id: userId },
    {
      // 必要なフィールドのみ選択
      select: (data) => data.name,
    }
  );

  return <span>{data}</span>;
}
```

### バッチリクエストの活用

```typescript
// lib/trpc.ts
import { httpBatchLink } from '@trpc/client';

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        maxURLLength: 2083,
        // 10ms以内のリクエストをバッチ化
        maxBatchSize: 10,
      }),
    ],
  });
}
```

## まとめ

tRPCとTanStack Queryの組み合わせは、モダンなWebアプリケーション開発における強力な武器です。

**主なメリット:**
- エンドツーエンド型安全
- 自動キャッシュ管理
- 楽観的更新による高速なUI
- 無限スクロールの簡単実装
- Suspense統合

**ベストプラクティス:**
- 適切なstaleTimeとcacheTimeを設定
- 楽観的更新でUX向上
- エラーハンドリングを忘れずに
- プリフェッチで体感速度向上
- バッチリクエストでネットワーク効率化

この組み合わせをマスターすれば、型安全かつ高性能なWebアプリケーションを効率的に構築できます。
