---
title: "Tauri 2.0完全ガイド — Rust + Web技術でデスクトップ&モバイルアプリ開発"
description: "Tauri 2.0でデスクトップとモバイルの両方に対応するクロスプラットフォームアプリを構築する方法を、セットアップからビルド・配布まで実践的なコード付きで徹底解説します。"
pubDate: "2026-03-05"
tags: ["Tauri", "Rust", "デスクトップアプリ", "クロスプラットフォーム", "TypeScript"]
---

Tauri 2.0は、Rust + Web技術によるクロスプラットフォームアプリ開発の新たな標準です。デスクトップだけでなく、Android・iOSにも対応し、1つのコードベースから5プラットフォームへの配布が可能になりました。本記事では、Tauri 2.0のセットアップからモバイル対応、ビルド・配布までを実践的なコード例とともに徹底解説します。

## Tauri 2.0の新機能

Tauri 2.0は1.x系からのメジャーアップデートで、アーキテクチャが大幅に刷新されました。

### 主要な変更点

**1. モバイルサポート（Android / iOS）**

最大の変更点はモバイル対応です。同じRustバックエンドとWebフロントエンドのコードベースから、Android・iOSアプリをビルドできます。

```
tauri-app/
├── src-tauri/          # Rustバックエンド（共通）
├── src/                # Webフロントエンド（共通）
├── gen/
│   ├── android/        # Android固有コード（自動生成）
│   └── apple/          # iOS固有コード（自動生成）
```

**2. プラグインシステムの完全刷新**

1.x系のAPIモジュールはすべてプラグインとして再設計されました。必要な機能だけを選択的に導入できるため、バイナリサイズの最適化が容易です。

```toml
# Cargo.toml - 必要なプラグインだけ追加
[dependencies]
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
tauri-plugin-shell = "2"
tauri-plugin-http = "2"
```

**3. 新しいパーミッションシステム**

セキュリティモデルが強化され、各機能へのアクセスを細かく制御できます。`capabilities`ディレクトリで宣言的にパーミッションを定義します。

```json
{
  "identifier": "main-capability",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:allow-read-text-file",
    "dialog:allow-open",
    "shell:allow-open"
  ]
}
```

**4. マルチWebViewサポート**

1つのウィンドウ内に複数のWebViewを配置できるようになりました。サイドバーとメインコンテンツを別々のWebViewとして管理するなど、柔軟なUI構成が可能です。

**5. 強化されたIPC（プロセス間通信）**

コマンドのシリアライゼーションが改善され、バイナリデータの転送が効率化されました。また、チャネルベースのストリーミング通信もサポートされています。

## セットアップ

### 前提条件

開発環境に以下をインストールします。

```bash
# Rustのインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js (v18以上推奨)
# fnm, nvm, またはvoltaを使用

# システム依存パッケージ (Ubuntu/Debian)
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# macOSの場合はXcodeコマンドラインツール
xcode-select --install
```

### モバイル開発の追加要件

```bash
# Android
# Android Studioをインストールし、以下を設定
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 $ANDROID_HOME/ndk)"

# Rustのモバイルターゲットを追加
rustup target add aarch64-linux-android armv7-linux-androideabi \
  i686-linux-android x86_64-linux-android

# iOS (macOS限定)
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
```

### プロジェクトの作成

```bash
# Tauri CLIでプロジェクト生成
npm create tauri-app@latest

# 対話的に選択
# ✔ Project name: my-tauri-app
# ✔ Identifier: com.example.myapp
# ✔ Frontend language: TypeScript / JavaScript
# ✔ Package manager: npm
# ✔ UI template: React (TypeScript)
# ✔ UI flavor: TypeScript

cd my-tauri-app
npm install
```

### プロジェクト構造

生成されたプロジェクトの構造を確認します。

```
my-tauri-app/
├── package.json
├── src/                        # Reactフロントエンド
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── src-tauri/                  # Rustバックエンド
│   ├── Cargo.toml
│   ├── tauri.conf.json         # Tauri設定
│   ├── capabilities/           # パーミッション定義
│   │   └── default.json
│   ├── src/
│   │   ├── main.rs             # エントリーポイント
│   │   └── lib.rs              # コマンド定義
│   └── icons/                  # アプリアイコン
├── index.html
├── tsconfig.json
└── vite.config.ts
```

### 開発サーバーの起動

