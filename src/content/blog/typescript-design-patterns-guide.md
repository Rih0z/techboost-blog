---
title: 'TypeScriptで学ぶデザインパターン完全ガイド — GoF・関数型・Reactパターン実装'
description: 'TypeScriptでGoFデザインパターンを実装する実践ガイド。Singleton・Factory・Observer・Strategy・Decoratorから、React Hooks・カスタムHooks・Compound Componentパターンまで網羅。'
pubDate: 'Feb 21 2026'
tags: ['TypeScript', 'デザインパターン', 'Architecture', 'React']
---

ソフトウェア開発において「デザインパターン」は、過去の優秀なエンジニアたちが蓄積した設計の知恵を体系化したものです。TypeScriptはその静的型システムにより、これらのパターンをより安全かつ明確に実装できます。本記事では GoF の23パターンを中心に、React パターン、関数型パターンまで TypeScript の型システムをフル活用した実装例を紹介します。

---

## 1. デザインパターンとは — GoFの23パターン概要

**GoF（Gang of Four）** とは、Erich Gamma・Richard Helm・Ralph Johnson・John Vlissides の4名によって1994年に著された書籍「Design Patterns: Elements of Reusable Object-Oriented Software」に由来します。彼らは繰り返し登場する設計課題とその解決策を23のパターンとして体系化しました。

### パターンの3つのカテゴリ

| カテゴリ | 目的 | 主なパターン |
|----------|------|-------------|
| **生成パターン** | オブジェクト生成の柔軟性向上 | Singleton, Factory Method, Abstract Factory, Builder, Prototype |
| **構造パターン** | クラス・オブジェクトの組み合わせ | Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy |
| **振る舞いパターン** | オブジェクト間の通信・責務分担 | Chain of Responsibility, Command, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor |

TypeScript でこれらを実装する最大の利点は、**インターフェースによる契約の明示化**と**ジェネリクスによる型安全な汎用実装**にあります。

---

## 2. 生成パターン（Creational Patterns）

### 2-1. Singleton — 型安全なシングルトン

Singleton パターンは、クラスのインスタンスが必ずひとつだけ存在することを保証します。設定管理・ロガー・データベース接続プールで頻繁に使われます。

```typescript
// ジェネリック Singleton 基底クラス
class Singleton<T> {
  private static instances = new Map<string, unknown>();

  protected constructor() {}

  static getInstance<T extends Singleton<T>>(
    this: new () => T
  ): T {
    const key = this.name;
    if (!Singleton.instances.has(key)) {
      Singleton.instances.set(key, new this());
    }
    return Singleton.instances.get(key) as T;
  }
}

// アプリケーション設定の型定義
interface AppConfig {
  apiBaseUrl: string;
  apiVersion: string;
  timeout: number;
  debugMode: boolean;
}

// 型安全な設定管理シングルトン
class ConfigManager extends Singleton<ConfigManager> {
  private config: AppConfig = {
    apiBaseUrl: process.env.API_BASE_URL ?? 'https://api.example.com',
    apiVersion: 'v2',
    timeout: 5000,
    debugMode: process.env.NODE_ENV === 'development',
  };

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.config[key] = value;
  }

  getAll(): Readonly<AppConfig> {
    return Object.freeze({ ...this.config });
  }
}

// 使用例
const config1 = ConfigManager.getInstance();
const config2 = ConfigManager.getInstance();
console.log(config1 === config2); // true — 同一インスタンス

const apiUrl = config1.get('apiBaseUrl'); // 型: string
```

**TypeScript のポイント:** `Map<string, unknown>` でインスタンスを管理し、`get` メソッドに mapped types を使うことで、プロパティ名と返り値の型が連動します。

### 2-2. Factory Method / Abstract Factory

Factory パターンは、インスタンス生成の詳細をサブクラスやファクトリ関数に委譲します。

