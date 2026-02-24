---
title: 'Vue.js 3 + TypeScript実践ガイド — Composition APIで型安全なアプリを構築'
description: 'Vue.js 3のComposition APIとTypeScriptを組み合わせた実践的な開発手法を解説。ref/reactive・computed・watch・コンポーネント設計・Pinia状態管理・Vue Router・Vueuse・パフォーマンス最適化まで実践コード付きで網羅。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['Vue.js', 'TypeScript', 'Composition API', 'Pinia', 'フロントエンド']
---

Vue.js 3とTypeScriptの組み合わせは、スケーラブルなフロントエンド開発において強力な選択肢です。Composition APIによる論理の再利用、`<script setup>`構文のシンプルさ、そしてTypeScriptの型安全性が組み合わさることで、大規模なアプリケーションでも保守性を高く保てます。本記事では、実務で使える実践的なパターンをコード例付きで網羅的に解説します。

---

## 1. Vue 3 vs Vue 2の主な違い

Vue 3はVue 2からの大幅な刷新で、パフォーマンスと開発体験が大きく向上しました。

### Composition API

Vue 2のOptions APIでは、データ・メソッド・ライフサイクルが別々のオプションに分散していました。Vue 3のComposition APIは関連ロジックを一箇所にまとめられます。

```typescript
// Vue 2 Options API
export default {
  data() {
    return { count: 0, user: null }
  },
  computed: {
    doubled() { return this.count * 2 }
  },
  methods: {
    increment() { this.count++ }
  },
  mounted() {
    this.fetchUser()
  }
}

// Vue 3 Composition API
import { ref, computed, onMounted } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const doubled = computed(() => count.value * 2)
    const increment = () => count.value++

    onMounted(() => fetchUser())

    return { count, doubled, increment }
  }
}
```

### フラグメント・Teleport・Suspense

```vue
<!-- Vue 2: 必ずルート要素が1つ必要 -->
<template>
  <div>
    <header>...</header>
    <main>...</main>
  </div>
</template>

<!-- Vue 3: フラグメント（複数ルート要素OK） -->
<template>
  <header>...</header>
  <main>...</main>
  <footer>...</footer>
</template>
```

```vue
<!-- Teleport: DOMの任意の場所にレンダリング -->
<template>
  <button @click="showModal = true">モーダルを開く</button>
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <p>モーダルの内容</p>
        <button @click="showModal = false">閉じる</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const showModal = ref(false)
</script>
```

```vue
<!-- Suspense: 非同期コンポーネントのローディング管理 -->
<template>
  <Suspense>
    <template #default>
      <AsyncUserProfile :userId="userId" />
    </template>
    <template #fallback>
      <div class="skeleton-loader">読み込み中...</div>
    </template>
  </Suspense>
</template>
```

---

## 2. `<script setup>`とTypeScriptの組み合わせ

`<script setup>`はComposition APIをより簡潔に書けるコンパイラマクロです。TypeScriptとの相性が抜群です。

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

// インターフェース定義
interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user' | 'guest'
}

// Props定義（withDefaultsで省略可能props）
const props = withDefaults(defineProps<{
  userId: number
  initialName?: string
  readonly?: boolean
}>(), {
  initialName: '',
  readonly: false
})

// Emits定義（型付き）
const emit = defineEmits<{
  (e: 'update', user: User): void
  (e: 'delete', id: number): void
  (e: 'error', message: string): void
}>()

// リアクティブデータ
const user = ref<User | null>(null)
const isLoading = ref(false)

// computedプロパティ
const displayName = computed(() =>
  user.value ? `${user.value.name} (${user.value.role})` : '未読み込み'
)

// 非同期関数
async function fetchUser(id: number): Promise<void> {
  isLoading.value = true
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) throw new Error('ユーザーの取得に失敗しました')
    user.value = await response.json() as User
  } catch (error) {
    emit('error', error instanceof Error ? error.message : '不明なエラー')
  } finally {
    isLoading.value = false
  }
}

// defineExposeで外部から参照可能にするメソッド
defineExpose({ fetchUser, user })
</script>

