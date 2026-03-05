---
title: "Mastra: TypeScript製AIエージェントフレームワーク完全ガイド2026 - Next.jsと統合したAI開発"
description: "Gatsby.jsの作者が開発したTypeScript/Node.js向けAIフレームワーク「Mastra」を徹底解説。エージェント・ワークフロー・RAG・メモリ機能の実装から、Next.js/Vercelとの統合まで実践例付きで紹介。"
pubDate: "2026-03-04"
tags: ["AI", "Mastra", "TypeScript", "Node.js", "エージェント", "Next.js"]
---

## はじめに

Mastraは、**TypeScript/Node.js向けのAIエージェントフレームワーク**です。Gatsby.jsの元開発者チームが2025年末にリリースし、瞬く間にJavaScriptコミュニティで人気を集めました。

Pythonが主流だったAIフレームワークの世界で、Mastraは**TypeScriptネイティブ**な選択肢を提供します。

## なぜMastraなのか

### TypeScript/Node.jsエコシステムとの親和性

```typescript
// LangChain (JS版) の複雑さ
const agent = await initializeAgentExecutorWithOptions(tools, llm, {
  agentType: "structured-chat-zero-shot-react-description",
  // ... 設定が複雑
});

// Mastraのシンプルさ
const agent = new Agent({
  name: "my-agent",
  model: openai("gpt-4o"),
  tools: { searchTool, calculatorTool },
  instructions: "役立つアシスタントです",
});
const result = await agent.generate("こんにちは");
```

**主な特徴:**
- **TypeScriptファースト**: 完全な型安全性
- **Next.js/Vercel統合**: シームレスなデプロイ
- **組み込みRAG**: ベクトルDB連携が標準装備
- **ワークフローエンジン**: 複雑なフローを宣言的に定義
- **メモリ管理**: 会話履歴の永続化
- **デプロイ容易**: Vercel/Cloudflare Workers対応

## インストール

```bash
npm install @mastra/core

# 必要に応じてプロバイダーを追加
npm install @ai-sdk/openai @ai-sdk/anthropic

# CLI（プロジェクト生成）
npx create-mastra-app my-ai-app
```

## 基本的なエージェント

```typescript
import { Mastra, Agent } from "@mastra/core";
import { openai } from "@ai-sdk/openai";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// ツールの定義
const weatherTool = createTool({
  id: "get_weather",
  description: "指定した都市の天気を取得します",
  inputSchema: z.object({
    city: z.string().describe("都市名"),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    condition: z.string(),
    humidity: z.number(),
  }),
  execute: async ({ context }) => {
    const { city, unit } = context;
    // 実際にはAPIを呼ぶ
    return {
      temperature: unit === "celsius" ? 22 : 71.6,
      condition: "晴れ",
      humidity: 65,
    };
  },
});

const calculatorTool = createTool({
  id: "calculate",
  description: "数式を計算します",
  inputSchema: z.object({
    expression: z.string().describe("計算式（例: 2 + 3 * 4）"),
  }),
  outputSchema: z.object({
    result: z.number(),
  }),
  execute: async ({ context }) => {
    const result = eval(context.expression); // 実際にはsafer evalを使う
    return { result };
  },
});

// エージェントの定義
const assistantAgent = new Agent({
  name: "assistant",
  model: openai("gpt-4o"),
  instructions: `あなたは役立つアシスタントです。
  天気情報や計算が必要な場合は、提供されたツールを使ってください。
  常に日本語で回答してください。`,
  tools: {
    get_weather: weatherTool,
    calculate: calculatorTool,
  },
});

// Mastraインスタンス
const mastra = new Mastra({
  agents: { assistant: assistantAgent },
});

// 実行
const result = await assistantAgent.generate(
  "東京の天気を調べて、摂氏と華氏で教えてください。また、1234 × 5678を計算してください。"
);
console.log(result.text);
```

## ストリーミング

