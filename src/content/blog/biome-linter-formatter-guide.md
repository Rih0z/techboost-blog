---
title: 'Biome完全ガイド — ESLint + Prettierを置き換える超高速Rustベースツール'
description: 'BiomeでESLint + Prettierを置き換える完全ガイド。biome.json設定・リント規則・フォーマット・インポート整理・VSCode統合・CI/CD・既存プロジェクト移行・パフォーマンス比較まで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['Biome', 'ESLint', 'Prettier', 'TypeScript', '開発ツール']
---

JavaScriptおよびTypeScriptのプロジェクトにおいて、コードの品質担保には長らく「ESLint（リント）+ Prettier（フォーマット）」という2ツール構成が事実上の標準となっていた。しかし、この構成には複雑な設定・プラグイン競合・実行速度の問題が常に付きまとっていた。

2023年に登場した **Biome**（旧Rome）は、Rustで書かれた単一バイナリツールとして、リント・フォーマット・インポート整理を一括で高速処理する。Prettierのベンチマークと比べて **25倍以上高速** であり、設定も大幅にシンプルになる。

本記事では、Biomeのインストールから実践的な `biome.json` 設定・VSCode統合・CI/CD連携・既存プロジェクトからの移行まで、2000語を超える詳細解説で網羅する。

---

## 1. Biomeとは — ESLint + Prettierとの比較・Rustで超高速

### 従来ツールチェーンの課題

ESLint + Prettier構成には以下のような課題がある。

**設定の複雑さ**

最小構成でも `.eslintrc.json`・`.prettierrc`・`.eslintignore`・`.prettierignore` と複数ファイルが必要になる。TypeScript対応のために `@typescript-eslint/parser` と `@typescript-eslint/eslint-plugin` を追加し、Reactなら `eslint-plugin-react`・`eslint-plugin-react-hooks`・`eslint-plugin-jsx-a11y` を追加し、さらにPrettierと競合するESLintルールを無効にするための `eslint-config-prettier` も必要だ。`npm install` 後の `node_modules` を見ると、これらのパッケージだけで数百のサブ依存関係が追加される。

**ルール競合**

ESLintとPrettierは双方がコードスタイルに関するルールを持つため、設定を誤ると同じルールが相互に干渉してコードが循環修正される問題が起きる。`eslint-config-prettier` で競合を無効化するのが定石だが、設定の見通しが悪くなる。

**実行速度**

Node.jsベースのツールは起動オーバーヘッドが大きい。大規模プロジェクトでは `eslint .` の実行が数分かかることがあり、CIパイプラインのボトルネックになる。

### Biomeのアーキテクチャ

Biomeは上記の問題をすべて一度に解決する設計になっている。

**単一Rustバイナリ**

Biomeの実行コアはRustで書かれており、Node.jsランタイムが不要なネイティブバイナリとして動作する。Rustの所有権モデルによりメモリ安全かつゼロコスト抽象化を実現し、Node.jsより桁違いに高速な処理を可能にする。

**統一ツールチェーン**

ひとつのツール・ひとつの設定ファイルでリント・フォーマット・インポート整理をすべて処理する。設定は `biome.json` のみ。

**高精度なCST（Concrete Syntax Tree）パーサー**

Biomeは独自の高精度CSTパーサーを実装しており、エラーがあってもパースを継続できる（Error Recovery）。これにより構文エラーがあるファイルでも可能な限りリント・フォーマットを実行できる。

### パフォーマンス比較

公式ベンチマーク（Prettierのリポジトリ自体を対象に計測）では以下の結果が示されている。

| ツール | 実行時間 | 倍率 |
|--------|---------|------|
| Prettier | 8.9秒 | 1× |
| Biome | 0.35秒 | **25.4×** |

ESLintとの比較でも大規模プロジェクトでは5〜10倍以上の速度差が報告されている。

### Prettierとのフォーマット互換性

BiomeのフォーマッターはPrettier互換を目標として設計されており、出力の **96%以上がPrettierと同一** であることが公式に確認されている。既存プロジェクトをBiomeに移行しても、フォーマット上の差異は最小限に抑えられる。

---

## 2. インストール・初期化（biome init）

### npmでのインストール

```bash
# devDependencyとしてインストール
npm install --save-dev --save-exact @biomejs/biome

# yarnの場合
yarn add --dev --exact @biomejs/biome

# pnpmの場合
pnpm add --save-dev --save-exact @biomejs/biome

# bunの場合
bun add --dev --exact @biomejs/biome
```

