---
title: 'WebAssembly（WASM）完全ガイド — ブラウザで高速実行・Rust/C++・WASI・コンポーネントモデル'
description: 'WebAssemblyをブラウザと Node.jsで活用する完全ガイド。WASM基礎・Rust/wasm-pack・wasm-bindgen・JavaScript連携・WASI・Wasmtime・コンポーネントモデル・パフォーマンスまで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['WebAssembly', 'WASM', 'Rust', 'パフォーマンス', 'ブラウザ']
---

WebAssembly（WASM）は、ブラウザ上でネイティブに近いパフォーマンスを実現するバイナリ命令フォーマットだ。2019年にW3Cの正式勧告となり、現在ではRust・C++・Goなど多様な言語からコンパイルしてブラウザで実行できる。画像処理・暗号化・物理シミュレーション・ゲームエンジンなど、JavaScriptだけでは性能が足りないユースケースを一気に解決する技術として、フロントエンドエンジニアにとって習得必須のスキルとなっている。

本記事では、WASMの基礎から実践的な実装まで、Rust・C++・JavaScriptの具体的なコード例を交えながら徹底解説する。

---

## 1. WebAssemblyとは — JavaScriptとの違い・パフォーマンス比較

### WASMの本質

WebAssemblyは「Webブラウザ上で動作する低レベルのバイナリ命令フォーマット」だ。JavaScriptとは根本的に異なるアプローチを取る。

| 比較項目 | JavaScript | WebAssembly |
|---------|-----------|-------------|
| 形式 | テキスト（ソースコード） | バイナリ（.wasm） |
| 実行方法 | JITコンパイル | AOTコンパイル済み |
| 型システム | 動的型付け | 静的型付け（i32/i64/f32/f64） |
| メモリ管理 | GC自動管理 | 手動（線形メモリ） |
| 起動時間 | 高速 | 非常に高速（バイナリ解析のみ） |
| 最大パフォーマンス | JIT最適化次第 | ネイティブの60〜100% |
| DOM操作 | 直接可能 | JS経由が必要 |

### なぜWASMが必要か

JavaScriptはJITコンパイラの最適化により非常に高速になったが、数値計算・ビット演算・メモリ集約処理においては、コンパイル型言語と比較して依然として遅い。具体的に：

- **画像・動画フィルタリング**: ピクセル単位のビット演算をループ処理する場合
- **暗号化・ハッシュ計算**: AES-GCM・SHA-256などの演算集約処理
- **物理シミュレーション**: 大量オブジェクトの衝突検出・剛体演算
- **音声処理**: リアルタイムエフェクト・FFT演算

これらのユースケースでWASMはJavaScriptより**2〜20倍**の速度向上を実現することが多い。

### WASMのサンドボックスモデル

WASMはセキュリティを最優先に設計されている。実行環境は完全にサンドボックス化されており：

- 線形メモリ（Linear Memory）のみアクセス可能
- ホスト環境へのアクセスは明示的な`import`のみ
- スタックオーバーフローやメモリ境界違反は即座にトラップ
- サイドチャネル攻撃への対策も仕様レベルで検討済み

---

## 2. WASMバイナリ形式と .wat（テキスト形式）

### バイナリ構造

.wasmファイルはセクションの連続体だ。主要セクション：

```
Magic: 0x00 0x61 0x73 0x6D  (= "\0asm")
Version: 0x01 0x00 0x00 0x00

[type section]     - 関数シグネチャの定義
[import section]   - 外部関数・メモリ・テーブルのインポート
[function section] - 関数インデックスとtype参照
[table section]    - 関数ポインタテーブル（間接呼び出し用）
[memory section]   - 線形メモリサイズ定義
[global section]   - グローバル変数
[export section]   - 外部公開する関数・メモリ・テーブル
[element section]  - テーブル初期化
[code section]     - 関数の実際の命令列
[data section]     - メモリ初期化データ
```

### WAT（WebAssembly Text Format）

バイナリの可読テキスト表現がWAT（.wat）だ。S式（Lisp風）で記述する。

```wat
;; simple_math.wat
(module
  ;; 2つの整数を加算する関数
  (func $add (export "add") (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add
  )

  ;; フィボナッチ数列（再帰）
  (func $fib (export "fib") (param $n i32) (result i32)
    (if (result i32) (i32.le_s (local.get $n) (i32.const 1))
      (then (local.get $n))
      (else
        (i32.add
          (call $fib (i32.sub (local.get $n) (i32.const 1)))
          (call $fib (i32.sub (local.get $n) (i32.const 2)))
        )
      )
    )
  )

  ;; メモリ（64KB単位のページ）
  (memory (export "mem") 1)

  ;; バイト配列合計
  (func $sum_bytes (export "sumBytes") (param $offset i32) (param $len i32) (result i32)
    (local $i i32)
    (local $total i32)
    (local.set $i (i32.const 0))
    (local.set $total (i32.const 0))
    (block $break
      (loop $loop
        (br_if $break (i32.ge_s (local.get $i) (local.get $len)))
        (local.set $total
          (i32.add
            (local.get $total)
            (i32.load8_u (i32.add (local.get $offset) (local.get $i)))
          )
        )
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $loop)
      )
    )
    local.get $total
  )
)
```

WATからWASMへの変換はwat2wasmツールで行う：

```bash
# wabt（WebAssembly Binary Toolkit）をインストール
brew install wabt

# WATをWASMに変換
wat2wasm simple_math.wat -o simple_math.wasm

# WASMをWATに逆変換（デバッグ用）
wasm2wat simple_math.wasm -o output.wat

# WASMの情報表示
wasm-objdump -h simple_math.wasm
wasm-objdump -x simple_math.wasm  # 詳細表示
```

---

## 3. JavaScript ↔ WASM 連携（importObject・Memory・Table）

### 基本的なWASMロード

```javascript
// wasm-loader.js

// 方法1: fetch + WebAssembly.instantiateStreaming（推奨・最速）
async function loadWasm(url, importObject = {}) {
  const response = await fetch(url);
  const result = await WebAssembly.instantiateStreaming(response, importObject);
  return result.instance;
}

// 方法2: ArrayBuffer経由（サーバー環境・古いブラウザ向け）
async function loadWasmBuffer(url, importObject = {}) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const result = await WebAssembly.instantiate(buffer, importObject);
  return result.instance;
}

// 使用例
const wasmInstance = await loadWasm('/wasm/simple_math.wasm');
console.log(wasmInstance.exports.add(3, 4));    // 7
console.log(wasmInstance.exports.fib(10));      // 55
```

### importObject — JSからWASMへの関数提供

WASMモジュールはJavaScript側から関数・メモリ・テーブルをインポートできる。

