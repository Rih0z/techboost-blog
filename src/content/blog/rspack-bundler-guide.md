---
title: "Rspack完全ガイド — Rust製の超高速バンドラーでWebpack互換の次世代ビルド体験"
description: "Webpack互換でRust製の超高速バンドラーRspackの完全ガイド。Webpackからの移行方法、パフォーマンス最適化、プラグインエコシステム、実践的な設定例まで徹底解説します。Rspack・Rust・Bundlerに関する実践情報。"
pubDate: "2025-02-06"
tags: ["Rspack", "Rust", "Bundler", "Webpack", "Build Tools"]
heroImage: '../../assets/thumbnails/rspack-bundler-guide.jpg'
---
Rspackは、Rust言語で実装されたWebpack互換の次世代JavaScriptバンドラーです。Webpackのエコシステムと互換性を保ちながら、Rustによる10倍以上の高速化を実現し、大規模プロジェクトのビルド時間を劇的に短縮します。この記事では、Rspackの基本から実践的な使い方まで徹底的に解説します。

## Rspackとは

Rspackは、ByteDance（TikTokを運営する企業）が開発したRust製の高速バンドラーです。Webpackの設計思想を受け継ぎながら、パフォーマンスを大幅に向上させています。

### 主な特徴

- **超高速ビルド** - Rustによる実装で、Webpackの10倍以上の速度
- **Webpack互換** - 既存のWebpack設定やプラグインの多くがそのまま動作
- **Hot Module Replacement (HMR)** - 高速なHMRで開発体験が向上
- **Tree Shaking** - 最適化された未使用コードの削除
- **Code Splitting** - 効率的なコード分割
- **ゼロコンフィグ** - 初期設定なしで即座に利用可能
- **生産性向上** - ビルド時間短縮により開発サイクルが高速化

### なぜRspackなのか

```
Webpack vs Rspack (10,000ファイルのプロジェクト)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
初回ビルド:
  Webpack: 120秒
  Rspack:  8秒  ← 15倍高速

再ビルド (HMR):
  Webpack: 3秒
  Rspack:  0.1秒  ← 30倍高速

プロダクションビルド:
  Webpack: 180秒
  Rspack:  12秒  ← 15倍高速
```

## インストールとセットアップ

### 新規プロジェクトの作成

```bash
# Rspackプロジェクトを作成
npm create rspack@latest my-app
cd my-app

# テンプレートを選択
# - react
# - react-ts
# - vue
# - vue-ts
# - vanilla
# - vanilla-ts

npm install
npm run dev
```

### 既存プロジェクトへの追加

```bash
npm install -D @rspack/core @rspack/cli
```

### 基本的な設定ファイル

```javascript
// rspack.config.js
const rspack = require('@rspack/core');

/**
 * @type {import('@rspack/cli').Configuration}
 */
module.exports = {
  entry: './src/index.js',
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['css-loader'],
        type: 'css',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './src/index.html',
    }),
  ],
};
```

### package.jsonのスクリプト設定

```json
{
  "scripts": {
    "dev": "rspack serve",
    "build": "rspack build",
    "build:prod": "rspack build --mode production"
  }
}
```

## Reactプロジェクトの設定

### TypeScript + React設定

```javascript
// rspack.config.js
const rspack = require('@rspack/core');
const refreshPlugin = require('@rspack/plugin-react-refresh');

const isDev = process.env.NODE_ENV === 'development';

/**
 * @type {import('@rspack/cli').Configuration}
 */
module.exports = {
  entry: {
    main: './src/index.tsx',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                  development: isDev,
                  refresh: isDev,
                },
              },
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.css$/,
        use: ['css-loader', 'postcss-loader'],
        type: 'css',
      },
      {
        test: /\.module\.css$/,
        use: [
          {
            loader: 'css-loader',
            options: {
              modules: true,
            },
          },
          'postcss-loader',
        ],
        type: 'css/module',
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './index.html',
    }),
    isDev && new refreshPlugin(),
  ].filter(Boolean),
  optimization: {
    minimize: !isDev,
  },
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
};
```

### CSS Modules対応

```javascript
// CSS Modulesの設定
module.exports = {
  module: {
    rules: [
      {
        test: /\.module\.css$/,
        use: [
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]--[hash:base64:5]',
              },
            },
          },
        ],
        type: 'css/module',
      },
    ],
  },
};
```

使用例:

```tsx
// Button.tsx
import styles from './Button.module.css';

export const Button = () => {
  return <button className={styles.button}>Click me</button>;
};
```

