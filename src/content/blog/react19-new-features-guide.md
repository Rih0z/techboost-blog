---
title: 'React 19完全ガイド：新機能と変更点を徹底解説'
description: 'React 19の全新機能を徹底解説。Server Actions・use()フック・新しいフォームAPI・Document Metadata・Asset Loading・Improved Error Handling・Compiler（React Forget）まで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

React 19は、2024年12月にリリースされたReactの最新メジャーバージョンである。このバージョンは、Reactが長年積み重ねてきた設計哲学を再定義し、開発者体験（DX）とアプリケーションパフォーマンスの両面で大きな進化をもたらした。本記事では、React 19のすべての新機能を実践的なコード例とともに徹底解説する。

---

## React 19の概要とリリース背景

### なぜReact 19が必要だったのか

React 18でConcurrent Renderingが導入されてから、フロントエンド開発のパラダイムは大きく変化した。しかし、Server ComponentsやSuspenseを活用した開発では、ボイラープレートコードが増加し、データフェッチや状態管理のパターンが複雑になるという課題があった。

React 19はこれらの課題を根本から解決するために設計されている。主要な目標は以下の3点だ。

1. サーバーとクライアントの境界をシームレスに扱うためのAPIの統一
2. 非同期処理とフォーム操作のためのファーストクラスサポート
3. 自動メモ化による不要な再レンダリングの排除

### React 19の主要変更点一覧

React 19で追加・変更された主要な機能は以下のとおりだ。

- Server Actions（フォーム送信とデータ変更の統合）
- `use()` フック（Promiseとコンテキストの直接利用）
- 新しいフォームAPI（`action`属性・`useFormStatus`・`useFormState` → `useActionState`）
- `useOptimistic`（楽観的更新）
- Document Metadata（`<title>`・`<meta>`・`<link>`のJSX内直接記述）
- Asset Loading（スタイル・スクリプト・フォントのプリロードAPI）
- Improved Error Handling（エラーレポートの改善）
- React Compiler（旧称: React Forget）
- Ref as Prop（`forwardRef`が不要に）
- Context as Provider（`.Provider`が不要に）

---

## Server Actions

### Server Actionsとは何か

Server Actionsは、クライアントコンポーネントからサーバー側の関数を直接呼び出せる仕組みだ。これにより、APIエンドポイントを別途作成することなく、フォームの送信やデータの変更をシームレスに実装できる。

React 19以前は、フォームの送信処理を実装するために以下のような手順が必要だった。

```jsx
// React 18以前のアプローチ
// 1. APIルートを作成（例: /api/submit-form）
// app/api/submit-form/route.ts
export async function POST(request: Request) {
  const data = await request.json();
  await saveToDatabase(data);
  return Response.json({ success: true });
}

// 2. クライアントコンポーネントでfetchを使ってAPIを呼び出す
// components/ContactForm.tsx
'use client';

import { useState } from 'react';

export function ContactForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData)),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('送信に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="message" type="text" />
      <button type="submit" disabled={isLoading}>
        {isLoading ? '送信中...' : '送信'}
      </button>
      {error && <p>{error}</p>}
    </form>
  );
}
```

### React 19のServer Actionsによるシンプル化

React 19では、Server Actionsを使うことでこの処理が劇的にシンプルになる。

```jsx
// React 19のServer Actionsアプローチ
// actions/contact.ts
'use server';

export async function submitContactForm(formData: FormData) {
  const message = formData.get('message') as string;

  if (!message || message.trim() === '') {
    throw new Error('メッセージを入力してください');
  }

  await saveToDatabase({ message });
  return { success: true, message: '送信が完了しました' };
}

// components/ContactForm.tsx
// 'use client'ディレクティブ不要
import { submitContactForm } from '../actions/contact';

export function ContactForm() {
  return (
    <form action={submitContactForm}>
      <input name="message" type="text" placeholder="メッセージを入力" />
      <button type="submit">送信</button>
    </form>
  );
}
```

### Server Actionsのエラーハンドリング

Server Actionsでエラーが発生した場合、React 19はそれを適切に処理する仕組みを提供している。

```jsx
'use server';

import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  // バリデーション
  if (!title) {
    return { error: 'タイトルは必須です' };
  }

  if (!content || content.length < 10) {
    return { error: '本文は10文字以上で入力してください' };
  }

  try {
    const post = await db.post.create({
      data: { title, content },
    });
    redirect(`/posts/${post.id}`);
  } catch (error) {
    return { error: 'データベースへの保存に失敗しました' };
  }
}
```

### Server Actionsでのデータ再検証

Next.js 15との組み合わせでは、`revalidatePath`や`revalidateTag`を使ってキャッシュを無効化できる。

```jsx
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function deletePost(postId: string) {
  await db.post.delete({ where: { id: postId } });

  // 特定のパスのキャッシュを無効化
  revalidatePath('/posts');

  // タグに紐づくキャッシュを無効化
  revalidateTag('posts');
}
```

---

## use()フック

### use()フックの概要

`use()`は、React 19で追加された新しいフックだ。これは通常のフックと異なり、条件分岐やループの中でも呼び出せるという革新的な特性を持っている。

`use()`が受け付けるのは以下の2種類のリソースだ。

1. Promise（非同期データ）
2. Contextオブジェクト

### Promiseのアンラップ

従来のReactでは、非同期データを扱うために`useEffect`と`useState`の組み合わせが必要だった。

