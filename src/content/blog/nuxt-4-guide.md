---
title: 'Nuxt 4完全ガイド - Nitro v3とVue 3.5で進化した最新フレームワーク'
description: 'Nuxt 4の新機能を徹底解説。Nitro v3統合、Vue 3.5対応、サーバーコンポーネント、パフォーマンス改善など、アップグレード方法から実践的な使い方まで完全ガイド'
pubDate: 'Feb 05 2026'
tags: ['Nuxt', 'Vue', 'SSR', 'フロントエンド']
---

# Nuxt 4完全ガイド - Nitro v3とVue 3.5で進化した最新フレームワーク

Nuxt 4は、Vue.jsエコシステムにおける最も強力なフルスタックフレームワークの最新バージョンです。Nitro v3の統合、Vue 3.5のサポート、サーバーコンポーネントの強化など、多くの革新的な機能が追加されました。

この記事では、Nuxt 4の新機能から実践的な使い方まで、包括的に解説します。

## Nuxt 4とは

Nuxt 4は、Vue.jsベースのメタフレームワークで、以下の特徴を持ちます。

### 主な特徴

- **Nitro v3統合**: 次世代サーバーエンジン
- **Vue 3.5対応**: 最新のリアクティビティシステム
- **サーバーコンポーネント**: パフォーマンス最適化
- **ファイルベースルーティング**: 直感的なページ管理
- **自動インポート**: インポート文不要
- **TypeScript完全サポート**: 型安全な開発

## セットアップ

### プロジェクト作成

```bash
# Nuxt 4プロジェクト作成
npx nuxi@latest init my-nuxt4-app

cd my-nuxt4-app

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

### nuxt.config.ts

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // Nuxt 4の新機能を有効化
  future: {
    compatibilityVersion: 4,
  },

  // Nitro v3設定
  nitro: {
    experimental: {
      asyncContext: true,
    },
  },

  // モジュール
  modules: [
    '@nuxt/image',
    '@nuxt/ui',
  ],

  // TypeScript設定
  typescript: {
    strict: true,
    typeCheck: true,
  },

  // ビルド最適化
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router'],
          },
        },
      },
    },
  },
})
```

## Nitro v3の新機能

### 非同期コンテキスト

Nitro v3では、非同期コンテキストが導入され、グローバル状態管理が改善されました。

```typescript
// server/api/user.ts
export default defineEventHandler(async (event) => {
  // 非同期コンテキストから自動的にアクセス
  const session = await useSession(event)

  return {
    user: session.user,
    timestamp: new Date(),
  }
})
```

### WebSocket サポート

```typescript
// server/api/websocket.ts
export default defineWebSocketHandler({
  open(peer) {
    console.log('WebSocket接続開始', peer.id)
    peer.send({ type: 'welcome', message: 'Connected!' })
  },

  message(peer, message) {
    console.log('メッセージ受信:', message)

    // ブロードキャスト
    peer.publish('chat', {
      from: peer.id,
      message,
    })
  },

  close(peer) {
    console.log('WebSocket接続終了', peer.id)
  },
})
```

### タスクスケジューラ

```typescript
// server/tasks/cleanup.ts
export default defineTask({
  meta: {
    name: 'cleanup',
    description: '古いデータを削除',
  },
  run({ payload }) {
    console.log('クリーンアップ実行')

    // データベースクリーンアップ処理
    return { result: 'success' }
  },
})
```

スケジュール設定:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    scheduledTasks: {
      '0 0 * * *': ['cleanup'], // 毎日0時に実行
    },
  },
})
```

## サーバーコンポーネント

Nuxt 4では、サーバーコンポーネントが大幅に強化されました。

### 基本的な使い方

```vue
<!-- components/ServerContent.server.vue -->
<script setup lang="ts">
// サーバーでのみ実行される
const data = await $fetch('/api/heavy-computation')

// データベースアクセスも可能
const { data: posts } = await useFetch('/api/posts')
</script>

