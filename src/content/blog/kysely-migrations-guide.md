---
title: "Kyselyマイグレーション実践: 型安全なデータベーススキーマ管理"
description: "Kyselyを使った実践的なマイグレーション管理。スキーマバージョニング、ロールバック戦略、Zero-Downtime Deployment、本番環境での安全な運用手法を徹底解説。Kysely・PostgreSQL・マイグレーションに関する実践情報。"
pubDate: "2025-09-22"
updatedDate: "2025-09-22"
tags: ["Kysely", "PostgreSQL", "マイグレーション", "データベース", "TypeScript"]
heroImage: '../../assets/thumbnails/kysely-migrations-guide.jpg'
---
Kyselyは型安全なSQLクエリビルダーとして知られていますが、**マイグレーション機能**も強力です。この記事では、実践的なマイグレーション戦略と本番環境での安全な運用方法を解説します。

## Kyselyマイグレーションの基礎

### プロジェクト構成

```
src/
├── db/
│   ├── index.ts              # DB接続
│   ├── types.ts              # 型定義
│   └── migrations/
│       ├── 001_initial.ts
│       ├── 002_add_posts.ts
│       ├── 003_add_comments.ts
│       └── index.ts
├── scripts/
│   ├── migrate.ts            # マイグレーション実行
│   ├── migrate-down.ts       # ロールバック
│   └── generate-migration.ts # マイグレーション生成
└── package.json
```

### 基本的なマイグレーションファイル

```typescript
// src/db/migrations/001_initial.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // users テーブル
  await db.schema
    .createTable('users')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('password_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('role', 'varchar(50)', (col) => col.notNull().defaultTo('user'))
    .addColumn('email_verified', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // インデックス
  await db.schema
    .createIndex('users_email_idx')
    .on('users')
    .column('email')
    .execute();

  // 更新日時の自動更新トリガー（PostgreSQL）
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `.execute(db);

  await sql`
    CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS update_users_updated_at ON users`.execute(db);
  await sql`DROP FUNCTION IF EXISTS update_updated_at_column`.execute(db);
  await db.schema.dropTable('users').execute();
}
```

## マイグレーション実行スクリプト

### 基本的な実行スクリプト

```typescript
// src/scripts/migrate.ts
import { promises as fs } from 'fs';
import path from 'path';
import { Migrator, FileMigrationProvider } from 'kysely';
import { db } from '../db';

async function migrateToLatest() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../db/migrations'),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((result) => {
    if (result.status === 'Success') {
      console.log(`✅ Migration "${result.migrationName}" was executed successfully`);
    } else if (result.status === 'Error') {
      console.error(`❌ Failed to execute migration "${result.migrationName}"`);
    }
  });

  if (error) {
    console.error('❌ Failed to migrate');
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
  console.log('✅ All migrations executed successfully');
}

migrateToLatest();
```

### ロールバックスクリプト

```typescript
// src/scripts/migrate-down.ts
import { promises as fs } from 'fs';
import path from 'path';
import { Migrator, FileMigrationProvider, NO_MIGRATIONS } from 'kysely';
import { db } from '../db';

async function migrateDown(steps: number = 1) {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../db/migrations'),
    }),
  });

  for (let i = 0; i < steps; i++) {
    const { error, results } = await migrator.migrateDown();

    results?.forEach((result) => {
      if (result.status === 'Success') {
        console.log(`✅ Rolled back migration "${result.migrationName}"`);
      } else if (result.status === 'Error') {
        console.error(`❌ Failed to rollback migration "${result.migrationName}"`);
      } else if (result.status === 'NotExecuted') {
        console.log(`⚠️  Migration "${result.migrationName}" was not executed`);
      }
    });

    if (error) {
      console.error('❌ Failed to rollback');
      console.error(error);
      process.exit(1);
    }

    // これ以上ロールバックできない場合は終了
    if (results && results[0]?.status === 'NotExecuted') {
      console.log('⚠️  No more migrations to rollback');
      break;
    }
  }

  await db.destroy();
  console.log(`✅ Rolled back ${steps} migration(s) successfully`);
}

