---
title: 'Go言語Webアプリケーション開発完全ガイド2026'
description: 'Go言語によるWeb開発を徹底解説。net/http・Gin・Echo・Fiber・GORM・JWT認証・WebSocket・マイクロサービス・Docker・デプロイまで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['Go', 'Backend', 'Performance']
---

Go言語（Golang）はGoogleが2009年に公開したシステムプログラミング言語だ。静的型付け・コンパイル型・ガベージコレクション付きという特性を持ちながら、C言語に匹敵する実行速度とPythonに近い開発生産性を両立させている。特にWebサーバーやマイクロサービスの領域では、その真価が際立つ。

本記事では、GoによるWeb開発の基礎から本番運用まで、実際に動作するコード例を豊富に交えながら体系的に解説する。標準ライブラリの`net/http`から始まり、Gin・Echoといったフレームワーク、GORMによるデータベース操作、JWT認証、WebSocket、そしてDockerとマイクロサービスまで、現代のWeb開発に必要な知識を網羅する。

---

## 1. Go言語とWeb開発

### なぜGoがWeb開発で選ばれるのか

Goがバックエンド開発者の間で急速に普及している理由は、以下の点に集約される。

**コンパイル速度と実行速度の両立**

Goはコンパイル言語でありながら、コンパイル速度が極めて速い。大規模なプロジェクトでも数秒でビルドが完了し、生成されたバイナリは単一ファイルで依存関係を含まない。実行速度はJavaや.NETに匹敵し、インタープリタ型言語であるPythonやRubyを大幅に上回る。

**並行処理モデル（Goroutine）**

Goの最大の特徴は、Goroutineと呼ばれる軽量スレッドだ。OSスレッドと異なり、初期スタックサイズはわずか2KBほどで、数十万のGoroutineを同時に起動できる。WebサーバーでHTTPリクエストを処理する際、各リクエストをGoroutineで処理することで、高い並行性を低コストで実現できる。

**シンプルな言語仕様**

Goのキーワード数は25個しかない（Pythonは35個、Javaは50個以上）。クラス継承・ジェネリクス（Go 1.18以降は追加）・例外処理がなく、シンプルで読みやすいコードが書ける。チームでの開発において、コードの可読性と保守性が高い。

**標準ライブラリの充実**

`net/http`パッケージだけで本格的なWebサーバーを構築できる。JSON処理・暗号化・テスト・ベンチマークなど、Web開発に必要な機能の多くが標準ライブラリで提供されている。

### Goのパフォーマンスベンチマーク

TechEmpower Framework Benchmarksのデータによると、GoのWebフレームワーク（FiberやEcho）は毎秒100万リクエスト以上を処理できるケースがある。これはNode.jsの約3〜5倍、Python（FastAPI）の約10倍の性能に相当する。

```
言語/フレームワーク    毎秒リクエスト数（概算）
Fiber (Go)            1,200,000 req/s
Gin (Go)              950,000 req/s
Actix-web (Rust)      1,000,000 req/s
Spring Boot (Java)    400,000 req/s
Express (Node.js)     280,000 req/s
FastAPI (Python)      100,000 req/s
Django (Python)       40,000 req/s
```

（上記は参考値。実際の性能はハードウェアや設定に依存する）

### Goを採用している主要企業

- **Google**: Kubernetes、Docker（一部）、各種内部サービス
- **Docker**: コンテナランタイム本体
- **Cloudflare**: DNSサービス、CDNインフラ
- **Uber**: 位置情報サービス、マイクロサービス群
- **Dropbox**: バックエンドサービスのPythonからGoへの移行
- **HashiCorp**: Terraform、Vault、Consul

---

## 2. 開発環境のセットアップ

### Goのインストール

公式サイト（https://go.dev/dl/）から最新版をダウンロードするか、パッケージマネージャーを使用する。

**macOS（Homebrew）**

```bash
brew install go
```

**Linux（Ubuntu/Debian）**

```bash
# 公式バイナリをダウンロード
wget https://go.dev/dl/go1.23.0.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.23.0.linux-amd64.tar.gz

# PATHに追加（~/.bashrc または ~/.zshrc に追記）
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
```

**バージョン確認**

```bash
go version
# go version go1.23.0 linux/amd64
```

### プロジェクトの初期化（Goモジュール）

Go 1.11以降、モジュールシステムが標準となった。プロジェクトのルートディレクトリで以下を実行する。

```bash
mkdir mywebapp
cd mywebapp
go mod init github.com/yourusername/mywebapp
```

これにより`go.mod`ファイルが生成される。

```
module github.com/yourusername/mywebapp

go 1.23.0
```

### 推奨ディレクトリ構成

```
mywebapp/
├── cmd/
│   └── server/
│       └── main.go          # エントリーポイント
├── internal/
│   ├── handler/             # HTTPハンドラー
│   ├── middleware/          # ミドルウェア
│   ├── model/               # データモデル
│   ├── repository/          # データベース操作
│   └── service/             # ビジネスロジック
├── pkg/
│   ├── config/              # 設定管理
│   ├── database/            # DB接続
│   └── logger/              # ログ設定
├── migrations/              # DBマイグレーション
├── tests/                   # 統合テスト
├── Dockerfile
├── docker-compose.yml
├── go.mod
└── go.sum
```

この構成はGo公式の`Standard Go Project Layout`に基づいている。`internal/`ディレクトリ内のパッケージは、同じモジュール内からしかインポートできないため、APIの境界を明確に定義できる。

---

## 3. 標準net/httpパッケージ

### 基本的なHTTPサーバー

Goの標準ライブラリだけで、機能的なWebサーバーを構築できる。

```go
// cmd/server/main.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "time"
)

// レスポンス用の構造体
type Response struct {
    Message   string    `json:"message"`
    Timestamp time.Time `json:"timestamp"`
    Status    int       `json:"status"`
}

// JSONレスポンスを返すヘルパー関数
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    if err := json.NewEncoder(w).Encode(data); err != nil {
        log.Printf("JSONエンコードエラー: %v", err)
    }
}

// ハンドラー関数
func helloHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        writeJSON(w, http.StatusMethodNotAllowed, Response{
            Message: "GETメソッドのみ許可されています",
            Status:  http.StatusMethodNotAllowed,
        })
        return
    }

    resp := Response{
        Message:   "Hello, Go Web Server!",
        Timestamp: time.Now(),
        Status:    http.StatusOK,
    }
    writeJSON(w, http.StatusOK, resp)
}

// ヘルスチェックハンドラー
func healthHandler(w http.ResponseWriter, r *http.Request) {
    writeJSON(w, http.StatusOK, map[string]string{
        "status": "healthy",
        "time":   time.Now().Format(time.RFC3339),
    })
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/", helloHandler)
    mux.HandleFunc("/health", healthHandler)

    server := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }

    fmt.Println("サーバーを起動中: http://localhost:8080")
    if err := server.ListenAndServe(); err != nil {
        log.Fatalf("サーバー起動エラー: %v", err)
    }
}
```

### ミドルウェアの実装

標準パッケージでもミドルウェアパターンを実装できる。

```go
// ロギングミドルウェア
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // レスポンスライターをラップしてステータスコードをキャプチャ
        wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

        next.ServeHTTP(wrapped, r)

        duration := time.Since(start)
        log.Printf(
            "[%s] %s %s - %d (%v)",
            r.Method,
            r.RemoteAddr,
            r.URL.Path,
            wrapped.statusCode,
            duration,
        )
    })
}

// レスポンスライターのラッパー
type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

// CORSミドルウェア
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }

        next.ServeHTTP(w, r)
    })
}

// ミドルウェアチェーンを適用
func applyMiddleware(handler http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
    for i := len(middlewares) - 1; i >= 0; i-- {
        handler = middlewares[i](handler)
    }
    return handler
}
```

### URLパスパラメータの処理（Go 1.22以降）

Go 1.22からServeMuxがパスパラメータをサポートするようになった。

```go
func main() {
    mux := http.NewServeMux()

    // {id} でパスパラメータを定義（Go 1.22+）
    mux.HandleFunc("GET /users/{id}", getUserHandler)
    mux.HandleFunc("POST /users", createUserHandler)
    mux.HandleFunc("PUT /users/{id}", updateUserHandler)
    mux.HandleFunc("DELETE /users/{id}", deleteUserHandler)

    server := &http.Server{
        Addr:    ":8080",
        Handler: applyMiddleware(mux, loggingMiddleware, corsMiddleware),
    }

    log.Fatal(server.ListenAndServe())
}

func getUserHandler(w http.ResponseWriter, r *http.Request) {
    // パスパラメータの取得
    id := r.PathValue("id")
    writeJSON(w, http.StatusOK, map[string]string{
        "id":      id,
        "message": fmt.Sprintf("ユーザー %s の情報", id),
    })
}
```

---

## 4. Ginフレームワーク

### Ginの概要とインストール

GinはGoで最も広く使われているWebフレームワークの一つだ。高速なルーティング（httprouterベース）・ミドルウェアサポート・バリデーション・JSONバインディングなど、Web開発に必要な機能を揃えている。

