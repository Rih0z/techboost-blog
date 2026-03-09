---
title: "sqlc入門：GoでType-SafeなSQLクエリを実現する方法"
description: "sqlcを使ってGoアプリケーションで型安全なSQL操作を実現する方法を解説。生SQLの柔軟性とORMの型安全性を両立させる実践ガイドです。PostgreSQL・MySQL対応のマイグレーション管理、複雑なJOINクエリの型生成まで網羅しています。"
pubDate: "2025-02-06"
tags: ["Go", "SQL", "sqlc", "Database", "Type Safety", "プログラミング"]
heroImage: '../../assets/thumbnails/sqlc-golang-typesafe-sql.jpg'
---

Goのデータベース操作では、ORMを使うかdatabase/sqlで生SQLを書くかの選択を迫られます。**sqlc**はその中間解として、SQLから型安全なGoコードを自動生成するツールです。本記事では、sqlcの基礎から実践的な活用法まで、包括的に解説します。

## sqlcとは

sqlcは、SQLクエリファイルからGoの構造体とインターフェースを生成するコードジェネレーターです。SQLを書くだけで、型安全なデータベース操作コードが自動生成されます。

### 主な特徴

- **型安全性**: コンパイル時にSQL操作の型チェック
- **生SQL**: ORMの抽象化なしに直接SQLを記述
- **パフォーマンス**: オーバーヘッドなしのネイティブSQL実行
- **IDE補完**: 生成されたコードは完全な型情報を持つ
- **マイグレーション連携**: スキーマ定義と整合性を保つ
- **複数DB対応**: PostgreSQL、MySQL、SQLiteをサポート

### ORMとの比較

| 特徴 | sqlc | GORM/ent | database/sql |
|------|------|----------|--------------|
| 型安全性 | ✅ | ✅ | ❌ |
| SQL制御 | ✅ | ⚠️ | ✅ |
| 学習コスト | 低 | 中〜高 | 低 |
| パフォーマンス | 高 | 中 | 高 |
| ボイラープレート | 少 | 少 | 多 |

## セットアップ

### インストール

```bash
# macOS
brew install sqlc

# Linux/Windows
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# バージョン確認
sqlc version
```

### プロジェクト構造

```
myapp/
├── sqlc.yaml              # sqlc設定ファイル
├── schema.sql             # データベーススキーマ
├── queries/
│   ├── users.sql         # ユーザー関連クエリ
│   └── posts.sql         # 投稿関連クエリ
└── db/                   # 生成されたコード
    ├── db.go
    ├── models.go
    ├── users.sql.go
    └── posts.sql.go
```

### sqlc.yaml設定

```yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "queries"
    schema: "schema.sql"
    gen:
      go:
        package: "db"
        out: "db"
        sql_package: "pgx/v5"
        emit_json_tags: true
        emit_prepared_queries: false
        emit_interface: true
        emit_exact_table_names: false
        emit_empty_slices: true
```

## スキーマ定義

### 基本的なテーブル定義

`schema.sql`:

```sql
CREATE TABLE users (
  id         BIGSERIAL PRIMARY KEY,
  username   VARCHAR(255) NOT NULL UNIQUE,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE posts (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(500) NOT NULL,
  content    TEXT NOT NULL,
  published  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published);

CREATE TABLE comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
```

## クエリの記述

### 基本的なCRUD操作

`queries/users.sql`:

```sql
-- name: CreateUser :one
INSERT INTO users (
  username, email, password
) VALUES (
  $1, $2, $3
)
RETURNING *;

-- name: GetUser :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: ListUsers :many
SELECT * FROM users
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: UpdateUser :one
UPDATE users
SET username = $2,
    email = $3,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;
```

### クエリアノテーション

- `:one` - 1行を返す（struct）
- `:many` - 複数行を返す（[]struct）
- `:exec` - 結果を返さない（sql.Result）
- `:execrows` - 影響を受けた行数を返す（int64）
- `:execresult` - sql.Resultを返す

## コード生成

```bash
# コード生成
sqlc generate

# 特定の設定ファイルを指定
sqlc generate -f sqlc.yaml

# 設定の検証
sqlc verify
```

生成されたコード例（`db/users.sql.go`）:

