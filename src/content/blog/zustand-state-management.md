---
title: 'Zustand完全ガイド — React状態管理の決定版（TypeScript・Middleware・テスト）'
description: 'ZustandによるReact状態管理を完全解説。基本的な使い方からimmer・devtools・persist middleware・スライスパターン・Jotaiとの比較・テスト戦略まで実装例付きで網羅。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

Reactアプリケーションの規模が大きくなると、コンポーネント間の状態共有が複雑になる。`useState` と `useContext` だけでは管理しきれなくなったとき、多くの開発者が状態管理ライブラリの導入を検討する。

Redux、Recoil、Jotai、Zustand — 選択肢は豊富だが、2024年以降のエコシステムでは **Zustand** が実用性・シンプルさ・パフォーマンスの三点でもっともバランスが取れた選択肢として評価されている。

本記事では、Zustandの基礎から本番運用レベルの高度なパターンまで、TypeScriptの型定義とともに体系的に解説する。

---

## 1. Zustandとは — なぜ今Zustandなのか

Zustand（ドイツ語で「状態」）は、Poimandres（pmndrs）が開発した軽量な状態管理ライブラリだ。バンドルサイズは約1KB（gzip後）と極めて小さく、ボイラープレートが最小限で、TypeScriptサポートが完璧に近い。

### 主要ライブラリとの比較

| 特徴 | Redux Toolkit | Recoil | Jotai | Zustand |
|------|--------------|--------|-------|---------|
| バンドルサイズ | ~14KB | ~21KB | ~3KB | ~1KB |
| ボイラープレート | 多い | 中程度 | 少ない | 最小 |
| DevTools | Redux DevTools | あり | あり | Redux DevTools |
| Atomic設計 | No | Yes | Yes | No（Store中心） |
| Context依存 | No | Yes | Yes | No |
| Server Components | 対応 | 難しい | 対応 | 対応 |
| 学習コスト | 高い | 中程度 | 低い | 最低 |

**Reduxとの違い**: Reduxはaction → reducer → storeという厳格なデータフローを強制する。Zustandはそのような制約がなく、storeとactionをひとつの関数で定義できる。大規模チームでの一貫性はReduxが優れるが、開発速度ではZustandが圧倒的に速い。

**Recoilとの違い**: RecoilはFacebook（Meta）製で、atomという細粒度の状態単位を使う。Context APIに依存しているため、Server Componentsとの相性が悪く、Facebook自体もメンテナンスが停滞している。

**Jotaiとの違い**: Jotaiも同じpmndrチームが作ったatomベースのライブラリだ。Zustandはグローバルなstore中心設計、JotaiはReact Contextに近いbottom-up設計という違いがある。複雑な依存関係を持つ状態にはJotai、シンプルなグローバル状態にはZustandが向く。

**Zustandを選ぶべきケース**:
- シンプルなグローバル状態が欲しい
- ボイラープレートを最小化したい
- Redux DevToolsでデバッグしたい
- Server Componentsと共存させたい
- テストが書きやすいライブラリが欲しい

---

## 2. インストールと基本的なStore作成（TypeScript）

```bash
npm install zustand
# または
pnpm add zustand
```

### 最初のStoreを作る

```typescript
// src/store/counter-store.ts
import { create } from 'zustand'

// 型定義
interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
  incrementBy: (amount: number) => void
}

// Storeの作成
export const useCounterStore = create<CounterState>((set) => ({
  // 状態の初期値
  count: 0,

  // アクション
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
  incrementBy: (amount) => set((state) => ({ count: state.count + amount })),
}))
```

### コンポーネントでの使用

```typescript
// src/components/Counter.tsx
import { useCounterStore } from '@/store/counter-store'

export function Counter() {
  // 必要な状態だけを選択（再レンダリング最適化の基本）
  const count = useCounterStore((state) => state.count)
  const increment = useCounterStore((state) => state.increment)
  const decrement = useCounterStore((state) => state.decrement)
  const reset = useCounterStore((state) => state.reset)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
      <button onClick={decrement}>-1</button>
      <button onClick={reset}>Reset</button>
    </div>
  )
}
```

Zustandのstoreはカスタムフックとして使う。`useCounterStore` にセレクター関数を渡すと、その部分の状態だけをサブスクライブし、変化があったときだけ再レンダリングされる。

### getを使った状態の読み取り

