---
title: 'Zustand vs Jotai徹底比較2026 - アトミックvsストア、パフォーマンス、使い分け、実装例完全ガイド'
description: 'ZustandとJotaiを徹底比較。アトミック vs ストアアーキテクチャ、パフォーマンス、DevTools、使い分け、実装パターンを実例付きで解説。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 'Feb 05 2026'
tags: ['React', '状態管理', 'Zustand', 'Jotai']
---
# Zustand vs Jotai徹底比較2026

ZustandとJotaiは、Reactの軽量状態管理ライブラリです。本記事では、両者の違いと使い分けを実例付きで徹底解説します。

## 目次

1. ZustandとJotaiの概要
2. アーキテクチャの違い
3. 基本的な使い方
4. パフォーマンス比較
5. DevToolsとデバッグ
6. 実践パターン
7. 使い分けガイド
8. マイグレーション

## ZustandとJotaiの概要

### Zustand

```typescript
/**
 * Zustand の特徴
 *
 * 1. ストアベース
 *    - Redux風の単一ストア
 *    - シンプルなAPI
 *
 * 2. Hooks不要
 *    - コンポーネント外でも使用可能
 *
 * 3. ミドルウェア
 *    - persist、devtools等
 *
 * 4. バンドルサイズ
 *    - 約1KB（gzip）
 */

import { create } from 'zustand'

// Zustandストアの作成
interface CounterStore {
  count: number
  increment: () => void
  decrement: () => void
}

const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 }))
}))

// 使用例
function Counter() {
  const { count, increment, decrement } = useCounterStore()

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  )
}
```

### Jotai

```typescript
/**
 * Jotai の特徴
 *
 * 1. アトミックベース
 *    - Recoil風の分散状態
 *    - ボトムアップ設計
 *
 * 2. 宣言的
 *    - 派生状態が自然
 *
 * 3. TypeScript完全対応
 *    - 型推論が強力
 *
 * 4. バンドルサイズ
 *    - 約2KB（gzip）
 */

import { atom, useAtom } from 'jotai'

// Jotaiアトムの作成
const countAtom = atom(0)

const incrementAtom = atom(
  (get) => get(countAtom),
  (get, set) => set(countAtom, get(countAtom) + 1)
)

const decrementAtom = atom(
  (get) => get(countAtom),
  (get, set) => set(countAtom, get(countAtom) - 1)
)

// 使用例
function Counter() {
  const [count, setCount] = useAtom(countAtom)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
    </div>
  )
}
```

## アーキテクチャの違い

### データフロー

```typescript
// Zustand: トップダウン（ストアから各コンポーネントへ）
//
//     ┌─────────┐
//     │  Store  │
//     └────┬────┘
//     ┌────┴────┐
//     │         │
// ┌───▼───┐ ┌──▼────┐
// │ Comp1 │ │ Comp2 │
// └───────┘ └───────┘

const useStore = create((set) => ({
  user: null,
  posts: [],
  comments: [],
  // すべての状態を一箇所で管理
}))

// Jotai: ボトムアップ（アトムを組み合わせて状態を構築）
//
// ┌──────┐  ┌──────┐  ┌──────┐
// │Atom1 │  │Atom2 │  │Atom3 │
// └───┬──┘  └───┬──┘  └───┬──┘
//     │         │         │
//     └────┬────┴────┬────┘
//          │         │
//      ┌───▼───┐ ┌──▼────┐
//      │ Comp1 │ │ Comp2 │
//      └───────┘ └───────┘

const userAtom = atom(null)
const postsAtom = atom([])
const commentsAtom = atom([])
// 各状態が独立したアトム
```

### 状態の更新

```typescript
// Zustand: immer風の更新
const useStore = create<State>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  updateUserName: (name) =>
    set((state) => ({
      user: state.user ? { ...state.user, name } : null
    }))
}))

// Jotai: ReactのuseStateと同じ感覚
const userAtom = atom<User | null>(null)

function Component() {
  const [user, setUser] = useAtom(userAtom)

  // 直接更新
  setUser({ id: '1', name: 'John' })

  // 関数更新
  setUser((prev) => prev ? { ...prev, name: 'Jane' } : null)
}
```

