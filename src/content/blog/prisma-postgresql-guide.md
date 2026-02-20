---
title: 'Prisma + PostgreSQL 完全ガイド — 型安全なデータベース設計とNext.js統合'
description: 'PrismaとPostgreSQLを使った型安全なデータベース開発を徹底解説。スキーマ設計・マイグレーション・リレーション・トランザクション・パフォーマンス最適化、Next.js App Routerとの統合パターンまで実践コード付き。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['Prisma', 'PostgreSQL', 'データベース', 'Next.js', 'TypeScript']
---

PrismaはTypeScriptファーストのORM（Object-Relational Mapping）で、データベース操作を型安全に行えるのが最大の特徴です。本記事では、PostgreSQLとPrismaを使った実践的なデータベース設計から、Next.js App Routerとの統合パターンまでを解説します。

## Prismaのアーキテクチャ

Prismaは3つのコアコンポーネントで構成されています：

- **Prisma Client**: 自動生成される型安全クエリビルダー
- **Prisma Migrate**: スキーマ変更を管理するマイグレーションツール
- **Prisma Studio**: データ閲覧・編集のGUI（ブラウザベース）

---

## セットアップ

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

```env
# .env
DATABASE_URL="postgresql://username:password@localhost:5432/mydb?schema=public"
```

---

## スキーマ設計

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile   Profile?
  posts     Post[]
  comments  Comment[]

  @@index([email])
  @@map("users")
}

model Profile {
  id       String  @id @default(cuid())
  bio      String?
  avatarUrl String?
  userId   String  @unique
  user     User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model Post {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  content     String
  published   Boolean   @default(false)
  viewCount   Int       @default(0)
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  tags        Tag[]
  comments    Comment[]

  @@index([authorId])
  @@index([slug])
  @@index([published, publishedAt(sort: Desc)])
  @@map("posts")
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  posts Post[]

  @@map("tags")
}

model Comment {
  id        String   @id @default(cuid())
  content   String
  createdAt DateTime @default(now())

  authorId  String
  author    User   @relation(fields: [authorId], references: [id])
  postId    String
  post      Post   @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([postId])
  @@map("comments")
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

---

## マイグレーション

```bash
# 開発環境: スキーマ変更を適用（マイグレーションファイル生成）
npx prisma migrate dev --name add_post_view_count

# 本番環境: マイグレーション適用（ファイル生成なし）
npx prisma migrate deploy

# スキーマとDBの差分確認
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-url $DATABASE_URL
```

---

## Prisma Clientのシングルトンパターン

```ts
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

---

## CRUDクエリパターン

### 作成（Create）

```ts
// シングルレコード作成
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    name: 'Alice',
    profile: {
      create: {
        bio: 'フルスタックエンジニア',
      },
    },
  },
  include: {
    profile: true,
  },
})

// バルク作成
const users = await prisma.user.createMany({
  data: [
    { email: 'bob@example.com', name: 'Bob' },
    { email: 'carol@example.com', name: 'Carol' },
  ],
  skipDuplicates: true,
})
```

### 取得（Read）

```ts
// 単一レコード取得（見つからなければnull）
const user = await prisma.user.findUnique({
  where: { email: 'alice@example.com' },
  include: {
    profile: true,
    posts: {
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    },
    _count: { select: { posts: true } },
  },
})

// 複数レコード取得（ページネーション）
const [posts, total] = await prisma.$transaction([
  prisma.post.findMany({
    where: { published: true },
    include: {
      author: { select: { id: true, name: true } },
      tags: true,
      _count: { select: { comments: true } },
    },
    orderBy: { publishedAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  }),
  prisma.post.count({ where: { published: true } }),
])

// カーソルベースのページネーション（パフォーマンス優良）
const posts = await prisma.post.findMany({
  take: pageSize,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },
})
```

### 更新（Update）

```ts
// 単一更新
const updatedPost = await prisma.post.update({
  where: { id: postId },
  data: {
    title: '更新されたタイトル',
    viewCount: { increment: 1 }, // アトミックな増加
    tags: {
      set: [],                    // 既存のタグをクリア
      connectOrCreate: tags.map(tag => ({
        where: { name: tag },
        create: { name: tag },
      })),
    },
  },
})

