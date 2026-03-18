---
title: 'React 19 完全ガイド【新機能・Actions・use() Hook】'
description: 'React 19の新機能を徹底解説。Server Actions、use() Hook、useOptimistic、useFormStatus、React Compiler、改善されたエラーハンドリングまで。'
pubDate: '2026-02-22'
heroImage: '../../assets/thumbnails/react-19-complete-guide.jpg'
tags: ['react', 'react19', 'javascript', 'frontend']
---

React 19 は 2024 年 12 月に正式リリースされ、React 18 で導入された Concurrent 機能の上に、非同期処理・フォーム操作・自動メモ化という 3 つの柱を追加した。これらは単なる API の追加ではなく、**「非同期状態管理のためのプリミティブをフレームワーク任せにせずReact本体が提供する」**という設計思想の転換を意味する。

既存の React 18 コードベースを持つチームにとって、React 19 の新 API を正しく理解・適用することで、`useEffect` + `useState` による煩雑な非同期パターンを大幅に削減できる。本記事では実際のコード例を中心に、新機能と移行戦略を解説する。

---

## React 19 の概要と背景

### React 18 が残した課題

React 18 の Concurrent Rendering は強力だが、実際のアプリケーションでは以下のようなパターンが繰り返し登場していた。

```typescript
// React 18 までの典型的な非同期フォーム処理
function PaymentForm() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [data, setData]           = useState<PaymentResult | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    try {
      const result = await processPayment(new FormData(e.currentTarget))
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '決済に失敗しました')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
      <button type="submit" disabled={isPending}>
        {isPending ? '処理中...' : '決済する'}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  )
}
```

loading・error・data の状態を常に手動で管理するこのパターンは、React 19 の Actions によって大幅にシンプルになる。

### React 19 の主要変更点

| カテゴリ | 機能 | 概要 |
|---------|------|------|
| Actions | `useTransition` の非同期対応 | transition 内で async 関数が使えるようになった |
| Actions | `useActionState` | フォームアクションの状態（pending/error/data）を管理 |
| Actions | `useFormStatus` | フォーム送信中の状態を子コンポーネントで取得 |
| Actions | `useOptimistic` | 楽観的 UI 更新のプリミティブ |
| Hooks | `use()` | Promise と Context を条件分岐内で直接参照 |
| Compiler | React Compiler | 自動メモ化（`useMemo` / `useCallback` が不要に） |
| エラー | Error Boundary 改善 | ハイドレーションエラーの詳細化 |
| DX | ref as prop | `forwardRef` が不要に |
| DX | Document Metadata | `<title>` / `<meta>` を直接レンダリング可能に |

---

## Actions — 非同期処理の新しいプリミティブ

### useTransition の非同期対応

React 18 の `useTransition` は同期的な状態更新を低優先度でバッチ処理するものだったが、React 19 では **async 関数を直接渡せるようになった**。

```typescript
import { useTransition } from 'react'

function SearchForm() {
  const [isPending, startTransition] = useTransition()
  const [results, setResults] = useState<SearchResult[]>([])

  const handleSearch = (query: string) => {
    startTransition(async () => {
      // React 19: useTransition に async 関数を渡せる
      const data = await fetchSearchResults(query)
      setResults(data)
    })
  }

  return (
    <div>
      <input
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="検索..."
      />
      {isPending && <Spinner />}
      <ResultList items={results} />
    </div>
  )
}
```

transition 内の非同期処理が完了するまで `isPending` が `true` になる。エラーが発生した場合は最も近い Error Boundary がキャッチする。

### useActionState — フォーム状態管理

`useActionState` は React 19 の中心的な新 Hook で、フォームアクションの **pending / error / data** を一元管理する。

```typescript
import { useActionState } from 'react'

type FormState = {
  success: boolean
  error: string | null
  data: { id: string; message: string } | null
}

async function submitContact(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const name  = formData.get('name') as string
  const email = formData.get('email') as string
  const body  = formData.get('body') as string

  if (!name || !email) {
    return { success: false, error: '名前とメールアドレスは必須です', data: null }
  }

  try {
    const result = await sendContactEmail({ name, email, body })
    return { success: true, error: null, data: result }
  } catch {
    return { success: false, error: 'メール送信に失敗しました', data: null }
  }
}

function ContactForm() {
  const initialState: FormState = { success: false, error: null, data: null }
  const [state, formAction, isPending] = useActionState(submitContact, initialState)

  return (
    <form action={formAction}>
      <input name="name" placeholder="お名前" required />
      <input name="email" type="email" placeholder="メールアドレス" required />
      <textarea name="body" placeholder="お問い合わせ内容" />

      {state.error && (
        <p className="text-red-600" role="alert">{state.error}</p>
      )}
      {state.success && (
        <p className="text-green-600">送信完了しました！</p>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? '送信中...' : '送信する'}
      </button>
    </form>
  )
}
```

