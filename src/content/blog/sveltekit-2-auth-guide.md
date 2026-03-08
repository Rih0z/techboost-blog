---
title: "SvelteKit 2認証実装ガイド"
description: "SvelteKit 2でのユーザー認証、フォームアクション、OAuth、JWTの実装を完全解説。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。初心者から実務レベルまで段階的に学べる内容です。"
pubDate: "2025-02-05"
tags: ['Svelte', 'フロントエンド', '開発ツール']
heroImage: '../../assets/thumbnails/sveltekit-2-auth-guide.jpg'
---
SvelteKit 2は、フルスタックWebアプリケーション開発のための強力なフレームワークです。本記事では、SvelteKit 2でのユーザー認証実装を基礎から応用まで徹底的に解説します。フォームアクション、サーバーサイドセッション、OAuth連携、JWT、ミドルウェア(hooks)によるガードまで、実践的な実装方法をカバーします。

## SvelteKit 2の認証アーキテクチャ

SvelteKit 2では、サーバーサイドとクライアントサイドの境界が明確に設計されており、セキュアな認証実装が可能です。

### 認証フローの基本構造

```
1. ユーザーがログインフォームを送信
2. サーバーサイドでフォームアクションが処理
3. 認証情報を検証
4. セッションを作成してCookieに保存
5. hooksミドルウェアで全リクエストを保護
6. ページコンポーネントで認証状態を利用
```

## 基本的な認証実装

### プロジェクトセットアップ

```bash
# SvelteKit 2プロジェクトの作成
npm create svelte@latest my-auth-app
cd my-auth-app
npm install

# 必要なパッケージをインストール
npm install @lucia-auth/adapter-prisma lucia
npm install -D prisma
npm install bcrypt
npm install -D @types/bcrypt
```

### データベーススキーマ

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id           String    @id @default(uuid())
  username     String    @unique
  email        String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  sessions     Session[]
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  user      User     @relation(references: [id], fields: [userId], onDelete: Cascade)

  @@index([userId])
}
```

### Lucia Auth設定

```typescript
// src/lib/server/auth.ts
import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { PrismaClient } from "@prisma/client";
import { dev } from "$app/environment";

const client = new PrismaClient();

const adapter = new PrismaAdapter(client.session, client.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: !dev
    }
  },
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      email: attributes.email
    };
  }
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  username: string;
  email: string;
}
```

## ユーザー登録機能

### 登録ページ

```svelte
<!-- src/routes/register/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData } from "./$types";

  export let form: ActionData;
</script>

<div class="container">
  <h1>新規登録</h1>

  <form method="POST" use:enhance>
    <div class="form-group">
      <label for="username">ユーザー名</label>
      <input
        type="text"
        id="username"
        name="username"
        required
        minlength="3"
        maxlength="31"
      />
    </div>

    <div class="form-group">
      <label for="email">メールアドレス</label>
      <input
        type="email"
        id="email"
        name="email"
        required
      />
    </div>

    <div class="form-group">
      <label for="password">パスワード</label>
      <input
        type="password"
        id="password"
        name="password"
        required
        minlength="8"
      />
    </div>

    <div class="form-group">
      <label for="confirmPassword">パスワード（確認）</label>
      <input
        type="password"
        id="confirmPassword"
        name="confirmPassword"
        required
        minlength="8"
      />
    </div>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}

    <button type="submit">登録</button>
  </form>

  <p>
    アカウントをお持ちですか？
    <a href="/login">ログイン</a>
  </p>
</div>

