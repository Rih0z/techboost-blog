---
title: "Tauri v2でデスクトップアプリ開発 - Web技術で軽量・高速・セキュアなアプリを作る"
description: "Tauri v2の新機能とデスクトップアプリ開発の実践方法を詳しく解説。React、Vue、Svelteなどのフレームワークを使い、モバイルアプリまで対応します。"
pubDate: "2025-02-05"
tags: ['プログラミング']
---

# Tauri v2でデスクトップアプリ開発

Tauri v2は、Web技術（HTML/CSS/JavaScript）を使ってデスクトップアプリケーションを構築できるフレームワークです。Electronの軽量な代替として注目されており、バイナリサイズが小さく、メモリ使用量も少なく、セキュリティも強化されています。本記事では、Tauri v2の新機能と実践的な開発方法を詳しく解説します。

## Tauri v2とは

Tauriは、RustとWebViewを組み合わせたデスクトップアプリフレームワークです。v2では、モバイルサポート、プラグインシステムの強化、パフォーマンス改善など、多くの新機能が追加されました。

### Electronとの比較

|  | Tauri v2 | Electron |
|--|----------|----------|
| **バイナリサイズ** | 2〜10MB | 120MB以上 |
| **メモリ使用量** | 20〜80MB | 150〜300MB |
| **レンダラー** | システムのWebView | Chromium内蔵 |
| **バックエンド** | Rust | Node.js |
| **起動速度** | 高速 | やや遅い |
| **クロスプラットフォーム** | Windows/macOS/Linux/iOS/Android | Windows/macOS/Linux |

### Tauri v2の新機能

1. **モバイルサポート**: iOS/Androidアプリも同じコードベースで開発可能
2. **改善されたプラグインシステム**: より簡単にネイティブ機能を追加
3. **深いシステム統合**: トレイアイコン、メニュー、通知などの強化
4. **セキュリティ強化**: より細かい権限管理とCSP
5. **パフォーマンス改善**: IPC（プロセス間通信）の高速化

## 環境構築

### 必要なツール

```bash
# macOS
brew install rust node

# Windows（PowerShell管理者権限）
winget install --id Rustlang.Rustup
winget install OpenJS.NodeJS

# Linux (Ubuntu/Debian)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sudo apt install nodejs npm
sudo apt install libwebkit2gtk-4.1-dev build-essential wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### Tauri CLIのインストール

```bash
cargo install tauri-cli --version "^2.0.0"
```

## プロジェクトの作成

### 1. Vanilla TypeScriptプロジェクト

```bash
npm create tauri-app@latest

# 対話形式で選択
# ✔ Project name: my-tauri-app
# ✔ Choose which language to use for your frontend: TypeScript / JavaScript
# ✔ Choose your package manager: npm / yarn / pnpm
# ✔ Choose your UI template: Vanilla / React / Vue / Svelte / SolidJS / Preact / Yew / Leptos
# ✔ Choose your UI flavor: TypeScript
```

### 2. Reactプロジェクト

```bash
npm create tauri-app@latest my-react-app

# React + TypeScriptを選択
cd my-react-app
npm install
npm run tauri dev
```

プロジェクト構造:

```
my-react-app/
├── src/               # フロントエンドのReactコード
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── src-tauri/         # Rustバックエンド
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
├── package.json
└── vite.config.ts
```

## 基本的な使い方

### フロントエンド（React）

```tsx
// src/App.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

function App() {
  const [greeting, setGreeting] = useState('');
  const [name, setName] = useState('');

  async function greet() {
    // Rustバックエンドの関数を呼び出し
    const response = await invoke<string>('greet', { name });
    setGreeting(response);
  }

  return (
    <div className="container">
      <h1>Tauri v2 App</h1>

      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name..."
        />
        <button onClick={greet}>Greet</button>
      </div>

      {greeting && <p>{greeting}</p>}
    </div>
  );
}

