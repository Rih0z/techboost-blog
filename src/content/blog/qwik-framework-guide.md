---
title: "Qwikフレームワーク完全ガイド2026 - Resumabilityの革命"
description: "Qwikの基礎から実践まで徹底解説。Resumability、コンポーネント、useSignal、useTask$、ルーティング、データフェッチ、React/Next.jsとの比較まで完全網羅。"
pubDate: "Feb 05 2026"
tags: ["Qwik", "フレームワーク", "パフォーマンス", "Resumability", "Web"]
---

## はじめに

Qwikは、**Resumability（再開可能性）**という革新的な概念で、従来のWebフレームワークの常識を覆します。

**「ハイドレーション不要」**で、ページ読み込み時のJavaScript実行をほぼゼロにします。

### Qwikの特徴

- **Resumability**: ハイドレーション不要、瞬時のインタラクティブ
- **遅延実行**: 必要なコードのみ、必要な時に読み込む
- **HTML優先**: サーバーで完全なHTML生成
- **TypeScript**: 完全型サポート
- **SSR/SSG両対応**: 柔軟なレンダリング戦略
- **Reactライク**: 学習コスト低い

### いつQwikを選ぶべきか

**最適な用途:**
- ECサイト（ページ読み込み速度重視）
- メディアサイト（SEO + パフォーマンス）
- ランディングページ
- ダッシュボード（初期表示速度重視）
- モバイルファースト

**不向きな用途:**
- 大量の既存Reactライブラリに依存
- 複雑なグローバル状態管理
- リアルタイム性が最優先（Convex等が適している）

## セットアップ

### プロジェクト作成

```bash
npm create qwik@latest

# 選択肢:
# - Empty App
# - Basic (推奨)
# - Documentation
# - Qwik City + Tailwind
```

### 手動セットアップ

```bash
mkdir my-qwik-app
cd my-qwik-app
npm init -y
npm install @builder.io/qwik @builder.io/qwik-city vite
```

```json
// package.json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### プロジェクト構造

```
my-qwik-app/
├── src/
│   ├── routes/
│   │   ├── index.tsx
│   │   ├── layout.tsx
│   │   └── about/
│   │       └── index.tsx
│   ├── components/
│   │   └── header/
│   │       └── header.tsx
│   └── entry.ssr.tsx
├── public/
│   └── favicon.svg
└── vite.config.ts
```

## Resumability vs Hydration

### 従来のハイドレーション

```
1. サーバーがHTMLを生成
2. ブラウザがHTMLを表示（静的、操作不可）
3. JavaScriptダウンロード
4. ハイドレーション実行（全コンポーネント再構築）
5. インタラクティブに
```

**問題点:**
- 初期JSバンドルが大きい
- ハイドレーションに時間がかかる
- TTI（Time to Interactive）が遅い

### Qwikのアプローチ

```
1. サーバーがHTML + イベントリスナー情報を生成
2. ブラウザがHTMLを表示（即座にインタラクティブ）
3. ユーザーがクリック等 → その時だけJSダウンロード・実行
```

**メリット:**
- 初期JSほぼゼロ
- ハイドレーション不要
- TTI = FCP（First Contentful Paint）

## コンポーネント

### 基本コンポーネント

```tsx
// src/components/counter/counter.tsx
import { component$, useSignal } from '@builder.io/qwik';

export const Counter = component$(() => {
  const count = useSignal(0);

  return (
    <div>
      <p>Count: {count.value}</p>
      <button onClick$={() => count.value++}>
        Increment
      </button>
    </div>
  );
});
```

**重要:**
- `component$()`: Qwikコンポーネント定義
- `$` サフィックス: 遅延実行のマーカー
- `useSignal()`: リアクティブな状態管理

### Props

```tsx
// src/components/card/card.tsx
import { component$ } from '@builder.io/qwik';

interface CardProps {
  title: string;
  description: string;
  url?: string;
}

export const Card = component$<CardProps>((props) => {
  return (
    <div class="card">
      <h2>{props.title}</h2>
      <p>{props.description}</p>
      {props.url && <a href={props.url}>Learn more</a>}
    </div>
  );
});
```

### Children

```tsx
// src/components/layout/layout.tsx
import { component$, Slot } from '@builder.io/qwik';

