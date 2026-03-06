---
title: "API バージョニング戦略: REST/GraphQLのバージョン管理ベストプラクティス"
description: "REST APIとGraphQL APIのバージョニング戦略を徹底比較。URL、ヘッダー、クエリパラメータ、スキーマベースなど各手法の実装例と運用ノウハウを解説します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-10-22"
updatedDate: "2025-10-22"
tags: ["API", "バージョニング", "REST", "GraphQL", "アーキテクチャ", "プログラミング"]
---
APIのバージョニングは、後方互換性を保ちながら機能を進化させるための重要な設計要素です。本記事では、REST APIとGraphQL APIそれぞれのバージョニング戦略と、実践的な運用方法を解説します。

## バージョニングが必要な理由

APIを公開すると、複数のクライアントが異なるバージョンを使用する状況が必ず発生します。

```typescript
// 問題: 破壊的変更をそのままリリース
// Before (v1)
interface User {
  id: string
  name: string
  email: string
}

// After: 破壊的変更
interface User {
  id: string
  fullName: string // name から変更
  emailAddress: string // email から変更
  createdAt: string // 新規追加
}

// 既存のクライアントが壊れる
const user = await api.getUser('123')
console.log(user.name) // undefined - エラー！
```

バージョニングを適切に行えば、この問題を回避できます。

## REST APIのバージョニング戦略

### 1. URLパスバージョニング（最も一般的）

URLにバージョン番号を含める方法です。

```typescript
// Express + TypeScript 実装例
import express from 'express'

const app = express()

// v1 API
app.get('/api/v1/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id)
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
  })
})

// v2 API - フィールド名を変更
app.get('/api/v2/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id)
  res.json({
    id: user.id,
    fullName: user.fullName,
    emailAddress: user.email,
    createdAt: user.createdAt,
  })
})

// v1とv2で共通のビジネスロジックを共有
async function getUserById(id: string) {
  return db.users.findById(id)
}
```

**メリット:**
- 明示的で分かりやすい
- キャッシュが効きやすい
- ドキュメント化しやすい

**デメリット:**
- URLが変わるため、既存リンクが無効になる
- バージョンごとにエンドポイントを維持する必要がある

### 2. ヘッダーバージョニング

カスタムヘッダーまたはAcceptヘッダーでバージョンを指定します。

```typescript
// ミドルウェアでバージョンを判定
import express from 'express'

const app = express()

app.get('/api/users/:id', async (req, res) => {
  const version = req.headers['api-version'] || '1'
  const user = await db.users.findById(req.params.id)

  if (version === '1') {
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
    })
  } else if (version === '2') {
    res.json({
      id: user.id,
      fullName: user.fullName,
      emailAddress: user.email,
      createdAt: user.createdAt,
    })
  } else {
    res.status(400).json({ error: 'Unsupported API version' })
  }
})

// クライアント側
fetch('/api/users/123', {
  headers: {
    'API-Version': '2',
  },
})
```

Content Negotiationを使う方法もあります。

```typescript
app.get('/api/users/:id', async (req, res) => {
  const accept = req.headers['accept']
  const user = await db.users.findById(req.params.id)

  if (accept?.includes('application/vnd.myapi.v1+json')) {
    res.json({ id: user.id, name: user.name, email: user.email })
  } else if (accept?.includes('application/vnd.myapi.v2+json')) {
    res.json({
      id: user.id,
      fullName: user.fullName,
      emailAddress: user.email,
      createdAt: user.createdAt,
    })
  } else {
    res.status(406).json({ error: 'Not Acceptable' })
  }
})

// クライアント側
fetch('/api/users/123', {
  headers: {
    'Accept': 'application/vnd.myapi.v2+json',
  },
})
```

**メリット:**
- URLが変わらない
- RESTの原則に忠実

**デメリット:**
- デバッグが難しい
- ブラウザで直接テストしにくい
- CDNキャッシュの設定が複雑

### 3. クエリパラメータバージョニング

```typescript
app.get('/api/users/:id', async (req, res) => {
  const version = req.query.version || '1'
  const user = await db.users.findById(req.params.id)

  if (version === '1') {
    res.json({ id: user.id, name: user.name, email: user.email })
  } else if (version === '2') {
    res.json({
      id: user.id,
      fullName: user.fullName,
      emailAddress: user.email,
      createdAt: user.createdAt,
    })
  }
})

// クライアント側
fetch('/api/users/123?version=2')
```

**メリット:**
- 簡単に実装できる
- デバッグしやすい

**デメリット:**
- RESTの原則に反する
- URLが汚くなる

## 実践: モジュラー設計によるバージョン管理

