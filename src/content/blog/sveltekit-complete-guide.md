---
title: 'SvelteKit完全ガイド — Svelte 5・Runes・SSR/SSG・フルスタック開発'
description: 'SvelteKitでフルスタックアプリを構築する完全ガイド。Svelte 5のRunes（$state・$derived・$effect）・ルーティング・Server Load・Form Actions・認証・デプロイまで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['SvelteKit', 'Svelte', 'TypeScript', 'フロントエンド', 'フルスタック']
---

SvelteKitは、Svelteをベースにしたフルスタックフレームワークとして急速に注目を集めている。Next.jsやNuxtと並ぶ選択肢として、その軽量さとパフォーマンスの高さで多くの開発者を惹きつけている。本記事では、Svelte 5の新機能であるRunesから始まり、ルーティング、データフェッチ、認証、デプロイまでを実装例付きで網羅的に解説する。

## 1. SvelteKit vs Next.js/Nuxt — 比較と選択基準

フレームワーク選択は、プロジェクトの性質と開発チームの経験によって大きく変わる。まず各フレームワークの特徴を整理しよう。

### バンドルサイズとパフォーマンス

SvelteKitの最大の強みは、ランタイムライブラリがほぼ存在しないことだ。Svelteはコンパイラベースのフレームワークであるため、ビルド時にコンポーネントをバニラJavaScriptに変換する。その結果、クライアントに送信されるJavaScriptの量が大幅に削減される。

| フレームワーク | ランタイムサイズ | 学習コスト | エコシステム |
|--------------|---------------|-----------|------------|
| SvelteKit | ~10KB | 低 | 成長中 |
| Next.js | ~130KB | 中 | 成熟 |
| Nuxt 3 | ~100KB | 中 | 成熟 |

### 仮想DOMの有無

ReactやVueは仮想DOMを使用してDOMの差分計算を行う。Svelteはコンパイル時に最適化された命令型のDOMの更新コードを生成するため、仮想DOMのオーバーヘッドがない。これによりメモリ使用量が削減され、特にモバイルデバイスでのパフォーマンスが向上する。

### いつSvelteKitを選ぶべきか

SvelteKitが適しているケース:
- パフォーマンスを最優先するプロジェクト
- 小〜中規模のチームで素早く開発したい場合
- 学習コストを抑えたい入門者
- コンテンツ中心のWebサイト（ブログ、マーケティングサイト）
- フルスタック開発を1つのフレームワークで完結させたい場合

Next.jsが適しているケース:
- 大規模エンタープライズアプリケーション
- Reactエコシステムの豊富なライブラリを活用したい場合
- チームがReactに精通している場合
- 採用市場での需要を重視する場合

## 2. プロジェクト初期化（create svelte）

SvelteKitプロジェクトの作成は非常にシンプルだ。

```bash
# 新規プロジェクト作成
npm create svelte@latest my-sveltekit-app
cd my-sveltekit-app

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

`create svelte`コマンドを実行すると、インタラクティブなウィザードが起動する。

```
┌  Welcome to SvelteKit!
│
◇  Which Svelte app template?
│  ● SvelteKit demo app
│  ○ Skeleton project
│  ○ Library project
│
◇  Add type checking with TypeScript?
│  ● Yes, using TypeScript syntax
│  ○ Yes, using JavaScript with JSDoc comments
│  ○ No
│
◇  Select additional options (use arrow keys/space bar)
│  ◼ Add ESLint for code linting
│  ◼ Add Prettier for code formatting
│  ◼ Add Playwright for browser testing
│  ◼ Add Vitest for unit testing
```

### 推奨ディレクトリ構成

```
my-sveltekit-app/
├── src/
│   ├── lib/                    # 共有ライブラリ・コンポーネント
│   │   ├── components/         # 再利用可能コンポーネント
│   │   ├── server/             # サーバー専用コード
│   │   └── utils/              # ユーティリティ関数
│   ├── routes/                 # ページとAPI
│   │   ├── +layout.svelte      # ルートレイアウト
│   │   ├── +layout.server.ts   # サーバーレイアウトロード
│   │   ├── +page.svelte        # ホームページ
│   │   └── api/                # API Routes
│   ├── app.html                # HTMLテンプレート
│   └── app.d.ts                # 型定義
├── static/                     # 静的ファイル
├── svelte.config.js            # Svelte設定
├── vite.config.ts              # Vite設定
└── tsconfig.json               # TypeScript設定
```

### svelte.config.jsの設定

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // プリプロセッサ設定（TypeScript・PostCSS等）
  preprocess: vitePreprocess(),

  kit: {
    // アダプター設定（デプロイ先に応じて変更）
    adapter: adapter(),

    // エイリアス設定
    alias: {
      '$components': 'src/lib/components',
      '$utils': 'src/lib/utils',
      '$server': 'src/lib/server'
    }
  }
};

export default config;
```

