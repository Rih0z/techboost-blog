---
title: 'ストリーミングSSR完全ガイド2026'
description: 'ストリーミングSSRの仕組みから実装まで徹底解説。React Suspense SSR、Next.js/Remix対応、TTFBとFCP改善、プログレッシブレンダリング、実践パターンを紹介。React・Next.js・Remixに関する実践情報。'
pubDate: '2026-02-05'
tags: ['React', 'Next.js', 'Remix', 'SSR', 'パフォーマンス']
---

ストリーミングSSR（Server-Side Rendering）は、HTMLを段階的に送信することでページ表示を高速化する技術です。本記事では、React 19とNext.js 15での実装方法を徹底解説します。

## 目次

1. ストリーミングSSRとは
2. 従来のSSRとの比較
3. React Suspenseによる実装
4. Next.js 15でのストリーミング
5. Remixでのストリーミング
6. パフォーマンス改善
7. 実践パターン
8. トラブルシューティング

## ストリーミングSSRとは

### 基本概念

```typescript
// 従来のSSR: すべてのデータを待ってからHTML送信
async function traditionalSSR(req) {
  const user = await fetchUser()           // 100ms
  const posts = await fetchPosts()         // 300ms
  const comments = await fetchComments()   // 200ms

  // 600ms後にやっとHTMLを送信
  return renderToString(<App user={user} posts={posts} comments={comments} />)
}

// ストリーミングSSR: HTMLを段階的に送信
async function streamingSSR(req) {
  // 即座にHTMLの送信開始
  const stream = renderToReadableStream(
    <Suspense fallback={<Skeleton />}>
      <App />
    </Suspense>
  )

  // データが揃った部分から順次送信
  return new Response(stream)
}
```

### メリット

```typescript
/**
 * ストリーミングSSRの主なメリット
 *
 * 1. TTFB (Time To First Byte) の改善
 *    - 最初のバイトをすぐに送信開始
 *
 * 2. FCP (First Contentful Paint) の改善
 *    - 早い段階でコンテンツを表示
 *
 * 3. UX向上
 *    - プログレッシブなローディング
 *
 * 4. SEO対応
 *    - クローラーは最終的なHTMLを取得
 */

// パフォーマンス比較
interface PerformanceMetrics {
  traditional: {
    ttfb: 600,      // すべてのデータを待つ
    fcp: 650,
    lcp: 1200
  },
  streaming: {
    ttfb: 50,       // 即座に送信開始
    fcp: 150,       // 早期にコンテンツ表示
    lcp: 800
  }
}
```

### 仕組み

```html
<!-- ストリーミングSSRの出力例 -->

<!-- 1. 最初のチャンク（即座に送信） -->
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="root">
    <header>ヘッダー（静的コンテンツ）</header>

    <!-- Suspense境界 -->
    <div>
      <!--$?--><template id="B:0"></template>
      <div>読み込み中...</div><!--/$-->
    </div>

<!-- 2. 次のチャンク（データ取得後） -->
<div hidden id="S:0">
  <article>
    <h1>実際のコンテンツ</h1>
    <p>データベースから取得したデータ</p>
  </article>
</div>
<script>
  // ローディングを実際のコンテンツに置き換え
  $RC = function(b,c,e) {
    var a=document.getElementById(b);
    a.parentNode.removeChild(a);
    var f=document.getElementById(c);
    if(f){
      b=f.previousSibling;
      if(e)b.data="$!",a=f.dataset.dgst;
      else{
        c=b.parentNode;
        a=b.nextSibling;
        var d=0;
        do{
          if(a&&8===a.nodeType){
            var h=a.data;
            if("/$"===h)
              if(0===d)break;
              else d--;
            else"$"!==h&&"$?"!==h&&"$!"!==h||d++
          }
          h=a.nextSibling;
          c.removeChild(a);
          a=h
        }while(a);
        for(;f.firstChild;)c.insertBefore(f.firstChild,a);
      }
      b.data="$";
      e&&(e.forEach((e)=>e()))
    }
  };
  $RC("B:0","S:0");
</script>

<!-- 3. さらに後のチャンク（別のデータ取得後） -->
<!-- ... -->
```

