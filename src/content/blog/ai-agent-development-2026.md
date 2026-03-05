---
title: "AIエージェント開発入門2026 - Claude MCP・LangChain・マルチエージェントの実践ガイド"
description: "2026年最新のAIエージェント開発手法を徹底解説。Claude MCP、LangChain、CrewAI、RAG、マルチエージェントシステムまで、実装例付きで学べる完全ガイドです。"
pubDate: "2026-02-05"
tags: ["AI", "LLM", "エージェント", "Claude", "LangChain", "プログラミング"]
---

## はじめに

2026年、AIエージェント開発は新たなフェーズに入りました。単なる「チャットボット」から、**自律的に判断・行動するエージェント**へと進化しています。

AIエージェントとは、**LLM（大規模言語モデル）を頭脳として、ツールや外部APIを使いながら目標を達成する自律システム**です。

### AIエージェントができること（2026年）

- **ブラウザ操作**: Webサイトのデータ収集・フォーム入力
- **コード生成・実行**: アプリケーション開発支援
- **データ分析**: CSV/Excel解析、可視化、レポート生成
- **カスタマーサポート**: 問い合わせ対応・チケット管理
- **業務自動化**: メール送信、スケジュール調整、ファイル管理
- **マルチエージェント協調**: 複数のエージェントが役割分担して作業

この記事では、2026年の最新フレームワークと実装テクニックを、実践的なコード例とともに解説します。

## AIエージェントの基本構造

AIエージェントは以下の要素で構成されます。

```
┌─────────────────────────────────────┐
│         AIエージェント              │
├─────────────────────────────────────┤
│ ① LLM（言語モデル）                │
│    └─ 思考・判断・テキスト生成      │
│                                     │
│ ② プロンプト/指示                   │
│    └─ システムプロンプト、目標設定  │
│                                     │
│ ③ ツール（Function Calling）        │
│    ├─ Web検索                       │
│    ├─ データベースアクセス          │
│    ├─ APIコール                     │
│    └─ コード実行                    │
│                                     │
│ ④ メモリ                            │
│    ├─ 短期記憶（会話履歴）          │
│    └─ 長期記憶（RAG/ベクトルDB）    │
│                                     │
│ ⑤ 計画・推論ループ                  │
│    └─ ReAct、Chain-of-Thought      │
└─────────────────────────────────────┘
```

## 主要フレームワーク比較2026

### 1. Claude MCP (Model Context Protocol)

Anthropic社が2024年末に発表した、**Claudeエージェントの標準プロトコル**。

**特徴:**
- Claudeネイティブ統合
- ツール定義が簡潔
- ローカルファイル、データベース、APIへのアクセス
- セキュアなサンドボックス実行

**適している用途:**
- Claude中心のエージェント開発
- ローカル環境での自動化
- IDE拡張（VS Code等）

**公式サイト**: https://modelcontextprotocol.io/

### 2. LangChain

最も普及しているエージェントフレームワーク。

**特徴:**
- マルチLLM対応（OpenAI、Claude、Gemini等）
- 豊富なツール・統合（500+）
- RAG（Retrieval Augmented Generation）サポート
- エージェント実行パターン（ReAct、Plan-and-Execute等）

**適している用途:**
- 複雑なRAGアプリケーション
- マルチLLM環境
- エンタープライズ統合

**公式サイト**: https://www.langchain.com/

### 3. CrewAI

マルチエージェント協調に特化。

**特徴:**
- 役割ベースのエージェント設計
- タスクの自動分配
- エージェント間コミュニケーション
- LangChainベース

**適している用途:**
- 複数のエージェントが協力して作業
- プロジェクト管理・ワークフロー
- 研究・分析タスク

**公式サイト**: https://www.crewai.com/

### 4. AutoGen（Microsoft）

対話型マルチエージェント。

**特徴:**
- エージェント間の自動対話
- 人間のフィードバック統合
- コード生成・実行サポート

