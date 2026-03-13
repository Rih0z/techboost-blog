---
title: "Pulumi入門ガイド｜TypeScriptでインフラを管理"
description: "PulumiでTypeScriptを使ったインフラ管理の方法を解説。Terraformとの比較、AWS/GCP/Azureリソースの定義、プログラミング言語の利点を活かしたIaCパターンまで実践コード付きで紹介します。"
pubDate: "2026-03-09"
tags: ["DevOps", "インフラ", "TypeScript", "cloud"]
heroImage: '../../assets/thumbnails/pulumi-infrastructure-as-code-guide-2026.jpg'
---

## はじめに

Infrastructure as Code（IaC）はクラウドインフラ管理の標準的な手法として定着している。Terraformが長年にわたりIaCツールのデファクトスタンダードであったが、HCLという独自DSLの学習コストや、条件分岐・ループの表現力の制限が課題として指摘されてきた。

Pulumiは、TypeScript、Python、Go、C#といった汎用プログラミング言語でインフラを定義できるIaCツールである。既存の言語知識、IDE支援、テストフレームワーク、パッケージマネージャーをそのまま活用できる点が最大の特徴である。

本記事では、TypeScriptを使ったPulumiの基本概念から実践的なインフラ構築パターンまでを解説する。

### 対象読者

- Terraformの経験がありPulumiへの移行を検討しているインフラエンジニア
- TypeScriptでインフラを管理したいバックエンドエンジニア
- IaCを初めて学ぶクラウドエンジニア

### 前提知識

- TypeScriptの基本的な知識
- AWSまたはGCPの基本的な概念（VPC、EC2、S3等）
- ターミナル操作の基本

## PulumiとTerraformの比較

### アーキテクチャの違い

| 項目 | Pulumi | Terraform |
|------|--------|-----------|
| **言語** | TypeScript/Python/Go/C#/Java/YAML | HCL（独自DSL） |
| **状態管理** | Pulumi Cloud / S3 / ローカル | Terraform Cloud / S3 / ローカル |
| **型安全性** | あり（言語の型システムを活用） | 限定的 |
| **テスト** | 言語標準のテストFW | terraform test（制限あり） |
| **条件分岐/ループ** | if/for/map等（言語の全機能） | count/for_each/dynamic（制限あり） |
| **IDE支援** | フル対応（補完/型チェック/リファクタ） | 限定的 |
| **モジュール** | npm/pip/go modules | Terraform Registry |
| **プロバイダー** | Terraform Bridge経由で同じプロバイダーを利用可能 | 豊富なプロバイダー |
| **学習コスト** | 既知の言語なら低い | HCLの習得が必要 |
| **コミュニティ** | 成長中 | 大規模 |

### HCL vs TypeScript: 同じインフラの記述比較

S3バケットにCloudFrontディストリビューションを接続する例で比較する。

Terraform（HCL）の場合:

```hcl
resource "aws_s3_bucket" "website" {
  bucket = "my-website-${var.environment}"
}

resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "s3-origin"
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

Pulumi（TypeScript）の場合:

```typescript
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const environment = config.require('environment');

const bucket = new aws.s3.Bucket('website', {
  bucket: `my-website-${environment}`,
  website: {
    indexDocument: 'index.html',
  },
});

const cdn = new aws.cloudfront.Distribution('cdn', {
  enabled: true,
  defaultRootObject: 'index.html',
  origins: [{
    domainName: bucket.bucketRegionalDomainName,
    originId: 's3-origin',
  }],
  defaultCacheBehavior: {
    allowedMethods: ['GET', 'HEAD'],
    cachedMethods: ['GET', 'HEAD'],
    targetOriginId: 's3-origin',
    viewerProtocolPolicy: 'redirect-to-https',
    forwardedValues: {
      queryString: false,
      cookies: { forward: 'none' },
    },
  },
  restrictions: {
    geoRestriction: { restrictionType: 'none' },
  },
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
});

