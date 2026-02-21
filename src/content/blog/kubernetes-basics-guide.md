---
title: 'Kubernetes入門完全ガイド — Pod・Service・Deployment・Ingress・本番運用'
description: 'Kubernetesの基礎から本番運用まで完全解説。Pod・ReplicaSet・Deployment・Service・Ingress・ConfigMap・Secret・HPA・Helm・GitOps実践をYAML例付きで網羅。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['Kubernetes', 'Docker', 'DevOps', 'インフラ', 'クラウド']
---

現代のクラウドネイティブ開発において、**Kubernetes（K8s）** は事実上の標準コンテナオーケストレーションプラットフォームとなっています。AWS・GCP・Azureいずれのクラウドプロバイダーでも中核サービスとして提供されており、スタートアップから大企業まで幅広い組織が採用しています。

しかし「Kubernetesは難しい」という評判があるのも事実です。Pod・ReplicaSet・Deployment・Service・Ingressといった概念が多く、初学者が全体像を把握するのに時間がかかりがちです。

本記事では、Kubernetesの基礎概念からローカル環境の構築、主要なリソースタイプの実践的な使い方、さらにHelmやGitOpsを用いた本番運用まで、YAML マニフェスト例とともに徹底解説します。

---

## 1. Kubernetesとは — コンテナオーケストレーションの必要性

### コンテナ単体の限界

Dockerでコンテナ化したアプリケーションを本番環境で運用する際、次のような課題が生じます。

- **スケールアウト**: トラフィック増加時にコンテナを素早く複数起動したい
- **自動復旧**: コンテナがクラッシュしたとき自動的に再起動させたい
- **ロードバランシング**: 複数コンテナへリクエストを分散させたい
- **ローリングアップデート**: ダウンタイムなしで新バージョンをリリースしたい
- **設定管理**: 環境ごとに異なる設定値をコンテナに注入したい
- **ストレージ管理**: データを永続化し、コンテナ再起動後も保持したい

これらすべてを手作業で管理するのは現実的ではありません。**コンテナオーケストレーター**はこれらの課題を自動化するツールです。

### Kubernetesが選ばれる理由

2014年にGoogleが公開したKubernetesは、Googleが10年以上社内で使用してきた「Borg」システムの知見をもとに設計されました。現在はCloud Native Computing Foundation（CNCF）が管理しています。

主なメリット：

| 機能 | 説明 |
|------|------|
| 自動スケーリング | CPU・メモリ使用率に応じてPod数を自動調整 |
| 自己修復 | 障害Podを自動再起動・再スケジュール |
| サービスディスカバリ | コンテナ間の名前解決とロードバランシングを自動化 |
| ローリングアップデート | 無停止デプロイとワンコマンドロールバック |
| 設定・シークレット管理 | ConfigMap・Secretでアプリ設定を外部化 |
| マルチクラウド対応 | AWS・GCP・Azure・オンプレ問わず同一APIで操作 |

---

## 2. Kubernetesアーキテクチャ

Kubernetesクラスタは大きく **Control Plane**（制御面）と **Node**（ワーカーノード）に分かれます。

```
┌─────────────────────────────────────────────────────────┐
│                     Control Plane                        │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ kube-apiserver│  │kube-scheduler│  │kube-controller│ │
│  │             │  │              │  │   -manager    │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐                     │
│  │    etcd     │  │cloud-controller│                    │
│  │(Key-Value DB)│  │   -manager   │                    │
│  └─────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
          │                │                │
┌─────────┴──┐   ┌─────────┴──┐   ┌────────┴───┐
│   Node 1   │   │   Node 2   │   │   Node 3   │
│            │   │            │   │            │
│ ┌────────┐ │   │ ┌────────┐ │   │ ┌────────┐ │
│ │kubelet │ │   │ │kubelet │ │   │ │kubelet │ │
│ └────────┘ │   │ └────────┘ │   │ └────────┘ │
│ ┌────────┐ │   │ ┌────────┐ │   │ ┌────────┐ │
│ │kube-   │ │   │ │kube-   │ │   │ │kube-   │ │
│ │proxy   │ │   │ │proxy   │ │   │ │proxy   │ │
│ └────────┘ │   │ └────────┘ │   │ └────────┘ │
│ ┌────────┐ │   │ ┌────────┐ │   │ ┌────────┐ │
│ │  Pod   │ │   │  │  Pod   │ │   │ │  Pod   │ │
│ └────────┘ │   │ └────────┘ │   │ └────────┘ │
└────────────┘   └────────────┘   └────────────┘
```

