---
title: 'Prisma ORM完全ガイド — スキーマ設計・マイグレーション・クエリ・本番運用'
description: 'Prisma ORMを完全解説。スキーマ定義・マイグレーション管理・型安全クエリ・リレーション・トランザクション・接続プール・本番最適化をTypeScriptコード付きで網羅。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['Prisma', 'ORM', 'TypeScript', 'PostgreSQL', 'データベース']
---

現代のNode.js/TypeScript開発において、データベースアクセス層の設計はアプリケーションの品質を左右する重要な要素だ。Prisma ORMは、型安全性・開発体験・本番パフォーマンスを高次元で両立する次世代ORMとして、急速に普及している。

本記事では、Prismaの基本セットアップから本番運用まで、TypeScriptコード例を交えながら体系的に解説する。

---

## 1. Prismaとは — TypeORM・Drizzle ORMとの比較

### Prismaの基本思想

Prismaは「スキーマファースト」のORMだ。`schema.prisma`という単一ファイルにデータモデルを定義し、そこから型安全なクライアントコード・マイグレーションファイルを自動生成する。

```
開発フロー:
schema.prisma → prisma generate → Prisma Client（型安全）
schema.prisma → prisma migrate → SQLマイグレーション
```

この設計思想により、「スキーマがソースオブトゥルース」となり、TypeScriptの型定義と実際のDB構造が常に一致した状態を保てる。

### 主要ORM比較

| 特徴 | Prisma | TypeORM | Drizzle ORM |
|------|--------|---------|-------------|
| 型安全性 | 最高（自動生成） | 中（デコレータ） | 高（スキーマ定義） |
| 学習コスト | 低〜中 | 高 | 低〜中 |
| スキーマ定義 | 独自DSL | TypeScript Class | TypeScript Object |
| マイグレーション | 自動管理 | 自動/手動 | 手動 |
| クエリビルダー | Fluent API | QueryBuilder | SQL-like |
| バンドルサイズ | 大（生成コード） | 中 | 小 |
| 本番実績 | 豊富 | 豊富 | 新興 |
| エコシステム | 活発 | 活発 | 成長中 |

**Prismaを選ぶべきケース:**
- TypeScriptプロジェクトで型安全性を最優先する
- チーム開発でスキーマを中心に設計したい
- マイグレーション管理を自動化したい
- Prisma Studio（GUIツール）を活用したい

**TypeORMが適するケース:**
- Active Recordパターンに慣れている
- 複雑なクエリを細かく制御したい
- Javaバックグラウンドからの移行

**Drizzle ORMが適するケース:**
- バンドルサイズを最小化したい
- Edge環境（Cloudflare Workers等）で動作させる
- SQLに近い表現でクエリを書きたい

---

## 2. セットアップ

### インストール

```bash
# 新規プロジェクト
mkdir my-app && cd my-app
npm init -y
npm install typescript ts-node @types/node --save-dev
npx tsc --init

# Prismaインストール
npm install prisma --save-dev
npm install @prisma/client

# Prisma初期化（PostgreSQLの場合）
npx prisma init --datasource-provider postgresql
```

`npx prisma init`実行後、以下のファイルが生成される:

```
prisma/
  schema.prisma    ← スキーマ定義ファイル
.env               ← DATABASE_URL等の環境変数
```

### データベース接続設定

`.env`ファイルに接続文字列を設定する:

```env
# PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/mydb?schema=public"

# MySQL
DATABASE_URL="mysql://username:password@localhost:3306/mydb"

# SQLite（開発用）
DATABASE_URL="file:./dev.db"

# MongoDB
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/mydb"
```

本番環境では環境変数を適切に管理し、接続文字列をコードにハードコードしないこと。

### TypeScript設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 3. スキーマ定義

### schema.prismaの基本構造

