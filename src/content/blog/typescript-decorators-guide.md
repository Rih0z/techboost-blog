---
title: "TypeScript Decorators完全ガイド — Stage 3デコレーターの使い方"
description: "TypeScript 5.0+で利用可能なTC39 Stage 3デコレーターの完全ガイド。クラスデコレーター、メソッドデコレーター、フィールドデコレーター、アクセサデコレーターの使い方と実用パターンを解説します。2026年最新の情報を反映しています。"
pubDate: "2026-02-05"
tags: ["TypeScript", "Decorators", "JavaScript", "メタプログラミング"]
heroImage: '../../assets/thumbnails/typescript-decorators-guide.jpg'
---
## TypeScript Decoratorsとは

Decoratorsは、クラス、メソッド、プロパティなどに対して宣言的にメタデータを追加したり、動作を変更したりする機能です。

TypeScript 5.0以降、TC39 Stage 3の新しいデコレーター仕様が標準でサポートされるようになりました。これは、以前の実験的デコレーター（`experimentalDecorators`）とは互換性がないため、注意が必要です。

## セットアップ

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": false,
    "emitDecoratorMetadata": false
  }
}
```

**重要**: `experimentalDecorators: true`は古い仕様なので使用しないこと。

## クラスデコレーター

クラスデコレーターは、クラス全体に適用されます。

### 基本構文

```typescript
function sealed<T extends { new(...args: any[]): {} }>(
  constructor: T,
  context: ClassDecoratorContext
) {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args)
      Object.seal(this)
    }
  }
}

@sealed
class User {
  constructor(public name: string) {}
}

const user = new User('Alice')
// @ts-expect-error - sealedなのでプロパティを追加できない
user.age = 30
```

### メタデータの追加

```typescript
const registry = new Map<string, Function>()

function register(name: string) {
  return function<T extends { new(...args: any[]): {} }>(
    constructor: T,
    context: ClassDecoratorContext
  ) {
    registry.set(name, constructor)
    return constructor
  }
}

@register('UserModel')
class User {
  constructor(public name: string) {}
}

@register('PostModel')
class Post {
  constructor(public title: string) {}
}

const UserClass = registry.get('UserModel')
const user = new UserClass!('Alice')
```

## メソッドデコレーター

メソッドデコレーターは、メソッドの動作を変更できます。

### 実行時間計測

```typescript
function measure(
  target: Function,
  context: ClassMethodDecoratorContext
) {
  const methodName = String(context.name)

  return function(this: any, ...args: any[]) {
    const start = performance.now()
    const result = target.apply(this, args)
    const end = performance.now()

    console.log(`${methodName} took ${end - start}ms`)
    return result
  }
}

class Calculator {
  @measure
  fibonacci(n: number): number {
    if (n <= 1) return n
    return this.fibonacci(n - 1) + this.fibonacci(n - 2)
  }
}

const calc = new Calculator()
calc.fibonacci(10)
```

### メモ化

```typescript
function memoize(
  target: Function,
  context: ClassMethodDecoratorContext
) {
  const cache = new Map<string, any>()

  return function(this: any, ...args: any[]) {
    const key = JSON.stringify(args)

    if (cache.has(key)) {
      console.log('Cache hit!')
      return cache.get(key)
    }

    const result = target.apply(this, args)
    cache.set(key, result)
    return result
  }
}

class Calculator {
  @memoize
  expensive(n: number): number {
    console.log('Computing...')
    return n * n
  }
}

const calc = new Calculator()
calc.expensive(5)
calc.expensive(5)
```

### バリデーション

```typescript
function validate(schema: any) {
  return function(
    target: Function,
    context: ClassMethodDecoratorContext
  ) {
    return function(this: any, ...args: any[]) {
      if (args.length !== schema.length) {
        throw new Error('Invalid number of arguments')
      }

      args.forEach((arg, i) => {
        const expectedType = schema[i]
        if (typeof arg !== expectedType) {
          throw new TypeError(
            `Argument ${i} must be ${expectedType}, got ${typeof arg}`
          )
        }
      })

      return target.apply(this, args)
    }
  }
}

