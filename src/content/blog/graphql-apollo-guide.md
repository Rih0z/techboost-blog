---
title: "GraphQL + Apollo実践ガイド2026"
description: "GraphQLとApollo（Server/Client）でモダンなAPI開発。スキーマ設計、Query/Mutation/Subscription、キャッシュ戦略まで実践的に解説。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2026-02-05"
tags: ["GraphQL", "Apollo", "API", "TypeScript", "React"]
heroImage: '../../assets/thumbnails/graphql-apollo-guide.jpg'
---
GraphQLはRESTの課題を解決する次世代のAPIクエリ言語として、多くの企業で採用されています。本記事では、ApolloというGraphQLのエコシステムを使った実践的な開発方法を解説します。

## GraphQLとは

GraphQLはFacebookが開発したAPIのためのクエリ言語およびランタイムです。

### RESTとの比較

**RESTの課題**:
- Over-fetching: 不要なデータまで取得
- Under-fetching: 複数のエンドポイントへのリクエストが必要
- バージョニングの複雑さ
- ドキュメントの保守

**GraphQLの利点**:
- 必要なデータだけを正確に取得
- 1回のリクエストで複数のリソースを取得
- 強力な型システム
- 自己文書化
- リアルタイム通信（Subscription）

### 基本概念

```graphql
# スキーマ定義
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

type Query {
  user(id: ID!): User
  posts: [Post!]!
}

type Mutation {
  createPost(title: String!, content: String!): Post!
}

type Subscription {
  postAdded: Post!
}
```

```graphql
# クエリ例
query GetUser {
  user(id: "1") {
    name
    email
    posts {
      title
    }
  }
}

# ミューテーション例
mutation CreatePost {
  createPost(title: "Hello", content: "World") {
    id
    title
  }
}

# サブスクリプション例
subscription OnPostAdded {
  postAdded {
    id
    title
    author {
      name
    }
  }
}
```

## Apollo Server セットアップ

Apollo Serverは最も人気のあるGraphQLサーバー実装です。

### インストール

```bash
npm install @apollo/server graphql
```

### 基本的なサーバー

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

// スキーマ定義
const typeDefs = `#graphql
  type Book {
    id: ID!
    title: String!
    author: String!
  }

  type Query {
    books: [Book!]!
    book(id: ID!): Book
  }

  type Mutation {
    addBook(title: String!, author: String!): Book!
  }
`;

// データソース（実際はデータベースを使用）
const books = [
  { id: '1', title: 'The Awakening', author: 'Kate Chopin' },
  { id: '2', title: 'City of Glass', author: 'Paul Auster' },
];

// リゾルバー
const resolvers = {
  Query: {
    books: () => books,
    book: (parent, args) => {
      return books.find(book => book.id === args.id);
    },
  },
  Mutation: {
    addBook: (parent, args) => {
      const newBook = {
        id: String(books.length + 1),
        title: args.title,
        author: args.author,
      };
      books.push(newBook);
      return newBook;
    },
  },
};

// サーバー作成
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// サーバー起動
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀 Server ready at ${url}`);
```

### Expressとの統合

```typescript
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

await server.start();

app.use(
  '/graphql',
  cors<cors.CorsRequest>(),
  bodyParser.json(),
  expressMiddleware(server, {
    context: async ({ req }) => ({
      // コンテキストにユーザー情報などを追加
      token: req.headers.authorization,
    }),
  }),
);

app.listen(4000, () => {
  console.log('Server running on http://localhost:4000/graphql');
});
```

## スキーマ設計

効果的なGraphQLスキーマを設計するためのベストプラクティスです。

### 型定義

```graphql
# スカラー型
scalar Date
scalar Upload

# 列挙型
enum Role {
  ADMIN
  USER
  GUEST
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

# オブジェクト型
type User {
  id: ID!
  username: String!
  email: String!
  role: Role!
  createdAt: Date!
  posts(status: PostStatus): [Post!]!
  profile: UserProfile
}

type UserProfile {
  bio: String
  avatar: String
  website: String
}

type Post {
  id: ID!
  title: String!
  content: String!
  status: PostStatus!
  author: User!
  tags: [Tag!]!
  createdAt: Date!
  updatedAt: Date!
}

type Tag {
  id: ID!
  name: String!
  posts: [Post!]!
}

# 入力型
input CreatePostInput {
  title: String!
  content: String!
  tagIds: [ID!]!
}

input UpdatePostInput {
  title: String
  content: String
  status: PostStatus
  tagIds: [ID!]
}

input PostFilterInput {
  status: PostStatus
  authorId: ID
  tagIds: [ID!]
}

# ページネーション
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type PostEdge {
  cursor: String!
  node: Post!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

# クエリ
type Query {
  # 単一リソース取得
  user(id: ID!): User
  post(id: ID!): Post

  # リスト取得
  users(limit: Int, offset: Int): [User!]!
  posts(
    filter: PostFilterInput
    first: Int
    after: String
    last: Int
    before: String
  ): PostConnection!

  # 検索
  searchPosts(query: String!): [Post!]!
}

# ミューテーション
type Mutation {
  # ユーザー操作
  register(username: String!, email: String!, password: String!): AuthPayload!
  login(email: String!, password: String!): AuthPayload!
  updateProfile(bio: String, avatar: Upload): User!

  # 投稿操作
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Boolean!
  publishPost(id: ID!): Post!
}

# サブスクリプション
type Subscription {
  postAdded(authorId: ID): Post!
  postUpdated(id: ID!): Post!
  postDeleted: ID!
}

# 認証ペイロード
type AuthPayload {
  token: String!
  user: User!
}
```

