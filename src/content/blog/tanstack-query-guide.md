---
title: 'TanStack Query完全ガイド — サーバー状態管理・キャッシュ・無限スクロール・楽観的更新'
description: 'TanStack Query（React Query v5）でサーバー状態を完全管理する実践ガイド。useQuery・useMutation・キャッシュ戦略・無限スクロール・楽観的更新・Prefetching・Next.js RSC統合・テストまで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['TanStack Query', 'React Query', 'React', 'TypeScript', 'サーバー状態管理']
---

Reactアプリケーションを開発するうえで避けて通れないのが「サーバー状態の管理」だ。`useState` + `useEffect` でデータフェッチングを書くと、ローディング状態・エラーハンドリング・キャッシュ・再フェッチ・ページネーション……気づけば数百行のボイラープレートに埋もれてしまう。

**TanStack Query**（旧 React Query）はそのすべてを解決する。「サーバー状態に特化した」データフェッチングライブラリとして、2020年の登場以来フロントエンドの標準ツールに成長した。v5（2023年リリース）では API が整理され、Next.js App Router との統合も完成形に近づいている。

本記事では、TanStack Query v5 の全機能を実務レベルで解説する。セットアップから始まり、`useQuery` / `useMutation` の基礎、高度なキャッシュ戦略、無限スクロール、楽観的更新、Next.js App Router との統合、そしてテスト手法まで網羅する。

---

## 1. TanStack Queryとは — SWR・RTK Queryとの比較

### サーバー状態 vs クライアント状態

まず概念を整理しよう。Reactの「状態」には2種類ある。

| 種別 | 特徴 | 管理ツール例 |
|------|------|-------------|
| **クライアント状態** | UIのモーダル開閉・フォーム入力・テーマ設定など、ブラウザ上だけに存在する状態 | Zustand, Jotai, Redux |
| **サーバー状態** | バックエンドAPIから取得するデータ。他ユーザーが変更でき、常に「古くなりうる」 | TanStack Query, SWR |

サーバー状態の特性は以下の通りだ。

- **非同期性**: 取得に時間がかかる
- **外部所有**: 自分では制御できない他のクライアントやサーバーが変更する
- **stale化**: キャッシュはすぐに古くなる
- **ページネーション・無限スクロール**: 複雑なデータ取得パターンが必要

`useState` + `useEffect` でこれを扱うと、どうなるか。

```typescript
// 典型的なボイラープレート（問題のあるコード）
function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err);
        setIsLoading(false);
      });
  }, []);

  // キャッシュなし、重複リクエストあり、背景更新なし...
}
```

このコードには問題が山積みだ。同じAPIを複数コンポーネントで呼ぶと重複リクエストが発生し、ウィンドウフォーカス時の再フェッチも自前で実装しなければならない。

### 主要ライブラリ比較

```
TanStack Query vs SWR vs RTK Query
```

**TanStack Query v5**
- バンドルサイズ: ~47KB (gzip)
- 強み: 機能の豊富さ、devtools、無限スクロール、楽観的更新、SSR対応
- 弱み: 学習コストが高め
- 採用規模: 最大。週間ダウンロード数1000万超

**SWR（Vercel製）**
- バンドルサイズ: ~14KB (gzip)
- 強み: 軽量、シンプルAPI、Next.jsとの相性
- 弱み: 機能が限定的（楽観的更新・無限スクロールは自前実装が必要）
- 採用: Next.jsプロジェクト中心

**RTK Query（Redux Toolkit内蔵）**
- バンドルサイズ: Redux Toolkitに含まれる
- 強み: Reduxと一体化、コード生成、厳格な型安全性
- 弱み: Redux必須、設定量が多い
- 採用: 大規模エンタープライズアプリ

**結論**: 新規プロジェクトなら TanStack Query 一択。Reduxをすでに使っているなら RTK Query。軽量さ重視の小規模プロジェクトには SWR。

---

## 2. セットアップ

