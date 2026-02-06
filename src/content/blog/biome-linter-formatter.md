---
title: "Biome：次世代リンター&フォーマッター完全ガイド"
description: "ESLintとPrettierを置き換える超高速ツールBiomeの使い方を、設定方法から実践的なカスタマイズまで詳しく解説します。"
pubDate: "2025-02-05"
---

# Biome：次世代リンター&フォーマッター完全ガイド

Biomeは、ESLintとPrettierを置き換える次世代のツールチェーンです。Rustで書かれており、驚異的な速度と使いやすさを実現しています。Rome Toolsプロジェクトの後継として、JavaScriptとTypeScriptのエコシステムに革新をもたらします。

## Biomeとは

Biomeは、単一のツールでリンティング、フォーマット、インポート整理を提供するオールインワンソリューションです。

### 主な特徴

- **圧倒的な速度**: ESLintの25倍以上高速
- **設定不要**: ゼロコンフィグで即座に使用可能
- **オールインワン**: リンター、フォーマッター、インポートソーター
- **TypeScript完全対応**: 型チェックなしで高速動作
- **IDEサポート**: VS Code、IntelliJ、Neovimなど主要エディタに対応
- **段階的移行**: 既存のESLint/Prettierから簡単に移行
- **エラーメッセージ**: わかりやすく詳細なエラー説明

## インストール

プロジェクトにBiomeを追加します。

```bash
# npm
npm install --save-dev --save-exact @biomejs/biome

# pnpm
pnpm add --save-dev --save-exact @biomejs/biome

# yarn
yarn add --dev --exact @biomejs/biome

# bun
bun add --dev --exact @biomejs/biome
```

初期化:

```bash
npx @biomejs/biome init
```

これにより、`biome.json`設定ファイルが作成されます。

```json
{
  "$schema": "https://biomejs.dev/schemas/1.5.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
  }
}
```

## 基本的な使い方

### フォーマット

```bash
# ファイルをフォーマット
npx @biomejs/biome format --write src/

# 特定のファイルをフォーマット
npx @biomejs/biome format --write src/app.ts

# ドライラン（変更せずに確認）
npx @biomejs/biome format src/
```

### リンティング

```bash
# コードをリント
npx @biomejs/biome lint src/

# 自動修正
npx @biomejs/biome lint --apply src/

# 自動修正（危険な変更も適用）
npx @biomejs/biome lint --apply-unsafe src/
```

### 一括実行

```bash
# フォーマット + リント + インポート整理を一度に実行
npx @biomejs/biome check --apply src/
```

### CI/CD用

```bash
# フォーマットチェック（変更を加えない）
npx @biomejs/biome format src/

# リントチェック
npx @biomejs/biome lint src/

# 総合チェック
npx @biomejs/biome check src/
```

## package.jsonへのスクリプト追加

```json
{
  "scripts": {
    "format": "biome format --write .",
    "lint": "biome lint --apply .",
    "check": "biome check --apply .",
    "ci": "biome ci ."
  }
}
```

## 詳細な設定

`biome.json`で細かくカスタマイズできます。

### フォーマッター設定

```json
{
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf",
    "ignore": [
      "dist/**",
      "node_modules/**",
      "*.min.js"
    ]
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingComma": "all",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false
    }
  }
}
```

### リンター設定

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error",
        "noDebugger": "error",
        "noConsoleLog": "warn"
      },
      "complexity": {
        "noForEach": "off",
        "noBannedTypes": "error"
      },
      "style": {
        "noNegationElse": "error",
        "useConst": "error",
        "useBlockStatements": "warn"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUndeclaredVariables": "error"
      },
      "performance": {
        "noDelete": "warn"
      }
    },
    "ignore": [
      "dist/**",
      "build/**",
      "coverage/**"
    ]
  }
}
```

### インポート整理設定

```json
{
  "organizeImports": {
    "enabled": true
  },
  "javascript": {
    "organizeImports": {
      "enabled": true
    }
  }
}
```

## VS Code統合

VS Code拡張機能をインストールすると、保存時に自動フォーマットできます。

### 拡張機能のインストール

```bash
code --install-extension biomejs.biome
```

または、VS Code内で「Biome」を検索してインストール。

### VS Code設定

`.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

## ESLintからの移行

既存のESLint設定をBiomeに移行する手順です。

### 1. ESLint設定を分析

```bash
# ESLintの現在の設定を確認
cat .eslintrc.json
```

### 2. Biomeで対応するルールを設定

ESLintの主要なルールをBiomeで再現します。