class UserService {
  @validate(['string', 'number'])
  createUser(name: string, age: number) {
    return { name, age }
  }
}

const service = new UserService()
service.createUser('Alice', 30)
service.createUser('Bob', '25')
```

## フィールドデコレーター

フィールドデコレーターは、クラスフィールドの初期化を変更できます。

### デフォルト値

```typescript
function defaultValue(value: any) {
  return function(
    target: undefined,
    context: ClassFieldDecoratorContext
  ) {
    return function(this: any, initialValue: any) {
      return initialValue ?? value
    }
  }
}

class Config {
  @defaultValue('localhost')
  host: string

  @defaultValue(3000)
  port: number

  constructor(config?: Partial<Config>) {
    this.host = config?.host!
    this.port = config?.port!
  }
}

const config1 = new Config()
console.log(config1.host, config1.port)

const config2 = new Config({ host: 'example.com' })
console.log(config2.host, config2.port)
```

### 読み取り専用化

```typescript
function readonly(
  target: undefined,
  context: ClassFieldDecoratorContext
) {
  return function(this: any, initialValue: any) {
    Object.defineProperty(this, context.name, {
      value: initialValue,
      writable: false,
      configurable: false,
    })
    return initialValue
  }
}

class User {
  @readonly
  id: string

  name: string

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }
}

const user = new User('123', 'Alice')
user.name = 'Bob'
user.id = '456'
```

## アクセサデコレーター

Getter/Setterに適用するデコレーターです。

### 遅延初期化

```typescript
function lazy(
  target: Function,
  context: ClassGetterDecoratorContext
) {
  const propertyName = `_${String(context.name)}`

  return function(this: any) {
    if (!(propertyName in this)) {
      Object.defineProperty(this, propertyName, {
        value: target.call(this),
        writable: false,
      })
    }
    return this[propertyName]
  }
}

class DataLoader {
  @lazy
  get expensiveData() {
    console.log('Loading expensive data...')
    return Array.from({ length: 1000 }, (_, i) => i)
  }
}

const loader = new DataLoader()
loader.expensiveData
loader.expensiveData
```

### アクセスログ

```typescript
function log(
  target: Function,
  context: ClassGetterDecoratorContext | ClassSetterDecoratorContext
) {
  const kind = context.kind
  const name = String(context.name)

  return function(this: any, ...args: any[]) {
    if (kind === 'getter') {
      console.log(`GET ${name}`)
    } else {
      console.log(`SET ${name} = ${args[0]}`)
    }
    return target.apply(this, args)
  }
}

class User {
  private _name: string = ''

  @log
  get name() {
    return this._name
  }

  @log
  set name(value: string) {
    this._name = value
  }
}

const user = new User()
user.name = 'Alice'
console.log(user.name)
```

## 実用パターン

### Dependency Injection

```typescript
const container = new Map<string, any>()

function injectable(token: string) {
  return function<T extends { new(...args: any[]): {} }>(
    constructor: T,
    context: ClassDecoratorContext
  ) {
    container.set(token, constructor)
    return constructor
  }
}

function inject(token: string) {
  return function(
    target: undefined,
    context: ClassFieldDecoratorContext
  ) {
    return function(this: any) {
      const dependency = container.get(token)
      if (!dependency) {
        throw new Error(`Dependency ${token} not found`)
      }
      return new dependency()
    }
  }
}

@injectable('Logger')
class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`)
  }
}

class UserService {
  @inject('Logger')
  private logger!: Logger

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`)
    return { name }
  }
}

const service = new UserService()
service.createUser('Alice')
```

### APIルーティング（Express風）

```typescript
const routes: any[] = []

function controller(basePath: string) {
  return function<T extends { new(...args: any[]): {} }>(
    constructor: T,
    context: ClassDecoratorContext
  ) {
    context.metadata.basePath = basePath
    return constructor
  }
}

