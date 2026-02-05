---
title: 'React Server Componentsの完全ガイド - Next.js App Routerで実践'
description: 'React Server Components（RSC）の仕組みから実装パターンまで徹底解説。Next.js App Routerでの使い方、クライアントコンポーネントとの使い分け、パフォーマンス最適化を実例で学ぶ。'
pubDate: 'Feb 05 2026'
tags: ['React', 'Next.js', 'Server Components']
---

# React Server Componentsの完全ガイド - Next.js App Routerで実践

React Server Components（RSC）は、サーバーサイドでレンダリングされるReactコンポーネントの新しいパラダイムです。従来のSSRとは異なり、コンポーネント単位でサーバーとクライアントを分離できる革新的な機能です。

## React Server Componentsとは

### 従来のSSRとの違い

従来のSSR（Server-Side Rendering）では、初回レンダリング時にサーバーでHTMLを生成し、その後クライアントで「ハイドレーション」してインタラクティブにします。一方、RSCはサーバーコンポーネント自体がクライアントに送信されず、**サーバー上で実行され続ける**のが特徴です。

```tsx
// Server Component（デフォルト）
async function BlogPost({ id }: { id: string }) {
  // データベース直接アクセス可能
  const post = await db.post.findUnique({ where: { id } });

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### Server Componentsの利点

1. **バンドルサイズの削減** - サーバーコンポーネントのコードはクライアントに送信されない
2. **直接データアクセス** - データベースや内部APIに直接アクセス可能
3. **自動コード分割** - コンポーネント単位で自動的に分割
4. **SEO最適化** - サーバーでレンダリングされた完全なHTMLを提供

## Next.js App Routerでの実装

### ディレクトリ構造

```
app/
├── page.tsx              # Server Component
├── layout.tsx            # Server Component
├── components/
│   ├── Counter.tsx       # 'use client'
│   └── PostList.tsx      # Server Component
```

### 基本的な実装パターン

```tsx
// app/blog/[id]/page.tsx
import { Suspense } from 'react';
import { Comments } from './Comments';
import { LikeButton } from './LikeButton';

// Server Component（async可能）
export default async function BlogPage({
  params
}: {
  params: { id: string }
}) {
  // サーバーで実行されるデータフェッチ
  const post = await fetch(`https://api.example.com/posts/${params.id}`)
    .then(res => res.json());

  return (
    <main>
      <h1>{post.title}</h1>
      <p>{post.content}</p>

      {/* Client Component */}
      <LikeButton postId={post.id} />

      {/* Server Componentを遅延ロード */}
      <Suspense fallback={<div>Loading comments...</div>}>
        <Comments postId={post.id} />
      </Suspense>
    </main>
  );
}
```

### Client Componentの定義

```tsx
// app/blog/[id]/LikeButton.tsx
'use client'; // この宣言でClient Componentに

import { useState } from 'react';

export function LikeButton({ postId }: { postId: string }) {
  const [likes, setLikes] = useState(0);

  const handleLike = async () => {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    setLikes(prev => prev + 1);
  };

  return (
    <button onClick={handleLike} className="btn-primary">
      Like ({likes})
    </button>
  );
}
```

## Server ComponentとClient Componentの使い分け

### Server Componentを使うべきケース

- データフェッチ（DB、API）
- バックエンドリソースへの直接アクセス
- 機密情報（APIキー、トークン）を使用
- 大きな依存関係（シンタックスハイライターなど）

### Client Componentを使うべきケース

- インタラクティブ性（onClick、onChange）
- React Hooks（useState、useEffect）
- ブラウザAPI（localStorage、window）
- カスタムフックやコンテキスト

### コンポジションパターン

Server Component内にClient Componentを配置するのは可能ですが、**逆は不可**です。

```tsx
// ✅ 正しい
// ServerComponent.tsx
import ClientComponent from './ClientComponent';

export default function ServerComponent() {
  return (
    <div>
      <ClientComponent />
    </div>
  );
}

// ❌ 間違い
// ClientComponent.tsx
'use client';
import ServerComponent from './ServerComponent'; // エラー！

export default function ClientComponent() {
  return <ServerComponent />;
}
```

回避策として、**children propsパターン**を使用:

```tsx
// ClientWrapper.tsx
'use client';
export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <div className="interactive">{children}</div>;
}

