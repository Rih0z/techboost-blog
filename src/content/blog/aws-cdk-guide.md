---
title: 'AWS CDK完全ガイド — TypeScriptでAWSインフラをコード化・Lambda・ECS・RDS'
description: 'AWS CDKでインフラをTypeScriptでコード化する完全ガイド。Stack設計・Lambda・API Gateway・ECS Fargate・RDS・SQS/SNS・CloudFront・CI/CDパイプラインまで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['AWS CDK', 'AWS', 'TypeScript', 'IaC', 'クラウド']
---

AWS Cloud Development Kit（CDK）は、使い慣れたプログラミング言語でAWSインフラを定義できるオープンソースフレームワークだ。TypeScript・Python・Java・C#など複数言語をサポートしており、本記事ではTypeScriptを用いて実践的なCDKの使い方を徹底解説する。Lambda・API Gateway・ECS Fargate・RDS・SQS/SNS・CloudFront・CI/CDパイプラインまで、実際のプロダクションで使える実装例を網羅する。

---

## 1. AWS CDKとは — CloudFormation/Terraformとの比較

### CDKの概要

AWS CDKは2019年にGAとなったInfrastructure as Code（IaC）ツールだ。CloudFormationのYAML/JSONテンプレートを直接書く代わりに、TypeScriptなどのプログラミング言語でインフラを定義し、CDKがCloudFormationテンプレートに変換・デプロイする。

**CDKが解決する問題:**

- CloudFormationのYAMLは冗長で管理しにくい
- ループ・条件分岐・関数など通常のプログラミング構成が使えない
- コードとインフラが別リポジトリになり同期が取れなくなる
- 再利用可能なパターンをライブラリとして共有できない

### CloudFormation / Terraform / CDKの比較

| 特徴 | CloudFormation | Terraform | AWS CDK |
|------|---------------|-----------|---------|
| 言語 | YAML/JSON | HCL | TS/Python/Java/C# |
| 学習コスト | 中 | 中 | 低（既存言語スキル活用） |
| 再利用性 | 低（Nested Stack） | 中（Module） | 高（npmパッケージ） |
| マルチクラウド | AWS専用 | マルチクラウド | AWS専用 |
| 型安全性 | なし | 一部 | 完全（TypeScriptの場合） |
| テスト | 困難 | 可能 | Jest/Vitestで容易 |
| エコシステム | 成熟 | 成熟 | 急成長 |
| 状態管理 | AWSマネージド | tfstate（要管理） | AWSマネージド |

### CDKのアーキテクチャ

CDKは以下のレイヤーで構成される:

```
開発者が書くTypeScriptコード
        ↓
  CDK Construct ライブラリ
        ↓
  CloudFormation テンプレート（JSON/YAML）
        ↓
     AWS CloudFormation
        ↓
   実際のAWSリソース
```

CDKはあくまでCloudFormationの上に構築された抽象レイヤーであり、デプロイの実行エンジンはCloudFormationだ。これにより、CloudFormationの持つドリフト検出・ロールバック・変更セット管理などの機能をそのまま享受できる。

---

## 2. CDKセットアップ

### インストールと初期化

まずNode.jsとAWS CLIが設定済みであることを確認する。

```bash
# AWS CDK CLI のインストール
npm install -g aws-cdk

# バージョン確認
cdk --version
# 2.170.0 (build xxxxxxx)

# プロジェクト初期化
mkdir my-cdk-app && cd my-cdk-app
cdk init app --language typescript

# 生成されるファイル構造
# .
# ├── bin/
# │   └── my-cdk-app.ts      <- エントリーポイント
# ├── lib/
# │   └── my-cdk-app-stack.ts <- スタック定義
# ├── test/
# │   └── my-cdk-app.test.ts  <- テスト
# ├── cdk.json               <- CDK設定
# ├── package.json
# └── tsconfig.json
```

### Bootstrap（初回セットアップ）

CDKを新しいAWSアカウント・リージョンで使う前に、bootstrapが必要だ。これはCDKが使用するS3バケット・ECRリポジトリ・IAMロールなどをプロビジョニングする。

```bash
# 現在のAWSアカウント・リージョンでbootstrap
cdk bootstrap

# 特定のアカウント・リージョンを指定
cdk bootstrap aws://123456789012/ap-northeast-1

# 複数リージョンに一括bootstrap
cdk bootstrap aws://123456789012/us-east-1 aws://123456789012/ap-northeast-1
```

### 基本的なデプロイコマンド

```bash
# 変更差分の確認（dry run）
cdk diff

# デプロイ
cdk deploy

# 複数スタックをデプロイ
cdk deploy StackA StackB

# 全スタックをデプロイ
cdk deploy --all

# スタックの削除
cdk destroy

# CloudFormationテンプレートの出力
cdk synth

# 利用可能なスタック一覧
cdk list
```

---

## 3. Construct階層（L1/L2/L3）

CDKのConstructは3つのレイヤーに分かれており、使いやすさと柔軟性のトレードオフがある。

### L1 Construct（CloudFormation Resource）

CloudFormationリソースと1対1対応する最低レベルのConstruct。`Cfn`プレフィックスが付く。全プロパティをCloudFormationと同じ名前で設定できる。

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';

// L1: CfnBucket（CloudFormationリソースそのもの）
const cfnBucket = new s3.CfnBucket(this, 'MyL1Bucket', {
  bucketName: 'my-l1-bucket',
  versioningConfiguration: {
    status: 'Enabled',
  },
  lifecycleConfiguration: {
    rules: [
      {
        id: 'DeleteOldVersions',
        status: 'Enabled',
        noncurrentVersionExpiration: {
          noncurrentDays: 30,
        },
      },
    ],
  },
});
```

### L2 Construct（AWS Construct Library）

L1をラップし、デフォルト値・ベストプラクティス・ヘルパーメソッドを提供するレイヤー。**CDKの主力**であり、通常はL2を使う。

```typescript
// L2: Bucket（型安全・デフォルト値・ヘルパーあり）
const bucket = new s3.Bucket(this, 'MyL2Bucket', {
  bucketName: 'my-l2-bucket',
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  lifecycleRules: [
    {
      id: 'DeleteOldVersions',
      enabled: true,
      noncurrentVersionExpiration: cdk.Duration.days(30),
    },
  ],
});

