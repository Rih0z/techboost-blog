---
title: 'Electron完全ガイド — デスクトップアプリ開発・IPC通信・セキュリティ・配布'
description: 'Electronでクロスプラットフォームデスクトップアプリを構築する完全ガイド。Main/Rendererプロセス・IPC通信・contextBridge・自動更新・electron-builder・コード署名・Mac/Windows配布まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['Electron', 'デスクトップアプリ', 'TypeScript', 'Node.js', 'React']
---

Visual Studio Code、Slack、Discord、Figma、1Password、Obsidian——これらの著名アプリが共通して採用しているフレームワークが **Electron** だ。2013年にGitHubが開発し、Web技術（HTML・CSS・JavaScript）だけでクロスプラットフォームのデスクトップアプリを作れる革命的な開発体験を提供してきた。

2026年現在、TauriやNW.jsなど競合も増えたが、Electronは依然として最も広く使われるデスクトップアプリフレームワークであり続けている。その理由は単純だ。**エコシステムの成熟度・ドキュメントの豊富さ・Node.js全機能へのアクセス**という三拍子が揃っているからだ。

本記事では、Electronの基礎から本番運用まで、TypeScriptとReactを使った実践的なコード例とともに徹底解説する。IPC通信の設計・セキュリティのベストプラクティス・electron-builderによるクロスプラットフォームビルド・コード署名まで、2026年の開発現場で通用する知識を網羅する。

---

## 1. Electronとは — Tauri・NW.jsとの比較・採用事例

### Electronのアーキテクチャ

ElectronはChromium（Google Chromeのオープンソース版）とNode.jsを組み合わせたフレームワークだ。アプリは2種類のプロセスで動作する。

```
Electronのプロセスモデル:
┌─────────────────────────────────────────────┐
│  Main Process (Node.js)                     │
│  ・アプリのエントリポイント                   │
│  ・BrowserWindowの生成・管理                 │
│  ・ネイティブOS API（トレイ・メニュー）       │
│  ・ファイルシステム・ネットワーク              │
├─────────────────────────────────────────────┤
│  Renderer Process (Chromium)  ×N            │
│  ・各ウィンドウで独立して動作                 │
│  ・HTML/CSS/JavaScript                      │
│  ・ReactやVueなどのフロントエンドフレームワーク│
├─────────────────────────────────────────────┤
│  Preload Script (Node.js + DOM)             │
│  ・両プロセスの橋渡し役                      │
│  ・contextBridgeで安全なAPI公開              │
└─────────────────────────────────────────────┘
```

Chromiumをフルバンドルするため、バイナリサイズは大きくなるが、ブラウザの互換性を気にせず最新のWeb APIをフルに使えるという強みがある。

### Tauri・NW.jsとの詳細比較

| 指標 | Electron | Tauri v2 | NW.js |
|------|----------|----------|-------|
| バイナリサイズ | 80〜150MB | 3〜10MB | 70〜130MB |
| メモリ使用量 | 300〜500MB | 30〜100MB | 280〜450MB |
| 起動時間 | 2〜5秒 | 0.5〜2秒 | 2〜4秒 |
| バックエンド言語 | Node.js | Rust | Node.js |
| フロントエンド | 任意のWeb技術 | 任意のWeb技術 | 任意のWeb技術 |
| エコシステム成熟度 | 非常に高い | 成長中 | 中程度 |
| ドキュメント | 豊富 | 充実してきた | 少ない |
| コミュニティ | 非常に大きい | 急成長中 | 小規模 |
| Node.js APIアクセス | フル | 限定的（Tauri Commands経由） | フル |
| クロスプラットフォーム | Mac/Win/Linux | Mac/Win/Linux | Mac/Win/Linux |
| モバイル対応 | なし | iOS/Android（v2） | なし |

**Electronを選ぶべきケース:**
- Node.jsのAPIを広範に使う必要がある（fs・child_process・native addons等）
- チームがJavaScript/TypeScriptに精通している
- 既存のWebアプリをデスクトップ化する
- VS Code拡張機能などElectronエコシステムと連携する
- 安定した実績・大規模コミュニティが必要

**Tauriを選ぶべきケース:**
- バイナリサイズとメモリ効率が最優先
- Rustの知識がある（またはバックエンドロジックが少ない）
- モバイルアプリも将来的に検討している

### 主要採用事例

- **Visual Studio Code** (Microsoft): 世界で最も使われるコードエディタ
- **Slack**: エンタープライズチャットツール
- **Discord**: ゲーマー向けコミュニティツール（推定7000万ユーザー）
- **Figma Desktop**: UIデザインツール
- **Obsidian**: マークダウンノートアプリ
- **Notion Desktop**: オールインワンワークスペース
- **GitHub Desktop**: GitクライアントGUI
- **Postman**: API開発・テストツール
- **1Password**: パスワードマネージャー

これだけの実績があれば、Electronの信頼性は疑いようがない。

---

## 2. プロジェクト構成 — electron-vite + React + TypeScript

### electron-viteとは

2024年以降、Electronプロジェクトのスキャフォールディングは **electron-vite** が事実上の標準になっている。Viteの高速なHMR（Hot Module Replacement）をElectronのMain/Renderer両プロセスに適用し、開発体験を大幅に向上させる。

### プロジェクト作成

```bash
# electron-vite テンプレートでプロジェクト作成
npm create @quick-start/electron@latest my-electron-app -- --template react-ts

cd my-electron-app
npm install
npm run dev
```

### ディレクトリ構造

