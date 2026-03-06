---
title: "Neonブランチングデータベース: Git的ワークフローでPostgreSQLを管理"
description: "Neonのデータベースブランチング機能を使って、Gitのようにデータベースをブランチ管理する方法を解説。開発からステージング、本番環境までのシームレスなワークフローを実現します。Neon・PostgreSQL・データベースに関する実践情報。"
pubDate: "2025-08-03"
updatedDate: "2025-08-03"
tags: ["Neon", "PostgreSQL", "データベース", "DevOps", "CICD", "インフラ"]
category: "Development"
---
データベースの開発環境管理は長年の課題でした。Neonのブランチング機能は、Gitのブランチのようにデータベースを瞬時に複製し、独立した環境を作成できる革新的な機能です。本記事では、Neonブランチングの実践的な活用方法を解説します。

## Neonブランチングとは

### 従来の問題点

従来のデータベース開発では、以下の課題がありました:

- 開発環境のセットアップに時間がかかる
- 本番データを使ったテストが困難
- ブランチごとに独立した環境を用意するのが大変
- データベーススキーマの変更テストがリスキー

### Neonの解決策

Neonは **Copy-on-Write (CoW)** という技術を使い、データベースのブランチを数秒で作成できます:

- ブランチ作成は瞬時（数秒）
- ストレージを共有するため、追加コストがほぼゼロ
- 各ブランチは完全に独立した接続文字列を持つ
- 親ブランチに影響を与えずに自由に実験できる

## 基本的な使い方

### CLIでのブランチ操作

```bash
# Neon CLIのインストール
npm install -g neonctl

# ログイン
neonctl auth

# プロジェクト一覧
neonctl projects list

# ブランチ一覧
neonctl branches list --project-id <project-id>

# 新しいブランチを作成（mainから）
neonctl branches create --project-id <project-id> --name feature/new-schema

# 特定のブランチから作成
neonctl branches create \
  --project-id <project-id> \
  --parent dev \
  --name feature/user-profile

# ブランチ削除
neonctl branches delete --project-id <project-id> --branch feature/old-feature

# ブランチの接続情報を取得
neonctl connection-string <branch-name> --project-id <project-id>
```

### Web UIでの操作

Neonのダッシュボードから直感的に操作可能:

1. プロジェクトを開く
2. "Branches" タブをクリック
3. "Create branch" ボタンで新しいブランチを作成
4. 親ブランチ、ブランチ名を指定
5. 接続文字列をコピーして使用

## 実践的なワークフロー

### 1. 機能開発フロー

```bash
# 1. 新機能のためのブランチを作成
neonctl branches create \
  --project-id abc123 \
  --parent main \
  --name feature/add-comments

# 2. 接続文字列を取得して.env.localに設定
neonctl connection-string feature/add-comments > .env.local

# 3. マイグレーションを実行
npm run migrate

# 4. 開発とテスト
npm run dev

# 5. 完了したらマージ（後述）
```

### 2. Drizzle ORMとの統合

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```typescript
// scripts/branch-workflow.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as schema from './db/schema';

interface BranchConfig {
  projectId: string;
  parentBranch: string;
  newBranch: string;
}

async function createFeatureBranch(config: BranchConfig) {
  // 1. Neonブランチを作成
  const { execSync } = await import('child_process');

  const createCmd = `neonctl branches create \
    --project-id ${config.projectId} \
    --parent ${config.parentBranch} \
    --name ${config.newBranch}`;

  execSync(createCmd);

  // 2. 接続文字列を取得
  const connectionString = execSync(
    `neonctl connection-string ${config.newBranch} --project-id ${config.projectId}`
  ).toString().trim();

  // 3. マイグレーションを実行
  const sql = neon(connectionString);
  const db = drizzle(sql, { schema });

  await migrate(db, { migrationsFolder: './drizzle' });

  console.log(`✅ Branch "${config.newBranch}" created and migrated`);
  console.log(`Connection string: ${connectionString}`);

  return connectionString;
}

// 使用例
createFeatureBranch({
  projectId: 'abc123',
  parentBranch: 'main',
  newBranch: 'feature/new-api',
});
```

### 3. GitHub Actionsとの統合

