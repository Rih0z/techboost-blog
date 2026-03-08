---
title: 'Rust完全ガイド2026：安全で高速なシステムプログラミング言語'
description: 'Rustの基本から応用まで完全解説。所有権・借用・ライフタイム・非同期処理・Axum Webフレームワーク・WebAssembly・エラーハンドリング・テストまで実践的に学ぶ。Rust・Systems Programming・Backendに関する実践情報。'
pubDate: '2026-02-20'
tags: ['Rust', 'Systems Programming', 'Backend', 'プログラミング']
heroImage: '../../assets/thumbnails/rust-programming-guide.jpg'
---
## はじめに

Rustは2015年にバージョン1.0がリリースされて以来、システムプログラミングの世界に革命をもたらし続けている言語だ。Stack Overflowの開発者調査では、2016年から9年連続で「最も愛されているプログラミング言語」の首位を維持している。2026年現在、LinuxカーネルへのRustコード採用、AndroidのHALレイヤへの導入、Windowsカーネルコンポーネントのリライトなど、システムソフトウェアの主要領域でRustは着実に存在感を高めている。

本記事では、Rustの基礎から実践的な応用まで徹底的に解説する。単なる文法の羅列ではなく、なぜそのように設計されているのかという理由とともに解説することで、Rustプログラマーとして真に力をつけることを目標とする。

---

## 1. Rustとは何か、なぜ注目されるのか

### 1.1 Rustが解決しようとした問題

1970年代にC言語が生まれて以来、システムプログラミングはC/C++が支配してきた。これらの言語はハードウェアに近い抽象化レベルで動作し、ガベージコレクタを持たないため高いパフォーマンスを発揮できる。しかし、その代償として手動メモリ管理に起因するバグが絶えず発生してきた。

セキュリティ研究者の調査によると、Microsoftの脆弱性の約70%、Androidのセキュリティバグの60-70%がメモリ安全性に関連するものだという。これらは主に以下のカテゴリに分類される。

- バッファオーバーフロー：配列の範囲外アクセスによるメモリ破壊
- ダングリングポインタ：解放済みメモリへのアクセス（use-after-free）
- 二重解放（double-free）：同じメモリ領域を二度freeする
- データ競合（data race）：複数スレッドが同期なしに同じメモリを読み書きする
- ヌルポインタ参照：nullポインタのデリファレンス

Rustはこれらのバグをコンパイル時に検出し、実行時オーバーヘッドなしに排除する言語として設計された。

### 1.2 Rustの三本柱

Rustの設計哲学は「安全性、速度、並行性」を同時に実現することだ。従来、この三つはトレードオフの関係にあった。

**安全性**

Rustの所有権システムとボローチェッカーは、コンパイル時にメモリ安全性を保証する。ガベージコレクタを使わずにメモリリークやダングリングポインタを防ぐことができる。

**速度**

ゼロコスト抽象化（zero-cost abstractions）の原則により、高レベルな抽象化を使っても実行時のオーバーヘッドが発生しない。C言語と同等かそれ以上のパフォーマンスを達成できる。

**並行性**

Rustの型システムはデータ競合をコンパイル時に防ぐ。「Fearless Concurrency（恐れを知らない並行性）」と呼ばれるこのアプローチにより、複数スレッドのプログラムを安全に書ける。

### 1.3 Rustの主要な用途

**システムソフトウェア**

OSカーネル、デバイスドライバ、組み込みシステム。LinuxカーネルはRustをC言語に次ぐ第二の実装言語として採用している。

**WebAssembly**

Rustはwasmへのコンパイルに特に適しており、ブラウザで動作する高性能コードを書くための主要言語になっている。figma、CloudflareのWorkers、fastlyのEdge Computingなど多くの商用製品で使われている。

**ネットワークサービス・WebAPI**

TokioとAxumを組み合わせることで、Node.jsやGoと同等の開発体験を持ちながら、より高いパフォーマンスと安全性を持つWebサービスを構築できる。

**CLIツール**

ripgrep、fd、bat、exa、zoxideなど、現代の高速なCLIツールの多くがRustで書かれている。

**ゲームエンジン**

Bevyゲームエンジンはデータ指向設計とECS（Entity Component System）アーキテクチャをRustで実装したもので、注目を集めている。

---

## 2. インストールとセットアップ

### 2.1 rustupによるインストール

Rustの公式ツールチェーン管理ツールはrustupだ。macOS、Linux、Windowsのすべてで同じ方法でインストールできる。

```bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# インストール後、設定を反映
source "$HOME/.cargo/env"

# インストール確認
rustc --version
cargo --version
rustup --version
```

Windowsでは公式サイト（https://rustup.rs）からインストーラをダウンロードして実行する。

### 2.2 ツールチェーンの管理

```bash
# stableチャンネルの更新
rustup update stable

# nightlyチャンネルのインストール（一部の実験的機能に必要）
rustup install nightly

# 特定のターゲットプラットフォームを追加
rustup target add wasm32-unknown-unknown
rustup target add aarch64-unknown-linux-gnu

# インストール済みツールチェーンの確認
rustup show
```

### 2.3 主要な開発ツール

```bash
# rustfmt: コードフォーマッタ
rustup component add rustfmt

# clippy: 高度なlinter
rustup component add clippy

# rust-analyzer: LSPサーバ（IDEサポート）
rustup component add rust-analyzer

# cargo-watch: ファイル変更時の自動ビルド
cargo install cargo-watch

# cargo-expand: マクロの展開を表示
cargo install cargo-expand

# cargo-audit: セキュリティ脆弱性チェック
cargo install cargo-audit

# cargo-nextest: 高速テストランナー
cargo install cargo-nextest
```

### 2.4 エディタ設定

VSCodeでRustを開発する場合、rust-analyzerエクステンションをインストールする。これだけで補完、型表示、エラー表示、リファクタリング支援などが使えるようになる。

`.vscode/settings.json`に以下を追加するとよい。

```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.inlayHints.parameterHints.enable": true,
  "rust-analyzer.inlayHints.typeHints.enable": true,
  "[rust]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

### 2.5 最初のプロジェクト作成

```bash
# 新規プロジェクトの作成
cargo new hello_rust
cd hello_rust

# プロジェクト構造
# hello_rust/
# ├── Cargo.toml     # プロジェクトメタデータと依存関係
# └── src/
#     └── main.rs    # エントリポイント

# ビルドして実行
cargo run

# リリースビルド（最適化あり）
cargo build --release
./target/release/hello_rust
```

`Cargo.toml`の基本的な構造：

```toml
[package]
name = "hello_rust"
version = "0.1.0"
edition = "2021"

[dependencies]
# ここに依存クレートを追加する

