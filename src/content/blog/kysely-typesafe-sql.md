---
title: "Kysely完全ガイド - TypeScript型安全SQLクエリビルダーでデータベース操作を革新する"
description: "KyselyはTypeScript型安全なSQLクエリビルダー。生SQLの柔軟性と完全な型推論、マイグレーション、トランザクション、複数DB対応を実現。Prisma/Drizzleとの比較も解説。Kysely・TypeScript・SQLに関する実践情報。"
pubDate: "2025-02-06"
tags: ["Kysely", "TypeScript", "SQL", "Database", "Type Safety", "Query Builder"]
---

## Kyselyとは

**Kysely**はTypeScript専用に設計された**型安全なSQLクエリビルダー**です。ORMではなく、SQLの柔軟性を保ちながら完全な型推論を実現します。

### 従来のデータベースライブラリの問題

```ts
// 従来のSQL（型安全性ゼロ）
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
// result: any（型情報なし）

// Prisma（抽象化しすぎ）
const user = await prisma.user.findUnique({ where: { id: userId } });
// 複雑なSQLは書きにくい、生成されるクエリが非効率な場合あり
```

**問題点**:
- **生SQL**: 型安全性ゼロ、リファクタリング困難
- **重いORM**: 学習コスト高、複雑なクエリが書けない
- **柔軟性不足**: SQLの全機能を使えない

### Kyselyの解決策

```ts
// Kysely（型安全 + 柔軟）
const user = await db
  .selectFrom('users')
  .select(['id', 'name', 'email'])
  .where('id', '=', userId)
  .executeTakeFirst();

// user: { id: number; name: string; email: string; } | undefined
// 完全な型推論、SQLの全機能を使用可能
```

**利点**:
- **完全な型安全性** - すべてのクエリが型チェックされる
- **SQL準拠** - 生SQLと同等の柔軟性
- **軽量** - ランタイムオーバーヘッド最小
- **複数DB対応** - PostgreSQL、MySQL、SQLite

## インストールとセットアップ

### 基本インストール

```bash
# コアライブラリ
npm install kysely

# データベースドライバー（PostgreSQL例）
npm install pg
npm install --save-dev @types/pg
```

### PostgreSQL接続

```ts
// db.ts
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

// データベーススキーマ定義
interface Database {
  users: {
    id: number;
    name: string;
    email: string;
    created_at: Date;
  };
  posts: {
    id: number;
    user_id: number;
    title: string;
    content: string;
    created_at: Date;
  };
}

// Kyselyインスタンス作成
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: process.env.DATABASE_HOST,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      port: 5432
    })
  })
});
```

### MySQL接続

```bash
npm install mysql2
```

```ts
import { Kysely, MysqlDialect } from 'kysely';
import { createPool } from 'mysql2';

export const db = new Kysely<Database>({
  dialect: new MysqlDialect({
    pool: createPool({
      host: process.env.DATABASE_HOST,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD
    })
  })
});
```

### SQLite接続

```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

```ts
import { Kysely, SqliteDialect } from 'kysely';
import SQLite from 'better-sqlite3';

export const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new SQLite('database.db')
  })
});
```

## 基本的なクエリ

### SELECT

```ts
// すべてのカラムを取得
const users = await db.selectFrom('users').selectAll().execute();
// users: { id: number; name: string; email: string; created_at: Date; }[]

// 特定のカラムのみ
const users = await db
  .selectFrom('users')
  .select(['id', 'name'])
  .execute();
// users: { id: number; name: string; }[]

// エイリアス
const users = await db
  .selectFrom('users')
  .select(['id', 'name as userName'])
  .execute();
// users: { id: number; userName: string; }[]

// 最初の1件
const user = await db
  .selectFrom('users')
  .select(['id', 'name'])
  .where('id', '=', 1)
  .executeTakeFirst();
// user: { id: number; name: string; } | undefined

// 1件のみ（存在しない場合エラー）
const user = await db
  .selectFrom('users')
  .select(['id', 'name'])
  .where('id', '=', 1)
  .executeTakeFirstOrThrow();
// user: { id: number; name: string; }（エラーまたは結果）
```

### WHERE条件

```ts
// 等価
const users = await db
  .selectFrom('users')
  .selectAll()
  .where('name', '=', 'Alice')
  .execute();

// 不等価
const users = await db
  .selectFrom('users')
  .selectAll()
  .where('id', '!=', 1)
  .execute();

// IN
const users = await db
  .selectFrom('users')
  .selectAll()
  .where('id', 'in', [1, 2, 3])
  .execute();

