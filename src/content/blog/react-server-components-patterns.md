---
title: "React Server Componentsデザインパターン集 - 実践的な使い分け"
description: "React Server Components（RSC）の実践的なデザインパターンを徹底解説。サーバーコンポーネントとクライアントコンポーネントの使い分け、データフェッチ戦略、パフォーマンス最適化まで実例とともに紹介します。"
pubDate: "2025-02-06"
tags: ["React", "Server Components", "Next.js", "パフォーマンス", "デザインパターン"]
---

# React Server Componentsデザインパターン集 - 実践的な使い分け

React Server Components（RSC）は、Reactアプリケーションのアーキテクチャを根本から変える革新的な機能です。サーバーサイドでコンポーネントをレンダリングすることで、クライアント側のJavaScriptバンドルサイズを削減し、パフォーマンスを大幅に向上させます。

しかし、Server ComponentsとClient Componentsをどのように使い分けるべきか、どのようなデザインパターンが有効なのか、実践的なノウハウはまだ広まっていません。

本記事では、React Server Componentsの実践的なデザインパターンを、具体的なコード例とともに徹底解説します。

## React Server Componentsの基本

### Server Componentsの特徴

```typescript
// app/page.tsx（Server Component）
// デフォルトでServer Component
export default async function HomePage() {
  // サーバーサイドでのみ実行
  const data = await fetch('https://api.example.com/data').then(r => r.json())

  return (
    <div>
      <h1>Server Component</h1>
      <p>Data: {data.message}</p>
    </div>
  )
}
```

Server Componentsの利点

- **バンドルサイズ削減**: サーバーでレンダリングされ、クライアントに送信されない
- **直接データアクセス**: データベースやファイルシステムに直接アクセス可能
- **セキュリティ**: APIキーやシークレットをクライアントに公開しない
- **SEO最適化**: サーバーサイドレンダリングで検索エンジンに最適

### Client Componentsの特徴

```typescript
// app/components/Counter.tsx（Client Component）
'use client' // Client Componentの明示

import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  )
}
```

Client Componentsが必要な場合

- **インタラクティビティ**: `useState`, `useEffect`, イベントハンドラ
- **ブラウザAPI**: `window`, `document`, `localStorage`
- **カスタムフック**: React Hooksを使用
- **サードパーティライブラリ**: クライアント側でのみ動作するライブラリ

### Server/Client境界の理解

```typescript
// app/page.tsx (Server Component)
import { ClientButton } from './ClientButton'
import { ServerData } from './ServerData'

export default async function Page() {
  const data = await fetchData()

  return (
    <div>
      {/* Server Component */}
      <ServerData data={data} />

      {/* Client Component */}
      <ClientButton />
    </div>
  )
}
```

重要なルール

1. Server Componentから Client Componentをインポート可能
2. Client ComponentからServer Componentを直接インポート不可
3. Client Componentに Server Componentを`children`として渡すことは可能

## デザインパターン1: コンポーネント構成の最適化

### パターン1-1: Leaf Componentsのみをクライアント化

```typescript
// ❌ 悪い例: 親コンポーネント全体をクライアント化
'use client'

import { useState } from 'react'

export function ProductPage({ product }) {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <ProductImages images={product.images} />
      <ProductReviews reviews={product.reviews} />
      <AddToCartButton count={count} setCount={setCount} />
    </div>
  )
}
```

```typescript
// ✅ 良い例: 必要な部分のみクライアント化
// app/products/[id]/page.tsx (Server Component)
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await fetchProduct(params.id)

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <ProductImages images={product.images} />
      <ProductReviews reviews={product.reviews} />
      <AddToCartButton productId={product.id} />
    </div>
  )
}

// components/AddToCartButton.tsx (Client Component)
'use client'

import { useState } from 'react'

export function AddToCartButton({ productId }: { productId: string }) {
  const [count, setCount] = useState(1)

  return (
    <div>
      <button onClick={() => setCount(count - 1)}>-</button>
      <span>{count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => addToCart(productId, count)}>Add to Cart</button>
    </div>
  )
}
```

### パターン1-2: Composition Patternの活用

```typescript
// app/layout.tsx (Server Component)
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ClientLayout } from './ClientLayout'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {/* Server Components */}
        <Header />

        <ClientLayout>
          {/* Server Componentをchildrenとして渡す */}
          {children}
        </ClientLayout>

        {/* Server Components */}
        <Sidebar />
      </body>
    </html>
  )
}

// ClientLayout.tsx (Client Component)
'use client'

import { useState } from 'react'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={sidebarOpen ? 'sidebar-open' : ''}>
      <button onClick={() => setSidebarOpen(!sidebarOpen)}>
        Toggle Sidebar
      </button>
      <main>{children}</main>
    </div>
  )
}
```

### パターン1-3: Context Providerの分離