### 各コンポーネントの役割

**kube-apiserver**
すべての操作のエントリーポイント。`kubectl` コマンドや他のコンポーネントはすべてこのAPIサーバーを通じてクラスタと通信します。

**etcd**
クラスタの全状態を保存する分散Key-Valueストア。クラスタ設定、Pod情報、ノード情報など「期待状態（Desired State）」がすべてここに保存されています。

**kube-scheduler**
新しいPodをどのノードに配置するかを決定します。リソース使用量・アフィニティルール・テイントなどを考慮してスケジューリングを行います。

**kube-controller-manager**
複数のコントローラーを内包するプロセスです。
- **ReplicaSet Controller**: Podのレプリカ数を維持
- **Node Controller**: ノードのヘルスを監視
- **Job Controller**: バッチジョブの完了を管理

**kubelet**
各ノードで動作するエージェント。APIサーバーから指示を受け取り、実際にコンテナランタイム（containerd等）を通じてコンテナを起動・停止します。

**kube-proxy**
各ノードのネットワークプロキシ。ServiceリソースのIPTablesルールやIPVSルールを管理し、Podへのトラフィックをルーティングします。

---

## 3. ローカル環境のセットアップ

本番クラスタを使う前に、ローカルでKubernetesを試せる環境を構築しましょう。

### 選択肢の比較

| ツール | 特徴 | 推奨用途 |
|--------|------|---------|
| **kind** | Dockerコンテナ上でK8sクラスタを構築。軽量・高速 | CI/CDパイプライン・テスト |
| **minikube** | VM or Dockerで単一ノードクラスタ。豊富なアドオン | 学習・開発 |
| **Docker Desktop** | Docker Desktop付属のK8s。GUIで操作可能 | Mac/Windows開発者 |
| **k3s** | 軽量K8s。本番でも使える | Raspberry Pi・エッジ環境 |

### kindでの環境構築（推奨）

```bash
# kindのインストール（macOS）
brew install kind

# kindのインストール（Linux）
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# kubectlのインストール
brew install kubectl  # macOS
# または
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# クラスタ作成
kind create cluster --name my-cluster

# クラスタ確認
kubectl cluster-info
kubectl get nodes
```

### マルチノードクラスタの作成

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
  - role: worker
```

```bash
kind create cluster --name multi-node --config kind-config.yaml
kubectl get nodes
# NAME                        STATUS   ROLES           AGE
# multi-node-control-plane    Ready    control-plane   2m
# multi-node-worker           Ready    <none>          2m
# multi-node-worker2          Ready    <none>          2m
# multi-node-worker3          Ready    <none>          2m
```

### kubectlの基本コマンド

```bash
# リソース一覧表示
kubectl get pods
kubectl get services
kubectl get deployments
kubectl get all

# 詳細表示
kubectl describe pod <pod-name>
kubectl describe service <service-name>

# ログ確認
kubectl logs <pod-name>
kubectl logs -f <pod-name>  # ストリーミング

# Pod内でコマンド実行
kubectl exec -it <pod-name> -- /bin/bash

# マニフェスト適用・削除
kubectl apply -f manifest.yaml
kubectl delete -f manifest.yaml

# リソースの編集
kubectl edit deployment <deployment-name>
```

---

## 4. Pod — Kubernetesの基本単位

**Pod** はKubernetesが管理する最小の実行単位です。1つ以上のコンテナを含み、同一Pod内のコンテナはネットワーク（localhost）とストレージボリュームを共有します。

### 基本的なPodマニフェスト

```yaml
# pod-basic.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
    version: "1.25"
spec:
  containers:
    - name: nginx
      image: nginx:1.25-alpine
      ports:
        - containerPort: 80
      resources:
        requests:
          memory: "64Mi"
          cpu: "250m"
        limits:
          memory: "128Mi"
          cpu: "500m"
