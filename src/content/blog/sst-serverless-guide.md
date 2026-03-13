---
title: "SST（Serverless Stack）完全ガイド — AWSサーバーレス開発の最適解"
description: "SSTでAWSサーバーレスアプリ開発を簡単に。Lambda、API Gateway、DynamoDB、Next.js/Astro統合、Live Lambda、デプロイまで徹底解説。IAMポリシー設計やモニタリング、ステージ管理のベストプラクティスも紹介します。"
pubDate: "Feb 05 2026"
tags: ["SST", "AWS", "Serverless", "Lambda", "Next.js", "TypeScript"]
heroImage: '../../assets/thumbnails/sst-serverless-guide.jpg'
---
## SSTとは

SST（Serverless Stack）は、AWSサーバーレスアプリケーション開発のためのフレームワークです。

### 特徴

- **Live Lambda**: ローカル開発でクラウドのLambdaをライブ更新
- **型安全**: TypeScriptファーストで完全な型推論
- **Next.js/Astro統合**: フロントエンドフレームワークと簡単に統合
- **Infrastructure as Code**: AWS CDKベース
- **開発体験**: ホットリロード、ローカルデバッグ
- **本番環境対応**: マルチステージ、CI/CD

2026年現在、AWSサーバーレス開発の最有力フレームワークです。

## なぜSSTなのか

### 従来のAWS開発の問題

**SAM（Serverless Application Model）**
- YAMLが冗長
- ローカル開発が遅い
- 型安全性がない

**Serverless Framework**
- 設定が複雑
- AWS以外にも対応しすぎて中途半端
- パフォーマンスが悪い

**AWS CDK**
- インフラ定義は良いが、開発体験が悪い
- ローカル開発が面倒

### SSTの解決策

- **Live Lambda**: コード変更が即座にクラウドに反映
- **型安全**: リソース参照が型推論される
- **統合開発**: フロントエンド + バックエンド統一管理
- **高速**: ビルドが高速、デプロイも高速

## インストール

### 新規プロジェクト作成

```bash
npx create-sst@latest my-sst-app
cd my-sst-app
```

テンプレート選択:

- Minimal
- GraphQL API
- API with Postgres
- Next.js with API
- Astro with API

### 既存プロジェクトに追加

```bash
npm install sst
npx sst init
```

## プロジェクト構造

```
my-sst-app/
├── sst.config.ts       # SSTの設定
├── packages/
│   ├── functions/      # Lambda関数
│   │   └── src/
│   ├── core/           # 共通コード
│   └── web/            # フロントエンド（Next.js等）
└── .sst/               # SSTの内部ファイル
```

## 基本的な使い方

### sst.config.ts

```typescript
import { SSTConfig } from 'sst'
import { API } from './stacks/API'

export default {
  config(_input) {
    return {
      name: 'my-sst-app',
      region: 'ap-northeast-1',
    }
  },
  stacks(app) {
    app.stack(API)
  },
} satisfies SSTConfig
```

### スタック定義

`stacks/API.ts`:

```typescript
import { StackContext, Api } from 'sst/constructs'

export function API({ stack }: StackContext) {
  const api = new Api(stack, 'api', {
    routes: {
      'GET /': 'packages/functions/src/lambda.handler',
      'GET /users': 'packages/functions/src/users.list',
      'POST /users': 'packages/functions/src/users.create',
      'GET /users/{id}': 'packages/functions/src/users.get',
    },
  })

  stack.addOutputs({
    ApiEndpoint: api.url,
  })
}
```

### Lambda関数

`packages/functions/src/lambda.ts`:

```typescript
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello from SST!',
      path: event.rawPath,
    }),
  }
}
```

### ローカル開発

```bash
npm run dev
# または
npx sst dev
```

これでLive Lambdaが起動し、コード変更が即座にクラウドに反映されます。

## API Gateway

### RESTful API

```typescript
import { StackContext, Api } from 'sst/constructs'

export function API({ stack }: StackContext) {
  const api = new Api(stack, 'api', {
    routes: {
      'GET /posts': 'packages/functions/src/posts.list',
      'POST /posts': 'packages/functions/src/posts.create',
      'GET /posts/{id}': 'packages/functions/src/posts.get',
      'PUT /posts/{id}': 'packages/functions/src/posts.update',
      'DELETE /posts/{id}': 'packages/functions/src/posts.delete',
    },
    cors: {
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowOrigins: ['http://localhost:3000'],
    },
  })

  stack.addOutputs({
    ApiEndpoint: api.url,
  })

  return api
}
```

