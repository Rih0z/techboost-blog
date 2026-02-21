---
title: 'React Hook Form + Zod 完全ガイド — 型安全なフォームバリデーション実装'
description: 'React Hook FormとZodを組み合わせた型安全なフォームバリデーションの実装方法を徹底解説。基本から応用まで実践的なコード例付き。'
pubDate: '2026-02-21'
heroImage: '/blog-placeholder-3.jpg'
tags: ['React', 'TypeScript', 'Form', 'Validation', 'Zod']
---

フォームはWebアプリケーションの要だ。ログイン、会員登録、商品注文——どんなアプリでも必ずフォームが登場する。しかし、Reactでフォームを実装するのは案外難しい。バリデーション、エラーメッセージ、非同期処理、パフォーマンス……考慮すべき点が多すぎる。

**React Hook Form**と**Zod**の組み合わせは、この問題をエレガントに解決する。React Hook FormがUIとパフォーマンスを担い、Zodが型安全なバリデーションを担う。この2つを組み合わせることで、堅牢で保守しやすいフォームを最小限のコードで実装できる。

本記事では、基本的なセットアップから、動的フィールド、条件付きバリデーション、Server Actionsとの統合、テスト方法まで、実践的なコードとともに徹底解説する。

---

## 1. なぜReact Hook Formなのか — 従来のアプローチとの比較

### 従来の制御コンポーネントの問題点

Reactフォームの「素朴な」実装では、`useState`で各フィールドの値を管理する。

```typescript
// 従来の制御コンポーネント方式
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [emailError, setEmailError] = useState('');
const [passwordError, setPasswordError] = useState('');

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // 手動バリデーション…
  if (!email.includes('@')) {
    setEmailError('メールアドレスの形式が正しくありません');
    return;
  }
  // フィールドが増えるにつれて地獄になる
};
```

この方式には深刻な問題がある。

**パフォーマンス問題**: 1文字入力するたびに全コンポーネントが再レンダリングされる。フィールドが多いフォームでは顕著に遅くなる。

**ボイラープレートの爆発**: フィールドが10個あれば、`useState`を10個書く必要がある。バリデーションロジックも手動で書かなければならない。

**型安全性の欠如**: バリデーションロジックとTypeScript型定義が分離しているため、整合性を保つのが難しい。

### React Hook Formが解決すること

React Hook Formは**非制御コンポーネント**方式を採用している。フォームの値をReactのstateで管理せず、DOMのrefを通じて直接読み取る。これにより：

- **再レンダリングを最小限に抑制** — 入力中は再レンダリングが発生しない
- **ボイラープレートの削減** — `register()`一発でフィールドを登録
- **型安全なフォーム値** — Zodスキーマから型を自動導出

実際のパフォーマンス差を見てみよう。

```typescript
// React Hook Form方式 — 再レンダリングは送信時のみ
import { useForm } from 'react-hook-form';

function LoginForm() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data: unknown) => {
    console.log(data); // { email: '...', password: '...' }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      <input {...register('password')} type="password" />
      <button type="submit">ログイン</button>
    </form>
  );
}
```

たったこれだけだ。`useState`も`onChange`ハンドラも不要。

---

## 2. Zodスキーマの定義方法

### インストール

```bash
npm install react-hook-form zod @hookform/resolvers
```

### 基本的な型定義

Zodは豊富な組み込みバリデーターを提供している。

```typescript
import { z } from 'zod';

// 文字列
const nameSchema = z.string().min(1, '名前は必須です').max(50, '50文字以内で入力してください');

// メールアドレス
const emailSchema = z.string().email('正しいメールアドレスを入力してください');

// 数値
const ageSchema = z.number().int('整数で入力してください').min(0).max(150);

// 文字列から数値への変換（フォームで使用頻度高）
const priceSchema = z.coerce.number().positive('価格は正の数で入力してください');

// 真偽値
const termsSchema = z.literal(true, {
  errorMap: () => ({ message: '利用規約への同意が必要です' }),
});

// 列挙型
const roleSchema = z.enum(['admin', 'user', 'moderator']);

// 日付
const birthDateSchema = z.date().max(new Date(), '未来の日付は指定できません');

// オプション（省略可能）
const bioSchema = z.string().optional();

// デフォルト値
const countrySchema = z.string().default('JP');
```

### オブジェクトスキーマ

実際のフォームでは`z.object()`を使ってフォーム全体のスキーマを定義する。

