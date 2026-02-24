---
title: 'JavaScript・TypeScriptデザインパターン完全ガイド：実践的なソフトウェア設計'
description: 'JavaScript/TypeScriptでのデザインパターンを徹底解説。GoFパターン（生成・構造・振る舞い）・関数型パターン・Reactパターン・DIコンテナ・SOLID原則・Clean Architectureまで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
---

デザインパターンはソフトウェア開発における再利用可能な解決策の集合であり、特定の設計問題に対して実績のあるアプローチを提供する。JavaScript・TypeScriptの世界でこれらのパターンを習得することは、保守性が高く拡張しやすいコードを書くための基礎となる。本記事では、GoFの23パターンから始まり、関数型パターン、Reactコンポーネントパターン、そしてClean ArchitectureやDDDまで、実践的なTypeScriptコード例とともに徹底解説する。

## デザインパターンとは何か・なぜ重要か

### GoFパターンの歴史と背景

1994年、Erich Gamma・Richard Helm・Ralph Johnson・John Vlissidesの4名（通称Gang of Four, GoF）が著書「Design Patterns: Elements of Reusable Object-Oriented Software」を発表した。この書籍は、オブジェクト指向設計における23の基本パターンをカタログ化したものであり、ソフトウェア工学に革命をもたらした。

GoFパターンは以下の3カテゴリに分類される。

- **生成パターン（Creational Patterns）**: オブジェクトの生成方法を抽象化する（5パターン）
- **構造パターン（Structural Patterns）**: クラスやオブジェクトの組み合わせ方を定義する（7パターン）
- **振る舞いパターン（Behavioral Patterns）**: オブジェクト間の通信と責任分配を定義する（11パターン）

### デザインパターンがもたらす価値

デザインパターンを採用することで、以下のメリットが得られる。

**共通言語の確立**: 「ここにObserverパターンを使おう」という一言で、チーム全員がそのコードの意図を理解できる。数百行のコードを説明する必要がなくなる。

**実績のある解決策**: パターンは多くの開発現場で検証された解決策である。車輪の再発明を避けることができる。

**保守性の向上**: パターンに従ったコードは構造が予測可能なため、後から読む開発者が内容を把握しやすい。

**テスタビリティの向上**: 多くのパターンはインターフェースや抽象クラスを活用するため、モックやスタブを使ったテストが容易になる。

### TypeScriptにおけるパターン実装の優位性

TypeScriptは静的型付けを提供するため、デザインパターンの実装において以下の点でJavaScriptよりも優れている。

- インターフェースを用いた明示的な契約定義
- ジェネリクスによるタイプセーフな汎用実装
- アクセス修飾子（private・protected・public）による適切なカプセル化
- デコレータを活用したメタプログラミング

---

## 生成パターン（Creational Patterns）

生成パターンはオブジェクトのインスタンス化メカニズムを抽象化し、システムが具体的なクラスに依存しないようにする。

### Singletonパターン

Singletonパターンは、クラスのインスタンスが1つだけ存在することを保証し、そのインスタンスへのグローバルなアクセス点を提供する。

**ユースケース**: データベース接続プール・設定管理・ロギングサービス・キャッシュ管理

```typescript
class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private connectionString: string;
  private isConnected: boolean = false;

  private constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  static getInstance(connectionString: string = ''): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(connectionString);
    }
    return DatabaseConnection.instance;
  }

  connect(): void {
    if (!this.isConnected) {
      console.log(`Connecting to: ${this.connectionString}`);
      this.isConnected = true;
    }
  }

  query<T>(sql: string): Promise<T[]> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    // 実際のクエリ実行ロジック
    return Promise.resolve([] as T[]);
  }

  disconnect(): void {
    this.isConnected = false;
    console.log('Database disconnected');
  }
}

// 使用例
const db1 = DatabaseConnection.getInstance('postgresql://localhost:5432/mydb');
const db2 = DatabaseConnection.getInstance();

console.log(db1 === db2); // true - 同一インスタンス

db1.connect();
db2.query('SELECT * FROM users'); // 同じ接続を使用
```

**スレッドセーフなSingleton（Node.js非同期環境向け）**:

```typescript
class ConfigurationManager {
  private static instance: ConfigurationManager | null = null;
  private static initializationPromise: Promise<ConfigurationManager> | null = null;
  private config: Record<string, unknown> = {};

  private constructor() {}

  static async getInstance(): Promise<ConfigurationManager> {
    if (ConfigurationManager.instance) {
      return ConfigurationManager.instance;
    }

    if (!ConfigurationManager.initializationPromise) {
      ConfigurationManager.initializationPromise = ConfigurationManager.initialize();
    }

    return ConfigurationManager.initializationPromise;
  }

  private static async initialize(): Promise<ConfigurationManager> {
    const manager = new ConfigurationManager();
    await manager.loadConfig();
    ConfigurationManager.instance = manager;
    return manager;
  }

  private async loadConfig(): Promise<void> {
    // 設定ファイルの非同期読み込み
    this.config = {
      apiUrl: process.env.API_URL ?? 'https://api.example.com',
      timeout: parseInt(process.env.TIMEOUT ?? '5000'),
      retryCount: parseInt(process.env.RETRY_COUNT ?? '3'),
    };
  }

  get<T>(key: string): T | undefined {
    return this.config[key] as T | undefined;
  }

  set(key: string, value: unknown): void {
    this.config[key] = value;
  }
}

// 使用例
async function main() {
  const config = await ConfigurationManager.getInstance();
  console.log(config.get<string>('apiUrl'));
}
```

### Factory Methodパターン

Factory Methodパターンは、オブジェクト生成のためのインターフェースを定義するが、どのクラスをインスタンス化するかはサブクラスに決定させる。

**ユースケース**: UIコンポーネント生成・異なるデータソースへの対応・プラグインシステム

```typescript
// 製品インターフェース
interface Notification {
  send(message: string, recipient: string): Promise<void>;
  getType(): string;
}

// 具体的な製品
class EmailNotification implements Notification {
  private smtpHost: string;

  constructor(smtpHost: string) {
    this.smtpHost = smtpHost;
  }

  async send(message: string, recipient: string): Promise<void> {
    console.log(`Sending email to ${recipient} via ${this.smtpHost}: ${message}`);
    // 実際のメール送信ロジック
  }

  getType(): string {
    return 'email';
  }
}

class SlackNotification implements Notification {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async send(message: string, recipient: string): Promise<void> {
    console.log(`Sending Slack message to ${recipient}: ${message}`);
    // Slack API呼び出し
  }

  getType(): string {
    return 'slack';
  }
}

class PushNotification implements Notification {
  private fcmKey: string;

  constructor(fcmKey: string) {
    this.fcmKey = fcmKey;
  }

  async send(message: string, recipient: string): Promise<void> {
    console.log(`Sending push notification to ${recipient}: ${message}`);
    // Firebase Cloud Messaging呼び出し
  }

  getType(): string {
    return 'push';
  }
}

// ファクトリー基底クラス
abstract class NotificationFactory {
  abstract createNotification(): Notification;

  async notify(message: string, recipient: string): Promise<void> {
    const notification = this.createNotification();
    await notification.send(message, recipient);
    console.log(`Notification sent via ${notification.getType()}`);
  }
}

// 具体的なファクトリー
class EmailNotificationFactory extends NotificationFactory {
  constructor(private smtpHost: string) {
    super();
  }

  createNotification(): Notification {
    return new EmailNotification(this.smtpHost);
  }
}

class SlackNotificationFactory extends NotificationFactory {
  constructor(private webhookUrl: string) {
    super();
  }

  createNotification(): Notification {
    return new SlackNotification(this.webhookUrl);
  }
}

// 設定に基づいてファクトリーを選択
function getNotificationFactory(type: string): NotificationFactory {
  switch (type) {
    case 'email':
      return new EmailNotificationFactory('smtp.example.com');
    case 'slack':
      return new SlackNotificationFactory('https://hooks.slack.com/...');
    case 'push':
      return new EmailNotificationFactory('fcm-key-here');
    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}

// 使用例
async function sendAlert(type: string, message: string, recipient: string) {
  const factory = getNotificationFactory(type);
  await factory.notify(message, recipient);
}
```

### Builderパターン

Builderパターンは、複雑なオブジェクトの構築をその表現から分離し、同じ構築プロセスで異なる表現を生成できるようにする。

**ユースケース**: 複雑なHTTPリクエスト構築・クエリビルダー・フォームバリデーション設定

```typescript
// クエリビルダーの実装例
interface QueryOptions {
  table: string;
  conditions: string[];
  orderBy: string | null;
  limit: number | null;
  offset: number | null;
  joins: string[];
  selectedColumns: string[];
}

class QueryBuilder {
  private options: QueryOptions = {
    table: '',
    conditions: [],
    orderBy: null,
    limit: null,
    offset: null,
    joins: [],
    selectedColumns: ['*'],
  };

  from(table: string): this {
    this.options.table = table;
    return this;
  }

  select(...columns: string[]): this {
    this.options.selectedColumns = columns;
    return this;
  }

  where(condition: string): this {
    this.options.conditions.push(condition);
    return this;
  }

  orderByColumn(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.options.orderBy = `${column} ${direction}`;
    return this;
  }

  take(limit: number): this {
    this.options.limit = limit;
    return this;
  }

  skip(offset: number): this {
    this.options.offset = offset;
    return this;
  }

  join(table: string, condition: string, type: 'INNER' | 'LEFT' | 'RIGHT' = 'INNER'): this {
    this.options.joins.push(`${type} JOIN ${table} ON ${condition}`);
    return this;
  }

  build(): string {
    if (!this.options.table) {
      throw new Error('Table name is required');
    }

    const columns = this.options.selectedColumns.join(', ');
    let query = `SELECT ${columns} FROM ${this.options.table}`;

    if (this.options.joins.length > 0) {
      query += ` ${this.options.joins.join(' ')}`;
    }

    if (this.options.conditions.length > 0) {
      query += ` WHERE ${this.options.conditions.join(' AND ')}`;
    }

    if (this.options.orderBy) {
      query += ` ORDER BY ${this.options.orderBy}`;
    }

    if (this.options.limit !== null) {
      query += ` LIMIT ${this.options.limit}`;
    }

    if (this.options.offset !== null) {
      query += ` OFFSET ${this.options.offset}`;
    }

    return query;
  }
}

// 使用例
const query = new QueryBuilder()
  .from('users')
  .select('id', 'name', 'email', 'created_at')
  .join('orders', 'users.id = orders.user_id', 'LEFT')
  .where('users.active = true')
  .where('users.age >= 18')
  .orderByColumn('created_at', 'DESC')
  .take(20)
  .skip(40)
  .build();

console.log(query);
// SELECT id, name, email, created_at FROM users
// LEFT JOIN orders ON users.id = orders.user_id
// WHERE users.active = true AND users.age >= 18
// ORDER BY created_at DESC LIMIT 20 OFFSET 40
```

