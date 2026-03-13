---
title: 'React Suspense完全ガイド: データフェッチングと並行レンダリング'
description: 'React 18/19のSuspenseを使った宣言的データフェッチング、並行レンダリング、ErrorBoundary、Streaming SSRまで。TanStack Query、useDeferredValue、useTransition、Server Componentsとの連携を実践的に解説。'
pubDate: '2025-03-25'
updatedDate: '2025-03-25'
tags: ['React', 'Suspense', 'パフォーマンス', 'TypeScript', 'React19']
heroImage: '../../assets/thumbnails/react-suspense-guide.jpg'
---
## React Suspenseとは？

React Suspenseは、コンポーネントがレンダリングに必要なデータやリソースを待機している状態を**宣言的に**扱う仕組みです。React 16.6で実験的機能として導入され、React 18で並行レンダリングと統合され、React 19でさらに強化されました。

### 従来のデータフェッチングの課題

```tsx
// ❌ 従来のパターン
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return null;

  return <div>{user.name}</div>;
}
```

**問題点:**
- 各コンポーネントでローディング・エラー状態を管理
- ウォーターフォール問題（親→子の順次読み込み）
- レンダリングロジックとデータフェッチングが密結合

### Suspenseを使った宣言的アプローチ

```tsx
// ✅ Suspenseパターン
function UserProfile({ userId }: { userId: string }) {
  const user = use(fetchUser(userId)); // React 19の use フック
  return <div>{user.name}</div>;
}

function App() {
  return (
    <ErrorBoundary fallback={<ErrorMessage />}>
      <Suspense fallback={<Spinner />}>
        <UserProfile userId="123" />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**利点:**
- コンポーネントはデータがあることを前提に書ける
- ローディング状態は親が管理
- エラーはErrorBoundaryで一元管理
- 並行レンダリングで複数のデータを並列取得

## Suspenseの基本原理

### Suspenseの動作メカニズム

Suspenseは**Promise**を使って動作します。

```tsx
function wrapPromise<T>(promise: Promise<T>) {
  let status: 'pending' | 'success' | 'error' = 'pending';
  let result: T;
  let error: Error;

  const suspender = promise.then(
    (data) => {
      status = 'success';
      result = data;
    },
    (err) => {
      status = 'error';
      error = err;
    }
  );

  return {
    read(): T {
      if (status === 'pending') {
        throw suspender; // Promiseをthrowする！
      }
      if (status === 'error') {
        throw error;
      }
      return result;
    }
  };
}
```

**動作フロー:**
1. コンポーネントがPromiseをthrowする
2. Reactが最も近い`<Suspense>`境界を見つける
3. fallbackをレンダリング
4. Promiseが解決されたら、コンポーネントを再レンダリング

## React 19の`use`フック

React 19で導入された`use`フックは、Promiseを直接扱える革新的な機能です。

```tsx
import { use, Suspense } from 'react';

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

function UserProfile({ userId }: { userId: string }) {
  // use()でPromiseを直接読み取る
  const user = use(fetchUser(userId));

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile userId="123" />
    </Suspense>
  );
}
```

### `use`の特徴

**1. 条件付き呼び出しが可能**
```tsx
function Component({ userId }: { userId: string | null }) {
  // useとは違い、条件分岐の中で使える！
  const user = userId ? use(fetchUser(userId)) : null;

  return user ? <div>{user.name}</div> : <div>No user</div>;
}
```

**2. Contextも読み取れる**
```tsx
function Component() {
  const theme = use(ThemeContext);
  return <div className={theme}>Content</div>;
}
```

**3. Server ComponentsとClient Componentsで共通**
```tsx
// Server Component
async function ServerUserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId); // awaitが使える
  return <div>{user.name}</div>;
}

// Client Component
'use client';
function ClientUserProfile({ userId }: { userId: string }) {
  const user = use(fetchUser(userId)); // useで同じことを実現
  return <div>{user.name}</div>;
}
```

## 実践パターン

### パターン1: 並列データフェッチング

```tsx
interface Props {
  userId: string;
}

// ❌ ウォーターフォール（遅い）
function UserDashboard({ userId }: Props) {
  return (
    <div>
      <Suspense fallback={<Spinner />}>
        <UserProfile userId={userId} />
        {/* UserProfileが完了してから開始 */}
        <UserPosts userId={userId} />
      </Suspense>
    </div>
  );
}

// ✅ 並列フェッチング（速い）
function UserDashboard({ userId }: Props) {
  // Promiseを先に作成
  const userPromise = fetchUser(userId);
  const postsPromise = fetchUserPosts(userId);

  return (
    <div>
      <Suspense fallback={<Spinner />}>
        <UserProfile userPromise={userPromise} />
        <UserPosts postsPromise={postsPromise} />
      </Suspense>
    </div>
  );
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <div>{user.name}</div>;
}