// コマンドライン引数からステップ数を取得
const steps = parseInt(process.argv[2] || '1', 10);
migrateDown(steps);
```

### マイグレーション状態の確認

```typescript
// src/scripts/migration-status.ts
import { promises as fs } from 'fs';
import path from 'path';
import { Migrator, FileMigrationProvider } from 'kysely';
import { db } from '../db';

async function getMigrationStatus() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../db/migrations'),
    }),
  });

  const migrations = await migrator.getMigrations();

  console.log('\n📋 Migration Status:\n');

  migrations.forEach((migration) => {
    const status = migration.executedAt
      ? `✅ Executed at ${migration.executedAt.toISOString()}`
      : '⏳ Pending';

    console.log(`${migration.name}: ${status}`);
  });

  await db.destroy();
}

getMigrationStatus();
```

## 実践的なマイグレーションパターン

### パターン1: カラム追加（NULL許容）

```typescript
// src/db/migrations/004_add_user_bio.ts
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 既存データに影響を与えないようNULL許容で追加
  await db.schema
    .alterTable('users')
    .addColumn('bio', 'text', (col) => col)
    .execute();

  // 必要に応じてデフォルト値を設定
  await db
    .updateTable('users')
    .set({ bio: '' })
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .dropColumn('bio')
    .execute();
}
```

### パターン2: カラム追加（NOT NULL、既存データあり）

```typescript
// src/db/migrations/005_add_user_status.ts
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Step 1: NULL許容でカラム追加
  await db.schema
    .alterTable('users')
    .addColumn('status', 'varchar(50)', (col) => col)
    .execute();

  // Step 2: 既存データにデフォルト値を設定
  await db
    .updateTable('users')
    .set({ status: 'active' })
    .execute();

  // Step 3: NOT NULL制約を追加
  await db.schema
    .alterTable('users')
    .alterColumn('status', (col) => col.setNotNull())
    .execute();

  // Step 4: デフォルト値を設定
  await db.schema
    .alterTable('users')
    .alterColumn('status', (col) => col.setDefault('active'))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .dropColumn('status')
    .execute();
}
```

### パターン3: カラム名変更

```typescript
// src/db/migrations/006_rename_column.ts
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // password_hash → hashed_password
  await db.schema
    .alterTable('users')
    .renameColumn('password_hash', 'hashed_password')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .renameColumn('hashed_password', 'password_hash')
    .execute();
}
```

### パターン4: 複雑なデータ変換

```typescript
// src/db/migrations/007_normalize_tags.ts
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Step 1: 新しいテーブルを作成
  await db.schema
    .createTable('tags')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('post_tags')
    .addColumn('post_id', 'integer', (col) => col.notNull().references('posts.id').onDelete('cascade'))
    .addColumn('tag_id', 'integer', (col) => col.notNull().references('tags.id').onDelete('cascade'))
    .addPrimaryKeyConstraint('post_tags_pk', ['post_id', 'tag_id'])
    .execute();

  // Step 2: 既存のタグデータを移行
  const posts = await db
    .selectFrom('posts')
    .select(['id', 'tags'])
    .where('tags', 'is not', null)
    .execute();

  for (const post of posts) {
    if (!post.tags) continue;

    const tagNames = (post.tags as string).split(',').map((t) => t.trim());

    for (const tagName of tagNames) {
      // タグを取得または作成
      let tag = await db
        .selectFrom('tags')
        .select('id')
        .where('name', '=', tagName)
        .executeTakeFirst();

      if (!tag) {
        tag = await db
          .insertInto('tags')
          .values({ name: tagName })
          .returning('id')
          .executeTakeFirstOrThrow();
      }

      // 関連付けを作成
      await db
        .insertInto('post_tags')
        .values({ post_id: post.id, tag_id: tag.id })
        .onConflict((oc) => oc.constraint('post_tags_pk').doNothing())
        .execute();
    }
  }

  // Step 3: 古いカラムを削除
  await db.schema
    .alterTable('posts')
    .dropColumn('tags')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Step 1: 古いカラムを復元
  await db.schema
    .alterTable('posts')
    .addColumn('tags', 'text')
    .execute();

  // Step 2: データを逆変換
  const posts = await db.selectFrom('posts').select('id').execute();

  for (const post of posts) {
    const tags = await db
      .selectFrom('post_tags')
      .innerJoin('tags', 'tags.id', 'post_tags.tag_id')
      .select('tags.name')
      .where('post_tags.post_id', '=', post.id)
      .execute();

    const tagString = tags.map((t) => t.name).join(', ');

    await db
      .updateTable('posts')
      .set({ tags: tagString || null })
      .where('id', '=', post.id)
      .execute();
  }

  // Step 3: 新しいテーブルを削除
  await db.schema.dropTable('post_tags').execute();
  await db.schema.dropTable('tags').execute();
}
```

### パターン5: インデックスの追加（大規模テーブル）

```typescript
// src/db/migrations/008_add_large_index.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // CONCURRENTLY オプションでロックを最小化（PostgreSQL）
  await sql`
    CREATE INDEX CONCURRENTLY posts_published_created_idx
    ON posts (published, created_at DESC)
    WHERE published = true
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX CONCURRENTLY IF EXISTS posts_published_created_idx`.execute(db);
}
```

## Zero-Downtime Deployment戦略

### 戦略1: Expand-Contract パターン

```typescript
// Phase 1: Expand - 新しいカラムを追加（NULL許容）
// src/db/migrations/009_add_new_email.ts
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('email_new', 'varchar(255)', (col) => col.unique())
    .execute();

  // 既存データをコピー
  await sql`UPDATE users SET email_new = email WHERE email_new IS NULL`.execute(db);
}

