---
title: "Rust入門ガイド2026 — なぜ今Rustを学ぶべきなのか"
description: "Rustの基礎から実践まで完全解説。所有権、借用、ライフタイムなどの独自概念から、Cargo、WebAssembly、実用例まで2026年最新の情報をお届けします。"
pubDate: "2026-02-06"
category: "Programming"
tags: ["Rust", "プログラミング", "入門", "システムプログラミング", "2026"]
---

## はじめに

2026年現在、Rustは最も注目されているプログラミング言語の一つです。Stack Overflow Developer Surveyでは7年連続で「最も愛されている言語」に選ばれ、MicrosoftやAmazon、Googleなどの大手企業も積極的に採用しています。

本記事では、Rustの基礎から実践的な使い方まで、初心者にもわかりやすく解説します。

## なぜ今Rustを学ぶべきなのか

### 1. メモリ安全性とパフォーマンスの両立

従来、プログラミング言語は「安全性」と「パフォーマンス」のトレードオフがありました。

- **C/C++**: 高速だがメモリ安全性の問題
- **Python/JavaScript**: 安全だが実行速度が遅い

Rustは**コンパイル時にメモリ安全性を保証**しながら、**C/C++並みの実行速度**を実現します。

### 2. 業界での採用拡大

2026年現在、以下のような分野でRustの採用が進んでいます。

- **システムプログラミング**: Linux Kernel、Windows、Android
- **Web開発**: Actix、Rocket、Axumなどのフレームワーク
- **WebAssembly**: 高速なブラウザアプリケーション
- **暗号通貨・ブロックチェーン**: Solana、Polkadot
- **組み込みシステム**: IoTデバイス、ロボティクス
- **クラウドインフラ**: AWS Lambda、Cloudflare Workers

### 3. 優れた開発者体験

- **Cargo**: 強力なパッケージマネージャー＆ビルドツール
- **rustfmt**: 統一されたコードフォーマット
- **Clippy**: 高度なLinter
- **充実したドキュメント**: 公式ドキュメントが非常に詳細

### 4. 将来性の高さ

- GitHub上でのスター数・コントリビューター数が急増
- 求人市場での需要が年々増加
- 多くの企業が「次世代の主力言語」として位置づけ

## Rustのインストール

### rustupを使ったインストール

Rustの公式インストーラー`rustup`を使うのが最も簡単です。

**macOS / Linux:**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Windows:**

