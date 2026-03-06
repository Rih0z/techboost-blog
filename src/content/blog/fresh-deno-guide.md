---
title: 'Fresh完全ガイド - DenoのWebフレームワークで高速開発'
description: 'Fresh（Deno）の基本からIslands Architecture、ルーティング、ミドルウェア、Deno Deployまで。Deno上のモダンWebフレームワークを徹底解説。Fresh・Deno・Web Frameworkに関する実践情報。'
pubDate: '2026-02-05'
tags: ['Fresh', 'Deno', 'Web Framework', 'Islands Architecture', 'プログラミング']
---

Freshは、Deno上で動作するモダンなWebフレームワークです。Islands Architectureを採用し、デフォルトでクライアントJavaScriptをゼロにすることで、極めて高速なWebサイトを構築できます。

## Freshとは

### 特徴

1. **Islands Architecture** - 必要な部分だけクライアントJSを配信
2. **JITレンダリング** - ビルドステップなし、リクエスト時にレンダリング
3. **TypeScript First** - Deno上で動作、設定不要のTypeScript
4. **Preact** - 軽量なUIライブラリを採用
5. **Deno Deploy** - エッジデプロイメントに最適化

### Next.js/Astroとの比較

| 項目 | Fresh | Next.js | Astro |
|------|-------|---------|-------|
| ランタイム | Deno | Node.js | Node.js |
| UIライブラリ | Preact | React | 自由 |
| ビルドステップ | 不要 | 必要 | 必要 |
| デフォルトJS | ゼロ | あり | ゼロ |
| Islands | ○ | × | ○ |

## セットアップ

### プロジェクト作成

```bash
# Denoのインストール
curl -fsSL https://deno.land/install.sh | sh

# Freshプロジェクト作成
deno run -A -r https://fresh.deno.dev my-fresh-app
cd my-fresh-app

# 開発サーバー起動
deno task start
```

### プロジェクト構造

```
my-fresh-app/
├── routes/
│   ├── _app.tsx          # アプリレイアウト
│   ├── _layout.tsx       # ページレイアウト
│   ├── index.tsx         # / ページ
│   ├── about.tsx         # /about ページ
│   ├── api/
│   │   └── joke.ts       # /api/joke エンドポイント
│   └── greet/
│       └── [name].tsx    # /greet/:name 動的ルート
├── islands/
│   └── Counter.tsx       # インタラクティブコンポーネント
├── components/
│   └── Button.tsx        # 静的コンポーネント
├── static/
│   ├── logo.svg
│   └── styles.css
├── fresh.config.ts
├── dev.ts
├── main.ts
└── deno.json
```

## ルーティング

### 基本ルート

```tsx
// routes/index.tsx
import { PageProps } from "$fresh/server.ts";

export default function Home() {
  return (
    <div>
      <h1>Welcome to Fresh</h1>
      <p>Denoで動作する高速Webフレームワーク</p>
    </div>
  );
}
```

### 動的ルート

```tsx
// routes/greet/[name].tsx
import { PageProps } from "$fresh/server.ts";

export default function GreetPage(props: PageProps) {
  const { name } = props.params;
  return (
    <div>
      <h1>Hello, {name}!</h1>
    </div>
  );
}
```

### レイアウト

```tsx
// routes/_layout.tsx
import { LayoutProps } from "$fresh/server.ts";

export default function Layout({ Component }: LayoutProps) {
  return (
    <div>
      <header>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
        </nav>
      </header>
      <main>
        <Component />
      </main>
      <footer>
        <p>&copy; 2026 My Fresh App</p>
      </footer>
    </div>
  );
}
```

### アプリラッパー

```tsx
// routes/_app.tsx
import { AppProps } from "$fresh/server.ts";

export default function App({ Component }: AppProps) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My Fresh App</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
```

## Islands Architecture

### Islandコンポーネント

`islands/` ディレクトリに配置されたコンポーネントだけがクライアントにJavaScriptを送信します。

