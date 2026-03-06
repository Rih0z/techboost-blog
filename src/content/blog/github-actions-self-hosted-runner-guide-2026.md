---
title: "GitHub Actions セルフホストランナー構築ガイド2026"
description: "GitHub Actionsセルフホストランナーの構築・運用方法を徹底解説。Linux・macOSでのセットアップからDocker・Kubernetes対応、KEDA自動スケーリング、セキュリティベストプラクティス、VPSコスト比較まで実践コード付きで紹介。"
pubDate: "2026-03-05"
tags: ["GitHub", "GitHub Actions", "DevOps", "Docker", "サーバー"]
---

GitHub Actionsのセルフホストランナーは、自前のマシン上でCI/CDジョブを実行する仕組みです。GitHub提供のランナーでは対応しきれないGPU処理、大容量ビルド、プライベートネットワーク内のデプロイなど、多くの本番ユースケースで不可欠な選択肢となっています。本記事では、セルフホストランナーの導入理由から構築手順、Docker・Kubernetes対応、セキュリティ、コスト最適化まで、2026年時点の最新プラクティスを網羅的に解説します。

## 1. なぜセルフホストランナーが必要なのか

GitHub提供のホストランナー（`ubuntu-latest`、`macos-latest`など）は手軽ですが、以下のようなシナリオでは限界があります。

### 1.1 コスト削減

GitHub-hostedランナーはパブリックリポジトリでは無料ですが、プライベートリポジトリでは従量課金が発生します。

| ランナータイプ | 料金（2026年時点） |
|---|---|
| GitHub-hosted Linux | $0.008/分 |
| GitHub-hosted macOS | $0.08/分 |
| GitHub-hosted Windows | $0.016/分 |
| GitHub-hosted Large Runner (4vCPU) | $0.032/分 |

月間1,000分のLinuxジョブを回す場合、$8/月です。しかし、ビルド時間が長いプロジェクト（ML学習、大規模フロントエンドビルドなど）では月間10,000分を超えることもあり、$80/月以上のコストが発生します。

一方、VPSでセルフホストランナーを運用すれば、固定月額で済みます。

| VPSプラン（ConoHa VPS） | 月額 | スペック |
|---|---|---|
| 1GBプラン | ¥763/月 | 1vCPU / 1GB RAM / 100GB SSD |
| 2GBプラン | ¥1,144/月 | 2vCPU / 2GB RAM / 100GB SSD |
| 4GBプラン | ¥2,189/月 | 4vCPU / 4GB RAM / 100GB SSD |

たとえば、月間20,000分（約333時間）のLinuxジョブをGitHub-hostedで回すと$160（約¥24,000）かかりますが、ConoHa VPS 4GBプランなら¥2,189/月で24時間稼働できます。**月間5,000分以上のCI利用がある場合、セルフホストランナーのほうがコスト効率が良い**ケースが多いです。

### 1.2 GPU・特殊ハードウェアへのアクセス

機械学習のモデル学習やAI推論パイプラインでは、NVIDIA GPUが必須です。GitHub-hostedランナーにはGPUインスタンスが提供されていないため、セルフホストランナーでGPU搭載マシンを使う必要があります。

### 1.3 カスタム環境

- 特定のOS・カーネルバージョン
- プリインストールされた商用ソフトウェア（例：Oracle Database、Xcode特定バージョン）
- 社内ネットワーク内のリソースへのアクセス
- ARM64やRISC-Vなど特殊アーキテクチャ

### 1.4 コンプライアンス・セキュリティ要件

金融・医療・官公庁などの業界では、コードやビルド成果物が社外サーバーに送信されることを禁止するセキュリティポリシーがあります。セルフホストランナーなら、すべての処理をオンプレミスで完結できます。

### 1.5 ビルド速度の向上

セルフホストランナーでは依存関係のキャッシュをローカルディスクに保持できるため、GitHub-hostedランナーのように毎回ゼロからセットアップする必要がありません。大規模プロジェクトでは2〜5倍の高速化が見込めます。

## 2. Linux上でのセルフホストランナー構築

最も一般的なセットアップであるLinux（Ubuntu）上での構築手順を解説します。

### 2.1 前提条件

- Ubuntu 22.04 LTS以降（またはDebian 12以降）
- 2GB以上のRAM（推奨4GB以上）
- GitHubリポジトリまたはOrganizationの管理者権限
- インターネット接続

### 2.2 ランナーのダウンロードと登録

GitHubの管理画面からランナーを追加します。リポジトリの **Settings > Actions > Runners > New self-hosted runner** を開きます。

```bash
# 作業ディレクトリの作成
mkdir -p ~/actions-runner && cd ~/actions-runner

# ランナーパッケージのダウンロード（2026年3月時点の最新版）
curl -o actions-runner-linux-x64-2.321.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz

# SHA256チェックサムの検証
echo "EXPECTED_HASH  actions-runner-linux-x64-2.321.0.tar.gz" | shasum -a 256 -c

# 展開
tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz
```

### 2.3 ランナーの設定

```bash
# ランナーの設定（対話形式）
./config.sh \
  --url https://github.com/YOUR_ORG/YOUR_REPO \
  --token YOUR_REGISTRATION_TOKEN \
  --name "ubuntu-runner-01" \
  --labels "self-hosted,linux,x64,ubuntu-22" \
  --work "_work" \
  --runasservice

# ランナーの起動（フォアグラウンド）
./run.sh
```

**トークンの取得方法**:

