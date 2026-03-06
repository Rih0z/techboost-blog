---
title: 'Neutralinojs入門：軽量デスクトップアプリ開発の新時代'
description: 'Electronの代替としてのNeutralinojs。軽量で高速なデスクトップアプリフレームワークの使い方を完全解説。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。初心者から実務レベルまで段階的に学べる内容です。'
pubDate: 'Feb 05 2026'
tags: ['Neutralino', 'Electron', 'デスクトップアプリ', 'JavaScript', 'クロスプラットフォーム']
---
# Neutralinojs入門：軽量デスクトップアプリ開発の新時代

Neutralinojs（ニュートラリノ）は、Electronの軽量代替として注目されているクロスプラットフォームデスクトップアプリフレームワークです。このガイドでは、基本から実践的な開発手法まで徹底解説します。

## Neutralinojsとは？

Neutralinojsは、HTML、CSS、JavaScriptを使ってクロスプラットフォームのデスクトップアプリケーションを開発できる軽量フレームワークです。

### ElectronとNeutralinojsの比較

| 項目 | Electron | Neutralinojs |
|-----|----------|--------------|
| バンドルサイズ | 120-200MB | 3-5MB |
| メモリ使用量 | 100-200MB | 20-40MB |
| 起動時間 | 2-5秒 | 0.5-1秒 |
| ランタイム | Chromium + Node.js | OS標準WebView |
| APIアクセス | 全Node.js API | 制限付きAPI |
| セキュリティ | コンテキスト分離必要 | サンドボックス化 |

### Neutralinojsのメリット

- **超軽量**: 3MB以下のバイナリサイズ
- **高速起動**: Chromiumを含まないため起動が速い
- **省メモリ**: OS標準のWebViewを使用
- **シンプル**: Electron特有の複雑さがない
- **クロスプラットフォーム**: Windows、macOS、Linux対応

### デメリット

- **機能制限**: Node.jsの全APIは使えない
- **WebView依存**: OSのWebViewバージョンに依存
- **エコシステム**: Electronほど成熟していない
- **レンダリング差異**: OS間でUIの見た目が若干異なる

## インストールとセットアップ

### 前提条件

```bash
# Node.js 14以上が必要
node --version
```

### Neutralinojs CLIのインストール

```bash
npm install -g @neutralinojs/neu
```

### プロジェクト作成

```bash
# 新規プロジェクト作成
neu create myapp

# テンプレート選択も可能
neu create myapp --template ts # TypeScript
neu create myapp --template react # React
neu create myapp --template vue # Vue.js
```

### プロジェクト構造

```
myapp/
├── neutralino.config.json    # 設定ファイル
├── resources/
│   ├── index.html            # メインHTML
│   ├── styles.css
│   └── js/
│       └── main.js           # メインスクリプト
├── .tmp/                     # 一時ファイル
└── dist/                     # ビルド出力
```

### 開発サーバーの起動

```bash
cd myapp
neu run
```

ブラウザで `http://localhost:5001` が開きます。

## 基本的な使い方

### neutralino.config.json

```json
{
  "applicationId": "com.example.myapp",
  "version": "1.0.0",
  "defaultMode": "window",
  "port": 0,
  "documentRoot": "/resources/",
  "url": "/",
  "enableServer": true,
  "enableNativeAPI": true,
  "tokenSecurity": "one-time",
  "logging": {
    "enabled": true,
    "writeToLogFile": true
  },
  "nativeAllowList": [
    "app.*",
    "os.*",
    "filesystem.*",
    "window.*"
  ],
  "modes": {
    "window": {
      "title": "My App",
      "width": 800,
      "height": 600,
      "minWidth": 400,
      "minHeight": 300,
      "resizable": true,
      "fullScreen": false,
      "alwaysOnTop": false,
      "icon": "/resources/icons/appIcon.png",
      "enableInspector": true,
      "borderless": false,
      "maximize": false,
      "hidden": false,
      "maximizable": true,
      "useSavedState": true,
      "exitProcessOnClose": true
    }
  },
  "cli": {
    "binaryName": "myapp",
    "resourcesPath": "/resources/",
    "extensionsPath": "/extensions/",
    "clientLibrary": "/resources/js/neutralino.js",
    "binaryVersion": "4.15.0",
    "clientVersion": "3.12.0"
  }
}
```

