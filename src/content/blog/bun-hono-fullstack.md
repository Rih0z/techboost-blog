---
title: 'Bun + Hono フルスタック開発ガイド: 超高速ランタイムとEdge対応フレームワークで次世代Web開発'
description: 'BunとHonoを組み合わせたフルスタックアプリケーション開発の完全ガイド。データベース連携、認証、ファイルアップロード、Edge展開まで実践的に解説。'
pubDate: 2025-07-10
updatedDate: 2025-07-10
tags: ['Bun', 'Hono', 'フルスタック', 'Edge Computing', 'TypeScript']
heroImage: '../../assets/thumbnails/bun-hono-fullstack.jpg'
---

BunとHonoの組み合わせは、高速起動・軽量・シンプルな次世代フルスタック開発を実現します。

本記事では、Bun + Honoでデータベース連携、認証、ファイルアップロード、Edge展開まで、実践的なフルスタックアプリケーション開発を徹底解説します。

## なぜBun + Honoなのか

### Bunの特徴

- **超高速起動**: Node.jsの3倍以上の起動速度
- **オールインワン**: ランタイム、バンドラー、パッケージマネージャー、テストランナー
- **Web標準準拠**: Fetch API、WebSocket、Streams対応
- **TypeScript標準サポート**: トランスパイル不要

### Honoの特徴

- **超軽量**: ~12KB（gzip圧縮時）
- **高速ルーティング**: RegExpRouterで最速クラス
- **マルチランタイム**: Bun、Deno、Node.js、Cloudflare Workers、Vercel Edge対応
- **豊富なミドルウェア**: 認証、CORS、圧縮、ロギングなど

### 組み合わせのメリット

- **開発体験の向上**: 高速な開発サイクル
- **デプロイの柔軟性**: ローカル→Edge環境へシームレスに移行
- **パフォーマンス**: 低レイテンシ・高スループット
- **型安全性**: End-to-endでTypeScript

## プロジェクトセットアップ

### Bunのインストール

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"

# バージョン確認
bun --version
```

### プロジェクト作成

```bash
# プロジェクト初期化
mkdir bun-hono-app
cd bun-hono-app
bun init -y

# Honoのインストール
bun add hono

# 開発用依存関係
bun add -d @types/bun
```

## 基本的なサーバー構築

### シンプルなAPIサーバー

```typescript
// src/index.ts
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
    return c.json({ message: 'Hello Bun + Hono!' });
});

app.get('/api/users', (c) => {
    const users = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
    ];
    return c.json(users);
});

app.post('/api/users', async (c) => {
    const body = await c.req.json();
    // バリデーション、DB保存など
    return c.json({ success: true, data: body }, 201);
});

export default {
    port: 3000,
    fetch: app.fetch,
};
```

### サーバー起動

```bash
# 開発モード（ホットリロード）
bun --watch src/index.ts

# 本番モード
bun src/index.ts
```

## ルーティングとミドルウェア

### RESTful APIの構成

```typescript
// src/index.ts
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { userRoutes } from './routes/users';
import { postRoutes } from './routes/posts';

const app = new Hono();

// グローバルミドルウェア
app.use('*', logger());
app.use('*', cors());
app.use('*', prettyJSON());

// ルート
app.route('/api/users', userRoutes);
app.route('/api/posts', postRoutes);

// エラーハンドリング
app.onError((err, c) => {
    console.error(err);
    return c.json({ error: err.message }, 500);
});

// 404
app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404);
});

export default {
    port: 3000,
    fetch: app.fetch,
};
```

### ルートの分離

```typescript
// src/routes/users.ts
import { Hono } from 'hono';

export const userRoutes = new Hono();

userRoutes.get('/', async (c) => {
    // ユーザー一覧取得
    const users = await getUsers();
    return c.json(users);
});

userRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');
    const user = await getUserById(id);

    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
});

userRoutes.post('/', async (c) => {
    const body = await c.req.json();
    const newUser = await createUser(body);
    return c.json(newUser, 201);
});

userRoutes.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const updatedUser = await updateUser(id, body);
    return c.json(updatedUser);
});

userRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id');
    await deleteUser(id);
    return c.json({ success: true });
});
```

## データベース連携

### Bun:SQLiteの使用

```typescript
// src/db.ts
import { Database } from 'bun:sqlite';

export const db = new Database('app.db');

// マイグレーション
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        published BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`);
```

### CRUD操作

```typescript
// src/models/user.ts
import { db } from '../db';

interface User {
    id?: number;
    name: string;
    email: string;
    password: string;
}

export const getUsers = () => {
    const query = db.query('SELECT id, name, email, created_at FROM users');
    return query.all();
};

export const getUserById = (id: string) => {
    const query = db.query('SELECT id, name, email, created_at FROM users WHERE id = ?');
    return query.get(id);
};

export const createUser = async (user: User) => {
    const hashedPassword = await Bun.password.hash(user.password);

    const query = db.query(`
        INSERT INTO users (name, email, password)
        VALUES (?, ?, ?)
    `);

    query.run(user.name, user.email, hashedPassword);

    return getUserById(String(db.query('SELECT last_insert_rowid()').get()));
};

export const updateUser = (id: string, user: Partial<User>) => {
    const query = db.query(`
        UPDATE users
        SET name = COALESCE(?, name),
            email = COALESCE(?, email)
        WHERE id = ?
    `);

    query.run(user.name, user.email, id);
    return getUserById(id);
};

export const deleteUser = (id: string) => {
    const query = db.query('DELETE FROM users WHERE id = ?');
    query.run(id);
};
```

### Drizzle ORMとの統合

```bash
bun add drizzle-orm
bun add -d drizzle-kit
```

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const posts = sqliteTable('posts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id),
    title: text('title').notNull(),
    content: text('content').notNull(),
    published: integer('published', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';

const sqlite = new Database('app.db');
export const db = drizzle(sqlite, { schema });
```

```typescript
// src/models/user.drizzle.ts
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const getUsers = async () => {
    return await db.select().from(users);
};

export const getUserById = async (id: number) => {
    return await db.select().from(users).where(eq(users.id, id)).limit(1);
};

export const createUser = async (user: typeof users.$inferInsert) => {
    return await db.insert(users).values(user).returning();
};
```

## 認証とJWT

### JWT認証の実装

```bash
bun add jsonwebtoken
bun add -d @types/jsonwebtoken
```

```typescript
// src/middleware/auth.ts
import { verify } from 'jsonwebtoken';
import { Context, Next } from 'hono';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);

    try {
        const decoded = verify(token, JWT_SECRET);
        c.set('user', decoded);
        await next();
    } catch (error) {
        return c.json({ error: 'Invalid token' }, 401);
    }
};
```

```typescript
// src/routes/auth.ts
import { Hono } from 'hono';
import { sign } from 'jsonwebtoken';
import { getUserByEmail } from '../models/user';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authRoutes = new Hono();