```bash
go get -u github.com/gin-gonic/gin
```

### 基本的なGinアプリケーション

```go
// cmd/server/main.go
package main

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
)

// ユーザーモデル
type User struct {
    ID       int    `json:"id"`
    Name     string `json:"name" binding:"required,min=2,max=50"`
    Email    string `json:"email" binding:"required,email"`
    Age      int    `json:"age" binding:"required,min=18,max=120"`
    Role     string `json:"role"`
    Password string `json:"password,omitempty" binding:"required,min=8"`
}

// インメモリのユーザーストア（実際はDBを使用する）
var users = []User{
    {ID: 1, Name: "田中太郎", Email: "tanaka@example.com", Age: 30, Role: "admin"},
    {ID: 2, Name: "佐藤花子", Email: "sato@example.com", Age: 25, Role: "user"},
}

func main() {
    // リリースモードで実行（本番環境）
    // gin.SetMode(gin.ReleaseMode)

    r := gin.Default() // LoggerとRecoveryミドルウェアが自動設定される

    // CORSミドルウェア
    r.Use(corsMiddleware())

    // ルートグループ
    api := r.Group("/api/v1")
    {
        users := api.Group("/users")
        {
            users.GET("", listUsers)
            users.GET("/:id", getUser)
            users.POST("", createUser)
            users.PUT("/:id", updateUser)
            users.DELETE("/:id", deleteUser)
        }
    }

    // ヘルスチェック
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status": "ok",
        })
    })

    if err := r.Run(":8080"); err != nil {
        panic(err)
    }
}

// ユーザー一覧取得
func listUsers(c *gin.Context) {
    // クエリパラメータの取得
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
    search := c.Query("search")

    _ = page
    _ = limit
    _ = search

    c.JSON(http.StatusOK, gin.H{
        "users": users,
        "total": len(users),
    })
}

// ユーザー取得
func getUser(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "無効なIDです"})
        return
    }

    for _, user := range users {
        if user.ID == id {
            c.JSON(http.StatusOK, user)
            return
        }
    }

    c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
}

// ユーザー作成
func createUser(c *gin.Context) {
    var newUser User
    if err := c.ShouldBindJSON(&newUser); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error":   "バリデーションエラー",
            "details": err.Error(),
        })
        return
    }

    newUser.ID = len(users) + 1
    newUser.Role = "user"
    newUser.Password = "" // パスワードはレスポンスに含めない

    users = append(users, newUser)
    c.JSON(http.StatusCreated, newUser)
}

// ユーザー更新
func updateUser(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "無効なIDです"})
        return
    }

    var updateData User
    if err := c.ShouldBindJSON(&updateData); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    for i, user := range users {
        if user.ID == id {
            users[i].Name = updateData.Name
            users[i].Email = updateData.Email
            c.JSON(http.StatusOK, users[i])
            return
        }
    }

    c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
}

// ユーザー削除
func deleteUser(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "無効なIDです"})
        return
    }

    for i, user := range users {
        if user.ID == id {
            users = append(users[:i], users[i+1:]...)
            c.JSON(http.StatusOK, gin.H{"message": "削除しました"})
            return
        }
    }

    c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
}
```

### Ginミドルウェアの実装

```go
// internal/middleware/cors.go
package middleware

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

func corsMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", "*")
        c.Header("Access-Control-Allow-Credentials", "true")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
        c.Header("Access-Control-Allow-Methods", "POST, HEAD, PATCH, OPTIONS, GET, PUT, DELETE")

        if c.Request.Method == http.MethodOptions {
            c.AbortWithStatus(http.StatusNoContent)
            return
        }

        c.Next()
    }
}

// レート制限ミドルウェア（シンプルな実装）
// pkg/middleware/ratelimit.go
package middleware

import (
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
)

type RateLimiter struct {
    mu       sync.Mutex
    requests map[string][]time.Time
    limit    int
    window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
    return &RateLimiter{
        requests: make(map[string][]time.Time),
        limit:    limit,
        window:   window,
    }
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        ip := c.ClientIP()
        now := time.Now()

        rl.mu.Lock()
        defer rl.mu.Unlock()

        // ウィンドウ外の古いリクエストを削除
        windowStart := now.Add(-rl.window)
        var recent []time.Time
        for _, t := range rl.requests[ip] {
            if t.After(windowStart) {
                recent = append(recent, t)
            }
        }

        if len(recent) >= rl.limit {
            c.JSON(http.StatusTooManyRequests, gin.H{
                "error": "レート制限を超えました。しばらく待ってから再試行してください。",
            })
            c.Abort()
            return
        }

        rl.requests[ip] = append(recent, now)
        c.Next()
    }
}

// 認証ミドルウェア（JWTは後述）
func AuthRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "認証トークンが必要です"})
            c.Abort()
            return
        }
        // JWTの検証は次のセクションで詳述
        c.Next()
    }
}
```

---

## 5. Echoフレームワーク

### Echoの特徴

EchoはGinと並ぶ人気フレームワークで、より型安全なAPIと優れたパフォーマンスが特徴だ。特にカスタムHTTPエラーハンドリングとデータバインディングが強力だ。

```bash
go get github.com/labstack/echo/v4
go get github.com/labstack/echo/v4/middleware
```

### Echoによる実装

```go
// cmd/server/main.go
package main

import (
    "errors"
    "net/http"
    "strconv"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
)

type Product struct {
    ID          int     `json:"id"`
    Name        string  `json:"name" validate:"required,min=2,max=100"`
    Description string  `json:"description" validate:"required"`
    Price       float64 `json:"price" validate:"required,gt=0"`
    Stock       int     `json:"stock" validate:"min=0"`
    Category    string  `json:"category" validate:"required"`
}

// カスタムHTTPエラーハンドラー
func customHTTPErrorHandler(err error, c echo.Context) {
    code := http.StatusInternalServerError
    message := "内部サーバーエラーが発生しました"

    var he *echo.HTTPError
    if errors.As(err, &he) {
        code = he.Code
        if msg, ok := he.Message.(string); ok {
            message = msg
        }
    }

    c.JSON(code, map[string]interface{}{
        "error": message,
        "code":  code,
    })
}

func main() {
    e := echo.New()

    // カスタムエラーハンドラー
    e.HTTPErrorHandler = customHTTPErrorHandler

    // ミドルウェアの設定
    e.Use(middleware.Logger())
    e.Use(middleware.Recover())
    e.Use(middleware.CORS())
    e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(20)))

    // GZip圧縮
    e.Use(middleware.GzipWithConfig(middleware.GzipConfig{
        Level: 5,
    }))

    // リクエストIDの自動付与
    e.Use(middleware.RequestID())

    // ルーティング
    api := e.Group("/api/v1")

    products := api.Group("/products")
    products.GET("", listProducts)
    products.GET("/:id", getProduct)
    products.POST("", createProduct, authMiddleware)
    products.PUT("/:id", updateProduct, authMiddleware)
    products.DELETE("/:id", deleteProduct, authMiddleware)

    // サーバー起動
    e.Logger.Fatal(e.Start(":8080"))
}

var products = []Product{
    {ID: 1, Name: "MacBook Pro", Description: "高性能ノートPC", Price: 298000, Stock: 10, Category: "electronics"},
    {ID: 2, Name: "iPhone 16", Description: "最新スマートフォン", Price: 129800, Stock: 50, Category: "electronics"},
}

func listProducts(c echo.Context) error {
    category := c.QueryParam("category")

    var result []Product
    if category != "" {
        for _, p := range products {
            if p.Category == category {
                result = append(result, p)
            }
        }
    } else {
        result = products
    }

    return c.JSON(http.StatusOK, map[string]interface{}{
        "products": result,
        "total":    len(result),
    })
}

func getProduct(c echo.Context) error {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "無効なIDです")
    }

    for _, p := range products {
        if p.ID == id {
            return c.JSON(http.StatusOK, p)
        }
    }

    return echo.NewHTTPError(http.StatusNotFound, "商品が見つかりません")
}

func createProduct(c echo.Context) error {
    var p Product
    if err := c.Bind(&p); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "リクエストの形式が不正です")
    }

    // バリデーション
    if p.Name == "" || p.Price <= 0 {
        return echo.NewHTTPError(http.StatusUnprocessableEntity, "必須フィールドが不足しています")
    }

    p.ID = len(products) + 1
    products = append(products, p)

    return c.JSON(http.StatusCreated, p)
}

func updateProduct(c echo.Context) error {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "無効なIDです")
    }

    var updateData Product
    if err := c.Bind(&updateData); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "リクエストの形式が不正です")
    }

    for i, p := range products {
        if p.ID == id {
            products[i].Name = updateData.Name
            products[i].Price = updateData.Price
            products[i].Stock = updateData.Stock
            return c.JSON(http.StatusOK, products[i])
        }
    }

    return echo.NewHTTPError(http.StatusNotFound, "商品が見つかりません")
}

func deleteProduct(c echo.Context) error {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "無効なIDです")
    }

    for i, p := range products {
        if p.ID == id {
            products = append(products[:i], products[i+1:]...)
            return c.JSON(http.StatusOK, map[string]string{"message": "削除しました"})
        }
    }

    return echo.NewHTTPError(http.StatusNotFound, "商品が見つかりません")
}

func authMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        token := c.Request().Header.Get("Authorization")
        if token == "" {
            return echo.NewHTTPError(http.StatusUnauthorized, "認証が必要です")
        }
        return next(c)
    }
}
```

