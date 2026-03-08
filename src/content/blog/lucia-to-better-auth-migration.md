---
title: 'Lucia Auth → Better Authへの移行ガイド：認証ライブラリの選択肢'
description: 'Lucia Authの非推奨化を受けて、Better AuthやAuth.jsへの移行パス、セッション管理の実装、各ライブラリの比較を詳しく解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2026-02-05'
tags: ['Lucia Auth', 'Better Auth', 'Auth.js', '認証', 'Next.js']
heroImage: '../../assets/thumbnails/lucia-to-better-auth-migration.jpg'
---

2024年、Lucia Authの作者は開発終了を発表しました。多くの開発者がLucia Authを使用していたため、代替ライブラリへの移行が必要になりました。この記事では、Lucia Authから主要な代替ライブラリへの移行方法と、各ライブラリの比較を詳しく解説します。

## Lucia Authとは何だったのか

Lucia Authは、型安全性とシンプルさを重視したセッション管理ライブラリでした。主な特徴は以下の通りです。

### Lucia Authの特徴

- **型安全**: TypeScriptファーストな設計
- **フレームワーク非依存**: Next.js、SvelteKit、Astro等で使用可能
- **シンプルなAPI**: 認証の基本に焦点
- **柔軟なデータベース対応**: Prisma、Drizzle、生SQL等をサポート
- **プリミティブ**: 低レベルAPIで完全な制御が可能

### なぜ開発終了したのか

作者のブログ投稿によると：

1. **メンテナンスの負担**: 多数のアダプターとプラグインの維持
2. **スコープクリープ**: 本来のシンプルさが失われつつあった
3. **より良い代替案の登場**: Better Auth、Auth.js等が成熟

## 代替ライブラリの選択肢

### 1. Better Auth

**概要**: Lucia Authの精神的後継者。型安全性とシンプルさを継承。

**特徴**:
- TypeScriptファースト
- Next.js、SvelteKit、Astro対応
- プラグインシステム
- OAuth、メール/パスワード、マジックリンク
- セッション管理

**適している場合**:
- Lucia Authの体験に近いものを求めている
- 型安全性を重視
- Next.jsをメインに使用

### 2. Auth.js (NextAuth.js v5)

**概要**: Next.jsのデファクトスタンダード認証ライブラリ。

**特徴**:
- 大規模なエコシステム
- 50以上のOAuthプロバイダー
- Edge Runtime対応
- データベースセッションとJWT両方サポート

**適している場合**:
- Next.jsのみ使用
- 多数のOAuthプロバイダーが必要
- 成熟したエコシステムを求めている

### 3. Clerk

**概要**: 完全ホスト型の認証サービス。

**特徴**:
- 完全ホスト型（SaaS）
- UI コンポーネント提供
- ユーザー管理画面
- 多要素認証、組織管理等の高度な機能

**適している場合**:
- 認証インフラを自前で管理したくない
- UIコンポーネントが欲しい
- 予算がある（有料プランが必要になる可能性）

### 4. 自前実装

**概要**: セッション管理を自分で実装。

**特徴**:
- 完全な制御
- 依存関係なし
- 学習機会

**適している場合**:
- シンプルな要件
- 完全な制御が必要
- 認証の仕組みを深く理解したい

## Lucia Auth → Better Auth 移行ガイド

最も多くのユースケースで推奨されるBetter Authへの移行を詳しく見ていきます。

### 1. インストール

```bash
npm uninstall lucia
npm install better-auth
```

### 2. 設定ファイルの移行

**Lucia Auth（before）**:

```typescript
// lib/auth.ts
import { lucia } from "lucia";
import { prisma } from "@lucia-auth/adapter-prisma";
import { PrismaClient } from "@prisma/client";

const client = new PrismaClient();

export const auth = lucia({
  adapter: prisma(client),
  env: process.env.NODE_ENV === "production" ? "PROD" : "DEV",
  middleware: nextjs(),
  sessionCookie: {
    expires: false,
  },
  getUserAttributes: (data) => {
    return {
      email: data.email,
      name: data.name,
    };
  },
});

export type Auth = typeof auth;
```

**Better Auth（after）**:

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      name: {
        type: "string",
        required: false,
      },
    },
  },
});

export type Auth = typeof auth;
```

### 3. データベーススキーマの移行

**Lucia Auth（before）**:

```prisma
model User {
  id       String    @id @default(cuid())
  email    String    @unique
  name     String?
  sessions Session[]
  keys     Key[]
}

model Session {
  id             String @id @unique
  user_id        String
  active_expires BigInt
  idle_expires   BigInt
  user           User   @relation(references: [id], fields: [user_id], onDelete: Cascade)
}