```bash
# GitHub APIでトークンを取得する場合
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_PAT" \
  https://api.github.com/repos/YOUR_ORG/YOUR_REPO/actions/runners/registration-token

# レスポンス例
# {"token":"AXXXXXXXXXXXXXXXXX","expires_at":"2026-03-05T12:00:00.000+00:00"}
```

### 2.4 systemdサービスとして登録

プロダクション環境では、ランナーをsystemdサービスとして登録し、自動起動・自動再起動を設定します。

```bash
# サービスのインストール（sudo必要）
sudo ./svc.sh install

# サービスの起動
sudo ./svc.sh start

# ステータス確認
sudo ./svc.sh status

# OS起動時の自動起動を確認
sudo systemctl is-enabled actions.runner.YOUR_ORG-YOUR_REPO.ubuntu-runner-01.service
```

手動でsystemdユニットファイルを作成する場合:

```ini
# /etc/systemd/system/github-runner.service
[Unit]
Description=GitHub Actions Self-hosted Runner
After=network.target

[Service]
ExecStart=/home/runner/actions-runner/run.sh
User=runner
WorkingDirectory=/home/runner/actions-runner
KillMode=process
KillSignal=SIGTERM
TimeoutStopSec=5min
Restart=always
RestartSec=10

# セキュリティ設定
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=/home/runner/actions-runner

[Install]
WantedBy=multi-user.target
```

```bash
# ユニットファイルの反映と起動
sudo systemctl daemon-reload
sudo systemctl enable github-runner
sudo systemctl start github-runner

# ログの確認
journalctl -u github-runner -f
```

### 2.5 依存関係のインストール

ビルドに必要なツールをあらかじめインストールしておきます。

```bash
#!/bin/bash
# setup-runner-deps.sh - ランナー依存関係のセットアップスクリプト

set -euo pipefail

echo "=== GitHub Actions Self-hosted Runner 依存関係セットアップ ==="

# 基本ツール
sudo apt-get update && sudo apt-get install -y \
  curl wget git jq unzip zip \
  build-essential \
  ca-certificates gnupg lsb-release

# Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update && sudo apt-get install -y \
  docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Node.js（fnm経由）
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 22
fnm use 22

# Python
sudo apt-get install -y python3 python3-pip python3-venv

# runnerユーザーをdockerグループに追加
sudo usermod -aG docker runner

echo "=== セットアップ完了 ==="
```

## 3. macOS上でのセルフホストランナー構築

iOSアプリのビルドやXcodeを使ったテストでは、macOSランナーが必要です。

### 3.1 macOSランナーの設定

```bash
# macOS用ランナーパッケージのダウンロード
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-osx-arm64-2.321.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-osx-arm64-2.321.0.tar.gz

tar xzf ./actions-runner-osx-arm64-2.321.0.tar.gz

# 設定
./config.sh \
  --url https://github.com/YOUR_ORG/YOUR_REPO \
  --token YOUR_TOKEN \
  --name "macos-runner-01" \
  --labels "self-hosted,macos,arm64,xcode-16"
```

### 3.2 launchdによる自動起動

macOSではsystemdの代わりにlaunchdを使います。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.github.actions-runner</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/runner/actions-runner/run.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/runner/actions-runner</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/runner/actions-runner/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/runner/actions-runner/logs/stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
```

```bash
# plistファイルの配置と読み込み
cp com.github.actions-runner.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.github.actions-runner.plist

# 状態確認
launchctl list | grep actions-runner
```

### 3.3 iOSビルド用ワークフロー例

```yaml
name: iOS Build & Test
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-ios:
    runs-on: [self-hosted, macos, arm64, xcode-16]
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - name: Xcode バージョン確認
        run: xcodebuild -version

      - name: CocoaPods インストール
        run: |
          cd ios
          pod install --repo-update

      - name: ビルド
        run: |
          xcodebuild \
            -workspace ios/MyApp.xcworkspace \
            -scheme MyApp \
            -destination 'platform=iOS Simulator,name=iPhone 16,OS=18.0' \
            -configuration Debug \
            build

      - name: テスト実行
        run: |
          xcodebuild \
            -workspace ios/MyApp.xcworkspace \
            -scheme MyApp \
            -destination 'platform=iOS Simulator,name=iPhone 16,OS=18.0' \
            test

      - name: テスト結果のアップロード
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: ios/build/reports/
```

## 4. Docker ベースのセルフホストランナー

Dockerを使えば、ランナー環境を完全にコンテナ化でき、再現性とセキュリティが大幅に向上します。

### 4.1 カスタムランナーDockerイメージ

```dockerfile
# Dockerfile.github-runner
FROM ubuntu:22.04

# 環境変数
ENV RUNNER_VERSION=2.321.0
ENV DEBIAN_FRONTEND=noninteractive

# 基本パッケージのインストール
RUN apt-get update && apt-get install -y \
    curl wget git jq unzip zip \
    build-essential libssl-dev \
    ca-certificates gnupg lsb-release \
    sudo software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Docker CLIのインストール（Docker-in-Docker用）
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
       gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) \
       signed-by=/etc/apt/keyrings/docker.gpg] \
       https://download.docker.com/linux/ubuntu jammy stable" | \
       tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ランナーユーザーの作成
RUN useradd -m -s /bin/bash runner \
    && echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# ランナーのダウンロードとインストール
WORKDIR /home/runner/actions-runner
RUN curl -o actions-runner.tar.gz -L \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" \
    && tar xzf actions-runner.tar.gz \
    && rm actions-runner.tar.gz \
    && ./bin/installdependencies.sh \
    && chown -R runner:runner /home/runner

