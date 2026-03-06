---
title: "V言語入門：シンプルで高速なシステムプログラミング言語完全ガイド"
description: "V言語の基本から実践まで、シンプルさと高速性を兼ね備えた次世代システムプログラミング言語を詳しく解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。初心者から実務レベルまで段階的に学べる内容です。"
pubDate: "2025-02-05"
tags: ['プログラミング', '開発ツール']
---

V言語（Vlang）は、シンプルさ、安全性、高速性を追求した新しいシステムプログラミング言語です。Go、Rust、Pythonの良いところを取り入れながら、より学びやすく、より高速なコンパイルを実現しています。

## V言語とは

V言語は2019年に登場した比較的新しい言語で、以下の特徴を持ちます。

### 主な特徴

- **シンプル**: 学習コストが低く、数時間でマスター可能
- **高速**: C並みのパフォーマンス、1秒未満のコンパイル時間
- **安全**: null、グローバル変数、未定義動作なし
- **メモリ安全**: 自動メモリ管理（ガベージコレクタ不要）
- **並行処理**: 軽量スレッド（coroutines）のネイティブサポート
- **クロスプラットフォーム**: Windows、macOS、Linux対応
- **小さなバイナリ**: 最小100KB程度の実行ファイル

## インストール

V言語のインストールは非常に簡単です。

### macOS/Linux

```bash
git clone https://github.com/vlang/v
cd v
make
sudo ./v symlink
```

### Windows

```powershell
git clone https://github.com/vlang/v
cd v
make.bat
.\v.exe symlink
```

### バージョン確認

```bash
v version
```

## Hello, World!

最もシンプルなVプログラムから始めましょう。

```v
// hello.v
fn main() {
    println('Hello, World!')
}
```

実行方法:

```bash
# 直接実行
v run hello.v

# コンパイルしてから実行
v hello.v
./hello
```

## 基本的な構文

### 変数宣言

Vでは、変数は不変（immutable）がデフォルトです。

```v
fn main() {
    // 不変変数
    name := 'Alice'
    age := 30

    // 型推論が働く
    is_active := true
    score := 95.5

    // 型を明示することも可能
    mut counter := 0  // 可変変数

    // 再代入（mutが必要）
    counter = counter + 1
    counter += 1

    println('Name: $name, Age: $age, Counter: $counter')
}
```

### データ型

Vは静的型付け言語です。

```v
fn main() {
    // 整数型
    i8_val := i8(127)      // 8ビット符号付き整数
    i16_val := i16(32767)  // 16ビット
    i32_val := 2147483647  // 32ビット（デフォルト）
    i64_val := i64(9223372036854775807)  // 64ビット

    // 符号なし整数
    u8_val := u8(255)
    u16_val := u16(65535)
    u32_val := u32(4294967295)
    u64_val := u64(18446744073709551615)

    // 浮動小数点数
    f32_val := f32(3.14)
    f64_val := 3.14159265359  // デフォルト

    // 真偽値
    is_valid := true

    // 文字列
    message := 'Hello, V!'
    multiline := '
        This is a
        multiline string
    '

    // 配列
    numbers := [1, 2, 3, 4, 5]

    // マップ
    ages := {
        'Alice': 30
        'Bob': 25
    }
}
```

### 文字列操作

Vの文字列は不変で、UTF-8をネイティブサポートします。

```v
fn main() {
    // 文字列補間
    name := 'Alice'
    age := 30
    message := 'My name is $name and I am $age years old'
    println(message)

    // 式も埋め込める
    println('Next year I will be ${age + 1} years old')

    // 文字列メソッド
    text := 'Hello, World!'
    println(text.to_upper())           // HELLO, WORLD!
    println(text.to_lower())           // hello, world!
    println(text.contains('World'))    // true
    println(text.starts_with('Hello')) // true
    println(text.replace('World', 'V')) // Hello, V!

    // 文字列の分割と結合
    words := text.split(',')
    println(words)  // ['Hello', ' World!']

    joined := words.join(' | ')
    println(joined)  // Hello | World!

    // 文字列の長さ
    println(text.len)  // 13
}
```

### 配列

Vの配列は型安全で、動的にサイズ変更できます。

