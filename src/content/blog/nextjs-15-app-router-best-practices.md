---
title: 'Next.js 15 App Router設計パターン完全ガイド｜キャッシュ・並列ルート・インターセプト'
description: 'Next.js 15のApp Routerの実践的な設計パターンを解説。Parallel Routes、Intercepting Routes、キャッシュ戦略、Server Actions、Middleware活用法まで網羅。'
pubDate: '2026-03-05'
tags: ['Next.js', 'React', 'フロントエンド', 'TypeScript', 'Web開発']
---

## Next.js 15 App Routerの設計思想

Next.js 15のApp Routerは、React Server Components（RSC）をベースにした**サーバーファーストのアーキテクチャ**です。従来のPages Routerとは根本的に異なる設計が求められます。

### Pages Router vs App Routerの思想の違い

| 観点 | Pages Router | App Router |
|------|-------------|-----------|
| デフォルト | クライアント | **サーバー** |
| データ取得 | getServerSideProps等 | **コンポーネント内で直接await** |
| レイアウト | _app.tsx / _document.tsx | **layout.tsx（ネスト可能）** |
| ルーティング | ファイル名ベース | **フォルダ名ベース** |
| キャッシュ | 手動管理 | **自動キャッシュ + 再検証** |

---

## レイアウトパターン

### ネストレイアウト

```
app/
├── layout.tsx          # ルートレイアウト（グローバルナビ）
├── page.tsx            # トップページ
├── dashboard/
│   ├── layout.tsx      # ダッシュボード専用レイアウト（サイドバー）
│   ├── page.tsx        # /dashboard
│   ├── analytics/
│   │   └── page.tsx    # /dashboard/analytics
│   └── settings/
│       └── page.tsx    # /dashboard/settings
└── blog/
    ├── layout.tsx      # ブログ用レイアウト
    ├── page.tsx        # /blog（記事一覧）
    └── [slug]/
        └── page.tsx    # /blog/:slug（記事詳細）
```

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <aside className="w-64 border-r p-4">
        <nav>
          <Link href="/dashboard">概要</Link>
          <Link href="/dashboard/analytics">分析</Link>
          <Link href="/dashboard/settings">設定</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

**重要**: レイアウトはページ遷移時に**再レンダリングされない**。状態が保持されるため、サイドバーのスクロール位置などが維持されます。

---

## Parallel Routes（並列ルート）

同じレイアウト内で**複数のページを同時にレンダリング**するパターンです。

### ダッシュボードの例

```
app/dashboard/
├── layout.tsx
├── page.tsx
├── @analytics/
│   ├── page.tsx        # 分析パネル
│   └── loading.tsx     # 分析パネルのローディング
├── @notifications/
│   ├── page.tsx        # 通知パネル
│   └── loading.tsx     # 通知パネルのローディング
└── @revenue/
    └── page.tsx        # 収益パネル
```

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  notifications,
  revenue,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  notifications: React.ReactNode;
  revenue: React.ReactNode;
}) {
  return (
    <div>
      <div>{children}</div>
      <div className="grid grid-cols-2 gap-4">
        <Suspense fallback={<Skeleton />}>{analytics}</Suspense>
        <Suspense fallback={<Skeleton />}>{revenue}</Suspense>
      </div>
      <div>{notifications}</div>
    </div>
  );
}
```

### Parallel Routesの活用場面

- ダッシュボード（複数のデータパネル）
- モーダル + 背景ページの同時表示
- 条件付きルーティング（認証状態で表示分岐）

---

## Intercepting Routes（インターセプトルート）

現在のレイアウトを維持したまま、別のルートのコンテンツを**モーダルとして表示**するパターンです。

### 写真ギャラリーの例

```
app/
├── photos/
│   ├── page.tsx              # /photos（写真一覧）
│   └── [id]/
│       └── page.tsx          # /photos/123（写真詳細ページ）
├── @modal/
│   └── (.)photos/[id]/
│       └── page.tsx          # 写真詳細をモーダルで表示
└── layout.tsx
```

```tsx
// app/@modal/(.)photos/[id]/page.tsx
// 写真一覧からクリック → このモーダルが表示
// 直接URLアクセス → photos/[id]/page.tsx が表示
export default async function PhotoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const photo = await getPhoto(id);

  return (
    <Modal>
      <img src={photo.url} alt={photo.title} />
      <h2>{photo.title}</h2>
    </Modal>
  );
}
```

### インターセプト記法

| 記法 | 意味 |
|------|------|
| `(.)` | 同じ階層のルートをインターセプト |
| `(..)` | 1つ上の階層 |
| `(..)(..)` | 2つ上の階層 |
| `(...)` | ルートからインターセプト |

---

## キャッシュ戦略

Next.js 15ではキャッシュの挙動が大きく変更されました。

### Next.js 15のキャッシュデフォルト

```tsx
// Next.js 15: fetchはデフォルトで「キャッシュなし」
// (Next.js 14ではデフォルトでキャッシュされていた)

// キャッシュなし（デフォルト）
const data = await fetch('https://api.example.com/posts');

// 明示的にキャッシュ
const data = await fetch('https://api.example.com/posts', {
  cache: 'force-cache',
});

// 時間ベースの再検証
const data = await fetch('https://api.example.com/posts', {
  next: { revalidate: 3600 }, // 1時間ごとに再検証
});

