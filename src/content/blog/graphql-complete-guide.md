---
title: 'GraphQL完全ガイド — Apollo Server・TypeScript・N+1解決・認証まで'
description: 'GraphQLをTypeScriptで実装する完全ガイド。スキーマ設計・Resolver・DataLoader（N+1解決）・認証・ページネーション・Apollo Client・コード生成まで実装例付きで網羅。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

GraphQLはFacebookが2012年に社内開発し、2015年にオープンソース化したAPIクエリ言語だ。RESTが抱える「オーバーフェッチ」「アンダーフェッチ」という根本的な問題を解決し、クライアントが必要なデータを正確に要求できる柔軟性を提供する。本記事ではApollo Server 4とTypeScriptを使い、実務で必要なすべての技術要素を実装例とともに徹底解説する。

---

## 1. GraphQL vs REST — メリット・デメリット比較

### RESTが抱える問題

RESTeAPIは長年Webサービスの標準だったが、フロントエンドの複雑化とともに限界が見えてきた。

**オーバーフェッチ（Over-fetching）**

```
GET /api/users/123
// 返却データ: id, name, email, phone, address, bio, createdAt, updatedAt...
// 必要なのは name と email だけなのに全フィールドが返ってくる
```

モバイルアプリでは不要データの転送がパフォーマンスに直結する。

**アンダーフェッチ（Under-fetching）**

```
// ユーザー情報 + 投稿一覧 + フォロワー数を表示したい
GET /api/users/123        → ユーザー情報
GET /api/users/123/posts  → 投稿一覧
GET /api/users/123/stats  → 統計情報
// 3回のリクエストが必要 = ウォーターフォール問題
```

**バージョニング地獄**

REST APIは破壊的変更のたびに `/v1/`, `/v2/` とバージョンが増殖する。古いバージョンの維持コストが膨大になる。

### GraphQLの解決策

```graphql
# 1回のリクエストで必要なデータだけを取得
query GetUserProfile($id: ID!) {
  user(id: $id) {
    name
    email
    posts(last: 5) {
      title
      publishedAt
    }
    followerCount
  }
}
```

| 比較項目 | REST | GraphQL |
|----------|------|---------|
| データ取得の柔軟性 | 固定レスポンス | クライアントが指定 |
| リクエスト数 | 複数エンドポイント | 単一エンドポイント |
| 型システム | なし（OpenAPI等で補完）| スキーマで強制 |
| バージョニング | `/v1`, `/v2` 必要 | フィールド追加で対応 |
| リアルタイム | WebSocket別途実装 | Subscription内蔵 |
| キャッシング | HTTP Cache活用可 | クエリ単位で実装必要 |
| 学習コスト | 低い | 中程度 |
| N+1問題 | 発生しにくい | DataLoader必須 |

### GraphQLが向いているケース

- 多様なクライアント（Web・iOS・Android）が存在するAPI
- フィールドが多く、クライアントごとに必要なデータが異なる
- リアルタイム機能（チャット・通知・ライブフィード）
- BFF（Backend for Frontend）レイヤー

### RESTが向いているケース

- シンプルなCRUD APIで複雑なクエリが不要
- ファイルアップロード・ダウンロードが主体
- HTTPキャッシュを最大活用したい（CDN等）
- チームのGraphQL知識がない

---

## 2. スキーマ設計（Type / Query / Mutation / Subscription）

GraphQLスキーマはAPIの「契約書」であり、型安全性の根幹を担う。

### スカラー型と基本オブジェクト型

```graphql
# schema.graphql

# カスタムスカラー
scalar DateTime
scalar JSON
scalar Upload

# Enumeration
enum UserRole {
  ADMIN
  EDITOR
  VIEWER
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

# 基本オブジェクト型
type User {
  id: ID!
  email: String!
  name: String!
  role: UserRole!
  bio: String
  avatarUrl: String
  posts(
    status: PostStatus
    first: Int
    after: String
  ): PostConnection!
  followerCount: Int!
  isFollowing: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  slug: String!
  content: String!
  excerpt: String
  status: PostStatus!
  author: User!
  tags: [Tag!]!
  likeCount: Int!
  commentCount: Int!
  publishedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Tag {
  id: ID!
  name: String!
  slug: String!
  postCount: Int!
}
```

### Relay Cursor Connections（ページネーション型）

```graphql
# Relay仕様準拠のページネーション型
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PostConnection {
  edges: [PostEdge!]!
  nodes: [Post!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

### Query型（データ取得）

```graphql
type Query {
  # 単一リソース取得
  me: User
  user(id: ID!): User
  post(id: ID, slug: String): Post

  # 一覧取得（ページネーション付き）
  posts(
    status: PostStatus
    authorId: ID
    tagSlug: String
    search: String
    first: Int = 20
    after: String
    last: Int
    before: String
    orderBy: PostOrderByInput
  ): PostConnection!

  tags(search: String): [Tag!]!
}

input PostOrderByInput {
  field: PostOrderField!
  direction: SortDirection!
}

enum PostOrderField {
  CREATED_AT
  PUBLISHED_AT
  LIKE_COUNT
  TITLE
}

