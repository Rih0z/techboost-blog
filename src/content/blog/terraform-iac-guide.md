---
title: 'Terraform完全ガイド — Infrastructure as Code・AWS/GCP・モジュール化・CI/CD'
description: 'TerraformでInfrastructure as Codeを実践する完全ガイド。HCL構文・プロバイダー設定・リソース管理・変数・モジュール・Terraform Cloud・GitHub Actions統合・AWS/GCP実践例まで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['Terraform', 'IaC', 'AWS', 'DevOps', 'クラウド']
---

Infrastructure as Code（IaC）は現代のクラウド運用において欠かせない実践です。手作業でクラウドリソースを管理していた時代は終わり、コードによってインフラを宣言的に定義・管理する手法が主流となっています。その中でも **Terraform** は、マルチクラウド対応・巨大なエコシステム・活発なコミュニティを武器に、IaCツールのデファクトスタンダードとして君臨しています。

本記事では、Terraformの基礎から実践的な応用まで、豊富なコード例とともに体系的に解説します。

---

## 1. Terraformとは — なぜ選ばれるのか

### Infrastructure as Codeの概念

Infrastructure as Code とは、サーバー・ネットワーク・データベースといったインフラをコードとして記述し、バージョン管理・レビュー・自動デプロイの対象にするアプローチです。

手動操作の問題点:
- **再現性ゼロ**: 「あのサーバーと同じ設定で」が難しい
- **ドリフト**: 実際の構成がドキュメントと乖離する
- **スケール困難**: 環境を10倍にするには作業も10倍
- **属人化**: 担当者しか詳細を知らない

IaCで解決できること:
- Gitで変更履歴を管理
- Pull Requestでインフラ変更をレビュー
- 同一構成を何度でも再現
- CI/CDで自動適用

### CloudFormation・Pulumiとの比較

| 機能 | Terraform | CloudFormation | Pulumi |
|------|-----------|----------------|--------|
| 対応クラウド | マルチ | AWSのみ | マルチ |
| 記述言語 | HCL | YAML/JSON | Python/TS/Go等 |
| 状態管理 | tfstate | AWS管理 | Pulumi Cloud |
| 学習コスト | 中 | 中 | 低（既存言語） |
| エコシステム | 最大 | AWS特化 | 成長中 |
| ドリフト検出 | あり | あり | あり |

**CloudFormation** はAWSに特化しており、AWSネイティブの機能（StackSets・Change Sets）が充実していますが、マルチクラウドには使えません。

**Pulumi** はPython・TypeScript・Goなど既存プログラミング言語でインフラを記述できるため、ループや条件分岐を普通のコードで書けます。ただしエコシステムはまだTerraformに及びません。

**Terraform** の強みは:
1. **プロバイダーの豊富さ**: AWS・GCP・Azure・Cloudflare・Datadog・GitHub等1,000以上
2. **HashiCorp Registry**: 品質の高いモジュールが公開されている
3. **実績**: 多くの企業が本番運用しており、ノウハウが豊富
4. **HCL**: プログラミング言語ではないが、設定言語として読みやすい

### Terraformのアーキテクチャ

```
┌─────────────────────────────────────────┐
│          Terraform CLI                  │
│  terraform init / plan / apply / destroy│
└──────────────┬──────────────────────────┘
               │
        ┌──────▼──────┐
        │   Provider  │  ← AWS, GCP, Azure...
        │   Plugin    │
        └──────┬──────┘
               │ API呼び出し
        ┌──────▼──────┐
        │ Cloud APIs  │
        └─────────────┘

        ┌─────────────┐
        │ State File  │  ← terraform.tfstate
        │ (tfstate)   │    実際の状態を記録
        └─────────────┘
```

---

## 2. HCL構文基礎

Terraformの設定ファイルは `.tf` 拡張子で、**HCL（HashiCorp Configuration Language）** で記述します。

### ファイル構成の基本

```
project/
├── main.tf          # メインリソース定義
├── variables.tf     # 変数定義
├── outputs.tf       # 出力値定義
├── locals.tf        # ローカル値定義
├── versions.tf      # バージョン制約
└── terraform.tfvars # 変数値（.gitignoreに追加推奨）
```

### resource ブロック

