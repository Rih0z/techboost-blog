---
title: "コンテナセキュリティベストプラクティス: DockerとKubernetesの安全な運用"
description: "Dockerコンテナのセキュリティ強化から、Kubernetesクラスタの本番運用まで。イメージスキャン、脆弱性管理、ランタイムセキュリティ、ネットワークポリシー、シークレット管理の実践的なガイド。Docker・Kubernetes・セキュリティに関する実践情報。"
pubDate: "2025-07-28"
updatedDate: "2025-07-28"
tags: ["Docker", "Kubernetes", "セキュリティ", "DevSecOps", "インフラ"]
heroImage: '../../assets/thumbnails/container-security-best-practices.jpg'
---
コンテナ技術の普及により、セキュリティ対策も進化しています。この記事では、**Dockerイメージのセキュア化**から**Kubernetes本番環境での防御戦略**まで、実践的なセキュリティ対策を解説します。

## コンテナセキュリティの基本原則

### セキュリティの4つの層

1. **イメージセキュリティ**: ベースイメージ、依存関係、ビルドプロセス
2. **ランタイムセキュリティ**: 実行時の制限、分離、監視
3. **ネットワークセキュリティ**: 通信の暗号化、アクセス制御
4. **オーケストレーションセキュリティ**: RBAC、ポリシー、シークレット管理

## Dockerイメージのセキュア化

### 最小限のベースイメージを選択

```dockerfile
# ❌ 悪い例: フルOSイメージ（大きい、脆弱性多い）
FROM ubuntu:latest

RUN apt-get update && apt-get install -y nodejs npm

COPY . /app
WORKDIR /app
RUN npm install
CMD ["node", "server.js"]

# ✅ 良い例: Alpine Linux（小さい、最小限）
FROM node:20-alpine

# セキュリティアップデートを適用
RUN apk update && apk upgrade

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

USER node
CMD ["node", "server.js"]
```

### マルチステージビルドで攻撃面を削減

```dockerfile
# ビルドステージ
FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 本番ステージ（最小限）
FROM node:20-alpine AS production

# セキュリティアップデート
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init

# 非rootユーザーを作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# ビルド成果物のみコピー
COPY --from=builder --chown=nodejs:nodejs /build/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /build/package.json ./

USER nodejs

EXPOSE 3000

# dumb-initでゾンビプロセスを防ぐ
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### 脆弱性スキャンの統合

```dockerfile
# .github/workflows/docker-security.yml
name: Docker Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run Snyk container scan
        uses: snyk/actions/docker@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          image: 'myapp:${{ github.sha }}'
          args: --severity-threshold=high

      - name: Fail on vulnerabilities
        run: |
          if [ -s trivy-results.sarif ]; then
            echo "❌ Vulnerabilities found!"
            exit 1
          fi
```

### イメージの署名と検証

```bash
# Docker Content Trust（DCT）を有効化
export DOCKER_CONTENT_TRUST=1

# イメージに署名してプッシュ
docker trust sign myregistry.io/myapp:v1.0.0

# 署名を検証
docker trust inspect --pretty myregistry.io/myapp:v1.0.0

# Notaryを使った検証（Kubernetes）
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: signed-app
spec:
  containers:
  - name: app
    image: myregistry.io/myapp:v1.0.0
    imagePullPolicy: Always
  imagePullSecrets:
  - name: registry-credentials
EOF
```

### Hadolintによる静的解析

```bash
# Hadolintのインストール
brew install hadolint

# Dockerfileの静的解析
hadolint Dockerfile

# CI/CDに統合
# .github/workflows/dockerfile-lint.yml
name: Dockerfile Lint

on: [push, pull_request]

jobs:
  hadolint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: hadolint/hadolint-action@v3.1.0
        with:
          dockerfile: Dockerfile
          failure-threshold: warning
```

## ランタイムセキュリティ

### Dockerランタイム制限

```yaml
# docker-compose.yml（セキュア設定）
version: '3.8'

services:
  app:
    image: myapp:latest

    # 読み取り専用のルートファイルシステム
    read_only: true

    # 一時ファイル用のtmpfs
    tmpfs:
      - /tmp
      - /var/cache

    # capabilities を最小限に
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # ポート80/443バインドのみ

    # seccompプロファイル
    security_opt:
      - no-new-privileges:true
      - seccomp:./seccomp-profile.json

    # リソース制限
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

    # ネットワーク分離
    networks:
      - backend

    # 環境変数はシークレットから
    environment:
      - NODE_ENV=production
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    external: true
  api_key:
    external: true

