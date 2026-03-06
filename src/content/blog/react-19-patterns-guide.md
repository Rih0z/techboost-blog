---
title: 'React 19実践パターン集2026'
description: 'React 19の最新機能を実践的に解説。use()フック、Server Actions、フォームアクション、Suspenseの活用方法とベストプラクティスを徹底解説。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: 'Feb 05 2026'
tags: ['React', 'JavaScript', 'Web開発', 'フロントエンド']
---
# React 19実践パターン集2026

React 19は、開発体験とパフォーマンスを大幅に向上させる革新的な機能を導入しました。本記事では、実践的なパターンとベストプラクティスを解説します。

## 目次

1. React 19の主要機能
2. use()フック
3. Server Actions
4. フォームアクション
5. Suspenseの活用
6. Optimistic UI
7. パフォーマンス最適化
8. 実践パターン
9. マイグレーションガイド

## React 19の主要機能

### 新機能一覧

```typescript
// React 19の主な新機能
// 1. use() フック - Promiseとコンテキストの読み取り
// 2. Server Actions - サーバーサイド処理の統合
// 3. フォームアクション - 宣言的なフォーム処理
// 4. useOptimistic() - 楽観的UI更新
// 5. useFormStatus() - フォーム状態の追跡
// 6. useActionState() - アクションの状態管理
// 7. ref as prop - refをpropsとして渡す
```

### セットアップ

```bash
# React 19をインストール
npm install react@^19.0.0 react-dom@^19.0.0

# TypeScript型定義
npm install --save-dev @types/react@^19.0.0 @types/react-dom@^19.0.0
```

## use()フック

### Promiseの読み取り

```typescript
import { use, Suspense } from 'react'

// データ取得関数
async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}

// use()でPromiseを読み取る
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise)

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}

// 親コンポーネント
export function UserPage({ userId }: { userId: string }) {
  const userPromise = fetchUser(userId)

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  )
}
```

### 条件付きでのuse()

```typescript
function ConditionalData({ showData }: { showData: boolean }) {
  let data = null

  if (showData) {
    // 条件付きでuse()を呼び出せる（従来のフックルールの例外）
    const dataPromise = fetchData()
    data = use(dataPromise)
  }

  return (
    <div>
      {data ? <DataDisplay data={data} /> : <EmptyState />}
    </div>
  )
}
```

### ループ内でのuse()

```typescript
function MultipleUsers({ userIds }: { userIds: string[] }) {
  return (
    <div>
      {userIds.map(id => {
        // ループ内でもuse()を使用可能
        const userPromise = fetchUser(id)
        const user = use(userPromise)

        return (
          <div key={id}>
            <h3>{user.name}</h3>
          </div>
        )
      })}
    </div>
  )
}
```

### コンテキストの読み取り

```typescript
import { use, createContext } from 'react'

const ThemeContext = createContext<'light' | 'dark'>('light')

function ThemedButton() {
  // use()でコンテキストを読み取る
  const theme = use(ThemeContext)

  return (
    <button className={theme === 'dark' ? 'dark-button' : 'light-button'}>
      Click me
    </button>
  )
}
```

## Server Actions

### 基本的なServer Action

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  // バリデーション
  if (!title || !content) {
    return { error: 'Title and content are required' }
  }

  // データベースに保存
  const post = await db.post.create({
    data: { title, content },
  })

  // キャッシュを再検証
  revalidatePath('/posts')

  return { success: true, post }
}
```

### クライアントでの使用

```typescript
'use client'

import { createPost } from './actions'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Post'}
    </button>
  )
}

export function CreatePostForm() {
  return (
    <form action={createPost}>
      <input
        type="text"
        name="title"
        placeholder="Title"
        required
      />
      <textarea
        name="content"
        placeholder="Content"
        required
      />
      <SubmitButton />
    </form>
  )
}
```

### エラーハンドリング

```typescript
'use server'

export async function updateUser(userId: string, formData: FormData) {
  try {
    const name = formData.get('name') as string

    const user = await db.user.update({
      where: { id: userId },
      data: { name },
    })

    revalidatePath(`/users/${userId}`)

    return { success: true, user }
  } catch (error) {
    console.error('Failed to update user:', error)
    return {
      success: false,
      error: 'Failed to update user'
    }
  }
}
```

### 認証付きServer Action

```typescript
'use server'

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function deletePost(postId: string) {
  // 認証チェック
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  // 権限チェック
  const post = await db.post.findUnique({
    where: { id: postId },
  })

  if (post.authorId !== session.user.id) {
    throw new Error('Unauthorized')
  }

  // 削除
  await db.post.delete({
    where: { id: postId },
  })

  revalidatePath('/posts')
  redirect('/posts')
}
```

## フォームアクション

### useActionState()の使用

```typescript
'use client'

