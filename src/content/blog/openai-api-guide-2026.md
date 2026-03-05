---
title: 'OpenAI API実践ガイド2026 - GPT-4o・o3から音声・画像生成まで'
description: '2026年最新版OpenAI API完全ガイド。GPT-4o、o3モデル、Function Calling、Assistants API、DALL-E 3、Whisper、TTSの実践的な使い方を徹底解説します。'
pubDate: 'Feb 05 2026'
tags: ['OpenAI', 'GPT-4', 'AI', 'API', 'LLM', 'プログラミング']
---

OpenAI APIは2026年現在、GPT-4o、o3シリーズなど最先端のAIモデルを提供し、開発者にとって必須のツールとなっています。本記事では、最新APIの実践的な使い方を網羅的に解説します。

## OpenAI API 2026年概要

### 利用可能なモデル

**テキスト生成**:
- `gpt-4o` - 最速・最安のフラッグシップモデル（128K context）
- `gpt-4o-mini` - 超高速・超安価な小型モデル（128K context）
- `o3-mini` - 推論特化型（数学・コード・論理）
- `o3` - 最高性能の推論モデル（高コスト）

**画像生成**:
- `dall-e-3` - 高品質画像生成（1024x1024, 1792x1024, 1024x1792）

**音声**:
- `whisper-1` - 音声認識（transcription/translation）
- `tts-1` / `tts-1-hd` - テキスト読み上げ

**埋め込み**:
- `text-embedding-3-small` - 軽量埋め込み（1536次元）
- `text-embedding-3-large` - 高性能埋め込み（3072次元）

### 料金（2026年版）

| モデル | Input | Output |
|--------|-------|--------|
| gpt-4o | $2.50/1M tokens | $10.00/1M tokens |
| gpt-4o-mini | $0.15/1M tokens | $0.60/1M tokens |
| o3-mini | $1.10/1M tokens | $4.40/1M tokens |
| o3 | $15.00/1M tokens | $60.00/1M tokens |
| dall-e-3 | $0.040/画像（1024²） | - |
| whisper-1 | $0.006/分 | - |
| tts-1 | $15.00/1M文字 | - |
| text-embedding-3-small | $0.02/1M tokens | - |

→ 日常的な使用はgpt-4o-miniが圧倒的にコスパ良好

## セットアップ

### 1. APIキー取得

1. [OpenAI Platform](https://platform.openai.com/)でアカウント作成
2. API Keysページでキー生成
3. 環境変数に設定

```bash
# .env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

### 2. SDKインストール

```bash
# Node.js
npm install openai

# Python
pip install openai
```

## Chat Completions API（基本）

### シンプルなチャット

#### Node.js/TypeScript

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function chat() {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'あなたは親切なアシスタントです。' },
      { role: 'user', content: 'TypeScriptとJavaScriptの違いを教えて' },
    ],
  })

  console.log(completion.choices[0].message.content)
}

chat()
```

#### Python

```python
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "あなたは親切なアシスタントです。"},
        {"role": "user", "content": "TypeScriptとJavaScriptの違いを教えて"},
    ]
)

print(response.choices[0].message.content)
```

### ストリーミングレスポンス

```typescript
async function streamChat() {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: '日本の歴史について教えて' },
    ],
    stream: true,
  })

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || ''
    process.stdout.write(content)
  }
}
```

### パラメータ調整

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'クリエイティブな物語を書いて' }],

  // 創造性の調整（0-2、デフォルト1）
  temperature: 1.5,

  // Top-p sampling（0-1、デフォルト1）
  top_p: 0.9,

  // 最大トークン数
  max_tokens: 1000,

  // ペナルティ（繰り返し抑制）
  frequency_penalty: 0.5,  // 0-2
  presence_penalty: 0.5,   // 0-2

  // 停止条件
  stop: ['\n\n', '###'],
})
```

## Function Calling（ツール連携）

AIが外部ツールを呼び出せる機能。

### 天気予報ツール例

```typescript
async function chatWithTools() {
  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: '指定された都市の現在の天気を取得します',
        parameters: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: '都市名（例: Tokyo, Osaka）',
            },
            unit: {
              type: 'string',
              enum: ['celsius', 'fahrenheit'],
              description: '温度の単位',
            },
          },
          required: ['city'],
        },
      },
    },
  ]

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'user', content: '東京の天気を教えて' },
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    tools,
    tool_choice: 'auto',  // 自動判断
  })

  const message = response.choices[0].message

  // ツール呼び出しがある場合
  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      if (toolCall.function.name === 'get_weather') {
        const args = JSON.parse(toolCall.function.arguments)
        const weather = await getWeather(args.city, args.unit)

        // ツール実行結果をAIに返す
        messages.push(message)
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(weather),
        })

        // AIに再度質問
        const finalResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages,
        })

        console.log(finalResponse.choices[0].message.content)
      }
    }
  }
}

