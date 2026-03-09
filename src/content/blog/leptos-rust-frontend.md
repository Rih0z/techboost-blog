---
title: "Leptos：RustでフルスタックWebアプリ開発"
description: "Rustの型安全性とパフォーマンスを活かしたフロントエンドフレームワークLeptosの実践ガイド。リアクティブシステム、SSR、WASM、フルスタック開発まで徹底解説します。"
pubDate: "2025-02-06"
tags: ['Rust', 'フロントエンド', 'プログラミング']
heroImage: '../../assets/thumbnails/leptos-rust-frontend.jpg'
---

Rustのエコシステムは、システムプログラミングからWebアプリケーション開発まで広がりを見せています。その中でも注目を集めているのが、Rustでフロントエンド開発を可能にする **Leptos** フレームワークです。

本記事では、Leptosの基本から実践的なフルスタックアプリケーション開発までを詳しく解説します。

## Leptosとは

Leptosは、Rustで書かれたリアクティブなWebフレームワークです。React、Vue、Svelteなどのモダンフロントエンドフレームワークの概念をRustで実現しつつ、以下の特徴を持っています。

### 主な特徴

- **細粒度リアクティビティ**: Solidjsライクな効率的なリアクティブシステム
- **型安全**: Rustの強力な型システムによる堅牢性
- **ゼロコストSSR**: サーバーサイドレンダリングとハイドレーションの最適化
- **フルスタック対応**: サーバー関数により、バックエンドとの統合が容易
- **小さいバンドルサイズ**: 効率的なコンパイル結果
- **WebAssembly**: ブラウザで直接Rustコードを実行

## セットアップ

### 前提条件

```bash
# Rustのインストール（まだの場合）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# trunkのインストール（開発サーバー）
cargo install trunk

# WebAssemblyターゲットの追加
rustup target add wasm32-unknown-unknown
```

### プロジェクト作成

```bash
# Leptosテンプレートから作成
cargo install cargo-generate
cargo generate --git https://github.com/leptos-rs/start

# または手動でCargo.tomlを作成
cargo new leptos-app
cd leptos-app
```

### Cargo.toml設定

```toml
[package]
name = "leptos-app"
version = "0.1.0"
edition = "2021"

[dependencies]
leptos = { version = "0.6", features = ["csr"] }
console_error_panic_hook = "0.1"
wasm-bindgen = "0.2"
```

## 基本的なコンポーネント

### Hello World

```rust
use leptos::*;

#[component]
fn App() -> impl IntoView {
    view! {
        <div>
            <h1>"Hello, Leptos!"</h1>
            <p>"Rustで作るWebアプリケーション"</p>
        </div>
    }
}

fn main() {
    console_error_panic_hook::set_once();
    mount_to_body(|| view! { <App/> })
}
```

Leptosのビュー構文は、JSXライクなマクロを使用します。`view!` マクロ内でHTMLライクな記法が可能です。

### リアクティブな状態管理

```rust
use leptos::*;

#[component]
fn Counter() -> impl IntoView {
    // リアクティブなシグナルを作成
    let (count, set_count) = create_signal(0);

    view! {
        <div class="counter">
            <h2>"カウンター"</h2>
            <p>"現在の値: " {count}</p>
            <div class="buttons">
                <button on:click=move |_| {
                    set_count.update(|n| *n += 1);
                }>
                    "増やす"
                </button>
                <button on:click=move |_| {
                    set_count.update(|n| *n -= 1);
                }>
                    "減らす"
                </button>
                <button on:click=move |_| {
                    set_count.set(0);
                }>
                    "リセット"
                </button>
            </div>
        </div>
    }
}
```

`create_signal` は、リアクティブな状態を作成します。戻り値は読み取り用と更新用の関数のタプルです。

### 派生シグナル（Computed Values）

```rust
use leptos::*;

#[component]
fn TodoCounter() -> impl IntoView {
    let (todos, set_todos) = create_signal(vec![
        ("買い物", false),
        ("洗濯", true),
        ("掃除", false),
    ]);

    // 派生シグナル：未完了タスク数を自動計算
    let remaining = move || {
        todos.with(|todos| {
            todos.iter().filter(|(_, done)| !done).count()
        })
    };

    let total = move || todos.with(|todos| todos.len());

    view! {
        <div class="todo-counter">
            <h3>"タスク進捗"</h3>
            <p>"残り: " {remaining} " / 全体: " {total}</p>
            <div class="progress-bar">
                <div
                    class="progress"
                    style:width=move || {
                        let done = total() - remaining();
                        format!("{}%", (done * 100) / total().max(1))
                    }
                />
            </div>
        </div>
    }
}
```

