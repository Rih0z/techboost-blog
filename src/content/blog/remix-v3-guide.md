---
title: "Remix v3入門 — React Router v7ベースの次世代フレームワーク"
description: "Remix v3とReact Router v7の統合で進化した新しいフルスタックフレームワーク。loader/action、ネストルーティング、Server Functions、ストリーミングの実装方法を解説。"
pubDate: "2026-02-05"
tags: ["Remix", "React Router", "React", "フルスタック"]
---

Remix v3は、React Router v7との統合により、より強力で柔軟なフルスタックフレームワークへと進化しました。この記事では、Remix v3の基本から応用までを実践的に解説します。

## Remix v3とReact Router v7の統合

Remix v3では、React Router v7をベースとして採用し、両者の境界が曖昧になりました。これにより、React Routerユーザーは段階的にフルスタック機能を追加でき、Remixユーザーはより洗練されたルーティング機能を享受できます。

### 主な変更点

- **統一されたルーティング**: React Router v7のルーティングAPIがRemixの基盤に
- **段階的な採用**: クライアント専用からサーバーサイドレンダリングまで柔軟に選択可能
- **改善されたパフォーマンス**: ストリーミングSSRとプログレッシブエンハンスメント
- **型安全性の向上**: TypeScript統合の強化

## プロジェクトのセットアップ

```bash
# Remix v3プロジェクトの作成
npx create-remix@latest my-remix-app

# プロジェクトディレクトリに移動
cd my-remix-app

# 開発サーバーの起動
npm run dev
```

基本的なディレクトリ構造:

```
my-remix-app/
├── app/
│   ├── routes/          # ルート定義
│   ├── entry.client.tsx # クライアントエントリーポイント
│   ├── entry.server.tsx # サーバーエントリーポイント
│   └── root.tsx         # ルートコンポーネント
├── public/              # 静的ファイル
└── remix.config.js      # Remix設定
```

## loaderとaction — データの読み書き

Remixの中核機能であるloaderとactionを使用して、サーバーサイドのデータ操作を実装します。

### loader - データの取得

```tsx
// app/routes/posts.$postId.tsx
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
}

export async function loader({ params }: LoaderFunctionArgs) {
  const postId = params.postId;

  // データベースから記事を取得
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { author: true }
  });

  if (!post) {
    throw new Response("Not Found", { status: 404 });
  }

  return json<Post>({
    id: post.id,
    title: post.title,
    content: post.content,
    author: post.author.name,
    createdAt: post.createdAt.toISOString()
  });
}

export default function PostDetail() {
  const post = useLoaderData<typeof loader>();

  return (
    <article>
      <h1>{post.title}</h1>
      <p className="text-gray-600">
        by {post.author} • {new Date(post.createdAt).toLocaleDateString()}
      </p>
      <div className="prose">{post.content}</div>
    </article>
  );
}
```

### action - データの更新・作成

```tsx
// app/routes/posts.new.tsx
import { json, redirect, ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";

interface ActionData {
  errors?: {
    title?: string;
    content?: string;
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const title = formData.get("title");
  const content = formData.get("content");

  // バリデーション
  const errors: ActionData["errors"] = {};
  if (typeof title !== "string" || title.length < 3) {
    errors.title = "タイトルは3文字以上必要です";
  }
  if (typeof content !== "string" || content.length < 10) {
    errors.content = "本文は10文字以上必要です";
  }

  if (Object.keys(errors).length > 0) {
    return json<ActionData>({ errors }, { status: 400 });
  }

  // データベースに保存
  const post = await db.post.create({
    data: {
      title,
      content,
      authorId: "current-user-id" // 認証情報から取得
    }
  });

  return redirect(`/posts/${post.id}`);
}

export default function NewPost() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Form method="post">
      <div>
        <label htmlFor="title">タイトル</label>
        <input
          type="text"
          id="title"
          name="title"
          className={actionData?.errors?.title ? "border-red-500" : ""}
          required
        />
        {actionData?.errors?.title && (
          <p className="text-red-500">{actionData.errors.title}</p>
        )}
      </div>

      <div>
        <label htmlFor="content">本文</label>
        <textarea
          id="content"
          name="content"
          rows={10}
          className={actionData?.errors?.content ? "border-red-500" : ""}
          required
        />
        {actionData?.errors?.content && (
          <p className="text-red-500">{actionData.errors.content}</p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "投稿中..." : "投稿する"}
      </button>
    </Form>
  );
}
```

## ネストルーティング

Remixの強力な機能の一つがネストルーティングです。レイアウトを階層化し、再利用可能なコンポーネント構造を構築できます。

```tsx
// app/routes/_app.tsx (レイアウトルート)
import { Outlet } from "@remix-run/react";

export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="bg-gray-800 text-white p-4">
        <nav>
          <a href="/">ホーム</a>
          <a href="/posts">記事一覧</a>
          <a href="/about">About</a>
        </nav>
      </header>

      <main className="container mx-auto p-4">
        <Outlet /> {/* 子ルートがここにレンダリング */}
      </main>

      <footer className="bg-gray-200 p-4 mt-8">
        <p>&copy; 2026 My Remix App</p>
      </footer>
    </div>
  );
}
```

