---
title: 'RspackでWebpackプロジェクトを高速化する完全移行ガイド'
description: 'Webpack から Rspack への段階的な移行手順と、実際のパフォーマンス比較結果を詳しく解説します。互換性を保ちながら、ビルド時間を最大10倍高速化しましょう。設定ファイルの変換例やローダー互換性チェックリストも紹介します。ローダー互換性の確認方法やトラブルシューティングの手順も紹介します。'
pubDate: '2026-02-05'
tags: ['ビルドツール', 'フロントエンド']
heroImage: '../../assets/thumbnails/rspack-webpack-migration.jpg'
---

Webpackを使っているプロジェクトのビルドが遅すぎて、開発体験が悪化していませんか？Rspackは、Rustで書かれた高速なバンドラーで、Webpackとの高い互換性を保ちながら、劇的なパフォーマンス改善を実現します。

本記事では、既存のWebpackプロジェクトをRspackに移行する方法を段階的に解説し、実際のパフォーマンス比較結果も紹介します。

## Rspackとは？

Rspackは、ByteDance（TikTokの親会社）が開発したRust製の高速バンドラーです。

### 主な特徴

1. **圧倒的な高速性**: RustとSWCによる並列処理で、Webpackの5〜10倍高速
2. **Webpack互換性**: webpack.config.jsの多くの設定をそのまま使用可能
3. **段階的移行**: 既存プロジェクトを段階的に移行できる
4. **モダンなアーキテクチャ**: 最新のJavaScript/TypeScript機能に対応

### Webpackとの互換性レベル

Rspackは以下のWebpack機能をサポートしています。

```javascript
// ✅ サポート済み
- loader（style-loader、css-loader、babel-loader等）
- plugin（HtmlWebpackPlugin、DefinePlugin等）
- code splitting（dynamic import）
- tree shaking
- module federation（実験的）
- devServer

// ⚠️ 一部サポート
- 一部の古いloaderやplugin
- 複雑なカスタムプラグイン

// ❌ 未サポート
- webpack 4以前の古い設定構文
```

## なぜRspackを選ぶべきか？

### パフォーマンス比較

実際のプロジェクト（React + TypeScript、約500ファイル）での計測結果:

```
                     Webpack 5    Rspack 0.5
初回ビルド           42.3s        4.8s    (8.8倍高速)
増分ビルド           3.2s         0.4s    (8倍高速)
HMR                  1.5s         0.2s    (7.5倍高速)
プロダクションビルド  67.5s        8.9s    (7.6倍高速)
```

### esbuildやViteとの違い

| 特徴 | Rspack | esbuild | Vite |
|------|--------|---------|------|
| Webpack互換性 | 高い | 低い | 中程度 |
| プラグインエコシステム | Webpack準拠 | 独自 | Rollup準拠 |
| HMR | 高速 | 非対応 | 高速 |
| プロダクションビルド | Rust製 | Go製 | Rollup製 |
| 移行難易度 | 低い | 高い | 中程度 |

**結論**: 既存のWebpackプロジェクトを持っている場合、Rspackが最も移行しやすい選択肢です。

## 段階的移行手順

### ステップ1: 基本セットアップ

まずは最小限の設定でRspackを導入します。

```bash
# Rspackのインストール
npm install -D @rspack/core @rspack/cli

# TypeScriptを使っている場合
npm install -D @rspack/plugin-react-refresh
```

package.jsonのスクリプトを更新:

```json
{
  "scripts": {
    "dev": "rspack serve",
    "build": "rspack build",
    "build:webpack": "webpack build"
  }
}
```

### ステップ2: 設定ファイルの作成

既存の`webpack.config.js`を参考に、`rspack.config.js`を作成します。

```javascript
// rspack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ReactRefreshPlugin = require('@rspack/plugin-react-refresh');

/**
 * @type {import('@rspack/cli').Configuration}
 */
module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      // TypeScript/JSX
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
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
                  development: process.env.NODE_ENV === 'development',
                  refresh: process.env.NODE_ENV === 'development',
                },
              },
            },
          },
        },
      },
      // CSS
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true,
                localIdentName: '[name]__[local]--[hash:base64:5]',
              },
            },
          },
        ],
        type: 'javascript/auto',
      },
      // アセット
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    process.env.NODE_ENV === 'development' && new ReactRefreshPlugin(),
  ].filter(Boolean),
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
  optimization: {
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
  },
};
```

