---
title: 'Drizzle ORM完全ガイド — 型安全・軽量・高速なTypeScript ORMの実践'
description: 'Drizzle ORMをTypeScriptで使い倒す完全ガイド。スキーマ定義・マイグレーション・クエリビルダー・リレーション・トランザクション・PostgreSQL/SQLite/MySQL対応・Next.js統合まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['Drizzle', 'ORM', 'TypeScript', 'PostgreSQL', 'データベース']
---

TypeScript製ORMの世界は急速に進化している。Prismaが「スキーマファースト」の設計思想で市場を席巻する一方、**Drizzle ORM**は全く異なるアプローチで注目を集めている。「コードファースト」「ゼロオーバーヘッド」「SQLライク」な設計哲学を掲げるDrizzleは、2024年以降急激にスターを伸ばし、TypeScript開発者の新たな選択肢として定着しつつある。

本記事では、Drizzle ORMの基本概念からNext.js統合・本番運用まで、TypeScriptコード例を交えながら徹底解説する。

---

## 1. Drizzle ORMとは — Prismaとの比較・なぜ選ぶか

### Drizzle ORMの基本思想

Drizzle ORMは「TypeScriptファースト」のORMだ。スキーマを外部DSL（Prismaの`.prisma`ファイル）ではなく、**TypeScriptコードそのものとして定義する**。これにより、スキーマ定義・クエリ・型定義が同じTypeScriptファイルに共存できる。

```
開発フロー（Drizzle）:
schema.ts（TypeScript）→ drizzle-kit generate → SQLマイグレーション
schema.ts（TypeScript）→ db.select()（型安全クエリ）
```

Drizzleの核心は「**SQLを隠さない**」設計にある。生成されるクエリが予測可能で、パフォーマンスチューニングのためにSQLを直接書くことも容易だ。

### Prismaとの比較

| 項目 | Drizzle ORM | Prisma |
|------|-------------|--------|
| スキーマ定義 | TypeScriptコード | 独自DSL（.prisma） |
| バンドルサイズ | ~35KB（軽量） | ~5MB以上（重い） |
| クエリスタイル | SQLライク | 抽象化されたAPI |
| Edgeランタイム対応 | ネイティブ対応 | 限定的 |
| コード生成 | 不要（型はスキーマから直接） | `prisma generate`必須 |
| マイグレーション | drizzle-kit | prisma migrate |
| Relational Queries | あり（v0.28+） | あり（include） |
| パフォーマンス | 高速（ゼロオーバーヘッド） | 中程度 |
| 学習コスト | SQL知識があれば低い | 独自DSLの学習が必要 |
| エコシステム成熟度 | 成長中 | 成熟 |

### Drizzleを選ぶべきケース

**Drizzleが適している場面:**
- Cloudflare Workers・Vercel Edge Functions などEdge環境での実行
- バンドルサイズの最小化が重要なプロジェクト
- SQLの知識を活かしたいチーム
- 生成クエリの完全なコントロールが必要なケース
- Next.js App Router + Server Actions の構成

**Prismaが適している場面:**
- 大規模チームでの開発（ドキュメントが豊富）
- スキーマファーストの設計を好む場合
- Prisma Studioなどのエコシステムを活用したい場合

### GitHubスター成長

Drizzle ORMは2023年後半から急速にスターを伸ばし、2024年には月次ダウンロード数が数百万を超えた。T3スタック（tRPC・Tailwind・TypeScript）コミュニティでの採用が進み、現在では主要なTypeScriptプロジェクトの選択肢として定着している。

---

## 2. セットアップ — drizzle-orm + drizzle-kit + postgres.js

### 必要なパッケージのインストール

PostgreSQLを使用する場合の標準的な構成：

```bash
# コアパッケージ
npm install drizzle-orm postgres

# 開発ツール（マイグレーション・Drizzle Studio）
npm install -D drizzle-kit

# TypeScript環境（必須）
npm install -D typescript @types/node ts-node
```

MySQLを使用する場合：

```bash
npm install drizzle-orm mysql2
npm install -D drizzle-kit
```

SQLiteを使用する場合（Cloudflare D1・Turso対応）：

