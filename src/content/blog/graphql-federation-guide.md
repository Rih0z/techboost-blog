---
title: "GraphQL Federation入門 — マイクロサービスのスキーマ統合"
description: "Apollo Federation 2でマイクロサービスのGraphQLスキーマを統合する方法を解説。サブグラフ設計、ゲートウェイ構築、エンティティ解決、パフォーマンス最適化まで実践的にガイドします。GraphQL・Apollo Federation・マイクロサービスに関する実践情報。"
pubDate: "2026-02-05"
tags: ["GraphQL", "Apollo Federation", "マイクロサービス", "API", "分散システム", "プログラミング"]
heroImage: '../../assets/thumbnails/graphql-federation-guide.jpg'
---
GraphQL Federationは、複数のGraphQLサービスを統合して1つの統一されたGraphQLスキーマを提供する技術です。この記事では、Apollo Federation 2を使ったマイクロサービスアーキテクチャの実装方法を解説します。

## GraphQL Federationとは

GraphQL Federationは、複数の独立したGraphQLサービス（サブグラフ）を統合し、単一のGraphQL API（スーパーグラフ）として公開する仕組みです。

**主なメリット:**

- **関心の分離**: 各チームが独立してサブグラフを開発
- **段階的な移行**: 既存のモノリスから徐々に移行可能
- **型の共有**: エンティティを複数のサブグラフで拡張
- **スケーラビリティ**: サブグラフごとに独立してスケール

## アーキテクチャ概要

```
クライアント
    ↓
ゲートウェイ（Router）
    ↓
├── Users サブグラフ
├── Products サブグラフ
└── Reviews サブグラフ
```

## サブグラフの構築

### セットアップ

```bash
npm install @apollo/server @apollo/subgraph graphql
```

### Users サブグラフ

```typescript
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

// スキーマ定義
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@shareable"])

  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`;

// リゾルバ
const resolvers = {
  Query: {
    user: (_: any, { id }: { id: string }) => {
      return getUserById(id);
    },
    users: () => {
      return getAllUsers();
    },
  },
  User: {
    __resolveReference: (reference: { id: string }) => {
      return getUserById(reference.id);
    },
  },
};

// サブグラフサーバー
const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

await server.start();
```

### Products サブグラフ

```typescript
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@external", "@requires"])

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    price: Float!
    seller: User!
  }

  # 他のサブグラフで定義されたエンティティを参照
  type User @key(fields: "id", resolvable: false) {
    id: ID!
  }

  type Query {
    product(id: ID!): Product
    products: [Product!]!
  }
`;

const resolvers = {
  Query: {
    product: (_: any, { id }: { id: string }) => {
      return getProductById(id);
    },
    products: () => {
      return getAllProducts();
    },
  },
  Product: {
    __resolveReference: (reference: { id: string }) => {
      return getProductById(reference.id);
    },
    seller: (product: { sellerId: string }) => {
      // 他のサブグラフのエンティティを参照
      return { __typename: 'User', id: product.sellerId };
    },
  },
};
```

### Reviews サブグラフ

```typescript
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@external", "@requires"])

  type Review {
    id: ID!
    rating: Int!
    comment: String!
    author: User!
    product: Product!
  }

  # 既存のエンティティを拡張
  extend type User @key(fields: "id") {
    id: ID! @external
    reviews: [Review!]!
  }

  extend type Product @key(fields: "id") {
    id: ID! @external
    reviews: [Review!]!
    averageRating: Float!
  }

  type Query {
    review(id: ID!): Review
  }
`;

const resolvers = {
  User: {
    reviews: (user: { id: string }) => {
      return getReviewsByUserId(user.id);
    },
  },
  Product: {
    reviews: (product: { id: string }) => {
      return getReviewsByProductId(product.id);
    },
    averageRating: async (product: { id: string }) => {
      const reviews = await getReviewsByProductId(product.id);
      if (reviews.length === 0) return 0;
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      return sum / reviews.length;
    },
  },
  Review: {
    author: (review: { authorId: string }) => {
      return { __typename: 'User', id: review.authorId };
    },
    product: (review: { productId: string }) => {
      return { __typename: 'Product', id: review.productId };
    },
  },
};
```

## ゲートウェイの構築

Apollo Routerを使用してサブグラフを統合します。

### インストール

```bash
# Apollo Routerのバイナリをダウンロード
curl -sSL https://router.apollo.dev/download/nix/latest | sh
```

### 設定ファイル

```yaml
# router-config.yaml
supergraph:
  listen: 0.0.0.0:4000

subgraphs:
  users:
    routing_url: http://localhost:4001/graphql
  products:
    routing_url: http://localhost:4002/graphql
  reviews:
    routing_url: http://localhost:4003/graphql

