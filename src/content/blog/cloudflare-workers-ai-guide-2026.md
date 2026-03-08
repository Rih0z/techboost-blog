---
title: "Cloudflare Workers AI完全ガイド2026｜エッジでAI推論"
description: "Cloudflare Workers AIでエッジAI推論を実装する方法を解説。LLM・画像生成・テキスト埋め込みをサーバーレスで実行する手順をコード付きで紹介。モデル選択からRAG構築・本番デプロイまでGPU不要で始められる実践ガイドです。"
pubDate: "2026-03-05"
tags: ["Cloudflare", "AI", "サーバーレス", "エッジコンピューティング", "サーバー"]
heroImage: '../../assets/thumbnails/cloudflare-workers-ai-guide-2026.jpg'
---

エッジコンピューティングとAIの融合が加速している。Cloudflare Workers AIは、世界中に分散されたCloudflareのネットワーク上でAI推論を実行できるプラットフォームだ。GPUクラスタを自前で用意する必要がなく、APIキーの管理も不要で、Workerから直接AIモデルを呼び出せる。

本記事では、Workers AIの基本概念から実装パターン、料金体系、Vectorizeを組み合わせたRAG構築まで、実務で使えるレベルで徹底解説する。

---

## 1. Workers AIとは何か

### エッジAI推論の概要

Workers AIは、Cloudflareのエッジネットワーク上でAI/MLモデルの推論を実行するサービスだ。従来のAI APIサービス（OpenAI API、Google Cloud AI Platform等）とは根本的にアーキテクチャが異なる。

**従来のAI API:**
1. クライアント → あなたのサーバー → AI APIプロバイダー（中央集権的なGPUクラスタ）
2. ネットワークホップが多く、レイテンシが高い
3. APIキーの管理・漏洩リスク

**Workers AI:**
1. クライアント → 最寄りのCloudflareエッジ（GPU搭載ノード）で推論実行
2. Worker内から直接バインディング経由で呼び出し
3. APIキー不要、認証はCloudflareのアカウントに紐付く

```typescript
// Workers AI の基本的な呼び出し — APIキー不要
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "あなたは親切なアシスタントです。" },
        { role: "user", content: "TypeScriptの型ガードを簡潔に説明してください。" }
      ]
    });
    return Response.json(response);
  }
};
```

### Workers AIが解決する課題

| 課題 | 従来のアプローチ | Workers AIのアプローチ |
|------|-----------------|---------------------|
| GPUインフラ管理 | 自前でGPUサーバー構築 or クラウドGPUインスタンス | 不要（Cloudflare管理） |
| スケーリング | オートスケール設定が必要 | 自動（エッジで分散処理） |
| レイテンシ | 中央のGPUクラスタまでのRTT | 最寄りエッジで推論 |
| APIキー管理 | 環境変数・Secrets管理 | バインディングで不要 |
| コールドスタート | コンテナ起動時間 | V8 Isolate（0ms起動） |
| 課金体系 | GPU時間 or リクエスト単位 | ニューロン単位（後述） |

---

## 2. 対応モデル一覧と選択指針

### テキスト生成（LLM）

Workers AIは2026年3月時点で多数のオープンソースモデルをサポートしている。

| モデル | パラメータ数 | 用途 | 推奨シーン |
|--------|------------|------|-----------|
| `@cf/meta/llama-3.1-8b-instruct` | 8B | 汎用チャット・要約 | 一般的なテキスト生成 |
| `@cf/meta/llama-3.1-70b-instruct` | 70B | 高品質な推論・複雑なタスク | 精度重視の用途 |
| `@cf/meta/llama-3.2-3b-instruct` | 3B | 軽量・高速 | レイテンシ重視 |
| `@cf/mistral/mistral-7b-instruct-v0.2` | 7B | 多言語対応 | ヨーロッパ言語中心の用途 |
| `@cf/qwen/qwen1.5-14b-chat-awq` | 14B | 中国語・日本語対応 | アジア言語テキスト生成 |
| `@cf/deepseek/deepseek-r1-distill-qwen-32b` | 32B | 推論・数学 | 論理的思考が必要なタスク |
| `@cf/google/gemma-7b-it` | 7B | 軽量汎用 | コスト重視の汎用タスク |

### 画像生成

| モデル | 用途 |
|--------|------|
| `@cf/stabilityai/stable-diffusion-xl-base-1.0` | テキストから画像生成 |
| `@cf/bytedance/stable-diffusion-xl-lightning` | 高速画像生成（4ステップ） |
| `@cf/black-forest-labs/flux-1-schnell` | 高品質画像生成 |

### 音声処理

| モデル | 用途 |
|--------|------|
| `@cf/openai/whisper` | 音声からテキストへの変換（STT） |
| `@cf/openai/whisper-large-v3-turbo` | 高精度STT |

### テキスト埋め込み（Embedding）

| モデル | 次元数 | 用途 |
|--------|--------|------|
| `@cf/baai/bge-base-en-v1.5` | 768 | 英語テキスト埋め込み |
| `@cf/baai/bge-large-en-v1.5` | 1024 | 高精度英語埋め込み |
| `@cf/baai/bge-small-en-v1.5` | 384 | 軽量英語埋め込み |

### 画像分類・その他

| モデル | 用途 |
|--------|------|
| `@cf/microsoft/resnet-50` | 画像分類 |
| `@cf/facebook/bart-large-cnn` | テキスト要約 |
| `@cf/huggingface/distilbert-sst-2-int8` | 感情分析 |
| `@cf/meta/m2m100-1.2b` | 機械翻訳 |

### モデル選択の判断基準

