---
title: "WebAssembly入門2026 — Webの限界を超える技術"
description: "Rust・C++からWasmへのビルド、JavaScriptとの連携、画像処理・ゲーム・暗号化などの実用例、WASI（サーバーサイドWasm）まで完全解説。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2026-02-05"
tags: ["WebAssembly", "Wasm", "Rust", "C++", "JavaScript"]
heroImage: '../../assets/thumbnails/wasm-web-assembly-guide.jpg'
---

WebAssembly（Wasm）は、Webブラウザ上でネイティブに近い速度でコードを実行できる革新的な技術です。JavaScriptでは実現困難だった高速な画像処理、ゲーム、暗号化処理などを可能にし、Webアプリケーションの可能性を大きく広げています。この記事では、WebAssemblyの基礎から実践的な活用方法まで、2026年の最新情報とともに徹底解説します。

## WebAssemblyとは

WebAssembly（略称: Wasm）は、スタックベースの仮想マシンのためのバイナリ命令フォーマットです。2019年にW3Cの正式な勧告となり、現在ではすべての主要ブラウザでサポートされています。

### WebAssemblyの特徴

**ネイティブに近い実行速度**
Wasmは低レベルのバイナリフォーマットであり、JITコンパイラを経由せず直接実行されるため、JavaScriptよりも高速です。計算集約的なタスクでは、JavaScriptの10〜100倍の速度が得られることもあります。

**言語非依存**
C、C++、Rust、Go、AssemblyScriptなど、さまざまな言語からWasmにコンパイルできます。既存のC/C++ライブラリをWebで再利用することも可能です。

**安全なサンドボックス実行**
Wasmはブラウザのサンドボックス内で実行され、メモリ安全性が保証されています。ネイティブコードのパフォーマンスを得ながら、セキュリティも確保できます。

**小さいバイナリサイズ**
効率的なバイナリフォーマットにより、ファイルサイズが小さく、ネットワーク転送が高速です。

**JavaScriptとの相互運用**
WasmはJavaScriptと共存し、相互に呼び出すことができます。JavaScriptでUIを構築し、重い処理だけWasmに任せる、といった使い方が可能です。

### なぜWebAssemblyが必要か

JavaScriptは非常に優れた言語ですが、計算集約的なタスクには向いていません。

- **画像・動画処理**: フィルタ適用、リサイズ、エンコーディング
- **ゲーム**: 物理演算、3Dレンダリング
- **科学計算**: シミュレーション、データ分析
- **暗号化**: ハッシュ計算、暗号化/復号化
- **コンパイラ**: エディタ内でのコードコンパイル

これらをJavaScriptで実装すると、パフォーマンスがボトルネックになります。Wasmはこの問題を解決します。

## WebAssemblyの基本構造

### Wasmモジュールの構成要素

Wasmモジュールは以下の要素で構成されます。

**メモリ**
線形メモリと呼ばれる連続したバイト配列。JavaScriptとWasm間でデータをやり取りする際に使用します。

**テーブル**
関数参照を格納するための配列。動的な関数呼び出しに使用されます。

**関数**
Wasmの実行単位。エクスポートされた関数はJavaScriptから呼び出せます。

**グローバル変数**
モジュール内で共有される変数。

### テキストフォーマット（WAT）

Wasmはバイナリですが、人間が読めるテキストフォーマット（WAT: WebAssembly Text Format）も存在します。

```wat
(module
  (func $add (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add)
  (export "add" (func $add))
)
```

このWATは、2つの整数を受け取って加算する関数を定義し、JavaScriptからアクセスできるようにエクスポートしています。

### JavaScriptからのロード

ブラウザでWasmを読み込むには、`WebAssembly` APIを使用します。

```javascript
// Fetch and instantiate
const response = await fetch('module.wasm')
const buffer = await response.arrayBuffer()
const { instance } = await WebAssembly.instantiate(buffer)

// Call exported function
const result = instance.exports.add(5, 3)
console.log(result) // 8
```

## Rust → Wasm のビルド

Rustは最もポピュラーなWasmターゲット言語の一つです。メモリ安全性とゼロコスト抽象化により、安全かつ高速なWasmモジュールを作成できます。

### 環境構築

**1. Rustのインストール**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**2. wasm-packのインストール**
wasm-packは、RustコードをWasmにビルドし、npm packageとして公開するためのツールです。

```bash
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

**3. プロジェクト作成**
```bash
cargo new --lib hello-wasm
cd hello-wasm
```

### Cargo.tomlの設定

```toml
[package]
name = "hello-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
```

`wasm-bindgen`は、RustとJavaScript間の相互運用を簡単にするライブラリです。

### Rustコードの作成

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
```

`#[wasm_bindgen]`マクロにより、関数がJavaScriptから呼び出せるようになります。

### ビルド

```bash
wasm-pack build --target web
```

これにより、`pkg`ディレクトリに以下が生成されます。

- `hello_wasm_bg.wasm`: Wasmバイナリ
- `hello_wasm.js`: JavaScriptバインディング
- `hello_wasm.d.ts`: TypeScript型定義

