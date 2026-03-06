---
title: 'SWR完全ガイド：Reactのデータフェッチングを劇的に改善する'
description: 'Vercel SWRの使い方を徹底解説。キャッシュ戦略、リアルタイム更新、Next.jsでの活用パターンまで完全網羅。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。初心者から実務レベルまで段階的に学べる内容です。'
pubDate: '2026-02-05'
tags: ['React', 'SWR', 'Next.js', 'データフェッチング', 'キャッシュ']
---

SWR (stale-while-revalidate) は、Vercelが開発したReact Hooksライブラリで、データフェッチングを劇的にシンプルかつ効率的にします。このガイドでは、基本から応用まで徹底解説します。

## SWRとは？

SWRは、HTTP RFC 5861で提唱された「stale-while-revalidate」戦略を実装したReact Hooksライブラリです。

### 主な特徴

- **キャッシュファースト**: 即座にキャッシュデータを表示し、バックグラウンドで再検証
- **リアルタイム更新**: フォーカス時、ネットワーク復帰時の自動再検証
- **楽観的UI**: mutateによる即座のUI更新
- **TypeScript完全対応**: 型安全なデータフェッチング
- **軽量**: 5KB以下のバンドルサイズ

### なぜSWRが必要か？

従来のuseEffectによるデータフェッチングには多くの問題があります。

```tsx
// 従来の方法（アンチパターン）
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let canceled = false;
    setLoading(true);

    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!canceled) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!canceled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{user?.name}</div>;
}
```

SWRならこれが一行に：

```tsx
// SWRの方法
function UserProfile({ userId }: { userId: string }) {
  const { data: user, error, isLoading } = useSWR(`/api/users/${userId}`);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{user?.name}</div>;
}
```

## インストールとセットアップ

### インストール

```bash
npm install swr
# または
pnpm add swr
# または
yarn add swr
```

### 基本的な使い方

```tsx
import useSWR from 'swr';

// Fetcherの定義
const fetcher = (url: string) => fetch(url).then(res => res.json());

function App() {
  const { data, error, isLoading } = useSWR('/api/data', fetcher);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Failed to load</div>;
  return <div>Hello {data.name}!</div>;
}
```

### グローバル設定

アプリケーション全体でfetcherを共有するには、`SWRConfig`を使用します。

```tsx
import { SWRConfig } from 'swr';

// グローバルfetcher
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('API error');
  return res.json();
});

function App() {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
      }}
    >
      <MyApplication />
    </SWRConfig>
  );
}
```

## TypeScriptでの型定義

SWRは完全な型安全性を提供します。

```tsx
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface ApiError {
  message: string;
  status: number;
}

// 型付きfetcher
const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error: ApiError = {
      message: 'API request failed',
      status: res.status,
    };
    throw error;
  }
  return res.json();
};

function UserProfile({ userId }: { userId: string }) {
  const { data, error, isLoading } = useSWR<User, ApiError>(
    `/api/users/${userId}`,
    fetcher
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message} (Status: {error.status})</div>;
  if (!data) return null;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
      {data.avatar && <img src={data.avatar} alt={data.name} />}
    </div>
  );
}
```

## キャッシュ戦略

SWRの真価はキャッシュ戦略にあります。

### 自動再検証

```tsx
const { data } = useSWR('/api/data', fetcher, {
  // ウィンドウフォーカス時に再検証（デフォルト: true）
  revalidateOnFocus: true,

  // ネットワーク再接続時に再検証（デフォルト: true）
  revalidateOnReconnect: true,

  // 定期的な再検証（ミリ秒）
  refreshInterval: 3000,

  // ウィンドウが見えているときだけ定期的再検証
  refreshWhenHidden: false,
  refreshWhenOffline: false,

  // 重複リクエストの排除時間（ミリ秒、デフォルト: 2000）
  dedupingInterval: 2000,
});
```

### 条件付きフェッチング

```tsx
// userIdがnullの場合はフェッチしない
const { data: user } = useSWR(
  userId ? `/api/users/${userId}` : null,
  fetcher
);

// 複数の条件
const { data } = useSWR(
  () => (shouldFetch && userId ? `/api/users/${userId}` : null),
  fetcher
);
```

### 依存データのフェッチング