// Phase 2: アプリケーションコードを更新（両方のカラムに書き込む）
// src/repositories/userRepository.ts
async function updateUserEmail(userId: number, email: string) {
  await db
    .updateTable('users')
    .set({
      email,       // 古いカラム
      email_new: email, // 新しいカラム
    })
    .where('id', '=', userId)
    .execute();
}

// Phase 3: Contract - 古いカラムを削除
// src/db/migrations/010_remove_old_email.ts
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .dropColumn('email')
    .execute();

  await db.schema
    .alterTable('users')
    .renameColumn('email_new', 'email')
    .execute();
}
```

### 戦略2: Feature Flag による段階的ロールアウト

```typescript
// src/db/migrations/011_add_feature_flags.ts
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('feature_flags')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('enabled', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('rollout_percentage', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // デフォルトのフィーチャーフラグを挿入
  await db
    .insertInto('feature_flags')
    .values([
      { name: 'new_email_system', enabled: false, rollout_percentage: 0 },
      { name: 'new_payment_flow', enabled: false, rollout_percentage: 0 },
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('feature_flags').execute();
}

// アプリケーションコード
async function shouldUseNewEmailSystem(userId: number): Promise<boolean> {
  const flag = await db
    .selectFrom('feature_flags')
    .select(['enabled', 'rollout_percentage'])
    .where('name', '=', 'new_email_system')
    .executeTakeFirst();

  if (!flag || !flag.enabled) return false;

  // ユーザーIDベースの段階的ロールアウト
  if (flag.rollout_percentage === 100) return true;

  const userHash = userId % 100;
  return userHash < flag.rollout_percentage;
}
```

## 本番環境でのベストプラクティス

### 1. マイグレーション前のバックアップ

```typescript
// src/scripts/migrate-with-backup.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `backup-${timestamp}.sql`;

  console.log('📦 Creating database backup...');

  await execAsync(
    `pg_dump ${process.env.DATABASE_URL} -f ${backupFile}`
  );

  console.log(`✅ Backup created: ${backupFile}`);
  return backupFile;
}

async function migrateWithBackup() {
  try {
    // バックアップを作成
    const backupFile = await backupDatabase();

    // マイグレーションを実行
    console.log('🚀 Running migrations...');
    await execAsync('npm run migrate');

    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('💡 Restore from backup if needed');
    process.exit(1);
  }
}

migrateWithBackup();
```

### 2. マイグレーションのテスト

```typescript
// tests/migrations/migration.test.ts
import { describe, it, beforeEach, afterEach } from 'vitest';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Migrator, FileMigrationProvider } from 'kysely';
import { promises as fs } from 'fs';
import path from 'path';

describe('Database Migrations', () => {
  let db: Kysely<any>;

  beforeEach(async () => {
    // テスト用DBに接続
    db = new Kysely({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: process.env.TEST_DATABASE_URL,
        }),
      }),
    });
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('should run all migrations successfully', async () => {
    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(__dirname, '../../src/db/migrations'),
      }),
    });

    const { error, results } = await migrator.migrateToLatest();

    expect(error).toBeUndefined();
    expect(results?.every((r) => r.status === 'Success')).toBe(true);
  });

  it('should rollback all migrations successfully', async () => {
    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(__dirname, '../../src/db/migrations'),
      }),
    });

    // まず最新までマイグレート
    await migrator.migrateToLatest();

    // 全てロールバック
    const migrations = await migrator.getMigrations();
    for (let i = 0; i < migrations.length; i++) {
      const { error } = await migrator.migrateDown();
      expect(error).toBeUndefined();
    }

    // テーブルが全て削除されていることを確認
    const tables = await db
      .selectFrom('information_schema.tables')
      .select('table_name')
      .where('table_schema', '=', 'public')
      .execute();

    expect(tables.length).toBe(1); // kysely_migration テーブルのみ
  });
});
```

### 3. マイグレーションの検証

```typescript
// src/scripts/validate-migrations.ts
import { promises as fs } from 'fs';
import path from 'path';

