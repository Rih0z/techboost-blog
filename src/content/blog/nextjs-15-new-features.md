---
title: "Next.js 15 新機能まとめ — React 19対応・Turbopack安定化・PPR解説"
description: "Next.js 15の主要新機能を徹底解説。React 19対応、Partial Pre-rendering（PPR）、Turbopack安定化、Server Actions改善など実践的なコード例とともに紹介します。"
pubDate: "2026-03-04"
tags: ["Next.js", "React", "TypeScript", "フロントエンド", "Vercel"]
---

## はじめに

Next.js 15は2024年末にリリースされ、**React 19のフルサポート**、**Turbopackの安定化**、そして長らく待望されていた **Partial Pre-rendering（PPR）** の導入など、フロントエンド開発に大きな影響を与える変更が多数含まれています。

本記事では、Next.js 15の主要な新機能を実際のコード例を交えながら解説します。

## React 19 対応

Next.js 15はReact 19を完全サポートしています。React 19の主要な新機能がNext.jsのApp Routerと深く統合されました。

### useActionState（旧useFormState）

フォームのサーバーアクションと状態管理を簡素化します。

```typescript
// app/actions.ts
'use server';

export async function createUser(
  prevState: { message: string } | null,
  formData: FormData
) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  try {
    // ユーザー作成処理
    await db.user.create({ data: { name, email } });
    return { message: 'ユーザーを作成しました' };
  } catch (error) {
    return { message: 'エラーが発生しました' };
  }
}
```

```typescript
// app/components/UserForm.tsx
'use client';

import { useActionState } from 'react';
import { createUser } from '../actions';

export function UserForm() {
  const [state, formAction, isPending] = useActionState(createUser, null);

  return (
    <form action={formAction}>
      <input name="name" placeholder="名前" required />
      <input name="email" type="email" placeholder="メール" required />
      <button type="submit" disabled={isPending}>
        {isPending ? '送信中...' : '登録'}
      </button>
      {state?.message && <p>{state.message}</p>}
    </form>
  );
}
```

### useOptimistic でUI先行更新

サーバーのレスポンスを待たずにUIを更新し、ユーザー体験を向上させます。

```typescript
'use client';

import { useOptimistic, useTransition } from 'react';
import { toggleLike } from './actions';

interface Post {
  id: string;
  liked: boolean;
  likeCount: number;
}

export function LikeButton({ post }: { post: Post }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticPost, addOptimisticLike] = useOptimistic(
    post,
    (state, liked: boolean) => ({
      ...state,
      liked,
      likeCount: liked ? state.likeCount + 1 : state.likeCount - 1,
    })
  );

  const handleLike = () => {
    startTransition(async () => {
      addOptimisticLike(!optimisticPost.liked);
      await toggleLike(post.id);
    });
  };

  return (
    <button onClick={handleLike} disabled={isPending}>
      {optimisticPost.liked ? '❤️' : '🤍'} {optimisticPost.likeCount}
    </button>
  );
}
```

## Partial Pre-rendering（PPR）

PPRはNext.js 15の最も革新的な機能の一つです。**静的シェル（Static Shell）** を即座に配信しながら、動的なコンテンツを **Streaming** で非同期に流し込みます。

### PPR の仕組み

```
従来のレンダリング:
- 静的生成（SSG）: 全ページがビルド時に生成（動的データ非対応）
- サーバーサイドレンダリング（SSR）: 全ページが動的に生成（遅い）

PPR:
- 静的シェルを即座に配信（ナビゲーション・レイアウト等）
- 動的部分はSuspenseでストリーミング配信
```

### PPR の設定と実装

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true, // PPRを有効化
  },
};

export default nextConfig;
```

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { StaticHeader } from './StaticHeader';
import { DynamicUserData } from './DynamicUserData';
import { DynamicAnalytics } from './DynamicAnalytics';

export default function Dashboard() {
  return (
    <div>
      {/* 静的シェル: 即座に配信 */}
      <StaticHeader />

      {/* 動的コンテンツ: ストリーミングで配信 */}
      <Suspense fallback={<div className="skeleton">読み込み中...</div>}>
        <DynamicUserData />
      </Suspense>

      <Suspense fallback={<div className="skeleton">データ取得中...</div>}>
        <DynamicAnalytics />
      </Suspense>
    </div>
  );
}
```

```typescript
// app/dashboard/DynamicUserData.tsx
// このコンポーネントはPPRで非同期ストリーミング配信
async function DynamicUserData() {
  // このデータフェッチがストリーミングをトリガー
  const user = await fetch('/api/user', { cache: 'no-store' }).then(r => r.json());

  return (
    <div>
      <h2>こんにちは、{user.name}さん</h2>
      <p>最終ログイン: {user.lastLogin}</p>
    </div>
  );
}
```

## Turbopack の安定化

Next.js 15でTurbopackが開発モードで安定化されました。Turbopackは**Rustで書かれた次世代バンドラー**で、Webpackの後継として開発されています。

### Turbopack 有効化

```bash
# 開発サーバーをTurbopackで起動
next dev --turbopack
```

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start"
  }
}
```

### パフォーマンス比較（大規模アプリ）

| 操作 | Webpack | Turbopack | 改善率 |
|---|---|---|---|
| 初回起動 | 12秒 | 1.8秒 | 6.7倍 |
| ルート変更 | 3.5秒 | 0.2秒 | 17.5倍 |
| HMR（大ファイル） | 800ms | 50ms | 16倍 |

## Server Actions の改善

Next.js 15ではServer Actionsがより使いやすく改善されました。

### フォームなしでのServer Actions呼び出し

```typescript
// app/actions/product.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });
  revalidatePath('/products');
  return { success: true };
}
```

```typescript
// app/components/ProductCard.tsx
'use client';

import { deleteProduct } from '../actions/product';
import { useTransition } from 'react';

export function ProductCard({ product }: { product: Product }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.success) {
        console.log('削除成功');
      }
    });
  };

  return (
    <div>
      <h3>{product.name}</h3>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-red-500"
      >
        {isPending ? '削除中...' : '削除'}
      </button>
    </div>
  );
}
```

## キャッシュ戦略の変更

Next.js 15では**デフォルトのキャッシュ動作が変更**されました。

```typescript
// Next.js 14まで: fetch は デフォルトでキャッシュ
const data = await fetch('/api/data'); // cache: 'force-cache' が default

// Next.js 15: fetch は デフォルトでキャッシュなし
const data = await fetch('/api/data'); // cache: 'no-store' が default

// 明示的にキャッシュする場合
const cachedData = await fetch('/api/data', {
  next: { revalidate: 3600 }, // 1時間キャッシュ
});
```

これにより、意図せず古いデータが表示されるバグが減少します。

## まとめ

Next.js 15の主要な変更点をまとめます。

- **React 19 完全サポート**: useActionState、useOptimistic など最新Reactが使える
- **PPR（Partial Pre-rendering）**: 静的と動的のハイブリッドレンダリングが可能
- **Turbopack 安定化**: 開発サーバーの起動・HMRが大幅高速化
- **Server Actions 改善**: フォーム以外からも自然に呼び出せる
- **キャッシュデフォルト変更**: `no-store` がデフォルトに（動的データのバグ減少）

新規プロジェクトはNext.js 15から始め、既存プロジェクトも積極的にアップグレードすることをお勧めします。
