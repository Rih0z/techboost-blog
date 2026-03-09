---
title: "Next.js 15のServer Actions完全ガイド — フォーム処理からデータ更新まで"
description: "Next.js 15のServer Actionsの仕組み、フォーム送信、楽観的UI更新、エラーハンドリング、セキュリティのベストプラクティスをTypeScriptコード例付きで実践的に解説します。"
pubDate: "2026-02-05"
tags: ["Next.js", "Server Actions", "React", "TypeScript", "Forms"]
heroImage: '../../assets/thumbnails/nextjs-15-server-actions.jpg'
---
## Server Actionsとは

Server Actionsは、Next.js 13.4で実験的に導入され、Next.js 15で正式リリースされた機能です。サーバーサイドのロジックをクライアントから直接呼び出せる、React Server Componentsの重要な機能の一つです。

### 従来のAPIルートとの違い

**従来のAPIルート方式:**
```typescript
// app/api/user/route.ts
export async function POST(request: Request) {
  const data = await request.json()
  // 処理
}

// クライアント側
const response = await fetch('/api/user', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

**Server Actions方式:**
```typescript
// app/actions.ts
'use server'

export async function createUser(formData: FormData) {
  // 直接サーバー処理
}

// クライアント側
<form action={createUser}>
```

APIルートを作成する必要がなく、コードがシンプルになります。

## 基本的な使い方

### シンプルなフォーム送信

```typescript
// app/actions.ts
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  await db.post.create({
    data: { title, content }
  })

  revalidatePath('/posts')
}
```

```typescript
// app/posts/new/page.tsx
import { createPost } from '@/app/actions'

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">投稿</button>
    </form>
  )
}
```

### Client Componentでの使用

Client Componentでは`useFormState`や`useFormStatus`と組み合わせます。

```typescript
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createPost } from '@/app/actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? '送信中...' : '投稿'}
    </button>
  )
}

export default function NewPostForm() {
  const [state, formAction] = useFormState(createPost, null)

  return (
    <form action={formAction}>
      <input name="title" required />
      <textarea name="content" required />
      <SubmitButton />
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  )
}
```

## バリデーション

Zodを使った型安全なバリデーション。

```typescript
// app/actions.ts
'use server'

import { z } from 'zod'
import { db } from '@/lib/db'

const postSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100),
  content: z.string().min(10, '本文は10文字以上必要です'),
  tags: z.array(z.string()).optional(),
})

export async function createPost(prevState: any, formData: FormData) {
  // バリデーション
  const validatedFields = postSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.getAll('tags'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'バリデーションエラーが発生しました',
    }
  }

  try {
    await db.post.create({
      data: validatedFields.data,
    })

    revalidatePath('/posts')
    return { message: '投稿を作成しました' }
  } catch (error) {
    return { message: 'エラーが発生しました' }
  }
}
```

```typescript
'use client'

export default function PostForm() {
  const [state, formAction] = useFormState(createPost, null)

  return (
    <form action={formAction}>
      <div>
        <input name="title" />
        {state?.errors?.title && (
          <p className="error">{state.errors.title[0]}</p>
        )}
      </div>

      <div>
        <textarea name="content" />
        {state?.errors?.content && (
          <p className="error">{state.errors.content[0]}</p>
        )}
      </div>

      <button type="submit">投稿</button>
      {state?.message && <p>{state.message}</p>}
    </form>
  )
}
```

## 楽観的UI更新

`useOptimistic`を使ってUIを即座に更新します。

```typescript
'use client'

import { useOptimistic } from 'react'
import { addComment } from '@/app/actions'

export default function Comments({ postId, initialComments }: Props) {
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    initialComments,
    (state, newComment: string) => [
      ...state,
      { id: 'temp', text: newComment, createdAt: new Date() }
    ]
  )

  async function handleSubmit(formData: FormData) {
    const comment = formData.get('comment') as string

    // 楽観的UI更新
    addOptimisticComment(comment)

    // サーバーに送信
    await addComment(postId, comment)
  }

  return (
    <div>
      <ul>
        {optimisticComments.map((comment) => (
          <li key={comment.id} className={comment.id === 'temp' ? 'pending' : ''}>
            {comment.text}
          </li>
        ))}
      </ul>

      <form action={handleSubmit}>
        <input name="comment" required />
        <button type="submit">コメント</button>
      </form>
    </div>
  )
}
```

## データの再検証

### revalidatePath

特定のパスのキャッシュを無効化します。

```typescript
'use server'