export default App;
```

### バックエンド（Rust）

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// フロントエンドから呼び出し可能な関数
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Tauri v2.", name)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 開発サーバーの起動

```bash
npm run tauri dev
```

## 実践的な機能の実装

### 1. ファイルシステムへのアクセス

#### フロントエンド

```tsx
// src/FileManager.tsx
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { useState } from 'react';

export function FileManager() {
  const [content, setContent] = useState('');

  async function openFile() {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Text',
        extensions: ['txt', 'md']
      }]
    });

    if (selected) {
      const text = await readTextFile(selected);
      setContent(text);
    }
  }

  async function saveFile() {
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

  return (
    <div>
      <button onClick={openFile}>Open File</button>
      <button onClick={saveFile}>Save File</button>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        cols={80}
      />
    </div>
  );
}
```

#### tauri.conf.jsonの設定

```json
{
  "plugins": {
    "dialog": {
      "all": true
    },
    "fs": {
      "scope": {
        "allow": ["$APPDATA/**", "$DOCUMENT/**"],
        "deny": []
      }
    }
  }
}
```

### 2. データベース連携（SQLite）

```bash
npm install @tauri-apps/plugin-sql
```

#### フロントエンド

```tsx
// src/Database.tsx
import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [db, setDb] = useState<Database | null>(null);

  useEffect(() => {
    async function initDb() {
      const database = await Database.load('sqlite:todos.db');

      await database.execute(`
        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          completed BOOLEAN DEFAULT 0
        )
      `);

      setDb(database);
      await loadTodos(database);
    }

    initDb();
  }, []);

  async function loadTodos(database: Database) {
    const result = await database.select<Todo[]>('SELECT * FROM todos');
    setTodos(result);
  }

  async function addTodo(title: string) {
    if (!db) return;

    await db.execute(
      'INSERT INTO todos (title, completed) VALUES ($1, $2)',
      [title, false]
    );

    await loadTodos(db);
  }

  async function toggleTodo(id: number, completed: boolean) {
    if (!db) return;

    await db.execute(
      'UPDATE todos SET completed = $1 WHERE id = $2',
      [!completed, id]
    );

    await loadTodos(db);
  }

  async function deleteTodo(id: number) {
    if (!db) return;

    await db.execute('DELETE FROM todos WHERE id = $1', [id]);
    await loadTodos(db);
  }

  return (
    <div>
      <h2>Todo List</h2>

      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        addTodo(title);
        e.currentTarget.reset();
      }}>
        <input name="title" placeholder="New todo..." required />
        <button type="submit">Add</button>
      </form>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id, todo.completed)}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. システムトレイの実装

#### Rust側の実装

```rust
// src-tauri/src/main.rs
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        window.show().unwrap();
        window.set_focus().unwrap();
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![show_main_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 4. ウィンドウの制御

```tsx
// src/WindowControls.tsx
import { getCurrentWindow } from '@tauri-apps/api/window';

export function WindowControls() {
  const appWindow = getCurrentWindow();

  return (
    <div className="titlebar">
      <button onClick={() => appWindow.minimize()}>−</button>
      <button onClick={() => appWindow.toggleMaximize()}>□</button>
      <button onClick={() => appWindow.close()}>×</button>
    </div>
  );
}
```

カスタムタイトルバーのCSS:

```css
/* src/styles.css */
.titlebar {
  height: 30px;
  background: #1e1e1e;
  user-select: none;
  display: flex;
  justify-content: flex-end;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.titlebar button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 45px;
  height: 30px;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
}

.titlebar button:hover {
  background: rgba(255, 255, 255, 0.1);
}

body {
  padding-top: 30px; /* タイトルバーの高さ分 */
}
```

`tauri.conf.json`でデフォルトのタイトルバーを無効化:

```json
{
  "app": {
    "windows": [
      {
        "decorations": false,
        "transparent": true
      }
    ]
  }
}
```

### 5. HTTPリクエスト

```tsx
// src/ApiClient.tsx
import { fetch } from '@tauri-apps/plugin-http';
import { useState } from 'react';

interface Post {
  id: number;
  title: string;
  body: string;
}