# エントリポイントスクリプト
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER runner
ENTRYPOINT ["/entrypoint.sh"]
```

```bash
#!/bin/bash
# entrypoint.sh - Dockerランナーのエントリポイント
set -euo pipefail

RUNNER_NAME=${RUNNER_NAME:-"docker-runner-$(hostname)"}
RUNNER_LABELS=${RUNNER_LABELS:-"self-hosted,linux,x64,docker"}
RUNNER_WORKDIR=${RUNNER_WORKDIR:-"_work"}

echo "=== GitHub Actions Runner 起動 ==="
echo "名前: ${RUNNER_NAME}"
echo "ラベル: ${RUNNER_LABELS}"
echo "リポジトリ: ${GITHUB_REPOSITORY}"

# 登録トークンの取得
if [ -z "${RUNNER_TOKEN:-}" ]; then
  echo "RUNNER_TOKEN が設定されていません"
  exit 1
fi

# ランナーの設定
./config.sh \
  --url "https://github.com/${GITHUB_REPOSITORY}" \
  --token "${RUNNER_TOKEN}" \
  --name "${RUNNER_NAME}" \
  --labels "${RUNNER_LABELS}" \
  --work "${RUNNER_WORKDIR}" \
  --unattended \
  --ephemeral \
  --replace

# クリーンアップ処理
cleanup() {
  echo "=== ランナーの登録解除 ==="
  ./config.sh remove --token "${RUNNER_TOKEN}" || true
}
trap cleanup EXIT SIGTERM SIGINT

# ランナーの実行
./run.sh
```

### 4.2 Docker Compose によるランナー管理

```yaml
# docker-compose.yml
services:
  github-runner-1:
    build:
      context: .
      dockerfile: Dockerfile.github-runner
    container_name: github-runner-1
    environment:
      - GITHUB_REPOSITORY=your-org/your-repo
      - RUNNER_TOKEN=${RUNNER_TOKEN}
      - RUNNER_NAME=docker-runner-1
      - RUNNER_LABELS=self-hosted,linux,x64,docker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - runner-1-work:/home/runner/actions-runner/_work
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  github-runner-2:
    build:
      context: .
      dockerfile: Dockerfile.github-runner
    container_name: github-runner-2
    environment:
      - GITHUB_REPOSITORY=your-org/your-repo
      - RUNNER_TOKEN=${RUNNER_TOKEN}
      - RUNNER_NAME=docker-runner-2
      - RUNNER_LABELS=self-hosted,linux,x64,docker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - runner-2-work:/home/runner/actions-runner/_work
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

volumes:
  runner-1-work:
  runner-2-work:
```

```bash
# ランナーの起動
docker compose up -d

# スケール（ランナー数を増やす）
docker compose up -d --scale github-runner-1=3

# ログの確認
docker compose logs -f github-runner-1
```

## 5. Kubernetes + actions-runner-controller（ARC）

Kubernetesクラスタ上でセルフホストランナーを動的にスケーリングするには、**actions-runner-controller（ARC）** が最適です。

### 5.1 ARCのアーキテクチャ

ARCは以下のコンポーネントで構成されています。

1. **Controller Manager**: ランナーのライフサイクルを管理するKubernetesコントローラー
2. **Runner Pod**: 実際のGitHub Actionsジョブを実行するPod
3. **Listener**: GitHubのWebhookを受信し、ジョブキューを監視するコンポーネント

### 5.2 Helmによるインストール

```bash
# Helm リポジトリの追加
helm repo add actions-runner-controller \
  https://actions-runner-controller.github.io/actions-runner-controller
helm repo update

# Namespace の作成
kubectl create namespace actions-runner-system

# GitHub App の認証情報をSecretとして作成
kubectl create secret generic controller-manager \
  -n actions-runner-system \
  --from-literal=github_app_id=YOUR_APP_ID \
  --from-literal=github_app_installation_id=YOUR_INSTALLATION_ID \
  --from-file=github_app_private_key=github-app-private-key.pem

# ARC のインストール
helm install actions-runner-controller \
  actions-runner-controller/actions-runner-controller \
  --namespace actions-runner-system \
  --set syncPeriod=1m \
  --set authSecret.create=false \
  --set authSecret.name=controller-manager
```

### 5.3 RunnerDeploymentの定義

```yaml
# runner-deployment.yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: self-hosted-runners
  namespace: actions-runner-system
spec:
  replicas: 2
  template:
    spec:
      repository: your-org/your-repo
      labels:
        - self-hosted
        - linux
        - x64
        - k8s
      ephemeral: true
      dockerEnabled: true
      dockerVolumeMounts:
        - mountPath: /var/run/docker.sock
          name: docker-sock
      volumes:
        - name: docker-sock
          hostPath:
            path: /var/run/docker.sock
      resources:
        limits:
          cpu: "2"
          memory: "4Gi"
        requests:
          cpu: "500m"
          memory: "1Gi"
```

### 5.4 Horizontal Runner Autoscaler

ジョブキューの長さに応じてランナーを自動スケールします。

```yaml
# runner-autoscaler.yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: runner-autoscaler
  namespace: actions-runner-system
spec:
  scaleTargetRef:
    kind: RunnerDeployment
    name: self-hosted-runners
  minReplicas: 1
  maxReplicas: 10
  scaleDownDelaySecondsAfterScaleOut: 300
  metrics:
    - type: TotalNumberOfQueuedAndInProgressWorkflowRuns
      repositoryNames:
        - your-org/your-repo
  scaleUpTriggers:
    - githubEvent:
        workflowJob: {}
      duration: "30m"
