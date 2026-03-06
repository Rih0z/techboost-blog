---
title: 'Gemini 2.0 API完全ガイド｜マルチモーダルAI・Function Calling・Context Caching実践解説'
description: 'Google Gemini 2.0 APIの使い方を徹底解説。マルチモーダル入力、Function Calling、Context Caching、Grounding、Structured Output等の新機能を実践コードとともにガイド。GPT-4oとの比較も。'
pubDate: '2026-03-05'
tags: ['Gemini', 'API', 'マルチモーダル', 'LLM', 'TypeScript']
---

GPT-4oを使っていたプロジェクトをGemini 2.0に移行したところ、Context CachingだけでAPI費用が60%削減できました。200ページ超のPDFマニュアルを毎回プロンプトに含めていた社内Q&Aボットで、キャッシュヒット率が90%を超えた結果です。

Gemini 2.0は「安いGPT-4o代替」ではありません。100万トークンのコンテキストウィンドウ、ネイティブのマルチモーダル理解、Google Search連携によるGrounding、そしてContext Cachingによるコスト最適化など、Gemini固有のアーキテクチャ優位性があります。

この記事では、Gemini 2.0 APIの主要機能をTypeScriptの実践コードとともに解説します。セットアップから本番運用のハマりポイントまで、実務で必要な知識を網羅します。

---

## セットアップ

### パッケージのインストール

```bash
npm install @google/generative-ai
```

### APIキーの取得

1. [Google AI Studio](https://aistudio.google.com) にアクセス
2. 左メニューの「Get API key」をクリック
3. 「Create API key」で新規キーを発行
4. `.env` に保存

```bash
# .env
GEMINI_API_KEY=AIzaSy...your-key-here
```

**注意**: Google AI Studioの無料枠は1分あたり15リクエスト、1日1,500リクエスト。本番運用にはGoogle Cloud Vertex AI経由での利用を推奨します（課金設定が必要ですが、レート制限が大幅に緩和されます）。

### 基本的なクライアント初期化

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Gemini 2.0 Flash — コスト効率と速度のバランスが最も良いモデル
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
```

Gemini 2.0のモデルラインナップは以下の通りです。

| モデル | 用途 | コンテキスト | 特徴 |
|--------|------|-------------|------|
| `gemini-2.0-flash` | 汎用・本番 | 1M tokens | 高速・低コスト・マルチモーダル |
| `gemini-2.0-pro` | 高精度タスク | 1M tokens | 最高精度・複雑な推論 |
| `gemini-2.0-flash-lite` | 大量処理 | 1M tokens | 最低コスト・高スループット |

---

## テキスト生成とストリーミング

### 基本的なテキスト生成

```typescript
async function generateText(prompt: string): Promise<string> {
  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

const answer = await generateText(
  'TypeScriptの型推論が失敗するパターンを3つ、コード例付きで説明してください'
);
console.log(answer);
```

### ストリーミング出力

チャットUIやリアルタイム表示では、ストリーミングが必須です。Gemini 2.0 Flashはストリーミング時のTTFT（Time to First Token）が平均200ms以下で、体感速度が非常に良好です。

```typescript
async function generateWithStream(prompt: string): Promise<void> {
  const result = await model.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    process.stdout.write(text);
  }

  // ストリーム完了後に全体のレスポンスメタデータを取得
  const aggregated = await result.response;
  console.log('\n--- Usage ---');
  console.log('Prompt tokens:', aggregated.usageMetadata?.promptTokenCount);
  console.log('Output tokens:', aggregated.usageMetadata?.candidatesTokenCount);
}

await generateWithStream('Rustの所有権システムをTypeScript開発者向けに説明してください');
```

### System Instructionの設定

モデルの振る舞いをグローバルに制御するにはSystem Instructionを使います。

```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction: `あなたはシニアTypeScriptエンジニアです。
回答は以下のルールに従ってください:
- コード例は必ずTypeScriptで記述
- 型安全性を最優先に考慮
- パフォーマンスへの影響がある場合は必ず言及
- 非推奨のAPIは使わない`,
});
```

---

## マルチモーダル入力

Gemini 2.0の最大の強みは、テキスト・画像・PDF・動画・音声をネイティブに理解できることです。外部のOCRやTranscription APIを挟む必要がありません。

### 画像 + テキスト

```typescript
import * as fs from 'fs';