```prisma
// prisma/schema.prisma

// データソース設定
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// クライアント生成設定
generator client {
  provider = "prisma-client-js"
}

// モデル定義
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 主要アトリビュート

#### @id — プライマリキー

```prisma
model User {
  // 自動インクリメント整数ID
  id Int @id @default(autoincrement())

  // UUID（分散システムに最適）
  id String @id @default(uuid())

  // CUID（ソート可能なID）
  id String @id @default(cuid())
}
```

#### @unique — ユニーク制約

```prisma
model User {
  id       Int    @id @default(autoincrement())
  email    String @unique
  username String @unique

  // 複合ユニーク制約
  @@unique([firstName, lastName])
}
```

#### @default — デフォルト値

```prisma
model Post {
  id          Int      @id @default(autoincrement())
  title       String
  published   Boolean  @default(false)
  viewCount   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  slug        String   @default("")
}
```

#### @index — インデックス

```prisma
model Post {
  id        Int    @id @default(autoincrement())
  title     String
  authorId  Int
  status    String

  // 単一インデックス
  @@index([authorId])

  // 複合インデックス
  @@index([status, createdAt])
}
```

#### @map — テーブル名・カラム名マッピング

```prisma
model User {
  id        Int    @id @default(autoincrement())
  firstName String @map("first_name")  // DBカラム名: first_name
  lastName  String @map("last_name")

  @@map("users")  // DBテーブル名: users
}
```

---

## 4. データ型

### スカラー型一覧

```prisma
model DataTypes {
  id          Int      @id @default(autoincrement())

  // 文字列
  name        String           // VARCHAR / TEXT
  description String?          // NULL許可
  bio         String   @db.Text  // DBネイティブTEXT型

  // 数値
  age         Int              // INTEGER
  score       Float            // FLOAT / DOUBLE
  price       Decimal          // DECIMAL（金融計算に必須）
  bigNumber   BigInt           // BIGINT

  // 論理値
  isActive    Boolean          // BOOLEAN

  // 日時
  createdAt   DateTime         // TIMESTAMP
  birthDate   DateTime @db.Date  // DATE型のみ

  // JSON（PostgreSQL/MySQL対応）
  metadata    Json             // JSONB / JSON

  // バイナリ
  avatar      Bytes            // BYTEA / BLOB

  // 列挙型
  role        Role             // ENUM
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

### Decimal型の重要性

金融・決済システムでは`Float`ではなく`Decimal`を使うべきだ:

```typescript
import { Prisma } from '@prisma/client'

// 正しい: Decimal型で精度を保証
const product = await prisma.product.create({
  data: {
    name: 'Premium Plan',
    price: new Prisma.Decimal('9.99'),  // 文字列から初期化
    tax: new Prisma.Decimal('0.10'),
  }
})

// 誤り: Float型は浮動小数点誤差が発生する
// price: 9.99  → 実際: 9.990000000000001
```

### Json型の活用

```typescript
// スキーマ定義
model Product {
  id          Int   @id @default(autoincrement())
  name        String
  metadata    Json  // 動的な属性を格納
  settings    Json  @default("{}")
}

// 型定義（Prisma側は自動生成なし）
interface ProductMetadata {
  color?: string
  size?: string[]
  specifications?: Record<string, string>
}

// 作成
const product = await prisma.product.create({
  data: {
    name: 'T-Shirt',
    metadata: {
      color: 'blue',
      size: ['S', 'M', 'L', 'XL'],
      specifications: {
        material: 'cotton',
        weight: '200g'
      }
    } satisfies ProductMetadata,
  }
})

// JSON内のフィールドでフィルタリング
const blueProducts = await prisma.product.findMany({
  where: {
    metadata: {
      path: ['color'],
      equals: 'blue'
    }
  }
})
```

---

## 5. リレーション

### 1対1リレーション

```prisma
model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique
  profile Profile?  // オプショナル1対1
}

model Profile {
  id        Int    @id @default(autoincrement())
  bio       String?
  avatarUrl String?
  userId    Int    @unique  // 外部キー（@uniqueで1対1を保証）
  user      User   @relation(fields: [userId], references: [id])
}
```

```typescript
// ユーザーとプロフィールを同時作成
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    profile: {
      create: {
        bio: 'Full-stack developer',
        avatarUrl: 'https://example.com/avatar.jpg'
      }
    }
  },
  include: {
    profile: true
  }
})
```

### 1対多リレーション

```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[] // ユーザーは複数の投稿を持つ
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  comments  Comment[]
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String
  postId    Int
  post      Post     @relation(fields: [postId], references: [id])
}
```

```typescript
// 1対多: ユーザーの全投稿を取得
const userWithPosts = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }
  }
})

// 1対多: 投稿とそのコメントを取得
const postWithComments = await prisma.post.findUnique({
  where: { id: 1 },
  include: {
    author: true,
    comments: {
      include: {
        author: true
      }
    }
  }
})
```

### 多対多リレーション

```prisma
// 暗黙的多対多（Prismaが中間テーブルを自動管理）
model Post {
  id   Int    @id @default(autoincrement())
  tags Tag[]
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
}

// 明示的多対多（中間テーブルに追加フィールドが必要な場合）
model Post {
  id         Int               @id @default(autoincrement())
  categories CategoriesOnPosts[]
}

model Category {
  id    Int               @id @default(autoincrement())
  name  String
  posts CategoriesOnPosts[]
}

model CategoriesOnPosts {
  postId     Int
  categoryId Int
  assignedAt DateTime @default(now())
  assignedBy String

  post     Post     @relation(fields: [postId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@id([postId, categoryId])  // 複合プライマリキー
}
```

```typescript
// 暗黙的多対多: タグを接続
const post = await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      connect: [
        { id: 1 },
        { id: 2 },
      ],
      // または新規作成
      create: [
        { name: 'TypeScript' },
        { name: 'Prisma' },
      ]
    }
  },
  include: { tags: true }
})

// 明示的多対多: 中間テーブルに追加情報を含めて作成
const assignment = await prisma.categoriesOnPosts.create({
  data: {
    postId: 1,
    categoryId: 2,
    assignedAt: new Date(),
    assignedBy: 'admin@example.com'
  }
})
```

### 自己参照リレーション

```prisma
model Category {
  id       Int        @id @default(autoincrement())
  name     String
  parentId Int?
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
}

model Employee {
  id         Int        @id @default(autoincrement())
  name       String
  managerId  Int?
  manager    Employee?  @relation("Management", fields: [managerId], references: [id])
  reports    Employee[] @relation("Management")
}
```

---

## 6. マイグレーション

### prisma migrate dev（開発環境）

```bash
# マイグレーションを作成して適用
npx prisma migrate dev --name init

# マイグレーション名を指定（スキーマ変更後）
npx prisma migrate dev --name add_user_profile

# ドライラン（SQLを確認するだけ）
npx prisma migrate dev --create-only
```

生成されるディレクトリ構造:

```
prisma/
  migrations/
    20260101000000_init/
      migration.sql
    20260115000000_add_user_profile/
      migration.sql
  schema.prisma
```

生成される`migration.sql`の例:

```sql
-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
```

### prisma migrate deploy（本番環境）

```bash
# 本番環境へのデプロイ（未適用のマイグレーションを全て実行）
npx prisma migrate deploy
```

`migrate deploy`は`migrate dev`と異なり:
- インタラクティブなプロンプトを表示しない
- シャドウデータベースを使用しない
- CI/CDパイプラインに適している

### prisma migrate reset

```bash
# データベースをリセット（全データ削除 + マイグレーション再実行）
npx prisma migrate reset

# シードも実行
npx prisma migrate reset --skip-seed
```

**警告:** `migrate reset`は全データを削除する。本番環境では絶対に実行しないこと。

### マイグレーション状態の確認

```bash
# マイグレーション状態を確認
npx prisma migrate status
```

出力例:

```
3 migrations found in prisma/migrations

Database schema is up to date!

The following migration(s) were applied:

  2026-01-01_init (applied)
  2026-01-15_add_profile (applied)
  2026-02-01_add_posts (applied)
```

### カスタムマイグレーションSQL

自動生成のSQLに加えてカスタムSQLを実行する場合:

```sql
-- prisma/migrations/20260201_add_posts/migration.sql
-- Prismaが生成したSQL（自動）
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    ...
);

-- カスタム追加SQL（手動で追記）
-- フルテキスト検索インデックスを追加
CREATE INDEX "posts_title_search_idx" ON "posts" USING GIN (to_tsvector('japanese', "title"));

-- 既存データの変換
UPDATE "posts" SET "slug" = lower(regexp_replace("title", '\s+', '-', 'g'));
```

---

## 7. Prisma Client — CRUD操作

### クライアントの初期化

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// シングルトンパターン（開発環境でのホットリロード対策）
declare global {
  var prisma: PrismaClient | undefined
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}
```

### Create（作成）

```typescript
import { prisma } from './lib/prisma'

// 単一レコード作成
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    name: 'Alice',
  }
})
console.log(user.id, user.email)  // 型安全: User型が推論される

