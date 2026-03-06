---
title: "Wrangler CLI完全ガイド：Cloudflare Workersの開発・デプロイ効率化"
description: "Wrangler CLIを使ったCloudflare Workersの開発からデプロイまでの完全ガイド。効率的なワークフロー構築とベストプラクティスを解説します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-06"
tags: ["Cloudflare", "Wrangler", "CLI", "Serverless", "DevOps", "インフラ"]
---
# Wrangler CLI完全ガイド：Cloudflare Workersの開発・デプロイ効率化

Cloudflare Workersは、エッジコンピューティングを活用したサーバーレスプラットフォームとして急速に普及しています。その開発体験を支えるのが**Wrangler CLI**です。本記事では、Wranglerを使った効率的な開発フローから本番デプロイまで、実践的なテクニックを網羅的に解説します。

## Wrangler CLIとは

Wranglerは、Cloudflare Workersの公式コマンドラインツールです。プロジェクトの初期化、ローカル開発、テスト、デプロイまでをシームレスに行えます。

### 主な機能

- **プロジェクト管理**: テンプレートからの素早いセットアップ
- **ローカル開発**: Miniflareベースの高速な開発サーバー
- **デプロイ管理**: 複数環境への簡単なデプロイ
- **KV/R2/D1操作**: データストアの直接操作
- **ログ確認**: リアルタイムログストリーミング
- **シークレット管理**: 環境変数の安全な管理

## インストールと初期設定

### Node.js経由でのインストール

```bash
# npm
npm install -g wrangler

# pnpm
pnpm add -g wrangler

# yarn
yarn global add wrangler

# バージョン確認
wrangler --version
```

### 認証設定

```bash
# ブラウザで認証
wrangler login

# または、APIトークンを使用
wrangler config

# 環境変数での設定（CI/CD向け）
export CLOUDFLARE_API_TOKEN=your_token_here
```

APIトークンは、Cloudflareダッシュボードの「My Profile > API Tokens」から作成できます。必要な権限は「Edit Cloudflare Workers」です。

## プロジェクトの作成

### テンプレートからの作成

```bash
# 基本的なWorkerプロジェクト
wrangler init my-worker

# TypeScript + 各種オプション
wrangler init my-worker --type typescript

# 既存ディレクトリで初期化
cd existing-project
wrangler init
```

### 対話的なセットアップ

Wrangler 3以降では、対話的なプロンプトでプロジェクトをカスタマイズできます：

```bash
wrangler init my-advanced-worker
# ✔ Would you like to use TypeScript? (y/n) › yes
# ✔ Would you like to create a package.json? (y/n) › yes
# ✔ Would you like to use a template? (y/n) › yes
# ✔ Which template would you like to use? › hello-world
```

### wrangler.tomlの設定

生成された`wrangler.toml`が設定ファイルです：

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2025-02-06"

# アカウント情報
account_id = "your_account_id"

# ルート設定
routes = [
  { pattern = "example.com/*", zone_name = "example.com" }
]

# 環境変数
[vars]
ENVIRONMENT = "production"

# KVネームスペース
[[kv_namespaces]]
binding = "MY_KV"
id = "your_kv_namespace_id"

# R2バケット
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"

# D1データベース
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your_database_id"
```

## ローカル開発ワークフロー

### 開発サーバーの起動

```bash
# 基本的な起動
wrangler dev

# ポート指定
wrangler dev --port 8787

# リモートモード（実際のCloudflare環境で実行）
wrangler dev --remote

