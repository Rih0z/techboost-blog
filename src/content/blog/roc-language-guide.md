---
title: "Roc言語入門：関数型プログラミングの新しいアプローチ"
description: "Rocは高速で使いやすい関数型プログラミング言語。その独自の設計思想、基本的な文法、Rustやその他の言語との違いを詳しく解説します。"
pubDate: "2025-02-05"
---

プログラミング言語の世界では、常に新しい言語が登場していますが、その中でも特に注目を集めているのが **Roc（ロック）** です。Rocは、関数型プログラミングの利点を活かしながら、高速で使いやすいことを目指して開発されている新しい言語です。

本記事では、Rocの特徴、基本的な文法、他の言語との違い、そして実際の使い方について詳しく解説します。

## Rocとは

Rocは、Richard Feldman氏が中心となって開発している関数型プログラミング言語です。Elmの影響を強く受けながら、より汎用的で高速な言語を目指しています。

### 主な特徴

- **関数型プログラミング**: 純粋関数と不変性を基本とした設計
- **高速**: LLVMバックエンドによる最適化されたネイティブコード生成
- **型安全**: 強力な型システムによるコンパイル時のエラー検出
- **シンプルな文法**: 学習しやすく、読みやすいコード
- **ゼロコスト抽象化**: 高レベルの抽象化でもパフォーマンスを犠牲にしない
- **メモリ安全**: Rustのような所有権システムなしでメモリ安全を実現

## Rocのインストール

### macOS/Linux

```bash
# 最新版をダウンロード
curl -OL https://github.com/roc-lang/roc/releases/latest/download/roc_nightly-macos_apple_silicon.tar.gz

# 解凍
tar -xzf roc_nightly-macos_apple_silicon.tar.gz

# パスを通す
export PATH=$PATH:$(pwd)/roc_nightly-macos_apple_silicon

# 確認
roc version
```

### Windows

```powershell
# PowerShellで実行
Invoke-WebRequest -Uri https://github.com/roc-lang/roc/releases/latest/download/roc_nightly-windows.zip -OutFile roc.zip
Expand-Archive roc.zip -DestinationPath .
$env:PATH += ";$(pwd)\roc_nightly-windows"
roc version
```

## Hello, World!

まずは、Rocの基本的なプログラムを見てみましょう。

```roc
# hello.roc
app "hello"
    packages { pf: "https://github.com/roc-lang/basic-cli/releases/download/0.7.0/bkGby8jb0tmZYsy2hg1E_B2QrCgcSTxdUlHtETwm5m4.tar.br" }
    imports [pf.Stdout]
    provides [main] to pf

main =
    Stdout.line "Hello, World!"
```

実行:

```bash
roc run hello.roc
# 出力: Hello, World!
```

### プログラムの構造

- **app**: アプリケーション名を定義
- **packages**: 使用するパッケージを指定
- **imports**: インポートするモジュールを指定
- **provides**: このモジュールが提供する関数を指定
- **main**: エントリーポイント

## 基本的な文法

### 変数と束縛

Rocでは、すべての値が不変です。

```roc
# 変数の束縛
x = 42
name = "Alice"
isActive = Bool.true

# 複数の値を束縛
point = { x: 10, y: 20 }
```

### 関数

関数は純粋で、副作用を持ちません。

```roc
# 関数の定義
add : I64, I64 -> I64
add = \x, y -> x + y

# 使用例
result = add 10 20  # 30

# 複数行の関数
factorial : I64 -> I64
factorial = \n ->
    if n <= 1 then
        1
    else
        n * factorial (n - 1)
```

### 型システム

Rocは強力な型推論を持ちますが、型注釈も書けます。

```roc
# 数値型
age : I64
age = 30

temperature : F64
temperature = 36.5

# 文字列
name : Str
name = "Bob"

# ブール値
isValid : Bool
isValid = Bool.true

# リスト
numbers : List I64
numbers = [1, 2, 3, 4, 5]

# レコード（構造体）
person : { name : Str, age : I64 }
person = { name: "Charlie", age: 25 }
```

### パターンマッチング

```roc
# 数値のパターンマッチング
describe : I64 -> Str
describe = \n ->
    when n is
        0 -> "zero"
        1 -> "one"
        2 -> "two"
        _ -> "many"

# リストのパターンマッチング
sumList : List I64 -> I64
sumList = \list ->
    when list is
        [] -> 0
        [first, .. as rest] -> first + sumList rest

# レコードのパターンマッチング
greet : { name : Str, age : I64 } -> Str
greet = \person ->
    when person is
        { name: "Alice", age } -> "Hello Alice, you are \(Num.toStr age)"
        { name, age } -> "Hello \(name)"
```