// ネストした作成（リレーション含む）
const userWithProfile = await prisma.user.create({
  data: {
    email: 'bob@example.com',
    name: 'Bob',
    profile: {
      create: {
        bio: 'Backend Engineer',
      }
    },
    posts: {
      create: [
        { title: 'First Post', published: true },
        { title: 'Draft Post', published: false },
      ]
    }
  },
  include: {
    profile: true,
    posts: true,
  }
})

// バルク作成
const users = await prisma.user.createMany({
  data: [
    { email: 'carol@example.com', name: 'Carol' },
    { email: 'dave@example.com', name: 'Dave' },
    { email: 'eve@example.com', name: 'Eve' },
  ],
  skipDuplicates: true,  // 重複をスキップ
})
console.log(`${users.count}件作成`)
```

### Read（読み取り）

```typescript
// IDで単一レコード取得（存在しない場合はnull）
const user = await prisma.user.findUnique({
  where: { id: 1 }
})

// 存在しない場合は例外をスロー
const userOrThrow = await prisma.user.findUniqueOrThrow({
  where: { id: 999 }
})

// 全件取得
const allUsers = await prisma.user.findMany()

// 条件付き取得
const activeUsers = await prisma.user.findMany({
  where: {
    isActive: true,
    createdAt: {
      gte: new Date('2026-01-01')
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: 0,
})

// 最初の1件
const firstUser = await prisma.user.findFirst({
  where: { role: 'ADMIN' },
  orderBy: { createdAt: 'asc' }
})
```

### Update（更新）

```typescript
// 単一レコード更新
const updatedUser = await prisma.user.update({
  where: { id: 1 },
  data: {
    name: 'Alice Updated',
    updatedAt: new Date(),
  }
})

// インクリメント/デクリメント
const post = await prisma.post.update({
  where: { id: 1 },
  data: {
    viewCount: { increment: 1 },  // +1
    likeCount: { decrement: 1 },  // -1
    score: { multiply: 1.1 },     // x1.1
  }
})

// Upsert（存在すれば更新、なければ作成）
const upserted = await prisma.user.upsert({
  where: { email: 'alice@example.com' },
  update: { name: 'Alice v2' },
  create: {
    email: 'alice@example.com',
    name: 'Alice v2',
  }
})

// バルク更新
const result = await prisma.post.updateMany({
  where: { authorId: 1, published: false },
  data: { published: true }
})
console.log(`${result.count}件更新`)
```

### Delete（削除）

```typescript
// 単一レコード削除
const deleted = await prisma.user.delete({
  where: { id: 1 }
})

// バルク削除
const deletedPosts = await prisma.post.deleteMany({
  where: {
    createdAt: {
      lt: new Date('2025-01-01')
    }
  }
})
console.log(`${deletedPosts.count}件削除`)
```

---

## 8. 高度なクエリ

### where句の詳細

```typescript
// 比較演算子
const users = await prisma.user.findMany({
  where: {
    age: {
      gte: 18,    // >=
      lte: 65,    // <=
      gt: 20,     // >
      lt: 60,     // <
      not: 30,    // !=
    }
  }
})

// 文字列フィルタ
const posts = await prisma.post.findMany({
  where: {
    title: {
      contains: 'Prisma',       // LIKE '%Prisma%'
      startsWith: 'How to',     // LIKE 'How to%'
      endsWith: 'Guide',        // LIKE '%Guide'
      mode: 'insensitive',      // 大文字小文字無視
    }
  }
})

// IN句
const specificUsers = await prisma.user.findMany({
  where: {
    id: { in: [1, 2, 3, 4, 5] }
  }
})

// 論理演算子（AND/OR/NOT）
const filteredPosts = await prisma.post.findMany({
  where: {
    AND: [
      { published: true },
      { createdAt: { gte: new Date('2026-01-01') } },
    ],
    OR: [
      { title: { contains: 'TypeScript' } },
      { title: { contains: 'JavaScript' } },
    ],
    NOT: {
      authorId: 999
    }
  }
})

// リレーション越しのフィルタ
const usersWithPosts = await prisma.user.findMany({
  where: {
    posts: {
      some: {  // 少なくとも1つのポストが条件を満たす
        published: true,
      }
    }
  }
})

const usersAllPublished = await prisma.user.findMany({
  where: {
    posts: {
      every: {  // 全てのポストが条件を満たす
        published: true,
      }
    }
  }
})

const usersNoPost = await prisma.user.findMany({
  where: {
    posts: {
      none: {}  // ポストがない
    }
  }
})
```

### select — 返すフィールドを指定

```typescript
// 特定フィールドのみ取得
const userNames = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    // password: false (デフォルト)
  }
})
// 型: { id: number; email: string; name: string | null }[]