`--save-exact` フラグを使用しているのは、Biomeがバージョン間でフォーマット出力が変わる可能性があるためだ。バージョンを固定することでCIと開発環境の出力が一致することを保証できる。

### 初期化

```bash
npx @biomejs/biome init
```

このコマンドを実行すると、プロジェクトルートに `biome.json` が生成される。

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": false,
    "clientKind": "git",
    "useIgnoreFile": false
  },
  "files": {
    "ignoreUnknown": false,
    "ignore": []
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
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
      "quoteStyle": "double"
    }
  }
}
```

### package.jsonへのスクリプト登録

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

`biome check` は lint・format・organizeImports を一括実行するため、通常はこのコマンドをメインで使用する。

---

## 3. biome.json設定（linter・formatter・organizeImports）

`biome.json` はBiomeのすべての設定を一元管理する中心ファイルだ。JSONとJSONc（コメント付きJSON）の両方がサポートされている。

### 完全設定例

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",

  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true,
    "defaultBranch": "main"
  },

  "files": {
    "ignoreUnknown": true,
    "ignore": [
      "dist",
      "build",
      ".next",
      "node_modules",
      "coverage",
      "*.min.js",
      "public/assets"
    ]
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
      "a11y": {
        "recommended": true,
        "noAccessKey": "error",
        "noAutofocus": "warn",
        "useAltText": "error",
        "useButtonType": "error",
        "useHtmlLang": "error",
        "useLandmarkContent": "warn"
      },
      "complexity": {
        "recommended": true,
        "noBannedTypes": "error",
        "noExtraBooleanCast": "error",
        "noForEach": "warn",
        "noMultipleSpacesInRegularExpressionLiterals": "error",
        "noUselessCatch": "error",
        "noUselessConstructor": "error",
        "noWith": "error",
        "useFlatMap": "warn",
        "useLiteralKeys": "error",
        "useOptionalChain": "warn"
      },
      "correctness": {
        "recommended": true,
        "noConstAssign": "error",
        "noConstantCondition": "error",
        "noEmptyPattern": "error",
        "noInvalidBuiltinInstantiation": "error",
        "noNewSymbol": "error",
        "noSelfAssign": "error",
        "noUndeclaredVariables": "error",
        "noUnreachable": "error",
        "noUnusedImports": "warn",
        "noUnusedVariables": "warn",
        "useArrayLiterals": "error",
        "useExhaustiveDependencies": "warn",
        "useHookAtTopLevel": "error",
        "useIsNan": "error"
      },
      "style": {
        "recommended": true,
        "noDefaultExport": "off",
        "noNegationElse": "warn",
        "noParameterAssign": "error",
        "noRestrictedGlobals": "off",
        "noVar": "error",
        "useBlockStatements": "off",
        "useCollapsedElseIf": "warn",
        "useConst": "error",
        "useDefaultParameterLast": "error",
        "useEnumInitializers": "error",
        "useExplicitLengthCheck": "off",
        "useFilenamingConvention": {
          "level": "warn",
          "options": {
            "strictCase": false,
            "requireAscii": true,
            "filenameCases": ["camelCase", "kebab-case", "PascalCase"]
          }
        },
        "useFragmentSyntax": "warn",
        "useNamingConvention": "off",
        "useSelfClosingElements": "warn",
        "useShorthandAssign": "warn",
        "useSingleVarDeclarator": "off",
        "useTemplate": "warn"
      },
      "suspicious": {
        "recommended": true,
        "noArrayIndexKey": "warn",
        "noAssignInExpressions": "error",
        "noAsyncPromiseExecutor": "error",
        "noCatchAssign": "error",
        "noClassAssign": "error",
        "noCommentText": "error",
        "noCompareNegZero": "error",
        "noConsole": "warn",
        "noConsoleLog": "warn",
        "noControlCharactersInRegex": "error",
        "noDebugger": "error",
        "noDoubleEquals": "error",
        "noDuplicateCase": "error",
        "noDuplicateClassMembers": "error",
        "noDuplicateObjectKeys": "error",
        "noDuplicateParameters": "error",
        "noEmptyBlockStatements": "warn",
        "noExplicitAny": "warn",
        "noFallthroughSwitchClause": "error",
        "noGlobalIsFinite": "error",
        "noGlobalIsNan": "error",
        "noLabelVar": "error",
        "noMisleadingInstantiator": "error",
        "noPrototypeBuiltins": "error",
        "noRedeclare": "error",
        "noShadowRestrictedNames": "error",
        "noUnsafeDeclarationMerging": "error",
        "noUnsafeNegation": "error",
        "useDefaultSwitchClauseLast": "warn",
        "useGetterReturn": "error",
        "useValidTypeof": "error"
      },
      "performance": {
        "recommended": true,
        "noAccumulatingSpread": "warn",
        "noDelete": "warn"
      },
      "security": {
        "noGlobalEval": "error",
        "noDangerouslySetInnerHtml": "warn",
        "noDangerouslySetInnerHtmlWithChildren": "error"
      },
      "nursery": {
        "useSortedClasses": "off"
      }
    }
  },

  "javascript": {
    "formatter": {
      "jsxSingleQuote": false,
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false,
      "quoteProperties": "asNeeded"
    },
    "parser": {
      "unsafeParameterDecoratorsEnabled": true
    },
    "globals": ["React", "__DEV__", "process"]
  },

  "json": {
    "formatter": {
      "enabled": true,
      "indentStyle": "space",
      "indentWidth": 2,
      "lineWidth": 80,
      "trailingCommas": "none"
    },
    "parser": {
      "allowComments": true,
      "allowTrailingCommas": false
    },
    "linter": {
      "enabled": true
    }
  },

  "css": {
    "formatter": {
      "enabled": true,
      "indentStyle": "space",
      "indentWidth": 2,
      "quoteStyle": "double"
    },
    "linter": {
      "enabled": true
    }
  },

  "overrides": [
    {
      "include": ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "off"
          },
          "correctness": {
            "noUnusedVariables": "off"
          }
        }
      }
    },
    {
      "include": ["scripts/**/*.js", "*.config.js", "*.config.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noConsole": "off",
            "noConsoleLog": "off"
          }
        }
      }
    }
  ]
}
```