<style>
  .container {
    max-width: 400px;
    margin: 2rem auto;
    padding: 2rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  button {
    width: 100%;
    padding: 0.75rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }

  button:hover {
    background-color: #45a049;
  }

  .error {
    color: red;
    margin-bottom: 1rem;
  }
</style>
```

### 登録アクション

```typescript
// src/routes/register/+page.server.ts
import { fail, redirect } from "@sveltejs/kit";
import { lucia } from "$lib/server/auth";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import type { Actions } from "./$types";

const prisma = new PrismaClient();

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const username = formData.get("username");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    // バリデーション
    if (
      typeof username !== "string" ||
      username.length < 3 ||
      username.length > 31
    ) {
      return fail(400, {
        error: "ユーザー名は3〜31文字で入力してください"
      });
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return fail(400, {
        error: "有効なメールアドレスを入力してください"
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 255
    ) {
      return fail(400, {
        error: "パスワードは8文字以上で入力してください"
      });
    }

    if (password !== confirmPassword) {
      return fail(400, {
        error: "パスワードが一致しません"
      });
    }

    try {
      // ユーザー名の重複チェック
      const existingUser = await prisma.user.findUnique({
        where: { username }
      });

      if (existingUser) {
        return fail(400, {
          error: "このユーザー名は既に使用されています"
        });
      }

      // メールアドレスの重複チェック
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      });

      if (existingEmail) {
        return fail(400, {
          error: "このメールアドレスは既に登録されています"
        });
      }

      // パスワードをハッシュ化
      const passwordHash = await bcrypt.hash(password, 10);

      // ユーザーを作成
      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash
        }
      });

      // セッションを作成
      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);

      cookies.set(sessionCookie.name, sessionCookie.value, {
        path: ".",
        ...sessionCookie.attributes
      });
    } catch (error) {
      console.error("Registration error:", error);
      return fail(500, {
        error: "登録処理中にエラーが発生しました"
      });
    }

    throw redirect(302, "/dashboard");
  }
};
```

## ログイン機能

### ログインページ

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData } from "./$types";

  export let form: ActionData;
</script>

<div class="container">
  <h1>ログイン</h1>

  <form method="POST" use:enhance>
    <div class="form-group">
      <label for="username">ユーザー名</label>
      <input
        type="text"
        id="username"
        name="username"
        required
      />
    </div>

    <div class="form-group">
      <label for="password">パスワード</label>
      <input
        type="password"
        id="password"
        name="password"
        required
      />
    </div>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}

    <button type="submit">ログイン</button>
  </form>

  <p>
    アカウントをお持ちでないですか？
    <a href="/register">新規登録</a>
  </p>
</div>
```

### ログインアクション

```typescript
// src/routes/login/+page.server.ts
import { fail, redirect } from "@sveltejs/kit";
import { lucia } from "$lib/server/auth";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import type { Actions } from "./$types";

const prisma = new PrismaClient();

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const username = formData.get("username");
    const password = formData.get("password");

    if (typeof username !== "string" || typeof password !== "string") {
      return fail(400, {
        error: "ユーザー名とパスワードを入力してください"
      });
    }

    try {
      // ユーザーを検索
      const user = await prisma.user.findUnique({
        where: { username }
      });

      if (!user) {
        return fail(400, {
          error: "ユーザー名またはパスワードが正しくありません"
        });
      }

      // パスワードを検証
      const validPassword = await bcrypt.compare(password, user.passwordHash);

      if (!validPassword) {
        return fail(400, {
          error: "ユーザー名またはパスワードが正しくありません"
        });
      }

      // セッションを作成
      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);

      cookies.set(sessionCookie.name, sessionCookie.value, {
        path: ".",
        ...sessionCookie.attributes
      });
    } catch (error) {
      console.error("Login error:", error);
      return fail(500, {
        error: "ログイン処理中にエラーが発生しました"
      });
    }

    throw redirect(302, "/dashboard");
  }
};
```

## Hooksミドルウェアによる認証ガード

### グローバル認証チェック

```typescript
// src/hooks.server.ts
import { lucia } from "$lib/server/auth";
import { redirect, type Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(lucia.sessionCookieName);

  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
  } else {
    const { session, user } = await lucia.validateSession(sessionId);

    if (session && session.fresh) {
      const sessionCookie = lucia.createSessionCookie(session.id);
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: ".",
        ...sessionCookie.attributes
      });
    }

    if (!session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: ".",
        ...sessionCookie.attributes
      });
    }

    event.locals.user = user;
    event.locals.session = session;
  }

  // 保護されたルートへのアクセスチェック
  const protectedRoutes = ["/dashboard", "/profile", "/settings"];
  const isProtectedRoute = protectedRoutes.some(route =>
    event.url.pathname.startsWith(route)
  );

  if (isProtectedRoute && !event.locals.user) {
    throw redirect(302, "/login");
  }

  // ログイン済みユーザーが認証ページにアクセスした場合
  const authRoutes = ["/login", "/register"];
  const isAuthRoute = authRoutes.some(route =>
    event.url.pathname.startsWith(route)
  );

  if (isAuthRoute && event.locals.user) {
    throw redirect(302, "/dashboard");
  }

  return resolve(event);
};
```

