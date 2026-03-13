---
title: "Tauri 2.0でデスクトップアプリ開発入門ガイド"
description: "Tauri 2.0を使ったクロスプラットフォームデスクトップアプリの開発方法を解説。Electronとの比較、Rust+React/Vue/Svelteでの構築手順、プラグインシステム、モバイル対応まで実装例付きで紹介します。"
pubDate: "2026-03-09"
tags: ["Rust", "desktop", "フロントエンド", "エンジニア"]
heroImage: "../../assets/blog-placeholder-3.jpg"
---

## はじめに

デスクトップアプリケーション開発において、Electronは長年にわたりデファクトスタンダードであった。しかし、Chromiumをバンドルすることによるバイナリサイズの肥大化とメモリ消費の問題は、開発者にとって常に課題であった。

Tauri 2.0は、OS標準のWebViewとRustバックエンドを組み合わせることで、この問題を根本的に解決する。2026年現在、Tauri 2.0はモバイル対応（iOS/Android）やプラグインシステムの成熟により、Electronの有力な代替として確固たる地位を築いている。

本記事では、Tauri 2.0の概念から実装まで、React + Rustによるクロスプラットフォームアプリケーション構築を解説する。

### 対象読者

- Electronからの移行を検討しているデスクトップアプリ開発者
- Webフロントエンドの知識を活かしてデスクトップアプリを作りたいエンジニア
- Rustに興味があり、実用的なプロジェクトで学びたい方

### 前提知識

- TypeScript/Reactの基本的な知識
- ターミナル操作の基本
- Rustの基礎知識があると望ましいが、必須ではない

## Tauri 2.0とElectronの比較

### アーキテクチャの違い

| 項目 | Tauri 2.0 | Electron |
|------|-----------|----------|
| **レンダリングエンジン** | OS標準WebView（WKWebView/WebView2/WebKitGTK） | Chromium（バンドル） |
| **バックエンド** | Rust | Node.js |
| **バイナリサイズ** | 3-10 MB | 150-300 MB |
| **メモリ使用量** | 30-80 MB | 150-500 MB |
| **起動時間** | 高速（ネイティブ並） | やや遅い |
| **モバイル対応** | iOS/Android（v2で正式対応） | なし |
| **セキュリティモデル** | パーミッション制（最小権限） | 全アクセス可能 |
| **IPC** | JSON-RPC（型安全） | ipcMain/ipcRenderer |

### バイナリサイズの実測比較

同一のTodoアプリをTauriとElectronで構築した場合の比較データを示す。

```
Tauri 2.0:
  macOS (arm64):    4.2 MB
  Windows (x64):    6.8 MB
  Linux (x64):      5.1 MB

Electron:
  macOS (arm64):  198.0 MB
  Windows (x64):  215.0 MB
  Linux (x64):    185.0 MB
```

Tauriは**Electronの約1/30のサイズ**でアプリを配布できる。これはOS標準のWebViewを利用するため、Chromiumのバンドルが不要であることによる。

### Tauri 2.0の新機能

Tauri 2.0で追加された主要機能は以下の通りである。

- **モバイルサポート**: iOS/Androidアプリのビルドが可能になった
- **プラグインシステムの刷新**: Rustプラグインの開発・配布が容易になった
- **パーミッションシステム**: フロントエンドからのAPI呼び出しを細かく制御できる
- **マルチウェブビュー**: 1つのウィンドウに複数のWebViewを配置できる
- **トレイアイコンの改善**: クロスプラットフォームなシステムトレイ対応
- **自動アップデーター**: アプリの自動更新機構が組み込まれた

## 開発環境のセットアップ

### 前提ツールのインストール

Tauri 2.0の開発には、Rustツールチェーンとプラットフォーム固有の依存関係が必要である。

macOSの場合:

```bash
# Xcode Command Line Tools
xcode-select --install

# Rust（rustup経由）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Rustのバージョン確認
rustc --version
cargo --version
```

Windowsの場合:

```bash
# Microsoft C++ Build Tools が必要
# Visual Studio InstallerからC++ビルドツールをインストール

# Rust（rustup経由）
# https://rustup.rs/ からインストーラーをダウンロード

# WebView2ランタイム（Windows 10以降は標準搭載）
```

Linuxの場合（Ubuntu/Debian）:

```bash
# 依存パッケージのインストール
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### プロジェクトの作成

Tauri CLIを使ってプロジェクトを生成する。

```bash
# Tauri CLIのインストール
cargo install create-tauri-app

# プロジェクト生成（対話的）
cargo create-tauri-app tauri-demo

