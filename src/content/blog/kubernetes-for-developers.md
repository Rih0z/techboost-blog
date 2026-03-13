---
title: "開発者のためのKubernetes入門 — Pod/Service/Deploymentの基本"
description: "Kubernetesの基本概念からkubectlコマンド、Pod/Service/Deploymentの定義、Helmチャート、ローカル開発環境(kind/minikube)まで実践的に解説します。Kubernetes・k8s・Dockerに関する実践情報。"
pubDate: "2026-02-05"
tags: ["Kubernetes", "k8s", "Docker", "DevOps", "インフラ"]
heroImage: '../../assets/thumbnails/kubernetes-for-developers.jpg'
---
Kubernetesは、コンテナオーケストレーションのデファクトスタンダードです。この記事では、開発者が知っておくべきKubernetesの基本を実践的に解説します。

## Kubernetesとは

Kubernetesは、Dockerコンテナを大規模に管理するためのオープンソースプラットフォームです。略して「k8s」と呼ばれます（kとsの間に8文字あるため）。

### Kubernetesが解決する課題

- **スケーリング**: トラフィックに応じて自動的にコンテナを増減
- **自己修復**: 障害が発生したコンテナを自動的に再起動
- **ロードバランシング**: 複数のコンテナに負荷を分散
- **デプロイ管理**: ゼロダウンタイムでのアプリケーション更新
- **設定管理**: 環境変数やシークレットの一元管理

## ローカル開発環境のセットアップ

まずは、ローカルマシンでKubernetesクラスタを動かしましょう。

### kind (Kubernetes in Docker)

```bash
# kindのインストール (macOS)
brew install kind

# クラスタの作成
kind create cluster --name dev-cluster

# クラスタの確認
kubectl cluster-info --context kind-dev-cluster

# クラスタの削除（不要になったら）
kind delete cluster --name dev-cluster
```

### minikube

```bash
# minikubeのインストール (macOS)
brew install minikube

# クラスタの起動
minikube start

# ダッシュボードの起動
minikube dashboard

# クラスタの停止
minikube stop
```

## kubectlの基本コマンド

kubectlは、Kubernetesクラスタを操作するためのCLIツールです。

```bash
# クラスタ情報の確認
kubectl cluster-info

# ノード一覧
kubectl get nodes

# すべてのリソースを表示
kubectl get all

# 特定のNamespaceのリソース
kubectl get all -n kube-system

# Pod一覧
kubectl get pods

# Pod詳細
kubectl describe pod <pod-name>

# Podのログ確認
kubectl logs <pod-name>

# Podに接続
kubectl exec -it <pod-name> -- /bin/sh

# リソースの削除
kubectl delete pod <pod-name>

# YAMLからリソースを作成
kubectl apply -f deployment.yaml

# リソースの削除
kubectl delete -f deployment.yaml
```

## Podの基本

Podは、Kubernetesにおける最小のデプロイ単位です。1つ以上のコンテナを含みます。

### シンプルなPod定義

```yaml
# pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 80
    env:
    - name: ENVIRONMENT
      value: "development"
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```

```bash
# Podの作成
kubectl apply -f pod.yaml

# Podの確認
kubectl get pods

# Podの詳細
kubectl describe pod nginx-pod

# Podのログ
kubectl logs nginx-pod

# Podに接続
kubectl exec -it nginx-pod -- /bin/bash
```

### マルチコンテナPod

```yaml
# multi-container-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
spec:
  containers:
  # メインアプリケーション
  - name: app
    image: myapp:1.0
    ports:
    - containerPort: 8080
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log

  # ログ収集用サイドカー
  - name: log-collector
    image: fluent/fluent-bit:2.0
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log
      readOnly: true

  volumes:
  - name: shared-logs
    emptyDir: {}
```

## Deploymentによる管理

Podを直接作成するのではなく、Deploymentを使用することで、レプリケーションやローリングアップデートが可能になります。

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    app: web
spec:
  replicas: 3  # 3つのPodを起動
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 5
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 3
```

```bash
# Deploymentの作成
kubectl apply -f deployment.yaml

# Deploymentの確認
kubectl get deployments

# Podの確認（3つ起動されているはず）
kubectl get pods -l app=web

# スケーリング
kubectl scale deployment web-app --replicas=5

# ローリングアップデート
kubectl set image deployment/web-app nginx=nginx:1.26

# アップデートの確認
kubectl rollout status deployment/web-app

