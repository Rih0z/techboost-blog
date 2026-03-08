---
title: 'Astro DB完全ガイド - エッジ対応の組み込みSQLデータベース'
description: 'Astro DBの基礎から実践まで徹底解説。libSQLベースの型安全データベース、エッジランタイム対応、スキーマ定義、クエリAPI、Astroプロジェクトとの統合方法を完全網羅。Astro・Database・libSQLに関する実践情報。'
pubDate: '2026-02-05'
tags: ['Astro', 'Database', 'libSQL', 'TypeScript', 'Edge Computing']
heroImage: '../../assets/thumbnails/astro-db-guide.jpg'
---

## はじめに

Astro DB（@astrojs/db）は、2024年3月にリリースされ、2026年現在、**Astroプロジェクトの標準データベース**として急速に普及しています。

### Astro DBとは

Astro DBは、**Astro専用の組み込みSQLデータベース**で、以下の特徴があります。

- **完全統合**: Astroプロジェクトにゼロコンフィグで導入
- **libSQLベース**: Turso社が開発する高性能SQLiteフォーク
- **型安全**: TypeScriptの型が自動生成される
- **エッジ対応**: グローバルに分散配置可能
- **サーバーレス**: Astro StudioまたはTursoでホスティング
- **無料枠**: Astro Studioで月間100万リクエスト無料

### 他のデータベースとの比較

| 項目 | Astro DB | Supabase | PlanetScale | Turso |
|---|---|---|---|---|
| **料金** | 無料枠大 | 無料枠あり | 有料 | 無料枠あり |
| **セットアップ** | ゼロコンフィグ | 要設定 | 要設定 | 要設定 |
| **型生成** | 自動 | 手動 | 手動 | 手動 |
| **エッジ対応** | ◎ | △ | △ | ◎ |
| **SQL種類** | libSQL | PostgreSQL | MySQL | libSQL |
| **ローカル開発** | SQLite | 要Docker | 要設定 | SQLite |

## セットアップ

### インストール

```bash
# Astroプロジェクトに追加
npx astro add db

# または手動でインストール
npm install @astrojs/db
```

`astro add db`を実行すると、以下が自動で設定されます。

- `astro.config.mjs`に統合追加
- `db/config.ts`にスキーマファイル作成
- `db/seed.ts`にシードファイル作成

### プロジェクト構造

```
my-astro-app/
├── db/
│   ├── config.ts          ← スキーマ定義
│   └── seed.ts            ← 初期データ
├── src/
│   ├── pages/
│   │   └── index.astro
│   └── env.d.ts           ← 型定義（自動生成）
├── astro.config.mjs
└── package.json
```

### astro.config.mjs

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import db from '@astrojs/db';

export default defineConfig({
  integrations: [db()],
});
```

## スキーマ定義

### 基本的なテーブル定義

```typescript
// db/config.ts
import { defineDb, defineTable, column } from 'astro:db';

const User = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text({ optional: false }),
    email: column.text({ unique: true }),
    age: column.number({ optional: true }),
    isActive: column.boolean({ default: true }),
    createdAt: column.date({ default: new Date() }),
  },
});

const Post = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    content: column.text(),
    published: column.boolean({ default: false }),
    authorId: column.number({ references: () => User.columns.id }),
    createdAt: column.date({ default: new Date() }),
  },
});

export default defineDb({
  tables: { User, Post },
});
```

### カラムタイプ

Astro DBは以下のカラムタイプをサポートします。

```typescript
// テキスト型
column.text()
column.text({ optional: false }) // NOT NULL
column.text({ unique: true })     // UNIQUE
column.text({ default: 'default' })

// 数値型
column.number()
column.number({ primaryKey: true })

// 真偽値型
column.boolean()
column.boolean({ default: false })

// 日付型
column.date()
column.date({ default: new Date() })

