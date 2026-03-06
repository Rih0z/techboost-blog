---
title: "Lucia認証ライブラリ完全ガイド — セッションベース認証の新定番"
description: "TypeScriptファーストのセッション認証ライブラリLuciaの完全ガイド。Next.js、SvelteKit、Astroでの実装から、OAuth統合、セキュリティベストプラクティスまで徹底解説します。サンプルコード付きで実践的に解説。"
pubDate: "2026-02-06"
tags: ["Lucia", "Authentication", "TypeScript", "Next.js", "セキュリティ"]
---
Luciaは、TypeScriptファーストのセッションベース認証ライブラリです。JWTやサードパーティ認証サービスに依存せず、シンプルで柔軟なセッション管理を実現します。Next.js、SvelteKit、Astroなど、あらゆるフレームワークで使用できます。この記事では、Luciaの基本から実践的な実装まで徹底的に解説します。

## Luciaとは

Luciaは、セッションベース認証に特化した軽量ライブラリです。主な特徴は以下の通りです。

- **TypeScript完全対応** - 型安全な認証実装
- **フレームワーク非依存** - Next.js、SvelteKit、Astro、Express等で使用可能
- **データベース柔軟性** - Prisma、Drizzle、Kysely、SQL等あらゆるORMに対応
- **OAuth統合** - GitHub、Google、Discord等の認証プロバイダー対応
- **シンプルなAPI** - 最小限の設定で使い始められる
- **セキュアなデフォルト** - ベストプラクティスを標準実装

## なぜLuciaか？

### 従来の認証ライブラリとの比較

**NextAuth.js（Auth.js）:**
- プロバイダー中心の設計
- JWTまたはデータベースセッション
- 柔軟性に欠ける部分がある

**Passport.js:**
- Express専用
- コールバック地獄になりがち
- TypeScript対応が不十分

**Lucia:**
- セッション管理に特化
- フレームワーク非依存
- TypeScriptファースト
- 完全な制御が可能

## インストールとセットアップ

### 基本インストール

```bash
# Luciaのインストール
npm install lucia

# データベースアダプター（例: Prisma）
npm install @lucia-auth/adapter-prisma
```

### Prismaスキーマ定義

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id       String    @id
  email    String    @unique
  username String    @unique
  sessions Session[]

  @@map("users")
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  user      User     @relation(references: [id], fields: [userId], onDelete: Cascade)

  @@map("sessions")
}
```

### Lucia初期化

```typescript
// lib/auth.ts
import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      username: attributes.username,
    };
  },
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      username: string;
    };
  }
}
```

## 基本的な認証フロー

### ユーザー登録

```typescript
// app/api/signup/route.ts
import { lucia } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { generateId } from 'lucia';
import { hash } from '@node-rs/argon2';

export async function POST(req: Request) {
  const { email, username, password } = await req.json();

  // バリデーション
  if (!email || !username || !password) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ error: 'Password too short' }, { status: 400 });
  }

  // ユーザー存在チェック
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    return Response.json({ error: 'User already exists' }, { status: 400 });
  }

  // パスワードハッシュ化
  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  // ユーザー作成
  const userId = generateId(15);

  await prisma.user.create({
    data: {
      id: userId,
      email,
      username,
      passwordHash,
    },
  });

  // セッション作成
  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return Response.json({ success: true });
}
```

### ログイン

```typescript
// app/api/login/route.ts
import { lucia } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verify } from '@node-rs/argon2';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }

  // ユーザー検索
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // パスワード検証
  const validPassword = await verify(user.passwordHash, password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  if (!validPassword) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // セッション作成
  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return Response.json({ success: true });
}
```

### ログアウト

```typescript
// app/api/logout/route.ts
import { lucia } from '@/lib/auth';
import { cookies } from 'next/headers';
import { validateRequest } from '@/lib/auth-utils';

export async function POST() {
  const { session } = await validateRequest();

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // セッション無効化
  await lucia.invalidateSession(session.id);

  // クッキー削除
  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return Response.json({ success: true });
}
```

## セッション検証

### ミドルウェアでの検証（Next.js App Router）

```typescript
// lib/auth-utils.ts
import { lucia } from './auth';
import { cookies } from 'next/headers';
import { cache } from 'react';

export const validateRequest = cache(async () => {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    return {
      user: null,
      session: null,
    };
  }

  const result = await lucia.validateSession(sessionId);

  // セッションリフレッシュが必要な場合
  try {
    if (result.session && result.session.fresh) {
      const sessionCookie = lucia.createSessionCookie(result.session.id);
      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
    }
    if (!result.session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
    }
  } catch {
    // Next.jsのcookies()がread-onlyの場合の処理
  }

  return result;
});
```

### 保護されたルート

```typescript
// app/dashboard/page.tsx
import { validateRequest } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { user } = await validateRequest();

  if (!user) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.username}!</p>
    </div>
  );
}
```

### Server Actions

```typescript
// app/actions/profile.ts
'use server';

