---
title: "SolidStart フレームワーク入門ガイド"
description: "SolidJSベースのメタフレームワークSolidStartで高速でリアクティブなWebアプリケーションを構築する方法を解説します"
pubDate: "2025-02-05"
tags: ["solidjs", "solid-start", "web-framework", "ssr"]
---

SolidStartは、SolidJSをベースとしたフルスタックWebアプリケーションフレームワークです。Next.jsやRemixのような開発体験を提供しながら、SolidJSの優れたパフォーマンスとリアクティビティを活かせます。本記事では、SolidStartの基礎から実践的な使い方まで詳しく解説します。

## SolidStartとは

SolidStartは、SolidJSの公式メタフレームワークで、以下の機能を提供します。

### 主な特徴

**1. ファイルベースルーティング**
- 直感的なルート定義
- ネストされたルート対応

**2. SSRとSSG対応**
- サーバーサイドレンダリング
- 静的サイト生成
- ハイブリッドレンダリング

**3. API Routes**
- サーバーサイドAPIエンドポイント
- タイプセーフなデータフェッチ

**4. 高性能**
- 細粒度リアクティビティ
- 最小限のJavaScriptバンドル

## セットアップ

### プロジェクト作成

```bash
# 新規プロジェクト作成
npm create solid@latest my-solid-app

# オプション選択
# ✔ Which template would you like to use? › bare
# ✔ Use TypeScript? … Yes
# ✔ Server Side Rendering? … Yes

cd my-solid-app
npm install
```

### プロジェクト構造

```
my-solid-app/
├── src/
│   ├── routes/
│   │   └── index.tsx
│   ├── components/
│   ├── app.tsx
│   └── entry-client.tsx
├── public/
├── app.config.ts
└── package.json
```

### 開発サーバー起動

```bash
npm run dev
# http://localhost:3000
```

## ルーティング

### 基本的なルート

ファイル構造がそのままURLになります。

```
src/routes/
├── index.tsx           → /
├── about.tsx           → /about
├── blog/
│   ├── index.tsx       → /blog
│   └── [id].tsx        → /blog/:id
└── users/
    └── [id]/
        └── posts.tsx   → /users/:id/posts
```

### ページコンポーネント

`src/routes/index.tsx`:

```tsx
export default function Home() {
  return (
    <main>
      <h1>Welcome to SolidStart</h1>
      <p>Build fast, reactive web apps</p>
    </main>
  );
}
```

### 動的ルート

`src/routes/blog/[id].tsx`:

```tsx
import { useParams } from "@solidjs/router";

export default function BlogPost() {
  const params = useParams();

  return (
    <article>
      <h1>Blog Post: {params.id}</h1>
    </article>
  );
}
```

### ネストされたレイアウト

`src/routes/blog.tsx`:

```tsx
import { Outlet } from "@solidjs/router";

export default function BlogLayout() {
  return (
    <div class="blog-layout">
      <aside>
        <h2>Blog Navigation</h2>
        <nav>
          <a href="/blog">All Posts</a>
          <a href="/blog/categories">Categories</a>
        </nav>
      </aside>
      <main>
        <Outlet /> {/* 子ルートがここに表示される */}
      </main>
    </div>
  );
}
```

## データフェッチング

### createRouteData

```tsx
import { createRouteData } from "@solidjs/router";
import { For } from "solid-js";

// データフェッチング関数
const fetchPosts = async () => {
  const response = await fetch("https://api.example.com/posts");
  return response.json();
};

export function routeData() {
  return createRouteData(fetchPosts);
}

export default function Blog() {
  const posts = useRouteData<typeof routeData>();

  return (
    <div>
      <h1>Blog Posts</h1>
      <For each={posts()}>
        {(post) => (
          <article>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
          </article>
        )}
      </For>
    </div>
  );
}
```

### パラメータ付きデータフェッチ

```tsx
import { useParams } from "@solidjs/router";
import { createRouteData } from "@solidjs/router";

const fetchPost = async (id: string) => {
  const response = await fetch(`https://api.example.com/posts/${id}`);
  return response.json();
};

export function routeData() {
  const params = useParams();
  return createRouteData(
    () => params.id,
    { key: () => params.id }
  );
}

export default function BlogPost() {
  const post = useRouteData<typeof routeData>();

  return (
    <article>
      <h1>{post()?.title}</h1>
      <div innerHTML={post()?.content} />
    </article>
  );
}
```

## Server Functions

サーバーサイドでのみ実行される関数を定義できます。

### 基本的な使用

```tsx
import { createServerData$ } from "solid-start/server";

// サーバー関数
const getUsers = async () => {
  "use server"; // サーバー専用マーカー

  // データベースアクセスなど
  const users = await db.query("SELECT * FROM users");
  return users;
};

export function routeData() {
  return createServerData$(getUsers);
}

export default function Users() {
  const users = useRouteData<typeof routeData>();

  return (
    <div>
      <h1>Users</h1>
      <For each={users()}>
        {(user) => (
          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
        )}
      </For>
    </div>
  );
}
```

### Server Actions

```tsx
import { createServerAction$ } from "solid-start/server";

const createUser = async (formData: FormData) => {
  "use server";

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  // データベースに保存
  await db.users.insert({ name, email });

  return { success: true };
};