### パスパラメータ取得

```typescript
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id

  return {
    statusCode: 200,
    body: JSON.stringify({ id }),
  }
}
```

### クエリパラメータ

```typescript
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const page = event.queryStringParameters?.page || '1'
  const limit = event.queryStringParameters?.limit || '10'

  return {
    statusCode: 200,
    body: JSON.stringify({ page, limit }),
  }
}
```

### リクエストボディ

```typescript
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body || '{}')

  return {
    statusCode: 201,
    body: JSON.stringify({ created: body }),
  }
}
```

### 認証（JWT）

```typescript
import { StackContext, Api } from 'sst/constructs'

export function API({ stack }: StackContext) {
  const api = new Api(stack, 'api', {
    authorizers: {
      jwt: {
        type: 'jwt',
        jwt: {
          issuer: 'https://myapp.auth0.com/',
          audience: ['https://api.myapp.com'],
        },
      },
    },
    routes: {
      'GET /public': 'packages/functions/src/public.handler',
      'GET /private': {
        function: 'packages/functions/src/private.handler',
        authorizer: 'jwt',
      },
    },
  })

  return api
}
```

## DynamoDB

### テーブル作成

```typescript
import { StackContext, Table } from 'sst/constructs'

export function Database({ stack }: StackContext) {
  const table = new Table(stack, 'Users', {
    fields: {
      userId: 'string',
      email: 'string',
    },
    primaryIndex: { partitionKey: 'userId' },
    globalIndexes: {
      emailIndex: { partitionKey: 'email' },
    },
  })

  return table
}
```

### Lambda + DynamoDB

```typescript
import { StackContext, Api, Table } from 'sst/constructs'

export function API({ stack }: StackContext) {
  const table = new Table(stack, 'Users', {
    fields: {
      userId: 'string',
      email: 'string',
    },
    primaryIndex: { partitionKey: 'userId' },
  })

  const api = new Api(stack, 'api', {
    defaults: {
      function: {
        bind: [table],
      },
    },
    routes: {
      'GET /users': 'packages/functions/src/users.list',
      'POST /users': 'packages/functions/src/users.create',
    },
  })

  return { api, table }
}
```

### DynamoDB操作

`packages/functions/src/users.ts`:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { Table } from 'sst/node/table'
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

export const list: APIGatewayProxyHandlerV2 = async () => {
  const result = await docClient.send(
    new ScanCommand({
      TableName: Table.Users.tableName,
    })
  )

  return {
    statusCode: 200,
    body: JSON.stringify(result.Items),
  }
}

export const create: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body || '{}')

  await docClient.send(
    new PutCommand({
      TableName: Table.Users.tableName,
      Item: {
        userId: crypto.randomUUID(),
        email: body.email,
        name: body.name,
        createdAt: new Date().toISOString(),
      },
    })
  )

  return {
    statusCode: 201,
    body: JSON.stringify({ success: true }),
  }
}
```

### 型安全なリソース参照

SSTは自動的に型を生成します:

```typescript
import { Table } from 'sst/node/table'

// Table.Users.tableName が型推論される
const tableName = Table.Users.tableName
```

## S3バケット

### バケット作成

```typescript
import { StackContext, Bucket } from 'sst/constructs'

export function Storage({ stack }: StackContext) {
  const bucket = new Bucket(stack, 'Uploads', {
    cors: [
      {
        allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
        allowedOrigins: ['*'],
      },
    ],
  })

  return bucket
}
```

### ファイルアップロード

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { Bucket } from 'sst/node/bucket'

const s3 = new S3Client({})

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body || '{}')

  await s3.send(
    new PutObjectCommand({
      Bucket: Bucket.Uploads.bucketName,
      Key: `uploads/${Date.now()}-${body.filename}`,
      Body: Buffer.from(body.content, 'base64'),
      ContentType: body.contentType,
    })
  )

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  }
}
```

## RDS（PostgreSQL）

### RDS作成

