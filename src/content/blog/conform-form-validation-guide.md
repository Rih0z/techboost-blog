---
title: 'Conform：React Server Actions向けフォームバリデーション完全ガイド'
description: 'Conformを使ったプログレッシブエンハンスメント対応のフォームバリデーション。Zodスキーマとの統合、Server Actionsとの連携を実践的に解説します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: '2026-02-05'
tags: ['Conform', 'React', 'Next.js', 'Server Actions', 'Zod', 'バリデーション']
heroImage: '../../assets/thumbnails/conform-form-validation-guide.jpg'
---

Reactのフォーム処理は、バリデーション、エラーハンドリング、状態管理など、複雑な要素を含みます。Server Actionsの登場により、フォーム処理がさらに進化しましたが、従来のクライアントサイドライブラリでは対応が難しい場合があります。

Conformは、Server Actionsとプログレッシブエンハンスメントを念頭に置いた、新しいフォームバリデーションライブラリです。この記事では、Conformの基本から実践的な使い方まで詳しく解説します。

## Conformとは

Conformは、React Server Actionsとプログレッシブエンハンスメントに特化したフォームバリデーションライブラリです。JavaScriptが無効でも動作し、有効な場合は優れたユーザー体験を提供します。

### 主な特徴

- **プログレッシブエンハンスメント**: JavaScriptなしでも動作
- **Server Actions統合**: Next.js Server Actionsと完全統合
- **型安全性**: TypeScriptとZodスキーマを完全サポート
- **軽量**: ミニマルなバンドルサイズ
- **柔軟なバリデーション**: Zod、Yup、その他のスキーマライブラリをサポート
- **アクセシビリティ**: ARIA属性を自動設定
- **詳細な制御**: フィールドごとの細かい制御が可能

### 競合との比較

**Conform vs React Hook Form**
- React Hook Formは制御コンポーネント、Conformは非制御コンポーネント優先
- Conformはプログレッシブエンハンスメントに強い
- React Hook FormはクライアントサイドのみでServer Actions対応が限定的

**Conform vs Formik**
- Formikは古典的なReactフォームライブラリ
- Conformはより軽量で現代的
- ConformはServer Actionsに最適化

**Conform vs Remix Forms**
- RemixのuseActionDataパターンに類似
- ConformはRemix外でも使用可能
- より汎用的なAPI設計

## セットアップ

### インストール

```bash
npm install @conform-to/react @conform-to/zod zod
```

Zodを使わない場合は、他のバリデーションライブラリも使用できます。

```bash
# Yupを使う場合
npm install @conform-to/react @conform-to/yup yup

# カスタムバリデーション
npm install @conform-to/react
```

### 基本的な使い方

まずはシンプルな例から始めます。

```typescript
// app/signup/page.tsx
"use client";

import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function SignUpPage() {
  const [form, fields] = useForm({
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: 'onBlur',
  });

  return (
    <form id={form.id} onSubmit={form.onSubmit}>
      <div>
        <label htmlFor={fields.email.id}>Email</label>
        <input
          id={fields.email.id}
          name={fields.email.name}
          type="email"
          defaultValue={fields.email.initialValue}
        />
        <div>{fields.email.errors}</div>
      </div>

      <div>
        <label htmlFor={fields.password.id}>Password</label>
        <input
          id={fields.password.id}
          name={fields.password.name}
          type="password"
          defaultValue={fields.password.initialValue}
        />
        <div>{fields.password.errors}</div>
      </div>

      <button type="submit">Sign Up</button>
    </form>
  );
}
```

## Server Actionsとの統合

Conformの真価はServer Actionsと組み合わせたときに発揮されます。

### Server Action定義

```typescript
// app/actions/auth.ts
"use server";

import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export async function signUp(prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, {
    schema: signUpSchema,
  });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { email, password } = submission.value;

  // ユーザーが既に存在するかチェック
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return submission.reply({
      fieldErrors: {
        email: ['Email already exists'],
      },
    });
  }

  // パスワードをハッシュ化
  const hashedPassword = await bcrypt.hash(password, 10);

  // ユーザー作成
  await db.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  redirect('/dashboard');
}
```

### フォームコンポーネント

