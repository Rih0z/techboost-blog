---
title: 'Claude Agent SDK入門2026 - TypeScriptでAIエージェント構築、ツール定義、マルチターン会話の実践ガイド'
description: 'Anthropic Claude Agent SDKの基礎から実践まで。TypeScriptでのエージェント構築、カスタムツール定義、マルチターン会話、ストリーミング対応を実例付きで解説。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2026-03-07'
tags: ['AI', 'Claude', 'TypeScript', 'エージェント']
---

## はじめに：AIエージェント開発の新時代

2025年後半から2026年にかけて、AIエージェント開発は「プロンプトを投げて返答を受け取る」単純なAPI呼び出しから、**自律的にツールを使い分け、複雑なタスクを遂行するエージェント**の構築へと大きくシフトしました。

Anthropicが提供する**Claude Agent SDK**は、このエージェント構築を効率化するためのTypeScript/Python対応フレームワークです。本記事では、TypeScriptを使った実践的なエージェント開発の方法を、基礎から応用まで段階的に解説します。

### 本記事で学べること

- Claude Agent SDKの概要とアーキテクチャ
- 環境構築とプロジェクトセットアップ
- 基本的なエージェントの作成と実行
- カスタムツールの定義と連携
- マルチターン会話の実装
- ストリーミングレスポンスの処理
- エラーハンドリングとリトライ戦略
- OpenAI Agents SDKとの比較

---

## 目次

