---
title: "Go + htmxでモダンフルスタックWeb開発"
description: "GoとhtmxでSPAのようなUXを持つフルスタックWebアプリケーションを構築。サーバーサイドレンダリングとHTMLオーバーザワイヤーによるシンプルで保守性の高い開発手法を解説"
pubDate: "2025-02-06"
---

# Go + htmxでモダンフルスタックWeb開発

近年、フロントエンド開発の複雑さが増す中、よりシンプルなアプローチとして **htmx** が注目されています。htmxと **Go** を組み合わせることで、React/VueのようなSPAのUXを、より少ないコードと複雑性で実現できます。

本記事では、GoとhtmxによるフルスタックWeb開発の実践的な手法を、サンプルコードを交えて詳しく解説します。

## htmxとは

htmxは、HTMLの属性を拡張することで、JavaScriptを書かずにインタラクティブなWebアプリケーションを構築できるライブラリです。

### 主な特徴

- **HTMLセントリック**: JavaScriptフレームワーク不要
- **AJAX簡略化**: HTML属性だけでAJAXリクエスト
- **部分更新**: SPAのような体験
- **サーバーサイド重視**: ロジックをサーバーに集約
- **小サイズ**: 約14KB（gzip圧縮後）

### なぜGoとの相性が良いのか

- **テンプレートエンジン**: Goの標準html/template
- **高速**: Goの処理速度でサーバーサイドレンダリング
- **シンプル**: 両方とも複雑性を避ける哲学
- **型安全**: Goの型システムでロジックを堅牢に
- **デプロイ容易**: 単一バイナリでデプロイ

## プロジェクトセットアップ

### ディレクトリ構造

```
myapp/
├── main.go
├── go.mod
├── handlers/
│   ├── home.go
│   ├── todos.go
│   └── users.go
├── models/
│   └── todo.go
├── templates/
│   ├── base.html
│   ├── index.html
│   ├── todos.html
│   └── partials/
│       ├── todo-item.html
│       └── todo-form.html
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── htmx.min.js
└── db/
    └── database.go
```

### 初期化

```bash
mkdir myapp && cd myapp
go mod init github.com/yourusername/myapp

# 依存関係のインストール
go get -u github.com/gorilla/mux
go get -u github.com/jmoiron/sqlx
go get -u github.com/mattn/go-sqlite3
```

### main.go

```go
package main

import (
    "log"
    "net/http"
    "html/template"

    "github.com/gorilla/mux"
    "github.com/yourusername/myapp/handlers"
)

var templates *template.Template

func main() {
    // テンプレートの読み込み
    templates = template.Must(template.ParseGlob("templates/**/*.html"))

    // ルーター設定
    r := mux.NewRouter()

    // 静的ファイル
    r.PathPrefix("/static/").Handler(http.StripPrefix("/static/",
        http.FileServer(http.Dir("static"))))

    // ルート定義
    r.HandleFunc("/", handlers.Home).Methods("GET")
    r.HandleFunc("/todos", handlers.GetTodos).Methods("GET")
    r.HandleFunc("/todos", handlers.CreateTodo).Methods("POST")
    r.HandleFunc("/todos/{id}", handlers.UpdateTodo).Methods("PUT")
    r.HandleFunc("/todos/{id}", handlers.DeleteTodo).Methods("DELETE")

    // サーバー起動
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", r))
}
```

## 基本的なHTMLテンプレート

### templates/base.html

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{block "title" .}}Go + htmx App{{end}}</title>
    <link rel="stylesheet" href="/static/css/style.css">
    <script src="/static/js/htmx.min.js"></script>
</head>
<body>
    <nav>
        <a href="/">ホーム</a>
        <a href="/todos">TODO</a>
    </nav>

    <main>
        {{block "content" .}}{{end}}
    </main>

    <script>
        // htmx設定
        htmx.config.defaultSwapStyle = 'innerHTML';
        htmx.config.historyCacheSize = 0;
    </script>
</body>
</html>
```

## TODOアプリの実装

### models/todo.go

```go
package models

import (
    "time"
)

