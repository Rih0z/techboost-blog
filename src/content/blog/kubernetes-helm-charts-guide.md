---
title: "Kubernetes Helmチャート実践ガイド — テンプレート、Values、依存関係管理"
description: "Helm 3を使ったKubernetesパッケージ管理の完全ガイド。チャート作成、テンプレート構文、values.yaml設計、依存関係管理、リリース運用、ベストプラクティスまで実践的に解説。Kubernetes・Helm・DevOpsに関する実践情報。"
pubDate: "2026-02-06"
tags: ["Kubernetes", "Helm", "DevOps", "インフラ", "コンテナ", "YAML"]
heroImage: '../../assets/thumbnails/kubernetes-helm-charts-guide.jpg'
---
Helmは、Kubernetesアプリケーションをパッケージ化・管理するための事実上の標準ツールです。

この記事では、Helm 3の基礎から、チャート作成、テンプレート設計、本番運用まで、実践的な内容を詳しく解説します。

## Helmとは

### Helmの役割

**Helmがない場合:**
```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
# 環境ごとに手動で値を書き換える...
```

**Helmがある場合:**
```bash
helm install myapp ./mychart -f values-prod.yaml
# 一発でデプロイ、バージョン管理、ロールバックも可能
```

### Helm 3の主な変更点

- **Tillerの廃止**: Helm 2のサーバーコンポーネントが不要に
- **3-way merge**: より安全なアップグレード
- **Secrets管理の改善**: リリース情報がSecretに保存
- **ライブラリチャート**: 共通テンプレートの再利用

## Helmのインストール

### インストール方法

```bash
# macOS (Homebrew)
brew install helm

# Linux (スクリプト)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Windows (Chocolatey)
choco install kubernetes-helm

# バージョン確認
helm version
```

### リポジトリの追加

```bash
# 公式リポジトリを追加
helm repo add stable https://charts.helm.sh/stable
helm repo add bitnami https://charts.bitnami.com/bitnami

# リポジトリの更新
helm repo update

# リポジトリ一覧
helm repo list
```

## チャートの基本構造

### チャートの作成

```bash
helm create myapp
```

生成されるディレクトリ構造:

```
myapp/
├── Chart.yaml           # チャートのメタデータ
├── values.yaml          # デフォルト設定値
├── charts/              # 依存チャート
├── templates/           # Kubernetesマニフェストテンプレート
│   ├── NOTES.txt        # インストール後のメッセージ
│   ├── _helpers.tpl     # テンプレートヘルパー
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── serviceaccount.yaml
│   └── hpa.yaml
└── .helmignore          # パッケージ化時の除外ファイル
```

### Chart.yaml の構成

```yaml
# Chart.yaml
apiVersion: v2
name: myapp
description: A Helm chart for my application
type: application  # application or library
version: 0.1.0     # チャートのバージョン
appVersion: "1.0"  # アプリケーションのバージョン

maintainers:
  - name: Your Name
    email: you@example.com
    url: https://example.com

keywords:
  - web
  - nodejs
  - microservice

home: https://github.com/example/myapp
sources:
  - https://github.com/example/myapp

dependencies:
  - name: postgresql
    version: 12.1.0
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
```

## values.yaml の設計

### 基本的な構造

```yaml
# values.yaml
replicaCount: 2

image:
  repository: myapp
  pullPolicy: IfNotPresent
  tag: "1.0.0"

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations: {}
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000

securityContext:
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: false
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
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
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

nodeSelector: {}
tolerations: []
affinity: {}

env:
  - name: NODE_ENV
    value: production
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: url

postgresql:
  enabled: true
  auth:
    username: myapp
    password: changeme
    database: myapp
```

### 環境別のvalues

```yaml
# values-dev.yaml
replicaCount: 1

image:
  tag: "latest"

resources:
  limits:
    cpu: 200m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi

ingress:
  enabled: true
  hosts:
    - host: myapp-dev.example.com
      paths:
        - path: /
          pathType: Prefix

postgresql:
  enabled: true
  auth:
    password: dev-password
```

```yaml
# values-prod.yaml
replicaCount: 3

image:
  tag: "1.0.0"

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: true
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: myapp-tls
      hosts:
        - myapp.example.com

postgresql:
  enabled: false  # 外部のマネージドDBを使用
```

## テンプレート構文

