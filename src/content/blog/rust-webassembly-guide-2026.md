---
title: "Rust×WebAssembly実践ガイド2026"
description: "RustとWebAssemblyで高速なWebアプリケーションを開発する実践ガイド。wasm-bindgen、wasm-pack、JavaScript連携、パフォーマンス最適化を具体的なコード例とともに解説します。"
pubDate: '2026-03-05'
tags: ['Rust', 'WebAssembly', 'パフォーマンス', 'フロントエンド', 'wasm']
heroImage: '../../assets/thumbnails/rust-webassembly-guide-2026.jpg'
---

WebAssembly（Wasm）は、ブラウザ上でネイティブに近い速度でコードを実行できるバイナリフォーマットです。Rustは、メモリ安全性とゼロコスト抽象化を兼ね備えた言語として、WebAssemblyのコンパイルターゲットとして最も適した言語の一つです。

2026年現在、Rust×WebAssemblyのエコシステムは成熟し、画像処理、暗号化、データ変換、ゲーム開発など、パフォーマンスが求められる多くのWebアプリケーションで実用的に活用されています。

本記事では、RustでWebAssemblyモジュールを開発し、JavaScriptと連携させる方法を、実践的なコード例とともに徹底解説します。

## WebAssemblyとは

### WebAssemblyの基本概念

```
┌─────────────────────────────────────┐
│            ブラウザ                    │
│                                     │
│  ┌──────────┐    ┌───────────────┐  │
│  │JavaScript│    │  WebAssembly  │  │
│  │  Engine   │◄──►│   Runtime    │  │
│  │ (V8等)    │    │              │  │
│  └──────────┘    └───────────────┘  │
│       │                  │          │
│  ┌────┴──────────────────┴───────┐  │
│  │         Web APIs              │  │
│  │  (DOM, Fetch, Canvas...)      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### JavaScript vs WebAssembly のパフォーマンス比較

| 処理 | JavaScript | WebAssembly (Rust) | 高速化率 |
|------|-----------|-------------------|---------|
| 画像リサイズ (4K) | 420ms | 85ms | 4.9x |
| SHA-256ハッシュ | 180ms | 35ms | 5.1x |
| JSON→CSV変換 (10万行) | 950ms | 210ms | 4.5x |
| 行列演算 (1000x1000) | 3200ms | 280ms | 11.4x |
| Markdownパース | 45ms | 12ms | 3.8x |

## 開発環境のセットアップ

### Rustのインストール

```bash
# Rustインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# WebAssemblyターゲット追加
rustup target add wasm32-unknown-unknown

# wasm-packインストール
cargo install wasm-pack

# cargo-generateインストール（テンプレート用）
cargo install cargo-generate

# バージョン確認
rustc --version    # rustc 1.82.0+
wasm-pack --version # wasm-pack 0.13.0+
```

### プロジェクトの作成

```bash
# wasm-packテンプレートからプロジェクト生成
cargo generate --git https://github.com/nickel-org/rust-wasm-template
# または手動で作成
cargo new --lib my-wasm-lib
cd my-wasm-lib
```

### Cargo.toml の設定

```toml
[package]
name = "my-wasm-lib"
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
    "HtmlCanvasElement",
    "CanvasRenderingContext2d",
    "Window",
    "Performance",
    "ImageData",
] }
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"
getrandom = { version = "0.2", features = ["js"] }

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = "z"      # サイズ最適化
lto = true           # リンク時最適化
codegen-units = 1    # コンパイルユニット統合
strip = true         # デバッグ情報除去
```

## 基本的なWasm関数の作成

### Hello World

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

// JavaScriptから呼び出せる関数
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("こんにちは、{}さん！", name)
}

// JavaScriptのconsole.logを呼び出す
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// Rustからconsole.logを使うマクロ
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[wasm_bindgen]
pub fn init() {
    console_log!("Wasm module initialized!");
}
```

### ビルドと使用

```bash
# ビルド（npmパッケージとして出力）
wasm-pack build --target web --release

# 生成されるファイル
# pkg/
#   my_wasm_lib_bg.wasm    # WebAssemblyバイナリ
#   my_wasm_lib.js          # JavaScript接着コード
#   my_wasm_lib.d.ts        # TypeScript型定義
#   package.json            # npmパッケージ設定
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rust Wasm Demo</title>
</head>
<body>
  <script type="module">
    import init, { greet } from './pkg/my_wasm_lib.js';

    async function main() {
      await init();
      const message = greet("World");
      document.body.textContent = message;
    }

    main();
  </script>
</body>
</html>
```

