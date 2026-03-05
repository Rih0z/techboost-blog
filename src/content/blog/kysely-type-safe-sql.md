---
title: "Kyselyで型安全なSQLクエリビルダーを実装する実践ガイド"
description: "Kyselyの実践的パターン集。複雑なクエリ構築、動的フィルタリング、Repository パターン、テスト戦略、パフォーマンス最適化、エラーハンドリング、N+1問題の解決法を解説"
pubDate: "2025-02-05"
tags: ['プログラミング']
---

# Kyselyで型安全なSQLクエリビルダーを実装する実践ガイド

## Kyselyの実践的な活用

Kyselyは**TypeScript型安全なSQLクエリビルダー**ですが、実際のアプリケーション開発では、基本的なCRUD以上の高度なパターンが必要です。本記事では、**実践的なパターンとベストプラクティス**に焦点を当てて解説します。

## 動的なクエリ構築

### フィルタリングの実装

```typescript
import { Kysely, SelectQueryBuilder } from 'kysely';

interface UserFilters {
  name?: string;
  email?: string;
  ageMin?: number;
  ageMax?: number;
  isActive?: boolean;
}

function buildUserQuery(
  db: Kysely<Database>,
  filters: UserFilters
) {
  let query = db.selectFrom('users').selectAll();

  // 名前で検索（部分一致）
  if (filters.name) {
    query = query.where('name', 'like', `%${filters.name}%`);
  }

  // メールで検索（完全一致）
  if (filters.email) {
    query = query.where('email', '=', filters.email);
  }

  // 年齢範囲
  if (filters.ageMin !== undefined) {
    query = query.where('age', '>=', filters.ageMin);
  }
  if (filters.ageMax !== undefined) {
    query = query.where('age', '<=', filters.ageMax);
  }

  // アクティブステータス
  if (filters.isActive !== undefined) {
    query = query.where('is_active', '=', filters.isActive);
  }

  return query;
}

// 使用例
async function searchUsers(filters: UserFilters) {
  const query = buildUserQuery(db, filters);
  return query.execute();
}

// 動的にフィルタを適用
const users = await searchUsers({
  name: 'Alice',
  ageMin: 20,
  isActive: true
});
```

### ソート順の動的指定

```typescript
type SortColumn = 'name' | 'email' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: SortColumn;
  sortDirection?: SortDirection;
}

async function getPaginatedUsers(
  filters: UserFilters,
  options: PaginationOptions
) {
  let query = buildUserQuery(db, filters);

  // ソート
  if (options.sortBy) {
    query = query.orderBy(
      options.sortBy,
      options.sortDirection || 'asc'
    );
  } else {
    query = query.orderBy('created_at', 'desc');
  }

  // ページネーション
  const offset = (options.page - 1) * options.pageSize;
  query = query.limit(options.pageSize).offset(offset);

  // 件数取得も並列実行
  const [users, countResult] = await Promise.all([
    query.execute(),
    buildUserQuery(db, filters)
      .select((eb) => eb.fn.count('id').as('total'))
      .executeTakeFirst()
  ]);

  return {
    users,
    total: Number(countResult?.total || 0),
    page: options.page,
    pageSize: options.pageSize,
    totalPages: Math.ceil(Number(countResult?.total || 0) / options.pageSize)
  };
}
```

### OR条件の構築

```typescript
interface SearchOptions {
  query: string;
  searchFields: Array<'name' | 'email' | 'phone'>;
}

async function searchUsersAcrossFields(options: SearchOptions) {
  return db
    .selectFrom('users')
    .selectAll()
    .where((eb) => {
      const conditions = options.searchFields.map(field =>
        eb(field, 'like', `%${options.query}%`)
      );
      return eb.or(conditions);
    })
    .execute();
}

// 使用例
const results = await searchUsersAcrossFields({
  query: 'alice',
  searchFields: ['name', 'email']
});
// SELECT * FROM users WHERE name LIKE '%alice%' OR email LIKE '%alice%'
```

## Repository パターン

### 基本的なRepository