```bash
# デスクトップで開発
npm run tauri dev

# モバイル開発の初期化
npm run tauri android init
npm run tauri ios init

# Android開発
npm run tauri android dev

# iOS開発 (macOS限定)
npm run tauri ios dev
```

## フロントエンド構築（React + TypeScript）

Tauriのフロントエンドは通常のWebアプリとほぼ同じです。React、Vue、Svelte、SolidJSなど好みのフレームワークを使えます。ここではReactを使った実装例を示します。

### Tauri APIの利用

`@tauri-apps/api`パッケージからネイティブ機能にアクセスします。

```bash
npm install @tauri-apps/api
npm install @tauri-apps/plugin-fs @tauri-apps/plugin-dialog
```

### ファイル操作アプリの例

```tsx
// src/App.tsx
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

function App() {
  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);

  // ファイルを開く
  const handleOpen = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "テキストファイル", extensions: ["txt", "md", "json"] },
        { name: "すべてのファイル", extensions: ["*"] },
      ],
    });

    if (selected) {
      const text = await readTextFile(selected);
      setContent(text);
      setFilePath(selected);
      // Rustバックエンドで文字数カウント
      const count = await invoke<number>("count_words", { text });
      setWordCount(count);
    }
  };

  // ファイルを保存
  const handleSave = async () => {
    const path = filePath ?? await save({
      filters: [{ name: "テキストファイル", extensions: ["txt"] }],
    });

    if (path) {
      await writeTextFile(path, content);
      setFilePath(path);
    }
  };

  // Rustバックエンドでテキスト解析
  const handleAnalyze = async () => {
    const result = await invoke<TextAnalysis>("analyze_text", {
      text: content,
    });
    alert(
      `文字数: ${result.char_count}\n` +
      `単語数: ${result.word_count}\n` +
      `行数: ${result.line_count}\n` +
      `読了時間: 約${result.reading_minutes}分`
    );
  };

  return (
    <div className="container">
      <header>
        <h1>テキストエディタ</h1>
        <div className="toolbar">
          <button onClick={handleOpen}>開く</button>
          <button onClick={handleSave}>保存</button>
          <button onClick={handleAnalyze}>解析</button>
          <span className="word-count">単語数: {wordCount}</span>
        </div>
      </header>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="テキストを入力または、ファイルを開いてください..."
      />
      {filePath && <footer>ファイル: {filePath}</footer>}
    </div>
  );
}

// 型定義
interface TextAnalysis {
  char_count: number;
  word_count: number;
  line_count: number;
  reading_minutes: number;
}

export default App;
```

### カスタムフック: useInvoke

Rustコマンドの呼び出しを簡潔にするカスタムフックを作成します。

```tsx
// src/hooks/useInvoke.ts
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface UseInvokeResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: unknown[]) => Promise<T | null>;
}

export function useInvoke<T>(command: string): UseInvokeResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (args?: Record<string, unknown>): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await invoke<T>(command, args);
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [command]
  );

  return { data, loading, error, execute };
}
```

### イベントリスナーの設定

Rustバックエンドからのイベントをフロントエンドで受信できます。

```tsx
// src/hooks/useBackendEvent.ts
import { useEffect } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

export function useBackendEvent<T>(
  event: string,
  handler: (payload: T) => void
) {
  useEffect(() => {
    let unlisten: UnlistenFn;

    listen<T>(event, (e) => {
      handler(e.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [event, handler]);
}

// 使用例: 進捗通知の受信
// useBackendEvent<{ progress: number; message: string }>(
//   "processing-progress",
//   ({ progress, message }) => {
//     setProgress(progress);
//     setStatusMessage(message);
//   }
// );
```

## Rustバックエンド

Tauriの真価はRustバックエンドにあります。高速で安全な処理をネイティブレベルで実行できます。

### コマンドの定義

