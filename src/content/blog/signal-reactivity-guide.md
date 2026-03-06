---
title: "Signals完全ガイド — 次世代リアクティビティの標準化動向"
description: "React、Vue、Solid.jsを超える次世代リアクティビティモデルSignalsの完全ガイド。TC39提案、各フレームワークでの実装、パフォーマンス最適化まで徹底解説します。Signals・Reactivity・JavaScriptに関する実践情報。"
pubDate: "2026-02-06"
tags: ["Signals", "Reactivity", "JavaScript", "Performance", "フロントエンド"]
---
Signalsは、フロントエンドフレームワークにおける次世代のリアクティビティモデルです。React、Vue、Angularなど、主要フレームワークがSignalsの採用を進めており、TC39でJavaScript標準化の提案も進んでいます。この記事では、Signalsの基本概念から実装パターン、パフォーマンス最適化まで徹底的に解説します。

## Signalsとは

Signalsは、リアクティブな状態管理の新しいプリミティブです。主な特徴は以下の通りです。

- **細粒度リアクティビティ** - 変更があった部分だけを更新
- **自動依存関係追跡** - 手動での依存配列管理が不要
- **フレームワーク非依存** - あらゆるフレームワークで使用可能
- **優れたパフォーマンス** - 仮想DOMなしで高速更新
- **シンプルなAPI** - 学習コストが低い

## なぜSignalsか？

### 従来のリアクティビティモデルとの比較

**React（useState/useEffect）:**
```typescript
const [count, setCount] = useState(0);
const [doubled, setDoubled] = useState(0);

useEffect(() => {
  setDoubled(count * 2);
}, [count]); // 依存配列の手動管理
```

**Signals:**
```typescript
const count = signal(0);
const doubled = computed(() => count.value * 2); // 自動追跡
```

### パフォーマンスの違い

従来のフレームワーク:
1. 状態が変更される
2. コンポーネント全体が再レンダリング
3. 仮想DOMで差分計算
4. 実際のDOM更新

Signals:
1. 状態が変更される
2. **変更箇所のみ**直接更新
3. 仮想DOM不要

## 基本的な使い方

### Signal（基本的な状態）

```typescript
import { signal } from '@preact/signals-core';

// Signalの作成
const count = signal(0);

// 値の読み取り
console.log(count.value); // 0

// 値の更新
count.value = 1;
console.log(count.value); // 1

// オブジェクトもOK
const user = signal({
  name: 'John',
  age: 30,
});

user.value = { ...user.value, age: 31 };
```

### Computed（派生状態）

```typescript
import { signal, computed } from '@preact/signals-core';

const firstName = signal('John');
const lastName = signal('Doe');

// 自動的に依存関係を追跡
const fullName = computed(() => {
  return `${firstName.value} ${lastName.value}`;
});

console.log(fullName.value); // "John Doe"

firstName.value = 'Jane';
console.log(fullName.value); // "Jane Doe" (自動更新)
```

### Effect（副作用）

```typescript
import { signal, effect } from '@preact/signals-core';

const count = signal(0);

// countが変更されたら自動実行
effect(() => {
  console.log(`Count is now: ${count.value}`);
});

count.value = 1; // "Count is now: 1"
count.value = 2; // "Count is now: 2"
```

## Reactでの使用

### @preact/signals-reactのインストール

```bash
npm install @preact/signals-react
```

### 基本的な使用例

```typescript
import { signal, computed } from '@preact/signals-react';

const count = signal(0);
const doubled = computed(() => count.value * 2);

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

### カスタムフック

```typescript
import { signal, computed } from '@preact/signals-react';
import { useSignal } from '@preact/signals-react';

function useCounter(initialValue = 0) {
  const count = useSignal(initialValue);
  const doubled = computed(() => count.value * 2);

  const increment = () => count.value++;
  const decrement = () => count.value--;
  const reset = () => count.value = initialValue;

  return {
    count,
    doubled,
    increment,
    decrement,
    reset,
  };
}