リソースはTerraformの基本単位です。

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name        = "web-server"
    Environment = "production"
  }
}
```

構文: `resource "<プロバイダー>_<リソース種別>" "<ローカル名>" { ... }`

参照方法: `aws_instance.web.id`（`<タイプ>.<名前>.<属性>`）

### data ブロック

既存リソースを参照するための読み取り専用ブロックです。

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
}
```

### variable ブロック

```hcl
variable "region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "instance_count" {
  description = "インスタンス数"
  type        = number
  default     = 2

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "インスタンス数は1〜10の範囲で指定してください。"
  }
}
```

### output ブロック

適用後に表示・他のモジュールへ渡す値を定義します。

```hcl
output "instance_ip" {
  description = "WebサーバーのパブリックIP"
  value       = aws_instance.web.public_ip
}

output "db_endpoint" {
  description = "RDSエンドポイント"
  value       = aws_db_instance.main.endpoint
  sensitive   = true  # terraform outputで非表示
}
```

### locals ブロック

再利用する値や式をローカル変数として定義します。

```hcl
locals {
  project     = "myapp"
  environment = var.environment

  common_tags = {
    Project     = local.project
    Environment = local.environment
    ManagedBy   = "Terraform"
  }

  name_prefix = "${local.project}-${local.environment}"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = merge(local.common_tags, { Name = "${local.name_prefix}-vpc" })
}
```

---

## 3. プロバイダー設定

### バージョン管理ファイル（versions.tf）

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}
```

### AWSプロバイダー設定

```hcl
provider "aws" {
  region = var.region

  # 認証（環境変数 AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY を推奨）
  # access_key = "..."  # 直書き禁止
  # secret_key = "..."  # 直書き禁止

  default_tags {
    tags = {
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}

# 別リージョンのプロバイダーエイリアス
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# CloudFront（us-east-1が必要なACM証明書）で使用
resource "aws_acm_certificate" "main" {
  provider    = aws.us_east_1
  domain_name = "example.com"
}
```

### GCPプロバイダー設定

```hcl
provider "google" {
  project = var.gcp_project_id
  region  = "asia-northeast1"
  zone    = "asia-northeast1-a"

  # 認証: GOOGLE_APPLICATION_CREDENTIALS 環境変数
  # または gcloud auth application-default login
}

provider "google-beta" {
  project = var.gcp_project_id
  region  = "asia-northeast1"
}
```

### Cloudflareプロバイダー設定

```hcl
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  value   = aws_lb.main.dns_name
  type    = "CNAME"
  ttl     = 3600
}
```

---

## 4. State管理

Terraformは実際のインフラ状態を `terraform.tfstate` ファイルに記録します。このファイルが最も重要な管理対象です。

### ローカルStateの問題点

- **チーム共有不可**: 複数人が同時に作業できない
- **GitにCommit禁止**: シークレット情報が含まれる
- **バックアップなし**: ファイル消失でリソース管理不能

### S3 Backend（リモートState）

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "myapp-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"  # State locking

    # 追加のセキュリティ設定
    versioning = true
  }
}
```

**DynamoDBによるState Locking**: 複数人が同時にapplyするのを防ぐ

```hcl
# State管理用リソース（別プロジェクトで事前作成）
resource "aws_s3_bucket" "terraform_state" {
  bucket = "myapp-terraform-state"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_dynamodb_table" "terraform_state_lock" {
  name           = "terraform-state-lock"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

### GCS Backend（GCP）

```hcl
terraform {
  backend "gcs" {
    bucket = "myapp-terraform-state"
    prefix = "prod"
  }
}
```

### State操作コマンド

```bash
# Stateの一覧表示
terraform state list

# 特定リソースの詳細表示
terraform state show aws_instance.web

# リソースをStateから削除（リソース自体は削除しない）
terraform state rm aws_instance.web

# 既存リソースをStateにインポート
terraform import aws_instance.web i-1234567890abcdef0

# Stateを別ファイルに移動（モジュール分割時等）
terraform state mv aws_instance.web module.ec2.aws_instance.web
```

---

## 5. 変数と型システム

### 基本型

```hcl
variable "app_name" {
  type    = string
  default = "myapp"
}

variable "port" {
  type    = number
  default = 8080
}

variable "enable_https" {
  type    = bool
  default = true
}
```

### コレクション型

```hcl
# list型: 同じ型の順序付きリスト
variable "availability_zones" {
  type    = list(string)
  default = ["ap-northeast-1a", "ap-northeast-1c", "ap-northeast-1d"]
}

# map型: キーと値のペア
variable "environment_configs" {
  type = map(number)
  default = {
    dev     = 1
    staging = 2
    prod    = 3
  }
}

# set型: 重複なしのコレクション
variable "allowed_cidr_blocks" {
  type    = set(string)
  default = ["10.0.0.0/8", "172.16.0.0/12"]
}
```

### object型・tuple型

```hcl
variable "database_config" {
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = number
    multi_az       = bool
  })
  default = {
    engine         = "mysql"
    engine_version = "8.0"
    instance_class = "db.t3.medium"
    storage_gb     = 100
    multi_az       = false
  }
}
```

### 変数の渡し方

```bash
# コマンドライン
terraform apply -var="environment=prod" -var="instance_count=3"

