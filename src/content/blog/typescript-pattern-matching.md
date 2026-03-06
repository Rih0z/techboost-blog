---
title: 'TypeScriptパターンマッチング実践: ts-patternで型安全な条件分岐'
description: 'ts-patternを使ったTypeScriptの高度なパターンマッチング実装ガイド。型安全な条件分岐、データ抽出、エラーハンドリングの実践的な手法を詳しく解説します。TypeScript・ts-pattern・Pattern Matchingに関する実践情報。'
pubDate: 2025-05-22
updatedDate: 2025-05-22
tags: ['TypeScript', 'ts-pattern', 'Pattern Matching', '型安全', '関数型プログラミング']
category: 'typescript'
---
# TypeScriptパターンマッチング実践: ts-patternで型安全な条件分岐

関数型プログラミング言語では標準機能であるパターンマッチングを、TypeScriptでも`ts-pattern`ライブラリを使って実現できます。複雑な条件分岐を型安全に、かつ読みやすく記述する方法を完全解説します。

## ts-patternとは

`ts-pattern`は、TypeScriptに包括的なパターンマッチング機能を提供するライブラリです。switchステートメントやif-elseの連鎖よりも、はるかに表現力豊かで型安全なコードを書けます。

### インストール

```bash
# npm
npm install ts-pattern

# pnpm
pnpm add ts-pattern

# bun
bun add ts-pattern
```

## 基本的な使い方

### 値によるパターンマッチング

```typescript
import { match } from 'ts-pattern';

type Status = 'idle' | 'loading' | 'success' | 'error';

function getStatusMessage(status: Status) {
  return match(status)
    .with('idle', () => 'Waiting to start...')
    .with('loading', () => 'Loading data...')
    .with('success', () => 'Data loaded successfully!')
    .with('error', () => 'Failed to load data')
    .exhaustive(); // すべてのケースをカバーしていることを保証
}

// 使用例
console.log(getStatusMessage('loading')); // "Loading data..."
```

### オブジェクトパターン

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function calculateArea(shape: Shape): number {
  return match(shape)
    .with({ kind: 'circle' }, ({ radius }) => Math.PI * radius ** 2)
    .with({ kind: 'rectangle' }, ({ width, height }) => width * height)
    .with({ kind: 'triangle' }, ({ base, height }) => (base * height) / 2)
    .exhaustive();
}

const circle: Shape = { kind: 'circle', radius: 5 };
console.log(calculateArea(circle)); // 78.54...

const rectangle: Shape = { kind: 'rectangle', width: 10, height: 20 };
console.log(calculateArea(rectangle)); // 200
```

## 高度なパターンマッチング

### ガード条件とP.when

```typescript
import { match, P } from 'ts-pattern';

type User = {
  name: string;
  age: number;
  role: 'admin' | 'user' | 'guest';
};

function getUserPermissions(user: User): string[] {
  return match(user)
    .with(
      { role: 'admin' },
      () => ['read', 'write', 'delete', 'admin']
    )
    .with(
      { role: 'user', age: P.when(age => age >= 18) },
      () => ['read', 'write']
    )
    .with(
      { role: 'user' },
      () => ['read']
    )
    .with(
      { role: 'guest' },
      () => ['read']
    )
    .exhaustive();
}

const user: User = { name: 'Alice', age: 25, role: 'user' };
console.log(getUserPermissions(user)); // ['read', 'write']

const minor: User = { name: 'Bob', age: 16, role: 'user' };
console.log(getUserPermissions(minor)); // ['read']
```

### 配列とタプルのパターンマッチング

```typescript
import { match, P } from 'ts-pattern';

type Command = [string, ...string[]];

function executeCommand(cmd: Command): string {
  return match(cmd)
    .with(['help'], () => 'Showing help...')
    .with(['ls', ...P.array()], ([, ...args]) =>
      `Listing files with args: ${args.join(', ')}`
    )
    .with(['cd', P.string], ([, dir]) =>
      `Changing directory to: ${dir}`
    )
    .with(['git', 'commit', '-m', P.string], ([, , , , msg]) =>
      `Committing with message: ${msg}`
    )
    .with(['git', 'push', ...P.array()], ([, , ...args]) =>
      `Pushing to remote with args: ${args.join(', ')}`
    )
    .otherwise(() => 'Unknown command');
}

console.log(executeCommand(['ls', '-la']));
// "Listing files with args: -la"

console.log(executeCommand(['git', 'commit', '-m', 'Initial commit']));
// "Committing with message: Initial commit"
```

### 深いネスト構造のマッチング

```typescript
import { match, P } from 'ts-pattern';

