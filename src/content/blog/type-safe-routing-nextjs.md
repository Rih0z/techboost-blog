---
title: "Next.jsで型安全なルーティングを実現する方法【2026年最新】"
description: "Next.js App Routerで型安全なルーティングを実装する方法を徹底解説。next-safe-navigation、pathpida、独自型定義など複数のアプローチを比較します。Next.js・TypeScript・App Routerに関する実践情報。"
pubDate: "2026-02-05"
tags: ["Next.js", "TypeScript", "App Router", "Type Safety", "Routing"]
heroImage: '../../assets/thumbnails/type-safe-routing-nextjs.jpg'
---
Next.jsのApp Routerは強力ですが、標準では型安全性が保証されていません。URLの文字列を直接書くと、タイポやパラメータの渡し忘れに気づけません。この記事では、Next.jsで型安全なルーティングを実現する複数の方法を紹介し、プロジェクトに最適なアプローチを見つける手助けをします。

## 問題点: 型安全でないルーティング

```typescript
// 問題1: タイポに気づけない
<Link href="/blgo/post-1">記事を見る</Link> // /blog が /blgo に

// 問題2: パラメータの型が不明
router.push(`/user/${userId}`) // userIdは何型?

// 問題3: クエリパラメータの型安全性がない
router.push(`/search?q=${query}&page=${page}`)

// 問題4: 存在しないルートへのリンク
<Link href="/non-existent-page">リンク</Link> // ビルド時にエラーにならない
```

## アプローチ1: next-safe-navigation

`next-safe-navigation`は、ファイルシステムベースのルーティングから自動的に型を生成します。

### インストールと設定

```bash
npm install next-safe-navigation
```

```typescript
// lib/navigation.ts
import { createNavigationConfig } from "next-safe-navigation";

export const { Link, redirect, useRouter, usePathname } = createNavigationConfig(
  // App Routerの型情報を自動生成
  (defineRoute) => ({
    home: defineRoute("/"),
    blog: defineRoute("/blog"),
    post: defineRoute("/blog/[slug]", {
      params: (slug: string) => ({ slug }),
    }),
    user: defineRoute("/user/[id]", {
      params: (id: number) => ({ id: id.toString() }),
      searchParams: (filters?: { page?: number; sort?: "asc" | "desc" }) => filters,
    }),
  })
);
```

### 使用例

```typescript
// app/page.tsx
import { Link } from "@/lib/navigation";

export default function Home() {
  return (
    <div>
      {/* 型安全なリンク */}
      <Link route="home">ホーム</Link>
      <Link route="blog">ブログ一覧</Link>

      {/* パラメータ付きルート */}
      <Link route="post" params={{ slug: "hello-world" }}>
        記事を見る
      </Link>

      {/* クエリパラメータ */}
      <Link
        route="user"
        params={{ id: 123 }}
        searchParams={{ page: 1, sort: "desc" }}
      >
        ユーザーページ
      </Link>
    </div>
  );
}

// app/components/Navigation.tsx
"use client";

import { useRouter } from "@/lib/navigation";

export function Navigation() {
  const router = useRouter();

  const handleClick = () => {
    // 型安全なナビゲーション
    router.push("post", { slug: "hello-world" });

    // エラー: 必須パラメータが不足
    // router.push("post"); // TypeScriptエラー

    // エラー: 存在しないルート
    // router.push("invalid-route"); // TypeScriptエラー
  };

  return <button onClick={handleClick}>記事へ移動</button>;
}
```

## アプローチ2: pathpida

pathpidaは、ファイルシステムから自動的にパス型を生成するツールです。

### インストールと設定

```bash
npm install -D pathpida
```

```json
// package.json
{
  "scripts": {
    "dev": "pathpida --watch & next dev",
    "build": "pathpida && next build"
  }
}
```

### 使用例

```typescript
// pathpidaが自動生成する型
// lib/$path.ts (自動生成)
export const pagesPath = {
  blog: {
    _slug: (slug: string | number) => ({
      $url: (url?: { hash?: string }) => ({
        pathname: '/blog/[slug]' as const,
        query: { slug },
        hash: url?.hash
      })
    })
  },
  user: {
    _id: (id: string | number) => ({
      $url: (url?: { query?: { page?: number }, hash?: string }) => ({
        pathname: '/user/[id]' as const,
        query: { id, ...url?.query },
        hash: url?.hash
      })
    })
  }
}

// 使用
import { pagesPath } from "@/lib/$path";
import Link from "next/link";

export default function Page() {
  return (
    <div>
      <Link href={pagesPath.blog._slug("hello-world").$url()}>
        記事を見る
      </Link>

      <Link href={pagesPath.user._id(123).$url({ query: { page: 1 } })}>
        ユーザーページ
      </Link>
    </div>
  );
}
```

