---
title: "Fresh 2.0 Denoフレームワーク完全ガイド"
description: "Fresh 2.0の新機能、Islands Architecture、Deno Deployとの連携まで徹底解説。ルーティング・ミドルウェア・Preact統合・SSRパフォーマンス最適化をコード例付きで紹介。"
pubDate: "2025-02-05"
tags: ['プログラミング', '開発ツール']
heroImage: '../../assets/thumbnails/fresh-2-deno-guide.jpg'
---
Fresh 2.0は、Denoエコシステムにおける次世代Webフレームワークとして大きな注目を集めています。本記事では、Fresh 2.0の新機能からIslands Architectureの実践的な使い方、Deno Deployとの連携、パフォーマンス最適化まで、完全に解説します。

## Fresh 2.0とは

Freshは、Deno向けに設計されたフルスタックWebフレームワークです。従来のSPA（Single Page Application）とは異なり、サーバーサイドレンダリング（SSR）を基本としながら、必要な部分だけクライアントサイドでインタラクティブにする「Islands Architecture」を採用しています。

### Fresh 2.0の主要な特徴

- **ゼロビルドステップ**: 開発時にバンドルやトランスパイルが不要
- **TypeScriptネイティブ**: Denoの型安全性を最大限活用
- **Islands Architecture**: 必要な部分だけハイドレーション
- **エッジ対応**: Deno Deployでグローバル配信が容易
- **軽量**: JavaScriptの配信量を最小化

## Fresh 2.0の新機能

Fresh 2.0では、開発体験とパフォーマンスが大幅に向上しました。

### プラグインシステムの強化

Fresh 2.0では、プラグインシステムが完全に再設計されました。以下は、Tailwind CSSプラグインの使用例です。

```typescript
// fresh.config.ts
import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";

export default defineConfig({
  plugins: [tailwind()],
});
```

### 改善されたルーティング

ファイルベースルーティングがより直感的になりました。

```
routes/
├── index.tsx          # /
├── about.tsx          # /about
├── blog/
│   ├── index.tsx     # /blog
│   ├── [slug].tsx    # /blog/:slug
│   └── _layout.tsx   # レイアウトコンポーネント
└── api/
    └── posts.ts      # /api/posts
```

### ミドルウェアの改善

Fresh 2.0では、ミドルウェアの記述がより簡潔になりました。

```typescript
// routes/_middleware.ts
import { FreshContext } from "$fresh/server.ts";

export async function handler(req: Request, ctx: FreshContext) {
  // 認証チェック
  const token = req.headers.get("authorization");

  if (!token && ctx.destination !== "route" || ctx.destination === "static") {
    return await ctx.next();
  }

  if (!token && new URL(req.url).pathname !== "/login") {
    return new Response("Unauthorized", { status: 401 });
  }

  ctx.state.user = await validateToken(token);
  return await ctx.next();
}

async function validateToken(token: string) {
  // トークン検証ロジック
  return { id: 1, name: "User" };
}
```

## Islands Architectureの深堀り

Islands Architectureは、Freshの最大の特徴です。ページ全体をJavaScriptでハイドレートするのではなく、インタラクティブが必要な「島（Island）」だけを選択的にハイドレートします。

### Islandコンポーネントの作成

```typescript
// islands/Counter.tsx
import { Signal, useSignal } from "@preact/signals";

export default function Counter() {
  const count = useSignal(0);

  return (
    <div class="counter">
      <p>カウント: {count.value}</p>
      <button onClick={() => count.value++}>
        増やす
      </button>
      <button onClick={() => count.value--}>
        減らす
      </button>
    </div>
  );
}
```

### 静的ページでIslandを使用

```typescript
// routes/index.tsx
import Counter from "../islands/Counter.tsx";

export default function Home() {
  return (
    <div>
      <h1>ようこそFresh 2.0へ</h1>
      <p>このページは完全に静的です。</p>

      {/* この部分だけインタラクティブ */}
      <Counter />

      <footer>
        <p>フッターも静的なHTMLです。</p>
      </footer>
    </div>
  );
}
```

この構造により、JavaScriptの配信量を最小限に抑えながら、必要な部分だけインタラクティブにできます。

## Preactベースのコンポーネント設計

FreshはPreactをUIライブラリとして採用しています。Reactとほぼ同じAPIを持ちながら、はるかに軽量です。

### Signalsによる状態管理

Fresh 2.0では、Preact Signalsが推奨される状態管理方法です。

```typescript
// islands/TodoList.tsx
import { useSignal, useComputed } from "@preact/signals";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export default function TodoList() {
  const todos = useSignal<Todo[]>([]);
  const newTodo = useSignal("");

  const activeTodos = useComputed(() =>
    todos.value.filter(t => !t.completed)
  );

  const addTodo = () => {
    if (newTodo.value.trim()) {
      todos.value = [...todos.value, {
        id: Date.now(),
        text: newTodo.value,
        completed: false,
      }];
      newTodo.value = "";
    }
  };

  const toggleTodo = (id: number) => {
    todos.value = todos.value.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
  };

  return (
    <div class="todo-list">
      <h2>TODOリスト</h2>

      <div class="input-group">
        <input
          type="text"
          value={newTodo.value}
          onInput={(e) => newTodo.value = e.currentTarget.value}
          onKeyPress={(e) => e.key === "Enter" && addTodo()}
          placeholder="新しいTODOを入力"
        />
        <button onClick={addTodo}>追加</button>
      </div>

      <p>残り: {activeTodos.value.length}件</p>

      <ul>
        {todos.value.map(todo => (
          <li key={todo.id} class={todo.completed ? "completed" : ""}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span>{todo.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### コンポーネント間のデータ受け渡し

```typescript
// routes/posts/[id].tsx
import { Handlers, PageProps } from "$fresh/server.ts";
import CommentList from "../../islands/CommentList.tsx";

