---
title: 'React Server Components完全ガイド'
description: 'React Server Componentsを完全解説。RSCとClient Componentsの違い・データフェッチング・Suspenseストリーミング・Server Actions・キャッシュ戦略をNext.js実装例付きで網羅。ベストプラクティスと注意点も紹介します。'
pubDate: '2026-02-20'
tags: ['Next.js', 'React', 'インフラ', 'フロントエンド', '開発ツール']
heroImage: '../../assets/thumbnails/react-server-components-guide.jpg'
---
React 18とNext.js App Routerの登場により、Webフロントエンド開発のパラダイムは大きく転換した。**React Server Components（RSC）**はその中核をなす技術であり、従来のSSR・CSRの概念を根本から刷新する。本記事では、RSCの基礎から実践的なパターンまでを、TypeScriptのコード例とともに網羅的に解説する。

---

## 1. React Server Componentsとは — 従来のSSR/CSRとの違い

### 従来のレンダリングモデルの課題

**CSR（Client-Side Rendering）** では、ブラウザがJavaScriptバンドルをダウンロードし、クライアント側でDOMを構築する。初期ロードが遅く、SEOにも不利だった。

**SSR（Server-Side Rendering）** はサーバーでHTMLを生成することで初期表示を改善したが、HTMLが届いてもJavaScriptのハイドレーションが完了するまでインタラクティブにならない「ハイドレーションの壁」が存在した。

**React Server Components** はこれらの課題を根本的に解決する新しいアーキテクチャだ。

### RSCの核心概念

RSCは**サーバー上でのみレンダリングされるReactコンポーネント**だ。その特徴を整理すると：

- **JavaScriptバンドルに含まれない** — サーバーサイドのコードはクライアントに送られない
- **直接データアクセス** — データベース・ファイルシステム・APIに直接アクセス可能
- **非同期コンポーネント** — `async/await`を使ったデータフェッチングが可能
- **状態を持たない** — `useState`・`useEffect`は使用不可
- **ストリーミングレンダリング** — HTMLをチャンク単位でブラウザへ逐次送信

```typescript
// app/products/page.tsx — Server Component（デフォルト）
// このコードはサーバーでのみ実行される
import { db } from '@/lib/db'

// async関数として定義できる
export default async function ProductsPage() {
  // サーバー上で直接DBクエリを実行
  const products = await db.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <main>
      <h1>商品一覧</h1>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <span>{product.name}</span>
            <span>¥{product.price.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

このコンポーネントに含まれるDBクエリやimport文は、クライアントのJavaScriptバンドルに一切含まれない。バンドルサイズの大幅な削減が実現できる。

### RSCの動作フロー

```
[ユーザーのリクエスト]
       ↓
[Next.js サーバー]
  Server Componentを実行
  └─ DBクエリ / API呼び出し
  └─ React Server Component Payload（RSCペイロード）を生成
       ↓
[HTML + RSCペイロードをブラウザへストリーミング]
       ↓
[ブラウザ]
  HTMLを即時レンダリング（高速な初期表示）
  RSCペイロードを使って仮想DOMを再構築
  Client Componentsのみハイドレーション
```

従来のSSRでは全コンポーネントをハイドレーションする必要があったが、RSCではクライアントコンポーネントのみをハイドレーションするため、インタラクティブになるまでの時間（TTI）が大幅に短縮される。

---

## 2. RSC vs Client Component — 使い分け判断基準

### 判断フローチャート

コンポーネントをどちらにするか迷ったとき、以下の質問で判断できる：

```
Q1: ユーザーイベント（onClick、onChange等）を扱う？
  → YES: Client Component

Q2: React フック（useState、useEffect、useReducer等）を使う？
  → YES: Client Component

Q3: ブラウザAPIが必要？（window、localStorage、navigator等）
  → YES: Client Component

Q4: データフェッチングが必要？
  → YES: Server Component（RSC）

Q5: DBや機密情報（APIキー）に直接アクセスする？
  → YES: Server Component（RSC）

Q6: 大きなライブラリを使うが、サーバーサイドで完結する？
  → YES: Server Component（RSC）でバンドルサイズを削減

上記いずれでもない場合:
  → Server Component（デフォルト）
