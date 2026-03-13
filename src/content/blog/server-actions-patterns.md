---
title: "Server Actions設計パターン完全ガイド"
description: "Next.js App RouterとReact 19のServer Actionsを使った実践的な設計パターン集。フォーム処理、データミューテーション、楽観的更新、エラーハンドリング、セキュリティまで徹底解説。基礎から応用まで幅広くカバーしています。"
pubDate: "2025-07-28"
updatedDate: "2025-07-28"
tags: ["Server Actions", "Next.js", "React", "TypeScript", "Web Development"]
heroImage: '../../assets/thumbnails/server-actions-patterns.jpg'
---
## はじめに

Server Actionsは、React 19とNext.js 14以降で導入された、サーバーサイドロジックをクライアントから直接呼び出せる革新的な機能です。2026年現在、フォーム処理やデータミューテーションのデファクトスタンダードとなり、API Routesの多くのユースケースを置き換えています。

### Server Actionsとは

```
従来のアーキテクチャ:
Client → API Route → Database
  │         │           │
  └─ fetch  └─ handler  └─ query

Server Actions:
Client → Server Action → Database
  │            │             │
  └─ action    └─ "use server" function

メリット:
✅ ボイラープレートコード削減
✅ 型安全なエンドツーエンド通信
✅ プログレッシブエンハンスメント対応
✅ 楽観的更新が簡単
✅ 自動リバリデーション
✅ セキュリティ向上（トークン不要）
```

### 使い分けガイド

```
Server Actions:
✅ フォーム送信
✅ データミューテーション（CREATE/UPDATE/DELETE）
✅ ユーザーアクション起点の処理
✅ プログレッシブエンハンスメント必要

API Routes:
✅ RESTful API公開
✅ Webhook受信
✅ 外部サービス統合
✅ 複雑な認証フロー
```

## 基本パターン

### パターン1: 単純なフォーム送信

```typescript
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  // データベース保存
  await db.post.create({
    data: {
      title,
      content,
      userId: 1, // 実際は認証情報から取得
    },
  });

  // キャッシュ再検証
  revalidatePath('/posts');

  // リダイレクト
  redirect('/posts');
}
```

```tsx
// app/posts/new/page.tsx
import { createPost } from '@/app/actions';

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

### パターン2: 型安全なServer Action

```typescript
// app/actions.ts
'use server';

import { z } from 'zod';

const CreatePostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  content: z.string().min(1, 'Content is required'),
  tags: z.array(z.string()).optional(),
});

type CreatePostInput = z.infer<typeof CreatePostSchema>;

export type ActionState = {
  success?: boolean;
  error?: string;
  errors?: Record<string, string[]>;
};

export async function createPost(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // バリデーション
  const parsed = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.getAll('tags'),
  });

  if (!parsed.success) {
    return {
      error: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await db.post.create({
      data: parsed.data,
    });

    revalidatePath('/posts');

    return { success: true };
  } catch (error) {
    return {
      error: 'Failed to create post',
    };
  }
}
```

```tsx
// app/posts/new/page.tsx
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createPost } from '@/app/actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Post'}
    </button>
  );
}

