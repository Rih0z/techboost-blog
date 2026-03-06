---
title: "GraphQL Federation v2実践ガイド - マイクロサービスの型安全なAPI統合"
description: "Apollo Federation v2を使ったマイクロサービスアーキテクチャの構築完全ガイド。スキーマ共有、エンティティ連携、パフォーマンス最適化、実践的なデザインパターンまで徹底解説。GraphQL・Federation・Microservicesに関する実践情報。"
pubDate: "2025-06-22"
updatedDate: "2025-06-22"
category: "API"
tags: ["GraphQL", "Federation", "Microservices", "Apollo", "Architecture", "プログラミング"]
---
## はじめに

GraphQL Federation v2は、複数のGraphQLサービスを単一の統合グラフとして公開するためのアーキテクチャパターンです。2026年現在、マイクロサービス間の型安全なAPI統合のデファクトスタンダードとなっており、Netflix、Shopify、GitHubなど大規模サービスで採用されています。

### Federation v2とは

```
従来のモノリシックGraphQL:
┌─────────────────────┐
│  Single GraphQL     │
│  Server             │
│  - Users            │
│  - Products         │
│  - Orders           │
│  - Reviews          │
└─────────────────────┘

Federation v2:
         ┌──────────────┐
         │   Gateway    │ ← 単一エンドポイント
         └──────────────┘
              ↓ ↓ ↓ ↓
    ┌─────┬─────┬─────┬─────┐
    │Users│Prod │Order│Revw │ ← 独立したサブグラフ
    └─────┴─────┴─────┴─────┘

メリット:
✅ マイクロサービスごとに独立開発
✅ 型安全な連携
✅ 段階的な移行が可能
✅ スキーマの再利用
✅ チーム境界が明確
```

### v1からv2への主な変更点

```
Federation v1 → v2 の改善:

1. @shareable
   - 複数サブグラフで同じ型を定義可能

2. @inaccessible
   - 内部実装を隠蔽

3. @interfaceObject
   - インターフェース型の連携

4. @override
   - 段階的マイグレーション

5. Progressive @override
   - カナリアデプロイ対応

6. Composition Hints
   - より柔軟なスキーマ合成
```

## セットアップ

### 前提条件

```bash
# Node.js 18以上
node --version

# パッケージインストール
npm install @apollo/server @apollo/subgraph @apollo/gateway graphql
```

### プロジェクト構造

```
graphql-federation/
├── gateway/          # Apollo Gateway
│   └── index.ts
├── subgraphs/
│   ├── users/        # ユーザーサービス
│   │   └── index.ts
│   ├── products/     # 商品サービス
│   │   └── index.ts
│   └── reviews/      # レビューサービス
│       └── index.ts
└── shared/
    └── types.ts      # 共通型定義
```

## サブグラフの作成

### サブグラフ1: Users Service

```typescript
// subgraphs/users/index.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

// スキーマ定義
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable"])

  type User @key(fields: "id") {
    id: ID!
    email: String!
    name: String!
    createdAt: String!
  }

  type Query {
    me: User
    user(id: ID!): User
    users: [User!]!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
  }

  input CreateUserInput {
    email: String!
    name: String!
  }
`;

// ダミーデータ
const users = [
  { id: '1', email: 'alice@example.com', name: 'Alice', createdAt: '2024-01-01' },
  { id: '2', email: 'bob@example.com', name: 'Bob', createdAt: '2024-01-02' },
];

// リゾルバ
const resolvers = {
  Query: {
    me: () => users[0],
    user: (_: any, { id }: { id: string }) => users.find((u) => u.id === id),
    users: () => users,
  },
  Mutation: {
    createUser: (_: any, { input }: { input: any }) => {
      const newUser = {
        id: String(users.length + 1),
        ...input,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      return newUser;
    },
  },
  User: {
    // エンティティリゾルバ（他のサブグラフから参照される）
    __resolveReference: (reference: { id: string }) => {
      return users.find((u) => u.id === reference.id);
    },
  },
};

// サーバー起動
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4001 } }).then(({ url }) => {
  console.log(`Users service ready at ${url}`);
});
```

### サブグラフ2: Products Service

```typescript
// subgraphs/products/index.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable", "@external"])

  # 他のサブグラフで定義されたUserを参照
  type User @key(fields: "id") {
    id: ID!
    products: [Product!]! @requires(fields: "id")
  }

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    price: Int!
    sellerId: ID!
    seller: User!
  }

  type Query {
    product(id: ID!): Product
    products: [Product!]!
  }

  type Mutation {
    createProduct(input: CreateProductInput!): Product!
  }

  input CreateProductInput {
    name: String!
    price: Int!
    sellerId: ID!
  }