<template>
  <div>
    <p v-if="isLoading">読み込み中...</p>
    <p v-else-if="user">{{ displayName }}</p>
  </div>
</template>
```

---

## 3. ref/reactive/shallowRef/shallowReactiveの使い分け

```typescript
import { ref, reactive, shallowRef, shallowReactive } from 'vue'

// ref: プリミティブ値・オブジェクト両方に使える
// .value でアクセス。テンプレート内では自動アンラップ
const count = ref<number>(0)
const user = ref<User | null>(null)
count.value++

// reactive: オブジェクト専用。.valueが不要
// ネストされたプロパティも深くリアクティブ
const state = reactive({
  count: 0,
  user: { name: 'Alice', age: 30 }
})
state.count++
state.user.name = 'Bob' // 深いプロパティも追跡

// 注意: reactiveを分割代入するとリアクティビティが失われる
// const { count } = state  // BAD: reactiveを壊す
// const countRef = toRef(state, 'count')  // GOOD

// shallowRef: ルートレベルの変更のみ追跡（パフォーマンス最適化）
const largeList = shallowRef<User[]>([])
// largeList.value.push(user) は検知されない
largeList.value = [...largeList.value, newUser] // これはOK

// shallowReactive: 第一レベルのプロパティのみ追跡
const shallowState = shallowReactive({
  count: 0,
  nested: { value: 'これは追跡されない' }
})
shallowState.count++ // OK: 追跡される
shallowState.nested.value = 'new' // NG: 追跡されない

// 選択基準
// - プリミティブ値 → ref
// - オブジェクト（通常） → reactive または ref
// - 大きな配列/オブジェクト（頻繁に差し替え） → shallowRef
// - パフォーマンスクリティカルな浅い更新 → shallowReactive
```

---

## 4. computed・watch・watchEffect

```typescript
import { ref, computed, watch, watchEffect } from 'vue'

const firstName = ref('太郎')
const lastName = ref('山田')
const age = ref(25)

// computed: 派生値を計算。依存値が変わった時だけ再計算
const fullName = computed(() => `${lastName.value} ${firstName.value}`)

// 書き込み可能なcomputed
const fullNameWritable = computed({
  get: () => `${lastName.value} ${firstName.value}`,
  set: (value: string) => {
    const [last, first] = value.split(' ')
    lastName.value = last
    firstName.value = first
  }
})
fullNameWritable.value = '鈴木 花子' // setterが呼ばれる

// watch: 特定のソースを監視。古い値と新しい値を比較可能
watch(firstName, (newVal, oldVal) => {
  console.log(`名前が ${oldVal} から ${newVal} に変わりました`)
})

// 複数ソースを監視
watch([firstName, lastName], ([newFirst, newLast], [oldFirst, oldLast]) => {
  console.log(`フルネームが変わりました: ${oldFirst} ${oldLast} → ${newFirst} ${newLast}`)
})

// deepオプション: オブジェクトの深い変更を監視
const userForm = ref({ name: '', address: { city: '', zip: '' } })
watch(
  userForm,
  (newUser) => {
    console.log('フォームが変更されました:', newUser)
  },
  { deep: true }
)

// immediateオプション: 初回即時実行
watch(age, (newAge) => {
  console.log('年齢:', newAge)
}, { immediate: true })

// watchEffect: 使用した全リアクティブ値を自動追跡
// 依存関係を明示しなくていい
const searchQuery = ref('')
const results = ref<string[]>([])

watchEffect(async (onCleanup) => {
  // searchQueryが変わるたびに自動実行
  const controller = new AbortController()
  onCleanup(() => controller.abort()) // クリーンアップ

  if (searchQuery.value.length < 2) {
    results.value = []
    return
  }

  try {
    const res = await fetch(`/api/search?q=${searchQuery.value}`, {
      signal: controller.signal
    })
    results.value = await res.json()
  } catch {
    // AbortError は無視
  }
})
```

---

## 5. コンポーネント間通信

### Props / Emits

```vue
<!-- ParentComponent.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import ChildComponent from './ChildComponent.vue'

