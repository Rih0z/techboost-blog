---
title: "Tauri入門2026 — Rust×Webでデスクトップアプリ開発"
description: "TauriでWebテクノロジーとRustを組み合わせたデスクトップアプリ開発。Electronより軽量で高速なクロスプラットフォームアプリの作り方。"
pubDate: "2026-02-05"
tags: ["Tauri", "Rust", "デスクトップアプリ", "Electron", "クロスプラットフォーム"]
---

デスクトップアプリケーション開発の新しい選択肢として、Tauriが注目を集めています。WebテクノロジーとRustを組み合わせ、Electronよりも軽量で高速なアプリケーションを構築できます。本記事では、Tauriの基礎から実践的な開発方法まで解説します。

## Tauriとは

Tauriは、Web技術（HTML/CSS/JavaScript）とRustを使ってデスクトップアプリケーションを構築するためのフレームワークです。

### 主な特徴

- **軽量**: ChromiumではなくOSネイティブのWebViewを使用
- **高速**: Rustによる高速なバックエンド
- **セキュア**: デフォルトでセキュアな設計
- **クロスプラットフォーム**: Windows、macOS、Linuxに対応
- **小さなバイナリサイズ**: Electronの1/10程度のファイルサイズ

### TauriとElectronの比較

| 項目 | Tauri | Electron |
|------|-------|----------|
| バックエンド | Rust | Node.js |
| WebView | OSネイティブ | Chromium |
| バイナリサイズ | 3-5 MB | 50-100 MB |
| メモリ使用量 | 低い（30-50 MB） | 高い（100-200 MB） |
| 起動速度 | 高速 | やや遅い |
| セキュリティ | デフォルトで厳格 | 設定が必要 |
| エコシステム | 成長中 | 成熟 |

**Tauriを選ぶべきケース**:
- アプリサイズを小さくしたい
- パフォーマンスが重要
- Rustの機能を活用したい
- セキュリティを重視

**Electronを選ぶべきケース**:
- Node.jsエコシステムに依存
- 豊富なライブラリが必要
- 実績のある技術を使いたい

## セットアップ

### 前提条件

Tauriを使うには以下が必要です:

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js（フロントエンド用）
# https://nodejs.org/ からインストール

# プラットフォーム固有の依存関係
# macOS
xcode-select --install

# Windows
# Microsoft C++ Build Tools をインストール

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### プロジェクト作成

```bash
# Tauriプロジェクトを作成
npm create tauri-app@latest

# プロジェクト名: my-tauri-app
# フロントエンド: React / Vue / Svelte / Vanilla など選択
# パッケージマネージャー: npm / yarn / pnpm
```

または既存のフロントエンドプロジェクトに追加:

```bash
# 既存のプロジェクトに移動
cd my-react-app

# Tauriを追加
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api

# 初期化
npx tauri init
```

### プロジェクト構造

```
my-tauri-app/
├── src/                    # フロントエンドコード
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/             # Rustバックエンド
│   ├── src/
│   │   └── main.rs        # メインプロセス
│   ├── Cargo.toml         # Rust依存関係
│   ├── tauri.conf.json    # Tauri設定
│   └── icons/             # アプリアイコン
├── package.json
└── index.html
```

### 開発サーバー起動

```bash
npm run tauri dev
```

これでフロントエンドの開発サーバーとTauriウィンドウが起動します。

## 基本的な使い方

### ウィンドウの設定

`src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "windows": [
      {
        "title": "My Tauri App",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false,
        "alwaysOnTop": false
      }
    ]
  }
}
```

### フロントエンドからRustを呼び出す（IPC通信）

TauriではフロントエンドとRust間でデータをやり取りできます。

