---
title: "Drizzle ORM実践ガイド - SQL-likeな型安全ORMの決定版"
description: "SQL-likeなAPI設計と完全な型安全性を備えたDrizzle ORMの実践ガイド。スキーマ定義からクエリ構築、リレーション、マイグレーション、パフォーマンス最適化まで徹底解説します。"
pubDate: "2025-02-06"
tags: ["Drizzle ORM", "TypeScript", "データベース", "SQL", "型安全性", "ORM"]
---

# Drizzle ORM実践ガイド - SQL-likeな型安全ORMの決定版

データベースとのやり取りは、あらゆるアプリケーション開発において避けて通れない重要な要素です。従来、TypeScript環境ではPrismaが主流でしたが、独自のスキーマ言語やマイグレーション方法、パフォーマンスの課題などが指摘されてきました。

Drizzle ORMは、SQLに近い直感的なAPI、完全な型安全性、優れたパフォーマンス、軽量なランタイムを実現した次世代ORMです。SQLの知識を活かしながら、TypeScriptの恩恵を最大限に受けられる設計になっています。

本記事では、Drizzle ORMの導入から実践的な使い方、リレーション管理、マイグレーション戦略、パフォーマンス最適化まで、実際のプロジェクトで使えるノウハウを徹底解説します。

## Drizzle ORMの特徴

### SQL-likeなAPI設計

Drizzle ORMは、SQLに近い文法を採用しており、SQLの知識があればすぐに使いこなせます。

```typescript
// Prisma
const users = await prisma.user.findMany({
  where: { age: { gte: 18 } },
  orderBy: { createdAt: 'desc' },
  take: 10,
})

// Drizzle ORM
const users = await db
  .select()
  .from(usersTable)
  .where(gte(usersTable.age, 18))
  .orderBy(desc(usersTable.createdAt))
  .limit(10)
```

### 完全な型安全性

スキーマから自動的に型が推論され、クエリ全体が型安全になります。

```typescript
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  email: text('email').notNull().unique(),
})

// 型推論が効く
const user = await db.select().from(users).where(eq(users.id, 1))
//    ^? { id: number; name: string; age: number; email: string }[]
```

### 軽量で高速

ランタイムオーバーヘッドが少なく、生成されるSQLも最適化されています。

```typescript
// バンドルサイズ比較（gzip圧縮後）
// Prisma Client: ~300KB
// TypeORM: ~200KB
// Drizzle ORM: ~30KB
```

### 複数データベース対応

PostgreSQL、MySQL、SQLite、その他多数のデータベースをサポートしています。

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
// import { drizzle } from 'drizzle-orm/mysql2'
// import { drizzle } from 'drizzle-orm/better-sqlite3'
```

## プロジェクトセットアップ

### インストール

```bash
# PostgreSQLの場合
npm install drizzle-orm postgres
npm install -D drizzle-kit

# MySQLの場合
npm install drizzle-orm mysql2
npm install -D drizzle-kit

# SQLiteの場合
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

### データベース接続

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// 接続プールの作成
const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString, {
  max: 10, // 最大接続数
  idle_timeout: 20, // アイドルタイムアウト（秒）
  connect_timeout: 10, // 接続タイムアウト（秒）
})

// Drizzleインスタンス
export const db = drizzle(client, { schema })
```

### Drizzle Kit設定

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config
```

## スキーマ定義

### 基本的なテーブル定義

```typescript
// src/db/schema.ts
import { pgTable, serial, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  age: integer('age').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// 型を自動生成
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

### カラムタイプとオプション

```typescript
import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
  date,
  json,
  jsonb,
  uuid,
  pgEnum,
} from 'drizzle-orm/pg-core'

// Enumの定義
export const roleEnum = pgEnum('role', ['admin', 'user', 'guest'])
export const statusEnum = pgEnum('status', ['active', 'inactive', 'suspended'])

