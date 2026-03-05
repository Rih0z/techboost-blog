---
title: "Xataサーバーレスデータベース入門 - PostgreSQLベースの次世代DB"
description: "Xataは、PostgreSQLをベースにした次世代のサーバーレスデータベースです。全文検索、ファイルストレージ、ブランチ機能などを備えた使いやすいDBを解説します。"
pubDate: "2025-02-05"
tags: ['インフラ']
---

最近のWebアプリケーション開発では、データベースの選択肢が増えてきました。従来のPostgreSQLやMySQL、NoSQLのMongoDB、そしてサーバーレスのSupabaseやPlanetScaleなど、さまざまな選択肢があります。

その中でも、**Xata**は、PostgreSQLをベースにした次世代のサーバーレスデータベースとして注目されています。この記事では、Xataの特徴から実践的な使い方まで、詳しく解説します。

## Xataとは？

[Xata](https://xata.io/)は、PostgreSQLをベースにしたサーバーレスデータベースプラットフォームです。以下のような特徴があります。

### 主な特徴

1. **PostgreSQLベース**: 信頼性の高いPostgreSQLを基盤に構築
2. **全文検索**: Elasticsearchレベルの全文検索が標準搭載
3. **ファイルストレージ**: 画像などのファイルを直接保存可能
4. **ブランチ機能**: Gitのようにデータベースをブランチ化
5. **TypeScript完全サポート**: 型安全なクライアントSDK
6. **REST API & GraphQL**: 柔軟なAPIアクセス
7. **無料プラン**: 小規模プロジェクトに十分な無料枠

### なぜXataを使うのか？

**従来のPostgreSQLの問題**
- サーバー管理が必要
- スケーリングが難しい
- 全文検索には別途Elasticsearchが必要
- ファイルストレージは別サービス

**XataベースのSupabaseとの違い**
- より強力な全文検索機能
- ファイルストレージが統合
- ブランチ機能でより柔軟な開発
- トランザクションのサポート

**Xataの解決**
- サーバーレスで管理不要
- 自動スケーリング
- 全文検索が標準搭載
- ファイルストレージが統合
- ブランチ機能でGitライクな開発

## セットアップ

### アカウント作成

1. [Xata](https://xata.io/)にアクセス
2. GitHubアカウントでサインアップ
3. ワークスペースを作成

### CLIのインストール

```bash
npm install -g @xata.io/cli
```

### ログイン

```bash
xata auth login
```

ブラウザが開き、認証を求められます。

### プロジェクトの初期化

```bash
# 新しいプロジェクトを作成
mkdir my-xata-app
cd my-xata-app
npm init -y

# Xataの初期化
xata init
```

対話的に以下を設定します。

- データベース名
- ブランチ名（デフォルトは`main`）
- TypeScript or JavaScript

これにより、`.xatarc`ファイルと`src/xata.ts`が生成されます。

## データベーススキーマの定義

### Webダッシュボードでの作成

Xataのダッシュボードでは、直感的にテーブルとカラムを作成できます。

1. ダッシュボードにアクセス
2. テーブルを作成
3. カラムを追加

### CLIでの作成

```bash
# スキーマの取得
xata schema dump

# スキーマの適用
xata schema upload schema.json
```

### 例: ブログのスキーマ

ダッシュボードで以下のテーブルを作成します。

**postsテーブル**
- `title` (string)
- `content` (text)
- `slug` (string)
- `published` (boolean)
- `publishedAt` (datetime)
- `author` (link to users)
- `image` (file)

**usersテーブル**
- `name` (string)
- `email` (email)
- `avatar` (file)

## TypeScript SDKの使い方

### クライアントの初期化

```typescript
// src/xata.ts (自動生成)
import { XataClient } from './xata';

const xata = new XataClient({
  apiKey: process.env.XATA_API_KEY,
  branch: process.env.XATA_BRANCH || 'main',
});

export { xata };
```

### 環境変数の設定

```bash
# .env
XATA_API_KEY=your_api_key
XATA_BRANCH=main
```

## CRUD操作

### レコードの作成

```typescript
import { xata } from './xata';

// 単一レコード作成
const user = await xata.db.users.create({
  name: "Alice",
  email: "alice@example.com"
});

console.log(user.id);  // 自動生成されたID

// 複数レコード作成
const users = await xata.db.users.create([
  { name: "Bob", email: "bob@example.com" },
  { name: "Charlie", email: "charlie@example.com" }
]);
```

### レコードの取得

```typescript
// IDで取得
const user = await xata.db.users.read("rec_xxxxx");

// すべて取得
const allUsers = await xata.db.users.getAll();

// フィルタリング
const activeUsers = await xata.db.users
  .filter({ "status": "active" })
  .getMany();

// 並び替え
const sortedUsers = await xata.db.users
  .sort("createdAt", "desc")
  .getMany();

// ページネーション
const page = await xata.db.users
  .getPaginated({
    pagination: { size: 10, offset: 0 }
  });

console.log(page.records);
console.log(page.hasNextPage);
```

### レコードの更新

```typescript
// 単一フィールドの更新
await xata.db.users.update("rec_xxxxx", {
  name: "Alice Smith"
});

// 複数フィールドの更新
await xata.db.users.update("rec_xxxxx", {
  name: "Alice Smith",
  email: "alice.smith@example.com"
});
```

### レコードの削除

```typescript
// IDで削除
await xata.db.users.delete("rec_xxxxx");

// 複数削除
await xata.db.users.delete([
  "rec_xxxxx",
  "rec_yyyyy"
]);
```

## リレーション

### リンクの作成

```typescript
// ユーザーを作成
const user = await xata.db.users.create({
  name: "Alice",
  email: "alice@example.com"
});

// 投稿を作成（ユーザーにリンク）
const post = await xata.db.posts.create({
  title: "My First Post",
  content: "Hello, World!",
  slug: "my-first-post",
  published: true,
  author: user.id  // リンク
});
```

### リレーションの取得

```typescript
// 投稿とユーザーを一緒に取得
const post = await xata.db.posts
  .filter({ slug: "my-first-post" })
  .select(["*", "author.*"])
  .getFirst();

console.log(post?.title);
console.log(post?.author?.name);

// ユーザーの投稿を取得
const userWithPosts = await xata.db.users
  .filter({ email: "alice@example.com" })
  .select(["*", "posts.*"])
  .getFirst();

console.log(userWithPosts?.posts);
```

## 全文検索

Xataの最大の特徴は、強力な全文検索機能です。

### 基本的な検索

```typescript
// タイトルと内容を検索
const results = await xata.db.posts.search("TypeScript", {
  target: ["title", "content"]
});

console.log(results.records);
```

### ファジー検索

```typescript
// スペルミスにも対応
const results = await xata.db.posts.search("typescirpt", {
  target: ["title", "content"],
  fuzziness: 2  // 2文字までの差異を許容
});
```

### ブースティング

```typescript
// タイトルの方を重視
const results = await xata.db.posts.search("React", {
  target: [
    { column: "title", weight: 3 },
    { column: "content", weight: 1 }
  ]
});
```

### フィルタリング付き検索

```typescript
// 公開済みの投稿のみを検索
const results = await xata.db.posts.search("JavaScript", {
  target: ["title", "content"],
  filter: { published: true }
});
```

### ハイライト

```typescript
// マッチした部分をハイライト
const results = await xata.db.posts.search("Node.js", {
  target: ["title", "content"],
  highlight: {
    enabled: true,
    tag: "<mark>"
  }
});

// ハイライトされたテキスト
console.log(results.records[0].xata.highlight.title);
```

## ファイルストレージ

Xataは、ファイルを直接保存できます。

### 画像のアップロード

```typescript
import { readFileSync } from "fs";

// ファイルを読み込み
const imageBuffer = readFileSync("avatar.png");

// ユーザーを作成してアバターを添付
const user = await xata.db.users.create({
  name: "Alice",
  email: "alice@example.com",
  avatar: {
    name: "avatar.png",
    mediaType: "image/png",
    base64Content: imageBuffer.toString("base64")
  }
});
```

### ファイルのURL取得

```typescript
const user = await xata.db.users.read("rec_xxxxx");

// 公開URL
console.log(user.avatar?.url);

// 画像の変換（リサイズ、トリミングなど）
console.log(user.avatar?.transform({
  width: 200,
  height: 200,
  fit: "cover"
}));
```

### ファイルの削除

```typescript
await xata.db.users.update("rec_xxxxx", {
  avatar: null
});
```

## ブランチ機能

Xataは、Gitのようにデータベースをブランチ化できます。

### ブランチの作成

```bash
# 新しいブランチを作成
xata branch create feature/new-schema

# ブランチ一覧
xata branch list

# ブランチの切り替え
xata branch use feature/new-schema
```

### 開発フロー

```bash
# 1. featureブランチを作成
xata branch create feature/add-comments

# 2. スキーマを変更（commentsテーブルを追加）
# ダッシュボードまたはCLIで変更

# 3. アプリをテスト
npm run dev

# 4. 問題なければmainにマージ
xata branch merge feature/add-comments main

# 5. featureブランチを削除
xata branch delete feature/add-comments
```

### 環境ごとのブランチ

```bash
# 開発環境
XATA_BRANCH=dev

# ステージング環境
XATA_BRANCH=staging

# 本番環境
XATA_BRANCH=main
```

## Next.jsでの実装例

### プロジェクトのセットアップ

```bash
npx create-next-app@latest my-blog
cd my-blog
npm install @xata.io/client
xata init
```

### 投稿一覧ページ

```typescript
// app/posts/page.tsx
import { xata } from "@/xata";

export default async function PostsPage() {
  const posts = await xata.db.posts
    .filter({ published: true })
    .sort("publishedAt", "desc")
    .select(["*", "author.*"])
    .getAll();

  return (
    <div>
      <h1>Blog Posts</h1>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>By {post.author?.name}</p>
          <p>{post.content.substring(0, 200)}...</p>
          <a href={`/posts/${post.slug}`}>Read more</a>
        </article>
      ))}
    </div>
  );
}
```

### 投稿詳細ページ

```typescript
// app/posts/[slug]/page.tsx
import { xata } from "@/xata";
import { notFound } from "next/navigation";

export default async function PostPage({
  params
}: {
  params: { slug: string }
}) {
  const post = await xata.db.posts
    .filter({ slug: params.slug, published: true })
    .select(["*", "author.*"])
    .getFirst();

  if (!post) {
    notFound();
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <p>By {post.author?.name}</p>
      <div>{post.content}</div>
    </article>
  );
}
```

### 検索ページ

```typescript
// app/search/page.tsx
import { xata } from "@/xata";

export default async function SearchPage({
  searchParams
}: {
  searchParams: { q?: string }
}) {
  const query = searchParams.q || "";

  const results = query
    ? await xata.db.posts.search(query, {
        target: ["title", "content"],
        filter: { published: true },
        fuzziness: 1
      })
    : { records: [] };

  return (
    <div>
      <h1>Search Results</h1>
      <p>Query: {query}</p>
      {results.records.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content.substring(0, 200)}...</p>
          <a href={`/posts/${post.slug}`}>Read more</a>
        </article>
      ))}
    </div>
  );
}
```

### API Route

```typescript
// app/api/posts/route.ts
import { xata } from "@/xata";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const posts = await xata.db.posts
    .filter({ published: true })
    .sort("publishedAt", "desc")
    .getAll();

  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const body = await request.json();

  const post = await xata.db.posts.create({
    title: body.title,
    content: body.content,
    slug: body.slug,
    published: false
  });

  return NextResponse.json(post);
}
```

## トランザクション

Xataは、PostgreSQLのトランザクション機能をサポートしています。

```typescript
import { xata } from "./xata";

// トランザクション
await xata.transactions.run(async (tx) => {
  // ユーザーを作成
  const user = await tx.db.users.create({
    name: "Alice",
    email: "alice@example.com"
  });

  // 投稿を作成
  await tx.db.posts.create({
    title: "First Post",
    content: "Hello!",
    author: user.id
  });

  // すべて成功すればコミット、失敗すればロールバック
});
```

## まとめ

Xataは、PostgreSQLをベースにした次世代のサーバーレスデータベースです。

**メリット**

- PostgreSQLの信頼性とパワー
- 強力な全文検索機能
- ファイルストレージが統合
- ブランチ機能で柔軟な開発
- TypeScript完全サポート
- 無料プランが充実

**使い所**

- ブログ・CMS
- Eコマースサイト
- SaaSアプリケーション
- 検索機能が必要なアプリ
- ファイルアップロード機能が必要なアプリ

**学習リソース**

- [公式ドキュメント](https://xata.io/docs)
- [TypeScript SDK](https://xata.io/docs/sdk/typescript/overview)
- [チュートリアル](https://xata.io/docs/getting-started)

Xataは、モダンなWebアプリケーション開発に最適なデータベースです。ぜひ、あなたのプロジェクトでも試してみてください。