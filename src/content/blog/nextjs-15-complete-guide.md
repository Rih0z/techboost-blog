---
title: 'Next.js 15 完全ガイド — App Router・Server Actions・最新機能まとめ'
description: 'Next.js 15の新機能を完全網羅。App Router、Server Actions、Partial Prerendering、Turbopackなど、2026年の最新機能を実践的なコード例とともに解説します。React Server Componentsの活用法も詳しく紹介。'
pubDate: 'Feb 05 2026'
---

Next.js 15が2024年10月にリリースされ、2026年現在ではReactフレームワークのデファクトスタンダードとして完全に定着しました。この記事では、Next.js 15の主要機能を実践的なコード例とともに完全解説します。

## Next.js 15の主要アップデート

### 主な変更点

- **React 19 サポート** - React Compilerと完全統合
- **Turbopack 安定版** - 開発サーバーが最大76%高速化
- **Server Actions 安定版** - フォーム処理が劇的にシンプルに
- **Partial Prerendering (PPR) 実験的サポート** - 静的と動的の良いとこ取り
- **async Request APIs** - cookies(), headers()が非同期に
- **fetch Cache のデフォルト変更** - `cache: 'no-store'`がデフォルト

## App Router完全ガイド

Next.js 15ではApp Routerが標準となりました。Pages Routerも使えますが、新規プロジェクトではApp Routerを使いましょう。

### ディレクトリ構造

```
app/
├── layout.tsx          # ルートレイアウト
├── page.tsx            # トップページ（/）
├── about/
│   └── page.tsx        # /about
├── blog/
│   ├── page.tsx        # /blog
│   ├── [slug]/
│   │   └── page.tsx    # /blog/my-post
│   └── layout.tsx      # /blog配下共通レイアウト
├── api/
│   └── users/
│       └── route.ts    # API Route
└── error.tsx           # エラーページ
```

### page.tsx - ページコンポーネント

```typescript
// app/blog/page.tsx
export default function BlogPage() {
  return (
    <div>
      <h1>ブログ一覧</h1>
    </div>
  );
}

// ファイル名がURLになる
// page.tsx → アクセス可能
// BlogList.tsx → アクセス不可（コンポーネント）
```

### layout.tsx - 共通レイアウト

```typescript
// app/layout.tsx (ルートレイアウト)
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'My App',
  description: 'Created with Next.js 15',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <header>
          <nav>Header Navigation</nav>
        </header>
        <main>{children}</main>
        <footer>Footer Content</footer>
      </body>
    </html>
  );
}
```

レイアウトはネスト可能です。

```typescript
// app/blog/layout.tsx
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="blog-container">
      <aside>サイドバー</aside>
      <div className="content">{children}</div>
    </div>
  );
}
```

### ダイナミックルート

```typescript
// app/blog/[slug]/page.tsx
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function BlogPost({ params, searchParams }: Props) {
  // Next.js 15ではparamsとsearchParamsが非同期に
  const { slug } = await params;
  const search = await searchParams;

  return <h1>記事: {slug}</h1>;
}

// /blog/nextjs-guide → slug = 'nextjs-guide'
// /blog/react-tips?sort=date → slug = 'react-tips', search.sort = 'date'
```

### Catch-all Routes と Optional Catch-all

```typescript
// app/docs/[...slug]/page.tsx
// /docs/a → params.slug = ['a']
// /docs/a/b → params.slug = ['a', 'b']
// /docs/a/b/c → params.slug = ['a', 'b', 'c']

// app/shop/[[...slug]]/page.tsx (オプショナル)
// /shop → params.slug = undefined
// /shop/electronics → params.slug = ['electronics']
// /shop/electronics/phones → params.slug = ['electronics', 'phones']
```

## Server ComponentsとClient Components

Next.js 15のApp Routerでは、デフォルトですべてのコンポーネントが**Server Component**です。

### Server Component（デフォルト）

```typescript
// app/posts/page.tsx
// "use client" 指定なし = Server Component

async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    cache: 'no-store', // Next.js 15のデフォルト
  });
  return res.json();
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <div>
      {posts.map((post: any) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </div>
  );
}
```

**Server Componentのメリット:**
- データフェッチがサーバー側で完結
- バンドルサイズが小さくなる（クライアントにJSを送らない）
- SEOに有利
- 環境変数やAPIキーを直接使える

### Client Component

```typescript
// app/components/Counter.tsx
'use client'; // この行が必須

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

**Client Componentが必要な場合:**
- `useState`, `useEffect`などのReact Hooksを使う
- ブラウザAPI（`window`, `localStorage`等）を使う
- イベントハンドラ（`onClick`, `onChange`等）を使う
- カスタムフックを使う

### 組み合わせのベストプラクティス

```typescript
// app/dashboard/page.tsx (Server Component)
import ClientCounter from '@/components/Counter'; // Client Component

async function getDashboardData() {
  const res = await fetch('https://api.example.com/dashboard');
  return res.json();
}

export default async function Dashboard() {
  const data = await getDashboardData();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total Users: {data.totalUsers}</p>

      {/* Server ComponentからClient Componentを呼び出すのはOK */}
      <ClientCounter />
    </div>
  );
}
```

**重要:** Server ComponentをClient Componentの子として渡すことはできません。

```typescript
// ❌ これはNG
'use client';
import ServerComponent from './ServerComponent';

export default function ClientComponent() {
  return <ServerComponent />; // エラー
}

// ✅ これはOK - childrenとして渡す
'use client';
export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <div className="wrapper">{children}</div>;
}