```typescript
const loginSchema = z.object({
  email: z.string()
    .min(1, 'メールアドレスは必須です')
    .email('正しいメールアドレスを入力してください'),
  password: z.string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードには大文字・小文字・数字をそれぞれ1文字以上含めてください'
    ),
  rememberMe: z.boolean().default(false),
});

// スキーマからTypeScript型を自動導出 — これがZodの最大の魅力
type LoginFormData = z.infer<typeof loginSchema>;
// 等価: { email: string; password: string; rememberMe: boolean }
```

### 配列スキーマ

```typescript
const tagsSchema = z.array(z.string().min(1)).min(1, 'タグを1つ以上追加してください').max(5, 'タグは最大5つまでです');

const addressListSchema = z.array(
  z.object({
    street: z.string().min(1, '番地は必須です'),
    city: z.string().min(1, '市区町村は必須です'),
    zipCode: z.string().regex(/^\d{3}-\d{4}$/, '郵便番号はXXX-XXXX形式で入力してください'),
  })
).min(1, '住所を1つ以上入力してください');
```

### ユニオン型とdiscriminatedUnion

```typescript
// シンプルなユニオン
const contactMethodSchema = z.union([
  z.string().email(),
  z.string().regex(/^\+?[\d\s-]{10,}$/),
]);

// discriminatedUnion（条件付きスキーマに使用）
const paymentSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('credit_card'),
    cardNumber: z.string().regex(/^\d{16}$/, 'カード番号は16桁で入力してください'),
    expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, '有効期限はMM/YY形式で入力してください'),
    cvv: z.string().regex(/^\d{3,4}$/, 'CVVは3〜4桁で入力してください'),
  }),
  z.object({
    method: z.literal('bank_transfer'),
    bankCode: z.string().regex(/^\d{4}$/, '銀行コードは4桁で入力してください'),
    accountNumber: z.string().regex(/^\d{7}$/, '口座番号は7桁で入力してください'),
  }),
  z.object({
    method: z.literal('convenience_store'),
    storeChain: z.enum(['7eleven', 'lawson', 'familymart']),
  }),
]);
```

### refinement — カスタムバリデーション

`refine()`と`superRefine()`を使うことで、複数フィールドにまたがる複雑なバリデーションを定義できる。

```typescript
// 単一フィールドのrefine
const passwordSchema = z.string()
  .min(8)
  .refine(
    (val) => !val.includes(' '),
    { message: 'パスワードにスペースは使用できません' }
  );

// 複数フィールドのrefine（パスワード確認）
const registerSchema = z.object({
  email: z.string().email('正しいメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上必要です'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'], // エラーを表示するフィールドを指定
  }
);

// superRefine — 複数のエラーを同時に報告
const complexSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  minBudget: z.coerce.number(),
  maxBudget: z.coerce.number(),
}).superRefine((data, ctx) => {
  if (new Date(data.startDate) >= new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '終了日は開始日より後にしてください',
      path: ['endDate'],
    });
  }
  if (data.minBudget >= data.maxBudget) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '最大予算は最小予算より大きくしてください',
      path: ['maxBudget'],
    });
  }
});
```

---

## 3. useForm + zodResolverの統合

### 基本的な統合パターン

