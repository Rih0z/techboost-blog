---
title: "Carbon言語入門 - C++の後継を目指す新言語"
description: "GoogleがC++の後継として開発しているCarbon言語の基本文法、特徴、C++との相互運用性について詳しく解説します。"
pubDate: "2025-02-05"
tags: ['プログラミング', '開発ツール']
---
## Carbon言語とは

Carbon（カーボン）は、Googleが中心となって開発している実験的なプログラミング言語です。C++の「後継」として設計されており、既存のC++コードベースとの高い相互運用性を持ちながら、モダンな言語設計を実現することを目指しています。

### Carbonが登場した背景

C++は50年近い歴史を持つ強力な言語ですが、以下のような課題があります:

- **技術的負債**: 長い歴史により蓄積された複雑性
- **学習曲線**: 初心者にとって習得が困難
- **安全性**: メモリ安全性の問題
- **進化の遅さ**: 後方互換性を保ちながらの進化は困難

RustがC++の代替として注目されていますが、既存のC++コードベースとの相互運用性に課題があります。Carbonは、C++からの段階的な移行を可能にすることを重視しています。

### Carbonの主な特徴

- **C++との相互運用性**: C++コードを直接呼び出し可能
- **モダンな文法**: 読みやすく書きやすい構文
- **メモリ安全性**: より安全なメモリ管理
- **高速なコンパイル**: ビルド時間の短縮
- **ジェネリクス**: 強力なジェネリックプログラミング
- **パターンマッチング**: 関数型言語のような機能

注意: Carbonは2025年時点でまだ実験段階であり、本番利用には適していません。

## 開発環境のセットアップ

### 必要なツール

Carbonを試すには以下が必要です:

1. **LLVM/Clang**: バックエンドコンパイラ
2. **Bazel**: ビルドシステム
3. **Carbon Toolchain**: Carbonコンパイラ

### インストール（macOS/Linux）

```bash
# 依存関係のインストール
# macOS
brew install llvm bazel

# Ubuntu/Debian
sudo apt-get install llvm clang bazel

# Carbonリポジトリのクローン
git clone https://github.com/carbon-language/carbon-lang
cd carbon-lang

# ビルド
bazel build //explorer
```

### Hello, World!

最初のCarbonプログラム:

```carbon
package Sample api;

fn Main() -> i32 {
  var s: auto = "Hello, World!";
  Print(s);
  return 0;
}
```

実行:

```bash
bazel run //explorer -- ./hello.carbon
```

## Carbon言語の基本文法

### 変数宣言

Carbonでは、変数宣言に`var`キーワードを使用します:

```carbon
// 型推論
var x: auto = 42;
var name: auto = "Carbon";

// 明示的な型指定
var count: i32 = 10;
var price: f64 = 99.99;
var is_active: bool = true;

// 定数
let MAX_SIZE: i32 = 100;
```

### 基本データ型

```carbon
// 整数型
var a: i8 = 127;          // 8ビット符号付き整数
var b: i16 = 32767;       // 16ビット符号付き整数
var c: i32 = 2147483647;  // 32ビット符号付き整数
var d: i64 = 9223372036854775807; // 64ビット符号付き整数

// 符号なし整数
var e: u8 = 255;
var f: u32 = 4294967295;

// 浮動小数点数
var g: f32 = 3.14;
var h: f64 = 2.71828;

// ブール値
var i: bool = true;
var j: bool = false;

// 文字列
var k: String = "Hello";
```

### 関数

関数は`fn`キーワードで定義します:

```carbon
// 基本的な関数
fn Add(a: i32, b: i32) -> i32 {
  return a + b;
}

// 複数の戻り値
fn Divide(a: i32, b: i32) -> (i32, i32) {
  return (a / b, a % b);
}

// 使用例
fn Main() -> i32 {
  var result: auto = Add(10, 20);
  Print(result);  // 30

  var (quotient: auto, remainder: auto) = Divide(17, 5);
  Print(quotient);   // 3
  Print(remainder);  // 2

  return 0;
}
```

### 制御構文

#### if文

```carbon
fn CheckValue(x: i32) -> String {
  if (x > 0) {
    return "Positive";
  } else if (x < 0) {
    return "Negative";
  } else {
    return "Zero";
  }
}

// if式（値を返す）
fn Abs(x: i32) -> i32 {
  return if (x >= 0) { x } else { -x };
}
```

