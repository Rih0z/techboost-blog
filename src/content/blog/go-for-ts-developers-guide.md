---
title: 'TypeScript開発者のためのGo入門 - 型システム・goroutine・エラーハンドリング'
description: 'TypeScript開発者向けにGo言語の型システム、goroutine、エラーハンドリング、Webサーバー構築をTS/Goの比較コード付きで解説。両言語の違いを理解してGoを習得できます。'
pubDate: '2026-02-05'
tags: ['Go', 'TypeScript', 'Backend', 'プログラミング']
heroImage: '../../assets/thumbnails/go-for-ts-developers-guide.jpg'
---

TypeScript開発者がGo言語を学ぶための実践ガイドです。両言語の違いを理解し、Goの強力な機能を活用しましょう。

## なぜGoを学ぶのか

### Goの強み

1. **高速なコンパイル・実行**: 静的型付け言語でありながら高速
2. **並行処理**: goroutineによる軽量な並行処理
3. **シンプルな構文**: 学習曲線が緩やか
4. **強力な標準ライブラリ**: Web開発に必要な機能が揃っている
5. **単一バイナリ**: デプロイが簡単

### TypeScriptとの違い

| 特徴 | TypeScript | Go |
|------|-----------|-----|
| 実行環境 | Node.js/ブラウザ | ネイティブバイナリ |
| 型システム | 構造的型付け | 構造的型付け（インターフェース） |
| null処理 | undefined/null | nil + エラー値 |
| 非同期処理 | Promise/async-await | goroutine/channel |
| オブジェクト指向 | クラスベース | 構造体+メソッド |
| パッケージ管理 | npm | Go modules |

## 環境セットアップ

### Goのインストール

```bash
# macOS
brew install go

# バージョン確認
go version

# 環境変数の設定
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
```

### プロジェクトの初期化

```bash
# 新規プロジェクト
mkdir myapp
cd myapp
go mod init github.com/username/myapp

# 依存関係の追加
go get github.com/gin-gonic/gin
```

## 基本的な型システム

### プリミティブ型

```go
// TypeScript
let name: string = "Alice"
let age: number = 30
let isActive: boolean = true
let data: any = "anything"

// Go
var name string = "Alice"
var age int = 30
var isActive bool = true
var data interface{} = "anything"

// Goの型推論（短縮構文）
name := "Alice"
age := 30
isActive := true
```

### 配列とスライス

```typescript
// TypeScript
const numbers: number[] = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const filtered = numbers.filter(n => n > 2);
```

```go
// Go - 配列（固定長）
var numbers [5]int = [5]int{1, 2, 3, 4, 5}

// Go - スライス（可変長）
numbers := []int{1, 2, 3, 4, 5}

// 要素の追加
numbers = append(numbers, 6)

// マップ操作
doubled := make([]int, 0, len(numbers))
for _, n := range numbers {
    doubled = append(doubled, n*2)
}

// フィルター
filtered := make([]int, 0)
for _, n := range numbers {
    if n > 2 {
        filtered = append(filtered, n)
    }
}
```

### オブジェクトと構造体

```typescript
// TypeScript
interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUser(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
}
```

```go
// Go
package main

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

type UserService struct {
    users []User
}

// コンストラクタ的な関数
func NewUserService() *UserService {
    return &UserService{
        users: make([]User, 0),
    }
}

// メソッド（レシーバー）
func (s *UserService) AddUser(user User) {
    s.users = append(s.users, user)
}

func (s *UserService) GetUser(id int) *User {
    for i := range s.users {
        if s.users[i].ID == id {
            return &s.users[i]
        }
    }
    return nil
}
```

### インターフェース

```typescript
// TypeScript
interface Logger {
  log(message: string): void;
  error(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }

  error(message: string): void {
    console.error(message);
  }
}
```

