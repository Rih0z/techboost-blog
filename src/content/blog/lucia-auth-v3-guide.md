---
title: 'Lucia Auth v3完全ガイド: TypeScriptファーストな認証ライブラリ入門'
description: 'Lucia Auth v3を使った認証システムの構築を解説。セッション管理、パスワード認証、OAuth連携、Next.js/SvelteKit統合、セキュリティベストプラクティスまで実践的に網羅。Lucia Auth・認証・TypeScriptに関する実践情報。'
pubDate: '2025-02-05'
tags: ['Lucia Auth', '認証', 'TypeScript', 'セッション管理', 'OAuth', 'セキュリティ']
heroImage: '../../assets/thumbnails/lucia-auth-v3-guide.jpg'
---

Lucia Auth v3は、TypeScriptで書かれた軽量でフレキシブルな認証ライブラリです。本記事では、ゼロから認証システムを構築する方法を実践的に解説します。

## Lucia Authとは

### 特徴

```
従来の認証ライブラリとの比較:

NextAuth/Auth.js          Lucia Auth v3
├─ 設定ベース             ├─ コードファースト
├─ 抽象化が高い           ├─ 低レベルAPI
├─ カスタマイズ困難       ├─ 完全な制御
├─ 内部実装が不透明       ├─ シンプルで明確
└─ フレームワーク依存     └─ フレームワーク非依存
```

**主な利点**:
- セッション管理の完全な制御
- データベース選択の自由
- 型安全な設計
- 軽量（コアは数KB）
- フレームワーク非依存

### アーキテクチャ

```
┌──────────────┐
│   Browser    │
│  (Cookie)    │
└──────┬───────┘
       │ Session ID
┌──────▼───────┐
│  Web Server  │
│  (Lucia)     │
└──────┬───────┘
       │
┌──────▼───────┐
│  Database    │
│  (Adapter)   │
└──────────────┘
  ├─ users
  └─ sessions
```

## プロジェクトセットアップ

### インストール

```bash
# Lucia本体
npm install lucia

# アダプター（データベース接続）
npm install @lucia-auth/adapter-prisma  # Prisma
# または
npm install @lucia-auth/adapter-drizzle # Drizzle ORM
# または
npm install @lucia-auth/adapter-postgresql # pg

# パスワードハッシュ
npm install @node-rs/argon2
# または
npm install bcrypt
```

### データベーススキーマ

```prisma
// prisma/schema.prisma
model User {
  id       String    @id @default(cuid())
  email    String    @unique
  username String    @unique
  sessions Session[]

  // 追加フィールド
  emailVerified DateTime?
  hashedPassword String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime

  user User @relation(references: [id], fields: [userId], onDelete: Cascade)

  @@index([userId])
}
```

```bash
# マイグレーション
npx prisma migrate dev --name init
```

### Luciaインスタンス作成

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
      secure: process.env.NODE_ENV === 'production'
    }
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      username: attributes.username,
      emailVerified: attributes.emailVerified
    };
  }
});

