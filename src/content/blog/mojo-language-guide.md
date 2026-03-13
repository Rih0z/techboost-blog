---
title: "Mojo言語入門 - Pythonの100倍速い次世代プログラミング言語"
description: "Mojoは高速性と使いやすさを両立した新言語。Pythonとの互換性を保ちつつRustレベルのパフォーマンスを実現。AI・機械学習に最適化された構文、型システム、メモリ管理、実践例を解説します。"
pubDate: "2025-02-05"
tags: ['Python', 'バックエンド', '開発ツール']
heroImage: '../../assets/thumbnails/mojo-language-guide.jpg'
---

## Mojoとは

**Mojo**は、Modular社が開発した高性能プログラミング言語です。**Pythonの使いやすさ**と**C/Rustのパフォーマンス**を融合し、AI・機械学習、システムプログラミング、高性能コンピューティングに最適化されています。

### Mojoの特徴

**1. Pythonとの互換性**
```python
# 既存のPythonコードがそのまま動く
import numpy as np

def calculate_mean(data):
    return np.mean(data)

# Python標準ライブラリも使用可能
from datetime import datetime
print(datetime.now())
```

**2. 圧倒的な高速性**
```mojo
# Mojoで最適化されたコード
fn matrix_multiply(a: Matrix, b: Matrix) -> Matrix:
    # SIMDとパラレル処理で高速化
    # Pythonの100倍以上高速
    ...
```

**3. メモリ安全性**
```mojo
# Rustのような所有権システム
fn process_data(owned data: Vector) -> Vector:
    # dataの所有権を受け取り、処理後に返す
    return data.process()
```

### なぜMojoが注目されているのか

**従来の選択肢の問題**:

| 言語 | 利点 | 欠点 |
|------|------|------|
| Python | 書きやすい、豊富なライブラリ | 遅い（1x） |
| C/C++ | 高速（100x） | 複雑、メモリ管理が難しい |
| Rust | 高速、メモリ安全 | 学習曲線が急 |
| Julia | 高速、科学計算向け | エコシステムが小さい |

**Mojoの解決策**:
- **Pythonの生産性** + **Cの速度** + **Rustの安全性**
- 既存のPythonコードを段階的に最適化可能
- AI/MLに特化したハードウェア最適化

## インストール

### Modular CLI

```bash
# Modular CLIのインストール（macOS/Linux）
curl https://get.modular.com | sh -

# Mojoのインストール
modular install mojo

# パスを通す
echo 'export MODULAR_HOME="$HOME/.modular"' >> ~/.bashrc
echo 'export PATH="$MODULAR_HOME/pkg/packages.modular.com_mojo/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# バージョン確認
mojo --version
```

### Hello World

```bash
# REPLで実行
mojo

# ファイルとして実行
echo 'print("Hello, Mojo!")' > hello.mojo
mojo hello.mojo

# コンパイル
mojo build hello.mojo
./hello
```

## 基本構文

### 変数と型

```mojo
# 動的型付け（Pythonスタイル）
def dynamic_example():
    x = 10        # 型推論
    y = "hello"   # 文字列
    z = [1, 2, 3] # リスト

# 静的型付け（高速化）
fn static_example():
    let x: Int = 10
    let y: String = "hello"
    let z: Float64 = 3.14

    # 変更不可（immutable）
    let constant: Int = 42

    # 変更可能（mutable）
    var mutable: Int = 0
    mutable = 10
```

### 関数定義

```mojo
# defキーワード（Pythonスタイル、動的）
def python_style_func(x, y):
    return x + y

# fnキーワード（静的型付け、高速）
fn typed_func(x: Int, y: Int) -> Int:
    return x + y

# インライン関数（さらに高速化）
@always_inline
fn fast_add(x: Int, y: Int) -> Int:
    return x + y

# ジェネリック関数
fn generic_max[T: Comparable](a: T, b: T) -> T:
    return a if a > b else b
```

### 構造体

```mojo
# 基本的な構造体
struct Point:
    var x: Float64
    var y: Float64

    # コンストラクタ
    fn __init__(inout self, x: Float64, y: Float64):
        self.x = x
        self.y = y

    # メソッド
    fn distance(self) -> Float64:
        return (self.x ** 2 + self.y ** 2) ** 0.5

    # 演算子オーバーロード
    fn __add__(self, other: Point) -> Point:
        return Point(self.x + other.x, self.y + other.y)

# 使用例
fn main():
    let p1 = Point(3.0, 4.0)
    let p2 = Point(1.0, 2.0)
    let p3 = p1 + p2
    print(p1.distance())  # 5.0
```

### ジェネリック構造体

```mojo
struct Vector[ElementType: Movable, size: Int]:
    var data: Pointer[ElementType]

    fn __init__(inout self):
        self.data = Pointer[ElementType].alloc(size)

    fn __getitem__(self, index: Int) -> ElementType:
        return self.data.load(index)

    fn __setitem__(inout self, index: Int, value: ElementType):
        self.data.store(index, value)

# 使用
fn main():
    var vec = Vector[Int, 10]()
    vec[0] = 42
    print(vec[0])
```

