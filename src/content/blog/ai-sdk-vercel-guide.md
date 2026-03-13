---
title: 'Vercel AI SDK実践ガイド2026'
description: 'Vercel AI SDKを徹底解説。useChat/useCompletion、ストリーミングUI、マルチモーダル対応、ツール使用、エージェント構築、Next.js統合、OpenAI/Claude/Gemini連携を実例付きで紹介。基礎から応用まで幅広くカバーしています。'
pubDate: '2026-02-05'
tags: ['AI', 'Vercel', 'Next.js', 'TypeScript']
heroImage: '../../assets/thumbnails/ai-sdk-vercel-guide.jpg'
---

Vercel AI SDKは、AIアプリケーション開発を簡単にする包括的なツールキットです。本記事では、基本から応用までを網羅的に解説します。

## 目次

1. Vercel AI SDKとは
2. セットアップ
3. useChat - チャットUI構築
4. useCompletion - テキスト生成
5. ストリーミングレスポンス
6. ツール使用（Function Calling）
7. マルチモーダル対応
8. エージェント構築
9. Next.js統合パターン

## Vercel AI SDKとは

### 特徴と構成

```typescript
/**
 * Vercel AI SDK の特徴
 *
 * 1. プロバイダー非依存
 *    - OpenAI, Anthropic, Google, etc.
 *    - 統一インターフェース
 *
 * 2. React Hooks
 *    - useChat: チャットUI
 *    - useCompletion: テキスト生成
 *    - useAssistant: アシスタント
 *
 * 3. ストリーミング対応
 *    - Server-Sent Events (SSE)
 *    - リアルタイム表示
 *
 * 4. エッジランタイム対応
 *    - Vercel Edge Functions
 *    - 低レイテンシ
 */

// パッケージ構成
const packages = {
  'ai': 'コアパッケージ（Hooks, ストリーミング）',
  '@ai-sdk/openai': 'OpenAI プロバイダー',
  '@ai-sdk/anthropic': 'Anthropic (Claude) プロバイダー',
  '@ai-sdk/google': 'Google (Gemini) プロバイダー',
}
```

### サポートプロバイダー（2026年2月）

```typescript
// 主要プロバイダー一覧
const providers = {
  openai: ['gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet', 'claude-3-opus'],
  google: ['gemini-pro', 'gemini-pro-vision'],
  mistral: ['mistral-large', 'mistral-medium'],
  cohere: ['command', 'command-light'],
  huggingface: ['任意のモデル'],
}
```

## セットアップ

### インストール

```bash
# コアパッケージ + OpenAI
npm install ai @ai-sdk/openai

# Anthropic (Claude)
npm install @ai-sdk/anthropic

# Google (Gemini)
npm install @ai-sdk/google

# Next.js プロジェクト例
npx create-next-app@latest my-ai-app
cd my-ai-app
npm install ai @ai-sdk/openai
```

### 環境変数

```bash
# .env.local
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

### プロバイダー初期化

```typescript
// lib/ai.ts
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

// OpenAI
export const gpt4 = openai('gpt-4')
export const gpt35 = openai('gpt-3.5-turbo')

// Anthropic
export const claude = anthropic('claude-3-5-sonnet-20241022')

// Google
export const gemini = google('gemini-pro')
```

## useChat - チャットUI構築

### 基本的なチャット実装

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const runtime = 'edge'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4'),
    messages,
  })

  return result.toAIStreamResponse()
}
```

```typescript
// app/page.tsx
'use client'

import { useChat } from 'ai/react'

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat()

  return (
    <div>
      <div>
        {messages.map(message => (
          <div key={message.id}>
            <strong>{message.role}:</strong> {message.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          disabled={isLoading}
          placeholder="メッセージを入力..."
        />
        <button type="submit" disabled={isLoading}>
          送信
        </button>
      </form>
    </div>
  )
}
```