```typescript
import { StackContext, RDS } from 'sst/constructs'

export function Database({ stack }: StackContext) {
  const rds = new RDS(stack, 'Database', {
    engine: 'postgresql13.9',
    defaultDatabaseName: 'myapp',
    migrations: 'packages/functions/migrations',
  })

  return rds
}
```

### マイグレーション

`packages/functions/migrations/1_create_users.mjs`:

```javascript
export async function up(db) {
  await db.schema
    .createTable('users')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('email', 'varchar', (col) => col.notNull().unique())
    .addColumn('name', 'varchar')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(db.fn.now()))
    .execute()
}

export async function down(db) {
  await db.schema.dropTable('users').execute()
}
```

### Lambda + RDS

```typescript
import { Kysely } from 'kysely'
import { DataApiDialect } from 'kysely-data-api'
import { RDSDataClient } from '@aws-sdk/client-rds-data'
import { RDS } from 'sst/node/rds'

interface Database {
  users: {
    id: number
    email: string
    name: string | null
    created_at: Date
  }
}

const db = new Kysely<Database>({
  dialect: new DataApiDialect({
    mode: 'postgres',
    driver: {
      client: new RDSDataClient({}),
      database: RDS.Database.defaultDatabaseName,
      secretArn: RDS.Database.secretArn,
      resourceArn: RDS.Database.clusterArn,
    },
  }),
})

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const users = await db.selectFrom('users').selectAll().execute()

  return {
    statusCode: 200,
    body: JSON.stringify(users),
  }
}
```

## Next.js統合

### Next.jsサイト追加

```typescript
import { StackContext, NextjsSite } from 'sst/constructs'

export function Web({ stack }: StackContext) {
  const api = use(API)

  const site = new NextjsSite(stack, 'site', {
    path: 'packages/web',
    environment: {
      NEXT_PUBLIC_API_URL: api.url,
    },
  })

  stack.addOutputs({
    SiteUrl: site.url,
  })
}
```

### Next.jsからAPI呼び出し

`packages/web/app/page.tsx`:

```typescript
export default async function Home() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts`)
  const posts = await res.json()

  return (
    <div>
      <h1>Posts</h1>
      <ul>
        {posts.map((post: any) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Server Actions対応

```typescript
'use server'

import { Resource } from 'sst'

export async function createPost(formData: FormData) {
  const title = formData.get('title')

  await fetch(`${Resource.Api.url}/posts`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}
```

## Astro統合

### Astroサイト追加

```typescript
import { StackContext, AstroSite } from 'sst/constructs'

export function Web({ stack }: StackContext) {
  const api = use(API)

  const site = new AstroSite(stack, 'site', {
    path: 'packages/web',
    environment: {
      PUBLIC_API_URL: api.url,
    },
  })

  stack.addOutputs({
    SiteUrl: site.url,
  })
}
```

### SSR対応

`packages/web/src/pages/posts.astro`:

```astro
---
const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/posts`)
const posts = await res.json()
---

<html>
  <body>
    <h1>Posts</h1>
    <ul>
      {posts.map((post: any) => (
        <li>{post.title}</li>
      ))}
    </ul>
  </body>
</html>
```

## Cron（スケジュール実行）

```typescript
import { StackContext, Cron } from 'sst/constructs'

export function Scheduler({ stack }: StackContext) {
  new Cron(stack, 'DailyReport', {
    schedule: 'cron(0 9 * * ? *)',  // 毎日9時
    job: 'packages/functions/src/report.handler',
  })

  new Cron(stack, 'HourlySync', {
    schedule: 'rate(1 hour)',
    job: 'packages/functions/src/sync.handler',
  })
}
```

## SQS（キュー）

```typescript
import { StackContext, Queue, Api } from 'sst/constructs'

export function Jobs({ stack }: StackContext) {
  const queue = new Queue(stack, 'EmailQueue', {
    consumer: 'packages/functions/src/email.handler',
  })

  const api = new Api(stack, 'api', {
    defaults: {
      function: {
        bind: [queue],
      },
    },
    routes: {
      'POST /send-email': 'packages/functions/src/enqueue.handler',
    },
  })

  return { queue, api }
}
```

メッセージ送信:

```typescript
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { Queue } from 'sst/node/queue'

const sqs = new SQSClient({})

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body || '{}')

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: Queue.EmailQueue.queueUrl,
      MessageBody: JSON.stringify({
        to: body.to,
        subject: body.subject,
        body: body.body,
      }),
    })
  )

  return {
    statusCode: 200,
    body: JSON.stringify({ queued: true }),
  }
}
```

## 環境変数とシークレット

### 環境変数

```typescript
import { StackContext, Api } from 'sst/constructs'