enum SortDirection {
  ASC
  DESC
}
```

### Mutation型（データ変更）

```graphql
type Mutation {
  # 認証
  signUp(input: SignUpInput!): AuthPayload!
  signIn(input: SignInInput!): AuthPayload!
  signOut: Boolean!
  refreshToken(token: String!): AuthPayload!

  # ユーザー操作
  updateProfile(input: UpdateProfileInput!): User!
  uploadAvatar(file: Upload!): User!
  followUser(userId: ID!): User!
  unfollowUser(userId: ID!): User!

  # 投稿操作
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Boolean!
  publishPost(id: ID!): Post!
  likePost(id: ID!): Post!
}

# Input型は必ずInputサフィックスを付ける
input SignUpInput {
  email: String!
  password: String!
  name: String!
}

input SignInInput {
  email: String!
  password: String!
}

input CreatePostInput {
  title: String!
  content: String!
  excerpt: String
  tagIds: [ID!]
  status: PostStatus = DRAFT
}

input UpdatePostInput {
  title: String
  content: String
  excerpt: String
  tagIds: [ID!]
  status: PostStatus
}

type AuthPayload {
  accessToken: String!
  refreshToken: String!
  user: User!
}
```

### Subscription型（リアルタイム）

```graphql
type Subscription {
  postLiked(postId: ID!): PostLikedEvent!
  newComment(postId: ID!): Comment!
  userNotification: Notification!
}

type PostLikedEvent {
  post: Post!
  likedBy: User!
  likeCount: Int!
}
```

---

## 3. Apollo Server 4 セットアップ（TypeScript）

### プロジェクト初期化

```bash
mkdir graphql-server && cd graphql-server
npm init -y
npm install @apollo/server graphql graphql-tag
npm install dataloader jsonwebtoken bcryptjs
npm install @prisma/client prisma
npm install -D typescript ts-node @types/node @types/jsonwebtoken
npm install -D @types/bcryptjs nodemon
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### サーバーエントリーポイント

```typescript
// src/index.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolvers } from './resolvers/index.js';
import { createContext, Context } from './context.js';

// スキーマファイルを読み込む
const typeDefs = readFileSync(
  join(process.cwd(), 'src/schema.graphql'),
  'utf-8'
);

async function main() {
  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    // 本番環境では introspection を無効化
    introspection: process.env.NODE_ENV !== 'production',
    // フォーマットされたエラーを返す
    formatError: (formattedError, error) => {
      // 内部エラーの詳細を本番では隠す
      if (process.env.NODE_ENV === 'production') {
        if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
          return {
            message: 'Internal server error',
            extensions: { code: 'INTERNAL_SERVER_ERROR' }
          };
        }
      }
      console.error('GraphQL Error:', error);
      return formattedError;
    },
    // プラグイン設定
    plugins: [
      // 本番: ランディングページ無効化
      process.env.NODE_ENV === 'production'
        ? (await import('@apollo/server/plugin/disabled')).ApolloServerPluginLandingPageDisabled()
        : (await import('@apollo/server/plugin/landingPage/default')).ApolloServerPluginLandingPageLocalDefault({ embed: true })
    ]
  });

  const { url } = await startStandaloneServer(server, {
    context: createContext,
    listen: { port: Number(process.env.PORT) || 4000 }
  });

  console.log(`GraphQL Server ready at: ${url}`);
}

main().catch(console.error);
```

### Context の設計

```typescript
// src/context.ts
import { StandaloneServerContextFunctionArgument } from '@apollo/server/standalone';
import { PrismaClient } from '@prisma/client';
import { verifyAccessToken, TokenPayload } from './utils/jwt.js';
import { createLoaders, Loaders } from './loaders/index.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error']
});

export interface Context {
  prisma: PrismaClient;
  loaders: Loaders;
  currentUser: TokenPayload | null;
  requestId: string;
}

export async function createContext({
  req
}: StandaloneServerContextFunctionArgument): Promise<Context> {
  // リクエストごとにユニークIDを生成
  const requestId = crypto.randomUUID();

  // JWTトークンからユーザー情報を抽出
  let currentUser: TokenPayload | null = null;
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    currentUser = verifyAccessToken(token);
  }

  // DataLoaderはリクエストごとに新しいインスタンスを作成
  // （キャッシュをリクエスト間で共有しないため）
  const loaders = createLoaders(prisma);

  return {
    prisma,
    loaders,
    currentUser,
    requestId
  };
}
```

---

## 4. Resolver実装（context・引数・戻り値型）

### 型定義の生成

```typescript
// src/types/resolvers.ts
import { GraphQLResolveInfo, GraphQLScalarType } from 'graphql';
import { Context } from '../context.js';

// Resolverの基本型
export type Resolver<TResult, TParent = {}, TArgs = {}> = (
  parent: TParent,
  args: TArgs,
  context: Context,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

// クエリ引数の型
export interface PostsArgs {
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  authorId?: string;
  tagSlug?: string;
  search?: string;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  orderBy?: { field: string; direction: 'ASC' | 'DESC' };
}
```

### Queryリゾルバー

