---
title: "TypeScriptデザインパターン実践ガイド"
description: "Factory、Builder、Singleton、Observer、Strategy、Command、Decorator、Adapter、Facade、Repository、Unit of Workなど、主要デザインパターンのTypeScript実装例と使い分け方を徹底解説"
pubDate: "2026-02-05"
tags: ["TypeScript", "Design Patterns", "Architecture", "Best Practices", "OOP"]
heroImage: '../../assets/thumbnails/design-patterns-typescript.jpg'
---

デザインパターンは、ソフトウェア開発における共通の問題に対する再利用可能な解決策です。TypeScriptの型システムと組み合わせることで、より堅牢で保守性の高いコードを書くことができます。この記事では、実務で頻繁に使われる主要なデザインパターンを、TypeScriptでの実装例とともに解説します。

## 生成パターン（Creational Patterns）

オブジェクトの生成に関するパターンです。

### Factory Pattern（ファクトリーパターン）

オブジェクト生成のロジックをカプセル化し、具体的なクラスに依存せずにオブジェクトを作成します。

**問題:**
複数の類似したオブジェクトを作成する際、`new`キーワードを使うと具体的なクラスに依存してしまう。

**解決策:**
オブジェクト生成を専用のファクトリークラスに委譲する。

```typescript
// 基底インターフェース
interface PaymentMethod {
  process(amount: number): Promise<void>
}

// 具体的な実装
class CreditCard implements PaymentMethod {
  constructor(private cardNumber: string) {}

  async process(amount: number): Promise<void> {
    console.log(`Processing ${amount} via Credit Card: ${this.cardNumber}`)
    // 決済処理
  }
}

class PayPal implements PaymentMethod {
  constructor(private email: string) {}

  async process(amount: number): Promise<void> {
    console.log(`Processing ${amount} via PayPal: ${this.email}`)
    // 決済処理
  }
}

class BankTransfer implements PaymentMethod {
  constructor(private accountNumber: string) {}

  async process(amount: number): Promise<void> {
    console.log(`Processing ${amount} via Bank Transfer: ${this.accountNumber}`)
    // 決済処理
  }
}

// ファクトリー
class PaymentMethodFactory {
  static create(type: 'credit_card' | 'paypal' | 'bank_transfer', details: string): PaymentMethod {
    switch (type) {
      case 'credit_card':
        return new CreditCard(details)
      case 'paypal':
        return new PayPal(details)
      case 'bank_transfer':
        return new BankTransfer(details)
      default:
        throw new Error(`Unknown payment method: ${type}`)
    }
  }
}

// 使用例
const payment = PaymentMethodFactory.create('paypal', 'user@example.com')
await payment.process(100)
```

**いつ使うか:**
- オブジェクト生成のロジックが複雑
- 生成するオブジェクトの種類が実行時に決まる
- 具体的なクラスへの依存を避けたい

### Builder Pattern（ビルダーパターン）

複雑なオブジェクトを段階的に構築します。

**問題:**
コンストラクタの引数が多すぎる、またはオプショナルな引数が多い。

**解決策:**
オブジェクト構築のステップを分離し、流暢なインターフェースで記述できるようにする。

```typescript
interface EmailOptions {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  attachments?: string[]
  priority?: 'high' | 'normal' | 'low'
}

class Email {
  private constructor(private options: EmailOptions) {}

  send(): void {
    console.log('Sending email:', this.options)
    // 送信処理
  }

  static builder() {
    return new EmailBuilder()
  }
}

class EmailBuilder {
  private options: Partial<EmailOptions> = {
    to: [],
    priority: 'normal'
  }

  from(email: string): this {
    this.options.from = email
    return this
  }

  to(...emails: string[]): this {
    this.options.to = [...(this.options.to || []), ...emails]
    return this
  }

  cc(...emails: string[]): this {
    this.options.cc = [...(this.options.cc || []), ...emails]
    return this
  }

  bcc(...emails: string[]): this {
    this.options.bcc = [...(this.options.bcc || []), ...emails]
    return this
  }

  subject(subject: string): this {
    this.options.subject = subject
    return this
  }

  body(body: string): this {
    this.options.body = body
    return this
  }

  attach(...files: string[]): this {
    this.options.attachments = [...(this.options.attachments || []), ...files]
    return this
  }

  priority(priority: 'high' | 'normal' | 'low'): this {
    this.options.priority = priority
    return this
  }

  build(): Email {
    // バリデーション
    if (!this.options.from || !this.options.to || !this.options.subject || !this.options.body) {
      throw new Error('Missing required email fields')
    }

    return new Email(this.options as EmailOptions)
  }
}

// 使用例
const email = Email.builder()
  .from('sender@example.com')
  .to('recipient1@example.com', 'recipient2@example.com')
  .cc('cc@example.com')
  .subject('Important Update')
  .body('This is the email body')
  .attach('document.pdf')
  .priority('high')
  .build()

email.send()
```