```

```bash
kubectl apply -f pod-basic.yaml
kubectl get pods
kubectl describe pod nginx-pod
```

### マルチコンテナPod（サイドカーパターン）

```yaml
# pod-sidecar.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
spec:
  containers:
    # メインアプリケーションコンテナ
    - name: app
      image: myapp:latest
      volumeMounts:
        - name: shared-logs
          mountPath: /var/log/app

    # ログ収集サイドカー
    - name: log-collector
      image: fluentd:latest
      volumeMounts:
        - name: shared-logs
          mountPath: /var/log/app
          readOnly: true

  volumes:
    - name: shared-logs
      emptyDir: {}
```

### Podのライフサイクル

Podのステータスは以下の遷移をたどります：

```
Pending → Running → Succeeded/Failed
               ↓
            (再起動ポリシーに応じて)
```

| ステータス | 説明 |
|-----------|------|
| Pending | スケジューリング待ち or コンテナイメージのPull中 |
| Running | 少なくとも1つのコンテナが起動中 |
| Succeeded | 全コンテナが正常終了（exit 0） |
| Failed | 少なくとも1つのコンテナが異常終了 |
| Unknown | ノードとの通信が取れない |

### ヘルスチェック（Probe）

本番環境では3種類のProbeを設定することが必須です：

```yaml
# pod-with-probes.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-probes
spec:
  containers:
    - name: app
      image: myapp:latest
      ports:
        - containerPort: 8080

      # 起動完了チェック（初回起動に時間がかかるアプリ向け）
      startupProbe:
        httpGet:
          path: /healthz
          port: 8080
        failureThreshold: 30
        periodSeconds: 10

      # 生存チェック（失敗するとコンテナを再起動）
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
        initialDelaySeconds: 15
        periodSeconds: 20
        failureThreshold: 3
        timeoutSeconds: 5

      # 準備完了チェック（失敗するとトラフィックを送らない）
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 10
        successThreshold: 1
        failureThreshold: 3
```

**3種類のProbeの使い分け：**

- **startupProbe**: 起動に30秒以上かかるJavaアプリなどに設定。livenessProbeより先に実行され、起動完了前の誤った再起動を防ぐ
- **livenessProbe**: アプリがデッドロック等で応答不能になった場合の自動復旧に使用
- **readinessProbe**: デプロイ中やDBマイグレーション中にトラフィックを受け付けないよう制御

---

## 5. ReplicaSet・Deployment

### ReplicaSet

ReplicaSetは指定した数のPodレプリカが常に動作していることを保証します。

```yaml
# replicaset.yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: nginx-replicaset
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.25-alpine
          ports:
            - containerPort: 80
```

ただし、ReplicaSetを直接使うことはほとんどありません。**Deployment** がReplicaSetを管理してくれるため、通常はDeploymentを使います。

### Deployment

Deploymentは、ReplicaSetの管理に加えてローリングアップデートとロールバック機能を提供します。

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  # ローリングアップデート戦略
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # 同時に追加できるPodの最大数
      maxUnavailable: 0  # 同時に停止できるPodの最大数（0=無停止）
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.25-alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "64Mi"
              cpu: "100m"
            limits:
              memory: "128Mi"
              cpu: "200m"
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 5
```

### ローリングアップデートとロールバック

```bash
# イメージを更新（ローリングアップデート開始）
kubectl set image deployment/nginx-deployment nginx=nginx:1.26-alpine

# アップデートの進捗確認
kubectl rollout status deployment/nginx-deployment

# デプロイ履歴確認
kubectl rollout history deployment/nginx-deployment

# 直前のバージョンにロールバック
kubectl rollout undo deployment/nginx-deployment

# 特定バージョンにロールバック
kubectl rollout undo deployment/nginx-deployment --to-revision=2

# スケールアウト
kubectl scale deployment nginx-deployment --replicas=5

# 一時停止・再開（段階的デプロイ）
kubectl rollout pause deployment/nginx-deployment
kubectl rollout resume deployment/nginx-deployment
```

### Deployment戦略の比較

**RollingUpdate（デフォルト）**
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%       # 追加Pod最大（割合指定も可能）
    maxUnavailable: 25% # 停止Pod最大
```
旧バージョンを徐々に新バージョンに置き換えます。ダウンタイムなしでのデプロイに適しています。

**Recreate**
```yaml
strategy:
  type: Recreate
