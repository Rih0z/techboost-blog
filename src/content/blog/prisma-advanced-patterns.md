---
title: 'Prisma高度パターン集 — 最適化・マイグレーション・テスト戦略完全ガイド'
description: 'Prisma ORMの高度な使い方を徹底解説。N+1問題対策、クエリ最適化、トランザクション、マイグレーション戦略、テスト手法、本番運用のベストプラクティスまで完全網羅します。Prisma・Database・PostgreSQLに関する実践情報。'
pubDate: '2025-02-06'
tags: ['Prisma', 'Database', 'PostgreSQL', 'ORM', 'TypeScript']
---
Prisma ORMは、TypeScriptでデータベース操作を型安全に行える最強のツールです。2026年現在、Next.js、Remix、NestJSなど主要フレームワークで標準的に使われています。

この記事では、Prismaの基礎を超えた高度なパターン、最適化手法、マイグレーション戦略、テスト手法を実践的に解説します。

## Prisma基本セットアップ（復習）

### インストールと初期化

```bash
npm install prisma @prisma/client
npx prisma init
```

### スキーマ定義

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
  posts     Post[]
  profile   Profile?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String
  tags      Tag[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
  @@index([published])
}

model Profile {
  id       String @id @default(cuid())
  bio      String?
  avatar   String?
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId   String @unique
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  posts Post[]
}
```

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## クエリ最適化パターン

### N+1問題の解決

```typescript
// ❌ N+1問題（遅い）
const users = await prisma.user.findMany();

for (const user of users) {
  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
  });
  console.log(user.name, posts.length);
}
// → 1 + N回のクエリ（ユーザーが100人なら101回のクエリ）

// ✅ includeで解決（速い）
const users = await prisma.user.findMany({
  include: { posts: true },
});

users.forEach((user) => {
  console.log(user.name, user.posts.length);
});
// → 1回のクエリのみ
```

### selectで必要なフィールドのみ取得

```typescript
// ❌ すべてのフィールドを取得（遅い）
const users = await prisma.user.findMany();

// ✅ 必要なフィールドのみ取得（速い）
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});
```

### ネストしたincludeの最適化

```typescript
// 深くネストしたデータ取得
const posts = await prisma.post.findMany({
  include: {
    author: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    tags: {
      select: {
        id: true,
        name: true,
      },
    },
  },
  where: { published: true },
  orderBy: { createdAt: 'desc' },
  take: 10,
});
```

### カウントクエリの最適化

```typescript
// ❌ すべてのデータを取得してカウント（遅い）
const users = await prisma.user.findMany();
const count = users.length;

// ✅ countを使う（速い）
const count = await prisma.user.count();

// 条件付きカウント
const publishedCount = await prisma.post.count({
  where: { published: true },
});

// グループごとのカウント
const postCountByUser = await prisma.post.groupBy({
  by: ['authorId'],
  _count: {
    id: true,
  },
});
```

### バッチクエリでパフォーマンス向上

```typescript
// ❌ ループ内でクエリ（遅い）
const userIds = ['id1', 'id2', 'id3'];
for (const id of userIds) {
  await prisma.user.update({
    where: { id },
    data: { updatedAt: new Date() },
  });
}

