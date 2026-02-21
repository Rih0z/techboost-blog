---
title: 'AWS Lambda・サーバーレス完全ガイド2026：クラウドネイティブアーキテクチャ'
description: 'AWS Lambdaとサーバーレスアーキテクチャを徹底解説。API Gateway・DynamoDB・SQS・EventBridge・SAM・Serverless Framework・CDK・コールドスタート対策・コスト最適化まで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

サーバーレスアーキテクチャは、現代のクラウドネイティブ開発において最も重要なパラダイムシフトのひとつだ。AWS Lambdaを中心としたサーバーレスエコシステムは、インフラ管理の煩雑さを排除し、開発者がビジネスロジックに集中できる環境を提供する。本記事では、AWS Lambdaの基礎から本番運用まで、実践的なコード例を交えて網羅的に解説する。

## 目次

1. サーバーレスとは・AWS Lambdaの仕組み
2. Lambda関数の作成・デプロイ
3. ランタイム選択（Node.js・Python・Go・Rust）
4. API Gateway連携（REST API・HTTP API）
5. DynamoDB連携（NoSQLデータストア）
6. S3トリガー・イベント駆動アーキテクチャ
7. SQS・EventBridgeによる非同期処理
8. SAM（Serverless Application Model）
9. Serverless Frameworkによる管理
10. AWS CDKとLambda
11. コールドスタート対策
12. Lambda Power Tuning
13. 監視・可観測性
14. コスト試算と最適化

---

## 1. サーバーレスとは・AWS Lambdaの仕組み

### サーバーレスの定義

「サーバーレス」という言葉は誤解を招きやすいが、実際にはサーバーが存在しないわけではない。サーバーレスとは、開発者がサーバーのプロビジョニング・スケーリング・パッチ適用・管理を一切行わずにアプリケーションを実行できる実行モデルを指す。

サーバーレスの主要な特徴は以下の通りだ。

- **インフラ管理不要**: OSのパッチ適用、容量計画、スケーリング設定をクラウドプロバイダーが担当する
- **イベント駆動実行**: 関数はイベントが発生したときのみ実行される
- **自動スケーリング**: トラフィックの増減に応じて自動的にスケールアップ・ダウンする
- **従量課金**: 実行時間と呼び出し回数に対してのみ課金される
- **ステートレス**: 各関数呼び出しは独立したコンテキストで実行される

### AWS Lambdaのアーキテクチャ

AWS Lambdaは2014年にAmazonが発表したFaaS（Function as a Service）プラットフォームだ。内部的には以下のような仕組みで動作している。

**実行環境（Execution Environment）**

Lambdaは各関数に対して隔離された実行環境を提供する。この環境はFirecrackerという軽量な仮想化技術をベースにしており、起動時間をミリ秒単位に短縮している。

```
+----------------------------------+
|         AWS Lambda Service       |
+----------------------------------+
|    Invocation Request (Event)    |
+----------------------------------+
         |
         v
+----------------------------------+
|     Execution Environment        |
|  +----------------------------+  |
|  |  Lambda Runtime API        |  |
|  +----------------------------+  |
|  |  Function Code             |  |
|  |  (Handler)                 |  |
|  +----------------------------+  |
|  |  Runtime (Node.js/Python)  |  |
|  +----------------------------+  |
|  |  OS (Amazon Linux 2)       |  |
+----------------------------------+
```

**ライフサイクル**

Lambda関数の実行ライフサイクルは3つのフェーズで構成される。

1. **Init フェーズ**: 実行環境のブートストラップ、ランタイムの初期化、関数コードのロード
2. **Invoke フェーズ**: ハンドラー関数の実行、レスポンスの返却
3. **Shutdown フェーズ**: 実行環境のクリーンアップ

**コンカレンシーモデル**

Lambdaはリクエストごとに独立した実行環境を使用する。同時に複数のリクエストが来た場合、Lambdaは新しい実行環境を起動してスケールアウトする。

```
Request 1 → Execution Environment A
Request 2 → Execution Environment B  (新規起動)
Request 3 → Execution Environment C  (新規起動)
Request 4 → Execution Environment A  (再利用)
```

### サーバーレスの適用シナリオ

サーバーレスが特に効果的なユースケースを理解することが重要だ。

**適切なユースケース**

- API バックエンド（RESTful API、GraphQL）
- データ変換・ETLパイプライン
- イベント処理（S3アップロード、DynamoDB Stream）
- スケジュールタスク（Cron ジョブ）
- Webhook処理
- リアルタイム通知・メッセージング

**不適切なユースケース**

- 長時間実行が必要な処理（最大15分の制限あり）
- 低レイテンシーが厳密に要求される処理
- 大量のステートを保持する必要があるアプリケーション
- GPUが必要な機械学習推論

---

## 2. Lambda関数の作成・デプロイ

### AWSコンソールでの作成

最初のLambda関数を作成する最も簡単な方法はAWSコンソールを使うことだ。

1. AWSコンソールにログインし、Lambda サービスに移動する
2. 「関数の作成」をクリックする
3. 「一から作成」を選択する
4. 関数名を入力する（例: `hello-world`）
5. ランタイムを選択する（例: `Node.js 22.x`）
6. 「関数の作成」をクリックする

作成されたデフォルトのハンドラーは以下のようになっている。

```javascript
export const handler = async (event) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };
  return response;
};
```

### AWS CLIでのデプロイ

実際の開発ではCLIを使ったデプロイが標準的だ。

**前提条件のセットアップ**

```bash
# AWS CLIのインストール
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# 認証情報の設定
aws configure
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: ap-northeast-1
# Default output format: json
```

**Node.js Lambda関数のデプロイ**

```bash
# プロジェクトの作成
mkdir my-lambda && cd my-lambda
npm init -y

# 関数コードの作成
cat > index.mjs << 'EOF'
export const handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Hello from Lambda!',
      timestamp: new Date().toISOString(),
      requestId: context.awsRequestId,
    }),
  };
};
EOF

# ZIPファイルの作成
zip function.zip index.mjs

# IAMロールの作成（初回のみ）
aws iam create-role \
  --role-name lambda-basic-execution \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name lambda-basic-execution \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# 関数のデプロイ
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws lambda create-function \
  --function-name my-hello-world \
  --runtime nodejs22.x \
  --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-basic-execution \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --region ap-northeast-1

# 関数の実行テスト
aws lambda invoke \
  --function-name my-hello-world \
  --payload '{"key": "value"}' \
  --cli-binary-format raw-in-base64-out \
  output.json

cat output.json
```

**関数の更新**

```bash
# コードを変更後、ZIPを作り直してデプロイ
zip function.zip index.mjs

aws lambda update-function-code \
  --function-name my-hello-world \
  --zip-file fileb://function.zip
```

### 環境変数の設定

Lambda関数は環境変数を通じて設定を受け取ることができる。

```bash
aws lambda update-function-configuration \
  --function-name my-hello-world \
  --environment Variables='{
    "DB_HOST": "mydb.cluster.amazonaws.com",
    "DB_NAME": "production",
    "LOG_LEVEL": "info"
  }'
```

関数内での読み取り方法は以下の通りだ。

```javascript
// Node.js
const dbHost = process.env.DB_HOST;
const dbName = process.env.DB_NAME;
const logLevel = process.env.LOG_LEVEL;

// Python
import os
db_host = os.environ['DB_HOST']
db_name = os.environ['DB_NAME']
```

### Lambda レイヤーの活用

共通のライブラリをLayerとして管理することで、デプロイパッケージのサイズを削減できる。

```bash
# レイヤーの作成（Node.js の場合）
mkdir -p layer/nodejs
cd layer/nodejs
npm init -y
npm install axios lodash

cd ..
zip -r layer.zip nodejs/

aws lambda publish-layer-version \
  --layer-name common-utilities \
  --description "共通ユーティリティライブラリ" \
  --zip-file fileb://layer.zip \
  --compatible-runtimes nodejs22.x nodejs20.x \
  --region ap-northeast-1

# レイヤーを関数にアタッチ
LAYER_ARN=$(aws lambda list-layer-versions \
  --layer-name common-utilities \
  --query 'LayerVersions[0].LayerVersionArn' \
  --output text)

aws lambda update-function-configuration \
  --function-name my-hello-world \
  --layers ${LAYER_ARN}
```

---

## 3. ランタイム選択（Node.js・Python・Go・Rust）

### Node.js / TypeScript

Node.jsはLambdaで最も広く使われているランタイムだ。非同期処理との親和性が高く、豊富なnpmエコシステムを活用できる。

**TypeScript Lambda関数の設定**