---

## 6. GORMによるデータベース操作

### GORMのインストールと設定

GORMはGoで最も人気のあるORMライブラリだ。PostgreSQL・MySQL・SQLite・SQL Serverに対応している。

```bash
go get -u gorm.io/gorm
go get -u gorm.io/driver/postgres
go get -u gorm.io/driver/mysql
```

### データベース接続の設定

```go
// pkg/database/db.go
package database

import (
    "fmt"
    "log"
    "os"
    "time"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

var DB *gorm.DB

type Config struct {
    Host     string
    Port     string
    User     string
    Password string
    DBName   string
    SSLMode  string
    TimeZone string
}

func NewConfig() *Config {
    return &Config{
        Host:     getEnv("DB_HOST", "localhost"),
        Port:     getEnv("DB_PORT", "5432"),
        User:     getEnv("DB_USER", "postgres"),
        Password: getEnv("DB_PASSWORD", ""),
        DBName:   getEnv("DB_NAME", "myapp"),
        SSLMode:  getEnv("DB_SSL_MODE", "disable"),
        TimeZone: getEnv("DB_TIMEZONE", "Asia/Tokyo"),
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func Connect(cfg *Config) (*gorm.DB, error) {
    dsn := fmt.Sprintf(
        "host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
        cfg.Host, cfg.User, cfg.Password, cfg.DBName, cfg.Port, cfg.SSLMode, cfg.TimeZone,
    )

    // GORMのログ設定
    newLogger := logger.New(
        log.New(os.Stdout, "\r\n", log.LstdFlags),
        logger.Config{
            SlowThreshold:             time.Second,
            LogLevel:                  logger.Info,
            IgnoreRecordNotFoundError: true,
            Colorful:                  true,
        },
    )

    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        Logger: newLogger,
    })
    if err != nil {
        return nil, fmt.Errorf("データベース接続エラー: %w", err)
    }

    // コネクションプールの設定
    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }

    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetMaxOpenConns(100)
    sqlDB.SetConnMaxLifetime(time.Hour)

    return db, nil
}
```

### モデルの定義

```go
// internal/model/user.go
package model

import (
    "time"

    "gorm.io/gorm"
)

type User struct {
    gorm.Model                          // ID, CreatedAt, UpdatedAt, DeletedAt を自動管理
    Name        string    `gorm:"type:varchar(100);not null" json:"name"`
    Email       string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
    Password    string    `gorm:"type:varchar(255);not null" json:"-"` // JSONには含めない
    Role        string    `gorm:"type:varchar(50);default:'user'" json:"role"`
    IsActive    bool      `gorm:"default:true" json:"is_active"`
    LastLoginAt *time.Time `json:"last_login_at,omitempty"`
    Profile     Profile   `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"profile,omitempty"`
    Posts       []Post    `json:"posts,omitempty"`
}

type Profile struct {
    gorm.Model
    UserID    uint   `gorm:"not null;uniqueIndex" json:"user_id"`
    Bio       string `gorm:"type:text" json:"bio"`
    AvatarURL string `gorm:"type:varchar(500)" json:"avatar_url"`
    Website   string `gorm:"type:varchar(255)" json:"website"`
    Location  string `gorm:"type:varchar(100)" json:"location"`
}

type Post struct {
    gorm.Model
    UserID    uint     `gorm:"not null;index" json:"user_id"`
    Title     string   `gorm:"type:varchar(255);not null" json:"title"`
    Content   string   `gorm:"type:text;not null" json:"content"`
    Published bool     `gorm:"default:false" json:"published"`
    Tags      []Tag    `gorm:"many2many:post_tags;" json:"tags,omitempty"`
    User      User     `json:"user,omitempty"`
}

type Tag struct {
    gorm.Model
    Name  string `gorm:"type:varchar(50);uniqueIndex;not null" json:"name"`
    Slug  string `gorm:"type:varchar(50);uniqueIndex;not null" json:"slug"`
    Posts []Post `gorm:"many2many:post_tags;" json:"posts,omitempty"`
}
```

### リポジトリパターンの実装

```go
// internal/repository/user_repository.go
package repository

import (
    "errors"
    "fmt"

    "github.com/yourusername/mywebapp/internal/model"
    "gorm.io/gorm"
)

type UserRepository interface {
    Create(user *model.User) error
    FindByID(id uint) (*model.User, error)
    FindByEmail(email string) (*model.User, error)
    FindAll(page, limit int, search string) ([]model.User, int64, error)
    Update(user *model.User) error
    Delete(id uint) error
    SoftDelete(id uint) error
}

type userRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
    return &userRepository{db: db}
}

func (r *userRepository) Create(user *model.User) error {
    result := r.db.Create(user)
    if result.Error != nil {
        return fmt.Errorf("ユーザー作成エラー: %w", result.Error)
    }
    return nil
}

func (r *userRepository) FindByID(id uint) (*model.User, error) {
    var user model.User
    result := r.db.Preload("Profile").Preload("Posts").First(&user, id)
    if result.Error != nil {
        if errors.Is(result.Error, gorm.ErrRecordNotFound) {
            return nil, fmt.Errorf("ユーザーが見つかりません: id=%d", id)
        }
        return nil, fmt.Errorf("ユーザー取得エラー: %w", result.Error)
    }
    return &user, nil
}

func (r *userRepository) FindByEmail(email string) (*model.User, error) {
    var user model.User
    result := r.db.Where("email = ?", email).First(&user)
    if result.Error != nil {
        if errors.Is(result.Error, gorm.ErrRecordNotFound) {
            return nil, fmt.Errorf("ユーザーが見つかりません: email=%s", email)
        }
        return nil, result.Error
    }
    return &user, nil
}

func (r *userRepository) FindAll(page, limit int, search string) ([]model.User, int64, error) {
    var users []model.User
    var total int64

    query := r.db.Model(&model.User{})

    if search != "" {
        query = query.Where("name LIKE ? OR email LIKE ?",
            "%"+search+"%",
            "%"+search+"%",
        )
    }

    // 総件数を取得
    query.Count(&total)

    // ページネーション
    offset := (page - 1) * limit
    result := query.Offset(offset).Limit(limit).Preload("Profile").Find(&users)
    if result.Error != nil {
        return nil, 0, fmt.Errorf("ユーザー一覧取得エラー: %w", result.Error)
    }

    return users, total, nil
}

func (r *userRepository) Update(user *model.User) error {
    result := r.db.Save(user)
    if result.Error != nil {
        return fmt.Errorf("ユーザー更新エラー: %w", result.Error)
    }
    return nil
}

func (r *userRepository) Delete(id uint) error {
    result := r.db.Unscoped().Delete(&model.User{}, id) // 物理削除
    if result.Error != nil {
        return fmt.Errorf("ユーザー削除エラー: %w", result.Error)
    }
    return nil
}

func (r *userRepository) SoftDelete(id uint) error {
    result := r.db.Delete(&model.User{}, id) // 論理削除（DeletedAtに日時をセット）
    if result.Error != nil {
        return fmt.Errorf("ユーザー削除エラー: %w", result.Error)
    }
    return nil
}
```

### マイグレーション

```go
// pkg/database/migrate.go
package database

import (
    "github.com/yourusername/mywebapp/internal/model"
    "gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) error {
    return db.AutoMigrate(
        &model.User{},
        &model.Profile{},
        &model.Post{},
        &model.Tag{},
    )
}
```

---

## 7. JWT認証の実装

### JWTとは

JSON Web Token（JWT）は、JSONオブジェクトとして情報を安全に伝達するためのオープン標準（RFC 7519）だ。Header・Payload・Signatureの3部分から構成され、サーバーはトークンを検証するだけで認証を完了できるため、ステートレスなAPI認証に適している。

```bash
go get -u github.com/golang-jwt/jwt/v5
go get -u golang.org/x/crypto
```

### JWT認証の完全実装

```go
// internal/service/auth_service.go
package service

import (
    "errors"
    "fmt"
    "os"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/yourusername/mywebapp/internal/model"
    "github.com/yourusername/mywebapp/internal/repository"
    "golang.org/x/crypto/bcrypt"
)

type Claims struct {
    UserID uint   `json:"user_id"`
    Email  string `json:"email"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

type TokenPair struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
    ExpiresAt    int64  `json:"expires_at"`
}

type AuthService struct {
    userRepo      repository.UserRepository
    jwtSecret     []byte
    jwtRefreshKey []byte
}

func NewAuthService(userRepo repository.UserRepository) *AuthService {
    return &AuthService{
        userRepo:      userRepo,
        jwtSecret:     []byte(os.Getenv("JWT_SECRET")),
        jwtRefreshKey: []byte(os.Getenv("JWT_REFRESH_SECRET")),
    }
}

