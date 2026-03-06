---
title: 'Lucia v3認証マイグレーション: セッションベース認証の次世代アプローチ'
description: 'Lucia v2からv3への移行ガイド。破壊的変更への対応、新しいAPI設計、パフォーマンス改善、Better Authとの比較まで実践的に解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2025-11-05'
updatedDate: '2025-11-05'
tags: ['Lucia', 'Authentication', 'Migration', 'TypeScript', 'セキュリティ']
category: 'backend'
---
Lucia v3は2024年末にリリースされ、より洗練されたAPIと改善されたパフォーマンスを提供します。既存のLucia v2プロジェクトを持つ開発者にとって、v3への移行は避けて通れない道です。本記事では、実践的な移行戦略を解説します。

## Lucia v3の主な変更点

### 1. シンプルになったコア API

v2では複雑だったAPIが、v3で大幅に簡素化されました。

```typescript
// Lucia v2
import { lucia } from 'lucia';
import { prisma } from '@lucia-auth/adapter-prisma';

export const auth = lucia({
  adapter: prisma(prismaClient),
  env: 'DEV',
  middleware: web(),
  sessionCookie: {
    expires: false,
  },
  getUserAttributes: (data) => ({
    email: data.email,
    username: data.username,
  }),
});

// Lucia v3（簡潔に！）
import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    username: attributes.username,
  }),
});
```

### 2. ミドルウェアの廃止

v2で必要だった`middleware`オプションが削除され、フレームワーク非依存になりました。

```typescript
// v2: フレームワーク固有のミドルウェアが必要
import { web } from 'lucia/middleware';

export const auth = lucia({
  middleware: web(),
  // ...
});

// v3: ミドルウェア不要、どのフレームワークでも同じコード
export const lucia = new Lucia(adapter, {
  // ...
});
```

### 3. 型推論の改善

v3では、TypeScriptの型推論が大幅に改善されました。

```typescript
// Lucia v3
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      username: string;
      emailVerified: boolean;
    };
  }
}

// 自動的に型推論される
const session = await lucia.createSession(userId, {});
// session.user.email ← 型安全！
// session.user.username ← 型安全！
// session.user.emailVerified ← 型安全！
```

## ステップバイステップ移行ガイド

### Step 1: パッケージの更新

```bash
# 古いパッケージをアンインストール
npm uninstall lucia lucia-auth @lucia-auth/adapter-prisma

# 新しいパッケージをインストール
npm install lucia@latest @lucia-auth/adapter-prisma@latest
```

### Step 2: 設定ファイルの更新

```typescript
// lib/auth.ts（v2）
import { lucia } from 'lucia';
import { prisma } from '@lucia-auth/adapter-prisma';
import { web } from 'lucia/middleware';
import { prisma as prismaClient } from './prisma';

export const auth = lucia({
  adapter: prisma(prismaClient),
  env: process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV',
  middleware: web(),
  sessionCookie: {
    expires: false,
  },
  getUserAttributes: (data) => ({
    email: data.email,
    username: data.username,
  }),
});

export type Auth = typeof auth;
```

```typescript
// lib/auth.ts（v3に移行）
import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { prisma } from './prisma';

// アダプター初期化
const adapter = new PrismaAdapter(prisma.session, prisma.user);

// Lucia初期化
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    username: attributes.username,
  }),
});

// 型定義
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  email: string;
  username: string;
}
```

### Step 3: メソッド名の変更

v3では多くのメソッド名が変更されています。

```typescript
// v2 → v3 メソッド対応表

// セッション作成
auth.createSession(userId, {})          // v2
lucia.createSession(userId, {})         // v3

// セッション検証
auth.validateSession(sessionId)         // v2
lucia.validateSession(sessionId)        // v3

// セッション無効化
auth.invalidateSession(sessionId)       // v2
lucia.invalidateSession(sessionId)      // v3

// ユーザーの全セッション無効化
auth.invalidateAllUserSessions(userId)  // v2
lucia.invalidateUserSessions(userId)    // v3（名前変更！）

// セッションクッキー作成
auth.createSessionCookie(sessionId)     // v2
lucia.createSessionCookie(sessionId)    // v3

// 空のセッションクッキー作成
auth.createBlankSessionCookie()         // v2
lucia.createBlankSessionCookie()        // v3
```

### Step 4: 認証フローの更新

#### ログイン処理

```typescript
// app/api/login/route.ts（v2）
import { auth } from '@/lib/auth';
import * as context from 'next/headers';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // ユーザー検証...
  const user = await findUser(email, password);

  // v2: セッション作成
  const session = await auth.createSession({
    userId: user.id,
    attributes: {},
  });

  const sessionCookie = auth.createSessionCookie(session);
  context.cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  return Response.json({ success: true });
}
```

```typescript
// app/api/login/route.ts（v3）
import { lucia } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // ユーザー検証...
  const user = await findUser(email, password);

  // v3: シンプルなAPI
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

#### セッション検証

```typescript
// lib/auth-utils.ts（v2）
import { auth } from './auth';
import * as context from 'next/headers';
import { cache } from 'react';