// L2のヘルパーメソッド
bucket.grantRead(someRole);           // IAMポリシー自動付与
bucket.grantReadWrite(anotherRole);   // 読み書き権限付与
bucket.addEventNotification(          // イベント通知設定
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(myFn),
);
```

### L3 Construct（Patterns）

複数のAWSリソースを組み合わせた高レベルパターン。`aws-solutions-constructs`や`@aws-cdk/aws-ecs-patterns`などで提供される。

```typescript
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';

// L3: ApplicationLoadBalancedFargateService
// ALB + ECS Fargate + TargetGroup + SecurityGroup を一発で作成
const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
  this,
  'MyFargateService',
  {
    cluster,
    taskImageOptions: {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'),
    },
    memoryLimitMiB: 512,
    cpu: 256,
    desiredCount: 2,
  }
);
```

### カスタムConstruct（L3の作成）

再利用可能なインフラパターンを独自Constructとして定義できる。

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface ApiWithDynamoProps {
  tableName: string;
  handlerPath: string;
}

// カスタムL3 Construct: Lambda + API Gateway + DynamoDB のセット
export class ApiWithDynamo extends Construct {
  public readonly table: dynamodb.Table;
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiWithDynamoProps) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: props.tableName,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    const handler = new lambda.Function(this, 'Handler', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(props.handlerPath),
      environment: {
        TABLE_NAME: this.table.tableName,
      },
    });

    this.table.grantReadWriteData(handler);

    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${props.tableName}-api`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    this.api.root.addMethod(
      'ANY',
      new apigateway.LambdaIntegration(handler)
    );
  }
}
```

---

## 4. Stack設計（環境分離・Cross-Stack参照）

### 環境分離パターン

本番・ステージング・開発環境を適切に分離するStack設計が重要だ。

```typescript
// bin/my-app.ts（エントリーポイント）
import * as cdk from 'aws-cdk-lib';
import { MyAppStack } from '../lib/my-app-stack';

const app = new cdk.App();

// 環境設定
const envDev = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-northeast-1',
};
const envProd = {
  account: '123456789012',
  region: 'ap-northeast-1',
};

// 開発環境スタック
new MyAppStack(app, 'MyApp-Dev', {
  env: envDev,
  stageName: 'dev',
  instanceSize: 'small',
});

// 本番環境スタック
new MyAppStack(app, 'MyApp-Prod', {
  env: envProd,
  stageName: 'prod',
  instanceSize: 'large',
  terminationProtection: true,  // 誤削除防止
});
```

```typescript
// lib/my-app-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface MyAppStackProps extends cdk.StackProps {
  stageName: string;
  instanceSize: 'small' | 'large';
}

export class MyAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyAppStackProps) {
    super(scope, id, props);

    const isProd = props.stageName === 'prod';

    // 環境によってリソースサイズを変える
    const dbInstanceType = isProd
      ? rds.InstanceType.of(rds.InstanceClass.R6G, rds.InstanceSize.XLARGE2)
      : rds.InstanceType.of(rds.InstanceClass.T4G, rds.InstanceSize.MICRO);

    // タグを全リソースに付与
    cdk.Tags.of(this).add('Stage', props.stageName);
    cdk.Tags.of(this).add('Project', 'MyApp');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
```

### Cross-Stack参照

スタックをまたいでリソースを参照するパターンは、大規模プロジェクトで必須だ。

```typescript
// lib/network-stack.ts（VPC・ネットワーク層）
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly privateSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 3,
      natGateways: 2,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    this.privateSubnets = this.vpc.privateSubnets;
  }
}

// lib/app-stack.ts（アプリ層 — ネットワーク層を参照）
interface AppStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;  // NetworkStackから受け取る
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // Cross-Stack参照（CDKが自動的にSSM Parameter StoreかOutputsを経由）
    const { vpc } = props;

    // VPCを使ってECSクラスターを作成
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });
  }
}

// bin/my-app.ts（スタック間の接続）
const networkStack = new NetworkStack(app, 'Network', { env });
const appStack = new AppStack(app, 'App', {
  env,
  vpc: networkStack.vpc,  // Cross-Stack参照
});
appStack.addDependency(networkStack);  // デプロイ順序を保証
```

### StackのOutputs（他StackやCI/CDへの値エクスポート）

```typescript
// スタックからOutputを出力
new cdk.CfnOutput(this, 'ApiUrl', {
  value: this.api.url,
  exportName: `${this.stackName}-ApiUrl`,  // Cross-Stackエクスポート
  description: 'API Gateway URL',
});

new cdk.CfnOutput(this, 'BucketName', {
  value: this.bucket.bucketName,
  exportName: `${this.stackName}-BucketName`,
});
```

---

## 5. Lambda関数（NodejsFunction・Layer・環境変数）

### NodejsFunctionでLambdaをデプロイ

`aws-lambda-nodejs`モジュールの`NodejsFunction`を使うと、esbuildによるバンドル・トランスパイルが自動化される。

```bash
npm install aws-cdk-lib constructs esbuild
```

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

// NodejsFunction: esbuildで自動バンドル
const apiHandler = new NodejsFunction(this, 'ApiHandler', {
  runtime: lambda.Runtime.NODEJS_22_X,
  entry: path.join(__dirname, '../src/handlers/api.ts'),
  handler: 'handler',
  timeout: cdk.Duration.seconds(30),
  memorySize: 512,
  architecture: lambda.Architecture.ARM_64,  // Graviton2でコスト削減
  environment: {
    NODE_ENV: 'production',
    TABLE_NAME: table.tableName,
    REGION: this.region,
  },
  bundling: {
    minify: true,
    sourceMap: true,
    target: 'node22',
    externalModules: ['@aws-sdk/*'],  // AWS SDKは除外（Lambda環境に含まれる）
    nodeModules: ['sharp'],           // ネイティブモジュールは含める
  },
  tracing: lambda.Tracing.ACTIVE,  // X-Ray トレーシング有効化
  logRetention: logs.RetentionDays.ONE_WEEK,
  insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_229_0,
});
```

