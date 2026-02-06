---
title: 'Claude API完全ガイド2026 - Messages API、ストリーミング、ツール使用、コンテキストウィンドウ、ベストプラクティス'
description: 'Anthropic Claude APIを徹底解説。Messages API、ストリーミング、ツール使用、200Kコンテキストウィンドウ活用、プロンプトキャッシング、コスト最適化を実例付きで紹介'
pubDate: 'Feb 05 2026'
tags: ['AI', 'API', 'Claude', 'TypeScript']
---

# Claude API完全ガイド2026

Anthropic Claude APIは、高度な推論能力を持つAI APIです。本記事では、Messages APIの基本からツール使用、最適化まで網羅的に解説します。

## 目次

1. Claude APIとは
2. セットアップと認証
3. Messages API基本
4. ストリーミングレスポンス
5. ツール使用（Function Calling）
6. コンテキストウィンドウ活用
7. プロンプトキャッシング
8. コスト最適化
9. 実践パターン

## Claude APIとは

### 特徴と強み

```typescript
/**
 * Claude API の特徴
 *
 * 1. 高度な推論能力
 *    - 複雑な指示の理解
 *    - 長文の要約と分析
 *    - コード生成と説明
 *
 * 2. 大きなコンテキストウィンドウ
 *    - Claude 3.5 Sonnet: 200K トークン
 *    - Claude 3 Opus: 200K トークン
 *
 * 3. ツール使用
 *    - Function Calling
 *    - 外部API連携
 *
 * 4. 安全性
 *    - Constitutional AI
 *    - 有害コンテンツフィルタリング
 */

// モデル一覧（2026年2月時点）
const CLAUDE_MODELS = {
  // 最新モデル
  sonnet35: 'claude-3-5-sonnet-20241022',

  // Claude 3 シリーズ
  opus3: 'claude-3-opus-20240229',
  sonnet3: 'claude-3-sonnet-20240229',
  haiku3: 'claude-3-haiku-20240307',

  // レガシー
  claude2: 'claude-2.1',
} as const
```

### 料金（2026年2月時点）

```typescript
// 概算料金（$USD per Million tokens）
const PRICING = {
  'claude-3-5-sonnet-20241022': {
    input: 3.00,
    output: 15.00,
    cachedInput: 0.30, // 90% off
  },
  'claude-3-opus-20240229': {
    input: 15.00,
    output: 75.00,
    cachedInput: 1.50,
  },
  'claude-3-sonnet-20240229': {
    input: 3.00,
    output: 15.00,
  },
  'claude-3-haiku-20240307': {
    input: 0.25,
    output: 1.25,
    cachedInput: 0.03,
  },
} as const

// コスト計算関数
function calculateCost(
  model: keyof typeof PRICING,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0
): number {
  const pricing = PRICING[model]

  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  const cachedCost = pricing.cachedInput
    ? (cachedInputTokens / 1_000_000) * pricing.cachedInput
    : 0

  return inputCost + outputCost + cachedCost
}
```

## セットアップと認証

### SDKインストール

```bash
# TypeScript/JavaScript
npm install @anthropic-ai/sdk

# Python
pip install anthropic
```

### 基本的な設定

```typescript
import Anthropic from '@anthropic-ai/sdk'

// クライアント初期化
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 環境変数の設定
// .env
// ANTHROPIC_API_KEY=sk-ant-api03-...

// 型安全な設定
interface ClaudeConfig {
  apiKey: string
  maxRetries?: number
  timeout?: number
  baseURL?: string
}

function createClient(config: ClaudeConfig): Anthropic {
  return new Anthropic({
    apiKey: config.apiKey,
    maxRetries: config.maxRetries ?? 2,
    timeout: config.timeout ?? 60000,
    baseURL: config.baseURL,
  })
}
```

### エラーハンドリング