```
my-electron-app/
├── electron.vite.config.ts     # electron-viteの設定
├── package.json
├── tsconfig.json
├── tsconfig.node.json          # Main Process用TypeScript設定
├── tsconfig.web.json           # Renderer Process用TypeScript設定
├── src/
│   ├── main/                   # Main Processのソースコード
│   │   └── index.ts            # エントリポイント
│   ├── preload/                # Preload Scriptのソースコード
│   │   └── index.ts
│   └── renderer/               # Renderer Process（Reactアプリ）
│       ├── index.html
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           └── components/
├── resources/                  # アイコン等のリソース
│   └── icon.png
└── out/                        # ビルド出力（gitignore）
```

### electron.vite.config.ts

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@preload': resolve('src/preload')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
```

### package.json（主要部分）

```json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "description": "Electronデスクトップアプリ",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "build:win": "npm run build && electron-builder --win",
    "build:mac": "npm run build && electron-builder --mac",
    "build:linux": "npm run build && electron-builder --linux"
  },
  "devDependencies": {
    "@electron-toolkit/eslint-config-prettier": "^2.0.0",
    "@electron-toolkit/eslint-config-ts": "^2.0.0",
    "@electron-toolkit/tsconfig": "^1.0.1",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "electron": "^31.0.0",
    "electron-builder": "^24.13.3",
    "electron-vite": "^2.3.0",
    "typescript": "^5.5.2",
    "vite": "^5.3.1"
  },
  "dependencies": {
    "@electron-toolkit/preload": "^3.0.1",
    "@electron-toolkit/utils": "^3.0.0",
    "electron-updater": "^6.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

---

## 3. Main Process — BrowserWindow・app・ipcMain

### Main Processの役割

Main Processはアプリの心臓部だ。Node.jsのフルAPIにアクセスでき、ウィンドウの生成・管理・OSとのインタラクションを担う。

### 基本的なMain Process

```typescript
// src/main/index.ts
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,           // 準備完了まで非表示
    autoHideMenuBar: true, // メニューバーを自動非表示（Windows/Linux）
    titleBarStyle: 'hiddenInset', // macOSのカスタムタイトルバー
    trafficLightPosition: { x: 12, y: 16 }, // macOSの信号ボタン位置
    backgroundColor: '#1a1a2e', // 背景色（ちらつき防止）
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,           // Preloadでrequireを使う場合はfalse
      contextIsolation: true,   // セキュリティ必須: true
      nodeIntegration: false,   // セキュリティ必須: false
    }
  })

  // ウィンドウの準備完了後に表示（白いちらつき防止）
  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    
    // 開発環境ではDevToolsを自動で開く
    if (is.dev) {
      mainWindow!.webContents.openDevTools()
    }
  })

  // 外部リンクはデフォルトブラウザで開く
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 開発環境: Vite Dev Server / 本番: ローカルHTMLファイル
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// アプリ準備完了
app.whenReady().then(() => {
  // Windows用のAppUser Model ID設定（タスクバー表示用）
  electronApp.setAppUserModelId('com.mycompany.myapp')

  // 開発ツールのショートカット（F12）を管理
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // macOS: Dockアイコンクリックでウィンドウを再表示
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 全ウィンドウを閉じたらアプリを終了（macOSを除く）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

### BrowserWindowのオプション詳解

```typescript
const window = new BrowserWindow({
  // 基本サイズ
  width: 1200,
  height: 800,
  minWidth: 600,
  minHeight: 400,
  maxWidth: 2560,
  maxHeight: 1440,
  
  // 位置
  x: 100,
  y: 100,
  center: true,        // センタリング（x/yより優先）
  
  // 表示オプション
  fullscreen: false,
  fullscreenable: true,
  resizable: true,
  movable: true,
  minimizable: true,
  maximizable: true,
  closable: true,
  
  // タイトルバー
  titleBarStyle: 'hiddenInset',  // macOSカスタム
  // 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover'
  frame: true,                    // falseでフレームレス
  
  // 透明度
  transparent: false,
  opacity: 1.0,
  
  // アイコン（Windows/Linux）
  icon: join(__dirname, '../../resources/icon.png'),
  
  // セキュリティ（必須設定）
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    nodeIntegration: false,   // 必ずfalse
    contextIsolation: true,   // 必ずtrue
    sandbox: true,            // 可能な限りtrue
    webSecurity: true,        // 必ずtrue（devでも）
    allowRunningInsecureContent: false,
  }
})
```

---

## 4. Renderer Process — React + Preload Script

### Renderer ProcessでのReact

Renderer ProcessはChromiumで動作する通常のWebアプリだ。ReactやVueなど任意のフレームワークが使える。

```tsx
// src/renderer/src/App.tsx
import { useState, useEffect } from 'react'
import './App.css'

interface SystemInfo {
  platform: string
  version: string
  arch: string
  memory: number
}