```tsx
function UserPosts({ userId }: { userId: string }) {
  // まずユーザーを取得
  const { data: user } = useSWR<User>(`/api/users/${userId}`, fetcher);

  // ユーザーが取得できてから投稿を取得
  const { data: posts } = useSWR<Post[]>(
    user ? `/api/users/${user.id}/posts` : null,
    fetcher
  );

  if (!user) return <div>Loading user...</div>;
  if (!posts) return <div>Loading posts...</div>;

  return (
    <div>
      <h1>{user.name}の投稿</h1>
      <ul>
        {posts.map(post => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

## mutateによる楽観的UI更新

SWRの最も強力な機能の一つがmutateです。

### 基本的なmutate

```tsx
import useSWR, { mutate } from 'swr';

function TodoList() {
  const { data: todos } = useSWR<Todo[]>('/api/todos', fetcher);

  const addTodo = async (title: string) => {
    const newTodo = { id: Date.now(), title, completed: false };

    // 楽観的更新: すぐにUIを更新
    mutate('/api/todos', [...(todos || []), newTodo], false);

    // APIリクエスト
    await fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title }),
      headers: { 'Content-Type': 'application/json' },
    });

    // 再検証
    mutate('/api/todos');
  };

  return (
    <div>
      {todos?.map(todo => (
        <div key={todo.id}>{todo.title}</div>
      ))}
      <button onClick={() => addTodo('New Todo')}>Add</button>
    </div>
  );
}
```

### ローカルmutate

```tsx
function TodoItem({ todo }: { todo: Todo }) {
  const { data, mutate } = useSWR<Todo>(`/api/todos/${todo.id}`, fetcher);

  const toggleComplete = async () => {
    // ローカルmutate: このコンポーネントのデータのみ更新
    mutate({ ...data!, completed: !data!.completed }, false);

    await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !data!.completed }),
    });

    mutate();
  };

  return (
    <div onClick={toggleComplete}>
      {data?.completed ? '✓' : '○'} {data?.title}
    </div>
  );
}
```

### グローバルmutate

```tsx
import { mutate } from 'swr';

// すべてのキャッシュを再検証
mutate(() => true);

// 特定のパターンのキャッシュを再検証
mutate(key => typeof key === 'string' && key.startsWith('/api/users'));

// 削除後、関連するすべてのデータを再検証
const deleteUser = async (userId: string) => {
  await fetch(`/api/users/${userId}`, { method: 'DELETE' });

  // ユーザー一覧を再検証
  mutate('/api/users');

  // 削除したユーザーのキャッシュを削除
  mutate(`/api/users/${userId}`, undefined, false);
};
```

## Pagination（ページネーション）

### 基本的なページネーション

```tsx
function UserList() {
  const [page, setPage] = useState(1);
  const { data: users, isLoading } = useSWR<User[]>(
    `/api/users?page=${page}&limit=10`,
    fetcher
  );

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {users?.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
      <button onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
      <button onClick={() => setPage(p => p + 1)}>Next</button>
    </div>
  );
}
```

### 無限スクロール (useSWRInfinite)

```tsx
import useSWRInfinite from 'swr/infinite';

interface PageData {
  users: User[];
  hasMore: boolean;
}

function InfiniteUserList() {
  const getKey = (pageIndex: number, previousPageData: PageData | null) => {
    // 最後のページに到達
    if (previousPageData && !previousPageData.hasMore) return null;

    // ページのキーを返す
    return `/api/users?page=${pageIndex + 1}&limit=20`;
  };

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite<PageData>(
    getKey,
    fetcher
  );

  const users = data ? data.flatMap(page => page.users) : [];
  const hasMore = data?.[data.length - 1]?.hasMore ?? true;

  return (
    <div>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>

      {isLoading && <div>Loading...</div>}
      {isValidating && !isLoading && <div>Updating...</div>}

      {hasMore && (
        <button onClick={() => setSize(size + 1)} disabled={isValidating}>
          Load More
        </button>
      )}
    </div>
  );
}
```

### Intersection Observerとの組み合わせ

```tsx
import { useRef, useEffect } from 'react';
import useSWRInfinite from 'swr/infinite';