```

```bash
# デプロイ
kubectl apply -f runner-deployment.yaml
kubectl apply -f runner-autoscaler.yaml

# ランナーの状態確認
kubectl get runners -n actions-runner-system
kubectl get pods -n actions-runner-system -w
```

## 6. KEDAによるイベント駆動オートスケーリング

**KEDA（Kubernetes Event-Driven Autoscaling）** を使うと、より細かいスケーリング制御が可能です。

### 6.1 KEDAのインストール

```bash
# KEDA のインストール
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

helm install keda kedacore/keda \
  --namespace keda \
  --create-namespace
```

### 6.2 KEDAによるランナーのスケーリング

```yaml
# keda-scaled-runner.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: github-runner-scaler
  namespace: actions-runner-system
spec:
  scaleTargetRef:
    name: self-hosted-runners
  pollingInterval: 15
  cooldownPeriod: 120
  minReplicaCount: 0    # ジョブがないときは0にスケールダウン
  maxReplicaCount: 20
  triggers:
    - type: github-runner
      metadata:
        owner: "your-org"
        repos: "your-repo"
        runnerScope: "repo"
        targetWorkflowQueueLength: "1"
      authenticationRef:
        name: github-trigger-auth
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: github-trigger-auth
  namespace: actions-runner-system
spec:
  secretTargetRef:
    - parameter: personalAccessToken
      name: github-pat-secret
      key: pat
---
apiVersion: v1
kind: Secret
metadata:
  name: github-pat-secret
  namespace: actions-runner-system
type: Opaque
data:
  pat: <BASE64_ENCODED_PAT>
```

### 6.3 ゼロスケーリングの活用

KEDAの最大の利点は**ゼロスケーリング**です。CIジョブがキューに入っていないときはランナーPodを0にし、ジョブが来たら自動的にスケールアップします。これにより、アイドル時のリソース消費をゼロにできます。

```yaml
# ゼロスケーリング + 高速スケールアップの設定
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: zero-scale-runner
spec:
  scaleTargetRef:
    name: self-hosted-runners
  pollingInterval: 10          # 10秒間隔でチェック
  cooldownPeriod: 60           # 最後のジョブ完了後60秒でスケールダウン
  minReplicaCount: 0           # 0までスケールダウン可能
  maxReplicaCount: 15
  advanced:
    restoreToOriginalReplicaCount: false
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 0    # 即座にスケールアップ
          policies:
            - type: Pods
              value: 5
              periodSeconds: 15
        scaleDown:
          stabilizationWindowSeconds: 60
          policies:
            - type: Pods
              value: 2
              periodSeconds: 30
  triggers:
    - type: github-runner
      metadata:
        owner: "your-org"
        repos: "your-repo"
        runnerScope: "repo"
        targetWorkflowQueueLength: "1"
      authenticationRef:
        name: github-trigger-auth
```

## 7. セキュリティベストプラクティス

セルフホストランナーは強力ですが、セキュリティリスクも伴います。以下のベストプラクティスを必ず実践してください。

### 7.1 エフェメラルランナーの使用

**最も重要なセキュリティ対策**はエフェメラルランナーの使用です。エフェメラルランナーは1つのジョブを実行したら自動的に登録解除・破棄されるため、前のジョブの残留データが次のジョブに漏れるリスクがありません。

```bash
# エフェメラルモードでの設定
./config.sh \
  --url https://github.com/YOUR_ORG/YOUR_REPO \
  --token YOUR_TOKEN \
  --ephemeral
```

ワークフロー側での指定:

```yaml
jobs:
  secure-build:
    runs-on: [self-hosted, linux, ephemeral]
    steps:
      - uses: actions/checkout@v4
      - run: echo "このランナーはジョブ完了後に破棄されます"
```

### 7.2 ネットワーク分離

```bash
# iptables によるネットワーク制限例
# ランナーからのアウトバウンド通信を制限

# GitHub APIへのアクセスのみ許可
iptables -A OUTPUT -p tcp -d api.github.com --dport 443 -j ACCEPT
iptables -A OUTPUT -p tcp -d github.com --dport 443 -j ACCEPT
iptables -A OUTPUT -p tcp -d codeload.github.com --dport 443 -j ACCEPT
iptables -A OUTPUT -p tcp -d objects.githubusercontent.com --dport 443 -j ACCEPT
iptables -A OUTPUT -p tcp -d ghcr.io --dport 443 -j ACCEPT

# DNS
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# npm/pip等のパッケージレジストリ
iptables -A OUTPUT -p tcp -d registry.npmjs.org --dport 443 -j ACCEPT
iptables -A OUTPUT -p tcp -d pypi.org --dport 443 -j ACCEPT

# Docker Hub
iptables -A OUTPUT -p tcp -d registry-1.docker.io --dport 443 -j ACCEPT
iptables -A OUTPUT -p tcp -d auth.docker.io --dport 443 -j ACCEPT

# その他のアウトバウンドをブロック
iptables -A OUTPUT -p tcp --dport 443 -j DROP
iptables -A OUTPUT -p tcp --dport 80 -j DROP
```

Kubernetes環境では、NetworkPolicyを使います。

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: runner-network-policy
  namespace: actions-runner-system
spec:
  podSelector:
    matchLabels:
      app: github-runner
  policyTypes:
    - Egress
    - Ingress
  ingress: []  # インバウンドは全て拒否
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 53
        - protocol: UDP
          port: 53
```

