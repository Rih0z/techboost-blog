---
title: 'React 19 Server Actions完全ガイド - フォーム処理とデータミューテーション'
description: 'React 19 Server Actionsの実践的な使い方を徹底解説。フォーム処理、データミューテーション、楽観的更新、エラーハンドリング、バリデーションを実例付きで紹介します。'
pubDate: '2025-02-06'
tags: ['React', 'React19', 'Server Actions', 'Next.js', 'Full Stack']
---

React 19で導入されたServer Actionsは、フォーム処理とデータミューテーションを革新的にシンプルにしました。Next.js 14以降で利用可能なこの機能により、API Routeを書かずにサーバーサイド処理を実行できます。

## Server Actionsとは

Server Actionsは、**サーバーサイドで実行される非同期関数**で、クライアントから直接呼び出せます。

### 従来の方法（React 18 + Next.js）

```typescript
// pages/api/create-post.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { title, content } = req.body;
  const post = await db.posts.create({ data: { title, content } });
  res.json(post);
}

// components/PostForm.tsx
async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  const response = await fetch('/api/create-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  const post = await response.json();
}
```

### React 19 + Server Actions

```typescript
// app/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const post = await db.posts.create({ data: { title, content } });
  return post;
}

// components/PostForm.tsx
import { createPost } from '@/app/actions';

export default function PostForm() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">投稿</button>
    </form>
  );
}
```

**メリット**:
- API Routeが不要
- 型安全（TypeScript完全サポート）
- フォームのネイティブ動作を活用
- JavaScriptなしでも動作（Progressive Enhancement）

## Server Actionsの作成

### 基本的なServer Action

```typescript
// app/actions/posts.ts
'use server'

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  // FormDataから値を取得
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  // バリデーション
  if (!title || !content) {
    return { error: 'タイトルと本文は必須です' };
  }

  // データベースに保存
  const post = await db.posts.create({
    data: { title, content, published: false },
  });

  // キャッシュを再検証
  revalidatePath('/posts');

  return { success: true, post };
}
```

### 複数のServer Actions

```typescript
// app/actions/posts.ts
'use server'

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const post = await db.posts.create({
    data: { title, content },
  });

  revalidatePath('/posts');
  redirect(`/posts/${post.id}`);
}

export async function updatePost(id: string, formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  await db.posts.update({
    where: { id },
    data: { title, content },
  });

  revalidatePath(`/posts/${id}`);
  return { success: true };
}

export async function deletePost(id: string) {
  await db.posts.delete({ where: { id } });
  revalidatePath('/posts');
  redirect('/posts');
}
```

## フォーム処理

### 基本的なフォーム

```typescript
// app/posts/new/page.tsx
import { createPost } from '@/app/actions/posts';

export default function NewPostPage() {
  return (
    <div>
      <h1>新規投稿</h1>
      <form action={createPost}>
        <div>
          <label htmlFor="title">タイトル</label>
          <input type="text" id="title" name="title" required />
        </div>
        <div>
          <label htmlFor="content">本文</label>
          <textarea id="content" name="content" required />
        </div>
        <button type="submit">投稿する</button>
      </form>
    </div>
  );
}
```

### useActionStateでステート管理

```typescript
// app/posts/new/page.tsx
'use client'

import { useActionState } from 'react';
import { createPost } from '@/app/actions/posts';

export default function NewPostPage() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction}>
      <input name="title" required />
      <textarea name="content" required />

      <button type="submit" disabled={isPending}>
        {isPending ? '投稿中...' : '投稿する'}
      </button>

      {state?.error && (
        <div className="error">{state.error}</div>
      )}

      {state?.success && (
        <div className="success">投稿しました！</div>
      )}
    </form>
  );
}
```

### useFormStatusでペンディング状態を取得

```typescript
// components/SubmitButton.tsx
'use client'

import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  const { pending, data, method } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          送信中...
        </>
      ) : (
        '送信'
      )}
    </button>
  );
}

// app/posts/new/page.tsx
import { createPost } from '@/app/actions/posts';
import { SubmitButton } from '@/components/SubmitButton';

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <SubmitButton />
    </form>
  );
}
```