async function getWeather(city: string, unit = 'celsius') {
  // 実際のAPI呼び出し（例: OpenWeatherMap）
  return {
    city,
    temperature: 22,
    condition: 'Sunny',
    unit,
  }
}
```

### データベース検索ツール

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'search_database',
      description: 'ユーザーデータベースを検索',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '検索クエリ' },
          limit: { type: 'number', description: '結果件数' },
        },
        required: ['query'],
      },
    },
  },
]

// ツール実装
async function searchDatabase(query: string, limit = 10) {
  const results = await db.users.findMany({
    where: { name: { contains: query } },
    take: limit,
  })
  return results
}
```

## Vision API（画像理解）

```typescript
async function analyzeImage() {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'この画像には何が写っていますか？' },
          {
            type: 'image_url',
            image_url: {
              url: 'https://example.com/image.jpg',
              // またはBase64
              // url: 'data:image/jpeg;base64,/9j/4AAQ...',
              detail: 'high',  // 'low' | 'high' | 'auto'
            },
          },
        ],
      },
    ],
  })

  console.log(response.choices[0].message.content)
}
```

### ローカル画像を送信

```typescript
import fs from 'fs'

async function analyzeLocalImage(imagePath: string) {
  const imageBuffer = fs.readFileSync(imagePath)
  const base64Image = imageBuffer.toString('base64')
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '画像を詳細に説明してください' },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  })

  return response.choices[0].message.content
}
```

## DALL-E 3（画像生成）

```typescript
async function generateImage() {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: 'A serene Japanese garden with cherry blossoms, koi pond, and traditional stone lanterns at sunset',
    n: 1,
    size: '1024x1024',  // '1024x1024' | '1792x1024' | '1024x1792'
    quality: 'hd',      // 'standard' | 'hd'
    style: 'vivid',     // 'vivid' | 'natural'
  })

  const imageUrl = response.data[0].url
  console.log('画像URL:', imageUrl)

  // 画像をダウンロード
  const imageResponse = await fetch(imageUrl!)
  const buffer = await imageResponse.arrayBuffer()
  fs.writeFileSync('generated.png', Buffer.from(buffer))
}
```

### プロンプトエンジニアリング

```typescript
// 高品質な画像を生成するプロンプト例
const prompts = {
  // 詳細な説明
  detailed: 'A highly detailed, photorealistic portrait of a cyberpunk warrior with neon tattoos, chrome implants, standing in a rain-soaked Tokyo street at night, cinematic lighting, 8k',

  // スタイル指定
  artistic: 'An oil painting in the style of Van Gogh, depicting a futuristic cityscape with swirling stars above, vibrant colors, impressionist style',

  // ネガティブプロンプト（避けたい要素）
  withNegative: 'A beautiful sunset over the ocean, pristine beach, palm trees. Avoid: people, buildings, text, watermarks',
}
```

## Whisper（音声認識）

```typescript
async function transcribeAudio() {
  const audioFile = fs.createReadStream('audio.mp3')

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'ja',  // オプション: 言語指定で精度向上
    response_format: 'json',  // 'json' | 'text' | 'srt' | 'vtt'
    temperature: 0,  // 0で最も確実な結果
  })

  console.log(transcription.text)
}

// 翻訳（英語に変換）
async function translateAudio() {
  const audioFile = fs.createReadStream('audio_ja.mp3')

  const translation = await openai.audio.translations.create({
    file: audioFile,
    model: 'whisper-1',
  })

  console.log(translation.text)  // 英語テキスト
}
```

## TTS（音声合成）

```typescript
async function textToSpeech() {
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1-hd',  // 'tts-1' | 'tts-1-hd'
    voice: 'alloy',     // 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
    input: 'こんにちは。今日は良い天気ですね。',
    speed: 1.0,         // 0.25 - 4.0
  })

  const buffer = Buffer.from(await mp3.arrayBuffer())
  fs.writeFileSync('speech.mp3', buffer)
}
```

