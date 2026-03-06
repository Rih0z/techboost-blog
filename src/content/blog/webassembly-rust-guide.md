---
title: 'Rust + WebAssembly実践ガイド: wasm-bindgenとwasm-packで高速Webアプリを...'
description: 'Rustとwasm-bindgen、wasm-packを使って実践的なWebAssemblyアプリケーションを開発する方法を解説。JavaScriptとの相互運用、DOM操作、パフォーマンス最適化まで完全ガイド。現場で使える知識を体系的にまとめました。'
pubDate: 2025-06-15
updatedDate: 2025-06-15
tags: ['Rust', 'WebAssembly', 'wasm-bindgen', 'wasm-pack', 'パフォーマンス', 'プログラミング']
category: 'フロントエンド'
---
# Rust + WebAssembly実践ガイド: wasm-bindgenとwasm-packで高速Webアプリを構築する

WebAssembly（WASM）は、ブラウザ上でネイティブに近い速度で動作するバイナリフォーマットです。Rustは最もWebAssemblyと相性の良い言語の一つとして注目されています。

本記事では、**wasm-bindgen**と**wasm-pack**を使って、実践的なRust + WebAssemblyアプリケーションを開発する方法を徹底解説します。

## なぜRust + WebAssemblyなのか

### RustがWASMに最適な理由

1. **ゼロコスト抽象化**: 高レベルな記述でも高速動作
2. **メモリ安全性**: ガベージコレクション不要で予測可能なパフォーマンス
3. **小さいバイナリサイズ**: 最適化により軽量なWASMを生成
4. **優れたツールチェーン**: wasm-packによる簡単なビルド・パッケージング

### 適用シーン

- **画像/動画処理**: フィルタリング、変換、圧縮
- **暗号化処理**: ハッシュ、署名、暗号化
- **ゲームロジック**: 物理演算、AI処理
- **データ処理**: 大量データのパース、集計
- **数値計算**: 科学技術計算、シミュレーション

## 環境セットアップ

### 必要なツールのインストール

```bash
# Rustのインストール（まだの場合）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# wasmターゲットの追加
rustup target add wasm32-unknown-unknown

# wasm-packのインストール
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# cargo-generateのインストール（テンプレート使用時）
cargo install cargo-generate
```

### プロジェクトの作成

```bash
# テンプレートから作成
cargo generate --git https://github.com/rustwasm/wasm-pack-template

# または手動で作成
cargo new --lib rust-wasm-app
cd rust-wasm-app
```

## Cargo.tomlの設定

```toml
[package]
name = "rust-wasm-app"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = [
    "console",
    "Document",
    "Element",
    "HtmlElement",
    "Node",
    "Window",
    "CanvasRenderingContext2d",
    "HtmlCanvasElement",
] }

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = 3
lto = true
```

## 基本的なwasm-bindgenの使い方

### JavaScriptから呼び出せる関数

```rust
use wasm_bindgen::prelude::*;

// 基本的な関数エクスポート
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// 数値計算の例
#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

// より高速なフィボナッチ（メモ化版）
#[wasm_bindgen]
pub fn fibonacci_fast(n: u32) -> u64 {
    let mut a = 0u64;
    let mut b = 1u64;
    for _ in 0..n {
        let temp = a;
        a = b;
        b = temp + b;
    }
    a
}
```

### 構造体のエクスポート

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Point {
    x: f64,
    y: f64,
}

#[wasm_bindgen]
impl Point {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64) -> Point {
        Point { x, y }
    }

    // ゲッター
    #[wasm_bindgen(getter)]
    pub fn x(&self) -> f64 {
        self.x
    }

    #[wasm_bindgen(getter)]
    pub fn y(&self) -> f64 {
        self.y
    }

    // セッター
    #[wasm_bindgen(setter)]
    pub fn set_x(&mut self, x: f64) {
        self.x = x;
    }

    // メソッド
    pub fn distance(&self, other: &Point) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }

    pub fn translate(&mut self, dx: f64, dy: f64) {
        self.x += dx;
        self.y += dy;
    }
}
```

## Web APIとの連携

### DOM操作

```rust
use wasm_bindgen::prelude::*;
use web_sys::{Document, Element, HtmlElement, Window};