// ネストしたselectで必要なフィールドのみ取得
const postsWithAuthorName = await prisma.post.findMany({
  select: {
    id: true,
    title: true,
    author: {
      select: {
        id: true,
        name: true,
        // emailを返さない（セキュリティ）
      }
    },
    _count: {
      select: { comments: true }  // コメント数のみ
    }
  }
})
```

### include — リレーションを含める

```typescript
// 関連モデルを含めて取得
const post = await prisma.post.findUnique({
  where: { id: 1 },
  include: {
    author: true,            // User全フィールド
    comments: {
      include: {
        author: {            // コメントの著者も含める
          select: { name: true }
        }
      },
      where: { approved: true },
      orderBy: { createdAt: 'asc' },
      take: 5,
    },
    tags: true,
    _count: {
      select: { comments: true, likes: true }
    }
  }
})
```

### orderBy — ソート

```typescript
// 単一フィールドソート
const posts = await prisma.post.findMany({
  orderBy: { createdAt: 'desc' }
})

// 複数フィールドソート
const users = await prisma.user.findMany({
  orderBy: [
    { role: 'asc' },
    { name: 'asc' },
    { createdAt: 'desc' },
  ]
})

// リレーション越しのソート
const postsByAuthorName = await prisma.post.findMany({
  orderBy: {
    author: { name: 'asc' }
  }
})

