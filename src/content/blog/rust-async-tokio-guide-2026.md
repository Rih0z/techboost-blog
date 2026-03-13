---
title: "Rust非同期プログラミング完全ガイド2026：Tokioで高性能APIサーバーを作る"
description: "RustのTokioランタイムを使った非同期プログラミングをゼロから解説。async/await・Axumフレームワーク・SQLxでのDB接続・エラーハンドリングまで実践的に学ぶ。Tower Service層やgraceful shutdownの実装パターンも紹介します。"
pubDate: "2026-03-12"
tags: ['Rust', 'Tokio', '非同期', 'axum', 'バックエンド', 'プログラミング']
heroImage: '../../assets/thumbnails/rust-async-tokio-guide-2026.jpg'
---
## Rustの非同期プログラミング：なぜ難しいのか

```
JavaScript: イベントループが自動管理（Node.js組み込み）
Go        : goroutineが軽量スレッド（ランタイム込み）
Rust      : async/awaitは「糖衣構文」。実行にはランタイムが別途必要
```

Rustが非同期を複雑にする理由：
1. **所有権システムとasyncが組み合わさる**
2. **`Send + 'static`境界**が難解
3. **ランタイムの選択**が必要（Tokio, async-std等）

---

## セットアップ

```toml
# Cargo.toml
[dependencies]
tokio  = { version = "1", features = ["full"] }
axum   = "0.8"
sqlx   = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }
serde  = { version = "1", features = ["derive"] }
serde_json = "1"
anyhow = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
```

---

## Tokioの基礎

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // 並列実行：tokio::join!
    let (result1, result2) = tokio::join!(
        fetch_user(1),
        fetch_user(2),
    );

    // バックグラウンドスポーン
    let handle = tokio::spawn(async {
        sleep(Duration::from_secs(1)).await;
        42
    });

    let result = handle.await.unwrap();
    println!("Result: {}", result);
}

async fn fetch_user(id: u32) -> String {
    sleep(Duration::from_millis(100)).await;
    format!("User {}", id)
}
```

---

## Axumで本格的なAPIサーバーを作る

```rust
// src/main.rs
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    db: PgPool,
}

#[derive(Serialize, sqlx::FromRow)]
struct User {
    id: Uuid,
    name: String,
    email: String,
}

#[derive(Deserialize)]
struct CreateUserRequest {
    name: String,
    email: String,
}

#[derive(Debug)]
enum AppError {
    DatabaseError(sqlx::Error),
    NotFound,
}

impl axum::response::IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            AppError::DatabaseError(e) => {
                tracing::error!("DB error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
            AppError::NotFound => (StatusCode::NOT_FOUND, "Not found"),
        };
        (status, message).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        match e {
            sqlx::Error::RowNotFound => AppError::NotFound,
            e => AppError::DatabaseError(e),
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().with_env_filter("debug").init();

    let db = PgPool::connect(&std::env::var("DATABASE_URL")?).await?;
    sqlx::migrate!("./migrations").run(&db).await?;

    let state = AppState { db };

    let app = Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/:id", get(get_user))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    tracing::info!("Listening on :3000");
    axum::serve(listener, app).await?;

    Ok(())
}

async fn list_users(State(state): State<AppState>) -> Result<Json<Vec<User>>, AppError> {
    let users = sqlx::query_as::<_, User>("SELECT id, name, email FROM users ORDER BY created_at DESC")
        .fetch_all(&state.db)
        .await?;
    Ok(Json(users))
}

async fn create_user(
    State(state): State<AppState>,
    Json(body): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), AppError> {
    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (id, name, email) VALUES ($1, $2, $3) RETURNING id, name, email"
    )
    .bind(Uuid::new_v4())
    .bind(&body.name)
    .bind(&body.email)
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(user)))
}