`set` 関数に加えて `get` 関数を使うと、アクション内で現在の状態を参照できる。

```typescript
import { create } from 'zustand'

interface CartState {
  items: CartItem[]
  totalPrice: number
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalPrice: 0,

  addItem: (newItem) => {
    const { items } = get() // 現在の状態を取得
    const existingItem = items.find((item) => item.id === newItem.id)

    if (existingItem) {
      set({
        items: items.map((item) =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      })
    } else {
      set({ items: [...items, { ...newItem, quantity: 1 }] })
    }

    // totalPriceを再計算
    const updatedItems = get().items
    set({ totalPrice: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0) })
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
    const updatedItems = get().items
    set({ totalPrice: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0) })
  },

  clearCart: () => set({ items: [], totalPrice: 0 }),
}))
```

---

## 3. Actionの設計パターン

Zustandのアクション設計にはいくつかのパターンがある。プロジェクトの規模と複雑さに応じて選択する。

### パターン1: Store内にアクションを定義（推奨）

もっともシンプルで直感的なパターン。アクションをstoreの一部として定義する。

```typescript
// src/store/user-store.ts
import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'guest'
}

interface UserState {
  currentUser: User | null
  users: User[]
  isLoading: boolean
  error: string | null

  // Actions
  setCurrentUser: (user: User | null) => void
  addUser: (user: User) => void
  updateUser: (id: string, updates: Partial<User>) => void
  deleteUser: (id: string) => void
  clearError: () => void
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  users: [],
  isLoading: false,
  error: null,

  setCurrentUser: (user) => set({ currentUser: user }),

  addUser: (user) =>
    set((state) => ({ users: [...state.users, user] })),

  updateUser: (id, updates) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === id ? { ...user, ...updates } : user
      ),
    })),

  deleteUser: (id) =>
    set((state) => ({
      users: state.users.filter((user) => user.id !== id),
    })),

  clearError: () => set({ error: null }),
}))
```

### パターン2: Store外にアクションを定義（セパレーション）

パフォーマンスが重要な場合、アクションをStoreの外に定義することで、コンポーネントがアクション関数自体の変化で再レンダリングされることを防げる。

```typescript
// store/auth-store.ts
import { create } from 'zustand'

interface AuthState {
  token: string | null
  userId: string | null
  isAuthenticated: boolean
}

// Storeは純粋な状態のみ
export const useAuthStore = create<AuthState>(() => ({
  token: null,
  userId: null,
  isAuthenticated: false,
}))

// アクションをStore外に定義（再レンダリングの影響を受けない）
export const authActions = {
  login: (token: string, userId: string) => {
    useAuthStore.setState({ token, userId, isAuthenticated: true })
  },
  logout: () => {
    useAuthStore.setState({ token: null, userId: null, isAuthenticated: false })
  },
  refreshToken: (newToken: string) => {
    useAuthStore.setState({ token: newToken })
  },
}
```

---

## 4. immer middleware — イミュータブル更新の簡略化

ネストした状態を更新するとき、スプレッド演算子を何重にも書くのは面倒だ。`immer` middlewareを使うと、ミュータブルな書き方でイミュータブルな更新ができる。

```bash
npm install immer
```

```typescript
// src/store/todo-store.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface Todo {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  tags: string[]
  subTasks: SubTask[]
}

interface SubTask {
  id: string
  title: string
  completed: boolean
}

interface TodoState {
  todos: Todo[]
  filter: 'all' | 'active' | 'completed'

  addTodo: (title: string, priority?: Todo['priority']) => void
  toggleTodo: (id: string) => void
  addSubTask: (todoId: string, title: string) => void
  toggleSubTask: (todoId: string, subTaskId: string) => void
  addTag: (todoId: string, tag: string) => void
  setFilter: (filter: TodoState['filter']) => void
}

export const useTodoStore = create<TodoState>()(
  immer((set) => ({
    todos: [],
    filter: 'all',

    addTodo: (title, priority = 'medium') =>
      set((state) => {
        // immerにより、直接pushできる（内部でイミュータブルに変換される）
        state.todos.push({
          id: crypto.randomUUID(),
          title,
          completed: false,
          priority,
          tags: [],
          subTasks: [],
        })
      }),

    toggleTodo: (id) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id)
        if (todo) {
          // 直接変更できる！
          todo.completed = !todo.completed
        }
      }),

    addSubTask: (todoId, title) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === todoId)
        if (todo) {
          todo.subTasks.push({
            id: crypto.randomUUID(),
            title,
            completed: false,
          })
        }
      }),

    toggleSubTask: (todoId, subTaskId) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === todoId)
        const subTask = todo?.subTasks.find((s) => s.id === subTaskId)
        if (subTask) {
          subTask.completed = !subTask.completed
        }
      }),

    addTag: (todoId, tag) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === todoId)
        if (todo && !todo.tags.includes(tag)) {
          todo.tags.push(tag)
        }
      }),

    setFilter: (filter) =>
      set((state) => {
        state.filter = filter
      }),
  }))
)
```