`;

const products = [
  { id: '1', name: 'Product A', price: 1000, sellerId: '1' },
  { id: '2', name: 'Product B', price: 2000, sellerId: '1' },
  { id: '3', name: 'Product C', price: 3000, sellerId: '2' },
];

const resolvers = {
  Query: {
    product: (_: any, { id }: { id: string }) => products.find((p) => p.id === id),
    products: () => products,
  },
  Mutation: {
    createProduct: (_: any, { input }: { input: any }) => {
      const newProduct = {
        id: String(products.length + 1),
        ...input,
      };
      products.push(newProduct);
      return newProduct;
    },
  },
  Product: {
    __resolveReference: (reference: { id: string }) => {
      return products.find((p) => p.id === reference.id);
    },
    seller: (product: any) => {
      return { __typename: 'User', id: product.sellerId };
    },
  },
  User: {
    products: (user: { id: string }) => {
      return products.filter((p) => p.sellerId === user.id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4002 } }).then(({ url }) => {
  console.log(`Products service ready at ${url}`);
});
```

### サブグラフ3: Reviews Service

```typescript
// subgraphs/reviews/index.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

  type Product @key(fields: "id") {
    id: ID!
    reviews: [Review!]!
    averageRating: Float
  }

  type User @key(fields: "id") {
    id: ID!
    reviews: [Review!]!
  }

  type Review @key(fields: "id") {
    id: ID!
    productId: ID!
    userId: ID!
    rating: Int!
    comment: String!
    createdAt: String!
  }

  type Query {
    review(id: ID!): Review
    reviews: [Review!]!
  }

  type Mutation {
    createReview(input: CreateReviewInput!): Review!
  }

  input CreateReviewInput {
    productId: ID!
    userId: ID!
    rating: Int!
    comment: String!
  }
`;

const reviews = [
  { id: '1', productId: '1', userId: '2', rating: 5, comment: 'Great!', createdAt: '2024-02-01' },
  { id: '2', productId: '1', userId: '1', rating: 4, comment: 'Good', createdAt: '2024-02-02' },
  { id: '3', productId: '2', userId: '2', rating: 3, comment: 'OK', createdAt: '2024-02-03' },
];

const resolvers = {
  Query: {
    review: (_: any, { id }: { id: string }) => reviews.find((r) => r.id === id),
    reviews: () => reviews,
  },
  Mutation: {
    createReview: (_: any, { input }: { input: any }) => {
      const newReview = {
        id: String(reviews.length + 1),
        ...input,
        createdAt: new Date().toISOString(),
      };
      reviews.push(newReview);
      return newReview;
    },
  },
  Product: {
    reviews: (product: { id: string }) => {
      return reviews.filter((r) => r.productId === product.id);
    },
    averageRating: (product: { id: string }) => {
      const productReviews = reviews.filter((r) => r.productId === product.id);
      if (productReviews.length === 0) return null;
      const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
      return sum / productReviews.length;
    },
  },
  User: {
    reviews: (user: { id: string }) => {
      return reviews.filter((r) => r.userId === user.id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4003 } }).then(({ url }) => {
  console.log(`Reviews service ready at ${url}`);
});
```

## Gateway構築

### Apollo Gateway v2

```typescript
// gateway/index.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';

// サブグラフの情報
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'users', url: 'http://localhost:4001' },
      { name: 'products', url: 'http://localhost:4002' },
      { name: 'reviews', url: 'http://localhost:4003' },
    ],
  }),
});

const server = new ApolloServer({
  gateway,
});

startStandaloneServer(server, { listen: { port: 4000 } }).then(({ url }) => {
  console.log(`Gateway ready at ${url}`);
});
```

### Rover CLIでスキーマ管理

```bash
# Rover CLI インストール
npm install -g @apollo/rover

# スーパーグラフスキーマ生成
rover supergraph compose \
  --config ./supergraph-config.yaml \
  --output ./supergraph.graphql
```

```yaml
# supergraph-config.yaml
federation_version: =2.3.0
subgraphs:
  users:
    routing_url: http://localhost:4001
    schema:
      file: ./subgraphs/users/schema.graphql
  products:
    routing_url: http://localhost:4002
    schema:
      file: ./subgraphs/products/schema.graphql
  reviews:
    routing_url: http://localhost:4003
    schema:
      file: ./subgraphs/reviews/schema.graphql
```

## 実践的なクエリパターン

### 基本クエリ

```graphql
# 単一サブグラフのクエリ
query GetUsers {
  users {
    id
    name
    email
  }
}

# 複数サブグラフにまたがるクエリ
query GetUserWithProducts {
  user(id: "1") {
    id
    name
    products {  # Products サブグラフ
      id
      name
      price
      reviews {  # Reviews サブグラフ
        rating
        comment
      }
    }
  }
}
```

### エンティティ連携

```graphql
# 商品とレビューと出品者を一度に取得
query GetProductDetails {
  product(id: "1") {
    id
    name
    price
    averageRating
    seller {
      id
      name
      products {
        id
        name
      }
    }
    reviews {
      id
      rating
      comment
      user {
        name
      }
    }
  }
}
```

### バッチクエリ

```graphql
# DataLoaderで自動最適化される
query GetMultipleProducts {
  products {
    id
    name
    seller {
      name
    }
  }
}
```

## 高度なディレクティブ

### @shareable - 共有型定義

```graphql
# subgraph A
type Money @shareable {
  amount: Int!
  currency: String!
}

