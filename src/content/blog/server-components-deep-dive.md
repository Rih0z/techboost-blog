---
title: "React Server Components 徹底解説 - 次世代Reactアーキテクチャ"
description: "React Server Componentsの仕組みと実践的な使い方を解説。従来のReactとの違い、パフォーマンス最適化、実装パターンまで詳しく紹介します。"
pubDate: "2025-02-05"
tags: ["react", "nextjs", "server-components", "frontend"]
---

React Server Components (RSC) は、Reactアプリケーションのアーキテクチャを根本から変える革新的な機能です。この記事では、RSCの仕組みから実践的な使い方まで、詳しく解説します。

## React Server Components とは

React Server Components は、サーバー上でのみレンダリングされるコンポーネントです。従来のサーバーサイドレンダリング（SSR）とは異なり、JavaScriptバンドルに含まれず、クライアントに送信されません。

### 従来のReact（Client Components）との違い

| 特徴 | Server Components | Client Components |
|------|-------------------|-------------------|
| 実行環境 | サーバーのみ | サーバー + クライアント |
| JavaScriptバンドル | 含まれない | 含まれる |
| 状態管理 | 不可 | 可能 (`useState`, `useEffect` など) |
| データフェッチ | 直接可能 | APIリクエスト経由 |
| イベントハンドラ | 不可 | 可能 |
| ブラウザAPI | 不可 | 可能 |

## なぜ Server Components が必要なのか

### 1. バンドルサイズの削減

従来のアプローチ:

```javascript
// Client Component - すべてがバンドルに含まれる
import { useState } from 'react';
import { marked } from 'marked';  // ~50KB
import hljs from 'highlight.js';  // ~100KB

export default function BlogPost({ content }) {
  const html = marked(content);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

Server Components:

```javascript
// Server Component - ライブラリはバンドルに含まれない
import { marked } from 'marked';
import hljs from 'highlight.js';