// パスワードのハッシュ化
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return "", fmt.Errorf("パスワードハッシュ化エラー: %w", err)
    }
    return string(bytes), nil
}

// パスワード検証
func CheckPasswordHash(password, hash string) bool {
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// アクセストークンの生成
func (s *AuthService) GenerateAccessToken(user *model.User) (string, error) {
    expiresAt := time.Now().Add(15 * time.Minute)

    claims := &Claims{
        UserID: user.ID,
        Email:  user.Email,
        Role:   user.Role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(expiresAt),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "mywebapp",
            Subject:   fmt.Sprintf("%d", user.ID),
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    tokenString, err := token.SignedString(s.jwtSecret)
    if err != nil {
        return "", fmt.Errorf("トークン生成エラー: %w", err)
    }

    return tokenString, nil
}

// リフレッシュトークンの生成
func (s *AuthService) GenerateRefreshToken(user *model.User) (string, error) {
    expiresAt := time.Now().Add(7 * 24 * time.Hour) // 7日間有効

    claims := &Claims{
        UserID: user.ID,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(expiresAt),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "mywebapp",
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(s.jwtRefreshKey)
}

// トークン検証
func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("予期しない署名方式: %v", token.Header["alg"])
        }
        return s.jwtSecret, nil
    })

    if err != nil {
        return nil, fmt.Errorf("トークン検証エラー: %w", err)
    }

    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, errors.New("無効なトークン")
    }

    return claims, nil
}

// ログイン処理
func (s *AuthService) Login(email, password string) (*TokenPair, error) {
    user, err := s.userRepo.FindByEmail(email)
    if err != nil {
        return nil, errors.New("メールアドレスまたはパスワードが正しくありません")
    }

    if !CheckPasswordHash(password, user.Password) {
        return nil, errors.New("メールアドレスまたはパスワードが正しくありません")
    }

    accessToken, err := s.GenerateAccessToken(user)
    if err != nil {
        return nil, err
    }

    refreshToken, err := s.GenerateRefreshToken(user)
    if err != nil {
        return nil, err
    }

    return &TokenPair{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        ExpiresAt:    time.Now().Add(15 * time.Minute).Unix(),
    }, nil
}

// ユーザー登録
func (s *AuthService) Register(name, email, password string) (*model.User, error) {
    // メールアドレスの重複確認
    existing, _ := s.userRepo.FindByEmail(email)
    if existing != nil {
        return nil, errors.New("このメールアドレスは既に登録されています")
    }

    hashedPassword, err := HashPassword(password)
    if err != nil {
        return nil, err
    }

    user := &model.User{
        Name:     name,
        Email:    email,
        Password: hashedPassword,
        Role:     "user",
        IsActive: true,
    }

    if err := s.userRepo.Create(user); err != nil {
        return nil, err
    }

    return user, nil
}
```

### JWT認証ミドルウェア（Gin）

```go
// internal/middleware/auth.go
package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/yourusername/mywebapp/internal/service"
)

func JWTAuth(authService *service.AuthService) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "認証トークンが必要です"})
            c.Abort()
            return
        }

        // "Bearer <token>" 形式を検証
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "トークン形式が不正です"})
            c.Abort()
            return
        }

        claims, err := authService.ValidateToken(parts[1])
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "トークンが無効または期限切れです"})
            c.Abort()
            return
        }

        // クレームをコンテキストに保存
        c.Set("user_id", claims.UserID)
        c.Set("user_email", claims.Email)
        c.Set("user_role", claims.Role)

        c.Next()
    }
}

// ロールベースのアクセス制御
func RequireRole(roles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole, exists := c.Get("user_role")
        if !exists {
            c.JSON(http.StatusForbidden, gin.H{"error": "権限がありません"})
            c.Abort()
            return
        }

        role := userRole.(string)
        for _, r := range roles {
            if r == role {
                c.Next()
                return
            }
        }

        c.JSON(http.StatusForbidden, gin.H{"error": "この操作を行う権限がありません"})
        c.Abort()
    }
}
```

---

## 8. REST API開発（CRUD完全実装）

### サービス層の実装

```go
// internal/service/post_service.go
package service

import (
    "fmt"
    "strings"
    "unicode"

    "github.com/yourusername/mywebapp/internal/model"
    "github.com/yourusername/mywebapp/internal/repository"
)

type CreatePostInput struct {
    Title     string   `json:"title" binding:"required,min=5,max=255"`
    Content   string   `json:"content" binding:"required,min=10"`
    Tags      []string `json:"tags"`
    Published bool     `json:"published"`
}

type UpdatePostInput struct {
    Title     *string  `json:"title"`
    Content   *string  `json:"content"`
    Tags      []string `json:"tags"`
    Published *bool    `json:"published"`
}

type PostService struct {
    postRepo repository.PostRepository
    tagRepo  repository.TagRepository
}

func NewPostService(postRepo repository.PostRepository, tagRepo repository.TagRepository) *PostService {
    return &PostService{
        postRepo: postRepo,
        tagRepo:  tagRepo,
    }
}

// スラッグの自動生成
func generateSlug(title string) string {
    slug := strings.ToLower(title)
    var result []rune
    for _, r := range slug {
        if unicode.IsLetter(r) || unicode.IsDigit(r) {
            result = append(result, r)
        } else if r == ' ' || r == '-' {
            result = append(result, '-')
        }
    }
    return strings.Trim(string(result), "-")
}

func (s *PostService) CreatePost(userID uint, input CreatePostInput) (*model.Post, error) {
    // タグの取得または作成
    var tags []model.Tag
    for _, tagName := range input.Tags {
        tag, err := s.tagRepo.FindOrCreate(tagName, generateSlug(tagName))
        if err != nil {
            return nil, fmt.Errorf("タグ処理エラー: %w", err)
        }
        tags = append(tags, *tag)
    }

    post := &model.Post{
        UserID:    userID,
        Title:     input.Title,
        Content:   input.Content,
        Published: input.Published,
        Tags:      tags,
    }

    if err := s.postRepo.Create(post); err != nil {
        return nil, err
    }

    return post, nil
}

func (s *PostService) GetPost(id uint) (*model.Post, error) {
    return s.postRepo.FindByID(id)
}

func (s *PostService) ListPosts(page, limit int, published *bool) ([]model.Post, int64, error) {
    return s.postRepo.FindAll(page, limit, published)
}

func (s *PostService) UpdatePost(id, userID uint, input UpdatePostInput) (*model.Post, error) {
    post, err := s.postRepo.FindByID(id)
    if err != nil {
        return nil, err
    }

    // 所有者確認
    if post.UserID != userID {
        return nil, fmt.Errorf("この記事を編集する権限がありません")
    }

    if input.Title != nil {
        post.Title = *input.Title
    }
    if input.Content != nil {
        post.Content = *input.Content
    }
    if input.Published != nil {
        post.Published = *input.Published
    }

    if err := s.postRepo.Update(post); err != nil {
        return nil, err
    }

    return post, nil
}

func (s *PostService) DeletePost(id, userID uint, isAdmin bool) error {
    post, err := s.postRepo.FindByID(id)
    if err != nil {
        return err
    }

    if !isAdmin && post.UserID != userID {
        return fmt.Errorf("この記事を削除する権限がありません")
    }

    return s.postRepo.SoftDelete(id)
}
```

### ハンドラー層の実装

```go
// internal/handler/post_handler.go
package handler

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "github.com/yourusername/mywebapp/internal/service"
)

type PostHandler struct {
    postService *service.PostService
}

func NewPostHandler(postService *service.PostService) *PostHandler {
    return &PostHandler{postService: postService}
}

func (h *PostHandler) ListPosts(c *gin.Context) {
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

    var published *bool
    if p := c.Query("published"); p != "" {
        b := p == "true"
        published = &b
    }

    if page < 1 {
        page = 1
    }
    if limit < 1 || limit > 100 {
        limit = 10
    }

    posts, total, err := h.postService.ListPosts(page, limit, published)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    totalPages := (int(total) + limit - 1) / limit

    c.JSON(http.StatusOK, gin.H{
        "posts":       posts,
        "total":       total,
        "page":        page,
        "limit":       limit,
        "total_pages": totalPages,
    })
}

func (h *PostHandler) GetPost(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "無効なIDです"})
        return
    }

    post, err := h.postService.GetPost(uint(id))
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "記事が見つかりません"})
        return
    }

    c.JSON(http.StatusOK, post)
}

func (h *PostHandler) CreatePost(c *gin.Context) {
    userID, _ := c.Get("user_id")

    var input service.CreatePostInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error":   "入力データが不正です",
            "details": err.Error(),
        })
        return
    }

    post, err := h.postService.CreatePost(userID.(uint), input)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, post)
}

func (h *PostHandler) UpdatePost(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "無効なIDです"})
        return
    }

    userID, _ := c.Get("user_id")
    userRole, _ := c.Get("user_role")

    var input service.UpdatePostInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    _ = userRole

    post, err := h.postService.UpdatePost(uint(id), userID.(uint), input)
    if err != nil {
        c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, post)
}