import { useActionState } from 'react'
import { createPost } from './actions'

type FormState = {
  error?: string
  success?: boolean
  post?: Post
}

export function CreatePostForm() {
  const [state, formAction, isPending] = useActionState<FormState>(
    createPost,
    { success: false }
  )

  return (
    <form action={formAction}>
      <input
        type="text"
        name="title"
        placeholder="Title"
        required
      />
      <textarea
        name="content"
        placeholder="Content"
        required
      />

      {state.error && (
        <div className="error">{state.error}</div>
      )}

      {state.success && (
        <div className="success">Post created successfully!</div>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  )
}
```

### バリデーション

```typescript
'use server'

import { z } from 'zod'

const postSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(10),
  tags: z.array(z.string()).optional(),
})

export async function createPost(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // FormDataをオブジェクトに変換
  const rawData = {
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.getAll('tags'),
  }

  // バリデーション
  const validatedData = postSchema.safeParse(rawData)

  if (!validatedData.success) {
    return {
      error: validatedData.error.errors[0].message,
      success: false,
    }
  }

  // データ保存
  const post = await db.post.create({
    data: validatedData.data,
  })

  revalidatePath('/posts')

  return {
    success: true,
    post,
  }
}
```

### 複雑なフォーム

```typescript
'use client'

import { useActionState } from 'react'
import { updateProfile } from './actions'

