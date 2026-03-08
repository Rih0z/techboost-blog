---
title: "Knipで未使用コード・依存関係を検出 - TypeScriptプロジェクトの最適化ツール"
description: "Knipを使ったTypeScript/JavaScriptプロジェクトの未使用コード・未使用依存関係・デッドコード検出方法を解説。CI統合やバンドルサイズ削減の実践例も紹介。"
pubDate: "2025-02-05"
tags: ['TypeScript', 'フロントエンド']
heroImage: '../../assets/thumbnails/knip-unused-code-finder.jpg'
---

Knipは、TypeScriptおよびJavaScriptプロジェクトの未使用コード、未使用依存関係、到達不可能なコードを検出する強力なツールです。コードベースを整理し、バンドルサイズを削減し、メンテナンス性を向上させるために不可欠なツールです。

## Knipとは

Knipは「Knife」の発音に由来し、不要なコードを「切り取る」ことを目的としたツールです。

### 主な機能

- **未使用ファイルの検出**: インポートされていないファイルを発見
- **未使用エクスポートの検出**: 使われていないエクスポートを特定
- **未使用依存関係の検出**: package.jsonの不要な依存関係を発見
- **到達不可能なコード検出**: デッドコードを特定
- **型の未使用検出**: TypeScript型定義の未使用を検出
- **循環依存の検出**: モジュール間の循環参照を発見

### なぜKnipが必要か

```
プロジェクトが成長するにつれて:
- 使われなくなったコードが蓄積
- 不要な依存関係が残る
- バンドルサイズが肥大化
- メンテナンスコストが増大

Knipが解決:
- 自動的に未使用コードを検出
- 安全に削除可能な部分を特定
- プロジェクトを最適な状態に保つ
```

## インストールとセットアップ

### インストール

```bash
# npm
npm install -D knip

# yarn
yarn add -D knip

# pnpm
pnpm add -D knip
```

### 基本設定

Knipは多くのプロジェクト構成を自動検出しますが、カスタマイズも可能です。

```json
// knip.json
{
  "entry": ["src/index.ts", "src/cli.ts"],
  "project": ["src/**/*.ts"],
  "ignore": ["**/*.test.ts", "**/__tests__/**"],
  "ignoreDependencies": ["@types/*"]
}
```

### package.jsonスクリプト

```json
{
  "scripts": {
    "knip": "knip",
    "knip:fix": "knip --fix",
    "knip:production": "knip --production"
  }
}
```

## 基本的な使い方

### プロジェクト全体をスキャン

```bash
# デフォルトスキャン
npx knip

# 詳細な出力
npx knip --debug

# JSON形式で出力
npx knip --reporter json > knip-report.json
```

### 出力例

```
Finding unused files, dependencies and exports...

Unused files (3)
  src/utils/old-helper.ts
  src/components/DeprecatedButton.tsx
  src/lib/legacy-api.ts

Unused dependencies (2)
  lodash
  moment

Unused exports (5)
  src/utils/helpers.ts: unusedHelper
  src/components/Button.tsx: InternalProps
  src/lib/api.ts: legacyFetch

Unused types (2)
  src/types/index.ts: OldType
  src/types/api.ts: DeprecatedResponse
```

## Next.jsプロジェクトでの使用

### 設定

```json
// knip.json
{
  "entry": [
    "next.config.{js,ts}",
    "app/**/*.{ts,tsx}",
    "pages/**/*.{ts,tsx}"
  ],
  "project": ["**/*.{js,ts,jsx,tsx}"],
  "ignore": [
    ".next/**",
    "out/**",
    "public/**",
    "**/*.test.{ts,tsx}",
    "**/__tests__/**"
  ],
  "next": {
    "entry": [
      "app/layout.tsx",
      "app/page.tsx",
      "app/**/page.tsx",
      "app/**/layout.tsx",
      "app/api/**/route.ts"
    ]
  }
}
```

### App Routerでの検出

```typescript
// app/page.tsx
import { UnusedComponent } from '@/components/UnusedComponent'; // Knipが検出
import { UsedComponent } from '@/components/UsedComponent';

export default function Page() {
  return <UsedComponent />; // UnusedComponentは使われていない
}
```