```typescript
import {
  APIError,
  APIConnectionError,
  APITimeoutError,
  RateLimitError,
  AuthenticationError,
} from '@anthropic-ai/sdk'

async function safeAPICall<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof RateLimitError) {
      // レート制限: リトライ
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return safeAPICall(fn, retries - 1)
      }
    }

    if (error instanceof APITimeoutError) {
      console.error('API timeout')
      throw new Error('Request timed out')
    }

    if (error instanceof AuthenticationError) {
      console.error('Authentication failed')
      throw new Error('Invalid API key')
    }

    if (error instanceof APIConnectionError) {
      console.error('Connection error')
      throw new Error('Failed to connect to API')
    }

    throw error
  }
}
```

## Messages API基本

### シンプルな呼び出し

```typescript
// 基本的なメッセージ送信
async function simpleMessage() {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: 'Hello, Claude!'
      }
    ],
  })

  console.log(message.content[0].text)
}

// システムプロンプト付き
async function withSystemPrompt() {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: 'あなたは親切なAIアシスタントです。常に丁寧に回答してください。',
    messages: [
      {
        role: 'user',
        content: 'TypeScriptについて教えてください'
      }
    ],
  })

  return message.content[0].text
}
```

### マルチターン会話

```typescript
// 会話履歴を保持
class ConversationManager {
  private messages: Anthropic.MessageParam[] = []

  constructor(
    private anthropic: Anthropic,
    private systemPrompt?: string
  ) {}

  async sendMessage(userMessage: string): Promise<string> {
    // ユーザーメッセージを追加
    this.messages.push({
      role: 'user',
      content: userMessage,
    })

    // API呼び出し
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: this.systemPrompt,
      messages: this.messages,
    })

    // アシスタントの返答を履歴に追加
    const assistantMessage = response.content[0].text
    this.messages.push({
      role: 'assistant',
      content: assistantMessage,
    })

    return assistantMessage
  }

  getHistory(): Anthropic.MessageParam[] {
    return [...this.messages]
  }

  clearHistory(): void {
    this.messages = []
  }
}

// 使用例
const conversation = new ConversationManager(
  anthropic,
  'あなたはプログラミング教師です'
)

const response1 = await conversation.sendMessage('TypeScriptとは何ですか？')
console.log(response1)

const response2 = await conversation.sendMessage('具体例を教えてください')
console.log(response2)
```

### マルチモーダル（画像入力）

```typescript
import * as fs from 'fs'

// 画像を base64 エンコード
function encodeImage(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath)
  return imageBuffer.toString('base64')
}

// 画像付きメッセージ
async function analyzeImage(imagePath: string) {
  const imageData = encodeImage(imagePath)
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageData,
            },
          },
          {
            type: 'text',
            text: 'この画像について説明してください',
          },
        ],
      },
    ],
  })

  return message.content[0].text
}

// URLから画像を分析
async function analyzeImageFromURL(imageUrl: string) {
  const response = await fetch(imageUrl)
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64,
            },
          },
          {
            type: 'text',
            text: 'この画像のテキストを抽出してください',
          },
        ],
      },
    ],
  })

  return message.content[0].text
}
```

## ストリーミングレスポンス

### 基本的なストリーミング

```typescript
// ストリーミングレスポンスを処理
async function streamMessage(userMessage: string) {
  const stream = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userMessage }],
    stream: true,
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      process.stdout.write(event.delta.text)
    }
  }

  console.log('\n')
}

// イベントハンドラー付き
async function streamWithHandlers(userMessage: string) {
  let fullText = ''

  const stream = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userMessage }],
    stream: true,
  })

  for await (const event of stream) {
    switch (event.type) {
      case 'message_start':
        console.log('Message started')
        break

      case 'content_block_start':
        console.log('Content block started')
        break

      case 'content_block_delta':
        if (event.delta.type === 'text_delta') {
          fullText += event.delta.text
          process.stdout.write(event.delta.text)
        }
        break

      case 'content_block_stop':
        console.log('\nContent block stopped')
        break

      case 'message_delta':
        console.log('Stop reason:', event.delta.stop_reason)
        break

      case 'message_stop':
        console.log('Message stopped')
        break
    }
  }

  return fullText
}
```