const items = ref<string[]>(['りんご', 'みかん'])
const selectedItem = ref<string | null>(null)

function handleSelect(item: string) {
  selectedItem.value = item
}
</script>

<template>
  <ChildComponent
    :items="items"
    :selected="selectedItem"
    @select="handleSelect"
    @remove="items = items.filter(i => i !== $event)"
  />
</template>
```

```vue
<!-- ChildComponent.vue -->
<script setup lang="ts">
const props = defineProps<{
  items: string[]
  selected: string | null
}>()

const emit = defineEmits<{
  (e: 'select', item: string): void
  (e: 'remove', item: string): void
}>()
</script>

<template>
  <ul>
    <li
      v-for="item in props.items"
      :key="item"
      :class="{ active: item === props.selected }"
      @click="emit('select', item)"
    >
      {{ item }}
      <button @click.stop="emit('remove', item)">削除</button>
    </li>
  </ul>
</template>
```

### provide / inject（型安全）

```typescript
// types.ts
import type { InjectionKey, Ref } from 'vue'

export interface ThemeContext {
  theme: Ref<'light' | 'dark'>
  toggleTheme: () => void
}

// InjectionKeyで型安全なinject/provideを実現
export const ThemeKey: InjectionKey<ThemeContext> = Symbol('theme')
```

```vue
<!-- ThemeProvider.vue -->
<script setup lang="ts">
import { ref, provide } from 'vue'
import { ThemeKey, type ThemeContext } from './types'

const theme = ref<'light' | 'dark'>('light')
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

provide<ThemeContext>(ThemeKey, { theme, toggleTheme })
</script>
```

```vue
<!-- DeepChildComponent.vue -->
<script setup lang="ts">
import { inject } from 'vue'
import { ThemeKey } from './types'

// inject失敗時のエラーを型で保証
const themeContext = inject(ThemeKey)
if (!themeContext) throw new Error('ThemeProviderが見つかりません')

const { theme, toggleTheme } = themeContext
</script>
```

### v-model（複数バインディング）

```vue
<!-- FormField.vue -->
<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  label: string
  error?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="form-field">
    <label>{{ label }}</label>
    <input
      :value="props.modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="props.error" class="error">{{ props.error }}</span>
  </div>
</template>
```

```vue
<!-- 使用側: v-modelで双方向バインディング -->
<FormField v-model="username" label="ユーザー名" :error="usernameError" />
```

---

## 6. コンポーザブル（Composables）

コンポーザブルはVue 3のカスタムフックです。ロジックを再利用可能な関数として切り出せます。

```typescript
// composables/useFetch.ts
import { ref, type Ref } from 'vue'

interface UseFetchReturn<T> {
  data: Ref<T | null>
  error: Ref<Error | null>
  isLoading: Ref<boolean>
  execute: () => Promise<void>
}

export function useFetch<T>(url: string): UseFetchReturn<T> {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const isLoading = ref(false)

  async function execute(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      data.value = await response.json() as T
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      isLoading.value = false
    }
  }

  return { data, error, isLoading, execute }
}
```

```typescript
// composables/useLocalStorage.ts
import { ref, watch, type Ref } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  const stored = localStorage.getItem(key)
  const initial = stored ? JSON.parse(stored) as T : defaultValue
  const value = ref<T>(initial) as Ref<T>

  watch(value, (newValue) => {
    localStorage.setItem(key, JSON.stringify(newValue))
  }, { deep: true })

  return value
}
```

```typescript
// composables/useForm.ts
import { reactive, computed } from 'vue'

type ValidationRule<T> = (value: T) => string | null

interface FieldConfig<T> {
  initialValue: T
  rules?: ValidationRule<T>[]
}

type FormConfig<T extends Record<string, unknown>> = {
  [K in keyof T]: FieldConfig<T[K]>
}