networks:
  backend:
    driver: bridge
    internal: true  # 外部アクセス不可
```

### Seccompプロファイル

```json
// seccomp-profile.json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": [
    "SCMP_ARCH_X86_64",
    "SCMP_ARCH_X86",
    "SCMP_ARCH_AARCH64"
  ],
  "syscalls": [
    {
      "names": [
        "accept4",
        "bind",
        "connect",
        "epoll_create1",
        "epoll_ctl",
        "epoll_wait",
        "listen",
        "read",
        "write",
        "close",
        "open",
        "openat",
        "stat",
        "fstat",
        "lstat",
        "socket",
        "mmap",
        "munmap",
        "brk",
        "exit_group"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

### AppArmorプロファイル

```bash
# /etc/apparmor.d/docker-myapp
#include <tunables/global>

profile docker-myapp flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>

  # ネットワークアクセス
  network inet tcp,
  network inet udp,

  # ファイルシステムアクセス
  /app/** r,
  /tmp/** rw,
  /var/cache/** rw,

  # 実行可能ファイル
  /usr/bin/node ix,

  # 禁止事項
  deny /proc/sys/** w,
  deny /sys/** w,
  deny /** x,
}
```

## Kubernetesセキュリティ

### Pod Security Standards

```yaml
# 名前空間にPod Security Standardsを適用
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### セキュアなPod設定

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: production
spec:
  # サービスアカウント（自動マウントしない）
  serviceAccountName: app-service-account
  automountServiceAccountToken: false

  # securityContext（Pod レベル）
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault

  containers:
  - name: app
    image: myregistry.io/myapp:v1.0.0
    imagePullPolicy: Always

    # securityContext（コンテナレベル）
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
          - ALL
        add:
          - NET_BIND_SERVICE

    # リソース制限
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"

    # 環境変数（シークレットから）
    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: password

    # ヘルスチェック
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

    # 一時ファイル用のボリューム
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /var/cache

  volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}

  imagePullSecrets:
  - name: registry-credentials
```

### Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp

  policyTypes:
  - Ingress
  - Egress

  ingress:
  # Ingressコントローラーからのみ受信
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080

  egress:
  # データベースへの接続のみ許可
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432

  # 外部APIへのHTTPS接続を許可
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443

  # DNS解決を許可
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

### RBAC設定

```yaml
# サービスアカウント
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  namespace: production

---
# ロール（最小権限）
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-role
  namespace: production
rules:
# ConfigMapの読み取りのみ
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
  resourceNames: ["app-config"]

# Secretの読み取りのみ
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["db-credentials", "api-keys"]

---
# ロールバインディング
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-role-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: app-service-account
  namespace: production
roleRef:
  kind: Role
  name: app-role
  apiGroup: rbac.authorization.k8s.io
```

### シークレット管理

```yaml
# External Secrets Operator を使用
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: 1h

  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore

  target:
    name: app-secrets
    creationPolicy: Owner

  data:
  - secretKey: db-password
    remoteRef:
      key: production/db/password

  - secretKey: api-key
    remoteRef:
      key: production/api/key

---
# SecretStoreの定義（AWS Secrets Manager）
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: ap-northeast-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
```

### Admission Controller（OPA Gatekeeper）

```yaml
# ポリシー: 必ずリソース制限を設定
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredresources
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredResources
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredresources

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.memory
          msg := sprintf("Container %v must have memory limits", [container.name])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.cpu
          msg := sprintf("Container %v must have CPU limits", [container.name])
        }

---
# 制約を適用
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredResources
metadata:
  name: must-have-resources
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - production
```

## ランタイムセキュリティモニタリング

### Falcoによる異常検知

```yaml
# falco-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-config
  namespace: falco
data:
  falco.yaml: |
    rules_file:
      - /etc/falco/falco_rules.yaml
      - /etc/falco/custom_rules.yaml

    json_output: true
    log_stderr: true
    log_syslog: false

    priority: warning

    outputs:
      rate: 1
      max_burst: 1000

  custom_rules.yaml: |
    - rule: Unauthorized Process in Container
      desc: Detect unexpected process execution
      condition: >
        spawned_process and
        container and
        not proc.name in (node, npm, sh, bash)
      output: >
        Unauthorized process started in container
        (user=%user.name command=%proc.cmdline container=%container.name)
      priority: WARNING
      tags: [container, process]

    - rule: Sensitive File Access
      desc: Detect access to sensitive files
      condition: >
        open_read and
        container and
        fd.name in (/etc/shadow, /etc/passwd, /root/.ssh/*)
      output: >
        Sensitive file accessed
        (user=%user.name file=%fd.name container=%container.name)
      priority: CRITICAL
      tags: [filesystem, security]

---
# FalcoのDaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: falco
  namespace: falco
spec:
  selector:
    matchLabels:
      app: falco
  template:
    metadata:
      labels:
        app: falco
    spec:
      serviceAccountName: falco
      hostNetwork: true
      hostPID: true
      containers:
      - name: falco
        image: falcosecurity/falco:latest
        securityContext:
          privileged: true
        volumeMounts:
        - name: docker-socket
          mountPath: /host/var/run/docker.sock
        - name: dev
          mountPath: /host/dev
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: boot
          mountPath: /host/boot
          readOnly: true
        - name: lib-modules
          mountPath: /host/lib/modules
          readOnly: true
        - name: usr
          mountPath: /host/usr
          readOnly: true
        - name: etc
          mountPath: /host/etc
          readOnly: true
        - name: config
          mountPath: /etc/falco
      volumes:
      - name: docker-socket
        hostPath:
          path: /var/run/docker.sock
      - name: dev
        hostPath:
          path: /dev
      - name: proc
        hostPath:
          path: /proc
      - name: boot
        hostPath:
          path: /boot
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: usr
        hostPath:
          path: /usr
      - name: etc
        hostPath:
          path: /etc
      - name: config
        configMap:
          name: falco-config
```

## イメージスキャンの自動化

```yaml
# Trivy Operator for Kubernetes
apiVersion: v1
kind: Namespace
metadata:
  name: trivy-system

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trivy-operator
  namespace: trivy-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: trivy-operator
  template:
    metadata:
      labels:
        app: trivy-operator
    spec:
      serviceAccountName: trivy-operator
      containers:
      - name: operator
        image: aquasecurity/trivy-operator:latest
        env:
        - name: OPERATOR_NAMESPACE
          value: trivy-system
        - name: OPERATOR_TARGET_NAMESPACES
          value: production
        - name: OPERATOR_SCANNER_TRIVY_SEVERITY
          value: CRITICAL,HIGH

---
# VulnerabilityReportのカスタムリソース
apiVersion: aquasecurity.github.io/v1alpha1
kind: VulnerabilityReport
metadata:
  name: pod-myapp-abc123
  namespace: production
spec:
  artifact:
    repository: myregistry.io/myapp
    tag: v1.0.0
  registry:
    server: myregistry.io
  scanner:
    name: Trivy
    vendor: Aqua Security
    version: 0.40.0
  summary:
    criticalCount: 0
    highCount: 2
    mediumCount: 5
    lowCount: 10
```

## まとめ

コンテナセキュリティの実践的なベストプラクティスを紹介しました。

### セキュリティチェックリスト

**イメージセキュリティ**
- [ ] 最小限のベースイメージを使用
- [ ] マルチステージビルドで攻撃面を削減
- [ ] 脆弱性スキャンをCI/CDに統合
- [ ] イメージに署名と検証

**ランタイムセキュリティ**
- [ ] 読み取り専用のルートファイルシステム
- [ ] 最小限のcapabilities
- [ ] seccompプロファイルを適用
- [ ] 非rootユーザーで実行

**Kubernetesセキュリティ**
- [ ] Pod Security Standards を適用
- [ ] Network Policyでネットワーク分離
- [ ] RBACで最小権限の原則
- [ ] シークレットを外部管理（Vault, AWS Secrets Manager）
- [ ] Admission Controllerでポリシー強制

**モニタリング**
- [ ] Falcoでランタイム監視
- [ ] Trivy Operatorで継続的スキャン
- [ ] ログとメトリクスの収集

セキュリティは**継続的なプロセス**です。定期的な見直しと改善を行いましょう。

### 参考リンク

- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [NIST Application Container Security Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf)
- [Falco Documentation](https://falco.org/docs/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
