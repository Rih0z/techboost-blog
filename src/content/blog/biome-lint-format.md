---
title: "Biome完全ガイド — ESLint + Prettierを置き換える高速ツールチェーン"
description: "Rustで実装された超高速リンター・フォーマッターBiomeの完全ガイド。ESLintとPrettierを統合し、25倍高速な開発体験を実現する次世代ツールの導入から実践まで徹底解説します。"
pubDate: "2026-02-06"
tags: ["Biome", "Linter", "Formatter", "TypeScript", "開発ツール"]
---

Biomeは、ESLintとPrettierを置き換える次世代の高速ツールチェーンです。Rustで実装され、従来のツールと比べて最大25倍高速に動作します。2024年にv1.0がリリースされ、本格的な採用が進んでいます。この記事では、Biomeの基本から実践的な使い方まで徹底的に解説します。

## Biomeとは

Biomeは、元々Romeとして開発されていたプロジェクトがフォークされ、コミュニティ主導で開発されているツールです。主な特徴は以下の通りです。

- **超高速** - Rustで実装され、ESLint + Prettierの25倍高速
- **オールインワン** - リンター、フォーマッター、インポート整理を統合
- **設定不要** - ゼロコンフィグで即座に使える
- **型安全** - TypeScript/JSXネイティブサポート
- **エディタ統合** - VS Code、IntelliJ、Neovim等に対応
- **段階的移行可能** - ESLint/Prettierから徐々に移行できる

## なぜBiomeか？

### パフォーマンス比較

```bash
# 大規模プロジェクト（10,000ファイル）でのベンチマーク

# ESLint + Prettier
$ time npm run lint
real    0m47.3s

# Biome
$ time npx @biomejs/biome check .
real    0m1.9s

# 約25倍高速！
```

### ツールの統合

従来のスタック:
- ESLint（リンティング）
- Prettier（フォーマット）
- eslint-plugin-import（インポート整理）
- 各種プラグイン

Biomeのスタック:
- Biome（全て込み）

## インストールとセットアップ

### 新規プロジェクト

```bash
# パッケージインストール
npm install --save-dev --save-exact @biomejs/biome

# 初期化
npx @biomejs/biome init
```

生成される `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.5.3/schema.json",
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
    "indentStyle": "tab"
  }
}
```

### package.jsonにスクリプト追加

```json
{
  "scripts": {
    "check": "biome check .",
    "check:write": "biome check --write .",
    "format": "biome format --write .",
    "lint": "biome lint .",
    "lint:fix": "biome lint --write ."
  }
}
```

## 基本的な使い方

### チェック（リント + フォーマット）

```bash
# 全ファイルをチェック
npx @biomejs/biome check .

# 特定のファイルをチェック
npx @biomejs/biome check src/

# 自動修正
npx @biomejs/biome check --write .

# 安全な修正のみ適用
npx @biomejs/biome check --write --unsafe .
```

### フォーマットのみ

```bash
# フォーマット確認
npx @biomejs/biome format .

# フォーマット適用
npx @biomejs/biome format --write .
```

### リントのみ

```bash
# リント実行
npx @biomejs/biome lint .

# 自動修正
npx @biomejs/biome lint --write .
```

## 設定ファイル完全ガイド

### 基本設定

```json
{
  "$schema": "https://biomejs.dev/schemas/1.5.3/schema.json",
  "files": {
    "include": ["src/**/*.ts", "src/**/*.tsx"],
    "ignore": ["node_modules", "dist", "build", "*.config.js"]
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
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
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "trailingComma": "es5",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false
    }
  }
}
```

### TypeScript設定

```json
{
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noArrayIndexKey": "warn"
      },
      "complexity": {
        "noBannedTypes": "error",
        "noUselessTypeConstraint": "error"
      },
      "style": {
        "useImportType": "error",
        "useConst": "error",
        "noNonNullAssertion": "warn"
      }
    }
  }
}
```

### React設定