export function useForm<T extends Record<string, unknown>>(config: FormConfig<T>) {
  const fields = reactive<Record<string, unknown>>({})
  const errors = reactive<Record<string, string | null>>({})

  for (const key in config) {
    fields[key] = config[key].initialValue
    errors[key] = null
  }

  function validate(): boolean {
    let isValid = true
    for (const key in config) {
      const rules = config[key].rules ?? []
      const value = fields[key]
      let fieldError: string | null = null

      for (const rule of rules) {
        const result = rule(value as T[typeof key])
        if (result !== null) {
          fieldError = result
          isValid = false
          break
        }
      }
      errors[key] = fieldError
    }
    return isValid
  }

  const isValid = computed(() => Object.values(errors).every(e => e === null))

  return {
    fields: fields as T,
    errors: errors as Record<keyof T, string | null>,
    validate,
    isValid
  }
}

// 使用例
// const { fields, errors, validate } = useForm({
//   email: {
//     initialValue: '',
//     rules: [
//       (v) => v ? null : 'メールアドレスは必須です',
//       (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : '有効なメールアドレスを入力してください'
//     ]
//   }
// })
```

---

## 7. Pinia状態管理

PiniaはVue 3公式の状態管理ライブラリです。TypeScriptとの親和性が高く、DevToolsサポートも充実しています。

```typescript
// stores/authStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

interface AuthState {
  token: string | null
}