async function analyzeImage(imagePath: string, question: string): Promise<string> {
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    },
    { text: question },
  ]);

  return result.response.text();
}

// UIスクリーンショットからコンポーネント構造を分析
const analysis = await analyzeImage(
  './screenshots/dashboard.png',
  'このダッシュボードUIのコンポーネント分割を提案してください。React + Tailwindでの実装を想定しています。'
);
console.log(analysis);
```

### PDF分析

技術ドキュメントやAPI仕様書のPDF分析は、Gemini 2.0の実用性が最も高い分野の一つです。

```typescript
async function analyzePDF(pdfPath: string, question: string): Promise<string> {
  const pdfData = fs.readFileSync(pdfPath);
  const base64PDF = pdfData.toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: base64PDF,
      },
    },
    {
      text: question,
    },
  ]);

  return result.response.text();
}

// API仕様書から型定義を自動生成
const types = await analyzePDF(
  './docs/api-spec-v3.pdf',
  `このAPI仕様書からTypeScriptの型定義を生成してください。
以下の要件を満たすこと:
- Zodスキーマも併記
- オプショナルフィールドは明示的にマーク
- 日付型はISO 8601文字列として扱う`
);
```

### 動画の理解

動画ファイルを直接渡して内容を分析できます。デモ動画からの操作手順抽出やバグ再現ステップの文書化に実用的です。

```typescript
async function analyzeVideo(videoPath: string, question: string): Promise<string> {
  const videoData = fs.readFileSync(videoPath);
  const base64Video = videoData.toString('base64');

  // 動画のMIMEタイプを判定
  const mimeType = videoPath.endsWith('.mp4') ? 'video/mp4' : 'video/webm';

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64Video,
      },
    },
    { text: question },
  ]);

  return result.response.text();
}

const steps = await analyzeVideo(
  './recordings/bug-reproduction.mp4',
  'この画面録画からバグの再現手順を箇条書きで抽出してください。各ステップにはUI要素名を含めてください。'
);
```

**制限事項**: インラインデータのサイズ上限は20MBです。それを超える場合はFile APIを使ってアップロードします。

```typescript
const fileManager = genAI.getFileManager();

// 大きなファイルをアップロード
const uploadResult = await fileManager.uploadFile('./large-video.mp4', {
  mimeType: 'video/mp4',
  displayName: 'Bug reproduction video',
});

// アップロードしたファイルを参照して生成
const result = await model.generateContent([
  {
    fileData: {
      mimeType: uploadResult.file.mimeType,
      fileUri: uploadResult.file.uri,
    },
  },
  { text: 'この動画の内容を要約してください' },
]);
```

---

## Function Calling（ツール使用）

Function Callingは、LLMに外部ツールを使わせる仕組みです。Gemini 2.0はJSON Schemaベースの関数定義をサポートし、複数関数の並列呼び出しにも対応しています。

### 実践例: 天気情報付きの旅行プランナー

```typescript
import { FunctionDeclarationSchemaType } from '@google/generative-ai';