**いつ使うか:**
- オブジェクトのコンストラクタに多数の引数がある
- 不変オブジェクトを構築したい
- オブジェクト構築のステップが複雑

### Singleton Pattern（シングルトンパターン）

クラスのインスタンスを1つだけに制限します。

**問題:**
アプリケーション全体で1つだけ存在すべきオブジェクト（設定、ロガー、データベース接続など）。

**解決策:**
インスタンスをクラス内で管理し、外部からの生成を防ぐ。

```typescript
class Logger {
  private static instance: Logger
  private logs: string[] = []

  // コンストラクタをprivateにして外部からのインスタンス化を防ぐ
  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  log(message: string): void {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}`
    this.logs.push(logEntry)
    console.log(logEntry)
  }

  getLogs(): string[] {
    return [...this.logs]
  }
}

// 使用例
const logger1 = Logger.getInstance()
const logger2 = Logger.getInstance()

logger1.log('First message')
logger2.log('Second message')

console.log(logger1 === logger2) // true（同一インスタンス）
console.log(logger1.getLogs()) // 両方のログが含まれる
```

**TypeScriptでより良い方法:**

```typescript
// モジュールスコープでシングルトンを実現（より簡潔）
class LoggerService {
  private logs: string[] = []

  log(message: string): void {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}`
    this.logs.push(logEntry)
    console.log(logEntry)
  }

  getLogs(): string[] {
    return [...this.logs]
  }
}

// シングルトンインスタンスをエクスポート
export const logger = new LoggerService()
```

```typescript
// 使用側
import { logger } from './logger'

logger.log('Application started')
```

**いつ使うか:**
- グローバルな状態を管理したい
- リソース（DB接続、設定など）を1つだけ持ちたい

**注意点:**
- グローバル状態はテストを困難にする
- 依存性注入（DI）を使う方が望ましい場合が多い

## 振る舞いパターン（Behavioral Patterns）

オブジェクト間の責任分担と相互作用に関するパターンです。

### Observer Pattern（オブザーバーパターン）

オブジェクトの状態変化を他のオブジェクトに通知します。

**問題:**
あるオブジェクトの状態変化を複数のオブジェクトが知る必要がある。

**解決策:**
サブスクライブ/パブリッシュの仕組みを提供する。

```typescript
interface Observer<T> {
  update(data: T): void
}

interface Subject<T> {
  subscribe(observer: Observer<T>): void
  unsubscribe(observer: Observer<T>): void
  notify(data: T): void
}

// 具体的なSubject
class StockPrice implements Subject<number> {
  private observers: Observer<number>[] = []
  private price: number = 0

  subscribe(observer: Observer<number>): void {
    this.observers.push(observer)
  }

  unsubscribe(observer: Observer<number>): void {
    const index = this.observers.indexOf(observer)
    if (index > -1) {
      this.observers.splice(index, 1)
    }
  }

  notify(price: number): void {
    for (const observer of this.observers) {
      observer.update(price)
    }
  }

  setPrice(price: number): void {
    this.price = price
    this.notify(price)
  }

  getPrice(): number {
    return this.price
  }
}

// 具体的なObserver
class PriceDisplay implements Observer<number> {
  update(price: number): void {
    console.log(`Price Display: $${price}`)
  }
}

class PriceAlert implements Observer<number> {
  constructor(private threshold: number) {}

  update(price: number): void {
    if (price > this.threshold) {
      console.log(`🚨 Alert: Price exceeded $${this.threshold}!`)
    }
  }
}

// 使用例
const stock = new StockPrice()
const display = new PriceDisplay()
const alert = new PriceAlert(100)

stock.subscribe(display)
stock.subscribe(alert)

stock.setPrice(95)  // Price Display: $95
stock.setPrice(105) // Price Display: $105 + Alert!
```

**TypeScriptの型安全なEventEmitter:**

```typescript
type EventMap = {
  'user:login': { userId: string; timestamp: Date }
  'user:logout': { userId: string }
  'order:created': { orderId: string; amount: number }
}

class TypedEventEmitter<T extends Record<string, any>> {
  private listeners: { [K in keyof T]?: Array<(data: T[K]) => void> } = {}

  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event]!.push(listener)
  }

  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    const listeners = this.listeners[event]
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const listeners = this.listeners[event]
    if (listeners) {
      for (const listener of listeners) {
        listener(data)
      }
    }
  }
}

// 使用例
const events = new TypedEventEmitter<EventMap>()

events.on('user:login', ({ userId, timestamp }) => {
  console.log(`User ${userId} logged in at ${timestamp}`)
})

events.on('order:created', ({ orderId, amount }) => {
  console.log(`Order ${orderId} created: $${amount}`)
})

events.emit('user:login', {
  userId: 'user123',
  timestamp: new Date()
})

// TypeScriptが型チェックしてくれる
// events.emit('user:login', { userId: 123 }) // エラー
```

**いつ使うか:**
- イベント駆動アーキテクチャ
- UI更新（MVC/MVVMパターン）
- リアルタイム通知システム

### Strategy Pattern（ストラテジーパターン）

アルゴリズムをカプセル化し、実行時に切り替え可能にします。

**問題:**
条件分岐が多く、アルゴリズムの追加や変更が困難。

**解決策:**
各アルゴリズムを独立したクラスとして定義し、交換可能にする。

```typescript
// 戦略インターフェース
interface SortStrategy<T> {
  sort(data: T[]): T[]
}

// 具体的な戦略
class BubbleSort<T> implements SortStrategy<T> {
  sort(data: T[]): T[] {
    const arr = [...data]
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - 1 - i; j++) {
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        }
      }
    }
    return arr
  }
}

class QuickSort<T> implements SortStrategy<T> {
  sort(data: T[]): T[] {
    if (data.length <= 1) return data

    const pivot = data[0]
    const left = data.slice(1).filter(x => x <= pivot)
    const right = data.slice(1).filter(x => x > pivot)

    return [...this.sort(left), pivot, ...this.sort(right)]
  }
}

class NativeSort<T> implements SortStrategy<T> {
  sort(data: T[]): T[] {
    return [...data].sort()
  }
}

// コンテキスト
class Sorter<T> {
  constructor(private strategy: SortStrategy<T>) {}

  setStrategy(strategy: SortStrategy<T>): void {
    this.strategy = strategy
  }

  sort(data: T[]): T[] {
    console.log(`Sorting with ${this.strategy.constructor.name}`)
    return this.strategy.sort(data)
  }
}

// 使用例
const data = [5, 2, 8, 1, 9]
const sorter = new Sorter(new BubbleSort())

console.log(sorter.sort(data)) // BubbleSortで実行

sorter.setStrategy(new QuickSort())
console.log(sorter.sort(data)) // QuickSortで実行

sorter.setStrategy(new NativeSort())
console.log(sorter.sort(data)) // NativeSortで実行
```

**実践例：価格計算戦略**

```typescript
interface PricingStrategy {
  calculate(basePrice: number): number
}

class RegularPricing implements PricingStrategy {
  calculate(basePrice: number): number {
    return basePrice
  }
}

class DiscountPricing implements PricingStrategy {
  constructor(private discountPercent: number) {}

  calculate(basePrice: number): number {
    return basePrice * (1 - this.discountPercent / 100)
  }
}

class MemberPricing implements PricingStrategy {
  calculate(basePrice: number): number {
    return basePrice * 0.85 // 15% off
  }
}

class Product {
  constructor(
    private name: string,
    private basePrice: number,
    private pricingStrategy: PricingStrategy
  ) {}

  getPrice(): number {
    return this.pricingStrategy.calculate(this.basePrice)
  }

  setPricingStrategy(strategy: PricingStrategy): void {
    this.pricingStrategy = strategy
  }
}

// 使用例
const product = new Product('Laptop', 1000, new RegularPricing())
console.log(product.getPrice()) // 1000

product.setPricingStrategy(new DiscountPricing(20))
console.log(product.getPrice()) // 800

product.setPricingStrategy(new MemberPricing())
console.log(product.getPrice()) // 850
```

**いつ使うか:**
- 複数のアルゴリズムがあり、実行時に選択したい
- 条件分岐が多く、新しいケースの追加が頻繁
- アルゴリズムを独立してテストしたい

### Command Pattern（コマンドパターン）

操作をオブジェクトとしてカプセル化します。

**問題:**
アンドゥ/リドゥ、操作のキュー、ログなどを実装したい。

**解決策:**
操作を独立したコマンドオブジェクトとして表現する。

```typescript
interface Command {
  execute(): void
  undo(): void
}

// レシーバー（実際の処理を行うオブジェクト）
class TextEditor {
  private text: string = ''

  append(text: string): void {
    this.text += text
  }

  delete(length: number): void {
    this.text = this.text.slice(0, -length)
  }

  getText(): string {
    return this.text
  }
}

// 具体的なコマンド
class AppendTextCommand implements Command {
  constructor(
    private editor: TextEditor,
    private text: string
  ) {}

  execute(): void {
    this.editor.append(this.text)
  }

  undo(): void {
    this.editor.delete(this.text.length)
  }
}

class DeleteTextCommand implements Command {
  private deletedText: string = ''

  constructor(
    private editor: TextEditor,
    private length: number
  ) {}

  execute(): void {
    const currentText = this.editor.getText()
    this.deletedText = currentText.slice(-this.length)
    this.editor.delete(this.length)
  }

  undo(): void {
    this.editor.append(this.deletedText)
  }
}

// インボーカー（コマンドを実行し、履歴を管理）
class CommandManager {
  private history: Command[] = []
  private currentIndex: number = -1

  execute(command: Command): void {
    // 現在位置より後の履歴を削除（新しい操作が行われた場合）
    this.history = this.history.slice(0, this.currentIndex + 1)

    command.execute()
    this.history.push(command)
    this.currentIndex++
  }

  undo(): void {
    if (this.currentIndex >= 0) {
      this.history[this.currentIndex].undo()
      this.currentIndex--
    }
  }

  redo(): void {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++
      this.history[this.currentIndex].execute()
    }
  }
}

// 使用例
const editor = new TextEditor()
const manager = new CommandManager()

manager.execute(new AppendTextCommand(editor, 'Hello '))
manager.execute(new AppendTextCommand(editor, 'World'))
console.log(editor.getText()) // "Hello World"

manager.undo()
console.log(editor.getText()) // "Hello "

manager.redo()
console.log(editor.getText()) // "Hello World"

manager.execute(new DeleteTextCommand(editor, 6))
console.log(editor.getText()) // "Hello"
```

**いつ使うか:**
- アンドゥ/リドゥ機能
- 操作のログ記録
- トランザクション処理
- 操作のキューイング

## 構造パターン（Structural Patterns）

クラスやオブジェクトの構造に関するパターンです。

### Decorator Pattern（デコレーターパターン）

オブジェクトに動的に機能を追加します。

**問題:**
継承を使わずに既存のオブジェクトに機能を追加したい。

**解決策:**
元のオブジェクトをラップし、新しい機能を追加する。

```typescript
interface Coffee {
  cost(): number
  description(): string
}

class SimpleCoffee implements Coffee {
  cost(): number {
    return 10
  }

  description(): string {
    return 'Simple coffee'
  }
}

// デコレーター基底クラス
abstract class CoffeeDecorator implements Coffee {
  constructor(protected coffee: Coffee) {}

  abstract cost(): number
  abstract description(): string
}

// 具体的なデコレーター
class MilkDecorator extends CoffeeDecorator {
  cost(): number {
    return this.coffee.cost() + 2
  }

  description(): string {
    return this.coffee.description() + ', milk'
  }
}

class SugarDecorator extends CoffeeDecorator {
  cost(): number {
    return this.coffee.cost() + 1
  }

  description(): string {
    return this.coffee.description() + ', sugar'
  }
}

class WhipDecorator extends CoffeeDecorator {
  cost(): number {
    return this.coffee.cost() + 3
  }

  description(): string {
    return this.coffee.description() + ', whip'
  }
}

// 使用例
let coffee: Coffee = new SimpleCoffee()
console.log(`${coffee.description()}: $${coffee.cost()}`)
// Simple coffee: $10

coffee = new MilkDecorator(coffee)
console.log(`${coffee.description()}: $${coffee.cost()}`)
// Simple coffee, milk: $12

coffee = new SugarDecorator(coffee)
console.log(`${coffee.description()}: $${coffee.cost()}`)
// Simple coffee, milk, sugar: $13

coffee = new WhipDecorator(coffee)
console.log(`${coffee.description()}: $${coffee.cost()}`)
// Simple coffee, milk, sugar, whip: $16
```

**TypeScriptデコレーター（実験的機能）:**

```typescript
// メソッドデコレーター
function log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with args:`, args)
    const result = originalMethod.apply(this, args)
    console.log(`Result:`, result)
    return result
  }

  return descriptor
}