### リゾルバー実装

```typescript
import { GraphQLError } from 'graphql';

interface Context {
  userId?: string;
  db: Database; // あなたのDB接続
}

const resolvers = {
  // カスタムスカラー
  Date: {
    parseValue(value: number) {
      return new Date(value);
    },
    serialize(value: Date) {
      return value.getTime();
    },
  },

  // Query リゾルバー
  Query: {
    user: async (parent, { id }, context: Context) => {
      return await context.db.users.findById(id);
    },

    posts: async (parent, { filter, first, after }, context: Context) => {
      const limit = first || 10;
      const offset = after ? parseInt(after) : 0;

      const posts = await context.db.posts.find({
        ...filter,
        limit,
        offset,
      });

      const totalCount = await context.db.posts.count(filter);

      return {
        edges: posts.map((post, index) => ({
          cursor: String(offset + index),
          node: post,
        })),
        pageInfo: {
          hasNextPage: offset + limit < totalCount,
          hasPreviousPage: offset > 0,
          startCursor: String(offset),
          endCursor: String(offset + posts.length - 1),
        },
        totalCount,
      };
    },

    searchPosts: async (parent, { query }, context: Context) => {
      return await context.db.posts.search(query);
    },
  },

  // Mutation リゾルバー
  Mutation: {
    createPost: async (parent, { input }, context: Context) => {
      if (!context.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const post = await context.db.posts.create({
        ...input,
        authorId: context.userId,
        status: 'DRAFT',
        createdAt: new Date(),
      });

      // サブスクリプションに通知
      pubsub.publish('POST_ADDED', { postAdded: post });

      return post;
    },

    updatePost: async (parent, { id, input }, context: Context) => {
      const post = await context.db.posts.findById(id);

      if (!post) {
        throw new GraphQLError('Post not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (post.authorId !== context.userId) {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const updated = await context.db.posts.update(id, {
        ...input,
        updatedAt: new Date(),
      });

      pubsub.publish('POST_UPDATED', { postUpdated: updated });

      return updated;
    },

    deletePost: async (parent, { id }, context: Context) => {
      const post = await context.db.posts.findById(id);

      if (post.authorId !== context.userId) {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      await context.db.posts.delete(id);
      pubsub.publish('POST_DELETED', { postDeleted: id });

      return true;
    },
  },

  // フィールドリゾルバー
  User: {
    posts: async (parent, { status }, context: Context) => {
      return await context.db.posts.find({
        authorId: parent.id,
        ...(status && { status }),
      });
    },

    profile: async (parent, args, context: Context) => {
      return await context.db.userProfiles.findByUserId(parent.id);
    },
  },

  Post: {
    author: async (parent, args, context: Context) => {
      // DataLoaderを使うとN+1問題を解決できる
      return context.loaders.user.load(parent.authorId);
    },

    tags: async (parent, args, context: Context) => {
      return await context.db.tags.findByPostId(parent.id);
    },
  },

  // Subscription リゾルバー
  Subscription: {
    postAdded: {
      subscribe: (parent, { authorId }) => {
        if (authorId) {
          return pubsub.asyncIterator([`POST_ADDED_${authorId}`]);
        }
        return pubsub.asyncIterator(['POST_ADDED']);
      },
    },

    postUpdated: {
      subscribe: (parent, { id }) => {
        return pubsub.asyncIterator([`POST_UPDATED_${id}`]);
      },
    },
  },
};
```

### DataLoaderでN+1問題を解決

```typescript
import DataLoader from 'dataloader';

function createLoaders(db: Database) {
  return {
    user: new DataLoader(async (ids: readonly string[]) => {
      const users = await db.users.findByIds(ids);
      const userMap = new Map(users.map(u => [u.id, u]));
      return ids.map(id => userMap.get(id) || null);
    }),

    posts: new DataLoader(async (userIds: readonly string[]) => {
      const posts = await db.posts.findByAuthorIds(userIds);
      const postsMap = new Map<string, Post[]>();

      posts.forEach(post => {
        if (!postsMap.has(post.authorId)) {
          postsMap.set(post.authorId, []);
        }
        postsMap.get(post.authorId)!.push(post);
      });

      return userIds.map(id => postsMap.get(id) || []);
    }),
  };
}

// コンテキストに追加
expressMiddleware(server, {
  context: async ({ req }) => ({
    userId: getUserIdFromToken(req.headers.authorization),
    db,
    loaders: createLoaders(db),
  }),
});
```

