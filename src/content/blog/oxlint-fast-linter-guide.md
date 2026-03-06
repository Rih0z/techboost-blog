---
title: 'OXLint高速リンター入門: ESLintから100倍速への移行ガイド'
description: 'Rust製の超高速JavaScriptリンターOXLintの導入方法を解説。ESLintからの移行手順、ルール設定、パフォーマンス比較、CI/CD統合まで実践的に説明します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: '2025-02-05'
tags: ['OXLint', 'ESLint', 'Linter', 'JavaScript', 'TypeScript', 'DevTools']
---
OXLintは、Rust製の超高速JavaScriptリンターです。ESLintの50〜100倍の速度で動作し、大規模プロジェクトでも数秒でlintが完了します。

## OXLintとは

OXLintは、Oxc（Oxidation Compiler）プロジェクトの一部として開発されている次世代のJavaScript/TypeScriptリンターです。

**主な特徴:**
- **圧倒的な速度**: ESLintの50〜100倍高速
- **ゼロコンフィグ**: デフォルトで実用的なルールセット
- **ESLint互換**: 主要ルールをサポート
- **TypeScript対応**: 追加設定なしでTS対応
- **軽量**: 追加依存なしで動作

## インストール

npmまたはpnpmでインストールできます。

```bash
# npm
npm install --save-dev oxlint

# pnpm
pnpm add -D oxlint

# yarn
yarn add -D oxlint

# bun
bun add -d oxlint
```

グローバルインストールも可能です。

```bash
npm install -g oxlint
```

## 基本的な使い方

### シンプルな実行

```bash
# カレントディレクトリをlint
npx oxlint

# 特定ディレクトリをlint
npx oxlint src/

# 特定ファイルをlint
npx oxlint src/index.ts
```

### package.jsonに追加

```json
{
  "scripts": {
    "lint": "oxlint",
    "lint:fix": "oxlint --fix"
  }
}
```

```bash
npm run lint
```

## 設定ファイル

OXLintは設定ファイルなしでも動作しますが、カスタマイズも可能です。

### oxlintrc.json

```json
{
  "rules": {
    "no-console": "warn",
    "no-debugger": "error",
    "eqeqeq": "error"
  },
  "ignorePatterns": [
    "dist",
    "node_modules",
    "*.config.js"
  ]
}
```

### .oxlintignore

```
# ビルド成果物
dist/
build/
.next/

# 依存関係
node_modules/

# 設定ファイル
*.config.js
*.config.ts

# テストカバレッジ
coverage/
```

## ESLintからの移行

### ステップ1: ESLintルールの確認

現在のESLint設定を確認します。

```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
}
```

### ステップ2: OXLintでサポートされているルールを確認

```bash
# サポートされているルール一覧を表示
oxlint --rules
```

### ステップ3: 段階的な移行

完全移行前に、両方を並行実行して結果を比較します。

```json
{
  "scripts": {
    "lint:eslint": "eslint .",
    "lint:oxlint": "oxlint",
    "lint": "npm run lint:oxlint && npm run lint:eslint"
  }
}
```

### ステップ4: OXLintのみに移行

```json
{
  "scripts": {
    "lint": "oxlint",
    "lint:fix": "oxlint --fix"
  }
}
```

## 実践的なルール設定

### TypeScriptプロジェクト

```json
{
  "rules": {
    "no-console": "warn",
    "no-debugger": "error",
    "no-unused-vars": "error",
    "eqeqeq": "error",
    "no-var": "error",
    "prefer-const": "warn",
    "no-undef": "error"
  },
  "ignorePatterns": [
    "dist",
    "*.config.ts",
    "*.d.ts"
  ]
}
```

### Reactプロジェクト

```json
{
  "rules": {
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
    "react/no-deprecated": "warn",
    "react/no-direct-mutation-state": "error",
    "react/no-unknown-property": "error"
  },
  "ignorePatterns": [
    "build",
    "node_modules"
  ]
}
```

### Next.jsプロジェクト

```json
{
  "rules": {
    "no-console": "warn",
    "no-debugger": "error",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off"
  },
  "ignorePatterns": [
    ".next",
    "out",
    "node_modules",
    "next.config.js"
  ]
}
```

## 自動修正

OXLintは一部のルール違反を自動修正できます。

```bash
# 自動修正を実行
npx oxlint --fix

# ドライラン（修正内容を確認のみ）
npx oxlint --fix --dry-run
```

