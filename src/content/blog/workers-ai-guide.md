---
title: "Cloudflare Workers AIでエッジAI推論 - サーバーレスで機械学習モデルを実行する"
description: "Cloudflare Workers AIを使ってエッジ環境で機械学習モデルを実行する方法を徹底解説。テキスト生成、画像認識、音声処理など多彩なAIモデルをサーバーレスで利用できます。"
pubDate: "2025-02-05"
---

# Cloudflare Workers AIでエッジAI推論

Cloudflare Workers AIは、Cloudflareのエッジネットワーク上で機械学習モデルを実行できる革新的なプラットフォームです。従来のAI APIとは異なり、ユーザーに最も近いエッジロケーションでAI推論を実行することで、低レイテンシーかつコスト効率の高いAIアプリケーションを構築できます。

## Workers AIとは

Workers AIは、Cloudflare Workersの一部として提供されるAI推論プラットフォームです。以下の特徴があります。

### 主な特徴

- **エッジ実行**: 世界中300以上のデータセンターでAIモデルを実行
- **豊富なモデル**: テキスト生成、画像認識、音声処理など多様なモデルを提供
- **サーバーレス**: インフラ管理不要、自動スケーリング
- **低レイテンシー**: ユーザーに近い場所で推論を実行
- **コスト効率**: 使った分だけの従量課金

### 利用可能なモデルカテゴリ

- **Text Generation**: LLM（Large Language Models）
- **Text Classification**: テキスト分類、感情分析
- **Translation**: 機械翻訳
- **Text Embeddings**: ベクトル埋め込み
- **Image Classification**: 画像分類
- **Object Detection**: 物体検出
- **Speech Recognition**: 音声認識
- **Text-to-Speech**: 音声合成

## プロジェクトセットアップ

### 前提条件

```bash
# Node.jsとnpmがインストールされていることを確認
node --version
npm --version

# Wranglerをグローバルインストール
npm install -g wrangler

# Cloudflareアカウントにログイン
wrangler login
```

### 新規プロジェクト作成

```bash
# Workers AIプロジェクトを作成
npm create cloudflare@latest my-workers-ai
cd my-workers-ai

# または既存プロジェクトで有効化
wrangler init my-workers-ai
cd my-workers-ai
```

### wrangler.toml設定

```toml
name = "my-workers-ai"
main = "src/index.ts"
compatibility_date = "2025-02-05"

# Workers AIを有効化
[ai]
binding = "AI"

# 必要に応じてR2やD1も設定可能
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"
```

## テキスト生成（LLM）

### 基本的な使い方

```typescript
export interface Env {
  AI: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ai = env.AI;

    // Llama 2を使ったテキスト生成
    const response = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        {
          role: 'system',
          content: 'あなたは親切なアシスタントです。'
        },
        {
          role: 'user',
          content: 'JavaScriptの非同期処理について簡潔に説明してください。'
        }
      ]
    });

    return Response.json(response);
  }
};
```

### ストリーミングレスポンス

リアルタイムでテキストを生成する場合は、ストリーミングを使用します。

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ai = env.AI;

    const stream = await ai.run(
      '@cf/meta/llama-2-7b-chat-int8',
      {
        messages: [
          { role: 'user', content: '長い物語を書いてください。' }
        ],
        stream: true
      }
    );

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'connection': 'keep-alive'
      }
    });
  }
};
```

### 複数のLLMモデル

Workers AIでは様々なLLMモデルを利用できます。

```typescript
// Mistral 7B（高速・高品質）
const mistralResponse = await env.AI.run('@cf/mistral/mistral-7b-instruct-v0.1', {
  messages: [{ role: 'user', content: prompt }]
});

// CodeLlama（コード生成特化）
const codeResponse = await env.AI.run('@cf/meta/codellama-7b-instruct', {
  messages: [
    {
      role: 'user',
      content: 'Reactでカウンターコンポーネントを作成してください。'
    }
  ]
});

// Phi 2（軽量・高速）
const phiResponse = await env.AI.run('@cf/microsoft/phi-2', {
  prompt: 'What is quantum computing?'
});
```

## テキスト埋め込み（Embeddings）

ベクトル検索やセマンティック検索に使用するテキスト埋め込みを生成します。

```typescript
interface EmbeddingRequest {
  text: string | string[];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { text } = await request.json<EmbeddingRequest>();

