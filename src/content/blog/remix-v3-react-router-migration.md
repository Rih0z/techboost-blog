---
title: 'Remix v3からReact Router v7への移行ガイド'
description: 'Remix v3からReact Router v7への移行における破壊的変更、ルーティング変更、データローディングの完全移行ガイド。loader/action API、Viteプラグイン対応、段階的移行のベストプラクティスを含む完全ガイドです。'
pubDate: 2025-02-05
tags: ['Remix', 'React Router', 'Migration', 'React', 'v7', 'Routing']
heroImage: '../../assets/thumbnails/remix-v3-react-router-migration.jpg'
---
Remix v3とReact Router v7の統合により、両プロジェクトは実質的に同じものになります。本記事では、Remix v3からReact Router v7への移行について詳しく解説します。

## Remix v3とReact Router v7の統合

### 統合の背景

RemixとReact Routerは元々同じチームによって開発されており、React Router v7ではRemixの機能を完全に統合します。

- **Remix v3**: 最後のRemixメジャーバージョン
- **React Router v7**: Remixの機能を含む次世代ルーター
- **統一アーキテクチャ**: 同じコンパイラとランタイム

### 主な変更点

```typescript
// Remix v3
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

export async function loader() {
  return json({ data: 'value' });
}

// React Router v7
import { json } from 'react-router';
import { useLoaderData } from 'react-router';

export async function loader() {
  return json({ data: 'value' });
}
```

## Breaking Changes

### 1. インポートパスの変更

すべてのRemix固有のインポートをReact Routerに変更します。

```typescript
// ❌ Remix v3
import { json, redirect } from '@remix-run/node';
import { Form, useLoaderData, useActionData } from '@remix-run/react';
import { useNavigate } from '@remix-run/react';

// ✅ React Router v7
import { json, redirect } from 'react-router';
import { Form, useLoaderData, useActionData } from 'react-router';
import { useNavigate } from 'react-router';
```

### 2. パッケージの統合

```json
// package.json
{
  "dependencies": {
    // ❌ Remix v3
    "@remix-run/node": "^3.0.0",
    "@remix-run/react": "^3.0.0",
    "@remix-run/serve": "^3.0.0",

    // ✅ React Router v7
    "react-router": "^7.0.0"
  }
}
```

### 3. 設定ファイルの変更

```typescript
// ❌ remix.config.js
/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  appDirectory: 'app',
  assetsBuildDirectory: 'public/build',
  serverBuildPath: 'build/index.js',
  publicPath: '/build/',
};

// ✅ react-router.config.ts
import type { Config } from 'react-router';

export default {
  appDirectory: 'app',
  buildDirectory: 'build',
  publicPath: '/build/',
} satisfies Config;
```

## ルーティングの変更

### 1. ファイルベースルーティング

基本的なファイル構造は同じですが、設定が統合されます。

```
app/
├── routes/
│   ├── _index.tsx          # /
│   ├── about.tsx           # /about
│   ├── blog._index.tsx     # /blog
│   ├── blog.$slug.tsx      # /blog/:slug
│   └── dashboard/
│       ├── _layout.tsx     # Layout
│       ├── index.tsx       # /dashboard
│       └── settings.tsx    # /dashboard/settings
```

### 2. ルート定義

```typescript
// ❌ Remix v3: remix.config.js
export default {
  routes(defineRoutes) {
    return defineRoutes((route) => {
      route('/posts', 'routes/posts/index.tsx');
      route('/posts/:id', 'routes/posts/$id.tsx');
    });
  },
};

// ✅ React Router v7: react-router.config.ts
import { type RouteConfig } from 'react-router';

export default [
  {
    path: '/posts',
    file: 'routes/posts/index.tsx',
  },
  {
    path: '/posts/:id',
    file: 'routes/posts/$id.tsx',
  },
] satisfies RouteConfig[];
```

### 3. ネストされたルート

```typescript
// routes/dashboard._layout.tsx
import { Outlet } from 'react-router';

export default function DashboardLayout() {
  return (
    <div className="dashboard">
      <nav>{/* サイドバー */}</nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

// routes/dashboard.index.tsx
export default function DashboardIndex() {
  return <h1>Dashboard Home</h1>;
}

// routes/dashboard.settings.tsx
export default function DashboardSettings() {
  return <h1>Settings</h1>;
}
```

## データローディングの変更

### 1. loaderの型定義

```typescript
// ❌ Remix v3
import type { LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ request, params }: LoaderFunctionArgs) {
  // ...
}

// ✅ React Router v7
import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ request, params }: LoaderFunctionArgs) {
  // ...
}
```

### 2. データの取得

```typescript
// routes/posts.$id.tsx
import { json, type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';

export async function loader({ params }: LoaderFunctionArgs) {
  const post = await db.post.findUnique({
    where: { id: params.id },
  });

  if (!post) {
    throw new Response('Not Found', { status: 404 });
  }

  return json({ post });
}

export default function Post() {
  const { post } = useLoaderData<typeof loader>();

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

### 3. 複数データの並列取得

```typescript
import { json } from 'react-router';
import { useLoaderData } from 'react-router';