```

### 典型的な使い分けパターン

```typescript
// ---- Server Component ----
// app/dashboard/page.tsx
import { getUser, getStats } from '@/lib/api'
import { StatCard } from '@/components/StatCard'        // SC
import { InteractiveChart } from '@/components/Chart'  // CC

export default async function DashboardPage() {
  const [user, stats] = await Promise.all([
    getUser(),
    getStats(),
  ])

  return (
    <div>
      <h1>ようこそ、{user.name}さん</h1>
      {/* StatCardはServer Component: 静的表示のみ */}
      <StatCard label="売上" value={stats.revenue} />
      {/* InteractiveChartはClient Component: ホバー・クリック等のインタラクション */}
      <InteractiveChart data={stats.chartData} />
    </div>
  )
}
```

```typescript
// ---- Client Component ----
// components/InteractiveChart.tsx
'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

interface Props {
  data: { month: string; value: number }[]
}

export function InteractiveChart({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  return (
    <BarChart
      width={600}
      height={300}
      data={data}
      onMouseEnter={(_, index) => setActiveIndex(index)}
      onMouseLeave={() => setActiveIndex(null)}
    >
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Bar
        dataKey="value"
        fill={activeIndex !== null ? '#0f62fe' : '#8eb0e7'}
      />
    </BarChart>
  )
}
```

### RSCからClient Componentへpropsを渡す際の制約

RSCからClient ComponentへpropsとしてデータをPassする場合、そのデータは**シリアライズ可能**でなければならない。

```typescript
// OK: プリミティブ型・プレーンオブジェクト・配列
<ClientComponent
  title="タイトル"
  count={42}
  items={[{ id: 1, name: 'foo' }]}
/>

// NG: 関数・クラスインスタンス・DateオブジェクトはNG（シリアライズ不可）
// ただしDateは文字列に変換してから渡せばOK
<ClientComponent
  date={new Date().toISOString()} // ← 文字列に変換してからPassする
/>
```

---

## 3. データフェッチング（async/await・fetch・並列フェッチ）

### async/awaitによるシンプルなフェッチング

Next.jsのApp RouterではServer Componentが`async`関数として動作するため、コンポーネント内で直接`await`できる。

```typescript
// app/posts/[id]/page.tsx
interface PageProps {
  params: { id: string }
}

export default async function PostPage({ params }: PageProps) {
  // サーバーサイドで直接フェッチ（APIキーをクライアントに露出しない）
  const response = await fetch(
    `https://api.example.com/posts/${params.id}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.API_SECRET_KEY}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('記事の取得に失敗しました')
  }

  const post = await response.json()

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

### 並列フェッチ — Promise.allで高速化

複数のデータを取得する際、`await`を順番に並べると**ウォーターフォール**が発生して遅くなる。`Promise.all`で並列実行する。

```typescript
// NG: 逐次実行（合計時間 = A + B + C）
export default async function BadPage() {
  const user = await fetchUser()       // 200ms
  const posts = await fetchPosts()     // 300ms
  const comments = await fetchComments() // 150ms
  // → 合計 650ms
}

// OK: 並列実行（合計時間 = max(A, B, C)）
export default async function GoodPage() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),       // 200ms ┐
    fetchPosts(),      // 300ms ├ 並列実行
    fetchComments(),   // 150ms ┘
  ])
  // → 合計 300ms（最も遅いリクエストの時間）
}
```

### データフェッチング関数のベストプラクティス

データ取得ロジックはコンポーネントから分離し、再利用可能な関数として定義する。

```typescript
// lib/data.ts
import { cache } from 'react'

// React cache()でリクエスト内での重複フェッチを防ぐ
export const getUser = cache(async (id: string) => {
  const res = await fetch(`https://api.example.com/users/${id}`, {
    next: { revalidate: 60 }, // 60秒キャッシュ
  })
  if (!res.ok) throw new Error('ユーザー取得失敗')
  return res.json() as Promise<User>
})

