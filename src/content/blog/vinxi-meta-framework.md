---
title: "Vinxi完全ガイド - SolidStart/TanStack Startを支えるメタフレームワーク基盤の全貌"
description: "VinxiはViteベースの次世代メタフレームワーク基盤。SolidStart、TanStack Startの土台として、Full-Stack型安全性、ファイルルーティング、SSR/RSC、モジュラー設計を実現。2026年最新の情報を反映しています。"
pubDate: "2025-02-06"
tags: ['Vinxi', 'Meta-Framework', 'Vite', 'SolidStart', 'TanStack Start']
heroImage: '../../assets/thumbnails/vinxi-meta-framework.jpg'
---

## Vinxiとは

**Vinxi**は次世代の**メタフレームワーク基盤**として、Next.js、Remix、SvelteKitのような統合フレームワークを構築するための土台となるツールです。

### 従来のメタフレームワークの課題

```plaintext
【従来の問題】
Next.js → Webpack専用設計、カスタマイズ困難
Remix → Vite移行に時間とコスト
SvelteKit → Svelte専用、他UIライブラリに流用不可

各フレームワークが独自にビルドシステムを再実装
→ 重複する機能（SSR、ルーティング、API）を個別開発
→ 新しいUIライブラリごとに全体を作り直し
```

### Vinxiの解決策

```plaintext
【Vinxiのアプローチ】
Vite + メタフレームワーク共通機能を分離
→ 任意のUIライブラリ（React/Solid/Vue）で再利用可能
→ SSR、ルーティング、API統合をプラグイン化

結果:
✅ SolidStart → Vinxi基盤で構築
✅ TanStack Start → Vinxi基盤で構築
✅ 新しいフレームワーク → Vinxi上で迅速に開発可能
```

### 主要な特徴

1. **Viteベース** - 高速HMR、最新ツールチェーン
2. **フレームワーク非依存** - React、Solid、Vue、任意のUIライブラリ対応
3. **Full-Stack型安全** - サーバー/クライアント間の完全な型共有
4. **モジュラー設計** - 必要な機能だけ選択可能
5. **多様なレンダリング** - SSR、SSG、SPA、RSC対応

## インストールとセットアップ

### 新規プロジェクト作成

```bash
# npm
npm create vinxi@latest

# 対話形式でプロジェクト設定
? Project name: my-app
? Select framework: React / Solid / Vue
? Enable TypeScript: Yes
? Enable SSR: Yes

cd my-app
npm install
npm run dev
```

### 手動セットアップ

```bash
npm install vinxi vite
```

```ts
// app.config.ts
import { createApp } from 'vinxi';

export default createApp({
  routers: [
    {
      name: 'public',
      type: 'static',
      dir: './public'
    },
    {
      name: 'client',
      type: 'client',
      handler: './app/client.tsx',
      target: 'browser',
      base: '/_build'
    },
    {
      name: 'server',
      type: 'http',
      handler: './app/server.ts',
      target: 'server'
    }
  ]
});
```

## 基本構造

### Routerの概念

Vinxiは**複数のRouter**を組み合わせてアプリを構築します。

```ts
// app.config.ts
import { createApp } from 'vinxi';

export default createApp({
  routers: [
    // 1. 静的ファイル配信
    {
      name: 'public',
      type: 'static',
      dir: './public',
      base: '/'
    },

    // 2. クライアントアプリ
    {
      name: 'client',
      type: 'spa', // または 'client' (SSR)
      handler: './app/client.tsx',
      target: 'browser',
      base: '/_build'
    },

    // 3. APIサーバー
    {
      name: 'api',
      type: 'http',
      handler: './app/api.ts',
      target: 'server',
      base: '/api'
    },

    // 4. SSRサーバー
    {
      name: 'ssr',
      type: 'http',
      handler: './app/ssr.ts',
      target: 'server',
      base: '/'
    }
  ]
});
```

### Reactアプリケーション例

```tsx
// app/client.tsx
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <App />
  </StrictMode>
);
```

```tsx
// app/App.tsx
import { useState } from 'react';

export const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
};
```

```ts
// app/server.ts
import { eventHandler } from 'vinxi/http';
import { renderToString } from 'react-dom/server';
import { App } from './App';

export default eventHandler(async (event) => {
  const html = renderToString(<App />);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Vinxi App</title>
      </head>
      <body>
        <div id="root">${html}</div>
        <script type="module" src="/_build/client.js"></script>
      </body>
    </html>
  `;
});
```

## ファイルベースルーティング

### TanStack Routerとの統合

```bash
npm install @tanstack/react-router vinxi-router
```

```ts
// app.config.ts
import { createApp } from 'vinxi';
import { tanstackRouter } from 'vinxi-router/tanstack';