export const users = pgTable('users', {
  // 主キー
  id: uuid('id').primaryKey().defaultRandom(),

  // テキスト系
  name: text('name').notNull(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  bio: text('bio'),

  // 数値系
  age: integer('age').notNull(),
  height: real('height'), // float

  // 真偽値
  isActive: boolean('is_active').notNull().default(true),
  isVerified: boolean('is_verified').notNull().default(false),

  // 日時
  birthDate: date('birth_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  lastLoginAt: timestamp('last_login_at'),

  // Enum
  role: roleEnum('role').notNull().default('user'),
  status: statusEnum('status').notNull().default('active'),

  // JSON
  metadata: json('metadata').$type<{ theme: string; language: string }>(),
  settings: jsonb('settings').$type<UserSettings>(),
})

interface UserSettings {
  notifications: {
    email: boolean
    push: boolean
  }
  privacy: {
    profileVisible: boolean
    showEmail: boolean
  }
}
```

### リレーション定義

```typescript
// src/db/schema.ts
import { relations } from 'drizzle-orm'
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core'

// ユーザーテーブル
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// 投稿テーブル
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// コメントテーブル
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  postId: integer('post_id').notNull().references(() => posts.id),
  authorId: integer('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// リレーション定義
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}))
```

### インデックスと制約

```typescript
import { pgTable, serial, text, integer, index, uniqueIndex, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    username: text('username').notNull(),
    age: integer('age').notNull(),
  },
  (table) => ({
    // 通常のインデックス
    emailIdx: index('email_idx').on(table.email),

    // ユニークインデックス
    usernameIdx: uniqueIndex('username_idx').on(table.username),

    // 複合インデックス
    emailUsernameIdx: index('email_username_idx').on(table.email, table.username),

    // 部分インデックス
    activeUsersIdx: index('active_users_idx')
      .on(table.email)
      .where(sql`${table.age} >= 18`),

    // チェック制約
    ageCheck: check('age_check', sql`${table.age} >= 0 AND ${table.age} <= 150`),
  })
)
```

## クエリ操作

### SELECT（読み取り）

```typescript
import { eq, and, or, gt, gte, lt, lte, like, between, inArray } from 'drizzle-orm'

// 基本的なSELECT
const allUsers = await db.select().from(users)

// 特定のカラムのみ取得
const userNames = await db
  .select({
    id: users.id,
    name: users.name,
  })
  .from(users)

// WHERE条件
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, 1))

// 複数条件（AND）
const activeAdults = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.isActive, true),
      gte(users.age, 18)
    )
  )

// 複数条件（OR）
const youngOrOld = await db
  .select()
  .from(users)
  .where(
    or(
      lt(users.age, 20),
      gt(users.age, 60)
    )
  )

// LIKE検索
const searchUsers = await db
  .select()
  .from(users)
  .where(like(users.name, '%John%'))

// BETWEEN
const ageRangeUsers = await db
  .select()
  .from(users)
  .where(between(users.age, 20, 30))

// IN句
const specificUsers = await db
  .select()
  .from(users)
  .where(inArray(users.id, [1, 2, 3, 4, 5]))

// ORDER BY
const sortedUsers = await db
  .select()
  .from(users)
  .orderBy(desc(users.createdAt))

// LIMIT & OFFSET
const paginatedUsers = await db
  .select()
  .from(users)
  .limit(10)
  .offset(20)
```

### INSERT（作成）

```typescript
// 単一レコード挿入
const newUser = await db
  .insert(users)
  .values({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
  })
  .returning()

// 複数レコード挿入
const newUsers = await db
  .insert(users)
  .values([
    { name: 'Alice', email: 'alice@example.com', age: 25 },
    { name: 'Bob', email: 'bob@example.com', age: 35 },
  ])
  .returning()

// ON CONFLICT（upsert）
const upsertedUser = await db
  .insert(users)
  .values({
    email: 'john@example.com',
    name: 'John Updated',
    age: 31,
  })
  .onConflictDoUpdate({
    target: users.email,
    set: {
      name: sql`excluded.name`,
      age: sql`excluded.age`,
    },
  })
  .returning()

// ON CONFLICT DO NOTHING
await db
  .insert(users)
  .values({
    email: 'john@example.com',
    name: 'John',
    age: 30,
  })
  .onConflictDoNothing()
