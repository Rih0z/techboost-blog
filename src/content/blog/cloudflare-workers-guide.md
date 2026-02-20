---
title: 'Cloudflare Workers完全ガイド — Edge Computing・KV・D1・R2・Durable Objects'
description: 'Cloudflare WorkersでEdge Computingアプリを構築する完全ガイド。Workers基礎・KV Storage・D1 Database・R2 Storage・Durable Objects・Queue・Cron Triggers・Wrangler CLIまで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['Cloudflare Workers', 'Edge', 'TypeScript', 'KV', 'D1']
---

Cloudflare Workersは、世界330拠点以上のエッジロケーションでJavaScript/TypeScriptコードを実行できるEdge Computingプラットフォームだ。従来のサーバーレスとは一線を画す低レイテンシ・高スケーラビリティを実現し、KV Storage・D1 Database・R2 Storage・Durable Objectsといった豊富なバインディングで完結したアプリケーションを構築できる。本記事ではWrangler CLIのセットアップからプロダクション運用まで、実装コードを交えて徹底解説する。

---

## 1. Cloudflare Workersとは — Lambda・Vercel Edge Functionsとの比較

### Edge Computingの本質

従来のサーバーレス（AWS Lambda等）はリージョン単位でデプロイされる。ユーザーがap-northeast-1（東京）以外のリージョンにリクエストを投げた場合、物理的な距離によるレイテンシが生じる。一方、Cloudflare Workersはユーザーの最も近いCloudflareのPoP（Point of Presence）でコードを実行する。東京のユーザーには東京のPoP、ロンドンのユーザーにはロンドンのPoPが応答するため、グローバルで一貫した低レイテンシを実現できる。

### 主要プラットフォームの比較

| 項目 | Cloudflare Workers | AWS Lambda@Edge | Vercel Edge Functions |
|------|-------------------|-----------------|----------------------|
| ランタイム | V8 Isolate | Node.js | V8 Isolate |
| コールドスタート | ~0ms | 数百ms〜 | ~1ms |
| 実行場所 | 330+ PoP | CloudFront PoP | Vercel Edge Network |
| メモリ上限 | 128MB | 128MB | 128MB |
| CPU時間上限 | 30秒（有料） | 5秒 | 30秒 |
| 無料枠 | 10万req/日 | 100万req/月 | 100万req/月 |
| ストレージ | KV・D1・R2・DO | なし（別途AWSサービス） | 限定的 |
| WebSocket | Durable Objects | 非対応 | 非対応 |

### V8 IsolateとNode.jsの違い

CloudflareはNode.jsではなくV8 Isolateを採用している。Isolateはコンテナや仮想マシンより軽量で、複数のWorkerが同一プロセス内で安全に分離実行される。これがコールドスタートほぼゼロを実現する理由だ。

ただしNode.js APIの一部は使用できない制約もある。`fs`（ファイルシステム）・`child_process`・`net`などのNode.js固有モジュールは動作しない。一方でWeb標準API（`fetch`・`Request`・`Response`・`URL`・`crypto`・`WebSocket`）はフルサポートされている。

```typescript
// Workers環境でのグローバルAPI例
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  // Web標準のfetch API
  const data = await fetch('https://api.example.com/data');
  
  // Web Crypto API
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('hello world')
  );
  
  // URLパターンマッチング
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  return new Response(JSON.stringify({ path: pathname }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## 2. Wrangler CLIセットアップ・デプロイ

### インストールと初期設定

```bash
# Wrangler CLIをグローバルインストール
npm install -g wrangler

# バージョン確認
wrangler --version

# Cloudflareアカウントへのログイン
wrangler login
# ブラウザが開き、OAuthでCloudflareアカウントと連携される

# ログイン状態確認
wrangler whoami
```

### 新規プロジェクト作成

```bash
# テンプレートから作成
npm create cloudflare@latest my-worker
# → 対話式でテンプレートを選択（Hello World・API・etc.）

# または直接プロジェクト作成
wrangler init my-worker --type=javascript
wrangler init my-worker --type=typescript  # TypeScript推奨
```

### wrangler.toml設定ファイル

プロジェクトルートに配置する設定ファイルがWorkerの挙動を制御する。

```toml
# wrangler.toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# 環境変数（非機密）
[vars]
ENVIRONMENT = "production"
API_BASE_URL = "https://api.example.com"

# KV Namespace
[[kv_namespaces]]
binding = "MY_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"

# R2 Bucket
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"

# Queue Producer
[[queues.producers]]
binding = "MY_QUEUE"
queue = "my-queue"

# Queue Consumer
[[queues.consumers]]
queue = "my-queue"
max_batch_size = 10
max_batch_timeout = 5
max_retries = 3

# Cron Triggers
[triggers]
crons = ["0 * * * *", "*/5 * * * *"]

# ルートパターン（独自ドメイン利用時）
routes = [
  { pattern = "example.com/api/*", zone_name = "example.com" },
]

