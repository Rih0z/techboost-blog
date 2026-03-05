---
title: "Waku RSCフレームワーク入門 - 軽量React Server Componentsの実装"
description: "Waku軽量React Server Componentsフレームワークの完全ガイド。セットアップ、ルーティング、サーバーコンポーネントとクライアントコンポーネントの使い分け、Vercelへのデプロイ方法を解説します。"
pubDate: "2025-02-05"
tags: ['プログラミング']
---

Wakuは、React Server Components（RSC）を中心に設計された軽量でミニマルなフレームワークです。Next.jsよりもシンプルで、RSCの本質的な機能に焦点を当てています。

## Wakuとは

WakuはReact Server Componentsのための最小限のフレームワークです。複雑な設定なしで、モダンなReactアプリケーションを構築できます。

### 主な特徴

- **React Server Components**: RSCをファーストクラスでサポート
- **軽量**: 最小限の抽象化と設定
- **高速**: Viteベースのビルドシステムによる高速な開発体験
- **柔軟**: 必要な機能のみを追加
- **型安全**: TypeScript完全サポート

### Next.jsとの違い

| 機能 | Waku | Next.js |
|------|------|---------|
| **フォーカス** | RSC専用 | フルスタックフレームワーク |
| **ルーティング** | ファイルベース（シンプル） | App Router（複雑） |
| **API Routes** | なし | あり |
| **画像最適化** | 基本機能のみ | 高度な最適化 |
| **学習曲線** | 緩やか | 急 |
| **バンドルサイズ** | 小 | 大 |

## セットアップ

### プロジェクト作成

```bash
# プロジェクト作成
npm create waku@latest my-waku-app
cd my-waku-app

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

### プロジェクト構造

```
my-waku-app/
├── src/
│   ├── components/
│   │   ├── Counter.tsx        # クライアントコンポーネント
│   │   └── Header.tsx         # サーバーコンポーネント
│   ├── pages/
│   │   ├── index.tsx          # ホームページ
│   │   ├── about.tsx          # Aboutページ
│   │   └── posts/
│   │       └── [slug].tsx     # 動的ルート
│   └── main.tsx               # エントリーポイント
├── public/
│   └── favicon.ico
├── package.json
├── tsconfig.json
└── waku.config.ts
```

## ルーティング

Wakuはファイルベースのルーティングを採用しています。

### 基本的なルート

```tsx
// src/pages/index.tsx
export default async function HomePage() {
  return (
    <div>
      <h1>Welcome to Waku</h1>
      <p>A minimal React framework with RSC</p>
    </div>
  );
}
```

```tsx
// src/pages/about.tsx
export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      <p>Learn more about our company</p>
    </div>
  );
}
```

### 動的ルート

```tsx
// src/pages/posts/[slug].tsx
type Props = {
  slug: string;
};

export default async function PostPage({ slug }: Props) {
  const post = await fetchPost(slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}

async function fetchPost(slug: string) {
  const res = await fetch(`https://api.example.com/posts/${slug}`);
  return res.json();
}
```

### ネストされたルート

```tsx
// src/pages/blog/[category]/[slug].tsx
type Props = {
  category: string;
  slug: string;
};

export default async function BlogPost({ category, slug }: Props) {
  return (
    <div>
      <p>Category: {category}</p>
      <p>Post: {slug}</p>
    </div>
  );
}

// アクセス例: /blog/tech/react-19-features
```

### リンク

```tsx
import { Link } from 'waku';

export default function Navigation() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="/posts/hello-world">First Post</Link>
    </nav>
  );
}
```

## サーバーコンポーネント

デフォルトで、すべてのコンポーネントはサーバーコンポーネントです。

### データフェッチング

```tsx
// src/components/UserList.tsx
type User = {
  id: number;
  name: string;
  email: string;
};