```go
package db

import (
    "context"
)

type CreateUserParams struct {
    Username string `json:"username"`
    Email    string `json:"email"`
    Password string `json:"password"`
}

func (q *Queries) CreateUser(ctx context.Context, arg CreateUserParams) (User, error) {
    row := q.db.QueryRowContext(ctx, createUser, arg.Username, arg.Email, arg.Password)
    var i User
    err := row.Scan(
        &i.ID,
        &i.Username,
        &i.Email,
        &i.Password,
        &i.CreatedAt,
        &i.UpdatedAt,
    )
    return i, err
}

func (q *Queries) GetUser(ctx context.Context, id int64) (User, error) {
    row := q.db.QueryRowContext(ctx, getUser, id)
    var i User
    err := row.Scan(
        &i.ID,
        &i.Username,
        &i.Email,
        &i.Password,
        &i.CreatedAt,
        &i.UpdatedAt,
    )
    return i, err
}

func (q *Queries) ListUsers(ctx context.Context, limit int32, offset int32) ([]User, error) {
    rows, err := q.db.QueryContext(ctx, listUsers, limit, offset)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var items []User
    for rows.Next() {
        var i User
        if err := rows.Scan(
            &i.ID,
            &i.Username,
            &i.Email,
            &i.Password,
            &i.CreatedAt,
            &i.UpdatedAt,
        ); err != nil {
            return nil, err
        }
        items = append(items, i)
    }
    return items, nil
}
```

## 実際の使用例

### データベース接続

`main.go`:

```go
package main

import (
    "context"
    "database/sql"
    "log"

    _ "github.com/lib/pq"
    "myapp/db"
)

func main() {
    ctx := context.Background()
    
    // データベース接続
    conn, err := sql.Open("postgres", "postgresql://user:pass@localhost/mydb?sslmode=disable")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()
    
    // sqlcクエリの初期化
    queries := db.New(conn)
    
    // ユーザー作成
    user, err := queries.CreateUser(ctx, db.CreateUserParams{
        Username: "alice",
        Email:    "alice@example.com",
        Password: "hashed_password",
    })
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Created user: %+v\n", user)
    
    // ユーザー取得
    fetchedUser, err := queries.GetUser(ctx, user.ID)
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Fetched user: %+v\n", fetchedUser)
    
    // ユーザー一覧
    users, err := queries.ListUsers(ctx, 10, 0)
    if err != nil {
        log.Fatal(err)
    }
    for _, u := range users {
        log.Printf("User: %s (%s)\n", u.Username, u.Email)
    }
}
```

### トランザクション

sqlcはトランザクションもサポートします：

`queries/transactions.sql`:

```sql
-- name: CreateUserWithProfile :one
INSERT INTO users (username, email, password)
VALUES ($1, $2, $3)
RETURNING *;

-- name: CreateProfile :one
INSERT INTO profiles (user_id, bio, avatar_url)
VALUES ($1, $2, $3)
RETURNING *;
```

`service/user_service.go`:

```go
package service

import (
    "context"
    "database/sql"
    "myapp/db"
)

type UserService struct {
    db      *sql.DB
    queries *db.Queries
}

func NewUserService(database *sql.DB) *UserService {
    return &UserService{
        db:      database,
        queries: db.New(database),
    }
}

func (s *UserService) CreateUserWithProfile(ctx context.Context, username, email, password, bio, avatarURL string) error {
    // トランザクション開始
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()
    
    // トランザクション内でクエリを実行
    qtx := s.queries.WithTx(tx)
    
    // ユーザー作成
    user, err := qtx.CreateUser(ctx, db.CreateUserParams{
        Username: username,
        Email:    email,
        Password: password,
    })
    if err != nil {
        return err
    }
    
    // プロフィール作成
    _, err = qtx.CreateProfile(ctx, db.CreateProfileParams{
        UserID:    user.ID,
        Bio:       bio,
        AvatarURL: avatarURL,
    })
    if err != nil {
        return err
    }
    
    // コミット
    return tx.Commit()
}
```

## 高度なクエリ

### JOIN操作

`queries/posts.sql`:

```sql
-- name: GetPostWithAuthor :one
SELECT 
  p.*,
  u.username AS author_username,
  u.email AS author_email
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.id = $1;

-- name: ListPostsWithAuthors :many
SELECT 
  p.id,
  p.title,
  p.content,
  p.published,
  p.created_at,
  u.id AS author_id,
  u.username AS author_username
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.published = true
ORDER BY p.created_at DESC
LIMIT $1 OFFSET $2;
```

生成される構造体:

```go
type GetPostWithAuthorRow struct {
    ID              int64     `json:"id"`
    UserID          int64     `json:"user_id"`
    Title           string    `json:"title"`
    Content         string    `json:"content"`
    Published       bool      `json:"published"`
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
    AuthorUsername  string    `json:"author_username"`
    AuthorEmail     string    `json:"author_email"`
}
```

