---
title: "Cloudflare Workers AI + RAG実践: エッジでのAIアプリケーション構築"
description: "Cloudflare Workers AIとRAG(Retrieval-Augmented Generation)を組み合わせて、エッジで動作する高速なAIアプリケーションを構築する方法を実例とともに解説します。"
pubDate: "2025-07-28"
updatedDate: "2025-07-28"
tags: ["Cloudflare", "Workers AI", "RAG", "AI", "ベクトル検索", "プログラミング"]
category: "AI"
---

Cloudflare Workers AIを使えば、グローバルなエッジネットワーク上でAIモデルを実行できます。本記事では、RAG(Retrieval-Augmented Generation)パターンを実装し、Vectorizeを使ったベクトル検索と組み合わせて、実用的なAIアプリケーションを構築する方法を解説します。

## Cloudflare Workers AIとは

### 特徴

- **エッジで実行**: 世界中のCloudflareエッジロケーションでAIモデルを実行
- **低レイテンシ**: ユーザーに最も近い場所で処理
- **従量課金**: 使った分だけ支払い、アイドル時のコストなし
- **豊富なモデル**: LLM、埋め込みモデル、画像生成など多様なモデルを利用可能

### 利用可能な主要モデル

```typescript
// テキスト生成
'@cf/meta/llama-3.1-8b-instruct'
'@cf/mistral/mistral-7b-instruct-v0.2'
'@cf/qwen/qwen1.5-14b-chat-awq'

// 埋め込みモデル
'@cf/baai/bge-base-en-v1.5'
'@cf/baai/bge-large-en-v1.5'
'@cf/baai/bge-small-en-v1.5'

// 画像生成
'@cf/stabilityai/stable-diffusion-xl-base-1.0'
'@cf/bytedance/stable-diffusion-xl-lightning'
```

## 基本セットアップ

### プロジェクト作成

```bash
# Cloudflare Workersプロジェクトを作成
npm create cloudflare@latest my-ai-app

cd my-ai-app

# Wranglerで必要なバインディングを設定
```

### wrangler.toml設定

```toml
name = "ai-rag-app"
main = "src/index.ts"
compatibility_date = "2025-01-01"

# Workers AI binding
[ai]
binding = "AI"

# Vectorize index
[[vectorize]]
binding = "VECTORIZE"
index_name = "document-embeddings"

# KV for caching (optional)
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

# D1 database for metadata
[[d1_databases]]
binding = "DB"
database_name = "rag-db"
database_id = "your-db-id"
```

### Vectorizeインデックスの作成

```bash
# ベクトル検索用のインデックスを作成
wrangler vectorize create document-embeddings \
  --dimensions=768 \
  --metric=cosine
```

### D1データベースのセットアップ

```sql
-- schema.sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_documents_created_at ON documents(created_at);
```

```bash
# データベースを作成
wrangler d1 create rag-db

# スキーマを適用
wrangler d1 execute rag-db --file=./schema.sql
```

## RAGシステムの実装

### 1. 型定義

```typescript
// types.ts
export interface Env {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  DB: D1Database;
  CACHE?: KVNamespace;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  url?: string;
  metadata?: Record<string, any>;
  created_at: number;
  updated_at: number;
}

export interface SearchResult {
  id: string;
  score: number;
  document: Document;
}

export interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  metadata: {
    query: string;
    model: string;
    processingTimeMs: number;
  };
}
```

### 2. ドキュメントの埋め込みと保存

```typescript
// lib/embeddings.ts
import type { Env, Document } from './types';

export async function generateEmbedding(
  text: string,
  env: Env
): Promise<number[]> {
  const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [text],
  });

  return response.data[0];
}

export async function indexDocument(
  document: Document,
  env: Env
): Promise<void> {
  // 1. ドキュメントをD1に保存
  await env.DB.prepare(`
    INSERT INTO documents (id, title, content, url, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    document.id,
    document.title,
    document.content,
    document.url || null,
    JSON.stringify(document.metadata || {}),
    document.created_at,
    document.updated_at
  ).run();

  // 2. 埋め込みを生成
  const embedding = await generateEmbedding(
    `${document.title}\n\n${document.content}`,
    env
  );

  // 3. Vectorizeにインデックス
  await env.VECTORIZE.upsert([
    {
      id: document.id,
      values: embedding,
      metadata: {
        title: document.title,
        url: document.url,
      },
    },
  ]);
}

export async function indexDocuments(
  documents: Document[],
  env: Env
): Promise<void> {
  // バッチ処理で効率化
  const batchSize = 10;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);

    await Promise.all(
      batch.map(doc => indexDocument(doc, env))
    );

    console.log(`Indexed ${Math.min(i + batchSize, documents.length)}/${documents.length} documents`);
  }
}
```

### 3. ベクトル検索の実装

```typescript
// lib/search.ts
import type { Env, SearchResult } from './types';

