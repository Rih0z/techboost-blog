---
title: 'サーバーレスフレームワーク完全比較2026'
description: '主要サーバーレスフレームワークを完全比較。'
pubDate: '2026-02-05'
tags: ['サーバーレス', 'AWS', 'IaC', 'クラウド']
---

サーバーレスアプリケーションの開発には、適切なフレームワーク選びが重要です。本記事では、主要な5つのフレームワークを徹底比較します。

## 目次

1. フレームワーク概要
2. SST (Serverless Stack)
3. Serverless Framework
4. AWS SAM
5. Architect
6. Pulumi
7. 比較表
8. 使い分けガイド
9. 実践例

## フレームワーク概要

### 比較対象

| フレームワーク | 開発元 | 主な特徴 |
|--------------|--------|----------|
| SST | Serverless Stack | TypeScript優先、ライブデバッグ |
| Serverless Framework | Serverless Inc. | マルチクラウド、豊富なプラグイン |
| AWS SAM | AWS | AWS公式、CloudFormation互換 |
| Architect | Begin | シンプル、DynamoDB統合 |
| Pulumi | Pulumi Corp. | 汎用IaC、複数言語対応 |

## SST (Serverless Stack)

### 特徴

```typescript
// sst.config.ts
import { SSTConfig } from "sst"
import { API } from "./stacks/API"
import { Auth } from "./stacks/Auth"
import { Database } from "./stacks/Database"

export default {
  config(_input) {
    return {
      name: "my-app",
      region: "us-east-1",
    }
  },
  stacks(app) {
    app.stack(Database).stack(Auth).stack(API)
  },
} satisfies SSTConfig
```

### APIの定義

```typescript
// stacks/API.ts
import { StackContext, Api, use } from "sst/constructs"
import { Database } from "./Database"

export function API({ stack }: StackContext) {
  const db = use(Database)

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [db.table],
        environment: {
          TABLE_NAME: db.table.tableName,
        },
      },
    },
    routes: {
      "GET /notes": "packages/functions/src/list.handler",
      "GET /notes/{id}": "packages/functions/src/get.handler",
      "POST /notes": "packages/functions/src/create.handler",
      "PUT /notes/{id}": "packages/functions/src/update.handler",
      "DELETE /notes/{id}": "packages/functions/src/delete.handler",
    },
  })

  stack.addOutputs({
    ApiEndpoint: api.url,
  })

  return api
}
```

### データベーススタック

```typescript
// stacks/Database.ts
import { StackContext, Table } from "sst/constructs"

export function Database({ stack }: StackContext) {
  const table = new Table(stack, "Notes", {
    fields: {
      userId: "string",
      noteId: "string",
    },
    primaryIndex: { partitionKey: "userId", sortKey: "noteId" },
  })

  return { table }
}
```

### 認証スタック

```typescript
// stacks/Auth.ts
import { StackContext, Cognito, use } from "sst/constructs"
import { API } from "./API"

export function Auth({ stack }: StackContext) {
  const api = use(API)

  const auth = new Cognito(stack, "Auth", {
    login: ["email"],
  })

  auth.attachPermissionsForAuthUsers(stack, [api])

  stack.addOutputs({
    Region: stack.region,
    UserPoolId: auth.userPoolId,
    UserPoolClientId: auth.userPoolClientId,
  })

  return auth
}
```

### ライブ Lambda デバッグ

```typescript
// packages/functions/src/create.ts
import { APIGatewayProxyHandlerV2 } from "aws-lambda"
import { Table } from "sst/node/table"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const data = JSON.parse(event.body || "{}")

  // ローカル開発時はconsole.logがリアルタイムで表示される
  console.log("Creating note:", data)

  const params = {
    TableName: Table.Notes.tableName,
    Item: {
      userId: event.requestContext.authorizer?.iam.cognitoIdentity.identityId,
      noteId: Date.now().toString(),
      content: data.content,
      createdAt: Date.now(),
    },
  }

  await client.send(new PutCommand(params))

  return {
    statusCode: 200,
    body: JSON.stringify(params.Item),
  }
}
```

### Frontendの統合