## 基本的な使い方

### Zustandの基本パターン

```typescript
// 1. シンプルなストア
interface TodoStore {
  todos: Todo[]
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
}

const useTodoStore = create<TodoStore>((set) => ({
  todos: [],
  addTodo: (text) =>
    set((state) => ({
      todos: [...state.todos, { id: crypto.randomUUID(), text, done: false }]
    })),
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      )
    })),
  removeTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id)
    }))
}))

// 2. セレクターで最適化
function TodoList() {
  // 必要な状態だけ購読
  const todos = useTodoStore((state) => state.todos)
  const toggleTodo = useTodoStore((state) => state.toggleTodo)

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => toggleTodo(todo.id)}
          />
          {todo.text}
        </li>
      ))}
    </ul>
  )
}

// 3. 複数ストアの組み合わせ
const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  login: async (credentials) => {
    const user = await api.login(credentials)
    set({ user })
  },
  logout: () => set({ user: null })
}))

const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item]
    }))
}))

function App() {
  const user = useAuthStore((state) => state.user)
  const items = useCartStore((state) => state.items)

  return <div>{/* ... */}</div>
}
```

### Jotaiの基本パターン

```typescript
// 1. プリミティブアトム
const todosAtom = atom<Todo[]>([])

// 2. 派生アトム（読み取り専用）
const completedTodosAtom = atom((get) => {
  const todos = get(todosAtom)
  return todos.filter((todo) => todo.done)
})

const todoStatsAtom = atom((get) => {
  const todos = get(todosAtom)
  return {
    total: todos.length,
    completed: todos.filter((t) => t.done).length,
    active: todos.filter((t) => !t.done).length
  }
})

// 3. 読み書きアトム
const addTodoAtom = atom(
  null,
  (get, set, text: string) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      done: false
    }
    set(todosAtom, [...get(todosAtom), newTodo])
  }
)

const toggleTodoAtom = atom(
  null,
  (get, set, id: string) => {
    set(
      todosAtom,
      get(todosAtom).map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      )
    )
  }
)

// 4. 使用例
function TodoList() {
  const [todos] = useAtom(todosAtom)
  const [, addTodo] = useAtom(addTodoAtom)
  const [, toggleTodo] = useAtom(toggleTodoAtom)
  const [stats] = useAtom(todoStatsAtom)

  return (
    <div>
      <p>Total: {stats.total}, Completed: {stats.completed}</p>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
            />
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### 非同期処理

```typescript
// Zustand
const useUserStore = create<UserStore>((set) => ({
  user: null,
  loading: false,
  error: null,
  fetchUser: async (id) => {
    set({ loading: true, error: null })
    try {
      const user = await api.getUser(id)
      set({ user, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  }
}))

// Jotai
const userIdAtom = atom<string | null>(null)

const userAtom = atom(async (get) => {
  const userId = get(userIdAtom)
  if (!userId) return null
  return api.getUser(userId)
})

function UserProfile() {
  const [userId, setUserId] = useAtom(userIdAtom)
  const [user] = useAtom(userAtom) // 自動的にSuspense対応

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>{user?.name}</div>
    </Suspense>
  )
}
```

## パフォーマンス比較

### レンダリング最適化

```typescript
// Zustand: セレクターによる最適化
function TodoItem({ id }: { id: string }) {
  // この todo が変更された時だけ再レンダリング
  const todo = useTodoStore(
    (state) => state.todos.find((t) => t.id === id),
    shallow // 浅い比較
  )

  return <div>{todo?.text}</div>
}

// Jotai: アトムの粒度による最適化
const todoAtom = atomFamily((id: string) =>
  atom((get) => {
    const todos = get(todosAtom)
    return todos.find((t) => t.id === id)
  })
)

function TodoItem({ id }: { id: string }) {
  // この todo が変更された時だけ再レンダリング
  const [todo] = useAtom(todoAtom(id))

  return <div>{todo?.text}</div>
}
```

### atomFamilyパターン

```typescript
// Jotai: 動的なアトム生成
import { atomFamily } from 'jotai/utils'

const todoAtomFamily = atomFamily((id: string) =>
  atom(
    (get) => get(todosAtom).find((t) => t.id === id),
    (get, set, update: Partial<Todo>) => {
      set(
        todosAtom,
        get(todosAtom).map((t) =>
          t.id === id ? { ...t, ...update } : t
        )
      )
    }
  )
)

function TodoItem({ id }: { id: string }) {
  const [todo, updateTodo] = useAtom(todoAtomFamily(id))

  return (
    <div>
      <input
        type="checkbox"
        checked={todo?.done}
        onChange={(e) => updateTodo({ done: e.target.checked })}
      />
      {todo?.text}
    </div>
  )
}

// Zustand: スライスパターンで近い効果
const createTodoSlice = (id: string) => (set: SetState, get: GetState) => ({
  [`todo_${id}`]: null as Todo | null,
  [`updateTodo_${id}`]: (update: Partial<Todo>) =>
    set((state) => ({
      [`todo_${id}`]: { ...state[`todo_${id}`], ...update }
    }))
})
```

## DevToolsとデバッグ

### Zustand DevTools

```typescript
import { devtools } from 'zustand/middleware'

const useStore = create<Store>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment'),
      decrement: () => set((state) => ({ count: state.count - 1 }), false, 'decrement')
    }),
    { name: 'CounterStore' }
  )
)

