---
title: "Astro完全ガイド2026 - 最速の静的サイト生成フレームワーク"
description: "Astroの基礎から実践まで徹底解説。Islandsアーキテクチャ、コンテンツコレクション、React/Vue/Svelte統合、Astro DB、SSR/SSG、デプロイまで完全網羅。"
pubDate: "2026-02-05"
tags: ["Astro", "SSG", "静的サイト", "パフォーマンス", "フレームワーク"]
---

## はじめに

Astroは、2026年現在**最も高速な静的サイト生成フレームワーク**として注目されています。

**「デフォルトでJavaScriptゼロ」**という革新的なアプローチで、極限までパフォーマンスを追求しています。

### Astroの特徴

- **Islands Architecture**: 必要な部分だけJavaScriptを読み込む
- **Zero JS by default**: 静的HTMLのみ生成（必要に応じてJS追加）
- **フレームワーク非依存**: React、Vue、Svelte、Solidを同時使用可能
- **コンテンツファースト**: ブログ・ドキュメントに最適
- **高速ビルド**: Vite powered
- **TypeScript**: デフォルトでサポート

### いつAstroを選ぶべきか

**最適な用途:**
- ブログ・マーケティングサイト
- ドキュメントサイト
- ポートフォリオサイト
- ランディングページ
- 静的コンテンツ中心のサイト

**不向きな用途:**
- リアルタイムチャット
- 複雑なSPA（認証・状態管理が多い）
- 管理画面（Next.jsの方が適している）

## セットアップ

### プロジェクト作成

```bash
# 公式テンプレートで作成
npm create astro@latest

# 選択肢:
# - Empty project
# - Blog
# - Documentation
# - Portfolio
# - Minimal
```

### 手動セットアップ

```bash
mkdir my-astro-site
cd my-astro-site
npm init -y
npm install astro
```

```json
// package.json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  }
}
```

### プロジェクト構造

```
my-astro-site/
├── src/
│   ├── components/
│   │   └── Header.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── about.astro
│   └── content/
│       └── blog/
│           └── post-1.md
├── public/
│   └── favicon.svg
├── astro.config.mjs
└── tsconfig.json
```

## Astroファイル構文

### 基本構造

```astro
---
// フロントマター（JavaScriptコード）
const title = "My Page";
const items = [1, 2, 3];
---

<!-- HTMLテンプレート -->
<html>
  <head>
    <title>{title}</title>
  </head>
  <body>
    <h1>{title}</h1>
    <ul>
      {items.map((item) => (
        <li>{item}</li>
      ))}
    </ul>
  </body>
</html>
```

### コンポーネント例

```astro
---
// src/components/Card.astro
interface Props {
  title: string;
  description: string;
  url?: string;
}

const { title, description, url } = Astro.props;
---

<div class="card">
  <h2>{title}</h2>
  <p>{description}</p>
  {url && <a href={url}>Learn more →</a>}
</div>

<style>
  .card {
    border: 1px solid #ccc;
    padding: 1rem;
    border-radius: 8px;
  }

  .card h2 {
    margin-top: 0;
  }
</style>
```

### レイアウト

```astro
---
// src/layouts/Layout.astro
interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{title}</title>
  </head>
  <body>
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/blog">Blog</a>
        <a href="/about">About</a>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <footer>
      <p>&copy; 2026 My Site</p>
    </footer>
  </body>
</html>

<style is:global>
  body {
    margin: 0;
    font-family: system-ui;
  }
</style>
```

## ページ・ルーティング

### ファイルベースルーティング

```
src/pages/
├── index.astro           → /
├── about.astro           → /about
├── blog/
│   ├── index.astro       → /blog
│   └── [slug].astro      → /blog/:slug
└── [...path].astro       → /* (404ページ等)
```

### 動的ルート

```astro
---
// src/pages/blog/[slug].astro
import Layout from '../../layouts/Layout.astro';

// getStaticPaths で静的パスを生成
export async function getStaticPaths() {
  const posts = await Astro.glob('../content/blog/*.md');

  return posts.map((post) => ({
    params: { slug: post.frontmatter.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post;
---

<Layout title={post.frontmatter.title}>
  <article>
    <h1>{post.frontmatter.title}</h1>
    <time>{post.frontmatter.pubDate}</time>
    <Content />
  </article>
</Layout>
```

## コンテンツコレクション

### 設定

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  blog,
};
```

### Markdownファイル

```markdown
---
# src/content/blog/first-post.md
title: "My First Post"
description: "This is my first blog post."
pubDate: 2026-02-05
tags: ["astro", "blogging"]
---

## Hello, Astro!

This is my **first** blog post.
```

### コンテンツ取得

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'astro:content';
import Layout from '../../layouts/Layout.astro';

// 全記事取得（下書きを除外）
const posts = await getCollection('blog', ({ data }) => {
  return data.draft !== true;
});

// 日付順ソート
posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
---

<Layout title="Blog">
  <h1>Blog Posts</h1>
  <ul>
    {posts.map((post) => (
      <li>
        <a href={`/blog/${post.slug}`}>
          {post.data.title}
        </a>
        <time>{post.data.pubDate.toLocaleDateString()}</time>
      </li>
    ))}
  </ul>
</Layout>
```

### 個別記事ページ

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection } from 'astro:content';
import Layout from '../../layouts/Layout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<Layout title={post.data.title}>
  <article>
    <h1>{post.data.title}</h1>
    <time>{post.data.pubDate.toLocaleDateString()}</time>

    <div class="tags">
      {post.data.tags?.map((tag) => (
        <span class="tag">{tag}</span>
      ))}
    </div>

    <Content />
  </article>
