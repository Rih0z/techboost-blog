---
title: "Signals リアクティビティパターン完全ガイド - モダンな状態管理の新潮流"
description: "Solidjs、Preact、Angular、Vue.jsなど主要フレームワークで採用されるSignalsパターンの概念、実装、パフォーマンス最適化手法を徹底解説します。signals・reactivity・state-managementに関する実践情報。"
pubDate: "2025-02-05"
tags: ['Signals', 'Reactivity', 'state-management', 'SolidJS', 'Preact', 'プログラミング']
---
## Signalsとは何か

Signalsは、リアクティブな状態管理を実現するための設計パターンです。従来の仮想DOM差分検出に代わり、細粒度（fine-grained）なリアクティビティを提供することで、パフォーマンスの大幅な向上とシンプルなコードを両立します。

### 従来の状態管理との違い

従来のReact型アプローチでは、状態が変更されると以下のプロセスが実行されます。

1. コンポーネント全体が再レンダリング
2. 仮想DOMの差分計算
3. 実際のDOMへの反映

Signalsパターンでは、状態変更が直接DOMに反映されます。

```javascript
// 従来のReact型アプローチ
const [count, setCount] = useState(0);
// countが変わるとコンポーネント全体が再実行される

// Signalsアプローチ
const count = signal(0);
// count.valueが変わると、それを参照している箇所だけが更新される
```

### Signalsの3つのコア概念

1. **Signal（シグナル）**: 変更可能な値のコンテナ
2. **Computed（計算値）**: Signalから派生する読み取り専用の値
3. **Effect（副作用）**: Signalの変更に反応して実行される処理

## 主要フレームワークにおけるSignalsの実装

### Solid.js - Signalsのパイオニア

Solid.jsはSignalsパターンを中心に設計されたフレームワークです。

```typescript
import { createSignal, createEffect, createMemo } from 'solid-js';

function Counter() {
  // Signal: 状態の定義
  const [count, setCount] = createSignal(0);

  // Computed: 派生状態
  const doubled = createMemo(() => count() * 2);

  // Effect: 副作用
  createEffect(() => {
    console.log(`Count is now: ${count()}`);
  });

  return (
    <div>
      <p>Count: {count()}</p>
      <p>Doubled: {doubled()}</p>
      <button onClick={() => setCount(count() + 1)}>
        Increment
      </button>
    </div>
  );
}
```

**特徴**:
- 関数呼び出しで値にアクセス（`count()`）
- コンポーネント関数は一度だけ実行される
- JSX内の`{count()}`は自動的にリアクティブになる

### Preact Signals - Reactエコシステムへの導入

PreactはSignalsをReactエコシステムに導入しました。

```typescript
import { signal, computed, effect } from '@preact/signals';

// グローバルスコープでも使える
const count = signal(0);
const doubled = computed(() => count.value * 2);

effect(() => {
  console.log(`Count: ${count.value}, Doubled: ${doubled.value}`);
});

function Counter() {
  return (
    <div>
      <p>Count: {count.value}</p>
      <p>Doubled: {doubled.value}</p>
      <button onClick={() => count.value++}>
        Increment
      </button>
    </div>
  );
}
```

**特徴**:
- `.value`でアクセス
- コンポーネント外でも定義可能
- Reactとの互換性を持つ`@preact/signals-react`も存在

### Angular Signals - エンタープライズグレードの実装

Angular 16で正式導入されたSignalsは、Zone.jsからの移行を目指しています。

```typescript
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <div>
      <p>Count: {{ count() }}</p>
      <p>Doubled: {{ doubled() }}</p>
      <button (click)="increment()">Increment</button>
    </div>
  `
})
export class CounterComponent {
  // Signal
  count = signal(0);

  // Computed
  doubled = computed(() => this.count() * 2);

  constructor() {
    // Effect
    effect(() => {
      console.log(`Count changed: ${this.count()}`);
    });
  }

  increment() {
    this.count.update(c => c + 1);
  }
}
```

**特徴**:
- 関数呼び出しでアクセス
- `update()`や`set()`メソッドで更新
- TypeScriptとの深い統合

### Vue 3 Composition API - Signalsとの類似性

Vue 3のreactivityシステムはSignalsと非常に似た設計です。

```typescript
import { ref, computed, watchEffect } from 'vue';