// ✅ バッチ更新（速い）
await prisma.user.updateMany({
  where: {
    id: {
      in: userIds,
    },
  },
  data: { updatedAt: new Date() },
});
```

## トランザクション

### 基本的なトランザクション

```typescript
// $transactionで複数操作をアトミックに
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: {
      email: 'user@example.com',
      name: 'ユーザー',
    },
  });

  await tx.profile.create({
    data: {
      userId: user.id,
      bio: '自己紹介',
    },
  });

  await tx.post.create({
    data: {
      title: '最初の投稿',
      authorId: user.id,
    },
  });
});
// すべて成功するか、すべて失敗するか（ロールバック）
```

### インタラクティブトランザクション

```typescript
// 複雑な条件分岐を含むトランザクション
await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.credits < 100) {
    throw new Error('Insufficient credits');
  }

  // クレジット減算
  await tx.user.update({
    where: { id: userId },
    data: {
      credits: {
        decrement: 100,
      },
    },
  });

  // 購入記録作成
  await tx.purchase.create({
    data: {
      userId: userId,
      amount: 100,
    },
  });
});
```

### 分離レベルの指定

```typescript
// 分離レベルを指定したトランザクション
await prisma.$transaction(
  async (tx) => {
    // トランザクション処理
  },
  {
    isolationLevel: 'Serializable', // ReadUncommitted, ReadCommitted, RepeatableRead, Serializable
    maxWait: 5000, // 5秒待機
    timeout: 10000, // 10秒でタイムアウト
  }
);
```

## 高度なスキーマパターン

### 複合主キー

```prisma
model UserRole {
  userId String
  roleId String
  user   User   @relation(fields: [userId], references: [id])
  role   Role   @relation(fields: [roleId], references: [id])

  @@id([userId, roleId])
}
```

### JSONフィールド

```prisma
model Settings {
  id       String @id @default(cuid())
  userId   String @unique
  metadata Json   @default("{}")
}
```

```typescript
// JSON操作
await prisma.settings.create({
  data: {
    userId: 'user-id',
    metadata: {
      theme: 'dark',
      language: 'ja',
      notifications: {
        email: true,
        push: false,
      },
    },
  },
});

// JSON内を検索
const settings = await prisma.settings.findMany({
  where: {
    metadata: {
      path: ['notifications', 'email'],
      equals: true,
    },
  },
});
```

### 全文検索

```prisma
model Post {
  id      String @id @default(cuid())
  title   String
  content String

  @@fulltext([title, content])
}
```

```typescript
// 全文検索
const posts = await prisma.post.findMany({
  where: {
    OR: [
      { title: { search: 'Prisma' } },
      { content: { search: 'Prisma' } },
    ],
  },
});
```

### ソフトデリート

```prisma
model Post {
  id        String    @id @default(cuid())
  title     String
  deletedAt DateTime?

  @@index([deletedAt])
}
```

```typescript
// ソフトデリート
await prisma.post.update({
  where: { id: postId },
  data: { deletedAt: new Date() },
});

// 削除されていないものだけ取得
const posts = await prisma.post.findMany({
  where: { deletedAt: null },
});

// ミドルウェアで自動フィルタリング
prisma.$use(async (params, next) => {
  if (params.model === 'Post' && params.action === 'findMany') {
    params.args.where = params.args.where || {};
    params.args.where.deletedAt = null;
  }

  return next(params);
});
```

## マイグレーション戦略

### 開発環境でのマイグレーション

```bash
# スキーマ変更後、マイグレーション作成
npx prisma migrate dev --name add_user_role

# マイグレーション履歴確認
npx prisma migrate status

# マイグレーションをロールバック
npx prisma migrate reset
```

### 本番環境でのマイグレーション

```bash
# マイグレーションを適用（データベースを変更）
npx prisma migrate deploy

# 本番環境でのCI/CD
# .github/workflows/deploy.yml
- name: Run migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### カスタムマイグレーション

```sql
-- prisma/migrations/20260206000000_custom/migration.sql

-- 複雑なデータ移行
UPDATE "User"
SET "email" = LOWER("email")
WHERE "email" != LOWER("email");

-- インデックス追加
CREATE INDEX CONCURRENTLY "User_email_idx" ON "User"("email");

-- 関数作成
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### ダウンタイムゼロのマイグレーション

```prisma
// ステップ1: カラム追加（NULL許容）
model User {
  id       String  @id
  email    String  @unique
  newEmail String? // まずはNULL許容で追加
}
```

```bash
npx prisma migrate dev --name add_new_email
```

```typescript
// ステップ2: データ移行
await prisma.$executeRaw`
  UPDATE "User"
  SET "newEmail" = "email"
  WHERE "newEmail" IS NULL;
`;
```

```prisma
// ステップ3: NOT NULL制約を追加
model User {
  id       String @id
  newEmail String @unique // NOT NULL制約
}
```

```bash
npx prisma migrate dev --name make_new_email_required
```

## テスト戦略

### ユニットテスト（モック）

```typescript
// __tests__/user.test.ts
import { prismaMock } from '../lib/prisma-mock';