export const bucketName = bucket.bucket;
export const cdnUrl = cdn.domainName;
```

TypeScriptの場合、IDEの型補完により設定項目の漏れや誤りをコンパイル時に検出できる。

## 開発環境のセットアップ

### Pulumi CLIのインストール

macOSの場合:

```bash
# Homebrew経由
brew install pulumi

# バージョン確認
pulumi version
```

Windowsの場合:

```bash
# Chocolatey経由
choco install pulumi

# または winget
winget install pulumi
```

Linuxの場合:

```bash
# 公式インストーラー
curl -fsSL https://get.pulumi.com | sh

# パスを通す
export PATH=$PATH:$HOME/.pulumi/bin
```

### Pulumiアカウントの設定

Pulumiは状態管理（State）をPulumi Cloudに保存するのがデフォルトである。ローカルやS3に保存することも可能である。

```bash
# Pulumi Cloudにログイン（無料枠あり）
pulumi login

# ローカルに状態を保存する場合
pulumi login --local

# S3に状態を保存する場合
pulumi login s3://my-pulumi-state-bucket
```

### プロジェクトの作成

```bash
# AWSのTypeScriptテンプレートで新規プロジェクト作成
pulumi new aws-typescript --name my-infra --dir my-infra

cd my-infra
```

生成されるプロジェクト構造:

```
my-infra/
├── Pulumi.yaml          # プロジェクト設定
├── Pulumi.dev.yaml      # dev スタック設定
├── index.ts             # インフラ定義
├── package.json
└── tsconfig.json
```

### Pulumi.yaml の構成

```yaml
# Pulumi.yaml
name: my-infra
runtime:
  name: nodejs
  options:
    typescript: true
description: My infrastructure project
config:
  pulumi:tags:
    value:
      pulumi:template: aws-typescript
```

## 基本概念

### リソース

Pulumiのリソースはクラウドインフラの各要素（S3バケット、EC2インスタンス等）に対応する。

```typescript
import * as aws from '@pulumi/aws';

// S3バケットの作成
const bucket = new aws.s3.Bucket('my-bucket', {
  // 設定（props）
  bucket: 'my-unique-bucket-name',
  tags: {
    Environment: 'dev',
    ManagedBy: 'pulumi',
  },
});
```

第1引数はPulumi内部の**論理名**（Logical Name）であり、実際のリソース名ではない。Pulumiはこの論理名を使って状態管理を行う。

### Output と Input

Pulumiのリソースプロパティは`Output<T>`型で返される。これは、リソースの作成が完了するまで値が確定しないことを表す。

```typescript
// bucket.arn は Output<string> 型
const bucket = new aws.s3.Bucket('my-bucket');

// Output<T> の値を使う場合は .apply() を使用
const bucketPolicy = bucket.arn.apply(arn => {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: `${arn}/*`,
    }],
  });
});

// pulumi.interpolate でテンプレートリテラルと組み合わせ可能
const policyJson = pulumi.interpolate`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Resource": "${bucket.arn}/*"
  }]
}`;
```

### Stack（スタック）

スタックは同一プロジェクトの異なる環境（dev/staging/production）を管理する単位である。

```bash
# スタックの作成
pulumi stack init dev
pulumi stack init staging
pulumi stack init production

# スタックの切り替え
pulumi stack select dev

# スタック一覧の表示
pulumi stack ls
```

### Config（設定）

スタックごとに異なる設定値を管理できる。

```bash
# 設定値のセット
pulumi config set aws:region ap-northeast-1
pulumi config set environment dev
pulumi config set instanceType t3.micro

# シークレットの設定（暗号化保存）
pulumi config set --secret dbPassword 'my-secret-password'
```

```typescript
// コード内での設定値の取得
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const environment = config.require('environment');        // 必須
const instanceType = config.get('instanceType') || 't3.micro'; // 任意
const dbPassword = config.requireSecret('dbPassword');    // シークレット
```

## 実践的なAWSインフラ構築

### VPC + サブネット + セキュリティグループ

```typescript
// infra/vpc.ts
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const environment = config.require('environment');