```typescript
// モデル選択のデシジョンツリー
function selectModel(requirements: {
  task: "chat" | "code" | "embedding" | "image" | "speech";
  latencyBudget: "low" | "medium" | "high";
  qualityPriority: "speed" | "balanced" | "quality";
  language: "en" | "ja" | "multi";
}): string {
  const { task, latencyBudget, qualityPriority, language } = requirements;

  if (task === "chat") {
    if (qualityPriority === "quality") return "@cf/meta/llama-3.1-70b-instruct";
    if (latencyBudget === "low") return "@cf/meta/llama-3.2-3b-instruct";
    if (language === "ja") return "@cf/qwen/qwen1.5-14b-chat-awq";
    return "@cf/meta/llama-3.1-8b-instruct"; // デフォルト
  }

  if (task === "embedding") {
    if (qualityPriority === "quality") return "@cf/baai/bge-large-en-v1.5";
    if (qualityPriority === "speed") return "@cf/baai/bge-small-en-v1.5";
    return "@cf/baai/bge-base-en-v1.5";
  }

  if (task === "image") {
    if (qualityPriority === "quality") return "@cf/black-forest-labs/flux-1-schnell";
    return "@cf/bytedance/stable-diffusion-xl-lightning";
  }

  if (task === "speech") {
    if (qualityPriority === "quality") return "@cf/openai/whisper-large-v3-turbo";
    return "@cf/openai/whisper";
  }

  return "@cf/meta/llama-3.1-8b-instruct";
}
```

---

## 3. 料金体系を理解する

### ニューロン課金モデル

Workers AIは「ニューロン（Neurons）」という独自の課金単位を採用している。ニューロンはモデルの種類・入力サイズ・出力サイズに応じて消費される。

| プラン | ニューロン上限 | 料金 |
|--------|--------------|------|
| 無料枠（Free） | 10,000ニューロン/日 | $0 |
| Workers Paid | 無制限 | $0.011/1,000ニューロン |

### 各モデルのニューロン消費量（目安）

| モデルカテゴリ | 消費ニューロン/リクエスト（目安） |
|--------------|-------------------------------|
| LLM 8B（短い応答） | 約100〜300 |
| LLM 70B（短い応答） | 約500〜1,500 |
| 画像生成 SDXL | 約1,500〜3,000 |
| Whisper（10秒音声） | 約200〜500 |
| テキスト埋め込み | 約10〜50 |
| 画像分類 | 約50〜100 |

### 実際のコスト試算

```typescript
// コスト試算の例
const scenarios = {
  // シナリオ1: チャットボット（1日1,000リクエスト）
  chatbot: {
    model: "llama-3.1-8b-instruct",
    requestsPerDay: 1000,
    neuronsPerRequest: 200,
    dailyNeurons: 200_000,
    monthlyCost: (200_000 * 30 * 0.011) / 1000 // = $66/月
  },

  // シナリオ2: RAG検索（1日500クエリ）
  ragSearch: {
    embeddingNeurons: 30 * 500, // 埋め込み: 15,000/日
    llmNeurons: 250 * 500,     // LLM応答: 125,000/日
    dailyNeurons: 140_000,
    monthlyCost: (140_000 * 30 * 0.011) / 1000 // = $46.2/月
  },

  // シナリオ3: 画像生成API（1日50枚）
  imageGen: {
    model: "stable-diffusion-xl-lightning",
    requestsPerDay: 50,
    neuronsPerRequest: 2000,
    dailyNeurons: 100_000,
    monthlyCost: (100_000 * 30 * 0.011) / 1000 // = $33/月
  },

  // シナリオ4: 無料枠で収まる軽量用途
  freeTier: {
    model: "llama-3.2-3b-instruct",
    requestsPerDay: 50,
    neuronsPerRequest: 100,
    dailyNeurons: 5_000, // 10,000ニューロン/日以内
    monthlyCost: 0 // 無料！
  }
};
```

**無料枠の活用ポイント:**
- テキスト埋め込みは消費ニューロンが非常に少ないため、無料枠で大量に実行可能
- 小型モデル（3B）を使えば1日100リクエスト程度は無料枠で対応できる
- 開発・テストフェーズでは無料枠で十分

---

## 4. 環境構築とセットアップ

### Wranglerのインストールとプロジェクト作成

```bash
# Wrangler CLI のインストール
npm install -g wrangler

# Cloudflare にログイン
wrangler login

# Workers AI プロジェクトを作成
npm create cloudflare@latest -- my-ai-worker --type=hello-world --ts

cd my-ai-worker
```

### wrangler.toml の設定

```toml
# wrangler.toml
name = "my-ai-worker"
main = "src/index.ts"
compatibility_date = "2026-03-01"

# Workers AI バインディング（これだけでAIが使える）
[ai]
binding = "AI"

# 環境変数（オプション）
[vars]
ENVIRONMENT = "production"
DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct"
```

### TypeScript型定義

```typescript
// src/types.ts
export interface Env {
  AI: Ai;  // Workers AI バインディング
  ENVIRONMENT: string;
  DEFAULT_MODEL: string;
}

// Ai型はCloudflare Workers Typesに含まれる
// @cloudflare/workers-types パッケージで提供
```

```bash
# 型定義パッケージのインストール
npm install --save-dev @cloudflare/workers-types
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "types": ["@cloudflare/workers-types"],
    "strict": true
  }
}
```

---

## 5. テキスト生成（LLM）の実装

### 基本的なチャットAPI

```typescript
// src/index.ts
interface Env {
  AI: Ai;
}

interface ChatRequest {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      return handleChat(request, env);
    }

    return new Response("Not found", { status: 404 });
  }
};

async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = await request.json<ChatRequest>();

  const model = body.model || "@cf/meta/llama-3.1-8b-instruct";

  const response = await env.AI.run(model, {
    messages: body.messages,
    max_tokens: body.max_tokens || 1024,
    temperature: body.temperature || 0.7,
  });

  return Response.json({
    success: true,
    result: response,
    model,
    timestamp: new Date().toISOString(),
  });
}
```

### ストリーミングレスポンス

大規模なテキスト生成ではストリーミングが重要だ。Workers AIはServer-Sent Events（SSE）によるストリーミングをサポートしている。

