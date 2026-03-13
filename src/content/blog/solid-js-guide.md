---
title: 'SolidJS完全ガイド - Reactより高速なリアクティブフレームワーク'
description: 'SolidJSの基本から、シグナル・エフェクト・コンポーネント設計、パフォーマンス最適化まで徹底解説。Reactとの違いや移行のポイントも紹介。仮想DOMなしで高速描画を実現する仕組みと、Store・Router・SSR対応の実装パターンも紹介します。'
pubDate: '2026-02-05'
tags: ['SolidJS', 'フロントエンド', 'パフォーマンス', 'プログラミング']
heroImage: '../../assets/thumbnails/solid-js-guide.jpg'
---

SolidJSは、きめ細かいリアクティビティを持つ宣言的UIフレームワークです。仮想DOMを使わず、真のリアクティブシステムでReactより高速に動作します。

## SolidJSとは

### 特徴

1. **仮想DOM不要** - コンパイル時に最適化されたDOMアップデート
2. **シグナルベース** - きめ細かいリアクティビティ
3. **JSX構文** - Reactライクな書き心地
4. **小さいバンドルサイズ** - 7KB（gzip）
5. **高速** - ベンチマークでReactを上回る性能

### Reactとの違い

| 項目 | React | SolidJS |
|------|-------|---------|
| リアクティビティ | 仮想DOM比較 | シグナル直接更新 |
| 再レンダリング | コンポーネント単位 | 変更された値のみ |
| フック | useStateで再レンダー | シグナルで部分更新 |
| パフォーマンス | 中程度 | 非常に高速 |
| バンドルサイズ | 42KB | 7KB |

## セットアップ

### プロジェクト作成

```bash
# Viteテンプレートを使用
npm create vite@latest my-solid-app -- --template solid-ts

cd my-solid-app
npm install
npm run dev
```

### マニュアルインストール

```bash
npm install solid-js
npm install --save-dev vite-plugin-solid
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
})
```

## シグナル（Signal）- 基本のリアクティビティ

### createSignal

```typescript
import { createSignal } from 'solid-js'

function Counter() {
  // [getter, setter] を返す
  const [count, setCount] = createSignal(0)

  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>
        Increment
      </button>
    </div>
  )
}
```

### シグナルの更新パターン

```typescript
// 直接値を設定
setCount(10)

// 関数で更新
setCount(prev => prev + 1)

// 複数回の更新はバッチ処理される
setCount(c => c + 1)
setCount(c => c + 1)
// 2回更新されるが、DOMは1回のみ更新
```

### 派生シグナル（Derived Signal）

```typescript
function TodoApp() {
  const [todos, setTodos] = createSignal([
    { id: 1, text: 'Learn SolidJS', done: false },
    { id: 2, text: 'Build an app', done: false },
  ])

  // 派生値 - todosが変わると自動再計算
  const completedCount = () => todos().filter(t => t.done).length
  const activeCount = () => todos().length - completedCount()

  return (
    <div>
      <p>Active: {activeCount()}</p>
      <p>Completed: {completedCount()}</p>
    </div>
  )
}
```

## エフェクト（Effect）

### createEffect - 副作用の実行

```typescript
import { createSignal, createEffect } from 'solid-js'

function LoggingCounter() {
  const [count, setCount] = createSignal(0)

  // countが変わるたびに実行
  createEffect(() => {
    console.log('Count changed to:', count())
  })

  return (
    <button onClick={() => setCount(count() + 1)}>
      Count: {count()}
    </button>
  )
}
```

### 依存関係の追跡

```typescript
function UserProfile() {
  const [userId, setUserId] = createSignal(1)
  const [user, setUser] = createSignal(null)

  createEffect(() => {
    // userIdが変わると自動実行
    const id = userId()

    fetch(`/api/users/${id}`)
      .then(res => res.json())
      .then(setUser)
  })

  return <div>{user()?.name}</div>
}
```

### クリーンアップ

```typescript
import { onCleanup } from 'solid-js'

function Timer() {
  const [seconds, setSeconds] = createSignal(0)

  createEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)

    // エフェクトが再実行される前、またはコンポーネント破棄時に実行
    onCleanup(() => clearInterval(interval))
  })

  return <div>Seconds: {seconds()}</div>
}
```

## メモ（Memo）- キャッシュされた派生値

### createMemo