### Prototypeパターン

Prototypeパターンは、原型となるオブジェクトをコピーして新しいオブジェクトを生成する。

```typescript
interface Cloneable<T> {
  clone(): T;
}

class UserProfile implements Cloneable<UserProfile> {
  constructor(
    public name: string,
    public email: string,
    public permissions: string[],
    public settings: Record<string, unknown>
  ) {}

  clone(): UserProfile {
    return new UserProfile(
      this.name,
      this.email,
      [...this.permissions], // 配列のディープコピー
      { ...this.settings }   // オブジェクトのシャローコピー
    );
  }

  withName(name: string): UserProfile {
    const clone = this.clone();
    clone.name = name;
    return clone;
  }

  withPermissions(permissions: string[]): UserProfile {
    const clone = this.clone();
    clone.permissions = [...permissions];
    return clone;
  }
}

// テンプレートプロファイルから新規ユーザーを作成
const adminTemplate = new UserProfile(
  'Template Admin',
  '',
  ['read', 'write', 'delete', 'manage_users'],
  { theme: 'dark', language: 'ja', timezone: 'Asia/Tokyo' }
);

const newAdmin = adminTemplate
  .withName('田中 太郎')
  .withPermissions(['read', 'write']);

newAdmin.email = 'tanaka@example.com';

console.log(newAdmin.name); // 田中 太郎
console.log(adminTemplate.name); // Template Admin（変更されていない）
```

---

## 構造パターン（Structural Patterns）

構造パターンは、クラスやオブジェクトをより大きな構造に組み合わせる方法を定義する。

### Adapterパターン

Adapterパターンはあるクラスのインターフェースをクライアントが期待する別のインターフェースに変換する。互換性のないインターフェースを持つクラスを連携させる。

**ユースケース**: サードパーティライブラリの統合・レガシーコードの再利用・外部API統合

```typescript
// 既存のシステムが期待するインターフェース
interface ModernPaymentGateway {
  processPayment(amount: number, currency: string, cardToken: string): Promise<{
    transactionId: string;
    status: 'success' | 'failed';
    timestamp: Date;
  }>;
  refundPayment(transactionId: string, amount: number): Promise<boolean>;
}

// レガシー決済システムのインターフェース（変更できない）
class LegacyPaymentSystem {
  chargeCard(
    cardNumber: string,
    expiry: string,
    cvv: string,
    amountInCents: number
  ): { success: boolean; id: string } {
    // レガシーシステムの実装
    return { success: true, id: `LEGACY-${Date.now()}` };
  }

  reverseCharge(legacyId: string): boolean {
    console.log(`Reversing charge: ${legacyId}`);
    return true;
  }
}

// カードトークンサービス（実際のカード情報を管理）
class CardTokenService {
  private tokenMap = new Map<string, { number: string; expiry: string; cvv: string }>();

  getCardDetails(token: string): { number: string; expiry: string; cvv: string } | null {
    return this.tokenMap.get(token) ?? null;
  }

  createToken(number: string, expiry: string, cvv: string): string {
    const token = `tok_${Math.random().toString(36).substr(2, 9)}`;
    this.tokenMap.set(token, { number, expiry, cvv });
    return token;
  }
}

// アダプタークラス
class LegacyPaymentAdapter implements ModernPaymentGateway {
  private legacySystem: LegacyPaymentSystem;
  private tokenService: CardTokenService;
  private transactionMap = new Map<string, string>(); // modern ID -> legacy ID

  constructor(legacySystem: LegacyPaymentSystem, tokenService: CardTokenService) {
    this.legacySystem = legacySystem;
    this.tokenService = tokenService;
  }

  async processPayment(
    amount: number,
    currency: string,
    cardToken: string
  ): Promise<{ transactionId: string; status: 'success' | 'failed'; timestamp: Date }> {
    const cardDetails = this.tokenService.getCardDetails(cardToken);
    if (!cardDetails) {
      return {
        transactionId: '',
        status: 'failed',
        timestamp: new Date(),
      };
    }

    // 金額をセントに変換（現代のAPIはデシマル、レガシーはセント）
    const amountInCents = Math.round(amount * 100);

    const result = this.legacySystem.chargeCard(
      cardDetails.number,
      cardDetails.expiry,
      cardDetails.cvv,
      amountInCents
    );

    const modernId = `TXN-${Date.now()}`;
    if (result.success) {
      this.transactionMap.set(modernId, result.id);
    }

    return {
      transactionId: modernId,
      status: result.success ? 'success' : 'failed',
      timestamp: new Date(),
    };
  }

  async refundPayment(transactionId: string, amount: number): Promise<boolean> {
    const legacyId = this.transactionMap.get(transactionId);
    if (!legacyId) {
      return false;
    }
    return this.legacySystem.reverseCharge(legacyId);
  }
}
```

### Decoratorパターン

Decoratorパターンは、オブジェクトに動的に新しい責任を追加する。機能拡張においてサブクラス化の柔軟な代替手段となる。

**ユースケース**: ミドルウェア・ロギング・キャッシュ・バリデーション・認証

```typescript
// コンポーネントインターフェース
interface DataFetcher<T> {
  fetch(endpoint: string): Promise<T>;
}

// 具体的なコンポーネント
class HttpDataFetcher<T> implements DataFetcher<T> {
  async fetch(endpoint: string): Promise<T> {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}

// ベースデコレーター
abstract class DataFetcherDecorator<T> implements DataFetcher<T> {
  constructor(protected wrapped: DataFetcher<T>) {}

  abstract fetch(endpoint: string): Promise<T>;
}

// キャッシュデコレーター
class CachingDecorator<T> extends DataFetcherDecorator<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private ttlMs: number;

  constructor(wrapped: DataFetcher<T>, ttlMs: number = 60000) {
    super(wrapped);
    this.ttlMs = ttlMs;
  }

  async fetch(endpoint: string): Promise<T> {
    const cached = this.cache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      console.log(`Cache hit for: ${endpoint}`);
      return cached.data;
    }

    const data = await this.wrapped.fetch(endpoint);
    this.cache.set(endpoint, { data, timestamp: Date.now() });
    return data;
  }

  invalidate(endpoint: string): void {
    this.cache.delete(endpoint);
  }

  clearAll(): void {
    this.cache.clear();
  }
}

// ロギングデコレーター
class LoggingDecorator<T> extends DataFetcherDecorator<T> {
  constructor(
    wrapped: DataFetcher<T>,
    private logger: (message: string) => void = console.log
  ) {
    super(wrapped);
  }

  async fetch(endpoint: string): Promise<T> {
    const startTime = Date.now();
    this.logger(`Fetching: ${endpoint}`);

    try {
      const result = await this.wrapped.fetch(endpoint);
      const duration = Date.now() - startTime;
      this.logger(`Fetched ${endpoint} in ${duration}ms`);
      return result;
    } catch (error) {
      this.logger(`Error fetching ${endpoint}: ${error}`);
      throw error;
    }
  }
}

// リトライデコレーター
class RetryDecorator<T> extends DataFetcherDecorator<T> {
  constructor(
    wrapped: DataFetcher<T>,
    private maxRetries: number = 3,
    private delayMs: number = 1000
  ) {
    super(wrapped);
  }

  async fetch(endpoint: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.wrapped.fetch(endpoint);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          await this.delay(this.delayMs * Math.pow(2, attempt)); // 指数バックオフ
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// デコレーターの組み合わせ
interface User { id: number; name: string; email: string; }

const baseFetcher = new HttpDataFetcher<User[]>();
const withLogging = new LoggingDecorator(baseFetcher);
const withRetry = new RetryDecorator(withLogging, 3, 500);
const withCache = new CachingDecorator(withRetry, 5 * 60 * 1000); // 5分キャッシュ

// 全てのデコレーターが適用された状態でフェッチ
const users = await withCache.fetch('https://api.example.com/users');
```

### Facadeパターン

Facadeパターンは、サブシステムの複雑なインターフェースに対してシンプルなインターフェースを提供する。

```typescript
// 複雑なサブシステム群
class VideoEncoder {
  encode(file: File, format: string): Promise<Blob> {
    console.log(`Encoding ${file.name} to ${format}`);
    return Promise.resolve(new Blob());
  }
}

class ThumbnailGenerator {
  generate(videoFile: File, timestamp: number): Promise<Blob> {
    console.log(`Generating thumbnail at ${timestamp}s`);
    return Promise.resolve(new Blob());
  }
}

class CloudStorageService {
  upload(data: Blob, path: string): Promise<string> {
    console.log(`Uploading to ${path}`);
    return Promise.resolve(`https://cdn.example.com/${path}`);
  }
}

class MetadataExtractor {
  extract(file: File): Promise<{ duration: number; width: number; height: number }> {
    return Promise.resolve({ duration: 120, width: 1920, height: 1080 });
  }
}

class DatabaseService {
  saveVideo(metadata: Record<string, unknown>): Promise<string> {
    console.log('Saving video metadata to database');
    return Promise.resolve(`video-${Date.now()}`);
  }
}

// ファサード - 複雑な処理を単純なインターフェースに集約
class VideoUploadFacade {
  private encoder = new VideoEncoder();
  private thumbnailGenerator = new ThumbnailGenerator();
  private storage = new CloudStorageService();
  private metadataExtractor = new MetadataExtractor();
  private database = new DatabaseService();

