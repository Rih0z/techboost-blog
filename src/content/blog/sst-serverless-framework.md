---
title: "SST (Serverless Stack) 入門 — AWSサーバーレス開発の新定番【2026年版】"
description: "SST v3（Ion）の概要から実践まで。Pulumi基盤のInfrastructure as Code、Live Lambda Development、Next.js/Astro統合、AWS CDKとの比較を徹底解説します。現場で使える知識を体系的にまとめました。"
pubDate: "2026-02-05"
tags: ["SST", "AWS", "Serverless", "IaC", "TypeScript"]
heroImage: '../../assets/thumbnails/sst-serverless-framework.jpg'
---
## SST (Serverless Stack) とは

**SST (Serverless Stack)** は、AWSサーバーレスアプリケーションを構築するためのフルスタックフレームワークです。2026年現在、v3（通称 **Ion**）が最新バージョンで、Pulumi基盤の強力なInfrastructure as Codeを提供します。

従来のServerless FrameworkやAWS SAMと比較して、以下の特徴があります。

- **Live Lambda Development**: ローカルでLambda関数をホットリロード
- **型安全なインフラ定義**: TypeScriptでAWSリソースを定義
- **フロントエンド統合**: Next.js、Astro、Remixなどを簡単にデプロイ
- **Pulumi基盤**: 強力なIaCエンジンでマルチクラウド対応

## SST v3 (Ion) の新機能

### 1. Pulumi基盤への移行

SST v3では、従来のAWS CDKベースからPulumi基盤に移行しました。これにより、より柔軟なリソース管理と型推論が可能になりました。

```typescript
// sst.config.ts
import { SSTConfig } from "sst";
import { Api } from "sst/constructs";

export default {
  config() {
    return {
      name: "my-app",
      region: "ap-northeast-1",
    };
  },
  stacks(app) {
    app.stack(function Stack({ stack }) {
      const api = new Api(stack, "api", {
        routes: {
          "GET /": "packages/functions/src/lambda.handler",
          "POST /users": "packages/functions/src/users.create",
        },
      });

      stack.addOutputs({
        ApiEndpoint: api.url,
      });
    });
  },
} satisfies SSTConfig;
```

### 2. Live Lambda Development

SSTの最大の特徴は **Live Lambda Development** です。ローカルでコードを変更すると、AWSにデプロイされたLambda関数が即座に更新されます。

```bash
# 開発サーバー起動
npx sst dev

# 別ターミナルでフロントエンド起動
cd packages/web
npm run dev
```

コードを変更すると、CloudWatch Logsがリアルタイムでターミナルに表示されます。

```typescript
// packages/functions/src/lambda.ts
export async function handler(event: APIGatewayProxyEvent) {
  console.log("Request received:", event.path);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from SST!" }),
  };
}
```

### 3. Next.js / Astro 統合

SSTはフロントエンドフレームワークとの統合が非常に簡単です。

```typescript
// Next.js統合
import { NextjsSite } from "sst/constructs";

const site = new NextjsSite(stack, "site", {
  path: "packages/web",
  environment: {
    NEXT_PUBLIC_API_URL: api.url,
  },
});

// Astro統合
import { AstroSite } from "sst/constructs";

const astroSite = new AstroSite(stack, "astro", {
  path: "packages/astro-site",
  customDomain: "blog.example.com",
});
```

環境変数は自動的に型推論され、`sst bind`コマンドでローカル開発でも利用可能です。

## AWS CDKとの比較

| 項目 | SST v3 | AWS CDK |
|------|--------|---------|
| 基盤 | Pulumi | CloudFormation |
| 型安全性 | 高（自動推論） | 中（手動定義） |
| ローカル開発 | Live Lambda | SAM Local |
| デプロイ速度 | 高速 | 中速 |
| フロントエンド統合 | ネイティブ対応 | 手動設定 |
| 学習コスト | 低 | 高 |

SSTはAWS CDKのL3 Constructsをラップしつつ、開発体験を大幅に向上させています。

## 実践: API + フロントエンド構築

### プロジェクト作成

```bash
npx create-sst@latest my-fullstack-app
cd my-fullstack-app
```

### バックエンド実装

```typescript
// packages/functions/src/api/users.ts
import { DynamoDB } from "aws-sdk";
import { v4 as uuid } from "uuid";

const dynamodb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME!;

export async function create(event: APIGatewayProxyEvent) {
  const body = JSON.parse(event.body || "{}");

  const user = {
    id: uuid(),
    name: body.name,
    email: body.email,
    createdAt: Date.now(),
  };

  await dynamodb.put({
    TableName: TABLE_NAME,
    Item: user,
  }).promise();

  return {
    statusCode: 201,
    body: JSON.stringify(user),
  };
}
```

### インフラ定義

```typescript
// stacks/MyStack.ts
import { Table, Api, NextjsSite } from "sst/constructs";

export function MyStack({ stack }: StackContext) {
  const table = new Table(stack, "Users", {
    fields: {
      id: "string",
    },
    primaryIndex: { partitionKey: "id" },
  });

  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        bind: [table],
      },
    },
    routes: {
      "POST /users": "packages/functions/src/api/users.create",
    },
  });

  const site = new NextjsSite(stack, "Site", {
    path: "packages/web",
    environment: {
      NEXT_PUBLIC_API_URL: api.url,
    },
  });

  stack.addOutputs({
    ApiUrl: api.url,
    SiteUrl: site.url,
  });
}
```

### デプロイ

```bash
# ステージング環境へデプロイ
npx sst deploy --stage staging

# 本番環境へデプロイ
npx sst deploy --stage production
```