## 従来のSSRとの比較

### レンダリングフロー

```typescript
// 従来のSSR
async function traditionalSSRFlow(req: Request) {
  console.time('Total')

  // 1. すべてのデータを並行取得
  console.time('Data Fetch')
  const [user, posts, sidebar] = await Promise.all([
    fetchUser(),      // 100ms
    fetchPosts(),     // 300ms
    fetchSidebar()    // 200ms
  ])
  console.timeEnd('Data Fetch') // 300ms

  // 2. HTMLをレンダリング
  console.time('Render')
  const html = renderToString(
    <App user={user} posts={posts} sidebar={sidebar} />
  )
  console.timeEnd('Render') // 50ms

  // 3. 一括送信
  console.time('Send')
  const response = new Response(html)
  console.timeEnd('Send') // 10ms

  console.timeEnd('Total') // 360ms

  return response
}

// ストリーミングSSR
async function streamingSSRFlow(req: Request) {
  console.time('Total')

  // 1. 即座にストリーム開始
  console.time('Stream Start')
  const stream = await renderToReadableStream(
    <html>
      <body>
        <Suspense fallback={<HeaderSkeleton />}>
          <Header />
        </Suspense>

        <Suspense fallback={<PostsSkeleton />}>
          <Posts />
        </Suspense>

        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>
      </body>
    </html>
  )
  console.timeEnd('Stream Start') // 5ms

  // 2. データが揃った順に送信
  // Header: 100ms後
  // Sidebar: 200ms後
  // Posts: 300ms後

  console.timeEnd('Total') // 305ms（ユーザーは5msで表示開始）

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/html',
      'Transfer-Encoding': 'chunked'
    }
  })
}
```

### ウォーターフォール問題の解決

```typescript
// 従来のSSR: ウォーターフォール
async function waterfallSSR() {
  // 1. ユーザー取得
  const user = await fetchUser() // 100ms

  // 2. ユーザーIDを使って投稿取得
  const posts = await fetchUserPosts(user.id) // 200ms

  // 3. 投稿IDを使ってコメント取得
  const comments = await fetchPostComments(posts[0].id) // 150ms

  // 合計: 450ms
  return renderToString(<App user={user} posts={posts} comments={comments} />)
}

// ストリーミングSSR: 並行処理
function streamingSSR() {
  return renderToReadableStream(
    <html>
      <body>
        {/* 各コンポーネントが独立してデータ取得 */}
        <Suspense fallback={<UserSkeleton />}>
          <UserProfile />
        </Suspense>

        <Suspense fallback={<PostsSkeleton />}>
          <UserPosts />
        </Suspense>

        <Suspense fallback={<CommentsSkeleton />}>
          <PostComments />
        </Suspense>
      </body>
    </html>
  )
}

// 各コンポーネント内でデータ取得
async function UserProfile() {
  const user = await fetchUser() // 並行実行
  return <div>{user.name}</div>
}

async function UserPosts() {
  const posts = await fetchPosts() // 並行実行
  return <div>{posts.map(p => <Post key={p.id} post={p} />)}</div>
}
```

## React Suspenseによる実装

### 基本的な実装

```typescript
import { Suspense } from 'react'
import { renderToReadableStream } from 'react-dom/server'

// サーバーコンポーネント（async対応）
async function BlogPost({ id }: { id: string }) {
  const post = await fetchPost(id)

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  )
}

async function Comments({ postId }: { postId: string }) {
  const comments = await fetchComments(postId)

  return (
    <div>
      {comments.map(comment => (
        <div key={comment.id}>
          <p>{comment.text}</p>
        </div>
      ))}
    </div>
  )
}

// ストリーミングレンダリング
export async function GET(request: Request) {
  const url = new URL(request.url)
  const postId = url.searchParams.get('id') || '1'

  const stream = await renderToReadableStream(
    <html>
      <head>
        <title>Blog Post</title>
      </head>
      <body>
        {/* 投稿本文 */}
        <Suspense fallback={<PostSkeleton />}>
          <BlogPost id={postId} />
        </Suspense>

        {/* コメント（遅延読み込み） */}
        <Suspense fallback={<CommentsSkeleton />}>
          <Comments postId={postId} />
        </Suspense>
      </body>
    </html>,
    {
      bootstrapScripts: ['/hydrate.js']
    }
  )

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Transfer-Encoding': 'chunked'
    }
  })
}
```