`@hookform/resolvers`の`zodResolver`を使って、ZodスキーマをReact Hook Formのバリデーターとして登録する。

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string()
    .min(1, 'メールアドレスは必須です')
    .email('正しいメールアドレスを入力してください'),
  password: z.string()
    .min(8, 'パスワードは8文字以上で入力してください'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur', // バリデーションのタイミング: 'onBlur' | 'onChange' | 'onSubmit' | 'all'
  });

  const onSubmit = async (data: LoginFormData) => {
    // dataはLoginFormData型として型チェック済み
    console.log(data.email, data.password);
    await loginUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          {...register('email')}
          type="email"
          placeholder="メールアドレス"
        />
        {errors.email && <p>{errors.email.message}</p>}
      </div>

      <div>
        <input
          {...register('password')}
          type="password"
          placeholder="パスワード"
        />
        {errors.password && <p>{errors.password.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  );
}
```

### useFormのオプション解説

```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),

  // デフォルト値
  defaultValues: {
    name: '',
    age: 0,
    tags: [],
  },

  // バリデーションのタイミング
  // 'onSubmit'（デフォルト）: 送信時のみ
  // 'onBlur': フォーカスが外れたとき
  // 'onChange': 入力のたびに
  // 'onTouched': 最初のblur後はonChange
  // 'all': onBlur + onChange
  mode: 'onBlur',

  // 再バリデーションのタイミング（エラー表示後）
  reValidateMode: 'onChange',

  // shouldUnregister: フィールドがアンマウントされたとき値をリセット
  shouldUnregister: false,

  // criteriaMode: エラーを全て収集するかどうか
  criteriaMode: 'all', // 'firstError'（デフォルト）または'all'
});
```

---

## 4. 実践的なフォーム実装例

### ログインフォーム（完全版）

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';

const loginSchema = z.object({
  email: z.string()
    .min(1, 'メールアドレスは必須です')
    .email('正しいメールアドレスの形式で入力してください'),
  password: z.string()
    .min(1, 'パスワードは必須です')
    .min(8, 'パスワードは8文字以上で入力してください'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();

        // サーバーサイドのフィールドエラーをフォームにセット
        if (error.field === 'email') {
          setError('email', { message: error.message });
        } else if (error.field === 'password') {
          setError('password', { message: error.message });
        } else {
          setServerError(error.message || 'ログインに失敗しました');
        }
        return;
      }

      // ログイン成功処理
      window.location.href = '/dashboard';
    } catch (err) {
      setServerError('ネットワークエラーが発生しました。再度お試しください。');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {serverError && (
        <div role="alert" className="error-banner">
          {serverError}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="field-error">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p id="password-error" role="alert" className="field-error">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="form-group checkbox">
        <input id="rememberMe" type="checkbox" {...register('rememberMe')} />
        <label htmlFor="rememberMe">ログイン状態を保持する</label>
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  );
}
```

### 会員登録フォーム（パスワード確認付き）

```typescript
const registerSchema = z.object({
  username: z.string()
    .min(3, 'ユーザー名は3文字以上で入力してください')
    .max(20, 'ユーザー名は20文字以内で入力してください')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ユーザー名は英数字とアンダースコア、ハイフンのみ使用できます'),
  email: z.string()
    .min(1, 'メールアドレスは必須です')
    .email('正しいメールアドレスを入力してください'),
  password: z.string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'パスワードは大文字・小文字・数字・記号をそれぞれ1文字以上含めてください'
    ),
  confirmPassword: z.string().min(1, 'パスワード確認は必須です'),
  birthYear: z.coerce.number()
    .int('年は整数で入力してください')
    .min(1900, '正しい年を入力してください')
    .max(new Date().getFullYear(), '未来の年は入力できません'),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: '利用規約への同意が必要です' }),
  }),
  agreeToPrivacy: z.literal(true, {
    errorMap: () => ({ message: 'プライバシーポリシーへの同意が必要です' }),
  }),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  }
);

type RegisterFormData = z.infer<typeof registerSchema>;

function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const password = watch('password');

  // パスワード強度のリアルタイム表示
  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    // confirmPasswordはサーバーに送る必要がない
    const { confirmPassword, ...submitData } = data;
    await registerUser(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="username">ユーザー名</label>
        <input id="username" {...register('username')} />
        {errors.username && <p role="alert">{errors.username.message}</p>}
      </div>

      <div>
        <label htmlFor="password">パスワード</label>
        <input id="password" type="password" {...register('password')} />
        <PasswordStrengthIndicator strength={passwordStrength} />
        {errors.password && <p role="alert">{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword">パスワード確認</label>
        <input id="confirmPassword" type="password" {...register('confirmPassword')} />
        {errors.confirmPassword && <p role="alert">{errors.confirmPassword.message}</p>}
      </div>

      <div>
        <input id="agreeToTerms" type="checkbox" {...register('agreeToTerms')} />
        <label htmlFor="agreeToTerms">
          <a href="/terms">利用規約</a>に同意する
        </label>
        {errors.agreeToTerms && <p role="alert">{errors.agreeToTerms.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '登録中...' : 'アカウントを作成'}
      </button>
    </form>
  );
}
```

---

## 5. エラーメッセージの表示とUX

### エラー表示の基本パターン

```typescript
// errorsオブジェクトからフィールドのエラーを取得
const { formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

// 単純なエラー表示
{errors.email && <p>{errors.email.message}</p>}

// 型安全なエラー表示（ネストしたオブジェクト）
{errors.address?.street && <p>{errors.address.street.message}</p>}

// 配列のエラー（FieldArray使用時）
{errors.items?.[0]?.name && <p>{errors.items[0].name?.message}</p>}
```

### 再利用可能なFormFieldコンポーネント