export const getPostsByUser = cache(async (userId: string) => {
  const res = await fetch(
    `https://api.example.com/users/${userId}/posts`,
    { next: { revalidate: 30 } }
  )
  if (!res.ok) throw new Error('投稿一覧取得失敗')
  return res.json() as Promise<Post[]>
})
```

`React.cache()`はReact 18で導入されたメモ化ユーティリティだ。同一リクエスト内で同じ引数で呼ばれた場合、再実行せずにキャッシュされた結果を返す。複数のServer Componentが同じデータを必要とする場合でも、実際のフェッチは1回で済む。

---

## 4. Suspenseとストリーミング（loading.tsx・Suspense境界）

### ストリーミングの仕組み

従来のSSRでは、すべてのデータ取得が完了するまでHTMLの送信を待つ必要があった。ストリーミングでは、HTMLをチャンク単位でブラウザへ逐次送信し、準備できた部分から表示できる。

```
従来のSSR:
[データA取得 200ms] → [データB取得 500ms] → [HTML生成・送信] → [表示]
                                                                  ↑ 700ms後

ストリーミング:
[即時] → [HTMLヘッダー + シェル送信] → [表示開始（早い！）]
[200ms後] → [データA部分を送信] → [表示]
[500ms後] → [データB部分を送信] → [表示完了]
```

### loading.tsx — 自動ローディングUI

App Routerでは`loading.tsx`ファイルを置くだけで、Suspense境界が自動的に設定される。

```typescript
// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  )
}
```

```typescript
// app/dashboard/page.tsx — loading.tsxが自動的にSuspense境界になる
export default async function DashboardPage() {
  const stats = await fetchStats() // データ取得中はloading.tsxが表示される
  return <StatsDisplay stats={stats} />
}
```

### Suspense境界の細粒度制御

`loading.tsx`はページ全体をカバーするが、ページの一部だけをサスペンスさせたい場合は`<Suspense>`コンポーネントを直接使う。

```typescript
// app/product/[id]/page.tsx
import { Suspense } from 'react'
import { ProductInfo } from '@/components/ProductInfo'
import { Reviews } from '@/components/Reviews'
import { RelatedProducts } from '@/components/RelatedProducts'
import { Skeleton } from '@/components/ui/Skeleton'

export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* 商品情報は優先度高 — すぐ表示 */}
      <Suspense fallback={<Skeleton className="h-64" />}>
        <ProductInfo id={params.id} />
      </Suspense>

      <div className="grid grid-cols-2 gap-8 mt-8">
        {/* レビューと関連商品は独立してロード */}
        <Suspense fallback={<Skeleton className="h-48" />}>
          <Reviews productId={params.id} />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-48" />}>
          <RelatedProducts productId={params.id} />
        </Suspense>
      </div>
    </div>
  )
}
```

このパターンでは、`ProductInfo`・`Reviews`・`RelatedProducts`がそれぞれ独立してストリーミングされる。最も重要な商品情報が届いた時点でユーザーはコンテンツを見られる。

---

## 5. Server Actions（form action・useFormState・useFormStatus）

### Server Actionsとは

Server Actionsは、クライアントから呼び出せるサーバーサイドの関数だ。フォームの送信・データ変更などをAPIルートなしで実装できる。

```typescript
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const body = formData.get('body') as string

  // バリデーション
  if (!title || title.length < 3) {
    return { error: 'タイトルは3文字以上で入力してください' }
  }

  // DBへの書き込み（サーバーサイドのみ）
  await db.post.create({
    data: { title, body },
  })

  // キャッシュを無効化してページを再検証
  revalidatePath('/posts')

  // 投稿一覧ページへリダイレクト
  redirect('/posts')
}
```

### formのaction属性でServer Actionを呼ぶ

```typescript
// app/posts/new/page.tsx
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
          className="border rounded px-3 py-2 w-full"
        />
      </div>
      <div className="mt-4">
        <label htmlFor="body">本文</label>
        <textarea
          id="body"
          name="body"
          rows={8}
          className="border rounded px-3 py-2 w-full"
        />
      </div>
      <button type="submit" className="mt-4 bg-blue-600 text-white px-6 py-2 rounded">
        投稿する
      </button>
    </form>
  )
}
```

### useFormState / useActionState でエラーハンドリング

React 19（Next.js 15以降）では`useActionState`、それ以前は`useFormState`を使う。

```typescript
// components/PostForm.tsx
'use client'

import { useActionState } from 'react'
import { createPost } from '@/app/actions'

interface ActionState {
  error?: string
  success?: boolean
}

const initialState: ActionState = {}

