---
title: "Vercel AI SDK完全ガイド — AIアプリ開発の新標準"
description: "Vercel AI SDKで構築するAIアプリケーション。ストリーミング、チャットUI、RAG、OpenAI/Anthropic/Google連携、エッジランタイム対応を徹底解説。"
pubDate: "Feb 05 2026"
tags: ["Vercel", "AI SDK", "OpenAI", "Anthropic", "Next.js", "TypeScript"]
---

## Vercel AI SDKとは

Vercel AI SDKは、AIアプリケーション開発のための包括的なTypeScriptライブラリです。

### 特徴

- **マルチプロバイダー対応**: OpenAI、Anthropic、Google、Meta等
- **ストリーミング**: リアルタイムレスポンス
- **型安全**: TypeScriptファーストで完全な型推論
- **React統合**: チャットUIコンポーネント内蔵
- **エッジランタイム対応**: Next.js App Router完全対応
- **RAG/関数呼び出し**: 高度なAI機能を簡単に実装

2026年現在、AIアプリ開発のデファクトスタンダードになっています。

## インストール

### Next.jsプロジェクト

```bash
npx create-next-app@latest my-ai-app
cd my-ai-app
npm install ai @ai-sdk/openai @ai-sdk/anthropic
```

### 既存プロジェクトに追加

```bash
npm install ai
```

プロバイダー別SDK:

```bash
# OpenAI
npm install @ai-sdk/openai

# Anthropic (Claude)
npm install @ai-sdk/anthropic

# Google (Gemini)
npm install @ai-sdk/google

# すべて
npm install @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

## 基本的な使い方

### シンプルなテキスト生成

```typescript
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const { text } = await generateText({
  model: openai('gpt-4-turbo'),
  prompt: 'TypeScriptの利点を3つ教えて',
})

console.log(text)
```

### ストリーミング

```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

const result = await streamText({
  model: openai('gpt-4-turbo'),
  prompt: 'Reactについて詳しく説明して',
})

for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}
```

### プロバイダー切り替え

```typescript
import { anthropic } from '@ai-sdk/anthropic'

const { text } = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: 'プロンプトエンジニアリングのコツは？',
})
```

## Next.js App Routerとの統合

### API Route（基本）

`app/api/chat/route.ts`:

```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export const runtime = 'edge'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
  })

  return result.toDataStreamResponse()
}
```

### フロントエンド（useChat）

`app/page.tsx`:

```typescript
'use client'

import { useChat } from 'ai/react'

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit } = useChat()

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map(m => (
          <div
            key={m.id}
            className={`p-4 rounded-lg ${
              m.role === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'
            } max-w-[80%]`}
          >
            <div className="font-bold mb-1">
              {m.role === 'user' ? 'You' : 'AI'}
            </div>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="メッセージを入力..."
          className="flex-1 p-2 border rounded"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          送信
        </button>
      </form>
    </div>
  )
}
```

これだけで完全なチャットUIが動きます。

## 高度な機能

### システムプロンプト

```typescript
export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    system: 'あなたは親切なプログラミング講師です。初心者にもわかりやすく説明してください。',
    messages,
  })

  return result.toDataStreamResponse()
}
```

### 温度・トークン数設定

```typescript
const result = await streamText({
  model: openai('gpt-4-turbo'),
  messages,
  temperature: 0.7,  // 0-2、高いほど創造的
  maxTokens: 1000,   // 最大トークン数
  topP: 0.9,         // nucleus sampling
})
```

### 複数プロバイダー対応

```typescript
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

const models = {
  'gpt-4': openai('gpt-4-turbo'),
  'claude': anthropic('claude-3-5-sonnet-20241022'),
  'gemini': google('gemini-1.5-pro'),
}

export async function POST(req: Request) {
  const { messages, model = 'gpt-4' } = await req.json()

  const result = await streamText({
    model: models[model],
    messages,
  })

  return result.toDataStreamResponse()
}
```

フロントエンド:

```typescript
const { messages, input, handleInputChange, handleSubmit } = useChat({
  body: { model: 'claude' }  // プロバイダー切り替え
})
```

### ストリーミング状態管理

```typescript
'use client'