// Composition API スタイル（推奨）
export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const isLoading = ref(false)

  // Getters
  const isAuthenticated = computed(() => token.value !== null)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const displayName = computed(() => user.value?.name ?? 'ゲスト')

  // Actions
  async function login(email: string, password: string): Promise<void> {
    isLoading.value = true
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) throw new Error('ログインに失敗しました')

      const data = await response.json() as { user: User; token: string }
      user.value = data.user
      token.value = data.token
      localStorage.setItem('token', data.token)
    } finally {
      isLoading.value = false
    }
  }

  function logout(): void {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  async function fetchCurrentUser(): Promise<void> {
    if (!token.value) return
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token.value}` }
      })
      if (!response.ok) {
        logout()
        return
      }
      user.value = await response.json() as User
    } catch {
      logout()
    }
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    isAdmin,
    displayName,
    login,
    logout,
    fetchCurrentUser
  }
})
```

```typescript
// stores/todoStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Todo {
  id: number
  title: string
  completed: boolean
  createdAt: Date
}

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<Todo[]>([])
  let nextId = 1

  const completedCount = computed(() =>
    todos.value.filter(t => t.completed).length
  )

  const incompleteTodos = computed(() =>
    todos.value.filter(t => !t.completed)
  )

  function addTodo(title: string): void {
    todos.value.push({
      id: nextId++,
      title,
      completed: false,
      createdAt: new Date()
    })
  }

  function toggleTodo(id: number): void {
    const todo = todos.value.find(t => t.id === id)
    if (todo) todo.completed = !todo.completed
  }

  function removeTodo(id: number): void {
    todos.value = todos.value.filter(t => t.id !== id)
  }

  return { todos, completedCount, incompleteTodos, addTodo, toggleTodo, removeTodo }
})
```

```vue
<!-- TodoApp.vue: Piniaストアの使用 -->
<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTodoStore } from '../stores/todoStore'

const store = useTodoStore()
// storeToRefsでリアクティビティを保ちながら分割代入
const { todos, completedCount, incompleteTodos } = storeToRefs(store)
const { addTodo, toggleTodo, removeTodo } = store

const newTitle = ref('')

function handleAdd() {
  if (!newTitle.value.trim()) return
  addTodo(newTitle.value.trim())
  newTitle.value = ''
}
</script>
```

---

## 8. Vue Router 4（型安全なルーティング）

```typescript
// router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../views/HomeView.vue'),
    meta: { title: 'ホーム', requiresAuth: false }
  },
  {
    path: '/dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: 'ダッシュボード', requiresAuth: true }
  },
  {
    path: '/users/:id',
    component: () => import('../views/UserDetailView.vue'),
    meta: { title: 'ユーザー詳細', requiresAuth: true },
    // propsを使ってコンポーネントにルートパラメータを渡す
    props: (route) => ({ userId: Number(route.params.id) })
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('../views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// ナビゲーションガード（認証チェック）
router.beforeEach(async (to, from) => {
  const authStore = useAuthStore()

  // ページタイトルを更新
  document.title = `${to.meta.title as string} | MyApp`

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

export default router
```

```typescript
// composables/useTypedRoute.ts: 型安全なルートアクセス
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'

export function useUserRoute() {
  const route = useRoute()
  const router = useRouter()

  const userId = computed(() => {
    const id = route.params.id
    const parsed = parseInt(Array.isArray(id) ? id[0] : id, 10)
    return isNaN(parsed) ? null : parsed
  })

  function navigateToUser(id: number) {
    router.push({ path: `/users/${id}` })
  }

  function goBack() {
    router.back()
  }

  return { userId, navigateToUser, goBack }
}
```

---

## 9. VueUseライブラリの活用

VueUseはVue 3向けの高品質なコンポーザブルコレクションです。

```typescript
import {
  useLocalStorage,
  useFetch,
  useIntersectionObserver,
  useDebounce,
  useEventListener,
  useDark,
  useClipboard,
  useMediaQuery
} from '@vueuse/core'

// ローカルストレージと自動同期
const preferences = useLocalStorage('user-preferences', {
  theme: 'light' as 'light' | 'dark',
  language: 'ja',
  notifications: true
})

// 型安全なHTTPフェッチ（自動中断・再試行対応）
interface Post {
  id: number
  title: string
  body: string
}

const { data: posts, isFetching, error } = useFetch<Post[]>('/api/posts')
  .get()
  .json<Post[]>()

// ダークモード
const isDark = useDark()

// クリップボード
const { copy, copied } = useClipboard()

// レスポンシブブレークポイント
const isTablet = useMediaQuery('(min-width: 768px)')
const isDesktop = useMediaQuery('(min-width: 1024px)')
```

```vue
<!-- 無限スクロール with useIntersectionObserver -->
<script setup lang="ts">
import { ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'

interface Item { id: number; name: string }

const items = ref<Item[]>([])
const page = ref(1)
const isLoading = ref(false)
const hasMore = ref(true)
const sentinel = ref<HTMLElement | null>(null)

async function loadMore() {
  if (isLoading.value || !hasMore.value) return
  isLoading.value = true
  try {
    const res = await fetch(`/api/items?page=${page.value}`)
    const newItems = await res.json() as Item[]
    if (newItems.length === 0) {
      hasMore.value = false
    } else {
      items.value.push(...newItems)
      page.value++
    }
  } finally {
    isLoading.value = false
  }
}

// sentinelがビューポートに入ったら次ページをロード
useIntersectionObserver(sentinel, ([{ isIntersecting }]) => {
  if (isIntersecting) loadMore()
})
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
  </ul>
  <div ref="sentinel">
    <span v-if="isLoading">読み込み中...</span>
    <span v-else-if="!hasMore">全て読み込みました</span>
  </div>
</template>
```

---

## 10. コンポーネント設計パターン

### ジェネリックコンポーネント

Vue 3.3以降、`generic`属性でジェネリックコンポーネントを実装できます。

```vue
<!-- DataTable.vue: ジェネリックなテーブルコンポーネント -->
<script setup lang="ts" generic="T extends Record<string, unknown>">
interface Column<T> {
  key: keyof T
  label: string
  formatter?: (value: T[keyof T]) => string
  sortable?: boolean
}

const props = defineProps<{
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
}>()

const emit = defineEmits<{
  (e: 'row-click', row: T): void
  (e: 'sort', column: keyof T): void
}>()

function getCellValue(row: T, column: Column<T>): string {
  const value = row[column.key]
  return column.formatter ? column.formatter(value) : String(value ?? '')
}
</script>

<template>
  <table>
    <thead>
      <tr>
        <th
          v-for="col in props.columns"
          :key="String(col.key)"
          @click="col.sortable && emit('sort', col.key)"
        >
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="row in props.data"
        :key="String(row[props.keyField])"
        @click="emit('row-click', row)"
      >
        <td v-for="col in props.columns" :key="String(col.key)">
          {{ getCellValue(row, col) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
```

### ヘッドレスコンポーネント（Renderless Components）

UIを持たず、ロジックだけを提供するパターンです。

```vue
<!-- HeadlessDisclosure.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)
const toggle = () => { isOpen.value = !isOpen.value }
const open = () => { isOpen.value = true }
const close = () => { isOpen.value = false }

defineExpose({ isOpen, toggle, open, close })
</script>

<template>
  <!-- デフォルトスロットにロジックを公開 -->
  <slot :is-open="isOpen" :toggle="toggle" :open="open" :close="close" />
</template>
```

```vue
<!-- 使用例: 自由にスタイリング可能 -->
<HeadlessDisclosure v-slot="{ isOpen, toggle }">
  <button @click="toggle" :aria-expanded="isOpen">
    {{ isOpen ? '閉じる' : '開く' }}
  </button>
  <div v-show="isOpen" class="content">
    <slot />
  </div>
</HeadlessDisclosure>
```

---

## 11. パフォーマンス最適化

### v-memo

```vue
<template>
  <!-- 各行のid・statusが変わった時だけ再レンダリング -->
  <div
    v-for="item in items"
    :key="item.id"
    v-memo="[item.id, item.status, item.selected]"
  >
    <ExpensiveComponent :item="item" />
  </div>
</template>
```

### defineAsyncComponent（コード分割）

```typescript
import { defineAsyncComponent } from 'vue'

// 遅延ロード + ローディング状態管理
const HeavyChart = defineAsyncComponent({
  loader: () => import('./HeavyChartComponent.vue'),
  loadingComponent: () => import('./ChartSkeleton.vue'),
  errorComponent: () => import('./ErrorFallback.vue'),
  delay: 200,        // ローディング表示を遅らせる（チラつき防止）
  timeout: 10000     // タイムアウト
})

// シンプルな遅延ロード
const AdminPanel = defineAsyncComponent(
  () => import('./AdminPanel.vue')
)
```

### 仮想スクロール

```vue
<!-- VirtualList.vue: 大量データの仮想スクロール -->
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  items: unknown[]
  itemHeight: number
  containerHeight: number
}

const props = defineProps<Props>()
const scrollTop = ref(0)

const visibleCount = computed(() =>
  Math.ceil(props.containerHeight / props.itemHeight) + 2
)

const startIndex = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - 1)
)

const endIndex = computed(() =>
  Math.min(props.items.length - 1, startIndex.value + visibleCount.value)
)

const visibleItems = computed(() =>
  props.items.slice(startIndex.value, endIndex.value + 1).map((item, i) => ({
    item,
    index: startIndex.value + i
  }))
)

const totalHeight = computed(() =>
  props.items.length * props.itemHeight
)

const offsetY = computed(() =>
  startIndex.value * props.itemHeight
)

function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}
</script>

<template>
  <div
    :style="{ height: `${containerHeight}px`, overflow: 'auto' }"
    @scroll="onScroll"
  >
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <div :style="{ transform: `translateY(${offsetY}px)` }">
        <div
          v-for="{ item, index } in visibleItems"
          :key="index"
          :style="{ height: `${itemHeight}px` }"
        >
          <slot :item="item" :index="index" />
        </div>
      </div>
    </div>
  </div>
</template>
```

---

## 12. テスト（Vitest + Vue Test Utils）

```typescript
// tests/components/TodoItem.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TodoItem from '../../src/components/TodoItem.vue'

interface Todo {
  id: number
  title: string
  completed: boolean
}

describe('TodoItem', () => {
  const mockTodo: Todo = { id: 1, title: 'テストタスク', completed: false }

  it('タイトルを正しく表示する', () => {
    const wrapper = mount(TodoItem, {
      props: { todo: mockTodo }
    })
    expect(wrapper.text()).toContain('テストタスク')
  })

  it('completedがtrueの場合、打ち消し線スタイルを適用する', () => {
    const completedTodo = { ...mockTodo, completed: true }
    const wrapper = mount(TodoItem, {
      props: { todo: completedTodo }
    })
    expect(wrapper.find('[data-testid="title"]').classes()).toContain('completed')
  })

  it('チェックボックスクリックでtoggleイベントを発火する', async () => {
    const wrapper = mount(TodoItem, {
      props: { todo: mockTodo }
    })
    await wrapper.find('input[type="checkbox"]').trigger('click')
    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')![0]).toEqual([mockTodo.id])
  })

  it('削除ボタンクリックでremoveイベントを発火する', async () => {
    const wrapper = mount(TodoItem, {
      props: { todo: mockTodo }
    })
    await wrapper.find('[data-testid="delete-btn"]').trigger('click')
    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')![0]).toEqual([mockTodo.id])
  })
})
```

```typescript
// tests/composables/useFetch.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFetch } from '../../src/composables/useFetch'

describe('useFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('成功時にデータをセットする', async () => {
    const mockData = [{ id: 1, name: 'テストデータ' }]
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), { status: 200 })
    )

    const { data, isLoading, error, execute } = useFetch<typeof mockData>('/api/test')

    expect(isLoading.value).toBe(false)
    await execute()
    expect(data.value).toEqual(mockData)
    expect(error.value).toBeNull()
  })

  it('エラー時にerrorをセットする', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 500 })
    )

    const { data, error, execute } = useFetch('/api/fail')
    await execute()

    expect(data.value).toBeNull()
    expect(error.value).toBeInstanceOf(Error)
    expect(error.value?.message).toContain('HTTP error: 500')
  })
})
```

```typescript
// tests/stores/todoStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTodoStore } from '../../src/stores/todoStore'

describe('useTodoStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初期状態でtodosが空', () => {
    const store = useTodoStore()
    expect(store.todos).toHaveLength(0)
  })

  it('addTodoでtodoを追加できる', () => {
    const store = useTodoStore()
    store.addTodo('新しいタスク')
    expect(store.todos).toHaveLength(1)
    expect(store.todos[0].title).toBe('新しいタスク')
    expect(store.todos[0].completed).toBe(false)
  })

  it('toggleTodoで完了状態を切り替えられる', () => {
    const store = useTodoStore()
    store.addTodo('タスク')
    const id = store.todos[0].id
    store.toggleTodo(id)
    expect(store.todos[0].completed).toBe(true)
    store.toggleTodo(id)
    expect(store.todos[0].completed).toBe(false)
  })

  it('completedCountが正しく計算される', () => {
    const store = useTodoStore()
    store.addTodo('タスク1')
    store.addTodo('タスク2')
    store.addTodo('タスク3')
    store.toggleTodo(store.todos[0].id)
    store.toggleTodo(store.todos[2].id)
    expect(store.completedCount).toBe(2)
  })
})
```

---

## まとめ

Vue.js 3とTypeScriptを組み合わせることで得られる主なメリットをまとめます。

| 機能 | 主なメリット |
|------|------------|
| `<script setup>` | ボイラープレート削減・推論精度向上 |
| Composition API | ロジックの再利用・テスタビリティ向上 |
| コンポーザブル | クロスコンポーネントなロジック共有 |
| Pinia | 型安全な状態管理・DevTools統合 |
| Vue Router 4 | 型安全なナビゲーション・コード分割 |
| VueUse | 実績あるコンポーザブル群の即時活用 |
| v-memo / shallowRef | 不要な再レンダリングの抑制 |

実装においては以下の点を意識してください。

**リアクティビティの選択基準**：プリミティブ値には`ref`、オブジェクトには`reactive`または`ref`を使用し、パフォーマンスが必要な場合のみ`shallowRef`/`shallowReactive`を検討する。

**型安全の徹底**：`defineProps`・`defineEmits`・`InjectionKey`・Piniaの型定義を通じて、コンポーネント境界での型保証を維持する。

**テスト駆動開発**：コンポーザブルとPiniaストアはUIと切り離しやすいため、ユニットテストを書きやすい構造になる。Vitest + Vue Test Utilsで積極的にテストを書く。

Vue.js 3のエコシステムは成熟しており、TypeScriptとの組み合わせで生産性と品質を両立した開発が可能です。本記事のパターンを活用して、スケーラブルなVueアプリケーションを構築してください。