```go
// Go
package main

// インターフェース定義
type Logger interface {
    Log(message string)
    Error(message string)
}

// 実装（明示的なimplementsは不要）
type ConsoleLogger struct{}

func (l *ConsoleLogger) Log(message string) {
    fmt.Println(message)
}

func (l *ConsoleLogger) Error(message string) {
    fmt.Fprintf(os.Stderr, "ERROR: %s\n", message)
}

// インターフェースを受け取る関数
func LogMessage(logger Logger, msg string) {
    logger.Log(msg)
}

func main() {
    logger := &ConsoleLogger{}
    LogMessage(logger, "Hello, Go!")
}
```

## エラーハンドリング

### TypeScriptのtry-catch vs Goのエラー値

```typescript
// TypeScript
async function fetchUser(id: number): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
```

```go
// Go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

func fetchUser(id int) (*User, error) {
    url := fmt.Sprintf("/api/users/%d", id)
    resp, err := http.Get(url)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch user: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("HTTP error: %d", resp.StatusCode)
    }

    var user User
    if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
        return nil, fmt.Errorf("failed to decode response: %w", err)
    }

    return &user, nil
}

// 使用例
func main() {
    user, err := fetchUser(1)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    fmt.Printf("User: %+v\n", user)
}
```

### カスタムエラー型

```go
// Go
package main

import (
    "errors"
    "fmt"
)

// カスタムエラー型
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error on field '%s': %s", e.Field, e.Message)
}

// エラーの作成
func validateUser(user *User) error {
    if user.Name == "" {
        return &ValidationError{
            Field:   "name",
            Message: "name is required",
        }
    }
    if user.Email == "" {
        return &ValidationError{
            Field:   "email",
            Message: "email is required",
        }
    }
    return nil
}

// エラーの型チェック
func handleUser(user *User) {
    if err := validateUser(user); err != nil {
        var validationErr *ValidationError
        if errors.As(err, &validationErr) {
            fmt.Printf("Validation failed on field: %s\n", validationErr.Field)
        } else {
            fmt.Printf("Unknown error: %v\n", err)
        }
        return
    }
    fmt.Println("User is valid")
}
```

### panicとrecover（例外処理に相当）

```go
// Go - 通常は避けるべきだが、致命的なエラー時に使用
package main

import "fmt"

func riskyOperation() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Printf("Recovered from panic: %v\n", r)
        }
    }()

    // 何か危険な処理
    panic("something went wrong!")
}

func main() {
    riskyOperation()
    fmt.Println("Program continues...")
}
```

## Goroutineと並行処理

### TypeScriptのPromise vs Goのgoroutine

```typescript
// TypeScript
async function fetchMultipleUsers(ids: number[]): Promise<User[]> {
  const promises = ids.map(id => fetchUser(id));
  return await Promise.all(promises);
}

// 使用例
const users = await fetchMultipleUsers([1, 2, 3, 4, 5]);
```

```go
// Go
package main

import (
    "fmt"
    "sync"
)

func fetchMultipleUsers(ids []int) ([]*User, error) {
    var wg sync.WaitGroup
    users := make([]*User, len(ids))
    errors := make([]error, len(ids))

    for i, id := range ids {
        wg.Add(1)
        go func(index, userId int) {
            defer wg.Done()
            user, err := fetchUser(userId)
            if err != nil {
                errors[index] = err
                return
            }
            users[index] = user
        }(i, id)
    }

    wg.Wait()

    // エラーチェック
    for _, err := range errors {
        if err != nil {
            return nil, err
        }
    }

    return users, nil
}
```

### Channel（データの受け渡し）

```go
// Go
package main

import (
    "fmt"
    "time"
)

// ワーカーパターン
func worker(id int, jobs <-chan int, results chan<- int) {
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job)
        time.Sleep(time.Second)
        results <- job * 2
    }
}

func main() {
    const numJobs = 5
    jobs := make(chan int, numJobs)
    results := make(chan int, numJobs)

    // 3つのワーカーを起動
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }

    // ジョブを送信
    for j := 1; j <= numJobs; j++ {
        jobs <- j
    }
    close(jobs)

    // 結果を受信
    for a := 1; a <= numJobs; a++ {
        result := <-results
        fmt.Printf("Result: %d\n", result)
    }
}
```