```jsx
// React 18以前：useEffectとuseStateによるデータフェッチ
'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, [userId]);

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;
  if (!user) return null;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

React 19では`use()`フックとSuspenseを使うことで、これが格段にシンプルになる。

```jsx
// React 19：use()フックによるデータフェッチ
import { use, Suspense } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(userId: number): Promise<User> {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error('ユーザーの取得に失敗しました');
  return res.json();
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  // use()でPromiseを直接アンラップできる
  const user = use(userPromise);

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

function UserPage({ userId }: { userId: number }) {
  const userPromise = fetchUser(userId);

  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

### 条件分岐内でのuse()

`use()`の最大の特徴は、通常のフックと異なり条件分岐の中で呼び出せることだ。

```jsx
import { use } from 'react';

function ConditionalDataDisplay({
  showDetails,
  detailsPromise,
}: {
  showDetails: boolean;
  detailsPromise: Promise<DetailData>;
}) {
  // 条件分岐の中でuse()を呼び出せる
  // 通常のフック（useStateなど）ではこれは禁止されている
  if (showDetails) {
    const details = use(detailsPromise);
    return <DetailView data={details} />;
  }

  return <SummaryView />;
}
```

### ContextのためのuseContext代替

`use()`はContextの読み取りにも使用できる。これにより、`useContext`の代替として機能する。

```jsx
import { use, createContext } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function ThemeButton() {
  // useContextの代わりにuse()を使用できる
  const themeContext = use(ThemeContext);

  if (!themeContext) {
    throw new Error('ThemeButtonはThemeProviderの内部で使用してください');
  }

  const { theme, toggleTheme } = themeContext;

  return (
    <button onClick={toggleTheme}>
      現在のテーマ: {theme === 'light' ? 'ライト' : 'ダーク'}
    </button>
  );
}
```

---

## 新しいフォームAPI

### action属性の進化

React 19では、HTMLの`<form>`要素の`action`属性がReactによって拡張された。文字列のURLだけでなく、関数を渡せるようになった。

```jsx
// 基本的なaction属性の使用方法
function SimpleForm() {
  async function handleAction(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    console.log('フォームデータ:', { name, email });
    await saveUserData({ name, email });
  }

  return (
    <form action={handleAction}>
      <label>
        名前:
        <input name="name" type="text" required />
      </label>
      <label>
        メールアドレス:
        <input name="email" type="email" required />
      </label>
      <button type="submit">登録</button>
    </form>
  );
}
```

### useFormStatus

`useFormStatus`は、親フォームの送信状態を子コンポーネントから参照できる新しいフックだ。

```jsx
import { useFormStatus } from 'react-dom';

// 送信ボタンコンポーネント（フォームの子コンポーネント）
function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? '送信中...' : '送信する'}
    </button>
  );
}

// フォームコンポーネント
function ContactForm() {
  async function submitForm(formData: FormData) {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 送信をシミュレート
    console.log('送信完了:', Object.fromEntries(formData));
  }

  return (
    <form action={submitForm}>
      <input name="subject" type="text" placeholder="件名" />
      <textarea name="body" placeholder="本文" />
      {/* SubmitButtonはuseFormStatusでpendingを取得できる */}
      <SubmitButton />
    </form>
  );
}
```

`useFormStatus`の重要な制約として、このフックは`<form>`タグの内部にある子コンポーネントからのみ呼び出す必要がある。フォームと同じコンポーネント内では使用できない。

```jsx
// 間違った使用例
function WrongForm() {
  const { pending } = useFormStatus(); // これは動作しない！

  return (
    <form action={submitForm}>
      <button disabled={pending}>送信</button>
    </form>
  );
}

// 正しい使用例
function CorrectForm() {
  return (
    <form action={submitForm}>
      <SubmitButton /> {/* useFormStatusはここ（子コンポーネント）で使用 */}
    </form>
  );
}
```

### useActionState（旧useFormState）

React 19では`useFormState`が`useActionState`に名前が変更され、機能も強化された。このフックはアクションの状態を管理するために使用する。

```jsx
import { useActionState } from 'react';

interface FormState {
  errors: {
    username?: string;
    password?: string;
  };
  message: string;
  success: boolean;
}

const initialState: FormState = {
  errors: {},
  message: '',
  success: false,
};

async function loginAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  const errors: FormState['errors'] = {};

  if (!username || username.length < 3) {
    errors.username = 'ユーザー名は3文字以上で入力してください';
  }

  if (!password || password.length < 8) {
    errors.password = 'パスワードは8文字以上で入力してください';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, message: '入力内容を確認してください', success: false };
  }

  try {
    await authenticateUser(username, password);
    return { errors: {}, message: 'ログインに成功しました', success: true };
  } catch {
    return {
      errors: {},
      message: 'ユーザー名またはパスワードが正しくありません',
      success: false,
    };
  }
}

function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="username">ユーザー名</label>
        <input id="username" name="username" type="text" />
        {state.errors.username && (
          <p style={{ color: 'red' }}>{state.errors.username}</p>
        )}
      </div>

      <div>
        <label htmlFor="password">パスワード</label>
        <input id="password" name="password" type="password" />
        {state.errors.password && (
          <p style={{ color: 'red' }}>{state.errors.password}</p>
        )}
      </div>

      {state.message && (
        <p style={{ color: state.success ? 'green' : 'red' }}>
          {state.message}
        </p>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  );
}
```

`useActionState`の第3戻り値として`isPending`が追加されたことも重要な変更点だ。これにより、`useFormStatus`を使わずともフォーム自体のコンポーネントでペンディング状態を取得できる。

---

## useOptimistic

### 楽観的更新とは

楽観的更新（Optimistic Update）とは、サーバーからの応答を待たずに、ユーザーのアクションが成功したと仮定してUIを先に更新する手法だ。これにより、ユーザーはレイテンシを感じることなくスムーズな操作感を得られる。

### React 18以前の楽観的更新

React 18以前では、楽観的更新の実装は煩雑だった。

```jsx
// React 18以前の楽観的更新
'use client';

import { useState } from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);

  async function toggleTodo(id: number) {
    // 楽観的にUIを更新
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );

    try {
      await fetch(`/api/todos/${id}/toggle`, { method: 'POST' });
    } catch {
      // エラーが発生した場合、元の状態に戻す
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      );
      alert('更新に失敗しました');
    }
  }

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

### useOptimisticによる簡素化

React 19の`useOptimistic`を使うと、楽観的更新の実装が大幅に簡素化される。

```jsx
import { useOptimistic, useTransition } from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

async function toggleTodoOnServer(id: number): Promise<void> {
  const res = await fetch(`/api/todos/${id}/toggle`, { method: 'POST' });
  if (!res.ok) throw new Error('更新に失敗しました');
}

function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [isPending, startTransition] = useTransition();

  // useOptimisticで楽観的状態を管理
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state: Todo[], toggledId: number) =>
      state.map((todo) =>
        todo.id === toggledId
          ? { ...todo, completed: !todo.completed }
          : todo
      )
  );

  async function handleToggle(id: number) {
    startTransition(async () => {
      // UIを楽観的に更新
      addOptimisticTodo(id);

      try {
        await toggleTodoOnServer(id);
        // 成功したら実際の状態を更新
        setTodos((prev) =>
          prev.map((todo) =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
          )
        );
      } catch (error) {
        // エラーが発生すると、optimisticTodosは自動的に元のtodosに戻る
        console.error(error);
      }
    });
  }

  return (
    <ul>
      {optimisticTodos.map((todo) => (
        <li key={todo.id} style={{ opacity: isPending ? 0.7 : 1 }}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => handleToggle(todo.id)}
          />
          <span
            style={{
              textDecoration: todo.completed ? 'line-through' : 'none',
            }}
          >
            {todo.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

### SNSの「いいね」機能への応用

`useOptimistic`は、SNSの「いいね」機能のような即時フィードバックが重要な場面で特に効果的だ。

```jsx
import { useOptimistic, useState } from 'react';

interface Post {
  id: string;
  title: string;
  likeCount: number;
  isLiked: boolean;
}

async function toggleLike(postId: string, currentLiked: boolean): Promise<void> {
  const endpoint = currentLiked
    ? `/api/posts/${postId}/unlike`
    : `/api/posts/${postId}/like`;

  const res = await fetch(endpoint, { method: 'POST' });
  if (!res.ok) throw new Error('いいねの更新に失敗しました');
}

function PostCard({ post }: { post: Post }) {
  const [actualPost, setActualPost] = useState(post);

  const [optimisticPost, toggleOptimisticLike] = useOptimistic(
    actualPost,
    (state: Post) => ({
      ...state,
      isLiked: !state.isLiked,
      likeCount: state.isLiked ? state.likeCount - 1 : state.likeCount + 1,
    })
  );

  async function handleLike() {
    toggleOptimisticLike(undefined);

    try {
      await toggleLike(actualPost.id, actualPost.isLiked);
      setActualPost((prev) => ({
        ...prev,
        isLiked: !prev.isLiked,
        likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
      }));
    } catch (error) {
      console.error('いいねの更新に失敗しました:', error);
    }
  }

  return (
    <article>
      <h2>{post.title}</h2>
      <button
        onClick={handleLike}
        style={{
          color: optimisticPost.isLiked ? 'red' : 'gray',
        }}
      >
        {optimisticPost.isLiked ? 'いいね済み' : 'いいね'}{' '}
        ({optimisticPost.likeCount})
      </button>
    </article>
  );
}
```

---

## Document Metadata

### 従来のDocument Metadata管理の問題点

Reactアプリケーションでは、ページごとに`<title>`タグや`<meta>`タグを動的に変更する必要がある。React 18以前では、これを実現するために`react-helmet`や`next/head`などのサードパーティライブラリやフレームワーク固有のAPIに依存していた。

```jsx
// React 18以前（next/headを使用）
import Head from 'next/head';

function BlogPost({ post }: { post: Post }) {
  return (
    <>
      <Head>
        <title>{post.title} - Tech Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.thumbnail} />
        <link rel="canonical" href={`https://example.com/posts/${post.slug}`} />
      </Head>
      <article>
        <h1>{post.title}</h1>
        <p>{post.content}</p>
      </article>
    </>
  );
}
```

### React 19のネイティブDocument Metadata

React 19では、`<title>`・`<meta>`・`<link>`タグを任意のコンポーネントの中に直接書けるようになった。Reactが自動的にこれらのタグを`<head>`要素に移動してくれる。

```jsx
// React 19：ネイティブDocument Metadata
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      {/* これらはReactによって自動的に<head>に移動される */}
      <title>{post.title} - Tech Blog</title>
      <meta name="description" content={post.excerpt} />
      <meta property="og:title" content={post.title} />
      <meta property="og:description" content={post.excerpt} />
      <meta property="og:image" content={post.thumbnail} />
      <link rel="canonical" href={`https://example.com/posts/${post.slug}`} />

      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### Server ComponentsでのDocument Metadata

Server Componentsとの組み合わせでは、SEOに重要なメタデータをサーバーサイドで直接生成できる。

```jsx
// Server Componentでのメタデータ生成
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await fetchProduct(params.id);

  return (
    <main>
      <title>{product.name} - ショッピングサイト</title>
      <meta name="description" content={product.description} />
      <meta name="keywords" content={product.tags.join(', ')} />
      <meta property="og:type" content="product" />
      <meta property="og:title" content={product.name} />
      <meta property="og:description" content={product.description} />
      <meta property="og:image" content={product.images[0]} />
      <meta property="product:price:amount" content={String(product.price)} />
      <meta property="product:price:currency" content="JPY" />

      <h1>{product.name}</h1>
      <p>{product.price.toLocaleString('ja-JP')}円</p>
      <p>{product.description}</p>
    </main>
  );
}
```

### titleTemplateの扱い

複数ページで共通のタイトル接尾辞を使用する場合のパターンも紹介する。

```jsx
// レイアウトコンポーネントでのtitleTemplate
function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* サイト全体のデフォルトメタデータ */}
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0070f3" />
      </head>
      <body>{children}</body>
    </html>
  );
}

// 個別ページでtitleを上書き
function HomePage() {
  return (
    <main>
      <title>ホーム - My App</title>
      <meta name="description" content="My Appへようこそ" />
      <h1>ようこそ</h1>
    </main>
  );
}
```

---

## Asset Loading

### Asset Loading APIとは

React 19では、スタイルシート・スクリプト・フォント・画像などのリソースをプリロードするための新しいAPIが導入された。これらのAPIを使うことで、ブラウザのリソース取得を最適化し、パフォーマンスを向上させることができる。

### preload / preinit API

```jsx
import { preload, preinit, prefetchDNS, preconnect } from 'react-dom';

function App() {
  // DNSプリフェッチ
  prefetchDNS('https://fonts.googleapis.com');

  // 接続の事前確立
  preconnect('https://cdn.example.com');

  // リソースのプリロード（ダウンロードのみ、実行はしない）
  preload('https://fonts.googleapis.com/css2?family=Noto+Sans+JP', {
    as: 'style',
  });

  preload('/hero-image.webp', { as: 'image', fetchPriority: 'high' });

  // スクリプトの初期化（ダウンロードして即実行）
  preinit('https://analytics.example.com/script.js', { as: 'script' });

  return <main>...</main>;
}
```

### スタイルシートの優先度制御

React 19では、スタイルシートの読み込み順序を`precedence`プロパティで制御できる。

```jsx
function StyledComponent() {
  return (
    <div>
      {/* precedenceで読み込み優先度を制御 */}
      <link
        rel="stylesheet"
        href="/styles/base.css"
        precedence="default"
      />
      <link
        rel="stylesheet"
        href="/styles/theme.css"
        precedence="high"
      />
      <link
        rel="stylesheet"
        href="/styles/component.css"
        precedence="medium"
      />

      <div className="styled-content">
        コンテンツ
      </div>
    </div>
  );
}
```

### 非同期スクリプトの管理

重複して読み込まれるスクリプトを自動的に排除する機能も強化された。

```jsx
// 複数のコンポーネントが同じスクリプトをロードしようとした場合、
// React 19は自動的に重複を排除する
function ComponentA() {
  return (
    <div>
      <script async src="https://cdn.example.com/analytics.js" />
      <p>コンポーネントA</p>
    </div>
  );
}

function ComponentB() {
  return (
    <div>
      {/* ComponentAと同じスクリプト - Reactが重複を自動排除 */}
      <script async src="https://cdn.example.com/analytics.js" />
      <p>コンポーネントB</p>
    </div>
  );
}
```

---

## Improved Error Handling

### React 18以前のエラーハンドリングの課題

React 18以前では、レンダリング中のエラーが発生した場合、同じエラーがコンソールに複数回表示されるという問題があった。また、Server Side Renderingとクライアントサイドのエラー処理が統一されていなかった。

### React 19のエラーハンドリング改善

React 19では、エラー処理が大幅に改善された。主な変更点は以下のとおりだ。

1. エラーの重複報告の排除
2. `onCaughtError`・`onUncaughtError`・`onRecoverableError`コールバックの導入
3. エラーの詳細情報の充実

```jsx
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!, {
  // Error Boundaryでキャッチされたエラー
  onCaughtError(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundaryでキャッチされたエラー:', error);
    console.error('コンポーネントスタック:', errorInfo.componentStack);

    // エラーモニタリングサービスへの送信
    reportErrorToMonitoring({
      type: 'caught',
      error,
      componentStack: errorInfo.componentStack,
    });
  },

  // Error Boundaryでキャッチされなかったエラー
  onUncaughtError(error: Error, errorInfo: React.ErrorInfo) {
    console.error('未処理のエラー:', error);
    console.error('コンポーネントスタック:', errorInfo.componentStack);

    reportErrorToMonitoring({
      type: 'uncaught',
      error,
      componentStack: errorInfo.componentStack,
    });
  },

  // ハイドレーションエラーなど回復可能なエラー
  onRecoverableError(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('回復可能なエラー:', error);

    reportErrorToMonitoring({
      type: 'recoverable',
      error,
      componentStack: errorInfo.componentStack,
    });
  },
});

root.render(<App />);
```

### Error Boundaryのベストプラクティス

```jsx
import { Component, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  children: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;

      if (typeof fallback === 'function') {
        return fallback(this.state.error, this.reset);
      }

      return fallback;
    }

    return this.props.children;
  }
}

// 使用例
function App() {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div>
          <h2>エラーが発生しました</h2>
          <p>{error.message}</p>
          <button onClick={reset}>再試行</button>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error(error, errorInfo);
      }}
    >
      <MainContent />
    </ErrorBoundary>
  );
}
```

### ハイドレーションエラーの改善

React 19では、サーバーサイドレンダリングとクライアントサイドのハイドレーション不一致エラーのメッセージが大幅に改善された。

```
// React 18のエラーメッセージ（不明瞭）
Warning: Text content did not match.
Server: "Hello" Client: "World"

// React 19のエラーメッセージ（詳細）
Uncaught Error: Hydration failed because the server rendered HTML didn't match the client.
As a result this tree will be regenerated on the client.
This can happen if a SSR-ed Client Component used:
- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External mutable state that changes between server and client rendering.

  <div>
+   Client
-   Server
  </div>
```

---

## React Compiler（React Forget）

### React Compilerとは

React Compiler（旧称: React Forget）は、Reactコンポーネントを自動的に最適化するコンパイラだ。これまで開発者が手動で行っていた`useMemo`・`useCallback`・`React.memo`による最適化を、コンパイラが自動的に実施する。

### 従来の手動最適化

```jsx
// React 18以前：手動でのメモ化
import { useMemo, useCallback, memo } from 'react';

interface ProductListProps {
  products: Product[];
  category: string;
  onSelect: (id: string) => void;
}

const ProductList = memo(function ProductList({
  products,
  category,
  onSelect,
}: ProductListProps) {
  // カテゴリでフィルタリング - 毎回計算を避けるためuseMemoを使用
  const filteredProducts = useMemo(
    () => products.filter((p) => p.category === category),
    [products, category]
  );

  // 関数の再生成を避けるためuseCallbackを使用
  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
    },
    [onSelect]
  );

  return (
    <ul>
      {filteredProducts.map((product) => (
        <ProductItem
          key={product.id}
          product={product}
          onSelect={handleSelect}
        />
      ))}
    </ul>
  );
});
```

### React Compilerによる自動最適化

React Compilerを使うと、上記のコードは以下のようにシンプルに書ける。コンパイラが自動的に必要なメモ化を追加する。

```jsx
// React 19 + React Compiler：自動最適化
interface ProductListProps {
  products: Product[];
  category: string;
  onSelect: (id: string) => void;
}

// memo, useMemo, useCallbackが不要になる
function ProductList({ products, category, onSelect }: ProductListProps) {
  const filteredProducts = products.filter((p) => p.category === category);

  function handleSelect(id: string) {
    onSelect(id);
  }

  return (
    <ul>
      {filteredProducts.map((product) => (
        <ProductItem
          key={product.id}
          product={product}
          onSelect={handleSelect}
        />
      ))}
    </ul>
  );
}
```

コンパイラはこのコードを自動的に以下のような最適化されたコードに変換する。

### React Compilerのセットアップ

Next.js 15でReact Compilerを有効にするには、以下の設定を追加する。

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};

module.exports = nextConfig;
```

Vite環境では、Babelプラグインを使用する。

```bash
npm install babel-plugin-react-compiler
```

```js
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {}],
        ],
      },
    }),
  ],
});
```

### React Compilerの制約と注意点

React Compilerが正しく機能するためには、Reactのルールに従ったコードを書く必要がある。

```jsx
// コンパイラが最適化できないパターン（Reactのルール違反）