func (h *PostHandler) DeletePost(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "無効なIDです"})
        return
    }

    userID, _ := c.Get("user_id")
    userRole, _ := c.Get("user_role")
    isAdmin := userRole.(string) == "admin"

    if err := h.postService.DeletePost(uint(id), userID.(uint), isAdmin); err != nil {
        c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "記事を削除しました"})
}

func (h *PostHandler) RegisterRoutes(rg *gin.RouterGroup, authMW gin.HandlerFunc) {
    posts := rg.Group("/posts")
    posts.GET("", h.ListPosts)
    posts.GET("/:id", h.GetPost)
    posts.Use(authMW)
    {
        posts.POST("", h.CreatePost)
        posts.PUT("/:id", h.UpdatePost)
        posts.DELETE("/:id", h.DeletePost)
    }
}
```

---

## 9. WebSocket実装

### WebSocketによるリアルタイム通信

GoはWebSocketのサポートが優れており、`gorilla/websocket`が広く使われている。

```bash
go get github.com/gorilla/websocket
```

### チャットサーバーの実装

```go
// internal/handler/websocket_handler.go
package handler

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
)

// WebSocketのアップグレード設定
var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        // 本番環境では適切なオリジン確認を行う
        return true
    },
}

// メッセージの型定義
type Message struct {
    Type      string    `json:"type"`
    Content   string    `json:"content"`
    UserID    string    `json:"user_id"`
    Username  string    `json:"username"`
    Room      string    `json:"room"`
    Timestamp time.Time `json:"timestamp"`
}

// クライアントの管理
type Client struct {
    ID       string
    Username string
    Room     string
    Conn     *websocket.Conn
    Send     chan Message
    Hub      *Hub
}

// ハブ（接続管理センター）
type Hub struct {
    mu         sync.RWMutex
    clients    map[string]*Client
    rooms      map[string]map[string]*Client
    broadcast  chan Message
    register   chan *Client
    unregister chan *Client
}

func NewHub() *Hub {
    return &Hub{
        clients:    make(map[string]*Client),
        rooms:      make(map[string]map[string]*Client),
        broadcast:  make(chan Message, 256),
        register:   make(chan *Client),
        unregister: make(chan *Client),
    }
}

// ハブの実行（goroutineで起動）
func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            h.clients[client.ID] = client
            if h.rooms[client.Room] == nil {
                h.rooms[client.Room] = make(map[string]*Client)
            }
            h.rooms[client.Room][client.ID] = client
            h.mu.Unlock()

            // 入室メッセージをブロードキャスト
            h.broadcast <- Message{
                Type:      "system",
                Content:   client.Username + " が入室しました",
                Room:      client.Room,
                Timestamp: time.Now(),
            }

        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client.ID]; ok {
                delete(h.clients, client.ID)
                if room, ok := h.rooms[client.Room]; ok {
                    delete(room, client.ID)
                    if len(room) == 0 {
                        delete(h.rooms, client.Room)
                    }
                }
                close(client.Send)
            }
            h.mu.Unlock()

            h.broadcast <- Message{
                Type:      "system",
                Content:   client.Username + " が退室しました",
                Room:      client.Room,
                Timestamp: time.Now(),
            }

        case message := <-h.broadcast:
            h.mu.RLock()
            room := h.rooms[message.Room]
            h.mu.RUnlock()

            for _, client := range room {
                select {
                case client.Send <- message:
                default:
                    close(client.Send)
                    h.mu.Lock()
                    delete(h.clients, client.ID)
                    delete(h.rooms[client.Room], client.ID)
                    h.mu.Unlock()
                }
            }
        }
    }
}

// クライアントのメッセージ読み取り
func (c *Client) ReadPump() {
    defer func() {
        c.Hub.unregister <- c
        c.Conn.Close()
    }()

    c.Conn.SetReadLimit(512 * 1024) // 512KB
    c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
    c.Conn.SetPongHandler(func(string) error {
        c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
        return nil
    })

    for {
        _, rawMessage, err := c.Conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("WebSocketエラー: %v", err)
            }
            break
        }

        var msg Message
        if err := json.Unmarshal(rawMessage, &msg); err != nil {
            log.Printf("メッセージのパースエラー: %v", err)
            continue
        }

        msg.UserID = c.ID
        msg.Username = c.Username
        msg.Room = c.Room
        msg.Timestamp = time.Now()

        c.Hub.broadcast <- msg
    }
}

// クライアントへのメッセージ書き込み
func (c *Client) WritePump() {
    ticker := time.NewTicker(54 * time.Second)
    defer func() {
        ticker.Stop()
        c.Conn.Close()
    }()

    for {
        select {
        case message, ok := <-c.Send:
            c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if !ok {
                c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            data, err := json.Marshal(message)
            if err != nil {
                log.Printf("メッセージのシリアライズエラー: %v", err)
                continue
            }

            if err := c.Conn.WriteMessage(websocket.TextMessage, data); err != nil {
                return
            }

        case <-ticker.C:
            c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

// WebSocketハンドラー
type WSHandler struct {
    hub *Hub
}

func NewWSHandler(hub *Hub) *WSHandler {
    return &WSHandler{hub: hub}
}

func (h *WSHandler) HandleWebSocket(c *gin.Context) {
    userID := c.Query("user_id")
    username := c.Query("username")
    room := c.DefaultQuery("room", "general")

    if userID == "" || username == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "user_idとusernameが必要です"})
        return
    }

    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("WebSocketアップグレードエラー: %v", err)
        return
    }

    client := &Client{
        ID:       userID,
        Username: username,
        Room:     room,
        Conn:     conn,
        Send:     make(chan Message, 256),
        Hub:      h.hub,
    }

    h.hub.register <- client

    // 読み書きをgoroutineで並行実行
    go client.WritePump()
    go client.ReadPump()
}
```

---

## 10. GoroutineとGoの並行処理

### Goroutineの基礎

Goroutineはgoキーワードで起動する軽量な並行処理単位だ。OSスレッドとは異なり、GoランタイムがM:Nモデルでスケジューリングを管理する。

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// 基本的なGoroutine
func basicGoroutine() {
    var wg sync.WaitGroup

    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            fmt.Printf("Goroutine %d が実行中\n", id)
            time.Sleep(time.Millisecond * 100)
        }(i)
    }

    wg.Wait()
    fmt.Println("全Goroutineが完了")
}

// チャネルを使った通信
func channelExample() {
    jobs := make(chan int, 10)
    results := make(chan int, 10)

    // ワーカーを3つ起動
    for w := 0; w < 3; w++ {
        go func() {
            for job := range jobs {
                result := job * job // 2乗を計算
                results <- result
            }
        }()
    }

    // ジョブを投入
    for i := 1; i <= 9; i++ {
        jobs <- i
    }
    close(jobs)

    // 結果を収集
    for i := 0; i < 9; i++ {
        fmt.Printf("結果: %d\n", <-results)
    }
}

// selectによる複数チャネルの待機
func selectExample() {
    ch1 := make(chan string)
    ch2 := make(chan string)

    go func() {
        time.Sleep(1 * time.Second)
        ch1 <- "ch1からのメッセージ"
    }()

    go func() {
        time.Sleep(2 * time.Second)
        ch2 <- "ch2からのメッセージ"
    }()

    for i := 0; i < 2; i++ {
        select {
        case msg := <-ch1:
            fmt.Println(msg)
        case msg := <-ch2:
            fmt.Println(msg)
        }
    }
}
```

### 並列HTTPリクエスト処理

```go
// 複数の外部APIを並列で呼び出す例
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "sync"
    "time"
)

type APIResult struct {
    URL     string
    Data    interface{}
    Error   error
    Latency time.Duration
}

func fetchAPI(ctx context.Context, url string) APIResult {
    start := time.Now()
    result := APIResult{URL: url}

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        result.Error = err
        return result
    }

    client := &http.Client{Timeout: 10 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        result.Error = err
        result.Latency = time.Since(start)
        return result
    }
    defer resp.Body.Close()

    var data interface{}
    if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
        result.Error = err
    } else {
        result.Data = data
    }
    result.Latency = time.Since(start)

    return result
}

func fetchAPIsParallel(urls []string) []APIResult {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    results := make([]APIResult, len(urls))
    var wg sync.WaitGroup

    for i, url := range urls {
        wg.Add(1)
        go func(index int, u string) {
            defer wg.Done()
            results[index] = fetchAPI(ctx, u)
        }(i, url)
    }

    wg.Wait()
    return results
}

// Worker Poolパターン
type WorkerPool struct {
    numWorkers int
    jobs       chan func()
    wg         sync.WaitGroup
}

func NewWorkerPool(numWorkers int) *WorkerPool {
    pool := &WorkerPool{
        numWorkers: numWorkers,
        jobs:       make(chan func(), numWorkers*10),
    }

    for i := 0; i < numWorkers; i++ {
        go pool.worker()
    }

    return pool
}

func (p *WorkerPool) worker() {
    for job := range p.jobs {
        job()
        p.wg.Done()
    }
}

func (p *WorkerPool) Submit(job func()) {
    p.wg.Add(1)
    p.jobs <- job
}

func (p *WorkerPool) Wait() {
    p.wg.Wait()
}

func (p *WorkerPool) Stop() {
    close(p.jobs)
}

func main() {
    pool := NewWorkerPool(5)
    defer pool.Stop()

    for i := 0; i < 20; i++ {
        id := i
        pool.Submit(func() {
            fmt.Printf("タスク %d を処理中\n", id)
            time.Sleep(time.Millisecond * 100)
        })
    }

    pool.Wait()
    fmt.Println("全タスク完了")
}
```

