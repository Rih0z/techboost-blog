---
title: "Auth.js v5（旧NextAuth）完全ガイド - 認証実装の最新ベストプラクティス"
description: "Auth.js v5の新機能とNext.js App Routerでの実装方法を徹底解説。OAuth、JWT、セッション管理、エッジランタイム対応まで、実践的なコード例付きで学べる完全ガイドです。Next.js・Auth.js・認証に関する実践情報。"
pubDate: "2025-02-05"
tags: ["Next.js", "Auth.js", "認証", "セキュリティ", "OAuth", "プログラミング"]
heroImage: '../../assets/thumbnails/auth-js-v5-guide.jpg'
---
## はじめに

Auth.js v5（旧NextAuth.js）は、2024年にメジャーアップデートを迎え、Next.js 14+のApp Routerに完全対応した認証ライブラリです。

従来のPages Router時代から大きく進化し、**Server Actions対応**、**エッジランタイム完全サポート**、**型安全性の大幅改善**が実現されました。

### Auth.js v5の主な変化

```typescript
// v4（NextAuth.js）
import NextAuth from "next-auth"
export default NextAuth({...}) // API Routes前提

// v5（Auth.js）
import NextAuth from "next-auth"
export const { handlers, auth, signIn, signOut } = NextAuth({...}) // モジュラー設計
```

この記事では、Auth.js v5の実践的な実装方法を、最新のベストプラクティスとともに解説します。

## Auth.js v5のインストールとセットアップ

### 基本インストール

```bash
npm install next-auth@beta
npm install @auth/prisma-adapter  # Prismaを使う場合
npm install bcryptjs              # パスワード認証を使う場合
```

### プロジェクト構造

```
app/
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts    ← Auth.jsのAPIルート
├── auth.ts                 ← 認証設定ファイル（ルート）
├── middleware.ts           ← 認証ミドルウェア
└── (protected)/            ← 保護されたルート
    └── dashboard/
        └── page.tsx
```

### 基本設定ファイル（auth.ts）

```typescript
// auth.ts
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // ユーザー認証ロジック
        const user = await getUserFromDb(credentials.email, credentials.password)
        if (!user) throw new Error("Invalid credentials")
        return user
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
```

### APIルートの設定

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

## OAuth認証の実装

### GitHub OAuth設定

```typescript
// auth.ts
import GitHub from "next-auth/providers/github"

export const authConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          role: profile.email?.endsWith("@company.com") ? "admin" : "user",
        }
      },
    }),
  ],
}
```

### Google OAuth + 追加スコープ

```typescript
import Google from "next-auth/providers/google"

Google({
  clientId: process.env.GOOGLE_ID!,
  clientSecret: process.env.GOOGLE_SECRET!,
  authorization: {
    params: {
      prompt: "consent",
      access_type: "offline",
      response_type: "code",
      scope: "openid email profile https://www.googleapis.com/auth/calendar",
    },
  },
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: profile.picture,
      emailVerified: profile.email_verified ? new Date() : null,
    }
  },
})
```

## Credentials認証（パスワード認証）

### bcryptでのパスワード検証

```typescript
// lib/auth.ts
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"

export const credentialsProvider = Credentials({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      throw new Error("メールアドレスとパスワードを入力してください")
    }

    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    })

    if (!user || !user.hashedPassword) {
      throw new Error("ユーザーが見つかりません")
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      user.hashedPassword
    )

    if (!isPasswordValid) {
      throw new Error("パスワードが正しくありません")
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  },
})
```

### ユーザー登録API

```typescript
// app/api/register/route.ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "メールアドレスとパスワードは必須です" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "このメールアドレスは既に使用されています" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
      },
    })

    return NextResponse.json(
      { message: "ユーザーが作成されました", userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "ユーザー登録に失敗しました" },
      { status: 500 }
    )
  }
}
```

## セッション管理とミドルウェア

### ミドルウェアで保護されたルート

```typescript
// middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard")

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### ロールベースアクセス制御（RBAC）

```typescript
// middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const user = req.auth?.user
  const pathname = req.nextUrl.pathname

  // 管理者専用ルート
  if (pathname.startsWith("/admin")) {
    if (!user || user.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // 認証が必要なルート
  if (pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
})
```

## Server ActionsでのログインとSign Out

### ログインAction

```typescript
// app/actions/auth.ts
"use server"

import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: true,
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "メールアドレスまたはパスワードが正しくありません"
        default:
          return "認証エラーが発生しました"
      }
    }
    throw error
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" })
}
```

### ログインフォーム

```typescript
// app/login/page.tsx
"use client"

import { useFormState, useFormStatus } from "react-dom"
import { authenticate } from "@/app/actions/auth"

export default function LoginPage() {
  const [errorMessage, dispatch] = useFormState(authenticate, undefined)

  return (
    <form action={dispatch} className="space-y-4">
      <div>
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      {errorMessage && (
        <p className="text-red-500 text-sm">{errorMessage}</p>
      )}
      <LoginButton />
    </form>
  )
}

function LoginButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-500 text-white py-2 rounded"
    >
      {pending ? "ログイン中..." : "ログイン"}
    </button>
  )
}
```

## Prisma Adapterでのデータベース連携

### Prismaスキーマ

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  hashedPassword String?
  role          String    @default("user")
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
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

### Auth.jsでPrisma Adapterを使用

```typescript
// auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import NextAuth from "next-auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // JWTセッション推奨
  providers: [
    // プロバイダー設定
  ],
})
```

## TypeScript型定義の拡張

### カスタムユーザー型

```typescript
// types/next-auth.d.ts
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    role: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
  }
}
```

## エッジランタイム対応

Auth.js v5は完全なエッジランタイム対応を実現しています。

```typescript
// middleware.ts（エッジランタイムで動作）
export const runtime = "edge"

import { auth } from "@/auth"

export default auth((req) => {
  // 高速な認証チェック
  if (!req.auth && req.nextUrl.pathname.startsWith("/dashboard")) {
    return Response.redirect(new URL("/login", req.url))
  }
})
```

## まとめ

Auth.js v5は、Next.js App Routerに最適化された次世代認証ライブラリです。

### 主な利点

- **Server Actionsネイティブ対応** - フォーム送信が簡潔に
- **エッジランタイム完全サポート** - 高速な認証チェック
- **型安全性の向上** - TypeScriptとの親和性が大幅改善
- **モジュラー設計** - 必要な機能だけインポート可能

### 導入時のチェックリスト

- [ ] 環境変数（OAuth ID/Secret, NEXTAUTH_SECRET）を設定
- [ ] Prismaスキーマでユーザーテーブル定義
- [ ] middleware.tsで保護ルート設定
- [ ] カスタム型定義でTypeScript対応
- [ ] Server Actionsでログイン/ログアウト実装

Auth.js v5を使えば、堅牢でスケーラブルな認証システムを短時間で構築できます。
