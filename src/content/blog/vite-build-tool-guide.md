---
title: 'Vite完全ガイド — 超高速ビルドツールでモダン開発環境を構築する'
description: 'Viteによる高速開発環境の構築を完全解説。HMR・プラグインシステム・ライブラリモード・環境変数・最適化・マルチページアプリ・SSR対応をコード例付きで網羅。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['Vite', 'TypeScript', 'ビルドツール', 'フロントエンド', 'React']
---

モダンなフロントエンド開発において、ビルドツールの選択は開発体験（DX）と生産性を大きく左右する。2020年にEvan You（Vue.js作者）が公開した **Vite**（フランス語で「速い」）は、従来のwebpack中心のエコシステムに対してまったく新しいアプローチを持ち込み、現在では最も注目されるビルドツールのひとつとなっている。

本記事では、Viteの内部アーキテクチャから実践的な設定・最適化まで、2000語を超える詳細解説でお届けする。TypeScript対応・プラグインシステム・HMR・ライブラリモード・SSRまで、実際のコード例とともに網羅する。

---

## 1. Viteとは — webpack/esbuildとの比較、なぜ高速なのか

### 従来ツールの課題

webpackは長年フロントエンド開発の標準であり続けたが、プロジェクトが大規模になるにつれて「開発サーバーの起動に30秒〜数分かかる」「コード変更のHMRが遅い」という問題が顕在化してきた。根本原因は **バンドル戦略** にある。webpackはエントリーポイントから全ての依存関係を解析し、ひとつの（または複数の）バンドルファイルを生成してから開発サーバーを起動する。アプリが大きくなるほどこの処理時間が線形に増大する。

### Viteの2段階アーキテクチャ

Viteはこの問題を根本から解決するため、開発時と本番ビルド時で異なるアーキテクチャを採用している。

**開発時: ESM（ES Modules）ネイティブサーバー**

現代のブラウザはESモジュール（`import`/`export`）をネイティブにサポートしている。Viteの開発サーバーはファイルをバンドルせず、ブラウザの `import` リクエストに対してそのファイルを変換・返すだけだ。これにより：

- サーバー起動は「バンドルを作る」のではなく「サーバーを立ち上げる」だけなので高速
- HMRはページ全体ではなく変更されたモジュールだけを差し替えるため瞬時に反映される
- プロジェクトが大きくなっても起動時間がほぼ変わらない

**本番ビルド: Rollup**

本番ビルドはRollupを使用してコードをバンドルする。Rollupはツリーシェイキングや効率的なコード分割に優れており、最適化されたプロダクションバンドルを生成できる。

### esbuildとの関係

Viteはesbuildを2つの目的に利用している：

1. **依存関係のプリバンドル**: `node_modules` の CommonJS モジュールをESMに変換し、`lodash` のような大量の小さなファイルを持つパッケージをひとつにまとめる（ブラウザへのHTTPリクエスト数を削減）
2. **TypeScript・JSXの変換**: esbuildはTypeScriptの型チェックなしの変換（トランスパイル）が非常に高速であり、20〜30倍の速度でJSに変換できる

### ビルドツール比較表

| ツール | 開発サーバー起動 | HMR速度 | 本番ビルド | TypeScript対応 |
|--------|--------------|---------|-----------|--------------|
| webpack 5 | 遅い（バンドル必要） | 中程度 | 良好 | loader必要 |
| Parcel 2 | 中程度 | 中程度 | 良好 | 自動 |
| esbuild | 非常に速い | 基本的 | 制限あり | ネイティブ |
| **Vite** | **非常に速い** | **瞬時** | **優秀** | **ネイティブ** |
| Turbopack | 速い | 速い | 開発中 | ネイティブ |

---

## 2. プロジェクト初期化

Viteはテンプレートベースの初期化コマンドを提供している。Node.js 18以上推奨。

### React + TypeScript

```bash
npm create vite@latest my-react-app -- --template react-ts
cd my-react-app
npm install
npm run dev
```

### Vue 3 + TypeScript

```bash
npm create vite@latest my-vue-app -- --template vue-ts
cd my-vue-app
npm install
npm run dev
```

