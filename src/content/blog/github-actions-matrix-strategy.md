---
title: "GitHub Actions Matrix Strategy活用術：効率的な並列テストとCI/CD"
description: "GitHub ActionsのMatrix Strategyを使った並列テスト実行とCI/CDパイプライン最適化の実践ガイド。複数環境でのテストを効率化します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2025-02-06"
tags: ["GitHub Actions", "CICD", "DevOps", "Testing", "Automation", "インフラ"]
heroImage: '../../assets/thumbnails/github-actions-matrix-strategy.jpg'
---

複数のNode.jsバージョン、OS、ブラウザでテストを実行したいとき、手動で設定するのは非効率です。**GitHub Actions Matrix Strategy**を使えば、設定を宣言的に記述するだけで、自動的に並列実行されます。本記事では、Matrix Strategyの基礎から高度な活用法まで、実践的なテクニックを解説します。

## Matrix Strategyとは

Matrix Strategyは、複数の変数の組み合わせに対してジョブを並列実行する機能です。例えば、3つのNode.jsバージョン × 3つのOSでテストを実行する場合、9つのジョブが自動生成されます。

### 基本的な仕組み

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 21]
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

この設定で、以下の9つのジョブが並列実行されます：

- Node 18 on Ubuntu
- Node 18 on Windows
- Node 18 on macOS
- Node 20 on Ubuntu
- Node 20 on Windows
- Node 20 on macOS
- Node 21 on Ubuntu
- Node 21 on Windows
- Node 21 on macOS

## 基本的なMatrix設定

### シンプルなMatrix

`.github/workflows/test.yml`:

```yaml
name: Test Matrix

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    name: Test on Node ${{ matrix.node-version }}
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x, 21.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
```

### 複数次元のMatrix

```yaml
jobs:
  test:
    name: Test on ${{ matrix.os }} with Node ${{ matrix.node-version }}
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20]
        # 2 OSes × 2 Node versions = 4 jobs
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

### 複雑な組み合わせ

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node-version: [18, 20]
        architecture: [x64, arm64]
        # 2 × 2 × 2 = 8 jobs
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          architecture: ${{ matrix.architecture }}
      - run: npm ci
      - run: npm test
```

## includeとexclude

### 特定の組み合わせを除外

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [18, 20, 21]
    exclude:
      # macOS + Node 18の組み合わせを除外
      - os: macos-latest
        node-version: 18
      # Windows + Node 21の組み合わせを除外
      - os: windows-latest
        node-version: 21
```

### 特定の組み合わせを追加

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node-version: [18, 20]
    include:
      # 追加のテスト設定
      - os: ubuntu-latest
        node-version: 21
        experimental: true
      # macOSでは最新版のみテスト
      - os: macos-latest
        node-version: 21
```

### 条件付き変数の追加

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    include:
      - os: ubuntu-latest
        install-cmd: sudo apt-get install
      - os: windows-latest
        install-cmd: choco install
      - os: macos-latest
        install-cmd: brew install

steps:
  - name: Install dependencies
    run: ${{ matrix.install-cmd }} some-package
```

## fail-fastとmax-parallel

### fail-fast設定

デフォルトでは、1つのジョブが失敗すると全ジョブがキャンセルされます。これを無効化できます：

```yaml
strategy:
  fail-fast: false  # 1つ失敗しても他を継続
  matrix:
    node-version: [18, 20, 21]
```

### 並列実行数の制限

```yaml
strategy:
  max-parallel: 2  # 同時に2つまで実行
  matrix:
    node-version: [18, 19, 20, 21]
    # 4つのジョブを2つずつ並列実行
```

これはGitHub Actionsの使用量を節約したい場合に有効です。

## 実践的なMatrix活用例

### フロントエンドテスト（ブラウザマトリックス）

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    name: E2E on ${{ matrix.browser }} (${{ matrix.os }})
    runs-on: ${{ matrix.os }}
    
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        browser: [chrome, firefox, edge]
        exclude:
          # EdgeはWindowsのみ
          - os: ubuntu-latest
            browser: edge
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install ${{ matrix.browser }}
      
      - name: Run E2E tests
        run: npm run test:e2e -- --browser=${{ matrix.browser }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.browser }}-${{ matrix.os }}
          path: test-results/
```