```bash
# Knip実行結果
Unused imports (1)
  app/page.tsx: UnusedComponent from @/components/UnusedComponent
```

## Reactプロジェクトでの使用

### 未使用コンポーネントの検出

```typescript
// src/components/Button.tsx
export function Button() { /* ... */ }
export function InternalButton() { /* ... */ } // 内部でのみ使用予定だが未使用

// Knipが検出
export function UnusedButton() { /* ... */ } // 完全に未使用
```

```bash
# Knip実行結果
Unused exports (2)
  src/components/Button.tsx: InternalButton
  src/components/Button.tsx: UnusedButton
```

### 動的インポートへの対応

```typescript
// 動的インポート（Knipは検出可能）
const LazyComponent = lazy(() => import('./LazyComponent'));

// 文字列ベースの動的インポート（Knipが検出できない場合）
const componentName = 'DynamicComponent';
const Component = lazy(() => import(`./components/${componentName}`));
```

```json
// 動的インポートパターンを設定で指定
{
  "entry": ["src/components/**/*.tsx"],
  "ignoreDependencies": []
}
```

## モノレポでの使用

### ワークスペース設定

```json
// knip.json（ルート）
{
  "workspaces": {
    "packages/ui": {
      "entry": "src/index.ts",
      "project": "src/**/*.ts"
    },
    "packages/utils": {
      "entry": "src/index.ts",
      "project": "src/**/*.ts"
    },
    "apps/web": {
      "entry": ["src/main.tsx", "vite.config.ts"],
      "project": "src/**/*.tsx"
    }
  }
}
```

### ワークスペース間の依存関係

```typescript
// packages/ui/src/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { UnusedCard } from './Card'; // 他のワークスペースで未使用

// apps/web/src/App.tsx
import { Button, Input } from '@workspace/ui'; // Cardは使われていない
```

```bash
# 特定のワークスペースをスキャン
npx knip --workspace packages/ui

# すべてのワークスペースをスキャン
npx knip --workspace-root
```

## 高度な設定

### プラグインシステム

Knipは様々なツールやフレームワークのプラグインを提供します。

```json
{
  "eslint": true,
  "jest": true,
  "vitest": true,
  "playwright": true,
  "webpack": true,
  "vite": true
}
```

### カスタムエントリーポイント

```json
{
  "entry": [
    "src/index.ts",
    "src/cli.ts",
    "scripts/**/*.ts",
    "!scripts/internal/**"
  ],
  "project": [
    "src/**/*.ts",
    "scripts/**/*.ts"
  ]
}
```

### 依存関係の除外

```json
{
  "ignoreDependencies": [
    "@types/*",           // すべての型定義
    "eslint-*",           // ESLintプラグイン
    "vite",               // 開発ツール
    "typescript"          // TypeScriptコンパイラ
  ],
  "ignoreBinaries": [
    "tsc",
    "eslint"
  ]
}
```

## CI/CDへの統合

### GitHub Actionsワークフロー

```yaml
# .github/workflows/knip.yml
name: Knip Analysis

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  knip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Knip
        run: npm run knip

      - name: Upload Knip report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: knip-report
          path: knip-report.json
```

### pre-commitフック

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "knip --no-progress"
    }
  }
}
```

または、lint-stagedと組み合わせて。

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "knip",
      "eslint --fix"
    ]
  }
}
```

## レポーターのカスタマイズ

### JSONレポーター

```bash
npx knip --reporter json > knip-report.json
```

```json
{
  "files": [
    "src/utils/old-helper.ts",
    "src/components/DeprecatedButton.tsx"
  ],
  "dependencies": [
    "lodash",
    "moment"
  ],
  "exports": [
    {
      "file": "src/utils/helpers.ts",
      "symbol": "unusedHelper"
    }
  ]
}
```

### カスタムレポーター

```typescript
// reporters/custom-reporter.ts
import type { Reporter } from 'knip';

const customReporter: Reporter = (issues) => {
  console.log('🔍 Knip Analysis Report\n');

  if (issues.files.length > 0) {
    console.log('📁 Unused Files:');
    issues.files.forEach(file => console.log(`  - ${file}`));
  }

  if (issues.dependencies.length > 0) {
    console.log('\n📦 Unused Dependencies:');
    issues.dependencies.forEach(dep => console.log(`  - ${dep}`));
  }

  if (issues.exports.length > 0) {
    console.log('\n📤 Unused Exports:');
    issues.exports.forEach(exp =>
      console.log(`  - ${exp.file}:${exp.symbol}`)
    );
  }
};

export default customReporter;
```