1. [Claude Agent SDKとは](#claude-agent-sdkとは)
2. [環境構築](#環境構築)
3. [基本的なエージェントの作成](#基本的なエージェントの作成)
4. [カスタムツールの定義](#カスタムツールの定義)
5. [マルチターン会話の実装](#マルチターン会話の実装)
6. [ストリーミング対応](#ストリーミング対応)
7. [エラーハンドリング](#エラーハンドリング)
8. [実践的なユースケース](#実践的なユースケース)
9. [OpenAI Agents SDKとの比較](#openai-agents-sdkとの比較)
10. [まとめ](#まとめ)

---

## Claude Agent SDKとは

Claude Agent SDKは、Anthropicが公式に提供するエージェント構築フレームワークです。従来のMessages APIを直接叩くアプローチとは異なり、**エージェントのライフサイクル全体を管理する抽象化レイヤー**を提供します。

### 主な特徴

| 特徴 | 説明 |
|------|------|
| **エージェントループ** | ツール呼び出し→結果取得→次のアクション判断のループを自動管理 |
| **型安全なツール定義** | Zodスキーマによる入出力の型安全性を保証 |
| **マルチターン会話** | 会話履歴の管理とコンテキスト維持を自動化 |
| **ストリーミング** | リアルタイムのトークンストリーミングに対応 |
| **ガードレール** | 入出力のバリデーションとコンテンツフィルタリング |
| **ハンドオフ** | エージェント間のタスク委譲を宣言的に定義 |

### アーキテクチャ概要

Claude Agent SDKのアーキテクチャは、3つの主要コンポーネントで構成されています。

1. **Agent** - 指示（system prompt）、使用するツール、モデル設定を持つ中心的なオブジェクト
2. **Tool** - エージェントが利用できる外部機能の定義（API呼び出し、ファイル操作、計算など）
3. **Runner** - エージェントの実行ループを管理し、ツール呼び出しと応答生成を制御するオーケストレーター

```
ユーザー入力
    ↓
  Runner（実行ループ）
    ↓
  Agent（指示 + ツール群）
    ↓ ←→ Tool呼び出し ←→ 外部システム
  最終応答
    ↓
ユーザーに返却
```

---

## 環境構築

### 前提条件

- **Node.js** 18以上（推奨: 20 LTS）
- **TypeScript** 5.0以上
- **Anthropic APIキー**

### プロジェクトの初期化

```bash
mkdir my-claude-agent && cd my-claude-agent
npm init -y
npm install @anthropic-ai/agent-sdk
npm install -D typescript @types/node tsx
```

### TypeScript設定

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
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"]
}
```

### APIキーの設定

APIキーは環境変数で管理します。**コードにハードコードするのは厳禁**です。

```bash
# .env ファイル
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx
```

```bash
# .gitignore に必ず追加
.env
```

---

## 基本的なエージェントの作成

### 最小構成のエージェント

まずは最もシンプルなエージェントを作成します。

```typescript
// src/basic-agent.ts
import { Agent, run } from "@anthropic-ai/agent-sdk";

const agent = new Agent({
  name: "BasicAssistant",
  model: "claude-sonnet-4-20250514",
  instructions: "あなたは親切な日本語アシスタントです。質問に対して簡潔で正確な回答を提供してください。",
});

async function main() {
  const result = await run(agent, "TypeScriptのジェネリクスを簡単に説明してください");
  console.log(result.finalOutput);
}

main();
```

### 実行方法

```bash
npx tsx src/basic-agent.ts
```

### Agent設定の詳細オプション

`Agent` コンストラクタには豊富なオプションが用意されています。

```typescript
const agent = new Agent({
  // 必須パラメータ
  name: "DetailedAssistant",
  model: "claude-sonnet-4-20250514",  // モデルの指定

  // 指示（システムプロンプト）
  instructions: `あなたはシニアTypeScriptエンジニアです。
    コードレビューの際は以下の観点で確認してください：
    1. 型安全性
    2. エラーハンドリング
    3. パフォーマンス
    4. 可読性`,

  // ツール（後述）
  tools: [],

  // 他のエージェントへのハンドオフ定義（後述）
  handoffs: [],

  // 出力の型定義（Zodスキーマ）
  outputType: undefined,

  // モデルパラメータ
  modelSettings: {
    temperature: 0.7,
    maxTokens: 4096,
  },
});
```

---

## カスタムツールの定義

エージェントの真価はツールを使えることにあります。Claude Agent SDKでは、**Zodスキーマを使った型安全なツール定義**が可能です。

### 基本的なツール定義

```typescript
// src/tools/weather.ts
import { tool } from "@anthropic-ai/agent-sdk";
import { z } from "zod";

export const getWeatherTool = tool({
  name: "get_weather",
  description: "指定された都市の現在の天気情報を取得します",
  parameters: z.object({
    city: z.string().describe("都市名（例：東京、大阪、福岡）"),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius")
      .describe("温度の単位"),
  }),
  execute: async ({ city, unit }) => {
    // 実際にはAPIを呼び出す
    const weatherData = await fetchWeatherAPI(city, unit);
    return JSON.stringify(weatherData);
  },
});

async function fetchWeatherAPI(city: string, unit: string) {
  // ここで実際の天気APIを呼び出す
  // 例としてモックデータを返す
  return {
    city,
    temperature: 22,
    unit,
    condition: "晴れ",
    humidity: 45,
  };
}
```

### 複数ツールを持つエージェント

```typescript
// src/multi-tool-agent.ts
import { Agent, run, tool } from "@anthropic-ai/agent-sdk";
import { z } from "zod";

// 計算ツール
const calculatorTool = tool({
  name: "calculator",
  description: "数学的な計算を実行します。四則演算、累乗、平方根に対応。",
  parameters: z.object({
    expression: z.string().describe("計算式（例：'2 + 3 * 4'、'sqrt(16)'、'2 ** 10'）"),
  }),
  execute: async ({ expression }) => {
    try {
      // 安全な計算実行（evalは本番では使わないこと）
      const sanitized = expression.replace(/[^0-9+\-*/().%\s^sqrtMathpow,PI]/g, "");
      const result = Function(`"use strict"; return (${sanitized})`)();
      return `計算結果: ${result}`;
    } catch (error) {
      return `計算エラー: 無効な計算式です`;
    }
  },
});

// 日時ツール
const dateTimeTool = tool({
  name: "get_datetime",
  description: "現在の日付と時刻を取得します",
  parameters: z.object({
    timezone: z.string().default("Asia/Tokyo").describe("タイムゾーン"),
    format: z.enum(["full", "date", "time"]).default("full")
      .describe("出力形式"),
  }),
  execute: async ({ timezone, format }) => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      ...(format === "full" || format === "date"
        ? { year: "numeric", month: "long", day: "numeric", weekday: "long" }
        : {}),
      ...(format === "full" || format === "time"
        ? { hour: "2-digit", minute: "2-digit", second: "2-digit" }
        : {}),
    };
    return new Intl.DateTimeFormat("ja-JP", options).format(now);
  },
});

// ファイル読み取りツール
const readFileTool = tool({
  name: "read_file",
  description: "指定されたパスのファイルを読み取ります",
  parameters: z.object({
    path: z.string().describe("ファイルパス"),
    encoding: z.enum(["utf-8", "ascii", "base64"]).default("utf-8")
      .describe("ファイルのエンコーディング"),
  }),
  execute: async ({ path, encoding }) => {
    const fs = await import("node:fs/promises");
    try {
      const content = await fs.readFile(path, { encoding: encoding as BufferEncoding });
      return content;
    } catch (error) {
      return `ファイル読み取りエラー: ${(error as Error).message}`;
    }
  },
});

// エージェントにツールを登録
const agent = new Agent({
  name: "MultiToolAssistant",
  model: "claude-sonnet-4-20250514",
  instructions: `あなたは多機能アシスタントです。
    利用可能なツールを適切に組み合わせてタスクを実行してください。
    計算が必要な場合はcalculatorツールを、
    日時が必要な場合はget_datetimeツールを使ってください。`,
  tools: [calculatorTool, dateTimeTool, readFileTool],
});

async function main() {
  const result = await run(
    agent,
    "今日の日付を教えて、あと 2の10乗を計算して"
  );
  console.log(result.finalOutput);
}

main();
```

### ツール実行の流れ

エージェントがツールを使う場合の内部的な流れは次のとおりです。

1. ユーザーの入力を受け取る
2. Claudeモデルが「ツール呼び出しが必要」と判断
3. SDKが該当ツールの `execute` 関数を実行
4. ツールの戻り値をモデルに返却
5. モデルがツール結果を踏まえて最終応答を生成（または追加のツール呼び出し）
6. 最終応答をユーザーに返却

**重要なポイント**: ステップ2〜5はSDKの `run` 関数内で自動的にループ処理されます。開発者がループを手動で管理する必要はありません。

---

## マルチターン会話の実装

実用的なアプリケーションでは、ユーザーとの複数回のやり取りが必要です。Claude Agent SDKでは、会話履歴を `run` の引数として渡すことで、マルチターン会話を簡単に実装できます。

### 基本的なマルチターン会話

```typescript
// src/multi-turn.ts
import { Agent, run } from "@anthropic-ai/agent-sdk";
import * as readline from "node:readline";

const agent = new Agent({
  name: "ConversationalAssistant",
  model: "claude-sonnet-4-20250514",
  instructions: `あなたは会話形式のアシスタントです。
    前の会話の内容を踏まえて回答してください。
    ユーザーが「終了」と言ったら挨拶して会話を終えてください。`,
});

async function chat() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // 会話履歴を保持する配列
  let conversationHistory: any[] = [];

  const askQuestion = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => resolve(answer));
    });
  };

  console.log("チャットを開始します（「終了」で終了）\n");

  while (true) {
    const userInput = await askQuestion("あなた: ");

    if (userInput === "終了") {
      console.log("チャットを終了します。");
      rl.close();
      break;
    }

    // 新しいユーザーメッセージを履歴に追加
    conversationHistory.push({
      role: "user",
      content: userInput,
    });

    // エージェントを実行（会話履歴を渡す）
    const result = await run(agent, conversationHistory);

    // アシスタントの応答を履歴に追加
    conversationHistory = result.toInputList();

    console.log(`\nアシスタント: ${result.finalOutput}\n`);
  }
}

chat();
```

### 会話履歴の管理テクニック

長い会話ではコンテキストウィンドウを超える可能性があります。以下は会話履歴を効率的に管理するパターンです。

```typescript
// src/conversation-manager.ts

interface ConversationConfig {
  maxHistoryLength: number;  // 保持する最大メッセージ数
  summaryThreshold: number;  // 要約を作成するしきい値
}

class ConversationManager {
  private history: any[] = [];
  private config: ConversationConfig;

  constructor(config: ConversationConfig = { maxHistoryLength: 50, summaryThreshold: 30 }) {
    this.config = config;
  }

  addMessage(role: "user" | "assistant", content: string) {
    this.history.push({ role, content });

    // しきい値を超えたら古いメッセージを削除
    if (this.history.length > this.config.maxHistoryLength) {
      // 最初のシステムメッセージは保持し、古い会話を削除
      const excess = this.history.length - this.config.maxHistoryLength;
      this.history.splice(0, excess);
    }
  }

  getHistory(): any[] {
    return [...this.history];
  }

  updateFromResult(result: any) {
    this.history = result.toInputList();
  }

  clear() {
    this.history = [];
  }

  getMessageCount(): number {
    return this.history.length;
  }
}

export { ConversationManager };
```

---

## ストリーミング対応

ユーザー体験を向上させるために、応答をリアルタイムにストリーミングで表示する方法を見ていきます。

### 基本的なストリーミング

```typescript
// src/streaming.ts
import { Agent, run } from "@anthropic-ai/agent-sdk";

const agent = new Agent({
  name: "StreamingAssistant",
  model: "claude-sonnet-4-20250514",
  instructions: "質問に対して詳細な回答を提供してください。",
});

async function streamingExample() {
  const result = run(agent, "Reactのレンダリング最適化テクニックを5つ教えてください", {
    stream: true,
  });

  // ストリーミングイベントを処理
  for await (const event of result) {
    switch (event.type) {
      case "agent_updated":
        // エージェントが切り替わった場合（ハンドオフ）
        console.log(`[Agent: ${event.agent.name}]`);
        break;

      case "run_item_stream_event":
        // テキストのストリーミング
        if (event.item.type === "message_output_item") {
          const textDelta = event.item.rawItem?.content?.[0];
          if (textDelta?.type === "text") {
            process.stdout.write(textDelta.text);
          }
        }
        break;

      case "tool_called":
        console.log(`\n[ツール呼び出し: ${event.toolName}]`);
        break;

      case "tool_output":
        console.log(`[ツール結果取得]`);
        break;
    }
  }

  // 最終結果の取得
  const finalResult = await result;
  console.log("\n\n--- 完了 ---");
}

streamingExample();
```

### WebSocketを使ったリアルタイム配信

Webアプリケーションでの利用を想定した、WebSocket経由のストリーミング実装例です。

```typescript
// src/ws-streaming.ts
import { Agent, run } from "@anthropic-ai/agent-sdk";
import { WebSocketServer, WebSocket } from "ws";

const agent = new Agent({
  name: "WebAssistant",
  model: "claude-sonnet-4-20250514",
  instructions: "Webアプリケーション向けのアシスタントです。",
  tools: [],
});

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws: WebSocket) => {
  console.log("クライアント接続");

  ws.on("message", async (data: Buffer) => {
    const message = JSON.parse(data.toString());

    if (message.type === "chat") {
      try {
        const result = run(agent, message.content, { stream: true });

        for await (const event of result) {
          if (event.type === "run_item_stream_event") {
            ws.send(JSON.stringify({
              type: "stream",
              content: event.item.rawItem?.content?.[0]?.text ?? "",
            }));
          }
        }

        ws.send(JSON.stringify({ type: "done" }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: "error",
          message: (error as Error).message,
        }));
      }
    }
  });
});