### Lambda Layer（共通コードの共有）

```typescript
// 共通ライブラリをLayerとして定義
const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
  code: lambda.Code.fromAsset(path.join(__dirname, '../layers/common'), {
    bundling: {
      image: lambda.Runtime.NODEJS_22_X.bundlingImage,
      command: [
        'bash', '-c',
        'npm ci --prefix /asset-output/nodejs && cp -r . /asset-output/nodejs',
      ],
    },
  }),
  compatibleRuntimes: [
    lambda.Runtime.NODEJS_20_X,
    lambda.Runtime.NODEJS_22_X,
  ],
  description: 'Common utilities and shared dependencies',
});

// LayerをLambdaに追加
const handler = new NodejsFunction(this, 'Handler', {
  // ...
  layers: [commonLayer],
});
```

### Lambda関数URLとALIASの設定

```typescript
// 関数URLの設定（API Gatewayなしで直接HTTPS呼び出し）
const fnUrl = apiHandler.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.AWS_IAM,
  cors: {
    allowedOrigins: ['https://myapp.com'],
    allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
});

// エイリアスとオートスケーリング
const prodAlias = new lambda.Alias(this, 'ProdAlias', {
  aliasName: 'prod',
  version: apiHandler.currentVersion,
});

// プロビジョニング済み同時実行数（コールドスタート対策）
prodAlias.addAutoScaling({
  minCapacity: 5,
  maxCapacity: 100,
}).scaleOnUtilization({
  utilizationTarget: 0.7,
});
```

---

## 6. API Gateway（RestApi・HttpApi・Authorization）

### REST API（v1）

```typescript
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

const restApi = new apigateway.RestApi(this, 'RestApi', {
  restApiName: 'my-service-api',
  description: 'My Service REST API',
  deployOptions: {
    stageName: 'v1',
    tracingEnabled: true,       // X-Ray
    dataTraceEnabled: false,    // データトレース（本番ではOFF）
    loggingLevel: apigateway.MethodLoggingLevel.INFO,
    metricsEnabled: true,
    throttlingRateLimit: 1000,  // リクエスト/秒
    throttlingBurstLimit: 500,
  },
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
    allowHeaders: [
      'Content-Type',
      'X-Amz-Date',
      'Authorization',
      'X-Api-Key',
    ],
  },
});

// リソース・メソッドの定義
const usersResource = restApi.root.addResource('users');
const userResource = usersResource.addResource('{userId}');

const lambdaIntegration = new apigateway.LambdaIntegration(apiHandler, {
  requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
  proxy: true,
});

usersResource.addMethod('GET', lambdaIntegration, {
  authorizationType: apigateway.AuthorizationType.COGNITO,
  authorizer: cognitoAuthorizer,
  requestParameters: {
    'method.request.querystring.limit': false,
    'method.request.querystring.cursor': false,
  },
});

userResource.addMethod('GET', lambdaIntegration);
userResource.addMethod('PUT', lambdaIntegration);
userResource.addMethod('DELETE', lambdaIntegration);

// Cognitoオーソライザー
const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
  this,
  'CognitoAuthorizer',
  {
    cognitoUserPools: [userPool],
    authorizerName: 'CognitoAuthorizer',
    identitySource: 'method.request.header.Authorization',
  }
);

// APIキー管理
const apiKey = restApi.addApiKey('ApiKey', {
  apiKeyName: 'my-api-key',
  description: 'API Key for external services',
});

const usagePlan = restApi.addUsagePlan('UsagePlan', {
  name: 'StandardPlan',
  throttle: { rateLimit: 100, burstLimit: 50 },
  quota: { limit: 10000, period: apigateway.Period.DAY },
});
usagePlan.addApiKey(apiKey);
usagePlan.addApiStage({ stage: restApi.deploymentStage });
```

### HTTP API（v2）— 低レイテンシ・低コスト

```typescript
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigwv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
  apiName: 'my-http-api',
  description: 'HTTP API (v2) - Lower latency and cost',
  corsPreflight: {
    allowOrigins: ['https://myapp.com'],
    allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.POST],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: cdk.Duration.hours(1),
  },
  defaultAuthorizer: new apigwv2Authorizers.HttpJwtAuthorizer(
    'JwtAuthorizer',
    `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
    {
      jwtAudience: [userPoolClient.userPoolClientId],
    }
  ),
});

// ルート定義
httpApi.addRoutes({
  path: '/users',
  methods: [apigwv2.HttpMethod.GET],
  integration: new apigwv2Integrations.HttpLambdaIntegration(
    'GetUsersIntegration',
    getUsersHandler
  ),
});

httpApi.addRoutes({
  path: '/users/{userId}',
  methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT],
  integration: new apigwv2Integrations.HttpLambdaIntegration(
    'UserIntegration',
    userHandler
  ),
});

// ステージ設定（デフォルトステージ以外）
const stage = new apigwv2.HttpStage(this, 'Stage', {
  httpApi,
  stageName: 'v2',
  autoDeploy: true,
});

new cdk.CfnOutput(this, 'HttpApiUrl', {
  value: httpApi.apiEndpoint,
});
```

---

## 7. ECS Fargate（Cluster・Service・Task Definition）

### ECSクラスターとFargateサービス

```typescript
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

// ECRリポジトリ
const repository = new ecr.Repository(this, 'AppRepo', {
  repositoryName: 'my-app',
  imageScanOnPush: true,
  lifecycleRules: [
    {
      maxImageCount: 10,
      description: 'Keep only 10 images',
    },
  ],
});

