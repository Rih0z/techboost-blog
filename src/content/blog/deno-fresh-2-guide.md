---
title: 'Deno Fresh 2完全ガイド: Island Architectureで高速Webアプリ構築'
description: 'Deno Fresh 2のIsland Architectureを活用した高速Webアプリケーション構築の完全ガイド。Preact、Signals、Server-Side Renderingを組み合わせた実践的な開発手法を解説します。'
pubDate: 2025-05-15
updatedDate: 2025-05-15
tags: ['Deno', 'Fresh', 'Island Architecture', 'Preact', 'SSR', 'プログラミング']
category: 'frontend'
---

# Deno Fresh 2完全ガイド: Island Architectureで高速Webアプリ構築

Deno Fresh 2は、Island Architectureを採用した次世代のWebフレームワークです。従来のSPAとは異なり、必要な部分だけをインタラクティブにすることで、圧倒的なパフォーマンスを実現します。この記事では、Fresh 2の特徴から実践的な開発手法まで完全解説します。

## Fresh 2の特徴

### 1. Island Architecture

Island Architectureは、ページの大部分を静的HTMLとして配信し、動的なインタラクティブ要素（Island）だけをクライアントサイドJavaScriptで動作させる設計パターンです。

```typescript
// routes/index.tsx
import { define } from "$fresh/server.ts";
import Counter from "../islands/Counter.tsx";

export default define.page(function Home() {
  return (
    <div class="container">
      <h1>Welcome to Fresh 2</h1>
      <p>This is static content - no JS required!</p>

      {/* この部分だけがインタラクティブなIsland */}
      <Counter start={0} />
    </div>
  );
});
```

```typescript
// islands/Counter.tsx
import { signal } from "@preact/signals";

export default function Counter({ start }: { start: number }) {
  const count = signal(start);

  return (
    <div class="counter">
      <p>Count: {count.value}</p>
      <button onClick={() => count.value++}>+1</button>
      <button onClick={() => count.value--}>-1</button>
    </div>
  );
}
```

### 2. ゼロJavaScriptビルドステップ

Fresh 2は、ビルドステップなしで動作します。TypeScriptは実行時に自動的にトランスパイルされ、開発体験が大幅に向上します。

```json
// deno.json
{
  "tasks": {
    "dev": "deno run -A --watch=static/,routes/ dev.ts",
    "preview": "deno run -A main.ts",
    "build": "deno run -A dev.ts build",
    "start": "deno run -A main.ts"
  },
  "imports": {
    "$fresh/": "https://deno.land/x/fresh@2.0.0-alpha.18/",
    "preact": "https://esm.sh/preact@10.19.6",
    "@preact/signals": "https://esm.sh/@preact/signals@1.2.3"
  }
}
```

### 3. Preact Signalsによる状態管理

Fresh 2は、Preact Signalsを標準の状態管理システムとして採用しています。リアクティブでパフォーマンスが高く、学習コストも低いのが特徴です。

```typescript
// islands/TodoList.tsx
import { signal, computed } from "@preact/signals";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const todos = signal<Todo[]>([
  { id: 1, text: "Learn Fresh 2", completed: true },
  { id: 2, text: "Build an app", completed: false },
]);

const activeTodos = computed(() =>
  todos.value.filter(todo => !todo.completed)
);

const completedTodos = computed(() =>
  todos.value.filter(todo => todo.completed)
);

export default function TodoList() {
  const addTodo = (text: string) => {
    todos.value = [
      ...todos.value,
      { id: Date.now(), text, completed: false }
    ];
  };

  const toggleTodo = (id: number) => {
    todos.value = todos.value.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
  };

  return (
    <div class="todo-list">
      <h2>Todo List ({activeTodos.value.length} active)</h2>
      <TodoInput onAdd={addTodo} />
      <ul>
        {todos.value.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={() => toggleTodo(todo.id)}
          />
        ))}
      </ul>
      <div class="stats">
        <p>Completed: {completedTodos.value.length}</p>
      </div>
    </div>
  );
}
```

## ルーティングシステム

Fresh 2は、ファイルシステムベースのルーティングを採用しています。

### 基本的なルート定義

```typescript
// routes/index.tsx - /
// routes/about.tsx - /about
// routes/blog/[slug].tsx - /blog/:slug
// routes/api/users/[id].ts - /api/users/:id

// routes/blog/[slug].tsx
import { define } from "$fresh/server.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const { slug } = ctx.params;
    const post = await loadBlogPost(slug);

    if (!post) {
      return ctx.renderNotFound();
    }

    return ctx.render({ post });
  },
});

export default define.page<typeof handler>(function BlogPost({ data }) {
  const { post } = data;

  return (
    <article>
      <h1>{post.title}</h1>
      <time>{post.publishedAt}</time>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
});
```

### APIルート