```typescript
// src/streaming.ts
async function handleStreamingChat(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json<ChatRequest>();

  const stream = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: body.messages,
    max_tokens: body.max_tokens || 2048,
    stream: true, // ストリーミングを有効化
  });

  // ReadableStream をそのまま返す
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

**クライアント側の実装:**

```typescript
// フロントエンド側のストリーミング受信
async function streamChat(messages: ChatMessage[]) {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") break;

        try {
          const parsed = JSON.parse(data);
          if (parsed.response) {
            fullResponse += parsed.response;
            // UIを更新
            updateUI(fullResponse);
          }
        } catch {
          // パース失敗は無視（部分データの可能性）
        }
      }
    }
  }

  return fullResponse;
}
```

### システムプロンプトの設計パターン

```typescript
// src/prompts.ts

// パターン1: ドメイン特化アシスタント
const taxAccountingPrompt = {
  role: "system" as const,
  content: `あなたは日本の税務・会計の専門家アシスタントです。
以下のルールに従ってください：
- 税法に基づいた正確な回答をすること
- 不確実な場合は「税理士への相談を推奨します」と明記すること
- 最新の税制改正に触れる場合は年度を明記すること
- 回答は簡潔に、箇条書きを活用すること`
};

// パターン2: コード生成アシスタント
const codeAssistantPrompt = {
  role: "system" as const,
  content: `あなたはTypeScript/JavaScript専門のコーディングアシスタントです。
- コードは必ずTypeScriptで記述すること
- 型安全性を最優先すること
- エラーハンドリングを含めること
- コメントは日本語で記述すること`
};

// パターン3: 要約エンジン
const summarizerPrompt = {
  role: "system" as const,
  content: `与えられたテキストを以下の形式で要約してください：
1. 一行要約（30文字以内）
2. 主要ポイント（3〜5個の箇条書き）
3. キーワード（5個以内）
出力はJSON形式で返してください。`
};
```

---

## 6. 画像生成の実装

### テキストから画像を生成する

```typescript
// src/image-generation.ts
interface ImageRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
}

async function handleImageGeneration(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json<ImageRequest>();

  // Stable Diffusion XL Lightning（高速版）
  const result = await env.AI.run(
    "@cf/bytedance/stable-diffusion-xl-lightning",
    {
      prompt: body.prompt,
      negative_prompt: body.negativePrompt || "low quality, blurry, distorted",
      width: body.width || 1024,
      height: body.height || 1024,
      num_steps: body.steps || 4, // Lightning は 4 ステップで十分
    }
  );

  // 結果はUint8Arrayとして返される
  return new Response(result, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
```

### 画像生成APIの実装例（OGP画像自動生成）

```typescript
// src/ogp-generator.ts
async function generateOGPImage(
  env: Env,
  title: string,
  category: string
): Promise<Uint8Array> {
  // ブログ記事のOGP画像を自動生成
  const prompt = `
    Professional blog post header image,
    modern flat design,
    technology theme about "${category}",
    clean minimal style,
    gradient background with blue and purple,
    no text in image,
    high quality illustration
  `.trim();

  const image = await env.AI.run(
    "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    {
      prompt,
      negative_prompt: "text, words, letters, watermark, low quality",
      width: 1200,
      height: 630, // OGP推奨サイズ
      num_steps: 20,
      guidance: 7.5,
    }
  );

  return image as unknown as Uint8Array;
}

// R2に保存してキャッシュする
async function getOrGenerateOGP(
  env: Env & { OGP_BUCKET: R2Bucket },
  slug: string,
  title: string,
  category: string
): Promise<Response> {
  const key = `ogp/${slug}.png`;

  // R2キャッシュを確認
  const cached = await env.OGP_BUCKET.get(key);
  if (cached) {
    return new Response(cached.body, {
      headers: { "Content-Type": "image/png" },
    });
  }

  // 生成してR2に保存
  const image = await generateOGPImage(env, title, category);
  await env.OGP_BUCKET.put(key, image, {
    httpMetadata: { contentType: "image/png" },
  });

  return new Response(image, {
    headers: { "Content-Type": "image/png" },
  });
}
```

### Flux-1 Schnellによる高品質画像生成

```typescript
// FLUX.1 schnell — より高品質な画像生成
async function generateHighQualityImage(
  env: Env,
  prompt: string
): Promise<Response> {
  const result = await env.AI.run(
    "@cf/black-forest-labs/flux-1-schnell",
    {
      prompt,
      num_steps: 8, // Flux は 4-8 ステップで高品質
    }
  );

  return new Response(result, {
    headers: { "Content-Type": "image/png" },
  });
}
```

---

## 7. テキスト埋め込み（Embeddings）の実装

### 基本的な埋め込み生成

テキスト埋め込みは、テキストを数値ベクトルに変換する技術だ。意味的に近いテキストは近いベクトルになるため、セマンティック検索やRAGの基盤となる。

```typescript
// src/embeddings.ts
async function generateEmbeddings(
  env: Env,
  texts: string[]
): Promise<number[][]> {
  const result = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: texts,
  });

  // result.data は number[][] 形式
  return result.data;
}

// 使用例: 2つのテキストの類似度を計算
async function calculateSimilarity(
  env: Env,
  text1: string,
  text2: string
): Promise<number> {
  const embeddings = await generateEmbeddings(env, [text1, text2]);
  return cosineSimilarity(embeddings[0], embeddings[1]);
}

// コサイン類似度の計算
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### セマンティック検索の実装

```typescript
// src/semantic-search.ts
interface Document {
  id: string;
  title: string;
  content: string;
  embedding?: number[];
}

class SemanticSearch {
  constructor(
    private env: Env & { VECTOR_INDEX: VectorizeIndex }
  ) {}

  // ドキュメントをインデックスに追加
  async indexDocument(doc: Document): Promise<void> {
    const embeddings = await this.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: [doc.content],
    });

    await this.env.VECTOR_INDEX.upsert([
      {
        id: doc.id,
        values: embeddings.data[0],
        metadata: {
          title: doc.title,
          content: doc.content.slice(0, 500), // メタデータは制限あり
        },
      },
    ]);
  }

  // クエリでセマンティック検索
  async search(
    query: string,
    topK: number = 5
  ): Promise<VectorizeMatches> {
    const queryEmbedding = await this.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: [query],
    });

    const results = await this.env.VECTOR_INDEX.query(
      queryEmbedding.data[0],
      {
        topK,
        returnMetadata: "all",
      }
    );

    return results;
  }
}
```