export default createApp({
  routers: [
    {
      name: 'client',
      type: 'spa',
      handler: './app/client.tsx',
      target: 'browser',
      plugins: () => [
        tanstackRouter({
          routesDirectory: './app/routes'
        })
      ]
    }
  ]
});
```

```tsx
// app/routes/index.tsx
export default function Home() {
  return <h1>Home Page</h1>;
}
```

```tsx
// app/routes/about.tsx
export default function About() {
  return <h1>About Page</h1>;
}
```

```tsx
// app/routes/blog/$postId.tsx
import { useParams } from '@tanstack/react-router';

export default function BlogPost() {
  const { postId } = useParams({ from: '/blog/$postId' });
  return <h1>Blog Post: {postId}</h1>;
}
```

### ネストされたルート

```plaintext
app/routes/
├── _layout.tsx           # 共通レイアウト
├── index.tsx             # /
├── blog/
│   ├── _layout.tsx       # /blog のレイアウト
│   ├── index.tsx         # /blog
│   └── $postId.tsx       # /blog/:postId
└── admin/
    ├── _layout.tsx       # /admin のレイアウト
    ├── index.tsx         # /admin
    └── users.tsx         # /admin/users
```

```tsx
// app/routes/_layout.tsx
import { Outlet } from '@tanstack/react-router';

export default function Layout() {
  return (
    <div>
      <header>
        <nav>
          <a href="/">Home</a>
          <a href="/blog">Blog</a>
          <a href="/admin">Admin</a>
        </nav>
      </header>
      <main>
        <Outlet /> {/* 子ルートがここにレンダリング */}
      </main>
    </div>
  );
}
```

## Server Functions（RPC）

### クライアントからサーバー関数を直接呼び出し

```ts
// app/api/users.ts
'use server';

import { db } from './db';

export async function getUsers() {
  return db.query('SELECT * FROM users');
}

export async function createUser(name: string, email: string) {
  const result = await db.query(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    [name, email]
  );
  return { id: result.insertId, name, email };
}

export async function deleteUser(id: number) {
  await db.query('DELETE FROM users WHERE id = ?', [id]);
  return { success: true };
}
```

```tsx
// app/routes/users.tsx
'use client';

import { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser } from '../api/users';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const data = await getUsers(); // サーバー関数を直接呼び出し
    setUsers(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await createUser(name, email); // 型安全なRPC呼び出し
    setName('');
    setEmail('');
    loadUsers();
  }

  async function handleDelete(id) {
    await deleteUser(id);
    loadUsers();
  }

  return (
    <div>
      <h1>Users</h1>
      <form onSubmit={handleSubmit}>
        <input value={name} onChange={e => setName(e.target.value)} />
        <input value={email} onChange={e => setEmail(e.target.value)} />
        <button type="submit">Add User</button>
      </form>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} ({user.email})
            <button onClick={() => handleDelete(user.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 型安全性の実現

```ts
// 自動生成される型定義（内部的に）
type GetUsers = () => Promise<User[]>;
type CreateUser = (name: string, email: string) => Promise<User>;
type DeleteUser = (id: number) => Promise<{ success: boolean }>;

// クライアントコードでは完全な型補完が効く
const users = await getUsers(); // User[]型
const newUser = await createUser('Alice', 'alice@example.com'); // User型
```

## データフェッチング

### Loaderパターン

```tsx
// app/routes/blog/$postId.tsx
import { useParams, useLoaderData } from '@tanstack/react-router';

// Loader（サーバー側で実行）
export async function loader({ params }) {
  const post = await fetch(`https://api.example.com/posts/${params.postId}`)
    .then(r => r.json());

  return { post };
}

// コンポーネント
export default function BlogPost() {
  const { post } = useLoaderData({ from: '/blog/$postId' });

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### createAsyncパターン（SolidStart風）

```tsx
// app/routes/users.tsx
import { createAsync } from 'vinxi/data';
import { getUsers } from '../api/users';

export default function Users() {
  const users = createAsync(() => getUsers());

  return (
    <div>
      <h1>Users</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <ul>
          {users()?.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      </Suspense>
    </div>
  );
}
```

## SSR（Server-Side Rendering）

### Reactでの実装

```ts
// app/ssr.ts
import { eventHandler } from 'vinxi/http';
import { renderToPipeableStream } from 'react-dom/server';
import { App } from './App';

export default eventHandler(async (event) => {
  return new Promise((resolve, reject) => {
    const { pipe } = renderToPipeableStream(<App />, {
      onShellReady() {
        const stream = pipe(event.node.res);
        resolve(stream);
      },
      onError(error) {
        reject(error);
      }
    });
  });
});
```

### Streamingレスポンス

```tsx
// app/App.tsx
import { Suspense } from 'react';
import { SlowComponent } from './SlowComponent';

export const App = () => (
  <html>
    <body>
      <h1>Fast Content</h1>
      <Suspense fallback={<p>Loading slow content...</p>}>
        <SlowComponent />
      </Suspense>
    </body>
  </html>
);
```

```tsx
// app/SlowComponent.tsx
export async function SlowComponent() {
  const data = await fetchSlowData(); // 遅いデータ取得
  return <div>{data}</div>;
}

async function fetchSlowData() {
  await new Promise(r => setTimeout(r, 2000));
  return 'Slow data loaded!';
}
```

## API Routes

### RESTful API

```ts
// app/api/posts.ts
import { eventHandler, getQuery, readBody } from 'vinxi/http';
import { db } from './db';

// GET /api/posts
export const GET = eventHandler(async (event) => {
  const { page = 1, limit = 10 } = getQuery(event);
  const posts = await db.query(
    'SELECT * FROM posts LIMIT ? OFFSET ?',
    [limit, (page - 1) * limit]
  );
  return { posts, page, limit };
});

// POST /api/posts
export const POST = eventHandler(async (event) => {
  const { title, content } = await readBody(event);

  if (!title || !content) {
    throw createError({
      statusCode: 400,
      message: 'Title and content are required'
    });
  }

  const result = await db.query(
    'INSERT INTO posts (title, content) VALUES (?, ?)',
    [title, content]
  );

  return { id: result.insertId, title, content };
});

// DELETE /api/posts/:id
export const DELETE = eventHandler(async (event) => {
  const id = event.context.params.id;
  await db.query('DELETE FROM posts WHERE id = ?', [id]);
  return { success: true };
});
```

### tRPC統合

```bash
npm install @trpc/server @trpc/client @trpc/react-query
```

```ts
// app/api/trpc/[trpc].ts
import { initTRPC } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { z } from 'zod';

const t = initTRPC.create();

const appRouter = t.router({
  getUser: t.procedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const user = await db.query('SELECT * FROM users WHERE id = ?', [input.id]);
      return user;
    }),

  createUser: t.procedure
    .input(z.object({
      name: z.string(),
      email: z.string().email()
    }))
    .mutation(async ({ input }) => {
      const result = await db.query(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        [input.name, input.email]
      );
      return { id: result.insertId, ...input };
    })
});

export type AppRouter = typeof appRouter;

export default eventHandler((event) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: event.node.req,
    router: appRouter,
    createContext: () => ({})
  })
);
```

```tsx
// app/client.tsx
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from './api/trpc/[trpc]';

export const trpc = createTRPCReact<AppRouter>();

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc'
    })
  ]
});

// 使用例
function UserProfile({ userId }) {
  const { data, isLoading } = trpc.getUser.useQuery({ id: userId });

  if (isLoading) return <p>Loading...</p>;

  return <div>{data.name}</div>;
}
```

## 環境変数管理

### 設定ファイル

```ts
// app.config.ts
import { createApp } from 'vinxi';

export default createApp({
  server: {
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      API_KEY: process.env.API_KEY
    }
  },
  routers: [/* ... */]
});
```

### 型安全な環境変数

```ts
// app/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test'])
});

export const env = envSchema.parse(process.env);

// 使用例
import { env } from './env';

const db = createConnection(env.DATABASE_URL);
```

## ミドルウェア

### 認証ミドルウェア

```ts
// app/middleware/auth.ts
import { eventHandler, getCookie } from 'vinxi/http';

export const authMiddleware = eventHandler(async (event) => {
  const token = getCookie(event, 'auth_token');

  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    });
  }

  const user = await verifyToken(token);
  event.context.user = user;
});
```

```ts
// app/api/protected.ts
import { eventHandler } from 'vinxi/http';
import { authMiddleware } from '../middleware/auth';

export default eventHandler(async (event) => {
  await authMiddleware(event); // 認証チェック

  const user = event.context.user;
  return { message: `Hello, ${user.name}!` };
});
```

### ロギングミドルウェア

```ts
// app/middleware/logger.ts
import { eventHandler } from 'vinxi/http';

export const loggerMiddleware = eventHandler(async (event) => {
  const start = Date.now();

  console.log(`[${new Date().toISOString()}] ${event.method} ${event.path}`);

  event.node.res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${event.method} ${event.path} - ${event.node.res.statusCode} (${duration}ms)`);
  });
});
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
  "outputDirectory": ".output/public",
  "functions": {
    "app/server.ts": {
      "runtime": "@vercel/node@3"
    }
  }
}
```

### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".output/public"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy .output/public
```