// NG: レンダリング中に外部の変数を変更する
let globalCount = 0;

function Counter() {
  globalCount++; // 副作用 - コンパイラはこれを最適化できない
  return <div>{globalCount}</div>;
}

// NG: Propsを直接変更する
function BadComponent({ items }: { items: string[] }) {
  items.push('new item'); // Propsのミューテーション
  return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

// OK: 正しいパターン
function GoodComponent({ items }: { items: string[] }) {
  const newItems = [...items, 'new item']; // コピーを作成
  return <ul>{newItems.map((item) => <li key={item}>{item}</li>)}</ul>;
}
```

---

## Ref as Prop

### forwardRefが不要になった

React 18以前では、関数コンポーネントに`ref`を渡すためには`forwardRef`でラップする必要があった。React 19では、`ref`が通常のpropsとして渡せるようになった。

```jsx
// React 18以前：forwardRefが必要
import { forwardRef, useRef } from 'react';

interface InputProps {
  label: string;
  placeholder?: string;
}

// forwardRefでラップする必要があった
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, placeholder },
  ref
) {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} placeholder={placeholder} />
    </div>
  );
});

// 使用例
function Form() {
  const inputRef = useRef<HTMLInputElement>(null);

  function focusInput() {
    inputRef.current?.focus();
  }

  return (
    <div>
      <Input ref={inputRef} label="名前" placeholder="名前を入力" />
      <button onClick={focusInput}>フォーカス</button>
    </div>
  );
}
```

```jsx
// React 19：refが通常のpropsとして渡せる
import { useRef } from 'react';