```bash
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

### プロジェクト構成

```
src/
├── db/
│   ├── index.ts          # DB接続・drizzle初期化
│   ├── schema.ts         # スキーマ定義（メイン）
│   ├── schema/           # スキーマ分割（大規模向け）
│   │   ├── users.ts
│   │   ├── posts.ts
│   │   └── index.ts
│   └── migrations/       # 生成されたマイグレーションファイル
├── .env
└── drizzle.config.ts     # drizzle-kit設定
```

### 環境変数の設定

```bash
# .env
DATABASE_URL="postgresql://username:password@localhost:5432/mydb"
```

### drizzle.config.ts — drizzle-kit設定ファイル

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // テーブル名のプレフィックス（オプション）
  // tablesFilter: ['myapp_*'],
  verbose: true,
  strict: true,
});
```

### DB接続の初期化

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 接続プールの作成
const client = postgres(process.env.DATABASE_URL!, {
  max: 10,           // 最大接続数
  idle_timeout: 20,  // アイドルタイムアウト（秒）
  connect_timeout: 10,
});

// drizzleインスタンスの作成（スキーマを渡してRelational Queriesを有効化）
export const db = drizzle(client, { schema });

// 型エクスポート
export type DB = typeof db;
```

Vercel Postgresを使う場合：

```typescript
// src/db/index.ts（Vercel Postgres版）
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

export const db = drizzle(sql, { schema });
```

---

## 3. スキーマ定義 — pgTable・types・constraints・indexes

### 基本テーブル定義

```typescript
// src/db/schema.ts
import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  decimal,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ユーザーテーブル
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  displayName: text('display_name'),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user', 'moderator'] }).default('user').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ブログ投稿テーブル
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  authorId: uuid('author_id').notNull().references(() => users.id, {
    onDelete: 'cascade',
    onUpdate: 'cascade',
  }),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  status: text('status', { enum: ['draft', 'published', 'archived'] })
    .default('draft')
    .notNull(),
  publishedAt: timestamp('published_at'),
  viewCount: integer('view_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // インデックス定義（テーブル定義の第2引数コールバック）
  authorIdx: index('posts_author_idx').on(table.authorId),
  statusIdx: index('posts_status_idx').on(table.status),
  publishedAtIdx: index('posts_published_at_idx').on(table.publishedAt),
  slugUniqueIdx: uniqueIndex('posts_slug_unique_idx').on(table.slug),
}));

// タグテーブル
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  color: varchar('color', { length: 7 }).default('#000000'),
});

// 投稿-タグ中間テーブル（多対多）
export const postTags = pgTable('post_tags', {
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.tagId] }),
}));

