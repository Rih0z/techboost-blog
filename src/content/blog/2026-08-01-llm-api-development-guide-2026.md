---
title: "LLM APIアプリ開発入門2026【OpenAI・Claude・Gemini実装比較】"
description: "LLM APIを使ったアプリ開発の入門ガイド。OpenAI GPT-4o・Claude 4・Gemini 2.0のAPI比較、TypeScript/Pythonでの実装例、ストリーミング・Function Calling・エラーハンドリングまで実践的に解説します。"
pubDate: "2026-03-11"
tags: ["AI", "LLM", "API開発", "TypeScript", "Python"]
heroImage: '../../assets/thumbnails/ai-agent-development-2026.jpg'
---

## はじめに

2026年、LLM（大規模言語モデル）APIはWebアプリ開発の標準コンポーネントになりつつある。チャットボット、文書要約、コード生成、データ分析 ── あらゆる領域でLLMを組み込んだアプリケーションが急増している。

しかし「どのAPIを選べばいいのか」「実装時に何を注意すべきか」がわからず、最初の一歩で立ち止まるエンジニアも多い。この記事では、主要3社のLLM API（OpenAI・Anthropic Claude・Google Gemini）を比較し、TypeScriptとPythonの両方で実装例を示しながら、実践的な開発ガイドを提供する。

---

## 1. 主要LLM API 比較一覧

### 1.1 料金・性能比較表（2026年8月時点）

| 項目 | OpenAI GPT-4o | Claude 4 Sonnet | Gemini 2.0 Pro |
|------|--------------|-----------------|----------------|
| 入力料金 | $2.50/1M tokens | $3.00/1M tokens | $1.25/1M tokens |
| 出力料金 | $10.00/1M tokens | $15.00/1M tokens | $5.00/1M tokens |
| コンテキスト長 | 128K tokens | 200K tokens | 2M tokens |
| マルチモーダル | テキスト/画像/音声 | テキスト/画像/PDF | テキスト/画像/動画/音声 |
| Function Calling | ○ | ○（Tool Use） | ○ |
| ストリーミング | ○ | ○ | ○ |
| 日本語性能 | ◎ | ◎ | ○ |
| レート制限 | 10,000 RPM（Tier 5） | 4,000 RPM | 1,000 RPM |

### 1.2 各APIの特徴

**OpenAI GPT-4o**
- エコシステムが最も成熟。ドキュメント・ライブラリ・コミュニティが豊富
- Assistants API、Batch API など高レベルAPIも充実
- 画像生成（DALL-E）、音声（Whisper/TTS）との統合が容易

**Anthropic Claude 4**
- 長文コンテキスト処理に強い（200Kトークン標準）
- コード生成・分析タスクでの精度が高い
- Computer Use（PC操作）などユニークな機能を提供

**Google Gemini 2.0**
- 2Mトークンの超長コンテキスト（業界最大級）
- Google Cloud（Vertex AI）との統合が強力
- 動画・音声を含むマルチモーダル入力に最も幅広く対応

---

## 2. 開発環境セットアップ

### 2.1 TypeScript環境

```bash
# プロジェクト初期化
mkdir llm-app && cd llm-app
npm init -y
npm install typescript tsx @types/node -D

# 各社SDKインストール
npm install openai          # OpenAI公式SDK
npm install @anthropic-ai/sdk  # Anthropic公式SDK
npm install @google/generative-ai  # Google AI SDK

# tsconfig.json
npx tsc --init
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 2.2 Python環境

```bash
# 仮想環境作成
python -m venv .venv
source .venv/bin/activate

# 各社SDKインストール
pip install openai           # OpenAI公式SDK
pip install anthropic        # Anthropic公式SDK
pip install google-generativeai  # Google AI SDK
```

### 2.3 APIキー管理

```bash
# .env ファイル（.gitignore に追加必須）
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
GOOGLE_AI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxx
```

```typescript
// src/config.ts
import { config } from 'dotenv';
config();

export const API_KEYS = {
  openai: process.env.OPENAI_API_KEY!,
  anthropic: process.env.ANTHROPIC_API_KEY!,
  google: process.env.GOOGLE_AI_API_KEY!,
} as const;