### インストール

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
# TypeScriptを使う場合（v5は型定義が内蔵）
```

v5からは `react-query` パッケージは非推奨になった。必ず `@tanstack/react-query` を使う。

### QueryClient の作成

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // データが「古い」と見なすまでの時間（ミリ秒）
      staleTime: 1000 * 60 * 5, // 5分
      // キャッシュをメモリから削除するまでの時間
      gcTime: 1000 * 60 * 10, // 10分（旧 cacheTime）
      // エラー時のリトライ回数
      retry: 3,
      // リトライ間隔（指数バックオフ）
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // ウィンドウフォーカス時に再フェッチするか
      refetchOnWindowFocus: true,
      // ネットワーク再接続時に再フェッチするか
      refetchOnReconnect: true,
    },
    mutations: {
      // ミューテーションのリトライ（デフォルト: 0）
      retry: 0,
    },
  },
});
```

### QueryClientProvider の設定

```typescript
// src/app/providers.tsx（Next.js App Router用）
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // SSRでは各リクエストで新しいQueryClientを作成する
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 10,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 開発環境のみdevtoolsを表示 */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

```typescript
// src/app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### DevTools

`ReactQueryDevtools` をマウントすると、画面右下に TanStack Query のロゴが現れる。クリックすると、すべてのクエリのキャッシュ状態・stale状態・フェッチ状態をリアルタイムで確認できる。開発効率が劇的に上がるため、必ず導入しよう。

---

## 3. useQuery — 基本的なデータフェッチング

### 最もシンプルな使い方

```typescript
import { useQuery } from '@tanstack/react-query';

type User = {
  id: number;
  name: string;
  email: string;
};

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users');
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

function UserList() {
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    isStale,
    refetch,
  } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  if (isLoading) return <div>読み込み中...</div>;
  if (isError) return <div>エラー: {error.message}</div>;

  return (
    <div>
      {/* isFetching: バックグラウンドで再フェッチ中 */}
      {isFetching && <span>更新中...</span>}
      <ul>
        {data?.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
      <button onClick={() => refetch()}>手動更新</button>
    </div>
  );
}
```

### queryKey の設計

`queryKey` はキャッシュの識別子だ。配列で指定し、同じキーを持つクエリは同じキャッシュを共有する。

```typescript
// シンプルなキー
useQuery({ queryKey: ['users'], queryFn: fetchUsers });

// パラメータ付きキー
useQuery({
  queryKey: ['users', userId],
  queryFn: () => fetchUser(userId),
});

// フィルター付きキー
useQuery({
  queryKey: ['users', { status: 'active', page: 1 }],
  queryFn: () => fetchUsers({ status: 'active', page: 1 }),
});
```

重要なルール: **queryKey に含まれる値が変わると、新しいキャッシュエントリとして扱われる**。`userId` が `1` から `2` に変わると、`['users', 1]` と `['users', 2]` は別々のキャッシュになる。

### staleTime と gcTime

```typescript
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  // データがフレッシュな期間（この間は再フェッチしない）
  staleTime: 1000 * 60 * 5, // 5分
  // キャッシュがメモリに残る期間（全コンポーネントがアンマウント後）
  gcTime: 1000 * 60 * 30, // 30分
});
```

- `staleTime: 0`（デフォルト）: マウント直後にデータがstaleになる。コンポーネントがマウントされるたびにバックグラウンド再フェッチが走る
- `staleTime: Infinity`: 手動で無効化するまで再フェッチしない
- `gcTime: 0`: コンポーネントがアンマウントされたらすぐにキャッシュを削除

### 返り値の全プロパティ

```typescript
const {
  // データ
  data,           // フェッチ済みデータ（undefinedの可能性あり）
  error,          // エラーオブジェクト
  
  // 状態フラグ
  isLoading,      // 初回フェッチ中（キャッシュなし）
  isFetching,     // フェッチ中（キャッシュありでも含む）
  isSuccess,      // 成功
  isError,        // エラー
  isPending,      // データなし（isLoadingと似ているがSuspense対応）
  isStale,        // データがstaleか
  
  // メタ情報
  status,         // 'pending' | 'error' | 'success'
  fetchStatus,    // 'fetching' | 'paused' | 'idle'
  dataUpdatedAt,  // 最終データ更新時刻（Unix ms）
  errorUpdatedAt, // 最終エラー時刻
  failureCount,   // 連続失敗回数
  
  // メソッド
  refetch,        // 手動再フェッチ
  remove,         // キャッシュから削除
} = useQuery({ queryKey: [...], queryFn: ... });
```

