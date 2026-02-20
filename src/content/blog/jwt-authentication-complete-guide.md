---
title: 'JWT認証の仕組みと実装ガイド — セキュアなWebアプリ認証を構築する'
description: 'JWTの構造と仕組みを徹底解説。Node.js/Next.jsでのJWT認証実装、リフレッシュトークン戦略、セキュリティベストプラクティス、よくある脆弱性と対策まで網羅した完全ガイド。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['JWT', '認証', 'セキュリティ', 'Node.js', 'Next.js']
---

現代のWebアプリケーションにおいて、認証（Authentication）はセキュリティの根幹をなす仕組みだ。セッションベースの認証が長年使われてきたが、RESTful API・マイクロサービス・SPAが普及した現在、**JWT（JSON Web Token）**が事実上の標準として広く採用されている。

この記事では、JWTの構造と署名アルゴリズムの原理から始まり、Node.js/TypeScriptでの実装、Next.js App Routerとの統合、リフレッシュトークン戦略、そして現場で実際に発生する脆弱性と対策まで、体系的に解説する。

---

## 1. JWTとは何か

JWT（JSON Web Token）は [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519) で定義された、**クレーム（claims）をJSONオブジェクトとして安全に転送するためのコンパクトなトークン形式**だ。

従来のセッション認証との最大の違いは、**サーバー側にセッション情報を保持しない**点にある。JWTはトークン自体に必要な情報を内包しており、サーバーは受け取ったトークンの署名を検証するだけでユーザーを識別できる。

### セッション認証との比較

| 項目 | セッション認証 | JWT認証 |
|------|--------------|---------|
| 状態管理 | サーバー側（DB/Redis） | クライアント側（トークン内） |
| スケーラビリティ | セッションストア共有が必要 | ステートレスで水平スケール可能 |
| 無効化 | セッション削除で即時無効化 | 有効期限まで有効（要対策） |
| マイクロサービス連携 | セッションストア共有が必要 | トークン検証のみで連携可能 |

JWTはスケーラビリティに優れる一方で、**トークンの即時無効化が難しい**というトレードオフがある。このトレードオフを理解した上で適切に実装することが重要だ。

---

## 2. JWTの構造

JWTは3つのパートをピリオド（`.`）で連結した文字列だ。

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiLlsbHnlLDoqIgiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMzYwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### 2-1. Header（ヘッダー）

トークンのタイプと署名アルゴリズムを示す。

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

- `alg`: 署名アルゴリズム（HS256、RS256、ES256など）
- `typ`: トークンタイプ（常に`"JWT"`）
- `kid`: 鍵識別子（複数の鍵を使い回す場合に重要）

### 2-2. Payload（ペイロード）

クレーム（ユーザー情報や権限など）を格納するJSONオブジェクトだ。

```json
{
  "sub": "user_123",
  "name": "田中太郎",
  "email": "tanaka@example.com",
  "role": "admin",
  "iat": 1700000000,
  "exp": 1700003600,
  "iss": "https://api.example.com",
  "aud": "https://app.example.com"
}
```

クレームには3種類ある。

**登録済みクレーム（Registered Claims）**
- `sub`: Subject（ユーザーID）
- `iss`: Issuer（発行者）
- `aud`: Audience（対象者）
- `exp`: Expiration Time（有効期限、Unix timestamp）
- `iat`: Issued At（発行時刻）
- `nbf`: Not Before（この時刻以前は無効）
- `jti`: JWT ID（トークンの一意識別子）

