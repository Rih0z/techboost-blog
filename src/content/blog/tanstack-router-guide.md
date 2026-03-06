---
title: "TanStack Router完全ガイド - 型安全ルーティングの次世代標準"
description: "React向け次世代型安全ルーターTanStack Routerの完全ガイド。ファイルベースルーティング、検索パラメータの型安全性、レイアウトネスト、データローディング、コード分割まで実践的に解説します。React・TanStack Router・TypeScriptに関する実践情報。"
pubDate: "2025-02-06"
tags: ["React", "TanStack Router", "TypeScript", "ルーティング", "型安全性", "パフォーマンス"]
---

Reactアプリケーション開発において、ルーティングは避けて通れない重要な要素です。従来のReact Routerは長年業界標準として利用されてきましたが、TypeScriptの型安全性やモダンな開発体験という点で課題を抱えていました。

TanStack Router（@tanstack/react-router）は、TanStack QueryやTanStack Tableを開発したTanner Linsleyによる次世代ルーターです。完全な型安全性、ファイルベースルーティング、優れたDX（開発者体験）、そして高いパフォーマンスを実現しています。

本記事では、TanStack Routerの導入から実践的な使い方、パフォーマンス最適化まで、実際のプロジェクトで使えるノウハウを徹底解説します。

## TanStack Routerの特徴

### 完全な型安全性

TanStack Routerの最大の特徴は、ルート全体にわたる完全な型推論です。

```typescript
// ルート定義から自動的に型が推論される
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'

function ProductPage() {
  // paramsの型が自動推論される
  const { productId } = useParams({ from: '/products/$productId' })
  //    ^? string

  // 検索パラメータも型安全
  const search = useSearch({ from: '/products/' })
  //    ^? { category?: string; sort?: 'asc' | 'desc' }

  // ナビゲーションも型チェックされる
  const navigate = useNavigate()

  navigate({
    to: '/products/$productId',
    params: { productId: '123' }, // 型エラーが出る: string型が必要
    search: { category: 'electronics', sort: 'invalid' } // 型エラー
  })
}
```

### ファイルベースルーティング

Next.jsライクなファイルベースルーティングをサポートしています。

```
src/routes/
├── __root.tsx          # ルートレイアウト
├── index.tsx           # /
├── about.tsx           # /about
├── products/
│   ├── index.tsx       # /products
│   ├── $productId.tsx  # /products/:productId
│   └── $productId/
│       └── reviews.tsx # /products/:productId/reviews
└── _auth/              # レイアウトルート
    ├── login.tsx       # /login
    └── register.tsx    # /register
```

### データローディングとプリフェッチ

TanStack Queryと統合し、データローディングとキャッシングを効率化します。

```typescript
// ルート定義でデータローディングを宣言
export const Route = createFileRoute('/products/$productId')({
  loader: async ({ params }) => {
    return fetchProduct(params.productId)
  },
  // プリフェッチ設定
  preload: true,
  preloadMaxAge: 10000,
})

function ProductPage() {
  // ローダーの結果を型安全に取得
  const product = Route.useLoaderData()
  //    ^? Product
}
```

## プロジェクトセットアップ

### インストール

```bash
npm install @tanstack/react-router
npm install -D @tanstack/router-devtools @tanstack/router-vite-plugin
```

### Vite設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite({
      // ルートファイルの自動生成
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
  ],
})
```

### ルートレイアウトの作成

```typescript
// src/routes/__root.tsx
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <nav>
        <Link to="/" activeProps={{ className: 'active' }}>
          Home
        </Link>
        <Link to="/products" activeProps={{ className: 'active' }}>
          Products
        </Link>
        <Link to="/about" activeProps={{ className: 'active' }}>
          About
        </Link>
      </nav>
      <main>
        <Outlet />
      </main>
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}
```

### アプリケーションエントリーポイント

```typescript
// src/main.tsx
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// ルーターインスタンスの作成
const router = createRouter({
  routeTree,
  defaultPreload: 'intent', // ホバー時にプリフェッチ
})

// TypeScript型推論のためのグローバル型登録
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
}
```

## ルート定義パターン

### 基本的なルート

```typescript
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div>
      <h1>Welcome to TanStack Router</h1>
      <p>Type-safe routing for React applications</p>
    </div>
  )
}
```

### 動的ルート（パラメータ）

```typescript
// src/routes/products/$productId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

// パラメータのバリデーションスキーマ
const productIdSchema = z.string().regex(/^\d+$/)