// LIKE
const users = await db
  .selectFrom('users')
  .selectAll()
  .where('name', 'like', '%Alice%')
  .execute();

// IS NULL
const users = await db
  .selectFrom('users')
  .selectAll()
  .where('email', 'is', null)
  .execute();

// 複数条件（AND）
const users = await db
  .selectFrom('users')
  .selectAll()
  .where('name', '=', 'Alice')
  .where('email', 'like', '%@example.com')
  .execute();

// OR条件
const users = await db
  .selectFrom('users')
  .selectAll()
  .where((eb) => eb.or([
    eb('name', '=', 'Alice'),
    eb('name', '=', 'Bob')
  ]))
  .execute();

// 複雑な条件
const users = await db
  .selectFrom('users')
  .selectAll()
  .where((eb) => eb.and([
    eb.or([
      eb('name', '=', 'Alice'),
      eb('name', '=', 'Bob')
    ]),
    eb('email', 'like', '%@example.com')
  ]))
  .execute();
```

### JOIN

```ts
// INNER JOIN
const results = await db
  .selectFrom('posts')
  .innerJoin('users', 'users.id', 'posts.user_id')
  .select([
    'posts.id',
    'posts.title',
    'users.name as author_name'
  ])
  .execute();
// results: { id: number; title: string; author_name: string; }[]

// LEFT JOIN
const results = await db
  .selectFrom('users')
  .leftJoin('posts', 'posts.user_id', 'users.id')
  .select([
    'users.id',
    'users.name',
    'posts.title'
  ])
  .execute();

// 複数JOIN
const results = await db
  .selectFrom('posts')
  .innerJoin('users', 'users.id', 'posts.user_id')
  .leftJoin('comments', 'comments.post_id', 'posts.id')
  .select([
    'posts.title',
    'users.name',
    'comments.content'
  ])
  .execute();

// 複雑なJOIN条件
const results = await db
  .selectFrom('posts')
  .innerJoin('users', (join) => join
    .onRef('users.id', '=', 'posts.user_id')
    .on('users.active', '=', true)
  )
  .selectAll()
  .execute();
```

### INSERT

```ts
// 1件挿入
const result = await db
  .insertInto('users')
  .values({
    name: 'Alice',
    email: 'alice@example.com',
    created_at: new Date()
  })
  .executeTakeFirst();
// result: InsertResult { insertId: bigint; numInsertedOrUpdatedRows: bigint; }

// 挿入後にIDを取得（PostgreSQL）
const result = await db
  .insertInto('users')
  .values({
    name: 'Alice',
    email: 'alice@example.com',
    created_at: new Date()
  })
  .returning('id')
  .executeTakeFirst();
// result: { id: number; }

// 挿入後に全カラム取得
const user = await db
  .insertInto('users')
  .values({
    name: 'Alice',
    email: 'alice@example.com',
    created_at: new Date()
  })
  .returningAll()
  .executeTakeFirst();
// user: { id: number; name: string; email: string; created_at: Date; }

// 複数件挿入
const result = await db
  .insertInto('users')
  .values([
    { name: 'Alice', email: 'alice@example.com', created_at: new Date() },
    { name: 'Bob', email: 'bob@example.com', created_at: new Date() }
  ])
  .execute();
```

### UPDATE

```ts
// 更新
const result = await db
  .updateTable('users')
  .set({ name: 'Alice Updated' })
  .where('id', '=', 1)
  .executeTakeFirst();
// result: UpdateResult { numUpdatedRows: bigint; }

// 複数カラム更新
const result = await db
  .updateTable('users')
  .set({
    name: 'Alice Updated',
    email: 'alice.new@example.com'
  })
  .where('id', '=', 1)
  .executeTakeFirst();

// 更新後の値を取得（PostgreSQL）
const user = await db
  .updateTable('users')
  .set({ name: 'Alice Updated' })
  .where('id', '=', 1)
  .returningAll()
  .executeTakeFirst();

// 条件付き更新
const result = await db
  .updateTable('users')
  .set({ name: 'Alice Updated' })
  .where('email', 'like', '%@example.com')
  .execute();

// 式を使った更新
const result = await db
  .updateTable('posts')
  .set((eb) => ({
    view_count: eb('view_count', '+', 1)
  }))
  .where('id', '=', 1)
  .execute();
```

### DELETE

```ts
// 削除
const result = await db
  .deleteFrom('users')
  .where('id', '=', 1)
  .executeTakeFirst();