type Todo struct {
    ID        int       `json:"id" db:"id"`
    Title     string    `json:"title" db:"title"`
    Completed bool      `json:"completed" db:"completed"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type TodoStore interface {
    GetAll() ([]Todo, error)
    GetByID(id int) (*Todo, error)
    Create(title string) (*Todo, error)
    Update(id int, completed bool) error
    Delete(id int) error
}
```

### db/database.go

```go
package db

import (
    "database/sql"
    "time"

    _ "github.com/mattn/go-sqlite3"
    "github.com/yourusername/myapp/models"
)

type TodoDB struct {
    db *sql.DB
}

func NewTodoDB(dbPath string) (*TodoDB, error) {
    db, err := sql.Open("sqlite3", dbPath)
    if err != nil {
        return nil, err
    }

    // テーブル作成
    _, err = db.Exec(`
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
    if err != nil {
        return nil, err
    }

    return &TodoDB{db: db}, nil
}

func (tdb *TodoDB) GetAll() ([]models.Todo, error) {
    rows, err := tdb.db.Query(
        "SELECT id, title, completed, created_at FROM todos ORDER BY created_at DESC",
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var todos []models.Todo
    for rows.Next() {
        var todo models.Todo
        err := rows.Scan(&todo.ID, &todo.Title, &todo.Completed, &todo.CreatedAt)
        if err != nil {
            return nil, err
        }
        todos = append(todos, todo)
    }

    return todos, nil
}

func (tdb *TodoDB) Create(title string) (*models.Todo, error) {
    result, err := tdb.db.Exec(
        "INSERT INTO todos (title) VALUES (?)",
        title,
    )
    if err != nil {
        return nil, err
    }

    id, err := result.LastInsertId()
    if err != nil {
        return nil, err
    }

    return &models.Todo{
        ID:        int(id),
        Title:     title,
        Completed: false,
        CreatedAt: time.Now(),
    }, nil
}

func (tdb *TodoDB) Update(id int, completed bool) error {
    _, err := tdb.db.Exec(
        "UPDATE todos SET completed = ? WHERE id = ?",
        completed, id,
    )
    return err
}

func (tdb *TodoDB) Delete(id int) error {
    _, err := tdb.db.Exec("DELETE FROM todos WHERE id = ?", id)
    return err
}
```

### handlers/todos.go

```go
package handlers

import (
    "html/template"
    "net/http"
    "strconv"

    "github.com/gorilla/mux"
    "github.com/yourusername/myapp/db"
    "github.com/yourusername/myapp/models"
)

var (
    todoDB    *db.TodoDB
    templates *template.Template
)

func init() {
    var err error
    todoDB, err = db.NewTodoDB("todos.db")
    if err != nil {
        panic(err)
    }

    templates = template.Must(template.ParseGlob("templates/**/*.html"))
}

func GetTodos(w http.ResponseWriter, r *http.Request) {
    todos, err := todoDB.GetAll()
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // htmxリクエストかどうかで返すテンプレートを変える
    if r.Header.Get("HX-Request") == "true" {
        // 部分更新
        templates.ExecuteTemplate(w, "todo-list.html", todos)
    } else {
        // 全体ページ
        templates.ExecuteTemplate(w, "todos.html", map[string]interface{}{
            "Todos": todos,
        })
    }
}

func CreateTodo(w http.ResponseWriter, r *http.Request) {
    title := r.FormValue("title")
    if title == "" {
        http.Error(w, "Title required", http.StatusBadRequest)
        return
    }

    todo, err := todoDB.Create(title)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // 新しいTODO項目のHTMLを返す
    templates.ExecuteTemplate(w, "todo-item.html", todo)
}

func UpdateTodo(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid ID", http.StatusBadRequest)
        return
    }

    completed := r.FormValue("completed") == "true"

    err = todoDB.Update(id, completed)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // 更新後のTODO項目を取得して返す
    todo, _ := todoDB.GetByID(id)
    templates.ExecuteTemplate(w, "todo-item.html", todo)
}

func DeleteTodo(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid ID", http.StatusBadRequest)
        return
    }

    err = todoDB.Delete(id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // 空のレスポンス（要素が削除される）
    w.WriteHeader(http.StatusOK)
}
```

### templates/todos.html

```html
{{define "title"}}TODO List{{end}}