```typescript
import { forwardRef } from 'react';
import type { FieldError } from 'react-hook-form';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FieldError;
  hint?: string;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, id, ...props }, ref) => {
    const fieldId = id || label.toLowerCase().replace(/\s/g, '-');
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;

    return (
      <div className={`form-field ${error ? 'has-error' : ''}`}>
        <label htmlFor={fieldId}>{label}</label>

        {hint && <p id={hintId} className="field-hint">{hint}</p>}

        <input
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={[hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
          {...props}
        />

        {error && (
          <p id={errorId} role="alert" className="field-error">
            {error.message}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// 使い方
function MyForm() {
  const { register, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <form>
      <FormField
        label="メールアドレス"
        type="email"
        error={errors.email}
        hint="登録済みのメールアドレスを入力してください"
        {...register('email')}
      />
    </form>
  );
}
```

### criteriaMode: 'all' で複数エラーを同時表示

```typescript
const passwordSchema = z.object({
  password: z.string()
    .min(8, '8文字以上必要です')
    .regex(/[A-Z]/, '大文字を含める必要があります')
    .regex(/[a-z]/, '小文字を含める必要があります')
    .regex(/[0-9]/, '数字を含める必要があります'),
});

function PasswordForm() {
  const { register, formState: { errors } } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    criteriaMode: 'all', // 全エラーを収集
    mode: 'onChange',
  });

  return (
    <div>
      <input type="password" {...register('password')} />

      {/* 複数エラーをリストで表示 */}
      {errors.password?.types && (
        <ul className="error-list">
          {Object.values(errors.password.types).map((msg, i) => (
            <li key={i} className="error-item">{msg as string}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 6. フォームの送信処理と非同期バリデーション

### 非同期バリデーション（`refine`内で非同期処理）

Zodの`refine()`はPromiseを返す非同期関数も受け付ける。

```typescript
const usernameSchema = z.object({
  username: z.string()
    .min(3, 'ユーザー名は3文字以上必要です')
    .refine(
      async (username) => {
        // APIでユーザー名の重複チェック
        const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
        const { available } = await response.json();
        return available;
      },
      { message: 'このユーザー名はすでに使用されています' }
    ),
});
```

ただし、非同期バリデーションはすべてのキーストロークで実行されるとパフォーマンスが悪化する。`mode: 'onBlur'`との組み合わせを推奨する。

### 送信後のフォームリセット

```typescript
function SubmitForm() {
  const { register, handleSubmit, reset, formState: { isSubmitSuccessful } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset(); // 送信成功後にフォームをリセット
    }
  }, [isSubmitSuccessful, reset]);

  const onSubmit = async (data: FormData) => {
    await submitData(data);
    // isSubmitSuccessfulが自動でtrueになる（エラーがなければ）
  };

  // 特定の値にリセット
  const resetToDefaults = () => {
    reset({
      name: '田中太郎',
      email: 'tanaka@example.com',
    });
  };

  return <form onSubmit={handleSubmit(onSubmit)}>{/* ... */}</form>;
}
```

---

## 7. FieldArray — 動的フィールドの実装

複数の項目を追加・削除できる動的フォームは`useFieldArray`で実装する。

### 基本的なFieldArray

```typescript
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const invoiceSchema = z.object({
  clientName: z.string().min(1, 'クライアント名は必須です'),
  items: z.array(
    z.object({
      description: z.string().min(1, '説明は必須です'),
      quantity: z.coerce.number().int().positive('数量は1以上の整数を入力してください'),
      unitPrice: z.coerce.number().positive('単価は正の数を入力してください'),
    })
  ).min(1, '明細を1件以上追加してください'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

function InvoiceForm() {
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientName: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'items',
  });

  // 合計金額をリアルタイム計算
  const items = watch('items');
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const onSubmit = (data: InvoiceFormData) => {
    console.log('請求書データ:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>クライアント名</label>
        <input {...register('clientName')} />
        {errors.clientName && <p role="alert">{errors.clientName.message}</p>}
      </div>

      <fieldset>
        <legend>請求明細</legend>

        {fields.map((field, index) => (
          <div key={field.id} className="invoice-item">
            <div>
              <label>説明</label>
              <input {...register(`items.${index}.description`)} />
              {errors.items?.[index]?.description && (
                <p role="alert">{errors.items[index].description?.message}</p>
              )}
            </div>

            <div>
              <label>数量</label>
              <input
                type="number"
                {...register(`items.${index}.quantity`)}
              />
              {errors.items?.[index]?.quantity && (
                <p role="alert">{errors.items[index].quantity?.message}</p>
              )}
            </div>

            <div>
              <label>単価</label>
              <input
                type="number"
                step="0.01"
                {...register(`items.${index}.unitPrice`)}
              />
              {errors.items?.[index]?.unitPrice && (
                <p role="alert">{errors.items[index].unitPrice?.message}</p>
              )}
            </div>

            <div>
              <span>小計: ¥{((Number(items[index]?.quantity) || 0) * (Number(items[index]?.unitPrice) || 0)).toLocaleString()}</span>
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              disabled={fields.length === 1} // 最低1件は残す
              aria-label={`明細${index + 1}を削除`}
            >
              削除
            </button>
          </div>
        ))}

        {errors.items?.root && (
          <p role="alert">{errors.items.root.message}</p>
        )}

        <button
          type="button"
          onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
        >
          + 明細を追加
        </button>
      </fieldset>

      <div>
        <strong>合計金額: ¥{totalAmount.toLocaleString()}</strong>
      </div>

      <button type="submit">請求書を作成</button>
    </form>
  );
}
```

### ネストしたFieldArray

```typescript
const surveySchema = z.object({
  sections: z.array(
    z.object({
      title: z.string().min(1, 'セクション名は必須です'),
      questions: z.array(
        z.object({
          text: z.string().min(1, '質問文は必須です'),
          type: z.enum(['text', 'radio', 'checkbox']),
        })
      ).min(1, '質問を1件以上追加してください'),
    })
  ).min(1, 'セクションを1件以上追加してください'),
});

// ネストしたFieldArrayはuseFieldArrayを複数使う
function SectionFields({ sectionIndex, control, register, errors }: SectionFieldsProps) {
  const { fields: questionFields, append, remove } = useFieldArray({
    control,
    name: `sections.${sectionIndex}.questions`,
  });

  return (
    <div>
      {questionFields.map((field, questionIndex) => (
        <div key={field.id}>
          <input {...register(`sections.${sectionIndex}.questions.${questionIndex}.text`)} />
          <button type="button" onClick={() => remove(questionIndex)}>削除</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ text: '', type: 'text' })}>
        質問を追加
      </button>
    </div>
  );
}
```

---

## 8. 条件付きバリデーション

### superRefineによる複雑な条件付きバリデーション

```typescript
const jobApplicationSchema = z.object({
  applicantType: z.enum(['student', 'experienced', 'freelancer']),

  // 全員必須
  fullName: z.string().min(1, '氏名は必須です'),
  email: z.string().email('正しいメールアドレスを入力してください'),

  // 学生の場合のみ
  schoolName: z.string().optional(),
  graduationYear: z.coerce.number().optional(),

  // 経験者・フリーランサーの場合
  yearsOfExperience: z.coerce.number().optional(),
  portfolioUrl: z.string().url().optional().or(z.literal('')),

  // フリーランサーのみ
  hourlyRate: z.coerce.number().positive().optional(),

}).superRefine((data, ctx) => {
  if (data.applicantType === 'student') {
    if (!data.schoolName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '学校名は必須です',
        path: ['schoolName'],
      });
    }
    if (!data.graduationYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '卒業予定年は必須です',
        path: ['graduationYear'],
      });
    }
  }

  if (data.applicantType === 'experienced' || data.applicantType === 'freelancer') {
    if (data.yearsOfExperience === undefined || data.yearsOfExperience < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '経験年数は必須です',
        path: ['yearsOfExperience'],
      });
    }
  }

  if (data.applicantType === 'freelancer') {
    if (!data.hourlyRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '時給は必須です',
        path: ['hourlyRate'],
      });
    }
  }
});