// ECSクラスター
const cluster = new ecs.Cluster(this, 'Cluster', {
  vpc,
  clusterName: 'my-app-cluster',
  containerInsights: true,  // CloudWatch Container Insights有効化
});

// Task Definition
const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
  memoryLimitMiB: 1024,
  cpu: 512,
  runtimePlatform: {
    operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
    cpuArchitecture: ecs.CpuArchitecture.ARM64,  // Graviton
  },
});

// コンテナ定義
const container = taskDefinition.addContainer('AppContainer', {
  image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
  logging: ecs.LogDrivers.awsLogs({
    streamPrefix: 'my-app',
    logRetention: logs.RetentionDays.ONE_WEEK,
  }),
  environment: {
    NODE_ENV: 'production',
    PORT: '3000',
  },
  secrets: {
    DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
    API_KEY: ecs.Secret.fromSsmParameter(apiKeyParam),
  },
  healthCheck: {
    command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
    interval: cdk.Duration.seconds(30),
    timeout: cdk.Duration.seconds(5),
    retries: 3,
    startPeriod: cdk.Duration.seconds(60),
  },
  portMappings: [{ containerPort: 3000 }],
});

// ALBと組み合わせたFargateサービス（L3パターン）
const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
  this,
  'FargateService',
  {
    cluster,
    taskDefinition,
    desiredCount: 2,
    publicLoadBalancer: true,
    listenerPort: 443,
    protocol: elbv2.ApplicationProtocol.HTTPS,
    certificate: acmCertificate,
    domainName: 'api.myapp.com',
    domainZone: hostedZone,
    circuitBreaker: { rollback: true },  // デプロイ失敗時に自動ロールバック
    deploymentController: {
      type: ecs.DeploymentControllerType.ECS,
    },
  }
);

// オートスケーリング設定
const scaling = fargateService.service.autoScaleTaskCount({
  minCapacity: 2,
  maxCapacity: 20,
});

scaling.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 70,
  scaleInCooldown: cdk.Duration.seconds(60),
  scaleOutCooldown: cdk.Duration.seconds(30),
});

scaling.scaleOnMemoryUtilization('MemoryScaling', {
  targetUtilizationPercent: 80,
});

scaling.scaleOnRequestCount('RequestScaling', {
  requestsPerTarget: 1000,
  targetGroup: fargateService.targetGroup,
});

// ヘルスチェック設定
fargateService.targetGroup.configureHealthCheck({
  path: '/health',
  healthyHttpCodes: '200',
  interval: cdk.Duration.seconds(30),
  timeout: cdk.Duration.seconds(5),
  healthyThresholdCount: 2,
  unhealthyThresholdCount: 3,
});
```

---

## 8. RDS（DatabaseCluster・Secret Manager統合）

### Aurora PostgreSQL Serverless v2

```typescript
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

// Secrets Managerでパスワード自動生成・ローテーション
const dbSecret = new secretsmanager.Secret(this, 'DbSecret', {
  secretName: '/myapp/prod/db-credentials',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({ username: 'myapp_admin' }),
    generateStringKey: 'password',
    excludeCharacters: '"@/\\',
    passwordLength: 32,
  },
});

// DBサブネットグループ（Isolatedサブネット使用）
const dbSubnetGroup = new rds.SubnetGroup(this, 'DbSubnetGroup', {
  vpc,
  description: 'DB Subnet Group',
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
});

// DBセキュリティグループ
const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSg', {
  vpc,
  description: 'Security Group for RDS',
  allowAllOutbound: false,
});

dbSecurityGroup.addIngressRule(
  appSecurityGroup,
  ec2.Port.tcp(5432),
  'Allow PostgreSQL from App'
);

// Aurora PostgreSQL Serverless v2（コスト効率最高）
const dbCluster = new rds.DatabaseCluster(this, 'DbCluster', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({
    version: rds.AuroraPostgresEngineVersion.VER_16_4,
  }),
  credentials: rds.Credentials.fromSecret(dbSecret),
  serverlessV2MinCapacity: 0.5,
  serverlessV2MaxCapacity: 32,
  writer: rds.ClusterInstance.serverlessV2('Writer', {
    autoMinorVersionUpgrade: true,
    enablePerformanceInsights: true,
    performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
  }),
  readers: [
    rds.ClusterInstance.serverlessV2('Reader1', {
      scaleWithWriter: true,
    }),
  ],
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
  securityGroups: [dbSecurityGroup],
  subnetGroup: dbSubnetGroup,
  defaultDatabaseName: 'myapp',
  backup: {
    retention: cdk.Duration.days(30),
    preferredWindow: '03:00-04:00',
  },
  preferredMaintenanceWindow: 'Mon:04:00-Mon:05:00',
  storageEncrypted: true,
  deletionProtection: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  cloudwatchLogsExports: ['postgresql'],
  cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH,
  parameterGroup: new rds.ParameterGroup(this, 'DbParams', {
    engine: rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_16_4,
    }),
    parameters: {
      'shared_preload_libraries': 'pg_stat_statements,pg_hint_plan',
      'log_min_duration_statement': '1000',  // 1秒以上のクエリをログ
    },
  }),
});

// シークレットのローテーション設定（30日ごと）
dbSecret.addRotationSchedule('RotationSchedule', {
  hostedRotation: secretsmanager.HostedRotation.postgreSqlSingleUser({
    functionName: 'SecretRotationFunction',
    vpc,
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  }),
  automaticallyAfter: cdk.Duration.days(30),
});

// Lambda/ECSがDBに接続するための権限付与
dbSecret.grantRead(taskDefinition.taskRole);
dbSecurityGroup.addIngressRule(
  fargateService.service.connections.securityGroups[0],
  ec2.Port.tcp(5432)
);
```

---

## 9. SQS・SNS（Queue・Topic・Subscription）

### SQSキューとDead Letter Queue

```typescript
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

