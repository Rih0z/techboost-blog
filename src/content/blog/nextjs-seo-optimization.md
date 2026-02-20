---
title: 'Next.js SEO最適化完全ガイド — Metadata API・構造化データ・Core Web Vitals'
description: 'Next.js App RouterでSEOを完全最適化する実践ガイド。Metadata API・OpenGraph・構造化データ・サイトマップ・robots.txt・Core Web Vitals改善・動的OGP画像生成まで網羅。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
---

現代のWebアプリケーション開発において、SEO（検索エンジン最適化）は避けて通れない課題だ。Next.jsのApp Routerは、SEOに必要なあらゆる機能を標準で備えており、適切に設定すれば**Lighthouse SEOスコア100**を達成できる。

本記事では、Next.js 14以降のApp RouterにおけるSEO最適化を完全網羅する。基礎的なMetadata APIから、動的OGP画像生成、構造化データ、Core Web Vitals改善まで、実際のコードを交えて解説する。

---

## 1. Next.js App Router Metadata API

### Static Metadata（静的メタデータ）

App RouterではPage・Layoutコンポーネントから`metadata`オブジェクトをexportするだけでメタデータを設定できる。

```typescript
// app/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'トップページ | MyWebApp',
  description: 'MyWebAppはTypeScriptとNext.jsで構築された高品質Webアプリです。',
  keywords: ['Next.js', 'TypeScript', 'React', 'Web開発'],
  authors: [{ name: '山田太郎', url: 'https://example.com/author/yamada' }],
  creator: 'MyWebApp Team',
  publisher: 'MyWebApp Inc.',
  category: 'Technology',
  
  // 正規URL（canonical）
  alternates: {
    canonical: 'https://mywebapp.com/',
    languages: {
      'ja': 'https://mywebapp.com/',
      'en': 'https://mywebapp.com/en/',
    },
  },
  
  // robots制御
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function HomePage() {
  return <main>{/* コンテンツ */}</main>
}
```

### Dynamic Metadata（動的メタデータ）

ブログ記事や商品ページなど、動的なルートでは`generateMetadata`関数を使う。外部APIからデータを取得してメタデータを生成できる。

```typescript
// app/blog/[slug]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'

type Props = {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

// 記事データ取得（APIまたはCMSから）
async function getPost(slug: string) {
  const res = await fetch(`https://api.example.com/posts/${slug}`, {
    next: { revalidate: 3600 }, // 1時間キャッシュ
  })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const post = await getPost(params.slug)
  
  if (!post) {
    return {
      title: '記事が見つかりません',
    }
  }
  
  // 親メタデータを継承
  const previousImages = (await parent).openGraph?.images || []
  
  return {
    title: `${post.title} | TechBoostブログ`,
    description: post.excerpt,
    keywords: post.tags,
    
    alternates: {
      canonical: `https://mywebapp.com/blog/${params.slug}`,
    },
    
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: `https://mywebapp.com/blog/${params.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: `https://mywebapp.com/api/og?title=${encodeURIComponent(post.title)}`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
        ...previousImages,
      ],
    },
    
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [`https://mywebapp.com/api/og?title=${encodeURIComponent(post.title)}`],
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPost(params.slug)
  if (!post) notFound()
  
  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  )
}
```

### Title Template（タイトルテンプレート）

ルートLayout でタイトルのテンプレートを設定すると、各ページで自動的にサイト名が付与される。

```typescript
// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | TechBoostブログ',
    default: 'TechBoostブログ — 最新の技術情報をお届け',
  },
  description: 'Next.js・TypeScript・React などモダンWeb技術を徹底解説するテックブログ。',
  metadataBase: new URL('https://mywebapp.com'),
}
```

---

## 2. OpenGraph・Twitter Card設定

### OGP設定の完全版

SNSでシェアされた際の見栄えを制御するOpenGraph設定を詳しく見ていく。

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://mywebapp.com',
    siteName: 'TechBoostブログ',
    title: 'TechBoostブログ — モダンWeb技術を徹底解説',
    description: 'Next.js・TypeScript・Reactなどの技術情報を発信するエンジニア向けブログ',
    images: [
      {
        url: 'https://mywebapp.com/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'TechBoostブログ',
        type: 'image/jpeg',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    site: '@techboost_blog',
    creator: '@techboost_dev',
    title: 'TechBoostブログ',
    description: 'モダンWeb技術を徹底解説するエンジニア向けブログ',
    images: ['https://mywebapp.com/og-default.jpg'],
  },
  
  // その他のSNS対応
  other: {
    'fb:app_id': '123456789',
    'og:locale:alternate': 'en_US',
  },
}
```