#[wasm_bindgen]
pub fn create_element(tag: &str, text: &str) -> Result<(), JsValue> {
    let window = web_sys::window().expect("no global window");
    let document = window.document().expect("no document");

    let element = document.create_element(tag)?;
    element.set_text_content(Some(text));

    let body = document.body().expect("no body");
    body.append_child(&element)?;

    Ok(())
}

#[wasm_bindgen]
pub fn manipulate_dom() -> Result<(), JsValue> {
    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();

    // 要素の取得
    let element = document
        .get_element_by_id("app")
        .expect("element not found");

    // スタイルの変更
    if let Some(html_element) = element.dyn_ref::<HtmlElement>() {
        html_element.style().set_property("color", "blue")?;
        html_element.style().set_property("font-size", "20px")?;
    }

    Ok(())
}
```

### Canvas描画

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub fn draw_circle(canvas_id: &str) -> Result<(), JsValue> {
    let document = web_sys::window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id(canvas_id).unwrap();
    let canvas: HtmlCanvasElement = canvas.dyn_into::<HtmlCanvasElement>()?;

    let context = canvas
        .get_context("2d")?
        .unwrap()
        .dyn_into::<CanvasRenderingContext2d>()?;

    context.begin_path();
    context.arc(75.0, 75.0, 50.0, 0.0, 2.0 * std::f64::consts::PI)?;
    context.set_fill_style(&JsValue::from_str("#FF6B6B"));
    context.fill();

    Ok(())
}

#[wasm_bindgen]
pub struct Animation {
    context: CanvasRenderingContext2d,
    x: f64,
    y: f64,
    vx: f64,
    vy: f64,
    width: f64,
    height: f64,
}

#[wasm_bindgen]
impl Animation {
    #[wasm_bindgen(constructor)]
    pub fn new(canvas_id: &str) -> Result<Animation, JsValue> {
        let document = web_sys::window().unwrap().document().unwrap();
        let canvas = document.get_element_by_id(canvas_id).unwrap();
        let canvas: HtmlCanvasElement = canvas.dyn_into::<HtmlCanvasElement>()?;

        let context = canvas
            .get_context("2d")?
            .unwrap()
            .dyn_into::<CanvasRenderingContext2d>()?;

        let width = canvas.width() as f64;
        let height = canvas.height() as f64;

        Ok(Animation {
            context,
            x: width / 2.0,
            y: height / 2.0,
            vx: 2.0,
            vy: 2.0,
            width,
            height,
        })
    }

    pub fn update(&mut self) {
        self.x += self.vx;
        self.y += self.vy;

        // 壁との衝突判定
        if self.x < 10.0 || self.x > self.width - 10.0 {
            self.vx = -self.vx;
        }
        if self.y < 10.0 || self.y > self.height - 10.0 {
            self.vy = -self.vy;
        }
    }

    pub fn draw(&self) {
        // 画面クリア
        self.context.clear_rect(0.0, 0.0, self.width, self.height);

        // 円を描画
        self.context.begin_path();
        self.context.arc(self.x, self.y, 10.0, 0.0, 2.0 * std::f64::consts::PI).unwrap();
        self.context.set_fill_style(&JsValue::from_str("#4ECDC4"));
        self.context.fill();
    }
}
```

## 実践例: 画像処理

### グレースケール変換

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn grayscale(data: &mut [u8]) {
    for chunk in data.chunks_mut(4) {
        let gray = (0.299 * chunk[0] as f32
            + 0.587 * chunk[1] as f32
            + 0.114 * chunk[2] as f32) as u8;

        chunk[0] = gray;
        chunk[1] = gray;
        chunk[2] = gray;
        // chunk[3]はアルファチャンネル（そのまま）
    }
}