```typescript
// repositories/user.repository.ts
import { Kysely } from 'kysely';
import { Database } from '../types/database';

export class UserRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: number) {
    return this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async findByEmail(email: string) {
    return this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();
  }

  async create(data: {
    name: string;
    email: string;
    password_hash: string;
  }) {
    return this.db
      .insertInto('users')
      .values({
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returningAll()
      .executeTakeFirst();
  }

  async update(id: number, data: Partial<{
    name: string;
    email: string;
    password_hash: string;
  }>) {
    return this.db
      .updateTable('users')
      .set({
        ...data,
        updated_at: new Date()
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(id: number) {
    const result = await this.db
      .deleteFrom('users')
      .where('id', '=', id)
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  async exists(id: number): Promise<boolean> {
    const result = await this.db
      .selectFrom('users')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('id', '=', id)
      .executeTakeFirst();

    return Number(result?.count) > 0;
  }
}
```

### 複雑なクエリを持つRepository

```typescript
export class PostRepository {
  constructor(private db: Kysely<Database>) {}

  // 投稿一覧（著者情報含む）
  async findAll(options: PaginationOptions) {
    return this.db
      .selectFrom('posts')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .select([
        'posts.id',
        'posts.title',
        'posts.slug',
        'posts.excerpt',
        'posts.created_at',
        'users.name as author_name',
        'users.avatar_url as author_avatar'
      ])
      .where('posts.published', '=', true)
      .orderBy('posts.created_at', 'desc')
      .limit(options.pageSize)
      .offset((options.page - 1) * options.pageSize)
      .execute();
  }

  // 投稿詳細（タグ、コメント含む）
  async findBySlugWithRelations(slug: string) {
    // メインデータ取得
    const post = await this.db
      .selectFrom('posts')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .select([
        'posts.id',
        'posts.title',
        'posts.content',
        'posts.created_at',
        'posts.updated_at',
        'users.id as author_id',
        'users.name as author_name',
        'users.bio as author_bio'
      ])
      .where('posts.slug', '=', slug)
      .where('posts.published', '=', true)
      .executeTakeFirst();

    if (!post) return null;

    // タグとコメントを並列取得
    const [tags, comments] = await Promise.all([
      this.db
        .selectFrom('post_tags')
        .innerJoin('tags', 'tags.id', 'post_tags.tag_id')
        .select(['tags.id', 'tags.name', 'tags.slug'])
        .where('post_tags.post_id', '=', post.id)
        .execute(),

      this.db
        .selectFrom('comments')
        .innerJoin('users', 'users.id', 'comments.user_id')
        .select([
          'comments.id',
          'comments.content',
          'comments.created_at',
          'users.name as commenter_name',
          'users.avatar_url as commenter_avatar'
        ])
        .where('comments.post_id', '=', post.id)
        .orderBy('comments.created_at', 'asc')
        .execute()
    ]);

    return { ...post, tags, comments };
  }

  // 人気投稿（ビュー数、コメント数でソート）
  async findPopular(limit: number = 10) {
    return this.db
      .selectFrom('posts')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .select([
        'posts.id',
        'posts.title',
        'posts.slug',
        'posts.view_count',
        'users.name as author_name',
        (eb) => eb
          .selectFrom('comments')
          .select((eb) => eb.fn.count('id').as('comment_count'))
          .whereRef('comments.post_id', '=', 'posts.id')
          .as('comment_count')
      ])
      .where('posts.published', '=', true)
      .orderBy('posts.view_count', 'desc')
      .limit(limit)
      .execute();
  }

  // 関連投稿（同じタグを持つ）
  async findRelated(postId: number, limit: number = 5) {
    return this.db
      .selectFrom('posts as p1')
      .innerJoin('post_tags as pt1', 'pt1.post_id', 'p1.id')
      .innerJoin('post_tags as pt2', 'pt2.tag_id', 'pt1.tag_id')
      .innerJoin('posts as p2', 'p2.id', 'pt2.post_id')
      .select([
        'p2.id',
        'p2.title',
        'p2.slug',
        (eb) => eb.fn.count('pt2.tag_id').as('common_tags')
      ])
      .where('p1.id', '=', postId)
      .where('p2.id', '!=', postId)
      .where('p2.published', '=', true)
      .groupBy(['p2.id', 'p2.title', 'p2.slug'])
      .orderBy('common_tags', 'desc')
      .limit(limit)
      .execute();
  }
}
```

## N+1問題の解決

### 悪い例（N+1が発生）