```javascript
// host_functions.js

// WASMに提供するホスト関数を定義
const importObject = {
  // モジュール名は.watの(import "env" ...)に対応
  env: {
    // コンソール出力（WASMから呼び出し可能）
    consoleLog: (value) => {
      console.log('WASM says:', value);
    },

    // ランダム数生成
    random: () => Math.random(),

    // 現在時刻（ミリ秒）
    now: () => performance.now(),

    // 共有メモリ（下記参照）
    memory: new WebAssembly.Memory({ initial: 10, maximum: 100 }),
  },

  // 複数モジュールをインポートする場合
  math: {
    sqrt: Math.sqrt,
    sin: Math.sin,
    cos: Math.cos,
  },
};

const instance = await WebAssembly.instantiateStreaming(
  fetch('/wasm/advanced.wasm'),
  importObject
);
```

対応するWAT側のimport宣言：

```wat
(module
  ;; JavaScriptからのインポート
  (import "env" "consoleLog" (func $log (param i32)))
  (import "env" "random" (func $random (result f64)))
  (import "env" "memory" (memory 10))
  (import "math" "sqrt" (func $sqrt (param f64) (result f64)))

  ;; エクスポート関数でホスト関数を使用
  (func (export "compute") (result f64)
    (call $log (i32.const 42))
    (call $sqrt (f64.const 2.0))
  )
)
```

### WebAssembly.Memory — 線形メモリの共有

WASMとJavaScript間でメモリを共有することで、大量データを効率的にやり取りできる。

```javascript
// memory_sharing.js

// メモリを作成（1ページ = 64KB）
const memory = new WebAssembly.Memory({
  initial: 4,    // 4ページ = 256KB
  maximum: 16,   // 最大16ページ = 1MB
  shared: false, // SharedArrayBufferを使う場合はtrue
});

const importObject = {
  env: { memory },
};

const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/wasm/image_processor.wasm'),
  importObject
);

const { processImage, allocate, deallocate } = instance.exports;

// WASM側でアロケートされた領域にJSからデータを書き込む
function processImageData(imageData) {
  const byteLength = imageData.data.length;

  // WASMのアロケータでメモリ確保
  const ptr = allocate(byteLength);

  // MemoryBufferはDetachされることがあるので毎回取得
  const wasmMemory = new Uint8Array(memory.buffer);

  // JSのImageDataをWASMメモリにコピー
  wasmMemory.set(imageData.data, ptr);

  // WASM関数で処理
  processImage(ptr, imageData.width, imageData.height);

  // 処理結果をJSに読み取り
  const resultData = new Uint8ClampedArray(
    memory.buffer,
    ptr,
    byteLength
  );

  // コピーを作成（WASMメモリが解放される前に）
  const output = new Uint8ClampedArray(resultData);

  // メモリ解放
  deallocate(ptr, byteLength);

  return new ImageData(output, imageData.width, imageData.height);
}
```

### WebAssembly.Table — 間接関数呼び出し

Tableは関数ポインタのテーブルで、動的ディスパッチや関数ポインタを扱う言語（C/C++の関数ポインタ、Rustのトレイトオブジェクト）のコンパイル結果で使われる。

```javascript
// table_example.js

// JavaScriptからTableを作成して提供
const table = new WebAssembly.Table({
  element: 'anyfunc',
  initial: 10,
  maximum: 100,
});

// テーブルにJS関数を登録（コールバック用途）
table.set(0, (x) => x * 2);
table.set(1, (x) => x + 10);
table.set(2, (x) => Math.sqrt(x));

const importObject = {
  env: { table },
};
```

---

## 4. Rust + wasm-pack — セットアップから npm publish まで

### 環境構築

```bash
# Rustのインストール（未インストールの場合）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# WASMターゲットの追加
rustup target add wasm32-unknown-unknown

# wasm-packのインストール
cargo install wasm-pack

# wasm-bindgen-cliのインストール（オプション・デバッグ用）
cargo install wasm-bindgen-cli

# バージョン確認
wasm-pack --version
rustc --version
cargo --version
```

### プロジェクト作成

```bash
# wasm-packテンプレートからプロジェクト生成
cargo new --lib wasm-image-processor
cd wasm-image-processor
```

`Cargo.toml`の設定：

```toml
[package]
name = "wasm-image-processor"
version = "0.1.0"
edition = "2021"
description = "High-performance image processing via WebAssembly"
license = "MIT"

[lib]
crate-type = ["cdylib", "rlib"]
# cdylib: 動的ライブラリ（WASM用）
# rlib: Rustライブラリ（テスト・他Rustクレートからの利用）

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = [
  "console",
  "ImageData",
  "CanvasRenderingContext2d",
  "HtmlCanvasElement",
]}
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"

[dependencies.web-sys]
version = "0.3"
features = [
  "console",
  "Window",
  "Document",
  "Element",
  "HtmlImageElement",
]

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
# WASMサイズ最適化
opt-level = "z"       # サイズ最小化
lto = true            # リンク時最適化
codegen-units = 1     # 最大最適化（ビルド時間増加）
panic = "abort"       # unwindなし（バイナリサイズ削減）
```

### wasm-bindgenによる実装

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// panic時にconsole.errorに出力（デバッグ用）
#[cfg(feature = "console_error_panic_hook")]
pub use console_error_panic_hook::set_once as set_panic_hook;

// JavaScript console.logのバインディング
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_u32(a: u32);
}

// マクロでconsole.logを使いやすく
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// --- 基本的な数値計算 ---

/// フィボナッチ数列（反復版）
#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u64 {
    if n <= 1 {
        return n as u64;
    }
    let (mut a, mut b) = (0u64, 1u64);
    for _ in 2..=n {
        let c = a + b;
        a = b;
        b = c;
    }
    b
}

/// 素数判定（エラトステネスの篩）
#[wasm_bindgen]
pub fn sieve_of_eratosthenes(limit: usize) -> Vec<u32> {
    let mut is_prime = vec![true; limit + 1];
    is_prime[0] = false;
    if limit > 0 {
        is_prime[1] = false;
    }

    let mut i = 2;
    while i * i <= limit {
        if is_prime[i] {
            let mut j = i * i;
            while j <= limit {
                is_prime[j] = false;
                j += i;
            }
        }
        i += 1;
    }

    is_prime
        .iter()
        .enumerate()
        .filter(|(_, &p)| p)
        .map(|(i, _)| i as u32)
        .collect()
}

// --- 画像処理 ---

