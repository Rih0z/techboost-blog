---
title: "Crystal言語入門 - Rubyライクな構文で高速動作するコンパイル言語"
description: "Rubyのような美しい構文とC言語並みの高速性を兼ね備えたCrystal言語の基礎から実践まで解説します。型推論、マクロ、並行処理など、Crystalの魅力を徹底ガイド。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-05"
tags: ['プログラミング', '開発ツール']
---
## Crystal言語とは

Crystalは、Rubyのような読みやすく書きやすい構文を持ちながら、C言語に匹敵する実行速度を実現するコンパイル言語です。2014年に登場し、静的型付けと型推論を組み合わせることで、開発者の生産性とパフォーマンスの両立を目指しています。

### Crystalの主な特徴

- **Rubyライクな構文**: Rubyに似た読みやすい構文
- **静的型付け + 型推論**: 明示的な型注釈なしで型安全性を確保
- **高速な実行速度**: LLVMベースのコンパイラによりC言語並みの速度
- **並行処理**: ファイバーベースの軽量並行処理
- **C言語バインディング**: 既存のC言語ライブラリを簡単に利用可能
- **ガベージコレクション**: メモリ管理を自動化

## インストール

### macOS

```bash
# Homebrewを使用
brew install crystal

# バージョン確認
crystal --version
```

### Linux (Ubuntu/Debian)

```bash
# 公式リポジトリを追加
curl -fsSL https://crystal-lang.org/install.sh | sudo bash

# インストール
sudo apt install crystal

# バージョン確認
crystal --version
```

### Docker

```bash
# Dockerイメージを使用
docker pull crystallang/crystal

# Crystalプログラムを実行
docker run --rm -v $(pwd):/workspace -w /workspace crystallang/crystal crystal run hello.cr
```

## 基本構文

### Hello World

```crystal
# hello.cr
puts "Hello, Crystal!"

# 実行
# crystal run hello.cr

# コンパイル
# crystal build hello.cr
# ./hello
```

### 変数と型推論

```crystal
# 型推論による変数定義
name = "Crystal"        # String
age = 11                # Int32
price = 99.99           # Float64
is_fast = true          # Bool

# 明示的な型注釈
count : Int32 = 100
message : String = "Hello"

# 定数
MAX_SIZE = 1000

# 複数代入
x, y, z = 1, 2, 3
```

### 基本的なデータ型

```crystal
# 数値型
int32_num = 42          # Int32
int64_num = 42_i64      # Int64
float_num = 3.14        # Float64
float32_num = 3.14_f32  # Float32

# 文字列
str = "Hello"
multiline = <<-TEXT
  複数行の
  文字列
  TEXT

# シンボル
symbol = :hello

# 配列
numbers = [1, 2, 3, 4, 5]
mixed = [1, "two", 3.0]  # Union型 (Int32 | String | Float64)

# ハッシュ
person = {
  "name" => "Alice",
  "age" => 30
}

# 名前付きタプル
config = {name: "App", version: "1.0.0"}
puts config[:name]  # => App

# タプル
tuple = {1, "hello", true}
puts tuple[0]  # => 1
```

## 関数とメソッド

### 関数定義

```crystal
# 基本的な関数
def greet(name)
  "Hello, #{name}!"
end

puts greet("Crystal")  # => Hello, Crystal!

# 型注釈付き関数
def add(a : Int32, b : Int32) : Int32
  a + b
end

# デフォルト引数
def greet(name = "World")
  "Hello, #{name}!"
end

# 名前付き引数
def create_user(name : String, age : Int32, admin : Bool = false)
  {name: name, age: age, admin: admin}
end

user = create_user(name: "Alice", age: 30)
```

### ブロックとイテレーション

```crystal
# ブロック付きメソッド
[1, 2, 3, 4, 5].each do |num|
  puts num
end

# 短縮形
[1, 2, 3, 4, 5].each { |num| puts num }

# map, select, reject
numbers = [1, 2, 3, 4, 5]
doubled = numbers.map { |n| n * 2 }
evens = numbers.select { |n| n.even? }
odds = numbers.reject { |n| n.even? }

# reduce
sum = numbers.reduce(0) { |acc, n| acc + n }
```

## クラスとオブジェクト指向

### クラス定義

```crystal
class Person
  # プロパティ定義
  property name : String
  property age : Int32

  # ゲッターのみ
  getter email : String

  # セッターのみ
  setter phone : String?

  # コンストラクタ
  def initialize(@name, @age, @email)
    @phone = nil
  end

  # メソッド
  def greet
    "Hello, I'm #{@name}, #{@age} years old."
  end

  # クラスメソッド
  def self.create_anonymous
    new("Anonymous", 0, "no-email@example.com")
  end
end

# インスタンス生成
person = Person.new("Alice", 30, "alice@example.com")
puts person.greet
puts person.name

# クラスメソッド呼び出し
anon = Person.create_anonymous
```