immerを使わない場合のネスト更新と比較すると、コードの明瞭さが大幅に向上することがわかる。

```typescript
// immerなし（冗長）
toggleSubTask: (todoId, subTaskId) =>
  set((state) => ({
    todos: state.todos.map((todo) =>
      todo.id === todoId
        ? {
            ...todo,
            subTasks: todo.subTasks.map((subTask) =>
              subTask.id === subTaskId
                ? { ...subTask, completed: !subTask.completed }
                : subTask
            ),
          }
        : todo
    ),
  })),

// immerあり（直感的）
toggleSubTask: (todoId, subTaskId) =>
  set((state) => {
    const subTask = state.todos
      .find((t) => t.id === todoId)
      ?.subTasks.find((s) => s.id === subTaskId)
    if (subTask) subTask.completed = !subTask.completed
  }),
```

---

## 5. devtools middleware — Redux DevTools連携

Redux DevToolsブラウザ拡張機能でZustandのstoreをデバッグできる。

```typescript
// src/store/app-store.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface AppState {
  theme: 'light' | 'dark'
  language: 'ja' | 'en'
  sidebarOpen: boolean

  toggleTheme: () => void
  setLanguage: (lang: AppState['language']) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    immer((set) => ({
      theme: 'light',
      language: 'ja',
      sidebarOpen: true,

      toggleTheme: () =>
        set(
          (state) => {
            state.theme = state.theme === 'light' ? 'dark' : 'light'
          },
          false,           // replace フラグ（falseでmerge）
          'toggleTheme'    // DevToolsに表示されるアクション名
        ),

      setLanguage: (lang) =>
        set(
          (state) => { state.language = lang },
          false,
          { type: 'setLanguage', payload: lang } // オブジェクト形式も可
        ),

      toggleSidebar: () =>
        set(
          (state) => { state.sidebarOpen = !state.sidebarOpen },
          false,
          'toggleSidebar'
        ),
    })),
    {
      name: 'AppStore',           // DevToolsでのStore名
      enabled: process.env.NODE_ENV !== 'production', // 本番では無効化
    }
  )
)
```

複数のStoreを扱う場合、それぞれに異なる `name` を設定すると、DevToolsでの識別が容易になる。

---

## 6. persist middleware — localStorage永続化

ページリロード後も状態を保持したい場合は `persist` middlewareを使う。

```typescript
// src/store/settings-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  recentSearches: string[]
}

interface SettingsState extends UserSettings {
  updateTheme: (theme: UserSettings['theme']) => void
  updateFontSize: (size: UserSettings['fontSize']) => void
  updateNotification: (key: keyof UserSettings['notifications'], value: boolean) => void
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void
  resetSettings: () => void
}

const defaultSettings: UserSettings = {
  theme: 'system',
  fontSize: 'medium',
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
  recentSearches: [],
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateTheme: (theme) => set({ theme }),

      updateFontSize: (fontSize) => set({ fontSize }),

      updateNotification: (key, value) =>
        set((state) => ({
          notifications: { ...state.notifications, [key]: value },
        })),

      addRecentSearch: (query) =>
        set((state) => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter((s) => s !== query),
          ].slice(0, 10), // 最大10件保持
        })),

      clearRecentSearches: () => set({ recentSearches: [] }),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'user-settings',          // localStorageのキー名
      storage: createJSONStorage(() => localStorage),
      
      // 永続化する項目を選択（デフォルトは全項目）
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        notifications: state.notifications,
        // recentSearchesは永続化しない場合はここに含めない
        recentSearches: state.recentSearches,
      }),

      // バージョン管理（スキーマ変更時のマイグレーション）
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // v0からv1へのマイグレーション
          const state = persistedState as Partial<UserSettings>
          return {
            ...defaultSettings,
            ...state,
            notifications: {
              ...defaultSettings.notifications,
              ...(state.notifications ?? {}),
            },
          }
        }
        return persistedState as UserSettings
      },
    }
  )
)
```