```json
// knip.json
{
  "reporters": ["./reporters/custom-reporter.ts"]
}
```

## パフォーマンスの最適化

### キャッシュの活用

```bash
# キャッシュを使用してスキャン
npx knip --cache

# キャッシュをクリア
npx knip --cache-clear
```

### インクリメンタルスキャン

```bash
# 変更されたファイルのみをスキャン
npx knip --incremental

# 特定のファイルパターンのみ
npx knip --include "src/components/**"
```

## 実践例: 大規模プロジェクトのクリーンアップ

### ステップ1: 初回スキャン

```bash
# まずは現状を把握
npx knip --reporter json > knip-initial.json

# 統計を確認
cat knip-initial.json | jq '{
  files: .files | length,
  dependencies: .dependencies | length,
  exports: .exports | length
}'
```

### ステップ2: 段階的なクリーンアップ

```bash
# 1. 未使用ファイルから削除
npx knip --include-files

# 2. 未使用依存関係を削除
npx knip --include-dependencies

# 3. 未使用エクスポートを修正
npx knip --include-exports
```

### ステップ3: 自動修正

```typescript
// scripts/cleanup.ts
import { execSync } from 'child_process';
import fs from 'fs/promises';

async function cleanup() {
  // Knipレポートを生成
  const report = JSON.parse(
    execSync('npx knip --reporter json').toString()
  );

  // 未使用ファイルを削除
  for (const file of report.files) {
    console.log(`Deleting ${file}`);
    await fs.unlink(file);
  }

  // 未使用依存関係をpackage.jsonから削除
  const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));

  for (const dep of report.dependencies) {
    delete pkg.dependencies[dep];
    delete pkg.devDependencies[dep];
    console.log(`Removed dependency: ${dep}`);
  }

  await fs.writeFile('package.json', JSON.stringify(pkg, null, 2));

  console.log('Cleanup completed! Run npm install to update lock file.');
}

cleanup();
```

## トラブルシューティング

### false positiveを回避

```json
{
  "ignore": [
    // テストファイル
    "**/*.test.ts",
    "**/__tests__/**",

    // 設定ファイル
    "*.config.{js,ts}",

    // 型定義のみのファイル
    "**/*.d.ts"
  ],
  "ignoreExportsUsedInFile": true
}
```

### 動的インポートの問題

```typescript
// 動的インポートを明示的に宣言
// knip:ignore-next-line
const Component = await import('./DynamicComponent');

// または設定で除外
// knip.json
{
  "ignoreDynamicImports": true
}
```

## ベストプラクティス

### 1. 定期的なスキャン

```json
{
  "scripts": {
    "lint": "eslint . && knip",
    "precommit": "lint-staged && knip",
    "ci": "npm run lint && npm run test && knip"
  }
}
```

### 2. 段階的な導入

```bash
# 最初は警告のみ
npx knip --warn-only

# 慣れてきたらエラーに
npx knip
```

### 3. チーム内での共有

```markdown
# docs/knip-guide.md

## Knipの使い方

### ローカル開発
- コミット前に `npm run knip` を実行
- 未使用コードを定期的にチェック

### CI/CD
- PRごとに自動実行
- mainブランチは常にクリーンな状態を維持
```

## まとめ

Knipは、TypeScript/JavaScriptプロジェクトの健全性を保つための強力なツールです。

### 主な利点

- **コードベースの最適化**: 未使用コードを削除
- **バンドルサイズの削減**: 不要な依存関係を除去
- **メンテナンス性の向上**: クリーンなコードベース維持
- **自動化**: CI/CDに統合して継続的に監視

### 導入効果

- バンドルサイズの10-30%削減
- ビルド時間の短縮
- コードレビューの負担軽減
- 技術的負債の削減

次のプロジェクトでKnipを導入し、クリーンで効率的なコードベースを維持してみてください。