export default {
  setup() {
    // ref = Signal
    const count = ref(0);

    // computed = Computed
    const doubled = computed(() => count.value * 2);

    // watchEffect = Effect
    watchEffect(() => {
      console.log(`Count: ${count.value}`);
    });

    function increment() {
      count.value++;
    }

    return { count, doubled, increment };
  }
};
```

## Signalsの実装パターン

### パターン1: グローバルストア

Signalsはコンポーネント外で定義できるため、シンプルなグローバルストアとして機能します。

```typescript
// store/user.ts
import { signal, computed } from '@preact/signals';

export const user = signal<User | null>(null);
export const isLoggedIn = computed(() => user.value !== null);
export const userName = computed(() => user.value?.name ?? 'Guest');

export function login(userData: User) {
  user.value = userData;
}

export function logout() {
  user.value = null;
}
```

```typescript
// components/Header.tsx
import { isLoggedIn, userName, logout } from '../store/user';

export function Header() {
  return (
    <header>
      <span>Welcome, {userName.value}</span>
      {isLoggedIn.value && (
        <button onClick={logout}>Logout</button>
      )}
    </header>
  );
}
```

### パターン2: 複雑な派生状態の管理

```typescript
import { signal, computed } from '@preact/signals';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

const todos = signal<TodoItem[]>([]);
const filter = signal<'all' | 'active' | 'completed'>('all');
const sortBy = signal<'date' | 'priority'>('date');

// 複数のcomputedを組み合わせる
const filteredTodos = computed(() => {
  const items = todos.value;
  switch (filter.value) {
    case 'active':
      return items.filter(t => !t.completed);
    case 'completed':
      return items.filter(t => t.completed);
    default:
      return items;
  }
});

const sortedTodos = computed(() => {
  const items = [...filteredTodos.value];
  if (sortBy.value === 'priority') {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return items.sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }
  return items;
});

const stats = computed(() => ({
  total: todos.value.length,
  active: todos.value.filter(t => !t.completed).length,
  completed: todos.value.filter(t => t.completed).length,
  highPriority: todos.value.filter(t => t.priority === 'high').length
}));
```

### パターン3: 非同期データの管理

```typescript
import { signal, computed, effect } from '@preact/signals';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function createAsyncSignal<T>(
  fetcher: () => Promise<T>
): {
  state: Signal<AsyncState<T>>;
  refetch: () => Promise<void>;
} {
  const state = signal<AsyncState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const refetch = async () => {
    state.value = { data: state.value.data, loading: true, error: null };

    try {
      const data = await fetcher();
      state.value = { data, loading: false, error: null };
    } catch (error) {
      state.value = {
        data: null,
        loading: false,
        error: error as Error
      };
    }
  };

  return { state, refetch };
}

// 使用例
const { state: usersState, refetch } = createAsyncSignal(
  () => fetch('/api/users').then(r => r.json())
);

// 初回フェッチ
refetch();
```

### パターン4: リアクティブなフォーム管理

```typescript
import { signal, computed } from '@preact/signals';

function createFormSignal<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, (value: any) => string | null>>
) {
  const values = signal(initialValues);
  const touched = signal<Partial<Record<keyof T, boolean>>>({});

  const errors = computed(() => {
    const result: Partial<Record<keyof T, string>> = {};

    for (const [key, validator] of Object.entries(validationRules)) {
      const error = validator(values.value[key]);
      if (error) {
        result[key as keyof T] = error;
      }
    }

    return result;
  });

  const isValid = computed(() => Object.keys(errors.value).length === 0);

  const hasError = (field: keyof T) =>
    touched.value[field] && errors.value[field];

  return {
    values,
    errors,
    touched,
    isValid,
    hasError,
    setField: (field: keyof T, value: any) => {
      values.value = { ...values.value, [field]: value };
      touched.value = { ...touched.value, [field]: true };
    },
    reset: () => {
      values.value = initialValues;
      touched.value = {};
    }
  };
}

