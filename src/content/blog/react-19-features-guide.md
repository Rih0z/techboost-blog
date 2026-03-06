---
title: 'React 19の新機能完全ガイド - 2026年版実践解説'
description: 'React 19で追加された革新的な機能を徹底解説。Actions、use API、Server Components、Asset Loadingなど、最新機能を実例付きで紹介します。React・React19・Frontendに関する実践情報。'
pubDate: '2026-02-05'
tags: ['React', 'React19', 'Frontend', 'JavaScript', 'Web Development']
---
2024年12月にリリースされたReact 19は、フロントエンド開発に革命をもたらしました。2026年現在、多くのプロジェクトがReact 19に移行し、その恩恵を享受しています。本記事では、React 19の新機能を実践的に解説します。

## React 19の主要新機能

### 1. Actions - フォーム処理の革新

React 19最大の目玉機能が**Actions**です。非同期処理を伴うフォーム処理が劇的にシンプルになりました。

#### 従来の書き方（React 18）

```tsx
function SignupForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      await signupUser(formData)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" required />
      <button disabled={pending}>
        {pending ? 'Submitting...' : 'Sign up'}
      </button>
      {error && <p>{error}</p>}
    </form>
  )
}
```

#### React 19の新しい書き方

```tsx
import { useActionState } from 'react'

async function signupAction(prevState: any, formData: FormData) {
  const email = formData.get('email')

  try {
    await signupUser(email)
    return { success: true }
  } catch (error) {
    return { error: error.message }
  }
}

function SignupForm() {
  const [state, submitAction, isPending] = useActionState(signupAction, null)

  return (
    <form action={submitAction}>
      <input name="email" required />
      <button disabled={isPending}>
        {isPending ? 'Submitting...' : 'Sign up'}
      </button>
      {state?.error && <p>{state.error}</p>}
    </form>
  )
}
```

**メリット**:
- ボイラープレートが大幅削減
- ペンディング状態が自動管理
- フォームのネイティブ動作を活用
- 楽観的更新が簡単に実装可能

#### useOptimistic - 楽観的更新

```tsx
import { useOptimistic } from 'react'

function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, newTodo]
  )

  async function addTodo(formData: FormData) {
    const title = formData.get('title') as string
    const tempTodo = { id: crypto.randomUUID(), title, completed: false }

    // UIを即座に更新（楽観的更新）
    addOptimisticTodo(tempTodo)

    // サーバーに送信
    await createTodo(title)
  }

  return (
    <>
      <form action={addTodo}>
        <input name="title" required />
        <button>Add Todo</button>
      </form>

      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id} style={{ opacity: todo.id.startsWith('temp') ? 0.5 : 1 }}>
            {todo.title}
          </li>
        ))}
      </ul>
    </>
  )
}
```

### 2. use API - 柔軟なデータフェッチ

`use` APIは、Promiseやコンテキストを条件付きで読み取れる画期的なHookです。

#### Promiseを読み取る

```tsx
import { use, Suspense } from 'react'

// データフェッチ関数
async function fetchUser(id: string) {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  // Promiseを直接読み取る
  const user = use(userPromise)

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}

function App() {
  const userPromise = fetchUser('123')

  return (
    <Suspense fallback={<Skeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  )
}
```

#### 条件付きでコンテキストを読み取る

```tsx
import { use, createContext } from 'react'

const ThemeContext = createContext<'light' | 'dark'>('light')

function Button({ primary }: { primary?: boolean }) {
  // 条件付きでコンテキストを使える！
  const theme = primary ? use(ThemeContext) : 'light'

  return <button className={theme}>{/* ... */}</button>
}
```

**従来のHooksとの違い**:
- `use`は条件分岐の中で呼べる
- `use`はループの中で呼べる
- `use`はイベントハンドラでも呼べる

### 3. useFormStatus - フォーム状態の共有

親フォームのペンディング状態を子コンポーネントで取得できます。