### contextを使ったキャンセル処理

```go
// internal/service/background_service.go
package service

import (
    "context"
    "log"
    "time"
)

type BackgroundService struct {
    ticker *time.Ticker
    done   chan struct{}
}

func NewBackgroundService(interval time.Duration) *BackgroundService {
    return &BackgroundService{
        ticker: time.NewTicker(interval),
        done:   make(chan struct{}),
    }
}

func (s *BackgroundService) Start(ctx context.Context) {
    go func() {
        for {
            select {
            case <-s.ticker.C:
                if err := s.process(ctx); err != nil {
                    log.Printf("バックグラウンド処理エラー: %v", err)
                }
            case <-ctx.Done():
                log.Println("バックグラウンドサービスを停止します")
                s.ticker.Stop()
                return
            case <-s.done:
                s.ticker.Stop()
                return
            }
        }
    }()
}

func (s *BackgroundService) process(ctx context.Context) error {
    // コンテキストのキャンセルを確認しながら処理
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
    }

    log.Println("定期処理を実行中...")
    // 実際の処理をここに記述
    return nil
}

func (s *BackgroundService) Stop() {
    close(s.done)
}
```

---

## 11. テスト

### テストの基本

Goには`testing`パッケージが標準で含まれており、追加ライブラリなしでテストを書ける。`testify`はアサーションを豊かにする人気ライブラリだ。

```bash
go get github.com/stretchr/testify/assert
go get github.com/stretchr/testify/mock
go get github.com/stretchr/testify/require
```

### ユニットテスト

```go
// internal/service/auth_service_test.go
package service_test

import (
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "github.com/yourusername/mywebapp/internal/service"
)

func TestHashPassword(t *testing.T) {
    tests := []struct {
        name     string
        password string
        wantErr  bool
    }{
        {
            name:     "正常なパスワード",
            password: "securePassword123",
            wantErr:  false,
        },
        {
            name:     "短いパスワード",
            password: "abc",
            wantErr:  false, // bcryptは短いパスワードも受け付ける
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            hash, err := service.HashPassword(tt.password)
            if tt.wantErr {
                assert.Error(t, err)
                return
            }
            require.NoError(t, err)
            assert.NotEmpty(t, hash)
            assert.NotEqual(t, tt.password, hash)
        })
    }
}

func TestCheckPasswordHash(t *testing.T) {
    password := "mySecretPassword"
    hash, err := service.HashPassword(password)
    require.NoError(t, err)

    assert.True(t, service.CheckPasswordHash(password, hash), "正しいパスワードは一致するはず")
    assert.False(t, service.CheckPasswordHash("wrongPassword", hash), "誤ったパスワードは不一致のはず")
}
```

### モックを使ったテスト

```go
// internal/service/post_service_test.go
package service_test

import (
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/stretchr/testify/require"
    "github.com/yourusername/mywebapp/internal/model"
    "github.com/yourusername/mywebapp/internal/service"
)

// PostRepositoryのモック
type MockPostRepository struct {
    mock.Mock
}

func (m *MockPostRepository) Create(post *model.Post) error {
    args := m.Called(post)
    return args.Error(0)
}

func (m *MockPostRepository) FindByID(id uint) (*model.Post, error) {
    args := m.Called(id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*model.Post), args.Error(1)
}

func (m *MockPostRepository) FindAll(page, limit int, published *bool) ([]model.Post, int64, error) {
    args := m.Called(page, limit, published)
    return args.Get(0).([]model.Post), args.Get(1).(int64), args.Error(2)
}

func (m *MockPostRepository) Update(post *model.Post) error {
    args := m.Called(post)
    return args.Error(0)
}

func (m *MockPostRepository) SoftDelete(id uint) error {
    args := m.Called(id)
    return args.Error(0)
}

// TagRepositoryのモック
type MockTagRepository struct {
    mock.Mock
}

func (m *MockTagRepository) FindOrCreate(name, slug string) (*model.Tag, error) {
    args := m.Called(name, slug)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*model.Tag), args.Error(1)
}

func TestCreatePost(t *testing.T) {
    mockPostRepo := new(MockPostRepository)
    mockTagRepo := new(MockTagRepository)

    // モックの期待値を設定
    mockTagRepo.On("FindOrCreate", "Go", mock.AnythingOfType("string")).
        Return(&model.Tag{ID: 1, Name: "Go", Slug: "go"}, nil)

    mockPostRepo.On("Create", mock.AnythingOfType("*model.Post")).
        Return(nil)

    postService := service.NewPostService(mockPostRepo, mockTagRepo)

    input := service.CreatePostInput{
        Title:     "Go言語入門",
        Content:   "Goは素晴らしい言語です。この記事では基礎から解説します。",
        Tags:      []string{"Go"},
        Published: true,
    }

    post, err := postService.CreatePost(1, input)
    require.NoError(t, err)
    assert.NotNil(t, post)
    assert.Equal(t, "Go言語入門", post.Title)
    assert.Equal(t, uint(1), post.UserID)

    // モックが期待どおりに呼ばれたか確認
    mockPostRepo.AssertExpectations(t)
    mockTagRepo.AssertExpectations(t)
}

func TestDeletePost_Unauthorized(t *testing.T) {
    mockPostRepo := new(MockPostRepository)
    mockTagRepo := new(MockTagRepository)

    existingPost := &model.Post{
        UserID:  2, // 別のユーザーの記事
        Title:   "他のユーザーの記事",
        Content: "内容",
    }
    existingPost.ID = 1

    mockPostRepo.On("FindByID", uint(1)).Return(existingPost, nil)

    postService := service.NewPostService(mockPostRepo, mockTagRepo)

    err := postService.DeletePost(1, 1, false) // userID=1、管理者ではない
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "権限がありません")

    mockPostRepo.AssertExpectations(t)
}
```

### HTTPハンドラーのテスト

```go
// internal/handler/post_handler_test.go
package handler_test

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func setupTestRouter() *gin.Engine {
    gin.SetMode(gin.TestMode)
    r := gin.New()
    return r
}

func TestListPostsHandler(t *testing.T) {
    r := setupTestRouter()
    r.GET("/api/v1/posts", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "posts": []interface{}{},
            "total": 0,
        })
    })

    req, err := http.NewRequest(http.MethodGet, "/api/v1/posts", nil)
    require.NoError(t, err)

    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusOK, w.Code)

    var response map[string]interface{}
    err = json.Unmarshal(w.Body.Bytes(), &response)
    require.NoError(t, err)
    assert.Contains(t, response, "posts")
    assert.Contains(t, response, "total")
}

func TestCreatePostHandler_Unauthorized(t *testing.T) {
    r := setupTestRouter()
    r.POST("/api/v1/posts", func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
            return
        }
        c.JSON(http.StatusCreated, gin.H{"id": 1})
    })

    body := strings.NewReader(`{"title":"テスト記事","content":"内容"}`)
    req, err := http.NewRequest(http.MethodPost, "/api/v1/posts", body)
    require.NoError(t, err)
    req.Header.Set("Content-Type", "application/json")

    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// ベンチマークテスト
func BenchmarkListPostsHandler(b *testing.B) {
    r := setupTestRouter()
    r.GET("/api/v1/posts", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"posts": []interface{}{}})
    })

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        req, _ := http.NewRequest(http.MethodGet, "/api/v1/posts", nil)
        w := httptest.NewRecorder()
        r.ServeHTTP(w, req)
    }
}
```

### テストの実行

```bash
# 全テストを実行
go test ./...

# 特定パッケージのテスト
go test ./internal/service/...

# 詳細出力
go test -v ./...

# カバレッジレポート
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# 特定のテストのみ実行
go test -run TestCreatePost ./internal/service/...

# ベンチマーク実行
go test -bench=. -benchmem ./...

# レース条件の検出
go test -race ./...
```

---

## 12. Dockerによるコンテナ化

### マルチステージビルドDockerfile

```dockerfile
# Dockerfile
# ビルドステージ
FROM golang:1.23-alpine AS builder

# 必要なツールのインストール
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# 依存関係のコピーとダウンロード（レイヤーキャッシュを活用）
COPY go.mod go.sum ./
RUN go mod download

# ソースコードのコピー
COPY . .

# CGO無効でスタティックバイナリをビルド
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s -X main.version=$(git describe --tags --always) -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -o /app/server \
    ./cmd/server

# 本番ステージ（最小イメージ）
FROM scratch

# タイムゾーンとCA証明書のコピー
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# バイナリのコピー
COPY --from=builder /app/server /server

# ポートの公開
EXPOSE 8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/server", "-health-check"]

# 非rootユーザーで実行
USER 65532:65532

ENTRYPOINT ["/server"]
```

