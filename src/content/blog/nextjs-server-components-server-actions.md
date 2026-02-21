---
title: 'Next.js Server ComponentsとServer Actions完全ガイド -- React開発の新パラダイムを実装で理解する'
description: 'Next.js App RouterにおけるServer ComponentsとServer Actionsの仕組みを体系的に解説。Client Componentsとの使い分け、データ取得パターン、フォーム処理、キャッシュ戦略まで、実装コード付きで実践的に学べる。'
pubDate: '2026-02-21'
---

Next.jsのApp Routerが安定版となって以降、React Server Components（RSC）とServer Actionsは、フロントエンド開発における標準的なアーキテクチャとして定着した。しかし、従来のPages Routerとは根本的にメンタルモデルが異なるため、移行に苦戦する開発者は少なくない。

本記事では、Server ComponentsとServer Actionsの仕組みを基礎から解説し、実装パターン、パフォーマンス最適化、本番運用における設計指針までを網羅する。

## Server Componentsとは何か

Server Componentsは、サーバー側でのみレンダリングされるReactコンポーネントである。ブラウザにJavaScriptバンドルを送信しないため、バンドルサイズの削減とパフォーマンスの向上が得られる。

### 従来のSSRとの違い

Server ComponentsとSSR（Server-Side Rendering）は混同されやすいが、根本的に異なる技術である。

| 観点 | 従来のSSR | Server Components |
|------|----------|-------------------|
| レンダリング | サーバーでHTMLを生成し、クライアントでハイドレーション | サーバーでReactツリーをシリアライズして送信 |
| JavaScript | ハイドレーション用にコンポーネントのJSを送信 | クライアントにJSを送信しない |
| インタラクティビティ | ハイドレーション後に対話可能 | 対話的な処理にはClient Componentが必要 |
| データ取得 | getServerSidePropsで事前取得 | コンポーネント内でasync/awaitで直接取得 |
| 再レンダリング | クライアントで再レンダリング | サーバーで再実行し、差分のみ送信 |

SSRは「サーバーでHTMLを作り、クライアントでJavaScriptを再実行する」のに対し、Server Componentsは「サーバーでのみ実行され、結果だけをクライアントに送る」。この違いにより、不要なJavaScriptの送信を根本的に排除できる。

### デフォルトの挙動

App Routerでは、全てのコンポーネントがデフォルトでServer Componentになる。この設計判断は重要で、開発者は「必要な場合にのみClient Componentに切り替える」というアプローチを取る。

```tsx
// app/page.tsx
// デフォルトでServer Component -- "use client" 宣言なし
export default async function Page() {
  // サーバー側でデータを直接取得できる
  const posts = await fetch('https://api.example.com/posts', {
    cache: 'force-cache',
  }).then(res => res.json())

  return (
    <main>
      <h1>記事一覧</h1>
      <ul>
        {posts.map((post: { id: string; title: string }) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </main>
  )
}
```

このコンポーネントはサーバーでのみ実行されるため、`fetch`のレスポンスや処理ロジックはクライアントに一切漏れない。APIキーやデータベース接続情報をコンポーネント内で安全に扱える。

## Client Componentsとの使い分け

Server ComponentsとClient Componentsの使い分けは、App Router開発における最も重要な設計判断である。

### Client Componentが必要なケース

以下の機能を使う場合は `"use client"` ディレクティブが必要になる。

- **状態管理**: `useState`, `useReducer`
- **副作用**: `useEffect`, `useLayoutEffect`
- **イベントハンドラ**: `onClick`, `onChange` などのブラウザイベント
- **ブラウザAPI**: `window`, `document`, `localStorage`
- **カスタムフック**: 上記を内部で使用するフック

```tsx
'use client'

import { useState } from 'react'

export function SearchBar() {
  const [query, setQuery] = useState('')

  return (
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="記事を検索..."
    />
  )
}
```

### 設計原則: 境界を下に押し下げる

Client Componentの境界は、コンポーネントツリーのできるだけ下層に設定する。これにより、Server Componentで処理できる範囲を最大化し、バンドルサイズを最小限に抑えられる。

```tsx
// app/dashboard/page.tsx -- Server Component
import { getAnalytics } from '@/lib/analytics'
import { InteractiveChart } from './interactive-chart'
import { DateRangePicker } from './date-range-picker'

export default async function DashboardPage() {
  // サーバーでデータ取得（JSがクライアントに送られない）
  const data = await getAnalytics()

  return (
    <div>
      <h1>ダッシュボード</h1>

      {/* 静的な要約セクション -- Server Component */}
      <section>
        <h2>概要</h2>
        <p>総PV: {data.totalPageViews.toLocaleString()}</p>
        <p>ユニークユーザー: {data.uniqueUsers.toLocaleString()}</p>
        <p>平均セッション時間: {data.avgSessionDuration}秒</p>
      </section>

      {/* インタラクティブな部分のみClient Component */}
      <DateRangePicker />
      <InteractiveChart initialData={data.chartData} />
    </div>
  )
}
```

