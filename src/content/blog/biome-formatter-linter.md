---
title: "Biome統合フォーマッター・リンター完全ガイド - Prettier/ESLintからの移行と高速化"
description: "BiomeによるPrettier/ESLint統合の完全ガイド。インストール、設定、移行手順、CI/CD統合、VSCode設定、パフォーマンス比較まで実践的に解説します。"
pubDate: "2025-02-05"
tags: ["biome", "linter", "formatter", "prettier", "eslint", "tooling", "dx"]
---

Biomeは、PrettierとESLintを統合した次世代のツールチェーンです。Rustで書かれており、**従来のツールと比べて最大100倍高速**に動作します。2024年にv1.0がリリースされ、本番環境での使用が推奨されるレベルに到達しました。

この記事では、Biomeの導入から既存プロジェクトの移行、CI/CD統合、チーム開発での運用まで実践的に解説します。

## Biomeとは何か

### 従来のツールチェーンの課題

```json
// ❌ 従来: 複数ツールの設定ファイル
// .prettierrc.json
{
  "semi": false,
  "singleQuote": true
}

// .eslintrc.json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "plugins": ["@typescript-eslint", "import", "react-hooks"],
  "rules": { ... }
}

// .editorconfig
// tsconfig.json
// ...

// 問題点:
// - 設定ファイルが分散
// - node_modulesが肥大化（200MB+）
// - 実行速度が遅い（大規模プロジェクトで数十秒）
// - ツール間の競合
```

### Biomeによる統一

```json
// ✅ Biome: 1つの設定ファイル
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.5.0/schema.json",
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
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  }
}

// 利点:
// - 単一バイナリ（10MB程度）
// - 超高速（Rustネイティブ）
// - 設定が集約
// - フォーマット・リントが統合
```

## インストールとセットアップ

### 新規プロジェクト

```bash
# Biomeインストール
npm install --save-dev --save-exact @biomejs/biome

# または
pnpm add -D -E @biomejs/biome
yarn add -D -E @biomejs/biome

# 初期化
npx @biomejs/biome init
```

### package.jsonスクリプト

```json
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --write .",
    "ci": "biome ci ."
  }
}
```

### 基本的な設定ファイル

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.5.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "warn"
      },
      "complexity": {
        "noForEach": "off"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingComma": "es5",
      "semicolons": "asNeeded",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false
    }
  },
  "files": {
    "ignoreUnknown": false,
    "ignore": [
      "node_modules",
      "dist",
      "build",
      ".next",
      "coverage"
    ]
  }
}
```

## Prettier/ESLintからの移行

### 移行前のチェック

```bash
# 現在の設定を確認
cat .prettierrc.json .eslintrc.json

# Biome移行ヘルパー使用
npx @biomejs/biome migrate --write
```

### Prettier設定の移行

```json
// .prettierrc.json → biome.json

// Before (Prettier)
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": false,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always"
}

// After (Biome)
{
  "formatter": {
    "lineWidth": 100,
    "indentWidth": 2,
    "indentStyle": "space"
  },
  "javascript": {
    "formatter": {
      "semicolons": "asNeeded",
      "quoteStyle": "single",
      "quoteProperties": "asNeeded",
      "jsxQuoteStyle": "double",
      "trailingComma": "es5",
      "bracketSpacing": true,
      "bracketSameLine": false,
      "arrowParentheses": "always"
    }
  }
}
```

### ESLint設定の移行

```json
// .eslintrc.json → biome.json

// Before (ESLint)
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}

// After (Biome)
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noConsoleLog": "warn",
        "noExplicitAny": "warn"
      },
      "correctness": {
        "noUnusedVariables": "error"
      }
    }
  }
}
```

### 段階的移行戦略

```bash
# ステップ1: Biomeインストール（既存ツールは残す）
pnpm add -D @biomejs/biome

# ステップ2: 並行運用期間
# package.json
{
  "scripts": {
    "lint:old": "eslint .",
    "lint:new": "biome lint .",
    "format:old": "prettier --write .",
    "format:new": "biome format --write ."
  }
}

