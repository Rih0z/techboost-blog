---
title: "OAuth 2.0 / OpenID Connect 実装ガイド — 安全な認証システムの作り方"
description: "OAuth 2.0とOpenID Connectを使った安全な認証・認可システムの実装方法を完全解説。Next.js + NextAuthの実装例やセキュリティベストプラクティスも紹介します。"
pubDate: "2026-02-06"
category: "Security"
tags: ["OAuth", "認証", "セキュリティ", "OpenID Connect", "JWT"]
---

現代のWebアプリケーションにおいて、安全な認証・認可システムの実装は必須要件です。本記事では、業界標準となったOAuth 2.0とOpenID Connectの仕組みから実装まで、セキュリティベストプラクティスを含めて徹底解説します。

## 目次

1. 認証と認可の基礎知識
2. OAuth 2.0の仕組み
3. OpenID Connectとは
4. 各種フローの詳細
5. PKCE（Proof Key for Code Exchange）
6. JWTとトークン管理
7. Next.js + NextAuthでの実装
8. セキュリティベストプラクティス
9. 実践的な実装例

## 1. 認証と認可の基礎知識

### 認証（Authentication）と認可（Authorization）の違い

**認証（Authentication）**
- **What**: 「あなたは誰？」を確認
- **例**: ログイン、パスワード入力、生体認証
- **目的**: ユーザーのアイデンティティを証明

**認可（Authorization）**
- **What**: 「何ができる？」を決定
- **例**: アクセス権限、スコープ、ロール
- **目的**: リソースへのアクセス制御

```
認証 → 「田中太郎さんですね」
認可 → 「管理者権限があるので全ての操作が可能です」
```

### なぜOAuthが必要なのか

**従来の問題点**

```
ユーザー → パスワードを第三者アプリに渡す
         ↓
第三者アプリがパスワードを保存
         ↓
セキュリティリスク大
```

**OAuthの解決策**

```
ユーザー → 認証サーバーでログイン
         ↓
アクセストークンを発行
         ↓
第三者アプリはトークンでAPI呼び出し
（パスワード不要）
```

## 2. OAuth 2.0の仕組み

### 主要な登場人物（4つのロール）

1. **Resource Owner（リソースオーナー）**
   - エンドユーザー
   - リソースの所有者

2. **Client（クライアント）**
   - アプリケーション
   - リソースにアクセスしたい

3. **Authorization Server（認可サーバー）**
   - トークンを発行
   - 例: Google, GitHub, Auth0

4. **Resource Server（リソースサーバー）**
   - 保護されたリソースを提供
   - 例: Google Drive API, GitHub API

### OAuth 2.0の基本フロー

```
+----------+                                   +---------------+
|          |--(A)- Authorization Request ----->|   Resource    |
|          |                                   |     Owner     |
|          |<-(B)-- Authorization Grant -------|               |
|          |                                   +---------------+
|          |
|          |                                   +---------------+
|          |--(C)-- Authorization Grant ------>| Authorization |
| Client   |                                   |     Server    |
|          |<-(D)----- Access Token -----------|               |
|          |                                   +---------------+
|          |
|          |                                   +---------------+
|          |--(E)----- Access Token ---------->|   Resource    |
|          |                                   |     Server    |
|          |<-(F)--- Protected Resource -------|               |
+----------+                                   +---------------+
```

### 主要なグラントタイプ

**1. Authorization Code Grant（推奨）**

```
User → 認可サーバーにリダイレクト
     → ログイン・同意
     → コールバックURL + 認可コード
     → クライアントが認可コードをトークンに交換
```

**使用例**
```
https://auth.example.com/authorize?
  response_type=code&
  client_id=abc123&
  redirect_uri=https://myapp.com/callback&
  scope=read:user&
  state=xyz789
```

**2. Implicit Grant（非推奨）**

```
User → 認可サーバーにリダイレクト
     → 直接トークンを返す（危険）
```

**3. Resource Owner Password Credentials（レガシー）**

```
ユーザー名とパスワードを直接送信
→ トークン取得
```

**4. Client Credentials**

```
サーバー間通信用
→ クライアントID + シークレットでトークン取得
```

## 3. OpenID Connectとは

### OAuth 2.0との違い

