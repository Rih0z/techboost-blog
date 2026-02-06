---
title: "Deno Fresh フレームワーク入門"
description: "Deno Fresh フレームワークの特徴と使い方を解説。Islands Architectureによる高速なWebアプリケーション開発を実現"
pubDate: "2025-02-05"
tags: ["Deno", "Fresh", "WebFramework", "IslandsArchitecture"]
---

Deno Freshは、Deno向けの次世代Webフレームワークです。Islands Architecture、ゼロビルド構成、エッジでの実行など、モダンなWeb開発の課題を解決する設計が特徴です。

## Fresh の特徴

### 1. Islands Architecture

ページ全体をサーバーサイドレンダリング（SSR）し、インタラクティブな部分だけをクライアントサイドのJavaScriptとして「島（Island）」のように配置する設計思想です。

```
┌─────────────────────────────┐
│      Static HTML (SSR)      │
│  ┌──────┐      ┌─────────┐ │
│  │Island│      │ Island  │ │
│  │ JS   │      │   JS    │ │
│  └──────┘      └─────────┘ │
│                             │
│  ┌──────────────┐           │
│  │   Island     │           │
│  │     JS       │           │
│  └──────────────┘           │
└─────────────────────────────┘
```

**メリット:**
- 必要最小限のJavaScriptのみ配信
- 高速な初期ロード
- SEOに優れる
- パフォーマンスが自動的に最適化される

### 2. ゼロビルド構成

ビルドステップが不要で、TypeScript、JSXを直接実行できます。

```typescript
// routes/index.tsx - ビルド不要でそのまま動く
export default function Home() {
  return (
    <div>
      <h1>Hello Fresh!</h1>
    </div>
  );
}
```

### 3. エッジ対応

Deno Deployなどのエッジランタイムで動作し、低レイテンシーを実現します。

## プロジェクトのセットアップ

### インストール

```bash
# Denoのインストール（未インストールの場合）
curl -fsSL https://deno.land/x/install/install.sh | sh

# Freshプロジェクトの作成
deno run -A -r https://fresh.deno.dev my-app
cd my-app
```

### プロジェクト構造

```
my-app/
├── deno.json           # Deno設定
├── dev.ts              # 開発サーバー
├── main.ts             # 本番エントリーポイント
├── fresh.gen.ts        # 自動生成ファイル
├── routes/             # ルーティング
│   ├── index.tsx       # /
│   ├── about.tsx       # /about
│   └── api/
│       └── joke.ts     # /api/joke
├── islands/            # インタラクティブコンポーネント
│   └── Counter.tsx
├── components/         # 静的コンポーネント
│   └── Button.tsx
└── static/             # 静的ファイル
    └── logo.svg
```

### 開発サーバー起動

```bash
deno task start
```

http://localhost:8000 でアクセス可能になります。

## ルーティング

Freshはファイルベースルーティングを採用しています。

### 基本的なページ

```typescript
// routes/index.tsx
import { Head } from "$fresh/runtime.ts";

export default function Home() {
  return (
    <>
      <Head>
        <title>Fresh App</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <h1 class="text-4xl font-bold">Welcome to Fresh</h1>
        <p class="my-4">
          This is a server-side rendered page.
        </p>
      </div>
    </>
  );
}
```

### 動的ルーティング

```typescript
// routes/users/[id].tsx
import { PageProps } from "$fresh/server.ts";

export default function UserPage(props: PageProps) {
  const { id } = props.params;
  return (
    <div>
      <h1>User ID: {id}</h1>
    </div>
  );
}
```

アクセス例:
- `/users/123` → `id = "123"`
- `/users/alice` → `id = "alice"`

### Catch-all ルート

```typescript
// routes/docs/[...slug].tsx
import { PageProps } from "$fresh/server.ts";

export default function DocsPage(props: PageProps) {
  const { slug } = props.params;
  // slug は配列として渡される
  return (
    <div>
      <h1>Docs: {slug}</h1>
    </div>
  );
}
```

アクセス例:
- `/docs/intro` → `slug = "intro"`
- `/docs/guide/getting-started` → `slug = "guide/getting-started"`

## データの取得

### Handlers

サーバーサイドでデータを取得してページに渡します。

```typescript
// routes/products/[id].tsx
import { Handlers, PageProps } from "$fresh/server.ts";

interface Product {
  id: string;
  name: string;
  price: number;
}

export const handler: Handlers<Product> = {
  async GET(req, ctx) {
    const { id } = ctx.params;

    // データベースやAPIから取得
    const product = await fetchProduct(id);

    if (!product) {
      return ctx.renderNotFound();
    }

    return ctx.render(product);
  },
};

export default function ProductPage({ data }: PageProps<Product>) {
  return (
    <div>
      <h1>{data.name}</h1>
      <p>価格: ¥{data.price.toLocaleString()}</p>
    </div>
  );
}

async function fetchProduct(id: string): Promise<Product | null> {
  // 実際のデータ取得ロジック
  return {
    id,
    name: "Sample Product",
    price: 1000,
  };
}
```