// ツール（関数）の定義
const tools = [
  {
    functionDeclarations: [
      {
        name: 'getWeatherForecast',
        description: '指定された都市の天気予報を取得する',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            city: {
              type: FunctionDeclarationSchemaType.STRING,
              description: '都市名（例: 東京, 大阪）',
            },
            days: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: '予報日数（1-7）',
            },
          },
          required: ['city', 'days'],
        },
      },
      {
        name: 'searchHotels',
        description: '指定された都市のホテルを検索する',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            city: {
              type: FunctionDeclarationSchemaType.STRING,
              description: '都市名',
            },
            checkIn: {
              type: FunctionDeclarationSchemaType.STRING,
              description: 'チェックイン日（YYYY-MM-DD形式）',
            },
            budget: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: '1泊あたりの予算（円）',
            },
          },
          required: ['city', 'checkIn'],
        },
      },
    ],
  },
];

// 実際の関数実装
async function getWeatherForecast(city: string, days: number) {
  // 実際のAPIコール（ここではモック）
  return {
    city,
    forecasts: Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
      weather: ['晴れ', '曇り', '雨'][Math.floor(Math.random() * 3)],
      tempHigh: 15 + Math.floor(Math.random() * 10),
      tempLow: 5 + Math.floor(Math.random() * 8),
    })),
  };
}

async function searchHotels(city: string, checkIn: string, budget?: number) {
  return {
    hotels: [
      { name: `${city}グランドホテル`, price: 12000, rating: 4.5 },
      { name: `${city}ビジネスイン`, price: 7500, rating: 4.0 },
    ],
  };
}

// Function Calling付きでモデルを呼び出す
const modelWithTools = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  tools,
});

async function planTrip(query: string): Promise<string> {
  const chat = modelWithTools.startChat();
  let response = await chat.sendMessage(query);

  // Function Callが返されたらループで処理
  while (response.response.functionCalls()?.length) {
    const functionCalls = response.response.functionCalls()!;

    // 全てのFunction Callを並列実行
    const functionResponses = await Promise.all(
      functionCalls.map(async (call) => {
        let result: unknown;

        switch (call.name) {
          case 'getWeatherForecast':
            result = await getWeatherForecast(
              call.args.city as string,
              call.args.days as number
            );
            break;
          case 'searchHotels':
            result = await searchHotels(
              call.args.city as string,
              call.args.checkIn as string,
              call.args.budget as number | undefined
            );
            break;
          default:
            result = { error: `Unknown function: ${call.name}` };
        }

        return {
          functionResponse: {
            name: call.name,
            response: { result },
          },
        };
      })
    );

    // 関数の実行結果をモデルに返す
    response = await chat.sendMessage(functionResponses);
  }

  return response.response.text();
}

const plan = await planTrip(
  '来週末に京都に1泊2日で旅行したいです。予算は1泊1万円以内で。天気も教えてください。'
);
console.log(plan);
```

Gemini 2.0は1回のレスポンスで複数の関数を同時に呼び出すことができます。上記の例では、天気予報とホテル検索が同時にリクエストされ、`Promise.all` で並列処理できます。

---

## Context Caching — コスト削減の切り札

Context Cachingは、Gemini 2.0で最もコスト削減効果が高い機能です。大量のコンテキスト（ドキュメント、コードベース、マニュアル等）を事前にキャッシュし、後続のリクエストではキャッシュ済みトークンの料金を75%割引で利用できます。

### 仕組み

```
通常: [System Instruction + 大量ドキュメント + ユーザー質問] → 毎回全トークンを課金
Caching: [キャッシュ済みコンテキスト] + [ユーザー質問のみ] → キャッシュ分は75%OFF
```

### 実装

```typescript
import { GoogleAICacheManager, GoogleAIFileManager } from '@google/generative-ai/server';

const cacheManager = new GoogleAICacheManager(process.env.GEMINI_API_KEY!);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