/// グレースケール変換（RGBA → グレースケールRGBA）
#[wasm_bindgen]
pub fn grayscale(data: &mut [u8]) {
    assert_eq!(data.len() % 4, 0, "データ長は4の倍数である必要があります");

    for chunk in data.chunks_mut(4) {
        // NTSC輝度重み付け
        let gray = (0.2126 * chunk[0] as f32
            + 0.7152 * chunk[1] as f32
            + 0.0722 * chunk[2] as f32) as u8;
        chunk[0] = gray;
        chunk[1] = gray;
        chunk[2] = gray;
        // chunk[3] はアルファ値（変更しない）
    }
}

/// ガウシアンぼかし（3x3カーネル）
#[wasm_bindgen]
pub fn gaussian_blur(data: &[u8], width: u32, height: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let kernel: [f32; 9] = [
        1.0 / 16.0, 2.0 / 16.0, 1.0 / 16.0,
        2.0 / 16.0, 4.0 / 16.0, 2.0 / 16.0,
        1.0 / 16.0, 2.0 / 16.0, 1.0 / 16.0,
    ];

    let mut output = vec![0u8; data.len()];

    for y in 0..h {
        for x in 0..w {
            let mut r = 0.0f32;
            let mut g = 0.0f32;
            let mut b = 0.0f32;

            for ky in 0..3usize {
                for kx in 0..3usize {
                    let px = (x + kx).saturating_sub(1).min(w - 1);
                    let py = (y + ky).saturating_sub(1).min(h - 1);
                    let idx = (py * w + px) * 4;
                    let weight = kernel[ky * 3 + kx];

                    r += data[idx] as f32 * weight;
                    g += data[idx + 1] as f32 * weight;
                    b += data[idx + 2] as f32 * weight;
                }
            }

            let out_idx = (y * w + x) * 4;
            output[out_idx] = r as u8;
            output[out_idx + 1] = g as u8;
            output[out_idx + 2] = b as u8;
            output[out_idx + 3] = data[out_idx + 3]; // アルファ保持
        }
    }

    output
}

/// エッジ検出（Sobel演算子）
#[wasm_bindgen]
pub fn sobel_edge_detect(data: &[u8], width: u32, height: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;

    // まずグレースケール化
    let mut gray = vec![0u8; w * h];
    for y in 0..h {
        for x in 0..w {
            let idx = (y * w + x) * 4;
            gray[y * w + x] = (0.2126 * data[idx] as f32
                + 0.7152 * data[idx + 1] as f32
                + 0.0722 * data[idx + 2] as f32) as u8;
        }
    }

    let gx_kernel: [i32; 9] = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    let gy_kernel: [i32; 9] = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    let mut output = vec![0u8; data.len()];

    for y in 1..h - 1 {
        for x in 1..w - 1 {
            let mut gx = 0i32;
            let mut gy = 0i32;

            for ky in 0..3usize {
                for kx in 0..3usize {
                    let px = x + kx - 1;
                    let py = y + ky - 1;
                    let v = gray[py * w + px] as i32;
                    gx += v * gx_kernel[ky * 3 + kx];
                    gy += v * gy_kernel[ky * 3 + kx];
                }
            }

            let magnitude = ((gx * gx + gy * gy) as f32).sqrt().min(255.0) as u8;
            let out_idx = (y * w + x) * 4;
            output[out_idx] = magnitude;
            output[out_idx + 1] = magnitude;
            output[out_idx + 2] = magnitude;
            output[out_idx + 3] = 255;
        }
    }

    output
}

// --- 構造体のエクスポート ---

#[derive(Serialize, Deserialize)]
pub struct ImageStats {
    pub min: u8,
    pub max: u8,
    pub mean: f64,
    pub std_dev: f64,
}

#[wasm_bindgen]
pub struct WasmImageProcessor {
    width: u32,
    height: u32,
    data: Vec<u8>,
}

#[wasm_bindgen]
impl WasmImageProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> Self {
        console_log!("WasmImageProcessor created: {}x{}", width, height);
        Self {
            width,
            height,
            data: vec![0u8; (width * height * 4) as usize],
        }
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    /// データポインタをJSに返す（ゼロコピーアクセス用）
    pub fn data_ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }

    pub fn data_len(&self) -> usize {
        self.data.len()
    }

    /// グレースケール変換を適用
    pub fn apply_grayscale(&mut self) {
        grayscale(&mut self.data);
    }

    /// ガウシアンぼかしを適用
    pub fn apply_blur(&mut self) {
        let blurred = gaussian_blur(&self.data, self.width, self.height);
        self.data = blurred;
    }

    /// 統計情報をJsValueとして返す
    pub fn get_stats(&self) -> JsValue {
        let pixels: Vec<u8> = self.data.iter()
            .enumerate()
            .filter(|(i, _)| i % 4 != 3) // アルファを除く
            .map(|(_, &v)| v)
            .collect();

        let min = *pixels.iter().min().unwrap_or(&0);
        let max = *pixels.iter().max().unwrap_or(&0);
        let mean = pixels.iter().map(|&v| v as f64).sum::<f64>() / pixels.len() as f64;
        let variance = pixels.iter()
            .map(|&v| {
                let diff = v as f64 - mean;
                diff * diff
            })
            .sum::<f64>() / pixels.len() as f64;

        let stats = ImageStats {
            min,
            max,
            mean,
            std_dev: variance.sqrt(),
        };

        serde_wasm_bindgen::to_value(&stats).unwrap()
    }
}
```

### ビルドとnpm publish

```bash
# ブラウザ向けビルド
wasm-pack build --target web --out-dir pkg

# Node.js向けビルド
wasm-pack build --target nodejs --out-dir pkg-node

# バンドラー向け（webpack/vite）
wasm-pack build --target bundler --out-dir pkg-bundler

# リリースビルド（サイズ最適化）
wasm-pack build --release --target web

# 生成されるファイル
# pkg/
# ├── package.json          - npmパッケージ設定
# ├── wasm_image_processor.js    - JSラッパー
# ├── wasm_image_processor_bg.wasm  - WASMバイナリ
# ├── wasm_image_processor.d.ts  - TypeScript型定義
# └── wasm_image_processor_bg.wasm.d.ts

# npmにpublish
cd pkg
npm publish --access public
```

生成される `package.json` の例：

```json
{
  "name": "wasm-image-processor",
  "version": "0.1.0",
  "description": "High-performance image processing via WebAssembly",
  "main": "wasm_image_processor.js",
  "types": "wasm_image_processor.d.ts",
  "files": [
    "wasm_image_processor_bg.wasm",
    "wasm_image_processor.js",
    "wasm_image_processor.d.ts"
  ],
  "keywords": ["wasm", "webassembly", "image-processing"],
  "license": "MIT"
}
```

---

## 5. C/C++ → Emscripten（既存コードのポーティング）

### Emscriptenのセットアップ

```bash
# Emscripten SDKのインストール
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