## 3. Svelte 5 Runes — リアクティビティの革命

Svelte 5はRunesという新しいリアクティビティシステムを導入した。従来の暗黙的なリアクティビティから、より明示的で予測可能なアプローチへの転換だ。

### $state — リアクティブな状態

```svelte
<script lang="ts">
  // 従来のSvelte 4
  // let count = 0; // 暗黙的にリアクティブ

  // Svelte 5 Runes
  let count = $state(0);
  let user = $state({
    name: '田中太郎',
    email: 'tanaka@example.com',
    preferences: {
      theme: 'dark',
      language: 'ja'
    }
  });

  function increment() {
    count++;
  }

  function updateTheme(theme: string) {
    // ネストしたオブジェクトも自動的にリアクティブ
    user.preferences.theme = theme;
  }
</script>

<button onclick={increment}>
  クリック数: {count}
</button>

<p>ユーザー: {user.name}</p>
<p>テーマ: {user.preferences.theme}</p>
```

### $state.raw — 非リアクティブな参照

```svelte
<script lang="ts">
  // 深いリアクティビティが不要な大きなオブジェクト
  let largeDataset = $state.raw<Item[]>([]);

  // 配列を完全に置き換える場合のみ更新をトリガー
  async function loadData() {
    const response = await fetch('/api/items');
    largeDataset = await response.json(); // これは更新をトリガー
    // largeDataset.push(item); // これはトリガーしない
  }
</script>
```

### $derived — 派生状態

```svelte
<script lang="ts">
  let items = $state<string[]>(['りんご', 'バナナ', 'みかん']);
  let filter = $state('');

  // フィルタリングされた結果を自動的に計算
  let filteredItems = $derived(
    items.filter(item => item.includes(filter))
  );

  // 複雑な計算
  let stats = $derived.by(() => {
    const total = items.length;
    const filtered = filteredItems.length;
    const ratio = total > 0 ? (filtered / total * 100).toFixed(1) : '0';
    return { total, filtered, ratio };
  });
</script>

<input bind:value={filter} placeholder="フィルター..." />
<p>表示: {stats.filtered}/{stats.total}件 ({stats.ratio}%)</p>

<ul>
  {#each filteredItems as item}
    <li>{item}</li>
  {/each}
</ul>
```

### $effect — 副作用の管理

```svelte
<script lang="ts">
  let searchQuery = $state('');
  let results = $state<SearchResult[]>([]);
  let isLoading = $state(false);

  // searchQueryが変更されるたびに実行
  $effect(() => {
    if (searchQuery.length < 2) {
      results = [];
      return;
    }

    isLoading = true;
    const controller = new AbortController();

    fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
      signal: controller.signal
    })
      .then(res => res.json())
      .then(data => {
        results = data;
        isLoading = false;
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
          isLoading = false;
        }
      });

    // クリーンアップ関数（次のeffect実行前に呼ばれる）
    return () => {
      controller.abort();
    };
  });

  // DOMアクセスが必要な場合はeffect内で行う
  $effect(() => {
    document.title = searchQuery
      ? `「${searchQuery}」の検索結果`
      : 'TechBoost';
  });
</script>
```

### $props — コンポーネントプロパティ

```svelte
<!-- Button.svelte -->
<script lang="ts">
  interface ButtonProps {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    onclick?: () => void;
    // スロットの代わりにsnippet
    children?: import('svelte').Snippet;
  }

  let {
    label,
    variant = 'primary',
    disabled = false,
    onclick,
    children
  }: ButtonProps = $props();

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };
</script>

<button
  class="px-4 py-2 rounded-md font-medium transition-colors {variantClasses[variant]}"
  {disabled}
  {onclick}
>
  {#if children}
    {@render children()}
  {:else}
    {label}
  {/if}
</button>
```

### $bindable — 双方向バインディング

```svelte
<!-- TextInput.svelte -->
<script lang="ts">
  let {
    value = $bindable(''),
    placeholder = '',
    label
  } = $props();
</script>

<label>
  {label}
  <input
    bind:value
    {placeholder}
    class="border rounded px-3 py-2 w-full"
  />
</label>
```