async function createDocumentCache(pdfPath: string): Promise<string> {
  // 1. ドキュメントをアップロード
  const uploadResult = await fileManager.uploadFile(pdfPath, {
    mimeType: 'application/pdf',
    displayName: 'API仕様書 v3.2',
  });

  // ファイルの処理完了を待つ
  let file = uploadResult.file;
  while (file.state === 'PROCESSING') {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    file = await fileManager.getFile(file.name);
  }

  // 2. キャッシュを作成（TTLは1時間）
  const cache = await cacheManager.create({
    model: 'models/gemini-2.0-flash',
    displayName: 'API spec cache',
    systemInstruction:
      'あなたはAPI仕様書の専門家です。仕様書の内容に基づいて正確に回答してください。仕様書に記載がない情報は「仕様書に記載がありません」と明示してください。',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              mimeType: file.mimeType,
              fileUri: file.uri,
            },
          },
        ],
      },
    ],
    ttlSeconds: 3600, // 1時間
  });

  console.log(`Cache created: ${cache.name}`);
  console.log(`Cached tokens: ${cache.usageMetadata?.totalTokenCount}`);
  return cache.name;
}

async function queryWithCache(cacheName: string, question: string): Promise<string> {
  // キャッシュを使ってモデルを初期化
  const cache = await cacheManager.get(cacheName);
  const cachedModel = genAI.getGenerativeModelFromCachedContent(cache);

  // 質問のみ送信 — キャッシュ分のトークンは75%割引
  const result = await cachedModel.generateContent(question);
  return result.response.text();
}

// 使用例
const cacheName = await createDocumentCache('./docs/api-spec-v3.pdf');

// 同じキャッシュに対して何度でもクエリ可能
const answer1 = await queryWithCache(cacheName, 'ユーザー認証のエンドポイント一覧を教えてください');
const answer2 = await queryWithCache(cacheName, 'レート制限の仕様を教えてください');
const answer3 = await queryWithCache(cacheName, 'エラーレスポンスの共通フォーマットは？');
```

### コスト計算の実例

200ページのPDFマニュアル（約15万トークン）に対して、1日100回の質問を処理する場合:

| 項目 | Context Cachingなし | Context Cachingあり |
|------|-------------------|-------------------|
| 入力トークン/日 | 15,000,000 | 150,000（キャッシュ） + 500,000（質問） |
| 入力コスト/日 | $1.125 | $0.028 + $0.038 = $0.066 |
| キャッシュストレージ/日 | — | $0.025 |
| **日次合計** | **$1.125** | **$0.091** |
| **月次合計** | **$33.75** | **$2.73** |
| **削減率** | — | **92%** |

**キャッシュが有効なユースケース**: 同じドキュメントに対して複数回クエリする場合。1回しか使わないなら通常リクエストの方がコスト効率が良いです。

---

## Structured Output（JSON構造化出力）

Gemini 2.0は、JSON Schemaに準拠した構造化出力をネイティブにサポートしています。`responseMimeType` と `responseSchema` を指定するだけで、スキーマに従ったJSONが返されます。

```typescript
import { SchemaType } from '@google/generative-ai';

// コードレビュー結果のスキーマ定義
const codeReviewSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      file: {
        type: SchemaType.STRING,
        description: 'ファイルパス',
      },
      line: {
        type: SchemaType.NUMBER,
        description: '行番号',
      },
      severity: {
        type: SchemaType.STRING,
        enum: ['critical', 'warning', 'info'],
        description: '深刻度',
      },
      category: {
        type: SchemaType.STRING,
        enum: ['security', 'performance', 'maintainability', 'bug'],
        description: '問題カテゴリ',
      },
      message: {
        type: SchemaType.STRING,
        description: '指摘内容',
      },
      suggestion: {
        type: SchemaType.STRING,
        description: '修正提案のコード',
      },
    },
    required: ['file', 'line', 'severity', 'category', 'message'],
  },
};

const reviewModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: codeReviewSchema,
  },
});

interface CodeReviewItem {
  file: string;
  line: number;
  severity: 'critical' | 'warning' | 'info';
  category: 'security' | 'performance' | 'maintainability' | 'bug';
  message: string;
  suggestion?: string;
}