telemetry:
  tracing:
    enabled: true
```

### スーパーグラフスキーマの生成

```bash
# Rover CLIをインストール
npm install -g @apollo/rover

# スーパーグラフスキーマを生成
rover supergraph compose --config ./supergraph.yaml > supergraph-schema.graphql
```

```yaml
# supergraph.yaml
subgraphs:
  users:
    routing_url: http://localhost:4001/graphql
    schema:
      file: ./schemas/users.graphql
  products:
    routing_url: http://localhost:4002/graphql
    schema:
      file: ./schemas/products.graphql
  reviews:
    routing_url: http://localhost:4003/graphql
    schema:
      file: ./schemas/reviews.graphql
```

### ゲートウェイの起動

```bash
./router --config router-config.yaml --supergraph supergraph-schema.graphql
```

## クエリの実行

クライアントから統合されたスキーマをクエリできます。

```graphql
query GetProductDetails($productId: ID!) {
  product(id: $productId) {
    id
    name
    price
    # Usersサブグラフから解決
    seller {
      id
      name
      email
    }
    # Reviewsサブグラフから解決
    reviews {
      id
      rating
      comment
      author {
        name
      }
    }
    averageRating
  }
}
```

## エンティティ解決の仕組み

### @key ディレクティブ

エンティティを一意に識別するフィールドを指定します。

```graphql
type User @key(fields: "id") {
  id: ID!
  name: String!
}
```

### __resolveReference

他のサブグラフからエンティティが参照されたときに呼ばれます。

```typescript
User: {
  __resolveReference: async (reference: { id: string }) => {
    return await db.user.findUnique({ where: { id: reference.id } });
  },
}
```

### 複合キー

複数フィールドの組み合わせをキーにできます。

```graphql
type Product @key(fields: "id category") {
  id: ID!
  category: String!
  name: String!
}
```

## データローダーによる最適化

N+1問題を解決するためにDataLoaderを使用します。

```typescript
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (userIds: readonly string[]) => {
  const users = await db.user.findMany({
    where: { id: { in: [...userIds] } },
  });

  // IDの順序を保つ
  const userMap = new Map(users.map(u => [u.id, u]));
  return userIds.map(id => userMap.get(id));
});

// リゾルバで使用
User: {
  __resolveReference: (reference: { id: string }) => {
    return userLoader.load(reference.id);
  },
}
```

## エラーハンドリング

サブグラフのエラーを適切に処理します。

```typescript
import { GraphQLError } from 'graphql';

const resolvers = {
  Query: {
    product: async (_: any, { id }: { id: string }) => {
      try {
        const product = await getProductById(id);
        if (!product) {
          throw new GraphQLError('Product not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        return product;
      } catch (error) {
        throw new GraphQLError('Failed to fetch product', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
          originalError: error,
        });
      }
    },
  },
};
```

## 認証・認可

コンテキストを通じてユーザー情報を共有します。

```typescript
// ゲートウェイ
const server = new ApolloServer({
  schema,
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await verifyToken(token);
    return { user };
  },
});

// サブグラフのリゾルバ
const resolvers = {
  Query: {
    me: (_: any, __: any, context: { user: User }) => {
      if (!context.user) {
        throw new GraphQLError('Unauthenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return context.user;
    },
  },
};
```

## モニタリング

Apollo Studioでパフォーマンスを監視できます。

```typescript
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';

const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginUsageReporting({
      apiKey: process.env.APOLLO_KEY,
    }),
  ],
});
```

## ベストプラクティス

### 1. サブグラフの責任分離

各サブグラフは明確な責任を持つべきです。

- **良い**: Users, Products, Orders
- **悪い**: UserProducts（複数の関心事）

### 2. エンティティの適切な配置

エンティティの「所有者」を決めます。

```graphql
# Users サブグラフ（所有者）
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

# Orders サブグラフ（拡張）
extend type User @key(fields: "id") {
  orders: [Order!]!
}
```

### 3. 段階的ロールアウト

Apollo Routerの機能を使って段階的に新機能をリリースします。

```yaml
# router-config.yaml
traffic_shaping:
  experimental_enable_defer: true
  experimental_enable_progressive_override: true
```

---

## 関連記事

- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026](/blog/2026-03-09-engineer-career-change-guide-2026)

## まとめ

GraphQL Federationは、大規模なGraphQL APIを構築するための強力なツールです。

**主なポイント:**
- サブグラフで責任を分離
- エンティティを複数のサブグラフで拡張
- DataLoaderでパフォーマンス最適化
- Apollo Routerで統合・監視

適切に設計すれば、マイクロサービスアーキテクチャでも型安全で使いやすいAPIを提供できます。