```svelte
<!-- 使用側 -->
<script lang="ts">
  import TextInput from '$components/TextInput.svelte';
  let username = $state('');
</script>

<!-- bind:value で双方向バインディング -->
<TextInput bind:value={username} label="ユーザー名" />
<p>入力値: {username}</p>
```

## 4. コンポーネント設計

SvelteコンポーネントはHTML・JavaScript・CSSを1つのファイルに記述する単一ファイルコンポーネント（SFC）形式だ。

### 基本的なコンポーネント構造

```svelte
<!-- Card.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface CardProps {
    title: string;
    description?: string;
    badge?: string;
    header?: Snippet;
    footer?: Snippet;
    children: Snippet;
  }

  let {
    title,
    description,
    badge,
    header,
    footer,
    children
  }: CardProps = $props();
</script>

<article class="card">
  {#if header}
    <div class="card-header">
      {@render header()}
    </div>
  {/if}

  <div class="card-body">
    <div class="card-title-row">
      <h2 class="card-title">{title}</h2>
      {#if badge}
        <span class="badge">{badge}</span>
      {/if}
    </div>
    {#if description}
      <p class="card-description">{description}</p>
    {/if}
    {@render children()}
  </div>

  {#if footer}
    <div class="card-footer">
      {@render footer()}
    </div>
  {/if}
</article>

<style>
  /* コンポーネントスコープのスタイル（自動的にスコープ化） */
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .card-body {
    padding: 1.5rem;
  }

  .card-title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .card-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    background: var(--color-primary-100);
    color: var(--color-primary-700);
  }

  /* グローバルスタイルは :global() で適用 */
  :global(.dark) .card {
    background: var(--color-surface-dark);
  }
</style>
```

### イベントとアクション

```svelte
<!-- ClickOutside.svelte（カスタムアクション） -->
<script lang="ts">
  import { clickOutside } from '$lib/actions/clickOutside';

  let isOpen = $state(false);

  function handleClickOutside() {
    isOpen = false;
  }
</script>

<div use:clickOutside={handleClickOutside}>
  <button onclick={() => isOpen = !isOpen}>
    メニューを開く
  </button>

  {#if isOpen}
    <div class="dropdown">
      <!-- メニューコンテンツ -->
    </div>
  {/if}
</div>
```

```typescript
// src/lib/actions/clickOutside.ts
export function clickOutside(
  node: HTMLElement,
  callback: () => void
) {
  function handleClick(event: MouseEvent) {
    if (!node.contains(event.target as Node)) {
      callback();
    }
  }

  document.addEventListener('click', handleClick, true);

  return {
    destroy() {
      document.removeEventListener('click', handleClick, true);
    },
    update(newCallback: () => void) {
      callback = newCallback;
    }
  };
}
```

## 5. ルーティング — ファイルベースの直感的な構造

SvelteKitはファイルシステムベースのルーティングを採用している。`src/routes`ディレクトリの構造がそのままURLパスに対応する。

### 基本的なルーティング

```
src/routes/
├── +page.svelte              → /
├── about/
│   └── +page.svelte          → /about
├── blog/
│   ├── +page.svelte          → /blog
│   ├── +layout.svelte        → /blog/* 全ページに適用
│   └── [slug]/
│       └── +page.svelte      → /blog/:slug
├── (auth)/                   → URLに影響しないグループ
│   ├── login/
│   │   └── +page.svelte      → /login
│   └── register/
│       └── +page.svelte      → /register
└── api/
    └── users/
        └── +server.ts        → /api/users（APIエンドポイント）
```

### レイアウトコンポーネント

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import Navigation from '$components/Navigation.svelte';
  import Footer from '$components/Footer.svelte';

  let { children } = $props();

  // ページごとにメタデータが異なる
  $derived: const pageTitle = $page.data.title ?? 'TechBoost';
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="app-layout">
  <Navigation />

  <main class="main-content">
    {@render children()}
  </main>

  <Footer />
</div>

<style>
  .app-layout {
    display: grid;
    grid-template-rows: auto 1fr auto;
    min-height: 100vh;
  }

  .main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
    width: 100%;
  }
