---
title: 'ローカルファースト開発完全ガイド2026'
description: 'CRDT、同期エンジン、オフライン対応の実装から、ElectricSQL、PowerSync、LiveStoreの比較まで。ローカルファースト開発の決定版ガイド。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: '2026-02-05'
tags: ['ローカルファースト', 'CRDT', 'オフライン', 'ElectricSQL', 'データベース', 'プログラミング']
---

ローカルファーストアプリケーションは、オフライン動作とリアルタイム同期を両立し、優れたユーザー体験を提供します。本記事では、CRDT理論から実践的な実装、主要フレームワークの比較まで徹底解説します。

## 目次

1. ローカルファーストとは
2. CRDT（Conflict-free Replicated Data Types）
3. 同期エンジンの設計
4. オフライン対応の実装
5. ElectricSQL - PostgreSQLベース
6. PowerSync - マルチデータベース対応
7. LiveStore - リアルタイム同期
8. フレームワーク比較
9. 実装パターンとベストプラクティス

## ローカルファーストとは

### 概念

ローカルファーストソフトウェアの7つの理想（Ink & Switch論文より）:

1. **高速**: データはローカルにあるため即座にアクセス可能
2. **マルチデバイス**: 複数デバイス間で同期
3. **オフライン動作**: ネットワーク接続不要
4. **コラボレーション**: リアルタイムまたは非同期での共同作業
5. **長期的な所有**: データは永続的にアクセス可能
6. **セキュリティとプライバシー**: エンドツーエンド暗号化
7. **ユーザーコントロール**: ユーザーがデータを完全に管理

### 従来のクラウドファーストとの比較

```typescript
// クラウドファースト（従来型）
async function getTodo(id: string) {
  const response = await fetch(`/api/todos/${id}`);
  return await response.json();
}

// ローカルファースト
function getTodo(id: string) {
  // ローカルDBから即座に取得
  return db.todos.get(id);
}

// バックグラウンドで同期
syncEngine.sync();
```

### アーキテクチャの違い

```
クラウドファースト:
クライアント → API → データベース

ローカルファースト:
ローカルDB ←→ 同期エンジン ←→ サーバーDB
    ↓
  UI（即座に反映）
```

## CRDT（Conflict-free Replicated Data Types）

### CRDTとは

CRDTは、分散システムで競合を自動解決するデータ構造です。

**主な種類**:

1. **G-Counter**: 増加のみカウンター
2. **PN-Counter**: 増減可能カウンター
3. **LWW-Register**: Last-Write-Wins レジスタ
4. **OR-Set**: 追加・削除可能な集合
5. **RGA**: Replicated Growable Array

### G-Counter実装

```typescript
// G-Counter（増加のみカウンター）
class GCounter {
  private counts: Map<string, number> = new Map();

  constructor(private replicaId: string) {}

  increment(amount: number = 1) {
    const current = this.counts.get(this.replicaId) || 0;
    this.counts.set(this.replicaId, current + amount);
  }

  value(): number {
    let sum = 0;
    for (const count of this.counts.values()) {
      sum += count;
    }
    return sum;
  }

  merge(other: GCounter) {
    for (const [replicaId, count] of other.counts.entries()) {
      const current = this.counts.get(replicaId) || 0;
      this.counts.set(replicaId, Math.max(current, count));
    }
  }

  toJSON() {
    return Object.fromEntries(this.counts);
  }

  static fromJSON(replicaId: string, data: any): GCounter {
    const counter = new GCounter(replicaId);
    counter.counts = new Map(Object.entries(data));
    return counter;
  }
}

// 使用例
const counter1 = new GCounter('replica-1');
const counter2 = new GCounter('replica-2');

counter1.increment(5);
counter2.increment(3);

console.log(counter1.value()); // 5
console.log(counter2.value()); // 3

// マージ
counter1.merge(counter2);
console.log(counter1.value()); // 8
```

### LWW-Register実装