export default function CreateUser() {
  const [submitting, submit] = createServerAction$(createUser);

  return (
    <form action={submit} method="post">
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={submitting.pending}>
        {submitting.pending ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
```

## API Routes

`src/routes/api/users.ts`:

```ts
import { json } from "solid-start";
import type { APIEvent } from "solid-start";

export async function GET({ request }: APIEvent) {
  const users = await db.users.findMany();
  return json(users);
}

export async function POST({ request }: APIEvent) {
  const data = await request.json();
  const user = await db.users.create(data);
  return json(user, { status: 201 });
}
```

複雑なAPI:

```ts
import { json } from "solid-start";
import type { APIEvent } from "solid-start";

// GET /api/users/:id
export async function GET({ params }: APIEvent) {
  const user = await db.users.findById(params.id);

  if (!user) {
    return json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return json(user);
}

// PUT /api/users/:id
export async function PUT({ params, request }: APIEvent) {
  const data = await request.json();
  const user = await db.users.update(params.id, data);
  return json(user);
}

// DELETE /api/users/:id
export async function DELETE({ params }: APIEvent) {
  await db.users.delete(params.id);
  return new Response(null, { status: 204 });
}
```

## フォーム処理

### 基本的なフォーム

```tsx
import { createServerAction$ } from "solid-start/server";
import { Show } from "solid-js";

const handleLogin = async (formData: FormData) => {
  "use server";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 認証処理
  const user = await authenticate(email, password);

  if (!user) {
    throw new Error("Invalid credentials");
  }

  return { user };
};

export default function Login() {
  const [loggingIn, login] = createServerAction$(handleLogin);

  return (
    <form action={login} method="post">
      <h1>Login</h1>

      <Show when={loggingIn.error}>
        <p class="error">{loggingIn.error.message}</p>
      </Show>

      <input
        name="email"
        type="email"
        placeholder="Email"
        required
      />

      <input
        name="password"
        type="password"
        placeholder="Password"
        required
      />

      <button type="submit" disabled={loggingIn.pending}>
        {loggingIn.pending ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
```

### プログレッシブエンハンスメント

```tsx
import { createServerAction$ } from "solid-start/server";
import { Show } from "solid-js";

export default function TodoForm() {
  const [adding, add] = createServerAction$(async (formData: FormData) => {
    "use server";

    const title = formData.get("title") as string;
    await db.todos.create({ title });
  });

  return (
    <form action={add} method="post">
      <input
        name="title"
        placeholder="New todo..."
        required
      />

      <button type="submit">
        Add Todo
      </button>

      {/* JavaScriptが有効な場合のみ表示 */}
      <Show when={adding.pending}>
        <span>Adding...</span>
      </Show>
    </form>
  );
}
```

## メタデータとSEO

### Titleコンポーネント

```tsx
import { Title, Meta } from "@solidjs/meta";

export default function About() {
  return (
    <>
      <Title>About Us - My Site</Title>
      <Meta name="description" content="Learn more about our company" />
      <Meta property="og:title" content="About Us" />
      <Meta property="og:description" content="Learn more about our company" />

      <main>
        <h1>About Us</h1>
        <p>Welcome to our about page</p>
      </main>
    </>
  );
}
```

### 動的メタデータ

```tsx
import { Title, Meta } from "@solidjs/meta";
import { useRouteData } from "solid-start";

export default function BlogPost() {
  const post = useRouteData<typeof routeData>();

  return (
    <>
      <Title>{post()?.title} - My Blog</Title>
      <Meta name="description" content={post()?.excerpt} />
      <Meta property="og:title" content={post()?.title} />
      <Meta property="og:image" content={post()?.image} />

      <article>
        <h1>{post()?.title}</h1>
        <div innerHTML={post()?.content} />
      </article>
    </>
  );
}
```

## ミドルウェア

`src/middleware.ts`:

```ts
import { createMiddleware } from "solid-start/middleware";

export default createMiddleware({
  onRequest: [
    // 認証チェック
    async (event) => {
      const token = event.request.headers.get("authorization");

      if (!token && event.request.url.includes("/protected")) {
        return new Response("Unauthorized", { status: 401 });
      }
    },

    // ログ
    async (event) => {
      console.log(`${event.request.method} ${event.request.url}`);
    },
  ],
});
```

## デプロイ

### Vercelへのデプロイ

```bash
npm install -g vercel
vercel
```

### Cloudflare Pagesへのデプロイ

```bash
# ビルド
npm run build

# wranglerでデプロイ
npx wrangler pages deploy ./dist
```

### Netlifyへのデプロイ

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
```

## パフォーマンス最適化

### コード分割

```tsx
import { lazy } from "solid-js";

// 遅延読み込み
const HeavyComponent = lazy(() => import("./HeavyComponent"));

export default function Page() {
  return (
    <div>
      <h1>Page</h1>
      <HeavyComponent />
    </div>
  );
}
```

### 画像最適化

```tsx
import { Image } from "solid-start";

export default function Gallery() {
  return (
    <Image
      src="/large-image.jpg"
      alt="Description"
      width={800}
      height={600}
      loading="lazy"
    />
  );
}
```

## まとめ

SolidStartは、SolidJSの優れたパフォーマンスを活かしながら、モダンなWebアプリケーション開発に必要な機能を提供するフレームワークです。

### 主な利点

- **高性能**: 細粒度リアクティビティによる高速レンダリング
- **タイプセーフ**: TypeScriptによる型安全性
- **柔軟性**: SSR、SSG、SPAのハイブリッド対応
- **開発体験**: 直感的なAPI設計

パフォーマンスを重視しつつ、Next.jsのような開発体験を求める場合、SolidStartは優れた選択肢となるでしょう。
