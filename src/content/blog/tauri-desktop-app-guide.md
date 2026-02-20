---
title: 'Tauri完全ガイド — Rust + WebViewでElectronより軽量なデスクトップアプリ開発'
description: 'TauriでクロスプラットフォームデスクトップアプリをReact + TypeScript + Rustで構築する完全ガイド。Tauri Commands・ファイルシステム・システムトレイ・自動更新・ビルド・配布まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['Tauri', 'Rust', 'デスクトップアプリ', 'React', 'TypeScript']
---

2021年、Electronに代わる本命として注目を集めた **Tauri** がv1.0をリリースし、デスクトップアプリ開発の常識を変えた。Electronが抱える「アプリサイズが大きい」「メモリ消費が激しい」「起動が遅い」という三大問題を、TauriはRust + OSネイティブWebViewという大胆なアーキテクチャで解決した。

本記事では、Tauriの内部設計から実践的なアプリ構築まで、2000語を超える詳細解説でお届けする。セットアップ・Tauri Commands・ファイルシステム・システムトレイ・自動更新・クロスプラットフォームビルドまで、実際のRustとTypeScriptコード例とともに網羅する。

---

## 1. Tauriとは — Electronとのサイズ/パフォーマンス比較

### Electronが抱える構造的問題

Electronは2013年にGitHubが開発したフレームワークで、Chromiumをフルバンドルするアーキテクチャを採用している。これにより「Webの知識だけでデスクトップアプリが作れる」という革命的な開発体験をもたらした。しかし本番運用では深刻な問題が顕在化している。

- **バイナリサイズの肥大化**: 最小構成でも80〜150MBに達する（Chromium全体を同梱するため）
- **メモリ消費**: 起動直後から300〜500MBのRAMを占有
- **起動時間**: アプリ起動まで2〜5秒かかるケースが多い
- **セキュリティリスク**: Node.jsとChromiumが同一プロセスで動作するため攻撃面が広い
- **アップデートコスト**: Chromiumのバージョンアップのたびに大規模な更新が必要

Visual Studio Code・Slack・Discord・1PasswordなどはElectronで開発されているが、いずれも「重い」という評判を持つのはこの構造的問題が原因だ。

### TauriのアーキテクチャとElectronとの根本的な違い

TauriはElectronの設計思想を根本から見直した。最大の違いは **Chromiumをバンドルしない** という判断だ。

```
Electronのアーキテクチャ:
┌─────────────────────────────────────┐
│  あなたのアプリ (JavaScript/HTML)    │
├─────────────────────────────────────┤
│  Node.js ランタイム                  │
├─────────────────────────────────────┤
│  Chromium (フルブラウザエンジン)      │  ← 80MB+
└─────────────────────────────────────┘

Tauriのアーキテクチャ:
┌─────────────────────────────────────┐
│  あなたのアプリ (JavaScript/HTML)    │
├─────────────────────────────────────┤
│  Tauri Core (Rust)                  │  ← 高速・安全
├─────────────────────────────────────┤
│  OS標準WebView                       │  ← 追加コストゼロ
│  (macOS: WKWebView)                  │
│  (Windows: WebView2 / Edge)          │
│  (Linux: WebKitGTK)                  │
└─────────────────────────────────────┘
```

OSが既に持っているWebViewを活用することで、アプリ本体のバイナリサイズを劇的に削減できる。

### 実際のサイズ・パフォーマンス比較

| 指標 | Electron | Tauri v2 |
|------|----------|----------|
| 最小バイナリサイズ | ~85MB | **~2〜5MB** |
| 起動時間（Hello World） | ~2.5秒 | **~0.3秒** |
| 初期メモリ使用量 | ~300MB | **~50MB** |
| ビルド時間 | 速い | やや遅い（Rustコンパイル） |
| セキュリティモデル | Node.jsと同一プロセス | プロセス分離 + Rust安全性 |
| クロスコンパイル | 容易 | Rustツールチェーンが必要 |

バイナリサイズで **約20〜40倍**、メモリ消費で **約6倍** の差は実用上大きな意味を持つ。特に企業内配布ツール・開発者向けユーティリティ・システムトレイ常駐アプリなどで真価を発揮する。

### Tauri v2の新機能

2024年にリリースされたTauri v2では以下が強化された。

- **プラグインシステムの刷新**: `tauri-plugin-*` として機能が分離され、必要なものだけ組み込める
- **モバイル対応（iOS/Android）**: 同一コードベースからモバイルアプリも生成可能
- **セキュリティモデルの強化**: Capabilities（権限）システムによるきめ細かなアクセス制御
- **IPC改善**: フロントエンド↔Rustバックエンド間の通信パフォーマンス向上

---

## 2. セットアップ（Rust環境・create-tauri-app・React + TypeScript）

### 前提条件のインストール

