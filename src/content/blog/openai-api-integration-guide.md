---
title: 'OpenAI API実践ガイド — ChatGPT統合・ストリーミング・Function Calling・RAG実装'
description: 'OpenAI APIをNode.js/TypeScriptで実装する実践ガイド。Chat Completions・ストリーミング・Function Calling・Embeddings・RAG（Retrieval-Augmented Generation）・コスト管理・レート制限対策まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['OpenAI', 'ChatGPT', 'AI', 'TypeScript', 'RAG']
---

OpenAI APIはGPT-4oをはじめとする最先端の大規模言語モデル（LLM）をアプリケーションに組み込むための公式インターフェイスだ。本記事では、Node.js/TypeScript環境でOpenAI APIを実践的に活用する方法を、基礎から応用まで体系的に解説する。Chat Completions・ストリーミング・Function Calling・Vision・Embeddings・RAG実装・コスト管理・レート制限対策・エラーハンドリング・Vercel AI SDK統合まで、実際のプロダクション環境で即座に使える実装例とともに網羅する。

---

## 1. OpenAI API概要 — モデル選択

### 主要モデルの特性と使い分け

OpenAI APIでは複数のモデルが提供されており、用途・コスト・性能のバランスに応じて適切なモデルを選択することが重要だ。

**GPT-4o（gpt-4o）**

GPT-4oは現時点でOpenAIが提供するフラッグシップモデルだ。テキスト・画像・音声のマルチモーダル入力に対応し、高い推論能力と優れた指示追従性を持つ。コンテキストウィンドウは128Kトークンで、複雑なタスクや長文処理に適している。

- 入力: $2.50 / 1Mトークン
- 出力: $10.00 / 1Mトークン
- 用途: 高精度が求められるビジネスロジック・複雑な推論・画像解析

**GPT-4o-mini（gpt-4o-mini）**

GPT-4o-miniはコストと性能のバランスに優れた軽量モデルだ。多くのタスクでGPT-4oに匹敵する品質を大幅に低いコストで実現できる。高頻度のAPIコールが必要なアプリケーションに最適。

- 入力: $0.15 / 1Mトークン
- 出力: $0.60 / 1Mトークン
- 用途: チャットボット・テキスト分類・要約・軽量なコード生成

**o1・o1-mini（推論特化モデル）**

o1シリーズは複雑な推論タスクに特化したモデルで、内部で「思考」プロセスを経てから回答を生成する。数学・科学・コーディングの難問解決に優れるが、レスポンスが遅く、コストも高い。

- 用途: 複雑な数学問題・科学的推論・難易度の高いコード生成
- 注意: `temperature`・`system`メッセージなどのパラメータに制限あり

```typescript
// モデル選択の基準
const MODEL_SELECTION = {
  // 高精度・複雑なタスク
  high_accuracy: 'gpt-4o',
  // コスト最適化・高頻度タスク
  cost_efficient: 'gpt-4o-mini',
  // 複雑な推論・問題解決
  complex_reasoning: 'o1-mini',
  // Embeddings（テキストベクトル化）
  embeddings: 'text-embedding-3-small',
  embeddings_large: 'text-embedding-3-large',
} as const;
```

---

## 2. APIキー設定・Node.js SDK初期化

### 環境構築

まず必要なパッケージをインストールする。

```bash
npm install openai
npm install -D @types/node typescript tsx dotenv
```

### 環境変数の設定

`.env`ファイルにAPIキーを設定する。APIキーは絶対にソースコードにハードコードせず、環境変数で管理すること。

```bash
# .env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_ORG_ID=org-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # オプション
```

`.gitignore`に`.env`が含まれていることを確認する。

### OpenAIクライアントの初期化

```typescript
// lib/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // オプション
  maxRetries: 3, // 自動リトライ回数
  timeout: 30 * 1000, // タイムアウト（ミリ秒）
});

// シングルトンパターン（Next.js等での重複インスタンス防止）
let _openai: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return _openai;
}
```

### 接続テスト

```typescript
// scripts/test-connection.ts
import { openai } from './lib/openai';

async function testConnection() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello!' }],
      max_tokens: 10,
    });
    console.log('接続成功:', response.choices[0].message.content);
    console.log('使用トークン数:', response.usage);
  } catch (error) {
    console.error('接続失敗:', error);
  }
}

testConnection();
```

---

## 3. Chat Completions基本

### メッセージ構造と役割

Chat Completions APIは`messages`配列を受け取り、会話履歴に基づいてレスポンスを生成する。

