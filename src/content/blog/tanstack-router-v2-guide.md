---
title: "TanStack Router v2完全ガイド: 型安全なファイルベースルーティング"
description: "TanStack Router v2の型安全なルーティング、ファイルベースルーティング、検索パラメータ、ローダー、エラーハンドリングなど実践的な活用方法を徹底解説します。TanStack Router・React・TypeScriptに関する実践情報。"
pubDate: "2025-11-18"
updatedDate: "2025-11-18"
tags: ["TanStack Router", "React", "TypeScript", "ルーティング", "型安全"]
---
TanStack Router v2は、React向けの完全型安全なルーティングライブラリです。React RouterやNext.jsのApp Routerとは異なり、エンドツーエンドの型安全性を重視した設計が特徴です。本記事では、v2の新機能と実践的な活用方法を解説します。

## TanStack Router v2の特徴

### 1. 完全な型安全性

TanStack Routerの最大の特徴は、ルート定義から検索パラメータ、ローダーデータまで、すべてが型推論される点です。

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

// 検索パラメータのスキーマ定義
const userSearchSchema = z.object({
  page: z.number().default(1),
  perPage: z.number().default(20),
  sort: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export const Route = createFileRoute('/users/')({
  // 検索パラメータのバリデーション
  validateSearch: userSearchSchema,

  // ローダー関数（データフェッチ）
  loader: async ({ context, search }) => {
    // search は型推論される
    const users = await context.api.users.list({
      page: search.page,
      perPage: search.perPage,
      sort: search.sort,
      order: search.order,
    })
    return { users }
  },

  // コンポーネント
  component: UsersPage,
})

function UsersPage() {
  const { users } = Route.useLoaderData() // 完全に型付けされる
  const search = Route.useSearch() // 検索パラメータも型付けされる
  const navigate = Route.useNavigate()

  const handleSortChange = (sort: 'name' | 'email' | 'createdAt') => {
    // navigate の引数も型チェックされる
    navigate({
      search: (prev) => ({ ...prev, sort, page: 1 }),
    })
  }

  return (
    <div>
      <h1>Users ({users.total})</h1>
      {/* UI実装 */}
    </div>
  )
}
```

### 2. ファイルベースルーティング

v2では、ファイルシステムベースのルーティングがデフォルトでサポートされます。

```
src/routes/
├── __root.tsx              # ルートレイアウト
├── index.tsx               # /
├── about.tsx               # /about
├── users/
│   ├── index.tsx           # /users
│   ├── $userId.tsx         # /users/:userId
│   └── $userId/
│       ├── edit.tsx        # /users/:userId/edit
│       └── posts/
│           └── $postId.tsx # /users/:userId/posts/:postId
├── _auth/                  # レイアウトルート（URLに含まれない）
│   ├── login.tsx           # /login
│   └── register.tsx        # /register
└── settings/
    ├── _layout.tsx         # /settings のレイアウト
    ├── profile.tsx         # /settings/profile
    └── security.tsx        # /settings/security
```

### 3. ルート生成の自動化

TanStack Routerは、ファイル構造から自動的にルート定義を生成します。

```bash
# プロジェクトセットアップ
npm install @tanstack/react-router
npm install -D @tanstack/router-vite-plugin

# vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite({
      // ルート定義の自動生成
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
  ],
})
```

開発中、ファイルを保存するたびに`routeTree.gen.ts`が自動更新され、完全な型情報が提供されます。

## 実践: SaaS管理画面の構築

実際のSaaS管理画面を例に、TanStack Router v2の活用方法を見ていきます。

### ルートレイアウト

```typescript
// src/routes/__root.tsx
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { QueryClient } from '@tanstack/react-query'

interface RouterContext {
  queryClient: QueryClient
  auth: {
    user: User | null
    isAuthenticated: boolean
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  )
}
```

### 認証ルート

```typescript
// src/routes/_auth.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  // 認証チェック
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
```

### ダイナミックルート

```typescript
// src/routes/_auth/projects/$projectId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const projectSearchSchema = z.object({
  tab: z.enum(['overview', 'settings', 'members']).default('overview'),
})

export const Route = createFileRoute('/_auth/projects/$projectId')({
  validateSearch: projectSearchSchema,

  // パラメータとコンテキストの両方を使用
  loader: async ({ params, context }) => {
    const project = await context.queryClient.ensureQueryData({
      queryKey: ['projects', params.projectId],
      queryFn: () => api.projects.get(params.projectId),
    })

    if (!project) {
      throw new Error('Project not found')
    }

    return { project }
  },

  component: ProjectPage,
})