[https://rustup.rs/](https://rustup.rs/) からインストーラーをダウンロードして実行。

### インストールの確認

```bash
rustc --version
cargo --version
```

正常にインストールされていれば、バージョン情報が表示されます。

```
rustc 1.85.0 (2026-02-04)
cargo 1.85.0 (2026-02-04)
```

### エディタのセットアップ

**VS Code (推奨):**

- 拡張機能「rust-analyzer」をインストール
- 自動補完、エラー表示、リファクタリング機能が利用可能

**その他のエディタ:**

- IntelliJ IDEA: IntelliJ Rustプラグイン
- Vim/Neovim: rust.vim + coc-rust-analyzer
- Emacs: rust-mode

## Rustの基本文法

### Hello, World!

```rust
fn main() {
    println!("Hello, World!");
}
```

実行方法:

```bash
# ファイルに保存
rustc hello.rs
./hello
```

または、Cargoを使う:

```bash
cargo new hello_world
cd hello_world
cargo run
```

### 変数とデータ型

**不変変数（デフォルト）:**

```rust
let x = 5; // 不変
// x = 6; // エラー: 再代入不可
```

**可変変数:**

```rust
let mut y = 10;
y = 20; // OK
```

**データ型:**

```rust
// 整数
let a: i32 = 42; // 32ビット符号付き整数
let b: u64 = 100; // 64ビット符号なし整数

// 浮動小数点
let f: f64 = 3.14;

// 真偽値
let flag: bool = true;

// 文字
let c: char = 'あ';

// 文字列
let s: &str = "Hello"; // 文字列スライス
let string: String = String::from("World"); // 所有された文字列
```

### 関数

```rust
fn add(x: i32, y: i32) -> i32 {
    x + y // 最後の式が戻り値（セミコロンなし）
}

fn main() {
    let result = add(3, 5);
    println!("Result: {}", result);
}
```

### 制御構文

**if式:**

```rust
let number = 7;

if number < 5 {
    println!("小さい");
} else if number < 10 {
    println!("中くらい");
} else {
    println!("大きい");
}

// if式は値を返せる
let result = if number % 2 == 0 { "偶数" } else { "奇数" };
```

**ループ:**

```rust
// loop
let mut counter = 0;
loop {
    counter += 1;
    if counter == 10 {
        break;
    }
}

// while
let mut n = 3;
while n != 0 {
    println!("{}", n);
    n -= 1;
}

// for
for i in 1..=5 {
    println!("{}", i);
}

let arr = [10, 20, 30];
for element in arr.iter() {
    println!("{}", element);
}
```

### コレクション

**Vector（動的配列）:**

```rust
let mut vec = Vec::new();
vec.push(1);
vec.push(2);
vec.push(3);

// マクロを使った初期化
let vec2 = vec![1, 2, 3];

// アクセス
println!("{}", vec[0]); // パニックの可能性
println!("{:?}", vec.get(0)); // Optionを返す（安全）
```

**HashMap:**

```rust
use std::collections::HashMap;

let mut scores = HashMap::new();
scores.insert("Alice", 100);
scores.insert("Bob", 85);

// 取得
match scores.get("Alice") {
    Some(&score) => println!("Alice: {}", score),
    None => println!("見つかりません"),
}
```

## Rustの核心概念

### 所有権（Ownership）

Rustの最も重要な概念です。メモリ管理をガベージコレクションなしで実現します。

**所有権のルール:**

1. 各値には所有者が1つだけ存在する
2. 所有者がスコープを抜けると、値は破棄される
3. 値の所有権は移動（move）できる

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // 所有権がs2に移動

    // println!("{}", s1); // エラー: s1はもう使えない
    println!("{}", s2); // OK
}
```

**関数と所有権:**

```rust
fn take_ownership(s: String) {
    println!("{}", s);
} // sがドロップされる

fn main() {
    let s = String::from("hello");
    take_ownership(s);
    // println!("{}", s); // エラー: 所有権が移動済み
}
```

**所有権を返す:**

```rust
fn give_ownership() -> String {
    String::from("hello")
}

fn take_and_give_back(s: String) -> String {
    s
}

fn main() {
    let s1 = give_ownership();
    let s2 = String::from("world");
    let s3 = take_and_give_back(s2);

    println!("{} {}", s1, s3);
}
```

### 借用（Borrowing）

所有権を移動させずに値を参照する仕組みです。

**不変参照:**

```rust
fn calculate_length(s: &String) -> usize {
    s.len()
} // sは参照なので所有権はない

fn main() {
    let s1 = String::from("hello");
    let len = calculate_length(&s1);
    println!("'{}' の長さは {}", s1, len); // s1はまだ使える
}
```

**可変参照:**

```rust
fn append_world(s: &mut String) {
    s.push_str(", world");
}

fn main() {
    let mut s = String::from("hello");
    append_world(&mut s);
    println!("{}", s); // "hello, world"
}
```

**借用のルール:**

1. 任意の時点で、1つの可変参照 または 複数の不変参照のいずれか
2. 参照は常に有効でなければならない

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &s; // OK
    let r2 = &s; // OK
    // let r3 = &mut s; // エラー: 不変参照がある間は可変参照を作れない

    println!("{} {}", r1, r2);

    let r3 = &mut s; // OK（r1, r2はもう使われない）
    r3.push_str("!");
}
```

### ライフタイム（Lifetime）

参照が有効な期間を明示する仕組みです。

**基本的なライフタイム:**

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let string1 = String::from("long string");
    let string2 = String::from("short");

    let result = longest(string1.as_str(), string2.as_str());
    println!("最長: {}", result);
}
```

**構造体のライフタイム:**

```rust
struct ImportantExcerpt<'a> {
    part: &'a str,
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().expect("Could not find a '.'");

    let excerpt = ImportantExcerpt {
        part: first_sentence,
    };

    println!("{}", excerpt.part);
}
```

**ライフタイム省略規則:**

多くの場合、Rustコンパイラがライフタイムを推論してくれます。

```rust
// これは
fn first_word(s: &str) -> &str {
    &s[..1]
}

