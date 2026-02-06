---
title: "React Server Components深掘り — RSCの仕組みと設計パターン"
description: "React Server Components（RSC）のアーキテクチャ、シリアライゼーションの仕組み、Client Componentとの境界設計、データフェッチパターン、パフォーマンス最適化を詳しく解説します。"
pubDate: "2026-02-05"
tags: ["React", "Server Components", "Next.js", "パフォーマンス"]
---

## React Server Componentsとは

React Server Components（RSC）は、コンポーネントをサーバー側でレンダリングし、その結果をクライアントに送信する新しいReactのアーキテクチャです。

従来のSSR（Server-Side Rendering）と異なり、RSCはコンポーネント単位でサーバー/クライアントを選択でき、JavaScriptバンドルサイズを大幅に削減できます。

## SSRとRSCの違い

### 従来のSSR

```
1. サーバーでHTML生成
2. クライアントにHTMLを送信
3. JavaScriptバンドル全体をダウンロード
4. Hydration（再実行して状態を復元）
```

### RSC

```
1. サーバーでコンポーネントを実行
2. シリアライズされた結果をストリーミング
3. 必要なClient Componentのみをバンドル
4. 選択的Hydration
```

**重要な違い**: RSCのコードはクライアントに送信されないため、バンドルサイズが削減されます。

## RSCのシリアライゼーション

RSCは、コンポーネントツリーを特殊なJSONフォーマットでシリアライズします。

### シリアライズされるもの

```typescript
// Server Component
async function UserProfile({ userId }) {
  const user = await db.user.findUnique({ where: { userId } })

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

これは以下のようなフォーマットでクライアントに送信されます。

```json
[
  "div",
  null,
  ["h1", null, "John Doe"],
  ["p", null, "john@example.com"]
]
```

### シリアライズできないもの

- 関数（イベントハンドラを含む）
- クラスインスタンス
- Date、Map、Setなどの複雑なオブジェクト

これらが必要な場合は、Client Componentを使用します。

## Server ComponentとClient Componentの境界

### 基本ルール

```typescript
// app/page.tsx - Server Component（デフォルト）
import { ClientButton } from './client-button'

export default async function Page() {
  const data = await fetchData() // サーバー側で実行

  return (
    <div>
      <h1>Server Component</h1>
      <ClientButton data={data} />
    </div>
  )
}

// app/client-button.tsx - Client Component
'use client'

export function ClientButton({ data }) {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      {data.title}: {count}
    </button>
  )
}
```

### 重要な制約

#### Client Component内でServer Componentをimportできない

```typescript
'use client'

// これはエラー
import { ServerComponent } from './server-component'

export function ClientComponent() {
  return <ServerComponent />
}
```

#### childrenとして渡すことは可能

```typescript
// app/layout.tsx - Server Component
export default function Layout({ children }) {
  return (
    <html>
      <body>
        <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  )
}

// app/client-provider.tsx
'use client'

