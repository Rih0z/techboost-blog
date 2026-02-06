---
title: "Waku：React Server Components対応の軽量フレームワーク"
description: "Wakuは最小限の構成でReact Server Componentsをサポートする新世代のReactフレームワーク。その特徴、使い方、Next.jsとの違いを詳しく解説します。"
pubDate: "2025-02-05"
---

Reactエコシステムにおいて、Next.jsやRemixといった成熟したフレームワークが主流となっていますが、2024年から注目を集めている新しいフレームワークがあります。それが**Waku**です。Wakuは「最小限の構成でReact Server Components（RSC）を体験できる」というコンセプトで開発されており、軽量でシンプルな設計が特徴です。

本記事では、Wakuの特徴、インストール方法、基本的な使い方、そしてNext.jsとの違いについて詳しく解説します。

## Wakuとは

Wakuは、React Server Componentsを中心に据えた軽量なReactフレームワークです。名前の由来は日本語の「枠」で、必要最小限の機能のみを提供し、開発者に自由度を与えることを目指しています。

### 主な特徴

- **React Server Components（RSC）ネイティブサポート**: Wakuの中核機能としてRSCを採用
- **軽量**: 必要最小限の機能のみを提供し、バンドルサイズを抑制
- **柔軟性**: ルーティング、データフェッチング、状態管理などを自由に選択可能
- **Viteベース**: 高速な開発サーバーとビルドツールとしてViteを採用
- **TypeScript完全サポート**: 型安全な開発体験を提供

## Wakuのインストールと初期セットアップ

Wakuプロジェクトを始めるには、公式のスターターテンプレートを使用するのが最も簡単です。

```bash
# npmの場合
npm create waku@latest my-waku-app

# pnpmの場合
pnpm create waku my-waku-app

# yarnの場合
yarn create waku my-waku-app
```

プロジェクトディレクトリに移動して、開発サーバーを起動します。

```bash
cd my-waku-app
npm install
npm run dev
```

デフォルトでは `http://localhost:3000` で開発サーバーが起動します。

## プロジェクト構造

Wakuプロジェクトの基本的なディレクトリ構造は以下のようになります。

```
my-waku-app/
├── src/
│   ├── pages/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── about.tsx
│   ├── components/
│   │   ├── Counter.tsx
│   │   └── Header.tsx
│   └── entries.ts
├── public/
├── package.json
└── waku.config.ts
```

## React Server Componentsの基本

WakuではReact Server Componentsがデフォルトです。すべてのコンポーネントは、明示的に `'use client'` を宣言しない限り、サーバーコンポーネントとして扱われます。

### サーバーコンポーネントの例

```tsx
// src/pages/index.tsx
import { fetchBlogPosts } from '../lib/api';

export default async function HomePage() {
  // サーバー側でデータフェッチング
  const posts = await fetchBlogPosts();

  return (
    <div>
      <h1>最新のブログ記事</h1>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

サーバーコンポーネントでは、直接データベースにアクセスしたり、環境変数を使用したりすることができます。これらのコードはクライアントに送信されません。

### クライアントコンポーネントの例

インタラクティブな機能が必要な場合は、`'use client'` ディレクティブを使用してクライアントコンポーネントを作成します。

```tsx
// src/components/Counter.tsx
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>カウント: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        増やす
      </button>
      <button onClick={() => setCount(count - 1)}>
        減らす
      </button>
    </div>
  );
}
```

### サーバーコンポーネントとクライアントコンポーネントの組み合わせ

Wakuの強力な点は、サーバーコンポーネントとクライアントコンポーネントをシームレスに組み合わせられることです。

```tsx
// src/pages/dashboard.tsx
import { fetchUserData } from '../lib/api';
import Counter from '../components/Counter';
import Chart from '../components/Chart';

export default async function DashboardPage() {
  // サーバー側でデータ取得
  const userData = await fetchUserData();

  return (
    <div>
      <h1>ダッシュボード</h1>
      <p>ようこそ、{userData.name}さん</p>

      {/* クライアントコンポーネント */}
      <Counter />

      {/* サーバーから取得したデータをクライアントコンポーネントに渡す */}
      <Chart data={userData.stats} />
    </div>
  );
}
```

## ルーティング

Wakuのルーティングはファイルベースです。`src/pages/` ディレクトリ内のファイル構造がそのままURLパスに対応します。

```
src/pages/
├── index.tsx          → /
├── about.tsx          → /about
├── blog/
│   ├── index.tsx      → /blog
│   └── [slug].tsx     → /blog/:slug
└── api/
    └── users.ts       → /api/users
```

### 動的ルーティング

動的なパスパラメータは、ファイル名を `[param]` の形式にすることで実現できます。

```tsx
// src/pages/blog/[slug].tsx
import { fetchBlogPost } from '../../lib/api';