// コメントテーブル（自己参照あり）
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id),
  parentId: integer('parent_id'), // 自己参照（後で.references追加）
  content: text('content').notNull(),
  isApproved: boolean('is_approved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### TypeScriptの型を活用した高度なスキーマ

```typescript
// カスタム型の定義
import { customType } from 'drizzle-orm/pg-core';

// PostgreSQLのcitext型（大文字小文字を無視する文字列）
const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

// 価格管理テーブル（numeric型の精密な扱い）
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: citext('sku').notNull().unique(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  specs: jsonb('specs').$type<{
    weight?: number;
    dimensions?: { width: number; height: number; depth: number };
    color?: string[];
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Drizzleが自動生成するTypeScript型の活用
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Post = InferSelectModel<typeof posts>;
export type NewPost = InferInsertModel<typeof posts>;

// PartialInsert型（一部フィールドのみ）
export type UpdatePost = Partial<Pick<NewPost, 'title' | 'content' | 'status' | 'publishedAt'>>;
```

---

## 4. マイグレーション — drizzle-kit generate・push・migrate

### マイグレーションの3つの方法

Drizzle ORMには3つのマイグレーション戦略がある：

```
1. drizzle-kit generate → drizzle-kit migrate
   本番向け：SQLファイルを生成してからマイグレーション実行

2. drizzle-kit push
   開発向け：スキーマを直接DBに同期（マイグレーションファイルなし）

3. プログラマティックマイグレーション
   アプリ起動時に自動マイグレーション実行
```

### マイグレーションファイルの生成

```bash
# スキーマの変更を検出してSQLファイルを生成
npx drizzle-kit generate

# 生成例（src/db/migrations/0000_initial.sql）:
# CREATE TABLE "users" (
#   "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
#   "email" varchar(255) NOT NULL,
#   ...
# );
```

### マイグレーションの実行

```bash
# 生成されたSQLをDBに適用
npx drizzle-kit migrate
```

プログラマティックに実行する場合：

```typescript
// scripts/migrate.ts
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';

async function runMigrations() {
  const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(migrationClient);

  console.log('Running migrations...');
  
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), 'src/db/migrations'),
  });

  console.log('Migrations completed successfully!');
  await migrationClient.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

### 開発環境でのpush（高速プロトタイピング）

```bash
# スキーマをDBに直接プッシュ（マイグレーションファイルなし）
# 開発初期・プロトタイプに最適
npx drizzle-kit push
```

### package.jsonのスクリプト設定

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/scripts/migrate.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:drop": "drizzle-kit drop"
  }
}
```

### マイグレーション管理のベストプラクティス

```typescript
// Next.js App Router でのマイグレーション（instrumentation.ts）
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = await import('postgres');
    
    const migrationClient = postgres.default(process.env.DATABASE_URL!, { max: 1 });
    const db = drizzle(migrationClient);
    
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    await migrationClient.end();
  }
}
```

---

## 5. 基本CRUD — insert・select・update・delete

### INSERT（データ挿入）

```typescript
import { db } from '@/db';
import { users, posts } from '@/db/schema';
import type { NewUser, NewPost } from '@/db/schema';

// 単一レコード挿入
async function createUser(data: NewUser) {
  const [newUser] = await db.insert(users).values(data).returning();
  return newUser;
}

// 使用例
const user = await createUser({
  email: 'alice@example.com',
  username: 'alice',
  displayName: 'Alice Johnson',
  passwordHash: await hashPassword('securepassword'),
  role: 'user',
});
console.log(user.id); // uuid が返る

// 複数レコード一括挿入
async function bulkInsertPosts(postsData: NewPost[]) {
  const inserted = await db.insert(posts).values(postsData).returning({
    id: posts.id,
    slug: posts.slug,
  });
  return inserted;
}

// UPSERT（競合時に更新）
async function upsertUser(data: NewUser) {
  const [result] = await db
    .insert(users)
    .values(data)
    .onConflictDoUpdate({
      target: users.email,
      set: {
        displayName: data.displayName,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

// 競合時に無視する場合
await db.insert(tags).values({ name: 'TypeScript', slug: 'typescript' })
  .onConflictDoNothing();
```

### SELECT（データ取得）

```typescript
import { eq, and, or, ne, isNull, isNotNull } from 'drizzle-orm';

// 全件取得
const allUsers = await db.select().from(users);

// 特定フィールドのみ取得（射影）
const userSummaries = await db.select({
  id: users.id,
  email: users.email,
  displayName: users.displayName,
}).from(users);

// 条件付き取得
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.isActive, true));

// 単一レコード取得
async function getUserById(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return user ?? null;
}

// 複合条件
const publishedRecentPosts = await db
  .select()
  .from(posts)
  .where(
    and(
      eq(posts.status, 'published'),
      isNotNull(posts.publishedAt),
    )
  );
```

### UPDATE（データ更新）

```typescript
import { eq, lt, sql } from 'drizzle-orm';

// 単一フィールド更新
async function activateUser(userId: string) {
  const [updated] = await db
    .update(users)
    .set({
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

// 閲覧数のインクリメント（アトミック）
async function incrementViewCount(postId: number) {
  await db
    .update(posts)
    .set({
      viewCount: sql`${posts.viewCount} + 1`,
    })
    .where(eq(posts.id, postId));
}

// 条件付き一括更新
async function archiveOldDrafts(cutoffDate: Date) {
  const result = await db
    .update(posts)
    .set({ status: 'archived' })
    .where(
      and(
        eq(posts.status, 'draft'),
        lt(posts.createdAt, cutoffDate),
      )
    )
    .returning({ id: posts.id });
  
  return result.length; // 更新件数
}
```

### DELETE（データ削除）

```typescript
// 単一レコード削除
async function deleteUser(userId: string) {
  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning();
  return deleted;
}

// 条件付き一括削除
async function deleteArchivedPosts(olderThan: Date) {
  const deleted = await db
    .delete(posts)
    .where(
      and(
        eq(posts.status, 'archived'),
        lt(posts.createdAt, olderThan),
      )
    )
    .returning({ id: posts.id, title: posts.title });
  
  console.log(`Deleted ${deleted.length} posts`);
  return deleted;
}

// 全件削除（注意して使用）
await db.delete(postTags); // 中間テーブルの全件削除
```

---

## 6. クエリビルダー — where・orderBy・limit・offset

### 条件演算子の詳細

```typescript
import {
  eq, ne, gt, gte, lt, lte,
  like, ilike, notLike,
  inArray, notInArray,
  between, notBetween,
  isNull, isNotNull,
  and, or, not,
} from 'drizzle-orm';

// 各演算子の使用例
const examples = {
  // 等値・不等値
  equalTo: eq(users.role, 'admin'),
  notEqualTo: ne(users.role, 'admin'),

  // 数値比較
  greaterThan: gt(posts.viewCount, 1000),
  greaterOrEqual: gte(posts.viewCount, 1000),
  lessThan: lt(posts.viewCount, 100),
  lessOrEqual: lte(posts.viewCount, 100),

  // 文字列パターン（大文字小文字を区別）
  likePattern: like(posts.title, '%TypeScript%'),
  notLikePattern: notLike(posts.title, '%draft%'),

  // 大文字小文字を無視したLIKE（PostgreSQL拡張）
  ilikePattern: ilike(posts.title, '%typescript%'),

  // IN句
  inList: inArray(users.role, ['admin', 'moderator']),
  notInList: notInArray(posts.status, ['archived']),

  // BETWEEN
  betweenRange: between(posts.viewCount, 100, 10000),

  // NULL チェック
  nullCheck: isNull(users.emailVerifiedAt),
  notNullCheck: isNotNull(users.emailVerifiedAt),
};

// 複合条件の組み合わせ
const complexQuery = await db
  .select()
  .from(posts)
  .where(
    and(
      eq(posts.status, 'published'),
      or(
        gte(posts.viewCount, 1000),
        ilike(posts.title, '%featured%'),
      ),
      not(isNull(posts.publishedAt)),
    )
  );
```

### ソート・ページネーション

```typescript
import { asc, desc } from 'drizzle-orm';

// ソート
const sortedPosts = await db
  .select()
  .from(posts)
  .orderBy(desc(posts.publishedAt), asc(posts.title));

// ページネーション
async function getPaginatedPosts(page: number, pageSize: number = 10) {
  const offset = (page - 1) * pageSize;
  
  const items = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      publishedAt: posts.publishedAt,
      viewCount: posts.viewCount,
    })
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.publishedAt))
    .limit(pageSize)
    .offset(offset);
  
  return items;
}

// カーソルベースのページネーション（パフォーマンス優先）
async function getPostsAfterCursor(cursor: number, limit: number = 10) {
  return db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.status, 'published'),
        gt(posts.id, cursor),
      )
    )
    .orderBy(asc(posts.id))
    .limit(limit);
}
```

### 動的クエリビルダー

```typescript
// フィルタ条件を動的に組み立てる
interface PostFilters {
  status?: 'draft' | 'published' | 'archived';
  authorId?: string;
  search?: string;
  minViews?: number;
}

async function searchPosts(filters: PostFilters, page = 1, limit = 20) {
  const conditions = [];

  if (filters.status) {
    conditions.push(eq(posts.status, filters.status));
  }
  if (filters.authorId) {
    conditions.push(eq(posts.authorId, filters.authorId));
  }
  if (filters.search) {
    conditions.push(
      or(
        ilike(posts.title, `%${filters.search}%`),
        ilike(posts.content, `%${filters.search}%`),
      )!
    );
  }
  if (filters.minViews !== undefined) {
    conditions.push(gte(posts.viewCount, filters.minViews));
  }

  const query = db.select().from(posts);
  
  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  return query
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}
```

---

## 7. リレーション — one・many・with・Relational Queries

### リレーション定義

Drizzle v0.28以降、**Relational Queries API**が追加され、より直感的なリレーション定義が可能になった。

```typescript
// src/db/schema.ts（リレーション追加）
import { relations } from 'drizzle-orm';

// ユーザーのリレーション定義
export const usersRelations = relations(users, ({ one, many }) => ({
  posts: many(posts),
  comments: many(comments),
}));

// 投稿のリレーション定義
export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  postTags: many(postTags),
}));

// コメントのリレーション定義
export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  // 自己参照（子コメント）
  replies: many(comments, { relationName: 'comment_replies' }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'comment_replies',
  }),
}));

// 中間テーブルのリレーション
export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));
```

### Relational Queriesの使用

```typescript
// src/db/index.ts でスキーマを渡す（必須）
export const db = drizzle(client, { schema });

// 投稿と著者を一緒に取得
const postsWithAuthor = await db.query.posts.findMany({
  with: {
    author: {
      columns: {
        id: true,
        displayName: true,
        email: true,
      },
    },
  },
  where: (posts, { eq }) => eq(posts.status, 'published'),
  orderBy: (posts, { desc }) => desc(posts.publishedAt),
  limit: 10,
});

// 型は自動推論される
type PostWithAuthor = typeof postsWithAuthor[0];
// { id: number, title: string, ..., author: { id: string, displayName: string, email: string } }

// ネストした複数リレーション
const postWithCommentsAndTags = await db.query.posts.findFirst({
  where: (posts, { eq }) => eq(posts.slug, 'my-first-post'),
  with: {
    author: true,
    comments: {
      where: (comments, { eq }) => eq(comments.isApproved, true),
      with: {
        author: {
          columns: { id: true, displayName: true },
        },
        replies: {
          with: {
            author: { columns: { id: true, displayName: true } },
          },
        },
      },
      orderBy: (comments, { asc }) => asc(comments.createdAt),
    },
    postTags: {
      with: {
        tag: true,
      },
    },
  },
});
```

---

## 8. JOIN — innerJoin・leftJoin

### SQLライクなJOINの実装

```typescript
import { eq, and } from 'drizzle-orm';

// INNER JOIN（両テーブルに一致するもののみ）
const postsWithAuthors = await db
  .select({
    postId: posts.id,
    postTitle: posts.title,
    authorName: users.displayName,
    authorEmail: users.email,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.status, 'published'));

// LEFT JOIN（投稿はすべて取得、著者情報がなければNULL）
const allPostsWithOptionalAuthor = await db
  .select()
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id));

// 複数テーブルのJOIN
const fullPostData = await db
  .select({
    post: posts,
    author: {
      id: users.id,
      name: users.displayName,
    },
    commentCount: sql<number>`count(distinct ${comments.id})::int`,
  })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
  .leftJoin(comments, and(
    eq(comments.postId, posts.id),
    eq(comments.isApproved, true),
  ))
  .groupBy(posts.id, users.id)
  .where(eq(posts.status, 'published'))
  .orderBy(desc(posts.publishedAt));
```

### 自己JOINの実装

```typescript
import { alias } from 'drizzle-orm/pg-core';

// コメントとその親コメントを一緒に取得
const parentComments = alias(comments, 'parent_comments');

const commentsWithParent = await db
  .select({
    comment: comments,
    parentContent: parentComments.content,
  })
  .from(comments)
  .leftJoin(parentComments, eq(comments.parentId, parentComments.id))
  .where(eq(comments.postId, 1));
```

---

## 9. トランザクション — db.transaction

### 基本的なトランザクション

```typescript
// 単純なトランザクション
async function transferCredits(fromUserId: string, toUserId: string, amount: number) {
  return await db.transaction(async (tx) => {
    // 残高確認
    const [sender] = await tx
      .select({ credits: users.metadata })
      .from(users)
      .where(eq(users.id, fromUserId))
      .for('update'); // FOR UPDATE ロック

    const senderCredits = (sender.credits as any)?.credits ?? 0;
    if (senderCredits < amount) {
      throw new Error('Insufficient credits');
    }

    // 送信者から減算
    await tx
      .update(users)
      .set({
        metadata: sql`jsonb_set(metadata, '{credits}', (COALESCE(metadata->>'credits', '0')::int - ${amount})::text::jsonb)`,
      })
      .where(eq(users.id, fromUserId));

    // 受信者に加算
    await tx
      .update(users)
      .set({
        metadata: sql`jsonb_set(metadata, '{credits}', (COALESCE(metadata->>'credits', '0')::int + ${amount})::text::jsonb)`,
      })
      .where(eq(users.id, toUserId));

    return { success: true, amount };
  });
}
```

### ネストしたトランザクション（セーブポイント）

```typescript
// 投稿とタグの同時作成（アトミック）
async function createPostWithTags(
  postData: NewPost,
  tagNames: string[],
) {
  return await db.transaction(async (tx) => {
    // 投稿を作成
    const [newPost] = await tx
      .insert(posts)
      .values(postData)
      .returning();

    // タグを upsert
    const tagResults = await Promise.all(
      tagNames.map(async (name) => {
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        const [tag] = await tx
          .insert(tags)
          .values({ name, slug })
          .onConflictDoUpdate({
            target: tags.slug,
            set: { name },
          })
          .returning();
        return tag;
      })
    );

    // 中間テーブルに関連付け
    if (tagResults.length > 0) {
      await tx.insert(postTags).values(
        tagResults.map((tag) => ({
          postId: newPost.id,
          tagId: tag.id,
        }))
      );
    }

    return { post: newPost, tags: tagResults };
  });
}
```

### エラーハンドリングとロールバック

```typescript
// トランザクション内でエラーが発生するとロールバックされる
async function safeTransaction() {
  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({...}).returning();
      
      // 何らかのバリデーション
      if (!user.email.endsWith('@company.com')) {
        // Error をスローするとトランザクションが自動ロールバック
        throw new Error('Invalid email domain');
      }
      
      return user;
    });
    
    return { success: true, data: result };
  } catch (error) {
    // トランザクションは自動的にロールバック済み
    return { success: false, error: (error as Error).message };
  }
}
```

---

## 10. 集計 — count・sum・avg・groupBy

### 集計関数の使用

```typescript
import { count, sum, avg, max, min, sql } from 'drizzle-orm';

// 総件数
const [{ total }] = await db
  .select({ total: count() })
  .from(posts);

console.log(`Total posts: ${total}`);

// 条件付き件数
const [{ publishedCount }] = await db
  .select({ publishedCount: count(posts.id) })
  .from(posts)
  .where(eq(posts.status, 'published'));

// SUM・AVG・MAX・MIN
const [stats] = await db
  .select({
    totalViews: sum(posts.viewCount),
    avgViews: avg(posts.viewCount),
    maxViews: max(posts.viewCount),
    minViews: min(posts.viewCount),
  })
  .from(posts)
  .where(eq(posts.status, 'published'));

// 型注意: sum/avgはstring型で返る（精度保持のため）
const totalViews = parseInt(stats.totalViews ?? '0');
const avgViews = parseFloat(stats.avgViews ?? '0');
```

### GROUP BYと集計

```typescript
// 著者別の投稿数と合計閲覧数
const authorStats = await db
  .select({
    authorId: posts.authorId,
    authorName: users.displayName,
    postCount: count(posts.id),
    totalViews: sum(posts.viewCount),
    avgViews: avg(posts.viewCount),
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.status, 'published'))
  .groupBy(posts.authorId, users.displayName)
  .having(({ postCount }) => gt(postCount, 5)) // HAVING句
  .orderBy(({ totalViews }) => desc(totalViews));

// 月別投稿統計
const monthlyStats = await db
  .select({
    year: sql<number>`EXTRACT(YEAR FROM ${posts.publishedAt})::int`,
    month: sql<number>`EXTRACT(MONTH FROM ${posts.publishedAt})::int`,
    postCount: count(),
    totalViews: sum(posts.viewCount),
  })
  .from(posts)
  .where(eq(posts.status, 'published'))
  .groupBy(
    sql`EXTRACT(YEAR FROM ${posts.publishedAt})`,
    sql`EXTRACT(MONTH FROM ${posts.publishedAt})`,
  )
  .orderBy(
    desc(sql`EXTRACT(YEAR FROM ${posts.publishedAt})`),
    desc(sql`EXTRACT(MONTH FROM ${posts.publishedAt})`),
  );
```

---

## 11. Raw SQL — sql template tag

### sqlテンプレートタグの活用

Drizzle ORMの`sql`テンプレートタグは、型安全なRaw SQLを書くための重要なツールだ。

```typescript
import { sql, SQL } from 'drizzle-orm';

// 基本的な使用方法（プレースホルダーは自動的にパラメータ化される）
const userId = 'some-uuid';
const result = await db.execute(
  sql`SELECT * FROM users WHERE id = ${userId} AND is_active = true`
);

// sqlタグを使ったカスタム関数
async function getPostsWithFullTextSearch(query: string) {
  return db.select({
    id: posts.id,
    title: posts.title,
    rank: sql<number>`ts_rank(to_tsvector('japanese', ${posts.content}), plainto_tsquery('japanese', ${query}))`,
  })
  .from(posts)
  .where(
    sql`to_tsvector('japanese', ${posts.content}) @@ plainto_tsquery('japanese', ${query})`
  )
  .orderBy(sql`ts_rank(to_tsvector('japanese', ${posts.content}), plainto_tsquery('japanese', ${query})) DESC`);
}

// windowフレーム関数
const postsWithRank = await db
  .select({
    id: posts.id,
    title: posts.title,
    viewCount: posts.viewCount,
    rankInCategory: sql<number>`ROW_NUMBER() OVER (ORDER BY ${posts.viewCount} DESC)::int`,
    percentile: sql<number>`PERCENT_RANK() OVER (ORDER BY ${posts.viewCount})`,
  })
  .from(posts)
  .where(eq(posts.status, 'published'));

// CTEの活用
const result = await db.execute(sql`
  WITH ranked_posts AS (
    SELECT
      id,
      title,
      view_count,
      ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY view_count DESC) as rn
    FROM posts
    WHERE status = 'published'
  )
  SELECT * FROM ranked_posts WHERE rn = 1