// 型定義の拡張
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  email: string;
  username: string;
  emailVerified: Date | null;
}
```

## パスワード認証の実装

### ユーザー登録

```typescript
// app/api/signup/route.ts (Next.js App Router)
import { lucia } from '@/lib/auth';
import { hash } from '@node-rs/argon2';
import { generateId } from 'lucia';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  const { email, username, password } = await request.json();

  // バリデーション
  if (!email || !username || !password) {
    return Response.json(
      { error: 'すべてのフィールドを入力してください' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return Response.json(
      { error: 'パスワードは8文字以上必要です' },
      { status: 400 }
    );
  }

  // パスワードハッシュ化
  const hashedPassword = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1
  });

  const userId = generateId(15);

  try {
    // ユーザー作成
    await prisma.user.create({
      data: {
        id: userId,
        email,
        username,
        hashedPassword
      }
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
  } catch (error) {
    if (error.code === 'P2002') {
      return Response.json(
        { error: 'このメールアドレスまたはユーザー名は既に使用されています' },
        { status: 400 }
      );
    }

    return Response.json(
      { error: '登録に失敗しました' },
      { status: 500 }
    );
  }
}
```

### ログイン

```typescript
// app/api/login/route.ts
import { lucia } from '@/lib/auth';
import { verify } from '@node-rs/argon2';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return Response.json(
      { error: 'メールアドレスとパスワードを入力してください' },
      { status: 400 }
    );
  }

  // ユーザー検索
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.hashedPassword) {
    return Response.json(
      { error: 'メールアドレスまたはパスワードが正しくありません' },
      { status: 400 }
    );
  }

  // パスワード検証
  const validPassword = await verify(user.hashedPassword, password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1
  });

  if (!validPassword) {
    return Response.json(
      { error: 'メールアドレスまたはパスワードが正しくありません' },
      { status: 400 }
    );
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

export async function POST() {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value;

  if (!sessionId) {
    return Response.json(
      { error: 'セッションが見つかりません' },
      { status: 401 }
    );
  }

  // セッション無効化
  await lucia.invalidateSession(sessionId);

  // Cookieクリア
  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return Response.json({ success: true });
}
```

## セッション管理

### 認証状態の取得

```typescript
// lib/session.ts
import { lucia } from './auth';
import { cookies } from 'next/headers';
import { cache } from 'react';

export const validateRequest = cache(async () => {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    return { user: null, session: null };
  }

  const result = await lucia.validateSession(sessionId);

  // セッション更新が必要な場合（有効期限の半分を過ぎた場合）
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
    // Next.jsのheaders()は読み取り専用の場合がある
  }

  return result;
});
```

### ミドルウェアで保護

```typescript
// middleware.ts (Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('auth_session');

  // 保護されたルート
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 認証済みユーザーをログインページにアクセスさせない
  if (request.nextUrl.pathname.startsWith('/login')) {
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup']
};
```

### Server Componentsでの使用

```typescript
// app/dashboard/page.tsx
import { validateRequest } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { user } = await validateRequest();

  if (!user) {
    redirect('/login');
  }

  return (
    <div>
      <h1>ダッシュボード</h1>
      <p>ようこそ、{user.username}さん！</p>
      <p>メールアドレス: {user.email}</p>

      {!user.emailVerified && (
        <div className="alert">
          メールアドレスが未確認です
        </div>
      )}
    </div>
  );
}
```

## OAuth連携

### GitHub OAuth

```typescript
// lib/oauth.ts
import { GitHub } from 'arctic';

export const github = new GitHub(
  process.env.GITHUB_CLIENT_ID!,
  process.env.GITHUB_CLIENT_SECRET!,
  process.env.NEXT_PUBLIC_APP_URL + '/api/auth/callback/github'
);
```

```typescript
// app/api/auth/github/route.ts
import { github } from '@/lib/oauth';
import { generateState } from 'arctic';
import { cookies } from 'next/headers';

export async function GET() {
  const state = generateState();
  const url = await github.createAuthorizationURL(state, {
    scopes: ['user:email']
  });

  // CSRF対策のためstateをCookieに保存
  cookies().set('github_oauth_state', state, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 10, // 10分
    sameSite: 'lax'
  });

  return Response.redirect(url);
}
```

```typescript
// app/api/auth/callback/github/route.ts
import { github } from '@/lib/oauth';
import { lucia } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { generateId } from 'lucia';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies().get('github_oauth_state')?.value ?? null;

  if (!code || !state || !storedState || state !== storedState) {
    return new Response(null, { status: 400 });
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);

    // GitHubユーザー情報取得
    const githubUserResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`
      }
    });
    const githubUser = await githubUserResponse.json();

    // 既存ユーザー確認
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { githubId: githubUser.id },
          { email: githubUser.email }
        ]
      }
    });

    if (!user) {
      // 新規ユーザー作成
      const userId = generateId(15);
      user = await prisma.user.create({
        data: {
          id: userId,
          email: githubUser.email,
          username: githubUser.login,
          githubId: githubUser.id,
          emailVerified: new Date() // OAuth経由は確認済みとする
        }
      });
    } else if (!user.githubId) {
      // 既存ユーザーにGitHub IDを追加
      user = await prisma.user.update({
        where: { id: user.id },
        data: { githubId: githubUser.id }
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

    return Response.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return Response.redirect(new URL('/login?error=oauth', request.url));
  }
}
```

## メール確認機能

### 確認トークン生成

