---
title: "Gleam言語入門ガイド - Erlang VM上の型安全関数型プログラミング"
description: "Erlang VM上で動作する型安全な関数型言語Gleamの基本から実践まで。型システム、パターンマッチング、OTP連携、WebアプリケーションとCLIツールの作成方法を解説します。"
pubDate: "2025-02-05"
tags: ['プログラミング', '開発ツール']
heroImage: '../../assets/thumbnails/gleam-language-guide.jpg'
---
Gleamは、Erlang VM（BEAM）上で動作する型安全な関数型プログラミング言語です。Erlangのエコシステムの恩恵を受けながら、モダンな型システムと開発者体験を提供します。

## Gleamとは

GleamはErlangやElixirと同じBEAM上で動作し、以下の特徴を持ちます。

### 主な特徴

- **静的型システム**: コンパイル時に型エラーを検出
- **型推論**: 明示的な型注釈を最小限に
- **イミュータブル**: すべてのデータは不変
- **パターンマッチング**: 強力なデータ構造の分解
- **OTP互換**: Erlang/Elixirのライブラリと相互運用可能
- **フレンドリーなエラーメッセージ**: Rustライクな親切なコンパイラ

```gleam
import gleam/io
import gleam/string

pub fn main() {
  io.println("Hello from Gleam!")

  let greeting = "Gleam"
    |> string.append(" is ")
    |> string.append("awesome!")

  io.println(greeting)
}
```

## セットアップ

Gleamのインストールは簡単です。

### インストール

```bash
# macOS (Homebrew)
brew install gleam

# Linux (Linuxbrew)
brew install gleam

# Windows (Chocolatey)
choco install gleam

# asdf経由
asdf plugin add gleam
asdf install gleam latest
asdf global gleam latest
```

### プロジェクト作成

```bash
# 新規プロジェクト作成
gleam new my_project
cd my_project

# ビルドと実行
gleam run

# テスト実行
gleam test

# フォーマット
gleam format
```

## 基本文法

### 変数と型

Gleamの変数は不変（イミュータブル）です。

```gleam
// 型推論による変数定義
let x = 42
let name = "Alice"

// 型注釈付き
let age: Int = 30
let price: Float = 99.99

// 変数のシャドーイング（新しい変数として扱う）
let value = 10
let value = value + 5  // OK: 新しい変数
```

### 関数定義

```gleam
// 基本的な関数
pub fn add(a: Int, b: Int) -> Int {
  a + b
}

// 型推論を活用
pub fn greet(name) {
  "Hello, " <> name <> "!"
}

// 複数行の関数
pub fn calculate_total(items: List(Float)) -> Float {
  items
  |> list.fold(0.0, fn(acc, item) { acc +. item })
}

// ガード節付き関数
pub fn describe_age(age: Int) -> String {
  case age {
    _ if age < 0 -> "Invalid age"
    _ if age < 13 -> "Child"
    _ if age < 20 -> "Teenager"
    _ if age < 65 -> "Adult"
    _ -> "Senior"
  }
}
```

### カスタム型

```gleam
// レコード型（構造体のようなもの）
pub type User {
  User(name: String, age: Int, email: String)
}

// ユーザー作成
let user = User(name: "Alice", age: 30, email: "alice@example.com")

// フィールドアクセス
io.println(user.name)

// レコード更新（新しいレコードを作成）
let updated_user = User(..user, age: 31)

// ジェネリック型
pub type Result(value, error) {
  Ok(value)
  Error(error)
}

// カスタムエラー型
pub type AppError {
  NotFound
  Unauthorized
  InvalidInput(message: String)
}
```

### パターンマッチング

Gleamの最も強力な機能の一つです。

