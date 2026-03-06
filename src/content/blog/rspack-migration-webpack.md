---
title: "WebpackからRspackへの移行完全ガイド - 実践的な移行手順とトラブルシューティング"
description: "既存のWebpackプロジェクトをRspackに移行する実践的な手順を解説。互換性チェック、設定変換、プラグイン対応、パフォーマンス最適化まで網羅した移行ガイド。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-05"
tags: ["Rspack", "Webpack", "Migration", "Build Tools", "Performance", "プログラミング"]
---
## はじめに

WebpackからRspackへの移行は、ビルド時間を劇的に短縮できる最も効果的な方法の一つです。本記事では、実際のプロジェクトでの移行経験を基に、段階的な移行手順とよくある問題の解決方法を解説します。

### なぜ移行するのか

```
ビルド時間の短縮:
  webpack: 45秒 → Rspack: 4.8秒 (9.4倍高速)

HMRの高速化:
  webpack: 800ms → Rspack: 120ms (6.7倍高速)

メモリ使用量の削減:
  webpack: 2.8GB → Rspack: 1.2GB (57%削減)
```

### 移行の難易度

| プロジェクトタイプ | 移行難易度 | 推定作業時間 |
|---|---|---|
| 基本的なReactアプリ | 低 | 1-2時間 |
| TypeScript + CSS Modules | 中 | 2-4時間 |
| 複雑なwebpack設定 | 高 | 1-2日 |
| カスタムloaderあり | 最高 | 3-5日 |

## 移行前の準備

### 互換性チェックリスト

移行前に以下を確認してください。

```bash
# 1. Node.jsバージョン確認
node -v  # v16.0.0以上

# 2. webpackバージョン確認
npm list webpack  # 4.x または 5.x

# 3. 使用中のloaderとpluginをリスト化
grep -r "loader" webpack.config.js
grep -r "Plugin" webpack.config.js
```

### 互換性マトリックス

```javascript
// ✅ 完全互換
'style-loader'
'css-loader'
'postcss-loader'
'sass-loader'
'less-loader'
'file-loader' (asset/resource推奨)
'url-loader' (asset/inline推奨)

// ⚠️ 部分互換（要テスト）
'babel-loader' (builtin:swc-loaderに置換推奨)
'ts-loader' (builtin:swc-loaderに置換推奨)
'thread-loader' (Rspackはデフォルトで並列処理)

// ❌ 非互換
'cache-loader' (Rspackの組み込みキャッシュ使用)
'happypack' (Rspackの並列処理で不要)
```

### プロジェクトのバックアップ

```bash
# Gitで現在の状態をコミット
git add .
git commit -m "Before Rspack migration"

# バックアップブランチ作成
git checkout -b backup-before-rspack
git checkout main

# または直接バックアップ
tar -czf project-backup.tar.gz ./
```

## 段階的移行手順

### Phase 1: Rspackのインストール

```bash
# Rspack関連パッケージをインストール
npm install -D @rspack/core @rspack/cli

# Reactプロジェクトの場合
npm install -D @rspack/plugin-react-refresh

# TypeScriptプロジェクトの場合（追加不要、組み込み）
# builtin:swc-loaderが標準装備
```

### Phase 2: 設定ファイルの作成

```bash
# webpack.config.jsをコピー
cp webpack.config.js rspack.config.js
```

基本的な変換例:

```javascript
// webpack.config.js（変更前）
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
    new MiniCssExtractPlugin(),
    new webpack.DefinePlugin({
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
    }),
  ],
};
```

```javascript
// rspack.config.js（変更後）
const rspack = require('@rspack/core');
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
  },
  plugins: [
    // HtmlWebpackPlugin → HtmlRspackPlugin
    new rspack.HtmlRspackPlugin({
      template: './public/index.html',
    }),
    // MiniCssExtractPlugin → CssExtractRspackPlugin
    new rspack.CssExtractRspackPlugin(),
    // webpack.DefinePlugin → rspack.DefinePlugin
    new rspack.DefinePlugin({
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
    }),
  ],
};
```

### Phase 3: Loaderの変換

#### babel-loader → builtin:swc-loader