```typescript
// stacks/Frontend.ts
import { StackContext, StaticSite, use } from "sst/constructs"
import { API } from "./API"
import { Auth } from "./Auth"

export function Frontend({ stack }: StackContext) {
  const api = use(API)
  const auth = use(Auth)

  const site = new StaticSite(stack, "ReactSite", {
    path: "packages/frontend",
    buildOutput: "dist",
    buildCommand: "npm run build",
    environment: {
      VITE_API_URL: api.url,
      VITE_REGION: stack.region,
      VITE_USER_POOL_ID: auth.userPoolId,
      VITE_USER_POOL_CLIENT_ID: auth.userPoolClientId,
    },
  })

  stack.addOutputs({
    SiteUrl: site.url,
  })
}
```

## Serverless Framework

### 基本設定

```yaml
# serverless.yml
service: my-service

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  environment:
    TABLE_NAME: ${self:custom.tableName}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource: !GetAtt NotesTable.Arn

custom:
  tableName: notes-${self:provider.stage}
  webpack:
    webpackConfig: webpack.config.js
    includeModules: true

plugins:
  - serverless-webpack
  - serverless-offline
  - serverless-dotenv-plugin

functions:
  create:
    handler: src/handlers/create.handler
    events:
      - http:
          path: notes
          method: post
          cors: true
          authorizer:
            name: authorizer
            arn: ${self:custom.cognitoArn}

  list:
    handler: src/handlers/list.handler
    events:
      - http:
          path: notes
          method: get
          cors: true
          authorizer:
            name: authorizer
            arn: ${self:custom.cognitoArn}

  get:
    handler: src/handlers/get.handler
    events:
      - http:
          path: notes/{id}
          method: get
          cors: true
          authorizer:
            name: authorizer
            arn: ${self:custom.cognitoArn}

resources:
  Resources:
    NotesTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:custom.tableName}
        AttributeDefinitions:
          - AttributeName: userId
            AttributeType: S
          - AttributeName: noteId
            AttributeType: S
        KeySchema:
          - AttributeName: userId
            KeyType: HASH
          - AttributeName: noteId
            KeyType: RANGE
        BillingMode: PAY_PER_REQUEST
```

### Lambda関数

```typescript
// src/handlers/create.ts
import { APIGatewayProxyHandler } from "aws-lambda"
import { DynamoDB } from "aws-sdk"
import { v4 as uuid } from "uuid"

const dynamoDb = new DynamoDB.DocumentClient()

export const handler: APIGatewayProxyHandler = async (event) => {
  const data = JSON.parse(event.body || "{}")
  const userId = event.requestContext.authorizer?.claims.sub

  const params = {
    TableName: process.env.TABLE_NAME!,
    Item: {
      userId,
      noteId: uuid(),
      content: data.content,
      createdAt: Date.now(),
    },
  }

  try {
    await dynamoDb.put(params).promise()
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(params.Item),
    }
  } catch (error) {
    console.error(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not create note" }),
    }
  }
}
```

### カスタムプラグイン

```javascript
// plugins/custom-plugin.js
class CustomPlugin {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options

    this.hooks = {
      'before:deploy:deploy': this.beforeDeploy.bind(this),
      'after:deploy:deploy': this.afterDeploy.bind(this),
    }
  }

  async beforeDeploy() {
    this.serverless.cli.log('Running pre-deployment tasks...')
    // カスタムロジック
  }

  async afterDeploy() {
    this.serverless.cli.log('Running post-deployment tasks...')
    // カスタムロジック
  }
}

module.exports = CustomPlugin
```

### マルチリージョンデプロイ

```yaml
# serverless.yml
custom:
  regions:
    - us-east-1
    - eu-west-1
    - ap-northeast-1

provider:
  name: aws
  region: ${opt:region, 'us-east-1'}

# デプロイコマンド
# serverless deploy --region us-east-1
# serverless deploy --region eu-west-1
```

## AWS SAM

### テンプレート

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: SAM Template for my-app

Globals:
  Function:
    Timeout: 30
    Runtime: nodejs20.x
    Environment:
      Variables:
        TABLE_NAME: !Ref NotesTable

Resources:
  CreateNoteFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: create.handler
      Events:
        CreateNote:
          Type: Api
          Properties:
            Path: /notes
            Method: post
            Auth:
              Authorizer: MyCognitoAuth
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref NotesTable

  ListNotesFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: list.handler
      Events:
        ListNotes:
          Type: Api
          Properties:
            Path: /notes
            Method: get
            Auth:
              Authorizer: MyCognitoAuth
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref NotesTable

  NotesTable:
    Type: AWS::Serverless::SimpleTable
    Properties:
      PrimaryKey:
        Name: id
        Type: String
      ProvisionedThroughput:
        ReadCapacityUnits: 5
        WriteCapacityUnits: 5

  MyCognitoUserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: MyUserPool
      AutoVerifiedAttributes:
        - email
      Schema:
        - Name: email
          AttributeDataType: String
          Required: true

  MyCognitoUserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      UserPoolId: !Ref MyCognitoUserPool
      ClientName: MyAppClient
      GenerateSecret: false

