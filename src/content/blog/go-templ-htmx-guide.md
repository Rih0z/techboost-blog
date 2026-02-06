---
title: 'Go + Templ + HTMXでモダンWeb開発: サーバーサイドレンダリングの新しいスタイル'
description: 'Go、Templ、HTMXを組み合わせたモダンなWeb開発手法を解説。型安全なテンプレート、動的UI、パフォーマンス最適化、実践的なアプリケーション構築まで完全ガイド'
pubDate: '2025-02-05'
tags: ['Go', 'Templ', 'HTMX', 'サーバーサイドレンダリング', 'Web開発', 'ハイパーメディア']
---

# Go + Templ + HTMXでモダンWeb開発: サーバーサイドレンダリングの新しいスタイル

Go + Templ + HTMXの組み合わせは、シンプルかつ強力なWeb開発スタックです。JavaScriptフレームワークに頼らず、サーバーサイドレンダリングで動的なUIを実現します。

## スタックの概要

### 各技術の役割

```
┌─────────────┐
│   Browser   │
│   (HTMX)    │ ← ユーザー操作を検知、サーバーにリクエスト
└──────┬──────┘
       │ HTTP
┌──────▼──────┐
│  Go Server  │ ← ルーティング、ビジネスロジック
│   (net/http) │
└──────┬──────┘
       │
┌──────▼──────┐
│    Templ    │ ← 型安全なHTMLテンプレート生成
└─────────────┘
```

**Go**: サーバーサイドロジック、高速なHTTPハンドリング
**Templ**: 型安全なHTMLテンプレートエンジン（Goコード生成）
**HTMX**: HTML属性でAJAX、WebSocket、SSEを実現

### なぜこのスタック？

従来のSPA（React, Vue等）との比較:

| 観点 | Go+Templ+HTMX | React/Vue SPA |
|------|---------------|---------------|
| 初期ロード | 高速 | 遅い（バンドルサイズ） |
| ハイドレーション | 不要 | 必要 |
| SEO | 優れている | SSR必要 |
| 複雑性 | 低い | 高い |
| 開発体験 | シンプル | 豊富なツール |

## 環境セットアップ

### 前提条件

```bash
# Go 1.21以上
go version

# Templインストール
go install github.com/a-h/templ/cmd/templ@latest

# プロジェクト作成
mkdir go-templ-htmx-app
cd go-templ-htmx-app
go mod init example.com/app
```

### 依存関係

```bash
# 必要なパッケージ
go get github.com/a-h/templ

# オプション（推奨）
go get github.com/go-chi/chi/v5        # ルーター
go get github.com/joho/godotenv         # 環境変数
go get github.com/mattn/go-sqlite3      # データベース
```

### プロジェクト構造

```
go-templ-htmx-app/
├── main.go
├── handlers/
│   ├── home.go
│   ├── todos.go
│   └── users.go
├── templates/
│   ├── layout.templ
│   ├── components/
│   │   ├── header.templ
│   │   ├── footer.templ
│   │   └── todo_item.templ
│   └── pages/
│       ├── home.templ
│       └── todos.templ
├── models/
│   └── todo.go
├── static/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── htmx.min.js
└── db/
    └── database.go
```

## Templテンプレートの基本

### 基本的な構文

```templ
// templates/layout.templ
package templates

templ Layout(title string) {
  <!DOCTYPE html>
  <html lang="ja">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>{ title }</title>
      <script src="https://unpkg.com/htmx.org@1.9.10"></script>
      <link rel="stylesheet" href="/static/css/styles.css"/>
    </head>
    <body>
      { children... }
    </body>
  </html>
}
```

### コンポーネント作成

```templ
// templates/components/header.templ
package components

templ Header(username string) {
  <header class="header">
    <nav>
      <a href="/">ホーム</a>
      <a href="/todos">TODO一覧</a>
    </nav>
    <div class="user-info">
      if username != "" {
        <span>ようこそ、{ username }さん</span>
        <a href="/logout">ログアウト</a>
      } else {
        <a href="/login">ログイン</a>
      }
    </div>
  </header>
}
```

### 条件分岐とループ

