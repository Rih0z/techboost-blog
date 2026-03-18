---
title: "Drizzle ORM v1完全ガイド - TypeScript型安全とパフォーマンスを両立する次世代ORM"
description: "Drizzle ORM v1のスキーマ定義、マイグレーション、リレーション処理、クエリビルダーの完全ガイド。PrismaやTypeORMとの比較、実践的なパターン、パフォーマンス最適化まで網羅的に解説します。"
pubDate: "2025-02-05"
tags: ["drizzle", "orm", "typescript", "database", "sql", "postgres", "mysql"]
---

Drizzle ORMは、TypeScriptの型安全性とSQLのパフォーマンスを両立させた次世代のORMです。**v1リリース**により、本番環境での使用に完全対応し、エンタープライズグレードのアプリケーション開発が可能になりました。

この記事では、Drizzle ORM v1の全機能を実践的に解説し、効率的なデータベース設計とクエリ最適化の手法を紹介します。

## Drizzle ORM v1の特徴

### なぜDrizzle ORMなのか

```typescript
// Prismaとの比較: より直接的なSQL制御
// Prisma
const users = await prisma.user.findMany({
  where: { age: { gte: 18 } },
  include: { posts: true }
});

// Drizzle - SQLライクな記述で型安全
import { eq, gte } from 'drizzle-orm';
const users = await db.select()
  .from(usersTable)
  .where(gte(usersTable.age, 18))
  .leftJoin(postsTable, eq(usersTable.id, postsTable.userId));
```

**主な利点:**
- **ゼロオーバーヘッド**: 生SQLと同等のパフォーマンス
- **完全な型推論**: スキーマからクエリ結果まで自動型付け
- **SQL互換性**: 既存のSQLスキーマとの統合が容易
- **軽量**: バンドルサイズがPrismaの1/10以下
- **エッジランタイム対応**: Cloudflare Workers、Vercel Edge対応

## スキーマ定義の完全ガイド

### 基本的なテーブル定義

```typescript
// schema.ts
import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  age: integer('age'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 高度なスキーマパターン

```typescript
import { pgTable, varchar, jsonb, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  price: integer('price').notNull(),
  metadata: jsonb('metadata').$type<{
    tags: string[];
    features: Record<string, any>;
  }>(),
  // 計算カラム
  discountedPrice: integer('discounted_price')
    .generatedAlwaysAs(sql`price * 0.9`),
}, (table) => ({
  // インデックス定義
  slugIdx: uniqueIndex('slug_idx').on(table.slug),
  priceIdx: index('price_idx').on(table.price),
  // CHECK制約
  priceCheck: check('price_check', sql`${table.price} >= 0`),
}));

// Enum型の定義
import { pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'user', 'guest']);

export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  role: roleEnum('role').notNull(),
});
```

### 複合キーとマルチテナント設計

```typescript
import { primaryKey } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
});

export const tenantUsers = pgTable('tenant_users', {
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  role: text('role').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.userId] }),
}));
```

## マイグレーション戦略

### 自動マイグレーション生成

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

```bash
# マイグレーション生成
pnpm drizzle-kit generate:pg

# マイグレーション実行
pnpm drizzle-kit push:pg

# スキーマ検証
pnpm drizzle-kit check:pg
```

### プログラマティックマイグレーション

```typescript
// migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const runMigration = async () => {
  const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(migrationClient);

  await migrate(db, { migrationsFolder: './drizzle/migrations' });

  await migrationClient.end();
  console.log('Migration completed');
};

runMigration();
```

### カスタムマイグレーションスクリプト

```sql
-- drizzle/migrations/0001_add_full_text_search.sql
-- ⬆️ Drizzle生成のマイグレーションに手動でSQLを追加可能

-- 全文検索用のGINインデックス追加
CREATE INDEX posts_content_gin_idx ON posts USING GIN(to_tsvector('english', content));

-- トリガー追加
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## リレーションと JOIN クエリ

### リレーション定義

```typescript
// schema.ts
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  tags: many(postTags),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));
```

### リレーショナルクエリ（Query API）

```typescript
// リレーションを使った簡潔なクエリ
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: {
      with: {
        comments: {
          with: {
            author: true,
          },
        },
      },
    },
  },
});

// 型推論が完璧に効く
usersWithPosts[0].posts[0].comments[0].author.name; // ✅ 型安全

// 条件付きリレーション読み込み
const activeUsers = await db.query.users.findMany({
  where: (users, { eq }) => eq(users.isActive, true),
  with: {
    posts: {
      where: (posts, { isNotNull }) => isNotNull(posts.publishedAt),
      limit: 5,
      orderBy: (posts, { desc }) => desc(posts.publishedAt),
    },
  },
});
```

