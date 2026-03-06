---
title: 'Kysely完全ガイド - TypeScript型安全SQLクエリビルダー'
description: 'Kyselyの基本からスキーマ定義、CRUD操作、マイグレーション、PostgreSQL/MySQL/SQLite対応まで。型安全なSQLクエリビルダーを徹底解説。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: 'Feb 05 2026'
tags: ['Kysely', 'TypeScript', 'SQL', 'データベース', 'ORM']
---
# Kysely完全ガイド - TypeScript型安全SQLクエリビルダー

Kyselyは、TypeScript向けの型安全なSQLクエリビルダーです。ORMではなくクエリビルダーとして設計されており、SQLの知識をそのまま活かしながら完全な型安全性を提供します。

## Kyselyとは

### 特徴

1. **完全な型安全性** - クエリの入力から出力まですべて型チェック
2. **SQLに忠実** - ORMの抽象化なし、SQLの知識がそのまま活きる
3. **ゼロ依存** - 最小限のフットプリント
4. **マルチDB対応** - PostgreSQL、MySQL、SQLite
5. **マイグレーション** - 組み込みのマイグレーションツール

### Prisma/Drizzleとの比較

| 項目 | Kysely | Prisma | Drizzle |
|------|--------|--------|---------|
| タイプ | クエリビルダー | ORM | ORM/クエリビルダー |
| 型安全性 | 完全 | 高い | 完全 |
| SQLとの距離 | 近い | 遠い | 近い |
| スキーマ定義 | TypeScript型 | .prismaファイル | TypeScript |
| バンドルサイズ | 小 | 大 | 小 |
| サーバーレス | ○ | △ | ○ |

## セットアップ

### インストール

```bash
# PostgreSQL
npm install kysely pg

# MySQL
npm install kysely mysql2

# SQLite
npm install kysely better-sqlite3
```

### データベース型定義

```typescript
// src/db/types.ts
import { Generated, Insertable, Selectable, Updateable } from 'kysely'

// テーブル定義
export interface Database {
  users: UserTable
  posts: PostTable
  comments: CommentTable
  tags: TagTable
  post_tags: PostTagTable
}

interface UserTable {
  id: Generated<number>
  name: string
  email: string
  role: 'admin' | 'user'
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

interface PostTable {
  id: Generated<number>
  title: string
  content: string
  published: Generated<boolean>
  author_id: number
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

interface CommentTable {
  id: Generated<number>
  body: string
  post_id: number
  author_id: number
  created_at: Generated<Date>
}

interface TagTable {
  id: Generated<number>
  name: string
}

interface PostTagTable {
  post_id: number
  tag_id: number
}

// ヘルパー型
export type User = Selectable<UserTable>
export type NewUser = Insertable<UserTable>
export type UserUpdate = Updateable<UserTable>

export type Post = Selectable<PostTable>
export type NewPost = Insertable<PostTable>
export type PostUpdate = Updateable<PostTable>
```

### クライアント初期化

```typescript
// src/db/index.ts
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { Database } from './types'

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
})
```

#### MySQL

```typescript
import { Kysely, MysqlDialect } from 'kysely'
import { createPool } from 'mysql2'

export const db = new Kysely<Database>({
  dialect: new MysqlDialect({
    pool: createPool({
      uri: process.env.DATABASE_URL,
    }),
  }),
})
```

#### SQLite

```typescript
import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'

export const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new Database('mydb.sqlite'),
  }),
})
```

## CRUD操作

### SELECT

```typescript
// 全件取得
const users = await db
  .selectFrom('users')
  .selectAll()
  .execute()

// 条件付き検索
const activeAdmins = await db
  .selectFrom('users')
  .select(['id', 'name', 'email'])
  .where('role', '=', 'admin')
  .orderBy('created_at', 'desc')
  .execute()

// 1件取得
const user = await db
  .selectFrom('users')
  .selectAll()
  .where('id', '=', userId)
  .executeTakeFirst()

// 1件取得（見つからない場合はエラー）
const user = await db
  .selectFrom('users')
  .selectAll()
  .where('id', '=', userId)
  .executeTakeFirstOrThrow()
```

