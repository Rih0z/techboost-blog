---
title: 'ESLint 9 Flat Config 完全ガイド — 新設定システムへの移行と実践設定'
description: 'ESLint 9の新しいFlat Config（eslint.config.js）への移行ガイド。TypeScript、React、Next.js、Prettierとの統合設定を実例で解説。'
pubDate: 'Feb 21 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['ESLint', 'TypeScript', 'Linting', 'JavaScript', 'DevTool']
---

2024年4月、ESLint 9.0.0がリリースされ、設定システムが根本から刷新された。長年親しまれてきた `.eslintrc.js` ベースの「レガシーconfig」に代わり、**Flat Config（eslint.config.js）**が新たなデフォルトとなった。ESLint 10ではレガシーconfigのサポートが完全に廃止される予定であり、今こそ移行を検討する時期だ。

Flat Configは単なる設定ファイル名の変更ではなく、プラグイン解決の仕組み・グローバル変数の扱い・無視パターンの指定方法など、あらゆる面で設計が見直された。最初は戸惑う部分もあるが、理解すればはるかにシンプルで予測可能な設定体系であることが分かる。

本記事では、Flat Configの概念から始まり、TypeScript・React・Next.js・Prettierとの実践的な統合設定、カスタムルールの作成、VSCode連携、CI/CD対応、移行戦略まで、実際のコード例を交えながら徹底解説する。

---

## 1. ESLint 9 の主要変更点 — Flat Config vs 旧 .eslintrc

### 旧来の設定システム（レガシーconfig）の問題点

ESLint 8以前の `.eslintrc.js`（または `.eslintrc.json`・`.eslintrc.yaml`）には、長年にわたって指摘されてきた構造的な問題がある。

**暗黙的なファイル探索とカスケード**

`.eslintrc` ファイルはディレクトリを遡りながら自動的にマージされる仕組みがある。プロジェクトルートだけでなく、`packages/` や `apps/` の各サブディレクトリにも個別の `.eslintrc` を置けるが、どの設定が最終的に適用されるかを把握するのが難しくなる。特に `extends` でサードパーティの共有設定を読み込んでいる場合、意図しないルールが混入していても気づきにくい。

**プラグイン名前空間のグローバル解決**

旧来のconfigでは、プラグインはツールチェーン全体でグローバルに解決される。`plugins: ['react']` と書いた場合、ESLintはNode.jsのモジュール解決機構を使って `eslint-plugin-react` を探す。このため、モノレポ環境でパッケージごとに異なるバージョンのプラグインを使いたい場合に問題が生じた。

**`overrides` の複雑さ**

ファイルパターンごとにルールを変えたい場合、`overrides` 配列を使う必要があった。ネストが深くなりがちで、最終的な設定が読みにくくなる。

```js
// 旧来の .eslintrc.js（問題点を示す例）
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // eslint-config-prettier
  ],
  rules: {
    'no-console': 'warn',
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      env: { jest: true },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.min.js'],
};
```

### Flat Config（eslint.config.js）の設計思想

Flat Configは上記の問題をすべて解決するために、次のような原則で設計されている。

**設定は単純な配列**

`eslint.config.js` はオブジェクトの配列をエクスポートする純粋なJavaScriptモジュールだ。各オブジェクト（設定オブジェクト）は独立しており、上から順に適用される。カスケードや暗黙的なマージはない。

**明示的なプラグイン参照**

プラグインはグローバルに解決されるのではなく、`import` でモジュールとして明示的に読み込み、設定オブジェクトの `plugins` キーに渡す。名前空間も任意に指定できるため、同じプラグインを異なる名前でマウントすることも可能だ。

**`files` と `ignores` によるスコープ制御**

どのファイルにどの設定を適用するかを `files` パターンで明示的に指定する。`overrides` ではなく、単に配列の別のオブジェクトとして書けばよい。

**旧来vs新規の対応関係**

| レガシーconfig | Flat Config |
|---------------|-------------|
| `parser` | `languageOptions.parser` |
| `parserOptions` | `languageOptions.parserOptions` |
| `env` | `languageOptions.globals` |
| `plugins: ['react']` | `import reactPlugin from ...; plugins: { react: reactPlugin }` |
| `extends: [...]` | スプレッドで配列に展開 |
| `ignorePatterns` | `ignores` |
| `overrides` | 追加の設定オブジェクト（配列の別要素） |

