---
title: "TypeScriptで学ぶSOLID原則 — クリーンなコードの設計パターン"
description: "SOLID原則をTypeScriptで実践的に解説。単一責任、オープンクローズド、リスコフの置換、インターフェイス分離、依存性逆転の各原則を具体的なコード例とリファクタリングで理解します。"
pubDate: "2026-02-05"
tags: ["TypeScript", "SOLID", "設計パターン", "クリーンコード", "リファクタリング"]
---

SOLID原則は、保守性・拡張性の高いコードを書くための5つの設計原則です。この記事では、TypeScriptでSOLIDを実践する方法を具体例とともに解説します。

## SOLIDとは

SOLIDは、オブジェクト指向設計の5つの原則の頭文字です。

- **S**: Single Responsibility Principle（単一責任の原則）
- **O**: Open/Closed Principle（オープン・クローズドの原則）
- **L**: Liskov Substitution Principle（リスコフの置換原則）
- **I**: Interface Segregation Principle（インターフェイス分離の原則）
- **D**: Dependency Inversion Principle（依存性逆転の原則）

## S: 単一責任の原則

クラスは1つの責任だけを持つべきです。

### 悪い例

```typescript
class User {
  constructor(
    public name: string,
    public email: string
  ) {}

  // ユーザー管理の責任
  save() {
    // データベースへの保存
    db.users.insert(this);
  }

  // メール送信の責任（異なる責任）
  sendWelcomeEmail() {
    const emailService = new EmailService();
    emailService.send(this.email, 'Welcome!', 'Thank you for joining');
  }

  // バリデーションの責任（異なる責任）
  validate() {
    if (!this.email.includes('@')) {
      throw new Error('Invalid email');
    }
  }
}
```

### 良い例

責任ごとにクラスを分離します。

```typescript
// ユーザーエンティティ（データ保持のみ）
class User {
  constructor(
    public readonly name: string,
    public readonly email: string
  ) {}
}

// データベース操作の責任
class UserRepository {
  async save(user: User): Promise<void> {
    await db.users.insert(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return db.users.findOne({ email });
  }
}

// バリデーションの責任
class UserValidator {
  validate(user: User): void {
    if (!user.email.includes('@')) {
      throw new Error('Invalid email');
    }
    if (user.name.length < 2) {
      throw new Error('Name too short');
    }
  }
}

// メール送信の責任
class UserNotificationService {
  constructor(private emailService: EmailService) {}

  async sendWelcomeEmail(user: User): Promise<void> {
    await this.emailService.send(
      user.email,
      'Welcome!',
      `Hello ${user.name}, thank you for joining`
    );
  }
}
```

## O: オープン・クローズドの原則

クラスは拡張に対して開いていて、変更に対して閉じているべきです。

### 悪い例

```typescript
class PaymentProcessor {
  processPayment(amount: number, method: string) {
    if (method === 'credit_card') {
      // クレジットカード処理
      console.log(`Processing ${amount} via credit card`);
    } else if (method === 'paypal') {
      // PayPal処理
      console.log(`Processing ${amount} via PayPal`);
    } else if (method === 'bitcoin') {
      // Bitcoin処理（新しい決済方法を追加するたびに変更が必要）
      console.log(`Processing ${amount} via Bitcoin`);
    }
  }
}
```

### 良い例

抽象化を使って拡張可能にします。

```typescript
// 支払い方法のインターフェイス
interface PaymentMethod {
  process(amount: number): Promise<void>;
}

// 各決済方法の実装
class CreditCardPayment implements PaymentMethod {
  async process(amount: number): Promise<void> {
    console.log(`Processing ${amount} via credit card`);
    // クレジットカードAPI呼び出し
  }
}

class PayPalPayment implements PaymentMethod {
  async process(amount: number): Promise<void> {
    console.log(`Processing ${amount} via PayPal`);
    // PayPal API呼び出し
  }
}

class BitcoinPayment implements PaymentMethod {
  async process(amount: number): Promise<void> {
    console.log(`Processing ${amount} via Bitcoin`);
    // Bitcoin処理
  }
}

// 変更に閉じていて、拡張に開いている
class PaymentProcessor {
  async processPayment(
    amount: number,
    method: PaymentMethod
  ): Promise<void> {
    await method.process(amount);
  }
}

// 使用例
const processor = new PaymentProcessor();
await processor.processPayment(100, new CreditCardPayment());
await processor.processPayment(200, new BitcoinPayment());
```

## L: リスコフの置換原則

サブクラスは基底クラスと置き換え可能であるべきです。

### 悪い例

```typescript
class Bird {
  fly(): void {
    console.log('Flying...');
  }
}

class Penguin extends Bird {
  fly(): void {
    // ペンギンは飛べない！
    throw new Error('Penguins cannot fly');
  }
}

function makeBirdFly(bird: Bird) {
  bird.fly(); // Penguinを渡すと例外が発生
}
```

### 良い例

適切な抽象化を行います。

```typescript
abstract class Bird {
  abstract move(): void;
}

class FlyingBird extends Bird {
  move(): void {
    console.log('Flying...');
  }
}

class Penguin extends Bird {
  move(): void {
    console.log('Swimming...');
  }
}

function makeBirdMove(bird: Bird) {
  bird.move(); // どのBirdでも安全に呼び出せる
}

const eagle = new FlyingBird();
const penguin = new Penguin();

makeBirdMove(eagle);    // "Flying..."
makeBirdMove(penguin);  // "Swimming..."
```

## I: インターフェイス分離の原則

クライアントは使わないメソッドに依存すべきではありません。

### 悪い例