---

## 4. キャッシュ戦略 — Stale-While-Revalidate

### TanStack Queryのキャッシュモデル

TanStack Query の根幹にある考え方が **stale-while-revalidate（SWR）** パターンだ。

```
フロー:
1. コンポーネントがマウント → キャッシュを確認
2. キャッシュあり・フレッシュ → そのまま返す（ネットワークリクエストなし）
3. キャッシュあり・stale → キャッシュを即返す + バックグラウンドで再フェッチ
4. キャッシュなし → ローディング状態 + フェッチ開始
```

ユーザーにとってのメリットは「**一度見たデータは即座に表示される**」ことだ。データが古くても、まず見せてからバックグラウンドで最新化する。

### 再フェッチのトリガー

```typescript
// 各トリガーを個別に制御できる
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  
  // コンポーネントマウント時に再フェッチ（データがstaleの場合）
  refetchOnMount: true,
  
  // ウィンドウがフォーカスされた時に再フェッチ
  refetchOnWindowFocus: true,
  
  // ネットワーク再接続時に再フェッチ
  refetchOnReconnect: true,
  
  // 定期的な自動再フェッチ（ポーリング）
  refetchInterval: 1000 * 30, // 30秒ごと
  
  // ウィンドウがバックグラウンドの時もポーリングするか
  refetchIntervalInBackground: false,
});
```

### キャッシュの手動制御

```typescript
import { useQueryClient } from '@tanstack/react-query';

function AdminPanel() {
  const queryClient = useQueryClient();
  
  const handleRefreshAll = () => {
    // 全クエリを無効化（次回アクセス時に再フェッチ）
    queryClient.invalidateQueries();
  };
  
  const handleRefreshUsers = () => {
    // 特定のクエリを無効化
    queryClient.invalidateQueries({ queryKey: ['users'] });
    
    // 部分一致で無効化（['users', 1]、['users', 2]なども含む）
    queryClient.invalidateQueries({
      queryKey: ['users'],
      exact: false, // デフォルト
    });
  };
  
  const handleSetCache = (users: User[]) => {
    // キャッシュに直接データをセット
    queryClient.setQueryData(['users'], users);
  };
  
  const handleGetCache = () => {
    // キャッシュからデータを取得
    const users = queryClient.getQueryData<User[]>(['users']);
    console.log(users);
  };
  
  const handleRemoveCache = () => {
    // キャッシュを完全に削除
    queryClient.removeQueries({ queryKey: ['users'] });
  };
  
  const handleCancelQuery = () => {
    // 進行中のクエリをキャンセル
    queryClient.cancelQueries({ queryKey: ['users'] });
  };
}
```

---

## 5. useMutation — データの作成・更新・削除

### 基本的な使い方

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

type CreateUserInput = {
  name: string;
  email: string;
};

async function createUser(input: CreateUserInput): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('ユーザー作成に失敗しました');
  return res.json();
}

function CreateUserForm() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: createUser,
    
    // ミューテーション成功時
    onSuccess: (data, variables, context) => {
      console.log('作成されたユーザー:', data);
      
      // ユーザーリストのキャッシュを無効化して再フェッチ
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      // または、新しいデータをキャッシュに直接追加
      queryClient.setQueryData<User[]>(['users'], old => {
        return old ? [...old, data] : [data];
      });
    },
    
    // ミューテーション失敗時
    onError: (error, variables, context) => {
      console.error('エラー:', error.message);
      // トースト通知などのエラー処理
    },
    
    // 成功・失敗どちらの場合も実行
    onSettled: (data, error, variables, context) => {
      // ローディング状態のリセットなど
    },
  });
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    mutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="名前" required />
      <input name="email" type="email" placeholder="メールアドレス" required />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? '作成中...' : 'ユーザー作成'}
      </button>
      {mutation.isError && (
        <p style={{ color: 'red' }}>{mutation.error.message}</p>
      )}
      {mutation.isSuccess && (
        <p style={{ color: 'green' }}>作成完了: {mutation.data.name}</p>
      )}
    </form>
  );
}
```

### mutate vs mutateAsync

```typescript
// mutate: Promiseを返さない。コールバック（onSuccess/onError）で処理
mutation.mutate(input);

