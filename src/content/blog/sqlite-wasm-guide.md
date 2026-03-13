---
title: 'SQLite WASM完全ガイド - ブラウザでSQLデータベースを動かす'
description: 'SQLite WASMでブラウザ内SQLデータベースを実現。OPFS永続化、sql.js、wa-sqlite比較、実践的な実装パターンを解説します。Web Worker連携やオフラインアプリ構築のベストプラクティスも詳しく紹介します。Web Worker連携やオフラインアプリ構築のベストプラクティスも紹介します。'
pubDate: '2026-02-05'
tags: ['SQLite', 'WASM', 'JavaScript', 'WebAssembly']
heroImage: '../../assets/thumbnails/sqlite-wasm-guide.jpg'
---

SQLite WASMを使えば、ブラウザ内で本格的なSQLデータベースを動かせます。本記事では、基本的な使い方からOPFSによる永続化、各ライブラリの比較まで徹底解説します。

## SQLite WASMとは

WebAssembly（WASM）にコンパイルされたSQLiteで、ブラウザ内で完全に動作するSQLデータベースです。

### メリット

1. **オフライン動作** - ネットワーク不要
2. **高速** - ローカル実行で低レイテンシ
3. **プライバシー** - データがブラウザ内に留まる
4. **スケーラビリティ** - サーバー負荷の軽減
5. **コスト削減** - バックエンドインフラ不要

### ユースケース

- オフラインファーストアプリ
- ローカルファーストツール
- データ集約的なWebアプリ
- プライバシー重視のアプリケーション
- プロトタイピング・デモ

## 公式SQLite WASM

### セットアップ

```bash
npm install @sqlite.org/sqlite-wasm
```

### 基本的な使用方法

```typescript
// sqlite-db.ts
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any = null;

export async function initDB() {
  const sqlite3 = await sqlite3InitModule({
    print: console.log,
    printErr: console.error,
  });

  if (sqlite3.opfs) {
    // OPFS（Origin Private File System）が利用可能
    db = new sqlite3.oo1.OpfsDb('/mydb.sqlite3');
    console.log('Using OPFS storage');
  } else {
    // メモリ内データベース
    db = new sqlite3.oo1.DB();
    console.log('Using in-memory database');
  }

  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}
```

### テーブル作成とCRUD操作

```typescript
// users.ts
import { getDB } from './sqlite-db';

interface User {
  id?: number;
  name: string;
  email: string;
  age: number;
  createdAt?: string;
}

export function createUsersTable() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      age INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export function insertUser(user: User): number {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO users (name, email, age) VALUES (?, ?, ?)
  `);

  try {
    stmt.bind([user.name, user.email, user.age]);
    stmt.step();
    return db.changes();
  } finally {
    stmt.finalize();
  }
}

export function getUser(id: number): User | null {
  const db = getDB();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');

  try {
    stmt.bind([id]);
    if (stmt.step()) {
      return {
        id: stmt.get(0),
        name: stmt.get(1),
        email: stmt.get(2),
        age: stmt.get(3),
        createdAt: stmt.get(4),
      };
    }
    return null;
  } finally {
    stmt.finalize();
  }
}

export function getAllUsers(): User[] {
  const db = getDB();
  const users: User[] = [];

  db.exec({
    sql: 'SELECT * FROM users ORDER BY created_at DESC',
    callback: (row: any) => {
      users.push({
        id: row[0],
        name: row[1],
        email: row[2],
        age: row[3],
        createdAt: row[4],
      });
    },
  });

  return users;
}