function App(): JSX.Element {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [files, setFiles] = useState<string[]>([])

  useEffect(() => {
    // Preload経由でMain Processと通信
    window.api.getSystemInfo().then(setSystemInfo)
  }, [])

  const handleOpenFile = async (): Promise<void> => {
    const result = await window.api.openFileDialog({
      title: 'ファイルを選択',
      filters: [
        { name: 'テキストファイル', extensions: ['txt', 'md'] },
        { name: '全ファイル', extensions: ['*'] }
      ]
    })
    
    if (result && result.length > 0) {
      setFiles(result)
    }
  }

  const handleSaveFile = async (): Promise<void> => {
    const content = 'Hello from Electron!'
    const result = await window.api.saveFileDialog(content)
    if (result.success) {
      console.log('ファイルを保存しました:', result.path)
    }
  }

  return (
    <div className="container">
      <h1>Electron + React + TypeScript</h1>
      
      {systemInfo && (
        <div className="system-info">
          <h2>システム情報</h2>
          <ul>
            <li>OS: {systemInfo.platform}</li>
            <li>Electronバージョン: {systemInfo.version}</li>
            <li>アーキテクチャ: {systemInfo.arch}</li>
            <li>メモリ: {(systemInfo.memory / 1024 / 1024 / 1024).toFixed(1)} GB</li>
          </ul>
        </div>
      )}
      
      <div className="actions">
        <button onClick={handleOpenFile}>ファイルを開く</button>
        <button onClick={handleSaveFile}>ファイルを保存</button>
      </div>
      
      {files.length > 0 && (
        <div className="file-list">
          <h3>選択されたファイル:</h3>
          <ul>
            {files.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default App
```

### TypeScriptの型定義（Window拡張）

```typescript
// src/renderer/src/env.d.ts
/// <reference types="vite/client" />

interface SystemInfo {
  platform: string
  version: string
  arch: string
  memory: number
}

interface FileDialogOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
  multiSelections?: boolean
}

interface SaveResult {
  success: boolean
  path?: string
  error?: string
}

interface ElectronAPI {
  getSystemInfo: () => Promise<SystemInfo>
  openFileDialog: (options?: FileDialogOptions) => Promise<string[]>
  saveFileDialog: (content: string, defaultPath?: string) => Promise<SaveResult>
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  onMenuAction: (callback: (action: string) => void) => void
  removeMenuActionListener: () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
```

---

## 5. contextBridge — 安全なIPC・contextIsolation

### contextBridgeとは

`contextBridge`はElectronのセキュリティの要だ。Renderer Process（Web世界）とMain Process（Node.js世界）の間に安全な橋を架ける。

**なぜcontextBridgeが必要か:**

```
危険な設定（絶対禁止）:
nodeIntegration: true  → Webページ内で require('fs') が直接動く
                          XSS攻撃でファイルシステムが乗っ取られる

安全な設定:
nodeIntegration: false + contextIsolation: true + contextBridge
→ Renderer Processは明示的に公開したAPIのみアクセス可能
```

### Preload Script（完全版）

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 公開するAPIの型定義
const api = {
  // システム情報取得
  getSystemInfo: (): Promise<SystemInfo> =>
    ipcRenderer.invoke('get-system-info'),

  // ファイルダイアログ
  openFileDialog: (options?: FileDialogOptions): Promise<string[]> =>
    ipcRenderer.invoke('open-file-dialog', options),

  saveFileDialog: (content: string, defaultPath?: string): Promise<SaveResult> =>
    ipcRenderer.invoke('save-file-dialog', { content, defaultPath }),

  // ファイル操作
  readFile: (path: string): Promise<string> =>
    ipcRenderer.invoke('read-file', path),

  writeFile: (path: string, content: string): Promise<void> =>
    ipcRenderer.invoke('write-file', { path, content }),

  // メニューアクション（Main → Renderer の一方向通信）
  onMenuAction: (callback: (action: string) => void): void => {
    ipcRenderer.on('menu-action', (_event, action) => callback(action))
  },

  removeMenuActionListener: (): void => {
    ipcRenderer.removeAllListeners('menu-action')
  },

  // 外部URLを開く
  openExternal: (url: string): void => {
    ipcRenderer.send('open-external', url)
  },

  // アプリバージョン取得
  getVersion: (): string => ipcRenderer.sendSync('get-version'),
}

// contextBridgeで安全に公開
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('contextBridge初期化エラー:', error)
  }
} else {
  // contextIsolationが無効な場合（非推奨・テスト用のみ）
  // @ts-ignore
  window.electronAPI = electronAPI
  // @ts-ignore
  window.api = api
}
```

### contextBridgeのセキュリティ原則

```typescript
// ❌ 危険: ipcRendererをそのまま公開
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer)
// → Renderer側でipcRenderer.send('任意のチャンネル', ...) が可能になる

// ✅ 安全: 必要な操作のみをラップして公開
contextBridge.exposeInMainWorld('api', {
  // チャンネル名をハードコード
  openFile: () => ipcRenderer.invoke('open-file'),
  // 引数を検証してから転送
  saveFile: (content: string) => {
    if (typeof content !== 'string') throw new Error('Invalid content')
    return ipcRenderer.invoke('save-file', content)
  }
})
```

---

## 6. ipcMain / ipcRenderer — invoke・handle・send・on

### IPC通信パターン

ElectronのIPC（Inter-Process Communication）には主に2つのパターンがある。

#### パターン1: invoke/handle（双方向・推奨）

```typescript
// Renderer側（Preload経由）
const result = await ipcRenderer.invoke('channel-name', arg1, arg2)

// Main側
ipcMain.handle('channel-name', async (event, arg1, arg2) => {
  // 非同期処理が可能
  const data = await fetchSomething(arg1, arg2)
  return data  // 戻り値がRendererのPromiseに渡される
})
```

#### パターン2: send/on（一方向）

```typescript
// Main → Renderer（一方向通知）
mainWindow.webContents.send('notification', { message: 'アップデートあり' })

// Renderer側（Preload経由）
ipcRenderer.on('notification', (event, data) => {
  console.log(data.message)
})
```

### Main ProcessのIPC実装（完全版）

```typescript
// src/main/ipc-handlers.ts
import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import * as os from 'os'
import * as path from 'path'

export function registerIpcHandlers(): void {
  
  // === システム情報 ===
  ipcMain.handle('get-system-info', async () => {
    return {
      platform: process.platform,
      version: process.versions.electron,
      arch: process.arch,
      memory: os.totalmem(),
      homeDir: os.homedir(),
      tmpDir: os.tmpdir(),
      cpus: os.cpus().length,
      hostname: os.hostname()
    }
  })

  // === ファイルダイアログ ===
  ipcMain.handle('open-file-dialog', async (_event, options = {}) => {
    const mainWindow = BrowserWindow.getFocusedWindow()
    if (!mainWindow) return []

    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'ファイルを選択',
      defaultPath: options.defaultPath || os.homedir(),
      filters: options.filters || [{ name: '全ファイル', extensions: ['*'] }],
      properties: options.multiSelections
        ? ['openFile', 'multiSelections']
        : ['openFile']
    })

    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('save-file-dialog', async (_event, { content, defaultPath }) => {
    const mainWindow = BrowserWindow.getFocusedWindow()
    if (!mainWindow) return { success: false, error: 'ウィンドウが見つかりません' }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'ファイルを保存',
      defaultPath: defaultPath || path.join(os.homedir(), 'untitled.txt'),
      filters: [
        { name: 'テキストファイル', extensions: ['txt'] },
        { name: '全ファイル', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false }
    }

    try {
      await fs.writeFile(result.filePath, content, 'utf-8')
      return { success: true, path: result.filePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // === ファイル読み書き ===
  ipcMain.handle('read-file', async (_event, filePath: string) => {
    // パストラバーサル攻撃対策
    const normalizedPath = path.normalize(filePath)
    // 許可ディレクトリチェック（本番では厳格に）
    const content = await fs.readFile(normalizedPath, 'utf-8')
    return content
  })

  ipcMain.handle('write-file', async (_event, { path: filePath, content }) => {
    const normalizedPath = path.normalize(filePath)
    await fs.writeFile(normalizedPath, content, 'utf-8')
  })

  // === 外部リンク ===
  ipcMain.on('open-external', (_event, url: string) => {
    // URLの検証（httpsのみ許可）
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
  })

  // === バージョン情報（同期） ===
  ipcMain.on('get-version', (event) => {
    event.returnValue = app.getVersion()
  })

  // === アプリ終了 ===
  ipcMain.on('quit-app', () => {
    app.quit()
  })

  // === ウィンドウ制御 ===
  ipcMain.on('minimize-window', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })

  ipcMain.on('maximize-window', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('close-window', () => {
    BrowserWindow.getFocusedWindow()?.close()
  })
}
```

---

## 7. ファイルシステム操作 — dialog・fs・path

### ドラッグ&ドロップによるファイル読み込み

```tsx
// src/renderer/src/components/FileDropZone.tsx
import { useState, useCallback } from 'react'

interface DroppedFile {
  name: string
  path: string
  content?: string
}

function FileDropZone(): JSX.Element {
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const fileData: DroppedFile[] = []

    for (const file of files) {
      // Electronではfileオブジェクトにpathプロパティがある
      const filePath = (file as File & { path: string }).path
      
      try {
        const content = await window.api.readFile(filePath)
        fileData.push({
          name: file.name,
          path: filePath,
          content
        })
      } catch (err) {
        fileData.push({ name: file.name, path: filePath })
      }
    }

    setDroppedFiles(fileData)
  }, [])

  return (
    <div
      className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {droppedFiles.length === 0 ? (
        <p>ここにファイルをドロップしてください</p>
      ) : (
        <ul>
          {droppedFiles.map((file) => (
            <li key={file.path}>
              <strong>{file.name}</strong>
              {file.content && (
                <pre>{file.content.slice(0, 200)}...</pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

### ユーザーデータの永続化

```typescript
// src/main/store.ts
// electron-storeを使った設定の永続化
import Store from 'electron-store'

interface StoreSchema {
  windowBounds: { width: number; height: number; x: number; y: number }
  recentFiles: string[]
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  language: 'ja' | 'en'
}

const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: { width: 1200, height: 800, x: 100, y: 100 },
    recentFiles: [],
    theme: 'system',
    fontSize: 14,
    language: 'ja'
  }
})

// ウィンドウサイズの保存・復元
export function getSavedWindowBounds() {
  return store.get('windowBounds')
}

export function saveWindowBounds(window: Electron.BrowserWindow) {
  const bounds = window.getBounds()
  store.set('windowBounds', bounds)
}

// 最近使ったファイルの管理
export function addRecentFile(filePath: string): void {
  const recent = store.get('recentFiles')
  const updated = [filePath, ...recent.filter(f => f !== filePath)].slice(0, 10)
  store.set('recentFiles', updated)
}

export function getRecentFiles(): string[] {
  return store.get('recentFiles')
}

export { store }
```

---

## 8. システムトレイ・メニュー・通知

### システムトレイの実装

```typescript
// src/main/tray.ts
import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import * as path from 'path'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  
  // macOSはTemplate Imageを推奨（自動でダーク/ライトモード対応）
  const trayIcon = process.platform === 'darwin'
    ? icon.resize({ width: 16, height: 16 })
    : icon.resize({ width: 32, height: 32 })

  tray = new Tray(trayIcon)
  tray.setToolTip('My Electron App')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'アプリを表示',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    {
      label: '新規ファイル',
      accelerator: 'CmdOrCtrl+N',
      click: () => {
        mainWindow.show()
        mainWindow.webContents.send('menu-action', 'new-file')
      }
    },
    { type: 'separator' },
    {
      label: '最近使ったファイル',
      submenu: [
        { label: 'document.txt', click: () => { /* ... */ } },
        { label: 'notes.md', click: () => { /* ... */ } }
      ]
    },
    { type: 'separator' },
    {
      label: '終了',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(contextMenu)

  // macOS: トレイアイコンのダブルクリックでウィンドウ表示
  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
    }
  })
}
```

### アプリケーションメニュー

```typescript
// src/main/menu.ts
import { Menu, MenuItemConstructorOptions, shell, app, BrowserWindow } from 'electron'