// バリデーション
for (const [name, key] of Object.entries(API_KEYS)) {
  if (!key) {
    throw new Error(`${name} APIキーが設定されていません`);
  }
}
```

---

## 3. 基本的なAPI呼び出し

### 3.1 OpenAI — TypeScript

```typescript
// src/openai-basic.ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function chat(userMessage: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'あなたは親切なアシスタントです。簡潔に回答してください。',
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  return response.choices[0].message.content ?? '';
}

// 使用例
const answer = await chat('TypeScriptの型システムの利点を3つ教えてください');
console.log(answer);
```

### 3.2 Claude — TypeScript

```typescript
// src/claude-basic.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function chat(userMessage: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: 'あなたは親切なアシスタントです。簡潔に回答してください。',
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  // Claude APIはcontent配列を返す
  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.text ?? '';
}

const answer = await chat('Pythonのデコレータの仕組みを説明してください');
console.log(answer);
```

### 3.3 Gemini — TypeScript

```typescript
// src/gemini-basic.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

async function chat(userMessage: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-pro',
    systemInstruction: 'あなたは親切なアシスタントです。簡潔に回答してください。',
  });

  const result = await model.generateContent(userMessage);
  return result.response.text();
}

const answer = await chat('RESTとGraphQLの使い分けを教えてください');
console.log(answer);
```

### 3.4 Python での統一実装

```python
# llm_client.py
from dataclasses import dataclass
from typing import Protocol
import openai
import anthropic
import google.generativeai as genai
import os

class LLMClient(Protocol):
    """LLMクライアントの共通インターフェース"""
    async def chat(self, message: str, system: str = "") -> str: ...

@dataclass
class OpenAIClient:
    """OpenAI GPT-4oクライアント"""
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    async def chat(self, message: str, system: str = "") -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": message})

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""

@dataclass
class ClaudeClient:
    """Anthropic Claudeクライアント"""
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    async def chat(self, message: str, system: str = "") -> str:
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system or "You are a helpful assistant.",
            messages=[{"role": "user", "content": message}],
        )
        return response.content[0].text

@dataclass
class GeminiClient:
    """Google Geminiクライアント"""
    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_AI_API_KEY"))
        self.model = genai.GenerativeModel(
            "gemini-2.0-pro",
            system_instruction=None,
        )

    async def chat(self, message: str, system: str = "") -> str:
        if system:
            self.model = genai.GenerativeModel(
                "gemini-2.0-pro",
                system_instruction=system,
            )
        response = await self.model.generate_content_async(message)
        return response.text
```

---

## 4. ストリーミングレスポンス

リアルタイムにトークンを表示するストリーミングは、ユーザー体験を大幅に向上させる。

### 4.1 OpenAI ストリーミング

```typescript
// src/openai-stream.ts
import OpenAI from 'openai';

const client = new OpenAI();

async function streamChat(userMessage: string): Promise<void> {
  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: userMessage }],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      process.stdout.write(content);
    }
  }
  console.log(); // 改行
}

await streamChat('Reactのhooksについて説明してください');
```

### 4.2 Claude ストリーミング

```typescript
// src/claude-stream.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function streamChat(userMessage: string): Promise<void> {
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userMessage }],
  });

  // イベントベースのストリーミング
  stream.on('text', (text) => {
    process.stdout.write(text);
  });

  // 完了を待機
  const finalMessage = await stream.finalMessage();
  console.log('\n--- 使用トークン ---');
  console.log(`入力: ${finalMessage.usage.input_tokens}`);
  console.log(`出力: ${finalMessage.usage.output_tokens}`);
}

await streamChat('Next.jsのServer Componentsの仕組みを解説してください');
```

### 4.3 Gemini ストリーミング

```typescript
// src/gemini-stream.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

async function streamChat(userMessage: string): Promise<void> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-pro' });

  const result = await model.generateContentStream(userMessage);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      process.stdout.write(text);
    }
  }
  console.log();
}

await streamChat('Dockerの仕組みをわかりやすく教えてください');
```

---

## 5. Function Calling（ツール呼び出し）

LLMに外部関数を呼び出させるFunction Callingは、AIアプリの核心機能だ。

### 5.1 OpenAI Function Calling

```typescript
// src/openai-function-calling.ts
import OpenAI from 'openai';

const client = new OpenAI();

// ツール定義
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '指定された都市の天気情報を取得する',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '都市名（例: 東京, 大阪）',
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
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: '商品データベースを検索する',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '検索キーワード' },
          max_results: { type: 'number', description: '最大件数' },
        },
        required: ['query'],
      },
    },
  },
];