## エフェクトとリソース

### create_effect

```rust
use leptos::*;

#[component]
fn EffectExample() -> impl IntoView {
    let (name, set_name) = create_signal(String::from("匿名"));

    // nameが変更されるたびに実行される
    create_effect(move |_| {
        log!("名前が変更されました: {}", name.get());
    });

    view! {
        <div>
            <input
                type="text"
                on:input=move |ev| {
                    set_name.set(event_target_value(&ev));
                }
                prop:value=name
            />
            <p>"こんにちは、" {name} "さん！"</p>
        </div>
    }
}
```

### リソースとSuspense

非同期データの取得には `create_resource` を使用します。

```rust
use leptos::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
struct User {
    id: u32,
    name: String,
    email: String,
}

async fn fetch_user(id: u32) -> Result<User, String> {
    // 実際のAPIコール
    gloo_net::http::Request::get(&format!("/api/users/{}", id))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())
}

#[component]
fn UserProfile() -> impl IntoView {
    let (user_id, set_user_id) = create_signal(1u32);

    // user_idが変わるたびに再取得
    let user = create_resource(user_id, |id| async move {
        fetch_user(id).await
    });

    view! {
        <div class="user-profile">
            <h2>"ユーザープロフィール"</h2>

            <input
                type="number"
                on:input=move |ev| {
                    if let Ok(id) = event_target_value(&ev).parse::<u32>() {
                        set_user_id.set(id);
                    }
                }
                prop:value=user_id
            />

            <Suspense fallback=move || view! { <p>"読み込み中..."</p> }>
                {move || user.get().map(|result| match result {
                    Ok(user) => view! {
                        <div class="user-card">
                            <h3>{&user.name}</h3>
                            <p>"Email: " {&user.email}</p>
                        </div>
                    }.into_view(),
                    Err(e) => view! {
                        <p class="error">"エラー: " {e}</p>
                    }.into_view(),
                })}
            </Suspense>
        </div>
    }
}
```

## ルーティング

Leptosは `leptos_router` クレートで強力なルーティングを提供します。

### 基本的なルーティング

```toml
[dependencies]
leptos = { version = "0.6", features = ["csr"] }
leptos_router = { version = "0.6", features = ["csr"] }
```

```rust
use leptos::*;
use leptos_router::*;

#[component]
fn App() -> impl IntoView {
    view! {
        <Router>
            <nav>
                <A href="/">"ホーム"</A>
                <A href="/about">"About"</A>
                <A href="/users">"ユーザー"</A>
            </nav>

            <main>
                <Routes>
                    <Route path="/" view=Home/>
                    <Route path="/about" view=About/>
                    <Route path="/users" view=Users/>
                    <Route path="/users/:id" view=UserDetail/>
                </Routes>
            </main>
        </Router>
    }
}

#[component]
fn Home() -> impl IntoView {
    view! {
        <div>
            <h1>"ホーム"</h1>
            <p>"Leptosアプリケーションへようこそ"</p>
        </div>
    }
}

#[component]
fn UserDetail() -> impl IntoView {
    let params = use_params_map();
    let id = move || {
        params.with(|p| p.get("id").cloned().unwrap_or_default())
    };

    view! {
        <div>
            <h2>"ユーザー詳細"</h2>
            <p>"ユーザーID: " {id}</p>
        </div>
    }
}
```

## サーバーサイドレンダリング（SSR）

Leptosの真骨頂は、フルスタック開発のサポートです。

### サーバー関数

```rust
use leptos::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Post {
    id: u32,
    title: String,
    content: String,
}

// サーバーサイドでのみ実行される関数
#[server(GetPosts, "/api")]
pub async fn get_posts() -> Result<Vec<Post>, ServerFnError> {
    // データベースへのアクセスなど
    use sqlx::PgPool;

    let pool = use_context::<PgPool>()
        .ok_or_else(|| ServerFnError::ServerError("DB接続なし".into()))?;

    let posts = sqlx::query_as!(
        Post,
        "SELECT id, title, content FROM posts ORDER BY id DESC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| ServerFnError::ServerError(e.to_string()))?;

    Ok(posts)
}

// クライアント側コンポーネント
#[component]
fn PostList() -> impl IntoView {
    let posts = create_resource(|| (), |_| async move {
        get_posts().await
    });

    view! {
        <div class="post-list">
            <h2>"記事一覧"</h2>

            <Suspense fallback=|| view! { <p>"読み込み中..."</p> }>
                {move || posts.get().map(|result| match result {
                    Ok(posts) => view! {
                        <ul>
                            {posts.into_iter()
                                .map(|post| view! {
                                    <li key={post.id}>
                                        <h3>{post.title}</h3>
                                        <p>{post.content}</p>
                                    </li>
                                })
                                .collect::<Vec<_>>()
                            }
                        </ul>
                    }.into_view(),
                    Err(e) => view! {
                        <p class="error">{e.to_string()}</p>
                    }.into_view(),
                })}
            </Suspense>
        </div>
    }
}
```