# ステージング環境
[env.staging]
name = "my-worker-staging"
vars = { ENVIRONMENT = "staging" }
kv_namespaces = [
  { binding = "MY_KV", id = "staging-kv-id" }
]
```

### デプロイコマンド

```bash
# ローカル開発サーバー起動
wrangler dev

# リモートリソースに接続してローカル開発
wrangler dev --remote

# 本番環境へデプロイ
wrangler deploy

# ステージング環境へデプロイ
wrangler deploy --env staging

# デプロイ済みWorkerのリスト
wrangler deployments list

# ロールバック
wrangler rollback

# ログのリアルタイム確認
wrangler tail

# シークレット設定（機密情報）
wrangler secret put API_KEY
# → プロンプトで値を入力（環境変数として暗号化保存）

# シークレット一覧
wrangler secret list
```

---

## 3. Workers基礎（Request/Response・fetch API・環境変数）

### モダンなExportデフォルト形式

Cloudflare WorkersはService Worker形式（`addEventListener`）とESM Exports形式の両方をサポートするが、TypeScript開発では後者が推奨される。

```typescript
// src/index.ts

export interface Env {
  // KV Namespace
  MY_KV: KVNamespace;
  // D1 Database
  DB: D1Database;
  // R2 Bucket
  MY_BUCKET: R2Bucket;
  // Queue
  MY_QUEUE: Queue;
  // 環境変数
  ENVIRONMENT: string;
  API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    
    // ルーティング（手動実装）
    if (pathname === '/api/hello') {
      return handleHello(request, env);
    }
    
    if (pathname.startsWith('/api/users')) {
      return handleUsers(request, env);
    }
    
    return new Response('Not Found', { status: 404 });
  },
  
  // Scheduled Handler（Cron Triggers用）
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await runScheduledTask(env);
  },
  
  // Queue Handler（Queue Consumer用）
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    await processQueueMessages(batch, env);
  },
};

async function handleHello(request: Request, env: Env): Promise<Response> {
  const name = new URL(request.url).searchParams.get('name') ?? 'World';
  
  return Response.json({
    message: `Hello, ${name}!`,
    environment: env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
}
```

### リクエスト処理の基本パターン

```typescript
async function handleUsers(request: Request, env: Env): Promise<Response> {
  const method = request.method;
  const url = new URL(request.url);
  
  // HTTPメソッドによる分岐
  switch (method) {
    case 'GET':
      return getUserList(env);
    
    case 'POST': {
      // リクエストボディのパース
      const contentType = request.headers.get('content-type') ?? '';
      
      if (contentType.includes('application/json')) {
        const body = await request.json<{ name: string; email: string }>();
        return createUser(body, env);
      }
      
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const name = formData.get('name') as string;
        return createUser({ name, email: '' }, env);
      }
      
      return new Response('Unsupported Content-Type', { status: 415 });
    }
    
    default:
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, POST' },
      });
  }
}

// CORSヘッダーを追加するユーティリティ
function withCors(response: Response, origin = '*'): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// 認証ミドルウェア
async function authenticate(request: Request, env: Env): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.slice(7);
  // JWTの検証など...
  return token === env.API_KEY ? 'authenticated-user' : null;
}
```

### サブリクエスト（fetch）

Workers内からの外部APIコールも通常のWeb標準`fetch`で行える。

```typescript
async function fetchExternalData(env: Env): Promise<Response> {
  // 並列リクエスト
  const [usersRes, postsRes] = await Promise.all([
    fetch('https://jsonplaceholder.typicode.com/users', {
      headers: { 'X-API-Key': env.API_KEY },
    }),
    fetch('https://jsonplaceholder.typicode.com/posts'),
  ]);
  
  if (!usersRes.ok || !postsRes.ok) {
    return new Response('Upstream error', { status: 502 });
  }
  
  const [users, posts] = await Promise.all([
    usersRes.json(),
    postsRes.json(),
  ]);
  
  return Response.json({ users, posts });
}
```

---

## 4. KV Storage（Key-Value・TTL・バルク操作）

KV（Key-Value）Storageはグローバルに分散したキーバリューストアだ。読み取りは低レイテンシだが、書き込みの全世界反映には最大60秒かかる（結果整合性）。セッション・キャッシュ・設定値の保存に最適。

### KV基本操作

```typescript
// KV Namespaceの作成
// $ wrangler kv namespace create MY_KV

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key') ?? 'default';
    
    // ===== 書き込み =====
    
    // 文字列を保存（TTL: 3600秒）
    await env.MY_KV.put('session:abc123', JSON.stringify({ userId: 1 }), {
      expirationTtl: 3600,
    });
    
    // 特定の日時に失効
    await env.MY_KV.put('temp-data', 'value', {
      expiration: Math.floor(Date.now() / 1000) + 86400, // 24時間後
    });
    
    // メタデータ付きで保存
    await env.MY_KV.put('user:1', JSON.stringify({ name: 'Alice' }), {
      metadata: { createdAt: Date.now(), version: 1 },
    });
    
    // ===== 読み取り =====
    
    // 文字列として取得
    const value = await env.MY_KV.get('session:abc123');
    
    // JSONとして取得
    const userData = await env.MY_KV.get<{ name: string }>('user:1', 'json');
    
    // ArrayBufferとして取得（バイナリデータ）
    const binaryData = await env.MY_KV.get('binary-key', 'arrayBuffer');
    
    // メタデータと一緒に取得
    const { value: val, metadata } = await env.MY_KV.getWithMetadata<
      { name: string },
      { createdAt: number; version: number }
    >('user:1', 'json');
    
    // ===== 削除 =====
    await env.MY_KV.delete('session:abc123');
    
    // ===== 一覧取得 =====
    
    // キープレフィックスでフィルタリング
    const listResult = await env.MY_KV.list({ prefix: 'user:', limit: 100 });
    const keys = listResult.keys; // { name, expiration?, metadata? }[]
    const isComplete = !listResult.list_complete;
    
    // カーソルを使ったページネーション
    let cursor: string | undefined;
    const allKeys: KVNamespaceListKey<unknown>[] = [];
    
    do {
      const result = await env.MY_KV.list({ prefix: 'user:', cursor, limit: 1000 });
      allKeys.push(...result.keys);
      cursor = result.list_complete ? undefined : result.cursor;
    } while (cursor);
    
    return Response.json({
      userData,
      metadata,
      keyCount: allKeys.length,
    });
  },
};

