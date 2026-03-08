---
title: 'Kubernetes入門ガイド2026 — コンテナオーケストレーションを基礎から解説'
description: 'Kubernetes（k8s）の基礎から実践まで。Pod、Service、Deployment、Ingressなどの基本概念、実際のアプリデプロイ方法、運用のベストプラクティスを2026年の最新技術で解説します。サンプルコード付きで実践的に解説。'
pubDate: '2026-02-05'
tags: ['Docker', 'Kubernetes', 'インフラ', '開発ツール']
heroImage: '../../assets/thumbnails/kubernetes-beginner-guide-2026.jpg'
---
「Kubernetesって難しそう」と感じていませんか？確かに学習曲線は急ですが、基本概念を理解すれば、アプリケーションのデプロイ・スケーリング・運用が劇的に楽になります。この記事では、Kubernetesの基礎から実践的な使い方まで、2026年の最新情報とともに解説します。

## Kubernetesとは何か？

Kubernetes（k8s）は、**コンテナ化されたアプリケーションを自動でデプロイ、スケール、管理するオープンソースプラットフォーム**です。

### なぜKubernetesが必要か？

**Dockerだけの場合:**
```bash
# 手動で各サーバーにデプロイ
ssh server1 "docker run myapp"
ssh server2 "docker run myapp"
ssh server3 "docker run myapp"

# コンテナが落ちたら手動で再起動
ssh server1 "docker ps | grep myapp || docker run myapp"

# ロードバランシング設定も手動
# スケールアウトも手動
# アップデートも手動で1台ずつ
```

**Kubernetesの場合:**
```yaml
# デプロイ設定を宣言するだけ
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3  # 3台で動かしたい
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:v1.0
```

```bash
kubectl apply -f deployment.yaml
# あとは自動で:
# - 3台のコンテナ起動
# - 障害時の自動再起動
# - ロードバランシング
# - ローリングアップデート
```

## 基本概念

### 1. Pod（最小単位）

Podは**1つ以上のコンテナをまとめたもの**。Kubernetesの最小デプロイ単位です。

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
```

```bash
# Pod作成
kubectl apply -f pod.yaml

# Pod確認
kubectl get pods

# Pod詳細
kubectl describe pod nginx-pod

# ログ確認
kubectl logs nginx-pod

# Pod削除
kubectl delete pod nginx-pod
```

**複数コンテナを含むPod:**
```yaml
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

  # サイドカー（ログ収集）
  - name: log-collector
    image: fluent/fluentd:v1.16
    volumeMounts:
    - name: logs
      mountPath: /var/log

  volumes:
  - name: logs
    emptyDir: {}
```

### 2. ReplicaSet（複製管理）

ReplicaSetは**指定した数のPodを常に維持**します。

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
        image: nginx:1.25
```

```bash
kubectl apply -f replicaset.yaml

# 3つのPodが起動
kubectl get pods
# nginx-replicaset-abc123
# nginx-replicaset-def456
# nginx-replicaset-ghi789

# 1つ削除しても自動で補充される
kubectl delete pod nginx-replicaset-abc123
# 即座に新しいPodが起動
```

### 3. Deployment（デプロイ管理）

Deploymentは**ReplicaSetのバージョン管理**ができます。アップデート・ロールバックが簡単。

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:v1.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          value: "postgresql://db:5432/mydb"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

```bash
# デプロイ
kubectl apply -f deployment.yaml

# 状態確認
kubectl get deployments
kubectl get pods

# アップデート（イメージ変更）
kubectl set image deployment/myapp-deployment myapp=myapp:v2.0

# ローリングアップデート進行状況
kubectl rollout status deployment/myapp-deployment

# アップデート履歴
kubectl rollout history deployment/myapp-deployment

# ロールバック
kubectl rollout undo deployment/myapp-deployment
```

### 4. Service（ネットワーク）

Serviceは**Podへのアクセス方法を定義**します。Podは動的に生成・削除されるため、固定IPが必要。

#### ClusterIP（内部通信）

```yaml
# service-clusterip.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  type: ClusterIP  # デフォルト
  selector:
    app: myapp
  ports:
  - port: 80          # Serviceのポート
    targetPort: 8080  # Podのポート
```