# .tfvarsファイル（自動読み込み）
terraform apply -var-file="prod.tfvars"

# 環境変数（TF_VAR_プレフィックス）
export TF_VAR_environment=prod
export TF_VAR_db_password=supersecret
terraform apply
```

```hcl
# prod.tfvars
environment    = "prod"
instance_count = 3
region         = "ap-northeast-1"

database_config = {
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.r6g.large"
  storage_gb     = 500
  multi_az       = true
}
```

### 組み込み関数

```hcl
locals {
  # 文字列操作
  name_upper = upper(var.app_name)           # "MYAPP"
  name_lower = lower(var.app_name)           # "myapp"
  trimmed    = trimspace("  hello  ")        # "hello"
  
  # リスト操作
  first_az   = element(var.availability_zones, 0)
  az_count   = length(var.availability_zones)
  sorted_azs = sort(var.availability_zones)
  
  # マップ操作
  merged_tags = merge(local.common_tags, { Extra = "tag" })
  tag_keys    = keys(local.common_tags)
  
  # 数値操作
  max_instances = max(var.min_instances, 2)
  ceil_value    = ceil(2.3)   # 3
  
  # 型変換
  port_str    = tostring(var.port)   # "8080"
  count_num   = tonumber("10")       # 10
  
  # ファイル読み込み
  user_data   = filebase64("${path.module}/scripts/user-data.sh")
  
  # JSON/YAML
  config_json = jsonencode({
    key   = "value"
    items = [1, 2, 3]
  })
}
```

---

## 6. リソース参照と依存関係

### 暗黙的依存関係

Terraformは参照を解析して自動的に依存関係グラフを構築します。

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id      # vpcへの参照 → 自動依存
  cidr_block = "10.0.1.0/24"
  availability_zone = "ap-northeast-1a"
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id  # IGWへの参照
  }
}
```

### 明示的依存関係（depends_on）

参照がないが順序を保証したい場合:

```hcl
resource "aws_iam_role_policy_attachment" "worker" {
  role       = aws_iam_role.worker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "main"
  node_role_arn   = aws_iam_role.worker.arn
  subnet_ids      = aws_subnet.private[*].id

  # IAMポリシーが適用されてからノードグループを作成
  depends_on = [
    aws_iam_role_policy_attachment.worker,
    aws_iam_role_policy_attachment.cni,
    aws_iam_role_policy_attachment.ecr,
  ]
}
```

### for_each と count

```hcl
# count: シンプルな繰り返し
resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "public-subnet-${count.index + 1}"
  }
}

# for_each: マップやセットによる繰り返し（推奨）
variable "subnets" {
  default = {
    "public-1a"  = { cidr = "10.0.1.0/24", az = "ap-northeast-1a" }
    "public-1c"  = { cidr = "10.0.2.0/24", az = "ap-northeast-1c" }
    "private-1a" = { cidr = "10.0.3.0/24", az = "ap-northeast-1a" }
  }
}

resource "aws_subnet" "subnets" {
  for_each = var.subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = each.key
  }
}

# 参照方法
output "subnet_ids" {
  value = { for k, v in aws_subnet.subnets : k => v.id }
}
```

### dynamic ブロック