export default function NewPostPage() {
  const [state, formAction] = useFormState(createPost, {});

  return (
    <form action={formAction}>
      {state.error && (
        <div className="error">{state.error}</div>
      )}

      {state.success && (
        <div className="success">Post created successfully!</div>
      )}

      <div>
        <input name="title" placeholder="Title" required />
        {state.errors?.title && (
          <span className="error">{state.errors.title[0]}</span>
        )}
      </div>

      <div>
        <textarea name="content" placeholder="Content" required />
        {state.errors?.content && (
          <span className="error">{state.errors.content[0]}</span>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
```

### パターン3: インラインServer Action

```tsx
// app/posts/[id]/page.tsx
import { revalidatePath } from 'next/cache';

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await db.post.findUnique({
    where: { id: params.id },
  });

  async function deletePost() {
    'use server';

    await db.post.delete({
      where: { id: params.id },
    });

    revalidatePath('/posts');
    redirect('/posts');
  }

  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>

      <form action={deletePost}>
        <button type="submit">Delete Post</button>
      </form>
    </div>
  );
}
```

## 高度なパターン

### パターン4: 楽観的更新

```tsx
// app/posts/[id]/like-button.tsx
'use client';

import { useOptimistic } from 'react';
import { likePost } from '@/app/actions';

export function LikeButton({ postId, initialLikes }: { postId: string; initialLikes: number }) {
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(
    initialLikes,
    (state, newLikes: number) => newLikes
  );

  async function handleLike() {
    // 楽観的更新
    setOptimisticLikes(optimisticLikes + 1);

    // サーバーアクション実行
    await likePost(postId);
  }

  return (
    <form action={handleLike}>
      <button type="submit">
        ❤️ {optimisticLikes}
      </button>
    </form>
  );
}
```

```typescript
// app/actions.ts
'use server';

export async function likePost(postId: string) {
  await db.post.update({
    where: { id: postId },
    data: {
      likes: { increment: 1 },
    },
  });

  revalidatePath(`/posts/${postId}`);
}
```

### パターン5: バッチ処理

```typescript
// app/actions.ts
'use server';

export async function updatePostsOrder(postIds: string[]) {
  await db.$transaction(
    postIds.map((id, index) =>
      db.post.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  revalidatePath('/posts');
}
```

```tsx
// app/posts/reorder.tsx
'use client';

import { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { updatePostsOrder } from '@/app/actions';

export function ReorderablePosts({ posts }: { posts: Post[] }) {
  const [items, setItems] = useState(posts);

  async function handleDragEnd(event: any) {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // サーバーに保存
      await updatePostsOrder(newItems.map((i) => i.id));
    }
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((post) => (
          <SortableItem key={post.id} post={post} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

### パターン6: ファイルアップロード

```typescript
// app/actions.ts
'use server';

import { put } from '@vercel/blob';

export async function uploadImage(formData: FormData) {
  const file = formData.get('image') as File;

  if (!file) {
    return { error: 'No file provided' };
  }

  // ファイルタイプチェック
  if (!file.type.startsWith('image/')) {
    return { error: 'File must be an image' };
  }

  // サイズチェック（5MB）
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'File size must be less than 5MB' };
  }

  try {
    const blob = await put(file.name, file, {
      access: 'public',
    });

    // データベースに保存
    await db.image.create({
      data: {
        url: blob.url,
        name: file.name,
        size: file.size,
      },
    });

    revalidatePath('/gallery');

    return { success: true, url: blob.url };
  } catch (error) {
    return { error: 'Failed to upload image' };
  }
}
```

```tsx
// app/upload/page.tsx
'use client';

import { useFormState } from 'react-dom';
import { uploadImage } from '@/app/actions';

export default function UploadPage() {
  const [state, formAction] = useFormState(uploadImage, {});

  return (
    <form action={formAction}>
      {state.error && <p className="error">{state.error}</p>}

      {state.success && (
        <div>
          <p>Upload successful!</p>
          <img src={state.url} alt="Uploaded" />
        </div>
      )}

      <input type="file" name="image" accept="image/*" required />
      <button type="submit">Upload</button>
    </form>
  );
}
```

### パターン7: 認証付きアクション

```typescript
// lib/auth.ts
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function getCurrentUser() {
  const token = cookies().get('auth-token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    );

    return payload as { id: string; email: string };
  } catch {
    return null;
  }
}
```

```typescript
// app/actions.ts
'use server';

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  await db.post.create({
    data: {
      title,
      content,
      userId: user.id,
    },
  });

  revalidatePath('/posts');
  redirect('/posts');
}
```

### パターン8: Rate Limiting

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function checkRateLimit(identifier: string) {
  const { success, reset } = await ratelimit.limit(identifier);

  if (!success) {
    const now = Date.now();
    const retryAfter = Math.floor((reset - now) / 1000);

    throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`);
  }
}
```

```typescript
// app/actions.ts
'use server';

import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export async function sendMessage(formData: FormData) {
  const ip = headers().get('x-forwarded-for') ?? 'unknown';

  try {
    await checkRateLimit(ip);
  } catch (error) {
    return { error: error.message };
  }

  const message = formData.get('message') as string;

  await db.message.create({
    data: { message },
  });

  revalidatePath('/messages');

  return { success: true };
}
```

## エラーハンドリング

### パターン9: グローバルエラーハンドリング

```typescript
// lib/safe-action.ts
import { getCurrentUser } from './auth';

type ActionResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export function createSafeAction<T>(
  handler: (formData: FormData, userId: string) => Promise<T>
) {
  return async (formData: FormData): Promise<ActionResult<T>> => {
    try {
      // 認証チェック
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'Unauthorized' };
      }

      // アクション実行
      const data = await handler(formData, user.id);

      return { success: true, data };
    } catch (error) {
      console.error('Action error:', error);

      if (error instanceof z.ZodError) {
        return { success: false, error: 'Validation failed' };
      }

      return { success: false, error: 'Something went wrong' };
    }
  };
}
```

```typescript
// app/actions.ts
'use server';

import { createSafeAction } from '@/lib/safe-action';

export const createPost = createSafeAction(async (formData, userId) => {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const post = await db.post.create({
    data: {
      title,
      content,
      userId,
    },
  });

  revalidatePath('/posts');

  return post;
});
```

## テスト

### パターン10: Server Actionsのテスト

```typescript
// __tests__/actions.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createPost } from '@/app/actions';

describe('createPost', () => {
  beforeEach(async () => {
    // データベースクリーンアップ
    await db.post.deleteMany();
  });

  it('should create a post', async () => {
    const formData = new FormData();
    formData.set('title', 'Test Post');
    formData.set('content', 'Test content');

    const result = await createPost({}, formData);

    expect(result.success).toBe(true);

    const posts = await db.post.findMany();
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Test Post');
  });

  it('should return error for invalid data', async () => {
    const formData = new FormData();
    formData.set('title', '');
    formData.set('content', 'Test content');

    const result = await createPost({}, formData);

    expect(result.success).toBe(false);
    expect(result.errors?.title).toBeDefined();
  });
});
```

### E2Eテスト

```typescript
// e2e/posts.spec.ts
import { test, expect } from '@playwright/test';

test('should create a post', async ({ page }) => {
  await page.goto('/posts/new');

  await page.fill('input[name="title"]', 'Test Post');
  await page.fill('textarea[name="content"]', 'Test content');

  await page.click('button[type="submit"]');

  // リダイレクト確認
  await expect(page).toHaveURL('/posts');

  // 作成されたポスト確認
  await expect(page.locator('text=Test Post')).toBeVisible();
});
```

## セキュリティベストプラクティス

### チェックリスト

```typescript
// ✅ 必ず認証チェック
export async function deletePost(formData: FormData) {
  'use server';

  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  // ...
}

// ✅ 認可チェック（所有者確認）
export async function updatePost(postId: string, formData: FormData) {
  'use server';

  const user = await getCurrentUser();
  const post = await db.post.findUnique({ where: { id: postId } });

  if (post.userId !== user.id) {
    throw new Error('Forbidden');
  }

  // ...
}

// ✅ 入力バリデーション
export async function createPost(formData: FormData) {
  'use server';

  const parsed = PostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!parsed.success) {
    return { error: 'Invalid input' };
  }

  // ...
}

// ✅ Rate Limiting
export async function sendEmail(formData: FormData) {
  'use server';

  await checkRateLimit(getCurrentUserId());

  // ...
}

// ✅ CSRFは不要（Nextが自動対応）
// ✅ SQLインジェクション対策（ORMが自動対応）
```

## まとめ

### Server Actionsの強み

1. **シンプル**: API Route不要でボイラープレート削減
2. **型安全**: エンドツーエンドで型推論
3. **パフォーマンス**: プログレッシブエンハンスメント対応
4. **セキュリティ**: CSRF自動保護

### ベストプラクティス

- Zodでバリデーション
- createSafeActionでエラーハンドリング統一
- 認証・認可を必ずチェック
- Rate Limitingで悪用防止
- useOptimisticで楽観的更新

### いつ使うべきか

**Server Actions**:
- フォーム処理
- CRUD操作
- ユーザーアクション

**API Routes**:
- RESTful API公開
- Webhook
- 複雑な認証フロー

### 次のステップ

- Next.js公式: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- React公式: https://react.dev/reference/react/use-server
- Zod: https://zod.dev/
- Upstash Rate Limit: https://github.com/upstash/ratelimit

Server Actionsで、モダンなフルスタックアプリケーションを構築しましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