### 型定義

```typescript
// src/app.d.ts
import type { User, Session } from "lucia";

declare global {
  namespace App {
    interface Locals {
      user: User | null;
      session: Session | null;
    }
  }
}

export {};
```

## ログアウト機能

```typescript
// src/routes/logout/+page.server.ts
import { lucia } from "$lib/server/auth";
import { redirect, type Actions } from "@sveltejs/kit";

export const actions: Actions = {
  default: async ({ locals, cookies }) => {
    if (!locals.session) {
      throw redirect(302, "/login");
    }

    await lucia.invalidateSession(locals.session.id);

    const sessionCookie = lucia.createBlankSessionCookie();
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: ".",
      ...sessionCookie.attributes
    });

    throw redirect(302, "/login");
  }
};
```

## 保護されたページ

```svelte
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<div class="dashboard">
  <h1>ダッシュボード</h1>
  <p>ようこそ、{data.user.username}さん！</p>

  <div class="user-info">
    <h2>ユーザー情報</h2>
    <p><strong>ユーザー名:</strong> {data.user.username}</p>
    <p><strong>メール:</strong> {data.user.email}</p>
  </div>

  <form method="POST" action="/logout">
    <button type="submit">ログアウト</button>
  </form>
</div>
```

```typescript
// src/routes/dashboard/+page.server.ts
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, "/login");
  }

  return {
    user: locals.user
  };
};
```

## OAuth連携（GitHub）

### 環境変数設定

```bash
# .env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### OAuth設定

```typescript
// src/lib/server/oauth.ts
import { GitHub } from "arctic";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from "$env/static/private";

export const github = new GitHub(
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  "http://localhost:5173/login/github/callback"
);
```

### GitHubログインフロー

```typescript
// src/routes/login/github/+server.ts
import { redirect } from "@sveltejs/kit";
import { github } from "$lib/server/oauth";
import { generateState } from "arctic";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies }) => {
  const state = generateState();
  const url = await github.createAuthorizationURL(state, {
    scopes: ["user:email"]
  });

  cookies.set("github_oauth_state", state, {
    path: "/",
    secure: import.meta.env.PROD,
    httpOnly: true,
    maxAge: 60 * 10, // 10分
    sameSite: "lax"
  });

  throw redirect(302, url.toString());
};
```

### GitHubコールバック

```typescript
// src/routes/login/github/callback/+server.ts
import { github } from "$lib/server/oauth";
import { lucia } from "$lib/server/auth";
import { PrismaClient } from "@prisma/client";
import { OAuth2RequestError } from "arctic";
import type { RequestHandler } from "./$types";

const prisma = new PrismaClient();

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies.get("github_oauth_state");

  if (!code || !state || !storedState || state !== storedState) {
    return new Response(null, { status: 400 });
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);
    const githubUserResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`
      }
    });

    const githubUser: GitHubUser = await githubUserResponse.json();

    // ユーザーを検索または作成
    let user = await prisma.user.findFirst({
      where: { username: githubUser.login }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: githubUser.login,
          email: githubUser.email ?? `${githubUser.login}@github.com`,
          passwordHash: "" // OAuthユーザーはパスワード不要
        }
      });
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: ".",
      ...sessionCookie.attributes
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/dashboard"
      }
    });
  } catch (error) {
    if (error instanceof OAuth2RequestError) {
      return new Response(null, { status: 400 });
    }
    return new Response(null, { status: 500 });
  }
};

interface GitHubUser {
  login: string;
  email: string | null;
}
```

## まとめ

SvelteKit 2での認証実装は、フォームアクション、hooksミドルウェア、サーバーサイドセッションを組み合わせることで、セキュアで保守しやすいシステムを構築できます。

主なポイント:

- **フォームアクション**: サーバーサイドで安全に認証処理
- **Lucia Auth**: シンプルで強力な認証ライブラリ
- **Hooksミドルウェア**: グローバルな認証ガード
- **OAuth連携**: GitHub、Google等の外部認証
- **型安全**: TypeScriptによる完全な型推論

この実装パターンを基に、プロダクション環境に適した認証システムを構築できます。