### vcsセクション

```json
"vcs": {
  "enabled": true,
  "clientKind": "git",
  "useIgnoreFile": true,
  "defaultBranch": "main"
}
```

`useIgnoreFile: true` を設定すると、`.gitignore` の内容をBiomeの除外ファイルとして自動的に利用する。`.biomeignore` ファイルでBiome専用の除外設定も追加できる。

### overridesセクション

特定ディレクトリやファイルパターンに対して設定を上書きできる。テストファイルでは `noExplicitAny` を無効化する・設定ファイルでは `console.log` を許可するといった使い方が実践的だ。

---

## 4. リント規則（a11y・complexity・correctness・style・suspicious）

Biomeのリント規則は6つのカテゴリに整理されている。

### a11y（アクセシビリティ）

WAI-ARIAおよびHTMLアクセシビリティ標準に基づくルール群。

```json
"a11y": {
  "useAltText": "error",          // img要素にalt属性を必須化
  "useButtonType": "error",       // buttonのtype属性を必須化
  "useHtmlLang": "error",         // html要素のlang属性を必須化
  "noAccessKey": "error",         // accesskey属性の使用禁止
  "noAutofocus": "warn",          // autofocus属性の抑制
  "useAriaActivedescendantWithTabindex": "error",
  "useAriaPropsForRole": "error", // roleに対応するARIAプロパティを強制
  "useLandmarkContent": "warn"    // ランドマーク要素にコンテンツを要求
}
```

**実際のエラー例:**

```jsx
// BAD: alt属性なし
<img src="/logo.png" />

// GOOD: alt属性あり
<img src="/logo.png" alt="会社ロゴ" />

// BAD: button type未指定（フォーム内でsubmitとして動作する可能性）
<button onClick={handleClick}>クリック</button>

// GOOD: type明示
<button type="button" onClick={handleClick}>クリック</button>
```

### complexity（複雑度）

コードの複雑度を下げ、可読性を高めるルール群。

```json
"complexity": {
  "noExtraBooleanCast": "error",   // !!xのような冗長なキャストを禁止
  "noForEach": "warn",             // forEach → for...ofへの移行を推奨
  "useOptionalChain": "warn",      // && チェーン → ?. に置換
  "useFlatMap": "warn",            // .map().flat() → .flatMap()
  "useArrowFunction": "warn",      // function式 → アロー関数
  "useLiteralKeys": "error"        // obj["key"] → obj.key
}
```

**自動修正の例:**

```typescript
// Before: noExtraBooleanCast
const isValid = !!user?.name;

// After（自動修正）
const isValid = Boolean(user?.name);

// Before: useOptionalChain
const name = user && user.profile && user.profile.name;

// After（自動修正）
const name = user?.profile?.name;

// Before: useFlatMap
const items = arrays.map(arr => arr.items).flat();

// After（自動修正）
const items = arrays.flatMap(arr => arr.items);
```

### correctness（正確性）

バグを引き起こす可能性のあるパターンを検出するルール群。最も重要なカテゴリ。