export function updateUser(id: number, user: Partial<User>): boolean {
  const db = getDB();
  const fields: string[] = [];
  const values: any[] = [];

  if (user.name) {
    fields.push('name = ?');
    values.push(user.name);
  }
  if (user.email) {
    fields.push('email = ?');
    values.push(user.email);
  }
  if (user.age !== undefined) {
    fields.push('age = ?');
    values.push(user.age);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

  const stmt = db.prepare(sql);
  try {
    stmt.bind(values);
    stmt.step();
    return db.changes() > 0;
  } finally {
    stmt.finalize();
  }
}

export function deleteUser(id: number): boolean {
  const db = getDB();
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');

  try {
    stmt.bind([id]);
    stmt.step();
    return db.changes() > 0;
  } finally {
    stmt.finalize();
  }
}
```

### トランザクション

```typescript
// transactions.ts
import { getDB } from './sqlite-db';

export function runInTransaction<T>(fn: () => T): T {
  const db = getDB();

  try {
    db.exec('BEGIN TRANSACTION');
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// 使用例
export function transferBalance(fromId: number, toId: number, amount: number) {
  return runInTransaction(() => {
    const db = getDB();

    // 送信者の残高を減らす
    db.exec({
      sql: 'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      bind: [amount, fromId],
    });

    // 受信者の残高を増やす
    db.exec({
      sql: 'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      bind: [amount, toId],
    });

    // トランザクションログ
    db.exec({
      sql: 'INSERT INTO transactions (from_id, to_id, amount) VALUES (?, ?, ?)',
      bind: [fromId, toId, amount],
    });
  });
}
```

## OPFS（Origin Private File System）による永続化

OPFSを使うことで、ブラウザを閉じてもデータが保持されます。

### OPFS対応の確認

```typescript
// opfs-check.ts
export async function checkOPFSSupport(): Promise<boolean> {
  if (!('storage' in navigator && 'getDirectory' in navigator.storage)) {
    return false;
  }

  try {
    const root = await navigator.storage.getDirectory();
    return true;
  } catch {
    return false;
  }
}

export async function getOPFSStorageEstimate() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentUsed: estimate.quota
        ? ((estimate.usage || 0) / estimate.quota) * 100
        : 0,
    };
  }
  return null;
}
```

### OPFSデータベースの初期化

```typescript
// opfs-db.ts
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

export async function initOPFSDB(dbName: string = 'myapp.db') {
  const sqlite3 = await sqlite3InitModule();

  if (!sqlite3.opfs) {
    throw new Error('OPFS is not available in this browser');
  }

  // OPFSに永続化されるデータベース
  const db = new sqlite3.oo1.OpfsDb(`/opfs/${dbName}`);

  console.log('Database opened:', db.filename);

  return db;
}

// データベースのバックアップ
export async function backupDatabase(db: any): Promise<Uint8Array> {
  const data = db.export();
  return data;
}

// データベースのリストア
export async function restoreDatabase(db: any, data: Uint8Array) {
  db.close();
  // 新しいデータでデータベースを再作成
  const sqlite3 = await sqlite3InitModule();
  const newDb = new sqlite3.oo1.DB();
  newDb.export(data);
  return newDb;
}
```

### データエクスポート/インポート

```typescript
// export-import.ts
import { getDB } from './sqlite-db';

export function exportDatabase(): Uint8Array {
  const db = getDB();
  return db.export();
}

export function downloadDatabase() {
  const data = exportDatabase();
  const blob = new Blob([data], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `database-${Date.now()}.sqlite`;
  a.click();

  URL.revokeObjectURL(url);
}

export async function importDatabase(file: File): Promise<void> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  const db = getDB();
  db.close();

  // 新しいデータでデータベースを初期化
  const sqlite3 = await sqlite3InitModule();
  const newDb = new sqlite3.oo1.DB();
  // データをインポート（実装は使用するライブラリによる）
}
```

## sql.js

軽量で使いやすいSQLite WASMライブラリです。

### セットアップ

```bash
npm install sql.js
```

### 基本的な使用

```typescript
// sqljs-db.ts
import initSqlJs, { Database } from 'sql.js';

let SQL: any = null;
let db: Database | null = null;