`);

// 再利用可能なSQLフラグメント
function isPublished(): SQL {
  return sql`${posts.status} = 'published' AND ${posts.publishedAt} IS NOT NULL`;
}

const publishedPosts = await db
  .select()
  .from(posts)
  .where(isPublished());
```

---

## 12. Next.js + Drizzle + Vercel Postgres 統合

### プロジェクト構成

```
src/
├── app/
│   ├── api/
│   │   ├── posts/
│   │   │   ├── route.ts      # GET /api/posts, POST /api/posts
│   │   │   └── [id]/
│   │   │       └── route.ts  # GET/PUT/DELETE /api/posts/:id
│   │   └── users/
│   │       └── route.ts
│   └── page.tsx
├── db/
│   ├── index.ts
│   └── schema.ts
└── lib/
    └── repositories/
        ├── post.repository.ts
        └── user.repository.ts
```

### Vercel Postgres との接続

```typescript
// src/db/index.ts（Vercel Postgres版）
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

export const db = drizzle(sql, { schema });
export { schema };
```

### Repository パターンの実装

```typescript
// src/lib/repositories/post.repository.ts
import { db } from '@/db';
import { posts, users, postTags, tags } from '@/db/schema';
import { eq, and, desc, count, sql, ilike } from 'drizzle-orm';
import type { NewPost, UpdatePost } from '@/db/schema';

export class PostRepository {
  // 公開済み投稿一覧（ページネーション付き）
  async findPublished(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const [items, [{ total }]] = await Promise.all([
      db.query.posts.findMany({
        where: (posts, { eq }) => eq(posts.status, 'published'),
        with: {
          author: { columns: { id: true, displayName: true } },
          postTags: { with: { tag: true } },
        },
        orderBy: (posts, { desc }) => desc(posts.publishedAt),
        limit,
        offset,
      }),
      db.select({ total: count() })
        .from(posts)
        .where(eq(posts.status, 'published')),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // スラッグで単一取得
  async findBySlug(slug: string) {
    return db.query.posts.findFirst({
      where: (posts, { eq }) => eq(posts.slug, slug),
      with: {
        author: true,
        comments: {
          where: (comments, { eq }) => eq(comments.isApproved, true),
          with: { author: { columns: { id: true, displayName: true } } },
          orderBy: (comments, { asc }) => asc(comments.createdAt),
        },
        postTags: { with: { tag: true } },
      },
    });
  }

  // 作成
  async create(data: NewPost, tagIds?: number[]) {
    return db.transaction(async (tx) => {
      const [post] = await tx.insert(posts).values(data).returning();
      
      if (tagIds?.length) {
        await tx.insert(postTags).values(
          tagIds.map((tagId) => ({ postId: post.id, tagId }))
        );
      }
      
      return post;
    });
  }

  // 更新
  async update(id: number, data: UpdatePost) {
    const [updated] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return updated;
  }

  // 削除
  async delete(id: number) {
    const [deleted] = await db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning();
    return deleted;
  }
}

export const postRepository = new PostRepository();
```