---

## 8. 音声認識（Whisper）の実装

### 音声ファイルの文字起こし

```typescript
// src/speech-to-text.ts
async function transcribeAudio(
  request: Request,
  env: Env
): Promise<Response> {
  const contentType = request.headers.get("Content-Type") || "";

  if (!contentType.includes("audio/") && !contentType.includes("multipart/form-data")) {
    return new Response("Audio file required", { status: 400 });
  }

  let audioData: ArrayBuffer;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("audio") as File;
    if (!file) return new Response("No audio file", { status: 400 });
    audioData = await file.arrayBuffer();
  } else {
    audioData = await request.arrayBuffer();
  }

  const result = await env.AI.run("@cf/openai/whisper", {
    audio: [...new Uint8Array(audioData)],
  });

  return Response.json({
    success: true,
    text: result.text,
    // Whisperは言語も検出する
    language: result.word_count ? "detected" : "unknown",
    wordCount: result.word_count,
  });
}
```

### 音声文字起こし + 要約パイプライン

```typescript
// 音声 → テキスト → 要約 の一気通貫パイプライン
async function transcribeAndSummarize(
  audioData: ArrayBuffer,
  env: Env
): Promise<{
  transcript: string;
  summary: string;
  keyPoints: string[];
}> {
  // Step 1: 音声をテキストに変換
  const transcription = await env.AI.run("@cf/openai/whisper-large-v3-turbo", {
    audio: [...new Uint8Array(audioData)],
  });

  const transcript = transcription.text;

  // Step 2: テキストを要約
  const summary = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content: `以下の文字起こしテキストを要約してください。
JSON形式で返答してください: {"summary": "...", "keyPoints": ["...", "..."]}`
      },
      {
        role: "user",
        content: transcript,
      },
    ],
    max_tokens: 512,
  });

  try {
    const parsed = JSON.parse(summary.response);
    return {
      transcript,
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
    };
  } catch {
    return {
      transcript,
      summary: summary.response,
      keyPoints: [],
    };
  }
}
```

---

## 9. Vectorize + Workers AI で RAG を構築する

### RAGアーキテクチャ

RAG（Retrieval-Augmented Generation）は、外部知識をLLMの回答に統合する手法だ。Workers AI + Vectorizeの組み合わせにより、Cloudflareのエッジ上で完結するRAGシステムを構築できる。

```
ユーザークエリ
  ↓
[Workers AI: Embedding]  クエリをベクトル化
  ↓
[Vectorize]  類似ドキュメントを検索
  ↓
[Workers AI: LLM]  検索結果 + クエリ で回答生成
  ↓
レスポンス
```

### wrangler.toml の設定

```toml
# wrangler.toml
name = "rag-worker"
main = "src/index.ts"
compatibility_date = "2026-03-01"

[ai]
binding = "AI"

# Vectorize インデックスの設定
[[vectorize]]
binding = "VECTOR_INDEX"
index_name = "knowledge-base"
```

```bash
# Vectorize インデックスの作成
wrangler vectorize create knowledge-base \
  --dimensions=768 \
  --metric=cosine
```

### RAGシステムの完全実装

```typescript
// src/rag.ts
interface Env {
  AI: Ai;
  VECTOR_INDEX: VectorizeIndex;
  KNOWLEDGE_DB: D1Database; // ドキュメント全文保存用
}

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  updatedAt: string;
}

// ドキュメントのインデックス登録
async function indexDocuments(
  env: Env,
  documents: KnowledgeDocument[]
): Promise<void> {
  // バッチで埋め込みを生成（最大100件ずつ）
  const batchSize = 100;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const texts = batch.map((doc) => doc.content);

    // 埋め込み生成
    const embeddings = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: texts,
    });

    // Vectorize にアップサート
    const vectors = batch.map((doc, idx) => ({
      id: doc.id,
      values: embeddings.data[idx],
      metadata: {
        title: doc.title,
        source: doc.source,
      },
    }));

    await env.VECTOR_INDEX.upsert(vectors);

    // D1に全文を保存
    const stmt = env.KNOWLEDGE_DB.prepare(
      "INSERT OR REPLACE INTO documents (id, title, content, source, updated_at) VALUES (?, ?, ?, ?, ?)"
    );

    const d1Batch = batch.map((doc) =>
      stmt.bind(doc.id, doc.title, doc.content, doc.source, doc.updatedAt)
    );

    await env.KNOWLEDGE_DB.batch(d1Batch);
  }
}

// RAG クエリの実行
async function ragQuery(
  env: Env,
  query: string,
  options: {
    topK?: number;
    maxTokens?: number;
    model?: string;
  } = {}
): Promise<{
  answer: string;
  sources: Array<{ title: string; source: string; relevance: number }>;
}> {
  const { topK = 5, maxTokens = 1024, model = "@cf/meta/llama-3.1-8b-instruct" } = options;

  // Step 1: クエリを埋め込みベクトルに変換
  const queryEmbedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: [query],
  });

  // Step 2: Vectorize で類似ドキュメントを検索
  const vectorResults = await env.VECTOR_INDEX.query(
    queryEmbedding.data[0],
    {
      topK,
      returnMetadata: "all",
    }
  );

  if (vectorResults.matches.length === 0) {
    return {
      answer: "関連する情報が見つかりませんでした。",
      sources: [],
    };
  }

  // Step 3: D1 から全文を取得
  const ids = vectorResults.matches.map((m) => m.id);
  const placeholders = ids.map(() => "?").join(",");
  const fullDocs = await env.KNOWLEDGE_DB.prepare(
    `SELECT id, title, content, source FROM documents WHERE id IN (${placeholders})`
  )
    .bind(...ids)
    .all<KnowledgeDocument>();

  // Step 4: コンテキストを構築
  const context = fullDocs.results
    .map((doc, i) => `【出典${i + 1}: ${doc.title}】\n${doc.content}`)
    .join("\n\n---\n\n");

  // Step 5: LLM に回答を生成させる
  const llmResponse = await env.AI.run(model, {
    messages: [
      {
        role: "system",
        content: `あなたは正確で親切なアシスタントです。