import { validateRequest } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function updateProfile(formData: FormData) {
  const { user } = await validateRequest();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const username = formData.get('username') as string;

  await prisma.user.update({
    where: { id: user.id },
    data: { username },
  });

  return { success: true };
}
```

## OAuth統合

### GitHub認証

```bash
# OAuthライブラリのインストール
npm install arctic
```

```typescript
// lib/oauth.ts
import { GitHub } from 'arctic';

export const github = new GitHub(
  process.env.GITHUB_CLIENT_ID!,
  process.env.GITHUB_CLIENT_SECRET!
);
```

### GitHub認証フロー

```typescript
// app/api/login/github/route.ts
import { github } from '@/lib/oauth';
import { generateState } from 'arctic';
import { cookies } from 'next/headers';

export async function GET() {
  const state = generateState();

  const url = await github.createAuthorizationURL(state, {
    scopes: ['user:email'],
  });

  cookies().set('github_oauth_state', state, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 10, // 10分
    sameSite: 'lax',
  });

  return Response.redirect(url);
}
```

### GitHubコールバック処理

```typescript
// app/api/login/github/callback/route.ts
import { github } from '@/lib/oauth';
import { lucia } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { generateId } from 'lucia';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies().get('github_oauth_state')?.value ?? null;

  if (!code || !state || !storedState || state !== storedState) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    // トークン取得
    const tokens = await github.validateAuthorizationCode(code);

    // GitHubユーザー情報取得
    const githubUserResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    const githubUser = await githubUserResponse.json();

    // メールアドレス取得
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    const emails = await emailsResponse.json();
    const primaryEmail = emails.find((email: any) => email.primary)?.email;

    if (!primaryEmail) {
      return Response.json({ error: 'No email found' }, { status: 400 });
    }

    // 既存ユーザー確認
    let user = await prisma.user.findUnique({
      where: { email: primaryEmail },
    });

    // 新規ユーザー作成
    if (!user) {
      const userId = generateId(15);
      user = await prisma.user.create({
        data: {
          id: userId,
          email: primaryEmail,
          username: githubUser.login,
        },
      });
    }

    // セッション作成
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    return Response.redirect(new URL('/dashboard', req.url));
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
```

## 複数のOAuthプロバイダー

### Google認証

```typescript
// lib/oauth.ts
import { GitHub, Google } from 'arctic';

export const github = new GitHub(
  process.env.GITHUB_CLIENT_ID!,
  process.env.GITHUB_CLIENT_SECRET!
);

export const google = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/login/google/callback`
);
```

### Discord認証

```typescript
// lib/oauth.ts
import { Discord } from 'arctic';

export const discord = new Discord(
  process.env.DISCORD_CLIENT_ID!,
  process.env.DISCORD_CLIENT_SECRET!,
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/login/discord/callback`
);
```

### データベーススキーマ（OAuth対応）

```prisma
model User {
  id            String         @id
  email         String         @unique
  username      String         @unique
  passwordHash  String?
  sessions      Session[]
  oauthAccounts OAuthAccount[]

  @@map("users")
}

model OAuthAccount {
  providerId     String
  providerUserId String
  userId         String
  user           User   @relation(references: [id], fields: [userId], onDelete: Cascade)

  @@id([providerId, providerUserId])
  @@map("oauth_accounts")
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  user      User     @relation(references: [id], fields: [userId], onDelete: Cascade)

  @@map("sessions")
}
```

## 2要素認証（2FA）

### TOTPの実装

```bash
npm install @epic-web/totp
```

```typescript
// lib/totp.ts
import { TOTP } from '@epic-web/totp';

export async function generateTOTP(secret: string) {
  const totp = new TOTP({
    secret,
    period: 30,
    digits: 6,
  });

  return totp.generate();
}

export async function verifyTOTP(secret: string, token: string) {
  const totp = new TOTP({
    secret,
    period: 30,
    digits: 6,
  });

  return totp.verify(token);
}
```

### 2FA有効化

```typescript
// app/api/2fa/enable/route.ts
import { validateRequest } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { generateRandomString } from 'lucia';

export async function POST() {
  const { user } = await validateRequest();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TOTP秘密鍵生成
  const secret = generateRandomString(20, '0123456789abcdef');

  // ユーザーに秘密鍵を保存
  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpSecret: secret,
      totpEnabled: false, // 検証後に有効化
    },
  });

  // QRコード生成用のURI
  const uri = `otpauth://totp/${encodeURIComponent(
    user.email
  )}?secret=${secret}&issuer=YourApp`;

  return Response.json({ secret, uri });
}
```

### 2FA検証

```typescript
// app/api/2fa/verify/route.ts
import { validateRequest } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { verifyTOTP } from '@/lib/totp';