```typescript
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
}

class HumanWorker implements Worker {
  work(): void {
    console.log('Working...');
  }
  eat(): void {
    console.log('Eating...');
  }
  sleep(): void {
    console.log('Sleeping...');
  }
}

class RobotWorker implements Worker {
  work(): void {
    console.log('Working...');
  }
  eat(): void {
    // ロボットは食べない
    throw new Error('Robots do not eat');
  }
  sleep(): void {
    // ロボットは眠らない
    throw new Error('Robots do not sleep');
  }
}
```

### 良い例

インターフェイスを分離します。

```typescript
interface Workable {
  work(): void;
}

interface Eatable {
  eat(): void;
}

interface Sleepable {
  sleep(): void;
}

class HumanWorker implements Workable, Eatable, Sleepable {
  work(): void {
    console.log('Working...');
  }
  eat(): void {
    console.log('Eating...');
  }
  sleep(): void {
    console.log('Sleeping...');
  }
}

class RobotWorker implements Workable {
  work(): void {
    console.log('Working...');
  }
  // eatとsleepを実装する必要がない
}

// 必要なインターフェイスだけに依存
function manageWorker(worker: Workable) {
  worker.work();
}
```

## D: 依存性逆転の原則

高レベルモジュールは低レベルモジュールに依存すべきではなく、両方とも抽象に依存すべきです。

### 悪い例

```typescript
class MySQLDatabase {
  save(data: any): void {
    console.log('Saving to MySQL:', data);
  }
}

class UserService {
  private db = new MySQLDatabase(); // 具象クラスに直接依存

  createUser(name: string, email: string): void {
    const user = { name, email };
    this.db.save(user);
  }
}
```

### 良い例

抽象（インターフェイス）に依存します。

```typescript
// 抽象
interface Database {
  save(data: any): Promise<void>;
  find(query: any): Promise<any>;
}

// 具象実装
class MySQLDatabase implements Database {
  async save(data: any): Promise<void> {
    console.log('Saving to MySQL:', data);
  }
  async find(query: any): Promise<any> {
    console.log('Finding in MySQL:', query);
    return {};
  }
}

class PostgreSQLDatabase implements Database {
  async save(data: any): Promise<void> {
    console.log('Saving to PostgreSQL:', data);
  }
  async find(query: any): Promise<any> {
    console.log('Finding in PostgreSQL:', query);
    return {};
  }
}

// 抽象に依存
class UserService {
  constructor(private db: Database) {} // 依存性注入

  async createUser(name: string, email: string): Promise<void> {
    const user = { name, email };
    await this.db.save(user);
  }
}

// 使用例
const mysqlService = new UserService(new MySQLDatabase());
const postgresService = new UserService(new PostgreSQLDatabase());
```

## 依存性注入（DI）コンテナ

TypeScriptでDIを実装する例です。

```typescript
// DIコンテナ
class Container {
  private services = new Map<string, any>();

  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory);
  }

  resolve<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(`Service ${name} not found`);
    }
    return factory();
  }
}

// 登録
const container = new Container();
container.register('database', () => new MySQLDatabase());
container.register('userService', () =>
  new UserService(container.resolve('database'))
);

// 解決
const userService = container.resolve<UserService>('userService');
```

## 実践例: リファクタリング

SOLID原則を適用してコードを改善します。

### Before（SOLID違反）

```typescript
class OrderProcessor {
  processOrder(orderId: string) {
    // データベース直接アクセス
    const order = db.orders.findById(orderId);

    // バリデーション
    if (order.items.length === 0) {
      throw new Error('Empty order');
    }

    // 在庫チェック
    for (const item of order.items) {
      const stock = db.inventory.findById(item.productId);
      if (stock.quantity < item.quantity) {
        throw new Error('Out of stock');
      }
    }

    // 決済処理
    if (order.paymentMethod === 'credit_card') {
      // クレジットカード処理
    } else if (order.paymentMethod === 'paypal') {
      // PayPal処理
    }

    // メール送信
    sendEmail(order.customerEmail, 'Order confirmed');
  }
}
```

### After（SOLID適用）

```typescript
// 単一責任
interface OrderRepository {
  findById(id: string): Promise<Order>;
}

interface PaymentGateway {
  charge(amount: number): Promise<void>;
}

interface EmailService {
  send(to: string, subject: string): Promise<void>;
}

interface InventoryService {
  checkAvailability(productId: string, quantity: number): Promise<boolean>;
}

// オープンクローズド + 依存性逆転
class OrderProcessor {
  constructor(
    private orderRepo: OrderRepository,
    private paymentGateway: PaymentGateway,
    private emailService: EmailService,
    private inventoryService: InventoryService
  ) {}

  async processOrder(orderId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);

    // バリデーション（別クラスに分離可能）
    this.validateOrder(order);

    // 在庫確認
    await this.checkInventory(order);

    // 決済
    await this.paymentGateway.charge(order.total);

    // 通知
    await this.emailService.send(order.customerEmail, 'Order confirmed');
  }

  private validateOrder(order: Order): void {
    if (order.items.length === 0) {
      throw new Error('Empty order');
    }
  }

  private async checkInventory(order: Order): Promise<void> {
    for (const item of order.items) {
      const available = await this.inventoryService.checkAvailability(
        item.productId,
        item.quantity
      );
      if (!available) {
        throw new Error('Out of stock');
      }
    }
  }
}
```

## まとめ

SOLID原則を適用することで、以下のメリットが得られます。

- **保守性**: 変更の影響範囲が限定される
- **テスト性**: 依存を注入することでテストが容易
- **拡張性**: 既存コードを変更せず新機能を追加可能
- **可読性**: 各クラスの責任が明確

TypeScriptの型システムを活用することで、SOLID原則をより厳密に適用できます。
