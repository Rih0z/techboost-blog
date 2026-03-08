---
title: "Rust Axum Webフレームワーク入門"
description: "RustのモダンなWebフレームワークAxumを使った高速で型安全なAPI開発の基礎から実践まで解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。初心者から実務レベルまで段階的に学べる内容です。"
pubDate: "2025-02-05"
tags: ['Rust', 'axum', 'web-framework', 'Backend', 'プログラミング']
heroImage: '../../assets/thumbnails/rust-axum-web-framework.jpg'
---
Axumは、tokioエコシステム上に構築されたRustのWebフレームワークです。型安全性、パフォーマンス、開発者体験を重視した設計で、モダンなWeb APIの構築に最適です。本記事では、Axumの基礎から実践的な使い方まで詳しく解説します。

## Axumとは

AxumはTokioチームが開発したWebアプリケーションフレームワークで、以下の特徴があります。

### 主な特徴

**1. Tokioベース**
- 高性能な非同期ランタイム
- スケーラブルな並行処理

**2. 型安全なエクストラクタ**
- コンパイル時のエラー検出
- ボイラープレートの削減

**3. Towerとの統合**
- ミドルウェアの豊富なエコシステム
- 柔軟な構成

**4. 最小限の依存関係**
- 必要な機能だけを選択
- 高速なコンパイル

## セットアップ

### プロジェクト作成

```bash
cargo new axum-api
cd axum-api
```

### 依存関係の追加

`Cargo.toml`:

```toml
[package]
name = "axum-api"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
```

### Hello World

`src/main.rs`:

```rust
use axum::{
    routing::get,
    Router,
};

#[tokio::main]
async fn main() {
    // ルーティング設定
    let app = Router::new()
        .route("/", get(|| async { "Hello, World!" }));

    // サーバー起動
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    println!("Server running on http://localhost:3000");

    axum::serve(listener, app).await.unwrap();
}
```

```bash
cargo run
# http://localhost:3000 にアクセス
```

## ルーティング

### 基本的なルート

```rust
use axum::{
    routing::{get, post, put, delete},
    Router,
};

async fn handler() -> &'static str {
    "Hello!"
}

let app = Router::new()
    .route("/", get(handler))
    .route("/users", get(list_users).post(create_user))
    .route("/users/:id", get(get_user).put(update_user).delete(delete_user));
```

### パスパラメータ

```rust
use axum::{
    extract::Path,
    response::IntoResponse,
};

// 単一パラメータ
async fn get_user(Path(id): Path<u32>) -> String {
    format!("User ID: {}", id)
}

// 複数パラメータ
async fn get_post(
    Path((user_id, post_id)): Path<(u32, u32)>
) -> String {
    format!("User: {}, Post: {}", user_id, post_id)
}

let app = Router::new()
    .route("/users/:id", get(get_user))
    .route("/users/:user_id/posts/:post_id", get(get_post));
```

### クエリパラメータ

```rust
use axum::extract::Query;
use serde::Deserialize;

#[derive(Deserialize)]
struct Pagination {
    page: Option<u32>,
    per_page: Option<u32>,
}

async fn list_users(Query(pagination): Query<Pagination>) -> String {
    let page = pagination.page.unwrap_or(1);
    let per_page = pagination.per_page.unwrap_or(10);

    format!("Page: {}, Per page: {}", page, per_page)
}

let app = Router::new()
    .route("/users", get(list_users));
// GET /users?page=2&per_page=20
```

## リクエスト処理

### JSON処理

```rust
use axum::{
    extract::Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct CreateUser {
    username: String,
    email: String,
}

#[derive(Serialize)]
struct User {
    id: u32,
    username: String,
    email: String,
}

async fn create_user(
    Json(payload): Json<CreateUser>
) -> (StatusCode, Json<User>) {
    let user = User {
        id: 1,
        username: payload.username,
        email: payload.email,
    };

    (StatusCode::CREATED, Json(user))
}
```

### フォームデータ

```rust
use axum::extract::Form;

#[derive(Deserialize)]
struct LoginForm {
    username: String,
    password: String,
}

async fn login(Form(form): Form<LoginForm>) -> String {
    format!("Logging in user: {}", form.username)
}

let app = Router::new()
    .route("/login", post(login));
```

### リクエストボディ

```rust
use axum::body::Bytes;

async fn handle_raw_body(body: Bytes) -> String {
    format!("Received {} bytes", body.len())
}
```

## レスポンス

### 様々なレスポンス型

```rust
use axum::{
    http::{StatusCode, header},
    response::{IntoResponse, Response, Html},
};

// テキストレスポンス
async fn text() -> &'static str {
    "Plain text"
}

// HTMLレスポンス
async fn html() -> Html<&'static str> {
    Html("<h1>Hello, HTML!</h1>")
}

// JSONレスポンス
async fn json() -> Json<User> {
    Json(User {
        id: 1,
        username: "alice".to_string(),
        email: "alice@example.com".to_string(),
    })
}

// カスタムステータスコード
async fn not_found() -> (StatusCode, &'static str) {
    (StatusCode::NOT_FOUND, "Not found")
}

// カスタムヘッダー
async fn with_header() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "text/plain")],
        "Hello with header"
    )
}
```

### カスタムレスポンス