// 実際にはこう解釈される
fn first_word<'a>(s: &'a str) -> &'a str {
    &s[..1]
}
```

## 構造体とEnum

### 構造体（Struct）

```rust
struct User {
    username: String,
    email: String,
    active: bool,
    sign_in_count: u64,
}

impl User {
    // 関連関数（メソッド）
    fn new(username: String, email: String) -> User {
        User {
            username,
            email,
            active: true,
            sign_in_count: 1,
        }
    }

    // メソッド
    fn deactivate(&mut self) {
        self.active = false;
    }

    fn is_active(&self) -> bool {
        self.active
    }
}

fn main() {
    let mut user = User::new(
        String::from("alice"),
        String::from("alice@example.com")
    );

    println!("Active: {}", user.is_active());
    user.deactivate();
    println!("Active: {}", user.is_active());
}
```

**タプル構造体:**

```rust
struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

let black = Color(0, 0, 0);
let origin = Point(0, 0, 0);
```

### Enum（列挙型）

```rust
enum IpAddr {
    V4(u8, u8, u8, u8),
    V6(String),
}

let home = IpAddr::V4(127, 0, 0, 1);
let loopback = IpAddr::V6(String::from("::1"));
```

**Option型:**

Rustには`null`がありません。代わりに`Option`を使います。

```rust
enum Option<T> {
    Some(T),
    None,
}

fn divide(x: f64, y: f64) -> Option<f64> {
    if y == 0.0 {
        None
    } else {
        Some(x / y)
    }
}

fn main() {
    match divide(10.0, 2.0) {
        Some(result) => println!("結果: {}", result),
        None => println!("ゼロ除算エラー"),
    }
}
```

**Result型:**

エラーハンドリングに使います。

```rust
use std::fs::File;
use std::io::ErrorKind;

fn main() {
    let f = File::open("hello.txt");

    let f = match f {
        Ok(file) => file,
        Err(error) => match error.kind() {
            ErrorKind::NotFound => match File::create("hello.txt") {
                Ok(fc) => fc,
                Err(e) => panic!("ファイル作成エラー: {:?}", e),
            },
            other_error => panic!("ファイルオープンエラー: {:?}", other_error),
        },
    };
}
```

**?演算子:**

エラーハンドリングを簡潔に書けます。

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let mut f = File::open("username.txt")?;
    let mut s = String::new();
    f.read_to_string(&mut s)?;
    Ok(s)
}
```

## トレイト（Trait）

トレイトはインターフェースのようなものです。

```rust
trait Summary {
    fn summarize(&self) -> String;
}

struct Article {
    title: String,
    content: String,
}

impl Summary for Article {
    fn summarize(&self) -> String {
        format!("{}: {}", self.title, self.content)
    }
}

struct Tweet {
    username: String,
    text: String,
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("@{}: {}", self.username, self.text)
    }
}

fn notify(item: &impl Summary) {
    println!("速報: {}", item.summarize());
}

fn main() {
    let article = Article {
        title: String::from("Rust入門"),
        content: String::from("Rustを学ぼう"),
    };

    notify(&article);
}
```

**トレイト境界:**

```rust
fn largest<T: PartialOrd + Copy>(list: &[T]) -> T {
    let mut largest = list[0];

    for &item in list.iter() {
        if item > largest {
            largest = item;
        }
    }

    largest
}

fn main() {
    let numbers = vec![34, 50, 25, 100, 65];
    println!("最大値: {}", largest(&numbers));
}
```

**デフォルト実装:**

```rust
trait Summary {
    fn summarize(&self) -> String {
        String::from("(続きを読む...)")
    }
}

struct NewsArticle {
    headline: String,
}

impl Summary for NewsArticle {}

fn main() {
    let article = NewsArticle {
        headline: String::from("ニュース"),
    };
    println!("{}", article.summarize()); // デフォルト実装が使われる
}
```

## Cargoとパッケージ管理

### Cargoの基本コマンド

```bash
# 新規プロジェクト作成
cargo new my_project
cd my_project

# ビルド（デバッグビルド）
cargo build

# リリースビルド（最適化）
cargo build --release

# 実行
cargo run

# テスト実行
cargo test

# ドキュメント生成
cargo doc --open

# 依存関係の更新
cargo update

# コードチェック（ビルドより高速）
cargo check
```