export function ProfileForm({ user }: { user: User }) {
  const [state, formAction, isPending] = useActionState(
    updateProfile,
    { success: false }
  )

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={user.id} />

      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={user.name}
          required
        />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={user.email}
          required
        />
      </div>

      <div>
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={user.bio}
        />
      </div>

      <div>
        <label htmlFor="avatar">Avatar</label>
        <input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/*"
        />
      </div>

      {state.error && (
        <div className="error">{state.error}</div>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
```

## Suspenseの活用

### データフェッチングとSuspense

```typescript
import { Suspense } from 'react'

async function fetchPosts() {
  const response = await fetch('/api/posts')
  return response.json()
}

function PostList() {
  const posts = use(fetchPosts())

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
        </li>
      ))}
    </ul>
  )
}

export function PostsPage() {
  return (
    <div>
      <h1>Blog Posts</h1>
      <Suspense fallback={<PostListSkeleton />}>
        <PostList />
      </Suspense>
    </div>
  )
}
```

### ネストされたSuspense

```typescript
function UserProfile({ userId }: { userId: string }) {
  const user = use(fetchUser(userId))

  return (
    <div>
      <h2>{user.name}</h2>

      <Suspense fallback={<div>Loading posts...</div>}>
        <UserPosts userId={userId} />
      </Suspense>

      <Suspense fallback={<div>Loading followers...</div>}>
        <UserFollowers userId={userId} />
      </Suspense>
    </div>
  )
}

export function ProfilePage({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfile userId={userId} />
    </Suspense>
  )
}
```

### エラーバウンダリとの組み合わせ

```typescript
'use client'

import { Component, ReactNode, Suspense } from 'react'

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

export function DataDisplay() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        <DataComponent />
      </Suspense>
    </ErrorBoundary>
  )
}
```

## Optimistic UI

### useOptimistic()の使用

```typescript
'use client'

import { useOptimistic } from 'react'
import { addTodo } from './actions'

type Todo = {
  id: string
  text: string
  completed: boolean
}

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, newTodo]
  )

  async function handleSubmit(formData: FormData) {
    const text = formData.get('text') as string

    // 楽観的更新
    addOptimisticTodo({
      id: crypto.randomUUID(),
      text,
      completed: false,
    })

    // サーバーアクション
    await addTodo(formData)
  }

  return (
    <div>
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              readOnly
            />
            {todo.text}
          </li>
        ))}
      </ul>

      <form action={handleSubmit}>
        <input
          type="text"
          name="text"
          placeholder="Add todo"
          required
        />
        <button type="submit">Add</button>
      </form>
    </div>
  )
}
```

### いいね機能の実装

```typescript
'use client'

import { useOptimistic } from 'react'
import { toggleLike } from './actions'

type Post = {
  id: string
  title: string
  likes: number
  isLiked: boolean
}

export function Post({ post }: { post: Post }) {
  const [optimisticPost, updateOptimisticPost] = useOptimistic(
    post,
    (state, isLiked: boolean) => ({
      ...state,
      isLiked,
      likes: isLiked ? state.likes + 1 : state.likes - 1,
    })
  )

  async function handleLike() {
    const newLikedState = !optimisticPost.isLiked
    updateOptimisticPost(newLikedState)
    await toggleLike(post.id, newLikedState)
  }

  return (
    <div>
      <h2>{optimisticPost.title}</h2>
      <button onClick={handleLike}>
        {optimisticPost.isLiked ? '❤️' : '🤍'} {optimisticPost.likes}
      </button>
    </div>
  )
}
```

## パフォーマンス最適化

### React Compiler

```typescript
// React 19のコンパイラは自動的に最適化
// 手動でのuseMemo、useCallbackは不要に

function ExpensiveComponent({ data }: { data: Data[] }) {
  // 従来は useMemo が必要だった
  const processed = data.map(item => ({
    ...item,
    computed: expensiveCalculation(item),
  }))

  // 従来は useCallback が必要だった
  const handleClick = (id: string) => {
    console.log('Clicked:', id)
  }

  return (
    <div>
      {processed.map(item => (
        <Item
          key={item.id}
          data={item}
          onClick={handleClick}
        />
      ))}
    </div>
  )
}
```

### Transition

```typescript
'use client'

import { useState, useTransition } from 'react'

export function SearchResults() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [isPending, startTransition] = useTransition()

  function handleSearch(value: string) {
    setQuery(value)

    // 低優先度の更新として扱う
    startTransition(() => {
      const filtered = searchData(value)
      setResults(filtered)
    })
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />

      {isPending && <div>Searching...</div>}

      <ul>
        {results.map(result => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

## 実践パターン

### 認証フォーム

```typescript
'use client'

import { useActionState } from 'react'
import { login } from './actions'

type LoginState = {
  error?: string
  success?: boolean
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState>(
    login,
    { success: false }
  )

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      {state.error && (
        <div className="error">{state.error}</div>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  )
}
```

### ファイルアップロード

```typescript
'use server'

import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function uploadFile(formData: FormData) {
  const file = formData.get('file') as File

  if (!file) {
    return { error: 'No file uploaded' }
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const path = join(process.cwd(), 'public', 'uploads', file.name)
  await writeFile(path, buffer)

  return {
    success: true,
    url: `/uploads/${file.name}`,
  }
}
```

### 無限スクロール

```typescript
'use client'

import { use, Suspense, useState } from 'react'

async function fetchPosts(page: number) {
  const response = await fetch(`/api/posts?page=${page}`)
  return response.json()
}

function PostsContent({ page }: { page: number }) {
  const posts = use(fetchPosts(page))

  return (
    <>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </article>
      ))}
    </>
  )
}

export function InfiniteScrollPosts() {
  const [pages, setPages] = useState([1])

  return (
    <div>
      {pages.map(page => (
        <Suspense key={page} fallback={<div>Loading...</div>}>
          <PostsContent page={page} />
        </Suspense>
      ))}

      <button onClick={() => setPages([...pages, pages.length + 1])}>
        Load More
      </button>
    </div>
  )
}
```

## マイグレーションガイド

### React 18からの移行

```typescript
// React 18
import { createRoot } from 'react-dom/client'

const root = createRoot(document.getElementById('root')!)
root.render(<App />)

// React 19 - 変更なし
import { createRoot } from 'react-dom/client'

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
```

### useEffectの見直し

```typescript
// React 18
useEffect(() => {
  fetchData()
}, [])

// React 19 - use()を使用
const data = use(fetchData())
```

### forwardRefの非推奨化

```typescript
// React 18
const MyInput = forwardRef((props, ref) => {
  return <input ref={ref} {...props} />
})

// React 19 - ref as prop
function MyInput({ ref, ...props }) {
  return <input ref={ref} {...props} />
}
```

## まとめ

React 19は、開発体験とパフォーマンスを大幅に向上させる革新的なリリースです。

**主要機能**:

1. **use()フック**: Promiseとコンテキストの統一的な読み取り
2. **Server Actions**: サーバーサイド処理の統合
3. **フォームアクション**: 宣言的なフォーム処理
4. **useOptimistic()**: 楽観的UI更新
5. **React Compiler**: 自動最適化

**2026年のベストプラクティス**:

- Server Actionsでサーバーロジックを統合
- use()で非同期処理を簡潔に
- Suspenseでローディング状態を宣言的に
- Optimistic UIでUXを向上
- React Compilerに最適化を任せる

React 19の新機能を活用して、より良いユーザー体験を提供しましょう。