### Select文（複数チャネルの待機）

```go
// Go
package main

import (
    "fmt"
    "time"
)

func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)

    go func() {
        time.Sleep(1 * time.Second)
        ch1 <- "from channel 1"
    }()

    go func() {
        time.Sleep(2 * time.Second)
        ch2 <- "from channel 2"
    }()

    // 複数のチャネルを待機
    for i := 0; i < 2; i++ {
        select {
        case msg1 := <-ch1:
            fmt.Println(msg1)
        case msg2 := <-ch2:
            fmt.Println(msg2)
        case <-time.After(3 * time.Second):
            fmt.Println("timeout")
        }
    }
}
```

### Context（キャンセルとタイムアウト）

```go
// Go
package main

import (
    "context"
    "fmt"
    "time"
)

func longRunningTask(ctx context.Context) error {
    for i := 0; i < 10; i++ {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            fmt.Printf("Working... %d\n", i)
            time.Sleep(500 * time.Millisecond)
        }
    }
    return nil
}

func main() {
    // 3秒のタイムアウト
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()

    if err := longRunningTask(ctx); err != nil {
        fmt.Printf("Task cancelled: %v\n", err)
    } else {
        fmt.Println("Task completed")
    }
}
```

## Webサーバー構築

### Express vs net/http

```typescript
// TypeScript (Express)
import express from 'express';

const app = express();

app.use(express.json());

app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  // ユーザー取得処理
  res.json({ id, name: 'Alice' });
});

app.post('/users', (req, res) => {
  const user = req.body;
  // ユーザー作成処理
  res.status(201).json(user);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

```go
// Go (net/http)
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strconv"
    "strings"
)

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

func getUserHandler(w http.ResponseWriter, r *http.Request) {
    // パスからIDを取得
    idStr := strings.TrimPrefix(r.URL.Path, "/users/")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        http.Error(w, "Invalid ID", http.StatusBadRequest)
        return
    }

    user := User{ID: id, Name: "Alice"}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
    var user User
    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(user)
}

func main() {
    http.HandleFunc("/users/", getUserHandler)
    http.HandleFunc("/users", createUserHandler)

    fmt.Println("Server running on port 3000")
    log.Fatal(http.ListenAndServe(":3000", nil))
}
```

### Gin フレームワーク（より Express ライク）

```go
// Go (Gin)
package main

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

func main() {
    r := gin.Default()

    // ミドルウェア
    r.Use(gin.Logger())
    r.Use(gin.Recovery())

    // ルート定義
    r.GET("/users/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(http.StatusOK, gin.H{
            "id":   id,
            "name": "Alice",
        })
    })

    r.POST("/users", func(c *gin.Context) {
        var user User
        if err := c.ShouldBindJSON(&user); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusCreated, user)
    })

    // グループ化
    api := r.Group("/api/v1")
    {
        api.GET("/users", listUsers)
        api.POST("/users", createUser)
        api.GET("/users/:id", getUser)
        api.PUT("/users/:id", updateUser)
        api.DELETE("/users/:id", deleteUser)
    }

    r.Run(":3000")
}

func listUsers(c *gin.Context) {
    users := []User{
        {ID: 1, Name: "Alice"},
        {ID: 2, Name: "Bob"},
    }
    c.JSON(http.StatusOK, users)
}

func createUser(c *gin.Context) {
    var user User
    if err := c.ShouldBindJSON(&user); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusCreated, user)
}

func getUser(c *gin.Context) {
    id := c.Param("id")
    user := User{ID: 1, Name: "Alice"}
    c.JSON(http.StatusOK, user)
}

func updateUser(c *gin.Context) {
    id := c.Param("id")
    var user User
    if err := c.ShouldBindJSON(&user); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, user)
}

func deleteUser(c *gin.Context) {
    id := c.Param("id")
    c.JSON(http.StatusOK, gin.H{"message": "user deleted"})
}
```

### ミドルウェアの実装

```go
// Go (Gin)
package main

import (
    "fmt"
    "time"
    "github.com/gin-gonic/gin"
)