function UserPosts({ postsPromise }: { postsPromise: Promise<Post[]> }) {
  const posts = use(postsPromise);
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

### パターン2: 段階的なSuspense境界

```tsx
function UserDashboard({ userId }: Props) {
  return (
    <div>
      {/* 重要なコンテンツは優先表示 */}
      <Suspense fallback={<UserSkeleton />}>
        <UserProfile userId={userId} />
      </Suspense>

      {/* 補助的なコンテンツは独立して読み込み */}
      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts userId={userId} />
      </Suspense>

      <Suspense fallback={<CommentsSkeleton />}>
        <UserComments userId={userId} />
      </Suspense>
    </div>
  );
}
```

**利点:**
- ユーザープロファイルが先に表示される
- 各セクションが独立して読み込まれる
- 一部のエラーが全体に影響しない

### パターン3: useTransitionとの組み合わせ

```tsx
import { useState, useTransition, Suspense } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;

    // 緊急度が低い更新としてマーク
    startTransition(() => {
      setQuery(newQuery);
    });
  };

  return (
    <div>
      <input
        type="text"
        onChange={handleSearch}
        placeholder="Search..."
        style={{ opacity: isPending ? 0.5 : 1 }}
      />

      <Suspense fallback={<SearchSkeleton />}>
        <Results query={query} />
      </Suspense>
    </div>
  );
}

function Results({ query }: { query: string }) {
  const results = use(searchAPI(query));
  return (
    <ul>
      {results.map(r => <li key={r.id}>{r.title}</li>)}
    </ul>
  );
}
```

**動作:**
1. ユーザーが入力すると`startTransition`が呼ばれる
2. 入力はすぐに反映（緊急更新）
3. 検索結果の更新は低優先度（非緊急更新）
4. 新しい結果が来るまで古い結果を表示し続ける

### パターン4: useDeferredValueでデバウンス不要

```tsx
import { useDeferredValue, Suspense } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* deferredQueryは遅延して更新される */}
      <Suspense fallback={<Spinner />}>
        <Results query={deferredQuery} />
      </Suspense>
    </div>
  );
}
```

**useDeferredValueの利点:**
- デバウンスロジックが不要
- Reactが自動的に適切なタイミングで更新
- キャンセル処理も不要

## TanStack Query（React Query）との統合

TanStack Query v5は、Suspenseをネイティブサポートしています。

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';

function UserProfile({ userId }: { userId: string }) {
  const { data: user } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // dataは常にnon-null（Suspenseが保証）
  return <div>{user.name}</div>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary fallback={<ErrorView />}>
        <Suspense fallback={<Spinner />}>
          <UserProfile userId="123" />
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
```

### prefetchQueryで高速化

```tsx
import { useQueryClient } from '@tanstack/react-query';

function UserList() {
  const queryClient = useQueryClient();
  const { data: users } = useSuspenseQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  return (
    <ul>
      {users.map(user => (
        <li
          key={user.id}
          onMouseEnter={() => {
            // ホバー時にプリフェッチ
            queryClient.prefetchQuery({
              queryKey: ['user', user.id],
              queryFn: () => fetchUser(user.id),
            });
          }}
        >
          <Link to={`/users/${user.id}`}>{user.name}</Link>
        </li>
      ))}
    </ul>
  );
}
```

## ErrorBoundaryとの連携

SuspenseはPromiseを、ErrorBoundaryはエラーをキャッチします。

```tsx
import { Component, ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// 使用例
function App() {
  return (
    <ErrorBoundary fallback={<ErrorView />}>
      <Suspense fallback={<Loading />}>
        <UserDashboard userId="123" />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### react-error-boundaryライブラリの活用

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // リセット時の処理
        window.location.href = '/';
      }}
    >
      <Suspense fallback={<Loading />}>
        <UserDashboard userId="123" />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## Streaming SSR（Server-Side Rendering）

React 18以降、Suspenseはサーバーサイドでも動作します。

### Next.js App Routerでの実装

```tsx
// app/users/[id]/page.tsx
import { Suspense } from 'react';

async function UserProfile({ userId }: { userId: string }) {
  // Server Componentでawait可能
  const user = await fetchUser(userId);
  return <div>{user.name}</div>;
}

async function UserPosts({ userId }: { userId: string }) {
  const posts = await fetchUserPosts(userId);
  return (
    <ul>
      {posts.map(p => <li key={p.id}>{p.title}</li>)}
    </ul>
  );
}

export default function UserPage({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* プロファイルは優先してストリーミング */}
      <Suspense fallback={<UserSkeleton />}>
        <UserProfile userId={params.id} />
      </Suspense>

      {/* 投稿は遅延ストリーミング */}
      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts userId={params.id} />
      </Suspense>
    </div>
  );
}
```

**動作:**
1. HTMLの初期部分を即座に送信
2. UserProfileが完了したらストリーミング
3. UserPostsが完了したら追加でストリーミング
4. JavaScriptでハイドレーション

### SSRのパフォーマンス比較

**従来のSSR:**
- サーバーですべてのデータを取得（遅い）
- 完全なHTMLを生成してから送信
- TTFBが遅い

**Streaming SSR with Suspense:**
- HTMLをチャンク単位で送信（速い）
- 重要な部分を優先表示
- TTFBが早い

```tsx
// 従来: すべて待つ
export async function getServerSideProps() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments()
  ]);
  return { props: { user, posts, comments } };
}

// Streaming: 段階的に送信
export default function Page() {
  return (
    <>
      <Suspense fallback={<UserSkeleton />}>
        <User />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <Posts />
      </Suspense>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />
      </Suspense>
    </>
  );
}
```

## 画像・コンポーネントの遅延読み込み

### React.lazyとSuspense

```tsx
import { lazy, Suspense } from 'react';

// コンポーネントを動的インポート
const HeavyChart = lazy(() => import('./HeavyChart'));
const AdminPanel = lazy(() => import('./AdminPanel'));

function Dashboard() {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div>
      <button onClick={() => setShowAdmin(!showAdmin)}>
        Toggle Admin
      </button>

      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart />
      </Suspense>

      {showAdmin && (
        <Suspense fallback={<div>Loading admin...</div>}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
}
```

### Next.js dynamic import

```tsx
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('./Map'), {
  loading: () => <p>Loading map...</p>,
  ssr: false, // クライアントでのみ読み込み
});

function Page() {
  return (
    <div>
      <h1>Location</h1>
      <DynamicMap />
    </div>
  );
}
```

## パフォーマンス最適化

### 1. Suspense境界の粒度

```tsx
// ❌ 粒度が粗い：1つでもエラーだと全体が失敗
<Suspense fallback={<BigSpinner />}>
  <ComponentA />
  <ComponentB />
  <ComponentC />
</Suspense>

// ✅ 適切な粒度：独立して読み込み・エラーハンドリング
<>
  <Suspense fallback={<SkeletonA />}>
    <ComponentA />
  </Suspense>
  <Suspense fallback={<SkeletonB />}>
    <ComponentB />
  </Suspense>
  <Suspense fallback={<SkeletonC />}>
    <ComponentC />
  </Suspense>
</>
```

### 2. キャッシュ戦略

```tsx
// SWRのキャッシュ
import useSWR from 'swr';

function useUserSuspense(userId: string) {
  const { data } = useSWR(
    ['user', userId],
    () => fetchUser(userId),
    {
      suspense: true,
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1分間はキャッシュ
    }
  );
  return data;
}
```

### 3. Prefetchingでウォーターフォール回避

```tsx
function UserPage({ userId }: { userId: string }) {
  // コンポーネント外でPromiseを作成
  const userPromise = useMemo(() => fetchUser(userId), [userId]);
  const postsPromise = useMemo(() => fetchPosts(userId), [userId]);

  return (
    <div>
      <Suspense fallback={<UserSkeleton />}>
        <UserProfile userPromise={userPromise} />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts postsPromise={postsPromise} />
      </Suspense>
    </div>
  );
}
```

## トラブルシューティング

### Suspenseループ

```tsx
// ❌ 無限ループ：毎回新しいPromiseを作成
function BadComponent() {
  const data = use(fetchData()); // 毎レンダリングで新しいPromise
  return <div>{data}</div>;
}

// ✅ 解決策：Promiseをメモ化
function GoodComponent() {
  const dataPromise = useMemo(() => fetchData(), []);
  const data = use(dataPromise);
  return <div>{data}</div>;
}

// ✅ または外部で作成
const dataPromise = fetchData();
function GoodComponent() {
  const data = use(dataPromise);
  return <div>{data}</div>;
}
```

### TypeScriptの型エラー

```tsx
// use()の型推論
function Component() {
  // 型が正しく推論される
  const user = use(fetchUser('123')); // user: User

  // 条件付きの場合
  const maybeUser = userId ? use(fetchUser(userId)) : null;
  // maybeUser: User | null
}
```

## まとめ

React Suspenseは、データフェッチングとUIの関係を根本から変える革新的な機能です。

**重要なポイント:**

1. **宣言的なコード** - ローディング状態を親で管理
2. **並行レンダリング** - 複数のデータを並列取得
3. **段階的な境界** - 重要度に応じて分割
4. **useTransition/useDeferredValue** - 緊急度の制御
5. **Streaming SSR** - サーバーサイドでの段階的レンダリング
6. **TanStack Query連携** - 実用的なデータ管理

React 19の`use`フックとSuspenseを組み合わせることで、クリーンで保守性の高いデータフェッチングコードを実現できます。2026年のReact開発において、Suspenseは必須の知識です。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