Tauriの開発にはRust環境とOSネイティブの依存ライブラリが必要だ。

**macOSの場合:**

```bash
# Xcodeコマンドラインツール（WebKitGTKに必要）
xcode-select --install

# Rustをインストール（rustup経由）
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source $HOME/.cargo/env

# インストール確認
rustc --version  # rustc 1.77.0 以上
cargo --version  # cargo 1.77.0 以上
```

**Windowsの場合:**

```powershell
# Microsoft C++ Build Tools または Visual Studio 2022
# https://visualstudio.microsoft.com/visual-cpp-build-tools/

# WebView2は Windows 10/11 に標準搭載
# 古い環境では手動インストールが必要

# Rustインストール
winget install Rustlang.Rustup
```

**Ubuntuの場合:**

```bash
# 必要なシステムライブラリ
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Rust
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

### create-tauri-appでプロジェクト作成

Tauriは公式のプロジェクト生成ツールを提供している。

```bash
# npmを使う場合
npm create tauri-app@latest my-tauri-app

# pnpmを使う場合（推奨）
pnpm create tauri-app@latest my-tauri-app

# bun を使う場合
bun create tauri-app my-tauri-app
```

ウィザードが起動するので以下を選択する。

```
✔ Project name: my-tauri-app
✔ Identifier: com.mycompany.app
✔ Choose which language to use for your frontend: TypeScript / JavaScript
✔ Choose your package manager: pnpm
✔ Choose your UI template: React
✔ Choose your UI flavor: TypeScript
```

生成後、依存関係をインストールして開発サーバーを起動する。

```bash
cd my-tauri-app
pnpm install
pnpm tauri dev
```

初回ビルドはRustの依存解決・コンパイルが走るため3〜10分かかる。2回目以降はキャッシュが効くので数十秒程度だ。

---

## 3. プロジェクト構成（src-tauri/・Cargo.toml・tauri.conf.json）

`create-tauri-app` が生成するディレクトリ構造を理解しよう。

```
my-tauri-app/
├── src/                      # フロントエンド（React/TypeScript）
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── src-tauri/                # Rustバックエンド
│   ├── src/
│   │   ├── lib.rs            # Tauri設定・コマンド登録
│   │   └── main.rs           # エントリーポイント
│   ├── capabilities/
│   │   └── default.json      # 権限設定（v2新機能）
│   ├── icons/                # アプリアイコン（各サイズ）
│   ├── Cargo.toml            # Rust依存関係
│   └── tauri.conf.json       # Tauri設定ファイル
├── public/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Cargo.toml

Rustの依存関係を管理するファイルだ。Tauriのプラグインはここに追加する。

```toml
[package]
name = "my-tauri-app"
version = "0.1.0"
description = "My Tauri Application"
authors = ["your-name"]
edition = "2021"

[lib]
name = "my_tauri_app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
tauri-plugin-fs = "2"
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-notification = "2"
tauri-plugin-global-shortcut = "2"
tauri-plugin-updater = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }

[profile.release]
panic = "abort"   # バイナリサイズ削減
codegen-units = 1 # 最適化強化（ビルドは遅くなる）
lto = true        # Link Time Optimization
opt-level = "s"   # サイズ優先最適化
strip = true      # デバッグシンボル除去
```

### tauri.conf.json

アプリの基本設定を管理する中心ファイルだ。

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "My Tauri App",
  "version": "0.1.0",
  "identifier": "com.mycompany.my-tauri-app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "My Tauri App",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "center": true,
        "decorations": true,
        "transparent": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'"
    }
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
    "macOS": {
      "entitlements": null,
      "signingIdentity": null,
      "dmg": {
        "background": "icons/dmg-background.png"
      }
    },
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    }
  }
}
```

設定ファイルの構造が複雑なため、後述するDevToolBoxのJSONバリデーターで正しい形式かチェックすることを強く推奨する。

---

## 4. Tauri Commands（#[tauri::command]・フロントエンドから呼び出し）

Tauri Commandsはフロントエンド（JavaScript）からRustの関数を呼び出すIPC（プロセス間通信）の仕組みだ。Electronの `ipcRenderer.invoke` に相当するが、型安全性とパフォーマンスが大幅に向上している。

### Rustでコマンドを定義する（src-tauri/src/lib.rs）

```rust
use tauri::AppHandle;
use serde::{Deserialize, Serialize};

// 引数・戻り値の型定義（Serdeで自動シリアライズ）
#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub platform: String,
}

// シンプルなコマンド（引数なし）
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Tauri!", name)
}

// 複雑な型を返すコマンド
#[tauri::command]
fn get_app_info(app: AppHandle) -> AppInfo {
    AppInfo {
        name: app.package_info().name.clone(),
        version: app.package_info().version.to_string(),
        platform: std::env::consts::OS.to_string(),
    }
}

