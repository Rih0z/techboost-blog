---
title: "Tauri v2でデスクトップアプリ開発 — Electron代替の決定版"
description: "Tauri v2の新機能、プロジェクト作成、IPC通信、マルチプラットフォームビルド、プラグインシステムを解説。軽量で安全なデスクトップアプリを開発しましょう。"
pubDate: "2026-02-05"
tags: ["Tauri", "Desktop App", "Rust", "Electron Alternative"]
---

## Tauriとは

Tauriは、Web技術(HTML/CSS/JavaScript)とRustを組み合わせてデスクトップアプリを作るフレームワークです。Electronの代替として急速に注目を集めています。

### Electronとの比較

| 項目 | Tauri | Electron |
|------|-------|----------|
| バイナリサイズ | 3-5 MB | 120-150 MB |
| メモリ使用量 | 50-100 MB | 200-400 MB |
| 起動時間 | <1秒 | 2-3秒 |
| バックエンド言語 | Rust | Node.js |
| セキュリティ | 高(デフォルトで厳格) | 中(設定次第) |
| プラットフォーム | Windows, macOS, Linux | Windows, macOS, Linux |

## Tauri v2の新機能(2026年)

- **モバイル対応**: Android/iOSアプリのビルドサポート
- **プラグインシステムの改善**: 公式プラグインが充実
- **パフォーマンス向上**: 起動時間が30%短縮
- **マルチウィンドウ**: 複数ウィンドウの管理が容易に
- **深層リンク**: カスタムURLスキーム対応

## セットアップ

### 前提条件

```bash
# Rustインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# プラットフォーム別の依存関係
# macOS
xcode-select --install

# Windows(PowerShell管理者権限)
# Microsoft Visual Studio C++ Build Toolsをインストール

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### プロジェクト作成

```bash
# Tauri CLIインストール
cargo install tauri-cli

# プロジェクト作成
npm create tauri-app@latest

# 対話式で以下を選択
# - App name: my-tauri-app
# - Frontend: React / Vue / Svelte / Vanilla
# - TypeScript: Yes
```

または既存のフロントエンドプロジェクトに追加:

```bash
cd my-existing-app
npm install -D @tauri-apps/cli
npx tauri init
```

## プロジェクト構造

```
my-tauri-app/
├── src/               # フロントエンド(React/Vue/Svelteなど)
├── src-tauri/         # Rustバックエンド
│   ├── src/
│   │   └── main.rs    # エントリーポイント
│   ├── Cargo.toml     # Rust依存関係
│   ├── tauri.conf.json # Tauri設定
│   └── icons/         # アプリアイコン
└── package.json
```

## 基本的な実装

### Rustバックエンド

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Tauriコマンド定義
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[tauri::command]
async fn fetch_data() -> Result<String, String> {
    // 非同期処理
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    Ok("Data from backend".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, add, fetch_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### フロントエンド(React + TypeScript)

```typescript
// src/App.tsx
import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    const message = await invoke<string>("greet", { name });
    setGreetMsg(message);
  }

  async function calculate() {
    const result = await invoke<number>("add", { a: 10, b: 20 });
    console.log("Result:", result); // 30
  }

  return (
    <div>
      <h1>Welcome to Tauri!</h1>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
      />
      <button onClick={greet}>Greet</button>
      <p>{greetMsg}</p>

      <button onClick={calculate}>Calculate</button>
    </div>
  );
}

export default App;
```

### 開発とビルド

```bash
# 開発モード(ホットリロード有効)
npm run tauri dev

# プロダクションビルド
npm run tauri build

# ビルド成果物
# macOS: src-tauri/target/release/bundle/dmg/
# Windows: src-tauri/target/release/bundle/msi/
# Linux: src-tauri/target/release/bundle/appimage/
```

## IPC通信(高度な例)

### ファイル操作

```rust
use tauri::command;
use std::fs;

#[command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| e.to_string())
}

#[command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| e.to_string())
}

#[command]
fn list_files(dir: String) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect();
    Ok(entries)
}
```

```typescript
import { invoke } from "@tauri-apps/api/tauri";

// ファイル読み込み
const content = await invoke<string>("read_file", {
  path: "/path/to/file.txt"
});

// ファイル書き込み
await invoke("write_file", {
  path: "/path/to/output.txt",
  content: "Hello, Tauri!"
});

// ディレクトリ一覧
const files = await invoke<string[]>("list_files", {
  dir: "/path/to/directory"
});
```

### ステート管理

```rust
use tauri::State;
use std::sync::Mutex;

struct AppState {
    counter: Mutex<i32>,
}

#[command]
fn increment(state: State<AppState>) -> i32 {
    let mut counter = state.counter.lock().unwrap();
    *counter += 1;
    *counter
}

