---
title: 'Cloudflare Workers AI完全ガイド2026 - エッジAI推論、LLM、画像生成、テキスト分類、RAG構築'
description: 'Cloudflare Workers AIでエッジAI推論を実装。LLM、画像生成、テキスト分類、埋め込み、RAG構築の実践的な方法を徹底解説'
pubDate: 'Feb 05 2026'
tags: ['Cloudflare', 'AI', 'エッジコンピューティング', 'LLM']
---

# Cloudflare Workers AI完全ガイド2026

Cloudflare Workers AIは、エッジでAI推論を実行できるプラットフォームです。本記事では、LLMから画像生成まで実践的な実装方法を解説します。

## 目次

1. Cloudflare Workers AIとは
2. セットアップと基本
3. LLM推論
4. 画像生成
5. テキスト分類と埋め込み
6. RAG（Retrieval-Augmented Generation）
7. ストリーミングレスポンス
8. 実践パターン

## Cloudflare Workers AIとは

### 基本概念

```typescript
/**
 * Cloudflare Workers AIの特徴
 *
 * 1. エッジでのAI推論
 *    - レイテンシ: ~50ms（従来のAPI: 500ms+）
 *    - グローバル展開
 *
 * 2. 従量課金
 *    - リクエスト単位の課金
 *    - 無料枠あり
 *
 * 3. 豊富なモデル
 *    - LLM（Llama, Mistral等）
 *    - 画像生成（Stable Diffusion）
 *    - テキスト埋め込み
 *    - 分類・翻訳
 *
 * 4. TypeScript対応
 *    - 型安全な実装
 */

// Workers AIの環境変数型定義
interface Env {
  AI: Ai
  // Vectorize（ベクトルデータベース）
  VECTORIZE: VectorizeIndex
  // D1（SQLデータベース）
  DB: D1Database
  // R2（オブジェクトストレージ）
  BUCKET: R2Bucket
}
```

### 利用可能なモデル

```typescript
// 2026年現在の主要モデル

// LLM
const LLM_MODELS = {
  // Meta Llama
  llama3_8b: '@cf/meta/llama-3-8b-instruct',
  llama3_70b: '@cf/meta/llama-3-70b-instruct',

  // Mistral AI
  mistral_7b: '@cf/mistral/mistral-7b-instruct-v0.1',

  // その他
  gemma_7b: '@cf/google/gemma-7b-it'
} as const

// 画像生成
const IMAGE_MODELS = {
  sdxl: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  sdxl_lightning: '@cf/bytedance/stable-diffusion-xl-lightning'
} as const

// テキスト埋め込み
const EMBEDDING_MODELS = {
  bge_base: '@cf/baai/bge-base-en-v1.5',
  bge_large: '@cf/baai/bge-large-en-v1.5'
} as const

// 分類
const CLASSIFICATION_MODELS = {
  distilbert: '@cf/huggingface/distilbert-sst-2-int8'
} as const
```

## セットアップと基本

### プロジェクト作成

```bash
# Cloudflare Workers プロジェクト作成
npm create cloudflare@latest my-ai-worker

# AIバインディングを有効化
npx wrangler types

# 開発サーバー起動
npm run dev
```

### wrangler.toml設定

```toml
name = "my-ai-worker"
main = "src/index.ts"
compatibility_date = "2026-02-05"

# Workers AI バインディング
[ai]
binding = "AI"

# Vectorize バインディング（RAG用）
[[vectorize]]
binding = "VECTORIZE"
index_name = "my-embeddings"
dimensions = 768

# D1 データベース（メタデータ用）
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-database-id"

# R2 ストレージ（画像保存用）
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-images"
```

### 基本的なWorker

```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname === '/chat') {
      return handleChat(request, env)
    }

    if (pathname === '/image') {
      return handleImageGeneration(request, env)
    }

    return new Response('Not Found', { status: 404 })
  }
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  const { message } = await request.json()

  const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: [
      { role: 'user', content: message }
    ]
  })

  return Response.json(response)
}
```

## LLM推論

### 基本的なチャット

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
}

async function chat(request: ChatRequest, env: Env) {
  const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: request.messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.max_tokens ?? 512
  })

  return response
}

// 使用例
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const body: ChatRequest = await request.json()

    const result = await chat(body, env)

    return Response.json({
      message: result.response,
      usage: {
        prompt_tokens: result.prompt_tokens,
        completion_tokens: result.completion_tokens
      }
    })
  }
}
```

### システムプロンプトの活用

```typescript
interface AssistantConfig {
  name: string
  personality: string
  rules: string[]
}

