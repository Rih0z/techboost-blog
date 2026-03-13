---
title: 'GraphQL Yogaサーバー構築ガイド - モダンなGraphQL開発'
description: 'GraphQL Yogaを使った完全なサーバー構築ガイド。セットアップからスキーマ定義、リゾルバー実装、サブスクリプション、認証・認可まで実践的に解説。Apollo Serverの軽量代替として注目のフレームワークです。'
pubDate: '2026-02-05'
tags: ['GraphQL', 'インフラ', 'バックエンド']
heroImage: '../../assets/thumbnails/graphql-yoga-server.jpg'
---

GraphQL Yogaは、The Guildが開発する軽量で柔軟なGraphQLサーバーフレームワークです。Apollo Serverの代替として注目を集めており、モダンな機能と優れたDXを提供します。

本ガイドでは、GraphQL Yogaを使った実践的なサーバー構築を、基礎から応用まで詳しく解説します。

## GraphQL Yogaとは

GraphQL Yogaは以下の特徴を持つフレームワークです。

### 主な特徴

1. **軽量・高速** - 最小限の依存関係
2. **フレームワーク非依存** - Node.js、Deno、Bun、Cloudflare Workersなどで動作
3. **標準準拠** - GraphQL over HTTP仕様に完全準拠
4. **豊富なプラグイン** - エコシステムが充実
5. **優れたDX** - TypeScript完全対応、直感的なAPI

### なぜGraphQL Yogaなのか

```typescript
// Apollo Server（従来）
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

// 複雑な設定、重い依存関係

// GraphQL Yoga（モダン）
import { createYoga } from 'graphql-yoga'
import { createServer } from 'node:http'

// シンプル、軽量、柔軟
```

## セットアップ

### 基本的なインストール

```bash
# Node.jsプロジェクト初期化
npm init -y

# 必要なパッケージ
npm install graphql-yoga graphql

# TypeScript環境
npm install -D typescript @types/node tsx

# TypeScript設定
npx tsc --init
```

### 最小構成のサーバー

```typescript
// src/server.ts
import { createYoga } from 'graphql-yoga'
import { createServer } from 'node:http'

const yoga = createYoga({
  schema: {
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
    `,
    resolvers: {
      Query: {
        hello: () => 'Hello from GraphQL Yoga!'
      }
    }
  }
})

const server = createServer(yoga)

server.listen(4000, () => {
  console.log('Server is running on http://localhost:4000/graphql')
})
```

実行:

```bash
npx tsx src/server.ts
```

GraphiQL（GraphQL IDE）が `http://localhost:4000/graphql` で利用可能です。

## スキーマ定義

### 型定義の基本