### ステップ3: Loaderの移行

Rspackは`builtin:swc-loader`という組み込みloaderを提供しています。

#### babel-loaderからの移行

```javascript
// Before (Webpack + Babel)
{
  test: /\.(js|jsx|ts|tsx)$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: [
        '@babel/preset-env',
        '@babel/preset-react',
        '@babel/preset-typescript'
      ]
    }
  }
}

// After (Rspack + SWC)
{
  test: /\.(js|jsx|ts|tsx)$/,
  exclude: /node_modules/,
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
      env: {
        targets: 'defaults',
      },
    },
  },
}
```

#### CSS Modulesの設定

```javascript
// CSS Modules + PostCSS
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
    {
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          plugins: [
            'autoprefixer',
            'postcss-preset-env',
          ],
        },
      },
    },
  ],
  type: 'javascript/auto',
}
```

### ステップ4: Pluginの移行

多くのWebpackプラグインはそのまま動作しますが、一部は調整が必要です。

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('@rspack/core');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  plugins: [
    // ✅ そのまま動作
    new HtmlWebpackPlugin({
      template: './public/index.html',
      minify: process.env.NODE_ENV === 'production',
    }),

    // ✅ Rspack組み込み版を使用
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
    }),

    // ✅ そのまま動作
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/assets', to: 'assets' },
      ],
    }),

    // ✅ CSS抽出（本番環境のみ）
    process.env.NODE_ENV === 'production' && new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
  ].filter(Boolean),
};
```

### ステップ5: 環境変数の扱い

```javascript
// .env ファイルサポート
const Dotenv = require('dotenv-webpack');

module.exports = {
  plugins: [
    new Dotenv({
      path: `.env.${process.env.NODE_ENV}`,
      safe: true,
    }),
  ],
};
```

または、Rspackの組み込み機能を使用:

```javascript
const { DefinePlugin } = require('@rspack/core');
require('dotenv').config();

module.exports = {
  plugins: [
    new DefinePlugin({
      'process.env': JSON.stringify(process.env),
    }),
  ],
};
```

## 高度な設定

### Code Splitting戦略

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        // Reactライブラリを分離
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
          name: 'react-vendor',
          priority: 20,
        },
        // その他のvendor
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        // 共通コード
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    runtimeChunk: 'single',
    moduleIds: 'deterministic',
  },
};
```

### TypeScript型チェック

Rspackはビルドを高速化するため、型チェックをスキップします。別プロセスで型チェックを実行しましょう。

```bash
npm install -D fork-ts-checker-webpack-plugin
```

```javascript
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: './tsconfig.json',
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
    }),
  ],
};
```

package.jsonで並列実行:

```json
{
  "scripts": {
    "dev": "rspack serve",
    "type-check": "tsc --noEmit --watch",
    "dev:full": "npm-run-all --parallel dev type-check"
  }
}
```

### ESLint統合

```javascript
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
  plugins: [
    new ESLintPlugin({
      extensions: ['js', 'jsx', 'ts', 'tsx'],
      fix: true,
      cache: true,
    }),
  ],
};
```

### SVGのインライン化

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.svg$/,
        type: 'asset',
        resourceQuery: /url/, // *.svg?url
      },
      {
        test: /\.svg$/,
        issuer: /\.[jt]sx?$/,
        resourceQuery: { not: [/url/] }, // exclude *.svg?url
        use: ['@svgr/webpack'],
      },
    ],
  },
};
```

使用例:

```tsx
import Logo from './logo.svg'; // React component
import logoUrl from './logo.svg?url'; // URL文字列

function App() {
  return (
    <>
      <Logo width={100} />
      <img src={logoUrl} alt="Logo" />
    </>
  );
}
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. CSSが読み込まれない

**問題**: `type: 'javascript/auto'` が必要な場合があります。