### Cargo.tomlの構造

```toml
[package]
name = "my_project"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.35", features = ["full"] }
reqwest = "0.11"

[dev-dependencies]
mockall = "0.12"

[profile.release]
opt-level = 3
lto = true
```

### crates.ioからの依存関係追加

```bash
# cargo addコマンドを使う（cargo-editが必要）
cargo install cargo-edit
cargo add serde
cargo add tokio --features full

# または手動でCargo.tomlに追記してcargo build
```

### ワークスペース

複数のクレートを1つのプロジェクトで管理できます。

```toml
# ルートのCargo.toml
[workspace]
members = [
    "frontend",
    "backend",
    "common",
]
```

## 実践例：CLIツール作成

簡単なテキスト検索ツール「minigrep」を作ります。

**Cargo.toml:**

```toml
[package]
name = "minigrep"
version = "0.1.0"
edition = "2021"
```

**src/main.rs:**

```rust
use std::env;
use std::fs;
use std::process;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 3 {
        eprintln!("使い方: minigrep <検索文字列> <ファイル名>");
        process::exit(1);
    }

    let query = &args[1];
    let filename = &args[2];

    let contents = fs::read_to_string(filename)
        .unwrap_or_else(|err| {
            eprintln!("ファイル読み込みエラー: {}", err);
            process::exit(1);
        });

    for line in search(query, &contents) {
        println!("{}", line);
    }
}

fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let mut results = Vec::new();

    for line in contents.lines() {
        if line.contains(query) {
            results.push(line);
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_result() {
        let query = "duct";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.";

        assert_eq!(vec!["safe, fast, productive."], search(query, contents));
    }
}
```

実行:

```bash
cargo run -- rust sample.txt
```

## WebAssemblyとRust

RustはWebAssemblyの第一級サポート言語です。

### wasm-packのインストール

```bash
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

### プロジェクト作成

```bash
cargo install cargo-generate
cargo generate --git https://github.com/rustwasm/wasm-pack-template
```

**src/lib.rs:**

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}
```

### ビルド

```bash
wasm-pack build --target web
```

### HTMLから使用

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rust + Wasm</title>
</head>
<body>
    <script type="module">
        import init, { greet, fibonacci } from './pkg/my_project.js';

        async function run() {
            await init();

            console.log(greet('World'));
            console.log('fib(10) =', fibonacci(10));
        }

        run();
    </script>
</body>
</html>
```

## Web開発フレームワーク

### Actix-web（高速なWebフレームワーク）

```toml
[dependencies]
actix-web = "4"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
```

```rust
use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct User {
    name: String,
    age: u32,
}

#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Ok().body("Hello, World!")
}

#[get("/users/{id}")]
async fn get_user(path: web::Path<u32>) -> impl Responder {
    let user = User {
        name: format!("User {}", path),
        age: 25,
    };
    HttpResponse::Ok().json(user)
}