```
全Podを一度停止してから新Podを起動します。データベースのマイグレーションなど、旧バージョンと新バージョンが同時に存在できない場合に使用します。

---

## 6. Service — Podへのネットワークアクセス

PodのIPアドレスはPod再起動のたびに変わります。**Service** はPodに対する安定したアクセスポイントを提供します。

### ServiceタイプとユースケースClusterIP

**ClusterIP（デフォルト）**

クラスタ内部からのみアクセス可能な仮想IPを割り当てます。マイクロサービス間の通信に使用します。

```yaml
# service-clusterip.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: ClusterIP  # デフォルト値なので省略可能
  selector:
    app: nginx     # このラベルを持つPodにトラフィックを転送
  ports:
    - protocol: TCP
      port: 80       # Serviceのポート
      targetPort: 80 # コンテナのポート
```

**NodePort**

各ノードの特定ポートを開放し、クラスタ外部からアクセスを受け付けます。ポート範囲は30000-32767。

```yaml
# service-nodeport.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-nodeport
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
      nodePort: 30080  # 省略するとランダム割り当て
```

**LoadBalancer**

クラウドプロバイダーのロードバランサーを自動的にプロビジョニングします。本番環境での外部公開に使用します。

```yaml
# service-loadbalancer.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-lb
  annotations:
    # AWSの場合: NLBを使用
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
    - protocol: TCP
      port: 443
      targetPort: 443
```

### サービスディスカバリ

KubernetesはCoreDNSを使ったDNSベースのサービスディスカバリを提供します。

```
# 同一Namespace内
http://nginx-service/

# 別Namespace（staging）から
http://nginx-service.production.svc.cluster.local/
```

Pod内から確認：
```bash
kubectl exec -it <pod-name> -- nslookup nginx-service
kubectl exec -it <pod-name> -- curl http://nginx-service/
```

---

## 7. Ingress — HTTP/HTTPSルーティング

**Ingress** はHTTP/HTTPSトラフィックをクラスタ内の複数のServiceにルーティングするためのAPIオブジェクトです。

### NGINX Ingress Controllerのインストール

```bash
# kindクラスタにNGINX Ingress Controllerをインストール
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# インストール確認
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### パスベースルーティング

```yaml
# ingress-path-routing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
```

### TLS終端（HTTPS化）

```yaml
# ingress-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secure-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls-secret  # cert-managerが自動作成
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
```

cert-managerを使ったLet's Encrypt自動証明書取得：

```bash
# cert-managerのインストール
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# ClusterIssuer作成
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
EOF
```

---

## 8. ConfigMap・Secret — 設定管理

### ConfigMap

アプリケーションの設定値を外部化するためのリソースです。機密情報以外の設定に使用します。

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  # キーバリュー形式
  DATABASE_HOST: "postgres-service"
  DATABASE_PORT: "5432"
  LOG_LEVEL: "info"
  MAX_CONNECTIONS: "100"

  # ファイル形式（設定ファイルをマウント）
  app.properties: |
    server.port=8080
    spring.datasource.url=jdbc:postgresql://postgres-service:5432/mydb
    logging.level.root=INFO

  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://backend:8080;
      }
    }
```

**環境変数として注入：**

```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
      env:
        # 個別の値を注入
        - name: DATABASE_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DATABASE_HOST
      # ConfigMap全体を環境変数として注入
      envFrom:
        - configMapRef:
            name: app-config
```

**ボリュームとしてマウント（設定ファイルとして使用）：**

```yaml
spec:
  containers:
    - name: nginx
      image: nginx:1.25-alpine
      volumeMounts:
        - name: config-volume
          mountPath: /etc/nginx/conf.d
  volumes:
    - name: config-volume
      configMap:
        name: app-config
        items:
          - key: nginx.conf
            path: default.conf
```

### Secret

パスワード・APIキー・TLS証明書などの機密情報を管理します。Base64エンコードで保存されます（注: 暗号化ではありません）。

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  # Base64エンコード: echo -n "mypassword" | base64
  DATABASE_PASSWORD: bXlwYXNzd29yZA==
  API_KEY: c2VjcmV0YXBpa2V5MTIz
stringData:
  # stringDataはBase64不要（自動変換される）
  JWT_SECRET: "my-super-secret-jwt-key-for-production"
```

```bash
# コマンドラインでSecretを作成
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_PASSWORD=mypassword \
  --from-literal=API_KEY=secretapikey123

# TLS Secretの作成
kubectl create secret tls myapp-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key
```

**本番環境でのSecret管理ベストプラクティス：**

