---
title: "React 19 Form Actions完全ガイド: useActionStateとuseFormStatusの活用"
description: "React 19の新しいフォーム機能であるForm Actions、useActionState、useFormStatusを使った実践的なフォーム実装方法を解説します。"
pubDate: "2025-10-15"
updatedDate: "2025-10-15"
tags: ["React", "React 19", "Form Actions", "フォーム", "TypeScript"]
category: "Frontend"
---

React 19では、フォーム処理を大幅に簡素化する新しいAPIが導入されました。本記事では、Form ActionsとuseActionState、useFormStatusフックを使った実践的なフォーム実装方法を解説します。

## React 19以前のフォーム処理

従来のReactでは、フォームの状態管理、バリデーション、送信処理、エラーハンドリングをすべて手動で実装する必要がありました。

```typescript
// React 18以前の典型的なフォーム実装
import { useState, FormEvent } from 'react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()
      // ログイン成功処理
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Login'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
```

この実装には多くのボイラープレートが含まれています。

## React 19のForm Actions

React 19では、`action` propを使ってフォーム送信を簡潔に処理できます。

```typescript
// React 19のForm Actions
import { useActionState } from 'react'

type LoginState = {
  error?: string
  success?: boolean
}

async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      return { error: 'Login failed' }
    }

    return { success: true }
  } catch (error) {
    return { error: 'An error occurred' }
  }
}

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {})

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Loading...' : 'Login'}
      </button>
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p className="success">Login successful!</p>}
    </form>
  )
}
```

**主な改善点:**
- 状態管理のボイラープレートが大幅に削減
- `isPending`が自動的に管理される
- FormDataを直接扱える
- 非制御コンポーネントとして実装可能

## useActionStateの詳細

`useActionState`は、非同期アクションの状態を管理するフックです。

```typescript
import { useActionState } from 'react'

const [state, formAction, isPending] = useActionState(
  actionFunction,
  initialState,
  permalink? // オプション: Server Actionsで使用
)
```

### 実践例: ユーザー登録フォーム

```typescript
import { useActionState } from 'react'
import { z } from 'zod'

// バリデーションスキーマ
const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type RegisterState = {
  errors?: {
    username?: string[]
    email?: string[]
    password?: string[]
    confirmPassword?: string[]
    _form?: string[]
  }
  success?: boolean
}

async function registerAction(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  // バリデーション
  const validationResult = registerSchema.safeParse({
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  // API呼び出し
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validationResult.data),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        errors: {
          _form: [error.message || 'Registration failed'],
        },
      }
    }

    return { success: true }
  } catch (error) {
    return {
      errors: {
        _form: ['An unexpected error occurred'],
      },
    }
  }
}

function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, {})

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          required
          disabled={isPending}
        />
        {state.errors?.username && (
          <p className="text-red-500">{state.errors.username[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          disabled={isPending}
        />
        {state.errors?.email && (
          <p className="text-red-500">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          disabled={isPending}
        />
        {state.errors?.password && (
          <p className="text-red-500">{state.errors.password[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          disabled={isPending}
        />
        {state.errors?.confirmPassword && (
          <p className="text-red-500">{state.errors.confirmPassword[0]}</p>
        )}
      </div>

      {state.errors?._form && (
        <div className="bg-red-50 p-4 rounded">
          {state.errors._form.map((error, i) => (
            <p key={i} className="text-red-500">{error}</p>
          ))}
        </div>
      )}

      {state.success && (
        <div className="bg-green-50 p-4 rounded">
          <p className="text-green-500">Registration successful!</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-500 text-white py-2 rounded disabled:bg-gray-300"
      >
        {isPending ? 'Registering...' : 'Register'}
      </button>
    </form>
  )
}
```

## useFormStatusフック

`useFormStatus`は、親フォームの送信状態を取得できるフックです。

```typescript
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  )
}

function MyForm() {
  return (
    <form action={myAction}>
      <input name="email" type="email" />
      <SubmitButton />
    </form>
  )
}
```

### 実践例: 楽観的UI更新

```typescript
import { useActionState, useOptimistic } from 'react'
import { useFormStatus } from 'react-dom'

type Comment = {
  id: string
  text: string
  author: string
  createdAt: string
}

type CommentState = {
  error?: string
}

async function addCommentAction(
  prevState: CommentState,
  formData: FormData
): Promise<CommentState> {
  const text = formData.get('text') as string
  const author = formData.get('author') as string

  try {
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, author }),
    })

    if (!response.ok) {
      return { error: 'Failed to add comment' }
    }

    return {}
  } catch (error) {
    return { error: 'An error occurred' }
  }
}

function CommentButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Adding...' : 'Add Comment'}
    </button>
  )
}

function CommentsSection({ initialComments }: { initialComments: Comment[] }) {
  const [comments, setComments] = useState(initialComments)
  const [state, formAction] = useActionState(addCommentAction, {})
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (state, newComment: Comment) => [...state, newComment]
  )

  return (
    <div>
      <ul>
        {optimisticComments.map((comment) => (
          <li key={comment.id} className={comment.id.startsWith('temp-') ? 'opacity-50' : ''}>
            <p>{comment.text}</p>
            <small>{comment.author} - {comment.createdAt}</small>
          </li>
        ))}
      </ul>

      <form
        action={async (formData) => {
          // 楽観的更新
          addOptimisticComment({
            id: `temp-${Date.now()}`,
            text: formData.get('text') as string,
            author: formData.get('author') as string,
            createdAt: new Date().toISOString(),
          })

          // 実際のアクション実行
          await formAction(formData)

          // 成功時はフォームをリセット
          if (!state.error) {
            ;(document.querySelector('form') as HTMLFormElement)?.reset()
          }
        }}
      >
        <input name="author" placeholder="Your name" required />
        <textarea name="text" placeholder="Your comment" required />
        <CommentButton />
        {state.error && <p className="error">{state.error}</p>}
      </form>
    </div>
  )
}
```

