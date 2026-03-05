---
title: "Drizzle ORM高度な使い方ガイド - リレーション、トランザクション、パフォーマンス最適化"
description: "Drizzle ORMの高度な機能を解説。複雑なリレーション、トランザクション管理、パフォーマンス最適化、マイグレーション戦略まで実践的に紹介します。"
pubDate: "2025-02-05"
tags: ['プログラミング']
---

# Drizzle ORM高度な使い方ガイド

Drizzle ORMは、TypeScriptのための型安全なORMライブラリです。この記事では、基本的な使い方を超えて、複雑なリレーション、トランザクション管理、パフォーマンス最適化など、実践的な高度なテクニックを詳しく解説します。

## 複雑なリレーションの設計

### One-to-Many（一対多）

```typescript
// schema.ts
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// リレーション定義
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

### Many-to-Many（多対多）

```typescript
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
});

// 中間テーブル
export const postCategories = pgTable('post_categories', {
  postId: integer('post_id').notNull().references(() => posts.id),
  categoryId: integer('category_id').notNull().references(() => categories.id),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  postCategories: many(postCategories),
}));

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(posts, {
    fields: [postCategories.postId],
    references: [posts.id],
  }),
  category: one(categories, {
    fields: [postCategories.categoryId],
    references: [categories.id],
  }),
}));

export const postsWithCategoriesRelations = relations(posts, ({ many }) => ({
  postCategories: many(postCategories),
}));
```

### Self-Referencing（自己参照）

```typescript
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  postId: integer('post_id').notNull().references(() => posts.id),
  parentId: integer('parent_id'),
  authorId: integer('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments),
}));
```

## 高度なクエリテクニック

### ネストしたリレーションのクエリ

```typescript
import { db } from './db';
import { users, posts, comments } from './schema';

// ユーザーと投稿、コメントを一度に取得
const usersWithPostsAndComments = await db.query.users.findMany({
  with: {
    posts: {
      with: {
        postCategories: {
          with: {
            category: true,
          },
        },
      },
    },
  },
});

// 特定の投稿とすべてのネストしたコメント
const postWithNestedComments = await db.query.posts.findFirst({
  where: (posts, { eq }) => eq(posts.id, 1),
  with: {
    author: true,
    postCategories: {
      with: {
        category: true,
      },
    },
  },
});
```

### 集計とグループ化

```typescript
import { count, avg, sum, min, max } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// 投稿数をカウント
const postCounts = await db
  .select({
    authorId: posts.authorId,
    postCount: count(posts.id),
  })
  .from(posts)
  .groupBy(posts.authorId);

// 複雑な集計
const userStats = await db
  .select({
    userId: users.id,
    userName: users.name,
    totalPosts: count(posts.id),
    totalComments: count(comments.id),
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId))
  .leftJoin(comments, eq(users.id, comments.authorId))
  .groupBy(users.id, users.name);

// SQLテンプレート使用
const avgPostLength = await db
  .select({
    avgLength: sql<number>`AVG(LENGTH(${posts.content}))`,
  })
  .from(posts);
```

### サブクエリ

```typescript
import { eq, inArray } from 'drizzle-orm';

// サブクエリで活発なユーザーを取得
const activeUsers = db
  .select({ id: users.id })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId))
  .groupBy(users.id)
  .having(sql`COUNT(${posts.id}) > 10`);

// メインクエリでサブクエリを使用
const popularPosts = await db
  .select()
  .from(posts)
  .where(inArray(posts.authorId, activeUsers));

// EXISTS句の使用
const usersWithPosts = await db
  .select()
  .from(users)
  .where(
    sql`EXISTS (
      SELECT 1 FROM ${posts}
      WHERE ${posts.authorId} = ${users.id}
    )`
  );
```

### ウィンドウ関数

```typescript
// ランキング
const rankedPosts = await db
  .select({
    id: posts.id,
    title: posts.title,
    rank: sql<number>`ROW_NUMBER() OVER (
      PARTITION BY ${posts.authorId}
      ORDER BY ${posts.createdAt} DESC
    )`,
  })
  .from(posts);