// キャッシュレイヤーとしてKVを活用
async function cachedFetch(
  cacheKey: string,
  fetcher: () => Promise<unknown>,
  env: Env,
  ttl = 300
): Promise<unknown> {
  // キャッシュを確認
  const cached = await env.MY_KV.get(cacheKey, 'json');
  if (cached !== null) {
    return cached;
  }
  
  // キャッシュミス → データ取得
  const data = await fetcher();
  
  // KVに保存
  await env.MY_KV.put(cacheKey, JSON.stringify(data), {
    expirationTtl: ttl,
  });
  
  return data;
}
```

### KVを使ったレートリミッター

```typescript
async function rateLimiter(
  clientId: string,
  limit: number,
  windowSeconds: number,
  env: Env
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rate-limit:${clientId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;
  
  const current = await env.MY_KV.get<{ count: number; windowStart: number }>(key, 'json');
  
  if (!current || current.windowStart < windowStart) {
    // 新しいウィンドウを開始
    await env.MY_KV.put(key, JSON.stringify({ count: 1, windowStart: now }), {
      expirationTtl: windowSeconds,
    });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowSeconds };
  }
  
  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.windowStart + windowSeconds };
  }
  
  await env.MY_KV.put(key, JSON.stringify({ count: current.count + 1, windowStart: current.windowStart }), {
    expirationTtl: windowSeconds,
  });
  
  return {
    allowed: true,
    remaining: limit - current.count - 1,
    resetAt: current.windowStart + windowSeconds,
  };
}
```

---

## 5. D1 Database（SQLite互換・クエリ・マイグレーション）

D1はCloudflareのサーバーレスSQLiteデータベースだ。SQLiteと完全互換でありながら、Workers環境から直接バインドして使用できる。WAL（Write-Ahead Logging）モードによって読み取りパフォーマンスが高く、マルチリーダー構成も自動で処理される。

### D1セットアップ

```bash
# D1データベースの作成
wrangler d1 create my-database

# データベース一覧
wrangler d1 list

# SQLを直接実行（ローカル）
wrangler d1 execute my-database --local --command "SELECT 1"

# SQLファイルを実行（マイグレーション）
wrangler d1 execute my-database --local --file ./schema.sql

# 本番環境に実行
wrangler d1 execute my-database --command "SELECT COUNT(*) FROM users"
```

### スキーマとマイグレーション

```sql
-- migrations/0001_initial.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published, published_at DESC);

-- 更新日時を自動更新するトリガー
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
  END;