// 利用可能なAZを取得
const azs = aws.getAvailabilityZones({
  state: 'available',
});

// VPCの作成
export const vpc = new aws.ec2.Vpc('main-vpc', {
  cidrBlock: '10.0.0.0/16',
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: {
    Name: `${environment}-vpc`,
    Environment: environment,
  },
});

// パブリックサブネット（2AZ）
export const publicSubnets = azs.then(zones =>
  zones.names.slice(0, 2).map((az, index) =>
    new aws.ec2.Subnet(`public-subnet-${index}`, {
      vpcId: vpc.id,
      cidrBlock: `10.0.${index}.0/24`,
      availabilityZone: az,
      mapPublicIpOnLaunch: true,
      tags: {
        Name: `${environment}-public-${az}`,
        Type: 'public',
      },
    })
  )
);

// プライベートサブネット（2AZ）
export const privateSubnets = azs.then(zones =>
  zones.names.slice(0, 2).map((az, index) =>
    new aws.ec2.Subnet(`private-subnet-${index}`, {
      vpcId: vpc.id,
      cidrBlock: `10.0.${index + 10}.0/24`,
      availabilityZone: az,
      tags: {
        Name: `${environment}-private-${az}`,
        Type: 'private',
      },
    })
  )
);

// インターネットゲートウェイ
const igw = new aws.ec2.InternetGateway('igw', {
  vpcId: vpc.id,
  tags: { Name: `${environment}-igw` },
});

// パブリックルートテーブル
const publicRouteTable = new aws.ec2.RouteTable('public-rt', {
  vpcId: vpc.id,
  routes: [{
    cidrBlock: '0.0.0.0/0',
    gatewayId: igw.id,
  }],
  tags: { Name: `${environment}-public-rt` },
});

// Webサーバー用セキュリティグループ
export const webSg = new aws.ec2.SecurityGroup('web-sg', {
  vpcId: vpc.id,
  description: 'Security group for web servers',
  ingress: [
    {
      protocol: 'tcp',
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'HTTP',
    },
    {
      protocol: 'tcp',
      fromPort: 443,
      toPort: 443,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'HTTPS',
    },
  ],
  egress: [{
    protocol: '-1',
    fromPort: 0,
    toPort: 0,
    cidrBlocks: ['0.0.0.0/0'],
    description: 'All outbound',
  }],
  tags: { Name: `${environment}-web-sg` },
});
```

### ECS Fargate によるコンテナデプロイ

```typescript
// infra/ecs.ts
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { vpc, publicSubnets, webSg } from './vpc';

const config = new pulumi.Config();
const environment = config.require('environment');

// ECSクラスターの作成
const cluster = new aws.ecs.Cluster('app-cluster', {
  name: `${environment}-cluster`,
  settings: [{
    name: 'containerInsights',
    value: 'enabled',
  }],
  tags: { Environment: environment },
});

// ECRリポジトリ
const repo = new aws.ecr.Repository('app-repo', {
  name: `${environment}-app`,
  imageTagMutability: 'MUTABLE',
  imageScanningConfiguration: {
    scanOnPush: true,
  },
  forceDelete: environment !== 'production',
});

// タスク実行ロール
const taskExecutionRole = new aws.iam.Role('task-execution-role', {
  name: `${environment}-ecs-task-execution`,
  assumeRolePolicy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Action: 'sts:AssumeRole',
      Effect: 'Allow',
      Principal: { Service: 'ecs-tasks.amazonaws.com' },
    }],
  }),
});

new aws.iam.RolePolicyAttachment('task-execution-policy', {
  role: taskExecutionRole.name,
  policyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
});