// フォームで条件付き表示と組み合わせる
function JobApplicationForm() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<z.infer<typeof jobApplicationSchema>>({
    resolver: zodResolver(jobApplicationSchema),
  });

  const applicantType = watch('applicantType');

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <select {...register('applicantType')}>
        <option value="student">学生</option>
        <option value="experienced">経験者</option>
        <option value="freelancer">フリーランサー</option>
      </select>

      {applicantType === 'student' && (
        <>
          <input placeholder="学校名" {...register('schoolName')} />
          {errors.schoolName && <p role="alert">{errors.schoolName.message}</p>}

          <input type="number" placeholder="卒業予定年" {...register('graduationYear')} />
          {errors.graduationYear && <p role="alert">{errors.graduationYear.message}</p>}
        </>
      )}

      {(applicantType === 'experienced' || applicantType === 'freelancer') && (
        <>
          <input type="number" placeholder="経験年数" {...register('yearsOfExperience')} />
          {errors.yearsOfExperience && <p role="alert">{errors.yearsOfExperience.message}</p>}
        </>
      )}

      {applicantType === 'freelancer' && (
        <>
          <input type="number" placeholder="時給（円）" {...register('hourlyRate')} />
          {errors.hourlyRate && <p role="alert">{errors.hourlyRate.message}</p>}
        </>
      )}

      <button type="submit">応募する</button>
    </form>
  );
}
```

### discriminatedUnionによる型安全な条件付きバリデーション

```typescript
// discriminatedUnionはZodのバリデーションのみで条件付きロジックを完結させたい場合に有効
const shippingSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('standard'),
    address: z.string().min(1, '住所は必須です'),
    postalCode: z.string().regex(/^\d{3}-\d{4}$/, '郵便番号はXXX-XXXX形式で入力してください'),
  }),
  z.object({
    type: z.literal('express'),
    address: z.string().min(1, '住所は必須です'),
    postalCode: z.string().regex(/^\d{3}-\d{4}$/, '郵便番号はXXX-XXXX形式で入力してください'),
    phoneNumber: z.string().regex(/^0\d{9,10}$/, '電話番号を正しく入力してください'),
  }),
  z.object({
    type: z.literal('store_pickup'),
    storeId: z.string().min(1, '受取店舗を選択してください'),
    pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付をYYYY-MM-DD形式で入力してください'),
  }),
]);
```

---

## 9. Controller — カスタムコンポーネントとの統合

`register()`はHTMLネイティブの入力要素にしか使えない。日付ピッカー、セレクトボックスライブラリ、カスタムコンポーネントとの統合には`Controller`を使う。

### Controllerの基本

```typescript
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// サードパーティのDatePickerコンポーネント（例）
import DatePicker from 'react-datepicker';
import Select from 'react-select';