  async uploadVideo(file: File, options: {
    format?: string;
    thumbnailTimestamp?: number;
    userId: string;
  }): Promise<{ videoId: string; videoUrl: string; thumbnailUrl: string }> {
    const format = options.format ?? 'mp4';
    const timestamp = options.thumbnailTimestamp ?? 5;

    // 並列処理でパフォーマンス最適化
    const [encodedVideo, metadata] = await Promise.all([
      this.encoder.encode(file, format),
      this.metadataExtractor.extract(file),
    ]);

    const thumbnail = await this.thumbnailGenerator.generate(file, timestamp);
    const basePath = `users/${options.userId}/videos/${Date.now()}`;

    const [videoUrl, thumbnailUrl] = await Promise.all([
      this.storage.upload(encodedVideo, `${basePath}/video.${format}`),
      this.storage.upload(thumbnail, `${basePath}/thumbnail.jpg`),
    ]);

    const videoId = await this.database.saveVideo({
      userId: options.userId,
      videoUrl,
      thumbnailUrl,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      uploadedAt: new Date(),
    });

    return { videoId, videoUrl, thumbnailUrl };
  }
}

// クライアントは単一のメソッドを呼ぶだけ
const facade = new VideoUploadFacade();
const result = await facade.uploadVideo(videoFile, { userId: 'user123' });
```

### Proxyパターン

Proxyパターンは、あるオブジェクトへのアクセスを制御するための代理オブジェクトを提供する。

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(data: Omit<User, 'id'>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

// 実際のリポジトリ実装
class RealUserRepository implements UserRepository {
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === Number(id)) ?? null;
  }

  async findAll(): Promise<User[]> {
    return [...this.users];
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    const user: User = { ...data, id: this.users.length + 1 };
    this.users.push(user);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex(u => u.id === Number(id));
    if (index === -1) return null;
    this.users[index] = { ...this.users[index], ...data };
    return this.users[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === Number(id));
    if (index === -1) return false;
    this.users.splice(index, 1);
    return true;
  }
}

// 認可チェックプロキシ
class AuthorizationProxy implements UserRepository {
  constructor(
    private real: UserRepository,
    private currentUserId: string,
    private userRole: 'admin' | 'user' | 'guest'
  ) {}

  private requireRole(minRole: 'admin' | 'user' | 'guest'): void {
    const hierarchy = { admin: 3, user: 2, guest: 1 };
    if (hierarchy[this.userRole] < hierarchy[minRole]) {
      throw new Error(`Access denied: requires ${minRole} role`);
    }
  }

  async findById(id: string): Promise<User | null> {
    this.requireRole('guest');
    // ゲストでも自分のプロフィールのみ閲覧可能
    if (this.userRole === 'guest' && id !== this.currentUserId) {
      throw new Error('Guests can only view their own profile');
    }
    return this.real.findById(id);
  }

  async findAll(): Promise<User[]> {
    this.requireRole('admin');
    return this.real.findAll();
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    this.requireRole('admin');
    return this.real.create(data);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    this.requireRole('user');
    if (this.userRole !== 'admin' && id !== this.currentUserId) {
      throw new Error('Users can only update their own profile');
    }
    return this.real.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    this.requireRole('admin');
    return this.real.delete(id);
  }
}
```

### Compositeパターン

Compositeパターンは、オブジェクトをツリー構造に組み合わせて、部分・全体の階層を表現する。

```typescript
interface FileSystemItem {
  getName(): string;
  getSize(): number;
  print(indent: string): void;
}

class FileItem implements FileSystemItem {
  constructor(private name: string, private size: number) {}

  getName(): string { return this.name; }
  getSize(): number { return this.size; }

  print(indent: string): void {
    console.log(`${indent}${this.name} (${this.size} bytes)`);
  }
}

class DirectoryItem implements FileSystemItem {
  private children: FileSystemItem[] = [];

  constructor(private name: string) {}

  add(item: FileSystemItem): this {
    this.children.push(item);
    return this;
  }

  remove(item: FileSystemItem): void {
    const index = this.children.indexOf(item);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
  }

  getName(): string { return this.name; }

  getSize(): number {
    return this.children.reduce((total, child) => total + child.getSize(), 0);
  }

  print(indent: string = ''): void {
    console.log(`${indent}${this.name}/`);
    this.children.forEach(child => child.print(indent + '  '));
  }
}

// ファイルシステム構造の構築
const root = new DirectoryItem('project');
const src = new DirectoryItem('src');
const components = new DirectoryItem('components');

components.add(new FileItem('Button.tsx', 1200));
components.add(new FileItem('Input.tsx', 800));
components.add(new FileItem('Modal.tsx', 2100));

src.add(components);
src.add(new FileItem('App.tsx', 450));
src.add(new FileItem('index.ts', 120));

root.add(src);
root.add(new FileItem('package.json', 890));
root.add(new FileItem('tsconfig.json', 340));

root.print();
console.log(`Total size: ${root.getSize()} bytes`);
```

---

## 振る舞いパターン（Behavioral Patterns）

振る舞いパターンは、オブジェクト間のアルゴリズムや責任の分配を担う。

### Observerパターン

Observerパターンは、あるオブジェクトの状態変化を、それに依存する複数のオブジェクトに自動的に通知・更新する仕組みを定義する。

**ユースケース**: イベント管理・リアクティブUI・WebSocket通知・状態管理

```typescript
type EventHandler<T> = (data: T) => void | Promise<void>;

class TypedEventEmitter<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<EventHandler<unknown>>>();

  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);

    // アンサブスクライブ関数を返す
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>);
  }

  async emit<K extends keyof Events>(event: K, data: Events[K]): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    const promises = Array.from(handlers).map(handler => handler(data));
    await Promise.allSettled(promises);
  }

  once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    const wrapper: EventHandler<Events[K]> = (data) => {
      this.off(event, wrapper);
      return handler(data);
    };
    this.on(event, wrapper);
  }
}

// ユーザーアクションイベントシステムの実装例
interface UserEvents {
  'user:login': { userId: string; email: string; timestamp: Date };
  'user:logout': { userId: string };
  'user:profile-update': { userId: string; changes: Partial<User> };
  'user:subscription-change': { userId: string; plan: 'free' | 'pro' | 'enterprise' };
}

class UserEventBus extends TypedEventEmitter<UserEvents> {}

const eventBus = new UserEventBus();

// ロギングサブスクライバー
const unsubscribeLogger = eventBus.on('user:login', async ({ userId, email, timestamp }) => {
  console.log(`[AUDIT] User ${userId} (${email}) logged in at ${timestamp.toISOString()}`);
  // 監査ログをデータベースに記録
});

// 分析サブスクライバー
eventBus.on('user:login', async ({ userId }) => {
  // 分析サービスにイベントを送信
  console.log(`[ANALYTICS] Login event for user ${userId}`);
});

// サブスクリプション変更通知
eventBus.on('user:subscription-change', async ({ userId, plan }) => {
  if (plan === 'pro') {
    console.log(`Sending welcome email to ${userId} for pro plan`);
  }
});

// イベントの発行
await eventBus.emit('user:login', {
  userId: 'user123',
  email: 'user@example.com',
  timestamp: new Date(),
});

// 不要になったらアンサブスクライブ
unsubscribeLogger();
```

### Strategyパターン

Strategyパターンは、アルゴリズムのファミリーを定義し、それぞれをカプセル化して交換可能にする。

**ユースケース**: ソートアルゴリズム・認証方式・支払い処理・データ圧縮・バリデーション

```typescript
interface SortStrategy<T> {
  sort(data: T[], compareFn: (a: T, b: T) => number): T[];
  getName(): string;
}

class BubbleSortStrategy<T> implements SortStrategy<T> {
  sort(data: T[], compareFn: (a: T, b: T) => number): T[] {
    const arr = [...data];
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        if (compareFn(arr[j], arr[j + 1]) > 0) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        }
      }
    }
    return arr;
  }

  getName(): string { return 'BubbleSort'; }
}

class QuickSortStrategy<T> implements SortStrategy<T> {
  sort(data: T[], compareFn: (a: T, b: T) => number): T[] {
    if (data.length <= 1) return data;

    const pivot = data[Math.floor(data.length / 2)];
    const left = data.filter(x => compareFn(x, pivot) < 0);
    const middle = data.filter(x => compareFn(x, pivot) === 0);
    const right = data.filter(x => compareFn(x, pivot) > 0);

    return [
      ...this.sort(left, compareFn),
      ...middle,
      ...this.sort(right, compareFn),
    ];
  }

  getName(): string { return 'QuickSort'; }
}

class DataSorter<T> {
  constructor(private strategy: SortStrategy<T>) {}

  setStrategy(strategy: SortStrategy<T>): void {
    this.strategy = strategy;
  }

  sort(data: T[], compareFn: (a: T, b: T) => number): T[] {
    console.log(`Using ${this.strategy.getName()} algorithm`);
    const start = performance.now();
    const result = this.strategy.sort(data, compareFn);
    const end = performance.now();
    console.log(`Sorting completed in ${end - start}ms`);
    return result;
  }
}

// 実践的な例: バリデーションストラテジー
interface ValidationStrategy {
  validate(value: unknown): { valid: boolean; errors: string[] };
}

class RequiredValidator implements ValidationStrategy {
  validate(value: unknown): { valid: boolean; errors: string[] } {
    const valid = value !== null && value !== undefined && value !== '';
    return { valid, errors: valid ? [] : ['This field is required'] };
  }
}

class EmailValidator implements ValidationStrategy {
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validate(value: unknown): { valid: boolean; errors: string[] } {
    if (typeof value !== 'string') {
      return { valid: false, errors: ['Must be a string'] };
    }
    const valid = this.emailRegex.test(value);
    return { valid, errors: valid ? [] : ['Invalid email format'] };
  }
}

class MinLengthValidator implements ValidationStrategy {
  constructor(private minLength: number) {}

  validate(value: unknown): { valid: boolean; errors: string[] } {
    if (typeof value !== 'string') {
      return { valid: false, errors: ['Must be a string'] };
    }
    const valid = value.length >= this.minLength;
    return {
      valid,
      errors: valid ? [] : [`Must be at least ${this.minLength} characters`],
    };
  }
}

class CompositeValidator implements ValidationStrategy {
  constructor(private validators: ValidationStrategy[]) {}

  validate(value: unknown): { valid: boolean; errors: string[] } {
    const allErrors: string[] = [];
    for (const validator of this.validators) {
      const { errors } = validator.validate(value);
      allErrors.push(...errors);
    }
    return { valid: allErrors.length === 0, errors: allErrors };
  }
}

// フォームバリデーションの使用例
const passwordValidator = new CompositeValidator([
  new RequiredValidator(),
  new MinLengthValidator(8),
]);

const emailValidator = new CompositeValidator([
  new RequiredValidator(),
  new EmailValidator(),
]);

console.log(passwordValidator.validate('pass')); // エラー: 8文字以上必要
console.log(emailValidator.validate('invalid-email')); // エラー: 無効なメール形式
```