```templ
// templates/components/todo_list.templ
package components

import "example.com/app/models"

templ TodoList(todos []models.Todo) {
  <div id="todo-list">
    if len(todos) == 0 {
      <p class="empty-message">TODOがありません</p>
    } else {
      <ul class="todo-items">
        for _, todo := range todos {
          @TodoItem(todo)
        }
      </ul>
    }
  </div>
}

templ TodoItem(todo models.Todo) {
  <li
    class={ "todo-item", templ.KV("completed", todo.Completed) }
    id={ "todo-" + string(todo.ID) }
  >
    <input
      type="checkbox"
      checked?={ todo.Completed }
      hx-post={ "/todos/" + string(todo.ID) + "/toggle" }
      hx-target={ "#todo-" + string(todo.ID) }
      hx-swap="outerHTML"
    />
    <span class="todo-text">{ todo.Text }</span>
    <button
      class="delete-btn"
      hx-delete={ "/todos/" + string(todo.ID) }
      hx-target={ "#todo-" + string(todo.ID) }
      hx-swap="outerHTML swap:1s"
    >
      削除
    </button>
  </li>
}
```

### 型安全性の活用

```templ
// templates/pages/user_profile.templ
package pages

import "example.com/app/models"

type UserProfileProps struct {
  User    models.User
  Posts   []models.Post
  IsOwner bool
}

templ UserProfile(props UserProfileProps) {
  <div class="profile">
    <h1>{ props.User.Name }</h1>
    <p>{ props.User.Bio }</p>

    if props.IsOwner {
      <a href="/profile/edit" class="edit-btn">プロフィール編集</a>
    }

    <section class="posts">
      <h2>投稿一覧 ({ strconv.Itoa(len(props.Posts)) }件)</h2>
      for _, post := range props.Posts {
        @PostCard(post)
      }
    </section>
  </div>
}
```

## HTMXの実践的な使い方

### 基本的な属性

```html
<!-- GET リクエスト -->
<button hx-get="/api/data" hx-target="#result">
  データ取得
</button>

<!-- POST リクエスト -->
<form hx-post="/api/submit" hx-target="#response">
  <input name="message" type="text"/>
  <button type="submit">送信</button>
</form>

<!-- DELETE リクエスト -->
<button
  hx-delete="/api/items/123"
  hx-confirm="本当に削除しますか？"
  hx-target="#item-123"
  hx-swap="outerHTML"
>
  削除
</button>
```

### ターゲットとスワップ戦略

```templ
templ TodoForm() {
  <form
    hx-post="/todos"
    hx-target="#todo-list"
    hx-swap="beforeend"
    hx-on::after-request="this.reset()"
  >
    <input
      type="text"
      name="text"
      placeholder="新しいTODO"
      required
    />
    <button type="submit">追加</button>
  </form>
}

// Swap strategies:
// - innerHTML: 内容を置き換え（デフォルト）
// - outerHTML: 要素ごと置き換え
// - beforebegin: 要素の前に挿入
// - afterbegin: 子要素の最初に挿入
// - beforeend: 子要素の最後に挿入
// - afterend: 要素の後に挿入
// - delete: 要素を削除
// - none: スワップしない
```

### トリガーとイベント

```templ
templ SearchInput() {
  <input
    type="search"
    name="q"
    hx-get="/search"
    hx-trigger="keyup changed delay:500ms"
    hx-target="#search-results"
    placeholder="検索..."
  />
  <div id="search-results"></div>
}

// hx-trigger オプション:
// - click: クリック時（デフォルト）
// - change: 変更時
// - keyup: キー入力時
// - load: ページ読み込み時
// - revealed: 要素が表示されたとき
// - intersect: Intersection Observer
// - every 2s: 2秒ごと
```

### インジケーターとローディング状態

```templ
templ LoadingButton() {
  <button
    hx-post="/api/process"
    hx-indicator="#spinner"
  >
    処理実行
  </button>
  <div id="spinner" class="htmx-indicator">
    読み込み中...
  </div>
}

<style>
  .htmx-indicator {
    display: none;
  }

  .htmx-request .htmx-indicator,
  .htmx-request.htmx-indicator {
    display: inline-block;
  }
</style>
```