```v
fn main() {
    // 配列の作成
    mut numbers := [1, 2, 3, 4, 5]

    // 要素へのアクセス
    println(numbers[0])  // 1
    println(numbers[1])  // 2

    // 要素の追加
    numbers << 6
    numbers << 7
    println(numbers)  // [1, 2, 3, 4, 5, 6, 7]

    // スライス
    slice := numbers[1..4]  // [2, 3, 4]
    println(slice)

    // 配列の長さ
    println(numbers.len)  // 7

    // イテレーション
    for i, num in numbers {
        println('Index $i: $num')
    }

    // フィルター
    evens := numbers.filter(it % 2 == 0)
    println(evens)  // [2, 4, 6]

    // マップ
    doubled := numbers.map(it * 2)
    println(doubled)  // [2, 4, 6, 8, 10, 12, 14]

    // 配列の合計
    sum := numbers.reduce(fn (acc int, x int) int {
        return acc + x
    }, 0)
    println('Sum: $sum')
}
```

### マップ

```v
fn main() {
    // マップの作成
    mut ages := map[string]int{}
    ages['Alice'] = 30
    ages['Bob'] = 25
    ages['Charlie'] = 35

    // または
    mut scores := {
        'Alice': 95
        'Bob': 87
        'Charlie': 92
    }

    // 値の取得
    println(ages['Alice'])  // 30

    // キーの存在確認
    if 'Alice' in ages {
        println('Alice is in the map')
    }

    // 全要素をイテレート
    for name, age in ages {
        println('$name is $age years old')
    }

    // キーの削除
    ages.delete('Bob')

    // マップのサイズ
    println(ages.len)
}
```

## 制御構造

### if文

```v
fn main() {
    age := 20

    // 基本的なif
    if age >= 18 {
        println('Adult')
    } else {
        println('Minor')
    }

    // if式（値を返す）
    status := if age >= 18 {
        'adult'
    } else {
        'minor'
    }
    println(status)

    // if is（型チェック）
    value := 'Hello'
    if value is string {
        println('It is a string')
    }
}
```

### match文

Vの`match`は、他言語の`switch`に相当しますが、より強力です。

```v
fn main() {
    // 基本的なmatch
    day := 3
    day_name := match day {
        1 { 'Monday' }
        2 { 'Tuesday' }
        3 { 'Wednesday' }
        4 { 'Thursday' }
        5 { 'Friday' }
        6, 7 { 'Weekend' }
        else { 'Invalid' }
    }
    println(day_name)

    // 範囲を使ったmatch
    score := 85
    grade := match score {
        90..100 { 'A' }
        80..89 { 'B' }
        70..79 { 'C' }
        60..69 { 'D' }
        else { 'F' }
    }
    println('Grade: $grade')
}
```

### ループ

```v
fn main() {
    // for: 範囲ループ
    for i in 0 .. 5 {
        println(i)  // 0, 1, 2, 3, 4
    }

    // for: 配列のイテレーション
    fruits := ['apple', 'banana', 'cherry']
    for fruit in fruits {
        println(fruit)
    }

    // for: インデックス付き
    for i, fruit in fruits {
        println('$i: $fruit')
    }

    // for: 条件付き（while相当）
    mut counter := 0
    for counter < 5 {
        println(counter)
        counter++
    }

    // for: 無限ループ
    mut x := 0
    for {
        x++
        if x > 10 {
            break
        }
        if x % 2 == 0 {
            continue
        }
        println(x)
    }
}
```

## 関数

```v
// 基本的な関数
fn add(a int, b int) int {
    return a + b
}

// 同じ型の引数は省略可能
fn multiply(a int, b int) int {
    return a * b
}

// 複数の返り値
fn divide(a int, b int) (int, int) {
    quotient := a / b
    remainder := a % b
    return quotient, remainder
}

// オプショナルな返り値
fn safe_divide(a int, b int) ?f64 {
    if b == 0 {
        return error('Division by zero')
    }
    return f64(a) / f64(b)
}

// 可変長引数
fn sum(nums ...int) int {
    mut total := 0
    for num in nums {
        total += num
    }
    return total
}

fn main() {
    println(add(5, 3))  // 8

    q, r := divide(17, 5)
    println('Quotient: $q, Remainder: $r')

    // オプショナルの処理
    result := safe_divide(10, 2) or {
        println('Error: $err')
        0.0
    }
    println(result)

    println(sum(1, 2, 3, 4, 5))  // 15
}
```

## 構造体

