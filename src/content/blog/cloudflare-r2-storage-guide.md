---
title: 'Cloudflare R2ストレージ実践ガイド: S3互換オブジェクトストレージの活用'
description: 'Cloudflare R2を使ったオブジェクトストレージ実装の完全ガイド。S3互換APIでの操作、パブリックアクセス設定、Workers統合、コスト最適化まで実践的に解説します。'
pubDate: 2025-05-18
updatedDate: 2025-05-18
tags: ['Cloudflare', 'R2', 'Object Storage', 'S3', 'Workers', 'インフラ']
category: 'infrastructure'
---

# Cloudflare R2ストレージ実践ガイド: S3互換オブジェクトストレージの活用

Cloudflare R2は、S3互換のオブジェクトストレージサービスで、エグレス料金が無料という革新的な特徴を持っています。この記事では、R2の基本から実践的な活用方法まで完全解説します。

## Cloudflare R2とは

R2は、Cloudflareが提供するオブジェクトストレージサービスです。AWS S3と互換性があるため、既存のS3用コードをほぼそのまま使用できます。

### R2の主な特徴

- **エグレス料金無料**: データ転送料金がかからない
- **S3互換API**: 既存のS3ツールやSDKが使える
- **グローバル配信**: Cloudflareのエッジネットワークを活用
- **Workers統合**: Cloudflare Workersから高速アクセス可能
- **低コスト**: ストレージ料金が月$0.015/GB

## R2バケットの作成と基本操作

### Wranglerを使った管理

```bash
# Wranglerのインストール
npm install -g wrangler

# Cloudflareにログイン
wrangler login

# R2バケットの作成
wrangler r2 bucket create my-bucket

# バケット一覧の確認
wrangler r2 bucket list

# ファイルのアップロード
wrangler r2 object put my-bucket/test.txt --file ./test.txt

# ファイルの取得
wrangler r2 object get my-bucket/test.txt --file ./downloaded.txt

# ファイルの削除
wrangler r2 object delete my-bucket/test.txt

# バケットの削除
wrangler r2 bucket delete my-bucket
```

## S3 SDKを使ったR2操作

### AWS SDK for JavaScriptの設定

```typescript
// r2-client.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class R2Storage {
  private client: S3Client;
  private bucket: string;

  constructor(accountId: string, accessKeyId: string, secretAccessKey: string, bucket: string) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.bucket = bucket;
  }

  // ファイルのアップロード
  async upload(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
  }

  // ファイルの取得
  async get(key: string): Promise<Uint8Array> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    const stream = response.Body as ReadableStream;
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  // ファイルの削除
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  // ファイル一覧の取得
  async list(prefix?: string, maxKeys: number = 1000): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await this.client.send(command);
    return response.Contents?.map(obj => obj.Key!) || [];
  }

  // 署名付きURLの生成（一時的なアクセス権限）
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }
}

// 使用例
const r2 = new R2Storage(
  process.env.CLOUDFLARE_ACCOUNT_ID!,
  process.env.R2_ACCESS_KEY_ID!,
  process.env.R2_SECRET_ACCESS_KEY!,
  'my-bucket'
);

// アップロード
await r2.upload('images/cat.jpg', imageBuffer, 'image/jpeg');

// ダウンロード
const data = await r2.get('images/cat.jpg');

// 一覧取得
const files = await r2.list('images/');
console.log(files); // ['images/cat.jpg', 'images/dog.jpg', ...]

// 署名付きURL生成
const url = await r2.getSignedUrl('images/cat.jpg', 3600);
console.log(url); // https://...
```

## Cloudflare Workersとの統合

Cloudflare WorkersからR2バケットに直接アクセスすることで、超高速なストレージ操作が可能です。

### Workers統合の設定

```toml
# wrangler.toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
```

### Workersでのファイル操作

```typescript
// src/index.ts
export interface Env {
  MY_BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1); // "/path/to/file" -> "path/to/file"

    // GET: ファイルの取得
    if (request.method === 'GET') {
      const object = await env.MY_BUCKET.get(key);

      if (!object) {
        return new Response('Not Found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);

      return new Response(object.body, {
        headers,
      });
    }

    // PUT: ファイルのアップロード
    if (request.method === 'PUT') {
      await env.MY_BUCKET.put(key, request.body, {
        httpMetadata: {
          contentType: request.headers.get('content-type') || 'application/octet-stream',
        },
      });

      return new Response('Uploaded', { status: 201 });
    }

    // DELETE: ファイルの削除
    if (request.method === 'DELETE') {
      await env.MY_BUCKET.delete(key);
      return new Response('Deleted', { status: 204 });
    }

    // HEAD: メタデータの取得
    if (request.method === 'HEAD') {
      const object = await env.MY_BUCKET.head(key);

      if (!object) {
        return new Response('Not Found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);

      return new Response(null, { headers });
    }

    return new Response('Method Not Allowed', { status: 405 });
  },
};
```

### 画像リサイズWorker