// タグベースの再検証
const data = await fetch('https://api.example.com/posts', {
  next: { tags: ['posts'] },
});
```

### revalidatePath と revalidateTag

```tsx
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function createPost(formData: FormData) {
  await db.insert('posts', {
    title: formData.get('title'),
    content: formData.get('content'),
  });

  // パスベースの再検証
  revalidatePath('/blog');

  // タグベースの再検証（より細かい制御）
  revalidateTag('posts');
}
```

### キャッシュ戦略の使い分け

| パターン | 設定 | ユースケース |
|---------|------|------------|
| **静的** | `force-cache` | マスターデータ、設定値 |
| **ISR** | `revalidate: 3600` | ブログ記事、商品情報 |
| **動的** | `no-store`（デフォルト） | ダッシュボード、リアルタイムデータ |
| **オンデマンド** | `revalidateTag` | CMS更新時、データ変更時 |

---

## Server Actionsの設計パターン

### 基本パターン：フォーム送信

```tsx
// app/actions/post.ts
'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

const PostSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100),
  content: z.string().min(10, '10文字以上入力してください'),
  category: z.enum(['tech', 'business', 'life']),
});

export async function createPost(
  prevState: { errors: Record<string, string[]> } | null,
  formData: FormData
) {
  const result = PostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    category: formData.get('category'),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const post = await db.insert('posts', result.data);
  revalidateTag('posts');
  redirect(`/blog/${post.slug}`);
}
```

### 楽観的更新パターン

```tsx
'use client';

import { useOptimistic } from 'react';
import { toggleLike } from '@/app/actions/like';

export function LikeButton({
  postId,
  isLiked,
  likeCount,
}: {
  postId: string;
  isLiked: boolean;
  likeCount: number;
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    { isLiked, likeCount },
    (current, action: 'like' | 'unlike') => ({
      isLiked: action === 'like',
      likeCount: current.likeCount + (action === 'like' ? 1 : -1),
    })
  );

  return (
    <form
      action={async () => {
        const action = optimistic.isLiked ? 'unlike' : 'like';
        setOptimistic(action);
        await toggleLike(postId, action);
      }}
    >
      <button>
        {optimistic.isLiked ? '❤️' : '🤍'} {optimistic.likeCount}
      </button>
    </form>
  );
}
```

---

## Middlewareの活用

### 認証チェック

```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/settings', '/admin'];
const authRoutes = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // 認証が必要なルートへのアクセス
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 認証済みユーザーがログインページにアクセス
  if (authRoutes.includes(pathname) && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 国際化（i18n）

```tsx
// middleware.ts
const locales = ['ja', 'en', 'zh'];
const defaultLocale = 'ja';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ロケールがパスに含まれているか確認
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Accept-Languageヘッダーからロケールを判定
  const acceptLang = request.headers.get('accept-language');
  const locale = detectLocale(acceptLang) || defaultLocale;

  return NextResponse.redirect(
    new URL(`/${locale}${pathname}`, request.url)
  );
}
```

---

## エラーハンドリング

### error.tsx

```tsx
// app/dashboard/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-bold text-red-600">
        エラーが発生しました
      </h2>
      <p className="mt-2 text-gray-600">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        再試行
      </button>
    </div>
  );
}
```

### not-found.tsx

```tsx
// app/blog/[slug]/not-found.tsx
export default function NotFound() {
  return (
    <div className="p-8 text-center">
      <h2 className="text-2xl font-bold">記事が見つかりません</h2>
      <p className="mt-2">お探しの記事は存在しないか、削除された可能性があります。</p>
      <Link href="/blog" className="mt-4 inline-block text-blue-500">
        記事一覧に戻る
      </Link>
    </div>
  );
}
```

---

## パフォーマンス最適化

### Streamingと Suspense

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function Dashboard() {
  return (
    <div>
      <h1>ダッシュボード</h1>

      {/* 高速なデータは即座に表示 */}
      <UserGreeting />

      {/* 遅いデータはストリーミング */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <Analytics />
      </Suspense>

      <Suspense fallback={<RevenueSkeleton />}>
        <RevenueChart />
      </Suspense>
    </div>
  );
}

// 各コンポーネントは独立してデータ取得
async function Analytics() {
  const data = await getAnalytics(); // 3秒かかる
  return <AnalyticsPanel data={data} />;
}

async function RevenueChart() {
  const data = await getRevenue(); // 5秒かかる
  return <Chart data={data} />;
}
```

### generateStaticParams

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(post => ({ slug: post.slug }));
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

---

## まとめ：App Routerの設計原則

1. **サーバーファースト**: デフォルトはServer Component。`'use client'`は必要な箇所のみ
2. **コロケーション**: 関連ファイルをルートフォルダ内にまとめる
3. **ストリーミング**: Suspenseで段階的にコンテンツを表示
4. **キャッシュ意識**: データの性質に応じたキャッシュ戦略を選択
5. **Server Actions**: API Routeの代わりにServer Actionsを活用
6. **レイアウトの活用**: 共通UIはlayout.tsxに、再レンダリングを最小化

App Routerは従来のSPAの考え方から脱却し、**サーバーとクライアントの最適な分離**を実現するアーキテクチャです。この設計パターンをマスターすれば、パフォーマンスとDXの両方を高いレベルで実現できます。