### Docker Compose設定

```yaml
# docker-compose.yml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=appuser
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=myapp
      - DB_SSL_MODE=disable
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - REDIS_URL=redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=myapp
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - app-network

volumes:
  postgres-data:
  redis-data:

networks:
  app-network:
    driver: bridge
```

### Makefile（開発効率化）

```makefile
# Makefile
.PHONY: all build test clean docker-build docker-up docker-down lint

# 変数
APP_NAME := mywebapp
BUILD_DIR := ./bin
DOCKER_IMAGE := $(APP_NAME):latest

all: build

# ビルド
build:
	@echo "ビルド中..."
	CGO_ENABLED=0 go build -o $(BUILD_DIR)/$(APP_NAME) ./cmd/server

# テスト実行
test:
	@echo "テスト実行中..."
	go test -v -race -coverprofile=coverage.out ./...

# テストカバレッジの表示
test-coverage: test
	go tool cover -html=coverage.out -o coverage.html
	@echo "カバレッジレポート: coverage.html"

# ベンチマーク
bench:
	go test -bench=. -benchmem ./...

# Lintチェック
lint:
	golangci-lint run ./...

# ホットリロード（air使用）
dev:
	air

# Dockerビルド
docker-build:
	docker build -t $(DOCKER_IMAGE) .

# Docker Compose起動
docker-up:
	docker-compose up -d

# Docker Compose停止
docker-down:
	docker-compose down

# データベースマイグレーション
migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down

# 依存関係の整理
tidy:
	go mod tidy

# クリーンアップ
clean:
	rm -rf $(BUILD_DIR) coverage.out coverage.html
```

---

## 13. マイクロサービスアーキテクチャ

### マイクロサービスの設計原則

マイクロサービスでは、各サービスが独立してデプロイ・スケールできるように設計する。GoはマイクロサービスのサイドカーパターンやAPIゲートウェイに最適だ。

```go
// APIゲートウェイの実装例
// cmd/gateway/main.go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"

    "github.com/gin-gonic/gin"
)

type ServiceConfig struct {
    Name    string
    URL     string
    Timeout time.Duration
}

type Gateway struct {
    services map[string]*ServiceConfig
    mu       sync.RWMutex
}

func NewGateway() *Gateway {
    return &Gateway{
        services: map[string]*ServiceConfig{
            "users": {
                Name:    "users",
                URL:     getEnv("USER_SERVICE_URL", "http://user-service:8081"),
                Timeout: 10 * time.Second,
            },
            "posts": {
                Name:    "posts",
                URL:     getEnv("POST_SERVICE_URL", "http://post-service:8082"),
                Timeout: 10 * time.Second,
            },
            "notifications": {
                Name:    "notifications",
                URL:     getEnv("NOTIFICATION_SERVICE_URL", "http://notification-service:8083"),
                Timeout: 5 * time.Second,
            },
        },
    }
}

func getEnv(key, defaultVal string) string {
    if val := os.Getenv(key); val != "" {
        return val
    }
    return defaultVal
}

// リバースプロキシハンドラーの作成
func (g *Gateway) createProxy(serviceName string) gin.HandlerFunc {
    return func(c *gin.Context) {
        g.mu.RLock()
        svc, exists := g.services[serviceName]
        g.mu.RUnlock()

        if !exists {
            c.JSON(http.StatusNotFound, gin.H{"error": "サービスが見つかりません"})
            return
        }

        target, err := url.Parse(svc.URL)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "サービス設定エラー"})
            return
        }

        proxy := httputil.NewSingleHostReverseProxy(target)
        proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
            log.Printf("プロキシエラー [%s]: %v", serviceName, err)
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusBadGateway)
            fmt.Fprintf(w, `{"error":"サービスが一時的に利用できません"}`)
        }

        // 元のパスからサービスプレフィックスを除去
        c.Request.URL.Path = c.Param("path")
        if c.Request.URL.Path == "" {
            c.Request.URL.Path = "/"
        }

        proxy.ServeHTTP(c.Writer, c.Request)
    }
}

func main() {
    gateway := NewGateway()
    r := gin.Default()

    // 各サービスへのルーティング
    r.Any("/api/users/*path", gateway.createProxy("users"))
    r.Any("/api/posts/*path", gateway.createProxy("posts"))
    r.Any("/api/notifications/*path", gateway.createProxy("notifications"))

    // ヘルスチェック
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status":   "healthy",
            "services": len(gateway.services),
        })
    })

    srv := &http.Server{
        Addr:    ":8080",
        Handler: r,
    }

    // グレースフルシャットダウン
    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("サーバー起動エラー: %v", err)
        }
    }()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("サーバーを停止しています...")
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("強制シャットダウン: %v", err)
    }

    log.Println("サーバーが正常に停止しました")
}
```

### gRPCによるサービス間通信

```bash
go get google.golang.org/grpc
go get google.golang.org/protobuf
```

```protobuf
// proto/user.proto
syntax = "proto3";

package user;

option go_package = "github.com/yourusername/mywebapp/proto/user";

service UserService {
    rpc GetUser (GetUserRequest) returns (UserResponse);
    rpc CreateUser (CreateUserRequest) returns (UserResponse);
    rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
}

message GetUserRequest {
    uint64 id = 1;
}

message CreateUserRequest {
    string name = 1;
    string email = 2;
    string password = 3;
}

message UserResponse {
    uint64 id = 1;
    string name = 2;
    string email = 3;
    string role = 4;
    string created_at = 5;
}

message ListUsersRequest {
    int32 page = 1;
    int32 limit = 2;
    string search = 3;
}

message ListUsersResponse {
    repeated UserResponse users = 1;
    int64 total = 2;
}
```

```go
// internal/grpc/user_server.go
package grpc

import (
    "context"
    "fmt"

    "github.com/yourusername/mywebapp/internal/repository"
    pb "github.com/yourusername/mywebapp/proto/user"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type UserGRPCServer struct {
    pb.UnimplementedUserServiceServer
    userRepo repository.UserRepository
}

func NewUserGRPCServer(userRepo repository.UserRepository) *UserGRPCServer {
    return &UserGRPCServer{userRepo: userRepo}
}

func (s *UserGRPCServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.UserResponse, error) {
    if req.Id == 0 {
        return nil, status.Error(codes.InvalidArgument, "IDが必要です")
    }

    user, err := s.userRepo.FindByID(uint(req.Id))
    if err != nil {
        return nil, status.Error(codes.NotFound, fmt.Sprintf("ユーザーが見つかりません: %v", err))
    }

    return &pb.UserResponse{
        Id:        uint64(user.ID),
        Name:      user.Name,
        Email:     user.Email,
        Role:      user.Role,
        CreatedAt: user.CreatedAt.String(),
    }, nil
}

func (s *UserGRPCServer) ListUsers(ctx context.Context, req *pb.ListUsersRequest) (*pb.ListUsersResponse, error) {
    page := int(req.Page)
    if page < 1 {
        page = 1
    }
    limit := int(req.Limit)
    if limit < 1 || limit > 100 {
        limit = 10
    }

    users, total, err := s.userRepo.FindAll(page, limit, req.Search)
    if err != nil {
        return nil, status.Error(codes.Internal, fmt.Sprintf("ユーザー一覧取得エラー: %v", err))
    }

    var pbUsers []*pb.UserResponse
    for _, u := range users {
        pbUsers = append(pbUsers, &pb.UserResponse{
            Id:    uint64(u.ID),
            Name:  u.Name,
            Email: u.Email,
            Role:  u.Role,
        })
    }

    return &pb.ListUsersResponse{
        Users: pbUsers,
        Total: total,
    }, nil
}
```

---

## 14. パフォーマンス最適化とベンチマーク

### プロファイリング

GoにはPProfという標準的なプロファイリングツールが含まれている。

```go
// cmd/server/main.go（プロファイリング有効化）
package main

import (
    "log"
    "net/http"
    _ "net/http/pprof" // プロファイラーを有効化
    "time"

    "github.com/gin-gonic/gin"
)

func main() {
    // プロファイリングエンドポイントを別ポートで起動（本番では認証が必要）
    go func() {
        log.Println("PProfサーバーを起動: http://localhost:6060/debug/pprof/")
        if err := http.ListenAndServe(":6060", nil); err != nil {
            log.Printf("PProfサーバーエラー: %v", err)
        }
    }()

    r := gin.Default()
    // ... ルーティング設定

    if err := r.Run(":8080"); err != nil {
        log.Fatal(err)
    }
}
```

```bash
# CPUプロファイルの取得（30秒間）
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# メモリプロファイルの取得
go tool pprof http://localhost:6060/debug/pprof/heap

# goroutineの一覧
curl http://localhost:6060/debug/pprof/goroutine?debug=1
```

### メモリ最適化

