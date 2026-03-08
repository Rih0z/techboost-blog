---
title: "Kubernetesオペレーター開発完全ガイド"
description: "Kubernetes Operatorパターンの基礎から、Kubebuilderを使った実装、本番運用まで、実践的なカスタムコントローラーの開発方法を解説します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-05"
tags: ['Kubernetes', 'インフラ', '開発ツール']
heroImage: '../../assets/thumbnails/kubernetes-operators-guide.jpg'
---

Kubernetes Operatorパターンは、Kubernetesの拡張性を最大限に活用し、複雑なアプリケーションのライフサイクル管理を自動化する強力な手法です。本記事では、Operatorの基礎概念から、Kubebuilderを使った実装、本番環境での運用まで、実践的な開発方法を詳しく解説します。

## Kubernetes Operatorとは

Kubernetes Operatorは、Kubernetesの拡張機能として動作するカスタムコントローラーです。人間のオペレーターが行うような運用知識をコードに落とし込み、アプリケーションのデプロイ、スケーリング、バックアップ、復旧などを自動化します。

### Operatorパターンの3つの要素

1. **Custom Resource Definition (CRD)**: 独自のリソースタイプを定義
2. **Custom Controller**: CRDの変更を監視し、実際の状態を望ましい状態に近づける
3. **Operator Logic**: アプリケーション固有の運用知識を実装

### なぜOperatorが必要なのか

標準のKubernetesリソース（Deployment、Serviceなど）は汎用的な機能を提供しますが、データベースのレプリケーション設定、分散システムのクラスタリング、アプリケーション固有のバックアップ戦略など、複雑な運用ロジックには対応できません。Operatorを使うことで、これらの専門知識をコードとして表現し、自動化できます。

## 開発環境のセットアップ

Kubernetesオペレーターの開発には、以下のツールが必要です。

```bash
# Go 1.21以上のインストール
brew install go

# Kubebuilderのインストール
curl -L -o kubebuilder https://go.kubebuilder.io/dl/latest/$(go env GOOS)/$(go env GOARCH)
chmod +x kubebuilder && mv kubebuilder /usr/local/bin/

# kubectl、kind（ローカルKubernetesクラスタ）のインストール
brew install kubectl kind

# ローカルクラスタの作成
kind create cluster --name operator-dev
```

## Kubebuilderプロジェクトの初期化

Kubebuilderは、Operator開発のためのフレームワークで、プロジェクトのスキャフォールディング、CRDの生成、コントローラーのボイラープレートコードを自動生成します。

```bash
# 新しいプロジェクトの作成
mkdir webapp-operator && cd webapp-operator
kubebuilder init --domain example.com --repo github.com/myorg/webapp-operator

# APIとコントローラーの作成
kubebuilder create api --group apps --version v1alpha1 --kind WebApp
```

このコマンドを実行すると、以下のような構造のプロジェクトが生成されます。

```
webapp-operator/
├── api/v1alpha1/
│   ├── webapp_types.go      # CRDの型定義
│   └── zz_generated.deepcopy.go
├── config/
│   ├── crd/                 # CRDマニフェスト
│   ├── rbac/                # RBAC設定
│   └── manager/             # Operator deployment
├── internal/controller/
│   └── webapp_controller.go # コントローラーロジック
└── main.go
```

## CRDの設計

まず、管理したいリソースの型を定義します。`api/v1alpha1/webapp_types.go`を編集します。