### Vanilla TypeScript（フレームワークなし）

```bash
npm create vite@latest my-vanilla-app -- --template vanilla-ts
cd my-vanilla-app
npm install
npm run dev
```

### その他の公式テンプレート

```bash
# Svelte + TypeScript
npm create vite@latest my-svelte-app -- --template svelte-ts

# Preact + TypeScript
npm create vite@latest my-preact-app -- --template preact-ts

# Solid.js + TypeScript
npm create vite@latest my-solid-app -- --template solid-ts

# Lit（Web Components）
npm create vite@latest my-lit-app -- --template lit-ts
```

### 生成されるディレクトリ構造（React + TS）

```
my-react-app/
├── public/               # 静的ファイル（変換なしでコピー）
│   └── vite.svg
├── src/
│   ├── assets/           # インポートして使う静的ファイル
│   │   └── react.svg
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx          # エントリーポイント
│   └── vite-env.d.ts     # Vite型定義
├── index.html            # SPAのルートHTML（publicではなくルートに）
├── package.json
├── tsconfig.json
├── tsconfig.node.json    # vite.config.ts用のtsconfig
└── vite.config.ts
```

重要な点として、`index.html` はプロジェクトルートに置かれる。webpackとは異なり、Viteは `index.html` をエントリーポイントとして直接扱い、`<script type="module" src="/src/main.tsx">` のようにESMでソースを参照する。

---

## 3. vite.config.tsの設定

`vite.config.ts` はViteの中核設定ファイルだ。型サポートが完備されており、IDEでの補完も効く。

### 基本構造

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  // パスエイリアス設定
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },

  // 開発サーバー設定
  server: {
    port: 3000,
    host: true,         // LAN上の他デバイスからもアクセス可能
    open: true,         // 起動時にブラウザを自動オープン
    strictPort: false,  // ポート使用中なら次のポートへ
    cors: true,
  },

  // ビルド設定
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,          // ソースマップ生成
    minify: 'esbuild',        // 'terser' も選択可
    target: 'es2020',         // ターゲットブラウザ
    chunkSizeWarningLimit: 500, // kB単位のチャンクサイズ警告閾値
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },

  // CSS設定
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },

  // プレビューサーバー（npm run preview）設定
  preview: {
    port: 4173,
    host: true,
  },
})
```

### TypeScriptパスエイリアスの tsconfig.json 設定

`vite.config.ts` でエイリアスを設定した場合、TypeScriptの型解決のために `tsconfig.json` にも設定が必要だ：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

### 環境別設定

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  // 環境変数を読み込む
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    define: {
      // グローバル定数の定義
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    build: {
      // 本番ビルドのみsourcemapを無効化
      sourcemap: command === 'serve',
      // 本番ビルドのみminify
      minify: command === 'build' ? 'esbuild' : false,
    },
  }
})
```

---

## 4. 環境変数（.env・import.meta.env・型定義）

### .envファイルの種類と読み込み優先度

Viteはdotenvを使用して `.env` ファイルを読み込む：

```
.env                # 全環境共通
.env.local          # 全環境共通・gitignore推奨
.env.development    # npm run dev 時のみ
.env.development.local
.env.production     # npm run build 時のみ
.env.production.local
.env.test           # vitest実行時のみ
```

優先度: `.env.{mode}.local` > `.env.{mode}` > `.env.local` > `.env`

### VITE_プレフィックスのルール

セキュリティ上の理由から、クライアントサイドのコードに公開される環境変数は必ず `VITE_` プレフィックスが必要だ：

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_TITLE=My Dev App
VITE_ENABLE_MOCK=true

# 以下はクライアントには公開されない（サーバーサイドのみ）
DATABASE_URL=postgresql://localhost:5432/mydb
SECRET_KEY=my-secret-key-not-exposed
```

### コード内での使用

```typescript
// 環境変数へのアクセス
const apiUrl = import.meta.env.VITE_API_BASE_URL
const appTitle = import.meta.env.VITE_APP_TITLE
const isMockEnabled = import.meta.env.VITE_ENABLE_MOCK === 'true'