export const Layout = component$(() => {
  return (
    <div class="layout">
      <header>My Site</header>
      <main>
        <Slot />
      </main>
      <footer>© 2026</footer>
    </div>
  );
});
```

```tsx
// 使用例
<Layout>
  <p>This is the content</p>
</Layout>
```

## リアクティブな状態管理

### useSignal

```tsx
import { component$, useSignal } from '@builder.io/qwik';

export const SearchBox = component$(() => {
  const query = useSignal('');
  const results = useSignal<string[]>([]);

  return (
    <div>
      <input
        type="text"
        value={query.value}
        onInput$={(e) => {
          query.value = (e.target as HTMLInputElement).value;
        }}
      />
      <button
        onClick$={async () => {
          const response = await fetch(`/api/search?q=${query.value}`);
          results.value = await response.json();
        }}
      >
        Search
      </button>
      <ul>
        {results.value.map((result) => (
          <li key={result}>{result}</li>
        ))}
      </ul>
    </div>
  );
});
```

### useStore

```tsx
import { component$, useStore } from '@builder.io/qwik';

interface TodoState {
  items: { id: number; text: string; done: boolean }[];
  filter: 'all' | 'active' | 'completed';
}

export const TodoList = component$(() => {
  const state = useStore<TodoState>({
    items: [],
    filter: 'all',
  });

  const addTodo = $((text: string) => {
    state.items.push({
      id: Date.now(),
      text,
      done: false,
    });
  });

  const toggleTodo = $((id: number) => {
    const todo = state.items.find((item) => item.id === id);
    if (todo) {
      todo.done = !todo.done;
    }
  });

  const filteredItems = state.items.filter((item) => {
    if (state.filter === 'active') return !item.done;
    if (state.filter === 'completed') return item.done;
    return true;
  });

  return (
    <div>
      <input
        type="text"
        onKeyDown$={(e) => {
          if (e.key === 'Enter') {
            const input = e.target as HTMLInputElement;
            addTodo(input.value);
            input.value = '';
          }
        }}
      />
      <div>
        <button onClick$={() => (state.filter = 'all')}>All</button>
        <button onClick$={() => (state.filter = 'active')}>Active</button>
        <button onClick$={() => (state.filter = 'completed')}>Completed</button>
      </div>
      <ul>
        {filteredItems.map((item) => (
          <li key={item.id}>
            <input
              type="checkbox"
              checked={item.done}
              onClick$={() => toggleTodo(item.id)}
            />
            <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
});
```

## useTask$（副作用）

### 基本使用

```tsx
import { component$, useSignal, useTask$ } from '@builder.io/qwik';

export const AutoSave = component$(() => {
  const text = useSignal('');
  const saveStatus = useSignal<'idle' | 'saving' | 'saved'>('idle');

  useTask$(({ track }) => {
    // textの変更を追跡
    const currentText = track(() => text.value);

    // デバウンス処理
    const timeout = setTimeout(async () => {
      saveStatus.value = 'saving';
      await fetch('/api/save', {
        method: 'POST',
        body: JSON.stringify({ text: currentText }),
      });
      saveStatus.value = 'saved';
    }, 1000);

    return () => clearTimeout(timeout);
  });

  return (
    <div>
      <textarea
        value={text.value}
        onInput$={(e) => (text.value = (e.target as HTMLTextAreaElement).value)}
      />
      <p>Status: {saveStatus.value}</p>
    </div>
  );
});
```

### 初回実行のみ

```tsx
import { component$, useSignal, useTask$ } from '@builder.io/qwik';

export const DataLoader = component$(() => {
  const data = useSignal<any>(null);

  useTask$(async () => {
    // コンポーネントマウント時に1回だけ実行
    const response = await fetch('/api/data');
    data.value = await response.json();
  });

  return <div>{data.value ? JSON.stringify(data.value) : 'Loading...'}</div>;
});
```

## ルーティング（Qwik City）

### ファイルベースルーティング

```
src/routes/
├── index.tsx              → /
├── about/
│   └── index.tsx          → /about
├── blog/
│   ├── index.tsx          → /blog
│   └── [slug]/
│       └── index.tsx      → /blog/:slug
└── api/
    └── data.ts            → /api/data
```

### 動的ルート

```tsx
// src/routes/blog/[slug]/index.tsx
import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';

export const usePost = routeLoader$(async (requestEvent) => {
  const slug = requestEvent.params.slug;
  const response = await fetch(`https://api.example.com/posts/${slug}`);
  const post = await response.json();
  return post;
});

export default component$(() => {
  const post = usePost();

  return (
    <article>
      <h1>{post.value.title}</h1>
      <div dangerouslySetInnerHTML={post.value.content} />
    </article>
  );
});
```

### レイアウト

```tsx
// src/routes/layout.tsx
import { component$, Slot } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';

export const useServerData = routeLoader$(async () => {
  return {
    timestamp: new Date().toISOString(),
  };
});

export default component$(() => {
  const data = useServerData();

  return (
    <div>
      <header>
        <nav>
          <a href="/">Home</a>
          <a href="/blog">Blog</a>
          <a href="/about">About</a>
        </nav>
        <p>Server time: {data.value.timestamp}</p>
      </header>
      <main>
        <Slot />
      </main>
      <footer>© 2026</footer>
    </div>
  );
});
```

### ネストレイアウト

```
src/routes/
├── layout.tsx              ← ルートレイアウト
├── blog/
│   ├── layout.tsx          ← ブログレイアウト
│   └── [slug]/
│       └── index.tsx
```

```tsx
// src/routes/blog/layout.tsx
import { component$, Slot } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div class="blog-layout">
      <aside>
        <h3>Recent Posts</h3>
        {/* サイドバー */}
      </aside>
      <div class="blog-content">
        <Slot />
      </div>
    </div>
  );
});
```

## データフェッチ

### routeLoader$

```tsx
// src/routes/users/index.tsx
import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';

export const useUsers = routeLoader$(async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/users');
  const users = await response.json();
  return users;
});

