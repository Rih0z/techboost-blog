---
title: "Lightning CSSで高速CSSビルドパイプラインを構築"
description: "Lightning CSS（旧Parcel CSS）を使った高速CSSビルドパイプラインの構築方法を解説。PostCSSとの比較、CSS Modules対応、ブラウザターゲット設定、Vite連携まで実践的な設定例付きで紹介します。"
pubDate: "2026-03-09"
tags: ["CSS", "パフォーマンス", "ツール", "フロントエンド"]
heroImage: "../../assets/blog-placeholder-5.jpg"
---

## はじめに

Lightning CSSは、Parcelチームが開発したRust製の高速CSSパーサー・トランスフォーマー・ミニファイアである。旧名「Parcel CSS」として知られていたが、2022年にスタンドアロンツールとしてリブランドされた。PostCSS + autoprefixer + cssnanoの組み合わせと比較して、数十倍から百倍以上のパフォーマンスを実現する。

2026年現在、Lightning CSSはVite・Astro・Next.jsなど主要なビルドツールで採用が進み、CSSビルドパイプラインの事実上の標準になりつつある。本記事では、Lightning CSSの導入方法から実践的な設定、既存のPostCSS環境からの移行方法までを体系的に解説する。

### 対象読者

- CSSビルドパイプラインの最適化に関心のあるフロントエンドエンジニア
- PostCSSからの移行を検討しているプロジェクトの技術リーダー
- CSS ModulesやネスティングなどモダンCSS機能を活用したい開発者

## Lightning CSSとは何か

Lightning CSSは以下の機能を1つのツールで提供する。

| 機能 | 説明 | PostCSS相当 |
|------|------|-------------|
| パース | CSSの構文解析 | postcss本体 |
| ベンダープレフィックス | 自動付与・除去 | autoprefixer |
| 構文変換 | ネスティング、カスタムメディアクエリ等 | postcss-nesting, postcss-custom-media |
| CSS Modules | クラス名のスコープ化 | postcss-modules |
| ミニファイ | 圧縮・最適化 | cssnano |
| バンドリング | `@import`の解決・結合 | postcss-import |
| ブラウザターゲット | 対象ブラウザに応じた変換 | browserslist + autoprefixer |

これらすべてがRustで実装されており、JavaScriptベースのPostCSSプラグインチェーンと比較して桁違いのパフォーマンスを発揮する。

### パフォーマンスベンチマーク

以下は100KBのCSSファイルを処理した場合の比較データである（Lightning CSS公式ベンチマークおよびコミュニティ計測を基にした参考値）。

| ツールチェーン | 処理時間 | 倍率 |
|--------------|---------|------|
| PostCSS + autoprefixer + cssnano | ~500ms | 1x（基準） |
| esbuild CSS | ~15ms | 約33x |
| Lightning CSS | ~5ms | 約100x |

この差は、ファイル数が増えるほど顕著になる。数百ファイルのCSS Modulesを持つ大規模プロジェクトでは、ビルド時間が数十秒から数百ミリ秒に短縮されることもある。

## インストールと基本的な使い方

### npmパッケージのインストール

```bash
# プロジェクトへのインストール
npm install lightningcss lightningcss-cli --save-dev

# グローバルインストール（CLI利用のみ）
npm install -g lightningcss-cli
```

### CLI基本操作

最も基本的な使い方はCLIからのファイル変換である。

```bash
# 基本的な変換
npx lightningcss --minify --bundle input.css -o output.css

# ブラウザターゲットを指定して変換
npx lightningcss --minify --bundle \
  --targets '>= 0.25%' \
  input.css -o output.css

# CSS Modulesとして処理
npx lightningcss --minify --bundle \
  --css-modules \
  input.css -o output.css

# ソースマップ付き
npx lightningcss --minify --bundle \
  --source-map \
  input.css -o output.css
```

### Node.js APIでの利用

プログラマティックに使用する場合は、Node.js APIを利用する。