## 高度なパターン

### 1. 複数ステップフォーム

```typescript
import { useActionState } from 'react'

type Step = 'personal' | 'address' | 'payment' | 'confirm'

type FormState = {
  step: Step
  data: {
    personal?: { name: string; email: string }
    address?: { street: string; city: string; zip: string }
    payment?: { cardNumber: string; expiry: string }
  }
  errors?: Record<string, string[]>
}

async function multiStepAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const action = formData.get('_action') as string

  if (action === 'next') {
    const currentStep = prevState.step

    // 現在のステップのデータを保存
    if (currentStep === 'personal') {
      return {
        ...prevState,
        step: 'address',
        data: {
          ...prevState.data,
          personal: {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
          },
        },
      }
    }

    if (currentStep === 'address') {
      return {
        ...prevState,
        step: 'payment',
        data: {
          ...prevState.data,
          address: {
            street: formData.get('street') as string,
            city: formData.get('city') as string,
            zip: formData.get('zip') as string,
          },
        },
      }
    }

    if (currentStep === 'payment') {
      return {
        ...prevState,
        step: 'confirm',
        data: {
          ...prevState.data,
          payment: {
            cardNumber: formData.get('cardNumber') as string,
            expiry: formData.get('expiry') as string,
          },
        },
      }
    }
  }

  if (action === 'back') {
    const steps: Step[] = ['personal', 'address', 'payment', 'confirm']
    const currentIndex = steps.indexOf(prevState.step)
    return {
      ...prevState,
      step: steps[Math.max(0, currentIndex - 1)],
    }
  }

  if (action === 'submit') {
    // 最終送信処理
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prevState.data),
      })

      return {
        ...prevState,
        step: 'personal', // リセット
        data: {},
      }
    } catch (error) {
      return {
        ...prevState,
        errors: { _form: ['Submission failed'] },
      }
    }
  }

  return prevState
}

function MultiStepForm() {
  const [state, formAction, isPending] = useActionState(multiStepAction, {
    step: 'personal',
    data: {},
  })

  return (
    <form action={formAction}>
      {state.step === 'personal' && (
        <>
          <h2>Personal Information</h2>
          <input name="name" defaultValue={state.data.personal?.name} required />
          <input name="email" type="email" defaultValue={state.data.personal?.email} required />
          <button type="submit" name="_action" value="next">Next</button>
        </>
      )}

      {state.step === 'address' && (
        <>
          <h2>Address</h2>
          <input name="street" defaultValue={state.data.address?.street} required />
          <input name="city" defaultValue={state.data.address?.city} required />
          <input name="zip" defaultValue={state.data.address?.zip} required />
          <button type="submit" name="_action" value="back">Back</button>
          <button type="submit" name="_action" value="next">Next</button>
        </>
      )}

      {state.step === 'payment' && (
        <>
          <h2>Payment</h2>
          <input name="cardNumber" required />
          <input name="expiry" placeholder="MM/YY" required />
          <button type="submit" name="_action" value="back">Back</button>
          <button type="submit" name="_action" value="next">Next</button>
        </>
      )}

      {state.step === 'confirm' && (
        <>
          <h2>Confirm</h2>
          <pre>{JSON.stringify(state.data, null, 2)}</pre>
          <button type="submit" name="_action" value="back">Back</button>
          <button type="submit" name="_action" value="submit" disabled={isPending}>
            {isPending ? 'Submitting...' : 'Submit'}
          </button>
        </>
      )}

      {state.errors?._form && (
        <p className="error">{state.errors._form[0]}</p>
      )}
    </form>
  )
}
```

### 2. リアルタイムバリデーション

```typescript
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useEffect, useState } from 'react'

async function checkUsernameAvailability(username: string): Promise<boolean> {
  const response = await fetch(`/api/check-username?username=${username}`)
  const data = await response.json()
  return data.available
}

function UsernameInput() {
  const [username, setUsername] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const { pending } = useFormStatus()

  useEffect(() => {
    if (username.length < 3) {
      setIsAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsChecking(true)
      const available = await checkUsernameAvailability(username)
      setIsAvailable(available)
      setIsChecking(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  return (
    <div>
      <input
        name="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={pending}
      />
      {isChecking && <span>Checking...</span>}
      {isAvailable === true && <span className="text-green-500">✓ Available</span>}
      {isAvailable === false && <span className="text-red-500">✗ Taken</span>}
    </div>
  )
}
```

## まとめ

React 19のForm Actionsは、フォーム実装を大幅に簡素化します。

**主な利点:**
- ボイラープレートの大幅削減
- 非制御コンポーネントによるパフォーマンス向上
- FormDataの直接的な扱い
- `isPending`の自動管理
- Server Actionsとのシームレスな統合

**適用シーン:**
- ログイン・登録フォーム
- データ送信フォーム
- 複数ステップフォーム
- 楽観的UI更新が必要な場合

従来の状態管理アプローチと比較して、よりシンプルで保守性の高いコードを書けます。