**パブリッククレーム（Public Claims）**: [IANA JWT Claims Registry](https://www.iana.org/assignments/jwt/jwt.xhtml) に登録された標準クレーム

**プライベートクレーム（Private Claims）**: アプリケーション固有のクレーム（`role`、`permissions`など）

> **注意**: ペイロードは Base64URL エンコードされているだけで**暗号化はされていない**。機密情報（パスワード、クレジットカード番号など）を含めてはならない。

### 2-3. Signature（署名）

Header と Payload を Base64URL エンコードして連結し、秘密鍵で署名したものだ。

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

署名によって、**トークンが改ざんされていないこと**および**正規の発行者から発行されたこと**を検証できる。

---

## 3. Base64URLエンコードの仕組み

JWTで使われる Base64URL は、通常の Base64 をURL安全な形式に変換したものだ。

- `+` → `-`
- `/` → `_`
- 末尾の `=`（パディング）を除去

```typescript
// Base64URL エンコード（参考実装）
function base64UrlEncode(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Base64URL デコード
function base64UrlDecode(encoded: string): string {
  // パディングを補完
  const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}
```

---

## 4. HS256 vs RS256 — 署名アルゴリズムの違い

### HS256（HMAC-SHA256）

**対称鍵アルゴリズム**。署名と検証に**同じ秘密鍵**を使用する。

```
署名: HMAC-SHA256(header.payload, secretKey)
検証: HMAC-SHA256(header.payload, secretKey) === signature
```

- **長所**: シンプル、高速、実装が容易
- **短所**: 検証サービスにも秘密鍵を共有する必要がある
- **用途**: 単一サービス、バックエンドが一箇所に集中している構成

### RS256（RSA-SHA256）

**非対称鍵アルゴリズム**。署名に**秘密鍵（private key）**、検証に**公開鍵（public key）**を使用する。

```
署名: RSA-SHA256(header.payload, privateKey)
検証: RSA-SHA256_verify(header.payload, signature, publicKey)
```

- **長所**: 公開鍵のみ配布すれば良い。秘密鍵を共有せずに複数サービスで検証可能
- **短所**: HS256より低速、鍵管理が複雑
- **用途**: マイクロサービス、外部APIとの連携、Auth0などのIdP連携

### ES256（ECDSA-SHA256）

RS256 の楕円曲線暗号版。RS256 と同等のセキュリティをより短い鍵長で実現する。鍵のサイズが重要な場合（モバイル環境など）に有利だ。

**本番環境の推奨**: マイクロサービス構成では RS256 または ES256 を使用し、秘密鍵を認証サービスのみに限定する。

---

## 5. Node.js/TypeScriptでのJWT実装

### 5-1. セットアップ

```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

### 5-2. 基本実装

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '15m'; // アクセストークンは短め

interface TokenPayload {
  sub: string;
  email: string;
  role: 'user' | 'admin';
}

// アクセストークン発行
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,   // 'https://api.example.com'
    audience: process.env.JWT_AUDIENCE, // 'https://app.example.com'
    algorithm: 'HS256',
  });
}

// トークン検証
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      algorithms: ['HS256'], // 明示的にアルゴリズムを指定（後述の脆弱性対策）
    });
    return decoded as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('INVALID_TOKEN');
    }
    throw error;
  }
}
```

### 5-3. RS256での実装

```typescript
import fs from 'fs';
import jwt from 'jsonwebtoken';

const privateKey = fs.readFileSync('./keys/private.pem');
const publicKey = fs.readFileSync('./keys/public.pem');

// RS256でトークン発行
export function generateTokenRS256(payload: TokenPayload): string {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '15m',
    keyid: 'key-2024-01', // kid を指定
    issuer: 'https://auth.example.com',
    audience: 'https://api.example.com',
  });
}

// 公開鍵でトークン検証
export function verifyTokenRS256(token: string): TokenPayload {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'https://auth.example.com',
    audience: 'https://api.example.com',
  });
  return decoded as TokenPayload;
}
```

---

## 6. Next.js App RouterでのJWT認証フロー

### 6-1. 認証フロー全体像

```
1. クライアント → POST /api/auth/login（メール・パスワード）
2. サーバー → パスワード検証 → JWTトークン発行
3. サーバー → アクセストークン（JSON） + リフレッシュトークン（HttpOnly Cookie）
4. クライアント → API呼び出し時に Authorization: Bearer <accessToken>
5. サーバー → トークン検証 → レスポンス返却
```

### 6-2. ログインAPI（Route Handler）

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt';
import { verifyPassword } from '@/lib/auth';
import { getUserByEmail } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  // 入力値検証
  if (!email || !password) {
    return NextResponse.json(
      { error: 'メールアドレスとパスワードは必須です' },
      { status: 400 }
    );
  }

  // ユーザー取得・パスワード検証
  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    // 存在するかどうかを隠すため同一エラーメッセージを返す
    return NextResponse.json(
      { error: '認証情報が正しくありません' },
      { status: 401 }
    );
  }

  const payload = { sub: user.id, email: user.email, role: user.role };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // リフレッシュトークンをDBに保存（無効化のため）
  await saveRefreshToken(user.id, refreshToken);

  // レスポンス構築
  const response = NextResponse.json({ accessToken });

  // リフレッシュトークンはHttpOnly Cookieに設定
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30日
    path: '/api/auth',
  });

  return response;
}
```

### 6-3. 認証ミドルウェア

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/jwt';

const PROTECTED_PATHS = ['/dashboard', '/api/user', '/api/data'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 保護されたパスかどうか確認
  const isProtected = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Authorization ヘッダーからトークン取得
  const authorization = request.headers.get('Authorization');
  const token = authorization?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const payload = verifyAccessToken(token);

    // 検証済みユーザー情報をヘッダーに付与してルートハンドラに渡す
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub);
    requestHeaders.set('x-user-role', payload.role);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    return NextResponse.json(
      { error: 'トークンが無効または期限切れです' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/user/:path*', '/api/data/:path*'],
};
```

