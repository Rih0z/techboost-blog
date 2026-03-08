---
title: "UnJSエコシステム完全ガイド - Nitro, H3, ofetch, etc."
description: "UnJSが提供する高品質なJavaScript/TypeScriptライブラリ群を解説します。Nitro、H3、ofetch、unimportなど、フルスタック開発を効率化する強力なツールの使い方を学びます。サンプルコード付きで実践的に解説。"
pubDate: "2025-02-05"
tags: ['プログラミング', '開発ツール']
heroImage: '../../assets/thumbnails/unjs-ecosystem-guide.jpg'
---
## UnJSエコシステムとは

UnJS（https://unjs.io）は、高品質で再利用可能なJavaScript/TypeScriptライブラリ群を提供するプロジェクトです。Nuxtチームが中心となって開発しており、フレームワークに依存しないユニバーサルなツールを目指しています。

### UnJSの特徴

- **フレームワーク非依存**: どこでも使える汎用ライブラリ
- **TypeScript完全対応**: 型安全性が高い
- **モダンなAPI設計**: 直感的で使いやすい
- **高いパフォーマンス**: 効率的な実装
- **活発な開発**: 継続的な改善とメンテナンス

### 主要なライブラリ

- **Nitro**: サーバーレスフレームワーク
- **H3**: HTTPフレームワーク
- **ofetch**: より良いfetch API
- **unimport**: 自動インポート
- **unbuild**: ライブラリビルドツール
- **ufo**: URL処理ユーティリティ
- **defu**: オブジェクトマージユーティリティ

## Nitro - ユニバーサルサーバーフレームワーク

Nitroは、あらゆるプラットフォームにデプロイできるサーバーレスアプリケーションフレームワークです。

### Nitroのセットアップ

```bash
npx giget@latest nitro my-nitro-app
cd my-nitro-app
npm install
npm run dev
```

### 基本的なAPI作成

```typescript
// routes/hello.ts
export default defineEventHandler((event) => {
  return {
    message: 'Hello from Nitro!',
    timestamp: new Date().toISOString(),
  };
});
```

### パラメータの処理

```typescript
// routes/users/[id].ts
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id');

  return {
    userId: id,
    name: `User ${id}`,
  };
});
```

クエリパラメータの処理:

```typescript
// routes/search.ts
export default defineEventHandler((event) => {
  const query = getQuery(event);
  const { q, page = 1, limit = 10 } = query;

  return {
    query: q,
    page: Number(page),
    limit: Number(limit),
    results: [], // 実際の検索結果
  };
});
```

### POSTリクエストの処理

```typescript
// routes/api/users.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // バリデーション
  if (!body.name || !body.email) {
    throw createError({
      statusCode: 400,
      message: 'Name and email are required',
    });
  }

  // データベースに保存（例）
  const user = {
    id: generateId(),
    name: body.name,
    email: body.email,
    createdAt: new Date().toISOString(),
  };

  return user;
});
```

### ミドルウェア

```typescript
// middleware/auth.ts
export default defineEventHandler((event) => {
  const token = getHeader(event, 'authorization');

  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // トークン検証
  const user = verifyToken(token);
  event.context.user = user;
});
```

特定のルートにのみ適用:

```typescript
// routes/api/protected.ts
export default defineEventHandler(async (event) => {
  // ミドルウェアで設定されたユーザー情報にアクセス
  const user = event.context.user;

  return {
    message: 'Protected data',
    user,
  };
});
```

### データベース統合（Drizzle ORM）

```typescript
// utils/db.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite);
```

```typescript
// routes/api/posts.get.ts
import { db } from '~/utils/db';
import { posts } from '~/db/schema';

export default defineEventHandler(async (event) => {
  const allPosts = await db.select().from(posts);
  return allPosts;
});
```

### キャッシング

```typescript
// routes/api/expensive-operation.ts
export default defineCachedEventHandler(
  async (event) => {
    // 重い処理
    const result = await performExpensiveOperation();
    return result;
  },
  {
    maxAge: 60 * 60, // 1時間キャッシュ
    getKey: (event) => {
      // キャッシュキーのカスタマイズ
      const userId = event.context.user?.id;
      return `expensive-op-${userId}`;
    },
  }
);
```