```javascript
import { transform, bundle } from 'lightningcss';
import { readFileSync } from 'fs';

// 単一ファイルの変換
const result = transform({
  filename: 'style.css',
  code: readFileSync('style.css'),
  minify: true,
  targets: {
    chrome: (110 << 16),   // Chrome 110
    firefox: (115 << 16),  // Firefox 115
    safari: (16 << 16) | (4 << 8),  // Safari 16.4
  },
  drafts: {
    customMedia: true,
  },
});

console.log(result.code.toString());

// バンドル（@importの解決含む）
const bundled = bundle({
  filename: 'src/styles/main.css',
  minify: true,
  targets: {
    chrome: (110 << 16),
    firefox: (115 << 16),
    safari: (16 << 16) | (4 << 8),
  },
});

console.log(bundled.code.toString());
```

`targets`のバージョンはビット演算で指定する。`(major << 16) | (minor << 8) | patch`という形式で、Chrome 110は`110 << 16`、Safari 16.4は`(16 << 16) | (4 << 8)`となる。

## ブラウザターゲット設定

Lightning CSSの最大の特徴の1つが、ブラウザターゲットに基づく自動変換である。ターゲットブラウザが対応していないCSS機能は、自動的にフォールバックコードに変換される。

### ターゲット指定方法

```javascript
// Node.js APIでの指定
const targets = {
  chrome: (110 << 16),
  firefox: (115 << 16),
  safari: (16 << 16) | (4 << 8),
  edge: (110 << 16),
  ios_saf: (16 << 16) | (4 << 8),
  android: (110 << 16),
};
```

CLIでは`browserslist`クエリを直接使用できる。

```bash
npx lightningcss --targets '>= 0.25%' input.css -o output.css
npx lightningcss --targets 'last 2 versions' input.css -o output.css
npx lightningcss --targets 'defaults' input.css -o output.css
```

### 自動変換の例

入力CSS（モダン構文）を書くと、ターゲットに応じてLightning CSSが自動変換する。

入力:
```css
/* oklch色空間 */
.card {
  background-color: oklch(0.7 0.15 200);
  color: oklch(0.3 0.05 200);
}

/* color-mix関数 */
.hover-card {
  background-color: color-mix(in oklch, var(--primary) 80%, white);
}

/* CSSネスティング */
.nav {
  display: flex;
  gap: 1rem;

  & a {
    color: inherit;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  & .active {
    font-weight: bold;
  }
}
```

古いブラウザをターゲットに含めた場合の出力:
```css
.card {
  background-color: #1a9caa;
  background-color: oklch(.7 .15 200);
  color: #2d4a4e;
  color: oklch(.3 .05 200);
}

.nav {
  display: flex;
  gap: 1rem;
}

.nav a {
  color: inherit;
  text-decoration: none;
}

.nav a:hover {
  text-decoration: underline;
}

.nav .active {
  font-weight: bold;
}
```

oklch非対応ブラウザに対してRGBフォールバックが自動生成され、ネスティングは展開される。対応ブラウザのみをターゲットにしている場合は、元のコードがそのまま出力される。

## CSS Modules対応

Lightning CSSはCSS Modulesをネイティブサポートしている。PostCSS + postcss-modulesの組み合わせと比較して、設定が簡潔で処理速度も大幅に向上する。

### 基本的なCSS Modules

```css
/* components/Button.module.css */
.root {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, box-shadow 0.2s;
}

.primary {
  composes: root;
  background-color: var(--color-primary);
  color: white;
}

.primary:hover {
  background-color: var(--color-primary-dark);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.secondary {
  composes: root;
  background-color: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.icon {
  margin-right: 0.5rem;
  width: 1.25rem;
  height: 1.25rem;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Node.js APIでCSS Modulesを処理

```javascript
import { bundle } from 'lightningcss';

const result = bundle({
  filename: 'components/Button.module.css',
  minify: true,
  cssModules: true,
  targets: {
    chrome: (110 << 16),
  },
});

// 変換後のCSS
console.log(result.code.toString());