    // BGE Base Embeddingsモデルを使用
    const embeddings = await env.AI.run(
      '@cf/baai/bge-base-en-v1.5',
      { text }
    );

    return Response.json({
      embeddings: embeddings.data,
      shape: embeddings.shape
    });
  }
};
```

### ベクトル類似度検索の実装

```typescript
// ベクトル間のコサイン類似度を計算
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { query, documents } = await request.json();

    // クエリの埋め込みを生成
    const queryEmbedding = await env.AI.run(
      '@cf/baai/bge-base-en-v1.5',
      { text: query }
    );

    // 各ドキュメントの埋め込みを生成
    const docEmbeddings = await env.AI.run(
      '@cf/baai/bge-base-en-v1.5',
      { text: documents }
    );

    // 類似度を計算してソート
    const similarities = docEmbeddings.data.map((docEmbed: number[], i: number) => ({
      document: documents[i],
      similarity: cosineSimilarity(queryEmbedding.data[0], docEmbed)
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);

    return Response.json({ results: similarities.slice(0, 5) });
  }
};
```

## 画像分類と物体検出

### 画像分類

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // multipart/form-dataから画像を取得
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const imageBuffer = await imageFile.arrayBuffer();

    // ResNet-50で画像分類
    const result = await env.AI.run(
      '@cf/microsoft/resnet-50',
      { image: [...new Uint8Array(imageBuffer)] }
    );

    return Response.json(result);
  }
};
```

### 物体検出

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const imageBuffer = await image.arrayBuffer();

    // DETR（Detection Transformer）で物体検出
    const detections = await env.AI.run(
      '@cf/facebook/detr-resnet-50',
      { image: [...new Uint8Array(imageBuffer)] }
    );

    return Response.json({
      objects: detections.map((det: any) => ({
        label: det.label,
        confidence: det.score,
        box: det.box
      }))
    });
  }
};
```

## 音声認識（Speech-to-Text）

Whisperモデルを使って音声をテキストに変換します。

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const audioBuffer = await audioFile.arrayBuffer();

    // Whisperで音声認識
    const transcription = await env.AI.run(
      '@cf/openai/whisper',
      { audio: [...new Uint8Array(audioBuffer)] }
    );

    return Response.json({
      text: transcription.text,
      language: transcription.language
    });
  }
};
```

## テキスト分類と感情分析

```typescript
interface ClassificationRequest {
  text: string;
  labels: string[];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { text, labels } = await request.json<ClassificationRequest>();

    // DistilBERTでゼロショット分類
    const classification = await env.AI.run(
      '@cf/huggingface/distilbert-sst-2-int8',
      { text }
    );

    return Response.json(classification);
  }
};
```

## 実践例: RAGチャットボット

Retrieval-Augmented Generation（RAG）を実装した高度なチャットボットの例です。

```typescript
import { Hono } from 'hono';

type Bindings = {
  AI: any;
  VECTORIZE: any; // Vectorize（ベクトルDB）
};

const app = new Hono<{ Bindings: Bindings }>();

// ドキュメントをインデックス化
app.post('/index', async (c) => {
  const { documents } = await c.req.json();

  // 各ドキュメントの埋め込みを生成
  const embeddings = await c.env.AI.run(
    '@cf/baai/bge-base-en-v1.5',
    { text: documents }
  );

  // Vectorizeに保存
  const vectors = embeddings.data.map((embedding: number[], i: number) => ({
    id: `doc-${i}`,
    values: embedding,
    metadata: { text: documents[i] }
  }));

  await c.env.VECTORIZE.upsert(vectors);

  return c.json({ indexed: documents.length });
});

// RAGチャット
app.post('/chat', async (c) => {
  const { message } = await c.req.json();

  // 1. クエリの埋め込みを生成
  const queryEmbedding = await c.env.AI.run(
    '@cf/baai/bge-base-en-v1.5',
    { text: message }
  );

  // 2. 関連ドキュメントを検索
  const results = await c.env.VECTORIZE.query(
    queryEmbedding.data[0],
    { topK: 3 }
  );

  // 3. コンテキストを作成
  const context = results.matches
    .map((m: any) => m.metadata.text)
    .join('\n\n');

  // 4. LLMで回答生成
  const response = await c.env.AI.run(
    '@cf/meta/llama-2-7b-chat-int8',
    {
      messages: [
        {
          role: 'system',
          content: `以下のコンテキストを使って質問に答えてください:\n\n${context}`
        },
        {
          role: 'user',
          content: message
        }
      ]
    }
  );

  return c.json({
    answer: response.response,
    sources: results.matches.map((m: any) => m.id)
  });
});

export default app;
```