```

### D1クエリ操作

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

// ユーザー一覧取得（ページネーション付き）
async function getUsers(env: Env, page = 1, pageSize = 20): Promise<{
  users: User[];
  total: number;
  hasMore: boolean;
}> {
  const offset = (page - 1) * pageSize;
  
  // バインドパラメータでSQLインジェクション対策
  const [usersResult, countResult] = await Promise.all([
    env.DB.prepare(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
      .bind(pageSize + 1, offset)
      .all<User>(),
    
    env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
  ]);
  
  const users = usersResult.results;
  const hasMore = users.length > pageSize;
  
  return {
    users: hasMore ? users.slice(0, pageSize) : users,
    total: countResult?.count ?? 0,
    hasMore,
  };
}

// ユーザー作成
async function createUser(
  data: { name: string; email: string },
  env: Env
): Promise<User> {
  const result = await env.DB.prepare(
    'INSERT INTO users (name, email) VALUES (?, ?) RETURNING *'
  )
    .bind(data.name, data.email)
    .first<User>();
  
  if (!result) {
    throw new Error('Failed to create user');
  }
  
  return result;
}

// バッチ処理（トランザクション）
async function batchCreatePosts(
  posts: Array<{ userId: number; title: string; content: string }>,
  env: Env
): Promise<D1Result[]> {
  const statements = posts.map((post) =>
    env.DB.prepare(
      'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)'
    ).bind(post.userId, post.title, post.content)
  );
  
  // D1バッチ：全てのステートメントをトランザクションとして実行
  return env.DB.batch(statements);
}

// JOINクエリ
async function getPostsWithAuthors(env: Env): Promise<Array<Post & { author_name: string }>> {
  const result = await env.DB.prepare(`
    SELECT 
      p.*,
      u.name AS author_name
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
    WHERE p.published = TRUE
    ORDER BY p.published_at DESC
    LIMIT 50
  `).all<Post & { author_name: string }>();
  
  return result.results;
}

// フルテキスト検索（SQLite FTS5）
async function searchPosts(query: string, env: Env): Promise<Post[]> {
  // FTS5テーブルが別途必要
  const result = await env.DB.prepare(`
    SELECT p.* FROM posts p
    JOIN posts_fts ON posts_fts.rowid = p.id
    WHERE posts_fts MATCH ?
    ORDER BY rank
    LIMIT 20
  `).bind(query).all<Post>();
  
  return result.results;
}
```

---

## 6. R2 Storage（S3互換・オブジェクト操作・署名付きURL）

R2はCloudflareのオブジェクトストレージだ。Amazon S3互換のAPIを提供しながら、エグレス（データ転送）料金が無料という大きな優位性がある。画像・動画・ドキュメントなどのバイナリファイル保存に最適。

### R2基本操作

```bash
# R2バケット作成
wrangler r2 bucket create my-bucket

# バケット一覧
wrangler r2 bucket list

# オブジェクトのアップロード（ローカルファイル）
wrangler r2 object put my-bucket/path/to/file.txt --file ./local-file.txt

# オブジェクトの取得
wrangler r2 object get my-bucket/path/to/file.txt --file ./output.txt

# オブジェクト削除
wrangler r2 object delete my-bucket/path/to/file.txt
```

### R2オブジェクト操作

```typescript
// 画像アップロードエンドポイント
async function uploadImage(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  
  if (!file) {
    return new Response('No file provided', { status: 400 });
  }
  
  // ファイルタイプのバリデーション
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return new Response('Invalid file type', { status: 400 });
  }
  
  // ファイルサイズ制限（10MB）
  if (file.size > 10 * 1024 * 1024) {
    return new Response('File too large', { status: 413 });
  }
  
  // ユニークなキーを生成
  const ext = file.name.split('.').pop();
  const key = `images/${crypto.randomUUID()}.${ext}`;
  
  // R2にアップロード
  await env.MY_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000', // 1年間キャッシュ
    },
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });
  
  return Response.json({
    key,
    url: `https://cdn.example.com/${key}`,
    size: file.size,
    type: file.type,
  });
}

// オブジェクト取得とレスポンス
async function serveObject(key: string, request: Request, env: Env): Promise<Response> {
  // Conditional GET対応
  const ifNoneMatch = request.headers.get('If-None-Match');
  const ifModifiedSince = request.headers.get('If-Modified-Since');
  
  const object = await env.MY_BUCKET.get(key, {
    onlyIf: {
      etagDoesNotMatch: ifNoneMatch ?? undefined,
      uploadedAfter: ifModifiedSince ? new Date(ifModifiedSince) : undefined,
    },
  });
  
  if (object === null) {
    return new Response('Object Not Found', { status: 404 });
  }
  
  // 304 Not Modified
  if (!(object instanceof R2ObjectBody)) {
    return new Response(null, { status: 304 });
  }
  
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Last-Modified', object.uploaded.toUTCString());
  
  return new Response(object.body, { headers });
}

// オブジェクト一覧（プレフィックスフィルタリング）
async function listObjects(prefix: string, env: Env): Promise<Response> {
  const listed = await env.MY_BUCKET.list({
    prefix,
    limit: 100,
    // cursor: 'previous-cursor', // ページネーション
  });
  
  const objects = listed.objects.map((obj) => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded.toISOString(),
    etag: obj.httpEtag,
  }));
  
  return Response.json({
    objects,
    truncated: listed.truncated,
    cursor: listed.cursor,
  });
}

// オブジェクト削除
async function deleteObject(key: string, env: Env): Promise<Response> {
  await env.MY_BUCKET.delete(key);
  return new Response(null, { status: 204 });
}