[dev-dependencies]
# テスト専用の依存クレート

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
```

---

## 3. 基本文法

### 3.1 変数と不変性

Rustでは変数はデフォルトで不変（immutable）だ。これは偶発的な値の変更を防ぐための設計だ。

```rust
fn main() {
    // 不変変数
    let x = 5;
    // x = 6; // コンパイルエラー: cannot assign twice to immutable variable

    // 可変変数
    let mut y = 5;
    y = 6; // OK
    println!("y = {y}");

    // シャドーイング: 同名の変数を再宣言できる
    let z = 5;
    let z = z + 1;        // 新しいzを作成（型も変えられる）
    let z = z * 2;
    println!("z = {z}"); // 12

    // 定数: 型注釈必須、コンパイル時に評価される
    const MAX_POINTS: u32 = 100_000;
    println!("MAX_POINTS = {MAX_POINTS}");
}
```

### 3.2 データ型

Rustは静的型付け言語だ。型推論があるので多くの場合は型を明示しなくてよいが、コンパイラが推論できない場合は明示が必要だ。

```rust
fn main() {
    // 整数型
    let a: i8  = -128;          // 8bit符号付き
    let b: u8  = 255;           // 8bit符号なし
    let c: i16 = -32768;
    let d: u16 = 65535;
    let e: i32 = -2_147_483_648; // デフォルトの整数型
    let f: u32 = 4_294_967_295;
    let g: i64 = -9_223_372_036_854_775_808;
    let h: u64 = 18_446_744_073_709_551_615;
    let i: i128 = 0;            // 128bit（暗号処理などに使う）
    let j: isize = 0;           // アーキテクチャ依存（ポインタサイズ）
    let k: usize = 0;           // コレクションのインデックスに使う

    // 数値リテラルの書き方
    let decimal     = 98_222;
    let hex         = 0xff;
    let octal       = 0o77;
    let binary      = 0b1111_0000;
    let byte: u8    = b'A'; // バイトリテラル（u8のみ）

    // 浮動小数点型
    let x: f64 = 2.0;  // デフォルト（64bit）
    let y: f32 = 3.0;  // 32bit

    // 算術演算
    let sum = 5 + 10;
    let difference = 95.5 - 4.3;
    let product = 4 * 30;
    let quotient = 56.7 / 32.2;
    let remainder = 43 % 5;

    // 真偽値
    let t: bool = true;
    let f: bool = false;

    // 文字型（Unicodeスカラー値、4バイト）
    let c1 = 'z';
    let c2 = 'ℤ';
    let c3 = '😻'; // 絵文字もchar型で扱える

    // タプル型
    let tup: (i32, f64, u8) = (500, 6.4, 1);
    let (x, y, z) = tup; // デストラクチャリング
    println!("y = {y}");
    let five_hundred = tup.0; // インデックスアクセス

    // 配列型（固定長、スタック上に確保）
    let arr: [i32; 5] = [1, 2, 3, 4, 5];
    let first = arr[0];
    let length = arr.len();

    // 同じ値で初期化
    let zeros = [0; 10]; // [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}
```

### 3.3 文字列型

Rustには2種類の主要な文字列型がある。

```rust
fn main() {
    // &str: 文字列スライス（不変の文字列参照）
    let s1: &str = "Hello, world!"; // 文字列リテラルは&str

    // String: ヒープ上の可変文字列
    let s2: String = String::from("Hello");
    let s3 = "world".to_string();
    let s4 = String::new(); // 空の文字列

    // 文字列の結合
    let s5 = s2 + ", " + &s3; // s2のオーナーシップが移動することに注意
    let s6 = format!("{s1} and more"); // formatは所有権を移動しない

    // 文字列のメソッド
    let hello = String::from("Hello, World!");
    println!("長さ: {}", hello.len());        // バイト数
    println!("空?: {}", hello.is_empty());
    println!("含む?: {}", hello.contains("World"));
    println!("大文字: {}", hello.to_uppercase());
    println!("置換: {}", hello.replace("World", "Rust"));

    // 文字列のイテレーション
    for c in "hello".chars() {
        print!("{c} ");
    }
    println!();

    for b in "hello".bytes() {
        print!("{b} ");
    }
    println!();

    // 文字列の分割
    let csv = "a,b,c,d";
    let parts: Vec<&str> = csv.split(',').collect();
    println!("{:?}", parts); // ["a", "b", "c", "d"]

    // トリム
    let padded = "  hello  ";
    println!("'{}'", padded.trim());

    // 文字列スライス（インデックスはバイト境界でないとパニック）
    let hello = "Hello";
    let h = &hello[0..1]; // "H"
}
```

### 3.4 制御フロー

```rust
fn main() {
    // if式（式なので値を返せる）
    let number = 7;
    if number < 5 {
        println!("5未満");
    } else if number < 10 {
        println!("5以上10未満");
    } else {
        println!("10以上");
    }

    // if式で値を返す
    let condition = true;
    let x = if condition { 5 } else { 6 };
    println!("x = {x}");

    // loop: 無限ループ
    let mut counter = 0;
    let result = loop {
        counter += 1;
        if counter == 10 {
            break counter * 2; // loopも値を返せる
        }
    };
    println!("result = {result}"); // 20

    // ループラベル（ネストしたループからのbreak）
    'outer: for i in 0..5 {
        for j in 0..5 {
            if i + j > 5 {
                break 'outer;
            }
            println!("({i}, {j})");
        }
    }

    // while
    let mut n = 3;
    while n != 0 {
        println!("{n}!");
        n -= 1;
    }

    // for: イテレータを使ったループ（最も一般的）
    let arr = [10, 20, 30, 40, 50];
    for element in arr {
        println!("{element}");
    }

    // レンジ
    for i in 0..5 {    // 0, 1, 2, 3, 4
        print!("{i} ");
    }
    for i in 0..=5 {   // 0, 1, 2, 3, 4, 5
        print!("{i} ");
    }

    // enumerate: インデックスと値を同時に
    for (i, v) in arr.iter().enumerate() {
        println!("arr[{i}] = {v}");
    }
}
```

### 3.5 関数

```rust
// 関数は引数の型と戻り値の型を明示する
fn add(a: i32, b: i32) -> i32 {
    a + b // セミコロンなしの式が戻り値
}

// 複数の値を返す（タプルを使う）
fn min_max(numbers: &[i32]) -> (i32, i32) {
    let min = *numbers.iter().min().unwrap();
    let max = *numbers.iter().max().unwrap();
    (min, max)
}

// 戻り値なしの関数（unit型 ()を返す）
fn greet(name: &str) {
    println!("Hello, {name}!");
}

// クロージャ（無名関数）
fn apply<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(x)
}

fn main() {
    println!("{}", add(3, 5));

    let (min, max) = min_max(&[3, 1, 4, 1, 5, 9, 2, 6]);
    println!("min={min}, max={max}");

    // クロージャの使用
    let double = |x| x * 2;
    let triple = |x| x * 3;
    println!("{}", apply(double, 5)); // 10
    println!("{}", apply(triple, 5)); // 15

    // 外部変数をキャプチャするクロージャ
    let factor = 4;
    let multiply = |x| x * factor;
    println!("{}", multiply(5)); // 20

    // イテレータメソッドとクロージャ
    let numbers = vec![1, 2, 3, 4, 5];
    let doubled: Vec<i32> = numbers.iter().map(|&x| x * 2).collect();
    let evens: Vec<&i32> = numbers.iter().filter(|&&x| x % 2 == 0).collect();
    let sum: i32 = numbers.iter().sum();
    println!("doubled: {doubled:?}");
    println!("evens: {evens:?}");
    println!("sum: {sum}");
}
```

---

## 4. 所有権システム

所有権（Ownership）はRustの最も独自性の高い機能であり、ガベージコレクタなしにメモリ安全性を保証する仕組みだ。

### 4.1 所有権の三つのルール

1. Rustの各値は「オーナー（所有者）」と呼ばれる変数を持つ
2. オーナーは一度に一つしか存在できない
3. オーナーがスコープを外れると、値は自動的に破棄される（`drop`が呼ばれる）

```rust
fn main() {
    // スコープと所有権
    {
        let s = String::from("hello"); // sはここから有効
        println!("{s}");
    } // sのスコープが終わり、dropが呼ばれる（メモリが解放される）
    // println!("{s}"); // コンパイルエラー: sはもう有効でない
}
```

### 4.2 Moveセマンティクス

```rust
fn main() {
    // プリミティブ型はCopyトレイトを実装しているため、代入でコピーされる
    let x = 5;
    let y = x; // xはまだ有効
    println!("x={x}, y={y}");

    // Stringはヒープに確保されるため、代入でMoveが発生する
    let s1 = String::from("hello");
    let s2 = s1; // s1のオーナーシップがs2に移動（Move）
    // println!("{s1}"); // コンパイルエラー: s1は無効化されている
    println!("{s2}");

    // 関数呼び出しもMoveを引き起こす
    let s3 = String::from("world");
    takes_ownership(s3); // s3のオーナーシップが関数に移動
    // println!("{s3}"); // コンパイルエラー

    // 関数から所有権を返すこともできる
    let s4 = gives_ownership();
    println!("{s4}");
}

fn takes_ownership(s: String) {
    println!("受け取った: {s}");
    // sはここでdropされる
}

fn gives_ownership() -> String {
    let s = String::from("返す文字列");
    s // sのオーナーシップを呼び出し元に返す
}
```

### 4.3 CloneとCopy

```rust
fn main() {
    // Clone: ヒープデータを深くコピーする（明示的）
    let s1 = String::from("hello");
    let s2 = s1.clone(); // ヒープデータを含めてコピー
    println!("s1={s1}, s2={s2}"); // 両方有効

    // Copyトレイトを実装する型（スタック上の型）
    // i32, f64, bool, char, タプル（全要素がCopyの場合）
    let x = 5;
    let y = x; // Copyが起きる（xも有効）
    println!("x={x}, y={y}");

    // カスタム型にCopyトレイトを実装
    #[derive(Debug, Clone, Copy)]
    struct Point {
        x: f64,
        y: f64,
    }

    let p1 = Point { x: 1.0, y: 2.0 };
    let p2 = p1; // Copyが起きる
    println!("p1={p1:?}, p2={p2:?}"); // 両方有効
}
```

---

## 5. 借用と参照

毎回所有権を移動させると不便なため、Rustは「借用（borrowing）」という概念を提供している。

### 5.1 不変参照

```rust
fn main() {
    let s = String::from("hello");

    // 参照を渡す（借用）
    let len = calculate_length(&s);
    println!("'{s}'の長さは{len}");
    // sはまだ有効

    // 複数の不変参照を同時に持てる
    let r1 = &s;
    let r2 = &s;
    let r3 = &s;
    println!("{r1}, {r2}, {r3}"); // 全て有効
}