```gleam
import gleam/result

// シンプルなパターンマッチ
pub fn handle_result(res: Result(Int, String)) -> String {
  case res {
    Ok(value) -> "Success: " <> int.to_string(value)
    Error(msg) -> "Error: " <> msg
  }
}

// リストのパターンマッチ
pub fn sum_list(numbers: List(Int)) -> Int {
  case numbers {
    [] -> 0
    [first, ..rest] -> first + sum_list(rest)
  }
}

// 複雑なパターンマッチ
pub type Shape {
  Circle(radius: Float)
  Rectangle(width: Float, height: Float)
  Triangle(base: Float, height: Float)
}

pub fn area(shape: Shape) -> Float {
  case shape {
    Circle(r) -> 3.14159 *. r *. r
    Rectangle(w, h) -> w *. h
    Triangle(b, h) -> 0.5 *. b *. h
  }
}

// ガード付きパターン
pub fn categorize_number(n: Int) -> String {
  case n {
    0 -> "Zero"
    _ if n < 0 -> "Negative"
    _ if n % 2 == 0 -> "Positive Even"
    _ -> "Positive Odd"
  }
}
```

## 高度な型システム

### Result型によるエラーハンドリング

Gleamでは例外を使わず、Result型でエラーを表現します。

```gleam
import gleam/result
import gleam/int

pub type ParseError {
  InvalidFormat
  OutOfRange
}

pub fn parse_age(input: String) -> Result(Int, ParseError) {
  case int.parse(input) {
    Error(_) -> Error(InvalidFormat)
    Ok(age) if age < 0 || age > 150 -> Error(OutOfRange)
    Ok(age) -> Ok(age)
  }
}

// Result型のチェーン
pub fn validate_user_age(input: String) -> Result(String, String) {
  input
  |> parse_age
  |> result.map(fn(age) { "Valid age: " <> int.to_string(age) })
  |> result.map_error(fn(err) {
    case err {
      InvalidFormat -> "Please enter a number"
      OutOfRange -> "Age must be between 0 and 150"
    }
  })
}
```

### Option型（Nullable代替）

```gleam
import gleam/option.{type Option, None, Some}

pub fn find_user(id: Int, users: List(User)) -> Option(User) {
  case users {
    [] -> None
    [user, ..rest] if user.id == id -> Some(user)
    [_, ..rest] -> find_user(id, rest)
  }
}

// Option型の活用
pub fn get_user_name(id: Int, users: List(User)) -> String {
  find_user(id, users)
  |> option.map(fn(user) { user.name })
  |> option.unwrap("Unknown User")
}
```

## OTP統合

GleamはErlangのOTP（Open Telecom Platform）と完全互換です。

### GenServerの実装

```gleam
import gleam/otp/actor
import gleam/erlang/process.{type Subject}

pub type Message {
  Increment
  Decrement
  GetValue(reply_to: Subject(Int))
}

pub type State {
  State(count: Int)
}

pub fn start() {
  actor.start(State(count: 0), handle_message)
}

fn handle_message(message: Message, state: State) -> actor.Next(Message, State) {
  case message {
    Increment -> actor.continue(State(count: state.count + 1))
    Decrement -> actor.continue(State(count: state.count - 1))
    GetValue(client) -> {
      process.send(client, state.count)
      actor.continue(state)
    }
  }
}

// 使用例
pub fn main() {
  let assert Ok(counter) = start()

  actor.send(counter, Increment)
  actor.send(counter, Increment)

  let count = process.call(counter, GetValue(_), 100)
  io.debug(count)  // 2
}
```

### スーパーバイザー

```gleam
import gleam/otp/supervisor

pub fn main() {
  let children = [
    supervisor.worker(start_counter),
    supervisor.worker(start_logger),
  ]

  supervisor.start(fn(_) {
    supervisor.Spec(
      argument: Nil,
      frequency_period: 5,
      max_frequency: 3,
      init: fn(_children) { supervisor.Ready(children: children) },
    )
  })
}
```

## 実践例

### Webアプリケーション（Wisp使用）