```v
struct Person {
    name string
    age  int
mut:
    email string  // 可変フィールド
}

// メソッド
fn (p Person) greet() string {
    return 'Hello, my name is $p.name'
}

fn (mut p Person) have_birthday() {
    p.age++
}

fn (mut p Person) update_email(new_email string) {
    p.email = new_email
}

fn main() {
    mut person := Person{
        name: 'Alice'
        age: 30
        email: 'alice@example.com'
    }

    println(person.greet())

    person.have_birthday()
    println('Age: $person.age')  // 31

    person.update_email('newalice@example.com')
    println('Email: $person.email')
}

// 構造体の埋め込み（継承のような機能）
struct Employee {
    Person
    employee_id string
    department  string
}

fn main() {
    employee := Employee{
        Person: Person{
            name: 'Bob'
            age: 28
            email: 'bob@company.com'
        }
        employee_id: 'E001'
        department: 'Engineering'
    }

    // 埋め込まれたフィールドに直接アクセス可能
    println(employee.name)  // Bob
    println(employee.greet())
}
```

## インターフェース

```v
interface Animal {
    name string
    speak() string
}

struct Dog {
    name string
}

fn (d Dog) speak() string {
    return 'Woof!'
}

struct Cat {
    name string
}

fn (c Cat) speak() string {
    return 'Meow!'
}

fn make_sound(animal Animal) {
    println('$animal.name says: ${animal.speak()}')
}

fn main() {
    dog := Dog{ name: 'Buddy' }
    cat := Cat{ name: 'Whiskers' }

    make_sound(dog)  // Buddy says: Woof!
    make_sound(cat)  // Whiskers says: Meow!
}
```

## エラーハンドリング

Vには例外がありません。代わりに、オプショナル型とリザルト型を使用します。

```v
import os

// オプショナル型を返す関数
fn read_file(path string) ?string {
    content := os.read_file(path) or {
        return error('Failed to read file: $path')
    }
    return content
}

// 複数のエラーを処理
fn process_data(filename string) ?[]int {
    content := read_file(filename)?

    lines := content.split('\n')
    mut numbers := []int{}

    for line in lines {
        num := line.int()
        numbers << num
    }

    return numbers
}

fn main() {
    // orブロックでエラー処理
    content := read_file('data.txt') or {
        println('Error: $err')
        return
    }
    println(content)

    // デフォルト値を指定
    backup_content := read_file('missing.txt') or { 'default content' }

    // エラーを伝播
    numbers := process_data('numbers.txt') or {
        eprintln('Failed to process: $err')
        return
    }
    println(numbers)
}
```

## 並行処理

Vは軽量スレッド（goroutines）をサポートしています。

```v
import time

fn task(id int) {
    for i in 0 .. 5 {
        println('Task $id: step $i')
        time.sleep(100 * time.millisecond)
    }
}

fn main() {
    // 並行実行
    spawn task(1)
    spawn task(2)
    spawn task(3)

    // メインスレッドが終了しないよう待機
    time.sleep(1 * time.second)
}

// チャネルを使った通信
fn worker(ch chan int) {
    for {
        num := <-ch or { break }
        println('Processing: $num')
        time.sleep(100 * time.millisecond)
    }
}

fn main() {
    ch := chan int{cap: 10}

    // ワーカーを起動
    spawn worker(ch)
    spawn worker(ch)

    // データを送信
    for i in 0 .. 10 {
        ch <- i
    }

    // チャネルを閉じる
    ch.close()

    time.sleep(2 * time.second)
}
```

## モジュールとパッケージ

```v
// mymath/mymath.v
module mymath

pub fn add(a int, b int) int {
    return a + b
}

pub fn multiply(a int, b int) int {
    return a * b
}

fn private_function() {
    // モジュール内でのみ使用可能
}
```

使用例:

```v
// main.v
import mymath

fn main() {
    println(mymath.add(5, 3))
    println(mymath.multiply(4, 7))
}
```

## 実践例: HTTPサーバー

```v
import vweb

struct App {
    vweb.Context
}

fn main() {
    vweb.run<App>(8080)
}

pub fn (mut app App) index() vweb.Result {
    return app.text('Hello, V Web!')
}

['/api/users/:id']
pub fn (mut app App) get_user() vweb.Result {
    id := app.params['id']
    return app.json('{"id": "$id", "name": "User $id"}')
}

[post; '/api/users']
pub fn (mut app App) create_user() vweb.Result {
    // リクエストボディを処理
    return app.json('{"status": "created"}')
}
```

## まとめ

V言語は、シンプルさと高速性を両立した魅力的なプログラミング言語です。学習コストが低く、C並みのパフォーマンスを発揮するため、システムプログラミングからWebアプリケーション開発まで幅広く活用できます。

まだ発展途上の言語ですが、活発なコミュニティと継続的な改善により、今後さらに成熟していくことが期待されます。