### HTMLでの初期化

```html
<!-- resources/index.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <h1>Neutralino App</h1>
    <button id="btn-hello">Say Hello</button>
    <div id="output"></div>
  </div>

  <!-- Neutralinoクライアントライブラリ -->
  <script src="js/neutralino.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

### JavaScriptでのAPI使用

```javascript
// resources/js/main.js

// Neutralinoの初期化
Neutralino.init();

// アプリ情報の取得
async function getAppInfo() {
  const info = await Neutralino.app.getConfig();
  console.log('App ID:', info.applicationId);
  console.log('Version:', info.version);
}

// ボタンイベント
document.getElementById('btn-hello').addEventListener('click', async () => {
  const output = document.getElementById('output');

  // OSダイアログ表示
  await Neutralino.os.showMessageBox(
    'Hello',
    'Hello from Neutralino!',
    'INFO',
    'OK'
  );

  output.textContent = 'Dialog shown!';
});

// ウィンドウイベント
Neutralino.events.on('windowClose', () => {
  Neutralino.app.exit();
});

// 初期化
getAppInfo();
```

## Neutralino API完全ガイド

### App API（アプリケーション制御）

```javascript
// アプリ終了
await Neutralino.app.exit(0);

// アプリ再起動
await Neutralino.app.restartProcess();

// アプリ設定取得
const config = await Neutralino.app.getConfig();
console.log(config.version);

// コマンドライン引数取得
const args = await Neutralino.app.getCommandLineArguments();
console.log(args);

// アプリパス取得
const path = await Neutralino.app.getPath();
console.log('App path:', path);

// ブロードキャストイベント送信
await Neutralino.app.broadcast('myEvent', { data: 'hello' });
```

### OS API（OS機能アクセス）

```javascript
// システム情報取得
const info = await Neutralino.os.getEnv('HOME');
console.log('Home directory:', info);

// 環境変数一覧
const envs = await Neutralino.os.getEnvs();
console.log(envs);

// コマンド実行
const result = await Neutralino.os.execCommand('ls -la');
console.log(result.stdOut);

// バックグラウンドプロセス起動
const pid = await Neutralino.os.spawnProcess('node server.js');
console.log('Process ID:', pid);

// プロセス取得
const processes = await Neutralino.os.getSpawnedProcesses();

// プロセス更新イベント
Neutralino.events.on('spawnedProcess', (evt) => {
  console.log(`Process ${evt.detail.id} ${evt.detail.action}`);
});

// ダイアログ
const choice = await Neutralino.os.showMessageBox(
  'Confirm',
  'Are you sure?',
  'QUESTION',
  'YES_NO'
);

if (choice === 'YES') {
  console.log('User confirmed');
}

// フォルダ選択ダイアログ
const folder = await Neutralino.os.showFolderDialog('Select folder');
console.log('Selected:', folder);

// ファイル選択ダイアログ
const file = await Neutralino.os.showOpenDialog('Select file', {
  filters: [
    { name: 'Images', extensions: ['jpg', 'png'] },
    { name: 'All files', extensions: ['*'] }
  ]
});

// ファイル保存ダイアログ
const savePath = await Neutralino.os.showSaveDialog('Save as', {
  filters: [{ name: 'Text', extensions: ['txt'] }]
});

// トレイアイコン
await Neutralino.os.setTray({
  icon: '/resources/icons/trayIcon.png',
  menuItems: [
    { id: 'about', text: 'About' },
    { id: 'sep', text: '-' },
    { id: 'quit', text: 'Quit' }
  ]
});

Neutralino.events.on('trayMenuItemClicked', (evt) => {
  if (evt.detail.id === 'quit') {
    Neutralino.app.exit();
  }
});

// 通知表示
await Neutralino.os.showNotification('New Message', 'You have a new message!', 'INFO');

// ブラウザで開く
await Neutralino.os.open('https://neutralino.js.org');
```

### Filesystem API（ファイル操作）

```javascript
// ファイル読み込み
const content = await Neutralino.filesystem.readFile('./data.txt');
console.log(content);

