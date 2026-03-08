---
title: "OxlintでJavaScript/TypeScriptを超高速Lint - ESLintの50〜100倍高速"
description: "Oxlintは、Rustで書かれた超高速なJavaScript/TypeScript Linterです。ESLintの50〜100倍高速で、既存プロジェクトにも簡単に導入できます。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-05"
tags: ['JavaScript', 'TypeScript', 'フロントエンド']
heroImage: '../../assets/thumbnails/oxlint-fast-linter.jpg'
---
フロントエンド開発において、Lintツールは欠かせない存在です。しかし、プロジェクトが大きくなるにつれて、ESLintの実行時間が長くなり、開発体験が悪化することがあります。

**Oxlint**は、Rustで書かれた超高速なLinterで、ESLintの**50〜100倍高速**です。この記事では、Oxlintの特徴から実践的な使い方まで、詳しく解説します。

## Oxlintとは？

[Oxlint](https://oxc-project.github.io/)は、Oxc（Oxidation Compiler）プロジェクトの一部として開発されているJavaScript/TypeScript Linterです。

### 主な特徴

1. **超高速**: ESLintの50〜100倍高速（Rustで実装）
2. **ゼロコンフィグ**: デフォルトで実用的なルールセット
3. **ESLint互換**: 多くのESLintルールをサポート
4. **TypeScript対応**: TypeScript固有のルールもサポート
5. **軽量**: 追加の依存関係なし
6. **インクリメンタル**: 変更されたファイルのみをLint

### なぜOxlintを使うのか？

**ESLintの問題**
- 大規模プロジェクトでは遅い
- プラグインを入れるとさらに遅くなる
- Node.js上で動作（シングルスレッド）
- 設定が複雑

**Oxlintの解決**
- Rustで実装されているため超高速
- デフォルトで実用的なルール
- 並列処理で複数ファイルを同時にLint
- シンプルな設定

### ベンチマーク

公式のベンチマークによると、以下のような結果が出ています。

- **小規模プロジェクト（〜100ファイル）**: 10〜20倍高速
- **中規模プロジェクト（〜1000ファイル）**: 50倍高速
- **大規模プロジェクト（10000ファイル以上）**: 100倍高速

例えば、ESLintで30秒かかるプロジェクトが、Oxlintでは0.3秒で終わります。

## インストール

### npm

```bash
npm install -D oxlint
```

### pnpm

```bash
pnpm add -D oxlint
```

### yarn

```bash
yarn add -D oxlint
```

### Cargo（Rustユーザー向け）

```bash
cargo install oxlint
```

## 基本的な使い方

### ファイルのLint

```bash
# 単一ファイル
npx oxlint src/index.ts

# ディレクトリ全体
npx oxlint src/

# 複数のパス
npx oxlint src/ tests/

# カレントディレクトリ
npx oxlint .
```

### 自動修正

```bash
# 自動修正可能な問題を修正
npx oxlint --fix src/
```

### 出力フォーマット

```bash
# デフォルト（人間が読みやすい形式）
npx oxlint src/

# JSON形式
npx oxlint --format json src/

# Unix形式
npx oxlint --format unix src/

# GitHub Actions形式
npx oxlint --format github src/
```

## ルールの設定

### デフォルトルール

Oxlintは、デフォルトで実用的なルールセットを提供しています。

- ESLintの推奨ルール
- TypeScript ESLintの推奨ルール
- React/JSXのルール
- Importのルール

### ルールの無効化

特定のルールを無効にするには、コメントを使います。

```typescript
// ファイル全体でルールを無効化
/* oxlint-disable no-unused-vars */

function hello() {
  const unused = "I'm not used";
  console.log("Hello");
}

// 次の行だけ無効化
// oxlint-disable-next-line no-console
console.log("Debug message");

// 複数行を無効化
/* oxlint-disable */
console.log("Debug 1");
console.log("Debug 2");
/* oxlint-enable */

// 特定のルールだけ無効化
// oxlint-disable-next-line no-console, no-debugger
console.log("Debug");
```

### 設定ファイル

Oxlintは、`.oxlintrc.json`ファイルで設定をカスタマイズできます。

```json
{
  "rules": {
    "no-console": "warn",
    "no-debugger": "error",
    "no-unused-vars": "error"
  },
  "env": {
    "browser": true,
    "node": true,
    "es2021": true
  },
  "globals": {
    "myGlobal": "readonly"
  }
}
```

### ルールのカテゴリ

```json
{
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "pedantic": "off"
  }
}
```

- **correctness**: 明らかなバグ
- **suspicious**: 怪しいコード
- **pedantic**: 厳格なスタイルチェック

## ESLintとの比較

### 速度

```bash
# ESLint（大規模プロジェクト）
$ time eslint src/
eslint src/  28.34s user 1.23s system 98% cpu 30.125 total

# Oxlint（同じプロジェクト）
$ time oxlint src/
oxlint src/  0.28s user 0.05s system 245% cpu 0.134 total
```

約**224倍高速**！

### ルールのサポート

Oxlintは、ESLintの主要なルールをサポートしています。

**サポート済み**
- `no-unused-vars`
- `no-console`
- `no-debugger`
- `eqeqeq`
- `no-empty`
- `no-constant-condition`
- `no-duplicate-case`
- など多数

**未サポート**
- 一部のスタイル系ルール（Prettierを推奨）
- カスタムプラグイン

### 設定の互換性

Oxlintは、ESLintの設定ファイルをそのまま読み込むことはできませんが、多くのルールは同じ名前で使えます。

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    "no-console": "warn",
    "no-unused-vars": "error"
  }
};
```

```json
// .oxlintrc.json
{
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error"
  }
}
```

## package.jsonスクリプト

```json
{
  "scripts": {
    "lint": "oxlint src/",
    "lint:fix": "oxlint --fix src/",
    "lint:json": "oxlint --format json src/ > lint-results.json"
  }
}
```

## CIでの使用

### GitHub Actions

```yaml
name: Lint

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Run Oxlint
        run: npx oxlint --format github src/