### Commandパターン

Commandパターンは、リクエストをオブジェクトとしてカプセル化し、リクエストのパラメータ化・キューイング・ロギング・アンドゥ機能を実現する。

```typescript
interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
  getDescription(): string;
}

class CommandHistory {
  private history: Command[] = [];
  private currentIndex: number = -1;

  async execute(command: Command): Promise<void> {
    // 現在位置より後のコマンドを削除（分岐した履歴を排除）
    this.history = this.history.slice(0, this.currentIndex + 1);
    await command.execute();
    this.history.push(command);
    this.currentIndex++;
    console.log(`Executed: ${command.getDescription()}`);
  }

  async undo(): Promise<boolean> {
    if (this.currentIndex < 0) {
      console.log('Nothing to undo');
      return false;
    }
    const command = this.history[this.currentIndex];
    await command.undo();
    this.currentIndex--;
    console.log(`Undone: ${command.getDescription()}`);
    return true;
  }

  async redo(): Promise<boolean> {
    if (this.currentIndex >= this.history.length - 1) {
      console.log('Nothing to redo');
      return false;
    }
    this.currentIndex++;
    const command = this.history[this.currentIndex];
    await command.execute();
    console.log(`Redone: ${command.getDescription()}`);
    return true;
  }

  getHistory(): string[] {
    return this.history.map((cmd, index) => {
      const marker = index === this.currentIndex ? ' <--' : '';
      return `${index}: ${cmd.getDescription()}${marker}`;
    });
  }
}

// テキストエディターのコマンド実装例
class TextEditor {
  content: string = '';
}

class InsertTextCommand implements Command {
  constructor(
    private editor: TextEditor,
    private text: string,
    private position: number
  ) {}

  async execute(): Promise<void> {
    const before = this.editor.content.slice(0, this.position);
    const after = this.editor.content.slice(this.position);
    this.editor.content = before + this.text + after;
  }

  async undo(): Promise<void> {
    const before = this.editor.content.slice(0, this.position);
    const after = this.editor.content.slice(this.position + this.text.length);
    this.editor.content = before + after;
  }

  getDescription(): string {
    return `Insert "${this.text}" at position ${this.position}`;
  }
}

class DeleteTextCommand implements Command {
  private deletedText: string = '';

  constructor(
    private editor: TextEditor,
    private start: number,
    private length: number
  ) {}

  async execute(): Promise<void> {
    this.deletedText = this.editor.content.slice(this.start, this.start + this.length);
    this.editor.content =
      this.editor.content.slice(0, this.start) +
      this.editor.content.slice(this.start + this.length);
  }

  async undo(): Promise<void> {
    const before = this.editor.content.slice(0, this.start);
    const after = this.editor.content.slice(this.start);
    this.editor.content = before + this.deletedText + after;
  }

  getDescription(): string {
    return `Delete ${this.length} characters at position ${this.start}`;
  }
}

// 使用例
const editor = new TextEditor();
const history = new CommandHistory();

await history.execute(new InsertTextCommand(editor, 'Hello', 0));
await history.execute(new InsertTextCommand(editor, ' World', 5));
await history.execute(new InsertTextCommand(editor, '!', 11));
console.log(editor.content); // Hello World!

await history.undo(); // ! を削除
console.log(editor.content); // Hello World

await history.undo(); // " World" を削除
console.log(editor.content); // Hello

await history.redo(); // " World" を再挿入
console.log(editor.content); // Hello World
```

### Iteratorパターン

IteratorパターンはTypeScriptのジェネレーターと組み合わせることで、強力なデータ走査機能を実現する。

```typescript
// カスタムイテレーターの実装
class PaginatedIterator<T> implements Iterator<T[], T[], undefined> {
  private currentPage = 0;
  private cache: T[] = [];
  private done = false;

  constructor(
    private fetchPage: (page: number, pageSize: number) => Promise<T[]>,
    private pageSize: number = 20
  ) {}

  async next(): Promise<IteratorResult<T[]>> {
    if (this.done) {
      return { value: undefined as unknown as T[], done: true };
    }

    const page = await this.fetchPage(this.currentPage, this.pageSize);

    if (page.length === 0) {
      this.done = true;
      return { value: undefined as unknown as T[], done: true };
    }

    this.currentPage++;
    this.cache.push(...page);

    return { value: page, done: false };
  }
}

// ジェネレーターを使った遅延評価イテレーター
function* range(start: number, end: number, step: number = 1): Generator<number> {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}

function* map<T, U>(iterable: Iterable<T>, transform: (value: T) => U): Generator<U> {
  for (const value of iterable) {
    yield transform(value);
  }
}

function* filter<T>(iterable: Iterable<T>, predicate: (value: T) => boolean): Generator<T> {
  for (const value of iterable) {
    if (predicate(value)) {
      yield value;
    }
  }
}

function* take<T>(iterable: Iterable<T>, count: number): Generator<T> {
  let taken = 0;
  for (const value of iterable) {
    if (taken >= count) break;
    yield value;
    taken++;
  }
}

// 遅延評価チェーン - メモリ効率的
const result = Array.from(
  take(
    filter(
      map(range(1, 10000), x => x * x),
      x => x % 2 === 0
    ),
    5
  )
);

console.log(result); // [4, 16, 36, 64, 100]
```

### Stateパターン

Stateパターンは、オブジェクトの内部状態が変化したとき、オブジェクトの振る舞いを変えることを可能にする。

```typescript
type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderState {
  confirm(): void;
  process(): void;
  ship(): void;
  deliver(): void;
  cancel(): void;
  getStatus(): OrderStatus;
}

class Order {
  private state: OrderState;
  private history: Array<{ from: OrderStatus; to: OrderStatus; timestamp: Date }> = [];

  constructor() {
    this.state = new PendingState(this);
  }

  setState(state: OrderState): void {
    const from = this.state.getStatus();
    const to = state.getStatus();
    this.history.push({ from, to, timestamp: new Date() });
    this.state = state;
    console.log(`Order status changed: ${from} -> ${to}`);
  }

  confirm(): void { this.state.confirm(); }
  process(): void { this.state.process(); }
  ship(): void { this.state.ship(); }
  deliver(): void { this.state.deliver(); }
  cancel(): void { this.state.cancel(); }
  getStatus(): OrderStatus { return this.state.getStatus(); }
  getHistory(): typeof this.history { return [...this.history]; }
}

class PendingState implements OrderState {
  constructor(private order: Order) {}

  confirm(): void { this.order.setState(new ConfirmedState(this.order)); }
  process(): void { throw new Error('Cannot process an unconfirmed order'); }
  ship(): void { throw new Error('Cannot ship an unconfirmed order'); }
  deliver(): void { throw new Error('Cannot deliver an unconfirmed order'); }
  cancel(): void { this.order.setState(new CancelledState(this.order)); }
  getStatus(): OrderStatus { return 'pending'; }
}

class ConfirmedState implements OrderState {
  constructor(private order: Order) {}

  confirm(): void { throw new Error('Order is already confirmed'); }
  process(): void { this.order.setState(new ProcessingState(this.order)); }
  ship(): void { throw new Error('Cannot ship before processing'); }
  deliver(): void { throw new Error('Cannot deliver before shipping'); }
  cancel(): void { this.order.setState(new CancelledState(this.order)); }
  getStatus(): OrderStatus { return 'confirmed'; }
}

class ProcessingState implements OrderState {
  constructor(private order: Order) {}

  confirm(): void { throw new Error('Order is already confirmed'); }
  process(): void { throw new Error('Order is already processing'); }
  ship(): void { this.order.setState(new ShippedState(this.order)); }
  deliver(): void { throw new Error('Cannot deliver before shipping'); }
  cancel(): void { this.order.setState(new CancelledState(this.order)); }
  getStatus(): OrderStatus { return 'processing'; }
}

class ShippedState implements OrderState {
  constructor(private order: Order) {}

  confirm(): void { throw new Error('Order is already confirmed'); }
  process(): void { throw new Error('Order is already processed'); }
  ship(): void { throw new Error('Order is already shipped'); }
  deliver(): void { this.order.setState(new DeliveredState(this.order)); }
  cancel(): void { throw new Error('Cannot cancel a shipped order'); }
  getStatus(): OrderStatus { return 'shipped'; }
}

class DeliveredState implements OrderState {
  constructor(private order: Order) {}

  confirm(): void { throw new Error('Order is already delivered'); }
  process(): void { throw new Error('Order is already delivered'); }
  ship(): void { throw new Error('Order is already delivered'); }
  deliver(): void { throw new Error('Order is already delivered'); }
  cancel(): void { throw new Error('Cannot cancel a delivered order'); }
  getStatus(): OrderStatus { return 'delivered'; }
}

class CancelledState implements OrderState {
  constructor(private order: Order) {}

  confirm(): void { throw new Error('Cannot confirm a cancelled order'); }
  process(): void { throw new Error('Cannot process a cancelled order'); }
  ship(): void { throw new Error('Cannot ship a cancelled order'); }
  deliver(): void { throw new Error('Cannot deliver a cancelled order'); }
  cancel(): void { throw new Error('Order is already cancelled'); }
  getStatus(): OrderStatus { return 'cancelled'; }
}
```

---

