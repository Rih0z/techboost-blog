---
title: 'OAuth 2.0 / OpenID Connect 完全解説 — 認証・認可の仕組みとNext.js実装'
description: 'OAuth 2.0とOpenID Connectの仕組みを図解・コード例で完全解説。認証コードフロー・PKCE・JWTトークン・NextAuth.js実装・セキュリティベストプラクティスまで網羅。'
pubDate: 'Feb 21 2026'
tags: ['OAuth', 'Authentication', 'Security', 'Next.js']
---

現代のWebアプリケーションで「Googleでログイン」「GitHubでログイン」を実装するとき、その裏側で動いているのが **OAuth 2.0** と **OpenID Connect（OIDC）** です。本記事では、これらのプロトコルの仕組みを概念レベルから丁寧に解説し、Next.js + NextAuth.js を使った実践的な実装まで一気に学びます。

---

## 1. OAuth 2.0 とは — 認証と認可の違いから理解する

### 認証（Authentication）と認可（Authorization）

多くの開発者が混同しがちな二つの概念を最初に整理します。

| 概念 | 意味 | 例 |
|------|------|----|
| **認証（Authentication）** | 「あなたは誰か」を確認すること | パスワードログイン、生体認証 |
| **認可（Authorization）** | 「あなたは何をしてよいか」を決めること | ファイルの読み取り権限、API呼び出し権限 |

**OAuth 2.0 は本来「認可」のプロトコルです。** ユーザーに代わってサードパーティアプリケーションがリソース（GoogleドライブのファイルやGitHubのリポジトリなど）にアクセスする権限を委譲するための仕組みです。

### OAuth 2.0 が解決する問題

OAuth 2.0 登場以前は、サードパーティアプリに権限を与えるためにパスワードを直接渡すしかありませんでした。これには深刻な問題があります。

- サードパーティがパスワードを保存・漏洩するリスク
- パスワードを変えると全サービスの連携が切れる
- 細かい権限の制御ができない（全権限か無権限かしかない）

OAuth 2.0 はこの問題を **アクセストークン** という概念で解決します。パスワードの代わりに、限定的な権限と有効期限を持つトークンを発行することで、安全な権限委譲を実現します。

### OAuth 2.0 の主要な登場人物

```
Resource Owner（リソースオーナー）
  └── エンドユーザー。保護されたリソースの所有者

Client（クライアント）
  └── サードパーティアプリケーション。リソースへのアクセスを要求

Authorization Server（認可サーバー）
  └── アクセストークンを発行するサーバー（例: Google, GitHub）

Resource Server（リソースサーバー）
  └── 保護されたリソースを持つサーバー（例: Google API, GitHub API）
```

---

## 2. OAuth 2.0 の主要フロー

### 2-1. 認証コードフロー（Authorization Code Flow）

最も安全で一般的なフローです。Webアプリケーション（サーバーサイドを持つもの）に適しています。

```
+----------+                               +-------------------+
|          |---(A) 認可リクエスト -------->|                   |
|          |                               |  Authorization    |
|  Client  |<--(B) 認可コード  -----------|  Server           |
|          |                               |  (例: Google)     |
|          |---(C) トークンリクエスト ----->|                   |
|          |                               |                   |
|          |<--(D) アクセストークン --------|                   |
+----------+                               +-------------------+
     |
     | (E) APIリクエスト（アクセストークン付き）
     v
+-------------------+
|  Resource Server  |
|  (例: Google API) |
+-------------------+
```

各ステップを詳しく見てみましょう。

**ステップ A: 認可リクエスト**

クライアントはユーザーをブラウザ経由で認可サーバーにリダイレクトします。

```
https://accounts.google.com/o/oauth2/v2/auth?
  response_type=code          // 認証コードフローを指定
  &client_id=YOUR_CLIENT_ID   // クライアントID
  &redirect_uri=https://example.com/callback  // コールバックURL
  &scope=openid%20email%20profile  // 要求するスコープ
  &state=RANDOM_STATE_VALUE   // CSRF対策（後述）
```

**ステップ B: 認可コード取得**

ユーザーが同意すると、認可サーバーはコールバックURLに認可コードをつけてリダイレクトします。

```
https://example.com/callback?
  code=4/P7q7W91a-oMsCeLvIaQm6bTrgtp7  // 短命の認可コード（通常10分）
  &state=RANDOM_STATE_VALUE
```

