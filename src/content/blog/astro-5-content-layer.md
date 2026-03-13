---
title: "Astro 5のContent Layer API完全解説 — 型安全なコンテンツ管理"
description: "Astro 5で導入されたContent Layer APIの使い方を徹底解説。カスタムローダー、外部データソース統合、型推論の活用方法まで実践的に紹介します。"
pubDate: "2026-02-05"
tags: ["Astro", "TypeScript", "Content Layer", "CMS", "静的サイト"]
heroImage: '../../assets/thumbnails/astro-5-content-layer.jpg'
---
Astro 5で導入されたContent Layer APIは、コンテンツ管理の方法を根本から変えました。従来のファイルベースのコンテンツコレクションに加え、外部API、データベース、HeadlessCMSなど、あらゆるデータソースを統一的に扱えるようになりました。この記事では、Content Layer APIの仕組みと実践的な使い方を解説します。

## Content Layer APIとは

Content Layer APIは、Astroのコンテンツソースを抽象化するレイヤーです。主な特徴は以下の通りです。

- **統一されたインターフェース** - ローカルファイルもAPIも同じように扱える
- **型安全** - Zodスキーマから自動的に型が生成される
- **キャッシュ機構** - ビルド時のパフォーマンスを最適化
- **Server Islands対応** - 動的コンテンツの配信

## 基本的な使い方

### 1. コンテンツコレクションの定義

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content', // or 'data'
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

### 2. コンテンツの取得

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'astro:content';

const allPosts = await getCollection('blog', ({ data }) => {
  return data.draft !== true;
});

const sortedPosts = allPosts.sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
);
---

<ul>
  {sortedPosts.map((post) => (
    <li>
      <a href={`/blog/${post.slug}/`}>
        {post.data.title}
      </a>
      <time datetime={post.data.pubDate.toISOString()}>
        {post.data.pubDate.toLocaleDateString('ja-JP')}
      </time>
    </li>
  ))}
</ul>
```

### 3. 個別記事の表示

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection, getEntry } from 'astro:content';
import type { GetStaticPaths } from 'astro';

export const getStaticPaths = (async () => {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}) satisfies GetStaticPaths;

const { post } = Astro.props;
const { Content } = await post.render();
---

<article>
  <h1>{post.data.title}</h1>
  <time>{post.data.pubDate.toLocaleDateString('ja-JP')}</time>
  <Content />
</article>
```

## カスタムローダーの作成

Content Layer APIの真価は、カスタムローダーで外部データソースを統合できる点にあります。

### NotionをCMSとして使う

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const notionLoader = {
  name: 'notion-loader',
  async load() {
    const databaseId = process.env.NOTION_DATABASE_ID!;

    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Published',
        checkbox: {
          equals: true,
        },
      },
    });

    return response.results.map((page: any) => {
      const properties = page.properties;

      return {
        id: page.id,
        slug: properties.Slug.rich_text[0]?.plain_text || page.id,
        data: {
          title: properties.Title.title[0]?.plain_text || 'Untitled',
          description: properties.Description.rich_text[0]?.plain_text || '',
          pubDate: new Date(properties.Date.date?.start || page.created_time),
          tags: properties.Tags.multi_select.map((tag: any) => tag.name),
        },
      };
    });
  },
};

const blog = defineCollection({
  loader: notionLoader,
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()),
  }),
});

export const collections = { blog };
```

### GitHub Issuesをコンテンツソースにする

```typescript
// src/content/loaders/github-issues.ts
import { Octokit } from '@octokit/rest';

export function githubIssuesLoader(owner: string, repo: string) {
  return {
    name: 'github-issues-loader',
    async load() {
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
      });

      const { data: issues } = await octokit.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        labels: 'blog-post',
      });

      return issues.map((issue) => ({
        id: String(issue.number),
        slug: issue.number.toString(),
        data: {
          title: issue.title,
          body: issue.body || '',
          pubDate: new Date(issue.created_at),
          updatedDate: new Date(issue.updated_at),
          author: issue.user?.login || 'unknown',
          labels: issue.labels.map((label) =>
            typeof label === 'string' ? label : label.name || ''
          ),
        },
      }));
    },
  };
}

// src/content/config.ts
import { defineCollection, z } from 'astro:content';
import { githubIssuesLoader } from './loaders/github-issues';