```typescript
// 通知の種類を型で定義
type NotificationType = 'email' | 'sms' | 'push' | 'slack';

interface NotificationPayload {
  recipient: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// 通知インターフェース（製品の契約）
interface Notification {
  readonly type: NotificationType;
  send(payload: NotificationPayload): Promise<NotificationResult>;
  validate(payload: NotificationPayload): boolean;
}

// 具体的な実装
class EmailNotification implements Notification {
  readonly type = 'email' as const;

  validate(payload: NotificationPayload): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.recipient);
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    if (!this.validate(payload)) {
      return { success: false, error: 'Invalid email address' };
    }
    // 実際のメール送信処理
    console.log(`[Email] Sending to ${payload.recipient}: ${payload.subject}`);
    return { success: true, messageId: `email-${Date.now()}` };
  }
}

class SlackNotification implements Notification {
  readonly type = 'slack' as const;

  constructor(private readonly webhookUrl: string) {}

  validate(payload: NotificationPayload): boolean {
    return payload.recipient.startsWith('#') || payload.recipient.startsWith('@');
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    if (!this.validate(payload)) {
      return { success: false, error: 'Invalid Slack channel/user format' };
    }
    console.log(`[Slack] Posting to ${payload.recipient}`);
    return { success: true, messageId: `slack-${Date.now()}` };
  }
}

// Abstract Factory — 通知チャンネルのファミリー生成
interface NotificationFactory {
  createNotification(): Notification;
  createLogger(): NotificationLogger;
}

interface NotificationLogger {
  log(event: string, data: Record<string, unknown>): void;
}

class ProductionNotificationFactory implements NotificationFactory {
  createNotification(): Notification {
    return new EmailNotification();
  }
  createLogger(): NotificationLogger {
    return {
      log: (event, data) => console.log(JSON.stringify({ event, data, env: 'production' })),
    };
  }
}

// ファクトリ関数パターン（関数型アプローチ）
function createNotification(type: NotificationType): Notification {
  const factories: Record<NotificationType, () => Notification> = {
    email: () => new EmailNotification(),
    sms: () => ({ type: 'sms', validate: () => true, send: async () => ({ success: true }) }),
    push: () => ({ type: 'push', validate: () => true, send: async () => ({ success: true }) }),
    slack: () => new SlackNotification(process.env.SLACK_WEBHOOK ?? ''),
  };

  const factory = factories[type];
  if (!factory) {
    throw new Error(`Unknown notification type: ${type}`);
  }
  return factory();
}
```

### 2-3. Builder — 流暢なインターフェース設計

Builder パターンは、複雑なオブジェクトを段階的に構築します。TypeScript では**メソッドチェーン**と**型推論**を組み合わせて流暢な API が実現できます。

```typescript
// クエリビルダーの例
type SortOrder = 'ASC' | 'DESC';
type LogicalOperator = 'AND' | 'OR';

interface WhereCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: unknown;
  logical?: LogicalOperator;
}

interface QueryOptions {
  table: string;
  fields: string[];
  conditions: WhereCondition[];
  orderBy?: { field: string; order: SortOrder };
  limit?: number;
  offset?: number;
  joins?: JoinClause[];
}

interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT';
  table: string;
  on: string;
}

// 型安全なクエリビルダー
class QueryBuilder {
  private options: QueryOptions = {
    table: '',
    fields: ['*'],
    conditions: [],
  };

  from(table: string): this {
    this.options.table = table;
    return this;
  }

  select(...fields: string[]): this {
    this.options.fields = fields;
    return this;
  }

  where(
    field: string,
    operator: WhereCondition['operator'],
    value: unknown
  ): this {
    this.options.conditions.push({ field, operator, value, logical: 'AND' });
    return this;
  }

  orWhere(
    field: string,
    operator: WhereCondition['operator'],
    value: unknown
  ): this {
    this.options.conditions.push({ field, operator, value, logical: 'OR' });
    return this;
  }

  orderBy(field: string, order: SortOrder = 'ASC'): this {
    this.options.orderBy = { field, order };
    return this;
  }

  limit(count: number): this {
    this.options.limit = count;
    return this;
  }

  offset(count: number): this {
    this.options.offset = count;
    return this;
  }

  join(type: JoinClause['type'], table: string, on: string): this {
    this.options.joins = [...(this.options.joins ?? []), { type, table, on }];
    return this;
  }

  build(): string {
    const { table, fields, conditions, orderBy, limit, offset, joins } = this.options;

    if (!table) throw new Error('Table name is required');

    let query = `SELECT ${fields.join(', ')} FROM ${table}`;

    if (joins?.length) {
      query += joins
        .map(j => ` ${j.type} JOIN ${j.table} ON ${j.on}`)
        .join('');
    }

    if (conditions.length > 0) {
      const whereClause = conditions
        .map((c, i) => {
          const condition = `${c.field} ${c.operator} ?`;
          return i === 0 ? condition : `${c.logical} ${condition}`;
        })
        .join(' ');
      query += ` WHERE ${whereClause}`;
    }

    if (orderBy) query += ` ORDER BY ${orderBy.field} ${orderBy.order}`;
    if (limit !== undefined) query += ` LIMIT ${limit}`;
    if (offset !== undefined) query += ` OFFSET ${offset}`;

    return query;
  }
}

// 流暢な使用例
const query = new QueryBuilder()
  .from('users')
  .select('id', 'name', 'email', 'created_at')
  .join('LEFT', 'orders', 'users.id = orders.user_id')
  .where('status', '=', 'active')
  .where('age', '>=', 18)
  .orderBy('created_at', 'DESC')
  .limit(20)
  .offset(0)
  .build();

// SELECT id, name, email, created_at FROM users LEFT JOIN orders ON users.id = orders.user_id WHERE status = ? AND age >= ? ORDER BY created_at DESC LIMIT 20 OFFSET 0
```

