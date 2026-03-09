---
title: "Tigris分散オブジェクトストレージ入門 - グローバルにキャッシュされる高速ストレージ"
description: "Tigris分散オブジェクトストレージの基礎から実践まで。S3互換APIで世界中にデータを自動複製し、低レイテンシーなアクセスを実現する方法を解説します。CDN統合やFly.io連携によるグローバル配信のベストプラクティスも紹介します。CDN統合やFly.io連携の設定手順も紹介します。"
pubDate: "2025-02-05"
tags: ['インフラ', 'クラウド', 'プログラミング']
heroImage: '../../assets/thumbnails/tigris-object-storage.jpg'
---

Tigrisは、グローバルに分散されたオブジェクトストレージサービスです。S3互換のAPIを提供しながら、世界中の複数リージョンにデータを自動的に複製し、ユーザーに最も近い場所からデータを配信することで、低レイテンシーなアクセスを実現します。

## Tigrisとは

Tigrisは、Fly.ioのインフラストラクチャ上に構築された分散オブジェクトストレージサービスで、以下の特徴を持ちます。

### 主な特徴

- **グローバル分散**: 世界中の複数リージョンに自動複製
- **低レイテンシー**: ユーザーに最も近い場所から配信
- **S3互換**: 既存のS3ツールやライブラリが使える
- **自動キャッシング**: エッジでの高速アクセス
- **シンプルな価格設定**: データ転送費用なし

### 従来のオブジェクトストレージとの違い

```
AWS S3:
- 単一リージョンにデータを保存
- グローバル配信にはCloudFrontが必要
- リージョン間転送に課金

Tigris:
- 複数リージョンに自動複製
- グローバルキャッシュが標準搭載
- データ転送費用なし
```

### ユースケース

- **静的サイトホスティング**: 画像、CSS、JavaScriptファイル
- **メディア配信**: 動画、音声、画像の高速配信
- **バックアップ**: アプリケーションデータのバックアップ
- **ファイル共有**: ユーザーアップロードファイルの保管
- **ログストレージ**: アプリケーションログの長期保存

## セットアップ

### Tigrisアカウントの作成

```bash
# Fly.io CLIをインストール
curl -L https://fly.io/install.sh | sh

# ログイン
fly auth login

# Tigrisプロジェクトを作成
fly storage create my-storage

# 認証情報を取得
fly storage credentials my-storage
```

認証情報は以下の形式で表示されます。

```
AWS_ACCESS_KEY_ID=tid_xxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=tsec_xxxxxxxxxxxx
AWS_ENDPOINT_URL_S3=https://fly.storage.tigris.dev
```

### 環境変数の設定

```bash
# .envファイル
AWS_ACCESS_KEY_ID=tid_xxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=tsec_xxxxxxxxxxxx
AWS_ENDPOINT_URL_S3=https://fly.storage.tigris.dev
AWS_REGION=auto
```

## AWS SDK for JavaScriptでの使用

### インストール

```bash
npm install @aws-sdk/client-s3
npm install dotenv
```

### 基本的な操作

```javascript
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

config();

// Tigrisクライアントの作成
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = 'my-storage';

// ファイルをアップロード
async function uploadFile(key, content) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: 'text/plain',
  });

  const response = await s3Client.send(command);
  console.log('Upload successful:', response);
  return response;
}

// ファイルをダウンロード
async function downloadFile(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  const content = await response.Body.transformToString();
  return content;
}

// ファイル一覧を取得
async function listFiles(prefix = '') {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);
  return response.Contents || [];
}

// 使用例
async function main() {
  // アップロード
  await uploadFile('test.txt', 'Hello, Tigris!');

  // ダウンロード
  const content = await downloadFile('test.txt');
  console.log('Downloaded:', content);

  // 一覧取得
  const files = await listFiles();
  console.log('Files:', files.map(f => f.Key));
}

main();
```

### 画像のアップロードと配信

```javascript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises';

// 画像をアップロード
async function uploadImage(filePath, key) {
  const fileContent = await fs.readFile(filePath);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000', // 1年間キャッシュ
  });

  await s3Client.send(command);

  // 公開URLを生成
  const url = `${process.env.AWS_ENDPOINT_URL_S3}/${BUCKET_NAME}/${key}`;
  return url;
}

// 署名付きURLを生成（一時的なアクセス用）
async function getPresignedUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

// 使用例
async function main() {
  // 画像をアップロード
  const imageUrl = await uploadImage('./photo.jpg', 'images/photo.jpg');
  console.log('Image URL:', imageUrl);

  // 1時間有効な署名付きURLを生成
  const presignedUrl = await getPresignedUrl('images/photo.jpg', 3600);
  console.log('Presigned URL:', presignedUrl);
}

main();
```

## Next.jsとの統合

### ファイルアップロードAPI

```typescript
// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.BUCKET_NAME!;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // ファイルを読み込み
    const buffer = Buffer.from(await file.arrayBuffer());

    // ユニークなキーを生成
    const key = `uploads/${randomUUID()}-${file.name}`;

    // Tigrisにアップロード
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      CacheControl: 'public, max-age=31536000',
    });

    await s3Client.send(command);

    const url = `${process.env.AWS_ENDPOINT_URL_S3}/${BUCKET_NAME}/${key}`;

    return NextResponse.json({
      success: true,
      url,
      key,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

### アップロードコンポーネント

```tsx
// components/FileUploader.tsx
'use client';

