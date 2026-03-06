---
title: "OpenRouter API入門 - 複数LLMを統一APIで使い分ける方法"
description: "OpenRouterは複数のLLMプロバイダーを統一APIで利用できるルーティングサービスです。Claude・GPT-4o・Gemini・Llama等200以上のモデル切替、コスト最適化、フォールバック設定からTypeScript・Pythonでの実装パターンまで実践的に解説します。"
pubDate: "2026-03-05"
tags: ['AI', 'API', 'LLM', '開発ツール']
---

**OpenRouter**は、OpenAI・Anthropic・Google・Meta等の複数LLMプロバイダーを**統一されたAPI**で利用できるサービスです。モデルの切り替え、コスト比較、フォールバック設定をシンプルなAPIで実現します。

本記事では、OpenRouter APIの基本的な使い方からモデル選択戦略、TypeScript/Pythonでの実装パターンまで解説します。

## OpenRouterとは？

OpenRouterは、**LLMのルーティングサービス**です。1つのAPIキーで200以上のモデルにアクセスでき、用途に応じてモデルを切り替えられます。

### 主な特徴

- **統一API**: OpenAI互換のAPIで全モデルにアクセス
- **200+モデル対応**: Claude、GPT-4o、Gemini、Llama、Mistralなど
- **従量課金**: 使った分だけの支払い
- **フォールバック**: モデル障害時に自動で別モデルに切り替え
- **コスト最適化**: 同一品質で最安のモデルを自動選択
- **無料モデル**: 一部モデルは無料で利用可能

### 直接APIとの比較

| 項目 | OpenRouter | 直接API（各社個別） |
|------|-----------|------------------|
| APIキー管理 | 1つ | プロバイダーごとに個別 |
| モデル切替 | model名変更のみ | エンドポイント・認証の変更 |
| フォールバック | 組み込み | 自前実装が必要 |
| 価格比較 | ダッシュボードで一覧 | 各社サイトで確認 |
| レート制限 | 統合管理 | 各社個別に管理 |
| 追加コスト | 約0-5%のマージン | なし |

## セットアップ

### APIキーの取得

1. [openrouter.ai](https://openrouter.ai/) でアカウント作成
2. ダッシュボードの「Keys」からAPIキーを生成
3. クレジットをチャージ（最低$5から）

### 基本的なAPIリクエスト

OpenRouterはOpenAI互換APIなので、既存のコードをほぼそのまま使えます。

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d '{
    "model": "anthropic/claude-sonnet-4-20250514",
    "messages": [
      {"role": "user", "content": "TypeScriptの型推論について説明してください"}
    ]
  }'
```

## TypeScriptでの実装

### OpenAI SDKを使う方法（推奨）

OpenRouter APIはOpenAI互換なので、OpenAI SDKをそのまま使えます。

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://your-app.com',
    'X-Title': 'Your App Name',
  },
});

async function chat(message: string, model = 'anthropic/claude-sonnet-4-20250514') {
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: message }],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0].message.content;
}

// 使用例
const answer = await chat('ReactのuseEffectの注意点を教えて');
console.log(answer);
```

### モデルの動的切替

```typescript
// モデル定義
const MODELS = {
  // 高品質（複雑な推論、コード生成）
  premium: 'anthropic/claude-opus-4-20250514',
  // バランス（一般的なタスク）
  standard: 'anthropic/claude-sonnet-4-20250514',
  // 高速・低コスト（分類、要約、簡単なタスク）
  fast: 'anthropic/claude-haiku-4-5-20251001',
  // コーディング特化
  coding: 'anthropic/claude-sonnet-4-20250514',
  // 長文処理
  longContext: 'google/gemini-2.0-flash-001',
} as const;

type ModelTier = keyof typeof MODELS;

async function smartChat(
  message: string,
  tier: ModelTier = 'standard'
) {
  const model = MODELS[tier];

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: message }],
  });

  return {
    content: response.choices[0].message.content,
    model: response.model,
    usage: response.usage,
  };
}

// 用途に応じてモデルを選択
const simpleAnswer = await smartChat('こんにちは', 'fast');
const codeReview = await smartChat('このコードをレビューして...', 'coding');
const analysis = await smartChat('この論文を分析して...', 'premium');
```

### ストリーミング対応

