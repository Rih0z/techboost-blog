---
title: "Terraform × AWS完全ガイド2026：Infrastructure as Codeで本番環境を自動化する"
description: "TerraformでAWSインフラをコード化する実践ガイド。ECS/ALB/RDS構成・モジュール化・GitHub Actions CI/CD統合・コスト最適化まで網羅。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2026-03-13"
tags: ["Terraform", "AWS", "IaC", "DevOps", "CICD", "インフラ"]
heroImage: '../../assets/thumbnails/terraform-aws-guide-2026.jpg'
---
## TerraformでAWSを管理する理由

```
手動管理の問題：
- 「何を作ったか」の記録が残らない
- 本番と検証環境で設定が微妙に違う
- 削除・再作成が怖くてゴミが溜まる

Terraformのメリット：
- インフラの状態がコードで管理される
- git diffで変更点が明確
- planで事前に変更内容を確認できる
- 環境の完全な複製が1コマンド
```

---

## セットアップ

```bash
# インストール（Homebrew）
brew tap hashicorp/tap && brew install hashicorp/tap/terraform

# AWSクレデンシャル設定
aws configure
# または
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="ap-northeast-1"
```

---

## プロジェクト構造

```
infra/
├── main.tf          # メイン設定
├── variables.tf     # 変数定義
├── outputs.tf       # 出力値
├── versions.tf      # プロバイダーバージョン
├── terraform.tfvars # 変数値（gitignore推奨）
└── modules/
    ├── ecs/         # ECSクラスター
    ├── rds/         # データベース
    └── alb/         # ロードバランサー
```

---

## 実践：ECS + ALB + RDSの本番構成

```hcl
# versions.tf
terraform {
  required_version = ">= 1.8"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Stateをs3で管理（チーム開発必須）
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
```

```hcl
# modules/ecs/main.tf
resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.env}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "app"
    image     = var.ecr_image_uri
    essential = true

    portMappings = [{
      containerPort = var.app_port
      protocol      = "tcp"
    }]

    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.db_url.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "app"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:${var.app_port}/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "app" {
  name            = "${var.project}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  deployment_circuit_breaker {
    enable   = true
    rollback = true  # 失敗時に自動ロールバック
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "app"
    container_port   = var.app_port
  }

  lifecycle {
    ignore_changes = [desired_count]  # Auto Scalingが管理
  }
}
```

---

## GitHub Actionsでのデプロイ自動化

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1

      - name: Build and push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker build -t app .
          docker tag app:latest $ECR_REGISTRY/$ECR_REPO:$GITHUB_SHA
          docker push $ECR_REGISTRY/$ECR_REPO:$GITHUB_SHA

      - name: Terraform apply
        run: |
          cd infra
          terraform init
          terraform plan -var="ecr_image_tag=$GITHUB_SHA" -out=tfplan
          terraform apply tfplan
```

---

## コスト最適化のTerraformパターン

```hcl
# ECS Auto Scaling（夜間はタスク数を削減）
resource "aws_appautoscaling_scheduled_action" "scale_down_night" {
  name               = "scale-down-night"
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  schedule           = "cron(0 21 * * ? *)"  # 毎日21:00

  scalable_target_action {
    min_capacity = 0
    max_capacity = 1
  }
}

resource "aws_appautoscaling_scheduled_action" "scale_up_morning" {
  name               = "scale-up-morning"
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  schedule           = "cron(0 8 * * ? *)"  # 毎日8:00

  scalable_target_action {
    min_capacity = 2
    max_capacity = 10
  }
}
```

---

## State管理のベストプラクティス

TerraformのState（状態ファイル）管理は、チーム開発で最も重要なポイントです。

### リモートStateの設定

```hcl
# backend.tf — S3 + DynamoDBによるState管理
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"  # ロック用
  }
}

# State用S3バケットの作成（初回のみ手動 or 別Terraformで管理）
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-company-terraform-state"

  lifecycle {
    prevent_destroy = true  # 誤削除防止
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"  # 過去のStateを復元可能に
  }
}

# State lockingのためのDynamoDBテーブル
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

### State分割の戦略

大規模プロジェクトでは、Stateを分割して管理します。