```typescript
// src/image-resize.ts
export interface Env {
  IMAGES: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);
    const width = url.searchParams.get('w');
    const height = url.searchParams.get('h');

    // 元画像を取得
    const object = await env.IMAGES.get(key);
    if (!object) {
      return new Response('Not Found', { status: 404 });
    }

    // リサイズパラメータがない場合は元画像を返す
    if (!width && !height) {
      return new Response(object.body, {
        headers: {
          'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
          'cache-control': 'public, max-age=31536000',
        },
      });
    }

    // Cloudflare Imagesを使ってリサイズ
    const resizeOptions: RequestInit = {
      cf: {
        image: {
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
          fit: 'scale-down',
          quality: 85,
        },
      },
    };

    // R2から取得した画像をCloudflare Imagesでリサイズ
    const imageResponse = new Response(object.body);
    return fetch(imageResponse.url, resizeOptions);
  },
};
```

## パブリックアクセスの設定

### カスタムドメインでの公開

```typescript
// src/public-bucket.ts
export interface Env {
  PUBLIC_BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    // キャッシュヘッダーの確認
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (response) {
      return response;
    }

    // R2からオブジェクトを取得
    const object = await env.PUBLIC_BUCKET.get(key);

    if (!object) {
      return new Response('Not Found', { status: 404 });
    }

    // レスポンスヘッダーの設定
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000');
    headers.set('access-control-allow-origin', '*');

    response = new Response(object.body, { headers });

    // エッジキャッシュに保存
    await cache.put(cacheKey, response.clone());

    return response;
  },
};
```

## ファイルアップロードAPI

### マルチパートアップロード対応

```typescript
// src/upload-api.ts
export interface Env {
  UPLOADS: R2Bucket;
  AUTH_TOKEN: string;
}

// 認証ミドルウェア
function authenticate(request: Request, env: Env): boolean {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  return token === env.AUTH_TOKEN;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 認証チェック
    if (!authenticate(request, env)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);

    // シングルファイルアップロード
    if (request.method === 'POST' && url.pathname === '/upload') {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return new Response('No file provided', { status: 400 });
      }

      // ファイル名の生成（UUIDを使用）
      const fileExt = file.name.split('.').pop();
      const key = `${crypto.randomUUID()}.${fileExt}`;

      // R2にアップロード
      await env.UPLOADS.put(key, file.stream(), {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      return Response.json({
        success: true,
        key,
        url: `https://your-domain.com/${key}`,
      });
    }

    // マルチパートアップロード開始
    if (request.method === 'POST' && url.pathname === '/multipart/start') {
      const { fileName, fileType } = await request.json();
      const key = `${crypto.randomUUID()}.${fileName.split('.').pop()}`;

      const multipartUpload = await env.UPLOADS.createMultipartUpload(key, {
        httpMetadata: {
          contentType: fileType,
        },
      });

      return Response.json({
        uploadId: multipartUpload.uploadId,
        key,
      });
    }

    // マルチパートアップロード - パートのアップロード
    if (request.method === 'PUT' && url.pathname.startsWith('/multipart/part')) {
      const { key, uploadId, partNumber } = await request.json();
      const body = await request.arrayBuffer();

      const multipartUpload = env.UPLOADS.resumeMultipartUpload(key, uploadId);
      const part = await multipartUpload.uploadPart(partNumber, body);

      return Response.json({
        etag: part.etag,
      });
    }

    // マルチパートアップロード完了
    if (request.method === 'POST' && url.pathname === '/multipart/complete') {
      const { key, uploadId, parts } = await request.json();

      const multipartUpload = env.UPLOADS.resumeMultipartUpload(key, uploadId);
      await multipartUpload.complete(parts);

      return Response.json({
        success: true,
        url: `https://your-domain.com/${key}`,
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

## コスト最適化とベストプラクティス

### 1. ライフサイクルポリシーの実装

```typescript
// 古いファイルの自動削除
export interface Env {
  TEMP_BUCKET: R2Bucket;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const nowMs = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // すべてのオブジェクトをリスト
    let cursor: string | undefined;
    do {
      const listed = await env.TEMP_BUCKET.list({ cursor });

      for (const object of listed.objects) {
        const uploadedMs = object.uploaded.getTime();
        if (nowMs - uploadedMs > thirtyDaysMs) {
          await env.TEMP_BUCKET.delete(object.key);
          console.log(`Deleted old file: ${object.key}`);
        }
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
  },
};
```

### 2. キャッシュ戦略

```typescript
// エッジキャッシュを活用した配信
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;

    // キャッシュから取得を試みる
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }

    // R2から取得
    const object = await env.BUCKET.get(url.pathname.slice(1));
    if (!object) {
      return new Response('Not Found', { status: 404 });
    }

    // 適切なキャッシュヘッダーを設定
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('cache-control', 'public, max-age=86400'); // 24時間
    headers.set('cdn-cache-control', 'max-age=31536000'); // 1年

    response = new Response(object.body, { headers });

    // エッジにキャッシュ
    await cache.put(cacheKey, response.clone());

    return response;
  },
};
```

## まとめ

Cloudflare R2は、エグレス料金無料という革新的な特徴を持つオブジェクトストレージサービスです。主な利点は以下の通りです。

- **コスト削減**: データ転送料金が無料で、大量配信に最適
- **S3互換**: 既存のツールやコードをそのまま使用可能
- **高速アクセス**: Workers統合で超低レイテンシーを実現
- **グローバル配信**: Cloudflareのエッジネットワークを活用

静的アセット、メディアファイル、バックアップなど、あらゆるデータストレージニーズに対応できます。