// mutateAsync: Promiseを返す。async/awaitで扱える
try {
  const user = await mutation.mutateAsync(input);
  // userが利用可能
  router.push(`/users/${user.id}`);
} catch (error) {
  // エラー処理
}
```

`mutateAsync` はエラーを throw するため、必ず try-catch で囲む。`mutate` の場合は `onError` コールバックで処理するため、未処理エラーにならない。

---

## 6. 楽観的更新（Optimistic Update）

楽観的更新とは、APIレスポンスを待たずにUIを先に更新し、失敗した場合はロールバックするパターンだ。LikeボタンやTodoの完了チェックなど、即座なフィードバックが求められるUIに適している。

```typescript
type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

async function toggleTodo(id: number): Promise<Todo> {
  const res = await fetch(`/api/todos/${id}/toggle`, { method: 'POST' });
  if (!res.ok) throw new Error('更新に失敗しました');
  return res.json();
}

function TodoItem({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: () => toggleTodo(todo.id),
    
    // ミューテーション開始前に呼ばれる
    onMutate: async () => {
      // 進行中のフェッチをキャンセル（競合を防ぐ）
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      
      // 現在のキャッシュをスナップショットとして保存
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);
      
      // キャッシュを楽観的に更新
      queryClient.setQueryData<Todo[]>(['todos'], old =>
        old?.map(t =>
          t.id === todo.id ? { ...t, completed: !t.completed } : t
        )
      );
      
      // contextとしてスナップショットを返す（ロールバック用）
      return { previousTodos };
    },
    
    // エラー時: スナップショットに戻す
    onError: (err, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },
    
    // 成功・失敗どちらの場合も: サーバーのデータで同期
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
  
  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => mutation.mutate()}
        disabled={mutation.isPending}
      />
      <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
        {todo.title}
      </span>
    </li>
  );
}
```

楽観的更新の流れをまとめると:

1. `onMutate`: キャッシュをスナップショット保存 → UIを先に更新
2. API呼び出し（バックグラウンド）
3. 成功: `onSettled` でサーバーデータと同期
4. 失敗: `onError` でスナップショットに戻す → ユーザーに通知

---

## 7. 無限スクロール（useInfiniteQuery）

SNSのタイムラインやECサイトの商品一覧など、「もっと読み込む」や無限スクロールに使う。

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer'; // npm install react-intersection-observer
import { useEffect } from 'react';

type PostsPage = {
  posts: Post[];
  nextCursor: string | null;
  hasNextPage: boolean;
};

async function fetchPosts({ pageParam }: { pageParam: string | null }): Promise<PostsPage> {
  const url = new URL('/api/posts', window.location.origin);
  if (pageParam) url.searchParams.set('cursor', pageParam);
  url.searchParams.set('limit', '10');
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('フェッチ失敗');
  return res.json();
}

function InfinitePostList() {
  // Intersection Observer で最下部を検知
  const { ref, inView } = useInView();
  
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    
    // 初回フェッチ時のpageParam
    initialPageParam: null as string | null,
    
    // 次のページのpageParamを取得する関数
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    
    // getPreviousPageParam も設定できる（双方向ページネーション）
    // getPreviousPageParam: (firstPage) => firstPage.prevCursor,
    
    // ページ数の上限（オプション）
    maxPages: 50,
  });
  
  // 最下部が見えたら次のページをフェッチ
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  if (isLoading) return <div>読み込み中...</div>;
  if (isError) return <div>エラー: {error.message}</div>;
  
  return (
    <div>
      {/* data.pages は各ページのデータ配列 */}
      {data.pages.map((page, pageIndex) => (
        <div key={pageIndex}>
          {page.posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ))}
      
      {/* センチネル要素: これが見えたら次のページを読み込む */}
      <div ref={ref} style={{ height: '1px' }} />
      
      {isFetchingNextPage && <div>さらに読み込み中...</div>}
      {!hasNextPage && <div>これ以上の投稿はありません</div>}
    </div>
  );
}
```