```json
"correctness": {
  "noConstAssign": "error",         // const変数への再代入
  "noUndeclaredVariables": "error", // 未宣言変数の使用
  "noUnreachable": "error",         // 到達不能コード
  "noUnusedImports": "warn",        // 未使用のimport
  "noUnusedVariables": "warn",      // 未使用の変数
  "useExhaustiveDependencies": "warn", // React useEffect依存配列
  "useHookAtTopLevel": "error",     // Hooksのトップレベル呼び出しを強制
  "useIsNan": "error"               // NaN比較にisNaN()を強制
}
```

**Reactの依存配列チェック例:**

```typescript
// BAD: count が依存配列に含まれていない
useEffect(() => {
  console.log(count);
}, []); // Biome: useExhaustiveDependencies

// GOOD
useEffect(() => {
  console.log(count);
}, [count]);
```

### style（スタイル）

コードスタイルの統一を促進するルール群。

```json
"style": {
  "noVar": "error",                // var → const/let
  "useConst": "error",             // 再代入されない変数にconst強制
  "useTemplate": "warn",           // 文字列連結 → テンプレートリテラル
  "useFragmentSyntax": "warn",     // <React.Fragment> → <>
  "useSelfClosingElements": "warn" // <div></div> → <div /> (内容空の場合)
}
```

**自動修正の例:**

```typescript
// Before: useTemplate
const message = "Hello, " + name + "! You are " + age + " years old.";

// After
const message = `Hello, ${name}! You are ${age} years old.`;

// Before: useFragmentSyntax
return <React.Fragment><Header /><Main /></React.Fragment>;

// After
return <><Header /><Main /></>;
```

### suspicious（疑わしいコード）

バグの温床になりやすい疑わしいパターンを検出するルール群。

```json
"suspicious": {
  "noDoubleEquals": "error",       // == → === への変換強制
  "noExplicitAny": "warn",         // TypeScript の any 型
  "noDebugger": "error",           // debugger文の禁止
  "noConsole": "warn",             // console使用の抑制
  "noArrayIndexKey": "warn",       // React key={index}の抑制
  "noDuplicateObjectKeys": "error" // オブジェクトの重複キー
}
```

### performance（パフォーマンス）

パフォーマンスに影響するパターンを検出するルール群。

```json
"performance": {
  "noAccumulatingSpread": "warn",  // reduceでのスプレッド累積を警告
  "noDelete": "warn"               // deleteオペレータの使用を警告
}
```

---

## 5. フォーマット設定（インデント・セミコロン・クォート・行長）

Biomeのフォーマッターはグローバル設定と言語別設定の2層構造になっている。

### グローバルフォーマット設定

```json
"formatter": {
  "enabled": true,
  "indentStyle": "space",   // "tab" | "space"
  "indentWidth": 2,         // 2 | 4（tab幅またはスペース数）
  "lineEnding": "lf",       // "lf" | "crlf" | "cr"
  "lineWidth": 100,         // 1行の最大文字数（デフォルト80）
  "attributePosition": "auto" // HTML/JSX属性の改行位置
}
```

**indentStyleについて:**

Biomeのデフォルトは `"tab"` だが、多くの既存プロジェクトはスペース2つを使用しているため、移行時は `"space"` + `"indentWidth": 2` に設定することが多い。

### JavaScript/TypeScript フォーマット設定

```json
"javascript": {
  "formatter": {
    "quoteStyle": "single",          // "single" | "double"
    "jsxSingleQuote": false,         // JSX属性のクォートスタイル
    "trailingCommas": "all",         // "all" | "es5" | "none"
    "semicolons": "always",          // "always" | "asNeeded"
    "arrowParentheses": "always",    // "always" | "asNeeded"
    "bracketSpacing": true,          // { key: value } のスペース
    "bracketSameLine": false,        // JSX終了ブラケットの位置
    "quoteProperties": "asNeeded"    // オブジェクトキーのクォート
  }
}
```

**trailingCommasの違い:**

```typescript
// "none"
const obj = {
  a: 1,
  b: 2
}

// "es5"（ES5有効な場所のみ）
const obj = {
  a: 1,
  b: 2,  // ← 末尾カンマあり
}

// "all"（関数引数も含む）
function foo(
  param1: string,
  param2: number,  // ← 引数末尾にもカンマ
) {}
```

**semicolonsの違い:**

```typescript
// "always"
const x = 1;
const y = 2;

// "asNeeded"（ASI依存、セミコロン省略）
const x = 1
const y = 2
```

### JSONフォーマット設定

```json
"json": {
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80,
    "trailingCommas": "none"
  }
}
```