---

## 3. 構造パターン（Structural Patterns）

### 3-1. Adapter — 外部APIラッパー

Adapter パターンは、互換性のないインターフェースを橋渡しします。外部ライブラリの API をアプリ固有のインターフェースに適合させるのに最適です。

```typescript
// アプリ内部の統一インターフェース
interface InternalStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
}

// 外部ライブラリ（例: ioredis）の想定インターフェース
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<'OK'>;
  setex(key: string, seconds: number, value: string): Promise<'OK'>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
}

// Redis Adapter — 外部 API を内部インターフェースに適合
class RedisStorageAdapter implements InternalStorage {
  constructor(private readonly client: RedisClient) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds !== undefined) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.client.del(key);
    return result > 0;
  }

  async has(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result > 0;
  }
}

// インメモリ実装（テスト・開発環境用）
class InMemoryStorageAdapter implements InternalStorage {
  private store = new Map<string, { value: unknown; expiresAt?: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}

// アプリコードは InternalStorage のみを知る — 実装は DI で切り替え
async function getCachedUser(storage: InternalStorage, userId: string) {
  const cached = await storage.get<{ id: string; name: string }>(`user:${userId}`);
  if (cached) return cached;
  // DB から取得して 5 分キャッシュ
  const user = { id: userId, name: 'John Doe' };
  await storage.set(`user:${userId}`, user, 300);
  return user;
}
```

### 3-2. Decorator — TypeScript Decorator と手動実装

TypeScript には言語レベルの Decorator 構文がありますが、パターンとしての Decorator は関数・クラスどちらでも実装できます。

```typescript
// 関数型 Decorator — ロギング・キャッシュ・バリデーション
type AsyncFunction<TArgs extends unknown[], TReturn> = (
  ...args: TArgs
) => Promise<TReturn>;

// ロギング Decorator
function withLogging<TArgs extends unknown[], TReturn>(
  fn: AsyncFunction<TArgs, TReturn>,
  name: string
): AsyncFunction<TArgs, TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const start = performance.now();
    console.log(`[${name}] Starting with args:`, args);
    try {
      const result = await fn(...args);
      const duration = (performance.now() - start).toFixed(2);
      console.log(`[${name}] Completed in ${duration}ms`);
      return result;
    } catch (error) {
      console.error(`[${name}] Failed:`, error);
      throw error;
    }
  };
}

// キャッシュ Decorator（シリアライズ可能な引数が前提）
function withCache<TArgs extends unknown[], TReturn>(
  fn: AsyncFunction<TArgs, TReturn>,
  ttlMs: number = 60_000
): AsyncFunction<TArgs, TReturn> {
  const cache = new Map<string, { value: TReturn; expiresAt: number }>();

  return async (...args: TArgs): Promise<TReturn> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const result = await fn(...args);
    cache.set(key, { value: result, expiresAt: Date.now() + ttlMs });
    return result;
  };
}

// リトライ Decorator
function withRetry<TArgs extends unknown[], TReturn>(
  fn: AsyncFunction<TArgs, TReturn>,
  maxRetries: number = 3,
  delayMs: number = 1000
): AsyncFunction<TArgs, TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }
    throw lastError;
  };
}

// Decorator の合成
async function fetchUserFromAPI(userId: string): Promise<{ id: string; name: string }> {
  const response = await fetch(`https://api.example.com/users/${userId}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// 複数 Decorator を重ねる