### 7.3 パブリックリポジトリでの注意点

パブリックリポジトリでセルフホストランナーを使う場合は、**フォークからのプルリクエストに対するワークフロー実行を無効化**してください。悪意のあるフォークがあなたのランナー上で任意のコードを実行できてしまいます。

```yaml
# パブリックリポジトリでの安全な設定
name: CI
on:
  push:
    branches: [main]
  pull_request:
    # フォークからのPRでは GitHub-hosted ランナーを使う
    types: [opened, synchronize]

jobs:
  test-trusted:
    # メインブランチへのプッシュのみセルフホストランナーを使用
    if: github.event_name == 'push'
    runs-on: [self-hosted, linux]
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  test-untrusted:
    # PRはGitHub-hostedランナーで実行
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
```

### 7.4 専用ユーザーによる実行

ランナーはroot以外の専用ユーザーで実行してください。

```bash
# 専用ユーザーの作成
sudo useradd -m -s /bin/bash -G docker runner

# 最小限のsudo権限（必要な場合のみ）
echo "runner ALL=(ALL) NOPASSWD: /usr/bin/apt-get, /usr/bin/snap" | \
  sudo tee /etc/sudoers.d/runner

# ランナーディレクトリの権限設定
sudo chown -R runner:runner /home/runner/actions-runner
```

### 7.5 シークレットの安全な管理

```yaml
# セルフホストランナー上でのシークレット管理例
jobs:
  deploy:
    runs-on: [self-hosted, linux]
    steps:
      - uses: actions/checkout@v4

      # GitHub Secretsからの読み取り（推奨）
      - name: デプロイ
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          # シークレットはファイルに書き出さない
          echo "::add-mask::${DEPLOY_KEY}"
          ./deploy.sh

      # ジョブ完了後のクリーンアップ
      - name: クリーンアップ
        if: always()
        run: |
          # 一時ファイルの削除
          rm -rf /tmp/build-*
          # Docker イメージのクリーンアップ
          docker system prune -f
```

## 8. コスト比較の詳細分析

セルフホストランナーの導入可否を判断するため、具体的なコストシナリオを比較します。

### 8.1 小規模プロジェクト（月間500分）

| 項目 | GitHub-hosted | セルフホスト（ConoHa 1GB） |
|---|---|---|
| 月間CI時間 | 500分 | 500分 |
| 月額コスト | $4（約¥600） | ¥763/月 |
| 年間コスト | $48（約¥7,200） | ¥9,156/年 |
| **判定** | **GitHub-hosted有利** | |

### 8.2 中規模プロジェクト（月間5,000分）

| 項目 | GitHub-hosted | セルフホスト（ConoHa 2GB） |
|---|---|---|
| 月間CI時間 | 5,000分 | 5,000分 |
| 月額コスト | $40（約¥6,000） | ¥1,144/月 |
| 年間コスト | $480（約¥72,000） | ¥13,728/年 |
| **判定** | | **セルフホスト有利（5倍以上お得）** |

### 8.3 大規模プロジェクト（月間30,000分）

| 項目 | GitHub-hosted | セルフホスト（ConoHa 4GB x2台） |
|---|---|---|
| 月間CI時間 | 30,000分 | 30,000分 |
| 月額コスト | $240（約¥36,000） | ¥4,378/月（2台分） |
| 年間コスト | $2,880（約¥432,000） | ¥52,536/年 |
| **判定** | | **セルフホスト有利（8倍以上お得）** |

### 8.4 損益分岐点

計算してみると、**月間約1,600分（約27時間）のLinux CI利用**がセルフホストランナーへの移行ポイントです。

```
GitHub-hosted: 1,600分 × $0.008 = $12.80 ≈ ¥1,920/月
ConoHa 1GB VPS: ¥763/月

→ 月間1,600分を超えるなら、セルフホストが有利
```

ただし、**管理コスト**（セットアップ、メンテナンス、障害対応）も考慮する必要があります。自動化スクリプトで管理コストを最小限に抑えることが重要です。

### 8.5 macOSランナーのコスト比較

macOSランナーはGitHub-hostedの場合、Linuxの10倍の料金（$0.08/分）がかかります。

| シナリオ | GitHub-hosted macOS | Mac mini セルフホスト |
|---|---|---|
| 月間1,000分 | $80（約¥12,000） | Mac mini M4 ¥94,800（一括） |
| 月間5,000分 | $400（約¥60,000） | 同上 |
| **8ヶ月で元が取れる** | 年間$960 | 初期投資のみ |

iOSアプリの開発チームなら、Mac miniのセルフホストランナーは非常に費用対効果が高い選択です。

## 9. モニタリングとメンテナンス

### 9.1 Prometheusによるメトリクス収集

```yaml
# prometheus-runner-exporter.yaml
# GitHub Actions Runner Exporter のデプロイ
apiVersion: apps/v1
kind: Deployment
metadata:
  name: github-runner-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: github-runner-exporter
  template:
    metadata:
      labels:
        app: github-runner-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9999"
    spec:
      containers:
        - name: exporter
          image: ghcr.io/github/actions-runner-controller-metrics:latest
          ports:
            - containerPort: 9999
          env:
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: github-pat-secret
                  key: pat
```

### 9.2 Grafanaダッシュボード用クエリ