JSONにはトレーリングカンマを含められないため、`"none"` が唯一の有効値だ。

### CSSフォーマット設定

Biome 1.5以降、CSSのフォーマットにも対応した。

```json
"css": {
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "quoteStyle": "double"
  },
  "linter": {
    "enabled": true
  }
}
```

---

## 6. インポート整理（organizeImports）

BiomeはESLintの `import/order` や `simple-import-sort` プラグインに相当するインポート整理機能を内蔵している。

```json
"organizeImports": {
  "enabled": true
}
```

### 整理のルール

Biomeのインポート整理は以下の順序でグループ化・ソートを行う。

1. ビルトインモジュール（`node:`プレフィックス or Node.js組み込み）
2. 外部パッケージ（`node_modules`）
3. 内部モジュール（相対パス・エイリアス）

```typescript
// Before（整理前）
import { useState } from 'react';
import fs from 'fs';
import { Button } from '@/components/ui/button';
import { formatDate } from '../../utils/date';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';

// After（Biome整理後）
import fs from 'node:fs';

import axios from 'axios';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '../../utils/date';
```

### 副作用インポートの保持

副作用インポート（`import './styles.css'`）はソート対象外となり、元の順序が保持される。これは副作用インポートの順序が動作に影響するケースがあるためだ。

```typescript
// この順序は保持される
import './polyfills';      // 先に実行される必要がある
import './global.css';
import App from './App';
```

---

## 7. VSCode統合（biome拡張機能・format on save）

### 拡張機能のインストール

VSCode Marketplaceから **"Biome"**（`biomejs.biome`）をインストールする。

```bash
# コマンドラインからインストール
code --install-extension biomejs.biome
```

### .vscode/settings.json の設定

プロジェクトルートに `.vscode/settings.json` を作成してチーム全員に設定を共有する。

```json
{
  // BiomeをJavaScript/TypeScriptのデフォルトフォーマッターに設定
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "[jsonc]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "[css]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },

  // 保存時にコードアクション（インポート整理・自動修正）を実行
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },

  // ESLint拡張機能との競合を避けるため無効化（Biome移行済みプロジェクト）
  "eslint.enable": false
}
```

### 推奨拡張機能の設定

`.vscode/extensions.json` でチームメンバーへの拡張機能インストールを推奨する。

```json
{
  "recommendations": [
    "biomejs.biome"
  ]
}
```

### マルチルートワークスペース対応

モノレポなど複数のプロジェクトを含むワークスペースでは、各プロジェクトディレクトリに `biome.json` を配置することで、それぞれ異なる設定を適用できる。Biomeは実行ファイルから上位ディレクトリを辿って最初に見つかった `biome.json` を使用する。

---

## 8. CLI使用法（check・format・lint・ci）

BiomeのCLIは4つの主要コマンドを提供する。

### biome check

最も汎用的なコマンド。リント・フォーマット・インポート整理を一括実行する。

```bash
# 問題の検出（修正なし）
npx biome check .

# 安全な自動修正を適用
npx biome check --write .

# 安全でない修正も含めて適用（注意が必要）
npx biome check --write --unsafe .

# 特定ファイル・ディレクトリのみ
npx biome check src/

# 変更ファイルのみ（Gitステージング済みファイル）
npx biome check --staged .
```

### biome format

フォーマットのみを実行する。

```bash
# フォーマット結果をプレビュー（ファイル変更なし）
npx biome format .

# フォーマットを実際に適用
npx biome format --write .

# 特定ファイル
npx biome format --write src/components/Button.tsx

# stdinからの入力を処理
echo "const x={a:1,b:2}" | npx biome format --stdin-file-path test.ts
```

### biome lint

リントのみを実行する。

```bash
# リント実行
npx biome lint .

# 安全な自動修正を適用
npx biome lint --write .

# 特定ルールのみ実行
npx biome lint --only=correctness/noUnusedVariables .

# 特定ルールをスキップ
npx biome lint --skip=suspicious/noConsole .
```

### biome ci

CI環境向けコマンド。終了コードでパス/フェイルを返す。`--write` フラグが使用できず、問題があれば非ゼロで終了する。

```bash
npx biome ci .
```

### biome migrate

ESLint・Prettierの設定ファイルをBiomeに移行するコマンド（後述）。

```bash
npx biome migrate eslint --write
npx biome migrate prettier --write
```

### 診断レベル・出力フォーマット

```bash
# JSON形式で出力（他ツールとの連携）
npx biome check --reporter=json .

# GitHubアノテーション形式（GitHub Actionsで使用）
npx biome ci --reporter=github .

# 詳細な診断情報
npx biome check --verbose .
```

