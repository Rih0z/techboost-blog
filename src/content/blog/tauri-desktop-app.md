---
title: "Tauri 2.0 デスクトップアプリ開発完全ガイド - Rust + Web技術で作る次世代アプリ"
description: "TauriでRustとWeb技術を組み合わせた軽量・高速・安全なクロスプラットフォームデスクトップアプリケーション開発を学びます。環境構築から本番リリースまで徹底解説。"
pubDate: "2025-02-05"
tags: ["tauri", "rust", "desktop", "electron", "cross-platform"]
---

## Tauriとは

Tauriは、RustとWeb技術（HTML/CSS/JavaScript）を組み合わせてデスクトップアプリケーションを構築するためのフレームワークです。Electronの代替として注目を集めており、以下の特徴があります。

### Electronとの比較

| 項目 | Tauri | Electron |
|------|-------|----------|
| バイナリサイズ | 3-5MB | 100-200MB |
| メモリ使用量 | 50-100MB | 200-500MB |
| バックエンド | Rust | Node.js |
| レンダラー | OSのWebView | Chromium |
| セキュリティ | デフォルトで安全 | 設定が必要 |
| 起動速度 | 非常に高速 | やや遅い |

### Tauri 2.0の新機能

2024年にリリースされたTauri 2.0では、以下の機能が追加されました。

- **モバイルサポート**: iOS/Androidアプリのビルドが可能
- **改善されたプラグインシステム**: より柔軟な拡張性
- **マルチウィンドウサポートの強化**: 複数ウィンドウの管理が容易に
- **より強力なセキュリティ機能**: Capability-based security model
- **パフォーマンス向上**: さらなる最適化

## 環境構築

### 必要なツール

Tauriアプリ開発には以下のツールが必要です。

**共通**:
- **Rust**: `rustup`でインストール
- **Node.js**: フロントエンド開発用（npm/yarn/pnpm）

**macOS**:
```bash
# Xcodeコマンドラインツール
xcode-select --install
```

**Windows**:
```powershell
# Microsoft C++ Build Tools
# Visual Studio InstallerでC++デスクトップ開発をインストール

# WebView2（Windows 10/11では通常プリインストール済み）
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### Rustのインストール

```bash
# rustupのインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# PATHを通す
source $HOME/.cargo/env

# 確認
rustc --version
cargo --version
```

### Tauri CLIのインストール

```bash
# Cargo経由でインストール（推奨）
cargo install tauri-cli

# またはnpm経由
npm install -g @tauri-apps/cli
```

## プロジェクトの作成

### create-tauriでスタート

```bash
# 公式テンプレートから作成
npm create tauri-app@latest

# プロンプトに答える
✔ Project name · my-tauri-app
✔ Choose which language to use for your frontend · TypeScript
✔ Choose your package manager · pnpm
✔ Choose your UI template · React
✔ Choose your UI flavor · TypeScript
```

### プロジェクト構造

```
my-tauri-app/
├── src/               # フロントエンド（React/Vue/Svelteなど）
│   ├── main.tsx
│   ├── App.tsx
│   └── styles.css
├── src-tauri/         # Rustバックエンド
│   ├── src/
│   │   └── main.rs    # エントリーポイント
│   ├── icons/         # アプリアイコン
│   ├── Cargo.toml     # Rust依存関係
│   ├── tauri.conf.json # Tauri設定
│   └── build.rs       # ビルドスクリプト
├── package.json
└── vite.config.ts     # フロントエンドビルド設定
```

### 開発サーバーの起動

```bash
# フロントエンドとTauriを同時に起動
npm run tauri dev