## バリデーション

### Zodでバリデーション

```bash
npm install zod
```

```typescript
// app/actions/posts.ts
'use server'

import { z } from 'zod';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const PostSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内です'),
  content: z.string().min(10, '本文は10文字以上必要です'),
  published: z.boolean().optional(),
});

export async function createPost(formData: FormData) {
  // FormDataをオブジェクトに変換
  const data = {
    title: formData.get('title'),
    content: formData.get('content'),
    published: formData.get('published') === 'on',
  };

  // バリデーション
  const result = PostSchema.safeParse(data);

  if (!result.success) {
    return {
      error: result.error.flatten().fieldErrors,
    };
  }

  // データベースに保存
  const post = await db.posts.create({
    data: result.data,
  });

  revalidatePath('/posts');
  return { success: true, post };
}
```

### エラー表示

```typescript
// app/posts/new/page.tsx
'use client'

import { useActionState } from 'react';
import { createPost } from '@/app/actions/posts';

export default function NewPostPage() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="title">タイトル</label>
        <input type="text" id="title" name="title" />
        {state?.error?.title && (
          <p className="error">{state.error.title[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="content">本文</label>
        <textarea id="content" name="content" />
        {state?.error?.content && (
          <p className="error">{state.error.content[0]}</p>
        )}
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? '投稿中...' : '投稿する'}
      </button>
    </form>
  );
}
```

## 楽観的更新

### useOptimisticで即座にUI更新

```typescript
// app/posts/page.tsx
'use client'

import { useOptimistic } from 'react';
import { deletePost } from '@/app/actions/posts';

type Post = {
  id: string;
  title: string;
  content: string;
};

export default function PostsPage({ posts }: { posts: Post[] }) {
  const [optimisticPosts, addOptimisticPost] = useOptimistic(
    posts,
    (state, deletedId: string) => state.filter(p => p.id !== deletedId)
  );

  async function handleDelete(id: string) {
    // 即座にUIを更新（楽観的更新）
    addOptimisticPost(id);

    // サーバーサイド処理
    await deletePost(id);
  }

  return (
    <div>
      <h1>投稿一覧</h1>
      {optimisticPosts.map(post => (
        <div key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
          <button onClick={() => handleDelete(post.id)}>削除</button>
        </div>
      ))}
    </div>
  );
}
```

### いいね機能での楽観的更新

```typescript
// app/actions/likes.ts
'use server'

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function toggleLike(postId: string) {
  const userId = await getCurrentUserId();

  const existingLike = await db.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existingLike) {
    await db.like.delete({ where: { id: existingLike.id } });
  } else {
    await db.like.create({ data: { userId, postId } });
  }

  revalidatePath(`/posts/${postId}`);
}

// components/LikeButton.tsx
'use client'

import { useOptimistic } from 'react';
import { toggleLike } from '@/app/actions/likes';

export function LikeButton({ postId, initialLikes }: { postId: string; initialLikes: number }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    initialLikes,
    (state, delta: number) => state + delta
  );

  async function handleLike() {
    // 即座にカウントを更新
    addOptimisticLike(1);

    // サーバー処理
    await toggleLike(postId);
  }

  return (
    <button onClick={handleLike}>
      ❤️ {optimisticLikes}
    </button>
  );
}
```

## エラーハンドリング

### try-catchでエラー処理

```typescript
// app/actions/posts.ts
'use server'

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;

    const post = await db.posts.create({
      data: { title, content },
    });

    revalidatePath('/posts');
    return { success: true, post };
  } catch (error) {
    console.error('Failed to create post:', error);
    return { error: '投稿の作成に失敗しました' };
  }
}
```

### カスタムエラークラス