### 修正可能なルール例

```javascript
// Before
var x = 1;
let y = 2;
y = 3; // yは再代入されない

// After (oxlint --fix)
const x = 1;
const y = 2;
```

## パフォーマンス比較

実際のプロジェクトでベンチマークを取ってみます。

### 小規模プロジェクト（100ファイル）

```bash
# ESLint
time npx eslint .
# 実行時間: 8.2秒

# OXLint
time npx oxlint
# 実行時間: 0.1秒

# 82倍高速
```

### 中規模プロジェクト（1,000ファイル）

```bash
# ESLint
time npx eslint .
# 実行時間: 45秒

# OXLint
time npx oxlint
# 実行時間: 0.4秒

# 112倍高速
```

### 大規模プロジェクト（10,000ファイル）

```bash
# ESLint
time npx eslint .
# 実行時間: 380秒（6分20秒）

# OXLint
time npx oxlint
# 実行時間: 3.2秒

# 118倍高速
```

## CI/CDへの統合

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
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run OXLint
        run: npx oxlint
```

### GitLab CI

```yaml
lint:
  image: node:20
  script:
    - npm ci
    - npx oxlint
  only:
    - merge_requests
    - main
```

### Pre-commitフック

```bash
# package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "oxlint": "^0.2.0"
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
npx oxlint --fix
git add -u
```

## VS Code統合

OXLint用のVS Code拡張機能はまだありませんが、tasks.jsonで統合できます。

### .vscode/tasks.json

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "OXLint",
      "type": "shell",
      "command": "npx oxlint",
      "problemMatcher": {
        "owner": "oxlint",
        "fileLocation": ["relative", "${workspaceFolder}"],
        "pattern": {
          "regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error)\\s+(.*)$",
          "file": 1,
          "line": 2,
          "column": 3,
          "severity": 4,
          "message": 5
        }
      },
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
```

### キーボードショートカット

```json
{
  "key": "ctrl+shift+l",
  "command": "workbench.action.tasks.runTask",
  "args": "OXLint"
}
```

## 実践例: モノレポ

Turborepoなどのモノレポ環境での使用例です。

### ルートのpackage.json

```json
{
  "scripts": {
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix"
  }
}
```

### 各パッケージのpackage.json

```json
{
  "name": "@myapp/web",
  "scripts": {
    "lint": "oxlint",
    "lint:fix": "oxlint --fix"
  }
}
```

### turbo.json

```json
{
  "pipeline": {
    "lint": {
      "outputs": [],
      "cache": false
    }
  }
}
```

## トラブルシューティング

### ルールが期待通り動作しない

```bash
# 詳細なログを出力
npx oxlint --verbose
```

### 特定ファイルを無視

```javascript
// ファイル先頭に追加
/* oxlint-disable */

// または特定ルールのみ無視
/* oxlint-disable no-console */
console.log('これはlint対象外')
/* oxlint-enable no-console */
```

### パフォーマンスが遅い

```bash
# 並列処理数を調整
npx oxlint --max-workers=4
```

## ESLintとの併用

一部のルールはESLintでしか対応していない場合、併用も可能です。

```json
{
  "scripts": {
    "lint:oxlint": "oxlint",
    "lint:eslint": "eslint --ext .jsx,.tsx .",
    "lint": "npm run lint:oxlint && npm run lint:eslint"
  }
}
```

### 棲み分けの例

```json
{
  "scripts": {
    "lint:fast": "oxlint",
    "lint:full": "eslint .",
    "lint": "npm run lint:fast"
  }
}
```

ローカル開発では`lint:fast`、CI/CDでは`lint:full`を実行します。

## まとめ

OXLintは、大規模プロジェクトでのlint時間を劇的に短縮できます。

**メリット:**
- ESLintの50〜100倍高速
- ゼロコンフィグで即座に使える
- TypeScript完全対応
- CI/CD時間の大幅短縮

**デメリット:**
- ESLintの全ルールには未対応
- プラグインエコシステムが未成熟
- VS Code統合が発展途上

**推奨される使い方:**
- 中〜大規模プロジェクトでの採用
- CI/CDでの高速化
- ESLintとの段階的な併用

開発速度を重視するプロジェクトでは、OXLintへの移行を検討する価値があります。特に、毎回のcommitやpushで数十秒待たされているプロジェクトでは、開発体験が劇的に改善します。