// 使用例
const form = createFormSignal(
  { email: '', password: '' },
  {
    email: (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? null
        : 'Invalid email',
    password: (value) =>
      value.length >= 8
        ? null
        : 'Password must be at least 8 characters'
  }
);
```

## パフォーマンス最適化

### 細粒度リアクティビティの利点

Signalsの最大の利点は、変更が発生した箇所だけが更新される点です。

```typescript
import { signal } from '@preact/signals';

const user = signal({ name: 'Alice', age: 30, email: 'alice@example.com' });

// Bad: オブジェクト全体を置き換える
user.value = { ...user.value, age: 31 };

// Good: 必要な部分だけ更新
user.value = { ...user.value, age: 31 };

// Better: ネストしたSignalsを使う
const userName = signal('Alice');
const userAge = signal(30);
const userEmail = signal('alice@example.com');
```

### Computedのメモ化

Computedは依存するSignalが変更されない限り、再計算されません。

```typescript
const numbers = signal([1, 2, 3, 4, 5]);

// この計算は numbers が変更されたときだけ実行される
const sum = computed(() => {
  console.log('Calculating sum...');
  return numbers.value.reduce((a, b) => a + b, 0);
});

// sumを何度参照しても、再計算されない
console.log(sum.value); // "Calculating sum..." と表示
console.log(sum.value); // 表示されない（キャッシュから取得）

// numbersが変更されると再計算
numbers.value = [...numbers.value, 6]; // "Calculating sum..." と表示
```

### Effectのクリーンアップ

```typescript
import { signal, effect } from '@preact/signals';

const userId = signal<string | null>(null);

effect(() => {
  const id = userId.value;

  if (!id) return;

  // WebSocket接続
  const ws = new WebSocket(`wss://api.example.com/users/${id}`);

  ws.onmessage = (event) => {
    console.log('Received:', event.data);
  };

  // クリーンアップ関数を返す
  return () => {
    ws.close();
    console.log('WebSocket closed');
  };
});

// userIdが変更されると、前のWebSocketは自動的に閉じられる
userId.value = 'user-123';
userId.value = 'user-456'; // 前の接続がクローズされる
```

## デバッグとDevTools

### Signalsのデバッグ技法

```typescript
import { signal, effect } from '@preact/signals';

function createDebugSignal<T>(name: string, initialValue: T) {
  const sig = signal(initialValue);

  effect(() => {
    console.log(`[Signal: ${name}]`, sig.value);
  });

  return sig;
}

const count = createDebugSignal('count', 0);
count.value++; // Console: "[Signal: count] 1"
```

### ブラウザ拡張機能

- **Solid DevTools**: Chrome/Firefox拡張で、Signalsの依存関係を可視化
- **Preact DevTools**: Preact Signalsのデバッグに対応
- **Angular DevTools**: Angular Signalsをサポート

## Signalsのベストプラクティス

### 1. Signalは適切な粒度で分割する

```typescript
// Bad: 大きすぎるSignal
const appState = signal({
  user: { name: '', email: '' },
  settings: { theme: 'light', lang: 'en' },
  todos: []
});

// Good: 適切に分割
const user = signal({ name: '', email: '' });
const settings = signal({ theme: 'light', lang: 'en' });
const todos = signal([]);
```

### 2. Computedは純粋関数にする

```typescript
// Bad: 副作用がある
const doubled = computed(() => {
  console.log('Computing...'); // 副作用
  return count.value * 2;
});

// Good: 純粋関数
const doubled = computed(() => count.value * 2);

// 副作用はEffectで
effect(() => {
  console.log('Count doubled:', doubled.value);
});
```

### 3. グローバルSignalは慎重に使う

```typescript
// store/index.ts - 明示的にエクスポート
export { user, isLoggedIn } from './user';
export { theme, language } from './settings';

// 使う側は明示的にインポート
import { user, theme } from './store';
```

### 4. TypeScriptで型安全性を確保

```typescript
import { signal, computed } from '@preact/signals';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

const user = signal<User | null>(null);

// 型ガードを使ったComputed
const isAdmin = computed(() =>
  user.value?.role === 'admin' ?? false
);

// 型安全なヘルパー関数
function requireUser(): User {
  const currentUser = user.value;
  if (!currentUser) {
    throw new Error('User not logged in');
  }
  return currentUser;
}
```

## まとめ

Signalsパターンは、以下の理由で次世代の状態管理として注目されています。

**メリット**:
- 細粒度のリアクティビティによる高パフォーマンス
- シンプルで直感的なAPI
- コンポーネント外での状態管理が容易
- フレームワーク間での概念の統一

**デメリット**:
- 学習コストがやや高い（特にReactユーザー）
- エコシステムがまだ発展途上
- 大規模アプリでの設計パターンが未確立

Solid.js、Preact、Angular、Vueなど主要フレームワークがSignalsを採用・サポートする流れは加速しており、2025年以降のフロントエンド開発において重要な選択肢となるでしょう。

シンプルなアプリから始めて、徐々にSignalsパターンに慣れていくことをお勧めします。