async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<User>, AppError> {
    let user = sqlx::query_as::<_, User>("SELECT id, name, email FROM users WHERE id = $1")
        .bind(id)
        .fetch_one(&state.db)
        .await?;
    Ok(Json(user))
}
```

---

## 非同期の落とし穴：よくあるバグ

### MutexとDeadlock

```rust
// NG: async関数内でstd::sync::Mutexを保持したままawait
use std::sync::Mutex;
async fn bad(mutex: Arc<Mutex<i32>>) {
    let _guard = mutex.lock().unwrap();
    some_async_fn().await; // awaitをまたいでロックを保持 → デッドロック
}

// OK: tokio::sync::Mutexを使う
use tokio::sync::Mutex;
async fn good(mutex: Arc<Mutex<i32>>) {
    let _guard = mutex.lock().await;
    some_async_fn().await; // OK
}
```

### `Send`境界の問題

```rust
// NG: Rc<T>はSendではないのでspawnできない
tokio::spawn(async {
    let data = std::rc::Rc::new(42); // エラー
    some_fn(data).await;
});

// OK: Arc<T>を使う
tokio::spawn(async {
    let data = std::sync::Arc::new(42); // OK
    some_fn(data).await;
});
```

---

## パフォーマンス比較

```
Node.js (Express): ~50,000 req/s
Go (Gin)        : ~150,000 req/s
Rust (Axum)     : ~300,000 req/s

→ Rustは「ゼロコスト抽象化」で実行時オーバーヘッドがほぼゼロ
```

---

## 非同期処理のエラーハンドリング

Rustの非同期コードでは、適切なエラーハンドリングが特に重要です。`anyhow`と`thiserror`を組み合わせたパターンが実務で広く使われています。

### thiserrorでドメインエラーを定義

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ServiceError {
    #[error("ユーザーが見つかりません: {0}")]
    UserNotFound(String),

    #[error("メールアドレスが既に登録されています: {0}")]
    DuplicateEmail(String),

    #[error("データベースエラー")]
    Database(#[from] sqlx::Error),

    #[error("外部APIエラー: {0}")]
    ExternalApi(#[from] reqwest::Error),
}
```

`thiserror`を使うことで、`#[from]`属性による自動変換と`Display`トレイトの実装を簡潔に記述できます。`anyhow`はアプリケーションのトップレベルで使い、ライブラリ層では`thiserror`を使うのがベストプラクティスです。

---

## 構造化された並行処理

### tokio::select!で最初の完了を待つ

```rust
async fn fetch_with_fallback() -> anyhow::Result<String> {
    tokio::select! {
        result = fetch_from_primary_api() => { result }
        result = fetch_from_fallback_api() => { result }
        _ = sleep(Duration::from_secs(5)) => {
            Err(anyhow::anyhow!("全APIがタイムアウト"))
        }
    }
}
```

### JoinSetで動的なタスク管理

```rust
use tokio::task::JoinSet;

async fn process_batch(user_ids: Vec<u32>) -> Vec<anyhow::Result<User>> {
    let mut set = JoinSet::new();
    for id in user_ids {
        set.spawn(async move { fetch_user(id).await });
    }
    let mut results = Vec::new();
    while let Some(result) = set.join_next().await {
        results.push(result.unwrap());
    }
    results
}
```

`JoinSet`はタスク数が動的に変わる場合に、`tokio::join!`はタスク数が固定の場合に使います。

---

## 実務で使えるパターン集

### バックグラウンドワーカーとGraceful Shutdown

定期処理は`tokio::time::interval`でループし、`tokio::spawn`でバックグラウンド起動します。本番環境では`signal::ctrl_c()`を`tokio::select!`で監視し、`axum::serve`の`with_graceful_shutdown`と組み合わせることで、処理中のリクエストを完了してからサーバーを安全に停止できます。

---

## まとめ

Rustの非同期は最初は難しいですが、慣れると：

- **コンパイル時にデータ競合を完全防止**
- **Node.jsの6倍のスループット**
- **メモリ使用量がGoの1/3程度**

Axum + SQLx + Tokioの組み合わせは、2026年のRust Webバックエンドのデファクトスタンダードです。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
