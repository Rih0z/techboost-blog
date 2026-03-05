---
title: "Vercel AI SDKでストリーミングAIチャットを実装する【完全ガイド】"
description: "Vercel AI SDK 4.xを使ったストリーミングAIチャットの実装方法を徹底解説。useChat、ツール呼び出し、RAG統合まで実践的に網羅します。"
pubDate: "2026-02-05"
tags: ["Vercel", "AI SDK", "OpenAI", "Streaming", "RAG", "プログラミング"]
---

## Vercel AI SDKとは

Vercel AI SDKは、AIアプリケーション開発を簡素化するフレームワークです。OpenAI、Anthropic、Google、Mistralなど主要なAIプロバイダーに統一インターフェースでアクセスでき、ストリーミングレスポンス、ツール呼び出し、UI統合を簡単に実装できます。

### 主な特徴

1. **ストリーミングファースト**: リアルタイムレスポンス表示
2. **プロバイダー非依存**: 統一APIで複数のAIモデルをサポート
3. **React Hooks**: useChat、useCompletionで簡単に統合
4. **ツール呼び出し**: 関数呼び出しを型安全に実装
5. **エッジ対応**: Vercel Edge Runtimeで高速レスポンス

## セットアップ

### インストール

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic
```

### 環境変数

`.env.local`:
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## 基本的なストリーミングチャット

### API Route (App Router)

`app/api/chat/route.ts`:
```typescript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4-turbo'),
    messages,
    system: 'あなたは親切なアシスタントです。',
  });

  return result.toDataStreamResponse();
}
```

### クライアント実装

`app/chat/page.tsx`:
```tsx
'use client';

import { useChat } from 'ai/react';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      {/* メッセージ表示 */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <p className="text-sm font-semibold mb-1">
              {message.role === 'user' ? 'あなた' : 'AI'}
            </p>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}

        {isLoading && (
          <div className="bg-gray-100 p-4 rounded-lg max-w-[80%]">
            <p className="text-sm text-gray-500">入力中...</p>
          </div>
        )}
      </div>

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="メッセージを入力..."
          className="flex-1 p-2 border rounded-lg"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
        >
          送信
        </button>
      </form>
    </div>
  );
}
```

## useCompletionによるテキスト補完

### API Route

`app/api/completion/route.ts`:
```typescript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = streamText({
    model: openai('gpt-4-turbo'),
    prompt,
  });

  return result.toDataStreamResponse();
}
```

### クライアント

`app/completion/page.tsx`:
```tsx
'use client';

import { useCompletion } from 'ai/react';

export default function CompletionPage() {
  const { completion, input, handleInputChange, handleSubmit, isLoading } =
    useCompletion({
      api: '/api/completion',
    });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">テキスト補完</h1>

      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="続けて欲しいテキストを入力..."
          className="w-full p-2 border rounded-lg"
          rows={4}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          補完
        </button>
      </form>

      {completion && (
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="whitespace-pre-wrap">{completion}</p>
        </div>
      )}
    </div>
  );
}
```

## ツール呼び出し（Function Calling）

### ツール定義

`app/api/chat-tools/route.ts`:
```typescript
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4-turbo'),
    messages,
    tools: {
      // 天気取得ツール
      getWeather: tool({
        description: '指定された都市の天気を取得します',
        parameters: z.object({
          city: z.string().describe('都市名'),
        }),
        execute: async ({ city }) => {
          // 実際のAPI呼び出し（ここではモック）
          const weatherData = {
            city,
            temperature: Math.floor(Math.random() * 30) + 5,
            condition: ['晴れ', '曇り', '雨'][Math.floor(Math.random() * 3)],
          };

          return weatherData;
        },
      }),

      // 計算ツール
      calculate: tool({
        description: '数式を計算します',
        parameters: z.object({
          expression: z.string().describe('計算式（例: 2 + 2）'),
        }),
        execute: async ({ expression }) => {
          try {
            // 安全な評価（実際はmath.jsなどを使用推奨）
            const result = eval(expression);
            return { result };
          } catch (error) {
            return { error: '計算に失敗しました' };
          }
        },
      }),

      // データベース検索ツール
      searchDatabase: tool({
        description: 'データベースから情報を検索します',
        parameters: z.object({
          query: z.string().describe('検索クエリ'),
          limit: z.number().optional().describe('取得件数（デフォルト: 5）'),
        }),
        execute: async ({ query, limit = 5 }) => {
          // 実際のDB検索
          const results = await db.query(
            'SELECT * FROM articles WHERE content LIKE ? LIMIT ?',
            [`%${query}%`, limit]
          );

          return results;
        },
      }),
    },
    maxSteps: 5, // ツール呼び出しの最大回数
  });

  return result.toDataStreamResponse();
}
```

### ツール実行の表示

`app/chat-tools/page.tsx`:
```tsx
'use client';

import { useChat } from 'ai/react';
import { Message } from 'ai';