```tsx
// islands/Counter.tsx
import { useSignal } from "@preact/signals";

export default function Counter() {
  const count = useSignal(0);

  return (
    <div>
      <p>Count: {count.value}</p>
      <button onClick={() => count.value++}>
        +1
      </button>
      <button onClick={() => count.value--}>
        -1
      </button>
    </div>
  );
}
```

### ルートでの使用

```tsx
// routes/index.tsx
import Counter from "../islands/Counter.tsx";

export default function Home() {
  return (
    <div>
      <h1>Fresh Islands Demo</h1>
      {/* このコンポーネントだけがクライアントJSを持つ */}
      <Counter />
      {/* 以下は純粋なHTMLとして送信される */}
      <p>この部分にはJavaScriptは含まれません。</p>
    </div>
  );
}
```

### Signalsによる状態管理

```tsx
// islands/TodoList.tsx
import { useSignal } from "@preact/signals";

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export default function TodoList() {
  const todos = useSignal<Todo[]>([]);
  const input = useSignal("");

  const addTodo = () => {
    if (!input.value.trim()) return;
    todos.value = [
      ...todos.value,
      { id: Date.now(), text: input.value, done: false }
    ];
    input.value = "";
  };

  const toggleTodo = (id: number) => {
    todos.value = todos.value.map(todo =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    );
  };

  return (
    <div>
      <div>
        <input
          type="text"
          value={input.value}
          onInput={(e) => input.value = (e.target as HTMLInputElement).value}
          placeholder="新しいタスク..."
        />
        <button onClick={addTodo}>追加</button>
      </div>
      <ul>
        {todos.value.map(todo => (
          <li key={todo.id}>
            <label style={{ textDecoration: todo.done ? "line-through" : "none" }}>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
              />
              {todo.text}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## データフェッチ（ハンドラー）

### サーバーサイドデータ

```tsx
// routes/users.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

interface User {
  id: number;
  name: string;
  email: string;
}

export const handler: Handlers<User[]> = {
  async GET(_req, ctx) {
    const resp = await fetch("https://jsonplaceholder.typicode.com/users");
    const users: User[] = await resp.json();
    return ctx.render(users);
  },
};