type ApiResponse<T> =
  | { status: 'loading' }
  | { status: 'error'; error: { code: number; message: string } }
  | { status: 'success'; data: T };

interface User {
  id: number;
  name: string;
  email?: string;
}

function handleUserResponse(response: ApiResponse<User>): string {
  return match(response)
    .with(
      { status: 'loading' },
      () => 'Loading user data...'
    )
    .with(
      { status: 'error', error: { code: 404 } },
      () => 'User not found'
    )
    .with(
      { status: 'error', error: { code: 500 } },
      () => 'Server error occurred'
    )
    .with(
      { status: 'error' },
      ({ error }) => `Error ${error.code}: ${error.message}`
    )
    .with(
      { status: 'success', data: { email: P.string } },
      ({ data }) => `User: ${data.name} (${data.email})`
    )
    .with(
      { status: 'success' },
      ({ data }) => `User: ${data.name} (no email)`
    )
    .exhaustive();
}

const response: ApiResponse<User> = {
  status: 'success',
  data: { id: 1, name: 'Alice', email: 'alice@example.com' }
};

console.log(handleUserResponse(response));
// "User: Alice (alice@example.com)"
```

## 実践的なユースケース

### 1. Redux-likeな状態管理

```typescript
import { match, P } from 'ts-pattern';

type State = {
  count: number;
  user: { name: string; loggedIn: boolean } | null;
  todos: Array<{ id: number; text: string; completed: boolean }>;
};

type Action =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_COUNT'; payload: number }
  | { type: 'LOGIN'; payload: { name: string } }
  | { type: 'LOGOUT' }
  | { type: 'ADD_TODO'; payload: { text: string } }
  | { type: 'TOGGLE_TODO'; payload: { id: number } }
  | { type: 'DELETE_TODO'; payload: { id: number } };