```typescript
// routes/api/todos.ts
import { define } from "$fresh/server.ts";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const todos: Todo[] = [];

export const handler = define.handlers({
  GET(_req) {
    return Response.json(todos);
  },

  async POST(req) {
    const { text } = await req.json();
    const todo: Todo = {
      id: Date.now(),
      text,
      completed: false,
    };
    todos.push(todo);
    return Response.json(todo, { status: 201 });
  },

  async PUT(req) {
    const { id, completed } = await req.json();
    const todo = todos.find(t => t.id === id);
    if (!todo) {
      return new Response("Not Found", { status: 404 });
    }
    todo.completed = completed;
    return Response.json(todo);
  },

  DELETE(req) {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) {
      return new Response("Not Found", { status: 404 });
    }
    todos.splice(index, 1);
    return new Response(null, { status: 204 });
  },
});
```

## データフェッチングとSSR

Fresh 2は、サーバーサイドレンダリングを標準でサポートしています。

### ページでのデータフェッチング

```typescript
// routes/users/index.tsx
import { define } from "$fresh/server.ts";

interface User {
  id: number;
  name: string;
  email: string;
}

export const handler = define.handlers({
  async GET(ctx) {
    const response = await fetch("https://api.example.com/users");
    const users: User[] = await response.json();

    return ctx.render({ users });
  },
});

export default define.page<typeof handler>(function UsersPage({ data }) {
  const { users } = data;

  return (
    <div class="users-page">
      <h1>Users</h1>
      <ul class="user-list">
        {users.map(user => (
          <li key={user.id}>
            <a href={`/users/${user.id}`}>{user.name}</a>
            <span>{user.email}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});
```

### ミドルウェア

```typescript
// routes/_middleware.ts
import { define } from "$fresh/server.ts";

export const handler = define.middleware([
  // ロギングミドルウェア
  async function logger(ctx) {
    const start = Date.now();
    const response = await ctx.next();
    const duration = Date.now() - start;
    console.log(`${ctx.url.pathname} - ${duration}ms`);
    return response;
  },

  // 認証ミドルウェア
  async function auth(ctx) {
    const session = ctx.state.session;
    if (!session && ctx.url.pathname.startsWith("/dashboard")) {
      return ctx.redirect("/login");
    }
    return await ctx.next();
  },
]);
```

## Islandの高度な使い方

### 親子間でのデータ共有

```typescript
// lib/store.ts
import { signal } from "@preact/signals";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export const cart = signal<CartItem[]>([]);

export const addToCart = (item: Omit<CartItem, "quantity">) => {
  const existing = cart.value.find(i => i.id === item.id);
  if (existing) {
    cart.value = cart.value.map(i =>
      i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
    );
  } else {
    cart.value = [...cart.value, { ...item, quantity: 1 }];
  }
};

export const removeFromCart = (id: number) => {
  cart.value = cart.value.filter(i => i.id !== id);
};

export const cartTotal = computed(() =>
  cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
);
```

```typescript
// islands/CartButton.tsx
import { cart } from "../lib/store.ts";

export default function CartButton() {
  return (
    <button class="cart-button">
      Cart ({cart.value.length})
    </button>
  );
}
```

```typescript
// islands/ProductCard.tsx
import { addToCart } from "../lib/store.ts";

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div class="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={() => addToCart(product)}>
        Add to Cart
      </button>
    </div>
  );
}
```

## プロダクション向け最適化

### 1. 静的ファイルの最適化

```typescript
// static/images/ 配下の画像は自動的に最適化されます
// routes/index.tsx
export default define.page(function Home() {
  return (
    <div>
      <img
        src="/images/hero.jpg"
        alt="Hero"
        width={1200}
        height={630}
        loading="lazy"
      />
    </div>
  );
});
```

### 2. CSS最適化

```typescript
// routes/_app.tsx
import { define } from "$fresh/server.ts";

export default define.page(function App({ Component }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My Fresh App</title>
        <link rel="stylesheet" href="/styles/main.css" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
```

### 3. デプロイ

```bash
# Deno Deployへのデプロイ
deno task build
deployctl deploy --project=my-fresh-app --prod

# Dockerでデプロイ
# Dockerfile
FROM denoland/deno:alpine

WORKDIR /app
COPY . .

RUN deno cache main.ts

EXPOSE 8000
CMD ["run", "-A", "main.ts"]
```

## まとめ

Deno Fresh 2は、Island Architectureという革新的なアプローチにより、高速でモダンなWebアプリケーション開発を実現します。主な利点は以下の通りです。

- **高速なパフォーマンス**: 必要最小限のJavaScriptのみをクライアントに送信
- **優れた開発体験**: ビルドステップ不要、TypeScript標準サポート
- **シンプルな状態管理**: Preact Signalsによる直感的なリアクティブプログラミング
- **標準準拠**: Web標準APIを積極的に活用

Fresh 2を使って、次世代のWebアプリケーション開発を始めましょう。
