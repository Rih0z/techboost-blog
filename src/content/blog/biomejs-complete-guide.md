---
title: 'Biome完全ガイド - Rust製高速リンター＆フォーマッターの決定版'
description: 'BiomeでESLint/Prettierから移行する方法を徹底解説。高速リント、フォーマット、設定方法、CI統合、VSCode統合、モノレポ対応まで網羅的に学ぼう。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: 'Feb 05 2026'
tags: ['Biome', 'Linter', 'Formatter', 'Rust', 'DevTools', 'プログラミング']
---
# Biome完全ガイド - Rust製高速リンター＆フォーマッターの決定版

Biome（旧Rome Tools）は、Rustで実装された高速リンター＆フォーマッターです。ESLintとPrettierを統合し、10倍以上の速度で動作します。

## Biomeとは

### 主な特徴

1. **圧倒的な速度** - Rust実装でESLint/Prettierの10～20倍高速
2. **統一されたツールチェイン** - リンター、フォーマッター、将来的にバンドラーも
3. **ゼロコンフィグ** - デフォルト設定で即使用可能
4. **TypeScript完全サポート** - 追加プラグイン不要
5. **IDE統合** - VS Code、Zed、Neovim、WebStorm対応
6. **並列処理** - マルチコアCPUをフル活用

### パフォーマンス比較

| プロジェクトサイズ | ESLint + Prettier | Biome | 速度比 |
|------------------|-------------------|-------|--------|
| 小規模 (50 files) | 1.2s | 0.1s | 12x |
| 中規模 (500 files) | 8.5s | 0.6s | 14x |
| 大規模 (2000 files) | 45s | 2.8s | 16x |

## インストール

### 新規プロジェクト

```bash
# npm
npm install --save-dev --save-exact @biomejs/biome

# pnpm
pnpm add -D -E @biomejs/biome

# yarn
yarn add -D -E @biomejs/biome

# bun
bun add -d -E @biomejs/biome
```

### 初期化

```bash
# 設定ファイル生成
npx @biomejs/biome init

# または
pnpm biome init
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
    "indentStyle": "space",
    "indentWidth": 2
  }
}
```

## 基本コマンド

### フォーマット

```bash
# ファイル確認（変更なし）
npx @biomejs/biome format ./src

# ファイル書き込み
npx @biomejs/biome format --write ./src

# 特定ファイルのみ
npx @biomejs/biome format --write src/index.ts

# Gitステージされたファイルのみ
npx @biomejs/biome format --write --changed
```

### リント

```bash
# リント実行（エラー表示のみ）
npx @biomejs/biome lint ./src

# 自動修正
npx @biomejs/biome lint --write ./src

# 特定のルールを無効化して実行
npx @biomejs/biome lint --skip noUnusedVariables ./src
```

### 統合コマンド（check）

```bash
# フォーマット + リント + インポート整理を一度に実行
npx @biomejs/biome check ./src

# 自動修正付き
npx @biomejs/biome check --write ./src

# CI用（書き込みなし、エラー時終了）
npx @biomejs/biome ci ./src
```

### package.json への追加

```json
{
  "scripts": {
    "format": "biome format --write .",
    "lint": "biome lint --write .",
    "check": "biome check --write .",
    "ci": "biome ci ."
  }
}
```

## 詳細設定