```typescript
import { createSignal, createMemo } from 'solid-js'

function ExpensiveCalculation() {
  const [count, setCount] = createSignal(0)
  const [multiplier, setMultiplier] = createSignal(2)

  // 依存する値が変わった時だけ再計算
  const result = createMemo(() => {
    console.log('Calculating...')
    return count() * multiplier()
  })

  return (
    <div>
      <p>Result: {result()}</p>
      <button onClick={() => setCount(c => c + 1)}>Count++</button>
      <button onClick={() => setMultiplier(m => m + 1)}>Multiplier++</button>
    </div>
  )
}
```

### 派生シグナルとの違い

```typescript
// 派生シグナル - 毎回再計算
const doubled = () => count() * 2

// メモ - キャッシュされる（countが変わった時のみ再計算）
const doubled = createMemo(() => count() * 2)
```

## リソース（Resource）- 非同期データ管理

### createResource

```typescript
import { createResource } from 'solid-js'

async function fetchUser(id: number) {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
}

function UserProfile() {
  const [userId, setUserId] = createSignal(1)

  const [user] = createResource(userId, fetchUser)

  return (
    <div>
      {user.loading && <p>Loading...</p>}
      {user.error && <p>Error: {user.error.message}</p>}
      {user() && <p>Name: {user().name}</p>}
    </div>
  )
}
```

### リソースの再読み込み

```typescript
function TodoList() {
  const [todos, { mutate, refetch }] = createResource(fetchTodos)

  const addTodo = async (text: string) => {
    await fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })

    refetch() // データ再取得
  }

  const optimisticAdd = (text: string) => {
    // 楽観的UI更新
    mutate(prev => [...prev, { id: Date.now(), text }])
  }

  return (
    <ul>
      <For each={todos()}>
        {todo => <li>{todo.text}</li>}
      </For>
    </ul>
  )
}
```

## コントロールフロー

### Show - 条件付きレンダリング

```typescript
import { Show } from 'solid-js'

function UserGreeting(props) {
  return (
    <Show
      when={props.user}
      fallback={<p>Please sign in</p>}
    >
      <p>Hello, {props.user.name}!</p>
    </Show>
  )
}
```

### For - リストレンダリング

```typescript
import { For } from 'solid-js'

function TodoList() {
  const [todos, setTodos] = createSignal([
    { id: 1, text: 'Learn SolidJS' },
    { id: 2, text: 'Build app' },
  ])

  return (
    <ul>
      <For each={todos()}>
        {(todo, index) => (
          <li>
            {index()}: {todo.text}
          </li>
        )}
      </For>
    </ul>
  )
}
```

### Switch/Match - 複数条件分岐

```typescript
import { Switch, Match } from 'solid-js'

function StatusMessage(props) {
  return (
    <Switch fallback={<p>Unknown status</p>}>
      <Match when={props.status === 'loading'}>
        <p>Loading...</p>
      </Match>
      <Match when={props.status === 'error'}>
        <p>Error occurred</p>
      </Match>
      <Match when={props.status === 'success'}>
        <p>Success!</p>
      </Match>
    </Switch>
  )
}
```

### Index - インデックスベースのリスト

```typescript
import { Index } from 'solid-js'

// 値が変わらずインデックスが変わる場合に最適
function NumberList() {
  const [numbers, setNumbers] = createSignal([1, 2, 3, 4, 5])

  return (
    <Index each={numbers()}>
      {(num, i) => (
        <div>
          Index {i}: {num()}
        </div>
      )}
    </Index>
  )
}
```

## コンポーネント設計

### Props

```typescript
import { Component } from 'solid-js'

interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

const Button: Component<ButtonProps> = (props) => {
  return (
    <button
      onClick={props.onClick}
      class={`btn btn-${props.variant ?? 'primary'}`}
    >
      {props.label}
    </button>
  )
}
```

### Children

```typescript
import { children, Component, JSX } from 'solid-js'

interface CardProps {
  children: JSX.Element
}

const Card: Component<CardProps> = (props) => {
  // childrenを解決
  const c = children(() => props.children)

  return (
    <div class="card">
      <div class="card-content">
        {c()}
      </div>
    </div>
  )
}
```

### スプレッド属性

```typescript
import { splitProps } from 'solid-js'

function Input(props) {
  const [local, others] = splitProps(props, ['label'])

  return (
    <div>
      <label>{local.label}</label>
      <input {...others} />
    </div>
  )
}

// 使用例
<Input label="Name" type="text" placeholder="Enter name" />
```

