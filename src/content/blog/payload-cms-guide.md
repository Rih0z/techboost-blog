---
title: 'Payload CMS完全ガイド：Next.jsと統合するヘッドレスCMS'
description: 'Payload CMSの基本からコレクション定義、カスタムフィールド、Next.jsとの統合、セルフホスティングまで徹底解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 'Feb 05 2026'
tags: ['Payload CMS', 'Next.js', 'TypeScript', 'CMS', 'ヘッドレスCMS']
---
# Payload CMS完全ガイド：Next.jsと統合するヘッドレスCMS

ヘッドレスCMSは、コンテンツ管理とフロントエンドを分離し、柔軟なWebアプリケーション開発を可能にします。Payload CMSは、TypeScriptで構築された次世代のヘッドレスCMSで、開発者体験とカスタマイズ性に優れています。

この記事では、Payload CMSの基本からNext.jsとの統合、実践的な活用方法まで詳しく解説します。

## Payload CMSとは

Payload CMSは、オープンソースのヘッドレスCMSで、TypeScriptとReactで構築されています。コード優先のアプローチを採用し、開発者が完全な制御を持ちながらも、強力な管理画面を提供します。

### 主な特徴

- **TypeScriptファースト**: 完全な型安全性
- **コードベース設定**: GUIではなくコードで設定
- **ローカルAPI**: データベースを直接操作可能
- **認証・認可**: 組み込みのユーザー管理とアクセス制御
- **ファイルアップロード**: 画像最適化とクラウドストレージ対応
- **GraphQL & REST API**: 両方をサポート
- **バージョン管理**: コンテンツの履歴管理とドラフト機能
- **フック**: カスタムロジックを追加可能
- **完全カスタマイズ可能**: 管理画面もカスタマイズ可能

### 競合との比較

**Payload vs Strapi**
- Payloadは型安全性が高い（TypeScript）
- Strapiは大規模なプラグインエコシステム
- Payloadはコード優先、Strapiはより多くのGUI設定

**Payload vs Contentful**
- Contentfulはホスト型、Payloadはセルフホスト
- Payloadは無料でフル機能、Contentfulは従量課金
- Payloadはデータベースを完全制御可能

**Payload vs Sanity**
- Sanityはリアルタイム編集に強い
- Payloadはより伝統的なCMS体験
- Payloadはバックエンドロジックの統合が容易

## セットアップ

### インストール

新しいPayloadプロジェクトを作成します。

```bash
npx create-payload-app@latest my-payload-app
```

対話式のセットアップが始まります。

```
? Choose database: PostgreSQL
? Choose template: Blank
? Use TypeScript?: Yes
```

既存のNext.jsプロジェクトに追加する場合：

```bash
npm install payload @payloadcms/db-postgres @payloadcms/richtext-slate
```

### プロジェクト構造

```
my-payload-app/
├── src/
│   ├── payload.config.ts   # Payload設定
│   ├── collections/        # コレクション定義
│   ├── globals/            # グローバル設定
│   ├── access/             # アクセス制御
│   └── server.ts           # サーバーエントリポイント
├── media/                  # アップロードファイル
└── .env
```

### 基本設定

```typescript
// src/payload.config.ts
import { buildConfig } from 'payload/config';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { slateEditor } from '@payloadcms/richtext-slate';
import path from 'path';

export default buildConfig({
  // 管理画面の設定
  admin: {
    user: 'users',
    meta: {
      titleSuffix: '- My CMS',
      favicon: '/favicon.ico',
    },
  },

  // データベース設定
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),

  // リッチテキストエディタ
  editor: slateEditor({}),

  // コレクション
  collections: [],

  // グローバル設定
  globals: [],

  // TypeScript設定
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },

  // 静的ファイル
  upload: {
    limits: {
      fileSize: 5000000, // 5MB
    },
  },

  // CORS設定
  cors: [
    'http://localhost:3000',
    'https://yourdomain.com',
  ],

  // CSRF保護
  csrf: [
    'http://localhost:3000',
    'https://yourdomain.com',
  ],
});
```

### 環境変数

```.env
DATABASE_URL=postgresql://user:password@localhost:5432/payload
PAYLOAD_SECRET=your-secret-key-min-32-characters
```

## コレクション定義

コレクションは、データベースのテーブルに相当します。

### 基本的なコレクション

```typescript
// src/collections/Posts.ts
import { CollectionConfig } from 'payload/types';

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'status', 'createdAt'],
  },
  access: {
    read: () => true,
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
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'publishedDate',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
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
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'excerpt',
      type: 'textarea',
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
    },
  ],
};
```

### カスタムフィールドタイプ

Payloadは豊富なフィールドタイプを提供します。