// 複数オブジェクトの一括削除
async function deleteMultipleObjects(keys: string[], env: Env): Promise<Response> {
  await env.MY_BUCKET.delete(keys);
  return Response.json({ deleted: keys.length });
}
```

### 署名付きURL（Presigned URL）

```typescript
// R2のPresigned URLはWorkersからR2バインディング経由で生成
// または独自実装でHMAC署名URLを作成
async function generatePresignedUrl(
  key: string,
  expiresInSeconds: number,
  env: Env
): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const stringToSign = `${key}:${expiry}`;
  
  // HMAC-SHA256署名
  const keyData = new TextEncoder().encode(env.API_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(stringToSign)
  );
  
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `https://worker.example.com/files/${key}?expires=${expiry}&sig=${sigHex}`;
}
```

---

## 7. Durable Objects（ステートフル・WebSocket・分散カウンター）

Durable ObjectsはWorkers上でステートフルな処理を可能にする仕組みだ。通常のWorkerは各リクエストでステートレスに動作するが、Durable Objectsは固有のIDを持つオブジェクトとして永続化され、WebSocketセッション管理・リアルタイム協調・分散カウンターの実装に使用される。

```toml
# wrangler.toml
[[durable_objects.bindings]]
name = "COUNTER"
class_name = "Counter"

[[durable_objects.bindings]]
name = "CHAT_ROOM"
class_name = "ChatRoom"

[[migrations]]
tag = "v1"
new_classes = ["Counter", "ChatRoom"]
```

### 分散カウンター

```typescript
// src/counter.ts
export class Counter implements DurableObject {
  private state: DurableObjectState;
  private count: number = 0;
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    // ストレージからカウントを復元
    this.state.blockConcurrencyWhile(async () => {
      this.count = (await this.state.storage.get<number>('count')) ?? 0;
    });
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/increment') {
      this.count++;
      await this.state.storage.put('count', this.count);
      return Response.json({ count: this.count });
    }
    
    if (url.pathname === '/reset') {
      this.count = 0;
      await this.state.storage.delete('count');
      return Response.json({ count: 0 });
    }
    
    // 現在のカウントを返す
    return Response.json({ count: this.count });
  }
}

// メインWorkerからDurable Objectを呼び出す
export default {
  async fetch(request: Request, env: Env & { COUNTER: DurableObjectNamespace }): Promise<Response> {
    const url = new URL(request.url);
    const counterId = url.searchParams.get('id') ?? 'global';
    
    // IDからDurable Objectのスタブを取得
    const id = env.COUNTER.idFromName(counterId);
    const counter = env.COUNTER.get(id);
    
    // Durable Objectにリクエストを転送
    return counter.fetch(request);
  },
};
```

### WebSocketチャットルーム

```typescript
// src/chat-room.ts
interface Message {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}

export class ChatRoom implements DurableObject {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, { userId: string }> = new Map();
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }
  
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    
    // WebSocketペアを作成
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    
    // サーバー側WebSocketを受け入れ
    this.state.acceptWebSocket(server);
    
    const userId = new URL(request.url).searchParams.get('userId') ?? 'anonymous';
    this.sessions.set(server, { userId });
    
    // 接続通知を全員にブロードキャスト
    this.broadcast(JSON.stringify({
      type: 'join',
      userId,
      timestamp: Date.now(),
    }), server);
    
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
  
  // WebSocketメッセージハンドラ
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const session = this.sessions.get(ws);
    if (!session) return;
    
    try {
      const data = JSON.parse(message as string);
      
      const outMessage: Message = {
        id: crypto.randomUUID(),
        userId: session.userId,
        text: data.text,
        timestamp: Date.now(),
      };
      
      // 全クライアントにブロードキャスト
      this.broadcast(JSON.stringify({ type: 'message', ...outMessage }));
      
      // ストレージに保存（最新100件）
      const history = (await this.state.storage.get<Message[]>('history')) ?? [];
      history.push(outMessage);
      await this.state.storage.put('history', history.slice(-100));
      
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  }
  
  // 接続切断ハンドラ
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    const session = this.sessions.get(ws);
    this.sessions.delete(ws);
    
    if (session) {
      this.broadcast(JSON.stringify({
        type: 'leave',
        userId: session.userId,
        timestamp: Date.now(),
      }));
    }
  }
  
  // エラーハンドラ
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket error:', error);
    this.sessions.delete(ws);
  }
  
  private broadcast(message: string, exclude?: WebSocket): void {
    for (const [ws] of this.sessions) {
      if (ws !== exclude) {
        try {
          ws.send(message);
        } catch {
          this.sessions.delete(ws);
        }
      }
    }
  }
}
```

---

## 8. Queue（Producer/Consumer・バッチ処理・リトライ）

Cloudflare Queuesは非同期メッセージキューサービスだ。Workerがメッセージをエンキューし、別のWorkerが消費する Producer/Consumer パターンを実現する。メール送信・画像処理・データ集計など、レスポンスタイムに影響させたくない重い処理の非同期化に使う。

```bash
# Queueの作成
wrangler queues create my-queue

# Queue一覧
wrangler queues list
```

### Producer（メッセージ送信）

```typescript
interface EmailJob {
  to: string;
  subject: string;
  body: string;
}

interface ImageJob {
  key: string;
  width: number;
  height: number;
  format: 'webp' | 'jpeg';
}

// メール送信を非同期キューに投入
async function queueEmailJob(job: EmailJob, env: Env): Promise<void> {
  await env.MY_QUEUE.send(job, {
    contentType: 'json',
    delaySeconds: 0, // 即座に処理（最大43200秒 = 12時間まで遅延可能）
  });
}

