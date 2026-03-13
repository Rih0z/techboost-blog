---
title: "SvelteKit 2完全ガイド - Svelte 5 Runesと新しいルーティングで構築する次世代Webアプリ"
description: "SvelteKit 2とSvelte 5 Runesを使った最新Web開発の完全ガイド。新しいリアクティビティシステム、ファイルベースルーティング、フォームアクション、SEO最適化まで実践的に解説。SvelteKit・Svelte・Runesに関する実践情報。"
pubDate: "2025-09-05"
updatedDate: "2025-09-05"
tags: ["SvelteKit", "Svelte", "Runes", "Web Development", "SSR", "プログラミング"]
heroImage: '../../assets/thumbnails/sveltekit-2-guide.jpg'
---
## はじめに

SvelteKit 2は、Svelte 5 Runesの導入により、よりシンプルで型安全なリアクティビティを実現したフルスタックフレームワークです。2026年現在、Next.js、Remix、Nuxtと並ぶモダンWebフレームワークの選択肢として、特にパフォーマンスとDXの高さで注目されています。

### SvelteKit 2の特徴

```
従来のReactベースフレームワーク:
- 仮想DOM
- useEffect/useState
- 複雑なメンタルモデル
- ランタイムオーバーヘッド

SvelteKit 2 + Svelte 5:
✅ コンパイル時最適化（仮想DOM不要）
✅ Runesでシンプルなリアクティビティ
✅ ファイルベースルーティング
✅ 組み込みフォームアクション
✅ アダプタで多様なデプロイ先
✅ ゼロ設定SSR/SSG/SPA
✅ バンドルサイズが小さい（平均30-50%減）
```

### Svelte 5 Runesとは

```typescript
// 従来のSvelte 4
let count = 0;
$: double = count * 2;

// Svelte 5 Runes
let count = $state(0);
let double = $derived(count * 2);

Runesの利点:
✅ 明示的で理解しやすい
✅ TypeScript完全対応
✅ エディタサポート向上
✅ コンパイラ最適化しやすい
✅ スコープが明確
```

## セットアップ

### プロジェクト作成

```bash
# SvelteKit 2プロジェクト作成
npm create svelte@latest my-app

# オプション選択:
# - SvelteKit demo app（推奨）
# - TypeScript
# - ESLint, Prettier
# - Playwright, Vitest

cd my-app
npm install
npm run dev
```

### プロジェクト構造

```
my-app/
├── src/
│   ├── routes/           # ファイルベースルーティング
│   │   ├── +page.svelte  # /
│   │   ├── +layout.svelte
│   │   ├── about/
│   │   │   └── +page.svelte  # /about
│   │   └── blog/
│   │       ├── +page.svelte  # /blog
│   │       ├── +page.server.ts
│   │       └── [slug]/
│   │           └── +page.svelte  # /blog/:slug
│   ├── lib/              # ライブラリコード
│   │   ├── components/
│   │   ├── utils/
│   │   └── index.ts
│   └── app.html          # HTMLテンプレート
├── static/               # 静的ファイル
├── tests/
├── svelte.config.js
├── vite.config.ts
└── package.json
```

### svelte.config.js

```javascript
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    alias: {
      $components: 'src/lib/components',
      $utils: 'src/lib/utils',
    },
  },
};

export default config;
```

## Svelte 5 Runesの基本

### $state - リアクティブな状態

```svelte
<script lang="ts">
  // プリミティブ値
  let count = $state(0);

  // オブジェクト
  let user = $state({
    name: 'Alice',
    age: 30,
  });

  // 配列
  let todos = $state<string[]>([]);

  function increment() {
    count++;  // リアクティブ
  }

  function addTodo(text: string) {
    todos.push(text);  // リアクティブ
  }

  function updateName(newName: string) {
    user.name = newName;  // リアクティブ
  }
</script>

<h1>Count: {count}</h1>
<button onclick={increment}>+1</button>

<p>{user.name} ({user.age})</p>
<button onclick={() => updateName('Bob')}>Change Name</button>

<ul>
  {#each todos as todo}
    <li>{todo}</li>
  {/each}
</ul>
```

### $derived - 計算プロパティ

```svelte
<script lang="ts">
  let firstName = $state('John');
  let lastName = $state('Doe');

  // 自動的に再計算される
  let fullName = $derived(`${firstName} ${lastName}`);

  let numbers = $state([1, 2, 3, 4, 5]);
  let sum = $derived(numbers.reduce((a, b) => a + b, 0));
  let average = $derived(sum / numbers.length);
</script>

<p>Full Name: {fullName}</p>
<p>Sum: {sum}, Average: {average}</p>
```

### $effect - 副作用

```svelte
<script lang="ts">
  let count = $state(0);

  // countが変更されるたびに実行
  $effect(() => {
    console.log(`Count is now ${count}`);
    document.title = `Count: ${count}`;
  });

  // クリーンアップ関数
  $effect(() => {
    const interval = setInterval(() => {
      count++;
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  });
</script>

<h1>{count}</h1>
```

