---
title: 'Remix v3 / React Router v7完全ガイド: フレームワーク統合の新時代'
description: 'Remix v3とReact Router v7の統合により、フルスタックフレームワークとクライアントルーティングの境界が消失。新しいアーキテクチャと移行方法を実践的に解説します。Remix・React Router・Reactに関する実践情報。'
pubDate: '2025-08-15'
updatedDate: '2025-08-15'
tags: ['Remix', 'React Router', 'React', 'Full Stack', 'Web Framework']
---
## はじめに

2024年、RemixとReact Routerの開発チームは、両プロジェクトを統合する大胆な決定を発表しました。Remix v3とReact Router v7は、実質的に同じコードベースを共有し、フルスタックフレームワークとクライアントルーティングライブラリの境界を曖昧にしました。

この記事では、Remix v3/React Router v7の新しいアーキテクチャ、主要な機能、そして既存プロジェクトの移行方法について、実践的に解説します。

## Remix v3とReact Router v7の関係

### 統合の背景

- Remixはもともと有料製品として開発され、後にオープンソース化
- React RouterはReactエコシステムで最も人気のあるルーティングライブラリ
- どちらもReact Routerチームによって開発されている
- v3/v7で、両者は同じコア機能を共有する形に統合

### 位置づけ

```
React Router v7
  ├─ クライアントサイドルーティング（従来の用途）
  └─ オプショナルなサーバーサイド機能（Remix的機能）

Remix v3
  ├─ React Router v7のフルスタックプリセット
  └─ デフォルトでSSR、ファイルベースルーティングなど有効
```

つまり、React Router v7は「Remixの機能を選択的に使えるライブラリ」であり、Remixは「React Routerをフルスタック構成で使うフレームワーク」という関係です。

## 主要な新機能

### 1. React Router Vite Plugin

React Router v7の最大の変更点は、Viteベースのビルドシステムです。

```typescript
// vite.config.ts
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [reactRouter()],
});
```

これにより、以下が可能になります。

- SSR/SSG/SPAの柔軟な選択
- Viteの高速な開発体験
- プラグインエコシステムの活用

### 2. Type-Safe Routing

型安全なルーティングがビルトインでサポートされます。

```typescript
// app/routes.ts
import { type RouteConfig, route, index } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('products/:id', 'routes/product.tsx'),
  route('dashboard', 'routes/dashboard.tsx', [
    route('settings', 'routes/dashboard.settings.tsx'),
    route('profile', 'routes/dashboard.profile.tsx'),
  ]),
] satisfies RouteConfig;
```

```typescript
// app/routes/product.tsx
import { useParams } from 'react-router';

export default function Product() {
  // TypeScriptが自動的に型を推論
  const { id } = useParams<{ id: string }>();

  return <div>Product: {id}</div>;
}
```

### 3. Server Functions (旧Action/Loader)

サーバー関数の記述がより直感的になりました。

```typescript
// app/routes/product.tsx
import { data } from 'react-router';
import type { Route } from './+types/product';

// Loaderの新しい書き方
export async function loader({ params }: Route.LoaderArgs) {
  const product = await db.product.findUnique({
    where: { id: params.id },
  });

  if (!product) {
    throw data({ message: 'Not found' }, { status: 404 });
  }

  return { product };
}

// Actionの新しい書き方
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const productId = formData.get('productId') as string;

  await db.product.delete({ where: { id: productId } });

  return { success: true };
}

export default function Product({ loaderData }: Route.ComponentProps) {
  const { product } = loaderData;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </div>
  );
}
```

### 4. Client Data (クライアントサイドデータフェッチ)

新しく追加された `clientLoader` と `clientAction` により、クライアントサイドのみのデータフェッチも可能です。