// バルク送信（最大100件）
async function queueBulkJobs(jobs: ImageJob[], env: Env): Promise<void> {
  await env.MY_QUEUE.sendBatch(
    jobs.map((job) => ({
      body: job,
      contentType: 'json' as const,
    }))
  );
}

// Workers APIエンドポイントからキューに投入
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    
    const job = await request.json<EmailJob>();
    await queueEmailJob(job, env);
    
    return Response.json({ queued: true, message: 'Job accepted' }, { status: 202 });
  },
};
```

### Consumer（メッセージ受信・処理）

```typescript
// Queue Consumerハンドラ
export default {
  async queue(batch: MessageBatch<EmailJob>, env: Env): Promise<void> {
    const results = await Promise.allSettled(
      batch.messages.map(async (message) => {
        try {
          await processEmailJob(message.body, env);
          // 処理成功を通知（キューから削除）
          message.ack();
        } catch (error) {
          console.error('Failed to process message:', error);
          // 失敗を通知（リトライキューに戻す）
          message.retry({ delaySeconds: 60 }); // 60秒後に再試行
        }
      })
    );
    
    const failed = results.filter((r) => r.status === 'rejected').length;
    console.log(`Processed: ${results.length - failed} success, ${failed} failed`);
  },
};

async function processEmailJob(job: EmailJob, env: Env): Promise<void> {
  // メール送信処理（例: SendGridやResend APIを使用）
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: job.to }] }],
      from: { email: 'noreply@example.com' },
      subject: job.subject,
      content: [{ type: 'text/html', value: job.body }],
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${response.status} ${error}`);
  }
}
```

---

## 9. Cron Triggers（定期実行・スケジュール設定）

Cron Triggersは指定したスケジュールでWorkerを自動実行する機能だ。データの定期収集・レポート生成・キャッシュ更新など、周期的なバッチ処理に使用する。

```toml
# wrangler.toml
[triggers]
crons = [
  "0 9 * * 1-5",    # 平日9時（UTC）
  "*/30 * * * *",   # 30分ごと
  "0 0 * * 0",      # 毎週日曜0時
]
```

### Scheduled Handler実装

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // event.cron でトリガーされたcron式を確認
    console.log(`Scheduled event triggered: ${event.cron}`);
    console.log(`Scheduled time: ${new Date(event.scheduledTime).toISOString()}`);
    
    switch (event.cron) {
      case '0 9 * * 1-5':
        // 平日9時: 日次レポート生成
        await generateDailyReport(env);
        break;
      
      case '*/30 * * * *':
        // 30分ごと: キャッシュ更新
        await refreshCache(env);
        break;
      
      case '0 0 * * 0':
        // 毎週日曜: 週次集計
        await generateWeeklyStats(env);
        break;
    }
  },
};

async function generateDailyReport(env: Env): Promise<void> {
  // D1から前日のデータを集計
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as new_users,
      COUNT(CASE WHEN DATE(updated_at) = ? THEN 1 END) as active_users
    FROM users
  `).bind(dateStr, dateStr).first<{
    total_users: number;
    new_users: number;
    active_users: number;
  }>();
  
  // レポートをKVに保存
  await env.MY_KV.put(
    `report:daily:${dateStr}`,
    JSON.stringify({ date: dateStr, ...stats }),
    { expirationTtl: 30 * 24 * 3600 } // 30日間保持
  );
  
  console.log(`Daily report generated for ${dateStr}:`, stats);
}

async function refreshCache(env: Env): Promise<void> {
  // 外部APIからデータを取得してKVにキャッシュ
  const response = await fetch('https://api.example.com/public-data');
  if (!response.ok) return;
  
  const data = await response.json();
  await env.MY_KV.put('cache:public-data', JSON.stringify(data), {
    expirationTtl: 3600, // 1時間
  });
}
```

---

## 10. Hono + Cloudflare Workers（フルスタックAPI）

HonoはEdgeファーストなWebフレームワークで、Cloudflare Workersとの親和性が非常に高い。Express.js的なAPIで直感的にルーティングとミドルウェアを構築できる。

```bash
# Honoテンプレートで作成
npm create hono@latest my-api
# → cloudflare-workersを選択
```

### Hono APIサーバー実装

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { jwt } from 'hono/jwt';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type Bindings = {
  DB: D1Database;
  MY_KV: KVNamespace;
  MY_BUCKET: R2Bucket;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// グローバルミドルウェア
app.use('*', logger());
app.use('*', prettyJSON());
app.use('/api/*', cors({
  origin: ['https://example.com', 'http://localhost:3000'],
  credentials: true,
}));

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 認証が必要なルートグループ
const protectedApp = new Hono<{ Bindings: Bindings }>();
protectedApp.use('*', jwt({ secret: (c) => c.env.JWT_SECRET }));

// ユーザースキーマ
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['user', 'admin']).default('user'),
});

const updateUserSchema = createUserSchema.partial();