// Dead Letter Queue（処理失敗メッセージの隔離）
const dlq = new sqs.Queue(this, 'DLQ', {
  queueName: 'my-app-dlq',
  retentionPeriod: cdk.Duration.days(14),
  encryption: sqs.QueueEncryption.KMS_MANAGED,
});

// メインキュー
const queue = new sqs.Queue(this, 'MainQueue', {
  queueName: 'my-app-queue',
  visibilityTimeout: cdk.Duration.seconds(300),  // Lambda処理時間の6倍推奨
  receiveMessageWaitTime: cdk.Duration.seconds(20),  // ロングポーリング
  encryption: sqs.QueueEncryption.KMS_MANAGED,
  deadLetterQueue: {
    queue: dlq,
    maxReceiveCount: 3,  // 3回失敗したらDLQへ
  },
  retentionPeriod: cdk.Duration.days(4),
  contentBasedDeduplication: false,
});

// FIFOキュー（順序保証・重複排除）
const fifoQueue = new sqs.Queue(this, 'FifoQueue', {
  queueName: 'my-app-queue.fifo',  // .fifoサフィックス必須
  fifo: true,
  contentBasedDeduplication: true,
  deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
  fifoThroughputLimit: sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
});

// LambdaをSQSトリガーに設定
const sqsProcessor = new NodejsFunction(this, 'SqsProcessor', {
  entry: path.join(__dirname, '../src/handlers/sqs-processor.ts'),
  runtime: lambda.Runtime.NODEJS_22_X,
  timeout: cdk.Duration.seconds(300),
  reservedConcurrentExecutions: 10,  // 同時実行数制限
});

sqsProcessor.addEventSource(
  new lambdaEventSources.SqsEventSource(queue, {
    batchSize: 10,
    maxBatchingWindow: cdk.Duration.seconds(30),
    reportBatchItemFailures: true,  // 部分的な失敗をサポート
    bisectBatchOnError: true,
  })
);

// SNSトピック
const topic = new sns.Topic(this, 'NotificationTopic', {
  topicName: 'my-app-notifications',
  displayName: 'MyApp Notifications',
});

// SNS -> SQS ファンアウトパターン
topic.addSubscription(new snsSubscriptions.SqsSubscription(queue, {
  rawMessageDelivery: true,  // SNSエンベロープなしでメッセージ送信
  filterPolicy: {
    eventType: sns.SubscriptionFilter.stringFilter({
      allowlist: ['ORDER_CREATED', 'ORDER_UPDATED'],
    }),
  },
}));

// SNS -> Lambda 直接サブスクリプション
topic.addSubscription(
  new snsSubscriptions.LambdaSubscription(notificationHandler, {
    filterPolicy: {
      eventType: sns.SubscriptionFilter.stringFilter({
        allowlist: ['PAYMENT_COMPLETED'],
      }),
    },
  })
);

// SNS -> Email サブスクリプション（アラート用）
topic.addSubscription(
  new snsSubscriptions.EmailSubscription('admin@myapp.com')
);

// CloudWatch Alarmと連携
const dlqAlarm = new cloudwatch.Alarm(this, 'DlqAlarm', {
  metric: dlq.metricApproximateNumberOfMessagesVisible(),
  threshold: 1,
  evaluationPeriods: 1,
  alarmDescription: 'Messages in DLQ - requires investigation',
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

dlqAlarm.addAlarmAction(new cwActions.SnsAction(topic));
```

---

## 10. CloudFront + S3（静的サイト配信・OAC）

### Origin Access Control（OAC）を使った最新構成

```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

// 静的ファイル配信用S3バケット
const siteBucket = new s3.Bucket(this, 'SiteBucket', {
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,  // OACで直接アクセス禁止
  encryption: s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  versioned: false,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  autoDeleteObjects: false,
});

// ACM証明書（CloudFrontはus-east-1必須）
const certificate = new acm.Certificate(this, 'Certificate', {
  domainName: 'myapp.com',
  subjectAlternativeNames: ['www.myapp.com'],
  validation: acm.CertificateValidation.fromDns(hostedZone),
});

// OAC（Origin Access Control）
const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
  originAccessControlName: 'MyAppOAC',
  signing: cloudfront.Signing.SIGV4_NO_OVERRIDE,
});

// キャッシュポリシー
const cachePolicy = new cloudfront.CachePolicy(this, 'CachePolicy', {
  cachePolicyName: 'MyAppCachePolicy',
  defaultTtl: cdk.Duration.hours(24),
  minTtl: cdk.Duration.seconds(0),
  maxTtl: cdk.Duration.days(365),
  enableAcceptEncodingGzip: true,
  enableAcceptEncodingBrotli: true,
  headerBehavior: cloudfront.CacheHeaderBehavior.none(),
  queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
  cookieBehavior: cloudfront.CacheCookieBehavior.none(),
});

// CloudFrontディストリビューション
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(
      siteBucket,
      { originAccessControl: oac }
    ),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
    cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
    cachePolicy,
    compress: true,
    responseHeadersPolicy:
      cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
  },
  // APIへのパスは直接転送
  additionalBehaviors: {
    '/api/*': {
      origin: new cloudfrontOrigins.HttpOrigin('api.myapp.com', {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy:
        cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    },
  },
  domainNames: ['myapp.com', 'www.myapp.com'],
  certificate,
  defaultRootObject: 'index.html',
  errorResponses: [
    {
      httpStatus: 403,
      responseHttpStatus: 200,
      responsePagePath: '/index.html',  // SPAのフォールバック
      ttl: cdk.Duration.minutes(0),
    },
    {
      httpStatus: 404,
      responseHttpStatus: 200,
      responsePagePath: '/index.html',
      ttl: cdk.Duration.minutes(0),
    },
  ],
  priceClass: cloudfront.PriceClass.PRICE_CLASS_200,  // 日本含む主要リージョン
  enableLogging: true,
  logBucket: logBucket,
  logFilePrefix: 'cloudfront-access-logs/',
  httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
  enableIpv6: true,
  minimumProtocolVersion:
    cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
  geoRestriction: cloudfront.GeoRestriction.denylist('CN', 'RU'),
});

