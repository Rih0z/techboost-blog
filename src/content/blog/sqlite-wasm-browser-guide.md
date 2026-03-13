---
title: "SQLite WASM完全ガイド - ブラウザでSQLiteを使う実践的な方法"
description: "ブラウザ上でSQLiteを動かすSQLite WASMの完全ガイド。セットアップ、クエリ実行、パフォーマンス最適化、実践的なユースケースまで徹底解説。OPFS永続化やWeb Worker連携によるオフライン対応アプリの構築パターンも紹介します。"
pubDate: "2025-02-05"
tags: ["SQLite", "WASM", "WebAssembly", "Browser", "Database", "インフラ"]
heroImage: '../../assets/thumbnails/sqlite-wasm-browser-guide.jpg'
---
## はじめに

SQLite WASMは、WebAssembly技術を使ってブラウザ上でSQLiteを動かす公式実装です。2026年現在、オフラインファーストのアプリケーションやローカルストレージの高度な活用に欠かせない技術となっています。

### SQLite WASMとは

```
特徴:
✅ ブラウザでSQLiteが動く
✅ オフライン動作
✅ SQL全機能が使える
✅ トランザクション対応
✅ 高速クエリ実行
✅ ファイルシステムAPI対応
```

### ユースケース

```
最適な用途:
✅ オフラインアプリ
✅ PWA（Progressive Web App）
✅ データ分析ツール
✅ ローカルキャッシュ
✅ エディタ・IDE
✅ ログビューワー
✅ CSVインポート・加工

不向きな用途:
❌ 大規模データ（100MB超）
❌ リアルタイム同期が必須
❌ マルチユーザー編集
```

## セットアップ

### 方法1: CDN経由

```html
<!DOCTYPE html>
<html>
<head>
  <title>SQLite WASM Demo</title>
</head>
<body>
  <div id="output"></div>

  <script type="module">
    // CDNから読み込み
    import sqlite3InitModule from 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.45.0/+esm';

    const sqlite3 = await sqlite3InitModule();
    console.log('SQLite version:', sqlite3.version.libVersion);

    // データベース作成
    const db = new sqlite3.oo1.DB();

    // テーブル作成
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT,
        email TEXT
      )
    `);

    // データ挿入
    db.exec(`
      INSERT INTO users (name, email) VALUES
        ('Alice', 'alice@example.com'),
        ('Bob', 'bob@example.com')
    `);

    // クエリ実行
    const result = db.exec({
      sql: 'SELECT * FROM users',
      returnValue: 'resultRows',
    });

    console.log('Results:', result);
  </script>
</body>
</html>
```

### 方法2: npm経由（推奨）

```bash
npm install @sqlite.org/sqlite-wasm
```

```typescript
// src/db/sqlite.ts
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any = null;

export async function initDB() {
  if (db) return db;

  const sqlite3 = await sqlite3InitModule();
  db = new sqlite3.oo1.DB();

  console.log('SQLite initialized:', sqlite3.version.libVersion);

  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}
```

### React/Next.js統合

```tsx
// hooks/useDatabase.ts
'use client';

import { useEffect, useState } from 'react';
import { initDB } from '@/db/sqlite';