// Vite組み込みの環境変数
console.log(import.meta.env.MODE)      // 'development' | 'production' | 'test'
console.log(import.meta.env.BASE_URL)  // vite.config.ts の base オプション値
console.log(import.meta.env.PROD)      // boolean: 本番ビルドかどうか
console.log(import.meta.env.DEV)       // boolean: 開発モードかどうか
console.log(import.meta.env.SSR)       // boolean: SSR実行中かどうか
```

### 環境変数の型定義

`src/vite-env.d.ts` に型を追加して補完を有効化する：

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_ENABLE_MOCK: string
  readonly VITE_GOOGLE_ANALYTICS_ID: string
  readonly VITE_SENTRY_DSN: string
  // 追加した環境変数はここに型を定義する
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

これにより、`import.meta.env.VITE_` でIDEの補完が効くようになる。

---

## 5. プラグインシステム

### 公式プラグイン

```bash
# React（Babel-based HMR）
npm install -D @vitejs/plugin-react

# React（SWC-based HMR、より高速）
npm install -D @vitejs/plugin-react-swc

# Vue 3
npm install -D @vitejs/plugin-vue

# Vue 2（レガシー）
npm install -D @vitejs/plugin-vue2

# Svelte
npm install -D @sveltejs/vite-plugin-svelte
```

### よく使われるコミュニティプラグイン

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { visualizer } from 'rollup-plugin-visualizer'  // バンドル可視化
import { compression } from 'vite-plugin-compression2'  // gzip/brotli圧縮
import svgr from 'vite-plugin-svgr'                    // SVGをReactコンポーネントとして使用
import checker from 'vite-plugin-checker'              // TypeScript型チェックをビルド並列化
import { VitePWA } from 'vite-plugin-pwa'              // Progressive Web App

export default defineConfig({
  plugins: [
    react(),

    // SVGをReactコンポーネントとしてインポート可能に
    svgr(),

    // TypeScript型チェックをバックグラウンド実行
    checker({
      typescript: true,
    }),

    // バンドルサイズ可視化（npm run build後にstats.htmlを生成）
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),

    // 本番ビルドでgzip/brotli圧縮ファイルを生成
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),

    // PWA設定
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'My App',
        short_name: 'App',
        theme_color: '#ffffff',
      },
    }),
  ],
})
```

### カスタムプラグインの作成

Viteプラグインはrollupプラグインの拡張版であり、以下のフックを持つ：

```typescript
// plugins/my-plugin.ts
import type { Plugin } from 'vite'

interface MyPluginOptions {
  prefix?: string
  verbose?: boolean
}

export function myVitePlugin(options: MyPluginOptions = {}): Plugin {
  const { prefix = 'GENERATED', verbose = false } = options

  return {
    // プラグイン名（エラーメッセージで使用）
    name: 'vite-plugin-my-plugin',

    // 設定フック: Vite設定を拡張/上書き
    config(config, { command }) {
      if (command === 'build') {
        return {
          define: {
            __PLUGIN_PREFIX__: JSON.stringify(prefix),
          },
        }
      }
    },

    // 設定解決後に呼ばれる（最終設定を参照可能）
    configResolved(resolvedConfig) {
      if (verbose) {
        console.log('[my-plugin] Config resolved:', resolvedConfig.mode)
      }
    },

    // 開発サーバー設定フック
    configureServer(server) {
      // カスタムミドルウェアを追加
      server.middlewares.use('/api/health', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }))
      })
    },

    // ファイル変換フック（バンドル時・開発時両方に適用）
    transform(code, id) {
      // .ts/.tsx ファイルのみ処理
      if (!id.endsWith('.ts') && !id.endsWith('.tsx')) return null

      // コードの変換（例: コメント追加）
      if (verbose) {
        return {
          code: `/* Processed by ${prefix} */\n${code}`,
          map: null,
        }
      }

      return null
    },

    // ビルド開始フック
    buildStart() {
      console.log('[my-plugin] Build started')
    },

    // ビルド完了フック
    buildEnd() {
      console.log('[my-plugin] Build completed')
    },

    // バンドルされたファイルへのフック
    generateBundle(options, bundle) {
      // 生成されたアセットにメタデータを追加するなど
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          if (verbose) {
            console.log(`[my-plugin] Chunk: ${fileName} (${chunk.code.length} bytes)`)
          }
        }
      }
    },
  }
}
```

