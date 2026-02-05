---
title: 'Remixフレームワーク完全ガイド - Next.jsとの違いと実践的な使い方【2026年版】'
description: 'ReactベースのフルスタックフレームワークRemixの基礎から応用まで。Next.jsとの違い、ルーティング、データ取得、フォーム処理など実践的な使い方を徹底解説します。'
pubDate: 'Feb 05 2026'
tags: ['Remix', 'React', 'フルスタック']
---

Remixは、Reactをベースとしたフルスタックフレームワークで、Webの基本に立ち返った設計思想が特徴です。2022年にオープンソース化され、2026年現在ではShopifyに買収されて開発が加速しています。

## Remixの特徴

### 1. Webプラットフォームファースト

RemixはWeb標準を最大限活用します。独自APIを最小限に抑え、ブラウザネイティブの機能を優先的に使用します。

**Web標準の活用例:**
- FormData API（フォーム処理）
- Request/Response API（データ取得）
- URLSearchParams（検索パラメータ）

### 2. ネストされたルーティング

Remixの最大の特徴は、UI階層とルート階層が一致する「ネストルーティング」です。

```
app/
  routes/
    _index.tsx          # /
    about.tsx           # /about
    blog._index.tsx     # /blog
    blog.$slug.tsx      # /blog/awesome-post
    dashboard.tsx       # /dashboard (レイアウト)
    dashboard._index.tsx # /dashboard (コンテンツ)
    dashboard.settings.tsx # /dashboard/settings
```

### 3. サーバーとクライアントのシームレスな統合

loaderとactionを使って、サーバーサイドとクライアントサイドのコードを同じファイルに書けます。

## Next.jsとの違い

| 項目 | Remix | Next.js |
|------|-------|---------|
| データ取得 | loader関数 | getServerSideProps等 |
| フォーム処理 | action + FormData | API Routes + useState |
| ルーティング | ネストルート優先 | フラット + Parallel Routes |
| デプロイ先 | エッジ対応多数 | Vercel最適化 |
| 学習曲線 | Web標準重視 | React重視 |

## Remixプロジェクトの始め方

```bash
# プロジェクト作成
npx create-remix@latest my-remix-app

# 開発サーバー起動
cd my-remix-app
npm run dev
```

プロジェクト作成時に選択肢が表示されます:
- デプロイ先（Vercel、Cloudflare Workers、Node.jsなど）
- TypeScript or JavaScript
- パッケージマネージャー

## 基本的なルート構成

### シンプルなページ

```typescript
// app/routes/about.tsx
export default function About() {
  return (
    <div>
      <h1>About Us</h1>
      <p>Remixで構築されたWebサイトです。</p>
    </div>
  );
}
```

### データを取得するページ

```typescript
// app/routes/blog._index.tsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export async function loader() {
  const posts = await db.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return json({ posts });
}

export default function BlogIndex() {
  const { posts } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>ブログ記事一覧</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <a href={`/blog/${post.slug}`}>{post.title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 動的ルート

```typescript
// app/routes/blog.$slug.tsx
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export async function loader({ params }: LoaderFunctionArgs) {
  const post = await db.post.findUnique({
    where: { slug: params.slug },
  });

  if (!post) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ post });
}