# subgraph B
type Money @shareable {
  amount: Int!
  currency: String!
}
```

```typescript
// 両方のサブグラフで同じ型を定義可能
// Gatewayが自動でマージ
```

### @inaccessible - 内部実装を隠す

```graphql
type User @key(fields: "id") {
  id: ID!
  email: String!
  passwordHash: String! @inaccessible  # Gatewayに公開しない
}
```

### @override - 段階的移行

```graphql
# Old service
type Product @key(fields: "id") {
  id: ID!
  inventory: Int!
}

# New service
type Product @key(fields: "id") {
  id: ID!
  inventory: Int! @override(from: "old-service")
}
```

```typescript
// トラフィックを徐々に新サービスに移行
// カナリアリリースに対応
```

### @interfaceObject - インターフェース連携

```graphql
# Products service
interface Node {
  id: ID!
}

type Product implements Node @key(fields: "id") {
  id: ID!
  name: String!
}

# Search service
type Node @interfaceObject @key(fields: "id") {
  id: ID!
  searchRelevance: Float!
}
```

## パフォーマンス最適化

### DataLoader統合

```typescript
// utils/dataloader.ts
import DataLoader from 'dataloader';

export function createUserLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const users = await fetchUsersByIds(ids);
    return ids.map((id) => users.find((u) => u.id === id));
  });
}

// subgraphs/products/index.ts
const resolvers = {
  Product: {
    seller: (product: any, _: any, context: any) => {
      return context.dataloaders.users.load(product.sellerId);
    },
  },
};
```

### クエリ分析とコスト制限

```typescript
// gateway/index.ts
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

const server = new ApolloServer({
  gateway,
  plugins: [
    // クエリ複雑度制限
    {
      async requestDidStart() {
        return {
          async didResolveOperation(requestContext) {
            const complexity = calculateComplexity(requestContext.document);
            if (complexity > 1000) {
              throw new Error('Query too complex');
            }
          },
        };
      },
    },
    ApolloServerPluginLandingPageLocalDefault({ embed: true }),
  ],
});
```

### レスポンスキャッシュ

```typescript
import { ApolloServer } from '@apollo/server';
import { KeyvAdapter } from '@apollo/utils.keyvadapter';
import Keyv from 'keyv';

const server = new ApolloServer({
  gateway,
  cache: new KeyvAdapter(new Keyv('redis://localhost:6379')),
});
```

## テストとCI/CD

### スキーマチェック

```bash
# Apollo Studioを使ったスキーマチェック
rover subgraph check my-graph@main \
  --schema ./schema.graphql \
  --name users

# ローカルでのスキーマバリデーション
rover supergraph compose \
  --config ./supergraph-config.yaml
```

### E2Eテスト

```typescript
// __tests__/federation.test.ts
import { ApolloServer } from '@apollo/server';
import { ApolloGateway } from '@apollo/gateway';
import { startStandaloneServer } from '@apollo/server/standalone';

describe('Federation E2E', () => {
  let gateway: ApolloGateway;
  let server: ApolloServer;

  beforeAll(async () => {
    gateway = new ApolloGateway({
      supergraphSdl: await loadSupergraphSdl(),
    });

    server = new ApolloServer({ gateway });
    await startStandaloneServer(server, { listen: { port: 0 } });
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should fetch user with products', async () => {
    const result = await server.executeOperation({
      query: `
        query {
          user(id: "1") {
            name
            products {
              name
            }
          }
        }
      `,
    });

    expect(result.body.kind).toBe('single');
    expect(result.body.singleResult.data).toMatchObject({
      user: {
        name: 'Alice',
        products: expect.arrayContaining([
          expect.objectContaining({ name: 'Product A' }),
        ]),
      },
    });
  });
});
```

## まとめ

### Federation v2の強み

1. **自律性**: 各チームが独立して開発
2. **型安全性**: エンドツーエンドで型チェック
3. **段階的移行**: @overrideで安全にマイグレーション
4. **パフォーマンス**: DataLoaderで自動最適化

### ベストプラクティス

- エンティティは必ず@keyディレクティブを付ける
- 共有型は@shareableで明示
- スキーマチェックをCI/CDに組み込む
- DataLoaderでN+1問題を回避
- Roverで継続的なスキーマ検証

### いつ使うべきか

**最適な用途**:
- マイクロサービスアーキテクチャ
- 複数チームでの開発
- 既存APIの統合
- ドメイン駆動設計

**不向きな用途**:
- 小規模プロジェクト（オーバーエンジニアリング）
- RESTで十分なケース
- リアルタイムストリーミング中心

### 次のステップ

- Apollo Federation: https://www.apollographql.com/docs/federation/
- Rover CLI: https://www.apollographql.com/docs/rover/
- Apollo Studio: https://studio.apollographql.com/
- GraphQL Code Generator: https://the-guild.dev/graphql/codegen

GraphQL Federationで、スケーラブルなマイクロサービスアーキテクチャを構築しましょう。