# 以下を選択:
# - Frontend language: TypeScript
# - Package manager: npm
# - UI framework: React
# - UI flavor: TypeScript
```

生成されるプロジェクト構造は以下の通りである。

```
tauri-demo/
├── src/                    # Reactフロントエンド
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── src-tauri/              # Rustバックエンド
│   ├── src/
│   │   ├── main.rs         # エントリーポイント
│   │   └── lib.rs          # コマンド定義
│   ├── capabilities/       # パーミッション定義
│   │   └── default.json
│   ├── Cargo.toml
│   ├── tauri.conf.json     # Tauri設定
│   └── build.rs
├── package.json
└── tsconfig.json
```

### 開発サーバーの起動

```bash
cd tauri-demo

# 依存関係のインストール
npm install

# 開発モードで起動（ホットリロード対応）
npm run tauri dev
```

初回起動時はRustのコンパイルに時間がかかるが、2回目以降はインクリメンタルビルドにより高速に起動する。

## Rustバックエンドの実装

### コマンド（Command）の定義

TauriのコマンドはRust関数として定義し、フロントエンドから呼び出す。`#[tauri::command]`マクロを付与することでIPCエンドポイントとして公開される。

```rust
// src-tauri/src/lib.rs
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

// アプリケーションの状態管理
#[derive(Default)]
pub struct AppState {
    pub todos: Mutex<Vec<Todo>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: u64,
    pub title: String,
    pub completed: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTodoInput {
    pub title: String,
}

// Todo一覧の取得
#[tauri::command]
fn get_todos(state: State<'_, AppState>) -> Result<Vec<Todo>, String> {
    let todos = state.todos.lock().map_err(|e| e.to_string())?;
    Ok(todos.clone())
}

// Todoの追加
#[tauri::command]
fn add_todo(
    input: CreateTodoInput,
    state: State<'_, AppState>,
) -> Result<Todo, String> {
    let mut todos = state.todos.lock().map_err(|e| e.to_string())?;

    let id = todos.len() as u64 + 1;
    let todo = Todo {
        id,
        title: input.title,
        completed: false,
        created_at: chrono::Local::now().to_rfc3339(),
    };

    todos.push(todo.clone());
    Ok(todo)
}

// Todoの完了状態を切り替え
#[tauri::command]
fn toggle_todo(id: u64, state: State<'_, AppState>) -> Result<Todo, String> {
    let mut todos = state.todos.lock().map_err(|e| e.to_string())?;

    let todo = todos
        .iter_mut()
        .find(|t| t.id == id)
        .ok_or_else(|| format!("Todo with id {} not found", id))?;

    todo.completed = !todo.completed;
    Ok(todo.clone())
}

// Todoの削除
#[tauri::command]
fn delete_todo(id: u64, state: State<'_, AppState>) -> Result<(), String> {
    let mut todos = state.todos.lock().map_err(|e| e.to_string())?;
    todos.retain(|t| t.id != id);
    Ok(())
}

// ファイルシステム操作（Rust固有の機能活用）
#[tauri::command]
async fn read_file_metadata(path: String) -> Result<FileMetadata, String> {
    let metadata = tokio::fs::metadata(&path)
        .await
        .map_err(|e| format!("ファイルの読み取りに失敗: {}", e))?;

    Ok(FileMetadata {
        size: metadata.len(),
        is_file: metadata.is_file(),
        is_directory: metadata.is_dir(),
        readonly: metadata.permissions().readonly(),
    })
}

#[derive(Serialize)]
struct FileMetadata {
    size: u64,
    is_file: bool,
    is_directory: bool,
    readonly: bool,
}

// コマンドの登録
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_todos,
            add_todo,
            toggle_todo,
            delete_todo,
            read_file_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### エントリーポイント

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri_demo_lib::run();
}
```

### Cargo.toml の設定

```toml
# src-tauri/Cargo.toml
[package]
name = "tauri-demo"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = { version = "0.4", features = ["serde"] }
tokio = { version = "1", features = ["full"] }
```

## フロントエンド（React）の実装

### Tauriコマンドの型定義と呼び出し

フロントエンドからRustコマンドを呼び出すには`@tauri-apps/api`のinvoke関数を使用する。