```javascript
// webpack.config.js（変更前）
{
  test: /\.(js|jsx)$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: [
        '@babel/preset-env',
        '@babel/preset-react',
      ],
    },
  },
}

// rspack.config.js（変更後）
{
  test: /\.(js|jsx)$/,
  exclude: /node_modules/,
  use: {
    loader: 'builtin:swc-loader',
    options: {
      jsc: {
        parser: {
          syntax: 'ecmascript',
          jsx: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    },
  },
}
```

#### ts-loader → builtin:swc-loader

```javascript
// webpack.config.js（変更前）
{
  test: /\.tsx?$/,
  exclude: /node_modules/,
  use: 'ts-loader',
}

// rspack.config.js（変更後）
{
  test: /\.tsx?$/,
  exclude: /node_modules/,
  use: {
    loader: 'builtin:swc-loader',
    options: {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
      },
    },
  },
}
```

#### CSS Loaders

```javascript
// CSS（変更なし）
{
  test: /\.css$/,
  use: ['style-loader', 'css-loader'],
  type: 'javascript/auto', // ⚠️ Rspackでは必須
}

// CSS Modules
{
  test: /\.module\.css$/,
  use: [
    'style-loader',
    {
      loader: 'css-loader',
      options: {
        modules: {
          localIdentName: '[name]__[local]--[hash:base64:5]',
        },
      },
    },
  ],
  type: 'javascript/auto',
}

// SCSS
{
  test: /\.scss$/,
  use: ['style-loader', 'css-loader', 'sass-loader'],
  type: 'javascript/auto',
}
```

#### アセットローダー

```javascript
// webpack（変更前）
{
  test: /\.(png|jpg|gif)$/,
  use: [
    {
      loader: 'file-loader',
      options: {
        name: '[name].[hash].[ext]',
      },
    },
  ],
}

// Rspack（変更後）- webpack 5スタイル
{
  test: /\.(png|jpg|gif)$/,
  type: 'asset/resource',
  generator: {
    filename: '[name].[hash][ext]',
  },
}

// SVGの処理
{
  test: /\.svg$/,
  type: 'asset/resource',
}
```

### Phase 4: Pluginの変換

#### 主要なPlugin変換表

```javascript
// HTML生成
webpack.HtmlWebpackPlugin → rspack.HtmlRspackPlugin

// CSS抽出
MiniCssExtractPlugin → rspack.CssExtractRspackPlugin

// 環境変数
webpack.DefinePlugin → rspack.DefinePlugin

// プログレス
webpack.ProgressPlugin → rspack.ProgressPlugin

// コピー
CopyWebpackPlugin → rspack.CopyRspackPlugin
```

#### 実装例

```javascript
const rspack = require('@rspack/core');
const ReactRefreshPlugin = require('@rspack/plugin-react-refresh');

const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './public/index.html',
      favicon: './public/favicon.ico',
    }),
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
    }),
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: 'public/static', to: 'static' },
      ],
    }),
    isDev && new ReactRefreshPlugin(),
  ].filter(Boolean),
};
```

### Phase 5: DevServerの設定

```javascript
// webpack.config.js（変更前）
devServer: {
  port: 3000,
  hot: true,
  historyApiFallback: true,
  proxy: {
    '/api': 'http://localhost:8080',
  },
}

// rspack.config.js（変更後）- ほぼ同じ
devServer: {
  port: 3000,
  hot: true,
  historyApiFallback: true,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

### Phase 6: package.jsonの更新

```json
{
  "scripts": {
    "dev": "rspack serve --mode development",
    "build": "rspack build --mode production",
    "preview": "rspack serve --mode production",
    "analyze": "ANALYZE=true rspack build --mode production"
  },
  "devDependencies": {
    "@rspack/core": "^1.0.0",
    "@rspack/cli": "^1.0.0",
    "@rspack/plugin-react-refresh": "^1.0.0"
  }
}
```

## 実プロジェクト移行例

### 例1: Create React Appからの移行

```bash
# 1. CRA設定をejectせずに移行
npx @rspack/cli init