### ファイル内でのルール無効化

特定の行やブロックでルールを無効化する場合はコメントを使用する。

```typescript
// 次の行のルールを無効化
// biome-ignore lint/suspicious/noConsole: デバッグ用
console.log('debug info');

// ブロック全体を無効化
/* biome-ignore lint/correctness/noUnusedVariables: 外部から使用 */
export const _internalHelper = () => {};

// フォーマットを無効化
// biome-ignore format: 手動整形が必要なテーブル
const table = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
```

---

## 9. pre-commitフック（lint-staged・husky統合）

コミット前に自動でリント・フォーマットを実行することで、問題のあるコードをリポジトリに混入させない。

### husky + lint-staged のセットアップ

```bash
# huskyとlint-stagedをインストール
npm install --save-dev husky lint-staged

# huskyの初期化
npx husky init
```

**package.json の設定:**

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx,json,css}": [
      "biome check --write --no-errors-on-unmatched --files-ignore-unknown=true"
    ]
  }
}
```

**.husky/pre-commit:**

```bash
#!/usr/bin/env sh
npx lint-staged
```

### Biome単体でのpre-commitフック

lint-stagedを使わずBiomeのみで実現する方法もある。

**.husky/pre-commit:**

```bash
#!/usr/bin/env sh

# ステージングされたファイルのみチェック
npx biome check --staged --write .

# 修正されたファイルを再ステージング
git diff --name-only --diff-filter=ACMR | xargs git add
```

### lefthookを使った代替構成

lefthookはhusky + lint-stagedの代替となるツールで、Go製のため高速だ。

```bash
npm install --save-dev lefthook
```

**lefthook.yml:**

```yaml
pre-commit:
  parallel: true
  commands:
    biome-check:
      glob: "*.{js,jsx,ts,tsx}"
      run: npx biome check --write --staged {staged_files}
      stage_fixed: true
    biome-json:
      glob: "*.json"
      run: npx biome format --write {staged_files}
      stage_fixed: true
```

---

## 10. TypeScript対応（型チェックとの分離）

Biomeは重要な点でTypeScriptコンパイラ（`tsc`）とは役割が異なる。

### BiomeとTypeScriptコンパイラの分業

| 機能 | Biome | TypeScript compiler |
|------|-------|-------------------|
| 構文エラー検出 | ○ | ○ |
| 型エラー検出 | × | ○ |
| リント（コードパターン） | ○ | △（一部） |
| フォーマット | ○ | × |
| トランスパイル | × | ○ |

Biomeは型情報を必要としないルールのみを実装している。型情報が必要なルール（例: `@typescript-eslint/no-floating-promises`）はBiomeでは提供されていない。型チェックには引き続き `tsc --noEmit` が必要だ。

### TypeScript固有のBiomeルール

```json
"typescript": {
  "linter": {
    "enabled": true
  }
}
```

BiomeはTypeScriptファイルを自動検出し、TypeScript固有の構文を解析する。追加の設定なしにTypeScriptが扱える。

### TypeScript固有ルールの例

```typescript
// noExplicitAny: any型の使用を警告
function process(data: any) { // Biome警告
  return data;
}

// noUnsafeDeclarationMerging: 宣言マージの問題を検出
interface Foo {
  bar: string;
}
class Foo {} // エラー: interfaceとclassの宣言マージ

// useEnumInitializers: enumの値を明示化
enum Direction {
  Up,     // Biome警告: 値を明示すべき
  Down,
}

// 修正後
enum Direction {
  Up = "UP",
  Down = "DOWN",
}
```

### tsconfig.jsonとの連携

BiomeはTypeScriptのパス解決（`paths`・`baseUrl`）を直接読み込まないため、エイリアスパスに対するルールが誤検知することがある。`biome.json` の `javascript.globals` や `overrides` で調整する。

```json
"overrides": [
  {
    "include": ["src/**/*"],
    "javascript": {
      "globals": ["__APP_VERSION__", "__BUILD_DATE__"]
    }
  }
]
```

---

## 11. React/Vue対応（JSX・テンプレート）

### React JSXのサポート

BiomeはReact JSXをネイティブにサポートしており、追加プラグインは不要だ。

```json
"javascript": {
  "formatter": {
    "jsxSingleQuote": false,    // JSX属性にダブルクォートを使用
    "bracketSameLine": false    // JSX終了 > を新しい行に配置
  }
}
```

**JSXフォーマット例:**

```tsx
// bracketSameLine: false（デフォルト）
<Button
  variant="primary"
  onClick={handleClick}
  disabled={isLoading}