```typescript
// src/collections/Products.ts
import { CollectionConfig } from 'payload/types';

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'currency',
      type: 'select',
      options: ['USD', 'EUR', 'JPY'],
      defaultValue: 'USD',
    },
    {
      name: 'inStock',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'variants',
      type: 'array',
      fields: [
        {
          name: 'size',
          type: 'select',
          options: ['S', 'M', 'L', 'XL'],
        },
        {
          name: 'color',
          type: 'text',
        },
        {
          name: 'sku',
          type: 'text',
          required: true,
        },
        {
          name: 'stock',
          type: 'number',
          min: 0,
        },
      ],
    },
    {
      name: 'specifications',
      type: 'group',
      fields: [
        {
          name: 'weight',
          type: 'number',
        },
        {
          name: 'dimensions',
          type: 'group',
          fields: [
            { name: 'width', type: 'number' },
            { name: 'height', type: 'number' },
            { name: 'depth', type: 'number' },
          ],
        },
        {
          name: 'material',
          type: 'text',
        },
      ],
    },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'alt',
          type: 'text',
        },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'keywords',
          type: 'text',
        },
      ],
    },
  ],
};
```

### メディアコレクション

```typescript
// src/collections/Media.ts
import { CollectionConfig } from 'payload/types';
import path from 'path';

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: path.resolve(__dirname, '../../media'),
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
      type: 'text',
    },
  ],
};
```

## アクセス制御

Payloadは柔軟なアクセス制御システムを提供します。

### 基本的なアクセス制御

```typescript
// src/access/isAdmin.ts
import { Access } from 'payload/types';

export const isAdmin: Access = ({ req: { user } }) => {
  return Boolean(user?.role === 'admin');
};
```

```typescript
// src/access/isAdminOrPublished.ts
import { Access } from 'payload/types';

export const isAdminOrPublished: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') {
    return true;
  }

  return {
    status: {
      equals: 'published',
    },
  };
};
```

### フィールドレベルのアクセス制御

```typescript
// src/collections/Posts.ts
import { CollectionConfig } from 'payload/types';
import { isAdmin } from '../access/isAdmin';
import { isAdminOrPublished } from '../access/isAdminOrPublished';

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    read: isAdminOrPublished,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      access: {
        read: isAdmin,
        update: isAdmin,
      },
    },
    {
      name: 'status',
      type: 'select',
      options: ['draft', 'published'],
      defaultValue: 'draft',
      access: {
        create: isAdmin,
        update: isAdmin,
      },
    },
  ],
};
```

### 行レベルのアクセス制御

```typescript
// src/collections/Comments.ts
import { CollectionConfig } from 'payload/types';

export const Comments: CollectionConfig = {
  slug: 'comments',
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') return true;

      return {
        author: {
          equals: user?.id,
        },
      };
    },
    delete: ({ req: { user } }) => {
      if (user?.role === 'admin') return true;

      return {
        author: {
          equals: user?.id,
        },
      };
    },
  },
  fields: [
    {
      name: 'content',
      type: 'textarea',
      required: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
    },
  ],
};
```

## フック

フックを使用して、データのライフサイクルにカスタムロジックを追加できます。

### beforeChange フック

```typescript
// src/collections/Posts.ts
import { CollectionConfig } from 'payload/types';
import { slugify } from '../utils/slugify';

export const Posts: CollectionConfig = {
  slug: 'posts',
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create' || operation === 'update') {
          if (data.title && !data.slug) {
            data.slug = slugify(data.title);
          }
        }
        return data;
      },
    ],
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
      unique: true,
      index: true,
    },
  ],
};
```

### afterChange フック

```typescript
// src/collections/Posts.ts
import { CollectionConfig } from 'payload/types';

export const Posts: CollectionConfig = {
  slug: 'posts',
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation }) => {
        // 公開ステータスが変更されたら通知
        if (
          operation === 'update' &&
          doc.status === 'published' &&
          previousDoc.status === 'draft'
        ) {
          await sendNotification({
            to: doc.author.email,
            subject: 'Your post has been published!',
            message: `Your post "${doc.title}" is now live.`,
          });
        }
        return doc;
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: ['draft', 'published'],
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
    },
  ],
};
```

### beforeValidate フック

```typescript
// src/collections/Users.ts
import { CollectionConfig } from 'payload/types';
import bcrypt from 'bcrypt';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (operation === 'create' || operation === 'update') {
          if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
          }
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'password',
      type: 'text',
      required: true,
    },
  ],
};
```

## グローバル設定

グローバル設定は、サイト全体で使用する単一のドキュメントです。

```typescript
// src/globals/SiteSettings.ts
import { GlobalConfig } from 'payload/types';

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      required: true,
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'footer',
      type: 'group',
      fields: [
        {
          name: 'copyright',
          type: 'text',
        },
        {
          name: 'socialLinks',
          type: 'array',
          fields: [
            {
              name: 'platform',
              type: 'select',
              options: ['twitter', 'facebook', 'instagram', 'linkedin'],
            },
            {
              name: 'url',
              type: 'text',
            },
          ],
        },
      ],
    },
    {
      name: 'navigation',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'type',
          type: 'radio',
          options: [
            { label: 'Internal Link', value: 'internal' },
            { label: 'External Link', value: 'external' },
          ],
          defaultValue: 'internal',
        },
        {
          name: 'page',
          type: 'relationship',
          relationTo: 'pages',
          admin: {
            condition: (data) => data.type === 'internal',
          },
        },
        {
          name: 'url',
          type: 'text',
          admin: {
            condition: (data) => data.type === 'external',
          },
        },
      ],
    },
  ],
};
```