### JavaScriptから使用

```javascript
import init, { fibonacci, greet } from './pkg/hello_wasm.js'

await init() // Wasmモジュールを初期化

console.log(fibonacci(10)) // 55
console.log(greet('World')) // "Hello, World!"
```

### 実践例：画像処理

Rustで画像のグレースケール変換を実装してみましょう。

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn grayscale(data: &mut [u8]) {
    for chunk in data.chunks_mut(4) {
        let r = chunk[0] as f32;
        let g = chunk[1] as f32;
        let b = chunk[2] as f32;

        // グレースケール値を計算
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;

        chunk[0] = gray;
        chunk[1] = gray;
        chunk[2] = gray;
        // chunk[3]はアルファ値なので変更しない
    }
}
```

JavaScript側：

```javascript
import init, { grayscale } from './pkg/image_processor.js'

await init()

const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

// Wasmで画像処理
grayscale(imageData.data)

// 結果を描画
ctx.putImageData(imageData, 0, 0)
```

このコードはJavaScriptで同じ処理をするよりも5〜10倍高速です。

## C++ → Wasm のビルド

既存のC++ライブラリをWebで使いたい場合、Emscriptenを使ってWasmにコンパイルできます。

### Emscriptenのセットアップ

```bash
# Emscriptenのダウンロード
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# 最新版のインストール
./emsdk install latest
./emsdk activate latest

# 環境変数の設定
source ./emsdk_env.sh
```

### C++コードの作成

```cpp
// hello.cpp
#include <emscripten/bind.h>
#include <string>

int add(int a, int b) {
    return a + b;
}

std::string greet(std::string name) {
    return "Hello, " + name + "!";
}

EMSCRIPTEN_BINDINGS(my_module) {
    emscripten::function("add", &add);
    emscripten::function("greet", &greet);
}
```

### ビルド

```bash
emcc hello.cpp -o hello.js \
  -lembind \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1
```

### JavaScriptから使用

```javascript
import Module from './hello.js'

const module = await Module()
console.log(module.add(5, 3)) // 8
console.log(module.greet('Wasm')) // "Hello, Wasm!"
```

### 実践例：暗号化ライブラリ

C++の暗号化ライブラリをWasmで使う例：

```cpp
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <cstring>

// シンプルなXOR暗号化
std::vector<uint8_t> xor_encrypt(const std::vector<uint8_t>& data,
                                  const std::vector<uint8_t>& key) {
    std::vector<uint8_t> result(data.size());
    for (size_t i = 0; i < data.size(); ++i) {
        result[i] = data[i] ^ key[i % key.size()];
    }
    return result;
}

EMSCRIPTEN_BINDINGS(crypto_module) {
    emscripten::function("xorEncrypt", &xor_encrypt);
    emscripten::register_vector<uint8_t>("VectorUint8");
}
```

JavaScript側：

```javascript
import Module from './crypto.js'

const module = await Module()
const data = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
const key = new Uint8Array([42])

const encrypted = module.xorEncrypt(data, key)
console.log(encrypted)
```

## JavaScriptとの連携

WasmとJavaScriptは密接に連携できます。それぞれの得意分野を活かした設計が重要です。

### データの受け渡し

**プリミティブ型**
整数、浮動小数点数はそのまま受け渡しできます。

```rust
#[wasm_bindgen]
pub fn calculate(x: f64, y: f64) -> f64 {
    x * y + 10.0
}
```

**文字列**
wasm-bindgenが自動的に変換します。

```rust
#[wasm_bindgen]
pub fn process_text(text: &str) -> String {
    text.to_uppercase()
}
```

**配列・バッファ**
大きなデータは共有メモリを使って効率的にやり取りします。

```rust
#[wasm_bindgen]
pub fn process_array(data: &mut [f64]) {
    for item in data.iter_mut() {
        *item = item.sqrt();
    }
}
```

**複雑なオブジェクト**
JSONやserde経由でシリアライズします。

```rust
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct User {
    name: String,
    age: u32,
}

#[wasm_bindgen]
pub fn create_user(json: &str) -> JsValue {
    let user: User = serde_json::from_str(json).unwrap();
    // ... process user
    serde_wasm_bindgen::to_value(&user).unwrap()
}
```

### パフォーマンス最適化

**メモリコピーを減らす**
大きなデータは共有メモリを使い、コピーを避けます。

```rust
#[wasm_bindgen]
pub fn get_memory_ptr() -> *const u8 {
    // Wasmのメモリへのポインタを返す
    // JavaScriptから直接アクセス可能
}
```

**関数呼び出しのオーバーヘッド**
頻繁に呼び出される小さな関数は、まとめて一度に処理します。

```rust
// 悪い例：ループの中でJS呼び出し
for i in 0..1000 {
    call_js_function(i);
}

// 良い例：まとめて処理
#[wasm_bindgen]
pub fn process_batch(count: usize) {
    // Wasm内で完結
}
```

### TypeScript統合

wasm-packはTypeScript型定義も自動生成します。

```typescript
import init, { fibonacci, greet } from './pkg/hello_wasm'