// ツール実行関数（実際のロジック）
async function executeFunction(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case 'get_weather':
      // 実際にはAPIを呼び出す
      return JSON.stringify({
        city: args.city,
        temp: 28,
        condition: '晴れ',
        humidity: 60,
      });
    case 'search_products':
      return JSON.stringify({
        results: [
          { name: 'ワイヤレスイヤホン', price: 3980 },
          { name: 'Bluetoothスピーカー', price: 5980 },
        ],
      });
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}

// Function Callingループ
async function chatWithTools(userMessage: string): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools,
    });

    const choice = response.choices[0];

    // ツール呼び出しがない場合 → 最終応答
    if (choice.finish_reason === 'stop') {
      return choice.message.content ?? '';
    }

    // ツール呼び出しを実行
    if (choice.message.tool_calls) {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const result = await executeFunction(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments)
        );
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    }
  }
}

const answer = await chatWithTools('東京の天気を教えて、おすすめの商品も検索して');
console.log(answer);
```

### 5.2 Claude Tool Use

```typescript
// src/claude-tool-use.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: '指定された都市の天気情報を取得する',
    input_schema: {
      type: 'object' as const,
      properties: {
        city: { type: 'string', description: '都市名' },
      },
      required: ['city'],
    },
  },
];

async function chatWithTools(userMessage: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      tools,
      messages,
    });

    // end_turnなら最終応答
    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock?.text ?? '';
    }

    // tool_useブロックを処理
    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = JSON.stringify({
            city: (block.input as { city: string }).city,
            temp: 28,
            condition: '晴れ',
          });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }
      }
      messages.push({ role: 'user', content: toolResults });
    }
  }
}

const answer = await chatWithTools('今日の東京の天気は？');
console.log(answer);
```

---

## 6. エラーハンドリングとリトライ

本番環境ではAPIのエラーハンドリングが必須だ。

### 6.1 共通エラーハンドラ

```typescript
// src/error-handler.ts

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;      // ミリ秒
  maxDelay: number;       // ミリ秒
  retryableStatusCodes: number[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatusCodes: [429, 500, 502, 503, 529],
};