export default function UsersPage({ data }: PageProps<User[]>) {
  return (
    <div>
      <h1>Users</h1>
      <ul>
        {data.map(user => (
          <li key={user.id}>
            <strong>{user.name}</strong> - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### フォーム処理

```tsx
// routes/contact.tsx
import { Handlers, PageProps } from "$fresh/server.ts";

interface FormData {
  name: string;
  message: string;
  success?: boolean;
}

export const handler: Handlers<FormData> = {
  GET(_req, ctx) {
    return ctx.render({ name: "", message: "" });
  },
  async POST(req, ctx) {
    const form = await req.formData();
    const name = form.get("name") as string;
    const message = form.get("message") as string;

    // ここでデータベースに保存するなど
    console.log(`Contact from ${name}: ${message}`);

    return ctx.render({ name, message, success: true });
  },
};

export default function ContactPage({ data }: PageProps<FormData>) {
  return (
    <div>
      <h1>Contact</h1>
      {data.success && (
        <p style={{ color: "green" }}>送信完了しました！</p>
      )}
      <form method="POST">
        <div>
          <label>
            名前:
            <input type="text" name="name" required />
          </label>
        </div>
        <div>
          <label>
            メッセージ:
            <textarea name="message" required></textarea>
          </label>
        </div>
        <button type="submit">送信</button>
      </form>
    </div>
  );
}
```

## APIルート

### 基本的なAPI

```ts
// routes/api/users.ts
import { Handlers } from "$fresh/server.ts";

const users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

export const handler: Handlers = {
  GET(_req) {
    return new Response(JSON.stringify(users), {
      headers: { "Content-Type": "application/json" },
    });
  },
  async POST(req) {
    const body = await req.json();
    const newUser = { id: users.length + 1, ...body };
    users.push(newUser);
    return new Response(JSON.stringify(newUser), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

### 動的APIルート

```ts
// routes/api/users/[id].ts
import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(_req, ctx) {
    const { id } = ctx.params;
    // データベースからユーザーを取得
    return new Response(JSON.stringify({ id, name: `User ${id}` }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

## ミドルウェア

### 認証ミドルウェア

```ts
// routes/_middleware.ts
import { MiddlewareHandlerContext } from "$fresh/server.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext,
) {
  // リクエスト前の処理
  const start = Date.now();

  // URLベースの認証チェック
  const url = new URL(req.url);
  if (url.pathname.startsWith("/admin")) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // 次のハンドラーに渡す
  const resp = await ctx.next();

  // レスポンス後の処理
  const duration = Date.now() - start;
  resp.headers.set("X-Response-Time", `${duration}ms`);

  return resp;
}
```

### CORSミドルウェア

```ts
// routes/api/_middleware.ts
import { MiddlewareHandlerContext } from "$fresh/server.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext,
) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const resp = await ctx.next();
  resp.headers.set("Access-Control-Allow-Origin", "*");
  return resp;
}
```

## スタイリング

### Tailwind CSS統合

```ts
// fresh.config.ts
import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";

export default defineConfig({
  plugins: [tailwind()],
});
```

```tsx
// routes/index.tsx
export default function Home() {
  return (
    <div class="max-w-4xl mx-auto p-8">
      <h1 class="text-4xl font-bold text-blue-600 mb-4">
        Fresh + Tailwind CSS
      </h1>
      <p class="text-gray-600 text-lg">
        Deno上で動作する高速フレームワーク
      </p>
      <button class="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
        Get Started
      </button>
    </div>
  );
}
```

## Deno Deployへのデプロイ

### GitHub連携

1. GitHubにリポジトリをプッシュ
2. [dash.deno.com](https://dash.deno.com) にアクセス
3. 「New Project」→ GitHubリポジトリを選択
4. エントリーポイントに `main.ts` を指定
5. 自動デプロイ完了

### CLIデプロイ

```bash
# Deno Deploy CLIインストール
deno install -A --no-check -r -f https://deno.land/x/deploy/deployctl.ts

# デプロイ
deployctl deploy --project=my-fresh-app main.ts
```

### 環境変数

```ts
// 環境変数の読み込み
const apiKey = Deno.env.get("API_KEY");
const dbUrl = Deno.env.get("DATABASE_URL");
```

Deno Deployのダッシュボードから環境変数を設定できます。

## データベース連携

### Deno KV

```ts
// routes/api/notes.ts
import { Handlers } from "$fresh/server.ts";

const kv = await Deno.openKv();

export const handler: Handlers = {
  async GET() {
    const entries = kv.list({ prefix: ["notes"] });
    const notes = [];
    for await (const entry of entries) {
      notes.push(entry.value);
    }
    return new Response(JSON.stringify(notes), {
      headers: { "Content-Type": "application/json" },
    });
  },
  async POST(req) {
    const note = await req.json();
    const id = crypto.randomUUID();
    await kv.set(["notes", id], { id, ...note, createdAt: new Date() });
    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

### PostgreSQL (Supabase)

```ts
// utils/db.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);
```

```ts
// routes/api/posts.ts
import { Handlers } from "$fresh/server.ts";
import { supabase } from "../../utils/db.ts";

export const handler: Handlers = {
  async GET() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }
    return new Response(JSON.stringify(data));
  },
};
```

## まとめ

Freshの主な利点：

1. **ゼロJSデフォルト** - Islands Architectureで最小限のJSのみ
2. **ビルドステップ不要** - 即座に開発開始、即座にデプロイ
3. **Deno Native** - TypeScript、セキュリティ、高速性能
4. **エッジデプロイ** - Deno Deployとの完全統合

FreshはDeno KVと組み合わせることで、データベースからフロントエンドまでフルスタックのエッジアプリケーションを構築できます。