// Redux DevToolsで状態を可視化
```

### Jotai DevTools

```typescript
import { useAtomDevtools } from 'jotai-devtools'

function DebugAtoms() {
  useAtomDevtools(countAtom, { name: 'count' })
  useAtomDevtools(userAtom, { name: 'user' })

  return null
}

// または専用のDevToolsパネル
import { DevTools } from 'jotai-devtools'

function App() {
  return (
    <>
      <DevTools />
      <YourApp />
    </>
  )
}
```

### ロギング

```typescript
// Zustand: ミドルウェアでロギング
const log = (config) => (set, get, api) =>
  config(
    (...args) => {
      console.log('Before:', get())
      set(...args)
      console.log('After:', get())
    },
    get,
    api
  )

const useStore = create<Store>()(
  log((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 }))
  }))
)

// Jotai: カスタムフック
function useAtomWithLog<T>(anAtom: Atom<T>) {
  const [value, setValue] = useAtom(anAtom)

  const setValueWithLog = useCallback((update: SetStateAction<T>) => {
    console.log('Before:', value)
    setValue(update)
    console.log('After:', update)
  }, [value, setValue])

  return [value, setValueWithLog] as const
}
```

## 実践パターン

### ECサイトのカート

```typescript
// Zustand実装
interface CartStore {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clear: () => void
  total: number
}

const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.product.id === product.id)
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
      }
      return {
        items: [...state.items, { product, quantity: 1 }]
      }
    }),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId)
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    })),
  clear: () => set({ items: [] }),
  get total() {
    return get().items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    )
  }
}))

// Jotai実装
const cartItemsAtom = atom<CartItem[]>([])

const addItemAtom = atom(null, (get, set, product: Product) => {
  const items = get(cartItemsAtom)
  const existing = items.find((item) => item.product.id === product.id)

  if (existing) {
    set(
      cartItemsAtom,
      items.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    )
  } else {
    set(cartItemsAtom, [...items, { product, quantity: 1 }])
  }
})

const cartTotalAtom = atom((get) => {
  const items = get(cartItemsAtom)
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
})
```

### フォーム管理

```typescript
// Zustand
interface FormStore {
  values: Record<string, any>
  errors: Record<string, string>
  touched: Record<string, boolean>
  setFieldValue: (field: string, value: any) => void
  setFieldError: (field: string, error: string) => void
  setFieldTouched: (field: string) => void
  reset: () => void
}

const useFormStore = create<FormStore>((set) => ({
  values: {},
  errors: {},
  touched: {},
  setFieldValue: (field, value) =>
    set((state) => ({
      values: { ...state.values, [field]: value }
    })),
  setFieldError: (field, error) =>
    set((state) => ({
      errors: { ...state.errors, [field]: error }
    })),
  setFieldTouched: (field) =>
    set((state) => ({
      touched: { ...state.touched, [field]: true }
    })),
  reset: () => set({ values: {}, errors: {}, touched: {} })
}))