// result: DeleteResult { numDeletedRows: bigint; }

// 複数削除
const result = await db
  .deleteFrom('users')
  .where('id', 'in', [1, 2, 3])
  .execute();

// 削除前にデータ取得（PostgreSQL）
const deletedUser = await db
  .deleteFrom('users')
  .where('id', '=', 1)
  .returningAll()
  .executeTakeFirst();
```

## 集計関数

```ts
// COUNT
const result = await db
  .selectFrom('users')
  .select((eb) => eb.fn.count('id').as('user_count'))
  .executeTakeFirst();
// result: { user_count: string; }

// SUM
const result = await db
  .selectFrom('posts')
  .select((eb) => eb.fn.sum('view_count').as('total_views'))
  .executeTakeFirst();

// AVG
const result = await db
  .selectFrom('posts')
  .select((eb) => eb.fn.avg('view_count').as('avg_views'))
  .executeTakeFirst();

// MIN/MAX
const result = await db
  .selectFrom('posts')
  .select((eb) => [
    eb.fn.min('view_count').as('min_views'),
    eb.fn.max('view_count').as('max_views')
  ])
  .executeTakeFirst();

// GROUP BY
const results = await db
  .selectFrom('posts')
  .select([
    'user_id',
    (eb) => eb.fn.count('id').as('post_count')
  ])
  .groupBy('user_id')
  .execute();

// HAVING
const results = await db
  .selectFrom('posts')
  .select([
    'user_id',
    (eb) => eb.fn.count('id').as('post_count')
  ])
  .groupBy('user_id')
  .having((eb) => eb.fn.count('id'), '>', 5)
  .execute();
```

## ORDER BY、LIMIT、OFFSET

```ts
// ORDER BY
const users = await db
  .selectFrom('users')
  .selectAll()
  .orderBy('name', 'asc')
  .execute();

// 複数カラムでソート
const users = await db
  .selectFrom('users')
  .selectAll()
  .orderBy('name', 'asc')
  .orderBy('created_at', 'desc')
  .execute();

// LIMIT
const users = await db
  .selectFrom('users')
  .selectAll()
  .limit(10)
  .execute();

// OFFSET（ページネーション）
const users = await db
  .selectFrom('users')
  .selectAll()
  .limit(10)
  .offset(20)
  .execute();

// 完全なページネーション
const page = 3;
const pageSize = 10;

const users = await db
  .selectFrom('users')
  .selectAll()
  .orderBy('id', 'asc')
  .limit(pageSize)
  .offset((page - 1) * pageSize)
  .execute();
```

## トランザクション

```ts
// トランザクション基本
await db.transaction().execute(async (trx) => {
  await trx
    .insertInto('users')
    .values({ name: 'Alice', email: 'alice@example.com', created_at: new Date() })
    .execute();

  await trx
    .insertInto('posts')
    .values({ user_id: 1, title: 'First Post', content: 'Content', created_at: new Date() })
    .execute();
});

// エラー時のロールバック
try {
  await db.transaction().execute(async (trx) => {
    await trx.insertInto('users').values({ /* ... */ }).execute();
    throw new Error('Something went wrong');
    await trx.insertInto('posts').values({ /* ... */ }).execute(); // 実行されない
  });
} catch (error) {
  console.error('Transaction rolled back:', error);
}

// 分離レベル指定（PostgreSQL）
await db.transaction()
  .setIsolationLevel('serializable')
  .execute(async (trx) => {
    // トランザクション処理
  });

// ネストしたトランザクション
await db.transaction().execute(async (trx) => {
  await trx.insertInto('users').values({ /* ... */ }).execute();

  await trx.transaction().execute(async (nestedTrx) => {
    await nestedTrx.insertInto('posts').values({ /* ... */ }).execute();
  });
});
```

## サブクエリ

```ts
// SELECT内のサブクエリ
const results = await db
  .selectFrom('users')
  .select([
    'id',
    'name',
    (eb) => eb
      .selectFrom('posts')
      .select((eb) => eb.fn.count('id').as('post_count'))
      .whereRef('posts.user_id', '=', 'users.id')
      .as('post_count')
  ])
  .execute();

// WHERE内のサブクエリ
const users = await db
  .selectFrom('users')
  .selectAll()
  .where((eb) => eb(
    'id',
    'in',
    eb.selectFrom('posts').select('user_id').where('view_count', '>', 1000)
  ))
  .execute();

