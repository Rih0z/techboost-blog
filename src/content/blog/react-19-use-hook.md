---
title: "React 19の`use`フック完全ガイド: Promiseとコンテキストの新しい扱い方"
description: "React 19で導入された革新的な`use`フックを徹底解説。Promiseの直接読み取り、条件付きコンテキスト使用など、従来のHooksルールを覆す新機能を実例とともに紹介します。React・React19・Hooksに関する実践情報。"
pubDate: "2025-02-05"
category: "Frontend"
tags: ["React", "React19", "Hooks", "TypeScript", "Frontend"]
---
React 19で導入された`use`フックは、従来のHooksの制約を覆す革新的な機能です。条件分岐やループの中で呼べる、Promiseを直接読み取れるなど、これまでのReactの常識を変える機能を持っています。本記事では、`use`フックの仕組みと実践的な使い方を詳しく解説します。

## `use`フックとは

`use`は、React 19で追加された新しいフックで、以下の特徴があります。

### 従来のHooksとの違い

**従来のHooksの制約**
```typescript
function Component({ condition }: { condition: boolean }) {
  // エラー: 条件分岐の中でHooksは使えない
  if (condition) {
    const value = useContext(MyContext) // NG
  }

  // エラー: ループの中でHooksは使えない
  for (let i = 0; i < 10; i++) {
    const value = useState(0) // NG
  }
}
```

**`use`の柔軟性**
```typescript
import { use } from 'react'

function Component({ condition }: { condition: boolean }) {
  // OK: 条件分岐の中で使える
  if (condition) {
    const value = use(MyContext) // OK
  }

  // OK: ループの中でも使える（ただし推奨されない）
  const values = []
  for (let i = 0; i < contexts.length; i++) {
    values.push(use(contexts[i])) // OK（特殊なケースのみ）
  }
}
```

## Promiseを読み取る

`use`の最も革新的な機能は、Promiseを直接読み取れることです。

### 基本的な使い方

```typescript
import { use, Suspense } from 'react'

// データフェッチ関数
async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`)
  if (!response.ok) throw new Error('Failed to fetch')
  return response.json()
}

// Promiseを受け取るコンポーネント
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  // Promiseを直接読み取る
  const user = use(userPromise)

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <p>{user.bio}</p>
    </div>
  )
}

// 親コンポーネント
function App({ userId }: { userId: string }) {
  // Promiseを作成
  const userPromise = fetchUser(userId)

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  )
}
```

### 従来の方法との比較

```typescript
// 従来の方法（useState + useEffect）
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!user) return null

  return <div>{user.name}</div>
}

// use フックを使った方法
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise)
  return <div>{user.name}</div>
}
```

### 複数のPromiseを並列で読み取る

```typescript
function Dashboard({
  userPromise,
  postsPromise,
  statsPromise,
}: {
  userPromise: Promise<User>
  postsPromise: Promise<Post[]>
  statsPromise: Promise<Stats>
}) {
  // 並列で読み取る
  const user = use(userPromise)
  const posts = use(postsPromise)
  const stats = use(statsPromise)

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <Stats data={stats} />
      <PostList posts={posts} />
    </div>
  )
}

function App() {
  // 並列でフェッチ開始
  const userPromise = fetchUser('123')
  const postsPromise = fetchPosts('123')
  const statsPromise = fetchStats('123')

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard
        userPromise={userPromise}
        postsPromise={postsPromise}
        statsPromise={statsPromise}
      />
    </Suspense>
  )
}
```

### エラーハンドリング

```typescript
import { use, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  // Promiseがrejectされると、エラーがスローされる
  const user = use(userPromise)

  return <div>{user.name}</div>
}

function App({ userId }: { userId: string }) {
  const userPromise = fetchUser(userId)

  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <div>Error: {error.message}</div>
      )}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <UserProfile userPromise={userPromise} />
      </Suspense>
    </ErrorBoundary>
  )
}
```

## コンテキストを条件付きで読み取る

### 基本例

```typescript
import { use, createContext } from 'react'

const ThemeContext = createContext<'light' | 'dark'>('light')

function Button({ primary }: { primary?: boolean }) {
  // 条件付きでコンテキストを読み取る
  const theme = primary ? use(ThemeContext) : 'light'

  return (
    <button className={`btn btn-${theme}`}>
      Click me
    </button>
  )
}
```

### 実践的な例: 認証状態

```typescript
const AuthContext = createContext<{ user: User | null }>({ user: null })

function Avatar({ showName = false }: { showName?: boolean }) {
  // showName が true の時だけ認証情報を取得
  const auth = showName ? use(AuthContext) : null

  return (
    <div className="avatar">
      <img src="/avatar.png" alt="Avatar" />
      {showName && auth?.user && <span>{auth.user.name}</span>}
    </div>
  )
}
```

### 複数コンテキストの動的選択

```typescript
const LightTheme = createContext({ bg: 'white', text: 'black' })
const DarkTheme = createContext({ bg: 'black', text: 'white' })

function ThemedText({ isDark }: { isDark: boolean }) {
  // 動的にコンテキストを選択
  const theme = use(isDark ? DarkTheme : LightTheme)

  return (
    <p style={{ background: theme.bg, color: theme.text }}>
      Themed text
    </p>
  )
}
```

## 実践パターン

### パターン1: データフェッチライブラリとの統合

```typescript
// lib/fetcher.ts
export function createResource<T>(promise: Promise<T>) {
  let status: 'pending' | 'success' | 'error' = 'pending'
  let result: T
  let error: Error

  const suspender = promise.then(
    (data) => {
      status = 'success'
      result = data
    },
    (err) => {
      status = 'error'
      error = err
    }
  )

  return {
    read(): T {
      if (status === 'pending') throw suspender
      if (status === 'error') throw error
      return result
    },
  }
}