```css
/* Button.module.css */
.button {
  padding: 10px 20px;
  background: blue;
  color: white;
  border: none;
  border-radius: 4px;
}
```

## Vueプロジェクトの設定

```javascript
// rspack.config.js
const rspack = require('@rspack/core');
const { VueLoaderPlugin } = require('vue-loader');

/**
 * @type {import('@rspack/cli').Configuration}
 */
module.exports = {
  entry: './src/main.ts',
  resolve: {
    extensions: ['.ts', '.js', '.vue', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.ts$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
              },
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.css$/,
        use: ['vue-style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new rspack.HtmlRspackPlugin({
      template: './index.html',
    }),
  ],
};
```

## WebpackからRspackへの移行

### 移行ステップ

```bash
# 1. Rspackのインストール
npm install -D @rspack/core @rspack/cli

# 2. Webpackの削除（任意）
npm uninstall webpack webpack-cli webpack-dev-server

# 3. 設定ファイルのリネーム
mv webpack.config.js rspack.config.js

# 4. package.jsonのスクリプト更新
# webpack → rspack に変更
```

### 設定の変換

```javascript
// Before: webpack.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: './src/index.js',
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new MiniCssExtractPlugin(),
  ],
};
```

```javascript
// After: rspack.config.js
const rspack = require('@rspack/core');

module.exports = {
  entry: './src/index.js',
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './src/index.html',
    }),
    // CSSはビルトインでサポート
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        type: 'css', // Rspackのビルトイン機能
      },
    ],
  },
};
```

### 互換性のあるWebpackプラグイン

多くのWebpackプラグインがRspackで動作します:

```javascript
// 動作するWebpackプラグイン
const { DefinePlugin } = require('@rspack/core');
const CopyPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  plugins: [
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
    new CopyPlugin({
      patterns: [{ from: 'public', to: 'dist' }],
    }),
    new BundleAnalyzerPlugin(),
    new CompressionPlugin(),
  ],
};
```

## ローダーの設定

### SWCローダー（ビルトイン）

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        },
        type: 'javascript/auto',
      },
    ],
  },
};
```

### CSSローダー

```javascript
module.exports = {
  module: {
    rules: [
      // 通常のCSS
      {
        test: /\.css$/,
        use: ['css-loader', 'postcss-loader'],
        type: 'css',
      },
      // Sass/SCSS
      {
        test: /\.scss$/,
        use: ['css-loader', 'sass-loader'],
        type: 'css',
      },
      // Less
      {
        test: /\.less$/,
        use: ['css-loader', 'less-loader'],
        type: 'css',
      },
    ],
  },
};
```

### アセットローダー

```javascript
module.exports = {
  module: {
    rules: [
      // 画像ファイル
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8KB以下はinline
          },
        },
      },
      // フォントファイル
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
      },
    ],
  },
};
```

## コード分割とチャンク最適化

### エントリーポイント分割

```javascript
module.exports = {
  entry: {
    main: './src/index.js',
    admin: './src/admin.js',
    vendor: ['react', 'react-dom'],
  },
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
  },
};
```

### 動的インポート

```javascript
// src/index.js
// 動的インポートで自動コード分割
const loadHeavyModule = async () => {
  const module = await import('./heavyModule');
  module.doSomething();
};

// Reactでの使用例
const LazyComponent = React.lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

### 最適化設定

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // ベンダーコード分離
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        // 共通コード分離
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
          name: 'common',
        },
        // React系ライブラリ分離
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          priority: 20,
        },
      },
    },
    runtimeChunk: {
      name: 'runtime',
    },
    minimize: true,
    usedExports: true, // Tree shaking有効化
  },
};
```

## 環境変数と定数定義

### DefinePluginの使用

```javascript
const rspack = require('@rspack/core');

module.exports = {
  plugins: [
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
      __DEV__: process.env.NODE_ENV !== 'production',
      __VERSION__: JSON.stringify(require('./package.json').version),
    }),
  ],
};
```

### .envファイルの使用

```bash
# .env
API_URL=https://api.example.com
FEATURE_FLAG=true
```

```javascript
// rspack.config.js
require('dotenv').config();

