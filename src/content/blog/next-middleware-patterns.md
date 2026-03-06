---
title: 'Next.js Middleware設計パターン: 認証・リダイレクト・ABテストの実装'
description: 'Next.js Middlewareの高度な設計パターン、マルチテナント対応、動的ルーティング、エッジ最適化、セキュリティ強化の実践的な実装方法を解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2025-09-03'
updatedDate: '2025-09-03'
category: 'フレームワーク'
tags: ['Next.js', 'Middleware', 'Edge', 'セキュリティ', 'パフォーマンス', 'プログラミング']
---
# Next.js Middleware設計パターン

Next.js Middlewareは、リクエストが完了する前にコードを実行できる強力な機能ですが、適切な設計パターンを理解することで、さらに効果的に活用できます。

本記事では、実践的な設計パターン、マルチテナント対応、エッジ最適化、セキュリティ強化など、一歩進んだMiddlewareの使い方を解説します。

## Middlewareアーキテクチャ

### 単一Middlewareパターン

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// すべてのロジックを1つのファイルに集約
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. 認証チェック
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token')
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 2. リダイレクトルール
  if (pathname === '/old-page') {
    return NextResponse.redirect(new URL('/new-page', request.url))
  }

  // 3. ヘッダー追加
  const response = NextResponse.next()
  response.headers.set('x-custom-header', 'value')

  return response
}

// 問題点:
// - コードが長くなると保守性が低下
// - テストが困難
// - 再利用性が低い
```

### モジュール化パターン（推奨）

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'
import { authMiddleware } from './middlewares/auth'
import { redirectMiddleware } from './middlewares/redirect'
import { securityMiddleware } from './middlewares/security'
import { analyticsMiddleware } from './middlewares/analytics'

// Middleware関数を合成するヘルパー
function chain(
  middlewares: NextMiddleware[],
  index = 0
): NextMiddleware {
  const current = middlewares[index]

  if (current) {
    const next = chain(middlewares, index + 1)
    return async (request) => {
      const result = await current(request)
      if (result instanceof Response) {
        return result
      }
      return next(request)
    }
  }

  return () => NextResponse.next()
}

// Middlewareを組み合わせ
export default chain([
  securityMiddleware,
  authMiddleware,
  redirectMiddleware,
  analyticsMiddleware,
])

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### 個別Middlewareの実装

```typescript
// middlewares/auth.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'
import { verifyToken } from '@/lib/auth'

const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
]

export const authMiddleware: NextMiddleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl

  // 保護されたルートかチェック
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const payload = await verifyToken(token)

    // ユーザー情報をヘッダーに追加
    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.userId)
    response.headers.set('x-user-role', payload.role)

    return response
  } catch (error) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'invalid_token')
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('auth-token')
    return response
  }
}
```

```typescript
// middlewares/security.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'

export const securityMiddleware: NextMiddleware = (request: NextRequest) => {
  const response = NextResponse.next()

  // セキュリティヘッダーを追加
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  )

  return response
}
```

```typescript
// middlewares/redirect.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'

interface RedirectRule {
  source: string | RegExp
  destination: string
  permanent?: boolean
}

const redirectRules: RedirectRule[] = [
  { source: '/old-blog', destination: '/blog', permanent: true },
  { source: '/old-about', destination: '/about', permanent: true },
  { source: /^\/products\/(.*)$/, destination: '/shop/$1', permanent: false },
]

export const redirectMiddleware: NextMiddleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl

  for (const rule of redirectRules) {
    if (typeof rule.source === 'string') {
      if (pathname === rule.source) {
        return NextResponse.redirect(
          new URL(rule.destination, request.url),
          rule.permanent ? 308 : 307
        )
      }
    } else {
      const match = pathname.match(rule.source)
      if (match) {
        const destination = rule.destination.replace(/\$(\d+)/g, (_, index) => {
          return match[index] || ''
        })
        return NextResponse.redirect(
          new URL(destination, request.url),
          rule.permanent ? 308 : 307
        )
      }
    }
  }

  return NextResponse.next()
}
```

## マルチテナント対応

### サブドメインベース

```typescript
// middlewares/tenant.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'

interface Tenant {
  id: string
  subdomain: string
  customDomain?: string
}

// テナント情報を取得（KVストアやDBから）
async function getTenant(hostname: string): Promise<Tenant | null> {
  // 例: Vercel KV
  const kv = await import('@vercel/kv')
  return kv.get(`tenant:${hostname}`)
}