### ネストされたSuspense

```typescript
async function UserDashboard({ userId }: { userId: string }) {
  const user = await fetchUser(userId)

  return (
    <div>
      <h1>{user.name}'s Dashboard</h1>

      {/* 第1レベル: プロフィールセクション */}
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileSection userId={userId} />
      </Suspense>

      {/* 第1レベル: アクティビティセクション */}
      <Suspense fallback={<ActivitySkeleton />}>
        <ActivitySection userId={userId} />
      </Suspense>
    </div>
  )
}

async function ProfileSection({ userId }: { userId: string }) {
  const profile = await fetchProfile(userId)

  return (
    <section>
      <h2>Profile</h2>
      <p>{profile.bio}</p>

      {/* 第2レベル: アバター（さらに遅延） */}
      <Suspense fallback={<div>Loading avatar...</div>}>
        <Avatar userId={userId} />
      </Suspense>
    </section>
  )
}

async function ActivitySection({ userId }: { userId: string }) {
  const activities = await fetchActivities(userId)

  return (
    <section>
      <h2>Recent Activity</h2>
      {activities.map(activity => (
        <div key={activity.id}>
          <p>{activity.description}</p>

          {/* 第2レベル: 各アクティビティの詳細 */}
          <Suspense fallback={<div>Loading details...</div>}>
            <ActivityDetails activityId={activity.id} />
          </Suspense>
        </div>
      ))}
    </section>
  )
}
```

### エラーハンドリング

```typescript
import { Suspense } from 'react'

// エラーバウンダリ
export class StreamErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Stream error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

// 使用例
function App() {
  return (
    <html>
      <body>
        <StreamErrorBoundary fallback={<ErrorPage />}>
          <Suspense fallback={<LoadingSkeleton />}>
            <DataComponent />
          </Suspense>
        </StreamErrorBoundary>
      </body>
    </html>
  )
}

// データ取得でエラーが発生した場合
async function DataComponent() {
  try {
    const data = await fetchData()
    return <div>{data.content}</div>
  } catch (error) {
    // エラーバウンダリがキャッチ
    throw new Error('Failed to fetch data')
  }
}
```

## Next.js 15でのストリーミング

### App Routerでの実装

```typescript
// app/blog/[id]/page.tsx
import { Suspense } from 'react'
import { PostContent } from '@/components/PostContent'
import { Comments } from '@/components/Comments'
import { RelatedPosts } from '@/components/RelatedPosts'

export default function BlogPostPage({
  params
}: {
  params: { id: string }
}) {
  return (
    <main>
      {/* 投稿本文（優先度高） */}
      <Suspense fallback={<PostSkeleton />}>
        <PostContent id={params.id} />
      </Suspense>

      {/* コメント（優先度中） */}
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments postId={params.id} />
      </Suspense>

      {/* 関連記事（優先度低） */}
      <Suspense fallback={<RelatedPostsSkeleton />}>
        <RelatedPosts postId={params.id} />
      </Suspense>
    </main>
  )
}

// components/PostContent.tsx
async function PostContent({ id }: { id: string }) {
  const post = await fetch(`/api/posts/${id}`, {
    // Next.js 15のキャッシュ設定
    next: { revalidate: 60 }
  }).then(res => res.json())

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  )
}

// components/Comments.tsx
async function Comments({ postId }: { postId: string }) {
  const comments = await fetch(`/api/comments?postId=${postId}`, {
    // コメントは常に最新を取得
    cache: 'no-store'
  }).then(res => res.json())

  return (
    <section>
      <h2>Comments ({comments.length})</h2>
      {comments.map(comment => (
        <div key={comment.id}>
          <p><strong>{comment.author}</strong></p>
          <p>{comment.text}</p>
        </div>
      ))}
    </section>
  )
}
```