async function validateMigrations() {
  const migrationsDir = path.join(__dirname, '../db/migrations');
  const files = await fs.readdir(migrationsDir);

  const migrationFiles = files.filter(
    (f) => f.endsWith('.ts') && f.match(/^\d{3}_/)
  );

  console.log('🔍 Validating migrations...\n');

  // ファイル名の連番をチェック
  for (let i = 0; i < migrationFiles.length; i++) {
    const expectedPrefix = String(i + 1).padStart(3, '0');
    const actualPrefix = migrationFiles[i].substring(0, 3);

    if (expectedPrefix !== actualPrefix) {
      console.error(
        `❌ Migration numbering error: expected ${expectedPrefix}, got ${actualPrefix}`
      );
      process.exit(1);
    }
  }

  // 各マイグレーションファイルの構造をチェック
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');

    if (!content.includes('export async function up')) {
      console.error(`❌ Missing 'up' function in ${file}`);
      process.exit(1);
    }

    if (!content.includes('export async function down')) {
      console.error(`❌ Missing 'down' function in ${file}`);
      process.exit(1);
    }
  }

  console.log('✅ All migrations are valid');
}

validateMigrations();
```

### 4. CI/CDパイプラインでの自動化

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'src/db/migrations/**'

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

      - name: Validate migrations
        run: npm run validate-migrations

      - name: Run migration tests
        run: npm run test:migrations
        env:
          TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

      - name: Backup production database
        run: npm run backup
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}

      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}

      - name: Notify Slack on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: '❌ Migration failed! Check logs immediately.'
```

## まとめ

Kyselyによる実践的なマイグレーション管理のポイントをまとめました。

### 重要なプラクティス

1. **段階的な変更**: Expand-Contractパターンでダウンタイムを最小化
2. **ロールバック戦略**: 全てのマイグレーションに`down`関数を実装
3. **本番環境での安全性**: バックアップ、検証、モニタリングを徹底
4. **テストの自動化**: CI/CDで全マイグレーションをテスト
5. **大規模テーブルの考慮**: CONCURRENTLYオプションでロックを最小化

Kyselyのマイグレーション機能は、**型安全性**と**柔軟性**を両立しており、特にTypeScriptプロジェクトでの使用に最適です。

### 参考リンク

- [Kysely公式ドキュメント](https://kysely.dev/)
- [Kysely Migrations](https://kysely.dev/docs/migrations)
- [PostgreSQL Zero-Downtime Deployments](https://www.postgresql.org/docs/current/ddl-alter.html)