### システムプロンプト付き

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4'),
    system: 'あなたは親切なAIアシスタントです。常に丁寧に回答してください。',
    messages,
  })

  return result.toAIStreamResponse()
}
```

### カスタマイズされたチャットUI

```typescript
'use client'

import { useChat } from 'ai/react'
import { Send, Loader2 } from 'lucide-react'

export default function AdvancedChat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        content: 'こんにちは！何かお手伝いできることはありますか？',
      },
    ],
    onError: (error) => {
      console.error('Chat error:', error)
    },
    onFinish: (message) => {
      console.log('Message finished:', message)
    },
  })

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 px-4 py-2 rounded-lg">
              <Loader2 className="animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-center">
            エラーが発生しました。
            <button onClick={() => reload()} className="underline ml-2">
              再試行
            </button>
          </div>
        )}
      </div>

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-2 border rounded-lg"
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="px-4 py-2 bg-red-500 text-white rounded-lg"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              <Send size={20} />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
```

## useCompletion - テキスト生成

### 基本的なテキスト生成

```typescript
// app/api/completion/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const runtime = 'edge'

export async function POST(req: Request) {
  const { prompt } = await req.json()

  const result = await streamText({
    model: openai('gpt-4'),
    prompt,
  })

  return result.toAIStreamResponse()
}
```

```typescript
// app/completion/page.tsx
'use client'

import { useCompletion } from 'ai/react'

export default function CompletionPage() {
  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useCompletion()

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="プロンプトを入力..."
          rows={5}
        />
        <button type="submit" disabled={isLoading}>
          生成
        </button>
      </form>

      {completion && (
        <div>
          <h2>生成結果:</h2>
          <p>{completion}</p>
        </div>
      )}
    </div>
  )
}
```

### コード生成例

```typescript
'use client'

import { useCompletion } from 'ai/react'
import { useState } from 'react'

export default function CodeGenerator() {
  const [language, setLanguage] = useState('typescript')
  const { completion, input, handleInputChange, handleSubmit, isLoading } =
    useCompletion({
      api: '/api/code-generation',
      body: { language },
    })

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">コード生成</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">言語:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border px-4 py-2 rounded"
          >
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>
        </div>

        <div>
          <label className="block mb-2">説明:</label>
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder="実装したい機能を説明してください"
            rows={5}
            className="w-full border px-4 py-2 rounded"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {isLoading ? '生成中...' : 'コード生成'}
        </button>
      </form>

      {completion && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-2">生成されたコード:</h2>
          <pre className="bg-gray-900 text-white p-4 rounded overflow-x-auto">
            <code>{completion}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
```

```typescript
// app/api/code-generation/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export async function POST(req: Request) {
  const { prompt, language } = await req.json()

  const result = await streamText({
    model: openai('gpt-4'),
    system: `
あなたは${language}の専門家です。
ユーザーの説明に基づいて、高品質なコードを生成してください。
コードのみを出力し、説明は最小限にしてください。
    `,
    prompt,
  })

  return result.toAIStreamResponse()
}
```

## ストリーミングレスポンス

### Server-Sent Events (SSE)

```typescript
// app/api/stream/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4'),
    messages,
    // ストリーミング設定
    onChunk: ({ chunk }) => {
      console.log('Chunk received:', chunk)
    },
    onFinish: ({ text, finishReason }) => {
      console.log('Finished:', { text, finishReason })
    },
  })

  return result.toAIStreamResponse()
}
```

### カスタムストリーミング処理

```typescript
'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'