// ロギングミドルウェア
func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path

        c.Next()

        latency := time.Since(start)
        status := c.Writer.Status()
        fmt.Printf("[%s] %s %d %v\n", c.Request.Method, path, status, latency)
    }
}

// 認証ミドルウェア
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(401, gin.H{"error": "unauthorized"})
            c.Abort()
            return
        }

        // トークン検証
        // ...

        c.Next()
    }
}

// CORS ミドルウェア
func CORSMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}

func main() {
    r := gin.New()

    // グローバルミドルウェア
    r.Use(Logger())
    r.Use(CORSMiddleware())

    // 保護されたルート
    protected := r.Group("/api")
    protected.Use(AuthMiddleware())
    {
        protected.GET("/profile", func(c *gin.Context) {
            c.JSON(200, gin.H{"message": "protected resource"})
        })
    }

    r.Run(":3000")
}
```

## データベース操作

### TypeScript (Prisma) vs Go (GORM)

```typescript
// TypeScript (Prisma)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getUser(id: number) {
  return await prisma.user.findUnique({
    where: { id },
    include: { posts: true }
  });
}

async function createUser(data: { name: string; email: string }) {
  return await prisma.user.create({
    data
  });
}
```

```go
// Go (GORM)
package main

import (
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name  string
    Email string `gorm:"uniqueIndex"`
    Posts []Post
}

type Post struct {
    gorm.Model
    Title  string
    Body   string
    UserID uint
}

func getUser(db *gorm.DB, id uint) (*User, error) {
    var user User
    result := db.Preload("Posts").First(&user, id)
    return &user, result.Error
}

func createUser(db *gorm.DB, name, email string) (*User, error) {
    user := &User{Name: name, Email: email}
    result := db.Create(user)
    return user, result.Error
}

func main() {
    dsn := "host=localhost user=postgres password=password dbname=mydb port=5432"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        panic("failed to connect database")
    }

    // マイグレーション
    db.AutoMigrate(&User{}, &Post{})

    // 使用例
    user, err := createUser(db, "Alice", "alice@example.com")
    if err != nil {
        panic(err)
    }
}
```

## テスト

### TypeScript (Jest) vs Go (testing)

```typescript
// TypeScript (Jest)
describe('User Service', () => {
  it('should create a user', async () => {
    const service = new UserService();
    const user = await service.createUser({
      name: 'Alice',
      email: 'alice@example.com'
    });
    expect(user.name).toBe('Alice');
  });
});
```

```go
// Go (testing)
package main

import (
    "testing"
)

func TestCreateUser(t *testing.T) {
    service := NewUserService()
    user := User{
        ID:    1,
        Name:  "Alice",
        Email: "alice@example.com",
    }

    service.AddUser(user)
    retrieved := service.GetUser(1)

    if retrieved == nil {
        t.Fatal("expected user to be found")
    }

    if retrieved.Name != "Alice" {
        t.Errorf("expected name to be Alice, got %s", retrieved.Name)
    }
}

// テーブル駆動テスト
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        isValid bool
    }{
        {"valid email", "test@example.com", true},
        {"invalid email", "invalid", false},
        {"empty email", "", false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            valid := validateEmail(tt.email)
            if valid != tt.isValid {
                t.Errorf("expected %v, got %v", tt.isValid, valid)
            }
        })
    }
}
```

## まとめ

Go言語はTypeScript開発者にとって学びやすい言語です。

### 重要な違い

1. **エラーハンドリング**: 例外ではなくエラー値を返す
2. **並行処理**: Promise/async-awaitではなくgoroutine/channel
3. **型システム**: インターフェースは暗黙的に実装される
4. **パッケージ管理**: npmではなくGo modules

### 学習のステップ

1. 基本的な構文と型システムを理解する
2. goroutineとchannelで並行処理を学ぶ
3. 標準ライブラリでWebサーバーを構築する
4. データベース操作とORMを習得する
5. 本番環境へのデプロイを経験する

Go言語のシンプルさと強力な並行処理機能を活用して、高性能なバックエンドサービスを構築しましょう。