### 記事ページのOpenGraph（Article type）

```typescript
// app/blog/[slug]/page.tsx（generateMetadata内）
openGraph: {
  type: 'article',
  article: {
    publishedTime: '2026-02-20T00:00:00.000Z',
    modifiedTime: '2026-02-20T12:00:00.000Z',
    expirationTime: '2027-02-20T00:00:00.000Z',
    section: 'Technology',
    authors: ['https://mywebapp.com/author/yamada'],
    tags: ['Next.js', 'SEO', 'TypeScript'],
  },
},
```

---

## 3. 動的OGP画像生成（@vercel/og / ImageResponse）

静的なOGP画像ではなく、記事タイトルを自動的に埋め込んだ動的OGP画像を生成する仕組みを構築する。`@vercel/og`を使えば、JSXでデザインした画像をEdge Runtimeで高速生成できる。

### インストール

```bash
npm install @vercel/og
```

### OGP画像生成エンドポイント

```typescript
// app/api/og/route.tsx
import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// カスタムフォントを読み込む（日本語対応必須）
async function loadFont(fontUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(fontUrl)
  return res.arrayBuffer()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'TechBoostブログ'
  const category = searchParams.get('category') || 'Technology'
  const date = searchParams.get('date') || new Date().toLocaleDateString('ja-JP')
  
  // NotoSansJP フォントをロード（日本語レンダリング用）
  const fontData = await loadFont(
    'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75vY0rw-oME.woff'
  )
  
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0f172a',
          padding: '60px',
          fontFamily: '"Noto Sans JP"',
          position: 'relative',
        }}
      >
        {/* 背景グラデーション */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
          }}
        />
        
        {/* カテゴリバッジ */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#6366f1',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '9999px',
            fontSize: '18px',
            marginBottom: '30px',
            width: 'fit-content',
          }}
        >
          {category}
        </div>
        
        {/* タイトル */}
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 30 ? '44px' : '56px',
            color: 'white',
            fontWeight: 700,
            lineHeight: 1.4,
            flex: 1,
            alignItems: 'center',
          }}
        >
          {title}
        </div>
        
        {/* フッター */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#6366f1',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px' }}>
              TechBoostブログ
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px' }}>
            {date}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Noto Sans JP',
          data: fontData,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  )
}
```

### OGP画像URLの生成ユーティリティ

```typescript
// lib/og.ts
export function generateOgImageUrl(params: {
  title: string
  category?: string
  date?: string
}): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://mywebapp.com'
  const url = new URL('/api/og', base)
  
  url.searchParams.set('title', params.title)
  if (params.category) url.searchParams.set('category', params.category)
  if (params.date) url.searchParams.set('date', params.date)
  
  return url.toString()
}
```

---

## 4. 構造化データ（JSON-LD）

構造化データを正しく実装すると、Googleの検索結果でリッチスニペットが表示され、CTRが向上する。

### ユーティリティ関数

```typescript
// components/JsonLd.tsx
type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[]
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
```

### Article構造化データ

```typescript
// app/blog/[slug]/page.tsx
import { JsonLd } from '@/components/JsonLd'

export default async function BlogPostPage({ params }: Props) {
  const post = await getPost(params.slug)
  if (!post) notFound()
  
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: {
      '@type': 'ImageObject',
      url: `https://mywebapp.com/api/og?title=${encodeURIComponent(post.title)}`,
      width: 1200,
      height: 630,
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.author.name,
      url: `https://mywebapp.com/author/${post.author.slug}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'TechBoostブログ',
      logo: {
        '@type': 'ImageObject',
        url: 'https://mywebapp.com/logo.png',
        width: 200,
        height: 60,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://mywebapp.com/blog/${params.slug}`,
    },
    wordCount: post.wordCount,
    inLanguage: 'ja',
    keywords: post.tags.join(', '),
  }
  
  return (
    <>
      <JsonLd data={articleJsonLd} />
      <article>
        <h1>{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    </>
  )
}
```

### BreadcrumbList（パンくずリスト）

```typescript
// components/Breadcrumb.tsx
import { JsonLd } from './JsonLd'

