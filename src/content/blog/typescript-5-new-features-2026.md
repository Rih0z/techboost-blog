---
title: 'TypeScript 5.x最新機能まとめ2026｜Decorators・satisfies・const型パラメータ'
description: 'TypeScript 5.0〜5.7の新機能を網羅。TC39 Decorators、satisfies演算子、const型パラメータ、isolated declarations、正規表現型チェックなど実践コード付きで解説。'
pubDate: '2026-03-05'
tags: ['TypeScript', 'JavaScript', 'Web開発', 'プログラミング', 'フロントエンド']
heroImage: '../../assets/thumbnails/typescript-5-new-features-2026.jpg'
---

## TypeScript 5.xの進化

TypeScript 5系のリリースノートを毎回読んでいますが、`satisfies`を初めて知ったときの衝撃は忘れられません。「型アノテーションをつけると推論が死ぬ」問題に何年も苦しめられてきたので、解決策が1キーワードで済むことに驚きました。

この記事では5.0から最新の5.7まで、**実務で本当に使う機能だけ**を厳選して解説します。リリースノートの全訳ではなく「これを知っていれば日常のコーディングが変わる」ものに絞りました。

---

## satisfies演算子（TS 5.0）

`satisfies`は、**型チェックを行いつつ、推論された型を保持する**演算子です。

### 問題：型アノテーションでは推論が失われる

```typescript
type Colors = Record<string, string | string[]>;

// 型アノテーション: stringかstring[]かわからなくなる
const palette: Colors = {
  red: '#ff0000',
  green: '#00ff00',
  blue: ['#0000ff', '#0000cc'],
};

// ❌ string | string[] なので toUpperCase が使えない
palette.red.toUpperCase();
```

### 解決：satisfiesで推論を保持

```typescript
const palette = {
  red: '#ff0000',
  green: '#00ff00',
  blue: ['#0000ff', '#0000cc'],
} satisfies Colors;

// ✅ redはstringと推論される
palette.red.toUpperCase(); // OK

// ✅ blueはstring[]と推論される
palette.blue.map(c => c.toUpperCase()); // OK

// ✅ 存在しないキーはエラー
// palette.yellow; // Error
```

### 実践的な使用例

```typescript
// API レスポンスの型定義
type ApiConfig = Record<string, {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  auth?: boolean;
}>;

const apiEndpoints = {
  getUsers: {
    url: '/api/users',
    method: 'GET',
  },
  createUser: {
    url: '/api/users',
    method: 'POST',
    auth: true,
  },
  updateUser: {
    url: '/api/users/:id',
    method: 'PUT',
    auth: true,
  },
} satisfies ApiConfig;

// 各エンドポイントの型が正確に推論される
apiEndpoints.getUsers.method; // 'GET'（'GET' | 'POST' | ... ではない）
```

---

## TC39 Decorators（TS 5.0）

TypeScript 5.0でStage 3のDecoratorが正式サポートされました。

```typescript
// クラスメソッドのログデコレータ
function log<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
) {
  const methodName = String(context.name);

  return function (this: This, ...args: Args): Return {
    console.log(`${methodName} called with:`, args);
    const result = target.call(this, ...args);
    console.log(`${methodName} returned:`, result);
    return result;
  };
}

// バリデーションデコレータ
function validate<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext
) {
  return function (this: This, ...args: Args): Return {
    for (const arg of args) {
      if (arg === null || arg === undefined) {
        throw new Error(`${String(context.name)}: 引数がnull/undefinedです`);
      }
    }
    return target.call(this, ...args);
  };
}

class UserService {
  @log
  @validate
  createUser(name: string, email: string) {
    return { id: crypto.randomUUID(), name, email };
  }
}
```

### Auto-Accessor（自動アクセサ）

```typescript
class User {
  accessor name: string; // getter/setterが自動生成

  constructor(name: string) {
    this.name = name;
  }
}

// デコレータと組み合わせ
function observable<This, Value>(
  target: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>
) {
  return {
    get(this: This): Value {
      console.log(`Reading ${String(context.name)}`);
      return target.get.call(this);
    },
    set(this: This, value: Value) {
      console.log(`Setting ${String(context.name)} to`, value);
      target.set.call(this, value);
    },
  };
}

class Settings {
  @observable
  accessor theme: 'light' | 'dark' = 'light';
}
```

---

## const型パラメータ（TS 5.0）

ジェネリック関数で、引数を**リテラル型として推論**させる修飾子です。

```typescript
// constなしの場合
function routes<T extends Record<string, string>>(config: T): T {
  return config;
}

const r1 = routes({
  home: '/',
  about: '/about',
});
// r1の型: { home: string; about: string }
// → 値がstring型に拡大されてしまう

// constありの場合
function routesConst<const T extends Record<string, string>>(config: T): T {
  return config;
}

const r2 = routesConst({
  home: '/',
  about: '/about',
});
// r2の型: { readonly home: "/"; readonly about: "/about" }
// → リテラル型が保持される！
```

### 実践例：型安全なイベントシステム

```typescript
function defineEvents<const T extends Record<string, (...args: any[]) => void>>(
  events: T
): T {
  return events;
}

const events = defineEvents({
  click: (x: number, y: number) => {},
  keydown: (key: string) => {},
  resize: (width: number, height: number) => {},
});

// events.click の引数型が正確に推論される
type ClickHandler = typeof events.click;
// (x: number, y: number) => void
```

---

## using宣言（TS 5.2）

`using`は、スコープを抜けたときに**自動的にリソースを解放**する宣言です。