```tsx
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  )
}

function Form() {
  async function submitAction(formData: FormData) {
    await saveData(formData)
  }

  return (
    <form action={submitAction}>
      <input name="title" />
      <SubmitButton />  {/* 親フォームの状態を取得 */}
    </form>
  )
}
```

### 4. ref as prop - ref渡しがシンプルに

`forwardRef`が不要になりました。

#### React 18

```tsx
import { forwardRef } from 'react'

const Input = forwardRef<HTMLInputElement, Props>((props, ref) => {
  return <input ref={ref} {...props} />
})
```

#### React 19

```tsx
function Input({ ref, ...props }: Props & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />
}

// または型推論を活用
function Input(props: Props) {
  return <input {...props} />
}
```

**メリット**:
- コードがシンプルに
- TypeScript型定義が楽に
- `forwardRef`のネストが不要

### 5. ref cleanup function - メモリリーク防止

refに渡すコールバックからクリーンアップ関数を返せます。

```tsx
function VideoPlayer() {
  return (
    <video
      ref={(node) => {
        if (node) {
          const player = new VideoJS(node)
          // クリーンアップ関数を返す
          return () => {
            player.dispose()
          }
        }
      }}
    />
  )
}
```

### 6. Context as Provider - シンプルなContext

`Context.Provider`の代わりに`Context`をそのまま使えます。

#### React 18

```tsx
const ThemeContext = createContext('light')

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Page />
    </ThemeContext.Provider>
  )
}
```

#### React 19

```tsx
const ThemeContext = createContext('light')

function App() {
  return (
    <ThemeContext value="dark">
      <Page />
    </ThemeContext>
  )
}
```

### 7. Document Metadata - メタデータをコンポーネントで管理

`<title>`、`<meta>`タグをコンポーネント内で直接書けます。

```tsx
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      {/* メタデータをコンポーネント内で定義 */}
      <title>{post.title} - My Blog</title>
      <meta name="description" content={post.excerpt} />
      <meta property="og:title" content={post.title} />
      <meta property="og:image" content={post.coverImage} />

      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  )
}
```

React 19が自動的に`<head>`に移動してくれます。react-helmetやNext.jsのHeadコンポーネントが不要に！

### 8. Stylesheet Priority - スタイル読み込み順序制御

```tsx
function ComponentA() {
  return (
    <>
      <link rel="stylesheet" href="/styles/base.css" precedence="default" />
      <div className="content">A</div>
    </>
  )
}

function ComponentB() {
  return (
    <>
      <link rel="stylesheet" href="/styles/theme.css" precedence="high" />
      <div className="content">B</div>
    </>
  )
}
```

`precedence`属性でスタイルシートの優先度を制御できます。

### 9. Async Scripts - 重複排除

```tsx
function MyComponent() {
  return (
    <div>
      <script async src="https://example.com/script.js" />
    </div>
  )
}
```

同じスクリプトを複数コンポーネントで読み込んでも、React 19が自動的に重複を排除してくれます。

### 10. Preloading Resources - リソース事前読み込み

```tsx
import { prefetchDNS, preconnect, preload, preinit } from 'react-dom'

function App() {
  // DNS事前解決
  prefetchDNS('https://api.example.com')

  // コネクション事前確立
  preconnect('https://cdn.example.com')

  // リソース事前読み込み
  preload('/fonts/custom-font.woff2', { as: 'font' })

  // スクリプト事前初期化
  preinit('/scripts/analytics.js', { as: 'script' })

  return <div>{/* ... */}</div>
}
```

## Server Components（実験的機能）

React 19はServer Componentsを正式サポート（Next.js App Router等で利用可能）。

### Server Component

```tsx
// app/posts/[id]/page.tsx (Next.js)
async function BlogPost({ params }: { params: { id: string } }) {
  // サーバーで直接DBアクセス
  const post = await db.posts.findUnique({ where: { id: params.id } })

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      <Comments postId={post.id} />  {/* Client Component */}
    </article>
  )
}
```