```typescript
// src/lib/tauri-commands.ts
import { invoke } from '@tauri-apps/api/core';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface CreateTodoInput {
  title: string;
}

export interface FileMetadata {
  size: number;
  is_file: boolean;
  is_directory: boolean;
  readonly: boolean;
}

// Rustコマンドのラッパー（型安全）
export const tauriCommands = {
  async getTodos(): Promise<Todo[]> {
    return invoke<Todo[]>('get_todos');
  },

  async addTodo(input: CreateTodoInput): Promise<Todo> {
    return invoke<Todo>('add_todo', { input });
  },

  async toggleTodo(id: number): Promise<Todo> {
    return invoke<Todo>('toggle_todo', { id });
  },

  async deleteTodo(id: number): Promise<void> {
    return invoke<void>('delete_todo', { id });
  },

  async readFileMetadata(path: string): Promise<FileMetadata> {
    return invoke<FileMetadata>('read_file_metadata', { path });
  },
};
```

### Todoアプリのメインコンポーネント

```tsx
// src/App.tsx
import { useState, useEffect, useCallback } from 'react';
import { tauriCommands, Todo } from './lib/tauri-commands';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Todoの読み込み
  const loadTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await tauriCommands.getTodos();
      setTodos(data);
      setError(null);
    } catch (err) {
      setError(`読み込みに失敗しました: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Todoの追加
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const todo = await tauriCommands.addTodo({ title: newTitle.trim() });
      setTodos((prev) => [...prev, todo]);
      setNewTitle('');
    } catch (err) {
      setError(`追加に失敗しました: ${err}`);
    }
  };

  // 完了状態の切り替え
  const handleToggle = async (id: number) => {
    try {
      const updated = await tauriCommands.toggleTodo(id);
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      );
    } catch (err) {
      setError(`更新に失敗しました: ${err}`);
    }
  };

  // Todoの削除
  const handleDelete = async (id: number) => {
    try {
      await tauriCommands.deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(`削除に失敗しました: ${err}`);
    }
  };

  return (
    <div className="container">
      <h1>Tauri Todo App</h1>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleAdd}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="新しいタスクを入力..."
        />
        <button type="submit">追加</button>
      </form>

      {isLoading ? (
        <p>読み込み中...</p>
      ) : (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} className={todo.completed ? 'completed' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggle(todo.id)}
                />
                <span>{todo.title}</span>
              </label>
              <button
                className="delete-btn"
                onClick={() => handleDelete(todo.id)}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="stats">
        合計: {todos.length} / 完了: {todos.filter((t) => t.completed).length}
      </p>
    </div>
  );
}

export default App;
```

## IPC（プロセス間通信）の詳細

### コマンド呼び出しの仕組み

TauriのIPCは、フロントエンド（WebView）とバックエンド（Rust）間でJSON-RPCメッセージをやり取りする仕組みである。

```
フロントエンド (JS/TS)          バックエンド (Rust)
       │                              │
       │  invoke('add_todo', {        │
       │    input: { title: "..." }   │
       │  })                          │
       │  ─────────────────────────▶  │
       │       JSON-RPC Request       │
       │                              │  #[tauri::command]
       │                              │  fn add_todo(...)
       │                              │
       │  ◀─────────────────────────  │
       │       JSON-RPC Response      │
       │  Promise<Todo> resolved      │
       │                              │
```

### イベントシステム

コマンドの他に、双方向のイベント通信も利用できる。長時間処理の進捗報告や、バックエンドからの通知に適している。

```rust
// Rust側: イベントの送信
use tauri::{AppHandle, Emitter};

#[tauri::command]
async fn start_heavy_task(app: AppHandle) -> Result<String, String> {
    let total_steps = 100;

    for step in 0..=total_steps {
        // 進捗をフロントエンドに送信
        app.emit("task-progress", ProgressPayload {
            current: step,
            total: total_steps,
            message: format!("ステップ {}/{} を処理中...", step, total_steps),
        }).map_err(|e| e.to_string())?;

        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }

    Ok("処理が完了しました".to_string())
}

#[derive(Clone, serde::Serialize)]
struct ProgressPayload {
    current: u32,
    total: u32,
    message: String,
}
```

```typescript
// フロントエンド側: イベントのリスニング
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

interface ProgressPayload {
  current: number;
  total: number;
  message: string;
}