export function createApplicationMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    // macOSのApp Menu（最初のメニュー）
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),
    
    // ファイルメニュー
    {
      label: 'ファイル',
      submenu: [
        {
          label: '新規',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-action', 'new-file')
        },
        {
          label: '開く...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-action', 'open-file')
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-action', 'save-file')
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    
    // 編集メニュー
    {
      label: '編集',
      submenu: [
        { role: 'undo' as const, label: '元に戻す' },
        { role: 'redo' as const, label: 'やり直す' },
        { type: 'separator' },
        { role: 'cut' as const, label: '切り取り' },
        { role: 'copy' as const, label: 'コピー' },
        { role: 'paste' as const, label: '貼り付け' },
        { role: 'selectAll' as const, label: '全て選択' }
      ]
    },
    
    // 表示メニュー
    {
      label: '表示',
      submenu: [
        { role: 'reload' as const, label: '再読み込み' },
        { role: 'forceReload' as const, label: '強制再読み込み' },
        { role: 'toggleDevTools' as const, label: '開発者ツール' },
        { type: 'separator' },
        { role: 'resetZoom' as const, label: 'ズームをリセット' },
        { role: 'zoomIn' as const, label: 'ズームイン' },
        { role: 'zoomOut' as const, label: 'ズームアウト' },
        { type: 'separator' },
        { role: 'togglefullscreen' as const, label: 'フルスクリーン' }
      ]
    },
    
    // ヘルプメニュー
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'ドキュメント',
          click: () => shell.openExternal('https://your-app.com/docs')
        },
        {
          label: 'バグ報告',
          click: () => shell.openExternal('https://github.com/yourrepo/issues')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
```

### デスクトップ通知

```typescript
// src/main/notifications.ts
import { Notification, nativeImage } from 'electron'
import * as path from 'path'

export function sendNotification(
  title: string,
  body: string,
  options: {
    urgency?: 'normal' | 'critical' | 'low'
    silent?: boolean
    timeoutType?: 'default' | 'never'
    onClick?: () => void
  } = {}
): void {
  // Notificationがサポートされているか確認
  if (!Notification.isSupported()) {
    console.log('このプラットフォームでは通知がサポートされていません')
    return
  }

  const icon = nativeImage.createFromPath(
    path.join(__dirname, '../../resources/icon.png')
  )

  const notification = new Notification({
    title,
    body,
    icon,
    silent: options.silent ?? false,
    urgency: options.urgency ?? 'normal',
    timeoutType: options.timeoutType ?? 'default'
  })

  if (options.onClick) {
    notification.on('click', options.onClick)
  }

  notification.show()
}

// 使用例
// sendNotification(
//   '保存完了',
//   'ファイルが正常に保存されました',
//   { onClick: () => mainWindow.focus() }
// )
```

---

## 9. セキュリティ — CSP・nodeIntegration・sandbox

### セキュリティの7大原則

Electronアプリのセキュリティは、デスクトップアプリとしての信頼性に直結する。以下の原則は妥協なく守ること。

```typescript
// src/main/index.ts — セキュリティ設定の完全版

// 1. nodeIntegration は必ずfalse
// 2. contextIsolation は必ずtrue
// 3. webSecurity は必ずtrue（本番・開発問わず）
// 4. allowRunningInsecureContent は必ずfalse
// 5. experimentalFeatures は必ずfalse

const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    nodeIntegration: false,          // ❌ trueは絶対禁止
    contextIsolation: true,          // ✅ 必須
    sandbox: true,                   // ✅ 推奨（nodeのrequireが不要なら）
    webSecurity: true,               // ✅ 必須
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    // HTTPSのみ許可
    // navigateOnDragDrop: false,    // ドラッグ&ドロップでのナビゲーション禁止
  }
})