### Client Component

```tsx
'use client'

import { useState } from 'react'

function Comments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([])

  // クライアント側でインタラクション
  return <div>{/* ... */}</div>
}
```

## 破壊的変更と移行ガイド

### 1. React DOM APIs

#### hydrate → hydrateRoot

```tsx
// React 18
import { hydrate } from 'react-dom'
hydrate(<App />, document.getElementById('root'))

// React 19
import { hydrateRoot } from 'react-dom/client'
hydrateRoot(document.getElementById('root')!, <App />)
```

#### unmountComponentAtNode → root.unmount

```tsx
// React 18
import { unmountComponentAtNode } from 'react-dom'
unmountComponentAtNode(container)

// React 19
root.unmount()
```

### 2. TypeScript変更

#### JSX Namespace

```tsx
// React 18
declare namespace JSX {
  interface IntrinsicElements {
    'my-element': any
  }
}

// React 19
declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      'my-element': any
    }
  }
}
```

### 3. 削除されたAPI

- `defaultProps`（関数コンポーネント）→ デフォルト引数を使用
- `propTypes` → TypeScriptを使用
- Legacy Context → `createContext`を使用

## パフォーマンス改善

### 1. Automatic Batching強化

```tsx
function handleClick() {
  // React 19では全て自動バッチング
  setState1(v1)
  setState2(v2)
  setState3(v3)
  // → 1回のレンダリングで完了
}
```

### 2. Compiler（React Forget）

React 19には新しいコンパイラが組み込まれており、自動メモ化を実現（オプトイン）。

```tsx
// 従来
const MemoizedComponent = memo(function MyComponent({ data }) {
  const processed = useMemo(() => expensiveOperation(data), [data])
  const handleClick = useCallback(() => {}, [])

  return <div>{processed}</div>
})

// React Compiler有効化後
function MyComponent({ data }) {
  // 自動的にメモ化される！
  const processed = expensiveOperation(data)
  const handleClick = () => {}

  return <div>{processed}</div>
}
```

## 実践的な移行戦略

### ステップ1: 依存パッケージ更新

```bash
npm install react@19 react-dom@19

# TypeScript型定義
npm install -D @types/react@19 @types/react-dom@19
```

### ステップ2: React Router等の更新

```bash
npm install react-router-dom@latest
npm install @tanstack/react-query@latest
```

### ステップ3: 段階的移行

1. まず動作確認（破壊的変更が少ないため、ほとんど動く）
2. 新機能を段階的に導入
3. `use`、Actions等を活用してコード簡素化
4. パフォーマンス測定

### ステップ4: ESLint設定更新

```bash
npm install -D eslint-plugin-react-hooks@latest
```

```json
// .eslintrc.json
{
  "rules": {
    "react/jsx-no-target-blank": ["error", { "allowReferrer": true }],
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

## まとめ

React 19は以下の点で革新的です:

**DXの向上**:
- フォーム処理が劇的にシンプルに（Actions）
- `forwardRef`不要、refがpropに
- Contextの書き方がシンプルに

**パフォーマンス**:
- 自動バッチング強化
- React Compilerによる自動最適化
- Asset Loading最適化

**新機能**:
- `use` APIで柔軟なデータ読み取り
- Document Metadata管理
- Server Components正式サポート

**移行の容易さ**:
- 破壊的変更が少ない
- 段階的移行が可能
- 既存コードのほとんどがそのまま動く

2026年現在、React 19は成熟し、本番環境で広く使われています。まだReact 18の方は、ぜひアップグレードを検討してみてください。

**参考リンク**:
- [React 19 公式ドキュメント](https://react.dev/)
- [React 19 リリースノート](https://react.dev/blog/2024/12/05/react-19)
- [React Compiler](https://react.dev/learn/react-compiler)
