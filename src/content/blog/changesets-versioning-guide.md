---
title: 'Changesetsでパッケージバージョン管理完全ガイド — モノレポ・自動化・GitHub Actionsリリース'
description: 'Changesetsでモノレポのバージョン管理とnpmリリースを完全自動化する実践ガイド。changeset追加・バージョンバンプ・CHANGELOG生成・GitHub Actions自動リリース・npmパブリッシュ・プレリリースまで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['Changesets', 'バージョン管理', 'モノレポ', 'npm', 'GitHub Actions']
---

npm パッケージのバージョン管理は、単体パッケージでも面倒だがモノレポになると一気に複雑さが増す。パッケージ間の依存関係・CHANGELOG の整合性・タグ管理・npm への公開タイミング——これらを手作業で管理し続けることは現実的ではない。

**Changesets** はこの問題を根本から解決するツールだ。開発者が変更をコミットするたびに「この変更はどの程度の重要度か」を記録し、リリース時にはその情報をもとにバージョンを自動で決定し、CHANGELOG を生成し、npm へ公開する一連のフローを完全自動化する。

本記事では、Changesets の基礎から pnpm workspace・Turborepo との統合、GitHub Actions による完全自動化リリース、プレリリース管理まで実践的なサンプルコードとともに解説する。

---

## 1. Changesetsとは — lerna・semantic-releaseとの比較

### Changesets の設計思想

Changesets は **Atlantic チーム**（現 Atlassian）が開発したバージョン管理ツールで、2019 年にオープンソース化された。その設計思想の核心は「変更の意図を変更と同時に記録する」という点にある。

従来のバージョン管理ツールは、コミットメッセージの形式（`feat:`, `fix:` など）からバージョンを推測する。しかし Changesets は専用のマークダウンファイルを `/.changeset/` ディレクトリに生成し、その中に「どのパッケージが」「どの程度変わった（major/minor/patch）か」を明示的に記録する。この方式により、コミットメッセージの書き方に縛られず、複数のコミットをまとめて1つのバージョンとして扱うことができる。

### lerna との比較

**lerna** はモノレポ管理の老舗ツールで、かつては標準的な選択肢だった。しかし Changesets と比較すると以下の差がある。

| 観点 | lerna | Changesets |
|------|-------|------------|
| バージョン決定方法 | コミットメッセージ解析 or 手動 | 専用ファイルに明示記録 |
| CHANGELOG | 自動生成（コミットから） | 手動記述のマークダウンから生成 |
| モノレポ対応 | もともとモノレポ専用 | 単体・モノレポ両対応 |
| CI 統合 | 設定が複雑 | 公式 GitHub Action あり |
| 学習コスト | 高い | 低い |
| メンテナンス状況 | nrwl に引き継がれ回復傾向 | 活発にメンテ中 |

lerna は長い歴史があり設定の自由度が高いが、モノレポの規模が大きくなると設定の複雑さが問題になる。Changesets はシンプルな API を保ちつつ、必要な機能を段階的に追加できる点が優れている。

### semantic-release との比較

**semantic-release** はコミットメッセージ（Conventional Commits）からバージョンを完全自動で決定するツールだ。

| 観点 | semantic-release | Changesets |
|------|----------------|------------|
| バージョン決定 | 完全自動（コミットから） | 開発者が明示的に指定 |
| コミット規約 | Conventional Commits 必須 | コミット規約不要 |
| モノレポ | プラグインが必要 | ネイティブ対応 |
| CHANGELOG | コミットから自動生成 | changeset ファイルから生成 |
| 人間の関与 | 最小限 | changeset 追加が必要 |

semantic-release は完全自動化できる反面、開発者がコミットメッセージを正確に書き続けることが前提となる。大規模チームでこれを徹底するのは難しい。Changesets は「変更時にファイルを追加する」という明示的なステップを設けることで、意図しないバージョンアップを防ぎながら自動化の恩恵を受けられる。

---

## 2. セットアップ — インストールと初期設定

### インストール

pnpm を使用するプロジェクトを前提とするが、npm・yarn でも同様の手順で動作する。

```bash
# pnpm の場合
pnpm add -D @changesets/cli

# npm の場合
npm install --save-dev @changesets/cli

# yarn の場合
yarn add -D @changesets/cli
```

インストール後、以下のコマンドで初期化する。

```bash
pnpm changeset init
```