function Counter() {
  const { count, doubled, increment, decrement, reset } = useCounter();

  return (
    <div>
      <p>Count: {count.value}</p>
      <p>Doubled: {doubled.value}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### グローバルステート管理

```typescript
// store/counter.ts
import { signal, computed } from '@preact/signals-react';

// グローバルなSignal
export const count = signal(0);
export const doubled = computed(() => count.value * 2);

export const increment = () => count.value++;
export const decrement = () => count.value--;
```

```typescript
// components/Counter.tsx
import { count, doubled, increment, decrement } from '@/store/counter';

export function Counter() {
  return (
    <div>
      <p>Count: {count}</p>
      <p>Doubled: {doubled}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

## 複雑な状態管理

### ネストされたオブジェクト

```typescript
import { signal } from '@preact/signals-react';

const user = signal({
  profile: {
    name: 'John Doe',
    email: 'john@example.com',
  },
  settings: {
    theme: 'dark',
    notifications: true,
  },
});

// 更新
function updateName(name: string) {
  user.value = {
    ...user.value,
    profile: {
      ...user.value.profile,
      name,
    },
  };
}

// より簡潔な更新（peek使用）
function updateNameSimple(name: string) {
  user.value.profile.name = name;
  user.value = { ...user.value }; // 再評価をトリガー
}
```

### 配列の管理

```typescript
import { signal } from '@preact/signals-react';

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

const todos = signal<Todo[]>([]);

// 追加
function addTodo(text: string) {
  todos.value = [
    ...todos.value,
    { id: Date.now(), text, completed: false },
  ];
}

// 更新
function toggleTodo(id: number) {
  todos.value = todos.value.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
}

// 削除
function removeTodo(id: number) {
  todos.value = todos.value.filter((todo) => todo.id !== id);
}

// フィルタリング（computed）
const activeTodos = computed(() =>
  todos.value.filter((todo) => !todo.completed)
);

const completedTodos = computed(() =>
  todos.value.filter((todo) => todo.completed)
);
```

## 非同期処理

### 基本的な非同期データ取得

```typescript
import { signal, effect } from '@preact/signals-react';

type User = {
  id: number;
  name: string;
  email: string;
};

const user = signal<User | null>(null);
const loading = signal(false);
const error = signal<string | null>(null);

async function fetchUser(id: number) {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) throw new Error('Failed to fetch user');

    const data = await response.json();
    user.value = data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    loading.value = false;
  }
}

// 使用例
function UserProfile({ userId }: { userId: number }) {
  useEffect(() => {
    fetchUser(userId);
  }, [userId]);

  if (loading.value) return <div>Loading...</div>;
  if (error.value) return <div>Error: {error.value}</div>;
  if (!user.value) return null;

  return (
    <div>
      <h1>{user.value.name}</h1>
      <p>{user.value.email}</p>
    </div>
  );
}
```

### カスタムフックでの抽象化

```typescript
import { signal } from '@preact/signals-react';
import { useEffect } from 'react';

function useAsync<T>(asyncFn: () => Promise<T>, deps: any[] = []) {
  const data = signal<T | null>(null);
  const loading = signal(false);
  const error = signal<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      loading.value = true;
      error.value = null;

      try {
        const result = await asyncFn();
        if (!cancelled) {
          data.value = result;
        }
      } catch (err) {
        if (!cancelled) {
          error.value = err instanceof Error ? err.message : 'Unknown error';
        }
      } finally {
        if (!cancelled) {
          loading.value = false;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, deps);

  return { data, loading, error };
}

// 使用例
function UserProfile({ userId }: { userId: number }) {
  const { data: user, loading, error } = useAsync(
    () => fetch(`/api/users/${userId}`).then((r) => r.json()),
    [userId]
  );

  if (loading.value) return <div>Loading...</div>;
  if (error.value) return <div>Error: {error.value}</div>;
  if (!user.value) return null;

  return (
    <div>
      <h1>{user.value.name}</h1>
    </div>
  );
}
```

## パフォーマンス最適化

### 不要な再計算の防止

```typescript
import { signal, computed } from '@preact/signals-react';

const items = signal([1, 2, 3, 4, 5]);
const filter = signal('');

// 効率的: filterが変更された時のみ再計算
const filteredItems = computed(() => {
  const filterValue = filter.value.toLowerCase();
  return items.value.filter((item) =>
    item.toString().includes(filterValue)
  );
});

// 非効率: itemsまたはfilterが変更されるたびに再計算
const filteredItemsBad = computed(() => {
  return items.value.filter((item) =>
    item.toString().includes(filter.value.toLowerCase())
  );
});
```

### batch更新

```typescript
import { signal, batch } from '@preact/signals-react';

const firstName = signal('John');
const lastName = signal('Doe');
const age = signal(30);

// 個別更新: 3回の再レンダリング
function updateUserSlow() {
  firstName.value = 'Jane';
  lastName.value = 'Smith';
  age.value = 25;
}

// batch更新: 1回の再レンダリング
function updateUserFast() {
  batch(() => {
    firstName.value = 'Jane';
    lastName.value = 'Smith';
    age.value = 25;
  });
}
```

### メモ化された計算

```typescript
import { signal, computed } from '@preact/signals-react';

const numbers = signal([1, 2, 3, 4, 5]);

// 高価な計算をメモ化
const sum = computed(() => {
  console.log('Calculating sum...');
  return numbers.value.reduce((acc, n) => acc + n, 0);
});

const average = computed(() => {
  console.log('Calculating average...');
  return sum.value / numbers.value.length;
});

// sumは一度だけ計算される
console.log(sum.value); // "Calculating sum..." → 15
console.log(sum.value); // 15 (再計算なし)
console.log(average.value); // "Calculating average..." → 3
```

## 他のフレームワークとの比較

### Vue 3 (Composition API)

```typescript
// Vue 3
import { ref, computed } from 'vue';

const count = ref(0);
const doubled = computed(() => count.value * 2);

// Signals
import { signal, computed } from '@preact/signals-core';

const count = signal(0);
const doubled = computed(() => count.value * 2);
```

### Solid.js

```typescript
// Solid.js
import { createSignal, createMemo } from 'solid-js';

const [count, setCount] = createSignal(0);
const doubled = createMemo(() => count() * 2);

// Signals
import { signal, computed } from '@preact/signals-core';

const count = signal(0);
const doubled = computed(() => count.value * 2);
```

### Svelte

```svelte
<!-- Svelte -->
<script>
  let count = 0;
  $: doubled = count * 2;
</script>

<p>{count}</p>
<p>{doubled}</p>
```

```typescript
// Signals
import { signal, computed } from '@preact/signals-core';

const count = signal(0);
const doubled = computed(() => count.value * 2);
```

## 実践的なパターン

### フォーム管理

```typescript
import { signal, computed } from '@preact/signals-react';

type FormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

const formData = signal<FormData>({
  email: '',
  password: '',
  confirmPassword: '',
});

const errors = computed(() => {
  const errs: Partial<Record<keyof FormData, string>> = {};

  if (!formData.value.email.includes('@')) {
    errs.email = 'Invalid email';
  }

  if (formData.value.password.length < 8) {
    errs.password = 'Password must be at least 8 characters';
  }

  if (formData.value.password !== formData.value.confirmPassword) {
    errs.confirmPassword = 'Passwords do not match';
  }

  return errs;
});

const isValid = computed(() => Object.keys(errors.value).length === 0);

function SignupForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid.value) {
      console.log('Form submitted:', formData.value);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.value.email}
        onChange={(e) =>
          formData.value = { ...formData.value, email: e.target.value }
        }
      />
      {errors.value.email && <span>{errors.value.email}</span>}

      <input
        type="password"
        value={formData.value.password}
        onChange={(e) =>
          formData.value = { ...formData.value, password: e.target.value }
        }
      />
      {errors.value.password && <span>{errors.value.password}</span>}

      <input
        type="password"
        value={formData.value.confirmPassword}
        onChange={(e) =>
          formData.value = { ...formData.value, confirmPassword: e.target.value }
        }
      />
      {errors.value.confirmPassword && (
        <span>{errors.value.confirmPassword}</span>
      )}

      <button type="submit" disabled={!isValid.value}>
        Sign Up
      </button>
    </form>
  );
}
```

### ページネーション

```typescript
import { signal, computed } from '@preact/signals-react';