### データベーステスト

```yaml
jobs:
  test-db:
    name: Test with ${{ matrix.database }}
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        database:
          - postgres:14
          - postgres:15
          - postgres:16
          - mysql:8.0
          - mysql:8.3
    
    services:
      db:
        image: ${{ matrix.database }}
        env:
          POSTGRES_PASSWORD: postgres
          MYSQL_ROOT_PASSWORD: mysql
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
      
      - name: Run tests
        run: npm test
```

### クロスプラットフォームビルド

```yaml
jobs:
  build:
    name: Build for ${{ matrix.platform }}
    runs-on: ${{ matrix.runner }}
    
    strategy:
      matrix:
        include:
          - platform: linux/amd64
            runner: ubuntu-latest
            output: linux-amd64
          - platform: linux/arm64
            runner: ubuntu-latest
            output: linux-arm64
          - platform: darwin/amd64
            runner: macos-latest
            output: darwin-amd64
          - platform: darwin/arm64
            runner: macos-latest
            output: darwin-arm64
          - platform: windows/amd64
            runner: windows-latest
            output: windows-amd64.exe
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      
      - name: Build binary
        run: |
          GOOS=$(echo ${{ matrix.platform }} | cut -d'/' -f1)
          GOARCH=$(echo ${{ matrix.platform }} | cut -d'/' -f2)
          go build -o dist/${{ matrix.output }} ./cmd/app
        env:
          CGO_ENABLED: 0
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: binary-${{ matrix.output }}
          path: dist/${{ matrix.output }}
```

### モノレポのパッケージテスト

```yaml
jobs:
  detect-packages:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.set-packages.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
      - id: set-packages
        run: |
          PACKAGES=$(ls -d packages/* | jq -R -s -c 'split("\n")[:-1]')
          echo "packages=$PACKAGES" >> $GITHUB_OUTPUT
  
  test:
    needs: detect-packages
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJson(needs.detect-packages.outputs.packages) }}
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Test package
        run: npm test --workspace=${{ matrix.package }}
```

## 動的Matrixの生成

### ファイルからMatrixを生成

```yaml
jobs:
  generate-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      
      - id: set-matrix
        run: |
          MATRIX=$(cat .github/test-matrix.json)
          echo "matrix=$MATRIX" >> $GITHUB_OUTPUT
  
  test:
    needs: generate-matrix
    runs-on: ${{ matrix.os }}
    strategy:
      matrix: ${{ fromJson(needs.generate-matrix.outputs.matrix) }}
    
    steps:
      - uses: actions/checkout@v4
      - run: echo "Testing on ${{ matrix.os }} with Node ${{ matrix.node }}"
```

`.github/test-matrix.json`:

```json
{
  "include": [
    { "os": "ubuntu-latest", "node": "18" },
    { "os": "ubuntu-latest", "node": "20" },
    { "os": "windows-latest", "node": "20" },
    { "os": "macos-latest", "node": "20" }
  ]
}
```

### 変更されたファイルに基づくMatrix

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api: 'services/api/**'
            web: 'services/web/**'
            worker: 'services/worker/**'
  
  test:
    needs: detect-changes
    if: needs.detect-changes.outputs.services != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: ${{ fromJson(needs.detect-changes.outputs.services) }}
    
    steps:
      - uses: actions/checkout@v4
      - name: Test ${{ matrix.service }}
        run: npm test --workspace=services/${{ matrix.service }}
```

## Matrix結果の集約

### 全ジョブの成功確認

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 21]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
  
  # 全てのテストが成功したことを確認
  test-summary:
    needs: test
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Check test results
        run: |
          if [ "${{ needs.test.result }}" != "success" ]; then
            echo "Some tests failed"
            exit 1
          fi
          echo "All tests passed!"
```

### テスト結果の統合レポート

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 21]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test -- --coverage
      
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.node-version }}
          path: coverage/
  
  coverage-report:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Download all coverage reports
        uses: actions/download-artifact@v4
        with:
          path: coverage-reports
      
      - name: Merge coverage reports
        run: |
          npm install -g nyc
          nyc merge coverage-reports coverage/merged.json
          nyc report --reporter=html --temp-dir=./coverage
      
      - name: Upload merged coverage
        uses: actions/upload-artifact@v4
        with:
          name: merged-coverage
          path: coverage/