### React統合

```typescript
// React用カスタムフック
import { useState, useCallback } from 'react'

interface UseClaudeStreamOptions {
  apiKey: string
  model?: string
  systemPrompt?: string
}

export function useClaudeStream(options: UseClaudeStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState<Error | null>(null)

  const sendMessage = useCallback(
    async (message: string) => {
      setIsStreaming(true)
      setResponse('')
      setError(null)

      try {
        const anthropic = new Anthropic({
          apiKey: options.apiKey,
          dangerouslyAllowBrowser: true, // クライアントサイド実行の場合
        })

        const stream = await anthropic.messages.create({
          model: options.model ?? 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: options.systemPrompt,
          messages: [{ role: 'user', content: message }],
          stream: true,
        })

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            setResponse(prev => prev + event.delta.text)
          }
        }
      } catch (err) {
        setError(err as Error)
      } finally {
        setIsStreaming(false)
      }
    },
    [options]
  )

  return { response, isStreaming, error, sendMessage }
}

// 使用例
function ChatComponent() {
  const { response, isStreaming, sendMessage } = useClaudeStream({
    apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY!,
    systemPrompt: 'あなたは親切なAIアシスタントです',
  })

  return (
    <div>
      <button
        onClick={() => sendMessage('Hello!')}
        disabled={isStreaming}
      >
        送信
      </button>
      <div>{response}</div>
    </div>
  )
}
```

## ツール使用（Function Calling）

### 基本的なツール定義

```typescript
// ツール定義
const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: '指定された場所の天気情報を取得します',
    input_schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: '都市名（例: 東京、New York）',
        },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: '温度の単位',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'calculate',
    description: '数式を計算します',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '計算する数式（例: 2 + 2）',
        },
      },
      required: ['expression'],
    },
  },
]

// ツール実行関数
async function executeTools(
  toolName: string,
  toolInput: Record<string, any>
): Promise<string> {
  switch (toolName) {
    case 'get_weather':
      return JSON.stringify({
        location: toolInput.location,
        temperature: 22,
        condition: 'Sunny',
        unit: toolInput.unit ?? 'celsius',
      })

    case 'calculate':
      try {
        // 注意: eval は危険なので実際には安全な計算ライブラリを使用
        const result = eval(toolInput.expression)
        return JSON.stringify({ result })
      } catch (error) {
        return JSON.stringify({ error: 'Invalid expression' })
      }

    default:
      return JSON.stringify({ error: 'Unknown tool' })
  }
}
```

### ツールを使った会話

```typescript
async function chatWithTools(userMessage: string) {
  let messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  // 最初のAPI呼び出し
  let response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    tools: tools,
    messages: messages,
  })

  // ツール使用を繰り返し処理
  while (response.stop_reason === 'tool_use') {
    // アシスタントのメッセージを追加
    messages.push({
      role: 'assistant',
      content: response.content,
    })

    // ツール実行結果を収集
    const toolResults: Anthropic.MessageParam = {
      role: 'user',
      content: [],
    }

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        console.log(`Executing tool: ${block.name}`)
        console.log('Input:', block.input)

        const result = await executeTools(block.name, block.input)
        console.log('Result:', result)

        toolResults.content.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        })
      }
    }

    // ツール結果を追加
    messages.push(toolResults)

    // 次のAPI呼び出し
    response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      tools: tools,
      messages: messages,
    })
  }

  // 最終的なテキストレスポンスを抽出
  const textBlock = response.content.find(block => block.type === 'text')
  return textBlock?.text ?? ''
}

// 使用例
const answer = await chatWithTools('東京の天気は？ ついでに 123 × 456 を計算して')
console.log(answer)
```

### 複雑なツールチェーン