// Route53 Aレコード
const zone = route53.HostedZone.fromLookup(this, 'Zone', {
  domainName: 'myapp.com',
});

new route53.ARecord(this, 'ARecord', {
  zone,
  target: route53.RecordTarget.fromAlias(
    new route53Targets.CloudFrontTarget(distribution)
  ),
});

new route53.ARecord(this, 'WwwARecord', {
  zone,
  recordName: 'www',
  target: route53.RecordTarget.fromAlias(
    new route53Targets.CloudFrontTarget(distribution)
  ),
});

// S3にファイルをデプロイ
new s3deploy.BucketDeployment(this, 'DeployWebsite', {
  sources: [s3deploy.Source.asset('./build')],
  destinationBucket: siteBucket,
  distribution,
  distributionPaths: ['/*'],  // CloudFrontキャッシュを自動クリア
  memoryLimit: 1024,
  prune: true,
});
```

---

## 11. VPC設計（Subnets・Security Groups・NAT）

### マルチAZ VPCの完全構成

```typescript
import * as ec2 from 'aws-cdk-lib/aws-ec2';

// 本番環境向け高可用性VPC
const vpc = new ec2.Vpc(this, 'ProductionVpc', {
  vpcName: 'prod-vpc',
  ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
  maxAzs: 3,  // 3AZで高可用性
  natGateways: 3,  // AZごとにNAT Gateway（高可用性・コスト高）
  // natGateways: 1,  // コスト重視の場合は1つ
  subnetConfiguration: [
    {
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
      cidrMask: 24,
      mapPublicIpOnLaunch: false,
    },
    {
      name: 'Private',
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      cidrMask: 24,
    },
    {
      name: 'Database',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      cidrMask: 24,
    },
  ],
  enableDnsHostnames: true,
  enableDnsSupport: true,
  // VPCフローログ
  flowLogs: {
    FlowLog: {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(
        new logs.LogGroup(this, 'VpcFlowLogs', {
          retention: logs.RetentionDays.ONE_WEEK,
        })
      ),
      trafficType: ec2.FlowLogTrafficType.ALL,
    },
  },
});

// VPCエンドポイント（NATを経由しない→コスト削減・セキュリティ向上）
const s3Endpoint = vpc.addGatewayEndpoint('S3Endpoint', {
  service: ec2.GatewayVpcEndpointAwsService.S3,
  subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
});

const dynamoEndpoint = vpc.addGatewayEndpoint('DynamoEndpoint', {
  service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
});

// インターフェースエンドポイント（PrivateLink）
vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  privateDnsEnabled: true,
});

vpc.addInterfaceEndpoint('EcrEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.ECR,
});

vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
});

// セキュリティグループ設計
const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSg', {
  vpc,
  securityGroupName: 'alb-sg',
  description: 'Security Group for ALB',
  allowAllOutbound: true,
});

albSecurityGroup.addIngressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(443),
  'HTTPS from anywhere'
);
albSecurityGroup.addIngressRule(
  ec2.Peer.anyIpv6(),
  ec2.Port.tcp(443),
  'HTTPS from anywhere IPv6'
);

const appSecurityGroup = new ec2.SecurityGroup(this, 'AppSg', {
  vpc,
  securityGroupName: 'app-sg',
  description: 'Security Group for App servers',
  allowAllOutbound: true,
});

// ALBからのみアクセス許可
appSecurityGroup.addIngressRule(
  albSecurityGroup,
  ec2.Port.tcp(3000),
  'HTTP from ALB only'
);

// NACLで追加のネットワーク制御
const privateNacl = new ec2.NetworkAcl(this, 'PrivateNacl', {
  vpc,
  networkAclName: 'private-nacl',
  subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
});

privateNacl.addEntry('AllowHttpsIn', {
  ruleNumber: 100,
  cidr: ec2.AclCidr.ipv4('10.0.0.0/16'),
  traffic: ec2.AclTraffic.tcpPort(443),
  direction: ec2.TrafficDirection.INGRESS,
  ruleAction: ec2.Action.ALLOW,
});
```

---

## 12. CodePipeline CI/CD（GitHubソース・CodeBuild・デプロイ）

### CDK Pipelines（現代的なCI/CDパターン）

```typescript
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';

// CDK Pipelines（Self-mutating pipeline）
const pipeline = new CodePipeline(this, 'Pipeline', {
  pipelineName: 'MyApp-CDK-Pipeline',
  selfMutation: true,  // CDKコード変更時にパイプライン自体を更新
  crossAccountKeys: true,
  synth: new ShellStep('Synth', {
    input: CodePipelineSource.gitHub('myorg/my-repo', 'main', {
      authentication: cdk.SecretValue.secretsManager('github-token'),
      trigger: codepipelineActions.GitHubTrigger.WEBHOOK,
    }),
    commands: [
      'npm ci',
      'npm run build',
      'npx cdk synth',
    ],
    primaryOutputDirectory: 'cdk.out',
  }),
  codeBuildDefaults: {
    buildEnvironment: {
      buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      computeType: codebuild.ComputeType.SMALL,
    },
    cache: codebuild.Cache.bucket(
      new s3.Bucket(this, 'BuildCache', {
        lifecycleRules: [{ expiration: cdk.Duration.days(7) }],
      })
    ),
  },
});

// ステージング環境デプロイ
const stagingStage = pipeline.addStage(new AppStage(this, 'Staging', {
  env: { account: '111111111111', region: 'ap-northeast-1' },
  stageName: 'staging',
}));

stagingStage.addPre(new ShellStep('UnitTests', {
  commands: ['npm ci', 'npm test'],
}));