**適している用途:**
- コード生成・デバッグ
- 対話的な問題解決

**公式サイト**: https://microsoft.github.io/autogen/

### フレームワーク比較表

| | Claude MCP | LangChain | CrewAI | AutoGen |
|---|---|---|---|---|
| **学習曲線** | 易 | 中 | 中 | 中 |
| **LLM対応** | Claude中心 | マルチ | マルチ | マルチ |
| **マルチエージェント** | △ | ○ | ◎ | ◎ |
| **RAGサポート** | △ | ◎ | ○ | △ |
| **ツール統合** | ○ | ◎ | ○ | ○ |
| **日本語情報** | 少 | 多 | 中 | 中 |

## Claude MCP実装例

### 基本的なMCPサーバー

```typescript
// mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'example-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール一覧を返す
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_weather',
        description: '指定した都市の天気情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: '都市名（例: Tokyo）',
            },
          },
          required: ['city'],
        },
      },
      {
        name: 'calculate',
        description: '数式を計算します',
        inputSchema: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: '計算式（例: 2 + 2）',
            },
          },
          required: ['expression'],
        },
      },
    ],
  };
});

// ツール実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_weather') {
    const { city } = args as { city: string };
    // 実際のAPI呼び出し
    const weather = await fetchWeather(city);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(weather, null, 2),
        },
      ],
    };
  }

  if (name === 'calculate') {
    const { expression } = args as { expression: string };
    try {
      // 安全な計算（evalは使わない）
      const result = evaluateExpression(expression);
      return {
        content: [
          {
            type: 'text',
            text: `結果: ${result}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `エラー: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}

main().catch(console.error);

// ヘルパー関数
async function fetchWeather(city: string) {
  // OpenWeatherMap等のAPIを使用
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}`
  );
  return response.json();
}

function evaluateExpression(expr: string): number {
  // 安全な数式評価（mathjs等を使用）
  const math = require('mathjs');
  return math.evaluate(expr);
}
```

### クライアント側（Claude Desktop設定）

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/path/to/mcp-server.js"]
    }
  }
}
```

## LangChain実装例

### 基本的なエージェント

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import { Calculator } from '@langchain/community/tools/calculator';
import { DynamicTool } from '@langchain/core/tools';

// LLMの選択
const llm = new ChatAnthropic({
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0,
});

// ツール定義
const tools = [
  new Calculator(), // 計算ツール

  // カスタムツール: Web検索
  new DynamicTool({
    name: 'web_search',
    description: 'Webを検索して最新情報を取得します。クエリを指定してください。',
    func: async (query: string) => {
      // Tavily AI、Google Custom Search等を使用
      const results = await searchWeb(query);
      return JSON.stringify(results.slice(0, 3));
    },
  }),

  // カスタムツール: データベースクエリ
  new DynamicTool({
    name: 'query_database',
    description: 'SQLクエリを実行してデータベースから情報を取得します',
    func: async (sql: string) => {
      // セキュリティ: SQL Injectionに注意
      const results = await db.query(sql);
      return JSON.stringify(results);
    },
  }),
];

// プロンプトテンプレート
const prompt = await pull('hwchase17/openai-functions-agent');

// エージェント作成
const agent = await createOpenAIFunctionsAgent({
  llm,
  tools,
  prompt,
});

const agentExecutor = new AgentExecutor({
  agent,
  tools,
  verbose: true,
});

// 実行
const result = await agentExecutor.invoke({
  input: '2026年の東京の平均気温を調べて、華氏に変換してください',
});

console.log(result.output);

// ヘルパー関数
async function searchWeb(query: string) {
  // Tavily AI等のWeb検索API
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'basic',
    }),
  });
  return response.json();
}
```

### RAG（Retrieval Augmented Generation）

```typescript
import { ChatAnthropic } from '@langchain/anthropic';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RetrievalQAChain } from 'langchain/chains';

// 1. ドキュメント読み込み
const loader = new PDFLoader('document.pdf');
const docs = await loader.load();