const eventSchema = z.object({
  eventName: z.string().min(1, 'イベント名は必須です'),
  startDate: z.date({ required_error: '開始日は必須です' }),
  category: z.object({
    value: z.string(),
    label: z.string(),
  }, { required_error: 'カテゴリーを選択してください' }),
  rating: z.number().min(1).max(5),
});

type EventFormData = z.infer<typeof eventSchema>;

const categoryOptions = [
  { value: 'tech', label: 'テクノロジー' },
  { value: 'business', label: 'ビジネス' },
  { value: 'design', label: 'デザイン' },
];

function EventForm() {
  const { control, handleSubmit, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      {/* DatePickerとの統合 */}
      <div>
        <label>開始日</label>
        <Controller
          name="startDate"
          control={control}
          render={({ field: { onChange, value, ref } }) => (
            <DatePicker
              ref={ref}
              selected={value}
              onChange={onChange}
              dateFormat="yyyy/MM/dd"
              placeholderText="日付を選択"
            />
          )}
        />
        {errors.startDate && <p role="alert">{errors.startDate.message}</p>}
      </div>

      {/* react-selectとの統合 */}
      <div>
        <label>カテゴリー</label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={categoryOptions}
              placeholder="カテゴリーを選択"
            />
          )}
        />
        {errors.category && <p role="alert">{errors.category.message}</p>}
      </div>

      {/* カスタムレーティングコンポーネント */}
      <div>
        <label>評価</label>
        <Controller
          name="rating"
          control={control}
          render={({ field: { onChange, value } }) => (
            <StarRating value={value} onChange={onChange} max={5} />
          )}
        />
        {errors.rating && <p role="alert">{errors.rating.message}</p>}
      </div>

      <button type="submit">作成</button>
    </form>
  );
}
```

### 再利用可能なControlledInputコンポーネント

```typescript
import { Control, FieldPath, FieldValues, Controller } from 'react-hook-form';

interface ControlledSelectProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function ControlledSelect<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  options,
  placeholder,
}: ControlledSelectProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div>
          <label>{label}</label>
          <select {...field}>
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <p role="alert">{error.message}</p>}
        </div>
      )}
    />
  );
}
```

---

## 10. Next.js 14+ Server Actionsとの統合

Next.js 14以降のServer Actionsと組み合わせることで、バリデーションをサーバーサイドでも実行できる。

### Server Actionの定義

```typescript
// app/actions/auth.ts
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginActionState = {
  errors?: {
    email?: string[];
    password?: string[];
    _form?: string[];
  };
  success?: boolean;
};