fn calculate_length(s: &String) -> usize {
    s.len()
    // sは参照なのでここでdropされない
}
```

### 5.2 可変参照

```rust
fn main() {
    let mut s = String::from("hello");

    // 可変参照は一度に一つだけ
    change(&mut s);
    println!("{s}");

    // 可変参照が存在する間、他の参照は作れない
    let r1 = &mut s;
    // let r2 = &mut s; // コンパイルエラー: cannot borrow `s` as mutable more than once
    println!("{r1}");

    // r1のスコープが終わった後なら新しい可変参照を作れる
    let r2 = &mut s;
    println!("{r2}");
}

fn change(s: &mut String) {
    s.push_str(", world");
}
```

### 5.3 借用のルール（まとめ）

```rust
fn borrowing_rules() {
    let mut data = String::from("hello");

    // ルール1: 不変参照は同時に複数持てる
    {
        let r1 = &data;
        let r2 = &data;
        println!("{r1} {r2}"); // OK
    }

    // ルール2: 可変参照は同時に一つだけ
    {
        let r_mut = &mut data;
        r_mut.push_str(" world");
        // let another = &mut data; // エラー
        println!("{r_mut}");
    }

    // ルール3: 不変参照と可変参照を同時に持てない
    {
        let r1 = &data;
        // let r_mut = &mut data; // エラー: r1が有効な間は不可
        println!("{r1}");
    }
    // r1のスコープが終わった後なら可変参照を作れる
    let r_mut = &mut data;
    println!("{r_mut}");
}
```

### 5.4 ライフタイム

ライフタイムはRustの型システムの中で最も概念的に難しい部分だ。コンパイラがダングリング参照を検出できるように、参照の有効期間を明示する仕組みだ。

```rust
// ライフタイム注釈なし（コンパイラがエラーを出す）
// fn longest(x: &str, y: &str) -> &str {
//     if x.len() > y.len() { x } else { y }
// }

// ライフタイム注釈あり
// 'aは「xとyの両方が少なくともこのライフタイムの間有効」を意味する
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

// 構造体に参照を持たせる場合もライフタイムが必要
struct Important<'a> {
    content: &'a str,
}

impl<'a> Important<'a> {
    fn announce(&self) -> &str {
        self.content
    }
}

fn main() {
    let s1 = String::from("long string is long");
    let result;
    {
        let s2 = String::from("xyz");
        result = longest(&s1, &s2);
        println!("最長の文字列: {result}");
        // s2のスコープが終わる前にresultを使う
    }

    let novel = String::from("一度の失敗で立ち止まるな。始まりの一文。");
    let first_sentence = novel.split('。').next().expect("文がない");
    let imp = Important { content: first_sentence };
    println!("{}", imp.announce());
}
```

### 5.5 スライス

スライスはコレクションの一部への参照だ。

```rust
fn main() {
    let s = String::from("hello world");

    // 文字列スライス
    let hello = &s[0..5];   // "hello"
    let world = &s[6..11];  // "world"
    let whole = &s[..];     // 全体

    // 最初の単語を返す関数
    let word = first_word(&s);
    println!("最初の単語: {word}");

    // 配列スライス
    let arr = [1, 2, 3, 4, 5];
    let slice: &[i32] = &arr[1..4]; // [2, 3, 4]
    println!("{slice:?}");
}

fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();
    for (i, &byte) in bytes.iter().enumerate() {
        if byte == b' ' {
            return &s[0..i];
        }
    }
    &s[..]
}
```

---

## 6. 構造体・Enum・パターンマッチング

### 6.1 構造体

```rust
// 通常の構造体
#[derive(Debug, Clone)]
struct User {
    username: String,
    email: String,
    age: u32,
    active: bool,
}

impl User {
    // 関連関数（コンストラクタ）
    fn new(username: String, email: String, age: u32) -> Self {
        User {
            username,
            email,
            age,
            active: true,
        }
    }

    // メソッド
    fn greet(&self) -> String {
        format!("こんにちは、{}です！", self.username)
    }

    fn deactivate(&mut self) {
        self.active = false;
    }

    fn into_email(self) -> String {
        self.email // selfのオーナーシップを消費
    }
}

// タプル構造体
#[derive(Debug)]
struct Color(u8, u8, u8);

struct Point(f64, f64, f64);

// ユニット構造体（フィールドなし）
struct AlwaysEqual;

fn main() {
    let mut user1 = User::new(
        String::from("alice"),
        String::from("alice@example.com"),
        30,
    );
    println!("{}", user1.greet());
    println!("{user1:?}");

    // フィールド初期化省略記法
    let username = String::from("bob");
    let email = String::from("bob@example.com");
    let user2 = User {
        username,
        email,
        age: 25,
        active: true,
    };

    // 構造体更新構文
    let user3 = User {
        email: String::from("carol@example.com"),
        age: 28,
        ..user2 // user2の残りのフィールドを使う（Moveが起きる）
    };
    println!("{user3:?}");

    let red = Color(255, 0, 0);
    println!("赤: ({}, {}, {})", red.0, red.1, red.2);

    user1.deactivate();
    println!("active: {}", user1.active);
}
```

### 6.2 Enum（列挙型）

RustのEnumはC言語のenumよりはるかに強力で、各バリアントがデータを持てる。

```rust
// 基本的なEnum
#[derive(Debug)]
enum Direction {
    North,
    South,
    East,
    West,
}

// データを持つEnum
#[derive(Debug)]
enum Shape {
    Circle { radius: f64 },
    Rectangle { width: f64, height: f64 },
    Triangle { base: f64, height: f64 },
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle { radius } => std::f64::consts::PI * radius * radius,
            Shape::Rectangle { width, height } => width * height,
            Shape::Triangle { base, height } => 0.5 * base * height,
        }
    }
}

// 標準ライブラリのOption<T>
// enum Option<T> {
//     Some(T),
//     None,
// }

fn divide(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 {
        None
    } else {
        Some(a / b)
    }
}

fn main() {
    let dir = Direction::North;
    println!("{dir:?}");

    let circle = Shape::Circle { radius: 5.0 };
    let rect = Shape::Rectangle { width: 3.0, height: 4.0 };
    println!("円の面積: {:.2}", circle.area());
    println!("長方形の面積: {:.2}", rect.area());

    // Option
    match divide(10.0, 3.0) {
        Some(result) => println!("結果: {result:.4}"),
        None => println!("0除算"),
    }

    // if let（一パターンだけマッチする場合に便利）
    if let Some(result) = divide(10.0, 2.0) {
        println!("10 / 2 = {result}");
    }

    // while let
    let mut stack = vec![1, 2, 3];
    while let Some(top) = stack.pop() {
        println!("{top}");
    }

    // unwrap_or, unwrap_or_else
    let result = divide(10.0, 0.0).unwrap_or(f64::INFINITY);
    println!("フォールバック: {result}");

    let result = divide(10.0, 0.0).unwrap_or_else(|| {
        println!("計算できませんでした");
        0.0
    });
}
```

### 6.3 パターンマッチング

matchはRustの強力な制御フロー構文だ。

```rust
fn main() {
    // 基本的なmatch
    let x = 5;
    let description = match x {
        1 => "one",
        2 | 3 => "two or three",
        4..=6 => "four through six",
        _ => "something else",
    };
    println!("{description}");

    // タプルのマッチング
    let pair = (true, 42);
    match pair {
        (true, n) if n > 0 => println!("正の数: {n}"),
        (true, n) => println!("非正の数: {n}"),
        (false, _) => println!("falseの場合"),
    }

    // 構造体のデストラクチャリング
    struct Point { x: i32, y: i32 }
    let p = Point { x: 3, y: -5 };
    let Point { x, y } = p;
    println!("x={x}, y={y}");

    // Enumのマッチング
    #[derive(Debug)]
    enum Message {
        Quit,
        Move { x: i32, y: i32 },
        Write(String),
        ChangeColor(u8, u8, u8),
    }

    let msg = Message::ChangeColor(100, 200, 50);
    match msg {
        Message::Quit => println!("終了"),
        Message::Move { x, y } => println!("移動: ({x}, {y})"),
        Message::Write(text) => println!("書込み: {text}"),
        Message::ChangeColor(r, g, b) => println!("色変更: rgb({r}, {g}, {b})"),
    }

    // ガード条件
    let num = Some(4);
    match num {
        Some(n) if n < 0 => println!("負の値: {n}"),
        Some(n) => println!("正の値: {n}"),
        None => println!("値なし"),
    }

    // @バインディング
    let n = 7;
    match n {
        x @ 1..=12 => println!("{x}は1から12の範囲"),
        _ => println!("範囲外"),
    }
}
```

---

## 7. エラーハンドリング

Rustはexceptionを使わない。代わりに、エラーは`Result<T, E>`型として値として扱われる。

### 7.1 Result型

```rust
use std::fs::File;
use std::io::{self, Read};
use std::num::ParseIntError;

