---
title: 'Astro完全ガイド — Islands Architecture・Content Collections・SSG/SSR・デプロイ'
description: 'Astroフレームワークを完全解説。Islands Architecture・.astroコンポーネント・Content Collections・React/Vue統合・View Transitions・SSG/SSR・Vercelデプロイまで実装例付きで網羅。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['Astro', 'SSG', 'Islands Architecture', 'TypeScript', 'フロントエンド']
---

Astroは2022年に正式リリースされて以来、コンテンツ主体のWebサイト構築において急速に支持を集めているフロントエンドフレームワークです。その最大の特徴は「デフォルトでJavaScriptを送らない」という大胆な設計思想にあります。本記事では、プロジェクトの初期化から本番デプロイまで、Astroのすべてを実践的なコード例とともに解説します。

---

## 1. Astroとは — Next.js・Gatsbyとの比較とIslands Architecture

### Astroが解決する問題

現代のWebフレームワークの多くは、SPAアーキテクチャを前提に設計されています。ReactやVueで構築されたサイトは、JavaScriptバンドルをクライアントに送り、ブラウザ上でHTMLを生成します（クライアントサイドレンダリング）。Next.jsやNuxtはサーバーサイドレンダリングを加えましたが、それでも大量のJavaScriptがクライアントに送られる「ハイドレーション」コストは避けられませんでした。

ブログ・ドキュメントサイト・マーケティングページのような**コンテンツ中心のサイト**では、インタラクティブな機能はごく一部です。それなのに、React全体のランタイムをユーザーに送り付けるのは過剰です。Astroはここに着目しました。

### フレームワーク比較

| 観点 | Astro | Next.js | Gatsby |
|------|-------|---------|--------|
| デフォルトJS送信 | ゼロ | あり | あり |
| アーキテクチャ | Islands | フルSPA/SSR | SSG |
| コンポーネント | .astro（複数UI対応） | React専用 | React専用 |
| ビルド速度 | 高速（Vite/Go） | 高速（Turbopack） | 中程度 |
| 学習コスト | 低〜中 | 中〜高 | 中 |
| コンテンツ適性 | 最高 | 高 | 高 |
| アプリ適性 | 低〜中 | 最高 | 低 |

### Islands Architecture（アイランドアーキテクチャ）

Astroの根幹をなす概念が「Islands Architecture」です。この設計では、ページの大部分は静的HTMLとして配信され、インタラクティブが必要な部分だけを「島（Island）」として独立したJavaScriptコンポーネントにします。

```
┌─────────────────────────────────────────┐
│            静的HTML（JavaScript なし）    │
│                                         │
│  ┌──────────────┐   ┌──────────────┐   │
│  │  Island      │   │  Island      │   │
│  │  検索コンポ  │   │  カルーセル  │   │
│  │  (React)     │   │  (Vue)       │   │
│  └──────────────┘   └──────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  Island: コメントフォーム (React) │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

各Islandは独立してハイドレートされます。しかも`client:visible`ディレクティブを使えば、ユーザーのビューポートに入ったときだけハイドレートする遅延ローディングも実現できます。

この設計により、Astroで構築されたページのCore Web Vitalsスコアは劇的に向上します。実際、LighthouseのPerformanceスコアで95〜100点を安定して取得できるサイトが続出しています。

---

## 2. プロジェクト初期化（create astro）

### インストールと初期セットアップ

Node.js 18.17.1以上が必要です。次のコマンドでプロジェクトを作成します。

```bash
# npm を使う場合
npm create astro@latest my-astro-project

# pnpm を使う場合（推奨）
pnpm create astro@latest my-astro-project

# bun を使う場合
bun create astro@latest my-astro-project
```

対話式のセットアップウィザードが起動します。

```
 astro   Launch sequence initiated.

   dir   Where should we create your new project?
         ./my-astro-project

  tmpl   How would you like to start your new project?
         ● A blog (recommended)
         ○ Use blog template
         ○ Empty

    ts   Do you plan to write TypeScript?
         ● Yes
         ○ No

   use   How strict should TypeScript be?
         ● Strict (recommended)
         ○ Strictest
         ○ Relaxed

  deps   Install dependencies?
         ● Yes ○ No

   git   Initialize a new git repository?
         ● Yes ○ No
```

### 生成されるプロジェクト構造

```
my-astro-project/
├── public/               # 静的アセット（最適化なし）
│   └── favicon.svg
├── src/
│   ├── components/       # 再利用可能コンポーネント
│   │   └── Card.astro
│   ├── content/          # Content Collections
│   │   ├── config.ts     # スキーマ定義
│   │   └── blog/         # ブログ記事（Markdown）
│   ├── layouts/          # 共有レイアウト
│   │   └── Layout.astro
│   ├── pages/            # ルーティング（ファイルベース）
│   │   ├── index.astro
│   │   └── blog/
│   │       └── [...slug].astro
│   └── assets/           # 最適化対象のアセット
│       └── images/
├── astro.config.mjs      # Astro設定
├── tsconfig.json
└── package.json
```

### astro.config.mjs の基本設定

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://yourdomain.com',
  integrations: [
    react(),
    tailwind(),
    mdx(),
    sitemap(),
  ],
  // SSGがデフォルト。SSRにする場合は 'server' または 'hybrid'
  output: 'static',
});
```