</style>
```

### 動的ルートパラメータ

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import ArticleHeader from '$components/ArticleHeader.svelte';
  import TableOfContents from '$components/TableOfContents.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.post.title} | TechBoost</title>
  <meta name="description" content={data.post.excerpt} />
  <meta property="og:title" content={data.post.title} />
  <meta property="og:image" content={data.post.ogImage} />
</svelte:head>

<article class="blog-post">
  <ArticleHeader
    title={data.post.title}
    author={data.post.author}
    publishedAt={data.post.publishedAt}
    tags={data.post.tags}
  />

  <div class="post-layout">
    <div class="post-content">
      {@html data.post.content}
    </div>
    <aside class="post-sidebar">
      <TableOfContents headings={data.post.headings} />
    </aside>
  </div>
</article>
```

### エラーページのカスタマイズ

```svelte
<!-- src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="error-page">
  <h1>{$page.status}</h1>
  {#if $page.status === 404}
    <p>ページが見つかりません。URLを確認してください。</p>
  {:else if $page.status === 500}
    <p>サーバーエラーが発生しました。しばらくしてから再試行してください。</p>
  {:else}
    <p>{$page.error?.message}</p>
  {/if}
  <a href="/">ホームに戻る</a>
</div>
```

## 6. Load関数 — データフェッチの仕組み

SvelteKitのLoad関数は、ページが描画される前にデータを取得するための仕組みだ。サーバーサイドとクライアントサイドの両方で動作する。

### ユニバーサルLoad（+page.ts）

```typescript
// src/routes/blog/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
  const page = Number(url.searchParams.get('page') ?? '1');
  const category = url.searchParams.get('category') ?? 'all';

  const [postsResponse, categoriesResponse] = await Promise.all([
    fetch(`/api/posts?page=${page}&category=${category}`),
    fetch('/api/categories')
  ]);

  if (!postsResponse.ok) {
    throw new Error('記事の取得に失敗しました');
  }

  const posts = await postsResponse.json();
  const categories = await categoriesResponse.json();

  return {
    posts,
    categories,
    currentPage: page,
    currentCategory: category
  };
};
```

### サーバー専用Load（+page.server.ts）

```typescript
// src/routes/blog/[slug]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/database';
import { marked } from 'marked';

export const load: PageServerLoad = async ({ params, locals }) => {
  const { slug } = params;

  // データベースから記事を取得（サーバーサイドのみ）
  const post = await db.query.posts.findFirst({
    where: (posts, { eq }) => eq(posts.slug, slug),
    with: {
      author: true,
      tags: true
    }
  });

  if (!post) {
    throw error(404, `記事「${slug}」が見つかりません`);
  }

  // 公開済み記事のみ表示（管理者は下書きも閲覧可能）
  if (post.status === 'draft' && !locals.user?.isAdmin) {
    throw error(403, 'この記事は公開されていません');
  }

  // MarkdownをHTMLに変換
  const content = await marked(post.content);

  // 閲覧数をインクリメント（バックグラウンドで実行）
  db.update(posts)
    .set({ viewCount: sql`${posts.viewCount} + 1` })
    .where(eq(posts.id, post.id));

  return {
    post: {
      ...post,
      content,
      // APIキー等は絶対に含めない
    },
    title: post.title
  };
};
```

### レイアウトのLoad関数

```typescript
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getUserFromSession } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies, depends }) => {
  // キャッシュ依存関係を宣言
  depends('app:user');

  const sessionId = cookies.get('session_id');
  const user = sessionId ? await getUserFromSession(sessionId) : null;

  return {
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role
    } : null
  };
};
```

## 7. Form Actions — フォーム処理のベストプラクティス

Form ActionsはSvelteKitの強力な機能で、JavaScriptなしでも動作するフォーム処理を実現する。

### 基本的なForm Action

```typescript
// src/routes/contact/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { sendEmail } from '$lib/server/email';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1, '名前を入力してください').max(100),
  email: z.string().email('有効なメールアドレスを入力してください'),
  subject: z.string().min(1, '件名を入力してください'),
  message: z.string().min(10, 'メッセージは10文字以上で入力してください').max(5000)
});

export const actions: Actions = {
  // デフォルトアクション（フォームのactionを指定しない場合）
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const rawData = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message')
    };

    // バリデーション
    const result = contactSchema.safeParse(rawData);
    if (!result.success) {
      return fail(400, {
        errors: result.error.flatten().fieldErrors,
        data: rawData // フォームの入力値を保持
      });
    }

    try {
      await sendEmail({
        to: 'info@techboost.dev',
        ...result.data
      });

      return { success: true };
    } catch (err) {
      return fail(500, {
        message: '送信に失敗しました。しばらくしてから再試行してください。'
      });
    }
  }
};

// 名前付きアクション（複数のアクションを定義）
export const actions: Actions = {
  create: async ({ request }) => { /* ... */ },
  update: async ({ request, params }) => { /* ... */ },
  delete: async ({ request, params }) => { /* ... */ }
};
```

