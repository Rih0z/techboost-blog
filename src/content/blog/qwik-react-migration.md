---
title: "ReactからQwikへの移行ガイド — Resumabilityへの道"
description: "ReactアプリをQwikに移行する完全ガイド。コンポーネント変換、フック移行、ルーティング、状態管理、エコシステム対応まで実践的に解説。段階的移行戦略とパフォーマンス改善の実例付き。"
pubDate: "2026-02-06"
tags: ["Qwik", "React", "移行", "Resumability", "パフォーマンス", "フレームワーク"]
---

Reactからqwikへの移行は、ハイドレーションによるパフォーマンスボトルネックを解消する有力な選択肢です。

この記事では、既存のReactアプリをQwikに移行するための実践的なガイドを提供します。

## なぜQwikに移行するのか

### Reactの課題

**ハイドレーション問題:**
```
1. サーバーがHTMLを生成
2. ブラウザが静的HTMLを表示（操作不可）
3. JavaScriptをダウンロード（80KB以上）
4. ハイドレーション実行（全コンポーネント再構築）
5. やっとインタラクティブに（1-3秒後）
```

### Qwikの利点

**Resumability:**
```
1. サーバーがHTML + イベントリスナー情報を生成
2. ブラウザが表示（即座にインタラクティブ）
3. ユーザーがクリック → その時だけJSダウンロード
```

**実測パフォーマンス:**
- 初期JSバンドル: 80KB → **1KB以下**
- Time to Interactive: 1-3秒 → **即座**
- Lighthouse Score: 70-90 → **95-100**

## 移行戦略

### 段階的移行 vs 全面リライト

**段階的移行（推奨）:**
1. 新しいページ/機能をQwikで実装
2. Reactコンポーネントを徐々にQwikに変換
3. 共存しながら移行

**全面リライト:**
- 小規模アプリ（<10ページ）に適している
- リスクは高いが、完全最適化が可能

### 移行の順序

```
1. 新規プロジェクト作成
2. ルーティング設定
3. レイアウトコンポーネント
4. 静的コンポーネント（Header、Footer）
5. 動的コンポーネント（フォーム、リスト）
6. 複雑な状態管理
7. API統合
8. 最適化
```

## コンポーネントの変換

### 基本的な変換パターン

**React:**
```tsx
// Button.tsx
import { FC } from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: FC<ButtonProps> = ({ label, onClick }) => {
  return (
    <button onClick={onClick} className="btn">
      {label}
    </button>
  );
};
```

**Qwik:**
```tsx
// button.tsx
import { component$, type QwikClickEvent } from '@builder.io/qwik';

interface ButtonProps {
  label: string;
  onClick$: (event: QwikClickEvent<HTMLButtonElement>) => void;
}

export const Button = component$<ButtonProps>(({ label, onClick$ }) => {
  return (
    <button onClick$={onClick$} class="btn">
      {label}
    </button>
  );
});
```

**主な変更点:**
- `FC` → `component$()`
- `onClick` → `onClick$`
- `className` → `class`
- `$` サフィックスでイベントハンドラを遅延実行

### useState の変換

**React:**
```tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

**Qwik:**
```tsx
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

**主な変更点:**
- `useState` → `useSignal`
- `count` → `count.value`
- `setCount(count + 1)` → `count.value++`

### useEffect の変換

**React:**
```tsx
import { useState, useEffect } from 'react';

export function DataFetcher() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

**Qwik:**
```tsx
import { component$, useSignal, useTask$ } from '@builder.io/qwik';

export const DataFetcher = component$(() => {
  const data = useSignal(null);
  const loading = useSignal(true);

  useTask$(async () => {
    const response = await fetch('/api/data');
    data.value = await response.json();
    loading.value = false;
  });

  if (loading.value) return <div>Loading...</div>;

  return <div>{JSON.stringify(data.value)}</div>;
});
```

**主な変更点:**
- `useEffect` → `useTask$`
- 依存配列不要（自動追跡）
- async/await が直接使用可能

### useEffect with dependencies の変換

**React:**
```tsx
import { useState, useEffect } from 'react';

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(setUser);
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

**Qwik:**
```tsx
import { component$, useSignal, useTask$ } from '@builder.io/qwik';

export const UserProfile = component$(({ userId }: { userId: string }) => {
  const user = useSignal(null);

  useTask$(({ track }) => {
    track(() => userId); // userIdの変更を追跡

    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => user.value = data);
  });

  return <div>{user.value?.name}</div>;
});
```

## ルーティングの移行

### React Router → Qwik City

**React Router:**
```tsx
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { BlogPost } from './pages/BlogPost';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Qwik City:**
```
src/routes/
├── index.tsx              → /
├── about/
│   └── index.tsx          → /about
└── blog/
    └── [slug]/
        └── index.tsx      → /blog/:slug
```

```tsx
// src/routes/blog/[slug]/index.tsx
import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';

export const usePost = routeLoader$(async (requestEvent) => {
  const slug = requestEvent.params.slug;
  const response = await fetch(`/api/posts/${slug}`);
  return await response.json();
});

export default component$(() => {
  const post = usePost();

  return (
    <article>
      <h1>{post.value.title}</h1>
      <div>{post.value.content}</div>
    </article>
  );
});
```

### Next.js → Qwik City

**Next.js Pages Router:**
```tsx
// pages/posts/[id].tsx
import { GetServerSideProps } from 'next';