export function PostForm() {
  const [state, formAction] = useActionState(createPost, initialState)

  return (
    <form action={formAction}>
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {state.error}
        </div>
      )}
      <input name="title" type="text" placeholder="タイトル" />
      <textarea name="body" placeholder="本文" />
      <SubmitButton />
    </form>
  )
}

// useFormStatusで送信中の状態を取得
function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
    >
      {pending ? '送信中...' : '投稿する'}
    </button>
  )
}
```

### Server Actionのセキュリティ

Server Actionsは自動的にCSRF保護が適用されるが、認証チェックは開発者が責任を持って実装する必要がある。

```typescript
// app/actions.ts
'use server'

import { auth } from '@/lib/auth'

export async function deletePost(postId: string) {
  // 必ず認証チェックをServer Action内で行う
  const session = await auth()
  if (!session) {
    throw new Error('認証が必要です')
  }

  // 認可チェック（自分の投稿のみ削除可）
  const post = await db.post.findUnique({ where: { id: postId } })
  if (post?.authorId !== session.user.id) {
    throw new Error('権限がありません')
  }

  await db.post.delete({ where: { id: postId } })
  revalidatePath('/posts')
}
```

---

## 6. キャッシュ戦略（fetch cache・revalidate・no-store）

Next.js App Routerには複数のキャッシュ層が存在する。

### fetchキャッシュオプション

```typescript
// 1. デフォルト（force-cache）: CDNのようにキャッシュ
const res = await fetch('https://api.example.com/data')

// 2. no-store: キャッシュしない（常に最新データ）
const res = await fetch('https://api.example.com/data', {
  cache: 'no-store',
})

// 3. revalidate: 指定秒数後に再検証（ISR的な動作）
const res = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 }, // 1時間ごとに再検証
})

// 4. タグベースの再検証
const res = await fetch('https://api.example.com/posts', {
  next: { tags: ['posts'] }, // 'posts'タグで再検証をトリガー可能
})
```

### revalidatePathとrevalidateTag

```typescript
// app/actions.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

// 特定のパスのキャッシュを無効化
export async function updatePost(id: string, data: PostInput) {
  await db.post.update({ where: { id }, data })
  revalidatePath(`/posts/${id}`)   // 特定ページのキャッシュを削除
  revalidatePath('/posts')          // 一覧ページも再検証
}

// タグベースの一括無効化
export async function clearPostsCache() {
  revalidateTag('posts') // 'posts'タグが付いた全フェッチを無効化
}
```

### ルートセグメントのキャッシュ設定

```typescript
// app/dashboard/page.tsx

// ページ全体のキャッシュ動作を制御
export const dynamic = 'force-dynamic'     // 常に動的レンダリング
// export const dynamic = 'force-static'  // 常に静的生成
// export const revalidate = 60           // 60秒ごとに再検証
// export const revalidate = 0            // キャッシュなし（force-dynamicと同等）

export default async function DashboardPage() {
  // このページは常に最新データを取得する
  const data = await fetchDashboardData()
  return <Dashboard data={data} />
}
```

### キャッシュ戦略の選択指針

| コンテンツ種別 | 推奨設定 | 理由 |
|-------------|---------|------|
| マーケティングLP | `force-static` / ISR | 変更頻度低・高速表示優先 |
| ブログ記事 | `revalidate: 3600` | 更新は不定期だが高速表示も重要 |
| 商品一覧 | `revalidate: 300` | 在庫・価格変動を5分以内に反映 |
| ユーザーダッシュボード | `no-store` | ユーザー固有・常に最新必須 |
| リアルタイム株価 | `no-store` | 即時反映必須 |

---

## 7. 'use client' / 'use server' ディレクティブの正しい使い方

### 'use client' の正しい配置

`'use client'`は**コンポーネントツリーの境界**を定義する。このディレクティブを持つファイルから`import`される全てのモジュールがクライアントバンドルに含まれる。

```typescript
// NG: 大きなコンポーネントをまるごとClient Componentにしてしまう
'use client'

import heavyLibrary from 'heavy-library' // バンドルに含まれてしまう

export function Page() {
  const [count, setCount] = useState(0) // これだけがClientを必要とする

  return (
    <div>
      <HeavyStaticContent /> {/* Serverで良いのに... */}
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
    </div>
  )
}
```

```typescript
// OK: インタラクティブな部分だけをClient Componentに分離
// components/Counter.tsx
'use client'