## H3 - ミニマルHTTPフレームワーク

H3は、Nitroの基盤となっているHTTPフレームワークです。単独でも使用できます。

### H3のセットアップ

```bash
npm install h3
```

### 基本的なサーバー

```typescript
import { createApp, createRouter, defineEventHandler } from 'h3';
import { createServer } from 'node:http';

const app = createApp();
const router = createRouter();

router.get('/hello', defineEventHandler(() => {
  return { message: 'Hello from H3!' };
}));

router.post('/users', defineEventHandler(async (event) => {
  const body = await readBody(event);
  return { created: true, user: body };
}));

app.use(router);

createServer(app).listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### エラーハンドリング

```typescript
import { createError } from 'h3';

router.get('/error', defineEventHandler(() => {
  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
    message: 'Something went wrong',
  });
}));

// グローバルエラーハンドラー
app.use(defineEventHandler((event) => {
  event.node.res.on('error', (error) => {
    console.error('Response error:', error);
  });
}));
```

### CORS設定

```typescript
import { handleCors } from 'h3';

app.use(defineEventHandler((event) => {
  handleCors(event, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
  });
}));
```

## ofetch - 改良版fetch API

ofetchは、ネイティブfetchのラッパーで、より使いやすく強力な機能を提供します。

### 基本的な使い方

```typescript
import { ofetch } from 'ofetch';

// GET リクエスト
const data = await ofetch('https://api.example.com/users');

// 自動的にJSONパース
console.log(data);
```

### クエリパラメータ

```typescript
const users = await ofetch('https://api.example.com/users', {
  query: {
    page: 1,
    limit: 20,
    sort: 'name',
  },
});
// → https://api.example.com/users?page=1&limit=20&sort=name
```

### POSTリクエスト

```typescript
const newUser = await ofetch('https://api.example.com/users', {
  method: 'POST',
  body: {
    name: 'John Doe',
    email: 'john@example.com',
  },
});
// 自動的にJSON.stringify()される
```

### エラーハンドリング

```typescript
try {
  const data = await ofetch('https://api.example.com/data');
} catch (error) {
  console.error('Request failed:', error.data);
  console.error('Status:', error.status);
}
```

### インターセプター

```typescript
const api = ofetch.create({
  baseURL: 'https://api.example.com',

  async onRequest({ request, options }) {
    // リクエスト前の処理
    const token = await getAuthToken();
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  },

  async onResponse({ response }) {
    // レスポンス後の処理
    console.log('Response received:', response.status);
  },

  async onResponseError({ response }) {
    // エラーレスポンスの処理
    if (response.status === 401) {
      await refreshToken();
    }
  },
});

const data = await api('/users');
```

### リトライ機能

```typescript
const data = await ofetch('https://api.example.com/data', {
  retry: 3,
  retryDelay: 1000, // 1秒待機
});
```

### タイムアウト

```typescript
const data = await ofetch('https://api.example.com/slow-endpoint', {
  timeout: 5000, // 5秒でタイムアウト
});
```

## unimport - 自動インポート

unimportは、よく使う関数やライブラリを自動的にインポートしてくれるツールです。

### Viteでの使用

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import Unimport from 'unimport/unplugin';

export default defineConfig({
  plugins: [
    Unimport.vite({
      imports: [
        // Vue 3の関数
        {
          from: 'vue',
          imports: ['ref', 'computed', 'reactive', 'watch'],
        },
        // カスタム関数
        {
          from: './utils/helpers',
          imports: ['formatDate', 'formatCurrency'],
        },
      ],
    }),
  ],
});
```

使用例:

```typescript
// インポート不要！
const count = ref(0);
const doubled = computed(() => count.value * 2);

const formatted = formatDate(new Date());
```

### プリセット

```typescript
Unimport.vite({
  presets: [
    'vue',
    'vue-router',
    'pinia',
  ],
});
```

## unbuild - ライブラリビルドツール

unbuildは、TypeScriptライブラリを簡単にビルドできるツールです。

### セットアップ