function createSystemPrompt(config: AssistantConfig): string {
  return `
あなたは${config.name}です。

性格:
${config.personality}

ルール:
${config.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

これらの設定に従って、ユーザーの質問に答えてください。
`.trim()
}

async function chatWithAssistant(
  userMessage: string,
  config: AssistantConfig,
  env: Env
) {
  const systemPrompt = createSystemPrompt(config)

  const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  })

  return response.response
}

// 使用例: カスタマーサポートBot
const supportBotConfig: AssistantConfig = {
  name: 'サポートアシスタント',
  personality: '親切で丁寧、問題解決志向',
  rules: [
    '常に敬語を使用する',
    '技術用語は分かりやすく説明する',
    '解決策を具体的に提示する',
    '分からない場合は正直に伝える'
  ]
}

const answer = await chatWithAssistant(
  'パスワードを忘れました',
  supportBotConfig,
  env
)
```

### 会話履歴の管理

```typescript
interface ConversationStore {
  [conversationId: string]: ChatMessage[]
}

class ConversationManager {
  constructor(
    private kv: KVNamespace,
    private maxMessages: number = 10
  ) {}

  async getHistory(conversationId: string): Promise<ChatMessage[]> {
    const history = await this.kv.get<ChatMessage[]>(
      conversationId,
      'json'
    )
    return history || []
  }

  async addMessage(
    conversationId: string,
    message: ChatMessage
  ): Promise<void> {
    const history = await this.getHistory(conversationId)
    history.push(message)

    // 最大メッセージ数を超えたら古いものを削除
    if (history.length > this.maxMessages) {
      history.splice(0, history.length - this.maxMessages)
    }

    await this.kv.put(
      conversationId,
      JSON.stringify(history),
      { expirationTtl: 3600 } // 1時間で期限切れ
    )
  }

  async chat(
    conversationId: string,
    userMessage: string,
    env: Env
  ): Promise<string> {
    // 履歴を取得
    const history = await this.getHistory(conversationId)

    // ユーザーメッセージを追加
    history.push({ role: 'user', content: userMessage })

    // AI推論
    const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: history
    })

    // アシスタントの応答を履歴に追加
    await this.addMessage(conversationId, {
      role: 'assistant',
      content: response.response
    })

    return response.response
  }
}
```

### Function Calling

```typescript
interface FunctionDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required: string[]
  }
}

const functions: FunctionDefinition[] = [
  {
    name: 'get_weather',
    description: '指定された都市の天気を取得します',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '都市名（例: Tokyo, London）'
        }
      },
      required: ['city']
    }
  },
  {
    name: 'calculate',
    description: '数式を計算します',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '計算式（例: 2 + 2）'
        }
      },
      required: ['expression']
    }
  }
]

async function chatWithFunctions(
  userMessage: string,
  env: Env
): Promise<string> {
  // 1. AIに関数定義を含めてリクエスト
  const functionsPrompt = `
利用可能な関数:
${JSON.stringify(functions, null, 2)}

ユーザーの質問に答えるために必要な関数があれば、以下の形式でJSON出力してください:
{"function": "関数名", "arguments": {...}}

関数が不要な場合は、直接回答してください。
`

  const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: [
      { role: 'system', content: functionsPrompt },
      { role: 'user', content: userMessage }
    ]
  })

  // 2. 関数呼び出しを検出
  try {
    const functionCall = JSON.parse(response.response)

    if (functionCall.function) {
      // 3. 関数を実行
      const result = await executeFunction(
        functionCall.function,
        functionCall.arguments
      )

      // 4. 結果をAIに渡して最終回答を生成
      const finalResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: response.response },
          {
            role: 'user',
            content: `関数の実行結果: ${JSON.stringify(result)}\nこの結果を使って、ユーザーに分かりやすく回答してください。`
          }
        ]
      })

      return finalResponse.response
    }
  } catch (e) {
    // JSONパースエラー = 直接回答
  }

  return response.response
}

async function executeFunction(name: string, args: any): Promise<any> {
  switch (name) {
    case 'get_weather':
      return {
        city: args.city,
        temperature: 22,
        condition: 'Sunny'
      }

    case 'calculate':
      return {
        result: eval(args.expression)
      }

    default:
      throw new Error(`Unknown function: ${name}`)
  }
}
```

## 画像生成

### Stable Diffusion XL

```typescript
async function generateImage(
  prompt: string,
  env: Env
): Promise<Response> {
  const response = await env.AI.run(
    '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    {
      prompt,
      num_steps: 20,
      guidance: 7.5,
      width: 1024,
      height: 1024
    }
  )

  return new Response(response, {
    headers: {
      'Content-Type': 'image/png'
    }
  })
}