### Next.js API Route との統合

```typescript
// src/app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { postRepository } from '@/lib/repositories/post.repository';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  content: z.string().min(1),
  status: z.enum(['draft', 'published']).default('draft'),
  tagIds: z.array(z.number()).optional(),
});

// GET /api/posts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '10');

  try {
    const result = await postRepository.findPublished(page, limit);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST /api/posts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createPostSchema.parse(body);
    
    // 認証チェック（実際のプロジェクトではセッション確認）
    const authorId = request.headers.get('x-user-id');
    if (!authorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tagIds, ...postData } = data;
    const post = await postRepository.create(
      { ...postData, authorId, excerpt: postData.content.slice(0, 200) },
      tagIds
    );

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
```

### Server Actions との統合

```typescript
// src/app/actions/post.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth'; // 認証ライブラリ

export async function publishPost(postId: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  await db
    .update(posts)
    .set({
      status: 'published',
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId));

  revalidatePath('/blog');
  revalidatePath(`/blog/${postId}`);
}

export async function createDraft(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const slug = title.toLowerCase().replace(/\s+/g, '-');

  const [post] = await db
    .insert(posts)
    .values({
      title,
      content,
      slug,
      authorId: session.user.id,
      status: 'draft',
    })
    .returning();

  redirect(`/dashboard/posts/${post.id}`);
}
```