// Result型の基本
fn read_file(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?; // ?演算子でエラーを早期リターン
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

// カスタムエラー型
#[derive(Debug)]
enum AppError {
    IoError(io::Error),
    ParseError(ParseIntError),
    ValidationError(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::IoError(e) => write!(f, "IOエラー: {e}"),
            AppError::ParseError(e) => write!(f, "パースエラー: {e}"),
            AppError::ValidationError(msg) => write!(f, "バリデーションエラー: {msg}"),
        }
    }
}

impl std::error::Error for AppError {}

// Fromトレイトで自動変換を実装
impl From<io::Error> for AppError {
    fn from(e: io::Error) -> Self {
        AppError::IoError(e)
    }
}

impl From<ParseIntError> for AppError {
    fn from(e: ParseIntError) -> Self {
        AppError::ParseError(e)
    }
}

fn parse_and_validate(s: &str) -> Result<u32, AppError> {
    let n: i32 = s.trim().parse()?; // ParseIntError -> AppError（From自動適用）
    if n < 0 {
        return Err(AppError::ValidationError(format!("{n}は負の数です")));
    }
    Ok(n as u32)
}

fn main() {
    // match でエラーハンドリング
    match read_file("config.txt") {
        Ok(contents) => println!("ファイル内容: {contents}"),
        Err(e) => eprintln!("エラー: {e}"),
    }

    // unwrap（エラー時にパニック。テスト以外では避ける）
    // let contents = read_file("config.txt").unwrap();

    // expect（カスタムパニックメッセージ）
    // let contents = read_file("config.txt").expect("config.txtを読み込めませんでした");

    // unwrap_or（デフォルト値）
    let contents = read_file("config.txt").unwrap_or_default();

    // map, and_then（チェーン）
    let result = "42"
        .parse::<i32>()
        .map(|n| n * 2)
        .and_then(|n| if n > 0 { Ok(n) } else { Err("0以下".parse::<i32>().unwrap_err()) });

    // Resultの配列処理
    let numbers = vec!["1", "2", "abc", "4"];
    let parsed: Vec<Result<i32, _>> = numbers.iter()
        .map(|s| s.parse::<i32>())
        .collect();

    // 全成功の場合のみOk、一つでもErrがあればErr
    let all_parsed: Result<Vec<i32>, _> = vec!["1", "2", "3"]
        .iter()
        .map(|s| s.parse::<i32>())
        .collect();
    println!("{all_parsed:?}"); // Ok([1, 2, 3])

    // カスタムエラーのテスト
    match parse_and_validate("42") {
        Ok(n) => println!("有効な値: {n}"),
        Err(e) => println!("エラー: {e}"),
    }

    match parse_and_validate("-5") {
        Ok(n) => println!("有効な値: {n}"),
        Err(e) => println!("エラー: {e}"),
    }
}
```

### 7.2 thiserrorとanyhow

実務では`thiserror`と`anyhow`クレートが広く使われる。

```toml
[dependencies]
thiserror = "1"
anyhow = "1"
```

```rust
use thiserror::Error;
use anyhow::{Context, Result};

// thiserror: ライブラリ用カスタムエラー
#[derive(Error, Debug)]
enum DatabaseError {
    #[error("接続エラー: {0}")]
    ConnectionFailed(String),

    #[error("クエリエラー: {query} - {source}")]
    QueryFailed {
        query: String,
        #[source]
        source: std::io::Error,
    },

    #[error("レコードが見つからない: id={id}")]
    NotFound { id: u64 },
}

// anyhow: アプリケーション用エラーハンドリング
fn load_config() -> Result<String> {
    let content = std::fs::read_to_string("app.config")
        .context("設定ファイルの読み込みに失敗しました")?;
    Ok(content)
}

fn process_data() -> Result<Vec<u32>> {
    let config = load_config()
        .context("データ処理の初期化に失敗しました")?;

    // anyhowのbail!マクロで早期リターン
    if config.is_empty() {
        anyhow::bail!("設定ファイルが空です");
    }

    // anyhowのensure!マクロ（条件チェック）
    let line_count = config.lines().count();
    anyhow::ensure!(line_count > 0, "少なくとも1行必要です");

    Ok(vec![1, 2, 3])
}
```

---

## 8. ジェネリクスとトレイト

### 8.1 ジェネリクス

```rust
// ジェネリック関数
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

// ジェネリック構造体
#[derive(Debug)]
struct Pair<T> {
    first: T,
    second: T,
}

impl<T> Pair<T> {
    fn new(first: T, second: T) -> Self {
        Self { first, second }
    }
}

// T: Display + PartialOrdの場合のみcmp_displayを実装
impl<T: std::fmt::Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) {
        if self.first >= self.second {
            println!("最大値は first = {}", self.first);
        } else {
            println!("最大値は second = {}", self.second);
        }
    }
}

fn main() {
    let numbers = vec![34, 50, 25, 100, 65];
    println!("最大値: {}", largest(&numbers));

    let chars = vec!['y', 'm', 'a', 'q'];
    println!("最大値: {}", largest(&chars));

    let pair = Pair::new(5, 10);
    pair.cmp_display();
}
```

### 8.2 トレイト

トレイトはRustにおけるインターフェースの仕組みだ。

```rust
// トレイト定義
trait Animal {
    fn name(&self) -> &str;
    fn sound(&self) -> String;

    // デフォルト実装
    fn introduce(&self) -> String {
        format!("私は{}。{}と鳴きます。", self.name(), self.sound())
    }
}

struct Dog {
    name: String,
}

struct Cat {
    name: String,
}

impl Animal for Dog {
    fn name(&self) -> &str {
        &self.name
    }

    fn sound(&self) -> String {
        String::from("ワン")
    }
}

impl Animal for Cat {
    fn name(&self) -> &str {
        &self.name
    }

    fn sound(&self) -> String {
        String::from("ニャー")
    }
}

// トレイト境界（impl Trait構文）
fn make_noise(animal: &impl Animal) {
    println!("{}", animal.introduce());
}

// where句（複雑な境界の場合に読みやすい）
fn print_info<T>(item: T)
where
    T: std::fmt::Debug + std::fmt::Display,
{
    println!("Debug: {item:?}");
    println!("Display: {item}");
}

// トレイトオブジェクト（動的ディスパッチ）
fn make_all_noise(animals: &[Box<dyn Animal>]) {
    for animal in animals {
        println!("{}", animal.introduce());
    }
}

// 標準的なトレイトの実装
#[derive(Debug, Clone, PartialEq)]
struct Matrix {
    data: [[f64; 2]; 2],
}

impl std::fmt::Display for Matrix {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "[{} {}]\n[{} {}]",
            self.data[0][0], self.data[0][1],
            self.data[1][0], self.data[1][1]
        )
    }
}

impl std::ops::Add for Matrix {
    type Output = Matrix;

    fn add(self, other: Matrix) -> Matrix {
        Matrix {
            data: [
                [
                    self.data[0][0] + other.data[0][0],
                    self.data[0][1] + other.data[0][1],
                ],
                [
                    self.data[1][0] + other.data[1][0],
                    self.data[1][1] + other.data[1][1],
                ],
            ],
        }
    }
}

fn main() {
    let dog = Dog { name: String::from("ポチ") };
    let cat = Cat { name: String::from("タマ") };

    make_noise(&dog);
    make_noise(&cat);

    let animals: Vec<Box<dyn Animal>> = vec![
        Box::new(Dog { name: String::from("ハチ") }),
        Box::new(Cat { name: String::from("クロ") }),
    ];
    make_all_noise(&animals);

    let m1 = Matrix { data: [[1.0, 2.0], [3.0, 4.0]] };
    let m2 = Matrix { data: [[5.0, 6.0], [7.0, 8.0]] };
    println!("{}", m1 + m2);
}
```

### 8.3 イテレータトレイト

```rust
// カスタムイテレータの実装
struct Counter {
    count: u32,
    max: u32,
}

