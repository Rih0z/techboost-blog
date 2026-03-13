---
title: "Svelte 5完全ガイド — Runesで変わるリアクティビティ"
description: "Svelte 5の革新的な新機能Runes（$state、$derived、$effect）、SvelteKitとの統合、React/Vueとの比較、実践的なコンポーネント設計パターンを徹底解説。Svelte・Svelte 5・Runesに関する実践情報。"
pubDate: "2026-02-05"
tags: ["Svelte", "Svelte 5", "Runes", "SvelteKit", "JavaScript", "Frontend"]
heroImage: '../../assets/thumbnails/svelte-5-guide-2026.jpg'
---

Svelte 5は、フロントエンド開発の常識を覆す革新的なアップデートです。新しいRunes（$state、$derived、$effect）により、リアクティビティの仕組みが根本的に変わり、より直感的で強力な開発体験を提供します。この記事では、Svelte 5の新機能から実践的な活用方法まで、2026年最新の情報とともに完全解説します。

## Svelte 5とは

Svelte 5は、2024年後半にリリースされたSvelteの最新メジャーバージョンです。従来のSvelteは「消えるフレームワーク」として知られ、コンパイル時に最適化されたJavaScriptを生成することで、ランタイムの小ささと高速性を実現していました。

Svelte 5では、この哲学を維持しながら、リアクティビティシステムを刷新し、Runesという新しい概念を導入しました。

### Svelte 5の主な変更点

**Runesの導入**
`$state`、`$derived`、`$effect`といったRunesにより、リアクティビティがより明示的で強力になりました。

**シグナルベースのリアクティビティ**
内部的にシグナル（Signals）パターンを採用し、細粒度の更新が可能になりました。

**破壊的変更**
従来の`let`変数の自動リアクティビティは廃止され、明示的に`$state`を使う必要があります。

**パフォーマンス向上**
より効率的な更新アルゴリズムにより、大規模アプリケーションでのパフォーマンスが大幅に改善されました。

## Runes: Svelte 5の核心

Runesは、Svelte 5の最も重要な新機能です。`$`で始まるこれらの特殊な構文により、リアクティビティを明示的に制御できます。

### $state - リアクティブな状態管理

`$state`は、リアクティブな変数を宣言するためのRuneです。

**基本的な使い方:**

```svelte
<script>
  let count = $state(0)

  function increment() {
    count++
  }
</script>

<button on:click={increment}>
  Count: {count}
</button>
```

従来のSvelteでは`let count = 0`で自動的にリアクティブでしたが、Svelte 5では明示的に`$state`を使います。

**オブジェクトと配列:**

```svelte
<script>
  let user = $state({
    name: 'Alice',
    age: 25
  })

  let todos = $state([
    { id: 1, text: 'Learn Svelte 5', done: false },
    { id: 2, text: 'Build an app', done: false }
  ])

  function updateUser() {
    user.age++ // リアクティブに更新される
  }

  function addTodo() {
    todos.push({ id: todos.length + 1, text: 'New todo', done: false })
  }
</script>
```

`$state`で宣言されたオブジェクトや配列は、深くリアクティブです。ネストされたプロパティの変更も自動的に検知されます。

**クラスとの組み合わせ:**

```svelte
<script>
  class Counter {
    count = $state(0)

    increment() {
      this.count++
    }

    reset() {
      this.count = 0
    }
  }

  let counter = new Counter()
</script>

<button on:click={() => counter.increment()}>
  Count: {counter.count}
</button>
<button on:click={() => counter.reset()}>Reset</button>
```

クラス内でも`$state`を使用でき、オブジェクト指向的な設計が可能です。

### $derived - 算出プロパティ

`$derived`は、他の状態から導出される値を定義します。

**基本的な使い方:**

```svelte
<script>
  let firstName = $state('John')
  let lastName = $state('Doe')
  let fullName = $derived(firstName + ' ' + lastName)
</script>

<input bind:value={firstName} />
<input bind:value={lastName} />
<p>Full name: {fullName}</p>
```

