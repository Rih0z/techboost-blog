---
title: 'Biome（旧Rome）で高速リント＆フォーマット - ESLint/Prettierの代替ツール'
description: 'Biomeの導入方法、設定、ESLint/Prettierからの移行手順を徹底解説。高速で統一されたコード品質管理を実現する次世代ツールチェインの使い方。'
pubDate: 'Feb 05 2026'
tags: ['Biome', 'Linter', 'Formatter', 'プログラミング']
---

# Biome（旧Rome）で高速リント＆フォーマット - ESLint/Prettierの代替ツール

Biomeは、ESLintとPrettierを置き換える次世代のツールチェインです。Rustで実装され、従来のツールより10倍以上高速で、設定ファイルも統一されています。

## Biomeとは

### 主な特徴

1. **統一されたツールチェイン** - リンター、フォーマッター、将来的にはバンドラーも
2. **圧倒的な速度** - ESLint + Prettierの10～20倍高速
3. **ゼロコンフィグ** - 設定なしで即使える
4. **TypeScript完全サポート** - 追加プラグイン不要
5. **IDE統合** - VS Code、Zed、Neovimなど

### パフォーマンス比較

| ツール | 100ファイル処理時間 |
|--------|---------------------|
| ESLint + Prettier | 2.5秒 |
| Biome | 0.2秒 |
| 差 | **12.5倍高速** |

## インストール

### プロジェクトへの追加

```bash
# npm
npm install --save-dev --save-exact @biomejs/biome

# pnpm
pnpm add -D -E @biomejs/biome

# Yarn
yarn add -D -E @biomejs/biome

# Bun
bun add -d -E @biomejs/biome
```

### 初期化

```bash
# 設定ファイル生成
npx @biomejs/biome init
```

生成される `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
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
    "indentStyle": "space"
  }
}
```

## 基本的な使い方

### コマンド一覧

```bash
# フォーマット（書き込み）
npx @biomejs/biome format --write ./src

# リント実行
npx @biomejs/biome lint ./src

# 自動修正
npx @biomejs/biome lint --write ./src

# フォーマット＋リント（推奨）
npx @biomejs/biome check --write ./src

# CI用（書き込みなし）
npx @biomejs/biome ci ./src
```

### package.jsonへのスクリプト追加

```json
{
  "scripts": {
    "lint": "biome lint ./src",
    "format": "biome format --write ./src",
    "check": "biome check --write ./src",
    "ci": "biome ci ./src"
  }
}
```

## 詳細設定

### biome.json完全版

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "files": {
    "include": ["src/**/*.ts", "src/**/*.tsx"],
    "ignore": ["node_modules", "dist", "build", ".next"]
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 100,
    "attributePosition": "auto"
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExtraBooleanCast": "error",
        "noMultipleSpacesInRegularExpressionLiterals": "error",
        "noUselessCatch": "error",
        "noUselessTypeConstraint": "error",
        "noWith": "error"
      },
      "correctness": {
        "noConstAssign": "error",
        "noConstantCondition": "error",
        "noEmptyCharacterClassInRegex": "error",
        "noEmptyPattern": "error",
        "noGlobalObjectCalls": "error",
        "noInvalidConstructorSuper": "error",
        "noInvalidNewBuiltin": "error",
        "noNonoctalDecimalEscape": "error",
        "noPrecisionLoss": "error",
        "noSelfAssign": "error",
        "noSetterReturn": "error",
        "noSwitchDeclarations": "error",
        "noUndeclaredVariables": "error",
        "noUnreachable": "error",
        "noUnreachableSuper": "error",
        "noUnsafeFinally": "error",
        "noUnsafeOptionalChaining": "error",
        "noUnusedLabels": "error",
        "noUnusedVariables": "error",
        "useIsNan": "error",
        "useValidForDirection": "error",
        "useYield": "error"
      },
      "style": {
        "noArguments": "error",
        "noVar": "error",
        "useConst": "error",
        "useTemplate": "error"
      },
      "suspicious": {
        "noAsyncPromiseExecutor": "error",
        "noCatchAssign": "error",
        "noClassAssign": "error",
        "noCompareNegZero": "error",
        "noControlCharactersInRegex": "error",
        "noDebugger": "error",
        "noDoubleEquals": "error",
        "noDuplicateCase": "error",
        "noDuplicateClassMembers": "error",
        "noDuplicateObjectKeys": "error",
        "noDuplicateParameters": "error",
        "noEmptyBlockStatements": "error",
        "noExplicitAny": "warn",
        "noExtraNonNullAssertion": "error",
        "noFallthroughSwitchClause": "error",
        "noFunctionAssign": "error",
        "noGlobalAssign": "error",
        "noImportAssign": "error",
        "noMisleadingCharacterClass": "error",
        "noPrototypeBuiltins": "error",
        "noRedeclare": "error",
        "noShadowRestrictedNames": "error",
        "noUnsafeNegation": "error",
        "useGetterReturn": "error",
        "useValidTypeof": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "es5",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false
    }
  },
  "json": {
    "formatter": {
      "enabled": true,
      "indentStyle": "space",
      "indentWidth": 2,
      "lineWidth": 100
    },
    "parser": {
      "allowComments": true,
      "allowTrailingCommas": false
    }
  }
}
```

### プロジェクト別設定例

#### React + TypeScript

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "files": {
    "include": ["src/**/*.{ts,tsx}"],
    "ignore": ["node_modules", "dist", ".next"]
  },
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "rules": {
      "recommended": true,
      "a11y": {
        "useAltText": "error",
        "useKeyWithClickEvents": "error",
        "useValidAriaProps": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  }
}
```