impl Counter {
    fn new(max: u32) -> Counter {
        Counter { count: 0, max }
    }
}

impl Iterator for Counter {
    type Item = u32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.count < self.max {
            self.count += 1;
            Some(self.count)
        } else {
            None
        }
    }
}

fn main() {
    // カスタムイテレータを使用
    let counter = Counter::new(5);
    let sum: u32 = counter.sum();
    println!("合計: {sum}"); // 15

    // イテレータメソッドの連鎖
    let result: u32 = Counter::new(5)
        .zip(Counter::new(5).skip(1))
        .map(|(a, b)| a * b)
        .filter(|x| x % 3 == 0)
        .sum();
    println!("結果: {result}");

    // 実用的なイテレータ操作
    let words = vec!["hello", "world", "rust", "programming"];

    // flat_map
    let chars: Vec<char> = words.iter()
        .flat_map(|s| s.chars())
        .collect();
    println!("文字数: {}", chars.len());

    // fold
    let concatenated = words.iter()
        .fold(String::new(), |mut acc, s| {
            if !acc.is_empty() { acc.push(' '); }
            acc.push_str(s);
            acc
        });
    println!("{concatenated}");

    // take, skip, step_by
    let stepped: Vec<i32> = (0..20).step_by(3).take(5).collect();
    println!("{stepped:?}"); // [0, 3, 6, 9, 12]

    // scan（状態を持ちながらイテレート）
    let running_sum: Vec<i32> = (1..=5)
        .scan(0, |state, x| {
            *state += x;
            Some(*state)
        })
        .collect();
    println!("累積和: {running_sum:?}"); // [1, 3, 6, 10, 15]
}
```

---

## 9. 非同期プログラミング（async/await・Tokio）

### 9.1 非同期の基礎

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

```rust
use tokio::time::{sleep, Duration};

// async関数はFutureを返す
async fn fetch_data(id: u32) -> String {
    // 実際のI/O操作をシミュレート
    sleep(Duration::from_millis(100)).await;
    format!("データ_{id}")
}

// 複数の非同期タスクを並行実行
async fn parallel_fetch() -> Vec<String> {
    let handles: Vec<_> = (1..=5)
        .map(|id| tokio::spawn(async move {
            fetch_data(id).await
        }))
        .collect();

    let mut results = Vec::new();
    for handle in handles {
        results.push(handle.await.unwrap());
    }
    results
}

// join!マクロで複数Futureを同時実行
async fn concurrent_tasks() {
    let (r1, r2, r3) = tokio::join!(
        fetch_data(1),
        fetch_data(2),
        fetch_data(3),
    );
    println!("{r1}, {r2}, {r3}");
}

// select!マクロで最初に完了したFutureを使う
async fn race_tasks() {
    tokio::select! {
        result = fetch_data(1) => println!("タスク1完了: {result}"),
        result = fetch_data(2) => println!("タスク2完了: {result}"),
    }
}

#[tokio::main]
async fn main() {
    // 基本的なawait
    let data = fetch_data(42).await;
    println!("{data}");

    // 並行実行
    let results = parallel_fetch().await;
    println!("{results:?}");

    concurrent_tasks().await;
    race_tasks().await;
}
```

### 9.2 Tokioのチャンネル

```rust
use tokio::sync::{mpsc, broadcast, oneshot};

// mpsc（複数プロデューサー、単一コンシューマー）
async fn mpsc_example() {
    let (tx, mut rx) = mpsc::channel::<String>(100);

    // 複数のプロデューサー
    for i in 0..5 {
        let tx_clone = tx.clone();
        tokio::spawn(async move {
            tx_clone.send(format!("メッセージ {i}")).await.unwrap();
        });
    }

    drop(tx); // 元のtxをドロップ

    while let Some(msg) = rx.recv().await {
        println!("受信: {msg}");
    }
}

// broadcast（複数プロデューサー、複数コンシューマー）
async fn broadcast_example() {
    let (tx, _) = broadcast::channel::<String>(16);

    let mut rx1 = tx.subscribe();
    let mut rx2 = tx.subscribe();

    tx.send(String::from("全員へのメッセージ")).unwrap();

    println!("rx1: {}", rx1.recv().await.unwrap());
    println!("rx2: {}", rx2.recv().await.unwrap());
}

// oneshot（一度だけのメッセージ）
async fn oneshot_example() {
    let (tx, rx) = oneshot::channel::<u32>();

    tokio::spawn(async move {
        // 何らかの計算
        let result = 42;
        tx.send(result).unwrap();
    });

    let result = rx.await.unwrap();
    println!("結果: {result}");
}

#[tokio::main]
async fn main() {
    mpsc_example().await;
    broadcast_example().await;
    oneshot_example().await;
}
```

### 9.3 Tokioのタスク管理

```rust
use tokio::task::JoinSet;
use std::sync::Arc;
use tokio::sync::Mutex;

async fn heavy_computation(n: u64) -> u64 {
    // CPUバウンドな処理はspawn_blockingを使う
    tokio::task::spawn_blocking(move || {
        (1..=n).sum::<u64>()
    })
    .await
    .unwrap()
}

async fn shared_state_example() {
    let counter = Arc::new(Mutex::new(0u32));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter_clone = Arc::clone(&counter);
        let handle = tokio::spawn(async move {
            let mut lock = counter_clone.lock().await;
            *lock += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.await.unwrap();
    }

    println!("カウンター: {}", *counter.lock().await);
}

// JoinSetで動的にタスクを管理
async fn join_set_example() {
    let mut set = JoinSet::new();

    for i in 0..10 {
        set.spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(i * 10)).await;
            i
        });
    }

    let mut results = Vec::new();
    while let Some(result) = set.join_next().await {
        results.push(result.unwrap());
    }
    results.sort();
    println!("{results:?}");
}