export async function POST(req: Request) {
  const { user } = await validateRequest();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token } = await req.json();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser?.totpSecret) {
    return Response.json({ error: 'TOTP not configured' }, { status: 400 });
  }

  const valid = await verifyTOTP(dbUser.totpSecret, token);

  if (!valid) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2FA有効化
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true },
  });

  return Response.json({ success: true });
}
```

## メール確認（Email Verification）

### データベーススキーマ

```prisma
model User {
  id               String            @id
  email            String            @unique
  emailVerified    Boolean           @default(false)
  verificationTokens VerificationToken[]

  @@map("users")
}

model VerificationToken {
  id        String   @id
  userId    String
  expiresAt DateTime
  user      User     @relation(references: [id], fields: [userId], onDelete: Cascade)

  @@map("verification_tokens")
}
```

### 確認メール送信

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${token}`;

  await resend.emails.send({
    from: 'noreply@yourapp.com',
    to: email,
    subject: 'Verify your email',
    html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
  });
}
```

### トークン生成と送信

```typescript
// app/api/send-verification/route.ts
import { validateRequest } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { generateId } from 'lucia';
import { sendVerificationEmail } from '@/lib/email';

export async function POST() {
  const { user } = await validateRequest();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.emailVerified) {
    return Response.json({ error: 'Already verified' }, { status: 400 });
  }

  // 既存のトークンを削除
  await prisma.verificationToken.deleteMany({
    where: { userId: user.id },
  });

  // 新しいトークン生成
  const tokenId = generateId(40);

  await prisma.verificationToken.create({
    data: {
      id: tokenId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1時間
    },
  });

  // メール送信
  await sendVerificationEmail(user.email, tokenId);

  return Response.json({ success: true });
}
```

### メール確認

```typescript
// app/api/verify-email/route.ts
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return Response.json({ error: 'Invalid token' }, { status: 400 });
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { id: token },
  });

  if (!verificationToken) {
    return Response.json({ error: 'Invalid token' }, { status: 400 });
  }

  if (verificationToken.expiresAt < new Date()) {
    return Response.json({ error: 'Token expired' }, { status: 400 });
  }

  // ユーザーを確認済みにする
  await prisma.user.update({
    where: { id: verificationToken.userId },
    data: { emailVerified: true },
  });

  // トークン削除
  await prisma.verificationToken.delete({
    where: { id: token },
  });

  return Response.redirect(new URL('/dashboard', req.url));
}
```

## パスワードリセット

### リセットトークン生成

```typescript
// app/api/forgot-password/route.ts
import { prisma } from '@/lib/prisma';
import { generateId } from 'lucia';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: Request) {
  const { email } = await req.json();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // セキュリティのため、ユーザーが存在しない場合も成功を返す
    return Response.json({ success: true });
  }

  // 既存のトークンを削除
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // 新しいトークン生成
  const tokenId = generateId(40);

  await prisma.passwordResetToken.create({
    data: {
      id: tokenId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1時間
    },
  });

  await sendPasswordResetEmail(email, tokenId);

  return Response.json({ success: true });
}
```

### パスワードリセット実行

```typescript
// app/api/reset-password/route.ts
import { prisma } from '@/lib/prisma';
import { lucia } from '@/lib/auth';
import { hash } from '@node-rs/argon2';

export async function POST(req: Request) {
  const { token, password } = await req.json();

  if (password.length < 8) {
    return Response.json({ error: 'Password too short' }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { id: token },
  });

  if (!resetToken) {
    return Response.json({ error: 'Invalid token' }, { status: 400 });
  }

  if (resetToken.expiresAt < new Date()) {
    return Response.json({ error: 'Token expired' }, { status: 400 });
  }

  // 全セッション無効化
  await lucia.invalidateUserSessions(resetToken.userId);

  // パスワード更新
  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash },
  });

  // トークン削除
  await prisma.passwordResetToken.delete({
    where: { id: token },
  });

  return Response.json({ success: true });
}
```

## セキュリティベストプラクティス

### レート制限

```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

export default function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  });

  return {
    check: (res: Response, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;

        if (isRateLimited) {
          reject(new Error('Rate limit exceeded'));
        } else {
          resolve();
        }
      }),
  };
}
```

### CSRF保護

Luciaはセッションクッキーに`sameSite: 'lax'`を自動設定し、基本的なCSRF保護を提供します。

### セッション有効期限

```typescript
// lib/auth.ts
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: false,
  },
  sessionExpiresIn: new TimeSpan(30, 'd'), // 30日
});
```

## まとめ

Luciaは、TypeScriptファーストのセッション認証ライブラリとして、柔軟で型安全な認証実装を可能にします。

**主な利点:**
- 完全な型安全性
- フレームワーク非依存
- データベース柔軟性
- OAuth統合の容易さ
- セキュアなデフォルト

NextAuth.jsやPassport.jsと比べて、より細かい制御が可能で、TypeScript開発者にとって理想的な認証ライブラリです。セッションベース認証のベストプラクティスを実装したい場合、Luciaは最良の選択肢の一つです。