## 実践例1：高速画像処理

### グレースケール変換

```rust
// src/image_processing.rs
use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;
use web_sys::ImageData;

#[wasm_bindgen]
pub fn grayscale(data: Clamped<Vec<u8>>, width: u32, height: u32) -> Result<ImageData, JsValue> {
    let mut pixels = data.0;
    let len = pixels.len();

    // RGBA形式: 4バイトずつ処理
    let mut i = 0;
    while i < len {
        let r = pixels[i] as f32;
        let g = pixels[i + 1] as f32;
        let b = pixels[i + 2] as f32;
        // 人間の視覚に合わせた重み付き平均
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
        pixels[i] = gray;
        pixels[i + 1] = gray;
        pixels[i + 2] = gray;
        // アルファチャンネルは維持
        i += 4;
    }

    ImageData::new_with_u8_clamped_array_and_sh(Clamped(&pixels), width, height)
}

#[wasm_bindgen]
pub fn sepia(data: Clamped<Vec<u8>>, width: u32, height: u32) -> Result<ImageData, JsValue> {
    let mut pixels = data.0;
    let len = pixels.len();

    let mut i = 0;
    while i < len {
        let r = pixels[i] as f32;
        let g = pixels[i + 1] as f32;
        let b = pixels[i + 2] as f32;

        pixels[i] = ((r * 0.393 + g * 0.769 + b * 0.189).min(255.0)) as u8;
        pixels[i + 1] = ((r * 0.349 + g * 0.686 + b * 0.168).min(255.0)) as u8;
        pixels[i + 2] = ((r * 0.272 + g * 0.534 + b * 0.131).min(255.0)) as u8;
        i += 4;
    }

    ImageData::new_with_u8_clamped_array_and_sh(Clamped(&pixels), width, height)
}

/// ガウシアンぼかし
#[wasm_bindgen]
pub fn gaussian_blur(
    data: Clamped<Vec<u8>>,
    width: u32,
    height: u32,
    radius: u32,
) -> Result<ImageData, JsValue> {
    let pixels = data.0;
    let mut output = pixels.clone();
    let w = width as usize;
    let h = height as usize;
    let r = radius as i32;

    // カーネルの生成
    let sigma = (radius as f32) / 3.0;
    let kernel_size = (2 * r + 1) as usize;
    let mut kernel = vec![0.0f32; kernel_size];
    let mut sum = 0.0f32;

    for i in 0..kernel_size {
        let x = (i as i32 - r) as f32;
        kernel[i] = (-x * x / (2.0 * sigma * sigma)).exp();
        sum += kernel[i];
    }
    for k in kernel.iter_mut() {
        *k /= sum;
    }

    // 水平パス
    let mut temp = pixels.clone();
    for y in 0..h {
        for x in 0..w {
            let mut r_sum = 0.0f32;
            let mut g_sum = 0.0f32;
            let mut b_sum = 0.0f32;

            for k in 0..kernel_size {
                let kx = (x as i32 + k as i32 - r).clamp(0, w as i32 - 1) as usize;
                let idx = (y * w + kx) * 4;
                r_sum += pixels[idx] as f32 * kernel[k];
                g_sum += pixels[idx + 1] as f32 * kernel[k];
                b_sum += pixels[idx + 2] as f32 * kernel[k];
            }

            let idx = (y * w + x) * 4;
            temp[idx] = r_sum as u8;
            temp[idx + 1] = g_sum as u8;
            temp[idx + 2] = b_sum as u8;
        }
    }

    // 垂直パス
    for y in 0..h {
        for x in 0..w {
            let mut r_sum = 0.0f32;
            let mut g_sum = 0.0f32;
            let mut b_sum = 0.0f32;

            for k in 0..kernel_size {
                let ky = (y as i32 + k as i32 - r).clamp(0, h as i32 - 1) as usize;
                let idx = (ky * w + x) * 4;
                r_sum += temp[idx] as f32 * kernel[k];
                g_sum += temp[idx + 1] as f32 * kernel[k];
                b_sum += temp[idx + 2] as f32 * kernel[k];
            }

            let idx = (y * w + x) * 4;
            output[idx] = r_sum as u8;
            output[idx + 1] = g_sum as u8;
            output[idx + 2] = b_sum as u8;
            output[idx + 3] = temp[idx + 3]; // alpha
        }
    }

    ImageData::new_with_u8_clamped_array_and_sh(Clamped(&output), width, height)
}
```