### Result型（エラーハンドリング）

Rocでは、エラーを `Result` 型で表現します。

```roc
# Result型の定義
# Result ok err = Ok ok | Err err

divide : F64, F64 -> Result F64 [DivisionByZero]
divide = \a, b ->
    if b == 0.0 then
        Err DivisionByZero
    else
        Ok (a / b)

# Resultの使用
handleDivision : F64, F64 -> Str
handleDivision = \a, b ->
    when divide a b is
        Ok result -> "Result: \(Num.toStr result)"
        Err DivisionByZero -> "Error: Cannot divide by zero"
```

### リスト操作

```roc
# リストの作成
numbers = [1, 2, 3, 4, 5]

# map
doubled = List.map numbers \n -> n * 2
# [2, 4, 6, 8, 10]

# filter
evens = List.filter numbers \n -> n % 2 == 0
# [2, 4]

# reduce (fold)
sum = List.walk numbers 0 \acc, n -> acc + n
# 15

# リストの結合
combined = List.concat [1, 2] [3, 4]
# [1, 2, 3, 4]
```

## 実践例

### 1. FizzBuzz

```roc
app "fizzbuzz"
    packages { pf: "..." }
    imports [pf.Stdout]
    provides [main] to pf

fizzBuzz : I64 -> Str
fizzBuzz = \n ->
    when (n % 3, n % 5) is
        (0, 0) -> "FizzBuzz"
        (0, _) -> "Fizz"
        (_, 0) -> "Buzz"
        _ -> Num.toStr n

main =
    List.range { start: At 1, end: At 100 }
    |> List.map fizzBuzz
    |> Str.joinWith "\n"
    |> Stdout.line
```

### 2. ファイル読み込み

```roc
app "fileReader"
    packages { pf: "..." }
    imports [pf.Stdout, pf.File, pf.Path]
    provides [main] to pf

main =
    path = Path.fromStr "data.txt"

    when File.readUtf8 path is
        Ok content ->
            Stdout.line "File content: \(content)"

        Err _ ->
            Stdout.line "Error: Could not read file"
```

### 3. JSONパース

```roc
app "jsonParser"
    packages { pf: "...", json: "..." }
    imports [pf.Stdout, json.Core]
    provides [main] to pf

User : { name : Str, age : I64, email : Str }

parseUser : Str -> Result User [ParseError]
parseUser = \jsonStr ->
    Core.parseStr jsonStr
    |> Result.try \json ->
        name = Core.field "name" Core.string json
        age = Core.field "age" Core.i64 json
        email = Core.field "email" Core.string json

        when (name, age, email) is
            (Ok n, Ok a, Ok e) -> Ok { name: n, age: a, email: e }
            _ -> Err ParseError

main =
    jsonData = """{"name": "Alice", "age": 30, "email": "alice@example.com"}"""

    when parseUser jsonData is
        Ok user ->
            Stdout.line "User: \(user.name), Age: \(Num.toStr user.age)"

        Err _ ->
            Stdout.line "Error: Invalid JSON"
```

### 4. HTTPリクエスト

```roc
app "httpClient"
    packages { pf: "...", http: "..." }
    imports [pf.Stdout, http.Http]
    provides [main] to pf

fetchUser : I64 -> Task User [HttpError]
fetchUser = \userId ->
    url = "https://api.example.com/users/\(Num.toStr userId)"

    Http.get url
    |> Task.await \response ->
        when response.status is
            200 -> parseUser response.body
            _ -> Task.err HttpError

main =
    Task.attempt (fetchUser 1) \result ->
        when result is
            Ok user ->
                Stdout.line "User: \(user.name)"

            Err _ ->
                Stdout.line "Error: Could not fetch user"
```

## Rocの独自機能

### 1. Abilities（能力）

Abilitiesは、Rocの型クラスに相当する機能です。

```roc
# Abilityの定義
Hash has
    hash : a -> U64 where a has Hash

# 実装
hash : I64 -> U64 where I64 has Hash
hash = \n ->
    Num.toU64 (Num.abs n)

hash : Str -> U64 where Str has Hash
hash = \s ->
    # ハッシュ関数の実装
    ...
```