### 手動JOIN（Core API）

```typescript
import { eq, and, desc } from 'drizzle-orm';

// 複雑なJOINクエリ
const postsWithAuthors = await db
  .select({
    postId: posts.id,
    postTitle: posts.title,
    authorName: users.name,
    authorEmail: users.email,
    commentCount: sql<number>`count(${comments.id})`,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .leftJoin(comments, eq(comments.postId, posts.id))
  .where(and(
    eq(users.isActive, true),
    isNotNull(posts.publishedAt)
  ))
  .groupBy(posts.id, users.id)
  .orderBy(desc(posts.createdAt))
  .limit(10);

// サブクエリ
const avgPostCount = db
  .select({ count: sql<number>`count(*)` })
  .from(posts)
  .where(eq(posts.authorId, users.id))
  .as('avg_post_count');

const prolificAuthors = await db
  .select({
    name: users.name,
    postCount: avgPostCount.count,
  })
  .from(users)
  .leftJoin(avgPostCount, eq(users.id, avgPostCount.authorId))
  .where(gt(avgPostCount.count, 10));
```

## クエリビルダーの完全活用

### CRUD操作

```typescript
// INSERT
const newUser = await db.insert(users)
  .values({
    email: 'user@example.com',
    name: 'John Doe',
    age: 25,
  })
  .returning(); // PostgreSQLのみ

// 複数行INSERT
await db.insert(users)
  .values([
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' },
  ]);

// UPSERT (ON CONFLICT)
await db.insert(users)
  .values({ email: 'user@example.com', name: 'John' })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'John Updated', updatedAt: new Date() },
  });

// UPDATE
await db.update(users)
  .set({ isActive: false })
  .where(eq(users.id, 1));

// 条件付きUPDATE
import { gt } from 'drizzle-orm';
await db.update(users)
  .set({ role: 'premium' })
  .where(gt(users.postCount, 100));

// DELETE
await db.delete(users)
  .where(eq(users.id, 1));
```

### 高度なクエリパターン

```typescript
// トランザクション
await db.transaction(async (tx) => {
  const user = await tx.insert(users)
    .values({ email: 'new@example.com', name: 'New User' })
    .returning();

  await tx.insert(posts)
    .values({
      title: 'First Post',
      authorId: user[0].id,
    });

  // エラー時は自動ロールバック
});

// ページネーション
const page = 2;
const pageSize = 20;

const paginatedPosts = await db.select()
  .from(posts)
  .orderBy(desc(posts.createdAt))
  .limit(pageSize)
  .offset((page - 1) * pageSize);

// カーソルベースページネーション
const lastSeenId = 100;
const nextPage = await db.select()
  .from(posts)
  .where(lt(posts.id, lastSeenId))
  .orderBy(desc(posts.id))
  .limit(20);

// 集計クエリ
const stats = await db.select({
  totalUsers: sql<number>`count(distinct ${users.id})`,
  totalPosts: sql<number>`count(distinct ${posts.id})`,
  avgPostsPerUser: sql<number>`count(${posts.id})::float / count(distinct ${users.id})`,
})
  .from(users)
  .leftJoin(posts, eq(posts.authorId, users.id));
```

### Prepared Statements（パフォーマンス最適化）

```typescript
// プリペアドステートメント作成
const prepared = db.select()
  .from(users)
  .where(eq(users.id, placeholder('id')))
  .prepare('get_user_by_id');

// 高速実行（パース・プラン再利用）
const user1 = await prepared.execute({ id: 1 });
const user2 = await prepared.execute({ id: 2 });

// 複雑なクエリもプリペア可能
const searchPosts = db.select()
  .from(posts)
  .where(
    and(
      like(posts.title, placeholder('query')),
      gte(posts.createdAt, placeholder('startDate'))
    )
  )
  .prepare('search_posts');

await searchPosts.execute({
  query: '%drizzle%',
  startDate: new Date('2025-01-01')
});
```

## データベース別の最適化

### PostgreSQL固有機能

```typescript
import { jsonb, vector } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  content: text('content'),
  // JSONB型
  metadata: jsonb('metadata').$type<{
    tags: string[];
    views: number;
  }>(),
  // ベクトル型（pgvector拡張）
  embedding: vector('embedding', { dimensions: 1536 }),
});

// JSONB操作
import { jsonb } from 'drizzle-orm/pg-core';

const docsWithTag = await db.select()
  .from(documents)
  .where(sql`${documents.metadata}->>'tags' ? 'typescript'`);

// ベクトル類似検索
const similar = await db.select()
  .from(documents)
  .orderBy(sql`${documents.embedding} <-> ${searchVector}`)
  .limit(10);
```

