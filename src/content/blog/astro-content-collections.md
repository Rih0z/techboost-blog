---
title: "Astro Content Collections 活用ガイド - 型安全なコンテンツ管理を実現"
description: "Astro 2.0で導入されたContent Collectionsの使い方を徹底解説。Zodスキーマによる型安全性、コンテンツのクエリ・ソート・フィルタリング、MDXとの連携など実践的なテクニックを紹介。"
pubDate: "2025-02-05"
tags: ["Astro", "TypeScript", "コンテンツ管理"]
---

Astro Content Collectionsは、Markdown/MDXファイルを型安全に管理できる強力な機能です。本記事では、基本的な使い方から実践的なテクニックまで、包括的に解説します。

## Content Collectionsとは

Content Collectionsは、Astro 2.0で導入された、コンテンツファイル（Markdown/MDX）を構造化し、型安全に扱うための機能です。Zodスキーマを使ってfrontmatterの型を定義し、TypeScriptによる完全な型チェックを実現します。

### 主な特徴

- **型安全性**: TypeScript + Zodによる厳密な型チェック
- **パフォーマンス**: ビルド時の最適化とキャッシング
- **開発者体験**: 自動補完とエラー検出
- **柔軟性**: カスタムスキーマ、リレーション、変換処理

## 基本的なセットアップ

### ディレクトリ構造

```
src/
├── content/
│   ├── config.ts          # スキーマ定義
│   ├── blog/              # ブログ記事コレクション
│   │   ├── post-1.md
│   │   └── post-2.mdx
│   └── authors/           # 著者コレクション
│       ├── alice.md
│       └── bob.md
└── pages/
    └── blog/
        └── [slug].astro
```

### スキーマの定義

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    author: z.string(),
    coverImage: z.string().optional(),
  }),
});

const authorCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    bio: z.string(),
    avatar: z.string(),
    twitter: z.string().optional(),
    github: z.string().optional(),
  }),
});

export const collections = {
  blog: blogCollection,
  authors: authorCollection,
};
```

### コンテンツファイルの作成

```markdown
---
title: "Astro Content Collections入門"
description: "型安全なコンテンツ管理の始め方"
pubDate: 2025-02-05
tags: ["astro", "typescript"]
author: "alice"
featured: true
---

本文がここに入ります。Markdown記法が使えます。

## セクション1

コンテンツ...
```

## コンテンツのクエリ

### すべてのエントリを取得

```typescript
// src/pages/blog/index.astro
---
import { getCollection } from 'astro:content';

// すべてのブログ記事を取得
const allPosts = await getCollection('blog');

// 公開済み記事のみ取得（下書きを除外）
const publishedPosts = await getCollection('blog', ({ data }) => {
  return data.draft !== true;
});

// タグでフィルタリング
const astroPosts = await getCollection('blog', ({ data }) => {
  return data.tags.includes('astro');
});
---

<ul>
  {publishedPosts.map((post) => (
    <li>
      <a href={`/blog/${post.slug}`}>
        {post.data.title}
      </a>
    </li>
  ))}
</ul>
```

### 単一エントリの取得

```typescript
// src/pages/blog/[slug].astro
---
import { getEntry } from 'astro:content';

const { slug } = Astro.params;
const post = await getEntry('blog', slug);

if (!post) {
  return Astro.redirect('/404');
}

const { Content } = await post.render();
---

<article>
  <h1>{post.data.title}</h1>
  <p>{post.data.description}</p>
  <time datetime={post.data.pubDate.toISOString()}>
    {post.data.pubDate.toLocaleDateString('ja-JP')}
  </time>

  <Content />
</article>
```

### 動的ルーティング

```typescript
// src/pages/blog/[slug].astro
---
import { getCollection } from 'astro:content';

// 静的サイト生成のためのパスを生成
export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => {
    return data.draft !== true;
  });

  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content, headings } = await post.render();
---