### $props - プロパティ

```svelte
<!-- Counter.svelte -->
<script lang="ts">
  interface Props {
    initial?: number;
    max?: number;
    onCountChange?: (count: number) => void;
  }

  let { initial = 0, max = 10, onCountChange }: Props = $props();

  let count = $state(initial);

  function increment() {
    if (count < max) {
      count++;
      onCountChange?.(count);
    }
  }
</script>

<div>
  <h2>Count: {count}</h2>
  <button onclick={increment} disabled={count >= max}>
    Increment
  </button>
</div>
```

```svelte
<!-- 親コンポーネント -->
<script lang="ts">
  import Counter from './Counter.svelte';

  function handleChange(newCount: number) {
    console.log('Count changed to:', newCount);
  }
</script>

<Counter initial={5} max={20} {onCountChange: handleChange} />
```

## ルーティング

### 基本ルート

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  let name = $state('World');
</script>

<h1>Hello {name}!</h1>
```

### 動的ルート

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';

  let { data } = $props();
</script>

<h1>{data.post.title}</h1>
<div>{@html data.post.content}</div>
```

```typescript
// src/routes/blog/[slug]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const post = await fetchPost(params.slug);

  if (!post) {
    throw error(404, 'Post not found');
  }

  return {
    post,
  };
};

async function fetchPost(slug: string) {
  // データベースやCMSから取得
  return {
    title: 'Sample Post',
    content: '<p>Content here...</p>',
    slug,
  };
}
```

### レイアウト

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import Header from '$components/Header.svelte';
  import Footer from '$components/Footer.svelte';

  let { children } = $props();
</script>

<div class="app">
  <Header />

  <main>
    {@render children()}
  </main>

  <Footer />
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
  }
</style>
```

### ネストレイアウト

```svelte
<!-- src/routes/dashboard/+layout.svelte -->
<script lang="ts">
  import Sidebar from './Sidebar.svelte';

  let { children } = $props();
</script>

<div class="dashboard">
  <Sidebar />
  <div class="content">
    {@render children()}
  </div>
</div>
```

### グループルート

```
src/routes/
├── (auth)/           # グループ（URLに含まれない）
│   ├── login/
│   │   └── +page.svelte    # /login
│   ├── register/
│   │   └── +page.svelte    # /register
│   └── +layout.svelte      # 認証ページ共通レイアウト
└── (app)/
    ├── dashboard/
    │   └── +page.svelte    # /dashboard
    └── +layout.svelte      # アプリ共通レイアウト
```

## データローディング

### ユニバーサルロード

```typescript
// src/routes/products/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
  const res = await fetch('/api/products');
  const products = await res.json();

  return {
    products,
  };
};
```

### サーバーロード

```typescript
// src/routes/products/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
  // サーバーサイドのみ実行（DBアクセス可）
  const products = await db.product.findMany({
    where: {
      userId: locals.user?.id,
    },
  });

  return {
    products,
  };
};
```

### ストリーミング

```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  return {
    // 即座に返す
    user: await getUser(),

    // 非同期ストリーミング
    stats: getStats(),        // Promise
    recentOrders: getOrders(), // Promise
  };
};
```

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  let { data } = $props();
</script>

<h1>Welcome, {data.user.name}</h1>

<!-- 即座に表示 -->
<UserProfile user={data.user} />

<!-- ローディング → データ表示 -->
{#await data.stats}
  <p>Loading stats...</p>
{:then stats}
  <Stats {stats} />
{/await}

{#await data.recentOrders}
  <p>Loading orders...</p>
{:then orders}
  <OrderList {orders} />
{/await}
```

## フォームアクション

### 基本フォーム

```typescript
// src/routes/contact/+page.server.ts
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const name = data.get('name');
    const email = data.get('email');
    const message = data.get('message');

    // バリデーション
    if (!name || !email || !message) {
      return fail(400, {
        error: 'All fields are required',
        name,
        email,
        message,
      });
    }

    // 処理（メール送信など）
    await sendEmail({ name, email, message });

    return {
      success: true,
    };
  },
} satisfies Actions;
```

```svelte
<!-- src/routes/contact/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
</script>

<form method="POST" use:enhance>
  {#if form?.success}
    <p class="success">Message sent successfully!</p>
  {/if}

  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <label>
    Name:
    <input name="name" value={form?.name ?? ''} required />
  </label>

  <label>
    Email:
    <input type="email" name="email" value={form?.email ?? ''} required />
  </label>

  <label>
    Message:
    <textarea name="message" required>{form?.message ?? ''}</textarea>
  </label>

  <button type="submit">Send</button>
</form>
```

### 名前付きアクション