// 累積カウント
const cumulativePosts = await db
  .select({
    date: sql<Date>`DATE(${posts.createdAt})`,
    dailyCount: count(posts.id),
    cumulativeCount: sql<number>`SUM(COUNT(*)) OVER (
      ORDER BY DATE(${posts.createdAt})
    )`,
  })
  .from(posts)
  .groupBy(sql`DATE(${posts.createdAt})`);
```

## トランザクション管理

### 基本的なトランザクション

```typescript
import { db } from './db';

// トランザクション実行
await db.transaction(async (tx) => {
  // ユーザー作成
  const [user] = await tx
    .insert(users)
    .values({
      name: 'John Doe',
      email: 'john@example.com',
    })
    .returning();

  // 投稿作成
  await tx.insert(posts).values({
    title: 'First Post',
    content: 'Hello, World!',
    authorId: user.id,
  });
});
```

### ネストしたトランザクション

```typescript
async function createUserWithProfile(
  userData: any,
  profileData: any
) {
  return await db.transaction(async (tx) => {
    // ユーザー作成
    const [user] = await tx
      .insert(users)
      .values(userData)
      .returning();

    // プロフィール作成（別のトランザクション）
    await tx.transaction(async (innerTx) => {
      await innerTx
        .insert(profiles)
        .values({
          ...profileData,
          userId: user.id,
        });
    });

    return user;
  });
}
```

### エラーハンドリング

```typescript
import { DatabaseError } from 'pg';

async function safeCreatePost(postData: any) {
  try {
    return await db.transaction(async (tx) => {
      const [post] = await tx
        .insert(posts)
        .values(postData)
        .returning();

      // 何か問題があれば例外を投げる
      if (!post.title) {
        throw new Error('Title is required');
      }

      return post;
    });
  } catch (error) {
    if (error instanceof DatabaseError) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error('Duplicate entry');
      }
    }
    throw error;
  }
}
```

### トランザクション分離レベル

```typescript
import { sql } from 'drizzle-orm';

// READ COMMITTED（デフォルト）
await db.transaction(async (tx) => {
  await tx.execute(
    sql`SET TRANSACTION ISOLATION LEVEL READ COMMITTED`
  );
  // トランザクション処理
});

// SERIALIZABLE（最も厳密）
await db.transaction(async (tx) => {
  await tx.execute(
    sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`
  );

  const [user] = await tx
    .select()
    .from(users)
    .where(eq(users.id, 1))
    .for('update'); // 行ロック

  await tx
    .update(users)
    .set({ balance: user.balance - 100 })
    .where(eq(users.id, 1));
});
```

## パフォーマンス最適化

### インデックスの作成

```typescript
import { index, uniqueIndex } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id').notNull(),
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  authorIdx: index('author_idx').on(table.authorId),
  publishedIdx: index('published_idx').on(table.published),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
  // 複合インデックス
  authorPublishedIdx: index('author_published_idx')
    .on(table.authorId, table.published),
  // ユニークインデックス
  slugIdx: uniqueIndex('slug_idx').on(table.slug),
}));
```

### バッチ処理

```typescript
// バッチインサート
const newUsers = [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  { name: 'User 3', email: 'user3@example.com' },
];

await db.insert(users).values(newUsers);

// バッチ更新
await db
  .update(posts)
  .set({ published: true })
  .where(inArray(posts.id, [1, 2, 3, 4, 5]));

// 大量データのバッチ処理
async function batchInsert<T>(
  data: T[],
  batchSize: number = 1000
) {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.insert(users).values(batch);
  }
}
```

### クエリ最適化

```typescript
// ❌ N+1問題
const usersData = await db.select().from(users);
for (const user of usersData) {
  const userPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.authorId, user.id));
}

// ✅ 1回のクエリで取得
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
});

// ✅ JOINを使用
const usersWithPostCount = await db
  .select({
    userId: users.id,
    userName: users.name,
    postCount: count(posts.id),
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId))
  .groupBy(users.id, users.name);
```

### 接続プーリング

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// 接続プール設定
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);

// アプリケーション終了時にプールをクローズ
process.on('SIGTERM', async () => {
  await pool.end();
});
```

### ページネーション

```typescript
// オフセットベースのページネーション
async function getPosts(page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    db
      .select()
      .from(posts)
      .limit(pageSize)
      .offset(offset)
      .orderBy(desc(posts.createdAt)),
    db
      .select({ count: count() })
      .from(posts)
      .then(([{ count }]) => count),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      total,
    },
  };
}