### ページネーション（オフセット方式）

カーソル方式ではなく、ページ番号を使うオフセット方式の場合:

```typescript
type UsersPage = {
  users: User[];
  totalCount: number;
  totalPages: number;
};

useInfiniteQuery({
  queryKey: ['users'],
  queryFn: ({ pageParam }) =>
    fetch(`/api/users?page=${pageParam}&limit=20`).then(r => r.json()),
  initialPageParam: 1,
  getNextPageParam: (lastPage, allPages, lastPageParam) => {
    if (lastPageParam >= lastPage.totalPages) return undefined; // これ以上なし
    return lastPageParam + 1;
  },
});
```

---

## 8. 並列クエリ・依存クエリ

### 並列クエリ

複数のクエリを同時に実行したい場合:

```typescript
// 方法1: 単純に複数のuseQueryを並べる（自動的に並列実行）
function Dashboard() {
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const postsQuery = useQuery({ queryKey: ['posts'], queryFn: fetchPosts });
  const statsQuery = useQuery({ queryKey: ['stats'], queryFn: fetchStats });
  
  const isLoading = usersQuery.isLoading || postsQuery.isLoading || statsQuery.isLoading;
  
  if (isLoading) return <div>読み込み中...</div>;
  
  return (
    <div>
      <UserSummary users={usersQuery.data!} />
      <PostSummary posts={postsQuery.data!} />
      <StatsSummary stats={statsQuery.data!} />
    </div>
  );
}
```

```typescript
// 方法2: useQueries（動的な数のクエリ）
import { useQueries } from '@tanstack/react-query';

function UserProfiles({ userIds }: { userIds: number[] }) {
  const queries = useQueries({
    queries: userIds.map(id => ({
      queryKey: ['user', id],
      queryFn: () => fetchUser(id),
      staleTime: 1000 * 60 * 5,
    })),
    // combine: すべての結果をまとめて処理
    combine: (results) => ({
      data: results.map(r => r.data),
      isLoading: results.some(r => r.isLoading),
      isError: results.some(r => r.isError),
    }),
  });
  
  if (queries.isLoading) return <div>読み込み中...</div>;
  
  return (
    <div>
      {queries.data.map((user, i) =>
        user ? <ProfileCard key={userIds[i]} user={user} /> : null
      )}
    </div>
  );
}
```

### 依存クエリ（enabled オプション）

あるクエリの結果が出てから別のクエリを実行する場合:

```typescript
function UserOrders({ userId }: { userId: number }) {
  // ステップ1: ユーザー情報を取得
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  
  // ステップ2: ユーザー情報が取得できてから注文を取得
  const ordersQuery = useQuery({
    queryKey: ['orders', userQuery.data?.id],
    queryFn: () => fetchOrdersByUser(userQuery.data!.id),
    // userQuery.data が存在する場合のみ有効化
    enabled: !!userQuery.data,
  });
  
  // ステップ3: 注文の最初のIDがあれば詳細を取得
  const firstOrderDetailQuery = useQuery({
    queryKey: ['order', ordersQuery.data?.[0]?.id],
    queryFn: () => fetchOrderDetail(ordersQuery.data![0].id),
    enabled: !!ordersQuery.data?.[0]?.id,
  });
  
  if (userQuery.isLoading) return <div>ユーザー情報を読み込み中...</div>;
  if (ordersQuery.isLoading) return <div>注文履歴を読み込み中...</div>;
  
  return <OrderList orders={ordersQuery.data ?? []} />;
}
```

---

## 9. Prefetching — データの先読み

ユーザーがページを開く前にデータをキャッシュしておくことで、体感速度を向上させる。

### ホバー時にprefetch