```json
{
  "linter": {
    "rules": {
      "a11y": {
        "useKeyWithClickEvents": "error",
        "useAltText": "error",
        "noBlankTarget": "error"
      },
      "correctness": {
        "useExhaustiveDependencies": "warn",
        "useHookAtTopLevel": "error"
      },
      "suspicious": {
        "noArrayIndexKey": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "jsxQuoteStyle": "double",
      "quoteStyle": "single"
    }
  }
}
```

## ルール設定の詳細

### 推奨ルールセット

```json
{
  "linter": {
    "rules": {
      "recommended": true
    }
  }
}
```

### カテゴリ別ルール設定

```json
{
  "linter": {
    "rules": {
      "recommended": false,
      "correctness": {
        "all": true,
        "noUnusedVariables": "error"
      },
      "suspicious": {
        "all": true,
        "noExplicitAny": "warn"
      },
      "style": {
        "all": true,
        "useConst": "error",
        "noNegationElse": "off"
      },
      "complexity": {
        "all": true,
        "noForEach": "warn"
      },
      "performance": {
        "all": true,
        "noDelete": "error"
      },
      "a11y": {
        "all": true,
        "useKeyWithClickEvents": "error"
      },
      "security": {
        "all": true,
        "noDangerouslySetInnerHtml": "error"
      }
    }
  }
}
```

### ファイル/ディレクトリごとの設定上書き

```json
{
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
      "linter": {
        "rules": {
          "correctness": {
            "noNodejsModules": "off"
          }
        }
      }
    }
  ]
}
```

## ESLintからの移行

### 移行プロセス

```bash
# 1. Biomeのインストール
npm install --save-dev --save-exact @biomejs/biome

# 2. 初期化
npx @biomejs/biome init

# 3. ESLint設定の移行
npx @biomejs/biome migrate eslint --write

# 4. Prettier設定の移行
npx @biomejs/biome migrate prettier --write
```

### 段階的移行戦略

**フェーズ1: 並行運用**

```json
{
  "scripts": {
    "lint:eslint": "eslint .",
    "lint:biome": "biome check .",
    "lint": "npm run lint:eslint && npm run lint:biome"
  }
}
```

**フェーズ2: Biomeメイン化**

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:legacy": "eslint ."
  }
}
```

**フェーズ3: 完全移行**

```json
{
  "scripts": {
    "check": "biome check .",
    "check:write": "biome check --write .",
    "format": "biome format --write ."
  }
}
```

### ESLintルールとBiomeルールの対応表

| ESLint | Biome |
|--------|-------|
| `no-unused-vars` | `noUnusedVariables` |
| `no-explicit-any` | `noExplicitAny` |
| `prefer-const` | `useConst` |
| `no-console` | `noConsoleLog` |
| `eqeqeq` | `useStrictEquality` |
| `no-debugger` | `noDebugger` |
| `no-var` | `noVar` |

## VS Code統合

### 拡張機能のインストール

```bash
# VS Code拡張機能
code --install-extension biomejs.biome
```

### settings.json設定

```json
{
  // Biomeを有効化
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },

  // ファイルタイプごとの設定
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

  // ESLint/Prettierを無効化
  "eslint.enable": false,
  "prettier.enable": false
}
```

## Git統合

### pre-commitフック

```bash
# huskyのインストール
npm install --save-dev husky lint-staged

# huskyの初期化
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
    "*.{js,jsx,ts,tsx,json}": [
      "biome check --write --no-errors-on-unmatched"
    ]
  }
}
```

### GitHub Actions

```yaml
# .github/workflows/lint.yml
name: Lint

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Biome
        run: npx @biomejs/biome ci .
```

## CIでの使用

### CI専用コマンド

```bash
# CIモード（エラーがあれば失敗）
npx @biomejs/biome ci .

# 詳細な出力
npx @biomejs/biome ci --verbose .