export function ClientProvider({ children }) {
  return <div className="provider">{children}</div>
}
```

## データフェッチパターン

### パターン1: Server Componentで直接フェッチ

```typescript
// app/posts/page.tsx
export default async function PostsPage() {
  const posts = await db.post.findMany()

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

**メリット**: シンプル、バンドルサイズ削減、SEO最適
**デメリット**: インタラクションには不向き

### パターン2: Server Componentからpropsで渡す

```typescript
// app/dashboard/page.tsx
export default async function Dashboard() {
  const [user, stats] = await Promise.all([
    fetchUser(),
    fetchStats(),
  ])

  return (
    <>
      <UserProfile user={user} />
      <StatsChart data={stats} />
    </>
  )
}

// components/stats-chart.tsx
'use client'

export function StatsChart({ data }) {
  return <Chart data={data} />
}
```

### パターン3: Server Actionsで変更

```typescript
// app/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title')
  const content = formData.get('content')

  await db.post.create({
    data: { title, content }
  })

  revalidatePath('/posts')
}

// app/posts/new/page.tsx
import { createPost } from '@/app/actions'

export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" />
      <textarea name="content" />
      <button type="submit">作成</button>
    </form>
  )
}
```

### パターン4: Streaming SSR

```typescript
import { Suspense } from 'react'

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>

      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>

      <Suspense fallback={<Skeleton />}>
        <AnotherSlowComponent />
      </Suspense>
    </div>
  )
}

async function SlowComponent() {
  const data = await slowFetch()
  return <div>{data}</div>
}
```

これにより、ページの一部を先に表示し、残りをストリーミングで送信できます。

## キャッシング戦略

### fetch APIのキャッシュ

```typescript
// デフォルトでキャッシュされる
const data = await fetch('https://api.example.com/data')

// キャッシュしない
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store'
})

// 60秒ごとに再検証
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 60 }
})
```

### React cacheを使った重複排除

```typescript
import { cache } from 'react'

// 同一レンダリング内で複数回呼ばれても1回だけ実行
const getUser = cache(async (id: string) => {
  return await db.user.findUnique({ where: { id } })
})

export async function UserProfile({ id }) {
  const user = await getUser(id)
  return <div>{user.name}</div>
}

export async function UserAvatar({ id }) {
  const user = await getUser(id)
  return <img src={user.avatar} />
}
```

### unstable_cacheでデータキャッシュ

```typescript
import { unstable_cache } from 'next/cache'

const getCachedPosts = unstable_cache(
  async () => db.post.findMany(),
  ['posts'],
  { revalidate: 3600 }
)

export async function PostsList() {
  const posts = await getCachedPosts()
  return <ul>{posts.map(/* ... */)}</ul>
}
```

## パフォーマンス最適化

### 1. コンポーネント分割

```typescript
// 悪い例: 全体がClient Component
'use client'

export default function Page() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <Header />
      <button onClick={() => setCount(count + 1)}>{count}</button>
      <Footer />
    </div>
  )
}

// 良い例: 必要な部分のみClient Component
export default function Page() {
  return (
    <div>
      <Header />
      <Counter />
      <Footer />
    </div>
  )
}
```

### 2. 並列データフェッチ

```typescript
// 直列フェッチ（遅い）
export default async function Page() {
  const user = await fetchUser()
  const posts = await fetchPosts()
  const comments = await fetchComments()
}

// 並列フェッチ（速い）
export default async function Page() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments(),
  ])
}
```

### 3. Suspenseの戦略的配置

```typescript
export default function Page() {
  return (
    <>
      <Header />

      <Suspense fallback={<MainSkeleton />}>
        <MainContent />
      </Suspense>

      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
    </>
  )
}
```

### 4. 動的インポート

```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./heavy-chart'), {
  loading: () => <p>Loading...</p>,
  ssr: false,
})

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart />
    </div>
  )
}
```

## 実践的な設計パターン

### パターン1: レイアウトとページの分離

```typescript
// app/layout.tsx - 共通レイアウト
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Navigation />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}

// app/dashboard/layout.tsx - ダッシュボード用レイアウト
export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser()

  return (
    <div className="dashboard">
      <Sidebar user={user} />
      <div className="content">{children}</div>
    </div>
  )
}
```

### パターン2: Server Actionsでの楽観的更新

```typescript
'use client'

import { useOptimistic } from 'react'
import { likePost } from './actions'

export function LikeButton({ postId, initialLikes }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    initialLikes,
    (state) => state + 1
  )

  return (
    <form action={async () => {
      addOptimisticLike()
      await likePost(postId)
    }}>
      <button type="submit">
        ❤️ {optimisticLikes}
      </button>
    </form>
  )
}
```

## まとめ

React Server Componentsは、以下の利点をもたらします。

- バンドルサイズの大幅削減
- サーバー側リソースへの直接アクセス
- 自動的なコード分割
- ストリーミングによる段階的レンダリング
- SEOとパフォーマンスの両立

ただし、Server ComponentとClient Componentの境界設計、データフェッチ戦略、キャッシング設計を適切に行う必要があります。

まずは小規模なページから試して、RSCの特性を理解してから本格的に導入することをお勧めします。Next.js App Routerを使えば、RSCを簡単に試すことができます。