// 使用例
function UserProfile({ userId }: { userId: string }) {
  const userResource = createResource(fetchUser(userId))
  const user = userResource.read() // Suspense連携

  return <div>{user.name}</div>
}
```

### パターン2: 条件付きデータフェッチ

```typescript
function PostWithComments({
  postId,
  showComments,
}: {
  postId: string
  showComments: boolean
}) {
  const postPromise = fetchPost(postId)
  const post = use(postPromise)

  // showComments が true の時だけコメントを取得
  const commentsPromise = showComments ? fetchComments(postId) : null
  const comments = commentsPromise ? use(commentsPromise) : []

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>

      {showComments && (
        <section>
          <h2>Comments</h2>
          {comments.map(comment => (
            <Comment key={comment.id} comment={comment} />
          ))}
        </section>
      )}
    </article>
  )
}
```

### パターン3: ネストされたSuspense

```typescript
function UserDashboard({ userId }: { userId: string }) {
  const userPromise = fetchUser(userId)

  return (
    <div>
      {/* ユーザー情報は早く表示 */}
      <Suspense fallback={<UserSkeleton />}>
        <UserInfo userPromise={userPromise} />
      </Suspense>

      {/* 投稿リストは独立して読み込み */}
      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts userId={userId} />
      </Suspense>

      {/* 統計情報も独立して読み込み */}
      <Suspense fallback={<StatsSkeleton />}>
        <UserStats userId={userId} />
      </Suspense>
    </div>
  )
}

function UserInfo({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise)
  return <h1>{user.name}</h1>
}

function UserPosts({ userId }: { userId: string }) {
  const posts = use(fetchPosts(userId))
  return (
    <ul>
      {posts.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  )
}
```

### パターン4: キャッシュとの統合

```typescript
// キャッシュ付きフェッチ
const cache = new Map<string, Promise<any>>()

function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (cache.has(key)) {
    return cache.get(key)!
  }

  const promise = fetcher()
  cache.set(key, promise)

  // エラー時はキャッシュから削除
  promise.catch(() => cache.delete(key))

  return promise
}

// 使用例
function UserProfile({ userId }: { userId: string }) {
  const userPromise = cachedFetch(`user-${userId}`, () => fetchUser(userId))
  const user = use(userPromise)

  return <div>{user.name}</div>
}
```

## TypeScript型定義

```typescript
// use フックの型定義（参考）
function use<T>(promise: Promise<T>): T
function use<T>(context: Context<T>): T

// 実際の使用例
import { use, Context } from 'react'

type User = {
  id: string
  name: string
  email: string
}

const UserContext: Context<User | null> = createContext<User | null>(null)

function Component({ userPromise }: { userPromise: Promise<User> }) {
  // 型推論が効く
  const user = use(userPromise) // User型
  const contextUser = use(UserContext) // User | null型

  return <div>{user.name}</div>
}
```

## パフォーマンス最適化

### Promise の再生成を防ぐ

```typescript
import { use, useMemo } from 'react'

function UserProfile({ userId }: { userId: string }) {
  // userIdが変わらない限り、同じPromiseを使う
  const userPromise = useMemo(
    () => fetchUser(userId),
    [userId]
  )

  const user = use(userPromise)

  return <div>{user.name}</div>
}
```

### React Cache API（実験的）

```typescript
import { cache } from 'react'

// 同一レンダリング内でキャッシュされる
const getUser = cache(async (id: string) => {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
})

function UserProfile({ userId }: { userId: string }) {
  const user = use(getUser(userId))
  return <div>{user.name}</div>
}

function UserAvatar({ userId }: { userId: string }) {
  // 同じIDなら同じPromiseが返される（重複リクエストなし）
  const user = use(getUser(userId))
  return <img src={user.avatar} alt={user.name} />
}
```

## 注意点とベストプラクティス

### 1. Promiseは安定した参照を渡す

```typescript
// 悪い例: 毎回新しいPromiseが作られる
function BadExample({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* 毎レンダリングで新しいPromiseが作られる */}
      <UserProfile userPromise={fetchUser(userId)} />
    </Suspense>
  )
}

// 良い例: useMemoで安定化
function GoodExample({ userId }: { userId: string }) {
  const userPromise = useMemo(() => fetchUser(userId), [userId])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  )
}
```

### 2. エラーバウンダリを適切に配置

```typescript
function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<Loading />}>
        <DataComponent />
      </Suspense>
    </ErrorBoundary>
  )
}
```

### 3. ローディング状態の粒度を調整

```typescript
// 細かい粒度
function FinePage() {
  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        <Content />
      </Suspense>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
    </>
  )
}

// 粗い粒度（すべて揃うまで待つ）
function CoarsePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Header />
      <Content />
      <Sidebar />
    </Suspense>
  )
}
```

## まとめ

`use`フックは、React 19の中でも特に革新的な機能です。

**主な利点**
- Promiseを直接読み取れる（async/awaitライクな体験）
- 条件分岐やループで使える柔軟性
- Suspenseとの自然な統合
- ボイラープレートの削減

**適用場面**
- データフェッチが多いアプリケーション
- Server Componentsとの連携
- 段階的なローディング体験の実装

**注意点**
- Promise参照の安定性に注意
- ErrorBoundaryとSuspenseを適切に配置
- 既存のuseEffectパターンと使い分ける

2026年現在、`use`フックはReactの非同期処理の新しいスタンダードとなりつつあります。従来の`useEffect`ベースのパターンと併用しながら、段階的に導入していくことをお勧めします。

**参考リンク**
- [React 19 Documentation - use](https://react.dev/reference/react/use)
- [RFC: First class support for promises](https://github.com/reactjs/rfcs/pull/229)