```typescript
// 基本的なChat Completions
import { openai } from './lib/openai';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(messages: Message[]): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,      // 0.0（決定論的）〜 2.0（ランダム）
    max_tokens: 1024,      // 最大出力トークン数
    top_p: 1.0,            // nucleus sampling
    frequency_penalty: 0,  // 繰り返しペナルティ
    presence_penalty: 0,   // 話題の多様性
  });

  return response.choices[0].message.content ?? '';
}

// 使用例
const messages: Message[] = [
  {
    role: 'system',
    content: 'あなたはTypeScriptの専門家です。簡潔で実用的な回答をしてください。',
  },
  {
    role: 'user',
    content: 'TypeScriptのgenerics（ジェネリクス）とはなんですか？',
  },
];

const answer = await chat(messages);
console.log(answer);
```

### 会話履歴の管理

```typescript
// 会話セッション管理クラス
class ConversationSession {
  private messages: Message[] = [];
  private systemPrompt: string;

  constructor(systemPrompt: string) {
    this.systemPrompt = systemPrompt;
    this.messages = [{ role: 'system', content: systemPrompt }];
  }

  async sendMessage(userMessage: string): Promise<string> {
    // ユーザーメッセージを履歴に追加
    this.messages.push({ role: 'user', content: userMessage });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: this.messages,
      max_tokens: 2048,
    });

    const assistantMessage = response.choices[0].message.content ?? '';

    // アシスタントの応答を履歴に追加
    this.messages.push({ role: 'assistant', content: assistantMessage });

    // コンテキストウィンドウ管理: 古いメッセージを削除（システムプロンプトは保持）
    if (this.messages.length > 21) {
      this.messages = [
        this.messages[0], // システムプロンプト
        ...this.messages.slice(-20), // 直近20件
      ];
    }

    return assistantMessage;
  }

  getHistory(): Message[] {
    return [...this.messages];
  }

  reset(): void {
    this.messages = [{ role: 'system', content: this.systemPrompt }];
  }
}

// 使用例
const session = new ConversationSession(
  'あなたはフレンドリーなAIアシスタントです。'
);

const reply1 = await session.sendMessage('TypeScriptを学ぶには何から始めればいいですか？');
console.log('AI:', reply1);

const reply2 = await session.sendMessage('次のステップは？');
console.log('AI:', reply2);
```

### パラメータのチューニング

```typescript
// 用途別パラメータ設定
const COMPLETION_CONFIGS = {
  // 創作・ブレインストーミング（多様性重視）
  creative: {
    temperature: 1.2,
    top_p: 0.9,
    frequency_penalty: 0.5,
    presence_penalty: 0.5,
  },
  // 技術文書・コード生成（精度重視）
  technical: {
    temperature: 0.2,
    top_p: 1.0,
    frequency_penalty: 0,
    presence_penalty: 0,
  },
  // 会話・チャット（バランス型）
  conversational: {
    temperature: 0.7,
    top_p: 1.0,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
  },
  // 分類・判定（決定論的）
  classification: {
    temperature: 0,
    top_p: 1.0,
    frequency_penalty: 0,
    presence_penalty: 0,
  },
} as const;
```

---

## 4. ストリーミングレスポンス（stream: true・SSE）

### 基本的なストリーミング実装

ストリーミングを使うことで、モデルがトークンを生成するたびにリアルタイムで受信できる。ユーザー体験が大幅に向上する。

```typescript
// ストリーミングレスポンス
async function streamChat(userMessage: string): Promise<void> {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: userMessage }],
    stream: true, // ストリーミングを有効化
  });

  process.stdout.write('AI: ');

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      process.stdout.write(delta);
    }
  }

  process.stdout.write('\n');
}

// 完全なレスポンスを文字列として収集
async function streamChatToString(userMessage: string): Promise<string> {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: userMessage }],
    stream: true,
  });

  let fullContent = '';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    fullContent += delta;
  }

  return fullContent;
}
```

### Next.js APIルートでのSSE実装

```typescript
// app/api/chat/route.ts (Next.js App Router)
import OpenAI from 'openai';
import { NextRequest } from 'next/server';

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    stream: true,
  });

  // ReadableStreamを使ってSSEレスポンスを返す
  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) {
            // SSE形式でデータを送信
            const data = `data: ${JSON.stringify({ content: delta })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        }
        // ストリーム終了を通知
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### クライアントサイドでのSSE受信