```go
package v1alpha1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// WebAppSpec defines the desired state of WebApp
type WebAppSpec struct {
    // Replicas is the number of desired pods
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=10
    Replicas int32 `json:"replicas"`

    // Image is the container image to use
    // +kubebuilder:validation:Required
    Image string `json:"image"`

    // Port is the port the application listens on
    // +kubebuilder:default:=8080
    Port int32 `json:"port,omitempty"`

    // Environment variables
    Env []EnvVar `json:"env,omitempty"`

    // Resources for the pods
    Resources ResourceRequirements `json:"resources,omitempty"`
}

type EnvVar struct {
    Name  string `json:"name"`
    Value string `json:"value"`
}

type ResourceRequirements struct {
    // +kubebuilder:default:="100m"
    CPU string `json:"cpu,omitempty"`
    // +kubebuilder:default:="128Mi"
    Memory string `json:"memory,omitempty"`
}

// WebAppStatus defines the observed state of WebApp
type WebAppStatus struct {
    // AvailableReplicas is the number of ready pods
    AvailableReplicas int32 `json:"availableReplicas"`

    // Conditions represent the latest available observations
    Conditions []metav1.Condition `json:"conditions,omitempty"`

    // LastUpdateTime is the last time the status was updated
    LastUpdateTime metav1.Time `json:"lastUpdateTime,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Replicas",type=integer,JSONPath=`.spec.replicas`
// +kubebuilder:printcolumn:name="Available",type=integer,JSONPath=`.status.availableReplicas`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`

// WebApp is the Schema for the webapps API
type WebApp struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   WebAppSpec   `json:"spec,omitempty"`
    Status WebAppStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// WebAppList contains a list of WebApp
type WebAppList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []WebApp `json:"items"`
}

func init() {
    SchemeBuilder.Register(&WebApp{}, &WebAppList{})
}
```

ここで使われている`+kubebuilder:`コメントは、CRDの生成時にバリデーションルールやカスタムカラムを追加するためのマーカーです。

## コントローラーの実装

コントローラーは、CRDの変更を監視し、実際のリソース（Deployment、Serviceなど）を作成・更新します。`internal/controller/webapp_controller.go`を実装します。

```go
package controller

import (
    "context"
    "fmt"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    "k8s.io/apimachinery/pkg/api/resource"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/types"
    "k8s.io/apimachinery/pkg/util/intstr"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
    "sigs.k8s.io/controller-runtime/pkg/log"

    appsv1alpha1 "github.com/myorg/webapp-operator/api/v1alpha1"
)

// WebAppReconciler reconciles a WebApp object
type WebAppReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=apps.example.com,resources=webapps,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=apps.example.com,resources=webapps/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=apps.example.com,resources=webapps/finalizers,verbs=update
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch;create;update;patch;delete

func (r *WebAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := log.FromContext(ctx)

    // WebAppリソースの取得
    var webapp appsv1alpha1.WebApp
    if err := r.Get(ctx, req.NamespacedName, &webapp); err != nil {
        if errors.IsNotFound(err) {
            // リソースが削除された場合
            return ctrl.Result{}, nil
        }
        log.Error(err, "unable to fetch WebApp")
        return ctrl.Result{}, err
    }

    // Deploymentの調整
    if err := r.reconcileDeployment(ctx, &webapp); err != nil {
        return ctrl.Result{}, err
    }

    // Serviceの調整
    if err := r.reconcileService(ctx, &webapp); err != nil {
        return ctrl.Result{}, err
    }

    // ステータスの更新
    if err := r.updateStatus(ctx, &webapp); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}