```rust
// src-tauri/src/lib.rs
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct TextAnalysis {
    pub char_count: usize,
    pub word_count: usize,
    pub line_count: usize,
    pub reading_minutes: f64,
}

// 基本的なコマンド
#[tauri::command]
fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

// 構造体を返すコマンド
#[tauri::command]
fn analyze_text(text: &str) -> TextAnalysis {
    let char_count = text.chars().count();
    let word_count = text.split_whitespace().count();
    let line_count = text.lines().count();
    // 日本語は1分400文字、英語は1分200単語で計算
    let reading_minutes = (char_count as f64 / 400.0).max(word_count as f64 / 200.0);

    TextAnalysis {
        char_count,
        word_count,
        line_count,
        reading_minutes,
    }
}

// 非同期コマンド
#[tauri::command]
async fn search_files(
    directory: String,
    pattern: String,
) -> Result<Vec<SearchResult>, String> {
    use std::path::Path;
    use tokio::fs;

    let dir = Path::new(&directory);
    if !dir.is_dir() {
        return Err("指定されたパスはディレクトリではありません".into());
    }

    let mut results = Vec::new();
    search_recursive(dir, &pattern, &mut results)
        .await
        .map_err(|e| e.to_string())?;

    Ok(results)
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    path: String,
    line_number: usize,
    line_content: String,
}

async fn search_recursive(
    dir: &std::path::Path,
    pattern: &str,
    results: &mut Vec<SearchResult>,
) -> Result<(), std::io::Error> {
    let mut entries = tokio::fs::read_dir(dir).await?;

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        if path.is_dir() {
            Box::pin(search_recursive(&path, pattern, results)).await?;
        } else if path.is_file() {
            if let Ok(content) = tokio::fs::read_to_string(&path).await {
                for (i, line) in content.lines().enumerate() {
                    if line.contains(pattern) {
                        results.push(SearchResult {
                            path: path.display().to_string(),
                            line_number: i + 1,
                            line_content: line.to_string(),
                        });
                    }
                }
            }
        }
    }
    Ok(())
}

// アプリケーション初期化
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 起動時の処理
            let window = app.get_webview_window("main").unwrap();
            window.set_title("テキストエディタ v1.0").unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            count_words,
            analyze_text,
            search_files,
        ])
        .run(tauri::generate_context!())
        .expect("Tauriアプリの起動に失敗しました");
}
```

### エントリーポイント

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    my_tauri_app_lib::run();
}
```

### Cargo.toml の設定

```toml
# src-tauri/Cargo.toml
[package]
name = "my-tauri-app"
version = "0.1.0"
edition = "2021"

[lib]
name = "my_tauri_app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
```

### イベントの送信（バックエンドからフロントエンドへ）

長時間処理の進捗を通知する例です。

```rust
use tauri::{AppHandle, Emitter};

#[tauri::command]
async fn process_large_file(
    app: AppHandle,
    file_path: String,
) -> Result<String, String> {
    let content = tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| e.to_string())?;

    let lines: Vec<&str> = content.lines().collect();
    let total = lines.len();

    for (i, line) in lines.iter().enumerate() {
        // 処理ロジック（省略）

        // 進捗をフロントエンドに通知
        if i % 100 == 0 {
            app.emit("processing-progress", serde_json::json!({
                "progress": (i as f64 / total as f64 * 100.0) as u32,
                "message": format!("{}/{} 行を処理中...", i, total),
            })).unwrap();
        }
    }

    app.emit("processing-progress", serde_json::json!({
        "progress": 100,
        "message": "処理完了",
    })).unwrap();

    Ok(format!("{}行の処理が完了しました", total))
}
```

### 状態管理

アプリケーション全体で共有する状態を管理します。

```rust
use std::sync::Mutex;
use tauri::State;

// アプリケーション状態
pub struct AppState {
    pub recent_files: Mutex<Vec<String>>,
    pub settings: Mutex<AppSettings>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub theme: String,
    pub font_size: u32,
    pub auto_save: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            font_size: 14,
            auto_save: true,
        }
    }
}

#[tauri::command]
fn get_settings(state: State<AppState>) -> AppSettings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn update_settings(
    state: State<AppState>,
    settings: AppSettings,
) -> Result<(), String> {
    let mut current = state.settings.lock().map_err(|e| e.to_string())?;
    *current = settings;
    Ok(())
}

#[tauri::command]
fn add_recent_file(state: State<AppState>, path: String) {
    let mut files = state.recent_files.lock().unwrap();
    files.retain(|f| f != &path);
    files.insert(0, path);
    if files.len() > 10 {
        files.truncate(10);
    }
}

// run()内で状態を登録
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            recent_files: Mutex::new(Vec::new()),
            settings: Mutex::new(AppSettings::default()),
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            update_settings,
            add_recent_file,
        ])
        .run(tauri::generate_context!())
        .expect("Tauriアプリの起動に失敗しました");
}
```

## モバイル対応

Tauri 2.0の目玉機能であるモバイル対応について解説します。

### モバイルプロジェクトの初期化

```bash
# Androidプロジェクトの生成
npm run tauri android init

