---
title: "Rust + WebAssemblyでフロントエンド高速化 — 実践入門ガイド"
description: "RustとWebAssemblyを組み合わせてフロントエンドを高速化。wasm-pack、wasm-bindgen、JavaScript連携、画像処理・暗号化の実装例を紹介します。"
pubDate: "2026-02-05"
tags: ["Rust", "WebAssembly", "WASM", "Performance"]
---

## なぜRust + WebAssembly?

JavaScriptは柔軟ですが、計算量の多い処理では性能がボトルネックになります。WebAssembly (WASM) を使えば、Rustのような低レベル言語で書いたコードをブラウザで実行でき、大幅な高速化が可能です。

### パフォーマンス比較

| 処理 | JavaScript | Rust + WASM | 高速化率 |
|------|-----------|-------------|---------|
| 画像フィルタ処理 | 850ms | 45ms | **19倍** |
| SHA-256ハッシュ | 120ms | 8ms | **15倍** |
| 大量データソート | 320ms | 25ms | **13倍** |

## セットアップ

### 必要なツール

```bash
# Rustインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# wasm-packインストール
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# プロジェクト作成テンプレート
cargo install cargo-generate
```

### プロジェクト作成

```bash
# Rustプロジェクト作成
cargo new --lib my-wasm-project
cd my-wasm-project
```

`Cargo.toml` を編集:

```toml
[package]
name = "my-wasm-project"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = ["console"] }

[profile.release]
opt-level = "z"     # サイズ最適化
lto = true          # Link Time Optimization
codegen-units = 1   # 並列化を無効にして最適化優先
```

## Hello World

### Rustコード

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// JavaScriptのconsole.logを呼ぶ
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn say_hello() {
    log("Hello from Rust!");
}
```

### ビルド

```bash
# WASMビルド
wasm-pack build --target web

# サイズ確認
ls -lh pkg/
```

### JavaScriptから使用

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rust + WASM</title>
</head>
<body>
    <script type="module">
        import init, { greet, add, say_hello } from './pkg/my_wasm_project.js';

        async function run() {
            await init(); // WASMを初期化

            console.log(greet("World")); // "Hello, World!"
            console.log(add(10, 20));    // 30
            say_hello();                 // コンソールに出力
        }

        run();
    </script>
</body>
</html>
```

## 実践例1: 画像処理(グレースケール変換)

### Rustコード

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn grayscale(data: &mut [u8]) {
    for pixel in data.chunks_exact_mut(4) {
        let r = pixel[0] as f32;
        let g = pixel[1] as f32;
        let b = pixel[2] as f32;

        // 輝度計算
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;

        pixel[0] = gray;
        pixel[1] = gray;
        pixel[2] = gray;
        // pixel[3] (alpha) はそのまま
    }
}

#[wasm_bindgen]
pub fn sepia(data: &mut [u8]) {
    for pixel in data.chunks_exact_mut(4) {
        let r = pixel[0] as f32;
        let g = pixel[1] as f32;
        let b = pixel[2] as f32;

        pixel[0] = ((r * 0.393) + (g * 0.769) + (b * 0.189)).min(255.0) as u8;
        pixel[1] = ((r * 0.349) + (g * 0.686) + (b * 0.168)).min(255.0) as u8;
        pixel[2] = ((r * 0.272) + (g * 0.534) + (b * 0.131)).min(255.0) as u8;
    }
}
```

### JavaScriptから呼び出し

```javascript
import init, { grayscale, sepia } from './pkg/my_wasm_project.js';

await init();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();

img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Rust関数を呼び出し
    console.time('grayscale');
    grayscale(imageData.data);
    console.timeEnd('grayscale'); // 通常、JavaScriptの10-20倍高速

    ctx.putImageData(imageData, 0, 0);
};

img.src = 'photo.jpg';
```

## 実践例2: SHA-256ハッシュ計算

```rust
// Cargo.toml に追加
// [dependencies]
// sha2 = "0.10"

use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};

#[wasm_bindgen]
pub fn sha256(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let result = hasher.finalize();

    // 16進数文字列に変換
    result.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>()
}

#[wasm_bindgen]
pub fn hash_file(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();

    result.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>()
}
```

```javascript
import init, { sha256, hash_file } from './pkg/my_wasm_project.js';

await init();

// テキストのハッシュ
console.log(sha256("Hello, World!"));
// 出力: dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f