```typescript
// app/routes/dashboard.tsx
import type { Route } from './+types/dashboard';

// サーバーサイドのloader
export async function loader() {
  return { serverTime: new Date().toISOString() };
}

// クライアントサイドのloader（キャッシュ戦略など）
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  // ローカルストレージをチェック
  const cached = localStorage.getItem('dashboard-data');

  if (cached) {
    const data = JSON.parse(cached);
    // キャッシュが新しければそれを返す
    if (Date.now() - data.timestamp < 5 * 60 * 1000) {
      return data;
    }
  }

  // サーバーからデータを取得
  const data = await serverLoader();

  // キャッシュに保存
  localStorage.setItem(
    'dashboard-data',
    JSON.stringify({ ...data, timestamp: Date.now() })
  );

  return data;
}

// クライアント専用のローダーとしてマーク
clientLoader.hydrate = true;

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return <div>Server Time: {loaderData.serverTime}</div>;
}
```

### 5. Pre-rendering (Static Generation)

静的サイト生成が標準機能になりました。

```typescript
// vite.config.ts
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    reactRouter({
      prerender: [
        '/',
        '/about',
        '/contact',
        // 動的ルートのプリレンダリング
        async () => {
          const products = await db.product.findMany();
          return products.map((p) => `/products/${p.id}`);
        },
      ],
    }),
  ],
});
```

## 実践例: フルスタックアプリケーション

### プロジェクトセットアップ

```bash
# React Router v7でプロジェクト作成
npx create-react-router@latest my-app
cd my-app

# または、Remixテンプレートで作成
npx create-remix@latest my-app
```

### ファイル構成

```
my-app/
├── app/
│   ├── routes/
│   │   ├── _index.tsx
│   │   ├── products.$id.tsx
│   │   ├── products._index.tsx
│   │   └── api.products.ts
│   ├── root.tsx
│   └── routes.ts
├── public/
├── vite.config.ts
└── package.json
```

### APIルート

```typescript
// app/routes/api.products.ts
import { json } from 'react-router';
import type { Route } from './+types/api.products';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;

  const products = await db.product.findMany({
    skip: (page - 1) * limit,
    take: limit,
  });

  return json({ products, page, limit });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'create') {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    const product = await db.product.create({
      data: { name, description },
    });

    return json({ product });
  }

  if (intent === 'delete') {
    const id = formData.get('id') as string;
    await db.product.delete({ where: { id } });

    return json({ success: true });
  }

  throw json({ message: 'Invalid intent' }, { status: 400 });
}
```

### データフェッチとフォーム

```typescript
// app/routes/products._index.tsx
import { Form, useLoaderData, useFetcher } from 'react-router';
import type { Route } from './+types/products._index';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');

  const products = await db.product.findMany({
    skip: (page - 1) * 20,
    take: 20,
  });

  return { products, page };
}

export default function ProductsList({ loaderData }: Route.ComponentProps) {
  const { products, page } = loaderData;
  const fetcher = useFetcher();

  return (
    <div>
      <h1>Products</h1>

      {/* 新規作成フォーム */}
      <Form method="post" action="/api/products">
        <input type="hidden" name="intent" value="create" />
        <input name="name" placeholder="Product name" required />
        <textarea name="description" placeholder="Description" />
        <button type="submit">Create Product</button>
      </Form>

      {/* 商品リスト */}
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <a href={`/products/${product.id}`}>{product.name}</a>

            {/* 削除ボタン（フェッチャーで楽観的UI） */}
            <fetcher.Form method="post" action="/api/products">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="id" value={product.id} />
              <button type="submit">Delete</button>
            </fetcher.Form>
          </li>
        ))}
      </ul>

      {/* ページネーション */}
      <nav>
        <a href={`/products?page=${page - 1}`}>Previous</a>
        <span>Page {page}</span>
        <a href={`/products?page=${page + 1}`}>Next</a>
      </nav>
    </div>
  );
}
```

### 詳細ページ