### 開発サーバーの起動

```bash
cd my-astro-project
pnpm dev
# → http://localhost:4321 で起動
```

ポート番号が4321なのはAstro特有です（4×3×2×1 = 24を狙ったジョーク）。ホットリロードが有効なので、ファイルを保存するたびにブラウザが自動更新されます。

---

## 3. .astroコンポーネント — Frontmatter・テンプレート・スタイル

### .astroファイルの構造

`.astro`ファイルはAstro独自のコンポーネント形式です。3つのセクションから構成されます。

```astro
---
// === Frontmatter（コンポーネントスクリプト）===
// TypeScriptが使える。サーバーサイドでのみ実行される。
import { getCollection } from 'astro:content';
import FormattedDate from '../components/FormattedDate.astro';

// Props の受け取り（後述）
interface Props {
  title: string;
  description?: string;
}
const { title, description = 'デフォルト説明文' } = Astro.props;

// データフェッチ（async/awaitが使える）
const posts = await getCollection('blog');
const latestPosts = posts
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
  .slice(0, 3);

// ビルド時の現在日時
const buildDate = new Date().toLocaleDateString('ja-JP');
---

<!-- === テンプレート（HTML） === -->
<!-- JSXと似ているが、`class` は `class` のまま（className不要） -->
<article class="prose">
  <h1>{title}</h1>
  {description && <p class="lead">{description}</p>}

  <!-- 条件分岐 -->
  {latestPosts.length > 0 ? (
    <ul>
      {latestPosts.map(post => (
        <li>
          <a href={`/blog/${post.slug}`}>{post.data.title}</a>
          <FormattedDate date={post.data.pubDate} />
        </li>
      ))}
    </ul>
  ) : (
    <p>記事がありません。</p>
  )}

  <!-- HTMLエスケープを無効化（信頼できるコンテンツのみ） -->
  <!-- <Fragment set:html={rawHtml} /> -->
</article>

<!-- === スタイル（スコープ付きCSS） === -->
<style>
  /* このスタイルはこのコンポーネントにのみ適用される */
  .prose {
    max-width: 65ch;
    margin: 0 auto;
  }

  h1 {
    font-size: 2rem;
    color: var(--color-heading);
  }

  /* グローバルスタイルにしたい場合は :global() を使う */
  :global(pre) {
    border-radius: 0.5rem;
  }
</style>
```

### Frontmatterの重要ポイント

Frontmatterはサーバーサイド（ビルド時またはリクエスト時）でのみ実行されます。`window`や`document`などのブラウザAPIは使えません。一方で：

- **async/await**が普通に使える
- Node.js APIが使える（`fs`、`path`など）
- 環境変数（`import.meta.env`）にアクセスできる
- TypeScriptが完全にサポートされる

```astro
---
// 環境変数へのアクセス
const apiKey = import.meta.env.PUBLIC_API_KEY; // PUBLIC_ プレフィックスでクライアントにも公開
const secret = import.meta.env.SECRET_KEY;      // サーバーサイドのみ

// Node.js APIの使用
import { readFileSync } from 'fs';
import { join } from 'path';
const data = readFileSync(join(process.cwd(), 'data.json'), 'utf-8');
---
```

### テンプレート構文の特徴

JSXと似ていますが、いくつかの違いがあります。

```astro
---
const items = ['りんご', 'バナナ', 'みかん'];
const isLoggedIn = true;
const rawHtml = '<strong>太字テキスト</strong>';
---

<!-- クラス名はclassName不要（classのまま） -->
<div class="container">

  <!-- 式の埋め込み -->
  <p>{items.length}件のアイテム</p>

  <!-- 配列のマッピング -->
  <ul>
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>

  <!-- 条件分岐（&&演算子） -->
  {isLoggedIn && <p>ようこそ！</p>}

  <!-- 三項演算子 -->
  {isLoggedIn ? <button>ログアウト</button> : <button>ログイン</button>}

  <!-- 生のHTMLを挿入 -->
  <Fragment set:html={rawHtml} />

  <!-- forディレクティブ（テキストとして設定） -->
  <h2 set:text="<script>alert('xss')</script>">
    {/* 上記はHTMLエスケープされて安全に表示される */}
  </h2>
</div>
```

---

## 4. コンポーネント間のProps・Slots

### Propsの定義と受け渡し

TypeScriptのinterfaceでPropsを型定義できます。