## パフォーマンスとコスト最適化

### Cold Start対策

```typescript
const api = new Api(stack, "Api", {
  defaults: {
    function: {
      runtime: "nodejs20.x",
      memorySize: 1024, // メモリを増やしてCPUも向上
      timeout: 10,
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
      },
    },
  },
});
```

### バンドルサイズ削減

```typescript
// sst.config.ts
export default {
  config() {
    return {
      name: "my-app",
      region: "ap-northeast-1",
    };
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      nodejs: {
        format: "esm",
        minify: true,
        sourcemap: false, // 本番では無効化
      },
    });
  },
};
```

## デプロイ戦略

本番環境でSSTを運用する際のデプロイ戦略を解説します。

### マルチステージデプロイ

```typescript
// sst.config.ts — ステージ別の設定
export default {
  config() {
    return {
      name: "my-app",
      region: "ap-northeast-1",
    };
  },
  stacks(app) {
    // ステージに応じた設定
    const isProd = app.stage === "production";

    app.setDefaultFunctionProps({
      runtime: "nodejs20.x",
      memorySize: isProd ? 1024 : 256,
      timeout: isProd ? 30 : 10,
      environment: {
        STAGE: app.stage,
      },
    });

    app.stack(MyStack);
  },
} satisfies SSTConfig;
```

```bash
# デプロイの流れ
# 1. 開発環境（個人用）
npx sst dev --stage dev-tanaka

# 2. ステージング環境
npx sst deploy --stage staging

# 3. 本番環境（CI/CDから実行）
npx sst deploy --stage production
```

### GitHub Actionsによる自動デプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy SST
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Deploy Production
        run: npx sst deploy --stage production
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## モニタリングとログ設計

サーバーレスアプリケーションでは、Lambda単位での監視が重要です。構造化ログを導入することで、CloudWatch Logs Insightsでの検索・分析が容易になります。

### Lambda関数のログ構造化

```typescript
// packages/functions/src/lib/logger.ts
type LogLevel = "info" | "warn" | "error";

export function log(entry: { level: LogLevel; message: string; [key: string]: unknown }) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }));
}

// 使用例
export async function handler(event: APIGatewayProxyEvent) {
  const start = Date.now();
  const requestId = event.requestContext.requestId;

  try {
    const result = await processRequest(event);
    log({ level: "info", message: "Request completed", requestId, duration: Date.now() - start });
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    log({ level: "error", message: "Request failed", requestId, error: String(error) });
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
}
```

**モニタリングのポイント:**
- CloudWatch Alarmsで Lambda エラー率を監視（5分間で5回以上 → Slack通知）
- X-Rayトレーシングを有効化してレイテンシのボトルネックを可視化
- CloudWatch Logs InsightsでJSON構造化ログをクエリ分析

## コスト最適化の実践

サーバーレスは「使った分だけ課金」ですが、設定を誤ると予想外のコストが発生します。

### Lambda関数のコスト最適化

```typescript
// ✅ メモリとタイムアウトの適切な設定
const api = new Api(stack, "Api", {
  defaults: {
    function: {
      // メモリはパフォーマンステストで最適値を見つける
      // AWS Lambda Power Tuning ツールの利用を推奨
      memorySize: 512,     // デフォルト128MBは遅すぎることが多い
      timeout: 10,          // 必要最小限に設定
      architecture: "arm64", // ARM（Graviton2）はx86より約20%安い
    },
  },
});
```

### DynamoDBのコスト最適化

```typescript
const table = new Table(stack, "Users", {
  fields: {
    id: "string",
    email: "string",
  },
  primaryIndex: { partitionKey: "id" },
  globalIndexes: {
    emailIndex: { partitionKey: "email" },
  },
  // オンデマンドモード: トラフィックが予測不能な場合
  cdk: {
    table: {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // TTLで古いデータを自動削除（ストレージコスト削減）
      timeToLiveAttribute: "expiresAt",
    },
  },
});
```

### コスト見積もりの目安

```
月間100万リクエスト、平均実行時間200ms、メモリ512MBの場合:

Lambda:
  リクエスト料金:  100万 × $0.20/100万 = $0.20
  コンピュート:    100万 × 0.2秒 × 512MB = 100,000 GB秒
                  100,000 × $0.0000166667 = $1.67
  Lambda合計:     約$1.87/月（約¥280）

API Gateway:
  100万リクエスト × $1.00/100万 = $1.00/月（約¥150）

DynamoDB (オンデマンド):
  書き込み: 50万 × $1.25/100万 = $0.625
  読み取り: 100万 × $0.25/100万 = $0.25
  DynamoDB合計:   約$0.88/月（約¥132）

月額合計: 約$3.75（約¥560）
→ 同等のEC2構成（t3.small）: 約$18/月（約¥2,700）
→ サーバーレスで約80%のコスト削減
```

## まとめ

SST v3は、AWSサーバーレス開発の新しいスタンダードとして急速に普及しています。特にLive Lambda Developmentは、従来のデプロイ待ち時間を大幅に短縮し、開発速度を向上させます。

**SSTが適しているケース:**
- フルスタックWebアプリケーション
- API + SPA/SSRの構成
- スタートアップの高速プロトタイピング
- TypeScript中心の開発チーム

**従来のCDK/SAMが適しているケース:**
- 既存のCloudFormationテンプレート資産がある
- マルチクラウド戦略が不要
- AWS専業のインフラエンジニアが中心

2026年以降、SSTはさらに進化し、Terraformバックエンド対応やマルチリージョンデプロイの改善が予定されています。今から始めるAWSサーバーレス開発には、SSTが最適な選択肢です。