// 6. ナビゲーション制限（フィッシング対策）
mainWindow.webContents.on('will-navigate', (event, url) => {
  const allowedOrigins = [
    'https://your-app.com',
    'http://localhost:5173',  // 開発環境のみ
  ]
  
  const isAllowed = allowedOrigins.some(origin => url.startsWith(origin))
  
  if (!isAllowed) {
    event.preventDefault()
    console.warn('不正なナビゲーションをブロック:', url)
  }
})

// 7. 新規ウィンドウ作成の制限
mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  // 外部URLはブラウザで開く
  if (url.startsWith('https://')) {
    shell.openExternal(url)
  }
  return { action: 'deny' }  // 常にElectron内での新規ウィンドウは拒否
})
```

### Content Security Policy（CSP）の設定

```typescript
// src/main/index.ts
import { session } from 'electron'

// セッションレベルでCSPを設定
app.whenReady().then(() => {
  // HTTPSレスポンスヘッダーの設定
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",  // electron-vite開発時に必要
            "style-src 'self' 'unsafe-inline'",   // インラインスタイル用
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.your-app.com",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
          ].join('; ')
        ]
      }
    })
  })
})
```

### 入力バリデーション（IPC引数の検証）

```typescript
// src/main/validators.ts
import * as path from 'path'
import * as os from 'os'

// 許可するファイルパスの検証
export function validateFilePath(inputPath: string): string {
  const normalized = path.normalize(inputPath)
  const homeDir = os.homedir()
  const tmpDir = os.tmpdir()
  
  // ホームディレクトリまたはtmpディレクトリ配下のみ許可
  const allowedPrefixes = [homeDir, tmpDir]
  const isAllowed = allowedPrefixes.some(prefix => 
    normalized.startsWith(prefix)
  )
  
  if (!isAllowed) {
    throw new Error(`許可されていないパスです: ${inputPath}`)
  }
  
  return normalized
}

// URLの検証
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

// IPC引数の型チェック
export function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName}は文字列でなければなりません`)
  }
  return value
}
```

---

## 10. 自動更新 — electron-updater・GitHub Releases

### electron-updaterの設定