## Embeddings（埋め込みベクトル）

### テキスト類似度検索

```typescript
async function createEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })

  return response.data[0].embedding
}

// コサイン類似度計算
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

// 使用例
async function findSimilarDocuments(query: string, documents: string[]) {
  const queryEmbedding = await createEmbedding(query)

  const similarities = await Promise.all(
    documents.map(async (doc) => {
      const docEmbedding = await createEmbedding(doc)
      const similarity = cosineSimilarity(queryEmbedding, docEmbedding)
      return { doc, similarity }
    })
  )

  return similarities.sort((a, b) => b.similarity - a.similarity)
}
```

## Assistants API（高度な会話）

```typescript
async function createAssistant() {
  // アシスタント作成
  const assistant = await openai.beta.assistants.create({
    name: 'コーディングアシスタント',
    instructions: 'あなたはTypeScriptとReactの専門家です。コードレビューとバグ修正を支援します。',
    model: 'gpt-4o',
    tools: [{ type: 'code_interpreter' }],
  })

  // スレッド作成
  const thread = await openai.beta.threads.create()

  // メッセージ追加
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: 'useEffectの使い方を教えて',
  })

  // 実行
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id,
  })

  // 完了待機
  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
  while (runStatus.status !== 'completed') {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
  }

  // メッセージ取得
  const messages = await openai.beta.threads.messages.list(thread.id)
  console.log(messages.data[0].content)
}
```

## エラーハンドリング

```typescript
import OpenAI from 'openai'

async function safeAPICall() {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    })

    return completion.choices[0].message.content
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error('Status:', error.status)
      console.error('Message:', error.message)
      console.error('Code:', error.code)
      console.error('Type:', error.type)

      // レート制限
      if (error.status === 429) {
        console.log('Rate limit exceeded, retrying...')
        await new Promise((resolve) => setTimeout(resolve, 5000))
        return safeAPICall()  // リトライ
      }

      // トークン超過
      if (error.code === 'context_length_exceeded') {
        console.log('Input too long, truncating...')
        // メッセージを短縮して再試行
      }
    }

    throw error
  }
}
```

## ベストプラクティス

### 1. コスト最適化

```typescript
// gpt-4o-miniを優先使用（95%のケースで十分）
const model = isComplexTask ? 'gpt-4o' : 'gpt-4o-mini'

// トークン数制限
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages,
  max_tokens: 500,  // 必要最小限に
})
```

### 2. プロンプトテンプレート

```typescript
const templates = {
  codeReview: `以下のコードをレビューしてください:
- バグの指摘
- パフォーマンス改善提案
- ベストプラクティスからの逸脱

コード:
\`\`\`typescript
{code}
\`\`\``,

  translation: `次の文章を{targetLang}に翻訳してください。自然な表現を心がけてください。

{text}`,
}

function buildPrompt(template: string, vars: Record<string, string>) {
  return template.replace(/{(\w+)}/g, (_, key) => vars[key] || '')
}
```

### 3. キャッシング（コスト削減）

```typescript
// 頻繁に使う長いsystem promptはキャッシュ
const systemPrompt = `あなたは...[長い指示]...`  // これをキャッシュ

const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ],
})
```

## まとめ

OpenAI APIは2026年現在、以下の点で強力です:

**モデルの多様性**:
- gpt-4o: 汎用最強
- gpt-4o-mini: コスパ最強
- o3シリーズ: 推論タスクに特化

**機能の豊富さ**:
- テキスト生成・理解
- 画像生成・理解
- 音声認識・合成
- Function Calling
- Embeddings

**実用性**:
- 簡単なAPI
- ストリーミング対応
- エラーハンドリング充実

**推奨する使い方**:
- 日常: gpt-4o-mini（コスパ◎）
- 複雑タスク: gpt-4o
- 数学・コード: o3-mini
- 画像生成: DALL-E 3
- 音声: Whisper + TTS

OpenAI APIをマスターすれば、AIネイティブなアプリケーションを自在に構築できます。

**参考リンク**:
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [OpenAI Cookbook](https://github.com/openai/openai-cookbook)
- [Pricing](https://openai.com/api/pricing/)