以下の参考資料に基づいて質問に回答してください。
回答は参考資料の内容に基づいてください。
参考資料に含まれない情報については「この質問に関する情報は参考資料に含まれていません」と回答してください。
回答の最後に参照した出典番号を記載してください。

【参考資料】
${context}`,
      },
      {
        role: "user",
        content: query,
      },
    ],
    max_tokens: maxTokens,
  });

  // ソース情報を構築
  const sources = vectorResults.matches.map((match) => ({
    title: (match.metadata?.title as string) || "Unknown",
    source: (match.metadata?.source as string) || "Unknown",
    relevance: match.score,
  }));

  return {
    answer: llmResponse.response,
    sources,
  };
}
```

### D1スキーマの初期化

```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at);
```

```bash
# D1 データベースの作成とスキーマ適用
wrangler d1 create knowledge-db
wrangler d1 execute knowledge-db --file=schema.sql
```

---

## 10. 実践的なユースケース

### ユースケース1: 多言語カスタマーサポートBot

```typescript
// src/support-bot.ts
interface SupportRequest {
  message: string;
  language?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

async function handleSupportRequest(
  request: Request,
  env: Env & { VECTOR_INDEX: VectorizeIndex; FAQ_DB: D1Database }
): Promise<Response> {
  const body = await request.json<SupportRequest>();

  // Step 1: FAQ検索（RAG）
  const queryEmbedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: [body.message],
  });

  const faqResults = await env.VECTOR_INDEX.query(queryEmbedding.data[0], {
    topK: 3,
    returnMetadata: "all",
  });

  const faqContext = faqResults.matches
    .filter((m) => m.score > 0.7) // 類似度 0.7 以上のみ使用
    .map((m) => m.metadata?.content || "")
    .join("\n\n");

  // Step 2: LLM で回答生成
  const messages = [
    {
      role: "system" as const,
      content: `あなたはカスタマーサポートアシスタントです。
丁寧で分かりやすい日本語で回答してください。
以下のFAQデータベースの情報を参考にしてください。FAQに該当する内容がない場合は、
「担当者にお繋ぎしますので、少々お待ちください」と回答してください。

【FAQ情報】
${faqContext || "該当するFAQが見つかりませんでした。"}`,
    },
    // 会話履歴を含める
    ...(body.conversationHistory || []).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    {
      role: "user" as const,
      content: body.message,
    },
  ];

  const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages,
    max_tokens: 512,
    temperature: 0.3, // サポートは正確性重視で低温度
  });

  return Response.json({
    reply: response.response,
    faqMatched: faqResults.matches.filter((m) => m.score > 0.7).length > 0,
  });
}
```

### ユースケース2: コンテンツモデレーション

```typescript
// src/moderation.ts
interface ModerationResult {
  safe: boolean;
  categories: {
    hate: boolean;
    violence: boolean;
    sexual: boolean;
    spam: boolean;
  };
  reasoning: string;
}

async function moderateContent(
  env: Env,
  content: string
): Promise<ModerationResult> {
  const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content: `コンテンツモデレーターとして、以下のテキストを分析してください。
必ず以下のJSON形式で回答してください：
{
  "safe": true/false,
  "categories": {
    "hate": true/false,
    "violence": true/false,
    "sexual": true/false,
    "spam": true/false
  },
  "reasoning": "判定理由"
}`,
      },
      {
        role: "user",
        content,
      },
    ],
    max_tokens: 256,
    temperature: 0.1, // 判定は一貫性重視
  });

  try {
    return JSON.parse(response.response);
  } catch {
    return {
      safe: false,
      categories: { hate: false, violence: false, sexual: false, spam: false },
      reasoning: "解析エラー: 安全側に判定",
    };
  }
}
```

### ユースケース3: リアルタイム翻訳API

```typescript
// src/translation.ts
async function translateText(
  env: Env,
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  // m2m100 モデルで翻訳
  const result = await env.AI.run("@cf/meta/m2m100-1.2b", {
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
  });

  return result.translated_text;
}

// APIエンドポイント
async function handleTranslation(
  request: Request,
  env: Env
): Promise<Response> {
  const { text, from, to } = await request.json<{
    text: string;
    from: string;
    to: string;
  }>();

  const translated = await translateText(env, text, from, to);

  return Response.json({
    original: text,
    translated,
    from,
    to,
  });
}
```

---

## 11. エラーハンドリングとリトライ

### 堅牢なAI呼び出しラッパー

```typescript
// src/ai-client.ts
interface AICallOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

class WorkersAIClient {
  constructor(private ai: Ai) {}

  async runWithRetry<T>(
    model: string,
    inputs: Record<string, unknown>,
    options: AICallOptions = {}
  ): Promise<T> {
    const { maxRetries = 3, retryDelay = 1000, timeout = 30000 } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const result = await this.ai.run(model, inputs);

        clearTimeout(timeoutId);
        return result as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // レート制限エラーの場合は待機時間を長くする
        if (lastError.message.includes("rate limit")) {
          await this.sleep(retryDelay * Math.pow(2, attempt));
          continue;
        }

        // モデルが利用不可の場合はリトライしない
        if (lastError.message.includes("model not available")) {
          throw new AIModelError(model, lastError.message);
        }

        // その他のエラーは指数バックオフでリトライ
        if (attempt < maxRetries - 1) {
          await this.sleep(retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw new AIRetryExhaustedError(model, maxRetries, lastError);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class AIModelError extends Error {
  constructor(model: string, reason: string) {
    super(`Model ${model} error: ${reason}`);
    this.name = "AIModelError";
  }
}

class AIRetryExhaustedError extends Error {
  constructor(model: string, attempts: number, lastError: Error | null) {
    super(
      `AI call to ${model} failed after ${attempts} attempts. Last error: ${lastError?.message}`
    );
    this.name = "AIRetryExhaustedError";
  }
}
```