// JSON型（文字列として保存）
column.json()
```

### 外部キー（リレーション）

```typescript
const Comment = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    content: column.text(),
    postId: column.number({
      references: () => Post.columns.id,
    }),
    userId: column.number({
      references: () => User.columns.id,
    }),
    createdAt: column.date({ default: new Date() }),
  },
});
```

### 複合主キー

```typescript
const PostTag = defineTable({
  columns: {
    postId: column.number({
      references: () => Post.columns.id,
      primaryKey: true,
    }),
    tagId: column.number({
      references: () => Tag.columns.id,
      primaryKey: true,
    }),
  },
});
```

### JSON型の活用

```typescript
const Product = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    // JSON型でメタデータを保存
    metadata: column.json(),
  },
});

// 使用例
await db.insert(Product).values({
  name: 'Laptop',
  metadata: {
    brand: 'Dell',
    specs: { ram: 16, storage: 512 },
    tags: ['electronics', 'computer'],
  },
});
```

## データ操作

### データの挿入

```typescript
import { db, User, Post } from 'astro:db';

// 単一レコード挿入
await db.insert(User).values({
  name: 'Alice',
  email: 'alice@example.com',
  age: 28,
});

// 複数レコード一括挿入
await db.insert(User).values([
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Charlie', email: 'charlie@example.com' },
]);

// リレーション付きデータ
const [user] = await db.insert(User).values({
  name: 'Dave',
  email: 'dave@example.com',
});

await db.insert(Post).values({
  title: 'My first post',
  content: 'Hello, Astro DB!',
  authorId: user.id,
});
```

### データの取得

```typescript
import { db, User, Post, eq, gt, and, like, desc } from 'astro:db';

// 全件取得
const allUsers = await db.select().from(User);

// 条件指定（WHERE）
const activeUsers = await db
  .select()
  .from(User)
  .where(eq(User.isActive, true));

// 複数条件（AND）
const adults = await db
  .select()
  .from(User)
  .where(and(
    gt(User.age, 18),
    eq(User.isActive, true)
  ));

// LIKE検索
const searchResults = await db
  .select()
  .from(User)
  .where(like(User.email, '%@gmail.com'));

// ソート
const sortedUsers = await db
  .select()
  .from(User)
  .orderBy(desc(User.createdAt));

// LIMIT/OFFSET（ページネーション）
const paginatedUsers = await db
  .select()
  .from(User)
  .limit(10)
  .offset(20);

// 特定カラムのみ取得
const names = await db
  .select({ name: User.name, email: User.email })
  .from(User);
```

### JOIN操作

```typescript
import { db, User, Post, eq } from 'astro:db';

// INNER JOIN
const postsWithAuthors = await db
  .select({
    postTitle: Post.title,
    authorName: User.name,
  })
  .from(Post)
  .innerJoin(User, eq(Post.authorId, User.id));

// LEFT JOIN
const allPostsWithAuthors = await db
  .select()
  .from(Post)
  .leftJoin(User, eq(Post.authorId, User.id));

// 複数JOIN
const commentsWithDetails = await db
  .select()
  .from(Comment)
  .innerJoin(Post, eq(Comment.postId, Post.id))
  .innerJoin(User, eq(Comment.userId, User.id));
```

### データの更新

```typescript
import { db, User, eq } from 'astro:db';

// 単一レコード更新
await db
  .update(User)
  .set({ name: 'Alice Updated' })
  .where(eq(User.id, 1));

// 複数カラム更新
await db
  .update(User)
  .set({
    age: 30,
    isActive: false,
  })
  .where(eq(User.id, 2));

// 条件付き更新
await db
  .update(Post)
  .set({ published: true })
  .where(eq(Post.authorId, 1));
```

### データの削除

```typescript
import { db, User, Post, eq } from 'astro:db';

// 単一レコード削除
await db.delete(User).where(eq(User.id, 1));

// 条件付き削除
await db.delete(Post).where(eq(Post.published, false));
```

### 集計クエリ

```typescript
import { db, User, Post, sql, eq } from 'astro:db';

// COUNT
const totalUsers = await db
  .select({ count: sql`count(*)` })
  .from(User);