export default async function BlogPost({ slug }) {
  const post = await getPost(slug);
  const html = marked(post.content);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

結果: 約150KBのJavaScriptがバンドルから削除されます。

### 2. データフェッチの簡素化

従来のアプローチ（useEffect）:

```javascript
// Client Component
export default function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <div>{user.name}</div>;
}
```

Server Components:

```javascript
// Server Component - async/awaitで直接フェッチ
export default async function UserProfile({ userId }) {
  const user = await db.users.findUnique({ where: { id: userId } });
  return <div>{user.name}</div>;
}
```

### 3. セキュリティの向上

```javascript
// Server Component - APIキーがクライアントに露出しない
async function AdminDashboard() {
  const data = await fetch('https://api.example.com/admin', {
    headers: {
      'Authorization': `Bearer ${process.env.ADMIN_API_KEY}`
    }
  }).then(res => res.json());

  return <div>{/* データを表示 */}</div>;
}
```

## Next.js での実装

### App Router の基本

Next.js 13+ では、`app` ディレクトリ内のコンポーネントはデフォルトでServer Componentsです。

プロジェクト構造:

```
app/
├── layout.tsx          # Server Component
├── page.tsx            # Server Component
├── components/
│   ├── Counter.tsx     # "use client" 指定でClient Component
│   └── Header.tsx      # Server Component
└── api/
    └── users/
        └── route.ts    # API Route
```

### Server Component の例

```typescript
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getPost } from '@/lib/posts';
import Comments from './Comments';  // Client Component

interface PageProps {
  params: { slug: string };
  searchParams: { sort?: string };
}

// サーバーでデータフェッチ
async function getPostData(slug: string) {
  const post = await getPost(slug);
  if (!post) return null;
  return post;
}

export default async function BlogPostPage({ params, searchParams }: PageProps) {
  const post = await getPostData(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <time>{post.publishedAt}</time>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />

      {/* Client Componentでインタラクティブ機能 */}
      <Comments postId={post.id} />
    </article>
  );
}

// メタデータ生成
export async function generateMetadata({ params }: PageProps) {
  const post = await getPostData(params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}
```

### Client Component の定義

```typescript
// app/blog/[slug]/Comments.tsx
'use client';

import { useState, useEffect } from 'react';

interface Comment {
  id: string;
  author: string;
  content: string;
}

export default function Comments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetch(`/api/comments?postId=${postId}`)
      .then(res => res.json())
      .then(setComments);
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ postId, content: newComment }),
    });
    const comment = await response.json();
    setComments([...comments, comment]);
    setNewComment('');
  };

  return (
    <div>
      <h2>コメント</h2>
      {comments.map(comment => (
        <div key={comment.id}>
          <strong>{comment.author}</strong>
          <p>{comment.content}</p>
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="コメントを入力..."
        />
        <button type="submit">投稿</button>
      </form>
    </div>
  );
}
```

## データフェッチパターン

### 1. 並列フェッチ

```typescript
// 複数のデータを並列で取得
async function Dashboard() {
  const [user, posts, analytics] = await Promise.all([
    getUser(),
    getPosts(),
    getAnalytics(),
  ]);

  return (
    <div>
      <UserProfile user={user} />
      <PostList posts={posts} />
      <Analytics data={analytics} />
    </div>
  );
}
```

### 2. ウォーターフォールの回避

悪い例（シーケンシャル）:

```typescript
// アンチパターン - 順次実行
async function UserDashboard({ userId }: { userId: string }) {
  const user = await getUser(userId);           // 1秒待つ
  const posts = await getUserPosts(user.id);    // さらに1秒待つ
  const comments = await getUserComments(user.id); // さらに1秒待つ
  // 合計3秒
}
```

良い例（並列実行）:

```typescript
async function UserDashboard({ userId }: { userId: string }) {
  // すべて同時に開始
  const userPromise = getUser(userId);
  const postsPromise = getUserPosts(userId);
  const commentsPromise = getUserComments(userId);

  const [user, posts, comments] = await Promise.all([
    userPromise,
    postsPromise,
    commentsPromise,
  ]);
  // 合計1秒（最も遅いリクエスト）
}
```

### 3. Suspense との組み合わせ

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';
import UserProfile from './UserProfile';
import PostList from './PostList';
import Analytics from './Analytics';

export default function Dashboard() {
  return (
    <div>
      <Suspense fallback={<UserProfileSkeleton />}>
        <UserProfile />
      </Suspense>

      <Suspense fallback={<PostListSkeleton />}>
        <PostList />
      </Suspense>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <Analytics />
      </Suspense>
    </div>
  );
}
```

各コンポーネントは独立してデータをフェッチ:

```typescript
// UserProfile.tsx
async function UserProfile() {
  const user = await getUser();
  return <div>{user.name}</div>;
}

// PostList.tsx
async function PostList() {
  const posts = await getPosts();
  return <ul>{posts.map(post => <li key={post.id}>{post.title}</li>)}</ul>;
}
```

## キャッシング戦略

### fetch API のキャッシング

```typescript
// デフォルト: 強制キャッシュ
const data = await fetch('https://api.example.com/data', {
  cache: 'force-cache'  // デフォルト
});

// キャッシュしない
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store'
});

// 再検証付きキャッシュ
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 }  // 1時間ごとに再検証
});
```

### データベースクエリのキャッシング

```typescript
import { cache } from 'react';

// React cache を使用
export const getUser = cache(async (id: string) => {
  return await db.user.findUnique({ where: { id } });
});

// 同じリクエスト内で複数回呼び出しても、実行は1回のみ
async function UserPage({ id }: { id: string }) {
  const user = await getUser(id);      // DBクエリ実行
  const sameUser = await getUser(id);  // キャッシュから取得
  // ...
}
```

### unstable_cache によるアプリケーションレベルキャッシング

```typescript
import { unstable_cache } from 'next/cache';