```astro
---
// src/components/BlogCard.astro
interface Props {
  title: string;
  description: string;
  pubDate: Date;
  slug: string;
  tags?: string[];
  featured?: boolean;
}

const {
  title,
  description,
  pubDate,
  slug,
  tags = [],
  featured = false,
} = Astro.props;

const formattedDate = pubDate.toLocaleDateString('ja-JP', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
---

<article class:list={['card', { 'card--featured': featured }]}>
  <div class="card__meta">
    <time datetime={pubDate.toISOString()}>{formattedDate}</time>
    {tags.length > 0 && (
      <ul class="tags">
        {tags.map(tag => <li class="tag">{tag}</li>)}
      </ul>
    )}
  </div>
  <h2 class="card__title">
    <a href={`/blog/${slug}`}>{title}</a>
  </h2>
  <p class="card__description">{description}</p>
</article>

<style>
  .card {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
    transition: box-shadow 0.2s;
  }
  .card--featured {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px #6366f130;
  }
</style>
```

使用側：

```astro
---
// src/pages/index.astro
import BlogCard from '../components/BlogCard.astro';
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');
---

<main>
  {posts.map(post => (
    <BlogCard
      title={post.data.title}
      description={post.data.description}
      pubDate={post.data.pubDate}
      slug={post.slug}
      tags={post.data.tags}
      featured={post.data.featured ?? false}
    />
  ))}
</main>
```

### Slots（スロット）

Slotを使うと、コンポーネントに任意のHTMLを注入できます。Vueのスロットに近い概念です。

```astro
---
// src/components/Card.astro
interface Props {
  title: string;
  variant?: 'default' | 'highlight';
}
const { title, variant = 'default' } = Astro.props;
---

<div class={`card card--${variant}`}>
  <header class="card__header">
    <!-- 名前付きスロット -->
    <slot name="icon" />
    <h3>{title}</h3>
  </header>
  <div class="card__body">
    <!-- デフォルトスロット -->
    <slot />
  </div>
  <footer class="card__footer">
    <!-- フォールバックコンテンツ付きスロット -->
    <slot name="actions">
      <button>詳細を見る</button>
    </slot>
  </footer>
</div>
```

使用側：

```astro
---
import Card from '../components/Card.astro';
---

<Card title="Astroの特徴">
  <!-- name="icon" のスロットに挿入 -->
  <svg slot="icon" width="24" height="24"><!-- ... --></svg>

  <!-- デフォルトスロットに挿入 -->
  <p>AstroはデフォルトでゼロのJavaScriptを送信します。</p>
  <p>パフォーマンスに優れたWebサイトを構築できます。</p>

  <!-- name="actions" のスロットに挿入 -->
  <div slot="actions">
    <a href="/docs">ドキュメントを読む</a>
    <a href="/tutorial">チュートリアルを始める</a>
  </div>
</Card>
```

---

## 5. Reactコンポーネント統合（client:load・client:idle・client:visible）

### インテグレーションのインストール

```bash
# React統合の追加（自動設定）
pnpm astro add react

# Vue統合
pnpm astro add vue

# Svelte統合
pnpm astro add svelte

# 複数同時追加も可能
pnpm astro add react vue solid
```

これにより`astro.config.mjs`に自動的に設定が追加されます。

### Reactコンポーネントの作成

```tsx
// src/components/SearchBox.tsx
import { useState, useCallback } from 'react';

interface SearchBoxProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export default function SearchBox({
  placeholder = '記事を検索...',
  onSearch,
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async (value: string) => {
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
      const data = await response.json();
      setResults(data.results);
      onSearch?.(value);
    } catch (error) {
      console.error('検索エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onSearch]);

  return (
    <div className="search-box">
      <input
        type="search"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="search-box__input"
        aria-label="記事を検索"
      />
      {isLoading && <div className="search-box__spinner" aria-live="polite">検索中...</div>}
      {results.length > 0 && (
        <ul className="search-box__results" role="listbox">
          {results.map((result, i) => (
            <li key={i} className="search-box__result-item" role="option">
              {result}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### クライアントディレクティブ

AstroでReactコンポーネントを使う際に、いつハイドレートするかを`client:*`ディレクティブで制御します。

```astro
---
import SearchBox from '../components/SearchBox.tsx';
import HeavyChart from '../components/HeavyChart.tsx';
import CommentForm from '../components/CommentForm.tsx';
import LazyWidget from '../components/LazyWidget.tsx';
---

<!-- client:load: ページロード直後にハイドレート（最速・最重）-->
<!-- 用途: ページロード時に即座にインタラクティブにしたい要素 -->
<SearchBox client:load />

<!-- client:idle: ブラウザがアイドル状態になったらハイドレート -->
<!-- 用途: 重要度が中程度のウィジェット -->
<HeavyChart client:idle />

<!-- client:visible: 要素がビューポートに入ったらハイドレート -->
<!-- 用途: ページ下部のコンポーネント（最もパフォーマンスに優しい） -->
<CommentForm client:visible />

<!-- client:media: CSSメディアクエリが一致したらハイドレート -->
<!-- 用途: モバイルのみ / デスクトップのみのコンポーネント -->
<LazyWidget client:media="(max-width: 768px)" />