// タスク定義
const taskDefinition = new aws.ecs.TaskDefinition('app-task', {
  family: `${environment}-app`,
  networkMode: 'awsvpc',
  requiresCompatibilities: ['FARGATE'],
  cpu: '256',
  memory: '512',
  executionRoleArn: taskExecutionRole.arn,
  containerDefinitions: pulumi.output(repo.repositoryUrl).apply(repoUrl =>
    JSON.stringify([{
      name: 'app',
      image: `${repoUrl}:latest`,
      essential: true,
      portMappings: [{
        containerPort: 3000,
        hostPort: 3000,
        protocol: 'tcp',
      }],
      environment: [
        { name: 'NODE_ENV', value: environment },
      ],
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': `/ecs/${environment}-app`,
          'awslogs-region': 'ap-northeast-1',
          'awslogs-stream-prefix': 'ecs',
        },
      },
    }])
  ),
});

// ALB
const alb = new aws.lb.LoadBalancer('app-alb', {
  name: `${environment}-alb`,
  internal: false,
  loadBalancerType: 'application',
  securityGroups: [webSg.id],
  subnets: publicSubnets.then(subnets => subnets.map(s => s.id)),
  tags: { Environment: environment },
});

// ターゲットグループ
const targetGroup = new aws.lb.TargetGroup('app-tg', {
  name: `${environment}-app-tg`,
  port: 3000,
  protocol: 'HTTP',
  targetType: 'ip',
  vpcId: vpc.id,
  healthCheck: {
    enabled: true,
    path: '/health',
    protocol: 'HTTP',
    interval: 30,
    timeout: 5,
    healthyThreshold: 2,
    unhealthyThreshold: 3,
  },
});

// ALBリスナー
new aws.lb.Listener('app-listener', {
  loadBalancerArn: alb.arn,
  port: 80,
  protocol: 'HTTP',
  defaultActions: [{
    type: 'forward',
    targetGroupArn: targetGroup.arn,
  }],
});

// ECSサービス
const service = new aws.ecs.Service('app-service', {
  name: `${environment}-app`,
  cluster: cluster.arn,
  taskDefinition: taskDefinition.arn,
  desiredCount: environment === 'production' ? 2 : 1,
  launchType: 'FARGATE',
  networkConfiguration: {
    assignPublicIp: true,
    subnets: publicSubnets.then(subnets => subnets.map(s => s.id)),
    securityGroups: [webSg.id],
  },
  loadBalancers: [{
    targetGroupArn: targetGroup.arn,
    containerName: 'app',
    containerPort: 3000,
  }],
});

export const albUrl = pulumi.interpolate`http://${alb.dnsName}`;
export const clusterName = cluster.name;
export const serviceName = service.name;
```

### RDS（Aurora Serverless v2）

```typescript
// infra/database.ts
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { vpc, privateSubnets, webSg } from './vpc';

const config = new pulumi.Config();
const environment = config.require('environment');
const dbPassword = config.requireSecret('dbPassword');

// DB用セキュリティグループ
const dbSg = new aws.ec2.SecurityGroup('db-sg', {
  vpcId: vpc.id,
  description: 'Security group for RDS',
  ingress: [{
    protocol: 'tcp',
    fromPort: 5432,
    toPort: 5432,
    securityGroups: [webSg.id],
    description: 'PostgreSQL from web servers',
  }],
  egress: [{
    protocol: '-1',
    fromPort: 0,
    toPort: 0,
    cidrBlocks: ['0.0.0.0/0'],
  }],
  tags: { Name: `${environment}-db-sg` },
});

// サブネットグループ
const dbSubnetGroup = new aws.rds.SubnetGroup('db-subnet-group', {
  name: `${environment}-db-subnet`,
  subnetIds: privateSubnets.then(subnets => subnets.map(s => s.id)),
  tags: { Environment: environment },
});