```typescript
// src/main/updater.ts
import { autoUpdater, BrowserWindow } from 'electron'
import log from 'electron-log'

// electron-updaterをログ付きで使用
const { autoUpdater: updater } = require('electron-updater')

log.transports.file.level = 'info'
updater.logger = log

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  // 開発環境では自動更新をスキップ
  if (process.env.NODE_ENV === 'development') {
    console.log('開発環境: 自動更新を無効化')
    return
  }

  // 更新確認の間隔（1時間ごと）
  updater.checkForUpdatesAndNotify()
  setInterval(() => {
    updater.checkForUpdates()
  }, 60 * 60 * 1000)

  // === イベントハンドラ ===
  
  updater.on('checking-for-update', () => {
    log.info('アップデートを確認中...')
    mainWindow.webContents.send('update-status', { status: 'checking' })
  })

  updater.on('update-available', (info) => {
    log.info('アップデートが利用可能:', info)
    mainWindow.webContents.send('update-status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })

  updater.on('update-not-available', (info) => {
    log.info('アップデートなし:', info)
    mainWindow.webContents.send('update-status', { status: 'not-available' })
  })

  updater.on('error', (error) => {
    log.error('アップデートエラー:', error)
    mainWindow.webContents.send('update-status', {
      status: 'error',
      message: error.message
    })
  })

  updater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update-status', {
      status: 'downloading',
      percent: progress.percent,
      speed: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
    mainWindow.setProgressBar(progress.percent / 100)
  })

  updater.on('update-downloaded', (info) => {
    log.info('アップデートダウンロード完了:', info)
    mainWindow.webContents.send('update-status', {
      status: 'downloaded',
      version: info.version
    })
    mainWindow.setProgressBar(-1)  // プログレスバーをリセット
  })
}

// Rendererからのアップデートインストール要求
ipcMain.on('install-update', () => {
  updater.quitAndInstall(false, true)
})
```

### アップデートUIコンポーネント

```tsx
// src/renderer/src/components/UpdateNotifier.tsx
import { useState, useEffect } from 'react'

interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  message?: string
}

function UpdateNotifier(): JSX.Element | null {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    window.api.onMenuAction((action) => {
      // アップデート関連のメニューアクション処理
    })

    // アップデートステータスの受信
    window.electron.ipcRenderer.on('update-status', (_event, status: UpdateStatus) => {
      setUpdateStatus(status)
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners('update-status')
    }
  }, [])

  if (!updateStatus) return null

  if (updateStatus.status === 'available') {
    return (
      <div className="update-banner">
        <p>バージョン {updateStatus.version} が利用可能です</p>
        <button onClick={() => { /* ダウンロード開始 */ }}>
          ダウンロード
        </button>
        <button onClick={() => setUpdateStatus(null)}>後で</button>
      </div>
    )
  }

  if (updateStatus.status === 'downloading') {
    return (
      <div className="update-progress">
        <p>アップデートをダウンロード中... {updateStatus.percent?.toFixed(1)}%</p>
        <progress value={updateStatus.percent} max={100} />
      </div>
    )
  }

  if (updateStatus.status === 'downloaded') {
    return (
      <div className="update-ready">
        <p>アップデートの準備ができました。再起動して適用しますか？</p>
        <button onClick={() => window.electron.ipcRenderer.send('install-update')}>
          再起動してアップデート
        </button>
      </div>
    )
  }

  return null
}
```

### GitHub Releasesとの連携（electron-builder.yml）

```yaml
# electron-builder.yml
appId: com.mycompany.myapp
productName: My Electron App
copyright: Copyright © 2026 MyCompany

publish:
  - provider: github
    owner: your-github-username
    repo: your-repo-name
    releaseType: release

# バージョン管理はpackage.jsonのversionフィールドで行う
```

---

## 11. electron-builder — Windows NSIS・macOS DMG・Linux AppImage

### electron-builder.yml（完全版）

```yaml
# electron-builder.yml
appId: com.mycompany.myapp
productName: My Electron App
copyright: Copyright © 2026 MyCompany

# ビルド対象ディレクトリ
directories:
  buildResources: resources
  output: dist

# 含めるファイル
files:
  - out/**/*
  - "!**/*.map"
  - "!**/node_modules/.cache/**/*"

# 追加リソース
extraResources:
  - from: resources/
    to: resources/
    filter:
      - "!**/*.psd"

# macOS設定
mac:
  category: public.app-category.developer-tools
  icon: resources/icon.icns
  entitlementsInherit: build/entitlements.mac.plist
  hardenedRuntime: true
  gatekeeperAssess: false
  target:
    - target: dmg
      arch:
        - x64    # Intel Mac
        - arm64  # Apple Silicon
    - target: zip
      arch:
        - x64
        - arm64

dmg:
  title: "${productName} ${version}"
  icon: resources/icon.icns
  iconSize: 128
  contents:
    - x: 380
      y: 240
      type: link
      path: /Applications
    - x: 122
      y: 240
      type: file
  window:
    width: 500
    height: 300

# Windows設定
win:
  icon: resources/icon.ico
  target:
    - target: nsis
      arch:
        - x64
        - ia32
    - target: portable
      arch:
        - x64

nsis:
  oneClick: false          # カスタムインストーラー
  allowToChangeInstallationDirectory: true
  perMachine: false        # ユーザーレベルインストール
  deleteAppDataOnUninstall: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: My Electron App
  installerIcon: resources/installer.ico
  uninstallerIcon: resources/uninstaller.ico
  license: build/license.txt
  language: "1041"         # 日本語

# Linux設定
linux:
  icon: resources/icons/
  category: Development
  target:
    - target: AppImage
      arch:
        - x64
    - target: deb
      arch:
        - x64
    - target: rpm
      arch:
        - x64

# 自動更新
publish:
  - provider: github
    owner: your-github-username
    repo: your-repo-name
    releaseType: release
```