### 基本設定

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "files": {
    "include": ["src/**/*.ts", "src/**/*.tsx", "scripts/**/*.js"],
    "ignore": [
      "node_modules",
      "dist",
      "build",
      ".next",
      "coverage",
      "*.config.js"
    ],
    "ignoreUnknown": true
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 100
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "all",
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

### フォーマッター詳細設定

```json
{
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 100,
    "attributePosition": "auto"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "es5",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false
    }
  }
}
```

### リンタールール設定

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExtraBooleanCast": "error",
        "noMultipleSpacesInRegularExpressionLiterals": "error",
        "noUselessCatch": "error",
        "noUselessTypeConstraint": "error",
        "noWith": "error",
        "noBannedTypes": "warn",
        "noForEach": "warn",
        "noStaticOnlyClass": "warn",
        "noUselessEmptyExport": "warn",
        "noUselessFragments": "warn",
        "noUselessLabel": "warn",
        "noVoid": "error"
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
        "useArrayLiterals": "warn",
        "useIsNan": "error",
        "useValidForDirection": "error",
        "useYield": "error"
      },
      "style": {
        "noArguments": "error",
        "noVar": "error",
        "useConst": "error",
        "useTemplate": "error",
        "useBlockStatements": "warn",
        "useCollapsedElseIf": "warn",
        "useExponentiationOperator": "warn",
        "useNumberNamespace": "warn",
        "useNumericLiterals": "warn",
        "useSelfClosingElements": "warn",
        "useShorthandArrayType": "warn",
        "useSingleVarDeclarator": "warn"
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
  }
}
```

### ルールのオーバーライド（ファイルごと）

```json
{
  "linter": {
    "rules": {
      "recommended": true
    }
  },
  "overrides": [
    {
      "include": ["**/*.test.ts", "**/*.spec.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "off"
          }
        }
      }
    },
    {
      "include": ["scripts/**/*.js"],
      "javascript": {
        "formatter": {
          "semicolons": "asNeeded"
        }
      }
    }
  ]
}
```

## プロジェクト別設定

### React + TypeScript

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "files": {
    "include": ["src/**/*.{ts,tsx}"],
    "ignore": ["node_modules", "dist", ".next", "build"]
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
        "useValidAriaProps": "error",
        "useValidAriaValues": "error",
        "noAccessKey": "warn",
        "noAutofocus": "warn",
        "noBlankTarget": "error"
      },
      "correctness": {
        "useExhaustiveDependencies": "warn",
        "useHookAtTopLevel": "error"
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
      "semicolons": "never",
      "trailingCommas": "es5"
    }
  }
}
```

### Node.js / Express

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "files": {
    "include": ["src/**/*.ts", "scripts/**/*.js"],
    "ignore": ["node_modules", "dist", "coverage"]
  },
  "linter": {
    "rules": {
      "recommended": true,
      "correctness": {
        "noNodejsModules": "off"
      },
      "style": {
        "useNodejsImportProtocol": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always"
    }
  }
}
```

### Vue.js

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "files": {
    "include": ["src/**/*.{ts,vue}"],
    "ignore": ["node_modules", "dist"]
  },
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "rules": {
      "recommended": true,
      "a11y": {
        "useAltText": "error",
        "useKeyWithClickEvents": "error"
      }
    }
  }
}
```

## ESLint/Prettierからの移行

### ステップ1: 既存ツールのアンインストール

```bash
# ESLint関連
npm uninstall eslint \
  eslint-config-prettier \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin

# Prettier関連
npm uninstall prettier
```

### ステップ2: 設定ファイル削除

```bash
rm .eslintrc.json .eslintrc.js .eslintignore
rm .prettierrc .prettierrc.json .prettierignore
```

### ステップ3: Biomeインストールと設定

```bash
npm install --save-dev --save-exact @biomejs/biome
npx @biomejs/biome init
```

### ステップ4: package.json更新

```json
{
  "scripts": {
    "lint": "biome lint --write .",
    "format": "biome format --write .",
    "check": "biome check --write .",
    "ci": "biome ci ."
  }
}
```

### ステップ5: 既存コードのフォーマット

```bash
# 全ファイルフォーマット
npm run check
```