```typescript
// hooks/useStreamingChat.ts
import { useState, useCallback } from 'react';

export function useStreamingChat() {
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (userMessage: string) => {
    setIsLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              setResponse((prev) => prev + (parsed.content ?? ''));
            } catch {
              // パースエラーは無視
            }
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { response, isLoading, sendMessage };
}
```

---

## 5. システムプロンプト設計（Few-shot・Chain-of-Thought）

### 効果的なシステムプロンプトの構造

```typescript
// システムプロンプトのテンプレート
const SYSTEM_PROMPTS = {
  // 役割・ペルソナ定義
  codeReviewer: `
あなたはシニアソフトウェアエンジニアです。以下の原則に従ってコードレビューを行ってください。

【役割】
- TypeScript/Node.jsの専門家
- セキュリティとパフォーマンスを重視
- 建設的かつ具体的なフィードバック

【レビュー観点】
1. バグ・論理エラー
2. セキュリティの脆弱性
3. パフォーマンスの問題
4. コードの可読性・保守性
5. TypeScriptの型安全性

【出力形式】
- 問題点: 具体的なコード行と説明
- 改善案: 修正後のコード例
- 重要度: 高/中/低
`,

  // Few-shot プロンプト（例示による学習）
  sentimentAnalyzer: `
以下の例を参考に、テキストの感情を分析してください。

例1:
入力: "この製品は素晴らしい！とても使いやすくて大満足です。"
出力: {"sentiment": "positive", "confidence": 0.95, "keywords": ["素晴らしい", "使いやすい", "大満足"]}

例2:
入力: "配送が遅すぎる。二度と注文しない。"
出力: {"sentiment": "negative", "confidence": 0.92, "keywords": ["遅すぎる", "二度と注文しない"]}

例3:
入力: "普通でした。特に良くも悪くもないです。"
出力: {"sentiment": "neutral", "confidence": 0.78, "keywords": ["普通", "特に良くも悪くもない"]}

必ずJSON形式で出力してください。
`,
};

// Chain-of-Thought プロンプト
const COT_SYSTEM_PROMPT = `
あなたは論理的な問題解決の専門家です。
複雑な問題に対しては、必ず以下のステップで考えてから答えを出してください。

【思考プロセス】
1. 問題の理解: 何が求められているかを確認
2. 情報の整理: 与えられた情報を構造化
3. 解法の検討: 複数のアプローチを考慮
4. 実行: 最適なアプローチで解決
5. 検証: 答えが正しいかチェック

回答の形式:
<thinking>
（内部思考プロセスをここに記述）
</thinking>

<answer>
（最終的な回答をここに記述）
</answer>
`;
```

### 構造化出力の強制

```typescript
// JSON Schema を使った構造化出力
async function extractProductInfo(description: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: '商品説明から構造化データを抽出してください。必ずJSON形式で出力してください。',
      },
      { role: 'user', content: description },
    ],
    response_format: { type: 'json_object' }, // JSON出力を強制
    temperature: 0,
  });

  const content = response.choices[0].message.content ?? '{}';
  return JSON.parse(content) as {
    name: string;
    price: number;
    category: string;
    features: string[];
  };
}
```

---

## 6. Function Calling（tools定義・tool_choice）

Function Callingは、モデルが外部ツール（関数）を呼び出すタイミングと引数を決定する機能だ。ツールの実際の実行はアプリケーション側で行う。

### ツール定義と実行フロー

```typescript
import OpenAI from 'openai';

const openai = new OpenAI();

// ツール（関数）の定義
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '指定された都市の現在の天気情報を取得します',
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
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'ウェブ検索を実行して最新情報を取得します',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '検索クエリ',
          },
          num_results: {
            type: 'number',
            description: '取得する結果数（デフォルト: 5）',
          },
        },
        required: ['query'],
      },
    },
  },
];

// ツールの実際の実装
const toolImplementations = {
  get_weather: async (args: { city: string; unit?: string }) => {
    // 実際の天気APIを呼び出す（例: OpenWeatherMap）
    return {
      city: args.city,
      temperature: 22,
      unit: args.unit ?? 'celsius',
      condition: '晴れ',
      humidity: 65,
    };
  },
  search_web: async (args: { query: string; num_results?: number }) => {
    // 実際の検索APIを呼び出す
    return {
      results: [
        { title: '検索結果1', url: 'https://example.com/1', snippet: '...' },
        { title: '検索結果2', url: 'https://example.com/2', snippet: '...' },
      ],
    };
  },
};

// Function Callingのメインループ
async function runWithTools(userMessage: string): Promise<string> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  // ツール呼び出しループ
  while (true) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools,
      tool_choice: 'auto', // 'auto' | 'none' | 特定ツール強制
    });

    const message = response.choices[0].message;
    messages.push(message);

    // ツール呼び出しがない場合は終了
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content ?? '';
    }

    // 各ツール呼び出しを実行
    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function.name as keyof typeof toolImplementations;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      console.log(`ツール実行: ${toolName}`, toolArgs);

      let result: unknown;
      if (toolName in toolImplementations) {
        result = await toolImplementations[toolName](toolArgs as never);
      } else {
        result = { error: `Unknown tool: ${toolName}` };
      }

      // ツール実行結果をメッセージに追加
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
    // ループを継続してモデルに結果を渡す
  }
}

// 使用例
const result = await runWithTools('東京の今日の天気を教えて、またTypeScript 5.0の新機能も調べて');
console.log(result);
```