設定に追加：

```typescript
// src/payload.config.ts
import { SiteSettings } from './globals/SiteSettings';

export default buildConfig({
  // ...
  globals: [SiteSettings],
});
```

## Next.jsとの統合

### Payloadをサブパスで実行

```typescript
// src/payload.config.ts
export default buildConfig({
  admin: {
    user: 'users',
    // 管理画面を /admin で提供
    meta: {
      titleSuffix: '- My CMS',
    },
  },
  // ...
});
```

### Next.js App Routerで統合

```typescript
// app/api/[...slug]/route.ts
import { getPayloadClient } from '@/lib/payload';
import { NextRequest, NextResponse } from 'next/server';

const payload = await getPayloadClient();

export async function GET(request: NextRequest) {
  return payload.handler(request);
}

export async function POST(request: NextRequest) {
  return payload.handler(request);
}
```

### データ取得

```typescript
// app/blog/page.tsx
import { getPayloadClient } from '@/lib/payload';

export default async function BlogPage() {
  const payload = await getPayloadClient();

  const posts = await payload.find({
    collection: 'posts',
    where: {
      status: {
        equals: 'published',
      },
    },
    sort: '-publishedDate',
    limit: 10,
  });

  return (
    <div>
      <h1>Blog</h1>
      {posts.docs.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          <a href={`/blog/${post.slug}`}>Read more</a>
        </article>
      ))}
    </div>
  );
}
```

### 動的ルート

```typescript
// app/blog/[slug]/page.tsx
import { getPayloadClient } from '@/lib/payload';
import { notFound } from 'next/navigation';

interface Props {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  const payload = await getPayloadClient();
  const posts = await payload.find({
    collection: 'posts',
    limit: 1000,
  });

  return posts.docs.map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage({ params }: Props) {
  const payload = await getPayloadClient();

  const posts = await payload.find({
    collection: 'posts',
    where: {
      slug: {
        equals: params.slug,
      },
    },
    limit: 1,
  });

  const post = posts.docs[0];

  if (!post) {
    notFound();
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <time>{new Date(post.publishedDate).toLocaleDateString()}</time>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

## ローカルAPI

ローカルAPIを使用すると、HTTP経由ではなく、データベースを直接操作できます。

```typescript
// lib/payload.ts
import payload from 'payload';

let cached = (global as any).payload;

if (!cached) {
  cached = (global as any).payload = { client: null, promise: null };
}

export async function getPayloadClient() {
  if (cached.client) {
    return cached.client;
  }

  if (!cached.promise) {
    cached.promise = payload.init({
      secret: process.env.PAYLOAD_SECRET!,
      local: true,
    });
  }

  try {
    cached.client = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.client;
}
```

### CRUD操作

```typescript
const payload = await getPayloadClient();

// Create
const newPost = await payload.create({
  collection: 'posts',
  data: {
    title: 'My New Post',
    slug: 'my-new-post',
    content: 'Hello, world!',
    author: userId,
    status: 'draft',
  },
});

// Read
const post = await payload.findByID({
  collection: 'posts',
  id: postId,
});

// Update
const updatedPost = await payload.update({
  collection: 'posts',
  id: postId,
  data: {
    status: 'published',
  },
});

// Delete
await payload.delete({
  collection: 'posts',
  id: postId,
});

// Find with query
const publishedPosts = await payload.find({
  collection: 'posts',
  where: {
    status: {
      equals: 'published',
    },
  },
  sort: '-createdAt',
  limit: 10,
  page: 1,
});
```

## セルフホスティング

### Dockerで実行

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: payload
      POSTGRES_USER: payload
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  payload:
    build: .
    environment:
      DATABASE_URL: postgresql://payload:password@postgres:5432/payload
      PAYLOAD_SECRET: your-secret-key-min-32-characters
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    volumes:
      - ./media:/app/media

volumes:
  postgres_data:
```

### Vercelデプロイ

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "DATABASE_URL": "@database-url",
    "PAYLOAD_SECRET": "@payload-secret"
  }
}
```

## まとめ

Payload CMSは、開発者体験とカスタマイズ性に優れたヘッドレスCMSです。主な利点は以下の通りです。

- **型安全性**: TypeScriptファーストな設計
- **柔軟性**: コードベースの設定で完全な制御
- **Next.js統合**: シームレスな統合とローカルAPI
- **セルフホスト**: データを完全に制御

コンテンツ管理システムを構築する際、Payload CMSは強力な選択肢です。Next.jsとの組み合わせで、高速で柔軟なWebアプリケーションを構築できます。