func (r *WebAppReconciler) reconcileDeployment(ctx context.Context, webapp *appsv1alpha1.WebApp) error {
    log := log.FromContext(ctx)

    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      webapp.Name,
            Namespace: webapp.Namespace,
        },
    }

    // CreateOrUpdateを使って、Deploymentを作成または更新
    op, err := controllerutil.CreateOrUpdate(ctx, r.Client, deployment, func() error {
        // Deploymentのspecを設定
        deployment.Spec.Replicas = &webapp.Spec.Replicas
        deployment.Spec.Selector = &metav1.LabelSelector{
            MatchLabels: map[string]string{
                "app":     webapp.Name,
                "managed": "webapp-operator",
            },
        }

        // Pod templateの定義
        deployment.Spec.Template = corev1.PodTemplateSpec{
            ObjectMeta: metav1.ObjectMeta{
                Labels: map[string]string{
                    "app":     webapp.Name,
                    "managed": "webapp-operator",
                },
            },
            Spec: corev1.PodSpec{
                Containers: []corev1.Container{
                    {
                        Name:  webapp.Name,
                        Image: webapp.Spec.Image,
                        Ports: []corev1.ContainerPort{
                            {
                                ContainerPort: webapp.Spec.Port,
                                Protocol:      corev1.ProtocolTCP,
                            },
                        },
                        Env: convertEnvVars(webapp.Spec.Env),
                        Resources: corev1.ResourceRequirements{
                            Requests: corev1.ResourceList{
                                corev1.ResourceCPU:    resource.MustParse(webapp.Spec.Resources.CPU),
                                corev1.ResourceMemory: resource.MustParse(webapp.Spec.Resources.Memory),
                            },
                            Limits: corev1.ResourceList{
                                corev1.ResourceCPU:    resource.MustParse(webapp.Spec.Resources.CPU),
                                corev1.ResourceMemory: resource.MustParse(webapp.Spec.Resources.Memory),
                            },
                        },
                    },
                },
            },
        }

        // Owner referenceを設定（WebAppが削除されたら関連リソースも削除）
        return controllerutil.SetControllerReference(webapp, deployment, r.Scheme)
    })

    if err != nil {
        return err
    }
    log.Info("Deployment reconciled", "operation", op)
    return nil
}

func (r *WebAppReconciler) reconcileService(ctx context.Context, webapp *appsv1alpha1.WebApp) error {
    log := log.FromContext(ctx)

    service := &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name:      webapp.Name,
            Namespace: webapp.Namespace,
        },
    }

    op, err := controllerutil.CreateOrUpdate(ctx, r.Client, service, func() error {
        service.Spec.Selector = map[string]string{
            "app": webapp.Name,
        }
        service.Spec.Type = corev1.ServiceTypeClusterIP
        service.Spec.Ports = []corev1.ServicePort{
            {
                Port:       80,
                TargetPort: intstr.FromInt(int(webapp.Spec.Port)),
                Protocol:   corev1.ProtocolTCP,
            },
        }

        return controllerutil.SetControllerReference(webapp, service, r.Scheme)
    })

    if err != nil {
        return err
    }
    log.Info("Service reconciled", "operation", op)
    return nil
}

func (r *WebAppReconciler) updateStatus(ctx context.Context, webapp *appsv1alpha1.WebApp) error {
    // Deploymentの状態を取得
    var deployment appsv1.Deployment
    if err := r.Get(ctx, types.NamespacedName{
        Name:      webapp.Name,
        Namespace: webapp.Namespace,
    }, &deployment); err != nil {
        return err
    }

    // ステータスを更新
    webapp.Status.AvailableReplicas = deployment.Status.AvailableReplicas
    webapp.Status.LastUpdateTime = metav1.Now()

    // 条件の設定
    condition := metav1.Condition{
        Type:               "Ready",
        Status:             metav1.ConditionTrue,
        Reason:             "DeploymentReady",
        Message:            fmt.Sprintf("%d/%d replicas available", deployment.Status.AvailableReplicas, *deployment.Spec.Replicas),
        LastTransitionTime: metav1.Now(),
    }

    if deployment.Status.AvailableReplicas < *deployment.Spec.Replicas {
        condition.Status = metav1.ConditionFalse
        condition.Reason = "DeploymentNotReady"
    }

    // 条件の更新（既存の条件を置き換え）
    for i, c := range webapp.Status.Conditions {
        if c.Type == "Ready" {
            webapp.Status.Conditions[i] = condition
            return r.Status().Update(ctx, webapp)
        }
    }
    webapp.Status.Conditions = append(webapp.Status.Conditions, condition)

    return r.Status().Update(ctx, webapp)
}

func convertEnvVars(envVars []appsv1alpha1.EnvVar) []corev1.EnvVar {
    result := make([]corev1.EnvVar, len(envVars))
    for i, env := range envVars {
        result[i] = corev1.EnvVar{
            Name:  env.Name,
            Value: env.Value,
        }
    }
    return result
}