export const Route = createFileRoute('/products/$productId')({
  // パラメータバリデーション
  params: {
    parse: (params) => ({
      productId: productIdSchema.parse(params.productId),
    }),
    stringify: (params) => ({
      productId: params.productId,
    }),
  },
  // データローディング
  loader: async ({ params }) => {
    const product = await fetchProduct(params.productId)
    if (!product) {
      throw new Error('Product not found')
    }
    return { product }
  },
  component: ProductPage,
  errorComponent: ProductErrorPage,
  pendingComponent: () => <div>Loading product...</div>,
})

function ProductPage() {
  const { product } = Route.useLoaderData()
  const { productId } = Route.useParams()

  return (
    <div>
      <h1>{product.name}</h1>
      <p>Product ID: {productId}</p>
      <p>{product.description}</p>
      <p>Price: ${product.price}</p>
    </div>
  )
}

function ProductErrorPage({ error }: { error: Error }) {
  return (
    <div>
      <h1>Error loading product</h1>
      <p>{error.message}</p>
    </div>
  )
}
```

### 検索パラメータの型安全性

```typescript
// src/routes/products/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

// 検索パラメータのスキーマ定義
const productsSearchSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  category: z.enum(['electronics', 'clothing', 'books']).optional(),
  sort: z.enum(['price-asc', 'price-desc', 'name']).optional().default('name'),
  q: z.string().optional(),
})

export const Route = createFileRoute('/products/')({
  validateSearch: productsSearchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search } }) => {
    const products = await fetchProducts({
      page: search.page,
      category: search.category,
      sort: search.sort,
      query: search.q,
    })
    return { products, totalPages: products.totalPages }
  },
  component: ProductsPage,
})

function ProductsPage() {
  const { products, totalPages } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const handleFilterChange = (category: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        category: category as 'electronics' | 'clothing' | 'books',
        page: 1, // カテゴリ変更時はページをリセット
      }),
    })
  }

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({ ...prev, page: newPage }),
    })
  }

  return (
    <div>
      <h1>Products</h1>

      {/* フィルター */}
      <div>
        <button onClick={() => handleFilterChange('electronics')}>
          Electronics
        </button>
        <button onClick={() => handleFilterChange('clothing')}>
          Clothing
        </button>
        <button onClick={() => handleFilterChange('books')}>
          Books
        </button>
      </div>

      {/* 商品リスト */}
      <div>
        {products.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* ページネーション */}
      <div>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            disabled={search.page === page}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  )
}
```

### レイアウトルート

レイアウトルートは、複数のページで共通のUIを共有する場合に使用します。

```typescript
// src/routes/_auth.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-sidebar">
        <img src="/logo.svg" alt="Logo" />
        <h2>Welcome Back</h2>
      </div>
      <div className="auth-content">
        <Outlet />
      </div>
    </div>
  )
}
```

```typescript
// src/routes/_auth/login.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <form>
      <h1>Login</h1>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button type="submit">Sign In</button>
    </form>
  )
}
```

## データローディングとキャッシング

### ローダーの基本

```typescript
// src/routes/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    const [user, stats, notifications] = await Promise.all([
      fetchUser(),
      fetchStats(),
      fetchNotifications(),
    ])
    return { user, stats, notifications }
  },
  component: DashboardPage,
  pendingComponent: () => <div>Loading dashboard...</div>,
  pendingMs: 500, // 500ms未満の場合はローディング表示しない
  pendingMinMs: 1000, // 最低1秒間ローディングを表示
})

function DashboardPage() {
  const { user, stats, notifications } = Route.useLoaderData()

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <StatsGrid stats={stats} />
      <NotificationsList notifications={notifications} />
    </div>
  )
}
```

### TanStack Queryとの統合

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分
      gcTime: 1000 * 60 * 10, // 10分（旧cacheTime）
    },
  },
})
```

```typescript
// src/routes/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/queryClient'

const postQueryOptions = (postId: string) => ({
  queryKey: ['post', postId],
  queryFn: () => fetchPost(postId),
})

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    // TanStack Queryのキャッシュを使用
    await queryClient.ensureQueryData(postQueryOptions(params.postId))
  },
  component: PostPage,
})

function PostPage() {
  const { postId } = Route.useParams()
  // useQueryでリアルタイム更新をサポート
  const { data: post, isLoading } = useQuery(postQueryOptions(postId))

  if (isLoading) return <div>Loading...</div>

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  )
}
```

### データの再検証

```typescript
// src/routes/posts/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/')({
  loader: async () => {
    return { posts: await fetchPosts() }
  },
  // ルートに戻るたびにデータを再取得
  staleTime: 0,
  // またはカスタム条件で再検証
  shouldReload: ({ routeMatch }) => {
    const now = Date.now()
    const lastLoaded = routeMatch.updatedAt
    // 5分以上経過していたら再取得
    return now - lastLoaded > 1000 * 60 * 5
  },
  component: PostsPage,
})
```

## ナビゲーションとリンク

### 型安全なナビゲーション