`fullName`は`firstName`または`lastName`が変更されると自動的に再計算されます。

**複雑な計算:**

```svelte
<script>
  let todos = $state([
    { text: 'Learn Svelte', done: true },
    { text: 'Build app', done: false },
    { text: 'Deploy', done: false }
  ])

  let completedCount = $derived(todos.filter(t => t.done).length)
  let totalCount = $derived(todos.length)
  let progress = $derived((completedCount / totalCount) * 100)
</script>

<p>Progress: {progress.toFixed(0)}%</p>
<p>{completedCount} of {totalCount} completed</p>
```

**$derived.by - 複雑なロジック:**

関数を使ったより複雑な導出には`$derived.by`を使います。

```svelte
<script>
  let items = $state([1, 2, 3, 4, 5])

  let stats = $derived.by(() => {
    const sum = items.reduce((a, b) => a + b, 0)
    const avg = sum / items.length
    const max = Math.max(...items)
    const min = Math.min(...items)
    return { sum, avg, max, min }
  })
</script>

<p>Sum: {stats.sum}</p>
<p>Average: {stats.avg}</p>
<p>Max: {stats.max}, Min: {stats.min}</p>
```

### $effect - 副作用の処理

`$effect`は、状態が変化したときに副作用（API呼び出し、ログ出力など）を実行します。

**基本的な使い方:**

```svelte
<script>
  let count = $state(0)

  $effect(() => {
    console.log(`Count changed to ${count}`)
  })
</script>
```

`count`が変更されるたびに、effectが実行されます。

**クリーンアップ:**

```svelte
<script>
  let isActive = $state(false)

  $effect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      console.log('Tick')
    }, 1000)

    // クリーンアップ関数を返す
    return () => {
      clearInterval(interval)
    }
  })
</script>
```

effectが再実行される前、またはコンポーネントが破棄される前に、クリーンアップ関数が呼ばれます。

**ローカルストレージへの保存:**

```svelte
<script>
  let theme = $state(localStorage.getItem('theme') || 'light')

  $effect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  })
</script>

<select bind:value={theme}>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
</select>
```

**API呼び出し:**

```svelte
<script>
  let userId = $state(1)
  let user = $state(null)
  let loading = $state(false)

  $effect(async () => {
    loading = true
    try {
      const response = await fetch(`/api/users/${userId}`)
      user = await response.json()
    } catch (error) {
      console.error('Failed to fetch user', error)
    } finally {
      loading = false
    }
  })
</script>

{#if loading}
  <p>Loading...</p>
{:else if user}
  <p>User: {user.name}</p>
{/if}
```

### $props - プロパティの受け取り

`$props`は、親コンポーネントから受け取るプロパティを定義します。

```svelte
<!-- Child.svelte -->
<script>
  let { title, count = 0 } = $props()
</script>

<h2>{title}</h2>
<p>Count: {count}</p>
```

```svelte
<!-- Parent.svelte -->
<script>
  import Child from './Child.svelte'
</script>

<Child title="My Component" count={10} />
```

TypeScriptとの統合も強力です。

```svelte
<script lang="ts">
  interface Props {
    title: string
    count?: number
  }

  let { title, count = 0 }: Props = $props()
</script>
```

## SvelteKitとの統合

SvelteKitは、Svelteの公式フルスタックフレームワークです。Svelte 5との統合により、さらに強力になっています。

### SvelteKitのセットアップ

```bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
```

プロジェクト作成時に、Svelte 5を選択できます。

### ファイルベースルーティング

SvelteKitは、ファイル構造がそのままルーティングになります。

```
src/routes/
├── +page.svelte           # /
├── about/
│   └── +page.svelte       # /about
├── blog/
│   ├── +page.svelte       # /blog
│   └── [slug]/
│       └── +page.svelte   # /blog/[slug]
└── api/
    └── users/
        └── +server.ts     # /api/users (APIエンドポイント)
```