async function reviewCode(code: string, filePath: string): Promise<CodeReviewItem[]> {
  const result = await reviewModel.generateContent(
    `以下のTypeScriptコードをレビューしてください。
ファイル: ${filePath}

\`\`\`typescript
${code}
\`\`\`

セキュリティ、パフォーマンス、保守性、バグの観点で指摘してください。`
  );

  return JSON.parse(result.response.text()) as CodeReviewItem[];
}

// 使用例
const issues = await reviewCode(
  `
export async function getUser(id: string) {
  const query = \`SELECT * FROM users WHERE id = '\${id}'\`;
  const result = await db.execute(query);
  return result.rows[0];
}
`,
  'src/api/users.ts'
);

console.log(JSON.stringify(issues, null, 2));
// => [{ file: "src/api/users.ts", line: 2, severity: "critical", category: "security", ... }]
```

Structured Outputを使うと `JSON.parse` が確実に成功します。プロンプトで「JSONで返して」と指示するよりも遥かに信頼性が高く、パース失敗のリトライロジックが不要になります。

---

## Grounding with Google Search

Grounding機能を使うと、Gemini 2.0がリアルタイムのGoogle検索結果を参照して回答を生成します。最新情報が必要なタスクで、ハルシネーションを大幅に削減できます。

```typescript
import { DynamicRetrievalMode } from '@google/generative-ai';

const groundedModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  tools: [
    {
      googleSearchRetrieval: {
        dynamicRetrievalConfig: {
          mode: DynamicRetrievalMode.MODE_DYNAMIC,
          dynamicThreshold: 0.3, // 0-1: 低いほど積極的に検索を使う
        },
      },
    },
  ],
});

async function searchGroundedQuery(query: string): Promise<{
  answer: string;
  sources: string[];
}> {
  const result = await groundedModel.generateContent(query);
  const response = result.response;

  // Grounding メタデータからソースURLを取得
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  const sources =
    groundingMetadata?.groundingChunks?.map(
      (chunk) => chunk.web?.uri ?? ''
    ) ?? [];

  return {
    answer: response.text(),
    sources: sources.filter(Boolean),
  };
}

// 最新のライブラリバージョン情報など、鮮度が重要なクエリ
const { answer, sources } = await searchGroundedQuery(
  'Next.js 15の最新の安定バージョンと、14からの主な破壊的変更を教えてください'
);