class Calculator {
  @log
  add(a: number, b: number): number {
    return a + b
  }
}

const calc = new Calculator()
calc.add(2, 3)
// Calling add with args: [2, 3]
// Result: 5
```

**いつ使うか:**
- 既存のオブジェクトに柔軟に機能を追加したい
- 継承よりも組み合わせを使いたい
- ロギング、キャッシュ、認証などの横断的関心事

### Adapter Pattern（アダプターパターン）

互換性のないインターフェースを変換します。

**問題:**
既存のクラスのインターフェースが要求されるインターフェースと一致しない。

**解決策:**
既存のクラスをラップして、新しいインターフェースを提供する。

```typescript
// 既存のサードパーティライブラリ
class OldPaymentGateway {
  makePayment(amount: number, currency: string): void {
    console.log(`Processing ${amount} ${currency} via old gateway`)
  }
}

// 新しいインターフェース
interface PaymentProcessor {
  processPayment(amount: number): Promise<void>
}

// アダプター
class PaymentGatewayAdapter implements PaymentProcessor {
  constructor(private oldGateway: OldPaymentGateway) {}

  async processPayment(amount: number): Promise<void> {
    // 新しいインターフェースから古いインターフェースに変換
    this.oldGateway.makePayment(amount, 'USD')
  }
}