function AutoLoadUserList() {
  const observerTarget = useRef<HTMLDivElement>(null);

  const getKey = (pageIndex: number, previousPageData: PageData | null) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    return `/api/users?page=${pageIndex + 1}&limit=20`;
  };

  const { data, size, setSize, isValidating } = useSWRInfinite<PageData>(
    getKey,
    fetcher
  );

  const users = data ? data.flatMap(page => page.users) : [];
  const hasMore = data?.[data.length - 1]?.hasMore ?? true;

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isValidating) {
          setSize(size + 1);
        }
      },
      { threshold: 1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isValidating, size, setSize]);

  return (
    <div>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
      {hasMore && <div ref={observerTarget}>Loading...</div>}
    </div>
  );
}
```

## Next.jsでの活用

SWRはNext.jsと完璧に統合できます。

### SSR/SSGとの組み合わせ

```tsx
// pages/users/[id].tsx
import type { GetStaticProps, GetStaticPaths } from 'next';
import useSWR from 'swr';

interface Props {
  fallback: {
    [key: string]: User;
  };
}

export default function UserPage({ fallback }: Props) {
  const router = useRouter();
  const { id } = router.query;

  // fallbackデータを使用して即座に表示、その後再検証
  const { data: user } = useSWR<User>(`/api/users/${id}`, fetcher, {
    fallbackData: fallback[`/api/users/${id}`],
  });

  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const user = await fetch(`https://api.example.com/users/${params?.id}`).then(res => res.json());

  return {
    props: {
      fallback: {
        [`/api/users/${params?.id}`]: user,
      },
    },
    revalidate: 60, // 60秒ごとにISR
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const users = await fetch('https://api.example.com/users').then(res => res.json());

  return {
    paths: users.map((user: User) => ({ params: { id: user.id } })),
    fallback: 'blocking',
  };
};
```

### App Routerでの使用

```tsx
// app/users/[id]/page.tsx
import { Suspense } from 'react';
import UserProfile from './UserProfile';

async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`, {
    next: { revalidate: 60 },
  });
  return res.json();
}

export default async function UserPage({ params }: { params: { id: string } }) {
  const initialUser = await getUser(params.id);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile userId={params.id} initialData={initialUser} />
    </Suspense>
  );
}

// app/users/[id]/UserProfile.tsx (Client Component)
'use client';

import useSWR from 'swr';

export default function UserProfile({ userId, initialData }: Props) {
  const { data: user } = useSWR<User>(
    `/api/users/${userId}`,
    fetcher,
    { fallbackData: initialData }
  );

  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
    </div>
  );
}
```

### Middleware統合

```tsx
// lib/swr-config.ts
import { SWRConfiguration } from 'swr';

export const swrConfig: SWRConfiguration = {
  fetcher: async (url: string) => {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    if (!res.ok) {
      const error = new Error('API Error');
      error.info = await res.json();
      error.status = res.status;
      throw error;
    }

    return res.json();
  },

  onError: (error) => {
    console.error('SWR Error:', error);

    if (error.status === 401) {
      // 認証エラー時の処理
      window.location.href = '/login';
    }
  },

  onSuccess: (data, key, config) => {
    console.log('SWR Success:', key);
  },
};

// app/layout.tsx
import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr-config';

export default function RootLayout({ children }: Props) {
  return (
    <html>
      <body>
        <SWRConfig value={swrConfig}>
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
```

## エラーハンドリング

### エラー再試行

```tsx
const { data, error } = useSWR('/api/data', fetcher, {
  // エラー時の再試行設定
  errorRetryCount: 3,
  errorRetryInterval: 5000,

  // 特定のエラーコードでは再試行しない
  shouldRetryOnError: (error) => {
    return error.status !== 404 && error.status !== 403;
  },

  // 再試行時のバックオフ
  onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    // 404では再試行しない
    if (error.status === 404) return;

    // 最大3回まで
    if (retryCount >= 3) return;

    // 指数バックオフ: 1秒、2秒、4秒
    setTimeout(() => revalidate({ retryCount }), 1000 * Math.pow(2, retryCount));
  },
});
```

### エラーバウンダリ

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <SWRConfig value={{ suspense: true }}>
        <DataComponent />
      </SWRConfig>
    </ErrorBoundary>
  );
}
```

## パフォーマンス最適化

### Prefetching

```tsx
import { mutate } from 'swr';

