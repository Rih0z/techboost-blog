---
title: 'GitHub Actions入門 — CI/CDパイプラインを30分で構築する方法'
description: 'GitHub Actionsを使ったCI/CDパイプラインの構築方法を初心者向けに解説。テスト自動化、デプロイ自動化、ビルド最適化まで、実践的なワークフロー例とYAML設定を詳しく紹介します。'
pubDate: 'Feb 05 2026'
---

コードをプッシュするたびに手動でテストを実行し、手動でデプロイしていませんか？GitHub Actionsを使えば、コードのプッシュをトリガーに、テスト・ビルド・デプロイを完全自動化できます。この記事では、GitHub Actionsの基礎から実践的なCI/CDパイプラインの構築まで、30分で理解できるように解説します。

## GitHub Actionsとは

GitHub Actionsは、GitHubに統合されたCI/CD（継続的インテグレーション/継続的デリバリー）プラットフォームです。

**主な特徴:**
- GitHubリポジトリに統合されている（追加ツール不要）
- YAMLファイルでワークフローを定義
- パブリックリポジトリは完全無料
- プライベートリポジトリも月2,000分無料
- Linux、Windows、macOSのランナーを提供
- 豊富なマーケットプレイスアクション

## 基本概念

### ワークフロー (Workflow)

自動化されたプロセス全体。`.github/workflows/xxx.yml`で定義します。

### ジョブ (Job)

ワークフロー内の実行単位。複数のステップで構成されます。

### ステップ (Step)

ジョブ内の個々のタスク。コマンドまたはアクションを実行します。

### アクション (Action)

再利用可能な処理のパッケージ。GitHubマーケットプレイスから利用できます。

### ランナー (Runner)

ワークフローを実行するサーバー。GitHubホステッドまたはセルフホステッド。

## 最初のワークフロー

リポジトリのルートに`.github/workflows/hello.yml`を作成します。

```yaml
name: Hello World

# ワークフローのトリガー
on:
  push:
    branches: [ main ]

# ジョブの定義
jobs:
  say-hello:
    runs-on: ubuntu-latest

    steps:
      - name: Print greeting
        run: echo "Hello, GitHub Actions!"
```

このファイルをmainブランチにプッシュすると、GitHub Actionsが自動実行されます。

**確認方法:**
1. GitHubリポジトリの「Actions」タブを開く
2. 「Hello World」ワークフローが実行中または完了している
3. クリックして詳細ログを確認

## Node.jsプロジェクトのテスト自動化

```yaml
name: Node.js CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]

    steps:
      # 1. リポジトリをチェックアウト
      - name: Checkout code
        uses: actions/checkout@v4

      # 2. Node.jsのセットアップ
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      # 3. 依存関係のインストール
      - name: Install dependencies
        run: npm ci

      # 4. Lintの実行
      - name: Run linter
        run: npm run lint

      # 5. テストの実行
      - name: Run tests
        run: npm test

      # 6. ビルドの確認
      - name: Build
        run: npm run build
```

### ポイント解説

#### actions/checkout@v4

リポジトリのコードをランナーにクローンします。ほぼすべてのワークフローで最初に実行します。

#### actions/setup-node@v4

Node.js環境をセットアップします。`cache: 'npm'`を指定すると、node_modulesのキャッシュが効きます。

#### strategy.matrix

複数のNode.jsバージョンでテストを実行します。この例では、Node.js 18、20、22の3つのジョブが並列実行されます。

#### npm ci vs npm install

- `npm ci` - package-lock.jsonに基づいて厳密にインストール（CI環境推奨）
- `npm install` - 依存関係を解決してインストール

## TypeScriptプロジェクトの例

```yaml
name: TypeScript CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
```

## Next.js + Vercelの自動デプロイ

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### シークレットの設定

1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」
2. 「New repository secret」をクリック
3. `VERCEL_TOKEN`を追加（Vercelのダッシュボードから取得）

## Docker イメージのビルドとプッシュ

```yaml
name: Docker Build and Push

on:
  push:
    branches: [ main ]
    tags:
      - 'v*'

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: myusername/myapp
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## 条件付き実行

```yaml
name: Conditional Workflow

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  deploy:
    needs: test  # testジョブが成功したら実行
    if: github.ref == 'refs/heads/main'  # mainブランチのみ
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run deploy
```

### if条件の例

```yaml
# mainブランチの場合のみ実行
if: github.ref == 'refs/heads/main'

# プルリクエストの場合のみ実行
if: github.event_name == 'pull_request'