```typescript
const typeDefs = /* GraphQL */ `
  # スカラー型
  scalar Date
  scalar JSON

  # Enum
  enum Role {
    ADMIN
    USER
    GUEST
  }

  # Object Type
  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
    createdAt: Date!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    published: Boolean!
    author: User!
    tags: [String!]!
    createdAt: Date!
    updatedAt: Date!
  }

  # Input Type
  input CreateUserInput {
    name: String!
    email: String!
    password: String!
  }

  input UpdateUserInput {
    name: String
    email: String
  }

  input CreatePostInput {
    title: String!
    content: String!
    tags: [String!]!
  }

  # Query
  type Query {
    me: User
    user(id: ID!): User
    users(role: Role): [User!]!
    post(id: ID!): Post
    posts(published: Boolean): [Post!]!
  }

  # Mutation
  type Mutation {
    signup(input: CreateUserInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    createPost(input: CreatePostInput!): Post!
    publishPost(id: ID!): Post!
    deletePost(id: ID!): Boolean!
  }

  # Subscription
  type Subscription {
    postCreated: Post!
    postPublished: Post!
  }

  # 認証レスポンス
  type AuthPayload {
    token: String!
    user: User!
  }
`
```

### スキーマ分割

大規模プロジェクトでは、スキーマを分割して管理:

```typescript
// src/schema/user.ts
export const userTypeDefs = /* GraphQL */ `
  enum Role {
    ADMIN
    USER
    GUEST
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
    posts: [Post!]!
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
  }

  extend type Query {
    me: User
    user(id: ID!): User
    users(role: Role): [User!]!
  }

  extend type Mutation {
    signup(input: CreateUserInput!): AuthPayload!
    updateUser(id: ID!, input: UpdateUserInput!): User!
  }
`

// src/schema/post.ts
export const postTypeDefs = /* GraphQL */ `
  type Post {
    id: ID!
    title: String!
    content: String!
    published: Boolean!
    author: User!
  }

  input CreatePostInput {
    title: String!
    content: String!
  }

  extend type Query {
    post(id: ID!): Post
    posts(published: Boolean): [Post!]!
  }

  extend type Mutation {
    createPost(input: CreatePostInput!): Post!
    publishPost(id: ID!): Post!
  }
`

// src/schema/index.ts
import { userTypeDefs } from './user'
import { postTypeDefs } from './post'

export const typeDefs = [
  /* GraphQL */ `
    scalar Date
    scalar JSON

    type Query
    type Mutation
    type Subscription

    type AuthPayload {
      token: String!
      user: User!
    }
  `,
  userTypeDefs,
  postTypeDefs,
]
```

## リゾルバー実装

### 基本的なリゾルバー

```typescript
// src/resolvers/user.ts
import type { YogaInitialContext } from 'graphql-yoga'
import { GraphQLError } from 'graphql'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

interface Context extends YogaInitialContext {
  db: Database
  currentUser?: User
}

export const userResolvers = {
  Query: {
    me: async (_parent: unknown, _args: unknown, context: Context) => {
      if (!context.currentUser) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }
      return context.currentUser
    },

    user: async (_parent: unknown, args: { id: string }, context: Context) => {
      const user = await context.db.user.findUnique({
        where: { id: args.id }
      })

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' }
        })
      }

      return user
    },

    users: async (_parent: unknown, args: { role?: string }, context: Context) => {
      return context.db.user.findMany({
        where: args.role ? { role: args.role } : undefined
      })
    }
  },

  Mutation: {
    signup: async (
      _parent: unknown,
      args: { input: CreateUserInput },
      context: Context
    ) => {
      const { name, email, password } = args.input

      // 既存ユーザーチェック
      const existingUser = await context.db.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        throw new GraphQLError('Email already in use', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      // パスワードハッシュ化
      const hashedPassword = await bcrypt.hash(password, 10)

      // ユーザー作成
      const user = await context.db.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'USER'
        }
      })

      // JWT生成
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      )

      return { token, user }
    },

    login: async (
      _parent: unknown,
      args: { email: string; password: string },
      context: Context
    ) => {
      const user = await context.db.user.findUnique({
        where: { email: args.email }
      })

      if (!user) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      const valid = await bcrypt.compare(args.password, user.password)

      if (!valid) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      )

      return { token, user }
    }
  },

  User: {
    // Field resolver - postsフィールドの解決
    posts: async (parent: User, _args: unknown, context: Context) => {
      return context.db.post.findMany({
        where: { authorId: parent.id }
      })
    }
  }
}

// src/resolvers/post.ts
export const postResolvers = {
  Query: {
    post: async (_parent: unknown, args: { id: string }, context: Context) => {
      return context.db.post.findUnique({
        where: { id: args.id }
      })
    },

    posts: async (
      _parent: unknown,
      args: { published?: boolean },
      context: Context
    ) => {
      return context.db.post.findMany({
        where: args.published !== undefined
          ? { published: args.published }
          : undefined
      })
    }
  },

  Mutation: {
    createPost: async (
      _parent: unknown,
      args: { input: CreatePostInput },
      context: Context
    ) => {
      if (!context.currentUser) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      return context.db.post.create({
        data: {
          ...args.input,
          authorId: context.currentUser.id,
          published: false
        }
      })
    },

    publishPost: async (
      _parent: unknown,
      args: { id: string },
      context: Context
    ) => {
      if (!context.currentUser) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      const post = await context.db.post.findUnique({
        where: { id: args.id }
      })

      if (!post) {
        throw new GraphQLError('Post not found', {
          extensions: { code: 'NOT_FOUND' }
        })
      }

      if (post.authorId !== context.currentUser.id) {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' }
        })
      }

      return context.db.post.update({
        where: { id: args.id },
        data: { published: true }
      })
    }
  },

  Post: {
    // Field resolver - authorフィールドの解決
    author: async (parent: Post, _args: unknown, context: Context) => {
      return context.db.user.findUnique({
        where: { id: parent.authorId }
      })
    }
  }
}

// src/resolvers/index.ts
import { userResolvers } from './user'
import { postResolvers } from './post'

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...postResolvers.Query
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...postResolvers.Mutation
  },
  User: userResolvers.User,
  Post: postResolvers.Post
}
```

## サブスクリプション

リアルタイム機能の実装:

```typescript
// src/pubsub.ts
import { createPubSub } from 'graphql-yoga'

export const pubsub = createPubSub<{
  'post:created': [{ postCreated: Post }]
  'post:published': [{ postPublished: Post }]
}>()

// src/resolvers/subscription.ts
import { pubsub } from '../pubsub'

export const subscriptionResolvers = {
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.subscribe('post:created')
    },
    postPublished: {
      subscribe: () => pubsub.subscribe('post:published')
    }
  }
}

// Mutationでイベントを発行
export const postResolvers = {
  Mutation: {
    createPost: async (
      _parent: unknown,
      args: { input: CreatePostInput },
      context: Context
    ) => {
      const post = await context.db.post.create({
        data: {
          ...args.input,
          authorId: context.currentUser!.id,
          published: false
        }
      })

      // サブスクリプションに通知
      pubsub.publish('post:created', { postCreated: post })

      return post
    },

    publishPost: async (
      _parent: unknown,
      args: { id: string },
      context: Context
    ) => {
      const post = await context.db.post.update({
        where: { id: args.id },
        data: { published: true }
      })

      // サブスクリプションに通知
      pubsub.publish('post:published', { postPublished: post })

      return post
    }
  }
}

// クライアント側（GraphQL over WebSocket）
import { createClient } from 'graphql-ws'

const client = createClient({
  url: 'ws://localhost:4000/graphql'
})

const unsubscribe = client.subscribe(
  {
    query: `
      subscription {
        postCreated {
          id
          title
          author {
            name
          }
        }
      }
    `
  },
  {
    next: (data) => {
      console.log('New post:', data)
    },
    error: (error) => {
      console.error('Subscription error:', error)
    },
    complete: () => {
      console.log('Subscription completed')
    }
  }
)
```

## 認証・認可

### JWT認証の実装

```typescript
// src/auth.ts
import jwt from 'jsonwebtoken'
import type { YogaInitialContext } from 'graphql-yoga'

interface JWTPayload {
  userId: string
}

export async function authenticate(context: YogaInitialContext) {
  const authorization = context.request.headers.get('authorization')

  if (!authorization) {
    return null
  }

  const token = authorization.replace('Bearer ', '')

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload

    // データベースからユーザー取得
    const user = await context.db.user.findUnique({
      where: { id: payload.userId }
    })

    return user
  } catch (error) {
    return null
  }
}

// src/server.ts
import { createYoga } from 'graphql-yoga'
import { authenticate } from './auth'
import { db } from './db'

const yoga = createYoga({
  schema: {
    typeDefs,
    resolvers
  },
  context: async (initialContext) => {
    const currentUser = await authenticate(initialContext)

    return {
      ...initialContext,
      db,
      currentUser
    }
  }
})
```

### ロールベース認可

```typescript
// src/directives/auth.ts
import { GraphQLError } from 'graphql'
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'

export function authDirective(directiveName: string) {
  return (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0]

        if (authDirective) {
          const { requires } = authDirective
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            if (!context.currentUser) {
              throw new GraphQLError('Not authenticated', {
                extensions: { code: 'UNAUTHENTICATED' }
              })
            }

            if (requires && !requires.includes(context.currentUser.role)) {
              throw new GraphQLError('Not authorized', {
                extensions: { code: 'FORBIDDEN' }
              })
            }

            return resolve(source, args, context, info)
          }
        }

        return fieldConfig
      }
    })
  }
}

// スキーマでの使用
const typeDefs = /* GraphQL */ `
  directive @auth(requires: [Role!]) on FIELD_DEFINITION

  type Mutation {
    deleteUser(id: ID!): Boolean! @auth(requires: [ADMIN])
    updatePost(id: ID!): Post! @auth
  }
`
```

## エラーハンドリング

```typescript
import { GraphQLError } from 'graphql'
import { createYoga } from 'graphql-yoga'

const yoga = createYoga({
  schema: {
    typeDefs,
    resolvers
  },
  maskedErrors: process.env.NODE_ENV === 'production',
  plugins: [
    {
      onExecute({ args }) {
        // グローバルエラーハンドリング
      }
    }
  ]
})

// カスタムエラークラス
export class ValidationError extends GraphQLError {
  constructor(message: string, field?: string) {
    super(message, {
      extensions: {
        code: 'VALIDATION_ERROR',
        field
      }
    })
  }
}

export class NotFoundError extends GraphQLError {
  constructor(resource: string) {
    super(`${resource} not found`, {
      extensions: {
        code: 'NOT_FOUND',
        resource
      }
    })
  }
}

// 使用例
if (!user) {
  throw new NotFoundError('User')
}

if (email.length < 5) {
  throw new ValidationError('Email must be at least 5 characters', 'email')
}
```

## まとめ

GraphQL Yogaを使用することで:

1. **軽量・高速** - 最小限のオーバーヘッド
2. **モダンなDX** - 直感的なAPI、TypeScript完全対応
3. **柔軟性** - あらゆる環境で動作
4. **豊富な機能** - サブスクリプション、認証、プラグイン

Apollo Serverからの移行や新規プロジェクトで、GraphQL Yogaは優れた選択肢となります。
---

## 関連記事

- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
- [フリーランスエンジニアの収入完全ガイド2026【平均年収・単価・案件獲得】](/blog/2026-03-11-freelance-engineer-income-guide)
- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