### 継承とモジュール

```crystal
# 継承
class Employee < Person
  property company : String

  def initialize(name, age, email, @company)
    super(name, age, email)
  end

  def greet
    "#{super} I work at #{@company}."
  end
end

# モジュール（ミックスイン）
module Walkable
  def walk
    "Walking..."
  end
end

module Runnable
  def run
    "Running..."
  end
end

class Animal
  include Walkable
  include Runnable

  property name : String

  def initialize(@name)
  end
end

dog = Animal.new("Buddy")
puts dog.walk  # => Walking...
puts dog.run   # => Running...
```

## 型システム

### Union型

```crystal
# 複数の型を受け入れる
def print_value(value : Int32 | String)
  puts value
end

print_value(42)
print_value("hello")

# Nil許容型
name : String? = nil  # String | Nil
name = "Crystal"

# 型チェック
if name.is_a?(String)
  puts name.upcase
end
```

### ジェネリクス

```crystal
# ジェネリッククラス
class Box(T)
  property value : T

  def initialize(@value)
  end

  def get : T
    @value
  end
end

int_box = Box(Int32).new(42)
str_box = Box(String).new("hello")

# ジェネリックメソッド
def first(array : Array(T)) : T forall T
  array[0]
end

puts first([1, 2, 3])      # => 1
puts first(["a", "b", "c"]) # => a
```

### 構造体 (Struct)

```crystal
# 値型として扱われる
struct Point
  property x : Int32
  property y : Int32

  def initialize(@x, @y)
  end

  def distance_from_origin
    Math.sqrt(x ** 2 + y ** 2)
  end
end

p1 = Point.new(3, 4)
puts p1.distance_from_origin  # => 5.0

# 構造体はコピーされる（値渡し）
p2 = p1
p2.x = 10
puts p1.x  # => 3 (変更されない)
```

## マクロ

Crystalの強力な機能の一つがマクロです。コンパイル時にコードを生成できます。

```crystal
# 基本的なマクロ
macro define_property(name)
  def {{name}}
    @{{name}}
  end

  def {{name}}=(value)
    @{{name}} = value
  end
end

class User
  define_property name
  define_property email

  def initialize
    @name = ""
    @email = ""
  end
end

# デバッグマクロ
macro debug(expression)
  puts "{{expression}} = #{{{expression}}}"
end

x = 42
debug(x)  # => x = 42
debug(x * 2)  # => x * 2 = 84

# ボイラープレート削減
macro define_crud(model)
  class {{model}}Repository
    def find(id : Int32)
      # データベースから検索
    end

    def save({{model.id.downcase}} : {{model}})
      # データベースに保存
    end

    def delete(id : Int32)
      # データベースから削除
    end
  end
end

class User
  property id : Int32?
  property name : String
end

define_crud(User)

# UserRepositoryクラスが自動生成される
repo = UserRepository.new
```

## 並行処理 - ファイバー

Crystalはファイバーベースの軽量並行処理をサポートしています。

```crystal
# ファイバーの生成
spawn do
  puts "ファイバー1開始"
  sleep 1
  puts "ファイバー1終了"
end

spawn do
  puts "ファイバー2開始"
  sleep 0.5
  puts "ファイバー2終了"
end

sleep 2  # メインファイバーを待機

# チャネルを使った通信
channel = Channel(String).new

spawn do
  channel.send("Hello from fiber!")
end

message = channel.receive
puts message

# 複数のファイバーでの並行処理
results = Channel(Int32).new

10.times do |i|
  spawn do
    sleep rand
    results.send(i * i)
  end
end

10.times do
  puts results.receive
end
```

## HTTPサーバー構築

Crystalの標準ライブラリでHTTPサーバーを簡単に構築できます。

```crystal
require "http/server"

server = HTTP::Server.new do |context|
  path = context.request.path

  case path
  when "/"
    context.response.content_type = "text/html"
    context.response.print <<-HTML
      <!DOCTYPE html>
      <html>
        <head><title>Crystal Server</title></head>
        <body>
          <h1>Hello from Crystal!</h1>
          <p>This is a simple HTTP server.</p>
        </body>
      </html>
      HTML
  when "/api/hello"
    context.response.content_type = "application/json"
    context.response.print({message: "Hello, API!"}.to_json)
  else
    context.response.status_code = 404
    context.response.print "Not Found"
  end
end

address = server.bind_tcp 8080
puts "Listening on http://#{address}"
server.listen
```