// クラス名のマッピング
// { root: { name: 'Button_root_a1b2c3', composes: [] }, ... }
console.log(result.exports);
```

### CSS Modulesの設定オプション

```javascript
const result = bundle({
  filename: 'style.module.css',
  cssModules: {
    // クラス名のパターン
    pattern: '[name]_[local]_[hash]',
    // ハッシュのアルゴリズムをカスタマイズ可能
    // dashedIdents: true にするとCSS変数もスコープ化
    dashedIdents: true,
  },
  minify: true,
});
```

`dashedIdents: true`を設定すると、`--color-primary`のようなCSS Custom Propertiesもモジュールスコープに含まれる。コンポーネント間のスタイル干渉を完全に防ぐことができる。

## CSSネスティングとモダン構文サポート

Lightning CSSは最新のCSS仕様をネイティブにサポートする。ターゲットブラウザに応じて自動的にフォールバックコードを生成するため、開発時は最新の構文で記述できる。

### ネスティング

```css
/* モダンなCSS Nesting */
.card {
  padding: 1.5rem;
  border-radius: 0.75rem;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  & .header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;

    & h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
    }

    & .badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: oklch(0.9 0.05 200);
    }
  }

  & .body {
    line-height: 1.6;
    color: oklch(0.4 0.02 250);
  }

  & .footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid oklch(0.9 0 0);
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  /* メディアクエリのネスティング */
  @media (max-width: 640px) {
    padding: 1rem;

    & .header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
}
```

### カスタムメディアクエリ

```css
/* カスタムメディアクエリの定義 */
@custom-media --mobile (max-width: 640px);
@custom-media --tablet (min-width: 641px) and (max-width: 1024px);
@custom-media --desktop (min-width: 1025px);
@custom-media --dark-mode (prefers-color-scheme: dark);
@custom-media --reduced-motion (prefers-reduced-motion: reduce);

.layout {
  display: grid;
  gap: 1.5rem;

  @media (--mobile) {
    grid-template-columns: 1fr;
  }

  @media (--tablet) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (--desktop) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.animation-element {
  transition: transform 0.3s ease;

  @media (--reduced-motion) {
    transition: none;
  }
}
```

カスタムメディアクエリを使用するには、`drafts.customMedia`を有効にする必要がある。

```javascript
const result = transform({
  filename: 'style.css',
  code: Buffer.from(css),
  drafts: {
    customMedia: true,
  },
});
```

### カラー関数

Lightning CSSはモダンなCSS Color Level 4/5の関数をサポートする。

```css
:root {
  /* oklch色空間でデザイントークンを定義 */
  --primary-hue: 250;
  --primary: oklch(0.55 0.2 var(--primary-hue));
  --primary-light: oklch(0.75 0.15 var(--primary-hue));
  --primary-dark: oklch(0.35 0.2 var(--primary-hue));

  /* P3広色域 */
  --accent: color(display-p3 0.2 0.8 0.4);

  /* color-mix */
  --primary-hover: color-mix(in oklch, var(--primary) 85%, black);
  --primary-subtle: color-mix(in oklch, var(--primary) 10%, white);
}

/* ライト/ダーク自動切替 */
.surface {
  background: light-dark(white, oklch(0.2 0.02 250));
  color: light-dark(oklch(0.2 0.02 250), oklch(0.9 0.02 250));
}
```

## Viteとの連携

ViteはLightning CSSをビルトインでサポートしている。設定は非常にシンプルである。

### Vite設定

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      // ブラウザターゲット
      targets: {
        chrome: (110 << 16),
        firefox: (115 << 16),
        safari: (16 << 16) | (4 << 8),
      },
      // CSS Modulesの設定
      cssModules: {
        pattern: '[name]_[local]_[hash]',
        dashedIdents: true,
      },
      // ドラフト機能
      drafts: {
        customMedia: true,
      },
    },
  },
  build: {
    cssMinify: 'lightningcss',
  },
});
```

### browserslistとの連携

`browserslist`設定を直接使用する場合は、`browserslist`パッケージと`lightningcss`のヘルパーを組み合わせる。

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';

const targets = browserslistToTargets(
  browserslist('defaults')
);

export default defineConfig({
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets,
    },
  },
  build: {
    cssMinify: 'lightningcss',
  },
});
```

### ReactコンポーネントでのCSS Modules利用

```jsx
// components/Card.jsx
import styles from './Card.module.css';