```bash
mkdir ts-lambda && cd ts-lambda
npm init -y
npm install -D typescript @types/aws-lambda @types/node esbuild
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

```typescript
// src/handler.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> => {
  console.log('Request ID:', context.awsRequestId);
  
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'リクエストボディが必要です' }),
      };
    }

    const requestBody: CreateUserRequest = JSON.parse(event.body);

    if (!requestBody.name || !requestBody.email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'nameとemailは必須です' }),
      };
    }

    const user: User = {
      id: crypto.randomUUID(),
      name: requestBody.name,
      email: requestBody.email,
      createdAt: new Date().toISOString(),
    };

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
```

```json
// package.json（ビルドスクリプト）
{
  "scripts": {
    "build": "esbuild src/handler.ts --bundle --platform=node --target=node22 --outfile=dist/handler.js",
    "deploy": "npm run build && cd dist && zip -r ../function.zip . && cd .. && aws lambda update-function-code --function-name ts-lambda --zip-file fileb://function.zip"
  }
}
```

### Python

PythonはデータサイエンスやML関連のユースケースで特に強力だ。

```python
# handler.py
import json
import logging
import os
import boto3
from datetime import datetime, timezone
from typing import Any, Dict

# ロガーの設定
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# DynamoDBクライアントの初期化（コールドスタート時のみ実行）
dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-1')
table = dynamodb.Table(os.environ.get('TABLE_NAME', 'users'))


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda ハンドラー関数
    
    Args:
        event: イベントデータ（API Gatewayからのリクエスト等）
        context: Lambda実行コンテキスト
    
    Returns:
        APIGatewayのレスポンスオブジェクト
    """
    logger.info(f"Request ID: {context.aws_request_id}")
    logger.info(f"Event: {json.dumps(event)}")
    
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    
    try:
        if http_method == 'GET' and path == '/users':
            return get_users()
        elif http_method == 'POST' and path == '/users':
            body = json.loads(event.get('body', '{}'))
            return create_user(body)
        else:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Not Found'}),
            }
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal Server Error'}),
        }


def get_users() -> Dict[str, Any]:
    """全ユーザーを取得する"""
    response = table.scan()
    users = response.get('Items', [])
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'users': users,
            'count': len(users),
        }, default=str),
    }


def create_user(body: Dict[str, Any]) -> Dict[str, Any]:
    """新しいユーザーを作成する"""
    if 'name' not in body or 'email' not in body:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'nameとemailは必須です'}),
        }
    
    import uuid
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user = {
        'userId': user_id,
        'name': body['name'],
        'email': body['email'],
        'createdAt': now,
        'updatedAt': now,
    }
    
    table.put_item(Item=user)
    
    return {
        'statusCode': 201,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(user),
    }
```

### Go

GoはLambdaにおいてコールドスタートが速く、高パフォーマンスが要求される場面で優れた選択肢だ。

```go
// main.go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type Response struct {
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
	RequestID string    `json:"requestId"`
}

type Request struct {
	Name string `json:"name"`
}

var (
	serviceName = os.Getenv("SERVICE_NAME")
)

func handler(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("Processing request: %s", event.RequestContext.RequestID)

	var req Request
	if event.Body != "" {
		if err := json.Unmarshal([]byte(event.Body), &req); err != nil {
			return events.APIGatewayProxyResponse{
				StatusCode: 400,
				Body:       `{"error": "Invalid request body"}`,
			}, nil
		}
	}

	name := req.Name
	if name == "" {
		name = "World"
	}

	resp := Response{
		Message:   fmt.Sprintf("Hello, %s! From %s", name, serviceName),
		Timestamp: time.Now().UTC(),
		RequestID: event.RequestContext.RequestID,
	}

	body, err := json.Marshal(resp)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Body:       `{"error": "Internal Server Error"}`,
		}, nil
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
		Body: string(body),
	}, nil
}

func main() {
	lambda.Start(handler)
}
```

```bash
# Goのビルドとデプロイ
GOARCH=amd64 GOOS=linux go build -o bootstrap main.go
zip function.zip bootstrap

aws lambda create-function \
  --function-name go-lambda \
  --runtime provided.al2023 \
  --role arn:aws:iam::${ACCOUNT_ID}:role/lambda-basic-execution \
  --handler bootstrap \
  --zip-file fileb://function.zip
```

### Rust（AWS Lambda Rust Runtime）

RustはGoよりもさらに低コールドスタートと高いメモリ効率を実現できる。

```toml
# Cargo.toml
[package]
name = "rust-lambda"
version = "0.1.0"
edition = "2021"

[dependencies]
lambda_runtime = "0.13"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
```

```rust
// src/main.rs
use lambda_runtime::{service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Deserialize)]
struct Request {
    name: Option<String>,
}

#[derive(Serialize)]
struct Response {
    message: String,
    timestamp: String,
}

async fn function_handler(event: LambdaEvent<Request>) -> Result<Response, Error> {
    let name = event.payload.name.as_deref().unwrap_or("World");
    info!("Processing request for: {}", name);

    let response = Response {
        message: format!("Hello, {}! From Rust Lambda", name),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    Ok(response)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .json()
        .init();

    lambda_runtime::run(service_fn(function_handler)).await
}
```

```bash
# Rustのビルド（cargo-lambdaを使用）
cargo install cargo-lambda
cargo lambda build --release --arm64
cargo lambda deploy --region ap-northeast-1
```

---

## 4. API Gateway連携（REST API・HTTP API）

### REST API vs HTTP API

API GatewayにはREST APIとHTTP APIの2種類がある。

| 機能 | REST API | HTTP API |
|------|----------|----------|
| 料金 | 高め | 最大71%安い |
| レイテンシー | 標準 | 低い |
| 認証 | Cognito・Lambda・IAM | JWT・Lambda・IAM |
| WebSocket | 非対応 | 対応 |
| VPCリンク | 対応 | 対応 |
| リクエスト変換 | 対応 | 限定的 |
| キャッシュ | 対応 | 非対応 |

新規プロジェクトでは基本的にHTTP APIを選択することを推奨する。

### HTTP API + Lambda の実装

```typescript
// src/api-handler.ts
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';

type RouteHandler = (
  event: APIGatewayProxyEventV2,
  context: Context
) => Promise<APIGatewayProxyResultV2>;

// ルーティングテーブル
const routes: Record<string, RouteHandler> = {
  'GET /users': handleGetUsers,
  'POST /users': handleCreateUser,
  'GET /users/{userId}': handleGetUser,
  'PUT /users/{userId}': handleUpdateUser,
  'DELETE /users/{userId}': handleDeleteUser,
};

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> => {
  const routeKey = event.routeKey;

  const routeHandler = routes[routeKey];
  if (!routeHandler) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Route not found' }),
    };
  }

  try {
    return await routeHandler(event, context);
  } catch (error) {
    console.error('Route handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

async function handleGetUsers(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const queryParams = event.queryStringParameters ?? {};
  const limit = parseInt(queryParams.limit ?? '20', 10);
  const offset = parseInt(queryParams.offset ?? '0', 10);

  // データベースからユーザーを取得する実装
  const users: Array<{ id: string; name: string }> = [];

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      users,
      pagination: { limit, offset, total: 0 },
    }),
  };
}

async function handleCreateUser(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Request body is required' }),
    };
  }

  const body = JSON.parse(event.body);

  // バリデーション
  if (!body.name || !body.email) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Validation failed',
        details: ['name is required', 'email is required'].filter(Boolean),
      }),
    };
  }

  const newUser = {
    id: crypto.randomUUID(),
    name: body.name,
    email: body.email,
    createdAt: new Date().toISOString(),
  };

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
      'Location': `/users/${newUser.id}`,
    },
    body: JSON.stringify(newUser),
  };
}

async function handleGetUser(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const userId = event.pathParameters?.userId;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'userId is required' }),
    };
  }

  // ユーザー取得ロジック（実際はDynamoDB等から）
  const user = { id: userId, name: 'Sample User', email: 'user@example.com' };

  if (!user) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'User not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  };
}

async function handleUpdateUser(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const userId = event.pathParameters?.userId;
  const body = JSON.parse(event.body ?? '{}');

  console.log(`Updating user ${userId}:`, body);

  return {
    statusCode: 200,
    body: JSON.stringify({ id: userId, ...body, updatedAt: new Date().toISOString() }),
  };
}

async function handleDeleteUser(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const userId = event.pathParameters?.userId;
  console.log(`Deleting user ${userId}`);

  return {
    statusCode: 204,
    body: '',
  };
}
```

### JWT認証のカスタムオーソライザー

```typescript
// src/authorizer.ts
import { APIGatewayRequestAuthorizerEventV2 } from 'aws-lambda';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export const handler = async (event: APIGatewayRequestAuthorizerEventV2) => {
  const authHeader = event.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verify(token, JWT_SECRET) as {
      sub: string;
      email: string;
      role: string;
    };

    return {
      isAuthorized: true,
      context: {
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      },
    };
  } catch {
    throw new Error('Unauthorized');
  }
};
```

### CORSの設定

```yaml
# SAMテンプレートでのCORS設定例
Resources:
  MyApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      CorsConfiguration:
        AllowOrigins:
          - "https://myapp.com"
          - "http://localhost:3000"
        AllowHeaders:
          - "Content-Type"
          - "Authorization"
        AllowMethods:
          - "GET"
          - "POST"
          - "PUT"
          - "DELETE"
          - "OPTIONS"
        MaxAge: 300
```

---

## 5. DynamoDB連携（NoSQLデータストア）

### DynamoDBの設計原則

DynamoDBはサーバーレスアーキテクチャと最も相性の良いデータベースだ。設計時の重要なポイントを押さえておく必要がある。

**パーティションキーとソートキー**

```
テーブル設計例: users テーブル
+------------------+------------------+------------------+
| PK (userId)      | SK               | Attributes       |
+------------------+------------------+------------------+
| USER#abc123      | PROFILE          | name, email...   |
| USER#abc123      | ORDER#2026-01-01 | orderId, total...|
| USER#abc123      | ORDER#2026-01-02 | orderId, total...|
+------------------+------------------+------------------+
```

### DynamoDB DocumentClient の使い方

```typescript
// src/dynamodb-service.ts
import {
  DynamoDBClient,
  CreateTableCommand,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
  },
});

const TABLE_NAME = process.env.TABLE_NAME!;

interface User {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

// ユーザーの作成
export async function createUser(
  userData: Omit<User, 'userId' | 'createdAt' | 'updatedAt'>
): Promise<User> {
  const now = new Date().toISOString();
  const user: User = {
    userId: crypto.randomUUID(),
    ...userData,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${user.userId}`,
        SK: 'PROFILE',
        ...user,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  );

  return user;
}

// ユーザーの取得
export async function getUserById(userId: string): Promise<User | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
    })
  );

  if (!result.Item) return null;

  const { PK, SK, ...user } = result.Item;
  return user as User;
}

// ユーザーの更新
export async function updateUser(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'email' | 'role'>>
): Promise<User> {
  const now = new Date().toISOString();
  const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
  const expressionAttributeNames: Record<string, string> = {
    '#updatedAt': 'updatedAt',
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ':updatedAt': now,
  };

  if (updates.name !== undefined) {
    updateExpressions.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = updates.name;
  }
  if (updates.email !== undefined) {
    updateExpressions.push('#email = :email');
    expressionAttributeNames['#email'] = 'email';
    expressionAttributeValues[':email'] = updates.email;
  }
  if (updates.role !== undefined) {
    updateExpressions.push('#role = :role');
    expressionAttributeNames['#role'] = 'role';
    expressionAttributeValues[':role'] = updates.role;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    })
  );

  const { PK, SK, ...user } = result.Attributes!;
  return user as User;
}

// ユーザーの削除
export async function deleteUser(userId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      ConditionExpression: 'attribute_exists(PK)',
    })
  );
}

// ユーザーの注文履歴を取得（GSIを使用）
export async function getUserOrders(
  userId: string,
  options?: {
    limit?: number;
    startKey?: Record<string, unknown>;
  }
): Promise<{ orders: unknown[]; lastKey?: Record<string, unknown> }> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'ORDER#',
      },
      ScanIndexForward: false,  // 降順
      Limit: options?.limit ?? 20,
      ExclusiveStartKey: options?.startKey,
    })
  );

  return {
    orders: result.Items ?? [],
    lastKey: result.LastEvaluatedKey as Record<string, unknown>,
  };
}

// トランザクション処理
export async function transferBalance(
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<void> {
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `USER#${fromUserId}`, SK: 'BALANCE' },
            UpdateExpression: 'SET balance = balance - :amount',
            ConditionExpression: 'balance >= :amount',
            ExpressionAttributeValues: { ':amount': amount },
          },
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `USER#${toUserId}`, SK: 'BALANCE' },
            UpdateExpression: 'SET balance = balance + :amount',
            ExpressionAttributeValues: { ':amount': amount },
          },
        },
      ],
    })
  );
}
```

### DynamoDB Streamsの活用

DynamoDB Streamsを使うとテーブルの変更をLambdaでリアルタイム処理できる。

```typescript
// src/stream-processor.ts
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { AttributeValue } from '@aws-sdk/client-dynamodb';

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: DynamoDBRecord): Promise<void> {
  const eventType = record.eventName;

  switch (eventType) {
    case 'INSERT': {
      const newImage = record.dynamodb?.NewImage;
      if (!newImage) break;
      const newItem = unmarshall(newImage as Record<string, AttributeValue>);
      console.log('New item created:', newItem);
      await handleInsert(newItem);
      break;
    }
    case 'MODIFY': {
      const oldImage = record.dynamodb?.OldImage;
      const newImage = record.dynamodb?.NewImage;
      if (!oldImage || !newImage) break;
      const oldItem = unmarshall(oldImage as Record<string, AttributeValue>);
      const newItem = unmarshall(newImage as Record<string, AttributeValue>);
      console.log('Item modified:', { old: oldItem, new: newItem });
      await handleModify(oldItem, newItem);
      break;
    }
    case 'REMOVE': {
      const oldImage = record.dynamodb?.OldImage;
      if (!oldImage) break;
      const removedItem = unmarshall(oldImage as Record<string, AttributeValue>);
      console.log('Item removed:', removedItem);
      await handleRemove(removedItem);
      break;
    }
  }
}

async function handleInsert(item: Record<string, unknown>): Promise<void> {
  // 新規ユーザー登録時にウェルカムメールを送信する等の処理
  if (item.PK && String(item.PK).startsWith('USER#') && item.SK === 'PROFILE') {
    console.log(`Welcome email to be sent to: ${item.email}`);
    // await emailService.sendWelcome(item.email as string, item.name as string);
  }
}

async function handleModify(
  _oldItem: Record<string, unknown>,
  _newItem: Record<string, unknown>
): Promise<void> {
  // 変更の監査ログを記録する等
}

async function handleRemove(_item: Record<string, unknown>): Promise<void> {
  // 削除時のクリーンアップ処理
}
```

---

## 6. S3トリガー・イベント駆動アーキテクチャ

### S3イベント通知

S3バケットへのファイルアップロードをトリガーにしてLambdaを実行するパターンは非常に一般的だ。

```typescript
// src/s3-processor.ts
import { S3Event, S3EventRecord } from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET!;

export const handler = async (event: S3Event): Promise<void> => {
  const records = event.Records;
  console.log(`Processing ${records.length} S3 events`);

  await Promise.all(records.map((record) => processRecord(record)));
};

async function processRecord(record: S3EventRecord): Promise<void> {
  const sourceBucket = record.s3.bucket.name;
  const sourceKey = decodeURIComponent(
    record.s3.object.key.replace(/\+/g, ' ')
  );

  console.log(`Processing s3://${sourceBucket}/${sourceKey}`);

  // ファイルの取得
  const getCommand = new GetObjectCommand({
    Bucket: sourceBucket,
    Key: sourceKey,
  });

  const { Body, ContentType } = await s3Client.send(getCommand);
  if (!Body) throw new Error('Empty response body');

  // ストリームをバッファに変換
  const content = await streamToBuffer(Body as Readable);

  // ファイルの種類に応じた処理
  if (ContentType?.includes('image')) {
    await processImage(content, sourceKey);
  } else if (ContentType?.includes('text/csv')) {
    await processCsvFile(content, sourceKey);
  } else if (ContentType?.includes('application/json')) {
    await processJsonFile(content, sourceKey);
  }
}

async function processImage(
  content: Buffer,
  sourceKey: string
): Promise<void> {
  // 画像処理ロジック（サムネイル生成等）
  console.log(`Processing image: ${sourceKey}, size: ${content.length} bytes`);

  // Sharp等のライブラリを使った変換処理
  const outputKey = `thumbnails/${sourceKey}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: OUTPUT_BUCKET,
      Key: outputKey,
      Body: content,  // 実際はリサイズ後の内容
      ContentType: 'image/jpeg',
    })
  );

  console.log(`Thumbnail saved to s3://${OUTPUT_BUCKET}/${outputKey}`);
}

async function processCsvFile(
  content: Buffer,
  sourceKey: string
): Promise<void> {
  const csvContent = content.toString('utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');

  console.log(`CSV headers: ${headers.join(', ')}`);
  console.log(`Row count: ${lines.length - 1}`);

  // CSVパースと処理
  const records = lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, index) => {
        obj[header.trim()] = values[index]?.trim() ?? '';
        return obj;
      }, {} as Record<string, string>);
    });

  // 処理済みデータをJSONとして保存
  const outputKey = sourceKey.replace('.csv', '.json');
  await s3Client.send(
    new PutObjectCommand({
      Bucket: OUTPUT_BUCKET,
      Key: outputKey,
      Body: JSON.stringify({ records, processedAt: new Date().toISOString() }),
      ContentType: 'application/json',
    })
  );
}

async function processJsonFile(
  content: Buffer,
  _sourceKey: string
): Promise<void> {
  const data = JSON.parse(content.toString('utf-8'));
  console.log('Processing JSON data:', typeof data);
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
```

### イベント駆動アーキテクチャのパターン

**Fan-Out パターン**

```
                    +-- Lambda A (画像処理)
                    |
S3 Upload -> SNS -->+-- Lambda B (メタデータ保存)
                    |
                    +-- Lambda C (通知送信)
```

```typescript
// src/sns-fanout.ts
import { SNSEvent, SNSMessage } from 'aws-lambda';

export const handler = async (event: SNSEvent): Promise<void> => {
  for (const record of event.Records) {
    const message: SNSMessage = record.Sns;
    const subject = message.Subject;
    const body = JSON.parse(message.Message);

    console.log(`Received SNS message: ${subject}`);
    console.log('Message body:', body);

    // 各サブスクライバーの処理をここに実装
    await processNotification(subject, body);
  }
};

async function processNotification(
  subject: string | undefined,
  body: unknown
): Promise<void> {
  switch (subject) {
    case 'USER_CREATED':
      console.log('Processing user creation notification:', body);
      break;
    case 'ORDER_PLACED':
      console.log('Processing order notification:', body);
      break;
    default:
      console.log('Unknown notification type:', subject);
  }
}
```

---

## 7. SQS・EventBridgeによる非同期処理

### SQSキューとLambdaの連携

SQS（Simple Queue Service）とLambdaを組み合わせることで、信頼性の高い非同期処理システムを構築できる。

```typescript
// src/sqs-processor.ts
import { SQSEvent, SQSRecord, SQSBatchResponse } from 'aws-lambda';

interface OrderMessage {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  createdAt: string;
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: Array<{ itemIdentifier: string }> = [];

  await Promise.allSettled(
    event.Records.map(async (record) => {
      try {
        await processRecord(record);
      } catch (error) {
        console.error(`Failed to process message ${record.messageId}:`, error);
        // 失敗したメッセージIDをレポート（部分バッチレスポンス）
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    })
  );

  return { batchItemFailures };
};

async function processRecord(record: SQSRecord): Promise<void> {
  const message: OrderMessage = JSON.parse(record.body);

  console.log(`Processing order: ${message.orderId}`);
  console.log(`User: ${message.userId}`);
  console.log(`Total amount: ${message.totalAmount}`);

  // 1. 在庫確認
  await checkInventory(message.items);

  // 2. 支払い処理
  await processPayment(message.userId, message.totalAmount, message.orderId);

  // 3. 出荷処理
  await initiateShipment(message.orderId, message.userId);

  // 4. 完了通知
  await sendConfirmationEmail(message.userId, message.orderId);

  console.log(`Order ${message.orderId} processed successfully`);
}

async function checkInventory(
  items: OrderMessage['items']
): Promise<void> {
  for (const item of items) {
    console.log(
      `Checking inventory for product ${item.productId}: qty ${item.quantity}`
    );
    // 実際の在庫確認ロジック
  }
}

async function processPayment(
  userId: string,
  amount: number,
  orderId: string
): Promise<void> {
  console.log(`Processing payment for user ${userId}: ¥${amount} for order ${orderId}`);
  // 決済処理
}

async function initiateShipment(
  orderId: string,
  userId: string
): Promise<void> {
  console.log(`Initiating shipment for order ${orderId} to user ${userId}`);
  // 出荷処理
}

async function sendConfirmationEmail(
  userId: string,
  orderId: string
): Promise<void> {
  console.log(`Sending confirmation email to user ${userId} for order ${orderId}`);
  // メール送信
}
```

**SQSへのメッセージ送信**

```typescript
// src/sqs-sender.ts
import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.ORDER_QUEUE_URL!;

export async function enqueueOrder(order: {
  orderId: string;
  userId: string;
  totalAmount: number;
}): Promise<void> {
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(order),
      MessageGroupId: order.userId,  // FIFOキューの場合
      MessageDeduplicationId: order.orderId,  // FIFOキューの場合
      DelaySeconds: 0,
      MessageAttributes: {
        OrderType: {
          DataType: 'String',
          StringValue: 'standard',
        },
      },
    })
  );

  console.log(`Order ${order.orderId} enqueued`);
}

// バッチ送信（最大10メッセージ）
export async function enqueueOrdersBatch(orders: Array<{
  orderId: string;
  userId: string;
  totalAmount: number;
}>): Promise<void> {
  const entries = orders.slice(0, 10).map((order, index) => ({
    Id: String(index),
    MessageBody: JSON.stringify(order),
    DelaySeconds: 0,
  }));

  const result = await sqsClient.send(
    new SendMessageBatchCommand({
      QueueUrl: QUEUE_URL,
      Entries: entries,
    })
  );

  if (result.Failed && result.Failed.length > 0) {
    console.error('Failed to enqueue some messages:', result.Failed);
  }

  console.log(`Enqueued ${result.Successful?.length ?? 0} orders`);
}
```

### EventBridgeによるイベントルーティング

EventBridgeはサーバーレスアーキテクチャにおけるイベントバスとして機能し、疎結合なシステム設計を可能にする。

```typescript
// src/eventbridge-publisher.ts
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';

const eventBridgeClient = new EventBridgeClient({
  region: process.env.AWS_REGION,
});

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME ?? 'default';

interface DomainEvent<T = unknown> {
  source: string;
  detailType: string;
  detail: T;
}

export async function publishEvent<T>(event: DomainEvent<T>): Promise<void> {
  const result = await eventBridgeClient.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: EVENT_BUS_NAME,
          Source: event.source,
          DetailType: event.detailType,
          Detail: JSON.stringify(event.detail),
          Time: new Date(),
        },
      ],
    })
  );

  if (result.FailedEntryCount && result.FailedEntryCount > 0) {
    throw new Error(`Failed to publish ${result.FailedEntryCount} events`);
  }

  console.log(`Event published: ${event.detailType}`);
}

// ユースケース例
export async function publishUserCreated(user: {
  userId: string;
  email: string;
  name: string;
}): Promise<void> {
  await publishEvent({
    source: 'com.myapp.users',
    detailType: 'UserCreated',
    detail: {
      ...user,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function publishOrderPlaced(order: {
  orderId: string;
  userId: string;
  totalAmount: number;
}): Promise<void> {
  await publishEvent({
    source: 'com.myapp.orders',
    detailType: 'OrderPlaced',
    detail: {
      ...order,
      timestamp: new Date().toISOString(),
    },
  });
}
```

```typescript
// src/eventbridge-consumer.ts
import { EventBridgeEvent } from 'aws-lambda';

interface UserCreatedDetail {
  userId: string;
  email: string;
  name: string;
  timestamp: string;
}

interface OrderPlacedDetail {
  orderId: string;
  userId: string;
  totalAmount: number;
  timestamp: string;
}

export const handler = async (
  event: EventBridgeEvent<string, UserCreatedDetail | OrderPlacedDetail>
): Promise<void> => {
  console.log(`Received event: ${event['detail-type']}`);
  console.log('Source:', event.source);
  console.log('Detail:', event.detail);

  switch (event['detail-type']) {
    case 'UserCreated':
      await handleUserCreated(event.detail as UserCreatedDetail);
      break;
    case 'OrderPlaced':
      await handleOrderPlaced(event.detail as OrderPlacedDetail);
      break;
    default:
      console.warn(`Unknown event type: ${event['detail-type']}`);
  }
};

async function handleUserCreated(detail: UserCreatedDetail): Promise<void> {
  console.log(`New user created: ${detail.name} (${detail.email})`);
  // ウェルカムメール送信、初期設定など
}

async function handleOrderPlaced(detail: OrderPlacedDetail): Promise<void> {
  console.log(
    `Order placed: ${detail.orderId} by user ${detail.userId}, total: ¥${detail.totalAmount}`
  );
  // 注文処理、在庫更新など
}
```

### EventBridge Schedulerを使ったCronジョブ

```yaml
# SAMテンプレートでのスケジュール設定
Resources:
  DailyReportFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: daily-report-generator
      Handler: src/reports/daily.handler
      Runtime: nodejs22.x
      Events:
        DailySchedule:
          Type: ScheduleV2
          Properties:
            ScheduleExpression: "cron(0 9 * * ? *)"  # 毎日9時
            ScheduleExpressionTimezone: "Asia/Tokyo"
            Input: '{"reportType": "daily"}'
            RetryPolicy:
              MaximumRetryAttempts: 2
```

---

## 8. SAM（Serverless Application Model）

### SAMとは

AWS SAM（Serverless Application Model）はサーバーレスアプリケーションのインフラをコードで管理するためのオープンソースフレームワークだ。CloudFormationの拡張として動作する。

### SAMプロジェクトの作成

```bash
# SAM CLIのインストール
brew install aws-sam-cli

# 新規プロジェクトの作成
sam init \
  --runtime nodejs22.x \
  --dependency-manager npm \
  --app-template hello-world \
  --name my-serverless-app

cd my-serverless-app

# ローカル実行
sam local start-api

# ビルド
sam build

# デプロイ
sam deploy --guided
```

### 本番レベルのSAMテンプレート

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Description: >
  My Serverless Application
  本番環境向けサーバーレスAPIサービス

Globals:
  Function:
    Timeout: 30
    MemorySize: 512
    Runtime: nodejs22.x
    Architectures:
      - arm64
    Environment:
      Variables:
        TABLE_NAME: !Ref MainTable
        REGION: !Ref AWS::Region
    Layers:
      - !Ref CommonLayer
    Tracing: Active
    LoggingConfig:
      LogFormat: JSON
      ApplicationLogLevel: INFO

Parameters:
  Stage:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]
  DomainName:
    Type: String
    Default: ""

Conditions:
  IsProd: !Equals [!Ref Stage, prod]

Resources:
  # API
  HttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      StageName: !Ref Stage
      Auth:
        DefaultAuthorizer: JwtAuthorizer
        Authorizers:
          JwtAuthorizer:
            IdentitySource: $request.header.Authorization
            JwtConfiguration:
              Issuer: !Sub "https://cognito-idp.${AWS::Region}.amazonaws.com/${UserPool}"
              Audience:
                - !Ref UserPoolClient
      CorsConfiguration:
        AllowOrigins:
          - "https://myapp.com"
          - !If [IsProd, !Ref AWS::NoValue, "http://localhost:3000"]
        AllowHeaders:
          - "Content-Type"
          - "Authorization"
        AllowMethods:
          - "GET"
          - "POST"
          - "PUT"
          - "DELETE"

  # Lambda関数群
  UsersFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${Stage}-users-api"
      CodeUri: src/
      Handler: users/handler.handler
      Description: "ユーザー管理API"
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
      Events:
        GetUsers:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Method: GET
            Path: /users
        CreateUser:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Method: POST
            Path: /users
        GetUser:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Method: GET
            Path: /users/{userId}
        UpdateUser:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Method: PUT
            Path: /users/{userId}
        DeleteUser:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Method: DELETE
            Path: /users/{userId}

  OrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${Stage}-orders-api"
      CodeUri: src/
      Handler: orders/handler.handler
      Description: "注文管理API"
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - SQSSendMessagePolicy:
            QueueName: !GetAtt OrderQueue.QueueName
      Events:
        CreateOrder:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Method: POST
            Path: /orders

  OrderProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${Stage}-order-processor"
      CodeUri: src/
      Handler: orders/processor.handler
      Description: "注文処理ワーカー"
      Timeout: 120
      ReservedConcurrentExecutions: 10
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
      Events:
        SQSTrigger:
          Type: SQS
          Properties:
            Queue: !GetAtt OrderQueue.Arn
            BatchSize: 10
            FunctionResponseTypes:
              - ReportBatchItemFailures

  # DynamoDBテーブル
  MainTable:
    Type: AWS::DynamoDB::Table
    DeletionPolicy: !If [IsProd, Retain, Delete]
    Properties:
      TableName: !Sub "${Stage}-main-table"
      BillingMode: PAY_PER_REQUEST
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: !If [IsProd, true, false]
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: GSI1
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES
      Tags:
        - Key: Environment
          Value: !Ref Stage

  # SQSキュー
  OrderQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "${Stage}-order-queue.fifo"
      FifoQueue: true
      ContentBasedDeduplication: true
      MessageRetentionPeriod: 86400
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt OrderDLQ.Arn
        maxReceiveCount: 3

  OrderDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "${Stage}-order-dlq.fifo"
      FifoQueue: true

  # 共通Layerの定義
  CommonLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: !Sub "${Stage}-common-layer"
      ContentUri: layers/common/
      CompatibleRuntimes:
        - nodejs22.x
      RetentionPolicy: Retain
    Metadata:
      BuildMethod: nodejs22.x

  # Cognito
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub "${Stage}-user-pool"
      AutoVerifiedAttributes:
        - email

  UserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      ClientName: !Sub "${Stage}-app-client"
      UserPoolId: !Ref UserPool

Outputs:
  ApiUrl:
    Description: "API GatewayのURL"
    Value: !Sub "https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com/${Stage}"
  TableName:
    Description: "DynamoDBテーブル名"
    Value: !Ref MainTable
  UserPoolId:
    Description: "Cognito User Pool ID"
    Value: !Ref UserPool
```

---

## 9. Serverless Frameworkによる管理

### Serverless Frameworkのセットアップ

```bash
# インストール
npm install -g serverless

# プロジェクトの作成
serverless create \
  --template aws-nodejs-typescript \
  --path my-serverless-service

cd my-serverless-service
npm install
```

### serverless.yml の設定

```yaml
# serverless.yml
service: my-api-service

frameworkVersion: "^4"

plugins:
  - serverless-esbuild
  - serverless-offline
  - serverless-dotenv-plugin

custom:
  stage: ${opt:stage, 'dev'}
  region: ${opt:region, 'ap-northeast-1'}
  
  esbuild:
    bundle: true
    minify: true
    sourcemap: true
    target: node22
    define:
      'require.resolve': undefined
    platform: node
    concurrency: 10

  tableNames:
    users: ${self:service}-${self:custom.stage}-users
    orders: ${self:service}-${self:custom.stage}-orders

provider:
  name: aws
  runtime: nodejs22.x
  region: ${self:custom.region}
  stage: ${self:custom.stage}
  architecture: arm64
  memorySize: 512
  timeout: 30
  
  tracing:
    lambda: true
    apiGateway: true

  environment:
    STAGE: ${self:custom.stage}
    USERS_TABLE: ${self:custom.tableNames.users}
    ORDERS_TABLE: ${self:custom.tableNames.orders}
    JWT_SECRET: ${ssm:/myapp/${self:custom.stage}/jwt-secret}

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
          Resource:
            - !GetAtt UsersTable.Arn
            - !Sub "${UsersTable.Arn}/index/*"
            - !GetAtt OrdersTable.Arn
            - !Sub "${OrdersTable.Arn}/index/*"
        - Effect: Allow
          Action:
            - xray:PutTraceSegments
            - xray:PutTelemetryRecords
          Resource: "*"

  httpApi:
    authorizers:
      jwtAuth:
        type: jwt
        identitySource: $request.header.Authorization
        issuerUrl: !Sub "https://cognito-idp.${AWS::Region}.amazonaws.com/${CognitoUserPool}"
        audience:
          - !Ref CognitoUserPoolClient
    cors:
      allowedOrigins:
        - https://myapp.com
        - http://localhost:3000
      allowedHeaders:
        - Content-Type
        - Authorization
      allowedMethods:
        - GET
        - POST
        - PUT
        - DELETE

functions:
  getUsers:
    handler: src/users/handler.getUsers
    description: ユーザー一覧取得
    events:
      - httpApi:
          path: /users
          method: GET
          authorizer:
            name: jwtAuth

  createUser:
    handler: src/users/handler.createUser
    description: ユーザー作成
    events:
      - httpApi:
          path: /users
          method: POST
          authorizer:
            name: jwtAuth

  processOrders:
    handler: src/orders/processor.handler
    description: 注文処理ワーカー
    timeout: 120
    reservedConcurrency: 10
    events:
      - sqs:
          arn: !GetAtt OrderQueue.Arn
          batchSize: 10
          functionResponseType: ReportBatchItemFailures

  scheduledReport:
    handler: src/reports/daily.handler
    description: 日次レポート生成
    events:
      - schedule:
          rate: cron(0 9 * * ? *)
          enabled: true
          input:
            reportType: daily

resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:custom.tableNames.users}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: PK
            AttributeType: S
          - AttributeName: SK
            AttributeType: S
        KeySchema:
          - AttributeName: PK
            KeyType: HASH
          - AttributeName: SK
            KeyType: RANGE

    OrderQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-${self:custom.stage}-orders.fifo
        FifoQueue: true

  Outputs:
    ApiEndpoint:
      Value: !Sub "https://${HttpApi}.execute-api.${self:custom.region}.amazonaws.com"
```

---

## 10. AWS CDKとLambda

### CDKのセットアップ

```bash
npm install -g aws-cdk
mkdir cdk-lambda-app && cd cdk-lambda-app
cdk init app --language typescript
npm install @aws-cdk/aws-lambda @aws-cdk/aws-apigatewayv2 aws-cdk-lib constructs
```

### CDKスタックの実装

```typescript
// lib/serverless-stack.ts
import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as eventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

interface ServerlessStackProps extends StackProps {
  stage: 'dev' | 'staging' | 'prod';
}

export class ServerlessStack extends Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ServerlessStackProps) {
    super(scope, id, props);

    const isProd = props.stage === 'prod';

    // DynamoDB テーブル
    const mainTable = new dynamodb.Table(this, 'MainTable', {
      tableName: `${props.stage}-main-table`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      pointInTimeRecovery: isProd,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // SQSキュー
    const orderDlq = new sqs.Queue(this, 'OrderDLQ', {
      queueName: `${props.stage}-order-dlq.fifo`,
      fifo: true,
    });

    const orderQueue = new sqs.Queue(this, 'OrderQueue', {
      queueName: `${props.stage}-order-queue.fifo`,
      fifo: true,
      contentBasedDeduplication: true,
      deadLetterQueue: {
        queue: orderDlq,
        maxReceiveCount: 3,
      },
    });

    // Lambda関数の共通設定
    const commonProps: Partial<lambdaNodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_MONTH,
      bundling: {
        target: 'node22',
        minify: isProd,
        sourceMap: !isProd,
        externalModules: [],
      },
      environment: {
        TABLE_NAME: mainTable.tableName,
        STAGE: props.stage,
        NODE_OPTIONS: '--enable-source-maps',
      },
    };

    // ユーザーAPI関数
    const usersFunction = new lambdaNodejs.NodejsFunction(
      this,
      'UsersFunction',
      {
        ...commonProps,
        functionName: `${props.stage}-users-api`,
        entry: path.join(__dirname, '../src/users/handler.ts'),
        description: 'ユーザー管理API',
      }
    );
    mainTable.grantReadWriteData(usersFunction);

    // 注文API関数
    const ordersFunction = new lambdaNodejs.NodejsFunction(
      this,
      'OrdersFunction',
      {
        ...commonProps,
        functionName: `${props.stage}-orders-api`,
        entry: path.join(__dirname, '../src/orders/handler.ts'),
        description: '注文管理API',
      }
    );
    mainTable.grantReadWriteData(ordersFunction);
    orderQueue.grantSendMessages(ordersFunction);

    // 注文処理ワーカー
    const orderProcessorFunction = new lambdaNodejs.NodejsFunction(
      this,
      'OrderProcessorFunction',
      {
        ...commonProps,
        functionName: `${props.stage}-order-processor`,
        entry: path.join(__dirname, '../src/orders/processor.ts'),
        description: '注文処理ワーカー',
        timeout: Duration.seconds(120),
        reservedConcurrentExecutions: 10,
      }
    );
    mainTable.grantReadWriteData(orderProcessorFunction);
    orderProcessorFunction.addEventSource(
      new eventSources.SqsEventSource(orderQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      })
    );

    // Cognito
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${props.stage}-user-pool`,
      selfSignUpEnabled: true,
      autoVerify: { email: true },
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: `${props.stage}-app-client`,
    });

    // HTTP API
    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${props.stage}-api`,
      corsPreflight: {
        allowOrigins: isProd
          ? ['https://myapp.com']
          : ['https://myapp.com', 'http://localhost:3000'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
        ],
      },
    });

    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer(
      'JwtAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
      }
    );

    // ルートの追加
    httpApi.addRoutes({
      path: '/users',
      methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        'UsersIntegration',
        usersFunction
      ),
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: '/users/{userId}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: new integrations.HttpLambdaIntegration(
        'UserIntegration',
        usersFunction
      ),
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: '/orders',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        'OrdersIntegration',
        ordersFunction
      ),
      authorizer: jwtAuthorizer,
    });

    this.apiUrl = httpApi.apiEndpoint;
  }
}
```

```typescript
// bin/app.ts
import { App } from 'aws-cdk-lib';
import { ServerlessStack } from '../lib/serverless-stack';

const app = new App();

const stage = (app.node.tryGetContext('stage') ?? 'dev') as 'dev' | 'staging' | 'prod';

new ServerlessStack(app, `ServerlessApp-${stage}`, {
  stage,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },
  description: `Serverless Application - ${stage}`,
});
```

```bash
# デプロイコマンド
cdk bootstrap
cdk deploy --context stage=dev
cdk deploy --context stage=prod
```

---

## 11. コールドスタート対策

### コールドスタートの仕組み

コールドスタートとは、Lambda関数が一定時間実行されていなかった後、新しいリクエストが来たときに実行環境を一から初期化する現象だ。

```
コールドスタートのタイムライン:
[環境起動] + [ランタイム初期化] + [関数コード初期化] + [ハンドラー実行]
  ~100ms       ~50-200ms           ~50-500ms           実際の処理時間

ウォームスタートのタイムライン:
[ハンドラー実行のみ]
  実際の処理時間のみ
```

**コールドスタートを引き起こす要因**

- 長時間リクエストがない
- 同時接続数の急増（スケールアウト時）
- 関数コードの更新・デプロイ
- 設定変更（メモリサイズ、タイムアウト等）

### Provisioned Concurrency

Provisioned Concurrencyは事前に実行環境を初期化しておく機能で、コールドスタートを完全に排除できる。

```yaml
# SAMテンプレートでの設定
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: my-api-function
      Handler: index.handler
      Runtime: nodejs22.x
      AutoPublishAlias: live  # エイリアスの自動発行

  MyFunctionProvisionedConfig:
    Type: AWS::Lambda::ProvisionedConcurrencyConfig
    Properties:
      FunctionName: !Ref MyFunction
      Qualifier: live
      ProvisionedConcurrentExecutions: 5  # 5つの環境を常に初期化
```

**Application Auto Scalingと組み合わせた動的プロビジョニング**

```yaml
Resources:
  ScalableTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      MaxCapacity: 20
      MinCapacity: 2
      ResourceId: !Sub "function:${MyFunction}:live"
      RoleARN: !Sub "arn:aws:iam::${AWS::AccountId}:role/aws-service-role/lambda.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_LambdaConcurrency"
      ScalableDimension: lambda:function:ProvisionedConcurrency
      ServiceNamespace: lambda

  ScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      PolicyName: lambda-scaling-policy
      PolicyType: TargetTrackingScaling
      ScalingTargetId: !Ref ScalableTarget
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 0.7  # 70%の使用率でスケールアウト
        PredefinedMetricSpecification:
          PredefinedMetricType: LambdaProvisionedConcurrencyUtilization
```

### Lambda SnapStart（Java向け）

Java関数のコールドスタートを最大90%削減できる機能だ。

```yaml
Resources:
  JavaFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: java-api
      Runtime: java21
      Handler: com.example.Handler::handleRequest
      SnapStart:
        ApplyOn: PublishedVersions
      AutoPublishAlias: live
```

### コードレベルでのコールドスタート最適化

**1. 重い初期化はハンドラーの外で行う**

```typescript
// 良い例: 初期化はモジュールレベルで（コールドスタート時のみ実行）
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// これはコールドスタート時に一度だけ実行される
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: unknown) => {
  // docClientはすでに初期化済み
  // ...
};
```

```typescript
// 悪い例: 毎回初期化（ウォームスタートでも毎回コストがかかる）
export const handler = async (event: unknown) => {
  const client = new DynamoDBClient({ region: process.env.AWS_REGION });
  const docClient = DynamoDBDocumentClient.from(client);
  // ...
};
```

**2. デプロイパッケージの最適化**

```bash
# esbuildでバンドル・最小化
esbuild src/handler.ts \
  --bundle \
  --platform=node \
  --target=node22 \
  --minify \
  --tree-shaking=true \
  --outfile=dist/handler.js
```

**3. メモリ設定とCPU性能**

Lambdaはメモリに比例してCPUが割り当てられる。メモリを増やすとCPU性能が上がり、初期化時間が短縮される場合がある。

```
メモリ128MB  → vCPU 0.07相当
メモリ1024MB → vCPU 0.57相当
メモリ1769MB → vCPU 1.00（1vCPU相当）
メモリ3008MB → vCPU 1.70相当
メモリ10240MB → vCPU 6.00（最大）
```

**4. ARM64（Graviton2）アーキテクチャの採用**

x86に比べて最大34%のパフォーマンス向上と20%のコスト削減が期待できる。

```yaml
# SAMでのarm64設定
Globals:
  Function:
    Architectures:
      - arm64
```

---

## 12. Lambda Power Tuning

### Lambda Power Tuningとは

Lambda Power TuningはAWS Step Functionsを使ってLambda関数の最適なメモリ設定を自動的に見つけるオープンソースツールだ。複数のメモリ設定で実際に関数を実行し、コストとパフォーマンスのトレードオフを可視化する。

### セットアップと実行

```bash
# AWS SAR（Serverless Application Repository）からデプロイ
aws serverlessrepo create-cloud-formation-change-set \
  --application-id arn:aws:serverlessrepo:us-east-1:451282441545:applications/aws-lambda-power-tuning \
  --stack-name lambda-power-tuning \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides '[{"name":"lambdaResource","value":"*"}]'

# デプロイの実行
aws cloudformation execute-change-set \
  --change-set-name <change-set-name> \
  --stack-name lambda-power-tuning

# Step Functions の ARN を取得
STATE_MACHINE_ARN=$(aws cloudformation describe-stacks \
  --stack-name lambda-power-tuning \
  --query 'Stacks[0].Outputs[?OutputKey==`StateMachineARN`].OutputValue' \
  --output text)

# Power Tuningの実行
EXECUTION_ARN=$(aws stepfunctions start-execution \
  --state-machine-arn ${STATE_MACHINE_ARN} \
  --input '{
    "lambdaARN": "arn:aws:lambda:ap-northeast-1:123456789:function:my-function",
    "powerValues": [128, 256, 512, 1024, 2048, 3008],
    "num": 10,
    "payload": {"test": "data"},
    "parallelInvocation": true,
    "strategy": "balanced"
  }' \
  --query 'executionArn' \
  --output text)

echo "Execution ARN: ${EXECUTION_ARN}"
```

### 結果の解釈

Power Tuningの結果は以下のようなURLで可視化できる。

```
https://lambda-power-tuning.show/#RESULT_DATA_BASE64
```

典型的な結果の例:

```
メモリ設定  | 実行時間(ms) | コスト($) | 推奨
-----------|------------|----------|-----
128 MB     | 850        | 0.00003  | コスト最適
256 MB     | 420        | 0.000028 |
512 MB     | 215        | 0.000030 |
1024 MB    | 112        | 0.000030 | バランス
2048 MB    | 65         | 0.000036 |
3008 MB    | 55         | 0.000052 | スピード最適
```

### 最適化戦略の選択

```python
# Power Tuning結果を分析するPythonスクリプト
import json

def analyze_power_tuning_results(results: dict) -> dict:
    """
    Power Tuning結果を分析し、推奨設定を返す
    
    Args:
        results: Power Tuning実行結果のJSON
    
    Returns:
        推奨メモリ設定と理由
    """
    measurements = results.get('measurements', [])
    
    # コスト最小化
    min_cost = min(measurements, key=lambda x: x['averagePrice'])
    
    # 実行時間最小化
    min_time = min(measurements, key=lambda x: x['averageDuration'])
    
    # バランス（コストと時間の積が最小）
    balanced = min(
        measurements,
        key=lambda x: x['averagePrice'] * x['averageDuration']
    )
    
    return {
        'cost_optimal': {
            'memory': min_cost['power'],
            'avg_duration_ms': min_cost['averageDuration'],
            'avg_cost_usd': min_cost['averagePrice'],
        },
        'speed_optimal': {
            'memory': min_time['power'],
            'avg_duration_ms': min_time['averageDuration'],
            'avg_cost_usd': min_time['averagePrice'],
        },
        'balanced': {
            'memory': balanced['power'],
            'avg_duration_ms': balanced['averageDuration'],
            'avg_cost_usd': balanced['averagePrice'],
        },
    }
```

---

## 13. 監視・可観測性

### CloudWatch Logs Insights

Lambda関数のログを分析するためのCLIコマンド例:

```bash
# 直近1時間のエラーを集計
aws logs start-query \
  --log-group-name "/aws/lambda/my-function" \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string '
    fields @timestamp, @message
    | filter @message like /ERROR/
    | stats count(*) as errorCount by bin(5m) as period
    | sort period desc
  '

# 実行時間の分析
aws logs start-query \
  --log-group-name "/aws/lambda/my-function" \
  --start-time $(date -d '24 hours ago' +%s) \
  --end-time $(date +%s) \
  --query-string '
    filter @type = "REPORT"
    | stats
        avg(@duration) as avgDuration,
        max(@duration) as maxDuration,
        min(@duration) as minDuration,
        avg(@maxMemoryUsed) as avgMemory,
        count(*) as invocations
    by bin(1h) as period
    | sort period desc
  '
```

### 構造化ログの実装

```typescript
// src/utils/logger.ts
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  requestId?: string;
  userId?: string;
  duration?: number;
  [key: string]: unknown;
}

export class Logger {
  private requestId: string;
  private context: Record<string, unknown>;

  constructor(requestId: string, context: Record<string, unknown> = {}) {
    this.requestId = requestId;
    this.context = context;
  }

  private log(level: LogEntry['level'], message: string, extra?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...extra,
    };
    
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, extra?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, extra);
    }
  }

  info(message: string, extra?: Record<string, unknown>): void {
    this.log('info', message, extra);
  }

  warn(message: string, extra?: Record<string, unknown>): void {
    this.log('warn', message, extra);
  }

  error(message: string, error?: Error, extra?: Record<string, unknown>): void {
    this.log('error', message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      ...extra,
    });
  }

  withContext(context: Record<string, unknown>): Logger {
    return new Logger(this.requestId, { ...this.context, ...context });
  }
}

// 使用例
export const handler = async (event: unknown, context: { awsRequestId: string }) => {
  const logger = new Logger(context.awsRequestId, {
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    environment: process.env.STAGE,
  });

  logger.info('Request received', { event });
  
  try {
    const result = await processRequest(event);
    logger.info('Request processed successfully', { result });
    return result;
  } catch (error) {
    logger.error('Request processing failed', error as Error);
    throw error;
  }
};

async function processRequest(_event: unknown): Promise<unknown> {
  return {};
}
```

### AWS X-Rayによる分散トレーシング

```typescript
// src/utils/tracer.ts
import * as AWSXRay from 'aws-xray-sdk-core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// X-RayでAWS SDKをインストゥルメント
AWSXRay.captureAWS(require('aws-sdk'));

// カスタムサブセグメントの作成
export async function withSubsegment<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    AWSXRay.captureAsyncFunc(name, async (subsegment) => {
      try {
        const result = await fn();
        subsegment?.close();
        resolve(result);
      } catch (error) {
        subsegment?.close(error as Error);
        reject(error);
      }
    });
  });
}

// 使用例
export const handler = async (event: unknown) => {
  return withSubsegment('ProcessOrder', async () => {
    return withSubsegment('ValidateInput', async () => {
      // バリデーション処理
    }).then(() => withSubsegment('SaveToDB', async () => {
      // データベース保存
    }));
  });
};

// DynamoDBクライアントの設定（X-Ray対応）
const rawDynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
export const docClient = DynamoDBDocumentClient.from(
  AWSXRay.captureAWSv3Client(rawDynamoClient as never) as DynamoDBClient
);
```

### CloudWatchアラームの設定

```yaml
# SAMテンプレートでのアラーム設定
Resources:
  ErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "${Stage}-${FunctionName}-error-rate"
      AlarmDescription: "Lambda関数のエラー率が5%を超えました"
      MetricName: Errors
      Namespace: AWS/Lambda
      Dimensions:
        - Name: FunctionName
          Value: !Ref MyFunction
      Period: 60
      EvaluationPeriods: 5
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      TreatMissingData: notBreaching
      AlarmActions:
        - !Ref AlertTopic
      OKActions:
        - !Ref AlertTopic

  ThrottlesAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "${Stage}-${FunctionName}-throttles"
      AlarmDescription: "Lambda関数がスロットリングされています"
      MetricName: Throttles
      Namespace: AWS/Lambda
      Dimensions:
        - Name: FunctionName
          Value: !Ref MyFunction
      Period: 60
      EvaluationPeriods: 3
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      AlarmActions:
        - !Ref AlertTopic

  DurationAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "${Stage}-${FunctionName}-duration"
      AlarmDescription: "Lambda関数の実行時間がタイムアウトの80%を超えました"
      MetricName: Duration
      Namespace: AWS/Lambda
      ExtendedStatistic: p99
      Dimensions:
        - Name: FunctionName
          Value: !Ref MyFunction
      Period: 300
      EvaluationPeriods: 3
      Threshold: 24000  # 30秒タイムアウトの80%
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref AlertTopic

  AlertTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub "${Stage}-lambda-alerts"
      Subscription:
        - Protocol: email
          Endpoint: ops-team@example.com
```

### Lumigo（サードパーティ監視ツール）

```typescript
// Lumigoを使ったトレーシング（コード変更不要）
// serverless.yml
plugins:
  - serverless-lumigo

custom:
  lumigo:
    token: !Sub "{{resolve:ssm:/myapp/lumigo-token}}"
    nodePackageManager: npm
```

---

## 14. コスト試算と最適化

### Lambda料金の仕組み

AWSのLambda料金は以下の2つで構成される。

**リクエスト料金**
- 1リクエストあたり $0.0000002（100万リクエストあたり $0.20）
- 無料枠: 毎月100万リクエスト

**実行時間料金（GB-秒）**
- 1GB-秒あたり $0.0000166667（ARM64: $0.0000133334）
- 無料枠: 毎月400,000 GB-秒

### コスト試算例

```python
# cost_calculator.py
def calculate_lambda_cost(
    monthly_requests: int,
    avg_duration_ms: float,
    memory_mb: int,
    architecture: str = 'x86_64'
) -> dict:
    """
    Lambdaの月次コストを試算する
    
    Args:
        monthly_requests: 月次リクエスト数
        avg_duration_ms: 平均実行時間（ミリ秒）
        memory_mb: メモリサイズ（MB）
        architecture: 'x86_64' or 'arm64'
    
    Returns:
        コスト内訳の辞書
    """
    # 無料枠
    FREE_REQUESTS = 1_000_000
    FREE_GB_SECONDS = 400_000
    
    # 料金（USD）
    REQUEST_PRICE = 0.0000002  # per request
    if architecture == 'arm64':
        GB_SECOND_PRICE = 0.0000133334
    else:
        GB_SECOND_PRICE = 0.0000166667
    
    # 計算
    billable_requests = max(0, monthly_requests - FREE_REQUESTS)
    
    gb_seconds = (monthly_requests * avg_duration_ms / 1000) * (memory_mb / 1024)
    billable_gb_seconds = max(0, gb_seconds - FREE_GB_SECONDS)
    
    request_cost = billable_requests * REQUEST_PRICE
    duration_cost = billable_gb_seconds * GB_SECOND_PRICE
    total_cost = request_cost + duration_cost
    
    return {
        'monthly_requests': monthly_requests,
        'total_gb_seconds': round(gb_seconds, 2),
        'billable_requests': billable_requests,
        'billable_gb_seconds': round(billable_gb_seconds, 2),
        'request_cost_usd': round(request_cost, 4),
        'duration_cost_usd': round(duration_cost, 4),
        'total_cost_usd': round(total_cost, 4),
        'total_cost_jpy': round(total_cost * 150, 0),  # 1USD = 150JPY換算
    }


# 試算例
scenarios = [
    {
        'name': 'スモールAPI（個人ブログ等）',
        'monthly_requests': 100_000,
        'avg_duration_ms': 100,
        'memory_mb': 256,
    },
    {
        'name': 'ミディアムAPI（中規模サービス）',
        'monthly_requests': 5_000_000,
        'avg_duration_ms': 200,
        'memory_mb': 512,
    },
    {
        'name': 'ラージAPI（大規模サービス）',
        'monthly_requests': 100_000_000,
        'avg_duration_ms': 100,
        'memory_mb': 1024,
    },
]

for scenario in scenarios:
    result = calculate_lambda_cost(
        scenario['monthly_requests'],
        scenario['avg_duration_ms'],
        scenario['memory_mb'],
    )
    print(f"\n{scenario['name']}")
    print(f"  月次リクエスト: {result['monthly_requests']:,}")
    print(f"  実行時間コスト: ${result['duration_cost_usd']}")
    print(f"  リクエストコスト: ${result['request_cost_usd']}")
    print(f"  月次合計: ${result['total_cost_usd']} (約¥{int(result['total_cost_jpy']):,})")
```

**典型的なコスト例**

```
スモールAPI（個人ブログ等）
  月次リクエスト: 100,000
  実行時間コスト: $0.0000
  リクエストコスト: $0.0000
  月次合計: $0.0000 (無料枠内)

ミディアムAPI（中規模サービス）
  月次リクエスト: 5,000,000
  実行時間コスト: $2.45
  リクエストコスト: $0.80
  月次合計: $3.25 (約¥490)

ラージAPI（大規模サービス）
  月次リクエスト: 100,000,000
  実行時間コスト: $122.0
  リクエストコスト: $19.80
  月次合計: $141.80 (約¥21,270)
```

### コスト最適化テクニック

**1. ARM64アーキテクチャの採用**

x86_64からARM64（Graviton2）に変更するだけで約20%のコスト削減になる。

```bash
aws lambda update-function-configuration \
  --function-name my-function \
  --architectures arm64
```

**2. メモリサイズの最適化**

Lambda Power Tuningを活用して最適なメモリサイズを見つける。過剰なメモリ割り当ては直接コスト増に繋がる。

**3. 実行時間の短縮**

```typescript
// 並列処理でレイテンシーとコストを削減
// 悪い例: 逐次処理
const userResult = await getUser(userId);
const ordersResult = await getUserOrders(userId);
const preferencesResult = await getUserPreferences(userId);

// 良い例: 並列処理
const [userResult, ordersResult, preferencesResult] = await Promise.all([
  getUser(userId),
  getUserOrders(userId),
  getUserPreferences(userId),
]);
```

**4. 接続の再利用（TCP Keep-Alive）**

```typescript
// Node.jsでのHTTPS接続再利用
import { Agent } from 'https';

const httpsAgent = new Agent({ keepAlive: true });

// HTTP APIリクエストの際に使用
const response = await fetch('https://api.example.com/data', {
  // @ts-ignore
  agent: httpsAgent,
});
```

**5. Lambda Extensions の活用**

```bash
# Lambda Extensionsを使ったコスト可視化ツール
# AWS Cost Anomaly Detection の設定
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "LambdaCostMonitor",
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE"
  }'
```

**6. リザーブドコンカレンシーの設定**

スロットリングを意図的に設定することで、バースト時のコスト増を抑制できる。

```bash
aws lambda put-function-concurrency \
  --function-name my-function \
  --reserved-concurrent-executions 100
```

**7. DynamoDB料金最適化との連携**

```typescript
// 読み取り時はEventual Consistency（デフォルト）を使用してコスト半減
const result = await docClient.send(
  new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    ConsistentRead: false,  // デフォルトはfalse（Eventual Consistency）
  })
);

// SCANよりQUERYを優先（読み取りコスト削減）
const queryResult = await docClient.send(
  new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `USER#${userId}` },
  })
);
```

### コスト監視のベストプラクティス

```bash
# CloudWatch コストアノマリー通知の設定
aws ce create-anomaly-subscription \
  --anomaly-subscription '{
    "MonitorArnList": ["<monitor-arn>"],
    "Subscribers": [
      {
        "Address": "ops@example.com",
        "Type": "EMAIL"
      }
    ],
    "Threshold": 20,
    "Frequency": "DAILY",
    "SubscriptionName": "LambdaCostAlert"
  }'

# AWS Budgetsでの月次予算設定
aws budgets create-budget \
  --account-id ${ACCOUNT_ID} \
  --budget '{
    "BudgetName": "Lambda-Monthly-Budget",
    "BudgetLimit": {
      "Amount": "50",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostFilters": {
      "Service": ["AWS Lambda"]
    }
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [{
      "SubscriptionType": "EMAIL",
      "Address": "ops@example.com"
    }]
  }]'
```

---

## まとめ

AWS Lambdaとサーバーレスアーキテクチャは、現代のクラウドネイティブ開発において欠かせない技術だ。本記事で解説した主要ポイントを整理する。

**基盤技術**
- Lambda関数はイベント駆動で実行されるステートレスなコンピューティング単位
- Node.js・Python・Go・Rustなど複数のランタイムをサポート
- API Gateway（HTTP API）との連携でRESTfulなAPIを構築できる

**データ層**
- DynamoDBはサーバーレスとの親和性が最も高いNoSQLデータベース
- シングルテーブルデザインによりコスト効率を最大化できる
- DynamoDB Streamsで変更をリアルタイム処理できる

**非同期処理**
- SQSとLambdaの組み合わせで信頼性の高い非同期処理を実現
- EventBridgeによるイベントバスで疎結合なマイクロサービスを構築できる
- 部分バッチレスポンスで失敗したメッセージのみ再試行可能

**インフラ管理**
- SAMはAWS公式のサーバーレスIaCフレームワーク
- Serverless Frameworkはマルチクラウド対応の豊富なプラグインが魅力
- AWS CDKはTypeScriptで型安全にインフラを定義できる

**パフォーマンス最適化**
- コールドスタートはProvisioned Concurrencyで解決できる
- Lambda Power Tuningで最適なメモリサイズを見つける
- ARM64アーキテクチャへの移行でコストとパフォーマンスを改善できる

**運用**
- 構造化ログとX-Rayトレーシングで可観測性を高める
- CloudWatchアラームで問題を早期発見する
- コスト計算式を理解し、適切な予算管理を行う

サーバーレスアーキテクチャを採用することで、スタートアップから大企業まで、インフラ管理の負担を最小化しながらスケーラブルなシステムを構築できる。まずは小さなLambda関数から始め、徐々にアーキテクチャを拡張していくアプローチが成功への近道だ。

---

## 開発ツールについて

AWS LambdaとサーバーレスAPIの開発では、ローカルテストとデプロイのサイクルを効率化することが生産性向上のカギだ。**[DevToolBox](https://usedevtools.com)** はJSON整形・Base64エンコード・JWTデコード・Cron式バリデーションなど、サーバーレス開発で頻繁に使うユーティリティをブラウザ上で提供するプラットフォームだ。

特にEventBridgeのCron式の検証、SQSメッセージのJSON構造確認、JWTトークンのデコードといった作業を素早く行えるため、Lambda関数の開発・デバッグ効率を大幅に向上させる。インストール不要でブラウザからすぐに使えるため、開発フローに取り込みやすい。

---

## 参考リソース

- [AWS Lambda デベロッパーガイド](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/welcome.html)
- [AWS SAM ドキュメント](https://docs.aws.amazon.com/ja_jp/serverless-application-model/latest/developerguide/what-is-sam.html)
- [Serverless Framework ドキュメント](https://www.serverless.com/framework/docs)
- [AWS CDK API リファレンス](https://docs.aws.amazon.com/cdk/api/v2/)
- [DynamoDB ベストプラクティス](https://docs.aws.amazon.com/ja_jp/amazondynamodb/latest/developerguide/best-practices.html)
- [Lambda Power Tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning)
- [AWS X-Ray SDK for Node.js](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs.html)

---

## スキルアップ・キャリアアップのおすすめリソース

AWSとサーバーレスのスキルは、クラウド時代のエンジニアとして必須の武器となる。

### 転職・キャリアアップ
- **[レバテックキャリア](https://levtech.jp)** — ITエンジニア専門の転職エージェント。AWSの実務経験があるエンジニアは高単価案件が多い。AWS認定資格と組み合わせると年収アップに直結。無料相談可能。
- **[Findy](https://findy-job.com)** — GitHubのAWS CDK・SAMプロジェクトが評価対象。スカウト型でクラウドエンジニア・バックエンドエンジニアの求人が充実。

### オンライン学習
- **[Udemy](https://www.udemy.com)** — AWS認定試験（SAA・DVA・SAP）対策から実践的なサーバーレスアーキテクチャ構築まで幅広いコースが揃う。AWS公式講師によるコースも充実。セール時は90%オフになることも。
- **[Coursera](https://www.coursera.org)** — AWSとGoogleのクラウド公式コースを受講可能。AWS Certified Developer認定証の取得でキャリアの証明ができる。