使用方法：

```typescript
// vite.config.ts
import { myVitePlugin } from './plugins/my-plugin'

export default defineConfig({
  plugins: [
    myVitePlugin({ prefix: 'MYAPP', verbose: true }),
  ],
})
```

---

## 6. HMR（Hot Module Replacement）の仕組みと設定

### HMRのしくみ

ViteのHMRはESMネイティブな実装により、変更されたモジュールとその依存チェーンだけを差し替える。Reactなら `@vitejs/plugin-react` がFast Refreshを提供し、コンポーネントの状態を保持したまま再レンダリングする。

### HMR APIの手動制御

自動HMRが機能しない特殊なケース（WebSocketやタイマーなど）では手動でHMRを制御できる：

```typescript
// src/websocket-client.ts
let ws: WebSocket | null = null

function connect() {
  ws = new WebSocket('ws://localhost:8080')
  ws.onmessage = (event) => {
    console.log('Message received:', event.data)
  }
}

connect()

// HMRが有効な開発環境でのみ実行
if (import.meta.hot) {
  // モジュールが更新される前に呼ばれる（クリーンアップ）
  import.meta.hot.dispose(() => {
    if (ws) {
      ws.close()
      ws = null
    }
  })

  // 自分自身のHMR更新を受け入れる
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      console.log('WebSocket module updated')
    }
  })

  // 依存モジュールの更新を受け入れる
  import.meta.hot.accept(['./config', './utils'], ([newConfig, newUtils]) => {
    console.log('Config or Utils updated, reconnecting...')
    if (ws) ws.close()
    connect()
  })

  // HMRデータを次の更新サイクルに引き継ぐ
  import.meta.hot.data.connectionCount = (import.meta.hot.data.connectionCount || 0) + 1
}
```

### カスタムHMRイベント

```typescript
// vite.config.ts のカスタムプラグイン内でHMRイベントを送信
configureServer(server) {
  server.watcher.on('change', (file) => {
    if (file.endsWith('.json')) {
      server.ws.send({
        type: 'custom',
        event: 'json-updated',
        data: { file },
      })
    }
  })
}

// クライアントサイドで受信
if (import.meta.hot) {
  import.meta.hot.on('json-updated', (data) => {
    console.log('JSON file updated:', data.file)
    // 必要に応じて再取得など
  })
}
```

---

## 7. ライブラリモード（Library Mode）

Viteはコンポーネントライブラリや汎用ライブラリの配布にも対応している。

### 基本設定

```typescript
// vite.config.ts（ライブラリモード）
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'  // 型定義ファイル生成

export default defineConfig({
  plugins: [
    react(),
    // TypeScript型定義ファイル（.d.ts）を自動生成
    dts({
      include: ['src'],
      exclude: ['src/**/*.stories.tsx', 'src/**/*.test.tsx'],
    }),
  ],

  build: {
    lib: {
      // ライブラリのエントリーポイント
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyComponentLibrary',  // UMDビルド時のグローバル変数名
      // 出力ファイル名
      fileName: (format) => `my-library.${format}.js`,
      // 出力フォーマット: es（ESM）とcjs（CommonJS）両方を生成
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // ライブラリに含めない外部依存関係
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // UMDビルドでの外部依存のグローバル変数名
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    // ライブラリモードでCSS自動インジェクションをオフにする場合
    cssCodeSplit: false,
  },
})
```

### ライブラリのエントリーポイント

```typescript
// src/index.ts（すべてのエクスポートをまとめる）
export { Button } from './components/Button'
export { Input } from './components/Input'
export { Modal } from './components/Modal'
export { useTheme } from './hooks/useTheme'
export type { ButtonProps } from './components/Button'
export type { InputProps } from './components/Input'
export type { ModalProps } from './components/Modal'
```

### package.jsonの設定