```rust
use axum::{
    response::{IntoResponse, Response},
    http::StatusCode,
};
use serde::Serialize;

#[derive(Serialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

impl<T: Serialize> IntoResponse for ApiResponse<T> {
    fn into_response(self) -> Response {
        let status = if self.success {
            StatusCode::OK
        } else {
            StatusCode::BAD_REQUEST
        };

        (status, Json(self)).into_response()
    }
}

async fn handler() -> ApiResponse<User> {
    ApiResponse {
        success: true,
        data: Some(User {
            id: 1,
            username: "alice".to_string(),
            email: "alice@example.com".to_string(),
        }),
        error: None,
    }
}
```

## 状態管理

### アプリケーション状態

```rust
use axum::{
    extract::State,
    routing::get,
    Router,
};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
struct AppState {
    db: Arc<RwLock<Vec<User>>>,
}

async fn list_users(State(state): State<AppState>) -> Json<Vec<User>> {
    let users = state.db.read().await;
    Json(users.clone())
}

async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUser>,
) -> (StatusCode, Json<User>) {
    let user = User {
        id: 1,
        username: payload.username,
        email: payload.email,
    };

    state.db.write().await.push(user.clone());

    (StatusCode::CREATED, Json(user))
}

#[tokio::main]
async fn main() {
    let state = AppState {
        db: Arc::new(RwLock::new(vec![])),
    };

    let app = Router::new()
        .route("/users", get(list_users).post(create_user))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    axum::serve(listener, app).await.unwrap();
}
```

## ミドルウェア

### Tower HTTPミドルウェア

```rust
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
};

let app = Router::new()
    .route("/", get(handler))
    .layer(CorsLayer::permissive())
    .layer(TraceLayer::new_for_http());
```

### カスタムミドルウェア

```rust
use axum::{
    middleware::{self, Next},
    http::Request,
    response::Response,
};

async fn auth_middleware<B>(
    req: Request<B>,
    next: Next<B>,
) -> Result<Response, StatusCode> {
    let auth_header = req.headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok());

    match auth_header {
        Some(token) if token.starts_with("Bearer ") => {
            Ok(next.run(req).await)
        }
        _ => Err(StatusCode::UNAUTHORIZED)
    }
}

let app = Router::new()
    .route("/protected", get(protected_handler))
    .layer(middleware::from_fn(auth_middleware));
```

## エラーハンドリング

### カスタムエラー型

```rust
use axum::{
    response::{IntoResponse, Response},
    http::StatusCode,
};

enum ApiError {
    NotFound,
    BadRequest(String),
    InternalError,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::NotFound => (StatusCode::NOT_FOUND, "Not found"),
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.as_str()),
            ApiError::InternalError => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error"
            ),
        };

        (status, message).into_response()
    }
}

async fn handler() -> Result<Json<User>, ApiError> {
    // エラーケース
    Err(ApiError::NotFound)

    // 成功ケース
    // Ok(Json(user))
}
```

## データベース統合

### SQLxとの統合

```toml
[dependencies]
sqlx = { version = "0.7", features = ["runtime-tokio-native-tls", "postgres"] }
```

```rust
use sqlx::{PgPool, FromRow};

#[derive(FromRow, Serialize)]
struct User {
    id: i32,
    username: String,
    email: String,
}

#[derive(Clone)]
struct AppState {
    db: PgPool,
}

async fn list_users(
    State(state): State<AppState>
) -> Result<Json<Vec<User>>, ApiError> {
    let users = sqlx::query_as::<_, User>("SELECT * FROM users")
        .fetch_all(&state.db)
        .await
        .map_err(|_| ApiError::InternalError)?;

    Ok(Json(users))
}

async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUser>,
) -> Result<(StatusCode, Json<User>), ApiError> {
    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *"
    )
    .bind(&payload.username)
    .bind(&payload.email)
    .fetch_one(&state.db)
    .await
    .map_err(|_| ApiError::InternalError)?;

    Ok((StatusCode::CREATED, Json(user)))
}

#[tokio::main]
async fn main() {
    let db = PgPool::connect("postgres://user:pass@localhost/db")
        .await
        .unwrap();

    let state = AppState { db };

    let app = Router::new()
        .route("/users", get(list_users).post(create_user))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    axum::serve(listener, app).await.unwrap();
}
```

## テスト

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_hello() {
        let app = Router::new()
            .route("/", get(|| async { "Hello!" }));

        let response = app
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_create_user() {
        let state = AppState {
            db: Arc::new(RwLock::new(vec![])),
        };

        let app = Router::new()
            .route("/users", post(create_user))
            .with_state(state);

        let payload = serde_json::json!({
            "username": "alice",
            "email": "alice@example.com"
        });

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/users")
                    .header("content-type", "application/json")
                    .body(Body::from(payload.to_string()))
                    .unwrap()
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);
    }
}
```

## まとめ

Axumは、Rustの強力な型システムと非同期処理を活かした優れたWebフレームワークです。

### 主な利点

- **型安全性**: コンパイル時のエラー検出
- **高性能**: Tokioベースの非同期処理
- **柔軟性**: Towerミドルウェアとの統合
- **開発体験**: エクストラクタによる簡潔なコード

高性能で保守性の高いWeb APIを構築したい場合、Axumは優れた選択肢となるでしょう。