```typescript
// app/providers.tsx (Client Component)
'use client'

import { ThemeProvider } from './ThemeProvider'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}

// app/layout.tsx (Server Component)
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

## デザインパターン2: データフェッチ戦略

### パターン2-1: 並列データフェッチ

```typescript
// app/dashboard/page.tsx
async function getUser() {
  const res = await fetch('https://api.example.com/user')
  return res.json()
}

async function getPosts() {
  const res = await fetch('https://api.example.com/posts')
  return res.json()
}

async function getStats() {
  const res = await fetch('https://api.example.com/stats')
  return res.json()
}

// ❌ 悪い例: 直列フェッチ（遅い）
export default async function Dashboard() {
  const user = await getUser()
  const posts = await getPosts()
  const stats = await getStats()

  return (
    <div>
      <UserProfile user={user} />
      <PostList posts={posts} />
      <StatsPanel stats={stats} />
    </div>
  )
}

// ✅ 良い例: 並列フェッチ（速い）
export default async function Dashboard() {
  const [user, posts, stats] = await Promise.all([
    getUser(),
    getPosts(),
    getStats(),
  ])

  return (
    <div>
      <UserProfile user={user} />
      <PostList posts={posts} />
      <StatsPanel stats={stats} />
    </div>
  )
}
```

### パターン2-2: Streaming with Suspense

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react'

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* 即座に表示 */}
      <Suspense fallback={<UserSkeleton />}>
        <UserProfile />
      </Suspense>

      {/* 非同期で読み込み */}
      <Suspense fallback={<PostsSkeleton />}>
        <PostList />
      </Suspense>

      {/* 非同期で読み込み */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsPanel />
      </Suspense>
    </div>
  )
}

// コンポーネントは個別にデータフェッチ
async function UserProfile() {
  const user = await getUser()
  return <div>{user.name}</div>
}

async function PostList() {
  const posts = await getPosts()
  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}

async function StatsPanel() {
  const stats = await getStats()
  return <div>Total: {stats.total}</div>
}
```

### パターン2-3: プリフェッチとキャッシング

```typescript
// lib/data.ts
import { cache } from 'react'

// React cacheを使用してリクエスト間でキャッシュ
export const getUser = cache(async (userId: string) => {
  const res = await fetch(`https://api.example.com/users/${userId}`, {
    // Next.jsのキャッシング設定
    next: {
      revalidate: 3600, // 1時間キャッシュ
      tags: ['user', userId],
    },
  })
  return res.json()
})

// app/users/[id]/page.tsx
export default async function UserPage({ params }: { params: { id: string } }) {
  // キャッシュされたデータを取得
  const user = await getUser(params.id)

  return (
    <div>
      <h1>{user.name}</h1>
      <UserPosts userId={params.id} />
    </div>
  )
}