export default async function UserList() {
  const users = await fetchUsers();

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name} - {user.email}
        </li>
      ))}
    </ul>
  );
}

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('https://api.example.com/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}
```

### 並列データフェッチ

```tsx
async function DashboardPage() {
  // 並列で複数のデータを取得
  const [users, posts, stats] = await Promise.all([
    fetchUsers(),
    fetchPosts(),
    fetchStats(),
  ]);

  return (
    <div>
      <h1>Dashboard</h1>
      <UserList users={users} />
      <PostList posts={posts} />
      <Statistics stats={stats} />
    </div>
  );
}
```

### ストリーミングとSuspense

```tsx
import { Suspense } from 'react';
import { Spinner } from './Spinner';

export default function Page() {
  return (
    <div>
      <h1>My Page</h1>

      {/* 非同期コンポーネントをSuspenseでラップ */}
      <Suspense fallback={<Spinner />}>
        <UserList />
      </Suspense>

      <Suspense fallback={<Spinner />}>
        <PostList />
      </Suspense>
    </div>
  );
}
```

## クライアントコンポーネント

インタラクティブな機能にはクライアントコンポーネントを使用します。

### 基本的なクライアントコンポーネント

```tsx
// src/components/Counter.tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

### フォームハンドリング

```tsx
'use client';

import { useState } from 'react';

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      alert('Message sent!');
      setFormData({ name: '', email: '', message: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <textarea
        placeholder="Message"
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
      />
      <button type="submit">Send</button>
    </form>
  );
}
```

## サーバーとクライアントの組み合わせ

### クライアントコンポーネント内でサーバーコンポーネント

```tsx
// src/pages/dashboard.tsx
import { ClientWrapper } from '../components/ClientWrapper';
import { ServerData } from '../components/ServerData';

export default async function DashboardPage() {
  return (
    <ClientWrapper>
      {/* サーバーコンポーネントをchildrenとして渡す */}
      <ServerData />
    </ClientWrapper>
  );
}
```

```tsx
// src/components/ClientWrapper.tsx
'use client';

import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function ClientWrapper({ children }: Props) {
  return (
    <div className="interactive-wrapper">
      {children}
    </div>
  );
}
```

### Propsでのデータ受け渡し

```tsx
// サーバーコンポーネント
export default async function Page() {
  const data = await fetchData();

  return (
    <div>
      {/* クライアントコンポーネントにデータを渡す */}
      <InteractiveChart data={data} />
    </div>
  );
}

// クライアントコンポーネント
'use client';

type Props = {
  data: ChartData;
};

export function InteractiveChart({ data }: Props) {
  // dataを使ってインタラクティブなチャートを描画
  return <div>...</div>;
}
```

## レイアウトとメタデータ

### ルートレイアウト

```tsx
// src/pages/_layout.tsx
import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <header>
          <nav>...</nav>
        </header>
        <main>{children}</main>
        <footer>...</footer>
      </body>
    </html>
  );
}
```

### メタデータ

```tsx
// src/pages/posts/[slug].tsx
export async function getMetadata({ slug }: { slug: string }) {
  const post = await fetchPost(slug);

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function PostPage({ slug }: { slug: string }) {
  const post = await fetchPost(slug);
  return <article>...</article>;
}
```

## スタイリング

### CSS Modules

```tsx
// src/components/Card.tsx
import styles from './Card.module.css';

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.card}>
      {children}
    </div>
  );
}
```

```css
/* src/components/Card.module.css */
.card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
```

### TailwindCSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

```tsx
// src/components/Button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
      {children}
    </button>
  );
}
```

## Vercelへのデプロイ

### 設定ファイル

```json
// package.json
{
  "scripts": {
    "dev": "waku dev",
    "build": "waku build",
    "start": "waku start"
  }
}
```

### Vercelへのデプロイ

```bash
# Vercel CLIインストール
npm i -g vercel

# デプロイ
vercel

# 本番デプロイ
vercel --prod
```

### vercel.json設定

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "waku"
}
```

## パフォーマンス最適化

### 画像最適化

```tsx
import { Image } from 'waku/image';

export function ProductCard() {
  return (
    <Image
      src="/product.jpg"
      alt="Product"
      width={400}
      height={300}
      loading="lazy"
    />
  );
}
```

### コード分割

```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

## まとめ

Wakuは以下のようなプロジェクトに最適です。

### 適用領域

- **シンプルなWebサイト**: ブログ、ポートフォリオ、コーポレートサイト
- **コンテンツ重視**: 記事サイト、ドキュメントサイト
- **プロトタイピング**: 素早くRSCを試したい場合
- **学習目的**: React Server Componentsの理解

### Wakuの強み

1. **シンプル**: 最小限の概念と設定
2. **高速**: Viteベースの開発体験
3. **柔軟**: 必要な機能を追加可能
4. **RSCファースト**: Server Componentsの本質に集中

Wakuは、React Server Componentsの力を最もシンプルな形で体験できるフレームワークです。