### ローダー関数

`+page.ts`または`+page.server.ts`でデータをロードします。

```typescript
// src/routes/blog/+page.server.ts
export async function load() {
  const posts = await db.posts.findMany()
  return { posts }
}
```

```svelte
<!-- src/routes/blog/+page.svelte -->
<script>
  let { data } = $props()
</script>

<h1>Blog Posts</h1>
{#each data.posts as post}
  <article>
    <h2>{post.title}</h2>
    <p>{post.excerpt}</p>
  </article>
{/each}
```

### フォームアクション

フォームの送信をサーバーサイドで処理します。

```typescript
// src/routes/login/+page.server.ts
import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData()
    const email = data.get('email')
    const password = data.get('password')

    // 認証処理
    const user = await authenticate(email, password)

    if (!user) {
      return { success: false, message: 'Invalid credentials' }
    }

    return { success: true }
  }
}
```

```svelte
<!-- src/routes/login/+page.svelte -->
<script>
  let { form } = $props()
</script>

<form method="POST">
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">Login</button>
</form>

{#if form?.success === false}
  <p class="error">{form.message}</p>
{/if}
```

### レイアウト

共通のレイアウトを`+layout.svelte`で定義します。

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import Header from '$lib/components/Header.svelte'
  import Footer from '$lib/components/Footer.svelte'

  let { children } = $props()
</script>

<div class="app">
  <Header />
  <main>
    {@render children()}
  </main>
  <Footer />
</div>
```

### SSR、SSG、CSR

SvelteKitは柔軟なレンダリング戦略をサポートします。

```typescript
// +page.ts
export const ssr = true // サーバーサイドレンダリング
export const prerender = true // 静的サイト生成
export const csr = false // クライアントサイドレンダリング無効化
```

## React/Vueとの比較

### コード量の比較

**カウンターコンポーネント**

**React:**
```jsx
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
```

**Vue:**
```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">
    Count: {{ count }}
  </button>
</template>
```

**Svelte 5:**
```svelte
<script>
  let count = $state(0)
</script>

<button on:click={() => count++}>
  Count: {count}
</button>
```

### リアクティビティ

**React**
`useState`、`useEffect`などのフックを使用。不変性を保つ必要がある。

```jsx
const [user, setUser] = useState({ name: 'Alice', age: 25 })

// オブジェクトの更新
setUser({ ...user, age: 26 })
```

**Vue**
`ref`や`reactive`でリアクティブなデータを作成。

```js
const user = reactive({ name: 'Alice', age: 25 })

// 直接変更可能
user.age = 26
```

**Svelte 5**
`$state`で宣言し、直接変更可能。

```js
let user = $state({ name: 'Alice', age: 25 })

// 直接変更可能
user.age = 26
```

### バンドルサイズ

**React**
- React + ReactDOM: ~40KB (gzip後)
- 仮想DOMのオーバーヘッドあり

**Vue**
- Vue 3: ~35KB (gzip後)
- コンパイラ最適化あり

**Svelte**
- ランタイムなし: ~2-5KB（アプリサイズによる）
- コンパイル時に最適化

### パフォーマンス

**Svelte**は仮想DOMを使わず、コンパイル時に最適化されたコードを生成するため、初期ロードとランタイムパフォーマンスに優れています。

**js-framework-benchmark**（2026年1月）の結果:
- Svelte: 1.05x（バニラJSを1.00とした場合）
- Vue: 1.18x
- React: 1.52x

## コンポーネント設計パターン

### 再利用可能なボタンコンポーネント

```svelte
<!-- Button.svelte -->
<script>
  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    onclick,
    children
  } = $props()

  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  }

  const sizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }

  const className = $derived(`${variants[variant]} ${sizes[size]} rounded disabled:opacity-50`)
</script>

<button class={className} {disabled} {onclick}>
  {@render children()}
</button>
```

使用例:

```svelte
<script>
  import Button from '$lib/components/Button.svelte'
