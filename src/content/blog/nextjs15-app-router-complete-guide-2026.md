---
title: "Next.js 15 App Router完全ガイド2026：Server Actions・Partial Prerenderingの実践活用"
description: "Next.js 15の新機能を実践的に解説。Server Actionsのフォーム処理・Partial Prerendering（PPR）・Turbopack・React 19統合の使い方とベストプラクティス。"
pubDate: "2026-03-10"
tags:
  - "Next.js 15"
  - "App Router"
  - "Server Actions"
  - "React 19"
  - "PPR"
---

## Next.js 15の主要変更点

| 機能 | 変更内容 |
|------|---------|
| **Partial Prerendering（PPR）** | 安定版リリース。静的+動的を混在させる |
| **React 19** | 標準サポート |
| **Server Actions** | セキュリティ強化・`use cache`ディレクティブ |
| **Turbopack** | デフォルト有効（`next dev`が高速化） |
| **caching** | デフォルトがno-cacheに変更 |

---

## プロジェクトセットアップ

```bash
# 新規作成
npx create-next-app@latest my-app --typescript --tailwind --app --use-turbopack

# 既存プロジェクトのアップグレード
npm install next@latest react@latest react-dom@latest

# 自動マイグレーション
npx @next/codemod@latest upgrade latest
```

---

## Partial Prerendering（PPR）

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    ppr: true,
  },
};

export default config;
```

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      {/* 静的にプリレンダリング（即座に表示） */}
      <header>
        <h1>ダッシュボード</h1>
        <nav>...</nav>
      </header>

      {/* 動的データをストリーミング */}
      <Suspense fallback={<UserStatsSkeleton />}>
        <UserStats />
      </Suspense>

      <Suspense fallback={<RecentOrdersSkeleton />}>
        <RecentOrders />
      </Suspense>
    </div>
  );
}

async function UserStats() {
  const stats = await db.query.stats.findFirst();
  return <StatsCard data={stats} />;
}
```

---

## Server Actions：フォーム処理の新標準

```tsx
// app/actions/todo.ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const TodoSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100),
});

export async function createTodo(prevState: any, formData: FormData) {
  const validatedFields = TodoSchema.safeParse({
    title: formData.get('title'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'バリデーションエラー',
    };
  }

  await db.insert(todos).values({ title: validatedFields.data.title });
  revalidatePath('/todos');

  return { message: '作成しました！', errors: {} };
}
```

```tsx
// app/todos/create-form.tsx
'use client';

import { useActionState } from 'react'; // React 19
import { createTodo } from '@/app/actions/todo';

const initialState = { message: '', errors: {} };

export function CreateTodoForm() {
  const [state, formAction, isPending] = useActionState(createTodo, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <input
          name="title"
          type="text"
          placeholder="タイトル"
          className="border rounded px-3 py-2 w-full"
        />
        {state.errors?.title && (
          <p className="text-red-500 text-sm mt-1">{state.errors.title}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isPending ? '作成中...' : '作成する'}
      </button>

      {state.message && <p className="text-green-600">{state.message}</p>}
    </form>
  );
}
```

---

## `use cache`ディレクティブ：Next.js 15の新キャッシュAPI

```typescript
// 関数レベルのキャッシュ制御
async function getUser(id: string) {
  'use cache';
  import { cacheLife } from 'next/cache';
  cacheLife('hours'); // 1時間キャッシュ

  return db.query.users.findFirst({ where: eq(users.id, id) });
}
```

---

## Turbopackのパフォーマンス

```bash
# デフォルトで有効（--turbopack フラグ不要）
next dev

# ベンチマーク（大規模プロジェクト）
# webpack  : コールドスタート ~8秒、HMR ~3秒
# Turbopack: コールドスタート ~2秒、HMR ~0.3秒
```

---

## caching変更への注意

```typescript
// Next.js 14: fetch はデフォルトでキャッシュあり
// Next.js 15: fetch はデフォルトで no-cache

// Next.js 15での明示的なキャッシュ設定
const data = await fetch('/api/data', {
  next: { revalidate: 3600 }, // 1時間キャッシュ
});
```

---

## まとめ：Next.js 15のベストプラクティス

```
PPRを積極活用: ヘッダー・フッターは静的、データ部分は動的
Server Actionsでフォーム処理: API Routesは不要になるケースが増加
useActionStateで楽観的UI: pending中のローディング表示を統一
キャッシュはuse cacheで明示的に: デフォルトno-cacheの変更に注意
Turbopackで開発速度向上: 追加設定不要
```