## 関数型パターン（Functional Patterns）

JavaScript/TypeScriptの関数型プログラミングパターンは、コードの予測可能性と再利用性を高める。

### FunctorとMonad

FunctorとMonadは、文脈を持つ値を操作するための抽象的なパターンである。

```typescript
// Option/Maybe Monad - null安全な処理
class Option<T> {
  private constructor(private readonly value: T | null | undefined) {}

  static some<T>(value: T): Option<T> {
    return new Option(value);
  }

  static none<T>(): Option<T> {
    return new Option<T>(null);
  }

  static of<T>(value: T | null | undefined): Option<T> {
    return new Option(value);
  }

  isSome(): boolean {
    return this.value !== null && this.value !== undefined;
  }

  isNone(): boolean {
    return !this.isSome();
  }

  map<U>(fn: (value: T) => U): Option<U> {
    if (this.isNone()) return Option.none<U>();
    return Option.some(fn(this.value as T));
  }

  flatMap<U>(fn: (value: T) => Option<U>): Option<U> {
    if (this.isNone()) return Option.none<U>();
    return fn(this.value as T);
  }

  getOrElse(defaultValue: T): T {
    return this.isSome() ? (this.value as T) : defaultValue;
  }

  getOrThrow(errorMessage: string = 'Value is None'): T {
    if (this.isNone()) throw new Error(errorMessage);
    return this.value as T;
  }

  filter(predicate: (value: T) => boolean): Option<T> {
    if (this.isNone()) return Option.none<T>();
    return predicate(this.value as T) ? this : Option.none<T>();
  }
}

// Result Monad - エラー処理
type ResultValue<T, E> = { ok: true; value: T } | { ok: false; error: E };

class Result<T, E = Error> {
  private constructor(private readonly result: ResultValue<T, E>) {}

  static ok<T, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>({ ok: true, value });
  }

  static err<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>({ ok: false, error });
  }

  isOk(): boolean { return this.result.ok; }
  isErr(): boolean { return !this.result.ok; }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (!this.result.ok) return Result.err<U, E>(this.result.error);
    return Result.ok(fn(this.result.value));
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (!this.result.ok) return Result.err<U, E>(this.result.error);
    return fn(this.result.value);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this.result.ok) return Result.ok<T, F>(this.result.value);
    return Result.err(fn(this.result.error));
  }

  getOrElse(defaultValue: T): T {
    return this.result.ok ? this.result.value : defaultValue;
  }

  unwrap(): T {
    if (!this.result.ok) throw this.result.error;
    return this.result.value;
  }
}

// 使用例: ユーザー認証フロー
interface AuthUser { id: string; email: string; role: string; }

function validateEmail(email: string): Result<string, string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email)
    ? Result.ok(email)
    : Result.err('Invalid email format');
}

function findUser(email: string): Result<AuthUser, string> {
  const users: AuthUser[] = [
    { id: '1', email: 'admin@example.com', role: 'admin' },
  ];
  const user = users.find(u => u.email === email);
  return user ? Result.ok(user) : Result.err('User not found');
}

function checkPermission(user: AuthUser, resource: string): Result<AuthUser, string> {
  if (user.role === 'admin') return Result.ok(user);
  return Result.err(`User ${user.email} lacks permission to access ${resource}`);
}

// モナドチェーンで認証フローを構築
function authenticate(email: string, resource: string): Result<AuthUser, string> {
  return validateEmail(email)
    .flatMap(validEmail => findUser(validEmail))
    .flatMap(user => checkPermission(user, resource));
}

const authResult = authenticate('admin@example.com', 'admin-panel');
if (authResult.isOk()) {
  console.log('Access granted:', authResult.unwrap());
} else {
  console.log('Access denied');
}
```

### CurryingとPartial Application

```typescript
// 汎用カリー化関数
type Curry<F extends (...args: unknown[]) => unknown> = F extends (
  ...args: infer Args
) => infer Return
  ? Args extends [infer First, ...infer Rest]
    ? (arg: First) => Rest extends []
      ? Return
      : Curry<(...args: Rest) => Return>
    : Return
  : never;

function curry<T extends (...args: unknown[]) => unknown>(fn: T): Curry<T> {
  const arity = fn.length;
  return function curried(...args: unknown[]): unknown {
    if (args.length >= arity) {
      return fn(...args);
    }
    return (...moreArgs: unknown[]) => curried(...args, ...moreArgs);
  } as Curry<T>;
}

// 実践的なカリー化の例
const add = curry((a: number, b: number, c: number) => a + b + c);
const add5 = add(5);
const add5and3 = add5(3);
console.log(add5and3(2)); // 10

// HTTP APIリクエストビルダー
const createRequest = curry((
  baseUrl: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: unknown
) => ({
  url: `${baseUrl}${endpoint}`,
  method,
  body: data ? JSON.stringify(data) : undefined,
}));

const apiRequest = createRequest('https://api.example.com');
const getRequest = apiRequest('GET');
const postRequest = apiRequest('POST');

const getUsersRequest = getRequest('/users');
const createUserRequest = postRequest('/users');

console.log(getUsersRequest);
// { url: 'https://api.example.com/users', method: 'GET' }
```

### Function Composition

```typescript
// 関数合成ユーティリティ
function compose<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
  return (value: T) => fns.reduceRight((acc, fn) => fn(acc), value);
}

function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
  return (value: T) => fns.reduce((acc, fn) => fn(acc), value);
}

// 文字列変換パイプライン
const trim = (str: string): string => str.trim();
const toLowerCase = (str: string): string => str.toLowerCase();
const replaceSpaces = (str: string): string => str.replace(/\s+/g, '-');
const removeSpecialChars = (str: string): string => str.replace(/[^a-z0-9-]/g, '');

const toSlug = pipe(trim, toLowerCase, replaceSpaces, removeSpecialChars);

console.log(toSlug('  Hello, World! This is a Test  '));
// hello-world-this-is-a-test

// データ変換パイプライン
interface RawUser { name: string; age: string; email: string; }
interface ProcessedUser { name: string; age: number; email: string; isAdult: boolean; }

const parseAge = (user: RawUser): RawUser & { parsedAge: number } => ({
  ...user,
  parsedAge: parseInt(user.age),
});

const validateUser = (user: RawUser): RawUser => {
  if (!user.email.includes('@')) throw new Error('Invalid email');
  return user;
};

const transformToProcessed = (user: RawUser & { parsedAge?: number }): ProcessedUser => ({
  name: user.name,
  age: user.parsedAge ?? parseInt(user.age),
  email: user.email.toLowerCase(),
  isAdult: (user.parsedAge ?? parseInt(user.age)) >= 18,
});
```

---

## Reactコンポーネントパターン

### Higher-Order Component（HOC）

HOCはコンポーネントを受け取り、拡張されたコンポーネントを返す関数である。

```typescript
import React, { ComponentType, useState, useEffect } from 'react';

// ローディング状態を付加するHOC
interface WithLoadingProps {
  isLoading?: boolean;
}

function withLoading<P extends object>(
  WrappedComponent: ComponentType<P>
): ComponentType<P & WithLoadingProps> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function WithLoadingComponent({
    isLoading,
    ...props
  }: P & WithLoadingProps) {
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="spinner" aria-label="Loading..." />
        </div>
      );
    }
    return <WrappedComponent {...(props as P)} />;
  }

  WithLoadingComponent.displayName = `withLoading(${displayName})`;
  return WithLoadingComponent;
}

// 認証保護HOC
interface WithAuthProps {
  redirectTo?: string;
}

function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>
): ComponentType<P & WithAuthProps> {
  function WithAuthComponent({ redirectTo = '/login', ...props }: P & WithAuthProps) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
      const token = localStorage.getItem('auth_token');
      setIsAuthenticated(!!token);
    }, []);

    if (isAuthenticated === null) {
      return <div>Checking authentication...</div>;
    }

    if (!isAuthenticated) {
      window.location.href = redirectTo;
      return null;
    }

    return <WrappedComponent {...(props as P)} />;
  }

  return WithAuthComponent;
}

// 使用例
const UserDashboard: React.FC<{ userId: string }> = ({ userId }) => (
  <div>Dashboard for {userId}</div>
);

const ProtectedDashboard = withAuth(withLoading(UserDashboard));
```

### Render PropsパターンとCustom Hooks

```typescript
// Render Propsを使ったデータフェッチャー
interface FetchRenderProps<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface DataFetcherProps<T> {
  url: string;
  children: (props: FetchRenderProps<T>) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: true, error: null });

  const fetchData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(url);
      const data = await response.json();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  };

  useEffect(() => { fetchData(); }, [url]);

  return <>{children({ ...state, refetch: fetchData })}</>;
}

// Custom Hooks - Render Propsの現代的な代替
function useDataFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [url]);

  return { data, loading, error, refetch: fetchData };
}

// 高度なCustom Hook: useLocalStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving to localStorage:`, error);
    }
  };

  return [storedValue, setValue];
}
```

### Compound Componentsパターン

Compound Componentsは、暗黙的な状態共有を通じて複数のコンポーネントが連携して動作するパターンである。

```typescript
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function useTabs(): TabsContextType {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within a Tabs component');
  }
  return context;
}

interface TabsProps {
  defaultTab: string;
  children: ReactNode;
  onChange?: (tab: string) => void;
}