const issues = defineCollection({
  loader: githubIssuesLoader('your-username', 'your-repo'),
  schema: z.object({
    title: z.string(),
    body: z.string(),
    pubDate: z.date(),
    updatedDate: z.date(),
    author: z.string(),
    labels: z.array(z.string()),
  }),
});

export const collections = { issues };
```

## 外部データソース統合の実例

### 1. microCMSとの統合

```typescript
// src/content/loaders/microcms.ts
import { createClient } from 'microcms-js-sdk';

const client = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN!,
  apiKey: process.env.MICROCMS_API_KEY!,
});

export function microCMSLoader(endpoint: string) {
  return {
    name: 'microcms-loader',
    async load() {
      const { contents } = await client.getList({
        endpoint,
        queries: {
          limit: 100,
        },
      });

      return contents.map((content: any) => ({
        id: content.id,
        slug: content.slug || content.id,
        data: {
          title: content.title,
          description: content.description,
          body: content.body,
          pubDate: new Date(content.publishedAt),
          updatedDate: new Date(content.updatedAt),
          category: content.category?.name,
          tags: content.tags?.map((tag: any) => tag.name) || [],
        },
      }));
    },
  };
}

// src/content/config.ts
const blog = defineCollection({
  loader: microCMSLoader('blog'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    body: z.string(),
    pubDate: z.date(),
    updatedDate: z.date(),
    category: z.string().optional(),
    tags: z.array(z.string()),
  }),
});
```

### 2. Supabaseとの統合

```typescript
// src/content/loaders/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export function supabaseLoader(table: string) {
  return {
    name: 'supabase-loader',
    async load() {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((row) => ({
        id: row.id,
        slug: row.slug,
        data: {
          title: row.title,
          description: row.description,
          content: row.content,
          pubDate: new Date(row.created_at),
          author: row.author_id,
          tags: row.tags,
        },
      }));
    },
  };
}
```

## 型推論の活用

Content Layer APIはZodスキーマから自動的に型を生成します。

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()),
    author: z.object({
      name: z.string(),
      url: z.string().url(),
    }).optional(),
  }),
});

export const collections = { blog };

// 型の自動推論
// src/components/BlogCard.astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  post: CollectionEntry<'blog'>;
}

const { post } = Astro.props;

// post.data.title は string型
// post.data.author は { name: string; url: string } | undefined 型
---

<article>
  <h2>{post.data.title}</h2>
  <p>{post.data.description}</p>
  {post.data.author && (
    <a href={post.data.author.url}>{post.data.author.name}</a>
  )}
</article>
```

## Server Islandsとの組み合わせ

Astro 5のServer Islandsを使えば、動的なコンテンツもSSGサイトに組み込めます。

```astro
---
// src/components/RecentPosts.astro
import { getCollection } from 'astro:content';

// このコンポーネントはリクエスト時に実行される
const recentPosts = await getCollection('blog', ({ data }) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return data.pubDate >= oneWeekAgo;
});
---

<div server:defer>
  <h2>最近の投稿</h2>
  <ul>
    {recentPosts.map((post) => (
      <li>
        <a href={`/blog/${post.slug}/`}>{post.data.title}</a>
      </li>
    ))}
  </ul>
</div>
```

## キャッシュ戦略

Content Layer APIは自動的にキャッシュを管理しますが、カスタムローダーでキャッシュ戦略を制御できます。

```typescript
export function cachedLoader(fetcher: () => Promise<any[]>) {
  return {
    name: 'cached-loader',
    async load() {
      // キャッシュの有効期限を設定
      const cacheKey = 'my-content-cache';
      const cacheDuration = 1000 * 60 * 60; // 1時間

      // ... キャッシュロジック
      const data = await fetcher();
      return data;
    },
    // 開発時にはキャッシュをスキップ
    watch: process.env.NODE_ENV === 'development',
  };
}
```

## まとめ

Astro 5のContent Layer APIは、静的サイトジェネレーターの可能性を大きく広げました。

**主なメリット:**
- 型安全なコンテンツ管理
- 柔軟なデータソース統合
- パフォーマンスの最適化
- Server Islandsとの連携

HeadlessCMS、データベース、外部APIなど、あらゆるコンテンツソースをAstroで統一的に扱えるようになったことで、より柔軟なサイト構築が可能になりました。カスタムローダーを活用して、プロジェクトに最適なコンテンツ管理を実現しましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