<article>
  <h1>{post.data.title}</h1>

  <!-- 目次の生成 -->
  <nav>
    <h2>目次</h2>
    <ul>
      {headings.map((heading) => (
        <li style={`margin-left: ${(heading.depth - 1) * 20}px`}>
          <a href={`#${heading.slug}`}>{heading.text}</a>
        </li>
      ))}
    </ul>
  </nav>

  <Content />
</article>
```

## ソートとフィルタリング

### 日付でソート

```typescript
// 最新の記事順
const sortedPosts = allPosts.sort((a, b) => {
  return b.data.pubDate.getTime() - a.data.pubDate.getTime();
});

// 古い記事順
const oldestFirst = allPosts.sort((a, b) => {
  return a.data.pubDate.getTime() - b.data.pubDate.getTime();
});
```

### 複雑なフィルタリング

```typescript
// 注目記事かつ特定タグを含む
const featuredAstroPosts = await getCollection('blog', ({ data }) => {
  return data.featured && data.tags.includes('astro') && !data.draft;
});

// 特定期間の記事
const recentPosts = await getCollection('blog', ({ data }) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return data.pubDate >= thirtyDaysAgo;
});

// 特定著者の記事
const alicePosts = await getCollection('blog', ({ data }) => {
  return data.author === 'alice';
});
```

### ページネーション

```typescript
// src/pages/blog/page/[page].astro
---
import { getCollection } from 'astro:content';

export async function getStaticPaths({ paginate }) {
  const allPosts = await getCollection('blog', ({ data }) => {
    return !data.draft;
  });

  const sortedPosts = allPosts.sort((a, b) => {
    return b.data.pubDate.getTime() - a.data.pubDate.getTime();
  });

  // 1ページあたり10記事
  return paginate(sortedPosts, { pageSize: 10 });
}

const { page } = Astro.props;
---

<div>
  {page.data.map((post) => (
    <article>
      <h2>{post.data.title}</h2>
      <p>{post.data.description}</p>
      <a href={`/blog/${post.slug}`}>続きを読む</a>
    </article>
  ))}
</div>

<!-- ページネーションナビゲーション -->
<nav>
  {page.url.prev && <a href={page.url.prev}>前へ</a>}
  <span>ページ {page.currentPage} / {page.lastPage}</span>
  {page.url.next && <a href={page.url.next}>次へ</a>}
</nav>
```

## 高度なスキーマ定義

### カスタムバリデーション

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(10).max(100),
    description: z.string().min(50).max(200),

    // URLの検証
    canonicalUrl: z.string().url().optional(),

    // メールアドレスの検証
    authorEmail: z.string().email(),

    // 列挙型
    category: z.enum(['tech', 'design', 'business']),

    // タグは最低1つ、最大5つ
    tags: z.array(z.string()).min(1).max(5),

    // 読了時間（分）は正の整数
    readingTime: z.number().int().positive(),

    // 公開日は過去の日付のみ
    pubDate: z.date().max(new Date()),

    // カスタムバリデーション
    slug: z.string().regex(/^[a-z0-9-]+$/),
  }),
});
```

### デフォルト値と変換

```typescript
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),

    // デフォルト値
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    views: z.number().default(0),

    // 日付の変換（文字列から日付へ）
    pubDate: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),

    // タグの正規化（小文字に変換）
    tags: z
      .array(z.string())
      .transform((tags) => tags.map((tag) => tag.toLowerCase())),

    // オプショナルな値の処理
    coverImage: z.string().optional(),
    updatedDate: z.date().optional(),
  }),
});
```

### リレーションの定義

```typescript
import { defineCollection, reference, z } from 'astro:content';

const authorCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    bio: z.string(),
    avatar: z.string(),
  }),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),

    // 著者へのリファレンス
    author: reference('authors'),

    // 関連記事へのリファレンス（複数）
    relatedPosts: z.array(reference('blog')).optional(),
  }),
});

export const collections = {
  blog: blogCollection,
  authors: authorCollection,
};
```

### リレーションの使用