## Goサーバーの実装

### メインサーバー

```go
// main.go
package main

import (
  "log"
  "net/http"

  "github.com/go-chi/chi/v5"
  "github.com/go-chi/chi/v5/middleware"
  "example.com/app/handlers"
)

func main() {
  r := chi.NewRouter()

  // ミドルウェア
  r.Use(middleware.Logger)
  r.Use(middleware.Recoverer)
  r.Use(middleware.Compress(5))

  // 静的ファイル
  r.Handle("/static/*", http.StripPrefix("/static/",
    http.FileServer(http.Dir("static"))))

  // ルート
  r.Get("/", handlers.Home)
  r.Get("/todos", handlers.TodosPage)
  r.Post("/todos", handlers.CreateTodo)
  r.Post("/todos/{id}/toggle", handlers.ToggleTodo)
  r.Delete("/todos/{id}", handlers.DeleteTodo)

  log.Println("Server starting on :8080")
  http.ListenAndServe(":8080", r)
}
```

### ハンドラー実装

```go
// handlers/todos.go
package handlers

import (
  "net/http"
  "strconv"

  "github.com/go-chi/chi/v5"
  "example.com/app/models"
  "example.com/app/templates/components"
  "example.com/app/templates/pages"
)

func TodosPage(w http.ResponseWriter, r *http.Request) {
  todos, err := models.GetAllTodos()
  if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }

  component := pages.TodosPage(todos)
  component.Render(r.Context(), w)
}

func CreateTodo(w http.ResponseWriter, r *http.Request) {
  text := r.FormValue("text")

  todo, err := models.CreateTodo(text)
  if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }

  // HTMX用に新しいTODOアイテムのみ返す
  component := components.TodoItem(todo)
  component.Render(r.Context(), w)
}

func ToggleTodo(w http.ResponseWriter, r *http.Request) {
  idStr := chi.URLParam(r, "id")
  id, _ := strconv.Atoi(idStr)

  todo, err := models.ToggleTodo(id)
  if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }

  // 更新されたTODOアイテムを返す
  component := components.TodoItem(todo)
  component.Render(r.Context(), w)
}

func DeleteTodo(w http.ResponseWriter, r *http.Request) {
  idStr := chi.URLParam(r, "id")
  id, _ := strconv.Atoi(idStr)

  err := models.DeleteTodo(id)
  if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }

  // 空のレスポンス（hx-swap="outerHTML"で削除）
  w.WriteHeader(http.StatusOK)
}
```

### モデル層

```go
// models/todo.go
package models

import (
  "database/sql"
  "time"
)

type Todo struct {
  ID        int       `json:"id"`
  Text      string    `json:"text"`
  Completed bool      `json:"completed"`
  CreatedAt time.Time `json:"created_at"`
}

var db *sql.DB

func InitDB(database *sql.DB) {
  db = database
}

func GetAllTodos() ([]Todo, error) {
  rows, err := db.Query("SELECT id, text, completed, created_at FROM todos ORDER BY created_at DESC")
  if err != nil {
    return nil, err
  }
  defer rows.Close()

  var todos []Todo
  for rows.Next() {
    var t Todo
    if err := rows.Scan(&t.ID, &t.Text, &t.Completed, &t.CreatedAt); err != nil {
      return nil, err
    }
    todos = append(todos, t)
  }

  return todos, nil
}

func CreateTodo(text string) (Todo, error) {
  result, err := db.Exec(
    "INSERT INTO todos (text, completed, created_at) VALUES (?, ?, ?)",
    text, false, time.Now(),
  )
  if err != nil {
    return Todo{}, err
  }

  id, _ := result.LastInsertId()

  return Todo{
    ID:        int(id),
    Text:      text,
    Completed: false,
    CreatedAt: time.Now(),
  }, nil
}

func ToggleTodo(id int) (Todo, error) {
  _, err := db.Exec(
    "UPDATE todos SET completed = NOT completed WHERE id = ?",
    id,
  )
  if err != nil {
    return Todo{}, err
  }

  var todo Todo
  err = db.QueryRow(
    "SELECT id, text, completed, created_at FROM todos WHERE id = ?",
    id,
  ).Scan(&todo.ID, &todo.Text, &todo.Completed, &todo.CreatedAt)

  return todo, err
}

func DeleteTodo(id int) error {
  _, err := db.Exec("DELETE FROM todos WHERE id = ?", id)
  return err
}
```