const fetchUser = withLogging(
  withCache(
    withRetry(fetchUserFromAPI, 3, 500),
    5 * 60_000  // 5 分キャッシュ
  ),
  'fetchUser'
);
```

### 3-3. Facade — 複雑システムの簡素化

```typescript
// 複雑なサブシステム群
class AuthService {
  async verifyToken(token: string): Promise<{ userId: string; roles: string[] } | null> {
    // JWT検証ロジック
    return { userId: 'usr_123', roles: ['user'] };
  }
}

class DatabaseService {
  async query<T>(sql: string, params: unknown[]): Promise<T[]> {
    // DB クエリ実行
    return [] as T[];
  }
}

class CacheService {
  async get<T>(key: string): Promise<T | null> { return null; }
  async set<T>(key: string, value: T, ttl: number): Promise<void> {}
}

class EventBus {
  emit(event: string, data: unknown): void {
    console.log(`Event: ${event}`, data);
  }
}

// Facade — 上位レベルの API を提供
interface UserProfileResult {
  user: { id: string; name: string; email: string };
  roles: string[];
  preferences: Record<string, unknown>;
}

class UserFacade {
  private auth = new AuthService();
  private db = new DatabaseService();
  private cache = new CacheService();
  private events = new EventBus();

  async getUserProfile(token: string): Promise<UserProfileResult | null> {
    // 1. トークン検証
    const session = await this.auth.verifyToken(token);
    if (!session) return null;

    // 2. キャッシュ確認
    const cacheKey = `profile:${session.userId}`;
    const cached = await this.cache.get<UserProfileResult>(cacheKey);
    if (cached) return cached;

    // 3. DB から取得
    const [user] = await this.db.query<{ id: string; name: string; email: string }>(
      'SELECT id, name, email FROM users WHERE id = ?',
      [session.userId]
    );

    if (!user) return null;

    const [preferences] = await this.db.query<Record<string, unknown>>(
      'SELECT preferences FROM user_settings WHERE user_id = ?',
      [session.userId]
    );

    const result: UserProfileResult = {
      user,
      roles: session.roles,
      preferences: preferences ?? {},
    };

    // 4. キャッシュ保存 & イベント発火
    await this.cache.set(cacheKey, result, 300);
    this.events.emit('user:profile:accessed', { userId: session.userId });

    return result;
  }
}

// クライアントコードは Facade だけを知る
const userFacade = new UserFacade();
const profile = await userFacade.getUserProfile('Bearer eyJhbG...');
```

---

## 4. 振る舞いパターン（Behavioral Patterns）

### 4-1. Observer — 型安全なイベントエミッタ

```typescript
// イベントマップを型で定義（型安全の核心）
interface AppEventMap {
  'user:login': { userId: string; timestamp: Date };
  'user:logout': { userId: string };
  'order:created': { orderId: string; total: number; items: string[] };
  'payment:completed': { orderId: string; method: 'card' | 'bank' | 'crypto' };
  'error:occurred': { code: string; message: string; stack?: string };
}

type EventListener<T> = (data: T) => void | Promise<void>;

class TypedEventEmitter<TEventMap extends Record<string, unknown>> {
  private listeners = new Map<
    keyof TEventMap,
    Set<EventListener<TEventMap[keyof TEventMap]>>
  >();

  on<K extends keyof TEventMap>(
    event: K,
    listener: EventListener<TEventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as EventListener<TEventMap[keyof TEventMap]>);

    // クリーンアップ関数を返す
    return () => this.off(event, listener);
  }

  off<K extends keyof TEventMap>(
    event: K,
    listener: EventListener<TEventMap[K]>
  ): void {
    this.listeners.get(event)?.delete(
      listener as EventListener<TEventMap[keyof TEventMap]>
    );
  }

  async emit<K extends keyof TEventMap>(
    event: K,
    data: TEventMap[K]
  ): Promise<void> {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    await Promise.all(
      Array.from(handlers).map(handler => handler(data))
    );
  }

  once<K extends keyof TEventMap>(
    event: K,
    listener: EventListener<TEventMap[K]>
  ): () => void {
    const wrapper: EventListener<TEventMap[K]> = async (data) => {
      cleanup();
      await listener(data);
    };
    const cleanup = this.on(event, wrapper);
    return cleanup;
  }
}

// 使用例
const emitter = new TypedEventEmitter<AppEventMap>();