type BreadcrumbItem = {
  name: string
  url: string
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
  
  return (
    <>
      <JsonLd data={jsonLd} />
      <nav aria-label="パンくずリスト">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          {items.map((item, index) => (
            <li key={item.url} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {index === items.length - 1 ? (
                <span aria-current="page" className="text-gray-900">
                  {item.name}
                </span>
              ) : (
                <a href={item.url} className="hover:text-indigo-600">
                  {item.name}
                </a>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}
```

### FAQPage構造化データ

よくある質問セクションにFAQ構造化データを追加するとリッチスニペットが表示される。

```typescript
// components/FaqSection.tsx
import { JsonLd } from './JsonLd'

type FaqItem = {
  question: string
  answer: string
}

export function FaqSection({ items }: { items: FaqItem[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
  
  return (
    <>
      <JsonLd data={jsonLd} />
      <section>
        <h2>よくある質問</h2>
        <dl>
          {items.map((item, index) => (
            <div key={index}>
              <dt className="font-semibold">{item.question}</dt>
              <dd className="mt-2 text-gray-600">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
```

### Product構造化データ

ECサイトや商品紹介ページには Product タイプを使う。

```typescript
// app/products/[id]/page.tsx
const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  image: product.images,
  description: product.description,
  sku: product.sku,
  brand: {
    '@type': 'Brand',
    name: product.brand,
  },
  offers: {
    '@type': 'Offer',
    url: `https://mywebapp.com/products/${product.id}`,
    priceCurrency: 'JPY',
    price: product.price,
    availability: product.inStock
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    seller: {
      '@type': 'Organization',
      name: 'MyWebApp Store',
    },
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: product.rating,
    reviewCount: product.reviewCount,
    bestRating: 5,
    worstRating: 1,
  },
}
```

---

## 5. サイトマップ自動生成（sitemap.ts）

### 静的・動的サイトマップ

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'

async function getBlogPosts() {
  const res = await fetch('https://api.example.com/posts?limit=1000', {
    next: { revalidate: 86400 }, // 24時間キャッシュ
  })
  return res.json()
}

async function getCategories() {
  const res = await fetch('https://api.example.com/categories')
  return res.json()
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://mywebapp.com'
  
  // 静的ページ
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date('2026-01-01'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date('2026-01-01'),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]
  
  // 動的ブログ記事
  const posts = await getBlogPosts()
  const blogPages: MetadataRoute.Sitemap = posts.map((post: any) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  
  // カテゴリページ
  const categories = await getCategories()
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat: any) => ({
    url: `${baseUrl}/blog/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))
  
  return [...staticPages, ...blogPages, ...categoryPages]
}
```

### 複数のサイトマップ（大規模サイト向け）

```typescript
// app/sitemap/[id]/route.ts
import { NextRequest } from 'next/server'

const POSTS_PER_SITEMAP = 1000

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  const offset = id * POSTS_PER_SITEMAP
  
  const posts = await fetchPosts({ limit: POSTS_PER_SITEMAP, offset })
  
  const urls = posts.map((post: any) => `
    <url>
      <loc>https://mywebapp.com/blog/${post.slug}</loc>
      <lastmod>${new Date(post.updatedAt).toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>
  `).join('')
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`
  
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
```

---

## 6. robots.txt設定

```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://mywebapp.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/dashboard/',
          '/private/',
          '*.json',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/'],
        crawlDelay: 1,
      },
      {
        userAgent: 'AhrefsBot',
        disallow: '/', // 競合調査ボットをブロック
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap-news.xml`,
    ],
    host: baseUrl,
  }
}
```

---

## 7. 正規URL（canonical）設定

重複コンテンツ問題を防ぐcanonical URLの正しい実装方法を説明する。

### 基本設定

```typescript
// metadata.alternates.canonical を使う
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://mywebapp.com/blog/nextjs-seo',
  },
}
```

### ページネーション対応

```typescript
// app/blog/page/[page]/page.tsx
type Props = {
  params: { page: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = parseInt(params.page) || 1
  const baseUrl = 'https://mywebapp.com'
  
  return {
    alternates: {
      canonical: page === 1 
        ? `${baseUrl}/blog` 
        : `${baseUrl}/blog/page/${page}`,
    },
    // ページネーション用のlink rel
    // next/previousはNext.jsのMetadata APIでは直接サポートなし
    // headタグで手動追加が必要
  }
}
```

### カスタムHeadコンポーネントでprev/next

```typescript
// components/PaginationHead.tsx
type PaginationHeadProps = {
  currentPage: number
  totalPages: number
  baseUrl: string
}

export function PaginationHead({ currentPage, totalPages, baseUrl }: PaginationHeadProps) {
  const prevUrl = currentPage > 1 
    ? currentPage === 2 
      ? baseUrl 
      : `${baseUrl}/page/${currentPage - 1}`
    : null
  const nextUrl = currentPage < totalPages
    ? `${baseUrl}/page/${currentPage + 1}`
    : null
  
  return (
    <>
      {prevUrl && <link rel="prev" href={prevUrl} />}
      {nextUrl && <link rel="next" href={nextUrl} />}
    </>
  )
}
```

---

## 8. Core Web Vitals最適化

Googleのランキングシグナルとなるコアウェブバイタルの改善方法を解説する。

### LCP（Largest Contentful Paint）改善

LCPはページのメインコンテンツが表示されるまでの時間。目標は2.5秒以内。

```typescript
// ヒーロー画像のpriorityフラグ設定
import Image from 'next/image'

export function HeroSection() {
  return (
    <section>
      {/* LCP要素にはpriority=trueを必ず設定 */}
      <Image
        src="/hero.webp"
        alt="ヒーロー画像"
        width={1920}
        height={1080}
        priority={true}           // preloadが自動挿入される
        quality={85}
        placeholder="blur"
        blurDataURL="data:image/webp;base64,..."
        sizes="100vw"
        style={{ objectFit: 'cover' }}
      />
      <h1>メインタイトル</h1>
    </section>
  )
}
```

```typescript
// next.config.ts でリモート画像の最適化
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.example.com',
        pathname: '/uploads/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30日
  },
  
  // preconnect でサードパーティドメインへの接続を先行確立
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Link',
            value: [
              '<https://fonts.googleapis.com>; rel=preconnect',
              '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
              '<https://www.googletagmanager.com>; rel=preconnect',
            ].join(', '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

### FID/INP（First Input Delay / Interaction to Next Paint）改善

```typescript
// 重い処理を useTransition でバックグラウンドに移す
'use client'
import { useState, useTransition } from 'react'

export function SearchComponent() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isPending, startTransition] = useTransition()
  
  const handleSearch = (value: string) => {
    setQuery(value) // 即時更新（高優先度）
    
    startTransition(() => {
      // 検索結果更新はバックグラウンドで（低優先度）
      performSearch(value).then(setResults)
    })
  }
  
  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="検索..."
      />
      {isPending && <span>検索中...</span>}
      <ul>
        {results.map((result: any) => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

### CLS（Cumulative Layout Shift）改善

```typescript
// サイズを必ず指定してレイアウトシフトを防止
// Bad: サイズ未指定
<img src="/image.jpg" alt="画像" />

// Good: width/heightを必ず指定
<Image
  src="/image.jpg"
  alt="画像"
  width={800}
  height={600}
  style={{ height: 'auto' }} // アスペクト比を維持
/>

// フォント読み込み中のシフトを防ぐ
// Bad: フォントが遅延ロードされてレイアウトシフト
// Good: font-display: optional または next/font を使う
```

---

## 9. 画像最適化

### next/imageの完全活用

```typescript
// components/OptimizedImage.tsx
import Image from 'next/image'

type OptimizedImageProps = {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
  className?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
}: OptimizedImageProps) {
  // Base64エンコードされたblurデータURLを生成するユーティリティ
  const shimmer = (w: number, h: number) => `
    <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <rect width="${w}" height="${h}" fill="#f3f4f6" filter="url(#blur)" />
    </svg>
  `
  const toBase64 = (str: string) =>
    typeof window === 'undefined'
      ? Buffer.from(str).toString('base64')
      : window.btoa(str)
  
  const blurDataURL = `data:image/svg+xml;base64,${toBase64(shimmer(width, height))}`
  
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      placeholder="blur"
      blurDataURL={blurDataURL}
      className={className}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={85}
    />
  )
}
```

---

## 10. フォント最適化（next/font）

### Google Fontsの最適化

`next/font`を使うとフォントファイルがビルド時にダウンロードされ、外部リクエストなしで配信される。これによりFOUT（Flash of Unstyled Text）とプライバシーリスクを両方解消できる。

```typescript
// app/layout.tsx
import { Noto_Sans_JP, Inter } from 'next/font/google'

const notoSansJP = Noto_Sans_JP({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',           // FOUT防止: テキストは即座に表示、フォントが来たら切り替え
  preload: true,
  variable: '--font-noto-sans-jp',
  fallback: ['Hiragino Sans', 'Yu Gothic', 'sans-serif'],
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${inter.variable}`}>
      <body className="font-noto-sans-jp antialiased">
        {children}
      </body>
    </html>
  )
}
```

### ローカルフォントの設定

```typescript
// app/layout.tsx
import localFont from 'next/font/local'

const customFont = localFont({
  src: [
    {
      path: '../public/fonts/CustomFont-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/CustomFont-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-custom',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
})
```

---

## 11. 国際化SEO（hreflang・多言語対応）

### hreflang設定

```typescript
// app/[locale]/layout.tsx
import type { Metadata } from 'next'

const locales = ['ja', 'en', 'zh']

export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const baseUrl = 'https://mywebapp.com'
  
  const languages = locales.reduce(
    (acc, locale) => ({
      ...acc,
      [locale]: `${baseUrl}/${locale}`,
    }),
    { 'x-default': `${baseUrl}/ja` }
  )
  
  return {
    alternates: {
      languages,
      canonical: `${baseUrl}/${params.locale}`,
    },
  }
}
```

### i18n設定（next-intl使用）

```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  // next-intlの設定はプラグインが処理
}

export default withNextIntl(nextConfig)
```

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['ja', 'en', 'zh'],
  defaultLocale: 'ja',
  localePrefix: 'always', // /ja, /en など
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

---

## 12. 動的ルートのSEO（generateStaticParams）

### 静的生成でSEO最大化

```typescript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  // ビルド時に全記事のslugを取得して静的生成
  const posts = await fetch('https://api.example.com/posts?limit=10000', {
    cache: 'force-cache',
  }).then((res) => res.json())
  
  return posts.map((post: { slug: string }) => ({
    slug: post.slug,
  }))
}

// ISRでの部分的な静的生成
export const dynamicParams = true  // generateStaticParamsにないslugはSSRにフォールバック
export const revalidate = 3600     // 1時間ごとに再検証

export default async function BlogPostPage({ params }: Props) {
  const post = await getPost(params.slug)
  if (!post) notFound()
  
  return <article>{/* ... */}</article>
}
```

### カテゴリ別一覧ページ

```typescript
// app/blog/category/[category]/page/[page]/page.tsx
export async function generateStaticParams() {
  const categories = await getCategories()
  const params = []
  
  for (const category of categories) {
    const totalPosts = await getPostCountByCategory(category.slug)
    const totalPages = Math.ceil(totalPosts / 10)
    
    for (let page = 1; page <= totalPages; page++) {
      params.push({
        category: category.slug,
        page: String(page),
      })
    }
  }
  
  return params
}
```

---

## 13. Lighthouse スコア100達成チェックリスト

SEO・Performance・Accessibility・Best Practicesすべてで100点を狙うための総点検リストを示す。

### SEO（検索エンジン最適化）チェックリスト

- [ ] `<title>`タグが全ページに設定されている（50〜60文字推奨）
- [ ] `<meta name="description">`が全ページに設定されている（120〜160文字推奨）
- [ ] canonical URLが設定されている
- [ ] robots.txtが正しく設定されている（noindexページが適切にブロックされている）
- [ ] sitemap.xmlが生成されており、Search Consoleに送信済み
- [ ] hreflangが多言語サイトで設定されている
- [ ] 構造化データ（JSON-LD）が実装されている
- [ ] 全画像にaltテキストが設定されている
- [ ] 内部リンクが適切に設定されている
- [ ] Crawlableなリンク（`<a href="...">`）を使用している
- [ ] HTTPSが有効になっている

### Performance（パフォーマンス）チェックリスト

- [ ] LCPが2.5秒以内（Priorityフラグ・preload設定）
- [ ] INP/FIDが200ms以内（useTransition・コード分割）
- [ ] CLSが0.1以下（画像サイズ指定・フォントdisplay:swap）
- [ ] 未使用のJavaScriptを削除（バンドル分析: `@next/bundle-analyzer`）
- [ ] 画像をWebP/AVIFで配信している
- [ ] フォントをnext/fontで最適化している
- [ ] CDNを使用している（Vercel Edge Network等）
- [ ] APIレスポンスにキャッシュヘッダーが設定されている
- [ ] Third-partyスクリプトを遅延読み込みしている

### バンドル分析ツールの設定

```typescript
// next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer({
  // ... nextConfig
})
```

```bash
# バンドル分析の実行
ANALYZE=true npm run build
```

### Third-party スクリプト遅延読み込み

```typescript
// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        
        {/* Google Analytics を遅延読み込み */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
        
        {/* チャットウィジェットなど外部ツールは lazyOnload に */}
        <Script
          src="https://cdn.example-chat.com/widget.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
```

### Accessibility（アクセシビリティ）チェックリスト

- [ ] カラーコントラスト比が4.5:1以上（通常テキスト）・3:1以上（大きいテキスト）
- [ ] キーボードナビゲーションが機能する
- [ ] 全インタラクティブ要素にfocusスタイルがある
- [ ] 画像にaltテキストが設定されている
- [ ] フォームにラベルが関連付けられている
- [ ] `lang`属性がhtmlタグに設定されている
- [ ] 見出し構造（h1→h2→h3）が適切

---

## 実践まとめ：SEO設定の優先順位

Next.jsでSEOを実装する際の優先順位を整理する。

**最優先（必須）**
1. `metadataBase`の設定 — OGP画像URLが相対パスにならないようにする
2. 全ページへの`title`と`description`設定
3. `robots.txt`と`sitemap.xml`の生成
4. canonical URLの設定

**高優先（強く推奨）**
5. OpenGraph・Twitter Card設定
6. 動的OGP画像生成（CTR向上に直結）
7. 構造化データ（JSON-LD）実装
8. `priority={true}`をLCP要素に設定

**中優先（改善効果あり）**
9. `generateStaticParams`による静的生成
10. `next/font`によるフォント最適化
11. hreflang設定（多言語サイトのみ）
12. バンドルサイズの削減

---

## DevToolBoxで開発効率をさらに向上

本記事で紹介したNext.jsのSEO設定を実装するにあたって、開発ツールの活用が欠かせない。**[DevToolBox](https://usedevtools.com/)** は、Web開発者向けのオールインワンツールキットで、JSON整形・Base64エンコード・正規表現テスト・カラーパレット生成など、日々の開発で必要なツールをブラウザから即座に使える。

特に構造化データのJSON-LD作成時には、DevToolBoxのJSONフォーマッター・バリデーターが役立つ。また、OGP画像のBase64エンコードやカラーコントラスト比の確認など、SEO作業に関わる細かいタスクをまとめて処理できる。ブックマークしておくだけで開発速度が確実に上がるツールだ。

---

## まとめ

Next.js App RouterのSEO最適化は、単なるメタタグ設定に留まらず、パフォーマンス・アクセシビリティ・構造化データまで包括的に取り組む必要がある。本記事で紹介した内容を順番に実装することで、Lighthouse SEOスコア100の達成は十分に現実的だ。

特に見落とされがちなのが**動的OGP画像生成**と**構造化データ**だ。この2つを実装するだけでSNSのシェア数とリッチスニペット表示率が大きく向上し、オーガニック流入の増加につながる。まだ実装していない場合は、優先的に取り組むことを強く推奨する。

SEO最適化は一度設定して終わりではない。Search Console・Lighthouse・Web Vitalsを定期的にモニタリングし、継続的に改善を繰り返すことで、長期的な検索流入を確保できる。