このコマンドを実行すると、プロジェクトのルートに `.changeset/` ディレクトリが作成され、`config.json` が生成される。

### config.json の設定

`.changeset/config.json` はChangesets の動作を制御するメインの設定ファイルだ。

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

各フィールドの意味を解説する。

**`changelog`**
CHANGELOG を生成するときに使用するモジュールを指定する。デフォルトは `@changesets/cli/changelog` だが、GitHub のリンク付きで生成する `@changesets/changelog-github` が特に便利だ。

```bash
pnpm add -D @changesets/changelog-github
```

```json
{
  "changelog": ["@changesets/changelog-github", { "repo": "your-org/your-repo" }]
}
```

**`commit`**
`true` にすると、`changeset version` 実行時に変更を自動でコミットする。CI で使う場合は `true` が便利だが、手動でコミットを制御したい場合は `false` のままにする。

**`access`**
npm パブリッシュ時のアクセスレベルを指定する。スコープ付きパッケージ（`@your-org/package`）を公開する場合は `"public"` に設定しなければ公開されない。プライベートパッケージは `"restricted"` のままでよい。

**`baseBranch`**
変更の基準となるブランチ。通常は `"main"` または `"master"` を指定する。

**`updateInternalDependencies`**
モノレポ内で相互依存するパッケージがある場合、依存側のパッケージのバージョンをどのタイミングで更新するかを指定する。`"patch"` にすると、依存パッケージが patch バージョンを上げたときも依存側の `package.json` を更新する。`"minor"` にすると minor 以上のバージョンアップ時のみ更新する。

**`ignore`**
バージョン管理から除外するパッケージを指定する。内部ツールやドキュメントサイトなど、npm に公開しないパッケージをリストする。

```json
{
  "ignore": ["@your-org/docs", "@your-org/internal-tools"]
}
```

### モノレポ構成の例

以下のようなモノレポ構成を前提に解説を進める。

```
my-monorepo/
├── .changeset/
│   └── config.json
├── packages/
│   ├── ui/
│   │   └── package.json  (@my-org/ui)
│   ├── utils/
│   │   └── package.json  (@my-org/utils)
│   └── core/
│       └── package.json  (@my-org/core)
├── apps/
│   └── web/
│       └── package.json  (web - private)
├── pnpm-workspace.yaml
└── package.json
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

---

## 3. changeset追加 — 変更を記録する

### 基本的な使い方

変更を加えたら、コミットの前または後に changeset を追加する。

```bash
pnpm changeset
```

または

```bash
pnpm changeset add
```

コマンドを実行すると、対話型のプロンプトが表示される。

```
🦋  Which packages would you like to include? …
◉ @my-org/ui
◯ @my-org/utils
◯ @my-org/core

🦋  Which packages should have a major bump? …
◯ @my-org/ui

🦋  Which packages should have a minor bump? …
◉ @my-org/ui

🦋  Please enter a summary for this change (this will be in the changelogs).
  (submit empty line to open external editor)

> Add new Button variant for outlined style

🦋  Summary: Add new Button variant for outlined style
```

### major / minor / patch の選択基準

Semantic Versioning（semver）の原則に従ってバージョンを選択する。

**major（破壊的変更）**
既存の利用者のコードが壊れる変更。API の削除・シグネチャの変更・デフォルト動作の変更などが該当する。

```
例: Button コンポーネントの `variant` prop の型を string から union type に変更
→ 既存の "primary" | "secondary" 以外の値を使っていた場合に型エラーが発生する
→ major バージョンアップ
```

**minor（後方互換の機能追加）**
既存のコードを壊さずに新しい機能を追加する場合。新しい prop・新しいエクスポート関数・新しいオプションの追加が該当する。

```
例: Button コンポーネントに新しい variant="outlined" を追加
→ 既存の "primary" | "secondary" は引き続き動作する
→ minor バージョンアップ
```

**patch（バグ修正）**
既存の機能のバグを修正するがAPIは変わらない場合。パフォーマンス改善・型定義の微修正・ドキュメントの更新も patch として扱うことが多い。

```
例: Button の onClick が二重に発火するバグを修正
→ API は変わらず動作が正しくなる
→ patch バージョンアップ
```

### 生成される changeset ファイル

changeset を追加すると、`.changeset/` ディレクトリにランダムな名前のマークダウンファイルが生成される。

```markdown
---
"@my-org/ui": minor
---

Add new Button variant for outlined style