```json
{
  "name": "my-component-library",
  "version": "1.0.0",
  "main": "./dist/my-library.cjs.js",
  "module": "./dist/my-library.es.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/my-library.es.js",
      "require": "./dist/my-library.cjs.js",
      "types": "./dist/index.d.ts"
    },
    "./styles": "./dist/style.css"
  },
  "files": ["dist"],
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  }
}
```

---

## 8. マルチページアプリ（MPA）設定

SPAではなく複数のHTMLページを持つアプリケーションもViteでサポートできる。

### ディレクトリ構造

```
my-mpa/
├── index.html          # トップページ
├── about/
│   └── index.html      # /about
├── contact/
│   └── index.html      # /contact
├── admin/
│   └── index.html      # /admin
└── vite.config.ts
```

### vite.config.tsの設定

```typescript
// vite.config.ts（マルチページアプリ）
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // ページ名: HTMLファイルのパス
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about/index.html'),
        contact: resolve(__dirname, 'contact/index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
})
```

### 動的なマルチページ設定

ページが多い場合はglob展開を使った動的設定が便利だ：

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import glob from 'fast-glob'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 全HTMLファイルを自動検出
const pages = Object.fromEntries(
  glob.sync('./src/pages/**/*.html').map((file) => {
    const name = file
      .replace('./src/pages/', '')
      .replace('/index.html', '')
      .replace('.html', '')
    return [name || 'index', resolve(__dirname, file)]
  })
)

export default defineConfig({
  build: {
    rollupOptions: {
      input: pages,
    },
  },
})
```

---

## 9. ビルド最適化

### チャンク分割戦略

適切なチャンク分割によりキャッシュ効率を高め、初期ロード時間を短縮できる：

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // node_modules の依存関係を分類してチャンク化
          if (id.includes('node_modules')) {
            // Reactコアライブラリ
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'react-vendor'
            }
            // ルーティング
            if (id.includes('react-router')) {
              return 'router'
            }
            // UIコンポーネントライブラリ
            if (id.includes('@radix-ui') || id.includes('@headlessui')) {
              return 'ui-libs'
            }
            // 状態管理
            if (id.includes('zustand') || id.includes('jotai') || id.includes('@tanstack/query')) {
              return 'state-management'
            }
            // チャートライブラリ（大きいので分離）
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts'
            }
            // その他のnode_modules
            return 'vendor'
          }
        },
      },
    },
  },
})
```

### 動的インポートによるコード分割

```typescript
// src/App.tsx
import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// 動的インポートで遅延ロード（コード分割自動生成）
const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))

// 意図的なチャンク名指定（コメントで）
const AdminPanel = lazy(
  () => import(/* webpackChunkName: "admin" */ './pages/AdminPanel')
)

// プリフェッチ（ユーザーが使いそうなページを事前ロード）
const UserProfile = lazy(
  () => import(/* vite-prefetch */ './pages/UserProfile')
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/profile/:id" element={<UserProfile />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

### バンドルサイズ最適化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // Terserによるより高度な圧縮（esbuildより遅いが圧縮率高）
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,       // console.logを除去
        drop_debugger: true,      // debugger文を除去
        pure_funcs: ['console.info', 'console.debug'],
      },
    },
    // CSSファイルも圧縮
    cssMinify: true,
    // 報告されるチャンクサイズの上限（kB）
    chunkSizeWarningLimit: 1000,
  },

  // tree shaking を支援するサイドエフェクトヒント
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
    exclude: [
      // 開発専用パッケージをプリバンドルから除外
      '@testing-library/react',
    ],
  },
})
```

---

## 10. プロキシ設定（API転送・CORS回避）