model Key {
  id              String  @id @unique
  hashed_password String?
  user_id         String
  user            User    @relation(references: [id], fields: [user_id], onDelete: Cascade)
}
```

**Better Auth（after）**:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

マイグレーション実行:

```bash
npx prisma migrate dev --name migrate-to-better-auth
```

### 4. データマイグレーション

既存のユーザーデータを新しいスキーマに移行する必要があります。

```typescript
// scripts/migrate-users.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function migrateUsers() {
  // Lucia Authの既存ユーザーを取得
  const oldUsers = await prisma.$queryRaw`
    SELECT u.id, u.email, u.name, k.hashed_password
    FROM "User" u
    LEFT JOIN "Key" k ON k.user_id = u.id
    WHERE k.id LIKE 'email:%'
  `;

  for (const oldUser of oldUsers as any[]) {
    // Better Auth形式でユーザーを作成
    const user = await prisma.user.upsert({
      where: { id: oldUser.id },
      update: {},
      create: {
        id: oldUser.id,
        email: oldUser.email,
        name: oldUser.name,
        emailVerified: new Date(), // 既存ユーザーは検証済みとみなす
      },
    });

    // パスワードアカウントを作成
    if (oldUser.hashed_password) {
      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'credentials',
          provider: 'credentials',
          providerAccountId: user.email,
          // Better Authはパスワードを別のフィールドで管理
          // カスタムフィールドとして追加する必要がある場合があります
        },
      });
    }
  }

  console.log('Migration completed');
}

migrateUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 5. API Routesの移行

**Lucia Auth（before）**:

```typescript
// app/api/auth/signup/route.ts
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password, name } = await request.json();

  try {
    const user = await auth.createUser({
      key: {
        providerId: "email",
        providerUserId: email,
        password,
      },
      attributes: {
        email,
        name,
      },
    });

    const session = await auth.createSession({
      userId: user.userId,
      attributes: {},
    });

    const sessionCookie = auth.createSessionCookie(session);

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": sessionCookie.serialize(),
      },
    });
  } catch (error) {
    return new Response("Email already exists", { status: 400 });
  }
}
```

**Better Auth（after）**:

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";

export const { GET, POST } = auth.handler;
```

Better Authは自動的にすべての認証エンドポイントを作成します：
- `/api/auth/signin`
- `/api/auth/signup`
- `/api/auth/signout`
- `/api/auth/session`

### 6. クライアントコードの移行

**Lucia Auth（before）**:

```typescript
// components/signup-form.tsx
export async function handleSignup(email: string, password: string, name: string) {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    throw new Error("Signup failed");
  }
}
```

**Better Auth（after）**:

```typescript
// components/signup-form.tsx
import { authClient } from "@/lib/auth-client";

export async function handleSignup(email: string, password: string, name: string) {
  const result = await authClient.signUp.email({
    email,
    password,
    name,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}
```

### 7. セッション取得の移行

**Lucia Auth（before）**:

```typescript
// app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const sessionId = cookies().get(auth.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    redirect("/signin");
  }

  const { session, user } = await auth.validateSession(sessionId);

  if (!session) {
    redirect("/signin");
  }

  return <div>Welcome, {user.name}!</div>;
}
```

**Better Auth（after）**:

```typescript
// app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await cookies(),
  });

  if (!session) {
    redirect("/signin");
  }

  return <div>Welcome, {session.user.name}!</div>;
}
```

## Lucia Auth → Auth.js 移行ガイド

Auth.jsも人気の選択肢です。

### インストール

```bash
npm uninstall lucia
npm install next-auth@beta @auth/prisma-adapter
```

### 設定

```typescript
// auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const account = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: "credentials",
          },
        });

        if (!account) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          account.password // カスタムフィールド
        );

        if (!passwordMatch) return null;

        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
});
```

### API Routes

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

### セッション取得

```typescript
// app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  return <div>Welcome, {session.user.name}!</div>;
}
```

## 自前実装のアプローチ

シンプルなセッション管理を自前で実装することもできます。

### セッション管理の基本実装

```typescript
// lib/session.ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);

  cookies().set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

export async function getSession() {
  const token = cookies().get("session")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch (error) {
    return null;
  }
}

export async function deleteSession() {
  cookies().delete("session");
}
```

### サインアップ実装

```typescript
// app/actions/auth.ts
"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { createSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("Email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
}
```

## まとめ

Lucia Authの開発終了は残念ですが、優れた代替案が複数存在します。

### 推奨される選択肢

**Better Auth**:
- Lucia Authの精神的後継者
- 型安全性とシンプルさ
- Next.js、SvelteKit等で使用可能

**Auth.js**:
- Next.js専用ならベスト
- 大規模なエコシステム
- 多数のOAuthプロバイダー

**自前実装**:
- シンプルな要件の場合
- 完全な制御が必要
- 学習目的

移行は手間がかかりますが、長期的にはより良いソリューションを使用できるようになります。プロジェクトの要件に応じて、最適な代替案を選択してください。