interface InputProps {
  label: string;
  placeholder?: string;
  ref?: React.Ref<HTMLInputElement>; // refを通常のpropsとして定義
}

// forwardRefが不要になった
function Input({ label, placeholder, ref }: InputProps) {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} placeholder={placeholder} />
    </div>
  );
}

// 使用例
function Form() {
  const inputRef = useRef<HTMLInputElement>(null);

  function focusInput() {
    inputRef.current?.focus();
  }

  return (
    <div>
      <Input ref={inputRef} label="名前" placeholder="名前を入力" />
      <button onClick={focusInput}>フォーカス</button>
    </div>
  );
}
```

### refのクリーンアップ関数

React 19では、`ref`コールバックからクリーンアップ関数を返せるようになった。

```jsx
function VideoPlayer({ src }: { src: string }) {
  return (
    <video
      ref={(node) => {
        if (node) {
          // マウント時の処理
          const player = initializePlayer(node, src);

          // クリーンアップ関数を返す
          return () => {
            player.destroy();
          };
        }
      }}
    />
  );
}
```

---

## Context as Provider

### .Providerが不要になった

React 18以前では、Contextを提供するために`Context.Provider`コンポーネントを使用する必要があった。React 19では、Context自体をProviderとして使用できる。

```jsx
// React 18以前：Context.Providerが必要
import { createContext, useContext } from 'react';