# ロールバック
kubectl rollout undo deployment/web-app
```

## Serviceによるネットワーク管理

Serviceは、Podへのネットワークアクセスを提供します。

### ClusterIP Service（クラスタ内部アクセス）

```yaml
# service-clusterip.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  type: ClusterIP  # デフォルト
  selector:
    app: web
  ports:
  - protocol: TCP
    port: 80        # Serviceのポート
    targetPort: 80  # Podのポート
```

### NodePort Service（外部アクセス）

```yaml
# service-nodeport.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service-external
spec:
  type: NodePort
  selector:
    app: web
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
    nodePort: 30080  # 30000-32767の範囲
```

### LoadBalancer Service（クラウド環境）

```yaml
# service-loadbalancer.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service-lb
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
```

```bash
# Serviceの作成
kubectl apply -f service-clusterip.yaml

# Serviceの確認
kubectl get services

# Service詳細
kubectl describe service web-service

# Serviceへの接続確認（クラスタ内から）
kubectl run test-pod --image=busybox -it --rm -- wget -qO- http://web-service
```

## ConfigMapとSecret

アプリケーションの設定と機密情報を管理します。

### ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: "postgres.default.svc.cluster.local"
  DATABASE_PORT: "5432"
  LOG_LEVEL: "info"
  app.properties: |
    server.port=8080
    server.timeout=30s
```

### Secret

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DATABASE_PASSWORD: "supersecret"
  API_KEY: "your-api-key-here"
```

### Deployment with ConfigMap & Secret

```yaml
# deployment-with-config.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:1.0
        env:
        # ConfigMapから環境変数
        - name: DATABASE_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DATABASE_HOST
        # Secretから環境変数
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_PASSWORD
        volumeMounts:
        # ConfigMapをファイルとしてマウント
        - name: config-volume
          mountPath: /etc/config
      volumes:
      - name: config-volume
        configMap:
          name: app-config
```

## Helmによるパッケージ管理

Helmは、Kubernetesのパッケージマネージャーです。複数のリソースをまとめて管理できます。

```bash
# Helmのインストール (macOS)
brew install helm

# リポジトリの追加
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# チャートの検索
helm search repo nginx

# チャートのインストール
helm install my-nginx bitnami/nginx

# インストール済みのリリース確認
helm list

# リリースのアップグレード
helm upgrade my-nginx bitnami/nginx --set replicaCount=3

# リリースの削除
helm uninstall my-nginx
```

### カスタムHelmチャート

```bash
# 新しいチャートの作成
helm create myapp

# ディレクトリ構造
myapp/
├── Chart.yaml           # チャートのメタデータ
├── values.yaml          # デフォルト値
├── templates/           # Kubernetesマニフェストのテンプレート
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
└── charts/              # 依存チャート
```

```yaml
# values.yaml
replicaCount: 3

image:
  repository: myapp
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

```bash
# チャートのインストール
helm install myapp ./myapp

# カスタム値でインストール
helm install myapp ./myapp --set replicaCount=5
```

## 実践的なワークフロー

```bash
# 1. ローカル開発環境の起動
kind create cluster --name dev

# 2. イメージのビルド（Dockerfileから）
docker build -t myapp:dev .

# 3. kindにイメージをロード
kind load docker-image myapp:dev --name dev

# 4. マニフェストの適用
kubectl apply -f k8s/

# 5. 動作確認
kubectl get all
kubectl logs deployment/myapp

# 6. ポートフォワードで動作確認
kubectl port-forward service/myapp 8080:80

# ブラウザで http://localhost:8080 にアクセス
```

## まとめ

Kubernetesの基本を理解することで、モダンなクラウドネイティブアプリケーションの開発・運用が可能になります。

**学習のポイント:**
- Podは最小単位だが、本番ではDeploymentを使う
- Serviceによってネットワークを抽象化
- ConfigMapとSecretで設定を外部化
- Helmで複雑な構成を管理
- ローカル環境（kind/minikube）で実験を繰り返す

まずはローカル環境で手を動かし、基本的なリソースの作成・更新・削除を体験することが重要です。Kubernetesは学習曲線が急ですが、一度習得すればあらゆるクラウド環境で活用できる強力なスキルとなります。
---

## 関連記事

- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
- [フリーランスエンジニアの収入完全ガイド2026【平均年収・単価・案件獲得】](/blog/2026-03-11-freelance-engineer-income-guide)
- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