```typescript
function UserListItem({ userId }: { userId: number }) {
  const queryClient = useQueryClient();
  
  const handleMouseEnter = () => {
    // ホバーしたらユーザー詳細をprefetch
    queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => fetchUser(userId),
      // staleTimeより新しければprefetchしない（無駄なリクエストを防ぐ）
      staleTime: 1000 * 60 * 5,
    });
  };
  
  return (
    <li onMouseEnter={handleMouseEnter}>
      <Link href={`/users/${userId}`}>ユーザー詳細</Link>
    </li>
  );
}
```

### ルートローダーでprefetch（Next.js）

```typescript
// app/users/page.tsx（Server Component）
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

export default async function UsersPage() {
  const queryClient = new QueryClient();
  
  // サーバーサイドでデータをprefetch
  await queryClient.prefetchQuery({
    queryKey: ['users'],
    queryFn: fetchUsers, // サーバー側で直接DB呼び出し可能
  });
  
  return (
    // dehydrateされた状態をクライアントに渡す
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserList />
    </HydrationBoundary>
  );
}

// app/users/UserList.tsx（Client Component）
'use client';

function UserList() {
  // サーバーでprefetchされたデータが即座に利用可能
  // ローディング状態にならない
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
  
  return (
    <ul>
      {data?.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

---

## 10. QueryKey設計 — Key Factory Pattern

大規模アプリでは `queryKey` の管理が複雑になる。**Key Factory Pattern** を使うと、一元管理・型安全・invalidation が簡単になる。

```typescript
// src/lib/queryKeys.ts

// ユーザー関連のキーファクトリー
export const userKeys = {
  // すべてのユーザー関連クエリのルート
  all: ['users'] as const,
  
  // リスト系
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), { filters }] as const,
  
  // 詳細系
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
  
  // 関連データ
  orders: (userId: number) => [...userKeys.detail(userId), 'orders'] as const,
};

// 使用例
useQuery({
  queryKey: userKeys.list({ status: 'active', page: 1 }),
  queryFn: () => fetchUsers({ status: 'active', page: 1 }),
});

useQuery({
  queryKey: userKeys.detail(userId),
  queryFn: () => fetchUser(userId),
});

// invalidation の威力: 全ユーザー関連クエリを一括無効化
queryClient.invalidateQueries({ queryKey: userKeys.all });

// 特定ユーザーの詳細のみ無効化
queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });

// 投稿関連のキーファクトリー
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: PostFilters) => [...postKeys.lists(), { filters }] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: number) => [...postKeys.details(), id] as const,
  comments: (postId: number) => [...postKeys.detail(postId), 'comments'] as const,
};
```

このパターンにより:
- **型安全**: TypeScript が補完してくれる
- **一貫性**: キー文字列を散在させない
- **invalidation の精度**: 特定の範囲だけ無効化できる

---

## 11. Error Boundary・Suspense 統合

### throwOnError（v5の書き方）

```typescript
// エラーを Error Boundary に伝播させる
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  throwOnError: true, // エラーをError Boundaryに投げる
});

// エラークラスで条件分岐
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  throwOnError: (error) => error instanceof NetworkError,
});
```

```typescript
// src/components/QueryErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

class ErrorBoundaryInner extends Component<
  { children: ReactNode; onReset: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>エラーが発生しました</h2>
          <p>{this.state.error?.message}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset();
            }}
          >
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function QueryErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundaryInner onReset={reset}>
          {children}
        </ErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  );
}
```

### Suspense 統合

```typescript
import { Suspense } from 'react';

// useSuspenseQuery を使う（v5の推奨方法）
import { useSuspenseQuery } from '@tanstack/react-query';

function UserProfile({ userId }: { userId: number }) {
  // Suspenseモードでは data は必ず存在する（undefinedにならない）
  const { data: user } = useSuspenseQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => fetchUser(userId),
  });
  
  return <div>{user.name}</div>;
}

function UserPage({ userId }: { userId: number }) {
  return (
    <QueryErrorBoundary>
      <Suspense fallback={<div>プロフィールを読み込み中...</div>}>
        <UserProfile userId={userId} />
      </Suspense>
    </QueryErrorBoundary>
  );
}
```

---

## 12. Next.js App Router 統合

### Server Component から Client Component へのデータ受け渡し

App Router では、Server Component でデータをprefetchして `dehydrate` し、Client Componentで `hydrate` することでSSRとクライアントキャッシュを統合できる。

```typescript
// app/posts/page.tsx（Server Component）
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { PostList } from './PostList';