export default component$(() => {
  const users = useUsers();

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.value.map((user: any) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
});
```

### routeAction$（フォーム処理）

```tsx
// src/routes/contact/index.tsx
import { component$ } from '@builder.io/qwik';
import { routeAction$, Form } from '@builder.io/qwik-city';

export const useContactAction = routeAction$(async (data, requestEvent) => {
  // フォームデータ処理
  const name = data.name;
  const email = data.email;
  const message = data.message;

  // メール送信等
  await fetch('/api/send-email', {
    method: 'POST',
    body: JSON.stringify({ name, email, message }),
  });

  return {
    success: true,
    message: 'Thank you for your message!',
  };
});

export default component$(() => {
  const action = useContactAction();

  return (
    <div>
      <h1>Contact Us</h1>
      <Form action={action}>
        <input type="text" name="name" placeholder="Name" required />
        <input type="email" name="email" placeholder="Email" required />
        <textarea name="message" placeholder="Message" required />
        <button type="submit">Send</button>
      </Form>
      {action.value?.success && <p>{action.value.message}</p>}
    </div>
  );
});
```

### APIエンドポイント

```tsx
// src/routes/api/data.ts
import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async (requestEvent) => {
  const data = {
    message: 'Hello from API',
    timestamp: new Date().toISOString(),
  };

  requestEvent.json(200, data);
};

export const onPost: RequestHandler = async (requestEvent) => {
  const body = await requestEvent.parseBody();

  // データ処理
  console.log(body);

  requestEvent.json(201, { success: true });
};
```

## フォーム処理

### プログレッシブエンハンスメント

```tsx
// src/routes/todos/index.tsx
import { component$ } from '@builder.io/qwik';
import { routeAction$, routeLoader$, Form } from '@builder.io/qwik-city';

export const useTodos = routeLoader$(async () => {
  // DBから取得
  return [
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Walk dog', done: true },
  ];
});

export const useAddTodo = routeAction$(async (data) => {
  // DBに保存
  const newTodo = {
    id: Date.now(),
    text: data.text as string,
    done: false,
  };
  // await db.insert(newTodo);
  return { success: true };
});

export const useToggleTodo = routeAction$(async (data) => {
  const id = Number(data.id);
  // await db.update(id, { done: !done });
  return { success: true };
});

export default component$(() => {
  const todos = useTodos();
  const addAction = useAddTodo();
  const toggleAction = useToggleTodo();

  return (
    <div>
      <h1>Todos</h1>

      {/* JavaScriptなしでも動作 */}
      <Form action={addAction}>
        <input type="text" name="text" required />
        <button type="submit">Add</button>
      </Form>

      <ul>
        {todos.value.map((todo) => (
          <li key={todo.id}>
            <Form action={toggleAction}>
              <input type="hidden" name="id" value={todo.id} />
              <button type="submit">
                {todo.done ? '✓' : '○'}
              </button>
              <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
                {todo.text}
              </span>
            </Form>
          </li>
        ))}
      </ul>
    </div>
  );
});
```

## スタイリング

### インラインCSS

```tsx
import { component$ } from '@builder.io/qwik';

export const Button = component$(() => {
  return (
    <button
      style={{
        backgroundColor: 'blue',
        color: 'white',
        padding: '10px 20px',
      }}
    >
      Click me
    </button>
  );
});
```

### CSS Modules

```css
/* src/components/card/card.module.css */
.card {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 8px;
}

.card h2 {
  margin-top: 0;
}
```

```tsx
// src/components/card/card.tsx
import { component$ } from '@builder.io/qwik';
import styles from './card.module.css';

export const Card = component$(() => {
  return (
    <div class={styles.card}>
      <h2>Title</h2>
      <p>Content</p>
    </div>
  );
});
```

### Tailwind CSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

```tsx
import { component$ } from '@builder.io/qwik';

export const Hero = component$(() => {
  return (
    <div class="bg-blue-500 text-white p-8 rounded-lg">
      <h1 class="text-4xl font-bold">Welcome to Qwik</h1>
      <p class="mt-4">The resumable framework</p>
    </div>
  );
});
```

## React/Next.jsとの比較

### パフォーマンス

| 指標 | Qwik | Next.js |
|------|------|---------|
| 初期JSバンドル | ~1KB | ~80KB+ |
| ハイドレーション | 不要 | 必要 |
| TTI | 即座 | 1-3秒 |
| コード分割 | 自動・細粒度 | 手動・ページ単位 |

### 学習曲線

```tsx
// React
import { useState, useEffect } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

```tsx
// Qwik
import { component$, useSignal, useTask$ } from '@builder.io/qwik';

export const Counter = component$(() => {
  const count = useSignal(0);

  useTask$(({ track }) => {
    track(() => count.value);
    console.log('Count changed:', count.value);
  });

  return (
    <button onClick$={() => count.value++}>
      Count: {count.value}
    </button>
  );
});
```

**類似点:**
- コンポーネントベース
- リアクティブ
- JSX構文

**相違点:**
- `$` サフィックス（遅延実行）
- `useSignal` vs `useState`
- `useTask$` vs `useEffect`

## デプロイ

### Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist
```

### Vercel

```bash
npm install -D @builder.io/qwik-city
npm run build
vercel
```

### Node.js

```bash
npm run build.server
node server/entry.express.js
```

## まとめ

### Qwikのメリット

1. **最速のTTI**: ハイドレーション不要
2. **超軽量**: 初期JSほぼゼロ
3. **自動最適化**: 手動コード分割不要
4. **プログレッシブエンハンスメント**: JS無効でも動作
5. **Reactライク**: 学習コスト低い

### ベストプラクティス

- `$` サフィックスを理解する
- `useSignal` で状態管理
- `routeLoader$` でデータ取得
- フォームはプログレッシブエンハンスメント
- 細かいコンポーネント分割

### 次のステップ

- 公式ドキュメント: https://qwik.builder.io/
- チュートリアル: https://qwik.builder.io/tutorial/
- Discord: コミュニティで質問

Qwikで、世界最速のWebアプリを構築しましょう。