// 型推論が効く — data は { userId: string; timestamp: Date }
const cleanup = emitter.on('user:login', async (data) => {
  console.log(`User ${data.userId} logged in at ${data.timestamp.toISOString()}`);
  // ウェルカムメール送信など
});

emitter.on('order:created', (data) => {
  console.log(`Order ${data.orderId}: ¥${data.total.toLocaleString()}`);
});

// イベント発火
await emitter.emit('user:login', { userId: 'usr_456', timestamp: new Date() });

// リスナー解除
cleanup();
```

### 4-2. Strategy — アルゴリズムの動的切り替え

```typescript
// 並べ替え戦略の例
interface SortStrategy<T> {
  readonly name: string;
  sort(data: T[], compareFn: (a: T, b: T) => number): T[];
}

// 各戦略の実装
class QuickSort<T> implements SortStrategy<T> {
  readonly name = 'QuickSort';

  sort(data: T[], compareFn: (a: T, b: T) => number): T[] {
    if (data.length <= 1) return [...data];
    const [pivot, ...rest] = data;
    const left = rest.filter(item => compareFn(item, pivot) <= 0);
    const right = rest.filter(item => compareFn(item, pivot) > 0);
    return [
      ...this.sort(left, compareFn),
      pivot,
      ...this.sort(right, compareFn),
    ];
  }
}

class MergeSort<T> implements SortStrategy<T> {
  readonly name = 'MergeSort';

  sort(data: T[], compareFn: (a: T, b: T) => number): T[] {
    if (data.length <= 1) return [...data];
    const mid = Math.floor(data.length / 2);
    const left = this.sort(data.slice(0, mid), compareFn);
    const right = this.sort(data.slice(mid), compareFn);
    return this.merge(left, right, compareFn);
  }

  private merge(left: T[], right: T[], compareFn: (a: T, b: T) => number): T[] {
    const result: T[] = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
      if (compareFn(left[i], right[j]) <= 0) {
        result.push(left[i++]);
      } else {
        result.push(right[j++]);
      }
    }
    return [...result, ...left.slice(i), ...right.slice(j)];
  }
}

// コンテキスト — 戦略を保持・実行
class DataSorter<T> {
  private strategy: SortStrategy<T>;

  constructor(strategy: SortStrategy<T>) {
    this.strategy = strategy;
  }

  setStrategy(strategy: SortStrategy<T>): void {
    console.log(`Strategy changed to: ${strategy.name}`);
    this.strategy = strategy;
  }

  sort(data: T[], compareFn: (a: T, b: T) => number): T[] {
    const start = performance.now();
    const result = this.strategy.sort(data, compareFn);
    const duration = (performance.now() - start).toFixed(3);
    console.log(`${this.strategy.name}: sorted ${data.length} items in ${duration}ms`);
    return result;
  }
}

// 支払い処理戦略の実用例
interface PaymentContext {
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

interface PaymentResult {
  transactionId: string;
  status: 'completed' | 'pending' | 'failed';
  fee: number;
}

interface PaymentStrategy {
  readonly name: string;
  readonly feeRate: number;
  process(context: PaymentContext): Promise<PaymentResult>;
  isAvailable(amount: number): boolean;
}

class CreditCardStrategy implements PaymentStrategy {
  readonly name = 'CreditCard';
  readonly feeRate = 0.029;

  isAvailable(_amount: number): boolean { return true; }

  async process(context: PaymentContext): Promise<PaymentResult> {
    const fee = Math.round(context.amount * this.feeRate);
    return {
      transactionId: `cc-${Date.now()}`,
      status: 'completed',
      fee,
    };
  }
}

class CryptoStrategy implements PaymentStrategy {
  readonly name = 'Crypto';
  readonly feeRate = 0.001;

  isAvailable(amount: number): boolean {
    return amount >= 1000; // 1,000円以上のみ
  }

  async process(context: PaymentContext): Promise<PaymentResult> {
    const fee = Math.round(context.amount * this.feeRate);
    return {
      transactionId: `crypto-${Date.now()}`,
      status: 'pending', // ブロックチェーン確認待ち
      fee,
    };
  }
}
```

### 4-3. Command — アンドゥ・リドゥ実装

```typescript
interface Command<TState> {
  execute(state: TState): TState;
  undo(state: TState): TState;
  readonly description: string;
}

// テキストエディタのコマンド例
interface EditorState {
  content: string;
  cursorPosition: number;
  selection?: { start: number; end: number };
}

class InsertTextCommand implements Command<EditorState> {
  readonly description: string;