### 複数のHTTPメソッド対応

```typescript
// routes/api/items.ts
import { Handlers } from "$fresh/server.ts";

interface Item {
  id: string;
  title: string;
}

const items: Item[] = [];

export const handler: Handlers = {
  // GET /api/items
  GET(req) {
    return new Response(JSON.stringify(items), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // POST /api/items
  async POST(req) {
    const body = await req.json();
    const newItem: Item = {
      id: crypto.randomUUID(),
      title: body.title,
    };
    items.push(newItem);

    return new Response(JSON.stringify(newItem), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },

  // DELETE /api/items
  DELETE(req) {
    items.length = 0;
    return new Response(null, { status: 204 });
  },
};
```

## Islands (インタラクティブコンポーネント)

`islands/` ディレクトリ内のコンポーネントは、クライアント側で実行されます。

### カウンターの例

```typescript
// islands/Counter.tsx
import { Signal, useSignal } from "@preact/signals";

interface CounterProps {
  start: number;
}

export default function Counter(props: CounterProps) {
  const count = useSignal(props.start);

  return (
    <div class="flex gap-2 w-full">
      <p class="flex-grow-1 font-bold text-xl">{count.value}</p>
      <button
        class="px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => count.value++}
      >
        +1
      </button>
      <button
        class="px-4 py-2 bg-red-500 text-white rounded"
        onClick={() => count.value--}
      >
        -1
      </button>
    </div>
  );
}
```

### ページで使用

```typescript
// routes/index.tsx
import Counter from "../islands/Counter.tsx";

export default function Home() {
  return (
    <div>
      <h1>Counter Example</h1>
      <Counter start={0} />
    </div>
  );
}
```

### フォーム入力の例

```typescript
// islands/SearchBox.tsx
import { useSignal } from "@preact/signals";

export default function SearchBox() {
  const query = useSignal("");
  const results = useSignal<string[]>([]);

  const handleSearch = async () => {
    const res = await fetch(`/api/search?q=${query.value}`);
    const data = await res.json();
    results.value = data;
  };

  return (
    <div>
      <input
        type="text"
        value={query.value}
        onInput={(e) => query.value = e.currentTarget.value}
        class="border px-4 py-2"
        placeholder="Search..."
      />
      <button
        onClick={handleSearch}
        class="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Search
      </button>
      <ul class="mt-4">
        {results.value.map((result) => (
          <li key={result}>{result}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Preact Signals

Freshは状態管理にPreact Signalsを使用します。

### 基本的な使い方

```typescript
import { useSignal, computed, effect } from "@preact/signals";

export default function SignalsDemo() {
  const count = useSignal(0);
  const doubled = computed(() => count.value * 2);

  // 副作用
  effect(() => {
    console.log(`Count is now: ${count.value}`);
  });

  return (
    <div>
      <p>Count: {count.value}</p>
      <p>Doubled: {doubled.value}</p>
      <button onClick={() => count.value++}>Increment</button>
    </div>
  );
}
```

### グローバル状態

```typescript
// signals/store.ts
import { signal } from "@preact/signals";

export interface User {
  id: string;
  name: string;
}

export const currentUser = signal<User | null>(null);
export const isLoggedIn = computed(() => currentUser.value !== null);
```

使用例:

```typescript
// islands/UserProfile.tsx
import { currentUser, isLoggedIn } from "../signals/store.ts";

export default function UserProfile() {
  if (!isLoggedIn.value) {
    return <p>Please log in</p>;
  }

  return (
    <div>
      <h2>Welcome, {currentUser.value?.name}</h2>
      <button onClick={() => currentUser.value = null}>
        Log out
      </button>
    </div>
  );
}
```

## ミドルウェア

リクエストの前処理・後処理を行います。

```typescript
// routes/_middleware.ts
import { MiddlewareHandlerContext } from "$fresh/server.ts";

interface State {
  user?: {
    id: string;
    name: string;
  };
}

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext<State>,
) {
  // 認証チェック
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const user = await validateToken(authHeader);
    if (user) {
      ctx.state.user = user;
    }
  }

  // レスポンスを取得
  const resp = await ctx.next();

  // レスポンスヘッダーを追加
  resp.headers.set("X-Custom-Header", "value");

  return resp;
}

