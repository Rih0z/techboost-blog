---
title: 'Rust + WebAssembly実践ガイド'
description: 'RustでWebAssemblyを作成し、JavaScriptと統合する実践ガイド。wasm-bindgen、wasm-pack、パフォーマンス最適化、実用例まで徹底解説します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: 2025-02-05
tags: ['Rust', 'WebAssembly', 'WASM', 'JavaScript', 'パフォーマンス']
category: 'WebAssembly'
---
# Rust + WebAssembly実践ガイド

RustとWebAssemblyを組み合わせることで、Webアプリケーションに**ネイティブレベルのパフォーマンス**をもたらせます。

## WebAssembly (WASM)とは

WebAssemblyは、**ブラウザで動作するバイナリ形式の低レベル言語**です。

### 利点

- **高速実行**: JavaScriptより高速
- **言語非依存**: Rust、C、C++、Goなどから生成可能
- **セキュア**: サンドボックス環境で実行
- **互換性**: すべてのモダンブラウザで動作

### Rustを使う理由

- **メモリ安全性**: ガベージコレクタなしでメモリ安全
- **ゼロコスト抽象化**: 高レベルコードでも高パフォーマンス
- **優れたツールチェーン**: cargo、wasm-pack
- **小さいバイナリ**: 最適化により軽量なWASMファイル生成

## セットアップ

### Rustのインストール

```bash
# Rustupのインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# WASMターゲットの追加
rustup target add wasm32-unknown-unknown
```

### wasm-packのインストール

```bash
cargo install wasm-pack
```

## 基本的なプロジェクト

### プロジェクト作成

```bash
cargo new --lib hello-wasm
cd hello-wasm
```

### Cargo.toml設定

```toml
[package]
name = "hello-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"

[profile.release]
opt-level = "z"     # サイズ最適化
lto = true          # Link Time Optimization
codegen-units = 1   # 並列コンパイル無効化（サイズ削減）
```

### 基本的なRustコード

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

// JavaScriptから呼び出し可能な関数
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// JavaScriptのコンソールにログ出力
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
# 開発ビルド
wasm-pack build --target web

# リリースビルド（最適化）
wasm-pack build --target web --release
```

生成されるファイル:
```
pkg/
├── hello_wasm.js
├── hello_wasm_bg.wasm
├── hello_wasm.d.ts
└── package.json
```

### JavaScriptからの使用

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Hello WASM</title>
</head>
<body>
    <script type="module">
        import init, { greet, add, say_hello } from './pkg/hello_wasm.js';

        async function run() {
            await init();

            console.log(greet("World")); // "Hello, World!"
            console.log(add(5, 3)); // 8
            say_hello(); // "Hello from Rust!"
        }

        run();
    </script>
</body>
</html>
```

## JavaScriptとの相互運用

### 複雑な型の受け渡し

```rust
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct User {
    pub id: u32,
    pub name: String,
    pub email: String,
}

#[wasm_bindgen]
pub fn process_user(user_json: &str) -> Result<String, JsValue> {
    let user: User = serde_json::from_str(user_json)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // ユーザー処理
    let result = format!("Processed user: {} (ID: {})", user.name, user.id);

    Ok(result)
}

// 構造体を直接返す
#[wasm_bindgen]
pub fn create_user(id: u32, name: String, email: String) -> JsValue {
    let user = User { id, name, email };

    serde_wasm_bindgen::to_value(&user).unwrap()
}
```

```toml
[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
serde-wasm-bindgen = "0.6"
```

```javascript
import init, { process_user, create_user } from './pkg/hello_wasm.js';

await init();

const userJson = JSON.stringify({
    id: 1,
    name: "Alice",
    email: "alice@example.com"
});

console.log(process_user(userJson));

const newUser = create_user(2, "Bob", "bob@example.com");
console.log(newUser); // { id: 2, name: "Bob", email: "bob@example.com" }
```

### DOM操作