// 2. テキスト分割
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const splitDocs = await splitter.splitDocuments(docs);

// 3. ベクトルストア作成（埋め込み + 保存）
const embeddings = new OpenAIEmbeddings();
const vectorStore = await MemoryVectorStore.fromDocuments(
  splitDocs,
  embeddings
);

// 4. LLM + リトリーバー
const llm = new ChatAnthropic({
  model: 'claude-3-5-sonnet-20241022',
});

const chain = RetrievalQAChain.fromLLM(
  llm,
  vectorStore.asRetriever(3) // 上位3件取得
);

// 5. 質問実行
const response = await chain.invoke({
  query: 'この文書の主要なポイントは何ですか？',
});

console.log(response.text);
```

### Pinecone（本番環境向けベクトルDB）

```typescript
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.Index('my-index');

// ベクトルストア作成
const vectorStore = await PineconeStore.fromDocuments(
  splitDocs,
  embeddings,
  {
    pineconeIndex: index,
    namespace: 'my-namespace',
  }
);

// 類似検索
const results = await vectorStore.similaritySearch(
  'AIエージェントとは',
  4
);
console.log(results);
```

## マルチエージェントシステム（CrewAI）

複数のエージェントが協力してタスクを達成。

```python
# pip install crewai crewai-tools

from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool, FileReadTool

# ツール定義
search_tool = SerperDevTool()  # Google検索
file_tool = FileReadTool()

# エージェント1: リサーチャー
researcher = Agent(
    role='リサーチャー',
    goal='指定されたトピックについて最新の情報を収集する',
    backstory='あなたは経験豊富なリサーチャーです。正確な情報収集が得意です。',
    tools=[search_tool],
    verbose=True,
    allow_delegation=False,
)

# エージェント2: ライター
writer = Agent(
    role='ライター',
    goal='リサーチ結果を基に、分かりやすい記事を作成する',
    backstory='あなたはプロのテクニカルライターです。複雑な情報を分かりやすく伝えられます。',
    tools=[file_tool],
    verbose=True,
    allow_delegation=False,
)

# エージェント3: レビュアー
reviewer = Agent(
    role='レビュアー',
    goal='記事の品質を評価し、改善提案をする',
    backstory='あなたは厳格なエディターです。品質にこだわります。',
    verbose=True,
    allow_delegation=True,
)

# タスク定義
research_task = Task(
    description='AIエージェント開発の最新トレンド（2026年）を調査してください',
    agent=researcher,
    expected_output='調査結果のまとめ（主要なフレームワーク、技術動向）',
)

write_task = Task(
    description='リサーチ結果を基に、2000文字程度のブログ記事を作成してください',
    agent=writer,
    expected_output='完成したブログ記事（Markdown形式）',
    context=[research_task],  # 依存タスク
)

review_task = Task(
    description='記事の内容を確認し、改善点があれば指摘してください',
    agent=reviewer,
    expected_output='レビュー結果（評価と改善提案）',
    context=[write_task],
)

# Crew（チーム）作成
crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[research_task, write_task, review_task],
    process=Process.sequential,  # 順次実行（parallel も可能）
    verbose=2,
)

# 実行
result = crew.kickoff()
print(result)
```

### Node.js版（LangGraphでマルチエージェント）

```typescript
import { StateGraph, END } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';

// 状態定義
interface AgentState {
  messages: string[];
  researchResults?: string;
  article?: string;
  review?: string;
}

// LLM
const llm = new ChatAnthropic({
  model: 'claude-3-5-sonnet-20241022',
});

// エージェント関数
async function researcher(state: AgentState): Promise<Partial<AgentState>> {
  const result = await llm.invoke([
    {
      role: 'system',
      content: 'あなたはリサーチャーです。AIエージェントの最新トレンドを調査してください。',
    },
    { role: 'user', content: state.messages[0] },
  ]);

  return {
    researchResults: result.content as string,
    messages: [...state.messages, `Research: ${result.content}`],
  };
}