// _count（件数）でソート
const popularPosts = await prisma.post.findMany({
  orderBy: {
    comments: { _count: 'desc' }
  }
})
```

### ページネーション

```typescript
// オフセットページネーション
async function getPostsPaginated(page: number, perPage: number = 20) {
  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.count()
  ])

  return {
    data: posts,
    pagination: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    }
  }
}

// カーソルベースページネーション（大規模データに最適）
async function getPostsCursor(cursor?: number, take: number = 20) {
  const posts = await prisma.post.findMany({
    take,
    skip: cursor ? 1 : 0,  // カーソルの次から取得
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { id: 'asc' },
  })

  const nextCursor = posts.length === take
    ? posts[posts.length - 1].id
    : undefined

  return { posts, nextCursor }
}
```

---

## 9. トランザクション

### $transaction — 基本的な使い方

```typescript
// 複数操作をアトミックに実行
const [debitAccount, creditAccount] = await prisma.$transaction([
  prisma.account.update({
    where: { id: 1 },
    data: { balance: { decrement: 1000 } }
  }),
  prisma.account.update({
    where: { id: 2 },
    data: { balance: { increment: 1000 } }
  }),
])
// 両方成功 or 両方ロールバック
```

### インタラクティブトランザクション

```typescript
// 複雑な条件分岐が必要な場合
const result = await prisma.$transaction(async (tx) => {
  // 残高確認
  const sourceAccount = await tx.account.findUniqueOrThrow({
    where: { id: 1 }
  })

  if (sourceAccount.balance < 1000) {
    throw new Error('残高不足')  // これでロールバック
  }

  // 転送実行
  const debit = await tx.account.update({
    where: { id: 1 },
    data: { balance: { decrement: 1000 } }
  })

  const credit = await tx.account.update({
    where: { id: 2 },
    data: { balance: { increment: 1000 } }
  })

  // 取引履歴を記録
  const transaction = await tx.transactionLog.create({
    data: {
      fromAccountId: 1,
      toAccountId: 2,
      amount: 1000,
      status: 'COMPLETED',
    }
  })

  return { debit, credit, transaction }
})
```

### トランザクションオプション

```typescript
// タイムアウトと分離レベルの設定
const result = await prisma.$transaction(
  async (tx) => {
    // トランザクション内の操作
    const order = await tx.order.create({
      data: { userId: 1, total: 5000 }
    })

    await tx.inventory.update({
      where: { productId: order.productId },
      data: { quantity: { decrement: 1 } }
    })

    return order
  },
  {
    maxWait: 5000,      // 接続待機最大時間(ms)
    timeout: 10000,     // トランザクション最大実行時間(ms)
    isolationLevel: 'Serializable',  // 分離レベル
  }
)
```

### Nested writes（ネストした書き込み）

```typescript
// ネストした作成・接続・切断
const post = await prisma.post.create({
  data: {
    title: '新しい記事',
    author: {
      connect: { id: 1 }  // 既存ユーザーに接続
    },
    tags: {
      connectOrCreate: [  // 存在すれば接続、なければ作成
        {
          where: { name: 'TypeScript' },
          create: { name: 'TypeScript' }
        },
        {
          where: { name: 'Prisma' },
          create: { name: 'Prisma' }
        }
      ]
    },
    categories: {
      create: [
        { name: '技術' }  // 新規カテゴリ作成
      ]
    }
  }
})