export function Card({ title, children, variant = 'default' }) {
  const cardClass = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
```

```css
/* components/Card.module.css */
.card {
  padding: 1.5rem;
  border-radius: 0.75rem;
  background: var(--surface);
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
}

.elevated {
  composes: card;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -2px rgba(0, 0, 0, 0.1);

  &:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
                0 4px 6px -4px rgba(0, 0, 0, 0.1);
  }
}

.outlined {
  composes: card;
  border: 1px solid var(--border-color);
  box-shadow: none;
}

.title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  line-height: 1.4;
}

.content {
  color: var(--text-secondary);
  line-height: 1.6;
}
```

## Webpack連携

既存のWebpackプロジェクトでLightning CSSを使用する場合は、専用のloaderを導入する。

### 設定例

```bash
npm install lightningcss lightningcss-loader --save-dev
```

```javascript
// webpack.config.js
const browserslist = require('browserslist');
const { browserslistToTargets } = require('lightningcss');

module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: 'lightningcss-loader',
            options: {
              targets: browserslistToTargets(
                browserslist('defaults')
              ),
              drafts: {
                customMedia: true,
              },
            },
          },
        ],
      },
      // CSS Modules用の設定
      {
        test: /\.module\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: true,
            },
          },
          {
            loader: 'lightningcss-loader',
            options: {
              targets: browserslistToTargets(
                browserslist('defaults')
              ),
              cssModules: true,
            },
          },
        ],
      },
    ],
  },
};
```

## PostCSSからの移行ガイド

既存のPostCSS環境からLightning CSSへの移行は段階的に行うことを推奨する。

### 移行チェックリスト

| PostCSSプラグイン | Lightning CSS対応 | 移行方法 |
|------------------|------------------|---------|
| autoprefixer | 組み込み | `targets`設定で自動対応 |
| postcss-nesting | 組み込み | 変更不要（CSS標準構文で記述） |
| postcss-custom-media | 組み込み | `drafts.customMedia: true` |
| cssnano | 組み込み | `minify: true` |
| postcss-import | 組み込み（bundle使用時） | `bundle()`関数を使用 |
| postcss-modules | 組み込み | `cssModules: true` |
| postcss-preset-env | 部分対応 | 個別機能ごとに確認が必要 |
| postcss-mixins | 非対応 | CSS標準機能で代替 |
| tailwindcss | 非対応 | PostCSSと併用が必要 |

### 移行手順

#### Step 1: 並行稼働

まずLightning CSSを追加インストールし、PostCSSと並行して動作確認する。

```bash
npm install lightningcss --save-dev
```

#### Step 2: 互換性確認スクリプトの作成

```javascript
// scripts/check-css-compat.mjs
import { transform } from 'lightningcss';
import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

