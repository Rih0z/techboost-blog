---
title: 'React 19新機能完全ガイド｜useアクション・Server Components・新Hooks徹底解説'
description: 'React 19の新機能を網羅的に解説。useアクション、Server Components正式対応、useOptimistic、useFormStatus、use()フック、ref改善など、実践コードとともに徹底ガイド。'
pubDate: '2026-03-05'
tags: ['React', 'JavaScript', 'フロントエンド', 'Web開発', 'TypeScript']
heroImage: '../../assets/thumbnails/react-19-new-features-complete-guide.jpg'
---

## React 19で何が変わったのか

React 19に移行して最も衝撃を受けたのは、`forwardRef`が不要になったことです。何百回と書いてきたボイラープレートが消えました。`ref`を普通のpropsとして渡せるだけで、コンポーネントの設計が驚くほどシンプルになります。

もう一つ、`useOptimistic`の登場でローディングスピナーの出番が激減しました。「いいね」ボタンを押した瞬間にUIが更新され、裏でAPIコールが走る — この当たり前のUXがReactの標準パターンになったのは大きな進歩です。

React 18で実験的だった多くの機能が**正式に安定版**となり、Reactアプリの設計パターンが根本的に変わります。

### React 19の主要変更点一覧

| カテゴリ | 新機能 | インパクト |
|---------|--------|----------|
| **Actions** | `useActionState`, `useFormStatus` | フォーム処理が劇的に簡潔に |
| **データ取得** | `use()` Hook | Promise/Contextの新しい読み方 |
| **楽観的更新** | `useOptimistic` | UX向上のための標準パターン |
| **Server Components** | RSC正式対応 | サーバー/クライアント分離 |
| **ref改善** | `ref`がpropsとして渡せる | forwardRef不要に |
| **メタデータ** | `<title>`, `<meta>`のネイティブサポート | react-helmet不要に |
| **スタイルシート** | `<link rel="stylesheet">`の優先度制御 | CSS読み込み順の管理 |

---

## Actions：フォーム処理の革命

### 従来のフォーム処理

React 18以前では、フォームの送信処理に多くのボイラープレートが必要でした：

```tsx
// React 18以前の典型的なフォーム
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <input value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button disabled={isPending}>
        {isPending ? '送信中...' : 'ログイン'}
      </button>
    </form>
  );
}
```

### React 19のActions

```tsx
// React 19のAction
function LoginForm() {
  const [state, submitAction, isPending] = useActionState(
    async (prevState: State, formData: FormData) => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      try {
        await login(email, password);
        return { error: null, success: true };
      } catch (err) {
        return { error: err.message, success: false };
      }
    },
    { error: null, success: false }
  );

  return (
    <form action={submitAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {state.error && <p className="error">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending}>
      {pending ? '送信中...' : 'ログイン'}
    </button>
  );
}
```

**変わったポイント**：
- `useState` × 3 → `useActionState` 1つに集約
- `e.preventDefault()` が不要
- `isPending` の管理が自動化
- `FormData`を直接受け取れる

---

## useActionState：状態管理付きアクション

`useActionState`は、アクションの結果を状態として管理するHookです。

```tsx
const [state, action, isPending] = useActionState(
  async (previousState, formData) => {
    // アクションの処理
    return newState;
  },
  initialState
);
```

### 実践例：TODOアプリ

```tsx
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  error: string | null;
}

function TodoApp() {
  const [state, addTodo, isPending] = useActionState(
    async (prev: TodoState, formData: FormData) => {
      const text = formData.get('text') as string;
      if (!text.trim()) {
        return { ...prev, error: 'タスクを入力してください' };
      }

      try {
        const newTodo = await createTodo(text);
        return {
          todos: [...prev.todos, newTodo],
          error: null,
        };
      } catch (e) {
        return { ...prev, error: '追加に失敗しました' };
      }
    },
    { todos: [], error: null }
  );

  return (
    <div>
      <form action={addTodo}>
        <input name="text" placeholder="新しいタスク" />
        <button disabled={isPending}>
          {isPending ? '追加中...' : '追加'}
        </button>
      </form>
      {state.error && <p className="error">{state.error}</p>}
      <ul>
        {state.todos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## useOptimistic：楽観的UI更新

`useOptimistic`は、サーバーの応答を待たずに**即座にUIを更新**するためのHookです。

```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (currentTodos, newTodoText: string) => [
      ...currentTodos,
      {
        id: 'temp-' + Date.now(),
        text: newTodoText,
        completed: false,
        sending: true, // 送信中フラグ
      },
    ]
  );

  async function handleAddTodo(formData: FormData) {
    const text = formData.get('text') as string;
    addOptimisticTodo(text); // 即座にUIに反映
    await createTodoOnServer(text); // サーバーに保存
  }

  return (
    <div>
      <form action={handleAddTodo}>
        <input name="text" />
        <button>追加</button>
      </form>
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id} style={{ opacity: todo.sending ? 0.5 : 1 }}>
            {todo.text}
            {todo.sending && ' (保存中...)'}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### useOptimisticの動作フロー

```
1. ユーザーがフォーム送信
2. addOptimisticTodo() → UIが即座に更新（opacity: 0.5）
3. サーバーにリクエスト送信
4. サーバー応答後、実際のデータで再レンダリング（opacity: 1）
5. エラーの場合は楽観的更新がロールバック
```

---

## use() Hook：Promise と Context の新しい読み方

### Promiseの読み取り

`use()`はPromiseを直接読み取れるHookです。Suspenseと組み合わせて使います。