// ユーザーごとの投稿数
const postCounts = await db
  .select({
    userId: Post.authorId,
    count: sql`count(*)`,
  })
  .from(Post)
  .groupBy(Post.authorId);

// 平均年齢
const avgAge = await db
  .select({ avg: sql`avg(${User.age})` })
  .from(User);
```

## シードデータ

### seed.tsの基本

```typescript
// db/seed.ts
import { db, User, Post } from 'astro:db';

export default async function seed() {
  // ユーザーデータ挿入
  await db.insert(User).values([
    { name: 'Alice', email: 'alice@example.com', age: 28 },
    { name: 'Bob', email: 'bob@example.com', age: 32 },
    { name: 'Charlie', email: 'charlie@example.com', age: 25 },
  ]);

  // 投稿データ挿入
  await db.insert(Post).values([
    {
      title: 'Getting Started with Astro DB',
      content: 'Astro DB is amazing!',
      authorId: 1,
      published: true,
    },
    {
      title: 'Building with Astro',
      content: 'Astro is fast and flexible.',
      authorId: 2,
      published: true,
    },
  ]);
}
```

### シード実行

```bash
# ローカル開発時
npm run astro db seed

# または開発サーバー起動時に自動実行
npm run dev
```

### 環境別シードデータ

```typescript
// db/seed.ts
import { db, User } from 'astro:db';

export default async function seed() {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    // 開発環境用のテストデータ
    await db.insert(User).values([
      { name: 'Test User 1', email: 'test1@example.com' },
      { name: 'Test User 2', email: 'test2@example.com' },
    ]);
  } else {
    // 本番環境用の初期データ
    await db.insert(User).values([
      { name: 'Admin', email: 'admin@example.com' },
    ]);
  }
}
```

### 外部データのインポート

```typescript
// db/seed.ts
import { db, User } from 'astro:db';
import usersData from './users.json';

export default async function seed() {
  await db.insert(User).values(usersData);
}
```

## Astroページでの使用

### Static Site Generation（SSG）

```astro
---
// src/pages/users/index.astro
import { db, User } from 'astro:db';

const users = await db.select().from(User);
---

<html>
  <body>
    <h1>Users</h1>
    <ul>
      {users.map(user => (
        <li>{user.name} - {user.email}</li>
      ))}
    </ul>
  </body>
</html>
```

### Server-Side Rendering（SSR）

```astro
---
// src/pages/posts/[id].astro
import { db, Post, User, eq } from 'astro:db';

const { id } = Astro.params;

const [post] = await db
  .select()
  .from(Post)
  .innerJoin(User, eq(Post.authorId, User.id))
  .where(eq(Post.id, Number(id)));

if (!post) {
  return Astro.redirect('/404');
}
---

<html>
  <body>
    <h1>{post.title}</h1>
    <p>By: {post.User.name}</p>
    <div>{post.content}</div>
  </body>
</html>
```

### APIエンドポイント

```typescript
// src/pages/api/users.ts
import type { APIRoute } from 'astro';
import { db, User } from 'astro:db';