### Loading UIの実装

```typescript
// app/blog/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
    </div>
  )
}

// 個別コンポーネントのスケルトン
function PostSkeleton() {
  return (
    <article className="animate-pulse">
      <div className="h-10 bg-gray-200 rounded w-3/4 mb-6" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </article>
  )
}

function CommentsSkeleton() {
  return (
    <section className="animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
      {[1, 2, 3].map(i => (
        <div key={i} className="mb-4">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
      ))}
    </section>
  )
}
```

### 並列データ取得

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 各ウィジェットが並行してデータ取得 */}
      <Suspense fallback={<WidgetSkeleton />}>
        <RevenueWidget />
      </Suspense>

      <Suspense fallback={<WidgetSkeleton />}>
        <UsersWidget />
      </Suspense>

      <Suspense fallback={<WidgetSkeleton />}>
        <OrdersWidget />
      </Suspense>

      <Suspense fallback={<WidgetSkeleton />}>
        <AnalyticsWidget />
      </Suspense>
    </div>
  )
}

// 各ウィジェットが独立してデータ取得
async function RevenueWidget() {
  const revenue = await fetchRevenue() // API呼び出し1
  return <WidgetCard title="Revenue" value={revenue} />
}

async function UsersWidget() {
  const users = await fetchUsers() // API呼び出し2（並行）
  return <WidgetCard title="Users" value={users} />
}

async function OrdersWidget() {
  const orders = await fetchOrders() // API呼び出し3（並行）
  return <WidgetCard title="Orders" value={orders} />
}

async function AnalyticsWidget() {
  const analytics = await fetchAnalytics() // API呼び出し4（並行）
  return <WidgetCard title="Analytics" value={analytics} />
}
```

## Remixでのストリーミング

### defer()を使った実装

```typescript
// app/routes/blog.$id.tsx
import { defer, type LoaderFunctionArgs } from '@remix-run/node'
import { Await, useLoaderData } from '@remix-run/react'
import { Suspense } from 'react'

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params

  // 重要なデータは await（即座に送信）
  const post = await fetchPost(id)

  // 重要でないデータは defer（後で送信）
  const commentsPromise = fetchComments(id)
  const relatedPostsPromise = fetchRelatedPosts(id)

  return defer({
    post,
    comments: commentsPromise,
    relatedPosts: relatedPostsPromise
  })
}