```toml
# wrangler.toml
name = "vinxi-app"
compatibility_date = "2024-01-01"

[site]
bucket = ".output/public"
```

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

```bash
docker build -t vinxi-app .
docker run -p 3000:3000 vinxi-app
```

## SolidStart統合

### プロジェクト作成

```bash
npx create-solid@latest
? Project name: my-solid-app
? Use TypeScript: Yes
? Use SolidStart (SSR): Yes

cd my-solid-app
npm install
```

### ファイル構造

```plaintext
my-solid-app/
├── app.config.ts          # Vinxi設定
├── src/
│   ├── routes/
│   │   ├── index.tsx
│   │   └── about.tsx
│   ├── entry-client.tsx
│   ├── entry-server.tsx
│   └── root.tsx
└── package.json
```

```ts
// app.config.ts（SolidStart内部でVinxi使用）
import { createApp } from 'vinxi';
import solid from 'vite-plugin-solid';

export default createApp({
  routers: [
    {
      name: 'public',
      type: 'static',
      dir: './public'
    },
    {
      name: 'client',
      type: 'client',
      handler: './src/entry-client.tsx',
      target: 'browser',
      plugins: () => [solid({ ssr: true })]
    },
    {
      name: 'server',
      type: 'http',
      handler: './src/entry-server.tsx',
      target: 'server'
    }
  ]
});
```

### Server Functions（SolidStart）

```ts
// src/api/users.ts
'use server';

import { db } from './db';

export async function getUsers() {
  return db.query('SELECT * FROM users');
}
```

```tsx
// src/routes/users.tsx
import { createAsync } from '@solidjs/router';
import { getUsers } from '../api/users';

export default function Users() {
  const users = createAsync(() => getUsers());

  return (
    <div>
      <h1>Users</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <For each={users()}>
          {user => <li>{user.name}</li>}
        </For>
      </Suspense>
    </div>
  );
}
```

## TanStack Start統合

### プロジェクト作成

```bash
npm create @tanstack/start@latest

? Project name: my-tanstack-app
? Use TypeScript: Yes

cd my-tanstack-app
npm install
```

### Vinxi設定

```ts
// app.config.ts
import { createApp } from 'vinxi';
import { tanstackStart } from '@tanstack/start/vinxi';

export default createApp({
  routers: [
    tanstackStart({
      routesDirectory: './app/routes'
    })
  ]
});
```

### ルート定義

```tsx
// app/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home
});

function Home() {
  return <h1>Welcome to TanStack Start</h1>;
}
```

```tsx
// app/routes/blog/$postId.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/blog/$postId')({
  loader: async ({ params }) => {
    const post = await fetch(`/api/posts/${params.postId}`).then(r => r.json());
    return { post };
  },
  component: BlogPost
});

function BlogPost() {
  const { post } = Route.useLoaderData();
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

## パフォーマンス最適化

### Code Splitting

```tsx
// 自動コード分割（ルートベース）
// app/routes/heavy.tsx
import { lazy } from 'react';

const HeavyComponent = lazy(() => import('../components/HeavyComponent'));

export default function HeavyPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Preloading

```tsx
// app/routes/index.tsx
import { Link } from '@tanstack/react-router';

export default function Home() {
  return (
    <div>
      <Link
        to="/blog"
        preload="intent" // ホバー時にプリロード
      >
        Blog
      </Link>
    </div>
  );
}
```

### ISR（Incremental Static Regeneration）

```tsx
// app/routes/blog/index.tsx
export const Route = createFileRoute('/blog')({
  loader: async () => {
    const posts = await fetchPosts();
    return { posts };
  },
  staleTime: 60000, // 60秒間キャッシュ
  gcTime: 300000 // 5分後にガベージコレクション
});
```