**ステップ C & D: トークン交換**

クライアントはサーバーサイドで認可コードをアクセストークンと交換します。この交換は必ずサーバーサイドで行います（クライアントシークレットを秘匿するため）。

```typescript
// サーバーサイド: 認可コードをトークンに交換
async function exchangeCodeForTokens(code: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,  // 秘匿情報
      redirect_uri: 'https://example.com/callback',
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await response.json();
  // tokens.access_token  → APIアクセス用
  // tokens.refresh_token → アクセストークン更新用
  // tokens.id_token      → ユーザー情報（OIDC）
  return tokens;
}
```

### 2-2. PKCE（Proof Key for Code Exchange）

**PKCE**（ピクシーと読む）は、SPAやモバイルアプリのようにクライアントシークレットを安全に保管できない環境向けの拡張です。RFC 7636 で定義されています。

**PKCEの仕組み:**

```typescript
import { randomBytes, createHash } from 'crypto';

// 1. Code Verifier を生成（43〜128文字のランダム文字列）
function generateCodeVerifier(): string {
  return randomBytes(32)
    .toString('base64url')
    .slice(0, 128);
}

// 2. Code Challenge を生成（Verifier の SHA-256 ハッシュ）
function generateCodeChallenge(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

// 使用例
const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

// 3. 認可リクエストに code_challenge を含める
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', 'openid email profile');
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

// code_verifier はセッションに保存しておく
sessionStorage.setItem('pkce_verifier', codeVerifier);

// 4. トークン交換時に code_verifier を送信
async function exchangeWithPKCE(code: string) {
  const verifier = sessionStorage.getItem('pkce_verifier')!;
  
  const response = await fetch('/api/token', {
    method: 'POST',
    body: JSON.stringify({ code, code_verifier: verifier }),
  });
  
  return response.json();
}
```

**なぜ PKCE が安全なのか:**

認可コードが傍受されても、攻撃者は `code_verifier` を知らないためトークン交換ができません。`code_challenge` はハッシュ値なので、逆算も不可能です。

### 2-3. クライアントクレデンシャルフロー

ユーザーが介在しないサーバー間通信（マイクロサービス間のAPI呼び出しなど）に使用します。

