---
title: 'Next.js Middleware活用ガイド - 認証・リダイレクト・A/Bテストの実践パターン'
description: 'Next.js Middlewareを使った認証、リダイレクト、A/Bテスト、地域別ルーティング、レートリミットの実装方法を実例で解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 'Feb 05 2026'
tags: ['Next.js', 'Middleware', 'React', 'TypeScript']
---
# Next.js Middleware活用ガイド

Next.js Middlewareは、リクエストが完了する前にコードを実行できる強力な機能です。認証、リダイレクト、A/Bテスト、地域別ルーティングなど、さまざまなユースケースで活用できます。

## Middlewareの基本

### セットアップ

Middlewareは `middleware.ts` または `middleware.js` ファイルをプロジェクトルートまたは `src` ディレクトリに配置します。

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('Middleware executed for:', request.url);
  return NextResponse.next();
}

// すべてのルートで実行
export const config = {
  matcher: '/:path*',
};
```

### Matcherパターン

特定のパスでのみMiddlewareを実行:

```typescript
// 複数のパスパターン
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/admin/:path*',
  ],
};

// 正規表現を使用
export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパス:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

// 条件付きマッチング
export const config = {
  matcher: [
    {
      source: '/dashboard/:path*',
      has: [
        { type: 'header', key: 'x-custom-header' },
        { type: 'cookie', key: 'session' },
      ],
    },
  ],
};
```

## 認証

### JWT認証

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  // 認証が必要なページ
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      await jwtVerify(token, SECRET);
      return NextResponse.next();
    } catch (error) {
      // トークンが無効
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }
  }

  // ログイン済みユーザーがログインページにアクセス
  if (request.nextUrl.pathname === '/login' && token) {
    try {
      await jwtVerify(token, SECRET);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch {
      // トークンが無効なので続行
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
```

### Session認証（NextAuth.js）

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // トークンが存在する場合のみ実行される追加ロジック
    const token = req.nextauth.token;
    const isAdmin = token?.role === 'admin';

    // 管理者ページへのアクセス制御
    if (req.nextUrl.pathname.startsWith('/admin') && !isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/profile/:path*'],
};
```

### ロールベース認証

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';

type Role = 'user' | 'admin' | 'moderator';

interface RoutePermissions {
  path: string;
  allowedRoles: Role[];
}

const routePermissions: RoutePermissions[] = [
  { path: '/admin', allowedRoles: ['admin'] },
  { path: '/moderator', allowedRoles: ['admin', 'moderator'] },
  { path: '/dashboard', allowedRoles: ['user', 'admin', 'moderator'] },
];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const payload = await verifyAuth(token);
    const userRole = payload.role as Role;
    const pathname = request.nextUrl.pathname;

    // パスに対する権限チェック
    const permission = routePermissions.find((p) =>
      pathname.startsWith(p.path)
    );

    if (permission && !permission.allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // ユーザー情報をヘッダーに追加（ページで使用可能）
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-role', userRole);
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/moderator/:path*'],
};
```

## リダイレクト

### パスベースリダイレクト

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const redirects: Record<string, string> = {
  '/old-blog': '/blog',
  '/old-about': '/about',
  '/products/legacy': '/products',
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 静的リダイレクト
  if (pathname in redirects) {
    return NextResponse.redirect(new URL(redirects[pathname], request.url));
  }

  // パターンマッチングリダイレクト
  if (pathname.startsWith('/old-products/')) {
    const slug = pathname.replace('/old-products/', '');
    return NextResponse.redirect(new URL(`/products/${slug}`, request.url));
  }

  return NextResponse.next();
}
```

### 条件付きリダイレクト

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // クエリパラメータによるリダイレクト
  const redirect = searchParams.get('redirect');
  if (redirect) {
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  // ヘッダーベースのリダイレクト
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /mobile/i.test(userAgent);

  if (pathname === '/app' && isMobile) {
    return NextResponse.redirect(new URL('/mobile-app', request.url));
  }

  // Cookieベースのリダイレクト
  const preferredVersion = request.cookies.get('version')?.value;
  if (pathname === '/' && preferredVersion === 'v2') {
    return NextResponse.redirect(new URL('/v2', request.url));
  }

  return NextResponse.next();
}
```

