---
title: "HashiCorp Nomadで学ぶ軽量コンテナオーケストレーション"
description: "HashiCorp Nomadを使った軽量コンテナオーケストレーションの方法を解説。Kubernetesとの比較、ジョブ定義、サービスディスカバリ、Consulとの連携まで実践的なHCLコード付きで紹介します。"
pubDate: "2026-03-09"
tags: ["DevOps", "インフラ", "container", "cloud"]
heroImage: "../../assets/blog-placeholder-4.jpg"
---

## はじめに

コンテナオーケストレーションといえばKubernetesが第一選択肢として挙がるが、全てのプロジェクトにKubernetesが最適とは限らない。学習コストの高さ、運用の複雑さ、リソースオーバーヘッドの大きさに悩むチームは少なくない。

HashiCorp Nomadは、そうした課題に対する有力な代替手段だ。シンプルなアーキテクチャと単一バイナリでのデプロイ、HCL（HashiCorp Configuration Language）による直感的なジョブ定義が特徴で、小〜中規模のインフラにおいて圧倒的な導入しやすさを誇る。

この記事では、Nomadの基本概念からインストール、ジョブ定義、サービスディスカバリ、デプロイ戦略まで、実践的なコード付きで解説する。

---

## Nomadとは何か

Nomadは、HashiCorpが開発するワークロードオーケストレーターだ。Docker、Podman、Java、バイナリ実行ファイルなど、多様なタスクドライバーに対応しており、コンテナに限らず幅広いワークロードをスケジュール・管理できる。

### Nomadの主要コンポーネント

Nomadのアーキテクチャは以下の3つのコンポーネントで構成される。

| コンポーネント | 役割 |
|---------------|------|
| **Server** | クラスタの制御プレーン。ジョブのスケジューリングと状態管理を担う |
| **Client（Agent）** | 実際にワークロードを実行するノード。Serverからの指示を受けてタスクを起動する |
| **Driver** | タスクの実行エンジン。Docker、exec、Java、Podmanなどが利用可能 |

ServerはRaftプロトコルによる合意形成で高可用性を実現する。本番環境では3台または5台のServerノードを推奨する。

### Nomadの設計思想

Nomadの設計は「一つのことをうまくやる」Unix哲学に基づいている。オーケストレーション機能に特化し、サービスディスカバリはConsul、シークレット管理はVaultという形で、HashiCorpエコシステムの各ツールと連携する構成を想定している。

---

## KubernetesとNomadの比較

Nomadを検討する上で、Kubernetesとの違いを理解しておくことは重要だ。以下に主要な比較項目をまとめる。

| 比較項目 | Kubernetes | Nomad |
|---------|-----------|-------|
| **アーキテクチャ** | 複数コンポーネント（etcd, API Server, Controller Manager, Scheduler, kubelet） | 単一バイナリ（Server/Clientモード） |
| **学習コスト** | 高い（CRD, Operator, RBAC等の概念が多い） | 低い（HCLベースのシンプルな定義） |
| **セットアップ時間** | 数時間〜数日（マネージドサービス利用時は短縮可能） | 数分〜数十分 |
| **対応ワークロード** | コンテナ中心 | コンテナ、VM、バイナリ、Java等 |
| **スケーラビリティ** | 数千ノード | 数万ノード（公式ベンチマーク） |
| **サービスメッシュ** | Istio, Linkerd等 | Consul Connect（組み込み） |
| **シークレット管理** | Kubernetes Secrets | Vault連携 |
| **コミュニティ規模** | 非常に大きい | 中規模だが成長中 |
| **マネージドサービス** | EKS, GKE, AKS等 | HCP Nomad |
| **リソース消費** | 比較的大きい | 軽量 |

### Nomadが適しているケース

以下のようなケースでは、Nomadの採用が有効だ。

- チームが小規模でKubernetesの運用負荷を許容できない
- コンテナ以外のワークロード（バッチ処理、レガシーアプリ）も管理したい
- HashiCorpエコシステム（Consul, Vault, Terraform）を既に利用している
- 段階的にオーケストレーションを導入したい
- オンプレミスとクラウドのハイブリッド環境で統一的に管理したい

### Kubernetesが適しているケース

一方で、以下の場合はKubernetesの方が適している。