実際のプロジェクトでは、バージョンごとにコードを完全に分離する設計が推奨されます。

```typescript
// src/api/versions.ts
export type ApiVersion = '1' | '2'

export function getApiVersion(req: Request): ApiVersion {
  const pathVersion = req.path.match(/\/api\/v(\d+)\//)
  if (pathVersion) {
    return pathVersion[1] as ApiVersion
  }
  return '1' // デフォルト
}

// src/api/v1/users.ts
import { Router } from 'express'
import { UserService } from '../../services/user.service'

const router = Router()

router.get('/:id', async (req, res) => {
  const user = await UserService.findById(req.params.id)

  // V1のレスポンス形式
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
  })
})

export default router

// src/api/v2/users.ts
import { Router } from 'express'
import { UserService } from '../../services/user.service'
import { z } from 'zod'

const router = Router()

// V2では検証も強化
const userResponseSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  emailAddress: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
})

router.get('/:id', async (req, res) => {
  const user = await UserService.findById(req.params.id)

  // V2のレスポンス形式
  const response = userResponseSchema.parse({
    id: user.id,
    fullName: user.fullName,
    emailAddress: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt?.toISOString(),
  })

  res.json(response)
})

export default router

// src/api/index.ts
import express from 'express'
import v1Users from './v1/users'
import v2Users from './v2/users'

const app = express()

// バージョンごとにルーターをマウント
app.use('/api/v1/users', v1Users)
app.use('/api/v2/users', v2Users)

export default app
```

## GraphQL APIのバージョニング戦略

GraphQLでは、スキーマの進化を前提とした設計が推奨されます。

### 1. スキーマ進化（推奨）

GraphQLでは明示的なバージョニングではなく、スキーマの進化で対応します。

```graphql
# 非推奨フィールドをマーク
type User {
  id: ID!
  name: String! @deprecated(reason: "Use fullName instead")
  fullName: String!
  email: String! @deprecated(reason: "Use emailAddress instead")
  emailAddress: String!
  createdAt: DateTime!
}
```

```typescript
// TypeScriptでの実装
import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql'

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },

    // 古いフィールド（非推奨）
    name: {
      type: new GraphQLNonNull(GraphQLString),
      deprecationReason: 'Use fullName instead',
      resolve: (user) => user.fullName,
    },

    // 新しいフィールド
    fullName: {
      type: new GraphQLNonNull(GraphQLString),
    },

    // 古いフィールド（非推奨）
    email: {
      type: new GraphQLNonNull(GraphQLString),
      deprecationReason: 'Use emailAddress instead',
      resolve: (user) => user.emailAddress,
    },

    // 新しいフィールド
    emailAddress: {
      type: new GraphQLNonNull(GraphQLString),
    },

    createdAt: {
      type: new GraphQLNonNull(GraphQLString),
    },
  },
})
```

### 2. フィールド追加による進化

```graphql
# 古いクエリ（V1相当）
query GetUser {
  user(id: "123") {
    id
    name
    email
  }
}

# 新しいクエリ（V2相当）
query GetUser {
  user(id: "123") {
    id
    fullName
    emailAddress
    createdAt
  }
}

# 両方のフィールドを取得することも可能
query GetUser {
  user(id: "123") {
    id
    name # 非推奨だが使用可能
    fullName
    email # 非推奨だが使用可能
    emailAddress
    createdAt
  }
}
```

### 3. 引数による条件分岐

```graphql
type Query {
  users(
    first: Int
    after: String
    filter: UserFilter
    # バージョンを引数で指定（非推奨の方法）
    version: ApiVersion = V2
  ): UserConnection!
}

enum ApiVersion {
  V1
  V2
}
```

```typescript
import { GraphQLObjectType, GraphQLEnumType } from 'graphql'

const ApiVersionEnum = new GraphQLEnumType({
  name: 'ApiVersion',
  values: {
    V1: { value: 1 },
    V2: { value: 2 },
  },
})

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    users: {
      args: {
        version: {
          type: ApiVersionEnum,
          defaultValue: 2,
        },
      },
      resolve: async (_, args) => {
        const users = await db.users.findAll()

        if (args.version === 1) {
          // V1形式で返す
          return users.map((user) => ({
            id: user.id,
            name: user.fullName,
            email: user.emailAddress,
          }))
        }

        // V2形式で返す
        return users
      },
    },
  },
})
```

### 4. スキーマの完全分離（非推奨だが大規模変更時は有効）

```typescript
// src/graphql/v1/schema.ts
import { makeExecutableSchema } from '@graphql-tools/schema'

const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    user(id: ID!): User
  }
`