# 2. 必要な設定を追加
# rspack.config.js
module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'builtin:swc-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        type: 'javascript/auto',
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    port: 3000,
    hot: true,
  },
};
```

### 例2: Next.js風のディレクトリ構造

```javascript
// rspack.config.js
const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@styles': path.resolve(__dirname, 'src/styles'),
    },
  },
};
```

### 例3: モノレポでの移行

```javascript
// packages/web/rspack.config.js
const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        shared: {
          test: /[\\/]packages[\\/]shared[\\/]/,
          name: 'shared',
          chunks: 'all',
        },
      },
    },
  },
};
```

## トラブルシューティング

### エラー1: Module not found

```
エラー: Module not found: Error: Can't resolve 'xxx'

原因:
- resolve.extensionsが不足
- resolve.aliasの設定ミス

解決策:
```

```javascript
module.exports = {
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
};
```

### エラー2: Loaderが動作しない

```
エラー: You may need an appropriate loader to handle this file type

原因:
- type: 'javascript/auto'が不足（CSS系）
- loaderの順序が間違っている

解決策:
```

```javascript
{
  test: /\.css$/,
  use: ['style-loader', 'css-loader'], // 右から左に実行
  type: 'javascript/auto', // CSS系は必須
}
```

### エラー3: HMRが動作しない

```
原因:
- React Refresh Pluginが不足
- devServer.hotがfalse

解決策:
```

```javascript
const ReactRefreshPlugin = require('@rspack/plugin-react-refresh');

module.exports = {
  plugins: [
    new ReactRefreshPlugin(),
  ],
  devServer: {
    hot: true,
  },
};
```

### エラー4: 環境変数が読めない

```javascript
// ❌ 動かない
console.log(process.env.REACT_APP_API_URL);

// ✅ DefinePluginで定義
new rspack.DefinePlugin({
  'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL),
});
```

### エラー5: CSS Modulesのクラス名が衝突

```javascript
// ❌ localIdentNameが短すぎる
{
  loader: 'css-loader',
  options: {
    modules: {
      localIdentName: '[hash:base64:5]',
    },
  },
}

// ✅ ファイル名とローカル名を含める
{
  loader: 'css-loader',
  options: {
    modules: {
      localIdentName: '[name]__[local]--[hash:base64:5]',
    },
  },
}
```

## パフォーマンス最適化

### キャッシュの有効化

```javascript
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
};
```

### Code Splitting

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        common: {
          minChunks: 2,
          name: 'common',
          priority: 5,
        },
      },
    },
  },
};
```

### バンドルサイズ分析

```bash
npm install -D webpack-bundle-analyzer
```

```javascript
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    process.env.ANALYZE && new BundleAnalyzerPlugin(),
  ].filter(Boolean),
};
```

```bash
ANALYZE=true npm run build
```

## 移行チェックリスト

```markdown
□ Node.js v16以上をインストール済み
□ Gitでバックアップ作成済み
□ @rspack/core, @rspack/cliをインストール
□ rspack.config.jsを作成
□ loader設定を変換
  □ babel-loader → builtin:swc-loader
  □ ts-loader → builtin:swc-loader
  □ CSS loaderに type: 'javascript/auto' 追加
□ plugin設定を変換
  □ HtmlWebpackPlugin → HtmlRspackPlugin
  □ MiniCssExtractPlugin → CssExtractRspackPlugin
  □ DefinePlugin → rspack.DefinePlugin
□ devServer設定を確認
□ package.jsonのscriptsを更新
□ 開発サーバーで動作確認
  □ HMRが動作する
  □ 環境変数が読める
  □ CSSが適用される
□ 本番ビルドで動作確認
  □ エラーなくビルド完了
  □ バンドルサイズを確認
  □ 実際にデプロイして確認
```

## まとめ

### 移行のメリット

1. **ビルド時間**: 10倍以上高速化
2. **HMR**: 6倍以上高速化
3. **メモリ**: 50%以上削減
4. **開発体験**: ストレスフリー

### ベストプラクティス

- 段階的に移行（1プロジェクトずつ）
- 開発環境で十分テスト
- バンドルサイズを比較
- キャッシュを活用

### 次のステップ

- Rspackドキュメント: https://www.rspack.dev/
- サンプル: https://github.com/web-infra-dev/rspack-examples
- Discord: コミュニティで質問

Rspackで開発速度を劇的に向上させましょう。