### 永続リダイレクト

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 一時リダイレクト (307)
  if (pathname === '/temp-redirect') {
    return NextResponse.redirect(new URL('/new-page', request.url), 307);
  }

  // 永続リダイレクト (308)
  if (pathname === '/permanent-redirect') {
    return NextResponse.redirect(new URL('/new-page', request.url), 308);
  }

  return NextResponse.next();
}
```

## A/Bテスト

### シンプルなA/Bテスト

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'ab-test-variant';

export function middleware(request: NextRequest) {
  // A/Bテスト対象ページ
  if (request.nextUrl.pathname === '/') {
    let variant = request.cookies.get(COOKIE_NAME)?.value;

    if (!variant) {
      // 50/50で振り分け
      variant = Math.random() < 0.5 ? 'a' : 'b';
    }

    const response = NextResponse.next();

    // バリアントをCookieに保存
    response.cookies.set(COOKIE_NAME, variant, {
      maxAge: 60 * 60 * 24 * 30, // 30日間
    });

    // バリアント情報をヘッダーに追加
    response.headers.set('x-variant', variant);

    return response;
  }

  return NextResponse.next();
}
```

### 複数バリアントのA/Bテスト

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface Experiment {
  name: string;
  variants: {
    name: string;
    weight: number;
  }[];
}

const experiments: Record<string, Experiment> = {
  '/pricing': {
    name: 'pricing-test',
    variants: [
      { name: 'control', weight: 0.4 },
      { name: 'variant-a', weight: 0.3 },
      { name: 'variant-b', weight: 0.3 },
    ],
  },
};

function selectVariant(variants: Experiment['variants']): string {
  const random = Math.random();
  let cumulative = 0;

  for (const variant of variants) {
    cumulative += variant.weight;
    if (random < cumulative) {
      return variant.name;
    }
  }

  return variants[0].name;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const experiment = experiments[pathname];

  if (!experiment) {
    return NextResponse.next();
  }

  const cookieName = `experiment-${experiment.name}`;
  let variant = request.cookies.get(cookieName)?.value;

  if (!variant) {
    variant = selectVariant(experiment.variants);
  }

  const response = NextResponse.next();

  response.cookies.set(cookieName, variant, {
    maxAge: 60 * 60 * 24 * 30,
  });

  response.headers.set('x-experiment', experiment.name);
  response.headers.set('x-variant', variant);

  return response;
}
```

### ユーザーセグメント別A/Bテスト

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface UserSegment {
  isReturning: boolean;
  isPremium: boolean;
  country?: string;
}

function getUserSegment(request: NextRequest): UserSegment {
  return {
    isReturning: !!request.cookies.get('returning-user')?.value,
    isPremium: request.cookies.get('user-tier')?.value === 'premium',
    country: request.geo?.country,
  };
}

function selectVariantForSegment(segment: UserSegment): string {
  // プレミアムユーザーは常にvariant-b
  if (segment.isPremium) {
    return 'variant-b';
  }

  // 新規ユーザーは50/50
  if (!segment.isReturning) {
    return Math.random() < 0.5 ? 'control' : 'variant-a';
  }

  // リピーターはvariant-a優先
  return Math.random() < 0.7 ? 'variant-a' : 'control';
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/landing') {
    const segment = getUserSegment(request);
    const cookieName = 'landing-variant';
    let variant = request.cookies.get(cookieName)?.value;

    if (!variant) {
      variant = selectVariantForSegment(segment);
    }

    const response = NextResponse.next();
    response.cookies.set(cookieName, variant, {
      maxAge: 60 * 60 * 24 * 30,
    });
    response.headers.set('x-variant', variant);
    response.headers.set('x-user-segment', JSON.stringify(segment));

    return response;
  }

  return NextResponse.next();
}
```

## 地域別ルーティング