// 使用例
const oldGateway = new OldPaymentGateway()
const adapter: PaymentProcessor = new PaymentGatewayAdapter(oldGateway)

await adapter.processPayment(100)
```

**いつ使うか:**
- サードパーティライブラリを統一インターフェースで使いたい
- レガシーコードを新しいシステムに統合したい

### Facade Pattern（ファサードパターン）

複雑なサブシステムへのシンプルなインターフェースを提供します。

**問題:**
複雑なサブシステムの使用が困難。

**解決策:**
簡潔な統一インターフェースを提供する。

```typescript
// 複雑なサブシステム
class VideoFile {
  constructor(public filename: string) {}
}

class CodecFactory {
  static extract(file: VideoFile): string {
    return file.filename.includes('.mp4') ? 'MPEG4' : 'OGG'
  }
}

class BitrateReader {
  static read(filename: string, codec: string): string {
    return `${codec} bitrate data`
  }

  static convert(buffer: string, codec: string): string {
    return `Converted ${buffer} to ${codec}`
  }
}

class AudioMixer {
  fix(result: string): string {
    return `Fixed audio: ${result}`
  }
}

// ファサード
class VideoConverter {
  convert(filename: string, format: string): string {
    const file = new VideoFile(filename)
    const sourceCodec = CodecFactory.extract(file)
    const buffer = BitrateReader.read(filename, sourceCodec)
    const converted = BitrateReader.convert(buffer, format)
    const result = new AudioMixer().fix(converted)
    return result
  }
}