function UserList() {
  const { data: users } = useSWR<User[]>('/api/users', fetcher);

  const prefetchUser = (userId: string) => {
    // マウスホバーでプリフェッチ
    mutate(`/api/users/${userId}`, fetcher(`/api/users/${userId}`), false);
  };

  return (
    <ul>
      {users?.map(user => (
        <li key={user.id} onMouseEnter={() => prefetchUser(user.id)}>
          <Link href={`/users/${user.id}`}>{user.name}</Link>
        </li>
      ))}
    </ul>
  );
}
```

### キャッシュの永続化

```tsx
import { SWRConfig } from 'swr';

const localStorageProvider = () => {
  const map = new Map<string, any>(JSON.parse(localStorage.getItem('app-cache') || '[]'));

  window.addEventListener('beforeunload', () => {
    const appCache = JSON.stringify(Array.from(map.entries()));
    localStorage.setItem('app-cache', appCache);
  });

  return map;
};

function App() {
  return (
    <SWRConfig value={{ provider: localStorageProvider }}>
      <MyApplication />
    </SWRConfig>
  );
}
```

### 選択的再検証

```tsx
function UserDashboard() {
  const { data: profile } = useSWR('/api/profile', fetcher, {
    revalidateOnFocus: false, // プロフィールは頻繁に変わらない
  });

  const { data: notifications } = useSWR('/api/notifications', fetcher, {
    refreshInterval: 10000, // 通知は10秒ごとに更新
  });

  const { data: messages } = useSWR('/api/messages', fetcher, {
    revalidateOnFocus: true, // メッセージはフォーカス時に更新
  });

  return (
    <div>
      <Profile data={profile} />
      <Notifications data={notifications} />
      <Messages data={messages} />
    </div>
  );
}
```

## 実践パターン

### 検索機能

```tsx
import { useState } from 'react';
import useSWR from 'swr';
import { useDebouncedValue } from './hooks';

function SearchUsers() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: results, isLoading } = useSWR(
    debouncedQuery ? `/api/search?q=${debouncedQuery}` : null,
    fetcher,
    {
      keepPreviousData: true, // 検索中も前の結果を表示
    }
  );

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search users..."
      />

      {isLoading && <div>Searching...</div>}

      <ul>
        {results?.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### フォーム送信

```tsx
function UserEditForm({ userId }: { userId: string }) {
  const { data: user, mutate } = useSWR<User>(`/api/users/${userId}`, fetcher);
  const [name, setName] = useState('');

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 楽観的更新
    mutate({ ...user!, name }, false);

    try {
      const updated = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(res => res.json());

      // 成功時: サーバーデータで更新
      mutate(updated, false);
    } catch (error) {
      // エラー時: 元のデータに戻す
      mutate();
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button type="submit">Save</button>
    </form>
  );
}
```

### リアルタイム更新

```tsx
import { useEffect } from 'react';
import useSWR from 'swr';

function LiveChat({ roomId }: { roomId: string }) {
  const { data: messages, mutate } = useSWR<Message[]>(
    `/api/rooms/${roomId}/messages`,
    fetcher,
    { refreshInterval: 3000 } // 3秒ごとにポーリング
  );

  useEffect(() => {
    // WebSocketでリアルタイム更新
    const ws = new WebSocket(`wss://api.example.com/rooms/${roomId}`);

    ws.onmessage = (event) => {
      const newMessage = JSON.parse(event.data);

      // 新しいメッセージを追加
      mutate(
        messages ? [...messages, newMessage] : [newMessage],
        false
      );
    };

    return () => ws.close();
  }, [roomId, messages, mutate]);

  return (
    <div>
      {messages?.map(msg => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}
```

## まとめ

SWRは、Reactアプリケーションのデータフェッチングを劇的に改善します。

### 主な利点

- **シンプルなAPI**: useEffectの複雑さから解放
- **パフォーマンス**: キャッシュファーストで高速表示
- **UX向上**: 楽観的更新でスムーズな操作感
- **TypeScript対応**: 完全な型安全性
- **Next.js統合**: SSR/SSG/ISRとシームレスに連携

### いつ使うべきか

- **使うべき**: REST API、GraphQL、任意の非同期データソース
- **検討すべき**: サーバーステート中心のアプリ（React QueryやTanStack Queryも検討）
- **不要**: クライアントステートのみ（Zustand、Jotai等で十分）

SWRをマスターすることで、よりユーザーフレンドリーで高速なReactアプリケーションを構築できます。