Previously only `primary` and `secondary` variants were available.
This change adds `outlined` variant that renders a transparent background
with a colored border, suitable for secondary actions.
```

このファイルはソースコードと一緒にコミットし、PR に含める。コードレビュー時にレビュアーがバージョンアップの意図を確認できる。

### changeset を書かない変更

すべての変更が changeset を必要とするわけではない。以下のような変更は changeset なしでコミットして問題ない。

- テストの追加・修正（内部実装のみの変更）
- CI の設定変更
- ドキュメントの typo 修正
- 開発ツールのバージョンアップ

`packages/` や `apps/` に含まれない設定ファイルの変更も changeset は不要だ。

---

## 4. バージョンバンプ — CHANGELOG自動生成

### changeset version コマンド

プロジェクトをリリースする準備ができたら、以下のコマンドを実行する。

```bash
pnpm changeset version
```

このコマンドは以下の処理を行う。

1. `.changeset/` ディレクトリ内の全 changeset ファイルを読み込む
2. 各パッケージに必要なバージョンバンプを計算する（内部依存関係も考慮）
3. 各パッケージの `package.json` のバージョンを更新する
4. 各パッケージの `CHANGELOG.md` に変更内容を追記する
5. 処理済みの changeset ファイルを削除する

### バージョンバンプの伝播

モノレポでは内部依存関係のバージョンバンプが自動で伝播する。

```
@my-org/core → @my-org/utils → @my-org/ui
```

`@my-org/core` が minor バージョンアップした場合、`@my-org/utils` の `package.json` の `dependencies` フィールドが自動で更新される。`updateInternalDependencies` の設定に応じて、`@my-org/utils` 自体のバージョンも上がる場合がある。

### 生成される CHANGELOG

`changeset version` 実行後、各パッケージの `CHANGELOG.md` が自動で更新される。

```markdown
# @my-org/ui

## 1.3.0

### Minor Changes

- Add new Button variant for outlined style

  Previously only `primary` and `secondary` variants were available.
  This change adds `outlined` variant that renders a transparent background
  with a colored border, suitable for secondary actions.

### Patch Changes

- Updated dependencies
  - @my-org/core@2.1.0

## 1.2.1

### Patch Changes

- Fix onClick double-fire issue in Button component
```

`@changesets/changelog-github` を使用した場合は、PR 番号と著者のリンクも含まれる。

```markdown
## 1.3.0

### Minor Changes

- [#142](https://github.com/your-org/your-repo/pull/142) [`a3f9c2d`](https://github.com/your-org/your-repo/commit/a3f9c2d) Thanks [@username](https://github.com/username)! - Add new Button variant for outlined style
```

---

## 5. npmパブリッシュ — changeset publish

### 基本的なパブリッシュ

バージョンバンプ後、以下のコマンドで npm へ公開する。

```bash
pnpm changeset publish
```

このコマンドは `package.json` のバージョンが npm レジストリに存在しないパッケージのみを公開する。すべてのパッケージを強制的に再公開することはない。

### npm 認証設定

パブリッシュには npm の認証が必要だ。以下の方法で認証トークンを設定する。

**`.npmrc` ファイル（リポジトリルート）**

```ini
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

環境変数 `NPM_TOKEN` に npm のアクセストークンを設定する。ローカル開発では `.env` ファイルか、シェルの設定ファイルで管理する。GitHub Actions では Secrets を使用する。

**スコープ付きパッケージのレジストリ設定**

GitHub Packages など別のレジストリを使用する場合は、`.npmrc` でスコープごとにレジストリを指定する。

```ini
@my-org:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### publishConfig の設定

スコープ付きパッケージで npm に公開する場合、各パッケージの `package.json` に `publishConfig` を追加する。

```json
{
  "name": "@my-org/ui",
  "version": "1.3.0",
  "publishConfig": {
    "access": "public"
  }
}
```

`publishConfig.access` を `"public"` にしないと、スコープ付きパッケージはデフォルトで private（有料）として扱われ、パブリッシュが失敗する。

### ビルド前実行の設定

通常、TypeScript パッケージは公開前にビルドが必要だ。`package.json` の `scripts` に以下のように設定する。

```json
{
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "pnpm run build"
  }
}
```

`changeset publish` は内部的に `npm publish` を実行するため、`prepublishOnly` フックが自動的に呼ばれる。

---

## 6. pnpm workspace + Changesets — 依存パッケージ連動アップデート

### pnpm workspace の設定

Changesets は pnpm workspace と特に相性が良い。`pnpm-workspace.yaml` でワークスペースを定義し、Changesets が内部依存関係を解析してバージョンを連動させる。

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - '!**/__tests__/**'
```

