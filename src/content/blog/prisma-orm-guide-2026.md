---
title: "Prisma ORM完全ガイド2026 — TypeScript最強のORM"
description: "Prisma ORMでタイプセーフなデータベース操作。スキーマ定義、マイグレーション、CRUD、リレーション、Next.js App Router統合まで実践的なTypeScriptコード例付きで解説します。"
pubDate: "2026-02-05"
tags: ["Prisma", "ORM", "TypeScript", "データベース", "Next.js"]
heroImage: '../../assets/thumbnails/prisma-orm-guide-2026.jpg'
---
Prismaは、TypeScriptとNode.jsのための次世代ORMです。型安全、直感的なAPI、優れた開発者体験により、多くのプロジェクトで採用されています。本記事では、Prismaの基礎から実践的な活用法まで解説します。

## Prismaとは

PrismaはTypeScriptファーストのORMで、以下の特徴があります。

### 主な特徴

- **型安全**: スキーマから自動生成されるTypeScriptの型
- **直感的なAPI**: SQLを書かずにデータベース操作
- **Prisma Studio**: データベースのGUIツール
- **マイグレーション**: スキーマ変更を管理
- **複数DB対応**: PostgreSQL、MySQL、SQLite、SQL Server、MongoDB

### 従来のORMとの違い

**従来のORM（TypeORM、Sequelizeなど）**:
- デコレーター/クラスベース
- 実行時の型チェック
- 複雑な設定

**Prisma**:
- スキーマファイルで定義
- コンパイル時の型チェック
- シンプルな設定
- 自動生成されるクライアント

## セットアップ

### インストール

```bash
npm install prisma --save-dev
npm install @prisma/client
```

### 初期化

```bash
npx prisma init
```

これで以下のファイルが作成されます:

```
.
├── prisma/
│   └── schema.prisma
└── .env
```

`.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
```

## Prismaスキーマ定義

`prisma/schema.prisma`:

```prisma
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
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
  profile   Profile?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}

model Profile {
  id     String  @id @default(cuid())
  bio    String?
  avatar String?
  userId String  @unique
  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Post {
  id        String     @id @default(cuid())
  title     String
  content   String?
  published Boolean    @default(false)
  authorId  String
  author    User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  tags      Tag[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@index([authorId])
  @@index([published])
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  posts Post[]
}

enum Role {
  USER
  ADMIN
}
```

### スキーマの主要要素

**フィールド型**:
```prisma
model Example {
  // 基本型
  string    String
  int       Int
  float     Float
  boolean   Boolean
  dateTime  DateTime
  json      Json
  bytes     Bytes

  // オプショナル
  optional  String?

  // 配列
  tags      String[]

  // リレーション
  posts     Post[]
}
```

**フィールド属性**:
```prisma
model User {
  id    String @id @default(uuid())  // プライマリキー
  email String @unique               // ユニーク制約
  name  String @db.VarChar(255)      // DB固有の型

  @@index([email])                   // インデックス
  @@unique([email, name])            // 複合ユニーク
}
```

**リレーション**:
```prisma
// 1対1
model User {
  id      String   @id
  profile Profile?
}

model Profile {
  id     String @id
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}

// 1対多
model User {
  id    String @id
  posts Post[]
}

model Post {
  id       String @id
  authorId String
  author   User   @relation(fields: [authorId], references: [id])
}

// 多対多
model Post {
  id   String @id
  tags Tag[]
}

model Tag {
  id    String @id
  posts Post[]
}

// 多対多（明示的な中間テーブル）
model Post {
  id       String     @id
  postTags PostTag[]
}

model Tag {
  id       String     @id
  postTags PostTag[]
}

model PostTag {
  postId String
  tagId  String
  post   Post   @relation(fields: [postId], references: [id])
  tag    Tag    @relation(fields: [tagId], references: [id])

  @@id([postId, tagId])
}
```

## マイグレーション

スキーマの変更をデータベースに反映します。

### 開発環境

```bash
# マイグレーションを作成・適用
npx prisma migrate dev --name init

# マイグレーション名の例:
# - init
# - add_user_role
# - create_posts_table
```

これで以下が実行されます:
1. マイグレーションファイル生成（`prisma/migrations/`）
2. データベースに適用
3. Prisma Clientの再生成

### 本番環境

```bash
# マイグレーションのみ適用（生成しない）
npx prisma migrate deploy
```

### その他のコマンド

