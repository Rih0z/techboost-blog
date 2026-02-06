---
title: "Kubernetes Gateway API完全ガイド"
description: "次世代のKubernetesルーティング、Gateway APIの概念から実装まで徹底解説"
pubDate: "2025-02-05"
---

Kubernetes Gateway APIは、従来のIngressを置き換える次世代のルーティングAPIです。より表現力が高く、ロールベースで、ベンダー拡張にも対応した設計になっています。本記事では、Gateway APIの基本概念から実践的な実装例、TLS設定、トラフィック分割まで徹底的に解説します。

## Gateway APIとは

Gateway APIは、Kubernetesクラスタへの外部トラフィックをルーティングするための新しいAPIセットです。IngressとService meshの中間に位置し、より柔軟で強力な機能を提供します。

### 従来のIngressとの違い

```yaml
# 従来のIngress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /app
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

```yaml
# Gateway API
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: example-route
spec:
  parentRefs:
  - name: example-gateway
  hostnames:
  - "example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /app
    backendRefs:
    - name: app-service
      port: 80
```

### 主な利点

1. **ロールベースの設計**: インフラ管理者とアプリ開発者の責務を分離
2. **表現力の向上**: より複雑なルーティングロジックが可能
3. **ポータビリティ**: ベンダー固有のアノテーションが不要
4. **拡張性**: カスタムリソースで機能を拡張可能
5. **型安全**: アノテーションではなく、構造化されたフィールド

## Gateway APIの主要コンセプト

Gateway APIは、3つの主要なリソースで構成されています。

### GatewayClass

GatewayClassは、ゲートウェイの実装を定義します。インフラ管理者が管理します。

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx-gateway-class
spec:
  controllerName: nginx.org/gateway-controller
  description: "NGINX Gateway Controller"
  parametersRef:
    group: gateway.nginx.org
    kind: NginxGateway
    name: nginx-config
```

主要なGatewayClass実装:

- **NGINX Gateway Fabric**: nginx.org/gateway-controller
- **Istio**: istio.io/gateway-controller
- **Envoy Gateway**: gateway.envoyproxy.io/gatewayclass-controller
- **Kong**: konghq.com/gateway-controller
- **Traefik**: traefik.io/gateway-controller

### Gateway

Gatewayは、実際のロードバランサーやプロキシインスタンスを表します。インフラ管理者が管理します。

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: example-gateway
  namespace: default
spec:
  gatewayClassName: nginx-gateway-class
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: example-tls-secret
    allowedRoutes:
      namespaces:
        from: All
```

### HTTPRoute

HTTPRouteは、HTTPトラフィックのルーティングルールを定義します。アプリケーション開発者が管理します。

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: example-route
  namespace: default
spec:
  parentRefs:
  - name: example-gateway
  hostnames:
  - "example.com"
  - "www.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 8080
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: frontend-service
      port: 80
```

## 実践的な実装例

### 基本的なHTTPルーティング

```yaml
# GatewayClassの作成（クラスタ管理者）
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx-gateway
spec:
  controllerName: nginx.org/gateway-controller
---
# Gatewayの作成（インフラ管理者）
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: gateway-system
spec:
  gatewayClassName: nginx-gateway
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
---
# HTTPRouteの作成（アプリ開発者）
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-route
  namespace: my-app
spec:
  parentRefs:
  - name: production-gateway
    namespace: gateway-system
  hostnames:
  - "myapp.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/v1
    backendRefs:
    - name: api-v1-service
      port: 8080
  - matches:
    - path:
        type: PathPrefix
        value: /api/v2
    backendRefs:
    - name: api-v2-service
      port: 8080
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: frontend-service
      port: 3000
```

### パスベースルーティング

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: path-based-routing
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "services.example.com"
  rules:
  # 完全一致
  - matches:
    - path:
        type: Exact
        value: /admin
    backendRefs:
    - name: admin-service
      port: 8080
  # プレフィックス一致
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 8080
  # 正規表現一致
  - matches:
    - path:
        type: RegularExpression
        value: /user/[0-9]+
    backendRefs:
    - name: user-service
      port: 8080
  # デフォルトルート
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: default-service
      port: 80
```

### ヘッダーベースルーティング

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-based-routing
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  # APIバージョンヘッダーでルーティング
  - matches:
    - headers:
      - name: X-API-Version
        value: "v2"
    backendRefs:
    - name: api-v2-service
      port: 8080
  # デフォルト（v1）
  - matches:
    - headers:
      - name: X-API-Version
        value: "v1"
    backendRefs:
    - name: api-v1-service
      port: 8080
  # カナリアデプロイ用
  - matches:
    - headers:
      - name: X-Canary
        value: "true"
    backendRefs:
    - name: canary-service
      port: 8080
```

### クエリパラメータベースルーティング

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: query-based-routing
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - queryParams:
      - name: version
        value: "beta"
    backendRefs:
    - name: beta-service
      port: 8080
  - matches:
    - queryParams:
      - name: version
        value: "stable"
    backendRefs:
    - name: stable-service
      port: 8080
```

## TLS設定

### HTTPS終端

```yaml
# TLS証明書のSecretを作成
apiVersion: v1
kind: Secret
metadata:
  name: example-tls
  namespace: gateway-system
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
---
# GatewayでTLS終端を設定
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: tls-gateway
  namespace: gateway-system