interface AuthContextType {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (credentials: Credentials) => {
    const user = await authenticateUser(credentials);
    setUser(user);
  };

  const logout = () => {
    setUser(null);
  };

  // Context.Providerでラップする必要があった
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

```jsx
// React 19：Contextをそのまま使用できる
import { createContext, useContext } from 'react';

interface AuthContextType {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (credentials: Credentials) => {
    const user = await authenticateUser(credentials);
    setUser(user);
  };

  const logout = () => {
    setUser(null);
  };

  // .Providerが不要になった
  return (
    <AuthContext value={{ user, login, logout }}>
      {children}
    </AuthContext>
  );
}
```

### カスタムフックとの組み合わせ

```jsx
// カスタムフックでContextを安全に使用する
function useAuth() {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuthはAuthProviderの内部で使用してください');
  }
  return context;
}

// 使用例
function Header() {
  const { user, logout } = useAuth();

  return (
    <header>
      {user ? (
        <div>
          <span>ようこそ、{user.name}さん</span>
          <button onClick={logout}>ログアウト</button>
        </div>
      ) : (
        <a href="/login">ログイン</a>
      )}
    </header>
  );
}
```

---

## React 18からの移行ガイド

### 破壊的変更の確認

React 19への移行を始める前に、以下の破壊的変更を確認する必要がある。

#### 1. useFormStateからuseActionStateへの変更

```jsx
// React 18（react-dom/server）
import { experimental_useFormState as useFormState } from 'react-dom';

// React 19（react）
import { useActionState } from 'react';
```

#### 2. ReactDOM.renderの削除

```jsx
// React 17（非推奨）
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));

// React 18以降（正しい方法）
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

#### 3. defaultPropsの廃止（クラスコンポーネント以外）

```jsx
// React 18以前
function Button({ text, variant }) {
  return <button className={variant}>{text}</button>;
}
Button.defaultProps = {
  text: 'クリック',
  variant: 'primary',
};

// React 19：デフォルトパラメータを使用
function Button({ text = 'クリック', variant = 'primary' }) {
  return <button className={variant}>{text}</button>;
}
```

#### 4. レガシーContextAPIの削除

```jsx
// 廃止されたレガシーContext API（childContextTypes / contextTypes）
// これらはReact 19で完全に削除された

class OldProvider extends React.Component {
  // 削除された
  getChildContext() {
    return { theme: this.state.theme };
  }
  // 削除された
  static childContextTypes = {
    theme: PropTypes.string,
  };
}

// 代替：createContextを使用する
const ThemeContext = createContext('light');
```

### 段階的な移行戦略

大規模なアプリケーションのReact 19への移行は段階的に行うことを推奨する。

```bash
# Step 1: React 18.3に更新して廃止警告を確認
npm install react@18.3 react-dom@18.3

# Step 2: すべての廃止警告を解消する

# Step 3: React 19に更新
npm install react@19 react-dom@19

# Step 4: 型定義も更新
npm install --save-dev @types/react@19 @types/react-dom@19
```

### codemods の活用

Reactチームは、移行を自動化するためのcodemods（コード変換ツール）を提供している。

```bash
# react-codemodのインストール
npx codemod react/19/migration-recipe

# 特定の変換のみ実行
npx codemod react/19/replace-use-form-state
npx codemod react/19/remove-forward-ref
```

### TypeScript型の更新

React 19では、TypeScriptの型定義も更新された。

```tsx
// React 18以前
import { FC, VFC, ReactChild, ReactFragment, ReactPortal } from 'react';

// React 19：これらの型は廃止または変更
// FCとVFCは同一になった（childrenは自動的には含まれない）

// 古いコード
const MyComponent: FC<Props> = ({ children, ...props }) => {
  return <div>{children}</div>;
};

// 新しいコード
interface Props {
  children?: React.ReactNode; // childrenを明示的に定義
}

function MyComponent({ children }: Props) {
  return <div>{children}</div>;
}
```

---

## Next.js 15との統合

### Next.js 15の主要変更点

Next.js 15はReact 19をフルサポートしており、両者の機能を組み合わせることで強力なアプリケーションを構築できる。

### App RouterとServer Actions

```tsx
// app/actions/post.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(
  prevState: { error: string } | null,
  formData: FormData
) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const tags = formData.getAll('tag') as string[];

  if (!title || title.length < 5) {
    return { error: 'タイトルは5文字以上で入力してください' };
  }

  const post = await db.post.create({
    data: { title, content, tags },
  });

  revalidatePath('/posts');
  redirect(`/posts/${post.id}`);
}
```

```tsx
// app/posts/new/page.tsx
import { useActionState } from 'react';
import { createPost } from '../../actions/post';

