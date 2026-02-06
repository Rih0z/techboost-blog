---
title: "TanStack Query v5 実践パターン集 — データフェッチの最適解"
description: "TanStack Query (React Query) v5の新機能と実践パターンを解説。Suspense統合、Optimistic Updates、Infinite Queries、SSR対応まで、データフェッチのベストプラクティスを網羅します。"
pubDate: "2026-02-05"
tags: ["React", "TanStack Query", "React Query", "TypeScript", "Frontend"]
---

## TanStack Query v5 概要

**TanStack Query**（旧React Query）は、Reactアプリケーションでのデータフェッチ、キャッシュ、同期を効率化するライブラリです。v5では、よりシンプルなAPIと強力な型推論が追加されました。

### v4からの主な変更点

- **型推論の改善**: より強力なTypeScript型推論
- **Suspense統合の強化**: React 18 Suspenseとのネイティブ統合
- **永続化の改善**: より柔軟なキャッシュ永続化
- **開発者ツールの進化**: DevToolsの性能向上

```bash
npm install @tanstack/react-query@latest
```

## 基本セットアップ

```typescript
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1分
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## 実践パターン1: 型安全なAPI定義

```typescript
// lib/api/users.ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional(),
});

type User = z.infer<typeof UserSchema>;

export async function fetchUser(userId: number): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  const data = await response.json();
  return UserSchema.parse(data); // ランタイム型検証
}

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  const data = await response.json();
  return z.array(UserSchema).parse(data);
}
```

## 実践パターン2: Suspenseを使った宣言的UI

```typescript
// components/UserProfile.tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchUser } from '@/lib/api/users';

export function UserProfile({ userId }: { userId: number }) {
  const { data: user } = useSuspenseQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId),
  });

  return (
    <div className="profile">
      <img src={user.avatar} alt={user.name} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// app/users/[id]/page.tsx
import { Suspense } from 'react';
import { UserProfile } from '@/components/UserProfile';

export default function UserPage({ params }: { params: { id: string } }) {
  const userId = parseInt(params.id);

  return (
    <div>
      <h1>User Profile</h1>
      <Suspense fallback={<UserProfileSkeleton />}>
        <UserProfile userId={userId} />
      </Suspense>
    </div>
  );
}
```

## 実践パターン3: Optimistic Updates（楽観的更新）

```typescript
// hooks/useUpdateUser.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/lib/api/users';

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: Partial<User> }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      return response.json();
    },
    onMutate: async ({ userId, data }) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['users', userId] });

      // 以前の値を保存
      const previousUser = queryClient.getQueryData<User>(['users', userId]);

      // 楽観的更新
      queryClient.setQueryData<User>(['users', userId], (old) => ({
        ...old!,
        ...data,
      }));

      return { previousUser };
    },
    onError: (err, { userId }, context) => {
      // エラー時にロールバック
      queryClient.setQueryData(['users', userId], context?.previousUser);
    },
    onSettled: (data, error, { userId }) => {
      // 成功・失敗に関わらず再フェッチ
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
    },
  });
}

// 使用例
function UserEditForm({ user }: { user: User }) {
  const updateUser = useUpdateUser();

  const handleSubmit = (data: Partial<User>) => {
    updateUser.mutate({ userId: user.id, data });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit({ name: 'New Name' }); }}>
      {/* フォームコンポーネント */}
      {updateUser.isPending && <p>Updating...</p>}
      {updateUser.isError && <p>Error: {updateUser.error.message}</p>}
    </form>
  );
}
```

## 実践パターン4: Infinite Queries（無限スクロール）

```typescript
// hooks/useInfiniteUsers.ts
import { useInfiniteQuery } from '@tanstack/react-query';

interface UsersResponse {
  users: User[];
  nextCursor: number | null;
}

async function fetchUsersPage(cursor: number = 0): Promise<UsersResponse> {
  const response = await fetch(`/api/users?cursor=${cursor}&limit=20`);
  return response.json();
}

export function useInfiniteUsers() {
  return useInfiniteQuery({
    queryKey: ['users', 'infinite'],
    queryFn: ({ pageParam }) => fetchUsersPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

// components/UserList.tsx
import { useInfiniteUsers } from '@/hooks/useInfiniteUsers';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export function InfiniteUserList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteUsers();

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.users.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      ))}
      <div ref={ref}>
        {isFetchingNextPage && <p>Loading more...</p>}
      </div>
    </div>
  );
}
```

## 実践パターン5: SSR対応（Next.js App Router）

```typescript
// app/users/page.tsx
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { fetchUsers } from '@/lib/api/users';
import { UserList } from '@/components/UserList';

export default async function UsersPage() {
  const queryClient = new QueryClient();

  // サーバー側でプリフェッチ
  await queryClient.prefetchQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserList />
    </HydrationBoundary>
  );
}

// components/UserList.tsx（クライアントコンポーネント）
'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '@/lib/api/users';

export function UserList() {
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## 実践パターン6: キャッシュ永続化

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24時間
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

export function PersistedQueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
```

## まとめ

TanStack Query v5は、以下のような場面で真価を発揮します。

**最適なケース:**
- SPAやNext.js App Routerでの複雑なデータフェッチ
- リアルタイム性が求められるダッシュボード
- Optimistic Updatesが必要なフォーム
- 無限スクロールやページネーション

**注意点:**
- 静的サイトには過剰（Astroなどではfetchで十分）
- サーバーコンポーネント中心の設計では不要な場面も
- キャッシュ戦略の理解が必要

v5の型推論とSuspense統合により、Reactのデータフェッチは新しい段階に入りました。この記事のパターンを参考に、あなたのプロジェクトに最適な実装を見つけてください。