export async function initSQLJS() {
  SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  db = new SQL.Database();
  return db;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// テーブル作成
export function createTable() {
  const database = getDatabase();
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )
  `);
}

// データ挿入
export function insertUser(name: string, email: string) {
  const database = getDatabase();
  database.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
}

// データ取得
export function getUsers() {
  const database = getDatabase();
  const result = database.exec('SELECT * FROM users');

  if (result.length === 0) return [];

  const columns = result[0].columns;
  const values = result[0].values;

  return values.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

// データベースのエクスポート
export function exportDB(): Uint8Array {
  const database = getDatabase();
  return database.export();
}

// データベースのインポート
export async function importDB(data: Uint8Array) {
  if (!SQL) {
    await initSQLJS();
  }
  db = new SQL.Database(data);
}
```

### IndexedDBとの連携

```typescript
// sqljs-indexeddb.ts
import { getDatabase, exportDB, importDB } from './sqljs-db';

const DB_NAME = 'sqljs-db';
const STORE_NAME = 'database';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveToIndexedDB() {
  const data = exportDB();
  const db = await openIndexedDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, 'database');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadFromIndexedDB(): Promise<boolean> {
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('database');

    request.onsuccess = async () => {
      if (request.result) {
        await importDB(request.result);
        resolve(true);
      } else {
        resolve(false);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// 自動保存の設定
export function enableAutoSave(intervalMs: number = 5000) {
  return setInterval(() => {
    saveToIndexedDB().catch(console.error);
  }, intervalMs);
}
```

## wa-sqlite

高性能なSQLite WASMライブラリで、非同期APIをサポートします。

### セットアップ

```bash
npm install wa-sqlite @sqlite.org/sqlite-wasm
```

### 基本的な使用

```typescript
// wa-sqlite-db.ts
import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite';

let sqlite3: any = null;
let db: number | null = null;

export async function initWASQLite() {
  const module = await SQLiteESMFactory();
  sqlite3 = SQLite.Factory(module);

  db = await sqlite3.open_v2('mydb');
  return db;
}

export function getDB(): number {
  if (db === null) {
    throw new Error('Database not initialized');
  }
  return db;
}

// SQL実行
export async function exec(sql: string, params: any[] = []): Promise<any[]> {
  const database = getDB();
  const results: any[] = [];

  for await (const stmt of sqlite3.statements(database, sql)) {
    sqlite3.bind_collection(stmt, params);

    const columns = sqlite3.column_names(stmt);
    while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
      const row = sqlite3.row(stmt);
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      results.push(obj);
    }
  }

  return results;
}

// プリペアドステートメント
export async function prepare(sql: string) {
  const database = getDB();
  return sqlite3.prepare_v2(database, sql);
}
```

### VFS（Virtual File System）の実装

```typescript
// custom-vfs.ts
import * as SQLite from 'wa-sqlite';

export class OPFSVirtualFileSystem {
  private rootDir: FileSystemDirectoryHandle | null = null;

  async init() {
    this.rootDir = await navigator.storage.getDirectory();
  }

  async readFile(path: string): Promise<Uint8Array> {
    if (!this.rootDir) throw new Error('VFS not initialized');

    const fileHandle = await this.rootDir.getFileHandle(path);
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  }

  async writeFile(path: string, data: Uint8Array): Promise<void> {
    if (!this.rootDir) throw new Error('VFS not initialized');

    const fileHandle = await this.rootDir.getFileHandle(path, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.rootDir) throw new Error('VFS not initialized');
    await this.rootDir.removeEntry(path);
  }
}
```

## ライブラリ比較

### 機能比較表

| 機能 | 公式SQLite WASM | sql.js | wa-sqlite |
|------|-----------------|--------|-----------|
| パフォーマンス | 高 | 中 | 高 |
| 非同期サポート | 部分的 | なし | 完全 |
| OPFS対応 | ネイティブ | 手動実装 | VFS拡張 |
| バンドルサイズ | 約1MB | 約1.5MB | 約800KB |
| API | C言語風 | JavaScript風 | JavaScript風 |
| メンテナンス | 公式 | コミュニティ | コミュニティ |

### パフォーマンスベンチマーク

```typescript
// benchmark.ts
async function benchmark(name: string, fn: () => Promise<void>) {
  const start = performance.now();
  await fn();
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(2)}ms`);
}