# iOSプロジェクトの生成 (macOS限定)
npm run tauri ios init
```

これにより`gen/android/`と`gen/apple/`ディレクトリが生成されます。

### プラットフォーム固有のコード

フロントエンドでプラットフォームを判定して表示を切り替えます。

```tsx
// src/hooks/usePlatform.ts
import { platform } from "@tauri-apps/plugin-os";

type Platform = "android" | "ios" | "macos" | "windows" | "linux";

export function usePlatform() {
  const [currentPlatform, setCurrentPlatform] = useState<Platform>("macos");

  useEffect(() => {
    platform().then(setCurrentPlatform);
  }, []);

  return {
    platform: currentPlatform,
    isMobile: currentPlatform === "android" || currentPlatform === "ios",
    isDesktop: !["android", "ios"].includes(currentPlatform),
  };
}
```

```tsx
// src/components/AdaptiveLayout.tsx
import { usePlatform } from "../hooks/usePlatform";

function AdaptiveLayout({ children }: { children: React.ReactNode }) {
  const { isMobile } = usePlatform();

  return (
    <div className={isMobile ? "layout-mobile" : "layout-desktop"}>
      {!isMobile && <Sidebar />}
      <main>{children}</main>
      {isMobile && <BottomNavigation />}
    </div>
  );
}
```

### Rustコマンドのプラットフォーム分岐

```rust
#[tauri::command]
fn get_device_info() -> DeviceInfo {
    DeviceInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        #[cfg(target_os = "android")]
        platform_specific: "Android固有の情報".to_string(),
        #[cfg(target_os = "ios")]
        platform_specific: "iOS固有の情報".to_string(),
        #[cfg(not(any(target_os = "android", target_os = "ios")))]
        platform_specific: "デスクトップ環境".to_string(),
    }
}

#[derive(Serialize)]
struct DeviceInfo {
    os: String,
    arch: String,
    platform_specific: String,
}
```

### モバイル固有のパーミッション

Android向けの権限設定を`capabilities`で管理します。

```json
{
  "identifier": "mobile-capability",
  "platforms": ["android", "iOS"],
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:allow-read-text-file",
    "dialog:allow-open",
    "notification:default"
  ]
}
```

### tauri.conf.jsonのモバイル設定

```json
{
  "productName": "MyApp",
  "version": "1.0.0",
  "identifier": "com.example.myapp",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "MyApp",
        "width": 1024,
        "height": 768,
        "resizable": true,
        "fullscreen": false
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "iOS": {
      "minimumSystemVersion": "15.0"
    },
    "android": {
      "minSdkVersion": 24
    }
  }
}
```

### モバイルでの開発とデバッグ

```bash
# Androidエミュレータで実行
npm run tauri android dev

# 実機で実行（USBデバッグ有効時）
npm run tauri android dev --open

# iOSシミュレータで実行
npm run tauri ios dev