# ステップ3: 差分確認
npm run format:old
npm run format:new
git diff  # 差分がほぼないことを確認

# ステップ4: 古いツール削除
pnpm remove eslint prettier @typescript-eslint/eslint-plugin # ...
rm .eslintrc.json .prettierrc.json

# ステップ5: Biomeに統一
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --write ."
  }
}
```

## VSCode統合

### 拡張機能インストール

```json
// .vscode/extensions.json
{
  "recommendations": [
    "biomejs.biome"
  ],
  "unwantedRecommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

### VSCode設定

```json
// .vscode/settings.json
{
  // Biomeを有効化
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },

  // 特定言語でのみ有効化
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
  },

  // Prettier/ESLintを無効化
  "prettier.enable": false,
  "eslint.enable": false
}
```

### ワークスペース推奨設定

```json
// .vscode/settings.json（チーム共有用）
{
  "files.associations": {
    "*.css": "css",
    "*.json": "jsonc"
  },
  "biome.lspBin": "./node_modules/@biomejs/biome/bin/biome",
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

## リンタールール詳細設定

### カテゴリ別ルール設定

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,

      // A11y（アクセシビリティ）
      "a11y": {
        "noSvgWithoutTitle": "error",
        "useAltText": "error",
        "useButtonType": "warn"
      },

      // 複雑さ
      "complexity": {
        "noBannedTypes": "error",
        "noUselessTypeConstraint": "error",
        "noExtraBooleanCast": "error",
        "noForEach": "off"  // forEachを許可
      },

      // 正確性
      "correctness": {
        "noUnusedVariables": "error",
        "noUndeclaredVariables": "error",
        "useExhaustiveDependencies": "warn"  // React hooksの依存配列
      },

      // セキュリティ
      "security": {
        "noDangerouslySetInnerHtml": "warn"
      },

      // スタイル
      "style": {
        "noNonNullAssertion": "off",  // TypeScriptの ! 許可
        "useImportType": "error",     // import type強制
        "useConst": "error",
        "noVar": "error"
      },

      // 疑わしいコード
      "suspicious": {
        "noExplicitAny": "warn",
        "noArrayIndexKey": "warn",  // React key={index} 警告
        "noConsoleLog": "warn",
        "noDebugger": "error"
      }
    }
  }
}
```

### ファイル・パスごとのオーバーライド

```json
{
  "linter": {
    "enabled": true,
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
            "noExplicitAny": "off"  // テストではanyを許可
          }
        }
      }
    },
    {
      "include": ["scripts/**/*.js"],
      "linter": {
        "rules": {
          "suspicious": {
            "noConsoleLog": "off"  // スクリプトではconsole.log許可
          }
        }
      }
    },
    {
      "include": ["src/**/*.tsx"],
      "formatter": {
        "lineWidth": 120  // React JSXは行長を緩和
      }
    }
  ]
}
```

## コマンドラインの使い方

### フォーマット

```bash
# チェックのみ（変更なし）
biome format .

# 修正を適用
biome format --write .

# 特定ファイルのみ
biome format --write src/index.ts

# 標準入力からフォーマット
echo "const x={a:1}" | biome format --stdin-file-path=test.js
```

### リント

```bash
# リントチェック
biome lint .

# 自動修正適用
biome lint --write .

# 特定ルールのみ適用
biome lint --only=suspicious/noConsoleLog .

# 診断レベル指定
biome lint --diagnostic-level=warn .
```

### 統合コマンド（check）

```bash
# フォーマット + リント + インポート整理を一括実行
biome check --write .

# CIモード（修正なし、エラーで終了）
biome ci .

# 変更されたファイルのみチェック
git diff --name-only --diff-filter=ACMR | xargs biome check --write
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
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run Biome
        run: pnpm biome ci .

      - name: Biome報告をPRコメントに投稿
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ Biomeチェックが失敗しました。`pnpm check` を実行してください。'
            })
```

### pre-commitフック（Husky + lint-staged）

```bash
# Huskyとlint-stagedインストール
pnpm add -D husky lint-staged

# Husky初期化
npx husky init
```

```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{js,ts,jsx,tsx,json}": [
      "biome check --write --no-errors-on-unmatched"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### GitLab CI

```yaml
# .gitlab-ci.yml
biome:
  image: node:20
  stage: test
  script:
    - npm ci
    - npx @biomejs/biome ci .
  only:
    - merge_requests
    - main
```

## パフォーマンス比較

### ベンチマーク（中規模プロジェクト: 1000ファイル）

```bash
# ESLint + Prettier
time npm run lint:old
# 実行時間: 18.2秒

# Biome
time npm run check
# 実行時間: 0.3秒

# 約60倍高速！
```

### 大規模モノレポでの比較

```bash
# プロジェクト規模: 5000ファイル、200万行

# 従来ツール
ESLint:   2分30秒
Prettier: 45秒
合計:     3分15秒

# Biome
フォーマット + リント: 1.8秒

# 約100倍高速！
```

### メモリ使用量比較

```
ESLint + Prettier: 800MB
Biome:             120MB

# メモリ使用量 85% 削減
```

## 高度な設定パターン

### モノレポ設定

```json
// apps/web/biome.json
{
  "extends": ["../../biome.json"],  // ルート設定を継承
  "formatter": {
    "lineWidth": 120  // このパッケージのみ行長を変更
  },
  "linter": {
    "rules": {
      "correctness": {
        "useExhaustiveDependencies": "error"  // Reactアプリなので厳格に
      }
    }
  }
}
```

```json
// packages/shared/biome.json
{
  "extends": ["../../biome.json"],
  "linter": {
    "rules": {
      "suspicious": {
        "noConsoleLog": "error"  // ライブラリなのでconsole.log禁止
      }
    }
  }
}
```

### プラグイン風のカスタムルール（外部ツール連携）

```bash
# Biomeはプラグインシステムがないため、
# カスタムルールは外部ツールと組み合わせる

# 例: type-coverageでTypeScriptの型カバレッジチェック
pnpm add -D type-coverage

# package.json
{
  "scripts": {
    "check": "biome check --write . && type-coverage --at-least 95"
  }
}
```

## トラブルシューティング

### よくある問題と解決策

```bash
# 問題1: Biomeが認識されない
# 解決: パスを明示的に指定
npx @biomejs/biome check .

# 問題2: VSCodeで動作しない
# 解決: Biome拡張機能を再インストール
# 1. 拡張機能をアンインストール
# 2. VSCode再起動
# 3. 拡張機能を再インストール

# 問題3: 既存コードとの互換性
# 解決: ignoreパターンを追加
{
  "files": {
    "ignore": ["legacy/**", "vendor/**"]
  }
}

# 問題4: パフォーマンスが遅い
# 解決: ignoreパターンを最適化
{
  "files": {
    "ignore": [
      "node_modules",
      "dist",
      "build",
      ".next",
      "coverage",
      "**/*.min.js",
      "**/*.bundle.js"
    ]
  }
}
```

## まとめ

Biomeは以下のプロジェクトで特に有効です:

**最適なユースケース:**
- TypeScript/JavaScriptプロジェクト全般
- モノレポ（Turborepo、Nx等）
- CI/CDパイプラインの高速化が必要
- チーム開発での統一ツールチェーン
- 大規模プロジェクト（1000+ ファイル）

**移行のメリット:**
- **超高速**: 従来比60〜100倍高速
- **シンプル**: 設定ファイル1つに集約
- **軽量**: node_modules削減（200MB→10MB）
- **DX向上**: VSCode統合、エラーメッセージが明確

**移行時の注意点:**
- 一部ESLintプラグイン（eslint-plugin-react-hooks等）は代替手段が必要
- カスタムルールはまだサポートされていない
- エコシステムはまだ成長中（今後のアップデートに期待）

Biome v1.0のリリースにより、本番環境での使用が推奨されるレベルに到達しました。特にパフォーマンスと開発体験の向上は劇的で、新規プロジェクトでは第一選択肢となるでしょう。