```typescript
// lib/errors.ts
export class ValidationError extends Error {
  constructor(public fields: Record<string, string>) {
    super('Validation failed');
  }
}

export class AuthError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

// app/actions/posts.ts
'use server'

import { db } from '@/lib/db';
import { ValidationError, AuthError } from '@/lib/errors';

export async function createPost(formData: FormData) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new AuthError();
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  if (!title || !content) {
    throw new ValidationError({
      title: !title ? 'タイトルは必須です' : '',
      content: !content ? '本文は必須です' : '',
    });
  }

  const post = await db.posts.create({
    data: { title, content, userId },
  });

  return { success: true, post };
}
```

## 認証・認可

### セッション確認

```typescript
// app/actions/posts.ts
'use server'

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  // セッション確認
  const session = await auth();

  if (!session?.user) {
    return { error: 'ログインが必要です' };
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const post = await db.posts.create({
    data: {
      title,
      content,
      userId: session.user.id,
    },
  });

  revalidatePath('/posts');
  return { success: true, post };
}
```

### 権限チェック

```typescript
// app/actions/posts.ts
'use server'

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function deletePost(postId: string) {
  const session = await auth();

  if (!session?.user) {
    return { error: 'ログインが必要です' };
  }

  // 投稿の所有者確認
  const post = await db.posts.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return { error: '投稿が見つかりません' };
  }

  if (post.userId !== session.user.id) {
    return { error: '削除権限がありません' };
  }

  await db.posts.delete({ where: { id: postId } });

  return { success: true };
}
```

## ファイルアップロード

```typescript
// app/actions/upload.ts
'use server'

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '@/lib/db';

export async function uploadImage(formData: FormData) {
  const file = formData.get('image') as File;

  if (!file) {
    return { error: 'ファイルが選択されていません' };
  }

  // ファイルサイズチェック（5MB以下）
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'ファイルサイズは5MB以下にしてください' };
  }

  // ファイルタイプチェック
  if (!file.type.startsWith('image/')) {
    return { error: '画像ファイルを選択してください' };
  }

  // ファイル保存
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `${Date.now()}-${file.name}`;
  const path = join(process.cwd(), 'public', 'uploads', filename);

  await writeFile(path, buffer);

  // データベースに記録
  const image = await db.image.create({
    data: {
      filename,
      path: `/uploads/${filename}`,
      size: file.size,
      mimeType: file.type,
    },
  });

  return { success: true, image };
}
```

```typescript
// app/upload/page.tsx
import { uploadImage } from '@/app/actions/upload';

export default function UploadPage() {
  return (
    <form action={uploadImage}>
      <input type="file" name="image" accept="image/*" required />
      <button type="submit">アップロード</button>
    </form>
  );
}
```

## revalidateとredirect

### revalidatePathでキャッシュ更新

```typescript
// app/actions/posts.ts
'use server'

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

export async function createPost(formData: FormData) {
  const post = await db.posts.create({
    data: { /* ... */ },
  });

  // 特定のパスのキャッシュを再検証
  revalidatePath('/posts');

  // 動的ルートの場合
  revalidatePath(`/posts/${post.id}`);

  return { success: true, post };
}
```

### redirectでページ遷移

```typescript
// app/actions/posts.ts
'use server'

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export async function createPost(formData: FormData) {
  const post = await db.posts.create({
    data: { /* ... */ },
  });

  // 投稿詳細ページにリダイレクト
  redirect(`/posts/${post.id}`);
}
```

## まとめ

React 19 Server Actionsは以下の点で優れています。

**メリット**:
- API Route不要で開発効率向上
- 型安全なデータミューテーション
- フォームのネイティブ動作活用
- JavaScript無効でも動作
- 楽観的更新が簡単

**ベストプラクティス**:
- バリデーションはZod等を活用
- エラーハンドリングを適切に実装
- 認証・認可チェックを必ず行う
- revalidatePathでキャッシュ管理
- useOptimisticでUX向上

**注意点**:
- Server Actionsは'use server'ディレクティブ必須
- クライアントコンポーネントでは'use client'が必要
- Next.js 14以降で利用可能

フォーム処理とデータミューテーションが劇的にシンプルになりました。ぜひ試してみてください。

**参考リンク**:
- [React 19 Server Actions](https://react.dev/reference/react/use-server)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [React useActionState](https://react.dev/reference/react/useActionState)