Outputs:
  ApiUrl:
    Description: "API Gateway endpoint URL"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/"

  UserPoolId:
    Description: "Cognito User Pool ID"
    Value: !Ref MyCognitoUserPool

  UserPoolClientId:
    Description: "Cognito User Pool Client ID"
    Value: !Ref MyCognitoUserPoolClient
```

### ローカルテスト

```bash
# ローカルでAPIを起動
sam local start-api

# 個別の関数をテスト
sam local invoke CreateNoteFunction --event events/create.json

# DynamoDB Localと連携
sam local start-api --docker-network lambda-local
```

### イベントファイル

```json
// events/create.json
{
  "body": "{\"content\":\"Test note\"}",
  "resource": "/notes",
  "path": "/notes",
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "user-123"
      }
    }
  }
}
```

## Architect

### app.arc

```arc
@app
my-app

@http
get /
get /notes
post /notes
get /notes/:id
put /notes/:id
delete /notes/:id

@tables
notes
  userId *String
  noteId **String

@aws
region us-east-1
runtime nodejs20.x
```

### HTTP関数

```typescript
// src/http/get-notes/index.ts
import arc from "@architect/functions"

export async function handler() {
  const data = await arc.tables()
  const notes = await data.notes.scan({})

  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(notes.Items),
  }
}
```

### テーブル操作

```typescript
// src/http/post-notes/index.ts
import arc from "@architect/functions"
import { v4 as uuid } from "uuid"

export async function handler(req: any) {
  const data = await arc.tables()
  const { content } = JSON.parse(req.body)

  const note = {
    userId: req.requestContext.authorizer.claims.sub,
    noteId: uuid(),
    content,
    createdAt: Date.now(),
  }

  await data.notes.put(note)

  return {
    statusCode: 201,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(note),
  }
}
```

### プラグイン

```javascript
// src/plugins/my-plugin.js
module.exports = {
  deploy: {
    start: async ({ arc, cloudformation }) => {
      console.log('Deploying with custom logic...')
      // カスタムデプロイロジック
    },
  },
}
```

## Pulumi

### TypeScript設定

```typescript
// index.ts
import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx"

// DynamoDBテーブル
const notesTable = new aws.dynamodb.Table("notes", {
  attributes: [
    { name: "userId", type: "S" },
    { name: "noteId", type: "S" },
  ],
  hashKey: "userId",
  rangeKey: "noteId",
  billingMode: "PAY_PER_REQUEST",
})

// Lambda実行ロール
const role = new aws.iam.Role("lambdaRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "lambda.amazonaws.com",
  }),
})

new aws.iam.RolePolicyAttachment("lambdaBasicExecution", {
  role: role,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
})

// Lambda関数
const createFunction = new aws.lambda.Function("createNote", {
  code: new pulumi.asset.FileArchive("./functions"),
  runtime: aws.lambda.Runtime.NodeJS20dX,
  handler: "create.handler",
  role: role.arn,
  environment: {
    variables: {
      TABLE_NAME: notesTable.name,
    },
  },
})

// API Gateway
const api = new awsx.apigateway.API("api", {
  routes: [
    {
      path: "/notes",
      method: "POST",
      eventHandler: createFunction,
    },
    {
      path: "/notes",
      method: "GET",
      eventHandler: new aws.lambda.Function("listNotes", {
        code: new pulumi.asset.FileArchive("./functions"),
        runtime: aws.lambda.Runtime.NodeJS20dX,
        handler: "list.handler",
        role: role.arn,
        environment: {
          variables: {
            TABLE_NAME: notesTable.name,
          },
        },
      }),
    },
  ],
})

// 出力
export const apiUrl = api.url
export const tableName = notesTable.name
```

### Python設定

```python
# __main__.py
import pulumi
import pulumi_aws as aws

# DynamoDBテーブル
notes_table = aws.dynamodb.Table("notes",
    attributes=[
        aws.dynamodb.TableAttributeArgs(name="userId", type="S"),
        aws.dynamodb.TableAttributeArgs(name="noteId", type="S"),
    ],
    hash_key="userId",
    range_key="noteId",
    billing_mode="PAY_PER_REQUEST"
)