```typescript
---
import { getEntry } from 'astro:content';

const post = await getEntry('blog', Astro.params.slug);

// 著者情報を取得
const author = await getEntry(post.data.author);

// 関連記事を取得
const relatedPosts = post.data.relatedPosts
  ? await Promise.all(
      post.data.relatedPosts.map((ref) => getEntry(ref))
    )
  : [];
---

<article>
  <h1>{post.data.title}</h1>

  <!-- 著者情報 -->
  <div class="author">
    <img src={author.data.avatar} alt={author.data.name} />
    <div>
      <h3>{author.data.name}</h3>
      <p>{author.data.bio}</p>
    </div>
  </div>

  <!-- 記事本文 -->
  <Content />

  <!-- 関連記事 -->
  {relatedPosts.length > 0 && (
    <aside>
      <h2>関連記事</h2>
      <ul>
        {relatedPosts.map((relatedPost) => (
          <li>
            <a href={`/blog/${relatedPost.slug}`}>
              {relatedPost.data.title}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )}
</article>
```

## MDXとの連携

### MDXコンポーネントの使用

```mdx
---
title: "インタラクティブな記事"
description: "MDXで作る動的なコンテンツ"
pubDate: 2025-02-05
tags: ["astro", "mdx"]
---

import { Code } from 'astro:components';
import Counter from '../../components/Counter.jsx';

# {frontmatter.title}

通常のMarkdownに加えて、コンポーネントが使えます。

<Counter client:load />

<Code code={`console.log('Hello, World!');`} lang="javascript" />
```

### カスタムコンポーネントの設定

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: 'dracula',
      wrap: true,
    },
  },
});
```

```typescript
// src/pages/blog/[slug].astro
---
import { getEntry } from 'astro:content';
import CodeBlock from '../../components/CodeBlock.astro';
import Callout from '../../components/Callout.astro';

const post = await getEntry('blog', Astro.params.slug);
const { Content } = await post.render();
---

<article>
  <Content components={{ pre: CodeBlock, blockquote: Callout }} />
</article>
```

## タグページの自動生成

```typescript
// src/pages/tags/[tag].astro
---
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const allPosts = await getCollection('blog', ({ data }) => !data.draft);

  // すべてのタグを収集
  const allTags = new Set();
  allPosts.forEach((post) => {
    post.data.tags.forEach((tag) => allTags.add(tag));
  });

  // タグごとのページを生成
  return Array.from(allTags).map((tag) => {
    const tagPosts = allPosts.filter((post) =>
      post.data.tags.includes(tag)
    );

    return {
      params: { tag },
      props: { posts: tagPosts, tag },
    };
  });
}

const { posts, tag } = Astro.props;
---

<div>
  <h1>タグ: {tag}</h1>
  <p>{posts.length}件の記事</p>

  <ul>
    {posts.map((post) => (
      <li>
        <a href={`/blog/${post.slug}`}>{post.data.title}</a>
        <time>{post.data.pubDate.toLocaleDateString('ja-JP')}</time>
      </li>
    ))}
  </ul>