# バージョン確認
emcc --version
```

### 既存CコードのWASMコンパイル

```c
// image_filter.c（既存のCコード）
#include <stdint.h>
#include <stdlib.h>
#include <math.h>
#include <emscripten/emscripten.h>

// EMSCRIPTEN_KEEPALIVEでデッドコード除去を防ぐ
EMSCRIPTEN_KEEPALIVE
void apply_sepia(uint8_t* data, int length) {
    for (int i = 0; i < length; i += 4) {
        uint8_t r = data[i];
        uint8_t g = data[i + 1];
        uint8_t b = data[i + 2];

        uint16_t nr = (uint16_t)(r * 0.393 + g * 0.769 + b * 0.189);
        uint16_t ng = (uint16_t)(r * 0.349 + g * 0.686 + b * 0.168);
        uint16_t nb = (uint16_t)(r * 0.272 + g * 0.534 + b * 0.131);

        data[i]     = nr > 255 ? 255 : (uint8_t)nr;
        data[i + 1] = ng > 255 ? 255 : (uint8_t)ng;
        data[i + 2] = nb > 255 ? 255 : (uint8_t)nb;
    }
}

EMSCRIPTEN_KEEPALIVE
uint8_t* allocate_buffer(int size) {
    return (uint8_t*)malloc(size);
}

EMSCRIPTEN_KEEPALIVE
void free_buffer(uint8_t* ptr) {
    free(ptr);
}
```

```bash
# コンパイルコマンド（最適化オプション付き）
emcc image_filter.c \
  -O3 \
  -o image_filter.js \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_apply_sepia", "_allocate_buffer", "_free_buffer", "_malloc", "_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "HEAPU8"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=16777216 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="ImageFilterModule"

# ESモジュール形式でビルド
emcc image_filter.c \
  -O3 \
  -o image_filter.mjs \
  -s WASM=1 \
  -s EXPORT_ES6=1 \
  -s USE_ES6_IMPORT_META=0 \
  -s MODULARIZE=1
```

### EmscriptenモジュールのJS使用

```javascript
// use_emscripten.js
import ImageFilterModule from './image_filter.mjs';

async function createFilter() {
  // モジュール初期化
  const Module = await ImageFilterModule();

  // cwrapで型付きラッパーを作成
  const applySepia = Module.cwrap(
    'apply_sepia',    // C関数名
    null,             // 戻り値の型 (void)
    ['number', 'number']  // 引数の型 [ptr, length]
  );

  const allocateBuffer = Module.cwrap('allocate_buffer', 'number', ['number']);
  const freeBuffer = Module.cwrap('free_buffer', null, ['number']);

  return {
    processImageData(imageData) {
      const { data, width, height } = imageData;
      const byteLength = data.length;

      // WASMメモリにバッファ確保
      const ptr = allocateBuffer(byteLength);

      // データコピー
      Module.HEAPU8.set(data, ptr);

      // 処理実行
      applySepia(ptr, byteLength);

      // 結果読み取り
      const result = new Uint8ClampedArray(
        Module.HEAPU8.buffer,
        ptr,
        byteLength
      );
      const output = new Uint8ClampedArray(result);

      // メモリ解放
      freeBuffer(ptr);

      return new ImageData(output, width, height);
    }
  };
}

// 使用例
const filter = await createFilter();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const processed = filter.processImageData(imageData);
ctx.putImageData(processed, 0, 0);
```

---

## 6. wasm-bindgen — JS/Rust型変換・構造体・コールバック

### 型変換の詳細

```rust
// type_conversions.rs
use wasm_bindgen::prelude::*;
use js_sys::{Array, Float64Array, Object, Reflect};

// --- 基本型変換 ---

#[wasm_bindgen]
pub fn accept_string(s: &str) -> String {
    format!("Hello, {}!", s)
}

#[wasm_bindgen]
pub fn accept_bool(flag: bool) -> bool {
    !flag
}

#[wasm_bindgen]
pub fn accept_f64(x: f64) -> f64 {
    x * 2.0
}

// --- JS配列の受け取り ---

#[wasm_bindgen]
pub fn sum_array(values: &Float64Array) -> f64 {
    values.to_vec().iter().sum()
}

#[wasm_bindgen]
pub fn process_js_array(arr: &Array) -> Array {
    let result = Array::new();
    for i in 0..arr.length() {
        let val = arr.get(i);
        if let Some(n) = val.as_f64() {
            result.push(&JsValue::from_f64(n * 2.0));
        }
    }
    result
}

// --- コールバック（JS関数をRustから呼び出し） ---

#[wasm_bindgen]
pub fn execute_callback(callback: &js_sys::Function, value: i32) {
    let this = JsValue::null();
    let arg = JsValue::from(value);
    callback.call1(&this, &arg).unwrap();
}

/// 進捗報告付きの長時間処理
#[wasm_bindgen]
pub fn long_operation(
    data_size: u32,
    on_progress: &js_sys::Function,
    on_complete: &js_sys::Function,
) {
    let total = data_size as f64;

    for i in 0..data_size {
        // 重い処理のシミュレーション
        let _ = (i as f64).sqrt();

        // 10%ごとに進捗報告
        if i % (data_size / 10) == 0 {
            let progress = (i as f64 / total * 100.0) as i32;
            let this = JsValue::null();
            on_progress
                .call1(&this, &JsValue::from(progress))
                .unwrap();
        }
    }

    let this = JsValue::null();
    on_complete
        .call1(&this, &JsValue::from_str("完了しました"))
        .unwrap();
}

// --- 非同期処理（Promise） ---

use wasm_bindgen_futures::JsFuture;
use web_sys::Response;

#[wasm_bindgen]
pub async fn fetch_and_process(url: &str) -> Result<JsValue, JsValue> {
    let window = web_sys::window().ok_or(JsValue::from_str("No window"))?;
    let response_val = JsFuture::from(window.fetch_with_str(url)).await?;
    let response: Response = response_val.dyn_into()?;

    let json_val = JsFuture::from(response.json()?).await?;

    // 取得したJSONを処理
    Ok(json_val)
}
```

### JavaScriptからの呼び出し

```javascript
// use_wasm_bindgen.js
import init, {
  WasmImageProcessor,
  execute_callback,
  long_operation,
  fibonacci,
} from './pkg/wasm_image_processor.js';

await init();

// 構造体の使用
const processor = new WasmImageProcessor(800, 600);
processor.apply_grayscale();
processor.apply_blur();

const stats = processor.get_stats();
console.log('Image stats:', stats);
// { min: 0, max: 255, mean: 127.5, std_dev: 45.2 }

// コールバックの渡し方
execute_callback((value) => {
  console.log('Callback called with:', value);
}, 42);