await init()

const result: number = fibonacci(10)
const message: string = greet('TypeScript')
```

型安全性が確保され、IDEの補完も効きます。

## ユースケース

### 1. 画像処理

Photopea（https://www.photopea.com/）のような高度な画像エディタがWasmで実装されています。

**実装例：画像フィルタ**
```rust
#[wasm_bindgen]
pub fn apply_blur(data: &mut [u8], width: usize, height: usize, radius: usize) {
    // ガウシアンブラーの実装
    // JavaScriptで実装すると遅いが、Wasmなら高速
}
```

### 2. ゲーム

UnityやUnrealEngineはWasmエクスポートをサポートしています。

**実装例：物理演算**
```rust
#[wasm_bindgen]
pub struct PhysicsEngine {
    bodies: Vec<Body>,
}

#[wasm_bindgen]
impl PhysicsEngine {
    pub fn step(&mut self, delta_time: f64) {
        // 物理シミュレーション
        for body in &mut self.bodies {
            body.update(delta_time);
        }
    }
}
```

### 3. 暗号化

bcrypt、argon2などの計算コストの高い暗号化をWasmで実行します。

```rust
use argon2::{self, Config};

#[wasm_bindgen]
pub fn hash_password(password: &str) -> String {
    let salt = b"randomsalt";
    let config = Config::default();
    argon2::hash_encoded(password.as_bytes(), salt, &config).unwrap()
}
```

### 4. コンパイラ・インタプリタ

Monaco Editor（VS Codeのエディタ部分）はTypeScriptコンパイラをWasmで実行しています。

### 5. データ圧縮

```rust
use flate2::write::GzEncoder;
use flate2::Compression;
use std::io::Write;

#[wasm_bindgen]
pub fn compress(data: &[u8]) -> Vec<u8> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(data).unwrap();
    encoder.finish().unwrap()
}
```

## WASI（WebAssembly System Interface）

WASIは、Wasmをブラウザ外（サーバーサイド、CLI、IoTなど）で実行するための標準インターフェースです。

### WASIとは

WASIは、Wasmモジュールがファイルシステム、ネットワーク、環境変数などのシステムリソースにアクセスするための標準APIです。「一度書けばどこでも実行できる」ユニバーサルバイナリを実現します。

### WASIの利点

**ポータビリティ**
Linux、Windows、macOS、さらにはIoTデバイスでも同じWasmバイナリが動作します。

**セキュリティ**
capability-basedセキュリティモデルにより、明示的に許可されたリソースにしかアクセスできません。

**軽量**
コンテナよりもはるかに軽量で、起動が高速です。

### WASIの実行環境

**Wasmtime**
最も人気のあるWASIランタイム。

```bash
# インストール
curl https://wasmtime.dev/install.sh -sSf | bash

# 実行
wasmtime run program.wasm
```

**Wasmer**
Wasmtimeと並ぶ主要ランタイム。

```bash
# インストール
curl https://get.wasmer.io -sSf | sh

# 実行
wasmer run program.wasm
```

### RustでWASIプログラムを作成

```rust
use std::env;
use std::fs;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: {} <filename>", args[0]);
        return;
    }

    let contents = fs::read_to_string(&args[1])
        .expect("Failed to read file");

    println!("File contents:\n{}", contents);
}
```

ビルド：

```bash
rustup target add wasm32-wasi
cargo build --target wasm32-wasi --release
```

実行：

```bash
wasmtime run target/wasm32-wasi/release/myprogram.wasm -- test.txt
```

### WASIのユースケース

**サーバーレス関数**
Cloudflare WorkersやFastlyのCompute@Edgeは、WASIベースのサーバーレスプラットフォームです。

**プラグインシステム**
安全にサードパーティコードを実行できます。

**CLIツール**
クロスプラットフォームのCLIツールをWasmで配布できます。

## まとめ

WebAssemblyは、Webアプリケーションの可能性を大きく広げる技術です。JavaScriptでは実現困難だった高速な処理を可能にし、既存のC/C++/Rustライブラリを活用できます。

### WebAssemblyを使うべきケース

- 計算集約的な処理（画像処理、暗号化、シミュレーション）
- 既存のネイティブライブラリの再利用
- ゲームや3Dアプリケーション
- 大量のデータ処理

### WebAssemblyを使わないケース

- 単純なDOM操作
- 小規模なビジネスロジック
- ネットワークI/O中心の処理

2026年現在、WebAssemblyは成熟した技術として、多くのプロダクションアプリケーションで使用されています。Figma、Google Earth、AutoCADなどの有名サービスもWasmを活用しています。

Rustの台頭により、Wasmの開発体験は大きく向上しました。wasm-packやwasm-bindgenのような優れたツールにより、初心者でも簡単にWasmアプリケーションを構築できます。

またWASIにより、Wasmはブラウザを超えてサーバーサイド、エッジコンピューティング、IoTなど、さまざまな環境で利用できるようになっています。

WebAssemblyは、Webの未来を形作る重要な技術です。ぜひ実際に試して、その可能性を体験してみてください。