```typescript
// src/resolvers/query.ts
import { GraphQLError } from 'graphql';
import { Resolver, PostsArgs } from '../types/resolvers.js';
import { encodeCursor, decodeCursor, buildPostConnection } from '../utils/pagination.js';

export const Query = {
  me: async (_parent: unknown, _args: unknown, context: Context) => {
    if (!context.currentUser) return null;
    return context.prisma.user.findUnique({
      where: { id: context.currentUser.userId }
    });
  },

  user: async (_parent: unknown, args: { id: string }, context: Context) => {
    const user = await context.prisma.user.findUnique({
      where: { id: args.id }
    });
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND', id: args.id }
      });
    }
    return user;
  },

  posts: async (
    _parent: unknown,
    args: PostsArgs,
    context: Context
  ) => {
    const { first = 20, after, last, before, status, authorId, tagSlug, search, orderBy } = args;

    // カーソルのデコード
    const afterCursor = after ? decodeCursor(after) : undefined;
    const beforeCursor = before ? decodeCursor(before) : undefined;

    // WHERE条件の構築
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (authorId) where.authorId = authorId;
    if (tagSlug) where.tags = { some: { slug: tagSlug } };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    // ORDER BY の構築
    const orderByField = orderBy?.field?.toLowerCase() ?? 'createdAt';
    const orderByDirection = orderBy?.direction?.toLowerCase() ?? 'desc';

    // 総件数取得（ページネーション用）
    const totalCount = await context.prisma.post.count({ where });

    // ページネーション付きクエリ
    const posts = await context.prisma.post.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      take: last ? -last : (first + 1), // +1 で次ページの存在確認
      cursor: afterCursor ? { id: afterCursor } : beforeCursor ? { id: beforeCursor } : undefined,
      skip: afterCursor || beforeCursor ? 1 : 0
    });

    return buildPostConnection(posts, totalCount, first, last);
  }
};
```

### Mutationリゾルバー

```typescript
// src/resolvers/mutation.ts
import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import { generateTokens } from '../utils/jwt.js';
import { requireAuth } from '../utils/auth.js';

export const Mutation = {
  signUp: async (
    _parent: unknown,
    args: { input: { email: string; password: string; name: string } },
    context: Context
  ) => {
    const { email, password, name } = args.input;

    // メールアドレスの重複チェック
    const existing = await context.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new GraphQLError('Email already in use', {
        extensions: { code: 'EMAIL_ALREADY_EXISTS' }
      });
    }

    // パスワードのハッシュ化
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await context.prisma.user.create({
      data: { email, name, passwordHash, role: 'VIEWER' }
    });

    const tokens = generateTokens(user.id, user.role);
    return { ...tokens, user };
  },

  signIn: async (
    _parent: unknown,
    args: { input: { email: string; password: string } },
    context: Context
  ) => {
    const { email, password } = args.input;

    const user = await context.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // セキュリティ: ユーザーが存在しない場合でも同じエラーを返す
      throw new GraphQLError('Invalid credentials', {
        extensions: { code: 'INVALID_CREDENTIALS' }
      });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new GraphQLError('Invalid credentials', {
        extensions: { code: 'INVALID_CREDENTIALS' }
      });
    }

    const tokens = generateTokens(user.id, user.role);
    return { ...tokens, user };
  },

  createPost: async (
    _parent: unknown,
    args: { input: { title: string; content: string; excerpt?: string; tagIds?: string[]; status?: string } },
    context: Context
  ) => {
    // 認証チェック（ヘルパー関数でシンプルに）
    const currentUser = requireAuth(context);

    const { title, content, excerpt, tagIds = [], status = 'DRAFT' } = args.input;

    // スラッグの自動生成
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 100);

    const post = await context.prisma.post.create({
      data: {
        title,
        slug: `${slug}-${Date.now()}`,
        content,
        excerpt,
        status,
        authorId: currentUser.userId,
        tags: {
          connect: tagIds.map(id => ({ id }))
        }
      }
    });

    return post;
  },

  publishPost: async (
    _parent: unknown,
    args: { id: string },
    context: Context
  ) => {
    const currentUser = requireAuth(context);

    const post = await context.prisma.post.findUnique({
      where: { id: args.id }
    });

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' }
      });
    }

    // 権限チェック: 自分の投稿かADMINのみ
    if (post.authorId !== currentUser.userId && currentUser.role !== 'ADMIN') {
      throw new GraphQLError('Permission denied', {
        extensions: { code: 'FORBIDDEN' }
      });
    }

    return context.prisma.post.update({
      where: { id: args.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      }
    });
  }
};
```

### Fieldリゾルバー（型リゾルバー）

```typescript
// src/resolvers/user.ts
// User型のフィールドリゾルバー
export const User = {
  // postsフィールド: DataLoaderを使用して最適化
  posts: async (
    parent: { id: string },
    args: { status?: string; first?: number; after?: string },
    context: Context
  ) => {
    // DataLoaderでバッチ処理
    return context.loaders.postsByAuthorLoader.load({
      authorId: parent.id,
      status: args.status,
      first: args.first ?? 10
    });
  },

  followerCount: async (parent: { id: string }, _args: unknown, context: Context) => {
    return context.loaders.followerCountLoader.load(parent.id);
  },

  // ログイン中ユーザーがフォローしているかどうか
  isFollowing: async (parent: { id: string }, _args: unknown, context: Context) => {
    if (!context.currentUser) return false;
    return context.loaders.isFollowingLoader.load({
      followerId: context.currentUser.userId,
      followingId: parent.id
    });
  }
};
```

---

## 5. DataLoader（N+1問題解決・バッチング・キャッシング）

GraphQLのN+1問題は最もよく遭遇するパフォーマンス問題だ。

### N+1問題の発生メカニズム

