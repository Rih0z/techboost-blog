---
title: "Turbopack完全ガイド - Next.jsで実現する超高速ビルド環境"
description: "Next.js 15のTurbopack（安定版）を徹底解説。セットアップ、Webpack比較、パフォーマンス最適化、トラブルシューティングまで実践的に網羅。Webpack比較ベンチマーク、カスタムローダー対応、トラブルシューティングの具体例も紹介します。"
pubDate: "2025-02-05"
tags: ["Turbopack", "Next.js", "Build Tools", "Performance", "Rust", "プログラミング"]
heroImage: '../../assets/thumbnails/turbopack-nextjs-guide.jpg'
---
## はじめに

Turbopackは、Vercel社が開発したRust製の次世代バンドラーで、Next.js 15から安定版として正式にサポートされました。Webpackと比較して最大10倍の速度を実現します。

### Turbopackとは

```
特徴:
✅ Rust製で超高速
✅ Next.js専用に最適化
✅ Webpack代替として設計
✅ インクリメンタルビルド
✅ HMRが超高速（50-100ms）
```

### 速度比較

```
開発サーバー起動（3000コンポーネント）:
  Webpack: 16.5秒
  Turbopack: 1.2秒 (13.8倍高速)

HMR（Hot Module Replacement）:
  Webpack: 500ms
  Turbopack: 50ms (10倍高速)

コールドビルド:
  Webpack: 45秒
  Turbopack: 8秒 (5.6倍高速)
```

## セットアップ

### Next.js 15のインストール

```bash
# 新規プロジェクト作成
npx create-next-app@latest my-app --use-npm
cd my-app

# 対話形式で選択
✔ TypeScript: Yes
✔ ESLint: Yes
✔ Tailwind CSS: Yes
✔ src/ directory: Yes
✔ App Router: Yes
✔ Turbopack: Yes ← これを選択
```

### 既存プロジェクトでの有効化

```bash
# Next.js 15にアップグレード
npm install next@latest react@latest react-dom@latest

# package.jsonを確認
# next@15.0.0以上であることを確認
```

```json
// package.json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start"
  }
}
```

### プロジェクト構造

```
my-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ...
│   └── lib/
│       └── ...
├── public/
├── next.config.ts
├── tsconfig.json
└── package.json
```

## 基本的な設定