### ビルドスクリプト

```bash
# package.json のscriptsに追加
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    
    # Windows向けビルド（Windows上またはCross-compile）
    "build:win": "npm run build && electron-builder --win --x64",
    "build:win:ia32": "npm run build && electron-builder --win --ia32",
    
    # macOS向けビルド（macOS上のみ可能）
    "build:mac": "npm run build && electron-builder --mac",
    "build:mac:arm64": "npm run build && electron-builder --mac --arm64",
    "build:mac:universal": "npm run build && electron-builder --mac --universal",
    
    # Linux向けビルド
    "build:linux": "npm run build && electron-builder --linux",
    
    # 全プラットフォーム同時ビルド
    "build:all": "npm run build && electron-builder -mwl",
    
    # リリース（GitHub Releasesに自動公開）
    "release": "npm run build && electron-builder --publish=always"
  }
}
```

### アイコンの準備

```bash
# macOS用ICNSの作成（iconutil使用）
mkdir icon.iconset
# 以下のサイズの画像をiconsetフォルダに配置:
# icon_16x16.png, icon_16x16@2x.png (32x32)
# icon_32x32.png, icon_32x32@2x.png (64x64)
# icon_128x128.png, icon_128x128@2x.png (256x256)
# icon_256x256.png, icon_256x256@2x.png (512x512)
# icon_512x512.png, icon_512x512@2x.png (1024x1024)

iconutil -c icns icon.iconset

# Windows用ICOの作成（ImageMagick使用）
convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico

# Linux用（各サイズのPNG）
mkdir -p resources/icons
for size in 16 32 48 64 128 256 512; do
  convert icon.png -resize ${size}x${size} resources/icons/${size}x${size}.png
done
```

---

## 12. コード署名 — Mac App Store・Windows EV証明書

### macOSのコード署名

```yaml
# electron-builder.yml
mac:
  identity: "Developer ID Application: MyCompany Inc. (XXXXXXXXXX)"
  hardenedRuntime: true
  entitlementsInherit: build/entitlements.mac.plist
  gatekeeperAssess: false
  notarize:
    teamId: "XXXXXXXXXX"  # Apple Developer Team ID
```

```xml
<!-- build/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <!-- ハードニングランタイムに必要 -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <!-- ネットワーク（必要な場合） -->
    <key>com.apple.security.network.client</key>
    <true/>
    <!-- ファイルシステムアクセス -->
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
  </dict>
</plist>
```

```bash
# GitHub ActionsでのmacOS署名環境変数
# APPLE_ID: Apple IDのメールアドレス
# APPLE_APP_SPECIFIC_PASSWORD: App専用パスワード
# APPLE_TEAM_ID: チームID
# CSC_LINK: 証明書（base64エンコードのp12）
# CSC_KEY_PASSWORD: 証明書のパスワード

# ローカルでの公証（Notarization）
npx electron-notarize \
  --apple-id $APPLE_ID \
  --apple-id-password $APPLE_APP_SPECIFIC_PASSWORD \
  --team-id $APPLE_TEAM_ID \
  dist/mac/MyApp.app
```

### WindowsのEV証明書署名

```yaml
# electron-builder.yml（Windows署名）
win:
  signingHashAlgorithms:
    - sha256
  certificateFile: build/certificate.p12
  certificatePassword: ${env.WIN_CERT_PASSWORD}
  # EV証明書の場合
  # certificateSubjectName: "MyCompany Inc."
  # signDlls: true
```

### GitHub ActionsによるCI/CDビルド

```yaml
# .github/workflows/release.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Node.jsセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: 依存関係インストール
        run: npm ci
      
      - name: macOSビルド＆署名
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          CSC_LINK: ${{ secrets.MAC_CERT_P12 }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run build:mac
      
      - name: アーティファクトをアップロード
        uses: actions/upload-artifact@v4
        with:
          name: mac-build
          path: dist/*.dmg

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Node.jsセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: 依存関係インストール
        run: npm ci
      
      - name: Windowsビルド＆署名
        env:
          WIN_CERT_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run build:win

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Node.jsセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: 依存関係インストール
        run: npm ci
      
      - name: Linuxビルド
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run build:linux
```

---

## 13. パフォーマンス最適化 — バンドルサイズ削減・起動時間短縮

### バンドルサイズの削減戦略

```typescript
// electron.vite.config.ts — 最適化設定
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  main: {
    plugins: [
      // node_modulesをバンドルせずに外部化（起動を高速化）
      externalizeDepsPlugin()
    ],
    build: {
      rollupOptions: {
        output: {
          // チャンク分割
          manualChunks: undefined
        }
      }
    }
  },
  renderer: {
    plugins: [
      react(),
      // バンドル分析（開発時のみ）
      process.env.ANALYZE && visualizer({
        open: true,
        filename: 'dist/stats.html'
      })
    ],
    build: {
      rollupOptions: {
        output: {
          // 大きなライブラリを分割
          manualChunks: (id) => {
            if (id.includes('node_modules/react')) return 'react-vendor'
            if (id.includes('node_modules/@radix-ui')) return 'ui-vendor'
            if (id.includes('node_modules/monaco-editor')) return 'editor'
          }
        }
      },
      // 圧縮設定
      minify: 'esbuild',
      sourcemap: false,  // 本番では無効化
    }
  }
})
```

### 起動時間の最適化