### catalog 機能との組み合わせ

pnpm 9.0 以降で利用できる **catalog** 機能を使うと、外部依存のバージョンを一元管理できる。

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'

catalog:
  react: ^19.0.0
  typescript: ^5.7.0
  vitest: ^3.0.0
```

各パッケージの `package.json` では `catalog:` プロトコルで参照する。

```json
{
  "dependencies": {
    "react": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

Changesets は catalog で管理される外部依存のバージョンを変更しても、内部パッケージのバージョンバンプには含めない。外部依存の更新はパッチバンプとして自動適用されることが多い。

### workspace プロトコルの扱い

モノレポ内の内部依存は `workspace:` プロトコルで参照する。

```json
{
  "name": "@my-org/ui",
  "dependencies": {
    "@my-org/utils": "workspace:*",
    "@my-org/core": "workspace:^"
  }
}
```

`changeset publish` 実行時、Changesets は `workspace:*` や `workspace:^` を実際のバージョン番号に自動で置き換えてから npm に公開する。開発中は `workspace:*` で常に最新の内部パッケージを参照し、公開時は具体的なバージョンになる仕組みだ。

### 依存グラフの可視化

パッケージが増えてきたら依存グラフを確認すると Changesets の動作を理解しやすい。

```bash
pnpm why @my-org/core
```

---

## 7. Turborepo + Changesets — ビルドキャッシュ活用

### Turborepo との統合

Turborepo と Changesets を組み合わせることで、変更のあったパッケージのみをビルド・テストし、その後にバージョンバンプとパブリッシュを行う効率的なパイプラインを構築できる。

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

`dependsOn: ["^build"]` の `^` プレフィックスは「このパッケージが依存するすべてのパッケージの build タスクが完了してから実行する」という意味だ。Turborepo が依存グラフを解析し、最適な並列実行を自動で決定する。

### フィルタリングと Changesets の組み合わせ

`changeset version` 実行後、変更のあったパッケージを Turborepo のフィルタ機能で絞り込んでビルドできる。

```bash
# 変更のあったパッケージとその依存パッケージのみビルド
pnpm turbo build --filter=...[HEAD^1]

# 特定のパッケージとその依存パッケージ
pnpm turbo build --filter=@my-org/ui...
```

`[HEAD^1]` は「直前のコミットから変更のあったパッケージ」を意味する。CI では `[origin/main...HEAD]` とすることが多い。

### Turborepo リモートキャッシュ

CI 環境でリモートキャッシュを有効にすると、同一のソースコードに対してビルドが再実行されなくなる。

```bash
# Vercel のリモートキャッシュを使用
pnpm turbo login
pnpm turbo link
```

GitHub Actions では以下の環境変数を設定する。

```yaml
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

Changesets によるリリースPR のビルドは、多くの場合すでにキャッシュが存在するため数秒で完了する。

---

## 8. GitHub Actions自動化 — PR changeset check・自動リリースPR

### changeset check ワークフロー

PR に changeset が含まれているかを自動チェックするワークフローを設定する。

```yaml
# .github/workflows/changeset-check.yml
name: Changeset Check

on:
  pull_request:
    branches:
      - main

jobs:
  check:
    name: Check for changeset
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Check changeset
        run: pnpm changeset status --since=origin/main
```

`changeset status --since=origin/main` は、`main` ブランチからの差分に changeset が含まれているかを確認する。changeset がない場合はゼロ以外の終了コードを返すため、CI が失敗する。

ただし、すべての PR に changeset を要求するのは過剰な場合がある。ドキュメントの更新やリファクタリングには changeset が不要なことも多い。チームの運用方針に応じて、このチェックをオプショナル（`continue-on-error: true`）にするか、ラベルで制御する方が柔軟だ。

---

## 9. @changesets/action — リリースPR作成・publish workflow

### @changesets/action とは

`@changesets/action` は Changesets 公式の GitHub Action で、以下の2つのモードで動作する。

1. **PR モード**: リポジトリに changeset ファイルがある場合、「Version Packages」という PR を自動作成・更新する
2. **パブリッシュモード**: 「Version Packages」PR がマージされたとき、npm にパッケージを公開する

### 完全な自動リリースワークフロー

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
    permissions:
      contents: write
      pull-requests: write
      id-token: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm turbo build

      - name: Run tests
        run: pnpm turbo test

      - name: Create Release Pull Request or Publish to npm
        id: changesets
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          version: pnpm changeset version
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Releases
        if: steps.changesets.outputs.published == 'true'
        run: |
          echo "Published packages: ${{ steps.changesets.outputs.publishedPackages }}"
```

### ワークフローの動作フロー

このワークフローが `main` ブランチへのプッシュをトリガーとして起動したとき、`@changesets/action` は以下のように動作する。

**changeset ファイルがある場合:**
1. `pnpm changeset version` を実行してバージョンバンプと CHANGELOG 更新を行う
2. 「Version Packages」という PR を作成（または更新）する
3. PR にはすべての変更パッケージのバージョンと CHANGELOG が含まれる

**changeset ファイルがない場合（Version Packages PR がマージされた直後）:**
1. `pnpm changeset publish` を実行する
2. 新バージョンを npm に公開する
3. GitHub タグを自動で作成する
4. `outputs.published` が `'true'` になり、GitHub Releases の作成などの後続処理が実行できる

### outputs の活用

`@changesets/action` の outputs を使うと、パブリッシュ後に追加処理を実行できる。

```yaml
- name: Notify Slack on release
  if: steps.changesets.outputs.published == 'true'
  uses: slackapi/slack-github-action@v2
  with:
    payload: |
      {
        "text": "New packages published: ${{ steps.changesets.outputs.publishedPackages }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

`publishedPackages` は JSON 配列として返ってくる。

```json
[
  { "name": "@my-org/ui", "version": "1.3.0" },
  { "name": "@my-org/utils", "version": "2.0.1" }
]
```

---

## 10. プレリリース — prereleaseモード・alpha/beta

### プレリリースモードへの切り替え

安定版リリース前にアルファ版やベータ版を公開したい場合、Changesets のプレリリースモードを使用する。

```bash
# プレリリースモードに入る（alpha タグ）
pnpm changeset pre enter alpha

# beta の場合
pnpm changeset pre enter beta

# rc（リリース候補）の場合
pnpm changeset pre enter rc
```

このコマンドを実行すると、`.changeset/pre.json` ファイルが生成される。

```json
{
  "mode": "pre",
  "tag": "alpha",
  "initialVersions": {
    "@my-org/ui": "1.2.0",
    "@my-org/utils": "2.0.0",
    "@my-org/core": "3.1.0"
  },
  "changesets": []
}
```

### プレリリース中のバージョンバンプ

プレリリースモード中に `changeset version` を実行すると、プレリリース用のバージョン番号が生成される。

```bash
pnpm changeset version
```

```
@my-org/ui: 1.2.0 → 1.3.0-alpha.0
@my-org/utils: 2.0.0 → 2.0.1-alpha.0
```

続けて changeset を追加して `changeset version` を実行すると、プレリリース番号がインクリメントされる。

```
@my-org/ui: 1.3.0-alpha.0 → 1.3.0-alpha.1
```

### プレリリース版のパブリッシュ

プレリリース版は npm の `dist-tag` を指定してパブリッシュする。`changeset publish` は `.changeset/pre.json` を参照して自動的に正しいタグを使用する。

```bash
pnpm changeset publish
```

これにより、npm に `@my-org/ui@1.3.0-alpha.0` が `alpha` タグで公開される。

```bash
# ユーザーはタグを指定してインストール
npm install @my-org/ui@alpha
```

### プレリリースモードの終了

安定版リリースの準備ができたら、プレリリースモードを終了する。

```bash
pnpm changeset pre exit
```

このコマンドを実行後、`changeset version` を実行すると安定版のバージョン（例: `1.3.0`）が生成される。

### プレリリースの注意点

プレリリースモード中は、`changeset status` コマンドの出力が通常時と異なる。また、`updateInternalDependencies` の設定がプレリリース中の内部依存バージョンに影響することがある。プレリリース版で内部依存パッケージを参照する場合は、`workspace:*` よりも `workspace:^` を使用することを推奨する。

---

## 11. linked packages — バージョン連動設定

### linked とは

**linked** 設定は、複数のパッケージを「グループ」として扱い、グループ内のいずれかのパッケージがバージョンアップされるとき、グループ全体が同じバージョン番号になる設定だ。

```json
// .changeset/config.json
{
  "linked": [
    ["@my-org/ui", "@my-org/ui-icons", "@my-org/ui-themes"]
  ]
}
```

この設定では、`@my-org/ui` が `1.5.0` になると、`@my-org/ui-icons` と `@my-org/ui-themes` も `1.5.0` になる。たとえ `@my-org/ui-icons` が変更されていなくても、バージョンが揃えられる。

### linked の使いどころ

linked は「常に一緒にリリースされるべきパッケージ群」に適している。

- デザインシステムのコアと関連パッケージ（`@ds/core`, `@ds/react`, `@ds/vue`）
- ライブラリと対応するプラグイン群
- メインパッケージとアダプターパッケージ

ユーザーが複数のパッケージを一緒に使う場合、バージョンが揃っていることで「`@ds/core@1.5.0` と `@ds/react@1.5.0` を使えば問題ない」という明確なメッセージを伝えられる。

### linked vs fixed の違い

linked は「グループ内の最高バージョンに揃える」動作をする。一方で **fixed**（後述）は「グループ全体が常に同一バージョンで動く」という厳格な制約だ。

| 観点 | linked | fixed |
|------|--------|-------|
| バージョン更新のトリガー | グループ内いずれかが変更 | グループ内いずれかが変更 |
| 未変更パッケージの扱い | 最高バージョンに追いつく | 同一バージョンに強制 |
| 独立したリリース | 可能（グループ外のパッケージは独立） | グループ全体を一緒にリリース |
| 使いどころ | 関連パッケージのゆるい連動 | モノリシックなリリース |

---

## 12. Fixed packages — グループバージョン管理

### fixed とは

**fixed** 設定は、指定したパッケージ群を常に同一バージョンで管理する。

```json
// .changeset/config.json
{
  "fixed": [
    ["@babel/core", "@babel/runtime", "@babel/helpers"]
  ]
}
```

この設定では、グループ内のいずれかのパッケージに変更があると、グループ全体が同じバージョンバンプを受ける。

### fixed の具体的な動作

例として、以下の状態から始まる。

```
@my-org/server: 2.0.0
@my-org/client: 2.0.0
```

`@my-org/server` に minor の変更が加えられた場合、fixed 設定があれば `@my-org/client` に変更がなくても両方 `2.1.0` になる。

```
@my-org/server: 2.0.0 → 2.1.0  (minor バンプ)
@my-org/client: 2.0.0 → 2.1.0  (fixed により追従)
```

### fixed の使いどころ

fixed はパッケージが事実上1つのプロダクトとして動作する場合に使用する。

- サーバーとクライアントが密結合で、常に同一バージョンを使う必要がある場合
- フレームワークのコアとランタイムが一体的に動作する場合
- ユーザーが「バージョン X.Y.Z を使えば全部動く」という期待を持つライブラリ群

Vue.js の `vue`・`@vue/runtime-dom`・`@vue/compiler-dom` などが典型的な例だ。

---

## 13. ドキュメントサイト更新の自動化 — Docusaurus連携

### Docusaurus とのモノレポ統合

ドキュメントサイトを Docusaurus で管理し、Changesets のリリースと連動させる方法を解説する。

まず、ドキュメントサイトを `apps/docs/` に配置し、pnpm workspace に含める。ただし、ドキュメントサイト自体は npm に公開しないため、`.changeset/config.json` の `ignore` に追加する。

```json
// .changeset/config.json
{
  "ignore": ["docs"]
}
```

```json
// apps/docs/package.json
{
  "name": "docs",
  "private": true,
  "scripts": {
    "build": "docusaurus build",
    "start": "docusaurus start"
  }
}
```

### CHANGELOG をドキュメントサイトに反映

パッケージの `CHANGELOG.md` を Docusaurus のドキュメントとして表示する。

```javascript
// apps/docs/docusaurus.config.ts
import type { Config } from '@docusaurus/types';

const config: Config = {
  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'changelog',
        path: '../../packages/ui/CHANGELOG.md',
        routeBasePath: 'changelog',
        sidebarPath: false,
      },
    ],
  ],
};

