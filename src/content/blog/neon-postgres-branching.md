---
title: "Neonのブランチ機能でPostgreSQLデータベースを管理"
description: "NeonのPostgreSQLブランチ機能を使って、開発環境を効率的に管理する方法を解説します。Gitのようなワークフローでデータベーススキーマとデータをバージョン管理し、安全にテストできます。"
pubDate: "2025-02-05"
tags: ['インフラ', 'データベース', 'バックエンド']
heroImage: '../../assets/thumbnails/neon-postgres-branching.jpg'
---
## Neonとは

Neon（https://neon.tech）は、サーバーレスPostgreSQLデータベースサービスです。従来のPostgreSQLホスティングサービスと異なり、以下の特徴があります:

- **サーバーレス**: 使用量に応じた自動スケーリング
- **従量課金**: アイドル時はコストゼロ
- **高速プロビジョニング**: 数秒でデータベース作成
- **ブランチ機能**: Gitのようにデータベースをブランチ化
- **ポイントインタイムリカバリ**: 過去の任意の時点に復元可能

特に注目すべきは**ブランチ機能**です。開発、ステージング、本番環境を簡単に分離でき、データベースマイグレーションのテストが安全に行えます。

## Neonの基本セットアップ

### アカウント作成とプロジェクト初期化

1. Neon（https://neon.tech）にアクセス
2. GitHubアカウントでサインアップ
3. 新しいプロジェクトを作成

```bash
# Neon CLIのインストール
npm install -g neonctl

# 認証
neonctl auth

# プロジェクト一覧
neonctl projects list
```

### 最初のデータベース接続

Neonのダッシュボードから接続文字列を取得:

```
postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname
```

Node.jsでの接続例:

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('Connected:', result.rows[0]);
  } finally {
    client.release();
  }
}

testConnection();
```

## ブランチ機能の基本

### ブランチの作成

Gitのブランチのように、データベースのスナップショットを作成できます:

```bash
# メインブランチから新しいブランチを作成
neonctl branches create \
  --name dev \
  --project-id your-project-id

# 特定のブランチから派生させる
neonctl branches create \
  --name feature-user-auth \
  --parent dev \
  --project-id your-project-id
```

Web UIからも作成可能:

1. Neonダッシュボードを開く
2. 「Branches」タブをクリック
3. 「Create Branch」ボタンをクリック
4. ブランチ名と親ブランチを指定

### ブランチ一覧の確認

```bash
# すべてのブランチを表示
neonctl branches list --project-id your-project-id

# 詳細情報を表示
neonctl branches get dev --project-id your-project-id
```

### ブランチの削除

```bash
neonctl branches delete feature-user-auth --project-id your-project-id
```

## 実践的なブランチ戦略

### 開発ワークフローの例

```
main (本番)
  ├── staging (ステージング)
  └── dev (開発)
       ├── feature-1 (機能ブランチ1)
       └── feature-2 (機能ブランチ2)
```

このような構造を作成するスクリプト:

```javascript
// setup-branches.js
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function createBranch(name, parent = 'main') {
  try {
    const cmd = `neonctl branches create --name ${name} --parent ${parent} --project-id ${process.env.NEON_PROJECT_ID}`;
    const { stdout } = await execAsync(cmd);
    console.log(`✓ Created branch: ${name}`);
    return stdout;
  } catch (error) {
    console.error(`✗ Failed to create ${name}:`, error.message);
  }
}

async function setupBranches() {
  console.log('Setting up branch structure...\n');

  await createBranch('staging', 'main');
  await createBranch('dev', 'main');
  await createBranch('feature-user-profiles', 'dev');
  await createBranch('feature-notifications', 'dev');

  console.log('\n✓ Branch structure created successfully!');
}