</script>

<Button variant="primary" size="lg" onclick={() => console.log('Clicked')}>
  Click me
</Button>
```

### フォーム管理

```svelte
<script>
  let formData = $state({
    email: '',
    password: '',
    remember: false
  })

  let errors = $state({})

  function validate() {
    errors = {}

    if (!formData.email.includes('@')) {
      errors.email = 'Invalid email'
    }

    if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    return Object.keys(errors).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    if (response.ok) {
      // ログイン成功
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <div>
    <label for="email">Email</label>
    <input id="email" type="email" bind:value={formData.email} />
    {#if errors.email}
      <p class="error">{errors.email}</p>
    {/if}
  </div>

  <div>
    <label for="password">Password</label>
    <input id="password" type="password" bind:value={formData.password} />
    {#if errors.password}
      <p class="error">{errors.password}</p>
    {/if}
  </div>

  <label>
    <input type="checkbox" bind:checked={formData.remember} />
    Remember me
  </label>

  <button type="submit">Login</button>
</form>
```

### データテーブル

```svelte
<script>
  let { data, columns } = $props()

  let sortColumn = $state(null)
  let sortDirection = $state('asc')
  let searchQuery = $state('')

  let filteredData = $derived.by(() => {
    if (!searchQuery) return data

    return data.filter(row =>
      columns.some(col =>
        String(row[col.key]).toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  })

  let sortedData = $derived.by(() => {
    if (!sortColumn) return filteredData

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      const multiplier = sortDirection === 'asc' ? 1 : -1

      if (aVal < bVal) return -1 * multiplier
      if (aVal > bVal) return 1 * multiplier
      return 0
    })
  })

  function handleSort(column) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
      sortColumn = column
      sortDirection = 'asc'
    }
  }
</script>

<input
  type="search"
  placeholder="Search..."
  bind:value={searchQuery}
/>

<table>
  <thead>
    <tr>
      {#each columns as col}
        <th on:click={() => handleSort(col.key)}>
          {col.label}
          {#if sortColumn === col.key}
            {sortDirection === 'asc' ? '↑' : '↓'}
          {/if}
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each sortedData as row}
      <tr>
        {#each columns as col}
          <td>{row[col.key]}</td>
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
```

## デプロイ

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm install -g netlify-cli
netlify deploy
```

### Cloudflare Pages

```bash
npm run build
npx wrangler pages publish .svelte-kit/cloudflare
```

### 静的サイトとして

```bash
# adapter-staticをインストール
npm install -D @sveltejs/adapter-static

# svelte.config.jsを編集
import adapter from '@sveltejs/adapter-static'

export default {
  kit: {
    adapter: adapter()
  }
}

# ビルド
npm run build
```

生成された`build`ディレクトリを任意のホスティングサービスにデプロイできます。

## まとめ

Svelte 5は、Runesの導入により、リアクティビティシステムが大きく進化しました。`$state`、`$derived`、`$effect`といったシンプルで強力なプリミティブにより、複雑な状態管理も直感的に記述できます。

### Svelte 5の強み

- **シンプルさ**: ボイラープレートが少なく、学習コストが低い
- **パフォーマンス**: 仮想DOMなしで高速
- **小さいバンドル**: ランタイムがないため、バンドルサイズが小さい
- **優れたDX**: TypeScript統合、優れたエラーメッセージ

### Svelte 5を選ぶべきケース

- 高速でバンドルサイズが小さいアプリが必要
- シンプルな構文が好み
- SvelteKitでフルスタック開発したい
- 新規プロジェクト（移行コストがない）

### React/Vueを選ぶべきケース

- 既存の大規模なエコシステムが必要（React）
- チームが既に習熟している
- エンタープライズサポートが必要

Svelte 5とSvelteKitの組み合わせは、2026年現在、最もモダンで生産的なフロントエンド開発体験の一つです。ぜひ実際に試して、その素晴らしさを体感してください。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