```tsx
// app/dashboard/interactive-chart.tsx -- Client Component
'use client'

import { useState } from 'react'

type ChartData = {
  label: string
  value: number
}

export function InteractiveChart({ initialData }: { initialData: ChartData[] }) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

  return (
    <div>
      <div>
        <button onClick={() => setChartType('bar')}>棒グラフ</button>
        <button onClick={() => setChartType('line')}>折れ線グラフ</button>
      </div>
      {/* chartType に応じたレンダリング */}
      <div>
        {initialData.map((d) => (
          <div key={d.label}>
            {d.label}: {'#'.repeat(Math.round(d.value / 10))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

この設計では、ダッシュボードのデータ取得と要約表示はServer Componentで処理され、チャートのインタラクションのみがClient Componentとしてブラウザに送信される。

### コンポジションパターン

Server ComponentをClient Componentの子として渡す場合、`children`プロパティを使うことで、Server Componentの利点を維持できる。

```tsx
// app/layout.tsx -- Server Component
import { AuthProvider } from './auth-provider'
import { getUser } from '@/lib/auth'

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  return (
    <AuthProvider initialUser={user}>
      {children}
    </AuthProvider>
  )
}
```

```tsx
// app/auth-provider.tsx -- Client Component
'use client'

import { createContext, useContext } from 'react'

type User = { id: string; name: string; email: string }