```bash
kubectl apply -f service-clusterip.yaml

# クラスタ内から http://myapp-service でアクセス可能
```

#### NodePort（外部公開）

```yaml
# service-nodeport.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-nodeport
spec:
  type: NodePort
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30001  # 30000-32767の範囲
```

```bash
# ノードのIP:30001でアクセス可能
curl http://node-ip:30001
```

#### LoadBalancer（クラウド環境）

```yaml
# service-loadbalancer.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-lb
spec:
  type: LoadBalancer
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
```

AWS/GCP/Azureでは自動的にロードバランサーが作成されます。

### 5. Ingress（HTTPルーティング）

Ingressは**L7ロードバランサー**。URLパスやホスト名でルーティング。

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp-service
            port:
              number: 80

      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080

  - host: admin.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-service
            port:
              number: 3000
```

```bash
# Ingress Controllerをインストール（NGINX Ingress）
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.5/deploy/static/provider/cloud/deploy.yaml

# Ingress作成
kubectl apply -f ingress.yaml

# 確認
kubectl get ingress
```

### 6. ConfigMap（設定管理）

ConfigMapは**環境変数や設定ファイルを外部化**します。

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
data:
  APP_NAME: "My Application"
  LOG_LEVEL: "info"
  config.json: |
    {
      "database": {
        "host": "db.example.com",
        "port": 5432
      }
    }
```

```yaml
# deployment.yaml（ConfigMapを使用）
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:v1.0
        # 環境変数として読み込み
        envFrom:
        - configMapRef:
            name: myapp-config
        # ファイルとしてマウント
        volumeMounts:
        - name: config
          mountPath: /app/config
      volumes:
      - name: config
        configMap:
          name: myapp-config
          items:
          - key: config.json
            path: config.json
```

### 7. Secret（機密情報管理）

Secretは**パスワードやAPIキーを安全に保存**します。

```bash
# Secret作成（コマンド）
kubectl create secret generic db-secret \
  --from-literal=username=admin \
  --from-literal=password=secretpassword

# Secret作成（YAML）
echo -n 'admin' | base64  # YWRtaW4=
echo -n 'secretpassword' | base64  # c2VjcmV0cGFzc3dvcmQ=
```

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  username: YWRtaW4=
  password: c2VjcmV0cGFzc3dvcmQ=
```

```yaml
# deployment.yaml（Secretを使用）
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:v1.0
        env:
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
```

### 8. Volume（永続化）

PersistentVolumeとPersistentVolumeClaimで**データを永続化**します。

```yaml
# pvc.yaml（PersistentVolumeClaim）
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

```yaml
# deployment.yaml（PVCを使用）
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
        image: postgres:16
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: myapp-pvc
```

## 実践: Webアプリをデプロイ

### 構成

- **Frontend:** React (Nginx)
- **Backend:** Node.js
- **Database:** PostgreSQL

### 1. PostgreSQLデプロイ

```yaml
# postgres.yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
type: Opaque
data:
  password: cG9zdGdyZXM=  # "postgres" in base64

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi

---
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
        image: postgres:16
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: POSTGRES_DB
          value: myapp
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
```

### 2. Backendデプロイ

```yaml
# backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: myapp-backend:v1.0
        env:
        - name: DATABASE_URL
          value: postgresql://postgres@postgres:5432/myapp
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
  - port: 3000
```

### 3. Frontendデプロイ

```yaml
# frontend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: myapp-frontend:v1.0
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"

---
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  selector:
    app: frontend
  ports:
  - port: 80
```

### 4. Ingress設定

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

### デプロイ実行

```bash
# すべてデプロイ
kubectl apply -f postgres.yaml
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml
kubectl apply -f ingress.yaml

# 確認
kubectl get pods
kubectl get services
kubectl get ingress

# ログ確認
kubectl logs -f deployment/backend

# スケールアウト
kubectl scale deployment/backend --replicas=5

# ローリングアップデート
kubectl set image deployment/backend backend=myapp-backend:v2.0
```

## Auto Scaling（自動スケーリング）

### Horizontal Pod Autoscaler（HPA）