<!-- client:only: サーバーレンダリングを完全にスキップ -->
<!-- 用途: ブラウザAPIに依存するコンポーネント（window, document等） -->
<MapComponent client:only="react" />
```

| ディレクティブ | タイミング | 推奨ユースケース |
|--------------|-----------|----------------|
| `client:load` | 即時 | ヘッダー検索、ナビゲーション |
| `client:idle` | アイドル時 | チャットウィジェット、広告 |
| `client:visible` | 表示時 | コメント欄、フォーム |
| `client:media` | メディア一致時 | レスポンシブUI |
| `client:only` | クライアントのみ | マップ、WebGL |

---

## 6. Content Collections（schema定義・Zod・型安全）

Content CollectionsはAstro v2で導入された、コンテンツ管理の革命的な機能です。Markdownファイルのfrontmatterを型安全に扱えます。

### スキーマの定義

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

// ブログコレクションのスキーマ
const blogCollection = defineCollection({
  type: 'content', // 'content'（Markdown/MDX）または 'data'（JSON/YAML）
  schema: ({ image }) => z.object({
    title: z.string().min(1, 'タイトルは必須です'),
    description: z.string().min(10).max(160),
    pubDate: z.coerce.date(), // 文字列をDateに自動変換
    updatedDate: z.coerce.date().optional(),
    heroImage: image().optional(), // Astroの画像最適化と統合
    author: z.string().default('編集部'),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    // 列挙型
    category: z.enum(['技術', 'ビジネス', 'デザイン', 'チュートリアル']),
    // ネストしたオブジェクト
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      noindex: z.boolean().default(false),
    }).optional(),
  }),
});

// 著者コレクション（データコレクション）
const authorsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    bio: z.string(),
    avatar: z.string().url(),
    social: z.object({
      twitter: z.string().optional(),
      github: z.string().optional(),
    }),
  }),
});

// 必ずexportする
export const collections = {
  blog: blogCollection,
  authors: authorsCollection,
};
```

### Content Collectionsの活用

```astro
---
// src/pages/blog/index.astro
import { getCollection, getEntry } from 'astro:content';

// コレクション全体を取得（型安全）
const allPosts = await getCollection('blog');

// フィルタリング（draftを除外、日付でソート）
const publishedPosts = await getCollection('blog', ({ data }) => {
  return !data.draft && data.pubDate <= new Date();
});

// 日付でソート
const sortedPosts = publishedPosts.sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
);

// カテゴリ別にグループ化
const postsByCategory = sortedPosts.reduce((acc, post) => {
  const category = post.data.category;
  if (!acc[category]) acc[category] = [];
  acc[category].push(post);
  return acc;
}, {} as Record<string, typeof sortedPosts>);

// 特定エントリの取得
const featuredPost = await getEntry('blog', 'my-featured-post');
---

<main>
  {Object.entries(postsByCategory).map(([category, posts]) => (
    <section>
      <h2>{category}</h2>
      <ul>
        {posts.map(post => (
          <li>
            <!-- post.data は完全に型付けされている -->
            <a href={`/blog/${post.slug}`}>
              {post.data.title}
            </a>
            <time>{post.data.pubDate.toLocaleDateString('ja-JP')}</time>
          </li>
        ))}
      </ul>
    </section>
  ))}
</main>
```

### Markdownファイルのfrontmatter例

スキーマに合わせたMarkdownファイル：

```markdown
---
title: 'TypeScript 5.0の新機能完全解説'
description: 'TypeScript 5.0で導入されたDecorators、const型パラメータ、複数設定ファイルの継承など主要な新機能を実践的なコード例で解説します。'
pubDate: '2026-02-15'
updatedDate: '2026-02-18'
author: '田中太郎'
category: '技術'
tags: ['TypeScript', 'JavaScript', 'プログラミング']
featured: true
draft: false
seo:
  title: 'TypeScript 5.0 新機能まとめ | TechBoost'
  description: 'TypeScript 5.0の全新機能を網羅したガイド'
---

記事本文はここから始まります...
```

