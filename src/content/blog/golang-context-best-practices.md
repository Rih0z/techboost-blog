---
title: 'Go言語Context完全ガイド: キャンセル・タイムアウト・値の伝播'
description: 'Go言語のcontextパッケージを徹底解説。WithCancel、WithTimeout、WithValueの使い方、伝播パターン、ベストプラクティスを実例コード付きで説明します。'
pubDate: 'Feb 05 2025'
tags: ['Go', 'Golang', 'Context', 'Concurrency', 'BestPractices']
---

Go言語の`context`パッケージは、ゴルーチン間でキャンセル信号、デッドライン、リクエストスコープの値を伝播するための標準的な仕組みです。Web APIやデータベースアクセスで必須の知識です。

## Contextとは

Contextは、並行処理において以下を管理します。

**主な役割:**
- **キャンセル伝播**: 上位の処理がキャンセルされたら、下位も中断
- **タイムアウト制御**: 時間制限のある処理を実装
- **値の伝播**: リクエストIDやユーザー情報などをゴルーチン間で共有
- **デッドライン管理**: 絶対時刻での処理期限を設定

## 基本: context.Background と context.TODO

すべてのContextの起点となる2つの関数があります。

```go
package main

import (
    "context"
    "fmt"
)

func main() {
    // context.Background: メイン関数やトップレベルで使用
    ctx := context.Background()

    // context.TODO: まだどのContextを使うか決まっていないときの一時的な代用
    ctxTodo := context.TODO()

    processData(ctx)
}

func processData(ctx context.Context) {
    fmt.Println("処理開始")
    // ctx を下流の関数に渡していく
}
```

**使い分けのルール:**
- `context.Background()`: 本番コードのエントリーポイント
- `context.TODO()`: リファクタリング中の一時的な代用

## WithCancel: キャンセル可能なContext

手動でキャンセル可能なContextを作成します。

### 基本例

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    ctx, cancel := context.WithCancel(context.Background())

    // ゴルーチンで長時間処理を開始
    go longRunningTask(ctx)

    // 2秒後にキャンセル
    time.Sleep(2 * time.Second)
    cancel()

    // キャンセルが伝播するまで待機
    time.Sleep(1 * time.Second)
}

func longRunningTask(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            fmt.Println("キャンセルされました:", ctx.Err())
            return
        default:
            fmt.Println("処理中...")
            time.Sleep(500 * time.Millisecond)
        }
    }
}
```

### 複数ゴルーチンへの伝播

```go
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel() // 必ずcancelを呼ぶ

    // 複数のゴルーチンを起動
    for i := 1; i <= 3; i++ {
        go worker(ctx, i)
    }

    time.Sleep(3 * time.Second)
    fmt.Println("全ワーカーをキャンセル")
    cancel() // すべてのworkerに伝播

    time.Sleep(1 * time.Second)
}

func worker(ctx context.Context, id int) {
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("Worker %d 停止\n", id)
            return
        default:
            fmt.Printf("Worker %d 稼働中\n", id)
            time.Sleep(500 * time.Millisecond)
        }
    }
}
```

## WithTimeout: タイムアウト制御

指定時間後に自動的にキャンセルされるContextです。

### 基本例

```go
func main() {
    // 3秒のタイムアウト
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel() // タイムアウト前に終了した場合のリソース解放

    result := make(chan string, 1)

    go fetchData(ctx, result)

    select {
    case res := <-result:
        fmt.Println("取得成功:", res)
    case <-ctx.Done():
        fmt.Println("タイムアウト:", ctx.Err())
    }
}

func fetchData(ctx context.Context, result chan<- string) {
    // 5秒かかる処理（タイムアウトが先に発動する）
    time.Sleep(5 * time.Second)

    select {
    case result <- "データ":
    case <-ctx.Done():
        fmt.Println("fetchData中断")
    }
}
```

### HTTPリクエストへの適用

```go
package main

import (
    "context"
    "fmt"
    "io"
    "net/http"
    "time"
)

func fetchURL(ctx context.Context, url string) (string, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return "", err
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return "", err
    }

    return string(body), nil
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    data, err := fetchURL(ctx, "https://api.example.com/data")
    if err != nil {
        fmt.Println("エラー:", err)
        return
    }

    fmt.Println("取得成功:", len(data), "bytes")
}
```

## WithDeadline: 絶対時刻での期限設定

WithTimeoutは相対時間ですが、WithDeadlineは絶対時刻を指定します。

```go
func main() {
    // 現在時刻から10秒後を期限に設定
    deadline := time.Now().Add(10 * time.Second)
    ctx, cancel := context.WithDeadline(context.Background(), deadline)
    defer cancel()

    go processWithDeadline(ctx)

    time.Sleep(15 * time.Second)
}

func processWithDeadline(ctx context.Context) {
    deadline, ok := ctx.Deadline()
    if ok {
        fmt.Println("期限:", deadline.Format(time.RFC3339))
    }

    for {
        select {
        case <-ctx.Done():
            fmt.Println("期限到達:", ctx.Err())
            return
        default:
            fmt.Println("処理中...")
            time.Sleep(2 * time.Second)
        }
    }
}
```

## WithValue: 値の伝播

リクエストスコープの値をゴルーチン間で共有します。

### 基本例

```go
type contextKey string

const (
    userIDKey     contextKey = "userID"
    requestIDKey  contextKey = "requestID"
)

func main() {
    ctx := context.Background()

    // 値を追加
    ctx = context.WithValue(ctx, userIDKey, "user123")
    ctx = context.WithValue(ctx, requestIDKey, "req-abc-456")

    handleRequest(ctx)
}