```typescript
// app/signup/page.tsx
"use client";

import { useFormState } from 'react-dom';
import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { signUp } from '@/app/actions/auth';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function SignUpPage() {
  const [lastResult, action] = useFormState(signUp, undefined);
  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  });

  return (
    <form id={form.id} onSubmit={form.onSubmit} action={action}>
      <div>
        <label htmlFor={fields.email.id}>Email</label>
        <input
          id={fields.email.id}
          name={fields.email.name}
          type="email"
          defaultValue={fields.email.initialValue}
          aria-describedby={fields.email.errorId}
          aria-invalid={!!fields.email.errors}
        />
        {fields.email.errors && (
          <div id={fields.email.errorId} role="alert">
            {fields.email.errors}
          </div>
        )}
      </div>

      <div>
        <label htmlFor={fields.password.id}>Password</label>
        <input
          id={fields.password.id}
          name={fields.password.name}
          type="password"
          defaultValue={fields.password.initialValue}
          aria-describedby={fields.password.errorId}
          aria-invalid={!!fields.password.errors}
        />
        {fields.password.errors && (
          <div id={fields.password.errorId} role="alert">
            {fields.password.errors}
          </div>
        )}
      </div>

      <div>
        <label htmlFor={fields.confirmPassword.id}>Confirm Password</label>
        <input
          id={fields.confirmPassword.id}
          name={fields.confirmPassword.name}
          type="password"
          defaultValue={fields.confirmPassword.initialValue}
          aria-describedby={fields.confirmPassword.errorId}
          aria-invalid={!!fields.confirmPassword.errors}
        />
        {fields.confirmPassword.errors && (
          <div id={fields.confirmPassword.errorId} role="alert">
            {fields.confirmPassword.errors}
          </div>
        )}
      </div>

      <button type="submit">Sign Up</button>
    </form>
  );
}
```

## 複雑なフォーム

### ネストしたオブジェクト

```typescript
// app/actions/profile.ts
"use server";

import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  country: z.string().min(1, 'Country is required'),
});

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().max(500, 'Bio must be 500 characters or less'),
  address: addressSchema,
});

export async function updateProfile(prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, {
    schema: profileSchema,
  });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  // プロフィール更新処理
  // ...

  return submission.reply({ resetForm: true });
}
```

```typescript
// app/profile/page.tsx
"use client";

import { useFormState } from 'react-dom';
import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { updateProfile } from '@/app/actions/profile';
import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  country: z.string().min(1, 'Country is required'),
});

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().max(500, 'Bio must be 500 characters or less'),
  address: addressSchema,
});

export default function ProfilePage() {
  const [lastResult, action] = useFormState(updateProfile, undefined);
  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
  });

  return (
    <form id={form.id} onSubmit={form.onSubmit} action={action}>
      <div>
        <label htmlFor={fields.name.id}>Name</label>
        <input
          id={fields.name.id}
          name={fields.name.name}
          defaultValue={fields.name.initialValue}
        />
        <div>{fields.name.errors}</div>
      </div>

      <div>
        <label htmlFor={fields.bio.id}>Bio</label>
        <textarea
          id={fields.bio.id}
          name={fields.bio.name}
          defaultValue={fields.bio.initialValue}
        />
        <div>{fields.bio.errors}</div>
      </div>

      <fieldset>
        <legend>Address</legend>

        <div>
          <label htmlFor={fields.address.fields.street.id}>Street</label>
          <input
            id={fields.address.fields.street.id}
            name={fields.address.fields.street.name}
            defaultValue={fields.address.fields.street.initialValue}
          />
          <div>{fields.address.fields.street.errors}</div>
        </div>

        <div>
          <label htmlFor={fields.address.fields.city.id}>City</label>
          <input
            id={fields.address.fields.city.id}
            name={fields.address.fields.city.name}
            defaultValue={fields.address.fields.city.initialValue}
          />
          <div>{fields.address.fields.city.errors}</div>
        </div>

        <div>
          <label htmlFor={fields.address.fields.zipCode.id}>ZIP Code</label>
          <input
            id={fields.address.fields.zipCode.id}
            name={fields.address.fields.zipCode.name}
            defaultValue={fields.address.fields.zipCode.initialValue}
          />
          <div>{fields.address.fields.zipCode.errors}</div>
        </div>

        <div>
          <label htmlFor={fields.address.fields.country.id}>Country</label>
          <input
            id={fields.address.fields.country.id}
            name={fields.address.fields.country.name}
            defaultValue={fields.address.fields.country.initialValue}
          />
          <div>{fields.address.fields.country.errors}</div>
        </div>
      </fieldset>

      <button type="submit">Update Profile</button>
    </form>
  );
}
```

### 配列フィールド

```typescript
// app/actions/tasks.ts
"use server";

import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  completed: z.boolean().default(false),
});

const tasksSchema = z.object({
  tasks: z.array(taskSchema).min(1, 'At least one task is required'),
});

export async function saveTasks(prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, {
    schema: tasksSchema,
  });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  // タスク保存処理
  // ...

  return submission.reply();
}
```