stagingStage.addPost(
  new ShellStep('IntegrationTests', {
    commands: [
      'npm run test:integration',
      'npm run test:e2e',
    ],
    envFromCfnOutputs: {
      API_URL: stagingStage.stackOutputs.apiUrl,
    },
  })
);

// 本番環境デプロイ（手動承認付き）
const prodStage = pipeline.addStage(new AppStage(this, 'Production', {
  env: { account: '222222222222', region: 'ap-northeast-1' },
  stageName: 'prod',
}));

prodStage.addPre(new pipelines.ManualApprovalStep('ApproveDeployment', {
  comment: 'Please review staging results before production deployment',
}));

// 通知設定
const pipelineNotifications = new chatbot.SlackChannelConfiguration(
  this,
  'SlackNotifications',
  {
    slackChannelConfigurationName: 'pipeline-notifications',
    slackWorkspaceId: 'TXXXXXXXX',
    slackChannelId: 'CXXXXXXXX',
  }
);

pipeline.pipeline.notifyOn('NotifyOnFailed', pipelineNotifications, {
  events: [
    codepipeline.PipelineNotificationEvents.PIPELINE_EXECUTION_FAILED,
    codepipeline.PipelineNotificationEvents.STAGE_EXECUTION_FAILED,
  ],
});
```

### 標準的なCodePipeline構成

```typescript
// アーティファクト定義
const sourceArtifact = new codepipeline.Artifact('Source');
const buildArtifact = new codepipeline.Artifact('Build');

// CodeBuildプロジェクト
const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
  projectName: 'my-app-build',
  buildSpec: codebuild.BuildSpec.fromObject({
    version: '0.2',
    phases: {
      install: {
        'runtime-versions': { nodejs: '22' },
        commands: ['npm ci'],
      },
      pre_build: {
        commands: [
          'npm run lint',
          'npm run test:unit',
        ],
      },
      build: {
        commands: [
          'npm run build',
          `docker build -t $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION .`,
          `aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REPO_URI`,
          `docker push $ECR_REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION`,
        ],
      },
    },
    artifacts: {
      files: ['**/*'],
      'base-directory': 'dist',
    },
    cache: {
      paths: ['node_modules/**/*'],
    },
  }),
  environment: {
    buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
    privileged: true,  // Docker buildに必要
    environmentVariables: {
      ECR_REPO_URI: { value: repository.repositoryUri },
    },
  },
  cache: codebuild.Cache.bucket(cacheBucket, { prefix: 'build-cache' }),
});

repository.grantPullPush(buildProject.grantPrincipal);

// パイプライン定義
const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
  pipelineName: 'my-app-pipeline',
  restartExecutionOnUpdate: true,
  stages: [
    {
      stageName: 'Source',
      actions: [
        new codepipelineActions.GitHubSourceAction({
          actionName: 'GitHub_Source',
          owner: 'myorg',
          repo: 'my-repo',
          oauthToken: cdk.SecretValue.secretsManager('github-token'),
          output: sourceArtifact,
          branch: 'main',
          trigger: codepipelineActions.GitHubTrigger.WEBHOOK,
        }),
      ],
    },
    {
      stageName: 'Build',
      actions: [
        new codepipelineActions.CodeBuildAction({
          actionName: 'Build_and_Push',
          project: buildProject,
          input: sourceArtifact,
          outputs: [buildArtifact],
        }),
      ],
    },
    {
      stageName: 'Deploy_Staging',
      actions: [
        new codepipelineActions.EcsDeployAction({
          actionName: 'Deploy_ECS',
          service: fargateService.service,
          input: buildArtifact,
        }),
      ],
    },
    {
      stageName: 'Approve',
      actions: [
        new codepipelineActions.ManualApprovalAction({
          actionName: 'Manual_Approval',
          notificationTopic: approvalTopic,
          additionalInformation: 'Check staging before deploying to production',
        }),
      ],
    },
    {
      stageName: 'Deploy_Production',
      actions: [
        new codepipelineActions.EcsDeployAction({
          actionName: 'Deploy_ECS_Prod',
          service: prodFargateService.service,
          input: buildArtifact,
        }),
      ],
    },
  ],
});
```

---

## 13. テスト（fine-grained assertions・snapshot tests）

### CDKテストの基本

CDKはAWS CDK Assertions Libraryを提供しており、CloudFormationテンプレートに対してユニットテストを書ける。

```bash
npm install --save-dev aws-cdk-lib @aws-cdk/assertions vitest
```

### Fine-Grained Assertions（詳細アサーション）

```typescript
// test/my-stack.test.ts
import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { MyAppStack } from '../lib/my-app-stack';

describe('MyAppStack', () => {
  let template: Template;

  beforeEach(() => {
    const app = new App();
    const stack = new MyAppStack(app, 'TestStack', {
      stageName: 'test',
      instanceSize: 'small',
    });
    template = Template.fromStack(stack);
  });

  // S3バケットのテスト
  describe('S3 Bucket', () => {
    test('S3バケットが暗号化されている', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
      });
    });

    test('パブリックアクセスがブロックされている', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });
  });

  // Lambda関数のテスト
  describe('Lambda Function', () => {
    test('Lambda関数のランタイムがNODE22である', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs22.x',
        Timeout: 30,
        MemorySize: 512,
      });
    });

    test('Lambda関数にX-Rayトレーシングが設定されている', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        TracingConfig: {
          Mode: 'Active',
        },
      });
    });

    test('Lambda関数の数が正しい', () => {
      template.resourceCountIs('AWS::Lambda::Function', 3);
    });
  });

  // VPCのテスト
  describe('VPC', () => {
    test('VPCが3つのAZにまたがっている', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
      });

      // サブネットが9つ（3タイプ × 3AZ）
      template.resourceCountIs('AWS::EC2::Subnet', 9);
    });
  });

  // IAMロールのテスト
  describe('IAM Roles', () => {
    test('Lambda実行ロールに必要な権限がある', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith([
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:DeleteItem',
              ]),
              Effect: 'Allow',
            }),
          ]),
        },
      });
    });
  });

  // セキュリティグループのテスト
  describe('Security Groups', () => {
    test('DBセキュリティグループがアウトバウンドトラフィックを制限している', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupEgress: Match.absent(),
      });
    });
  });

  // RDSのテスト
  describe('RDS', () => {
    test('RDSクラスターの削除保護が有効', () => {
      template.hasResourceProperties('AWS::RDS::DBCluster', {
        DeletionProtection: true,
        StorageEncrypted: true,
        BackupRetentionPeriod: 30,
      });
    });
  });
});