React 18 の 30 行以上のパターンが約 20 行に削減できた。`isPending` の管理が不要になり、ローディング・エラー・成功の状態が `state` オブジェクトに集約される。

### useFormStatus — 送信状態のコンポーネント間共有

フォーム内の子コンポーネントが親フォームの送信状態を取得できる Hook。`useActionState` の `isPending` をバケツリレーする必要がなくなる。

```typescript
import { useFormStatus } from 'react-dom'

// Submit ボタンを独立したコンポーネントとして定義
function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  // pending は親 <form> の action が実行中かどうか

  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? (
        <>
          <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          処理中...
        </>
      ) : children}
    </button>
  )
}

// 再利用可能な SubmitButton を使う
function OrderForm() {
  const [state, formAction] = useActionState(processOrder, null)

  return (
    <form action={formAction}>
      <ProductSelect />
      <QuantityInput />
      <SubmitButton>注文を確定する</SubmitButton>
    </form>
  )
}
```

`useFormStatus` はフォームの直接の子コンポーネントでないと動作しない点に注意する。Context や Portal 経由では機能しない。

### useOptimistic — 楽観的 UI 更新

サーバーレスポンスを待たずに UI を先行更新し、失敗時に自動ロールバックするパターンを実装する Hook。

```typescript
import { useOptimistic, useTransition } from 'react'

type Message = {
  id: string
  text: string
  sending?: boolean
}

function ChatRoom({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isPending, startTransition] = useTransition()

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state: Message[], newMessage: Message) => [...state, newMessage]
  )

  const sendMessage = async (text: string) => {
    const tempId = crypto.randomUUID()

    startTransition(async () => {
      // 楽観的に追加（sending フラグ付き）
      addOptimisticMessage({ id: tempId, text, sending: true })

      try {
        // 実際の API 呼び出し
        const saved = await postMessage(text)
        setMessages((prev) => [...prev, saved])
      } catch {
        // 失敗時は optimistic 更新が自動的にロールバックされる
        console.error('メッセージ送信に失敗しました')
      }
    })
  }

  return (
    <div>
      <ul>
        {optimisticMessages.map((msg) => (
          <li key={msg.id} className={msg.sending ? 'opacity-50' : ''}>
            {msg.text}
            {msg.sending && <span className="text-xs text-gray-400"> 送信中...</span>}
          </li>
        ))}
      </ul>
      <MessageInput onSend={sendMessage} disabled={isPending} />
    </div>
  )
}
```

---

## use() Hook — 非同期データの直接参照

`use()` は既存の Hook ルール（条件分岐・ループの中では呼べない）を**唯一破れる**特別な Hook だ。

### Promise の展開

```typescript
import { use, Suspense } from 'react'

// データフェッチ関数（Promise を返す）
const getUserProfile = (userId: string): Promise<UserProfile> =>
  fetch(`/api/users/${userId}`).then((res) => res.json())

// Promise をキャッシュ（コンポーネント外で生成する）
const profilePromise = getUserProfile('user-123')

function UserProfile() {
  // use() は Suspense と連携して Promise を展開する
  const profile = use(profilePromise)

  return (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.bio}</p>
    </div>
  )
}

// 親コンポーネントで Suspense でラップ
function App() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfile />
    </Suspense>
  )
}
```

### 条件分岐内での Context 参照

```typescript
import { use, createContext } from 'react'

const ThemeContext = createContext<'light' | 'dark'>('light')

function ThemedButton({ variant }: { variant: 'primary' | 'secondary' }) {
  // use() は if 文の中でも呼べる（useContext では不可）
  if (variant === 'primary') {
    const theme = use(ThemeContext)
    const isDark = theme === 'dark'

    return (
      <button className={isDark ? 'bg-white text-black' : 'bg-black text-white'}>
        プライマリボタン
      </button>
    )
  }

  return <button className="bg-gray-200">セカンダリボタン</button>
}
```

---

## React Compiler — 自動メモ化

React Compiler（旧 React Forget）は React 19 と並行して提供が始まったビルドツールで、コンポーネントと Hook を静的解析して**自動的に `useMemo` / `useCallback` / `React.memo` 相当の最適化**を適用する。

