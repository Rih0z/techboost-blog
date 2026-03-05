---
title: 'Changesets実践ガイド: モノレポでのバージョン管理とリリース自動化'
description: 'Changesetsを使ったモノレポのバージョン管理、自動リリース、チーム運用、CI/CD統合、npm公開の実践的な実装方法を詳しく解説します。'
pubDate: '2025-11-21'
updatedDate: '2025-11-21'
category: 'ツール'
tags: ['Monorepo', 'Changesets', 'バージョン管理', 'CICD', 'npm', 'インフラ']
---

# Changesets実践ガイド

Changesetsは、モノレポでのバージョン管理とリリースプロセスを自動化するツールです。Turborepo、pnpm Workspace、Yarnなどと組み合わせて使用できます。

本記事では、Changesetsの実践的な使い方、チーム運用、CI/CD統合、自動リリースの実装方法を解説します。

## Changesetsとは

### 主な機能

1. **変更のトラッキング** - パッケージの変更を記録
2. **セマンティックバージョニング** - 自動的にバージョンを計算
3. **CHANGELOG生成** - 変更履歴を自動生成
4. **依存関係の管理** - 関連パッケージのバージョンも更新
5. **自動リリース** - CI/CDでの自動公開

### なぜChangesetsなのか

```typescript
// 従来の方法（Lerna）
// - 全パッケージを同時にバージョンアップ
// - 柔軟性が低い
// - CHANGELOGが自動生成されない

// Changesets
// - パッケージごとに独立したバージョン管理
// - 変更内容を明示的に記録
// - 自動的にCHANGELOG生成
// - 依存関係を自動解決
```

## セットアップ

### インストール

```bash
# モノレポのルートで実行
npm install -D @changesets/cli

# または
pnpm add -D @changesets/cli

# 初期化
npx changeset init
```

### プロジェクト構造

```
my-monorepo/
├── .changeset/
│   ├── config.json        # Changesets設定
│   └── README.md          # チーム向けガイド
├── packages/
│   ├── ui/
│   │   ├── package.json
│   │   └── CHANGELOG.md   # 自動生成
│   ├── utils/
│   │   ├── package.json
│   │   └── CHANGELOG.md
│   └── core/
│       ├── package.json
│       └── CHANGELOG.md
├── package.json
└── pnpm-workspace.yaml
```

### 設定ファイル

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

詳細な設定:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.0/schema.json",

  // CHANGELOG生成方法
  "changelog": [
    "@changesets/changelog-github",
    {
      "repo": "your-org/your-repo"
    }
  ],

  // 変更をコミットするか
  "commit": false,

  // 常に一緒にバージョンアップするパッケージ
  "fixed": [
    ["@myorg/ui", "@myorg/theme"]
  ],

  // バージョンを連動させるパッケージ
  "linked": [
    ["@myorg/react-*"]
  ],

  // npm公開時のアクセス設定
  "access": "public",

  // ベースブランチ
  "baseBranch": "main",

  // 内部依存関係の更新方法
  "updateInternalDependencies": "patch",

  // バージョン管理から除外
  "ignore": ["@myorg/examples", "@myorg/docs"],

  // プライベートパッケージも含めるか
  "privatePackages": {
    "version": true,
    "tag": false
  }
}
```

## 基本的なワークフロー

### 1. 変更を加える

```bash
# 機能を開発
cd packages/ui
# コード変更...

# バグ修正
cd packages/utils
# バグ修正...
```

### 2. Changesetを作成

```bash
# ルートで実行
npx changeset

# または
pnpm changeset
```

インタラクティブなプロンプト:

```
🦋  Which packages would you like to include?
◯ changed packages
  ◉ @myorg/ui
  ◯ @myorg/utils
  ◉ @myorg/core

🦋  Which packages should have a major bump?
◯ all packages
  ◯ @myorg/ui
  ◉ @myorg/core

🦋  Which packages should have a minor bump?
◉ all packages
  ◉ @myorg/ui
  ◯ @myorg/core

🦋  Please enter a summary for this change:
Add new Button component with variants

🦋  === Summary of changesets ===
major: @myorg/core
minor: @myorg/ui

Is this correct? (Y/n)
```

生成されたChangeset:

```markdown
<!-- .changeset/happy-pandas-jump.md -->
---
"@myorg/ui": minor
"@myorg/core": major
---

Add new Button component with variants

- Added primary, secondary, and ghost button variants
- Improved accessibility with ARIA labels
- Breaking: Changed button API to accept variant prop
```

### 3. バージョンアップ

```bash
# バージョンを更新
npx changeset version