### enhanceでプログレッシブエンハンスメント

```svelte
<!-- src/routes/contact/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  let isSubmitting = $state(false);

  function handleSubmit() {
    return async ({ result, update }: {
      result: import('@sveltejs/kit').ActionResult;
      update: () => Promise<void>;
    }) => {
      isSubmitting = false;
      await update();

      if (result.type === 'success') {
        // 成功時の追加処理（アナリティクス等）
        console.log('フォーム送信成功');
      }
    };
  }
</script>

<form
  method="POST"
  use:enhance={() => {
    isSubmitting = true;
    return handleSubmit();
  }}
>
  <div class="form-group">
    <label for="name">お名前</label>
    <input
      id="name"
      name="name"
      type="text"
      value={form?.data?.name ?? ''}
      class:error={form?.errors?.name}
      required
    />
    {#if form?.errors?.name}
      <p class="error-message">{form.errors.name[0]}</p>
    {/if}
  </div>

  <div class="form-group">
    <label for="email">メールアドレス</label>
    <input
      id="email"
      name="email"
      type="email"
      value={form?.data?.email ?? ''}
      class:error={form?.errors?.email}
      required
    />
    {#if form?.errors?.email}
      <p class="error-message">{form.errors.email[0]}</p>
    {/if}
  </div>

  <div class="form-group">
    <label for="message">メッセージ</label>
    <textarea
      id="message"
      name="message"
      rows={6}
      class:error={form?.errors?.message}
      required
    >{form?.data?.message ?? ''}</textarea>
    {#if form?.errors?.message}
      <p class="error-message">{form.errors.message[0]}</p>
    {/if}
  </div>

  {#if form?.success}
    <div class="alert alert-success">
      お問い合わせを受け付けました。2営業日以内にご回答いたします。
    </div>
  {/if}

  {#if form?.message}
    <div class="alert alert-error">{form.message}</div>
  {/if}

  <button type="submit" disabled={isSubmitting}>
    {isSubmitting ? '送信中...' : '送信する'}
  </button>
</form>
```

## 8. API Routes — バックエンドの実装

SvelteKitは`+server.ts`ファイルでRESTful APIを実装できる。

```typescript
// src/routes/api/posts/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/database';
import { posts } from '$lib/server/schema';
import { desc, eq, like, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
  const page = Number(url.searchParams.get('page') ?? '1');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '10'), 50);
  const search = url.searchParams.get('search') ?? '';
  const category = url.searchParams.get('category');
  const offset = (page - 1) * limit;

  const conditions = [eq(posts.status, 'published')];

  if (search) {
    conditions.push(like(posts.title, `%${search}%`));
  }

  if (category) {
    conditions.push(eq(posts.category, category));
  }

  const [items, total] = await Promise.all([
    db.select().from(posts)
      .where(and(...conditions))
      .orderBy(desc(posts.publishedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(posts)
      .where(and(...conditions))
  ]);

  return json({
    posts: items,
    pagination: {
      page,
      limit,
      total: total[0].count,
      totalPages: Math.ceil(total[0].count / limit)
    }
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  // 認証チェック
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(401, '認証が必要です');
  }

  const body = await request.json();

  // バリデーション・処理
  const newPost = await db.insert(posts).values({
    ...body,
    authorId: locals.user.id,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  return json(newPost[0], { status: 201 });
};
```

### ミドルウェアの実装（hooks.server.ts）

```typescript
// src/hooks.server.ts
import type { Handle, HandleError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { validateSession } from '$lib/server/auth';

// 認証ミドルウェア
const authHandle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session_id');

  if (sessionId) {
    const user = await validateSession(sessionId);
    if (user) {
      event.locals.user = user;
    } else {
      // 無効なセッションはCookieを削除
      event.cookies.delete('session_id', { path: '/' });
    }
  }

  return resolve(event);
};

// CORSミドルウェア（API用）
const corsHandle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api/')) {
    const response = await resolve(event);

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  }

  return resolve(event);
};

// セキュリティヘッダーミドルウェア
const securityHandle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );

  return response;
};

// ミドルウェアをチェーン
export const handle: Handle = sequence(authHandle, corsHandle, securityHandle);

// エラーハンドリング
export const handleError: HandleError = async ({ error, event }) => {
  const errorId = crypto.randomUUID();

  console.error(`Error ${errorId}:`, error);

  // エラーログをデータベースやSentryに記録
  // await logError({ errorId, error, url: event.url.pathname });

  return {
    message: '予期しないエラーが発生しました',
    errorId
  };
};
```