開発時にバックエンドAPIへのリクエストをプロキシすることでCORS問題を回避できる：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      // シンプルなパスベースのプロキシ
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,  // CORSのためにHostヘッダーを変更
        secure: false,       // 自己署名証明書を許可
        rewrite: (path) => path.replace(/^\/api/, ''),  // /api を除去
      },

      // WebSocketプロキシ
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },

      // 複数のAPIエンドポイント
      '/auth': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },

      // 正規表現によるマッチング
      '^/api/v[12]/.*': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },

      // リクエスト・レスポンスの加工
      '/legacy': {
        target: 'http://legacy-server.internal',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // リクエストヘッダーを追加
            proxyReq.setHeader('X-Forwarded-By', 'Vite Dev Server')
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // レスポンスヘッダーを確認
            console.log('[proxy]', req.method, req.url, '->', proxyRes.statusCode)
          })
          proxy.on('error', (err, req, res) => {
            console.error('[proxy error]', err)
          })
        },
      },
    },
  },
})
```

---

## 11. CSS Modules・PostCSS・Sass設定

### CSS Modules

```typescript
// vite.config.ts
export default defineConfig({
  css: {
    modules: {
      // camelCase でクラス名にアクセス: styles.myButton
      localsConvention: 'camelCase',
      // スコープ付きクラス名のパターン
      generateScopedName: '[name]__[local]--[hash:base64:5]',
      // グローバルなクラスのプレフィックス
      globalModulePaths: [/global\.module\.css$/],
    },
  },
})
```

```tsx
// Button.tsx
import styles from './Button.module.css'

function Button({ children, variant = 'primary' }) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  )
}
```

### PostCSSの設定

```bash
npm install -D postcss autoprefixer postcss-nesting
```

```javascript
// postcss.config.js
export default {
  plugins: {
    'postcss-nesting': {},   // CSSネスティング構文のサポート
    autoprefixer: {},         // ベンダープレフィックス自動付与
  },
}
```

### Sassの設定

```bash
npm install -D sass
```

```typescript
// vite.config.ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        // 全SCSSファイルに自動インポート（変数・mixinの共有）
        additionalData: `
          @use "@/styles/variables" as *;
          @use "@/styles/mixins" as *;
        `,
      },
    },
  },
})
```

```scss
// src/styles/variables.scss
$primary-color: #3b82f6;
$secondary-color: #10b981;
$font-size-base: 1rem;
$spacing-unit: 8px;
```

---

## 12. テスト環境（Vitest統合）

VitestはViteネイティブのテストフレームワークで、vite.config.tsの設定を共有できる。

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

### vite.config.tsへのVitest設定追加

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
/// <reference types="vitest" />

export default defineConfig({
  plugins: [react()],

  test: {
    // テスト環境（jsdom: ブラウザ環境シミュレーション）
    environment: 'jsdom',

    // グローバルAPI（describe, it, expect等）を自動インポート
    globals: true,

    // セットアップファイル
    setupFiles: ['./src/test/setup.ts'],

    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/test/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },

    // テストファイルのパターン
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],

    // UIモード（npm run test:ui で起動）
    ui: true,
    open: false,

    // スナップショットの保存先
    snapshotOptions: {
      snapshotFormat: {
        escapeString: false,
      },
    },
  },
})
```

### セットアップファイル

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// 各テスト後にDOMをクリーンアップ
afterEach(() => {
  cleanup()
})

// グローバルモックの設定
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// IntersectionObserverのモック
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
```

### コンポーネントのテスト例

```typescript
// src/components/Button/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button コンポーネント', () => {
  it('テキストが正しくレンダリングされる', () => {
    render(<Button>クリックしてください</Button>)
    expect(screen.getByText('クリックしてください')).toBeInTheDocument()
  })

  it('クリック時にonClickが呼ばれる', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>ボタン</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('disabled時はクリックできない', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>無効ボタン</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('variantに応じたクラスが適用される', () => {
    const { rerender } = render(<Button variant="primary">ボタン</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-primary')

    rerender(<Button variant="secondary">ボタン</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-secondary')
  })
})
```

### package.jsonのスクリプト設定

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 13. 本番デプロイ（Vercel・Cloudflare Pages）

### Vercelへのデプロイ

```bash
npm install -g vercel
npm run build
vercel --prod
```

または `vercel.json` でビルド設定を管理：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Cloudflare Pagesへのデプロイ

```bash
npm install -g wrangler
wrangler pages deploy dist
```

`wrangler.toml` での設定：

```toml
name = "my-vite-app"
pages_build_output_dir = "dist"

[vars]
ENVIRONMENT = "production"

[[env.production.vars]]
VITE_API_BASE_URL = "https://api.example.com"
```

GitHub Actionsでの自動デプロイ：

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Run tests
        run: npm run test:run

      - name: Build
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
          VITE_GOOGLE_ANALYTICS_ID: ${{ secrets.VITE_GOOGLE_ANALYTICS_ID }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: my-vite-app
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### GitHub Pagesへのデプロイ

```typescript
// vite.config.ts（GitHub Pages用）
export default defineConfig({
  // リポジトリ名に合わせてbaseを設定
  base: '/my-repo-name/',

  build: {
    outDir: 'dist',
  },
})
```

```yaml
# .github/workflows/gh-pages.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 実践的なTipsまとめ

### 1. 依存関係のプリバンドル最適化

初回起動が遅い場合、キャッシュをクリアして再プリバンドルする：

```bash
# Viteのキャッシュクリア
rm -rf node_modules/.vite

# または起動時のオプション
npm run dev -- --force
```

### 2. 型安全なグローバル定数

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})