# 実行されること:
# 1. package.jsonのversionを更新
# 2. CHANGELOGを生成
# 3. Changesetファイルを削除
# 4. 依存関係を自動更新
```

結果:

```diff
// packages/ui/package.json
{
  "name": "@myorg/ui",
- "version": "1.2.0",
+ "version": "1.3.0"
}

// packages/core/package.json
{
  "name": "@myorg/core",
- "version": "2.1.0",
+ "version": "3.0.0"
}

// packages/app/package.json (依存関係も自動更新)
{
  "dependencies": {
-   "@myorg/ui": "^1.2.0",
+   "@myorg/ui": "^1.3.0",
-   "@myorg/core": "^2.1.0",
+   "@myorg/core": "^3.0.0"
  }
}
```

CHANGELOG:

```markdown
<!-- packages/ui/CHANGELOG.md -->
# @myorg/ui

## 1.3.0

### Minor Changes

- abc123: Add new Button component with variants

  - Added primary, secondary, and ghost button variants
  - Improved accessibility with ARIA labels

## 1.2.0

...
```

### 4. リリース

```bash
# ビルド
pnpm run build

# npmに公開
npx changeset publish

# Gitタグを作成
git push --follow-tags
```

## チーム運用

### プルリクエスト運用

```markdown
## プルリクエストのルール

1. 変更を加えたら必ず Changeset を作成
2. Changeset の内容はレビュー対象
3. バージョンアップは自動化

## Changesetの書き方

### 良い例 ✅

```markdown
---
"@myorg/ui": minor
---

Add DatePicker component

- Support for date range selection
- Built-in validation
- Accessible keyboard navigation
```

### 悪い例 ❌

```markdown
---
"@myorg/ui": patch
---

Updates
```

## CI/CDでの自動化

### GitHub Actions完全版

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches:
      - main

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm run build

      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          publish: pnpm run release
          title: "chore: version packages"
          commit: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish to npm
        if: steps.changesets.outputs.published == 'true'
        run: |
          echo "Published packages:"
          echo '${{ steps.changesets.outputs.publishedPackages }}'
```

package.json スクリプト:

```json
{
  "scripts": {
    "build": "turbo build",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  }
}
```

### 自動プルリクエスト作成

Changesets GitHub Actionは以下を自動実行:

1. **Changesetがある場合**:
   - `Version Packages` プルリクエストを作成
   - マージすると自動的にnpmに公開

2. **プルリクエストの内容**:
```markdown
# Version Packages

## @myorg/ui@1.3.0

### Minor Changes

- abc123: Add new Button component

## @myorg/core@3.0.0

### Major Changes

- def456: Refactor API structure