**Rust側（コマンド定義）** - `src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 簡単なコマンド
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// 非同期コマンド
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

// 複雑なデータ型
#[derive(serde::Serialize, serde::Deserialize)]
struct User {
    id: u32,
    name: String,
    email: String,
}

#[tauri::command]
fn get_user(id: u32) -> Result<User, String> {
    Ok(User {
        id,
        name: "Alice".to_string(),
        email: "alice@example.com".to_string(),
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_data,
            get_user
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**フロントエンド側（TypeScript/React）**:

```typescript
import { invoke } from '@tauri-apps/api/core';

function App() {
  const [greeting, setGreeting] = useState('');
  const [name, setName] = useState('');

  async function handleGreet() {
    // Rustコマンドを呼び出し
    const result = await invoke<string>('greet', { name });
    setGreeting(result);
  }

  async function handleFetchData() {
    try {
      const data = await invoke<string>('fetch_data', {
        url: 'https://api.example.com/data'
      });
      console.log(data);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function handleGetUser() {
    const user = await invoke<User>('get_user', { id: 1 });
    console.log(user);
  }

  return (
    <div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter a name..."
      />
      <button onClick={handleGreet}>Greet</button>
      <p>{greeting}</p>
    </div>
  );
}
```

## ファイルシステムアクセス

Tauriではセキュリティのため、ファイルシステムへのアクセスは制限されています。

### 設定を更新

`src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "allowlist": {
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "readDir": true,
        "createDir": true,
        "scope": ["$APPDATA/*", "$DOWNLOAD/*"]
      },
      "dialog": {
        "all": true
      }
    }
  }
}
```

### ファイルダイアログ

```typescript
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

// ファイルを開く
async function openFile() {
  const selected = await open({
    multiple: false,
    filters: [{
      name: 'Text',
      extensions: ['txt', 'md']
    }]
  });

  if (selected) {
    const contents = await readTextFile(selected as string);
    console.log(contents);
  }
}

// ファイルを保存
async function saveFile(content: string) {
  const path = await save({
    filters: [{
      name: 'Text',
      extensions: ['txt']
    }]
  });

  if (path) {
    await writeTextFile(path, content);
  }
}
```

### Rustでのファイル操作

```rust
use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(path, contents)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_files(dir: String) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(dir)
        .map_err(|e| e.to_string())?;

    let mut files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if let Some(name) = path.file_name() {
            files.push(name.to_string_lossy().to_string());
        }
    }

    Ok(files)
}
```

## システムトレイとメニュー

### システムトレイアイコン

```rust
use tauri::{
    CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayMenuItem,
    SystemTrayEvent, Manager
};