### 特定ツールの強制呼び出し

```typescript
// tool_choiceで特定のツールを強制
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: userMessage }],
  tools,
  tool_choice: {
    type: 'function',
    function: { name: 'extract_data' }, // このツールを必ず呼び出す
  },
});
```

---

## 7. Vision API（画像入力・マルチモーダル）

GPT-4oはテキストと画像の両方を入力として受け付けるマルチモーダルモデルだ。

```typescript
// 画像URLを使った画像解析
async function analyzeImageFromUrl(imageUrl: string, prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high', // 'low' | 'high' | 'auto'
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
    max_tokens: 1024,
  });

  return response.choices[0].message.content ?? '';
}

// ローカル画像（Base64エンコード）の解析
import fs from 'fs';
import path from 'path';

async function analyzeLocalImage(imagePath: string, prompt: string): Promise<string> {
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  return response.choices[0].message.content ?? '';
}

// 複数画像の比較分析
async function compareImages(imageUrls: string[]): Promise<string> {
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = imageUrls.map(
    (url) => ({
      type: 'image_url' as const,
      image_url: { url },
    })
  );

  content.push({
    type: 'text',
    text: 'これらの画像を比較して、主な違いと共通点を説明してください。',
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content }],
    max_tokens: 2048,
  });

  return response.choices[0].message.content ?? '';
}

// 使用例: ECサイトの商品画像からメタデータ抽出
async function extractProductMetadata(imageUrl: string) {
  const prompt = `
この商品画像から以下の情報を抽出してJSON形式で返してください:
{
  "product_name": "商品名",
  "category": "カテゴリ",
  "color": ["色1", "色2"],
  "material": "素材",
  "target_audience": "ターゲット層",
  "style_tags": ["タグ1", "タグ2"],
  "estimated_price_range": "価格帯"
}
`;

  const result = await analyzeImageFromUrl(imageUrl, prompt);
  return JSON.parse(result);
}
```

---

## 8. Embeddings（text-embedding-3・ベクトル類似検索）

Embeddingsはテキストを高次元ベクトルに変換する機能で、意味的な類似度計算・検索・クラスタリングなどに活用できる。

```typescript
// Embeddingsの生成
async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // または text-embedding-3-large
    input: text,
    encoding_format: 'float',
    dimensions: 1536, // text-embedding-3-smallのデフォルト次元数
  });

  return response.data[0].embedding;
}

// バッチEmbeddings（複数テキストを一度に処理）
async function createBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts, // 配列で渡すとバッチ処理
  });

  return response.data.map((item) => item.embedding);
}

// コサイン類似度の計算
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// セマンティック検索の実装
interface Document {
  id: string;
  text: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

class SemanticSearchEngine {
  private documents: Document[] = [];

  // ドキュメントのインデックス構築
  async indexDocuments(docs: Omit<Document, 'embedding'>[]): Promise<void> {
    const texts = docs.map((d) => d.text);
    const embeddings = await createBatchEmbeddings(texts);

    this.documents = docs.map((doc, i) => ({
      ...doc,
      embedding: embeddings[i],
    }));

    console.log(`${docs.length}件のドキュメントをインデックス化しました`);
  }

  // クエリに基づく類似ドキュメント検索
  async search(
    query: string,
    topK: number = 5
  ): Promise<Array<Document & { similarity: number }>> {
    const queryEmbedding = await createEmbedding(query);

    const results = this.documents
      .map((doc) => ({
        ...doc,
        similarity: cosineSimilarity(queryEmbedding, doc.embedding!),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  }
}

// 使用例
const engine = new SemanticSearchEngine();

await engine.indexDocuments([
  { id: '1', text: 'TypeScriptは静的型付けをサポートするJavaScriptのスーパーセットです' },
  { id: '2', text: 'React Hooksを使うとステートロジックを再利用できます' },
  { id: '3', text: 'Node.jsはV8エンジンを使ったサーバーサイドJavaScript実行環境です' },
]);

const results = await engine.search('JavaScriptの型システムについて教えて');
results.forEach((r) => {
  console.log(`類似度: ${r.similarity.toFixed(3)} - ${r.text}`);
});
```