// 使用例（シンプルなAPI）
const converter = new VideoConverter()
const result = converter.convert('video.mp4', 'mp4')
console.log(result)
```

**いつ使うか:**
- 複雑なライブラリやAPIを簡単に使えるようにしたい
- 多くのクラスへの依存を隠蔽したい

## データアクセスパターン

### Repository Pattern（リポジトリパターン）

データアクセスロジックをカプセル化します。

```typescript
interface User {
  id: string
  name: string
  email: string
}

interface Repository<T> {
  findById(id: string): Promise<T | null>
  findAll(): Promise<T[]>
  create(item: Omit<T, 'id'>): Promise<T>
  update(id: string, item: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}

class UserRepository implements Repository<User> {
  private users: User[] = []

  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null
  }

  async findAll(): Promise<User[]> {
    return [...this.users]
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null
  }

  async create(userData: Omit<User, 'id'>): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      ...userData
    }
    this.users.push(user)
    return user
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const index = this.users.findIndex(u => u.id === id)
    if (index === -1) throw new Error('User not found')

    this.users[index] = { ...this.users[index], ...userData }
    return this.users[index]
  }

  async delete(id: string): Promise<void> {
    const index = this.users.findIndex(u => u.id === id)
    if (index !== -1) {
      this.users.splice(index, 1)
    }
  }
}