### ステップ6: Git フック更新（Husky使用時）

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx}": [
      "biome check --write --no-errors-on-unmatched"
    ]
  }
}
```

## IDE統合

### VS Code

#### 拡張機能インストール

1. VS Code Marketplaceで「Biome」を検索
2. 公式「Biome」拡張機能をインストール

#### プロジェクト設定

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

#### 推奨拡張機能リスト

```json
// .vscode/extensions.json
{
  "recommendations": [
    "biomejs.biome"
  ],
  "unwantedRecommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

### Neovim

```lua
-- lazy.nvim
{
  "nvim-lspconfig",
  dependencies = {
    "williamboman/mason.nvim",
    "williamboman/mason-lspconfig.nvim",
  },
  config = function()
    require("mason").setup()
    require("mason-lspconfig").setup({
      ensure_installed = { "biome" }
    })

    local lspconfig = require("lspconfig")

    lspconfig.biome.setup({
      on_attach = function(client, bufnr)
        -- フォーマット設定
        vim.api.nvim_buf_set_option(bufnr, "formatexpr", "v:lua.vim.lsp.formatexpr()")

        -- 保存時フォーマット
        vim.api.nvim_create_autocmd("BufWritePre", {
          buffer = bufnr,
          callback = function()
            vim.lsp.buf.format({ async = false })
          end,
        })
      end,
    })
  end,
}
```

## CI/CD統合

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Biome
        run: npm run ci
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - lint

lint:
  stage: lint
  image: node:20-alpine
  script:
    - npm ci
    - npm run ci
  only:
    - merge_requests
    - main
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  lint:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - v1-dependencies-{{ checksum "package-lock.json" }}
      - run: npm ci
      - save_cache:
          paths:
            - node_modules
          key: v1-dependencies-{{ checksum "package-lock.json" }}
      - run: npm run ci

workflows:
  version: 2
  lint-workflow:
    jobs:
      - lint
```

## モノレポ対応

### Turborepo

```json
// turbo.json
{
  "pipeline": {
    "lint": {
      "cache": true,
      "outputs": []
    },
    "format": {
      "cache": true,
      "outputs": []
    }
  }
}
```

```json
// package.json (root)
{
  "scripts": {
    "lint": "turbo run lint",
    "format": "turbo run format"
  }
}
```

```json
// packages/app/package.json
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write ."
  }
}
```

### pnpm Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```json
// biome.json (root)
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "files": {
    "include": [
      "packages/*/src/**/*.{ts,tsx}",
      "apps/*/src/**/*.{ts,tsx}"
    ],
    "ignore": [
      "**/node_modules",
      "**/dist",
      "**/.next"
    ]
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

## トラブルシューティング

### Q1: ESLintの全ルールはサポートされていますか?

A: いいえ。Biomeは現在、ESLintの約70～80%のルールをサポートしています。不足しているルールがある場合は、BiomeとESLintを併用できます。

```json
// biome.json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

```json
// .eslintrc.json（特定ルールのみ）
{
  "extends": [],
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Q2: Prettierとのフォーマット差異は?

A: Biomeはほぼ互換性がありますが、若干の違いがあります。

```json
// Prettier風設定
{
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "all",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true
    }
  }
}
```

### Q3: VSCodeでフォーマットが動作しない

A: 以下を確認してください:

1. Biome拡張機能がインストール済みか
2. デフォルトフォーマッターが設定されているか
3. biome.jsonが正しい場所にあるか

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true
}
```

### Q4: 特定のファイル/ディレクトリを無視したい

A: `biome.json` の `files.ignore` を使用します。

```json
{
  "files": {
    "ignore": [
      "node_modules",
      "dist",
      "build",
      "**/*.config.js",
      "scripts/legacy/**"
    ]
  }
}
```

## まとめ

Biomeは以下を実現します:

1. **圧倒的な速度** - ESLint/Prettierの10～20倍高速
2. **統一されたツールチェイン** - リンター、フォーマッター、インポート整理を1つで
3. **ゼロコンフィグ** - デフォルトで即使用可能
4. **TypeScript完全サポート** - 追加プラグイン不要
5. **優れたIDE統合** - VS Code、Neovim、WebStorm対応
6. **アクティブな開発** - 毎月新機能追加

新規プロジェクトではBiomeを、既存プロジェクトでは段階的な移行を検討する価値があります。特に大規模プロジェクトやモノレポでは、Biomeのパフォーマンス優位性が顕著に現れます。