async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, retryableStatusCodes } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error as Error;

      // リトライ不可能なエラーは即座にスロー
      const statusCode = (error as { status?: number }).status;
      if (statusCode && !retryableStatusCodes.includes(statusCode)) {
        throw error;
      }

      if (attempt === maxRetries) break;

      // Exponential backoff + jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );

      console.warn(
        `API呼び出し失敗 (attempt ${attempt + 1}/${maxRetries}): ` +
        `${(error as Error).message}. ${delay}ms後にリトライ...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// 使用例
import OpenAI from 'openai';

const client = new OpenAI();

const response = await withRetry(() =>
  client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello' }],
  })
);
```

### 6.2 レート制限対応

```typescript
// src/rate-limiter.ts

class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,       // バケットの最大容量
    private refillRate: number,      // 1秒あたりの補充量
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;
  }

  async acquire(cost: number = 1): Promise<void> {
    this.refill();

    if (this.tokens < cost) {
      const waitTime = ((cost - this.tokens) / this.refillRate) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens -= cost;
  }
}

// OpenAI: 10,000 RPM = 約166 RPS
const openaiLimiter = new TokenBucketRateLimiter(166, 166);

// Claude: 4,000 RPM = 約66 RPS
const claudeLimiter = new TokenBucketRateLimiter(66, 66);
```

---

## 7. マルチモーダル入力（画像・PDF）

### 7.1 画像解析

```typescript
// src/vision.ts
import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI();

async function analyzeImage(imagePath: string, question: string): Promise<string> {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: question,
          },
        ],
      },
    ],
    max_tokens: 1024,
  });

  return response.choices[0].message.content ?? '';
}

// 使用例
const analysis = await analyzeImage(
  './screenshot.png',
  'このUIのアクセシビリティの問題点を指摘してください'
);
console.log(analysis);
```

### 7.2 Claude PDF解析

```python
# pdf_analysis.py
import anthropic
import base64

client = anthropic.Anthropic()

def analyze_pdf(pdf_path: str, question: str) -> str:
    """PDFファイルを解析して質問に回答する"""
    with open(pdf_path, "rb") as f:
        pdf_data = base64.standard_b64encode(f.read()).decode("utf-8")

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": question,
                    },
                ],
            }
        ],
    )
    return response.content[0].text

# 使用例
summary = analyze_pdf("./contract.pdf", "この契約書の主要な条項を箇条書きでまとめてください")
print(summary)
```

---

## 8. コスト管理とトークン最適化

### 8.1 トークンカウント

```typescript
// src/token-counter.ts
// OpenAIのtiktokenを使用
import { encoding_for_model } from 'tiktoken';

function countTokens(text: string, model: string = 'gpt-4o'): number {
  const enc = encoding_for_model(model as Parameters<typeof encoding_for_model>[0]);
  const tokens = enc.encode(text);
  enc.free();
  return tokens.length;
}

// コスト計算
interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number; // USD
}

function estimateCost(
  inputText: string,
  estimatedOutputTokens: number,
  provider: 'openai' | 'anthropic' | 'google'
): CostEstimate {
  const inputTokens = countTokens(inputText);

  const pricing = {
    openai:    { input: 2.50,  output: 10.00 },  // per 1M tokens
    anthropic: { input: 3.00,  output: 15.00 },
    google:    { input: 1.25,  output: 5.00  },
  };

  const p = pricing[provider];
  const cost =
    (inputTokens / 1_000_000) * p.input +
    (estimatedOutputTokens / 1_000_000) * p.output;

  return {
    inputTokens,
    outputTokens: estimatedOutputTokens,
    estimatedCost: Math.round(cost * 10000) / 10000,
  };
}

// 使用例
const estimate = estimateCost(
  'TypeScriptの型システムについて2000文字で解説してください',
  2000,
  'openai'
);
console.log(`推定コスト: $${estimate.estimatedCost}`);
```

### 8.2 コスト削減のベストプラクティス

```typescript
// src/cost-optimization.ts

// 1. キャッシュ層の導入
import { createHash } from 'crypto';

class ResponseCache {
  private cache = new Map<string, { response: string; expiry: number }>();

  private getKey(prompt: string, model: string): string {
    return createHash('sha256').update(`${model}:${prompt}`).digest('hex');
  }

  get(prompt: string, model: string): string | null {
    const key = this.getKey(prompt, model);
    const entry = this.cache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.response;
    }
    return null;
  }

  set(prompt: string, model: string, response: string, ttlMs: number): void {
    const key = this.getKey(prompt, model);
    this.cache.set(key, { response, expiry: Date.now() + ttlMs });
  }
}

// 2. モデルルーティング（タスクに応じて安いモデルを使う）
type TaskComplexity = 'simple' | 'moderate' | 'complex';

function selectModel(complexity: TaskComplexity): string {
  switch (complexity) {
    case 'simple':   return 'gpt-4o-mini';     // 最安
    case 'moderate': return 'claude-sonnet-4-20250514';
    case 'complex':  return 'gpt-4o';
  }
}

// 3. プロンプト圧縮
function compressContext(text: string, maxTokens: number): string {
  // 重複排除・要約でトークン数を削減
  const lines = text.split('\n').filter((line) => line.trim());
  const unique = [...new Set(lines)];
  return unique.join('\n').slice(0, maxTokens * 4); // 概算: 1トークン ≈ 4文字
}
```

---

## 9. 本番環境アーキテクチャ

### 9.1 推奨構成

```
┌─────────────────────────────────────────────┐
│                クライアント                    │
│          (React / Next.js / Mobile)          │
└─────────────┬───────────────────────────────┘
              │ SSE / WebSocket
┌─────────────▼───────────────────────────────┐
│             APIサーバー                       │
│         (Next.js API Routes)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Rate     │  │ Auth     │  │ Request   │  │
│  │ Limiter  │  │ Middleware│  │ Validator │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       └──────────────┴──────────────┘        │
│                      │                       │
│  ┌───────────────────▼──────────────────┐   │
│  │       LLM Gateway / Router           │   │
│  │  ┌─────────┐ ┌────────┐ ┌─────────┐  │   │
│  │  │ OpenAI  │ │ Claude │ │ Gemini  │  │   │
│  │  └─────────┘ └────────┘ └─────────┘  │   │
│  └──────────────────────────────────────┘   │
│                      │                       │
│  ┌───────────────────▼──────────────────┐   │
│  │  Cache / Token Counter / Cost Logger │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 9.2 Next.js API Route 実装例

```typescript
// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI();

export async function POST(req: NextRequest) {
  const { message, model = 'gpt-4o' } = await req.json();

  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'Invalid message' }, { status: 400 });
  }

  // Server-Sent Events でストリーミング
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: message }],
          stream: true,
        });

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'API Error' })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## 10. セキュリティ対策

