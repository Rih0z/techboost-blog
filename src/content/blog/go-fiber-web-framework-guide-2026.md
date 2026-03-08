---
title: 'Go Fiber完全ガイド2026｜Express風の高速WebフレームワークでAPI開発'
description: 'Go言語のFiberフレームワークによるWeb API開発を解説。Express.jsライクなAPI設計、ミドルウェア、バリデーション、JWT認証、WebSocket、テスト、デプロイまで。'
pubDate: '2026-03-05'
tags: ['Go', 'Fiber', 'API', 'バックエンド', 'Web開発']
heroImage: '../../assets/thumbnails/go-fiber-web-framework-guide-2026.jpg'
---

## Fiberとは

**Fiber**は、Go言語で書かれた高速Webフレームワークです。Express.jsにインスパイアされたAPIを持ち、Node.js開発者にとって親しみやすい設計になっています。内部ではGo最速のHTTPエンジン**Fasthttp**を使用しています。

### フレームワーク比較

| 特徴 | Fiber | Gin | Echo | net/http |
|------|-------|-----|------|----------|
| パフォーマンス | ◎ | ○ | ○ | ○ |
| API設計 | Express風 | 独自 | 独自 | 標準 |
| ミドルウェア | ◎ | ○ | ○ | △ |
| バリデーション | 内蔵 | go-validator | go-validator | なし |
| WebSocket | ◎ | △ | ○ | △ |
| 学習コスト | 低 | 低 | 低 | 中 |
| Fasthttpベース | ◎ | × | × | × |

### ベンチマーク

```
Fiber (Fasthttp)  : ████████████████████████ 240,000 req/s
Gin              : ██████████████████       180,000 req/s
Echo             : █████████████████        170,000 req/s
net/http         : ████████████████         160,000 req/s
Express.js       : ██████                    60,000 req/s
```

---

## セットアップ

```bash
mkdir my-api && cd my-api
go mod init my-api
go get github.com/gofiber/fiber/v2
go get github.com/gofiber/fiber/v2/middleware/cors
go get github.com/gofiber/fiber/v2/middleware/logger
go get github.com/gofiber/fiber/v2/middleware/recover
```

### プロジェクト構成

```
my-api/
├── cmd/
│   └── server/
│       └── main.go         # エントリーポイント
├── internal/
│   ├── config/
│   │   └── config.go       # 設定
│   ├── handler/
│   │   ├── auth.go          # 認証ハンドラー
│   │   └── user.go          # ユーザーハンドラー
│   ├── middleware/
│   │   └── auth.go          # 認証ミドルウェア
│   ├── model/
│   │   └── user.go          # データモデル
│   ├── repository/
│   │   └── user_repo.go     # データアクセス層
│   └── service/
│       └── user_service.go  # ビジネスロジック
├── go.mod
├── go.sum
└── Dockerfile
```

---

## 基本的なAPI

### エントリーポイント

```go
// cmd/server/main.go
package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	app := fiber.New(fiber.Config{
		AppName:      "My API v1.0.0",
		ErrorHandler: customErrorHandler,
	})

	// ミドルウェア
	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:3000",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// ルーティング
	setupRoutes(app)

	log.Fatal(app.Listen(":8080"))
}

func setupRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	// ヘルスチェック
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "healthy"})
	})

	// ユーザーAPI
	users := api.Group("/users")
	users.Get("/", handler.ListUsers)
	users.Get("/:id", handler.GetUser)
	users.Post("/", handler.CreateUser)
	users.Put("/:id", handler.UpdateUser)
	users.Delete("/:id", handler.DeleteUser)

	// 認証API
	auth := api.Group("/auth")
	auth.Post("/login", handler.Login)
	auth.Post("/register", handler.Register)

	// 認証が必要なルート
	protected := api.Group("/", middleware.AuthRequired())
	protected.Get("/me", handler.GetMe)
}
```

### カスタムエラーハンドラー

```go
func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}

	return c.Status(code).JSON(fiber.Map{
		"error":   true,
		"message": err.Error(),
	})
}
```

---

## ハンドラーの実装

### ユーザーCRUD

```go
// internal/handler/user.go
package handler

import (
	"my-api/internal/model"
	"my-api/internal/service"

	"github.com/gofiber/fiber/v2"
)

type UserHandler struct {
	service *service.UserService
}

func NewUserHandler(s *service.UserService) *UserHandler {
	return &UserHandler{service: s}
}

// 一覧取得
func (h *UserHandler) ListUsers(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)
	search := c.Query("search")

	result, err := h.service.ListUsers(page, perPage, search)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "ユーザー一覧の取得に失敗しました")
	}

	return c.JSON(result)
}

// 詳細取得
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "無効なIDです")
	}

	user, err := h.service.GetUser(id)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "ユーザーが見つかりません")
	}

	return c.JSON(user)
}

// 作成
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	var input model.CreateUserInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "リクエストボディが不正です")
	}

	// バリデーション
	if errors := input.Validate(); len(errors) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"errors": errors,
		})
	}

	user, err := h.service.CreateUser(&input)
	if err != nil {
		return fiber.NewError(fiber.StatusConflict, err.Error())
	}

	return c.Status(fiber.StatusCreated).JSON(user)
}

// 更新
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "無効なIDです")
	}

	var input model.UpdateUserInput
	if err := c.BodyParser(&input); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "リクエストボディが不正です")
	}

	user, err := h.service.UpdateUser(id, &input)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "ユーザーが見つかりません")
	}

	return c.JSON(user)
}

// 削除
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "無効なIDです")
	}

	if err := h.service.DeleteUser(id); err != nil {
		return fiber.NewError(fiber.StatusNotFound, "ユーザーが見つかりません")
	}

	return c.SendStatus(fiber.StatusNoContent)
}
```