setupBranches();
```

## データベースマイグレーションとブランチ

### Drizzle ORMとの統合

Drizzle ORMを使ったマイグレーション管理:

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

スキーマ定義:

```typescript
// src/db/schema.ts
import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  published: boolean('published').default(false),
  authorId: serial('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

マイグレーションスクリプト:

```typescript
// scripts/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function runMigration() {
  const connectionString = process.env.DATABASE_URL!;

  console.log(`Running migrations on: ${connectionString.split('@')[1]}`);

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✓ Migrations completed successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
```

### ブランチごとのマイグレーション

```bash
# 開発ブランチでマイグレーションをテスト
DATABASE_URL=$(neonctl connection-string dev) npm run migrate

# 問題なければステージングに適用
DATABASE_URL=$(neonctl connection-string staging) npm run migrate

# 最終的に本番に適用
DATABASE_URL=$(neonctl connection-string main) npm run migrate
```

自動化スクリプト:

```javascript
// scripts/safe-migrate.js
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getConnectionString(branch) {
  const { stdout } = await execAsync(
    `neonctl connection-string ${branch} --project-id ${process.env.NEON_PROJECT_ID}`
  );
  return stdout.trim();
}

async function safeMigrate(branch) {
  try {
    console.log(`\n📦 Migrating branch: ${branch}`);

    // ブランチの接続文字列を取得
    const dbUrl = await getConnectionString(branch);

    // マイグレーション実行
    await execAsync(`DATABASE_URL="${dbUrl}" npm run migrate`);

    console.log(`✓ Successfully migrated ${branch}`);
    return true;
  } catch (error) {
    console.error(`✗ Migration failed on ${branch}:`, error.message);
    return false;
  }
}

async function main() {
  const branches = ['dev', 'staging', 'main'];

  for (const branch of branches) {
    const success = await safeMigrate(branch);

    if (!success) {
      console.error('\n❌ Migration pipeline stopped due to error');
      process.exit(1);
    }

    // 次のブランチに進む前に確認を求める
    if (branch !== 'main') {
      console.log(`\nReady to migrate ${branches[branches.indexOf(branch) + 1]}?`);
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('\n✓ All migrations completed successfully!');
}

main();
```

## テストデータの管理

### ブランチにシードデータを投入

```typescript
// scripts/seed.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, posts } from '../src/db/schema';

async function seed() {
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  try {
    console.log('🌱 Seeding database...');

    // ユーザーを作成
    const [user1, user2] = await db.insert(users).values([
      {
        email: 'alice@example.com',
        name: 'Alice',
      },
      {
        email: 'bob@example.com',
        name: 'Bob',
      },
    ]).returning();

    console.log('✓ Created users');

    // 投稿を作成
    await db.insert(posts).values([
      {
        title: 'First Post',
        content: 'Hello, World!',
        published: true,
        authorId: user1.id,
      },
      {
        title: 'Draft Post',
        content: 'Work in progress...',
        published: false,
        authorId: user2.id,
      },
      {
        title: 'Another Post',
        content: 'More content here',
        published: true,
        authorId: user1.id,
      },
    ]);

    console.log('✓ Created posts');
    console.log('✓ Seeding completed successfully!');
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();
```

ブランチごとに異なるシードデータ:

```typescript
// scripts/seed-by-branch.ts
const seedData = {
  dev: {
    users: [
      { email: 'dev1@test.com', name: 'Dev User 1' },
      { email: 'dev2@test.com', name: 'Dev User 2' },
    ],
    // 大量のテストデータ
  },
  staging: {
    users: [
      { email: 'staging@test.com', name: 'Staging User' },
    ],
    // 本番に近いデータ
  },
  main: {
    // 本番データ（通常はシードしない）
  },
};

async function seedByBranch(branch: string) {
  const data = seedData[branch];
  if (!data) {
    console.log(`No seed data for branch: ${branch}`);
    return;
  }

  // データ投入処理
  // ...
}
```

## 環境変数の管理

### .envファイルの分離

```bash
# .env.dev
DATABASE_URL=postgresql://user:pass@ep-dev.neon.tech/db

# .env.staging
DATABASE_URL=postgresql://user:pass@ep-staging.neon.tech/db

# .env.production
DATABASE_URL=postgresql://user:pass@ep-main.neon.tech/db
```

環境切り替えスクリプト:

```javascript
// scripts/switch-env.js
import fs from 'fs';

const env = process.argv[2] || 'dev';
const envFile = `.env.${env}`;

if (!fs.existsSync(envFile)) {
  console.error(`Environment file not found: ${envFile}`);
  process.exit(1);
}

fs.copyFileSync(envFile, '.env');
console.log(`✓ Switched to ${env} environment`);
```

使用方法:

```bash
# 開発環境に切り替え
node scripts/switch-env.js dev

# アプリケーション起動
npm run dev
```

## ブランチのリセットとロールバック

### 特定の時点に復元

Neonはポイントインタイムリカバリ（PITR）をサポートしています:

```bash
# 1時間前の状態に復元
neonctl branches restore dev \
  --timestamp "2025-02-05 10:00:00" \
  --project-id your-project-id

# 別の名前で復元
neonctl branches create \
  --name dev-backup \
  --parent dev \
  --timestamp "2025-02-05 10:00:00" \
  --project-id your-project-id
```

### データのコピー

あるブランチから別のブランチにデータをコピー:

```bash
# pg_dumpとpg_restoreを使用
pg_dump $SOURCE_DATABASE_URL > dump.sql
psql $TARGET_DATABASE_URL < dump.sql
```

自動化スクリプト:

```javascript
// scripts/copy-branch-data.js
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function copyBranchData(from, to) {
  try {
    console.log(`Copying data from ${from} to ${to}...`);

    const sourceUrl = await getConnectionString(from);
    const targetUrl = await getConnectionString(to);

    // ダンプ
    await execAsync(`pg_dump "${sourceUrl}" > /tmp/branch-dump.sql`);
    console.log('✓ Dump created');

    // リストア
    await execAsync(`psql "${targetUrl}" < /tmp/branch-dump.sql`);
    console.log('✓ Data restored');

    // クリーンアップ
    await execAsync('rm /tmp/branch-dump.sql');
    console.log('✓ Copy completed successfully!');
  } catch (error) {
    console.error('✗ Copy failed:', error.message);
    process.exit(1);
  }
}

async function getConnectionString(branch) {
  const { stdout } = await execAsync(
    `neonctl connection-string ${branch} --project-id ${process.env.NEON_PROJECT_ID}`
  );
  return stdout.trim();
}

// 使用例: node copy-branch-data.js main dev
const [from, to] = process.argv.slice(2);
copyBranchData(from, to);
```

## CI/CDとの統合

### GitHub Actionsでのマイグレーション

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches:
      - main
      - staging
      - dev

jobs:
  migrate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Determine branch
        id: branch
        run: |
          BRANCH_NAME=${GITHUB_REF#refs/heads/}
          echo "name=$BRANCH_NAME" >> $GITHUB_OUTPUT

      - name: Get Neon database URL
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
          NEON_PROJECT_ID: ${{ secrets.NEON_PROJECT_ID }}
        run: |
          npm install -g neonctl
          DB_URL=$(neonctl connection-string ${{ steps.branch.outputs.name }} --project-id $NEON_PROJECT_ID)
          echo "DATABASE_URL=$DB_URL" >> $GITHUB_ENV

      - name: Run migrations
        run: npm run migrate

      - name: Run seeds (dev/staging only)
        if: steps.branch.outputs.name != 'main'
        run: npm run seed
```

### プレビュー環境の自動作成

Pull Requestごとに一時的なブランチを作成:

```yaml
# .github/workflows/preview.yml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  create-preview:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Create preview branch
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
          NEON_PROJECT_ID: ${{ secrets.NEON_PROJECT_ID }}
        run: |
          npm install -g neonctl
          BRANCH_NAME="pr-${{ github.event.pull_request.number }}"
          neonctl branches create \
            --name $BRANCH_NAME \
            --parent dev \
            --project-id $NEON_PROJECT_ID

          DB_URL=$(neonctl connection-string $BRANCH_NAME --project-id $NEON_PROJECT_ID)
          echo "Preview DB: $DB_URL"

      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✓ Preview database created: `pr-${{ github.event.pull_request.number }}`'
            })