```promql
# アクティブなランナー数
count(github_runner_status{status="online"})

# ジョブキューの長さ
github_actions_workflow_queue_length{repository="your-org/your-repo"}

# ランナーのCPU使用率
rate(container_cpu_usage_seconds_total{namespace="actions-runner-system"}[5m])

# ランナーのメモリ使用率
container_memory_working_set_bytes{namespace="actions-runner-system"}
  / container_spec_memory_limit_bytes{namespace="actions-runner-system"}
  * 100

# ジョブの平均実行時間
avg(github_actions_job_duration_seconds{runner_type="self-hosted"})
```

### 9.3 ヘルスチェックスクリプト

```bash
#!/bin/bash
# runner-health-check.sh - ランナーのヘルスチェック

set -euo pipefail

RUNNER_DIR="/home/runner/actions-runner"
ALERT_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
HOSTNAME=$(hostname)

check_runner_process() {
  if pgrep -f "Runner.Listener" > /dev/null; then
    echo "[OK] Runner.Listener プロセスは稼働中"
    return 0
  else
    echo "[ERROR] Runner.Listener プロセスが停止しています"
    return 1
  fi
}

check_disk_space() {
  local usage
  usage=$(df -h "${RUNNER_DIR}" | awk 'NR==2 {print $5}' | sed 's/%//')
  if [ "$usage" -lt 80 ]; then
    echo "[OK] ディスク使用率: ${usage}%"
    return 0
  elif [ "$usage" -lt 90 ]; then
    echo "[WARN] ディスク使用率が高い: ${usage}%"
    return 0
  else
    echo "[ERROR] ディスク容量不足: ${usage}%"
    return 1
  fi
}

check_docker() {
  if docker info > /dev/null 2>&1; then
    local images_size
    images_size=$(docker system df --format '{{.Size}}' | head -1)
    echo "[OK] Docker稼働中 (イメージサイズ: ${images_size})"
    return 0
  else
    echo "[ERROR] Dockerデーモンが応答しません"
    return 1
  fi
}

cleanup_old_work_dirs() {
  echo "=== 古いワークディレクトリのクリーンアップ ==="
  find "${RUNNER_DIR}/_work" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

  # Docker の未使用リソースをクリーンアップ
  docker system prune -f --volumes --filter "until=168h" 2>/dev/null || true
}

send_alert() {
  local message="$1"
  if [ -n "${ALERT_WEBHOOK}" ]; then
    curl -sS -X POST "${ALERT_WEBHOOK}" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"[${HOSTNAME}] ${message}\"}" > /dev/null
  fi
}

# メイン処理
echo "=== GitHub Actions Runner ヘルスチェック ($(date)) ==="

errors=0

check_runner_process || { errors=$((errors + 1)); send_alert "Runner.Listener プロセスが停止"; }
check_disk_space || { errors=$((errors + 1)); send_alert "ディスク容量不足"; }
check_docker || { errors=$((errors + 1)); send_alert "Dockerデーモン異常"; }

# 週次クリーンアップ（日曜深夜に実行）
if [ "$(date +%u)" -eq 7 ] && [ "$(date +%H)" -eq 3 ]; then
  cleanup_old_work_dirs
fi

if [ "$errors" -eq 0 ]; then
  echo "=== 全チェック正常 ==="
  exit 0
else
  echo "=== ${errors}件のエラーを検出 ==="
  exit 1
fi
```

```bash
# cronで定期実行
# crontab -e
# 15分ごとにヘルスチェック
*/15 * * * * /home/runner/runner-health-check.sh >> /var/log/runner-health.log 2>&1
```

### 9.4 自動アップデートスクリプト

```bash
#!/bin/bash
# update-runner.sh - ランナーの自動アップデート
set -euo pipefail

RUNNER_DIR="/home/runner/actions-runner"
GITHUB_API="https://api.github.com"

echo "=== ランナーバージョンチェック ==="

# 現在のバージョン
CURRENT_VERSION=$("${RUNNER_DIR}/config.sh" --version 2>/dev/null || echo "unknown")
echo "現在のバージョン: ${CURRENT_VERSION}"

# 最新バージョンの取得
LATEST_VERSION=$(curl -sS "${GITHUB_API}/repos/actions/runner/releases/latest" | \
  jq -r '.tag_name' | sed 's/^v//')
echo "最新バージョン: ${LATEST_VERSION}"

if [ "${CURRENT_VERSION}" = "${LATEST_VERSION}" ]; then
  echo "最新バージョンです。アップデート不要。"
  exit 0
fi

echo "=== アップデートを実行: ${CURRENT_VERSION} → ${LATEST_VERSION} ==="

# ランナーの停止
sudo systemctl stop github-runner

# バックアップ
cp -r "${RUNNER_DIR}" "${RUNNER_DIR}.backup.$(date +%Y%m%d)"

# 新バージョンのダウンロード
cd /tmp
curl -o actions-runner.tar.gz -L \
  "https://github.com/actions/runner/releases/download/v${LATEST_VERSION}/actions-runner-linux-x64-${LATEST_VERSION}.tar.gz"

# 展開（設定ファイルは上書きしない）
cd "${RUNNER_DIR}"
tar xzf /tmp/actions-runner.tar.gz --skip-old-files

# 依存関係のインストール
sudo ./bin/installdependencies.sh

# ランナーの再起動
sudo systemctl start github-runner

echo "=== アップデート完了: v${LATEST_VERSION} ==="

# クリーンアップ
rm -f /tmp/actions-runner.tar.gz
```

## 10. 実践的なワークフロー例

### 10.1 ML/AIモデル学習パイプライン