```

## パフォーマンス最適化

### キャッシュの活用

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 21]
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'  # 自動キャッシュ
      
      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ matrix.node-version }}-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-${{ matrix.node-version }}-
            ${{ runner.os }}-node-
      
      - run: npm ci
      - run: npm test
```

### 並列度の最適化

```yaml
jobs:
  test:
    strategy:
      # 無料プランでは並列実行数に制限がある
      max-parallel: 5  # 最大5並列
      fail-fast: false  # 失敗しても継続
      matrix:
        node-version: [18, 20, 21]
        shard: [1, 2, 3, 4]  # テストを4分割
    
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      
      - run: npm ci
      
      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: npm test -- --shard=${{ matrix.shard }}/4
```

### 条件付き実行

```yaml
jobs:
  test:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            node-version: 18
            required: true
          - os: ubuntu-latest
            node-version: 20
            required: true
          - os: windows-latest
            node-version: 20
            required: false  # オプショナル
          - os: macos-latest
            node-version: 20
            required: false  # オプショナル
    
    runs-on: ${{ matrix.os }}
    continue-on-error: ${{ !matrix.required }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

## 再利用可能なMatrix Workflow

### Reusable Workflowの定義

`.github/workflows/test-template.yml`:

```yaml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      node-versions:
        required: true
        type: string
      os-list:
        required: false
        type: string
        default: '["ubuntu-latest"]'

jobs:
  test:
    strategy:
      matrix:
        node-version: ${{ fromJson(inputs.node-versions) }}
        os: ${{ fromJson(inputs.os-list) }}
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - run: npm ci
      - run: npm test
```

### Workflowの呼び出し

`.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test-lts:
    uses: ./.github/workflows/test-template.yml
    with:
      node-versions: '["18", "20"]'
      os-list: '["ubuntu-latest", "windows-latest", "macos-latest"]'
  
  test-latest:
    uses: ./.github/workflows/test-template.yml
    with:
      node-versions: '["21"]'
      os-list: '["ubuntu-latest"]'
```

## トラブルシューティング

### Matrixジョブのデバッグ

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 21]
    
    runs-on: ubuntu-latest
    
    steps:
      - name: Debug matrix values
        run: |
          echo "Node version: ${{ matrix.node-version }}"
          echo "Runner OS: ${{ runner.os }}"
          echo "Job ID: ${{ github.job }}"
          echo "Run ID: ${{ github.run_id }}"
      
      - uses: actions/checkout@v4
      
      - name: Enable debug logging
        run: echo "ACTIONS_STEP_DEBUG=true" >> $GITHUB_ENV
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      
      - run: npm ci
      - run: npm test
```

### 失敗したジョブのみ再実行

GitHub UIから個別のMatrixジョブを再実行できますが、ワークフロー上でも制御可能：

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 21]
    
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Check if should skip
        id: skip
        run: |
          # 特定条件でスキップ
          if [ "${{ matrix.node-version }}" == "18" ] && [ "${{ github.event_name }}" == "push" ]; then
            echo "skip=true" >> $GITHUB_OUTPUT
          fi
      
      - if: steps.skip.outputs.skip != 'true'
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      
      - if: steps.skip.outputs.skip != 'true'
        run: npm ci && npm test
```

## まとめ

GitHub Actions Matrix Strategyを活用することで、以下のメリットが得られます：

1. **効率的なテスト**: 複数環境での並列テスト実行
2. **設定の簡潔化**: 宣言的なMatrix定義
3. **柔軟性**: includeとexcludeによる細かい制御
4. **スケーラビリティ**: 動的Matrixによる拡張性
5. **コスト最適化**: max-parallelとキャッシュの活用

複雑なCI/CDパイプラインでも、Matrix Strategyを使えばシンプルかつ保守しやすい設定が実現できます。プロジェクトの要件に合わせて、最適なMatrix構成を見つけてください。

## 参考リンク

- [GitHub Actions - Using a matrix](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
- [GitHub Actions - Workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Actions - Reusing workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