- 大規模なマイクロサービスアーキテクチャを構築している
- クラウドベンダーのマネージドサービスを前提にできる
- Kubernetesエコシステムの豊富なツール群を活用したい
- チームにKubernetes運用の経験者がいる

---

## Nomadのインストール

Nomadは単一バイナリで提供されるため、インストールは非常に簡単だ。

### Linux（Ubuntu/Debian）の場合

```bash
# HashiCorpのGPGキーとリポジトリを追加
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list

# インストール
sudo apt-get update && sudo apt-get install nomad

# バージョン確認
nomad version
```

### macOS（Homebrew）の場合

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/nomad

nomad version
```

### 開発モードでの起動

ローカル開発やテストには、開発モード（dev mode）が便利だ。永続化なしのシングルノードクラスタが即座に起動する。

```bash
# 開発モードで起動
sudo nomad agent -dev

# 別ターミナルでノード状態を確認
nomad node status
```

```
ID        DC   Name       Class   Drain  Eligibility  Status
a1b2c3d4  dc1  localhost  <none>  false  eligible     ready
```

---

## ジョブ定義の基本

Nomadのジョブ定義はHCL（HashiCorp Configuration Language）で記述する。ジョブ定義は階層構造を持ち、以下のような構成になっている。

```
Job
 └── Group（タスクグループ）
      └── Task（個別のタスク）
```

### 最初のジョブ定義

Nginxを動かすシンプルなジョブ定義を作成する。

```hcl
# nginx.nomad.hcl
job "nginx-web" {
  datacenters = ["dc1"]
  type        = "service"

  group "web" {
    count = 3

    network {
      port "http" {
        static = 0
        to     = 80
      }
    }

    task "nginx" {
      driver = "docker"

      config {
        image = "nginx:1.27-alpine"
        ports = ["http"]
      }

      resources {
        cpu    = 200
        memory = 128
      }

      service {
        name = "nginx-web"
        port = "http"

        check {
          type     = "http"
          path     = "/"
          interval = "10s"
          timeout  = "2s"
        }
      }
    }
  }
}
```

### ジョブの実行と管理

```bash
# ジョブの実行計画を確認（ドライラン）
nomad job plan nginx.nomad.hcl

# ジョブを実行
nomad job run nginx.nomad.hcl

# ジョブの状態を確認
nomad job status nginx-web

# アロケーション（配置）の一覧
nomad job allocs nginx-web

# 特定のアロケーションのログを確認
nomad alloc logs <alloc-id>