#[tokio::main]
async fn main() {
    println!("合計: {}", heavy_computation(1000).await);
    shared_state_example().await;
    join_set_example().await;
}
```

---

## 10. AxumによるWebAPI開発

AxumはTokioエコシステム上に構築された、高性能で人間工学的なWebフレームワークだ。

### 10.1 基本的なサーバー構築

```toml
[dependencies]
axum = { version = "0.7", features = ["macros"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace"] }
tracing = "0.1"
tracing-subscriber = "0.3"
```

```rust
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{delete, get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use std::collections::HashMap;

// データモデル
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Todo {
    id: u32,
    title: String,
    completed: bool,
}

#[derive(Debug, Deserialize)]
struct CreateTodo {
    title: String,
}

#[derive(Debug, Deserialize)]
struct UpdateTodo {
    title: Option<String>,
    completed: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct Pagination {
    #[serde(default = "default_offset")]
    offset: u32,
    #[serde(default = "default_limit")]
    limit: u32,
}

fn default_offset() -> u32 { 0 }
fn default_limit() -> u32 { 20 }

// アプリケーション状態
type Db = Arc<RwLock<HashMap<u32, Todo>>>;

// ハンドラー
async fn list_todos(
    State(db): State<Db>,
    Query(pagination): Query<Pagination>,
) -> Json<Vec<Todo>> {
    let db = db.read().unwrap();
    let todos: Vec<Todo> = db.values()
        .skip(pagination.offset as usize)
        .take(pagination.limit as usize)
        .cloned()
        .collect();
    Json(todos)
}

async fn get_todo(
    State(db): State<Db>,
    Path(id): Path<u32>,
) -> impl IntoResponse {
    let db = db.read().unwrap();
    match db.get(&id) {
        Some(todo) => (StatusCode::OK, Json(todo.clone())).into_response(),
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

async fn create_todo(
    State(db): State<Db>,
    Json(payload): Json<CreateTodo>,
) -> impl IntoResponse {
    let mut db = db.write().unwrap();
    let id = db.len() as u32 + 1;
    let todo = Todo {
        id,
        title: payload.title,
        completed: false,
    };
    db.insert(id, todo.clone());
    (StatusCode::CREATED, Json(todo))
}

async fn update_todo(
    State(db): State<Db>,
    Path(id): Path<u32>,
    Json(payload): Json<UpdateTodo>,
) -> impl IntoResponse {
    let mut db = db.write().unwrap();
    match db.get_mut(&id) {
        Some(todo) => {
            if let Some(title) = payload.title {
                todo.title = title;
            }
            if let Some(completed) = payload.completed {
                todo.completed = completed;
            }
            (StatusCode::OK, Json(todo.clone())).into_response()
        }
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

async fn delete_todo(
    State(db): State<Db>,
    Path(id): Path<u32>,
) -> StatusCode {
    let mut db = db.write().unwrap();
    if db.remove(&id).is_some() {
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

#[tokio::main]
async fn main() {
    // ロギング初期化
    tracing_subscriber::fmt::init();

    // 初期データ
    let db: Db = Arc::new(RwLock::new(HashMap::new()));

    // ルーター構築
    let app = Router::new()
        .route("/todos", get(list_todos).post(create_todo))
        .route("/todos/:id", get(get_todo).put(update_todo).delete(delete_todo))
        .with_state(db);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("サーバー起動: http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
```

### 10.2 ミドルウェアと認証

```rust
use axum::{
    middleware::{self, Next},
    extract::Request,
    http::HeaderMap,
    response::Response,
};
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;

// カスタムミドルウェア: リクエストロギング
async fn log_request(
    request: Request,
    next: Next,
) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();

    let start = std::time::Instant::now();
    let response = next.run(request).await;
    let elapsed = start.elapsed();

    tracing::info!(
        "{} {} {} {:?}",
        method,
        uri,
        response.status(),
        elapsed
    );

    response
}

// 認証ミドルウェア
async fn auth_middleware(
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = &auth_header[7..];
    if token != "valid-token" {
        return Err(StatusCode::UNAUTHORIZED);
    }

    Ok(next.run(request).await)
}

// アプリケーション構築
fn build_app() -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // 公開ルートと保護ルートの分離
    let public_routes = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/auth/login", post(|| async { Json(serde_json::json!({"token": "valid-token"})) }));

    let protected_routes = Router::new()
        .route("/api/me", get(|| async { Json(serde_json::json!({"user": "alice"})) }))
        .layer(middleware::from_fn(auth_middleware));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(middleware::from_fn(log_request))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}
```

### 10.3 エラーハンドリングとレスポンス

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response, Json},
};
use serde_json::json;

// APIエラー型
#[derive(Debug)]
enum ApiError {
    NotFound(String),
    BadRequest(String),
    InternalError(String),
    Unauthorized,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, "認証が必要です".to_string()),
        };

        let body = json!({
            "error": {
                "status": status.as_u16(),
                "message": message,
            }
        });

        (status, Json(body)).into_response()
    }
}

// anyhowとの統合
impl From<anyhow::Error> for ApiError {
    fn from(err: anyhow::Error) -> Self {
        ApiError::InternalError(err.to_string())
    }
}

type ApiResult<T> = Result<Json<T>, ApiError>;

async fn get_user(Path(id): Path<u32>) -> ApiResult<serde_json::Value> {
    if id == 0 {
        return Err(ApiError::BadRequest("IDは0より大きい必要があります".to_string()));
    }
    if id > 100 {
        return Err(ApiError::NotFound(format!("ユーザー {id} は存在しません")));
    }
    Ok(Json(json!({"id": id, "name": "Alice"})))
}
```

---

## 11. SQLxでのデータベース操作

```toml
[dependencies]
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres", "uuid", "chrono", "migrate"] }
tokio = { version = "1", features = ["full"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
serde = { version = "1", features = ["derive"] }
```

```rust
use sqlx::{PgPool, postgres::PgPoolOptions, Row};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
struct User {
    id: Uuid,
    username: String,
    email: String,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct CreateUser {
    username: String,
    email: String,
}

struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await?;
        Ok(Self { pool })
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, sqlx::Error> {
        // コンパイル時にSQLを検証するquery_as!マクロ
        let user = sqlx::query_as!(
            User,
            "SELECT id, username, email, created_at FROM users WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(user)
    }

    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<User>, sqlx::Error> {
        let users = sqlx::query_as!(
            User,
            r#"
            SELECT id, username, email, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(users)
    }

    async fn create(&self, payload: CreateUser) -> Result<User, sqlx::Error> {
        let user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, username, email, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id, username, email, created_at
            "#,
            Uuid::new_v4(),
            payload.username,
            payload.email
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(user)
    }

    async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!(
            "DELETE FROM users WHERE id = $1",
            id
        )
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    // トランザクション
    async fn create_user_with_profile(
        &self,
        payload: CreateUser,
        bio: String,
    ) -> Result<User, sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        let user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, username, email, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id, username, email, created_at
            "#,
            Uuid::new_v4(),
            payload.username,
            payload.email
        )
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query!(
            "INSERT INTO profiles (user_id, bio) VALUES ($1, $2)",
            user.id,
            bio
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(user)
    }
}
```

---

## 12. WebAssemblyとの連携

```toml
# Cargo.toml (wasm用)
[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
web-sys = { version = "0.3", features = [
    "console",
    "Window",
    "Document",
    "Element",
    "HtmlElement",
    "HtmlCanvasElement",
    "CanvasRenderingContext2d",
] }
js-sys = "0.3"
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"
```

```rust
use wasm_bindgen::prelude::*;
use web_sys::{console, HtmlCanvasElement, CanvasRenderingContext2d};

// JavaScriptから呼び出せる関数
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {name}! This is Rust + WASM!")
}

// JavaScriptの関数を呼び出す
#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);

    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// パニックをconsole.errorにリダイレクト
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
    log("Rust WASMモジュール初期化完了");
}

// 複雑な計算をWASMで実行
#[wasm_bindgen]
pub struct GameOfLife {
    width: u32,
    height: u32,
    cells: Vec<u8>,
}

#[wasm_bindgen]
impl GameOfLife {
    pub fn new(width: u32, height: u32) -> GameOfLife {
        let cells = (0..width * height)
            .map(|i| if i % 2 == 0 || i % 7 == 0 { 1 } else { 0 })
            .collect();
        GameOfLife { width, height, cells }
    }

    pub fn tick(&mut self) {
        let mut next = self.cells.clone();
        for row in 0..self.height {
            for col in 0..self.width {
                let idx = (row * self.width + col) as usize;
                let live_neighbors = self.live_neighbor_count(row, col);
                next[idx] = match (self.cells[idx], live_neighbors) {
                    (1, 2) | (1, 3) => 1,
                    (1, _) => 0,
                    (0, 3) => 1,
                    _ => 0,
                };
            }
        }
        self.cells = next;
    }

    pub fn cells(&self) -> *const u8 {
        self.cells.as_ptr()
    }

    fn live_neighbor_count(&self, row: u32, col: u32) -> u8 {
        let mut count = 0;
        for delta_row in [self.height - 1, 0, 1] {
            for delta_col in [self.width - 1, 0, 1] {
                if delta_row == 0 && delta_col == 0 {
                    continue;
                }
                let neighbor_row = (row + delta_row) % self.height;
                let neighbor_col = (col + delta_col) % self.width;
                let idx = (neighbor_row * self.width + neighbor_col) as usize;
                count += self.cells[idx];
            }
        }
        count
    }

    pub fn render(&self) -> String {
        self.cells.chunks(self.width as usize)
            .map(|row| {
                row.iter()
                    .map(|&cell| if cell == 1 { '#' } else { '.' })
                    .collect::<String>()
            })
            .collect::<Vec<_>>()
            .join("\n")
    }
}

// JavaScriptとのデータ交換（serdeを使う）
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Config {
    pub width: u32,
    pub height: u32,
    pub fps: u32,
}

#[wasm_bindgen]
pub fn process_config(val: JsValue) -> Result<JsValue, JsValue> {
    let config: Config = serde_wasm_bindgen::from_value(val)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let result = Config {
        width: config.width * 2,
        height: config.height * 2,
        fps: config.fps.min(60),
    };

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}
```

ビルドとデプロイ：

```bash
# wasm-packのインストール
cargo install wasm-pack

# ビルド（webターゲット）
wasm-pack build --target web

# ビルド（bundlerターゲット、webpack/viteで使う場合）
wasm-pack build --target bundler

# 生成されるpkg/ディレクトリ
# pkg/
# ├── package.json
# ├── *.wasm
# ├── *.js          (glueコード)
# └── *.d.ts        (TypeScript型定義)
```

---

## 13. テスト

### 13.1 ユニットテスト

```rust
// src/lib.rs

pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

pub fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 {
        Err(String::from("ゼロ除算"))
    } else {
        Ok(a / b)
    }
}

pub struct BankAccount {
    balance: f64,
}

impl BankAccount {
    pub fn new(initial_balance: f64) -> Self {
        assert!(initial_balance >= 0.0, "残高は0以上");
        BankAccount { balance: initial_balance }
    }

    pub fn deposit(&mut self, amount: f64) -> Result<f64, String> {
        if amount <= 0.0 {
            return Err(format!("入金額は正の数が必要: {amount}"));
        }
        self.balance += amount;
        Ok(self.balance)
    }

    pub fn withdraw(&mut self, amount: f64) -> Result<f64, String> {
        if amount <= 0.0 {
            return Err(format!("出金額は正の数が必要: {amount}"));
        }
        if amount > self.balance {
            return Err(format!("残高不足: 残高={}, 出金額={}", self.balance, amount));
        }
        self.balance -= amount;
        Ok(self.balance)
    }

    pub fn balance(&self) -> f64 {
        self.balance
    }
}

// テストモジュール
#[cfg(test)]
mod tests {
    use super::*;

    // 基本的なテスト
    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
        assert_eq!(add(-1, 1), 0);
        assert_eq!(add(0, 0), 0);
    }

    #[test]
    fn test_divide_success() {
        let result = divide(10.0, 2.0);
        assert!(result.is_ok());
        assert!((result.unwrap() - 5.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_divide_by_zero() {
        let result = divide(10.0, 0.0);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "ゼロ除算");
    }

    // テストのグループ化
    mod bank_account_tests {
        use super::*;

        fn setup() -> BankAccount {
            BankAccount::new(1000.0)
        }

        #[test]
        fn test_new_account() {
            let account = setup();
            assert_eq!(account.balance(), 1000.0);
        }

        #[test]
        fn test_deposit() {
            let mut account = setup();
            let result = account.deposit(500.0);
            assert!(result.is_ok());
            assert_eq!(account.balance(), 1500.0);
        }

        #[test]
        fn test_deposit_negative_fails() {
            let mut account = setup();
            let result = account.deposit(-100.0);
            assert!(result.is_err());
            assert_eq!(account.balance(), 1000.0); // 残高は変わらない
        }

        #[test]
        fn test_withdraw_success() {
            let mut account = setup();
            let result = account.withdraw(300.0);
            assert!(result.is_ok());
            assert_eq!(account.balance(), 700.0);
        }

        #[test]
        fn test_withdraw_insufficient_funds() {
            let mut account = setup();
            let result = account.withdraw(1500.0);
            assert!(result.is_err());
            assert!(result.unwrap_err().contains("残高不足"));
            assert_eq!(account.balance(), 1000.0); // 残高は変わらない
        }

        #[test]
        #[should_panic(expected = "残高は0以上")]
        fn test_negative_initial_balance_panics() {
            BankAccount::new(-100.0);
        }
    }
}
```

### 13.2 統合テスト

```rust
// tests/integration_test.rs

use my_crate::{BankAccount, add, divide};

#[test]
fn test_full_banking_workflow() {
    let mut account = BankAccount::new(1000.0);

    // 入金
    account.deposit(500.0).expect("入金失敗");
    assert_eq!(account.balance(), 1500.0);

    // 出金
    account.withdraw(200.0).expect("出金失敗");
    assert_eq!(account.balance(), 1300.0);

    // 複数回の操作
    for _ in 0..5 {
        account.deposit(100.0).expect("入金失敗");
    }
    assert_eq!(account.balance(), 1800.0);
}
```

### 13.3 非同期テスト

```rust
#[cfg(test)]
mod async_tests {
    use super::*;

    // tokio::testマクロで非同期テスト
    #[tokio::test]
    async fn test_async_function() {
        let result = fetch_data(42).await;
        assert!(!result.is_empty());
    }

    // タイムアウト付きテスト
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_concurrent_operations() {
        let handles: Vec<_> = (0..10)
            .map(|i| tokio::spawn(async move { fetch_data(i).await }))
            .collect();

        let results: Vec<String> = futures::future::join_all(handles)
            .await
            .into_iter()
            .map(|r| r.unwrap())
            .collect();

        assert_eq!(results.len(), 10);
    }
}
```

### 13.4 プロパティベーステスト

```toml
[dev-dependencies]
proptest = "1"
```

```rust
use proptest::prelude::*;

fn is_palindrome(s: &str) -> bool {
    let chars: Vec<char> = s.chars().collect();
    let len = chars.len();
    (0..len / 2).all(|i| chars[i] == chars[len - 1 - i])
}

proptest! {
    // 任意の文字列に対してis_palindromeは常にboolを返す
    #[test]
    fn test_is_palindrome_doesnt_crash(s in ".*") {
        let _ = is_palindrome(&s);
    }

    // 文字列をそのまま返すと必ずパリンドローム
    #[test]
    fn test_single_char_is_palindrome(c in any::<char>()) {
        let s = c.to_string();
        assert!(is_palindrome(&s));
    }

    // 整数演算のプロパティ
    #[test]
    fn test_add_commutative(a in -1000i32..1000, b in -1000i32..1000) {
        assert_eq!(add(a, b), add(b, a));
    }

    #[test]
    fn test_add_associative(a in -100i32..100, b in -100i32..100, c in -100i32..100) {
        assert_eq!(add(add(a, b), c), add(a, add(b, c)));
    }
}
```

---

## 14. パフォーマンス最適化・プロファイリング

### 14.1 ベンチマーク

```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

```rust
// benches/my_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};

fn fibonacci_recursive(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2),
    }
}

fn fibonacci_iterative(n: u64) -> u64 {
    if n <= 1 { return n; }
    let (mut a, mut b) = (0u64, 1u64);
    for _ in 2..=n {
        let c = a + b;
        a = b;
        b = c;
    }
    b
}

fn fibonacci_memoized(n: u64) -> u64 {
    let mut memo = vec![0u64; (n + 1) as usize];
    memo[1] = 1;
    for i in 2..=n as usize {
        memo[i] = memo[i-1] + memo[i-2];
    }
    memo[n as usize]
}

fn bench_fibonacci(c: &mut Criterion) {
    let mut group = c.benchmark_group("fibonacci");

    for n in [10u64, 20, 30] {
        group.bench_with_input(
            BenchmarkId::new("recursive", n),
            &n,
            |b, &n| b.iter(|| fibonacci_recursive(black_box(n))),
        );
        group.bench_with_input(
            BenchmarkId::new("iterative", n),
            &n,
            |b, &n| b.iter(|| fibonacci_iterative(black_box(n))),
        );
        group.bench_with_input(
            BenchmarkId::new("memoized", n),
            &n,
            |b, &n| b.iter(|| fibonacci_memoized(black_box(n))),
        );
    }
    group.finish();
}

criterion_group!(benches, bench_fibonacci);
criterion_main!(benches);
```

実行：
```bash
cargo bench
# HTMLレポートが target/criterion/ に生成される
```

### 14.2 プロファイリング

```bash
# perf（Linux）
cargo build --release
perf record --call-graph=dwarf ./target/release/my_app
perf report

# flamegraph
cargo install flamegraph
cargo flamegraph --bin my_app

# samply（macOS）
cargo install samply
samply record ./target/release/my_app

# Valgrind（メモリプロファイリング）
valgrind --tool=massif ./target/release/my_app
ms_print massif.out.* | head -50
```

### 14.3 最適化テクニック

```rust
// 1. 不要なアロケーションを避ける
fn bad_join(parts: &[String]) -> String {
    let mut result = String::new();
    for part in parts {
        result += part; // 毎回再アロケーションが発生する可能性
    }
    result
}

fn good_join(parts: &[String]) -> String {
    let total_len: usize = parts.iter().map(|s| s.len()).sum();
    let mut result = String::with_capacity(total_len); // 容量を事前確保
    for part in parts {
        result.push_str(part);
    }
    result
}

// 2. Vecの容量予約
fn build_vec(n: usize) -> Vec<i32> {
    let mut v = Vec::with_capacity(n); // 再アロケーションを防ぐ
    for i in 0..n as i32 {
        v.push(i);
    }
    v
}

// 3. イテレータチェーンはゼロコスト（ループに最適化される）
fn sum_of_squares(n: u32) -> u64 {
    (1..=n as u64).map(|x| x * x).sum()
}

// 4. インライン化のヒント
#[inline(always)]
fn hot_function(x: i32) -> i32 {
    x * x + 2 * x + 1
}

// 5. SIMD（portabilityクレート）
use std::simd::*;

fn sum_simd(data: &[f32]) -> f32 {
    let mut sum = f32x8::splat(0.0);
    let chunks = data.chunks_exact(8);
    let remainder = chunks.remainder();

    for chunk in chunks {
        let v = f32x8::from_slice(chunk);
        sum += v;
    }

    let scalar_sum: f32 = sum.reduce_sum();
    scalar_sum + remainder.iter().sum::<f32>()
}

// 6. 並列処理（Rayon）
use rayon::prelude::*;

fn parallel_sum(data: &[i64]) -> i64 {
    data.par_iter().sum()
}

fn parallel_map(data: &[i32]) -> Vec<i32> {
    data.par_iter().map(|&x| x * x).collect()
}

// 7. スタックアロケーション vs ヒープアロケーション
fn stack_vs_heap() {
    // スタック上（高速）
    let small_array = [0i32; 100];

    // ヒープ上（大きなデータ向け）
    let large_vec = vec![0i32; 1_000_000];

    // 固定サイズの文字列はスタック上に
    use arrayvec::ArrayString;
    let mut s = ArrayString::<64>::new();
    s.push_str("hello");
}
```

### 14.4 メモリレイアウトの最適化

```rust
// 構造体のメモリレイアウト最適化
use std::mem;

// パディングが多い（非効率）
#[allow(dead_code)]
struct Inefficient {
    a: u8,   // 1バイト + 3バイトパディング
    b: u32,  // 4バイト
    c: u8,   // 1バイト + 7バイトパディング
    d: u64,  // 8バイト
}

// パディングが少ない（効率的）
#[allow(dead_code)]
struct Efficient {
    d: u64,  // 8バイト
    b: u32,  // 4バイト
    a: u8,   // 1バイト
    c: u8,   // 1バイト + 2バイトパディング
}

fn main() {
    println!("Inefficient size: {}", mem::size_of::<Inefficient>()); // 24バイト
    println!("Efficient size: {}", mem::size_of::<Efficient>());     // 16バイト

    // repr(C)でC互換のメモリレイアウト
    #[repr(C)]
    struct CCompatible {
        x: f64,
        y: f64,
        z: f64,
    }

    // repr(packed)でパディングなし（アライメント違反に注意）
    #[repr(packed)]
    struct Packed {
        a: u8,
        b: u32,
    }
}
```

### 14.5 Cargo最適化プロファイル

```toml
# Cargo.toml

# リリースビルドの最適化
[profile.release]
opt-level = 3        # 最大最適化
lto = true           # Link Time Optimization
codegen-units = 1    # 並列コード生成を無効（最適化向上）
panic = "abort"      # パニックハンドラを省略（バイナリサイズ削減）
strip = true         # デバッグシンボルを削除

# 依存クレートのみ最適化するプロファイル（開発時の妥協点）
[profile.dev.package."*"]
opt-level = 2

# サイズ優先プロファイル（組み込み向け）
[profile.release-small]
inherits = "release"
opt-level = "z"      # サイズ最適化
```

---

## 15. 実践的なプロジェクト：HTTPクライアントの実装

締めくくりとして、実際のHTTPクライアントを実装する例を示す。

```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use anyhow::{Context, Result};

#[derive(Debug, Deserialize)]
struct GithubUser {
    login: String,
    name: Option<String>,
    public_repos: u32,
    followers: u32,
}

#[derive(Debug, Deserialize)]
struct GithubRepo {
    name: String,
    description: Option<String>,
    stargazers_count: u32,
    language: Option<String>,
}

struct GithubClient {
    client: Client,
    base_url: String,
}

impl GithubClient {
    fn new() -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .user_agent("rust-github-client/1.0")
            .build()
            .context("HTTPクライアントの構築に失敗")?;

        Ok(GithubClient {
            client,
            base_url: String::from("https://api.github.com"),
        })
    }

    async fn get_user(&self, username: &str) -> Result<GithubUser> {
        let url = format!("{}/users/{}", self.base_url, username);
        let user = self.client
            .get(&url)
            .send()
            .await
            .context("リクエスト送信失敗")?
            .error_for_status()
            .context("APIエラーレスポンス")?
            .json::<GithubUser>()
            .await
            .context("JSONデシリアライズ失敗")?;
        Ok(user)
    }

    async fn get_repos(&self, username: &str) -> Result<Vec<GithubRepo>> {
        let url = format!("{}/users/{}/repos?per_page=10&sort=stars", self.base_url, username);
        let repos = self.client
            .get(&url)
            .send()
            .await
            .context("リクエスト送信失敗")?
            .error_for_status()
            .context("APIエラーレスポンス")?
            .json::<Vec<GithubRepo>>()
            .await
            .context("JSONデシリアライズ失敗")?;
        Ok(repos)
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let client = GithubClient::new()?;

    let username = "rust-lang";
    let user = client.get_user(username).await?;
    println!("ユーザー: {}", user.login);
    println!("名前: {}", user.name.as_deref().unwrap_or("N/A"));
    println!("公開リポジトリ数: {}", user.public_repos);
    println!("フォロワー数: {}", user.followers);

    println!("\n上位リポジトリ:");
    let repos = client.get_repos(username).await?;
    for repo in repos.iter().take(5) {
        println!(
            "  {} (star: {}) - {}",
            repo.name,
            repo.stargazers_count,
            repo.description.as_deref().unwrap_or("説明なし")
        );
    }

    Ok(())
}
```

---

## まとめ

本記事では、Rustの基礎から実践的な応用まで幅広く解説した。ポイントを整理する。

**Rustを選ぶべき場面**

- メモリ安全性と高パフォーマンスが同時に求められるシステム
- C/C++の代替として、バグを減らしながら移行したいケース
- WebAssemblyを使ったブラウザ内高速処理
- 高並行サーバーアプリケーション（Tokio + Axum）
- CLIツールやユーティリティの開発

**Rustの学習パス**

1. まず「The Rust Programming Language」（通称「The Book」）を通読する
2. Rustlings（公式練習問題集）でハンズオン学習する
3. 小さなCLIツールを作って所有権システムに慣れる
4. `cargo clippy`と`cargo test`を習慣づける
5. 実際のプロジェクトでTokio/Axumを試す

**エコシステムのキーポイント**

- `serde`：シリアライズ・デシリアライズの事実上の標準
- `tokio`：非同期ランタイムの事実上の標準
- `axum`：Tokioベースの現代的Webフレームワーク
- `sqlx`：コンパイル時SQLチェック付きのDBクライアント
- `anyhow` + `thiserror`：エラーハンドリングのベストプラクティス
- `rayon`：データ並列処理
- `clap`：CLIアプリケーション構築

2026年現在、Rustは成熟したエコシステムと豊富な学習リソースを持ち、実務での採用が急速に進んでいる。今こそRustを習得する絶好のタイミングだ。

---

## 開発者ツールとしてDevToolBoxを活用する

Rustの開発では、JSONのフォーマット、JWTのデバッグ、正規表現のテスト、Base64エンコード・デコードなど、様々なツールを頻繁に使う場面がある。

**DevToolBox（https://usedevtools.com）** は、開発者向けのオールインワンツールサイトだ。ブラウザ上で動作するため、インストール不要で以下のようなツールを即座に利用できる。

- **JSON Formatter / Validator**：AxumのAPIレスポンスをすぐに整形・検証
- **JWT Decoder**：認証トークンのペイロードをデコードして確認
- **Regex Tester**：Rustの正規表現パターンを事前に検証
- **Base64 Encoder/Decoder**：バイナリデータの確認
- **Hash Generator**：SHA256などのハッシュ値を素早く生成
- **Diff Checker**：コードの変更差分を視覚的に確認
- **Color Picker**：フロントエンドとの連携時に便利

Rustでバックエンドを開発しながら、これらのツールを手元に置いておくことで、デバッグ作業の効率が大幅に向上する。特にSQLxのクエリ結果やAxumのJSONレスポンスの確認に重宝する。

ぜひブックマークしておくことをお勧めする。


---

## スキルアップ・キャリアアップのおすすめリソース

Rustの知識をさらに深め、キャリアに活かしたい方向けのリソースを紹介する。

### 転職・キャリアアップ
- **[レバテックキャリア](https://levtech.jp)** — ITエンジニア専門の転職エージェント。Rustエンジニアの求人も増加中。年収600万円以上の高単価案件多数。無料相談可能。
- **[Findy](https://findy-job.com)** — GitHubスキル偏差値で実力をアピール。Rustのコントリビューション実績を評価してもらいやすい。スカウト型でリモート求人が充実。

### オンライン学習
- **[Udemy](https://www.udemy.com)** — Rust入門から応用（Tokio・WebAssembly）まで動画コースが充実。セール時は90%オフになることも。日本語字幕付きのコースも増えている。
- **[Coursera](https://www.coursera.org)** — システムプログラミングの基礎を体系的に学べる。証明書取得でポートフォリオに追加可能。