// ユーザーAPI
const usersRouter = new Hono<{ Bindings: Bindings }>();

usersRouter.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? '1');
  const pageSize = Number(c.req.query('pageSize') ?? '20');
  const offset = (page - 1) * pageSize;
  
  const [users, count] = await Promise.all([
    c.env.DB.prepare(
      'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(pageSize, offset).all<User>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
  ]);
  
  return c.json({
    data: users.results,
    pagination: {
      page,
      pageSize,
      total: count?.count ?? 0,
      totalPages: Math.ceil((count?.count ?? 0) / pageSize),
    },
  });
});

usersRouter.post('/', zValidator('json', createUserSchema), async (c) => {
  const body = c.req.valid('json');
  
  try {
    const user = await c.env.DB.prepare(
      'INSERT INTO users (name, email) VALUES (?, ?) RETURNING *'
    ).bind(body.name, body.email).first<User>();
    
    return c.json(user, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return c.json({ error: 'Email already exists' }, 409);
    }
    throw error;
  }
});

usersRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(id).first<User>();
  
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

usersRouter.patch('/:id', zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  
  const updates = Object.entries(body)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`);
  
  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }
  
  const values = Object.values(body).filter((v) => v !== undefined);
  
  const user = await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ? RETURNING *`
  ).bind(...values, id).first<User>();
  
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

usersRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});

// ルーティング組み立て
app.route('/api/users', protectedApp.route('/', usersRouter));

// エラーハンドリング
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.notFound((c) => {
  return c.json({ error: `Not Found: ${c.req.path}` }, 404);
});

export default app;
```

---

## 11. Pages Functions（Next.js/Astroデプロイ）

Cloudflare Pagesは静的サイトホスティングに加え、Pages FunctionsとしてサーバーサイドロジックをWorkersで実行できる。Next.jsやAstroのSSR/SSGをCloudflare上にデプロイする際に使用される。

```bash
# Next.jsプロジェクトをCloudflare Pagesにデプロイ
npm install -D @cloudflare/next-on-pages

# package.jsonのビルドコマンドを更新
# "build": "next build && npx @cloudflare/next-on-pages"

# wrangler.toml（Pagesプロジェクト用）
# pages_build_output_dir = ".vercel/output/static"

# デプロイ
wrangler pages deploy .vercel/output/static

# Astroの場合
npx astro add cloudflare
# astro.config.mjs: output: 'server', adapter: cloudflare()
```

### Pages Functions（API Routes）

```typescript
// functions/api/users/index.ts
import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  MY_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const users = await env.DB.prepare('SELECT * FROM users LIMIT 50').all<User>();
  return Response.json(users.results);
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json<{ name: string; email: string }>();
  const user = await env.DB.prepare(
    'INSERT INTO users (name, email) VALUES (?, ?) RETURNING *'
  ).bind(body.name, body.email).first<User>();
  
  return Response.json(user, { status: 201 });
};

// functions/api/users/[id].ts
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(params.id).first<User>();
  
  if (!user) return new Response('Not found', { status: 404 });
  return Response.json(user);
};
```

---

## 12. Workers AI（モデル推論・Edge LLM）

Workers AIはCloudflareのGPUネットワーク上でAI推論を実行できる機能だ。テキスト生成・画像分類・埋め込みベクトル生成など、主要なAIタスクをEdgeで直接実行できる。

```toml
# wrangler.toml
[ai]
binding = "AI"
```

### Workers AI実装

```typescript
interface Env {
  AI: Ai;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // テキスト生成（Llama 3.1）
    if (url.pathname === '/api/generate') {
      const { prompt } = await request.json<{ prompt: string }>();
      
      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 512,
        temperature: 0.7,
      });
      
      return Response.json(response);
    }
    
    // テキスト埋め込み（RAG用）
    if (url.pathname === '/api/embed') {
      const { texts } = await request.json<{ texts: string[] }>();
      
      const embeddings = await env.AI.run('@cf/baai/bge-small-en-v1.5', {
        text: texts,
      });
      
      return Response.json(embeddings);
    }
    
    // 画像分類
    if (url.pathname === '/api/classify') {
      const formData = await request.formData();
      const imageFile = formData.get('image') as File;
      const imageBuffer = await imageFile.arrayBuffer();
      
      const result = await env.AI.run('@cf/microsoft/resnet-50', {
        image: [...new Uint8Array(imageBuffer)],
      });
      
      return Response.json(result);
    }
    
    // テキスト翻訳
    if (url.pathname === '/api/translate') {
      const { text, targetLang } = await request.json<{ text: string; targetLang: string }>();
      
      const result = await env.AI.run('@cf/meta/m2m100-1.2b', {
        text,
        target_lang: targetLang,
        source_lang: 'ja',
      });
      
      return Response.json(result);
    }
    
    // ストリーミング生成
    if (url.pathname === '/api/stream') {
      const { prompt } = await request.json<{ prompt: string }>();
      
      const stream = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });
      
      return new Response(stream as ReadableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }
    
    return new Response('Not Found', { status: 404 });
  },
};
```

---

## 13. パフォーマンス最適化・コスト管理

### CPU時間の最適化

Workers無料プランはリクエストあたり10msのCPU時間制限がある（有料プランは30秒）。重い処理はQueueに移譲するのが基本戦略だ。

```typescript
// waitUntil を使った非同期バックグラウンド処理
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // レスポンスを即座に返す
    const response = Response.json({ status: 'accepted' });
    
    // バックグラウンドで重い処理（レスポンス返却後も実行継続）
    ctx.waitUntil(
      performHeavyAnalysis(request, env)
    );
    
    return response;
  },
};