// Aurora Serverless v2クラスター
const dbCluster = new aws.rds.Cluster('db-cluster', {
  clusterIdentifier: `${environment}-aurora`,
  engine: 'aurora-postgresql',
  engineMode: 'provisioned',
  engineVersion: '15.4',
  databaseName: 'appdb',
  masterUsername: 'admin',
  masterPassword: dbPassword,
  dbSubnetGroupName: dbSubnetGroup.name,
  vpcSecurityGroupIds: [dbSg.id],
  serverlessv2ScalingConfiguration: {
    minCapacity: 0.5,
    maxCapacity: environment === 'production' ? 16 : 2,
  },
  skipFinalSnapshot: environment !== 'production',
  tags: { Environment: environment },
});

// Aurora Serverless v2インスタンス
const dbInstance = new aws.rds.ClusterInstance('db-instance', {
  clusterIdentifier: dbCluster.id,
  instanceClass: 'db.serverless',
  engine: 'aurora-postgresql',
  engineVersion: '15.4',
  tags: { Environment: environment },
});

export const dbEndpoint = dbCluster.endpoint;
export const dbReaderEndpoint = dbCluster.readerEndpoint;
```

## コンポーネントリソース（再利用可能なモジュール）

### カスタムコンポーネントの作成

Pulumiでは`ComponentResource`を継承してカスタムコンポーネントを作成できる。これにより、複数のリソースをまとめて再利用可能なモジュールにできる。

```typescript
// components/static-website.ts
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

export interface StaticWebsiteArgs {
  domain: string;
  indexDocument?: string;
  errorDocument?: string;
  certificateArn?: pulumi.Input<string>;
  tags?: Record<string, string>;
}

export class StaticWebsite extends pulumi.ComponentResource {
  public readonly bucketName: pulumi.Output<string>;
  public readonly websiteUrl: pulumi.Output<string>;
  public readonly cdnUrl: pulumi.Output<string>;

  constructor(
    name: string,
    args: StaticWebsiteArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('custom:web:StaticWebsite', name, {}, opts);

    const defaultOpts = { parent: this };

    // S3バケット
    const bucket = new aws.s3.BucketV2(`${name}-bucket`, {
      bucket: args.domain,
      tags: args.tags,
    }, defaultOpts);

    // バケットのウェブサイト設定
    new aws.s3.BucketWebsiteConfigurationV2(`${name}-website-config`, {
      bucket: bucket.id,
      indexDocument: {
        suffix: args.indexDocument || 'index.html',
      },
      errorDocument: {
        key: args.errorDocument || '404.html',
      },
    }, defaultOpts);

    // バケットのパブリックアクセス設定
    new aws.s3.BucketPublicAccessBlock(`${name}-public-access`, {
      bucket: bucket.id,
      blockPublicAcls: false,
      blockPublicPolicy: false,
      ignorePublicAcls: false,
      restrictPublicBuckets: false,
    }, defaultOpts);

    // OAC（Origin Access Control）
    const oac = new aws.cloudfront.OriginAccessControl(`${name}-oac`, {
      name: `${name}-oac`,
      originAccessControlOriginType: 's3',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
    }, defaultOpts);

    // CloudFrontディストリビューション
    const cdn = new aws.cloudfront.Distribution(`${name}-cdn`, {
      enabled: true,
      defaultRootObject: args.indexDocument || 'index.html',
      origins: [{
        domainName: bucket.bucketRegionalDomainName,
        originId: 's3-origin',
        originAccessControlId: oac.id,
      }],
      defaultCacheBehavior: {
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        targetOriginId: 's3-origin',
        viewerProtocolPolicy: 'redirect-to-https',
        compress: true,
        forwardedValues: {
          queryString: false,
          cookies: { forward: 'none' },
        },
        minTtl: 0,
        defaultTtl: 3600,
        maxTtl: 86400,
      },
      restrictions: {
        geoRestriction: { restrictionType: 'none' },
      },
      viewerCertificate: args.certificateArn
        ? {
            acmCertificateArn: args.certificateArn,
            sslSupportMethod: 'sni-only',
            minimumProtocolVersion: 'TLSv1.2_2021',
          }
        : { cloudfrontDefaultCertificate: true },
      tags: args.tags,
    }, defaultOpts);

    this.bucketName = bucket.bucket;
    this.websiteUrl = pulumi.interpolate`http://${bucket.bucketRegionalDomainName}`;
    this.cdnUrl = pulumi.interpolate`https://${cdn.domainName}`;

    this.registerOutputs({
      bucketName: this.bucketName,
      websiteUrl: this.websiteUrl,
      cdnUrl: this.cdnUrl,
    });
  }
}
```

### コンポーネントの使用

```typescript
// index.ts
import { StaticWebsite } from './components/static-website';