---

## 2. eslint.config.js の基本構造

### 最小限の設定

```js
// eslint.config.js
import js from '@eslint/js';

export default [
  // ESLint組み込みの推奨ルールセット
  js.configs.recommended,

  // プロジェクト固有の設定
  {
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'error',
    },
  },
];
```

### 設定オブジェクトのスキーマ

各設定オブジェクトは以下のプロパティを持てる。

```js
{
  // どのファイルに適用するか（省略時は全ファイル）
  files: ['**/*.js', '**/*.ts'],

  // このオブジェクトを特定ファイルから除外する
  ignores: ['dist/**', '*.min.js'],

  // 言語オプション（旧 parser + parserOptions + env）
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',   // 'module' | 'commonjs' | 'script'
    parser: someParser,     // カスタムパーサー
    parserOptions: {},      // パーサーへの追加オプション
    globals: {              // グローバル変数の定義（旧 env）
      window: 'readonly',
      process: 'readonly',
    },
  },

  // プラグイン（旧 plugins 文字列配列ではなくオブジェクト）
  plugins: {
    'plugin-name': pluginObject,
  },

  // ルール
  rules: {
    'rule-name': 'error',
  },

  // プロセッサー（Markdown内のJSを処理する等）
  processor: someProcessor,

  // lintメッセージのカスタマイズ
  linterOptions: {
    reportUnusedDisableDirectives: 'warn',
  },
}
```

### グローバルな ignores

`files` を持たず `ignores` のみを持つ設定オブジェクトは、グローバルな無視パターンとして機能する。旧来の `.eslintignore` に相当する。

```js
export default [
  // グローバル無視（files なし + ignores のみ）
  {
    ignores: [
      'dist/**',
      '.next/**',
      'node_modules/**',
      '*.min.js',
      'coverage/**',
    ],
  },

  // 以降の設定オブジェクトは ignores で除外されたファイルには適用されない
  js.configs.recommended,
];
```

### CommonJS形式（ESM非対応の環境向け）

`package.json` に `"type": "module"` がない場合、または `.cjs` 拡張子を使う場合は CommonJS 形式で書く。

```js
// eslint.config.cjs
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    rules: {
      'no-console': 'warn',
    },
  },
];
```

---

## 3. TypeScript ESLint の設定

### パッケージのインストール

```bash
npm install --save-dev typescript-eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

`typescript-eslint` v8以降では、`tseslint.config()` ヘルパーとプリセットが提供されており、型情報を使ったルールも含めた設定が大幅に簡略化された。

### 基本的なTypeScript設定

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // グローバル無視
  {
    ignores: ['dist/**', '.next/**', 'node_modules/**'],
  },

  // JS推奨
  js.configs.recommended,

  // TypeScript推奨（型情報なし）
  ...tseslint.configs.recommended,

  // TypeScript固有のルール調整
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
);
```

### 型情報を使ったルール（recommendedTypeChecked）