// EXISTS
const users = await db
  .selectFrom('users')
  .selectAll()
  .where((eb) => eb.exists(
    eb.selectFrom('posts')
      .select('id')
      .whereRef('posts.user_id', '=', 'users.id')
  ))
  .execute();
```

## WITH句（CTE）

```ts
// 基本的なCTE
const results = await db
  .with('active_users', (db) => db
    .selectFrom('users')
    .select(['id', 'name'])
    .where('active', '=', true)
  )
  .selectFrom('active_users')
  .selectAll()
  .execute();

// 複数のCTE
const results = await db
  .with('active_users', (db) => db
    .selectFrom('users')
    .select(['id', 'name'])
    .where('active', '=', true)
  )
  .with('user_posts', (db) => db
    .selectFrom('posts')
    .innerJoin('active_users', 'active_users.id', 'posts.user_id')
    .select(['posts.id', 'posts.title', 'active_users.name'])
  )
  .selectFrom('user_posts')
  .selectAll()
  .execute();

// 再帰CTE（ツリー構造）
const results = await db
  .withRecursive('category_tree', (db) => db
    .selectFrom('categories')
    .select(['id', 'name', 'parent_id'])
    .where('parent_id', 'is', null)
    .unionAll(
      db.selectFrom('categories')
        .innerJoin('category_tree', 'category_tree.id', 'categories.parent_id')
        .select(['categories.id', 'categories.name', 'categories.parent_id'])
    )
  )
  .selectFrom('category_tree')
  .selectAll()
  .execute();
```

## 型生成

### kysely-codegenでスキーマから自動生成

```bash
npm install --save-dev kysely-codegen
```

```json
// package.json
{
  "scripts": {
    "generate-types": "kysely-codegen --out-file src/types/database.ts"
  }
}
```

```bash
# 環境変数設定
export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# 型生成
npm run generate-types
```

生成される型:

```ts
// src/types/database.ts（自動生成）
export interface Database {
  users: {
    id: Generated<number>;
    name: string;
    email: string;
    created_at: Generated<Date>;
  };
  posts: {
    id: Generated<number>;
    user_id: number;
    title: string;
    content: string;
    view_count: Generated<number>;
    created_at: Generated<Date>;
  };
}
```

使用:

```ts
import { Database } from './types/database';
import { Kysely } from 'kysely';

export const db = new Kysely<Database>({ /* ... */ });
```

## マイグレーション

### Kysely Migrator

```bash
npm install --save-dev kysely
```

```ts
// migrations/001_initial.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('posts')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id'))
    .addColumn('title', 'varchar(255)', (col) => col.notNull())
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('posts_user_id_index')
    .on('posts')
    .column('user_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('posts').execute();
  await db.schema.dropTable('users').execute();
}
```

```ts
// migrate.ts
import { Migrator, FileMigrationProvider } from 'kysely';
import { db } from './db';
import path from 'path';
import { promises as fs } from 'fs';

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(__dirname, 'migrations')
  })
});

async function migrateToLatest() {
  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to migrate');
    console.error(error);
    process.exit(1);
  }
}

migrateToLatest();
```

## Prismaとの比較

```ts
// Prisma
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    }
  }
});

// Kysely（同等のクエリ）
const user = await db
  .selectFrom('users')
  .select([
    'users.id',
    'users.name',
    (eb) => eb
      .selectFrom('posts')
      .select((eb) => eb.fn.agg<any>('json_agg', ['posts']).as('posts'))
      .whereRef('posts.user_id', '=', 'users.id')
      .where('posts.published', '=', true)
      .orderBy('posts.created_at', 'desc')
      .limit(10)
      .as('posts')
  ])
  .where('users.id', '=', 1)
  .executeTakeFirst();

// より直感的な方法（2クエリ）
const user = await db
  .selectFrom('users')
  .selectAll()
  .where('id', '=', 1)
  .executeTakeFirst();

const posts = await db
  .selectFrom('posts')
  .selectAll()
  .where('user_id', '=', user.id)
  .where('published', '=', true)
  .orderBy('created_at', 'desc')
  .limit(10)
  .execute();