CPU使用率に応じてPod数を自動調整。

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```bash
kubectl apply -f hpa.yaml

# 確認
kubectl get hpa

# 負荷テスト
kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -- /bin/sh -c "while sleep 0.01; do wget -q -O- http://backend; done"

# HPAが自動でスケール
watch kubectl get hpa
```

## Namespaceで環境分離

```bash
# Namespace作成
kubectl create namespace dev
kubectl create namespace staging
kubectl create namespace production

# Namespace指定してデプロイ
kubectl apply -f deployment.yaml -n dev

# デフォルトNamespace変更
kubectl config set-context --current --namespace=dev

# すべてのNamespaceのPod確認
kubectl get pods --all-namespaces
```

## Helmでパッケージ管理

Helmは**Kubernetesのパッケージマネージャー**。複雑なアプリを簡単にデプロイできます。

```bash
# Helmインストール
brew install helm  # macOS
# または
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# チャート検索
helm search hub wordpress

# PostgreSQLインストール
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install my-postgres bitnami/postgresql

# 自作チャート作成
helm create myapp

# インストール
helm install myapp ./myapp

# アップグレード
helm upgrade myapp ./myapp

# ロールバック
helm rollback myapp

# アンインストール
helm uninstall myapp
```

## ローカル開発環境

### Minikube（学習用）

```bash
# インストール（macOS）
brew install minikube

# 起動
minikube start

# ダッシュボード
minikube dashboard

# 停止
minikube stop
```

### Kind（Kubernetes in Docker）

```bash
# インストール
brew install kind

# クラスタ作成
kind create cluster --name dev

# 確認
kubectl cluster-info --context kind-dev

# 削除
kind delete cluster --name dev
```

### k3s（軽量Kubernetes）

```bash
# インストール（Linux）
curl -sfL https://get.k3s.io | sh -

# 確認
sudo k3s kubectl get nodes
```

## 監視とロギング

### Promethe us + Grafana

```bash
# Helmでインストール
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Grafana UI アクセス
kubectl port-forward svc/prometheus-grafana 3000:80
# http://localhost:3000
# user: admin, password: prom-operator
```

### ELKスタック（Elasticsearch + Logstash + Kibana）

```bash
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch
helm install kibana elastic/kibana
```

## トラブルシューティング

```bash
# Pod状態確認
kubectl get pods
kubectl describe pod <pod-name>

# ログ確認
kubectl logs <pod-name>
kubectl logs -f <pod-name>  # リアルタイム
kubectl logs <pod-name> --previous  # 前回のログ

# Podに接続
kubectl exec -it <pod-name> -- /bin/sh

# イベント確認
kubectl get events --sort-by='.lastTimestamp'

# リソース使用状況
kubectl top nodes
kubectl top pods

# デバッグPod起動
kubectl run debug --image=busybox --rm -it -- /bin/sh
```

## ベストプラクティス

### 1. リソース制限を設定

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```

### 2. Health Checkを設定

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

### 3. ラベルを活用

```yaml
metadata:
  labels:
    app: myapp
    tier: backend
    environment: production
    version: v1.0
```

### 4. 機密情報はSecretで管理

```yaml
# ❌ 悪い例
env:
- name: API_KEY
  value: "secret-api-key-12345"

# ✅ 良い例
env:
- name: API_KEY
  valueFrom:
    secretKeyRef:
      name: api-secrets
      key: api-key
```

### 5. PodDisruptionBudget設定

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: myapp
```

## まとめ

Kubernetesの基本概念:

- **Pod:** コンテナの集まり（最小単位）
- **Deployment:** Podのバージョン管理
- **Service:** ネットワークアクセス
- **Ingress:** HTTPルーティング
- **ConfigMap/Secret:** 設定・機密情報
- **Volume:** データ永続化

学習ステップ:
1. Minikubeでローカル環境構築
2. 基本リソース（Pod/Deployment/Service）を理解
3. 実際のアプリをデプロイ
4. Helmで効率化
5. 監視・ロギング整備

Kubernetes開発に役立つツールを探しているなら、[DevToolBox](https://devtoolbox.app)もチェックしてみてください。YAMLフォーマッターやJSON変換など、開発効率を上げるツールが揃っています。