### 接続プーリングの最適化（Serverless環境）

```typescript
// src/db/index.ts（Serverless最適化版）
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Serverless/Edge環境では接続数を最小化
const connectionString = process.env.DATABASE_URL!;

// グローバルシングルトン（Next.js開発モードのホットリロード対策）
const globalForDb = globalThis as unknown as { client: postgres.Sql };

const client = globalForDb.client ?? postgres(connectionString, {
  max: process.env.NODE_ENV === 'production' ? 10 : 1,
  prepare: false, // Serverless環境ではfalse推奨
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
```

---

## 13. Drizzle Studio — GUI管理ツール

### Drizzle Studioとは

Drizzle Studioは、ブラウザベースのデータベース管理GUIツールだ。Prisma Studioに相当するが、Drizzle ORMに特化して設計されている。

```bash
# Drizzle Studio の起動
npx drizzle-kit studio

# ポートを指定する場合
npx drizzle-kit studio --port 4983

# 起動後: https://local.drizzle.studio でアクセス
```

### Drizzle Studioの主な機能

```
機能一覧:
- テーブルの閲覧・フィルタリング・ソート
- レコードの追加・編集・削除
- SQLクエリエディタ（直接SQL実行）
- リレーションのビジュアル表示
- マイグレーション履歴の確認
- JSONBフィールドのビジュアル編集
```