console.log('回答:', answer);
console.log('参照ソース:', sources);
```

`dynamicThreshold` の値によって、Geminiが自分の知識で答えるか、Google検索を使うかが変わります。

| 値 | 挙動 |
|----|------|
| `0.0` | 常にGoogle検索を使用 |
| `0.3` | 最新情報や事実確認が必要そうな場合に検索 |
| `0.7` | かなり不確実な場合のみ検索 |
| `1.0` | ほぼ検索しない |

技術情報の検索には `0.3` 前後が適切です。リリース日やバージョン番号など、正確性が重要な情報はGroundingで裏付けを取れます。

---

## GPT-4o vs Gemini 2.0 比較

実プロジェクトでの使い分けの判断材料として、主要スペックを比較します。

| 項目 | Gemini 2.0 Flash | Gemini 2.0 Pro | GPT-4o |
|------|------------------|----------------|--------|
| **コンテキストウィンドウ** | 1,000,000 tokens | 1,000,000 tokens | 128,000 tokens |
| **入力単価（1M tokens）** | $0.075 | $1.25 | $2.50 |
| **出力単価（1M tokens）** | $0.30 | $5.00 | $10.00 |
| **マルチモーダル** | 画像・PDF・動画・音声 | 画像・PDF・動画・音声 | 画像・PDF・音声 |
| **動画理解** | ネイティブ対応 | ネイティブ対応 | 非対応（フレーム抽出が必要） |
| **Context Caching** | あり（75%割引） | あり（75%割引） | なし（Prompt Cachingは自動・50%割引） |
| **Grounding** | Google Search連携 | Google Search連携 | Web Browsing（Chat UIのみ） |
| **Structured Output** | JSON Schema対応 | JSON Schema対応 | JSON Schema対応 |
| **Function Calling** | 並列対応 | 並列対応 | 並列対応 |
| **コード生成精度** | 高い | 非常に高い | 非常に高い |
| **日本語品質** | 良好 | 良好 | 良好 |
| **ストリーミングTTFT** | ~200ms | ~500ms | ~300ms |

### 使い分けの指針

- **コスト最優先・大量処理**: Gemini 2.0 Flash（GPT-4oの1/33のコスト）
- **長文ドキュメント分析**: Gemini 2.0（100万トークン vs 12.8万トークン）
- **動画を含むマルチモーダル**: Gemini 2.0（ネイティブ動画理解）
- **同一コンテキストの反復クエリ**: Gemini 2.0 + Context Caching
- **最新情報が必要なタスク**: Gemini 2.0 + Grounding
- **最高精度の推論が必要**: GPT-4oまたはGemini 2.0 Pro（タスクによる）

---

## エラーハンドリングとレート制限

本番運用では、API障害やレート制限への対処が不可欠です。

### リトライ付きリクエスト

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

class GeminiClient {
  private model;
  private retryConfig: RetryConfig;

  constructor(apiKey: string, retryConfig?: Partial<RetryConfig>) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.retryConfig = {
      maxRetries: retryConfig?.maxRetries ?? 3,
      baseDelay: retryConfig?.baseDelay ?? 1000,
      maxDelay: retryConfig?.maxDelay ?? 30000,
    };
  }

  async generate(prompt: string): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        lastError = error as Error;
        const statusCode = (error as any)?.status ?? (error as any)?.code;

        // リトライ不可能なエラー
        if (statusCode === 400 || statusCode === 403 || statusCode === 404) {
          throw error;
        }

        // 429: レート制限 / 500, 503: サーバーエラー → リトライ
        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(2, attempt) +
              Math.random() * 1000,
            this.retryConfig.maxDelay
          );
          console.warn(
            `Gemini API error (attempt ${attempt + 1}/${this.retryConfig.maxRetries}): ${statusCode}. Retrying in ${Math.round(delay)}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError ?? new Error('Max retries exceeded');
  }
}

// 使用例
const client = new GeminiClient(process.env.GEMINI_API_KEY!, {
  maxRetries: 5,
  baseDelay: 2000,
});

const result = await client.generate('TypeScriptのDecoratorパターンを解説してください');
```

### Safety Settingsの調整

Gemini 2.0はデフォルトのSafety Filterが厳格です。技術コンテンツでブロックされる場合は、適切に調整します。

```typescript
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});
```

---

## 実務でハマるポイント

### 1. Context Cachingの最低トークン数

Context Cachingには**最低32,768トークン**のキャッシュ対象コンテンツが必要です。短いドキュメント（数ページのPDF等）ではキャッシュが作成できずエラーになります。

```typescript
// NG: 短いテキストをキャッシュしようとする
const cache = await cacheManager.create({
  model: 'models/gemini-2.0-flash',
  contents: [{
    role: 'user',
    parts: [{ text: '短い説明文...' }], // 32,768トークン未満 → エラー
  }],
  ttlSeconds: 3600,
});
// Error: Cached content is too small. Must be at least 32768 tokens.
```

**対策**: 短いドキュメントは通常のプロンプトに含めるか、複数ドキュメントをまとめてキャッシュする。

### 2. Structured Outputでネストが深いスキーマが失敗する

Gemini 2.0のStructured Outputは、3階層を超える深いネストでスキーマ準拠率が下がります。複雑な構造は、フラットに再設計するか、2段階に分けて生成してください。

```typescript
// NG: 深すぎるネスト
const deepSchema = {
  type: SchemaType.OBJECT,
  properties: {
    level1: {
      type: SchemaType.OBJECT,
      properties: {
        level2: {
          type: SchemaType.OBJECT,
          properties: {
            level3: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT, // 4階層目 → 不安定
                properties: { /* ... */ },
              },
            },
          },
        },
      },
    },
  },
};