---

## 9. RAG実装（PDF読み込み→チャンク→Embedding→検索→生成）

RAG（Retrieval-Augmented Generation）は、外部知識ベースから関連情報を検索し、その情報をコンテキストとしてLLMに提供することで、より正確で知識豊富な回答を生成する手法だ。

```typescript
// RAGパイプラインの完全実装
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI();

// ステップ1: テキスト抽出（PDFやMarkdownファイルから）
// 注意: PDF処理にはpdf-parse等のライブラリが必要
// npm install pdf-parse @types/pdf-parse

async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt' || ext === '.md') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  if (ext === '.pdf') {
    // pdf-parseを使ったPDF読み込み（実際の実装）
    // const pdfParse = await import('pdf-parse');
    // const buffer = fs.readFileSync(filePath);
    // const data = await pdfParse.default(buffer);
    // return data.text;
    throw new Error('PDF処理にはpdf-parseライブラリが必要です');
  }

  throw new Error(`未対応のファイル形式: ${ext}`);
}

// ステップ2: テキストをチャンクに分割
interface TextChunk {
  id: string;
  text: string;
  source: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
}

function splitIntoChunks(
  text: string,
  source: string,
  chunkSize: number = 500,
  overlap: number = 50
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    let chunkText = text.slice(startIndex, endIndex);

    // 文の途中で切らないよう調整（句点や改行で区切る）
    if (endIndex < text.length) {
      const lastPunctuation = Math.max(
        chunkText.lastIndexOf('。'),
        chunkText.lastIndexOf('\n'),
        chunkText.lastIndexOf('. ')
      );
      if (lastPunctuation > chunkSize * 0.5) {
        chunkText = chunkText.slice(0, lastPunctuation + 1);
      }
    }

    chunks.push({
      id: `${source}-chunk-${chunkIndex}`,
      text: chunkText.trim(),
      source,
      chunkIndex,
      startChar: startIndex,
      endChar: startIndex + chunkText.length,
    });

    startIndex += chunkText.length - overlap;
    chunkIndex++;
  }

  return chunks.filter((c) => c.text.length > 50); // 短すぎるチャンクを除外
}

// ステップ3: ベクトルストア
interface VectorStore {
  chunks: TextChunk[];
  embeddings: number[][];
}

async function buildVectorStore(
  filePaths: string[]
): Promise<VectorStore> {
  const allChunks: TextChunk[] = [];

  // 各ファイルからテキストを抽出してチャンク化
  for (const filePath of filePaths) {
    console.log(`処理中: ${filePath}`);
    const text = await extractTextFromFile(filePath);
    const chunks = splitIntoChunks(text, path.basename(filePath));
    allChunks.push(...chunks);
  }

  console.log(`合計チャンク数: ${allChunks.length}`);

  // バッチ処理でEmbeddings生成（APIレート制限を考慮）
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.text);

    const embeddings = await createBatchEmbeddings(texts);
    allEmbeddings.push(...embeddings);

    console.log(`Embedding進捗: ${Math.min(i + batchSize, allChunks.length)}/${allChunks.length}`);

    // レート制限対策: バッチ間に少し待機
    if (i + batchSize < allChunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { chunks: allChunks, embeddings: allEmbeddings };
}

// ステップ4: 関連チャンクの検索
async function retrieveRelevantChunks(
  query: string,
  vectorStore: VectorStore,
  topK: number = 5,
  minSimilarity: number = 0.7
): Promise<Array<TextChunk & { similarity: number }>> {
  const queryEmbedding = await createEmbedding(query);

  const results = vectorStore.chunks
    .map((chunk, i) => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, vectorStore.embeddings[i]),
    }))
    .filter((r) => r.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

// ステップ5: RAGを使った回答生成
async function ragQuery(
  question: string,
  vectorStore: VectorStore
): Promise<{ answer: string; sources: string[] }> {
  // 関連チャンクを検索
  const relevantChunks = await retrieveRelevantChunks(question, vectorStore);

  if (relevantChunks.length === 0) {
    return {
      answer: '申し訳ありませんが、この質問に関連する情報が見つかりませんでした。',
      sources: [],
    };
  }

  // コンテキストを構築
  const context = relevantChunks
    .map((chunk, i) => `[出典${i + 1}: ${chunk.source}]\n${chunk.text}`)
    .join('\n\n---\n\n');

  // RAGプロンプトで回答生成
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `あなたは提供されたコンテキストに基づいて質問に答えるアシスタントです。
コンテキストに含まれていない情報については「提供された資料には記載がありません」と答えてください。
回答の最後に、使用した出典番号を記載してください。`,
      },
      {
        role: 'user',
        content: `以下のコンテキストを参考に質問に答えてください。