型情報を活用するより厳格なルールセットを使うには、`tsconfig.json` へのパスを指定する必要がある。これにより `@typescript-eslint/no-floating-promises` や `@typescript-eslint/await-thenable` などの強力なルールが有効になる。

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', '.next/**', '*.config.js'],
  },

  js.configs.recommended,

  // 型情報を使った推奨ルールセット
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        // TypeScriptプロジェクト設定
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
    },
  },

  // JS/CJSファイルは型情報チェック対象外
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);
```

### テストファイルのルール緩和

```js
// テストファイル向け設定を追加（配列の末尾に）
{
  files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
  },
},
```

---

## 4. React / React Hooks ルールの設定

### パッケージのインストール

```bash
npm install --save-dev eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
```

### React設定の実装例

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React + JSX設定
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        React: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect', // Reactバージョンを自動検出
      },
    },
    rules: {
      // Reactコアルール
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',      // React 17+は不要
      'react/prop-types': 'off',               // TypeScriptで代替
      'react/display-name': 'warn',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/self-closing-comp': 'warn',
      'react/jsx-boolean-value': ['warn', 'never'],
      'react/no-array-index-key': 'warn',
      'react/no-danger': 'error',

      // React Hooksルール
      ...reactHooksPlugin.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // アクセシビリティ
      ...jsxA11yPlugin.configs.recommended.rules,
    },
  },
);
```

### React 19 対応

React 19では `eslint-plugin-react` v8で新しいルールが追加されている。

```js
import reactPlugin from 'eslint-plugin-react';

// React 19の新ルール追加
{
  rules: {
    'react/no-deprecated': 'error',           // 非推奨APIの使用を検出
    'react/no-unknown-property': 'error',     // 不明なDOMプロパティを検出
    'react/jsx-uses-react': 'off',            // React 17+では不要
    'react/jsx-uses-vars': 'error',           // JSXで使われた変数をusedとしてマーク
  },
}
```

---

## 5. Next.js プロジェクト向け設定

### パッケージのインストール

```bash
npm install --save-dev @next/eslint-plugin-next eslint-plugin-react eslint-plugin-react-hooks
```

### Next.js完全設定

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'out/**',
      'dist/**',
      'node_modules/**',
      'public/**',
      '*.config.mjs',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Next.js + React設定
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // Next.js推奨ルール
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // Next.js固有のカスタマイズ
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'warn',      // next/imageを使うよう誘導
      '@next/next/no-sync-scripts': 'error',
    },
  },

  // App RouterのServer Component向け設定
  {
    files: ['app/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: {
      // Server Componentではhooksが使えないため警告不要
      'react-hooks/rules-of-hooks': 'off',
    },
  },

  // API Routeは別ルール
  {
    files: ['app/api/**/*.ts', 'pages/api/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
```

---

## 6. Prettier との統合

### パッケージのインストール

```bash
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
```

### 統合方法1: eslint-config-prettier のみ（推奨）

ESLintとPrettierを別々に実行する方法。競合するESLintのスタイルルールだけを無効化する。

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Prettierと競合するルールを無効化（必ず最後に置く）
  eslintConfigPrettier,

  // その後にプロジェクト固有ルールを上書き
  {
    rules: {
      'no-console': 'warn',
    },
  },
);
```

`package.json` のスクリプト:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### 統合方法2: eslint-plugin-prettier（ESLint経由でPrettierを実行）

ESLintの実行だけでPrettierの違反も検出したい場合。ただしパフォーマンスが低下するため非推奨な場合もある。

```js
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // ...他の設定...

  eslintConfigPrettier,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'warn',
    },
  },
];
```

### .prettierrc の設定例

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

## 7. カスタムルールの作成

### インラインカスタムルール

シンプルなルールはプラグインを作らずに `eslint.config.js` 内で定義できる。

```js
// eslint.config.js
export default [
  {
    plugins: {
      custom: {
        rules: {
          // console.log の代わりに logger を使うことを強制
          'no-console-log': {
            meta: {
              type: 'suggestion',
              docs: {
                description: 'Disallow console.log, use logger instead',
              },
              fixable: 'code',
              schema: [],
            },
            create(context) {
              return {
                CallExpression(node) {
                  if (
                    node.callee.type === 'MemberExpression' &&
                    node.callee.object.name === 'console' &&
                    node.callee.property.name === 'log'
                  ) {
                    context.report({
                      node,
                      message: 'Use logger.info() instead of console.log()',
                      fix(fixer) {
                        return fixer.replaceText(node.callee, 'logger.info');
                      },
                    });
                  }
                },
              };
            },
          },
        },
      },
    },
    rules: {
      'custom/no-console-log': 'warn',
    },
  },
];
```

### 独立したプラグインファイル

複数のルールをまとめる場合、別ファイルに切り出す。

```js
// eslint-plugin-myproject.js
export default {
  rules: {
    'no-todo-comment': {
      meta: {
        type: 'suggestion',
        docs: { description: 'Warn on TODO comments without ticket number' },
        schema: [],
      },
      create(context) {
        const SOURCE_CODE_COMMENT = /TODO(?!:\s*#\d+)/;
        return {
          Program() {
            const comments = context.getSourceCode().getAllComments();
            for (const comment of comments) {
              if (SOURCE_CODE_COMMENT.test(comment.value)) {
                context.report({
                  node: comment,
                  message: 'TODO comment must include ticket number: TODO: #123',
                });
              }
            }
          },
        };
      },
    },
  },
};
```

