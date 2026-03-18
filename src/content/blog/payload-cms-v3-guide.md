---
title: "Payload CMS v3完全ガイド - Next.js統合とTypeScript完全対応"
description: "Payload CMS v3の新機能を徹底解説。Next.js App Routerとの完全統合、TypeScript型生成、ローカルAPI、バージョン管理など、最新機能を使った実践的なヘッドレスCMS構築方法を紹介します。"
pubDate: "2025-02-05"
---

## Payload CMS v3とは

Payload CMSは、TypeScriptで構築されたオープンソースのヘッドレスCMSです。v3では、Next.js App Routerとの完全統合、パフォーマンスの大幅改善、開発者体験の向上が実現されました。

### v3の主な新機能

- **Next.js App Router完全統合**: 管理画面がNext.jsアプリ内に統合
- **ローカルAPI**: データベースへの直接アクセスで高速化
- **Drizzle ORMサポート**: PostgreSQL、SQLiteに対応
- **型の自動生成**: コレクション定義から型を自動生成
- **Lexical RichTextエディタ**: モダンなWYSIWYGエディタ
- **バージョン管理**: ドラフト、公開、履歴管理
- **国際化対応**: 多言語コンテンツの管理

## インストールとセットアップ

### 新規プロジェクト作成

```bash
# Create Next.js + Payload プロジェクト
npx create-payload-app@latest my-cms

# 対話形式で設定
# - Next.js App Router を選択
# - データベース: PostgreSQL or MongoDB
# - テンプレート: Blank または Blog Template
```

### 既存Next.jsプロジェクトに追加

```bash
# 依存関係をインストール
npm install payload @payloadcms/db-postgres @payloadcms/richtext-lexical @payloadcms/next

# または
pnpm add payload @payloadcms/db-postgres @payloadcms/richtext-lexical @payloadcms/next
```

### Payload設定ファイル

```typescript
// payload.config.ts

import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'

export default buildConfig({
  // 管理画面のルート
  admin: {
    user: 'users',
    // Next.jsと統合
    importMap: {
      baseDir: path.resolve(import.meta.dirname),
    },
  },

  // コレクション定義
  collections: [
    // 後述
  ],

  // データベース設定
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),

  // リッチテキストエディタ
  editor: lexicalEditor(),

  // TypeScript型生成
  typescript: {
    outputFile: path.resolve(import.meta.dirname, 'payload-types.ts'),
  },

  // アップロード先
  upload: {
    limits: {
      fileSize: 5000000, // 5MB
    },
  },
})
```

### Next.js統合

```typescript
// app/(payload)/layout.tsx

import './custom.scss'
import { RootLayout } from '@payloadcms/next/layouts'
import React from 'react'
import { importMap } from './admin/importMap'
import config from '@payload-config'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootLayout config={config} importMap={importMap}>
      {children}
    </RootLayout>
  )
}
```

```typescript
// app/(payload)/admin/[[...segments]]/page.tsx

import { AdminView } from '@payloadcms/next/views'
import { Metadata } from 'next'
import config from '@payload-config'

export const generateMetadata = (): Metadata => {
  return {
    title: 'Payload Admin',
  }
}

export default AdminView({ config })
```

## コレクション定義

Payloadの核となるのがコレクション定義です。

### 基本的なコレクション

```typescript
// collections/Posts.ts

import { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'createdAt'],
  },

  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },

  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 200,
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
    },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
      admin: {
        position: 'sidebar',
      },
    },
  ],

  versions: {
    drafts: true,
  },
}
```

### メディアコレクション

```typescript
// collections/Media.ts

import { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',

  upload: {
    staticDir: 'media',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 1024,
        position: 'centre',
      },
      {
        name: 'tablet',
        width: 1024,
        height: undefined,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*'],
  },

  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'caption',
      type: 'textarea',
    },
  ],
}
```

### カテゴリーコレクション

```typescript
// collections/Categories.ts

import { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',

  admin: {
    useAsTitle: 'name',
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        description: '親カテゴリーを選択（空の場合はトップレベル）',
      },
    },
  ],
}
```

## TypeScript型生成