// page.tsx (Server Component)
import { ClientWrapper } from './ClientWrapper';

export default async function Page() {
  const data = await fetchData(); // Server側でフェッチ

  return (
    <ClientWrapper>
      <ServerOnlyComponent data={data} />
    </ClientWrapper>
  );
}
```

## データフェッチパターン

### 並列フェッチ

```tsx
async function Page() {
  // 並列実行
  const [user, posts] = await Promise.all([
    fetchUser(),
    fetchPosts()
  ]);

  return (
    <>
      <UserProfile user={user} />
      <PostList posts={posts} />
    </>
  );
}
```

### ストリーミングとSuspense

```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <main>
      {/* 即座に表示 */}
      <Header />

      {/* 非同期コンポーネントをストリーミング */}
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>

      <Suspense fallback={<Skeleton />}>
        <AnotherSlowComponent />
      </Suspense>
    </main>
  );
}

async function SlowComponent() {
  const data = await slowFetch();
  return <div>{data}</div>;
}
```

### キャッシング戦略

Next.js 15では`fetch()`のキャッシングがデフォルトで無効化されています。明示的に指定:

```tsx
// 静的データ（ビルド時）
const data = await fetch('https://api.example.com/data', {
  cache: 'force-cache'
});

// 動的データ（リクエストごと）
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store'
});

// 再検証付きキャッシュ（60秒ごと）
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 60 }
});
```

## パフォーマンス最適化

### 1. サーバー専用コードの分離

```tsx
// lib/server-only-utils.ts
import 'server-only'; // このファイルがクライアントで使われたらエラー

export async function getSecretData() {
  const secret = process.env.SECRET_KEY;
  return await db.query(secret);
}
```

### 2. Preload Pattern

```tsx
// app/blog/[id]/page.tsx
import { preload } from 'react-dom';

export default async function Page({ params }: { params: { id: string } }) {
  // データフェッチを事前開始
  preload(`/api/posts/${params.id}`, { as: 'fetch' });

  const post = await fetchPost(params.id);
  return <Post data={post} />;
}
```

### 3. Partial Prerendering（実験的機能）

```tsx
// next.config.js
module.exports = {
  experimental: {
    ppr: true
  }
};

// app/page.tsx
export const experimental_ppr = true;

export default function Page() {
  return (
    <>
      {/* 静的部分 */}
      <StaticContent />

      {/* 動的部分（ストリーミング） */}
      <Suspense fallback={<Skeleton />}>
        <DynamicContent />
      </Suspense>
    </>
  );
}
```

## よくあるエラーと対処法

### エラー1: "You're importing a component that needs useState..."

**原因**: Server Component内でClient専用機能を使用

**解決策**: `'use client'`を追加

```tsx
'use client';
import { useState } from 'react';
// ...
```

### エラー2: "async/await is not yet supported in Client Components"

**原因**: Client Component内で`async`を使用

**解決策**: データフェッチはServer Componentで行い、propsで渡す

```tsx
// ✅ Server Component
async function Page() {
  const data = await fetchData();
  return <ClientComponent data={data} />;
}

// ✅ Client Component
'use client';
function ClientComponent({ data }) {
  return <div>{data}</div>;
}
```

### エラー3: "Functions cannot be passed directly to Client Components"

**原因**: Server ComponentからClient Componentに関数を渡そうとした

**解決策**: Server Actionsを使用

```tsx
// app/actions.ts
'use server';

export async function updatePost(formData: FormData) {
  const title = formData.get('title');
  await db.post.update({ where: { id: 1 }, data: { title } });
}

// Client Component
'use client';
import { updatePost } from './actions';

export function Form() {
  return (
    <form action={updatePost}>
      <input name="title" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## まとめ

React Server Componentsは、以下の点で革新的です:

1. **サーバーとクライアントの最適な分離** - コンポーネント単位で制御
2. **パフォーマンスの向上** - バンドルサイズ削減、並列データフェッチ
3. **開発者体験の改善** - 直感的なデータフェッチ、型安全性

Next.js App Routerで実際に使ってみることで、その強力さを実感できるでしょう。まずは小さなプロジェクトから始めて、徐々にパターンを習得していくことをおすすめします。