// 非同期コマンド（ファイルI/Oなど時間のかかる処理）
#[tauri::command]
async fn heavy_computation(input: String) -> Result<String, String> {
    // tokioの非同期処理
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    
    let result = input
        .chars()
        .map(|c| c.to_uppercase().to_string())
        .collect::<String>();
    
    Ok(format!("Processed: {}", result))
}

// エラーハンドリングパターン
#[derive(Debug, thiserror::Error, Serialize)]
pub enum CommandError {
    #[error("File not found: {0}")]
    FileNotFound(String),
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    #[error("IO error: {0}")]
    Io(String),
}

#[tauri::command]
async fn read_config(path: String) -> Result<String, CommandError> {
    std::fs::read_to_string(&path)
        .map_err(|e| match e.kind() {
            std::io::ErrorKind::NotFound => CommandError::FileNotFound(path),
            std::io::ErrorKind::PermissionDenied => CommandError::PermissionDenied(path),
            _ => CommandError::Io(e.to_string()),
        })
}

// Tauriアプリのエントリーポイント
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        // コマンドを登録
        .invoke_handler(tauri::generate_handler![
            greet,
            get_app_info,
            heavy_computation,
            read_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### TypeScript/Reactからコマンドを呼び出す

```typescript
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';

// 型定義（Rustの構造体と一致させる）
interface AppInfo {
  name: string;
  version: string;
  platform: string;
}

function App() {
  const [greeting, setGreeting] = useState('');
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // アプリ情報を取得
    invoke<AppInfo>('get_app_info')
      .then(setAppInfo)
      .catch(console.error);
  }, []);

  const handleGreet = async () => {
    try {
      // 同期的なコマンド呼び出し
      const result = await invoke<string>('greet', { name: 'World' });
      setGreeting(result);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleHeavyTask = async () => {
    try {
      // 非同期コマンドはそのままawaitできる
      const result = await invoke<string>('heavy_computation', {
        input: 'hello tauri'
      });
      console.log(result); // "Processed: HELLO TAURI"
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="container">
      {appInfo && (
        <p>{appInfo.name} v{appInfo.version} on {appInfo.platform}</p>
      )}
      <button onClick={handleGreet}>Greet</button>
      <button onClick={handleHeavyTask}>Heavy Task</button>
      {greeting && <p>{greeting}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### カスタムイベントシステム

Rustからフロントエンドへのプッシュ通知はイベントを使う。

```rust
// Rustからイベントを送信
use tauri::{AppHandle, Emitter};

#[tauri::command]
async fn start_long_task(app: AppHandle) {
    for i in 0..=100 {
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        // フロントエンドに進捗を送信
        app.emit("progress-update", i).unwrap();
    }
    app.emit("task-complete", "Done!").unwrap();
}
```

```typescript
import { listen } from '@tauri-apps/api/event';

// フロントエンドでイベントを受信
const unlisten = await listen<number>('progress-update', (event) => {
  setProgress(event.payload);
});

// コンポーネントのクリーンアップ時に解除
return () => unlisten();
```

---

## 5. ファイルシステムアクセス（tauri-plugin-fs）

Tauriのファイルシステムアクセスは `tauri-plugin-fs` を通じて行う。セキュリティのため、アクセス可能なパスはCapabilitiesで明示的に許可する必要がある。

### Capabilities設定（src-tauri/capabilities/default.json）

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-read-dir",
    "fs:allow-create-dir",
    "fs:allow-remove-file",
    "fs:allow-rename",
    "fs:scope-app-data-recursive",
    "fs:scope-download-recursive",
    "fs:scope-document-recursive"
  ]
}
```

### TypeScriptでのファイル操作

```typescript
import {
  readTextFile,
  writeTextFile,
  readDir,
  mkdir,
  remove,
  rename,
  exists,
  BaseDirectory,
} from '@tauri-apps/plugin-fs';

// テキストファイルを読み込む
async function readConfig(): Promise<string> {
  const content = await readTextFile('config.json', {
    baseDir: BaseDirectory.AppData,
  });
  return content;
}

// テキストファイルに書き込む
async function saveConfig(data: object): Promise<void> {
  await writeTextFile(
    'config.json',
    JSON.stringify(data, null, 2),
    { baseDir: BaseDirectory.AppData }
  );
}

// ディレクトリ一覧を取得
async function listDocuments(): Promise<void> {
  const entries = await readDir('', {
    baseDir: BaseDirectory.Document,
  });
  
  for (const entry of entries) {
    console.log(`${entry.isDirectory ? '[DIR]' : '[FILE]'} ${entry.name}`);
  }
}

// ディレクトリ作成
async function ensureDataDir(): Promise<void> {
  const dirExists = await exists('myapp-data', {
    baseDir: BaseDirectory.AppData,
  });
  
  if (!dirExists) {
    await mkdir('myapp-data', {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  }
}

// ファイル削除
async function deleteFile(filename: string): Promise<void> {
  await remove(`cache/${filename}`, {
    baseDir: BaseDirectory.AppData,
  });
}
```

### BaseDirectoryの種類

| 定数 | パス例（macOS） | 用途 |
|------|----------------|------|
| `AppData` | `~/Library/Application Support/com.myapp` | アプリ設定・DB |
| `AppConfig` | `~/Library/Application Support/com.myapp/config` | 設定ファイル |
| `AppCache` | `~/Library/Caches/com.myapp` | キャッシュ |
| `AppLog` | `~/Library/Logs/com.myapp` | ログファイル |
| `Document` | `~/Documents` | ユーザー文書 |
| `Download` | `~/Downloads` | ダウンロード |
| `Desktop` | `~/Desktop` | デスクトップ |
| `Home` | `~` | ホームディレクトリ |
| `Temp` | `/tmp` | 一時ファイル |

---

## 6. シェルコマンド実行（tauri-plugin-shell）

外部プログラムの実行は `tauri-plugin-shell` で行う。セキュリティのため、実行可能なコマンドはCapabilitiesとtauri.conf.jsonで事前に宣言する必要がある。

### tauri.conf.jsonでの設定

```json
{
  "plugins": {
    "shell": {
      "open": true,
      "sidecar": false
    }
  }
}
```

### Capabilities設定の追加

```json
{
  "permissions": [
    "shell:allow-open",
    "shell:allow-execute",
    {
      "identifier": "shell:allow-execute",
      "allow": [
        { "name": "git", "cmd": "git", "args": true },
        { "name": "node", "cmd": "node", "args": true },
        { "name": "python", "cmd": "python3", "args": true }
      ]
    }
  ]
}
```

### TypeScriptでのシェルコマンド実行

```typescript
import { Command, open } from '@tauri-apps/plugin-shell';

// コマンドを実行して出力を取得
async function runGitStatus(repoPath: string): Promise<string> {
  const command = Command.create('git', ['-C', repoPath, 'status', '--short']);
  const output = await command.execute();
  
  if (output.code !== 0) {
    throw new Error(`Git error: ${output.stderr}`);
  }
  
  return output.stdout;
}

// ストリーミング出力（長時間プロセス）
async function runBuild(): Promise<void> {
  const command = Command.create('node', ['build.js']);
  
  command.stdout.on('data', (line: string) => {
    appendLog(`[stdout] ${line}`);
  });
  
  command.stderr.on('data', (line: string) => {
    appendLog(`[stderr] ${line}`);
  });
  
  command.on('close', (data) => {
    appendLog(`Process exited with code ${data.code}`);
  });
  
  await command.spawn();
}

// URLをデフォルトブラウザで開く
async function openInBrowser(url: string): Promise<void> {
  await open(url);
}

// ファイルマネージャーでフォルダを開く
async function revealInFinder(path: string): Promise<void> {
  await open(path);
}
```

---

## 7. ダイアログ（open/save file dialog・message dialog）

ネイティブのファイル選択ダイアログやメッセージボックスは `tauri-plugin-dialog` で実装する。

```typescript
import {
  open,
  save,
  message,
  ask,
  confirm,
} from '@tauri-apps/plugin-dialog';

// ファイルを開くダイアログ（単一ファイル）
async function openFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  
  // キャンセルされた場合はnullが返る
  return selected as string | null;
}

// 複数ファイルを選択するダイアログ
async function openMultipleFiles(): Promise<string[]> {
  const selected = await open({
    multiple: true,
    directory: false,
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  });
  
  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
}

// フォルダを選択するダイアログ
async function selectDirectory(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
  });
  
  return selected as string | null;
}

// ファイル保存ダイアログ
async function saveFile(defaultName: string): Promise<string | null> {
  const filePath = await save({
    defaultPath: defaultName,
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
    ],
  });
  
  return filePath;
}

// メッセージダイアログ（情報表示）
async function showInfo(msg: string): Promise<void> {
  await message(msg, {
    title: 'Information',
    kind: 'info',
  });
}

// 確認ダイアログ（Yes/No）
async function confirmDelete(filename: string): Promise<boolean> {
  return await ask(`"${filename}" を削除しますか？この操作は元に戻せません。`, {
    title: '削除の確認',
    kind: 'warning',
    okLabel: '削除',
    cancelLabel: 'キャンセル',
  });
}

// 確認ダイアログ（OK/Cancel）
async function confirmSave(): Promise<boolean> {
  return await confirm('変更を保存しますか？', {
    title: '保存確認',
    kind: 'info',
  });
}

// 使用例
async function handleDeleteClick(filename: string): Promise<void> {
  const confirmed = await confirmDelete(filename);
  if (confirmed) {
    await deleteFile(filename);
    await showInfo(`"${filename}" を削除しました。`);
  }
}
```

---

## 8. システムトレイ・メニュー

システムトレイはデスクトップアプリの定番機能だ。Tauriでは `src-tauri/src/lib.rs` に実装する。

```rust
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime,
};

fn create_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let quit = MenuItem::with_id(app, "quit", "終了", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "表示", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "非表示", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    
    // サブメニュー作成
    let settings_menu = Submenu::with_items(
        app,
        "設定",
        true,
        &[
            &MenuItem::with_id(app, "preferences", "環境設定...", true, None::<&str>)?,
            &MenuItem::with_id(app, "shortcuts", "ショートカット", true, None::<&str>)?,
        ],
    )?;
    
    let menu = Menu::with_items(
        app,
        &[&show, &hide, &separator, &settings_menu, &separator, &quit],
    )?;
    
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .menu_on_left_click(false) // 左クリックでメニュー表示しない
        .tooltip("My Tauri App")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
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
            "preferences" => {
                // 設定ウィンドウを開く（後述）
                open_settings_window(app);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // 左クリックでウィンドウを表示/非表示トグル
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;
    
    Ok(())
}

// ウィンドウを閉じてもアプリを終了しない設定
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // トレイアイコン作成
            create_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // ウィンドウを閉じるとトレイに格納
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 9. グローバルショートカット

`tauri-plugin-global-shortcut` を使うと、アプリがフォーカスを持っていない状態でもキーボードショートカットを受け付けられる。

```rust
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        // Cmd+Shift+Space (macOS) / Ctrl+Shift+Space (Windows/Linux)
                        if shortcut.matches(Modifiers::SUPER | Modifiers::SHIFT, Code::Space) {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // ショートカット登録
            #[cfg(desktop)]
            {
                let shortcut = Shortcut::new(
                    Some(Modifiers::SUPER | Modifiers::SHIFT),
                    Code::Space,
                );
                app.global_shortcut().register(shortcut)?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

フロントエンドからショートカットを動的に登録することも可能だ。

```typescript
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';

// ショートカット登録
await register('CommandOrControl+Shift+K', () => {
  console.log('Global shortcut triggered!');
});

// 登録確認
const registered = await isRegistered('CommandOrControl+Shift+K');

// 解除
await unregister('CommandOrControl+Shift+K');
```

---

## 10. 自動更新（tauri-plugin-updater・GitHub Releases）

`tauri-plugin-updater` を使えば、GitHub Releasesと連携した自動更新機能を簡単に実装できる。

### 更新サーバーのセットアップ

Tauri v2の推奨方式はGitHub Releasesを更新サーバーとして使う方法だ。

**update.json** をGitHub Releasesにアップロードする形式:

```json
{
  "version": "1.2.0",
  "notes": "バグ修正・パフォーマンス改善",
  "pub_date": "2026-02-20T00:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "url": "https://github.com/myorg/myapp/releases/download/v1.2.0/myapp_1.2.0_aarch64.dmg",
      "signature": "AAAA...（.sig ファイルの内容）"
    },
    "darwin-x86_64": {
      "url": "https://github.com/myorg/myapp/releases/download/v1.2.0/myapp_1.2.0_x64.dmg",
      "signature": "BBBB..."
    },
    "windows-x86_64": {
      "url": "https://github.com/myorg/myapp/releases/download/v1.2.0/myapp_1.2.0_x64-setup.exe",
      "signature": "CCCC..."
    },
    "linux-x86_64": {
      "url": "https://github.com/myorg/myapp/releases/download/v1.2.0/myapp_1.2.0_amd64.AppImage",
      "signature": "DDDD..."
    }
  }
}
```

### tauri.conf.jsonの更新設定

```json
{
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk...",
      "endpoints": [
        "https://github.com/myorg/myapp/releases/latest/download/update.json"
      ],
      "dialog": false
    }
  }
}
```

### TypeScriptでの自動更新実装

```typescript
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useState } from 'react';

interface UpdateStatus {
  checking: boolean;
  available: boolean;
  version?: string;
  notes?: string;
  downloading: boolean;
  progress: number;
  error?: string;
}

function UpdateManager() {
  const [status, setStatus] = useState<UpdateStatus>({
    checking: false,
    available: false,
    downloading: false,
    progress: 0,
  });

  const checkForUpdates = async () => {
    setStatus(s => ({ ...s, checking: true, error: undefined }));
    
    try {
      const update = await check();
      
      if (update) {
        setStatus(s => ({
          ...s,
          checking: false,
          available: true,
          version: update.version,
          notes: update.body,
        }));
      } else {
        setStatus(s => ({ ...s, checking: false, available: false }));
      }
    } catch (err) {
      setStatus(s => ({
        ...s,
        checking: false,
        error: `更新確認エラー: ${err}`,
      }));
    }
  };

  const installUpdate = async () => {
    setStatus(s => ({ ...s, downloading: true, progress: 0 }));
    
    try {
      const update = await check();
      if (!update) return;
      
      let downloaded = 0;
      let contentLength = 0;
      
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const progress = contentLength > 0
              ? Math.round((downloaded / contentLength) * 100)
              : 0;
            setStatus(s => ({ ...s, progress }));
            break;
          case 'Finished':
            setStatus(s => ({ ...s, progress: 100 }));
            break;
        }
      });
      
      // インストール完了後、アプリを再起動
      await relaunch();
    } catch (err) {
      setStatus(s => ({
        ...s,
        downloading: false,
        error: `更新エラー: ${err}`,
      }));
    }
  };

  return (
    <div>
      <button onClick={checkForUpdates} disabled={status.checking}>
        {status.checking ? '確認中...' : '更新を確認'}
      </button>
      
      {status.available && (
        <div>
          <p>新バージョン {status.version} が利用可能です</p>
          {status.notes && <p>{status.notes}</p>}
          <button onClick={installUpdate} disabled={status.downloading}>
            {status.downloading
              ? `インストール中... ${status.progress}%`
              : '今すぐインストール'}
          </button>
        </div>
      )}
      
      {!status.available && !status.checking && (
        <p>最新バージョンです</p>
      )}
      
      {status.error && <p style={{ color: 'red' }}>{status.error}</p>}
    </div>
  );
}
```

---

## 11. ウィンドウ管理（複数ウィンドウ・透明ウィンドウ）

### 複数ウィンドウの実装

```rust
use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};

fn open_settings_window(app: &AppHandle) {
    // 既にウィンドウが存在する場合はフォーカスのみ
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    
    // 新規ウィンドウ作成
    let _window = WebviewWindowBuilder::new(
        app,
        "settings",                            // ウィンドウラベル（一意のID）
        WebviewUrl::App("settings".into()),    // フロントエンドのパス
    )
    .title("設定")
    .inner_size(600.0, 500.0)
    .min_inner_size(400.0, 300.0)
    .resizable(true)
    .center()
    .parent_window(                           // メインウィンドウの子ウィンドウ
        app.get_webview_window("main")
            .unwrap()
            .window()
            .hwnd()                           // Windowsのみ
            .unwrap()
    )
    .build()
    .unwrap();
}

// ウィンドウ間の通信
#[tauri::command]
fn send_to_main(app: AppHandle, message: String) {
    if let Some(window) = app.get_webview_window("main") {
        window.emit("from-settings", message).unwrap();
    }
}
```

### 透明ウィンドウ・フレームレスウィンドウ

macOSのSpotlightライクなランチャーUI向けに有効だ。

```json
// tauri.conf.json
{
  "app": {
    "windows": [
      {
        "label": "launcher",
        "title": "",
        "width": 600,
        "height": 60,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "center": true,
        "visible": false,
        "resizable": false,
        "shadow": true
      }
    ]
  }
}
```

```css
/* フレームレスウィンドウのドラッグ領域 */
.drag-region {
  -webkit-app-region: drag;
  cursor: move;
}

/* ドラッグ領域内のボタンはドラッグ無効化 */
.drag-region button,
.drag-region input {
  -webkit-app-region: no-drag;
}
```

### TypeScriptからウィンドウを操作する

```typescript
import {
  getCurrentWindow,
  WebviewWindow,
  getAllWindows,
} from '@tauri-apps/api/window';

const mainWindow = getCurrentWindow();

// ウィンドウサイズ変更
await mainWindow.setSize(new LogicalSize(1200, 800));

// ウィンドウ位置変更
await mainWindow.setPosition(new LogicalPosition(100, 100));

// フルスクリーン切り替え
const isFullscreen = await mainWindow.isFullscreen();
await mainWindow.setFullscreen(!isFullscreen);

// ウィンドウを最前面に固定
await mainWindow.setAlwaysOnTop(true);

// ウィンドウタイトル変更
await mainWindow.setTitle('新しいタイトル');

// 全ウィンドウを取得
const windows = await getAllWindows();
for (const win of windows) {
  console.log(`Window: ${win.label}`);
}

// 新規ウィンドウをフロントエンドから作成
const settingsWindow = new WebviewWindow('settings', {
  url: '/settings',
  title: '設定',
  width: 600,
  height: 500,
  center: true,
});

settingsWindow.once('tauri://created', () => {
  console.log('Settings window created');
});

settingsWindow.once('tauri://error', (e) => {
  console.error('Failed to create settings window:', e);
});
```

---

## 12. セキュリティ（CSP・allowlist設定）

Tauriのセキュリティモデルは「デフォルト拒否・明示的許可」が基本方針だ。

### Content Security Policy（CSP）

```json
// tauri.conf.json
{
  "app": {
    "security": {
      "csp": {
        "default-src": "'self'",
        "script-src": "'self' 'unsafe-inline'",
        "style-src": "'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src": "'self' https://fonts.gstatic.com",
        "img-src": "'self' data: https: blob:",
        "connect-src": "'self' https://api.myservice.com",
        "frame-src": "'none'",
        "object-src": "'none'"
      },
      "dangerousRemotedomainIpcAccess": [],
      "freezePrototype": true,
      "devmodeDebug": false
    }
  }
}
```

### Capabilities詳細設定

Tauri v2では権限をCapabilitiesファイルで細かく制御する。

```json
// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default production capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-close",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    {
      "identifier": "fs:scope",
      "allow": [
        { "path": "$APPDATA/**" },
        { "path": "$DOCUMENT/**" }
      ],
      "deny": [
        { "path": "$APPDATA/../**" },
        { "path": "/etc/**" },
        { "path": "/usr/**" }
      ]
    },
    "shell:allow-open",
    "dialog:allow-open",
    "dialog:allow-save",
    "dialog:allow-message"
  ]
}
```

### Rustでのセキュリティベストプラクティス

```rust
// 環境変数・機密情報はRust側で管理する
#[tauri::command]
async fn get_api_data(endpoint: String) -> Result<serde_json::Value, String> {
    // APIキーはフロントエンドに渡さない
    let api_key = std::env::var("API_KEY")
        .map_err(|_| "API key not configured".to_string())?;
    
    // URLホワイトリストチェック
    let allowed_endpoints = ["https://api.myservice.com/v1/"];
    if !allowed_endpoints.iter().any(|&prefix| endpoint.starts_with(prefix)) {
        return Err("Endpoint not allowed".to_string());
    }
    
    let client = reqwest::Client::new();
    let response = client
        .get(&endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    response.json().await.map_err(|e| e.to_string())
}
```

---

## 13. ビルド・配布（Windows MSI・macOS DMG・Linux AppImage）

### ビルドコマンド

```bash
# 開発ビルド（高速・デバッグ情報あり）
pnpm tauri dev

# 本番ビルド（最適化・サイズ削減）
pnpm tauri build

# 特定ターゲットのみビルド
pnpm tauri build --target x86_64-pc-windows-msvc   # Windows 64bit
pnpm tauri build --target aarch64-apple-darwin      # macOS Apple Silicon
pnpm tauri build --target x86_64-unknown-linux-gnu  # Linux 64bit
```

### GitHub Actionsによるクロスプラットフォームビルド自動化

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'ubuntu-22.04'
            args: ''
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies (Ubuntu)
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
          node-version: '20'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9
      
      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: |
            aarch64-apple-darwin
            x86_64-apple-darwin
      
      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'
      
      - name: Install frontend dependencies
        run: pnpm install
      
      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'My App v__VERSION__'
          releaseBody: 'See the assets to download this version and install.'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

### macOSコード署名

macOSで配布するには、Apple Developer ProgramへのアプリID登録とコード署名が必要だ。

```bash
# 署名用キーペア生成
pnpm tauri signer generate -w ~/.tauri/signing-key.key

# 公開鍵を表示（tauri.conf.jsonのpubkeyに設定する）
cat ~/.tauri/signing-key.key.pub
```

```json
// tauri.conf.json - macOS署名設定
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (XXXXXXXXXX)",
      "providerShortName": "XXXXXXXXXX",
      "entitlements": "entitlements.plist"
    }
  }
}
```

### Windows MSIインストーラーのカスタマイズ

```json
// tauri.conf.json
{
  "bundle": {
    "windows": {
      "wix": {
        "language": "ja-JP",
        "template": "wix/template.wxs",
        "bannerPath": "wix/banner.bmp",
        "dialogImagePath": "wix/dialog.bmp"
      },
      "nsis": {
        "displayLanguageSelector": true,
        "languages": ["Japanese", "English"],
        "installMode": "perMachine"
      }
    }
  }
}
```

### 生成されるファイル

```
src-tauri/target/release/bundle/
├── dmg/
│   └── My Tauri App_1.0.0_aarch64.dmg       # macOS
├── macos/
│   └── My Tauri App.app
├── msi/
│   └── My_Tauri_App_1.0.0_x64_en-US.msi     # Windows MSI
├── nsis/
│   └── My_Tauri_App_1.0.0_x64-setup.exe     # Windows NSIS
└── appimage/
    └── my-tauri-app_1.0.0_amd64.AppImage    # Linux
```

---

## Tauriアプリ開発の実践Tips

### 開発効率を上げるVite設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async () => ({
  plugins: [react()],
  
  // Tauriは5173ではなく1420ポートを使う
  server: {
    port: 1420,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || false,
    hmr: process.env.TAURI_DEV_HOST
      ? { protocol: 'ws', host: process.env.TAURI_DEV_HOST, port: 1430 }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  
  // アプリがブラウザではなくTauri環境かを判定
  define: {
    '__TAURI__': JSON.stringify(process.env.TAURI !== undefined),
  },
  
  envPrefix: ['VITE_', 'TAURI_'],
}));
```

### ブラウザとTauriの両対応コード

```typescript
// utils/platform.ts
export const isTauri = (): boolean => {
  return '__TAURI_INTERNALS__' in window;
};

// ファイル操作をプラットフォームに応じて切り替え
export async function readFile(path: string): Promise<string> {
  if (isTauri()) {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return readTextFile(path);
  } else {
    // ブラウザ用のフォールバック
    const response = await fetch(path);
    return response.text();
  }
}
```

### デバッグツールの活用

```bash
# Rustのログをコンソールに出力
RUST_LOG=debug pnpm tauri dev

# バックエンドのみ再コンパイル（フロントエンドの変更は不要）
cargo build --manifest-path src-tauri/Cargo.toml

# パフォーマンスプロファイリング（リリースビルドで計測）
RUST_LOG=tauri=debug pnpm tauri build
```

### tauri.conf.jsonの設定ミスを防ぐ

`tauri.conf.json` は設定項目が多く、特にCapabilities・CSP・バンドル設定でミスが起きやすい。開発中は **[DevToolBox](https://usedevtools.com/)** のJSON Formatterを活用することを推奨する。DevToolBoxはブラウザ上で動作するJSON整形・バリデーションツールで、設定ファイルの構造的エラーや不正なJSON構文を即座に検出できる。

```bash
# JSONスキーマで設定ファイルを検証（VS Code拡張でも可能）
# tauri.conf.json の先頭に追加
{
  "$schema": "https://schema.tauri.app/config/2",
  ...
}
```

---

## ElectronからTauriへの移行チェックリスト

既存のElectronアプリをTauriに移行する際のポイントをまとめる。

| Electron API | Tauri相当 | 備考 |
|-------------|-----------|------|
| `ipcRenderer.invoke` | `invoke()` | 型定義を追加するとより安全 |
| `ipcMain.handle` | `#[tauri::command]` | Rustで実装 |
| `shell.openExternal` | `open()` (plugin-shell) | Capabilitiesで許可が必要 |
| `dialog.showOpenDialog` | `open()` (plugin-dialog) | APIが類似 |
| `app.getPath('userData')` | `BaseDirectory.AppData` | パスを直接扱わない |
| `Notification` | plugin-notification | OS通知 |
| `app.setLoginItemSettings` | plugin-autostart | ログイン時自動起動 |
| `BrowserWindow.new` | `WebviewWindowBuilder` | Rustで定義 |
| `electron-updater` | plugin-updater | GitHub Releases連携 |
| `electron-store` | plugin-store or fs | シンプルなKVストア |

---

## まとめ

Tauriは「軽量・高速・安全」という3つの価値を同時に実現した画期的なデスクトップアプリフレームワークだ。

主要なメリットを改めて整理する。

- **バイナリサイズ**: Electronの1/20〜1/40（2〜5MB vs 80〜150MB）
- **メモリ効率**: Rustの所有権システムによるメモリ安全性とGCオーバーヘッドゼロ
- **セキュリティ**: プロセス分離 + Capabilities + CSPによる多層防御
- **パフォーマンス**: OSネイティブWebView活用で起動時間を大幅短縮
- **開発体験**: React/Vue/Svelteなど既存のWeb技術がそのまま使える
- **モバイル対応**: v2からiOS/Androidにも同一コードで対応可能

一方で注意点もある。Rustの学習コストは高く、特にライフタイム・所有権・借用チェッカーはWeb開発者には馴染みにくい。またOSのWebViewに依存するため、プラットフォームごとにレンダリングの差異が出ることがある。WebKit2GTK（Linux）とWKWebView（macOS）とWebView2（Windows）では、CSSサポートの細かな差異に注意が必要だ。

それでも、**内部ツール・開発者ユーティリティ・メニューバーアプリ・ファイル操作ツール** のような用途では、TauriはElectronに対して圧倒的な優位性を持つ。

Rustが書けない場合でも、バックエンドをほぼ触らずにReact/TypeScriptのフロントエンドコードだけでアプリを作れるケースも多い。まず `create-tauri-app` でプロジェクトを生成し、Electronアプリと比較しながら習得していくのが最短ルートだ。

---

*本記事で紹介したJSON設定ファイルのバリデーションには、[DevToolBox](https://usedevtools.com/) を活用してください。ブラウザ上で動作するJSON Formatter・Validator・差分チェッカーなど、開発者向けツールを無料で提供しています。`tauri.conf.json` や `capabilities/*.json` の構文チェックに役立てていただければ幸いです。*