  constructor(
    private readonly text: string,
    private readonly position: number
  ) {
    this.description = `Insert "${text}" at position ${position}`;
  }

  execute(state: EditorState): EditorState {
    const content =
      state.content.slice(0, this.position) +
      this.text +
      state.content.slice(this.position);
    return { ...state, content, cursorPosition: this.position + this.text.length };
  }

  undo(state: EditorState): EditorState {
    const content =
      state.content.slice(0, this.position) +
      state.content.slice(this.position + this.text.length);
    return { ...state, content, cursorPosition: this.position };
  }
}

class DeleteTextCommand implements Command<EditorState> {
  readonly description: string;
  private deletedText: string = '';

  constructor(
    private readonly start: number,
    private readonly end: number
  ) {
    this.description = `Delete text from ${start} to ${end}`;
  }

  execute(state: EditorState): EditorState {
    this.deletedText = state.content.slice(this.start, this.end);
    const content = state.content.slice(0, this.start) + state.content.slice(this.end);
    return { ...state, content, cursorPosition: this.start };
  }

  undo(state: EditorState): EditorState {
    const content =
      state.content.slice(0, this.start) +
      this.deletedText +
      state.content.slice(this.start);
    return { ...state, content, cursorPosition: this.end };
  }
}

// コマンドマネージャ（履歴管理）
class CommandManager<TState> {
  private history: Command<TState>[] = [];
  private redoStack: Command<TState>[] = [];
  private currentState: TState;

  constructor(initialState: TState) {
    this.currentState = initialState;
  }

  execute(command: Command<TState>): TState {
    this.currentState = command.execute(this.currentState);
    this.history.push(command);
    this.redoStack = []; // 新しい操作でリドゥスタックをクリア
    return this.currentState;
  }

  undo(): TState | null {
    const command = this.history.pop();
    if (!command) return null;
    this.currentState = command.undo(this.currentState);
    this.redoStack.push(command);
    return this.currentState;
  }

  redo(): TState | null {
    const command = this.redoStack.pop();
    if (!command) return null;
    this.currentState = command.execute(this.currentState);
    this.history.push(command);
    return this.currentState;
  }

  getState(): Readonly<TState> {
    return this.currentState;
  }

  getHistory(): ReadonlyArray<{ description: string }> {
    return this.history.map(c => ({ description: c.description }));
  }
}
```

---

## 5. Reactパターン

### 5-1. Custom Hooks パターン

Custom Hooks は React の「振る舞いの再利用」を実現する最も重要なパターンです。

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

// ジェネリックな非同期データフェッチフック
interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = []
): UseAsyncState<T> {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });

  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await asyncFn();
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => { mountedRef.current = false; };
  }, [execute]);

  return { ...state, refetch: execute };
}

// ローカルストレージと同期する状態管理フック
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue(prev => {
        const nextValue = typeof value === 'function'
          ? (value as (prev: T) => T)(prev)
          : value;
        window.localStorage.setItem(key, JSON.stringify(nextValue));
        return nextValue;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    window.localStorage.removeItem(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// デバウンス付き入力フック
function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
```

### 5-2. Compound Component パターン

Compound Component は、関連するコンポーネント群を一体として提供し、柔軟な構成を可能にします。

```typescript
import React, { createContext, useContext, useState } from 'react';

// 型定義
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  variant: 'underline' | 'pill' | 'bordered';
}

// Context の作成（型安全）
const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('useTabsContext must be used within <Tabs>');
  }
  return ctx;
}

// ルートコンポーネント
interface TabsProps {
  defaultTab: string;
  variant?: TabsContextValue['variant'];
  onChange?: (tabId: string) => void;
  children: React.ReactNode;
}

function Tabs({ defaultTab, variant = 'underline', onChange, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleSetActiveTab = (id: string) => {
    setActiveTab(id);
    onChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab, variant }}>
      <div className="tabs-container">{children}</div>
    </TabsContext.Provider>
  );
}

// サブコンポーネント
interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

function TabList({ children, className }: TabListProps) {
  const { variant } = useTabsContext();
  return (
    <div
      role="tablist"
      className={`tab-list tab-list--${variant} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

interface TabProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function Tab({ id, children, disabled = false }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(id)}
      className={`tab ${isActive ? 'tab--active' : ''} ${disabled ? 'tab--disabled' : ''}`}
    >
      {children}
    </button>
  );
}

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
}