## 9. 認証 — lucia-authを使ったセッション管理

lucia-authはSvelteKitと相性の良い軽量な認証ライブラリだ。

```bash
npm install lucia @lucia-auth/adapter-drizzle
```

```typescript
// src/lib/server/auth.ts
import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from './database';
import { sessions, users } from './schema';

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  },
  getUserAttributes: (attributes) => ({
    id: attributes.id,
    email: attributes.email,
    name: attributes.name,
    role: attributes.role,
    avatar: attributes.avatar
  })
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      id: string;
      email: string;
      name: string;
      role: 'user' | 'admin';
      avatar: string | null;
    };
  }
}
```

```typescript
// src/routes/(auth)/login/+page.server.ts
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';
import { db } from '$lib/server/database';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { Argon2id } from 'oslo/password';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // ユーザー検索
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      // タイミング攻撃対策：ユーザーが存在しない場合も同じ時間を消費
      await new Argon2id().verify('dummy_hash', password);
      return fail(400, { message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    const validPassword = await new Argon2id().verify(user.passwordHash, password);
    if (!validPassword) {
      return fail(400, { message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // セッション作成
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });

    throw redirect(302, '/dashboard');
  }
};
```

### ルート保護

```typescript
// src/routes/(protected)/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login?redirect=' + encodeURIComponent(event.url.pathname));
  }

  return { user: locals.user };
};
```

## 10. 状態管理 — Svelte Stores

Svelteには組み込みの状態管理システムがある。コンポーネント間での状態共有にはStoreを使用する。

```typescript
// src/lib/stores/cart.ts
import { writable, derived, get } from 'svelte/store';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

function createCartStore() {
  // ローカルストレージから初期値を復元
  const initialItems: CartItem[] = typeof localStorage !== 'undefined'
    ? JSON.parse(localStorage.getItem('cart') ?? '[]')
    : [];

  const { subscribe, set, update } = writable<CartItem[]>(initialItems);

  // ローカルストレージに自動保存
  subscribe(items => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  });

  return {
    subscribe,

    addItem(item: Omit<CartItem, 'quantity'>) {
      update(items => {
        const existing = items.find(i => i.id === item.id);
        if (existing) {
          return items.map(i =>
            i.id === item.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        }
        return [...items, { ...item, quantity: 1 }];
      });
    },

    removeItem(id: string) {
      update(items => items.filter(item => item.id !== id));
    },

    updateQuantity(id: string, quantity: number) {
      if (quantity <= 0) {
        this.removeItem(id);
        return;
      }
      update(items =>
        items.map(item =>
          item.id === id ? { ...item, quantity } : item
        )
      );
    },

    clear() {
      set([]);
    }
  };
}

export const cart = createCartStore();

// 派生ストア
export const cartTotal = derived(cart, $cart =>
  $cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

export const cartItemCount = derived(cart, $cart =>
  $cart.reduce((sum, item) => sum + item.quantity, 0)
);
```

```svelte
<!-- CartButton.svelte -->
<script lang="ts">
  import { cart, cartItemCount, cartTotal } from '$lib/stores/cart';
</script>

<button class="cart-button" aria-label="カート ({$cartItemCount}件)">
  <svg><!-- カートアイコン --></svg>
  {#if $cartItemCount > 0}
    <span class="badge">{$cartItemCount}</span>
  {/if}
  <span class="total">¥{$cartTotal.toLocaleString()}</span>
</button>
```

### Context APIとStoreの組み合わせ

```svelte
<!-- ThemeProvider.svelte -->
<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';

  type Theme = 'light' | 'dark' | 'system';

  const theme = writable<Theme>('system');

  setContext('theme', {
    theme,
    setTheme: (newTheme: Theme) => theme.set(newTheme)
  });

  let { children } = $props();
</script>

<div class="theme-provider" data-theme={$theme}>
  {@render children()}
</div>
```