## Apollo Client

フロントエンドでGraphQLを使うためのライブラリです。

### セットアップ（React）

```bash
npm install @apollo/client graphql
```

```typescript
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache(),
  headers: {
    authorization: localStorage.getItem('token') || '',
  },
});

function App() {
  return (
    <ApolloProvider client={client}>
      <YourApp />
    </ApolloProvider>
  );
}
```

### Query

```typescript
import { gql, useQuery } from '@apollo/client';

const GET_POSTS = gql`
  query GetPosts($filter: PostFilterInput) {
    posts(filter: $filter, first: 10) {
      edges {
        node {
          id
          title
          author {
            username
          }
          createdAt
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

function PostList() {
  const { loading, error, data, fetchMore } = useQuery(GET_POSTS, {
    variables: { filter: { status: 'PUBLISHED' } },
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const posts = data.posts.edges.map(edge => edge.node);

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>By {post.author.username}</p>
        </article>
      ))}

      {data.posts.pageInfo.hasNextPage && (
        <button onClick={() => fetchMore({
          variables: {
            after: data.posts.edges[data.posts.edges.length - 1].cursor,
          },
        })}>
          Load More
        </button>
      )}
    </div>
  );
}
```

### Mutation

```typescript
import { gql, useMutation } from '@apollo/client';

const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      content
    }
  }
`;

function CreatePostForm() {
  const [createPost, { loading, error }] = useMutation(CREATE_POST, {
    // キャッシュを更新
    update(cache, { data: { createPost } }) {
      cache.modify({
        fields: {
          posts(existingPosts = { edges: [] }) {
            const newPostRef = cache.writeFragment({
              data: createPost,
              fragment: gql`
                fragment NewPost on Post {
                  id
                  title
                  content
                }
              `
            });

            return {
              ...existingPosts,
              edges: [{ node: newPostRef }, ...existingPosts.edges],
            };
          }
        }
      });
    },
    // または refetchQueries を使用
    // refetchQueries: [{ query: GET_POSTS }],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await createPost({
        variables: {
          input: {
            title: formData.get('title'),
            content: formData.get('content'),
            tagIds: [],
          },
        },
      });
      alert('Post created!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Post'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

### Subscription

```typescript
import { gql, useSubscription } from '@apollo/client';

const POST_ADDED_SUBSCRIPTION = gql`
  subscription OnPostAdded {
    postAdded {
      id
      title
      author {
        username
      }
    }
  }
`;

function RealtimePosts() {
  const { data, loading } = useSubscription(POST_ADDED_SUBSCRIPTION);

  useEffect(() => {
    if (data) {
      toast.info(`New post: ${data.postAdded.title}`);
    }
  }, [data]);

  return null; // または通知UIを表示
}
```

WebSocket設定:

```typescript
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql'
});

const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:4000/graphql',
}));

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

## キャッシュ戦略

Apollo Clientの強力なキャッシュ機能を活用しましょう。

### キャッシュ設定

```typescript
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        posts: {
          // ページネーションのマージ
          keyArgs: ['filter'],
          merge(existing = { edges: [] }, incoming) {
            return {
              ...incoming,
              edges: [...existing.edges, ...incoming.edges],
            };
          },
        },
      },
    },
    Post: {
      fields: {
        // フィールド単位のキャッシュポリシー
        isLiked: {
          read(cached, { variables }) {
            // カスタム読み取りロジック
            return cached ?? false;
          },
        },
      },
    },
  },
});
```

### 楽観的UI更新

```typescript
const [deletePost] = useMutation(DELETE_POST, {
  optimisticResponse: {
    deletePost: true,
  },
  update(cache, { data }) {
    cache.modify({
      fields: {
        posts(existingPosts, { readField }) {
          return {
            ...existingPosts,
            edges: existingPosts.edges.filter(
              edge => readField('id', edge.node) !== postId
            ),
          };
        },
      },
    });
  },
});
```

## GraphQL Code Generator

TypeScriptの型を自動生成します。

```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo
```

`codegen.yml`:

```yaml
schema: http://localhost:4000/graphql
documents: 'src/**/*.graphql'
generates:
  src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
    config:
      withHooks: true
```

自動生成:

```bash
npx graphql-codegen
```

使用例:

```typescript
import { useGetPostsQuery, useCreatePostMutation } from './generated/graphql';

function Posts() {
  const { data, loading } = useGetPostsQuery({
    variables: { filter: { status: 'PUBLISHED' } }
  });

  const [createPost] = useCreatePostMutation();

  // 完全な型安全性
}
```

## まとめ

GraphQL + Apolloは強力で柔軟なAPI開発を可能にします。

**重要なポイント**:
- スキーマファーストで型安全な開発
- DataLoaderでN+1問題を解決
- Apollo Clientの強力なキャッシュ機能
- Subscriptionでリアルタイム通信
- Code Generatorで型を自動生成

RESTに代わる次世代のAPI技術として、GraphQLはますます重要になっています。本記事を参考に、効率的なAPI開発を実践してください。