// ネストした更新
const updatedPost = await prisma.post.update({
  where: { id: 1 },
  data: {
    title: '更新された記事',
    tags: {
      disconnect: [{ id: 3 }],  // タグを切断
      connect: [{ id: 5 }],     // タグを接続
    }
  }
})
```

---

## 10. 集計クエリ

### count・sum・avg・min・max

```typescript
// レコード数カウント
const totalPosts = await prisma.post.count()
const publishedCount = await prisma.post.count({
  where: { published: true }
})

// 集計関数
const stats = await prisma.order.aggregate({
  where: {
    status: 'COMPLETED',
    createdAt: {
      gte: new Date('2026-01-01'),
      lt: new Date('2026-02-01'),
    }
  },
  _count: {
    _all: true,       // 全件数
    userId: true,     // userId非NULLの件数
  },
  _sum: {
    amount: true,     // 合計金額
  },
  _avg: {
    amount: true,     // 平均金額
  },
  _min: {
    amount: true,     // 最小金額
    createdAt: true,  // 最古の日時
  },
  _max: {
    amount: true,     // 最大金額
    createdAt: true,  // 最新の日時
  }
})

console.log('月次売上統計:')
console.log('件数:', stats._count._all)
console.log('合計:', stats._sum.amount)
console.log('平均:', stats._avg.amount)
```

### groupBy — グループ集計

```typescript
// カテゴリ別投稿数
const postsByCategory = await prisma.post.groupBy({
  by: ['categoryId', 'published'],
  where: {
    createdAt: { gte: new Date('2026-01-01') }
  },
  _count: {
    _all: true
  },
  _sum: {
    viewCount: true
  },
  having: {
    _count: {
      _all: { gt: 5 }  // 5件以上のグループのみ
    }
  },
  orderBy: {
    _count: {
      _all: 'desc'
    }
  }
})

// 月別売上集計
const monthlySales = await prisma.order.groupBy({
  by: ['month'],  // 計算フィールドはRaw Queryが必要
  _sum: { amount: true },
  _count: { _all: true },
})
```

---

## 11. Raw Queries

### $queryRaw — SELECT文

```typescript
import { Prisma } from '@prisma/client'

// テンプレートリテラル（SQLインジェクション対策済み）
const userId = 1
const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM users
  WHERE id = ${userId}
  AND is_active = true