const resolvers = {
  Query: {
    user: async (_, { id }) => {
      const user = await db.users.findById(id)
      return {
        id: user.id,
        name: user.fullName,
        email: user.emailAddress,
      }
    },
  },
}

export const schemaV1 = makeExecutableSchema({ typeDefs, resolvers })

// src/graphql/v2/schema.ts
const typeDefs = `
  type User {
    id: ID!
    fullName: String!
    emailAddress: String!
    createdAt: DateTime!
  }

  type Query {
    user(id: ID!): User
  }
`

const resolvers = {
  Query: {
    user: async (_, { id }) => db.users.findById(id),
  },
}

export const schemaV2 = makeExecutableSchema({ typeDefs, resolvers })

// src/server.ts
import { createHandler } from 'graphql-http/lib/use/express'
import { schemaV1 } from './graphql/v1/schema'
import { schemaV2 } from './graphql/v2/schema'

app.use('/graphql/v1', createHandler({ schema: schemaV1 }))
app.use('/graphql/v2', createHandler({ schema: schemaV2 }))
```

## バージョン移行戦略

### 1. 非推奨期間の設定

```typescript
// src/api/deprecation.ts
interface DeprecationInfo {
  version: string
  deprecatedAt: Date
  sunsetAt: Date
  message: string
}

const deprecations: Record<string, DeprecationInfo> = {
  'v1': {
    version: 'v1',
    deprecatedAt: new Date('2025-06-01'),
    sunsetAt: new Date('2026-06-01'),
    message: 'API v1 is deprecated. Please migrate to v2 by June 2026.',
  },
}

export function addDeprecationHeaders(version: string, res: Response) {
  const info = deprecations[version]
  if (!info) return

  const now = new Date()
  if (now >= info.deprecatedAt) {
    res.setHeader('Deprecation', 'true')
    res.setHeader('Sunset', info.sunsetAt.toUTCString())
    res.setHeader('Link', '<https://docs.api.example.com/migration>; rel="deprecation"')
  }
}

// 使用例
app.get('/api/v1/users/:id', async (req, res) => {
  addDeprecationHeaders('v1', res)
  // ...
})
```

### 2. 使用状況の追跡

```typescript
// src/middleware/analytics.ts
import { Request, Response, NextFunction } from 'express'

export function trackApiUsage(req: Request, res: Response, next: NextFunction) {
  const version = getApiVersion(req)
  const endpoint = req.path
  const clientId = req.headers['x-client-id'] as string

  // メトリクスを記録
  metrics.increment('api.request', {
    version,
    endpoint,
    client_id: clientId,
  })

  // 古いバージョン使用時は警告ログ
  if (version === '1') {
    logger.warn('Client using deprecated API v1', {
      clientId,
      endpoint,
      userAgent: req.headers['user-agent'],
    })
  }

  next()
}

app.use(trackApiUsage)
```

### 3. 段階的な移行通知

```typescript
// 移行ダッシュボード用のエンドポイント
app.get('/api/internal/migration-status', async (req, res) => {
  const v1Usage = await metrics.query({
    metric: 'api.request',
    filters: { version: '1' },
    timeRange: 'last_30_days',
  })

  const v2Usage = await metrics.query({
    metric: 'api.request',
    filters: { version: '2' },
    timeRange: 'last_30_days',
  })

  const clientsStillOnV1 = await db.apiKeys.findAll({
    where: {
      lastUsedVersion: '1',
      lastUsedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  })

  res.json({
    v1Requests: v1Usage.total,
    v2Requests: v2Usage.total,
    migrationProgress: v2Usage.total / (v1Usage.total + v2Usage.total),
    clientsStillOnV1: clientsStillOnV1.length,
    sunsetDate: deprecations.v1.sunsetAt,
  })
})
```

## まとめ

APIバージョニングは、長期的な保守性を確保するための重要な戦略です。

**REST APIの推奨戦略:**
- URLパスバージョニング（`/api/v1/`, `/api/v2/`）
- バージョンごとにコードを分離
- 非推奨期間を明示（Deprecation/Sunsetヘッダー）
- 使用状況を追跡し、段階的に移行

**GraphQL APIの推奨戦略:**
- スキーマ進化を優先（`@deprecated`ディレクティブ）
- フィールドの追加は自由に、削除は慎重に
- 大規模な破壊的変更時のみスキーマ分離を検討

**共通のベストプラクティス:**
- セマンティックバージョニングを採用
- 後方互換性を可能な限り維持
- 移行ガイドとサンプルコードを提供
- サンセット日を事前に通知（最低6ヶ月前）
- メトリクスで移行進捗を可視化

適切なバージョニング戦略により、APIの進化とクライアントの安定性を両立できます。