// 進捗報告
long_operation(
  1_000_000,
  (progress) => console.log(`Progress: ${progress}%`),
  (message) => console.log('Done:', message)
);

// フィボナッチ（BigIntとして返ってくることに注意）
const fib50 = fibonacci(50);
console.log('Fibonacci(50):', fib50); // 12586269025n

// メモリ管理（明示的なfree）
// wasm-bindgenが生成するラッパーはfree()メソッドを提供
processor.free();
```

---

## 7. 実用例 — 画像処理・暗号化・物理シミュレーション

### 実用例1: リアルタイム画像フィルター

```javascript
// realtime_filter.js — カメラ映像にWASMフィルターをリアルタイム適用

import init, { gaussian_blur, sobel_edge_detect } from './pkg/wasm_image_processor.js';

await init();

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// カメラストリームを取得
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
video.srcObject = stream;
await video.play();

canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

let currentFilter = 'none';

function processFrame() {
  ctx.drawImage(video, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let processed;
  switch (currentFilter) {
    case 'blur':
      processed = gaussian_blur(imageData.data, canvas.width, canvas.height);
      break;
    case 'edge':
      processed = sobel_edge_detect(imageData.data, canvas.width, canvas.height);
      break;
    default:
      processed = imageData.data;
  }

  const outputData = new ImageData(
    new Uint8ClampedArray(processed),
    canvas.width,
    canvas.height
  );
  ctx.putImageData(outputData, 0, 0);

  requestAnimationFrame(processFrame);
}

requestAnimationFrame(processFrame);
```

### 実用例2: 高速ハッシュ計算

```rust
// crypto_hash.rs
use wasm_bindgen::prelude::*;

/// SHA-256の簡易実装（実際はsha2クレートを使用推奨）
#[wasm_bindgen]
pub fn sha256_hex(input: &[u8]) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(input);
    let result = hasher.finalize();
    hex::encode(result)
}

/// PBKDF2によるパスワードハッシュ
#[wasm_bindgen]
pub fn pbkdf2_hash(password: &str, salt: &[u8], iterations: u32) -> Vec<u8> {
    use pbkdf2::pbkdf2_hmac;
    use sha2::Sha256;

    let mut output = [0u8; 32];
    pbkdf2_hmac::<Sha256>(
        password.as_bytes(),
        salt,
        iterations,
        &mut output,
    );
    output.to_vec()
}
```

### 実用例3: 物理シミュレーション（パーティクルシステム）

```rust
// particle_system.rs
use wasm_bindgen::prelude::*;

const GRAVITY: f32 = 9.81;

#[wasm_bindgen]
pub struct ParticleSystem {
    count: usize,
    x: Vec<f32>,
    y: Vec<f32>,
    vx: Vec<f32>,
    vy: Vec<f32>,
    lifetime: Vec<f32>,
    width: f32,
    height: f32,
}

#[wasm_bindgen]
impl ParticleSystem {
    #[wasm_bindgen(constructor)]
    pub fn new(count: usize, width: f32, height: f32) -> Self {
        let mut x = vec![0.0f32; count];
        let mut y = vec![0.0f32; count];
        let mut vx = vec![0.0f32; count];
        let mut vy = vec![0.0f32; count];
        let lifetime = vec![1.0f32; count];

        // 初期位置・速度をランダム化（LCGで簡易乱数）
        let mut seed = 12345u32;
        for i in 0..count {
            seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
            x[i] = (seed >> 16) as f32 / 65536.0 * width;
            seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
            y[i] = (seed >> 16) as f32 / 65536.0 * height;
            seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
            vx[i] = ((seed >> 16) as f32 / 65536.0 - 0.5) * 200.0;
            seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
            vy[i] = ((seed >> 16) as f32 / 65536.0 - 0.5) * 200.0;
        }

        Self { count, x, y, vx, vy, lifetime, width, height }
    }

    /// 1フレーム分のシミュレーション更新（dt: 秒単位の経過時間）
    pub fn update(&mut self, dt: f32) {
        for i in 0..self.count {
            // 重力適用
            self.vy[i] += GRAVITY * dt;

            // 位置更新
            self.x[i] += self.vx[i] * dt;
            self.y[i] += self.vy[i] * dt;

            // 壁の跳ね返り
            if self.x[i] < 0.0 {
                self.x[i] = 0.0;
                self.vx[i] = -self.vx[i] * 0.8;
            } else if self.x[i] > self.width {
                self.x[i] = self.width;
                self.vx[i] = -self.vx[i] * 0.8;
            }

            if self.y[i] < 0.0 {
                self.y[i] = 0.0;
                self.vy[i] = -self.vy[i] * 0.8;
            } else if self.y[i] > self.height {
                self.y[i] = self.height;
                self.vy[i] = -self.vy[i] * 0.8;
            }

            // ライフタイム減少
            self.lifetime[i] -= dt * 0.1;
            if self.lifetime[i] <= 0.0 {
                self.lifetime[i] = 1.0;
            }
        }
    }

    /// 位置データポインタ（ゼロコピーでJSからアクセス）
    pub fn x_ptr(&self) -> *const f32 { self.x.as_ptr() }
    pub fn y_ptr(&self) -> *const f32 { self.y.as_ptr() }
    pub fn lifetime_ptr(&self) -> *const f32 { self.lifetime.as_ptr() }
    pub fn count(&self) -> usize { self.count }
}
```

---

## 8. WASI — WebAssembly System Interface

### WASIとは

WASIはWASMをブラウザ外のシステムで実行するためのAPIスペックだ。POSIXライクなインターフェースをWASMに提供し、ファイルシステム・ネットワーク・プロセスへのアクセスを可能にする。

```
POSIX類似API:
- fd_read / fd_write       ファイルディスクリプタ読み書き
- path_open                ファイル・ディレクトリオープン
- environ_get              環境変数取得
- clock_time_get           時刻取得
- proc_exit                プロセス終了
- sock_recv / sock_send    ソケット通信（WASI Preview 2）
```

### RustでのWASIターゲット

```bash
# WASIターゲットの追加
rustup target add wasm32-wasip1

# WASIバイナリのビルド
cargo build --target wasm32-wasip1 --release
```

```rust
// wasi_example.rs
use std::fs;
use std::io::{self, Read, Write};

fn main() {
    // 標準入力から読み取り
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();

    // ファイル処理
    let content = fs::read_to_string("/workspace/input.json")
        .unwrap_or_else(|_| "{}".to_string());

    // 処理した結果を標準出力
    let result = process_data(&content);
    println!("{}", result);

    // ファイルへの書き出し
    fs::write("/workspace/output.json", result.as_bytes()).unwrap();
}

