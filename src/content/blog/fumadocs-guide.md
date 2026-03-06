---
title: 'Fumadocs完全ガイド - Next.jsベースの最新ドキュメントフレームワーク'
description: 'Fumadocsの使い方を徹底解説。Next.js App Router対応、MDX統合、全文検索、テーマカスタマイズなど、美しいドキュメントサイトを構築する方法。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: '2026-02-05'
tags: ['Fumadocs', 'Next.js', 'ドキュメント', 'MDX', 'プログラミング']
---

Fumadocsは、Next.js App Routerをベースにした最新のドキュメントフレームワークです。美しいUI、強力な検索機能、MDXサポートなど、プロフェッショナルなドキュメントサイトを簡単に構築できます。

この記事では、Fumadocsのセットアップから高度なカスタマイズまで、包括的に解説します。

## Fumadocsとは

Fumadocsは、開発者向けドキュメントサイトを構築するための完全なソリューションです。

### 主な特徴

- **Next.js App Router**: 最新のNext.js機能を活用
- **MDXサポート**: マークダウンにReactコンポーネント埋め込み
- **全文検索**: Algolia、Flexsearch統合
- **美しいUI**: カスタマイズ可能なテーマ
- **TypeScript完全対応**: 型安全な開発
- **国際化対応**: 多言語サポート

## セットアップ

### プロジェクト作成

```bash
# Fumadocsプロジェクト作成
npx create-fumadocs-app@latest my-docs

cd my-docs

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

### 手動セットアップ

既存のNext.jsプロジェクトに追加:

```bash
npm install fumadocs-ui fumadocs-core fumadocs-mdx
```

```typescript
// next.config.mjs
import { createMDX } from 'fumadocs-mdx/config'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
}

export default withMDX(config)
```

## ディレクトリ構造

```
my-docs/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── docs/
│       ├── [[...slug]]/
│       │   └── page.tsx
│       └── layout.tsx
├── content/
│   └── docs/
│       ├── index.mdx
│       ├── getting-started.mdx
│       └── guides/
│           ├── installation.mdx
│           └── configuration.mdx
├── components/
├── lib/
│   └── source.ts
└── fumadocs.config.ts
```

## 基本設定

### Fumadocs設定

```typescript
// fumadocs.config.ts
import { defineConfig } from 'fumadocs-mdx/config'

export default defineConfig({
  mdxOptions: {
    rehypePlugins: [],
    remarkPlugins: [],
  },
})
```

### ソース設定

```typescript
// lib/source.ts
import { loader } from 'fumadocs-core/source'
import { createMDXSource } from 'fumadocs-mdx'
import { icons } from 'lucide-react'

export const source = loader({
  baseUrl: '/docs',
  icon: (icon) => {
    if (icon && icon in icons) {
      return icons[icon as keyof typeof icons]
    }
  },
  source: createMDXSource({
    // MDXファイルのパス
    files: './content/docs/**/*.mdx',
  }),
})
```

## レイアウト

### ルートレイアウト

```tsx
// app/layout.tsx
import { RootProvider } from 'fumadocs-ui/provider'
import type { ReactNode } from 'react'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
```

### ドキュメントレイアウト

```tsx
// app/docs/layout.tsx
import { DocsLayout } from 'fumadocs-ui/layout'
import type { ReactNode } from 'react'
import { source } from '@/lib/source'

export default function Layout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'My Docs',
        url: '/',
      }}
      links={[
        {
          text: 'GitHub',
          url: 'https://github.com/username/repo',
          icon: <GithubIcon />,
        },
      ]}
    >
      {children}
    </DocsLayout>
  )
}
```

### ページコンポーネント

```tsx
// app/docs/[[...slug]]/page.tsx
import { source } from '@/lib/source'
import { DocsPage, DocsBody } from 'fumadocs-ui/page'
import { notFound } from 'next/navigation'

export default async function Page({
  params,
}: {
  params: { slug?: string[] }
}) {
  const page = source.getPage(params.slug)

  if (!page) notFound()

  const MDX = page.data.exports.default

  return (
    <DocsPage
      toc={page.data.exports.toc}
      lastUpdate={page.data.lastModified}
    >
      <DocsBody>
        <h1>{page.data.title}</h1>
        <MDX />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const page = source.getPage(params.slug)

  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
  }
}
```

## MDXコンテンツ

### 基本的なMDX

```mdx
---
title: はじめに
description: Fumadocsの基本的な使い方
---

# はじめに

Fumadocsへようこそ!

## インストール

プロジェクトを作成します:

```bash
npx create-fumadocs-app@latest
```

## 主な機能

- 高速なビルド
- 美しいUI
- 簡単なセットアップ
```

### コンポーネント埋め込み

```mdx
---
title: コンポーネント例
---

import { Callout } from 'fumadocs-ui/components/callout'
import { Card } from '@/components/card'

# コンポーネント例

<Callout type="info">
  これは情報メッセージです。
</Callout>

<Card title="カスタムコンポーネント">
  MDX内でカスタムコンポーネントを使用できます。