# または
pnpm tauri dev
```

## フロントエンドとRustの通信

### Commandsパターン

Rustの関数をJavaScriptから呼び出す基本パターンです。

**Rust側（src-tauri/src/main.rs）**:

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Commandとして公開する関数
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn fetch_data(url: String) -> Result<String, String> {
    let response = reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?;

    let body = response.text()
        .await
        .map_err(|e| e.to_string())?;

    Ok(body)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, fetch_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**JavaScript側（src/App.tsx）**:

```typescript
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');

  async function handleGreet() {
    // Rustの関数を呼び出し
    const message = await invoke<string>('greet', { name });
    setGreetMsg(message);
  }

  async function handleFetchData() {
    try {
      const data = await invoke<string>('fetch_data', {
        url: 'https://api.example.com/data'
      });
      console.log('Fetched:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return (
    <div className="container">
      <h1>Welcome to Tauri!</h1>
      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name..."
        />
        <button onClick={handleGreet}>Greet</button>
      </div>
      <p>{greetMsg}</p>
      <button onClick={handleFetchData}>Fetch Data</button>
    </div>
  );
}

export default App;
```

### 複雑なデータ型の受け渡し

**Rust側**:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct User {
    id: u32,
    name: String,
    email: String,
    roles: Vec<String>,
}

#[tauri::command]
fn get_user(id: u32) -> Result<User, String> {
    // 実際はデータベースから取得
    Ok(User {
        id,
        name: "Alice".to_string(),
        email: "alice@example.com".to_string(),
        roles: vec!["admin".to_string(), "user".to_string()],
    })
}

#[tauri::command]
fn create_user(user: User) -> Result<User, String> {
    // バリデーション
    if user.name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }

    // データベースに保存（省略）

    Ok(user)
}
```

**TypeScript側**:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

// ユーザー取得
const user = await invoke<User>('get_user', { id: 1 });
console.log(user.name); // "Alice"

// ユーザー作成
const newUser: User = {
  id: 0, // サーバー側で採番
  name: 'Bob',
  email: 'bob@example.com',
  roles: ['user']
};

const created = await invoke<User>('create_user', { user: newUser });
```

## ファイルシステム操作

Tauriはセキュリティ上、フロントエンドから直接ファイルシステムにアクセスできません。Rust側で処理します。

### ファイルの読み書き

**Rust側**:

```rust
use std::fs;
use tauri::api::path::app_data_dir;

#[tauri::command]
async fn save_file(
    filename: String,
    content: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let app_dir = app_data_dir(&app_handle.config())
        .ok_or("Failed to get app data dir")?;

    // ディレクトリが存在しない場合は作成
    fs::create_dir_all(&app_dir)
        .map_err(|e| e.to_string())?;

    let file_path = app_dir.join(filename);

    fs::write(&file_path, content)
        .map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn read_file(
    filename: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let app_dir = app_data_dir(&app_handle.config())
        .ok_or("Failed to get app data dir")?;

    let file_path = app_dir.join(filename);

    fs::read_to_string(file_path)
        .map_err(|e| e.to_string())
}
```

**TypeScript側**:

```typescript
// ファイル保存
const savedPath = await invoke<string>('save_file', {
  filename: 'config.json',
  content: JSON.stringify({ theme: 'dark' })
});

console.log('Saved to:', savedPath);

// ファイル読み込み
const content = await invoke<string>('read_file', {
  filename: 'config.json'
});

const config = JSON.parse(content);
```

### ファイルダイアログ

```typescript
import { open, save } from '@tauri-apps/api/dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs';

// ファイルを開く
const selected = await open({
  multiple: false,
  filters: [{
    name: 'Text',
    extensions: ['txt', 'md']
  }]
});

if (selected && typeof selected === 'string') {
  const content = await readTextFile(selected);
  console.log(content);
}

// ファイルを保存
const savePath = await save({
  filters: [{
    name: 'Text',
    extensions: ['txt']
  }]
});

if (savePath) {
  await writeTextFile(savePath, 'Hello from Tauri!');
}
```

## データベース統合

### SQLiteの使用

**Cargo.tomlに依存関係を追加**:

```toml
[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rusqlite = { version = "0.30", features = ["bundled"] }
```

**Rust側**:

```rust
use rusqlite::{Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
struct Todo {
    id: Option<i64>,
    title: String,
    completed: bool,
}

struct DbConnection(Mutex<Connection>);

fn init_db(conn: &Connection) -> SqlResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            completed BOOLEAN NOT NULL
        )",
        [],
    )?;
    Ok(())
}

#[tauri::command]
fn add_todo(
    title: String,
    db: State<DbConnection>,
) -> Result<Todo, String> {
    let conn = db.0.lock().unwrap();

    conn.execute(
        "INSERT INTO todos (title, completed) VALUES (?1, ?2)",
        [&title, &false.to_string()],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    Ok(Todo {
        id: Some(id),
        title,
        completed: false,
    })
}

#[tauri::command]
fn get_todos(db: State<DbConnection>) -> Result<Vec<Todo>, String> {
    let conn = db.0.lock().unwrap();

    let mut stmt = conn
        .prepare("SELECT id, title, completed FROM todos")
        .map_err(|e| e.to_string())?;

    let todos = stmt
        .query_map([], |row| {
            Ok(Todo {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                completed: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<SqlResult<Vec<Todo>>>()
        .map_err(|e| e.to_string())?;

    Ok(todos)
}

fn main() {
    let conn = Connection::open("todos.db").expect("Failed to open database");
    init_db(&conn).expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(DbConnection(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![add_todo, get_todos])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## ウィンドウ管理

### マルチウィンドウアプリケーション

```rust
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu, WindowBuilder};

fn main() {
    let menu = Menu::new()
        .add_submenu(Submenu::new(
            "File",
            Menu::new()
                .add_item(CustomMenuItem::new("new_window", "New Window"))
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Quit),
        ));

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "new_window" => {
                    let _window = WindowBuilder::new(
                        &event.window().app_handle(),
                        "secondary",
                        tauri::WindowUrl::App("index.html".into())
                    )
                    .title("Secondary Window")
                    .build()
                    .unwrap();
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**TypeScript側での制御**:

```typescript
import { WebviewWindow } from '@tauri-apps/api/window';

// 新しいウィンドウを開く
const webview = new WebviewWindow('secondary', {
  url: '/settings',
  title: 'Settings',
  width: 600,
  height: 400
});

// ウィンドウイベントのリスニング
webview.once('tauri://created', () => {
  console.log('Window created');
});

webview.once('tauri://error', (e) => {
  console.error('Error:', e);
});

// 現在のウィンドウを操作
import { appWindow } from '@tauri-apps/api/window';

await appWindow.maximize();
await appWindow.minimize();
await appWindow.close();
```

## ビルドとリリース

### 開発ビルド

```bash
# デバッグビルド
pnpm tauri build --debug
```

### プロダクションビルド

```bash
# リリースビルド
pnpm tauri build
```

ビルド成果物は `src-tauri/target/release/bundle/` に生成されます。

### プラットフォーム別の成果物

**macOS**:
- `.app`: アプリケーションバンドル
- `.dmg`: インストーラー

**Windows**:
- `.exe`: 実行ファイル
- `.msi`: インストーラー

**Linux**:
- `.AppImage`: ポータブル実行ファイル
- `.deb`: Debian/Ubuntuパッケージ

### アップデーターの実装

**tauri.conf.jsonで設定**:

```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.myapp.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

**Rust側**:

```rust
use tauri::updater::UpdateResponse;

#[tauri::command]
async fn check_update(app_handle: tauri::AppHandle) -> Result<String, String> {
    match app_handle.updater().check().await {
        Ok(update) => {
            if update.is_update_available() {
                update.download_and_install().await
                    .map_err(|e| e.to_string())?;
                Ok("Update installed".to_string())
            } else {
                Ok("No update available".to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}
```

## まとめ

Tauriは、以下の点で優れたデスクトップアプリ開発フレームワークです。

**メリット**:
- 非常に小さいバイナリサイズ（3-5MB）
- 高速な起動とパフォーマンス
- Rustの安全性とパフォーマンスを活用
- 既存のWeb技術スタックが使える
- クロスプラットフォーム対応（Windows/macOS/Linux）
- Tauri 2.0でモバイル対応も追加

**デメリット**:
- Rustの学習コストがやや高い
- Electronほどエコシステムが成熟していない
- OSごとのWebViewの挙動差異に注意が必要

2025年現在、Tauriは軽量で高速なデスクトップアプリケーションを開発する最有力候補の一つです。特にパフォーマンスとバイナリサイズが重要なプロジェクトでは、Electronよりも優れた選択肢となるでしょう。