import { useChat } from 'ai/react'

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()

  return (
    <div>
      {/* メッセージ表示 */}
      {messages.map(m => (
        <div key={m.id}>{m.content}</div>
      ))}

      {/* ローディング表示 */}
      {isLoading && (
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent" />
          <span>考え中...</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button disabled={isLoading}>送信</button>
      </form>
    </div>
  )
}
```

## 関数呼び出し（Tools）

AIに外部ツールを使わせる機能です。

### 天気取得例

```typescript
import { streamText, tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
    tools: {
      getWeather: tool({
        description: '指定された都市の天気を取得します',
        parameters: z.object({
          city: z.string().describe('都市名（例: Tokyo）'),
        }),
        execute: async ({ city }) => {
          // 実際のAPI呼び出し
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}`
          )
          const data = await response.json()

          return {
            temperature: data.main.temp,
            description: data.weather[0].description,
          }
        },
      }),
    },
  })

  return result.toDataStreamResponse()
}
```

ユーザーが「東京の天気は？」と聞くと、AIが自動的に`getWeather`ツールを呼び出します。

### 複数ツール

```typescript
tools: {
  getWeather: tool({
    description: '天気を取得',
    parameters: z.object({
      city: z.string(),
    }),
    execute: async ({ city }) => {
      // 天気取得
    },
  }),

  searchWeb: tool({
    description: 'Web検索',
    parameters: z.object({
      query: z.string(),
    }),
    execute: async ({ query }) => {
      // Web検索
    },
  }),

  calculateMath: tool({
    description: '数式計算',
    parameters: z.object({
      expression: z.string(),
    }),
    execute: async ({ expression }) => {
      // 計算
    },
  }),
}
```

AIが状況に応じて適切なツールを選択します。

## RAG（検索拡張生成）

### ベクトル検索 + AI生成

```typescript
import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'

// ドキュメントを埋め込み
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'TypeScriptの型システムについて',
})

// ベクトルDBで類似検索（例: Pinecone、Supabase等）
const results = await vectorDB.search(embedding, { topK: 5 })

// 検索結果を使ってAI生成
const { text } = await generateText({
  model: openai('gpt-4-turbo'),
  prompt: `
以下のドキュメントを参考に質問に答えてください。

ドキュメント:
${results.map(r => r.content).join('\n\n')}

質問: TypeScriptの型システムについて教えて
  `,
})
```

### useChat + RAG

`app/api/chat/route.ts`:

```typescript
export async function POST(req: Request) {
  const { messages } = await req.json()

  // 最新メッセージから検索
  const lastMessage = messages[messages.length - 1].content

  // ベクトル検索
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: lastMessage,
  })

  const docs = await vectorDB.search(embedding, { topK: 3 })

  // コンテキストに追加
  const result = await streamText({
    model: openai('gpt-4-turbo'),
    system: `
以下のドキュメントを参考に質問に答えてください。

${docs.map(d => d.content).join('\n\n')}
    `,
    messages,
  })

  return result.toDataStreamResponse()
}
```

## マルチモーダル（画像・音声）

### 画像入力

```typescript
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const { text } = await generateText({
  model: openai('gpt-4-vision-preview'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'この画像に何が映っていますか？' },
        {
          type: 'image',
          image: 'https://example.com/image.jpg',
          // または Base64
          // image: 'data:image/jpeg;base64,...'
        },
      ],
    },
  ],
})
```

### 画像生成（DALL-E）

```typescript
import { experimental_generateImage as generateImage } from 'ai'
import { openai } from '@ai-sdk/openai'

const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: '未来都市の風景、サイバーパンク風',
  size: '1024x1024',
})

// image.url または image.base64
```

### 音声認識（Whisper）

```typescript
import { experimental_generateTranscription as generateTranscription } from 'ai'
import { openai } from '@ai-sdk/openai'

const { text } = await generateTranscription({
  model: openai.transcription('whisper-1'),
  audio: audioFileBuffer,
})
```

## useChat高度な使い方

### 初期メッセージ

```typescript
const { messages } = useChat({
  initialMessages: [
    {
      id: '1',
      role: 'system',
      content: 'あなたは親切なアシスタントです',
    },
    {
      id: '2',
      role: 'assistant',
      content: 'こんにちは！何かお手伝いできることはありますか？',
    },
  ],
})
```

### カスタムヘッダー

```typescript
const { messages } = useChat({
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Custom-Header': 'value',
  },
})
```

### エラーハンドリング

```typescript
const { messages, error } = useChat({
  onError: (error) => {
    console.error('エラー:', error)
  },
})

if (error) {
  return <div>エラーが発生しました: {error.message}</div>
}
```

### メッセージ送信完了イベント

```typescript
const { messages } = useChat({
  onFinish: (message) => {
    console.log('完了:', message)
    // ログ保存、通知など
  },
})
```

### プログラムからメッセージ送信

```typescript
const { append } = useChat()

// ボタンクリックで送信
<button onClick={() => append({ role: 'user', content: 'こんにちは' })}>
  挨拶
</button>
```

## useCompletion（単発生成）

チャット形式でなく、単発の生成に使います。

### API Route

`app/api/completion/route.ts`:

```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  const { prompt } = await req.json()

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    prompt,
  })

  return result.toDataStreamResponse()
}
```

### フロントエンド

```typescript
'use client'

import { useCompletion } from 'ai/react'

export default function CompletionPage() {
  const { completion, input, handleInputChange, handleSubmit } = useCompletion({
    api: '/api/completion',
  })

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">生成</button>
      </form>

      <div>{completion}</div>
    </div>
  )
}
```

## エッジランタイム最適化

### Cloudflare Workers

```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export default {
  async fetch(request: Request, env: Env) {
    const { messages } = await request.json()

    const result = await streamText({
      model: openai('gpt-4-turbo', {
        apiKey: env.OPENAI_API_KEY,
      }),
      messages,
    })

    return result.toDataStreamResponse()
  },
}
```

### Vercel Edge Functions

```typescript
export const runtime = 'edge'
export const preferredRegion = 'iad1'  // 最寄りリージョン

export async function POST(req: Request) {
  // 処理
}
```

## 実践例: AIチャットボット

完全な実装例:

`app/api/chat/route.ts`:

```typescript
import { streamText, tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

export const runtime = 'edge'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    system: `
あなたは親切なカスタマーサポートAIです。
以下のルールを守ってください:
- 丁寧な言葉遣い
- 簡潔でわかりやすい説明
- わからないことは正直に伝える
    `,
    messages,
    tools: {
      searchDocs: tool({
        description: 'ドキュメントを検索',
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => {
          // 実際のドキュメント検索
          const results = await searchDocumentation(query)
          return results
        },
      }),

      createTicket: tool({
        description: 'サポートチケット作成',
        parameters: z.object({
          title: z.string(),
          description: z.string(),
          priority: z.enum(['low', 'medium', 'high']),
        }),
        execute: async ({ title, description, priority }) => {
          // チケット作成
          const ticket = await createSupportTicket({ title, description, priority })
          return ticket
        },
      }),
    },
    maxTokens: 1000,
    temperature: 0.7,
  })

  return result.toDataStreamResponse()
}
```

`app/page.tsx`:

```typescript
'use client'

import { useChat } from 'ai/react'
import { useState } from 'react'

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  const [showSuggestions, setShowSuggestions] = useState(true)

  const suggestions = [
    '使い方を教えて',
    '料金プランを知りたい',
    'トラブルシューティング',
  ]

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* ヘッダー */}
      <header className="p-4 border-b bg-white">
        <h1 className="text-xl font-bold">カスタマーサポート</h1>
      </header>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && showSuggestions && (
          <div className="space-y-2">
            <p className="text-gray-600">よくある質問:</p>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  handleInputChange({ target: { value: s } } as any)
                  setShowSuggestions(false)
                }}
                className="block w-full text-left p-3 border rounded hover:bg-gray-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map(m => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-lg ${
                m.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-gray-400 rounded-full border-t-transparent" />
                <span className="text-gray-600">考え中...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 入力エリア */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="メッセージを入力..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            送信
          </button>
        </div>
      </form>
    </div>
  )
}
```

## まとめ

Vercel AI SDKは2026年現在、AIアプリ開発の最有力ライブラリです。

### メリット

- **生産性**: チャットUIが数行で実装可能
- **柔軟性**: 複数プロバイダー対応、簡単に切り替え
- **型安全**: TypeScriptで完全な型推論
- **パフォーマンス**: エッジランタイム対応、ストリーミング
- **高機能**: RAG、関数呼び出し、マルチモーダル

### ユースケース

- チャットボット
- ドキュメント検索（RAG）
- コード生成ツール
- カスタマーサポート
- AIアシスタント

Next.jsとの相性が最高で、数時間で本格的なAIアプリが作れます。