`

// 複雑な集計（ORMでは表現しにくいクエリ）
const monthlySales = await prisma.$queryRaw<
  Array<{ month: string; total: number; count: number }>
>`
  SELECT
    TO_CHAR(created_at, 'YYYY-MM') AS month,
    SUM(amount) AS total,
    COUNT(*) AS count
  FROM orders
  WHERE status = 'COMPLETED'
    AND created_at >= NOW() - INTERVAL '12 months'
  GROUP BY TO_CHAR(created_at, 'YYYY-MM')
  ORDER BY month DESC
`

// Prisma.sqlを使った動的クエリ構築
async function searchUsers(name?: string, role?: string) {
  let query = Prisma.sql`SELECT * FROM users WHERE 1=1`

  if (name) {
    query = Prisma.sql`${query} AND name ILIKE ${'%' + name + '%'}`
  }
  if (role) {
    query = Prisma.sql`${query} AND role = ${role}`
  }

  return prisma.$queryRaw(query)
}
```

### $executeRaw — INSERT/UPDATE/DELETE文

```typescript
// バルク更新（複雑なロジック）
const affectedRows = await prisma.$executeRaw`
  UPDATE posts
  SET
    slug = lower(regexp_replace(title, '\s+', '-', 'g')),
    updated_at = NOW()
  WHERE slug IS NULL OR slug = ''
`
console.log(`${affectedRows}件のslugを更新`)

// カスタムインデックス操作
await prisma.$executeRaw`
  CREATE INDEX CONCURRENTLY IF NOT EXISTS
  posts_fulltext_idx ON posts
  USING GIN (to_tsvector('japanese', title || ' ' || coalesce(content, '')))
`
```

**注意:** `$queryRaw`と`$executeRaw`はテンプレートリテラルを使うこと。文字列連結によるSQLは`Prisma.raw()`でラップしなければSQLインジェクションの危険がある。

---

## 12. 接続プール設定

### 接続URLパラメータ

```env
# PostgreSQL接続プール設定
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=10"
```

| パラメータ | デフォルト | 説明 |
|------------|-----------|------|
| `connection_limit` | CPU数×2+1 | 接続プールの最大接続数 |
| `pool_timeout` | 10秒 | 接続待機タイムアウト |
| `connect_timeout` | 5秒 | DB接続タイムアウト |
| `socket_timeout` | 設定なし | ソケットタイムアウト |

### PrismaClientの設定

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    // ログ設定
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
    // エラーフォーマット
    errorFormat: 'pretty',
    // データソース設定（URLを上書き可能）
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

const prisma = prismaClientSingleton()

// クエリログをメトリクス収集に活用
prisma.$on('query', (event) => {
  if (event.duration > 1000) {
    console.warn(`Slow query (${event.duration}ms):`, event.query)
  }
})

prisma.$on('error', (event) => {
  console.error('Prisma error:', event.message)
})

export { prisma }
```

### サーバーレス環境での接続プール

Next.js等のサーバーレス環境では接続数の管理が重要だ:

```typescript
// Vercel/Netlify等サーバーレス環境
// Prisma Accelerate（接続プーキング as a Service）を使う
// DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."

// または Supabase Connection Pooler (PgBouncer)
// DATABASE_URL="postgresql://...@db.xxx.supabase.co:6543/postgres?pgbouncer=true"

// サーバーレスでの推奨設定
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connection_limit=1',
    }
  }
})
```

---

## 13. 本番運用

### prisma migrate deploy — CI/CDへの組み込み

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Deploy application
        run: npm run build && npm start
```

### シード（初期データ投入）

```typescript
// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('シード開始...')

  // 管理者ユーザー作成
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'System Admin',
      role: Role.ADMIN,
      password: await bcrypt.hash('admin123', 12),
    }
  })

  // カテゴリ作成
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'technology' },
      update: {},
      create: { name: 'テクノロジー', slug: 'technology' }
    }),
    prisma.category.upsert({
      where: { slug: 'business' },
      update: {},
      create: { name: 'ビジネス', slug: 'business' }
    }),
  ])

  // サンプル投稿
  await prisma.post.createMany({
    data: [
      {
        title: 'Prisma ORMの基本',
        slug: 'prisma-orm-basics',
        published: true,
        authorId: admin.id,
        categoryId: categories[0].id,
      },
      {
        title: 'TypeScriptベストプラクティス',
        slug: 'typescript-best-practices',
        published: true,
        authorId: admin.id,
        categoryId: categories[0].id,
      },
    ],
    skipDuplicates: true,
  })

  console.log('シード完了')
  console.log('作成:', { admin, categories: categories.length })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

`package.json`にシードスクリプトを登録:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  },
  "scripts": {
    "db:seed": "npx prisma db seed",
    "db:reset": "npx prisma migrate reset",
    "db:studio": "npx prisma studio"
  }
}
```

