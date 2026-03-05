---
title: "Nim言語入門 - Pythonライクな高性能コンパイル言語"
description: "Nim言語の基本から実践的な使い方まで解説します。Pythonのような読みやすさとC言語並みの高速性を兼ね備えた言語です。"
pubDate: "2025-02-05"
tags: ['プログラミング']
---

Pythonのような読みやすく書きやすい構文と、C言語並みの高速性を兼ね備えたプログラミング言語があるとしたら、興味がありませんか？それが**Nim（ニム）**です。

Nimは、静的型付けのコンパイル言語でありながら、Pythonのようなインデントベースの構文を持ち、高速で効率的なコードを生成します。この記事では、Nimの基本から実践的な使い方まで、詳しく解説します。

## Nimとは？

[Nim](https://nim-lang.org/)は、効率的で表現力豊かで、エレガントなプログラミング言語です。

### 主な特徴

1. **Pythonライクな構文**: インデントベースで読みやすい
2. **高速**: C/C++/JavaScript/Objective-Cにコンパイル
3. **静的型付け**: コンパイル時に型チェック
4. **メモリ効率**: 手動・自動のメモリ管理を選択可能
5. **マクロシステム**: 強力なメタプログラミング
6. **クロスプラットフォーム**: Windows、macOS、Linux、Web
7. **小さなバイナリ**: 実行ファイルサイズが小さい

### なぜNimを使うのか？

**Pythonの問題**
- 遅い（インタプリタ言語）
- GIL（Global Interpreter Lock）による並行処理の制約
- 型安全性の欠如

**C/C++の問題**
- 複雑な構文
- メモリ管理が難しい
- コンパイル時間が長い

**Nimの解決**
- Pythonのような読みやすさ
- C並みの速度
- 安全な型システム
- 高速なコンパイル
- 柔軟なメモリ管理

## インストール

### macOS

```bash
brew install nim
```

### Linux

```bash
curl https://nim-lang.org/choosenim/init.sh -sSf | sh
```

### Windows

[公式サイト](https://nim-lang.org/install.html)からインストーラーをダウンロード。

### バージョン確認

```bash
nim --version
```

## Hello, World!

まずは、シンプルなHello Worldから始めましょう。

```nim
# hello.nim
echo "Hello, World!"
```

### コンパイルと実行

```bash
nim c -r hello.nim
```

- `c`: Cにコンパイル
- `-r`: コンパイル後に実行

出力:
```
Hello, World!
```

### リリースビルド

```bash
nim c -d:release hello.nim
./hello
```

リリースビルドでは、最適化が有効になり、より高速な実行ファイルが生成されます。

## 基本的な構文

### 変数

```nim
# let: 不変（immutable）
let name = "Alice"
let age = 25

# var: 可変（mutable）
var score = 100
score = 120  # OK

# name = "Bob"  # エラー: letは変更不可

# 型注釈
let count: int = 10
let price: float = 99.99
let isActive: bool = true
```

### 型

```nim
# 整数型
let a: int = 42
let b: int8 = 127
let c: int16 = 32767
let d: int32 = 2147483647
let e: int64 = 9223372036854775807

# 符号なし整数
let f: uint = 42
let g: uint8 = 255

# 浮動小数点数
let h: float = 3.14
let i: float32 = 3.14
let j: float64 = 3.14

# 文字列
let name: string = "Alice"

# 文字
let ch: char = 'A'

# ブール
let flag: bool = true
```

### 文字列

```nim
# 文字列連結
let firstName = "John"
let lastName = "Doe"
let fullName = firstName & " " & lastName
echo fullName  # John Doe

# 文字列補間
let age = 25
echo "I am ", age, " years old"

# フォーマット文字列
import std/strformat
echo &"I am {age} years old"

# 複数行文字列
let poem = """
  Roses are red,
  Violets are blue,
  Nim is awesome,
  And so are you!
"""

# Raw文字列（エスケープ不要）
let path = r"C:\Users\John\Documents"
```

### 制御フロー

```nim
# if文
let score = 85

if score >= 90:
  echo "A"
elif score >= 80:
  echo "B"
elif score >= 70:
  echo "C"
else:
  echo "F"

# if式（値を返す）
let grade = if score >= 90: "A"
            elif score >= 80: "B"
            elif score >= 70: "C"
            else: "F"

# when: コンパイル時if
when defined(windows):
  echo "Running on Windows"
elif defined(linux):
  echo "Running on Linux"
elif defined(macosx):
  echo "Running on macOS"

# case文
let day = "Monday"

case day
of "Monday", "Tuesday", "Wednesday", "Thursday", "Friday":
  echo "Weekday"
of "Saturday", "Sunday":
  echo "Weekend"
else:
  echo "Unknown"
```

### ループ

```nim
# for文
for i in 1..5:
  echo i  # 1, 2, 3, 4, 5

# 配列のループ
let fruits = ["Apple", "Banana", "Orange"]
for fruit in fruits:
  echo fruit

# インデックス付きループ
for i, fruit in fruits:
  echo i, ": ", fruit

# while文
var count = 0
while count < 5:
  echo count
  count += 1

# break & continue
for i in 1..10:
  if i == 5:
    continue
  if i == 8:
    break
  echo i
```

## 関数

### 基本的な関数

```nim
# 関数定義
proc add(a: int, b: int): int =
  return a + b

# returnは省略可能（最後の式が返り値）
proc multiply(a: int, b: int): int =
  a * b

echo add(2, 3)       # 5
echo multiply(4, 5)  # 20
```

### デフォルト引数

```nim
proc greet(name: string, greeting: string = "Hello"): string =
  greeting & ", " & name & "!"

echo greet("Alice")              # Hello, Alice!
echo greet("Bob", "Hi")          # Hi, Bob!
```

### 可変長引数

```nim
proc sum(numbers: varargs[int]): int =
  result = 0
  for n in numbers:
    result += n

echo sum(1, 2, 3, 4, 5)  # 15
```

### ジェネリクス

```nim
# ジェネリック関数
proc swap[T](a, b: var T) =
  let temp = a
  a = b
  b = temp

var x = 10
var y = 20
swap(x, y)
echo x, ", ", y  # 20, 10

var s1 = "Hello"
var s2 = "World"
swap(s1, s2)
echo s1, ", ", s2  # World, Hello
```

## コレクション

### 配列

```nim
# 固定長配列
let arr: array[5, int] = [1, 2, 3, 4, 5]
echo arr[0]  # 1

# 配列のサイズ
echo arr.len  # 5

# 範囲外アクセスはコンパイルエラー
# echo arr[10]  # エラー
```

### シーケンス（動的配列）

```nim
# 空のシーケンス
var nums: seq[int] = @[]

# 要素の追加
nums.add(1)
nums.add(2)
nums.add(3)

echo nums  # @[1, 2, 3]

# 初期値付き
let fruits = @["Apple", "Banana", "Orange"]

# 要素の削除
var items = @[1, 2, 3, 4, 5]
items.delete(2)  # インデックス2を削除
echo items  # @[1, 2, 4, 5]
```

### テーブル（辞書）

```nim
import std/tables

# テーブルの作成
var ages = initTable[string, int]()
ages["Alice"] = 25
ages["Bob"] = 30

echo ages["Alice"]  # 25

# 初期値付き
let scores = {"Alice": 95, "Bob": 87, "Charlie": 92}.toTable

# キーの存在チェック
if "Alice" in scores:
  echo "Alice's score: ", scores["Alice"]

# すべてのキーと値
for name, score in scores:
  echo name, ": ", score
```

### セット

```nim
# セットの作成
let s1 = {1, 2, 3, 4, 5}
let s2 = {4, 5, 6, 7, 8}

# 和集合
echo s1 + s2  # {1, 2, 3, 4, 5, 6, 7, 8}

# 積集合
echo s1 * s2  # {4, 5}

# 差集合
echo s1 - s2  # {1, 2, 3}

# メンバーシップ
echo 3 in s1  # true
```

## オブジェクトとクラス

### オブジェクト

```nim
# オブジェクト定義
type
  Person = object
    name: string
    age: int

# インスタンス作成
let alice = Person(name: "Alice", age: 25)
echo alice.name  # Alice
echo alice.age   # 25

# 可変オブジェクト
var bob = Person(name: "Bob", age: 30)
bob.age = 31
```

### メソッド

```nim
type
  Rectangle = object
    width: float
    height: float

proc area(r: Rectangle): float =
  r.width * r.height

proc perimeter(r: Rectangle): float =
  2 * (r.width + r.height)

let rect = Rectangle(width: 10.0, height: 5.0)
echo rect.area()       # 50.0
echo rect.perimeter()  # 30.0
```

### 継承

```nim
type
  Animal = ref object of RootObj
    name: string

  Dog = ref object of Animal
    breed: string

  Cat = ref object of Animal
    color: string

method speak(a: Animal): string {.base.} =
  "..."

method speak(d: Dog): string =
  "Woof!"

method speak(c: Cat): string =
  "Meow!"

let dog = Dog(name: "Buddy", breed: "Golden Retriever")
let cat = Cat(name: "Whiskers", color: "Gray")

echo dog.speak()  # Woof!
echo cat.speak()  # Meow!
```

## 並行処理

### スレッド

```nim
import std/threadpool

proc task(id: int) =
  echo "Task ", id, " running"
  sleep(1000)
  echo "Task ", id, " done"

# スレッドプールで実行
spawn task(1)
spawn task(2)
spawn task(3)

# すべてのタスクが終わるまで待つ
sync()
```

### 非同期処理

```nim
import std/asyncdispatch
import std/httpclient

proc fetchUrl(url: string): Future[string] {.async.} =
  let client = newAsyncHttpClient()
  let response = await client.getContent(url)
  return response

proc main() {.async.} =
  let content = await fetchUrl("https://example.com")
  echo "Content length: ", content.len

waitFor main()
```

## 実践例

### HTTPサーバー

```nim
import std/asynchttpserver
import std/asyncdispatch

proc handleRequest(req: Request) {.async.} =
  case req.url.path
  of "/":
    await req.respond(Http200, "Hello, World!")
  of "/api/users":
    await req.respond(Http200, """{"users": ["Alice", "Bob"]}""",
                      newHttpHeaders([("Content-Type", "application/json")]))
  else:
    await req.respond(Http404, "Not Found")

proc main() {.async.} =
  let server = newAsyncHttpServer()
  echo "Server running on http://localhost:8080"
  await server.serve(Port(8080), handleRequest)

waitFor main()
```

### JSONパース

```nim
import std/json

let jsonStr = """
{
  "name": "Alice",
  "age": 25,
  "hobbies": ["reading", "coding", "music"]
}
"""

let data = parseJson(jsonStr)
echo data["name"].getStr()  # Alice
echo data["age"].getInt()   # 25

for hobby in data["hobbies"]:
  echo hobby.getStr()
```

### ファイル操作

```nim
import std/os

# ファイル書き込み
writeFile("test.txt", "Hello, Nim!")

# ファイル読み込み
let content = readFile("test.txt")
echo content

# 行ごとに読み込み
for line in lines("test.txt"):
  echo line

# ディレクトリ内のファイル一覧
for file in walkDir("."):
  echo file.path
```

### コマンドライン引数

```nim
import std/os

# すべての引数
echo "Arguments: ", commandLineParams()

# 引数の数
echo "Count: ", paramCount()

# 個別の引数
if paramCount() > 0:
  echo "First argument: ", paramStr(1)
```

## パッケージ管理

Nimは、`nimble`というパッケージマネージャーを使います。

### パッケージのインストール

```bash
nimble install jester  # Webフレームワーク
nimble install karax   # フロントエンドフレームワーク
nimble install nimpy   # Python連携
```

### プロジェクトの作成

```bash
nimble init myproject
cd myproject
```

これにより、以下のファイルが生成されます。

```
myproject/
├── myproject.nimble  # パッケージ設定
├── src/
│   └── myproject.nim
└── tests/
    └── test1.nim
```

### myproject.nimble

```nim
# Package

version       = "0.1.0"
author        = "Your Name"
description   = "My awesome project"
license       = "MIT"
srcDir        = "src"
bin           = @["myproject"]

# Dependencies

requires "nim >= 1.6.0"
requires "jester >= 0.5.0"
```

## まとめ

Nimは、Pythonのような読みやすさとC言語並みの高速性を兼ね備えた、非常に魅力的な言語です。

**メリット**

- Pythonライクな構文で学びやすい
- C/C++並みの高速性
- 小さなバイナリサイズ
- クロスプラットフォーム
- 強力なマクロシステム
- 柔軟なメモリ管理

**使い所**

- 高速なCLIツール
- Webサーバー・API
- ゲーム開発
- 組み込みシステム
- データ処理
- Pythonの代替（高速化したい場合）

**学習リソース**

- [公式ドキュメント](https://nim-lang.org/docs/tut1.html)
- [Nim by Example](https://nim-by-example.github.io/)
- [Nim for Python Programmers](https://github.com/nim-lang/Nim/wiki/Nim-for-Python-Programmers)

パフォーマンスを重視するプロジェクトや、Pythonからのステップアップを考えている方は、ぜひNimを試してみてください。