```

### UPDATE（更新）

```typescript
// 基本的なUPDATE
const updatedUser = await db
  .update(users)
  .set({
    name: 'John Updated',
    age: 31,
  })
  .where(eq(users.id, 1))
  .returning()

// 複数レコード更新
await db
  .update(users)
  .set({ isActive: false })
  .where(lt(users.lastLoginAt, new Date('2024-01-01')))

// 計算による更新
await db
  .update(users)
  .set({
    age: sql`${users.age} + 1`,
  })
  .where(eq(users.id, 1))
```

### DELETE（削除）

```typescript
// 基本的なDELETE
const deletedUser = await db
  .delete(users)
  .where(eq(users.id, 1))
  .returning()

// 複数レコード削除
await db
  .delete(users)
  .where(eq(users.isActive, false))

// 全件削除（危険！）
await db.delete(users)
```

## リレーショナルクエリ

### 基本的なJOIN

```typescript
// INNER JOIN
const postsWithAuthors = await db
  .select({
    post: posts,
    author: users,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))

// LEFT JOIN
const allPostsWithAuthors = await db
  .select({
    post: posts,
    author: users,
  })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
```

### リレーショナルクエリAPI

リレーション定義を使用すると、より直感的にクエリを書けます。

```typescript
// ユーザーと投稿を一緒に取得
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
})

// ネストしたリレーション
const usersWithPostsAndComments = await db.query.users.findMany({
  with: {
    posts: {
      with: {
        comments: true,
      },
    },
  },
})

// フィルタリングと制限
const activeUsersWithRecentPosts = await db.query.users.findMany({
  where: eq(users.isActive, true),
  with: {
    posts: {
      where: gte(posts.createdAt, new Date('2025-01-01')),
      orderBy: [desc(posts.createdAt)],
      limit: 5,
    },
  },
})