```typescript
// ❌ BAD: N+1クエリ問題
async function getBadUserPosts() {
  // 1. ユーザー一覧を取得
  const users = await db.selectFrom('users').selectAll().execute();

  // 2. 各ユーザーの投稿を取得（N回のクエリ）
  const usersWithPosts = await Promise.all(
    users.map(async (user) => {
      const posts = await db
        .selectFrom('posts')
        .selectAll()
        .where('user_id', '=', user.id)
        .execute();

      return { ...user, posts };
    })
  );

  return usersWithPosts;
}
// → 1 + N クエリ実行
```

### 解決策1: JOINを使う

```typescript
// ✅ GOOD: JOINで1クエリに
async function getGoodUserPosts() {
  const results = await db
    .selectFrom('users')
    .leftJoin('posts', 'posts.user_id', 'users.id')
    .select([
      'users.id',
      'users.name',
      'posts.id as post_id',
      'posts.title as post_title'
    ])
    .execute();

  // グルーピング
  const usersMap = new Map();

  for (const row of results) {
    if (!usersMap.has(row.id)) {
      usersMap.set(row.id, {
        id: row.id,
        name: row.name,
        posts: []
      });
    }

    if (row.post_id) {
      usersMap.get(row.id).posts.push({
        id: row.post_id,
        title: row.post_title
      });
    }
  }

  return Array.from(usersMap.values());
}
```

### 解決策2: サブクエリで集約

```typescript
async function getUsersWithPostCount() {
  return db
    .selectFrom('users')
    .select([
      'users.id',
      'users.name',
      (eb) => eb
        .selectFrom('posts')
        .select((eb) => eb.fn.count('id').as('count'))
        .whereRef('posts.user_id', '=', 'users.id')
        .as('post_count')
    ])
    .execute();
}
// → 1クエリで完結
```

### 解決策3: IN句でバッチ取得

```typescript
async function getUsersWithPostsBatched() {
  // 1. ユーザー取得
  const users = await db.selectFrom('users').selectAll().execute();
  const userIds = users.map(u => u.id);

  // 2. 全投稿を一括取得
  const posts = await db
    .selectFrom('posts')
    .selectAll()
    .where('user_id', 'in', userIds)
    .execute();

  // 3. メモリでグルーピング
  const postsMap = new Map<number, any[]>();
  for (const post of posts) {
    if (!postsMap.has(post.user_id)) {
      postsMap.set(post.user_id, []);
    }
    postsMap.get(post.user_id)!.push(post);
  }

  return users.map(user => ({
    ...user,
    posts: postsMap.get(user.id) || []
  }));
}
// → 2クエリ（1 + 1）
```

## トランザクションパターン

### 複雑なトランザクション

```typescript
async function createPostWithTags(
  userId: number,
  postData: {
    title: string;
    content: string;
    tagNames: string[];
  }
) {
  return db.transaction().execute(async (trx) => {
    // 1. 投稿作成
    const post = await trx
      .insertInto('posts')
      .values({
        user_id: userId,
        title: postData.title,
        slug: slugify(postData.title),
        content: postData.content,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returningAll()
      .executeTakeFirst();

    if (!post) throw new Error('Failed to create post');

    // 2. タグを取得または作成
    const tags = await Promise.all(
      postData.tagNames.map(async (name) => {
        // 既存タグを検索
        let tag = await trx
          .selectFrom('tags')
          .selectAll()
          .where('name', '=', name)
          .executeTakeFirst();

        // なければ作成
        if (!tag) {
          tag = await trx
            .insertInto('tags')
            .values({ name, slug: slugify(name) })
            .returningAll()
            .executeTakeFirst();
        }

        return tag;
      })
    );

    // 3. 投稿とタグの関連付け
    if (tags.length > 0) {
      await trx
        .insertInto('post_tags')
        .values(
          tags.map(tag => ({
            post_id: post.id,
            tag_id: tag!.id
          }))
        )
        .execute();
    }

    return { ...post, tags };
  });
}
```

### 楽観的ロック