// OK: フラット化
const flatSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          path: { type: SchemaType.STRING },   // "level1.level2.level3" のようにパスで表現
          value: { type: SchemaType.STRING },
        },
      },
    },
  },
};
```

### 3. ストリーミング中のエラーがキャッチしにくい

`generateContentStream` のストリーム消費中にエラーが発生した場合、`for await` の外側の `try-catch` では捕捉できないケースがあります。

```typescript
// NG: ストリーム消費後にエラーが投げられるケース
try {
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    process.stdout.write(chunk.text());
  }
} catch (e) {
  // Safety Filterによるブロックはここに来ないことがある
}

// OK: aggregated responseも確認する
const result = await model.generateContentStream(prompt);
for await (const chunk of result.stream) {
  process.stdout.write(chunk.text());
}

const aggregated = await result.response;
if (aggregated.promptFeedback?.blockReason) {
  console.error('Blocked:', aggregated.promptFeedback.blockReason);
}

const finishReason = aggregated.candidates?.[0]?.finishReason;
if (finishReason && finishReason !== 'STOP') {
  console.error('Unexpected finish:', finishReason);
  // SAFETY, RECITATION, MAX_TOKENS など
}
```

### 4. File APIのファイルは48時間で自動削除される

`fileManager.uploadFile()` でアップロードしたファイルは48時間後に自動削除されます。長期間のContext Cachingと組み合わせる場合、ファイルの再アップロードロジックが必要です。

```typescript
async function ensureFileExists(
  fileManager: GoogleAIFileManager,
  filePath: string,
  mimeType: string
): Promise<string> {
  // 既存ファイルを検索
  const existingFiles = await fileManager.listFiles();
  const displayName = filePath.split('/').pop()!;
  const existing = existingFiles.files?.find(
    (f) => f.displayName === displayName && f.state === 'ACTIVE'
  );

  if (existing) {
    return existing.uri;
  }

  // 存在しない or 期限切れ → 再アップロード
  const result = await fileManager.uploadFile(filePath, {
    mimeType,
    displayName,
  });
  return result.file.uri;
}
```

---

## まとめ

Gemini 2.0 APIの主要機能を実装コードとともに解説しました。改めて、実務での活用ポイントを整理します。

**すぐに試すべき機能**:

1. **Context Caching** — 同じドキュメントに対して繰り返しクエリするユースケースがあるなら、最優先で導入してください。コスト削減効果が最も大きい機能です。
2. **Structured Output** — JSONパースの失敗やリトライロジックに悩んでいるなら、`responseSchema` を設定するだけで解決します。
3. **Grounding** — 最新の技術情報や事実確認が必要なタスクで、ハルシネーション対策として即効性があります。

**段階的な移行プラン**:

- **Step 1**: 既存のGPT-4oプロジェクトの中で、コストが高いエンドポイントをGemini 2.0 Flashに置き換える。`@google/generative-ai` のインターフェースはOpenAIのSDKとは異なるため、薄いラッパー層を用意すると移行が楽です。
- **Step 2**: 長文ドキュメント処理にContext Cachingを導入する。
- **Step 3**: マルチモーダル機能（PDF分析、動画理解）を活用したワークフローを新規構築する。

Gemini 2.0は特に「大量のコンテキストを低コストで処理する」シナリオで圧倒的な強みがあります。100万トークンのコンテキストウィンドウとContext Cachingの組み合わせは、社内ナレッジベースQ&A、コードベース全体のレビュー、大規模ドキュメントの分析など、これまでコスト的に難しかったユースケースを現実的にします。

公式ドキュメント: [Google AI for Developers](https://ai.google.dev/docs) で最新のAPIリファレンスを確認してください。