import { useState } from 'react';

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadedUrl(data.url);
        alert('Upload successful!');
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>

      {uploadedUrl && (
        <div className="mt-4">
          <p>Uploaded successfully!</p>
          <img src={uploadedUrl} alt="Uploaded" className="max-w-md mt-2" />
          <p className="text-sm text-gray-500 mt-2">{uploadedUrl}</p>
        </div>
      )}
    </div>
  );
}
```

## マルチパートアップロード

大きなファイルは分割してアップロードすることで、信頼性とパフォーマンスを向上させます。

```javascript
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';

async function uploadLargeFile(filePath, key) {
  const fileSize = (await fs.promises.stat(filePath)).size;
  const chunkSize = 5 * 1024 * 1024; // 5MB
  const numParts = Math.ceil(fileSize / chunkSize);

  try {
    // マルチパートアップロードを開始
    const createResponse = await s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );

    const uploadId = createResponse.UploadId;
    const uploadedParts = [];

    // 各パートをアップロード
    for (let i = 0; i < numParts; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);

      const buffer = Buffer.alloc(end - start);
      const fd = await fs.promises.open(filePath, 'r');
      await fd.read(buffer, 0, end - start, start);
      await fd.close();

      const uploadPartResponse = await s3Client.send(
        new UploadPartCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          UploadId: uploadId,
          PartNumber: i + 1,
          Body: buffer,
        })
      );

      uploadedParts.push({
        ETag: uploadPartResponse.ETag,
        PartNumber: i + 1,
      });

      console.log(`Uploaded part ${i + 1}/${numParts}`);
    }

    // マルチパートアップロードを完了
    const completeResponse = await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: uploadedParts,
        },
      })
    );

    console.log('Upload completed:', completeResponse.Location);
    return completeResponse.Location;
  } catch (error) {
    // エラー時はアップロードを中止
    await s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
      })
    );
    throw error;
  }
}
```

## Cloudflare Workersとの統合

```typescript
// worker.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

interface Env {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_ENDPOINT_URL_S3: string;
  BUCKET_NAME: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1); // 先頭の / を削除

    if (!key) {
      return new Response('Not Found', { status: 404 });
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: env.AWS_ENDPOINT_URL_S3,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

    try {
      const command = new GetObjectCommand({
        Bucket: env.BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);

      return new Response(response.Body as ReadableStream, {
        headers: {
          'Content-Type': response.ContentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } catch (error) {
      return new Response('Not Found', { status: 404 });
    }
  },
};
```

## 画像最適化プロキシ

```typescript
// image-proxy/route.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');
  const width = parseInt(searchParams.get('width') || '800');
  const quality = parseInt(searchParams.get('quality') || '80');

  if (!key) {
    return new Response('Missing key parameter', { status: 400 });
  }

  try {
    // Tigrisから画像を取得
    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: key,
    });

    const response = await s3Client.send(command);
    const imageBuffer = await response.Body?.transformToByteArray();

    if (!imageBuffer) {
      return new Response('Image not found', { status: 404 });
    }

    // sharpで画像を最適化
    const optimizedImage = await sharp(Buffer.from(imageBuffer))
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    return new NextResponse(optimizedImage, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Image optimization error:', error);
    return new Response('Error processing image', { status: 500 });
  }
}
```

## バックアップとリストア

### 定期バックアップスクリプト

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dumpFile = `/tmp/backup-${timestamp}.sql`;
  const gzipFile = `${dumpFile}.gz`;

  try {
    // データベースダンプを作成
    await execAsync(`pg_dump ${process.env.DATABASE_URL} > ${dumpFile}`);

    // gzip圧縮
    await pipeline(
      createReadStream(dumpFile),
      createGzip(),
      fs.createWriteStream(gzipFile)
    );

    // Tigrisにアップロード
    const fileContent = await fs.promises.readFile(gzipFile);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `backups/database-${timestamp}.sql.gz`,
      Body: fileContent,
      ContentType: 'application/gzip',
    });

    await s3Client.send(command);

    console.log('Backup completed:', `backups/database-${timestamp}.sql.gz`);

    // 一時ファイルを削除
    await fs.promises.unlink(dumpFile);
    await fs.promises.unlink(gzipFile);
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

// 定期実行（cron）
backupDatabase();
```

## セキュリティベストプラクティス

### 1. バケットポリシーの設定

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-storage/public/*"
    }
  ]
}
```

### 2. 署名付きURLの使用

```javascript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// アップロード用の署名付きURLを生成
async function generateUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1時間有効
  });

  return url;
}

// フロントエンドからの使用
const uploadUrl = await fetch('/api/get-upload-url', {
  method: 'POST',
  body: JSON.stringify({ filename: 'image.jpg' }),
}).then(r => r.json());

await fetch(uploadUrl.url, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type },
});
```

## まとめ

Tigris分散オブジェクトストレージは、グローバルに分散された高速なストレージソリューションです。

### 主な利点

- **グローバル配信**: 世界中のユーザーに低レイテンシーで配信
- **S3互換**: 既存のツールやライブラリがそのまま使える
- **シンプルな価格**: データ転送費用なし
- **自動レプリケーション**: 複数リージョンに自動複製

### 適用シーン

- 静的アセットの配信
- ユーザーアップロードファイルの保存
- メディアファイルの配信
- バックアップとアーカイブ

次のプロジェクトで、Tigrisを使ってグローバルに高速なストレージを実現してみてください。