## 11. SSG — 静的サイト生成

SvelteKitはprerenderオプションで静的サイトを生成できる。

```typescript
// src/routes/blog/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';

// このルートをプリレンダリングする
export const prerender = true;

// または動的に制御
export const prerender = 'auto';

// +page.tsでエントリーポイントを生成
export async function entries() {
  // ビルド時にすべての記事スラッグを取得
  const response = await fetch('https://api.example.com/posts?fields=slug');
  const posts = await response.json();

  return posts.map((post: { slug: string }) => ({
    slug: post.slug
  }));
}
```

```javascript
// svelte.config.js - adapter-staticの設定
import adapter from '@sveltejs/adapter-static';

const config = {
  kit: {
    adapter: adapter({
      // 出力ディレクトリ
      pages: 'build',
      assets: 'build',
      // フォールバックページ（SPA用）
      fallback: '404.html',
      // キャッシュ制御
      precompress: true
    }),

    // プリレンダリング設定
    prerender: {
      // クロールしてすべてのリンクを自動検出
      crawl: true,
      // エラーを無視するパスのパターン
      handleMissingId: 'ignore',
      // 並列実行数
      concurrency: 4
    }
  }
};
```

### ビルドとデプロイ

```bash
# 静的サイトのビルド
npm run build

# ビルド結果の確認
npm run preview

# GitHub Pagesへのデプロイ
npm install -D gh-pages
npx gh-pages -d build
```

## 12. SSR — サーバーサイドレンダリング

本番環境での動的サイトにはSSRが必要だ。

```javascript
// svelte.config.js - adapter-nodeの設定
import adapter from '@sveltejs/adapter-node';

const config = {
  kit: {
    adapter: adapter({
      // 出力ディレクトリ
      out: 'build',
      // プリコンプレス
      precompress: false,
      // 環境変数のプレフィックス
      envPrefix: 'MY_APP_'
    })
  }
};
```

### Dockerを使ったSSR運用

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
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --production

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "build/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/myapp
      SESSION_SECRET: your-secret-key
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 13. Vercel/Cloudflare Pagesデプロイ

### Vercelへのデプロイ

Vercelはadapter-vercelを使用する。

```bash
npm install -D @sveltejs/adapter-vercel
```

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

const config = {
  kit: {
    adapter: adapter({
      // Edge Runtimeの使用（より高速）
      runtime: 'edge',
      // リージョン設定
      regions: ['hnd1'], // 東京
      // 特定のルートにのみ設定を適用する場合
      // routes: [{ src: '/api/**', runtime: 'nodejs20.x' }]
    })
  }
};
```

```json
// vercel.json（オプション）
{
  "regions": ["hnd1"],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Cloudflare Pagesへのデプロイ

```bash
npm install -D @sveltejs/adapter-cloudflare
```

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

const config = {
  kit: {
    adapter: adapter({
      // KVネームスペースのバインディング
      // routes: { include: ['/*'], exclude: ['<all>'] }
    })
  }
};
```

```typescript
// Cloudflare Workers固有の型定義
// src/app.d.ts
declare global {
  namespace App {
    interface Platform {
      env: {
        KV: KVNamespace;
        DB: D1Database;
        BUCKET: R2Bucket;
      };
      context: ExecutionContext;
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
```

```typescript
// Cloudflare KVを使ったキャッシュ
// src/routes/api/posts/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform, url }) => {
  const cacheKey = url.pathname + url.search;

  // KVキャッシュを確認
  const cached = await platform?.env.KV.get(cacheKey, 'json');
  if (cached) {
    return json(cached, {
      headers: { 'X-Cache': 'HIT' }
    });
  }

  // データを取得
  const data = await fetchFromDatabase();

  // 5分間キャッシュ
  await platform?.env.KV.put(cacheKey, JSON.stringify(data), {
    expirationTtl: 300
  });

  return json(data, {
    headers: { 'X-Cache': 'MISS' }
  });
};
```

### GitHub Actionsによる自動デプロイ

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
      - run: npm ci
      - run: npm run check    # TypeScriptチェック
      - run: npm run lint     # ESLintチェック
      - run: npm run test     # Vitestテスト

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## パフォーマンス最適化のTips

### コード分割と遅延読み込み

```svelte
<script lang="ts">
  // 動的インポートで大きなコンポーネントを遅延読み込み
  let HeavyComponent: typeof import('$components/HeavyComponent.svelte').default;

  async function loadComponent() {
    const module = await import('$components/HeavyComponent.svelte');
    HeavyComponent = module.default;
  }
</script>

{#if HeavyComponent}
  <HeavyComponent />
{:else}
  <button onclick={loadComponent}>コンポーネントを読み込む</button>
{/if}
```

### 画像の最適化

```svelte
<script lang="ts">
  import { enhance } from 'svelte-image'; // 仮のパッケージ
</script>

<!-- ネイティブのlazy loading -->
<img
  src="/images/hero.jpg"
  alt="ヒーロー画像"
  loading="lazy"
  decoding="async"
  width={1200}
  height={630}
/>

<!-- pictureタグでレスポンシブ画像 -->
<picture>
  <source srcset="/images/hero.avif" type="image/avif" />
  <source srcset="/images/hero.webp" type="image/webp" />
  <img
    src="/images/hero.jpg"
    alt="ヒーロー画像"
    width={1200}
    height={630}
    loading="eager"
  />
</picture>
```

### Service Workerによるキャッシュ

```javascript
// static/service-worker.js
const CACHE_NAME = 'techboost-v1';
const STATIC_ASSETS = [
  '/',
  '/about',
  '/blog',
  '/offline'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).catch(() => {
        return caches.match('/offline');
      });
    })
  );
});
```

## テストの書き方

### Vitestによるユニットテスト

```typescript
// src/lib/utils/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, truncate } from './format';