# ローカルプロトコル（HTTPSでテスト）
wrangler dev --local-protocol https
```

### Hot Reloadとデバッグ

Wrangler 3のdevサーバーは自動的にファイル変更を検出します：

```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    console.log('Request URL:', request.url);
    
    // デバッグ用のヘッダー出力
    const headers = Object.fromEntries(request.headers);
    console.log('Headers:', headers);
    
    return new Response('Hello World!', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
```

開発中は`console.log`がターミナルにリアルタイムで表示されます。

### KV/R2のローカルエミュレーション

Wranglerは自動的にローカルストレージをエミュレートします：

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // KVへの書き込み（ローカルでもエミュレート）
    await env.MY_KV.put('key', 'value');
    const value = await env.MY_KV.get('key');
    
    return new Response(`Stored value: ${value}`);
  },
};
```

`.wrangler`ディレクトリにローカルデータが保存されます。

## デプロイ戦略

### 基本的なデプロイ

```bash
# 本番デプロイ
wrangler deploy

# ドライラン（実際にはデプロイしない）
wrangler deploy --dry-run

# 特定の環境にデプロイ
wrangler deploy --env production
```

### 環境別設定

`wrangler.toml`で複数環境を定義：

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2025-02-06"

# 開発環境
[env.dev]
name = "my-worker-dev"
vars = { ENVIRONMENT = "development" }

[[env.dev.kv_namespaces]]
binding = "MY_KV"
id = "dev_kv_namespace_id"

# 本番環境
[env.production]
name = "my-worker-prod"
routes = [
  { pattern = "api.example.com/*", zone_name = "example.com" }
]
vars = { ENVIRONMENT = "production" }

[[env.production.kv_namespaces]]
binding = "MY_KV"
id = "prod_kv_namespace_id"
```

デプロイ時に環境を指定：

```bash
# 開発環境
wrangler deploy --env dev

# 本番環境
wrangler deploy --env production
```

### バージョン管理とロールバック

Cloudflare Workersは自動的に以前のバージョンを保持します。ダッシュボードから簡単にロールバック可能ですが、gitタグとの連携も推奨されます：

```bash
# バージョンタグ付きデプロイ
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
wrangler deploy

# CI/CDでのデプロイ（後述）
```

## データストア操作

### KV操作

```bash
# キーの一覧表示
wrangler kv:namespace list

# 値の取得
wrangler kv:key get --binding=MY_KV "my-key"

# 値の設定
wrangler kv:key put --binding=MY_KV "my-key" "my-value"

# ファイルからの一括アップロード
wrangler kv:bulk put --binding=MY_KV data.json

# キーの削除
wrangler kv:key delete --binding=MY_KV "my-key"
```

JSONファイルでの一括操作例：

```json
[
  {
    "key": "user:1",
    "value": "{\"name\":\"Alice\",\"email\":\"alice@example.com\"}"
  },
  {
    "key": "user:2",
    "value": "{\"name\":\"Bob\",\"email\":\"bob@example.com\"}"
  }
]
```

```bash
wrangler kv:bulk put --binding=MY_KV users.json
```

### R2操作

```bash
# バケット一覧
wrangler r2 bucket list

# バケット作成
wrangler r2 bucket create my-bucket

# オブジェクトのアップロード
wrangler r2 object put my-bucket/file.txt --file=./local-file.txt

# オブジェクトのダウンロード
wrangler r2 object get my-bucket/file.txt --file=./downloaded-file.txt

# オブジェクトの削除
wrangler r2 object delete my-bucket/file.txt
```

### D1データベース操作

```bash
# データベース作成
wrangler d1 create my-database

# SQLの実行
wrangler d1 execute my-database --command="CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"

# ファイルからのSQL実行
wrangler d1 execute my-database --file=./schema.sql

# クエリの実行
wrangler d1 execute my-database --command="SELECT * FROM users"

# ローカルでのD1操作
wrangler d1 execute my-database --local --command="INSERT INTO users (name) VALUES ('Alice')"
```

## シークレット管理

機密情報は環境変数ではなくシークレットとして管理します：

```bash
# シークレットの設定（対話的）
wrangler secret put API_KEY

# パイプ経由での設定
echo "secret-value" | wrangler secret put API_KEY

# シークレット一覧
wrangler secret list

# シークレット削除
wrangler secret delete API_KEY

# 環境別シークレット
wrangler secret put API_KEY --env production
```

コード内での使用：

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // シークレットはenv経由でアクセス
    const apiKey = env.API_KEY;
    
    const response = await fetch('https://api.example.com/data', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    return response;
  },
};
```

## ログとモニタリング

### リアルタイムログ

```bash
# ログのストリーミング
wrangler tail

# 環境指定
wrangler tail --env production

# フィルタリング
wrangler tail --status error

# JSON形式で出力
wrangler tail --format json
```

### ログ出力のベストプラクティス

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();
    
    try {
      // 構造化ログ
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
      }));
      
      const response = await handleRequest(request, env);
      
      // パフォーマンスログ
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        type: 'performance',
        duration,
        status: response.status,
      }));
      
      return response;
    } catch (error) {
      // エラーログ
      console.error(JSON.stringify({
        type: 'error',
        message: error.message,
        stack: error.stack,
      }));
      
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
```

## CI/CDパイプライン構築

### GitHub Actionsでの自動デプロイ

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env production
```

### 環境別デプロイ戦略

```yaml
jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    steps:
      # ...
      - name: Deploy to Staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --env staging
  
  deploy-production:
    if: github.ref == 'refs/heads/main'
    steps:
      # ...
      - name: Deploy to Production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --env production
```

## 高度な設定とベストプラクティス

### TypeScript設定の最適化

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "types": ["@cloudflare/workers-types"],
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### バンドルサイズの最適化

```toml
# wrangler.toml
[build]
command = "npm run build"

[build.upload]
format = "modules"
main = "./dist/index.js"

# 不要なファイルを除外
[site]
bucket = "./public"
exclude = ["*.map", "*.ts"]
```

### カスタムドメイン設定

```bash
# ルートの追加
wrangler routes add "api.example.com/*" my-worker

# ルートの一覧
wrangler routes list

# ルートの削除
wrangler routes delete <route-id>
```

### Workers Sitesでの静的ファイル配信

```toml
[site]
bucket = "./public"
entry-point = "workers-site"
```

```typescript
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await getAssetFromKV(
        {
          request,
          waitUntil: () => {},
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST,
        }
      );
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }
  },
};
```

## トラブルシューティング

### よくある問題と解決策

#### 1. デプロイが失敗する

```bash
# 詳細なエラーログを確認
wrangler deploy --verbose

# キャッシュをクリア
rm -rf node_modules .wrangler
npm install
```

#### 2. ローカル開発でKVが動作しない

```bash
# .wranglerディレクトリを削除して再起動
rm -rf .wrangler
wrangler dev
```

#### 3. 認証エラー

```bash
# ログアウトして再認証
wrangler logout
wrangler login

# またはAPIトークンを確認
wrangler whoami
```

#### 4. TypeScriptのビルドエラー

```bash
# 型定義のインストール
npm install -D @cloudflare/workers-types

# tsconfig.jsonでtypesを指定
```

### デバッグテクニック

```typescript
// リクエスト情報の完全なダンプ
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const debugInfo = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers),
      cf: request.cf, // Cloudflare固有の情報
      env: Object.keys(env), // バインディング一覧
    };
    
    return new Response(JSON.stringify(debugInfo, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

## まとめ

Wrangler CLIは、Cloudflare Workersの開発体験を大幅に向上させる強力なツールです。本記事で紹介したテクニックを活用すれば、以下のような効率的なワークフローを構築できます：

1. **高速な開発サイクル**: ローカル開発サーバーによる即座のフィードバック
2. **環境分離**: 開発・ステージング・本番の明確な分離
3. **安全なデプロイ**: CI/CDパイプラインによる自動テストとデプロイ
4. **データ管理の簡素化**: KV/R2/D1の直感的な操作
5. **セキュリティ**: シークレット管理による機密情報の保護

エッジコンピューティングの可能性を最大限に引き出すために、Wranglerを使いこなしましょう。継続的な改善とモニタリングを忘れずに、パフォーマンスとユーザー体験の向上を目指してください。

## 参考リンク

- [Wrangler公式ドキュメント](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Workers Examples](https://developers.cloudflare.com/workers/examples/)
- [Miniflare (Local Development)](https://miniflare.dev/)