// サーバーサイドでDBから直接フェッチする関数
async function fetchPostsFromDB() {
  // Prisma、Drizzle等を使ったDB直接アクセス
  return db.post.findMany({ orderBy: { createdAt: 'desc' } });
}

export default async function PostsPage() {
  const queryClient = new QueryClient();
  
  await queryClient.prefetchQuery({
    queryKey: postKeys.list({}),
    queryFn: fetchPostsFromDB,
  });
  
  return (
    <main>
      <h1>投稿一覧</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PostList />
      </HydrationBoundary>
    </main>
  );
}
```

```typescript
// app/posts/PostList.tsx（Client Component）
'use client';

import { useQuery } from '@tanstack/react-query';
import { postKeys } from '@/lib/queryKeys';

// クライアントサイドでのフェッチ関数（APIルート経由）
async function fetchPosts() {
  const res = await fetch('/api/posts');
  return res.json();
}

export function PostList() {
  const { data: posts } = useQuery({
    queryKey: postKeys.list({}),
    queryFn: fetchPosts,
    // Server Componentでprefetchされているため、初回はローディングにならない
  });
  
  return (
    <ul>
      {posts?.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### React Server Components との共存

v5 以降、`experimental_createQueryClient` を使うと RSC 内でもクエリクライアントを使えるが、現時点では上記の `HydrationBoundary` パターンが最も安定している。

```typescript
// app/lib/get-query-client.ts
import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

// React の cache() でリクエストごとにシングルトンを作成
export const getQueryClient = cache(() => new QueryClient());
```

---

## 13. テスト

### セットアップ

```typescript
// src/test/utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { ReactNode } from 'react';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // テスト中はリトライしない
        retry: false,
        // テスト中はウィンドウフォーカスで再フェッチしない
        refetchOnWindowFocus: false,
        // gcTimeを短くして各テスト後にクリーンアップ
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithQuery(
  ui: ReactNode,
  options: CustomRenderOptions = {}
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;
  
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }
  
  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}
```

### useQuery のテスト

```typescript
// src/features/users/__tests__/UserList.test.tsx
import { screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithQuery } from '@/test/utils';
import { UserList } from '../UserList';

// APIモジュールをモック
vi.mock('@/api/users', () => ({
  fetchUsers: vi.fn(),
}));

import { fetchUsers } from '@/api/users';

describe('UserList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('ユーザーリストを正常に表示する', async () => {
    const mockUsers = [
      { id: 1, name: '田中太郎', email: 'tanaka@example.com' },
      { id: 2, name: '鈴木花子', email: 'suzuki@example.com' },
    ];
    
    vi.mocked(fetchUsers).mockResolvedValue(mockUsers);
    
    renderWithQuery(<UserList />);
    
    // ローディング状態を確認
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    
    // データ表示を待つ
    await waitFor(() => {
      expect(screen.getByText('田中太郎')).toBeInTheDocument();
    });
    
    expect(screen.getByText('鈴木花子')).toBeInTheDocument();
    expect(fetchUsers).toHaveBeenCalledTimes(1);
  });
  
  it('エラー時にエラーメッセージを表示する', async () => {
    vi.mocked(fetchUsers).mockRejectedValue(new Error('サーバーエラー'));
    
    renderWithQuery(<UserList />);
    
    await waitFor(() => {
      expect(screen.getByText(/サーバーエラー/)).toBeInTheDocument();
    });
  });
});
```

### useMutation のテスト

```typescript
// src/features/users/__tests__/CreateUserForm.test.tsx
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { renderWithQuery } from '@/test/utils';
import { CreateUserForm } from '../CreateUserForm';

vi.mock('@/api/users', () => ({
  createUser: vi.fn(),
}));

import { createUser } from '@/api/users';

describe('CreateUserForm', () => {
  it('フォーム送信でユーザーを作成する', async () => {
    const user = userEvent.setup();
    const mockUser = { id: 3, name: '山田次郎', email: 'yamada@example.com' };
    
    vi.mocked(createUser).mockResolvedValue(mockUser);
    
    renderWithQuery(<CreateUserForm />);
    
    await user.type(screen.getByPlaceholderText('名前'), '山田次郎');
    await user.type(
      screen.getByPlaceholderText('メールアドレス'),
      'yamada@example.com'
    );
    await user.click(screen.getByRole('button', { name: 'ユーザー作成' }));
    
    // ローディング状態
    expect(screen.getByText('作成中...')).toBeInTheDocument();
    
    // 成功後
    await waitFor(() => {
      expect(screen.getByText('作成完了: 山田次郎')).toBeInTheDocument();
    });
  });
});
```

### カスタムフックのテスト

```typescript
// src/hooks/__tests__/useUsers.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUsers } from '../useUsers';

vi.mock('@/api/users', () => ({
  fetchUsers: vi.fn().mockResolvedValue([
    { id: 1, name: 'テストユーザー', email: 'test@example.com' },
  ]),
}));

describe('useUsers', () => {
  it('ユーザーデータを正しく取得する', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    
    const { result } = renderHook(() => useUsers(), { wrapper });
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('テストユーザー');
  });
});
```

---

## 実践Tips: よくあるパターンと落とし穴

### カスタムフックで抽象化

```typescript
// src/hooks/useUsers.ts
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: userKeys.list(filters ?? {}),
    queryFn: () => fetchUsers(filters),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => fetchUser(id),
    enabled: !!id, // idが0やundefinedの場合はフェッチしない
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
```

### グローバルエラーハンドリング

```typescript
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // すべてのクエリエラーをグローバルにハンドリング
      if (error instanceof UnauthorizedError) {
        router.push('/login');
        return;
      }
      toast.error(`エラーが発生しました: ${error.message}`);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(`操作に失敗しました: ${error.message}`);
    },
  }),
});
```

### select でデータを変換

```typescript
// APIレスポンスを加工したい場合、selectオプションが便利
// 再レンダリングも最適化される（selectの結果が同じならスキップ）
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  select: (data) => data
    .filter(user => user.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name)),
});
```

### AbortController で不要なリクエストをキャンセル

```typescript
useQuery({
  queryKey: ['users', searchTerm],
  queryFn: ({ signal }) => {
    // signal を fetch に渡すと、queryKeyが変わった時に前のリクエストが自動キャンセルされる
    return fetch(`/api/users?search=${searchTerm}`, { signal }).then(r => r.json());
  },
});
```

---

## まとめ

TanStack Query は「サーバー状態管理のベストプラクティス」を標準化したライブラリだ。本記事で紹介した機能を整理すると:

| 機能 | 用途 | 主要API |
|------|------|---------|
| データフェッチング | GET系API | `useQuery`, `useSuspenseQuery` |
| データ更新 | POST/PUT/DELETE | `useMutation` |
| 楽観的更新 | 即座なUIフィードバック | `onMutate` + `setQueryData` |
| 無限スクロール | タイムライン・一覧 | `useInfiniteQuery` |
| 並列クエリ | ダッシュボード | `useQueries` |
| 依存クエリ | 連鎖フェッチ | `enabled` オプション |
| 先読み | パフォーマンス向上 | `prefetchQuery` |
| SSR | Next.js統合 | `dehydrate` / `HydrationBoundary` |
| キャッシュ制御 | 手動invalidation | `useQueryClient` |

TanStack Query を使いこなすにはAPIレスポンスの構造を理解することも重要だ。開発中に API のレスポンスを素早く検証・整形したい場面では、**[DevToolBox](https://usedevtools.com/)** の JSON フォーマッターが役立つ。ネストされたレスポンスの構造確認や、`queryKey` 設計時の参考データ作成に活用できる。

TanStack Query を導入することで、データフェッチング周辺のボイラープレートが劇的に減り、バグの少ないキャッシュ戦略を簡単に実装できる。まず `useQuery` と `useMutation` の基礎を固め、次にKey Factory PatternとSSR統合を取り入れると、プロダクション品質のアプリケーションが効率よく構築できるだろう。