#### Node.js

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "files": {
    "include": ["src/**/*.ts", "scripts/**/*.js"],
    "ignore": ["node_modules", "dist"]
  },
  "linter": {
    "rules": {
      "recommended": true,
      "correctness": {
        "noNodejsModules": "off"
      }
    }
  }
}
```

## ESLint/Prettierからの移行

### 1. 既存ツールのアンインストール

```bash
npm uninstall eslint prettier \
  eslint-config-prettier \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin
```

### 2. 設定ファイル削除

```bash
rm .eslintrc.json .prettierrc.json .prettierignore
```

### 3. Biomeインストールと初期化

```bash
npm install --save-dev --save-exact @biomejs/biome
npx @biomejs/biome init
```

### 4. VS Code設定の更新

```json
// .vscode/settings.json
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
  }
}
```

### 5. package.jsonスクリプト更新

```json
{
  "scripts": {
    "lint": "biome lint ./src",
    "format": "biome format --write ./src",
    "check": "biome check --write ./src",
    "ci": "biome ci ./src"
  }
}
```

### 6. CI/CD設定（GitHub Actions例）

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run ci
```

## VS Code統合

### 拡張機能インストール

1. VS Code Marketplaceで「Biome」を検索
2. 「Biome」（公式）をインストール

### プロジェクト設定

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  // ファイルタイプごと
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
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

## よくある質問

### Q1: ESLintの全ルールがサポートされていますか?

A: いいえ。Biomeは現在、ESLintの主要ルールの約70%をサポートしています。不足しているルールがある場合は、BiomeとESLintを併用することも可能です。

```json
// 併用例: biome.json
{
  "linter": {
    "enabled": true
  }
}

// .eslintrc.json（特定ルールのみ）
{
  "extends": ["plugin:react-hooks/recommended"]
}
```

### Q2: Prettierとのフォーマット互換性は?

A: ほぼ互換性がありますが、若干の違いがあります。以下の設定でPrettier風にできます:

```json
{
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  }
}
```

### Q3: モノレポでの使い方は?

A: ルートにbiome.jsonを配置し、パッケージごとにオーバーライド可能です。

```json
// biome.json（ルート）
{
  "extends": ["./packages/*/biome.json"]
}

// packages/app/biome.json
{
  "formatter": {
    "indentWidth": 4
  }
}
```

## まとめ

Biomeは以下の点で優れています:

1. **圧倒的な速度** - 大規模プロジェクトでも快適
2. **統一されたツールチェイン** - 設定ファイル1つで完結
3. **ゼロコンフィグ** - 即座に使い始められる
4. **TypeScript完全サポート** - プラグイン不要
5. **アクティブな開発** - 毎月新機能追加

新規プロジェクトではBiomeを、既存プロジェクトでは段階的な移行を検討する価値があります。特に大規模なモノレポでは、Biomeのパフォーマンス優位性が顕著です。