- **External Secrets Operator**: AWS Secrets Manager・HashiCorp Vault等と連携してSecretを動的に取得
- **Sealed Secrets**: SecretをGitにコミットできる暗号化形式に変換（GitOps対応）
- **RBAC**: Secretへのアクセス権限を最小限に制限

---

## 9. PersistentVolume・PersistentVolumeClaim

コンテナは基本的にステートレスで、Podが削除されるとデータも消えます。データを永続化するには **PersistentVolume（PV）** と **PersistentVolumeClaim（PVC）** を使います。

### PV・PVCの概念

```
開発者（PVC）  →  [StorageClass]  →  インフラ管理者（PV）
    ↑                    ↓
  「100GB欲しい」   自動的にPVをプロビジョニング
```

### StorageClass（動的プロビジョニング）

```yaml
# storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-storage
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: kubernetes.io/aws-ebs  # AWSの場合
parameters:
  type: gp3
  iopsPerGB: "10"
  encrypted: "true"
reclaimPolicy: Retain  # PVC削除後もPVを保持
volumeBindingMode: WaitForFirstConsumer
```

### PersistentVolumeClaim

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce  # 1つのノードから読み書き可能
  storageClassName: fast-storage
  resources:
    requests:
      storage: 20Gi
```

**アクセスモード：**
- `ReadWriteOnce（RWO）`: 1ノードから読み書き（ブロックストレージ向け）
- `ReadOnlyMany（ROX）`: 複数ノードから読み取りのみ
- `ReadWriteMany（RWX）`: 複数ノードから読み書き（NFSなど）

### PVCをPodで使用

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: DATABASE_PASSWORD
            - name: POSTGRES_DB
              value: mydb
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc
```

---

## 10. HPA — Horizontal Pod Autoscaler

**HPA** はCPU・メモリ使用率や外部メトリクスに基づいて、Deploymentのレプリカ数を自動的に増減させます。

### Metrics Serverのインストール

```bash
# Metrics Serverが必要（kindの場合）
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# kindではTLS検証の無効化が必要
kubectl patch deployment metrics-server -n kube-system \
  --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

### CPU・メモリベースのHPA

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-deployment
  minReplicas: 2   # 最小レプリカ数
  maxReplicas: 10  # 最大レプリカ数
  metrics:
    # CPU使用率50%を維持するようにスケール
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50
    # メモリ使用率70%を維持
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # スケールダウン前の待機時間
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
```

```bash
# HPAの状態確認
kubectl get hpa
kubectl describe hpa nginx-hpa

# 負荷テストでスケールアウトを確認
kubectl run load-generator --image=busybox --rm -it -- \
  sh -c "while true; do wget -O- http://nginx-service/; done"
```

### KEDA — カスタムメトリクスによる高度なオートスケーリング

Kafkaキュー長・HTTP RPS・Prometheusメトリクスなど、任意のメトリクスでスケーリングしたい場合は**KEDA（Kubernetes Event-driven Autoscaling）** を使います。

```yaml
# keda-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
spec:
  scaleTargetRef:
    name: kafka-consumer-deployment
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka:9092
        topic: my-topic
        consumerGroup: my-consumer-group
        lagThreshold: "100"  # 100メッセージ/Podを維持
```

---

## 11. Helm — Kubernetesのパッケージ管理

**Helm** はKubernetesアプリケーションのパッケージマネージャーです。複数のYAMLマニフェストをまとめた「Chart」として管理し、変数を使ったテンプレート化を実現します。

### Helmのインストールと基本操作

```bash
# Helmのインストール
brew install helm  # macOS
# または
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# リポジトリ追加
helm repo add stable https://charts.helm.sh/stable
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# アプリケーションのインストール（例: nginx-ingress）
helm install my-ingress ingress-nginx/ingress-nginx

# インストール済みChartの確認
helm list

# アップグレード
helm upgrade my-ingress ingress-nginx/ingress-nginx --version 4.9.0

# アンインストール
helm uninstall my-ingress
```

### 独自Chartの作成

```bash
# Chartのスキャフォールディング
helm create myapp

# ディレクトリ構造
myapp/
├── Chart.yaml          # Chart情報（名前・バージョン・説明）
├── values.yaml         # デフォルト値
├── templates/
│   ├── deployment.yaml # テンプレートファイル
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   └── _helpers.tpl    # ヘルパーテンプレート
└── charts/             # 依存Chart
```

**Chart.yaml:**

