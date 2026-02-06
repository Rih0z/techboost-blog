---
title: 'Better Auth：Next.js向け認証ライブラリ完全ガイド'
description: 'Better Authを使った認証システムの構築方法。OAuth、メール/パスワード認証、セッション管理、ミドルウェアまで実践的に解説します。'
pubDate: 'Feb 05 2026'
tags: ['Better Auth', '認証', 'Next.js', 'TypeScript', 'OAuth']
---

# Better Auth：Next.js向け認証ライブラリ完全ガイド

認証システムの実装は、Webアプリケーション開発において最も重要かつ複雑な部分の一つです。セキュリティを確保しつつ、優れたユーザー体験を提供する必要があります。

Better Authは、Next.jsとの統合に特化した新しい認証ライブラリで、型安全性と開発者体験を重視した設計が特徴です。この記事では、Better Authの基本から実践的な使い方まで、詳しく解説していきます。

## Better Authとは

Better Authは、Next.jsアプリケーション向けに設計された認証ライブラリです。主な特徴は以下の通りです。

### 主な特徴

- **TypeScriptファースト**: 完全な型安全性
- **柔軟なデータベース対応**: Prisma、Drizzle、Kyselyなど
- **多様な認証方法**: OAuth、メール/パスワード、マジックリンク
- **セッション管理**: クッキーベースとJWT両方対応
- **ミドルウェア統合**: Next.jsミドルウェアとシームレス連携
- **拡張性**: プラグインシステム
- **エッジ対応**: Cloudflare Workers、Vercel Edge Functionsで動作

### 競合との比較

**Better Auth vs NextAuth.js (Auth.js)**
- Better Authはより新しく、型安全性が高い
- NextAuth.jsはエコシステムが成熟
- Better Authはエッジランタイム対応が優れている

**Better Auth vs Clerk**
- Clerkは完全ホスト型、Better Authはセルフホスト
- Clerkは有料、Better Authは無料（オープンソース）
- Better Authはデータベースを完全制御可能

**Better Auth vs Lucia**
- 両方とも型安全を重視
- Better Authはより高レベルなAPI
- Luciaはよりプリミティブで柔軟

## セットアップ

### インストール

まずは必要なパッケージをインストールします。

```bash
npm install better-auth
# または
pnpm add better-auth
```

### データベースのセットアップ

Better Authは様々なORMをサポートしています。ここではPrismaを使った例を示します。

```bash
npm install prisma @prisma/client
npx prisma init
```

#### Prismaスキーマ

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

マイグレーションを実行します。

```bash
npx prisma migrate dev --name init
```

### Better Authの設定

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
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});

export type Auth = typeof auth;
```

### 環境変数

`.env.local` に以下を追加します。

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## API Routeの作成

### Next.js App Router

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";

export const { GET, POST } = auth.handler;
```

このシンプルな設定で、以下のエンドポイントが自動的に作成されます。

- `/api/auth/signin`
- `/api/auth/signup`
- `/api/auth/signout`
- `/api/auth/session`
- `/api/auth/callback/github`
- `/api/auth/callback/google`

### Pages Router

```typescript
// pages/api/auth/[...all].ts
import { auth } from "@/lib/auth";

export default auth.handler;
```

## クライアントの設定

### クライアント作成

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});
```

### Reactフック

```typescript
// hooks/use-auth.ts
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authClient.getSession().then((session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  return {
    user,
    loading,
    signIn: authClient.signIn,
    signUp: authClient.signUp,
    signOut: authClient.signOut,
  };
}
```

## 認証フロー

### メール/パスワード認証

#### サインアップフォーム

```typescript
// components/signup-form.tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred during sign up");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border p-2"
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border p-2"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border p-2"
          required
          minLength={8}
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        className="w-full bg-blue-600 text-white rounded-md p-2 hover:bg-blue-700"
      >
        Sign Up
      </button>
    </form>
  );
}
```

#### サインインフォーム

```typescript
// components/signin-form.tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred during sign in");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border p-2"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border p-2"
          required
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        className="w-full bg-blue-600 text-white rounded-md p-2 hover:bg-blue-700"
      >
        Sign In
      </button>
    </form>
  );
}
```

### OAuth認証

#### GitHub/Googleログインボタン

```typescript
// components/oauth-buttons.tsx
"use client";

import { authClient } from "@/lib/auth-client";

export function OAuthButtons() {
  const handleGitHubSignIn = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/dashboard",
    });
  };

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleGitHubSignIn}
        className="w-full bg-gray-900 text-white rounded-md p-2 hover:bg-gray-800 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
            clipRule="evenodd"
          />
        </svg>
        Continue with GitHub
      </button>

      <button
        onClick={handleGoogleSignIn}
        className="w-full bg-white text-gray-900 border rounded-md p-2 hover:bg-gray-50 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>
    </div>
  );
}
```

### マジックリンク認証

メールで送られるリンクをクリックするだけでログインできる方式です。

```typescript
// lib/auth.ts に追加
export const auth = betterAuth({
  // ... 既存の設定
  emailVerification: {
    enabled: true,
    sendVerificationEmail: async ({ user, url }) => {
      // メール送信処理
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: `Click <a href="${url}">here</a> to verify your email.`,
      });
    },
  },
});
```

クライアント側：

```typescript
// components/magic-link-form.tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setSent(true);
    } catch (err) {
      setError("An error occurred");
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-green-600">
          Check your email for a sign-in link!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border p-2"
          required
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        className="w-full bg-blue-600 text-white rounded-md p-2 hover:bg-blue-700"
      >
        Send Magic Link
      </button>
    </form>
  );
}
```

## セッション管理

### サーバーサイドでのセッション取得

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

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {session.user.name}!</p>
      <p>Email: {session.user.email}</p>
    </div>
  );
}
```