**OAuth 2.0**
- 認可フレームワーク
- 「何ができるか」を制御

**OpenID Connect (OIDC)**
- OAuth 2.0の上に構築された認証レイヤー
- 「誰か」を特定

### OpenID Connectの追加要素

**1. ID Token**

```json
{
  "iss": "https://auth.example.com",
  "sub": "user123",
  "aud": "client_id_abc",
  "exp": 1735689600,
  "iat": 1735686000,
  "name": "田中太郎",
  "email": "tanaka@example.com",
  "email_verified": true,
  "picture": "https://example.com/photo.jpg"
}
```

**2. UserInfo Endpoint**

```
GET /userinfo
Authorization: Bearer ACCESS_TOKEN

Response:
{
  "sub": "user123",
  "name": "田中太郎",
  "email": "tanaka@example.com",
  "email_verified": true
}
```

### OpenID Connectのフロー

```
Client → /authorize（認証リクエスト）
       → User ログイン
       → Callback + 認可コード
       → /token（トークンエンドポイント）
       ← ID Token + Access Token
       → /userinfo（ユーザー情報取得）
       ← ユーザー情報
```

## 4. 各種フローの詳細

### Authorization Code Flow（標準フロー）

**Step 1: 認可リクエスト**

```http
GET /authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  scope=openid profile email&
  state=RANDOM_STRING&
  nonce=RANDOM_NONCE
```

**パラメータ解説**
- `response_type=code`: 認可コードフロー
- `client_id`: アプリの識別子
- `redirect_uri`: コールバックURL
- `scope`: 要求する権限
- `state`: CSRF対策用のランダム文字列
- `nonce`: リプレイ攻撃対策

**Step 2: ユーザー認証と同意**

ユーザーがログインして権限に同意すると、認可サーバーがコールバックURLにリダイレクト。

```
https://yourapp.com/callback?
  code=AUTH_CODE&
  state=RANDOM_STRING
```

**Step 3: トークン交換**

```http
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=https://yourapp.com/callback&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET
```

**Step 4: トークン取得**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh_token_here",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email"
}
```

### Implicit Flow（SPA向け、非推奨）

```http
GET /authorize?
  response_type=id_token token&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  scope=openid profile&
  state=RANDOM_STRING&
  nonce=RANDOM_NONCE
```

**問題点**
- トークンがURLフラグメントに含まれる
- ブラウザ履歴に残る可能性
- XSS脆弱性のリスク

**推奨**: 代わりにPKCEを使用

### Hybrid Flow

```http
GET /authorize?
  response_type=code id_token&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  scope=openid profile&
  state=RANDOM_STRING&
  nonce=RANDOM_NONCE
```

認可コードとID Tokenの両方を返す。

## 5. PKCE（Proof Key for Code Exchange）

### PKCEとは

Authorization Code Flowの拡張で、クライアントシークレットを使わずに安全性を確保。

**使用例**
- SPAアプリケーション
- モバイルアプリ
- パブリッククライアント

### PKCEのフロー

**Step 1: Code Verifierの生成**

```javascript
// ランダムな43-128文字の文字列
const codeVerifier = generateRandomString(128);
// 例: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
```

**Step 2: Code Challengeの生成**

```javascript
import crypto from 'crypto';