Payload v3では、コレクション定義から自動的にTypeScript型を生成します。

```bash
# 型を生成
payload generate:types
```

生成された型を使用:

```typescript
// app/blog/[slug]/page.tsx

import { Post, Media } from '@/payload-types'

interface PageProps {
  params: { slug: string }
}

async function getPost(slug: string): Promise<Post | null> {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'posts',
    where: {
      slug: { equals: slug },
    },
    limit: 1,
  })

  return result.docs[0] || null
}

export default async function BlogPostPage({ params }: PageProps) {
  const post = await getPost(params.slug)

  if (!post) {
    notFound()
  }

  const featuredImage = post.featuredImage as Media

  return (
    <article>
      <h1>{post.title}</h1>
      {featuredImage && (
        <img src={featuredImage.url} alt={featuredImage.alt} />
      )}
      <div>{post.content}</div>
    </article>
  )
}
```

## ローカルAPIの使用

v3の最大の特徴の一つがローカルAPIです。REST APIを介さず、直接データベースにアクセスできます。

```typescript
// app/blog/page.tsx

import { getPayload } from 'payload'
import config from '@payload-config'

export const revalidate = 60 // 60秒キャッシュ

async function getPosts() {
  const payload = await getPayload({ config })

  const posts = await payload.find({
    collection: 'posts',
    where: {
      status: { equals: 'published' },
    },
    sort: '-publishedAt',
    limit: 10,
  })

  return posts.docs
}

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <div>
      <h1>Blog</h1>
      <div className="grid gap-6">
        {posts.map((post) => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
            <a href={`/blog/${post.slug}`}>Read more</a>
          </article>
        ))}
      </div>
    </div>
  )
}
```

### 高度なクエリ

```typescript
// 複雑な条件でのフィルタリング
const posts = await payload.find({
  collection: 'posts',
  where: {
    and: [
      {
        status: { equals: 'published' },
      },
      {
        or: [
          {
            'categories.slug': { equals: 'technology' },
          },
          {
            tags: { contains: 'javascript' },
          },
        ],
      },
      {
        publishedAt: {
          greater_than: new Date('2024-01-01'),
        },
      },
    ],
  },
  depth: 2, // リレーション深度
  limit: 20,
  page: 1,
})

// 集計
const count = await payload.count({
  collection: 'posts',
  where: {
    status: { equals: 'published' },
  },
})

// 作成
const newPost = await payload.create({
  collection: 'posts',
  data: {
    title: 'New Post',
    slug: 'new-post',
    content: 'Content here...',
    status: 'draft',
    author: userId,
  },
})

// 更新
await payload.update({
  collection: 'posts',
  id: postId,
  data: {
    status: 'published',
    publishedAt: new Date(),
  },
})

// 削除
await payload.delete({
  collection: 'posts',
  id: postId,
})
```

## Lexicalリッチテキストエディタ

v3では、新しいLexicalエディタがデフォルトです。

### カスタムブロック

```typescript
// collections/Posts.ts

import {
  BlocksFeature,
  BoldTextFeature,
  ItalicTextFeature,
  LinkFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

export const Posts: CollectionConfig = {
  // ...
  fields: [
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          BoldTextFeature(),
          ItalicTextFeature(),
          LinkFeature(),
          BlocksFeature({
            blocks: [
              {
                slug: 'callout',
                fields: [
                  {
                    name: 'type',
                    type: 'select',
                    options: ['info', 'warning', 'error', 'success'],
                    defaultValue: 'info',
                  },
                  {
                    name: 'content',
                    type: 'textarea',
                    required: true,
                  },
                ],
              },
              {
                slug: 'codeBlock',
                fields: [
                  {
                    name: 'language',
                    type: 'select',
                    options: ['javascript', 'typescript', 'python', 'html', 'css'],
                  },
                  {
                    name: 'code',
                    type: 'textarea',
                    required: true,
                  },
                ],
              },
            ],
          }),
        ],
      }),
    },
  ],
}
```

### リッチテキストのレンダリング