### レスポンスバリデーション

```typescript
// src/validation.ts
import { z } from "zod";

// JSON出力が期待される場合のバリデーション
async function runWithStructuredOutput<T>(
  env: Env,
  model: string,
  messages: Array<{ role: string; content: string }>,
  schema: z.ZodType<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await env.AI.run(model, { messages, max_tokens: 1024 });

    const text = response.response;

    // JSONを抽出（コードブロックで囲まれている場合にも対応）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        const validated = schema.parse(parsed);
        return validated;
      } catch (parseError) {
        // バリデーション失敗時はプロンプトを修正してリトライ
        messages.push(
          { role: "assistant", content: text },
          {
            role: "user",
            content: `出力のJSON形式が正しくありません。以下のスキーマに従って再度出力してください: ${JSON.stringify(schema)}`,
          }
        );
        continue;
      }
    }
  }

  throw new Error("Failed to get structured output after retries");
}
```

---

## 12. パフォーマンス最適化

### レスポンスキャッシュ戦略

```typescript
// src/cache.ts
interface CachedAIResponse {
  result: unknown;
  cachedAt: number;
  model: string;
}

async function cachedAICall(
  env: Env & { AI_CACHE: KVNamespace },
  model: string,
  inputs: Record<string, unknown>,
  ttlSeconds: number = 3600
): Promise<unknown> {
  // キャッシュキーの生成
  const cacheKey = `ai:${model}:${await hashInputs(inputs)}`;

  // KVキャッシュを確認
  const cached = await env.AI_CACHE.get<CachedAIResponse>(cacheKey, "json");
  if (cached) {
    return cached.result;
  }

  // AIを呼び出し
  const result = await env.AI.run(model, inputs);

  // 結果をキャッシュ
  await env.AI_CACHE.put(
    cacheKey,
    JSON.stringify({
      result,
      cachedAt: Date.now(),
      model,
    }),
    { expirationTtl: ttlSeconds }
  );

  return result;
}

async function hashInputs(inputs: Record<string, unknown>): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(inputs));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

### バッチ処理の最適化

```typescript
// src/batch.ts
// 大量のテキストを効率的に埋め込む
async function batchEmbed(
  env: Env,
  texts: string[],
  batchSize: number = 50
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  // バッチに分割して処理
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const result = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: batch,
    });

    allEmbeddings.push(...result.data);
  }

  return allEmbeddings;
}

// 並行処理でスループットを向上
async function parallelAICalls<T>(
  env: Env,
  tasks: Array<{ model: string; inputs: Record<string, unknown> }>,
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((task) => env.AI.run(task.model, task.inputs))
    );
    results.push(...(batchResults as T[]));
  }

  return results;
}
```

---

## 13. テストとローカル開発

### Wrangler での ローカルテスト

```bash
# ローカル開発サーバーの起動
wrangler dev

# Workers AI は --remote フラグが必要（ローカルGPUは使えない）
wrangler dev --remote

# 特定のポートで起動
wrangler dev --remote --port 8787
```

### Vitest によるユニットテスト

```typescript
// test/ai-handler.test.ts
import { describe, it, expect, vi } from "vitest";
import { unstable_dev } from "wrangler";

describe("Workers AI Handler", () => {
  // Miniflareを使ったE2Eテスト
  it("should return chat response", async () => {
    const worker = await unstable_dev("src/index.ts", {
      experimental: { disableExperimentalWarning: true },
    });

    const response = await worker.fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Hello" },
        ],
      }),
    });

    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.result).toBeDefined();

    await worker.stop();
  });

  // モック を使った単体テスト
  it("should handle AI errors gracefully", async () => {
    const mockAI = {
      run: vi.fn().mockRejectedValue(new Error("Model unavailable")),
    };

    const env = { AI: mockAI } as unknown as Env;

    // エラーハンドリングのテスト
    const client = new WorkersAIClient(env.AI);

    await expect(
      client.runWithRetry("@cf/meta/llama-3.1-8b-instruct", {
        messages: [{ role: "user", content: "test" }],
      }, { maxRetries: 1 })
    ).rejects.toThrow();
  });
});
```

### デプロイ

```bash
# プロダクション環境にデプロイ
wrangler deploy

# ステージング環境にデプロイ
wrangler deploy --env staging