```hcl
variable "ingress_rules" {
  default = [
    { port = 80,  protocol = "tcp", cidr = "0.0.0.0/0" },
    { port = 443, protocol = "tcp", cidr = "0.0.0.0/0" },
    { port = 22,  protocol = "tcp", cidr = "10.0.0.0/8" },
  ]
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = [ingress.value.cidr]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

---

## 7. データソース（既存リソース参照）

```hcl
# AWSアカウント情報取得
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
}

# 既存VPCの参照
data "aws_vpc" "existing" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

# 最新AMI取得
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# SSMパラメータストアからシークレット取得
data "aws_ssm_parameter" "db_password" {
  name            = "/myapp/prod/db-password"
  with_decryption = true
}

resource "aws_db_instance" "main" {
  password = data.aws_ssm_parameter.db_password.value
  # ...
}

# IAMポリシードキュメント生成
data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2_role" {
  name               = "ec2-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}
```

---

## 8. モジュール化

モジュールは再利用可能なTerraformコードの単位です。

### ローカルモジュール

```
project/
├── main.tf
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ecs-cluster/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── rds/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
```

```hcl
# modules/vpc/variables.tf
variable "project" {
  type        = string
  description = "プロジェクト名"
}

variable "environment" {
  type        = string
  description = "環境名（dev/staging/prod）"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDRブロック"
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "パブリックサブネットCIDRリスト"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "プライベートサブネットCIDRリスト"
}

variable "availability_zones" {
  type        = list(string)
  description = "使用するAZリスト"
}
```

```hcl
# modules/vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.project}-${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "${var.project}-${var.environment}-igw"
  }
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project}-${var.environment}-public-${count.index + 1}"
    Type = "public"
  }
}

resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project}-${var.environment}-private-${count.index + 1}"
    Type = "private"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project}-${var.environment}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

```hcl
# modules/vpc/outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

```hcl
# main.tf（ルートモジュール）
module "vpc" {
  source = "./modules/vpc"

  project     = local.project
  environment = local.environment

  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]
  availability_zones   = ["ap-northeast-1a", "ap-northeast-1c"]
}

module "ecs" {
  source = "./modules/ecs-cluster"

  project     = local.project
  environment = local.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
}
```

### Terraform Registryのモジュール使用

```hcl
# HashiCorp公式VPCモジュール
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["ap-northeast-1a", "ap-northeast-1c", "ap-northeast-1d"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true  # コスト削減: dev環境向け

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = local.common_tags
}
```

---

## 9. ワークスペース（環境分離）

### ワークスペースとは

Terraformワークスペースを使うと、同一設定から異なる環境のインフラを管理できます。

```bash
# ワークスペース作成・切り替え
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

terraform workspace list
# * dev
#   staging
#   prod

terraform workspace select prod
```

```hcl
# ワークスペースに基づいた設定分岐
locals {
  workspace = terraform.workspace

  config = {
    dev = {
      instance_type = "t3.micro"
      min_capacity  = 1
      max_capacity  = 2
      multi_az      = false
    }
    staging = {
      instance_type = "t3.small"
      min_capacity  = 1
      max_capacity  = 3
      multi_az      = false
    }
    prod = {
      instance_type = "t3.medium"
      min_capacity  = 2
      max_capacity  = 10
      multi_az      = true
    }
  }

  current_config = local.config[local.workspace]
}

resource "aws_db_instance" "main" {
  instance_class = local.current_config.instance_class
  multi_az       = local.current_config.multi_az
}
```

### ディレクトリ分離パターン（推奨）

ワークスペースよりも環境ごとにディレクトリを分ける方が明確です。

```
environments/
├── dev/
│   ├── main.tf          → module "../modules/vpc" を呼ぶ
│   ├── variables.tf
│   └── terraform.tfvars
├── staging/
│   ├── main.tf
│   ├── variables.tf
│   └── terraform.tfvars
└── prod/
    ├── main.tf
    ├── variables.tf
    └── terraform.tfvars
modules/
├── vpc/
├── ecs-cluster/
└── rds/
```

---

## 10. 実践例: AWSでVPC・ECS・RDS構築

### 完全な本番環境構成

```hcl
# environments/prod/main.tf

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "myapp-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = local.common_tags
  }
}

locals {
  project     = "myapp"
  environment = "prod"
  common_tags = {
    Project     = local.project
    Environment = local.environment
    ManagedBy   = "Terraform"
  }
}