function HeavyTaskComponent() {
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // イベントリスナーの登録
    const unlisten = listen<ProgressPayload>(
      'task-progress',
      (event) => {
        setProgress(event.payload);
      }
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleStart = async () => {
    setIsRunning(true);
    try {
      const result = await invoke<string>('start_heavy_task');
      console.log(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isRunning}>
        {isRunning ? '処理中...' : '重い処理を開始'}
      </button>

      {progress && (
        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
          <p>{progress.message}</p>
        </div>
      )}
    </div>
  );
}
```

## パーミッションシステム

Tauri 2.0では、フロントエンドがアクセスできるAPIをパーミッションで制御する。これにより、XSS等でフロントエンドが侵害された場合のリスクを最小限にする。

### パーミッション設定

```json
// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    {
      "identifier": "fs:allow-read",
      "allow": [
        { "path": "$APPDATA/**" },
        { "path": "$DOCUMENT/**" }
      ]
    },
    {
      "identifier": "fs:allow-write",
      "allow": [
        { "path": "$APPDATA/**" }
      ]
    },
    {
      "identifier": "dialog:allow-open",
      "allow": [
        {
          "filters": [
            {
              "name": "Text Files",
              "extensions": ["txt", "md", "json"]
            }
          ]
        }
      ]
    },
    "notification:default"
  ]
}
```

### カスタムパーミッションの定義

プラグインやカスタムコマンドに対して独自のパーミッションを定義できる。

```toml
# src-tauri/permissions/todo/default.toml
[[permission]]
identifier = "allow-read"
description = "Allow reading todos"
commands.allow = ["get_todos"]

[[permission]]
identifier = "allow-write"
description = "Allow creating and modifying todos"
commands.allow = ["add_todo", "toggle_todo", "delete_todo"]

[[permission]]
identifier = "default"
description = "Default permissions for todo management"
permissions = ["allow-read", "allow-write"]
```

## プラグインシステム

### 公式プラグインの活用

Tauri 2.0には豊富な公式プラグインが用意されている。

```bash
# ファイルシステムプラグイン
cargo add tauri-plugin-fs

# ダイアログ（ファイル選択）プラグイン
cargo add tauri-plugin-dialog

# 通知プラグイン
cargo add tauri-plugin-notification

# ストア（永続化）プラグイン
cargo add tauri-plugin-store

# 自動アップデータープラグイン
cargo add tauri-plugin-updater

# ログプラグイン
cargo add tauri-plugin-log
```

プラグインの登録:

```rust
// src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_log::Builder::new()
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::LogDir {
                    file_name: Some("app.log".to_string()),
                },
            ))
            .build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_todos,
            add_todo,
            toggle_todo,
            delete_todo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Storeプラグインによる永続化

```typescript
// src/lib/store.ts
import { Store } from '@tauri-apps/plugin-store';

const store = new Store('settings.json');

export async function saveSettings(settings: AppSettings): Promise<void> {
  await store.set('app-settings', settings);
  await store.save();
}

export async function loadSettings(): Promise<AppSettings | null> {
  return store.get<AppSettings>('app-settings');
}

export async function clearSettings(): Promise<void> {
  await store.clear();
  await store.save();
}

interface AppSettings {
  theme: 'light' | 'dark';
  language: string;
  fontSize: number;
  autoSave: boolean;
}
```

### ダイアログプラグインの活用

```typescript
// src/lib/file-dialog.ts
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

export async function openTextFile(): Promise<{
  path: string;
  content: string;
} | null> {
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: 'Text Files',
        extensions: ['txt', 'md', 'json'],
      },
    ],
  });

  if (!selected) return null;

  const content = await readTextFile(selected);
  return { path: selected, content };
}

export async function saveTextFile(
  content: string,
  defaultPath?: string
): Promise<string | null> {
  const path = await save({
    defaultPath,
    filters: [
      {
        name: 'Text Files',
        extensions: ['txt', 'md'],
      },
    ],
  });

  if (!path) return null;

  await writeTextFile(path, content);
  return path;
}
```

## ウィンドウ管理

### マルチウィンドウの作成

Tauri 2.0ではプログラムから新しいウィンドウを作成できる。

```rust
// Rust側: ウィンドウの作成
use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};

#[tauri::command]
async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    // 既にウィンドウが存在する場合はフォーカス
    if let Some(window) = app.get_webview_window("settings") {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // 新しいウィンドウを作成
    WebviewWindowBuilder::new(
        &app,
        "settings",
        WebviewUrl::App("settings.html".into()),
    )
    .title("設定")
    .inner_size(600.0, 400.0)
    .resizable(true)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}
```

### システムトレイ

```rust
// src-tauri/src/lib.rs
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // トレイメニューの構築
            let show = MenuItem::with_id(app, "show", "表示", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "隠す", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "終了", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

            // トレイアイコンの作成
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // ダブルクリックでウィンドウを表示
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## モバイルサポート（Tauri 2.0の目玉機能）

### iOS/Androidプロジェクトの初期化

```bash
# モバイルターゲットの追加
# iOS
cargo tauri ios init

# Android
cargo tauri android init
```

### モバイル固有の設定

```json
// src-tauri/tauri.conf.json
{
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Tauri Demo",
        "width": 800,
        "height": 600,
        "resizable": true
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "identifier": "com.example.tauri-demo",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "iOS": {
      "minimumSystemVersion": "15.0"
    }
  }
}
```

### プラットフォーム判定

```typescript
// src/lib/platform.ts
import { type } from '@tauri-apps/plugin-os';