# ジョブの停止
nomad job stop nginx-web
```

---

## ジョブタイプの理解

Nomadには3つのジョブタイプがあり、ワークロードの性質に応じて使い分ける。

### serviceタイプ

長時間稼働するサービスに使用する。Webアプリケーション、APIサーバー、データベースなどが該当する。失敗時には自動的に再スケジュールされる。

```hcl
job "api-server" {
  datacenters = ["dc1"]
  type        = "service"

  group "api" {
    count = 3

    restart {
      attempts = 5
      interval = "30m"
      delay    = "15s"
      mode     = "fail"
    }

    reschedule {
      attempts       = 10
      interval       = "24h"
      delay          = "30s"
      delay_function = "exponential"
      max_delay      = "1h"
      unlimited      = false
    }

    network {
      port "http" {
        to = 8080
      }
    }

    task "api" {
      driver = "docker"

      config {
        image = "myapp/api:v1.2.0"
        ports = ["http"]
      }

      env {
        APP_ENV  = "production"
        LOG_LEVEL = "info"
      }

      resources {
        cpu    = 500
        memory = 256
      }
    }
  }
}
```

### batchタイプ

1回限りまたは定期的なバッチ処理に使用する。タスクが正常終了すれば完了とみなされる。

```hcl
job "data-migration" {
  datacenters = ["dc1"]
  type        = "batch"

  group "migrate" {
    task "run-migration" {
      driver = "docker"

      config {
        image   = "myapp/migrator:v1.0.0"
        command = "/bin/sh"
        args    = ["-c", "python migrate.py --target production"]
      }

      resources {
        cpu    = 1000
        memory = 512
      }
    }
  }
}
```

### 定期実行バッチ（Periodic）

cronライクなスケジュール定義で定期実行するバッチジョブも定義できる。

```hcl
job "nightly-report" {
  datacenters = ["dc1"]
  type        = "batch"

  periodic {
    cron             = "0 2 * * *"
    prohibit_overlap = true
    time_zone        = "Asia/Tokyo"
  }

  group "report" {
    task "generate" {
      driver = "docker"

      config {
        image = "myapp/reporter:v2.1.0"
        args  = ["--format", "pdf", "--output", "/data/reports/"]
      }

      resources {
        cpu    = 500
        memory = 256
      }

      volume_mount {
        volume      = "reports"
        destination = "/data/reports"
      }
    }

    volume "reports" {
      type   = "host"
      source = "reports-volume"
    }
  }
}
```

### systemタイプ

クラスタの全ノード（または条件に合致するノード）で1つずつ実行するデーモン型のジョブに使用する。ログ収集エージェントや監視エージェントの配置に適している。

```hcl
job "log-collector" {
  datacenters = ["dc1"]
  type        = "system"

  group "logging" {
    task "fluentbit" {
      driver = "docker"

      config {
        image        = "fluent/fluent-bit:3.0"
        network_mode = "host"
        volumes      = [
          "/var/log:/var/log:ro",
          "local/fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf"
        ]
      }

      template {
        data = <<-EOF
          [SERVICE]
              Flush        5
              Daemon       Off
              Log_Level    info

          [INPUT]
              Name         tail
              Path         /var/log/nomad/*.log
              Tag          nomad.*

          [OUTPUT]
              Name         forward
              Match        *
              Host         log-aggregator.service.consul
              Port         24224
        EOF

        destination = "local/fluent-bit.conf"
      }

      resources {
        cpu    = 100
        memory = 64
      }
    }
  }
}
```

---

## テンプレート機能とConsul連携

Nomadのtemplate stanzaは、Consul KVストアやVaultからの値をタスク内のファイルに動的に注入する強力な機能だ。consul-templateの構文をそのまま利用できる。

### Consul KVからの設定注入

```hcl
job "webapp" {
  datacenters = ["dc1"]
  type        = "service"

  group "app" {
    count = 2

    network {
      port "http" {
        to = 3000
      }
    }

    task "node-app" {
      driver = "docker"

      config {
        image = "myapp/webapp:v3.0.0"
        ports = ["http"]
      }

      template {
        data = <<-EOF
          DATABASE_URL={{ key "config/webapp/database_url" }}
          REDIS_URL={{ key "config/webapp/redis_url" }}
          {{ range service "postgres" }}
          DB_HOST={{ .Address }}
          DB_PORT={{ .Port }}
          {{ end }}
        EOF

        destination = "secrets/app.env"
        env         = true
        change_mode = "restart"
      }

      resources {
        cpu    = 300
        memory = 256
      }
    }
  }
}
```

### Vault連携によるシークレット管理

```hcl
job "secure-app" {
  datacenters = ["dc1"]
  type        = "service"

  group "app" {
    task "api" {
      driver = "docker"

      config {
        image = "myapp/secure-api:v1.0.0"
      }

      vault {
        policies = ["app-secrets"]
      }

      template {
        data = <<-EOF
          {{ with secret "secret/data/app/database" }}
          DB_USERNAME={{ .Data.data.username }}
          DB_PASSWORD={{ .Data.data.password }}
          {{ end }}
          {{ with secret "secret/data/app/api-keys" }}
          STRIPE_KEY={{ .Data.data.stripe_key }}
          {{ end }}
        EOF

        destination = "secrets/credentials.env"
        env         = true
        change_mode = "restart"
      }

      resources {
        cpu    = 500
        memory = 256
      }
    }
  }
}
```

---

## サービスディスカバリ

Nomadは単体でもシンプルなサービスディスカバリ機能を持つが、Consulと連携することでより強力なサービスディスカバリを実現できる。

### Nomad Native Service Discovery

Nomad 1.3以降、Consul不要のネイティブサービスディスカバリが利用可能になった。

```hcl
job "frontend" {
  datacenters = ["dc1"]
  type        = "service"

  group "web" {
    count = 2

    network {
      port "http" {
        to = 80
      }
    }

    service {
      name     = "frontend"
      provider = "nomad"
      port     = "http"

      check {
        type     = "http"
        path     = "/health"
        interval = "10s"
        timeout  = "2s"
      }
    }

    task "nginx" {
      driver = "docker"

      config {
        image = "myapp/frontend:v2.0.0"
        ports = ["http"]
      }

      template {
        data = <<-EOF
          upstream backend {
            {{ range nomadService "backend-api" }}
            server {{ .Address }}:{{ .Port }};
            {{ end }}
          }

          server {
            listen 80;
            location /api/ {
              proxy_pass http://backend;
            }
          }
        EOF

        destination = "local/nginx.conf"
        change_mode = "signal"
        change_signal = "SIGHUP"
      }

      resources {
        cpu    = 200
        memory = 128
      }
    }
  }
}
```

### Consul連携によるサービスディスカバリ

ConsulをプロバイダーとしたDNSベースのサービスディスカバリを利用する場合は以下のように定義する。

```hcl
service {
  name     = "backend-api"
  provider = "consul"
  port     = "http"
  tags     = ["v2", "production"]

  check {
    type     = "http"
    path     = "/health"
    interval = "10s"
    timeout  = "3s"
  }

  connect {
    sidecar_service {
      proxy {
        upstreams {
          destination_name = "postgres"
          local_bind_port  = 5432
        }
        upstreams {
          destination_name = "redis"
          local_bind_port  = 6379
        }
      }
    }
  }
}
```

この構成では、Consul Connectによるサービスメッシュが有効になり、mTLSによるサービス間通信の暗号化と、Intentionベースのアクセス制御が自動的に適用される。

---

## ネットワーキング

Nomadのネットワーキングは柔軟で、用途に応じた構成が可能だ。

### ポートマッピング

```hcl
group "multi-port" {
  network {
    # 動的ポート割り当て
    port "http" {
      to = 8080
    }
    # 静的ポート割り当て
    port "metrics" {
      static = 9090
      to     = 9090
    }
  }

  task "app" {
    driver = "docker"

    config {
      image = "myapp/server:latest"
      ports = ["http", "metrics"]
    }

    # 環境変数でポート番号を参照
    env {
      HTTP_PORT    = "${NOMAD_PORT_http}"
      METRICS_PORT = "${NOMAD_PORT_metrics}"
      HOST_IP      = "${NOMAD_IP_http}"
    }
  }
}
```

### Consul Connectによるサービスメッシュ

```hcl
group "mesh-app" {
  network {
    mode = "bridge"

    port "http" {
      to = 8080
    }
  }

  service {
    name = "mesh-app"
    port = "8080"

    connect {
      sidecar_service {
        proxy {
          upstreams {
            destination_name = "database"
            local_bind_port  = 5432
          }
        }
      }
    }
  }

  task "app" {
    driver = "docker"

    config {
      image = "myapp/mesh-app:v1.0.0"
    }

    env {
      DB_HOST = "127.0.0.1"
      DB_PORT = "5432"
    }

    resources {
      cpu    = 300
      memory = 256
    }
  }
}
```

bridgeモードを使用すると、各タスクグループに専用のネットワーク名前空間が作成され、Envoyサイドカープロキシを経由した安全な通信が実現する。

---

## オートスケーリング

Nomad Autoscalerを使用すると、メトリクスに基づいたジョブのオートスケーリングが可能になる。

### Autoscalerのインストールと設定

```bash
# Nomad Autoscalerのダウンロード
wget https://releases.hashicorp.com/nomad-autoscaler/0.4.5/nomad-autoscaler_0.4.5_linux_amd64.zip
unzip nomad-autoscaler_0.4.5_linux_amd64.zip
sudo mv nomad-autoscaler /usr/local/bin/
```

### Autoscaler設定ファイル

```hcl
# autoscaler.hcl
nomad {
  address = "http://127.0.0.1:4646"
}

apm "prometheus" {
  driver = "prometheus"
  config = {
    address = "http://prometheus.service.consul:9090"
  }
}

strategy "target-value" {
  driver = "target-value"
}
```

### スケーリングポリシー付きジョブ

```hcl
job "scalable-api" {
  datacenters = ["dc1"]
  type        = "service"

  group "api" {
    count = 2

    scaling {
      enabled = true
      min     = 2
      max     = 10

      policy {
        evaluation_interval = "30s"
        cooldown            = "2m"

        check "cpu_utilization" {
          source = "prometheus"
          query  = "avg(nomad_client_allocs_cpu_total_percent{task='api-server'})"

          strategy "target-value" {
            target = 70
          }
        }

        check "request_rate" {
          source = "prometheus"
          query  = "sum(rate(http_requests_total{job='scalable-api'}[5m]))"

          strategy "target-value" {
            target = 1000
          }
        }
      }
    }

    network {
      port "http" {
        to = 8080
      }
    }

    task "api-server" {
      driver = "docker"

      config {
        image = "myapp/api:v2.0.0"
        ports = ["http"]
      }

      resources {
        cpu    = 500
        memory = 256
      }
    }
  }
}
```

---

## デプロイ戦略

Nomadはupdateスタンザでデプロイ戦略を細かく制御できる。

### ローリングアップデート

```hcl
job "rolling-app" {
  datacenters = ["dc1"]
  type        = "service"

  update {
    max_parallel     = 1
    min_healthy_time = "30s"
    healthy_deadline = "5m"
    auto_revert      = true
    canary           = 0
  }

  group "app" {
    count = 6

    task "web" {
      driver = "docker"

      config {
        image = "myapp/web:v2.1.0"
      }

      resources {
        cpu    = 300
        memory = 256
      }
    }
  }
}
```

この設定では、一度に1つのアロケーションずつ更新し、新しいアロケーションが30秒以上健全な状態を維持してから次に進む。5分以内に健全にならない場合はデプロイが失敗し、`auto_revert`によって自動的にロールバックされる。

### カナリアデプロイ

```hcl
job "canary-app" {
  datacenters = ["dc1"]
  type        = "service"

  update {
    max_parallel     = 1
    min_healthy_time = "30s"
    healthy_deadline = "5m"
    auto_revert      = true
    canary           = 2
    auto_promote     = false
  }

  group "app" {
    count = 6

    task "web" {
      driver = "docker"

      config {
        image = "myapp/web:v3.0.0"
      }

      resources {
        cpu    = 300
        memory = 256
      }
    }
  }
}
```

カナリアデプロイでは、まず2つのカナリアアロケーションが作成される。手動でプロモートするまで残りのアロケーションは更新されない。

```bash
# カナリアの状態を確認
nomad job status canary-app

# 問題がなければプロモート
nomad deployment promote <deployment-id>

# 問題があればロールバック
nomad deployment fail <deployment-id>
```

### Blue/Greenデプロイ

Nomadには組み込みのBlue/Greenデプロイはないが、カナリア数をグループのcountと同数に設定することで実質的なBlue/Greenデプロイを実現できる。

```hcl
update {
  max_parallel     = 6
  canary           = 6
  min_healthy_time = "30s"
  healthy_deadline = "5m"
  auto_revert      = true
  auto_promote     = false
}

group "app" {
  count = 6
  # ...
}
```

この構成では、新バージョンの6インスタンス（Green）が既存の6インスタンス（Blue）と並行して起動する。プロモート後にBlue側が停止される。

---

## マルチリージョン構成

Nomadはマルチリージョン・マルチデータセンターに対応しており、地理的に分散した環境でも統一的な管理が可能だ。

```hcl
job "global-api" {
  datacenters = ["dc1", "dc2"]
  type        = "service"

  multiregion {
    strategy {
      max_parallel = 1
      on_failure   = "fail_all"
    }

    region "asia" {
      count       = 3
      datacenters = ["tokyo-dc1", "osaka-dc1"]
    }

    region "us" {
      count       = 3
      datacenters = ["us-east-1", "us-west-2"]
    }
  }

  group "api" {
    count = 3

    network {
      port "http" {
        to = 8080
      }
    }

    task "server" {
      driver = "docker"

      config {
        image = "myapp/global-api:v1.0.0"
        ports = ["http"]
      }

      resources {
        cpu    = 500
        memory = 512
      }
    }
  }
}
```

---

## 制約とアフィニティ

Nomadでは、ジョブを特定のノードに配置するための制約（constraint）と、配置優先度を指定するアフィニティ（affinity）を定義できる。

```hcl
job "gpu-training" {
  datacenters = ["dc1"]
  type        = "batch"

  # ハード制約: GPUを持つノードにのみ配置
  constraint {
    attribute = "${attr.unique.gpu.model}"
    operator  = "regexp"
    value     = "A100|H100"
  }

  # ソフト制約: メモリ64GB以上のノードを優先
  affinity {
    attribute = "${attr.memory.totalbytes}"
    operator  = ">="
    value     = "68719476736"
    weight    = 80
  }

  group "training" {
    task "train-model" {
      driver = "docker"

      config {
        image = "myapp/ml-trainer:v1.0.0"
      }

      resources {
        cpu    = 4000
        memory = 32768

        device "nvidia/gpu" {
          count = 1
        }
      }
    }
  }
}
```

---

## 本番運用のベストプラクティス

### Nomadサーバー設定（本番用）

```hcl
# /etc/nomad.d/server.hcl
datacenter = "dc1"
data_dir   = "/opt/nomad/data"

server {
  enabled          = true
  bootstrap_expect = 3

  server_join {
    retry_join = [
      "nomad-server-1.internal:4648",
      "nomad-server-2.internal:4648",
      "nomad-server-3.internal:4648"
    ]
  }

  encrypt = "YOUR_GOSSIP_KEY_HERE"
}

tls {
  http = true
  rpc  = true

  ca_file   = "/etc/nomad.d/tls/ca.pem"
  cert_file = "/etc/nomad.d/tls/server.pem"
  key_file  = "/etc/nomad.d/tls/server-key.pem"

  verify_server_hostname = true
}

acl {
  enabled = true
}

telemetry {
  prometheus_metrics         = true
  publish_allocation_metrics = true
  publish_node_metrics       = true
}
```

### ACLポリシーの設定

```hcl
# deploy-policy.hcl
namespace "production" {
  policy = "read"

  capabilities = [
    "submit-job",
    "read-job",
    "list-jobs",
    "read-logs",
    "read-fs"
  ]
}

namespace "staging" {
  policy = "write"
}
```

```bash
# ACLブートストラップ
nomad acl bootstrap

# ポリシーの作成
nomad acl policy apply deploy-policy deploy-policy.hcl

# トークンの作成
nomad acl token create -name="deploy-token" -policy="deploy-policy"
```

### 監視とアラート

```hcl
# Prometheusスクレイプ設定
# prometheus.yml
scrape_configs:
  - job_name: 'nomad'
    consul_sd_configs:
      - server: 'consul.service.consul:8500'
        services: ['nomad-client', 'nomad']
    metrics_path: '/v1/metrics'
    params:
      format: ['prometheus']
    relabel_configs:
      - source_labels: ['__meta_consul_tags']
        regex: '(.*)http(.*)'
        action: keep
```

---

## Terraformとの連携

NomadジョブをTerraformで管理することで、インフラとアプリケーションのデプロイを統一的にコード管理できる。

```hcl
# main.tf
terraform {
  required_providers {
    nomad = {
      source  = "hashicorp/nomad"
      version = "~> 2.0"
    }
  }
}

provider "nomad" {
  address = "https://nomad.example.com:4646"
}

resource "nomad_job" "webapp" {
  jobspec = file("${path.module}/jobs/webapp.nomad.hcl")

  hcl2 {
    enabled = true
    vars = {
      image_tag = var.webapp_version
      replicas  = var.webapp_replicas
    }
  }
}

resource "nomad_namespace" "production" {
  name        = "production"
  description = "Production workloads"
}

variable "webapp_version" {
  type    = string
  default = "v1.0.0"
}

variable "webapp_replicas" {
  type    = number
  default = 3
}
```

---

## まとめ

HashiCorp Nomadは、Kubernetesの複雑さを許容できない、あるいは必要としないチームにとって優れた選択肢だ。単一バイナリでの導入、HCLによる直感的なジョブ定義、コンテナ以外のワークロードへの対応、そしてHashiCorpエコシステムとのシームレスな連携が大きな強みとなる。

本記事で紹介した内容を振り返る。

- **基本概念**: Server/Client/Driverの3コンポーネントアーキテクチャ
- **ジョブタイプ**: service、batch、systemの3種類を用途に応じて使い分ける
- **サービスディスカバリ**: Nomadネイティブまたは Consul連携で実現
- **デプロイ戦略**: ローリング、カナリア、Blue/Greenを標準機能で実現
- **オートスケーリング**: Nomad Autoscalerでメトリクスベースのスケーリング
- **本番運用**: TLS、ACL、Telemetryの設定が重要

まずは開発モードでNomadを起動し、シンプルなジョブ定義から試してみることを推奨する。Kubernetesでは過剰だと感じるプロジェクトにこそ、Nomadの真価が発揮される。