### Drizzle Studioのカスタム設定

```typescript
// drizzle.config.ts（Studio用設定追加）
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Studio設定
  studio: {
    port: 4983,
    host: 'localhost',
  },
});
```

---

## まとめ — Drizzle ORMを使いこなすために

Drizzle ORMは「SQLを知っている開発者が、型安全なTypeScriptコードを書くための最良の手段」だ。主要なポイントを整理する。

### Drizzle ORM 全体マップ

```
1. スキーマ定義（schema.ts）
   └── pgTable / mysqlTable / sqliteTable
       ├── カラム型（varchar, text, integer, uuid, jsonb...）
       ├── 制約（notNull, unique, default, primaryKey, references）
       ├── インデックス（index, uniqueIndex）
       └── relations（one, many）

2. マイグレーション（drizzle-kit）
   ├── generate → SQLファイル生成
   ├── migrate  → DB適用
   └── push     → 開発環境直接同期

3. クエリ（drizzle-orm）
   ├── CRUD（insert/select/update/delete）
   ├── クエリビルダー（where/orderBy/limit/offset）
   ├── Relational Queries（db.query.posts.findMany with: {...}）
   ├── JOIN（innerJoin/leftJoin）
   ├── 集計（count/sum/avg + groupBy/having）
   ├── トランザクション（db.transaction）
   └── Raw SQL（sql template tag）

4. ツール
   └── Drizzle Studio（GUIブラウザ管理ツール）
```