</Card>
```

## 組み込みコンポーネント

### Callout

```mdx
import { Callout } from 'fumadocs-ui/components/callout'

<Callout type="info">
  情報メッセージ
</Callout>

<Callout type="warn">
  警告メッセージ
</Callout>

<Callout type="error">
  エラーメッセージ
</Callout>
```

### Tabs

```mdx
import { Tabs, Tab } from 'fumadocs-ui/components/tabs'

<Tabs items={['npm', 'pnpm', 'yarn']}>
  <Tab value="npm">
    ```bash
    npm install fumadocs-ui
    ```
  </Tab>
  <Tab value="pnpm">
    ```bash
    pnpm add fumadocs-ui
    ```
  </Tab>
  <Tab value="yarn">
    ```bash
    yarn add fumadocs-ui
    ```
  </Tab>
</Tabs>
```

### Steps

```mdx
import { Steps, Step } from 'fumadocs-ui/components/steps'

<Steps>
  <Step>
    ### インストール

    パッケージをインストールします。
  </Step>
  <Step>
    ### 設定

    設定ファイルを作成します。
  </Step>
  <Step>
    ### 実行

    アプリケーションを起動します。
  </Step>
</Steps>
```

### Accordion

```mdx
import { Accordions, Accordion } from 'fumadocs-ui/components/accordion'

<Accordions>
  <Accordion title="質問1">
    回答内容1
  </Accordion>
  <Accordion title="質問2">
    回答内容2
  </Accordion>
</Accordions>
```

## 全文検索

### Flexsearch統合

```bash
npm install fumadocs-core/search/server
```

```typescript
// app/api/search/route.ts
import { source } from '@/lib/source'
import { createSearchAPI } from 'fumadocs-core/search/server'

export const { GET } = createSearchAPI('search', {
  indexes: source.getPages().map((page) => ({
    title: page.data.title,
    description: page.data.description,
    content: page.data.content,
    url: page.url,
  })),
})
```

### 検索UI

```tsx
// app/docs/layout.tsx
import { DocsLayout } from 'fumadocs-ui/layout'

export default function Layout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'My Docs',
      }}
      // 検索設定
      search={{
        enabled: true,
        api: '/api/search',
      }}
    >
      {children}
    </DocsLayout>
  )
}
```

### Algolia統合

```bash
npm install algoliasearch
```

```tsx
import { DocsLayout } from 'fumadocs-ui/layout'
import algoliasearch from 'algoliasearch/lite'

const searchClient = algoliasearch(
  'APP_ID',
  'SEARCH_API_KEY'
)

export default function Layout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <DocsLayout
      tree={source.pageTree}
      search={{
        enabled: true,
        algolia: {
          searchClient,
          indexName: 'docs',
        },
      }}
    >
      {children}
    </DocsLayout>
  )
}
```

## テーマカスタマイズ

### カラーテーマ

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
  }
}
```

### カスタムコンポーネント

```tsx
// components/custom-callout.tsx
import { ReactNode } from 'react'

export function CustomCallout({
  children,
  type = 'info',
}: {
  children: ReactNode
  type?: 'info' | 'warn' | 'error'
}) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warn: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    error: 'bg-red-50 border-red-200 text-red-900',
  }

  return (
    <div className={`p-4 border-l-4 ${styles[type]}`}>
      {children}
    </div>
  )
}
```

MDXで使用:

```mdx
import { CustomCallout } from '@/components/custom-callout'

<CustomCallout type="info">
  カスタムスタイルのCalloutコンポーネント
</CustomCallout>
```

## 国際化(i18n)

### 設定

```typescript
// lib/i18n.ts
export const i18n = {
  defaultLanguage: 'ja',
  languages: ['ja', 'en'],
}

// lib/source.ts
import { loader } from 'fumadocs-core/source'
import { i18n } from './i18n'

export const source = loader({
  baseUrl: '/docs',
  i18n,
  source: createMDXSource({
    files: {
      ja: './content/docs/ja/**/*.mdx',
      en: './content/docs/en/**/*.mdx',
    },
  }),
})
```

### 言語切り替えUI

```tsx
// components/language-toggle.tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { i18n } from '@/lib/i18n'

export function LanguageToggle() {
  const params = useParams()
  const router = useRouter()
  const currentLang = params.lang || i18n.defaultLanguage

  return (
    <select
      value={currentLang}
      onChange={(e) => {
        router.push(`/${e.target.value}`)
      }}
    >
      {i18n.languages.map((lang) => (
        <option key={lang} value={lang}>
          {lang.toUpperCase()}
        </option>
      ))}
    </select>
  )
}
```

## コードブロック

### シンタックスハイライト

```typescript
// fumadocs.config.ts
import { defineConfig } from 'fumadocs-mdx/config'
import rehypePrettyCode from 'rehype-pretty-code'

export default defineConfig({
  mdxOptions: {
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          theme: 'github-dark',
          keepBackground: false,
        },
      ],
    ],
  },
})
```

### ファイル名表示

```mdx
```typescript title="example.ts"
export function hello() {
  console.log('Hello, World!')
}
```
```

### 行ハイライト