### sessionStorageへの永続化

```typescript
// セッション限定の永続化
export const useSessionStore = create<SomeState>()(
  persist(
    (set) => ({ /* ... */ }),
    {
      name: 'session-data',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
```

### カスタムストレージの実装

```typescript
// IndexedDBを使ったカスタムストレージ
import { StateStorage } from 'zustand/middleware'

const indexedDBStorage: StateStorage = {
  getItem: async (name) => {
    // IndexedDB読み取り実装
    return null
  },
  setItem: async (name, value) => {
    // IndexedDB書き込み実装
  },
  removeItem: async (name) => {
    // IndexedDB削除実装
  },
}
```

---

## 7. スライスパターン — 大規模アプリ向け設計

アプリが大きくなると、単一のStoreが肥大化する。スライスパターンを使うと、機能ごとにStoreを分割しつつ、単一のStoreとして使える。

```typescript
// src/store/slices/auth-slice.ts
import { StateCreator } from 'zustand'
import { RootStore } from '../root-store'

export interface AuthSlice {
  token: string | null
  userId: string | null
  isAuthenticated: boolean
  login: (token: string, userId: string) => void
  logout: () => void
}

export const createAuthSlice: StateCreator<
  RootStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  AuthSlice
> = (set) => ({
  token: null,
  userId: null,
  isAuthenticated: false,

  login: (token, userId) =>
    set(
      (state) => {
        state.token = token
        state.userId = userId
        state.isAuthenticated = true
      },
      false,
      'auth/login'
    ),

  logout: () =>
    set(
      (state) => {
        state.token = null
        state.userId = null
        state.isAuthenticated = false
        // ログアウト時にカートもクリア（他のスライスにアクセス）
        state.cartItems = []
      },
      false,
      'auth/logout'
    ),
})
```

```typescript
// src/store/slices/cart-slice.ts
import { StateCreator } from 'zustand'
import { RootStore } from '../root-store'

export interface CartSlice {
  cartItems: CartItem[]
  cartTotal: number
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export const createCartSlice: StateCreator<
  RootStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  CartSlice
> = (set, get) => ({
  cartItems: [],
  cartTotal: 0,

  addToCart: (item) =>
    set(
      (state) => {
        const existing = state.cartItems.find((i) => i.id === item.id)
        if (existing) {
          existing.quantity += 1
        } else {
          state.cartItems.push({ ...item, quantity: 1 })
        }
        state.cartTotal = state.cartItems.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        )
      },
      false,
      'cart/addToCart'
    ),

  removeFromCart: (id) =>
    set(
      (state) => {
        state.cartItems = state.cartItems.filter((i) => i.id !== id)
        state.cartTotal = state.cartItems.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        )
      },
      false,
      'cart/removeFromCart'
    ),

  updateQuantity: (id, quantity) =>
    set(
      (state) => {
        const item = state.cartItems.find((i) => i.id === id)
        if (item) {
          item.quantity = Math.max(0, quantity)
          if (item.quantity === 0) {
            state.cartItems = state.cartItems.filter((i) => i.id !== id)
          }
        }
        state.cartTotal = state.cartItems.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        )
      },
      false,
      'cart/updateQuantity'
    ),
})
```

```typescript
// src/store/root-store.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { AuthSlice, createAuthSlice } from './slices/auth-slice'
import { CartSlice, createCartSlice } from './slices/cart-slice'

// RootStoreは全スライスの合成型
export type RootStore = AuthSlice & CartSlice

export const useRootStore = create<RootStore>()(
  devtools(
    immer((...args) => ({
      ...createAuthSlice(...args),
      ...createCartSlice(...args),
    })),
    { name: 'RootStore' }
  )
)

// 型安全なスライスごとのフック（再レンダリング最適化）
export const useAuthStore = () => useRootStore((state) => ({
  token: state.token,
  userId: state.userId,
  isAuthenticated: state.isAuthenticated,
  login: state.login,
  logout: state.logout,
}))

export const useCartStore = () => useRootStore((state) => ({
  cartItems: state.cartItems,
  cartTotal: state.cartTotal,
  addToCart: state.addToCart,
  removeFromCart: state.removeFromCart,
  updateQuantity: state.updateQuantity,
}))
```