// 特定のカラムのみ取得
const usersWithPostTitles = await db.query.users.findMany({
  columns: {
    id: true,
    name: true,
  },
  with: {
    posts: {
      columns: {
        id: true,
        title: true,
      },
    },
  },
})
```

### 複雑なリレーショナルクエリ

```typescript
// 投稿、著者、コメント、コメント著者を全て取得
const postsWithFullDetails = await db.query.posts.findMany({
  with: {
    author: {
      columns: {
        id: true,
        name: true,
      },
    },
    comments: {
      with: {
        author: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [desc(comments.createdAt)],
    },
  },
  orderBy: [desc(posts.createdAt)],
  limit: 10,
})

// 条件付きリレーション読み込み
const usersWithPublishedPosts = await db.query.users.findMany({
  with: {
    posts: {
      where: eq(posts.status, 'published'),
      extras: {
        commentCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${comments}
          WHERE ${comments.postId} = ${posts.id}
        )`.as('comment_count'),
      },
    },
  },
})
```

## トランザクション

### 基本的なトランザクション

```typescript
import { db } from './db'

// トランザクション
await db.transaction(async (tx) => {
  // 新規ユーザー作成
  const [user] = await tx
    .insert(users)
    .values({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })
    .returning()

  // 関連する投稿を作成
  await tx.insert(posts).values({
    title: 'First Post',
    content: 'Hello World',
    authorId: user.id,
  })
})
```

### ネストしたトランザクション

```typescript
await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ name: 'Alice', email: 'alice@example.com', age: 25 })
    .returning()

  // ネストしたトランザクション
  await tx.transaction(async (tx2) => {
    await tx2.insert(posts).values({
      title: 'Post 1',
      content: 'Content',
      authorId: user.id,
    })

    await tx2.insert(posts).values({
      title: 'Post 2',
      content: 'Content',
      authorId: user.id,
    })
  })
})
```

### トランザクション分離レベル

```typescript
import { sql } from 'drizzle-orm'

await db.transaction(
  async (tx) => {
    // トランザクション処理
  },
  {
    isolationLevel: 'read committed',
    // 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable'
  }
)
```

### エラーハンドリングとロールバック

```typescript
try {
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      name: 'John',
      email: 'john@example.com',
      age: 30,
    })

    // エラーが発生すると自動的にロールバック
    throw new Error('Something went wrong')

    await tx.insert(posts).values({
      title: 'Post',
      content: 'Content',
      authorId: 1,
    })
  })
} catch (error) {
  console.error('Transaction failed:', error)
  // トランザクション全体がロールバックされる
}
```

## マイグレーション

### マイグレーションファイルの生成

```bash
# スキーマからマイグレーションを自動生成
npx drizzle-kit generate:pg

# カスタム名でマイグレーション生成
npx drizzle-kit generate:pg --name add_user_roles
```

### マイグレーションの実行

```bash
# マイグレーション実行
npx drizzle-kit push:pg

# または、プログラマティックに実行
```

```typescript
// src/db/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(sql)

async function main() {
  console.log('Running migrations...')

  await migrate(db, { migrationsFolder: './drizzle' })

  console.log('Migrations complete!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed!')
  console.error(err)
  process.exit(1)
})
```

### マイグレーション戦略

```typescript
// package.json
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:push": "drizzle-kit push:pg",
    "db:migrate": "tsx src/db/migrate.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

### Drizzle Studio

視覚的なデータベース管理ツール。

```bash
# Drizzle Studioを起動
npx drizzle-kit studio

# https://local.drizzle.studio でアクセス可能
```

## 高度なクエリパターン

### サブクエリ

```typescript
import { sql } from 'drizzle-orm'

// サブクエリを使った集計
const usersWithPostCount = await db
  .select({
    user: users,
    postCount: sql<number>`(
      SELECT COUNT(*)
      FROM ${posts}
      WHERE ${posts.authorId} = ${users.id}
    )`,
  })
  .from(users)

// EXISTS句
const usersWithPosts = await db
  .select()
  .from(users)
  .where(
    sql`EXISTS (
      SELECT 1
      FROM ${posts}
      WHERE ${posts.authorId} = ${users.id}
    )`
  )
```

### ウィンドウ関数

```typescript
// ランキング
const rankedPosts = await db
  .select({
    post: posts,
    rank: sql<number>`RANK() OVER (
      PARTITION BY ${posts.authorId}
      ORDER BY ${posts.createdAt} DESC
    )`,
  })
  .from(posts)

// 累積集計
const cumulativeViews = await db
  .select({
    post: posts,
    cumulativeViews: sql<number>`SUM(${posts.views}) OVER (
      PARTITION BY ${posts.authorId}
      ORDER BY ${posts.createdAt}
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )`,
  })
  .from(posts)
```

### CTE（Common Table Expressions）

```typescript
import { sql } from 'drizzle-orm'

const result = await db.execute(sql`
  WITH active_users AS (
    SELECT * FROM ${users}
    WHERE ${users.isActive} = true
  ),
  user_post_counts AS (
    SELECT
      ${users.id},
      COUNT(${posts.id}) as post_count
    FROM active_users
    LEFT JOIN ${posts} ON ${posts.authorId} = ${users.id}
    GROUP BY ${users.id}
  )
  SELECT * FROM user_post_counts
  WHERE post_count > 10
`)
```

### 集計クエリ

```typescript
import { count, sum, avg, min, max } from 'drizzle-orm'

// COUNT
const userCount = await db
  .select({ count: count() })
  .from(users)

// GROUP BY
const postsByAuthor = await db
  .select({
    authorId: posts.authorId,
    postCount: count(posts.id),
    totalViews: sum(posts.views),
    avgViews: avg(posts.views),
  })
  .from(posts)
  .groupBy(posts.authorId)

// HAVING
const activeAuthors = await db
  .select({
    authorId: posts.authorId,
    postCount: count(posts.id),
  })
  .from(posts)
  .groupBy(posts.authorId)
  .having(({ postCount }) => gte(postCount, 10))
```

## パフォーマンス最適化

### コネクションプーリング

```typescript
// src/db/index.ts
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

const client = postgres(process.env.DATABASE_URL!, {
  max: 10, // 最大接続数
  idle_timeout: 20, // アイドルタイムアウト（秒）
  connect_timeout: 10, // 接続タイムアウト（秒）
  max_lifetime: 60 * 30, // 接続の最大生存時間（秒）
})

export const db = drizzle(client)
```

### プリペアドステートメント

```typescript
import { sql } from 'drizzle-orm'

// プリペアドステートメント
const statement = db
  .select()
  .from(users)
  .where(eq(users.id, sql.placeholder('id')))
  .prepare('get_user_by_id')

// 実行
const user = await statement.execute({ id: 1 })
const user2 = await statement.execute({ id: 2 })
```

### バッチ処理

```typescript
// バッチインサート（一度に複数レコード挿入）
const batchSize = 1000
const usersToInsert = [...] // 大量のユーザーデータ

for (let i = 0; i < usersToInsert.length; i += batchSize) {
  const batch = usersToInsert.slice(i, i + batchSize)
  await db.insert(users).values(batch)
}
```

### インデックスの活用

```typescript
// スキーマにインデックスを追加
export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    authorId: integer('author_id').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    authorIdx: index('author_idx').on(table.authorId),
    statusIdx: index('status_idx').on(table.status),
    createdAtIdx: index('created_at_idx').on(table.createdAt),
    // 複合インデックス
    authorStatusIdx: index('author_status_idx').on(table.authorId, table.status),
  })
)
```

### クエリの最適化

```typescript
// N+1問題の回避（リレーショナルクエリを使用）
// ❌ N+1問題
const users = await db.select().from(usersTable)
for (const user of users) {
  const posts = await db.select().from(postsTable).where(eq(postsTable.authorId, user.id))
  // ...
}

// ✅ 最適化
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
})