```bash
# スキーマをDBと同期（開発のみ、マイグレーション履歴なし）
npx prisma db push

# DBからスキーマを生成（既存DBをPrismaに移行）
npx prisma db pull

# マイグレーション状態の確認
npx prisma migrate status

# マイグレーションのリセット（全データ削除！）
npx prisma migrate reset
```

## Prisma Client

自動生成されるタイプセーフなクライアントです。

### クライアントの生成

```bash
npx prisma generate
```

スキーマ変更後は必ず再生成してください。

### 基本的な使い方

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// アプリ終了時にクリーンアップ
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

シングルトンパターン（推奨）:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## CRUD操作

### Create（作成）

```typescript
// 単一レコード作成
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    name: 'Alice',
    role: 'USER',
  },
});

// リレーション付きで作成
const userWithProfile = await prisma.user.create({
  data: {
    email: 'bob@example.com',
    name: 'Bob',
    profile: {
      create: {
        bio: 'Hello, I am Bob',
      },
    },
    posts: {
      create: [
        { title: 'First Post', content: 'Hello World' },
        { title: 'Second Post', content: 'Learning Prisma' },
      ],
    },
  },
  include: {
    profile: true,
    posts: true,
  },
});

// 複数レコード作成
const users = await prisma.user.createMany({
  data: [
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' },
  ],
  skipDuplicates: true, // 重複を無視
});
```

### Read（読み取り）

```typescript
// 全件取得
const allUsers = await prisma.user.findMany();

// 条件付き取得
const users = await prisma.user.findMany({
  where: {
    email: {
      contains: '@example.com',
    },
    role: 'USER',
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 10, // LIMIT
  skip: 0,  // OFFSET
});

// 単一レコード取得
const user = await prisma.user.findUnique({
  where: { id: '123' },
  include: {
    posts: true,
    profile: true,
  },
});

// 最初のレコード
const firstUser = await prisma.user.findFirst({
  where: { role: 'ADMIN' },
});

// 存在チェック（findFirstより高速）
const exists = await prisma.user.findUnique({
  where: { email: 'test@example.com' },
  select: { id: true },
});

// カウント
const userCount = await prisma.user.count({
  where: { role: 'USER' },
});
```

### Update（更新）

```typescript
// 単一レコード更新
const updatedUser = await prisma.user.update({
  where: { id: '123' },
  data: {
    name: 'Alice Updated',
  },
});

// 複数レコード更新
const updated = await prisma.user.updateMany({
  where: {
    role: 'USER',
  },
  data: {
    role: 'ADMIN',
  },
});

// リレーション更新
const userWithNewPosts = await prisma.user.update({
  where: { id: '123' },
  data: {
    posts: {
      create: {
        title: 'New Post',
      },
      disconnect: {
        id: 'post-to-remove',
      },
    },
  },
});

// Upsert（存在すれば更新、なければ作成）
const user = await prisma.user.upsert({
  where: { email: 'alice@example.com' },
  update: {
    name: 'Alice Updated',
  },
  create: {
    email: 'alice@example.com',
    name: 'Alice',
  },
});
```

### Delete（削除）

```typescript
// 単一レコード削除
const deletedUser = await prisma.user.delete({
  where: { id: '123' },
});

// 複数レコード削除
const deleted = await prisma.user.deleteMany({
  where: {
    createdAt: {
      lt: new Date('2023-01-01'),
    },
  },
});

// 全件削除（危険！）
await prisma.user.deleteMany();
```

## 高度なクエリ

### フィルター

```typescript
// AND条件
const users = await prisma.user.findMany({
  where: {
    AND: [
      { role: 'USER' },
      { email: { contains: '@example.com' } },
    ],
  },
});

// OR条件
const users = await prisma.user.findMany({
  where: {
    OR: [
      { role: 'ADMIN' },
      { email: { endsWith: '@admin.com' } },
    ],
  },
});

// NOT条件
const users = await prisma.user.findMany({
  where: {
    NOT: {
      role: 'GUEST',
    },
  },
});

// リレーションフィルター
const users = await prisma.user.findMany({
  where: {
    posts: {
      some: {  // 1つでも条件に合う投稿がある
        published: true,
      },
    },
  },
});

const users = await prisma.user.findMany({
  where: {
    posts: {
      every: {  // すべての投稿が条件に合う
        published: true,
      },
    },
  },
});

const users = await prisma.user.findMany({
  where: {
    posts: {
      none: {  // 条件に合う投稿がない
        published: false,
      },
    },
  },
});
```

### Select と Include

