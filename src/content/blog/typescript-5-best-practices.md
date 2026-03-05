---
title: "TypeScript 5.x ベストプラクティス2026 — 新機能と型安全設計パターン"
description: "TypeScript 5.xの新機能を徹底解説。Decorators、const type parameters、satisfies演算子、Template Literal Types活用など2026年のベストプラクティスを実践コード付きで紹介します。"
pubDate: "2026-03-04"
tags: ["TypeScript", "JavaScript", "プログラミング", "型安全", "フロントエンド"]
---

## はじめに

TypeScript 5.xシリーズは数多くの革新的な機能を届けてきました。単なる型チェックを超え、**ランタイムの動作にまで影響を与えるDecorators**、**より精密な型推論を可能にするconst type parameters**、そして**型安全性を損なわず柔軟な設計を実現するsatisfies演算子**など、モダンTypeScriptの書き方は大きく変わっています。

## Decorators（ES Decorators仕様準拠）

TypeScript 5.0でEC2023 Decorators仕様に準拠した新しいDecoratorが導入されました。

### クラスデコレーター

```typescript
// ログ記録デコレーター
function logged(target: any, context: ClassDecoratorContext) {
  const className = context.name;

  return class extends target {
    constructor(...args: any[]) {
      super(...args);
      console.log(`[${className}] インスタンス作成`);
    }
  };
}

// メソッドデコレーター
function measure(target: Function, context: ClassMethodDecoratorContext) {
  const methodName = String(context.name);

  return function (this: any, ...args: any[]) {
    const start = performance.now();
    const result = target.apply(this, args);
    const end = performance.now();
    console.log(`[${methodName}] 実行時間: ${(end - start).toFixed(2)}ms`);
    return result;
  };
}

@logged
class UserService {
  @measure
  async findUser(id: string) {
    // ユーザー検索処理
    return await db.user.findUnique({ where: { id } });
  }
}
```

### フィールドデコレーター（バリデーション）

```typescript
function minLength(min: number) {
  return function (target: undefined, context: ClassFieldDecoratorContext) {
    return function (this: any, value: string) {
      if (value.length < min) {
        throw new Error(
          `${String(context.name)} は ${min}文字以上必要です（現在: ${value.length}文字）`
        );
      }
      return value;
    };
  };
}

function email(target: undefined, context: ClassFieldDecoratorContext) {
  return function (this: any, value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error(`${String(context.name)} は有効なメールアドレスである必要があります`);
    }
    return value;
  };
}

class User {
  @minLength(2)
  name: string;

  @email
  emailAddress: string;

  constructor(name: string, emailAddress: string) {
    this.name = name;
    this.emailAddress = emailAddress;
  }
}

// 使用例
const user = new User('田中', 'tanaka@example.com'); // OK
const invalid = new User('A', 'not-an-email'); // エラー
```

## const type parameters

TypeScript 5.0で導入された `const` 修飾子により、型引数をより厳密に推論できます。

```typescript
// const なし: 推論が緩い
function createTuple<T>(value: T): T {
  return value;
}

const result1 = createTuple(['a', 'b', 'c']);
// 型: string[]  ← 緩い推論

// const あり: より厳密な推論
function createTupleLiteral<const T>(value: T): T {
  return value;
}

const result2 = createTupleLiteral(['a', 'b', 'c']);
// 型: readonly ["a", "b", "c"]  ← タプルとして推論！
```

### 実践的な活用例（設定オブジェクト）

```typescript
// ルート定義の型安全化
function defineRoutes<const T extends Record<string, string>>(routes: T): T {
  return routes;
}

const routes = defineRoutes({
  home: '/',
  about: '/about',
  blog: '/blog',
  contact: '/contact',
});

// routes.homeは string ではなく "/" 型として推論される
type HomeRoute = typeof routes.home; // "/"
type RoutePaths = typeof routes[keyof typeof routes]; // "/" | "/about" | "/blog" | "/contact"

function navigate(path: RoutePaths) {
  window.location.href = path;
}

navigate('/about'); // OK
navigate('/invalid'); // コンパイルエラー！
```