export function API({ stack }: StackContext) {
  const api = new Api(stack, 'api', {
    defaults: {
      function: {
        environment: {
          STAGE: stack.stage,
          REGION: stack.region,
        },
      },
    },
    routes: {
      'GET /': 'packages/functions/src/lambda.handler',
    },
  })
}
```

### シークレット（SSM Parameter Store）

```typescript
import { StackContext, Config, Api } from 'sst/constructs'

export function API({ stack }: StackContext) {
  const API_KEY = new Config.Secret(stack, 'API_KEY')

  const api = new Api(stack, 'api', {
    defaults: {
      function: {
        bind: [API_KEY],
      },
    },
    routes: {
      'GET /': 'packages/functions/src/lambda.handler',
    },
  })
}
```

シークレット設定:

```bash
npx sst secrets set API_KEY my-secret-value
```

Lambda内で使用:

```typescript
import { Config } from 'sst/node/config'

export const handler = async () => {
  const apiKey = Config.API_KEY

  return {
    statusCode: 200,
    body: JSON.stringify({ configured: !!apiKey }),
  }
}
```

## マルチステージ

### ステージ切り替え

```bash
# 開発環境
npx sst dev --stage dev

# 本番環境
npx sst deploy --stage prod
```

### ステージごとの設定

```typescript
export default {
  config(_input) {
    return {
      name: 'my-app',
      region: 'ap-northeast-1',
    }
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: 'nodejs20.x',
      timeout: app.stage === 'prod' ? 30 : 10,
    })

    app.stack(API)
  },
} satisfies SSTConfig
```

## デプロイ

### 初回デプロイ

```bash
npx sst deploy --stage prod
```

### CI/CD（GitHub Actions）

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1

      - name: Install dependencies
        run: npm ci

      - name: Deploy
        run: npx sst deploy --stage prod
```

## 実践例: ブログAPI

完全な実装例:

`stacks/index.ts`:

```typescript
import { SSTConfig } from 'sst'
import { API } from './API'
import { Web } from './Web'

export default {
  config(_input) {
    return {
      name: 'blog-app',
      region: 'ap-northeast-1',
    }
  },
  stacks(app) {
    app.stack(API).stack(Web)
  },
} satisfies SSTConfig
```

`stacks/API.ts`:

```typescript
import { StackContext, Api, Table } from 'sst/constructs'

export function API({ stack }: StackContext) {
  const table = new Table(stack, 'Posts', {
    fields: {
      id: 'string',
      userId: 'string',
      createdAt: 'number',
    },
    primaryIndex: { partitionKey: 'id' },
    globalIndexes: {
      byUser: { partitionKey: 'userId', sortKey: 'createdAt' },
    },
  })

  const api = new Api(stack, 'api', {
    defaults: {
      function: {
        bind: [table],
      },
    },
    routes: {
      'GET /posts': 'packages/functions/src/posts.list',
      'POST /posts': 'packages/functions/src/posts.create',
      'GET /posts/{id}': 'packages/functions/src/posts.get',
      'PUT /posts/{id}': 'packages/functions/src/posts.update',
      'DELETE /posts/{id}': 'packages/functions/src/posts.delete',
    },
  })

  stack.addOutputs({
    ApiEndpoint: api.url,
  })

  return api
}
```

## まとめ

SSTは2026年現在、AWSサーバーレス開発の最適解です。

### メリット

- **開発速度**: Live Lambdaで爆速開発
- **型安全**: リソース参照が完全に型推論
- **統合開発**: フロントエンド + バックエンド統一
- **本番対応**: マルチステージ、CI/CD完備
- **コスパ**: サーバーレスで運用コストが低い

### ユースケース

- REST API / GraphQL API
- Webアプリケーション（Next.js/Astro）
- バックグラウンドジョブ
- データパイプライン
- スタートアップのMVP

SAM、Serverless Framework、AWS CDKから移行する価値は十分にあります。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