export default config;
```

### GitHub Actions でドキュメントを自動デプロイ

リリース後にドキュメントサイトを自動デプロイするワークフローを追加する。

```yaml
# .github/workflows/release.yml（続き）
- name: Deploy documentation
  if: steps.changesets.outputs.published == 'true'
  working-directory: apps/docs
  run: |
    pnpm build
    # Cloudflare Pages / GitHub Pages / Vercel へのデプロイコマンド
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### バージョン情報のドキュメントへの注入

リリース時にパッケージのバージョン情報をドキュメントサイトに自動注入する仕組みを作ると、ドキュメントのバージョン表記が常に最新になる。

```javascript
// scripts/inject-versions.mjs
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const packages = ['@my-org/ui', '@my-org/utils', '@my-org/core'];

const versions = {};
for (const pkg of packages) {
  const pkgJson = JSON.parse(
    readFileSync(resolve(`packages/${pkg.split('/')[1]}/package.json`), 'utf-8')
  );
  versions[pkg] = pkgJson.version;
}

const versionsJson = JSON.stringify(versions, null, 2);
writeFileSync(
  resolve('apps/docs/src/data/versions.json'),
  versionsJson
);

console.log('Versions injected:', versions);
```

```yaml
- name: Inject package versions into docs
  if: steps.changesets.outputs.published == 'true'
  run: node scripts/inject-versions.mjs
```