export async function searchDocuments(
  query: string,
  env: Env,
  options: {
    topK?: number;
    threshold?: number;
  } = {}
): Promise<SearchResult[]> {
  const { topK = 5, threshold = 0.5 } = options;

  // 1. クエリの埋め込みを生成
  const queryEmbedding = await generateEmbedding(query, env);

  // 2. Vectorizeで類似検索
  const matches = await env.VECTORIZE.query(queryEmbedding, {
    topK,
    returnMetadata: true,
  });

  // 3. スコアでフィルタリング
  const filteredMatches = matches.matches.filter(
    match => match.score >= threshold
  );

  // 4. D1からドキュメント本体を取得
  const documentIds = filteredMatches.map(m => m.id);

  if (documentIds.length === 0) {
    return [];
  }

  const placeholders = documentIds.map(() => '?').join(',');
  const documents = await env.DB.prepare(`
    SELECT * FROM documents WHERE id IN (${placeholders})
  `).bind(...documentIds).all();

  // 5. 結果を組み合わせ
  const results: SearchResult[] = filteredMatches.map(match => {
    const doc = documents.results.find(d => d.id === match.id);

    return {
      id: match.id,
      score: match.score,
      document: {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        url: doc.url,
        metadata: JSON.parse(doc.metadata || '{}'),
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      },
    };
  });

  return results;
}
```

### 4. RAG推論の実装

```typescript
// lib/rag.ts
import type { Env, RAGResponse, SearchResult } from './types';

function buildPrompt(query: string, context: SearchResult[]): string {
  const contextText = context
    .map((result, index) => {
      return `[${index + 1}] ${result.document.title}\n${result.document.content}\nSource: ${result.document.url || 'N/A'}\n`;
    })
    .join('\n---\n\n');

  return `以下の情報を参考に、質問に日本語で答えてください。
情報に含まれていない内容については、「提供された情報からは分かりません」と答えてください。
回答には必ず参考にした情報源の番号を明記してください。

# 参考情報

${contextText}

# 質問

${query}

# 回答

`;
}