import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <button onClick={() => setCount(c => c + 1)}>
      カウント: {count}
    </button>
  )
}

// app/page.tsx — Server Component
import { Counter } from '@/components/Counter'

export default function Page() {
  return (
    <div>
      <HeavyStaticContent /> {/* サーバーで処理 */}
      <Counter />             {/* クライアントで処理 */}
    </div>
  )
}
```

### 'use server' — Server Actionsの宣言

`'use server'`はServer Actionsを定義するためのディレクティブだ。使い方は2通りある。

```typescript
// パターン1: ファイル冒頭に記述（ファイル全体がServer Actions）
// app/actions/post.ts
'use server'

export async function createPost(formData: FormData) { /* ... */ }
export async function deletePost(id: string) { /* ... */ }
export async function updatePost(id: string, data: unknown) { /* ... */ }
```

```typescript
// パターン2: 関数内に記述（インラインServer Action）
// Server Component内でのみ使用可能
export default function Page() {
  async function handleSubmit(formData: FormData) {
    'use server'
    // この関数はサーバーで実行される
    await db.post.create({ data: { title: formData.get('title') as string } })
    revalidatePath('/posts')
  }

  return <form action={handleSubmit}>...</form>
}
```

---

## 8. Context と RSC — クライアント側Providerパターン

React Contextは`useState`などのフックに依存するため、Server Componentでは使用できない。しかし、Providerをラッパーとして作成することで、RSCツリー内でContext値を提供するパターンが確立している。

```typescript
// providers/ThemeProvider.tsx
'use client'