```

## パフォーマンスとコスト最適化

### 自動スケーリング設定

```bash
# 最小・最大コンピュートユニットを設定
neonctl branches update dev \
  --compute-min 0.25 \
  --compute-max 2 \
  --project-id your-project-id
```

### 不要なブランチの自動削除

```javascript
// scripts/cleanup-old-branches.js
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function cleanupOldBranches() {
  const { stdout } = await execAsync(
    `neonctl branches list --project-id ${process.env.NEON_PROJECT_ID} --output json`
  );

  const branches = JSON.parse(stdout);
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7日

  for (const branch of branches) {
    // メインブランチは除外
    if (['main', 'staging', 'dev'].includes(branch.name)) {
      continue;
    }

    const age = now - new Date(branch.created_at).getTime();

    if (age > maxAge) {
      console.log(`Deleting old branch: ${branch.name}`);
      await execAsync(
        `neonctl branches delete ${branch.name} --project-id ${process.env.NEON_PROJECT_ID}`
      );
    }
  }
}

cleanupOldBranches();
```

## まとめ

Neonのブランチ機能を活用することで、以下のメリットが得られます:

- **安全なマイグレーション**: 本番に影響を与えずにスキーマ変更をテスト
- **環境分離**: 開発、ステージング、本番を明確に分離
- **高速プロビジョニング**: 数秒で新しい環境を作成
- **柔軟なロールバック**: 任意の時点に復元可能
- **コスト効率**: 使用した分だけの課金

Gitのようなワークフローでデータベースを管理できるため、開発チームの生産性が大幅に向上します。ぜひNeonを試してみてください。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