export function useDatabase() {
  const [db, setDb] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    initDB()
      .then((database) => {
        setDb(database);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { db, loading, error };
}
```

```tsx
// components/UserList.tsx
'use client';

import { useDatabase } from '@/hooks/useDatabase';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

export function UserList() {
  const { db, loading } = useDatabase();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!db) return;

    // テーブル作成
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      )
    `);

    // データ読み込み
    const loadUsers = () => {
      const result = db.exec({
        sql: 'SELECT * FROM users',
        returnValue: 'resultRows',
      });
      setUsers(result);
    };

    loadUsers();
  }, [db]);

  if (loading) return <div>Loading database...</div>;

  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 基本的なCRUD操作

### Create（挿入）

```typescript
// データ挿入
function insertUser(db: any, name: string, email: string) {
  db.exec({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    bind: [name, email],
  });
}

// 複数行挿入
function insertUsers(db: any, users: Array<{ name: string; email: string }>) {
  db.exec('BEGIN TRANSACTION');

  try {
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');

    for (const user of users) {
      stmt.bind([user.name, user.email]);
      stmt.step();
      stmt.reset();
    }

    db.exec('COMMIT');
    stmt.finalize();
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
```

### Read（読み取り）

```typescript
// 全件取得
function getAllUsers(db: any) {
  return db.exec({
    sql: 'SELECT * FROM users',
    returnValue: 'resultRows',
  });
}

// 条件付き取得
function getUserById(db: any, id: number) {
  const result = db.exec({
    sql: 'SELECT * FROM users WHERE id = ?',
    bind: [id],
    returnValue: 'resultRows',
  });

  return result[0] || null;
}

// オブジェクト形式で取得
function getUsersAsObjects(db: any) {
  const rows: any[] = [];

  db.exec({
    sql: 'SELECT * FROM users',
    callback: (row: any) => {
      rows.push(row);
    },
  });

  return rows;
}
```

### Update（更新）

```typescript
// 更新
function updateUser(db: any, id: number, name: string, email: string) {
  db.exec({
    sql: 'UPDATE users SET name = ?, email = ? WHERE id = ?',
    bind: [name, email, id],
  });
}

// 条件付き更新
function updateUserEmail(db: any, oldEmail: string, newEmail: string) {
  db.exec({
    sql: 'UPDATE users SET email = ? WHERE email = ?',
    bind: [newEmail, oldEmail],
  });
}
```

### Delete（削除）

```typescript
// 削除
function deleteUser(db: any, id: number) {
  db.exec({
    sql: 'DELETE FROM users WHERE id = ?',
    bind: [id],
  });
}

// 全削除
function deleteAllUsers(db: any) {
  db.exec('DELETE FROM users');
}
```

## トランザクション

### 基本的なトランザクション

```typescript
function transferMoney(db: any, fromId: number, toId: number, amount: number) {
  db.exec('BEGIN TRANSACTION');

  try {
    // 送信者から引き出し
    db.exec({
      sql: 'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      bind: [amount, fromId],
    });

    // 受信者に入金
    db.exec({
      sql: 'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      bind: [amount, toId],
    });

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
```

### SAVEPOINT

```typescript
function complexOperation(db: any) {
  db.exec('BEGIN TRANSACTION');

  try {
    // 操作1
    db.exec('INSERT INTO users (name, email) VALUES ("Test", "test@example.com")');

    // セーブポイント作成
    db.exec('SAVEPOINT sp1');

    try {
      // 操作2（失敗する可能性）
      db.exec('INSERT INTO users (name, email) VALUES ("Test2", "test@example.com")');
    } catch (error) {
      // セーブポイントまで戻る
      db.exec('ROLLBACK TO sp1');
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
```

## ファイルシステムAPI連携

### Origin Private File System（OPFS）

```typescript
// OPFS対応データベース作成
async function createPersistentDB() {
  const sqlite3 = await sqlite3InitModule({
    print: console.log,
    printErr: console.error,
  });

  // OPFSバックエンドでDB作成
  const db = new sqlite3.oo1.OpfsDb('/myapp.db');

  console.log('Database file:', db.filename);

  return db;
}
```

### データのインポート/エクスポート

```typescript
// SQLiteファイルをエクスポート
async function exportDatabase(db: any) {
  const uint8Array = db.export();
  const blob = new Blob([uint8Array], { type: 'application/x-sqlite3' });

  // ダウンロード
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'database.db';
  a.click();
  URL.revokeObjectURL(url);
}

// SQLiteファイルをインポート
async function importDatabase(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const sqlite3 = await sqlite3InitModule();
  const db = new sqlite3.oo1.DB();

  // データをロード
  db.import(uint8Array);

  return db;
}
```

## 実践的なパターン

### パターン1: ToDoアプリ

```typescript
// db/todo.ts
import { getDB } from './sqlite';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

export function initTodoTable() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export function addTodo(title: string): number {
  const db = getDB();

  db.exec({
    sql: 'INSERT INTO todos (title) VALUES (?)',
    bind: [title],
  });

  // 挿入されたIDを取得
  const result = db.exec({
    sql: 'SELECT last_insert_rowid() as id',
    returnValue: 'resultRows',
  });

  return result[0].id;
}

export function getTodos(): Todo[] {
  const db = getDB();

  return db.exec({
    sql: 'SELECT * FROM todos ORDER BY created_at DESC',
    returnValue: 'resultRows',
  });
}

export function toggleTodo(id: number) {
  const db = getDB();

  db.exec({
    sql: 'UPDATE todos SET completed = NOT completed WHERE id = ?',
    bind: [id],
  });
}

export function deleteTodo(id: number) {
  const db = getDB();

  db.exec({
    sql: 'DELETE FROM todos WHERE id = ?',
    bind: [id],
  });
}
```

```tsx
// components/TodoApp.tsx
'use client';

import { useDatabase } from '@/hooks/useDatabase';
import { useEffect, useState } from 'react';
import { initTodoTable, addTodo, getTodos, toggleTodo, deleteTodo } from '@/db/todo';

export function TodoApp() {
  const { db, loading } = useDatabase();
  const [todos, setTodos] = useState<any[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!db) return;
    initTodoTable();
    loadTodos();
  }, [db]);

  const loadTodos = () => {
    setTodos(getTodos());
  };

  const handleAdd = () => {
    if (!title.trim()) return;
    addTodo(title);
    setTitle('');
    loadTodos();
  };

  const handleToggle = (id: number) => {
    toggleTodo(id);
    loadTodos();
  };

  const handleDelete = (id: number) => {
    deleteTodo(id);
    loadTodos();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Todo List</h1>

      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New todo..."
        />
        <button onClick={handleAdd}>Add</button>
      </div>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed === 1}
              onChange={() => handleToggle(todo.id)}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => handleDelete(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### パターン2: CSVインポート

```typescript
// utils/csv.ts
import { getDB } from '@/db/sqlite';

export function importCSV(csvText: string, tableName: string) {
  const db = getDB();

  // CSVをパース
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) =>
    line.split(',').map((cell) => cell.trim())
  );

  // テーブル作成
  const columnDefs = headers.map((h) => `${h} TEXT`).join(', ');
  db.exec(`DROP TABLE IF EXISTS ${tableName}`);
  db.exec(`CREATE TABLE ${tableName} (${columnDefs})`);

  // データ挿入
  db.exec('BEGIN TRANSACTION');

  try {
    const placeholders = headers.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${placeholders})`
    );

    for (const row of rows) {
      stmt.bind(row);
      stmt.step();
      stmt.reset();
    }

    db.exec('COMMIT');
    stmt.finalize();
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function queryTable(tableName: string, sql?: string) {
  const db = getDB();

  return db.exec({
    sql: sql || `SELECT * FROM ${tableName}`,
    returnValue: 'resultRows',
  });
}
```

```tsx
// components/CSVImporter.tsx
'use client';

import { useState } from 'react';
import { importCSV, queryTable } from '@/utils/csv';

export function CSVImporter() {
  const [results, setResults] = useState<any[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    importCSV(text, 'imported_data');

    // クエリ実行
    const rows = queryTable('imported_data');
    setResults(rows);
  };

  return (
    <div>
      <h2>CSV Importer</h2>
      <input type="file" accept=".csv" onChange={handleFileUpload} />

      {results.length > 0 && (
        <table>
          <thead>
            <tr>
              {Object.keys(results[0]).map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, i) => (
              <tr key={i}>
                {Object.values(row).map((val: any, j) => (
                  <td key={j}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

### パターン3: ローカルキャッシュ

```typescript
// db/cache.ts
import { getDB } from './sqlite';

export function initCacheTable() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT,
      expires_at INTEGER
    )
  `);
}

export function setCache(key: string, value: any, ttl: number = 3600) {
  const db = getDB();
  const expiresAt = Date.now() + ttl * 1000;

  db.exec({
    sql: `
      INSERT OR REPLACE INTO cache (key, value, expires_at)
      VALUES (?, ?, ?)
    `,
    bind: [key, JSON.stringify(value), expiresAt],
  });
}

export function getCache<T>(key: string): T | null {
  const db = getDB();

  const result = db.exec({
    sql: `
      SELECT value, expires_at FROM cache
      WHERE key = ? AND expires_at > ?
    `,
    bind: [key, Date.now()],
    returnValue: 'resultRows',
  });

  if (result.length === 0) return null;

  return JSON.parse(result[0].value);
}

export function deleteCache(key: string) {
  const db = getDB();

  db.exec({
    sql: 'DELETE FROM cache WHERE key = ?',
    bind: [key],
  });
}

export function clearExpiredCache() {
  const db = getDB();

  db.exec({
    sql: 'DELETE FROM cache WHERE expires_at < ?',
    bind: [Date.now()],
  });
}
```

## パフォーマンス最適化

### インデックス作成

```typescript
// インデックス作成
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email)
`);

// 複合インデックス
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_posts_user_date
  ON posts(user_id, created_at)
`);
```

### クエリ最適化

```typescript
// ❌ 遅い
const users = db.exec({
  sql: 'SELECT * FROM users',
  returnValue: 'resultRows',
});
const user = users.find((u: any) => u.id === targetId);

// ✅ 速い
const user = db.exec({
  sql: 'SELECT * FROM users WHERE id = ?',
  bind: [targetId],
  returnValue: 'resultRows',
})[0];
```

### バッチ処理

```typescript
// ❌ 遅い（個別にINSERT）
for (const user of users) {
  db.exec({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    bind: [user.name, user.email],
  });
}

// ✅ 速い（トランザクション + prepare）
db.exec('BEGIN TRANSACTION');
const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');

for (const user of users) {
  stmt.bind([user.name, user.email]);
  stmt.step();
  stmt.reset();
}

stmt.finalize();
db.exec('COMMIT');
```

### PRAGMA設定

```typescript
// パフォーマンス向上のためのPRAGMA
db.exec('PRAGMA journal_mode=WAL'); // Write-Ahead Logging
db.exec('PRAGMA synchronous=NORMAL'); // 同期モード
db.exec('PRAGMA cache_size=-64000'); // キャッシュサイズ（64MB）
db.exec('PRAGMA temp_store=MEMORY'); // 一時データをメモリに
```

## メモリ管理

### データベースのクローズ

```typescript
// データベースを閉じる
db.close();
```

### メモリリーク防止

```typescript
// Statementは必ずfinalize
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
try {
  stmt.bind([id]);
  const result = stmt.step();
  // ...
} finally {
  stmt.finalize(); // 必ず実行
}
```

## トラブルシューティング

### エラー1: 初期化失敗

```
エラー: Failed to initialize SQLite WASM

解決策:
- ブラウザがWASMをサポートしているか確認
- CORSエラーがないか確認
- CDN URLが正しいか確認
```

### エラー2: メモリ不足

```
エラー: Out of memory

解決策:
- データを分割して処理
- 不要なデータを削除
- VACUUMでデータベースを最適化
```

```typescript
// VACUUM実行
db.exec('VACUUM');
```

### エラー3: パフォーマンス低下

```
改善策:
1. インデックス作成
2. トランザクション使用
3. PRAGMA最適化
4. クエリ見直し
```

## まとめ

### SQLite WASMの強み

1. **オフライン**: ネットワーク不要
2. **高速**: ローカルストレージより高速
3. **SQL**: 強力なクエリ機能
4. **トランザクション**: データ整合性保証

### ベストプラクティス

- トランザクションでバッチ処理
- インデックスで検索高速化
- PRAGMA設定で最適化
- 定期的にVACUUM実行

### いつ使うべきか

- オフラインアプリ
- PWA
- データ分析ツール
- ローカルファーストアプリ

### 次のステップ

- 公式: https://sqlite.org/wasm/
- GitHub: https://github.com/sqlite/sqlite-wasm
- ドキュメント: https://sqlite.org/docs.html

SQLite WASMで、ブラウザアプリの可能性を広げましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