export const validateRequest = cache(async () => {
  const sessionId = context.cookies().get(auth.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    return {
      user: null,
      session: null,
    };
  }

  const result = await auth.validateSession(sessionId);

  try {
    if (result.session && result.session.fresh) {
      const sessionCookie = auth.createSessionCookie(result.session.sessionId);
      context.cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
    }
    if (!result.session) {
      const sessionCookie = auth.createBlankSessionCookie();
      context.cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
    }
  } catch {}

  return result;
});
```

```typescript
// lib/auth-utils.ts（v3）
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

  // セッションリフレッシュロジックは同じ
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
  } catch {}

  return result;
});
```

### Step 5: OAuth統合の更新

OAuth部分も若干の変更があります。

```typescript
// v2
import { github } from '@lucia-auth/oauth/providers';

const githubAuth = github(auth, {
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
});

// v3（Arcticライブラリを使用）
import { GitHub } from 'arctic';

export const github = new GitHub(
  process.env.GITHUB_CLIENT_ID!,
  process.env.GITHUB_CLIENT_SECRET!
);
```

完全なOAuth実装例：

```typescript
// app/api/login/github/route.ts（v3）
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
    maxAge: 60 * 10,
    sameSite: 'lax',
  });

  return Response.redirect(url);
}
```

```typescript
// app/api/login/github/callback/route.ts（v3）
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
    const tokens = await github.validateAuthorizationCode(code);
    const githubUser = await fetchGitHubUser(tokens.accessToken);

    // 既存ユーザー確認
    let user = await prisma.user.findUnique({
      where: { githubId: githubUser.id },
    });

    // 新規ユーザー作成
    if (!user) {
      const userId = generateId(15);
      user = await prisma.user.create({
        data: {
          id: userId,
          githubId: githubUser.id,
          email: githubUser.email,
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

async function fetchGitHubUser(accessToken: string) {
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.json();
}
```

## パフォーマンス改善

v3では、セッション検証のパフォーマンスが向上しています。

### セッションキャッシング

```typescript
// lib/session-cache.ts
import { cache } from 'react';
import { lucia } from './auth';

// React Cacheを使ったセッション検証（リクエストごとに1回のみ）
export const getSession = cache(async (sessionId: string) => {
  return await lucia.validateSession(sessionId);
});
```

### データベースクエリ最適化

```typescript
// prisma/schema.prisma
model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  user      User     @relation(references: [id], fields: [userId], onDelete: Cascade)

  @@index([userId])    // ユーザーID検索用インデックス
  @@index([expiresAt]) // 期限切れセッション削除用インデックス

  @@map("sessions")
}
```

## Better Authとの比較

Lucia v3と同時期に登場したBetter Authとの比較です。

### Lucia v3の強み

```typescript
// Lucia v3: シンプルで柔軟
import { Lucia } from 'lucia';

const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: { secure: true },
  },
});

// 完全な制御
const session = await lucia.createSession(userId, {
  customData: 'anything',
});
```

### Better Authの強み

```typescript
// Better Auth: 機能豊富、設定ベース
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  database: prisma,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
  plugins: [
    twoFactor(),
    magicLink(),
  ],
});
```

### 選択基準

| 項目 | Lucia v3 | Better Auth |
|------|----------|-------------|
| 学習曲線 | 低い | 中程度 |
| カスタマイズ性 | 非常に高い | 高い |
| 標準機能 | 最小限 | 豊富 |
| バンドルサイズ | 小さい | やや大きい |
| TypeScript対応 | 優れている | 優れている |
| 適用ケース | カスタム要件が多い | 標準的な認証 |

## トラブルシューティング

### よくあるエラーと解決策

#### 1. セッションクッキーが設定されない

```typescript
// 問題: cookies().set()が動作しない
cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

// 解決: Next.js 14以降では、Server Actionsまたはhttps://が必要
// next.config.jsで確認
export default {
  experimental: {
    serverActions: true,
  },
};
```

#### 2. 型エラー

```typescript
// 問題: user.emailが型エラー
const { user } = await validateRequest();
console.log(user.email); // Property 'email' does not exist

// 解決: DatabaseUserAttributes型定義が必要
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

#### 3. セッションが期限切れにならない

```typescript
// 問題: セッションが永続的に残る
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: false, // これが問題！
  },
});

// 解決: 適切な有効期限を設定
import { TimeSpan } from 'lucia';

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: new TimeSpan(30, 'd'), // 30日
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
});
```

## まとめ

Lucia v3への移行のポイント：

1. **APIの簡素化** - ミドルウェアが不要に
2. **型推論の改善** - より安全なTypeScript開発
3. **パフォーマンス向上** - 最適化されたセッション管理
4. **段階的移行** - v2との共存が可能

Lucia v3は、セッションベース認証の実装を大幅に簡素化し、開発者体験を向上させます。既存プロジェクトの移行は、段階的に進めることで安全に実施できます。