spec:
  gatewayClassName: nginx-gateway
  listeners:
  # HTTPSリスナー
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: example-tls
    allowedRoutes:
      namespaces:
        from: All
  # HTTPリスナー（HTTPSへリダイレクト）
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
---
# HTTPRoute（HTTPSのみ）
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: secure-route
spec:
  parentRefs:
  - name: tls-gateway
    namespace: gateway-system
    sectionName: https
  hostnames:
  - "secure.example.com"
  rules:
  - backendRefs:
    - name: secure-service
      port: 8080
```

### 複数ドメインのTLS設定

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-domain-gateway
spec:
  gatewayClassName: nginx-gateway
  listeners:
  # ドメイン1用のHTTPSリスナー
  - name: https-domain1
    protocol: HTTPS
    port: 443
    hostname: "domain1.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: domain1-tls
    allowedRoutes:
      namespaces:
        from: All
  # ドメイン2用のHTTPSリスナー
  - name: https-domain2
    protocol: HTTPS
    port: 443
    hostname: "domain2.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: domain2-tls
    allowedRoutes:
      namespaces:
        from: All
```

### TLSパススルー

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: passthrough-gateway
spec:
  gatewayClassName: nginx-gateway
  listeners:
  - name: tls-passthrough
    protocol: TLS
    port: 443
    tls:
      mode: Passthrough
    allowedRoutes:
      kinds:
      - kind: TLSRoute
---
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: secure-app-route
spec:
  parentRefs:
  - name: passthrough-gateway
  hostnames:
  - "secure-app.example.com"
  rules:
  - backendRefs:
    - name: secure-app-service
      port: 443
```

## トラフィック分割とカナリアデプロイ

### 重み付けトラフィック分割

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: weighted-traffic
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    # 90%のトラフィックを安定版へ
    - name: stable-service
      port: 8080
      weight: 90
    # 10%のトラフィックをカナリア版へ
    - name: canary-service
      port: 8080
      weight: 10
```

### 段階的カナリアデプロイ

```yaml
# フェーズ1: 5%のトラフィックをカナリアへ
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-phase1
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: stable-v1
      port: 8080
      weight: 95
    - name: canary-v2
      port: 8080
      weight: 5
---
# フェーズ2: 50%のトラフィックをカナリアへ
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-phase2
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: stable-v1
      port: 8080
      weight: 50
    - name: canary-v2
      port: 8080
      weight: 50
---
# フェーズ3: 100%のトラフィックをカナリアへ
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-phase3
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: canary-v2
      port: 8080
      weight: 100
```

### ヘッダーベースカナリア

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-canary
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "app.example.com"
  rules:
  # 特定のユーザーをカナリアへ
  - matches:
    - headers:
      - name: X-User-Group
        value: "beta-testers"
    backendRefs:
    - name: canary-service
      port: 8080
  # それ以外は安定版へ
  - backendRefs:
    - name: stable-service
      port: 8080
```

## リクエスト変換とリダイレクト

### URLリライト

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: url-rewrite
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /v1/users
    filters:
    - type: URLRewrite
      urlRewrite:
        path:
          type: ReplacePrefixMatch
          replacePrefixMatch: /api/users
    backendRefs:
    - name: user-service
      port: 8080
```

### リダイレクト

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: redirect-route
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "old.example.com"
  rules:
  # HTTPSへリダイレクト
  - filters:
    - type: RequestRedirect
      requestRedirect:
        scheme: https
        statusCode: 301
  # 新しいドメインへリダイレクト
  - matches:
    - path:
        type: PathPrefix
        value: /old-path
    filters:
    - type: RequestRedirect
      requestRedirect:
        hostname: "new.example.com"
        path:
          type: ReplacePrefixMatch
          replacePrefixMatch: /new-path
        statusCode: 301
```

### ヘッダー操作

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-manipulation
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    filters:
    # ヘッダーを追加
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: X-Custom-Header
          value: "custom-value"
        - name: X-Request-ID
          value: "${request.id}"
        # ヘッダーを削除
        remove:
        - "X-Internal-Debug"
        # ヘッダーを上書き
        set:
        - name: X-API-Version
          value: "v1"
    backendRefs:
    - name: api-service
      port: 8080
```

## タイムアウトとリトライ

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: timeout-retry
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    timeouts:
      # リクエストタイムアウト
      request: 30s
      # バックエンド接続タイムアウト
      backendRequest: 10s
    backendRefs:
    - name: api-service
      port: 8080
```

## まとめ

Kubernetes Gateway APIは、従来のIngressを大幅に進化させた次世代のルーティングAPIです。主な利点は以下の通りです。

- **ロールベース**: インフラとアプリの責務分離
- **表現力**: 複雑なルーティングロジックに対応
- **ポータビリティ**: ベンダー固有の設定が不要
- **拡張性**: カスタムリソースで機能拡張可能
- **実用性**: TLS、トラフィック分割、リクエスト変換など充実

Gateway APIは、Kubernetes 1.29でGA（Generally Available）となり、本番環境での使用が推奨されています。今後のKubernetesルーティングのスタンダードとして、積極的に採用を検討する価値があります。