export default function BlogPost() {
  const { post, comments, relatedPosts } = useLoaderData<typeof loader>()

  return (
    <main>
      {/* 即座に表示 */}
      <article>
        <h1>{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>

      {/* コメント（ストリーミング） */}
      <Suspense fallback={<CommentsSkeleton />}>
        <Await resolve={comments}>
          {(resolvedComments) => (
            <section>
              <h2>Comments</h2>
              {resolvedComments.map(comment => (
                <div key={comment.id}>
                  <p>{comment.text}</p>
                </div>
              ))}
            </section>
          )}
        </Await>
      </Suspense>

      {/* 関連記事（ストリーミング） */}
      <Suspense fallback={<RelatedPostsSkeleton />}>
        <Await resolve={relatedPosts}>
          {(resolvedPosts) => (
            <aside>
              <h3>Related Posts</h3>
              {resolvedPosts.map(p => (
                <div key={p.id}>{p.title}</div>
              ))}
            </aside>
          )}
        </Await>
      </Suspense>
    </main>
  )
}
```

### エラーハンドリング

```typescript
export default function BlogPost() {
  const { post, comments } = useLoaderData<typeof loader>()

  return (
    <main>
      <article>
        <h1>{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>

      <Suspense fallback={<CommentsSkeleton />}>
        <Await
          resolve={comments}
          errorElement={
            <div className="error">
              <p>コメントの読み込みに失敗しました</p>
              <button onClick={() => window.location.reload()}>
                再試行
              </button>
            </div>
          }
        >
          {(resolvedComments) => (
            <CommentsSection comments={resolvedComments} />
          )}
        </Await>
      </Suspense>
    </main>
  )
}
```

## パフォーマンス改善

### 優先度の設定

```typescript
// Next.js App Router
function ProductPage({ productId }: { productId: string }) {
  return (
    <div>
      {/* 優先度: 最高（above the fold） */}
      <Suspense fallback={<ProductImageSkeleton />}>
        <ProductImage productId={productId} />
      </Suspense>

      <Suspense fallback={<ProductInfoSkeleton />}>
        <ProductInfo productId={productId} />
      </Suspense>

      {/* 優先度: 中（below the fold） */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews productId={productId} />
      </Suspense>

      {/* 優先度: 低（ページ下部） */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations productId={productId} />
      </Suspense>
    </div>
  )
}

// データ取得の優先度制御
async function ProductImage({ productId }: { productId: string }) {
  const image = await fetch(`/api/products/${productId}/image`, {
    // 高優先度
    priority: 'high',
    next: { revalidate: 3600 }
  }).then(res => res.json())

  return <img src={image.url} alt={image.alt} />
}

async function Recommendations({ productId }: { productId: string }) {
  const recommendations = await fetch(`/api/recommendations/${productId}`, {
    // 低優先度
    priority: 'low',
    next: { revalidate: 300 }
  }).then(res => res.json())

  return <RecommendationsList items={recommendations} />
}
```

### プリレンダリングとの組み合わせ

```typescript
// Next.js: 静的生成 + ストリーミング
export async function generateStaticParams() {
  const posts = await fetchAllPosts()
  return posts.map(post => ({ id: post.id }))
}

export default function BlogPost({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* 静的に生成される部分 */}
      <StaticHeader />

      {/* ストリーミングされる部分 */}
      <Suspense fallback={<ContentSkeleton />}>
        <DynamicContent postId={params.id} />
      </Suspense>

      {/* 静的フッター */}
      <StaticFooter />
    </div>
  )
}
```

### キャッシュ戦略

```typescript
// データフェッチ関数にキャッシュ設定
async function fetchPost(id: string) {
  return fetch(`https://api.example.com/posts/${id}`, {
    next: {
      // 60秒間キャッシュ
      revalidate: 60,
      // キャッシュタグ
      tags: ['post', `post-${id}`]
    }
  })
}

async function fetchComments(postId: string) {
  return fetch(`https://api.example.com/comments?postId=${postId}`, {
    // コメントは常に最新
    cache: 'no-store'
  })
}

// キャッシュの再検証
import { revalidateTag } from 'next/cache'

export async function POST(request: Request) {
  const { postId } = await request.json()

  // 特定の投稿のキャッシュをクリア
  revalidateTag(`post-${postId}`)

  return new Response('OK')
}
```

## 実践パターン

### ECサイトの商品ページ

```typescript
// app/products/[id]/page.tsx
export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto">
      <div className="grid grid-cols-2 gap-8">
        {/* 左カラム: 画像（高優先度） */}
        <Suspense fallback={<ImageGallerySkeleton />}>
          <ProductImageGallery productId={params.id} />
        </Suspense>

        {/* 右カラム: 情報（高優先度） */}
        <div>
          <Suspense fallback={<ProductDetailsSkeleton />}>
            <ProductDetails productId={params.id} />
          </Suspense>

          <Suspense fallback={<PricingSkeleton />}>
            <PricingInfo productId={params.id} />
          </Suspense>

          <AddToCartButton productId={params.id} />
        </div>
      </div>

      {/* タブコンテンツ（中優先度） */}
      <Suspense fallback={<TabsSkeleton />}>
        <ProductTabs productId={params.id} />
      </Suspense>

      {/* レビュー（低優先度） */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <CustomerReviews productId={params.id} />
      </Suspense>

      {/* おすすめ商品（最低優先度） */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <RelatedProducts productId={params.id} />
      </Suspense>
    </div>
  )
}

// 各コンポーネントの実装
async function ProductDetails({ productId }: { productId: string }) {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { brand: true, category: true }
  })

  return (
    <div>
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="text-gray-600">{product.brand.name}</p>
      <p className="mt-4">{product.description}</p>
    </div>
  )
}

async function PricingInfo({ productId }: { productId: string }) {
  const pricing = await db.pricing.findUnique({
    where: { productId },
    include: { discounts: true }
  })

  return (
    <div className="mt-6">
      <div className="text-3xl font-bold">
        ${pricing.currentPrice}
      </div>
      {pricing.originalPrice > pricing.currentPrice && (
        <div className="text-gray-500 line-through">
          ${pricing.originalPrice}
        </div>
      )}
    </div>
  )
}
```

### ダッシュボード

```typescript
// app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* KPIカード（並列読み込み） */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Suspense fallback={<KPICardSkeleton />}>
          <RevenueCard />
        </Suspense>

        <Suspense fallback={<KPICardSkeleton />}>
          <OrdersCard />
        </Suspense>

        <Suspense fallback={<KPICardSkeleton />}>
          <CustomersCard />
        </Suspense>

        <Suspense fallback={<KPICardSkeleton />}>
          <ConversionCard />
        </Suspense>
      </div>

      {/* グラフ */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Suspense fallback={<ChartSkeleton />}>
          <SalesChart />
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <TrafficChart />
        </Suspense>
      </div>

      {/* テーブル */}
      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />
      </Suspense>
    </div>
  )
}