fn main() {
    // メニュー作成
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let show = CustomMenuItem::new("show".to_string(), "Show");

    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "show" => {
                        let window = app.get_window("main").unwrap();
                        window.show().unwrap();
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### アプリケーションメニュー

```rust
use tauri::{Menu, Submenu, MenuItem};

fn main() {
    let menu = Menu::new()
        .add_submenu(Submenu::new(
            "File",
            Menu::new()
                .add_item(CustomMenuItem::new("open", "Open"))
                .add_item(CustomMenuItem::new("save", "Save"))
                .add_native_item(MenuItem::Separator)
                .add_item(CustomMenuItem::new("quit", "Quit"))
        ))
        .add_submenu(Submenu::new(
            "Edit",
            Menu::new()
                .add_native_item(MenuItem::Copy)
                .add_native_item(MenuItem::Paste)
        ));

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "open" => {
                    println!("Open clicked");
                }
                "save" => {
                    println!("Save clicked");
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 状態管理

Tauri内でアプリケーション全体で共有する状態を管理できます。

```rust
use std::sync::Mutex;
use tauri::State;

struct AppState {
    counter: Mutex<i32>,
}

#[tauri::command]
fn increment(state: State<AppState>) -> i32 {
    let mut counter = state.counter.lock().unwrap();
    *counter += 1;
    *counter
}

#[tauri::command]
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

フロントエンド:

```typescript
import { invoke } from '@tauri-apps/api/core';

async function incrementCounter() {
  const newValue = await invoke<number>('increment');
  console.log('Counter:', newValue);
}

async function getCounter() {
  const value = await invoke<number>('get_counter');
  console.log('Current counter:', value);
}
```

## イベントシステム

TauriではフロントエンドとRust間でイベントを送受信できます。

### Rustからフロントエンドへ

```rust
use tauri::Manager;

#[tauri::command]
async fn long_running_task(window: tauri::Window) -> Result<(), String> {
    // 進捗を通知
    window.emit("progress", 0).unwrap();

    for i in 1..=100 {
        std::thread::sleep(std::time::Duration::from_millis(50));
        window.emit("progress", i).unwrap();
    }

    window.emit("complete", "Done!").unwrap();
    Ok(())
}
```

フロントエンド:

```typescript
import { listen } from '@tauri-apps/api/event';

// イベントリスナーを登録
const unlisten = await listen<number>('progress', (event) => {
  console.log('Progress:', event.payload);
});

await listen<string>('complete', (event) => {
  console.log('Task complete:', event.payload);
});

// タスク開始
await invoke('long_running_task');

// クリーンアップ
unlisten();
```

### フロントエンドからRustへ

```typescript
import { emit } from '@tauri-apps/api/event';

await emit('user-action', { type: 'click', x: 100, y: 200 });
```

```rust
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_window("main").unwrap();

            window.listen("user-action", |event| {
                println!("Received event: {:?}", event.payload());
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## データベース統合

Tauriアプリでローカルデータベースを使用できます。

### SQLite with rusqlite

`Cargo.toml`:

```toml
[dependencies]
rusqlite = { version = "0.30", features = ["bundled"] }
serde = { version = "1.0", features = ["derive"] }
```

```rust
use rusqlite::{Connection, Result};
use std::sync::Mutex;
use tauri::State;

struct Database {
    conn: Mutex<Connection>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Todo {
    id: i32,
    title: String,
    completed: bool,
}

#[tauri::command]
fn add_todo(title: String, db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO todos (title, completed) VALUES (?1, ?2)",
        (title, false),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_todos(db: State<Database>) -> Result<Vec<Todo>, String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, title, completed FROM todos")
        .map_err(|e| e.to_string())?;

    let todos = stmt.query_map([], |row| {
        Ok(Todo {
            id: row.get(0)?,
            title: row.get(1)?,
            completed: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>>>()
      .map_err(|e| e.to_string())?;

    Ok(todos)
}

fn main() {
    let conn = Connection::open("todos.db").unwrap();
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            completed BOOLEAN NOT NULL
        )",
        [],
    ).unwrap();

    tauri::Builder::default()
        .manage(Database {
            conn: Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![add_todo, get_todos])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## アプリ配布

### ビルド

```bash
npm run tauri build
```

ビルド成果物は `src-tauri/target/release/bundle/` に生成されます。

### プラットフォーム別の成果物

- **Windows**: `.msi`、`.exe`
- **macOS**: `.dmg`、`.app`
- **Linux**: `.deb`、`.AppImage`

### コード署名（macOS）

```json
// tauri.conf.json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
      }
    }
  }
}
```

### 自動更新

Tauri Updaterを使用:

```rust
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            tauri::async_runtime::spawn(async move {
                let response = handle.updater().check().await;
                // 更新をチェック
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## まとめ

Tauriは軽量で高速なデスクトップアプリケーション開発を可能にします。

**重要なポイント**:
- WebテクノロジーとRustの強力な組み合わせ
- Electronより軽量でセキュア
- IPC通信でフロントエンドとRustを連携
- ファイルシステム、システムトレイ、データベースなど豊富な機能
- クロスプラットフォームビルドと配布

Tauriは2026年現在、Electronの有力な代替として成長を続けています。小さく高速なデスクトップアプリを作りたい場合は、ぜひTauriを検討してください。