export async function loginAction(
  prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  // FormDataからオブジェクトに変換
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  // Zodでサーバーサイドバリデーション
  const validationResult = loginSchema.safeParse(rawData);

  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    return {
      errors: {
        email: fieldErrors.email,
        password: fieldErrors.password,
      },
    };
  }

  // 認証処理
  try {
    await authenticateUser(validationResult.data);
    redirect('/dashboard');
  } catch (error) {
    return {
      errors: {
        _form: ['メールアドレスまたはパスワードが正しくありません'],
      },
    };
  }
}
```

### React Hook FormとServer Actionsのハイブリッド実装

```typescript
// app/login/page.tsx
'use client';

import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginAction } from '../actions/auth';

// クライアントとサーバーで同じスキーマを共有
const loginSchema = z.object({
  email: z.string().email('正しいメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上必要です'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginPage() {
  const [actionState, formAction] = useActionState(loginAction, {});

  const {
    register,
    handleSubmit,
    formState: { errors: clientErrors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit((data) => {
    // クライアントバリデーション通過後にServer Actionを呼び出す
    const formData = new FormData();
    formData.set('email', data.email);
    formData.set('password', data.password);
    formAction(formData);
  });

  return (
    <form onSubmit={onSubmit}>
      {/* サーバーサイドのフォームレベルエラー */}
      {actionState.errors?._form && (
        <div role="alert" className="form-error">
          {actionState.errors._form.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      <div>
        <label>メールアドレス</label>
        <input type="email" {...register('email')} />
        {/* クライアントエラー優先、なければサーバーエラー */}
        {(clientErrors.email || actionState.errors?.email) && (
          <p role="alert">
            {clientErrors.email?.message ?? actionState.errors?.email?.[0]}
          </p>
        )}
      </div>

      <div>
        <label>パスワード</label>
        <input type="password" {...register('password')} />
        {(clientErrors.password || actionState.errors?.password) && (
          <p role="alert">
            {clientErrors.password?.message ?? actionState.errors?.password?.[0]}
          </p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        ログイン
      </button>
    </form>
  );
}
```

---

## 11. テスト方法

### React Testing Libraryによるフォームテスト

```typescript
// __tests__/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../components/LoginForm';

describe('LoginForm', () => {
  it('空のフィールドで送信するとバリデーションエラーが表示される', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={jest.fn()} />);

    const submitButton = screen.getByRole('button', { name: 'ログイン' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('メールアドレスは必須です')).toBeInTheDocument();
      expect(screen.getByText('パスワードは必須です')).toBeInTheDocument();
    });
  });

  it('不正なメールアドレスでエラーが表示される', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={jest.fn()} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // フォーカスを外してonBlurを発火

    await waitFor(() => {
      expect(
        screen.getByText('正しいメールアドレスを入力してください')
      ).toBeInTheDocument();
    });
  });

  it('正しい入力でonSubmitが呼ばれる', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });
    });
  });

  it('送信中はボタンが無効化される', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ログイン中...' })).toBeDisabled();
    });
  });
});

// Zodスキーマ単体のテスト
describe('loginSchema', () => {
  it('有効なデータはパースに成功する', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'Password123',
    });
    expect(result.success).toBe(true);
  });

  it('パスワードが8文字未満はエラーになる', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordErrors = result.error.issues.filter(i => i.path[0] === 'password');
      expect(passwordErrors[0].message).toBe('パスワードは8文字以上で入力してください');
    }
  });
});
```

### FieldArrayのテスト

```typescript
describe('InvoiceForm', () => {
  it('明細の追加・削除が正しく動作する', async () => {
    const user = userEvent.setup();
    render(<InvoiceForm onSubmit={jest.fn()} />);

    // 初期状態は1件
    expect(screen.getAllByPlaceholderText('説明')).toHaveLength(1);

    // 明細を追加
    await user.click(screen.getByRole('button', { name: '+ 明細を追加' }));
    expect(screen.getAllByPlaceholderText('説明')).toHaveLength(2);

    // 最初の明細を削除
    const deleteButtons = screen.getAllByRole('button', { name: /削除/ });
    await user.click(deleteButtons[0]);
    expect(screen.getAllByPlaceholderText('説明')).toHaveLength(1);
  });
});
```

---

## 12. パフォーマンス最適化

### watchの使い方

`watch()`は監視対象フィールドの変更のたびに再レンダリングを引き起こす。使いどころを絞ることが重要だ。

```typescript
function OptimizedForm() {
  const { register, watch, handleSubmit } = useForm<FormData>({ resolver: zodResolver(schema) });

  // 悪い例: 全フィールドをwatchすると全変更で再レンダリング
  const allValues = watch(); // 非推奨

  // 良い例: 必要なフィールドのみをwatch
  const paymentMethod = watch('paymentMethod');

  // 複数フィールドをwatchする場合
  const [startDate, endDate] = watch(['startDate', 'endDate']);

  // watchの代わりにgetValuesを使えば再レンダリングなし（ただし値は最新とは限らない）
  const { getValues } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handleCalculate = () => {
    // ボタンクリック時など、特定のタイミングで値を取得する場合
    const values = getValues();
    // ...
  };

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <select {...register('paymentMethod')}>
        <option value="credit_card">クレジットカード</option>
        <option value="bank_transfer">銀行振込</option>
      </select>

      {/* paymentMethodが変わったときのみこの部分が再レンダリング */}
      {paymentMethod === 'credit_card' && (
        <input {...register('cardNumber')} placeholder="カード番号" />
      )}
    </form>
  );
}
```

### フォームをサブコンポーネントに分割してメモ化

```typescript
import { memo } from 'react';
import { useFormContext } from 'react-hook-form';