```typescript
// マシンtoマシン認証
async function getClientCredentialsToken() {
  const response = await fetch('https://auth.example.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Basic認証: client_id:client_secret をBase64エンコード
      'Authorization': `Basic ${Buffer.from(
        `${CLIENT_ID}:${CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'read:data write:data',
    }),
  });

  const { access_token, expires_in } = await response.json();
  return { access_token, expires_in };
}
```

---

## 3. OpenID Connect（OIDC）— OAuth 2.0 の上に構築された認証層

**OpenID Connect は OAuth 2.0 を拡張した認証プロトコルです。** OAuth 2.0 が「認可」のみを扱うのに対し、OIDC は「誰がログインしているか」という認証情報を標準化された形で提供します。

### 3-1. IDトークン

OIDC の核心は **IDトークン** です。これは JWT（JSON Web Token）形式で、ユーザーの身元情報（クレーム）を含みます。

```
IDトークンの構造（JWT）:

ヘッダー.ペイロード.署名

eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9   ← ヘッダー（Base64URL）
.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ
                                          ← ペイロード（Base64URL）
.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV...   ← 署名
```

**IDトークンのペイロード（標準クレーム）:**

```json
{
  "iss": "https://accounts.google.com",     // 発行者（Issuer）
  "sub": "110169484474386276334",            // ユーザー識別子（Subject）
  "aud": "812741506391.apps.googleusercontent.com",  // 対象クライアント
  "exp": 1741522800,                         // 有効期限（Unix時間）
  "iat": 1741519200,                         // 発行日時
  "nonce": "RANDOM_NONCE",                   // リプレイ攻撃対策
  "email": "user@example.com",              // メールアドレス
  "email_verified": true,                   // メール確認済み
  "name": "田中 太郎",                       // 表示名
  "picture": "https://lh3.googleusercontent.com/...",  // プロフィール画像URL
  "locale": "ja"                            // ロケール
}
```

### 3-2. UserInfo エンドポイント

IDトークンに含まれない追加情報は、UserInfo エンドポイントから取得できます。

```typescript
async function getUserInfo(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const userInfo = await response.json();
  // {
  //   sub: "110169484474386276334",
  //   name: "田中 太郎",
  //   given_name: "太郎",
  //   family_name: "田中",
  //   email: "user@example.com",
  //   ...
  // }
  return userInfo;
}
```

### 3-3. ディスカバリーエンドポイント（Well-Known Configuration）

OIDC プロバイダーは `/.well-known/openid-configuration` エンドポイントでメタデータを公開しています。これによりクライアントは設定を自動取得できます。

```typescript
// Google の OIDC ディスカバリー情報を取得
async function discoverOIDCConfig(issuer: string) {
  const response = await fetch(
    `${issuer}/.well-known/openid-configuration`
  );
  const config = await response.json();

  // 主要フィールド:
  // config.authorization_endpoint  → 認可エンドポイント
  // config.token_endpoint          → トークンエンドポイント
  // config.userinfo_endpoint       → UserInfo エンドポイント
  // config.jwks_uri                → 公開鍵セット（JWT検証用）
  // config.scopes_supported        → サポートスコープ
  // config.response_types_supported → サポートresponse_type

  return config;
}

// 実行例
const googleConfig = await discoverOIDCConfig('https://accounts.google.com');
console.log(googleConfig.authorization_endpoint);
// https://accounts.google.com/o/oauth2/v2/auth
```

---

## 4. JWT トークンの構造と検証

### 4-1. JWT の構造

JWT は `.` で区切られた3つの Base64URL エンコード部分から構成されます。

```typescript
// JWT をデコードして中身を確認（署名検証なし）
function decodeJWT(token: string) {
  const [headerB64, payloadB64, signature] = token.split('.');

  const header = JSON.parse(
    Buffer.from(headerB64, 'base64url').toString('utf-8')
  );
  const payload = JSON.parse(
    Buffer.from(payloadB64, 'base64url').toString('utf-8')
  );

  return { header, payload, signature };
}

// ヘッダー例:
// {
//   "alg": "RS256",  // 署名アルゴリズム
//   "typ": "JWT",    // トークンタイプ
//   "kid": "abc123"  // 公開鍵ID（JWKSから対応する鍵を探すため）
// }
```

### 4-2. JWT の署名検証

**IDトークンは必ず署名を検証してから使用します。** 検証なしに使うのは深刻なセキュリティホールです。

```typescript
import { createPublicKey, createVerify } from 'crypto';

interface JWKS {
  keys: JWK[];
}

interface JWK {
  kid: string;
  kty: string;
  alg: string;
  n: string;  // RSA公開鍵のモジュラス
  e: string;  // RSA公開鍵の指数
}

// JWKSから公開鍵を取得してIDトークンを検証
async function verifyIDToken(idToken: string, issuer: string, clientId: string) {
  // 1. JWTヘッダーから kid（鍵ID）を取得
  const [headerB64, payloadB64] = idToken.split('.');
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

  // 2. JWKSエンドポイントから公開鍵を取得
  const oidcConfig = await fetch(`${issuer}/.well-known/openid-configuration`)
    .then(r => r.json());
  const jwks: JWKS = await fetch(oidcConfig.jwks_uri).then(r => r.json());

  // 3. kid に対応する鍵を探す
  const jwk = jwks.keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('公開鍵が見つかりません');

  // 4. JWKからNode.js公開鍵オブジェクトを生成
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });

  // 5. 署名を検証
  const [headerPayload, , signatureB64] = idToken.split('.');
  const verify = createVerify('SHA256');
  verify.update(`${headerPayload}`);
  const isValid = verify.verify(
    publicKey,
    Buffer.from(signatureB64, 'base64url')
  );

  if (!isValid) throw new Error('IDトークンの署名が無効です');

  // 6. クレームを検証
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== issuer) {
    throw new Error(`issuer不一致: 期待=${issuer}, 実際=${payload.iss}`);
  }
  if (payload.aud !== clientId) {
    throw new Error(`audience不一致: 期待=${clientId}, 実際=${payload.aud}`);
  }
  if (payload.exp < now) {
    throw new Error('IDトークンが期限切れです');
  }
  if (payload.iat > now + 300) {
    // 5分の時計ズレ許容
    throw new Error('IDトークンの発行時刻が未来です');
  }

  return payload;
}
```

実際のプロジェクトでは `jose` や `jsonwebtoken` ライブラリを使うと便利です。

```typescript
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
);

async function verifyWithJose(idToken: string) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: 'https://accounts.google.com',
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  return payload;
}
```

---

## 5. Next.js + NextAuth.js 実装例

### 5-1. セットアップ

```bash
# NextAuth.js v5（Auth.js）をインストール
npm install next-auth@5
```

**環境変数の設定（`.env.local`）:**

```bash
# NextAuth.js 設定
AUTH_SECRET=your-random-secret-min-32-chars  # openssl rand -base64 32 で生成

# Google OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# GitHub OAuth
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret
```

### 5-2. Auth.js 設定ファイル

```typescript
// auth.ts（プロジェクトルート）
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import type { NextAuthConfig } from 'next-auth';

export const config: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // 要求するスコープを追加
      authorization: {
        params: {
          scope: 'openid email profile',
          // リフレッシュトークンを取得する場合
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],

  callbacks: {
    // JWTコールバック: トークンにカスタムデータを追加
    async jwt({ token, account, profile }) {
      if (account && profile) {
        // 初回ログイン時のみ実行
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : null;
        token.provider = account.provider;
        token.userId = profile.sub ?? profile.id;
      }

      // アクセストークンの有効期限チェック
      if (token.accessTokenExpires && Date.now() > (token.accessTokenExpires as number)) {
        return refreshAccessToken(token);
      }

      return token;
    },

    // セッションコールバック: クライアントに公開するデータを制御
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.provider = token.provider as string;
      session.accessToken = token.accessToken as string;
      return session;
    },
  },

  // ページのカスタマイズ
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);

// アクセストークンのリフレッシュ（Googleの場合）
async function refreshAccessToken(token: any) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) throw refreshedTokens;

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      // リフレッシュトークン自体も更新される場合がある
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('トークンリフレッシュエラー:', error);
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}
```

### 5-3. API Route Handlers

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

### 5-4. ログインページとコンポーネント

```typescript
// app/login/page.tsx
import { signIn } from '@/auth';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-bold text-center">ログイン</h1>

        {/* Google ログイン */}
        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/dashboard' });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 rounded-lg border px-4 py-3 hover:bg-gray-50"
          >
            <GoogleIcon />
            Google でログイン
          </button>
        </form>

        {/* GitHub ログイン */}
        <form
          action={async () => {
            'use server';
            await signIn('github', { redirectTo: '/dashboard' });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 rounded-lg border px-4 py-3 hover:bg-gray-50"
          >
            <GitHubIcon />
            GitHub でログイン
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 5-5. 認証ガードの実装

```typescript
// middleware.ts（プロジェクトルート）
import { auth } from './auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  const isProtected = req.nextUrl.pathname.startsWith('/dashboard');

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.href);
    return Response.redirect(loginUrl);
  }

  if (isAuthPage && isLoggedIn) {
    return Response.redirect(new URL('/dashboard', req.nextUrl.origin));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

```typescript
// Server Component でのセッション取得
// app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1>ダッシュボード</h1>
      <p>ようこそ、{session.user?.name} さん</p>
      <p>プロバイダー: {session.user?.provider}</p>
    </div>
  );
}
```

```typescript
// Client Component でのセッション取得
'use client';
import { useSession } from 'next-auth/react';

export function UserProfile() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p>読み込み中...</p>;
  if (status === 'unauthenticated') return <p>ログインしてください</p>;

  return (
    <div>
      <img src={session!.user!.image!} alt="プロフィール画像" />
      <p>{session!.user!.name}</p>
    </div>
  );
}
```

---

## 6. PKCE 実装 — SPA 向けセキュア認証

NextAuth.js を使わず、SPA で独自にOAuth フローを実装する場合のPKCE実装例です。

```typescript
// lib/pkce-auth.ts

const STORAGE_KEY_VERIFIER = 'oauth_code_verifier';
const STORAGE_KEY_STATE = 'oauth_state';

// Base64URL エンコード（ブラウザ対応）
function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Code Verifier 生成
async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array.buffer);
}

// Code Challenge 生成（S256メソッド）
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(digest);
}

// State パラメータ生成（CSRF対策）
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlEncode(array.buffer);
}

// OAuth認可フロー開始
export async function startOAuthFlow(config: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
}) {
  const codeVerifier = await generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // セッションストレージに保存（XSS対策でlocalStorageより安全）
  sessionStorage.setItem(STORAGE_KEY_VERIFIER, codeVerifier);
  sessionStorage.setItem(STORAGE_KEY_STATE, state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  // 認可サーバーにリダイレクト
  window.location.href = `${config.authorizationEndpoint}?${params}`;
}

// コールバック処理
export async function handleCallback(
  callbackUrl: string,
  tokenEndpoint: string,
  clientId: string,
  redirectUri: string
) {
  const url = new URL(callbackUrl);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // エラーチェック
  if (error) {
    throw new Error(`OAuth エラー: ${error}`);
  }

  // State 検証（CSRF対策）
  const savedState = sessionStorage.getItem(STORAGE_KEY_STATE);
  if (!state || state !== savedState) {
    throw new Error('State パラメータが一致しません（CSRF攻撃の可能性）');
  }

  // Code Verifier を取得
  const codeVerifier = sessionStorage.getItem(STORAGE_KEY_VERIFIER);
  if (!codeVerifier || !code) {
    throw new Error('認証情報が見つかりません');
  }

  // セッションストレージをクリア
  sessionStorage.removeItem(STORAGE_KEY_VERIFIER);
  sessionStorage.removeItem(STORAGE_KEY_STATE);

  // トークン交換（PKCE付き）
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,  // PKCEキー
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`トークン取得エラー: ${error.error_description}`);
  }

  return response.json();
}
```

---

## 7. セキュリティベストプラクティス

### 7-1. State パラメータによる CSRF 対策

```typescript
// State パラメータは必ずランダムな値を使用し、サーバーサイドセッションに保存する
// ❌ 悪い例: 固定値や推測可能な値
const state = 'my-app-state';  // 危険！

// ✓ 良い例: 暗号論的に安全なランダム値
import { randomBytes } from 'crypto';
const state = randomBytes(32).toString('hex');

// セッションに保存
req.session.oauthState = state;

// コールバックで検証
if (req.query.state !== req.session.oauthState) {
  throw new Error('CSRF攻撃を検知しました');
}
delete req.session.oauthState;  // 使用後は削除
```

### 7-2. Nonce による リプレイ攻撃対策

```typescript
// IDトークンにnonceを含めることで、同じトークンの再利用を防ぐ
const nonce = randomBytes(32).toString('hex');
req.session.oauthNonce = nonce;

// 認可リクエストにnonceを含める
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('nonce', nonce);

// IDトークン検証時にnonceを確認
const idTokenPayload = await verifyIDToken(idToken);
if (idTokenPayload.nonce !== req.session.oauthNonce) {
  throw new Error('nonce不一致: リプレイ攻撃の可能性');
}
```

### 7-3. トークンの安全な保管

```typescript
// ❌ 悪い例: localStorageへのアクセストークン保存（XSSで盗まれる）
localStorage.setItem('access_token', token);

// ✓ 良い例: HttpOnly Cookie（JavaScriptからアクセス不可）
// server-side:
res.cookie('session', encryptedSession, {
  httpOnly: true,     // JavaScriptからアクセス不可
  secure: true,       // HTTPS必須
  sameSite: 'lax',   // CSRF対策
  maxAge: 3600000,    // 1時間
  path: '/',
});

// Next.js App Router での安全なCookie操作
import { cookies } from 'next/headers';

async function setSecureSession(data: object) {
  const cookieStore = await cookies();
  cookieStore.set('session', JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,  // 1時間
  });
}
```

### 7-4. リダイレクトURIの厳格な検証

```typescript
// 認可サーバーへの登録時: 完全一致のURIのみ登録
// ❌ 危険: ワイルドカードや正規表現パターン
// https://example.com/*  ← 攻撃者が任意のパスを指定できる

// ✓ 安全: 完全一致
// https://example.com/auth/callback  ← 固定パスのみ

// アプリケーション側でも必ず検証
const ALLOWED_REDIRECT_URIS = [
  'https://example.com/auth/callback',
  'http://localhost:3000/auth/callback',  // 開発環境のみ
];

function validateRedirectUri(uri: string): boolean {
  return ALLOWED_REDIRECT_URIS.includes(uri);
}
```

### 7-5. スコープの最小権限原則

```typescript
// ❌ 過剰なスコープ要求
scope: 'openid email profile read:everything write:everything'

// ✓ 必要最小限のスコープのみ要求
scope: 'openid email'  // 認証だけが目的なら email と openid のみ

// 追加スコープが必要になった時点でインクリメンタルに要求する
async function requestAdditionalScope(additionalScope: string) {
  // ユーザーに追加権限の理由を説明した上で要求
  await signIn('google', {
    scope: `openid email ${additionalScope}`,
  });
}
```

---

## 8. よくある落とし穴と対策

### 落とし穴 1: アクセストークンをクライアントサイドに保存する

**問題:** XSS攻撃によりトークンが盗まれ、ユーザーのリソースに無制限アクセスされる。

**対策:** アクセストークンはサーバーサイドのセッション（HttpOnly Cookie）に保管し、クライアントには公開しない。クライアントが外部APIを呼ぶ必要がある場合は、Next.js の API Route を経由するプロキシパターンを採用する。

```typescript
// app/api/github/repos/route.ts
import { auth } from '@/auth';

export async function GET() {
  // サーバーサイドでアクセストークンを取得
  const session = await auth();
  if (!session?.accessToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  // クライアントにトークンを渡さずAPIを呼ぶ
  const response = await fetch('https://api.github.com/user/repos', {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  const repos = await response.json();
  return Response.json(repos);
}
```

### 落とし穴 2: IDトークンの署名検証を省略する

**問題:** 攻撃者が偽のIDトークンを送信し、任意のユーザーとしてログインできる。

**対策:** IDトークンは必ず認可サーバーの公開鍵で署名検証してから、クレームを信頼する。ライブラリ（NextAuth.js, jose等）を使えばこの検証は自動で行われる。

### 落とし穴 3: リフレッシュトークンを適切に管理しない

**問題:** リフレッシュトークンが漏洩すると長期間にわたって悪用される。

**対策:**
```typescript
// リフレッシュトークンのローテーション（使用するたびに新しいものを受け取る）
async function rotateRefreshToken(oldRefreshToken: string) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: oldRefreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  const tokens = await response.json();

  // 古いリフレッシュトークンをDBから削除
  await db.invalidateRefreshToken(oldRefreshToken);

  // 新しいリフレッシュトークンをDBに保存
  await db.saveRefreshToken(tokens.refresh_token, userId);

  return tokens;
}
```

### 落とし穴 4: HTTP（非HTTPS）環境での OAuth 使用

**問題:** 通信が傍受され、認可コードやトークンが盗まれる。

**対策:** OAuth 2.0 は本番環境では必ず HTTPS を使用する。開発環境では `http://localhost` のみ例外として認可サーバーに登録する。

### 落とし穴 5: アクセストークンの有効期限を確認しない

```typescript
// ❌ 悪い例: 有効期限を無視してAPIを呼ぶ
async function callAPI(accessToken: string) {
  return fetch('/api/data', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ✓ 良い例: 有効期限を確認し、必要に応じてリフレッシュ
async function callAPIWithRefresh(token: TokenData) {
  const isExpired = Date.now() >= token.expiresAt - 60000; // 1分前に更新

  if (isExpired) {
    token = await refreshAccessToken(token.refreshToken);
    await saveToken(token);  // 新しいトークンを保存
  }

  return fetch('/api/data', {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
}
```

---

## まとめ

本記事で解説した内容を整理します。

| 項目 | ポイント |
|------|--------|
| **OAuth 2.0** | 認可プロトコル。アクセストークンで権限委譲 |
| **認証コードフロー** | サーバーサイドアプリの標準フロー |
| **PKCE** | SPA・モバイル向けの安全な拡張 |
| **OpenID Connect** | OAuth 2.0 の上に構築された認証層。IDトークンを追加 |
| **JWT検証** | 署名・iss・aud・exp・nonce を必ず検証 |
| **NextAuth.js** | Next.js での実装は NextAuth.js を活用 |
| **CSRF対策** | State パラメータを必ず実装 |
| **トークン保管** | HttpOnly Cookie + サーバーサイドセッション |

OAuth 2.0 と OIDC は現代の認証インフラの基盤となっており、正しく実装することがセキュリティの要です。NextAuth.js のようなライブラリを活用しながらも、その背後の仕組みを理解しておくことで、トラブル発生時の対応や、カスタム要件への対応力が格段に向上します。

## 参考リソース

- [OAuth 2.0 仕様（RFC 6749）](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE 仕様（RFC 7636）](https://datatracker.ietf.org/doc/html/rfc7636)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Auth.js（NextAuth.js v5）公式ドキュメント](https://authjs.dev/)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