function TabPanel({ id, children }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  if (activeTab !== id) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={id}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// サブコンポーネントを静的プロパティとして公開
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// 宣言的な使用例
function App() {
  return (
    <Tabs defaultTab="overview" variant="underline" onChange={console.log}>
      <Tabs.List>
        <Tabs.Tab id="overview">概要</Tabs.Tab>
        <Tabs.Tab id="features">機能</Tabs.Tab>
        <Tabs.Tab id="pricing">料金</Tabs.Tab>
        <Tabs.Tab id="api" disabled>API（準備中）</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel id="overview"><p>製品の概要説明</p></Tabs.Panel>
      <Tabs.Panel id="features"><p>詳細機能リスト</p></Tabs.Panel>
      <Tabs.Panel id="pricing"><p>料金プラン比較</p></Tabs.Panel>
    </Tabs>
  );
}
```

### 5-3. Render Props vs Hooks の比較

```typescript
// Render Props パターン（レガシーだが理解必須）
interface MousePosition {
  x: number;
  y: number;
}

interface MouseTrackerProps {
  render: (position: MousePosition) => React.ReactNode;
}

function MouseTracker({ render }: MouseTrackerProps) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div onMouseMove={handleMouseMove} style={{ height: '100vh' }}>
      {render(position)}
    </div>
  );
}

// 同等の Custom Hook（推奨）
function useMousePosition(): MousePosition {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setPosition({ x: e.clientX, y: e.clientY });
    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, []);

  return position;
}

// Hooks の方がシンプル・再利用しやすい
function CursorFollower() {
  const { x, y } = useMousePosition();
  return <div style={{ transform: `translate(${x}px, ${y}px)` }}>●</div>;
}
```

**結論:** Render Props は HOC（Higher-Order Component）と同様、現在は Custom Hooks に置き換えられています。ただし、サードパーティライブラリとの統合や、JSX ツリーの構成を制御したい場面では今も有効です。

---

## 6. 関数型パターン — Maybe/Either モナド

TypeScript の型システムを使えば、関数型プログラミングのコアパターンを安全に実装できます。

```typescript
// Maybe モナド — null/undefined を型で表現
type Maybe<T> = Just<T> | Nothing;

class Just<T> {
  readonly _tag = 'Just' as const;
  constructor(readonly value: T) {}

  map<U>(fn: (value: T) => U): Maybe<U> {
    return new Just(fn(this.value));
  }

  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U> {
    return fn(this.value);
  }

  getOrElse(_defaultValue: T): T {
    return this.value;
  }

  getOrNull(): T | null {
    return this.value;
  }
}

class Nothing {
  readonly _tag = 'Nothing' as const;

  map<U>(_fn: (value: never) => U): Maybe<U> {
    return nothing;
  }

  flatMap<U>(_fn: (value: never) => Maybe<U>): Maybe<U> {
    return nothing;
  }

  getOrElse<T>(defaultValue: T): T {
    return defaultValue;
  }

  getOrNull(): null {
    return null;
  }
}

const nothing = new Nothing();

function maybe<T>(value: T | null | undefined): Maybe<T> {
  return value == null ? nothing : new Just(value);
}

// Either モナド — エラー処理を型で表現
type Either<E, A> = Left<E> | Right<A>;

class Left<E> {
  readonly _tag = 'Left' as const;
  constructor(readonly error: E) {}

  map<B>(_fn: (value: never) => B): Either<E, B> {
    return this as unknown as Either<E, B>;
  }

  flatMap<B>(_fn: (value: never) => Either<E, B>): Either<E, B> {
    return this as unknown as Either<E, B>;
  }

  fold<C>(onLeft: (error: E) => C, _onRight: (value: never) => C): C {
    return onLeft(this.error);
  }
}

class Right<A> {
  readonly _tag = 'Right' as const;
  constructor(readonly value: A) {}

  map<B>(fn: (value: A) => B): Either<never, B> {
    return new Right(fn(this.value));
  }

  flatMap<E, B>(fn: (value: A) => Either<E, B>): Either<E, B> {
    return fn(this.value);
  }

  fold<C>(_onLeft: (error: never) => C, onRight: (value: A) => C): C {
    return onRight(this.value);
  }
}

function left<E, A = never>(error: E): Either<E, A> {
  return new Left<E>(error) as Either<E, A>;
}