### 動的クエリ（COALESCE）

```sql
-- name: SearchPosts :many
SELECT * FROM posts
WHERE 
  (COALESCE($1::text, '') = '' OR title ILIKE '%' || $1 || '%')
  AND (COALESCE($2::boolean, published) = published)
  AND (COALESCE($3::bigint, user_id) = user_id)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;
```

使用例:

```go
// タイトルのみで検索
posts, err := queries.SearchPosts(ctx, db.SearchPostsParams{
    Column1: sql.NullString{String: "golang", Valid: true},
    Column2: sql.NullBool{Valid: false},
    Column3: sql.NullInt64{Valid: false},
    Limit:   10,
    Offset:  0,
})
```

### サブクエリと集約

```sql
-- name: GetUserWithPostCount :one
SELECT 
  u.*,
  (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count
FROM users u
WHERE u.id = $1;

-- name: GetPopularPosts :many
SELECT 
  p.*,
  COUNT(c.id) AS comment_count
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.published = true
GROUP BY p.id
HAVING COUNT(c.id) > $1
ORDER BY comment_count DESC
LIMIT $2;
```

### NULL可能フィールドの扱い

```sql
-- name: UpdateUserProfile :one
UPDATE users
SET 
  bio = COALESCE($2, bio),
  avatar_url = COALESCE($3, avatar_url),
  updated_at = NOW()
WHERE id = $1
RETURNING *;
```

```go
// NULLを許容する更新
user, err := queries.UpdateUserProfile(ctx, db.UpdateUserProfileParams{
    ID:        1,
    Bio:       sql.NullString{String: "New bio", Valid: true},
    AvatarURL: sql.NullString{Valid: false}, // 更新しない
})
```

## pgx/v5との統合

より高性能なPostgreSQL専用ドライバpgxとの統合:

`sqlc.yaml`:

```yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "queries"
    schema: "schema.sql"
    gen:
      go:
        package: "db"
        out: "db"
        sql_package: "pgx/v5"
        emit_json_tags: true
```

使用例:

```go
package main

import (
    "context"
    "log"

    "github.com/jackc/pgx/v5/pgxpool"
    "myapp/db"
)

func main() {
    ctx := context.Background()
    
    // pgxプール作成
    pool, err := pgxpool.New(ctx, "postgresql://user:pass@localhost/mydb")
    if err != nil {
        log.Fatal(err)
    }
    defer pool.Close()
    
    queries := db.New(pool)
    
    // 通常通り使用
    user, err := queries.GetUser(ctx, 1)
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("User: %+v\n", user)
}
```

## バッチ操作

`queries/batch.sql`:

```sql
-- name: BatchCreateUsers :batchexec
INSERT INTO users (username, email, password)
VALUES ($1, $2, $3);

-- name: BatchUpdatePosts :batchexec
UPDATE posts
SET published = $2
WHERE id = $1;
```

使用例:

```go
func batchInsertUsers(ctx context.Context, queries *db.Queries) error {
    batch := &pgx.Batch{}
    
    users := []db.BatchCreateUsersParams{
        {Username: "alice", Email: "alice@example.com", Password: "pass1"},
        {Username: "bob", Email: "bob@example.com", Password: "pass2"},
        {Username: "charlie", Email: "charlie@example.com", Password: "pass3"},
    }
    
    for _, u := range users {
        queries.BatchCreateUsers(ctx, u).Queue(batch)
    }
    
    results := conn.SendBatch(ctx, batch)
    defer results.Close()
    
    for range users {
        _, err := results.Exec()
        if err != nil {
            return err
        }
    }
    
    return nil
}
```

## テスト

### モックの生成

`sqlc.yaml`に追加:

```yaml
gen:
  go:
    emit_interface: true
```

これにより`Querier`インターフェースが生成され、モックが容易になります:

```go
type Querier interface {
    CreateUser(ctx context.Context, arg CreateUserParams) (User, error)
    GetUser(ctx context.Context, id int64) (User, error)
    ListUsers(ctx context.Context, arg ListUsersParams) ([]User, error)
    // ...
}
```

### テストコード

```go
package service_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/mock"
    "myapp/db"
    "myapp/service"
)

type MockQuerier struct {
    mock.Mock
}

func (m *MockQuerier) GetUser(ctx context.Context, id int64) (db.User, error) {
    args := m.Called(ctx, id)
    return args.Get(0).(db.User), args.Error(1)
}

func TestUserService_GetUser(t *testing.T) {
    mockDB := new(MockQuerier)
    svc := service.NewUserService(mockDB)
    
    expectedUser := db.User{
        ID:       1,
        Username: "alice",
        Email:    "alice@example.com",
    }
    
    mockDB.On("GetUser", mock.Anything, int64(1)).Return(expectedUser, nil)
    
    user, err := svc.GetUserByID(context.Background(), 1)
    
    assert.NoError(t, err)
    assert.Equal(t, expectedUser, user)
    mockDB.AssertExpectations(t)
}
```