{{define "content"}}
<div class="todos-container">
    <h1>TODO リスト</h1>

    <!-- 新規TODO作成フォーム -->
    <form
        hx-post="/todos"
        hx-target="#todo-list"
        hx-swap="afterbegin"
        hx-on::after-request="this.reset()"
    >
        <input
            type="text"
            name="title"
            placeholder="新しいTODOを入力"
            required
        >
        <button type="submit">追加</button>
    </form>

    <!-- TODOリスト -->
    <div id="todo-list">
        {{range .Todos}}
            {{template "todo-item.html" .}}
        {{end}}
    </div>
</div>
{{end}}
```

### templates/partials/todo-item.html

```html
{{define "todo-item.html"}}
<div
    class="todo-item {{if .Completed}}completed{{end}}"
    id="todo-{{.ID}}"
>
    <input
        type="checkbox"
        {{if .Completed}}checked{{end}}
        hx-put="/todos/{{.ID}}"
        hx-vals='{"completed": "{{not .Completed}}"}'
        hx-target="#todo-{{.ID}}"
        hx-swap="outerHTML"
    >
    <span class="todo-title">{{.Title}}</span>
    <button
        class="delete-btn"
        hx-delete="/todos/{{.ID}}"
        hx-target="#todo-{{.ID}}"
        hx-swap="outerHTML swap:1s"
        hx-confirm="本当に削除しますか？"
    >
        削除
    </button>
</div>
{{end}}
```

## htmxの高度な機能

### インライン編集

```html
<div class="todo-item" id="todo-{{.ID}}">
    <span
        class="todo-title"
        hx-get="/todos/{{.ID}}/edit"
        hx-trigger="click"
        hx-target="this"
        hx-swap="outerHTML"
    >
        {{.Title}}
    </span>
</div>
```

編集フォームテンプレート:

```html
<form
    hx-put="/todos/{{.ID}}"
    hx-target="#todo-{{.ID}}"
    hx-swap="outerHTML"
>
    <input
        type="text"
        name="title"
        value="{{.Title}}"
        autofocus
    >
    <button type="submit">保存</button>
    <button
        type="button"
        hx-get="/todos/{{.ID}}"
        hx-target="#todo-{{.ID}}"
    >
        キャンセル
    </button>
</form>
```

### 無限スクロール

```html
<div id="content">
    {{range .Items}}
        <div class="item">{{.}}</div>
    {{end}}

    {{if .HasMore}}
    <div
        hx-get="/items?page={{.NextPage}}"
        hx-trigger="revealed"
        hx-swap="afterend"
    >
        <span class="loading">読み込み中...</span>
    </div>
    {{end}}
</div>
```

```go
func GetItems(w http.ResponseWriter, r *http.Request) {
    page, _ := strconv.Atoi(r.URL.Query().Get("page"))
    if page == 0 {
        page = 1
    }

    items, hasMore := getItemsFromDB(page, 20)

    data := map[string]interface{}{
        "Items":    items,
        "HasMore":  hasMore,
        "NextPage": page + 1,
    }

    templates.ExecuteTemplate(w, "items-partial.html", data)
}
```

### リアルタイム検索

```html
<input
    type="search"
    name="q"
    placeholder="検索..."
    hx-get="/search"
    hx-trigger="keyup changed delay:300ms"
    hx-target="#search-results"
    hx-indicator="#spinner"
>

<div id="spinner" class="htmx-indicator">
    検索中...
</div>

<div id="search-results"></div>
```

```go
func Search(w http.ResponseWriter, r *http.Request) {
    query := r.URL.Query().Get("q")

    if query == "" {
        w.WriteHeader(http.StatusOK)
        return
    }

    results, err := searchInDB(query)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    templates.ExecuteTemplate(w, "search-results.html", results)
}
```

### 楽観的UI更新

```html
<button
    hx-post="/likes/{{.PostID}}"
    hx-target="#like-count-{{.PostID}}"
    hx-swap="innerHTML"
    hx-vals='{"optimistic": "true"}'
>
    いいね (<span id="like-count-{{.PostID}}">{{.Likes}}</span>)
</button>
```

```go
func LikePost(w http.ResponseWriter, r *http.Request) {
    postID := mux.Vars(r)["id"]

    // 楽観的更新の場合、即座に+1を返す
    if r.FormValue("optimistic") == "true" {
        currentLikes := getLikes(postID)
        fmt.Fprintf(w, "%d", currentLikes+1)

        // バックグラウンドで実際の更新
        go func() {
            incrementLikes(postID)
        }()
        return
    }

    // 通常の更新
    newLikes := incrementLikes(postID)
    fmt.Fprintf(w, "%d", newLikes)
}
```

## WebSocketとの統合

```html
<!-- htmx WebSocket拡張 -->
<script src="/static/js/htmx-ws.js"></script>