```graphql
# このクエリを実行すると...
query {
  posts(first: 10) {
    nodes {
      title
      author {    # ここでN+1が発生！
        name
        avatarUrl
      }
    }
  }
}
```

```
# 実際に発行されるSQLクエリ
SELECT * FROM posts LIMIT 10;
SELECT * FROM users WHERE id = 'user-1';  # post[0].author
SELECT * FROM users WHERE id = 'user-2';  # post[1].author
SELECT * FROM users WHERE id = 'user-3';  # post[2].author
# ... 10件の投稿に対して10回のクエリ = N+1
```

### DataLoaderの実装

```typescript
// src/loaders/user-loader.ts
import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';

export function createUserLoader(prisma: PrismaClient) {
  return new DataLoader<string, any>(
    async (userIds: readonly string[]) => {
      // バッチ処理: 複数のIDをIN句でまとめて取得
      const users = await prisma.user.findMany({
        where: { id: { in: [...userIds] } }
      });

      // DataLoaderは入力と同じ順序・長さで結果を返す必要がある
      const userMap = new Map(users.map(u => [u.id, u]));
      return userIds.map(id => userMap.get(id) ?? null);
    },
    {
      // キャッシュキーのカスタマイズ（デフォルトは identity）
      cacheKeyFn: (key: string) => key,
      // バッチの最大サイズ（デフォルトは制限なし）
      maxBatchSize: 100,
      // キャッシュを有効にする（デフォルト: true）
      cache: true
    }
  );
}

// src/loaders/post-loader.ts
export function createPostsByAuthorLoader(prisma: PrismaClient) {
  return new DataLoader<{ authorId: string; status?: string; first: number }, any>(
    async (keys: readonly { authorId: string; status?: string; first: number }[]) => {
      // ユニークなauthorIdを抽出
      const authorIds = [...new Set(keys.map(k => k.authorId))];

      // バッチクエリ
      const posts = await prisma.post.findMany({
        where: { authorId: { in: authorIds } },
        orderBy: { createdAt: 'desc' }
      });

      // authorIdごとに投稿をグループ化
      const postsByAuthor = posts.reduce<Record<string, typeof posts>>((acc, post) => {
        if (!acc[post.authorId]) acc[post.authorId] = [];
        acc[post.authorId].push(post);
        return acc;
      }, {});

      // 各キーに対して対応する投稿を返す
      return keys.map(key => {
        const authorPosts = postsByAuthor[key.authorId] ?? [];
        const filtered = key.status
          ? authorPosts.filter(p => p.status === key.status)
          : authorPosts;
        return filtered.slice(0, key.first);
      });
    },
    {
      // 複合キーのためカスタムキャッシュ関数
      cacheKeyFn: (key) => `${key.authorId}:${key.status}:${key.first}`,
      cache: true
    }
  );
}
```

### ローダー集約管理

```typescript
// src/loaders/index.ts
import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';
import { createUserLoader } from './user-loader.js';
import { createPostsByAuthorLoader } from './post-loader.js';

export interface Loaders {
  userLoader: ReturnType<typeof createUserLoader>;
  postsByAuthorLoader: ReturnType<typeof createPostsByAuthorLoader>;
  followerCountLoader: DataLoader<string, number>;
  isFollowingLoader: DataLoader<{ followerId: string; followingId: string }, boolean>;
}

export function createLoaders(prisma: PrismaClient): Loaders {
  return {
    userLoader: createUserLoader(prisma),
    postsByAuthorLoader: createPostsByAuthorLoader(prisma),

    followerCountLoader: new DataLoader(async (userIds: readonly string[]) => {
      const counts = await prisma.follow.groupBy({
        by: ['followingId'],
        where: { followingId: { in: [...userIds] } },
        _count: true
      });
      const countMap = new Map(counts.map(c => [c.followingId, c._count]));
      return userIds.map(id => countMap.get(id) ?? 0);
    }),

    isFollowingLoader: new DataLoader(
      async (keys: readonly { followerId: string; followingId: string }[]) => {
        const follows = await prisma.follow.findMany({
          where: {
            OR: keys.map(k => ({
              followerId: k.followerId,
              followingId: k.followingId
            }))
          }
        });
        const followSet = new Set(
          follows.map(f => `${f.followerId}:${f.followingId}`)
        );
        return keys.map(k => followSet.has(`${k.followerId}:${k.followingId}`));
      },
      { cacheKeyFn: (k) => `${k.followerId}:${k.followingId}` }
    )
  };
}
```

DataLoaderの効果:

```
# DataLoader適用後のSQLクエリ（10件の投稿に対して）
SELECT * FROM posts LIMIT 10;
SELECT * FROM users WHERE id IN ('user-1', 'user-2', ..., 'user-10');
# 2クエリのみ！ N+1が解消される
```

---

## 6. 認証・認可（JWT・context注入・ディレクティブ）

### JWT ユーティリティ

```typescript
// src/utils/jwt.ts
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  role: string;
  type: 'access' | 'refresh';
}

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

export function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign(
    { userId, role, type: 'access' } satisfies TokenPayload,
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m', algorithm: 'HS256' }
  );

  const refreshToken = jwt.sign(
    { userId, role, type: 'refresh' } satisfies TokenPayload,
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
    if (payload.type !== 'access') return null;
    return payload;
  } catch {
    return null;
  }
}
```