### MySQL固有機能

```typescript
import { mysqlTable, int, varchar } from 'drizzle-orm/mysql-core';

export const products = mysqlTable('products', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }),
  // 全文検索
  description: text('description'),
}, (table) => ({
  fullTextIdx: index('ft_idx').on(table.description).using('FULLTEXT'),
}));

// 全文検索クエリ
const searchResults = await db.select()
  .from(products)
  .where(sql`MATCH(${products.description}) AGAINST('search term' IN NATURAL LANGUAGE MODE)`);
```

## Drizzle StudioとDX向上

```bash
# Drizzle Studio起動（GUIデータベースブラウザ）
pnpm drizzle-kit studio

# ブラウザで https://local.drizzle.studio にアクセス
```

**Drizzle Studioの機能:**
- リアルタイムデータブラウジング
- CRUD操作のGUIインターフェース
- リレーション視覚化
- スキーマ図生成
- クエリエディタ

## 実践パターン: Repository層の実装

```typescript
// repositories/user.repository.ts
import { eq, and, or, like, desc } from 'drizzle-orm';
import type { DB } from '../db';
import { users } from '../db/schema';

export class UserRepository {
  constructor(private db: DB) {}

  async findById(id: number) {
    return this.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
      with: {
        posts: { limit: 5, orderBy: (posts, { desc }) => desc(posts.createdAt) },
      },
    });
  }

  async search(query: string, filters: { isActive?: boolean } = {}) {
    const conditions = [
      or(
        like(users.name, `%${query}%`),
        like(users.email, `%${query}%`)
      ),
    ];

    if (filters.isActive !== undefined) {
      conditions.push(eq(users.isActive, filters.isActive));
    }

    return this.db.select()
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));
  }

  async create(data: { email: string; name: string; age?: number }) {
    const result = await this.db.insert(users)
      .values(data)
      .returning();
    return result[0];
  }

  async update(id: number, data: Partial<typeof users.$inferInsert>) {
    await this.db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id));
  }
}
```

## パフォーマンスベストプラクティス

### N+1問題の回避

```typescript
// ❌ N+1問題（各postごとにクエリ発行）
const posts = await db.select().from(postsTable);
for (const post of posts) {
  const author = await db.select()
    .from(usersTable)
    .where(eq(usersTable.id, post.authorId));
}

// ✅ 1クエリで解決
const postsWithAuthors = await db.query.posts.findMany({
  with: { author: true },
});

// または手動JOIN
const postsWithAuthors = await db.select()
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id));
```

### インデックス活用

```typescript
// スキーマにインデックス定義
export const posts = pgTable('posts', {
  // ...
}, (table) => ({
  authorIdx: index('author_idx').on(table.authorId),
  publishedIdx: index('published_idx').on(table.publishedAt),
  // 複合インデックス
  authorPublishedIdx: index('author_published_idx')
    .on(table.authorId, table.publishedAt),
}));

// クエリがインデックスを活用
const recentPosts = await db.select()
  .from(posts)
  .where(and(
    eq(posts.authorId, 1),
    gte(posts.publishedAt, new Date('2025-01-01'))
  ));
```

### コネクションプーリング

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// 本番環境
const client = postgres(process.env.DATABASE_URL!, {
  max: 10, // 最大接続数
  idle_timeout: 20,
  connect_timeout: 10,
});

// サーバーレス環境（Vercel等）
import { Pool } from '@vercel/postgres';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
```

## まとめ

Drizzle ORM v1は以下のシナリオで特に優れています:

**最適なユースケース:**
- TypeScript型安全性を最大限活用したい
- SQLの完全な制御が必要
- エッジランタイム（Cloudflare Workers等）で動作させたい
- 軽量なバンドルサイズが重要
- 既存のSQLスキーマと統合したい

**開発のポイント:**
- スキーマはTypeScriptで定義し、マイグレーションは自動生成
- Query APIとCore APIを使い分ける
- Prepared Statementsで頻繁なクエリを高速化
- Drizzle Studioで開発体験を向上
- リレーション定義でN+1問題を回避

Drizzle ORMのエコシステムは急速に成長しており、v1リリースにより本番環境での使用が推奨されるレベルに到達しました。SQLを理解している開発者にとって、最も生産的なORMの選択肢となるでしょう。