```typescript
// Last-Write-Wins Register
class LWWRegister<T> {
  private value: T;
  private timestamp: number;
  private replicaId: string;

  constructor(replicaId: string, initialValue: T) {
    this.replicaId = replicaId;
    this.value = initialValue;
    this.timestamp = Date.now();
  }

  set(newValue: T) {
    this.value = newValue;
    this.timestamp = Date.now();
  }

  get(): T {
    return this.value;
  }

  merge(other: LWWRegister<T>) {
    // タイムスタンプが大きい方を採用
    if (
      other.timestamp > this.timestamp ||
      (other.timestamp === this.timestamp && other.replicaId > this.replicaId)
    ) {
      this.value = other.value;
      this.timestamp = other.timestamp;
    }
  }

  toJSON() {
    return {
      value: this.value,
      timestamp: this.timestamp,
      replicaId: this.replicaId,
    };
  }

  static fromJSON<T>(replicaId: string, data: any): LWWRegister<T> {
    const register = new LWWRegister(replicaId, data.value);
    register.timestamp = data.timestamp;
    register.replicaId = data.replicaId;
    return register;
  }
}
```

### OR-Set実装

```typescript
// Observed-Remove Set
class ORSet<T> {
  private elements: Map<T, Set<string>> = new Map();
  private replicaId: string;
  private clock: number = 0;

  constructor(replicaId: string) {
    this.replicaId = replicaId;
  }

  add(element: T) {
    const uid = `${this.replicaId}-${this.clock++}`;

    if (!this.elements.has(element)) {
      this.elements.set(element, new Set());
    }

    this.elements.get(element)!.add(uid);
  }

  remove(element: T) {
    this.elements.delete(element);
  }

  has(element: T): boolean {
    const uids = this.elements.get(element);
    return uids !== undefined && uids.size > 0;
  }

  values(): T[] {
    return Array.from(this.elements.keys()).filter((element) =>
      this.has(element)
    );
  }

  merge(other: ORSet<T>) {
    for (const [element, otherUids] of other.elements.entries()) {
      if (!this.elements.has(element)) {
        this.elements.set(element, new Set());
      }

      const thisUids = this.elements.get(element)!;
      for (const uid of otherUids) {
        thisUids.add(uid);
      }
    }
  }

  toJSON() {
    const result: any = {};
    for (const [element, uids] of this.elements.entries()) {
      result[String(element)] = Array.from(uids);
    }
    return result;
  }

  static fromJSON<T>(replicaId: string, data: any): ORSet<T> {
    const set = new ORSet<T>(replicaId);
    for (const [element, uids] of Object.entries(data)) {
      set.elements.set(element as T, new Set(uids as string[]));
    }
    return set;
  }
}

// 使用例
const set1 = new ORSet<string>('replica-1');
const set2 = new ORSet<string>('replica-2');

set1.add('apple');
set1.add('banana');

set2.add('cherry');
set2.remove('apple'); // まだset1にはない

set1.merge(set2);

console.log(set1.values()); // ['apple', 'banana', 'cherry']
```

### Yjs - 本格的なCRDTライブラリ

```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Yjsドキュメントの作成
const ydoc = new Y.Doc();

// 共有データ型
const ytext = ydoc.getText('content');
const ymap = ydoc.getMap('metadata');
const yarray = ydoc.getArray('todos');

// テキスト編集（Google Docsのようなリアルタイム編集）
ytext.insert(0, 'Hello, World!');

// Map操作
ymap.set('title', 'My Document');
ymap.set('author', 'Alice');

// Array操作
yarray.push([
  { id: '1', text: 'Buy milk', completed: false },
  { id: '2', text: 'Write code', completed: true },
]);

// 変更の監視
ytext.observe((event) => {
  console.log('Text changed:', event.changes);
});

// WebSocketで同期
const provider = new WebsocketProvider(
  'wss://your-server.com',
  'document-id',
  ydoc
);

provider.on('status', (event: any) => {
  console.log('Connection status:', event.status);
});
```

## 同期エンジンの設計

### 基本的な同期エンジン