// Matcherを使った柔軟なアサーション
describe('Advanced Matchers', () => {
  test('SQSキューにDLQが設定されている', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      RedrivePolicy: Match.objectLike({
        maxReceiveCount: 3,
      }),
      MessageRetentionPeriod: Match.anyValue(),
    });
  });

  test('CloudFrontのHTTPSリダイレクトが設定されている', () => {
    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: 'redirect-to-https',
          }),
        }),
      })
    );
  });

  test('特定のタグが全リソースに付与されている', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    Object.values(buckets).forEach((bucket: any) => {
      const tags = bucket.Properties?.Tags || [];
      const stageTag = tags.find((t: any) => t.Key === 'Stage');
      expect(stageTag).toBeDefined();
      expect(stageTag.Value).toBe('test');
    });
  });
});
```

### Snapshot Tests（スナップショットテスト）

```typescript
// test/snapshot.test.ts
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MyAppStack } from '../lib/my-app-stack';

test('スナップショットテスト — スタック全体が一致する', () => {
  const app = new App();
  const stack = new MyAppStack(app, 'SnapshotStack', {
    stageName: 'test',
    instanceSize: 'small',
  });
  const template = Template.fromStack(stack);

  // 初回実行時にスナップショットが生成される
  // 2回目以降は差分がある場合にテスト失敗
  expect(template.toJSON()).toMatchSnapshot();
});

// 特定リソースのスナップショット
test('Lambda設定のスナップショット', () => {
  const app = new App();
  const stack = new MyAppStack(app, 'SnapshotStack', {
    stageName: 'test',
    instanceSize: 'small',
  });
  const template = Template.fromStack(stack);

  const lambdaFunctions = template.findResources('AWS::Lambda::Function');
  expect(lambdaFunctions).toMatchSnapshot();
});
```

### テスト実行

```bash
# vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
  },
});

# package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:update-snapshots": "vitest run --update-snapshots"
  }
}
```

---

## 14. CDK実践Tips

### アスペクト（Aspects）— 全リソースへの横断的適用

```typescript
import { IAspect, Aspects } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

// 全S3バケットに暗号化を強制するAspect
class S3EncryptionAspect implements IAspect {
  visit(node: IConstruct): void {
    if (node instanceof s3.Bucket) {
      if (node.encryptionKey === undefined) {
        // 暗号化なしバケットを検出したらエラー
        Annotations.of(node).addError(
          'S3 Bucket must have encryption enabled'
        );
      }
    }
  }
}

// スタック全体に適用
Aspects.of(stack).add(new S3EncryptionAspect());

// cdk-nagによるセキュリティチェック
import { AwsSolutionsChecks } from 'cdk-nag';
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
```

### CDKパラメーターとコンテキスト

```typescript
// cdk.json でコンテキスト設定
{
  "app": "npx ts-node --prefer-ts-exts bin/my-app.ts",
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:enablePartitionLiterals": true,
    "myapp:domain": "myapp.com",
    "myapp:allowedCidrs": ["203.0.113.0/24"]
  }
}

// コンテキストの読み取り
const domain = this.node.tryGetContext('myapp:domain') as string;
const allowedCidrs = this.node.tryGetContext('myapp:allowedCidrs') as string[];

// CLIからコンテキストを上書き
// cdk deploy --context myapp:domain=staging.myapp.com
```

### CloudFormationテンプレートの出力とデバッグ

CDKが生成するCloudFormationテンプレートを確認することは、デプロイ前のデバッグに非常に有効だ。

```bash
# テンプレートを出力
cdk synth > template.json

# 特定スタックのみ出力
cdk synth MyApp-Prod > prod-template.json
```

生成されたJSONテンプレートの構造が複雑な場合、**[DevToolBox](https://usedevtools.com/)** のJSONビューアーやフォーマッターを活用すると可読性が大幅に向上する。ネストされたCloudFormationリソースの確認や、Cross-Stack参照のOutputsセクションを精査する際に役立つ。

---

## まとめ

AWS CDKは、TypeScriptの型安全性とエコシステムを活用してAWSインフラを管理する強力なツールだ。本記事で解説した主要ポイントを整理しよう。

| 領域 | CDKの強み |
|------|----------|
| Stack設計 | 型安全な環境分離・Cross-Stack参照が容易 |
| Lambda | NodejsFunctionでバンドル自動化・Layerも型安全 |
| API Gateway | L2 Constructで冗長設定を削減 |
| ECS Fargate | L3パターンでALB+ECS+SG一括構成 |
| RDS | Secret Managerとの自動統合 |
| SQS/SNS | ファンアウトパターンをコードで表現 |
| CloudFront | OAC+S3の最新セキュア構成 |
| VPC | サブネット・エンドポイント・NACLの整合性維持 |
| CI/CD | CDK Pipelinesでself-mutating pipeline |
| テスト | Jestアサーションでインフラをユニットテスト |

CDKの最大の価値は**インフラをアプリコードと同じ言語・ツール・プロセスで管理できること**だ。TypeScriptの型システムが設定ミスを防ぎ、npmエコシステムがパターンの共有を容易にする。CloudFormationの安定性を基盤としながら、開発者体験を劇的に向上させるCDKをぜひプロダクションに導入してほしい。