describe('User Service', () => {
  it('should create a user', async () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test' };

    prismaMock.user.create.mockResolvedValue(user);

    const result = await createUser({ email: 'test@example.com', name: 'Test' });

    expect(result).toEqual(user);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { email: 'test@example.com', name: 'Test' },
    });
  });
});
```

```typescript
// lib/prisma-mock.ts
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

jest.mock('./prisma', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

beforeEach(() => {
  mockReset(prismaMock);
});

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
```

### 統合テスト（テストDB使用）

```typescript
// __tests__/integration/user.test.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  // マイグレーション実行
  await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  // execSync('npx prisma migrate deploy');
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // 各テスト前にデータクリア
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
});

describe('User Integration Tests', () => {
  it('should create user and profile', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        profile: {
          create: {
            bio: 'Test bio',
          },
        },
      },
      include: { profile: true },
    });

    expect(user.email).toBe('test@example.com');
    expect(user.profile?.bio).toBe('Test bio');
  });
});
```

### シードデータ

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'user1@example.com' },
      update: {},
      create: {
        email: 'user1@example.com',
        name: 'User 1',
        posts: {
          create: [
            { title: 'Post 1', content: 'Content 1', published: true },
            { title: 'Post 2', content: 'Content 2', published: false },
          ],
        },
      },
    }),
    prisma.user.upsert({
      where: { email: 'user2@example.com' },
      update: {},
      create: {
        email: 'user2@example.com',
        name: 'User 2',
        posts: {
          create: [
            { title: 'Post 3', content: 'Content 3', published: true },
          ],
        },
      },
    }),
  ]);

  console.log({ users });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

```json
// package.json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

```bash
# シード実行
npx prisma db seed
```

## 本番運用のベストプラクティス

### コネクションプール

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### ロギング

```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

### ミドルウェア

```typescript
// グローバルミドルウェア
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();

  console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);

  return result;
});

// 特定モデルのみ
prisma.$use(async (params, next) => {
  if (params.model === 'User') {
    // ユーザーデータを暗号化
    if (params.action === 'create' || params.action === 'update') {
      params.args.data.email = encrypt(params.args.data.email);
    }
  }

  return next(params);
});
```

### バックアップ戦略

```bash
# PostgreSQLバックアップ
pg_dump $DATABASE_URL > backup.sql

# 復元
psql $DATABASE_URL < backup.sql

# 自動バックアップ（cron）
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz
```

## パフォーマンス監視

### Prisma Studio

```bash
npx prisma studio
# → http://localhost:5555 でGUIが起動
```

### クエリ分析

```typescript
// クエリの詳細を取得
prisma.$on('query', (e) => {
  console.log('Query:', e.query);
  console.log('Params:', e.params);
  console.log('Duration:', e.duration + 'ms');
  console.log('Target:', e.target);
});
```

### EXPLAINによる最適化

```typescript
// 生SQLでEXPLAIN実行
const result = await prisma.$queryRaw`
  EXPLAIN ANALYZE
  SELECT * FROM "User"
  WHERE "email" = 'test@example.com';
`;
```

## まとめ

Prisma ORMの高度なパターンをまとめます。

- **クエリ最適化** - N+1問題対策、select/include活用
- **トランザクション** - インタラクティブトランザクション
- **マイグレーション** - ダウンタイムゼロ戦略
- **テスト** - モック、統合テスト、シードデータ
- **本番運用** - コネクションプール、ロギング、バックアップ

Prismaは型安全で高速、かつ開発体験に優れたORMです。この記事のパターンを活用して、本番環境でも安心して使えるデータベースレイヤーを構築しましょう。