### クライアントサイドでのセッション取得

```typescript
// components/user-menu.tsx
"use client";

import { useAuth } from "@/hooks/use-auth";

export function UserMenu() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <a href="/signin" className="text-blue-600 hover:underline">
        Sign In
      </a>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span>{user.name}</span>
      <button
        onClick={() => signOut()}
        className="text-red-600 hover:underline"
      >
        Sign Out
      </button>
    </div>
  );
}
```

## ミドルウェアで保護

### ミドルウェアの設定

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isAuthPage = request.nextUrl.pathname.startsWith("/signin") ||
                     request.nextUrl.pathname.startsWith("/signup");

  if (!session && !isAuthPage) {
    // 未認証の場合はログインページへ
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  if (session && isAuthPage) {
    // 認証済みの場合はダッシュボードへ
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/signin",
    "/signup",
  ],
};
```

### 役割ベースのアクセス制御

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma),
  // ... 既存の設定
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
    },
  },
});
```

Prismaスキーマに追加：

```prisma
model User {
  // ... 既存のフィールド
  role String @default("user") // "user" | "admin" | "moderator"
}
```

ミドルウェアで役割をチェック：

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute) {
    if (!session) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    if (session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}
```

## プラグインシステム

Better Authは拡張可能なプラグインシステムを持っています。

### 2要素認証プラグイン

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  // ... 既存の設定
  plugins: [
    twoFactor({
      issuer: "MyApp",
    }),
  ],
});
```

クライアント側：

```typescript
// components/two-factor-setup.tsx
"use client";

import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import QRCode from "qrcode.react";

export function TwoFactorSetup() {
  const [qrCode, setQrCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const enableTwoFactor = async () => {
    const result = await authClient.twoFactor.enable();
    if (result.data) {
      setQrCode(result.data.qrCode);
    }
  };

  const verifyAndActivate = async () => {
    await authClient.twoFactor.verify({
      code: verificationCode,
    });
    alert("Two-factor authentication enabled!");
  };

  return (
    <div className="space-y-4">
      {!qrCode ? (
        <button
          onClick={enableTwoFactor}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Enable 2FA
        </button>
      ) : (
        <>
          <QRCode value={qrCode} />
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter code from authenticator app"
            className="border p-2 rounded"
          />
          <button
            onClick={verifyAndActivate}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Verify & Activate
          </button>
        </>
      )}
    </div>
  );
}
```

## ベストプラクティス

### 1. 環境変数の管理

```typescript
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

### 2. セッションの型安全性

```typescript
// types/auth.ts
import { auth } from "@/lib/auth";

export type Session = Awaited<
  ReturnType<typeof auth.api.getSession>
>;

export type User = NonNullable<Session>["user"];
```

使用例：

```typescript
function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

### 3. エラーハンドリング

```typescript
// utils/auth-error.ts
export function handleAuthError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("credentials")) {
      return "Invalid email or password";
    }
    if (error.message.includes("exists")) {
      return "An account with this email already exists";
    }
  }
  return "An unexpected error occurred";
}
```

使用例：

```typescript
try {
  await authClient.signUp.email({ email, password, name });
} catch (error) {
  const message = handleAuthError(error);
  setError(message);
}
```

### 4. セッションの永続化

```typescript
// lib/auth.ts
export const auth = betterAuth({
  // ... 既存の設定
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7日間
    updateAge: 60 * 60 * 24, // 24時間ごとに更新
  },
});
```

## トラブルシューティング

### よくある問題

**1. セッションが取得できない**

環境変数が正しく設定されているか確認：

```bash
echo $BETTER_AUTH_SECRET
echo $BETTER_AUTH_URL
```

**2. OAuthが動作しない**

コールバックURLが正しく設定されているか確認：

```
GitHub: http://localhost:3000/api/auth/callback/github
Google: http://localhost:3000/api/auth/callback/google
```

**3. データベース接続エラー**

Prismaクライアントが最新か確認：

```bash
npx prisma generate
npx prisma migrate dev
```

## まとめ

Better Authは、Next.jsアプリケーションに最適な認証ライブラリです。主な利点は以下の通りです。

- **型安全性**: TypeScriptファーストな設計
- **柔軟性**: 様々な認証方法をサポート
- **拡張性**: プラグインで機能追加が容易
- **パフォーマンス**: エッジランタイム対応

セルフホストでデータを完全に制御しつつ、優れた開発者体験を提供します。Next.jsで認証システムを構築する際は、Better Authを検討してみてください。