// バイナリ読み込み
const binary = await Neutralino.filesystem.readBinaryFile('./image.png');

// ファイル書き込み
await Neutralino.filesystem.writeFile('./output.txt', 'Hello World');

// バイナリ書き込み
await Neutralino.filesystem.writeBinaryFile('./output.bin', binary);

// 追記
await Neutralino.filesystem.appendFile('./log.txt', 'New log entry\n');

// ファイル削除
await Neutralino.filesystem.removeFile('./temp.txt');

// ディレクトリ作成
await Neutralino.filesystem.createDirectory('./newdir');

// ディレクトリ削除
await Neutralino.filesystem.removeDirectory('./olddir');

// ファイル一覧
const entries = await Neutralino.filesystem.readDirectory('./');
for (const entry of entries) {
  console.log(entry.entry, entry.type); // file or directory
}

// ファイル情報
const stats = await Neutralino.filesystem.getStats('./data.txt');
console.log('Size:', stats.size);
console.log('Modified:', stats.modifiedAt);

// ファイル/ディレクトリ移動
await Neutralino.filesystem.moveFile('./old.txt', './new.txt');

// コピー
await Neutralino.filesystem.copyFile('./source.txt', './dest.txt');

// ファイル監視
const watchId = await Neutralino.filesystem.createWatcher('./watchdir');

Neutralino.events.on('watchFile', (evt) => {
  console.log('File changed:', evt.detail.path);
  console.log('Action:', evt.detail.action); // add, delete, modified
});

// 監視停止
await Neutralino.filesystem.removeWatcher(watchId);
```

### Window API（ウィンドウ制御）

```javascript
// ウィンドウタイトル設定
await Neutralino.window.setTitle('New Title');

// ウィンドウサイズ変更
await Neutralino.window.setSize({ width: 1024, height: 768 });

// 最大化/最小化
await Neutralino.window.maximize();
await Neutralino.window.minimize();
await Neutralino.window.unmaximize();

// フルスクリーン
await Neutralino.window.setFullScreen();
await Neutralino.window.exitFullScreen();

// ウィンドウ表示/非表示
await Neutralino.window.show();
await Neutralino.window.hide();

// ウィンドウ位置移動
await Neutralino.window.move(100, 100);

// 常に最前面
await Neutralino.window.setAlwaysOnTop(true);

// ウィンドウを中央に配置
await Neutralino.window.center();

// フォーカス
await Neutralino.window.focus();

// アイコン設定
await Neutralino.window.setIcon('/resources/icons/appIcon.png');

// DevTools表示
await Neutralino.window.setEnableInspector(true);
```

### Storage API（データ保存）

```javascript
// データ保存
await Neutralino.storage.setData('username', 'john_doe');

// データ取得
const username = await Neutralino.storage.getData('username');
console.log(username);

// キー一覧
const keys = await Neutralino.storage.getKeys();
console.log(keys);

// データ削除
await Neutralino.storage.removeData('username');
```

## TypeScriptでの開発

### プロジェクトセットアップ

```bash
neu create myapp --template ts
cd myapp
npm install
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "outDir": "./resources/js",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 型定義付きコード