export default function BlogPost() {
  const { post } = useLoaderData<typeof loader>();

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

## フォーム処理とaction

Remixの真骨頂は、フォーム処理の簡潔さです。

```typescript
// app/routes/contact.tsx
import { json, ActionFunctionArgs, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get("name");
  const email = formData.get("email");
  const message = formData.get("message");

  // バリデーション
  const errors: Record<string, string> = {};
  if (!name) errors.name = "名前は必須です";
  if (!email) errors.email = "メールアドレスは必須です";
  if (!message) errors.message = "メッセージは必須です";

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  // データベースに保存
  await db.contact.create({
    data: { name, email, message },
  });

  return redirect("/contact/success");
}

export default function Contact() {
  const actionData = useActionData<typeof action>();

  return (
    <Form method="post">
      <div>
        <label htmlFor="name">名前</label>
        <input type="text" name="name" id="name" required />
        {actionData?.errors?.name && (
          <span className="error">{actionData.errors.name}</span>
        )}
      </div>

      <div>
        <label htmlFor="email">メールアドレス</label>
        <input type="email" name="email" id="email" required />
        {actionData?.errors?.email && (
          <span className="error">{actionData.errors.email}</span>
        )}
      </div>

      <div>
        <label htmlFor="message">メッセージ</label>
        <textarea name="message" id="message" required />
        {actionData?.errors?.message && (
          <span className="error">{actionData.errors.message}</span>
        )}
      </div>

      <button type="submit">送信</button>
    </Form>
  );
}
```

JavaScriptが無効でも動作するのがRemixの強みです。

## ネストレイアウト

```typescript
// app/routes/dashboard.tsx (レイアウト)
import { Outlet } from "@remix-run/react";

export default function DashboardLayout() {
  return (
    <div className="dashboard">
      <nav>
        <a href="/dashboard">ダッシュボード</a>
        <a href="/dashboard/settings">設定</a>
        <a href="/dashboard/profile">プロフィール</a>
      </nav>
      <main>
        <Outlet /> {/* 子ルートがここに表示される */}
      </main>
    </div>
  );
}
```

```typescript
// app/routes/dashboard._index.tsx
export default function DashboardIndex() {
  return <h1>ダッシュボードへようこそ</h1>;
}
```

## エラーハンドリング

```typescript
// app/routes/blog.$slug.tsx
import { useRouteError, isRouteErrorResponse } from "@remix-run/react";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <div>
          <h1>記事が見つかりません</h1>
          <p>お探しの記事は存在しないか、削除された可能性があります。</p>
        </div>
      );
    }
  }

  return (
    <div>
      <h1>エラーが発生しました</h1>
      <p>予期しないエラーが発生しました。</p>
    </div>
  );
}
```

## セッション管理

```typescript
// app/sessions.ts
import { createCookieSessionStorage } from "@remix-run/node";

export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: "__session",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 1週間
      path: "/",
      sameSite: "lax",
      secrets: [process.env.SESSION_SECRET!],
      secure: process.env.NODE_ENV === "production",
    },
  });
```

```typescript
// app/routes/login.tsx
import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { getSession, commitSession } from "~/sessions";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  const user = await verifyLogin(email, password);
  if (!user) {
    return json({ error: "認証に失敗しました" }, { status: 401 });
  }

  const session = await getSession(request.headers.get("Cookie"));
  session.set("userId", user.id);

  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}
```

## メタタグとSEO

```typescript
// app/routes/blog.$slug.tsx
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [{ title: "記事が見つかりません" }];
  }

  return [
    { title: data.post.title },
    { name: "description", content: data.post.description },
    { property: "og:title", content: data.post.title },
    { property: "og:description", content: data.post.description },
    { property: "og:image", content: data.post.ogImage },
  ];
};
```

## デプロイ

### Vercelへのデプロイ

```bash
npm install @vercel/remix
```

```javascript
// remix.config.js
export default {
  serverModuleFormat: "esm",
};
```

### Cloudflare Workersへのデプロイ

```bash
npm install @remix-run/cloudflare @cloudflare/workers-types
```

Cloudflare Workersなら、グローバルエッジで超高速動作します。

## まとめ

Remixは、Webの基本原則に立ち返りつつ、モダンな開発体験を提供するフレームワークです。特に以下の場合におすすめ:

- Web標準を重視した開発をしたい
- フォーム処理が多いアプリケーション
- JavaScriptなしでも動作するプログレッシブエンハンスメント
- エッジデプロイを活用したい

Next.jsと比較しながら選択するのが良いでしょう。どちらも優れたフレームワークですが、思想とアプローチが異なります。