#[wasm_bindgen]
pub fn sepia(data: &mut [u8]) {
    for chunk in data.chunks_mut(4) {
        let r = chunk[0] as f32;
        let g = chunk[1] as f32;
        let b = chunk[2] as f32;

        chunk[0] = ((r * 0.393) + (g * 0.769) + (b * 0.189)).min(255.0) as u8;
        chunk[1] = ((r * 0.349) + (g * 0.686) + (b * 0.168)).min(255.0) as u8;
        chunk[2] = ((r * 0.272) + (g * 0.534) + (b * 0.131)).min(255.0) as u8;
    }
}

#[wasm_bindgen]
pub fn brightness(data: &mut [u8], factor: f32) {
    for chunk in data.chunks_mut(4) {
        chunk[0] = ((chunk[0] as f32 * factor).min(255.0)) as u8;
        chunk[1] = ((chunk[1] as f32 * factor).min(255.0)) as u8;
        chunk[2] = ((chunk[2] as f32 * factor).min(255.0)) as u8;
    }
}

#[wasm_bindgen]
pub fn blur(data: &[u8], width: u32, height: u32) -> Vec<u8> {
    let mut output = vec![0u8; data.len()];
    let kernel_size = 3;
    let half = kernel_size / 2;

    for y in 0..height {
        for x in 0..width {
            let mut r_sum = 0u32;
            let mut g_sum = 0u32;
            let mut b_sum = 0u32;
            let mut count = 0u32;

            for ky in 0..kernel_size {
                for kx in 0..kernel_size {
                    let px = (x as i32 + kx as i32 - half as i32).clamp(0, width as i32 - 1) as u32;
                    let py = (y as i32 + ky as i32 - half as i32).clamp(0, height as i32 - 1) as u32;
                    let idx = ((py * width + px) * 4) as usize;

                    r_sum += data[idx] as u32;
                    g_sum += data[idx + 1] as u32;
                    b_sum += data[idx + 2] as u32;
                    count += 1;
                }
            }

            let out_idx = ((y * width + x) * 4) as usize;
            output[out_idx] = (r_sum / count) as u8;
            output[out_idx + 1] = (g_sum / count) as u8;
            output[out_idx + 2] = (b_sum / count) as u8;
            output[out_idx + 3] = data[out_idx + 3];
        }
    }

    output
}
```

## JavaScriptとの相互運用

### JavaScript側でのWASM読み込み

```javascript
// wasm-packでビルドした場合
import init, { greet, Point, Animation } from './pkg/rust_wasm_app.js';

async function run() {
    // WASMの初期化
    await init();

    // 関数の呼び出し
    const message = greet('World');
    console.log(message); // "Hello, World!"

    // 構造体の使用
    const p1 = new Point(0, 0);
    const p2 = new Point(3, 4);
    const distance = p1.distance(p2);
    console.log(distance); // 5

    // アニメーションループ
    const animation = new Animation('canvas');

    function animate() {
        animation.update();
        animation.draw();
        requestAnimationFrame(animate);
    }

    animate();
}

run();
```

### 画像処理の統合例

```javascript
import init, { grayscale, sepia, brightness } from './pkg/rust_wasm_app.js';

async function processImage() {
    await init();

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const image = new Image();

    image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Rustで処理（高速）
        const start = performance.now();
        grayscale(imageData.data);
        const end = performance.now();
        console.log(`処理時間: ${end - start}ms`);

        ctx.putImageData(imageData, 0, 0);
    };

    image.src = 'photo.jpg';
}

// フィルター切り替え
document.getElementById('grayscale-btn').addEventListener('click', async () => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    grayscale(imageData.data);
    ctx.putImageData(imageData, 0, 0);
});

document.getElementById('sepia-btn').addEventListener('click', async () => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    sepia(imageData.data);
    ctx.putImageData(imageData, 0, 0);
});
```

## ビルドと最適化

### wasm-packでのビルド

```bash
# 開発ビルド
wasm-pack build --dev