# タグプッシュの場合のみ実行
if: startsWith(github.ref, 'refs/tags/')

# 前のステップが成功した場合のみ実行
if: success()

# 前のステップが失敗しても実行
if: always()
```

## スケジュール実行（Cron）

```yaml
name: Scheduled Tasks

on:
  schedule:
    # 毎日午前9時（UTC）に実行
    - cron: '0 9 * * *'
    # 毎週月曜日の午前0時（UTC）に実行
    - cron: '0 0 * * 1'

jobs:
  scheduled-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run scheduled task
        run: npm run scheduled-task
```

**Cron構文:**
```
┌───────────── 分 (0 - 59)
│ ┌───────────── 時 (0 - 23)
│ │ ┌───────────── 日 (1 - 31)
│ │ │ ┌───────────── 月 (1 - 12)
│ │ │ │ ┌───────────── 曜日 (0 - 6) (日曜日が0)
│ │ │ │ │
* * * * *
```

例:
- `0 0 * * *` - 毎日午前0時
- `0 */6 * * *` - 6時間ごと
- `0 9 * * 1-5` - 平日の午前9時

## キャッシュで高速化

```yaml
name: Fast CI with Cache

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'  # npmキャッシュ

      # カスタムキャッシュ
      - name: Cache node modules
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - run: npm ci
      - run: npm run build

      # ビルド成果物のキャッシュ
      - name: Cache build output
        uses: actions/cache@v4
        with:
          path: ./dist
          key: ${{ runner.os }}-build-${{ github.sha }}
```

## マトリックスビルド（複数環境テスト）

```yaml
name: Matrix Build

on: [push]

jobs:
  test:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18.x, 20.x, 22.x]
        exclude:
          # Windows + Node 18の組み合わせを除外
          - os: windows-latest
            node-version: 18.x

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }} on ${{ matrix.os }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - run: npm ci
      - run: npm test
```

この設定では、(3 OS × 3 Node version - 1 exclude = ) 8つのジョブが並列実行されます。

## 再利用可能なワークフロー

```yaml
# .github/workflows/reusable-test.yml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
      - run: npm test
```

```yaml
# .github/workflows/main.yml
name: Main CI

on: [push]

jobs:
  call-test:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '20.x'
```

## デバッグとトラブルシューティング

### デバッグログの有効化

リポジトリのSecretsに以下を追加:
- `ACTIONS_STEP_DEBUG`: `true`
- `ACTIONS_RUNNER_DEBUG`: `true`

### SSHでデバッグ

```yaml
- name: Setup tmate session
  uses: mxschmitt/action-tmate@v3
  if: failure()  # 失敗時のみSSH接続を許可
```

### ローカルでテスト

```bash
# act（GitHub Actionsのローカル実行ツール）
brew install act

# ワークフローをローカルで実行
act push
```

## ベストプラクティス

### 1. ワークフローをシンプルに保つ

```yaml
# ❌ 悪い例: 1つのジョブに全部詰め込む
jobs:
  everything:
    steps:
      - run: npm test
      - run: npm run lint
      - run: npm run build
      - run: npm run deploy

# ✅ 良い例: ジョブを分割
jobs:
  test:
    steps:
      - run: npm test

  lint:
    steps:
      - run: npm run lint

  deploy:
    needs: [test, lint]
    steps:
      - run: npm run deploy
```

### 2. シークレットを使う

```yaml
# ❌ 悪い例: パスワードをハードコード
- run: echo "password123" | docker login

# ✅ 良い例: シークレットを使う
- run: echo "${{ secrets.DOCKER_PASSWORD }}" | docker login
```

### 3. タイムアウトを設定

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10  # 10分でタイムアウト
    steps:
      - run: npm test
```

### 4. 並列実行を活用

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

  lint:
    runs-on: ubuntu-latest

  # testとlintは並列実行される
```

## まとめ

GitHub Actionsの基本から実践的なCI/CDパイプラインまでを解説しました。

**重要なポイント:**
- ワークフローは`.github/workflows/xxx.yml`で定義
- `on`でトリガーを指定（push、pull_request、schedule等）
- `jobs`で実行するタスクを定義
- `steps`で具体的な処理を記述
- キャッシュで高速化
- マトリックスビルドで複数環境テスト
- シークレットで機密情報を管理

GitHub Actionsを使えば、コードのプッシュからデプロイまでを完全自動化できます。最初は簡単なワークフローから始めて、徐々に複雑なパイプラインを構築していきましょう。

CI/CDの構築に役立つツールやテンプレートを探しているなら、開発者向けツール集のサイトもチェックしてみてください。