### 認証ヘルパー

```typescript
// src/utils/auth.ts
import { GraphQLError } from 'graphql';
import { Context } from '../context.js';

export function requireAuth(context: Context) {
  if (!context.currentUser) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' }
    });
  }
  return context.currentUser;
}

export function requireRole(context: Context, roles: string[]) {
  const user = requireAuth(context);
  if (!roles.includes(user.role)) {
    throw new GraphQLError('Insufficient permissions', {
      extensions: {
        code: 'FORBIDDEN',
        requiredRoles: roles,
        currentRole: user.role
      }
    });
  }
  return user;
}
```

### カスタム認証ディレクティブ

```graphql
# schema.graphql への追加
directive @auth(requires: UserRole = VIEWER) on FIELD_DEFINITION

type Mutation {
  createPost(input: CreatePostInput!): Post! @auth(requires: VIEWER)
  deleteUser(id: ID!): Boolean! @auth(requires: ADMIN)
}
```

```typescript
// src/directives/auth-directive.ts
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { GraphQLSchema, defaultFieldResolver, GraphQLError } from 'graphql';
import { Context } from '../context.js';

export function authDirectiveTransformer(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const directive = getDirective(schema, fieldConfig, 'auth')?.[0];
      if (!directive) return fieldConfig;

      const { requires } = directive;
      const { resolve = defaultFieldResolver } = fieldConfig;

      return {
        ...fieldConfig,
        resolve: async (source, args, context: Context, info) => {
          const roleHierarchy = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };
          const required = roleHierarchy[requires as keyof typeof roleHierarchy] ?? 0;

          if (!context.currentUser) {
            throw new GraphQLError('Authentication required', {
              extensions: { code: 'UNAUTHENTICATED' }
            });
          }

          const current = roleHierarchy[context.currentUser.role as keyof typeof roleHierarchy] ?? -1;
          if (current < required) {
            throw new GraphQLError('Insufficient permissions', {
              extensions: { code: 'FORBIDDEN' }
            });
          }

          return resolve(source, args, context, info);
        }
      };
    }
  });
}
```

---

## 7. ページネーション（Relay Cursor Connections仕様）

```typescript
// src/utils/pagination.ts

// カーソルはBase64エンコードされたIDと位置情報
export function encodeCursor(id: string): string {
  return Buffer.from(`cursor:${id}`).toString('base64');
}

export function decodeCursor(cursor: string): string {
  const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
  if (!decoded.startsWith('cursor:')) {
    throw new Error('Invalid cursor format');
  }
  return decoded.slice(7);
}

export interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export function buildConnection<T extends { id: string }>(
  items: T[],
  totalCount: number,
  args: PaginationArgs
) {
  const { first, last } = args;
  const limit = first ?? last ?? 20;

  // +1取得して次ページ存在を確認
  const hasMore = items.length > limit;
  const nodes = hasMore ? items.slice(0, limit) : items;

  const edges = nodes.map(node => ({
    node,
    cursor: encodeCursor(node.id)
  }));

  return {
    edges,
    nodes,
    pageInfo: {
      hasNextPage: first ? hasMore : false,
      hasPreviousPage: last ? hasMore : false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null
    },
    totalCount
  };
}
```

---

## 8. エラーハンドリング（GraphQLError・カスタムエラー）

### エラーコードの体系化

```typescript
// src/errors/index.ts
import { GraphQLError } from 'graphql';

// エラーコードを定数として管理
export const ErrorCodes = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_USER_INPUT: 'BAD_USER_INPUT',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
} as const;

// ファクトリー関数でエラーを一元管理
export const Errors = {
  notFound: (resource: string, id: string) =>
    new GraphQLError(`${resource} not found`, {
      extensions: { code: ErrorCodes.NOT_FOUND, resource, id }
    }),

  unauthorized: () =>
    new GraphQLError('Authentication required', {
      extensions: { code: ErrorCodes.UNAUTHENTICATED }
    }),

  forbidden: (action?: string) =>
    new GraphQLError(
      action ? `Not allowed to ${action}` : 'Permission denied',
      { extensions: { code: ErrorCodes.FORBIDDEN, action } }
    ),

  conflict: (resource: string, field: string, value: string) =>
    new GraphQLError(`${resource} with ${field} '${value}' already exists`, {
      extensions: { code: ErrorCodes.CONFLICT, resource, field, value }
    }),

  badInput: (field: string, message: string) =>
    new GraphQLError(`Invalid input: ${message}`, {
      extensions: { code: ErrorCodes.BAD_USER_INPUT, field }
    }),

  rateLimited: (limit: number, window: string) =>
    new GraphQLError(`Rate limit exceeded: ${limit} requests per ${window}`, {
      extensions: { code: ErrorCodes.RATE_LIMITED, limit, window }
    })
};

// 使用例
// throw Errors.notFound('Post', postId);
// throw Errors.forbidden('delete this post');
// throw Errors.badInput('email', 'must be a valid email address');
```

### Zodを使ったバリデーション統合