// Upsert（存在すれば更新、なければ作成）
const profile = await prisma.profile.upsert({
  where: { userId },
  update: { bio: newBio },
  create: { userId, bio: newBio },
})
```

### 削除（Delete）

```ts
// 単一削除
await prisma.post.delete({ where: { id: postId } })

// 条件付きバルク削除
await prisma.post.deleteMany({
  where: {
    published: false,
    createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30日以上前
  },
})
```

---

## トランザクション

### インタラクティブトランザクション（複雑なロジック）

```ts
async function transferCredits(fromId: string, toId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    // 送金元の残高確認
    const from = await tx.user.findUnique({
      where: { id: fromId },
      select: { credits: true },
    })

    if (!from || from.credits < amount) {
      throw new Error('残高不足')
    }

    // アトミックに両方更新
    const [updatedFrom, updatedTo] = await Promise.all([
      tx.user.update({
        where: { id: fromId },
        data: { credits: { decrement: amount } },
      }),
      tx.user.update({
        where: { id: toId },
        data: { credits: { increment: amount } },
      }),
    ])

    // 取引履歴の記録
    await tx.creditTransfer.create({
      data: { fromId, toId, amount },
    })

    return { from: updatedFrom, to: updatedTo }
  }, {
    timeout: 10000, // 10秒タイムアウト
    isolationLevel: 'Serializable',
  })
}
```

---

## パフォーマンス最適化

### N+1問題の解決

```ts
// ❌ N+1: 投稿ごとにユーザーをクエリ
const posts = await prisma.post.findMany()
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } })
}

// ✅ includeで1回のJOINクエリ
const posts = await prisma.post.findMany({
  include: { author: { select: { id: true, name: true } } },
})
```

### selectで必要なフィールドのみ取得

```ts
// ❌ 全フィールドを取得（不要なデータも）
const users = await prisma.user.findMany()

// ✅ 必要なフィールドのみ
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    _count: { select: { posts: true } },
  },
})
```

### インデックス戦略

```prisma
model Post {
  // 複合インデックス（publishedかつpublishedAtでソートする検索に最適化）
  @@index([published, publishedAt(sort: Desc)])

  // テキスト検索インデックス
  @@index([title])
}
```

---

## Next.js App Routerとの統合

```tsx
// app/blog/page.tsx — サーバーコンポーネントでDB直接クエリ
import { prisma } from '@/lib/prisma'

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { page?: string; tag?: string }
}) {
  const page = Number(searchParams.page) || 1
  const pageSize = 10

  const where = {
    published: true,
    ...(searchParams.tag && {
      tags: { some: { name: searchParams.tag } },
    }),
  }

  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        author: { select: { name: true } },
        tags: { select: { name: true } },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.post.count({ where }),
  ])

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <Pagination page={page} total={total} pageSize={pageSize} />
    </div>
  )
}
```

```tsx
// app/actions/post.ts — Server Action
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

export async function publishPost(postId: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const post = await prisma.post.update({
    where: { id: postId, authorId: session.user.id },
    data: {
      published: true,
      publishedAt: new Date(),
    },
  })

  revalidatePath('/blog')
  revalidatePath(`/blog/${post.slug}`)
  return post
}
```

---

## まとめ

Prismaは型安全性・開発体験・パフォーマンスのバランスが優れており、Next.jsとの相性も抜群です。

重要なポイント：
1. **スキーマ駆動**: Prismaスキーマが唯一の信頼できる情報源
2. **selectで最適化**: 必要なフィールドのみ取得する習慣を
3. **トランザクションで整合性**: 複数テーブル更新は必ずトランザクション
4. **インデックス設計**: クエリパターンに合わせたインデックスを

*ハッシュ値の生成（パスワードハッシュ検証等）には[DevToolBoxのハッシュ生成ツール](https://usedevtools.com/hash-generator)も活用できます。MD5、SHA-256等を即座に計算できます。*