```js
// eslint.config.js
import myProjectPlugin from './eslint-plugin-myproject.js';

export default [
  {
    plugins: { myproject: myProjectPlugin },
    rules: {
      'myproject/no-todo-comment': 'warn',
    },
  },
];
```

---

## 8. .eslintignore から ignores への移行

### 旧来の .eslintignore

```
# .eslintignore（レガシー）
dist/
.next/
out/
node_modules/
*.min.js
coverage/
public/
*.d.ts
```

### Flat Config での ignores

`.eslintignore` ファイルはFlat Configでは読み込まれない。代わりに `eslint.config.js` 内で `ignores` を使う。

```js
// eslint.config.js
export default [
  // グローバル無視（filesキーなし + ignoresのみ）
  {
    ignores: [
      'dist/**',
      '.next/**',
      'out/**',
      'node_modules/**',
      '**/*.min.js',
      'coverage/**',
      'public/**',
      '**/*.d.ts',
      // dotfile・hidden directory
      '.*/**',
    ],
  },

  // 以降の設定オブジェクト
];
```

### 注意: ignores のスコープ

`files` と一緒に使う `ignores` はグローバル無視ではなく、**その設定オブジェクトのスコープ内でのみ有効**な除外になる。

```js
// この ignores はこの設定オブジェクト内のみ有効（グローバルではない）
{
  files: ['src/**/*.ts'],
  ignores: ['src/**/*.test.ts'],  // テストファイルをこの設定から除外
  rules: { '@typescript-eslint/no-explicit-any': 'error' },
}
```

---

## 9. 段階的移行戦略

### 移行の全体フロー

大規模プロジェクトでは一気に移行するのではなく、段階的に進めることが現実的だ。

**Step 1: ESLINT_USE_FLAT_CONFIG 環境変数で検証**

ESLint 8.x系でもFlat Configを試せる（ESLint 8.21.0以降）。

```bash
# 環境変数でFlat Configを有効化
ESLINT_USE_FLAT_CONFIG=true npx eslint src/

# package.json に追記
{
  "scripts": {
    "lint:flat": "ESLINT_USE_FLAT_CONFIG=true eslint src/"
  }
}
```

**Step 2: `@eslint/migrate-config` ツールで自動変換**

公式の移行ツールを使うと、既存の `.eslintrc.js` を `eslint.config.js` に自動変換できる。

```bash
npx @eslint/migrate-config .eslintrc.js
```

出力される `eslint.config.mjs` を確認し、手動で調整する。

**Step 3: 旧設定との共存（`FlatCompat` ユーティリティ）**

Flat Config未対応のプラグインや `extends` を使った共有設定は、`@eslint/eslintrc` の `FlatCompat` クラスでラップすることで引き続き使える。

```bash
npm install --save-dev @eslint/eslintrc
```

```js
// eslint.config.js
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Flat Config未対応のプラグインをラップして使う
  ...compat.extends('eslint-config-some-legacy-config'),
  ...compat.plugins('some-legacy-plugin'),

  // Flat Config対応のプラグインはそのまま使う
  {
    plugins: { react: reactPlugin },
    rules: { 'react/jsx-key': 'error' },
  },
];
```

**Step 4: プラグインの移行対応状況を確認**

主要プラグインのFlat Config対応状況（2026年2月現在）:

| プラグイン | Flat Config対応 | バージョン |
|-----------|---------------|----------|
| `@typescript-eslint` | ✓ 完全対応 | v6+ |
| `eslint-plugin-react` | ✓ 完全対応 | v7.37+ |
| `eslint-plugin-react-hooks` | ✓ 完全対応 | v5+ |
| `eslint-plugin-jsx-a11y` | ✓ 完全対応 | v6.10+ |
| `@next/eslint-plugin-next` | ✓ 完全対応 | v14+ |
| `eslint-config-prettier` | ✓ 完全対応 | v9+ |
| `eslint-plugin-import` | △ FlatCompatで利用可 | v2系 |
| `eslint-plugin-vitest` | ✓ 完全対応 | v0.5+ |

---

## 10. VSCode との統合設定

### ESLint拡張のインストール

VSCode Marketplaceで `dbaeumer.vscode-eslint` をインストールする。

### `.vscode/settings.json` の設定