export const GET: APIRoute = async () => {
  const users = await db.select().from(User);
  return new Response(JSON.stringify(users), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  await db.insert(User).values(data);
  return new Response(JSON.stringify({ success: true }), {
    status: 201,
  });
};
```

### フォーム送信の処理

```astro
---
// src/pages/users/new.astro
import { db, User } from 'astro:db';

if (Astro.request.method === 'POST') {
  const formData = await Astro.request.formData();
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  await db.insert(User).values({ name, email });
  return Astro.redirect('/users');
}
---

<html>
  <body>
    <h1>Create New User</h1>
    <form method="POST">
      <input type="text" name="name" required />
      <input type="email" name="email" required />
      <button type="submit">Create</button>
    </form>
  </body>
</html>
```

## ローカル開発

### ローカルデータベース

Astro DBはローカル開発時にSQLiteを使用します。

```bash
# 開発サーバー起動（自動でDBセットアップ）
npm run dev

# データベースファイルの場所
# .astro/content.db
```

### スキーマ変更の反映

```typescript
// db/config.tsを編集
const User = defineTable({
  columns: {
    // 新しいカラムを追加
    avatar: column.text({ optional: true }),
  },
});
```

```bash
# 開発サーバーを再起動すると自動反映
npm run dev
```

### データのリセット

```bash
# データベースファイルを削除
rm -rf .astro/content.db

# 開発サーバー再起動で再生成
npm run dev
```

### Drizzle Studioでの確認

Astro DBはDrizzle ORMベースなので、Drizzle Studioが使えます。

```bash
# Drizzle Studio起動
npx drizzle-kit studio

# ブラウザで http://localhost:5555 を開く
```

## Astro Studioへのデプロイ

### Astro Studioとは

Astro Studioは、Astro DBの公式ホスティングサービスです。

- **無料枠**: 月間100万リクエスト
- **グローバルエッジ**: 世界中に分散配置
- **自動バックアップ**: 毎日自動バックアップ
- **ダッシュボード**: データの確認・編集が可能

### プロジェクト作成

```bash
# Astro Studioにログイン
npx astro login

# プロジェクト作成
npx astro db link
```

対話形式でプロジェクト名を入力すると、`astro.config.mjs`に設定が追加されます。

### スキーマのプッシュ

```bash
# ローカルスキーマをStudioに反映
npx astro db push
```

実行すると、Astro Studio上にテーブルが作成されます。

### シードデータの投入

```bash
# Studioにシードデータを投入
npx astro db execute db/seed.ts --remote
```

### デプロイ（Vercel）

```bash
# Vercelにデプロイ
npx vercel

# 環境変数を設定
npx vercel env add ASTRO_STUDIO_APP_TOKEN
```

`ASTRO_STUDIO_APP_TOKEN`は、Astro Studioのダッシュボードから取得できます。

### デプロイ（Netlify）

```bash
# Netlifyにデプロイ
npx netlify deploy

# 環境変数を設定
npx netlify env:set ASTRO_STUDIO_APP_TOKEN <token>
```

### デプロイ（Cloudflare Pages）

```bash
# Cloudflare Pagesにデプロイ
npx wrangler pages deploy dist

# 環境変数を設定（ダッシュボードから）
# ASTRO_STUDIO_APP_TOKEN = <token>
```

## Tursoとの連携

### Tursoとは

Turso（旧libSQL）は、Astro DBのベースとなっているデータベースサービスです。

Astro Studioの代わりにTursoを使うことも可能です。

### Tursoセットアップ

```bash
# Turso CLIインストール
curl -sSfL https://get.tur.so/install.sh | bash

# ログイン
turso auth login

# データベース作成
turso db create my-astro-db

# 接続情報取得
turso db show my-astro-db
```

### Astroプロジェクトとの接続

```bash
# 環境変数設定
ASTRO_DB_REMOTE_URL=<turso-url>
ASTRO_DB_APP_TOKEN=<turso-token>
```

```bash
# スキーマをプッシュ
npx astro db push --remote-url=$ASTRO_DB_REMOTE_URL
```

### Tursoの利点

- **無料枠が大きい**: 月間500MB、25億行リード
- **レプリケーション**: 複数リージョンに配置可能
- **低レイテンシ**: エッジ対応
- **バックアップ**: Point-in-timeリカバリ

## パフォーマンス最適化

### インデックスの追加

Astro DBは現在、インデックス定義をサポートしていません。
代わりに、`sql`を使って手動で作成します。

```typescript
import { db, sql } from 'astro:db';

// インデックス作成
await db.run(sql`CREATE INDEX idx_user_email ON User(email)`);
```

### クエリ最適化

```typescript
// ❌ 悪い例: N+1問題
const posts = await db.select().from(Post);
for (const post of posts) {
  const author = await db.select().from(User).where(eq(User.id, post.authorId));
}

// ✅ 良い例: JOIN使用
const posts = await db
  .select()
  .from(Post)
  .innerJoin(User, eq(Post.authorId, User.id));
```

### ページネーション

```typescript
const PAGE_SIZE = 20;
const page = 1;

const users = await db
  .select()
  .from(User)
  .limit(PAGE_SIZE)
  .offset((page - 1) * PAGE_SIZE);
```

### 選択的カラム取得

```typescript
// ❌ 全カラム取得（不要なデータも取得）
const users = await db.select().from(User);

// ✅ 必要なカラムのみ
const users = await db
  .select({ id: User.id, name: User.name })
  .from(User);
```

### キャッシング

```typescript
// Astroのビルドイン機能を活用
import { cache } from 'astro:content';

const getUsers = cache(async () => {
  return await db.select().from(User);
});

// 複数回呼び出しても1回しかクエリ実行されない
const users1 = await getUsers();
const users2 = await getUsers(); // キャッシュから取得
```

## 実践的なパターン

### 認証システム

```typescript
// db/config.ts
const User = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    email: column.text({ unique: true }),
    passwordHash: column.text(),
    createdAt: column.date({ default: new Date() }),
  },
});