// SetupWithManager sets up the controller with the Manager.
func (r *WebAppReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&appsv1alpha1.WebApp{}).
        Owns(&appsv1.Deployment{}).
        Owns(&corev1.Service{}).
        Complete(r)
}
```

## CRDとコントローラーのデプロイ

```bash
# CRDマニフェストの生成
make manifests

# CRDのインストール
make install

# ローカルでコントローラーを実行（開発用）
make run

# または、クラスタ内にデプロイ
make docker-build docker-push IMG=myregistry/webapp-operator:latest
make deploy IMG=myregistry/webapp-operator:latest
```

## カスタムリソースの作成

CRDをインストールしたら、実際にWebAppリソースを作成してテストします。

```yaml
# config/samples/apps_v1alpha1_webapp.yaml
apiVersion: apps.example.com/v1alpha1
kind: WebApp
metadata:
  name: sample-webapp
spec:
  replicas: 3
  image: nginx:latest
  port: 80
  env:
    - name: ENV
      value: production
  resources:
    cpu: "200m"
    memory: "256Mi"
```

```bash
# サンプルリソースの適用
kubectl apply -f config/samples/apps_v1alpha1_webapp.yaml

# リソースの確認
kubectl get webapp
kubectl describe webapp sample-webapp

# 作成されたリソースの確認
kubectl get deployments
kubectl get services
kubectl get pods
```

## 高度な機能の実装

### 1. ファイナライザーによるクリーンアップ

リソース削除時に外部リソース（外部ストレージ、DNS設定など）をクリーンアップする場合、ファイナライザーを使用します。

```go
const webappFinalizer = "webapp.example.com/finalizer"

func (r *WebAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := log.FromContext(ctx)

    var webapp appsv1alpha1.WebApp
    if err := r.Get(ctx, req.NamespacedName, &webapp); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // 削除処理
    if !webapp.ObjectMeta.DeletionTimestamp.IsZero() {
        if controllerutil.ContainsFinalizer(&webapp, webappFinalizer) {
            // クリーンアップ処理
            if err := r.cleanupExternalResources(ctx, &webapp); err != nil {
                return ctrl.Result{}, err
            }

            // ファイナライザーを削除
            controllerutil.RemoveFinalizer(&webapp, webappFinalizer)
            if err := r.Update(ctx, &webapp); err != nil {
                return ctrl.Result{}, err
            }
        }
        return ctrl.Result{}, nil
    }

    // ファイナライザーの追加
    if !controllerutil.ContainsFinalizer(&webapp, webappFinalizer) {
        controllerutil.AddFinalizer(&webapp, webappFinalizer)
        if err := r.Update(ctx, &webapp); err != nil {
            return ctrl.Result{}, err
        }
    }

    // 通常の調整処理
    // ...
}

func (r *WebAppReconciler) cleanupExternalResources(ctx context.Context, webapp *appsv1alpha1.WebApp) error {
    log := log.FromContext(ctx)
    log.Info("Cleaning up external resources", "webapp", webapp.Name)
    // 外部リソースのクリーンアップロジック
    return nil
}
```

### 2. Webhookによるバリデーション

CRDの作成・更新時にカスタムバリデーションを実行するWebhookを追加できます。

```bash
# Webhookの作成
kubebuilder create webhook --group apps --version v1alpha1 --kind WebApp --defaulting --programmatic-validation
```

`api/v1alpha1/webapp_webhook.go`が生成されるので、バリデーションロジックを実装します。

```go
func (r *WebApp) ValidateCreate() error {
    log.Info("validate create", "name", r.Name)

    if r.Spec.Replicas > 10 {
        return fmt.Errorf("replicas cannot exceed 10")
    }

    if !strings.Contains(r.Spec.Image, ":") {
        return fmt.Errorf("image must include a tag")
    }

    return nil
}