### JavaScript側での使用

```typescript
// src/image-editor.ts
import init, { grayscale, sepia, gaussian_blur } from '../pkg/my_wasm_lib';

class ImageEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private originalImageData: ImageData | null = null;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
  }

  async initialize() {
    await init();
    console.log('Wasm module loaded');
  }

  loadImage(file: File): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        this.originalImageData = this.ctx.getImageData(
          0, 0, img.width, img.height
        );
        resolve();
      };
      img.src = URL.createObjectURL(file);
    });
  }

  applyGrayscale() {
    if (!this.originalImageData) return;

    const start = performance.now();
    const result = grayscale(
      this.originalImageData.data,
      this.canvas.width,
      this.canvas.height
    );
    const elapsed = performance.now() - start;

    this.ctx.putImageData(result, 0, 0);
    console.log(`Grayscale: ${elapsed.toFixed(2)}ms`);
  }

  applySepia() {
    if (!this.originalImageData) return;

    const start = performance.now();
    const result = sepia(
      this.originalImageData.data,
      this.canvas.width,
      this.canvas.height
    );
    const elapsed = performance.now() - start;

    this.ctx.putImageData(result, 0, 0);
    console.log(`Sepia: ${elapsed.toFixed(2)}ms`);
  }

  applyBlur(radius: number) {
    if (!this.originalImageData) return;

    const start = performance.now();
    const result = gaussian_blur(
      this.originalImageData.data,
      this.canvas.width,
      this.canvas.height,
      radius
    );
    const elapsed = performance.now() - start;

    this.ctx.putImageData(result, 0, 0);
    console.log(`Blur (r=${radius}): ${elapsed.toFixed(2)}ms`);
  }

  reset() {
    if (this.originalImageData) {
      this.ctx.putImageData(this.originalImageData, 0, 0);
    }
  }
}

// 使用例
const editor = new ImageEditor('canvas');
await editor.initialize();
```

## 実践例2：高速CSV/JSONデータ変換

```rust
// src/data_transform.rs
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct CsvOptions {
    delimiter: Option<String>,
    has_header: Option<bool>,
    quote_char: Option<String>,
}

#[wasm_bindgen]
pub fn json_to_csv(json_str: &str, options_val: JsValue) -> Result<String, JsValue> {
    let options: CsvOptions = serde_wasm_bindgen::from_value(options_val)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let delimiter = options.delimiter.unwrap_or_else(|| ",".to_string());
    let records: Vec<serde_json::Value> = serde_json::from_str(json_str)
        .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;

    if records.is_empty() {
        return Ok(String::new());
    }

    let mut csv = String::with_capacity(json_str.len());

    // ヘッダー行
    if let Some(obj) = records[0].as_object() {
        let headers: Vec<&str> = obj.keys().map(|k| k.as_str()).collect();
        csv.push_str(&headers.join(&delimiter));
        csv.push('\n');

        // データ行
        for record in &records {
            if let Some(obj) = record.as_object() {
                let values: Vec<String> = headers
                    .iter()
                    .map(|h| {
                        obj.get(*h)
                            .map(|v| match v {
                                serde_json::Value::String(s) => {
                                    if s.contains(&delimiter) || s.contains('"') || s.contains('\n') {
                                        format!("\"{}\"", s.replace('"', "\"\""))
                                    } else {
                                        s.clone()
                                    }
                                }
                                serde_json::Value::Null => String::new(),
                                other => other.to_string(),
                            })
                            .unwrap_or_default()
                    })
                    .collect();
                csv.push_str(&values.join(&delimiter));
                csv.push('\n');
            }
        }
    }

    Ok(csv)
}

#[wasm_bindgen]
pub fn csv_to_json(csv_str: &str, delimiter: &str) -> Result<String, JsValue> {
    let lines: Vec<&str> = csv_str.lines().collect();

    if lines.is_empty() {
        return Ok("[]".to_string());
    }

    let headers: Vec<&str> = lines[0].split(delimiter).collect();
    let mut records = Vec::with_capacity(lines.len() - 1);

    for line in &lines[1..] {
        if line.trim().is_empty() {
            continue;
        }

        let values: Vec<&str> = line.split(delimiter).collect();
        let mut obj = serde_json::Map::new();

        for (i, header) in headers.iter().enumerate() {
            let value = values.get(i).unwrap_or(&"");
            let trimmed = header.trim().trim_matches('"');

            // 数値判定
            if let Ok(n) = value.parse::<i64>() {
                obj.insert(
                    trimmed.to_string(),
                    serde_json::Value::Number(n.into()),
                );
            } else if let Ok(n) = value.parse::<f64>() {
                if let Some(num) = serde_json::Number::from_f64(n) {
                    obj.insert(trimmed.to_string(), serde_json::Value::Number(num));
                }
            } else {
                obj.insert(
                    trimmed.to_string(),
                    serde_json::Value::String(value.trim_matches('"').to_string()),
                );
            }
        }

        records.push(serde_json::Value::Object(obj));
    }

    serde_json::to_string(&records)
        .map_err(|e| JsValue::from_str(&format!("JSON serialize error: {}", e)))
}
```

