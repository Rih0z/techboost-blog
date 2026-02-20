---
title: 'Nuxt.js 3完全ガイド：Vue.js製フルスタックフレームワーク'
description: 'Nuxt.js 3の基本から応用まで完全解説。SSR・SSG・ISR・Nitroエンジン・Composables・Pinia・Nuxt UI・APIルート・デプロイまで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
---

Nuxt.js 3はVue.jsをベースとしたフルスタックフレームワークであり、現代のWebアプリケーション開発における強力な選択肢のひとつとなっている。サーバーサイドレンダリング（SSR）・静的サイト生成（SSG）・APIルート・Composablesなど、生産性を高める機能が標準で備わっている。本記事では、Nuxt.js 3の全体像から実践的な実装パターンまでを体系的に解説する。

## 目次

1. Nuxt.js 3とは・Next.jsとの比較
2. セットアップとプロジェクト作成
3. ファイルベースルーティング
4. レンダリングモード（SSR・SSG・ISR・SPA）
5. Composables（useAsyncData・useFetch・useState）
6. Nitroサーバー（APIルート）
7. Pinia状態管理
8. Nuxt UIとモジュールエコシステム
9. データフェッチング戦略
10. ミドルウェアとルートガード
11. Nuxt Content（マークダウン駆動CMS）
12. SEO最適化
13. テスト（Vitest・Nuxt Testing Utils）
14. デプロイ（Vercel・Netlify・Cloudflare）

---

## 1. Nuxt.js 3とは・Next.jsとの比較

### Nuxt.js 3の概要

Nuxt.js 3（以下「Nuxt 3」）は、Vue.js 3をコアに据えたオープンソースのフルスタックフレームワークである。2022年11月にリリースされた正式版は、Vue 3のComposition APIとTypeScriptを全面採用し、開発者体験（DX）を大幅に向上させた。

Nuxt 3の主な特徴を以下に挙げる。

- **Nitroエンジン**: ユニバーサルなサーバーエンジンにより、Vercel・Netlify・Cloudflare Workersなどあらゆるデプロイターゲットへのデプロイが可能
- **自動インポート**: コンポーネント・Composables・ユーティリティが自動インポートされ、import文の記述が不要
- **TypeScriptファースト**: 設定ファイルを含めてTypeScriptで記述可能
- **Viteベースのビルド**: 高速なHot Module Replacement（HMR）を実現
- **ハイブリッドレンダリング**: ページごとに異なるレンダリングモードを設定可能

### Next.jsとの技術的比較

ReactベースのNext.jsとVueベースのNuxt 3は、設計思想が似ているが、いくつかの重要な違いがある。

| 機能 | Nuxt 3 | Next.js 14/15 |
|------|--------|---------------|
| ベースフレームワーク | Vue 3 | React 18/19 |
| サーバーエンジン | Nitro | Node.js / Edge Runtime |
| 状態管理 | Pinia（公式推奨） | Zustand / Redux Toolkit |
| スタイリング | CSS Modules / Tailwind CSS | CSS Modules / Tailwind CSS |
| データフェッチング | useFetch / useAsyncData | Server Components / fetch |
| ルーティング | ファイルベース（pages/） | ファイルベース（app/ or pages/） |
| API Routes | server/api/ | app/api/ or pages/api/ |
| 自動インポート | 標準搭載 | 手動import |
| TypeScript | フルサポート | フルサポート |

Nuxt 3の大きな優位性のひとつは自動インポートシステムである。コンポーネントやComposablesを明示的にimportする必要がなく、コードの冗長性が大幅に削減される。

### Nuxt 3のアーキテクチャ

Nuxt 3は大きく3つの層から構成される。

**1. アプリケーション層**
- `pages/`: ファイルベースルーティング
- `components/`: Vueコンポーネント（自動インポート）
- `composables/`: Composition APIロジック（自動インポート）
- `layouts/`: ページレイアウト
- `plugins/`: アプリケーションプラグイン

**2. サーバー層（Nitro）**
- `server/api/`: APIエンドポイント
- `server/middleware/`: サーバーミドルウェア
- `server/routes/`: カスタムサーバールート

**3. 設定・ビルド層**
- `nuxt.config.ts`: フレームワーク設定
- `.nuxt/`: 自動生成ファイル
- `public/`: 静的アセット

---

## 2. セットアップとプロジェクト作成

### 必要な環境

Nuxt 3を使用するには以下の環境が必要である。

- Node.js 18.x 以上（推奨：20.x LTS）
- npm / pnpm / yarn / bun のいずれか

### 新規プロジェクトの作成

公式CLIツール`nuxi`を使ってプロジェクトを作成する。

```bash
# nuxi を使ったプロジェクト作成
npx nuxi@latest init my-nuxt-app

# または pnpm を使う場合
pnpm dlx nuxi@latest init my-nuxt-app

# プロジェクトディレクトリに移動
cd my-nuxt-app

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

開発サーバーは通常`http://localhost:3000`で起動する。

### プロジェクト構造の全体像

作成直後のプロジェクト構造は以下のようになっている。

```
my-nuxt-app/
├── .nuxt/               # 自動生成（gitignore対象）
├── node_modules/
├── public/              # 静的ファイル
│   └── favicon.ico
├── server/              # Nitroサーバー
│   └── tsconfig.json
├── app.vue              # ルートコンポーネント
├── nuxt.config.ts       # Nuxt設定
├── package.json
├── tsconfig.json
└── .gitignore
```

実際の開発では以下のディレクトリを追加していく。

```
my-nuxt-app/
├── assets/              # CSSや画像（ビルド時に処理）
├── components/          # Vueコンポーネント（自動インポート）
├── composables/         # Composables（自動インポート）
├── layouts/             # レイアウトコンポーネント
├── middleware/          # クライアントサイドミドルウェア
├── pages/               # ファイルベースルーティング
├── plugins/             # プラグイン
├── server/
│   ├── api/             # APIルート
│   ├── middleware/      # サーバーミドルウェア
│   └── utils/           # サーバーユーティリティ
├── stores/              # Piniaストア
└── utils/               # ユーティリティ関数（自動インポート）
```