```typescript
import { Agent } from "@mastra/core";
import { anthropic } from "@ai-sdk/anthropic";

const streamingAgent = new Agent({
  name: "streaming-agent",
  model: anthropic("claude-sonnet-4-6"),
  instructions: "コーディングの専門家として、丁寧に説明します。",
});

// ストリーミングで受け取る
const result = await streamingAgent.stream(
  "Next.jsのApp Routerでデータフェッチングを実装する方法を教えてください"
);

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

## ワークフロー（複雑なフロー制御）

```typescript
import { Mastra, Agent } from "@mastra/core";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// ステップの定義
const researchStep = createStep({
  id: "research",
  description: "トピックについて情報を収集する",
  inputSchema: z.object({
    topic: z.string(),
  }),
  outputSchema: z.object({
    research: z.string(),
    sources: z.array(z.string()),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent("researcher");
    const result = await agent.generate(
      `以下のトピックについて調査してください: ${inputData.topic}`
    );
    return {
      research: result.text,
      sources: ["source1.com", "source2.com"], // 実際にはURLを抽出
    };
  },
});

const writeStep = createStep({
  id: "write",
  description: "調査結果を記事にまとめる",
  inputSchema: z.object({
    research: z.string(),
    sources: z.array(z.string()),
    topic: z.string(),
  }),
  outputSchema: z.object({
    article: z.string(),
    wordCount: z.number(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent("writer");
    const result = await agent.generate(
      `以下の調査結果を基に、「${inputData.topic}」についての記事を書いてください:\n${inputData.research}`
    );
    return {
      article: result.text,
      wordCount: result.text.length,
    };
  },
});

const reviewStep = createStep({
  id: "review",
  description: "記事の品質をレビューする",
  inputSchema: z.object({
    article: z.string(),
    wordCount: z.number(),
  }),
  outputSchema: z.object({
    approved: z.boolean(),
    feedback: z.string(),
    finalArticle: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent("reviewer");
    const result = await agent.generate(
      `この記事をレビューしてください:\n${inputData.article}`
    );

    return {
      approved: inputData.wordCount > 500,
      feedback: result.text,
      finalArticle: inputData.article,
    };
  },
});

// ワークフローの構築
const contentWorkflow = createWorkflow({
  id: "content-creation",
  inputSchema: z.object({
    topic: z.string(),
  }),
  outputSchema: z.object({
    finalArticle: z.string(),
    approved: z.boolean(),
  }),
})
  .step(researchStep)
  .then(writeStep)
  .then(reviewStep)
  .commit();

// Mastraに登録して実行
const mastra = new Mastra({
  agents: {
    researcher: researcherAgent,
    writer: writerAgent,
    reviewer: reviewerAgent,
  },
  workflows: { "content-creation": contentWorkflow },
});

const run = await mastra.getWorkflow("content-creation").createRun();
const result = await run.start({ topic: "TypeScript 5.8の新機能" });
console.log(result.results.review.output.finalArticle);
```

## RAG（Retrieval-Augmented Generation）

```typescript
import { Mastra, Agent, MastraVector } from "@mastra/core";
import { openai } from "@ai-sdk/openai";
import { createVectorQueryTool } from "@mastra/core/tools";

// ベクトルDBの設定（PgVectorを使用）
const vectorStore = new MastraVector({
  provider: "pgvector",
  connectionString: process.env.DATABASE_URL!,
});

// RAGツールの作成
const ragTool = createVectorQueryTool({
  vectorStoreName: "tech-docs",
  indexName: "articles",
  description: "技術ドキュメントから関連情報を検索します",
  model: openai.embedding("text-embedding-3-small"),
});

// RAGエージェント
const ragAgent = new Agent({
  name: "rag-agent",
  model: openai("gpt-4o"),
  instructions: "提供されたコンテキストを基に回答してください。知らない場合は正直に言ってください。",
  tools: { search: ragTool },
});

// ドキュメントのインデックス化
async function indexDocuments(documents: Array<{ text: string; metadata: object }>) {
  await vectorStore.upsert({
    indexName: "articles",
    vectors: documents.map((doc, i) => ({
      id: `doc-${i}`,
      vector: [], // embeddingは自動計算
      metadata: { text: doc.text, ...doc.metadata },
    })),
    embedder: openai.embedding("text-embedding-3-small"),
  });
}

// 使用例
await indexDocuments([
  {
    text: "Next.js App RouterではServer ComponentsとClient Componentsを使い分けます。",
    metadata: { source: "nextjs-docs", topic: "app-router" }
  },
  {
    text: "TypeScriptの型ガードは型を絞り込むための条件分岐です。",
    metadata: { source: "typescript-docs", topic: "type-guards" }
  }
]);

const result = await ragAgent.generate(
  "Next.jsのApp RouterについてServer Componentsはどう使いますか？"
);
console.log(result.text);
```

## メモリ管理（会話履歴の永続化）

```typescript
import { Agent } from "@mastra/core";
import { Memory } from "@mastra/memory";
import { openai } from "@ai-sdk/openai";

// メモリの設定（Redisを使用）
const memory = new Memory({
  storage: {
    type: "redis",
    url: process.env.REDIS_URL!,
  },
  embedder: openai.embedding("text-embedding-3-small"),
});

const memoryAgent = new Agent({
  name: "memory-agent",
  model: openai("gpt-4o"),
  instructions: "ユーザーの過去の会話を覚えており、それを活用します。",
  memory,
});

// ユーザーIDを指定して会話（履歴が保持される）
const thread1 = await memoryAgent.generate(
  "私はReactエンジニアです。Next.jsを学んでいます。",
  { resourceId: "user_123", threadId: "thread_001" }
);

// 別のセッションでも履歴を参照
const thread2 = await memoryAgent.generate(
  "私の職業を覚えていますか？",
  { resourceId: "user_123", threadId: "thread_002" }
);
// → "はい、Reactエンジニアで、Next.jsを学んでいるとおっしゃっていましたね。"
```

## Next.js App Routerとの統合

```typescript
// app/api/chat/route.ts
import { Mastra, Agent } from "@mastra/core";
import { openai } from "@ai-sdk/openai";
import { NextRequest, NextResponse } from "next/server";

const agent = new Agent({
  name: "chat-agent",
  model: openai("gpt-4o"),
  instructions: "あなたはWebサイトのサポートエージェントです。",
});

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  // ストリーミングレスポンス
  const stream = await agent.stream(message);

  return new Response(stream.toDataStreamResponse().body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

```typescript
// app/components/ChatWidget.tsx
"use client";

import { useChat } from "ai/react";

export function ChatWidget() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({ api: "/api/chat" });

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="メッセージを入力..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>送信</button>
      </form>
    </div>
  );
}
```

## Vercelへのデプロイ

```typescript
// mastra.config.ts
import { Mastra } from "@mastra/core";
import { VercelDeployer } from "@mastra/deployer-vercel";

export const mastra = new Mastra({
  deployer: new VercelDeployer({
    teamSlug: "your-team",
    projectName: "my-ai-app",
    token: process.env.VERCEL_TOKEN!,
  }),
  agents: { /* ... */ },
  workflows: { /* ... */ },
});
```

```bash
# デプロイ
npx mastra deploy
```

## LangChain.js vs Mastra 比較

| 観点 | Mastra | LangChain.js |
|------|--------|-------------|
| TypeScript対応 | ✅ ネイティブ | △ 部分的 |
| 学習コスト | 低 | 高（独自概念多数） |
| Next.js統合 | ✅ 公式サポート | △ 手動設定 |
| ワークフロー | ✅ 組み込み | ❌ LangGraphが別途必要 |
| メモリ管理 | ✅ 組み込み | ❌ 手動実装 |
| デプロイ | ✅ Vercel/CF対応 | ❌ 自前デプロイ |
| エコシステム | 小（成長中） | 大（豊富） |

## まとめ

MastraはJavaScript/TypeScriptエコシステムにネイティブなAIフレームワークとして、**Next.jsとの統合や型安全性**を重視するエンジニアに最適です。

**Mastraが特に向いているシナリオ:**
- Next.js/Vercelでフルスタックアプリを作っているチーム
- TypeScriptの型安全性を最大限活用したいプロジェクト
- RAG・メモリ機能が必要なプロダクションアプリ
- Pythonが苦手なJavaScriptエンジニア

**次のステップ:**
- `npx create-mastra-app`でプロジェクト作成
- 簡単なチャットエージェントから始める
- RAGワークフローを追加して実用的なアプリに

## 関連記事

- [LangGraphでAIワークフローを構築する](/langgraph-workflow-guide)
- [CrewAIマルチエージェント開発ガイド](/crewai-multi-agent-guide)
- [Next.js 15 App Router完全ガイド](/nextjs-15-server-actions)