authRoutes.post('/login', async (c) => {
    const { email, password } = await c.req.json();

    const user = await getUserByEmail(email);
    if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Bunの組み込みパスワード検証
    const isValid = await Bun.password.verify(password, user.password);
    if (!isValid) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    const token = sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    return c.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

authRoutes.post('/register', async (c) => {
    const { name, email, password } = await c.req.json();

    const hashedPassword = await Bun.password.hash(password);

    const newUser = await createUser({
        name,
        email,
        password: hashedPassword,
    });

    return c.json({ success: true, user: newUser }, 201);
});
```

### 保護されたルート

```typescript
// src/index.ts
import { authMiddleware } from './middleware/auth';

app.use('/api/posts/*', authMiddleware);

app.get('/api/posts', async (c) => {
    const user = c.get('user');
    const posts = await getPostsByUserId(user.id);
    return c.json(posts);
});
```

## ファイルアップロード

### Bunのファイル処理

```typescript
// src/routes/upload.ts
import { Hono } from 'hono';
import { mkdir } from 'node:fs/promises';

export const uploadRoutes = new Hono();

uploadRoutes.post('/upload', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'] as File;

    if (!file) {
        return c.json({ error: 'No file uploaded' }, 400);
    }

    // アップロードディレクトリ作成
    await mkdir('./uploads', { recursive: true });

    // ファイル名生成（ユニーク化）
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filepath = `./uploads/${filename}`;

    // ファイル保存
    await Bun.write(filepath, file);

    return c.json({
        success: true,
        filename,
        size: file.size,
        type: file.type,
        url: `/uploads/${filename}`,
    });
});

// 静的ファイル配信
uploadRoutes.get('/:filename', async (c) => {
    const filename = c.req.param('filename');
    const file = Bun.file(`./uploads/${filename}`);

    if (!(await file.exists())) {
        return c.json({ error: 'File not found' }, 404);
    }

    return new Response(file);
});
```

### 画像リサイズ（Sharp使用）

```bash
bun add sharp
```

```typescript
import sharp from 'sharp';

uploadRoutes.post('/upload/image', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'] as File;

    if (!file || !file.type.startsWith('image/')) {
        return c.json({ error: 'Invalid image file' }, 400);
    }

    const buffer = await file.arrayBuffer();
    const filename = `${Date.now()}-${file.name}`;

    // オリジナル保存
    await Bun.write(`./uploads/${filename}`, buffer);

    // サムネイル生成
    const thumbnail = await sharp(Buffer.from(buffer))
        .resize(200, 200, { fit: 'cover' })
        .toBuffer();

    await Bun.write(`./uploads/thumb-${filename}`, thumbnail);

    return c.json({
        success: true,
        original: `/uploads/${filename}`,
        thumbnail: `/uploads/thumb-${filename}`,
    });
});
```

## バリデーション

### Zodとの統合

```bash
bun add zod
```

```typescript
// src/validators/user.ts
import { z } from 'zod';

export const createUserSchema = z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    password: z.string().min(8),
});

export const updateUserSchema = z.object({
    name: z.string().min(2).max(50).optional(),
    email: z.string().email().optional(),
});
```

```typescript
// src/middleware/validator.ts
import { Context, Next } from 'hono';
import { ZodSchema } from 'zod';

export const validator = (schema: ZodSchema) => {
    return async (c: Context, next: Next) => {
        try {
            const body = await c.req.json();
            const validated = schema.parse(body);
            c.set('validated', validated);
            await next();
        } catch (error) {
            return c.json({ error: 'Validation failed', details: error.errors }, 400);
        }
    };
};
```

```typescript
// src/routes/users.ts
import { validator } from '../middleware/validator';
import { createUserSchema } from '../validators/user';

userRoutes.post('/', validator(createUserSchema), async (c) => {
    const validated = c.get('validated');
    const newUser = await createUser(validated);
    return c.json(newUser, 201);
});
```

## Edge環境への展開

### Cloudflare Workersへのデプロイ

```bash
bun add -d wrangler
```

```toml
# wrangler.toml
name = "bun-hono-app"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"
```

```typescript
// src/index.ts（Cloudflare Workers版）
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
    return c.json({ message: 'Running on Cloudflare Workers!' });
});

export default app;
```

デプロイ:

```bash
bunx wrangler deploy
```

### Vercel Edge Functionsへのデプロイ

```bash
bun add -d @vercel/node
```

```json
// vercel.json
{
    "functions": {
        "api/**/*.ts": {
            "runtime": "edge"
        }
    }
}
```

## テスト

### Bunの組み込みテストランナー

```typescript
// src/index.test.ts
import { describe, test, expect } from 'bun:test';
import app from './index';

describe('API Tests', () => {
    test('GET /', async () => {
        const res = await app.request('/');
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.message).toBe('Hello Bun + Hono!');
    });

    test('GET /api/users', async () => {
        const res = await app.request('/api/users');
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
    });
});
```

テスト実行:

```bash
bun test
```

## まとめ

Bun + Honoでのフルスタック開発を解説しました。

### キーポイント

- **Bun**: 超高速ランタイム、オールインワンツール
- **Hono**: 軽量・高速・マルチランタイム対応
- **型安全**: End-to-endでTypeScript
- **Edge Ready**: Cloudflare Workers、Vercel Edge対応

### ベストプラクティス

1. **Drizzle ORM**: 型安全なデータベース操作
2. **Zod**: ランタイムバリデーション
3. **JWT**: ステートレス認証
4. **ミドルウェア**: 共通処理の分離

Bun + Honoで次世代のWeb開発を始めましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