module.exports = {
  plugins: [
    new rspack.DefinePlugin({
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
      'process.env.FEATURE_FLAG': JSON.stringify(process.env.FEATURE_FLAG),
    }),
  ],
};
```

使用例:

```typescript
// src/config.ts
export const config = {
  apiUrl: process.env.API_URL,
  isDev: __DEV__,
  version: __VERSION__,
};
```

## パフォーマンス最適化

### キャッシュ戦略

```javascript
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
  output: {
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
  },
};
```

### 並列処理の最適化

```javascript
module.exports = {
  experiments: {
    incrementalRebuild: true, // インクリメンタルビルド
  },
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
    },
  },
};
```

### Tree Shakingの最適化

```javascript
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: true,
  },
};
```

```json
// package.json
{
  "sideEffects": false
}
```

または特定ファイルのみ副作用あり:

```json
{
  "sideEffects": ["*.css", "*.scss", "./src/polyfills.js"]
}
```

## モダンブラウザ向けビルド

### ターゲット設定

```javascript
module.exports = {
  target: ['web', 'es2020'],
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              target: 'es2020',
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
            },
            env: {
              targets: {
                chrome: '90',
                firefox: '88',
                safari: '14',
                edge: '90',
              },
            },
          },
        },
      },
    ],
  },
};
```

### モダンとレガシーの二重ビルド

```javascript
// rspack.modern.config.js
module.exports = {
  output: {
    filename: '[name].modern.js',
  },
  target: ['web', 'es2020'],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              target: 'es2020',
            },
          },
        },
      },
    ],
  },
};

// rspack.legacy.config.js
module.exports = {
  output: {
    filename: '[name].legacy.js',
  },
  target: ['web', 'es5'],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              target: 'es5',
            },
          },
        },
      },
    ],
  },
};
```

HTMLで条件付き読み込み:

```html
<script type="module" src="/dist/main.modern.js"></script>
<script nomodule src="/dist/main.legacy.js"></script>
```

## Dev Serverの設定

```javascript
module.exports = {
  devServer: {
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
    compress: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
      },
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
};
```

## プロダクションビルドの最適化

### 完全な最適化設定

```javascript
const rspack = require('@rspack/core');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash:8].js',
    chunkFilename: 'js/[name].[contenthash:8].chunk.js',
    assetModuleFilename: 'assets/[name].[hash:8][ext]',
    clean: true,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin(),
      new rspack.LightningCssMinimizerRspackPlugin(),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
      },
    },
    runtimeChunk: 'single',
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
  },
  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
    hints: 'warning',
  },
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
    }),
  ],
};
```

## モノレポ対応

```javascript
// packages/app/rspack.config.js
const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
      '@utils': path.resolve(__dirname, '../utils/src'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, '../shared/src'),
          path.resolve(__dirname, '../utils/src'),
        ],
        use: {
          loader: 'builtin:swc-loader',
        },
      },
    ],
  },
};
```

## デバッグとトラブルシューティング

### ビルド情報の詳細表示

```javascript
module.exports = {
  stats: {
    preset: 'verbose',
    colors: true,
    modules: true,
    chunks: true,
    chunkModules: true,
    reasons: true,
    timings: true,
  },
};
```

### ソースマップの設定

```javascript
module.exports = {
  // 開発環境
  devtool: 'eval-cheap-module-source-map',

  // 本番環境
  // devtool: 'source-map',

  // デバッグなし
  // devtool: false,
};
```

### ビルドパフォーマンスの測定

```bash
# ビルド時間の測定
time npm run build

# 詳細なプロファイリング
RSPACK_PROFILE=ALL npm run build
```

## 実践的な設定例

### 大規模SPAの設定

```javascript
const rspack = require('@rspack/core');
const path = require('path');

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash:8].js',
    chunkFilename: 'js/[name].[contenthash:8].chunk.js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        },
      },
      {
        test: /\.css$/,
        use: ['css-loader', 'postcss-loader'],
        type: 'css',
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|webp)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024,
          },
        },
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './public/index.html',
      minify: true,
    }),
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
          name: 'react',
          priority: 20,
        },
      },
    },
    runtimeChunk: 'single',
  },
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
};
```

## まとめ

Rspackは、Webpackの互換性と次世代のパフォーマンスを両立した理想的なバンドラーです。

**主な利点:**
- Rust実装による圧倒的な高速化（10〜30倍）
- Webpack互換で段階的な移行が可能
- ビルトインSWCローダーで追加設定不要
- 高速HMRで開発体験が向上
- 大規模プロジェクトでも短時間でビルド完了

**こんなプロジェクトに最適:**
- 大規模SPAでビルド時間に課題がある
- Webpackから移行したいがエコシステムを維持したい
- 開発体験を向上させたい
- モノレポ構成で複数パッケージをビルド

Rspackは、Webpackの設計思想を受け継ぎながら、現代のパフォーマンス要求に応える次世代バンドラーです。既存のWebpackプロジェクトから段階的に移行でき、即座にビルド時間の大幅短縮を実感できます。