```typescript
// Select: 特定フィールドのみ取得
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    posts: {
      select: {
        title: true,
      },
    },
  },
});

// Include: リレーションを含める
const users = await prisma.user.findMany({
  include: {
    posts: true,
    profile: true,
  },
});

// 組み合わせ
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    _count: {
      select: {
        posts: true,  // 投稿数をカウント
      },
    },
  },
});
```

### ページネーション

```typescript
// カーソルベース（推奨）
async function getPosts(cursor?: string, take = 10) {
  const posts = await prisma.post.findMany({
    take: take + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = posts.length > take;
  const items = hasMore ? posts.slice(0, -1) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { items, nextCursor, hasMore };
}

// オフセットベース
async function getPosts(page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize;

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.count(),
  ]);

  return {
    posts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

### 集計

```typescript
// グループ化と集計
const stats = await prisma.post.groupBy({
  by: ['authorId'],
  _count: {
    id: true,
  },
  _avg: {
    viewCount: true,
  },
  having: {
    id: {
      _count: {
        gt: 5,  // 5投稿以上のユーザーのみ
      },
    },
  },
});

// 集計のみ
const aggregates = await prisma.post.aggregate({
  _count: true,
  _avg: {
    viewCount: true,
  },
  _sum: {
    viewCount: true,
  },
  _min: {
    createdAt: true,
  },
  _max: {
    createdAt: true,
  },
});
```

## トランザクション

複数の操作をアトミックに実行します。

### インタラクティブトランザクション（推奨）

```typescript
const result = await prisma.$transaction(async (tx) => {
  // ユーザー作成
  const user = await tx.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
    },
  });

  // プロファイル作成
  const profile = await tx.profile.create({
    data: {
      userId: user.id,
      bio: 'Hello',
    },
  });

  // 投稿作成
  const post = await tx.post.create({
    data: {
      title: 'First Post',
      authorId: user.id,
    },
  });

  return { user, profile, post };
});

// エラーが発生すると全てロールバック
```

### バッチトランザクション

```typescript
const [user, posts] = await prisma.$transaction([
  prisma.user.create({ data: { email: 'test@example.com' } }),
  prisma.post.findMany({ where: { published: true } }),
]);
```

### タイムアウト設定

```typescript
await prisma.$transaction(
  async (tx) => {
    // 長時間の処理
  },
  {
    maxWait: 5000,  // 最大待機時間（ms）
    timeout: 10000, // タイムアウト（ms）
  }
);
```

## Next.js統合

Next.jsでPrismaを使う際のベストプラクティスです。

### API Routes

```typescript
// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const users = await prisma.user.findMany();
    return res.status(200).json(users);
  }

  if (req.method === 'POST') {
    const user = await prisma.user.create({
      data: req.body,
    });
    return res.status(201).json(user);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
```

### App Router（Server Components）

```typescript
// app/users/page.tsx
import { prisma } from '@/lib/prisma';

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: {
      posts: true,
    },
  });

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          <h2>{user.name}</h2>
          <p>{user.posts.length} posts</p>
        </div>
      ))}
    </div>
  );
}

// ISR
export const revalidate = 60; // 60秒ごとに再生成
```

### Server Actions

```typescript
// app/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  await prisma.post.create({
    data: {
      title,
      content,
      authorId: 'user-id',
    },
  });

  revalidatePath('/posts');
}
```

## Prisma Studio

データベースのGUIツールです。

```bash
npx prisma studio
```

ブラウザで `http://localhost:5555` が開き、データの閲覧・編集ができます。

## パフォーマンス最適化

### コネクションプール

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // コネクションプール設定（PostgreSQL）
  // DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"
});
```

### クエリ最適化

```typescript
// N+1問題を回避
const users = await prisma.user.findMany({
  include: {
    posts: true,  // 1クエリで取得
  },
});

// 不要なデータを取得しない
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
  },
});
```

### バッチ読み込み

```typescript
// 悪い例（N+1）
for (const userId of userIds) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
}

// 良い例
const users = await prisma.user.findMany({
  where: {
    id: { in: userIds },
  },
});
```

## まとめ

Prismaは型安全で生産性の高いORM開発を実現します。

**重要なポイント**:
- スキーマファーストで型安全な開発
- 直感的なAPIで複雑なクエリも簡単
- マイグレーションで安全なスキーマ管理
- トランザクションでデータの整合性を保証
- Next.jsとの親和性が高い

2026年現在、TypeScriptプロジェクトでのデータベース操作には、Prismaが最も推奨される選択肢です。本記事を参考に、効率的なデータベース開発を実践してください。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