>
  送信
</Button>

// bracketSameLine: true
<Button
  variant="primary"
  onClick={handleClick}
  disabled={isLoading}>
  送信
</Button>
```

### React固有のリントルール

```json
"correctness": {
  "useExhaustiveDependencies": "warn",  // useEffect依存配列の検証
  "useHookAtTopLevel": "error"           // Hooksのトップレベル呼び出し
},
"suspicious": {
  "noArrayIndexKey": "warn"             // key={index}の警告
},
"style": {
  "useFragmentSyntax": "warn",          // <React.Fragment> → <>
  "useSelfClosingElements": "warn"      // 空要素の自己終了タグ
},
"security": {
  "noDangerouslySetInnerHtml": "warn"  // XSS対策
}
```

### Vueのサポート状況

Biome 1.9時点ではVue Single File Component（`.vue`）の完全サポートはまだ実験的な段階にある。BiomeはVueファイル内の `<script>` ブロックのJavaScript/TypeScriptを処理できるが、`<template>` ブロックのVueLSP固有の構文は処理対象外だ。

Vueプロジェクトでは現状、`<template>` のリントには `eslint-plugin-vue` を継続使用し、`<script>` ブロックのフォーマットのみBiomeに移行するハイブリッド構成も現実的な選択肢だ。

---

## 12. ESLint/Prettierからの移行手順

### 移行コマンドの実行

Biomeは公式の移行ヘルパーコマンドを提供している。

```bash
# Prettierの設定を移行
npx biome migrate prettier --write

# ESLintの設定を移行
npx biome migrate eslint --write

# 両方まとめて実行
npx biome migrate prettier --write && npx biome migrate eslint --write
```

これらのコマンドは既存の `.prettierrc`・`.eslintrc.*` を読み込み、対応するBiomeルールに変換して `biome.json` を生成・更新する。

### 移行ステップ詳細

**Step 1: Biomeをインストール**

```bash
npm install --save-dev --save-exact @biomejs/biome
npx biome init
```

**Step 2: 移行コマンドで設定を変換**

```bash
npx biome migrate prettier --write
npx biome migrate eslint --write
```

**Step 3: biome.jsonを確認・調整**

自動変換で対応できないルール（ESLint固有のプラグインルールなど）はコメントとして `biome.json` に記録される。手動で対応するBiomeルールを設定するか、不要なものは削除する。

**Step 4: フォーマット差分を確認**

```bash
# 現在のコードに対してBiomeフォーマットを実行
npx biome format --write .

# git diffでフォーマット差分を確認
git diff --stat
```

Prettierとの互換性は96%以上だが、一部のケースで差異が生じることがある。差異が許容できるか確認する。

**Step 5: リント問題を解消**

```bash
# 自動修正を適用
npx biome check --write .

# 残った問題を手動で修正
npx biome check .
```

**Step 6: ESLint/Prettierの依存関係を削除**

```bash
npm uninstall eslint prettier \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-config-prettier \
  eslint-plugin-prettier \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-jsx-a11y \
  eslint-plugin-import
```

**Step 7: 設定ファイルを削除**

```bash
rm -f .eslintrc.js .eslintrc.json .eslintrc.yaml .eslintrc.cjs
rm -f .prettierrc .prettierrc.js .prettierrc.json .prettierignore
rm -f .eslintignore
```

**Step 8: package.jsonのスクリプトを更新**

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

### 移行時の注意点

**対応していないESLintルール**

BiomeはESLintのすべてのルールをカバーしていない。特に型情報を必要とするTypeScript ESLintルールは対応外だ。重要なルールが移行できない場合は、ESLintをBiomeと並行して一部機能に限定して使用する方法もある。

**Biome未対応ルールの主な例:**
- `@typescript-eslint/no-floating-promises`
- `@typescript-eslint/await-thenable`
- `import/no-cycle`（循環依存の検出）

---

## 13. GitHub Actions CI統合

### 基本的なCI設定

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  biome:
    name: Biome Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Biome
        run: npx biome ci --reporter=github .
```

`--reporter=github` フラグを使用すると、BiomeのエラーがGitHub上のPRのアノテーションとして表示される。

### GitHub Actions公式アクションの使用

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  biome:
    name: Biome Check
    runs-on: ubuntu-latest

    permissions:
      contents: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Biome
        uses: biomejs/setup-biome@v2
        with:
          version: latest

      - name: Run Biome CI
        run: biome ci .