```yaml
# .github/workflows/preview.yml
name: Create Preview Environment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  create-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Neon CLI
        run: npm install -g neonctl

      - name: Create Database Branch
        id: create-branch
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
        run: |
          BRANCH_NAME="preview/pr-${{ github.event.pull_request.number }}"

          # 既存のブランチを削除（存在する場合）
          neonctl branches delete $BRANCH_NAME --project-id ${{ secrets.NEON_PROJECT_ID }} || true

          # 新しいブランチを作成
          neonctl branches create \
            --project-id ${{ secrets.NEON_PROJECT_ID }} \
            --parent main \
            --name $BRANCH_NAME

          # 接続文字列を取得
          CONNECTION_STRING=$(neonctl connection-string $BRANCH_NAME --project-id ${{ secrets.NEON_PROJECT_ID }})

          echo "branch_name=$BRANCH_NAME" >> $GITHUB_OUTPUT
          echo "connection_string=$CONNECTION_STRING" >> $GITHUB_OUTPUT

      - name: Run Migrations
        env:
          DATABASE_URL: ${{ steps.create-branch.outputs.connection_string }}
        run: |
          npm install
          npm run migrate

      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          DATABASE_URL: ${{ steps.create-branch.outputs.connection_string }}
        run: |
          npx vercel --token $VERCEL_TOKEN \
            --env DATABASE_URL="$DATABASE_URL" \
            --yes

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ Preview environment created!\n\nDatabase branch: \`${{ steps.create-branch.outputs.branch_name }}\``
            })
```

### 4. PRクローズ時のクリーンアップ

```yaml
# .github/workflows/cleanup.yml
name: Cleanup Preview Environment

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Install Neon CLI
        run: npm install -g neonctl

      - name: Delete Database Branch
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
        run: |
          BRANCH_NAME="preview/pr-${{ github.event.pull_request.number }}"

          neonctl branches delete $BRANCH_NAME \
            --project-id ${{ secrets.NEON_PROJECT_ID }}

          echo "✅ Deleted branch: $BRANCH_NAME"
```

## 高度な活用パターン

### 1. タイムトラベル: 特定時点のデータに戻す

```bash
# 過去の特定時点からブランチを作成
neonctl branches create \
  --project-id abc123 \
  --parent main \
  --name recovery/before-incident \
  --timestamp "2025-08-01T10:00:00Z"

# 本番データの問題調査に活用
```

```typescript
// scripts/time-travel.ts
async function investigateIssue(timestamp: string) {
  const branchName = `debug/${Date.now()}`;

  // 問題が発生する前の状態でブランチを作成
  execSync(`
    neonctl branches create \
      --project-id ${PROJECT_ID} \
      --parent main \
      --name ${branchName} \
      --timestamp "${timestamp}"
  `);

  const connectionString = execSync(
    `neonctl connection-string ${branchName}`
  ).toString().trim();

  // 調査用のクエリを実行
  const sql = neon(connectionString);
  const results = await sql`
    SELECT * FROM users WHERE deleted_at > ${timestamp}
  `;

  console.log('Deleted users:', results);
}
```

### 2. 本番データでのテスト

```typescript
// scripts/test-with-prod-data.ts
import { neon } from '@neondatabase/serverless';

async function testWithProductionData() {
  // 本番データのスナップショットからブランチを作成
  const branchName = `test/load-test-${Date.now()}`;

  execSync(`
    neonctl branches create \
      --project-id ${PROJECT_ID} \
      --parent production \
      --name ${branchName}
  `);

  const connectionString = execSync(
    `neonctl connection-string ${branchName}`
  ).toString().trim();

  // 本番相当のデータでパフォーマンステスト
  const sql = neon(connectionString);

  console.time('Query performance');
  await sql`
    SELECT u.*, COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    GROUP BY u.id
    LIMIT 1000
  `;
  console.timeEnd('Query performance');

  // テスト完了後、ブランチを削除
  execSync(`neonctl branches delete ${branchName} --project-id ${PROJECT_ID}`);
}
```

### 3. マイグレーションのテストフロー

```typescript
// scripts/test-migration.ts
interface MigrationTestResult {
  success: boolean;
  duration: number;
  errors: string[];
}

async function testMigration(
  migrationPath: string
): Promise<MigrationTestResult> {
  const branchName = `migration-test/${Date.now()}`;
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // 1. テスト用ブランチを作成
    execSync(`
      neonctl branches create \
        --project-id ${PROJECT_ID} \
        --parent main \
        --name ${branchName}
    `);

    const connectionString = execSync(
      `neonctl connection-string ${branchName}`
    ).toString().trim();

    // 2. マイグレーションを実行
    process.env.DATABASE_URL = connectionString;
    const { migrate } = await import('drizzle-orm/neon-http/migrator');
    const sql = neon(connectionString);
    const db = drizzle(sql);

    await migrate(db, { migrationsFolder: migrationPath });

    // 3. 整合性チェック
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    console.log('Tables after migration:', tables);

    // 4. ロールバックテスト
    // （必要に応じて）

    return {
      success: true,
      duration: Date.now() - startTime,
      errors,
    };
  } catch (error) {
    errors.push(error.message);
    return {
      success: false,
      duration: Date.now() - startTime,
      errors,
    };
  } finally {
    // 5. クリーンアップ
    try {
      execSync(`neonctl branches delete ${branchName} --project-id ${PROJECT_ID}`);
    } catch (e) {
      console.error('Failed to cleanup branch:', e);
    }
  }
}