### 開発フローのベストプラクティス

**1. スキーマ変更は常にTypeScriptコードから**

```typescript
// スキーマを変更したら必ずマイグレーションを生成
// npx drizzle-kit generate
```

**2. 型を最大限に活用する**

```typescript
// InferSelectModel / InferInsertModel で型を自動生成
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
```

**3. 複雑なクエリはリポジトリに集約**

```typescript
// ビジネスロジックからDB詳細を分離
class PostRepository {
  async findPublished(page: number, limit: number) { ... }
  async findBySlug(slug: string) { ... }
}
```

**4. Edge環境では接続プールを最適化**

```typescript
// Serverless: max: 1, prepare: false
// 長時間稼働サーバー: max: 10+
```

---

## 補足 — JSON操作のデバッグに DevToolBox

Drizzle ORMでJSONBフィールドを扱う際、特にAPIレスポンスのデバッグやスキーマ設計時にJSONの構造確認が必要になることがある。

そんな時は **[DevToolBox](https://usedevtools.com/)** が役に立つ。JSON Validator・Formatter・Diff機能を備えており、Drizzle ORMのJSONBフィールドに格納するデータ構造の検証や、APIレスポンスのフォーマット確認をブラウザ上で即座に行える。Next.js + Drizzle の開発中にサイドバーで開いておくと、開発効率が大幅に向上する。

---

Drizzle ORMは「SQLを愛する開発者のORM」だ。抽象化の層を最小限に保ちながら、TypeScriptの型安全性を完全に享受できる。PrismaからDrizzleへの移行を検討しているチームも、まず小規模なサービスやNext.js App Routerプロジェクトで試してみることを勧める。一度その軽量さと型安全性を体感すると、元には戻れなくなるはずだ。