```typescript
// src/main/index.ts — 遅延初期化パターン

async function createWindow(): Promise<void> {
  // ウィンドウを先に作成（UIを早く表示）
  const mainWindow = new BrowserWindow({
    show: false,  // まだ非表示
    webPreferences: { /* ... */ }
  })

  // HTMLファイルをロード開始
  mainWindow.loadFile(join(__dirname, '../renderer/index.html'))

  // 重いモジュールの初期化は非同期で後回し
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()  // UIが準備できたら表示
    
    // 非同期で追加初期化
    setImmediate(async () => {
      await initializeDatabase()
      await loadUserPreferences()
      registerIpcHandlers()
    })
  })
}

// V8スナップショットを活用（electron-link）
// 起動時に必要なコードを事前コンパイルすることで
// コールドスタートを30〜50%短縮可能
```

### メモリ最適化

```typescript
// src/main/memory-optimizer.ts

// 不使用ウィンドウの定期的なガベージコレクション
setInterval(() => {
  if (global.gc) {
    global.gc()  // --expose-gc フラグが必要
  }
}, 30 * 60 * 1000)  // 30分ごと

// Renderer Processのメモリ使用量を監視
async function monitorMemory(window: BrowserWindow): Promise<void> {
  const metrics = await window.webContents.getProcessMemoryInfo()
  const privateBytes = metrics.private  // MB単位
  
  if (privateBytes > 500) {  // 500MB超過でアラート
    console.warn(`メモリ使用量が高い: ${privateBytes}MB`)
    // ガベージコレクションを要求
    window.webContents.session.clearCache()
  }
}

// 定期監視（5分ごと）
setInterval(() => {
  BrowserWindow.getAllWindows().forEach(monitorMemory)
}, 5 * 60 * 1000)
```

### Renderer Processのコード分割

```tsx
// src/renderer/src/App.tsx — 遅延ロードパターン
import { lazy, Suspense } from 'react'

// 重いコンポーネントを遅延ロード
const MonacoEditor = lazy(() => import('./components/MonacoEditor'))
const ChartView = lazy(() => import('./components/ChartView'))
const SettingsPanel = lazy(() => import('./components/SettingsPanel'))

function App(): JSX.Element {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* エディタは遅延ロード（起動時間短縮） */}
          <Route path="/editor" element={<MonacoEditor />} />
          <Route path="/charts" element={<ChartView />} />
          <Route path="/settings" element={<SettingsPanel />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
```

### パフォーマンス計測

```typescript
// src/main/performance.ts
import { app } from 'electron'

// アプリ起動時間の計測
const startTime = Date.now()

app.whenReady().then(() => {
  const readyTime = Date.now() - startTime
  console.log(`app.whenReady(): ${readyTime}ms`)
})

// ウィンドウ表示までの時間
mainWindow.once('ready-to-show', () => {
  const showTime = Date.now() - startTime
  console.log(`ウィンドウ表示: ${showTime}ms`)
  
  // Crashレポートの設定
  app.setPath('crashDumps', path.join(app.getPath('userData'), 'crashes'))
})

// Renderer Processのパフォーマンスメトリクス
mainWindow.webContents.on('did-finish-load', () => {
  mainWindow.webContents.executeJavaScript(`
    const perf = window.performance
    const entries = perf.getEntriesByType('navigation')
    if (entries.length > 0) {
      const nav = entries[0]
      console.log('DOM Content Loaded:', nav.domContentLoadedEventEnd, 'ms')
      console.log('Load Complete:', nav.loadEventEnd, 'ms')
    }
  `)
})
```

---

## まとめ — Electronで本格的なデスクトップアプリを構築する

本記事で解説したElectronの主要概念を整理する。

| 項目 | 技術/ツール | 重要度 |
|------|-----------|--------|
| プロセスモデル | Main Process + Renderer Process | 必須理解 |
| IPC通信 | ipcMain/ipcRenderer + invoke/handle | 必須 |
| セキュリティ | contextBridge + CSP + nodeIntegration:false | 絶対必須 |
| UI開発 | React + TypeScript + Vite | 推奨 |
| ファイル操作 | dialog + fs + electron-store | 実用的 |
| システム統合 | Tray + Menu + Notification | 実用的 |
| 自動更新 | electron-updater + GitHub Releases | 本番必須 |
| クロスプラットフォームビルド | electron-builder | 本番必須 |
| コード署名 | Apple Developer + Microsoft | 配布必須 |
| パフォーマンス | コード分割 + 遅延初期化 | 推奨 |

**Electronを選ぶ理由は明快だ。** Node.jsのフルAPIアクセス・最大規模のコミュニティ・豊富な実績・Webスキルの直接転用——これらが揃ったフレームワークは他にない。Tauriがバイナリサイズで優位でも、実際の開発生産性と運用安定性でElectronは依然として最高の選択肢だ。

セキュリティだけは絶対に妥協しないこと。`nodeIntegration: false` と `contextIsolation: true` は設定のデフォルト値にかかわらず、必ず明示的に指定する習慣をつけよう。

---

## 開発効率化ツールの活用

Electronアプリ開発では、設定ファイルの管理が重要になる。`electron-builder.yml`・`package.json`・CSP設定など、JSON/YAMLの設定ミスがビルド失敗や署名エラーの原因になることが多い。

開発中に設定ファイルのバリデーションが必要になったら、**[DevToolBox](https://usedevtools.com/)** のJSON Validator・YAML Parserが役立つ。ブラウザ上で即座にフォーマット検証・整形・差分比較ができるため、`electron-builder.yml`のインデントミスや`package.json`の構文エラーを素早く発見できる。Electronプロジェクトの設定デバッグに活用してほしい。

---

## 参考リソース

- [Electron公式ドキュメント](https://www.electronjs.org/docs/latest/)
- [electron-vite公式サイト](https://electron-vite.org/)
- [electron-builder公式ドキュメント](https://www.electron.build/)
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [electron-updater ドキュメント](https://www.electron.build/auto-update)
- [Apple Developer: Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