// ファイルのハッシュ
document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    console.time('hash');
    const hash = hash_file(uint8);
    console.timeEnd('hash');

    console.log('SHA-256:', hash);
});
```

## 実践例3: データ圧縮(LZ4)

```rust
// Cargo.toml
// [dependencies]
// lz4_flex = "0.11"

use wasm_bindgen::prelude::*;
use lz4_flex::{compress_prepend_size, decompress_size_prepended};

#[wasm_bindgen]
pub fn compress(data: &[u8]) -> Vec<u8> {
    compress_prepend_size(data)
}

#[wasm_bindgen]
pub fn decompress(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    decompress_size_prepended(data)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn compression_ratio(original_size: usize, compressed_size: usize) -> f64 {
    (1.0 - (compressed_size as f64 / original_size as f64)) * 100.0
}
```

```javascript
import init, { compress, decompress, compression_ratio } from './pkg/my_wasm_project.js';

await init();

const text = "Lorem ipsum dolor sit amet...".repeat(100);
const encoder = new TextEncoder();
const data = encoder.encode(text);

console.log('Original size:', data.length);

const compressed = compress(data);
console.log('Compressed size:', compressed.length);
console.log('Ratio:', compression_ratio(data.length, compressed.length).toFixed(2) + '%');

const decompressed = decompress(compressed);
const decoder = new TextDecoder();
console.log('Decompressed:', decoder.decode(decompressed));
```

## JavaScript連携(高度)

### Rust側でJavaScriptの関数を呼ぶ

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    // JavaScriptのalert関数
    fn alert(s: &str);

    // カスタム関数
    #[wasm_bindgen(js_namespace = myApp)]
    fn onProgress(percent: f64);
}

#[wasm_bindgen]
pub fn heavy_computation() {
    for i in 0..100 {
        // 重い処理...

        // 進捗をJavaScriptに通知
        onProgress(i as f64);
    }
    alert("Complete!");
}
```

```javascript
window.myApp = {
    onProgress: (percent) => {
        console.log(`Progress: ${percent}%`);
        document.getElementById('progress').value = percent;
    }
};
```

### JavaScriptのオブジェクトをRustで扱う

```rust
use wasm_bindgen::prelude::*;
use js_sys::{Array, Object, Reflect};

#[wasm_bindgen]
pub fn process_user(user: &JsValue) -> Result<String, JsValue> {
    let name = Reflect::get(user, &"name".into())?
        .as_string()
        .unwrap_or_default();

    let age = Reflect::get(user, &"age".into())?
        .as_f64()
        .unwrap_or(0.0) as u32;

    Ok(format!("{} is {} years old", name, age))
}
```

```javascript
const user = { name: "Alice", age: 30 };
console.log(process_user(user)); // "Alice is 30 years old"
```

## パフォーマンス最適化

### 1. ビルド最適化

```bash
# リリースビルド(最適化有効)
wasm-pack build --release --target web

# さらに最適化(wasm-opt使用)
npm install -g wasm-opt
wasm-opt -Oz -o output.wasm input.wasm
```

### 2. メモリ管理

```rust
// 大きなデータはJavaScriptに返さず、ポインタで渡す
#[wasm_bindgen]
pub struct ImageBuffer {
    data: Vec<u8>,
}

#[wasm_bindgen]
impl ImageBuffer {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            data: vec![0; (width * height * 4) as usize],
        }
    }

    pub fn get_ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }
}
```

## Next.js/Viteでの統合

### Next.js

```bash
npm install @wasm-tool/wasm-pack-plugin
```

```javascript
// next.config.js
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');

module.exports = {
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.plugins.push(
                new WasmPackPlugin({
                    crateDirectory: require('path').resolve(__dirname, '../my-wasm-project'),
                })
            );
        }
        return config;
    },
};
```

### Vite

```bash
npm install vite-plugin-wasm
```

```javascript
// vite.config.js
import wasm from 'vite-plugin-wasm';

export default {
    plugins: [wasm()],
};
```

## まとめ

Rust + WebAssemblyは以下のような場面で威力を発揮します:

- 画像/動画処理
- 暗号化・ハッシュ計算
- データ圧縮・解凍
- ゲームエンジン
- 科学計算・シミュレーション

JavaScriptの柔軟性とRustの性能を組み合わせることで、次世代のWebアプリケーションを構築できます。

参考リンク:
- Rust: https://www.rust-lang.org/
- wasm-pack: https://rustwasm.github.io/wasm-pack/