## メモリ管理

### 所有権システム

```mojo
# 所有権の移動
fn transfer_ownership(owned data: Vector) -> Vector:
    # dataの所有権を受け取る
    # 処理後に所有権を返す
    return data

# 参照渡し（borrowing）
fn read_only_access(borrowed data: Vector):
    # 読み取り専用アクセス
    print(data.size())

# 可変参照
fn modify_data(inout data: Vector):
    # 変更可能な参照
    data.append(10)

# 使用例
fn main():
    var vec = Vector()

    # 参照渡し（コピーなし）
    read_only_access(vec)

    # 可変参照
    modify_data(vec)

    # 所有権移動
    vec = transfer_ownership(vec^)  # ^で所有権を移動
```

### ポインタ操作

```mojo
fn pointer_example():
    # メモリ確保
    let ptr = Pointer[Int].alloc(10)

    # 値の書き込み
    for i in range(10):
        ptr.store(i, i * 2)

    # 値の読み取り
    for i in range(10):
        print(ptr.load(i))

    # メモリ解放
    ptr.free()
```

## SIMD最適化

### ベクトル演算

```mojo
from math import sqrt

# SIMD型を使った高速計算
fn simd_distance() -> SIMD[DType.float32, 4]:
    # 4つの値を同時に処理
    let x = SIMD[DType.float32, 4](1.0, 2.0, 3.0, 4.0)
    let y = SIMD[DType.float32, 4](5.0, 6.0, 7.0, 8.0)

    let diff = x - y
    return sqrt(diff * diff)

# 大量データの処理
fn process_array(data: Pointer[Float32], size: Int):
    # 8要素ずつ並列処理
    alias simd_width = 8

    for i in range(0, size, simd_width):
        # SIMDで一括処理
        var chunk = data.simd_load[simd_width](i)
        chunk = chunk * 2.0 + 1.0
        data.simd_store(i, chunk)
```

## パラレル処理

### マルチスレッド

```mojo
from algorithm import parallelize

fn parallel_sum(data: Pointer[Int], size: Int) -> Int:
    # 並列集計
    var result: Atomic[Int] = 0

    @parameter
    fn worker(i: Int):
        result.fetch_add(data[i])

    # 自動的にCPUコア数に応じて並列化
    parallelize[worker](size)

    return result.value

# 行列積の並列化
fn parallel_matmul(A: Matrix, B: Matrix) -> Matrix:
    var C = Matrix(A.rows, B.cols)

    @parameter
    fn compute_row(i: Int):
        for j in range(B.cols):
            var sum: Float64 = 0
            for k in range(A.cols):
                sum += A[i, k] * B[k, j]
            C[i, j] = sum

    parallelize[compute_row](A.rows)
    return C
```

## Pythonとの相互運用

### Pythonモジュールのインポート

```mojo
from python import Python

fn use_numpy():
    # NumPyをインポート
    let np = Python.import_module("numpy")

    # NumPy配列を作成
    let arr = np.array([1, 2, 3, 4, 5])

    # NumPy関数を呼び出し
    let mean = np.mean(arr)
    print("Mean:", mean)

fn use_pandas():
    let pd = Python.import_module("pandas")

    # DataFrameを作成
    let data = Python.dict()
    data["name"] = ["Alice", "Bob", "Charlie"]
    data["age"] = [25, 30, 35]

    let df = pd.DataFrame(data)
    print(df)
```

### Mojoから呼び出せるPythonライブラリ

```mojo
fn ml_example():
    # scikit-learn
    let sklearn = Python.import_module("sklearn")
    let LinearRegression = sklearn.linear_model.LinearRegression

    # matplotlib
    let plt = Python.import_module("matplotlib.pyplot")

    # requests
    let requests = Python.import_module("requests")
    let response = requests.get("https://api.example.com/data")
```

## 実践例: 高速な画像処理

```mojo
from memory import memset_zero
from algorithm import parallelize

struct Image:
    var width: Int
    var height: Int
    var data: Pointer[UInt8]

    fn __init__(inout self, width: Int, height: Int):
        self.width = width
        self.height = height
        self.data = Pointer[UInt8].alloc(width * height * 3)

    fn __del__(owned self):
        self.data.free()

    # グレースケール変換（並列化）
    fn to_grayscale(inout self):
        @parameter
        fn process_pixel(i: Int):
            let r = self.data[i * 3]
            let g = self.data[i * 3 + 1]
            let b = self.data[i * 3 + 2]

            # 輝度計算
            let gray = UInt8((Int(r) * 299 + Int(g) * 587 + Int(b) * 114) / 1000)

            self.data[i * 3] = gray
            self.data[i * 3 + 1] = gray
            self.data[i * 3 + 2] = gray

        parallelize[process_pixel](self.width * self.height)

    # ガウシアンブラー（SIMD最適化）
    fn gaussian_blur(inout self, radius: Int):
        alias simd_width = 8
        let total_pixels = self.width * self.height

        @parameter
        fn blur_row(i: Int):
            for j in range(0, self.width, simd_width):
                # SIMD処理でブラー計算
                var r_sum = SIMD[DType.float32, simd_width](0)
                var g_sum = SIMD[DType.float32, simd_width](0)
                var b_sum = SIMD[DType.float32, simd_width](0)

                # カーネル適用
                for dy in range(-radius, radius + 1):
                    for dx in range(-radius, radius + 1):
                        # 畳み込み演算
                        ...

                # 結果を書き戻し
                ...

        parallelize[blur_row](self.height)
```