### 統合テスト

```go
package db_test

import (
    "context"
    "database/sql"
    "testing"

    _ "github.com/lib/pq"
    "myapp/db"
)

func setupTestDB(t *testing.T) (*sql.DB, *db.Queries) {
    conn, err := sql.Open("postgres", "postgresql://test:test@localhost/testdb?sslmode=disable")
    if err != nil {
        t.Fatal(err)
    }
    
    // スキーマを適用
    schema, _ := os.ReadFile("../schema.sql")
    _, err = conn.Exec(string(schema))
    if err != nil {
        t.Fatal(err)
    }
    
    queries := db.New(conn)
    return conn, queries
}

func TestCreateUser(t *testing.T) {
    conn, queries := setupTestDB(t)
    defer conn.Close()
    
    ctx := context.Background()
    
    user, err := queries.CreateUser(ctx, db.CreateUserParams{
        Username: "testuser",
        Email:    "test@example.com",
        Password: "hashed_password",
    })
    
    assert.NoError(t, err)
    assert.NotZero(t, user.ID)
    assert.Equal(t, "testuser", user.Username)
}
```

## マイグレーション統合

### golang-migrateとの連携

```bash
# マイグレーションツールのインストール
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# マイグレーションファイル作成
migrate create -ext sql -dir migrations -seq create_users_table
```

`migrations/000001_create_users_table.up.sql`:

```sql
CREATE TABLE users (
  id         BIGSERIAL PRIMARY KEY,
  username   VARCHAR(255) NOT NULL UNIQUE,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

`migrations/000001_create_users_table.down.sql`:

```sql
DROP TABLE IF EXISTS users;
```

マイグレーション実行:

```go
package main

import (
    "database/sql"
    "log"

    "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

func runMigrations(db *sql.DB) error {
    driver, err := postgres.WithInstance(db, &postgres.Config{})
    if err != nil {
        return err
    }
    
    m, err := migrate.NewWithDatabaseInstance(
        "file://migrations",
        "postgres",
        driver,
    )
    if err != nil {
        return err
    }
    
    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        return err
    }
    
    log.Println("Migrations applied successfully")
    return nil
}
```

## ベストプラクティス

### 1. クエリファイルの整理

```
queries/
├── users.sql      # ユーザー関連
├── posts.sql      # 投稿関連
├── comments.sql   # コメント関連
└── analytics.sql  # 分析系クエリ
```

### 2. 命名規則

```sql
-- CRUD操作
-- name: CreateUser :one
-- name: GetUser :one
-- name: ListUsers :many
-- name: UpdateUser :one
-- name: DeleteUser :exec

-- 複雑な操作
-- name: GetUserWithPosts :one
-- name: SearchPublishedPosts :many
```

### 3. パラメータの型指定

```sql
-- 型を明示的に指定
-- name: SearchUsers :many
SELECT * FROM users
WHERE username ILIKE '%' || $1::text || '%'
  AND created_at > $2::timestamp
LIMIT $3::integer;
```

### 4. エラーハンドリング

```go
user, err := queries.GetUser(ctx, userID)
if err != nil {
    if errors.Is(err, sql.ErrNoRows) {
        return nil, ErrUserNotFound
    }
    return nil, fmt.Errorf("failed to get user: %w", err)
}
```

## まとめ

sqlcは、GoでのSQL操作において以下の利点をもたらします：

1. **型安全性**: コンパイル時のSQL検証
2. **パフォーマンス**: オーバーヘッドのないネイティブSQL
3. **保守性**: SQLとGoコードの明確な分離
4. **生産性**: ボイラープレートの削減
5. **柔軟性**: 複雑なクエリも自由に記述可能

ORMの抽象化が不要で、SQLを直接コントロールしたいプロジェクトに最適です。マイグレーションツールと組み合わせることで、堅牢なデータベース層を構築できます。

## 参考リンク

- [sqlc公式ドキュメント](https://docs.sqlc.dev/)
- [sqlc GitHub](https://github.com/sqlc-dev/sqlc)
- [golang-migrate](https://github.com/golang-migrate/migrate)
- [pgx - PostgreSQL Driver](https://github.com/jackc/pgx)