```typescript
// データベース操作ツール
const databaseTools: Anthropic.Tool[] = [
  {
    name: 'search_database',
    description: 'データベースを検索します',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '検索クエリ' },
        limit: { type: 'number', description: '結果の上限' },
      },
      required: ['query'],
    },
  },
  {
    name: 'insert_record',
    description: 'データベースにレコードを挿入します',
    input_schema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'テーブル名' },
        data: { type: 'object', description: '挿入するデータ' },
      },
      required: ['table', 'data'],
    },
  },
  {
    name: 'update_record',
    description: 'データベースのレコードを更新します',
    input_schema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'テーブル名' },
        id: { type: 'string', description: 'レコードID' },
        data: { type: 'object', description: '更新するデータ' },
      },
      required: ['table', 'id', 'data'],
    },
  },
]

// ツール実行ハンドラー
class ToolExecutor {
  async execute(
    toolName: string,
    toolInput: Record<string, any>
  ): Promise<string> {
    console.log(`[Tool] ${toolName}`, toolInput)

    // 実際のデータベース操作はここで実行
    switch (toolName) {
      case 'search_database':
        return JSON.stringify([
          { id: 1, name: 'Sample 1' },
          { id: 2, name: 'Sample 2' },
        ])

      case 'insert_record':
        return JSON.stringify({
          success: true,
          id: 'new-id-123',
        })

      case 'update_record':
        return JSON.stringify({
          success: true,
          updated: 1,
        })

      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }
}
```

## コンテキストウィンドウ活用

### 長文の処理

```typescript
// 長文ドキュメントの要約
async function summarizeLongDocument(document: string) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    system: '以下の文書を3つの要点にまとめてください',
    messages: [
      {
        role: 'user',
        content: document,
      },
    ],
  })

  return message.content[0].text
}

// 複数ドキュメントの比較
async function compareDocuments(doc1: string, doc2: string) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `
以下の2つの文書を比較し、主な違いを説明してください。

【文書1】
${doc1}

【文書2】
${doc2}
        `,
      },
    ],
  })

  return message.content[0].text
}
```

### コードベース分析

```typescript
import * as fs from 'fs'
import * as path from 'path'

// ディレクトリ内の全ファイルを読み込み
function readDirectory(dirPath: string): string {
  let content = ''

  function traverse(currentPath: string) {
    const files = fs.readdirSync(currentPath)

    for (const file of files) {
      const fullPath = path.join(currentPath, file)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git') {
          traverse(fullPath)
        }
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const fileContent = fs.readFileSync(fullPath, 'utf-8')
        content += `\n\n--- ${fullPath} ---\n${fileContent}`
      }
    }
  }

  traverse(dirPath)
  return content
}

// コードベース分析
async function analyzeCodebase(projectPath: string) {
  const codeContent = readDirectory(projectPath)

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: 'あなたは経験豊富なコードレビュアーです',
    messages: [
      {
        role: 'user',
        content: `
以下のコードベースを分析し、以下の点を報告してください：

1. アーキテクチャの概要
2. 改善提案
3. セキュリティ上の懸念
4. パフォーマンスの問題

${codeContent}
        `,
      },
    ],
  })

  return message.content[0].text
}
```

## プロンプトキャッシング

### キャッシュの活用

```typescript
// システムプロンプトをキャッシュ
async function withCaching() {
  const longSystemPrompt = `
あなたは専門的なプログラミングアシスタントです。

【ルール】
1. コードは常にTypeScriptで書く
2. 型安全を重視する
3. エラーハンドリングを含める
4. テストコードも提供する
5. パフォーマンスを考慮する

【コーディング規約】
- インデント: 2スペース
- 命名: camelCase（変数・関数）、PascalCase（クラス・型）
- 必ずコメントを書く
- ...（さらに長い説明が続く）
  `.trim()

  // cache_control を使用
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: longSystemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: 'フィボナッチ数列を計算する関数を書いて',
      },
    ],
  })

  console.log('Cache stats:', {
    cacheCreationTokens: message.usage.cache_creation_input_tokens,
    cacheReadTokens: message.usage.cache_read_input_tokens,
    inputTokens: message.usage.input_tokens,
  })

  return message.content[0].text
}
```