import { createContext, useContext, useState } from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
}>({
  theme: 'light',
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  const toggleTheme = () => {
    setTheme(t => (t === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

```typescript
// app/layout.tsx — RootLayoutでProviderをラップ
import { ThemeProvider } from '@/providers/ThemeProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {/* ThemeProvider（Client Component）がchildrenをラップ */}
        {/* childrenにはServer Componentを含められる */}
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

```typescript
// components/ThemeToggle.tsx — Client Component
'use client'

import { useTheme } from '@/providers/ThemeProvider'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? '🌙 ダーク' : '☀️ ライト'}
    </button>
  )
}
```

重要なのは、`children`はServer Componentのまま渡せるという点だ。Providerは`children`を受け取って描画するだけで、`children`自体をClient化はしない。

---

## 9. サードパーティライブラリとの互換性

RSC環境では、`useState`・`useEffect`・ブラウザAPIを使用するライブラリはServer Componentから直接`import`できない。

### 対処パターン

#### パターン1: Client Componentでラップする

```typescript
// components/ui/Carousel.tsx
'use client'

// Swiperはクライアントサイドのライブラリ
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'

interface Props {
  images: string[]
}

export function Carousel({ images }: Props) {
  return (
    <Swiper spaceBetween={10} slidesPerView={3}>
      {images.map((src, i) => (
        <SwiperSlide key={i}>
          <img src={src} alt="" />
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
```

#### パターン2: dynamic importで遅延ロード

```typescript
// app/page.tsx
import dynamic from 'next/dynamic'

// SSRを無効にして、クライアントサイドのみでロード
const HeavyChart = dynamic(
  () => import('@/components/HeavyChart'),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
  }
)

export default function Page() {
  return (
    <main>
      <h1>ダッシュボード</h1>
      <HeavyChart />
    </main>
  )
}
```

#### パターン3: ライブラリの特定エクスポートのみを使う

多くのUIライブラリ（shadcn/ui、Radix UI等）はServer Componentと互換性のあるエクスポートと、Client Componentが必要なエクスポートを分けて提供している。ドキュメントで各コンポーネントの対応状況を確認することが重要だ。

---

## 10. エラーハンドリング（error.tsx・notFound）

### error.tsx — エラーバウンダリ

`error.tsx`はReactのError Boundaryをファイルシステムで実装する。エラーが発生したとき、同一セグメント以下のUIをフォールバックUIに置き換える。

```typescript
// app/posts/error.tsx
'use client' // error.tsxは必ずClient Componentでなければならない

import { useEffect } from 'react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PostsError({ error, reset }: Props) {
  useEffect(() => {
    // エラーをロギングサービスに送信
    console.error('Posts error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center py-16">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        記事の読み込みに失敗しました
      </h2>
      <p className="text-gray-500 mb-6">{error.message}</p>
      <button
        onClick={reset}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        再試行する
      </button>
    </div>
  )
}
```

### notFound — 404ハンドリング

```typescript
// app/posts/[id]/page.tsx
import { notFound } from 'next/navigation'

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await db.post.findUnique({
    where: { id: params.id },
  })

  // 記事が見つからない場合は404ページを表示
  if (!post) {
    notFound()
  }

  return <article>{/* ... */}</article>
}
```

```typescript
// app/posts/[id]/not-found.tsx — カスタム404UI
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="text-center py-16">
      <h2 className="text-2xl font-bold mb-4">記事が見つかりません</h2>
      <p className="text-gray-500 mb-6">
        お探しの記事は削除されたか、URLが間違っている可能性があります。
      </p>
      <Link
        href="/posts"
        className="text-blue-600 hover:underline"
      >
        記事一覧へ戻る
      </Link>
    </div>
  )
}
```

### グローバルエラーハンドリング

```typescript
// app/global-error.tsx — RootLayoutのエラーもキャッチ
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">予期しないエラーが発生しました</h1>
            <button onClick={reset} className="bg-blue-600 text-white px-6 py-2 rounded">
              ページをリロード
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
```

---

## 11. Parallel Routes・Intercepting Routes

### Parallel Routes — 同一レイアウトで複数のページを並列表示

`@folder`記法で、同一URLで複数の独立したページセクションをレンダリングできる。

```
app/
  layout.tsx
  @dashboard/
    page.tsx
  @analytics/
    page.tsx
  page.tsx
```

```typescript
// app/layout.tsx
export default function Layout({
  children,
  dashboard,
  analytics,
}: {
  children: React.ReactNode
  dashboard: React.ReactNode
  analytics: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-12 gap-6">
      <aside className="col-span-3">{dashboard}</aside>
      <main className="col-span-6">{children}</main>
      <aside className="col-span-3">{analytics}</aside>
    </div>
  )
}
```

### Intercepting Routes — モーダルルーティング

`(.)folder`記法で、別URLのページをモーダルとしてオーバーレイ表示できる。

```
app/
  photos/
    [id]/
      page.tsx      ← フル画面写真ページ
  @modal/
    (.)photos/
      [id]/
        page.tsx    ← モーダル表示（同一セグメント内からのナビゲーション時）
    default.tsx     ← モーダルなし時のフォールバック
```

```typescript
// app/@modal/(.)photos/[id]/page.tsx
import { Modal } from '@/components/Modal'
import { PhotoDetail } from '@/components/PhotoDetail'

export default async function PhotoModal({
  params,
}: {
  params: { id: string }
}) {
  const photo = await getPhoto(params.id)

  return (
    <Modal>
      <PhotoDetail photo={photo} />
    </Modal>
  )
}
```

このパターンにより、写真一覧ページから写真をクリックするとURLが変わりつつモーダル表示され、URLを直接開くとフル画面表示される、という動作を実現できる。

---

## 12. PPR（Partial Prerendering）

**Partial Prerendering（PPR）** はNext.js 14で実験的に導入された次世代のレンダリングモデルだ。静的なシェル部分を事前生成しつつ、動的な部分をSuspenseでストリーミングする。

```
従来の選択:
  Static（全て事前生成）← 速い・動的データ不可
  Dynamic（全て動的）   ← データ最新・初期表示遅い

PPR:
  Static Shell（即時配信）+ Dynamic Parts（ストリーミング）
  → 速い + 最新データ を両立
```

```typescript
// next.config.ts — PPRの有効化（実験的機能）
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    ppr: true, // または 'incremental'
  },
}

export default nextConfig
```

```typescript
// app/product/[id]/page.tsx — PPRの活用例
import { Suspense } from 'react'

// このページの静的シェルは事前生成される
export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* 静的部分: すぐに配信 */}
      <header>
        <nav>ナビゲーション</nav>
      </header>

      {/* 動的部分: Suspenseで包んだ部分はストリーミング */}
      <Suspense fallback={<ProductSkeleton />}>
        <DynamicProductInfo id={params.id} />
      </Suspense>

      {/* 静的フッター: すぐに配信 */}
      <footer>フッター</footer>
    </div>
  )
}
```

PPRにより、Time to First Byte（TTFB）の改善と動的コンテンツの両立が可能になる。2026年現在、段階的に安定版へ移行しつつある機能だ。

---

## 13. パフォーマンス計測（Time to First Byte・LCP改善）

### Core Web VitalsとRSCの関係

RSCを適切に活用することで、以下のCore Web Vitalsが改善する。

| メトリクス | RSC導入前の課題 | RSC導入後の改善 |
|-----------|----------------|----------------|
| **TTFB** | SSR全完了待ち | ストリーミングで早期送信 |
| **LCP** | JSバンドル解析後にレンダリング | HTMLに静的コンテンツ埋め込み |
| **FID/INP** | 大量のハイドレーション処理 | Client Componentのみハイドレーション |
| **TBT** | 大きなJSバンドル | バンドルサイズ削減 |

### Next.jsのSpeed Insights活用

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <SpeedInsights />  {/* Core Web Vitalsを自動計測 */}
        <Analytics />      {/* ページビュー計測 */}
      </body>
    </html>
  )
}
```