```go
// pkg/pool/buffer_pool.go
package pool

import (
    "bytes"
    "sync"
)

// sync.Poolを使ったバッファプール
var BufferPool = &sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

// バッファを取得
func GetBuffer() *bytes.Buffer {
    buf := BufferPool.Get().(*bytes.Buffer)
    buf.Reset()
    return buf
}

// バッファを返却
func PutBuffer(buf *bytes.Buffer) {
    if buf.Cap() > 1024*1024 { // 1MB超のバッファは返却しない
        return
    }
    BufferPool.Put(buf)
}

// 使用例
func processRequest(data []byte) []byte {
    buf := GetBuffer()
    defer PutBuffer(buf)

    buf.Write(data)
    // 処理...

    result := make([]byte, buf.Len())
    copy(result, buf.Bytes())
    return result
}
```

### キャッシュの実装

```go
// pkg/cache/cache.go
package cache

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

type Cache struct {
    client *redis.Client
    prefix string
}

func NewCache(addr, password string, db int, prefix string) *Cache {
    rdb := redis.NewClient(&redis.Options{
        Addr:         addr,
        Password:     password,
        DB:           db,
        PoolSize:     10,
        MinIdleConns: 5,
    })

    return &Cache{
        client: rdb,
        prefix: prefix,
    }
}

func (c *Cache) key(k string) string {
    return fmt.Sprintf("%s:%s", c.prefix, k)
}

// データの保存
func (c *Cache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
    data, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("キャッシュシリアライズエラー: %w", err)
    }

    return c.client.Set(ctx, c.key(key), data, ttl).Err()
}

// データの取得
func (c *Cache) Get(ctx context.Context, key string, dest interface{}) error {
    data, err := c.client.Get(ctx, c.key(key)).Bytes()
    if err != nil {
        if err == redis.Nil {
            return fmt.Errorf("キャッシュミス: %s", key)
        }
        return fmt.Errorf("キャッシュ取得エラー: %w", err)
    }

    return json.Unmarshal(data, dest)
}

// データの削除
func (c *Cache) Delete(ctx context.Context, keys ...string) error {
    fullKeys := make([]string, len(keys))
    for i, k := range keys {
        fullKeys[i] = c.key(k)
    }
    return c.client.Del(ctx, fullKeys...).Err()
}

// キャッシュを使ったリポジトリラッパー
type CachedUserRepository struct {
    repo  repository.UserRepository
    cache *Cache
    ttl   time.Duration
}

func NewCachedUserRepository(repo repository.UserRepository, cache *Cache, ttl time.Duration) *CachedUserRepository {
    return &CachedUserRepository{
        repo:  repo,
        cache: cache,
        ttl:   ttl,
    }
}

func (r *CachedUserRepository) FindByID(id uint) (*model.User, error) {
    ctx := context.Background()
    cacheKey := fmt.Sprintf("user:%d", id)

    var user model.User
    if err := r.cache.Get(ctx, cacheKey, &user); err == nil {
        return &user, nil // キャッシュヒット
    }

    // キャッシュミス：DBから取得
    dbUser, err := r.repo.FindByID(id)
    if err != nil {
        return nil, err
    }

    // キャッシュに保存
    if err := r.cache.Set(ctx, cacheKey, dbUser, r.ttl); err != nil {
        // キャッシュ保存失敗はログに記録するが、エラーは返さない
        fmt.Printf("キャッシュ保存エラー: %v\n", err)
    }

    return dbUser, nil
}
```

### ベンチマークテスト

```go
// pkg/cache/cache_benchmark_test.go
package cache_test

import (
    "context"
    "fmt"
    "testing"
)

func BenchmarkCacheSet(b *testing.B) {
    cache := NewCache("localhost:6379", "", 0, "bench")
    ctx := context.Background()

    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        i := 0
        for pb.Next() {
            key := fmt.Sprintf("key-%d", i)
            cache.Set(ctx, key, map[string]string{"data": "value"}, 60*time.Second)
            i++
        }
    })
}

func BenchmarkCacheGet(b *testing.B) {
    cache := NewCache("localhost:6379", "", 0, "bench")
    ctx := context.Background()

    // 事前にデータを投入
    for i := 0; i < 1000; i++ {
        key := fmt.Sprintf("key-%d", i)
        cache.Set(ctx, key, map[string]string{"data": "value"}, 60*time.Second)
    }

    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        i := 0
        for pb.Next() {
            key := fmt.Sprintf("key-%d", i%1000)
            var result map[string]string
            cache.Get(ctx, key, &result)
            i++
        }
    })
}
```

### パフォーマンスチューニングのポイント

**1. コネクションプールの適切な設定**

```go
sqlDB, err := db.DB()
sqlDB.SetMaxIdleConns(25)    // アイドル接続数
sqlDB.SetMaxOpenConns(100)   // 最大接続数
sqlDB.SetConnMaxLifetime(5 * time.Minute) // 接続の最大寿命
```

**2. HTTPクライアントの再利用**

```go
// BAD: リクエストごとに新しいクライアントを作成
func fetchData() {
    client := &http.Client{} // 毎回作成はコスト高
    // ...
}

// GOOD: 共有クライアントを使用
var httpClient = &http.Client{
    Timeout: 10 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxConnsPerHost:     100,
        MaxIdleConnsPerHost: 100,
        IdleConnTimeout:     90 * time.Second,
    },
}
```

**3. JSONエンコードの最適化**

```go
// 大量データのストリーミングエンコード
func streamJSONResponse(w http.ResponseWriter, data []interface{}) {
    w.Header().Set("Content-Type", "application/json")
    encoder := json.NewEncoder(w)
    encoder.SetEscapeHTML(false) // HTMLエスケープ不要な場合は無効化
    encoder.Encode(data)
}
```

**4. StringBuilderの活用**

```go
// BAD: 文字列の連結（毎回メモリ確保が発生）
result := ""
for i := 0; i < 1000; i++ {
    result += fmt.Sprintf("item-%d,", i)
}

// GOOD: strings.Builderを使用
var sb strings.Builder
sb.Grow(10000) // 事前に容量確保
for i := 0; i < 1000; i++ {
    fmt.Fprintf(&sb, "item-%d,", i)
}
result := sb.String()
```

---

## まとめ

本記事では、Go言語によるWeb開発の全体像を解説した。

**学んだ主なポイント:**

- `net/http`標準パッケージだけでも実用的なWebサーバーを構築できる
- GinとEchoはそれぞれ異なるトレードオフを持つ優れたフレームワークだ
- GORMとリポジトリパターンを組み合わせることで、保守性の高いデータ層を実現できる
- JWT認証はステートレスなAPI認証に最適で、アクセストークンとリフレッシュトークンの組み合わせが鉄板だ
- GoroutineとチャネルはGoの並行処理の核心であり、Worker Poolパターンで効率よくリソースを管理できる
- テストはユニット・統合・ベンチマークを組み合わせ、`go test -race`でレース条件も検出する
- Dockerのマルチステージビルドで、小さく安全なコンテナイメージを作成できる
- マイクロサービスではgRPCがサービス間通信の強力な選択肢となる
- PProfとRedisキャッシュでパフォーマンスを大幅に改善できる

Goは学習コストが低く、習得後の生産性が高い言語だ。特にAPI開発・マイクロサービス・CLIツールの分野では、今後もその存在感を増していくだろう。

---

## 開発効率をさらに高めるツール

Go開発の生産性を上げるには、適切なツールセットが欠かせない。**[DevToolBox](https://usedevtools.com)** は、Web開発者向けのオールインワンツールプラットフォームだ。JSON整形・Base64エンコード・JWT デコード・正規表現テスター・カラーピッカー・タイムスタンプ変換など、開発中に繰り返し使うユーティリティが一か所にまとまっている。

特にGoのAPIデバッグ時には、JWTデコーダーでトークンの中身を確認したり、JSONフォーマッターでレスポンスを整形したりする場面が多い。ブックマークしておくと日々の開発がスムーズになる。

---

## 参考リンク

- [Go公式ドキュメント](https://go.dev/doc/)
- [Go By Example](https://gobyexample.com/)
- [Gin フレームワーク](https://gin-gonic.com/)
- [Echo フレームワーク](https://echo.labstack.com/)
- [GORM ドキュメント](https://gorm.io/ja_JP/)
- [golang-jwt/jwt](https://github.com/golang-jwt/jwt)
- [gorilla/websocket](https://github.com/gorilla/websocket)
- [DevToolBox — 開発者向けツール集](https://usedevtools.com)

---

## スキルアップ・キャリアアップのおすすめリソース

Go言語のスキルはバックエンド・クラウドインフラ領域で非常に高く評価される。キャリアアップに活用してほしい。

### 転職・キャリアアップ
- **[レバテックキャリア](https://levtech.jp)** — ITエンジニア専門の転職エージェント。GoエンジニアはAPI開発・マイクロサービス・インフラ領域で高単価案件が豊富。無料相談可能。
- **[Findy](https://findy-job.com)** — GitHubのGoプロジェクトが評価対象。スカウト型でスタートアップ・大手Tech企業からのオファーが届きやすい。リモート求人が充実。

### オンライン学習
- **[Udemy](https://www.udemy.com)** — Go言語の入門から応用（Gin・gRPC・マイクロサービス）まで実践コースが充実。現場で使われるパターンを体系的に習得できる。セール時は90%オフになることも。