---

## 8. セレクターと再レンダリング最適化

Zustandのパフォーマンス最適化の核心はセレクターにある。

### 基本的なセレクター

```typescript
// 悪い例: storeオブジェクト全体を購読（どのプロパティが変わっても再レンダリング）
const store = useProductStore()

// 良い例: 必要なプロパティだけを購読
const products = useProductStore((state) => state.products)
const isLoading = useProductStore((state) => state.isLoading)
```

### shallowを使った複数プロパティの最適化

複数のプロパティを一度に取得したい場合は `shallow` を使う。

```typescript
import { useShallow } from 'zustand/react/shallow'

interface ProductStore {
  products: Product[]
  selectedCategory: string
  isLoading: boolean
  error: string | null
  fetchProducts: (category: string) => Promise<void>
  setCategory: (category: string) => void
}

function ProductList() {
  // shallowを使わない場合: オブジェクトが毎回新規作成されるため常に再レンダリング
  // const { products, isLoading } = useProductStore(state => ({ products: state.products, isLoading: state.isLoading }))

  // shallowを使う場合: 各プロパティの値が変わったときだけ再レンダリング
  const { products, isLoading, error } = useProductStore(
    useShallow((state) => ({
      products: state.products,
      isLoading: state.isLoading,
      error: state.error,
    }))
  )

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <ul>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  )
}
```

### 派生状態のセレクター（メモ化）

```typescript
// 計算コストの高いセレクターはuseMemoで最適化
function CartSummary() {
  const cartItems = useCartStore((state) => state.cartItems)

  // 派生状態はコンポーネント側でメモ化
  const summary = useMemo(() => ({
    itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    hasItems: cartItems.length > 0,
  }), [cartItems])

  return (
    <div>
      <p>{summary.itemCount}点 合計: ¥{summary.totalPrice.toLocaleString()}</p>
    </div>
  )
}
```

### Store外でのサブスクライブ（subscribe API）

Reactコンポーネント外でstoreの変化を監視できる。

```typescript
// コンポーネント外でのstore監視
const unsubscribe = useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated) => {
    if (!isAuthenticated) {
      // ログアウト時にリダイレクト
      router.push('/login')
    }
  }
)

// クリーンアップ
unsubscribe()
```

---

## 9. 非同期アクション — fetch・loading・error状態管理

実際のアプリケーションではAPI通信が不可欠だ。Zustandは非同期アクションをシンプルに扱える。

```typescript
// src/store/product-store.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface Product {
  id: string
  name: string
  price: number
  category: string
  imageUrl: string
  stock: number
}

interface ProductState {
  products: Product[]
  selectedProduct: Product | null
  isLoading: boolean
  isSaving: boolean
  error: string | null

  // 非同期アクション
  fetchProducts: (category?: string) => Promise<void>
  fetchProductById: (id: string) => Promise<void>
  createProduct: (data: Omit<Product, 'id'>) => Promise<Product | null>
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>

  // 同期アクション
  selectProduct: (product: Product | null) => void
  clearError: () => void
}

export const useProductStore = create<ProductState>()(
  devtools(
    (set, get) => ({
      products: [],
      selectedProduct: null,
      isLoading: false,
      isSaving: false,
      error: null,

      fetchProducts: async (category) => {
        set({ isLoading: true, error: null })
        try {
          const url = category
            ? `/api/products?category=${category}`
            : '/api/products'
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const products: Product[] = await response.json()
          set({ products, isLoading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '商品の取得に失敗しました',
            isLoading: false,
          })
        }
      },

      fetchProductById: async (id) => {
        // まずキャッシュを確認
        const cached = get().products.find((p) => p.id === id)
        if (cached) {
          set({ selectedProduct: cached })
          return
        }

        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`/api/products/${id}`)
          if (!response.ok) throw new Error('商品が見つかりません')

          const product: Product = await response.json()
          set({ selectedProduct: product, isLoading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'エラーが発生しました',
            isLoading: false,
          })
        }
      },

      createProduct: async (data) => {
        set({ isSaving: true, error: null })
        try {
          const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!response.ok) throw new Error('商品の作成に失敗しました')

          const newProduct: Product = await response.json()
          set((state) => ({
            products: [...state.products, newProduct],
            isSaving: false,
          }))
          return newProduct
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'エラーが発生しました',
            isSaving: false,
          })
          return null
        }
      },

      updateProduct: async (id, data) => {
        // 楽観的更新（即座にUIを更新してUXを向上）
        const previousProducts = get().products
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }))

        try {
          const response = await fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!response.ok) throw new Error('更新に失敗しました')
        } catch (error) {
          // 失敗時はロールバック
          set({ products: previousProducts, error: '更新に失敗しました' })
        }
      },

      deleteProduct: async (id) => {
        const previousProducts = get().products
        // 楽観的削除
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }))

        try {
          const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
          if (!response.ok) throw new Error('削除に失敗しました')
        } catch (error) {
          // ロールバック
          set({ products: previousProducts, error: '削除に失敗しました' })
        }
      },

      selectProduct: (product) => set({ selectedProduct: product }),
      clearError: () => set({ error: null }),
    }),
    { name: 'ProductStore' }
  )
)
```