const Session = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.number({ references: () => User.columns.id }),
    expiresAt: column.date(),
  },
});
```

### ブログシステム

```typescript
const Post = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    slug: column.text({ unique: true }),
    title: column.text(),
    content: column.text(),
    published: column.boolean({ default: false }),
    authorId: column.number({ references: () => User.columns.id }),
    publishedAt: column.date({ optional: true }),
    createdAt: column.date({ default: new Date() }),
  },
});

const Tag = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text({ unique: true }),
  },
});

const PostTag = defineTable({
  columns: {
    postId: column.number({ references: () => Post.columns.id }),
    tagId: column.number({ references: () => Tag.columns.id }),
  },
});
```

### ECサイト

```typescript
const Product = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    price: column.number(),
    stock: column.number({ default: 0 }),
    metadata: column.json(), // 画像URL、説明等
  },
});

const Order = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    userId: column.number({ references: () => User.columns.id }),
    total: column.number(),
    status: column.text(), // pending, paid, shipped
    createdAt: column.date({ default: new Date() }),
  },
});

const OrderItem = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    orderId: column.number({ references: () => Order.columns.id }),
    productId: column.number({ references: () => Product.columns.id }),
    quantity: column.number(),
    price: column.number(), // 購入時の価格
  },
});
```

## トラブルシューティング

### スキーマ変更が反映されない

```bash
# 開発サーバーを再起動
npm run dev

# それでも反映されない場合、DBファイルを削除
rm -rf .astro/content.db
npm run dev
```

### 型エラーが出る

```bash
# 型定義を再生成
npm run astro sync
```

### デプロイエラー

```
エラー: "ASTRO_STUDIO_APP_TOKEN is not defined"

解決策:
1. Astro Studioダッシュボードからトークン取得
2. デプロイ先の環境変数に設定
3. 再デプロイ
```

### パフォーマンスが遅い

```typescript
// インデックスを追加
await db.run(sql`CREATE INDEX idx_post_author ON Post(authorId)`);

// JOINを活用（N+1問題を回避）
const posts = await db
  .select()
  .from(Post)
  .innerJoin(User, eq(Post.authorId, User.id));
```

## まとめ

### Astro DBの強み

1. **ゼロコンフィグ**: Astroプロジェクトに即統合
2. **型安全**: TypeScriptの型が自動生成
3. **エッジ対応**: グローバル配信が簡単
4. **無料枠が大きい**: 月間100万リクエスト
5. **開発体験が良い**: ローカル開発がスムーズ

### ベストプラクティス

- スキーマはシンプルに保つ
- JOINを活用してN+1問題を回避
- ページネーションで大量データに対応
- 環境別にシードデータを分ける
- Drizzle Studioでデバッグ

### 次のステップ

- 公式ドキュメント: https://docs.astro.build/en/guides/astro-db/
- Astro Studio: https://studio.astro.build/
- Turso: https://turso.tech/
- コミュニティ: Astro Discord

Astro DBで、高速かつ型安全なデータベース開発を実現しましょう。