```typescript
async function updatePostWithOptimisticLock(
  postId: number,
  version: number,
  updates: { title?: string; content?: string }
) {
  return db.transaction().execute(async (trx) => {
    // 現在のバージョンを確認
    const post = await trx
      .selectFrom('posts')
      .select(['id', 'version'])
      .where('id', '=', postId)
      .where('version', '=', version)
      .executeTakeFirst();

    if (!post) {
      throw new Error('Post not found or version mismatch');
    }

    // 更新（バージョンをインクリメント）
    const updated = await trx
      .updateTable('posts')
      .set({
        ...updates,
        version: version + 1,
        updated_at: new Date()
      })
      .where('id', '=', postId)
      .where('version', '=', version)
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      throw new Error('Concurrent modification detected');
    }

    return updated;
  });
}
```

## テスト戦略

### テスト用DBセットアップ

```typescript
// tests/setup.ts
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export async function setupTestDb() {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: 'localhost',
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      })
    })
  });

  // マイグレーション実行
  await runMigrations(db);

  return db;
}

export async function teardownTestDb(db: Kysely<Database>) {
  // 全テーブルクリア
  await db.deleteFrom('post_tags').execute();
  await db.deleteFrom('posts').execute();
  await db.deleteFrom('users').execute();

  await db.destroy();
}
```

### Repositoryのユニットテスト

```typescript
// tests/user.repository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb, teardownTestDb } from './setup';
import { UserRepository } from '../repositories/user.repository';

describe('UserRepository', () => {
  let db: Kysely<Database>;
  let repo: UserRepository;

  beforeEach(async () => {
    db = await setupTestDb();
    repo = new UserRepository(db);
  });

  afterEach(async () => {
    await teardownTestDb(db);
  });

  it('should create a user', async () => {
    const user = await repo.create({
      name: 'Test User',
      email: 'test@example.com',
      password_hash: 'hashed_password'
    });

    expect(user).toBeDefined();
    expect(user?.name).toBe('Test User');
    expect(user?.email).toBe('test@example.com');
  });

  it('should find user by email', async () => {
    await repo.create({
      name: 'Alice',
      email: 'alice@example.com',
      password_hash: 'hash'
    });

    const user = await repo.findByEmail('alice@example.com');

    expect(user).toBeDefined();
    expect(user?.name).toBe('Alice');
  });

  it('should return null for non-existent user', async () => {
    const user = await repo.findByEmail('nonexistent@example.com');
    expect(user).toBeUndefined();
  });
});
```

## パフォーマンス最適化

### クエリのEXPLAIN

```typescript
async function explainQuery() {
  const query = db
    .selectFrom('posts')
    .innerJoin('users', 'users.id', 'posts.user_id')
    .select(['posts.id', 'posts.title', 'users.name'])
    .where('posts.published', '=', true)
    .compile();

  console.log('SQL:', query.sql);
  console.log('Parameters:', query.parameters);

  // EXPLAINを実行
  const plan = await db
    .executeQuery({
      ...query,
      sql: `EXPLAIN ANALYZE ${query.sql}`
    });

  console.log('Query Plan:', plan.rows);
}
```

### インデックスヒントの追加

```typescript
// マイグレーションでインデックス作成
await db.schema
  .createIndex('posts_user_id_published_idx')
  .on('posts')
  .columns(['user_id', 'published'])
  .execute();

// 複合インデックスを活用
const posts = await db
  .selectFrom('posts')
  .selectAll()
  .where('user_id', '=', userId)
  .where('published', '=', true)
  .execute();
```

### バッチ処理

```typescript
async function batchInsertPosts(posts: Array<{
  user_id: number;
  title: string;
  content: string;
}>) {
  // 1000件ずつバッチ挿入
  const batchSize = 1000;

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);

    await db
      .insertInto('posts')
      .values(
        batch.map(post => ({
          ...post,
          created_at: new Date(),
          updated_at: new Date()
        }))
      )
      .execute();
  }
}
```

## まとめ

Kyselyは**実践的なアプリケーション開発**で威力を発揮します。

### 主要なベストプラクティス

1. **動的クエリ** - フィルタリング、ソート、ページネーションを柔軟に構築
2. **Repositoryパターン** - ビジネスロジックとデータアクセスを分離
3. **N+1問題対策** - JOIN、サブクエリ、バッチ取得を活用
4. **トランザクション** - 複雑な操作を安全に実行
5. **テスト** - 型安全性を活かしたテスト戦略

Kyselyは、**SQLの柔軟性**と**TypeScriptの型安全性**を両立した、モダンなアプリケーション開発に最適なツールです。