export default function StreamingChat() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    onResponse: (response) => {
      console.log('Response started')
    },
    onFinish: (message) => {
      console.log('Response finished:', message)
    },
  })

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div>
      <div className="messages">
        {messages.map(message => (
          <div key={message.id}>
            <strong>{message.role}:</strong>
            <div>{message.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">送信</button>
      </form>
    </div>
  )
}
```

## ツール使用（Function Calling）

### ツール定義

```typescript
// app/api/chat-with-tools/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'
import { z } from 'zod'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4'),
    messages,
    tools: {
      // 天気情報取得ツール
      getWeather: tool({
        description: '指定された場所の天気情報を取得します',
        parameters: z.object({
          location: z.string().describe('都市名（例: 東京、New York）'),
          unit: z.enum(['celsius', 'fahrenheit']).optional(),
        }),
        execute: async ({ location, unit = 'celsius' }) => {
          // 実際の天気API呼び出し
          console.log(`Getting weather for ${location}`)

          // モックデータ
          return {
            location,
            temperature: 22,
            condition: 'Sunny',
            unit,
          }
        },
      }),

      // 計算ツール
      calculate: tool({
        description: '数式を計算します',
        parameters: z.object({
          expression: z.string().describe('計算する数式（例: 2 + 2）'),
        }),
        execute: async ({ expression }) => {
          try {
            // 注意: eval は危険。実際には安全な計算ライブラリを使用
            const result = eval(expression)
            return { result }
          } catch (error) {
            return { error: 'Invalid expression' }
          }
        },
      }),

      // データベース検索ツール
      searchDatabase: tool({
        description: 'データベースを検索します',
        parameters: z.object({
          query: z.string().describe('検索クエリ'),
          limit: z.number().optional().describe('結果の上限'),
        }),
        execute: async ({ query, limit = 10 }) => {
          console.log(`Searching database: ${query}`)

          // モックデータ
          return {
            results: [
              { id: 1, title: 'Result 1', score: 0.95 },
              { id: 2, title: 'Result 2', score: 0.87 },
            ],
          }
        },
      }),
    },
  })

  return result.toAIStreamResponse()
}
```

### クライアント側でツール結果を表示

```typescript
'use client'

import { useChat } from 'ai/react'

export default function ChatWithTools() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat-with-tools',
  })

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          <strong>{message.role}:</strong>
          <div>{message.content}</div>

          {/* ツール呼び出しを表示 */}
          {message.toolInvocations?.map((tool, index) => (
            <div key={index} className="tool-call">
              <strong>Tool: {tool.toolName}</strong>
              <pre>{JSON.stringify(tool.args, null, 2)}</pre>
              {tool.result && (
                <pre>{JSON.stringify(tool.result, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">送信</button>
      </form>
    </div>
  )
}
```

## マルチモーダル対応

### 画像入力

```typescript
// app/api/vision/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4-vision-preview'),
    messages,
  })

  return result.toAIStreamResponse()
}
```

```typescript
'use client'

import { useChat } from 'ai/react'
import { useState } from 'react'

export default function VisionChat() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const { messages, input, handleInputChange, handleSubmit, setInput } =
    useChat({
      api: '/api/vision',
    })

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        setSelectedImage(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmitWithImage = (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedImage) {
      // 画像とテキストを送信
      handleSubmit(e, {
        data: {
          imageUrl: selectedImage,
        },
      })
      setSelectedImage(null)
    } else {
      handleSubmit(e)
    }
  }

  return (
    <div>
      <div>
        {messages.map(message => (
          <div key={message.id}>
            <strong>{message.role}:</strong>
            <div>{message.content}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmitWithImage}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />

        {selectedImage && (
          <img
            src={selectedImage}
            alt="Selected"
            className="max-w-xs my-2"
          />
        )}

        <input
          value={input}
          onChange={handleInputChange}
          placeholder="質問を入力..."
        />
        <button type="submit">送信</button>
      </form>
    </div>
  )
}
```

## エージェント構築

### シンプルなエージェント

```typescript
// app/api/agent/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'
import { z } from 'zod'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4'),
    system: `
あなたは有能なAIエージェントです。
ユーザーの質問に答えるために、必要に応じてツールを使用してください。
複数のツールを組み合わせて、複雑なタスクを解決できます。
    `,
    messages,
    tools: {
      webSearch: tool({
        description: 'Web検索を実行します',
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => {
          // 実際の検索API呼び出し
          return { results: [`Result for ${query}`] }
        },
      }),

      readFile: tool({
        description: 'ファイルの内容を読み取ります',
        parameters: z.object({
          path: z.string(),
        }),
        execute: async ({ path }) => {
          // ファイル読み取り
          return { content: `Content of ${path}` }
        },
      }),

      writeFile: tool({
        description: 'ファイルに書き込みます',
        parameters: z.object({
          path: z.string(),
          content: z.string(),
        }),
        execute: async ({ path, content }) => {
          // ファイル書き込み
          return { success: true }
        },
      }),

      executeCode: tool({
        description: 'コードを実行します',
        parameters: z.object({
          code: z.string(),
          language: z.enum(['python', 'javascript']),
        }),
        execute: async ({ code, language }) => {
          // コード実行（サンドボックス環境で）
          return { output: `Executed ${language} code` }
        },
      }),
    },
    maxToolRoundtrips: 5, // 最大5回までツール使用を繰り返す
  })

  return result.toAIStreamResponse()
}
```

### RAGエージェント

```typescript
// app/api/rag-agent/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText, tool, embed } from 'ai'
import { z } from 'zod'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4'),
    system: `
あなたは社内ドキュメントに基づいて回答するAIアシスタントです。
質問に答える前に、必ず関連するドキュメントを検索してください。
    `,
    messages,
    tools: {
      searchDocuments: tool({
        description: '社内ドキュメントを検索します',
        parameters: z.object({
          query: z.string(),
          limit: z.number().optional(),
        }),
        execute: async ({ query, limit = 5 }) => {
          // ベクトル検索の実装
          // 1. クエリを埋め込みベクトルに変換
          // 2. ベクトルデータベースで類似度検索
          // 3. 関連ドキュメントを返す

          return {
            documents: [
              {
                title: 'Document 1',
                content: 'Relevant content...',
                score: 0.95,
              },
              {
                title: 'Document 2',
                content: 'More content...',
                score: 0.87,
              },
            ],
          }
        },
      }),
    },
  })

  return result.toAIStreamResponse()
}
```

## Next.js統合パターン

### App Router統合

```typescript
// app/chat/layout.tsx
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-100 p-4">
        {/* サイドバー */}
        <h2>会話履歴</h2>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  )
}