// FormProviderを使えば、サブコンポーネントにcontrolやregisterをpropsで渡さずに済む
function ComplexForm() {
  const methods = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(console.log)}>
        <PersonalInfoSection />
        <AddressSection />
        <PaymentSection />
        <button type="submit">送信</button>
      </form>
    </FormProvider>
  );
}

// memo + useFormContextで不要な再レンダリングを防ぐ
const PersonalInfoSection = memo(function PersonalInfoSection() {
  const { register, formState: { errors } } = useFormContext<FormData>();

  return (
    <fieldset>
      <legend>個人情報</legend>
      <input {...register('firstName')} placeholder="名" />
      {errors.firstName && <p role="alert">{errors.firstName.message}</p>}
      <input {...register('lastName')} placeholder="姓" />
      {errors.lastName && <p role="alert">{errors.lastName.message}</p>}
    </fieldset>
  );
});
```

### shouldUnregisterでパフォーマンスを制御

```typescript
const form = useForm<FormData>({
  // shouldUnregister: true にすると、フィールドがアンマウントされたとき
  // そのフィールドの値と検証状態を削除する
  // 条件付き表示のフィールドが多い場合に有効
  shouldUnregister: true,

  resolver: zodResolver(schema),
});
```

---

## まとめ — React Hook Form + Zodのベストプラクティス

本記事で解説した内容を整理すると、React Hook Form + Zodを使った型安全なフォーム実装の核心は以下の点にある。

**1. スキーマ先行設計**: Zodスキーマを先に定義し、`z.infer<typeof schema>`で型を導出する。型定義とバリデーションロジックの二重管理を排除する。

**2. バリデーションタイミングの選択**: UXに応じて`mode`を選ぶ。`onBlur`が多くの場面でバランスがよい。

**3. エラーのアクセシビリティ**: `role="alert"`、`aria-invalid`、`aria-describedby`を必ず設定する。スクリーンリーダーユーザーへの配慮は必須だ。

**4. Controllerの使いどころ**: サードパーティコンポーネントや複雑なUI要素には`Controller`を使う。HTMLネイティブ要素は`register()`で十分。

**5. watchは最小限に**: 不要な再レンダリングを避けるため、`watch()`は必要なフィールドのみを監視する。読み取り専用なら`getValues()`を使う。

**6. テスト**: Zodスキーマの単体テストとReact Testing Libraryによる統合テストの両方を書く。フォームは複雑なロジックが集中するため、テストカバレッジを高く保つことが重要だ。

**7. サーバーとクライアントでスキーマを共有**: Next.js App Routerでは、同じZodスキーマをクライアントサイドのバリデーションとServer Actionの両方で使い回せる。これによりバリデーションロジックの一貫性が保たれる。

React Hook FormとZodの組み合わせは、現時点でReact/Next.jsエコシステムにおける最も洗練されたフォームソリューションの一つだ。適切に使いこなすことで、保守性が高く、型安全で、パフォーマンスに優れたフォームを効率よく実装できる。

---

## 参考リンク

- [React Hook Form公式ドキュメント](https://react-hook-form.com/)
- [Zod公式ドキュメント](https://zod.dev/)
- [@hookform/resolvers GitHubリポジトリ](https://github.com/react-hook-form/resolvers)
- [Next.js Server Actions公式ドキュメント](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