```tsx
// app/routes/_app.posts.tsx (記事セクションのレイアウト)
import { Outlet, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";

export async function loader() {
  const categories = await db.category.findMany();
  return json({ categories });
}

export default function PostsLayout() {
  const { categories } = useLoaderData<typeof loader>();

  return (
    <div className="flex gap-8">
      <aside className="w-64">
        <h2>カテゴリ</h2>
        <ul>
          {categories.map(cat => (
            <li key={cat.id}>
              <a href={`/posts/category/${cat.slug}`}>{cat.name}</a>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex-1">
        <Outlet /> {/* 記事一覧や詳細がここに */}
      </div>
    </div>
  );
}
```

## Server Functions

Remix v3では、React Server Componentsの概念に近いServer Functionsが導入され、クライアントコンポーネントから直接サーバー関数を呼び出せます。

```tsx
// app/routes/todos.tsx
import { serverFn$ } from "@remix-run/server-runtime";

// サーバー専用関数（クライアントバンドルに含まれない）
const addTodo = serverFn$(async (text: string) => {
  "use server"; // サーバー関数マーカー

  const todo = await db.todo.create({
    data: { text, completed: false }
  });

  return todo;
});

const toggleTodo = serverFn$(async (id: string) => {
  "use server";

  const todo = await db.todo.findUnique({ where: { id } });
  if (!todo) throw new Error("Todo not found");

  return db.todo.update({
    where: { id },
    data: { completed: !todo.completed }
  });
});

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState("");

  const handleAdd = async () => {
    const newTodo = await addTodo(text);
    setTodos([...todos, newTodo]);
    setText("");
  };

  const handleToggle = async (id: string) => {
    await toggleTodo(id);
    setTodos(todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  return (
    <div>
      <h1>Todo リスト</h1>

      <div>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="新しいタスク"
        />
        <button onClick={handleAdd}>追加</button>
      </div>

      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo.id)}
            />
            <span className={todo.completed ? "line-through" : ""}>
              {todo.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## ストリーミングSSR

Remix v3では、React 18のSuspenseを活用したストリーミングSSRがサポートされ、ページの一部を段階的に表示できます。

```tsx
// app/routes/dashboard.tsx
import { defer, LoaderFunctionArgs } from "@remix-run/node";
import { Await, useLoaderData } from "@remix-run/react";
import { Suspense } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  // 即座に取得するデータ
  const userPromise = getUserData(request);

  // 遅いデータ（ストリーミングで後から送信）
  const analyticsPromise = getAnalytics(); // 重い処理
  const recentOrdersPromise = getRecentOrders(); // 重い処理

  return defer({
    user: await userPromise, // 待機
    analytics: analyticsPromise, // Promiseのまま渡す
    recentOrders: recentOrdersPromise
  });
}

export default function Dashboard() {
  const { user, analytics, recentOrders } = useLoaderData<typeof loader>();

  return (
    <div>
      {/* すぐに表示される部分 */}
      <h1>ようこそ、{user.name}さん</h1>

      {/* ローディング中は代替UIを表示 */}
      <Suspense fallback={<div>分析データを読み込み中...</div>}>
        <Await resolve={analytics}>
          {(data) => (
            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card">
                <h3>訪問者数</h3>
                <p className="text-3xl">{data.visitors}</p>
              </div>
              <div className="stat-card">
                <h3>売上</h3>
                <p className="text-3xl">¥{data.revenue.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <h3>コンバージョン率</h3>
                <p className="text-3xl">{data.conversionRate}%</p>
              </div>
            </div>
          )}
        </Await>
      </Suspense>

      <Suspense fallback={<div>注文履歴を読み込み中...</div>}>
        <Await resolve={recentOrders}>
          {(orders) => (
            <div>
              <h2>最近の注文</h2>
              <table>
                <thead>
                  <tr>
                    <th>注文ID</th>
                    <th>日付</th>
                    <th>金額</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.date}</td>
                      <td>¥{order.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Await>
      </Suspense>
    </div>
  );
}
```

## エラーハンドリング

```tsx
// app/routes/posts.$postId.tsx
import { isRouteErrorResponse, useRouteError } from "@remix-run/react";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="error-container">
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    );
  }

  return (
    <div className="error-container">
      <h1>予期しないエラーが発生しました</h1>
      <p>{error instanceof Error ? error.message : "不明なエラー"}</p>
    </div>
  );
}
```

## まとめ

Remix v3は、React Router v7との統合により、より強力で柔軟なフルスタックフレームワークに進化しました。

**主な利点:**
- loader/actionによる型安全なデータフロー
- ネストルーティングによる再利用可能なレイアウト
- Server Functionsによるシンプルなサーバー通信
- ストリーミングSSRによる高速な初期表示
- プログレッシブエンハンスメントによる堅牢性

Remix v3は、モダンなWeb開発のベストプラクティスを体現したフレームワークです。Next.jsからの移行や新規プロジェクトでの採用を検討する価値があります。