// 必要なカラムのみ取得
const users = await db
  .select({
    id: usersTable.id,
    name: usersTable.name,
  })
  .from(usersTable)
```

## 実践的なパターン

### リポジトリパターン

```typescript
// src/repositories/userRepository.ts
import { db } from '@/db'
import { users, type User, type NewUser } from '@/db/schema'
import { eq } from 'drizzle-orm'

export class UserRepository {
  async findById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id))
    return user
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email))
    return user
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning()
    return user
  }

  async update(id: number, data: Partial<NewUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning()
    return user
  }

  async delete(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id))
  }

  async findAll(limit = 100, offset = 0): Promise<User[]> {
    return db.select().from(users).limit(limit).offset(offset)
  }
}

export const userRepository = new UserRepository()
```

### ソフトデリート

```typescript
// スキーマ
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  deletedAt: timestamp('deleted_at'),
})

// リポジトリ
export class UserRepository {
  async findActive(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(isNull(users.deletedAt))
  }

  async softDelete(id: number): Promise<void> {
    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, id))
  }

  async restore(id: number): Promise<void> {
    await db
      .update(users)
      .set({ deletedAt: null })
      .where(eq(users.id, id))
  }
}
```

### ページネーション

```typescript
interface PaginationParams {
  page: number
  pageSize: number
}

interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

async function getPaginatedUsers(
  params: PaginationParams
): Promise<PaginatedResult<User>> {
  const { page, pageSize } = params
  const offset = (page - 1) * pageSize

  // データ取得
  const data = await db
    .select()
    .from(users)
    .limit(pageSize)
    .offset(offset)

  // 総数取得
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems: count,
      totalPages: Math.ceil(count / pageSize),
    },
  }
}
```

## まとめ

Drizzle ORMは、SQL-likeなAPI設計と完全な型安全性を備えた次世代ORMとして、以下の特徴を提供します。

- **SQL-likeなAPI**: SQLの知識を活かせる直感的な文法
- **完全な型安全性**: スキーマから自動的に型が推論される
- **軽量で高速**: 最小限のランタイムオーバーヘッド
- **リレーショナルクエリ**: N+1問題を回避する効率的なクエリ
- **マイグレーション**: 自動生成とバージョン管理

PrismaやTypeORMと比較して、よりSQLに近い操作感、軽量なランタイム、優れたパフォーマンスを実現しています。SQLの知識があるチーム、パフォーマンスを重視するプロジェクト、型安全性を求める開発において、Drizzle ORMは最適な選択肢となるでしょう。