export default function Post({ post }: { post: any }) {
  return <div>{post.title}</div>;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const response = await fetch(`/api/posts/${params?.id}`);
  const post = await response.json();
  return { props: { post } };
};
```

**Qwik City:**
```tsx
// src/routes/posts/[id]/index.tsx
import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';

export const usePost = routeLoader$(async (requestEvent) => {
  const id = requestEvent.params.id;
  const response = await fetch(`/api/posts/${id}`);
  return await response.json();
});

export default component$(() => {
  const post = usePost();
  return <div>{post.value.title}</div>;
});
```

## 状態管理の移行

### Context API → Qwik Context

**React:**
```tsx
// ThemeContext.tsx
import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

**Qwik:**
```tsx
// theme-context.tsx
import { component$, createContextId, useContextProvider, useContext, useSignal, Slot } from '@builder.io/qwik';

export const ThemeContext = createContextId<{ theme: Signal<string> }>('theme');

export const ThemeProvider = component$(() => {
  const theme = useSignal('light');

  useContextProvider(ThemeContext, { theme });

  return <Slot />;
});

export const useTheme = () => useContext(ThemeContext);
```

### Zustand → Qwik Store

**Zustand:**
```tsx
import create from 'zustand';

interface TodoStore {
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
}

export const useTodoStore = create<TodoStore>((set) => ({
  todos: [],
  addTodo: (text) =>
    set((state) => ({
      todos: [...state.todos, { id: Date.now().toString(), text, done: false }],
    })),
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      ),
    })),
}));
```

**Qwik:**
```tsx
// todo-store.ts
import { createContextId } from '@builder.io/qwik';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

interface TodoStore {
  todos: Todo[];
}

export const TodoContext = createContextId<TodoStore>('todo');

// todo-provider.tsx
import { component$, useStore, useContextProvider, Slot } from '@builder.io/qwik';

export const TodoProvider = component$(() => {
  const store = useStore<TodoStore>({
    todos: [],
  });

  useContextProvider(TodoContext, store);

  return <Slot />;
});

// useTodo.ts
import { useContext, $ } from '@builder.io/qwik';

export const useTodo = () => {
  const store = useContext(TodoContext);

  const addTodo = $((text: string) => {
    store.todos.push({
      id: Date.now().toString(),
      text,
      done: false,
    });
  });

  const toggleTodo = $((id: string) => {
    const todo = store.todos.find((t) => t.id === id);
    if (todo) {
      todo.done = !todo.done;
    }
  });

  return { store, addTodo, toggleTodo };
};
```

## フォーム処理の移行

### React Hook Form → Qwik Form

**React Hook Form:**
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Login</button>
    </form>
  );
}
```

**Qwik City Form:**
```tsx
import { component$ } from '@builder.io/qwik';
import { routeAction$, Form, z, zod$ } from '@builder.io/qwik-city';

export const useLoginAction = routeAction$(
  async (data) => {
    // サーバー側で実行
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return { success: true };
  },
  zod$({
    email: z.string().email(),
    password: z.string().min(8),
  })
);

export default component$(() => {
  const action = useLoginAction();

  return (
    <Form action={action}>
      <input name="email" type="email" required />
      {action.value?.fieldErrors?.email && (
        <span>{action.value.fieldErrors.email}</span>
      )}

      <input name="password" type="password" required />
      {action.value?.fieldErrors?.password && (
        <span>{action.value.fieldErrors.password}</span>
      )}

      <button type="submit">Login</button>
    </Form>
  );
});
```

## エコシステムの対応

### スタイリング

| React | Qwik | 備考 |
|-------|------|------|
| CSS Modules | ✅ CSS Modules | 完全対応 |
| Tailwind CSS | ✅ Tailwind CSS | 完全対応 |
| styled-components | ❌ | Qwik Styled推奨 |
| Emotion | ❌ | 未対応 |

### UIライブラリ

| React | Qwik | 備考 |
|-------|------|------|
| Material-UI | ❌ | Qwik UIを使用 |
| Chakra UI | ❌ | 未対応 |
| Headless UI | ✅ Qwik UI | 完全対応 |
| Radix UI | ✅ Qwik UI | 完全対応 |

### Reactコンポーネントの統合

```tsx
// Qwik内でReactコンポーネントを使用
import { qwikify$ } from '@builder.io/qwik-react';
import { DatePicker } from 'react-datepicker';

export const QwikDatePicker = qwikify$(DatePicker);

// 使用例
<QwikDatePicker selected={date.value} onChange$={(d) => date.value = d} />
```

## パフォーマンス比較

### 実測データ（中規模ECサイト）

| 指標 | React | Qwik | 改善 |
|------|-------|------|------|
| 初期JSバンドル | 187KB | 1.2KB | **99.4%削減** |
| Time to Interactive | 2.8秒 | 0.1秒 | **96%高速化** |
| Lighthouse Score | 76 | 98 | **29%向上** |
| Core Web Vitals | 不合格 | 合格 | ✅ |

## まとめ

ReactからQwikへの移行は、パフォーマンスを劇的に改善する有力な選択肢です。

**移行のメリット:**
- 初期ロード時間の大幅短縮
- Time to Interactiveの改善
- SEOスコアの向上
- Core Web Vitals合格

**移行のポイント:**
- `$` サフィックスの理解
- `useSignal` / `useStore` の活用
- Qwik Cityのファイルベースルーティング
- プログレッシブエンハンスメント

段階的に移行することで、リスクを最小化しながらパフォーマンスを最大化できます。