## JSON処理

```crystal
require "json"

# JSON Serializable
class User
  include JSON::Serializable

  property name : String
  property age : Int32
  property email : String

  def initialize(@name, @age, @email)
  end
end

# オブジェクト → JSON
user = User.new("Alice", 30, "alice@example.com")
json_string = user.to_json
puts json_string
# => {"name":"Alice","age":30,"email":"alice@example.com"}

# JSON → オブジェクト
json = %{{"name":"Bob","age":25,"email":"bob@example.com"}}
user = User.from_json(json)
puts user.name  # => Bob

# JSON配列
users = [
  User.new("Alice", 30, "alice@example.com"),
  User.new("Bob", 25, "bob@example.com")
]

json_array = users.to_json
puts json_array

parsed_users = Array(User).from_json(json_array)
parsed_users.each do |u|
  puts u.name
end
```

## データベース接続

Crystalには複数のデータベースシャードがあります。

```crystal
# PostgreSQL
require "pg"

DB.open "postgres://user:password@localhost/mydb" do |db|
  # クエリ実行
  db.exec "CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT, email TEXT)"

  # データ挿入
  db.exec "INSERT INTO users (name, email) VALUES ($1, $2)", "Alice", "alice@example.com"

  # データ取得
  db.query "SELECT * FROM users" do |rs|
    rs.each do
      id = rs.read(Int32)
      name = rs.read(String)
      email = rs.read(String)
      puts "#{id}: #{name} (#{email})"
    end
  end
end

# SQLite
require "sqlite3"

DB.open "sqlite3://./data.db" do |db|
  db.exec "CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, price REAL)"

  db.exec "INSERT INTO products (name, price) VALUES (?, ?)", "Product A", 99.99

  db.query "SELECT * FROM products" do |rs|
    rs.each do
      puts "#{rs.read(Int64)}: #{rs.read(String)} - $#{rs.read(Float64)}"
    end
  end
end
```

## Crystalフレームワーク - Kemal

Kemalは、SinatraライクなCrystal製Webフレームワークです。

```crystal
# shard.yml
dependencies:
  kemal:
    github: kemalcr/kemal

# app.cr
require "kemal"

get "/" do
  "Hello Kemal!"
end

get "/hello/:name" do |env|
  name = env.params.url["name"]
  "Hello #{name}!"
end

post "/api/users" do |env|
  name = env.params.json["name"].as(String)
  email = env.params.json["email"].as(String)

  # ユーザー作成処理

  env.response.content_type = "application/json"
  {id: 1, name: name, email: email}.to_json
end

Kemal.run
```

## パフォーマンス比較

Crystalの実行速度をRubyと比較してみましょう。

```crystal
# fibonacci.cr
def fibonacci(n)
  return n if n <= 1
  fibonacci(n - 1) + fibonacci(n - 2)
end

start = Time.monotonic
result = fibonacci(40)
elapsed = Time.monotonic - start

puts "Result: #{result}"
puts "Time: #{elapsed.total_seconds}s"

# Crystalでコンパイル実行: 約0.5秒
# Rubyで実行: 約30秒（約60倍の差）
```

## ベストプラクティス

### 1. 型注釈の活用

```crystal
# パブリックAPIには型注釈をつける
def calculate_total(items : Array(Item)) : Float64
  items.sum(&.price)
end

# プライベートメソッドは型推論に任せてもOK
private def helper(value)
  value * 2
end
```

### 2. Nilableの適切な処理

```crystal
def find_user(id : Int32) : User?
  # ...
end

# 安全な使い方
if user = find_user(123)
  puts user.name
else
  puts "User not found"
end

# try演算子
user.try(&.name)  # userがnilでもエラーにならない
```

### 3. 構造体 vs クラス

```crystal
# 小さなデータはStructを使う（値型、コピーされる）
struct Point
  property x : Int32
  property y : Int32
end

# 大きなデータや共有が必要ならClass（参照型）
class User
  property name : String
  property posts : Array(Post)
end
```

## まとめ

Crystalは、Rubyの美しい構文とC言語の高速性を組み合わせた魅力的な言語です。以下のような場合に特におすすめです:

- **高速なWebサーバー**: APIサーバーやマイクロサービス
- **CLIツール**: コマンドラインアプリケーション
- **システムプログラミング**: 低レベルなシステム開発
- **Rubyからの移行**: パフォーマンスが必要な部分の置き換え

型推論により、動的型付け言語の書きやすさと静的型付け言語の安全性を両立しており、生産性を保ちながら高速なアプリケーションを開発できます。ぜひCrystalを試してみてください!