const website = new StaticWebsite('my-site', {
  domain: 'example.com',
  tags: {
    Environment: 'production',
    Project: 'marketing',
  },
});

export const siteUrl = website.cdnUrl;
export const bucketName = website.bucketName;
```

## シークレット管理

### Pulumiのシークレット機能

Pulumiは設定値を暗号化して保存する機能を持つ。

```bash
# シークレットの設定
pulumi config set --secret apiKey 'sk-1234567890abcdef'
pulumi config set --secret dbPassword 'super-secret-password'
```

```typescript
// シークレットの取得（Output<string>型で返される）
const config = new pulumi.Config();
const apiKey = config.requireSecret('apiKey');
const dbPassword = config.requireSecret('dbPassword');

// シークレットをリソースに渡す
const secret = new aws.secretsmanager.Secret('api-key', {
  name: 'api-key',
});

new aws.secretsmanager.SecretVersion('api-key-version', {
  secretId: secret.id,
  secretString: apiKey,
});
```

### プロバイダー設定による暗号化キーの指定

```bash
# AWS KMSキーで暗号化
pulumi stack init production --secrets-provider "awskms://alias/pulumi-secrets"

# Vaultで暗号化
pulumi stack init staging --secrets-provider "hashivault://secret/data/pulumi"
```

## インフラのテスト

Pulumiの最大の利点の1つが、汎用プログラミング言語のテストフレームワークを使ってインフラコードをテストできる点である。

### ユニットテスト

```typescript
// __tests__/vpc.test.ts
import * as pulumi from '@pulumi/pulumi';

// Pulumiのモック設定
pulumi.runtime.setMocks({
  newResource: (args: pulumi.runtime.MockResourceArgs) => {
    return {
      id: `${args.name}-id`,
      state: {
        ...args.inputs,
        arn: `arn:aws:${args.type}:ap-northeast-1:123456789:${args.name}`,
      },
    };
  },
  call: (args: pulumi.runtime.MockCallArgs) => {
    if (args.token === 'aws:index/getAvailabilityZones:getAvailabilityZones') {
      return {
        names: ['ap-northeast-1a', 'ap-northeast-1c'],
        zoneIds: ['apne1-az4', 'apne1-az1'],
      };
    }
    return args.inputs;
  },
});

describe('VPC Infrastructure', () => {
  let infra: typeof import('../infra/vpc');

  beforeAll(async () => {
    infra = await import('../infra/vpc');
  });

  test('VPCのCIDRブロックが正しいこと', async () => {
    const cidr = await new Promise<string>((resolve) =>
      infra.vpc.cidrBlock.apply(resolve)
    );
    expect(cidr).toBe('10.0.0.0/16');
  });

  test('パブリックサブネットが2つ作成されること', async () => {
    const subnets = await infra.publicSubnets;
    expect(subnets).toHaveLength(2);
  });

  test('Webセキュリティグループがポート80と443を許可すること', async () => {
    const ingress = await new Promise<any[]>((resolve) =>
      infra.webSg.ingress.apply(resolve)
    );
    const ports = ingress.map(rule => rule.fromPort);
    expect(ports).toContain(80);
    expect(ports).toContain(443);
  });
});
```

### ポリシーテスト（Policy as Code）

Pulumiの`@pulumi/policy`を使って、組織のセキュリティポリシーをコードで強制できる。

```typescript
// policy/security-policy.ts
import { PolicyPack, validateResourceOfType } from '@pulumi/policy';
import * as aws from '@pulumi/aws';