---

## 7. アクセストークン + リフレッシュトークン戦略

短命なアクセストークンと長命なリフレッシュトークンを組み合わせることで、セキュリティと利便性を両立する。

```
アクセストークン: 有効期限 15分（短命・メモリに保持）
リフレッシュトークン: 有効期限 30日（長命・HttpOnly Cookieに保持）
```

### 7-1. リフレッシュトークン実装

```typescript
// lib/jwt.ts
import jwt from 'jsonwebtoken';

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    { sub: payload.sub, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: '30d', algorithm: 'HS256' }
  );
}

// app/api/auth/refresh/route.ts
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'リフレッシュトークンがありません' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET, {
      algorithms: ['HS256'],
    }) as { sub: string; type: string };

    // type クレームで用途を確認
    if (decoded.type !== 'refresh') {
      throw new Error('INVALID_TOKEN_TYPE');
    }

    // DBでリフレッシュトークンの有効性を確認（ローテーション攻撃対策）
    const isValid = await validateRefreshTokenInDB(decoded.sub, refreshToken);
    if (!isValid) {
      // 盗難の可能性があるため全セッションを無効化
      await revokeAllSessionsForUser(decoded.sub);
      return NextResponse.json({ error: 'トークンが無効です' }, { status: 401 });
    }

    const user = await getUserById(decoded.sub);
    const newAccessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // リフレッシュトークンをローテーション（再利用防止）
    const newRefreshToken = generateRefreshToken({ sub: user.id, email: user.email, role: user.role });
    await rotateRefreshToken(user.id, refreshToken, newRefreshToken);

    const response = NextResponse.json({ accessToken: newAccessToken });
    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/api/auth',
    });

    return response;
  } catch {
    return NextResponse.json({ error: '再認証が必要です' }, { status: 401 });
  }
}
```

### 7-2. クライアント側のトークン管理

```typescript
// lib/api-client.ts
let accessToken: string | null = null;

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // アクセストークンがなければ、メモリから取得するか、
  // 初回ロード時にリフレッシュエンドポイントで取得
  if (!accessToken) {
    accessToken = await refreshAccessToken();
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // 401が返ってきたらトークンをリフレッシュして再試行
  if (response.status === 401) {
    accessToken = await refreshAccessToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  return response;
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    // リフレッシュ失敗→ログインページへリダイレクト
    window.location.href = '/login';
    throw new Error('認証セッションが切れました');
  }
  const data = await res.json();
  return data.accessToken;
}
```

---

## 8. JWTの保存場所とリスク

### localStorage

- **XSS脆弱性リスク**: JavaScriptから直接アクセス可能なため、XSS攻撃でトークンが窃取される
- **使用を避けるべき**: 特に長命なトークンをlocalStorageに保存することは危険

### sessionStorage

- localStorageよりは限定的だが、XSSリスクは同様に存在する

### メモリ（JavaScriptの変数）