```gleam
import gleam/http/response.{type Response}
import gleam/string_builder
import wisp.{type Request, type Response}

pub fn handle_request(req: Request) -> Response {
  case wisp.path_segments(req) {
    [] -> home_page()
    ["api", "users"] -> list_users(req)
    ["api", "users", id] -> get_user(req, id)
    _ -> wisp.not_found()
  }
}

fn home_page() -> Response {
  let html = string_builder.from_string("
    <!DOCTYPE html>
    <html>
      <head><title>Gleam Web App</title></head>
      <body>
        <h1>Welcome to Gleam!</h1>
        <a href=\"/api/users\">View Users</a>
      </body>
    </html>
  ")

  response.new(200)
  |> response.set_body(wisp.html_body(html))
}

fn list_users(req: Request) -> Response {
  case req.method {
    http.Get -> {
      let users = [
        User(id: 1, name: "Alice"),
        User(id: 2, name: "Bob"),
      ]
      wisp.json_response(encode_users(users), 200)
    }
    _ -> wisp.method_not_allowed([http.Get])
  }
}
```

### CLIツール作成

```gleam
import gleam/io
import gleam/string
import gleam/list
import argv

pub type Command {
  Add(a: Int, b: Int)
  Multiply(a: Int, b: Int)
  Help
}

pub fn main() {
  case parse_args(argv.load().arguments) {
    Ok(Add(a, b)) -> {
      io.println("Result: " <> int.to_string(a + b))
    }
    Ok(Multiply(a, b)) -> {
      io.println("Result: " <> int.to_string(a * b))
    }
    Ok(Help) -> print_help()
    Error(msg) -> {
      io.println_error(msg)
      print_help()
    }
  }
}

fn parse_args(args: List(String)) -> Result(Command, String) {
  case args {
    ["add", a, b] -> parse_add(a, b)
    ["multiply", a, b] -> parse_multiply(a, b)
    ["help"] -> Ok(Help)
    _ -> Error("Invalid command")
  }
}

fn parse_add(a: String, b: String) -> Result(Command, String) {
  case int.parse(a), int.parse(b) {
    Ok(num_a), Ok(num_b) -> Ok(Add(num_a, num_b))
    _, _ -> Error("Invalid numbers")
  }
}
```

### テスト

Gleamには優れたテストフレームワークが組み込まれています。

```gleam
// test/my_module_test.gleam
import gleeunit
import gleeunit/should
import my_module

pub fn main() {
  gleeunit.main()
}

pub fn add_test() {
  my_module.add(2, 3)
  |> should.equal(5)
}

pub fn user_validation_test() {
  let user = User(name: "", age: -1)

  my_module.validate_user(user)
  |> should.be_error()
}

pub fn list_operations_test() {
  [1, 2, 3]
  |> my_module.double_all()
  |> should.equal([2, 4, 6])
}
```

## パフォーマンスとデプロイ

### コンパイルターゲット

Gleamは複数のターゲットにコンパイル可能です。

```bash
# Erlang VMターゲット（デフォルト）
gleam build --target erlang

# JavaScript/Node.jsターゲット
gleam build --target javascript
```

### 本番環境デプロイ

```dockerfile
# Dockerfile
FROM ghcr.io/gleam-lang/gleam:v1.0.0-erlang-alpine

WORKDIR /app
COPY . .

RUN gleam build

CMD ["gleam", "run"]
```

## まとめ

Gleamは以下のような開発に適しています。

### 適用領域

- **Webバックエンド**: 高並行性が求められるAPI
- **リアルタイムシステム**: WebSocketサーバー、チャットアプリ
- **分散システム**: マイクロサービス、メッセージキュー
- **CLIツール**: 型安全なコマンドラインアプリケーション
- **組み込みシステム**: IoT、ネットワーク機器

### Gleamの強み

1. **型安全性**: コンパイル時エラー検出で品質向上
2. **並行性**: Erlang VMの軽量プロセスで高スループット
3. **フォールトトレランス**: OTPによる耐障害性
4. **相互運用性**: Erlang/Elixirエコシステムとの統合
5. **開発者体験**: 優れたツールチェーンと親切なエラーメッセージ

Gleamは、Erlangの堅牢性とモダンな型システムを両立した魅力的な言語です。特にバックエンド開発や高並行システムの構築において、型安全性と開発者体験の向上を実現します。