## アプローチ3: 独自の型定義

小規模プロジェクトなら、独自の型定義で十分です。

```typescript
// lib/routes.ts
import type { Route } from "next";

// ルート定義
export const routes = {
  home: "/" as Route,
  blog: "/blog" as Route,
  post: (slug: string) => `/blog/${slug}` as Route,
  user: (id: number, params?: { page?: number; sort?: "asc" | "desc" }) => {
    const base = `/user/${id}`;
    if (!params) return base as Route;

    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.sort) query.set("sort", params.sort);

    return `${base}?${query.toString()}` as Route;
  },
} as const;

// 型ヘルパー
export type RouteKey = keyof typeof routes;

// 使用例
import Link from "next/link";
import { routes } from "@/lib/routes";

export default function Page() {
  return (
    <div>
      <Link href={routes.home}>ホーム</Link>
      <Link href={routes.blog}>ブログ</Link>
      <Link href={routes.post("hello-world")}>記事</Link>
      <Link href={routes.user(123, { page: 1, sort: "desc" })}>
        ユーザー
      </Link>
    </div>
  );
}
```

## アプローチ4: Zodでバリデーション

パラメータの型をZodで厳密に定義する方法です。

```typescript
// lib/routes.ts
import { z } from "zod";

// パラメータスキーマ
const postParamsSchema = z.object({
  slug: z.string().min(1),
});

const userParamsSchema = z.object({
  id: z.number().int().positive(),
});

const userSearchParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  sort: z.enum(["asc", "desc"]).optional(),
});

// ルートビルダー
export const routes = {
  home: () => "/",
  blog: () => "/blog",
  post: (params: z.infer<typeof postParamsSchema>) => {
    const validated = postParamsSchema.parse(params);
    return `/blog/${validated.slug}`;
  },
  user: (
    params: z.infer<typeof userParamsSchema>,
    searchParams?: z.infer<typeof userSearchParamsSchema>
  ) => {
    const validatedParams = userParamsSchema.parse(params);
    const validatedSearchParams = searchParams
      ? userSearchParamsSchema.parse(searchParams)
      : undefined;

    let url = `/user/${validatedParams.id}`;

    if (validatedSearchParams) {
      const query = new URLSearchParams();
      if (validatedSearchParams.page) {
        query.set("page", validatedSearchParams.page.toString());
      }
      if (validatedSearchParams.sort) {
        query.set("sort", validatedSearchParams.sort);
      }
      url += `?${query.toString()}`;
    }

    return url;
  },
} as const;

// 使用例
import Link from "next/link";
import { routes } from "@/lib/routes";

export default function Page() {
  return (
    <div>
      {/* 正しい使用 */}
      <Link href={routes.post({ slug: "hello-world" })}>記事</Link>

      {/* 実行時エラー: slugが空文字 */}
      {/* <Link href={routes.post({ slug: "" })}>記事</Link> */}

      {/* TypeScriptエラー: idが文字列 */}
      {/* <Link href={routes.user({ id: "123" })}>ユーザー</Link> */}

      {/* 正しい使用 */}
      <Link href={routes.user({ id: 123 }, { page: 1, sort: "desc" })}>
        ユーザー
      </Link>
    </div>
  );
}
```

## アプローチ5: TanStack Router的アプローチ

TanStack Routerのような完全な型安全ルーターをNext.jsに実装することも可能です。