```typescript
// Symbol.disposeを実装
class DatabaseConnection implements Disposable {
  constructor(private url: string) {
    console.log(`Connected to ${url}`);
  }

  query(sql: string) {
    return [{ id: 1, name: 'test' }];
  }

  [Symbol.dispose]() {
    console.log(`Disconnected from ${this.url}`);
  }
}

function getUsers() {
  using db = new DatabaseConnection('postgres://localhost/mydb');
  const users = db.query('SELECT * FROM users');
  return users;
  // ← ここで自動的に db[Symbol.dispose]() が呼ばれる
}
```

### 非同期版：await using

```typescript
class FileHandle implements AsyncDisposable {
  static async open(path: string) {
    const handle = new FileHandle(path);
    await handle.init();
    return handle;
  }

  private constructor(private path: string) {}

  private async init() {
    // ファイルを開く処理
  }

  async read(): Promise<string> {
    return 'file contents';
  }

  async [Symbol.asyncDispose]() {
    // ファイルを閉じる処理
    console.log(`Closed ${this.path}`);
  }
}

async function processFile() {
  await using file = await FileHandle.open('/tmp/data.txt');
  const content = await file.read();
  return content;
  // ← 自動的に file[Symbol.asyncDispose]() が呼ばれる
}
```

---

## Isolated Declarations（TS 5.5）

`--isolatedDeclarations`フラグを有効にすると、型推論に頼らず**明示的な型注釈**が必要になります。

```typescript
// ❌ isolatedDeclarations: true ではエラー
export function add(a: number, b: number) {
  return a + b; // 戻り値型が推論に依存
}

// ✅ 戻り値型を明示
export function add(a: number, b: number): number {
  return a + b;
}
```

### なぜ重要か

- **ビルド高速化**: 各ファイルを独立して.d.tsに変換可能
- **並列ビルド**: ファイル間の依存なく宣言ファイル生成
- **monorepo**: パッケージ間の型生成が高速化

---

## 正規表現の型チェック（TS 5.5）

```typescript
// TS 5.5以降: 正規表現リテラルの構文チェック
const re1 = /hello/; // OK
const re2 = /hello/g; // OK

// ❌ 無効なフラグ
// const re3 = /hello/z; // Error: Unknown regular expression flag

// ❌ 無効なエスケープ
// const re4 = /\p/; // Error: Invalid escape

// ✅ Unicode property escapeも検証
const re5 = /\p{Script=Hiragana}/u; // OK（ひらがなにマッチ）
```

---

## Import Attributes（TS 5.3）

```typescript
// JSONインポートに型情報を付与
import config from './config.json' with { type: 'json' };

// CSSモジュール
import styles from './styles.css' with { type: 'css' };

// 型定義での使用
declare module '*.json' {
  const value: Record<string, unknown>;
  export default value;
}
```

---

## NoInfer<T>ユーティリティ型（TS 5.4）

特定の位置での型推論を**意図的に無効化**する型です。

```typescript
// NoInferなし: secondがfirstの型推論に影響する
function createFSM<S extends string>(config: {
  initial: S;
  states: Record<S, { on: Record<string, S> }>;
}) {}

// NoInferあり: initialの値はstatesのキーから推論
function createFSM<S extends string>(config: {
  initial: NoInfer<S>; // ここでは推論しない
  states: Record<S, { on: Record<string, NoInfer<S>> }>;
}) {}

createFSM({
  initial: 'idle', // statesのキーからのみ推論
  states: {
    idle: { on: { start: 'running' } },
    running: { on: { stop: 'idle' } },
  },
});
```

---

## tsconfig.jsonの新オプション

### TS 5.0〜5.7で追加された重要オプション

```jsonc
{
  "compilerOptions": {
    // TS 5.0: バンドラー向けモジュール解決
    "moduleResolution": "bundler",

    // TS 5.0: カスタム条件
    "customConditions": ["development"],

    // TS 5.2: ESMデフォルト
    "module": "nodenext",

    // TS 5.4: ルートディレクトリの推論改善
    "rootDir": "./src",

    // TS 5.5: 独立宣言ファイル
    "isolatedDeclarations": true,

    // TS 5.6: null/undefinedの厳密チェック強化
    "strictBuiltinIteratorReturn": true,

    // 常に有効にすべきオプション
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## まとめ

TypeScript 5.x系の注目機能：

| 機能 | バージョン | インパクト |
|------|----------|----------|
| **satisfies** | 5.0 | ★★★★★ |
| **Decorators** | 5.0 | ★★★★☆ |
| **const型パラメータ** | 5.0 | ★★★★☆ |
| **using宣言** | 5.2 | ★★★★☆ |
| **Import Attributes** | 5.3 | ★★★☆☆ |
| **NoInfer<T>** | 5.4 | ★★★☆☆ |
| **Isolated Declarations** | 5.5 | ★★★★☆ |
| **正規表現型チェック** | 5.5 | ★★★☆☆ |

### 個人的な優先度

すぐにプロジェクトに導入すべきもの：
1. **satisfies** — 今日から使える。型アノテーション vs 型推論の永遠の悩みが消える
2. **const型パラメータ** — `as const`地獄からの解放
3. **using宣言** — DB接続やファイルハンドルのクリーンアップが確実になる

「知っておくといい」もの：
- **Decorators** — ライブラリ作者やNestJS使いには必須、普通のアプリ開発では出番が少ない
- **NoInfer<T>** — ライブラリの型定義で威力を発揮する上級者向け機能

「まだ様子見」：
- **Isolated Declarations** — モノレポのビルド高速化に効くが、既存プロジェクトへの導入コストが高い
