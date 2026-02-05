---
title: 'MDXで最強の技術ブログを構築する - Next.js + MDX完全ガイド'
description: 'MDXを使った技術ブログ構築の完全ガイド。Markdownにコンポーネントを埋め込み、インタラクティブな記事を作成する方法を実践的に解説します。Next.js App Router対応。'
pubDate: 'Feb 05 2026'
tags: ['MDX', 'Next.js', 'ブログ', 'Markdown', 'React']
---

MDXは、MarkdownにJSX（Reactコンポーネント）を埋め込める強力なフォーマットです。技術ブログをインタラクティブにし、差別化できます。この記事では、Next.jsでMDXブログを構築する方法を解説します。

## MDXとは？

MDXは「Markdown + JSX」の略で、Markdownの中でReactコンポーネントを使用できる拡張フォーマットです。

### 通常のMarkdownとの比較

**通常のMarkdown:**
```markdown
# タイトル

これは段落です。

![画像](image.jpg)
```

**MDX:**
```mdx
# タイトル

これは段落です。

<CustomImage src="image.jpg" caption="キャプション付き画像" />

<InteractiveDemo />
```

### MDXの利点

- **インタラクティブなコンテンツ** - グラフ、アニメーション、デモを埋め込み可能
- **再利用可能なコンポーネント** - 統一されたデザイン
- **動的な内容** - データをpropsで渡せる
- **型安全** - TypeScriptと完全互換
- **SEO対応** - 静的生成可能

## Next.js 15でのMDXセットアップ

### インストール

```bash
npm install @next/mdx @mdx-js/loader @mdx-js/react @types/mdx
```

### next.config.mjsの設定

```javascript
import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
};

const withMDX = createMDX({
  // MDXプラグインをここに追加
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
```

### MDXコンポーネントのグローバル設定

`mdx-components.tsx`をプロジェクトルートに作成します。

```typescript
import type { MDXComponents } from 'mdx/types';
import Image, { ImageProps } from 'next/image';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // 組み込みMarkdown要素のカスタマイズ
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-bold mt-6 mb-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-bold mt-4 mb-2">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-gray-700 leading-7 mb-4">{children}</p>
    ),
    a: ({ href, children }) => (
      <a href={href} className="text-blue-600 hover:underline">
        {children}
      </a>
    ),
    img: (props) => (
      <Image
        {...(props as ImageProps)}
        width={800}
        height={600}
        className="rounded-lg my-4"
      />
    ),
    code: ({ children }) => (
      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto my-4">
        {children}
      </pre>
    ),
    // カスタムコンポーネント
    ...components,
  };
}
```

## ブログ記事の作成

### 記事をMDXファイルとして作成

`app/blog/my-first-post/page.mdx`

```mdx
export const metadata = {
  title: '最初のMDX記事',
  description: 'MDXの使い方を学ぶ',
  date: '2026-02-05',
}

# 最初のMDX記事

これはMDXで書かれた記事です。

## Markdownの基本構文

普通にMarkdownが書けます。

- リスト項目1
- リスト項目2
- リスト項目3

**太字**や*斜体*も使えます。

## カスタムコンポーネント

<Callout type="info">
  これはカスタムコンポーネントです。
</Callout>

<Counter initialValue={0} />
```

### カスタムコンポーネントの作成

`components/Callout.tsx`

```typescript
export function Callout({
  type = 'info',
  children,
}: {
  type?: 'info' | 'warning' | 'error';
  children: React.ReactNode;
}) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`border-l-4 p-4 my-4 ${styles[type]}`}>
      {children}
    </div>
  );
}
```

`components/Counter.tsx`

```typescript
'use client';

import { useState } from 'react';

export function Counter({ initialValue = 0 }: { initialValue?: number }) {
  const [count, setCount] = useState(initialValue);

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg my-4">
      <button
        onClick={() => setCount(count - 1)}
        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        -
      </button>
      <span className="text-2xl font-bold">{count}</span>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        +
      </button>
    </div>
  );
}
```

`mdx-components.tsx`にコンポーネントを登録します。