```typescript
// lib/router.ts
import { useRouter as useNextRouter } from "next/navigation";
import type { Route } from "next";

type RouteConfig = {
  path: string;
  params?: Record<string, "string" | "number">;
  searchParams?: Record<string, "string" | "number" | "boolean">;
};

type InferParams<T extends RouteConfig> = T["params"] extends Record<
  string,
  infer P
>
  ? {
      [K in keyof T["params"]]: T["params"][K] extends "string"
        ? string
        : T["params"][K] extends "number"
        ? number
        : never;
    }
  : never;

type InferSearchParams<T extends RouteConfig> = T["searchParams"] extends Record<
  string,
  infer P
>
  ? {
      [K in keyof T["searchParams"]]?: T["searchParams"][K] extends "string"
        ? string
        : T["searchParams"][K] extends "number"
        ? number
        : T["searchParams"][K] extends "boolean"
        ? boolean
        : never;
    }
  : never;

// ルート定義
const routeConfig = {
  home: {
    path: "/",
  },
  blog: {
    path: "/blog",
  },
  post: {
    path: "/blog/[slug]",
    params: { slug: "string" as const },
  },
  user: {
    path: "/user/[id]",
    params: { id: "number" as const },
    searchParams: {
      page: "number" as const,
      sort: "string" as const,
    },
  },
} as const;

type RouteKeys = keyof typeof routeConfig;

type BuildRouteParams<K extends RouteKeys> = InferParams<
  (typeof routeConfig)[K]
> extends never
  ? [params?: never]
  : [params: InferParams<(typeof routeConfig)[K]>];

type BuildRouteSearchParams<K extends RouteKeys> = InferSearchParams<
  (typeof routeConfig)[K]
> extends never
  ? [searchParams?: never]
  : [searchParams?: InferSearchParams<(typeof routeConfig)[K]>];

export function buildRoute<K extends RouteKeys>(
  key: K,
  ...args: [...BuildRouteParams<K>, ...BuildRouteSearchParams<K>]
): Route {
  const config = routeConfig[key];
  let path = config.path;

  const [params, searchParams] = args as [any, any];

  // パラメータの置換
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`[${key}]`, String(value));
    });
  }

  // クエリパラメータの追加
  if (searchParams) {
    const query = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined) {
        query.set(key, String(value));
      }
    });
    const queryString = query.toString();
    if (queryString) {
      path += `?${queryString}`;
    }
  }

  return path as Route;
}

// カスタムフック
export function useTypedRouter() {
  const router = useNextRouter();

  return {
    push: <K extends RouteKeys>(
      key: K,
      ...args: [...BuildRouteParams<K>, ...BuildRouteSearchParams<K>]
    ) => {
      router.push(buildRoute(key, ...args));
    },
    replace: <K extends RouteKeys>(
      key: K,
      ...args: [...BuildRouteParams<K>, ...BuildRouteSearchParams<K>]
    ) => {
      router.replace(buildRoute(key, ...args));
    },
  };
}

// 使用例
"use client";

import { buildRoute, useTypedRouter } from "@/lib/router";
import Link from "next/link";

export default function Page() {
  const router = useTypedRouter();

  return (
    <div>
      {/* Link */}
      <Link href={buildRoute("home")}>ホーム</Link>
      <Link href={buildRoute("post", { slug: "hello-world" })}>記事</Link>
      <Link href={buildRoute("user", { id: 123 }, { page: 1, sort: "desc" })}>
        ユーザー
      </Link>

      {/* プログラマティックナビゲーション */}
      <button onClick={() => router.push("post", { slug: "hello-world" })}>
        記事へ移動
      </button>

      <button onClick={() => router.push("user", { id: 123 }, { page: 1 })}>
        ユーザーページへ
      </button>
    </div>
  );
}
```

## 比較表

| アプローチ | 型安全性 | 自動生成 | 学習コスト | おすすめ規模 |
|-----------|---------|---------|-----------|-------------|
| next-safe-navigation | ⭐⭐⭐⭐⭐ | ❌ | 低 | 中〜大 |
| pathpida | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 中 | 中〜大 |
| 独自型定義 | ⭐⭐⭐ | ❌ | 低 | 小〜中 |
| Zod検証 | ⭐⭐⭐⭐⭐ | ❌ | 中 | 中〜大 |
| TanStack Router的 | ⭐⭐⭐⭐⭐ | ❌ | 高 | 大 |

## まとめ

Next.jsで型安全なルーティングを実現する方法は複数あります。プロジェクトの規模や要件に応じて選択しましょう。

**小規模プロジェクト**: 独自の型定義で十分
**中規模プロジェクト**: next-safe-navigationまたはpathpida
**大規模プロジェクト**: TanStack Router的アプローチ + Zod検証

どのアプローチを選んでも、型安全性を導入することで、ランタイムエラーを大幅に減らし、開発体験が向上します。