export const tenantMiddleware: NextMiddleware = async (request: NextRequest) => {
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]

  // ローカル開発環境
  if (hostname.includes('localhost')) {
    const response = NextResponse.next()
    response.headers.set('x-tenant-id', 'dev')
    return response
  }

  // カスタムドメインをチェック
  let tenant = await getTenant(hostname)

  // サブドメインをチェック
  if (!tenant && subdomain) {
    tenant = await getTenant(subdomain)
  }

  if (!tenant) {
    return NextResponse.redirect(new URL('https://www.example.com/404', request.url))
  }

  // テナント情報をヘッダーに追加
  const response = NextResponse.rewrite(
    new URL(`/${tenant.id}${request.nextUrl.pathname}`, request.url)
  )
  response.headers.set('x-tenant-id', tenant.id)
  response.headers.set('x-tenant-subdomain', tenant.subdomain)

  return response
}
```

### パスベース

```typescript
// middlewares/tenant-path.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'

export const tenantPathMiddleware: NextMiddleware = async (
  request: NextRequest
) => {
  const { pathname } = request.nextUrl

  // パターン: /org/[tenant-slug]/...
  const match = pathname.match(/^\/org\/([^\/]+)(.*)$/)

  if (!match) {
    return NextResponse.next()
  }

  const [, tenantSlug, rest] = match

  // テナント存在確認
  const tenant = await getTenantBySlug(tenantSlug)

  if (!tenant) {
    return NextResponse.redirect(new URL('/404', request.url))
  }

  // テナント情報をヘッダーに追加
  const response = NextResponse.next()
  response.headers.set('x-tenant-id', tenant.id)
  response.headers.set('x-tenant-slug', tenantSlug)

  return response
}

async function getTenantBySlug(slug: string) {
  // DB検索など
  return { id: '123', slug }
}
```

## 動的ルーティング

### 国際化（i18n）

```typescript
// middlewares/i18n.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'
import Negotiator from 'negotiator'
import { match as matchLocale } from '@formatjs/intl-localematcher'

const locales = ['en', 'ja', 'fr', 'de', 'zh']
const defaultLocale = 'en'

function getLocale(request: NextRequest): string {
  // 1. パスからロケール抽出
  const pathname = request.nextUrl.pathname
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  if (pathnameLocale) return pathnameLocale

  // 2. Cookieからロケール取得
  const cookieLocale = request.cookies.get('locale')?.value
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale
  }

  // 3. Accept-Languageヘッダーから判定
  const negotiatorHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    negotiatorHeaders[key] = value
  })

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages()
  const locale = matchLocale(languages, locales, defaultLocale)

  return locale
}

export const i18nMiddleware: NextMiddleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl

  // 静的ファイルをスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /\.(ico|png|jpg|jpeg|svg|css|js)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // パスにロケールが含まれているかチェック
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    return NextResponse.next()
  }

  // ロケールを判定してリダイレクト
  const locale = getLocale(request)
  const newUrl = new URL(`/${locale}${pathname}${request.nextUrl.search}`, request.url)

  const response = NextResponse.redirect(newUrl)
  response.cookies.set('locale', locale, { maxAge: 60 * 60 * 24 * 365 })

  return response
}
```

### デバイス別ルーティング

```typescript
// middlewares/device.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'

function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase()

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }

  if (
    /mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)
  ) {
    return 'mobile'
  }

  return 'desktop'
}

export const deviceMiddleware: NextMiddleware = (request: NextRequest) => {
  const userAgent = request.headers.get('user-agent') || ''
  const deviceType = getDeviceType(userAgent)
  const { pathname } = request.nextUrl

  // モバイル専用パスへリダイレクト
  if (deviceType === 'mobile' && !pathname.startsWith('/m/')) {
    // 特定のページのみモバイル版にリダイレクト
    const mobilePages = ['/shop', '/products', '/cart']
    const shouldRedirect = mobilePages.some((page) =>
      pathname.startsWith(page)
    )

    if (shouldRedirect) {
      return NextResponse.redirect(new URL(`/m${pathname}`, request.url))
    }
  }

  // デバイス情報をヘッダーに追加
  const response = NextResponse.next()
  response.headers.set('x-device-type', deviceType)

  return response
}
```

## エッジ最適化

### エッジキャッシュ制御

```typescript
// middlewares/cache.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'

interface CacheConfig {
  path: string | RegExp
  maxAge: number
  sMaxAge?: number
  staleWhileRevalidate?: number
}

const cacheConfigs: CacheConfig[] = [
  {
    path: /^\/api\/public\//,
    maxAge: 60,
    sMaxAge: 3600,
    staleWhileRevalidate: 86400,
  },
  {
    path: '/blog',
    maxAge: 300,
    sMaxAge: 3600,
  },
  {
    path: /^\/static\//,
    maxAge: 31536000, // 1年
  },
]