// CI/CDで使用
const result = await testMigration('./drizzle');
if (!result.success) {
  console.error('Migration test failed:', result.errors);
  process.exit(1);
}
```

### 4. 環境変数管理の自動化

```typescript
// scripts/env-manager.ts
import fs from 'fs';
import path from 'path';

interface Environment {
  name: string;
  branch: string;
  features?: string[];
}

const environments: Environment[] = [
  { name: 'development', branch: 'main' },
  { name: 'staging', branch: 'staging' },
  { name: 'production', branch: 'production' },
];

async function updateEnvFiles() {
  for (const env of environments) {
    const connectionString = execSync(
      `neonctl connection-string ${env.branch} --project-id ${PROJECT_ID}`
    ).toString().trim();

    const envContent = `
# Auto-generated by env-manager.ts
# Last updated: ${new Date().toISOString()}

DATABASE_URL="${connectionString}"
NEXT_PUBLIC_ENV="${env.name}"
`;

    const envPath = path.join(process.cwd(), `.env.${env.name}`);
    fs.writeFileSync(envPath, envContent.trim());

    console.log(`✅ Updated ${envPath}`);
  }
}

updateEnvFiles();
```

## セキュリティとベストプラクティス

### 1. 接続文字列の管理

```typescript
// lib/db.ts
import { neon } from '@neondatabase/serverless';

// 環境ごとに異なるブランチを使用
function getDatabaseUrl() {
  const env = process.env.NODE_ENV;

  switch (env) {
    case 'production':
      return process.env.DATABASE_URL_PRODUCTION!;
    case 'staging':
      return process.env.DATABASE_URL_STAGING!;
    default:
      return process.env.DATABASE_URL!;
  }
}

export const sql = neon(getDatabaseUrl());
```

### 2. ブランチの命名規則

```
main                    # 本番環境
staging                 # ステージング環境
dev                     # 共有開発環境

feature/*               # 機能開発ブランチ
  feature/user-auth
  feature/payment-integration

bugfix/*                # バグ修正ブランチ
  bugfix/login-issue

preview/pr-*            # PRプレビュー環境
  preview/pr-123

test/*                  # テスト用の一時ブランチ
  test/load-test-2025-08-03

recovery/*              # 障害復旧用
  recovery/before-incident-2025-08-01
```

### 3. 自動クリーンアップ

```typescript
// scripts/cleanup-old-branches.ts
async function cleanupOldBranches(maxAgeDays: number = 7) {
  const { stdout } = execSync(
    `neonctl branches list --project-id ${PROJECT_ID} --output json`
  );

  const branches = JSON.parse(stdout.toString());
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  for (const branch of branches) {
    // メインブランチは保護
    if (['main', 'staging', 'production'].includes(branch.name)) {
      continue;
    }

    const createdAt = new Date(branch.created_at).getTime();
    const age = now - createdAt;

    if (age > maxAgeMs) {
      console.log(`Deleting old branch: ${branch.name}`);
      execSync(
        `neonctl branches delete ${branch.name} --project-id ${PROJECT_ID}`
      );
    }
  }
}

// Cron jobで定期実行
cleanupOldBranches(7);
```

## コスト最適化

Neonのブランチングは Copy-on-Write のため、初期コストはほぼゼロですが、以下の点に注意:

### 1. ストレージコスト

```typescript
// ブランチのストレージ使用量を監視
async function monitorBranchStorage() {
  const { stdout } = execSync(
    `neonctl branches list --project-id ${PROJECT_ID} --output json`
  );

  const branches = JSON.parse(stdout.toString());

  for (const branch of branches) {
    console.log(`Branch: ${branch.name}`);
    console.log(`  Storage: ${branch.logical_size_bytes / 1024 / 1024} MB`);
    console.log(`  Active: ${branch.active}`);
  }
}
```

### 2. 自動スリープ設定

```bash
# 非アクティブなブランチを自動的にスリープ
neonctl branches update <branch-name> \
  --project-id ${PROJECT_ID} \
  --suspend-timeout 300  # 5分間非アクティブでスリープ
```

## まとめ

Neonのブランチング機能により、以下が実現できます:

- **高速な環境構築**: 数秒でデータベースブランチを作成
- **完全な分離**: 各ブランチは独立し、本番環境に影響なし
- **コスト効率**: Copy-on-Writeで初期コストはゼロ
- **Git的ワークフロー**: コードと同じようにデータベースを管理
- **安全なテスト**: 本番データで安全にテスト可能

データベースのブランチングは、モダンな開発フローに欠かせない機能です。Neonを活用して、より安全で効率的な開発ワークフローを構築しましょう。