function right<A, E = never>(value: A): Either<E, A> {
  return new Right<A>(value) as Either<E, A>;
}

// 実践的な使用例 — バリデーションパイプライン
interface ValidationError {
  field: string;
  message: string;
}

function validateEmail(email: string): Either<ValidationError, string> {
  if (!email.includes('@')) {
    return left({ field: 'email', message: 'Invalid email format' });
  }
  return right(email.toLowerCase().trim());
}

function validateAge(age: unknown): Either<ValidationError, number> {
  const parsed = Number(age);
  if (isNaN(parsed) || parsed < 0 || parsed > 150) {
    return left({ field: 'age', message: 'Age must be between 0 and 150' });
  }
  return right(parsed);
}

interface UserInput {
  email: string;
  age: unknown;
  name: string;
}

interface ValidatedUser {
  email: string;
  age: number;
  name: string;
}

function validateUser(input: UserInput): Either<ValidationError, ValidatedUser> {
  const emailResult = validateEmail(input.email);
  if (emailResult._tag === 'Left') return emailResult;

  const ageResult = validateAge(input.age);
  if (ageResult._tag === 'Left') return ageResult;

  return right({
    email: emailResult.value,
    age: ageResult.value,
    name: input.name.trim(),
  });
}

// 使用例
const result = validateUser({ email: 'user@example.com', age: 25, name: '山田太郎' });

result.fold(
  (error) => console.error(`Validation failed: ${error.field} - ${error.message}`),
  (user) => console.log(`Valid user: ${user.name} (${user.email}, ${user.age}歳)`)
);

// Maybe を使った安全なプロパティアクセス
interface Config {
  database?: {
    host?: string;
    port?: number;
  };
}

function getDatabaseHost(config: Config): string {
  return maybe(config.database)
    .flatMap(db => maybe(db.host))
    .map(host => host.toUpperCase())
    .getOrElse('localhost');
}
```

---

## 7. まとめ — パターン選択指針

### どのパターンをいつ使うべきか

| 課題 | 推奨パターン | 理由 |
|------|-------------|------|
| グローバル設定・状態の一元管理 | Singleton | インスタンスの一意性を保証 |
| オブジェクト生成ロジックの隠蔽 | Factory Method | 生成と利用の分離 |
| 複雑なオブジェクトの段階的構築 | Builder | 可読性の高い API 設計 |
| 互換性のない外部 API の吸収 | Adapter | インターフェースの統一 |
| 既存クラスへの機能追加 | Decorator | Open/Closed 原則の遵守 |
| 複雑なサブシステムの単純化 | Facade | 依存関係の削減 |
| 状態変化の通知・イベント処理 | Observer | 疎結合な連携 |
| アルゴリズムの動的切り替え | Strategy | 条件分岐の排除 |
| 操作の履歴・取り消し | Command | 操作のオブジェクト化 |
| null/undefined の安全な処理 | Maybe モナド | 型システムによるヌル安全 |
| エラー処理の明示化 | Either モナド | 例外に頼らない関数型スタイル |

### TypeScript でパターンを活用するための3原則

1. **インターフェース優先** — 実装クラスでなくインターフェースに依存する。依存性逆転の原則（DIP）の実践。

2. **ジェネリクスで汎用化** — `T extends SomeInterface` のような制約付きジェネリクスで型安全な汎用パターンを実現する。

3. **関数型と OOP の融合** — TypeScript は関数型と OOP の両方をサポートする。Decorator は高階関数で、Observer は Custom Hooks で実装できる場合、よりシンプルになる。

### アンチパターンへの注意

- **過剰な Singleton** — 単なるグローバル変数の代替になってはいけない。テスト困難性を生む
- **Factory の乱用** — 単純な `new` で済む場合はパターン不要。YAGNI（You Ain't Gonna Need It）
- **Observer の循環** — A が B を監視し B が A を監視する循環は無限ループの原因になる
- **Decorator の積み過ぎ** — デバッグが困難になる。最大3〜4層が目安

デザインパターンはゴールではなく手段です。コードの意図を明確にし、変更に強い設計を実現するために、状況に応じて適切なパターンを選択してください。TypeScript の型システムはその選択の誤りをコンパイル時に教えてくれる、最高の相棒です。

---

*本記事のコードは TypeScript 5.x 以上を前提としています。React パターンのコードは React 18 + TypeScript で動作します。*