export const cacheMiddleware: NextMiddleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl

  for (const config of cacheConfigs) {
    const matches =
      typeof config.path === 'string'
        ? pathname.startsWith(config.path)
        : config.path.test(pathname)

    if (matches) {
      const response = NextResponse.next()

      const cacheControl = [
        `public`,
        `max-age=${config.maxAge}`,
        config.sMaxAge && `s-maxage=${config.sMaxAge}`,
        config.staleWhileRevalidate &&
          `stale-while-revalidate=${config.staleWhileRevalidate}`,
      ]
        .filter(Boolean)
        .join(', ')

      response.headers.set('Cache-Control', cacheControl)

      return response
    }
  }

  return NextResponse.next()
}
```

### エッジ関数の最適化

```typescript
// middlewares/edge-optimize.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'

// エッジで実行される軽量な処理のみ
export const edgeOptimizeMiddleware: NextMiddleware = async (
  request: NextRequest
) => {
  const start = Date.now()

  // 1. 早期リターン（不要な処理をスキップ）
  if (request.nextUrl.pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // 2. 並列処理
  const [geoData, timeData] = await Promise.all([
    getGeoData(request),
    getServerTime(),
  ])

  // 3. 最小限のヘッダー追加
  const response = NextResponse.next()
  response.headers.set('x-geo-country', geoData.country)
  response.headers.set('x-server-time', timeData.toString())

  const duration = Date.now() - start
  response.headers.set('x-middleware-duration', `${duration}ms`)

  return response
}

async function getGeoData(request: NextRequest) {
  return {
    country: request.geo?.country || 'US',
    city: request.geo?.city || 'Unknown',
  }
}

async function getServerTime() {
  return new Date().toISOString()
}

// エッジランタイム設定
export const config = {
  runtime: 'edge',
}
```

## 高度なセキュリティパターン

### CSRFトークン検証

```typescript
// middlewares/csrf.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'
import { createHash } from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET || 'default-secret'

function generateToken(sessionId: string): string {
  return createHash('sha256')
    .update(`${sessionId}${CSRF_SECRET}`)
    .digest('hex')
}

function verifyToken(sessionId: string, token: string): boolean {
  const expectedToken = generateToken(sessionId)
  return token === expectedToken
}

export const csrfMiddleware: NextMiddleware = (request: NextRequest) => {
  const { pathname, searchParams } = request.nextUrl
  const method = request.method

  // GETリクエストはスキップ
  if (method === 'GET') {
    return NextResponse.next()
  }

  // APIルートのみ検証
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const sessionId = request.cookies.get('session-id')?.value
  const csrfToken = request.headers.get('x-csrf-token')

  if (!sessionId || !csrfToken) {
    return NextResponse.json(
      { error: 'Missing CSRF token' },
      { status: 403 }
    )
  }

  if (!verifyToken(sessionId, csrfToken)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }

  return NextResponse.next()
}
```

### Bot検出

```typescript
// middlewares/bot-detection.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'

const knownBots = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'facebot',
  'ia_archiver',
]

const suspiciousBots = [
  'scrapy',
  'python-requests',
  'curl',
  'wget',
  'go-http-client',
]

function isSuspiciousBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return suspiciousBots.some((bot) => ua.includes(bot))
}

function isKnownBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return knownBots.some((bot) => ua.includes(bot))
}

export const botDetectionMiddleware: NextMiddleware = (request: NextRequest) => {
  const userAgent = request.headers.get('user-agent') || ''

  // 検索エンジンは許可
  if (isKnownBot(userAgent)) {
    const response = NextResponse.next()
    response.headers.set('x-bot-type', 'search-engine')
    return response
  }

  // 疑わしいBotはブロック
  if (isSuspiciousBot(userAgent)) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    )
  }

  return NextResponse.next()
}
```

## パフォーマンス監視

### レスポンスタイム計測

```typescript
// middlewares/performance.ts
import { NextResponse } from 'next/server'
import type { NextRequest, NextMiddleware } from 'next/server'

export const performanceMiddleware: NextMiddleware = async (
  request: NextRequest
) => {
  const start = performance.now()

  const response = NextResponse.next()

  const duration = performance.now() - start

  response.headers.set('x-response-time', `${duration.toFixed(2)}ms`)
  response.headers.set('x-request-id', crypto.randomUUID())

  // 遅いリクエストをログ
  if (duration > 1000) {
    console.warn(`Slow request: ${request.nextUrl.pathname} took ${duration}ms`)
  }

  return response
}
```

## まとめ

Next.js Middlewareの高度な設計パターンを理解することで、以下が実現できます。

### 主な利点

1. **保守性の向上** - モジュール化により管理が容易
2. **再利用性** - 共通ロジックを複数プロジェクトで利用
3. **テスト容易性** - 個別Middlewareを独立してテスト
4. **パフォーマンス** - エッジ最適化で高速化
5. **セキュリティ** - 一元的なセキュリティ制御

### ベストプラクティス

- Middlewareは軽量に保つ
- エッジランタイムの制限を理解する
- 早期リターンで不要な処理をスキップ
- 並列処理を活用
- 適切なエラーハンドリング

これらのパターンを活用して、スケーラブルで保守性の高いNext.jsアプリケーションを構築しましょう。