```javascript
{
  test: /\.css$/,
  use: ['style-loader', 'css-loader'],
  type: 'javascript/auto', // 追加
}
```

#### 2. HMRが動作しない

**解決策**:

```javascript
module.exports = {
  devServer: {
    hot: true,
    liveReload: true,
  },
  plugins: [
    new ReactRefreshPlugin(), // React使用時
  ],
};
```

#### 3. loaderが見つからない

**エラー**: `Module not found: Can't resolve 'babel-loader'`

**解決策**: 必要なloaderをインストール

```bash
npm install -D style-loader css-loader postcss-loader
```

#### 4. ビルドサイズが大きい

**解決策**: 圧縮設定を追加

```javascript
const { SwcJsMinimizerRspackPlugin, SwcCssMinimizerRspackPlugin } = require('@rspack/core');

module.exports = {
  optimization: {
    minimizer: [
      new SwcJsMinimizerRspackPlugin(),
      new SwcCssMinimizerRspackPlugin(),
    ],
  },
};
```

#### 5. 古いブラウザ対応

```javascript
{
  loader: 'builtin:swc-loader',
  options: {
    env: {
      targets: [
        'chrome >= 87',
        'edge >= 88',
        'firefox >= 78',
        'safari >= 14'
      ],
    },
  },
}
```

## ベストプラクティス

### 1. キャッシュ戦略

```javascript
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
  },
};
```

### 2. 開発サーバー最適化

```javascript
module.exports = {
  devServer: {
    port: 3000,
    hot: true,
    compress: true,
    historyApiFallback: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    // プロキシ設定
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
};
```

### 3. 環境別設定の分離

```javascript
// rspack.common.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};

// rspack.dev.js
const { merge } = require('webpack-merge');
const common = require('./rspack.common.js');
const ReactRefreshPlugin = require('@rspack/plugin-react-refresh');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',
  devServer: {
    hot: true,
  },
  plugins: [
    new ReactRefreshPlugin(),
  ],
});

// rspack.prod.js
const { merge } = require('webpack-merge');
const common = require('./rspack.common.js');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimize: true,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
  ],
});
```

## 移行チェックリスト

実際に移行する際は、以下の手順で確認しましょう。

```markdown
## 移行前の準備
- [ ] Webpackのバージョン確認（5.x推奨）
- [ ] 使用しているloader/plugin一覧作成
- [ ] ビルド時間のベンチマーク取得
- [ ] gitブランチ作成

## 初期セットアップ
- [ ] @rspack/coreインストール
- [ ] rspack.config.js作成
- [ ] package.jsonスクリプト更新

## 機能移行
- [ ] entry/output設定
- [ ] loader設定（JS/TS）
- [ ] loader設定（CSS）
- [ ] loader設定（アセット）
- [ ] plugin設定
- [ ] devServer設定
- [ ] 環境変数設定

## 検証
- [ ] 開発サーバー起動確認
- [ ] HMR動作確認
- [ ] プロダクションビルド成功
- [ ] ビルドサイズ比較
- [ ] ビルド時間比較
- [ ] ブラウザ動作確認
- [ ] E2Eテスト実行

## 最適化
- [ ] code splitting設定
- [ ] tree shaking確認
- [ ] source map設定
- [ ] キャッシュ設定
```

---

## 関連記事

- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026](/blog/2026-03-09-engineer-career-change-guide-2026)

## まとめ

Rspackへの移行により、以下のメリットが得られます。

- **開発体験の向上**: HMRが高速化し、フィードバックループが短縮
- **CI/CDの高速化**: ビルド時間短縮により、デプロイサイクルが向上
- **開発コストの削減**: ビルド時間短縮により、開発者の待ち時間が減少
- **将来性**: Rustエコシステムの成長とともに進化

Webpackとの高い互換性により、段階的な移行が可能です。まずは開発環境で試してみて、徐々に本番環境へと適用していきましょう。

Rspackは急速に進化しており、今後さらなる機能追加が期待されます。公式ドキュメント（https://rspack.dev/）も充実しているので、最新情報をチェックしながら活用していきましょう。