```json
{
  "linter": {
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noConstantCondition": "error"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noArrayIndexKey": "warn"
      },
      "style": {
        "noVar": "error",
        "useConst": "error"
      }
    }
  }
}
```

### 3. ESLintを段階的に無効化

一度にすべてを置き換えるのではなく、段階的に移行します。

```json
// package.json
{
  "scripts": {
    "lint": "biome lint src/ && eslint src/",
    "lint:biome": "biome lint src/",
    "lint:eslint": "eslint src/"
  }
}
```

### 4. プラグインの代替を探す

一部のESLintプラグイン（例: eslint-plugin-react）は、Biomeでまだ完全サポートされていない場合があります。その場合、当面は併用します。

```json
{
  "linter": {
    "rules": {
      "recommended": true
    }
  }
}
```

```js
// .eslintrc.js（Reactルールのみ）
module.exports = {
  extends: ['plugin:react/recommended'],
  rules: {
    // Biomeでカバーされないルールのみ
    'react/prop-types': 'off',
  },
};
```

## Prettierからの移行

Prettierの設定をBiomeに置き換えます。

### Prettierの設定を確認

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

### Biomeで同等の設定

```json
{
  "formatter": {
    "enabled": true,
    "lineWidth": 100,
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "semicolons": "always",
      "quoteStyle": "single",
      "trailingComma": "all",
      "arrowParentheses": "always"
    }
  }
}
```

### Prettierを削除

```bash
npm uninstall prettier
rm .prettierrc .prettierignore
```

## 実践例：Reactプロジェクトでの設定

```json
{
  "$schema": "https://biomejs.dev/schemas/1.5.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "warn",
        "noArrayIndexKey": "warn",
        "noDebugger": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "useHookAtTopLevel": "error"
      },
      "style": {
        "noVar": "error",
        "useConst": "error",
        "useTemplate": "warn"
      },
      "complexity": {
        "noExcessiveCognitiveComplexity": {
          "level": "warn",
          "options": {
            "maxAllowedComplexity": 15
          }
        }
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "trailingComma": "es5",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSameLine": false
    }
  },
  "files": {
    "ignore": [
      "dist/**",
      "build/**",
      "node_modules/**",
      "coverage/**",
      "*.config.js"
    ]
  }
}
```

## Git統合

### pre-commitフック

Huskyと組み合わせて、コミット前に自動チェック:

```bash
npm install --save-dev husky lint-staged
npx husky init
```

`.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

`package.json`:

```json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx,json}": [
      "biome check --apply --no-errors-on-unmatched"
    ]
  }
}
```

## CI/CDでの使用

### GitHub Actions

```yaml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run ci
```

### GitLab CI

```yaml
lint:
  image: node:20
  script:
    - npm ci
    - npm run ci
  only:
    - merge_requests
    - main
```

## パフォーマンス比較

Biomeは驚異的な速度を実現しています。

### ベンチマーク結果（10,000ファイルのプロジェクト）

```
ESLint:     45.2秒
Prettier:   12.8秒
Biome:      1.7秒
```

### メモリ使用量

```
ESLint:     512MB
Prettier:   256MB
Biome:      128MB
```

## トラブルシューティング

### 既存コードとの互換性問題

Biomeが既存コードに多数のエラーを報告する場合:

```bash
# まずフォーマットのみ適用
npx @biomejs/biome format --write .

# 安全な修正のみ適用
npx @biomejs/biome lint --apply .

# 段階的にルールを有効化
```

### 特定のルールを無効化

```json
{
  "linter": {
    "rules": {
      "suspicious": {
        "noExplicitAny": "off"
      }
    }
  }
}
```

### ファイル単位でルールを無効化

```typescript
// biome-ignore lint/suspicious/noExplicitAny: レガシーコード
function legacyFunction(param: any) {
  return param;
}
```

## 今後のロードマップ

Biomeは活発に開発されており、今後以下の機能が追加予定です。

- CSS/SCSSサポート
- HTMLサポート
- より多くのリントルール
- プラグインシステム
- コードモッド機能

## まとめ

Biomeは、JavaScriptとTypeScriptの開発体験を劇的に向上させるツールです。ESLintとPrettierを1つのツールに統合し、圧倒的な速度と使いやすさを提供します。

まだ発展途上の部分もありますが、既に多くのプロジェクトで採用されており、今後さらに成熟していくことが期待されます。新規プロジェクトはもちろん、既存プロジェクトへの段階的な導入も検討する価値があるでしょう。