// Jotai
const formValuesAtom = atom<Record<string, any>>({})
const formErrorsAtom = atom<Record<string, string>>({})
const formTouchedAtom = atom<Record<string, boolean>>({})

const fieldAtomFamily = atomFamily((field: string) =>
  atom(
    (get) => get(formValuesAtom)[field],
    (get, set, value: any) => {
      set(formValuesAtom, { ...get(formValuesAtom), [field]: value })
    }
  )
)
```

## 使い分けガイド

### Zustandが向いているケース

```typescript
/**
 * Zustandを選ぶべきケース
 *
 * 1. グローバルな状態管理
 *    - 認証、テーマ、通知等
 *
 * 2. アクションが多い
 *    - 複雑なビジネスロジック
 *
 * 3. ミドルウェアが必要
 *    - persist、devtools等
 *
 * 4. Redux経験者
 *    - 似たような設計思想
 */

// 認証状態の管理
const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (credentials) => {
        const { user, token } = await api.login(credentials)
        set({ user, token })
      },
      logout: () => set({ user: null, token: null }),
      refreshToken: async () => {
        const token = await api.refreshToken()
        set({ token })
      }
    }),
    { name: 'auth-storage' }
  )
)
```

### Jotaiが向いているケース

```typescript
/**
 * Jotaiを選ぶべきケース
 *
 * 1. 派生状態が多い
 *    - フィルター、ソート、集計等
 *
 * 2. 状態が分散している
 *    - 各コンポーネントが独立した状態
 *
 * 3. Suspense/Concurrent Mode
 *    - React 18の機能をフル活用
 *
 * 4. 型安全性重視
 *    - TypeScriptの型推論が強力
 */

// フィルター可能なリスト
const itemsAtom = atom<Item[]>([])
const filterAtom = atom('')
const sortByAtom = atom<'name' | 'date'>('name')

const filteredItemsAtom = atom((get) => {
  const items = get(itemsAtom)
  const filter = get(filterAtom)
  const sortBy = get(sortByAtom)

  return items
    .filter((item) => item.name.includes(filter))
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      return a.date.getTime() - b.date.getTime()
    })
})
```

## マイグレーション

### ZustandからJotaiへ

```typescript
// Before: Zustand
const useStore = create<Store>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}))

function Component() {
  const { count, increment } = useStore()
  return <button onClick={increment}>{count}</button>
}

// After: Jotai
const countAtom = atom(0)
const incrementAtom = atom(null, (get, set) => {
  set(countAtom, get(countAtom) + 1)
})

function Component() {
  const [count] = useAtom(countAtom)
  const [, increment] = useAtom(incrementAtom)
  return <button onClick={increment}>{count}</button>
}
```

### JotaiからZustandへ

```typescript
// Before: Jotai
const countAtom = atom(0)
const doubleCountAtom = atom((get) => get(countAtom) * 2)

function Component() {
  const [count, setCount] = useAtom(countAtom)
  const [doubleCount] = useAtom(doubleCountAtom)
  return <div>{count} / {doubleCount}</div>
}

// After: Zustand
const useStore = create<Store>((set, get) => ({
  count: 0,
  get doubleCount() {
    return get().count * 2
  },
  setCount: (count) => set({ count })
}))

function Component() {
  const count = useStore((state) => state.count)
  const doubleCount = useStore((state) => state.doubleCount)
  const setCount = useStore((state) => state.setCount)
  return <div>{count} / {doubleCount}</div>
}
```

## まとめ

ZustandとJotaiは、それぞれ異なる哲学を持つ優れた状態管理ライブラリです。

**Zustand**:
- ストアベース、トップダウン設計
- シンプルで分かりやすい
- ミドルウェアが豊富
- Redux経験者に馴染みやすい

**Jotai**:
- アトミックベース、ボトムアップ設計
- 派生状態が自然
- Suspense/Concurrent Mode対応
- 型安全性が高い

**選択基準**:
- グローバルな状態が多い → Zustand
- 派生状態・分散した状態が多い → Jotai
- ミドルウェアが必要 → Zustand
- React 18の機能を活用 → Jotai

プロジェクトの要件に応じて、適切なライブラリを選択しましょう。