function generateCodeChallenge(codeVerifier) {
  return crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const codeChallenge = generateCodeChallenge(codeVerifier);
```

**Step 3: 認可リクエスト**

```http
GET /authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  scope=openid profile&
  state=RANDOM_STRING&
  code_challenge=CODE_CHALLENGE&
  code_challenge_method=S256
```

**Step 4: トークン交換（Code Verifierを送信）**

```http
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=https://yourapp.com/callback&
client_id=YOUR_CLIENT_ID&
code_verifier=CODE_VERIFIER
```

認可サーバーがCode VerifierからCode Challengeを再計算して検証。

### PKCE実装例（JavaScript）

```javascript
// pkce.js
import crypto from 'crypto';

export function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

export function generateCodeChallenge(verifier) {
  return base64URLEncode(
    crypto.createHash('sha256').update(verifier).digest()
  );
}

function base64URLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// 使用例
const verifier = generateCodeVerifier();
const challenge = generateCodeChallenge(verifier);

// verifierはセッションに保存
sessionStorage.setItem('code_verifier', verifier);

// challengeを認可リクエストに含める
const authUrl = `https://auth.example.com/authorize?` +
  `response_type=code&` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${REDIRECT_URI}&` +
  `scope=openid profile&` +
  `code_challenge=${challenge}&` +
  `code_challenge_method=S256&` +
  `state=${state}`;
```

## 6. JWTとトークン管理

### JWTの構造

JWT（JSON Web Token）は3つの部分で構成されます。

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Header.Payload.Signature
```

**Header（ヘッダー）**

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id-1"
}
```

**Payload（ペイロード）**

```json
{
  "iss": "https://auth.example.com",
  "sub": "user123",
  "aud": "client_id_abc",
  "exp": 1735689600,
  "iat": 1735686000,
  "name": "田中太郎",
  "email": "tanaka@example.com",
  "scope": "openid profile email"
}
```

**Signature（署名）**

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

### JWTの検証

```javascript
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// ID Tokenの検証
jwt.verify(idToken, getKey, {
  audience: 'YOUR_CLIENT_ID',
  issuer: 'https://auth.example.com',
  algorithms: ['RS256']
}, (err, decoded) => {
  if (err) {
    console.error('Invalid token:', err);
  } else {
    console.log('Valid token:', decoded);
  }
});
```

### トークンの種類と用途

**1. Access Token（アクセストークン）**

- **用途**: APIへのアクセス
- **有効期限**: 短い（15分〜1時間）
- **保存場所**: メモリ、セッションストレージ
- **形式**: JWT or Opaque Token

```javascript
// API呼び出し例
fetch('https://api.example.com/user/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

**2. Refresh Token（リフレッシュトークン）**

- **用途**: Access Tokenの再発行
- **有効期限**: 長い（7日〜30日）
- **保存場所**: HttpOnly Cookie（推奨）
- **形式**: Opaque Token

```javascript
// Refresh Token を使った更新
async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'YOUR_CLIENT_ID'
    })
  });

  const data = await response.json();
  return data.access_token;
}
```

**3. ID Token（IDトークン）**

- **用途**: ユーザー認証情報
- **有効期限**: 短い（1時間程度）
- **保存場所**: セッション
- **形式**: JWT

### トークンのセキュアな保存

**ブラウザでの保存方法**

| 保存場所 | Access Token | Refresh Token | ID Token |
|---------|-------------|---------------|----------|
| localStorage | ❌ XSSリスク | ❌ 絶対NG | ❌ |
| sessionStorage | △ 許容範囲 | ❌ | △ |
| Memory | ✅ 推奨 | ❌ | ✅ |
| HttpOnly Cookie | ✅ 最適 | ✅ 推奨 | ✅ |

**推奨実装**

```javascript
// Access Token: メモリに保存
let accessToken = null;

async function login() {
  const response = await fetch('/api/auth/login');
  const data = await response.json();

  // メモリに保存
  accessToken = data.access_token;

  // Refresh Tokenは HttpOnly Cookie でサーバーが設定
}

// API呼び出し
async function callAPI() {
  let response = await fetch('/api/data', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  // トークン期限切れの場合
  if (response.status === 401) {
    accessToken = await refreshAccessToken();
    response = await fetch('/api/data', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
  }

  return response.json();
}
```

## 7. Next.js + NextAuthでの実装

### NextAuth.js のセットアップ

```bash
npm install next-auth
```

### 基本設定

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!
    })
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      // 初回ログイン時
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at! * 1000;
      }

      // Access Token が有効
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access Token を更新
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30日
  },

  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// Refresh Token 処理
async function refreshAccessToken(token: any) {
  try {
    const url = 'https://oauth2.googleapis.com/token';

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken
      })
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken
    };
  } catch (error) {
    return {
      ...token,
      error: 'RefreshAccessTokenError'
    };
  }
}
```

### 環境変数設定

```bash
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
```

### クライアントコンポーネントでの使用

```typescript
// app/components/LoginButton.tsx
'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (session) {
    return (
      <div>
        <p>Welcome, {session.user?.name}</p>
        <button onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => signIn('google')}>Sign in with Google</button>
      <button onClick={() => signIn('github')}>Sign in with GitHub</button>
    </div>
  );
}
```

### サーバーコンポーネントでの使用

```typescript
// app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {session.user?.name}</p>
    </div>
  );
}
```

### API Route の保護

```typescript
// app/api/protected/route.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // API処理
  return NextResponse.json({
    message: 'Protected data',
    user: session.user
  });
}
```

### ミドルウェアでの認証チェック

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      // /admin パスは管理者のみ
      if (req.nextUrl.pathname.startsWith('/admin')) {
        return token?.role === 'admin';
      }

      // その他の保護されたパスは認証済みであればOK
      return !!token;
    }
  }
});

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/api/protected/:path*']
};
```

## 8. セキュリティベストプラクティス

### 1. State パラメータによるCSRF対策

```javascript
// 認可リクエスト前に state を生成
const state = crypto.randomBytes(16).toString('hex');
sessionStorage.setItem('oauth_state', state);

