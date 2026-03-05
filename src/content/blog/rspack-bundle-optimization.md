---
title: 'Rspackバンドル最適化実践ガイド'
description: 'RspackでのTree Shaking、Code Splitting、SWC設定を活用した実践的なバンドル最適化手法と、Webpack互換性の完全ガイド'
pubDate: 2025-02-05
tags: ['Rspack', 'Bundle Optimization', 'Tree Shaking', 'Code Splitting', 'SWC', 'Webpack', 'Performance', 'プログラミング']
---

Rspackは、Rustで書かれた高速なWebバンドラーとして、Webpackとの互換性を保ちながら圧倒的なビルド速度を実現します。本記事では、Rspackを使った実践的なバンドル最適化手法について解説します。

## Rspackの基本セットアップ

まず、Rspackの基本的なセットアップから始めましょう。

```bash
npm install -D @rspack/cli @rspack/core
```

基本的な設定ファイル `rspack.config.js` を作成します。

```javascript
/** @type {import('@rspack/cli').Configuration} */
module.exports = {
  entry: './src/index.ts',
  output: {
    filename: '[name].[contenthash].js',
    path: __dirname + '/dist',
    clean: true,
  },
  optimization: {
    minimize: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'builtin:swc-loader',
        type: 'javascript/auto',
      },
    ],
  },
};
```

## Tree Shakingの最適化

### 1. sideEffectsの設定

`package.json` でside effectsを明示的に指定することで、Tree Shakingを最適化できます。

```json
{
  "name": "my-app",
  "sideEffects": false
}
```

特定のファイルにside effectsがある場合は配列で指定します。

```json
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.ts"
  ]
}
```

### 2. ESモジュールの使用

Tree Shakingを最大限活用するため、CommonJSではなくESモジュールを使用します。

```typescript
// ❌ CommonJS
const { someFunction } = require('./utils');

// ✅ ESモジュール
import { someFunction } from './utils';
```

### 3. Named Exportsの活用

default exportよりもnamed exportsを使用することで、Tree Shakingがより効果的に機能します。

```typescript
// utils.ts
// ✅ Named exports
export function add(a: number, b: number) {
  return a + b;
}

export function subtract(a: number, b: number) {
  return a - b;
}

export function multiply(a: number, b: number) {
  return a * b;
}

// ❌ Default export with object
export default {
  add,
  subtract,
  multiply,
};
```

使用側では必要な関数のみをインポート。

```typescript
// ✅ 必要な関数のみインポート
import { add, subtract } from './utils';

console.log(add(1, 2));
console.log(subtract(5, 3));
```

## Code Splittingの実装

### 1. Dynamic Importによる遅延ロード

動的インポートを使用して、必要なときにのみコードを読み込みます。

```typescript
// ❌ 静的インポート
import HeavyComponent from './HeavyComponent';

// ✅ 動的インポート
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 2. SplitChunksPluginの設定

Rspackの `optimization.splitChunks` を設定して、共通モジュールを分割します。

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // ベンダーコードを分離
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        // Reactライブラリを分離
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          priority: 20,
        },
        // 共通コードを分離
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    runtimeChunk: {
      name: 'runtime',
    },
  },
};
```

### 3. ルートベースのコード分割

ルーティングごとにバンドルを分割することで、初期ロードを高速化します。

```typescript
// routes.tsx
import { lazy } from 'react';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

export const routes = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> },
  { path: '/dashboard', element: <Dashboard /> },
];
```

## SWC設定の最適化

Rspackは内部的にSWCを使用しているため、SWCの設定を最適化することでビルドを高速化できます。

### 1. SWCローダーの設定

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|ts|jsx|tsx)$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
                decorators: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                  development: process.env.NODE_ENV === 'development',
                },
              },
              minify: {
                compress: true,
                mangle: true,
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

### 2. ターゲットブラウザの指定

`.browserslistrc` でターゲットブラウザを指定します。

```
> 0.5%
last 2 versions
not dead
not IE 11
```

または、`rspack.config.js` で直接指定。

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
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

### 3. 開発環境と本番環境の分離

```javascript
// rspack.config.js
const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  devtool: isDevelopment ? 'cheap-module-source-map' : 'source-map',
  optimization: {
    minimize: !isDevelopment,
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin({
        compress: {
          passes: 2,
          drop_console: !isDevelopment,
        },
        mangle: true,
      }),
    ],
  },
};
```

## Webpack互換性

RspackはWebpackの主要なAPIと互換性を持っています。既存のWebpackプロジェクトからの移行を容易にします。

### 1. Webpackローダーの使用

多くのWebpackローダーはRspackでも動作します。

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
};
```

### 2. Webpackプラグインの互換性

一部のWebpackプラグインはRspackでも動作します。

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('@rspack/core');

module.exports = {
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
  ],
};
```

### 3. aliasとresolveの設定

Webpackと同様のalias設定が可能です。

```javascript
const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
};
```

## パフォーマンス計測とモニタリング

### 1. バンドルサイズの分析

```bash
npm install -D @rspack/plugin-bundle-analyzer
```

```javascript
const { BundleAnalyzerPlugin } = require('@rspack/plugin-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
    }),
  ],
};
```

### 2. ビルド時間の計測

```javascript
const start = Date.now();

module.exports = {
  plugins: [
    {
      apply(compiler) {
        compiler.hooks.done.tap('BuildTimePlugin', () => {
          const end = Date.now();
          console.log(`Build completed in ${((end - start) / 1000).toFixed(2)}s`);
        });
      },
    },
  ],
};
```

### 3. Chunk命名の最適化

```javascript
module.exports = {
  output: {
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
  },
  optimization: {
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
  },
};
```

## 実践的な最適化戦略

### 1. プリロードとプリフェッチ

```typescript
// 重要なチャンクをプリロード
import(/* webpackPreload: true */ './CriticalComponent');

// 将来使用する可能性のあるチャンクをプリフェッチ
import(/* webpackPrefetch: true */ './OptionalComponent');
```

### 2. 環境変数の最適化

```javascript
const { DefinePlugin } = require('@rspack/core');

module.exports = {
  plugins: [
    new DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
      __API_URL__: JSON.stringify(process.env.API_URL),
    }),
  ],
};
```

### 3. CSSの最適化

```bash
npm install -D css-minimizer-rspack-plugin
```

```javascript
const CssMinimizerPlugin = require('css-minimizer-rspack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: ['default', { discardComments: { removeAll: true } }],
        },
      }),
    ],
  },
};
```

## まとめ

Rspackを使ったバンドル最適化では、以下のポイントが重要です。

- **Tree Shaking**: sideEffectsの設定とESモジュールの使用
- **Code Splitting**: 動的インポートとsplitChunksの最適化
- **SWC設定**: ターゲットブラウザと環境に応じた最適化
- **Webpack互換性**: 既存のローダーとプラグインの活用
- **モニタリング**: バンドルサイズとビルド時間の継続的な計測

Rspackは高速性とWebpack互換性を両立しており、既存プロジェクトの段階的な移行も可能です。適切な最適化戦略により、ビルド時間の大幅な短縮とバンドルサイズの削減を実現できます。