### 長文コンテキストのキャッシュ

```typescript
// ドキュメントをキャッシュして複数の質問
class CachedDocumentChat {
  constructor(
    private anthropic: Anthropic,
    private document: string
  ) {}

  async ask(question: string): Promise<string> {
    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: '以下のドキュメントに基づいて回答してください',
        },
        {
          type: 'text',
          text: this.document,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: question,
        },
      ],
    })

    return message.content[0].text
  }
}

// 使用例
const longDocument = fs.readFileSync('long-document.txt', 'utf-8')
const chat = new CachedDocumentChat(anthropic, longDocument)

// 最初の質問（キャッシュ作成）
const answer1 = await chat.ask('このドキュメントの要約は？')

// 2番目以降の質問（キャッシュ使用、コスト削減）
const answer2 = await chat.ask('主なトピックは？')
const answer3 = await chat.ask('結論は？')
```

## コスト最適化

### トークン数の最適化

```typescript
import { encode } from 'gpt-tokenizer'

// トークン数をカウント
function countTokens(text: string): number {
  // Claude は GPT のトークナイザーと近似
  return encode(text).length
}

// 最適なモデル選択
function selectOptimalModel(
  inputText: string,
  expectedOutputLength: number
): string {
  const inputTokens = countTokens(inputText)

  // 簡単なタスクは Haiku
  if (inputTokens < 1000 && expectedOutputLength < 500) {
    return 'claude-3-haiku-20240307'
  }

  // 中程度のタスクは Sonnet
  if (inputTokens < 50000) {
    return 'claude-3-5-sonnet-20241022'
  }

  // 複雑なタスクは Opus
  return 'claude-3-opus-20240229'
}
```

### バッチ処理

```typescript
// 複数のリクエストを効率的に処理
async function batchProcess(
  items: string[],
  processor: (item: string) => Promise<string>
): Promise<string[]> {
  const batchSize = 5
  const results: string[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    )
    results.push(...batchResults)

    // レート制限を避けるため待機
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}
```

## 実践パターン

### AIアシスタントチャットボット

```typescript
// 完全なチャットボット実装
class ClaudeAssistant {
  private conversation: ConversationManager

  constructor(
    anthropic: Anthropic,
    systemPrompt: string
  ) {
    this.conversation = new ConversationManager(
      anthropic,
      systemPrompt
    )
  }

  async chat(message: string): Promise<string> {
    return this.conversation.sendMessage(message)
  }

  async chatWithTools(
    message: string,
    tools: Anthropic.Tool[]
  ): Promise<string> {
    return chatWithTools(message) // 前述の実装を使用
  }

  reset(): void {
    this.conversation.clearHistory()
  }
}
```

### コード生成アシスタント

```typescript
class CodeGenerator {
  constructor(private anthropic: Anthropic) {}

  async generateCode(
    description: string,
    language: string
  ): Promise<string> {
    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: `
あなたは${language}の専門家です。
常にベストプラクティスに従ったコードを生成してください。
      `,
      messages: [
        {
          role: 'user',
          content: `${description}\n\nコードのみを出力してください。`,
        },
      ],
    })

    return message.content[0].text
  }
}
```

## まとめ

Claude APIは、高度な推論能力と大きなコンテキストウィンドウを持つ強力なAI APIです。

**主要ポイント**:

1. **Messages API**: シンプルで直感的なインターフェース
2. **ストリーミング**: リアルタイムな応答表示
3. **ツール使用**: Function Calling で外部システム連携
4. **大規模コンテキスト**: 200Kトークンで長文処理
5. **プロンプトキャッシング**: コストを最大90%削減

**2026年のベストプラクティス**:

- 適切なモデル選択でコスト最適化
- プロンプトキャッシングを活用
- ストリーミングでUX向上
- ツール使用で機能拡張
- エラーハンドリングとリトライ

Claude APIを活用して、高度なAIアプリケーションを構築しましょう。