### 10.1 プロンプトインジェクション対策

```typescript
// src/security.ts

function sanitizeUserInput(input: string): string {
  // 1. システムプロンプト上書き試行を検出
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+/i,
    /system\s*:\s*/i,
    /\[INST\]/i,
    /<\|im_start\|>/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      console.warn('プロンプトインジェクションの疑いを検出');
      return '[入力が安全ポリシーに抵触しました]';
    }
  }

  // 2. 長さ制限
  const MAX_INPUT_LENGTH = 10000;
  if (input.length > MAX_INPUT_LENGTH) {
    return input.slice(0, MAX_INPUT_LENGTH);
  }

  return input;
}

// APIキーのログ出力防止
function redactApiKey(text: string): string {
  return text.replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-***REDACTED***');
}
```

### 10.2 出力バリデーション

```typescript
// src/output-validator.ts

interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  warnings: string[];
}

function validateLLMOutput(output: string): ValidationResult {
  const warnings: string[] = [];
  let sanitized = output;

  // 1. 個人情報の検出
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phonePattern = /\d{2,4}-\d{2,4}-\d{4}/g;

  if (emailPattern.test(sanitized)) {
    warnings.push('メールアドレスが含まれています');
    sanitized = sanitized.replace(emailPattern, '[EMAIL_REDACTED]');
  }

  if (phonePattern.test(sanitized)) {
    warnings.push('電話番号が含まれています');
    sanitized = sanitized.replace(phonePattern, '[PHONE_REDACTED]');
  }

  // 2. HTMLインジェクション防止
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return {
    isValid: warnings.length === 0,
    sanitized,
    warnings,
  };
}
```

---

## 11. まとめ ── LLM API選定フローチャート

```
あなたのユースケースは？
│
├── 長文ドキュメント処理 → Gemini 2.0（2Mコンテキスト）
│
├── コード生成・分析 → Claude 4（精度重視）
│
├── 汎用チャットボット → GPT-4o（エコシステム充実）
│
├── コスト重視 → Gemini 2.0 > GPT-4o-mini > Claude Haiku
│
└── マルチモーダル（動画含む） → Gemini 2.0
```

**選定のポイント:**

1. **まずは1社で始める** ── 複数APIの同時導入は複雑さを増すだけ。GPT-4oから始めるのが無難
2. **抽象化レイヤーを入れる** ── 上記のPython例のように、LLMクライアントをインターフェースで抽象化しておけば、後からプロバイダーを切り替えやすい
3. **コスト管理は初日から** ── 使用量の上限設定とモニタリングは本番公開前に必ず実装する
4. **セキュリティは省略しない** ── プロンプトインジェクション対策と出力バリデーションはMVPでも必須

---

## 関連記事

- [AIコーディングツール完全ガイド — GitHub Copilot・Cursor・Claude Code比較と活用法](/blog/ai-coding-tools-guide)
- [AIコーディングアシスタント比較ガイド](/blog/ai-coding-assistant-comparison)
- [Claude Code AIコーディングガイド2026](/blog/claude-code-ai-coding-guide-2026)

---

## FAQ

### Q. LLM APIの無料枠はある？

A. OpenAIは新規アカウントに$5程度のクレジットを付与（期限あり）。Google AI StudioのGemini APIは無料枠が比較的大きい（1分あたり15リクエスト）。Anthropicは無料枠なし。まず試すならGemini API推奨。

### Q. APIキーが漏洩した場合の対処は？

A. 即座にダッシュボードからキーを無効化し、新しいキーを発行する。全サービスのキーを更新し、gitの履歴からも削除する（`git filter-branch` or BFG Repo-Cleaner）。

### Q. 日本語で使う場合の注意点は？

A. 日本語はトークン効率が英語の2-3倍悪い（同じ文字数でトークン消費が多い）。コスト計算時に注意。GPT-4oとClaude 4は日本語性能が高く、Geminiも改善されている。