- XSS攻撃に対して相対的に安全（ページリロードで消える）
- **アクセストークンの推奨保存場所**
- ページリロード時はリフレッシュトークンから再取得する

### HttpOnly Cookie

- JavaScriptからアクセス不可能なためXSS攻撃に対して安全
- CSRF攻撃のリスクがあるため `SameSite=Lax` または `SameSite=Strict` を設定
- **リフレッシュトークンの推奨保存場所**

### 推奨構成

| トークン | 保存場所 | 理由 |
|---------|---------|------|
| アクセストークン | メモリ（JS変数） | 短命なのでリロード時の再取得コストが低い。XSS耐性 |
| リフレッシュトークン | HttpOnly Cookie | JS非アクセス。長命なトークンはXSSリスクから保護 |

---

## 9. セキュリティベストプラクティス

### 9-1. 有効期限（exp）の設定

アクセストークンは**15分以下**が推奨だ。有効期限を短くすることで、トークンが盗まれても被害を最小化できる。

```typescript
jwt.sign(payload, secret, { expiresIn: '15m' }); // 15分
```

### 9-2. iss/aud クレームの検証

発行者と対象者を検証することで、**異なるサービス向けのトークンの流用**を防止できる。

```typescript
jwt.verify(token, secret, {
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});
```

### 9-3. kid（Key ID）の活用

複数の鍵を運用する場合や鍵ローテーション時に、どの鍵で署名されたかを識別する。

```typescript
// 署名時に kid を付与
jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  keyid: 'key-v2-2024',
});

// 検証時に kid を読み取って対応する公開鍵を選択
function getPublicKeyByKid(kid: string): string {
  const keys: Record<string, string> = {
    'key-v1-2023': publicKeyV1,
    'key-v2-2024': publicKeyV2,
  };
  if (!keys[kid]) throw new Error('Unknown key ID');
  return keys[kid];
}
```

### 9-4. JTI（JWT ID）によるトークン無効化

ブラックリスト方式で特定のトークンを即時無効化できる。ログアウト時などに有効だ。

```typescript
import { v4 as uuidv4 } from 'uuid';
import redis from '@/lib/redis';

// 発行時に jti を付与
jwt.sign({ ...payload, jti: uuidv4() }, secret, { expiresIn: '15m' });

// 検証時に jti をチェック
async function verifyWithBlacklist(token: string) {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
  const isRevoked = await redis.get(`jwt:revoked:${decoded.jti}`);
  if (isRevoked) throw new Error('TOKEN_REVOKED');
  return decoded;
}

// ログアウト時にブラックリストに追加
async function revokeToken(token: string) {
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  const ttl = (decoded.exp! - Math.floor(Date.now() / 1000));
  if (ttl > 0) {
    await redis.setex(`jwt:revoked:${decoded.jti}`, ttl, '1');
  }
}
```

---

## 10. よくある脆弱性と対策

### 10-1. alg:none 攻撃

**攻撃**: ヘッダーの `alg` を `"none"` に書き換えてSignatureを空にしたトークンを送り込む。古いライブラリは署名なしのトークンを有効として受け入れてしまう。

```json
// 攻撃者が生成するトークン
{
  "alg": "none",
  "typ": "JWT"
}
```

**対策**: `algorithms` オプションで許可するアルゴリズムを明示的に指定する。

```typescript
// 悪い例（デフォルトでnoneを受け入れる可能性）
jwt.verify(token, secret);

// 良い例（HS256のみ許可）
jwt.verify(token, secret, { algorithms: ['HS256'] });
```

### 10-2. アルゴリズム混乱攻撃（Algorithm Confusion Attack）

**攻撃**: RS256で署名されることを期待するサーバーに対して、HS256で署名したトークンを送り込む。サーバーがアルゴリズムをトークン任せにしている場合、公開鍵を秘密鍵として使ってHMAC検証してしまう。

**対策**: 同様に `algorithms` を明示的に指定し、サーバー側でアルゴリズムを強制する。