## 高度なパターン

### インフィニットスクロール

```templ
// templates/components/post_list.templ
package components

import "example.com/app/models"

templ PostList(posts []models.Post, page int, hasMore bool) {
  <div id="post-list">
    for _, post := range posts {
      @PostCard(post)
    }

    if hasMore {
      <div
        hx-get={ "/posts?page=" + strconv.Itoa(page + 1) }
        hx-trigger="revealed"
        hx-swap="afterend"
      >
        <div class="loading-spinner">読み込み中...</div>
      </div>
    }
  </div>
}
```

### リアルタイム更新（Server-Sent Events）

```go
// handlers/notifications.go
func NotificationsSSE(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type", "text/event-stream")
  w.Header().Set("Cache-Control", "no-cache")
  w.Header().Set("Connection", "keep-alive")

  flusher, ok := w.(http.Flusher)
  if !ok {
    http.Error(w, "SSE not supported", http.StatusInternalServerError)
    return
  }

  ticker := time.NewTicker(5 * time.Second)
  defer ticker.Stop()

  for {
    select {
    case <-ticker.C:
      // 新しい通知を取得
      notifications := getNewNotifications()

      for _, notif := range notifications {
        component := components.Notification(notif)

        w.Write([]byte("data: "))
        component.Render(r.Context(), w)
        w.Write([]byte("\n\n"))
        flusher.Flush()
      }

    case <-r.Context().Done():
      return
    }
  }
}
```

```templ
templ NotificationContainer() {
  <div
    id="notifications"
    hx-ext="sse"
    sse-connect="/notifications/stream"
    sse-swap="message"
  >
    <!-- ここに通知が追加される -->
  </div>
}
```

### フォームバリデーション

```templ
// templates/components/user_form.templ
package components

type FormErrors struct {
  Email    string
  Password string
}

templ UserForm(errors FormErrors) {
  <form
    hx-post="/register"
    hx-target="this"
    hx-swap="outerHTML"
  >
    <div class="form-group">
      <label for="email">メールアドレス</label>
      <input
        id="email"
        name="email"
        type="email"
        class={ templ.KV("error", errors.Email != "") }
      />
      if errors.Email != "" {
        <span class="error-message">{ errors.Email }</span>
      }
    </div>

    <div class="form-group">
      <label for="password">パスワード</label>
      <input
        id="password"
        name="password"
        type="password"
        class={ templ.KV("error", errors.Password != "") }
      />
      if errors.Password != "" {
        <span class="error-message">{ errors.Password }</span>
      }
    </div>

    <button type="submit">登録</button>
  </form>
}
```

```go
func Register(w http.ResponseWriter, r *http.Request) {
  email := r.FormValue("email")
  password := r.FormValue("password")

  errors := components.FormErrors{}

  if !isValidEmail(email) {
    errors.Email = "有効なメールアドレスを入力してください"
  }

  if len(password) < 8 {
    errors.Password = "パスワードは8文字以上必要です"
  }

  if errors.Email != "" || errors.Password != "" {
    component := components.UserForm(errors)
    component.Render(r.Context(), w)
    return
  }

  // ユーザー作成処理...
  w.Header().Set("HX-Redirect", "/dashboard")
}
```

## まとめ

Go + Templ + HTMXスタックの利点:

1. **シンプルさ**: 少ない技術スタックで完結
2. **型安全性**: Templによるコンパイル時チェック
3. **パフォーマンス**: サーバーサイドレンダリングの高速性
4. **開発体験**: Goのツールチェーンとホットリロード
5. **保守性**: JavaScriptビルドプロセス不要

このスタックは、中小規模のWebアプリケーションに最適です。複雑なSPAを避けつつ、モダンなUXを実現できます。