【コンテキスト】
${context}

【質問】
${question}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });

  const answer = response.choices[0].message.content ?? '';
  const sources = [...new Set(relevantChunks.map((c) => c.source))];

  return { answer, sources };
}

// RAGシステムの使用例
async function buildAndQueryRAG() {
  // ベクトルストアを構築（初回のみ、後はJSONに保存して再利用）
  const vectorStore = await buildVectorStore([
    './documents/manual.txt',
    './documents/faq.md',
  ]);

  // クエリ実行
  const { answer, sources } = await ragQuery(
    '製品の返品ポリシーはどうなっていますか？',
    vectorStore
  );

  console.log('回答:', answer);
  console.log('参照資料:', sources);
}
```

---

## 10. コスト管理（トークンカウント・usage追跡）

### トークン数の事前計算

```typescript
// npm install tiktoken
import { encoding_for_model } from 'tiktoken';

// トークン数を事前にカウント
function countTokens(text: string, model: string = 'gpt-4o'): number {
  try {
    const enc = encoding_for_model(model as never);
    const tokens = enc.encode(text);
    enc.free();
    return tokens.length;
  } catch {
    // モデルが見つからない場合は近似値を使用
    return Math.ceil(text.length / 4);
  }
}

// メッセージ配列のトークン数を計算
function countMessagesTokens(messages: Message[]): number {
  let total = 0;
  for (const msg of messages) {
    total += 4; // メッセージのオーバーヘッド
    total += countTokens(msg.content);
    total += countTokens(msg.role);
  }
  total += 2; // 応答プライミング
  return total;
}
```

### 使用量の追跡とコスト計算

```typescript
// コスト計算
interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10.0 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'o1': { inputPer1M: 15.0, outputPer1M: 60.0 },
  'o1-mini': { inputPer1M: 3.0, outputPer1M: 12.0 },
  'text-embedding-3-small': { inputPer1M: 0.02, outputPer1M: 0 },
  'text-embedding-3-large': { inputPer1M: 0.13, outputPer1M: 0 },
};

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}

// 使用量追跡クラス
class UsageTracker {
  private records: Array<{
    timestamp: Date;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    requestId: string;
  }> = [];

  track(
    model: string,
    usage: OpenAI.Completions.CompletionUsage,
    requestId: string
  ): void {
    const cost = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);

    this.records.push({
      timestamp: new Date(),
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      cost,
      requestId,
    });
  }

  getSummary() {
    const totalCost = this.records.reduce((sum, r) => sum + r.cost, 0);
    const totalInputTokens = this.records.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = this.records.reduce((sum, r) => sum + r.outputTokens, 0);

    return {
      totalRequests: this.records.length,
      totalCost: totalCost.toFixed(4),
      totalInputTokens,
      totalOutputTokens,
      avgCostPerRequest: (totalCost / this.records.length).toFixed(6),
    };
  }
}

// ラッパー関数でコストを自動追跡
const tracker = new UsageTracker();

async function trackedChatCompletion(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
) {
  const response = await openai.chat.completions.create(params);

  if (response.usage) {
    tracker.track(
      params.model,
      response.usage,
      response.id
    );
  }

  return response;
}
```

---

## 11. レート制限対策（exponential backoff・キュー管理）

### Exponential Backoffの実装

```typescript
// レート制限エラーに対するExponential Backoff
async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // OpenAI APIのレート制限エラーを判定
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          // Too Many Requests
          const retryAfter = error.headers?.['retry-after'];
          const delay = retryAfter
            ? parseInt(retryAfter) * 1000
            : baseDelay * Math.pow(2, attempt) + Math.random() * 1000;

          console.warn(
            `レート制限: ${delay}ms 後にリトライ (試行 ${attempt + 1}/${maxRetries})`
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // 5xx系サーバーエラーもリトライ
        if (error.status >= 500) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`サーバーエラー ${error.status}: ${delay}ms 後にリトライ`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // その他のAPIエラーはリトライしない
        throw error;
      }

      throw error;
    }
  }

  throw lastError!;
}