<template>
  <div>
    <h2>サーバーレンダリングコンテンツ</h2>
    <ul>
      <li v-for="post in posts" :key="post.id">
        {{ post.title }}
      </li>
    </ul>
  </div>
</template>
```

### ハイブリッドコンポーネント

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
// クライアントで実行
const count = ref(0)
</script>

<template>
  <div>
    <!-- サーバーコンポーネント -->
    <ServerContent />

    <!-- クライアントインタラクション -->
    <button @click="count++">
      クリック数: {{ count }}
    </button>
  </div>
</template>
```

## Vue 3.5の新機能活用

### Reactive Props Destructure

```vue
<script setup lang="ts">
interface Props {
  title: string
  count: number
}

// プロパティの分割代入がリアクティブに
const { title, count } = defineProps<Props>()

// watchも自動的に動作
watch(() => count, (newCount) => {
  console.log('Count changed:', newCount)
})
</script>

<template>
  <div>
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
  </div>
</template>
```

### useTemplateRef

```vue
<script setup lang="ts">
// テンプレート参照の型安全な取得
const inputRef = useTemplateRef<HTMLInputElement>('input')

onMounted(() => {
  inputRef.value?.focus()
})
</script>

<template>
  <input ref="input" type="text" />
</template>
```

## ファイルベースルーティング

### ページ構造

```
pages/
  ├── index.vue           # /
  ├── about.vue           # /about
  ├── users/
  │   ├── index.vue       # /users
  │   ├── [id].vue        # /users/:id
  │   └── create.vue      # /users/create
  └── blog/
      ├── [...slug].vue   # /blog/* (キャッチオール)
      └── [category]/
          └── [id].vue    # /blog/:category/:id
```

### 動的ルート

```vue
<!-- pages/users/[id].vue -->
<script setup lang="ts">
const route = useRoute()
const userId = computed(() => route.params.id)

const { data: user } = await useFetch(`/api/users/${userId.value}`)
</script>

<template>
  <div v-if="user">
    <h1>{{ user.name }}</h1>
    <p>{{ user.email }}</p>
  </div>
</template>
```

### ルートミドルウェア

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const auth = useAuthStore()

  if (!auth.isLoggedIn && to.path !== '/login') {
    return navigateTo('/login')
  }
})
```

ページで使用:

```vue
<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})
</script>
```

## データフェッチング

### useFetch

```vue
<script setup lang="ts">
// 基本的な使い方
const { data, pending, error, refresh } = await useFetch('/api/posts')

// オプション付き
const { data: user } = await useFetch('/api/user', {
  method: 'POST',
  body: { name: 'John' },
  // キャッシュキー
  key: 'user-data',
  // リフレッシュ設定
  lazy: true,
  // 変換
  transform: (data) => {
    return {
      ...data,
      fullName: `${data.firstName} ${data.lastName}`,
    }
  },
  // エラーハンドリング
  onRequest({ request, options }) {
    console.log('Request:', request)
  },
  onResponse({ response }) {
    console.log('Response:', response.status)
  },
})
</script>

<template>
  <div>
    <div v-if="pending">読み込み中...</div>
    <div v-else-if="error">エラー: {{ error.message }}</div>
    <div v-else>
      <ul>
        <li v-for="post in data" :key="post.id">
          {{ post.title }}
        </li>
      </ul>
      <button @click="refresh">再読み込み</button>
    </div>
  </div>