// 使用例
const userRepo = new UserRepository()

const user = await userRepo.create({
  name: 'Alice',
  email: 'alice@example.com'
})

const foundUser = await userRepo.findByEmail('alice@example.com')
```

**いつ使うか:**
- データベース操作を抽象化したい
- ビジネスロジックとデータアクセスを分離したい
- テストでモックに差し替えたい

### Unit of Work Pattern

トランザクション内の変更を追跡し、一括でコミットします。

```typescript
class UnitOfWork {
  private newEntities: any[] = []
  private dirtyEntities: any[] = []
  private deletedEntities: any[] = []

  registerNew(entity: any): void {
    this.newEntities.push(entity)
  }

  registerDirty(entity: any): void {
    if (!this.dirtyEntities.includes(entity)) {
      this.dirtyEntities.push(entity)
    }
  }

  registerDeleted(entity: any): void {
    this.deletedEntities.push(entity)
  }

  async commit(): Promise<void> {
    // トランザクション開始
    try {
      for (const entity of this.newEntities) {
        await this.insert(entity)
      }

      for (const entity of this.dirtyEntities) {
        await this.update(entity)
      }

      for (const entity of this.deletedEntities) {
        await this.delete(entity)
      }

      // コミット
      this.clear()
    } catch (error) {
      // ロールバック
      throw error
    }
  }

  private async insert(entity: any): Promise<void> {
    console.log('Inserting:', entity)
    // DB insert logic
  }

  private async update(entity: any): Promise<void> {
    console.log('Updating:', entity)
    // DB update logic
  }

  private async delete(entity: any): Promise<void> {
    console.log('Deleting:', entity)
    // DB delete logic
  }

  private clear(): void {
    this.newEntities = []
    this.dirtyEntities = []
    this.deletedEntities = []
  }
}

// 使用例
const uow = new UnitOfWork()

const user1 = { id: 1, name: 'Alice' }
const user2 = { id: 2, name: 'Bob' }

uow.registerNew(user1)
uow.registerNew(user2)
uow.registerDeleted({ id: 3, name: 'Charlie' })

await uow.commit() // 一括でコミット
```

## まとめ

デザインパターンは、ソフトウェア設計における共通言語です。適切に使用すれば、コードの保守性、拡張性、テスタビリティが大幅に向上します。

### パターン選択のガイドライン

**生成パターン:**
- オブジェクト生成が複雑 → Factory/Builder
- グローバルな唯一のインスタンス → Singleton

**振る舞いパターン:**
- イベント通知 → Observer
- アルゴリズムの切り替え → Strategy
- 操作の履歴管理 → Command

**構造パターン:**
- 既存クラスに機能追加 → Decorator
- インターフェース変換 → Adapter
- 複雑なサブシステムの簡略化 → Facade

**データアクセス:**
- データアクセスの抽象化 → Repository
- トランザクション管理 → Unit of Work

TypeScriptの型システムを活用することで、これらのパターンをより安全に実装できます。ただし、パターンは銀の弾丸ではありません。過度に使用すると、かえってコードが複雑になることもあります。問題に応じて適切なパターンを選択し、シンプルさを保つことが重要です。