type Props = {
  slug: string;
};

export default async function BlogPostPage({ slug }: Props) {
  const post = await fetchBlogPost(slug);

  if (!post) {
    return <div>記事が見つかりません</div>;
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}

// パスパラメータの型定義
export async function getConfig() {
  return {
    render: 'static',
  };
}
```

## データフェッチング

Wakuでは、サーバーコンポーネント内で直接 `async/await` を使用してデータをフェッチできます。

```tsx
// src/lib/api.ts
export async function fetchBlogPosts() {
  const res = await fetch('https://api.example.com/posts', {
    // Next.jsのようなキャッシュオプションも使用可能
    next: { revalidate: 3600 }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch posts');
  }

  return res.json();
}

// src/pages/blog/index.tsx
import { fetchBlogPosts } from '../../lib/api';
import { Suspense } from 'react';

export default async function BlogPage() {
  return (
    <div>
      <h1>ブログ</h1>
      <Suspense fallback={<div>読み込み中...</div>}>
        <BlogList />
      </Suspense>
    </div>
  );
}

async function BlogList() {
  const posts = await fetchBlogPosts();

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>
          <a href={`/blog/${post.slug}`}>{post.title}</a>
        </li>
      ))}
    </ul>
  );
}
```

## レイアウト

共通のレイアウトを定義するには、`_layout.tsx` ファイルを使用します。

```tsx
// src/pages/_layout.tsx
import Header from '../components/Header';
import Footer from '../components/Footer';

type Props = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

## API Routes

WakuではAPI Routesもサポートしています。

```tsx
// src/pages/api/users.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const users = await fetchUsersFromDatabase();

  return Response.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const newUser = await createUser(body);

  return Response.json(newUser, { status: 201 });
}
```

## WakuとNext.jsの違い

### 1. 哲学の違い

- **Next.js**: フルスタックフレームワークとして、多くの機能を標準提供
- **Waku**: 最小限の機能のみを提供し、必要に応じて拡張する方針

### 2. バンドルサイズ

Wakuは軽量性を重視しており、Next.jsよりも小さなバンドルサイズを実現しています。

### 3. 機能セット

| 機能 | Next.js | Waku |
|------|---------|------|
| RSC | ✅ | ✅ |
| ルーティング | ✅ 高機能 | ✅ シンプル |
| 画像最適化 | ✅ 組み込み | ❌ 手動 |
| i18n | ✅ 組み込み | ❌ 手動 |
| ミドルウェア | ✅ | ❌ |
| ISR | ✅ | ⚠️ 限定的 |

### 4. 学習曲線

Wakuはシンプルな設計のため、Next.jsよりも学習コストが低い傾向にあります。

## Wakuの設定

`waku.config.ts` でWakuの動作をカスタマイズできます。

```typescript
// waku.config.ts
import { defineConfig } from 'waku/config';

export default defineConfig({
  // ベースパス
  basePath: '',

  // 静的サイト生成の設定
  ssr: true,

  // Viteの設定をカスタマイズ
  vite: {
    server: {
      port: 3000,
    },
  },

  // 環境変数のプレフィックス
  envPrefix: 'PUBLIC_',
});
```

## デプロイ

Wakuアプリケーションは、Node.jsをサポートする任意のホスティングサービスにデプロイできます。

### Vercelへのデプロイ

```bash
npm install -g vercel
vercel
```

### Dockerでのデプロイ

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --production

EXPOSE 3000
CMD ["npm", "start"]
```

## パフォーマンス最適化

### 1. コード分割

Wakuは自動的にコード分割を行いますが、`React.lazy()` を使用してさらに最適化できます。

```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export default function Page() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 2. キャッシング

```tsx
// データフェッチングにキャッシュを適用
export async function fetchData() {
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }, // 1時間キャッシュ
  });

  return res.json();
}
```

## まとめ

Wakuは、React Server Componentsを中心に据えた軽量で柔軟なフレームワークです。Next.jsのような多機能なフレームワークと比較すると、機能は限定的ですが、その分シンプルで学習コストが低く、必要最小限の構成でRSCを体験できます。

**Wakuが適しているケース**:
- RSCを学習したい
- 軽量なフレームワークが必要
- 柔軟性を重視したい
- シンプルなプロジェクト

**Next.jsが適しているケース**:
- 大規模なプロジェクト
- 多機能が必要
- 実績のあるフレームワークが必要
- エンタープライズ向け開発

Wakuは今後の発展が期待される新しいフレームワークです。RSCの理解を深めたい方や、軽量なフレームワークを求めている方は、ぜひ試してみてください。

## 参考リンク

- [Waku公式サイト](https://waku.gg/)
- [Waku GitHub](https://github.com/dai-shi/waku)
- [React Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)