func handleRequest(ctx context.Context) {
    userID := ctx.Value(userIDKey).(string)
    requestID := ctx.Value(requestIDKey).(string)

    fmt.Printf("User: %s, Request: %s\n", userID, requestID)

    // 下流の関数にctxを渡す
    processData(ctx)
}

func processData(ctx context.Context) {
    // 上流で設定された値にアクセス可能
    userID := ctx.Value(userIDKey).(string)
    fmt.Println("処理中のユーザー:", userID)
}
```

### 型安全なContext値アクセス

```go
type contextKey string

const userContextKey contextKey = "user"

type User struct {
    ID   string
    Name string
}

// 型安全なセッター
func WithUser(ctx context.Context, user *User) context.Context {
    return context.WithValue(ctx, userContextKey, user)
}

// 型安全なゲッター
func GetUser(ctx context.Context) (*User, bool) {
    user, ok := ctx.Value(userContextKey).(*User)
    return user, ok
}

func main() {
    ctx := context.Background()

    user := &User{ID: "123", Name: "山田太郎"}
    ctx = WithUser(ctx, user)

    if u, ok := GetUser(ctx); ok {
        fmt.Printf("ユーザー: %s (%s)\n", u.Name, u.ID)
    }
}
```

## 実践例: Web APIサーバー

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "time"
)

type contextKey string

const requestIDKey contextKey = "requestID"

// ミドルウェア: リクエストIDを生成してContextに追加
func requestIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestID := fmt.Sprintf("%d", time.Now().UnixNano())
        ctx := context.WithValue(r.Context(), requestIDKey, requestID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// ミドルウェア: タイムアウト設定
func timeoutMiddleware(timeout time.Duration) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx, cancel := context.WithTimeout(r.Context(), timeout)
            defer cancel()
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    requestID := ctx.Value(requestIDKey).(string)

    log.Printf("[%s] リクエスト受信", requestID)

    // データベースクエリのシミュレーション
    data, err := fetchFromDB(ctx, requestID)
    if err != nil {
        if err == context.DeadlineExceeded {
            http.Error(w, "タイムアウト", http.StatusRequestTimeout)
            return
        }
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(map[string]string{
        "requestID": requestID,
        "data":      data,
    })
}

func fetchFromDB(ctx context.Context, requestID string) (string, error) {
    // 長時間かかるクエリをシミュレート
    for i := 0; i < 10; i++ {
        select {
        case <-ctx.Done():
            log.Printf("[%s] クエリ中断: %v", requestID, ctx.Err())
            return "", ctx.Err()
        case <-time.After(500 * time.Millisecond):
            log.Printf("[%s] クエリ中... %d/10", requestID, i+1)
        }
    }

    return "取得したデータ", nil
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/data", handler)

    // ミドルウェアを適用
    var h http.Handler = mux
    h = timeoutMiddleware(3 * time.Second)(h)
    h = requestIDMiddleware(h)

    log.Println("サーバー起動: http://localhost:8080")
    log.Fatal(http.ListenAndServe(":8080", h))
}
```

## ベストプラクティス

### 1. Contextは第一引数に

```go
// Good
func ProcessData(ctx context.Context, data string) error {
    // ...
}

// Bad
func ProcessData(data string, ctx context.Context) error {
    // ...
}
```

### 2. 必ずcancelを呼ぶ

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel() // リソースリーク防止
```

### 3. Contextは構造体に埋め込まない

```go
// Bad
type Request struct {
    ctx  context.Context // NG
    Data string
}

// Good
func (r *Request) Process(ctx context.Context) error {
    // ...
}
```

### 4. WithValueは制限的に使う

```go
// Good: リクエストスコープの値
ctx = context.WithValue(ctx, requestIDKey, "req-123")

// Bad: 関数の引数で渡すべき値
ctx = context.WithValue(ctx, "config", config) // NG
```

### 5. エラーチェック

```go
select {
case <-ctx.Done():
    if ctx.Err() == context.Canceled {
        log.Println("キャンセルされました")
    } else if ctx.Err() == context.DeadlineExceeded {
        log.Println("タイムアウトしました")
    }
    return ctx.Err()
}
```

## アンチパターン

### 1. nilContextを渡す

```go
// Bad
ProcessData(nil, "data") // パニックのリスク

// Good
ProcessData(context.Background(), "data")
```

### 2. Contextを無視する

```go
// Bad: ctxを受け取っているのに使っていない
func LongTask(ctx context.Context) {
    time.Sleep(10 * time.Second)
}

// Good: キャンセルに対応
func LongTask(ctx context.Context) {
    select {
    case <-time.After(10 * time.Second):
        // 処理完了
    case <-ctx.Done():
        return // キャンセル検知
    }
}
```

### 3. グローバルなContextを保持

```go
// Bad
var globalCtx context.Context

func init() {
    globalCtx = context.Background()
}

// Good: 必要な場所で生成
func main() {
    ctx := context.Background()
    Process(ctx)
}
```

## まとめ

Contextは、Go言語の並行処理における重要な設計パターンです。

**主な使い方:**
- `WithCancel`: 手動キャンセル
- `WithTimeout`: 相対時間でのタイムアウト
- `WithDeadline`: 絶対時刻での期限
- `WithValue`: リクエストスコープの値伝播

**ベストプラクティス:**
- 第一引数にする
- 必ずcancelを呼ぶ
- 構造体に埋め込まない
- WithValueは控えめに

Web APIやデータベースアクセス、マイクロサービス間通信など、あらゆる場面でContextを活用することで、堅牢で保守性の高いGoアプリケーションを構築できます。