```

**比較**:

| 項目 | Kysely | Prisma |
|------|--------|--------|
| 型安全性 | 完全 | 完全 |
| SQLの柔軟性 | 高い | 中程度 |
| 学習コスト | 低い（SQL知識前提） | 中程度（独自API） |
| 複雑なクエリ | 容易 | 困難な場合あり |
| マイグレーション | 手動 | 自動生成 |
| バンドルサイズ | 小さい | 大きい |

## 実践例

### ブログシステム

```ts
// types.ts
export interface Database {
  users: {
    id: Generated<number>;
    name: string;
    email: string;
    password_hash: string;
    created_at: Generated<Date>;
  };
  posts: {
    id: Generated<number>;
    user_id: number;
    title: string;
    slug: string;
    content: string;
    published: Generated<boolean>;
    view_count: Generated<number>;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  };
  comments: {
    id: Generated<number>;
    post_id: number;
    user_id: number;
    content: string;
    created_at: Generated<Date>;
  };
  tags: {
    id: Generated<number>;
    name: string;
  };
  post_tags: {
    post_id: number;
    tag_id: number;
  };
}
```

```ts
// repository.ts
import { db } from './db';

export class PostRepository {
  // 公開記事一覧取得
  async getPublishedPosts(page: number, pageSize: number) {
    return db
      .selectFrom('posts')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .select([
        'posts.id',
        'posts.title',
        'posts.slug',
        'posts.created_at',
        'users.name as author_name',
        'posts.view_count'
      ])
      .where('posts.published', '=', true)
      .orderBy('posts.created_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute();
  }

  // 記事詳細取得（コメント含む）
  async getPostWithComments(slug: string) {
    const post = await db
      .selectFrom('posts')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .select([
        'posts.id',
        'posts.title',
        'posts.content',
        'posts.created_at',
        'users.name as author_name',
        'posts.view_count'
      ])
      .where('posts.slug', '=', slug)
      .where('posts.published', '=', true)
      .executeTakeFirst();

    if (!post) return null;

    const comments = await db
      .selectFrom('comments')
      .innerJoin('users', 'users.id', 'comments.user_id')
      .select([
        'comments.id',
        'comments.content',
        'comments.created_at',
        'users.name as commenter_name'
      ])
      .where('comments.post_id', '=', post.id)
      .orderBy('comments.created_at', 'asc')
      .execute();

    const tags = await db
      .selectFrom('post_tags')
      .innerJoin('tags', 'tags.id', 'post_tags.tag_id')
      .select(['tags.id', 'tags.name'])
      .where('post_tags.post_id', '=', post.id)
      .execute();

    return { ...post, comments, tags };
  }

  // 記事作成
  async createPost(userId: number, data: { title: string; content: string; tagIds: number[] }) {
    return db.transaction().execute(async (trx) => {
      const post = await trx
        .insertInto('posts')
        .values({
          user_id: userId,
          title: data.title,
          slug: slugify(data.title),
          content: data.content,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returningAll()
        .executeTakeFirst();

      if (data.tagIds.length > 0) {
        await trx
          .insertInto('post_tags')
          .values(data.tagIds.map(tagId => ({ post_id: post.id, tag_id: tagId })))
          .execute();
      }

      return post;
    });
  }

  // ビュー数インクリメント
  async incrementViewCount(postId: number) {
    return db
      .updateTable('posts')
      .set((eb) => ({ view_count: eb('view_count', '+', 1) }))
      .where('id', '=', postId)
      .execute();
  }

  // タグで検索
  async searchByTag(tagName: string) {
    return db
      .selectFrom('posts')
      .innerJoin('post_tags', 'post_tags.post_id', 'posts.id')
      .innerJoin('tags', 'tags.id', 'post_tags.tag_id')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .select([
        'posts.id',
        'posts.title',
        'posts.slug',
        'users.name as author_name'
      ])
      .where('tags.name', '=', tagName)
      .where('posts.published', '=', true)
      .execute();
  }
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-');
}
```

## まとめ

Kyselyは**TypeScript型安全SQLクエリビルダー**として、以下の価値を提供します。

### 主要な利点

1. **完全な型安全性** - すべてのクエリが型チェックされる
2. **SQL準拠** - 生SQLと同等の柔軟性
3. **軽量** - ランタイムオーバーヘッド最小
4. **複数DB対応** - PostgreSQL、MySQL、SQLite
5. **優れた開発者体験** - IntelliSense、リファクタリング対応

### 採用判断基準

**Kyselyを選ぶべき場合**:
- 複雑なSQLクエリが必要
- 型安全性を重視
- バンドルサイズを最小化したい
- SQLの知識がある

**他の選択肢を検討すべき場合**:
- 自動マイグレーション必須（Prisma）
- SQL知識がない（Prisma）
- ORM完全抽象化が必要（Prisma）

Kyselyは現代的なTypeScript開発において、SQLの柔軟性と型安全性の両立を実現する最良の選択肢です。