```mdx
```typescript {2,4-6}
export function calculate(a: number, b: number) {
  const sum = a + b // ハイライト

  if (sum > 100) { // ハイライト開始
    return 100
  } // ハイライト終了

  return sum
}
```
```

## 目次(TOC)

### 自動生成

```tsx
// app/docs/[[...slug]]/page.tsx
import { DocsPage } from 'fumadocs-ui/page'

export default async function Page({
  params,
}: {
  params: { slug?: string[] }
}) {
  const page = source.getPage(params.slug)

  if (!page) notFound()

  return (
    <DocsPage
      // 目次を自動生成
      toc={page.data.exports.toc}
    >
      {/* コンテンツ */}
    </DocsPage>
  )
}
```

### カスタムTOC

```tsx
import { DocsPage } from 'fumadocs-ui/page'

export default function Page() {
  return (
    <DocsPage
      toc={[
        { title: 'セクション1', url: '#section-1', depth: 2 },
        { title: 'サブセクション', url: '#subsection', depth: 3 },
        { title: 'セクション2', url: '#section-2', depth: 2 },
      ]}
    >
      {/* コンテンツ */}
    </DocsPage>
  )
}
```

## ナビゲーション

### サイドバー構造

```typescript
// lib/source.ts
export const source = loader({
  baseUrl: '/docs',
  source: createMDXSource({
    files: './content/docs/**/*.mdx',
  }),
  // ページツリー構造
  pageTree: {
    root: {
      name: 'ドキュメント',
      index: 'index',
      children: [
        {
          name: 'はじめに',
          index: 'getting-started',
        },
        {
          name: 'ガイド',
          children: [
            { name: 'インストール', index: 'guides/installation' },
            { name: '設定', index: 'guides/configuration' },
          ],
        },
      ],
    },
  },
})
```

### パンくずリスト

```tsx
import { Breadcrumb } from 'fumadocs-ui/components/breadcrumb'

export default function Page({ page }) {
  return (
    <>
      <Breadcrumb
        items={[
          { title: 'ホーム', url: '/' },
          { title: 'ドキュメント', url: '/docs' },
          { title: page.data.title, url: page.url },
        ]}
      />
      {/* コンテンツ */}
    </>
  )
}
```

## メタデータとSEO

### ページメタデータ

```mdx
---
title: APIリファレンス
description: 詳細なAPIドキュメント
keywords: [API, リファレンス, ドキュメント]
---
```

### Open Graph

```tsx
// app/docs/[[...slug]]/page.tsx
export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const page = source.getPage(params.slug)

  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      type: 'article',
      url: `https://example.com${page.url}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      description: page.data.description,
    },
  }
}
```

## デプロイ

### Vercel

```bash
# Vercelにデプロイ
vercel
```

### 静的エクスポート

```typescript
// next.config.mjs
const config = {
  output: 'export',
  images: {
    unoptimized: true,
  },
}

export default withMDX(config)
```

```bash
npm run build
```

## 高度な機能

### カスタムプラグイン

```typescript
// lib/plugins/custom-plugin.ts
import { visit } from 'unist-util-visit'

export function customPlugin() {
  return (tree: any) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'a') {
        node.properties.target = '_blank'
        node.properties.rel = 'noopener noreferrer'
      }
    })
  }
}
```

```typescript
// fumadocs.config.ts
import { customPlugin } from './lib/plugins/custom-plugin'

export default defineConfig({
  mdxOptions: {
    rehypePlugins: [customPlugin],
  },
})
```

### 動的インポート

```tsx
// components/dynamic-demo.tsx
'use client'

import dynamic from 'next/dynamic'

const Chart = dynamic(() => import('./chart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false,
})

export function DynamicDemo() {
  return <Chart data={[1, 2, 3]} />
}
```

## ベストプラクティス

### ディレクトリ構造

```
content/
└── docs/
    ├── index.mdx                    # トップページ
    ├── getting-started/
    │   ├── index.mdx               # 概要
    │   ├── installation.mdx        # インストール
    │   └── quick-start.mdx         # クイックスタート
    ├── guides/
    │   ├── index.mdx
    │   ├── basics.mdx
    │   └── advanced.mdx
    └── api/
        ├── index.mdx
        └── reference.mdx
```

### パフォーマンス最適化

```typescript
// next.config.mjs
const config = {
  // 画像最適化
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // 圧縮
  compress: true,

  // 実験的機能
  experimental: {
    optimizeCss: true,
  },
}
```

## まとめ

Fumadocsは、Next.jsの最新機能を活用した強力なドキュメントフレームワークです。

主なメリット:

- **簡単セットアップ**: 数分で美しいドキュメントサイト
- **優れた開発体験**: MDX、TypeScript、ホットリロード
- **高機能**: 検索、i18n、テーマカスタマイズ
- **高速**: Next.js App Routerによる最適化

プロフェッショナルなドキュメントサイトを構築するなら、Fumadocsが最適な選択肢です。

## 参考リンク

- [Fumadocs公式サイト](https://fumadocs.vercel.app/)
- [GitHub](https://github.com/fuma-nama/fumadocs)
- [Next.js](https://nextjs.org/)