```typescript
async function streamChat(message: string) {
  const stream = await client.chat.completions.create({
    model: 'anthropic/claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: message }],
    stream: true,
  });

  let fullContent = '';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    fullContent += delta;
    process.stdout.write(delta);
  }

  return fullContent;
}
```

### フォールバック実装

```typescript
async function chatWithFallback(
  message: string,
  models: string[] = [
    'anthropic/claude-sonnet-4-20250514',
    'openai/gpt-4o',
    'google/gemini-2.0-flash-001',
  ]
) {
  for (const model of models) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: message }],
        timeout: 30000,
      });

      return {
        content: response.choices[0].message.content,
        model: response.model,
        fallback: model !== models[0],
      };
    } catch (error) {
      console.warn(`Model ${model} failed, trying next...`);
      continue;
    }
  }

  throw new Error('All models failed');
}
```

## Pythonでの実装

### OpenAIライブラリを使用

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
    default_headers={
        "HTTP-Referer": "https://your-app.com",
        "X-Title": "Your App Name",
    },
)

def chat(message: str, model: str = "anthropic/claude-sonnet-4-20250514") -> str:
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": message}],
        temperature=0.7,
    )
    return response.choices[0].message.content


# ストリーミング
def stream_chat(message: str):
    stream = client.chat.completions.create(
        model="anthropic/claude-sonnet-4-20250514",
        messages=[{"role": "user", "content": message}],
        stream=True,
    )

    full_content = ""
    for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        full_content += delta
        print(delta, end="", flush=True)

    return full_content
```

### LangChainとの連携

```python
import os
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="anthropic/claude-sonnet-4-20250514",
    openai_api_key=os.environ["OPENROUTER_API_KEY"],
    openai_api_base="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "https://your-app.com",
    },
)