// 親（Server Component）から使う
<ClientWrapper>
  <ServerComponent />
</ClientWrapper>
```

## Server Actions - フォーム処理の革命

Server Actionsは、クライアントからサーバー側の関数を直接呼び出せる機能です。Next.js 15で正式に安定版となりました。

### 基本的な使い方

```typescript
// app/actions/user.ts
'use server'; // Server Actionの宣言

import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  // データベースに保存
  await db.user.create({
    data: { name, email },
  });

  // キャッシュを再検証
  revalidatePath('/users');

  return { success: true };
}
```

### フォームから呼び出す

```typescript
// app/users/new/page.tsx
import { createUser } from '@/app/actions/user';

export default function NewUserPage() {
  return (
    <form action={createUser}>
      <input name="name" type="text" placeholder="名前" required />
      <input name="email" type="email" placeholder="メール" required />
      <button type="submit">作成</button>
    </form>
  );
}
```

JavaScriptなしでも動作します。プログレッシブエンハンスメントの原則に沿った設計です。

### useFormStateでローディング状態を管理

```typescript
// app/users/new/page.tsx
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createUser } from '@/app/actions/user';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? '送信中...' : '作成'}
    </button>
  );
}

export default function NewUserPage() {
  const [state, formAction] = useFormState(createUser, null);

  return (
    <form action={formAction}>
      <input name="name" type="text" placeholder="名前" required />
      <input name="email" type="email" placeholder="メール" required />
      <SubmitButton />
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

### Server Actionsのバリデーション

zodと組み合わせると型安全なバリデーションができます。

```typescript
// app/actions/user.ts
'use server';

import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(2, '名前は2文字以上必要です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
});

export async function createUser(formData: FormData) {
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
  };

  // バリデーション
  const result = UserSchema.safeParse(rawData);

  if (!result.success) {
    return {
      error: result.error.flatten().fieldErrors,
    };
  }

  // データベースに保存
  await db.user.create({ data: result.data });

  return { success: true };
}
```

## データフェッチの新しいパターン

### Next.js 15のfetchデフォルト変更

```typescript
// Next.js 14以前: デフォルトでキャッシュされる
fetch('https://api.example.com/data'); // cache: 'force-cache'

// Next.js 15: デフォルトでキャッシュされない
fetch('https://api.example.com/data'); // cache: 'no-store'
```

明示的にキャッシュしたい場合:

```typescript
// 60秒間キャッシュ
fetch('https://api.example.com/data', {
  next: { revalidate: 60 }
});

// 永続的にキャッシュ
fetch('https://api.example.com/data', {
  cache: 'force-cache'
});
```

### Parallel Data Fetching

```typescript
// 直列フェッチ（遅い）
const user = await fetchUser();
const posts = await fetchPosts(); // userの取得を待ってから実行

// 並列フェッチ（速い）
const [user, posts] = await Promise.all([
  fetchUser(),
  fetchPosts(),
]);
```

### Sequential Data Fetching（意図的な直列）

```typescript
async function Page() {
  // userIdが必要なので、直列で取得
  const user = await fetchUser();
  const posts = await fetchPostsByUserId(user.id);

  return <div>...</div>;
}
```

## Async Request APIs

Next.js 15では、`cookies()`, `headers()`, `params`, `searchParams`が非同期APIになりました。

```typescript
// app/api/route.ts
import { cookies, headers } from 'next/headers';

export async function GET() {
  // Next.js 15: awaitが必要
  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  const headersList = await headers();
  const userAgent = headersList.get('user-agent');

  return Response.json({ token, userAgent });
}
```

## Partial Prerendering (PPR) - 実験的機能

PPRは静的部分と動的部分を同じページで組み合わせられる画期的な機能です。

```typescript
// next.config.js
export default {
  experimental: {
    ppr: true,
  },
};
```

```typescript
// app/product/[id]/page.tsx
import { Suspense } from 'react';

// 静的部分
function ProductLayout() {
  return (
    <div>
      <header>Static Header</header>
      <Suspense fallback={<div>Loading...</div>}>
        {/* 動的部分 */}
        <DynamicContent />
      </Suspense>
    </div>
  );
}
```

PPRにより、ページの静的部分は即座に表示され、動的部分はストリーミングで後から読み込まれます。

## Turbopack - 開発サーバー高速化

```bash
# Next.js 15のデフォルト開発サーバー
npm run dev

# Turbopackを使用（next.config.jsで設定可能）
# 最大76%高速化
```

2026年現在、Turbopackはプロダクションビルドにも対応しています。

```javascript
// next.config.js
export default {
  experimental: {
    turbo: {
      // Turbopack設定
    },
  },
};
```

## まとめ

Next.js 15の主要機能をまとめます。

- **App Router** - ファイルベースルーティングの進化版
- **Server Components** - デフォルトでサーバー側レンダリング
- **Client Components** - インタラクティブな部分のみクライアント側に
- **Server Actions** - フォーム処理がシンプルに
- **Async Request APIs** - cookies(), headers()が非同期に
- **PPR** - 静的と動的のハイブリッドレンダリング
- **Turbopack** - 開発体験の劇的な向上

Next.js 15は、React Server Componentsを完全に活用した次世代のReactフレームワークです。最初は概念の理解に時間がかかるかもしれませんが、一度慣れれば、従来のPages Routerには戻れないほど快適な開発体験が得られます。

新しいプロジェクトを始めるなら、今すぐNext.js 15 + App Routerで始めましょう。