## 実践例3：暗号化・ハッシュ計算

```rust
// src/crypto.rs
use wasm_bindgen::prelude::*;

/// SHA-256ハッシュ計算（純Rust実装）
#[wasm_bindgen]
pub fn sha256(input: &str) -> String {
    let bytes = input.as_bytes();
    let hash = compute_sha256(bytes);
    hash.iter().map(|b| format!("{:02x}", b)).collect()
}

fn compute_sha256(data: &[u8]) -> [u8; 32] {
    // SHA-256初期ハッシュ値
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];

    // SHA-256定数
    let k: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
        0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
        0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
        0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
        0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
        0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
        0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];

    // パディング
    let bit_len = (data.len() as u64) * 8;
    let mut padded = data.to_vec();
    padded.push(0x80);
    while (padded.len() % 64) != 56 {
        padded.push(0);
    }
    padded.extend_from_slice(&bit_len.to_be_bytes());

    // ブロック処理
    for chunk in padded.chunks(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([
                chunk[4 * i],
                chunk[4 * i + 1],
                chunk[4 * i + 2],
                chunk[4 * i + 3],
            ]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }

        let mut a = h[0];
        let mut b = h[1];
        let mut c = h[2];
        let mut d = h[3];
        let mut e = h[4];
        let mut f = h[5];
        let mut g = h[6];
        let mut hh = h[7];

        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let temp1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(k[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(maj);

            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }

        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }

    let mut result = [0u8; 32];
    for (i, &val) in h.iter().enumerate() {
        result[4 * i..4 * i + 4].copy_from_slice(&val.to_be_bytes());
    }
    result
}

/// Base64エンコード
#[wasm_bindgen]
pub fn base64_encode(input: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut result = String::with_capacity((input.len() + 2) / 3 * 4);
    let chunks = input.chunks(3);

    for chunk in chunks {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };

        let triple = (b0 << 16) | (b1 << 8) | b2;

        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);

        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }

        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }

    result
}
```

## JavaScript/TypeScript連携パターン

### 構造体の受け渡し

```rust
// src/models.rs
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize)]
pub struct Rectangle {
    pub origin: Point,
    pub width: f64,
    pub height: f64,
}

#[wasm_bindgen]
pub fn calculate_area(rect_val: JsValue) -> Result<f64, JsValue> {
    let rect: Rectangle = serde_wasm_bindgen::from_value(rect_val)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    Ok(rect.width * rect.height)
}

#[wasm_bindgen]
pub fn find_intersection(
    rect1_val: JsValue,
    rect2_val: JsValue,
) -> Result<JsValue, JsValue> {
    let r1: Rectangle = serde_wasm_bindgen::from_value(rect1_val)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    let r2: Rectangle = serde_wasm_bindgen::from_value(rect2_val)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let x1 = r1.origin.x.max(r2.origin.x);
    let y1 = r1.origin.y.max(r2.origin.y);
    let x2 = (r1.origin.x + r1.width).min(r2.origin.x + r2.width);
    let y2 = (r1.origin.y + r1.height).min(r2.origin.y + r2.height);

    if x1 < x2 && y1 < y2 {
        let intersection = Rectangle {
            origin: Point { x: x1, y: y1 },
            width: x2 - x1,
            height: y2 - y1,
        };
        serde_wasm_bindgen::to_value(&intersection)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    } else {
        Ok(JsValue::NULL)
    }
}
```