function checkFile(filePath) {
  try {
    const code = readFileSync(filePath);
    const result = transform({
      filename: filePath,
      code,
      minify: false,
      targets: {
        chrome: (110 << 16),
        firefox: (115 << 16),
        safari: (16 << 16) | (4 << 8),
      },
    });
    console.log(`OK: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`NG: ${filePath}`);
    console.error(`   ${error.message}`);
    return false;
  }
}

function scanDirectory(dir) {
  const files = readdirSync(dir, { withFileTypes: true });
  let okCount = 0;
  let ngCount = 0;

  for (const file of files) {
    const fullPath = join(dir, file.name);
    if (file.isDirectory()) {
      const result = scanDirectory(fullPath);
      okCount += result.ok;
      ngCount += result.ng;
    } else if (extname(file.name) === '.css') {
      if (checkFile(fullPath)) {
        okCount++;
      } else {
        ngCount++;
      }
    }
  }

  return { ok: okCount, ng: ngCount };
}

const result = scanDirectory('src');
console.log(`\n合計: ${result.ok} OK, ${result.ng} NG`);
```

#### Step 3: PostCSS設定の削除

互換性確認が完了したら、PostCSS関連パッケージを削除する。

```bash
npm uninstall postcss autoprefixer cssnano postcss-nesting postcss-import postcss-custom-media
rm postcss.config.js
```

#### Step 4: ビルドツール設定の更新

Viteの場合は`css.transformer: 'lightningcss'`を設定するだけで移行完了である。

### 注意点: Tailwind CSSとの併用

Tailwind CSSはPostCSSプラグインとして動作するため、Lightning CSSに完全移行はできない。ただし、以下の構成でミニファイとベンダープレフィックスのみLightning CSSに担当させることは可能である。

```javascript
// vite.config.js - Tailwind CSS + Lightning CSS併用
export default defineConfig({
  css: {
    // PostCSSでTailwindを処理
    postcss: {
      plugins: [
        tailwindcss(),
        // autoprefixerは不要（Lightning CSSが処理）
      ],
    },
  },
  build: {
    // ミニファイのみLightning CSS
    cssMinify: 'lightningcss',
  },
});
```

## パフォーマンス最適化のベストプラクティス

### バンドルサイズの最小化

```javascript
import { bundle } from 'lightningcss';

const result = bundle({
  filename: 'src/styles/main.css',
  minify: true,
  targets: {
    chrome: (110 << 16),
    firefox: (115 << 16),
    safari: (16 << 16) | (4 << 8),
  },
  // 未使用のCSSを除去しない（Lightning CSS単体では不可）
  // → PurgeCSSやTailwindのpurge機能と組み合わせる
});

// 出力サイズの確認
const outputSize = result.code.length;
const gzipSize = Buffer.byteLength(
  require('zlib').gzipSync(result.code)
);
console.log(`出力: ${outputSize} bytes`);
console.log(`gzip: ${gzipSize} bytes`);
```

### ソースマップの活用

開発時はソースマップを有効にし、本番ビルドでは無効にする。

```javascript
const isDev = process.env.NODE_ENV !== 'production';

const result = transform({
  filename: 'style.css',
  code: readFileSync('style.css'),
  minify: !isDev,
  sourceMap: isDev,
  targets: {
    chrome: (110 << 16),
  },
});

if (isDev && result.map) {
  // ソースマップを別ファイルに出力
  writeFileSync('output.css.map', result.map);
}
```

### キャッシュ戦略

Lightning CSSは処理が高速であるため、キャッシュの必要性はPostCSSほど高くない。しかし、CI/CD環境では以下のように出力ハッシュを利用したキャッシュバスティングが有効である。

```javascript
import { createHash } from 'crypto';

const result = bundle({
  filename: 'src/styles/main.css',
  minify: true,
});

const hash = createHash('md5')
  .update(result.code)
  .digest('hex')
  .slice(0, 8);

writeFileSync(`dist/styles.${hash}.css`, result.code);
```

## Astro連携

AstroはLightning CSSをビルトインでサポートしている。

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  vite: {
    css: {
      transformer: 'lightningcss',
      lightningcss: {
        targets: {
          chrome: (110 << 16),
          firefox: (115 << 16),
          safari: (16 << 16) | (4 << 8),
        },
        drafts: {
          customMedia: true,
        },
      },
    },
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
```

## まとめ

Lightning CSSは、CSSビルドパイプラインにおけるパフォーマンスとシンプルさの両方を実現するツールである。本記事の内容を整理する。

| 項目 | ポイント |
|------|---------|
| パフォーマンス | PostCSS比で約100倍高速 |
| 統合性 | パース・プレフィックス・ミニファイ・バンドルを1ツールで |
| ブラウザターゲット | 指定ブラウザに応じた自動フォールバック生成 |
| CSS Modules | ネイティブサポート、`dashedIdents`でCSS変数もスコープ化 |
| モダンCSS | ネスティング、oklch、color-mix、カスタムメディアクエリ |
| Vite連携 | `css.transformer: 'lightningcss'`で設定完了 |
| PostCSS移行 | 段階的移行可能。Tailwind CSSとの併用も可 |

フロントエンド開発のビルド時間短縮は、開発者体験（DX）に直結する。特に大規模プロジェクトでは、Lightning CSSの導入効果は絶大である。PostCSSから段階的に移行を進め、モダンCSSの恩恵を最大限に活用することを推奨する。