```
infra/
├── global/           # IAM, Route53など（変更頻度: 低）
│   ├── main.tf
│   └── terraform.tfvars
├── network/          # VPC, Subnet, NAT（変更頻度: 低）
│   ├── main.tf
│   └── terraform.tfvars
├── database/         # RDS, ElastiCache（変更頻度: 中）
│   ├── main.tf
│   └── terraform.tfvars
└── application/      # ECS, ALB, Auto Scaling（変更頻度: 高）
    ├── main.tf
    └── terraform.tfvars
```

State間でデータを参照するには `terraform_remote_state` または `data source` を使います。

```hcl
# application/main.tf からnetworkのStateを参照
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "my-company-terraform-state"
    key    = "network/terraform.tfstate"
    region = "ap-northeast-1"
  }
}

# VPC IDやサブネットIDを取得
locals {
  vpc_id             = data.terraform_remote_state.network.outputs.vpc_id
  private_subnet_ids = data.terraform_remote_state.network.outputs.private_subnet_ids
}
```

## モジュール構造の設計パターン

再利用可能なモジュールの設計は、Terraformプロジェクトの保守性を大きく左右します。

### モジュールのディレクトリ構成

```
modules/
├── ecs-service/
│   ├── main.tf        # リソース定義
│   ├── variables.tf   # 入力変数
│   ├── outputs.tf     # 出力値
│   └── README.md      # 使い方
├── rds/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── alb/
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

### 再利用可能なモジュールの例

```hcl
# modules/ecs-service/variables.tf
variable "project" {
  description = "プロジェクト名"
  type        = string
}

variable "environment" {
  description = "環境名（production, staging, development）"
  type        = string
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "環境名はproduction, staging, developmentのいずれかを指定してください"
  }
}

variable "cpu" {
  description = "タスクのCPUユニット"
  type        = number
  default     = 256
}

variable "memory" {
  description = "タスクのメモリ（MiB）"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "タスクの希望数"
  type        = number
  default     = 2
}

variable "health_check_path" {
  description = "ヘルスチェックのパス"
  type        = string
  default     = "/health"
}
```

```hcl
# モジュールの呼び出し（環境ごとに変数を変えるだけ）
# environments/production/main.tf
module "api_service" {
  source = "../../modules/ecs-service"

  project           = "my-app"
  environment       = "production"
  cpu               = 1024
  memory            = 2048
  desired_count     = 3
  health_check_path = "/api/health"
}

# environments/staging/main.tf
module "api_service" {
  source = "../../modules/ecs-service"

  project           = "my-app"
  environment       = "staging"
  cpu               = 256
  memory            = 512
  desired_count     = 1
  health_check_path = "/api/health"
}
```

## CI/CDパイプラインとの統合

GitHub ActionsでTerraformのplan/applyを自動化する実践的な構成です。

### PRでplan、マージでapply

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  pull_request:
    paths: ['infra/**']
  push:
    branches: [main]
    paths: ['infra/**']

permissions:
  id-token: write    # OIDC認証用
  contents: read
  pull-requests: write  # PRコメント用

jobs:
  terraform:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-northeast-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.8

      - name: Terraform Init
        run: terraform init

      - name: Terraform Format Check
        run: terraform fmt -check -recursive

      - name: Terraform Validate
        run: terraform validate

      # PRの場合: planのみ実行してコメントに結果を表示
      - name: Terraform Plan
        if: github.event_name == 'pull_request'
        id: plan
        run: terraform plan -no-color -out=tfplan
        continue-on-error: true

      - name: Post Plan to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### Terraform Plan 📖
            \`\`\`
            ${{ steps.plan.outputs.stdout }}
            \`\`\`
            *PR #${{ github.event.pull_request.number }}*`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            })

      # mainマージ時: applyを実行
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: |
          terraform plan -out=tfplan
          terraform apply -auto-approve tfplan
```

### セキュリティのベストプラクティス

```hcl
# OIDC認証でAWSアクセスキーを不要にする
# IAMロールの信頼ポリシー
data "aws_iam_policy_document" "github_actions_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:your-org/your-repo:*"]
    }
  }
}
```

## まとめ：Terraform導入の3ステップ

1. **State管理をS3に移行**（チーム開発の前提）
2. **モジュール化**（再利用可能なパーツを作る）
3. **GitHub Actions統合**（PRでplan確認、mainマージでapply）

最初は学習コストがありますが、一度整備すると「インフラ変更が怖くない」状態になります。