fn process_data(json: &str) -> String {
    // JSON処理のロジック
    format!("{{ \"processed\": true, \"input\": {} }}", json)
}
```

```bash
# Wasmtimeで実行（ファイルシステムアクセス付き）
wasmtime run \
  --dir /workspace \
  target/wasm32-wasip1/release/wasi_example.wasm

# 標準入力経由
echo '{"key": "value"}' | wasmtime run \
  --dir . \
  target/wasm32-wasip1/release/wasi_example.wasm
```

---

## 9. Wasmtime・Wasmer — サーバーサイドWASM実行

### Wasmtime

Bytecode Allianceが開発する高性能WASMランタイム。Rust・C・Python・JavaScriptから呼び出せる。

```bash
# Wasmtimeのインストール
curl https://wasmtime.dev/install.sh -sSf | bash

# 基本実行
wasmtime run module.wasm

# Wasmtimeをライブラリとして使用（Cargo.toml）
[dependencies]
wasmtime = "27.0"
wasmtime-wasi = "27.0"
anyhow = "1.0"
```

```rust
// wasmtime_host.rs — RustからWASMモジュールをホスト実行
use anyhow::Result;
use wasmtime::*;
use wasmtime_wasi::WasiCtxBuilder;

fn main() -> Result<()> {
    // エンジン設定（最適化レベルなど）
    let mut config = Config::new();
    config.cranelift_opt_level(OptLevel::Speed);

    let engine = Engine::new(&config)?;
    let module = Module::from_file(&engine, "guest.wasm")?;

    // WASIコンテキスト設定
    let wasi = WasiCtxBuilder::new()
        .inherit_stdio()
        .inherit_env()?
        .preopened_dir(
            wasmtime_wasi::sync::Dir::open_ambient_dir(".", ambient_authority())?,
            "."
        )?
        .build();

    let mut store = Store::new(&engine, wasi);

    // リンカーにWASIを追加
    let mut linker = Linker::new(&engine);
    wasmtime_wasi::add_to_linker(&mut linker, |s| s)?;

    // インスタンス化
    let instance = linker.instantiate(&mut store, &module)?;

    // エクスポートされた関数を取得・実行
    let add = instance.get_typed_func::<(i32, i32), i32>(&mut store, "add")?;
    let result = add.call(&mut store, (3, 4))?;
    println!("3 + 4 = {}", result);

    Ok(())
}
```

### Wasmer

もう一つの主要なWASMランタイム。プラグインシステムやWASIX（WASIの拡張）が特徴。

```bash
# Wasmerのインストール
curl https://get.wasmer.io -sSfL | sh

# 実行
wasmer run module.wasm

# Wasmerパッケージレジストリからの実行
wasmer run python/python -- --version

# Cargo.toml依存関係
[dependencies]
wasmer = "4.0"
wasmer-wasi = "4.0"
```

---

## 10. Cloudflare Workers with WASM

### Workers KVとWASMの組み合わせ

```javascript
// worker.js — Cloudflare Workers上でWASMを実行

// WASMバイナリはビルド時にバンドルされる
import wasm from './pkg/wasm_processor_bg.wasm';
import initWasm, { process_json_data } from './pkg/wasm_processor.js';

// グローバル初期化（Workerの起動時に一度だけ実行）
let wasmInitialized = false;
async function ensureWasmInit() {
  if (!wasmInitialized) {
    await initWasm(wasm);
    wasmInitialized = true;
  }
}