async function runBenchmarks() {
  // 10,000レコードの挿入
  await benchmark('Insert 10k records', async () => {
    for (let i = 0; i < 10000; i++) {
      await insertUser({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        age: Math.floor(Math.random() * 80) + 18,
      });
    }
  });

  // 全レコード取得
  await benchmark('Select all records', async () => {
    await getAllUsers();
  });

  // インデックス付きクエリ
  await benchmark('Select with index', async () => {
    await exec('SELECT * FROM users WHERE email = ?', [
      'user5000@example.com',
    ]);
  });

  // JOIN操作
  await benchmark('Complex JOIN', async () => {
    await exec(`
      SELECT u.*, COUNT(o.id) as order_count
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      GROUP BY u.id
      HAVING order_count > 5
    `);
  });
}
```

## 実践的な統合例

### React統合

```typescript
// useSQLite.ts
import { useState, useEffect } from 'react';
import { initDB, getDB, closeDB } from './sqlite-db';

export function useSQLite() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    initDB()
      .then(() => setIsReady(true))
      .catch(setError);

    return () => {
      closeDB();
    };
  }, []);

  return { isReady, error, db: isReady ? getDB() : null };
}

// 使用例
function UserList() {
  const { isReady, error } = useSQLite();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (isReady) {
      createUsersTable();
      setUsers(getAllUsers());
    }
  }, [isReady]);

  if (error) return <div>Error: {error.message}</div>;
  if (!isReady) return <div>Loading database...</div>;

  return (
    <div>
      <h2>Users ({users.length})</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.name} ({user.email})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### データ同期

```typescript
// sync.ts
import { getDB } from './sqlite-db';

interface SyncConfig {
  serverUrl: string;
  apiKey: string;
  syncInterval: number;
}

export class DatabaseSync {
  private config: SyncConfig;
  private syncTimer: number | null = null;
  private lastSyncTimestamp: number = 0;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  async sync() {
    const db = getDB();

    // ローカルの変更を取得
    const changes = db.exec(`
      SELECT * FROM sync_log
      WHERE timestamp > ${this.lastSyncTimestamp}
      ORDER BY timestamp ASC
    `);

    if (changes.length > 0) {
      // サーバーに送信
      await fetch(`${this.config.serverUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ changes }),
      });
    }

    // サーバーから変更を取得
    const response = await fetch(
      `${this.config.serverUrl}/sync?since=${this.lastSyncTimestamp}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      }
    );

    const { changes: serverChanges } = await response.json();

    // ローカルに適用
    for (const change of serverChanges) {
      db.exec(change.sql, change.params);
    }

    this.lastSyncTimestamp = Date.now();
  }

  startAutoSync() {
    this.syncTimer = window.setInterval(() => {
      this.sync().catch(console.error);
    }, this.config.syncInterval);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}
```

## まとめ

SQLite WASMにより、ブラウザ内で本格的なSQLデータベースが利用可能になりました。

### 選択ガイド

- **公式SQLite WASM**: 最新機能とOPFS対応が必要な場合
- **sql.js**: シンプルで使いやすいAPIが必要な場合
- **wa-sqlite**: 高度なカスタマイズと非同期処理が必要な場合

### ベストプラクティス

1. OPFSを活用してデータを永続化
2. トランザクションで一貫性を保証
3. インデックスでクエリを最適化
4. 定期的にバックアップを実行
5. 大量データ処理はWeb Workerで実行

SQLite WASMは、オフラインファーストアプリケーションやローカルファーストツールの開発に最適な選択肢です。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