```typescript
// 検証側では常にアルゴリズムを明示
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

### 10-3. ペイロード改ざん

**攻撃**: `role: "user"` を `role: "admin"` に書き換えてトークンを再送する。

**対策**: 署名の検証が正しく行われていれば、改ざんされたトークンは検証に失敗する。署名の検証を省略したり、`jwt.decode()`（署名未検証）を認証に使用してはならない。

```typescript
// 絶対にやってはいけない
const payload = jwt.decode(token); // 署名未検証
if (payload.role === 'admin') { /* ... */ }

// 正しい
const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
if (payload.role === 'admin') { /* ... */ }
```

### 10-4. 弱い秘密鍵

**攻撃**: 短い・予測可能な秘密鍵はブルートフォース攻撃で破られる可能性がある。

**対策**: 暗号論的に安全な乱数で生成した256ビット以上の秘密鍵を使用する。

```bash
# 安全な秘密鍵の生成
openssl rand -hex 64
# または
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 10-5. リプレイ攻撃

**攻撃**: 有効なJWTをキャプチャして、別のコンテキストで再利用する。

**対策**: `jti`（JWT ID）と短い有効期限の組み合わせ、そしてリクエスト単位の`nonce`の使用が有効だ。

---

## 11. JWTのデバッグ方法

### デコードして内容を確認する

開発中にJWTの中身を確認したい場面は多い。ターミナルで簡単に確認する方法：

```bash
# Base64URLデコードでペイロードを確認（macOS/Linux）
echo "eyJzdWIiOiJ1c2VyXzEyMyJ9" | base64 -d
```

### Node.jsでのデコード

```typescript
import jwt from 'jsonwebtoken';

// 署名検証なしでデコード（デバッグ用途のみ）
const decoded = jwt.decode(token, { complete: true });
console.log('Header:', decoded?.header);
console.log('Payload:', decoded?.payload);

// 有効期限の確認
const payload = decoded?.payload as jwt.JwtPayload;
const expiresAt = new Date(payload.exp! * 1000);
console.log('有効期限:', expiresAt.toLocaleString('ja-JP'));
```

### トークン検証スクリプト

```typescript
// scripts/verify-jwt.ts
import jwt from 'jsonwebtoken';

const token = process.argv[2];
const secret = process.env.JWT_SECRET!;

if (!token) {
  console.error('使用方法: ts-node verify-jwt.ts <token>');
  process.exit(1);
}

try {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  console.log('検証成功:', JSON.stringify(decoded, null, 2));
} catch (error) {
  if (error instanceof jwt.TokenExpiredError) {
    console.error('エラー: トークンの有効期限切れ');
    const payload = jwt.decode(token) as jwt.JwtPayload;
    console.error('期限切れ時刻:', new Date(payload.exp! * 1000).toLocaleString('ja-JP'));
  } else {
    console.error('エラー:', (error as Error).message);
  }
}
```

JWTの内容確認やデバッグには[DevToolBoxのJWTデコーダー](https://usedevtools.com/jwt-decoder)が便利だ。ヘッダー・ペイロードを即座に解析できる。ブラウザ上で完結するため、ログイン済みのトークンをターミナルにコピペするリスクなく安全に確認できる。

---

## まとめ

JWTは正しく実装すれば強力な認証メカニズムだが、多くの落とし穴が存在する。本記事のポイントをまとめると：

| チェック項目 | 推奨 |
|------------|------|
| アルゴリズム明示 | `algorithms: ['HS256']` を必ず指定 |
| アクセストークン有効期限 | 15分以下 |
| iss/aud 検証 | 必ず検証する |
| 保存場所 | アクセストークン→メモリ、リフレッシュ→HttpOnly Cookie |
| 秘密鍵強度 | 256ビット以上の暗号論的乱数 |
| 機密情報 | ペイロードに含めない |
| jwt.decode() | 認証目的での使用禁止 |
| リフレッシュトークン | DB管理 + ローテーション |

認証はセキュリティの核心だ。ライブラリに頼るだけでなく、仕組みを理解した上で実装することが、脆弱性のないシステムを構築する唯一の道だ。

---

*参考資料*
- [RFC 7519 — JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
- [JWT Best Practices (RFC 8725)](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [jsonwebtoken npm package](https://www.npmjs.com/package/jsonwebtoken)