### バンドルサイズの計測と最適化

```bash
# next buildでバンドル分析
ANALYZE=true npm run build

# @next/bundle-analyzerで可視化
npm install --save-dev @next/bundle-analyzer
```

```typescript
// next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer({
  // Next.js設定
})
```

### Lighthouse CIでの継続的計測

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci && npm run build
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/products
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

### パフォーマンス改善のチェックリスト

RSCベースのNext.jsアプリでパフォーマンスを最大化するための確認事項：

**サーバーサイド**
- [ ] データフェッチは`Promise.all`で並列化されているか
- [ ] `React.cache()`で重複フェッチを排除しているか
- [ ] 適切なキャッシュ戦略（revalidate/no-store）を設定しているか
- [ ] DBクエリにN+1問題がないか（Prismaなら`include`を活用）

**クライアントサイド**
- [ ] `'use client'`は本当に必要なコンポーネントのみに付与しているか
- [ ] サードパーティライブラリは`dynamic`でコード分割しているか
- [ ] 画像は`next/image`を使っているか
- [ ] フォントは`next/font`で最適化しているか

**計測**
- [ ] Vercel Speed InsightsまたはLighthouseでLCPを計測しているか
- [ ] バンドルサイズをリリースごとにモニタリングしているか

---

## まとめ — RSCで実現するモダンWebの基盤

React Server Componentsは単なる「新機能」ではなく、Webアプリケーションアーキテクチャの根本的なパラダイムシフトだ。本記事で解説したポイントを振り返る：

1. **RSCはサーバーサイドで完結** — バンドルサイズを削減し、機密情報を安全に扱える
2. **Client Componentは境界として設計する** — インタラクションが必要な最小単位にとどめる
3. **ストリーミングで体感速度を改善** — Suspense境界の細粒度制御が鍵
4. **Server Actionsでフルスタックを簡潔に** — APIルートを書かずにデータ変更を実現
5. **キャッシュ戦略はコンテンツ特性で決める** — 静的・ISR・動的の3択を意識する
6. **PPRが次の標準になる** — 静的と動的のハイブリッドが最終形

RSCの設計思想の核心は「**必要なコードだけをクライアントに送る**」というシンプルな原則だ。この原則に従ってアーキテクチャを設計すれば、自然とパフォーマンスの高いアプリケーションが生まれる。

---

## 開発効率をさらに高めるツール

RSCを活用したNext.jsアプリの開発では、適切な開発ツールが生産性を大きく左右する。**[DevToolBox](https://usedevtools.com/)** は、Web開発者向けのオールインワンツールキットだ。JSON整形・正規表現テスト・Base64エンコード・タイムゾーン変換など、日常的に使うツールが一箇所に集約されている。Server Actionsのデバッグ時にJSONペイロードを素早く確認したり、API設計中にデータ構造を整形したりする際に重宝する。ブックマークしておいて損はない。

---

*本記事は2026年2月時点のNext.js 15・React 19をベースに執筆しています。APIは随時更新されるため、最新の公式ドキュメントも合わせて参照してください。*
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