export async function loader() {
  const [posts, categories, featured] = await Promise.all([
    db.post.findMany(),
    db.category.findMany(),
    db.post.findMany({ where: { featured: true } }),
  ]);

  return json({ posts, categories, featured });
}

export default function BlogIndex() {
  const { posts, categories, featured } = useLoaderData<typeof loader>();

  return (
    <div>
      <FeaturedPosts posts={featured} />
      <Categories categories={categories} />
      <PostList posts={posts} />
    </div>
  );
}
```

## アクションの変更

### 1. フォーム処理

```typescript
// routes/posts.new.tsx
import { json, redirect, type ActionFunctionArgs } from 'react-router';
import { Form, useActionData } from 'react-router';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const title = formData.get('title');
  const content = formData.get('content');

  if (!title || !content) {
    return json({ error: 'Title and content are required' }, { status: 400 });
  }

  const post = await db.post.create({
    data: { title, content },
  });

  return redirect(`/posts/${post.id}`);
}

export default function NewPost() {
  const actionData = useActionData<typeof action>();

  return (
    <Form method="post">
      {actionData?.error && <div className="error">{actionData.error}</div>}

      <input type="text" name="title" placeholder="Title" />
      <textarea name="content" placeholder="Content" />

      <button type="submit">Create Post</button>
    </Form>
  );
}
```

### 2. 楽観的更新

```typescript
import { useFetcher } from 'react-router';

export function LikeButton({ postId, initialLikes }: { postId: string; initialLikes: number }) {
  const fetcher = useFetcher();

  const likes = fetcher.formData
    ? Number(fetcher.formData.get('likes'))
    : initialLikes;

  return (
    <fetcher.Form method="post" action={`/posts/${postId}/like`}>
      <input type="hidden" name="likes" value={likes + 1} />
      <button type="submit">
        ❤️ {likes}
      </button>
    </fetcher.Form>
  );
}
```

## エラーハンドリング

### 1. ErrorBoundary

```typescript
// routes/posts.$id.tsx
import { useRouteError, isRouteErrorResponse } from 'react-router';

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Error!</h1>
      <p>{error?.message || 'Unknown error'}</p>
    </div>
  );
}

export default function Post() {
  // ...
}
```

### 2. グローバルエラーハンドリング

```typescript
// app/root.tsx
import { Outlet, useRouteError, isRouteErrorResponse } from 'react-router';

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <html>
        <head>
          <title>{error.status} Error</title>
        </head>
        <body>
          <h1>{error.status}</h1>
          <p>{error.data}</p>
        </body>
      </html>
    );
  }

  return (
    <html>
      <head>
        <title>Application Error</title>
      </head>
      <body>
        <h1>Application Error</h1>
        <pre>{error?.message}</pre>
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Outlet />
      </body>
    </html>
  );
}
```

## メタデータとSEO

### 1. メタタグの定義

```typescript
// routes/posts.$id.tsx
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data.post.title },
    { name: 'description', content: data.post.excerpt },
    { property: 'og:title', content: data.post.title },
    { property: 'og:description', content: data.post.excerpt },
    { property: 'og:image', content: data.post.image },
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const post = await db.post.findUnique({
    where: { id: params.id },
  });
  return json({ post });
}

export default function Post() {
  // ...
}
```

### 2. 動的メタタグ

```typescript
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = ({ data, params }) => {
  if (!data) {
    return [{ title: 'Post Not Found' }];
  }

  const { post } = data;

  return [
    { title: `${post.title} | My Blog` },
    { name: 'description', content: post.excerpt },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: post.title },
    { property: 'og:url', content: `https://myblog.com/posts/${params.id}` },
    { property: 'article:published_time', content: post.createdAt },
  ];
};
```

## 移行ステップ

### 1. 依存関係の更新

```bash
# Remixパッケージをアンインストール
npm uninstall @remix-run/node @remix-run/react @remix-run/serve

# React Router v7をインストール
npm install react-router@7
```

### 2. インポートの一括変更

```bash
# すべてのファイルでインポートを置換
find app -type f -name "*.tsx" -exec sed -i '' 's/@remix-run\/node/react-router/g' {} +
find app -type f -name "*.tsx" -exec sed -i '' 's/@remix-run\/react/react-router/g' {} +
```

### 3. 設定ファイルの更新

```typescript
// react-router.config.ts
import type { Config } from 'react-router';

export default {
  // 既存のremix.config.jsの設定を移行
  appDirectory: 'app',
  buildDirectory: 'build',
  publicPath: '/build/',
  serverModuleFormat: 'esm',
} satisfies Config;
```

### 4. 型チェック

```bash
# TypeScriptの型エラーをチェック
npm run typecheck

# ビルドを実行
npm run build
```

## まとめ

Remix v3からReact Router v7への移行は、主に以下の変更が必要です。

- **インポートパス**: `@remix-run/*` から `react-router` へ
- **設定ファイル**: `remix.config.js` から `react-router.config.ts` へ
- **パッケージ統合**: 複数のパッケージから単一のパッケージへ
- **API統一**: RemixとReact Routerの機能が完全統合

移行は比較的シンプルで、多くの場合はインポートパスの変更が中心となります。React Router v7は、Remixの優れた開発者体験を標準のReact Routerに統合し、より広いエコシステムでの利用を可能にします。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