Content CollectionsのスキーマはZodで定義します。Content CollectionsのJSONデータをデバッグしたいときは、[DevToolBox](https://usedevtools.com/)のJSONバリデーターが役立ちます。JSON構造の型チェックやスキーマ検証を素早く確認できるため、Astroのデータ型定義と突き合わせながら開発するのに非常に便利です。

---

## 7. ページとルーティング（動的ルート・getStaticPaths）

### ファイルベースルーティング

`src/pages/`ディレクトリの構造がそのままURLになります。

```
src/pages/
├── index.astro          → /
├── about.astro          → /about
├── blog/
│   ├── index.astro      → /blog
│   └── [slug].astro     → /blog/:slug（動的）
├── tags/
│   └── [tag].astro      → /tags/:tag（動的）
├── [...catchall].astro  → /* （残りすべて）
└── api/
    └── search.ts        → /api/search（APIエンドポイント）
```

### 動的ルートとgetStaticPaths

SSGモードでは、動的ルートの全バリアントをビルド時に生成する必要があります。`getStaticPaths`でそれを宣言します。

```astro
---
// src/pages/blog/[slug].astro
import { getCollection, type CollectionEntry } from 'astro:content';
import Layout from '../../layouts/BlogLayout.astro';

// SSGではこの関数が必須
export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  return posts.map(post => ({
    params: { slug: post.slug },
    // propsでコンポーネントにデータを渡す
    props: { post },
  }));
}

// getStaticPathsで渡したpropsを受け取る
interface Props {
  post: CollectionEntry<'blog'>;
}
const { post } = Astro.props;

// MarkdownをHTMLにレンダリング
const { Content, headings, remarkPluginFrontmatter } = await post.render();

// 前後の記事を取得（ナビゲーション用）
const allPosts = await getCollection('blog', ({ data }) => !data.draft);
const sortedPosts = allPosts.sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
);
const currentIndex = sortedPosts.findIndex(p => p.slug === post.slug);
const prevPost = currentIndex < sortedPosts.length - 1
  ? sortedPosts[currentIndex + 1]
  : null;
const nextPost = currentIndex > 0
  ? sortedPosts[currentIndex - 1]
  : null;
---

<Layout
  title={post.data.seo?.title ?? post.data.title}
  description={post.data.seo?.description ?? post.data.description}
>
  <article class="prose lg:prose-xl">
    <header>
      <h1>{post.data.title}</h1>
      <time datetime={post.data.pubDate.toISOString()}>
        {post.data.pubDate.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </time>
    </header>

    <!-- Markdownコンテンツのレンダリング -->
    <Content />
  </article>

  <!-- 目次 -->
  <nav class="toc" aria-label="目次">
    <h2>目次</h2>
    <ol>
      {headings
        .filter(h => h.depth <= 3)
        .map(heading => (
          <li style={`padding-left: ${(heading.depth - 2) * 1}rem`}>
            <a href={`#${heading.slug}`}>{heading.text}</a>
          </li>
        ))
      }
    </ol>
  </nav>

  <!-- 前後ナビゲーション -->
  <nav class="post-nav">
    {prevPost && (
      <a href={`/blog/${prevPost.slug}`} rel="prev">
        ← {prevPost.data.title}
      </a>
    )}
    {nextPost && (
      <a href={`/blog/${nextPost.slug}`} rel="next">
        {nextPost.data.title} →
      </a>
    )}
  </nav>
</Layout>
```

### タグページ（ネストした動的ルート）

```astro
---
// src/pages/tags/[tag].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  // 全タグを収集して重複排除
  const uniqueTags = [...new Set(posts.flatMap(post => post.data.tags))];

  return uniqueTags.map(tag => {
    const filteredPosts = posts.filter(post =>
      post.data.tags.includes(tag)
    );
    return {
      params: { tag },
      props: { posts: filteredPosts },
    };
  });
}

const { tag } = Astro.params;
const { posts } = Astro.props;
---

<h1>タグ: {tag}</h1>
<p>{posts.length}件の記事</p>
<!-- ... -->
```

---

## 8. Layouts（共有レイアウト・ネスト）

### 基本レイアウト

```astro
---
// src/layouts/BaseLayout.astro
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
  ogImage?: string;
  noindex?: boolean;
}

const {
  title,
  description = 'TechBoost — エンジニアのための技術ブログ',
  ogImage = '/og-image.png',
  noindex = false,
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---

<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="canonical" href={canonicalURL} />

    <!-- SEO -->
    <title>{title}</title>
    <meta name="description" content={description} />
    {noindex && <meta name="robots" content="noindex" />}

    <!-- OGP -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalURL} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={new URL(ogImage, Astro.url)} />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={new URL(ogImage, Astro.url)} />

    <!-- View Transitions（後述） -->
    <meta name="view-transition" content="same-origin" />
  </head>
  <body>
    <header class="site-header">
      <nav>
        <a href="/">TechBoost</a>
        <ul>
          <li><a href="/blog">ブログ</a></li>
          <li><a href="/tags">タグ</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </nav>
    </header>

    <main id="main-content">
      <slot />
    </main>

    <footer class="site-footer">
      <p>© 2026 TechBoost. All rights reserved.</p>
    </footer>
  </body>
</html>
```

### ネストしたレイアウト

```astro
---
// src/layouts/BlogLayout.astro
import BaseLayout from './BaseLayout.astro';
import { Image } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';

interface Props {
  post?: CollectionEntry<'blog'>;
  title: string;
  description: string;
}

const { post, title, description } = Astro.props;
---

<!-- ベースレイアウトをネスト -->
<BaseLayout title={title} description={description}>
  <div class="blog-layout">
    <aside class="sidebar">
      <slot name="sidebar">
        <!-- デフォルトサイドバーコンテンツ -->
        <div class="sidebar__widget">
          <h3>最新記事</h3>
          <!-- ... -->
        </div>
      </slot>
    </aside>

    <div class="blog-layout__content">
      {post?.data.heroImage && (
        <Image
          src={post.data.heroImage}
          alt={post.data.title}
          width={1200}
          height={630}
          class="hero-image"
        />
      )}
      <slot />
    </div>
  </div>