---

## バリデーション

```go
// internal/model/user.go
package model

import (
	"regexp"
	"time"
)

type User struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Age       *int      `json:"age,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateUserInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Age      *int   `json:"age,omitempty"`
}

func (i *CreateUserInput) Validate() []string {
	var errors []string

	if len(i.Name) < 2 || len(i.Name) > 50 {
		errors = append(errors, "名前は2〜50文字で入力してください")
	}

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(i.Email) {
		errors = append(errors, "有効なメールアドレスを入力してください")
	}

	if len(i.Password) < 8 {
		errors = append(errors, "パスワードは8文字以上で入力してください")
	}

	if i.Age != nil && (*i.Age < 0 || *i.Age > 150) {
		errors = append(errors, "年齢は0〜150の範囲で入力してください")
	}

	return errors
}

type UpdateUserInput struct {
	Name *string `json:"name,omitempty"`
	Age  *int    `json:"age,omitempty"`
}
```

---

## ミドルウェア

### JWT認証ミドルウェア

```go
// internal/middleware/auth.go
package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("your-secret-key") // 環境変数から取得すべき

type Claims struct {
	UserID int `json:"user_id"`
	jwt.RegisteredClaims
}

func GenerateToken(userID int) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "認証トークンが必要です")
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			return fiber.NewError(fiber.StatusUnauthorized, "無効なトークンです")
		}

		// ユーザーIDをコンテキストに保存
		c.Locals("userID", claims.UserID)
		return c.Next()
	}
}
```

### レート制限

```go
import "github.com/gofiber/fiber/v2/middleware/limiter"

app.Use(limiter.New(limiter.Config{
	Max:               100,
	Expiration:        1 * time.Minute,
	LimiterMiddleware: limiter.SlidingWindow{},
	KeyGenerator: func(c *fiber.Ctx) string {
		return c.IP()
	},
	LimitReached: func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":   true,
			"message": "リクエスト制限を超えました。しばらく待ってからお試しください。",
		})
	},
}))
```

---

## WebSocket

```go
import "github.com/gofiber/websocket/v2"

// WebSocketアップグレードチェック
app.Use("/ws", func(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		return c.Next()
	}
	return fiber.ErrUpgradeRequired
})

// チャットルーム
type Client struct {
	Conn *websocket.Conn
	Name string
}

var clients = make(map[*websocket.Conn]*Client)

app.Get("/ws/chat", websocket.New(func(c *websocket.Conn) {
	client := &Client{Conn: c, Name: c.Query("name", "匿名")}
	clients[c] = client
	defer func() {
		delete(clients, c)
		c.Close()
	}()

	for {
		messageType, msg, err := c.ReadMessage()
		if err != nil {
			break
		}

		// 全クライアントにブロードキャスト
		broadcast := fmt.Sprintf("%s: %s", client.Name, string(msg))
		for _, cl := range clients {
			cl.Conn.WriteMessage(messageType, []byte(broadcast))
		}
	}
}))
```

---

## テスト

```go
// internal/handler/user_test.go
package handler_test

import (
	"encoding/json"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func setupTestApp() *fiber.App {
	app := fiber.New()
	// テスト用のルート設定
	setupRoutes(app)
	return app
}

func TestCreateUser(t *testing.T) {
	app := setupTestApp()

	body := `{"name":"田中太郎","email":"tanaka@example.com","password":"password123"}`
	req := httptest.NewRequest("POST", "/api/v1/users", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	assert.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	var result map[string]interface{}
	respBody, _ := io.ReadAll(resp.Body)
	json.Unmarshal(respBody, &result)

	assert.Equal(t, "田中太郎", result["name"])
	assert.Equal(t, "tanaka@example.com", result["email"])
}

func TestGetUserNotFound(t *testing.T) {
	app := setupTestApp()

	req := httptest.NewRequest("GET", "/api/v1/users/999", nil)
	resp, err := app.Test(req)

	assert.NoError(t, err)
	assert.Equal(t, 404, resp.StatusCode)
}

func TestListUsersWithPagination(t *testing.T) {
	app := setupTestApp()

	req := httptest.NewRequest("GET", "/api/v1/users?page=1&per_page=10", nil)
	resp, err := app.Test(req)

	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
}
```

---

## デプロイ

### Dockerfile

```dockerfile
# マルチステージビルド
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# 実行用イメージ
FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .

EXPOSE 8080
CMD ["./server"]
```

### 本番設定

```go
app := fiber.New(fiber.Config{
	Prefork:       true,              // マルチプロセス
	ServerHeader:  "Fiber",
	StrictRouting: true,
	CaseSensitive: true,
	ReadTimeout:   10 * time.Second,
	WriteTimeout:  10 * time.Second,
	IdleTimeout:   120 * time.Second,
	BodyLimit:     4 * 1024 * 1024,   // 4MB
})
```

---

## まとめ

| 判断基準 | Fiber | Gin | Echo |
|---------|-------|-----|------|
| Express経験者 | ◎ | △ | △ |
| 生のパフォーマンス | ◎ | ○ | ○ |
| エコシステム | ○ | ◎ | ○ |
| WebSocket | ◎ | △ | ○ |
| ドキュメント | ○ | ◎ | ○ |

FiberはExpress.jsの経験をGoに活かせるフレームワークです。Fasthttpベースの圧倒的なパフォーマンスと、直感的なAPI設計の両方を求めるなら、Fiberは最適な選択です。