### 複雑なWHERE

```typescript
// AND/OR
const results = await db
  .selectFrom('posts')
  .selectAll()
  .where('published', '=', true)
  .where((eb) =>
    eb.or([
      eb('title', 'like', '%TypeScript%'),
      eb('content', 'like', '%TypeScript%'),
    ])
  )
  .execute()

// IN句
const userPosts = await db
  .selectFrom('posts')
  .selectAll()
  .where('author_id', 'in', [1, 2, 3])
  .execute()

// IS NULL / IS NOT NULL
const drafts = await db
  .selectFrom('posts')
  .selectAll()
  .where('published', '=', false)
  .execute()
```

### JOIN

```typescript
// INNER JOIN
const postsWithAuthors = await db
  .selectFrom('posts')
  .innerJoin('users', 'users.id', 'posts.author_id')
  .select([
    'posts.id',
    'posts.title',
    'users.name as author_name',
    'posts.created_at',
  ])
  .where('posts.published', '=', true)
  .orderBy('posts.created_at', 'desc')
  .execute()

// LEFT JOIN
const usersWithPostCount = await db
  .selectFrom('users')
  .leftJoin('posts', 'posts.author_id', 'users.id')
  .select([
    'users.id',
    'users.name',
    db.fn.count('posts.id').as('post_count'),
  ])
  .groupBy(['users.id', 'users.name'])
  .execute()

// 多対多 JOIN
const postsWithTags = await db
  .selectFrom('posts')
  .innerJoin('post_tags', 'post_tags.post_id', 'posts.id')
  .innerJoin('tags', 'tags.id', 'post_tags.tag_id')
  .select([
    'posts.id',
    'posts.title',
    'tags.name as tag_name',
  ])
  .execute()
```

### INSERT

```typescript
// 1件挿入
const newUser = await db
  .insertInto('users')
  .values({
    name: 'Alice',
    email: 'alice@example.com',
    role: 'user',
  })
  .returningAll()
  .executeTakeFirstOrThrow()

// 複数件挿入
await db
  .insertInto('tags')
  .values([
    { name: 'TypeScript' },
    { name: 'JavaScript' },
    { name: 'Deno' },
  ])
  .execute()

// ON CONFLICT（Upsert）
await db
  .insertInto('users')
  .values({
    name: 'Alice',
    email: 'alice@example.com',
    role: 'user',
  })
  .onConflict((oc) =>
    oc.column('email').doUpdateSet({
      name: 'Alice Updated',
      updated_at: new Date(),
    })
  )
  .execute()
```

### UPDATE

```typescript
// 条件付き更新
const result = await db
  .updateTable('posts')
  .set({
    published: true,
    updated_at: new Date(),
  })
  .where('id', '=', postId)
  .returningAll()
  .executeTakeFirst()

// 動的更新
async function updateUser(id: number, data: UserUpdate) {
  return await db
    .updateTable('users')
    .set(data)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow()
}
```

### DELETE

```typescript
// 条件付き削除
await db
  .deleteFrom('comments')
  .where('post_id', '=', postId)
  .execute()

// RETURNING付き
const deleted = await db
  .deleteFrom('posts')
  .where('id', '=', postId)
  .returningAll()
  .executeTakeFirst()
```

## ページネーション

```typescript
async function getPaginatedPosts(page: number, limit: number = 10) {
  const offset = (page - 1) * limit

  const [posts, countResult] = await Promise.all([
    db
      .selectFrom('posts')
      .selectAll()
      .where('published', '=', true)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute(),
    db
      .selectFrom('posts')
      .select(db.fn.count('id').as('total'))
      .where('published', '=', true)
      .executeTakeFirstOrThrow(),
  ])

  return {
    posts,
    total: Number(countResult.total),
    page,
    totalPages: Math.ceil(Number(countResult.total) / limit),
  }
}
```

## サブクエリ