console.log("WebSocketサーバーがポート8080で起動しました");
```

---

## エラーハンドリング

本番環境ではAPIのレート制限、ネットワークエラー、ツール実行の失敗など、さまざまなエラーが発生します。堅牢なエラーハンドリングの実装パターンを紹介します。

### 包括的なエラーハンドリング

```typescript
// src/error-handling.ts
import { Agent, run } from "@anthropic-ai/agent-sdk";

// リトライ設定
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;     // ミリ秒
  maxDelay: number;      // ミリ秒
  backoffFactor: number;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};

// 指数バックオフ付きリトライラッパー
async function runWithRetry(
  agent: Agent,
  input: string | any[],
  retryConfig: RetryConfig = defaultRetryConfig
) {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const result = await run(agent, input);
      return result;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message;

      // レート制限エラー（リトライ対象）
      if (errorMessage.includes("rate_limit") || errorMessage.includes("429")) {
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt),
          retryConfig.maxDelay
        );
        console.warn(
          `レート制限検知。${delay}ms 後にリトライ (${attempt + 1}/${retryConfig.maxRetries})`
        );
        await sleep(delay);
        continue;
      }

      // 一時的なサーバーエラー（リトライ対象）
      if (errorMessage.includes("500") || errorMessage.includes("503")) {
        const delay = retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt);
        console.warn(
          `サーバーエラー検知。${delay}ms 後にリトライ (${attempt + 1}/${retryConfig.maxRetries})`
        );
        await sleep(delay);
        continue;
      }

      // 認証エラー（リトライしない）
      if (errorMessage.includes("401") || errorMessage.includes("authentication")) {
        throw new Error(`認証エラー: APIキーを確認してください。${errorMessage}`);
      }

      // その他のエラー（リトライしない）
      throw lastError;
    }
  }

  throw new Error(`最大リトライ回数 (${retryConfig.maxRetries}) に到達: ${lastError?.message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { runWithRetry, RetryConfig };
```

### ツール実行時のエラーハンドリング

```typescript
import { tool } from "@anthropic-ai/agent-sdk";
import { z } from "zod";

// エラーハンドリング付きのツール定義パターン
const robustApiTool = tool({
  name: "fetch_data",
  description: "外部APIからデータを取得します",
  parameters: z.object({
    endpoint: z.string().url().describe("APIエンドポイントURL"),
    timeout: z.number().default(5000).describe("タイムアウト（ミリ秒）"),
  }),
  execute: async ({ endpoint, timeout }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        return JSON.stringify({
          error: true,
          status: response.status,
          message: `APIが ${response.status} を返しました`,
        });
      }

      const data = await response.json();
      return JSON.stringify({ error: false, data });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return JSON.stringify({
          error: true,
          message: `${timeout}ms でタイムアウトしました`,
        });
      }
      return JSON.stringify({
        error: true,
        message: `リクエスト失敗: ${(error as Error).message}`,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  },
});
```

**ポイント**: ツールの `execute` 関数内でエラーをスローするのではなく、エラー情報を文字列として返すことで、エージェントが自律的にエラーに対処できるようになります。例えば「APIがタイムアウトしたので、別の方法で情報を提供します」といった対応が可能になります。

---

## 実践的なユースケース

### コードレビューエージェント

実務で活用できるコードレビューエージェントの例を紹介します。

```typescript
// src/code-review-agent.ts
import { Agent, run, tool } from "@anthropic-ai/agent-sdk";
import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const readSourceFile = tool({
  name: "read_source_file",
  description: "ソースコードファイルを読み取ります",
  parameters: z.object({
    filePath: z.string().describe("ファイルパス"),
  }),
  execute: async ({ filePath }) => {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const ext = path.extname(filePath);
      return `ファイル: ${filePath}\n言語: ${ext}\n---\n${content}`;
    } catch (error) {
      return `ファイル読み取りエラー: ${(error as Error).message}`;
    }
  },
});

const listDirectory = tool({
  name: "list_directory",
  description: "ディレクトリ内のファイル一覧を取得します",
  parameters: z.object({
    dirPath: z.string().describe("ディレクトリパス"),
    pattern: z.string().optional().describe("フィルタパターン（例: .ts）"),
  }),
  execute: async ({ dirPath, pattern }) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      let files = entries.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "directory" : "file",
      }));
      if (pattern) {
        files = files.filter((f) => f.name.endsWith(pattern));
      }
      return JSON.stringify(files, null, 2);
    } catch (error) {
      return `ディレクトリ読み取りエラー: ${(error as Error).message}`;
    }
  },
});

const codeReviewAgent = new Agent({
  name: "CodeReviewer",
  model: "claude-sonnet-4-20250514",
  instructions: `あなたはシニアTypeScript/JavaScriptエンジニアとしてコードレビューを行います。

レビュー観点:
1. 型安全性 - any型の使用、型アサーションの妥当性
2. エラーハンドリング - 例外処理の網羅性
3. パフォーマンス - 不要な再レンダリング、メモリリーク
4. セキュリティ - インジェクション、認証情報の露出
5. 可読性 - 命名規則、関数の単一責任

レビュー結果は以下の形式で出力してください:
- 重要度: Critical / Warning / Info
- 該当箇所: ファイル名と行番号
- 問題: 具体的な問題の説明
- 改善案: 修正後のコード例`,
  tools: [readSourceFile, listDirectory],
});

async function reviewProject(projectPath: string) {
  const result = await run(
    codeReviewAgent,
    `${projectPath} ディレクトリのTypeScriptファイルをレビューしてください。まずディレクトリ構成を確認し、主要なファイルを順にレビューしてください。`
  );
  console.log(result.finalOutput);
}

// 使用例
reviewProject("./src");
```

### エージェント間のハンドオフ

複雑なタスクでは、専門性の異なるエージェント間でタスクを委譲する「ハンドオフ」が有効です。

```typescript
// src/handoff-example.ts
import { Agent, run } from "@anthropic-ai/agent-sdk";

// フロントエンド専門エージェント
const frontendAgent = new Agent({
  name: "FrontendExpert",
  model: "claude-sonnet-4-20250514",
  instructions: `あなたはフロントエンド開発の専門家です。
    React, Vue, Svelte, CSS, パフォーマンス最適化について回答してください。
    バックエンドやインフラの質問が来た場合は、適切なエージェントにハンドオフしてください。`,
  handoffs: [], // 後でバックエンドエージェントを追加
});

// バックエンド専門エージェント
const backendAgent = new Agent({
  name: "BackendExpert",
  model: "claude-sonnet-4-20250514",
  instructions: `あなたはバックエンド開発の専門家です。
    Node.js, データベース設計, API設計, 認証について回答してください。
    フロントエンドの質問が来た場合は、適切なエージェントにハンドオフしてください。`,
  handoffs: [], // 後でフロントエンドエージェントを追加
});

// 相互にハンドオフを設定
frontendAgent.handoffs = [backendAgent];
backendAgent.handoffs = [frontendAgent];

// トリアージエージェント（入口）
const triageAgent = new Agent({
  name: "Triage",
  model: "claude-sonnet-4-20250514",
  instructions: `あなたは技術相談の受付です。
    質問内容を判断し、適切な専門エージェントにハンドオフしてください。
    - フロントエンド関連 → FrontendExpert
    - バックエンド関連 → BackendExpert`,
  handoffs: [frontendAgent, backendAgent],
});

async function main() {
  // トリアージエージェントが適切な専門家にルーティング
  const result = await run(
    triageAgent,
    "ReactのuseEffectの依存配列でオブジェクトを渡すと無限ループになるのですが、どう対処すればいいですか？"
  );

  console.log(`回答エージェント: ${result.lastAgent.name}`);
  console.log(result.finalOutput);
}

main();
```

---

## 構造化出力（Structured Output）

エージェントの出力をプログラムで扱いやすい構造化データとして受け取るには、`outputType` を指定します。

```typescript
// src/structured-output.ts
import { Agent, run } from "@anthropic-ai/agent-sdk";
import { z } from "zod";

// 出力スキーマの定義
const CodeAnalysisSchema = z.object({
  language: z.string().describe("プログラミング言語"),
  complexity: z.enum(["low", "medium", "high"]).describe("コードの複雑さ"),
  issues: z.array(z.object({
    severity: z.enum(["info", "warning", "error"]),
    line: z.number().optional(),
    message: z.string(),
    suggestion: z.string(),
  })).describe("検出された問題のリスト"),
  score: z.number().min(0).max(100).describe("コード品質スコア（0-100）"),
  summary: z.string().describe("総評"),
});

type CodeAnalysis = z.infer<typeof CodeAnalysisSchema>;

const analysisAgent = new Agent({
  name: "CodeAnalyzer",
  model: "claude-sonnet-4-20250514",
  instructions: "コードを分析し、構造化された分析結果を返してください。",
  outputType: CodeAnalysisSchema,
});

async function analyzeCode(code: string): Promise<CodeAnalysis> {
  const result = await run(analysisAgent, `以下のコードを分析してください:\n\n${code}`);

  // result.finalOutput は CodeAnalysis 型として型安全にアクセスできる
  const analysis = result.finalOutput;
  return analysis;
}

// 使用例
async function main() {
  const sampleCode = `
    function fetchUsers() {
      let data: any = fetch('/api/users');
      return data.json();
    }
  `;

  const analysis = await analyzeCode(sampleCode);

  console.log(`言語: ${analysis.language}`);
  console.log(`複雑さ: ${analysis.complexity}`);
  console.log(`品質スコア: ${analysis.score}/100`);
  console.log(`問題数: ${analysis.issues.length}`);

  for (const issue of analysis.issues) {
    console.log(`  [${issue.severity}] ${issue.message}`);
    console.log(`    → ${issue.suggestion}`);
  }

  console.log(`総評: ${analysis.summary}`);
}

main();
```

---

## ガードレールの実装

入出力に対するバリデーションを設定し、安全なエージェント運用を実現します。

```typescript
// src/guardrails.ts
import { Agent, run } from "@anthropic-ai/agent-sdk";

// 入力ガードレール: ユーザー入力をチェック
function inputGuardrail(input: string): { allowed: boolean; reason?: string } {
  // 機密情報のパターンチェック
  const sensitivePatterns = [
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,  // クレジットカード番号
    /\b\d{3}-?\d{4}-?\d{4}\b/,                        // 電話番号
    /sk-[a-zA-Z0-9]{20,}/,                             // APIキー
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(input)) {
      return {
        allowed: false,
        reason: "機密情報が含まれている可能性があります。個人情報やAPIキーを送信しないでください。",
      };
    }
  }

  return { allowed: true };
}

// 出力ガードレール: エージェントの応答をチェック
function outputGuardrail(output: string): { allowed: boolean; filtered?: string } {
  // 不適切なコンテンツのフィルタリング
  const blockedPatterns = [
    /rm\s+-rf\s+\//,  // 危険なコマンド
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(output)) {
      return {
        allowed: false,
        filtered: "安全でない操作が含まれていたため、応答がフィルタリングされました。",
      };
    }
  }

  return { allowed: true };
}

const safeAgent = new Agent({
  name: "SafeAssistant",
  model: "claude-sonnet-4-20250514",
  instructions: "安全で有用な回答を提供してください。",
});

async function safeRun(input: string): Promise<string> {
  // 入力チェック
  const inputCheck = inputGuardrail(input);
  if (!inputCheck.allowed) {
    return `入力拒否: ${inputCheck.reason}`;
  }

  const result = await run(safeAgent, input);
  const output = result.finalOutput;

  // 出力チェック
  const outputCheck = outputGuardrail(output);
  if (!outputCheck.allowed) {
    return outputCheck.filtered ?? "応答がフィルタリングされました。";
  }

  return output;
}
```

---

## OpenAI Agents SDKとの比較

2026年3月時点で、主要なエージェントSDKとしてClaude Agent SDKとOpenAI Agents SDKがあります。両者の違いを整理します。

### 機能比較表

| 機能 | Claude Agent SDK | OpenAI Agents SDK |
|------|-----------------|-------------------|
| **対応言語** | TypeScript, Python | Python（TypeScript非公式） |
| **ツール定義** | Zodスキーマ | Pydantic（Python） |
| **ストリーミング** | ネイティブ対応 | ネイティブ対応 |
| **マルチエージェント** | ハンドオフ方式 | ハンドオフ方式 |
| **構造化出力** | Zodスキーマで型安全 | JSON Schemaベース |
| **ガードレール** | カスタムバリデーション | 組み込みガードレール |
| **トレーシング** | 対応 | OpenTelemetry連携 |
| **MCP対応** | ネイティブ（MCP生みの親） | プラグイン対応 |
| **コンテキスト長** | 最大200Kトークン | モデル依存（128K〜） |
| **ライセンス** | MIT | MIT |

### TypeScript開発者にとっての違い

Claude Agent SDKは**TypeScriptをファーストクラスでサポート**しています。これは大きなアドバンテージです。

```typescript
// Claude Agent SDK: Zodスキーマによる型推論が効く
const myTool = tool({
  name: "search",
  parameters: z.object({
    query: z.string(),
    limit: z.number().optional(),
  }),
  // execute の引数は自動的に { query: string; limit?: number } と推論される
  execute: async ({ query, limit }) => {
    // TypeScriptの型補完が完全に効く
    return `Results for: ${query}`;
  },
});
```

一方、OpenAI Agents SDKはPythonファーストであり、TypeScriptサポートはコミュニティ主導のラッパーに依存する部分があります。

### MCP（Model Context Protocol）対応

Claude Agent SDKのもう一つの強みは、**MCP（Model Context Protocol）のネイティブサポート**です。MCPはAnthropicが策定したオープンプロトコルで、外部ツールやデータソースとの標準化された接続を実現します。

```typescript
// MCP サーバーとの接続例
import { Agent, run, mcpServerTool } from "@anthropic-ai/agent-sdk";

const agent = new Agent({
  name: "MCPAgent",
  model: "claude-sonnet-4-20250514",
  instructions: "利用可能なMCPツールを活用してタスクを実行してください。",
  mcpServers: [
    {
      name: "filesystem",
      transport: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@anthropic-ai/mcp-server-filesystem", "/path/to/allowed/dir"],
      },
    },
    {
      name: "github",
      transport: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@anthropic-ai/mcp-server-github"],
        env: {
          GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? "",
        },
      },
    },
  ],
});
```

MCPを使えば、エージェントからファイルシステム、GitHub、データベース、Slack、その他あらゆる外部サービスに標準化されたインターフェースでアクセスできます。

### 選定基準

| 判断基準 | 推奨SDK |
|---------|---------|
| TypeScriptで開発したい | **Claude Agent SDK** |
| Pythonエコシステムを活用したい | OpenAI Agents SDK |
| MCPサーバーを活用したい | **Claude Agent SDK** |
| 長文コンテキストが必要（200K） | **Claude Agent SDK** |
| GPT-4oモデルを使いたい | OpenAI Agents SDK |
| コード生成・分析タスク | **Claude Agent SDK**（ベンチマーク上位） |

---

## パフォーマンス最適化のヒント

### 1. モデルの使い分け

```typescript
// 軽量なタスクにはHaikuモデル
const quickAgent = new Agent({
  name: "QuickHelper",
  model: "claude-haiku-4-20250514",  // 高速・低コスト
  instructions: "簡潔に回答してください。",
});

// 複雑な推論が必要なタスクにはSonnetまたはOpus
const deepAgent = new Agent({
  name: "DeepAnalyzer",
  model: "claude-sonnet-4-20250514",  // バランス型
  instructions: "詳細な分析を提供してください。",
});
```

### 2. ツール呼び出しの最小化

ツール呼び出しは追加のAPI往復が発生するため、不要なツール呼び出しを減らすことがパフォーマンス向上の鍵です。

```typescript
// 悪い例: 小さなツールを多数定義
const getFirstName = tool({ /* ... */ });
const getLastName = tool({ /* ... */ });
const getEmail = tool({ /* ... */ });

// 良い例: 関連する情報をまとめて取得
const getUserProfile = tool({
  name: "get_user_profile",
  description: "ユーザーの全プロフィール情報を一括取得",
  parameters: z.object({ userId: z.string() }),
  execute: async ({ userId }) => {
    const profile = await db.getUserProfile(userId);
    return JSON.stringify(profile); // firstName, lastName, email を含む
  },
});
```

### 3. コンテキストの適正化

```typescript
// instructionsは具体的かつ簡潔に
const agent = new Agent({
  name: "Efficient",
  model: "claude-sonnet-4-20250514",
  instructions: `タスク: ユーザーの質問にTypeScriptコードで回答する。
規則:
- コードブロックには必ず言語指定を付ける
- 型定義を省略しない
- エラーハンドリングを含める
制約: 1回の回答は200行以内。`,
});
```

---

## テストの書き方

エージェントのテストは通常の関数テストとは異なるアプローチが必要です。

```typescript
// src/__tests__/agent.test.ts
import { describe, it, expect, vi } from "vitest";
import { Agent, run, tool } from "@anthropic-ai/agent-sdk";
import { z } from "zod";

// ツールのモック
const mockCalculator = tool({
  name: "calculator",
  description: "計算を実行",
  parameters: z.object({ expression: z.string() }),
  execute: vi.fn(async ({ expression }) => {
    return `42`; // モック結果
  }),
});

describe("Agent Integration Tests", () => {
  it("ツールが正しく呼び出されること", async () => {
    const agent = new Agent({
      name: "TestAgent",
      model: "claude-sonnet-4-20250514",
      instructions: "計算にはcalculatorツールを必ず使ってください。",
      tools: [mockCalculator],
    });

    const result = await run(agent, "1+1を計算して");

    // ツールが呼び出されたことを検証
    expect(mockCalculator.execute).toHaveBeenCalled();
    // 結果が存在することを検証
    expect(result.finalOutput).toBeTruthy();
  });

  it("ハンドオフが正しく機能すること", async () => {
    const specialistAgent = new Agent({
      name: "Specialist",
      model: "claude-sonnet-4-20250514",
      instructions: "専門的な回答を提供します。",
    });

    const triageAgent = new Agent({
      name: "Triage",
      model: "claude-sonnet-4-20250514",
      instructions: "全ての質問をSpecialistに転送してください。",
      handoffs: [specialistAgent],
    });

    const result = await run(triageAgent, "TypeScriptの質問です");

    // 最終的な回答エージェントがSpecialistであることを検証
    expect(result.lastAgent.name).toBe("Specialist");
  });
});
```

---

## デプロイのベストプラクティス

### 環境変数の管理

```typescript
// src/config.ts
import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "APIキーが設定されていません"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  MAX_RETRIES: z.coerce.number().default(3),
  TIMEOUT_MS: z.coerce.number().default(30000),
});

export const config = envSchema.parse(process.env);
```

### ロギング

```typescript
// src/logger.ts
function createLogger(level: string) {
  const levels = ["debug", "info", "warn", "error"];
  const currentLevel = levels.indexOf(level);

  return {
    debug: (...args: any[]) => currentLevel <= 0 && console.debug("[DEBUG]", ...args),
    info: (...args: any[]) => currentLevel <= 1 && console.info("[INFO]", ...args),
    warn: (...args: any[]) => currentLevel <= 2 && console.warn("[WARN]", ...args),
    error: (...args: any[]) => currentLevel <= 3 && console.error("[ERROR]", ...args),
  };
}

export const logger = createLogger(process.env.LOG_LEVEL ?? "info");
```

---

## まとめ

Claude Agent SDKは、TypeScript開発者にとって最も自然にAIエージェントを構築できるフレームワークです。本記事で紹介した内容を振り返ります。

### 本記事のポイント

| トピック | 要点 |
|---------|------|
| **基本構成** | Agent + Tool + Runner の3コンポーネント |
| **ツール定義** | Zodスキーマで型安全に定義、executeで実行 |
| **マルチターン** | 会話履歴をrun関数に渡すだけで対応 |
| **ストリーミング** | `stream: true` でリアルタイム応答 |
| **エラーハンドリング** | 指数バックオフ付きリトライが推奨 |
| **ハンドオフ** | 専門エージェント間のタスク委譲で複雑なタスクに対応 |
| **構造化出力** | outputTypeでZodスキーマを指定し、型安全な出力を取得 |
| **MCP対応** | 外部ツール・サービスとの標準化された接続 |

### 次のステップ

1. **公式ドキュメント**: [Anthropic Agent SDK Documentation](https://docs.anthropic.com/en/docs/agents) で最新のAPIリファレンスを確認
2. **MCPサーバーの活用**: [MCP Registry](https://github.com/anthropics/mcp) で利用可能なMCPサーバーを探索
3. **本番環境への展開**: レート制限、コスト管理、モニタリングの仕組みを構築
4. **エージェントの評価**: テストスイートを整備し、エージェントの品質を継続的に改善

AIエージェント開発はまだ始まったばかりです。Claude Agent SDKを使いこなして、自律的に動作するインテリジェントなアプリケーションを構築してみてください。