// components/UserPosts.tsx
async function UserPosts({ userId }: { userId: string }) {
  // 同じユーザーデータを再利用（重複リクエストなし）
  const user = await getUser(userId)
  const posts = await getUserPosts(userId)

  return (
    <div>
      <h2>Posts by {user.name}</h2>
      <ul>
        {posts.map(post => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

### パターン2-4: データミューテーション（Server Actions）

```typescript
// app/actions.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  // データベースに保存
  await db.insert(posts).values({ title, content })

  // キャッシュを再検証
  revalidatePath('/posts')
  revalidateTag('posts')

  return { success: true }
}

export async function updatePost(postId: string, formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  await db.update(posts).set({ title, content }).where(eq(posts.id, postId))

  // 特定のパスのキャッシュを無効化
  revalidatePath(`/posts/${postId}`)

  return { success: true }
}

export async function deletePost(postId: string) {
  await db.delete(posts).where(eq(posts.id, postId))

  revalidatePath('/posts')

  return { success: true }
}
```

```typescript
// app/posts/new/page.tsx
import { createPost } from '@/app/actions'

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit">Create Post</button>
    </form>
  )
}

// components/DeleteButton.tsx (Client Component)
'use client'

import { deletePost } from '@/app/actions'
import { useTransition } from 'react'

export function DeleteButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (confirm('Are you sure?')) {
      startTransition(async () => {
        await deletePost(postId)
      })
    }
  }

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  )
}
```

## デザインパターン3: 状態管理

### パターン3-1: URLパラメータによる状態管理

```typescript
// app/products/page.tsx (Server Component)
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string; sort?: string }
}) {
  const page = parseInt(searchParams.page || '1')
  const category = searchParams.category
  const sort = searchParams.sort || 'newest'

  const products = await getProducts({ page, category, sort })

  return (
    <div>
      <ProductFilters />
      <ProductList products={products} />
      <Pagination currentPage={page} totalPages={products.totalPages} />
    </div>
  )
}

// components/ProductFilters.tsx (Client Component)
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function ProductFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    params.delete('page') // ページをリセット
    router.push(`/products?${params.toString()}`)
  }

  return (
    <div>
      <select
        value={searchParams.get('category') || ''}
        onChange={(e) => updateFilter('category', e.target.value)}
      >
        <option value="">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>

      <select
        value={searchParams.get('sort') || 'newest'}
        onChange={(e) => updateFilter('sort', e.target.value)}
      >
        <option value="newest">Newest</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
      </select>
    </div>
  )
}
```

### パターン3-2: グローバル状態とローカル状態の分離

```typescript
// lib/store.ts (Client Component用)
'use client'

import { create } from 'zustand'

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (itemId: string) => void
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (itemId) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),
}))

// components/CartButton.tsx (Client Component)
'use client'

import { useCartStore } from '@/lib/store'

export function CartButton() {
  const items = useCartStore((state) => state.items)

  return (
    <button>
      Cart ({items.length})
    </button>
  )
}

// components/AddToCartButton.tsx (Client Component)
'use client'

import { useCartStore } from '@/lib/store'

export function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem)

  return (
    <button onClick={() => addItem(product)}>
      Add to Cart
    </button>
  )
}
```

### パターン3-3: Optimistic Updates

```typescript
// app/actions.ts
'use server'

export async function likePost(postId: string) {
  await db.update(posts).set({ likes: sql`likes + 1` }).where(eq(posts.id, postId))
  revalidatePath(`/posts/${postId}`)
  return { success: true }
}

// components/LikeButton.tsx (Client Component)
'use client'

import { useOptimistic } from 'react'
import { likePost } from '@/app/actions'

export function LikeButton({ postId, initialLikes }: { postId: string; initialLikes: number }) {
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(
    initialLikes,
    (current, increment: number) => current + increment
  )

  const handleLike = async () => {
    // 即座にUIを更新
    setOptimisticLikes(1)

    // サーバーに送信
    await likePost(postId)
  }

  return (
    <button onClick={handleLike}>
      ❤️ {optimisticLikes}
    </button>
  )
}
```

## デザインパターン4: エラーハンドリング

### パターン4-1: エラーバウンダリ

```typescript
// app/posts/error.tsx
'use client'

export default function PostsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}

// app/posts/[id]/error.tsx
'use client'

export default function PostError({ error }: { error: Error }) {
  return (
    <div>
      <h2>Failed to load post</h2>
      <p>{error.message}</p>
      <a href="/posts">Back to posts</a>
    </div>
  )
}
```

### パターン4-2: Loading States

```typescript
// app/posts/loading.tsx
export default function PostsLoading() {
  return (
    <div>
      <h1>Posts</h1>
      <div className="skeleton-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    </div>
  )
}

// app/posts/[id]/loading.tsx
export default function PostLoading() {
  return (
    <div>
      <div className="skeleton-title" />
      <div className="skeleton-content" />
    </div>
  )
}
```

### パターン4-3: Not Found処理

```typescript
// app/posts/[id]/page.tsx
import { notFound } from 'next/navigation'

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id)

  if (!post) {
    notFound()
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  )
}

// app/posts/[id]/not-found.tsx
export default function PostNotFound() {
  return (
    <div>
      <h1>404 - Post Not Found</h1>
      <p>The post you're looking for doesn't exist.</p>
      <a href="/posts">Back to posts</a>
    </div>
  )
}
```

## デザインパターン5: パフォーマンス最適化

### パターン5-1: Dynamic Import

```typescript
// app/dashboard/page.tsx
import dynamic from 'next/dynamic'

// 遅延ロード（クライアント側で必要になったときにロード）
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false, // SSRを無効化（クライアント側でのみロード）
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

### パターン5-2: Image最適化

```typescript
// app/products/[id]/page.tsx
import Image from 'next/image'

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id)

  return (
    <div>
      {/* Next.js Image最適化 */}
      <Image
        src={product.image}
        alt={product.name}
        width={800}
        height={600}
        priority // LCP画像には priority を指定
        placeholder="blur"
        blurDataURL={product.blurDataURL}
      />

      {/* 複数画像 */}
      <div className="gallery">
        {product.images.map((image, i) => (
          <Image
            key={i}
            src={image}
            alt={`${product.name} ${i + 1}`}
            width={200}
            height={200}
            loading="lazy" // 遅延ロード
          />
        ))}
      </div>
    </div>
  )
}
```

### パターン5-3: メタデータ生成

```typescript
// app/posts/[id]/page.tsx
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const post = await getPost(params.id)

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  }
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id)

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  )
}
```

## まとめ

React Server Componentsの実践的なデザインパターンをまとめると、以下のポイントが重要です。

- **コンポーネント境界の最適化**: Leaf Componentsのみをクライアント化
- **データフェッチ戦略**: 並列フェッチとStreaming with Suspense
- **状態管理**: URLパラメータとグローバル/ローカル状態の分離
- **エラーハンドリング**: エラーバウンダリとLoading States
- **パフォーマンス最適化**: Dynamic ImportとImage最適化

Server ComponentsとClient Componentsを適切に使い分けることで、パフォーマンスとユーザー体験を大幅に向上させることができます。Next.js App Routerを活用し、次世代のWebアプリケーションを構築しましょう。