export default function NewPostPage() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <div>
      <h1>新しい投稿</h1>
      <form action={formAction}>
        <div>
          <label htmlFor="title">タイトル</label>
          <input id="title" name="title" type="text" required />
        </div>

        <div>
          <label htmlFor="content">本文</label>
          <textarea id="content" name="content" required />
        </div>

        <div>
          <label>タグ</label>
          <input name="tag" type="text" placeholder="タグ1" />
          <input name="tag" type="text" placeholder="タグ2" />
        </div>

        {state?.error && (
          <p style={{ color: 'red' }}>{state.error}</p>
        )}

        <button type="submit" disabled={isPending}>
          {isPending ? '投稿中...' : '投稿する'}
        </button>
      </form>
    </div>
  );
}
```

### Parallel Routesとの組み合わせ

```tsx
// app/@modal/(.)posts/[id]/page.tsx
// インターセプトルートを使ったモーダル
import { use } from 'react';

async function fetchPost(id: string) {
  const res = await fetch(`${process.env.API_URL}/posts/${id}`);
  return res.json();
}

export default function PostModal({ params }: { params: { id: string } }) {
  const postPromise = fetchPost(params.id);
  const post = use(postPromise); // use()でSuspenseなしに非同期データを取得

  return (
    <dialog open>
      <title>{post.title}</title>
      <meta name="description" content={post.excerpt} />
      <article>
        <h1>{post.title}</h1>
        <p>{post.content}</p>
      </article>
      <form method="dialog">
        <button type="submit">閉じる</button>
      </form>
    </dialog>
  );
}
```

### Streaming SSRとSuspense

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

async function fetchStats() {
  // データベースから統計情報を取得
  return await db.getStats();
}

async function fetchRecentActivity() {
  // 最近のアクティビティを取得
  return await db.getRecentActivity();
}

async function StatsPanel() {
  const stats = await fetchStats();
  return (
    <div>
      <h2>統計情報</h2>
      <dl>
        <dt>総ユーザー数</dt>
        <dd>{stats.totalUsers.toLocaleString('ja-JP')}人</dd>
        <dt>今月の売上</dt>
        <dd>{stats.monthlyRevenue.toLocaleString('ja-JP')}円</dd>
      </dl>
    </div>
  );
}

async function RecentActivityPanel() {
  const activities = await fetchRecentActivity();
  return (
    <ul>
      {activities.map((activity) => (
        <li key={activity.id}>{activity.description}</li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  return (
    <main>
      <h1>ダッシュボード</h1>
      {/* 各パネルは独立してストリーミングされる */}
      <Suspense fallback={<div>統計情報を読み込み中...</div>}>
        <StatsPanel />
      </Suspense>
      <Suspense fallback={<div>アクティビティを読み込み中...</div>}>
        <RecentActivityPanel />
      </Suspense>
    </main>
  );
}
```