---

## 10. Contextとの組み合わせ — 複数Store・スコープ管理

同じStoreを複数のスコープで独立して使いたい場合（例: 複数のフォームが独立した状態を持つ）、ZustandをContextと組み合わせる。

```typescript
// src/store/form-store-context.tsx
import { createContext, useContext, useRef } from 'react'
import { createStore, useStore } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface FormState {
  values: Record<string, string>
  errors: Record<string, string>
  isDirty: boolean
  isSubmitting: boolean

  setValue: (field: string, value: string) => void
  setError: (field: string, error: string) => void
  clearError: (field: string) => void
  setSubmitting: (isSubmitting: boolean) => void
  reset: () => void
}

// createStore（useCreateではなくcreateStoreでインスタンスを作る）
type FormStore = ReturnType<typeof createFormStore>

const createFormStore = (initialValues: Record<string, string> = {}) =>
  createStore<FormState>()(
    immer((set) => ({
      values: initialValues,
      errors: {},
      isDirty: false,
      isSubmitting: false,

      setValue: (field, value) =>
        set((state) => {
          state.values[field] = value
          state.isDirty = true
          delete state.errors[field] // 入力時にエラーをクリア
        }),

      setError: (field, error) =>
        set((state) => { state.errors[field] = error }),

      clearError: (field) =>
        set((state) => { delete state.errors[field] }),

      setSubmitting: (isSubmitting) => set({ isSubmitting }),

      reset: () =>
        set((state) => {
          state.values = initialValues
          state.errors = {}
          state.isDirty = false
          state.isSubmitting = false
        }),
    }))
  )

// Context
const FormStoreContext = createContext<FormStore | null>(null)

// Provider
export function FormProvider({
  children,
  initialValues,
}: {
  children: React.ReactNode
  initialValues?: Record<string, string>
}) {
  const storeRef = useRef<FormStore>()
  if (!storeRef.current) {
    storeRef.current = createFormStore(initialValues)
  }

  return (
    <FormStoreContext.Provider value={storeRef.current}>
      {children}
    </FormStoreContext.Provider>
  )
}

// カスタムフック
export function useFormStore<T>(selector: (state: FormState) => T) {
  const store = useContext(FormStoreContext)
  if (!store) {
    throw new Error('useFormStore must be used within FormProvider')
  }
  return useStore(store, selector)
}

// 使用例
function ContactForm() {
  return (
    <FormProvider initialValues={{ name: '', email: '', message: '' }}>
      <ContactFormFields />
    </FormProvider>
  )
}

function ContactFormFields() {
  const values = useFormStore((state) => state.values)
  const errors = useFormStore((state) => state.errors)
  const setValue = useFormStore((state) => state.setValue)

  return (
    <form>
      <input
        value={values.name ?? ''}
        onChange={(e) => setValue('name', e.target.value)}
      />
      {errors.name && <span>{errors.name}</span>}
    </form>
  )
}
```

---

## 11. テスト戦略 — Vitest + Testing Library

ZustandのStoreはシンプルな関数なので、テストが書きやすい。

### Storeのユニットテスト

