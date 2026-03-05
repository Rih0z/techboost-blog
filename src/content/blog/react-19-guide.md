---
title: "React 19 完全ガイド — Actions・Optimistic Updates・use() API解説"
description: "React 19の新機能を完全解説。useActionState、useOptimistic、use()API、Server Components強化、Suspense改善まで実践的なコード例とともに学べます。"
pubDate: "2026-03-04"
tags: ["React", "JavaScript", "フロントエンド", "TypeScript"]
---

## はじめに

React 19は、フォーム処理・非同期状態管理・Server Componentsを根本から改善する多くの新機能を導入しました。特に **Actions** という概念の導入により、サーバーへのデータ送信パターンが大きく簡素化されています。

本記事では、React 19の主要な新機能を実際のコードとともに解説します。

## Actions とは

React 19の中核となる概念が **Actions** です。非同期の状態変更をファーストクラスサポートし、ローディング状態・エラー処理・楽観的更新を自動で管理します。

```typescript
// React 18まで: 手動で状態管理
function OldForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData(e.currentTarget);
      await submitData(formData);
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* フォーム内容 */}
      <button disabled={loading}>{loading ? '送信中...' : '送信'}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

```typescript
// React 19: Actions で簡素化
import { useActionState } from 'react';

async function submitAction(prevState: State, formData: FormData) {
  try {
    await submitData(formData);
    return { message: '送信しました', status: 'success' };
  } catch {
    return { message: 'エラーが発生しました', status: 'error' };
  }
}

function NewForm() {
  const [state, formAction, isPending] = useActionState(submitAction, null);

  return (
    <form action={formAction}>
      {/* フォーム内容 */}
      <button type="submit" disabled={isPending}>
        {isPending ? '送信中...' : '送信'}
      </button>
      {state?.message && (
        <p className={state.status === 'error' ? 'error' : 'success'}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

## useActionState の詳細

`useActionState` は非同期アクションの状態を管理するフックです。

```typescript
import { useActionState } from 'react';

interface FormState {
  errors?: {
    name?: string[];
    email?: string[];
  };
  message?: string;
  success?: boolean;
}

async function registerUser(
  prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  // バリデーション
  const errors: FormState['errors'] = {};
  if (!name || name.length < 2) {
    errors.name = ['名前は2文字以上必要です'];
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ['有効なメールアドレスを入力してください'];
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  // サーバーへの送信
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    return { message: '登録に失敗しました' };
  }

  return { message: '登録が完了しました', success: true };
}

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerUser, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name">名前</label>
        <input id="name" name="name" type="text" required />
        {state?.errors?.name?.map((error) => (
          <p key={error} className="text-red-500 text-sm">{error}</p>
        ))}
      </div>

      <div>
        <label htmlFor="email">メールアドレス</label>
        <input id="email" name="email" type="email" required />
        {state?.errors?.email?.map((error) => (
          <p key={error} className="text-red-500 text-sm">{error}</p>
        ))}
      </div>

      {state?.message && (
        <p className={state.success ? 'text-green-500' : 'text-red-500'}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isPending ? '登録中...' : '登録する'}
      </button>
    </form>
  );
}
```

## useOptimistic — 楽観的更新

`useOptimistic` はサーバーのレスポンスを待たずにUIを先行更新し、UXを向上させます。

```typescript
'use client';

import { useOptimistic, useTransition, useState } from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

async function toggleTodoAction(id: string, completed: boolean): Promise<void> {
  await fetch(`/api/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState(initialTodos);
  const [isPending, startTransition] = useTransition();

  const [optimisticTodos, setOptimisticTodos] = useOptimistic(
    todos,
    (state: Todo[], { id, completed }: { id: string; completed: boolean }) =>
      state.map((todo) =>
        todo.id === id ? { ...todo, completed } : todo
      )
  );

  const handleToggle = (id: string, currentCompleted: boolean) => {
    startTransition(async () => {
      // UIを即座に更新（楽観的）
      setOptimisticTodos({ id, completed: !currentCompleted });

      // サーバーに送信
      await toggleTodoAction(id, !currentCompleted);

      // サーバー確認後に実際の状態を更新
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, completed: !currentCompleted } : todo
        )
      );
    });
  };

  return (
    <ul>
      {optimisticTodos.map((todo) => (
        <li key={todo.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => handleToggle(todo.id, todo.completed)}
          />
          <span className={todo.completed ? 'line-through text-gray-400' : ''}>
            {todo.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

## use() API — プロミスと Context の読み取り

`use()` はプロミスやContextを条件分岐内でも読み取れる新しいAPIです。

```typescript
import { use, Suspense } from 'react';

// プロミスを直接渡す
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// use() でプロミスを読み取る
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  // Suspenseと組み合わせてプロミスを解決
  const user = use(userPromise);

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// 親コンポーネント
function UserPage({ userId }: { userId: string }) {
  const userPromise = fetchUser(userId);

  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

```typescript
// Context を条件分岐内で読み取る
import { use, createContext } from 'react';

const ThemeContext = createContext<'light' | 'dark'>('light');

function Button({ adminOnly = false, children }: {
  adminOnly?: boolean;
  children: React.ReactNode;
}) {
  // React 18まで: フック内での条件分岐は禁止
  // React 19: use() は条件分岐内でも使える
  if (adminOnly) {
    const theme = use(ThemeContext);
    return (
      <button className={`admin-btn ${theme}`}>
        {children}
      </button>
    );
  }

  return <button>{children}</button>;
}
```

## Server Components の強化

React 19ではServer Componentsのパターンがより洗練されました。

```typescript
// app/blog/[slug]/page.tsx（Server Component）
import { notFound } from 'next/navigation';

// サーバーサイドのみで実行される
async function getBlogPost(slug: string) {
  const post = await db.post.findUnique({ where: { slug } });
  return post;
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Next.js 15: params は Promise
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <time>{post.publishedAt.toLocaleDateString('ja-JP')}</time>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

## まとめ

React 19の主要な改善点をまとめます。

- **useActionState**: フォーム送信・非同期処理の状態管理を大幅簡素化
- **useOptimistic**: サーバーレスポンス待ちなしのUI先行更新でUXが向上
- **use() API**: プロミスとContextを条件分岐内でも読み取り可能
- **Server Components強化**: サーバーとクライアントの境界がより明確に
- **Suspense改善**: ストリーミングとの連携がより自然に

React 19への移行は破壊的変更も少なく、多くのプロジェクトで段階的に採用できます。まずは `useActionState` と `useOptimistic` から試してみてください。