```

`biomejs/setup-biome` アクションはBiomeバイナリをキャッシュするため、Node.jsのインストールが不要で実行速度が速い。

### モノレポ対応CI設定

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  biome:
    name: Biome Check
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: [frontend, backend, shared]

    steps:
      - uses: actions/checkout@v4

      - uses: biomejs/setup-biome@v2
        with:
          version: latest

      - name: Run Biome in ${{ matrix.package }}
        run: biome ci packages/${{ matrix.package }}
```

### キャッシュ最適化

```yaml
- name: Cache Biome binary
  uses: actions/cache@v4
  with:
    path: ~/.cache/biome
    key: biome-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

- name: Install dependencies
  run: npm ci

- name: Run Biome CI
  run: npx biome ci --reporter=github .
```

### PR差分のみをチェック

大規模プロジェクトでCIを高速化するため、変更されたファイルのみをチェックする設定も可能だ。

```yaml
- name: Get changed files
  id: changed-files
  uses: tj-actions/changed-files@v44
  with:
    files: |
      **/*.{js,jsx,ts,tsx,json,css}

- name: Run Biome on changed files
  if: steps.changed-files.outputs.any_changed == 'true'
  run: |
    npx biome check ${{ steps.changed-files.outputs.all_changed_files }}
```

### biome.jsonのバリデーション

`biome.json` は構造が複雑になるにつれ、設定ミスが起きやすくなる。スキーマバリデーションを活用することで、設定ファイルのミスを事前に検出できる。

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json"
}
```

VSCodeのJSON Language Serverはこのスキーマを利用して `biome.json` の入力補完・バリデーションを提供する。また、JSON設定ファイルの検証・整形には **[DevToolBox](https://usedevtools.com/)** のJSONフォーマッター・バリデーターが便利だ。`biome.json` のJSON構造チェック・整形・スキーマとの差異確認をブラウザ上で手軽に行えるため、設定作業の効率が上がる。

---

## パフォーマンス最適化のヒント

### .biomeignoreの活用

```text
# .biomeignore
dist/
build/
.next/
.nuxt/
coverage/
node_modules/
**/*.min.js
**/*.d.ts
public/vendor/
storybook-static/
```

`.gitignore` を自動参照する設定（`vcs.useIgnoreFile: true`）と組み合わせることで、対象外ファイルの処理を削減できる。

### プロジェクト規模別の推奨設定

**小〜中規模プロジェクト（〜5万行）:**

```json
{
  "linter": {
    "rules": {
      "recommended": true
    }
  }
}
```

`recommended: true` のデフォルトルールセットで十分。

**大規模プロジェクト（5万行〜）:**

```json
{
  "linter": {
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "off"
      }
    }
  },
  "overrides": [
    {
      "include": ["**/*.generated.ts"],
      "linter": {
        "enabled": false
      },
      "formatter": {
        "enabled": false
      }
    }
  ]
}
```

自動生成ファイル（gRPC・GraphQL・OpenAPIから生成されたファイルなど）はリント・フォーマット対象から除外する。

---

## まとめ

BiomeはESLint + Prettierの複雑な設定・依存関係・実行速度の問題をRust製単一ツールで解決する。主なポイントをまとめると：

| 観点 | ESLint + Prettier | Biome |
|------|-------------------|-------|
| 設定ファイル数 | 4〜8ファイル | 1ファイル（biome.json） |
| 依存パッケージ数 | 20〜50以上 | 1（@biomejs/biome） |
| 実行速度 | 基準 | **25倍以上高速** |
| TypeScript対応 | プラグイン必要 | ネイティブ対応 |
| インポート整理 | 別途プラグイン | **内蔵** |
| CSSサポート | eslint-plugin-css | **内蔵（1.5+）** |
| 移行コスト | — | `biome migrate` で自動化 |

2025年以降の新規プロジェクトではBiomeを第一選択として検討することを強く推奨する。既存プロジェクトも `biome migrate` コマンドで段階的な移行が可能だ。

設定ファイルの管理や `biome.json` のJSONバリデーションには **[DevToolBox](https://usedevtools.com/)** のJSON関連ツールを活用することで、開発効率をさらに高められる。

---

## 参考リソース

- [Biome公式ドキュメント](https://biomejs.dev/)
- [Biome GitHub リポジトリ](https://github.com/biomejs/biome)
- [Biome Playground](https://biomejs.dev/playground/)
- [biome.json スキーマリファレンス](https://biomejs.dev/reference/configuration/)
- [Biome vs Prettier パフォーマンス比較](https://biomejs.dev/blog/biome-v1-5/)
- [ESLintからの移行ガイド](https://biomejs.dev/guides/migrate-eslint-prettier/)