```typescript
interface SyncEngine {
  sync(): Promise<void>;
  push(): Promise<void>;
  pull(): Promise<void>;
  onConflict(resolver: ConflictResolver): void;
}

type ConflictResolver = (local: any, remote: any) => any;

class SimpleSyncEngine implements SyncEngine {
  private localDb: LocalDatabase;
  private remoteApi: RemoteAPI;
  private conflictResolver: ConflictResolver;

  constructor(localDb: LocalDatabase, remoteApi: RemoteAPI) {
    this.localDb = localDb;
    this.remoteApi = remoteApi;
    this.conflictResolver = this.defaultConflictResolver;
  }

  async sync(): Promise<void> {
    await this.pull();
    await this.push();
  }

  async push(): Promise<void> {
    const pendingChanges = await this.localDb.getPendingChanges();

    for (const change of pendingChanges) {
      try {
        await this.remoteApi.applyChange(change);
        await this.localDb.markAsSynced(change.id);
      } catch (error) {
        if (error instanceof ConflictError) {
          const resolved = this.conflictResolver(change.data, error.remoteData);
          await this.remoteApi.applyChange({ ...change, data: resolved });
          await this.localDb.update(change.id, resolved);
        } else {
          throw error;
        }
      }
    }
  }

  async pull(): Promise<void> {
    const lastSyncTimestamp = await this.localDb.getLastSyncTimestamp();
    const remoteChanges = await this.remoteApi.getChangesSince(lastSyncTimestamp);

    for (const change of remoteChanges) {
      const localVersion = await this.localDb.get(change.id);

      if (!localVersion) {
        // 新規作成
        await this.localDb.create(change);
      } else if (localVersion.updatedAt < change.updatedAt) {
        // リモートが新しい
        await this.localDb.update(change.id, change);
      } else if (localVersion.updatedAt > change.updatedAt) {
        // ローカルが新しい（競合）
        const resolved = this.conflictResolver(localVersion, change);
        await this.localDb.update(change.id, resolved);
      }
    }

    await this.localDb.setLastSyncTimestamp(Date.now());
  }

  onConflict(resolver: ConflictResolver): void {
    this.conflictResolver = resolver;
  }

  private defaultConflictResolver(local: any, remote: any): any {
    // Last-Write-Wins
    return local.updatedAt > remote.updatedAt ? local : remote;
  }
}
```

### オペレーショナルトランスフォーメーション（OT）

```typescript
// OTベースの同期エンジン
interface Operation {
  type: 'insert' | 'delete' | 'retain';
  position?: number;
  text?: string;
  count?: number;
}

class OTEngine {
  private pendingOperations: Operation[] = [];
  private version: number = 0;

  apply(operation: Operation, text: string): string {
    let result = text;

    switch (operation.type) {
      case 'insert':
        result =
          text.slice(0, operation.position) +
          operation.text +
          text.slice(operation.position);
        break;

      case 'delete':
        result =
          text.slice(0, operation.position) +
          text.slice(operation.position! + operation.count!);
        break;
    }

    return result;
  }

  transform(op1: Operation, op2: Operation): [Operation, Operation] {
    // op1とop2を変換して、どちらの順序で適用しても同じ結果になるようにする

    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position! <= op2.position!) {
        return [
          op1,
          { ...op2, position: op2.position! + op1.text!.length },
        ];
      } else {
        return [
          { ...op1, position: op1.position! + op2.text!.length },
          op2,
        ];
      }
    }

    if (op1.type === 'delete' && op2.type === 'insert') {
      if (op1.position! < op2.position!) {
        return [
          op1,
          { ...op2, position: op2.position! - op1.count! },
        ];
      } else {
        return [
          { ...op1, position: op1.position! + op2.text!.length },
          op2,
        ];
      }
    }

    // その他のケース...
    return [op1, op2];
  }

  async syncWithServer(serverOps: Operation[]): Promise<void> {
    let transformedLocal = this.pendingOperations;
    let transformedServer = serverOps;

    // 両方のオペレーションを変換
    for (const serverOp of serverOps) {
      const newLocal: Operation[] = [];
      for (const localOp of transformedLocal) {
        const [l, s] = this.transform(localOp, serverOp);
        newLocal.push(l);
        transformedServer = transformedServer.map((op) =>
          op === serverOp ? s : op
        );
      }
      transformedLocal = newLocal;
    }

    // 変換されたサーバーオペレーションを適用
    for (const op of transformedServer) {
      this.applyRemoteOperation(op);
    }

    // ローカルオペレーションをクリア
    this.pendingOperations = [];
  }

  private applyRemoteOperation(op: Operation): void {
    // UIに反映
  }
}
```