```yaml
# Chart.yaml
apiVersion: v2
name: myapp
description: A Helm chart for My Application
type: application
version: 0.1.0      # Chartのバージョン
appVersion: "1.0.0" # アプリのバージョン

dependencies:
  - name: postgresql
    version: "13.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

**values.yaml:**

```yaml
# values.yaml
replicaCount: 2

image:
  repository: myregistry/myapp
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: myapp-tls
      hosts:
        - myapp.example.com

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 50

postgresql:
  enabled: true
  auth:
    database: mydb
    existingSecret: app-secrets
```

**テンプレートファイル（deployment.yaml）:**

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 80
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

**環境別のvaluesファイル：**

```bash
# 本番環境用values.yaml
helm install myapp ./myapp \
  -f values.yaml \
  -f values-production.yaml \
  --set image.tag=v1.2.3

# 差分確認（dry-run）
helm install myapp ./myapp --dry-run --debug
```

---

## 12. Namespace・RBAC — アクセス制御

### Namespace

Namespaceはクラスタを論理的に分割するためのメカニズムです。チームや環境ごとに分けて使います。

```bash
# Namespace作成
kubectl create namespace production
kubectl create namespace staging
kubectl create namespace monitoring

# Namespaceを指定して操作
kubectl get pods -n production
kubectl apply -f deployment.yaml -n production

# デフォルトNamespaceの変更
kubectl config set-context --current --namespace=production
```

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    env: production
    team: backend
```

### ResourceQuota（リソース制限）

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    pods: "50"
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    persistentvolumeclaims: "10"
    services.loadbalancers: "2"
```

### RBAC（Role-Based Access Control）

```yaml
# rbac.yaml

# Role: 特定Namespace内の権限定義
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-role
  namespace: production
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]

---
# RoleBinding: ユーザー/グループにRoleを付与
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-rolebinding
  namespace: production
subjects:
  - kind: User
    name: jane@example.com
    apiGroup: rbac.authorization.k8s.io
  - kind: Group
    name: dev-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer-role
  apiGroup: rbac.authorization.k8s.io

---
# ClusterRole: クラスタ全体の権限定義
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-cluster
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]

---
# ServiceAccount: PodからのAPIアクセス用
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-service-account
  namespace: production

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-rolebinding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: ci-service-account
    namespace: production
roleRef:
  kind: ClusterRole
  name: readonly-cluster
  apiGroup: rbac.authorization.k8s.io
```

```bash
# RBAC権限の確認
kubectl auth can-i create pods --as=jane@example.com -n production
kubectl auth can-i delete deployments --as=jane@example.com -n production
```

---

## 13. GitOps — Argo CDによる自動デプロイ

**GitOps** はGitリポジトリを「Single Source of Truth（唯一の信頼できる情報源）」とし、Gitへのプッシュをトリガーにデプロイを自動化するアプローチです。

### GitOpsのメリット

- **監査可能性**: すべての変更がGitコミットとして記録される
- **ロールバック容易**: `git revert` でいつでも過去の状態に戻せる
- **Pull型デプロイ**: クラスタ側からGitを監視するため、クラスタへの直接アクセス不要
- **ドリフト検知**: クラスタの実態とGitの定義が乖離したら自動修正

### Argo CDのインストール

```bash
# Argo CDのインストール
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# ポートフォワードでUIにアクセス
kubectl port-forward svc/argocd-server -n argocd 8080:443

# 初期パスワード取得
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Argo CD CLIのインストール
brew install argocd
argocd login localhost:8080
```

### ApplicationリソースでGitOps設定

```yaml
# argocd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myapp-k8s-manifests.git
    targetRevision: main
    path: production/  # このディレクトリのマニフェストを適用

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true      # Git上に存在しないリソースを自動削除
      selfHeal: true   # クラスタの手動変更を自動修正
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### GitOpsワークフロー全体像

```
開発者
  │
  ├── コード変更 → GitHub PR
  │
  ├── CI（GitHub Actions）が実行:
  │     - テスト実行
  │     - Dockerイメージビルド
  │     - イメージをECR/GCRにプッシュ
  │     - K8sマニフェストのimage tagを更新
  │     - マニフェストリポジトリへPR作成
  │
  ├── マニフェストPRをレビュー・マージ
  │
  └── Argo CD（自動）:
        - マニフェストリポジトリの変更を検知
        - クラスタとGitの差分を検出
        - 自動sync実行
        - デプロイ完了通知（Slack等）
```