### 2. プラットフォーム

Rocでは、「プラットフォーム」という概念を使用して、異なる環境での実行をサポートします。

```roc
# CLIプラットフォームを使用
app "myApp"
    packages { pf: "basic-cli" }
    imports [pf.Stdout, pf.Stdin]
    provides [main] to pf

# Webプラットフォームを使用
app "myWebApp"
    packages { pf: "basic-webserver" }
    imports [pf.Http]
    provides [main] to pf
```

### 3. バックパッシング

Rocの独特な構文として、バックパッシング（`<-`）があります。

```roc
# バックパッシングなし
readAndPrint : Task {} [FileError, IoError]
readAndPrint =
    Task.await (File.readUtf8 "input.txt") \content ->
        Task.await (processContent content) \result ->
            Stdout.line result

# バックパッシングあり
readAndPrint : Task {} [FileError, IoError]
readAndPrint =
    content <- Task.await (File.readUtf8 "input.txt")
    result <- Task.await (processContent content)
    Stdout.line result
```

## RocとRustの比較

| 特徴 | Roc | Rust |
|------|-----|------|
| パラダイム | 関数型 | マルチパラダイム |
| メモリ管理 | 自動（GC不使用） | 所有権システム |
| 学習曲線 | 比較的緩やか | 急峻 |
| パフォーマンス | 高速 | 最高速 |
| 型システム | シンプルで強力 | 非常に強力 |
| エコシステム | 発展途上 | 成熟 |

### コード比較

**Rustの例**:

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    println!("Sum: {}", sum);
}
```

**Rocの例**:

```roc
main =
    numbers = [1, 2, 3, 4, 5]
    sum = List.walk numbers 0 \acc, n -> acc + n
    Stdout.line "Sum: \(Num.toStr sum)"
```

## Rocのエコシステム

### パッケージマネージャー

Rocは組み込みのパッケージマネージャーを持っています。

```roc
app "myApp"
    packages {
        pf: "https://github.com/roc-lang/basic-cli/releases/...",
        json: "https://github.com/lukewilliamboswell/roc-json/releases/...",
    }
    imports [pf.Stdout, json.Core]
    provides [main] to pf
```

### エディタサポート

- **VS Code**: Roc Language Server拡張機能
- **Vim/Neovim**: roc.vim プラグイン
- **Emacs**: roc-mode

## パフォーマンス

Rocは高速な実行速度を目指して設計されています。

### ベンチマーク例

```roc
# フィボナッチ数列（再帰版）
fibonacci : I64 -> I64
fibonacci = \n ->
    if n <= 1 then
        n
    else
        fibonacci (n - 1) + fibonacci (n - 2)

# フィボナッチ数列（最適化版）
fibonacciOptimized : I64 -> I64
fibonacciOptimized = \n ->
    fibHelper n 0 1

fibHelper : I64, I64, I64 -> I64
fibHelper = \n, a, b ->
    if n == 0 then
        a
    else
        fibHelper (n - 1) b (a + b)
```

## Rocの今後

Rocはまだ開発中の言語ですが、以下の機能が計画されています。

- **並行処理**: 軽量スレッドとアクターモデル
- **より豊富な標準ライブラリ**: ネットワーク、データベース、GUIなど
- **パッケージリポジトリ**: 公式パッケージレジストリ
- **安定版リリース**: 1.0リリースに向けた開発

## まとめ

Rocは、関数型プログラミングの利点を活かしながら、高速で使いやすい言語を目指しています。まだ開発段階ですが、独自の設計思想と強力な型システムにより、今後の発展が期待されます。

**Rocが適しているケース**:
- 関数型プログラミングを学びたい
- 高速なCLIツールやバックエンドサービスを構築したい
- シンプルで読みやすいコードを書きたい
- 新しい技術に挑戦したい

**現時点での課題**:
- エコシステムが未成熟
- ドキュメントが限定的
- 本番環境での使用にはまだ早い

Rocは今後の発展が非常に楽しみな言語です。興味がある方は、ぜひ試してみてください。

## 参考リンク

- [Roc公式サイト](https://www.roc-lang.org/)
- [Roc GitHub](https://github.com/roc-lang/roc)
- [Roc Tutorial](https://www.roc-lang.org/tutorial)
- [Roc Zulip Chat](https://roc.zulipchat.com/)