```typescript
// app/tasks/page.tsx
"use client";

import { useFormState } from 'react-dom';
import { useForm, useFieldList } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { saveTasks } from '@/app/actions/tasks';
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  completed: z.boolean().default(false),
});

const schema = z.object({
  tasks: z.array(taskSchema).min(1, 'At least one task is required'),
});

export default function TasksPage() {
  const [lastResult, action] = useFormState(saveTasks, undefined);
  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
  });

  const tasksList = useFieldList(form.ref, fields.tasks);

  return (
    <form id={form.id} onSubmit={form.onSubmit} action={action}>
      <h2>Tasks</h2>

      {tasksList.map((task, index) => (
        <div key={task.key}>
          <div>
            <label htmlFor={task.fields.title.id}>Title</label>
            <input
              id={task.fields.title.id}
              name={task.fields.title.name}
              defaultValue={task.fields.title.initialValue}
            />
            <div>{task.fields.title.errors}</div>
          </div>

          <div>
            <label htmlFor={task.fields.description.id}>Description</label>
            <textarea
              id={task.fields.description.id}
              name={task.fields.description.name}
              defaultValue={task.fields.description.initialValue}
            />
            <div>{task.fields.description.errors}</div>
          </div>

          <div>
            <label>
              <input
                type="checkbox"
                name={task.fields.completed.name}
                defaultChecked={task.fields.completed.initialValue === 'on'}
              />
              Completed
            </label>
          </div>

          <button
            {...form.remove.getButtonProps({
              name: fields.tasks.name,
              index,
            })}
          >
            Remove
          </button>
        </div>
      ))}

      <button
        {...form.insert.getButtonProps({
          name: fields.tasks.name,
        })}
      >
        Add Task
      </button>

      <div>{fields.tasks.errors}</div>

      <button type="submit">Save Tasks</button>
    </form>
  );
}
```

## ファイルアップロード

```typescript
// app/actions/upload.ts
"use server";

import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { writeFile } from 'fs/promises';
import path from 'path';

const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, 'Max file size is 5MB')
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      'Only .jpg, .jpeg, .png and .webp formats are supported'
    ),
});

export async function uploadImage(prevState: unknown, formData: FormData) {
  const submission = parseWithZod(formData, {
    schema: uploadSchema,
  });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { title, file } = submission.value;

  // ファイル保存
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${Date.now()}-${file.name}`;
  const filepath = path.join(process.cwd(), 'public/uploads', filename);

  await writeFile(filepath, buffer);

  // データベースに保存
  // ...

  return submission.reply({ resetForm: true });
}
```

```typescript
// app/upload/page.tsx
"use client";

import { useFormState } from 'react-dom';
import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { uploadImage } from '@/app/actions/upload';
import { z } from 'zod';

const MAX_FILE_SIZE = 5000000;
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, 'Max file size is 5MB')
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      'Only .jpg, .jpeg, .png and .webp formats are supported'
    ),
});

export default function UploadPage() {
  const [lastResult, action] = useFormState(uploadImage, undefined);
  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
  });

  return (
    <form id={form.id} onSubmit={form.onSubmit} action={action}>
      <div>
        <label htmlFor={fields.title.id}>Title</label>
        <input
          id={fields.title.id}
          name={fields.title.name}
          defaultValue={fields.title.initialValue}
        />
        <div>{fields.title.errors}</div>
      </div>

      <div>
        <label htmlFor={fields.file.id}>Image</label>
        <input
          id={fields.file.id}
          name={fields.file.name}
          type="file"
          accept="image/*"
        />
        <div>{fields.file.errors}</div>
      </div>

      <button type="submit">Upload</button>
    </form>
  );
}
```

## ベストプラクティス

### 1. スキーマの共有

サーバーとクライアントでスキーマを共有します。

```typescript
// lib/schemas/auth.ts
import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type SignUpData = z.infer<typeof signUpSchema>;
```

### 2. 再利用可能なコンポーネント

```typescript
// components/form-field.tsx
interface FormFieldProps {
  field: {
    id: string;
    name: string;
    errorId: string;
    errors?: string[];
    initialValue?: string;
  };
  label: string;
  type?: string;
}

export function FormField({ field, label, type = 'text' }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={field.id}>{label}</label>
      <input
        id={field.id}
        name={field.name}
        type={type}
        defaultValue={field.initialValue}
        aria-describedby={field.errorId}
        aria-invalid={!!field.errors}
      />
      {field.errors && (
        <div id={field.errorId} role="alert">
          {field.errors}
        </div>
      )}
    </div>
  );
}
```

### 3. ローディング状態

```typescript
"use client";

import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from '@conform-to/react';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}

export default function MyForm() {
  const [lastResult, action] = useFormState(myAction, undefined);
  const [form, fields] = useForm({ lastResult });

  return (
    <form id={form.id} onSubmit={form.onSubmit} action={action}>
      {/* フォームフィールド */}
      <SubmitButton />
    </form>
  );
}
```

## まとめ

Conformは、React Server Actionsとプログレッシブエンハンスメントに最適化された、現代的なフォームバリデーションライブラリです。主な利点は以下の通りです。

- **Server Actions完全サポート**: Next.jsとシームレスに統合
- **プログレッシブエンハンスメント**: JavaScriptなしでも動作
- **型安全性**: ZodとTypeScriptで完全な型推論
- **柔軟性**: 複雑なフォームも簡単に構築

Next.jsでフォームを構築する際、Conformは強力な選択肢です。Server Actionsと組み合わせることで、優れたユーザー体験と開発者体験を実現できます。