export default {
  async fetch(request, env, ctx) {
    await ensureWasmInit();

    const url = new URL(request.url);

    if (url.pathname === '/process' && request.method === 'POST') {
      const body = await request.text();

      // WASMで高速処理
      const result = process_json_data(body);

      return new Response(result, {
        headers: {
          'Content-Type': 'application/json',
          'X-Processed-By': 'WebAssembly',
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

```toml
# wrangler.toml
name = "wasm-processor"
main = "src/worker.js"
compatibility_date = "2026-01-01"

[build]
command = "wasm-pack build --target bundler && npm run build"

[[rules]]
type = "CompiledWasm"
globs = ["**/*.wasm"]
fallthrough = true
```

### Workers向けRustコード

```rust
// Cloudflare Workers向けの最適化
// - サイズ最小化優先
// - DOM APIなし
// - fetch APIのみ使用

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct InputData {
    values: Vec<f64>,
    operation: String,
}

#[derive(Serialize)]
struct OutputData {
    result: f64,
    count: usize,
    operation: String,
}

#[wasm_bindgen]
pub fn process_json_data(json_input: &str) -> String {
    let input: InputData = match serde_json::from_str(json_input) {
        Ok(v) => v,
        Err(e) => return format!("{{\"error\": \"{}\"}}", e),
    };

    let result = match input.operation.as_str() {
        "sum"  => input.values.iter().sum(),
        "mean" => input.values.iter().sum::<f64>() / input.values.len() as f64,
        "max"  => input.values.iter().cloned().fold(f64::NEG_INFINITY, f64::max),
        "min"  => input.values.iter().cloned().fold(f64::INFINITY, f64::min),
        _ => return "{\"error\": \"unknown operation\"}".to_string(),
    };

    let output = OutputData {
        result,
        count: input.values.len(),
        operation: input.operation,
    };

    serde_json::to_string(&output).unwrap_or_else(|e| format!("{{\"error\": \"{}\"}}", e))
}
```

---

## 11. コンポーネントモデル — WIT・compose

### コンポーネントモデルとは

WASMコンポーネントモデル（Component Model）は、WASMモジュールを「コンポーネント」として再利用・合成するための仕様だ。従来のWASMは数値型しか直接扱えなかったが、コンポーネントモデルではstring・record・variant（列挙型）・resourceなどを直接やり取りできる。

### WIT（WebAssembly Interface Types）

WITはコンポーネントのインターフェースを定義する言語だ。

```wit
// image-processor.wit

package ezark:image-processor@0.1.0;

/// 画像フィルタのインターフェース
interface image-filter {
  /// ピクセルデータを表すレコード
  record image-data {
    data: list<u8>,
    width: u32,
    height: u32,
  }

  /// フィルタの種類
  variant filter-type {
    grayscale,
    blur(u8),       // ぼかし強度
    sepia,
    edge-detect,
    brightness(s8), // -128〜127の調整値
  }

  /// フィルタ適用結果
  result<image-data, string>;

  /// フィルタを適用する関数
  apply-filter: func(
    image: image-data,
    filter: filter-type,
  ) -> result<image-data, string>;

  /// バッチ処理
  apply-filters: func(
    image: image-data,
    filters: list<filter-type>,
  ) -> result<image-data, string>;
}

/// 統計情報インターフェース
interface image-stats {
  record stats {
    min: u8,
    max: u8,
    mean: f64,
    histogram: list<u32>,
  }

  compute-stats: func(data: list<u8>) -> stats;
}

/// ワールドの定義（エクスポートするインターフェース）
world image-processor {
  export image-filter;
  export image-stats;
}
```

### Rustでのコンポーネント実装

```bash
# cargo-componentのインストール
cargo install cargo-component

# コンポーネントプロジェクト作成
cargo component new --lib image-processor
cd image-processor
```

```rust
// src/lib.rs（cargo-component向け）
#[allow(warnings)]
mod bindings;

use bindings::exports::ezark::image_processor::image_filter::{
    FilterType, Guest, ImageData,
};

struct Component;

impl Guest for Component {
    fn apply_filter(
        image: ImageData,
        filter: FilterType,
    ) -> Result<ImageData, String> {
        let mut data = image.data.clone();

        match filter {
            FilterType::Grayscale => {
                for chunk in data.chunks_mut(4) {
                    let gray = (0.2126 * chunk[0] as f32
                        + 0.7152 * chunk[1] as f32
                        + 0.0722 * chunk[2] as f32) as u8;
                    chunk[0] = gray;
                    chunk[1] = gray;
                    chunk[2] = gray;
                }
            }
            FilterType::Sepia => {
                for chunk in data.chunks_mut(4) {
                    let r = chunk[0] as f32;
                    let g = chunk[1] as f32;
                    let b = chunk[2] as f32;
                    chunk[0] = ((r * 0.393 + g * 0.769 + b * 0.189) as u16).min(255) as u8;
                    chunk[1] = ((r * 0.349 + g * 0.686 + b * 0.168) as u16).min(255) as u8;
                    chunk[2] = ((r * 0.272 + g * 0.534 + b * 0.131) as u16).min(255) as u8;
                }
            }
            FilterType::Blur(strength) => {
                // ぼかし実装
                let _ = strength;
            }
            FilterType::Brightness(delta) => {
                for chunk in data.chunks_mut(4) {
                    chunk[0] = (chunk[0] as i16 + delta as i16).clamp(0, 255) as u8;
                    chunk[1] = (chunk[1] as i16 + delta as i16).clamp(0, 255) as u8;
                    chunk[2] = (chunk[2] as i16 + delta as i16).clamp(0, 255) as u8;
                }
            }
            FilterType::EdgeDetect => {
                // Sobel実装
            }
        }

        Ok(ImageData {
            data,
            width: image.width,
            height: image.height,
        })
    }

    fn apply_filters(
        image: ImageData,
        filters: Vec<FilterType>,
    ) -> Result<ImageData, String> {
        let mut current = image;
        for filter in filters {
            current = Self::apply_filter(current, filter)?;
        }
        Ok(current)
    }
}

bindings::export!(Component with_types_in bindings);
```

```bash
# コンポーネントのビルド
cargo component build --release

# wasm-toolsでコンポーネントの合成（compose）
wasm-tools compose \
  image-processor.wasm \
  stats-calculator.wasm \
  -o combined-image-tool.wasm
```

---

## 12. デバッグ — Chrome DevTools WASMデバッグ

### Chrome DevToolsのWASMデバッグ機能

Chrome 87以降、DevToolsでWASMのソースレベルデバッグが可能だ。

```bash
# デバッグ情報付きでビルド（Rust）
RUSTFLAGS="-C debuginfo=2" wasm-pack build --dev --target web

# Emscriptenの場合
emcc source.c -g4 -o debug.html \
  -s WASM=1 \
  -gseparate-dwarf=debug.wasm.dwarf
```

DevToolsでの操作手順：
1. Chrome DevToolsを開く（F12）
2. Sourceタブ → `wasm://` セクションを展開
3. .watファイル（逆アセンブル結果）またはソースマップがあればRustコードが表示
4. ブレークポイントを設定して通常通りデバッグ

### WASMデバッグ専用の便利関数

```rust
// debug_utils.rs
use wasm_bindgen::prelude::*;

/// デバッグ用のパニックフック設定
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// パフォーマンス計測
#[wasm_bindgen]
pub fn benchmark(name: &str, iterations: u32) -> f64 {
    let window = web_sys::window().unwrap();
    let performance = window.performance().unwrap();

    let start = performance.now();

    for _ in 0..iterations {
        // 計測対象の処理
        let _ = fibonacci_bench(1000);
    }

    let elapsed = performance.now() - start;
    web_sys::console::log_1(
        &format!("{}: {:.2}ms for {} iterations", name, elapsed, iterations).into()
    );
    elapsed
}

fn fibonacci_bench(n: u64) -> u64 {
    if n <= 1 { return n; }
    let (mut a, mut b) = (0u64, 1u64);
    for _ in 2..=n {
        let c = a.wrapping_add(b);
        a = b;
        b = c;
    }
    b
}
```

### JavaScript側のデバッグユーティリティ

```javascript
// wasm_debug.js

// WASMメモリの内容をデバッグ表示
function inspectWasmMemory(memory, offset, length) {
  const view = new Uint8Array(memory.buffer, offset, length);
  const hex = Array.from(view)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
  console.log(`Memory[${offset}..${offset + length}]: ${hex}`);
}

// WASMモジュールのエクスポート一覧表示
function inspectWasmExports(instance) {
  const exports = Object.entries(instance.exports);
  console.group('WASM Exports');
  exports.forEach(([name, value]) => {
    const type = typeof value;
    if (type === 'function') {
      console.log(`fn ${name}()`);
    } else if (value instanceof WebAssembly.Memory) {
      console.log(`memory ${name}: ${value.buffer.byteLength / 1024}KB`);
    } else if (value instanceof WebAssembly.Table) {
      console.log(`table ${name}: length=${value.length}`);
    } else {
      console.log(`global ${name}: ${value.value}`);
    }
  });
  console.groupEnd();
}

// パフォーマンス比較（JS vs WASM）
async function comparePerfomance(jsFunc, wasmFunc, args, iterations = 1000) {
  // JSのベンチマーク
  const jsStart = performance.now();
  for (let i = 0; i < iterations; i++) jsFunc(...args);
  const jsTime = performance.now() - jsStart;

  // WASMのベンチマーク
  const wasmStart = performance.now();
  for (let i = 0; i < iterations; i++) wasmFunc(...args);
  const wasmTime = performance.now() - wasmStart;

  console.table({
    'JavaScript': { time: `${jsTime.toFixed(2)}ms`, ratio: '1x' },
    'WebAssembly': {
      time: `${wasmTime.toFixed(2)}ms`,
      ratio: `${(jsTime / wasmTime).toFixed(2)}x faster`
    },
  });
}

// 使用例
await comparePerfomance(
  (n) => jsFibonacci(n),
  (n) => wasmFibonacci(n),
  [40],
  100
);
```

---

## 13. パフォーマンス最適化 — 共有メモリ・SIMD・マルチスレッド

### 共有メモリ（SharedArrayBuffer）

```javascript
// shared_memory.js — WASMでの共有メモリ使用

// 注意: SharedArrayBufferはCOOPヘッダーが必要
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Embedder-Policy: require-corp

const sharedMemory = new WebAssembly.Memory({
  initial: 10,
  maximum: 100,
  shared: true,  // SharedArrayBufferを使用
});

// 共有メモリはWorkerと共有可能
const worker = new Worker('wasm_worker.js');
worker.postMessage({ memory: sharedMemory }, [sharedMemory.buffer]);

// Atomicsで同期
const syncArray = new Int32Array(sharedMemory.buffer, 0, 1);
Atomics.store(syncArray, 0, 0);  // フラグをリセット

// WASM処理完了を待機
Atomics.wait(syncArray, 0, 0);   // 値が変わるまで待機
console.log('WASM processing complete!');
```

### SIMD（Single Instruction Multiple Data）

```rust
// simd_example.rs — WASMのSIMD命令を使用
#[cfg(target_feature = "simd128")]
use std::arch::wasm32::*;

#[wasm_bindgen]
pub fn add_arrays_simd(a: &[f32], b: &[f32]) -> Vec<f32> {
    assert_eq!(a.len(), b.len());
    let mut result = vec![0.0f32; a.len()];

    #[cfg(target_feature = "simd128")]
    {
        let chunks = a.len() / 4;
        for i in 0..chunks {
            let offset = i * 4;
            unsafe {
                // 4要素を同時にロード・加算
                let va = v128_load(a[offset..].as_ptr() as *const v128);
                let vb = v128_load(b[offset..].as_ptr() as *const v128);
                let vc = f32x4_add(va, vb);
                v128_store(result[offset..].as_mut_ptr() as *mut v128, vc);
            }
        }

        // 残りの要素を通常処理
        let remainder_start = chunks * 4;
        for i in remainder_start..a.len() {
            result[i] = a[i] + b[i];
        }
    }

    #[cfg(not(target_feature = "simd128"))]
    {
        for i in 0..a.len() {
            result[i] = a[i] + b[i];
        }
    }

    result
}
```

SIMDを有効にしたビルド：

```bash
# SIMD有効化フラグ
RUSTFLAGS="-C target-feature=+simd128" \
  wasm-pack build --release --target web

# ベンチマーク（chrome://flags で#enable-webassembly-simd を有効化）
```

### マルチスレッド（Web Workers + SharedArrayBuffer）

```javascript
// wasm_worker.js — Workerでの並列WASM実行

self.onmessage = async (event) => {
  const { memory, taskId, dataOffset, dataLength } = event.data;

  // WASMモジュールをWorker内でも初期化
  const { instance } = await WebAssembly.instantiateStreaming(
    fetch('/wasm/parallel_processor.wasm'),
    {
      env: { memory },
    }
  );

  // 担当範囲を処理
  instance.exports.process_chunk(dataOffset, dataLength);

  // 完了通知
  self.postMessage({ taskId, done: true });
};
```

```javascript
// parallel_wasm.js — メインスレッドでの並列処理制御

async function processInParallel(data, workerCount = 4) {
  const sharedMemory = new WebAssembly.Memory({
    initial: Math.ceil(data.length / 65536) + 1,
    maximum: 256,
    shared: true,
  });

  // データを共有メモリに書き込み
  const memView = new Uint8Array(sharedMemory.buffer);
  memView.set(data, 0);

  // Workerを生成して並列実行
  const chunkSize = Math.ceil(data.length / workerCount);
  const workers = [];
  const promises = [];

  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker('wasm_worker.js');
    workers.push(worker);

    const promise = new Promise((resolve) => {
      worker.onmessage = (e) => {
        if (e.data.done) resolve();
      };
    });
    promises.push(promise);

    worker.postMessage({
      memory: sharedMemory,
      taskId: i,
      dataOffset: i * chunkSize,
      dataLength: Math.min(chunkSize, data.length - i * chunkSize),
    });
  }

  await Promise.all(promises);

  // 結果を共有メモリから読み取り
  const result = new Uint8Array(sharedMemory.buffer, 0, data.length);
  return new Uint8Array(result);
}
```

### バイナリサイズの最適化

```bash
# wasm-optでサイズ最適化（Binaryen）
brew install binaryen
wasm-opt -Oz input.wasm -o optimized.wasm

# サイズ比較
ls -lh input.wasm optimized.wasm

# wasm-snipで未使用コードを削除
cargo install wasm-snip
wasm-snip input.wasm -o snipped.wasm

# wasm-stripでデバッグ情報を削除
wasm-strip input.wasm

# 圧縮（Brotliが最も効率的）
brotli -9 optimized.wasm

# 実際のサイズ削減効果（典型例）
# 元: 850KB
# wasm-opt後: 320KB (-62%)
# Brotli後: 85KB (-90%)
```

---

## まとめと次のステップ

WebAssemblyは単なる「JavaScriptの高速化」にとどまらず、Web上での新しいコンピューティングパラダイムを切り開いている。

**実践ロードマップ:**

1. **Week 1**: WATの読み書き → 基本的なJavaScript連携
2. **Week 2**: Rust + wasm-pack → wasm-bindgenでの型変換
3. **Week 3**: 実用的な画像処理・暗号化の実装
4. **Week 4**: WASI・Wasmtime → サーバーサイド活用
5. **Month 2**: コンポーネントモデル → SIMDとマルチスレッド最適化

**WASMが特に有効なユースケース:**

- 既存C/C++/Rustライブラリのブラウザ移植
- 数値計算・画像処理・暗号化の高速化
- Cloudflare WorkersでのエッジコンピューティングとWASM
- プラグインシステム（サードパーティコードの安全な実行）

WASMで処理したデータを扱うワークフローでは、JSON形式のデータ検証・フォーマットが必要になる場面が多い。特にWASMのserde処理結果やAPIレスポンスのデバッグ時には、[DevToolBox](https://usedevtools.com/)のJSONフォーマッター・バリデーターが便利だ。JSON Diffや型検証機能も備えており、WASM処理前後のデータ比較や、WITインターフェース定義に合わせたスキーマ検証に活用できる。

**参考リソース:**
- [WebAssembly公式仕様](https://webassembly.github.io/spec/)
- [wasm-pack公式ドキュメント](https://rustwasm.github.io/wasm-pack/)
- [Wasmtime公式](https://wasmtime.dev/)
- [Component Model仕様](https://component-model.bytecodealliance.org/)
- [WASI公式](https://wasi.dev/)