```rust
use wasm_bindgen::prelude::*;
use web_sys::{Document, Element, HtmlElement, Window};

#[wasm_bindgen]
pub fn create_element() -> Result<(), JsValue> {
    let window: Window = web_sys::window().expect("no global `window`");
    let document: Document = window.document().expect("no document");

    let body = document.body().expect("document has no body");

    // 新しい要素を作成
    let div: Element = document.create_element("div")?;
    div.set_text_content(Some("Created by Rust!"));
    div.set_class_name("rust-element");

    // DOMに追加
    body.append_child(&div)?;

    Ok(())
}

#[wasm_bindgen]
pub fn update_element(id: &str, text: &str) -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();

    if let Some(element) = document.get_element_by_id(id) {
        element.set_text_content(Some(text));
    }

    Ok(())
}
```

```toml
[dependencies]
wasm-bindgen = "0.2"
web-sys = { version = "0.3", features = [
    "Document",
    "Element",
    "HtmlElement",
    "Window",
] }
```

### イベントハンドラ

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{Event, HtmlInputElement};

#[wasm_bindgen]
pub fn setup_event_listener() -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();

    let input = document
        .get_element_by_id("my-input")
        .unwrap()
        .dyn_into::<HtmlInputElement>()?;

    let closure = Closure::wrap(Box::new(move |event: Event| {
        let target = event.target().unwrap();
        let input = target.dyn_into::<HtmlInputElement>().unwrap();
        let value = input.value();

        web_sys::console::log_1(&format!("Input value: {}", value).into());
    }) as Box<dyn FnMut(_)>);

    input.add_event_listener_with_callback("input", closure.as_ref().unchecked_ref())?;

    // メモリリークを防ぐため、Closureを保持
    closure.forget();

    Ok(())
}
```

## 実用例

### 1. 画像処理

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;
use web_sys::ImageData;

#[wasm_bindgen]
pub fn grayscale(data: &[u8], width: u32, height: u32) -> Vec<u8> {
    let mut output = data.to_vec();

    for i in (0..data.len()).step_by(4) {
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;

        // グレースケール変換
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;

        output[i] = gray;
        output[i + 1] = gray;
        output[i + 2] = gray;
        // Alpha値は維持
    }

    output
}

#[wasm_bindgen]
pub fn blur(data: &[u8], width: u32, height: u32, radius: u32) -> Vec<u8> {
    // ガウシアンブラー実装
    let mut output = data.to_vec();

    // 簡易ボックスブラー
    for y in 0..height {
        for x in 0..width {
            let mut r_sum = 0u32;
            let mut g_sum = 0u32;
            let mut b_sum = 0u32;
            let mut count = 0u32;

            for dy in -(radius as i32)..=(radius as i32) {
                for dx in -(radius as i32)..=(radius as i32) {
                    let nx = x as i32 + dx;
                    let ny = y as i32 + dy;

                    if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                        let idx = ((ny * width as i32 + nx) * 4) as usize;
                        r_sum += data[idx] as u32;
                        g_sum += data[idx + 1] as u32;
                        b_sum += data[idx + 2] as u32;
                        count += 1;
                    }
                }
            }

            let idx = ((y * width + x) * 4) as usize;
            output[idx] = (r_sum / count) as u8;
            output[idx + 1] = (g_sum / count) as u8;
            output[idx + 2] = (b_sum / count) as u8;
        }
    }

    output
}
```

```javascript
import init, { grayscale, blur } from './pkg/image_processor.js';

await init();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 画像読み込み
const img = new Image();
img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // グレースケール処理（Rustで実行）
    const grayData = grayscale(imageData.data, canvas.width, canvas.height);

    // 結果を表示
    const newImageData = new ImageData(
        new Uint8ClampedArray(grayData),
        canvas.width,
        canvas.height
    );
    ctx.putImageData(newImageData, 0, 0);
};
img.src = 'image.jpg';
```

### 2. 暗号化

```rust
use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};

#[wasm_bindgen]
pub fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let result = hasher.finalize();

    format!("{:x}", result)
}

#[wasm_bindgen]
pub fn encrypt(plaintext: &[u8], key: &[u8]) -> Result<Vec<u8>, JsValue> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let nonce = Nonce::from_slice(b"unique nonce");

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(ciphertext)
}
```