// 各カードコンポーネント
async function RevenueCard() {
  const revenue = await db.order.aggregate({
    _sum: { total: true },
    where: {
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  })

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-gray-600 text-sm">Revenue (30 days)</div>
      <div className="text-2xl font-bold">
        ${revenue._sum.total?.toLocaleString()}
      </div>
    </div>
  )
}
```

## トラブルシューティング

### ストリーミングが動作しない

```typescript
// 問題: ミドルウェアでレスポンスをバッファリング
// middleware.ts (NG例)
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // これがストリーミングをブロック
  response.headers.set('Content-Length', '...')

  return response
}

// 解決: Transfer-Encodingを使用
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // ストリーミング対応
  response.headers.delete('Content-Length')
  response.headers.set('Transfer-Encoding', 'chunked')

  return response
}
```

### Hydration エラー

```typescript
// 問題: サーバーとクライアントでDOMが異なる
function ProblematicComponent() {
  return (
    <div>
      {/* サーバー: Loading... */}
      {/* クライアント: 実際のコンテンツ */}
      <Suspense fallback={<div>Loading...</div>}>
        <DataComponent />
      </Suspense>
    </div>
  )
}

// 解決: suppressHydrationWarning を使用
function FixedComponent() {
  return (
    <div suppressHydrationWarning>
      <Suspense fallback={<div>Loading...</div>}>
        <DataComponent />
      </Suspense>
    </div>
  )
}
```

### パフォーマンスデバッグ

```typescript
// Server Timing APIで計測
export async function GET(request: Request) {
  const timings = new Map<string, number>()

  const startTime = performance.now()

  // データ取得1
  const t1 = performance.now()
  const data1 = await fetchData1()
  timings.set('data1', performance.now() - t1)

  // データ取得2
  const t2 = performance.now()
  const data2 = await fetchData2()
  timings.set('data2', performance.now() - t2)

  const stream = await renderToReadableStream(<App data1={data1} data2={data2} />)

  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/html',
      'Server-Timing': Array.from(timings.entries())
        .map(([name, duration]) => `${name};dur=${duration}`)
        .join(', ')
    }
  })

  return response
}
```

## まとめ

ストリーミングSSRは、Webアプリケーションのパフォーマンスを大幅に改善する強力な技術です。

**主要ポイント**:

1. **TTFB改善**: 最初のバイトを即座に送信
2. **プログレッシブレンダリング**: 段階的にコンテンツ表示
3. **React Suspense**: 宣言的なローディング状態管理
4. **並列データ取得**: ウォーターフォール問題の解決
5. **優先度制御**: 重要なコンテンツを優先

**2026年のベストプラクティス**:

- Next.js 15のApp Routerを活用
- Suspense境界を戦略的に配置
- キャッシュ戦略を最適化
- エラーハンドリングを適切に実装
- パフォーマンス計測を継続的に実施

ストリーミングSSRを活用して、ユーザー体験の向上を実現しましょう。