</Layout>
```

## Islands Architecture

### クライアントディレクティブ

```astro
---
// src/pages/index.astro
import ReactCounter from '../components/ReactCounter';
import VueSearch from '../components/VueSearch.vue';
---

<!-- デフォルト: 静的HTML（JavaScriptなし） -->
<ReactCounter />

<!-- client:load: ページ読み込み時にハイドレート -->
<ReactCounter client:load />

<!-- client:idle: ブラウザがアイドル時 -->
<VueSearch client:idle />

<!-- client:visible: ビューポートに入ったら -->
<ReactCounter client:visible />

<!-- client:media: メディアクエリマッチ時 -->
<ReactCounter client:media="(max-width: 640px)" />

<!-- client:only: サーバーでレンダリングせず、クライアントのみ -->
<ReactCounter client:only="react" />
```

### React統合

```bash
npx astro add react
```

```tsx
// src/components/Counter.tsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

```astro
---
import Layout from '../layouts/Layout.astro';
import Counter from '../components/Counter';
---

<Layout title="Interactive">
  <h1>Counter Example</h1>
  <Counter client:load />
</Layout>
```

### Vue統合

```bash
npx astro add vue
```

```vue
<!-- src/components/Search.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const query = ref('');
const results = ref<string[]>([]);

async function search() {
  // 検索ロジック
  results.value = [`Result for "${query.value}"`];
}
</script>

<template>
  <div>
    <input v-model="query" @input="search" placeholder="Search..." />
    <ul>
      <li v-for="result in results" :key="result">{{ result }}</li>
    </ul>
  </div>
</template>
```

### Svelte統合

```bash
npx astro add svelte
```

```svelte
<!-- src/components/Toggle.svelte -->
<script lang="ts">
  let isOpen = false;
</script>

<button on:click={() => (isOpen = !isOpen)}>
  Toggle
</button>

{#if isOpen}
  <p>Content is visible!</p>
{/if}
```

## Astro DB

### セットアップ

```bash
npx astro add db
```

```typescript
// db/config.ts
import { defineDb, defineTable, column } from 'astro:db';

const User = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    email: column.text({ unique: true }),
    createdAt: column.date({ default: new Date() }),
  },
});

const Post = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    content: column.text(),
    authorId: column.number({ references: () => User.columns.id }),
  },
});

export default defineDb({
  tables: { User, Post },
});
```

### シードデータ

```typescript
// db/seed.ts
import { db, User, Post } from 'astro:db';

export default async function seed() {
  await db.insert(User).values([
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ]);

  await db.insert(Post).values([
    { id: 1, title: 'Hello Astro DB', content: '...', authorId: 1 },
  ]);
}
```

### クエリ実行

```astro
---
import { db, User, Post, eq } from 'astro:db';

const users = await db.select().from(User);
const alice = await db.select().from(User).where(eq(User.email, 'alice@example.com'));
const postsWithAuthors = await db
  .select()
  .from(Post)
  .leftJoin(User, eq(Post.authorId, User.id));
---

<ul>
  {users.map((user) => (
    <li>{user.name} - {user.email}</li>
  ))}
</ul>
```

## SSR（サーバーサイドレンダリング）

### SSRモード有効化

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server', // または 'hybrid'
  adapter: node({
    mode: 'standalone',
  }),
});
```

### アダプター

```bash
# Node.js
npx astro add node

# Vercel
npx astro add vercel

# Cloudflare Pages
npx astro add cloudflare

# Netlify
npx astro add netlify
```

### APIエンドポイント

```typescript
// src/pages/api/users.json.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  return new Response(JSON.stringify(users), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  // ユーザー作成ロジック

  return new Response(JSON.stringify({ success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

### ハイブリッドレンダリング

```javascript
// astro.config.mjs
export default defineConfig({
  output: 'hybrid', // デフォルトSSG、必要に応じてSSR
});
```

```astro
---
// SSRで動的レンダリング
export const prerender = false;

const currentTime = new Date().toLocaleString();
---

<p>Current time: {currentTime}</p>
```

## デプロイ

### Vercel

```bash
npm install -g vercel
vercel
```

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

### Cloudflare Pages

```bash
npx astro add cloudflare
npm run build

# Wranglerでデプロイ
npx wrangler pages deploy dist
```

### Netlify

```bash
npx astro add netlify

# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
```

### 静的ホスティング（GitHub Pages等）

```bash
npm run build
# dist/ フォルダをデプロイ
```

## まとめ

### Astroのメリット

1. **超高速**: JavaScriptゼロでLighthouse 100点
2. **柔軟**: React/Vue/Svelteを混在可能
3. **シンプル**: 学習コストが低い
4. **コンテンツファースト**: ブログ・ドキュメントに最適
5. **モダン**: TypeScript、Vite、最新Web標準

### ベストプラクティス

- コンテンツコレクションでMarkdown管理
- 必要な部分だけクライアントJS（`client:load`等）
- 画像は最適化（`astro:assets`）
- SSG優先、必要に応じてSSR
- ビルド時間最適化（増分ビルド）

### 次のステップ

- 公式ドキュメント: https://docs.astro.build/
- テーマ・テンプレート: https://astro.build/themes/
- Discord: コミュニティで質問

Astroで、最速のWebサイトを構築しましょう。