### ステージング環境の管理

```bash
# ステージング環境専用の.envファイル
# .env.staging
DATABASE_URL="postgresql://user:pass@staging-host:5432/myapp_staging"
```

```typescript
// prisma/schema.prisma（マルチDB対応）
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // shadowDatabaseUrl: マイグレーション生成時に使用
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

```bash
# ステージングへのマイグレーション適用
DATABASE_URL="..." npx prisma migrate deploy

# ステージングでシード実行
DATABASE_URL="..." npx prisma db seed
```

### Prisma Studio（開発用GUI）

```bash
# ブラウザでデータ確認・編集
npx prisma studio
# → http://localhost:5555 が開く
```

Prisma Studioは開発・デバッグ時に非常に便利だが、本番環境データへのアクセスには使わないこと。

### ヘルスチェックとモニタリング

```typescript
// src/lib/health.ts
import { prisma } from './prisma'

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// APIルートでヘルスチェック
// app/api/health/route.ts
import { checkDatabaseHealth } from '@/lib/health'

export async function GET() {
  const dbHealthy = await checkDatabaseHealth()

  return Response.json({
    status: dbHealthy ? 'ok' : 'error',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  }, {
    status: dbHealthy ? 200 : 503
  })
}
```

### グレースフルシャットダウン

```typescript
// src/index.ts
import { prisma } from './lib/prisma'

process.on('SIGINT', async () => {
  console.log('シャットダウン中...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
```

---

## まとめ

Prismaは現代のTypeScript開発における最も洗練されたORMの一つだ。主な強みを整理すると:

**型安全性の徹底:**
スキーマから自動生成されるPrisma Clientは、クエリ結果の型を正確に推論する。`include`や`select`の組み合わせによって返る型が変わり、TypeScriptコンパイラがランタイムエラーを事前に検出できる。

**開発体験の優位性:**
`prisma migrate dev`による自動マイグレーション生成、Prisma StudioによるGUI、詳細なエラーメッセージが開発サイクルを高速化する。

**本番環境の信頼性:**
`prisma migrate deploy`を使ったCI/CDへの統合、接続プール管理、インタラクティブトランザクションにより、本番環境での安定稼働を実現できる。

**注意すべき点:**
- N+1問題: `include`を適切に使い、ループ内でクエリを実行しないこと
- バンドルサイズ: Prisma Clientは生成コードが大きいため、Edge環境ではPrisma Accelerateの利用を検討する
- マイグレーション管理: `prisma/migrations`ディレクトリはgit管理下に置き、チーム全員が同じ状態を保つ

---

## DevToolBoxでJSON/スキーマ検証を効率化

Prismaの`Json`型フィールドを扱う際、JSONデータのバリデーションや構造確認が頻繁に発生する。開発中にJSONを素早く検証・フォーマットしたいなら、**[DevToolBox](https://usedevtools.com/)** が便利だ。

DevToolBoxはブラウザ上で動作する開発者向けツールセットで、JSONフォーマッター・バリデーター・差分チェックなど、日常的な開発タスクをワンストップで処理できる。Prismaの`metadata`フィールドや`settings`フィールドに格納するJSONデータを事前に検証しておくことで、本番環境でのデータ整合性エラーを防げる。

インストール不要でブラウザから即使えるため、開発チームでの共有にも最適だ。

---

## 参考リンク

- [Prisma公式ドキュメント](https://www.prisma.io/docs)
- [Prisma GitHub](https://github.com/prisma/prisma)
- [Prisma Accelerate（接続プーリング）](https://www.prisma.io/accelerate)
- [Prisma Studio](https://www.prisma.io/studio)