```typescript
// src/store/__tests__/counter-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCounterStore } from '../counter-store'

describe('CounterStore', () => {
  // 各テスト前にStoreをリセット
  beforeEach(() => {
    useCounterStore.setState({ count: 0 })
  })

  it('初期値は0', () => {
    expect(useCounterStore.getState().count).toBe(0)
  })

  it('incrementで1増加する', () => {
    useCounterStore.getState().increment()
    expect(useCounterStore.getState().count).toBe(1)
  })

  it('decrementで1減少する', () => {
    useCounterStore.setState({ count: 5 })
    useCounterStore.getState().decrement()
    expect(useCounterStore.getState().count).toBe(4)
  })

  it('resetで0に戻る', () => {
    useCounterStore.setState({ count: 100 })
    useCounterStore.getState().reset()
    expect(useCounterStore.getState().count).toBe(0)
  })

  it('incrementByで指定量増加する', () => {
    useCounterStore.getState().incrementBy(5)
    expect(useCounterStore.getState().count).toBe(5)
  })
})
```

### 非同期アクションのテスト

```typescript
// src/store/__tests__/product-store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useProductStore } from '../product-store'

// fetchのモック
global.fetch = vi.fn()

const mockProducts = [
  { id: '1', name: 'Product A', price: 1000, category: 'electronics', imageUrl: '', stock: 10 },
  { id: '2', name: 'Product B', price: 2000, category: 'electronics', imageUrl: '', stock: 5 },
]

describe('ProductStore - fetchProducts', () => {
  beforeEach(() => {
    useProductStore.setState({
      products: [],
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  it('fetchProducts成功時: productsが更新される', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    } as Response)

    await useProductStore.getState().fetchProducts()

    const state = useProductStore.getState()
    expect(state.products).toEqual(mockProducts)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('fetchProducts失敗時: errorが設定される', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    await useProductStore.getState().fetchProducts()

    const state = useProductStore.getState()
    expect(state.products).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeTruthy()
  })

  it('fetchProducts中: isLoadingがtrueになる', async () => {
    let resolvePromise: (value: unknown) => void
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise((resolve) => { resolvePromise = resolve })
    )

    const fetchPromise = useProductStore.getState().fetchProducts()
    expect(useProductStore.getState().isLoading).toBe(true)

    resolvePromise!({ ok: true, json: () => Promise.resolve([]) })
    await fetchPromise
    expect(useProductStore.getState().isLoading).toBe(false)
  })
})
```

### コンポーネント統合テスト

```typescript
// src/components/__tests__/Counter.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Counter } from '../Counter'
import { useCounterStore } from '@/store/counter-store'

describe('Counter Component', () => {
  beforeEach(() => {
    useCounterStore.setState({ count: 0 })
  })

  it('初期値0が表示される', () => {
    render(<Counter />)
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })

  it('+1ボタンクリックで表示が更新される', () => {
    render(<Counter />)
    fireEvent.click(screen.getByText('+1'))
    expect(screen.getByText('Count: 1')).toBeInTheDocument()
  })

  it('Resetボタンで0に戻る', () => {
    useCounterStore.setState({ count: 10 })
    render(<Counter />)
    fireEvent.click(screen.getByText('Reset'))
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })
})
```

### Storeのモック

```typescript
// テスト用のStoreモック（必要に応じて）
vi.mock('@/store/user-store', () => ({
  useUserStore: vi.fn((selector) => selector({
    currentUser: { id: '1', name: 'Test User', email: 'test@example.com', role: 'user' },
    isLoading: false,
    error: null,
    setCurrentUser: vi.fn(),
    addUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    clearError: vi.fn(),
  })),
}))
```

---

## 12. Server Componentsとの共存パターン

Next.js App RouterのServer ComponentsとZustandを共存させる方法を解説する。

### 基本原則

- ZustandのStoreはクライアントサイドのみで動作する
- Server ComponentsからStoreを直接使うことはできない
- データフェッチはServer Components、UI状態はZustandで管理する

```typescript
// app/products/page.tsx (Server Component)
import { ProductList } from '@/components/ProductList'

// サーバー側でデータを取得
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 }, // 1時間キャッシュ
  })
  return res.json()
}

export default async function ProductsPage() {
  const initialProducts = await getProducts()

  // 初期データをClient Componentに渡す
  return <ProductList initialProducts={initialProducts} />
}
```

```typescript
// components/ProductList.tsx (Client Component)
'use client'

import { useEffect } from 'react'
import { useProductStore } from '@/store/product-store'

interface Props {
  initialProducts: Product[]
}

export function ProductList({ initialProducts }: Props) {
  const { products, fetchProducts } = useProductStore(
    useShallow((state) => ({
      products: state.products,
      fetchProducts: state.fetchProducts,
    }))
  )

  // Server Componentから渡された初期データでStoreを初期化
  useEffect(() => {
    useProductStore.setState({ products: initialProducts })
  }, [initialProducts])

  // クライアントサイドの動的フィルタリングなどに使用
  // ...
}
```