### SSRモードでのCargo.toml

```toml
[dependencies]
leptos = { version = "0.6", features = ["ssr"] }
leptos_router = { version = "0.6", features = ["ssr"] }
leptos_axum = "0.6"
axum = "0.7"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio-native-tls"] }
```

### Axumサーバーのセットアップ

```rust
use axum::{
    routing::get,
    Router,
};
use leptos::*;
use leptos_axum::{generate_route_list, LeptosRoutes};

#[tokio::main]
async fn main() {
    // Leptosの設定
    let conf = get_configuration(None).await.unwrap();
    let leptos_options = conf.leptos_options;
    let routes = generate_route_list(App);

    // Axumアプリケーション
    let app = Router::new()
        .leptos_routes(&leptos_options, routes, App)
        .fallback(leptos_axum::file_and_error_handler)
        .with_state(leptos_options);

    // サーバー起動
    let addr = "127.0.0.1:3000";
    println!("Listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}
```

## フォーム処理

### アクション（Actions）

```rust
use leptos::*;

#[derive(Clone, Debug)]
struct FormData {
    name: String,
    email: String,
}

#[server(SubmitForm, "/api")]
pub async fn submit_form(data: FormData) -> Result<String, ServerFnError> {
    // サーバーサイドでの処理
    println!("フォーム送信: {:?}", data);

    // バリデーション
    if data.name.is_empty() {
        return Err(ServerFnError::ServerError("名前を入力してください".into()));
    }

    // データベース保存など
    Ok(format!("{}さん、登録ありがとうございます！", data.name))
}

#[component]
fn ContactForm() -> impl IntoView {
    let (name, set_name) = create_signal(String::new());
    let (email, set_email) = create_signal(String::new());

    // アクションの作成
    let submit_action = create_server_action::<SubmitForm>();

    let on_submit = move |ev: web_sys::SubmitEvent| {
        ev.prevent_default();

        let data = FormData {
            name: name.get(),
            email: email.get(),
        };

        submit_action.dispatch(data);
    };

    view! {
        <form on:submit=on_submit>
            <h2>"お問い合わせフォーム"</h2>

            <div>
                <label>"名前:"</label>
                <input
                    type="text"
                    on:input=move |ev| set_name.set(event_target_value(&ev))
                    prop:value=name
                />
            </div>

            <div>
                <label>"メール:"</label>
                <input
                    type="email"
                    on:input=move |ev| set_email.set(event_target_value(&ev))
                    prop:value=email
                />
            </div>

            <button type="submit" disabled=move || submit_action.pending().get()>
                {move || if submit_action.pending().get() {
                    "送信中..."
                } else {
                    "送信"
                }}
            </button>

            {move || submit_action.value().get().map(|result| match result {
                Ok(msg) => view! { <p class="success">{msg}</p> }.into_view(),
                Err(e) => view! { <p class="error">{e.to_string()}</p> }.into_view(),
            })}
        </form>
    }
}
```

## パフォーマンス最適化

### メモ化

```rust
use leptos::*;

#[component]
fn ExpensiveComponent(count: ReadSignal<i32>) -> impl IntoView {
    // 重い計算をメモ化
    let expensive_value = create_memo(move |_| {
        // ここでの計算はcountが変わった時だけ実行される
        (0..count.get()).fold(0, |acc, x| acc + x * x)
    });

    view! {
        <div>
            <p>"計算結果: " {expensive_value}</p>
        </div>
    }
}
```

### 仮想化リスト

大量のアイテムを扱う場合は仮想化を検討します。