function ProjectPage() {
  const { project } = Route.useLoaderData()
  const { projectId } = Route.useParams()
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <div>
      <h1>{project.name}</h1>

      <Tabs value={tab} onValueChange={(tab) => navigate({ search: { tab } })}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverview project={project} />
        </TabsContent>
        <TabsContent value="settings">
          <ProjectSettings project={project} />
        </TabsContent>
        <TabsContent value="members">
          <ProjectMembers projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### 検索パラメータの高度な活用

```typescript
// src/routes/_auth/analytics.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { subDays } from 'date-fns'

const analyticsSearchSchema = z.object({
  startDate: z.string().datetime().default(() =>
    subDays(new Date(), 30).toISOString()
  ),
  endDate: z.string().datetime().default(() =>
    new Date().toISOString()
  ),
  metrics: z.array(z.enum(['views', 'clicks', 'conversions'])).default([
    'views',
    'clicks',
  ]),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
})

export const Route = createFileRoute('/_auth/analytics')({
  validateSearch: analyticsSearchSchema,

  loaderDeps: ({ search }) => ({
    startDate: search.startDate,
    endDate: search.endDate,
    metrics: search.metrics,
    groupBy: search.groupBy,
  }),

  loader: async ({ context, deps }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ['analytics', deps],
      queryFn: () => api.analytics.query(deps),
    })
    return { data }
  },

  component: AnalyticsPage,
})

function AnalyticsPage() {
  const { data } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const updateDateRange = (startDate: Date, endDate: Date) => {
    navigate({
      search: (prev) => ({
        ...prev,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }),
    })
  }

  const toggleMetric = (metric: 'views' | 'clicks' | 'conversions') => {
    navigate({
      search: (prev) => ({
        ...prev,
        metrics: prev.metrics.includes(metric)
          ? prev.metrics.filter((m) => m !== metric)
          : [...prev.metrics, metric],
      }),
    })
  }

  return (
    <div>
      <DateRangePicker
        startDate={new Date(search.startDate)}
        endDate={new Date(search.endDate)}
        onChange={updateDateRange}
      />

      <MetricsSelector
        selected={search.metrics}
        onToggle={toggleMetric}
      />

      <Chart data={data} groupBy={search.groupBy} />
    </div>
  )
}
```

### エラーハンドリング

```typescript
// src/routes/_auth/projects/$projectId/settings.tsx
import { createFileRoute, ErrorComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/projects/$projectId/settings')({
  loader: async ({ params, context }) => {
    const [project, members] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ['projects', params.projectId],
        queryFn: () => api.projects.get(params.projectId),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ['projects', params.projectId, 'members'],
        queryFn: () => api.projects.members.list(params.projectId),
      }),
    ])

    // 権限チェック
    const currentUser = context.auth.user
    const isAdmin = members.some(
      (m) => m.userId === currentUser?.id && m.role === 'admin'
    )

    if (!isAdmin) {
      throw new Error('You do not have permission to access project settings')
    }

    return { project, members }
  },

  errorComponent: ({ error }) => (
    <ErrorComponent error={error} />
  ),

  component: ProjectSettingsPage,
})
```

### ローダーのキャンセル

```typescript
// src/routes/_auth/reports/$reportId.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/reports/$reportId')({
  loader: async ({ params, abortController }) => {
    // AbortSignalをfetchに渡す
    const report = await fetch(
      `/api/reports/${params.reportId}`,
      { signal: abortController.signal }
    ).then((res) => res.json())

    // 長時間かかる処理の場合、定期的にチェック
    for (const chunk of processReport(report)) {
      if (abortController.signal.aborted) {
        throw new Error('Report processing cancelled')
      }
      await processChunk(chunk)
    }

    return { report }
  },

  component: ReportPage,
})
```

## React Queryとの統合

TanStack RouterはReact Queryと完璧に統合できます。

```typescript
// src/routes/_auth/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'

// クエリオプションを定義
const dashboardQueryOptions = () =>
  queryOptions({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard.getData(),
    staleTime: 1000 * 60 * 5, // 5分
  })

export const Route = createFileRoute('/_auth/dashboard')({
  // ローダーでプリフェッチ
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(dashboardQueryOptions()),

  component: DashboardPage,
})

function DashboardPage() {
  // コンポーネント内でもクエリを使用可能
  const { data } = useSuspenseQuery(dashboardQueryOptions())

  return (
    <div>
      <h1>Dashboard</h1>
      <Stats data={data.stats} />
      <RecentActivity activities={data.activities} />
    </div>
  )
}
```

## パフォーマンス最適化

### 1. ルートのコード分割

```typescript
// src/routes/_auth/reports.tsx
import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const ReportsPage = lazy(() => import('../components/ReportsPage'))

export const Route = createFileRoute('/_auth/reports')({
  component: ReportsPage,
})
```

### 2. プリロード

```typescript
import { Link } from '@tanstack/react-router'

function Navigation() {
  return (
    <nav>
      <Link
        to="/dashboard"
        // ホバー時にプリロード
        preload="intent"
      >
        Dashboard
      </Link>
      <Link
        to="/analytics"
        // 即座にプリロード
        preload="viewport"
      >
        Analytics
      </Link>
    </nav>
  )
}
```

### 3. 検索パラメータの最適化

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const listSearchSchema = z.object({
  page: z.number().default(1),
  search: z.string().default(''),
})

export const Route = createFileRoute('/items')({
  validateSearch: listSearchSchema,

  // loaderDepsで依存を明示
  loaderDeps: ({ search }) => ({
    page: search.page,
    search: search.search,
  }),

  loader: async ({ deps }) => {
    // depsが変更された時のみ再実行
    return api.items.list(deps)
  },
})
```

## まとめ

TanStack Router v2は、型安全性とDXを重視した現代的なルーティングソリューションです。

**主な利点:**
- エンドツーエンドの型安全性
- ファイルベースルーティング
- 検索パラメータの強力なバリデーション
- React Queryとのシームレスな統合
- 優れたDX（開発者体験）

**適用シーン:**
- 大規模なSPAアプリケーション
- 複雑な状態管理が必要な管理画面
- 型安全性を重視するプロジェクト
- React QueryやZodを既に使用している場合

React RouterやNext.jsと比較して、型安全性においては圧倒的なアドバンテージがあります。TypeScriptの恩恵を最大限に受けたいプロジェクトには最適な選択肢です。