### 基本的な変数展開

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      {{- with .Values.podAnnotations }}
      annotations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "myapp.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
      - name: {{ .Chart.Name }}
        securityContext:
          {{- toYaml .Values.securityContext | nindent 12 }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - name: http
          containerPort: {{ .Values.service.targetPort }}
          protocol: TCP
        env:
        {{- toYaml .Values.env | nindent 8 }}
        resources:
          {{- toYaml .Values.resources | nindent 12 }}
```

### 条件分岐

```yaml
# templates/ingress.yaml
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "myapp.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
```

### ヘルパーテンプレート

```yaml
# templates/_helpers.tpl
{{/*
Expand the name of the chart.
*/}}
{{- define "myapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "myapp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "myapp.labels" -}}
helm.sh/chart: {{ include "myapp.chart" . }}
{{ include "myapp.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "myapp.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "myapp.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
```

## 依存関係の管理

### Chart.yaml での依存定義

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.1.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
    tags:
      - database

  - name: redis
    version: "17.3.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
    tags:
      - cache

  - name: common
    version: "2.x.x"
    repository: "https://charts.bitnami.com/bitnami"
```

### 依存チャートの更新

```bash
# 依存関係をダウンロード
helm dependency update

# 依存関係の確認
helm dependency list

# charts/ ディレクトリが生成される
myapp/
├── charts/
│   ├── postgresql-12.1.0.tgz
│   └── redis-17.3.0.tgz
└── Chart.lock
```

### 依存チャートの設定

```yaml
# values.yaml
postgresql:
  enabled: true
  auth:
    username: myapp
    password: changeme
    database: myapp
  primary:
    persistence:
      enabled: true
      size: 10Gi

redis:
  enabled: true
  auth:
    enabled: false
  master:
    persistence:
      enabled: false
```

## リリースの管理

### インストール

```bash
# 基本的なインストール
helm install myapp ./myapp

# values ファイルを指定
helm install myapp ./myapp -f values-prod.yaml

# コマンドラインで値を上書き
helm install myapp ./myapp \
  --set replicaCount=3 \
  --set image.tag=2.0.0

# 名前空間を指定
helm install myapp ./myapp -n production --create-namespace

# ドライラン（実際にはインストールしない）
helm install myapp ./myapp --dry-run --debug
```

### アップグレード

```bash
# 基本的なアップグレード
helm upgrade myapp ./myapp

# values を更新してアップグレード
helm upgrade myapp ./myapp -f values-prod.yaml

# インストールされていなければインストール
helm upgrade --install myapp ./myapp

# 強制的に再作成
helm upgrade myapp ./myapp --force

# アップグレード前に待機
helm upgrade myapp ./myapp --wait --timeout 5m
```

### ロールバック

```bash
# 直前のバージョンにロールバック
helm rollback myapp

# 特定のリビジョンにロールバック
helm rollback myapp 3

# ドライランで確認
helm rollback myapp 3 --dry-run
```

### 履歴の確認

```bash
# リリース履歴を表示
helm history myapp

# 出力例:
# REVISION  UPDATED                   STATUS      CHART         APP VERSION  DESCRIPTION
# 1         Mon Jan 1 00:00:00 2026   superseded  myapp-0.1.0   1.0          Install complete
# 2         Mon Jan 2 00:00:00 2026   superseded  myapp-0.1.1   1.1          Upgrade complete
# 3         Mon Jan 3 00:00:00 2026   deployed    myapp-0.2.0   2.0          Upgrade complete
```

### アンインストール

```bash
# リリースを削除
helm uninstall myapp

# 履歴を保持して削除
helm uninstall myapp --keep-history
```

## テストとデバッグ

### テンプレートの検証

```bash
# テンプレートをレンダリング
helm template myapp ./myapp

# 特定の values で確認
helm template myapp ./myapp -f values-prod.yaml

# 出力を保存
helm template myapp ./myapp > rendered.yaml

# 特定のテンプレートのみ表示
helm template myapp ./myapp -s templates/deployment.yaml
```

### Lintチェック

```bash
# チャートの構文チェック
helm lint ./myapp

# 出力例:
# ==> Linting ./myapp
# [INFO] Chart.yaml: icon is recommended
# [WARNING] templates/: directory not found
# 1 chart(s) linted, 0 chart(s) failed
```

### デバッグモード

```bash
# 詳細なデバッグ情報を表示
helm install myapp ./myapp --debug

# ドライランと組み合わせ
helm install myapp ./myapp --dry-run --debug
```

## ベストプラクティス

### 1. 値の階層構造

```yaml
# ❌ 悪い例
deploymentReplicas: 3
deploymentImage: myapp:1.0
deploymentPort: 3000

# ✅ 良い例
deployment:
  replicas: 3
  image: myapp:1.0
  port: 3000
```

### 2. デフォルト値の提供

```yaml
# values.yaml
replicaCount: 2  # 必ず妥当なデフォルト値を設定

# templates/deployment.yaml
replicas: {{ .Values.replicaCount | default 1 }}
```

### 3. リソース制限の設定

```yaml
# 必ずリソース制限を設定
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
```

### 4. セキュリティ設定

```yaml
# セキュリティコンテキストを設定
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000

securityContext:
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
```

### 5. 環境変数の管理

```yaml
# ConfigMapとSecretを分離
env:
  - name: NODE_ENV
    value: production
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: url
```

## まとめ

Helmは、Kubernetesアプリケーションの管理を大幅に簡素化します。

**主なメリット:**
- パッケージ化とバージョン管理
- 環境別の設定管理
- 依存関係の自動解決
- ロールバック機能
- 再利用可能なテンプレート

**ベストプラクティス:**
- 明確なvalues.yaml構造
- 環境別のvaluesファイル
- セキュリティ設定の徹底
- リソース制限の設定
- 適切なラベリング

Helmをマスターすれば、Kubernetesアプリケーションの運用が格段に楽になります。