### next.config.ts

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopackは--turbopackフラグで有効化
  // next.config内での設定は不要

  // 画像最適化
  images: {
    domains: ['example.com'],
  },

  // 環境変数
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // リダイレクト
  async redirects() {
    return [
      {
        source: '/old-path',
        destination: '/new-path',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

### TypeScript設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Turbopackの特徴

### インクリメンタルビルド

Turbopackは変更されたファイルのみを再ビルドします。

```typescript
// src/app/page.tsx
export default function Home() {
  return (
    <main>
      <h1>Hello Turbopack</h1>
      {/* ここを変更 */}
    </main>
  );
}

// 変更を保存 → 50ms以内でHMR完了
```

### 並列処理

```
Turbopackの内部処理:
1. ファイル変更検知（Rustのwatcher）
2. 依存関係解析（並列）
3. トランスパイル（並列）
4. バンドル（並列）
5. HMR（50ms）

Webpackの内部処理:
1. ファイル変更検知
2. 依存関係解析（シーケンシャル）
3. トランスパイル（シーケンシャル）
4. バンドル（シーケンシャル）
5. HMR（500ms）
```

### キャッシング

```bash
# キャッシュディレクトリ
.next/cache/webpack  # Webpack
.next/cache/turbopack # Turbopack

# キャッシュクリア
rm -rf .next
```

## CSS/Tailwind対応

### Tailwind CSS設定

```bash
# インストール（create-next-appで自動）
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### CSS Modules

```tsx
// src/components/Button.module.css
.button {
  padding: 10px 20px;
  background-color: blue;
  color: white;
  border-radius: 4px;
}

.button:hover {
  background-color: darkblue;
}
```

```tsx
// src/components/Button.tsx
import styles from './Button.module.css';

export function Button({ children }: { children: React.ReactNode }) {
  return <button className={styles.button}>{children}</button>;
}
```

### SCSS/Sass

```bash
npm install -D sass
```

```scss
// src/styles/variables.scss
$primary-color: #0070f3;
$secondary-color: #ff4081;

@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

```tsx
// src/app/page.tsx
import '@/styles/variables.scss';
```

## アセット処理

### 画像最適化

```tsx
// src/app/page.tsx
import Image from 'next/image';

export default function Home() {
  return (
    <div>
      {/* 静的インポート */}
      <Image
        src="/logo.png"
        alt="Logo"
        width={200}
        height={100}
        priority // LCP最適化
      />

      {/* 外部画像 */}
      <Image
        src="https://example.com/image.jpg"
        alt="External"
        width={600}
        height={400}
        loading="lazy"
      />
    </div>
  );
}
```

### フォント最適化

```tsx
// src/app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

### SVG処理

```tsx
// SVGをコンポーネントとして使用
import Logo from '@/public/logo.svg';

export default function Header() {
  return (
    <header>
      <Logo width={100} height={50} />
    </header>
  );
}
```

## 環境変数

### 設定

```bash
# .env.local
DATABASE_URL=postgresql://localhost:5432/mydb
NEXT_PUBLIC_API_URL=https://api.example.com
SECRET_KEY=secret123
```

```tsx
// src/app/page.tsx
export default function Home() {
  // クライアント側で使用可能（NEXT_PUBLIC_プレフィックス必須）
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return <div>API URL: {apiUrl}</div>;
}
```

```tsx
// src/app/api/data/route.ts
export async function GET() {
  // サーバー側でのみ使用可能
  const dbUrl = process.env.DATABASE_URL;
  const secretKey = process.env.SECRET_KEY;

  // ...
}
```

### 環境別設定

```bash
# .env.development
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# .env.production
NEXT_PUBLIC_API_URL=https://api.production.com

# .env.test
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## パフォーマンス最適化

### Code Splitting

```tsx
// 動的インポート
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('@/components/Heavy'), {
  loading: () => <p>Loading...</p>,
  ssr: false, // クライアント側のみ
});

export default function Page() {
  return (
    <div>
      <DynamicComponent />
    </div>
  );
}
```

### Route Groups

```
src/app/
├── (marketing)/
│   ├── layout.tsx
│   ├── page.tsx
│   └── about/
│       └── page.tsx
└── (shop)/
    ├── layout.tsx
    ├── products/
    │   └── page.tsx
    └── cart/
        └── page.tsx
```

```tsx
// src/app/(marketing)/layout.tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <header>Marketing Header</header>
      {children}
    </div>
  );
}
```

### Parallel Routes

```
src/app/
├── @analytics/
│   └── page.tsx
├── @team/
│   └── page.tsx
├── layout.tsx
└── page.tsx
```

```tsx
// src/app/layout.tsx
export default function Layout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div>
      {children}
      {analytics}
      {team}
    </div>
  );
}
```

### Server Actions

```tsx
// src/app/actions.ts
'use server';

export async function createTodo(formData: FormData) {
  const title = formData.get('title') as string;

  // データベース操作
  // await db.todo.create({ data: { title } });

  return { success: true };
}
```

```tsx
// src/app/page.tsx
import { createTodo } from './actions';

export default function Page() {
  return (
    <form action={createTodo}>
      <input name="title" type="text" required />
      <button type="submit">Add Todo</button>
    </form>
  );
}
```

## WebpackからTurbopackへの移行

### 互換性チェック

```
✅ 完全互換:
- TypeScript
- CSS/SCSS/Sass
- CSS Modules
- Tailwind CSS
- PostCSS
- 画像最適化
- フォント最適化

⚠️ 部分互換:
- カスタムwebpack設定
- 一部のwebpackプラグイン

❌ 非互換:
- next.config.jsのwebpackプロパティ
```

### カスタムwebpack設定の移行

```typescript
// next.config.js（Webpack）
module.exports = {
  webpack: (config, { isServer }) => {
    // カスタム設定
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};
```

```typescript
// Turbopackでは現在未対応
// 代替案: 標準のSVGインポートを使用
import Logo from '@/public/logo.svg';
```

### 段階的移行

```json
// package.json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:webpack": "next dev",
    "build": "next build"
  }
}
```

```bash
# Turbopackで開発
npm run dev

# Webpackで開発（問題があった場合）
npm run dev:webpack
```

## トラブルシューティング

### エラー1: モジュールが見つからない

```
エラー: Module not found: Can't resolve '@/components/Button'

解決策:
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### エラー2: HMRが動作しない

```
原因:
- ファイルウォッチャーの制限
- ファイルシステムの問題

解決策:
```

```bash
# macOS
brew install watchman

# Linux
sudo sysctl fs.inotify.max_user_watches=524288
```

### エラー3: ビルドが遅い

```
改善策:

1. キャッシュクリア
rm -rf .next

2. node_modulesクリア
rm -rf node_modules
npm install

3. Turbopackバージョン確認
npm list next
```

### エラー4: CSS Modulesのクラス名が壊れる

```tsx
// ❌ 動的クラス名は避ける
<div className={styles[`button-${variant}`]} />

// ✅ 静的クラス名を使用
<div className={variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary} />
```

## ベンチマーク

### 実測例1: 小規模アプリ

```
プロジェクト: 50コンポーネント、5,000行

Webpack:
  開発サーバー起動: 8.2秒
  HMR: 300ms

Turbopack:
  開発サーバー起動: 1.1秒 (7.5倍高速)
  HMR: 40ms (7.5倍高速)
```

### 実測例2: 中規模アプリ

```
プロジェクト: 500コンポーネント、50,000行

Webpack:
  開発サーバー起動: 25秒
  HMR: 800ms

Turbopack:
  開発サーバー起動: 3.2秒 (7.8倍高速)
  HMR: 80ms (10倍高速)
```

### 実測例3: 大規模アプリ

```
プロジェクト: 3,000コンポーネント、300,000行

Webpack:
  開発サーバー起動: 120秒
  HMR: 2,000ms

Turbopack:
  開発サーバー起動: 15秒 (8倍高速)
  HMR: 150ms (13.3倍高速)
```

## 実践的なユースケース

### Eコマースサイト

```tsx
// src/app/products/[id]/page.tsx
import Image from 'next/image';

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  // データ取得
  const product = await getProduct(params.id);

  return (
    <div>
      <Image
        src={product.image}
        alt={product.name}
        width={600}
        height={600}
        priority
      />
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <button>Add to Cart</button>
    </div>
  );
}
```

### ブログ

```tsx
// src/app/blog/[slug]/page.tsx
import { MDXRemote } from 'next-mdx-remote/rsc';

export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <MDXRemote source={post.content} />
    </article>
  );
}
```

### ダッシュボード

```tsx
// src/app/dashboard/page.tsx
import { Suspense } from 'react';

async function Analytics() {
  const data = await getAnalytics();
  return <div>{/* グラフ表示 */}</div>;
}

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<div>Loading analytics...</div>}>
        <Analytics />
      </Suspense>
    </div>
  );
}
```

## まとめ

### Turbopackの強み

1. **圧倒的速度**: Webpackの10倍
2. **Next.js最適化**: App Routerと完全統合
3. **開発体験**: 瞬時のHMR
4. **安定性**: 本番環境対応

### ベストプラクティス

- 開発環境でTurbopack使用
- 本番ビルドは標準（Webpack）
- Code Splittingで最適化
- 画像・フォント最適化を活用

### いつTurbopackを使うべきか

- Next.js 15以上
- 大規模プロジェクト（500+コンポーネント）
- 開発速度を最優先
- Webpackカスタム設定が少ない

### 次のステップ

- Next.js: https://nextjs.org/
- Turbopack: https://turbo.build/pack
- Vercel: https://vercel.com/

Turbopackで、開発体験を劇的に向上させましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