<div
    hx-ext="ws"
    ws-connect="/ws/chat"
>
    <div id="chat-messages"></div>

    <form ws-send>
        <input name="message" placeholder="メッセージを入力">
        <button type="submit">送信</button>
    </form>
</div>
```

```go
import (
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
}

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println(err)
        return
    }
    defer conn.Close()

    for {
        messageType, message, err := conn.ReadMessage()
        if err != nil {
            break
        }

        // メッセージ処理
        response := processMessage(message)

        // HTMLフラグメントを返す
        html := renderMessageHTML(response)
        conn.WriteMessage(messageType, []byte(html))
    }
}
```

## パフォーマンス最適化

### テンプレートのキャッシング

```go
type TemplateCache struct {
    templates map[string]*template.Template
    mu        sync.RWMutex
}

func (tc *TemplateCache) Get(name string) (*template.Template, error) {
    tc.mu.RLock()
    tmpl, exists := tc.templates[name]
    tc.mu.RUnlock()

    if exists {
        return tmpl, nil
    }

    // テンプレートをロードしてキャッシュ
    tc.mu.Lock()
    defer tc.mu.Unlock()

    tmpl, err := template.ParseFiles("templates/" + name)
    if err != nil {
        return nil, err
    }

    tc.templates[name] = tmpl
    return tmpl, nil
}
```

### gzip圧縮

```go
import (
    "compress/gzip"
    "net/http"
    "strings"
)

type gzipResponseWriter struct {
    http.ResponseWriter
    Writer *gzip.Writer
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
    return w.Writer.Write(b)
}

func GzipMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
            next.ServeHTTP(w, r)
            return
        }

        w.Header().Set("Content-Encoding", "gzip")
        gz := gzip.NewWriter(w)
        defer gz.Close()

        gzw := gzipResponseWriter{Writer: gz, ResponseWriter: w}
        next.ServeHTTP(gzw, r)
    })
}

// 使用
r.Use(GzipMiddleware)
```

### HTTPキャッシング

```go
func CacheMiddleware(duration time.Duration) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", int(duration.Seconds())))
            next.ServeHTTP(w, r)
        })
    }
}

// 静的ファイルに適用
r.PathPrefix("/static/").Handler(
    CacheMiddleware(24 * time.Hour)(
        http.StripPrefix("/static/", http.FileServer(http.Dir("static"))),
    ),
)
```

## テスト

```go
package handlers

import (
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
)

func TestCreateTodo(t *testing.T) {
    // テスト用DB
    todoDB, _ = db.NewTodoDB(":memory:")

    // リクエスト作成
    body := strings.NewReader("title=Test Todo")
    req, _ := http.NewRequest("POST", "/todos", body)
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
    req.Header.Set("HX-Request", "true")

    // レスポンスレコーダー
    rr := httptest.NewRecorder()

    // ハンドラー実行
    handler := http.HandlerFunc(CreateTodo)
    handler.ServeHTTP(rr, req)

    // アサーション
    if status := rr.Code; status != http.StatusOK {
        t.Errorf("handler returned wrong status code: got %v want %v",
            status, http.StatusOK)
    }

    // HTMLが返されることを確認
    if !strings.Contains(rr.Body.String(), "Test Todo") {
        t.Errorf("handler returned unexpected body: got %v",
            rr.Body.String())
    }
}
```

## まとめ

Goとhtmxの組み合わせは、モダンなWeb開発における強力な選択肢です。

### 主な利点

- **シンプルさ**: 複雑なJavaScriptフレームワーク不要
- **パフォーマンス**: サーバーサイドレンダリングの高速性
- **保守性**: ロジックがサーバーに集約
- **学習コスト**: GoとHTMLの知識で十分
- **SEO**: 標準的なHTMLで構築

### 向いているユースケース

- 管理画面・ダッシュボード
- CRUD中心のアプリケーション
- コンテンツ重視のサイト
- 小〜中規模のWebアプリ

React/Vueが不要な場面は意外と多いものです。Goとhtmxで、シンプルで保守性の高いWebアプリケーションを構築しましょう。