export default function ChatToolsPage() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat-tools',
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-4 mb-4">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="例: 東京の天気を教えて"
          className="w-full p-2 border rounded-lg"
        />
      </form>
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  return (
    <div
      className={`p-4 rounded-lg ${
        message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
      }`}
    >
      <p className="font-semibold mb-2">
        {message.role === 'user' ? 'あなた' : 'AI'}
      </p>

      {/* テキストコンテンツ */}
      {message.content && (
        <p className="whitespace-pre-wrap">{message.content}</p>
      )}

      {/* ツール呼び出し表示 */}
      {message.toolInvocations?.map((tool, index) => (
        <div key={index} className="mt-2 p-2 bg-white rounded border">
          <p className="text-sm font-mono text-gray-600">
            🔧 {tool.toolName}
          </p>
          <pre className="text-xs mt-1 overflow-x-auto">
            {JSON.stringify(tool.args, null, 2)}
          </pre>

          {tool.state === 'result' && (
            <div className="mt-2 p-2 bg-green-50 rounded">
              <p className="text-sm text-green-700">結果:</p>
              <pre className="text-xs mt-1">
                {JSON.stringify(tool.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

## RAG統合（Retrieval-Augmented Generation）

### ベクトル検索とチャット統合

`app/api/chat-rag/route.ts`:
```typescript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const embeddingModel = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}).embedding('text-embedding-3-small');

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 最新のユーザーメッセージを取得
  const lastMessage = messages[messages.length - 1].content;

  // 質問をベクトル化
  const { embedding } = await embed({
    model: embeddingModel,
    value: lastMessage,
  });

  // ベクトル検索（PostgreSQL + pgvector の例）
  const relevantDocs = await db.query(`
    SELECT content, metadata
    FROM documents
    ORDER BY embedding <-> $1
    LIMIT 5
  `, [JSON.stringify(embedding)]);

  // コンテキストを構築
  const context = relevantDocs
    .map((doc) => doc.content)
    .join('\n\n---\n\n');

  const result = streamText({
    model: openai('gpt-4-turbo'),
    messages,
    system: `
あなたは社内ドキュメントに基づいて回答するアシスタントです。
以下の関連ドキュメントを参照して回答してください。

## 関連ドキュメント
${context}

回答する際は、必ずドキュメントの内容に基づいてください。
ドキュメントに情報がない場合は、その旨を伝えてください。
    `.trim(),
  });

  return result.toDataStreamResponse();
}
```

### ドキュメント埋め込み（セットアップ時）

`scripts/embed-documents.ts`:
```typescript
import { embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { db } from '@/lib/db';

const embeddingModel = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}).embedding('text-embedding-3-small');

async function embedDocuments() {
  // ドキュメント取得
  const documents = await db.query('SELECT id, content FROM documents');

  // バッチで埋め込み生成
  const contents = documents.map((d) => d.content);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: contents,
  });

  // データベースに保存
  for (let i = 0; i < documents.length; i++) {
    await db.query(
      'UPDATE documents SET embedding = $1 WHERE id = $2',
      [JSON.stringify(embeddings[i]), documents[i].id]
    );
  }

  console.log(`${documents.length}件のドキュメントを埋め込みました`);
}

embedDocuments();
```

## 複数プロバイダーの切り替え

```typescript
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages, provider = 'openai' } = await req.json();

  const models = {
    openai: openai('gpt-4-turbo'),
    anthropic: anthropic('claude-3-5-sonnet-20241022'),
    google: google('gemini-1.5-pro'),
  };

  const result = streamText({
    model: models[provider as keyof typeof models],
    messages,
  });

  return result.toDataStreamResponse();
}
```

## エラーハンドリング

```tsx
'use client';

import { useChat } from 'ai/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function ChatWithErrorHandling() {
  const { messages, input, handleInputChange, handleSubmit, error } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  useEffect(() => {
    if (error) {
      toast.error('エラーが発生しました', {
        description: error.message,
      });
    }
  }, [error]);

  return (
    <div>
      {/* UI */}
      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded-lg mb-4">
          エラー: {error.message}
        </div>
      )}
      {/* ... */}
    </div>
  );
}
```

## パフォーマンス最適化

### ストリーミングバッファ設定

```typescript
const result = streamText({
  model: openai('gpt-4-turbo'),
  messages,
  experimental_streamBuffer: true, // バッファリングで遅延削減
});
```

### キャッシュ活用

```typescript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4-turbo'),
    messages,
    // システムプロンプトをキャッシュ（Anthropic Claude）
    system: {
      cache: true,
      content: 'あなたは専門家です...(長いプロンプト)',
    },
  });

  return result.toDataStreamResponse();
}
```

## まとめ

Vercel AI SDKは、以下の点で優れています。

1. **ストリーミング**: リアルタイムレスポンスで優れたUX
2. **React統合**: useChat/useCompletionで簡単に実装
3. **ツール呼び出し**: 型安全な関数呼び出し
4. **RAG対応**: ベクトル検索との統合が容易
5. **マルチプロバイダー**: 統一APIで柔軟に切り替え

これらの機能を活用することで、高品質なAIアプリケーションを迅速に構築できます。Edge Runtimeとの組み合わせで、グローバルに高速なレスポンスを実現できる点も大きな魅力です。