```bash
npm install -D unbuild
```

```json
// package.json
{
  "scripts": {
    "build": "unbuild"
  }
}
```

### 設定ファイル

```typescript
// build.config.ts
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
});
```

### 複数エントリポイント

```typescript
export default defineBuildConfig({
  entries: [
    'src/index',
    'src/client',
    'src/server',
  ],
  declaration: true,
});
```

## ufo - URL処理ユーティリティ

ufoは、URLの解析・操作を簡単にするライブラリです。

### URLの解析

```typescript
import { parseURL } from 'ufo';

const parsed = parseURL('https://example.com/path?foo=bar#hash');
console.log(parsed);
// {
//   protocol: 'https:',
//   host: 'example.com',
//   pathname: '/path',
//   search: '?foo=bar',
//   hash: '#hash'
// }
```

### URLの結合

```typescript
import { joinURL } from 'ufo';

const url = joinURL('https://example.com', 'api', 'users');
// → https://example.com/api/users
```

### クエリパラメータの操作

```typescript
import { withQuery, getQuery } from 'ufo';

const url = withQuery('https://api.example.com/search', {
  q: 'javascript',
  page: 1,
});
// → https://api.example.com/search?q=javascript&page=1

const query = getQuery('https://example.com?foo=bar&baz=qux');
// → { foo: 'bar', baz: 'qux' }
```

### 相対URLの解決

```typescript
import { resolveURL } from 'ufo';

const absolute = resolveURL('https://example.com/path', '../other');
// → https://example.com/other
```

## defu - オブジェクトマージユーティリティ

defuは、デフォルト値を持つオブジェクトマージを行います。

### 基本的な使い方

```typescript
import { defu } from 'defu';

const defaults = {
  theme: 'light',
  fontSize: 14,
  features: {
    darkMode: false,
    animations: true,
  },
};

const userConfig = {
  theme: 'dark',
  features: {
    darkMode: true,
  },
};

const config = defu(userConfig, defaults);
// {
//   theme: 'dark',
//   fontSize: 14,
//   features: {
//     darkMode: true,
//     animations: true
//   }
// }
```

### 配列のマージ

```typescript
import { defuArrayFn } from 'defu';

const merged = defuArrayFn(
  { tags: ['new'] },
  { tags: ['default', 'tags'] }
);
// { tags: ['new', 'default', 'tags'] }
```

## 実践例: フルスタックアプリケーション

UnJSライブラリを組み合わせた実践的な例:

```typescript
// server/api/users/[id].ts
import { ofetch } from 'ofetch';
import { withQuery } from 'ufo';
import { defu } from 'defu';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const query = getQuery(event);

  // デフォルト設定とマージ
  const options = defu(query, {
    include: 'posts',
    limit: 10,
  });

  // 外部APIを呼び出し
  const url = withQuery(`https://api.example.com/users/${id}`, options);
  const user = await ofetch(url);

  return user;
});
```

```typescript
// composables/useApi.ts
import { ofetch } from 'ofetch';

export function useApi() {
  const api = ofetch.create({
    baseURL: '/api',

    async onRequest({ options }) {
      const token = localStorage.getItem('token');
      if (token) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    },

    async onResponseError({ response }) {
      if (response.status === 401) {
        // 認証エラー処理
        navigateTo('/login');
      }
    },
  });

  return {
    getUsers: () => api('/users'),
    getUser: (id: string) => api(`/users/${id}`),
    createUser: (data: any) => api('/users', { method: 'POST', body: data }),
  };
}
```

## まとめ

UnJSエコシステムは、モダンなJavaScript/TypeScript開発を効率化する強力なツール群です:

- **Nitro**: ユニバーサルサーバーフレームワーク
- **H3**: 軽量HTTPフレームワーク
- **ofetch**: 改良版fetch API
- **unimport**: 自動インポート
- **unbuild**: ライブラリビルドツール
- **ufo**: URL処理ユーティリティ
- **defu**: オブジェクトマージ

これらのライブラリは独立して使用できますが、組み合わせることでさらに強力な開発環境を構築できます。ぜひプロジェクトで活用してみてください。