```typescript
// app/routes/products.$id.tsx
import { useLoaderData, Form, redirect, data } from 'react-router';
import type { Route } from './+types/products.$id';

export async function loader({ params }: Route.LoaderArgs) {
  const product = await db.product.findUnique({
    where: { id: params.id },
    include: { reviews: true },
  });

  if (!product) {
    throw data({ message: 'Product not found' }, { status: 404 });
  }

  return { product };
}

export async function action({ params, request }: Route.ActionArgs) {
  const formData = await request.formData();
  const comment = formData.get('comment') as string;
  const rating = parseInt(formData.get('rating') as string);

  await db.review.create({
    data: {
      productId: params.id,
      comment,
      rating,
    },
  });

  return redirect(`/products/${params.id}`);
}

export default function Product({ loaderData }: Route.ComponentProps) {
  const { product } = loaderData;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>

      <h2>Reviews</h2>
      <ul>
        {product.reviews.map((review) => (
          <li key={review.id}>
            <p>Rating: {review.rating}/5</p>
            <p>{review.comment}</p>
          </li>
        ))}
      </ul>

      <Form method="post">
        <h3>Add Review</h3>
        <select name="rating" required>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
        <textarea name="comment" placeholder="Your review" required />
        <button type="submit">Submit Review</button>
      </Form>
    </div>
  );
}
```

## 移行ガイド

### React Router v6からv7への移行

主な変更点:

1. `createBrowserRouter` から Vite プラグインベースへ
2. `loader`/`action` の記述方法の変更
3. 型定義の自動生成

#### Before (v6)

```typescript
// main.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    loader: rootLoader,
    children: [
      {
        path: 'products/:id',
        element: <Product />,
        loader: productLoader,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
```

#### After (v7)

```typescript
// app/routes.ts
import { type RouteConfig, route, index } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('products/:id', 'routes/product.tsx'),
] satisfies RouteConfig;
```

```typescript
// vite.config.ts
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [reactRouter()],
});
```

### Remix v2からv3への移行

Remix v3はReact Router v7をベースにしているため、多くの変更があります。

#### package.json

```json
{
  "dependencies": {
    // Before
    "@remix-run/node": "^2.x",
    "@remix-run/react": "^2.x",

    // After
    "react-router": "^7.0.0",
    "@react-router/node": "^7.0.0",
    "@react-router/serve": "^7.0.0"
  }
}
```

#### インポートパス

```typescript
// Before
import { json, redirect } from '@remix-run/node';
import { useLoaderData, Form } from '@remix-run/react';

// After
import { data, redirect } from 'react-router';
import { useLoaderData, Form } from 'react-router';
```

#### ルート定義

```typescript
// Before: Remix v2のファイルベースルーティング（自動）
// app/routes/products.$id.tsx

// After: 明示的なroutes.ts（推奨）
// app/routes.ts
export default [route('products/:id', 'routes/product.tsx')];
```

## デプロイメント

### Cloudflare Pages

```typescript
// vite.config.ts
import { cloudflarePages } from '@react-router/dev/cloudflare';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [reactRouter(), cloudflarePages()],
});
```

### Vercel

```typescript
// vite.config.ts
import { vercel } from '@react-router/dev/vercel';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [reactRouter(), vercel()],
});
```

### Node.js (Express)

```typescript
// server.ts
import { createRequestHandler } from '@react-router/express';
import express from 'express';

const app = express();

app.use(express.static('public'));

app.all(
  '*',
  createRequestHandler({
    build: await import('./build/server/index.js'),
  })
);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

## まとめ

Remix v3とReact Router v7の統合は、React開発の新しい章を開きました。フルスタックフレームワークとクライアントライブラリの境界が曖昧になり、開発者は必要に応じてサーバーサイド機能を段階的に導入できるようになりました。

主なメリット:

- Viteベースの高速な開発体験
- 型安全なルーティング
- 柔軟なレンダリング戦略（SSR/SSG/SPA）
- 統一されたデータフェッチパターン
- 豊富なデプロイメントオプション

既存のReact RouterやRemixプロジェクトからの移行も、段階的に行うことができます。新規プロジェクトでは、React Router v7から始めて、必要に応じてサーバーサイド機能を追加していくアプローチがおすすめです。