const AuthContext = createContext<User | null>(null)

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: User | null
  children: React.ReactNode
}) {
  return (
    <AuthContext.Provider value={initialUser}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

この場合、`children`として渡されるServer Componentはサーバーで事前にレンダリングされるため、Client Componentのバンドルに含まれない。

## Server Actions -- サーバー側ミューテーションの新標準

Server Actionsは、サーバー側で実行される非同期関数をクライアントから直接呼び出せる仕組みである。API Routeを手動で作成する必要がなくなり、フォーム処理やデータ変更のコードが大幅に簡潔になる。

### 基本構文

Server Actionsは `"use server"` ディレクティブで定義する。

```tsx
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  // バリデーション
  if (!title || title.length < 3) {
    return { error: 'タイトルは3文字以上で入力してください' }
  }

  if (!content || content.length < 10) {
    return { error: '本文は10文字以上で入力してください' }
  }

  // データベースに保存
  const post = await db.post.create({
    data: { title, content },
  })

  // キャッシュを再検証
  revalidatePath('/posts')

  // リダイレクト
  redirect(`/posts/${post.id}`)
}
```

### フォームとの統合

Server Actionsは `<form>` の `action` プロパティに直接渡せる。これはProgressively Enhancedな設計で、JavaScriptが無効な環境でも動作する。

```tsx
// app/posts/new/page.tsx -- Server Component
import { createPost } from '@/app/actions'

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <div>
        <label htmlFor="title">タイトル</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={3}
        />
      </div>
      <div>
        <label htmlFor="content">本文</label>
        <textarea
          id="content"
          name="content"
          required
          minLength={10}
          rows={10}
        />
      </div>
      <button type="submit">投稿する</button>
    </form>
  )
}
```

このフォームはServer Componentで定義されているため、フォームのHTML自体のためのJavaScriptはクライアントに送信されない。送信時にServer Actionが自動的にサーバーで実行される。

### useActionStateによるフォーム状態管理

エラー表示やローディング状態を管理する場合は、`useActionState`フックを使う。

```tsx
'use client'

import { useActionState } from 'react'
import { createPost } from '@/app/actions'

type FormState = {
  error?: string
  success?: boolean
}

export function PostForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prevState, formData) => {
      const result = await createPost(formData)
      if (result?.error) {
        return { error: result.error }
      }
      return { success: true }
    },
    { error: undefined, success: false }
  )

  return (
    <form action={formAction}>
      {state.error && (
        <div role="alert" style={{ color: 'red' }}>
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="title">タイトル</label>
        <input id="title" name="title" type="text" required />
      </div>

      <div>
        <label htmlFor="content">本文</label>
        <textarea id="content" name="content" required rows={10} />
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? '送信中...' : '投稿する'}
      </button>
    </form>
  )
}
```

### 楽観的更新（Optimistic Updates）

`useOptimistic`フックを組み合わせることで、Server Actionの完了を待たずにUIを即座に更新できる。

```tsx
'use client'

import { useOptimistic } from 'react'
import { toggleLike } from '@/app/actions'

type Post = {
  id: string
  title: string
  likes: number
  isLiked: boolean
}

export function LikeButton({ post }: { post: Post }) {
  const [optimisticPost, setOptimisticPost] = useOptimistic(
    post,
    (current, _action: void) => ({
      ...current,
      likes: current.isLiked ? current.likes - 1 : current.likes + 1,
      isLiked: !current.isLiked,
    })
  )

  return (
    <form
      action={async () => {
        setOptimisticPost()
        await toggleLike(post.id)
      }}
    >
      <button type="submit">
        {optimisticPost.isLiked ? '&#9829;' : '&#9825;'} {optimisticPost.likes}
      </button>
    </form>
  )
}
```

## データ取得パターン

Server Componentsでのデータ取得は、従来の `getServerSideProps` / `getStaticProps` とは根本的に異なる。コンポーネント内で直接 `async/await` を使える。

### 並列データ取得

複数のデータソースからの取得は、`Promise.all`で並列化する。

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react'

async function getUsers() {
  const res = await fetch('https://api.example.com/users', {
    next: { revalidate: 60 },
  })
  return res.json()
}

async function getRevenue() {
  const res = await fetch('https://api.example.com/revenue', {
    next: { revalidate: 300 },
  })
  return res.json()
}

export default async function DashboardPage() {
  // 並列で取得（ウォーターフォールを避ける）
  const [users, revenue] = await Promise.all([
    getUsers(),
    getRevenue(),
  ])

  return (
    <div>
      <h1>ダッシュボード</h1>
      <p>登録ユーザー数: {users.total}</p>
      <p>月間売上: {revenue.monthly.toLocaleString()}円</p>
    </div>
  )
}
```

### Suspenseによるストリーミング

重い処理を含むコンポーネントを `Suspense` で囲むことで、ページの一部を先に表示し、残りをストリーミングで後から送信できる。

```tsx
// app/posts/[id]/page.tsx
import { Suspense } from 'react'
import { getPost } from '@/lib/posts'

async function Comments({ postId }: { postId: string }) {
  // 重いクエリ -- 別途ストリーミングで送信
  const comments = await fetch(
    `https://api.example.com/posts/${postId}/comments`
  ).then(res => res.json())

  return (
    <section>
      <h2>コメント ({comments.length}件)</h2>
      <ul>
        {comments.map((c: { id: string; author: string; body: string }) => (
          <li key={c.id}>
            <strong>{c.author}</strong>: {c.body}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getPost(id)

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>

      {/* コメントはストリーミングで後から表示 */}
      <Suspense fallback={<p>コメントを読み込み中...</p>}>
        <Comments postId={id} />
      </Suspense>
    </article>
  )
}
```

この設計では、記事本文は即座に表示され、コメントは取得完了後に自動的に挿入される。ユーザーは記事を読み始めることができ、体感速度が大幅に向上する。

## キャッシュ戦略

Next.jsのキャッシュシステムは多層構造であり、適切な理解が本番運用で重要になる。

### キャッシュの4つのレイヤー

| レイヤー | 場所 | 目的 | 無効化方法 |
|---------|------|------|-----------|
| Request Memoization | サーバー（リクエスト単位） | 同一リクエスト内の重複fetch排除 | 自動（リクエスト終了時） |
| Data Cache | サーバー（永続） | fetchレスポンスのキャッシュ | `revalidatePath` / `revalidateTag` |
| Full Route Cache | サーバー（永続） | レンダリング済みHTMLとRSCペイロード | `revalidatePath` / 動的関数使用 |
| Router Cache | クライアント（セッション） | RSCペイロードのクライアント側キャッシュ | `router.refresh()` / 自動期限切れ |

### 実践的なキャッシュ設定

```tsx
// 1. 静的データ（ビルド時に取得、変更まで永続）
const staticData = await fetch('https://api.example.com/config', {
  cache: 'force-cache', // デフォルト
})

// 2. 時間ベースの再検証（ISR相当）
const revalidatedData = await fetch('https://api.example.com/posts', {
  next: { revalidate: 60 }, // 60秒ごとに再検証
})

// 3. 動的データ（毎リクエスト取得）
const dynamicData = await fetch('https://api.example.com/user/profile', {
  cache: 'no-store',
})

// 4. タグベースの再検証
const taggedData = await fetch('https://api.example.com/products', {
  next: { tags: ['products'] },
})
```

タグベースの再検証は、Server Actionからの無効化と組み合わせることで強力な制御が可能になる。

```tsx
'use server'

import { revalidateTag } from 'next/cache'

export async function updateProduct(id: string, data: FormData) {
  await db.product.update({
    where: { id },
    data: { name: data.get('name') as string },
  })

  // 'products'タグが付いた全キャッシュを無効化
  revalidateTag('products')
}
```

## エラーハンドリング

App Routerでは、`error.tsx`ファイルでルートレベルのエラーバウンダリを定義する。

```tsx
// app/posts/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div role="alert">
      <h2>エラーが発生しました</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()}>再試行</button>
    </div>
  )
}
```

`error.tsx`はClient Componentである必要がある（`reset`のインタラクションが必要なため）。ディレクトリ階層に配置することで、エラーの影響範囲を制御できる。

```
app/
├── error.tsx          # アプリ全体のフォールバック
├── posts/
│   ├── error.tsx      # 記事関連のエラー
│   ├── page.tsx
│   └── [id]/
│       ├── error.tsx  # 個別記事のエラー
│       └── page.tsx
```

## 本番運用の設計指針

### 1. セキュリティ

Server Actionsは外部から呼び出し可能なHTTPエンドポイントとして公開される。認証・認可の検証を必ず行う。

```tsx
'use server'

import { auth } from '@/lib/auth'

export async function deletePost(postId: string) {
  const session = await auth()

  if (!session?.user) {
    throw new Error('認証が必要です')
  }

  const post = await db.post.findUnique({ where: { id: postId } })

  if (post?.authorId !== session.user.id) {
    throw new Error('この操作を実行する権限がありません')
  }

  await db.post.delete({ where: { id: postId } })
  revalidatePath('/posts')
}
```

### 2. 入力バリデーション

Server Actionsの引数は常にバリデーションする。zodなどのスキーマバリデーションライブラリの活用が推奨される。

```tsx
'use server'

import { z } from 'zod'

const CreatePostSchema = z.object({
  title: z.string().min(3, 'タイトルは3文字以上').max(100, 'タイトルは100文字以内'),
  content: z.string().min(10, '本文は10文字以上'),
  category: z.enum(['tech', 'design', 'business']),
})

export async function createPost(formData: FormData) {
  const parsed = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    category: formData.get('category'),
  })

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  // バリデーション済みデータで安全に処理
  await db.post.create({ data: parsed.data })
  revalidatePath('/posts')
}
```

### 3. パフォーマンス計測

Server Componentsのレンダリング時間は、標準のNode.jsプロファイリングツールで計測できる。

```tsx
// lib/performance.ts
export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now()
    return fn().then((result) => {
      const duration = performance.now() - start
      console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`)
      return result
    })
  }
  return fn()
}

// 使用例
export default async function Page() {
  const posts = await measureAsync('fetch-posts', () =>
    fetch('https://api.example.com/posts').then(res => res.json())
  )

  return <PostList posts={posts} />
}
```

## Pages Routerからの移行戦略

既存のPages Routerプロジェクトからの移行は、段階的に進めることが推奨される。

### 移行の優先順位

1. **レイアウト**: `_app.tsx` / `_document.tsx` → `app/layout.tsx`
2. **静的ページ**: `getStaticProps` を使用するページ → Server Component
3. **動的ページ**: `getServerSideProps` を使用するページ → Server Component + `cache: 'no-store'`
4. **APIルート**: `pages/api/` → Server Actions または `app/api/route.ts`
5. **インタラクティブ機能**: 状態管理を使用するコンポーネント → Client Component

### 具体的な移行例

**移行前（Pages Router）:**

```tsx
// pages/posts/index.tsx
import { GetServerSideProps } from 'next'

type Post = { id: string; title: string }

export const getServerSideProps: GetServerSideProps = async () => {
  const res = await fetch('https://api.example.com/posts')
  const posts = await res.json()
  return { props: { posts } }
}

export default function PostsPage({ posts }: { posts: Post[] }) {
  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

**移行後（App Router）:**

```tsx
// app/posts/page.tsx
type Post = { id: string; title: string }

export default async function PostsPage() {
  const posts: Post[] = await fetch('https://api.example.com/posts', {
    cache: 'no-store',
  }).then(res => res.json())

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

コード量が減少し、データ取得とレンダリングが同じファイル内で完結する。`getServerSideProps`のボイラープレートが不要になり、TypeScriptの型推論もシンプルになる。

## まとめ

Server ComponentsとServer Actionsは、React開発の根本的なパラダイムシフトである。従来の「全てをクライアントで処理する」モデルから、「サーバーとクライアントの最適な分担」へと移行することで、パフォーマンスと開発者体験の両方が向上する。

**本記事の要点:**

- Server Componentsはデフォルトで有効。Client Componentは必要な場合のみ`"use client"`で明示する
- Server Actionsにより、API Route不要でサーバー側のデータ変更が可能になる
- Suspenseを活用したストリーミングで、ユーザー体感速度を大幅に改善できる
- キャッシュは4層構造。タグベースの再検証が本番運用で有効
- セキュリティとバリデーションは全てのServer Actionで必須
- Pages Routerからの移行は段階的に進めることが推奨される

今後、Server Componentsのエコシステムはさらに成熟し、データベース直接接続やリアルタイム更新などのパターンが標準化されていくと予想される。この新しいパラダイムを早期に習得することで、高品質なWebアプリケーションの開発効率を大幅に高めることができる。