import { revalidatePath } from 'next/cache'

export async function updatePost(id: string, formData: FormData) {
  await db.post.update({
    where: { id },
    data: { /* ... */ }
  })

  // 特定のページを再検証
  revalidatePath('/posts')
  revalidatePath(`/posts/${id}`)
}
```

### revalidateTag

タグベースでキャッシュを無効化します。

```typescript
'use server'

import { revalidateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  await db.post.create({ /* ... */ })

  // タグで再検証
  revalidateTag('posts')
}

// データフェッチ時にタグを設定
export async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] }
  })
  return res.json()
}
```

## リダイレクト

処理後にリダイレクトする場合。

```typescript
'use server'

import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
  const post = await db.post.create({ /* ... */ })

  // 作成した投稿ページにリダイレクト
  redirect(`/posts/${post.id}`)
}
```

## エラーハンドリング

```typescript
'use server'

export async function deletePost(postId: string) {
  try {
    const post = await db.post.findUnique({ where: { id: postId } })

    if (!post) {
      return { error: '投稿が見つかりません' }
    }

    await db.post.delete({ where: { id: postId } })

    revalidatePath('/posts')
    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return { error: '削除に失敗しました' }
  }
}
```

```typescript
'use client'

export default function DeleteButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition()

  async function handleDelete() {
    startTransition(async () => {
      const result = await deletePost(postId)

      if (result.error) {
        alert(result.error)
      }
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? '削除中...' : '削除'}
    </button>
  )
}
```

## セキュリティ

### 認証チェック

```typescript
'use server'

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // ユーザー認証済みの処理
  await db.user.update({
    where: { id: session.user.id },
    data: { /* ... */ }
  })
}
```

### 権限チェック

```typescript
'use server'

export async function deletePost(postId: string) {
  const session = await auth()
  const post = await db.post.findUnique({ where: { id: postId } })

  if (!post) {
    throw new Error('投稿が見つかりません')
  }

  if (post.authorId !== session.user.id) {
    throw new Error('権限がありません')
  }

  await db.post.delete({ where: { id: postId } })
}
```

### CSRFトークン（自動処理）

Next.jsのServer Actionsは自動的にCSRF保護されています。追加の実装は不要です。

## useTransitionとの組み合わせ

```typescript
'use client'

import { useTransition } from 'react'
import { updateSettings } from '@/app/actions'

export default function SettingsForm() {
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateSettings(formData)
    })
  }

  return (
    <form action={handleSubmit}>
      <input name="username" />
      <button type="submit" disabled={isPending}>
        {isPending ? '保存中...' : '保存'}
      </button>
    </form>
  )
}
```

## ファイルアップロード

```typescript
'use server'

import { put } from '@vercel/blob'

export async function uploadAvatar(formData: FormData) {
  const file = formData.get('avatar') as File

  if (!file) {
    return { error: 'ファイルを選択してください' }
  }

  const blob = await put(file.name, file, {
    access: 'public',
  })

  await db.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: blob.url }
  })

  return { success: true, url: blob.url }
}
```

## まとめ

Next.js 15のServer Actionsは、以下のメリットがあります。

- **シンプルなコード**: APIルート不要、直接サーバー関数を呼び出し
- **型安全性**: TypeScriptで完全に型付け
- **パフォーマンス**: 自動的な最適化とキャッシュ管理
- **セキュリティ**: 自動CSRF保護、認証統合が容易

従来のAPIルートも併用できるため、段階的な移行が可能です。フォーム処理やデータ更新には積極的にServer Actionsを活用しましょう。

## 参考リンク

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [React useFormState](https://react.dev/reference/react-dom/hooks/useFormState)
- [React useOptimistic](https://react.dev/reference/react/useOptimistic)
