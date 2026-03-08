---
title: "OXC: Rust製JavaScript/TypeScriptツールチェーンの全貌【2026年最新】"
description: "Rust製の超高速JavaScript/TypeScriptツールチェーンOXCの完全ガイド。ESLintの100倍高速なlinterとparser、既存プロジェクトへの導入方法、Biomeとの比較まで徹底解説。開発効率を上げるヒントが満載です。"
pubDate: "2026-02-05"
tags: ['Rust', 'JavaScript', 'TypeScript', 'OXC', 'Linter', 'tooling']
heroImage: '../../assets/thumbnails/oxc-rust-javascript-toolchain.jpg'
---
## OXCとは

OXC（The JavaScript Oxidation Compiler）は、Rust製の超高速JavaScript/TypeScriptツールチェインです。ESLintやBabelといった既存のJavaScriptツールをRustで再実装することで、圧倒的なパフォーマンスを実現しています。

2026年現在、フロントエンド開発の現場で急速に普及しつつあり、特に大規模プロジェクトでのビルド時間短縮に貢献しています。

### OXCが提供する主要コンポーネント

- **oxlint**: ESLint互換のlinter（100倍以上高速）
- **oxc_parser**: JavaScript/TypeScriptパーサー
- **oxc_transformer**: Babel互換のコード変換
- **oxc_resolver**: モジュール解決
- **oxc_minifier**: コード圧縮

## なぜOXCが必要なのか

従来のJavaScriptツールチェインは、JavaScript自身で書かれているため、パフォーマンスに限界がありました。特に以下のような課題がありました。

- ESLintの実行に数十秒〜数分かかる大規模プロジェクト
- Babelの変換処理によるビルド時間の増大
- CI/CDパイプラインでのツール実行時間のボトルネック

OXCはこれらの問題を、Rustの高速性とメモリ効率の良さで解決します。

## セットアップ方法

### インストール

npmまたはpnpm、bunなどのパッケージマネージャーでインストールできます。

```bash
# npm
npm install -D oxlint

# pnpm
pnpm add -D oxlint

# bun
bun add -d oxlint
```

### 基本的な使い方

```bash
# 単純な実行
npx oxlint .

# 特定のディレクトリを対象
npx oxlint src/

# 修正可能な問題を自動修正
npx oxlint --fix .
```

### 設定ファイルの作成

OXCは `.oxlintrc.json` で設定をカスタマイズできます。

```json
{
  "rules": {
    "no-unused-vars": "error",
    "no-console": "warn",
    "eqeqeq": "error"
  },
  "env": {
    "browser": true,
    "es2024": true,
    "node": true
  },
  "ignorePatterns": ["dist", "node_modules", "*.config.js"]
}
```

## 既存プロジェクトへの導入

### ESLintからの移行

既存のESLint設定の多くはOXCと互換性がありますが、完全な移行には以下のステップを推奨します。

1. **並行運用期間を設ける**

```json
{
  "scripts": {
    "lint:eslint": "eslint .",
    "lint:oxlint": "oxlint .",
    "lint": "npm run lint:oxlint && npm run lint:eslint"
  }
}
```

2. **カバレッジの確認**

OXCは現在200以上のESLintルールに対応していますが、一部のプラグインルールは未対応です。

```bash
# 現在のESLintルール使用状況を確認
npx eslint --print-config src/index.ts > eslint-config.json

# OXCでサポートされているか確認
npx oxlint --print-rules
```

3. **段階的な置き換え**

```json
{
  "scripts": {
    "lint": "oxlint src/",
    "lint:full": "eslint src/ --rule 'import/no-cycle: error'"
  }
}
```

### TypeScriptプロジェクトでの活用

OXCはTypeScriptを完全にサポートしており、型情報を使った高度なlintも可能です。

```bash
# TypeScriptファイルを直接lint
npx oxlint src/**/*.ts src/**/*.tsx
```

### CI/CDへの組み込み

GitHub Actionsの例:

```yaml
name: Lint
on: [push, pull_request]

jobs:
  oxlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx oxlint .
```

実行時間の比較（10万行規模のプロジェクト）:
- ESLint: 約45秒
- OXLint: 約0.4秒（約112倍高速）

## Biomeとの比較

BiomeもRust製のツールチェインですが、OXCとは異なるアプローチを取っています。

### OXCの強み

- ESLintとの互換性を重視
- 既存プロジェクトへの導入が容易
- パーサー、transformer、resolverを個別に利用可能
- より細かい設定が可能

### Biomeの強み

- formatter機能が統合されている
- より統一されたツールチェイン体験
- 設定ファイルがシンプル

### 選択基準

```typescript
// 既存のESLint設定を活かしたい → OXC
// ゼロから始める新規プロジェクト → Biome or OXC
// formatter + linterを統合したい → Biome
// 個別のツールを組み合わせたい → OXC
```

## 実践的な活用例

### Viteプロジェクトでの利用

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { oxlintPlugin } from 'vite-plugin-oxlint';

export default defineConfig({
  plugins: [
    oxlintPlugin({
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      cache: true,
    }),
  ],
});
```

### pre-commit hookとの連携

```bash
# .husky/pre-commit
#!/bin/sh
bunx oxlint --fix $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')
```

### モノレポでの活用

```json
{
  "scripts": {
    "lint": "turbo run lint",
    "lint:packages": "oxlint packages/*/src"
  }
}
```

## パフォーマンスチューニング

### キャッシュの活用

OXCは自動的にキャッシュを利用しますが、明示的な設定も可能です。

```bash
# キャッシュを有効化（デフォルト）
oxlint --cache .

# キャッシュをクリア
oxlint --cache --cache-strategy content .
```

### 並列実行の最適化

OXCは自動的に複数コアを活用しますが、環境によっては調整が必要です。

```bash
# スレッド数を指定
oxlint --max-threads 4 .
```

## まとめ

OXCは、JavaScript/TypeScriptツールチェインの未来を示す重要なプロジェクトです。特に大規模プロジェクトや、CI/CDパイプラインの高速化を求める場合には、導入を強く推奨します。

2026年現在、まだ発展途上の部分もありますが、コミュニティの成長速度とコードの品質を考えると、今後さらに普及していくことは間違いありません。

まずは小規模なプロジェクトで試し、効果を実感してから本格導入するのが良いでしょう。