</div>
```

## RSSフィードの生成

```typescript
// src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  const sortedPosts = posts.sort((a, b) => {
    return b.data.pubDate.getTime() - a.data.pubDate.getTime();
  });

  return rss({
    title: 'My Blog',
    description: 'A blog about web development',
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`,
      categories: post.data.tags,
      author: post.data.author,
    })),
    customData: '<language>ja</language>',
  });
}
```

## 検索機能の実装

### シンプルな全文検索

```typescript
// src/components/Search.astro
---
import { getCollection } from 'astro:content';

const allPosts = await getCollection('blog', ({ data }) => !data.draft);

// クライアント側で検索するためのデータを用意
const searchData = allPosts.map((post) => ({
  slug: post.slug,
  title: post.data.title,
  description: post.data.description,
  tags: post.data.tags,
}));
---

<div id="search-container">
  <input
    type="search"
    id="search-input"
    placeholder="記事を検索..."
  />
  <div id="search-results"></div>
</div>

<script define:vars={{ searchData }}>
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  input.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();

    if (!query) {
      results.innerHTML = '';
      return;
    }

    const filtered = searchData.filter((post) => {
      return (
        post.title.toLowerCase().includes(query) ||
        post.description.toLowerCase().includes(query) ||
        post.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });

    results.innerHTML = filtered
      .map((post) => {
        return `
          <a href="/blog/${post.slug}">
            <h3>${post.title}</h3>
            <p>${post.description}</p>
          </a>
        `;
      })
      .join('');
  });
</script>
```

## パフォーマンス最適化

### 画像の最適化

```typescript
// src/pages/blog/[slug].astro
---
import { Image } from 'astro:assets';
import { getEntry } from 'astro:content';

const post = await getEntry('blog', Astro.params.slug);

// 画像のインポート
const images = import.meta.glob('/src/assets/blog/*.{png,jpg,jpeg}');
const coverImage = post.data.coverImage
  ? await images[`/src/assets/blog/${post.data.coverImage}`]()
  : null;
---

<article>
  {coverImage && (
    <Image
      src={coverImage.default}
      alt={post.data.title}
      width={1200}
      height={630}
      format="webp"
      quality={80}
    />
  )}

  <h1>{post.data.title}</h1>
  <Content />
</article>
```

### コンテンツのキャッシング

```typescript
// src/lib/content-cache.ts
import { getCollection } from 'astro:content';

let cachedPosts: Awaited<ReturnType<typeof getCollection>> | null = null;

export async function getCachedPosts() {
  if (!cachedPosts) {
    cachedPosts = await getCollection('blog', ({ data }) => !data.draft);
  }
  return cachedPosts;
}

// ビルド時のみキャッシュを使用
export async function getPosts() {
  if (import.meta.env.PROD) {
    return getCachedPosts();
  }
  return getCollection('blog', ({ data }) => !data.draft);
}
```

## ベストプラクティス

### 1. 明確なスキーマ定義

```typescript
// すべての必須フィールドを明確に定義
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // 必須フィールド
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    author: reference('authors'),
    tags: z.array(z.string()).min(1),

    // オプションフィールド
    updatedDate: z.date().optional(),
    coverImage: z.string().optional(),
    canonicalUrl: z.string().url().optional(),

    // デフォルト値付きフィールド
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
});
```

### 2. エラーハンドリング

```typescript
---
import { getEntry } from 'astro:content';

const { slug } = Astro.params;

let post;
try {
  post = await getEntry('blog', slug);
} catch (error) {
  console.error('Failed to fetch post:', error);
  return Astro.redirect('/404');
}

if (!post) {
  return Astro.redirect('/404');
}

if (post.data.draft && import.meta.env.PROD) {
  return Astro.redirect('/404');
}
---
```

### 3. 型安全なユーティリティ関数

```typescript
// src/lib/content-utils.ts
import type { CollectionEntry } from 'astro:content';

export function sortByDate(
  posts: CollectionEntry<'blog'>[],
  order: 'asc' | 'desc' = 'desc'
) {
  return posts.sort((a, b) => {
    const diff = b.data.pubDate.getTime() - a.data.pubDate.getTime();
    return order === 'desc' ? diff : -diff;
  });
}

export function filterByTag(
  posts: CollectionEntry<'blog'>[],
  tag: string
) {
  return posts.filter((post) => post.data.tags.includes(tag));
}

export function groupByYear(posts: CollectionEntry<'blog'>[]) {
  return posts.reduce((acc, post) => {
    const year = post.data.pubDate.getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(post);
    return acc;
  }, {} as Record<number, CollectionEntry<'blog'>[]>);
}
```

## まとめ

Astro Content Collectionsは、型安全で効率的なコンテンツ管理を実現する強力な機能です。Zodスキーマによる厳密な型定義、柔軟なクエリAPI、MDXとのシームレスな連携により、大規模なコンテンツサイトでも安心して開発できます。

本記事で紹介したテクニックを活用することで、保守性が高く、パフォーマンスに優れたコンテンツサイトを構築できます。まずは基本的なセットアップから始めて、徐々に高度な機能を取り入れていきましょう。