func (r *WebApp) ValidateUpdate(old runtime.Object) error {
    log.Info("validate update", "name", r.Name)

    oldWebApp := old.(*WebApp)

    // イメージの変更を禁止（例）
    if r.Spec.Image != oldWebApp.Spec.Image {
        return fmt.Errorf("image cannot be changed after creation")
    }

    return r.ValidateCreate()
}
```

## テストの実装

Kubebuilderプロジェクトには、envtestを使った統合テストのフレームワークが含まれています。

```go
// internal/controller/webapp_controller_test.go
package controller

import (
    "context"
    "time"

    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"
    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/types"

    appsv1alpha1 "github.com/myorg/webapp-operator/api/v1alpha1"
)

var _ = Describe("WebApp Controller", func() {
    Context("When creating a WebApp", func() {
        It("Should create Deployment and Service", func() {
            ctx := context.Background()

            webapp := &appsv1alpha1.WebApp{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      "test-webapp",
                    Namespace: "default",
                },
                Spec: appsv1alpha1.WebAppSpec{
                    Replicas: 2,
                    Image:    "nginx:latest",
                    Port:     8080,
                },
            }

            Expect(k8sClient.Create(ctx, webapp)).Should(Succeed())

            // Deploymentが作成されることを確認
            deployment := &appsv1.Deployment{}
            Eventually(func() error {
                return k8sClient.Get(ctx, types.NamespacedName{
                    Name:      "test-webapp",
                    Namespace: "default",
                }, deployment)
            }, time.Second*10, time.Second).Should(Succeed())

            Expect(*deployment.Spec.Replicas).Should(Equal(int32(2)))

            // Serviceが作成されることを確認
            service := &corev1.Service{}
            Eventually(func() error {
                return k8sClient.Get(ctx, types.NamespacedName{
                    Name:      "test-webapp",
                    Namespace: "default",
                }, service)
            }, time.Second*10, time.Second).Should(Succeed())

            Expect(service.Spec.Ports[0].TargetPort.IntVal).Should(Equal(int32(8080)))
        })
    })
})
```

テストの実行:

```bash
make test
```

## 本番運用のベストプラクティス

### 1. メトリクスとモニタリング

Controller Runtimeは、Prometheusメトリクスをデフォルトでエクスポートします。カスタムメトリクスを追加することもできます。

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "sigs.k8s.io/controller-runtime/pkg/metrics"
)

var (
    webappReconcileTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "webapp_reconcile_total",
            Help: "Total number of reconciliations",
        },
        []string{"webapp", "result"},
    )
)

func init() {
    metrics.Registry.MustRegister(webappReconcileTotal)
}

// Reconcile内で使用
webappReconcileTotal.WithLabelValues(webapp.Name, "success").Inc()
```

### 2. ロギング

構造化ロギングを使用し、トレーサビリティを確保します。

```go
log.Info("Reconciling WebApp",
    "namespace", webapp.Namespace,
    "name", webapp.Name,
    "replicas", webapp.Spec.Replicas,
)
```

### 3. リソースリミット

Operatorの Deployment に適切なリソースリミットを設定します。

```yaml
# config/manager/manager.yaml
resources:
  limits:
    cpu: 500m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

### 4. RBAC最小権限

必要最小限の権限のみを付与します。Kubebuilderのマーカーコメントを正確に設定してください。

### 5. 高可用性

本番環境では、Operatorを複数レプリカで実行し、Leader Electionを有効にします（Controller Runtimeはデフォルトで対応）。

## まとめ

Kubernetes Operatorは、複雑なアプリケーションの運用を自動化する強力なパターンです。Kubebuilderを使うことで、CRDの定義からコントローラーの実装、デプロイまでを効率的に行えます。

本記事で解説した内容:
- Operatorパターンの基礎概念
- Kubebuilderを使ったプロジェクトのセットアップ
- CRDの設計とコントローラーの実装
- 高度な機能（ファイナライザー、Webhook）
- テストと本番運用のベストプラクティス

Operatorの開発を通じて、Kubernetesの内部動作を深く理解し、より高度なクラウドネイティブアプリケーションを構築できるようになります。