### Cacheとメモ化

Next.js 15では`cache`関数が安定化され、React 19との組み合わせでデータフェッチの効率が向上した。

```tsx
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Reactのcache: 同一リクエスト内での重複フェッチを排除
const getUser = cache(async (userId: string) => {
  return await db.user.findUnique({ where: { id: userId } });
});

// Next.jsのunstable_cache: リクエスト間のキャッシュ
const getCachedUser = unstable_cache(
  async (userId: string) => {
    return await db.user.findUnique({ where: { id: userId } });
  },
  ['user'],
  { revalidate: 3600, tags: ['users'] }
);

// 複数のコンポーネントから同じユーザーを取得しても
// データベースへのクエリは1回だけ実行される
async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId);
  return <div>{user?.name}</div>;
}

async function UserAvatar({ userId }: { userId: string }) {
  const user = await getUser(userId); // キャッシュから取得
  return <img src={user?.avatarUrl} alt={user?.name} />;
}
```

---

## パフォーマンス最適化

### Transitions APIの活用

React 18で導入された`useTransition`はReact 19でも重要な役割を果たす。重要度の低い状態更新を遅延させることで、UIの応答性を維持できる。

```jsx
import { useState, useTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(event: React.ChangeEvent<HTMLInputElement>) {
    const newQuery = event.target.value;
    setQuery(newQuery); // 即座に更新（入力フィールド）

    startTransition(async () => {
      // 重要度の低い更新をTransitionとしてマーク
      const searchResults = await performSearch(newQuery);
      setResults(searchResults);
    });
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={handleSearch}
        placeholder="検索..."
      />
      {isPending ? (
        <div>検索中...</div>
      ) : (
        <ul>
          {results.map((result) => (
            <li key={result.id}>{result.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 仮想化（Virtual List）との組み合わせ

大量のデータを扱う場合は、React 19の新機能と仮想化ライブラリを組み合わせることで最大のパフォーマンスを発揮できる。

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { use, useRef } from 'react';

async function fetchAllItems(): Promise<Item[]> {
  const res = await fetch('/api/items?limit=10000');
  return res.json();
}

function VirtualList({ itemsPromise }: { itemsPromise: Promise<Item[]> }) {
  const items = use(itemsPromise); // Promiseを直接アンラップ
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div
      ref={parentRef}
      style={{ height: '600px', overflowY: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
              height: `${virtualRow.size}px`,
            }}
          >
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Lazy Loadingとコード分割

```jsx
import { lazy, Suspense } from 'react';