# Lambda関数
create_function = aws.lambda_.Function("createNote",
    code=pulumi.FileArchive("./functions"),
    runtime=aws.lambda_.Runtime.PYTHON3D11,
    handler="create.handler",
    role=role.arn,
    environment=aws.lambda_.FunctionEnvironmentArgs(
        variables={
            "TABLE_NAME": notes_table.name,
        }
    )
)

# 出力
pulumi.export("table_name", notes_table.name)
```

### スタックの管理

```typescript
// Pulumi.dev.yaml
config:
  aws:region: us-east-1
  my-app:environment: development

// Pulumi.prod.yaml
config:
  aws:region: us-east-1
  my-app:environment: production
```

## 比較表

### 機能比較

| 機能 | SST | Serverless | SAM | Architect | Pulumi |
|------|-----|------------|-----|-----------|--------|
| TypeScript優先 | ◎ | △ | × | △ | ◎ |
| ライブデバッグ | ◎ | △ | ○ | × | × |
| マルチクラウド | × | ◎ | × | × | ◎ |
| 学習曲線 | 中 | 低 | 中 | 低 | 高 |
| ローカルテスト | ◎ | ○ | ◎ | ○ | △ |
| コミュニティ | 中 | 大 | 大 | 小 | 大 |
| プラグイン | △ | ◎ | △ | ○ | ◎ |

### パフォーマンス比較

| 項目 | SST | Serverless | SAM | Architect | Pulumi |
|------|-----|------------|-----|-----------|--------|
| デプロイ速度 | ◎ | ○ | ○ | ◎ | △ |
| ビルド時間 | ○ | ○ | ○ | ◎ | △ |
| コールドスタート | ○ | ○ | ○ | ○ | ○ |

## 使い分けガイド

### SSTを選ぶべき場合

```typescript
// TypeScript優先、最新の開発体験を求める場合
// フルスタックアプリケーション
// ライブデバッグが必要

const config: SSTConfig = {
  // モダンな開発体験
  // AWS特化
  // 強力な型サポート
}
```

### Serverless Frameworkを選ぶべき場合

```yaml
# マルチクラウド対応が必要
# 豊富なプラグインエコシステム
# 既存のプロジェクトとの互換性

provider:
  name: aws # または azure, google など
```

### AWS SAMを選ぶべき場合

```yaml
# AWS公式ツールを使いたい
# CloudFormationとの統合
# AWSサービスとの深い統合

# AWS特化の機能を最大限活用
```

### Architectを選ぶべき場合

```arc
# シンプルなアプリケーション
# 設定を最小限に抑えたい
# DynamoDB中心の設計

@app
simple-app # シンプルな設定
```

### Pulumiを選ぶべき場合

```typescript
// 汎用IaCツールとして使いたい
// 複数のクラウドプロバイダー
// プログラマティックな制御

const infrastructure = new MyInfrastructure({
  // あらゆるクラウドリソースを管理
})
```

## 実践例

### SSTでのフルスタックアプリ

```typescript
// sst.config.ts
export default {
  config() {
    return { name: "fullstack-app", region: "us-east-1" }
  },
  stacks(app) {
    app
      .stack(Database)
      .stack(API)
      .stack(Auth)
      .stack(Frontend)
  },
}
```

### Serverless Frameworkでのマイクロサービス

```yaml
# serverless.yml
service: user-service

functions:
  create:
    handler: handler.create
    events:
      - http: POST /users

  get:
    handler: handler.get
    events:
      - http: GET /users/{id}
```

### Pulumiでのマルチクラウド

```typescript
// AWS + GCP
import * as aws from "@pulumi/aws"
import * as gcp from "@pulumi/gcp"

const awsFunction = new aws.lambda.Function(...)
const gcpFunction = new gcp.cloudfunctions.Function(...)
```

## まとめ

サーバーレスフレームワークの選択は、プロジェクトの要件と開発チームの好みによります。

**推奨**:

- **SST**: モダンなTypeScriptプロジェクト
- **Serverless Framework**: マルチクラウド、プラグイン重視
- **AWS SAM**: AWS公式ツール優先
- **Architect**: シンプルさ重視
- **Pulumi**: 汎用IaC、マルチクラウド

**2026年のトレンド**:

- TypeScript優先の開発
- ライブデバッグの重要性
- Infrastructure as Codeの標準化
- マルチクラウド対応の需要増

適切なフレームワークを選択して、効率的なサーバーレス開発を実現しましょう。