```typescript
// TypeScript側での使用
import init, { calculate_area, find_intersection } from '../pkg/my_wasm_lib';

await init();

const rect1 = { origin: { x: 0, y: 0 }, width: 100, height: 50 };
const rect2 = { origin: { x: 50, y: 25 }, width: 100, height: 50 };

const area = calculate_area(rect1);
console.log(`面積: ${area}`); // 面積: 5000

const intersection = find_intersection(rect1, rect2);
console.log('交差領域:', intersection);
// { origin: { x: 50, y: 25 }, width: 50, height: 25 }
```

### DOM操作

```rust
// src/dom.rs
use wasm_bindgen::prelude::*;
use web_sys::{Document, Element, HtmlElement};

fn get_document() -> Document {
    web_sys::window()
        .expect("no global window exists")
        .document()
        .expect("should have a document on window")
}

#[wasm_bindgen]
pub fn create_todo_item(text: &str) -> Result<(), JsValue> {
    let document = get_document();
    let list = document
        .get_element_by_id("todo-list")
        .expect("todo-list element not found");

    let li = document.create_element("li")?;
    li.set_class_name("todo-item");

    let checkbox = document.create_element("input")?;
    checkbox.set_attribute("type", "checkbox")?;

    let label = document.create_element("span")?;
    label.set_text_content(Some(text));

    let delete_btn = document
        .create_element("button")?
        .dyn_into::<HtmlElement>()?;
    delete_btn.set_text_content(Some("削除"));
    delete_btn.set_class_name("delete-btn");

    // クリックイベントハンドラ
    let li_clone = li.clone();
    let closure = Closure::wrap(Box::new(move || {
        li_clone.remove();
    }) as Box<dyn Fn()>);

    delete_btn.set_onclick(Some(closure.as_ref().unchecked_ref()));
    closure.forget(); // メモリリーク注意: 実運用ではライフタイム管理が必要

    li.append_child(&checkbox)?;
    li.append_child(&label)?;
    li.append_child(&delete_btn)?;
    list.append_child(&li)?;

    Ok(())
}
```

## テスト

### Rust側のユニットテスト

```rust
// src/lib.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256() {
        let hash = sha256("hello");
        assert_eq!(
            hash,
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
    }

    #[test]
    fn test_base64_encode() {
        assert_eq!(base64_encode(b"Hello"), "SGVsbG8=");
        assert_eq!(base64_encode(b"Hello, World!"), "SGVsbG8sIFdvcmxkIQ==");
    }
}
```

### wasm-bindgen-testによるブラウザテスト

```rust
// tests/web.rs
use wasm_bindgen_test::*;
use my_wasm_lib::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_greet() {
    let result = greet("Rust");
    assert_eq!(result, "こんにちは、Rustさん！");
}

#[wasm_bindgen_test]
fn test_sha256_in_browser() {
    let hash = sha256("test");
    assert_eq!(
        hash,
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    );
}

#[wasm_bindgen_test]
fn test_json_to_csv() {
    let json = r#"[{"name":"田中","age":30},{"name":"鈴木","age":25}]"#;
    let options = serde_wasm_bindgen::to_value(&CsvOptions {
        delimiter: Some(",".to_string()),
        has_header: Some(true),
        quote_char: None,
    }).unwrap();

    let csv = json_to_csv(json, options).unwrap();
    assert!(csv.contains("name,age"));
    assert!(csv.contains("田中,30"));
}
```

```bash
# テスト実行
# ネイティブテスト
cargo test

# ブラウザテスト
wasm-pack test --headless --chrome
wasm-pack test --headless --firefox
```

## Webフレームワークとの統合

### Next.js との統合

```typescript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // wasmファイルの出力設定
    config.output.webassemblyModuleFilename =
      isServer
        ? './../static/wasm/[modulehash].wasm'
        : 'static/wasm/[modulehash].wasm';

    return config;
  },
};

export default nextConfig;
```

```tsx
// src/hooks/useWasm.ts
"use client"

import { useEffect, useState } from 'react';

export function useWasm() {
  const [wasm, setWasm] = useState<typeof import('../../pkg/my_wasm_lib') | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadWasm() {
      try {
        const wasmModule = await import('../../pkg/my_wasm_lib');
        await wasmModule.default();
        setWasm(wasmModule);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    }

    loadWasm();
  }, []);

  return { wasm, loading, error };
}
```