```typescript
import { useNavigate, Link } from '@tanstack/react-router'

function Navigation() {
  const navigate = useNavigate()

  const handleProductClick = (productId: string) => {
    navigate({
      to: '/products/$productId',
      params: { productId },
      search: { tab: 'reviews' },
      // ナビゲーション時にスクロール位置をリセット
      resetScroll: true,
    })
  }

  return (
    <div>
      {/* 宣言的リンク */}
      <Link
        to="/products/$productId"
        params={{ productId: '123' }}
        search={{ tab: 'reviews' }}
        activeProps={{
          className: 'active',
          style: { fontWeight: 'bold' },
        }}
      >
        Product 123
      </Link>

      {/* プログラマティックナビゲーション */}
      <button onClick={() => handleProductClick('456')}>
        Go to Product 456
      </button>
    </div>
  )
}
```

### プリフェッチ

```typescript
import { usePrefetch } from '@tanstack/react-router'

function ProductCard({ product }: { product: Product }) {
  const prefetch = usePrefetch()

  const handleMouseEnter = () => {
    // ホバー時にプリフェッチ
    prefetch({
      to: '/products/$productId',
      params: { productId: product.id },
    })
  }

  return (
    <Link
      to="/products/$productId"
      params={{ productId: product.id }}
      onMouseEnter={handleMouseEnter}
    >
      <h3>{product.name}</h3>
      <p>{product.description}</p>
    </Link>
  )
}
```

### 検索パラメータの操作

```typescript
import { useSearch, useNavigate } from '@tanstack/react-router'

function FilterBar() {
  const search = useSearch({ from: '/products/' })
  const navigate = useNavigate({ from: '/products/' })

  const updateFilter = (key: string, value: any) => {
    navigate({
      search: (prev) => ({
        ...prev,
        [key]: value,
        page: 1, // フィルター変更時はページをリセット
      }),
    })
  }

  const clearFilters = () => {
    navigate({
      search: {
        page: 1,
        sort: 'name', // デフォルト値
      },
    })
  }

  return (
    <div>
      <select
        value={search.category ?? ''}
        onChange={(e) => updateFilter('category', e.target.value || undefined)}
      >
        <option value="">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
        <option value="books">Books</option>
      </select>

      <select
        value={search.sort}
        onChange={(e) => updateFilter('sort', e.target.value)}
      >
        <option value="name">Name</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
      </select>

      <button onClick={clearFilters}>Clear Filters</button>
    </div>
  )
}
```

## 認証とルート保護

### 認証状態の管理

```typescript
// src/lib/auth.ts
import { createContext, useContext } from 'react'

interface AuthContext {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContext | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### 保護されたルート

```typescript
// src/routes/_authenticated.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { getAuth } from '@/lib/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const auth = getAuth()
    if (!auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div>
      <AuthenticatedNav />
      <Outlet />
    </div>
  )
}
```

```typescript
// src/routes/_authenticated/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/_authenticated/dashboard')({
  loader: async () => {
    const auth = getAuth()
    const dashboard = await fetchDashboard(auth.user!.id)
    return { dashboard }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()
  const { dashboard } = Route.useLoaderData()

  return (
    <div>
      <h1>Dashboard - {user!.name}</h1>
      <DashboardContent data={dashboard} />
    </div>
  )
}
```

### ログイン後のリダイレクト

```typescript
// src/routes/login.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    await login(
      formData.get('email') as string,
      formData.get('password') as string
    )

    // ログイン後、元のページまたはダッシュボードへリダイレクト
    navigate({
      to: search.redirect ?? '/dashboard',
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Login</button>
    </form>
  )
}
```

## コード分割とレイジーローディング

### ルートベースのコード分割

```typescript
// src/routes/admin/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

// コンポーネントを遅延ロード
const AdminPage = lazy(() => import('@/pages/AdminPage'))

export const Route = createFileRoute('/admin/')({
  component: AdminPage,
})
```

### 条件付きコード分割

```typescript
// src/routes/editor/$documentId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const RichTextEditor = lazy(() => import('@/components/RichTextEditor'))
const CodeEditor = lazy(() => import('@/components/CodeEditor'))

export const Route = createFileRoute('/editor/$documentId')({
  loader: async ({ params }) => {
    const document = await fetchDocument(params.documentId)
    return { document }
  },
  component: EditorPage,
})

function EditorPage() {
  const { document } = Route.useLoaderData()

  // ドキュメントタイプに応じて異なるエディタをロード
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      {document.type === 'rich-text' ? (
        <RichTextEditor content={document.content} />
      ) : (
        <CodeEditor code={document.content} language={document.language} />
      )}
    </Suspense>
  )
}
```

## エラーハンドリング

### ルートレベルのエラーバウンダリ

```typescript
// src/routes/products/$productId.tsx
import { createFileRoute, ErrorComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/products/$productId')({
  loader: async ({ params }) => {
    const product = await fetchProduct(params.productId)
    if (!product) {
      throw new Error('Product not found')
    }
    return { product }
  },
  component: ProductPage,
  errorComponent: ProductErrorComponent,
})

function ProductErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h1>Failed to load product</h1>
      <p>{error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  )
}
```

### グローバルエラーハンドリング

```typescript
// src/routes/__root.tsx
import { createRootRoute, ErrorComponent } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootErrorComponent,
})

function RootErrorComponent({ error }: { error: Error }) {
  return (
    <div>
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
      <a href="/">Go Home</a>
    </div>
  )
}
```

### Not Found ハンドリング

```typescript
// src/routes/__root.tsx
export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
})

function NotFoundPage() {
  const router = useRouter()

  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <p>The page "{router.state.location.pathname}" does not exist.</p>
      <Link to="/">Go Home</Link>
    </div>
  )
}
```

## パフォーマンス最適化

### プリロード設定

```typescript
// src/main.tsx
const router = createRouter({
  routeTree,
  defaultPreload: 'intent', // デフォルトのプリロード戦略
  defaultPreloadDelay: 100, // ホバー後100msでプリロード開始
})
```

### ルートごとのプリロード制御

```typescript
// src/routes/products/$productId.tsx
export const Route = createFileRoute('/products/$productId')({
  loader: async ({ params }) => {
    return { product: await fetchProduct(params.productId) }
  },
  // このルートのプリロード設定
  preload: true,
  preloadMaxAge: 10000, // 10秒間キャッシュ
  component: ProductPage,
})
```

### ローダーの最適化

```typescript
// src/routes/dashboard.tsx
export const Route = createFileRoute('/dashboard')({
  // 依存関係を明示的に宣言
  loaderDeps: ({ search }) => ({
    dateRange: search.dateRange,
  }),
  loader: async ({ deps }) => {
    // 依存関係が変わった場合のみ再実行
    const stats = await fetchStats(deps.dateRange)
    return { stats }
  },
  component: DashboardPage,
})
```

## 実践的なパターン

### ブレッドクラム

```typescript
// src/components/Breadcrumbs.tsx
import { useMatches, Link } from '@tanstack/react-router'

export function Breadcrumbs() {
  const matches = useMatches()

  const breadcrumbs = matches
    .filter((match) => match.context?.breadcrumb)
    .map((match) => ({
      title: match.context.breadcrumb,
      path: match.pathname,
    }))

  return (
    <nav>
      <Link to="/">Home</Link>
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.path}>
          {' / '}
          {index === breadcrumbs.length - 1 ? (
            <span>{crumb.title}</span>
          ) : (
            <Link to={crumb.path}>{crumb.title}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}

// src/routes/products/$productId.tsx
export const Route = createFileRoute('/products/$productId')({
  loader: async ({ params }) => {
    const product = await fetchProduct(params.productId)
    return { product }
  },
  context: ({ loaderData }) => ({
    breadcrumb: loaderData.product.name,
  }),
  component: ProductPage,
})
```

### ページタイトルの管理

```typescript
// src/lib/useSeo.ts
import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'

export function useSeo(title: string, description?: string) {
  const router = useRouter()

  useEffect(() => {
    document.title = `${title} | My App`

    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        document.head.appendChild(metaDescription)
      }
      metaDescription.setAttribute('content', description)
    }
  }, [title, description])
}

// src/routes/products/$productId.tsx
function ProductPage() {
  const { product } = Route.useLoaderData()
  useSeo(product.name, product.description)

  return <div>{/* ... */}</div>
}
```

### スクロール復元

```typescript
// src/main.tsx
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // スクロール位置の復元
  scrollRestoration: 'smooth',
})
```

## まとめ

TanStack Routerは、React向けの次世代型安全ルーターとして、以下の特徴を提供します。

- **完全な型安全性**: パラメータ、検索パラメータ、ナビゲーション全てが型推論される
- **ファイルベースルーティング**: 直感的なフォルダ構造でルートを定義
- **優れたDX**: 自動コード生成とDevToolsで開発体験が向上
- **高いパフォーマンス**: プリフェッチとコード分割で最適化
- **TanStack Query統合**: データローディングとキャッシングが効率的

従来のReact Routerと比較して、TypeScriptとの相性が格段に向上し、より保守しやすく、パフォーマンスの高いアプリケーションを構築できます。

新規プロジェクトではもちろん、既存プロジェクトでも段階的に移行することで、開発体験とアプリケーション品質を大きく改善できます。ぜひTanStack Routerを導入して、型安全なルーティングの恩恵を体験してください。