```typescript
// サブクエリでフィルタリング
const usersWithPosts = await db
  .selectFrom('users')
  .selectAll()
  .where('id', 'in',
    db.selectFrom('posts')
      .select('author_id')
      .where('published', '=', true)
  )
  .execute()

// サブクエリをカラムとして
const usersWithLatestPost = await db
  .selectFrom('users')
  .select([
    'users.id',
    'users.name',
    db.selectFrom('posts')
      .select('title')
      .whereRef('posts.author_id', '=', 'users.id')
      .orderBy('created_at', 'desc')
      .limit(1)
      .as('latest_post_title'),
  ])
  .execute()
```

## トランザクション

```typescript
async function createPostWithTags(
  post: NewPost,
  tagNames: string[]
) {
  return await db.transaction().execute(async (trx) => {
    // 投稿を作成
    const newPost = await trx
      .insertInto('posts')
      .values(post)
      .returningAll()
      .executeTakeFirstOrThrow()

    // タグを取得または作成
    for (const tagName of tagNames) {
      let tag = await trx
        .selectFrom('tags')
        .selectAll()
        .where('name', '=', tagName)
        .executeTakeFirst()

      if (!tag) {
        tag = await trx
          .insertInto('tags')
          .values({ name: tagName })
          .returningAll()
          .executeTakeFirstOrThrow()
      }

      await trx
        .insertInto('post_tags')
        .values({ post_id: newPost.id, tag_id: tag.id })
        .execute()
    }

    return newPost
  })
}
```

## マイグレーション

### マイグレーションファイル

```typescript
// migrations/001_initial.ts
import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('role', 'varchar(50)', (col) => col.notNull().defaultTo('user'))
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('updated_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute()

  await db.schema
    .createTable('posts')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('title', 'varchar(500)', (col) => col.notNull())
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('published', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('author_id', 'integer', (col) =>
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('updated_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute()

  await db.schema
    .createIndex('posts_author_id_idx')
    .on('posts')
    .column('author_id')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('posts').execute()
  await db.schema.dropTable('users').execute()
}
```

### マイグレーション実行

```typescript
// migrate.ts
import { promises as fs } from 'fs'
import path from 'path'
import { Migrator, FileMigrationProvider } from 'kysely'
import { db } from './db'

async function migrateToLatest() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  })

  const { error, results } = await migrator.migrateToLatest()

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`Migration "${it.migrationName}" was executed successfully`)
    } else if (it.status === 'Error') {
      console.error(`Failed to execute migration "${it.migrationName}"`)
    }
  })

  if (error) {
    console.error('Failed to migrate')
    console.error(error)
    process.exit(1)
  }

  await db.destroy()
}

migrateToLatest()
```

## Next.js統合

### Server Component

```typescript
// app/posts/page.tsx
import { db } from '@/db'

export default async function PostsPage() {
  const posts = await db
    .selectFrom('posts')
    .innerJoin('users', 'users.id', 'posts.author_id')
    .select([
      'posts.id',
      'posts.title',
      'posts.created_at',
      'users.name as author',
    ])
    .where('posts.published', '=', true)
    .orderBy('posts.created_at', 'desc')
    .execute()

  return (
    <div>
      <h1>Blog Posts</h1>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>by {post.author}</p>
        </article>
      ))}
    </div>
  )
}
```

### Server Action

```typescript
// app/posts/actions.ts
'use server'

import { db } from '@/db'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  await db
    .insertInto('posts')
    .values({
      title,
      content,
      author_id: 1,
      published: true,
    })
    .execute()

  revalidatePath('/posts')
}
```

## まとめ

Kyselyの主な利点：

1. **完全な型安全性** - コンパイル時にSQLの誤りを検出
2. **SQLに忠実** - 新しいクエリ言語を学ぶ必要なし
3. **軽量** - ゼロ依存で小さなバンドルサイズ
4. **柔軟** - PostgreSQL、MySQL、SQLiteに対応

SQLの知識を活かしつつ型安全性を得たい場合、Kyselyは最適な選択肢です。Prismaのようなフルスタック機能は不要で、純粋なクエリビルダーが欲しい場合に特に力を発揮します。