#### while文

```carbon
fn Factorial(n: i32) -> i32 {
  var result: i32 = 1;
  var i: i32 = 1;

  while (i <= n) {
    result = result * i;
    i = i + 1;
  }

  return result;
}
```

#### for文

```carbon
fn Sum(numbers: [i32]) -> i32 {
  var total: i32 = 0;

  for (num: i32 in numbers) {
    total = total + num;
  }

  return total;
}

// 範囲ベースのfor
fn PrintNumbers(n: i32) {
  for (i: i32 in 0 .. n) {
    Print(i);
  }
}
```

### パターンマッチング

Carbonはパターンマッチングをサポートしています:

```carbon
choice Status {
  Success(i32),
  Error(String),
  Pending
}

fn HandleStatus(status: Status) -> String {
  match (status) {
    case Status.Success(value: auto) => {
      return "Success: " + ToString(value);
    }
    case Status.Error(msg: auto) => {
      return "Error: " + msg;
    }
    case Status.Pending => {
      return "Pending...";
    }
  }
}
```

## クラスとオブジェクト指向

### クラス定義

```carbon
class Point {
  var x: i32;
  var y: i32;

  // コンストラクタ
  fn Create(x: i32, y: i32) -> Self {
    return {.x = x, .y = y};
  }

  // メソッド
  fn Distance(self: Self) -> f64 {
    var dx: f64 = self.x as f64;
    var dy: f64 = self.y as f64;
    return Sqrt(dx * dx + dy * dy);
  }

  fn Move(var self: Self*, dx: i32, dy: i32) {
    self->x = self->x + dx;
    self->y = self->y + dy;
  }
}

// 使用例
fn Main() -> i32 {
  var p: auto = Point.Create(3, 4);
  Print(p.Distance());  // 5.0

  p.Move(1, 1);
  Print(p.x);  // 4
  Print(p.y);  // 5

  return 0;
}
```

### 継承とインターフェース

```carbon
// インターフェース（trait）
interface Drawable {
  fn Draw(self: Self);
}

// 実装
class Circle {
  var radius: f64;
  var center: Point;

  fn Create(center: Point, radius: f64) -> Self {
    return {.center = center, .radius = radius};
  }
}

impl Circle as Drawable {
  fn Draw(self: Self) {
    Print("Drawing circle at (" +
          ToString(self.center.x) + ", " +
          ToString(self.center.y) + ") with radius " +
          ToString(self.radius));
  }
}

class Rectangle {
  var width: f64;
  var height: f64;
  var top_left: Point;

  fn Create(top_left: Point, width: f64, height: f64) -> Self {
    return {.top_left = top_left, .width = width, .height = height};
  }
}

impl Rectangle as Drawable {
  fn Draw(self: Self) {
    Print("Drawing rectangle at (" +
          ToString(self.top_left.x) + ", " +
          ToString(self.top_left.y) + ")");
  }
}
```

## ジェネリクス

Carbonは強力なジェネリックプログラミングをサポートします:

```carbon
// ジェネリック関数
fn Max[T:! Comparable](a: T, b: T) -> T {
  return if (a > b) { a } else { b };
}

// ジェネリッククラス
class Stack[T:! type] {
  var items: Vector[T];

  fn Create() -> Self {
    return {.items = Vector[T].Create()};
  }

  fn Push(var self: Self*, item: T) {
    self->items.Push(item);
  }

  fn Pop(var self: Self*) -> Optional[T] {
    if (self->items.Size() == 0) {
      return Optional[T].None();
    }
    return Optional[T].Some(self->items.PopBack());
  }

  fn Size(self: Self) -> i32 {
    return self.items.Size();
  }
}

// 使用例
fn Main() -> i32 {
  var stack: auto = Stack[i32].Create();
  stack.Push(10);
  stack.Push(20);
  stack.Push(30);

  while (stack.Size() > 0) {
    match (stack.Pop()) {
      case Optional[i32].Some(value: auto) => {
        Print(value);
      }
      case Optional[i32].None => {
        break;
      }
    }
  }

  return 0;
}
```

## メモリ管理

Carbonは所有権とライフタイムの概念を持ちますが、Rustよりもシンプルな設計を目指しています:

```carbon
// 所有権の移動
fn TakeOwnership(owned value: String) {
  Print(value);
  // valueは関数終了時に破棄される
}

// 借用（参照）
fn Borrow(borrowed value: String*) {
  Print(*value);
  // valueの所有権は移動しない
}

fn Main() -> i32 {
  var s: auto = "Hello";

  Borrow(&s);  // sは引き続き使用可能
  Print(s);    // OK

  TakeOwnership(s);  // sの所有権が移動
  // Print(s);  // エラー: sはもう使用できない

  return 0;
}
```

## C++との相互運用

Carbonの最大の特徴は、C++との双方向の相互運用性です:

### C++からCarbonを呼び出す

```carbon
// math.carbon
package Math api;

fn Add(a: i32, b: i32) -> i32 {
  return a + b;
}

fn Multiply(a: i32, b: i32) -> i32 {
  return a * b;
}
```

```cpp
// main.cpp
#include "math.carbon.h"

int main() {
  int result = Math::Add(10, 20);
  std::cout << "Result: " << result << std::endl;
  return 0;
}
```

### CarbonからC++を呼び出す

```cpp
// cpp_math.h
namespace CppMath {
  int Square(int x);
  double SquareRoot(double x);
}
```

```carbon
// main.carbon
package Main api;

import Cpp library "cpp_math.h";

fn Main() -> i32 {
  var x: i32 = 5;
  var squared: auto = Cpp.CppMath.Square(x);
  var root: auto = Cpp.CppMath.SquareRoot(25.0);

  Print(squared);  // 25
  Print(root);     // 5.0

  return 0;
}
```

## エラーハンドリング

CarbonはResult型を使用したエラーハンドリングをサポートします:

```carbon
choice Result[T:! type, E:! type] {
  Ok(T),
  Err(E)
}

fn Divide(a: i32, b: i32) -> Result[i32, String] {
  if (b == 0) {
    return Result[i32, String].Err("Division by zero");
  }
  return Result[i32, String].Ok(a / b);
}

fn Main() -> i32 {
  var result: auto = Divide(10, 2);

  match (result) {
    case Result[i32, String].Ok(value: auto) => {
      Print("Result: " + ToString(value));
    }
    case Result[i32, String].Err(msg: auto) => {
      Print("Error: " + msg);
    }
  }

  return 0;
}
```

## 並行性とスレッド

Carbonは安全な並行プログラミングをサポートする予定です（まだ実装中）:

```carbon
// 将来的な構文案
fn ProcessData(data: Vector[i32]) -> i32 {
  var sum: i32 = 0;

  // 並列処理
  parallel for (item: i32 in data) {
    atomic_add(&sum, item);
  }

  return sum;
}

// 非同期処理
async fn FetchData(url: String) -> Result[String, Error] {
  var response: auto = await Http.Get(url);
  return response.Body();
}
```

## Carbonの設計哲学

### 1. 段階的な移行

既存のC++コードベースから段階的に移行できることを重視:

```carbon
// C++とCarbonを混在させて使用可能
import Cpp library "legacy_code.h";

fn NewFeature() -> i32 {
  // 新しい機能はCarbonで実装
  var result: auto = ModernAlgorithm();

  // 既存のC++コードを呼び出し
  Cpp.LegacyFunction(result);

  return result;
}
```

### 2. パフォーマンス

C++と同等のパフォーマンスを維持:

- ゼロコスト抽象化
- 効率的なメモリレイアウト
- インライン展開の最適化

### 3. 安全性

メモリ安全性とスレッド安全性を向上:

- 所有権システム
- ライフタイム管理
- データ競合の防止

## まとめ

Carbon言語は、C++の後継として以下の目標を掲げています:

- **既存コードとの互換性**: C++からの段階的な移行
- **モダンな設計**: 読みやすく書きやすい文法
- **高いパフォーマンス**: C++と同等の実行速度
- **安全性の向上**: メモリ安全性とスレッド安全性

現時点ではまだ実験段階ですが、C++の大規模コードベースを持つ組織にとって、将来的に有力な選択肢となる可能性があります。

Carbonの開発状況は公式GitHubリポジトリ（https://github.com/carbon-language/carbon-lang）で確認できます。興味がある方は、ぜひコミュニティに参加してみてください。