**Breaking**: Changed authentication API
```

### Slack通知

```yaml
# .github/workflows/release.yml
- name: Notify Slack
  if: steps.changesets.outputs.published == 'true'
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "New packages released! 🎉",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Packages published:*\n${{ steps.changesets.outputs.publishedPackages }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## 高度な使い方

### プレリリース

```bash
# プレリリースモードに入る
npx changeset pre enter next

# Changesetを作成
npx changeset

# プレリリースバージョンを生成
npx changeset version
# 例: 1.2.0 → 1.3.0-next.0

# npmに公開
npx changeset publish --tag next

# プレリリースモードを終了
npx changeset pre exit
```

package.json:

```json
{
  "name": "@myorg/ui",
  "version": "1.3.0-next.0"
}
```

インストール:

```bash
# プレリリース版をインストール
npm install @myorg/ui@next

# 特定のプレリリース版
npm install @myorg/ui@1.3.0-next.0
```

### 固定バージョン

```json
// .changeset/config.json
{
  "fixed": [
    // 常に同じバージョンを保つパッケージグループ
    ["@myorg/ui", "@myorg/theme", "@myorg/icons"]
  ]
}
```

動作:

```bash
# @myorg/ui にだけ変更を加えても
npx changeset version

# すべてのパッケージが同じバージョンになる
# @myorg/ui: 1.2.0 → 1.3.0
# @myorg/theme: 1.2.0 → 1.3.0
# @myorg/icons: 1.2.0 → 1.3.0
```

### リンクバージョン

```json
// .changeset/config.json
{
  "linked": [
    // メジャーバージョンを連動させる
    ["@myorg/react-hooks", "@myorg/react-utils"]
  ]
}
```

動作:

```bash
# @myorg/react-hooks: 2.1.0 → 3.0.0 (major)
# @myorg/react-utils: 2.5.0 → 3.0.0 (自動的にmajor)
```

## カスタムCHANGELOG

### GitHub Changelog

```bash
npm install -D @changesets/changelog-github
```

```json
// .changeset/config.json
{
  "changelog": [
    "@changesets/changelog-github",
    {
      "repo": "your-org/your-repo"
    }
  ]
}
```

生成されるCHANGELOG:

```markdown
## 1.3.0

### Minor Changes

- [#123](https://github.com/your-org/your-repo/pull/123) [`abc123`](https://github.com/your-org/your-repo/commit/abc123) Thanks [@user](https://github.com/user)! - Add new Button component

### Patch Changes

- Updated dependencies [[`abc123`](https://github.com/your-org/your-repo/commit/abc123)]:
  - @myorg/theme@1.2.0
```

### カスタムChangelogジェネレーター

```javascript
// .changeset/custom-changelog.js
const { getInfo } = require('@changesets/get-github-info')

async function getReleaseLine(changeset, type, options) {
  const [firstLine, ...futureLines] = changeset.summary
    .split('\n')
    .map((l) => l.trimEnd())

  let returnVal = `- ${firstLine}`

  if (futureLines.length > 0) {
    returnVal += `\n${futureLines.map((l) => `  ${l}`).join('\n')}`
  }

  // GitHub情報を追加
  if (options && options.repo) {
    const { links, user } = await getInfo({
      repo: options.repo,
      commit: changeset.commit,
    })

    returnVal += ` (${links.commit})`

    if (user) {
      returnVal += ` by @${user}`
    }
  }

  return returnVal
}

async function getDependencyReleaseLine(changesets, dependenciesUpdated) {
  if (dependenciesUpdated.length === 0) return ''

  const changesetLinks = changesets.map((cs) => `  - ${cs.summary}`)

  return `- Updated dependencies:\n${changesetLinks.join('\n')}`
}

module.exports = {
  getReleaseLine,
  getDependencyReleaseLine,
}
```

```json
// .changeset/config.json
{
  "changelog": [
    "./.changeset/custom-changelog.js",
    {
      "repo": "your-org/your-repo"
    }
  ]
}
```

## トラブルシューティング

### よくある問題

#### 1. 依存関係が更新されない

```json
// .changeset/config.json
{
  // patchではなくminorで更新
  "updateInternalDependencies": "minor"
}
```

#### 2. プライベートパッケージのバージョン管理

```json
// .changeset/config.json
{
  "privatePackages": {
    "version": true,  // バージョンは更新
    "tag": false      // Gitタグは作らない
  }
}
```

#### 3. 特定のパッケージを無視

```json
// .changeset/config.json
{
  "ignore": [
    "@myorg/examples",
    "@myorg/docs"
  ]
}
```

## ベストプラクティス

### 1. Changesetの粒度

```markdown
<!-- ✅ 良い例: 1つの機能に1つのChangeset -->
---
"@myorg/ui": minor
---

Add DatePicker component

- Support for date range selection
- Built-in validation
```

```markdown
<!-- ❌ 悪い例: 複数の機能を1つに -->
---
"@myorg/ui": minor
"@myorg/utils": patch
"@myorg/core": major
---

Various updates
```

### 2. セマンティックバージョニング

```typescript
// Breaking Change → Major
export function oldApi() {} // 削除
export function newApi() {} // 新API

// New Feature → Minor
export function newFeature() {} // 追加

// Bug Fix → Patch
export function bugFix() {} // 修正
```

### 3. コミットメッセージ

```bash
# Changesetを含むコミット
git add .changeset/happy-pandas-jump.md
git commit -m "feat: add Button component"

# バージョンアップのコミット
git commit -m "chore: version packages"
```

## まとめ

Changesetsを使うことで、以下が実現できます。

### 主な利点

1. **透明性** - すべての変更が記録される
2. **自動化** - バージョン管理が自動化
3. **柔軟性** - パッケージごとに独立したバージョン
4. **チーム協調** - プルリクエストベースのワークフロー
5. **信頼性** - セマンティックバージョニングの徹底

### 推奨構成

```typescript
const idealSetup = {
  monorepo: 'Turborepo or pnpm Workspace',
  versionManagement: 'Changesets',
  ci: 'GitHub Actions',
  publishing: 'npm with provenance',
  changelog: '@changesets/changelog-github',
}
```

Changesetsを活用して、効率的でスケーラブルなモノレポ管理を実現しましょう。