async function validateToken(token: string) {
  // トークン検証ロジック
  return { id: "123", name: "Alice" };
}
```

### 特定ルートのミドルウェア

```typescript
// routes/admin/_middleware.ts
export async function handler(req: Request, ctx: MiddlewareHandlerContext) {
  const { user } = ctx.state;

  if (!user || !user.isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  return await ctx.next();
}
```

## レイアウト

共通レイアウトを定義します。

```typescript
// routes/_layout.tsx
import { PageProps } from "$fresh/server.ts";

export default function Layout({ Component, state }: PageProps) {
  return (
    <div class="layout">
      <header class="bg-blue-500 text-white p-4">
        <nav class="container mx-auto flex gap-4">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </nav>
      </header>
      <main class="container mx-auto p-4">
        <Component />
      </main>
      <footer class="bg-gray-800 text-white p-4 text-center">
        © 2025 My App
      </footer>
    </div>
  );
}
```

## スタイリング

### Twind (Tailwind CSS)

FreshはデフォルトでTwindを使用します。

```typescript
// routes/index.tsx
export default function Home() {
  return (
    <div class="min-h-screen bg-gray-100">
      <div class="container mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold text-blue-600 mb-4">
          Hello Fresh
        </h1>
        <button class="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">
          Click me
        </button>
      </div>
    </div>
  );
}
```

### カスタムCSS

```typescript
// static/styles.css
.custom-button {
  background: linear-gradient(45deg, #ff6b6b, #ee5a6f);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}
```

```typescript
// routes/_app.tsx
import { AppProps } from "$fresh/server.ts";

export default function App({ Component }: AppProps) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
```

## APIルート

RESTful APIを簡単に構築できます。

```typescript
// routes/api/users/[id].ts
import { Handlers } from "$fresh/server.ts";

interface User {
  id: string;
  name: string;
  email: string;
}

const users = new Map<string, User>();

export const handler: Handlers = {
  GET(req, ctx) {
    const { id } = ctx.params;
    const user = users.get(id);

    if (!user) {
      return new Response("Not Found", { status: 404 });
    }

    return Response.json(user);
  },

  async PUT(req, ctx) {
    const { id } = ctx.params;
    const body = await req.json();

    const user: User = {
      id,
      name: body.name,
      email: body.email,
    };

    users.set(id, user);
    return Response.json(user);
  },

  DELETE(req, ctx) {
    const { id } = ctx.params;
    users.delete(id);
    return new Response(null, { status: 204 });
  },
};
```

## データベース連携

### Deno KVの使用

```typescript
// routes/api/todos.ts
import { Handlers } from "$fresh/server.ts";

const kv = await Deno.openKv();

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export const handler: Handlers = {
  async GET() {
    const entries = kv.list<Todo>({ prefix: ["todos"] });
    const todos: Todo[] = [];

    for await (const entry of entries) {
      todos.push(entry.value);
    }

    return Response.json(todos);
  },

  async POST(req) {
    const body = await req.json();
    const id = crypto.randomUUID();
    const todo: Todo = {
      id,
      title: body.title,
      completed: false,
    };

    await kv.set(["todos", id], todo);
    return Response.json(todo, { status: 201 });
  },
};
```

## デプロイ

### Deno Deploy

```bash
# Deno Deployへのデプロイ
deno install -Arf jsr:@deno/deployctl
deployctl deploy
```

### Docker

```dockerfile
# Dockerfile
FROM denoland/deno:latest

WORKDIR /app

COPY . .

RUN deno cache main.ts

EXPOSE 8000

CMD ["deno", "run", "-A", "main.ts"]
```

```bash
# ビルド・実行
docker build -t fresh-app .
docker run -p 8000:8000 fresh-app
```

## パフォーマンス最適化

### 1. 画像最適化

```typescript
// components/OptimizedImage.tsx
interface ImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export function OptimizedImage({ src, alt, width, height }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
    />
  );
}
```

### 2. コンポーネントの遅延ロード

```typescript
// islands/LazyComponent.tsx
import { lazy } from "preact/compat";

const HeavyComponent = lazy(() => import("../components/HeavyComponent.tsx"));

export default function LazyComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

## まとめ

Deno Freshは、Islands Architectureとゼロビルド構成により、高速で開発体験の良いWebアプリケーションを実現するフレームワークです。

**主な特徴:**
- Islands Architectureによる最適化されたJavaScript配信
- ビルドステップ不要の高速な開発体験
- エッジランタイムでの実行
- Preact Signalsによる効率的な状態管理
- ファイルベースルーティング

特に、パフォーマンスが重要なWebアプリケーション、SEOが必要なサイト、エッジでの実行が求められるプロジェクトに最適です。Denoエコシステムの強力なツール群と組み合わせることで、モダンなWeb開発を効率的に進められます。