</BaseLayout>

<style>
  .blog-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
  @media (max-width: 768px) {
    .blog-layout {
      grid-template-columns: 1fr;
    }
    .sidebar {
      order: 2;
    }
  }
</style>
```

---

## 9. データフェッチング（Astro.glob・fetch）

### Astro.globによるファイル収集

`Astro.glob`はファイルシステムからファイルを動的にインポートする機能です（Viteのimport.meta.globのラッパー）。

```astro
---
// src/pages/portfolio.astro
// glob パターンでファイルを収集
const projects = await Astro.glob('../data/projects/*.json');
const images = await Astro.glob('../assets/gallery/*.{jpg,png,webp}');

// Markdown ファイルの収集（Content Collectionsが推奨だが、こちらも使える）
const legacyPosts = await Astro.glob('./blog/legacy/*.md');
---

<ul>
  {projects.map(project => (
    <li>
      <h3>{project.name}</h3>
      <a href={project.url}>{project.url}</a>
    </li>
  ))}
</ul>
```

### 外部APIからのデータフェッチ

Frontmatter内でfetchを使い、外部データを取得できます。

```astro
---
// src/pages/github-stats.astro
// ビルド時に外部APIを呼び出す
const GITHUB_USER = 'your-username';

const [userResponse, reposResponse] = await Promise.all([
  fetch(`https://api.github.com/users/${GITHUB_USER}`, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  }),
  fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=stars&per_page=6`, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.GITHUB_TOKEN}`,
    },
  }),
]);

if (!userResponse.ok || !reposResponse.ok) {
  throw new Error('GitHub APIの取得に失敗しました');
}

const user = await userResponse.json();
const repos = await reposResponse.json();

// TypeScriptで型定義
interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
}
const typedRepos = repos as GitHubRepo[];
---

<section class="github-stats">
  <h2>{user.name}のGitHub</h2>
  <div class="stats-grid">
    <div class="stat">
      <span class="stat__value">{user.public_repos}</span>
      <span class="stat__label">リポジトリ</span>
    </div>
    <div class="stat">
      <span class="stat__value">{user.followers}</span>
      <span class="stat__label">フォロワー</span>
    </div>
  </div>

  <ul class="repo-list">
    {typedRepos.map(repo => (
      <li class="repo-item">
        <a href={repo.html_url}>{repo.name}</a>
        {repo.description && <p>{repo.description}</p>}
        <span>★ {repo.stargazers_count}</span>
        {repo.language && <span>{repo.language}</span>}
      </li>
    ))}
  </ul>