### 基本的な地域別リダイレクト

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const countryToLocale: Record<string, string> = {
  US: 'en-US',
  GB: 'en-GB',
  JP: 'ja-JP',
  FR: 'fr-FR',
  DE: 'de-DE',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // すでにロケールパスが含まれている場合はスキップ
  const hasLocale = Object.values(countryToLocale).some((locale) =>
    pathname.startsWith(`/${locale}`)
  );

  if (hasLocale) {
    return NextResponse.next();
  }

  // 国コードからロケールを決定
  const country = request.geo?.country || 'US';
  const locale = countryToLocale[country] || 'en-US';

  // ロケールパスへリダイレクト
  return NextResponse.redirect(
    new URL(`/${locale}${pathname}`, request.url)
  );
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### ユーザー設定優先の地域別ルーティング

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALE_COOKIE = 'user-locale';
const supportedLocales = ['en-US', 'ja-JP', 'fr-FR', 'de-DE'];

function getLocale(request: NextRequest): string {
  // 1. Cookieに保存されたユーザー設定
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && supportedLocales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Accept-Languageヘッダー
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const browserLocale = acceptLanguage.split(',')[0].trim();
    const matched = supportedLocales.find((locale) =>
      browserLocale.startsWith(locale.split('-')[0])
    );
    if (matched) return matched;
  }

  // 3. 地理情報
  const country = request.geo?.country;
  const countryToLocale: Record<string, string> = {
    US: 'en-US',
    JP: 'ja-JP',
    FR: 'fr-FR',
    DE: 'de-DE',
  };
  if (country && countryToLocale[country]) {
    return countryToLocale[country];
  }

  // 4. デフォルト
  return 'en-US';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // パスからロケールを抽出
  const pathnameLocale = supportedLocales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameLocale) {
    // すでにロケールが指定されている
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, pathnameLocale, {
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  // ロケールを決定してリダイレクト
  const locale = getLocale(request);
  const newUrl = new URL(`/${locale}${pathname}`, request.url);
  return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## レートリミット

### シンプルなレートリミット

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// メモリ内ストア（開発用）
const rateLimit = new Map<string, { count: number; resetTime: number }>();

const LIMIT = 10; // 10リクエスト
const WINDOW = 60 * 1000; // 1分

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || 'unknown';
    const now = Date.now();
    const userLimit = rateLimit.get(ip);

    if (!userLimit || now > userLimit.resetTime) {
      rateLimit.set(ip, { count: 1, resetTime: now + WINDOW });
      return NextResponse.next();
    }

    if (userLimit.count >= LIMIT) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((userLimit.resetTime - now) / 1000)),
          },
        }
      );
    }

    userLimit.count++;
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### Upstashを使用した分散レートリミット

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// スライディングウィンドウ方式
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || 'unknown';
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    const response = success
      ? NextResponse.next()
      : NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        );

    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### エンドポイント別レートリミット

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// エンドポイントごとの設定
const rateLimits = {
  '/api/auth/login': new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 15分で5回
  }),
  '/api/data': new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 1分で100回
  }),
  default: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 1分で30回
  }),
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/')) {
    const ip = request.ip || 'unknown';

    // エンドポイントに応じたレートリミッターを選択
    let limiter = rateLimits.default;
    for (const [path, ratelimit] of Object.entries(rateLimits)) {
      if (path !== 'default' && pathname.startsWith(path)) {
        limiter = ratelimit;
        break;
      }
    }

    const { success, limit, reset, remaining } = await limiter.limit(
      `${ip}:${pathname}`
    );

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: new Date(reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

## パフォーマンス最適化

### Middlewareのベストプラクティス

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. 早期リターン - 不要な処理を避ける
  if (request.nextUrl.pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  // 2. 並列処理
  const checks = Promise.all([
    checkAuthentication(request),
    checkRateLimit(request),
  ]);

  // 3. 最小限のデータ処理
  const response = NextResponse.next();

  // 4. ヘッダーの最適化
  response.headers.set('X-Request-Id', crypto.randomUUID());

  return response;
}

async function checkAuthentication(request: NextRequest) {
  // 認証チェック
}

async function checkRateLimit(request: NextRequest) {
  // レート制限チェック
}

// 静的ファイルを除外
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

## デバッグとログ

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const start = Date.now();

  // リクエスト情報のログ
  console.log({
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    pathname: request.nextUrl.pathname,
    ip: request.ip,
    userAgent: request.headers.get('user-agent'),
    geo: request.geo,
  });

  const response = NextResponse.next();

  // レスポンス時間の計測
  const duration = Date.now() - start;
  response.headers.set('X-Response-Time', `${duration}ms`);

  console.log({
    pathname: request.nextUrl.pathname,
    duration: `${duration}ms`,
    status: response.status,
  });

  return response;
}
```

## まとめ

Next.js Middlewareは、リクエスト/レスポンスのフローに介入できる強力な機能です。

### 重要ポイント

1. **認証**: セッション管理とロールベースアクセス制御
2. **リダイレクト**: 条件付きルーティングとURL正規化
3. **A/Bテスト**: ユーザーセグメント別の実験
4. **地域別ルーティング**: 自動ロケール検出と切り替え
5. **レートリミット**: API保護とリソース管理

### ベストプラクティス

- Matcherを適切に設定して不要な実行を避ける
- 重い処理は避け、必要に応じて非同期処理を使用
- エラーハンドリングを適切に実装
- ログを活用してデバッグを容易にする

Middlewareを活用することで、アプリケーションのセキュリティ、パフォーマンス、ユーザー体験を大幅に向上させることができます。