```

### GitLab CI

```yaml
lint:
  image: node:18
  script:
    - npm ci
    - npx oxlint src/
```

## エディタ統合

### VS Code

[Oxlint VS Code拡張機能](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode)をインストールします。

```bash
code --install-extension oxc.oxc-vscode
```

設定:

```json
{
  "oxc.enable": true,
  "oxc.run": "onSave",
  "oxc.trace.server": "messages"
}
```

### Neovim

```lua
-- nvim-lspconfig
require'lspconfig'.oxc.setup{}
```

## ESLintとの併用

OxlintとESLintを併用することもできます。

### 戦略1: Oxlintを先に実行

```json
{
  "scripts": {
    "lint": "oxlint src/ && eslint src/"
  }
}
```

Oxlintで高速に主要なエラーをチェックし、ESLintでより詳細なチェックを行います。

### 戦略2: 用途を分ける

```json
{
  "scripts": {
    "lint:fast": "oxlint src/",
    "lint:full": "eslint src/",
    "lint": "npm run lint:fast"
  }
}
```

通常の開発ではOxlintを使い、CIではESLintも実行します。

### 戦略3: Oxlintに移行

```json
{
  "scripts": {
    "lint": "oxlint src/",
    "lint:legacy": "eslint src/"
  }
}
```

徐々にOxlintに移行していきます。

## 実践例

### Next.jsプロジェクト

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "oxlint . && next build",
    "lint": "oxlint .",
    "lint:fix": "oxlint --fix ."
  }
}
```

### Reactプロジェクト

```json
{
  "scripts": {
    "dev": "vite",
    "build": "oxlint src/ && tsc && vite build",
    "lint": "oxlint src/",
    "format": "prettier --write src/"
  }
}
```

### モノレポ

```json
{
  "scripts": {
    "lint": "oxlint packages/*/src/",
    "lint:app": "oxlint apps/*/src/",
    "lint:all": "npm run lint && npm run lint:app"
  }
}
```

## Prettierとの組み合わせ

Oxlintはフォーマットに関するルールを含まないため、Prettierと組み合わせるのが推奨されます。

```json
{
  "scripts": {
    "lint": "oxlint src/",
    "format": "prettier --write src/",
    "check": "npm run lint && npm run format -- --check"
  }
}
```

## パフォーマンス最適化

### 並列実行

Oxlintは自動的に並列実行しますが、CPUコア数を指定することもできます。

```bash
# 4コアで実行
oxlint --threads 4 src/

# すべてのコアを使用（デフォルト）
oxlint src/
```

### キャッシュ

Oxlintは、デフォルトでキャッシュを使用します。

```bash
# キャッシュをクリア
rm -rf .oxlint-cache/
```

### 除外設定

`.oxlintignore`ファイルで、Lintから除外するファイルを指定できます。

```
# .oxlintignore
node_modules/
dist/
build/
*.min.js
*.config.js
```

## 移行ガイド

### ESLintからの移行

1. **Oxlintをインストール**
   ```bash
   npm install -D oxlint
   ```

2. **package.jsonスクリプトを更新**
   ```json
   {
     "scripts": {
       "lint": "oxlint src/"
     }
   }
   ```

3. **テスト実行**
   ```bash
   npm run lint
   ```

4. **設定をカスタマイズ**
   必要に応じて`.oxlintrc.json`を作成

5. **ESLintを削除（オプション）**
   ```bash
   npm uninstall eslint
   ```

### 段階的な移行

```json
{
  "scripts": {
    "lint:new": "oxlint src/",
    "lint:old": "eslint src/",
    "lint": "npm run lint:new || npm run lint:old"
  }
}
```

## トラブルシューティング

### ルールが見つからない

OxlintはすべてのESLintルールをサポートしているわけではありません。

```bash
# サポートされているルールを確認
npx oxlint --help
```

### TypeScriptのパースエラー

Oxlintは、最新のTypeScript構文をサポートしています。古いバージョンの場合はアップデートしてください。

```bash
npm update oxlint
```

### パフォーマンスが改善しない

- `.oxlintignore`で不要なファイルを除外
- `node_modules`がLint対象に含まれていないか確認

## まとめ

Oxlintは、ESLintの50〜100倍高速な次世代Linterです。

**メリット**

- 超高速（Rustで実装）
- ゼロコンフィグで使える
- ESLint互換のルール
- 軽量（追加の依存関係なし）
- エディタ統合

**使い所**

- 大規模プロジェクト
- CIでの高速チェック
- 開発中のリアルタイムLint
- モノレポ

**注意点**

- すべてのESLintルールをサポートしているわけではない
- カスタムプラグインは使えない
- まだ開発中（活発に更新中）

**導入手順**

1. `npm install -D oxlint`
2. `package.json`のlintスクリプトを更新
3. 必要に応じて`.oxlintrc.json`を作成

Oxlintは、開発体験を大きく向上させるツールです。特に大規模プロジェクトでは、その効果を実感できるでしょう。ぜひ、あなたのプロジェクトでも試してみてください。