// 使用例
const response = await withExponentialBackoff(() =>
  openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Hello' }],
  })
);
```

### リクエストキューの実装

```typescript
// 並列リクエスト数を制限するキュー
class RateLimitedQueue {
  private queue: Array<() => Promise<unknown>> = [];
  private running = 0;
  private maxConcurrent: number;
  private requestsPerMinute: number;
  private requestTimestamps: number[] = [];

  constructor(maxConcurrent: number = 5, requestsPerMinute: number = 60) {
    this.maxConcurrent = maxConcurrent;
    this.requestsPerMinute = requestsPerMinute;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    // RPMレート制限チェック
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneMinuteAgo);

    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = 60_000 - (now - oldestRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    const fn = this.queue.shift();
    if (!fn) return;

    this.running++;
    this.requestTimestamps.push(Date.now());

    try {
      await fn();
    } finally {
      this.running--;
      this.processQueue();
    }
  }
}

// 使用例: 大量のテキストを並列処理
const queue = new RateLimitedQueue(3, 30); // 最大並列3、毎分30リクエスト

const texts = Array.from({ length: 100 }, (_, i) => `テキスト ${i + 1}`);

const results = await Promise.all(
  texts.map((text) =>
    queue.add(() =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: text }],
        max_tokens: 100,
      })
    )
  )
);
```

---

## 12. エラーハンドリング（APIError・ネットワークエラー）

### 包括的なエラーハンドリング

```typescript
import OpenAI from 'openai';

// カスタムエラー型
class OpenAIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'OpenAIServiceError';
  }
}

// エラーハンドリングラッパー
async function safeOpenAICall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      switch (error.status) {
        case 400:
          throw new OpenAIServiceError(
            `リクエストエラー: ${error.message}`,
            'BAD_REQUEST',
            false,
            error
          );

        case 401:
          throw new OpenAIServiceError(
            'APIキーが無効です。環境変数OPENAI_API_KEYを確認してください。',
            'UNAUTHORIZED',
            false,
            error
          );

        case 403:
          throw new OpenAIServiceError(
            'このAPIへのアクセス権限がありません。',
            'FORBIDDEN',
            false,
            error
          );

        case 404:
          throw new OpenAIServiceError(
            `リソースが見つかりません: ${error.message}`,
            'NOT_FOUND',
            false,
            error
          );

        case 422:
          throw new OpenAIServiceError(
            `パラメータエラー: ${error.message}`,
            'UNPROCESSABLE_ENTITY',
            false,
            error
          );

        case 429:
          throw new OpenAIServiceError(
            'レート制限に達しました。しばらく待ってから再試行してください。',
            'RATE_LIMIT',
            true, // リトライ可能
            error
          );

        case 500:
        case 502:
        case 503:
        case 504:
          throw new OpenAIServiceError(
            `OpenAIサーバーエラー: ${error.message}`,
            'SERVER_ERROR',
            true, // リトライ可能
            error
          );

        default:
          throw new OpenAIServiceError(
            `予期しないAPIエラー: ${error.message}`,
            'UNKNOWN',
            false,
            error
          );
      }
    }

    // ネットワークエラー
    if (error instanceof Error) {
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')
      ) {
        throw new OpenAIServiceError(
          'ネットワークエラー: OpenAI APIに接続できません。',
          'NETWORK_ERROR',
          true,
          error
        );
      }
    }

    throw error;
  }
}

// コンテキストウィンドウ超過への対応
function truncateMessages(
  messages: Message[],
  maxTokens: number = 100_000
): Message[] {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const otherMessages = messages.filter((m) => m.role !== 'system');

  let totalTokens = countMessagesTokens(systemMessages);
  const truncated: Message[] = [...systemMessages];

  // 最新のメッセージから順に追加
  for (let i = otherMessages.length - 1; i >= 0; i--) {
    const msgTokens = countTokens(otherMessages[i].content) + 4;
    if (totalTokens + msgTokens <= maxTokens) {
      truncated.unshift(otherMessages[i]);
      totalTokens += msgTokens;
    } else {
      break;
    }
  }

  return truncated;
}
```

---

## 13. Vercel AI SDK統合（useChat・useCompletion）

Vercel AI SDKは、OpenAI APIをNext.jsアプリケーションに簡単に統合するための公式ライブラリだ。

### セットアップ

```bash
npm install ai @ai-sdk/openai
```

### APIルートの実装

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    system: 'あなたは役に立つアシスタントです。',
    messages,
  });

  return result.toDataStreamResponse();
}
```