---

## 実践的なトラブルシューティング

### 「No unreleased changesets found」エラー

`changeset version` または `changeset publish` を実行したときに changeset が見つからないエラーが出る場合。

**原因**: `.changeset/` ディレクトリに changeset ファイルがない。または既に `changeset version` で処理済みで削除されている。

**解決策**: `pnpm changeset` で新しい changeset を追加するか、`pnpm changeset publish` を直接実行してバージョンバンプ済みのパッケージを公開する。

### package.json のバージョンが npm と一致しない

**原因**: `changeset version` を実行したが `changeset publish` を実行する前に別のコミットがされた、または手動で `package.json` を編集した。

**解決策**: `changeset status` でバージョンの状態を確認し、必要に応じて手動で `package.json` のバージョンを修正してから `changeset publish` を実行する。

### CI でのタグ作成権限エラー

**原因**: GitHub Actions の `GITHUB_TOKEN` に適切な権限がない。

**解決策**: ワークフローに `permissions` を明示的に設定する。

```yaml
permissions:
  contents: write
  pull-requests: write
  id-token: write
```

### npm 2FA が有効でパブリッシュできない

**原因**: npm アカウントで 2FA が必須設定になっていると、CI からのパブリッシュが失敗する。

**解決策**: npm の Granular Access Tokens を使用し、自動化用のトークンに「Automation」タイプを選択する。Automation トークンは 2FA をバイパスできる。