#[post("/users")]
async fn create_user(user: web::Json<User>) -> impl Responder {
    HttpResponse::Created().json(user.0)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(index)
            .service(get_user)
            .service(create_user)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

### Axum（軽量でモダンなフレームワーク）

```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
```

```rust
use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct User {
    name: String,
    age: u32,
}

async fn root() -> &'static str {
    "Hello, World!"
}

async fn create_user(Json(payload): Json<User>) -> Json<User> {
    Json(payload)
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(root))
        .route("/users", post(create_user));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();

    axum::serve(listener, app).await.unwrap();
}
```

## 非同期プログラミング

Rustの非同期処理は`async`/`await`構文を使います。

```rust
use tokio::time::{sleep, Duration};

async fn say_hello() {
    println!("Hello");
    sleep(Duration::from_secs(1)).await;
    println!("World");
}

async fn fetch_data(url: &str) -> Result<String, reqwest::Error> {
    let response = reqwest::get(url).await?;
    let body = response.text().await?;
    Ok(body)
}

#[tokio::main]
async fn main() {
    say_hello().await;

    match fetch_data("https://api.example.com/data").await {
        Ok(data) => println!("Data: {}", data),
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

**複数のタスクを並列実行:**

```rust
use tokio::join;

#[tokio::main]
async fn main() {
    let task1 = async {
        sleep(Duration::from_secs(1)).await;
        "Task 1"
    };

    let task2 = async {
        sleep(Duration::from_secs(2)).await;
        "Task 2"
    };

    let (result1, result2) = join!(task1, task2);
    println!("{}, {}", result1, result2);
}
```

## エコシステムと主要クレート

### ユーティリティ

- **serde**: シリアライゼーション・デシリアライゼーション
- **clap**: CLIパーサー
- **regex**: 正規表現
- **chrono**: 日時処理
- **uuid**: UUID生成
- **rand**: 乱数生成

### Web開発

- **actix-web**: 高速なWebフレームワーク
- **axum**: モダンなWebフレームワーク
- **rocket**: 使いやすいWebフレームワーク
- **reqwest**: HTTPクライアント
- **hyper**: 低レベルHTTPライブラリ

### データベース

- **sqlx**: 非同期SQLライブラリ
- **diesel**: ORMライブラリ
- **tokio-postgres**: PostgreSQLクライアント
- **redis**: Redisクライアント

### 非同期処理

- **tokio**: 最も人気のある非同期ランタイム
- **async-std**: 標準ライブラリ風の非同期ランタイム
- **futures**: Futureトレイトとユーティリティ

### テスト

- **mockall**: モックライブラリ
- **proptest**: プロパティベーステスト
- **criterion**: ベンチマーク

## ベストプラクティス

### 1. エラーハンドリング

`unwrap()`は本番コードでは避け、適切なエラーハンドリングを。

```rust
// 悪い例
let file = File::open("config.txt").unwrap();

// 良い例
let file = File::open("config.txt")
    .map_err(|e| format!("設定ファイル読み込みエラー: {}", e))?;
```

### 2. クローンを避ける

不必要な`clone()`は避け、参照を活用。

```rust
// 悪い例
fn process(data: Vec<i32>) {
    let copy = data.clone();
    // ...
}

// 良い例
fn process(data: &[i32]) {
    // ...
}
```

### 3. イテレータの活用

ループよりイテレータの方が効率的で読みやすい。

```rust
// 悪い例
let mut sum = 0;
for i in 0..10 {
    sum += i;
}

// 良い例
let sum: i32 = (0..10).sum();
```

### 4. Clippyの活用

```bash
rustup component add clippy
cargo clippy
```

Clippyは多くのアンチパターンを検出してくれます。

### 5. テストの作成

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    #[should_panic]
    fn test_divide_by_zero() {
        divide(10, 0);
    }
}
```

## 学習リソース

### 公式ドキュメント

- **The Rust Programming Language（通称：The Book）**: [https://doc.rust-lang.org/book/](https://doc.rust-lang.org/book/)
- **Rust by Example**: [https://doc.rust-lang.org/rust-by-example/](https://doc.rust-lang.org/rust-by-example/)
- **The Cargo Book**: [https://doc.rust-lang.org/cargo/](https://doc.rust-lang.org/cargo/)

### オンラインコース

- **Rustlings**: インタラクティブな練習問題
- **Exercism Rust Track**: 実践的な課題
- **Udemy**: Rust入門コース多数

### コミュニティ

- **公式フォーラム**: [https://users.rust-lang.org/](https://users.rust-lang.org/)
- **Reddit r/rust**: [https://reddit.com/r/rust](https://reddit.com/r/rust)
- **Discord**: Rust公式Discordサーバー

## まとめ

Rustは学習曲線が急ですが、その投資に見合う価値があります。

**Rustを学ぶメリット:**

1. **メモリ安全性**: バグの大部分をコンパイル時に検出
2. **高性能**: C/C++並みの実行速度
3. **並行処理の安全性**: データ競合をコンパイル時に防止
4. **優れたツール**: Cargo、rustfmt、Clippy
5. **将来性**: 業界での採用が急速に拡大

**次のステップ:**

1. The Bookを最後まで読む
2. 小さなCLIツールを作る
3. WebアプリケーションやAPIを作る
4. 既存のRustプロジェクトにコントリビュート
5. 自分のライブラリをcrates.ioに公開

2026年、Rustはシステムプログラミングだけでなく、Web開発、CLI、WebAssembly、組み込みなど幅広い分野で使われています。今こそRustを学び始める絶好のタイミングです。

Happy Rusting!