function reducer(state: State, action: Action): State {
  return match(action)
    .with(
      { type: 'INCREMENT' },
      () => ({ ...state, count: state.count + 1 })
    )
    .with(
      { type: 'DECREMENT' },
      () => ({ ...state, count: state.count - 1 })
    )
    .with(
      { type: 'SET_COUNT' },
      ({ payload }) => ({ ...state, count: payload })
    )
    .with(
      { type: 'LOGIN' },
      ({ payload }) => ({
        ...state,
        user: { name: payload.name, loggedIn: true }
      })
    )
    .with(
      { type: 'LOGOUT' },
      () => ({ ...state, user: null })
    )
    .with(
      { type: 'ADD_TODO' },
      ({ payload }) => ({
        ...state,
        todos: [
          ...state.todos,
          { id: Date.now(), text: payload.text, completed: false }
        ]
      })
    )
    .with(
      { type: 'TOGGLE_TODO' },
      ({ payload }) => ({
        ...state,
        todos: state.todos.map(todo =>
          todo.id === payload.id
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      })
    )
    .with(
      { type: 'DELETE_TODO' },
      ({ payload }) => ({
        ...state,
        todos: state.todos.filter(todo => todo.id !== payload.id)
      })
    )
    .exhaustive();
}
```

### 2. バリデーションとエラーハンドリング

```typescript
import { match, P } from 'ts-pattern';

type ValidationError =
  | { type: 'required'; field: string }
  | { type: 'minLength'; field: string; minLength: number }
  | { type: 'maxLength'; field: string; maxLength: number }
  | { type: 'pattern'; field: string; pattern: string }
  | { type: 'custom'; field: string; message: string };

function formatValidationError(error: ValidationError): string {
  return match(error)
    .with(
      { type: 'required' },
      ({ field }) => `${field} is required`
    )
    .with(
      { type: 'minLength' },
      ({ field, minLength }) =>
        `${field} must be at least ${minLength} characters`
    )
    .with(
      { type: 'maxLength' },
      ({ field, maxLength }) =>
        `${field} must be at most ${maxLength} characters`
    )
    .with(
      { type: 'pattern' },
      ({ field, pattern }) =>
        `${field} must match pattern: ${pattern}`
    )
    .with(
      { type: 'custom' },
      ({ message }) => message
    )
    .exhaustive();
}

// バリデーション関数
type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

function validateUser(input: unknown): ValidationResult<{
  name: string;
  email: string;
  age: number;
}> {
  const errors: ValidationError[] = [];

  const data = input as any;

  if (!data.name) {
    errors.push({ type: 'required', field: 'name' });
  } else if (data.name.length < 2) {
    errors.push({ type: 'minLength', field: 'name', minLength: 2 });
  }

  if (!data.email) {
    errors.push({ type: 'required', field: 'email' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({
      type: 'pattern',
      field: 'email',
      pattern: 'email format'
    });
  }

  if (!data.age) {
    errors.push({ type: 'required', field: 'age' });
  } else if (data.age < 18) {
    errors.push({
      type: 'custom',
      field: 'age',
      message: 'You must be at least 18 years old'
    });
  }

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, data: { name: data.name, email: data.email, age: data.age } };
}

// 使用例
const result = validateUser({ name: 'A', email: 'invalid', age: 16 });

match(result)
  .with(
    { success: true },
    ({ data }) => console.log('Valid user:', data)
  )
  .with(
    { success: false },
    ({ errors }) => {
      console.log('Validation failed:');
      errors.forEach(error => {
        console.log('- ' + formatValidationError(error));
      });
    }
  )
  .exhaustive();
```

### 3. ルーティングとナビゲーション

```typescript
import { match, P } from 'ts-pattern';

type Route =
  | { path: '/'; params: {} }
  | { path: '/about'; params: {} }
  | { path: '/blog'; params: { page?: number } }
  | { path: '/blog/:slug'; params: { slug: string } }
  | { path: '/users/:id'; params: { id: string; tab?: string } }
  | { path: '/settings/:section'; params: { section: string } };

function renderRoute(route: Route): string {
  return match(route)
    .with(
      { path: '/' },
      () => '<HomePage />'
    )
    .with(
      { path: '/about' },
      () => '<AboutPage />'
    )
    .with(
      { path: '/blog', params: { page: P.number } },
      ({ params }) => `<BlogPage page={${params.page}} />`
    )
    .with(
      { path: '/blog', params: {} },
      () => '<BlogPage page={1} />'
    )
    .with(
      { path: '/blog/:slug' },
      ({ params }) => `<BlogPost slug="${params.slug}" />`
    )
    .with(
      { path: '/users/:id', params: { tab: P.string } },
      ({ params }) => `<UserProfile id="${params.id}" tab="${params.tab}" />`
    )
    .with(
      { path: '/users/:id' },
      ({ params }) => `<UserProfile id="${params.id}" tab="posts" />`
    )
    .with(
      { path: '/settings/:section' },
      ({ params }) => `<SettingsPage section="${params.section}" />`
    )
    .exhaustive();
}

const route: Route = {
  path: '/users/:id',
  params: { id: '123', tab: 'followers' }
};
console.log(renderRoute(route));
// <UserProfile id="123" tab="followers" />
```

## パフォーマンスとベストプラクティス

### 1. P.selectでデータを効率的に抽出

```typescript
import { match, P } from 'ts-pattern';

type Event =
  | { type: 'click'; x: number; y: number; button: number }
  | { type: 'keydown'; key: string; ctrlKey: boolean }
  | { type: 'scroll'; scrollX: number; scrollY: number };

function handleEvent(event: Event) {
  return match(event)
    .with(
      { type: 'click', button: P.select() },
      (button) => `Clicked with button ${button}`
    )
    .with(
      { type: 'keydown', key: P.select(), ctrlKey: true },
      (key) => `Ctrl+${key} pressed`
    )
    .with(
      { type: 'scroll', scrollY: P.select() },
      (scrollY) => `Scrolled to Y: ${scrollY}`
    )
    .otherwise(() => 'Unknown event');
}
```

### 2. exhaustive()で網羅性を保証

```typescript
// exhaustive()を使うと、すべてのケースをカバーしていない場合に
// コンパイルエラーになります

type Status = 'pending' | 'approved' | 'rejected';

function getStatusColor(status: Status): string {
  return match(status)
    .with('pending', () => 'yellow')
    .with('approved', () => 'green')
    // 'rejected'のケースを忘れるとコンパイルエラー
    .exhaustive();
}
```

## まとめ

`ts-pattern`を使うことで、TypeScriptでも関数型言語並みの表現力豊かなパターンマッチングが実現できます。主な利点は以下の通りです。

- **型安全性**: すべてのケースをカバーしていることをコンパイル時にチェック
- **可読性**: 複雑な条件分岐を簡潔に表現
- **保守性**: パターンの追加・変更が容易
- **デバッグ性**: exhaustive()により、漏れのないケース分岐を保証

複雑な条件分岐やデータ変換が必要な場面で、`ts-pattern`は強力なツールとなります。