response = llm.invoke("TypeScriptの型ガードについて説明して")
print(response.content)
```

## モデル選択戦略

### コスト比較（2026年3月時点の参考価格）

| モデル | 入力/1M tokens | 出力/1M tokens | 特徴 |
|--------|---------------|---------------|------|
| Claude Opus 4 | $15.00 | $75.00 | 最高品質の推論 |
| Claude Sonnet 4 | $3.00 | $15.00 | バランス型 |
| Claude Haiku 4.5 | $0.80 | $4.00 | 高速・低コスト |
| GPT-4o | $2.50 | $10.00 | マルチモーダル |
| GPT-4o mini | $0.15 | $0.60 | 超低コスト |
| Gemini 2.0 Flash | $0.10 | $0.40 | 長文・低コスト |
| Llama 3.3 70B | $0.50 | $0.70 | オープンソース |

> 価格は参考値です。最新の正確な価格は[OpenRouterの価格ページ](https://openrouter.ai/models)で確認してください。

### 用途別おすすめモデル

```typescript
// タスクに応じたモデル選択ロジック
function selectModel(task: string): string {
  const taskMap: Record<string, string> = {
    // 高度な推論・分析
    'analysis': 'anthropic/claude-opus-4-20250514',
    'research': 'anthropic/claude-opus-4-20250514',

    // コーディング
    'code-generation': 'anthropic/claude-sonnet-4-20250514',
    'code-review': 'anthropic/claude-sonnet-4-20250514',
    'debugging': 'anthropic/claude-sonnet-4-20250514',

    // 一般的な対話
    'chat': 'anthropic/claude-sonnet-4-20250514',
    'qa': 'anthropic/claude-haiku-4-5-20251001',

    // テキスト処理
    'summarization': 'anthropic/claude-haiku-4-5-20251001',
    'classification': 'anthropic/claude-haiku-4-5-20251001',
    'translation': 'anthropic/claude-haiku-4-5-20251001',

    // 長文処理
    'long-document': 'google/gemini-2.0-flash-001',

    // 低コスト大量処理
    'batch': 'openai/gpt-4o-mini',
  };

  return taskMap[task] || 'anthropic/claude-sonnet-4-20250514';
}
```

## 実践パターン

### パターン1: AI機能付きWebアプリ

```typescript
// Next.js API Route
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: NextRequest) {
  const { message, context } = await req.json();

  const stream = await client.chat.completions.create({
    model: 'anthropic/claude-sonnet-4-20250514',
    messages: [
      { role: 'system', content: context },
      { role: 'user', content: message },
    ],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

### パターン2: コスト管理付きチャットボット

```typescript
class CostAwareChatbot {
  private totalCost = 0;
  private maxBudget: number;

  constructor(maxBudgetUSD: number = 10) {
    this.maxBudget = maxBudgetUSD;
  }

  async chat(message: string): Promise<string> {
    // 予算チェック
    if (this.totalCost >= this.maxBudget) {
      throw new Error(`Budget exceeded: $${this.totalCost.toFixed(4)}`);
    }

    // メッセージの長さに応じてモデルを選択
    const model = message.length > 2000
      ? 'anthropic/claude-haiku-4-5-20251001'  // 長文は安いモデル
      : 'anthropic/claude-sonnet-4-20250514';

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: message }],
    });

    // コスト計算（概算）
    const usage = response.usage;
    if (usage) {
      const cost = this.estimateCost(model, usage.prompt_tokens, usage.completion_tokens);
      this.totalCost += cost;
    }

    return response.choices[0].message.content || '';
  }

  private estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'anthropic/claude-sonnet-4-20250514': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
      'anthropic/claude-haiku-4-5-20251001': { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
    };

    const price = pricing[model] || { input: 0.01, output: 0.03 };
    return (inputTokens * price.input) + (outputTokens * price.output);
  }

  getCost(): number {
    return this.totalCost;
  }
}
```

### パターン3: 構造化出力

```typescript
import { z } from 'zod';

const ProductReviewSchema = z.object({
  summary: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  rating: z.number().min(1).max(5),
  recommendation: z.enum(['strongly_recommend', 'recommend', 'neutral', 'not_recommend']),
});

async function analyzeReview(reviewText: string) {
  const response = await client.chat.completions.create({
    model: 'anthropic/claude-sonnet-4-20250514',
    messages: [
      {
        role: 'system',
        content: `レビューテキストを分析し、以下のJSON形式で出力してください:
{
  "summary": "要約",
  "pros": ["良い点1", "良い点2"],
  "cons": ["悪い点1"],
  "rating": 4,
  "recommendation": "recommend"
}`
      },
      { role: 'user', content: reviewText },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('Empty response');

  return ProductReviewSchema.parse(JSON.parse(content));
}
```

## セキュリティとベストプラクティス

### APIキーの管理

```typescript
// 環境変数で管理（ハードコード禁止）
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error('OPENROUTER_API_KEY is required');
}

// サーバーサイドのみで使用（クライアントに露出させない）
// Next.jsの場合、NEXT_PUBLIC_ プレフィックスをつけない
```

### レート制限の対応

```typescript
async function chatWithRetry(
  message: string,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.chat.completions.create({
        model: 'anthropic/claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: message }],
      });
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        const retryAfter = parseInt(error.headers?.['retry-after'] || '5');
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

## トラブルシューティング

### よくあるエラー

**`401 Unauthorized`**:

```bash
# APIキーの確認
echo $OPENROUTER_API_KEY | head -c 10
# sk-or-v1-で始まるか確認
```

**`402 Insufficient credits`**:

```bash
# OpenRouterダッシュボードでクレジットを確認・チャージ
# https://openrouter.ai/credits
```

**`429 Rate Limited`**:

```typescript
// リトライロジックを実装するか、リクエスト間隔を空ける
```

**`503 Model Unavailable`**:

```typescript
// フォールバックモデルリストを設定
```

## まとめ

OpenRouterは**複数LLMの統一アクセスポイント**として、AI開発の柔軟性を大きく向上させます。

### OpenRouterの強み

- **1つのAPIで200+モデル**: プロバイダーごとの個別管理が不要
- **コスト最適化**: タスクに応じて最適なモデルを選択
- **フォールバック**: 障害耐性の高いAIアプリケーション
- **OpenAI互換**: 既存コードの移行が容易

### 導入が向いているケース

- 複数のLLMを比較検討中のプロジェクト
- モデルの可用性を高めたいプロダクション環境
- コストを最適化しながらAI機能を提供したい場合
- プロトタイピングで素早くモデルを切り替えたい場合

### 学習リソース

- [OpenRouter公式ドキュメント](https://openrouter.ai/docs)
- [モデル一覧・価格](https://openrouter.ai/models)
- [OpenRouter GitHub](https://github.com/OpenRouterTeam)

複数のLLMを活用するAIアプリケーションを構築するなら、OpenRouterは間違いなく検討すべき選択肢です。まずは無料モデルで試してみてください。