describe('formatCurrency', () => {
  it('日本円をフォーマットする', () => {
    expect(formatCurrency(1000, 'JPY')).toBe('¥1,000');
    expect(formatCurrency(1000000, 'JPY')).toBe('¥1,000,000');
  });

  it('マイナス値を正しく処理する', () => {
    expect(formatCurrency(-500, 'JPY')).toBe('-¥500');
  });
});

describe('truncate', () => {
  it('指定した長さで文字列を切り詰める', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
    expect(truncate('Hi', 10)).toBe('Hi');
  });
});
```

### PlaywrightによるE2Eテスト

```typescript
// tests/contact.spec.ts
import { test, expect } from '@playwright/test';

test.describe('お問い合わせフォーム', () => {
  test('正常に送信できる', async ({ page }) => {
    await page.goto('/contact');

    await page.fill('[name="name"]', '田中太郎');
    await page.fill('[name="email"]', 'tanaka@example.com');
    await page.fill('[name="subject"]', 'テスト件名');
    await page.fill('[name="message"]', 'これはテストメッセージです。10文字以上です。');

    await page.click('[type="submit"]');

    await expect(page.locator('.alert-success')).toBeVisible();
    await expect(page.locator('.alert-success')).toContainText('受け付けました');
  });

  test('バリデーションエラーを表示する', async ({ page }) => {
    await page.goto('/contact');
    await page.click('[type="submit"]');

    await expect(page.locator('.error-message').first()).toBeVisible();
  });
});
```

## まとめ

SvelteKitはシンプルさとパフォーマンスを両立した優れたフルスタックフレームワークだ。本記事で解説した内容を振り返ると:

- **Svelte 5 Runes**（`$state`・`$derived`・`$effect`・`$props`）により、リアクティビティがより明示的かつ予測可能になった
- **ファイルベースルーティング**と**Load関数**で、データフェッチとページレンダリングが自然に統合されている
- **Form Actions**と`enhance`ディレクティブで、プログレッシブエンハンスメントを実現できる
- **+server.ts**でAPIエンドポイントをシームレスに実装できる
- **adapter-static・adapter-vercel・adapter-cloudflare**など複数のアダプターで柔軟なデプロイが可能

SvelteKitでAPIを開発する際、レスポンスの検証やデバッグに時間がかかることがある。**[DevToolBox](https://usedevtools.com/)** はJSON整形・diff比較・Base64エンコード/デコードなど開発者向けのユーティリティをブラウザ上で即座に利用できるツールだ。SvelteKitのForm ActionsやAPI Routesをデバッグする際に、レスポンスJSONを貼り付けてすぐに検証できるため、開発効率が大幅に向上する。ぜひ開発環境のブックマークに追加しておきたい。

SvelteKitのエコシステムは急速に成長しており、2026年現在では多くのSaaS・コンテンツサイト・社内ツールでの採用事例が増えている。特にパフォーマンスを重視するプロジェクトや、TypeScriptとの相性の良さを求める開発者に強くおすすめしたい。