## パフォーマンス最適化

### キャッシュ戦略

```typescript
import { Hono } from 'hono';
import { cache } from 'hono/cache';

const app = new Hono<{ Bindings: Bindings }>();

// 埋め込みをキャッシュ（1時間）
app.get(
  '/embed/:text',
  cache({
    cacheName: 'embeddings',
    cacheControl: 'max-age=3600',
  }),
  async (c) => {
    const text = c.req.param('text');
    const embedding = await c.env.AI.run(
      '@cf/baai/bge-base-en-v1.5',
      { text }
    );
    return c.json(embedding);
  }
);
```

### バッチ処理

複数のリクエストをまとめて処理することで効率を向上させます。

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { texts } = await request.json();

    // 一度に複数のテキストを処理
    const embeddings = await env.AI.run(
      '@cf/baai/bge-base-en-v1.5',
      { text: texts } // 配列で渡す
    );

    return Response.json({ embeddings: embeddings.data });
  }
};
```

## エラーハンドリングとリトライ

```typescript
async function runWithRetry(
  ai: any,
  model: string,
  input: any,
  maxRetries = 3
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.run(model, input);
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // 指数バックオフ
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const result = await runWithRetry(
        env.AI,
        '@cf/meta/llama-2-7b-chat-int8',
        { messages: [{ role: 'user', content: 'Hello' }] }
      );

      return Response.json(result);
    } catch (error) {
      return Response.json(
        { error: 'AI処理に失敗しました' },
        { status: 500 }
      );
    }
  }
};
```

## デプロイとモニタリング

### デプロイ

```bash
# 開発環境でテスト
wrangler dev

# 本番環境にデプロイ
wrangler deploy

# ログを確認
wrangler tail
```

### 使用量の監視

Cloudflareダッシュボードで以下を確認できます。

- AI推論の実行回数
- 平均レスポンス時間
- エラー率
- 使用したトークン数

## ベストプラクティス

### 1. 適切なモデル選択

- **速度重視**: Phi-2、DistilBERT
- **品質重視**: Llama 2、Mistral 7B
- **コード生成**: CodeLlama
- **多言語**: mBART、M2M100

### 2. コスト最適化

```typescript
// 短いプロンプトを使う
const shortPrompt = '要約: ' + text.slice(0, 500);

// 最大トークン数を制限
const response = await env.AI.run(model, {
  messages,
  max_tokens: 100 // 必要最小限に
});

// ストリーミングで早期終了
const stream = await env.AI.run(model, {
  messages,
  stream: true
});
```

### 3. セキュリティ

```typescript
// 入力検証
function sanitizeInput(text: string): string {
  // 最大長を制限
  if (text.length > 10000) {
    throw new Error('Input too long');
  }

  // 悪意のあるコンテンツをフィルタ
  const filtered = text.replace(/<script>/gi, '');
  return filtered;
}

// レート制限
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: env.REDIS,
  limiter: Ratelimit.slidingWindow(10, '1 m')
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return new Response('Too Many Requests', { status: 429 });
    }

    // AI処理を続行
  }
};
```

## まとめ

Cloudflare Workers AIは、エッジ環境で高性能なAI推論を実現する革新的なプラットフォームです。サーバーレスアーキテクチャにより、インフラ管理の負担なく、グローバルに展開されたAIアプリケーションを構築できます。

主な利点：

- **低レイテンシー**: ユーザーに近い場所で実行
- **自動スケーリング**: トラフィックに応じて自動拡張
- **コスト効率**: 使った分だけ課金
- **豊富なモデル**: 多様なAIタスクに対応

次のステップとして、実際のプロジェクトにWorkers AIを組み込み、エッジAIの力を体験してみてください。