# VPCモジュール
module "vpc" {
  source = "../../modules/vpc"

  project              = local.project
  environment          = local.environment
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]
  availability_zones   = ["ap-northeast-1a", "ap-northeast-1c"]
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${local.project}-${local.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnet_ids

  enable_deletion_protection = true
}

resource "aws_lb_target_group" "app" {
  name        = "${local.project}-${local.environment}-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ECSクラスター
resource "aws_ecs_cluster" "main" {
  name = "${local.project}-${local.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ECSタスク定義
resource "aws_ecs_task_definition" "app" {
  family                   = "${local.project}-${local.environment}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com/${local.project}:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV",   value = "production" },
        { name = "PORT",       value = "8080" },
        { name = "DB_HOST",    value = aws_db_instance.main.address },
        { name = "DB_NAME",    value = var.db_name },
      ]

      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = data.aws_ssm_parameter.db_password.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "app"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

# ECSサービス
resource "aws_ecs_service" "app" {
  name                               = "${local.project}-${local.environment}-app"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.app.arn
  desired_count                      = var.desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  health_check_grace_period_seconds  = 60

  network_configuration {
    subnets          = module.vpc.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 20
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# RDS (Aurora MySQL)
resource "aws_db_subnet_group" "main" {
  name       = "${local.project}-${local.environment}"
  subnet_ids = module.vpc.private_subnet_ids
}

resource "aws_rds_cluster" "main" {
  cluster_identifier      = "${local.project}-${local.environment}"
  engine                  = "aurora-mysql"
  engine_version          = "8.0.mysql_aurora.3.04.0"
  database_name           = var.db_name
  master_username         = var.db_username
  master_password         = data.aws_ssm_parameter.db_password.value
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  
  skip_final_snapshot    = false
  final_snapshot_identifier = "${local.project}-${local.environment}-final"
  
  deletion_protection = true
  
  enabled_cloudwatch_logs_exports = ["audit", "error", "slowquery"]
}

resource "aws_rds_cluster_instance" "main" {
  count              = 2
  identifier         = "${local.project}-${local.environment}-${count.index}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.project}/${local.environment}/app"
  retention_in_days = 30
}
```

---

## 11. Terraform Cloud

Terraform Cloud（旧Terraform Enterprise）はHCPが提供するSaaSプラットフォームです。

### 主な機能

- **Remote State**: Stateの安全な管理・共有
- **Remote Execution**: plan/applyをTerraform Cloudで実行
- **Sentinel Policy**: OPA/Sentinelによるポリシー強制
- **Private Registry**: 独自モジュールのプライベート公開
- **Team管理**: 細かいアクセス制御
- **Cost Estimation**: リソースコストの事前見積もり

### Terraform Cloud設定

```hcl
terraform {
  cloud {
    organization = "my-organization"

    workspaces {
      name = "myapp-prod"
    }
  }
}
```

### Sentinel Policy例

```python
# policy/require-tags.sentinel
import "tfplan/v2" as tfplan

required_tags = ["Project", "Environment", "ManagedBy"]

# 全リソースにタグが付いているか確認
main = rule {
  all tfplan.resource_changes as _, rc {
    rc.mode is "managed" and rc.change.actions contains "create" implies
    all required_tags as tag {
      rc.change.after.tags[tag] is not null
    }
  }
}
```

```hcl
# sentinel.hcl
policy "require-tags" {
  source            = "./policy/require-tags.sentinel"
  enforcement_level = "hard-mandatory"
}
```

### Remote Stateの参照

```hcl
# 別ワークスペースのStateを参照
data "terraform_remote_state" "vpc" {
  backend = "remote"

  config = {
    organization = "my-organization"
    workspaces = {
      name = "myapp-prod-vpc"
    }
  }
}

resource "aws_ecs_service" "app" {
  # 別ワークスペースで管理されたVPCのサブネットを参照
  network_configuration {
    subnets = data.terraform_remote_state.vpc.outputs.private_subnet_ids
  }
}
```

---

## 12. GitHub Actions統合

### PR時のplan自動実行

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  push:
    branches: [main]
    paths: ['environments/**', 'modules/**']
  pull_request:
    branches: [main]
    paths: ['environments/**', 'modules/**']

env:
  TF_VERSION: "1.7.0"
  AWS_REGION: "ap-northeast-1"

jobs:
  terraform-check:
    name: Terraform Format & Validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Terraform Format Check
        run: terraform fmt -check -recursive

      - name: Init (validation only)
        run: terraform init -backend=false
        working-directory: environments/prod

      - name: Terraform Validate
        run: terraform validate
        working-directory: environments/prod

  terraform-plan:
    name: Terraform Plan
    runs-on: ubuntu-latest
    needs: terraform-check
    if: github.event_name == 'pull_request'
    environment: prod
    permissions:
      contents: read
      pull-requests: write
      id-token: write  # OIDC認証

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-terraform
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
          terraform_wrapper: false

      - name: Terraform Init
        run: terraform init
        working-directory: environments/prod

      - name: Terraform Plan
        id: plan
        run: |
          terraform plan -no-color -out=tfplan 2>&1 | tee plan_output.txt
          echo "exitcode=${PIPESTATUS[0]}" >> $GITHUB_OUTPUT
        working-directory: environments/prod
        continue-on-error: true

      - name: Comment PR with Plan
        uses: actions/github-script@v7
        env:
          PLAN: ${{ steps.plan.outputs.stdout }}
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('environments/prod/plan_output.txt', 'utf8');
            const maxLength = 65000;
            const truncated = plan.length > maxLength 
              ? plan.substring(0, maxLength) + '\n... (truncated)'
              : plan;
            
            const body = `## Terraform Plan Results
            
            \`\`\`hcl
            ${truncated}
            \`\`\`
            
            *Plan status: ${{ steps.plan.outputs.exitcode == '0' ? 'Success' : 'Failed' }}*`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

      - name: Plan Status Check
        if: steps.plan.outputs.exitcode != '0'
        run: exit 1

  terraform-apply:
    name: Terraform Apply
    runs-on: ubuntu-latest
    needs: [terraform-check]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: prod
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-terraform
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Terraform Init
        run: terraform init
        working-directory: environments/prod

      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: environments/prod
```

### OIDCによるAWS認証（シークレット不要）

```hcl
# GitHub Actions用IAMロール（Terraform管理）
data "aws_iam_policy_document" "github_actions_assume" {
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
      values   = ["repo:myorg/myrepo:*"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "github-actions-terraform"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume.json
}

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]
}
```

---

## 13. セキュリティ

### tfsec: 静的解析ツール

```bash
# インストール
brew install tfsec

# スキャン実行
tfsec .

# 特定ルールを無視
tfsec . --exclude-checks aws-s3-enable-bucket-logging
```

```hcl
# インラインで無視（コメント）
resource "aws_s3_bucket" "logs" {
  bucket = "my-logs-bucket"
  
  #tfsec:ignore:aws-s3-enable-bucket-logging
  # ログバケット自身はアクセスログ不要
}
```

### Checkov: マルチフレームワーク対応

```bash
# インストール
pip install checkov

# Terraformスキャン
checkov -d . --framework terraform

# 特定チェックをスキップ
checkov -d . --skip-check CKV_AWS_20,CKV_AWS_57

# CI/CD向けJUnitレポート出力
checkov -d . --output junitxml --output-file checkov-report.xml
```

### Pre-commitフック

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.5
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_tfsec
      - id: terraform_checkov
        args:
          - "--args=--skip-check CKV_AWS_144"
      - id: terraform_docs
```

### シークレット管理のベストプラクティス

**絶対にやってはいけないこと:**

```hcl
# NG: ハードコード
resource "aws_db_instance" "main" {
  password = "mysecretpassword"  # 絶対禁止
}

# NG: tfvarsにシークレット
# terraform.tfvars → Gitにcommitしてしまう
db_password = "mysecretpassword"
```

**推奨: AWS Secrets Manager / SSMパラメータストア**

```hcl
# SSMパラメータストアからシークレット取得
data "aws_ssm_parameter" "db_password" {
  name            = "/myapp/prod/db-password"
  with_decryption = true
}

resource "aws_db_instance" "main" {
  password = data.aws_ssm_parameter.db_password.value
}

# Secrets Managerから取得
data "aws_secretsmanager_secret_version" "db" {
  secret_id = "myapp/prod/database"
}

locals {
  db_secret = jsondecode(data.aws_secretsmanager_secret_version.db.secret_string)
}

resource "aws_db_instance" "main" {
  username = local.db_secret["username"]
  password = local.db_secret["password"]
}
```

**推奨: Vault by HashiCorp**

```hcl
provider "vault" {
  address = "https://vault.example.com"
  # VAULT_TOKEN 環境変数で認証
}

data "vault_generic_secret" "db" {
  path = "secret/myapp/prod/database"
}

resource "aws_db_instance" "main" {
  password = data.vault_generic_secret.db.data["password"]
}
```

### .gitignore（必須設定）

```gitignore
# .gitignore
# Terraform State（シークレット含む）
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl  # コメント: このファイルはcommitする

# 変数ファイル（シークレット含む可能性）
*.tfvars
!example.tfvars  # サンプルファイルは除外

# プランファイル
*.tfplan
tfplan

# クレデンシャル
*.pem
.aws/
```

---

## よく使うTerraformコマンド

```bash
# 初期化（プロバイダーダウンロード）
terraform init

# フォーマット（自動修正）
terraform fmt -recursive

# 構文・整合性チェック
terraform validate

# 変更プレビュー
terraform plan
terraform plan -out=tfplan            # プランを保存
terraform plan -target=aws_instance.web  # 特定リソースのみ

# 適用
terraform apply                       # 確認あり
terraform apply -auto-approve         # 確認なし（CI/CD向け）
terraform apply tfplan               # 保存したプランを適用

# 削除
terraform destroy
terraform destroy -target=aws_instance.web

# 出力値表示
terraform output
terraform output instance_ip

# グラフ生成（依存関係の可視化）
terraform graph | dot -Tpng > graph.png

# Stateの更新（実際のリソースと同期）
terraform refresh

# インポート
terraform import aws_s3_bucket.main mybucket-name

# モジュールのアップグレード
terraform init -upgrade
```

---

## トラブルシューティング

### よくあるエラーと対処法

**Error: Provider configuration not present**
```bash
# backend変更後は再初期化が必要
terraform init -reconfigure
```

**Error: State lock**
```bash
# 前のapplyが異常終了してLockが残った場合
terraform force-unlock <LOCK_ID>
```

**Error: cycle error (依存関係の循環)**
```bash
# depends_onを見直し、モジュール間の循環参照を解消
# terraform graphで可視化して確認
terraform graph | dot -Tsvg > graph.svg
```

**リソースの再作成を避けたい（lifecycle設定）**
```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  lifecycle {
    create_before_destroy = true   # 新規作成してから削除
    prevent_destroy       = true   # destroyを禁止
    ignore_changes        = [ami]  # AMI変更を無視
  }
}
```

---

## まとめ

Terraformは現代のインフラ管理に欠かせないツールです。本記事で解説した内容を振り返ります:

1. **HCL基礎**: resource・data・variable・output・locals で宣言的にインフラを定義
2. **プロバイダー**: AWS・GCP・Cloudflare等をプロバイダーブロックで設定
3. **State管理**: S3+DynamoDBでチーム共有・ロック機能を実現
4. **変数と型**: 型安全な変数定義でミスを防止
5. **モジュール化**: 再利用可能なコードで DRY 原則を遵守
6. **ワークスペース**: dev/staging/prod を同一コードで管理
7. **実践例**: ECS・RDS・ALBを使った本番環境構成
8. **Terraform Cloud**: リモート実行・Sentinelポリシーで組織統制
9. **GitHub Actions**: plan/applyの自動化でCI/CD統合
10. **セキュリティ**: tfsec・Checkov・OIDC認証でセキュアな運用

Terraformのアウトプット（`terraform output -json`）を活用すると、デプロイ後のリソース情報をJSON形式で取得できます。このJSONを他のツールやスクリプトに渡す際は、[DevToolBox](https://usedevtools.com/) のJSONバリデーター・フォーマッターが役立ちます。Terraform出力のJSONを貼り付けてすぐに構造を確認・整形でき、デバッグ作業が大幅に効率化されます。

コードをGitで管理し、PRベースでインフラ変更をレビューする文化を築くことで、チーム全体のインフラ品質と安全性が大きく向上します。まずは小さなリソースからTerraformを導入し、徐々に範囲を広げていくことをお勧めします。