# デプロイ後のログ確認
wrangler tail
```

---

## 14. 他のエッジAIサービスとの比較

### Workers AI vs 主要AIサービス

| 項目 | Workers AI | Vercel AI SDK | AWS Bedrock | Google Vertex AI |
|------|-----------|---------------|-------------|-----------------|
| **実行場所** | エッジ（330+拠点） | サーバーレス（リージョン） | リージョン | リージョン |
| **コールドスタート** | 0ms（V8 Isolate） | 数百ms | 数秒 | 数秒 |
| **モデル** | オープンソース中心 | OpenAI/Anthropic等 | Claude/Titan等 | Gemini/PaLM等 |
| **無料枠** | 10K ニューロン/日 | なし（API課金） | なし | $300クレジット |
| **課金体系** | ニューロン | トークン | トークン | トークン |
| **GPUインフラ管理** | 不要 | 不要 | 不要 | 不要 |
| **カスタムモデル** | 非対応 | 非対応 | ファインチューニング可 | ファインチューニング可 |
| **ベクトルDB統合** | Vectorize（ネイティブ） | 外部連携 | OpenSearch | Matching Engine |
| **レイテンシ（日本）** | 低（東京エッジあり） | 中（US East中心） | 低（東京リージョン） | 中 |

### Workers AIが適しているケース

- **グローバル展開するアプリ**: エッジで推論するため地理的なレイテンシ差が小さい
- **コスト重視のプロトタイプ**: 無料枠で開発・テストができる
- **既存のCloudflareスタック**: Workers/Pages/D1/R2を既に使っている場合
- **オープンソースモデルで十分なタスク**: 要約・分類・埋め込み・翻訳など
- **サーバーレスで完結させたい**: インフラ管理をゼロにしたい

### Workers AIが不向きなケース

- **最高精度が必要**: GPT-4o/Claude Opusレベルの品質が必要な場合
- **カスタムモデルの使用**: ファインチューニングしたモデルを使いたい場合
- **大規模バッチ処理**: 数万件以上のバッチ推論は専用GPUインスタンスが効率的
- **マルチモーダル（高度）**: 動画解析など高度なマルチモーダルタスク

---

## 15. セキュリティとベストプラクティス

### 入力バリデーション

```typescript
// src/middleware.ts
function validateChatInput(body: unknown): ChatRequest {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }

  const { messages, model, max_tokens, temperature } = body as Record<string, unknown>;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ValidationError("messages must be a non-empty array");
  }

  // メッセージの長さ制限（プロンプトインジェクション緩和）
  for (const msg of messages) {
    if (typeof msg.content !== "string") {
      throw new ValidationError("message content must be a string");
    }
    if (msg.content.length > 10000) {
      throw new ValidationError("message content exceeds maximum length (10000 chars)");
    }
  }

  // トークン数の制限
  const validatedMaxTokens = Math.min(Number(max_tokens) || 1024, 4096);

  // 温度の範囲チェック
  const validatedTemp = Math.max(0, Math.min(2, Number(temperature) || 0.7));

  return {
    messages: messages as ChatRequest["messages"],
    model: typeof model === "string" ? model : undefined,
    max_tokens: validatedMaxTokens,
    temperature: validatedTemp,
  };
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
```

### レート制限の実装

```typescript
// src/rate-limit.ts
async function checkRateLimit(
  env: Env & { RATE_LIMIT: KVNamespace },
  clientIP: string,
  limit: number = 100, // 1分あたりのリクエスト数
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${clientIP}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  // KVから現在のカウントを取得
  const current = await env.RATE_LIMIT.get<{
    count: number;
    windowStart: number;
  }>(key, "json");

  if (!current || current.windowStart < windowStart) {
    // 新しいウィンドウ開始
    await env.RATE_LIMIT.put(
      key,
      JSON.stringify({ count: 1, windowStart: now }),
      { expirationTtl: windowSeconds * 2 }
    );
    return { allowed: true, remaining: limit - 1, resetAt: now + windowSeconds };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.windowStart + windowSeconds,
    };
  }

  // カウントをインクリメント
  await env.RATE_LIMIT.put(
    key,
    JSON.stringify({ count: current.count + 1, windowStart: current.windowStart }),
    { expirationTtl: windowSeconds * 2 }
  );

  return {
    allowed: true,
    remaining: limit - current.count - 1,
    resetAt: current.windowStart + windowSeconds,
  };
}
```

### プロンプトインジェクション対策

```typescript
// src/security.ts
function sanitizeUserInput(input: string): string {
  // 基本的なサニタイゼーション
  let sanitized = input;

  // システムプロンプトの上書きを試みるパターンを検出
  const suspiciousPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+/i,
    /system\s*:\s*/i,
    /\[INST\]/i,
    /<\|im_start\|>/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      console.warn(`Suspicious input detected: ${pattern.source}`);
      // 完全にブロックするか、パターンを無害化する
      sanitized = sanitized.replace(pattern, "[filtered]");
    }
  }

  return sanitized;
}

// 出力のフィルタリング
function filterSensitiveOutput(output: string): string {
  // APIキー、メールアドレス、電話番号などのパターンをマスク
  return output
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
    .replace(/\b\d{3}[-.]?\d{4}[-.]?\d{4}\b/g, "[phone]")
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "[api-key]");
}
```

---

## 16. 本番運用のモニタリング

### ログ収集とメトリクス

```typescript
// src/observability.ts
interface AIMetrics {
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  success: boolean;
  errorType?: string;
  timestamp: string;
}