// app/chat/[id]/page.tsx
export default function ChatPage({ params }: { params: { id: string } }) {
  return <ChatInterface chatId={params.id} />
}
```

### Server Actions統合

```typescript
// app/actions.ts
'use server'

import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

export async function generateResponse(prompt: string) {
  const { text } = await generateText({
    model: openai('gpt-4'),
    prompt,
  })

  return text
}
```

```typescript
// app/page.tsx
'use client'

import { generateResponse } from './actions'
import { useState } from 'react'

export default function Page() {
  const [response, setResponse] = useState('')

  const handleSubmit = async (formData: FormData) => {
    const prompt = formData.get('prompt') as string
    const result = await generateResponse(prompt)
    setResponse(result)
  }

  return (
    <form action={handleSubmit}>
      <input name="prompt" placeholder="プロンプトを入力" />
      <button type="submit">送信</button>
      {response && <div>{response}</div>}
    </form>
  )
}
```

## まとめ

Vercel AI SDKは、AIアプリケーション開発を劇的に簡素化する強力なツールキットです。

**主要ポイント**:

1. **React Hooks**: useChat/useCompletion で簡単UI構築
2. **プロバイダー非依存**: OpenAI/Claude/Gemini統一API
3. **ストリーミング**: リアルタイムレスポンス表示
4. **ツール使用**: Function Calling でエージェント構築
5. **Next.js統合**: App Router/Server Actions完全対応

**2026年のベストプラクティス**:

- useChat でチャットUI構築
- ツール使用でエージェント機能拡張
- ストリーミングでUX向上
- エッジランタイムで低レイテンシ
- 型安全性をZodで確保

Vercel AI SDKを活用して、次世代のAIアプリケーションを構築しましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