## 実践例: 機械学習（ニューラルネットワーク）

```mojo
struct Dense:
    var weights: Matrix
    var bias: Vector

    fn __init__(inout self, input_size: Int, output_size: Int):
        self.weights = Matrix.random(input_size, output_size)
        self.bias = Vector.zeros(output_size)

    fn forward(self, input: Vector) -> Vector:
        # 行列積 + バイアス
        return self.weights @ input + self.bias

    fn backward(inout self, grad: Vector, input: Vector) -> Vector:
        # 勾配計算
        let grad_input = self.weights.T @ grad
        let grad_weights = input.outer(grad)

        # 重み更新
        self.weights -= grad_weights * 0.01
        self.bias -= grad * 0.01

        return grad_input

struct NeuralNetwork:
    var layer1: Dense
    var layer2: Dense

    fn __init__(inout self):
        self.layer1 = Dense(784, 128)
        self.layer2 = Dense(128, 10)

    fn forward(self, input: Vector) -> Vector:
        var x = self.layer1.forward(input)
        x = relu(x)
        return self.layer2.forward(x)

    fn train(inout self, inputs: Matrix, labels: Matrix, epochs: Int):
        for epoch in range(epochs):
            var total_loss: Float64 = 0

            for i in range(inputs.rows):
                # フォワードパス
                let output = self.forward(inputs[i])

                # 損失計算
                let loss = cross_entropy(output, labels[i])
                total_loss += loss

                # バックプロパゲーション
                let grad = output - labels[i]
                self.backward(grad, inputs[i])

            print("Epoch", epoch, "Loss:", total_loss / inputs.rows)

fn relu(x: Vector) -> Vector:
    var result = Vector(x.size)
    for i in range(x.size):
        result[i] = max(0, x[i])
    return result
```

## ベンチマーク比較

### 行列積のパフォーマンス

```mojo
from benchmark import Benchmark

# Python（NumPy）
fn benchmark_numpy():
    let np = Python.import_module("numpy")
    let A = np.random.rand(1000, 1000)
    let B = np.random.rand(1000, 1000)

    @parameter
    fn run():
        _ = np.matmul(A, B)

    let result = Benchmark().run[run]()
    print("NumPy:", result.mean(), "ms")

# Mojo（最適化版）
fn benchmark_mojo():
    let A = Matrix.random(1000, 1000)
    let B = Matrix.random(1000, 1000)

    @parameter
    fn run():
        _ = matmul_optimized(A, B)

    let result = Benchmark().run[run]()
    print("Mojo:", result.mean(), "ms")

# 結果（例）
# NumPy: 120ms
# Mojo: 5ms（24倍高速）
```

## エラーハンドリング

```mojo
# Resultタイプ
fn divide(a: Int, b: Int) -> Result[Int, String]:
    if b == 0:
        return Err("Division by zero")
    return Ok(a / b)

# 使用例
fn main():
    let result = divide(10, 2)

    if result.is_ok():
        print("Result:", result.unwrap())
    else:
        print("Error:", result.err())

    # matchパターン
    match result:
        case Ok(value):
            print("Success:", value)
        case Err(error):
            print("Error:", error)
```

## モジュールとパッケージ

```mojo
# my_module.mojo
struct MyStruct:
    var value: Int

fn my_function() -> Int:
    return 42

# main.mojo
from my_module import MyStruct, my_function

fn main():
    let obj = MyStruct(10)
    let result = my_function()
```

## まとめ

Mojoは**AI・機械学習**と**高性能コンピューティング**のための次世代言語です。

### Mojoの主要な利点

1. **圧倒的な高速性** - Pythonの100倍以上
2. **Python互換** - 既存のコードを段階的に最適化
3. **メモリ安全** - Rustのような所有権システム
4. **ハードウェア最適化** - SIMD、並列処理を簡単に実装
5. **生産性** - Pythonの書きやすさを維持

### 採用を検討すべきケース

**最適**:
- 機械学習モデルのトレーニング・推論
- 画像・動画処理
- 科学技術計算
- 高性能Webサーバー
- ゲームエンジン

**既存の選択肢も検討**:
- Web開発 → Python/JavaScript（十分高速）
- システムプログラミング → Rust（成熟したエコシステム）
- アプリ開発 → Swift/Kotlin（プラットフォーム統合）

Mojoはまだ発展途上ですが、**パフォーマンスが重要なドメイン**で既に実用レベルに達しています。Pythonユーザーにとって、段階的な移行が可能な点が大きな魅力です。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