new PolicyPack('security-policies', {
  policies: [
    // S3バケットの暗号化を必須にする
    {
      name: 's3-encryption-required',
      description: 'S3バケットはサーバーサイド暗号化を有効にすること',
      enforcementLevel: 'mandatory',
      validateResource: validateResourceOfType(
        aws.s3.BucketV2,
        (bucket, args, reportViolation) => {
          // 暗号化設定の確認ロジック
          if (!bucket.tags || !bucket.tags['Encrypted']) {
            reportViolation(
              'S3バケットにはEncryptedタグが必要です'
            );
          }
        }
      ),
    },

    // セキュリティグループで0.0.0.0/0のSSHを禁止
    {
      name: 'no-public-ssh',
      description: 'セキュリティグループで全世界へのSSH(22)開放を禁止',
      enforcementLevel: 'mandatory',
      validateResource: validateResourceOfType(
        aws.ec2.SecurityGroup,
        (sg, args, reportViolation) => {
          const ingress = sg.ingress || [];
          for (const rule of ingress) {
            if (
              rule.fromPort === 22 &&
              rule.cidrBlocks?.includes('0.0.0.0/0')
            ) {
              reportViolation(
                'SSHポート(22)を0.0.0.0/0に開放することは禁止されています'
              );
            }
          }
        }
      ),
    },

    // RDSの公開アクセスを禁止
    {
      name: 'no-public-rds',
      description: 'RDSインスタンスの公開アクセスを禁止',
      enforcementLevel: 'mandatory',
      validateResource: validateResourceOfType(
        aws.rds.Instance,
        (instance, args, reportViolation) => {
          if (instance.publiclyAccessible) {
            reportViolation(
              'RDSインスタンスのpubliclyAccessibleはfalseにすること'
            );
          }
        }
      ),
    },
  ],
});
```

## CI/CDへの統合

### GitHub Actionsでのデプロイ

```yaml
# .github/workflows/infra-deploy.yml
name: Infrastructure Deploy

on:
  push:
    branches: [main]
    paths: ['infra/**']
  pull_request:
    branches: [main]
    paths: ['infra/**']

env:
  PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AWS_REGION: ap-northeast-1

jobs:
  preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: cd infra && npm install

      - uses: pulumi/actions@v5
        with:
          command: preview
          stack-name: dev
          work-dir: infra
          comment-on-pr: true
          comment-on-summary: true

  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: cd infra && npm install

      - name: Run tests
        run: cd infra && npm test

      - uses: pulumi/actions@v5
        with:
          command: up
          stack-name: production
          work-dir: infra
```

### プレビュー（Dry Run）

PRに対して自動的に`pulumi preview`を実行し、変更内容をコメントに投稿する。

```bash
# ローカルでのプレビュー
pulumi preview

# 詳細な差分表示
pulumi preview --diff

# JSON出力（CI/CDでの解析用）
pulumi preview --json
```

## マルチクラウド対応

### 複数プロバイダーの同時利用

```typescript
// multi-cloud.ts
import * as aws from '@pulumi/aws';
import * as gcp from '@pulumi/gcp';
import * as cloudflare from '@pulumi/cloudflare';

// AWS: S3にバックアップ
const backupBucket = new aws.s3.Bucket('backup', {
  bucket: 'my-app-backup',
  versioning: { enabled: true },
});

// GCP: Cloud Runでアプリケーション
const service = new gcp.cloudrun.Service('app', {
  location: 'asia-northeast1',
  template: {
    spec: {
      containers: [{
        image: 'gcr.io/my-project/app:latest',
      }],
    },
  },
});