export const getCachedPosts = unstable_cache(
  async () => {
    return await db.post.findMany();
  },
  ['posts'],
  { revalidate: 3600, tags: ['posts'] }
);

// タグベースの再検証
import { revalidateTag } from 'next/cache';

export async function createPost(data: PostData) {
  await db.post.create({ data });
  revalidateTag('posts');  // 'posts' タグのキャッシュを無効化
}
```

## Streaming と Progressive Enhancement

### Loading UI

```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />;
}

// app/dashboard/page.tsx
async function Dashboard() {
  const data = await getData();  // データ取得中に loading.tsx が表示される
  return <DashboardView data={data} />;
}
```

### Streaming SSR

```typescript
// ストリーミングでコンテンツを段階的に送信
import { Suspense } from 'react';

export default function Page() {
  return (
    <>
      {/* 即座に表示 */}
      <Header />

      {/* ロード中は fallback を表示、準備ができたらストリーム */}
      <Suspense fallback={<PostsSkeleton />}>
        <Posts />
      </Suspense>

      {/* 独立してストリーム */}
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />
      </Suspense>
    </>
  );
}
```

## Server Actions

### フォーム送信

```typescript
// app/posts/create/page.tsx
import { createPost } from './actions';

export default function CreatePost() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">投稿</button>
    </form>
  );
}

// app/posts/create/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const post = await db.post.create({
    data: { title, content }
  });

  revalidatePath('/posts');
  redirect(`/posts/${post.id}`);
}
```

### プログレッシブエンハンスメント

```typescript
// Client Componentから呼び出し
'use client';

import { useFormStatus } from 'react-dom';
import { createPost } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? '送信中...' : '投稿'}
    </button>
  );
}

export default function CreatePostForm() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <SubmitButton />
    </form>
  );
}
```

## ベストプラクティス

### 1. Server/Client の適切な分離

```typescript
// Good: Server Componentでデータフェッチ、Client Componentに渡す
async function PostPage({ id }: { id: string }) {
  const post = await getPost(id);
  return <InteractivePost post={post} />;
}

// Bad: Client Componentでデータフェッチ
'use client';
function PostPage({ id }: { id: string }) {
  const [post, setPost] = useState(null);
  useEffect(() => {
    fetch(`/api/posts/${id}`).then(/* ... */);
  }, [id]);
  // ...
}
```

### 2. 最小限のClient Componentバウンダリ

```typescript
// Good: 必要な部分のみClient Component
async function BlogPost() {
  const post = await getPost();
  return (
    <article>
      <h1>{post.title}</h1>
      <PostContent content={post.content} />
      <LikeButton postId={post.id} />  {/* Client Component */}
    </article>
  );
}

// Bad: 全体をClient Component化
'use client';
async function BlogPost() {
  // すべてがバンドルに含まれる
}
```

### 3. Server Component から Client Component へのprops

```typescript
// Good: シリアライズ可能なデータ
<ClientComponent data={{ id: 1, name: 'John' }} />

// Bad: 関数やコンポーネントは渡せない
<ClientComponent onClick={() => {}} />  // エラー
<ClientComponent icon={<Icon />} />     // エラー

// 解決策: children として渡す
<ClientComponent>
  <Icon />  {/* Server Componentとしてレンダリング */}
</ClientComponent>
```

## まとめ

React Server Components は、Reactアプリケーションに以下のメリットをもたらします:

1. **パフォーマンス向上**: バンドルサイズの大幅削減
2. **開発体験の改善**: async/await による直感的なデータフェッチ
3. **セキュリティ**: サーバー側のみでの機密情報処理
4. **SEO最適化**: サーバーレンダリングによる即座のコンテンツ配信

ただし、以下の点に注意が必要です:

- Server/Client Componentの適切な使い分け
- キャッシング戦略の理解
- Suspenseとストリーミングの活用
- Server Actionsによるフォーム処理

RSCを効果的に活用することで、高速でスケーラブルなReactアプリケーションを構築できます。