```
npm Access Tokens → Generate New Token → Automation
```

---

## DevToolBox で package.json を検証する

バージョン管理のプロセスで `package.json` の構造が正しいかを確認することは重要だ。特にスコープ付きパッケージの設定・`publishConfig`・`peerDependencies` の記述ミスはリリース時にまで気づかないことがある。

**[DevToolBox](https://usedevtools.com/)** の JSON バリデーターを使えば、`package.json` を貼り付けるだけで JSON の構文エラーを即座に検出できる。Changesets のワークフローに組み込む前に、設定ファイルの構文チェックをブラウザ上で手軽に行える。`config.json` や `.npmrc` の YAML/JSON 形式の確認にも活用できる。

---

## まとめ

Changesets は「変更の意図を明示的に記録する」という設計思想により、モノレポのバージョン管理を安全かつ自動化できる優れたツールだ。

本記事で解説した内容を整理する。

| ステップ | コマンド | タイミング |
|---------|---------|-----------|
| changeset 追加 | `pnpm changeset` | 変更をコミットするたびに |
| 状態確認 | `pnpm changeset status` | リリース前に |
| バージョンバンプ | `pnpm changeset version` | リリース時（CI が自動実行） |
| パブリッシュ | `pnpm changeset publish` | Version Packages PR マージ後（CI が自動実行） |
| プレリリース開始 | `pnpm changeset pre enter alpha` | アルファ版リリース前 |
| プレリリース終了 | `pnpm changeset pre exit` | 安定版リリース前 |

`@changesets/action` を使った GitHub Actions ワークフローを導入することで、開発者は「`pnpm changeset` を実行してマークダウンを書くだけ」という最小限の作業でリリースサイクルを回せるようになる。

pnpm workspace・Turborepo との統合、linked/fixed によるバージョン連動、プレリリースモードを組み合わせることで、大規模なモノレポでも一貫したリリース管理が実現できる。バージョン管理の煩雑さから解放され、コード品質の向上に集中できる環境を整えよう。