</template>
```

### useAsyncData

```vue
<script setup lang="ts">
// カスタムフェッチロジック
const { data, pending } = await useAsyncData('posts', async () => {
  const [posts, categories] = await Promise.all([
    $fetch('/api/posts'),
    $fetch('/api/categories'),
  ])

  return {
    posts,
    categories,
  }
}, {
  // サーバーでのみ実行
  server: true,
  // クライアントでは実行しない
  lazy: false,
})
</script>
```

## サーバーAPI

### APIルート

```typescript
// server/api/posts/index.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // データベースクエリ
  const posts = await db.posts.findMany({
    where: {
      published: true,
    },
    take: query.limit ? Number(query.limit) : 10,
  })

  return posts
})
```

### POSTリクエスト

```typescript
// server/api/posts/create.ts
export default defineEventHandler(async (event) => {
  // リクエストボディ取得
  const body = await readBody(event)

  // バリデーション
  const validatedData = await validatePostData(body)

  // データベース挿入
  const post = await db.posts.create({
    data: validatedData,
  })

  // ステータスコード設定
  setResponseStatus(event, 201)

  return post
})
```

### 認証付きAPI

```typescript
// server/api/protected.ts
export default defineEventHandler(async (event) => {
  // セッション取得
  const session = await useSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  return {
    message: 'Protected data',
    user: session.user,
  }
})
```

## 状態管理

### useState

```vue
<script setup lang="ts">
// グローバル状態
const counter = useState('counter', () => 0)

function increment() {
  counter.value++
}
</script>

<template>
  <div>
    <p>Counter: {{ counter }}</p>
    <button @click="increment">+1</button>
  </div>
</template>
```

### Pinia統合

```bash
npm install pinia @pinia/nuxt
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
})
```

```typescript
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => !!user.value)

  async function login(credentials: Credentials) {
    const data = await $fetch('/api/auth/login', {
      method: 'POST',
      body: credentials,
    })
    user.value = data.user
  }

  function logout() {
    user.value = null
  }

  return {
    user,
    isLoggedIn,
    login,
    logout,
  }
})
```

## レイアウト

### デフォルトレイアウト

```vue
<!-- layouts/default.vue -->
<template>
  <div>
    <header>
      <nav>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/about">About</NuxtLink>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <footer>
      <p>&copy; 2026 My App</p>
    </footer>
  </div>
</template>
```

### カスタムレイアウト

```vue
<!-- layouts/admin.vue -->
<template>
  <div class="admin-layout">
    <aside>
      <AdminSidebar />
    </aside>
    <main>
      <slot />
    </main>
  </div>
</template>
```

ページで使用:

```vue
<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})
</script>
```

## プラグイン

### プラグイン作成

```typescript
// plugins/analytics.client.ts
export default defineNuxtPlugin((nuxtApp) => {
  // クライアントでのみ実行
  const analytics = {
    track(event: string, data?: any) {
      console.log('Track event:', event, data)
    },
  }

  // グローバルに提供
  return {
    provide: {
      analytics,
    },
  }
})
```

使用方法:

```vue
<script setup lang="ts">
const { $analytics } = useNuxtApp()

function handleClick() {
  $analytics.track('button_clicked', {
    page: 'home',
  })
}
</script>
```

### ライフサイクルフック

```typescript
// plugins/lifecycle.ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:created', () => {
    console.log('App created')
  })

  nuxtApp.hook('page:start', () => {
    console.log('Page navigation start')
  })

  nuxtApp.hook('page:finish', () => {
    console.log('Page navigation finish')
  })
})
```

## コンポーザブル

### カスタムコンポーザブル

```typescript
// composables/useCounter.ts
export const useCounter = (initial = 0) => {
  const count = ref(initial)

  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = initial

  const isPositive = computed(() => count.value > 0)

  return {
    count: readonly(count),
    increment,
    decrement,
    reset,
    isPositive,
  }
}
```

### 非同期コンポーザブル

```typescript
// composables/usePost.ts
export const usePost = async (id: string) => {
  const post = ref<Post | null>(null)
  const loading = ref(true)
  const error = ref<Error | null>(null)

  try {
    const data = await $fetch(`/api/posts/${id}`)
    post.value = data
  } catch (e) {
    error.value = e as Error
  } finally {
    loading.value = false
  }

  return {
    post,
    loading,
    error,
  }
}
```

## ビルドとデプロイ

### 静的サイト生成

```bash
# プリレンダリング
npm run generate
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/sitemap.xml'],
    },
  },
})
```

### サーバーサイドレンダリング

```bash
# 本番ビルド
npm run build