interface Post {
  id: string;
  title: string;
  content: string;
}

export const handler: Handlers<Post> = {
  async GET(_req, ctx) {
    const post = await fetchPost(ctx.params.id);
    if (!post) {
      return ctx.renderNotFound();
    }
    return ctx.render(post);
  },
};

export default function PostPage({ data }: PageProps<Post>) {
  return (
    <article>
      <h1>{data.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: data.content }} />

      {/* Islandにサーバーサイドのデータを渡す */}
      <CommentList postId={data.id} />
    </article>
  );
}

async function fetchPost(id: string): Promise<Post | null> {
  // データベースから取得
  return {
    id,
    title: "サンプル記事",
    content: "<p>本文...</p>",
  };
}
```

## Deno Deployとの連携

Fresh 2.0は、Deno Deployとシームレスに統合されており、数分でグローバル配信が可能です。

### デプロイ設定

```typescript
// deno.json
{
  "tasks": {
    "dev": "deno run -A --watch=static/,routes/ dev.ts",
    "build": "deno run -A dev.ts build",
    "preview": "deno run -A main.ts",
    "update": "deno run -A -r https://fresh.deno.dev/update ."
  },
  "imports": {
    "$fresh/": "https://deno.land/x/fresh@2.0.0-alpha.19/",
    "preact": "https://esm.sh/preact@10.19.2",
    "@preact/signals": "https://esm.sh/*@preact/signals@1.2.1"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
```

### GitHub Actionsでの自動デプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy to Deno Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v3

      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - name: Deploy to Deno Deploy
        uses: denoland/deployctl@v1
        with:
          project: "my-fresh-app"
          entrypoint: "main.ts"
```

### エッジでのデータフェッチ

Deno Deployのエッジランタイムを活用した例です。

```typescript
// routes/api/location.ts
import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(req) {
    // クライアントの地理的位置情報を取得
    const location = req.headers.get("cf-ipcountry") || "Unknown";

    // エッジでKVからデータを取得
    const kv = await Deno.openKv();
    const regionData = await kv.get(["regions", location]);

    return new Response(JSON.stringify({
      location,
      data: regionData.value,
    }), {
      headers: { "content-type": "application/json" },
    });
  },
};
```

## パフォーマンス最適化

Fresh 2.0では、デフォルトで高いパフォーマンスが得られますが、さらに最適化する方法があります。

### 画像の最適化

```typescript
// routes/gallery.tsx
import { asset } from "$fresh/runtime.ts";

export default function Gallery() {
  return (
    <div class="gallery">
      {/* 静的アセットの最適化 */}
      <img
        src={asset("/images/hero.jpg")}
        alt="Hero"
        width={1200}
        height={630}
        loading="lazy"
      />
    </div>
  );
}
```

### プリフェッチの実装

```typescript
// islands/NavigationLink.tsx
import { useEffect } from "preact/hooks";

interface Props {
  href: string;
  children: preact.ComponentChildren;
}

export default function NavigationLink({ href, children }: Props) {
  useEffect(() => {
    // ホバー時にプリフェッチ
    const link = document.querySelector(`a[href="${href}"]`);
    if (!link) return;

    const prefetch = () => {
      const linkElement = document.createElement("link");
      linkElement.rel = "prefetch";
      linkElement.href = href;
      document.head.appendChild(linkElement);
    };

    link.addEventListener("mouseenter", prefetch, { once: true });
    return () => link.removeEventListener("mouseenter", prefetch);
  }, [href]);

  return <a href={href}>{children}</a>;
}
```

### Deno KVでキャッシング

```typescript
// routes/api/posts/[id].ts
import { Handlers } from "$fresh/server.ts";

const kv = await Deno.openKv();

export const handler: Handlers = {
  async GET(_req, ctx) {
    const postId = ctx.params.id;

    // キャッシュを確認
    const cached = await kv.get(["posts", postId]);
    if (cached.value) {
      return new Response(JSON.stringify(cached.value), {
        headers: {
          "content-type": "application/json",
          "x-cache": "HIT",
        },
      });
    }

    // DBから取得
    const post = await fetchPostFromDB(postId);

    // キャッシュに保存（1時間）
    await kv.set(["posts", postId], post, {
      expireIn: 3600000,
    });

    return new Response(JSON.stringify(post), {
      headers: {
        "content-type": "application/json",
        "x-cache": "MISS",
      },
    });
  },
};

async function fetchPostFromDB(id: string) {
  // 実際のDB処理
  return { id, title: "Post", content: "..." };
}
```

## まとめ

Fresh 2.0は、Denoエコシステムにおける強力なWebフレームワークです。Islands Architectureによる最適なJavaScript配信、Preactの軽量性、Deno Deployとのシームレスな統合により、高速で保守しやすいWebアプリケーションを構築できます。

特に以下のプロジェクトに適しています。

- **コンテンツ中心のサイト**: ブログ、ドキュメントサイト
- **Eコマース**: 高速なページロードが重要
- **ダッシュボード**: 部分的なインタラクティビティが必要
- **グローバルアプリ**: エッジデプロイが有効

Fresh 2.0とDenoで、次世代のWeb開発を体験してみてください。