```rust
use leptos::*;

#[component]
fn VirtualList() -> impl IntoView {
    let items: Vec<_> = (0..10000).map(|i| format!("Item {}", i)).collect();

    let (visible_start, set_visible_start) = create_signal(0);
    let visible_count = 20;

    let on_scroll = move |ev: web_sys::Event| {
        let target = event_target::<web_sys::HtmlElement>(&ev);
        let scroll_top = target.scroll_top();
        let item_height = 40;
        let new_start = (scroll_top / item_height).max(0) as usize;
        set_visible_start.set(new_start);
    };

    view! {
        <div
            class="virtual-list"
            style="height: 600px; overflow-y: auto;"
            on:scroll=on_scroll
        >
            <div style=move || format!("height: {}px", items.len() * 40)>
                <div style=move || format!("transform: translateY({}px)", visible_start.get() * 40)>
                    {move || {
                        let start = visible_start.get();
                        let end = (start + visible_count).min(items.len());
                        items[start..end]
                            .iter()
                            .enumerate()
                            .map(|(i, item)| view! {
                                <div key={start + i} style="height: 40px;">
                                    {item}
                                </div>
                            })
                            .collect::<Vec<_>>()
                    }}
                </div>
            </div>
        </div>
    }
}
```

## 実践例：TODOアプリ

完全なフルスタックTODOアプリを構築します。

```rust
use leptos::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
struct Todo {
    id: u32,
    text: String,
    completed: bool,
}

#[server(GetTodos, "/api")]
pub async fn get_todos() -> Result<Vec<Todo>, ServerFnError> {
    // DBから取得（簡略化のため固定データ）
    Ok(vec![
        Todo { id: 1, text: "Leptosを学ぶ".into(), completed: false },
        Todo { id: 2, text: "Rustを極める".into(), completed: false },
    ])
}

#[server(AddTodo, "/api")]
pub async fn add_todo(text: String) -> Result<Todo, ServerFnError> {
    // DBに追加
    Ok(Todo {
        id: 3, // 実際はDBで生成
        text,
        completed: false,
    })
}

#[server(ToggleTodo, "/api")]
pub async fn toggle_todo(id: u32) -> Result<(), ServerFnError> {
    // DBを更新
    Ok(())
}

#[component]
fn TodoApp() -> impl IntoView {
    let (new_todo, set_new_todo) = create_signal(String::new());

    let todos = create_resource(|| (), |_| async move {
        get_todos().await
    });

    let add_action = create_server_action::<AddTodo>();
    let toggle_action = create_server_action::<ToggleTodo>();

    let on_submit = move |ev: web_sys::SubmitEvent| {
        ev.prevent_default();
        let text = new_todo.get();
        if !text.is_empty() {
            add_action.dispatch(AddTodo { text: text.clone() });
            set_new_todo.set(String::new());
        }
    };

    create_effect(move |_| {
        if add_action.value().get().is_some()
            || toggle_action.value().get().is_some() {
            todos.refetch();
        }
    });

    view! {
        <div class="todo-app">
            <h1>"Leptos TODO"</h1>

            <form on:submit=on_submit>
                <input
                    type="text"
                    placeholder="新しいタスクを追加"
                    on:input=move |ev| set_new_todo.set(event_target_value(&ev))
                    prop:value=new_todo
                />
                <button type="submit">"追加"</button>
            </form>

            <Suspense fallback=|| view! { <p>"読み込み中..."</p> }>
                {move || todos.get().map(|result| match result {
                    Ok(todos) => view! {
                        <ul class="todo-list">
                            {todos.into_iter()
                                .map(|todo| {
                                    let id = todo.id;
                                    view! {
                                        <li
                                            key={id}
                                            class:completed=todo.completed
                                        >
                                            <input
                                                type="checkbox"
                                                checked=todo.completed
                                                on:change=move |_| {
                                                    toggle_action.dispatch(ToggleTodo { id });
                                                }
                                            />
                                            <span>{todo.text}</span>
                                        </li>
                                    }
                                })
                                .collect::<Vec<_>>()
                            }
                        </ul>
                    }.into_view(),
                    Err(e) => view! {
                        <p class="error">{e.to_string()}</p>
                    }.into_view(),
                })}
            </Suspense>
        </div>
    }
}
```

## まとめ

Leptosは、Rustの強力な型システムとパフォーマンスを活かしながら、モダンなWebアプリケーション開発を可能にするフレームワークです。

### Leptosの利点

- **型安全性**: コンパイル時にエラーを検出
- **パフォーマンス**: WebAssemblyによる高速実行
- **フルスタック**: サーバーとクライアントを一つの言語で統合
- **細粒度リアクティビティ**: 効率的なDOM更新
- **優れたSSRサポート**: SEOとパフォーマンスの両立

### 向いているユースケース

- 型安全性が重要なアプリケーション
- パフォーマンスが求められるWebアプリ
- Rustのエコシステムを活用したい場合
- フルスタックをRustで統一したいプロジェクト

Leptosはまだ発展途上のフレームワークですが、Rustの成長とともに今後さらに注目が集まることでしょう。既にRustに慣れている開発者はもちろん、新しい技術に挑戦したい方にもおすすめのフレームワークです。