function get(path: string) {
  return function(
    target: Function,
    context: ClassMethodDecoratorContext
  ) {
    const basePath = (context.metadata as any).basePath || ''
    routes.push({
      method: 'GET',
      path: basePath + path,
      handler: target,
    })
  }
}

function post(path: string) {
  return function(
    target: Function,
    context: ClassMethodDecoratorContext
  ) {
    const basePath = (context.metadata as any).basePath || ''
    routes.push({
      method: 'POST',
      path: basePath + path,
      handler: target,
    })
  }
}

@controller('/users')
class UserController {
  @get('/')
  getUsers() {
    return [{ id: 1, name: 'Alice' }]
  }

  @get('/:id')
  getUser(id: string) {
    return { id, name: 'Alice' }
  }

  @post('/')
  createUser(data: any) {
    return { id: 2, ...data }
  }
}

console.log(routes)
```

### バリデーション（class-validator風）

```typescript
const validators = new Map<string, Function[]>()

function isEmail(
  target: undefined,
  context: ClassFieldDecoratorContext
) {
  const fieldName = String(context.name)
  const className = context.metadata.constructor?.name || 'Unknown'

  const validator = (value: any) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      throw new Error(`${fieldName} must be a valid email`)
    }
  }

  const key = `${className}.${fieldName}`
  const existing = validators.get(key) || []
  validators.set(key, [...existing, validator])

  return function(this: any, initialValue: any) {
    return initialValue
  }
}

function minLength(min: number) {
  return function(
    target: undefined,
    context: ClassFieldDecoratorContext
  ) {
    const fieldName = String(context.name)
    const className = context.metadata.constructor?.name || 'Unknown'

    const validator = (value: any) => {
      if (value.length < min) {
        throw new Error(`${fieldName} must be at least ${min} characters`)
      }
    }

    const key = `${className}.${fieldName}`
    const existing = validators.get(key) || []
    validators.set(key, [...existing, validator])

    return function(this: any, initialValue: any) {
      return initialValue
    }
  }
}

function validate(instance: any) {
  const className = instance.constructor.name

  for (const [key, validatorFns] of validators.entries()) {
    if (key.startsWith(className + '.')) {
      const fieldName = key.split('.')[1]
      const value = instance[fieldName]

      for (const validatorFn of validatorFns) {
        validatorFn(value)
      }
    }
  }
}

class CreateUserDto {
  @isEmail
  email: string

  @minLength(3)
  name: string

  constructor(email: string, name: string) {
    this.email = email
    this.name = name
    validate(this)
  }
}

const dto1 = new CreateUserDto('alice@example.com', 'Alice')
const dto2 = new CreateUserDto('invalid-email', 'Alice')
const dto3 = new CreateUserDto('bob@example.com', 'Bo')
```

## Stage 3 vs Experimental の違い

| 機能 | Stage 3 | Experimental |
|------|---------|--------------|
| 設定 | デフォルト有効 | `experimentalDecorators: true` |
| 引数 | `(target, context)` | `(target, propertyKey, descriptor)` |
| メタデータ | `context.metadata` | `reflect-metadata` |
| 戻り値 | 新しい関数/クラス | descriptor変更 |
| パラメータデコレーター | 未サポート | サポート |

## まとめ

TypeScript Stage 3デコレーターは、以下の特徴を持ちます。

- 標準仕様に準拠（TC39 Stage 3）
- クラス、メソッド、フィールド、アクセサに適用可能
- メタプログラミングの強力な手段
- DI、バリデーション、ルーティングなどの実用パターン
- 実験的デコレーターとは互換性なし

モダンなTypeScriptプロジェクトでは、Stage 3デコレーターの使用が推奨されます。まずは小規模な用途（ロギング、バリデーション）から始めて、徐々にフレームワーク設計に活用していくと良いでしょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