```typescript
// src/utils/validate.ts
import { z } from 'zod';
import { GraphQLError } from 'graphql';

export function validateInput<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.errors[0];
    throw new GraphQLError(`Validation error: ${firstError.message}`, {
      extensions: {
        code: 'BAD_USER_INPUT',
        field: firstError.path.join('.'),
        errors: result.error.errors
      }
    });
  }
  return result.data;
}

// Zodスキーマ定義
const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(10),
  excerpt: z.string().max(300).optional(),
  tagIds: z.array(z.string().cuid()).max(10).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional()
});

// リゾルバー内での使用
// const validated = validateInput(CreatePostSchema, args.input);
```

---

## 9. ファイルアップロード（multipart）

```typescript
// graphql-upload パッケージを使用
// npm install graphql-upload
// npm install -D @types/graphql-upload

import { graphqlUploadExpress } from 'graphql-upload/graphqlUploadExpress.mjs';
import express from 'express';

// Express ミドルウェアとして追加
app.use(graphqlUploadExpress({ maxFileSize: 5_000_000, maxFiles: 1 }));

// src/resolvers/upload.ts
import { FileUpload } from 'graphql-upload/processRequest.mjs';
import { createWriteStream, mkdir } from 'fs';
import { promisify } from 'util';
import path from 'path';
import crypto from 'crypto';

const mkdirAsync = promisify(mkdir);

export async function handleFileUpload(upload: Promise<FileUpload>) {
  const { createReadStream, filename, mimetype } = await upload;

  // ファイルタイプチェック
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(mimetype)) {
    throw new GraphQLError('Invalid file type', {
      extensions: { code: 'BAD_USER_INPUT', allowedTypes }
    });
  }

  // ユニークなファイル名を生成
  const ext = path.extname(filename);
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const uploadDir = `./uploads/${new Date().toISOString().slice(0, 7)}`;

  await mkdirAsync(uploadDir, { recursive: true });
  const filepath = `${uploadDir}/${uniqueName}`;

  // ストリームでファイルを保存
  await new Promise<void>((resolve, reject) => {
    createReadStream()
      .pipe(createWriteStream(filepath))
      .on('finish', resolve)
      .on('error', reject);
  });

  // 公開URLを返す（本番ではCDN URLに変換）
  return `/uploads/${uniqueName}`;
}

// Mutation リゾルバー
export const uploadAvatar = async (
  _parent: unknown,
  args: { file: Promise<FileUpload> },
  context: Context
) => {
  const currentUser = requireAuth(context);
  const avatarUrl = await handleFileUpload(args.file);

  return context.prisma.user.update({
    where: { id: currentUser.userId },
    data: { avatarUrl }
  });
};
```

---

## 10. Subscription（WebSocket・リアルタイム）

```typescript
// npm install graphql-ws ws @graphql-tools/schema
// npm install -D @types/ws

// src/subscriptions/index.ts
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PubSub } from 'graphql-subscriptions';

// PubSub インスタンス（本番では Redis PubSub を使用）
export const pubsub = new PubSub();

export const EVENTS = {
  POST_LIKED: 'POST_LIKED',
  NEW_COMMENT: 'NEW_COMMENT',
  USER_NOTIFICATION: 'USER_NOTIFICATION'
} as const;

// Subscriptionリゾルバー
export const Subscription = {
  postLiked: {
    subscribe: (_parent: unknown, args: { postId: string }) => {
      return pubsub.asyncIterableIterator([`${EVENTS.POST_LIKED}:${args.postId}`]);
    },
    resolve: (payload: any) => payload.postLiked
  },

  newComment: {
    subscribe: (_parent: unknown, args: { postId: string }, context: Context) => {
      // 認証が必要なSubscription
      if (!context.currentUser) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }
      return pubsub.asyncIterableIterator([`${EVENTS.NEW_COMMENT}:${args.postId}`]);
    },
    resolve: (payload: any) => payload.newComment
  }
};

// likePost Mutationでイベントをパブリッシュ
// await pubsub.publish(`POST_LIKED:${postId}`, {
//   postLiked: { post, likedBy: currentUser, likeCount: updatedCount }
// });

// WebSocketサーバーのセットアップ
export function setupWebSocket(server: ReturnType<typeof createServer>, schema: any) {
  const wsServer = new WebSocketServer({
    server,
    path: '/graphql'
  });

  useServer(
    {
      schema,
      context: async (ctx) => {
        // WebSocket接続時の認証
        const token = ctx.connectionParams?.authorization as string;
        const currentUser = token?.startsWith('Bearer ')
          ? verifyAccessToken(token.slice(7))
          : null;

        return { currentUser, loaders: createLoaders(prisma), prisma };
      },
      onConnect: async (ctx) => {
        console.log('WebSocket connected:', ctx.connectionParams);
      },
      onDisconnect: (ctx) => {
        console.log('WebSocket disconnected');
      }
    },
    wsServer
  );
}
```

---

## 11. Apollo Client（React Hooks・キャッシュ管理）