## ストア（Store）- ネストされた状態管理

### createStore

```typescript
import { createStore } from 'solid-js/store'

function TodoApp() {
  const [store, setStore] = createStore({
    todos: [
      { id: 1, text: 'Learn SolidJS', done: false },
    ],
    filter: 'all',
  })

  const addTodo = (text: string) => {
    setStore('todos', store.todos.length, {
      id: Date.now(),
      text,
      done: false,
    })
  }

  const toggleTodo = (id: number) => {
    setStore(
      'todos',
      todo => todo.id === id,
      'done',
      done => !done
    )
  }

  return (
    <div>
      <For each={store.todos}>
        {todo => (
          <div>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
            />
            {todo.text}
          </div>
        )}
      </For>
    </div>
  )
}
```

### produce - Immer風の更新

```typescript
import { produce } from 'solid-js/store'

const updateUser = () => {
  setStore('user', produce(user => {
    user.name = 'Alice'
    user.age++
  }))
}
```

## コンテキスト（Context）

### createContext

```typescript
import { createContext, useContext, Component, JSX } from 'solid-js'

interface ThemeContextValue {
  theme: () => string
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>()

const ThemeProvider: Component<{ children: JSX.Element }> = (props) => {
  const [theme, setTheme] = createSignal('light')

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {props.children}
    </ThemeContext.Provider>
  )
}

function ThemedButton() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('ThemeContext not found')

  return (
    <button onClick={context.toggleTheme}>
      Current theme: {context.theme()}
    </button>
  )
}
```

## ルーティング - Solid Router

### インストール

```bash
npm install @solidjs/router
```

### 基本的な使い方

```typescript
import { Router, Routes, Route, A } from '@solidjs/router'

function App() {
  return (
    <Router>
      <nav>
        <A href="/">Home</A>
        <A href="/about">About</A>
        <A href="/users/1">User 1</A>
      </nav>

      <Routes>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/users/:id" component={User} />
      </Routes>
    </Router>
  )
}
```

### パラメータとナビゲーション

```typescript
import { useParams, useNavigate } from '@solidjs/router'

function User() {
  const params = useParams()
  const navigate = useNavigate()

  return (
    <div>
      <p>User ID: {params.id}</p>
      <button onClick={() => navigate('/about')}>
        Go to About
      </button>
    </div>
  )
}
```

## パフォーマンス最適化

### バッチ更新

```typescript
import { batch } from 'solid-js'

function updateMultiple() {
  batch(() => {
    setCount(c => c + 1)
    setName('Alice')
    setAge(30)
  })
  // 3つの更新が1回のDOMアップデートで処理される
}
```

### untrack - リアクティビティの除外

```typescript
import { untrack } from 'solid-js'

createEffect(() => {
  const current = count()

  // prevCountの変更は追跡しない
  const prev = untrack(() => prevCount())

  console.log(`Changed from ${prev} to ${current}`)
})
```

### on - 明示的な依存関係

```typescript
import { on } from 'solid-js'

createEffect(
  on(
    () => props.userId,
    (userId, prevUserId) => {
      console.log(`User changed from ${prevUserId} to ${userId}`)
      fetchUser(userId)
    }
  )
)
```

## Reactからの移行

### useState → createSignal

```typescript
// React
const [count, setCount] = useState(0)
<div>{count}</div>

// SolidJS
const [count, setCount] = createSignal(0)
<div>{count()}</div>  // getter関数として呼び出す
```

### useEffect → createEffect

```typescript
// React
useEffect(() => {
  console.log(count)
}, [count])

// SolidJS
createEffect(() => {
  console.log(count())  // 依存配列不要
})
```

### useMemo → createMemo

```typescript
// React
const doubled = useMemo(() => count * 2, [count])

// SolidJS
const doubled = createMemo(() => count() * 2)
```

### useContext → useContext

```typescript
// React・SolidJSともに同じAPI
const theme = useContext(ThemeContext)
```

## まとめ

SolidJSの主な利点:

1. **高速** - 仮想DOMなしで真のリアクティビティ
2. **小さい** - 7KBのバンドルサイズ
3. **直感的** - JSX構文でReact経験者にも親しみやすい
4. **きめ細かい更新** - コンポーネント再レンダリング不要

SolidJSは、パフォーマンスが重要なWebアプリケーションや、小さなバンドルサイズが求められる場面で特に威力を発揮します。Reactの知識があればすぐに始められるため、ぜひ試してみてください。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