function Tabs({ defaultTab, children, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

interface TabListProps { children: ReactNode; }

function TabList({ children }: TabListProps) {
  return <div className="tab-list" role="tablist">{children}</div>;
}

interface TabProps { id: string; children: ReactNode; disabled?: boolean; }

function Tab({ id, children, disabled = false }: TabProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      className={`tab ${isActive ? 'tab--active' : ''} ${disabled ? 'tab--disabled' : ''}`}
      onClick={() => !disabled && setActiveTab(id)}
    >
      {children}
    </button>
  );
}

interface TabPanelProps { id: string; children: ReactNode; }

function TabPanel({ id, children }: TabPanelProps) {
  const { activeTab } = useTabs();
  if (activeTab !== id) return null;
  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  );
}

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// 使用例
function App() {
  return (
    <Tabs defaultTab="overview" onChange={tab => console.log('Active tab:', tab)}>
      <Tabs.List>
        <Tabs.Tab id="overview">概要</Tabs.Tab>
        <Tabs.Tab id="settings">設定</Tabs.Tab>
        <Tabs.Tab id="advanced" disabled>高度な設定</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel id="overview">概要コンテンツ</Tabs.Panel>
      <Tabs.Panel id="settings">設定コンテンツ</Tabs.Panel>
    </Tabs>
  );
}
```

---

## SOLID原則（TypeScript実装）

### 単一責任原則（SRP）

一つのクラスは一つのことだけに責任を持つべきである。

```typescript
// 悪い例: 複数の責任を持つクラス
class UserManager_BAD {
  createUser(data: unknown): unknown { /* ユーザー作成 */ return data; }
  sendWelcomeEmail(email: string): void { /* メール送信 */ }
  logUserActivity(userId: string): void { /* ログ記録 */ }
  generateReport(): string { /* レポート生成 */ return ''; }
}

// 良い例: 責任を分離したクラス群
class UserRepository {
  async create(data: Omit<User, 'id'>): Promise<User> {
    // データベースへの保存のみ
    const user: User = { ...data, id: Math.random() };
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return null; // DBから取得
  }
}

class EmailService {
  async sendWelcomeEmail(user: User): Promise<void> {
    console.log(`Sending welcome email to ${user.email}`);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    console.log(`Sending password reset to ${email}`);
  }
}

class ActivityLogger {
  log(userId: string, action: string, metadata?: Record<string, unknown>): void {
    console.log(`[${new Date().toISOString()}] User ${userId}: ${action}`, metadata);
  }
}

class UserReportGenerator {
  async generateMonthlyReport(month: Date): Promise<string> {
    return `Monthly report for ${month.toISOString()}`;
  }
}

// UserServiceはこれらを組み合わせるオーケストレーター
class UserService {
  constructor(
    private repository: UserRepository,
    private emailService: EmailService,
    private logger: ActivityLogger
  ) {}

  async registerUser(data: Omit<User, 'id'>): Promise<User> {
    const user = await this.repository.create(data);
    await this.emailService.sendWelcomeEmail(user);
    this.logger.log(user.id.toString(), 'user_registered');
    return user;
  }
}
```

### 開放・閉鎖原則（OCP）

クラスは拡張に対して開いており、修正に対して閉じているべきである。

```typescript
// 悪い例: 新しい割引タイプを追加するたびにクラスを修正
class PriceCalculator_BAD {
  calculate(price: number, discountType: string): number {
    if (discountType === 'none') return price;
    if (discountType === 'student') return price * 0.8;
    if (discountType === 'senior') return price * 0.7;
    // 新しい割引タイプが追加されるたびにここを修正する必要がある
    return price;
  }
}

// 良い例: 新しい割引タイプはクラスを追加するだけ
interface DiscountStrategy {
  apply(price: number): number;
  getName(): string;
}

class NoDiscount implements DiscountStrategy {
  apply(price: number): number { return price; }
  getName(): string { return 'none'; }
}

class StudentDiscount implements DiscountStrategy {
  constructor(private discountRate: number = 0.2) {}
  apply(price: number): number { return price * (1 - this.discountRate); }
  getName(): string { return 'student'; }
}

class SeniorDiscount implements DiscountStrategy {
  apply(price: number): number { return price * 0.7; }
  getName(): string { return 'senior'; }
}

class BulkDiscount implements DiscountStrategy {
  constructor(private threshold: number, private discountRate: number) {}

  apply(price: number): number {
    return price >= this.threshold ? price * (1 - this.discountRate) : price;
  }

  getName(): string { return `bulk(${this.threshold})`; }
}

class PriceCalculator {
  private discounts = new Map<string, DiscountStrategy>();

  registerDiscount(strategy: DiscountStrategy): void {
    this.discounts.set(strategy.getName(), strategy);
  }

  calculate(price: number, discountName: string): number {
    const strategy = this.discounts.get(discountName) ?? new NoDiscount();
    return strategy.apply(price);
  }
}
```

### リスコフ置換原則（LSP）

派生クラスは基底クラスを置き換えられる必要がある。

```typescript
abstract class Shape {
  abstract area(): number;
  abstract perimeter(): number;

  describe(): string {
    return `Area: ${this.area()}, Perimeter: ${this.perimeter()}`;
  }
}

class Rectangle extends Shape {
  constructor(protected width: number, protected height: number) {
    super();
  }

  area(): number { return this.width * this.height; }
  perimeter(): number { return 2 * (this.width + this.height); }

  setWidth(width: number): void { this.width = width; }
  setHeight(height: number): void { this.height = height; }
}

class Square extends Shape {
  constructor(private side: number) {
    super();
  }

  area(): number { return this.side * this.side; }
  perimeter(): number { return 4 * this.side; }
  setSide(side: number): void { this.side = side; }
}

// Squareは正方形専用のクラスとして独立させる（RectangleのサブクラスにしないことでLSPを遵守）
function printShapeInfo(shape: Shape): void {
  console.log(shape.describe());
}

// 全てのShapeサブクラスでこの関数が正常に動作する
printShapeInfo(new Rectangle(5, 3));
printShapeInfo(new Square(4));
```

### インターフェース分離原則（ISP）と依存逆転原則（DIP）

```typescript
// ISP: 大きなインターフェースを分割
interface Readable {
  read(id: string): Promise<unknown>;
  readAll(): Promise<unknown[]>;
}

interface Writable {
  create(data: unknown): Promise<unknown>;
  update(id: string, data: unknown): Promise<unknown>;
}

interface Deletable {
  delete(id: string): Promise<boolean>;
}

// 読み取り専用リポジトリ
interface ReadOnlyRepository<T> extends Readable {}

// フルCRUDリポジトリ
interface Repository<T> extends Readable, Writable, Deletable {}

// DIP: 高レベルモジュールが低レベルモジュールに依存しない
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  create(data: Omit<User, 'id'>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

// 高レベルモジュール（インターフェースに依存）
class UserApplicationService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getUserProfile(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }
}

// 低レベルモジュール（インターフェースを実装）
class PostgresUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return null; // PostgreSQL実装
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    return { ...data, id: 1 };
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    return null;
  }

  async delete(id: string): Promise<boolean> {
    return true;
  }
}

// テスト用モック（同じインターフェースを実装）
class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id.toString() === id) ?? null;
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    const user: User = { ...data, id: this.users.length + 1 };
    this.users.push(user);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex(u => u.id.toString() === id);
    if (index === -1) return null;
    this.users[index] = { ...this.users[index], ...data };
    return this.users[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.users.findIndex(u => u.id.toString() === id);
    if (index === -1) return false;
    this.users.splice(index, 1);
    return true;
  }
}
```

---

## DIコンテナ（InversifyとTsyringe）

DIコンテナはDIPを自動化し、依存関係の解決を一元管理する。

### Inversifyを使ったDI実装

```typescript
// tsconfig.json で "experimentalDecorators": true, "emitDecoratorMetadata": true が必要
import 'reflect-metadata';
import { Container, injectable, inject } from 'inversify';

// シンボル定義（依存関係のキー）
const TYPES = {
  IUserRepository: Symbol('IUserRepository'),
  IEmailService: Symbol('IEmailService'),
  ILogger: Symbol('ILogger'),
  UserService: Symbol('UserService'),
} as const;

// サービス定義
@injectable()
class ConsoleLogger {
  log(message: string): void {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

@injectable()
class ProductionEmailService {
  @inject(TYPES.ILogger) private logger!: ConsoleLogger;

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`Sending email to ${to}: ${subject}`);
    // SMTP送信実装
  }
}

@injectable()
class UserServiceImpl {
  constructor(
    @inject(TYPES.IUserRepository) private userRepo: IUserRepository,
    @inject(TYPES.IEmailService) private emailService: ProductionEmailService,
    @inject(TYPES.ILogger) private logger: ConsoleLogger
  ) {}

  async registerUser(data: Omit<User, 'id'>): Promise<User> {
    this.logger.log(`Registering user: ${data.email}`);
    const user = await this.userRepo.create(data);
    await this.emailService.sendEmail(
      user.email,
      'Welcome!',
      'Thanks for registering.'
    );
    return user;
  }
}

// コンテナ設定
const container = new Container();

container.bind<ConsoleLogger>(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
container.bind<IUserRepository>(TYPES.IUserRepository).to(PostgresUserRepository).inRequestScope();
container.bind<ProductionEmailService>(TYPES.IEmailService).to(ProductionEmailService).inTransientScope();
container.bind<UserServiceImpl>(TYPES.UserService).to(UserServiceImpl);

// 解決
const userService = container.get<UserServiceImpl>(TYPES.UserService);
```

---

## Repository Pattern（データアクセス抽象化）

Repositoryパターンはデータアクセスロジックをビジネスロジックから分離し、テスタビリティを向上させる。

```typescript
// ジェネリックなリポジトリインターフェース
interface BaseRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(options?: QueryOptions_): Promise<{ data: T[]; total: number }>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
  exists(id: ID): Promise<boolean>;
}

interface QueryOptions_ {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

// 具体的なエンティティと実装
interface Article {
  id: string;
  title: string;
  content: string;
  authorId: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ArticleRepository extends BaseRepository<Article> {
  findByAuthor(authorId: string): Promise<Article[]>;
  findByStatus(status: Article['status']): Promise<Article[]>;
  findByTags(tags: string[]): Promise<Article[]>;
  publish(id: string): Promise<Article | null>;
}

class PostgresArticleRepository implements ArticleRepository {
  // TODO: 実際の実装ではORMや直接SQLを使用

  async findById(id: string): Promise<Article | null> {
    // SELECT * FROM articles WHERE id = $1
    return null;
  }

  async findAll(options: QueryOptions_ = {}): Promise<{ data: Article[]; total: number }> {
    const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    // SELECT *, COUNT(*) OVER() as total FROM articles ORDER BY ... LIMIT ... OFFSET ...
    return { data: [], total: 0 };
  }