## オフライン対応の実装

### IndexedDBラッパー

```typescript
class OfflineDatabase {
  private db: IDBDatabase | null = null;
  private dbName: string;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // オブジェクトストアの作成
        if (!db.objectStoreNames.contains('todos')) {
          const store = db.createObjectStore('todos', { keyPath: 'id' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { autoIncrement: true });
        }
      };
    });
  }

  async get(storeName: string, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByIndex(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
```

### 同期キューの実装

```typescript
interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  storeName: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class SyncQueue {
  private db: OfflineDatabase;
  private isOnline: boolean = navigator.onLine;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(db: OfflineDatabase) {
    this.db = db;
    this.setupNetworkListeners();
    this.startAutoSync();
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private startAutoSync() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.processPendingOperations();
      }
    }, 30000); // 30秒ごと
  }

  async enqueue(operation: Omit<SyncOperation, 'timestamp' | 'retryCount'>) {
    const syncOp: SyncOperation = {
      ...operation,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await this.db.put('syncQueue', syncOp);

    // オンラインならすぐに処理
    if (this.isOnline) {
      this.processPendingOperations();
    }
  }

  private async processPendingOperations() {
    const operations = await this.db.getAll('syncQueue');

    for (const op of operations) {
      try {
        await this.executeOperation(op);
        await this.db.delete('syncQueue', op.id);
      } catch (error) {
        console.error('同期エラー:', error);

        // リトライ回数を増やす
        op.retryCount++;

        if (op.retryCount >= 5) {
          // 5回失敗したら諦める
          console.error('同期失敗（最大リトライ回数到達）:', op);
          await this.db.delete('syncQueue', op.id);
        } else {
          // 指数バックオフ
          const backoffMs = Math.pow(2, op.retryCount) * 1000;
          setTimeout(() => {
            this.db.put('syncQueue', op);
          }, backoffMs);
        }
      }
    }
  }

  private async executeOperation(op: SyncOperation): Promise<void> {
    switch (op.type) {
      case 'create':
        await fetch(`/api/${op.storeName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.data),
        });
        break;

      case 'update':
        await fetch(`/api/${op.storeName}/${op.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.data),
        });
        break;

      case 'delete':
        await fetch(`/api/${op.storeName}/${op.data.id}`, {
          method: 'DELETE',
        });
        break;
    }
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}
```

## ElectricSQL - PostgreSQLベース

### 概要

ElectricSQLはPostgreSQLをローカルファーストにするフレームワークです。

**特徴**:
- PostgreSQL完全互換
- リアルタイム同期
- 型安全なクライアント
- オフラインファースト

### セットアップ

```bash
npm install electric-sql
npm install -D @electric-sql/prisma-generator
```

```prisma
// schema.prisma
generator electric {
  provider = "electric-sql"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Todo {
  id        String   @id @default(uuid())
  text      String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("todos")
}
```

### 使用例

```typescript
import { electrify } from 'electric-sql/wa-sqlite';
import { schema } from './generated/client';

// データベースの初期化
const conn = await ElectricDatabase.init('my-app.db');
const electric = await electrify(conn, schema, {
  url: 'https://your-electric-service.com',
});

// リアルタイム同期
const { synced } = await electric.db.todos.sync();
await synced;

// データ操作（完全に型安全）
const todos = await electric.db.todos.findMany({
  where: { completed: false },
  orderBy: { createdAt: 'desc' },
});

// リアルタイム監視
const unsubscribe = electric.db.todos.liveMany({
  where: { completed: false },
}).subscribe((todos) => {
  console.log('Todos updated:', todos);
});

// 新規作成
await electric.db.todos.create({
  data: {
    text: 'Buy groceries',
    completed: false,
  },
});

// 更新
await electric.db.todos.update({
  where: { id: 'todo-id' },
  data: { completed: true },
});

// 削除
await electric.db.todos.delete({
  where: { id: 'todo-id' },
});
```

### Reactフック

```typescript
import { useLiveQuery } from 'electric-sql/react';

function TodoList() {
  const { results: todos } = useLiveQuery(
    electric.db.todos.liveMany({
      where: { completed: false },
      orderBy: { createdAt: 'desc' },
    })
  );

  if (!todos) {
    return <div>Loading...</div>;
  }

  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

function TodoItem({ todo }: { todo: Todo }) {
  const handleToggle = async () => {
    await electric.db.todos.update({
      where: { id: todo.id },
      data: { completed: !todo.completed },
    });
  };

  return (
    <li>
      <input type="checkbox" checked={todo.completed} onChange={handleToggle} />
      <span>{todo.text}</span>
    </li>
  );
}
```

## PowerSync - マルチデータベース対応

### 概要

PowerSyncは複数のバックエンドに対応したローカルファーストフレームワークです。

**対応バックエンド**:
- PostgreSQL
- MongoDB
- MySQL
- Supabase
- Firebase

### セットアップ

```bash
npm install @powersync/web
```

```typescript
import { PowerSyncDatabase } from '@powersync/web';
import { WASQLiteDBAdapter } from '@powersync/web';

// スキーマ定義
const schema = {
  todos: {
    id: { type: 'text' },
    text: { type: 'text' },
    completed: { type: 'integer' },
    created_at: { type: 'text' },
    updated_at: { type: 'text' },
  },
} as const;

// データベース初期化
const db = new PowerSyncDatabase({
  schema,
  database: {
    dbFilename: 'powersync.db',
    dbLocation: 'default',
  },
});

await db.init();

// Supabaseとの接続
await db.connect({
  powerSyncUrl: 'https://your-powersync.com',
  token: async () => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token ?? '';
  },
});
```

### 使用例

```typescript
// クエリ実行
const todos = await db.getAll<Todo>(
  'SELECT * FROM todos WHERE completed = ? ORDER BY created_at DESC',
  [0]
);

// リアルタイム監視
const unsubscribe = db.watch(
  'SELECT * FROM todos WHERE completed = ?',
  [0],
  {
    onResult: (result) => {
      console.log('Todos updated:', result.rows);
    },
  }
);

// トランザクション
await db.writeTransaction(async (tx) => {
  await tx.execute(
    'INSERT INTO todos (id, text, completed, created_at) VALUES (?, ?, ?, ?)',
    [uuid(), 'New todo', 0, new Date().toISOString()]
  );
});

// アップロード（サーバーへの同期）
db.registerUploadHandler(async (transaction) => {
  const { data, error } = await supabase
    .from('todos')
    .upsert(transaction.crud.put);

  if (error) throw error;
});
```

### Reactフック

```typescript
import { useQuery } from '@powersync/react';

function TodoList() {
  const { data: todos, isLoading } = useQuery<Todo>(
    'SELECT * FROM todos WHERE completed = ? ORDER BY created_at DESC',
    [0]
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <ul>
      {todos?.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

## LiveStore - リアルタイム同期

### 概要

LiveStoreは軽量なリアルタイム同期ライブラリです。

### 基本的な使い方

```typescript
import { LiveStore } from '@livestore/client';

// ストアの作成
const store = new LiveStore({
  url: 'wss://your-livestore-server.com',
  auth: {
    token: 'your-auth-token',
  },
});

// コレクションの作成
const todosCollection = store.collection<Todo>('todos');

// リアルタイム監視
todosCollection.watch((todos) => {
  console.log('Todos:', todos);
});

// データ操作
await todosCollection.insert({
  id: uuid(),
  text: 'Buy milk',
  completed: false,
});

await todosCollection.update('todo-id', {
  completed: true,
});

await todosCollection.delete('todo-id');

// クエリ
const incompleteTodos = todosCollection.query((todo) => !todo.completed);
```

## フレームワーク比較

| 特徴 | ElectricSQL | PowerSync | LiveStore | Yjs |
|------|------------|-----------|-----------|-----|
| **バックエンド** | PostgreSQL | 多数対応 | 任意 | 任意 |
| **型安全性** | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ |
| **オフライン対応** | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★☆ |
| **リアルタイム性** | ★★★★☆ | ★★★★☆ | ★★★★★ | ★★★★★ |
| **学習曲線** | 低 | 中 | 低 | 中 |
| **エコシステム** | Prisma | Supabase等 | 独自 | 豊富 |
| **ドキュメント** | ★★★★☆ | ★★★★★ | ★★★☆☆ | ★★★★★ |
| **本番環境実績** | △ | ○ | △ | ○ |
| **コスト** | 有料 | 有料 | 要確認 | 無料 |

### 選択ガイド

```
PostgreSQL使用中 → ElectricSQL
Supabase使用中 → PowerSync
軽量な同期が必要 → LiveStore
リアルタイム共同編集 → Yjs
```

## 実装パターンとベストプラクティス

### 楽観的UI更新

```typescript
class OptimisticUpdater {
  async updateTodo(id: string, updates: Partial<Todo>) {
    // 1. UIを即座に更新（楽観的更新）
    const previousState = this.getTodo(id);
    this.updateUI(id, updates);

    try {
      // 2. ローカルDBを更新
      await db.todos.update({
        where: { id },
        data: updates,
      });

      // 3. サーバーに同期（バックグラウンド）
      await syncEngine.sync();
    } catch (error) {
      // 4. エラー時はロールバック
      this.updateUI(id, previousState);
      throw error;
    }
  }

  private updateUI(id: string, updates: Partial<Todo>) {
    // UIフレームワークの状態を更新
  }

  private getTodo(id: string): Todo {
    // 現在の状態を取得
    return {} as Todo;
  }
}
```

### コンフリクト解決戦略

```typescript
type ConflictResolution = 'last-write-wins' | 'manual' | 'custom';

class ConflictResolver {
  resolve(
    local: Todo,
    remote: Todo,
    strategy: ConflictResolution = 'last-write-wins'
  ): Todo {
    switch (strategy) {
      case 'last-write-wins':
        return local.updatedAt > remote.updatedAt ? local : remote;

      case 'manual':
        return this.promptUser(local, remote);

      case 'custom':
        return this.customMerge(local, remote);

      default:
        return remote;
    }
  }

  private promptUser(local: Todo, remote: Todo): Todo {
    // ユーザーに選択させる
    // モーダルを表示するなど
    return local;
  }

  private customMerge(local: Todo, remote: Todo): Todo {
    // カスタムマージロジック
    return {
      ...remote,
      // ローカルの特定フィールドを優先
      text: local.text,
      // タイムスタンプは最新のものを使用
      updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    };
  }
}
```

### パフォーマンス最適化

```typescript
class PerformanceOptimizer {
  // バッチ処理
  private batchQueue: any[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  queueUpdate(update: any) {
    this.batchQueue.push(update);

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, 100); // 100ms後にまとめて処理
  }

  private async processBatch() {
    const updates = [...this.batchQueue];
    this.batchQueue = [];

    await db.writeTransaction(async (tx) => {
      for (const update of updates) {
        await tx.execute(update.sql, update.params);
      }
    });
  }

  // インデックスの最適化
  createIndexes() {
    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_todos_completed
      ON todos(completed);

      CREATE INDEX IF NOT EXISTS idx_todos_created_at
      ON todos(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_todos_user_id
      ON todos(user_id);
    `);
  }

  // ページネーション
  async getPaginatedTodos(page: number = 1, pageSize: number = 50) {
    const offset = (page - 1) * pageSize;

    const todos = await db.getAll(
      'SELECT * FROM todos ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );

    const total = await db.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM todos'
    );

    return {
      data: todos,
      page,
      pageSize,
      total: total?.count || 0,
      hasMore: offset + pageSize < (total?.count || 0),
    };
  }
}
```

## まとめ

ローカルファースト開発は、優れたユーザー体験とオフライン対応を実現する重要なアプローチです。

**主要なポイント**:

1. **CRDT理論の理解**: 分散システムでの競合解決
2. **適切なフレームワーク選択**: 要件に応じたツール選定
3. **同期戦略**: プッシュ/プル、コンフリクト解決
4. **パフォーマンス**: バッチ処理、インデックス最適化
5. **UX設計**: 楽観的UI更新、オフライン表示

**2026年のトレンド**:
- エンタープライズでのローカルファースト採用拡大
- エッジコンピューティングとの統合
- セキュリティとプライバシーの強化
- クロスプラットフォーム対応の充実

本記事の技術を活用して、高速でオフライン対応した次世代アプリケーションを構築してください。