```yaml
name: ML Training Pipeline
on:
  push:
    paths:
      - 'models/**'
      - 'training/**'
  workflow_dispatch:
    inputs:
      model_name:
        description: '学習するモデル名'
        required: true
        default: 'text-classifier-v2'
      epochs:
        description: 'エポック数'
        required: true
        default: '50'

jobs:
  prepare-data:
    runs-on: [self-hosted, linux, x64]
    outputs:
      dataset-hash: ${{ steps.hash.outputs.hash }}
    steps:
      - uses: actions/checkout@v4

      - name: データセットの準備
        run: |
          python3 training/prepare_dataset.py \
            --input data/raw/ \
            --output data/processed/

      - name: データセットハッシュの計算
        id: hash
        run: |
          HASH=$(find data/processed -type f -exec sha256sum {} + | sort | sha256sum | cut -d' ' -f1)
          echo "hash=${HASH}" >> "$GITHUB_OUTPUT"

      - name: データセットのキャッシュ
        uses: actions/cache@v4
        with:
          path: data/processed
          key: dataset-${{ steps.hash.outputs.hash }}

  train:
    needs: prepare-data
    runs-on: [self-hosted, linux, gpu, cuda-12]
    timeout-minutes: 360
    steps:
      - uses: actions/checkout@v4

      - name: GPU情報の表示
        run: nvidia-smi

      - name: Python環境のセットアップ
        run: |
          python3 -m venv .venv
          source .venv/bin/activate
          pip install -r requirements-training.txt

      - name: データセットの復元
        uses: actions/cache@v4
        with:
          path: data/processed
          key: dataset-${{ needs.prepare-data.outputs.dataset-hash }}

      - name: モデルの学習
        env:
          WANDB_API_KEY: ${{ secrets.WANDB_API_KEY }}
          MODEL_NAME: ${{ github.event.inputs.model_name || 'text-classifier-v2' }}
          EPOCHS: ${{ github.event.inputs.epochs || '50' }}
        run: |
          source .venv/bin/activate
          python3 training/train.py \
            --model "${MODEL_NAME}" \
            --epochs "${EPOCHS}" \
            --data data/processed/ \
            --output models/output/ \
            --wandb-project my-ml-project

      - name: モデルの評価
        run: |
          source .venv/bin/activate
          python3 training/evaluate.py \
            --model models/output/latest/ \
            --test-data data/processed/test/

      - name: 学習済みモデルのアップロード
        uses: actions/upload-artifact@v4
        with:
          name: trained-model-${{ github.sha }}
          path: models/output/latest/
          retention-days: 30
```

### 10.2 大規模フロントエンドビルド

```yaml
name: Heavy Frontend Build
on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  build-and-test:
    runs-on: [self-hosted, linux, x64]
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4

      - name: Node.js ${{ matrix.node-version }} セットアップ
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      # セルフホストランナーならではのキャッシュ戦略
      # ローカルディスクに永続キャッシュを保持
      - name: ローカルキャッシュの復元
        run: |
          CACHE_DIR="/opt/cache/npm/${GITHUB_REPOSITORY}"
          if [ -d "${CACHE_DIR}/node_modules" ]; then
            echo "ローカルキャッシュを復元中..."
            cp -al "${CACHE_DIR}/node_modules" ./node_modules || true
          fi

      - name: 依存関係のインストール
        run: npm ci

      - name: ローカルキャッシュの更新
        run: |
          CACHE_DIR="/opt/cache/npm/${GITHUB_REPOSITORY}"
          mkdir -p "${CACHE_DIR}"
          rm -rf "${CACHE_DIR}/node_modules"
          cp -al ./node_modules "${CACHE_DIR}/node_modules"

      - name: Lint
        run: npm run lint

      - name: 型チェック
        run: npm run type-check

      - name: ユニットテスト
        run: npm run test:unit -- --coverage

      - name: ビルド
        run: npm run build
        env:
          NODE_OPTIONS: "--max-old-space-size=4096"

      - name: E2Eテスト
        run: npm run test:e2e

      - name: バンドルサイズの分析
        run: |
          npm run analyze -- --json > bundle-stats.json
          echo "## バンドルサイズ" >> $GITHUB_STEP_SUMMARY
          node scripts/report-bundle-size.js bundle-stats.json >> $GITHUB_STEP_SUMMARY

      - name: カバレッジレポート
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-node${{ matrix.node-version }}
          path: coverage/
```

### 10.3 マルチプラットフォームDockerビルド

```yaml
name: Multi-platform Docker Build
on:
  push:
    tags: ['v*']

jobs:
  build-push:
    runs-on: [self-hosted, linux, x64]
    steps:
      - uses: actions/checkout@v4

      - name: Docker Buildx セットアップ
        uses: docker/setup-buildx-action@v3
        with:
          driver-opts: |
            image=moby/buildkit:latest
            network=host

      - name: QEMU セットアップ（ARM64クロスビルド用）
        uses: docker/setup-qemu-action@v3

      - name: Container Registry ログイン
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Docker メタデータ
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: ビルド＆プッシュ
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=local,src=/opt/cache/docker/buildx
          cache-to: type=local,dest=/opt/cache/docker/buildx,mode=max

      - name: イメージの脆弱性スキャン
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/${{ github.repository }}:${{ steps.meta.outputs.version }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: スキャン結果のアップロード
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

### 10.4 セルフホストとGitHub-hostedのハイブリッド構成

実際の運用では、すべてのジョブをセルフホストランナーで実行する必要はありません。軽量なタスクはGitHub-hosted、重いタスクはセルフホストという使い分けが効率的です。

```yaml
name: Hybrid CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:

jobs:
  # 軽量タスク → GitHub-hosted
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  # 軽量テスト → GitHub-hosted
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:unit

  # 重いビルド → セルフホスト
  build:
    needs: [lint-and-typecheck, unit-test]
    runs-on: [self-hosted, linux, x64]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
        env:
          NODE_OPTIONS: "--max-old-space-size=8192"
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  # E2Eテスト → セルフホスト（ブラウザが重い）
  e2e-test:
    needs: build
    runs-on: [self-hosted, linux, x64]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - run: npm run test:e2e

  # デプロイ → セルフホスト（社内ネットワーク）
  deploy:
    needs: [build, e2e-test]
    if: github.ref == 'refs/heads/main'
    runs-on: [self-hosted, linux, deploy]
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - name: 本番デプロイ
        run: |
          rsync -avz --delete dist/ deploy@production-server:/var/www/app/
          ssh deploy@production-server 'sudo systemctl reload nginx'
```

## 11. トラブルシューティング

### 11.1 よくある問題と解決策

**ランナーがOfflineになる**:

```bash
# ランナープロセスの確認
systemctl status github-runner

# ログの確認
journalctl -u github-runner --since "1 hour ago"

# ネットワーク接続の確認
curl -sS -o /dev/null -w "%{http_code}" https://api.github.com
```

**ジョブが "Queued" のまま進まない**:

```bash
# ランナーのラベルを確認
cat ~/actions-runner/.runner | jq '.agentName, .workFolder'

# ランナーがオンラインか確認（GitHub API）
curl -sS \
  -H "Authorization: Bearer YOUR_PAT" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/YOUR_ORG/YOUR_REPO/actions/runners | \
  jq '.runners[] | {name, status, labels: [.labels[].name]}'
```

**ディスク容量の不足**:

```bash
# ワークディレクトリのサイズ確認
du -sh ~/actions-runner/_work/*

# Docker関連のクリーンアップ
docker system prune -af --volumes

# 古いキャッシュの削除
find /opt/cache -type f -mtime +30 -delete
```

**Docker-in-Docker の問題**:

```bash
# docker.sock のパーミッション確認
ls -la /var/run/docker.sock

# ランナーユーザーがdockerグループに属しているか確認
groups runner

# Docker-in-Docker ではなく Docker-outside-of-Docker を使う
# （ホストのdocker.sockをマウント）
docker run -v /var/run/docker.sock:/var/run/docker.sock ...
```

### 11.2 パフォーマンスチューニング

```bash
# ファイルディスクリプタの上限を増やす
echo "runner soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "runner hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# inotify watchの上限を増やす（大規模プロジェクト用）
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# tmpをRAMディスクにマウント（ビルド高速化）
echo "tmpfs /tmp tmpfs defaults,noatime,nosuid,nodev,size=4G 0 0" | \
  sudo tee -a /etc/fstab
sudo mount -a

# スワップの設定（メモリ不足対策）
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
```

## 12. Organization レベルのランナー管理

### 12.1 ランナーグループの設定

Organization全体でランナーを共有する場合、ランナーグループを使ってアクセス制御を行います。

```bash
# Organization レベルのランナー登録
./config.sh \
  --url https://github.com/YOUR_ORG \
  --token YOUR_ORG_TOKEN \
  --name "org-runner-01" \
  --runnergroup "production-runners" \
  --labels "self-hosted,linux,x64,org"
```

### 12.2 ランナーグループのAPI管理

```bash
# ランナーグループの作成
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_PAT" \
  "https://api.github.com/orgs/YOUR_ORG/actions/runner-groups" \
  -d '{
    "name": "production-runners",
    "visibility": "selected",
    "selected_repository_ids": [123456, 789012],
    "allows_public_repositories": false
  }'

# ランナー一覧の取得
curl -sS \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_PAT" \
  "https://api.github.com/orgs/YOUR_ORG/actions/runners" | \
  jq '.runners[] | {id, name, status, os, labels: [.labels[].name]}'
```

## 13. まとめ：セルフホストランナー導入判断フローチャート

セルフホストランナーの導入は、以下の基準で判断しましょう。

**導入すべきケース**:
- 月間CI利用が1,600分（約27時間）を超える
- GPU/特殊ハードウェアが必要
- オンプレミス・VPN内のリソースにアクセスが必要
- コンプライアンス要件でコードを社外に出せない
- macOS/iOSビルドを頻繁に行う

**GitHub-hostedのままで良いケース**:
- 月間CI利用が1,000分未満
- 標準的なNode.js/Pythonプロジェクト
- 運用管理のリソースが確保できない
- パブリックリポジトリで無料枠を活用できる

**推奨アプローチ**:
1. まずGitHub-hostedで運用を開始
2. CI時間・コストをモニタリング
3. 月間1,600分を超えたらセルフホストを検討
4. ハイブリッド構成で段階的に移行
5. KEDAによるゼロスケーリングでコスト最適化

セルフホストランナーは適切に構築・運用すれば、コスト削減だけでなく、ビルド速度の向上やセキュリティの強化にもつながる強力なインフラです。本記事で紹介した手順とベストプラクティスを参考に、プロジェクトに最適なCI/CD環境を構築してください。

## 関連記事

- [GitHub Actions完全ガイド](/blog/github-actions-advanced-guide)
- [GitHub Actionsセキュリティガイド](/blog/github-actions-security-guide)
- [Docker完全ガイド](/blog/docker-complete-guide)
- [Kubernetes入門ガイド](/blog/kubernetes-basics-guide)
- [VPS比較2026](/blog/vps-comparison-2026)