// Cloudflare: DNS管理
const zone = cloudflare.getZone({ name: 'example.com' });

new cloudflare.Record('app-dns', {
  zoneId: zone.then(z => z.id),
  name: 'app',
  type: 'CNAME',
  value: service.statuses[0].url,
  proxied: true,
});
```

### プロバイダーのエイリアス

複数リージョンに同じリソースをデプロイする場合:

```typescript
// 東京リージョンのプロバイダー（デフォルト）
const tokyoProvider = new aws.Provider('tokyo', {
  region: 'ap-northeast-1',
});

// バージニアリージョンのプロバイダー（CloudFront証明書用）
const virginiaProvider = new aws.Provider('virginia', {
  region: 'us-east-1',
});

// 東京リージョンにVPC
const vpc = new aws.ec2.Vpc('tokyo-vpc', {
  cidrBlock: '10.0.0.0/16',
}, { provider: tokyoProvider });

// バージニアリージョンにACM証明書
const cert = new aws.acm.Certificate('ssl-cert', {
  domainName: 'example.com',
  validationMethod: 'DNS',
}, { provider: virginiaProvider });
```

## デプロイと運用コマンド

### 基本操作

```bash
# インフラの作成/更新
pulumi up

# 自動承認（CI/CD用）
pulumi up --yes

# 差分の確認
pulumi preview --diff

# スタックの出力値を表示
pulumi stack output

# 特定の出力値を取得
pulumi stack output cdnUrl

# リソースの一覧
pulumi stack --show-urns

# インフラの破棄
pulumi destroy

# スタックの削除
pulumi stack rm dev
```

### インポート（既存リソースの取り込み）

```bash
# 既存のS3バケットをPulumiの管理下に置く
pulumi import aws:s3/bucket:Bucket my-bucket my-existing-bucket-name
```

```typescript
// インポート後にコードで定義
const importedBucket = new aws.s3.Bucket('my-bucket', {
  bucket: 'my-existing-bucket-name',
}, {
  import: 'my-existing-bucket-name', // インポート指定
});
```

## まとめ

本記事では、PulumiによるTypeScriptでのインフラ管理を解説した。以下に要点をまとめる。

### Pulumiを選ぶべきケース

- TypeScript/Pythonなど既知の言語でインフラを管理したい場合
- 型安全性とIDE支援を活かして開発効率を上げたい場合
- インフラコードに本格的なユニットテストを導入したい場合
- コンポーネント化による再利用性を重視する場合
- マルチクラウド環境を統一的に管理したい場合

### Terraformを選ぶべきケース

- チーム全体がHCLに習熟している場合
- Terraform Registryの豊富なモジュールを活用したい場合
- Terraform Cloud/Enterpriseのガバナンス機能が必要な場合
- 組織としてTerraformに標準化している場合

### 移行のアプローチ

既存のTerraformプロジェクトからPulumiへ移行する場合、`pulumi convert --from terraform`コマンドでHCLコードをTypeScriptに変換できる。完全な変換は保証されないが、移行の出発点として有用である。また、`pulumi import`で既存リソースを取り込むことで、段階的な移行が可能である。

Pulumiは汎用プログラミング言語の強みをインフラ管理に持ち込むことで、アプリケーション開発とインフラ管理の境界を薄くする。TypeScriptに慣れたチームにとって、学習コストを最小限に抑えつつIaCの恩恵を得られる有力な選択肢である。

## 参考資料

- [Pulumi 公式ドキュメント](https://www.pulumi.com/docs/)
- [Pulumi Examples（GitHub）](https://github.com/pulumi/examples)
- [Pulumi vs Terraform](https://www.pulumi.com/docs/concepts/vs/terraform/)
- [Pulumi TypeScript API リファレンス](https://www.pulumi.com/registry/)
- [Pulumi Blog](https://www.pulumi.com/blog/)
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