```typescript
// npm install @apollo/client graphql

// src/apollo-client.ts
import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { split } from '@apollo/client';

// HTTPリンク
const httpLink = createHttpLink({ uri: '/api/graphql' });

// 認証ヘッダー付与
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: { ...headers, authorization: token ? `Bearer ${token}` : '' }
  };
});

// エラーハンドリングリンク
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        // トークンリフレッシュ処理
        // refreshTokenAndRetry(operation, forward);
        window.location.href = '/login';
      }
    }
  }
  if (networkError) {
    console.error('Network error:', networkError);
  }
});

// WebSocketリンク（Subscription用）
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql',
    connectionParams: () => ({
      authorization: `Bearer ${localStorage.getItem('accessToken')}`
    })
  })
);

// HTTP vs WebSocket の分岐
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([errorLink, authLink, httpLink])
);

// キャッシュ設定
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // posts フィールドのカーソルベースページネーション
        posts: {
          keyArgs: ['status', 'authorId', 'tagSlug', 'search', 'orderBy'],
          merge(existing, incoming, { args }) {
            if (!existing) return incoming;
            // after カーソルがある場合は追記（無限スクロール）
            if (args?.after) {
              return {
                ...incoming,
                edges: [...(existing.edges ?? []), ...(incoming.edges ?? [])],
                nodes: [...(existing.nodes ?? []), ...(incoming.nodes ?? [])]
              };
            }
            return incoming;
          }
        }
      }
    },
    Post: {
      fields: {
        // likeCount をリアルタイム更新するためのリード関数
        likeCount: { read: (existing) => existing ?? 0 }
      }
    }
  }
});

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache,
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
    query: { fetchPolicy: 'network-only', errorPolicy: 'all' }
  }
});
```

### React Hooks の使用

```tsx
// src/hooks/usePosts.ts
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_POSTS = gql`
  query GetPosts($first: Int, $after: String, $status: PostStatus) {
    posts(first: $first, after: $after, status: $status) {
      edges {
        node {
          id
          title
          excerpt
          author { name avatarUrl }
          likeCount
          publishedAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

const LIKE_POST = gql`
  mutation LikePost($id: ID!) {
    likePost(id: $id) {
      id
      likeCount
    }
  }
`;

const POST_LIKED_SUBSCRIPTION = gql`
  subscription PostLiked($postId: ID!) {
    postLiked(postId: $postId) {
      post { id likeCount }
      likedBy { name }
    }
  }
`;

// 投稿一覧 + 無限スクロール
export function usePostsFeed() {
  const { data, loading, error, fetchMore } = useQuery(GET_POSTS, {
    variables: { first: 20, status: 'PUBLISHED' }
  });

  const loadMore = () => {
    if (!data?.posts.pageInfo.hasNextPage) return;
    fetchMore({
      variables: { after: data.posts.pageInfo.endCursor }
    });
  };

  return { posts: data?.posts, loading, error, loadMore };
}

// いいねMutation（楽観的更新）
export function useLikePost() {
  const [likePost, { loading }] = useMutation(LIKE_POST, {
    optimisticResponse: ({ id }) => ({
      likePost: { __typename: 'Post', id, likeCount: -1 } // 仮の値
    }),
    update: (cache, { data }, { variables }) => {
      // キャッシュを手動更新
      cache.modify({
        id: cache.identify({ __typename: 'Post', id: variables?.id }),
        fields: {
          likeCount: (existing) => existing + 1
        }
      });
    }
  });

  return { likePost: (id: string) => likePost({ variables: { id } }), loading };
}

// リアルタイムSubscription
export function usePostLikedSubscription(postId: string) {
  const { data } = useSubscription(POST_LIKED_SUBSCRIPTION, {
    variables: { postId },
    onData: ({ client, data }) => {
      // Subscriptionデータを受信したらキャッシュを更新
      const event = data.data?.postLiked;
      if (event) {
        client.cache.modify({
          id: client.cache.identify({ __typename: 'Post', id: postId }),
          fields: { likeCount: () => event.post.likeCount }
        });
      }
    }
  });
  return data?.postLiked;
}
```

---

## 12. コード生成（graphql-codegen）

```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript
npm install -D @graphql-codegen/typescript-resolvers
npm install -D @graphql-codegen/typescript-operations
npm install -D @graphql-codegen/typed-document-node
```

```yaml
# codegen.yml
overwrite: true
schema: "src/schema.graphql"
generates:
  # サーバー側: リゾルバーの型を生成
  src/generated/resolvers.ts:
    plugins:
      - typescript
      - typescript-resolvers
    config:
      contextType: "../context#Context"
      mappers:
        # PrismaのモデルをGraphQL型にマッピング
        User: "@prisma/client#User"
        Post: "@prisma/client#Post"
        Tag: "@prisma/client#Tag"
      useIndexSignature: true
      strictMode: true

  # クライアント側: React Hook の型を生成
  src/generated/operations.ts:
    documents: "src/**/*.graphql"
    plugins:
      - typescript
      - typescript-operations
      - typed-document-node
    config:
      strictScalars: true
      scalars:
        DateTime: "string"
        JSON: "Record<string, unknown>"
```

```json
// package.json scripts に追加
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.yml",
    "codegen:watch": "graphql-codegen --config codegen.yml --watch"
  }
}
```

生成後の型を使ったリゾルバー実装:

```typescript
// 生成された型を import して完全な型安全性を確保
import { QueryResolvers, MutationResolvers, UserResolvers } from './generated/resolvers.js';

export const queryResolvers: QueryResolvers = {
  me: async (_parent, _args, context) => {
    // context.currentUser は型推論済み
    // context.prisma は型推論済み
    // 戻り値の型も自動チェック
    if (!context.currentUser) return null;
    return context.prisma.user.findUnique({
      where: { id: context.currentUser.userId }
    });
  }
};

// クライアント側でも生成型を使用
import { GetPostsDocument, GetPostsQuery } from './generated/operations.js';

const { data } = useQuery<GetPostsQuery>(GetPostsDocument, {
  variables: { first: 20 }
});
// data.posts.edges[0].node.title は完全な型推論
```

---

## 13. パフォーマンス（クエリ深さ制限・コスト分析・Persisted Queries）

### クエリ深さ制限

```typescript
// npm install graphql-depth-limit
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    depthLimit(10), // ネスト深さを最大10に制限
  ]
});