async function withMetrics<T>(
  env: Env & { METRICS: AnalyticsEngineDataset },
  model: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = true;
  let errorType: string | undefined;

  try {
    const result = await fn();
    return result;
  } catch (error) {
    success = false;
    errorType = error instanceof Error ? error.name : "Unknown";
    throw error;
  } finally {
    const latencyMs = Date.now() - startTime;

    // Analytics Engine にメトリクスを送信
    env.METRICS.writeDataPoint({
      blobs: [model, errorType || "none"],
      doubles: [latencyMs, success ? 1 : 0],
      indexes: [model],
    });

    // コンソールログ（wrangler tail で確認可能）
    console.log(
      JSON.stringify({
        type: "ai_call",
        model,
        latencyMs,
        success,
        errorType,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

// 使用例
async function monitoredChat(request: Request, env: Env & { METRICS: AnalyticsEngineDataset }) {
  return withMetrics(env, "@cf/meta/llama-3.1-8b-instruct", async () => {
    const body = await request.json<ChatRequest>();
    return env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: body.messages,
    });
  });
}
```

---

## 17. 完全な実装例: AI搭載ブログ検索API

以下は、Workers AI + Vectorize + D1 を組み合わせた実践的なブログ検索APIの完全実装だ。

```typescript
// src/index.ts — 完全版
interface Env {
  AI: Ai;
  VECTOR_INDEX: VectorizeIndex;
  DB: D1Database;
  CACHE: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS ヘッダー
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response: Response;

      switch (url.pathname) {
        case "/api/search":
          response = await handleSearch(request, env);
          break;
        case "/api/index":
          response = await handleIndex(request, env);
          break;
        case "/api/chat":
          response = await handleRAGChat(request, env);
          break;
        case "/api/suggest":
          response = await handleSuggestions(request, env);
          break;
        default:
          response = new Response("Not found", { status: 404 });
      }

      // CORSヘッダーを追加
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (error) {
      console.error("Unhandled error:", error);
      return Response.json(
        { error: "Internal server error" },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};

// セマンティック検索
async function handleSearch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 50);

  if (!query) {
    return Response.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  // クエリの埋め込みを生成
  const embedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: [query],
  });

  // Vectorizeで類似検索
  const results = await env.VECTOR_INDEX.query(embedding.data[0], {
    topK: limit,
    returnMetadata: "all",
  });

  // D1から記事詳細を取得
  const ids = results.matches.map((m) => m.id);
  if (ids.length === 0) {
    return Response.json({ results: [], query });
  }

  const placeholders = ids.map(() => "?").join(",");
  const articles = await env.DB.prepare(
    `SELECT id, title, slug, summary, tags, published_at
     FROM articles WHERE id IN (${placeholders})`
  )
    .bind(...ids)
    .all();

  // スコアとマージ
  const enrichedResults = results.matches.map((match) => {
    const article = articles.results.find((a: any) => a.id === match.id);
    return {
      id: match.id,
      score: match.score,
      title: article?.title || match.metadata?.title,
      slug: article?.slug,
      summary: article?.summary,
      tags: article?.tags,
    };
  });

  return Response.json({
    results: enrichedResults,
    query,
    totalMatches: results.count,
  });
}

// RAG チャット
async function handleRAGChat(request: Request, env: Env): Promise<Response> {
  const { question } = await request.json<{ question: string }>();

  // 関連記事を検索
  const embedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: [question],
  });

  const relevant = await env.VECTOR_INDEX.query(embedding.data[0], {
    topK: 3,
    returnMetadata: "all",
  });

  const context = relevant.matches
    .map((m) => `タイトル: ${m.metadata?.title}\n内容: ${m.metadata?.content}`)
    .join("\n\n---\n\n");

  // LLM で回答生成
  const answer = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content: `あなたはテクニカルブログのアシスタントです。以下のブログ記事の内容に基づいて質問に回答してください。

${context}`,
      },
      { role: "user", content: question },
    ],
    max_tokens: 1024,
  });

  return Response.json({
    answer: answer.response,
    sources: relevant.matches.map((m) => ({
      title: m.metadata?.title,
      score: m.score,
    })),
  });
}

// 関連記事のサジェスト
async function handleSuggestions(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const articleId = url.searchParams.get("article_id");

  if (!articleId) {
    return Response.json({ error: "article_id is required" }, { status: 400 });
  }

  // 記事の埋め込みを取得
  const article = await env.DB.prepare(
    "SELECT content FROM articles WHERE id = ?"
  )
    .bind(articleId)
    .first<{ content: string }>();

  if (!article) {
    return Response.json({ error: "Article not found" }, { status: 404 });
  }

  const embedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: [article.content],
  });

  // 自分自身を除外して類似記事を検索
  const similar = await env.VECTOR_INDEX.query(embedding.data[0], {
    topK: 6, // 自分を含むため多めに取得
    returnMetadata: "all",
  });

  const suggestions = similar.matches
    .filter((m) => m.id !== articleId)
    .slice(0, 5);

  return Response.json({ suggestions });
}

// 記事のインデックス登録
async function handleIndex(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { articles } = await request.json<{
    articles: Array<{
      id: string;
      title: string;
      content: string;
      slug: string;
      summary: string;
      tags: string;
    }>;
  }>();

  // 埋め込みを生成
  const texts = articles.map((a) => `${a.title}\n${a.content}`);
  const embeddings = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: texts,
  });

  // Vectorize にアップサート
  const vectors = articles.map((article, i) => ({
    id: article.id,
    values: embeddings.data[i],
    metadata: {
      title: article.title,
      content: article.content.slice(0, 1000),
    },
  }));

  await env.VECTOR_INDEX.upsert(vectors);

  // D1 にも保存
  const stmt = env.DB.prepare(
    "INSERT OR REPLACE INTO articles (id, title, slug, summary, tags, content) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const batch = articles.map((a) =>
    stmt.bind(a.id, a.title, a.slug, a.summary, a.tags, a.content)
  );
  await env.DB.batch(batch);

  return Response.json({ indexed: articles.length });
}
```

### 対応する wrangler.toml

```toml
name = "blog-ai-search"
main = "src/index.ts"
compatibility_date = "2026-03-01"

[ai]
binding = "AI"

[[vectorize]]
binding = "VECTOR_INDEX"
index_name = "blog-articles"

[[d1_databases]]
binding = "DB"
database_name = "blog-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## 18. まとめ

Workers AIは、エッジコンピューティング上でAI推論を実行するための強力なプラットフォームだ。主要なポイントを整理する。

**Workers AIの強み:**
- **ゼロインフラ管理**: GPUサーバーの構築・運用が一切不要
- **グローバル低レイテンシ**: 世界330+拠点のエッジで推論を実行
- **シンプルなAPI**: `env.AI.run()`だけでAI推論が可能
- **無料枠の存在**: 10,000ニューロン/日で開発・テストが無料
- **Cloudflareエコシステムとの統合**: Vectorize/D1/KV/R2とシームレスに連携

**選定基準:**
- オープンソースモデルで十分なタスクにはWorkers AIが最適
- GPT-4oやClaude Opusレベルの精度が必要な場合は外部APIと併用
- 既にCloudflare Workersを使っているなら導入コストは極めて低い

2026年現在、エッジAIはまだ発展途上だが、Workers AIはその中でも最も実用的なプラットフォームの一つだ。特にRAG（Vectorize連携）とストリーミングレスポンスの組み合わせは、ユーザー体験の良いAIアプリケーションを低コストで実現できる。

---

## 関連記事

- [Cloudflare Pages + D1 + KV完全ガイド](/blog/cloudflare-pages-d1-kv-guide)
- [Cloudflare Workers完全ガイド](/blog/cloudflare-workers-fullstack)
- [エッジコンピューティング入門](/blog/edge-computing-cloudflare-workers)
- [AI Agent開発ガイド2026](/blog/ai-agent-development-2026)
- [RAG開発ガイド](/blog/ai-rag-development-guide)