#[command]
fn get_counter(state: State<AppState>) -> i32 {
    *state.counter.lock().unwrap()
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            counter: Mutex::new(0),
        })
        .invoke_handler(tauri::generate_handler![increment, get_counter])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### イベント通信(双方向)

```rust
use tauri::{Manager, Window};

#[command]
async fn start_task(window: Window) {
    for i in 0..100 {
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // フロントエンドにイベント送信
        window.emit("progress", i).unwrap();
    }
    window.emit("complete", ()).unwrap();
}
```

```typescript
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";

// イベントリスナー登録
const unlisten1 = await listen<number>("progress", (event) => {
  console.log("Progress:", event.payload);
  setProgress(event.payload);
});

const unlisten2 = await listen("complete", () => {
  console.log("Task completed!");
});

// タスク開始
await invoke("start_task");

// クリーンアップ
unlisten1();
unlisten2();
```

## 公式プラグイン

### ファイルシステム

```bash
npm install @tauri-apps/plugin-fs
```

```typescript
import { readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";

// アプリデータディレクトリに保存
await writeTextFile("config.json", JSON.stringify(config), {
  dir: BaseDirectory.AppData,
});

// 読み込み
const content = await readTextFile("config.json", {
  dir: BaseDirectory.AppData,
});
```

### ダイアログ

```bash
npm install @tauri-apps/plugin-dialog
```

```typescript
import { open, save, message } from "@tauri-apps/plugin-dialog";

// ファイル選択ダイアログ
const selected = await open({
  multiple: false,
  filters: [
    { name: "Image", extensions: ["png", "jpg", "jpeg"] },
    { name: "Document", extensions: ["pdf", "doc", "docx"] },
  ],
});

// 保存ダイアログ
const savePath = await save({
  defaultPath: "output.txt",
});

// メッセージボックス
await message("Operation completed successfully!", {
  title: "Success",
  type: "info"
});
```

### 通知

```bash
npm install @tauri-apps/plugin-notification
```

```typescript
import { sendNotification } from "@tauri-apps/plugin-notification";

await sendNotification({
  title: "Update Available",
  body: "A new version is ready to install.",
});
```

### HTTPクライアント

```bash
npm install @tauri-apps/plugin-http
```

```typescript
import { fetch } from "@tauri-apps/plugin-http";

const response = await fetch("https://api.example.com/data", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
});

const data = await response.json();
```

## マルチウィンドウ

```rust
use tauri::{Manager, WindowBuilder};

#[command]
fn open_settings_window(app: tauri::AppHandle) {
    let window = WindowBuilder::new(
        &app,
        "settings",
        tauri::WindowUrl::App("settings.html".into()),
    )
    .title("Settings")
    .inner_size(600.0, 400.0)
    .build()
    .unwrap();
}
```

```typescript
import { WebviewWindow } from "@tauri-apps/api/window";

// 新しいウィンドウを開く
const webview = new WebviewWindow("settings", {
  url: "settings.html",
  title: "Settings",
  width: 600,
  height: 400,
});

webview.once("tauri://created", () => {
  console.log("Window created");
});

webview.once("tauri://error", (e) => {
  console.error("Error creating window:", e);
});
```

## 設定とカスタマイズ

```json
// src-tauri/tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "My Tauri App",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "scope": ["$APPDATA/*"]
      },
      "dialog": {
        "all": true
      },
      "http": {
        "all": true,
        "request": true,
        "scope": ["https://api.example.com/*"]
      }
    },
    "windows": [
      {
        "title": "My Tauri App",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' data: https:"
    }
  }
}
```

## アップデーター

```bash
npm install @tauri-apps/plugin-updater
```

```rust
use tauri_plugin_updater::UpdaterExt;

#[command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<bool, String> {
    let update = app.updater().check().await
        .map_err(|e| e.to_string())?;

    if let Some(update) = update {
        let mut downloaded = 0;

        update
            .download_and_install(|chunk_length, content_length| {
                downloaded += chunk_length;
                println!("Downloaded {}/{}", downloaded, content_length.unwrap_or(0));
            })
            .await
            .map_err(|e| e.to_string())?;

        Ok(true)
    } else {
        Ok(false)
    }
}
```

## ビルドとリリース

### GitHub Actionsで自動ビルド

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  release:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Install dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev
      - run: npm install
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: "App v__VERSION__"
          releaseBody: "See the assets to download this version."
          releaseDraft: true
          prerelease: false
```

## まとめ

Tauri v2は、軽量・高速・安全なデスクトップアプリ開発の新しいスタンダードです。

**Tauriを選ぶべき理由:**
- バイナリサイズが小さい(Electronの1/30)
- メモリ使用量が少ない
- Rustの安全性とパフォーマンス
- モダンなWeb技術を活用
- クロスプラットフォーム対応

次のデスクトップアプリプロジェクトでは、ぜひTauriを検討してください。

公式サイト: https://tauri.app/