```json
{
  // ESLint拡張がFlat Configを検出する（ESLint 8.21+では自動）
  "eslint.useFlatConfig": true,

  // 保存時に自動修正
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },

  // 対象言語の追加
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "markdown",
    "json"
  ],

  // PrettierをデフォルトフォーマッターにしてESLintと役割分担
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },

  // ESLintのデバッグログ（問題発生時に有効化）
  // "eslint.trace.server": "verbose"
}
```

### `.vscode/extensions.json`（推奨拡張の共有）

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

---

## 11. CI/CD での lint 実行

### GitHub Actions

```yaml
# .github/workflows/lint.yml
name: Lint

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run Type Check
        run: npx tsc --noEmit

      - name: Run Prettier check
        run: npm run format:check
```

### lint-staged でコミット前チェック

```bash
npm install --save-dev lint-staged husky
npx husky init
```

```js
// .lintstagedrc.mjs
export default {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  '*.css': ['prettier --write'],
};
```

```bash
# .husky/pre-commit
npx lint-staged
```

---

## 12. パフォーマンス改善

### キャッシュの活用

ESLintはデフォルトでキャッシュを使用しない。`--cache` フラグを指定すると、変更されていないファイルのlintをスキップする。

```json
{
  "scripts": {
    "lint": "eslint . --cache --cache-location .eslintcache",
    "lint:fix": "eslint . --cache --cache-location .eslintcache --fix"
  }
}
```

`.gitignore` にキャッシュファイルを追加する:

```
.eslintcache
```

### 型情報チェックの対象を絞る

`recommendedTypeChecked` は型情報を使うため低速だ。全ファイルに適用せず、実際にTypeScriptが必要なファイルだけに絞ると大幅に速くなる。

```js
{
  files: ['src/**/*.{ts,tsx}'],  // srcディレクトリのみ
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    ...tseslint.configs.recommendedTypeChecked.map(c => c.rules).flat(),
  },
},
// 設定ファイル自体は型情報チェック不要
{
  files: ['*.config.{js,ts,mjs}', 'scripts/**/*.js'],
  ...tseslint.configs.disableTypeChecked,
},
```

### 並列実行

モノレポや大規模プロジェクトでは、`eslint-parallel` やワークスペース機能を使ってパッケージごとに並列実行できる。

```bash
# ワークスペースごとに並列lint
npm run lint --workspace=packages/app &
npm run lint --workspace=packages/api &
wait
```

またはシェルスクリプト:

```bash
#!/bin/bash
npx eslint packages/app/src & PID1=$!
npx eslint packages/api/src & PID2=$!
npx eslint packages/shared/src & PID3=$!
wait $PID1 && wait $PID2 && wait $PID3
echo "All linting complete"
```

---

## 13. よくあるエラーと解決策

### エラー1: `TypeError: Key "plugins": Cannot redefine plugin`

同じプラグインを複数の設定オブジェクトで重複して定義するとこのエラーが発生する。

```js
// NG: reactPlugin を2箇所で定義
[
  {
    plugins: { react: reactPlugin },
    rules: { 'react/jsx-key': 'error' },
  },
  {
    plugins: { react: reactPlugin },  // エラー!
    rules: { 'react/prop-types': 'off' },
  },
]

// OK: プラグインの定義を1つにまとめる
[
  {
    plugins: { react: reactPlugin },
    rules: {
      'react/jsx-key': 'error',
      'react/prop-types': 'off',
    },
  },
]
```

### エラー2: `Parsing error: Cannot find module '@typescript-eslint/parser'`

パーサーはパッケージとしてインストールが必要だが、旧来と違い `import` で明示的に読み込む必要がある。

```bash
npm install --save-dev @typescript-eslint/parser
```

```js
// eslint.config.js
import tsParser from '@typescript-eslint/parser';  // 明示的にimport

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,  // 文字列ではなくオブジェクトを渡す
    },
  },
];
```

### エラー3: `eslint.config.js` が見つからない / `No eslint configuration found`

Flat Configへの移行後に `.eslintrc.js` を削除すると、旧バージョンのESLintを使っている環境でエラーになる。Node.jsとESLintのバージョンを確認する。

```bash
node --version   # v18.18.0以上が必要
npx eslint --version  # v9.0.0以上
```

### エラー4: `FlatCompat requires baseDirectory`