```tsx
import { use, Suspense } from 'react';

// データ取得関数（Promiseを返す）
function fetchUser(id: string): Promise<User> {
  return fetch(`/api/users/${id}`).then(r => r.json());
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // Promiseを直接読み取り

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

function App() {
  const userPromise = fetchUser('123'); // レンダリング時にPromise作成

  return (
    <Suspense fallback={<p>読み込み中...</p>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

### Contextの条件付き読み取り

`use()`は条件分岐内でも使える唯一のHookです：

```tsx
function ThemeButton({ showTheme }: { showTheme: boolean }) {
  // 通常のuseContextは条件分岐内で使えないが、use()は使える
  if (showTheme) {
    const theme = use(ThemeContext);
    return <button className={theme}>テーマボタン</button>;
  }
  return <button>通常ボタン</button>;
}
```

---

## refがpropsとして渡せるように

### React 18以前：forwardRefが必要

```tsx
// React 18 - forwardRefが必要
const FancyInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
  return <input ref={ref} className="fancy" {...props} />;
});
```

### React 19：refは通常のprop

```tsx
// React 19 - refは通常のpropsとして受け取れる
function FancyInput({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} className="fancy" {...props} />;
}

// 使用側
function Form() {
  const inputRef = useRef<HTMLInputElement>(null);
  return <FancyInput ref={inputRef} placeholder="入力" />;
}
```

`forwardRef`は非推奨となり、将来のバージョンで削除される予定です。

---

## ドキュメントメタデータのネイティブサポート

React 19では、`<title>`、`<meta>`、`<link>`タグをコンポーネント内で直接レンダリングでき、自動的に`<head>`に配置されます。

```tsx
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      {/* これらは自動的に<head>に移動される */}
      <title>{post.title} | TechBlog</title>
      <meta name="description" content={post.excerpt} />
      <meta property="og:title" content={post.title} />
      <link rel="canonical" href={`https://example.com/posts/${post.slug}`} />

      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

これにより、`react-helmet`や`next/head`に依存する必要がなくなります。

---

## スタイルシートの優先度制御

```tsx
function Component() {
  return (
    <>
      {/* precedenceでCSS読み込み順を制御 */}
      <link rel="stylesheet" href="/base.css" precedence="default" />
      <link rel="stylesheet" href="/theme.css" precedence="high" />
      <link rel="stylesheet" href="/component.css" precedence="default" />

      <div className="component">コンテンツ</div>
    </>
  );
}
```

`precedence`属性により、CSSの読み込み順序をReactが最適化します。

---

## Server Components（RSC）

React 19でServer Componentsが正式に安定版になりました。

### Server Componentの基本

```tsx
// app/page.tsx - Server Component（デフォルト）
async function BlogPage() {
  // サーバーで直接DBアクセス可能
  const posts = await db.query('SELECT * FROM posts ORDER BY created_at DESC');

  return (
    <div>
      <h1>ブログ記事一覧</h1>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      {/* Client Componentを含めることも可能 */}
      <SearchFilter />
    </div>
  );
}
```

```tsx
// components/SearchFilter.tsx - Client Component
'use client';

import { useState } from 'react';

export function SearchFilter() {
  const [query, setQuery] = useState('');

  return (
    <input
      value={query}
      onChange={e => setQuery(e.target.value)}
      placeholder="記事を検索..."
    />
  );
}
```

### Server ComponentとClient Componentの使い分け

| 用途 | Server Component | Client Component |
|------|-----------------|-----------------|
| データ取得 | ✅ 直接DB/APIアクセス | ❌ useEffectやSWR経由 |
| 状態管理 | ❌ useState不可 | ✅ useState/useReducer |
| イベントハンドラ | ❌ onClick不可 | ✅ onClick等すべて |
| ブラウザAPI | ❌ window/document不可 | ✅ 利用可能 |
| バンドルサイズ | ✅ クライアントに送信されない | ❌ バンドルに含まれる |
| SEO | ✅ 完全なSSR | △ ハイドレーション必要 |

---

## Server Actions

Server Actionsは、クライアントから直接サーバーの関数を呼び出す仕組みです。

```tsx
// app/actions.ts
'use server';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  // サーバーで直接DB操作
  const post = await db.insert('posts', { title, content });

  // キャッシュの再検証
  revalidatePath('/blog');

  return { success: true, id: post.id };
}
```

```tsx
// app/new-post/page.tsx
import { createPost } from '../actions';

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="タイトル" required />
      <textarea name="content" placeholder="内容" required />
      <button type="submit">投稿する</button>
    </form>
  );
}
```

---

## React 19へのアップグレード手順

### 1. 依存関係の更新

```bash
npm install react@19 react-dom@19
npm install -D @types/react@19 @types/react-dom@19
```

### 2. 主な破壊的変更への対応

| 変更点 | 対応 |
|--------|------|
| `forwardRef` 非推奨 | refをpropsとして受け取る |
| `React.createContext` のdefaultValue | 型がより厳密に |
| `useRef` に引数が必須 | `useRef<T>(null)` に統一 |
| `ReactDOM.render` 削除 | `createRoot` を使用 |
| `string refs` 削除 | callback ref or useRef を使用 |

### 3. Codemods（自動変換）

```bash
npx @react-codemod/v19 ./src
```

---

## まとめ

React 19の主要な改善点：

- **Actions** → フォーム処理のボイラープレートが激減
- **useOptimistic** → 楽観的UIが標準パターンに
- **use()** → データ取得がより宣言的に
- **ref改善** → forwardRefが不要に
- **メタデータ** → react-helmet不要に
- **RSC正式対応** → パフォーマンスとSEOの向上

React 19は「書くコードが減り、パフォーマンスが上がる」アップデートです。特にActionsとServer Componentsの組み合わせは、フルスタックReactアプリの開発体験を大きく変えるでしょう。