export function getPlatform(): string {
  return type(); // 'linux', 'macos', 'windows', 'ios', 'android'
}

export function isMobile(): boolean {
  const platform = type();
  return platform === 'ios' || platform === 'android';
}

export function isDesktop(): boolean {
  return !isMobile();
}
```

### モバイル向けのビルド

```bash
# iOSシミュレータで実行
cargo tauri ios dev

# Androidエミュレータで実行
cargo tauri android dev

# iOS向けリリースビルド
cargo tauri ios build

# Android向けリリースビルド
cargo tauri android build
```

## ビルドと配布

### リリースビルド

```bash
# 全プラットフォーム向けビルド
cargo tauri build

# 特定ターゲット（クロスコンパイル）
cargo tauri build --target aarch64-apple-darwin
cargo tauri build --target x86_64-pc-windows-msvc
```

### 自動アップデーターの設定

```json
// src-tauri/tauri.conf.json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://releases.example.com/{{target}}/{{arch}}/{{current_version}}"
      ],
      "dialog": true
    }
  }
}
```

```typescript
// フロントエンド側: アップデートチェック
import { check } from '@tauri-apps/plugin-updater';

async function checkForUpdates() {
  try {
    const update = await check();
    if (update) {
      console.log(`新しいバージョンが利用可能: ${update.version}`);
      // ダウンロードとインストール
      await update.downloadAndInstall();
      // アプリを再起動
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    }
  } catch (err) {
    console.error('アップデートチェックに失敗:', err);
  }
}
```

### GitHub Actionsでのクロスプラットフォームビルド

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
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            args: '--target aarch64-apple-darwin'
          - platform: macos-latest
            args: '--target x86_64-apple-darwin'
          - platform: ubuntu-22.04
            args: ''
          - platform: windows-latest
            args: ''

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies (Linux)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            libappindicator3-dev \
            librsvg2-dev \
            patchelf

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install frontend dependencies
        run: npm install

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: v__VERSION__
          releaseName: 'v__VERSION__'
          releaseBody: 'Release v__VERSION__'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

## パフォーマンス最適化

### バイナリサイズの削減

```toml
# src-tauri/Cargo.toml
[profile.release]
# LTO（Link Time Optimization）を有効化
lto = true
# コード生成ユニットを1に（最適化優先）
codegen-units = 1
# パニック時にアボート（unwindのコードを削減）
panic = "abort"
# ストリップ（デバッグシンボルの除去）
strip = true
# 最適化レベル
opt-level = "s"  # サイズ最適化（"z"はさらに小さい）
```

### 起動時間の最適化

```rust
// 遅延初期化パターン
use std::sync::OnceLock;

static DB_CONNECTION: OnceLock<DatabasePool> = OnceLock::new();

fn get_db() -> &'static DatabasePool {
    DB_CONNECTION.get_or_init(|| {
        // 初回アクセス時にのみ初期化
        DatabasePool::new("sqlite:app.db").unwrap()
    })
}
```

## まとめ

本記事では、Tauri 2.0を使ったデスクトップアプリケーション開発の全体像を解説した。以下に要点をまとめる。

### Tauri 2.0を選ぶべきケース

- バイナリサイズとメモリ消費を最小限にしたい場合
- iOS/Androidにも対応が必要な場合
- セキュリティ要件が高いアプリケーションの場合
- Rustのパフォーマンスを活かしたい場合

### Electronを選ぶべきケース

- Node.jsエコシステムに強く依存している場合
- Chromium固有の機能（WebRTC等）が必要な場合
- 既存のElectronアプリを運用中で移行コストが見合わない場合

### 開発を始めるにあたって

Tauri 2.0はRust初心者にとっても取り組みやすい設計になっている。フロントエンドはReact/Vue/Svelteなど使い慣れたフレームワークをそのまま使え、Rust側は`#[tauri::command]`マクロで関数を公開するだけで基本的なアプリが構築できる。まずは公式のcreate-tauri-appでプロジェクトを生成し、小さなアプリから始めることを推奨する。

## 参考資料

- [Tauri 2.0 公式ドキュメント](https://v2.tauri.app/)
- [Tauri GitHub リポジトリ](https://github.com/tauri-apps/tauri)
- [Tauri Plugins ディレクトリ](https://v2.tauri.app/plugin/)
- [Rust Book（日本語）](https://doc.rust-jp.rs/book-ja/)
- [Awesome Tauri](https://github.com/tauri-apps/awesome-tauri)
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