</section>
```

### APIエンドポイント

`.ts`または`.js`ファイルで、RESTful APIエンドポイントを作成できます。

```typescript
// src/pages/api/search.ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q');

  if (!query || query.length < 2) {
    return new Response(
      JSON.stringify({ results: [], error: 'クエリは2文字以上必要です' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const results = posts
    .filter(post =>
      post.data.title.toLowerCase().includes(query.toLowerCase()) ||
      post.data.description.toLowerCase().includes(query.toLowerCase()) ||
      post.data.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    )
    .slice(0, 10)
    .map(post => ({
      title: post.data.title,
      description: post.data.description,
      slug: post.slug,
      tags: post.data.tags,
    }));

  return new Response(
    JSON.stringify({ results }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    }
  );
};
```

---

## 10. View Transitions API（ページ遷移アニメーション）

View TransitionsはAstro v3で正式サポートされた、MPAでSPAのようなページ遷移アニメーションを実現する機能です。

### 基本設定

```astro
---
// src/layouts/BaseLayout.astro
import { ViewTransitions } from 'astro:transitions';
---

<html>
  <head>
    <!-- ... -->
    <!-- これだけでデフォルトのフェードアニメーションが有効化される -->
    <ViewTransitions />
  </head>
  <body>
    <!-- ... -->
  </body>
</html>
```

### カスタムアニメーション

```astro
---
// src/components/BlogCard.astro
interface Props {
  post: {
    slug: string;
    data: { title: string; heroImage?: any };
  };
}
const { post } = Astro.props;
---

<!-- transition:name で要素を一意に識別し、ページ間でモーフィングさせる -->
<article>
  <img
    src={post.data.heroImage}
    alt=""
    transition:name={`hero-${post.slug}`}
    transition:animate="fade"
  />
  <h2 transition:name={`title-${post.slug}`}>
    <a href={`/blog/${post.slug}`}>{post.data.title}</a>
  </h2>
</article>
```

```astro
---
// src/pages/blog/[slug].astro — 対応する要素に同じtransition:nameを設定
---
<article>
  <img
    src={post.data.heroImage}
    alt={post.data.title}
    transition:name={`hero-${post.slug}`}  <!-- 同じname → モーフィング遷移 -->
  />
  <h1 transition:name={`title-${post.slug}`}>
    {post.data.title}
  </h1>
</article>
```

### カスタムアニメーション定義

```astro
---
import { fade, slide } from 'astro:transitions';
---

<!-- 組み込みアニメーション -->
<div transition:animate="fade">フェード</div>
<div transition:animate="slide">スライド</div>
<div transition:animate={fade({ duration: '0.5s' })}>カスタムフェード</div>

<!-- 完全カスタム -->
<div transition:animate={{
  forwards: {
    old: [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-100%)' }],
    new: [{ opacity: 0, transform: 'translateX(100%)' }, { opacity: 1, transform: 'translateX(0)' }],
  },
  backwards: {
    old: [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(100%)' }],
    new: [{ opacity: 0, transform: 'translateX(-100%)' }, { opacity: 1, transform: 'translateX(0)' }],
  },
}}>カスタムスライド</div>
```

### View Transitionsのイベントフック

```typescript
// src/scripts/transitions.ts
import { navigate } from 'astro:transitions/client';

// ページ遷移イベントのリスニング
document.addEventListener('astro:page-load', () => {
  // 新しいページが読み込まれた後に実行
  console.log('ページ遷移完了');
  initAnalytics();
});

document.addEventListener('astro:before-preparation', (event) => {
  // 遷移前処理
});

document.addEventListener('astro:after-swap', () => {
  // DOM更新後の処理（サードパーティライブラリの再初期化など）
  Prism.highlightAll(); // コードハイライトの再適用
});

// プログラムによるナビゲーション
async function goToPost(slug: string) {
  await navigate(`/blog/${slug}`);
}
```

---

## 11. SSR対応（output: server・アダプター設定）

Astroはデフォルトでは静的サイト生成（SSG）ですが、SSRに切り替えることができます。

### SSRモードの設定

```javascript
// astro.config.mjs — Vercel SSR
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'server', // 'static' | 'server' | 'hybrid'
  adapter: vercel({
    webAnalytics: { enabled: true },
    speedInsights: { enabled: true },
  }),
});
```

```bash
# アダプターのインストール
pnpm astro add vercel     # Vercel
pnpm astro add netlify    # Netlify
pnpm astro add cloudflare # Cloudflare Pages
pnpm astro add node       # Node.js（セルフホスト）
```

### outputモードの違い

| モード | 説明 | 用途 |
|--------|------|------|
| `static` | 全ページをビルド時に生成 | ブログ・ドキュメントサイト |
| `server` | 全リクエストをSSR | EC・認証サイト |
| `hybrid` | デフォルトSSR＋一部静的 | 混合コンテンツ |

### hybridモードでの使い分け

```astro
---
// src/pages/about.astro — 静的ページ（hybridモードで静的化）
export const prerender = true; // この宣言で静的生成に

const content = 'このページは静的生成されます';
---
<p>{content}</p>
```

```astro
---
// src/pages/dashboard.astro — 動的ページ（SSR）
// export const prerender = false; // デフォルトはfalse（SSR）

// リクエストヘッダーにアクセスできる
const userAgent = Astro.request.headers.get('user-agent');
const cookie = Astro.cookies.get('session');

// Cookieの設定
Astro.cookies.set('visited', 'true', {
  httpOnly: true,
  secure: true,
  maxAge: 60 * 60 * 24 * 30, // 30日
  sameSite: 'strict',
});

// リダイレクト
if (!cookie) {
  return Astro.redirect('/login', 302);
}

// リクエストのURLパラメータ
const searchParams = Astro.url.searchParams;
const page = Number(searchParams.get('page') ?? 1);
---

<div>認証済みダッシュボード</div>
```

### ミドルウェア

```typescript
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';

// 認証チェックミドルウェア
const auth = defineMiddleware(async (context, next) => {
  const { cookies, url, redirect } = context;
  const session = cookies.get('session')?.value;

  // 保護されたルートの確認
  const protectedRoutes = ['/dashboard', '/profile', '/admin'];
  const isProtected = protectedRoutes.some(route =>
    url.pathname.startsWith(route)
  );

  if (isProtected && !session) {
    return redirect('/login?from=' + encodeURIComponent(url.pathname));
  }

  // ローカルにユーザー情報を設定
  if (session) {
    context.locals.user = await getUserFromSession(session);
  }

  return next();
});

// ロギングミドルウェア
const logger = defineMiddleware(async (context, next) => {
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;
  console.log(`${context.request.method} ${context.url.pathname} - ${duration}ms`);
  return response;
});

// ミドルウェアをチェーン
export const onRequest = sequence(logger, auth);
```

---

## 12. 画像最適化（Imageコンポーネント）

Astroの`<Image />`コンポーネントは、画像を自動最適化します。

### 基本的な使い方

```astro
---
import { Image, Picture } from 'astro:assets';
import heroImage from '../assets/hero.jpg';
import authorAvatar from '../assets/author.png';
---

<!-- 基本的な画像最適化 -->
<!-- width/heightは必須（CLS防止） -->
<!-- webpへの自動変換、サイズ最適化が行われる -->
<Image
  src={heroImage}
  alt="ヒーロー画像"
  width={1200}
  height={630}
  format="webp"
  quality={80}
  loading="eager"
  fetchpriority="high"
/>

<!-- レスポンシブ画像（<picture>要素を生成） -->
<Picture
  src={heroImage}
  alt="ヒーロー画像"
  widths={[400, 800, 1200]}
  sizes="(max-width: 400px) 100vw, (max-width: 800px) 50vw, 1200px"
  formats={['avif', 'webp', 'jpeg']}
/>

<!-- 小さいアバター画像（eager loadingで優先読み込み） -->
<Image
  src={authorAvatar}
  alt="著者アバター"
  width={48}
  height={48}
  class="avatar"
/>
```

### 外部URLの画像（リモート画像）

```javascript
// astro.config.mjs でリモートドメインを許可
export default defineConfig({
  image: {
    domains: ['images.unsplash.com', 'cdn.example.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
  },
});
```

```astro
---
import { Image } from 'astro:assets';
---

<!-- リモート画像も最適化される -->
<Image
  src="https://images.unsplash.com/photo-1234567890"
  alt="Unsplashの画像"
  width={800}
  height={600}
  inferSize={true}  <!-- リモート画像のサイズを自動推論 -->
/>
```

---

## 13. Vercel・Cloudflare Pagesへのデプロイ

### Vercelへのデプロイ（SSG）

SSGの場合はアダプター不要です。

```javascript
// astro.config.mjs（SSGの場合）
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://your-site.vercel.app',
  output: 'static', // デフォルト
});
```

```bash
# Vercel CLIでデプロイ
pnpm add -g vercel
vercel

# または GitHub連携（Vercelダッシュボードで設定）
# pushするたびに自動デプロイ
```

### Vercel SSRデプロイ

```bash
# Vercelアダプターの追加
pnpm astro add vercel
```

```javascript
// astro.config.mjs（SSRの場合）
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    // エッジランタイムを使う場合
    edgeMiddleware: true,
    // 画像サービスをVercelに委任
    imageService: true,
  }),
});
```

```json
// vercel.json（オプション設定）
{
  "buildCommand": "astro build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install",
  "framework": "astro",
  "regions": ["nrt1"]
}
```

### Cloudflare Pagesへのデプロイ

```bash
pnpm astro add cloudflare
```

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory', // 'advanced' または 'directory'
    routes: {
      extend: {
        exclude: [{ pattern: '/static/*' }],
      },
    },
  }),
});
```