// 以下のような悪意あるクエリを防ぐ
// query {
//   posts {
//     nodes {
//       author {
//         posts {
//           nodes {
//             author { ... } // 無限ネスト攻撃
//           }
//         }
//       }
//     }
//   }
// }
```

### クエリコスト分析

```typescript
// npm install graphql-cost-analysis
import costAnalysis from 'graphql-cost-analysis';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    costAnalysis({
      maximumCost: 1000,     // リクエストあたりの最大コスト
      defaultCost: 1,         // デフォルトコスト
      onComplete: (cost) => {
        console.log(`Query cost: ${cost}`);
      },
      // フィールドごとのコスト定義
      fieldExtensions: {
        posts: { cost: 10 },
        post: { cost: 5 },
        user: { cost: 3 }
      }
    })
  ]
});
```

### Persisted Queries（パフォーマンス最適化）

```typescript
// Automatic Persisted Queries (APQ) を Apollo Server で有効化
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
import { KeyValueCache } from '@apollo/utils.keyvaluecache';
import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  cache: new InMemoryLRUCache({
    maxSize: Math.pow(2, 20) * 30, // 30MB
    ttl: 300_000 // 5分
  }),
  plugins: [
    ApolloServerPluginCacheControl({ defaultMaxAge: 60 })
  ]
});

// クライアント側での設定
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { sha256 } from 'crypto-hash';

const persistedQueriesLink = createPersistedQueryLink({ sha256 });

const client = new ApolloClient({
  link: from([persistedQueriesLink, authLink, httpLink]),
  cache: new InMemoryCache()
});
```

### フィールドレベルキャッシング

```graphql
# スキーマでキャッシュヒントを定義
type Post @cacheControl(maxAge: 60) {
  id: ID!
  title: String!
  # 動的フィールドはキャッシュ無効
  likeCount: Int! @cacheControl(maxAge: 0)
  author: User! @cacheControl(inheritMaxAge: true)
}

type Query {
  # パブリックな投稿一覧は積極的にキャッシュ
  posts: PostConnection! @cacheControl(maxAge: 120)
  # 認証必須のデータはキャッシュしない
  me: User @cacheControl(maxAge: 0, scope: PRIVATE)
}
```

### レート制限の実装

```typescript
// src/plugins/rate-limit.ts
import { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';

interface RateLimitConfig {
  windowMs: number;  // ウィンドウサイズ（ミリ秒）
  max: number;       // ウィンドウ内の最大リクエスト数
}

export function rateLimitPlugin(config: RateLimitConfig): ApolloServerPlugin {
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  return {
    async requestDidStart({ contextValue, request }) {
      const context = contextValue as any;
      const clientId = context.currentUser?.userId ?? request.http?.headers.get('x-forwarded-for') ?? 'anonymous';

      const now = Date.now();
      const record = requestCounts.get(clientId);

      if (!record || now > record.resetAt) {
        requestCounts.set(clientId, { count: 1, resetAt: now + config.windowMs });
        return;
      }

      record.count++;
      if (record.count > config.max) {
        throw new GraphQLError('Rate limit exceeded', {
          extensions: {
            code: 'RATE_LIMITED',
            retryAfter: Math.ceil((record.resetAt - now) / 1000)
          }
        });
      }
    }
  };
}
```

---

## まとめ

本記事で解説したGraphQL実装の全体像を整理する。

| 技術要素 | 用途 | 主要ライブラリ |
|----------|------|--------------|
| スキーマ設計 | API契約の定義 | graphql |
| Apollo Server 4 | GraphQLサーバー | @apollo/server |
| DataLoader | N+1解決・バッチング | dataloader |
| JWT認証 | ユーザー識別 | jsonwebtoken |
| ページネーション | Relay仕様の実装 | カスタム実装 |
| Subscription | リアルタイム通信 | graphql-ws |
| Apollo Client | Reactクライアント | @apollo/client |
| コード生成 | 型安全性確保 | @graphql-codegen/cli |
| コスト分析 | DoS対策 | graphql-cost-analysis |

GraphQLの最大の利点は**型システムによる信頼性**と**クライアント主導のデータ取得**にある。DataLoaderによるN+1解決を適切に実装し、認証・認可・エラーハンドリングを体系化すれば、大規模なプロダクションシステムでも十分運用できる。

---

## 開発ツールのご紹介

GraphQL APIの開発・デバッグにはAPIクライアントが不可欠だ。JSON整形やHTTPリクエストのテストには、ブラウザだけで動く **[DevToolBox](https://usedevtools.com/)** が便利だ。GraphQLのクエリをコピーして貼り付け、レスポンスのJSONを即座に整形・検索できる。インストール不要でどの環境からでもアクセスできるため、開発中のスピードアップに活用してほしい。

---

*本記事の実装例はGitHubリポジトリで公開予定。Apollo Server 4・TypeScript 5.3・Prisma 5以降の環境で動作確認済み。*