## satisfies 演算子

`satisfies` は型チェックを行いながら、元の型情報を保持する演算子です。

```typescript
type Color = 'red' | 'green' | 'blue';
type ColorPalette = Record<Color, string | [number, number, number]>;

// as を使うと型情報が失われる
const palette1 = {
  red: '#FF0000',
  green: [0, 255, 0],
  blue: '#0000FF',
} as ColorPalette;

// palette1.red は string | [number, number, number] 型になってしまう
palette1.red.toUpperCase(); // エラー（string か配列か不明）

// satisfies を使うと型チェック + 元の型情報を保持
const palette2 = {
  red: '#FF0000',
  green: [0, 255, 0],
  blue: '#0000FF',
} satisfies ColorPalette;

// palette2.red は string 型として推論される（元の型情報を保持）
palette2.red.toUpperCase(); // OK!
palette2.green[0]; // OK! 数値として推論
```

### 設定オブジェクトへの活用

```typescript
interface AppConfig {
  database: {
    host: string;
    port: number;
    name: string;
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
  features: {
    darkMode: boolean;
    notifications: boolean;
  };
}

const config = {
  database: {
    host: 'localhost',
    port: 5432,
    name: 'myapp',
  },
  cache: {
    ttl: 3600,
    maxSize: 1000,
  },
  features: {
    darkMode: true,
    notifications: false,
  },
} satisfies AppConfig;

// 型チェックは AppConfig で行われるが
// config.database.port は number 型（5432 ではない）として推論
// config.features.darkMode は boolean 型として推論
```

## Template Literal Types の高度な活用

```typescript
// CSSプロパティ名の型安全化
type CSSUnit = 'px' | 'em' | 'rem' | '%' | 'vh' | 'vw';
type CSSValue = `${number}${CSSUnit}`;

function setWidth(value: CSSValue) {
  return { width: value };
}

setWidth('100px'); // OK
setWidth('1.5rem'); // OK
setWidth('100'); // エラー（単位なし）
setWidth('100xyz'); // エラー（無効な単位）

// イベント名の型生成
type EventName<T extends string> = `on${Capitalize<T>}`;
type HTMLEventHandlers = EventName<'click' | 'focus' | 'blur' | 'change'>;
// "onClick" | "onFocus" | "onBlur" | "onChange"

// APIエンドポイント型
type ApiVersion = 'v1' | 'v2';
type ApiEndpoint = `/api/${ApiVersion}/${'users' | 'products' | 'orders'}`;
// "/api/v1/users" | "/api/v1/products" | ... など

function callApi(endpoint: ApiEndpoint) {
  return fetch(endpoint);
}

callApi('/api/v1/users'); // OK
callApi('/api/v3/users'); // エラー
```

## 型安全な設計パターン

### Branded Types（型ブランディング）

```typescript
// 文字列の意味的な区別
type UserId = string & { readonly _brand: 'UserId' };
type ProductId = string & { readonly _brand: 'ProductId' };

function createUserId(id: string): UserId {
  return id as UserId;
}

function createProductId(id: string): ProductId {
  return id as ProductId;
}

async function getUser(id: UserId): Promise<User> {
  return fetch(`/api/users/${id}`).then(r => r.json());
}

const userId = createUserId('user-123');
const productId = createProductId('prod-456');

getUser(userId); // OK
getUser(productId); // コンパイルエラー！ProductIdをUserIdとして使えない
getUser('user-123'); // コンパイルエラー！生の文字列も使えない
```

## まとめ

TypeScript 5.xのベストプラクティスをまとめます。

- **Decorators**: バリデーション・ログ・計測など横断的関心事の実装に活用
- **const type parameters**: 設定オブジェクトやルート定義の型をリテラル型として推論
- **satisfies**: 型チェックしながら元の型情報を保持（`as` の代替）
- **Template Literal Types**: 文字列パターンを型レベルで表現し安全性を確保
- **Branded Types**: 同じ基底型を意味的に区別してバグを防止

これらの機能を組み合わせることで、ランタイムエラーをコンパイル時に検出できる堅牢なコードベースが実現できます。