```typescript
// React Compiler 適用前（開発者が手動でメモ化）
import { useMemo, useCallback, memo } from 'react'

const ExpensiveList = memo(function ExpensiveList({
  items,
  onSelect,
}: {
  items: Item[]
  onSelect: (id: string) => void
}) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  )

  const handleClick = useCallback(
    (id: string) => onSelect(id),
    [onSelect]
  )

  return (
    <ul>
      {sorted.map((item) => (
        <li key={item.id} onClick={() => handleClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  )
})
```

```typescript
// React Compiler 適用後（開発者が書くコード）
// memo / useMemo / useCallback は不要
function ExpensiveList({
  items,
  onSelect,
}: {
  items: Item[]
  onSelect: (id: string) => void
}) {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <ul>
      {sorted.map((item) => (
        <li key={item.id} onClick={() => onSelect(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  )
}
```

コンパイラが同等のメモ化を自動挿入するため、手動の最適化コードが不要になる。

### React Compiler の導入方法

```bash
npm install -D babel-plugin-react-compiler
```

```javascript
// babel.config.js
module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {
      compilationMode: 'annotation',  // 'all' にすると全コンポーネントに適用
    }],
  ],
}
```

---

## Server Components・Server Actions との統合

React 19 の Actions は Next.js の Server Actions と深く統合されている。

```typescript
// app/actions.ts（Next.js App Router）
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(
  prevState: { error: string | null },
  formData: FormData
) {
  const title   = formData.get('title') as string
  const content = formData.get('content') as string

  if (title.length < 3) {
    return { error: 'タイトルは3文字以上必要です' }
  }

  await db.post.create({ data: { title, content } })
  revalidatePath('/posts')
  redirect('/posts')
}
```

```typescript
// app/posts/new/page.tsx
'use client'

import { useActionState } from 'react'
import { createPost } from '../actions'

export default function NewPostPage() {
  const [state, formAction, isPending] = useActionState(createPost, { error: null })

  return (
    <form action={formAction}>
      <input name="title" placeholder="タイトル" required />
      <textarea name="content" placeholder="本文" required />
      {state.error && <p className="text-red-500">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? '投稿中...' : '投稿する'}
      </button>
    </form>
  )
}
```

---

## React 18 → 19 移行ガイド

### 破壊的変更の一覧

| 変更点 | v18 | v19 |
|-------|-----|-----|
| `useFormState` | `react-dom` に存在 | `useActionState` にリネーム |
| `ReactDOM.render` | 非推奨警告 | 削除（エラー） |
| `ReactDOM.hydrate` | 非推奨警告 | 削除（エラー） |
| `defaultProps`（関数コンポーネント） | 動作する | 非推奨警告 |
| `string refs` | 非推奨警告 | 削除 |
| `Legacy Context` (`contextTypes`) | 動作する | 削除 |
| `act()` のエクスポート元 | `react-dom/test-utils` | `react` 直接 |

### 移行手順

**Step 1: React 19 にアップグレード**

```bash
npm install react@19 react-dom@19
npm install -D @types/react@19 @types/react-dom@19
```

**Step 2: TypeScript の型エラーを修正**

```typescript
// v18: ref の型
const ref = useRef<HTMLDivElement>(null)
// v19: ref は RefObject<T> ではなく Ref<T> を使う（forwardRef 廃止に伴う変更）
```

**Step 3: `useFormState` を `useActionState` にリネーム**

```bash
# 一括置換
find src -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i 's/useFormState/useActionState/g'

# import 元の変更
find src -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i "s/from 'react-dom'/from 'react'/g"
```

**Step 4: `forwardRef` の削除**

```typescript
// v18: forwardRef が必要
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={className} {...props} />
  )
)

// v19: ref を通常の prop として受け取れる
function Input({ className, ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} className={className} {...props} />
}
```

**Step 5: テストコードの `act()` インポートを更新**

```typescript
// v18
import { act } from 'react-dom/test-utils'

// v19
import { act } from 'react'
```

---

## まとめ

React 19 の変更の本質は、**「非同期状態管理のボイラープレートを React 本体が吸収した」**点にある。

- `useActionState` でフォームの pending/error/data を一元管理
- `useFormStatus` で送信状態を子コンポーネントにドリルダウンなしで渡す
- `useOptimistic` で楽観的 UI をパターン化
- `use()` で非同期データを宣言的に参照
- React Compiler で手動メモ化を廃止

これらを活用することで、React 18 で `useEffect` + `useState` の組み合わせで書いていた非同期ロジックの多くが削除または大幅に簡略化できる。移行の際は破壊的変更の一覧を確認し、特に `useFormState` → `useActionState` のリネームと `ReactDOM.render` の廃止に注意して進めてほしい。