```tsx
// src/components/HashGenerator.tsx
"use client"

import { useState } from 'react';
import { useWasm } from '@/hooks/useWasm';

export function HashGenerator() {
  const { wasm, loading } = useWasm();
  const [input, setInput] = useState('');
  const [hash, setHash] = useState('');

  if (loading) return <p>Wasmモジュール読み込み中...</p>;

  const handleHash = () => {
    if (wasm) {
      const result = wasm.sha256(input);
      setHash(result);
    }
  };

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="ハッシュ化するテキスト"
      />
      <button onClick={handleHash}>SHA-256</button>
      {hash && <pre>{hash}</pre>}
    </div>
  );
}
```

## パフォーマンス最適化

### バイナリサイズの削減

```toml
# Cargo.toml
[profile.release]
opt-level = "z"       # サイズ最適化（速度よりサイズ優先）
lto = true            # リンク時最適化
codegen-units = 1     # 単一コンパイルユニット
panic = "abort"       # パニック時にunwindしない
strip = true          # シンボル情報除去
```

```bash
# wasm-optでさらに最適化
npm install -g binaryen

wasm-pack build --release
wasm-opt -Oz -o pkg/my_wasm_lib_bg_opt.wasm pkg/my_wasm_lib_bg.wasm

# サイズ比較
ls -la pkg/my_wasm_lib_bg.wasm
ls -la pkg/my_wasm_lib_bg_opt.wasm
# 通常: 120KB → wasm-opt後: 85KB（約30%削減）
```

### メモリ管理のベストプラクティス

```rust
// 大きなデータの受け渡しにはShared Memoryを活用
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct DataProcessor {
    buffer: Vec<u8>,
}

#[wasm_bindgen]
impl DataProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Self {
        DataProcessor {
            buffer: vec![0u8; size],
        }
    }

    /// バッファへのポインタを返す（JS側からSharedArrayBufferでアクセス可能）
    pub fn buffer_ptr(&self) -> *const u8 {
        self.buffer.as_ptr()
    }

    pub fn buffer_len(&self) -> usize {
        self.buffer.len()
    }

    /// バッファ内のデータを処理
    pub fn process(&mut self) -> u32 {
        let mut checksum: u32 = 0;
        for byte in &self.buffer {
            checksum = checksum.wrapping_add(*byte as u32);
        }
        checksum
    }
}
```

```typescript
// JavaScript側でWasmメモリに直接書き込み
import init, { DataProcessor } from '../pkg/my_wasm_lib';

const wasmModule = await init();
const processor = new DataProcessor(1024 * 1024); // 1MB

// Wasmメモリに直接アクセス
const wasmMemory = new Uint8Array(
  wasmModule.memory.buffer,
  processor.buffer_ptr(),
  processor.buffer_len()
);

// データを直接書き込み（コピーなし）
const fileData = new Uint8Array(await file.arrayBuffer());
wasmMemory.set(fileData);

// 処理実行
const checksum = processor.process();
```

## デバッグ

### console_errorパニックフック

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn main() {
    // パニック時にブラウザコンソールにスタックトレースを表示
    console_error_panic_hook::set_once();
}
```

```toml
# Cargo.toml
[dependencies]
console_error_panic_hook = "0.1"
```

### ブラウザDevToolsでのデバッグ

```bash
# デバッグビルド（DWARFデバッグ情報付き）
wasm-pack build --dev

# Chrome DevToolsでWasmをステップ実行可能
# Sources > wasm > ソースマップ付きでブレークポイント設定可能
```

## まとめ

Rust×WebAssemblyは、2026年のWeb開発においてパフォーマンスクリティカルな処理を実現する最も実践的な選択肢の一つです。本記事で紹介した内容をまとめます。

- **パフォーマンス**: JavaScriptと比較して、画像処理で約5倍、行列演算で約11倍の高速化が可能
- **ツールチェーン**: wasm-packにより、ビルドからnpmパッケージ化まで自動化されたワークフローが利用可能
- **JavaScript連携**: wasm-bindgenとserde-wasm-bindgenにより、複雑なデータ構造のシームレスな受け渡しが可能
- **テスト**: wasm-bindgen-testにより、ブラウザ環境でのテストも容易に実行可能
- **フレームワーク統合**: Next.js等のモダンフレームワークとWebpackのasyncWebAssembly設定で統合可能
- **最適化**: wasm-optやCargo.tomlのプロファイル設定により、バイナリサイズを大幅に削減可能

まずは画像処理やデータ変換など、計算負荷の高い単一機能をWasmに置き換えることから始め、効果を測定しながら適用範囲を広げていくアプローチがおすすめです。