## ベストプラクティス

### プロジェクト構造

```plaintext
project/
├── app.config.ts
├── src/
│   ├── routes/             # ファイルベースルーティング
│   ├── components/         # 共通コンポーネント
│   ├── api/                # Server Functions
│   ├── lib/                # ユーティリティ
│   ├── styles/             # スタイル
│   └── types/              # 型定義
├── public/                 # 静的ファイル
└── .output/                # ビルド出力
```

### 型定義の共有

```ts
// src/types/user.ts
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
}
```

```ts
// src/api/users.ts
'use server';

import type { User, CreateUserInput } from '../types/user';

export async function createUser(input: CreateUserInput): Promise<User> {
  // サーバーロジック
}
```

```tsx
// src/routes/users.tsx
import type { User } from '../types/user';
import { createUser } from '../api/users';

// クライアントコードでも同じ型を使用
const newUser: User = await createUser({ name: 'Alice', email: 'alice@example.com' });
```

### エラーハンドリング

```tsx
// app/routes/error-boundary.tsx
import { ErrorBoundary } from '@tanstack/react-router';

export default function App() {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <div>
          <h1>Error</h1>
          <p>{error.message}</p>
        </div>
      )}
    >
      <Routes />
    </ErrorBoundary>
  );
}
```

## 実践例: フルスタックアプリ

### タスク管理アプリ

```ts
// src/types/task.ts
export interface Task {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}
```

```ts
// src/api/tasks.ts
'use server';

import { db } from './db';
import type { Task } from '../types/task';

export async function getTasks(): Promise<Task[]> {
  return db.query('SELECT * FROM tasks ORDER BY createdAt DESC');
}

export async function createTask(title: string): Promise<Task> {
  const result = await db.query(
    'INSERT INTO tasks (title, completed) VALUES (?, ?)',
    [title, false]
  );
  return {
    id: result.insertId,
    title,
    completed: false,
    createdAt: new Date()
  };
}

export async function toggleTask(id: number): Promise<void> {
  await db.query(
    'UPDATE tasks SET completed = NOT completed WHERE id = ?',
    [id]
  );
}

export async function deleteTask(id: number): Promise<void> {
  await db.query('DELETE FROM tasks WHERE id = ?', [id]);
}
```

```tsx
// src/routes/index.tsx
import { useState } from 'react';
import { createAsync, revalidate } from 'vinxi/data';
import { getTasks, createTask, toggleTask, deleteTask } from '../api/tasks';

export default function Home() {
  const tasks = createAsync(() => getTasks());
  const [title, setTitle] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createTask(title);
    setTitle('');
    revalidate(getTasks.key);
  }

  async function handleToggle(id: number) {
    await toggleTask(id);
    revalidate(getTasks.key);
  }

  async function handleDelete(id: number) {
    await deleteTask(id);
    revalidate(getTasks.key);
  }

  return (
    <div>
      <h1>Task Manager</h1>

      <form onSubmit={handleSubmit}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="New task..."
        />
        <button type="submit">Add</button>
      </form>

      <Suspense fallback={<p>Loading tasks...</p>}>
        <ul>
          {tasks()?.map(task => (
            <li key={task.id}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task.id)}
              />
              <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                {task.title}
              </span>
              <button onClick={() => handleDelete(task.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </Suspense>
    </div>
  );
}
```

## まとめ

Vinxiは**メタフレームワーク基盤**として、以下の価値を提供します。

### 主要な利点

1. **フレームワーク非依存** - React、Solid、Vue、任意のUIライブラリ対応
2. **Viteベース** - 高速HMR、最新ツールチェーン
3. **Full-Stack型安全** - サーバー/クライアント間の完全な型共有
4. **モジュラー設計** - 必要な機能だけ選択可能
5. **実績ある基盤** - SolidStart、TanStack Startで採用

### 採用判断基準

**Vinxiを選ぶべき場合**:
- 既存フレームワークに縛られたくない
- カスタムメタフレームワークを構築したい
- SolidStartやTanStack Startを使いたい
- Full-Stack型安全性が必要

**他の選択肢を検討すべき場合**:
- Next.jsの既存エコシステムを活用したい
- 安定性・成熟度優先（Next.js、Remixを選択）
- 学習コスト最小化（既存フレームワークのまま）

Vinxiは次世代のメタフレームワーク開発を加速させる強力な基盤であり、今後さらに多くのフレームワークがVinxi上に構築されることが期待されます。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