`FlatCompat` 使用時に `baseDirectory` を指定していないケース。

```js
// NG
const compat = new FlatCompat();

// OK
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });
```

### エラー5: グローバル変数が見つからない

旧来の `env: { browser: true }` がFlat Configでは `globals` パッケージ経由になる。

```bash
npm install --save-dev globals
```

```js
import globals from 'globals';

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,   // window, document, fetch等
        ...globals.node,      // process, __dirname等
        ...globals.es2022,    // Promise, Map, Set等
      },
    },
  },
];
```

---

## 14. おすすめルールセット紹介

### eslint-config-unicorn — 品質向上ルール

Sindre SorhusのUnicornプラグインは、コードの可読性・品質を高める独自のルール集。

```bash
npm install --save-dev eslint-plugin-unicorn
```

```js
import unicornPlugin from 'eslint-plugin-unicorn';

export default [
  unicornPlugin.configs['flat/recommended'],
  {
    rules: {
      // プロジェクトに合わせて調整
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      'unicorn/prevent-abbreviations': 'off',  // 日本語プロジェクトでは過剰
      'unicorn/no-array-for-each': 'warn',     // for...of を推奨
    },
  },
];
```

### eslint-plugin-import — インポート順整理

```bash
npm install --save-dev eslint-plugin-import
```

```js
import { FlatCompat } from '@eslint/eslintrc';
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.plugins('import'),
  {
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-unused-modules': 'warn',
    },
  },
];
```

### eslint-plugin-vitest — テスト品質ルール

```bash
npm install --save-dev eslint-plugin-vitest
```

```js
import vitestPlugin from 'eslint-plugin-vitest';

export default [
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: { vitest: vitestPlugin },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      'vitest/expect-expect': 'error',
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'error',
      'vitest/prefer-to-be': 'warn',
    },
  },
];
```

---

## まとめ — 完全な eslint.config.js テンプレート

最後に、TypeScript + React + Next.js + Prettier の実践的な完全設定をまとめて示す。

```js
// eslint.config.js — TypeScript + React + Next.js + Prettier 完全設定
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import nextPlugin from '@next/eslint-plugin-next';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // ===== グローバル無視 =====
  {
    ignores: [
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      'public/**',
      '**/*.d.ts',
      '**/*.min.js',
    ],
  },

  // ===== JS基本 =====
  js.configs.recommended,

  // ===== TypeScript =====
  ...tseslint.configs.recommended,

  // ===== 型情報を使うルール（srcのみ） =====
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ===== 設定ファイルは型情報チェック除外 =====
  {
    files: ['*.config.{js,ts,mjs}', 'scripts/**'],
    ...tseslint.configs.disableTypeChecked,
  },

  // ===== React + JSX + アクセシビリティ =====
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      '@next/next': nextPlugin,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/no-array-index-key': 'warn',
      'react/self-closing-comp': 'warn',
      '@next/next/no-img-element': 'warn',
    },
  },

  // ===== テストファイル =====
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // ===== Prettier（必ず最後） =====
  eslintConfigPrettier,

  // ===== プロジェクト共通ルール（Prettierの後） =====
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.es2022 },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);
```

### 移行チェックリスト

- [ ] `npm install` で ESLint 9 系に更新
- [ ] `eslint.config.js` を作成（ESM または CJS 形式を確認）
- [ ] `.eslintrc.*` ファイルを削除
- [ ] `.eslintignore` を削除し `ignores` に移行
- [ ] `globals` パッケージで環境変数を定義
- [ ] プラグインを `import` で明示的に読み込む
- [ ] `FlatCompat` で未対応プラグインを移行
- [ ] `package.json` の scripts を更新
- [ ] VSCode の `eslint.useFlatConfig: true` を確認
- [ ] CI でキャッシュを有効化（`--cache`）
- [ ] `lint-staged` の設定を更新

---

ESLint 9のFlat Configへの移行は、最初は設定の書き直しに時間がかかるように見えるが、一度移行が完了すれば設定の見通しが格段に改善される。「どの設定がどのファイルに適用されているか」が単純な配列のトップダウンで把握できるようになり、デバッグも容易になる。

TypeScript・React・Next.jsを使った現代的なフロントエンド開発において、Flat Configは今後の標準となる。早めに移行して、より堅牢なコード品質管理体制を整えよう。