```toml
# wrangler.toml（Cloudflare Workers設定）
name = "my-astro-site"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"
```

### GitHub Actionsによる自動デプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm astro check

      - name: Build
        run: pnpm build
        env:
          PUBLIC_API_KEY: ${{ secrets.PUBLIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_PAT }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: my-astro-site
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### ビルド最適化のベストプラクティス

```javascript
// astro.config.mjs — 本番向け最適化設定
import { defineConfig } from 'astro/config';
import compress from 'astro-compress';

export default defineConfig({
  compressHTML: true,  // HTMLの空白を削除
  build: {
    inlineStylesheets: 'auto', // 小さいCSSをインライン化
    assets: '_assets',         // アセットディレクトリ名
    concurrency: 2,            // 並列ビルド数
  },
  vite: {
    build: {
      cssMinify: 'lightningcss', // 高速CSSミニファイ
      rollupOptions: {
        output: {
          manualChunks: {
            // コードスプリッティングの設定
            react: ['react', 'react-dom'],
          },
        },
      },
    },
  },
  integrations: [
    compress({
      CSS: true,
      HTML: true,
      Image: false, // Astroの画像最適化と競合しないよう無効化
      JavaScript: true,
      SVG: true,
    }),
  ],
});
```

---

## まとめ — Astroを選ぶべきプロジェクト

Astroは万能ではありませんが、適切なユースケースでは圧倒的な強みを発揮します。

**Astroが最適なケース：**
- ブログ・ドキュメントサイト・マーケティングページ
- パフォーマンスが最重要な静的コンテンツサイト
- 既存のReact/Vue資産を活かしながら移行したい場合
- Core Web Vitalsのスコアを最大化したい場合

**Astroより他を選ぶべきケース：**
- リアルタイムデータが多いWebアプリ（Next.js推奨）
- 複雑な状態管理が必要なSPA（Next.js / Nuxt推奨）
- Eコマースの複雑なカート・決済フロー（Next.js推奨）

本記事で解説したContent Collectionsを実装すると、JSONスキーマのデバッグ作業が発生することがあります。特にZodスキーマと実際のMarkdown frontmatterの型が一致しているか確認する場面では、[DevToolBox](https://usedevtools.com/)が非常に役立ちます。JSONのバリデーション・フォーマット・型チェックをブラウザ上でリアルタイムに確認できるため、Content Collectionsのスキーマ設計時にぜひ活用してください。

Astroのエコシステムは急速に成熟しており、公式インテグレーション（Tailwind・React・Vue・Svelte・MDX・Sitemap・Partytown）が充実しています。まずは`pnpm create astro@latest`でプロジェクトを作成し、Islands Architectureの圧倒的なパフォーマンスを体感してみてください。