async function writer(state: AgentState): Promise<Partial<AgentState>> {
  const result = await llm.invoke([
    {
      role: 'system',
      content: 'あなたはライターです。リサーチ結果を基に記事を作成してください。',
    },
    {
      role: 'user',
      content: `リサーチ結果:\n${state.researchResults}\n\n記事を作成してください。`,
    },
  ]);

  return {
    article: result.content as string,
    messages: [...state.messages, `Article: ${result.content}`],
  };
}

async function reviewer(state: AgentState): Promise<Partial<AgentState>> {
  const result = await llm.invoke([
    {
      role: 'system',
      content: 'あなたはレビュアーです。記事の品質を評価してください。',
    },
    { role: 'user', content: `記事:\n${state.article}\n\nレビューしてください。` },
  ]);

  return {
    review: result.content as string,
    messages: [...state.messages, `Review: ${result.content}`],
  };
}

// グラフ構築
const workflow = new StateGraph<AgentState>({
  channels: {
    messages: { value: (x, y) => x.concat(y) },
    researchResults: { value: (x, y) => y ?? x },
    article: { value: (x, y) => y ?? x },
    review: { value: (x, y) => y ?? x },
  },
});

workflow.addNode('researcher', researcher);
workflow.addNode('writer', writer);
workflow.addNode('reviewer', reviewer);

workflow.addEdge('__start__', 'researcher');
workflow.addEdge('researcher', 'writer');
workflow.addEdge('writer', 'reviewer');
workflow.addEdge('reviewer', END);

const app = workflow.compile();

// 実行
const result = await app.invoke({
  messages: ['AIエージェント開発の最新トレンド（2026年）について記事を書いてください'],
});

console.log('最終結果:', result);
```

## Function Calling（ツール使用）

### OpenAI Function Calling

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_current_weather',
      description: '指定した場所の現在の天気を取得します',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: '都市名（例: Tokyo）',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
          },
        },
        required: ['location'],
      },
    },
  },
];

const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
  { role: 'user', content: '東京の天気を教えて' },
];

// 最初の呼び出し
const response = await openai.chat.completions.create({
  model: 'gpt-4-turbo',
  messages,
  tools,
});

const responseMessage = response.choices[0].message;
const toolCalls = responseMessage.tool_calls;

if (toolCalls) {
  messages.push(responseMessage);

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    // 関数実行
    let functionResponse;
    if (functionName === 'get_current_weather') {
      functionResponse = await getCurrentWeather(
        functionArgs.location,
        functionArgs.unit
      );
    }

    messages.push({
      tool_call_id: toolCall.id,
      role: 'tool',
      content: JSON.stringify(functionResponse),
    });
  }

  // 2回目の呼び出し（結果を含む）
  const secondResponse = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages,
  });

  console.log(secondResponse.choices[0].message.content);
}

async function getCurrentWeather(location: string, unit = 'celsius') {
  // 実際のAPI呼び出し
  return {
    location,
    temperature: 22,
    unit,
    description: '晴れ',
  };
}
```

### Claude Tool Use

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const tools = [
  {
    name: 'get_weather',
    description: '指定した都市の天気情報を取得します',
    input_schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: '都市名',
        },
      },
      required: ['location'],
    },
  },
];

const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: '東京とニューヨークの天気を比較して' },
];

let response = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  tools,
  messages,
});

// ツール使用ループ
while (response.stop_reason === 'tool_use') {
  const toolUse = response.content.find((block) => block.type === 'tool_use');

  if (toolUse && toolUse.type === 'tool_use') {
    // ツール実行
    const toolResult = await executeToolCall(toolUse.name, toolUse.input);

    messages.push(
      { role: 'assistant', content: response.content },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult),
          },
        ],
      }
    );

    // 次の呼び出し
    response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      tools,
      messages,
    });
  }
}