// 動的インポートで重いコンポーネントを遅延ロード
const HeavyChart = lazy(() => import('./HeavyChart'));
const RichTextEditor = lazy(() => import('./RichTextEditor'));
const MapComponent = lazy(() => import('./MapComponent'));

function Dashboard() {
  return (
    <div>
      <h1>ダッシュボード</h1>

      <Suspense fallback={<div>グラフを読み込み中...</div>}>
        <HeavyChart data={chartData} />
      </Suspense>

      <Suspense fallback={<div>エディターを読み込み中...</div>}>
        <RichTextEditor content={content} />
      </Suspense>

      <Suspense fallback={<div>地図を読み込み中...</div>}>
        <MapComponent coordinates={coordinates} />
      </Suspense>
    </div>
  );
}
```

### メモリリークの防止

React 19でも非同期処理とメモリリークへの注意は重要だ。

```jsx
import { useEffect, useState } from 'react';

function DataComponent({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadData() {
      try {
        const res = await fetch(`/api/data/${id}`, {
          signal: controller.signal,
        });
        const result = await res.json();

        // クリーンアップ後に状態を更新しない
        if (!cancelled) {
          setData(result);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(error);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id]);

  return <div>{data ? data.title : '読み込み中...'}</div>;
}
```

### React DevToolsの活用

React 19に対応したReact DevTools（バージョン5以降）では、React Compilerの最適化状況を確認できる。

```
Profilerパネルで確認できる項目:
- Flamegraph: レンダリング時間の内訳
- Ranked chart: コンポーネント別レンダリング時間
- Timeline: 時系列のレンダリング記録
- Compiler最適化: Compilerによりメモ化されたコンポーネントの表示
```

---

## まとめ

### React 19のインパクト

React 19は、React史上最も重要なメジャーアップデートのひとつだ。主要な改善点を振り返ると以下のとおりだ。

| 機能 | メリット | 対象 |
|------|--------|------|
| Server Actions | API Route不要・フォーム処理の大幅簡略化 | フォーム・データ変更 |
| use()フック | 条件分岐内での非同期処理・簡潔なコード | データフェッチ・Context |
| useActionState | フォーム状態管理の標準化 | フォーム |
| useOptimistic | 楽観的更新のシンプルな実装 | UXの向上 |
| Document Metadata | サードパーティ不要のSEO対応 | SEO・メタデータ |
| Asset Loading | リソース読み込みの最適化 | パフォーマンス |
| React Compiler | 手動メモ化が不要に | パフォーマンス・DX |
| Ref as Prop | forwardRef廃止でコードがシンプルに | コンポーネント設計 |
| Context as Provider | .Provider廃止でコードがシンプルに | 状態管理 |

### 移行のタイムライン

React 19への移行は慌てて行う必要はない。以下のようなステップで進めることを推奨する。

1. **現在のアプリをReact 18.3に更新**して廃止警告をすべて解消する
2. **TypeScriptの型エラーをすべて修正**する
3. **新しいAPIを新機能開発から導入**し、既存コードは動作確認後に移行する
4. **React Compilerは最後に導入**し、手動のメモ化を段階的に削除する

### 開発ツールの重要性

React 19の新機能を最大限に活用するには、適切な開発ツールが不可欠だ。

[DevToolBox](https://usedevtools.com) は、Web開発者向けの総合ツールセットを提供している。JSON Formatter・Base64エンコーダ/デコーダ・カラーコンバーター・Regex Testerなど、日常の開発作業を効率化する40以上のツールが揃っている。React 19の開発においても、APIレスポンスの確認・フォーマット・デバッグに役立てることができる。

React 19は、Reactエコシステムの成熟を示す重要なリリースだ。Server ActionsとClient Componentsの境界を意識せずにシームレスに開発できる環境が整い、React Compilerによってパフォーマンス最適化の負担が大幅に軽減された。これらの変更を活用することで、より少ないコードで、より高いパフォーマンスのアプリケーションを構築できるようになる。

---

## 参考リソース

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React Compiler Docs](https://react.dev/learn/react-compiler)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [DevToolBox - Developer Utilities](https://usedevtools.com)

---

## スキルアップ・キャリアアップのおすすめリソース

React 19の新機能を習得し、次のキャリアステップへ進む際に役立つリソースを紹介する。

### 転職・キャリアアップ
- **[レバテックキャリア](https://levtech.jp)** — ITエンジニア専門の転職エージェント。React・Next.js案件は常に旺盛で、年収600万円以上の求人も多い。無料相談可能。
- **[Findy](https://findy-job.com)** — GitHubスキル偏差値でReactの実力をアピール。スカウト型でリモート求人が充実しており、フロントエンドエンジニアに人気のサービス。

### オンライン学習
- **[Udemy](https://www.udemy.com)** — React・Next.jsの実践コースが豊富。App RouterやServer Actionsを扱った最新コースも続々登場している。セール時は90%オフになることも。