const authUrl = `https://auth.example.com/authorize?` +
  `response_type=code&` +
  `client_id=${CLIENT_ID}&` +
  `state=${state}`;

// コールバック時に検証
const urlParams = new URLSearchParams(window.location.search);
const returnedState = urlParams.get('state');
const savedState = sessionStorage.getItem('oauth_state');

if (returnedState !== savedState) {
  throw new Error('State mismatch - possible CSRF attack');
}
```

### 2. Nonce によるリプレイ攻撃対策

```javascript
// 認可リクエスト前に nonce を生成
const nonce = crypto.randomBytes(16).toString('hex');
sessionStorage.setItem('oauth_nonce', nonce);

// ID Token 検証時に nonce をチェック
const decodedToken = jwt.decode(idToken);
const savedNonce = sessionStorage.getItem('oauth_nonce');

if (decodedToken.nonce !== savedNonce) {
  throw new Error('Nonce mismatch - possible replay attack');
}
```

### 3. リダイレクトURIの厳格な検証

```javascript
// サーバー側での検証
const ALLOWED_REDIRECT_URIS = [
  'https://yourapp.com/callback',
  'https://yourapp.com/auth/callback'
];

function validateRedirectUri(uri) {
  return ALLOWED_REDIRECT_URIS.includes(uri);
}

// 認可リクエスト処理
if (!validateRedirectUri(redirect_uri)) {
  throw new Error('Invalid redirect URI');
}
```

### 4. トークンの適切な検証

```javascript
import jwt from 'jsonwebtoken';

function validateIdToken(idToken, clientId, issuer) {
  try {
    const decoded = jwt.verify(idToken, getPublicKey(), {
      audience: clientId,
      issuer: issuer,
      algorithms: ['RS256']
    });

    // 追加のチェック
    if (decoded.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    if (decoded.iat > Date.now() / 1000) {
      throw new Error('Token issued in the future');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid ID token');
  }
}
```

### 5. HTTPSの強制

```javascript
// Next.js middleware
export function middleware(request) {
  // 本番環境でHTTPSを強制
  if (process.env.NODE_ENV === 'production' &&
      request.headers.get('x-forwarded-proto') !== 'https') {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
      301
    );
  }
}
```

### 6. Refresh Token のローテーション

```javascript
// Refresh Token 使用時に新しい Refresh Token を発行
async function refreshTokens(refreshToken) {
  const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID
    })
  });

  const tokens = await response.json();

  // 古い Refresh Token を無効化し、新しいものを使用
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token, // 新しいリフレッシュトークン
    expiresIn: tokens.expires_in
  };
}
```

### 7. Scope の最小権限原則

```javascript
// 必要最小限の scope のみリクエスト
const authUrl = `https://auth.example.com/authorize?` +
  `response_type=code&` +
  `client_id=${CLIENT_ID}&` +
  `scope=openid profile email&` + // read:all ではなく必要なものだけ
  `state=${state}`;
```

### 8. トークンの安全な保存

```javascript
// ❌ 悪い例
localStorage.setItem('access_token', accessToken);

// ✅ 良い例: HttpOnly Cookie
// サーバー側
res.setHeader('Set-Cookie', [
  `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`
]);

// クライアント側: メモリに保存
let accessToken = null;

function setAccessToken(token) {
  accessToken = token;
}