// 使用例
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { searchParams } = new URL(request.url)
    const prompt = searchParams.get('prompt') || 'a beautiful sunset'

    return generateImage(prompt, env)
  }
}
```

### ネガティブプロンプト

```typescript
interface ImageGenerationOptions {
  prompt: string
  negativePrompt?: string
  steps?: number
  guidance?: number
  width?: number
  height?: number
  seed?: number
}

async function generateImageWithOptions(
  options: ImageGenerationOptions,
  env: Env
): Promise<Uint8Array> {
  const {
    prompt,
    negativePrompt = 'blurry, low quality, distorted',
    steps = 30,
    guidance = 7.5,
    width = 1024,
    height = 1024,
    seed
  } = options

  const image = await env.AI.run(
    '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    {
      prompt,
      negative_prompt: negativePrompt,
      num_steps: steps,
      guidance,
      width,
      height,
      ...(seed && { seed })
    }
  )

  return image
}

// プロンプトテンプレート
const PROMPT_TEMPLATES = {
  portrait: (subject: string) =>
    `professional portrait photo of ${subject}, high quality, detailed, 8k, studio lighting`,

  landscape: (scene: string) =>
    `beautiful landscape photo of ${scene}, golden hour, cinematic, highly detailed`,

  illustration: (subject: string) =>
    `digital illustration of ${subject}, vibrant colors, detailed, artstation trending`
}

// 使用例
const image = await generateImageWithOptions({
  prompt: PROMPT_TEMPLATES.portrait('a young woman'),
  negativePrompt: 'blurry, distorted, low quality, bad anatomy',
  steps: 40,
  guidance: 8.0
}, env)
```

### R2への保存

```typescript
async function generateAndSaveImage(
  prompt: string,
  env: Env
): Promise<string> {
  // 画像生成
  const image = await env.AI.run(
    '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    { prompt }
  )

  // R2に保存
  const imageId = crypto.randomUUID()
  const key = `images/${imageId}.png`

  await env.BUCKET.put(key, image, {
    httpMetadata: {
      contentType: 'image/png'
    },
    customMetadata: {
      prompt,
      createdAt: new Date().toISOString()
    }
  })

  // 公開URLを返す
  return `https://your-domain.com/${key}`
}

// 画像取得エンドポイント
async function getImage(imageId: string, env: Env): Promise<Response> {
  const key = `images/${imageId}.png`
  const object = await env.BUCKET.get(key)

  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000'
    }
  })
}
```

## テキスト分類と埋め込み

### テキスト埋め込み

```typescript
async function generateEmbedding(
  text: string,
  env: Env
): Promise<number[]> {
  const response = await env.AI.run(
    '@cf/baai/bge-base-en-v1.5',
    { text }
  )

  return response.data[0]
}

// バッチ処理
async function generateEmbeddings(
  texts: string[],
  env: Env
): Promise<number[][]> {
  const embeddings = await Promise.all(
    texts.map(text => generateEmbedding(text, env))
  )

  return embeddings
}
```

### ベクトル検索

```typescript
interface Document {
  id: string
  text: string
  metadata?: Record<string, any>
}

async function indexDocument(
  doc: Document,
  env: Env
): Promise<void> {
  // テキストを埋め込みベクトルに変換
  const embedding = await generateEmbedding(doc.text, env)

  // Vectorizeに保存
  await env.VECTORIZE.upsert([
    {
      id: doc.id,
      values: embedding,
      metadata: {
        text: doc.text,
        ...doc.metadata
      }
    }
  ])
}

async function searchSimilarDocuments(
  query: string,
  topK: number,
  env: Env
): Promise<Document[]> {
  // クエリを埋め込みベクトルに変換
  const queryEmbedding = await generateEmbedding(query, env)

  // 類似ベクトルを検索
  const results = await env.VECTORIZE.query(queryEmbedding, {
    topK,
    returnValues: true,
    returnMetadata: 'all'
  })

  return results.matches.map(match => ({
    id: match.id,
    text: match.metadata.text as string,
    metadata: match.metadata,
    score: match.score
  }))
}
```

### テキスト分類

```typescript
interface ClassificationResult {
  label: string
  score: number
}

async function classifyText(
  text: string,
  env: Env
): Promise<ClassificationResult[]> {
  const response = await env.AI.run(
    '@cf/huggingface/distilbert-sst-2-int8',
    { text }
  )

  return response
}

