---
title: 'TypeScript入門 — 型安全なJavaScriptで開発効率を上げる'
description: 'TypeScriptの基本的な型システムからジェネリクス、ユーティリティ型まで。実務で使える型定義パターンを解説。'
pubDate: 'Feb 11 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
---

TypeScriptは、JavaScriptに静的型付けを追加した言語です。型があることで、エディタの補完が効き、バグを早期に発見できます。この記事では、実務でよく使う型の知識を解説します。

## 基本的な型

```typescript
// プリミティブ型
const name: string = '太郎';
const age: number = 25;
const isActive: boolean = true;

// 配列
const numbers: number[] = [1, 2, 3];
const names: Array<string> = ['太郎', '花子'];

// オブジェクト型
const user: { name: string; age: number } = {
  name: '太郎',
  age: 25,
};
```

## interface と type の使い分け

```typescript
// interface — オブジェクトの形を定義（拡張しやすい）
interface User {
  id: number;
  name: string;
  email: string;
}

// 拡張（extends）
interface AdminUser extends User {
  role: 'admin';
  permissions: string[];
}

// type — ユニオン型や複雑な型に向く
type Status = 'active' | 'inactive' | 'pending';
type Response = Success | Error;

type Success = {
  status: 'success';
  data: unknown;
};

type Error = {
  status: 'error';
  message: string;
};
```

**使い分けの目安**: オブジェクトの形を定義するなら`interface`、ユニオン型や複雑な型合成なら`type`。

## ユニオン型とリテラル型

```typescript
// ユニオン型: 複数の型のいずれか
function printId(id: string | number) {
  if (typeof id === 'string') {
    console.log(id.toUpperCase()); // string として扱える
  } else {
    console.log(id.toFixed(2)); // number として扱える
  }
}

// リテラル型: 特定の値だけを許可
type Direction = 'up' | 'down' | 'left' | 'right';

function move(direction: Direction) {
  // 'up' | 'down' | 'left' | 'right' 以外はエラー
  console.log(`Moving ${direction}`);
}
```

## ジェネリクス（Generics）

ジェネリクスを使うと、型を引数のように扱えます。再利用可能な関数やクラスを作るのに不可欠です。

```typescript
// ジェネリック関数
function getFirst<T>(arr: T[]): T | undefined {
  return arr[0];
}

const first = getFirst([1, 2, 3]); // number | undefined
const firstStr = getFirst(['a', 'b']); // string | undefined

// ジェネリックインターフェース
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

type UserResponse = ApiResponse<User>;
type UsersResponse = ApiResponse<User[]>;
```

### 制約付きジェネリクス

```typescript
// T は必ず { id: number } を持つ
function findById<T extends { id: number }>(
  items: T[],
  id: number
): T | undefined {
  return items.find(item => item.id === id);
}
```

## ユーティリティ型

TypeScriptには、既存の型を変換するユーティリティ型が組み込まれています。

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// Partial — すべてのプロパティをオプショナルに
type UpdateUser = Partial<User>;
// { id?: number; name?: string; email?: string; age?: number }

// Pick — 特定のプロパティだけ抽出
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: number; name: string }

// Omit — 特定のプロパティを除外
type CreateUser = Omit<User, 'id'>;
// { name: string; email: string; age: number }

// Record — キーと値の型を指定
type UserMap = Record<string, User>;
// { [key: string]: User }
```

## 型ガード（Type Guards）

型ガードを使うと、条件分岐の中で型を絞り込めます。

```typescript
// typeof による型ガード
function format(value: string | number): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  return value.toFixed(2);
}

// in演算子による型ガード
interface Dog {
  bark(): void;
}
interface Cat {
  meow(): void;
}

function speak(animal: Dog | Cat) {
  if ('bark' in animal) {
    animal.bark(); // Dog として扱える
  } else {
    animal.meow(); // Cat として扱える
  }
}

// カスタム型ガード
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}
```

## 実践パターン: API レスポンスの型定義

```typescript
// APIレスポンスの汎用型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// 各エンドポイントの型
interface Post {
  id: number;
  title: string;
  body: string;
  authorId: number;
}

// fetch のラッパー関数
async function fetchApi<T>(url: string): Promise<ApiResponse<T>> {
  const res = await fetch(url);
  if (!res.ok) {
    return { success: false, data: {} as T, error: res.statusText };
  }
  const data: T = await res.json();
  return { success: true, data };
}

// 使用例
const result = await fetchApi<Post[]>('/api/posts');
if (result.success) {
  result.data.forEach(post => {
    console.log(post.title); // 型補完が効く
  });
}
```

## まとめ

| 機能 | 用途 | ポイント |
|------|------|---------|
| `interface` / `type` | 型定義 | オブジェクトはinterface、その他はtype |
| ユニオン型 | 複数の型 | typeof/inで型を絞り込む |
| ジェネリクス | 再利用性 | constraintsで制約を付ける |
| ユーティリティ型 | 型変換 | Partial, Pick, Omit, Record |
| 型ガード | 型の絞り込み | カスタム型ガードで複雑な判定 |

TypeScriptの型システムを活用することで、大規模なコードベースでも安全にリファクタリングでき、チーム開発の生産性が大きく向上します。