  async create(data: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>): Promise<Article> {
    const now = new Date();
    return {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(id: string, data: Partial<Article>): Promise<Article | null> {
    return null;
  }

  async delete(id: string): Promise<boolean> {
    return true;
  }

  async exists(id: string): Promise<boolean> {
    return false;
  }

  async findByAuthor(authorId: string): Promise<Article[]> {
    return [];
  }

  async findByStatus(status: Article['status']): Promise<Article[]> {
    return [];
  }

  async findByTags(tags: string[]): Promise<Article[]> {
    return [];
  }

  async publish(id: string): Promise<Article | null> {
    return this.update(id, { status: 'published' });
  }
}
```

---

## Event SourcingとCQRS

### Event Sourcing実装

Event Sourcingは状態をイベントの系列として保存するパターンである。

```typescript
// イベント基底クラス
interface DomainEvent {
  readonly id: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly version: number;
}

// 具体的なイベント
interface AccountCreatedEvent extends DomainEvent {
  eventType: 'AccountCreated';
  payload: { ownerId: string; initialBalance: number; currency: string };
}

interface MoneyDepositedEvent extends DomainEvent {
  eventType: 'MoneyDeposited';
  payload: { amount: number; description: string };
}

interface MoneyWithdrawnEvent extends DomainEvent {
  eventType: 'MoneyWithdrawn';
  payload: { amount: number; description: string };
}

type BankAccountEvent = AccountCreatedEvent | MoneyDepositedEvent | MoneyWithdrawnEvent;

// 集約（Aggregate）
class BankAccount {
  private _id: string = '';
  private _balance: number = 0;
  private _currency: string = 'JPY';
  private _ownerId: string = '';
  private _version: number = 0;
  private _uncommittedEvents: BankAccountEvent[] = [];

  private constructor() {}

  static create(id: string, ownerId: string, initialBalance: number, currency: string): BankAccount {
    const account = new BankAccount();
    account.apply({
      id: crypto.randomUUID(),
      aggregateId: id,
      eventType: 'AccountCreated',
      occurredAt: new Date(),
      version: 1,
      payload: { ownerId, initialBalance, currency },
    } as AccountCreatedEvent);
    return account;
  }

  static rehydrate(events: BankAccountEvent[]): BankAccount {
    const account = new BankAccount();
    events.forEach(event => account.applyEvent(event, false));
    return account;
  }

  deposit(amount: number, description: string): void {
    if (amount <= 0) throw new Error('Deposit amount must be positive');
    this.apply({
      id: crypto.randomUUID(),
      aggregateId: this._id,
      eventType: 'MoneyDeposited',
      occurredAt: new Date(),
      version: this._version + 1,
      payload: { amount, description },
    } as MoneyDepositedEvent);
  }

  withdraw(amount: number, description: string): void {
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');
    if (amount > this._balance) throw new Error('Insufficient funds');
    this.apply({
      id: crypto.randomUUID(),
      aggregateId: this._id,
      eventType: 'MoneyWithdrawn',
      occurredAt: new Date(),
      version: this._version + 1,
      payload: { amount, description },
    } as MoneyWithdrawnEvent);
  }

  private apply(event: BankAccountEvent): void {
    this.applyEvent(event, true);
  }

  private applyEvent(event: BankAccountEvent, isNew: boolean): void {
    switch (event.eventType) {
      case 'AccountCreated':
        this._id = event.aggregateId;
        this._balance = event.payload.initialBalance;
        this._currency = event.payload.currency;
        this._ownerId = event.payload.ownerId;
        break;
      case 'MoneyDeposited':
        this._balance += event.payload.amount;
        break;
      case 'MoneyWithdrawn':
        this._balance -= event.payload.amount;
        break;
    }
    this._version = event.version;
    if (isNew) this._uncommittedEvents.push(event);
  }

  getUncommittedEvents(): BankAccountEvent[] {
    return [...this._uncommittedEvents];
  }

  clearUncommittedEvents(): void {
    this._uncommittedEvents = [];
  }

  get id(): string { return this._id; }
  get balance(): number { return this._balance; }
  get currency(): string { return this._currency; }
  get version(): number { return this._version; }
}

// イベントストア
class EventStore {
  private events = new Map<string, BankAccountEvent[]>();

  async append(aggregateId: string, events: BankAccountEvent[], expectedVersion: number): Promise<void> {
    const existing = this.events.get(aggregateId) ?? [];
    const currentVersion = existing.length > 0 ? existing[existing.length - 1].version : 0;

    if (currentVersion !== expectedVersion) {
      throw new Error(`Concurrency conflict: expected version ${expectedVersion}, got ${currentVersion}`);
    }

    this.events.set(aggregateId, [...existing, ...events]);
  }

  async getEvents(aggregateId: string, fromVersion?: number): Promise<BankAccountEvent[]> {
    const all = this.events.get(aggregateId) ?? [];
    return fromVersion ? all.filter(e => e.version >= fromVersion) : all;
  }
}
```

### CQRSパターン

```typescript
// コマンド側（書き込み）
interface Command_ {
  readonly commandId: string;
  readonly issuedAt: Date;
}

interface CreateUserCommand extends Command_ {
  readonly name: string;
  readonly email: string;
  readonly role: string;
}

interface UpdateUserEmailCommand extends Command_ {
  readonly userId: string;
  readonly newEmail: string;
}

// クエリ側（読み取り）
interface Query_ {
  readonly queryId: string;
}

interface GetUserByIdQuery extends Query_ {
  readonly userId: string;
}

interface ListUsersQuery extends Query_ {
  readonly page: number;
  readonly pageSize: number;
  readonly filterByRole?: string;
}

// コマンドハンドラー
interface CommandHandler<TCommand extends Command_> {
  handle(command: TCommand): Promise<void>;
}

class CreateUserCommandHandler implements CommandHandler<CreateUserCommand> {
  constructor(private repository: IUserRepository) {}

  async handle(command: CreateUserCommand): Promise<void> {
    const existingUser = await this.repository.findByEmail(command.email);
    if (existingUser) {
      throw new Error(`User with email ${command.email} already exists`);
    }

    await this.repository.create({
      name: command.name,
      email: command.email,
      role: command.role,
    });
  }
}

// クエリハンドラー（読み取り専用のReadModelを使用）
interface UserReadModel {
  id: string;
  name: string;
  email: string;
  role: string;
  articleCount: number;
  lastLoginAt: Date | null;
}

interface QueryHandler<TQuery extends Query_, TResult> {
  handle(query: TQuery): Promise<TResult>;
}

class GetUserByIdQueryHandler implements QueryHandler<GetUserByIdQuery, UserReadModel | null> {
  constructor(private readDb: ReadDatabase) {}

  async handle(query: GetUserByIdQuery): Promise<UserReadModel | null> {
    // 読み取り最適化されたDBから直接取得
    return this.readDb.query(
      'SELECT u.*, COUNT(a.id) as article_count FROM users u LEFT JOIN articles a ON u.id = a.author_id WHERE u.id = $1 GROUP BY u.id',
      [query.userId]
    );
  }
}

// コマンドバス・クエリバス
type ReadDatabase = { query: (sql: string, params: unknown[]) => Promise<UserReadModel | null> };

class CommandBus {
  private handlers = new Map<string, CommandHandler<Command_>>();

  register<T extends Command_>(commandType: string, handler: CommandHandler<T>): void {
    this.handlers.set(commandType, handler as CommandHandler<Command_>);
  }

  async dispatch<T extends Command_>(command: T): Promise<void> {
    const handler = this.handlers.get(command.constructor.name);
    if (!handler) throw new Error(`No handler for ${command.constructor.name}`);
    await handler.handle(command);
  }
}
```

---

## Clean Architecture（TypeScript実装）

Clean Architectureは関心事を層に分離し、内側の層が外側の層に依存しないようにする。

```typescript
// エンティティ層（最内側 - ビジネスルールのみ）
class UserEntity {
  private constructor(
    private readonly _id: string,
    private _name: string,
    private _email: string,
    private readonly _createdAt: Date
  ) {}

  static create(name: string, email: string): UserEntity {
    if (!name || name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }
    return new UserEntity(
      crypto.randomUUID(),
      name.trim(),
      email.toLowerCase(),
      new Date()
    );
  }

  static reconstruct(id: string, name: string, email: string, createdAt: Date): UserEntity {
    return new UserEntity(id, name, email, createdAt);
  }

  changeName(newName: string): void {
    if (!newName || newName.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
    this._name = newName.trim();
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get email(): string { return this._email; }
  get createdAt(): Date { return this._createdAt; }
}

// ユースケース層（アプリケーションロジック）
interface UserGateway {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  save(user: UserEntity): Promise<void>;
  delete(id: string): Promise<void>;
}

interface RegisterUserInput {
  name: string;
  email: string;
}

interface RegisterUserOutput {
  userId: string;
  name: string;
  email: string;
}

class RegisterUserUseCase {
  constructor(
    private readonly userGateway: UserGateway,
    private readonly eventEmitter: TypedEventEmitter<UserEvents>
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const existing = await this.userGateway.findByEmail(input.email);
    if (existing) {
      throw new Error(`Email ${input.email} is already registered`);
    }

    const user = UserEntity.create(input.name, input.email);
    await this.userGateway.save(user);

    await this.eventEmitter.emit('user:login', {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    });

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
    };
  }
}

// インターフェースアダプター層（コントローラー・プレゼンター）
class UserController {
  constructor(private registerUserUseCase: RegisterUserUseCase) {}

  async register(req: { body: { name: string; email: string } }): Promise<{
    status: number;
    body: unknown;
  }> {
    try {
      const result = await this.registerUserUseCase.execute({
        name: req.body.name,
        email: req.body.email,
      });

      return {
        status: 201,
        body: {
          success: true,
          data: result,
        },
      };
    } catch (error) {
      return {
        status: 400,
        body: {
          success: false,
          error: (error as Error).message,
        },
      };
    }
  }
}
```

---

## Domain-Driven Design基礎

DDDはビジネスドメインを中心にソフトウェアを設計するアプローチである。

```typescript
// 値オブジェクト（Value Object）- 同一性はなく値で比較
class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string
  ) {
    if (amount < 0) throw new Error('Money amount cannot be negative');
    if (!currency || currency.length !== 3) throw new Error('Invalid currency code');
  }

  static of(amount: number, currency: string): Money {
    return new Money(Math.round(amount * 100) / 100, currency.toUpperCase());
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (this.amount < other.amount) throw new Error('Insufficient funds');
    return Money.of(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return Money.of(this.amount * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  get value(): number { return this.amount; }
  get currencyCode(): string { return this.currency; }
}

// エンティティ（Entity）- IDで同一性を判断
class OrderId {
  private constructor(private readonly value: string) {}

  static generate(): OrderId {
    return new OrderId(`ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`);
  }

  static fromString(value: string): OrderId {
    if (!value.startsWith('ORD-')) throw new Error('Invalid order ID format');
    return new OrderId(value);
  }

  equals(other: OrderId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}

// ドメインサービス（Domain Service）
class PricingService {
  calculateOrderTotal(
    items: Array<{ unitPrice: Money; quantity: number }>,
    discountPercentage: number = 0
  ): Money {
    const subtotal = items.reduce(
      (total, item) => total.add(item.unitPrice.multiply(item.quantity)),
      Money.of(0, 'JPY')
    );

    if (discountPercentage > 0) {
      const discountMultiplier = 1 - (discountPercentage / 100);
      return subtotal.multiply(discountMultiplier);
    }

    return subtotal;
  }
}
```

---

## アンチパターン（避けるべき設計）

優れた設計を理解するためには、避けるべきアンチパターンも知っておく必要がある。

### God Object（神クラス）

```typescript
// アンチパターン: 何でも知っている神クラス
class Application_BAD {
  // ユーザー管理
  createUser(): void { /* */ }
  deleteUser(): void { /* */ }
  authenticateUser(): void { /* */ }

  // 注文管理
  createOrder(): void { /* */ }
  processPayment(): void { /* */ }
  sendInvoice(): void { /* */ }

  // レポート生成
  generateSalesReport(): void { /* */ }
  generateUserReport(): void { /* */ }

  // インフラ管理
  sendEmail(): void { /* */ }
  uploadFile(): void { /* */ }
  connectToDatabase(): void { /* */ }
}

// 良い設計: 単一責任を持つサービス群に分割
// UserService, OrderService, ReportService, InfrastructureService...
```

### Magic Numbers（マジックナンバー）

```typescript
// アンチパターン
function calculateDiscount(price: number, userType: number): number {
  if (userType === 1) return price * 0.1;
  if (userType === 2) return price * 0.2;
  if (userType === 3) return price * 0.35;
  return 0;
}

// 良い設計: 意味のある定数と型を使用
enum UserType {
  Regular = 'regular',
  Premium = 'premium',
  VIP = 'vip',
}

const DISCOUNT_RATES: Record<UserType, number> = {
  [UserType.Regular]: 0.1,
  [UserType.Premium]: 0.2,
  [UserType.VIP]: 0.35,
};

function calculateDiscountGood(price: number, userType: UserType): number {
  const rate = DISCOUNT_RATES[userType] ?? 0;
  return price * rate;
}
```

### Callback Hell（コールバック地獄）

```typescript
// アンチパターン: 深くネストされたコールバック
function getUserData_BAD(userId: string) {
  fetchUser(userId, (user, err) => {
    if (err) { handleError(err); return; }
    fetchOrders(user.id, (orders, err2) => {
      if (err2) { handleError(err2); return; }
      fetchPayments(orders[0].id, (payments, err3) => {
        if (err3) { handleError(err3); return; }
        // さらに深くなる...
      });
    });
  });
}

// 良い設計: async/awaitとエラーハンドリング
async function getUserDataGood(userId: string) {
  try {
    const user = await fetchUser(userId);
    const orders = await fetchOrders(user.id);
    if (orders.length === 0) return { user, orders: [], payments: [] };
    const payments = await fetchPayments(orders[0].id);
    return { user, orders, payments };
  } catch (error) {
    handleError(error);
    throw error;
  }
}
```

### Premature Optimization（早すぎる最適化）

設計段階での過度な最適化は、コードの可読性と保守性を著しく低下させる。まず明確で正確なコードを書き、プロファイリングで実際のボトルネックを特定してから最適化する。

---

## リファクタリング実践（パターン適用例）

### ベタ書きコードへのStrategyパターン適用

```typescript
// リファクタリング前: 条件分岐が増えるたびに修正が必要
async function exportData_BEFORE(data: unknown[], format: string): Promise<Buffer> {
  if (format === 'csv') {
    const lines = (data as Record<string, unknown>[]).map(row =>
      Object.values(row).join(',')
    );
    return Buffer.from(lines.join('\n'));
  } else if (format === 'json') {
    return Buffer.from(JSON.stringify(data, null, 2));
  } else if (format === 'xml') {
    // XML変換ロジック
    return Buffer.from('<data></data>');
  }
  throw new Error(`Unsupported format: ${format}`);
}

// リファクタリング後: Strategyパターンを適用
interface ExportStrategy {
  export(data: unknown[]): Buffer;
  getMimeType(): string;
  getExtension(): string;
}

class CsvExportStrategy implements ExportStrategy {
  export(data: Record<string, unknown>[]): Buffer {
    if (data.length === 0) return Buffer.from('');
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(','));
    return Buffer.from([headers, ...rows].join('\n'));
  }

  getMimeType(): string { return 'text/csv'; }
  getExtension(): string { return 'csv'; }
}

class JsonExportStrategy implements ExportStrategy {
  export(data: unknown[]): Buffer {
    return Buffer.from(JSON.stringify(data, null, 2));
  }

  getMimeType(): string { return 'application/json'; }
  getExtension(): string { return 'json'; }
}

class DataExporter {
  private strategies = new Map<string, ExportStrategy>();

  register(format: string, strategy: ExportStrategy): void {
    this.strategies.set(format, strategy);
  }

  async export(data: unknown[], format: string): Promise<{
    buffer: Buffer;
    mimeType: string;
    filename: string;
  }> {
    const strategy = this.strategies.get(format);
    if (!strategy) throw new Error(`Unsupported format: ${format}`);

    return {
      buffer: strategy.export(data as Record<string, unknown>[]),
      mimeType: strategy.getMimeType(),
      filename: `export-${Date.now()}.${strategy.getExtension()}`,
    };
  }
}

const exporter = new DataExporter();
exporter.register('csv', new CsvExportStrategy());
exporter.register('json', new JsonExportStrategy());

// 新しいフォーマットを追加しても既存コードを変更しない
class XmlExportStrategy implements ExportStrategy {
  export(data: unknown[]): Buffer {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<data>${JSON.stringify(data)}</data>`;
    return Buffer.from(xml);
  }

  getMimeType(): string { return 'application/xml'; }
  getExtension(): string { return 'xml'; }
}

exporter.register('xml', new XmlExportStrategy());
```

### ネストされた条件をガード節でリファクタリング

```typescript
// リファクタリング前: 深いネスト
function processOrder_BEFORE(order: unknown): string {
  if (order) {
    const o = order as Record<string, unknown>;
    if (o.status === 'pending') {
      if (o.items && (o.items as unknown[]).length > 0) {
        if (o.payment) {
          if ((o.payment as Record<string, unknown>).verified) {
            return 'Processing order...';
          } else {
            return 'Payment not verified';
          }
        } else {
          return 'No payment information';
        }
      } else {
        return 'Empty order';
      }
    } else {
      return 'Order is not pending';
    }
  } else {
    return 'No order provided';
  }
}

// リファクタリング後: ガード節で早期リターン
interface Order_ {
  status: string;
  items: unknown[];
  payment?: { verified: boolean };
}

function processOrder(order: Order_ | null): string {
  if (!order) return 'No order provided';
  if (order.status !== 'pending') return 'Order is not pending';
  if (!order.items || order.items.length === 0) return 'Empty order';
  if (!order.payment) return 'No payment information';
  if (!order.payment.verified) return 'Payment not verified';

  return 'Processing order...';
}
```

---

## まとめと次のステップ

本記事では、JavaScript・TypeScriptにおける主要なデザインパターンを網羅的に解説した。

### 学習の優先順位

**初級開発者が優先すべきパターン**:
1. Singleton（設定・接続管理）
2. Observer（イベント駆動開発）
3. Strategy（アルゴリズムの差し替え）
4. Builder（複雑なオブジェクト構築）
5. Decorator（機能の動的追加）

**中級開発者が習得すべきパターン**:
1. SOLID原則全般
2. Repository Pattern
3. Factory Method
4. Command（Undo/Redo機能）
5. Compound Components（React）

**上級開発者が理解すべき設計**:
1. Clean Architecture
2. Event Sourcing + CQRS
3. Domain-Driven Design
4. Monad（Option・Result）
5. DIコンテナ（Inversify）

### 実践での適用指針

デザインパターンは問題解決のためのツールであり、目的ではない。以下の原則を忘れないこと。

- **YAGNI（You Aren't Gonna Need It）**: 現時点で不要な抽象化は導入しない
- **KISS（Keep It Simple, Stupid）**: シンプルさを常に優先する
- **DRY（Don't Repeat Yourself）**: 重複を避けるが、不適切な抽象化も避ける
- **パターンは会話のツール**: チームメンバーとの設計議論でパターン名を活用する

### 開発ツールの活用

効率的なTypeScript開発には適切なツールの活用が欠かせない。[DevToolBox](https://usedevtools.com)は開発者向けのオンラインツール集であり、JSON整形・Base64エンコード・正規表現テスト・JWT解析・UNIX時間変換など、日常的な開発作業で頻繁に必要となるユーティリティをブラウザ上で即座に利用できる。インストール不要で使え、TypeScript開発中に型定義の確認や設定ファイルの整形など様々な場面で活躍する。ブックマークしておくと作業効率が向上する。

デザインパターンの習得は一朝一夕にはいかないが、本記事のコード例を実際に手元で実装・変更しながら学ぶことで、パターンが解決する問題とその効果を体感できる。実際のプロジェクトに段階的に適用し、コードレビューでパターンの適切な使用について議論することが、理解を深める最も効果的な方法である。