// global.d.ts
declare const __APP_VERSION__: string
```

### 3. 条件付きビルド

```typescript
// 環境に応じた条件付きコードはtree shakingで除去される
if (import.meta.env.DEV) {
  // このブロックは本番ビルドから完全に除去される
  console.log('Development mode')
}
```

### 4. アセットの扱い

```typescript
// URL文字列として取得
import logoUrl from './logo.svg'
// -> '/assets/logo.abc123.svg'

// Base64インライン化（小さいアセット向け）
import tinyIconBase64 from './icon.png?inline'

// Rawテキストとして取得
import shaderCode from './shader.glsl?raw'

// Workerとして取得
import MyWorker from './worker.ts?worker'
const worker = new MyWorker()
```

---

## DevToolBoxでVite開発をさらに効率化

ViteプロジェクトではJSON形式の設定ファイルが多数登場する。`package.json`・`tsconfig.json`・`.env`のJSON出力・APIレスポンスのデバッグ・Rollupのバンドル統計など、複雑なJSONを扱う機会は日常的だ。

**[DevToolBox](https://usedevtools.com/)** はブラウザ上で動作するWeb開発ツール集で、JSON Formatter・Validator・Diff・Minifierを無料で提供している。特にViteのビルド設定で発生しがちな「JSONのシンタックスエラー」や「tsconfig.jsonのパス設定ミス」を素早く検出・修正するのに役立つ。インストール不要でどこからでもアクセスできるため、開発中のちょっとしたJSON確認作業に重宝する。

---

## まとめ

Viteは単なる「速いwebpack代替」ではなく、ESMネイティブという設計思想のもとで開発者体験（DX）を根本から再設計したビルドツールだ。本記事で解説したポイントを振り返ると：

| セクション | 要点 |
|-----------|------|
| アーキテクチャ | 開発時ESMサーバー + 本番時Rollup の2段階設計 |
| 設定 | `vite.config.ts` で型安全に全設定を管理 |
| 環境変数 | `VITE_`プレフィックスで安全に公開・型定義も可能 |
| プラグイン | rollupプラグイン互換の豊富なエコシステム |
| HMR | モジュール単位の差し替えで状態保持 |
| ライブラリモード | ESM/CJS両対応の配布用ビルドが簡単に |
| MPA | `rollupOptions.input` の複数指定でマルチページ対応 |
| 最適化 | manualChunks・動的インポートでキャッシュ効率UP |
| プロキシ | 開発時APIプロキシでCORS問題を解決 |
| CSS | Modules・PostCSS・Sass全対応 |
| Vitest | vite.config.ts共有で設定がシンプル |
| デプロイ | Vercel/Cloudflare Pages/GitHub Pagesに対応 |

Viteのエコシステムは2026年現在も急速に進化しており、Vite 6からはEnvironment APIが導入されてSSRやエッジランタイムへの対応がさらに強化されている。フレームワーク選定からビルド最適化まで、Viteを深く理解することはモダンフロントエンドエンジニアにとって必須のスキルセットとなっている。

本記事のコード例は GitHub で公開予定だ。不明点や追加リクエストがあればコメントで教えてほしい。