// カーソルベースのページネーション
async function getPostsCursor(
  cursor?: number,
  limit: number = 20
) {
  const conditions = cursor
    ? lt(posts.id, cursor)
    : undefined;

  const data = await db
    .select()
    .from(posts)
    .where(conditions)
    .limit(limit + 1)
    .orderBy(desc(posts.id));

  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, -1) : data;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    data: items,
    nextCursor,
    hasMore,
  };
}
```

## マイグレーション戦略

### マイグレーションの生成

```bash
# スキーマからマイグレーションを生成
npx drizzle-kit generate:pg

# カスタム名でマイグレーション生成
npx drizzle-kit generate:pg --name add_users_table
```

### マイグレーションの実行

```typescript
// migrate.ts
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './db';

async function runMigrations() {
  console.log('Running migrations...');

  await migrate(db, {
    migrationsFolder: './drizzle',
  });

  console.log('Migrations completed!');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed!', err);
  process.exit(1);
});
```

### ゼロダウンタイムマイグレーション

```sql
-- ステップ1: 新しいカラムを追加（NULL許可）
ALTER TABLE users ADD COLUMN full_name TEXT;

-- ステップ2: データを移行（アプリケーション側で実行）
UPDATE users SET full_name = name WHERE full_name IS NULL;

-- ステップ3: NOT NULL制約を追加
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

-- ステップ4: 古いカラムを削除
ALTER TABLE users DROP COLUMN name;
```

### マイグレーションのロールバック

```typescript
// rollback.ts
import { sql } from 'drizzle-orm';
import { db } from './db';

async function rollback() {
  // 最新のマイグレーションを取得
  const [latest] = await db.execute(
    sql`SELECT version FROM migrations ORDER BY version DESC LIMIT 1`
  );

  if (!latest) {
    console.log('No migrations to rollback');
    return;
  }

  // ロールバック実行
  console.log(`Rolling back migration: ${latest.version}`);

  // マイグレーションテーブルから削除
  await db.execute(
    sql`DELETE FROM migrations WHERE version = ${latest.version}`
  );

  console.log('Rollback completed!');
}

rollback().catch((err) => {
  console.error('Rollback failed!', err);
  process.exit(1);
});
```

## テスト戦略

### テスト用データベースのセットアップ

```typescript
// test/setup.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

export async function setupTestDb() {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL,
  });

  const db = drizzle(pool);

  // マイグレーション実行
  await migrate(db, {
    migrationsFolder: './drizzle',
  });

  return { db, pool };
}

export async function teardownTestDb(pool: Pool) {
  await pool.end();
}
```

### テストの例

```typescript
// test/users.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from './setup';
import { users } from '../schema';

describe('Users', () => {
  let db: any;
  let pool: any;

  beforeAll(async () => {
    ({ db, pool } = await setupTestDb());
  });

  afterAll(async () => {
    await teardownTestDb(pool);
  });

  it('should create a user', async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Test User',
        email: 'test@example.com',
      })
      .returning();

    expect(user).toBeDefined();
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
  });

  it('should find a user by email', async () => {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, 'test@example.com'),
    });

    expect(user).toBeDefined();
    expect(user?.name).toBe('Test User');
  });
});
```

## まとめ

Drizzle ORMは、TypeScriptの型安全性を最大限に活用しながら、柔軟で高性能なデータベース操作を可能にします。

**主な利点：**

- 完全な型安全性
- 高度なリレーション管理
- 強力なクエリビルダー
- トランザクションサポート
- 優れたパフォーマンス

**ベストプラクティス：**

- 適切なインデックスの使用
- バッチ処理の活用
- N+1問題の回避
- トランザクションの適切な使用
- マイグレーション戦略の計画

Drizzle ORMを使いこなすことで、型安全で保守性の高いデータベース層を構築できます。