### GitHub ActionsとArgo CDの統合

```yaml
# .github/workflows/deploy.yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push $ECR_REGISTRY/myapp:${{ github.sha }}

      - name: Update manifest repo
        run: |
          git clone https://github.com/myorg/myapp-k8s-manifests.git
          cd myapp-k8s-manifests
          # Helmのimage tagを更新
          sed -i "s|tag:.*|tag: ${{ github.sha }}|g" production/values.yaml
          git add .
          git commit -m "Update image tag to ${{ github.sha }}"
          git push
```

---

## 本番運用のベストプラクティス

### セキュリティ強化

```yaml
# SecurityContext の設定（必須）
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
```

### Pod Disruption Budget（PDB）

計画メンテナンス時のPod停止数を制限します：

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: nginx-pdb
spec:
  minAvailable: 2  # 最低2つのPodを常に維持
  selector:
    matchLabels:
      app: nginx
```

### NetworkPolicy（ネットワーク分離）

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # frontendからのアクセスのみ許可
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # postgresへのアクセスのみ許可
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
```

### 監視・オブザーバビリティスタック

本番Kubernetesには監視基盤が不可欠です：

```bash
# Prometheus + Grafana のインストール（Helmで）
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f monitoring-values.yaml
```

---

## まとめ

本記事で解説したKubernetesの主要コンポーネントをまとめます：

| コンポーネント | 役割 |
|-------------|------|
| Pod | コンテナの実行単位 |
| Deployment | Podのライフサイクル管理・ローリングアップデート |
| Service | Podへの安定したアクセスポイント |
| Ingress | HTTP/HTTPSルーティング・TLS終端 |
| ConfigMap | 設定値の外部化 |
| Secret | 機密情報の管理 |
| PVC | 永続ストレージの要求 |
| HPA | 負荷に応じた自動スケーリング |
| Helm | マニフェストのパッケージ管理・テンプレート化 |
| RBAC | 最小権限アクセス制御 |
| Argo CD | GitOpsによる自動デプロイ |

Kubernetesを習得する際は、ローカル環境（kind/minikube）でYAMLマニフェストを実際に書いて動かすことが最も効率的な学習方法です。

---

## DevToolBox でYAML検証を効率化

Kubernetesのマニフェストは複数のYAMLファイルを組み合わせて構成されることが多く、インデントのミスや型の誤りが原因でデプロイが失敗するケースがよくあります。

**[DevToolBox](https://usedevtools.com/)** には、YAML Formatter・JSON Formatter・Base64エンコード/デコードなど、Kubernetes開発で日常的に使うツールが揃っています。ConfigMapやSecretの値のBase64エンコードを手早く確認したり、YAMLマニフェストの構文チェックを行ったりする際に重宝します。すべてブラウザ上で完結するため、インストール不要でどこからでも使えます。

Kubernetes運用を日常的に行うエンジニアは、ぜひブックマークしておくことをお勧めします。

---

*本記事で紹介したYAMLマニフェストはすべてKubernetes v1.29以降で動作確認しています。バージョンによってAPIが異なる場合があるため、公式ドキュメント（[kubernetes.io](https://kubernetes.io/docs/)）も合わせて参照してください。*

---

## スキルアップ・キャリアアップのおすすめリソース

Kubernetesのスキルはクラウドネイティブ時代の必須要件になりつつある。キャリアアップに活用してほしい。

### 転職・キャリアアップ
- **[レバテックキャリア](https://levtech.jp)** — ITエンジニア専門の転職エージェント。Kubernetes・クラウド案件は高単価で、SRE・インフラエンジニアの転職に強い。無料相談可能。
- **[Findy](https://findy-job.com)** — GitHubのKubernetes関連プロジェクトが評価対象。スカウト型でリモート求人が充実。DevOpsエンジニアへの転職に人気のサービス。

### オンライン学習
- **[Udemy](https://www.udemy.com)** — KubernetesのCKA（認定Kubernetesアドミニストレーター）試験対策コースが充実。ハンズオンラボ付きで実践力が身につく。セール時は大幅割引。
- **[Coursera](https://www.coursera.org)** — Google Cloud・AWS公式のKubernetes関連コースを受講可能。認定証取得でポートフォリオに追加できる。
