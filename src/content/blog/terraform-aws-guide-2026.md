---
title: "Terraform × AWS完全ガイド2026：Infrastructure as Codeで本番環境を自動化する"
description: "TerraformでAWSインフラをコード化する実践ガイド。ECS/ALB/RDS構成・モジュール化・GitHub Actions CI/CD統合・コスト最適化まで網羅。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2026-03-13"
heroImage: '../../assets/thumbnails/terraform-aws-guide-2026.jpg'
tags: ["Terraform", "AWS", "IaC", "DevOps", "CICD", "インフラ"]
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

## まとめ：Terraform導入の3ステップ

1. **State管理をS3に移行**（チーム開発の前提）
2. **モジュール化**（再利用可能なパーツを作る）
3. **GitHub Actions統合**（PRでplan確認、mainマージでapply）

最初は学習コストがありますが、一度整備すると「インフラ変更が怖くない」状態になります。