export async function generateRAGResponse(
  query: string,
  env: Env,
  options: {
    model?: string;
    topK?: number;
    temperature?: number;
  } = {}
): Promise<RAGResponse> {
  const startTime = Date.now();
  const {
    model = '@cf/meta/llama-3.1-8b-instruct',
    topK = 5,
    temperature = 0.7,
  } = options;

  // 1. 関連ドキュメントを検索
  const searchResults = await searchDocuments(query, env, { topK });

  if (searchResults.length === 0) {
    return {
      answer: '関連する情報が見つかりませんでした。別の質問を試してください。',
      sources: [],
      metadata: {
        query,
        model,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  // 2. プロンプトを構築
  const prompt = buildPrompt(query, searchResults);

  // 3. LLMで回答を生成
  const response = await env.AI.run(model, {
    prompt,
    max_tokens: 1024,
    temperature,
  });

  return {
    answer: response.response,
    sources: searchResults,
    metadata: {
      query,
      model,
      processingTimeMs: Date.now() - startTime,
    },
  };
}
```

### 5. Workerのエンドポイント

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Document } from './types';
import { indexDocument, indexDocuments } from './lib/embeddings';
import { searchDocuments } from './lib/search';
import { generateRAGResponse } from './lib/rag';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

// ヘルスチェック
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'AI RAG API is running' });
});

// ドキュメントのインデックス化
app.post('/api/documents', async (c) => {
  try {
    const document: Document = await c.req.json();

    // IDとタイムスタンプを自動生成
    document.id = document.id || crypto.randomUUID();
    document.created_at = document.created_at || Date.now();
    document.updated_at = Date.now();

    await indexDocument(document, c.env);

    return c.json({ success: true, id: document.id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// バッチインデックス化
app.post('/api/documents/batch', async (c) => {
  try {
    const { documents }: { documents: Document[] } = await c.req.json();

    // IDとタイムスタンプを自動生成
    documents.forEach(doc => {
      doc.id = doc.id || crypto.randomUUID();
      doc.created_at = doc.created_at || Date.now();
      doc.updated_at = Date.now();
    });

    await indexDocuments(documents, c.env);

    return c.json({
      success: true,
      count: documents.length,
      ids: documents.map(d => d.id),
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ベクトル検索
app.get('/api/search', async (c) => {
  try {
    const query = c.req.query('q');
    const topK = parseInt(c.req.query('topK') || '5');

    if (!query) {
      return c.json({ error: 'Query parameter "q" is required' }, 400);
    }

    const results = await searchDocuments(query, c.env, { topK });

    return c.json({ results });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// RAG推論
app.post('/api/chat', async (c) => {
  try {
    const { query, model, topK, temperature } = await c.req.json();

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const response = await generateRAGResponse(query, c.env, {
      model,
      topK,
      temperature,
    });

    return c.json(response);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ストリーミングRAG
app.post('/api/chat/stream', async (c) => {
  const { query, model, topK } = await c.req.json();

  if (!query) {
    return c.json({ error: 'Query is required' }, 400);
  }

  // 関連ドキュメントを検索
  const searchResults = await searchDocuments(query, c.env, { topK });
  const prompt = buildPrompt(query, searchResults);

  // ストリーミングレスポンス
  const stream = await env.AI.run(model || '@cf/meta/llama-3.1-8b-instruct', {
    prompt,
    stream: true,
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

export default app;
```

## 実践的な使用例

### 1. ドキュメントをクロールしてインデックス化

```typescript
// scripts/crawl-and-index.ts
async function crawlAndIndex(urls: string[]) {
  const documents: Document[] = [];

  for (const url of urls) {
    // Webページをフェッチ
    const response = await fetch(url);
    const html = await response.text();

    // HTMLをパース（例: cheerioを使用）
    const $ = cheerio.load(html);
    const title = $('h1').first().text() || $('title').text();
    const content = $('article, main, .content')
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    documents.push({
      id: crypto.randomUUID(),
      title,
      content,
      url,
      metadata: {
        crawled_at: Date.now(),
      },
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }

  // バッチでインデックス化
  const response = await fetch('https://your-worker.workers.dev/api/documents/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents }),
  });

  const result = await response.json();
  console.log(`Indexed ${result.count} documents`);
}

// 使用例: 自社ドキュメントをインデックス化
crawlAndIndex([
  'https://docs.example.com/getting-started',
  'https://docs.example.com/api-reference',
  'https://docs.example.com/best-practices',
]);
```

### 2. フロントエンドとの統合

```typescript
// app/chat/page.tsx
'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://your-worker.workers.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <h1 className="text-3xl font-bold mb-6">AI Chat with RAG</h1>

      <div className="space-y-4 mb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>

            {message.sources && message.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold mb-2">参考文献:</p>
                <ul className="text-sm space-y-1">
                  {message.sources.map((source, idx) => (
                    <li key={idx}>
                      <a
                        href={source.document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        [{idx + 1}] {source.document.title} (類似度: {(source.score * 100).toFixed(1)}%)
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="bg-gray-100 p-4 rounded-lg mr-auto max-w-[80%]">
            <p className="text-gray-500">考え中...</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="質問を入力してください"
          className="flex-1 p-3 border rounded-lg"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          送信
        </button>
      </form>
    </div>
  );
}
```

### 3. キャッシング戦略

```typescript
// lib/cache.ts
export async function getCachedResponse(
  query: string,
  env: Env
): Promise<RAGResponse | null> {
  if (!env.CACHE) return null;

  const cacheKey = `rag:${hashQuery(query)}`;
  const cached = await env.CACHE.get(cacheKey, 'json');

  return cached as RAGResponse | null;
}

export async function setCachedResponse(
  query: string,
  response: RAGResponse,
  env: Env,
  ttl: number = 3600 // 1 hour
): Promise<void> {
  if (!env.CACHE) return;

  const cacheKey = `rag:${hashQuery(query)}`;
  await env.CACHE.put(cacheKey, JSON.stringify(response), {
    expirationTtl: ttl,
  });
}

function hashQuery(query: string): string {
  // 簡易的なハッシュ関数
  return btoa(query.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '');
}

// RAG関数に統合
export async function generateRAGResponseWithCache(
  query: string,
  env: Env,
  options = {}
): Promise<RAGResponse> {
  // キャッシュをチェック
  const cached = await getCachedResponse(query, env);
  if (cached) {
    return { ...cached, metadata: { ...cached.metadata, cached: true } };
  }

  // キャッシュがなければ生成
  const response = await generateRAGResponse(query, env, options);

  // キャッシュに保存
  await setCachedResponse(query, response, env);

  return response;
}
```

## まとめ

Cloudflare Workers AIとRAGを組み合わせることで、以下が実現できます:

- **低レイテンシ**: エッジでの実行により、世界中どこでも高速
- **スケーラブル**: Cloudflareのグローバルネットワークで自動スケール
- **コスト効率**: サーバーレスで従量課金、アイドル時のコストなし
- **高精度**: RAGにより、最新情報に基づいた回答を生成
- **簡単な統合**: APIとして提供し、あらゆるフロントエンドから利用可能

Cloudflare Workers AIは、エッジでのAIアプリケーション構築の新しい選択肢として、非常に有望です。