### nuxt.config.ts の基本設定

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // 開発ツール（開発時のみ有効）
  devtools: { enabled: true },

  // TypeScript設定
  typescript: {
    strict: true,
    typeCheck: true,
  },

  // CSSフレームワークの設定
  css: ['~/assets/css/main.css'],

  // モジュール
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxt/content',
    '@nuxt/image',
  ],

  // ランタイム設定（環境変数）
  runtimeConfig: {
    // サーバーサイドのみ利用可能（秘密情報）
    apiSecret: process.env.API_SECRET,
    // クライアントサイドでも利用可能
    public: {
      apiBase: process.env.API_BASE_URL || 'https://api.example.com',
      appName: 'My Nuxt App',
    },
  },

  // アプリケーション設定
  app: {
    head: {
      title: 'My Nuxt App',
      meta: [
        { name: 'description', content: 'Nuxt 3 Application' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  // ルートごとのレンダリング設定（ハイブリッドレンダリング）
  routeRules: {
    '/': { prerender: true },
    '/blog/**': { swr: 3600 },
    '/admin/**': { ssr: false },
    '/api/**': { cors: true },
  },
})
```

### app.vue の構成

```vue
<!-- app.vue -->
<template>
  <div>
    <!-- NuxtLayout はレイアウトシステムを有効化する -->
    <NuxtLayout>
      <!-- NuxtPage はページコンポーネントをレンダリングする -->
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
```

---

## 3. ファイルベースルーティング

### pages/ ディレクトリによるルーティング

Nuxt 3では`pages/`ディレクトリのファイル構造が自動的にルーティングに変換される。

```
pages/
├── index.vue          → /
├── about.vue          → /about
├── contact.vue        → /contact
├── blog/
│   ├── index.vue      → /blog
│   └── [slug].vue     → /blog/:slug
├── users/
│   ├── index.vue      → /users
│   └── [id]/
│       ├── index.vue  → /users/:id
│       └── posts.vue  → /users/:id/posts
└── [...slug].vue      → /* (キャッチオール)
```

### 基本的なページコンポーネント

```vue
<!-- pages/index.vue -->
<template>
  <main>
    <h1>ホームページ</h1>
    <p>Nuxt 3へようこそ</p>

    <!-- NuxtLink は vue-router の RouterLink の代替 -->
    <NuxtLink to="/about">Aboutページへ</NuxtLink>
    <NuxtLink to="/blog">ブログ一覧へ</NuxtLink>
  </main>
</template>

<script setup lang="ts">
// definePageMeta でページのメタ情報を設定
definePageMeta({
  title: 'ホーム',
  layout: 'default',
})
</script>
```

### 動的ルート

```vue
<!-- pages/blog/[slug].vue -->
<template>
  <article>
    <h1>{{ post?.title }}</h1>
    <p>{{ post?.body }}</p>
  </article>
</template>

<script setup lang="ts">
// useRoute でルートパラメータにアクセス
const route = useRoute()
const slug = computed(() => route.params.slug as string)

// useFetch でAPIからデータを取得
const { data: post, error } = await useFetch(`/api/posts/${slug.value}`)

// エラーハンドリング
if (error.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '記事が見つかりません',
  })
}

// SEOメタ情報の設定
useSeoMeta({
  title: post.value?.title,
  description: post.value?.excerpt,
})
</script>
```

### ネストされたルート（Nested Routes）

```vue
<!-- pages/users/[id].vue - 親ルート -->
<template>
  <div>
    <h1>ユーザープロフィール: {{ user?.name }}</h1>
    <nav>
      <NuxtLink :to="`/users/${userId}`">プロフィール</NuxtLink>
      <NuxtLink :to="`/users/${userId}/posts`">投稿一覧</NuxtLink>
    </nav>
    <!-- 子ルートがここにレンダリングされる -->
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const userId = computed(() => route.params.id as string)

const { data: user } = await useFetch(`/api/users/${userId.value}`)
</script>
```

### キャッチオールルートと404ページ

```vue
<!-- pages/[...slug].vue - キャッチオール -->
<template>
  <div>
    <h1>ページが見つかりません</h1>
    <p>リクエストされたパス: {{ $route.params.slug }}</p>
    <NuxtLink to="/">ホームへ戻る</NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'error',
})
</script>
```

```vue
<!-- error.vue - グローバルエラーページ -->
<template>
  <div>
    <h1>{{ error.statusCode }}: {{ error.statusMessage }}</h1>
    <button @click="handleError">ホームへ戻る</button>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const handleError = () => clearError({ redirect: '/' })
</script>
```

### プログラムによるナビゲーション

```typescript
// composables/useNavigation.ts
export const useNavigation = () => {
  const router = useRouter()
  const route = useRoute()

  // 前のページへ戻る
  const goBack = () => router.back()

  // クエリパラメータを更新
  const updateQuery = (params: Record<string, string>) => {
    router.push({
      query: {
        ...route.query,
        ...params,
      },
    })
  }

  // ページ遷移
  const navigateTo = async (path: string) => {
    await router.push(path)
  }

  return {
    goBack,
    updateQuery,
    navigateTo,
  }
}
```

---

## 4. レンダリングモード（SSR・SSG・ISR・SPA）

### サーバーサイドレンダリング（SSR）

SSRはリクエストのたびにサーバーでHTMLを生成する方式である。SEOが重要なページや、リアルタイムデータを表示するページに適している。

```typescript
// nuxt.config.ts - SSRを有効化（デフォルト）
export default defineNuxtConfig({
  ssr: true, // デフォルトはtrue
})
```

```vue
<!-- pages/news/[id].vue - SSRページの例 -->
<template>
  <article>
    <h1>{{ article.title }}</h1>
    <time>{{ formattedDate }}</time>
    <div v-html="article.content" />
  </article>
</template>

<script setup lang="ts">
const route = useRoute()

// サーバーサイドでデータを取得
const { data: article } = await useAsyncData(
  `article-${route.params.id}`,
  () => $fetch(`/api/articles/${route.params.id}`)
)

const formattedDate = computed(() => {
  if (!article.value?.publishedAt) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.value.publishedAt))
})
</script>
```

### 静的サイト生成（SSG）

SSGはビルド時に全ページのHTMLを事前生成する方式である。高いパフォーマンスとCDNによるキャッシュが可能で、ブログや企業サイトに適している。

```typescript
// nuxt.config.ts - SSG設定
export default defineNuxtConfig({
  // 全体をSSGにする場合
  // nitro: {
  //   prerender: {
  //     crawlLinks: true,
  //     routes: ['/'],
  //   },
  // },

  // ページごとの設定（推奨）
  routeRules: {
    '/': { prerender: true },
    '/about': { prerender: true },
    '/blog/**': { prerender: true },
  },
})
```

```vue
<!-- pages/blog/index.vue - SSGブログ一覧 -->
<template>
  <div>
    <h1>ブログ記事一覧</h1>
    <ul>
      <li v-for="post in posts" :key="post.id">
        <NuxtLink :to="`/blog/${post.slug}`">
          {{ post.title }}
        </NuxtLink>
        <span>{{ post.publishedAt }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// ビルド時に実行される
const { data: posts } = await useAsyncData('blog-posts', () =>
  $fetch('/api/posts')
)
</script>
```

### インクリメンタル静的再生成（ISR/SWR）

ISRはSSGとSSRのハイブリッドアプローチで、設定した時間ごとにバックグラウンドでページを再生成する。

```typescript
// nuxt.config.ts - ISR/SWR設定
export default defineNuxtConfig({
  routeRules: {
    // 1時間ごとに再生成（SWR: Stale-While-Revalidate）
    '/blog/**': { swr: 3600 },

    // 24時間のキャッシュ（ISR的な動作）
    '/products/**': { isr: 86400 },

    // 完全なSSR（キャッシュなし）
    '/dashboard': { ssr: true },

    // CSR（クライアントサイドレンダリング）
    '/admin/**': { ssr: false },

    // 静的事前生成
    '/': { prerender: true },
  },
})
```

### SPAモード

認証が必要な管理画面などには、クライアントサイドのみでレンダリングするSPAモードが適している。

```typescript
// nuxt.config.ts - SPAモードの設定
export default defineNuxtConfig({
  routeRules: {
    '/admin/**': {
      ssr: false,
    },
  },
})
```

```vue
<!-- pages/admin/dashboard.vue - SPAページ -->
<template>
  <div>
    <ClientOnly>
      <AdminDashboard :data="dashboardData" />
      <template #fallback>
        <div>読み込み中...</div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

// クライアントサイドでのみ実行
const { data: dashboardData } = await useFetch('/api/admin/dashboard', {
  // SSRを無効化
  server: false,
})
</script>
```

---

## 5. Composables（useAsyncData・useFetch・useState）

### Composablesの自動インポート

Nuxt 3では`composables/`ディレクトリに配置したファイルが自動インポートされる。

```
composables/
├── useAuth.ts
├── useApi.ts
├── usePagination.ts
└── useToast.ts
```

### useFetch

`useFetch`はNuxt 3の基本的なデータフェッチングComposableである。

```typescript
// composables/useApi.ts
export const useApi = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase

  // GET リクエスト
  const get = <T>(path: string, options?: Parameters<typeof useFetch>[1]) => {
    return useFetch<T>(`${baseURL}${path}`, {
      ...options,
      method: 'GET',
    })
  }

  // POST リクエスト
  const post = <T>(
    path: string,
    body: Record<string, unknown>,
    options?: Parameters<typeof useFetch>[1]
  ) => {
    return useFetch<T>(`${baseURL}${path}`, {
      ...options,
      method: 'POST',
      body,
    })
  }

  return { get, post }
}
```

```vue
<!-- pages/products/index.vue -->
<template>
  <div>
    <!-- ローディング状態 -->
    <div v-if="pending">読み込み中...</div>

    <!-- エラー状態 -->
    <div v-else-if="error">
      エラーが発生しました: {{ error.message }}
    </div>

    <!-- データ表示 -->
    <ul v-else>
      <li v-for="product in products" :key="product.id">
        {{ product.name }} - ¥{{ product.price.toLocaleString() }}
      </li>
    </ul>

    <!-- 再フェッチボタン -->
    <button @click="refresh">更新</button>
  </div>
</template>

<script setup lang="ts">
interface Product {
  id: number
  name: string
  price: number
  category: string
}

// useFetch の基本的な使い方
const {
  data: products,
  pending,
  error,
  refresh,
} = await useFetch<Product[]>('/api/products', {
  // キャッシュキー
  key: 'products-list',
  // デフォルト値
  default: () => [],
  // ウォッチするreactive値（変化時に再フェッチ）
  // watch: [selectedCategory],
  // レスポンスの変換
  transform: (data) => data.filter((p) => p.price > 0),
  // ヘッダー
  headers: {
    'Content-Type': 'application/json',
  },
})
</script>
```

### useAsyncData

`useAsyncData`は`useFetch`より低レベルなAPIで、任意の非同期処理に使用できる。

```typescript
// composables/usePosts.ts
export interface Post {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  publishedAt: string
  author: {
    name: string
    avatar: string
  }
  tags: string[]
}

export const usePosts = () => {
  // 記事一覧の取得
  const fetchPosts = async (params?: {
    page?: number
    limit?: number
    tag?: string
  }) => {
    return useAsyncData(
      `posts-${JSON.stringify(params)}`,
      async () => {
        const queryParams = new URLSearchParams()
        if (params?.page) queryParams.set('page', String(params.page))
        if (params?.limit) queryParams.set('limit', String(params.limit))
        if (params?.tag) queryParams.set('tag', params.tag)

        return $fetch<{
          posts: Post[]
          total: number
          page: number
          totalPages: number
        }>(`/api/posts?${queryParams.toString()}`)
      },
      {
        default: () => ({
          posts: [],
          total: 0,
          page: 1,
          totalPages: 0,
        }),
      }
    )
  }

  // 特定記事の取得
  const fetchPost = (slug: string) => {
    return useAsyncData(`post-${slug}`, () =>
      $fetch<Post>(`/api/posts/${slug}`)
    )
  }

  return { fetchPosts, fetchPost }
}
```

### useState

`useState`はSSRと互換性のあるreactive状態管理Composableである。

```typescript
// composables/useTheme.ts
export type Theme = 'light' | 'dark' | 'system'

export const useTheme = () => {
  // useState はサーバーとクライアントで状態が共有される
  const theme = useState<Theme>('theme', () => 'system')

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
    if (process.client) {
      localStorage.setItem('theme', newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  }

  const resolvedTheme = computed(() => {
    if (theme.value === 'system') {
      if (process.client) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
      }
      return 'light'
    }
    return theme.value
  })

  return {
    theme: readonly(theme),
    resolvedTheme,
    setTheme,
  }
}
```

```typescript
// composables/useAuth.ts
export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'editor'
  avatar?: string
}

export const useAuth = () => {
  const user = useState<User | null>('auth-user', () => null)
  const isLoggedIn = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.role === 'admin')

  const login = async (email: string, password: string) => {
    const { data, error } = await useFetch<{ user: User; token: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: { email, password },
      }
    )

    if (error.value) throw error.value

    if (data.value) {
      user.value = data.value.user
      // cookieにトークンを保存
      const token = useCookie('auth-token', {
        maxAge: 60 * 60 * 24 * 7, // 7日間
        secure: true,
        sameSite: 'strict',
      })
      token.value = data.value.token
    }
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    const token = useCookie('auth-token')
    token.value = null
    await navigateTo('/login')
  }

  const fetchCurrentUser = async () => {
    const { data } = await useFetch<User>('/api/auth/me')
    if (data.value) {
      user.value = data.value
    }
  }

  return {
    user: readonly(user),
    isLoggedIn,
    isAdmin,
    login,
    logout,
    fetchCurrentUser,
  }
}
```

### カスタムComposablesの実践例

```typescript
// composables/usePagination.ts
export interface PaginationOptions {
  initialPage?: number
  pageSize?: number
  totalItems?: number
}

export const usePagination = (options: PaginationOptions = {}) => {
  const { initialPage = 1, pageSize = 10, totalItems = 0 } = options

  const currentPage = ref(initialPage)
  const itemsPerPage = ref(pageSize)
  const total = ref(totalItems)

  const totalPages = computed(() =>
    Math.ceil(total.value / itemsPerPage.value)
  )

  const hasPreviousPage = computed(() => currentPage.value > 1)
  const hasNextPage = computed(() => currentPage.value < totalPages.value)

  const previousPage = () => {
    if (hasPreviousPage.value) {
      currentPage.value--
    }
  }

  const nextPage = () => {
    if (hasNextPage.value) {
      currentPage.value++
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  const offset = computed(
    () => (currentPage.value - 1) * itemsPerPage.value
  )

  return {
    currentPage,
    itemsPerPage,
    total,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    offset,
    previousPage,
    nextPage,
    goToPage,
  }
}
```

---

## 6. Nitroサーバー（APIルート）

### Nitroエンジンの概要

Nitroは、Nuxt 3に組み込まれたサーバーエンジンである。以下の特徴を持つ。

- **ユニバーサルデプロイ**: Node.js・Deno・Cloudflare Workers・AWS Lambda等に対応
- **ファイルベースルーティング**: `server/api/`のファイル構造がAPIルートになる
- **自動コード分割**: 必要な部分だけをバンドル
- **Hot Module Replacement**: 開発時の高速な更新

### APIルートの作成

```typescript
// server/api/hello.get.ts
// GET /api/hello
export default defineEventHandler((event) => {
  return {
    message: 'Hello from Nuxt 3!',
    timestamp: new Date().toISOString(),
  }
})
```

```typescript
// server/api/posts/index.get.ts
// GET /api/posts
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  tag: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  // クエリパラメータのバリデーション
  const query = await getValidatedQuery(event, querySchema.parse)

  // データベースやCMSからデータを取得（例）
  const allPosts = await fetchPostsFromDB({
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    tag: query.tag,
  })

  return {
    posts: allPosts.items,
    total: allPosts.total,
    page: query.page,
    totalPages: Math.ceil(allPosts.total / query.limit),
  }
})
```

```typescript
// server/api/posts/[id].get.ts
// GET /api/posts/:id
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID は必須です',
    })
  }

  const post = await fetchPostById(id)

  if (!post) {
    throw createError({
      statusCode: 404,
      statusMessage: '記事が見つかりません',
    })
  }

  return post
})
```

```typescript
// server/api/posts/index.post.ts
// POST /api/posts
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
  publishedAt: z.string().datetime().optional(),
})

export default defineEventHandler(async (event) => {
  // 認証チェック
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: '認証が必要です',
    })
  }

  // リクエストボディのバリデーション
  const body = await readValidatedBody(event, createPostSchema.parse)

  const newPost = await createPost({
    ...body,
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
  })

  setResponseStatus(event, 201)
  return newPost
})
```

### サーバーミドルウェア

```typescript
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  // /api/admin パスのみ認証チェック
  if (!event.path.startsWith('/api/admin')) {
    return
  }

  const token = getCookie(event, 'auth-token')
    || getHeader(event, 'authorization')?.replace('Bearer ', '')

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: '認証が必要です',
    })
  }

  try {
    // JWTトークンを検証
    const payload = await verifyJWT(token)
    // イベントコンテキストにユーザー情報を設定
    event.context.user = payload
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: '無効なトークンです',
    })
  }
})
```

```typescript
// server/middleware/rate-limit.ts
// シンプルなレートリミットの実装
const requestCounts = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler((event) => {
  // APIルートのみ対象
  if (!event.path.startsWith('/api')) return

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  const windowMs = 60 * 1000 // 1分
  const maxRequests = 100

  const current = requestCounts.get(ip)

  if (!current || current.resetAt < now) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs })
    return
  }

  if (current.count >= maxRequests) {
    throw createError({
      statusCode: 429,
      statusMessage: 'リクエストが多すぎます。しばらく待ってから再試行してください',
    })
  }

  current.count++
})
```

### サーバーユーティリティ

```typescript
// server/utils/database.ts
// データベース接続ユーティリティ
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

let db: ReturnType<typeof drizzle> | null = null

export const getDatabase = () => {
  if (!db) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })
    db = drizzle(pool)
  }
  return db
}
```

```typescript
// server/utils/jwt.ts
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)

export const signJWT = async (payload: Record<string, unknown>) => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export const verifyJWT = async (token: string) => {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload
}
```

---

## 7. Pinia状態管理

### Piniaの概要

PiniaはVue 3公式の状態管理ライブラリである。Vuexの後継として位置づけられており、TypeScriptとの親和性が高く、シンプルなAPIを提供する。

### インストールと設定

```bash
npm install pinia @pinia/nuxt
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
  ],
  // Piniaプラグインを自動インポートする場合
  pinia: {
    storesDirs: ['./stores/**'],
  },
})
```

### ストアの作成

```typescript
// stores/useCartStore.ts
import { defineStore } from 'pinia'

export interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  imageUrl: string
}

export const useCartStore = defineStore('cart', () => {
  // State
  const items = ref<CartItem[]>([])
  const couponCode = ref<string | null>(null)
  const discountRate = ref(0)

  // Getters
  const itemCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )

  const discount = computed(() => subtotal.value * discountRate.value)

  const total = computed(() => subtotal.value - discount.value)

  const isEmpty = computed(() => items.value.length === 0)

  // Actions
  const addItem = (product: Omit<CartItem, 'quantity'>) => {
    const existingItem = items.value.find((item) => item.id === product.id)

    if (existingItem) {
      existingItem.quantity++
    } else {
      items.value.push({ ...product, quantity: 1 })
    }
  }

  const removeItem = (productId: number) => {
    const index = items.value.findIndex((item) => item.id === productId)
    if (index !== -1) {
      items.value.splice(index, 1)
    }
  }

  const updateQuantity = (productId: number, quantity: number) => {
    const item = items.value.find((item) => item.id === productId)
    if (item) {
      if (quantity <= 0) {
        removeItem(productId)
      } else {
        item.quantity = quantity
      }
    }
  }

  const applyCoupon = async (code: string) => {
    const { data, error } = await useFetch<{ discountRate: number }>(
      `/api/coupons/${code}`
    )

    if (error.value) {
      throw new Error('無効なクーポンコードです')
    }

    couponCode.value = code
    discountRate.value = data.value?.discountRate ?? 0
  }

  const clearCart = () => {
    items.value = []
    couponCode.value = null
    discountRate.value = 0
  }

  return {
    items,
    couponCode,
    itemCount,
    subtotal,
    discount,
    total,
    isEmpty,
    addItem,
    removeItem,
    updateQuantity,
    applyCoupon,
    clearCart,
  }
}, {
  // ブラウザのlocalStorageに状態を永続化
  persist: true,
})
```

### ストアをコンポーネントで使用する

```vue
<!-- components/CartSidebar.vue -->
<template>
  <aside>
    <h2>ショッピングカート ({{ cartStore.itemCount }})</h2>

    <div v-if="cartStore.isEmpty">
      カートに商品がありません
    </div>

    <ul v-else>
      <li v-for="item in cartStore.items" :key="item.id">
        <img :src="item.imageUrl" :alt="item.name" />
        <div>
          <p>{{ item.name }}</p>
          <p>¥{{ item.price.toLocaleString() }}</p>
        </div>
        <div>
          <button @click="cartStore.updateQuantity(item.id, item.quantity - 1)">
            -
          </button>
          <span>{{ item.quantity }}</span>
          <button @click="cartStore.updateQuantity(item.id, item.quantity + 1)">
            +
          </button>
        </div>
        <button @click="cartStore.removeItem(item.id)">削除</button>
      </li>
    </ul>

    <div>
      <p>小計: ¥{{ cartStore.subtotal.toLocaleString() }}</p>
      <p v-if="cartStore.discount > 0">
        割引: -¥{{ cartStore.discount.toLocaleString() }}
      </p>
      <p>合計: ¥{{ cartStore.total.toLocaleString() }}</p>
    </div>

    <button :disabled="cartStore.isEmpty" @click="proceedToCheckout">
      レジへ進む
    </button>
  </aside>
</template>

<script setup lang="ts">
const cartStore = useCartStore()

const proceedToCheckout = async () => {
  await navigateTo('/checkout')
}
</script>
```

### Piniaストアの永続化（pinia-plugin-persistedstate）

```bash
npm install pinia-plugin-persistedstate
```

```typescript
// plugins/persistedstate.ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.$pinia.use(piniaPluginPersistedstate)
})
```

---

## 8. Nuxt UIとモジュールエコシステム

### Nuxt UIの概要

Nuxt UIは、Tailwind CSSをベースにした公式UIコンポーネントライブラリである。

```bash
npm install @nuxt/ui
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
})
```

### Nuxt UIコンポーネントの使用

```vue
<!-- pages/contact.vue -->
<template>
  <UContainer>
    <UCard>
      <template #header>
        <h2>お問い合わせ</h2>
      </template>

      <UForm :schema="schema" :state="formState" @submit="onSubmit">
        <UFormGroup label="お名前" name="name" required>
          <UInput
            v-model="formState.name"
            placeholder="山田 太郎"
          />
        </UFormGroup>

        <UFormGroup label="メールアドレス" name="email" required>
          <UInput
            v-model="formState.email"
            type="email"
            placeholder="taro@example.com"
          />
        </UFormGroup>

        <UFormGroup label="メッセージ" name="message" required>
          <UTextarea
            v-model="formState.message"
            rows="5"
            placeholder="お問い合わせ内容を入力してください"
          />
        </UFormGroup>

        <UButton type="submit" :loading="isSubmitting">
          送信する
        </UButton>
      </UForm>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('正しいメールアドレスを入力してください'),
  message: z.string().min(10, '10文字以上入力してください'),
})

type FormState = z.infer<typeof schema>

const formState = reactive<FormState>({
  name: '',
  email: '',
  message: '',
})

const isSubmitting = ref(false)
const toast = useToast()

const onSubmit = async () => {
  isSubmitting.value = true

  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: formState,
    })

    toast.add({
      title: '送信完了',
      description: 'お問い合わせを受け付けました',
      color: 'green',
    })

    // フォームをリセット
    Object.assign(formState, { name: '', email: '', message: '' })
  } catch (error) {
    toast.add({
      title: 'エラー',
      description: '送信に失敗しました。再試行してください',
      color: 'red',
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>
```

### 主要なNuxtモジュール一覧

| モジュール | パッケージ | 用途 |
|-----------|-----------|------|
| @nuxt/ui | `@nuxt/ui` | UIコンポーネントライブラリ |
| @nuxtjs/tailwindcss | `@nuxtjs/tailwindcss` | Tailwind CSS統合 |
| @pinia/nuxt | `@pinia/nuxt` | 状態管理 |
| @nuxt/content | `@nuxt/content` | マークダウン駆動CMS |
| @nuxt/image | `@nuxt/image` | 画像最適化 |
| @nuxtjs/i18n | `@nuxtjs/i18n` | 国際化 |
| @nuxt/icon | `@nuxt/icon` | アイコンシステム |
| @sentry/nuxt | `@sentry/nuxt` | エラー監視 |
| nuxt-security | `nuxt-security` | セキュリティヘッダー |

### @nuxt/image の使用

```vue
<!-- components/ProductCard.vue -->
<template>
  <div>
    <!-- NuxtImg は自動的に画像を最適化する -->
    <NuxtImg
      :src="product.imageUrl"
      :alt="product.name"
      width="400"
      height="300"
      format="webp"
      quality="80"
      loading="lazy"
      sizes="sm:100vw md:50vw lg:400px"
    />
    <h3>{{ product.name }}</h3>
    <p>¥{{ product.price.toLocaleString() }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  product: {
    id: number
    name: string
    price: number
    imageUrl: string
  }
}>()
</script>
```

### @nuxtjs/i18n の設定

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    locales: [
      { code: 'ja', name: '日本語', file: 'ja.json' },
      { code: 'en', name: 'English', file: 'en.json' },
    ],
    defaultLocale: 'ja',
    langDir: 'locales/',
    strategy: 'prefix_except_default',
  },
})
```

```json
// locales/ja.json
{
  "nav": {
    "home": "ホーム",
    "about": "会社情報",
    "products": "商品",
    "contact": "お問い合わせ"
  },
  "common": {
    "loading": "読み込み中...",
    "error": "エラーが発生しました",
    "retry": "再試行"
  }
}
```

---

## 9. データフェッチング戦略

### $fetch の使用

`$fetch`はNuxt 3に組み込まれた`ofetch`ライブラリのラッパーで、APIリクエストを行う際の基本ツールである。

```typescript
// composables/useProducts.ts
export interface Product {
  id: number
  name: string
  price: number
  stock: number
  category: string
}

export const useProducts = () => {
  const products = useState<Product[]>('products', () => [])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const loadProducts = async (category?: string) => {
    isLoading.value = true
    error.value = null

    try {
      const url = category ? `/api/products?category=${category}` : '/api/products'
      products.value = await $fetch<Product[]>(url)
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Unknown error')
    } finally {
      isLoading.value = false
    }
  }

  const createProduct = async (data: Omit<Product, 'id'>) => {
    const newProduct = await $fetch<Product>('/api/products', {
      method: 'POST',
      body: data,
    })
    products.value = [...products.value, newProduct]
    return newProduct
  }

  const updateProduct = async (id: number, data: Partial<Product>) => {
    const updated = await $fetch<Product>(`/api/products/${id}`, {
      method: 'PATCH',
      body: data,
    })
    products.value = products.value.map((p) =>
      p.id === id ? updated : p
    )
    return updated
  }

  const deleteProduct = async (id: number) => {
    await $fetch(`/api/products/${id}`, { method: 'DELETE' })
    products.value = products.value.filter((p) => p.id !== id)
  }

  return {
    products: readonly(products),
    isLoading: readonly(isLoading),
    error: readonly(error),
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  }
}
```

### データフェッチングのベストプラクティス

```vue
<!-- pages/blog/index.vue - ページネーション付きブログ一覧 -->
<template>
  <div>
    <h1>ブログ</h1>

    <!-- カテゴリフィルター -->
    <div>
      <button
        v-for="cat in categories"
        :key="cat"
        :class="{ active: selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <!-- 記事一覧 -->
    <div v-if="pending">読み込み中...</div>
    <div v-else-if="error">エラー: {{ error.message }}</div>
    <div v-else>
      <PostCard
        v-for="post in data?.posts"
        :key="post.id"
        :post="post"
      />
    </div>

    <!-- ページネーション -->
    <div v-if="data">
      <button :disabled="page <= 1" @click="page--">前へ</button>
      <span>{{ page }} / {{ data.totalPages }}</span>
      <button :disabled="page >= data.totalPages" @click="page++">次へ</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const selectedCategory = ref<string>('all')
const page = ref(1)
const categories = ['all', 'tech', 'design', 'business']

// selectedCategory または page が変わると自動的に再フェッチ
const { data, pending, error } = await useAsyncData(
  'blog-posts',
  () =>
    $fetch('/api/posts', {
      query: {
        category: selectedCategory.value !== 'all'
          ? selectedCategory.value
          : undefined,
        page: page.value,
        limit: 10,
      },
    }),
  {
    // ウォッチするreactive値
    watch: [selectedCategory, page],
    // カテゴリが変わったらページを1にリセット
    onRequest() {
      if (selectedCategory.value) page.value = 1
    },
  }
)
</script>
```

### キャッシュ戦略

```typescript
// composables/useCache.ts
export const useCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number // キャッシュ有効期間（秒）
    staleWhileRevalidate?: boolean
  } = {}
) => {
  const { ttl = 300, staleWhileRevalidate = true } = options

  return useAsyncData<T>(key, fetcher, {
    getCachedData: (key, nuxtApp) => {
      // キャッシュからデータを取得
      const cached = nuxtApp.payload.data[key]
      if (!cached) return undefined

      // TTLチェック
      const cacheTime = nuxtApp.payload.data[`${key}_time`] as number
      if (cacheTime && Date.now() - cacheTime > ttl * 1000) {
        if (!staleWhileRevalidate) return undefined
        // SWR: 古いデータを返しつつバックグラウンドで更新
      }

      return cached
    },
  })
}
```

---

## 10. ミドルウェアとルートガード

### クライアントサイドミドルウェア

```typescript
// middleware/auth.ts - 認証ミドルウェア
export default defineNuxtRouteMiddleware((to, from) => {
  const { isLoggedIn } = useAuth()

  // 未認証ユーザーをログインページへリダイレクト
  if (!isLoggedIn.value) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    })
  }
})
```

```typescript
// middleware/admin.ts - 管理者ミドルウェア
export default defineNuxtRouteMiddleware(() => {
  const { isAdmin, isLoggedIn } = useAuth()

  if (!isLoggedIn.value) {
    return navigateTo('/login')
  }

  if (!isAdmin.value) {
    throw createError({
      statusCode: 403,
      statusMessage: 'このページへのアクセス権限がありません',
    })
  }
})
```

```typescript
// middleware/guest.ts - ゲストミドルウェア（ログイン済みユーザーをリダイレクト）
export default defineNuxtRouteMiddleware(() => {
  const { isLoggedIn } = useAuth()

  if (isLoggedIn.value) {
    return navigateTo('/dashboard')
  }
})
```

### ミドルウェアの適用

```vue
<!-- pages/admin/index.vue -->
<script setup lang="ts">
// ページ固有のミドルウェアを設定
definePageMeta({
  middleware: ['auth', 'admin'],
})
</script>
```

```vue
<!-- pages/login.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
  layout: 'auth',
})
</script>
```

### グローバルミドルウェア

```typescript
// middleware/analytics.global.ts
// .global がつくとすべてのルートで実行される
export default defineNuxtRouteMiddleware((to) => {
  // ページビューのトラッキング
  if (process.client) {
    // Google Analytics などへの送信
    window.gtag?.('event', 'page_view', {
      page_path: to.fullPath,
      page_title: to.meta.title as string,
    })
  }
})
```

### サーバーサイドミドルウェアとの連携

```typescript
// middleware/session.ts - セッション確認
export default defineNuxtRouteMiddleware(async () => {
  const { user, fetchCurrentUser } = useAuth()

  // サーバーサイドの場合のみ実行
  if (process.server && !user.value) {
    try {
      await fetchCurrentUser()
    } catch {
      // セッションなし - ログインページではない場合はリダイレクト
    }
  }
})
```

---

## 11. Nuxt Content（マークダウン駆動CMS）

### Nuxt Contentの概要

`@nuxt/content`はマークダウンファイルをデータソースとして使えるCMSモジュールである。

```bash
npm install @nuxt/content
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  content: {
    // 全文検索の設定
    highlight: {
      theme: 'github-dark',
      langs: ['javascript', 'typescript', 'vue', 'bash', 'json'],
    },
    markdown: {
      toc: {
        depth: 3,
        searchDepth: 3,
      },
    },
  },
})
```

### コンテンツの作成

```
content/
├── index.md
├── about.md
└── blog/
    ├── first-post.md
    ├── second-post.md
    └── third-post.md
```

```markdown
---
title: Nuxt 3を使ったブログの作り方
description: Nuxt ContentとNuxt 3を使ってブログを作成する方法を解説します
date: 2026-02-20
tags: [nuxt, vue, blog]
image: /images/blog/nuxt-blog.png
draft: false
---

# Nuxt 3を使ったブログの作り方

本記事では、Nuxt ContentとNuxt 3を使ってブログを構築する方法を解説します。

## セットアップ

まずはプロジェクトを作成します。

```bash
npx nuxi@latest init my-blog
```
```

### コンテンツの取得と表示

```vue
<!-- pages/blog/index.vue -->
<template>
  <div>
    <h1>ブログ</h1>
    <ul>
      <li v-for="article in articles" :key="article._path">
        <NuxtLink :to="article._path">
          <h2>{{ article.title }}</h2>
          <p>{{ article.description }}</p>
          <time>{{ formatDate(article.date) }}</time>
          <div>
            <span v-for="tag in article.tags" :key="tag">
              {{ tag }}
            </span>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// queryContent でコンテンツを取得
const { data: articles } = await useAsyncData('blog-list', () =>
  queryContent('/blog')
    .where({ draft: { $ne: true } }) // 下書きを除外
    .sort({ date: -1 }) // 最新順
    .only(['title', 'description', 'date', 'tags', '_path']) // 必要なフィールドのみ
    .find()
)

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('ja-JP').format(new Date(date))
</script>
```

```vue
<!-- pages/blog/[...slug].vue -->
<template>
  <article>
    <header>
      <h1>{{ page?.title }}</h1>
      <time>{{ formatDate(page?.date) }}</time>
    </header>

    <!-- ContentDoc でマークダウンをHTMLとして表示 -->
    <ContentDoc />

    <!-- 目次の表示 -->
    <nav v-if="page?.body?.toc?.links?.length">
      <h2>目次</h2>
      <ul>
        <li
          v-for="link in page.body.toc.links"
          :key="link.id"
        >
          <a :href="`#${link.id}`">{{ link.text }}</a>
        </li>
      </ul>
    </nav>
  </article>
</template>

<script setup lang="ts">
const { page } = useContent()

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: '記事が見つかりません' })
}

// SEO設定
useSeoMeta({
  title: page.value.title,
  description: page.value.description,
  ogImage: page.value.image,
})

const formatDate = (date?: string) => {
  if (!date) return ''
  return new Intl.DateTimeFormat('ja-JP').format(new Date(date))
}
</script>
```

---

## 12. SEO最適化

### useSeoMeta

```typescript
// composables/useSeo.ts
export interface SeoOptions {
  title: string
  description: string
  image?: string
  url?: string
  type?: 'website' | 'article'
  publishedTime?: string
  author?: string
}

export const useSeo = (options: SeoOptions) => {
  const config = useRuntimeConfig()
  const route = useRoute()

  const fullTitle = `${options.title} | MyApp`
  const canonicalUrl = `${config.public.siteUrl}${route.path}`

  useSeoMeta({
    title: fullTitle,
    description: options.description,

    // Open Graph
    ogTitle: fullTitle,
    ogDescription: options.description,
    ogImage: options.image || `${config.public.siteUrl}/og-image.png`,
    ogUrl: canonicalUrl,
    ogType: options.type || 'website',

    // Twitter Card
    twitterCard: 'summary_large_image',
    twitterTitle: fullTitle,
    twitterDescription: options.description,
    twitterImage: options.image,

    // 記事の場合
    articlePublishedTime: options.publishedTime,
    articleAuthor: options.author,
  })

  // canonical URL
  useHead({
    link: [
      { rel: 'canonical', href: canonicalUrl },
    ],
  })
}
```

### JSON-LD構造化データ

```typescript
// composables/useStructuredData.ts
export const useArticleSchema = (article: {
  title: string
  description: string
  publishedAt: string
  updatedAt?: string
  author: { name: string; url?: string }
  image?: string
  url: string
}) => {
  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.description,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt || article.publishedAt,
          author: {
            '@type': 'Person',
            name: article.author.name,
            url: article.author.url,
          },
          image: article.image,
          url: article.url,
          publisher: {
            '@type': 'Organization',
            name: 'MyApp',
            logo: {
              '@type': 'ImageObject',
              url: 'https://myapp.com/logo.png',
            },
          },
        }),
      },
    ],
  })
}
```

### サイトマップの生成

```bash
npm install nuxt-simple-sitemap
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-simple-sitemap'],
  sitemap: {
    hostname: 'https://myapp.com',
    // 動的ルートを含める
    sources: ['/api/__sitemap__/urls'],
  },
})
```

```typescript
// server/api/__sitemap__/urls.ts
export default defineEventHandler(async () => {
  const posts = await fetchAllPosts()

  return posts.map((post) => ({
    loc: `/blog/${post.slug}`,
    lastmod: post.updatedAt,
    changefreq: 'weekly',
    priority: 0.8,
  }))
})
```

---

## 13. テスト（Vitest・Nuxt Testing Utils）

### テスト環境のセットアップ

```bash
npm install -D @nuxt/test-utils vitest @vue/test-utils happy-dom
```

```typescript
// vitest.config.ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        // テスト用Nuxt設定
        rootDir: '.',
      },
    },
  },
})
```

### コンポーネントテスト

```typescript
// tests/components/ProductCard.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductCard from '~/components/ProductCard.vue'

describe('ProductCard', () => {
  const mockProduct = {
    id: 1,
    name: 'テスト商品',
    price: 1980,
    imageUrl: '/images/test.jpg',
    stock: 10,
  }

  it('商品名と価格が正しく表示される', async () => {
    const wrapper = await mountSuspended(ProductCard, {
      props: { product: mockProduct },
    })

    expect(wrapper.text()).toContain('テスト商品')
    expect(wrapper.text()).toContain('¥1,980')
  })

  it('在庫切れの場合は購入ボタンが無効化される', async () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 }
    const wrapper = await mountSuspended(ProductCard, {
      props: { product: outOfStockProduct },
    })

    const button = wrapper.find('[data-testid="buy-button"]')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('カートに追加ボタンがクリックされたときイベントが発行される', async () => {
    const wrapper = await mountSuspended(ProductCard, {
      props: { product: mockProduct },
    })

    await wrapper.find('[data-testid="buy-button"]').trigger('click')
    expect(wrapper.emitted('add-to-cart')).toBeTruthy()
    expect(wrapper.emitted('add-to-cart')?.[0]).toEqual([mockProduct])
  })
})
```

### Composablesのテスト

```typescript
// tests/composables/useCart.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from '~/stores/useCartStore'

describe('useCartStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockProduct = {
    id: 1,
    name: 'テスト商品',
    price: 1000,
    imageUrl: '/test.jpg',
  }

  it('商品をカートに追加できる', () => {
    const store = useCartStore()
    store.addItem(mockProduct)

    expect(store.items).toHaveLength(1)
    expect(store.items[0].quantity).toBe(1)
    expect(store.itemCount).toBe(1)
  })

  it('同じ商品を追加すると数量が増える', () => {
    const store = useCartStore()
    store.addItem(mockProduct)
    store.addItem(mockProduct)

    expect(store.items).toHaveLength(1)
    expect(store.items[0].quantity).toBe(2)
    expect(store.itemCount).toBe(2)
  })

  it('合計金額が正しく計算される', () => {
    const store = useCartStore()
    store.addItem(mockProduct)
    store.addItem({ ...mockProduct, id: 2, price: 2000 })

    expect(store.subtotal).toBe(3000)
    expect(store.total).toBe(3000)
  })

  it('商品を削除できる', () => {
    const store = useCartStore()
    store.addItem(mockProduct)
    store.removeItem(mockProduct.id)

    expect(store.items).toHaveLength(0)
    expect(store.isEmpty).toBe(true)
  })
})
```

### APIルートのテスト

```typescript
// tests/server/api/posts.test.ts
import { describe, it, expect, vi } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('Posts API', async () => {
  await setup({
    server: true,
  })

  it('GET /api/posts が記事一覧を返す', async () => {
    const response = await $fetch('/api/posts')

    expect(response).toHaveProperty('posts')
    expect(response).toHaveProperty('total')
    expect(Array.isArray(response.posts)).toBe(true)
  })

  it('GET /api/posts/:id が正しい記事を返す', async () => {
    const response = await $fetch('/api/posts/1')

    expect(response).toHaveProperty('id', 1)
    expect(response).toHaveProperty('title')
    expect(response).toHaveProperty('content')
  })

  it('存在しない記事IDは404を返す', async () => {
    await expect($fetch('/api/posts/999999')).rejects.toMatchObject({
      status: 404,
    })
  })
})
```

---

## 14. デプロイ（Vercel・Netlify・Cloudflare）

### Vercelへのデプロイ

VercelはNuxt 3と最も相性の良いホスティングサービスのひとつである。

```bash
# Vercel CLIのインストール
npm install -g vercel

# デプロイ
vercel

# 本番環境へのデプロイ
vercel --prod
```

```json
// vercel.json（オプション設定）
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nuxtjs",
  "regions": ["nrt1"],
  "env": {
    "API_BASE_URL": "@api-base-url"
  }
}
```

```typescript
// nuxt.config.ts - Vercel最適化設定
export default defineNuxtConfig({
  nitro: {
    preset: 'vercel',
  },
  routeRules: {
    // Vercel Edge Networkでキャッシュ
    '/api/**': {
      headers: {
        'cache-control': 's-maxage=60, stale-while-revalidate=3600',
      },
    },
  },
})
```

### Netlifyへのデプロイ

```bash
# Netlify CLIのインストール
npm install -g netlify-cli

# ビルドとデプロイ
netlify deploy --build --prod
```

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".output/public"

[build.environment]
  NODE_VERSION = "20"
  NITRO_PRESET = "netlify"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Cloudflare Pagesへのデプロイ

```typescript
// nuxt.config.ts - Cloudflare設定
export default defineNuxtConfig({
  nitro: {
    preset: 'cloudflare-pages',
  },
})
```

```toml
# wrangler.toml（Cloudflare Workers設定）
name = "my-nuxt-app"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[build]
command = "npm run build"

[site]
bucket = ".output/public"
```

### Docker を使ったセルフホスティング

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  nuxt-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - API_SECRET=${API_SECRET}
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### CI/CD パイプライン（GitHub Actions）

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run typecheck

      - name: Run tests
        run: npm run test

      - name: Build
        run: npm run build
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## パフォーマンス最適化

### レイジーローディングとコード分割

```vue
<!-- components/HeavyComponent.vue の遅延読み込み -->
<template>
  <div>
    <!-- ClientOnly でクライアントサイドのみレンダリング -->
    <ClientOnly>
      <LazyHeavyChart :data="chartData" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// Lazy プレフィックスで自動的に遅延読み込み
// コンポーネントを動的にインポートする場合
const HeavyEditor = defineAsyncComponent({
  loader: () => import('~/components/HeavyEditor.vue'),
  loadingComponent: () => h('div', '読み込み中...'),
  errorComponent: () => h('div', '読み込みに失敗しました'),
  delay: 200,
  timeout: 3000,
})
</script>
```

### キャッシュの設定

```typescript
// server/api/products/index.get.ts
export default defineEventHandler(async (event) => {
  // レスポンスキャッシュを設定
  setResponseHeaders(event, {
    'cache-control': 'public, max-age=60, stale-while-revalidate=3600',
    'cdn-cache-control': 'public, max-age=3600',
  })

  return fetchProducts()
})
```

---

## まとめ

本記事では、Nuxt.js 3の以下の機能について解説した。

1. **アーキテクチャ**: Nitroエンジンを中心としたフルスタック設計
2. **ルーティング**: `pages/`ディレクトリによる直感的なファイルベースルーティング
3. **レンダリング**: SSR・SSG・ISR・SPAのハイブリッドレンダリング
4. **Composables**: `useFetch`・`useAsyncData`・`useState`による状態管理
5. **Nitroサーバー**: `server/api/`によるフルスタックAPI実装
6. **Pinia**: Vue 3公式の状態管理ライブラリとの統合
7. **Nuxt UI**: Tailwind CSS製のUIコンポーネントライブラリ
8. **データフェッチング**: `$fetch`を中心とした効率的なAPIアクセス
9. **ミドルウェア**: 認証・認可・アナリティクスのルートガード
10. **Nuxt Content**: マークダウンを使ったCMSシステム
11. **SEO**: `useSeoMeta`・`useHead`・JSON-LDによる最適化
12. **テスト**: Vitest・Nuxt Testing Utilsによる品質保証
13. **デプロイ**: Vercel・Netlify・Cloudflareへの展開

Nuxt 3は、Vue.js開発者にとって最も生産性の高いフレームワークである。自動インポート・TypeScriptファースト・Nitroエンジンの組み合わせにより、フロントエンドからバックエンドまで一貫した開発体験を提供する。

### 次のステップ

Nuxt 3の実力をさらに引き出すために、以下のリソースを活用することを推奨する。

- [Nuxt 3公式ドキュメント](https://nuxt.com/docs)
- [Nuxt UIコンポーネント](https://ui.nuxt.com)
- [Pinia公式ドキュメント](https://pinia.vuejs.org)
- [Nitroサーバーエンジン](https://nitro.unjs.io)

また、日々のフロントエンド開発では、様々なツールとのインテグレーションが欠かせない。開発効率を高めるためのツール群をまとめて確認したい場合は、**[DevToolBox（usedevtools.com）](https://usedevtools.com)** が役立つ。JSON整形・Base64エンコード・正規表現テスト・カラーパレット生成など、Web開発者が日常的に必要とするツールが一か所に集約されており、ブックマークしておくと開発作業がスムーズになる。

Nuxt 3を活用して、高品質なWebアプリケーションの構築に挑戦してほしい。