```typescript
// src/main.ts
import { init, app, os, window as neuWindow, filesystem } from '@neutralinojs/lib';

interface AppConfig {
  applicationId: string;
  version: string;
  port: number;
}

interface UserData {
  name: string;
  email: string;
  settings: Record<string, any>;
}

class MyApp {
  private config: AppConfig | null = null;

  async initialize(): Promise<void> {
    init();

    this.config = await app.getConfig();
    console.log('App initialized:', this.config.applicationId);

    this.setupEventListeners();
    await this.loadUserData();
  }

  private setupEventListeners(): void {
    neuWindow.events.on('windowClose', () => {
      this.shutdown();
    });

    const btnSave = document.getElementById('btn-save');
    btnSave?.addEventListener('click', () => this.saveData());
  }

  private async loadUserData(): Promise<void> {
    try {
      const dataStr = await filesystem.readFile('./data/user.json');
      const userData: UserData = JSON.parse(dataStr);
      console.log('User data loaded:', userData);
    } catch (error) {
      console.error('Failed to load user data:', error);
      await this.createDefaultData();
    }
  }

  private async saveData(): Promise<void> {
    const userData: UserData = {
      name: 'John Doe',
      email: 'john@example.com',
      settings: { theme: 'dark' }
    };

    await filesystem.writeFile(
      './data/user.json',
      JSON.stringify(userData, null, 2)
    );

    await os.showNotification(
      'Success',
      'Data saved successfully!',
      'INFO'
    );
  }

  private async createDefaultData(): Promise<void> {
    try {
      await filesystem.createDirectory('./data');
    } catch {
      // Directory may already exist
    }

    const defaultData: UserData = {
      name: '',
      email: '',
      settings: {}
    };

    await filesystem.writeFile(
      './data/user.json',
      JSON.stringify(defaultData, null, 2)
    );
  }

  private async shutdown(): Promise<void> {
    console.log('Shutting down...');
    await app.exit(0);
  }
}

// アプリ起動
const appInstance = new MyApp();
appInstance.initialize().catch(console.error);
```

## Reactとの統合

### Vite + React + Neutralino

```bash
# Viteプロジェクト作成
npm create vite@latest myapp -- --template react-ts
cd myapp
npm install
npm install -g @neutralinojs/neu

# Neutralino初期化
neu create neutralino-app
```

### 設定ファイル統合

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: './neutralino-app/resources',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});
```

### package.json スクリプト

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "neu:dev": "npm run build && cd neutralino-app && neu run",
    "neu:build": "npm run build && cd neutralino-app && neu build"
  }
}
```

### React コンポーネント

```typescript
// src/App.tsx
import { useState, useEffect } from 'react';
import { Neutralino } from '@neutralinojs/lib';

function App() {
  const [appInfo, setAppInfo] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (window.NL) {
      Neutralino.init();

      Neutralino.app.getConfig().then(setAppInfo);

      Neutralino.events.on('windowClose', () => {
        Neutralino.app.exit();
      });
    }
  }, []);

  const showDialog = async () => {
    await Neutralino.os.showMessageBox(
      'Hello',
      message || 'Hello from React + Neutralino!',
      'INFO',
      'OK'
    );
  };

  const selectFile = async () => {
    const file = await Neutralino.os.showOpenDialog('Select a file');
    setMessage(`Selected: ${file}`);
  };

  return (
    <div className="App">
      <h1>React + Neutralino</h1>
      {appInfo && (
        <div>
          <p>App ID: {appInfo.applicationId}</p>
          <p>Version: {appInfo.version}</p>
        </div>
      )}

      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter message"
      />

      <button onClick={showDialog}>Show Dialog</button>
      <button onClick={selectFile}>Select File</button>
    </div>
  );
}

export default App;
```

## ビルドと配布

### 開発ビルド

```bash
neu build
```

### リリースビルド

```bash
# すべてのプラットフォーム
neu build --release

# 特定のプラットフォーム
neu build --release --target=linux_x64
neu build --release --target=win_x64
neu build --release --target=mac_x64
neu build --release --target=mac_arm64
```

### 出力ファイル

```
dist/
├── myapp-linux_x64/
│   ├── myapp
│   └── resources.neu
├── myapp-win_x64/
│   ├── myapp.exe
│   └── resources.neu
└── myapp-mac_x64/
    ├── myapp
    └── resources.neu
```

### インストーラー作成

```bash
# macOS (.dmg)
npm install -g appdmg
appdmg config.json dist/MyApp.dmg

# Windows (.exe)
# NSIS利用
makensis installer.nsi

# Linux (.deb)
dpkg-deb --build myapp-deb
```

## まとめ

Neutralinojsは、軽量で高速なデスクトップアプリを開発するための優れた選択肢です。

### いつ使うべきか

- **Neutralinojsが最適**: シンプルなツール、ユーティリティアプリ、軽量アプリ
- **Electronを検討**: Node.js APIフル活用、複雑なネイティブ統合、一貫したUI
- **Tauriを検討**: セキュリティ重視、Rust統合、最小バイナリサイズ

Neutralinojsで、次世代の軽量デスクトップアプリを開発しましょう。