export function ApiClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchPosts() {
    setLoading(true);
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts');
      const data = await response.json();
      setPosts(data.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={fetchPosts} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch Posts'}
      </button>

      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## カスタムRustコマンドの実装

より複雑な処理をRust側で実装できます。

### 画像処理の例

```rust
// src-tauri/src/main.rs
use image::{ImageFormat, ImageReader};
use std::io::Cursor;

#[tauri::command]
async fn resize_image(
    path: String,
    width: u32,
    height: u32,
) -> Result<Vec<u8>, String> {
    let img = ImageReader::open(&path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let resized = img.resize(width, height, image::imageops::FilterType::Lanczos3);

    let mut buffer = Cursor::new(Vec::new());
    resized
        .write_to(&mut buffer, ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(buffer.into_inner())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![resize_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri = { version = "2", features = [] }
image = "0.25"
```

フロントエンド:

```tsx
import { invoke } from '@tauri-apps/api/core';

async function handleResize(path: string) {
  const resized = await invoke<number[]>('resize_image', {
    path,
    width: 800,
    height: 600,
  });

  const blob = new Blob([new Uint8Array(resized)], { type: 'image/png' });
  const url = URL.createObjectURL(blob);

  // 画像を表示
  const img = document.createElement('img');
  img.src = url;
  document.body.appendChild(img);
}
```

## ビルドとディストリビューション

### 開発ビルド

```bash
npm run tauri build
```

### リリースビルド

```bash
npm run tauri build -- --release
```

生成されるファイル:
- **Windows**: `.exe`インストーラー、`.msi`インストーラー
- **macOS**: `.dmg`、`.app`バンドル
- **Linux**: `.deb`、`.AppImage`

### 署名とコード証明書（macOS）

```bash
# Apple Developer証明書でアプリに署名
npm run tauri build -- --config src-tauri/tauri.macos.conf.json
```

```json
// src-tauri/tauri.macos.conf.json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "entitlements": "entitlements.plist"
    }
  }
}
```

### 自動更新

Tauriは自動更新機能を内蔵しています。

```rust
// src-tauri/src/main.rs
use tauri_plugin_updater::UpdaterExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let updater = handle.updater_builder().build().unwrap();
                if let Some(update) = updater.check().await.unwrap() {
                    update.download_and_install().await.unwrap();
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## モバイルサポート（iOS/Android）

Tauri v2の大きな特徴は、モバイルアプリも同じコードベースで開発できることです。

### Android向けビルド

```bash
# Android toolchainのセットアップ
npm run tauri android init

# 開発サーバー
npm run tauri android dev

# リリースビルド
npm run tauri android build
```

### iOS向けビルド

```bash
# iOS toolchainのセットアップ（macOSのみ）
npm run tauri ios init

# 開発サーバー
npm run tauri ios dev

# リリースビルド
npm run tauri ios build
```

## パフォーマンス最適化

### 1. バンドルサイズの削減

```toml
# src-tauri/Cargo.toml
[profile.release]
opt-level = "z"     # サイズ最適化
lto = true          # Link Time Optimization
codegen-units = 1   # 並列コンパイルを無効化（サイズ削減）
panic = "abort"     # パニック時のスタックアンワインドを無効化
strip = true        # デバッグシンボルを削除
```

### 2. Viteの最適化

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
});
```

## まとめ

Tauri v2は、Web技術を使って軽量で高速なデスクトップアプリを開発できる強力なフレームワークです。

主なメリット:
- **軽量**: Electronの10分の1以下のバイナリサイズ
- **高速**: システムのWebViewを使用し、起動が速い
- **セキュア**: Rustのメモリ安全性と細かい権限管理
- **クロスプラットフォーム**: Windows/macOS/Linux/iOS/Android対応
- **モダンなDX**: Vite、React、Vue、Svelteなど最新ツールをサポート

使用例:
- テキストエディタ、IDEツール
- システムユーティリティ
- データ分析ツール
- デスクトップ版Webアプリ
- 社内ツール

Electronからの移行や、新規デスクトップアプリ開発に最適な選択肢です。