# プロダクションビルド（最適化あり）
wasm-pack build --release

# ターゲット指定
wasm-pack build --target web      # ESM形式
wasm-pack build --target bundler  # webpack等向け
wasm-pack build --target nodejs   # Node.js向け

# 出力先指定
wasm-pack build --out-dir www/pkg
```

### サイズ最適化

```toml
# Cargo.toml
[profile.release]
opt-level = "z"     # サイズ優先最適化
lto = true          # Link Time Optimization
codegen-units = 1   # 並列コンパイル無効化（サイズ優先）
panic = "abort"     # パニック時のスタック巻き戻し無効化
strip = true        # デバッグ情報削除
```

追加のサイズ削減:

```bash
# wasm-optを使用
wasm-opt -Oz -o output.wasm input.wasm

# twiggyでサイズ分析
twiggy top -n 20 pkg/rust_wasm_app_bg.wasm
```

## パフォーマンス計測とベンチマーク

### Rust側でのベンチマーク

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn test_fibonacci() {
        assert_eq!(fibonacci_fast(10), 55);
        assert_eq!(fibonacci_fast(20), 6765);
    }

    #[wasm_bindgen_test]
    fn bench_grayscale() {
        let mut data = vec![128u8; 1920 * 1080 * 4];
        let start = instant::now();
        grayscale(&mut data);
        let duration = instant::now() - start;
        console::log_1(&format!("Grayscale: {}ms", duration).into());
    }
}
```

### JavaScript側での比較

```javascript
// WASM版
const wasmStart = performance.now();
grayscale(imageData.data);
const wasmTime = performance.now() - wasmStart;

// JavaScript版（比較用）
const jsStart = performance.now();
for (let i = 0; i < imageData.data.length; i += 4) {
    const gray = imageData.data[i] * 0.299
               + imageData.data[i + 1] * 0.587
               + imageData.data[i + 2] * 0.114;
    imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = gray;
}
const jsTime = performance.now() - jsStart;

console.log(`WASM: ${wasmTime}ms, JS: ${jsTime}ms, 高速化: ${(jsTime / wasmTime).toFixed(2)}x`);
```

## デバッグとトラブルシューティング

### console.logの使用

```rust
use wasm_bindgen::prelude::*;
use web_sys::console;

#[wasm_bindgen]
pub fn debug_function() {
    console::log_1(&"Hello from Rust!".into());

    let value = 42;
    console::log_2(&"Value:".into(), &value.into());

    console::error_1(&"エラーメッセージ".into());
    console::warn_1(&"警告メッセージ".into());
}
```

### エラーハンドリング

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn safe_divide(a: f64, b: f64) -> Result<f64, JsValue> {
    if b == 0.0 {
        return Err(JsValue::from_str("ゼロ除算エラー"));
    }
    Ok(a / b)
}
```

JavaScript側:

```javascript
try {
    const result = safe_divide(10, 0);
    console.log(result);
} catch (error) {
    console.error('エラー:', error);
}
```

## まとめ

Rust + WebAssemblyの実践的な開発方法を解説しました。

### キーポイント

- **wasm-bindgen**: JavaScript APIとのシームレスな連携
- **wasm-pack**: ビルドとパッケージングの自動化
- **高速処理**: 画像処理、数値計算で大幅な性能向上
- **型安全**: RustとTypeScriptの組み合わせで堅牢な開発

### ベストプラクティス

1. **計算負荷の高い処理にWASMを使用**: UI操作はJavaScriptで
2. **データのやり取りを最小化**: 頻繁な境界越えはオーバーヘッド
3. **適切なメモリ管理**: 大きなバッファはWASM側で保持
4. **プロファイリング**: 実際の性能を計測して最適化

Rust + WebAssemblyで、高速で安全なWebアプリケーションを実現しましょう。