```typescript
// src/routes/todos/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
  const todos = await db.todo.findMany();
  return { todos };
};

export const actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const text = data.get('text');

    if (!text) {
      return fail(400, { error: 'Text is required' });
    }

    await db.todo.create({
      data: { text: String(text), completed: false },
    });

    return { success: true };
  },

  toggle: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id');

    await db.todo.update({
      where: { id: Number(id) },
      data: { completed: { not: true } },
    });

    return { success: true };
  },

  delete: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id');

    await db.todo.delete({
      where: { id: Number(id) },
    });

    return { success: true };
  },
} satisfies Actions;
```

```svelte
<!-- src/routes/todos/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';

  let { data } = $props();
</script>

<form method="POST" action="?/create" use:enhance>
  <input name="text" placeholder="New todo..." />
  <button type="submit">Add</button>
</form>

<ul>
  {#each data.todos as todo}
    <li>
      <form method="POST" action="?/toggle" use:enhance>
        <input type="hidden" name="id" value={todo.id} />
        <button type="submit">
          {todo.completed ? '✓' : '○'}
        </button>
      </form>

      <span class:completed={todo.completed}>
        {todo.text}
      </span>

      <form method="POST" action="?/delete" use:enhance>
        <input type="hidden" name="id" value={todo.id} />
        <button type="submit">Delete</button>
      </form>
    </li>
  {/each}
</ul>

<style>
  .completed {
    text-decoration: line-through;
  }
</style>
```

### プログレッシブエンハンスメント

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  let submitting = $state(false);

  function handleSubmit() {
    return async ({ update }) => {
      submitting = true;
      await update();
      submitting = false;
    };
  }
</script>

<form
  method="POST"
  use:enhance={handleSubmit}
>
  <input name="email" type="email" required />
  <button type="submit" disabled={submitting}>
    {submitting ? 'Submitting...' : 'Submit'}
  </button>
</form>
```

## APIルート

### RESTエンドポイント

```typescript
// src/routes/api/posts/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
  const limit = Number(url.searchParams.get('limit') ?? '10');

  const posts = await db.post.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return json(posts);
};

export const POST: RequestHandler = async ({ request }) => {
  const { title, content } = await request.json();

  const post = await db.post.create({
    data: { title, content },
  });

  return json(post, { status: 201 });
};
```

```typescript
// src/routes/api/posts/[id]/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  const post = await db.post.findUnique({
    where: { id: Number(params.id) },
  });

  if (!post) {
    throw error(404, 'Post not found');
  }

  return json(post);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const { title, content } = await request.json();

  const post = await db.post.update({
    where: { id: Number(params.id) },
    data: { title, content },
  });

  return json(post);
};

export const DELETE: RequestHandler = async ({ params }) => {
  await db.post.delete({
    where: { id: Number(params.id) },
  });

  return new Response(null, { status: 204 });
};
```

## SEOとメタタグ

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>{data.post.title} | My Blog</title>
  <meta name="description" content={data.post.excerpt} />

  <!-- Open Graph -->
  <meta property="og:title" content={data.post.title} />
  <meta property="og:description" content={data.post.excerpt} />
  <meta property="og:image" content={data.post.coverImage} />
  <meta property="og:type" content="article" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.post.title} />
  <meta name="twitter:description" content={data.post.excerpt} />
  <meta name="twitter:image" content={data.post.coverImage} />
</svelte:head>

<article>
  <h1>{data.post.title}</h1>
  <div>{@html data.post.content}</div>
</article>
```

## デプロイ

### Vercel

```bash
npm install -D @sveltejs/adapter-vercel
```

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter(),
  },
};
```

### Cloudflare Pages

```bash
npm install -D @sveltejs/adapter-cloudflare
```

```javascript
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter(),
  },
};
```

### Node.js

```bash
npm install -D @sveltejs/adapter-node
```

```javascript
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({ out: 'build' }),
  },
};
```

```bash
# ビルド
npm run build

# 実行
node build
```

## まとめ

### SvelteKit 2の強み

1. **シンプル**: Runesで直感的なリアクティビティ
2. **高速**: コンパイル時最適化で小さいバンドル
3. **フルスタック**: SSR/SSG/SPA/APIルート全対応
4. **型安全**: TypeScriptファースト設計

### ベストプラクティス

- $stateで状態管理、$derivedで計算プロパティ
- サーバーロードで機密データ取得
- フォームアクションでプログレッシブエンハンスメント
- アダプタでデプロイ先最適化

### いつ使うべきか

**最適な用途**:
- パフォーマンス重視のWebアプリ
- SEOが重要なサイト
- フルスタックアプリケーション
- 小さいバンドルサイズが求められる

**他の選択肢を検討**:
- Reactエコシステムが必須 → Next.js
- Vueが好き → Nuxt
- 既存大規模Reactプロジェクト → 移行コスト大

### 次のステップ

- SvelteKit: https://kit.svelte.dev/
- Svelte 5: https://svelte-5-preview.vercel.app/
- Svelteコミュニティ: https://svelte.dev/chat
- Awesome Svelte: https://github.com/TheComputerM/awesome-svelte

SvelteKit 2で、次世代のWebアプリケーションを構築しましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