### Hydrationの問題を避ける

`persist` middlewareを使う場合、SSRとの整合性に注意する。

```typescript
// components/HydrationGate.tsx
'use client'

import { useEffect, useState } from 'react'

// Hydrationが完了するまでコンポーネントのレンダリングを遅らせる
export function HydrationGate({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) return null
  return <>{children}</>
}

// 使用例
function App() {
  return (
    <HydrationGate>
      <SettingsPanel /> {/* persistを使うコンポーネント */}
    </HydrationGate>
  )
}
```

---

## 13. Zustand v5の新機能

2024年にリリースされたZustand v5では、いくつかの重要な変更と新機能が追加された。

### 破壊的変更

**1. `useShallow` のインポートパスが変更**

```typescript
// v4
import shallow from 'zustand/shallow'

// v5
import { useShallow } from 'zustand/react/shallow'
```

**2. `combine` ミドルウェアの型推論改善**

```typescript
// v5: combineで型推論が自動化
import { combine } from 'zustand/middleware'

const useStore = create(
  combine(
    { count: 0, name: 'Zustand' }, // 状態
    (set) => ({                      // アクション
      increment: () => set((state) => ({ count: state.count + 1 })),
      setName: (name: string) => set({ name }),
    })
  )
)
// TypeScriptが自動的に型を推論する
```

### 新しいAPI

**`createWithEqualityFn`（細かな比較制御）**

```typescript
import { createWithEqualityFn } from 'zustand/traditional'

const useStore = createWithEqualityFn<State>(
  (set) => ({ /* ... */ }),
  Object.is // デフォルトの比較関数
)

// カスタム比較関数でのサブスクライブ
const value = useStore(
  (state) => state.someValue,
  (a, b) => a.id === b.id // IDが同じなら再レンダリングしない
)
```

**`useStoreWithEqualityFn`**

```typescript
import { useStoreWithEqualityFn } from 'zustand/traditional'
import { shallow } from 'zustand/shallow'

// storeインスタンスに対してequality fnを指定
const { a, b } = useStoreWithEqualityFn(store, (state) => ({ a: state.a, b: state.b }), shallow)
```

### マイグレーションガイド

v4からv5へのマイグレーションはほとんどの場合、`useShallow` のインポートパス修正だけで完了する。

```bash
# 自動マイグレーションスクリプト（codemod）
npx codemod zustand/v4-to-v5
```

---

## まとめ: Zustandを使いこなすために

Zustandの強みを最大限に活かすためのポイントをまとめる。

**設計原則**:
1. Storeは機能単位で分割する（カート、認証、UIなど）
2. 状態は最小限に保つ（派生状態はコンポーネント側でメモ化）
3. アクションにはわかりやすい命名を使う
4. 非同期アクションは必ずloading・error状態を管理する

**パフォーマンス原則**:
1. セレクターで必要なプロパティだけをサブスクライブ
2. 複数プロパティには `useShallow` を使う
3. アクション関数の参照は安定しているので、そのまま渡してよい

**開発体験**:
1. `devtools` middlewareは開発時に必ず有効にする
2. `immer` middlewareでネスト更新をシンプルに書く
3. テストはStoreのユニットテストとコンポーネント統合テストを両方書く

Zustandは「必要十分」を体現したライブラリだ。複雑な設定なしに始められ、大規模アプリにも対応できる柔軟性を持つ。ReduxのボイラープレートやRecoilの複雑な依存関係グラフに疲れたなら、Zustandへの移行を強くお勧めする。

---

## 開発ツールで生産性をさらに向上

Zustandを使ったReact開発の生産性を高めるには、適切な開発ツールとの組み合わせが重要だ。**[DevToolBox](https://usedevtools.com/)** は、フロントエンド開発者向けのオールインワンツールボックスで、JSONフォーマッター、正規表現テスター、Base64エンコーダーなど、日常的に使う開発ユーティリティを一か所で提供している。Zustandのstoreデータの検証やAPIレスポンスの確認など、開発ワークフローを効率化したいなら一度試してみてほしい。

---

*本記事は2026年2月時点のZustand v5.0系を基に執筆しました。最新情報は[公式ドキュメント](https://zustand-demo.pmnd.rs/)をご確認ください。*