const items = signal<string[]>(Array.from({ length: 100 }, (_, i) => `Item ${i + 1}`));
const currentPage = signal(1);
const itemsPerPage = signal(10);

const totalPages = computed(() =>
  Math.ceil(items.value.length / itemsPerPage.value)
);

const currentItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return items.value.slice(start, end);
});

function Pagination() {
  return (
    <div>
      <ul>
        {currentItems.value.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div>
        <button
          onClick={() => currentPage.value--}
          disabled={currentPage.value === 1}
        >
          Previous
        </button>

        <span>
          Page {currentPage.value} of {totalPages.value}
        </span>

        <button
          onClick={() => currentPage.value++}
          disabled={currentPage.value === totalPages.value}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### リアルタイムデータ

```typescript
import { signal, effect } from '@preact/signals-react';

const messages = signal<string[]>([]);
const connected = signal(false);

function connectWebSocket() {
  const ws = new WebSocket('ws://localhost:8080');

  ws.onopen = () => {
    connected.value = true;
  };

  ws.onmessage = (event) => {
    messages.value = [...messages.value, event.data];
  };

  ws.onclose = () => {
    connected.value = false;
  };

  return ws;
}

function Chat() {
  useEffect(() => {
    const ws = connectWebSocket();
    return () => ws.close();
  }, []);

  return (
    <div>
      <div>Status: {connected.value ? 'Connected' : 'Disconnected'}</div>
      <ul>
        {messages.value.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}
```

## TC39提案とJavaScript標準化

Signalsは現在、TC39（JavaScriptの標準化委員会）でStage 1の提案として議論されています。

### 提案されているAPI

```typescript
// 将来のJavaScript標準（提案中）
const counter = new Signal.State(0);
const double = new Signal.Computed(() => counter.get() * 2);

// 監視
const watcher = new Signal.subtle.Watcher(() => {
  console.log('Signal changed');
});

watcher.watch(counter);

counter.set(1); // "Signal changed"
```

標準化されれば、フレームワーク間でSignalsの相互運用性が向上します。

## まとめ

Signalsは、フロントエンド開発における次世代のリアクティビティモデルです。

**主な利点:**
- 細粒度リアクティビティによる高速更新
- 自動依存関係追跡で簡潔なコード
- 優れたパフォーマンス
- フレームワーク非依存
- 標準化への道

React、Vue、Angularなど主要フレームワークが採用を進めており、JavaScript標準化も進行中です。今後のフロントエンド開発において、Signalsは重要な位置を占めることになるでしょう。