# 本番サーバー起動
node .output/server/index.mjs
```

### Vercelデプロイ

```bash
npm install -g vercel
vercel
```

### Cloudflare Pagesデプロイ

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    preset: 'cloudflare-pages',
  },
})
```

## パフォーマンス最適化

### 画像最適化

```bash
npm install @nuxt/image
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/image'],
  image: {
    formats: ['webp', 'avif'],
  },
})
```

```vue
<template>
  <NuxtImg
    src="/images/hero.jpg"
    width="800"
    height="600"
    format="webp"
    loading="lazy"
  />
</template>
```

### コード分割

```vue
<script setup lang="ts">
// 遅延ロード
const LazyComponent = defineAsyncComponent(() =>
  import('~/components/Heavy.vue')
)
</script>

<template>
  <div>
    <LazyComponent v-if="show" />
  </div>
</template>
```

### プリフェッチ制御

```vue
<template>
  <!-- プリフェッチ無効化 -->
  <NuxtLink to="/heavy-page" :prefetch="false">
    Heavy Page
  </NuxtLink>
</template>
```

## テスト

### Vitest設定

```bash
npm install -D @nuxt/test-utils vitest
```

```typescript
// vitest.config.ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
  },
})
```

### コンポーネントテスト

```typescript
// components/Counter.test.ts
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Counter from './Counter.vue'

describe('Counter', () => {
  it('increments counter', async () => {
    const wrapper = await mountSuspended(Counter)

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Count: 1')
  })
})
```

## 移行ガイド

### Nuxt 3からNuxt 4へ

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  // 互換性オプション
  compatibilityDate: '2026-02-05',
})
```

主な変更点:

1. **自動インポートの改善**: より厳密な型チェック
2. **Nitro v3**: 設定構文の変更
3. **ファイル構造**: `server/`ディレクトリの整理
4. **デフォルト動作**: より厳密なTypeScript設定

## ベストプラクティス

### ディレクトリ構造

```
my-nuxt4-app/
├── assets/              # CSS、画像など
├── components/          # Vueコンポーネント
│   ├── ui/             # UI部品
│   └── features/       # 機能コンポーネント
├── composables/        # コンポーザブル
├── layouts/            # レイアウト
├── middleware/         # ミドルウェア
├── pages/              # ページ
├── plugins/            # プラグイン
├── public/             # 静的ファイル
├── server/             # サーバーコード
│   ├── api/           # APIルート
│   ├── middleware/    # サーバーミドルウェア
│   └── utils/         # サーバーユーティリティ
├── stores/             # Piniaストア
└── types/              # 型定義
```

### 型安全性

```typescript
// types/api.ts
export interface Post {
  id: string
  title: string
  content: string
  createdAt: Date
}

// server/api/posts/index.ts
export default defineEventHandler(async (): Promise<Post[]> => {
  return await db.posts.findMany()
})

// pages/posts.vue
const { data } = await useFetch('/api/posts') // Post[]型が自動推論
```

### エラーハンドリング

```vue
<script setup lang="ts">
const { data, error } = await useFetch('/api/posts')

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode,
    message: error.value.message,
    fatal: true,
  })
}
</script>
```

## まとめ

Nuxt 4は、Nitro v3とVue 3.5の統合により、さらに強力で使いやすいフレームワークに進化しました。

主なメリット:

- **開発体験の向上**: 自動インポート、型安全性
- **パフォーマンス**: サーバーコンポーネント、最適化
- **柔軟性**: SSR、SSG、ハイブリッド
- **スケーラビリティ**: モジュラー設計

Nuxt 4は、小規模なプロジェクトから大規模なアプリケーションまで、あらゆるユースケースに対応できる完璧なフレームワークです。

## 参考リンク

- [Nuxt 4公式ドキュメント](https://nuxt.com/)
- [Nitro](https://nitro.unjs.io/)
- [Vue 3.5](https://vuejs.org/)