# 特定のシミュレータを指定
npm run tauri ios dev --target "iPhone 15 Pro"
```

### レスポンシブ対応のCSS

デスクトップとモバイルの両方に対応するスタイルを設計します。

```css
/* src/styles.css */
:root {
  --sidebar-width: 280px;
  --header-height: 48px;
  --spacing: 16px;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* デスクトップレイアウト */
@media (min-width: 768px) {
  .layout-desktop {
    display: grid;
    grid-template-columns: var(--sidebar-width) 1fr;
    height: 100vh;
  }
}

/* モバイルレイアウト */
@media (max-width: 767px) {
  .layout-mobile {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .layout-mobile main {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  textarea {
    font-size: 16px; /* iOSのズーム防止 */
  }
}

/* タッチデバイス向け */
@media (pointer: coarse) {
  button {
    min-height: 44px;
    min-width: 44px;
    padding: 12px 24px;
  }
}
```

## ビルドと配布

### デスクトップビルド

```bash
# 現在のプラットフォーム向けビルド
npm run tauri build

# デバッグビルド
npm run tauri build -- --debug

# 特定のターゲット（Linuxの場合）
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

ビルド成果物は`src-tauri/target/release/bundle/`に生成されます。

| プラットフォーム | 出力形式 |
|---|---|
| Windows | `.msi`, `.exe` (NSIS) |
| macOS | `.dmg`, `.app` |
| Linux | `.deb`, `.rpm`, `.AppImage` |

### モバイルビルド

```bash
# Android APK/AAB
npm run tauri android build

# 署名付きリリースビルド
npm run tauri android build -- --apk

# iOS (Xcodeプロジェクトを経由)
npm run tauri ios build
```

### GitHub Actionsでのクロスプラットフォームビルド

CI/CDで全プラットフォーム向けに自動ビルドするワークフローの例です。

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - "v*"

jobs:
  build-desktop:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
          - platform: macos-latest
            target: aarch64-apple-darwin
          - platform: macos-latest
            target: x86_64-apple-darwin
          - platform: windows-latest
            target: x86_64-pc-windows-msvc

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev \
            build-essential libssl-dev libayatana-appindicator3-dev \
            librsvg2-dev

      - name: Install frontend dependencies
        run: npm ci

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: v__VERSION__
          releaseName: "App v__VERSION__"
          releaseBody: "リリースノートはCHANGELOGをご参照ください"
          releaseDraft: true
          prerelease: false
          args: --target ${{ matrix.target }}

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-linux-android,armv7-linux-androideabi

      - run: npm ci
      - run: npm run tauri android build
```

### 自動アップデート機能

Tauriにはデスクトップ向けの自動アップデート機能が組み込まれています。

```bash
npm install @tauri-apps/plugin-updater
```

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri-plugin-updater = "2"
```

```json
// src-tauri/tauri.conf.json に追加
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://releases.example.com/{{target}}/{{arch}}/{{current_version}}"
      ],
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ..."
    }
  }
}
```

```rust
// Rust側でアップデーターを登録
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        // ... 他の設定
        .run(tauri::generate_context!())
        .expect("起動失敗");
}
```

```tsx
// フロントエンドでアップデートチェック
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

async function checkForUpdates() {
  const update = await check();
  if (update) {
    console.log(`新バージョン ${update.version} が利用可能です`);
    await update.downloadAndInstall();
    await relaunch();
  }
}
```

## 実践的なTips

### デバッグ

```rust
// Rust側のログ出力
#[tauri::command]
fn debug_command() {
    // 開発時のみ出力
    #[cfg(debug_assertions)]
    println!("デバッグ情報: この行はリリースビルドでは出力されません");
}
```

```tsx
// フロントエンドからDevToolsを開く（開発時）
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "I") {
    // DevToolsが開く（tauri.conf.jsonでdevtools有効時）
  }
});
```

### エラーハンドリングのベストプラクティス

```rust
use thiserror::Error;

#[derive(Debug, Error)]
enum AppError {
    #[error("ファイルが見つかりません: {0}")]
    FileNotFound(String),
    #[error("パーミッションエラー: {0}")]
    PermissionDenied(String),
    #[error("IOエラー: {0}")]
    Io(#[from] std::io::Error),
}

// Serialize実装でフロントエンドにエラーを返す
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[tauri::command]
fn read_config(path: String) -> Result<String, AppError> {
    if !std::path::Path::new(&path).exists() {
        return Err(AppError::FileNotFound(path));
    }
    std::fs::read_to_string(&path).map_err(AppError::from)
}
```

### パフォーマンス最適化

```toml
# src-tauri/Cargo.toml - リリースビルド最適化
[profile.release]
codegen-units = 1
lto = true
opt-level = "s"      # サイズ最適化
strip = true
panic = "abort"
```

## まとめ

Tauri 2.0は、Rust + Web技術によるクロスプラットフォーム開発の本命フレームワークです。

**Tauri 2.0を選ぶべき場面**:
- 軽量なバイナリサイズが求められるアプリ
- デスクトップとモバイルの両方に展開したいプロジェクト
- セキュリティを重視するアプリケーション
- Rustの高速な処理能力を活かしたいケース

**注意すべき点**:
- Rustの学習コストがある（フロントエンドのみでも動作するが、バックエンドを活用するにはRustの知識が必要）
- モバイルサポートはまだ成熟途上で、プラットフォーム固有の調整が必要になることがある
- Electronほどのエコシステムはまだないが、急速に成長中

Electronからの移行を検討している開発者や、新規のクロスプラットフォームプロジェクトを始める方は、Tauri 2.0をぜひ試してみてください。バイナリサイズの劇的な削減と、Rustによる安全で高速なバックエンド処理を体感できるはずです。