// 感情分析
async function analyzeSentiment(
  text: string,
  env: Env
): Promise<'positive' | 'negative'> {
  const results = await classifyText(text, env)

  const positive = results.find(r => r.label === 'POSITIVE')
  const negative = results.find(r => r.label === 'NEGATIVE')

  return (positive?.score || 0) > (negative?.score || 0)
    ? 'positive'
    : 'negative'
}
```

## RAG（Retrieval-Augmented Generation）

### RAGシステムの構築

```typescript
interface RAGSystem {
  indexDocument(doc: Document): Promise<void>
  search(query: string): Promise<string>
}

class CloudflareRAG implements RAGSystem {
  constructor(private env: Env) {}

  async indexDocument(doc: Document): Promise<void> {
    // 1. ドキュメントをチャンクに分割
    const chunks = this.splitIntoChunks(doc.text, 512)

    // 2. 各チャンクを埋め込みベクトルに変換してインデックス
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await generateEmbedding(chunk, this.env)

      await this.env.VECTORIZE.upsert([
        {
          id: `${doc.id}-chunk-${i}`,
          values: embedding,
          metadata: {
            docId: doc.id,
            chunkIndex: i,
            text: chunk,
            ...doc.metadata
          }
        }
      ])
    }

    // 3. メタデータをD1に保存
    await this.env.DB.prepare(
      'INSERT INTO documents (id, title, created_at) VALUES (?, ?, ?)'
    )
      .bind(doc.id, doc.metadata?.title || '', new Date().toISOString())
      .run()
  }

  async search(query: string): Promise<string> {
    // 1. クエリから関連ドキュメントを検索
    const relevantDocs = await searchSimilarDocuments(query, 5, this.env)

    // 2. コンテキストを構築
    const context = relevantDocs
      .map((doc, i) => `[${i + 1}] ${doc.text}`)
      .join('\n\n')

    // 3. RAGプロンプト
    const prompt = `
以下のコンテキストを参考にして、質問に答えてください。

コンテキスト:
${context}

質問: ${query}

回答:
`.trim()

    // 4. LLMで回答生成
    const response = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    return response.response
  }

  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const words = text.split(' ')
    const chunks: string[] = []

    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '))
    }

    return chunks
  }
}

// 使用例
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const rag = new CloudflareRAG(env)
    const { pathname } = new URL(request.url)

    if (pathname === '/index') {
      const doc: Document = await request.json()
      await rag.indexDocument(doc)
      return Response.json({ success: true })
    }

    if (pathname === '/search') {
      const { query } = await request.json()
      const answer = await rag.search(query)
      return Response.json({ answer })
    }

    return new Response('Not Found', { status: 404 })
  }
}
```

## ストリーミングレスポンス

### Server-Sent Events

```typescript
async function streamChat(
  message: string,
  env: Env
): Promise<Response> {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  // バックグラウンドでストリーミング
  (async () => {
    try {
      const stream = await env.AI.run(
        '@cf/meta/llama-3-8b-instruct',
        {
          messages: [{ role: 'user', content: message }],
          stream: true
        }
      )

      for await (const chunk of stream) {
        const data = `data: ${JSON.stringify(chunk)}\n\n`
        await writer.write(encoder.encode(data))
      }

      await writer.write(encoder.encode('data: [DONE]\n\n'))
    } catch (error) {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      )
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

// クライアント側
const eventSource = new EventSource('/chat?message=Hello')

eventSource.onmessage = (event) => {
  if (event.data === '[DONE]') {
    eventSource.close()
    return
  }

  const chunk = JSON.parse(event.data)
  console.log(chunk.response)
}
```

## まとめ

Cloudflare Workers AIは、エッジでのAI推論を可能にする革新的なプラットフォームです。

**主要ポイント**:

1. **低レイテンシ**: エッジでの推論により50ms以下
2. **豊富なモデル**: LLM、画像生成、埋め込み等
3. **統合されたエコシステム**: Vectorize、D1、R2との連携
4. **コスト効率**: 従量課金、無料枠あり
5. **TypeScript対応**: 型安全な実装

**2026年のベストプラクティス**:

- RAGでより正確な回答を実現
- ストリーミングでUX向上
- Vectorizeで高速なベクトル検索
- R2で生成コンテンツを永続化
- 適切なプロンプトエンジニアリング

Cloudflare Workers AIを活用して、次世代のAIアプリケーションを構築しましょう。