```typescript
// lib/tokens.ts
import { TimeSpan, createDate } from 'oslo';
import { generateRandomString, alphabet } from 'oslo/crypto';
import { prisma } from './db';

export async function generateEmailVerificationToken(
  userId: string,
  email: string
): Promise<string> {
  // 既存トークン削除
  await prisma.emailVerificationToken.deleteMany({
    where: { userId }
  });

  const tokenId = generateRandomString(40, alphabet('a-z', 'A-Z', '0-9'));

  await prisma.emailVerificationToken.create({
    data: {
      id: tokenId,
      userId,
      email,
      expiresAt: createDate(new TimeSpan(2, 'h')) // 2時間有効
    }
  });

  return tokenId;
}

export async function verifyEmailToken(token: string) {
  const tokenData = await prisma.emailVerificationToken.findUnique({
    where: { id: token }
  });

  if (!tokenData || tokenData.expiresAt < new Date()) {
    return null;
  }

  await prisma.emailVerificationToken.delete({
    where: { id: token }
  });

  return tokenData;
}
```

### メール送信

```typescript
// app/api/verify-email/send/route.ts
import { validateRequest } from '@/lib/session';
import { generateEmailVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';

export async function POST() {
  const { user } = await validateRequest();

  if (!user) {
    return Response.json({ error: '認証が必要です' }, { status: 401 });
  }

  if (user.emailVerified) {
    return Response.json(
      { error: 'メールアドレスは既に確認済みです' },
      { status: 400 }
    );
  }

  const token = await generateEmailVerificationToken(user.id, user.email);
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email/${token}`;

  await sendVerificationEmail(user.email, verificationUrl);

  return Response.json({ success: true });
}
```

### トークン検証

```typescript
// app/api/verify-email/[token]/route.ts
import { verifyEmailToken } from '@/lib/tokens';
import { prisma } from '@/lib/db';
import { lucia } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const tokenData = await verifyEmailToken(params.token);

  if (!tokenData) {
    return Response.redirect(
      new URL('/verify-email/error?reason=invalid', request.url)
    );
  }

  // メールアドレス確認済みに更新
  await prisma.user.update({
    where: { id: tokenData.userId },
    data: { emailVerified: new Date() }
  });

  // 既存セッション無効化（セキュリティのため）
  await lucia.invalidateUserSessions(tokenData.userId);

  // 新しいセッション作成
  const session = await lucia.createSession(tokenData.userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return Response.redirect(new URL('/dashboard', request.url));
}
```

## セキュリティベストプラクティス

### レート制限

```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimitCache = new LRUCache<string, number>({
  max: 500,
  ttl: 60000 // 1分
});

export function rateLimit(identifier: string, limit: number = 5): boolean {
  const count = rateLimitCache.get(identifier) ?? 0;

  if (count >= limit) {
    return false;
  }

  rateLimitCache.set(identifier, count + 1);
  return true;
}
```

```typescript
// app/api/login/route.ts
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

  if (!rateLimit(`login:${ip}`, 5)) {
    return Response.json(
      { error: '試行回数が多すぎます。しばらく待ってから再度お試しください' },
      { status: 429 }
    );
  }

  // ログイン処理...
}
```

### CSRF対策

Luciaのセッションcookieは自動的に`SameSite=Lax`が設定されますが、追加対策も可能:

```typescript
// lib/csrf.ts
import { generateRandomString } from 'oslo/crypto';

export function generateCSRFToken(): string {
  return generateRandomString(32, 'a-zA-Z0-9');
}

export function validateCSRFToken(token: string, stored: string): boolean {
  return token === stored;
}
```

### パスワードリセット

```typescript
// lib/password-reset.ts
import { generateRandomString, alphabet } from 'oslo/crypto';
import { createDate, TimeSpan } from 'oslo';
import { prisma } from './db';

export async function createPasswordResetToken(userId: string): Promise<string> {
  await prisma.passwordResetToken.deleteMany({
    where: { userId }
  });

  const tokenId = generateRandomString(40, alphabet('a-z', 'A-Z', '0-9'));

  await prisma.passwordResetToken.create({
    data: {
      id: tokenId,
      userId,
      expiresAt: createDate(new TimeSpan(1, 'h')) // 1時間有効
    }
  });

  return tokenId;
}
```

## まとめ

Lucia Auth v3を使うことで:

1. **完全な制御** - セッション管理の詳細をコントロール
2. **型安全** - TypeScriptファーストな設計
3. **フレキシブル** - 任意のフレームワーク・データベースに対応
4. **軽量** - 最小限の依存関係
5. **セキュア** - 業界標準のセキュリティプラクティス

従来の認証ライブラリに満足できない開発者に最適なソリューションです。