```typescript
import { Callout } from '@/components/Callout';
import { Counter } from '@/components/Counter';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // ... 既存の設定
    Callout,
    Counter,
    ...components,
  };
}
```

## Content Collectionsパターン

記事をファイルベースで管理する実践的なパターンです。

### ディレクトリ構造

```
app/
  blog/
    [slug]/
      page.tsx
content/
  blog/
    first-post.mdx
    second-post.mdx
    third-post.mdx
```

### 記事データの取得

`lib/blog.ts`

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content/blog');

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags?: string[];
  content: string;
}

export function getAllPosts(): Post[] {
  const fileNames = fs.readdirSync(postsDirectory);

  const posts = fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        title: data.title,
        description: data.description,
        date: data.date,
        tags: data.tags,
        content,
      };
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  return posts;
}

export function getPostBySlug(slug: string): Post | undefined {
  const posts = getAllPosts();
  return posts.find((post) => post.slug === slug);
}
```

### 動的ルートでMDXをレンダリング

`app/blog/[slug]/page.tsx`

```typescript
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import { Callout } from '@/components/Callout';
import { Counter } from '@/components/Counter';

const components = {
  Callout,
  Counter,
};

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{post.title}</h1>
        <p className="text-gray-600">{post.date}</p>
        {post.tags && (
          <div className="flex gap-2 mt-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>
      <div className="prose prose-lg max-w-none">
        <MDXRemote source={post.content} components={components} />
      </div>
    </article>
  );
}
```

## 便利なMDXプラグイン

### シンタックスハイライト（rehype-pretty-code）

```bash
npm install rehype-pretty-code shiki
```

`next.config.mjs`

```javascript
import createMDX from '@next/mdx';
import rehypePrettyCode from 'rehype-pretty-code';

const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
};

const withMDX = createMDX({
  options: {
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
});

export default withMDX(nextConfig);
```

### 目次生成（remark-toc）

```bash
npm install remark-toc remark-slug
```

`next.config.mjs`

```javascript
import remarkToc from 'remark-toc';
import remarkSlug from 'remark-slug';

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkSlug, [remarkToc, { heading: '目次' }]],
  },
});
```

MDXファイルに`## 目次`を追加すると、自動で目次が生成されます。

### 数式表示（remark-math + rehype-katex）

```bash
npm install remark-math rehype-katex
```

```javascript
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
```

スタイルシートを追加（`app/layout.tsx`）:

```typescript
import 'katex/dist/katex.min.css';
```

## 実用的なコンポーネント例

### コードブロックにコピーボタンを追加

`components/CodeBlock.tsx`

```typescript
'use client';

import { useState } from 'react';

export function CodeBlock({ children, ...props }: any) {
  const [copied, setCopied] = useState(false);

  const code = children?.props?.children || '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre {...props}>{children}</pre>
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition"
      >
        {copied ? 'コピー完了!' : 'コピー'}
      </button>
    </div>
  );
}
```

### YouTube埋め込みコンポーネント

`components/YouTube.tsx`

```typescript
export function YouTube({ id }: { id: string }) {
  return (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={`https://www.youtube.com/embed/${id}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
```

使い方:

```mdx
<YouTube id="dQw4w9WgXcQ" />
```

### ツイート埋め込み

`components/Tweet.tsx`

```typescript
export function Tweet({ id }: { id: string }) {
  return (
    <div className="flex justify-center my-6">
      <blockquote className="twitter-tweet">
        <a href={`https://twitter.com/x/status/${id}`}>Tweet</a>
      </blockquote>
      <script async src="https://platform.twitter.com/widgets.js" />
    </div>
  );
}
```

## まとめ

MDXは、技術ブログを次のレベルに引き上げる強力なツールです。

**主要な利点:**
- Markdownの簡潔さとReactの柔軟性を両立
- インタラクティブなデモやビジュアライゼーションを埋め込み可能
- TypeScript対応で型安全
- Next.jsと完璧に統合
- 豊富なプラグインエコシステム

公式ドキュメント: https://mdxjs.com/

通常のMarkdownブログから一歩進んで、読者を惹きつけるインタラクティブなコンテンツを作成しましょう。MDXで技術ブログの可能性は無限に広がります。