### useChatフックの使用

```typescript
// components/ChatInterface.tsx
'use client';

import { useChat } from 'ai/react';

export function ChatInterface() {
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
        id: 'welcome',
        role: 'assistant',
        content: 'こんにちは！何でも聞いてください。',
      },
    ],
    onError: (error) => {
      console.error('チャットエラー:', error);
    },
    onFinish: (message) => {
      console.log('メッセージ完了:', message);
    },
  });

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-xs'
                : 'bg-gray-100 mr-auto max-w-sm'
            }`}
          >
            <p className="text-sm font-semibold capitalize">{message.role}</p>
            <p className="mt-1">{message.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="bg-gray-100 p-3 rounded-lg max-w-sm animate-pulse">
            入力中...
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
          <p className="text-red-600 text-sm">エラーが発生しました</p>
          <button onClick={reload} className="text-red-600 underline text-sm">
            再試行
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="メッセージを入力..."
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2"
          disabled={isLoading}
        />
        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="bg-red-500 text-white px-4 py-2 rounded-lg"
          >
            停止
          </button>
        ) : (
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            disabled={!input.trim()}
          >
            送信
          </button>
        )}
      </form>
    </div>
  );
}
```

### useCompletionフックの使用

```typescript
// components/TextCompletion.tsx
'use client';

import { useCompletion } from 'ai/react';

export function TextCompletion() {
  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useCompletion({
    api: '/api/completion',
  });

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="続きを生成したいテキストを入力..."
          className="w-full border rounded-lg p-2 h-32"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          {isLoading ? '生成中...' : 'テキスト生成'}
        </button>
      </form>
      {completion && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-semibold">生成結果:</p>
          <p className="mt-1 whitespace-pre-wrap">{completion}</p>
        </div>
      )}
    </div>
  );
}
```

### Function Callingとの統合（AI SDK）

```typescript
// app/api/agent/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    tools: {
      getWeather: tool({
        description: '指定された都市の天気を取得します',
        parameters: z.object({
          city: z.string().describe('都市名'),
        }),
        execute: async ({ city }) => {
          // 実際の天気API呼び出し
          return { city, temperature: 22, condition: '晴れ' };
        },
      }),
      searchDatabase: tool({
        description: 'データベースから情報を検索します',
        parameters: z.object({
          query: z.string().describe('検索クエリ'),
          limit: z.number().optional().describe('取得件数'),
        }),
        execute: async ({ query, limit = 5 }) => {
          // 実際のDB検索
          return { results: [], query, limit };
        },
      }),
    },
    maxSteps: 5, // ツール呼び出しの最大ステップ数
  });

  return result.toDataStreamResponse();
}
```

---

## まとめ

本記事では、OpenAI APIをTypeScript/Node.jsで活用するための実践的な実装パターンを網羅的に解説した。

**重要なポイントの整理:**

- **モデル選択**: GPT-4o-miniをデフォルト、高精度が必要な場合のみGPT-4oを使用することでコストを最適化する
- **ストリーミング**: ユーザー体験向上のため、長い回答には必ずストリーミングを使用する
- **Function Calling**: 外部APIやデータベースとの連携はFunction Callingで実装し、LLMの能力を最大限に引き出す
- **RAG**: 独自のナレッジベースを組み込む際はRAGパターンが最も実用的
- **コスト管理**: `usage`オブジェクトを必ず追跡し、予期しない課金を防ぐ
- **エラーハンドリング**: レート制限（429）にはExponential Backoff、他のエラーは種類に応じて適切に処理する

OpenAI APIとのやりとりではJSON形式のレスポンスを扱う場面が多い。**[DevToolBox](https://usedevtools.com/)** はJSON Formatter・Validator・Diffツールを無料で提供しており、APIレスポンスのデバッグや構造確認に重宝する。Function CallingやStructured Outputsで取得したJSONデータの検証・整形に活用してほしい。

AIアプリケーション開発は今が最もエキサイティングな時期だ。本記事の実装パターンを土台に、自分だけのAIプロダクトを構築していこう。