# JSONレポート出力
npx @biomejs/biome ci --reporter=json .
```

### GitLab CI

```yaml
# .gitlab-ci.yml
lint:
  stage: test
  image: node:20
  script:
    - npm ci
    - npx @biomejs/biome ci .
  only:
    - merge_requests
    - main
```

## モノレポ対応

### ルートのbiome.json

```json
{
  "$schema": "https://biomejs.dev/schemas/1.5.3/schema.json",
  "extends": [],
  "files": {
    "ignore": ["**/node_modules", "**/dist"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

### パッケージごとの設定

```json
// packages/web/biome.json
{
  "extends": ["../../biome.json"],
  "javascript": {
    "formatter": {
      "quoteStyle": "single"
    }
  },
  "linter": {
    "rules": {
      "a11y": {
        "all": true
      }
    }
  }
}
```

### Turborepo統合

```json
{
  "pipeline": {
    "lint": {
      "outputs": [],
      "cache": true
    },
    "format": {
      "outputs": ["**/*.{js,ts,jsx,tsx,json}"],
      "cache": true
    }
  }
}
```

```json
// package.json
{
  "scripts": {
    "lint": "turbo run lint",
    "format": "turbo run format"
  }
}
```

## 実践的なルール設定例

### Strictモード

```json
{
  "linter": {
    "rules": {
      "recommended": true,
      "correctness": {
        "all": true,
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "suspicious": {
        "all": true,
        "noExplicitAny": "error",
        "noConsoleLog": "warn"
      },
      "style": {
        "all": true,
        "useConst": "error",
        "noNonNullAssertion": "error"
      },
      "complexity": {
        "all": true,
        "noForEach": "error"
      }
    }
  }
}
```

### チーム標準設定

```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingComma": "es5",
      "semicolons": "always"
    }
  },
  "linter": {
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noConsoleLog": "warn"
      },
      "style": {
        "useConst": "error"
      }
    }
  },
  "organizeImports": {
    "enabled": true
  }
}
```

## パフォーマンスチューニング

### ファイル除外の最適化

```json
{
  "files": {
    "ignore": [
      "node_modules",
      "dist",
      "build",
      "coverage",
      ".next",
      ".nuxt",
      ".turbo",
      "*.min.js",
      "*.bundle.js"
    ],
    "include": [
      "src/**/*.ts",
      "src/**/*.tsx",
      "!src/**/*.test.ts"
    ]
  }
}
```

### 並列実行の活用

```bash
# デフォルトで並列実行される
npx @biomejs/biome check .

# スレッド数を指定
npx @biomejs/biome check --max-diagnostics=50 .
```

## トラブルシューティング

### よくある問題

**問題1: フォーマットがPrettierと異なる**

```json
{
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingComma": "all",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true
    }
  }
}
```

**問題2: 特定のファイルを無視したい**

```json
{
  "files": {
    "ignore": ["src/legacy/**"]
  }
}
```

**問題3: ルールを一時的に無効化**

```typescript
// biome-ignore lint/suspicious/noExplicitAny: legacy code
const data: any = {};

// 複数行
// biome-ignore lint/suspicious/noExplicitAny: legacy API
// biome-ignore lint/correctness/noUnusedVariables: needed for type inference
const unused: any = {};
```

## 今後の展望

Biomeは積極的に開発が進んでおり、以下の機能が予定されています。

- CSS/SCSS対応
- HTMLサポート
- より多くのルール追加
- パフォーマンス改善
- エディタ統合の強化

## まとめ

Biomeは、ESLintとPrettierを置き換える強力な代替ツールです。

**主な利点:**
- 圧倒的な高速性（25倍高速）
- オールインワンのツールチェーン
- ゼロコンフィグで即座に使える
- 段階的移行が可能
- 優れたエディタ統合

大規模プロジェクトやモノレポでは、Biomeのパフォーマンス向上が開発体験を大きく改善します。ESLint/Prettierからの移行も段階的に進められるため、既存プロジェクトでも採用しやすいツールです。
