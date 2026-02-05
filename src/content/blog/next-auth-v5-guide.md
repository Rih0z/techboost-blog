---
title: 'NextAuth.js v5 (Auth.js) 実践ガイド - Next.js 15対応の認証実装'
description: 'NextAuth.js v5 (Auth.js)を使ったNext.js 15での認証実装完全ガイド。Google OAuth、GitHub、メール認証からセッション管理、ミドルウェアまで実践的に解説します。'
pubDate: 'Feb 05 2026'
tags: ['Next.js', 'NextAuth', 'Auth.js', '認証', 'TypeScript']
---

Next.js向けの認証ライブラリであるNextAuth.jsは、v5でAuth.jsとしてリブランディングされ、より強力で柔軟な認証システムに進化しました。この記事では、Next.js 15でのAuth.js実装を実践的に解説します。

## NextAuth.js v5 (Auth.js) とは？

Auth.jsは、Next.jsアプリケーションに認証機能を追加するためのオープンソースライブラリです。v5では以下の改善が行われました。

### v5の主な変更点

- **App Router完全対応** - Route HandlersとServer Actionsのネイティブサポート
- **TypeScript強化** - より型安全な設計
- **シンプルな設定** - 設定ファイルの構造が改善
- **Edge Runtime対応** - Vercel Edge、Cloudflare Workersなどで動作
- **セキュリティ向上** - CSRF保護の強化

## インストールと基本設定

### インストール

```bash
npm install next-auth@beta
```

v5はまだベータ版ですが、プロダクション利用も可能です。

### 環境変数の設定

`.env.local`ファイルを作成します。

```env
# Auth.js シークレット（必須）
AUTH_SECRET=your-secret-here

# Google OAuth（オプション）
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# GitHub OAuth（オプション）
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# アプリケーションURL
NEXTAUTH_URL=http://localhost:3000
```

`AUTH_SECRET`は以下のコマンドで生成できます。

```bash
openssl rand -base64 32
```

### Auth.js設定ファイルの作成

`auth.ts`（または`auth.js`）をプロジェクトルートに作成します。

```typescript
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        token.accessToken = account.access_token
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.userId as string
      session.accessToken = token.accessToken as string
      return session
    },
  },
})
```

## Route Handlerの設定

Auth.js v5では、Route Handlersを使って認証エンドポイントを設定します。

`app/api/auth/[...nextauth]/route.ts`を作成します。

```typescript
import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

これだけで`/api/auth/signin`、`/api/auth/signout`、`/api/auth/callback/*`などのエンドポイントが自動的に作成されます。

## サインインページの作成

カスタムサインインページを作成します。

`app/auth/signin/page.tsx`

```typescript
import { signIn } from "@/auth"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold">サインイン</h2>
          <p className="mt-2 text-center text-gray-600">
            アカウントを選択してログイン
          </p>
        </div>

        <div className="space-y-4">
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/dashboard" })
            }}
          >
            <button
              type="submit"
              className="w-full rounded-lg bg-white border border-gray-300 px-4 py-3 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                {/* Google icon SVG */}
              </svg>
              Googleでサインイン
            </button>
          </form>

          <form
            action={async () => {
              "use server"
              await signIn("github", { redirectTo: "/dashboard" })
            }}
          >
            <button
              type="submit"
              className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white hover:bg-gray-900 flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                {/* GitHub icon SVG */}
              </svg>
              GitHubでサインイン
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

## セッション情報の取得

### Server Componentで取得

```typescript
import { auth } from "@/auth"

export default async function Dashboard() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <div>
      <h1>ようこそ、{session.user.name}さん</h1>
      <p>メール: {session.user.email}</p>
      <img src={session.user.image} alt="プロフィール画像" />
    </div>
  )
}
```

### Client Componentで取得

```typescript
"use client"

import { useSession } from "next-auth/react"

export default function UserProfile() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>読み込み中...</div>
  }

  if (!session) {
    return <div>ログインしていません</div>
  }

  return (
    <div>
      <p>ログイン済み: {session.user.email}</p>
    </div>
  )
}
```

Client Componentで使用する場合は、`app/layout.tsx`でSessionProviderをラップする必要があります。

```typescript
import { SessionProvider } from "next-auth/react"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

## ミドルウェアでルート保護

認証が必要なページを保護するために、ミドルウェアを設定します。

`middleware.ts`

```typescript
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // 保護されたルート
  const protectedRoutes = ['/dashboard', '/profile', '/settings']
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute && !isLoggedIn) {
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // ログイン済みユーザーが認証ページにアクセス
  if (pathname.startsWith('/auth') && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

## データベース連携（Prisma）

ユーザー情報をデータベースに保存する場合、Prismaアダプターを使用します。

### インストール

```bash
npm install @auth/prisma-adapter @prisma/client
npm install -D prisma
```

### Prismaスキーマ

`prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
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

### Auth.js設定にアダプターを追加

```typescript
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  // ... その他の設定
})
```

## Server Actionsでのサインアウト

```typescript
import { signOut } from "@/auth"

export default function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server"
        await signOut({ redirectTo: "/" })
      }}
    >
      <button type="submit">サインアウト</button>
    </form>
  )
}
```

## まとめ

Auth.js v5は、Next.js 15のApp Routerに最適化された強力な認証ソリューションです。

**主要機能:**
- OAuth（Google、GitHub等）の簡単統合
- データベース連携
- ミドルウェアによるルート保護
- Server ActionsとRoute Handlersのネイティブサポート
- TypeScriptによる型安全性

公式ドキュメント: https://authjs.dev/

Auth.jsを使えば、セキュアな認証システムを数時間で構築できます。プロダクション環境でも安心して使用できる、実績のあるソリューションです。