```toml
[dependencies]
wasm-bindgen = "0.2"
sha2 = "0.10"
aes-gcm = "0.10"
```

### 3. データ処理・計算

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Statistics {
    pub mean: f64,
    pub median: f64,
    pub std_dev: f64,
    pub min: f64,
    pub max: f64,
}

#[wasm_bindgen]
pub fn calculate_statistics(data: &[f64]) -> Statistics {
    let len = data.len() as f64;

    // 平均
    let mean = data.iter().sum::<f64>() / len;

    // 中央値
    let mut sorted = data.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let median = if sorted.len() % 2 == 0 {
        (sorted[sorted.len() / 2 - 1] + sorted[sorted.len() / 2]) / 2.0
    } else {
        sorted[sorted.len() / 2]
    };

    // 標準偏差
    let variance = data.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / len;
    let std_dev = variance.sqrt();

    // 最小・最大
    let min = *data.iter().min_by(|a, b| a.partial_cmp(b).unwrap()).unwrap();
    let max = *data.iter().max_by(|a, b| a.partial_cmp(b).unwrap()).unwrap();

    Statistics {
        mean,
        median,
        std_dev,
        min,
        max,
    }
}

#[wasm_bindgen]
pub fn matrix_multiply(a: &[f64], b: &[f64], rows_a: usize, cols_a: usize, cols_b: usize) -> Vec<f64> {
    let mut result = vec![0.0; rows_a * cols_b];

    for i in 0..rows_a {
        for j in 0..cols_b {
            for k in 0..cols_a {
                result[i * cols_b + j] += a[i * cols_a + k] * b[k * cols_b + j];
            }
        }
    }

    result
}
```

## パフォーマンス最適化

### 1. ビルド最適化

```toml
[profile.release]
opt-level = "z"        # サイズ優先最適化
lto = true             # Link Time Optimization
codegen-units = 1      # 並列化無効（サイズ削減）
strip = true           # シンボル削除
panic = "abort"        # パニック時abort
```

### 2. wasm-optの使用

```bash
# wasm-optのインストール
npm install -g wasm-opt

# 最適化
wasm-opt -Oz -o optimized.wasm input.wasm
```

### 3. メモリ管理

```rust
use wasm_bindgen::prelude::*;

// メモリ効率的な処理
#[wasm_bindgen]
pub fn process_large_data(data: &[u8]) -> Vec<u8> {
    // イテレータを使って一度に全データをメモリに展開しない
    data.iter()
        .map(|&byte| byte.wrapping_add(1))
        .collect()
}

// 可能な限りスライスを使う
#[wasm_bindgen]
pub fn sum_numbers(numbers: &[f64]) -> f64 {
    numbers.iter().sum()
}
```

## デバッグ

### コンソールログ

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_u32(a: u32);
}

#[wasm_bindgen]
pub fn debug_example() {
    log("Debug message from Rust");
    log_u32(42);
}
```

### web-sys::console

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn advanced_logging() {
    web_sys::console::log_1(&"Hello".into());
    web_sys::console::warn_1(&"Warning!".into());
    web_sys::console::error_1(&"Error!".into());
}
```

## まとめ

Rust + WebAssemblyで高パフォーマンスなWebアプリケーションを構築できます。

### 適用場面

- **画像・動画処理**: フィルター、エンコード
- **暗号化**: 高速な暗号処理
- **データ分析**: 大量データの統計処理
- **ゲーム**: 物理演算、レンダリング
- **CAD/3D**: 複雑な計算

### ベストプラクティス

1. **JavaScript境界を最小化**: 関数呼び出しのオーバーヘッド削減
2. **大きなデータは共有メモリ**: コピーを避ける
3. **リリースビルドで最適化**: サイズとパフォーマンス両立
4. **適材適所**: すべてをWASM化する必要はない

Rustの安全性とパフォーマンスを、Webブラウザで活用しましょう。