async function performHeavyAnalysis(request: Request, env: Env): Promise<void> {
  // ログ記録、分析、外部API呼び出しなど
  const analytics = {
    path: new URL(request.url).pathname,
    method: request.method,
    timestamp: Date.now(),
    cf: request.cf, // Cloudflare情報（地理情報、ASN等）
  };
  
  await env.MY_KV.put(
    `analytics:${Date.now()}`,
    JSON.stringify(analytics),
    { expirationTtl: 86400 }
  );
}
```

### キャッシュ戦略

```typescript
// Cache APIを活用したEdgeキャッシング
async function cachedResponse(
  request: Request,
  handler: (request: Request) => Promise<Response>
): Promise<Response> {
  const cache = caches.default;
  
  // キャッシュを確認
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  
  // ハンドラを実行
  const response = await handler(request);
  
  // キャッシュ可能なレスポンスのみ保存
  if (response.status === 200) {
    const cacheResponse = new Response(response.clone().body, {
      headers: {
        ...Object.fromEntries(response.headers),
        'Cache-Control': 'public, max-age=3600',
      },
    });
    
    // キャッシュに保存（非同期）
    await cache.put(request, cacheResponse);
  }
  
  return response;
}

// 地理情報によるコンテンツ最適化
function getRegionalContent(request: Request): { region: string; language: string } {
  const cf = (request as any).cf;
  
  return {
    region: cf?.country ?? 'US',
    language: cf?.country === 'JP' ? 'ja' : 'en',
  };
}
```

### コスト最適化チェックリスト

| 項目 | 無料プラン制限 | 最適化策 |
|------|-------------|---------|
| Workerリクエスト | 10万/日 | Cache APIでリクエスト削減 |
| KV読み取り | 10万/日 | ローカルキャッシュ + TTL設定 |
| KV書き込み | 1000/日 | バッチ書き込み |
| D1 読み取り | 500万/日 | クエリ最適化・インデックス |
| D1 書き込み | 10万/日 | バッチINSERT |
| R2 Aクラス操作 | 100万/月 | リスト操作を最小化 |
| Workers AI | 無料枠あり | 小さいモデルを優先 |

---

## まとめ — Cloudflare Workersで構築するEdgeファーストアーキテクチャ

Cloudflare WorkersはEdge Computingの実用的なプラットフォームとして急速に成熟してきた。単なる「エッジで動くLambda」を超え、KV・D1・R2・Durable Objects・Queue・AI推論まで揃ったフルスタックなアプリケーションプラットフォームとなっている。

特に以下のユースケースで従来のアーキテクチャを置き換える価値がある。

- **グローバルCDN + API**: R2で静的ファイル、WorkersでAPI — ゼロコールドスタートの応答
- **リアルタイムアプリ**: Durable ObjectsのWebSocketで複数クライアント間の同期
- **Edge LLM**: Workers AIでバックエンドを介さずにAI推論をクライアント近傍で実行
- **マルチリージョン不要なDB**: D1がリードレプリカを自動管理

Wranglerの開発者体験も非常に良く、`wrangler dev`で本番環境に近い形でローカル開発ができる。TypeScriptの型定義も充実しており、`@cloudflare/workers-types`パッケージで全バインディングに型安全なアクセスが可能だ。

---

## Workers API開発でのデバッグ・検証ツール

Cloudflare WorkersでAPIを開発する際、KVやD1のレスポンスのJSON構造確認・HTTPリクエストのデバッグ・Wrangler経由のAPIテストなど、JSON/API検証作業が頻繁に発生する。**[DevToolBox](https://usedevtools.com/)** はJSONフォーマッター・JSONスキーマバリデーター・Base64エンコーダー・JWTデコーダー・Diffツールなどを集約した開発者ツールコレクションで、ブラウザ上でWorkers APIのレスポンスを即座に確認・整形できる。Workers開発のお供として活用してほしい。

---

## 参考リソース

- [Cloudflare Workers 公式ドキュメント](https://developers.cloudflare.com/workers/)
- [Wrangler CLI リファレンス](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database ドキュメント](https://developers.cloudflare.com/d1/)
- [R2 Storage ドキュメント](https://developers.cloudflare.com/r2/)
- [Durable Objects ドキュメント](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare Queue ドキュメント](https://developers.cloudflare.com/queues/)
- [Workers AI モデル一覧](https://developers.cloudflare.com/workers-ai/models/)
- [Hono フレームワーク](https://hono.dev/)