function getAccessToken() {
  return accessToken;
}
```

## 9. 実践的な実装例

### カスタムOAuthプロバイダーの実装

```typescript
// lib/oauth-provider.ts
import { OAuthConfig, OAuthUserConfig } from 'next-auth/providers';

interface CustomProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

export default function CustomProvider<P extends CustomProfile>(
  options: OAuthUserConfig<P>
): OAuthConfig<P> {
  return {
    id: 'custom',
    name: 'Custom OAuth Provider',
    type: 'oauth',
    authorization: {
      url: 'https://auth.custom.com/authorize',
      params: {
        scope: 'openid profile email'
      }
    },
    token: 'https://auth.custom.com/token',
    userinfo: 'https://auth.custom.com/userinfo',
    profile(profile) {
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        image: profile.avatar
      };
    },
    ...options
  };
}
```

### マルチテナント対応

```typescript
// app/api/auth/[...nextauth]/route.ts
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // テナントの検証
      const email = user.email;
      const domain = email?.split('@')[1];

      const tenant = await db.tenant.findUnique({
        where: { domain }
      });

      if (!tenant) {
        return false; // ログイン拒否
      }

      // ユーザー情報にテナントIDを追加
      user.tenantId = tenant.id;
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.tenantId = token.tenantId;
      return session;
    }
  }
};
```

### ロールベースアクセス制御（RBAC）

```typescript
// lib/rbac.ts
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin'
}

export enum Permission {
  READ_USERS = 'read:users',
  WRITE_USERS = 'write:users',
  DELETE_USERS = 'delete:users',
  MANAGE_SETTINGS = 'manage:settings'
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.USER]: [Permission.READ_USERS],
  [Role.ADMIN]: [
    Permission.READ_USERS,
    Permission.WRITE_USERS,
    Permission.MANAGE_SETTINGS
  ],
  [Role.SUPERADMIN]: [
    Permission.READ_USERS,
    Permission.WRITE_USERS,
    Permission.DELETE_USERS,
    Permission.MANAGE_SETTINGS
  ]
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// app/api/users/route.ts
import { getServerSession } from 'next-auth';
import { hasPermission, Role, Permission } from '@/lib/rbac';

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.user.role as Role, Permission.DELETE_USERS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ユーザー削除処理
  // ...
}
```

### ソーシャルログインの統合

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import FacebookProvider from 'next-auth/providers/facebook';
import TwitterProvider from 'next-auth/providers/twitter';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID!,
      clientSecret: process.env.FACEBOOK_SECRET!
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_ID!,
      clientSecret: process.env.TWITTER_SECRET!,
      version: '2.0'
    })
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // アカウント連携の処理
      const existingUser = await db.user.findUnique({
        where: { email: user.email }
      });

      if (existingUser) {
        // 既存ユーザーにアカウント連携
        await db.account.create({
          data: {
            userId: existingUser.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            accessToken: account.access_token,
            refreshToken: account.refresh_token
          }
        });
      } else {
        // 新規ユーザー作成
        await db.user.create({
          data: {
            email: user.email,
            name: user.name,
            image: user.image,
            accounts: {
              create: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                accessToken: account.access_token,
                refreshToken: account.refresh_token
              }
            }
          }
        });
      }

      return true;
    }
  }
};
```

## まとめ

OAuth 2.0 / OpenID Connectを使った認証・認可システムの実装では、以下のポイントを押さえましょう。

**重要なポイント**

1. **適切なフローの選択**
   - SPA/モバイル: Authorization Code + PKCE
   - サーバーサイド: Authorization Code
   - サーバー間: Client Credentials

2. **セキュリティ対策**
   - PKCE の使用
   - State と Nonce の検証
   - HTTPS の強制
   - トークンの適切な保存

3. **トークン管理**
   - Access Token: 短い有効期限
   - Refresh Token: HttpOnly Cookie
   - 定期的なローテーション

4. **NextAuth.js の活用**
   - 簡単なセットアップ
   - 多様なプロバイダー対応
   - セキュアなデフォルト設定

OAuth 2.0とOpenID Connectを正しく実装することで、安全で使いやすい認証システムを構築できます。本記事のベストプラクティスを参考に、セキュアなアプリケーションを開発してください。

## 参考リンク

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [JWT.io](https://jwt.io/)