// 最終結果
const finalText = response.content.find((block) => block.type === 'text');
console.log(finalText?.text);

async function executeToolCall(toolName: string, input: any) {
  if (toolName === 'get_weather') {
    return await getCurrentWeather(input.location);
  }
}
```

## 実践的なユースケース

### 1. カスタマーサポートエージェント

```typescript
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor } from 'langchain/agents';
import { DynamicTool } from '@langchain/core/tools';

const tools = [
  new DynamicTool({
    name: 'search_knowledge_base',
    description: 'ナレッジベースから関連する記事を検索します',
    func: async (query: string) => {
      // ベクトル検索
      const results = await vectorStore.similaritySearch(query, 3);
      return results.map((r) => r.pageContent).join('\n\n');
    },
  }),

  new DynamicTool({
    name: 'create_ticket',
    description: 'サポートチケットを作成します',
    func: async (description: string) => {
      const ticket = await createSupportTicket({
        description,
        priority: 'medium',
      });
      return `チケット作成完了: #${ticket.id}`;
    },
  }),

  new DynamicTool({
    name: 'check_order_status',
    description: '注文ステータスを確認します',
    func: async (orderId: string) => {
      const order = await db.orders.findOne({ id: orderId });
      return JSON.stringify(order);
    },
  }),
];

const llm = new ChatAnthropic({
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0,
});

const agent = await createAgent({ llm, tools });

// ユーザーからの問い合わせ
const response = await agent.invoke({
  input: '注文番号12345の配送状況を教えてください',
});

console.log(response.output);
```

### 2. データ分析エージェント

```typescript
import { DynamicTool } from '@langchain/core/tools';
import { PythonInterpreter } from 'python-interpreter'; // 仮想

const tools = [
  new DynamicTool({
    name: 'load_csv',
    description: 'CSVファイルを読み込んでデータフレームを作成します',
    func: async (filePath: string) => {
      const df = await pandas.read_csv(filePath);
      return `データ読み込み完了: ${df.shape[0]}行 × ${df.shape[1]}列`;
    },
  }),

  new DynamicTool({
    name: 'execute_python',
    description: 'Python/pandasコードを実行します',
    func: async (code: string) => {
      // セキュアな実行環境で実行
      const result = await pythonInterpreter.execute(code);
      return result.stdout;
    },
  }),

  new DynamicTool({
    name: 'create_chart',
    description: 'グラフを作成します',
    func: async (chartConfig: string) => {
      // matplotlib等でグラフ作成
      const imagePath = await createVisualization(JSON.parse(chartConfig));
      return `グラフ作成完了: ${imagePath}`;
    },
  }),
];

const response = await agent.invoke({
  input: 'sales.csvを読み込んで、月別の売上推移をグラフにしてください',
});
```

## まとめ

### 2026年のAIエージェント開発ベストプラクティス

1. **適切なフレームワーク選択**
   - Claude中心 → MCP
   - RAG重視 → LangChain
   - マルチエージェント → CrewAI / LangGraph

2. **セキュリティ**
   - ツール実行のサンドボックス化
   - API keyの適切な管理
   - ユーザー入力のバリデーション

3. **コスト管理**
   - プロンプトキャッシング活用
   - 安価なモデルと高性能モデルの使い分け
   - ストリーミング応答

4. **エラーハンドリング**
   - ツール実行の失敗処理
   - 無限ループ防止（最大ステップ数制限）
   - フォールバック戦略

5. **テスト**
   - ユニットテスト（ツール単位）
   - エージェント統合テスト
   - 人間評価（RLHF）

### 次のステップ

- **公式ドキュメント**: 各フレームワークの最新ドキュメントを確認
- **実験**: 小さなプロジェクトで試す
- **コミュニティ**: Discord/Slackで最新情報をキャッチアップ

AIエージェント開発は急速に進化しています。この記事が、あなたのエージェント開発の第一歩になれば幸いです。

Happy Building!