```typescript
// components/RichText.tsx

import React from 'react'
import { serializeLexical } from '@payloadcms/richtext-lexical/react'

interface RichTextProps {
  content: any
}

export function RichText({ content }: RichTextProps) {
  const html = serializeLexical({ nodes: content.root.children })

  return (
    <div
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

## アクセス制御

細かいアクセス制御が可能です。

```typescript
// collections/Posts.ts

export const Posts: CollectionConfig = {
  // ...
  access: {
    // 公開済み記事は誰でも読める
    read: ({ req: { user } }) => {
      if (user) return true

      return {
        status: { equals: 'published' },
      }
    },

    // ログインユーザーのみ作成可能
    create: ({ req: { user } }) => !!user,

    // 作成者または管理者のみ更新可能
    update: ({ req: { user } }) => {
      if (!user) return false

      if (user.role === 'admin') return true

      return {
        author: { equals: user.id },
      }
    },

    // 管理者のみ削除可能
    delete: ({ req: { user } }) => {
      return user?.role === 'admin'
    },
  },

  // フィールドレベルのアクセス制御
  fields: [
    {
      name: 'internalNotes',
      type: 'textarea',
      access: {
        read: ({ req: { user } }) => user?.role === 'admin',
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
  ],
}
```

## Hooks（ライフサイクルイベント）

```typescript
// collections/Posts.ts

export const Posts: CollectionConfig = {
  // ...
  hooks: {
    // 作成前
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation === 'create') {
          // 作成者を自動設定
          data.author = req.user.id

          // スラッグが未設定なら生成
          if (!data.slug && data.title) {
            data.slug = slugify(data.title)
          }
        }

        return data
      },
    ],

    // 作成後
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation === 'create' || operation === 'update') {
          // 検索インデックスを更新
          await updateSearchIndex(doc)

          // 通知を送信
          if (doc.status === 'published') {
            await sendNotification({
              title: `New post: ${doc.title}`,
              url: `/blog/${doc.slug}`,
            })
          }
        }
      },
    ],

    // 削除後
    afterDelete: [
      async ({ doc }) => {
        // 関連データをクリーンアップ
        await cleanupRelatedData(doc.id)
      },
    ],
  },
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

## グローバル設定

サイト全体の設定を管理できます。

```typescript
// globals/Settings.ts

import { GlobalConfig } from 'payload'

export const Settings: GlobalConfig = {
  slug: 'settings',

  access: {
    read: () => true,
    update: ({ req: { user } }) => user?.role === 'admin',
  },

  fields: [
    {
      name: 'siteName',
      type: 'text',
      required: true,
    },
    {
      name: 'siteDescription',
      type: 'textarea',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'socialLinks',
      type: 'group',
      fields: [
        { name: 'twitter', type: 'text' },
        { name: 'github', type: 'text' },
        { name: 'linkedin', type: 'text' },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'metaTitle', type: 'text' },
        { name: 'metaDescription', type: 'textarea' },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
```

使用例:

```typescript
// app/layout.tsx

import { getPayload } from 'payload'
import config from '@payload-config'

async function getSettings() {
  const payload = await getPayload({ config })
  return await payload.findGlobal({ slug: 'settings' })
}

export default async function RootLayout({ children }) {
  const settings = await getSettings()

  return (
    <html>
      <head>
        <title>{settings.siteName}</title>
        <meta name="description" content={settings.siteDescription} />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

## まとめ

Payload CMS v3は、Next.js App Routerとの完全統合により、これまで以上に強力で使いやすいヘッドレスCMSになりました。以下のような特徴があります:

- **TypeScript完全対応**: 型安全なCMS開発
- **Next.js統合**: サーバーコンポーネントで直接データ取得
- **柔軟なデータモデル**: コレクション、グローバル、リレーション
- **強力なアクセス制御**: きめ細かい権限管理
- **バージョン管理**: ドラフト、公開、履歴
- **拡張性**: Hooks、カスタムフィールド、プラグイン

従来のCMSと比較して、開発者体験が圧倒的に優れており、TypeScriptの型安全性を活かした開発が可能です。ぜひPayload CMS v3を使って、モダンなコンテンツ管理システムを構築してみてください!
