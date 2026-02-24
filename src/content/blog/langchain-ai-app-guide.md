---
title: 'LangChain完全ガイド — LLMアプリ開発・RAG・エージェント・LangGraph実装'
description: 'LangChainでLLMアプリを構築する完全ガイド。Chain・LCEL・RAG（PDF/Web）・Memory・Tool Calling・エージェント・LangGraph・LangSmith監視まで TypeScript/Python実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['LangChain', 'AI', 'RAG', 'LLM', 'TypeScript']
---

LangChainは、LLM（大規模言語モデル）を活用したアプリケーション開発のための代表的なフレームワークである。2022年にHarrison Chase氏が公開して以来、急速にエコシステムが拡大し、2026年現在、RAGシステムやAIエージェント開発において事実上の標準ライブラリとなっている。

本記事では、LangChainの基礎概念からLCEL（LangChain Expression Language）、RAG実装、エージェント構築、LangGraph、LangSmith監視まで、TypeScript/Pythonの実装例を交えながら徹底解説する。

---

## 1. LangChainとは — 競合フレームワークとの比較

### LangChainが解決する問題

LLMアプリ開発で直面する主要な課題を整理する。

- **プロンプト管理**: 複数のプロンプトテンプレートを再利用・バージョン管理したい
- **外部データ統合**: PDFや社内DBのデータをLLMに参照させたい（RAG）
- **ツール利用**: 検索エンジンや計算機などをLLMが自律的に使えるようにしたい
- **会話履歴**: 長期的な対話コンテキストを効率的に管理したい
- **可観測性**: LLMの実行コストやレイテンシをトレースしたい

LangChainはこれらの課題に対して、統一されたインターフェースと豊富なインテグレーションを提供する。

### LlamaIndex・Semantic Kernelとの比較

| 観点 | LangChain | LlamaIndex | Semantic Kernel |
|------|-----------|-----------|----------------|
| 主な用途 | 汎用LLMアプリ・エージェント | RAGシステム特化 | Microsoft製品統合 |
| 対応言語 | Python・TypeScript | Python・TypeScript | Python・C#・Java |
| RAG機能 | 充実（汎用） | 業界最高水準 | 基本的な実装 |
| エージェント機能 | LangGraph（強力） | 実験的 | Planner（成熟） |
| 学習コスト | 中〜高（概念が多い） | 中 | 低〜中 |
| コミュニティ | 最大級 | 大規模 | Microsoft主導 |
| LLMプロバイダー対応 | 最多 | 多数 | Azure中心 |

**選択指針**:
- 汎用的なLLMアプリやエージェントを構築したい → **LangChain + LangGraph**
- RAGシステムに特化・最適化したい → **LlamaIndex**
- Azureエコシステムに乗っている → **Semantic Kernel**

LangChainは最も広範なユースケースをカバーしており、特にエージェント・マルチエージェント開発においては2026年現在でも最有力の選択肢である。

---

## 2. セットアップ

### TypeScript（Node.js / Bun）

```bash
# npmの場合
npm install langchain @langchain/core @langchain/openai @langchain/community

# Bunの場合（推奨: 高速）
bun add langchain @langchain/core @langchain/openai @langchain/community

# 追加パッケージ（用途に応じて）
bun add @langchain/anthropic   # Anthropic Claude
bun add @langchain/google-genai # Google Gemini
bun add @langchain/pinecone    # Pinecone VectorStore
bun add @langchain/langgraph   # LangGraph
```

```typescript
// tsconfig.json（最低限の設定）
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### 環境変数の設定

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls__...       # LangSmith（任意）
LANGCHAIN_PROJECT=my-project    # LangSmithプロジェクト名
```

### Python

```bash
pip install langchain langchain-openai langchain-community langchain-chroma
pip install langchain-anthropic langchain-google-genai
pip install langgraph langsmith
```

---

## 3. LCEL（LangChain Expression Language）パイプライン

LCELはLangChainの中核をなす宣言的パイプライン記法である。`|`演算子でコンポーネントを繋ぎ、ストリーミング・バッチ処理・非同期実行を統一的に扱える。

### 基本的なパイプライン

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const model = new ChatOpenAI({
  model: 'gpt-4o',
  temperature: 0.7,
});

const prompt = ChatPromptTemplate.fromTemplate(
  '次のトピックについて100文字で説明してください: {topic}'
);

const outputParser = new StringOutputParser();

// LCEL パイプライン: prompt | model | outputParser
const chain = prompt.pipe(model).pipe(outputParser);

const result = await chain.invoke({ topic: '量子コンピュータ' });
console.log(result);
// => "量子コンピュータは、量子力学の原理を利用して..."
```

### ストリーミング

```typescript
// ストリーミングで逐次出力
const stream = await chain.stream({ topic: '機械学習' });

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### バッチ処理

```typescript
// 複数入力を並列処理
const results = await chain.batch([
  { topic: 'Docker' },
  { topic: 'Kubernetes' },
  { topic: 'Terraform' },
]);

console.log(results); // 3つの回答が配列で返る
```

### RunnableParallel — 複数チェーンの並列実行

```typescript
import { RunnableParallel } from '@langchain/core/runnables';

const summaryChain = ChatPromptTemplate.fromTemplate(
  '{text}を3行で要約してください'
).pipe(model).pipe(outputParser);

const keywordsChain = ChatPromptTemplate.fromTemplate(
  '{text}からキーワードを5つ抽出してください'
).pipe(model).pipe(outputParser);

const parallelChain = RunnableParallel.from({
  summary: summaryChain,
  keywords: keywordsChain,
});

const result = await parallelChain.invoke({
  text: '大規模言語モデルは自然言語処理の革命をもたらしました...',
});
// => { summary: '...', keywords: '...' }
```

### RunnablePassthrough — 入力をそのまま渡す

```typescript
import { RunnablePassthrough } from '@langchain/core/runnables';

const chain = RunnableParallel.from({
  question: new RunnablePassthrough(),
  answer: prompt.pipe(model).pipe(outputParser),
});

const result = await chain.invoke({ topic: 'TypeScript' });
// => { question: { topic: 'TypeScript' }, answer: '...' }
```

---

## 4. プロンプトテンプレート

### ChatPromptTemplate

```typescript
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';

const chatPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'あなたは{role}の専門家です。{language}で回答してください。'
  ),
  HumanMessagePromptTemplate.fromTemplate('{question}'),
]);

const chain = chatPrompt.pipe(model).pipe(outputParser);

const result = await chain.invoke({
  role: 'セキュリティエンジニア',
  language: '日本語',
  question: 'SQLインジェクションを防ぐ方法を教えてください',
});
```

### Few-shot プロンプト

Few-shotプロンプトは、LLMに例示を与えて出力形式や推論スタイルを誘導する手法である。

```typescript
import { FewShotChatMessagePromptTemplate } from '@langchain/core/prompts';

const examples = [
  {
    input: 'Pythonとは何ですか？',
    output: JSON.stringify({
      topic: 'Python',
      category: 'プログラミング言語',
      difficulty: '初級〜中級',
      summary: '汎用スクリプト言語。シンプルな構文とリッチなエコシステムが特徴。',
    }),
  },
  {
    input: 'DockerとKubernetesの違いは？',
    output: JSON.stringify({
      topic: 'Docker vs Kubernetes',
      category: 'インフラ・DevOps',
      difficulty: '中級',
      summary: 'Dockerはコンテナ化ツール、Kubernetesはコンテナオーケストレーター。',
    }),
  },
];

const examplePrompt = ChatPromptTemplate.fromMessages([
  ['human', '{input}'],
  ['ai', '{output}'],
]);

const fewShotPrompt = new FewShotChatMessagePromptTemplate({
  examplePrompt,
  examples,
  inputVariables: ['input'],
  prefix: 'あなたは技術情報を構造化JSONで出力するアシスタントです。',
  suffix: '次の質問をJSONで回答してください: {input}',
});

const chain = fewShotPrompt.pipe(model).pipe(outputParser);
const result = await chain.invoke({ input: 'GraphQLとは何ですか？' });
```

---

## 5. 出力パーサー

LLMの自由形式テキスト出力を、アプリが扱いやすい構造化データに変換する。

### StructuredOutputParser

```typescript
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    name: z.string().describe('技術名'),
    category: z.enum(['frontend', 'backend', 'devops', 'ai', 'database']).describe('カテゴリ'),
    pros: z.array(z.string()).describe('メリット（3〜5個）'),
    cons: z.array(z.string()).describe('デメリット（2〜3個）'),
    useCases: z.array(z.string()).describe('ユースケース'),
    difficulty: z.number().min(1).max(5).describe('難易度 1〜5'),
  })
);

const prompt = ChatPromptTemplate.fromTemplate(`
{technology}についての技術情報を以下の形式で出力してください。

{format_instructions}
`);

const chain = prompt.pipe(model).pipe(parser);

const result = await chain.invoke({
  technology: 'Rust',
  format_instructions: parser.getFormatInstructions(),
});

console.log(result);
// => {
//   name: 'Rust',
//   category: 'backend',
//   pros: ['メモリ安全性', 'ゼロコスト抽象化', ...],
//   cons: ['学習コストが高い', ...],
//   useCases: ['システムプログラミング', ...],
//   difficulty: 4
// }
```

### JsonOutputParser（シンプルなJSON出力）

```typescript
import { JsonOutputParser } from '@langchain/core/output_parsers';

const jsonParser = new JsonOutputParser();

const prompt = ChatPromptTemplate.fromTemplate(
  '次の技術を評価してJSONで返してください: {tech}\n必ず有効なJSONのみを返すこと。'
);

const chain = prompt.pipe(model).pipe(jsonParser);
const result = await chain.invoke({ tech: 'Next.js' });
```

**注意**: LLMのJSON出力は構造が崩れることがある。開発・デバッグ時は [DevToolBox](https://usedevtools.com/) のJSONフォーマッターを活用すると、LLMが返したJSON文字列の検証・整形・差分確認が効率的に行える。

---

## 6. RAG実装（Retrieval-Augmented Generation）

RAGは「外部知識を検索してLLMに渡す」アーキテクチャである。社内ドキュメント・PDFレポート・Webコンテンツを知識源として活用できる。

### RAGのパイプライン全体像

```
[ドキュメント読み込み]
        |
[テキスト分割（TextSplitter）]
        |
[Embedding生成]
        |
[VectorStoreに保存]
        |
    ---- (以降は実行時) ----
        |
[ユーザーの質問をEmbedding]
        |
[類似ドキュメント検索（Retrieval）]
        |
[プロンプトに挿入してLLM実行]
        |
[回答生成]
```

### PDF読み込み → Embedding → VectorStore

```typescript
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

// Step 1: PDFを読み込む
const loader = new PDFLoader('company-manual.pdf');
const rawDocs = await loader.load();

// Step 2: チャンクに分割
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,      // 各チャンクの最大文字数
  chunkOverlap: 200,    // チャンク間のオーバーラップ（文脈継続性を保持）
  separators: ['\n\n', '\n', '。', '、', ''],
});

const docs = await splitter.splitDocuments(rawDocs);
console.log(`${docs.length}チャンクに分割しました`);

// Step 3: Embeddingを生成してVectorStoreに保存
const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small', // コスト効率が高い
});

const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

// Step 4: 検索
const retriever = vectorStore.asRetriever({
  k: 4, // 上位4件を取得
  searchType: 'similarity', // コサイン類似度
});
```

### RAGチェーンの構築

```typescript
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';

const systemPrompt = `
あなたは社内文書に基づいて質問に答えるアシスタントです。
以下のコンテキストを参照して回答してください。
コンテキストに回答がない場合は「文書に記載がありません」と答えてください。

コンテキスト:
{context}
`;

const qaPrompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{input}'],
]);

// ドキュメントをプロンプトに詰め込むチェーン
const documentChain = await createStuffDocumentsChain({
  llm: model,
  prompt: qaPrompt,
});

// Retrieverと組み合わせたRAGチェーン
const ragChain = await createRetrievalChain({
  retriever,
  combineDocsChain: documentChain,
});

const response = await ragChain.invoke({
  input: '有給休暇の申請方法を教えてください',
});

console.log(response.answer);
console.log('参照ドキュメント:', response.context.map(d => d.metadata.source));
```

### Webコンテンツの読み込み

```typescript
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';

// Webページを読み込む
const webLoader = new CheerioWebBaseLoader(
  'https://example.com/tech-blog',
  {
    selector: 'article', // メインコンテンツのCSSセレクタ
  }
);

const webDocs = await webLoader.load();
```

---

## 7. VectorStore

### Chroma（ローカル開発向け）

```typescript
import { Chroma } from '@langchain/community/vectorstores/chroma';

// Dockerで起動: docker run -p 8000:8000 chromadb/chroma

const chromaStore = await Chroma.fromDocuments(docs, embeddings, {
  collectionName: 'company-docs',
  url: 'http://localhost:8000',
  collectionMetadata: {
    'hnsw:space': 'cosine',
  },
});

// 既存コレクションへの接続
const existingStore = new Chroma(embeddings, {
  collectionName: 'company-docs',
  url: 'http://localhost:8000',
});
```

### Pinecone（本番・クラウド向け）

```typescript
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';

const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const pineconeIndex = pineconeClient.Index('my-index');

const pineconeStore = await PineconeStore.fromDocuments(
  docs,
  embeddings,
  {
    pineconeIndex,
    namespace: 'production',
    textKey: 'text',
  }
);

// 検索
const results = await pineconeStore.similaritySearch('検索クエリ', 5);
```

### pgvector（PostgreSQL拡張）

```typescript
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { PoolConfig } from 'pg';

const pgConfig: PoolConfig = {
  host: process.env.POSTGRES_HOST,
  database: 'mydb',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
};

const pgVectorStore = await PGVectorStore.initialize(embeddings, {
  postgresConnectionOptions: pgConfig,
  tableName: 'document_embeddings',
  columns: {
    idColumnName: 'id',
    vectorColumnName: 'embedding',
    contentColumnName: 'content',
    metadataColumnName: 'metadata',
  },
});
```

**VectorStore選択指針**:

| VectorStore | 用途 | 特徴 |
|------------|------|------|
| MemoryVectorStore | プロトタイプ・テスト | インメモリ、永続化なし |
| Chroma | ローカル開発・小規模本番 | Docker起動、フィルタリング対応 |
| Pinecone | クラウド本番 | スケーラブル、マネージド |
| pgvector | 既存PostgreSQL活用 | 追加インフラ不要 |
| Faiss | 大規模ローカル | 高速、Facebookが開発 |

---

## 8. Memory（会話履歴管理）

### ConversationBufferMemory

全ての会話履歴をそのまま保持する。短い会話に適している。

```typescript
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';

const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: 'chat_history',
  inputKey: 'input',
  outputKey: 'output',
});

const conversationChain = new ConversationChain({
  llm: model,
  memory,
  verbose: true, // デバッグ出力
});

// 複数ターンの会話
await conversationChain.invoke({ input: '私の名前はTaroです' });
await conversationChain.invoke({ input: '趣味はプログラミングです' });
const response = await conversationChain.invoke({ input: '私のことを覚えていますか？' });
// => "はい！Taroさんでプログラミングがご趣味とのことですね。"
```

### ConversationSummaryMemory

会話が長くなるとサマリーに圧縮する。トークンコストを抑えながら長期会話を実現する。

```typescript
import { ConversationSummaryMemory } from 'langchain/memory';

const summaryMemory = new ConversationSummaryMemory({
  llm: new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 }),
  returnMessages: true,
  memoryKey: 'chat_history',
  // トークン数が閾値を超えると自動でサマライズ
});

const chain = new ConversationChain({ llm: model, memory: summaryMemory });

// 長い会話でも効率的に履歴を管理
for (let i = 0; i < 20; i++) {
  await chain.invoke({ input: `質問${i}: ...` });
}

// サマリーを確認
const summary = await summaryMemory.loadMemoryVariables({});
console.log(summary.chat_history);
```

### ConversationTokenBufferMemory

トークン数でバッファサイズを制御する。コスト管理に最も適している。

```typescript
import { ConversationTokenBufferMemory } from 'langchain/memory';

const tokenMemory = new ConversationTokenBufferMemory({
  llm: model,
  maxTokenLimit: 2000, // 最大2000トークンの履歴を保持
  returnMessages: true,
});
```

### LCELとMemoryの統合（最新推奨）

```typescript
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { ChatMessageHistory } from '@langchain/community/stores/message/in_memory';

const promptWithHistory = ChatPromptTemplate.fromMessages([
  ['system', 'あなたは親切なアシスタントです。'],
  ['placeholder', '{chat_history}'], // メッセージ履歴のプレースホルダー
  ['human', '{input}'],
]);

const baseChain = promptWithHistory.pipe(model).pipe(outputParser);

// セッションIDごとに履歴を管理
const sessionHistories = new Map<string, ChatMessageHistory>();

const chainWithHistory = new RunnableWithMessageHistory({
  runnable: baseChain,
  getMessageHistory: (sessionId: string) => {
    if (!sessionHistories.has(sessionId)) {
      sessionHistories.set(sessionId, new ChatMessageHistory());
    }
    return sessionHistories.get(sessionId)!;
  },
  inputMessagesKey: 'input',
  historyMessagesKey: 'chat_history',
});

// セッションIDを指定して実行
const config = { configurable: { session_id: 'user-123' } };
await chainWithHistory.invoke({ input: 'こんにちは！' }, config);
const reply = await chainWithHistory.invoke({ input: '先ほど言ったことを繰り返してください' }, config);
```

---

## 9. Tool Calling（カスタムTools・外部API連携）

### カスタムToolの定義

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// 天気情報を取得するツール
const getWeatherTool = tool(
  async ({ city, unit }) => {
    // 実際の天気APIを呼び出す
    const response = await fetch(
      `https://api.weather.example.com/current?city=${city}&unit=${unit}`
    );
    const data = await response.json();
    return `${city}の現在の天気: ${data.condition}, 気温: ${data.temp}°${unit}`;
  },
  {
    name: 'get_weather',
    description: '指定した都市の現在の天気情報を取得します',
    schema: z.object({
      city: z.string().describe('都市名（例: Tokyo, Osaka）'),
      unit: z.enum(['C', 'F']).default('C').describe('温度単位'),
    }),
  }
);

// データベース検索ツール
const searchDatabaseTool = tool(
  async ({ query, limit }) => {
    const results = await db.search(query, { limit });
    return JSON.stringify(results);
  },
  {
    name: 'search_database',
    description: '社内データベースから情報を検索します',
    schema: z.object({
      query: z.string().describe('検索クエリ'),
      limit: z.number().default(5).describe('取得件数'),
    }),
  }
);

// 計算ツール
const calculatorTool = tool(
  async ({ expression }) => {
    try {
      const result = eval(expression); // 本番ではsafer-evalを使用
      return `計算結果: ${expression} = ${result}`;
    } catch {
      return 'エラー: 無効な数式です';
    }
  },
  {
    name: 'calculator',
    description: '数式を計算します',
    schema: z.object({
      expression: z.string().describe('計算式（例: 123 * 456 + 789）'),
    }),
  }
);
```

### Tool CallingとLLMのバインド

```typescript
const tools = [getWeatherTool, searchDatabaseTool, calculatorTool];

// モデルにツールをバインド
const modelWithTools = model.bindTools(tools);

// ツール実行の自動化
import { ToolNode } from '@langchain/langgraph/prebuilt';

const toolNode = new ToolNode(tools);

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'あなたは役立つアシスタントです。必要に応じてツールを使用してください。'],
  ['placeholder', '{messages}'],
]);

// 実行
const response = await modelWithTools.invoke([
  { role: 'user', content: '東京の今日の天気と、1234 * 5678の計算をしてください' }
]);

// ツール呼び出しが含まれる場合
if (response.tool_calls && response.tool_calls.length > 0) {
  for (const toolCall of response.tool_calls) {
    console.log(`ツール: ${toolCall.name}, 引数:`, toolCall.args);
  }
}
```

---

## 10. エージェント（ReAct・OpenAI Functions Agent）

### ReActエージェント

ReAct（Reasoning + Acting）は、LLMが「思考→行動→観察」を繰り返してタスクを解決するエージェントパターンである。

```typescript
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';

const reactAgent = createReactAgent({
  llm: model,
  tools: [getWeatherTool, searchDatabaseTool, calculatorTool],
  // システムプロンプト（任意）
  messageModifier: new SystemMessage(
    'あなたは有能なアシスタントです。複雑な質問に対して、利用可能なツールを組み合わせて解決してください。'
  ),
});

const result = await reactAgent.invoke({
  messages: [new HumanMessage('東京と大阪の天気を比較して、どちらが暑いか教えてください')]
});

// エージェントの実行ステップを確認
for (const message of result.messages) {
  console.log(`[${message.constructor.name}]`, message.content);
}
```

### OpenAI Functions Agent（構造化出力）

```typescript
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';

// LangChain Hubから公式プロンプトを取得
const agentPrompt = await pull<ChatPromptTemplate>(
  'hwchase17/openai-functions-agent'
);

const agent = await createOpenAIFunctionsAgent({
  llm: model,
  tools,
  prompt: agentPrompt,
});

const agentExecutor = new AgentExecutor({
  agent,
  tools,
  verbose: true,       // ステップごとのログ出力
  maxIterations: 10,   // 最大反復回数
  returnIntermediateSteps: true, // 中間ステップを返す
});

const result = await agentExecutor.invoke({
  input: '売上データを検索して、合計と平均を計算してください',
});

console.log('最終回答:', result.output);
console.log('実行ステップ数:', result.intermediateSteps.length);
```

---

## 11. LangGraph — ステートマシンによる高度なエージェント制御

LangGraphは、エージェントの実行フローをDAG（有向非巡回グラフ）またはサイクルグラフとして定義するライブラリである。複雑な条件分岐・ループ・マルチエージェント協調を実現する。

### 基本的なステートグラフ

```typescript
import { StateGraph, END } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';

// グラフの状態定義
const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y), // メッセージを追加
    default: () => [],
  }),
  iteration: Annotation<number>({
    reducer: (x, y) => y,
    default: () => 0,
  }),
  shouldContinue: Annotation<boolean>({
    reducer: (x, y) => y,
    default: () => true,
  }),
});

type GraphStateType = typeof GraphState.State;

// ノード（処理単位）の定義
const callModel = async (state: GraphStateType) => {
  const response = await modelWithTools.invoke(state.messages);
  return {
    messages: [response],
    iteration: state.iteration + 1,
  };
};

const runTools = async (state: GraphStateType) => {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  
  if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    return { shouldContinue: false };
  }
  
  const toolResults = await toolNode.invoke({ messages: state.messages });
  return {
    messages: toolResults.messages,
    shouldContinue: true,
  };
};

// 条件分岐の定義
const shouldContinueOrEnd = (state: GraphStateType): string => {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  
  // ツール呼び出しがない or 最大反復に達した
  if (!lastMessage.tool_calls?.length || state.iteration >= 10) {
    return 'end';
  }
  return 'continue';
};

// グラフの構築
const workflow = new StateGraph(GraphState)
  .addNode('agent', callModel)
  .addNode('tools', runTools)
  .addEdge('__start__', 'agent')
  .addConditionalEdges('agent', shouldContinueOrEnd, {
    continue: 'tools',
    end: END,
  })
  .addEdge('tools', 'agent'); // ツール実行後はエージェントに戻る

const app = workflow.compile();

// 実行
const finalState = await app.invoke({
  messages: [new HumanMessage('最新の売上レポートを調べて要約してください')],
});

console.log('最終回答:', finalState.messages[finalState.messages.length - 1].content);
```

### マルチエージェントシステム（スーパーバイザーパターン）

```typescript
// スーパーバイザーエージェント
const supervisorPrompt = ChatPromptTemplate.fromMessages([
  ['system', `あなたはタスクを適切なエージェントに振り分けるスーパーバイザーです。
  
利用可能なエージェント:
- researcher: Web検索・情報収集を担当
- writer: 文章作成・編集を担当
- coder: コード生成・レビューを担当

次のエージェントを選ぶか、全タスク完了時は "FINISH" を返してください。`],
  ['placeholder', '{messages}'],
  ['human', '次に実行すべきエージェントを選んでください: {options}'],
]);

const supervisorChain = supervisorPrompt.pipe(
  model.withStructuredOutput(
    z.object({
      next: z.enum(['researcher', 'writer', 'coder', 'FINISH']),
      reason: z.string(),
    })
  )
);

// 各専門エージェント
const researcherAgent = createReactAgent({
  llm: model,
  tools: [searchDatabaseTool, getWeatherTool],
  messageModifier: new SystemMessage('あなたは情報収集の専門家です。'),
});

const writerAgent = createReactAgent({
  llm: model,
  tools: [],
  messageModifier: new SystemMessage('あなたはライティングの専門家です。'),
});

// マルチエージェントグラフの構築
const MultiAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  next: Annotation<string>({ reducer: (x, y) => y, default: () => '' }),
});

const multiAgentWorkflow = new StateGraph(MultiAgentState)
  .addNode('supervisor', async (state) => {
    const result = await supervisorChain.invoke({
      messages: state.messages,
      options: ['researcher', 'writer', 'coder', 'FINISH'],
    });
    return { next: result.next };
  })
  .addNode('researcher', async (state) => {
    const result = await researcherAgent.invoke({ messages: state.messages });
    return { messages: result.messages };
  })
  .addNode('writer', async (state) => {
    const result = await writerAgent.invoke({ messages: state.messages });
    return { messages: result.messages };
  })
  .addEdge('__start__', 'supervisor')
  .addConditionalEdges('supervisor', (state) => state.next, {
    researcher: 'researcher',
    writer: 'writer',
    FINISH: END,
  })
  .addEdge('researcher', 'supervisor')
  .addEdge('writer', 'supervisor');

const multiAgentApp = multiAgentWorkflow.compile();
```

### LangGraphのチェックポイント（永続化）

```typescript
import { MemorySaver } from '@langchain/langgraph';

// チェックポイントで状態を永続化
const checkpointer = new MemorySaver();

const appWithCheckpoint = workflow.compile({
  checkpointer,
});

// thread_idで会話を再開可能
const config = { configurable: { thread_id: 'conversation-123' } };

await appWithCheckpoint.invoke(
  { messages: [new HumanMessage('プロジェクトAについて教えてください')] },
  config
);

// 同じthread_idで続きから再開
await appWithCheckpoint.invoke(
  { messages: [new HumanMessage('予算はいくらですか？')] },
  config // 前回の状態から継続
);
```

---

## 12. LangSmith — トレーシング・デバッグ・評価

LangSmithは、LangChainアプリの実行トレース・コスト可視化・品質評価を提供するプラットフォームである。

### トレーシングの有効化

```bash
# 環境変数で自動有効化（コード変更不要）
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=ls__...
export LANGCHAIN_PROJECT=my-langchain-app
```

環境変数を設定するだけで、全てのLangChainコンポーネントの実行が自動的にLangSmithに記録される。

### カスタムトレーシング

```typescript
import { traceable } from 'langsmith/traceable';

// 任意の関数をトレース対象にする
const myPipeline = traceable(
  async (query: string) => {
    const docs = await retriever.invoke(query);
    const answer = await ragChain.invoke({ input: query });
    return { docs, answer };
  },
  {
    name: 'RAG Pipeline',
    run_type: 'chain',
    tags: ['production', 'v2'],
    metadata: { version: '2.0.0' },
  }
);

const result = await myPipeline('有給休暇の申請方法は？');
```

### 評価（Evaluation）

```typescript
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';

const langsmithClient = new Client();

// テストデータセットの作成
const dataset = await langsmithClient.createDataset('rag-evaluation-v1');

await langsmithClient.createExamples({
  inputs: [
    { query: '有給休暇の申請方法は？' },
    { query: '経費精算の締め切りはいつですか？' },
  ],
  outputs: [
    { answer: '社内ポータルから申請書を提出してください' },
    { answer: '毎月末日が締め切りです' },
  ],
  datasetId: dataset.id,
});

// カスタム評価関数
const correctnessEvaluator = async ({
  input,
  actual,
  expected,
}: {
  input: Record<string, unknown>;
  actual: Record<string, unknown>;
  expected: Record<string, unknown>;
}) => {
  const score = await model.invoke([
    {
      role: 'system',
      content: '回答の正確性を0〜1のスコアで評価してください。JSONで返すこと。',
    },
    {
      role: 'user',
      content: `質問: ${input.query}\n期待回答: ${expected.answer}\n実際の回答: ${actual.output}`,
    },
  ]);

  return { key: 'correctness', score: JSON.parse(score.content as string).score };
};

// 評価の実行
const evalResults = await evaluate(
  (input) => ragChain.invoke({ input: input.query }),
  {
    data: 'rag-evaluation-v1',
    evaluators: [correctnessEvaluator],
    experimentPrefix: 'rag-v2-test',
  }
);

console.log('平均スコア:', evalResults.results);
```

---

## 13. 本番デプロイ — コスト管理・キャッシュ・レート制限

### セマンティックキャッシュ

同じまたは類似した質問への回答をキャッシュし、APIコストを削減する。

```typescript
import { RedisSemanticCache } from '@langchain/community/caches/ioredis_semantic';
import { Redis } from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
});

const semanticCache = new RedisSemanticCache({
  redisClient,
  embeddings,
  ttl: 3600,          // 1時間キャッシュ
  similarityThreshold: 0.95, // 95%以上の類似度でキャッシュヒット
});

const cachedModel = new ChatOpenAI({
  model: 'gpt-4o',
  cache: semanticCache,
});
```

### レート制限とリトライ

```typescript
import { ChatOpenAI } from '@langchain/openai';

const robustModel = new ChatOpenAI({
  model: 'gpt-4o',
  maxRetries: 3,        // 最大3回リトライ
  maxConcurrency: 5,    // 同時実行数の上限
  timeout: 30000,       // 30秒タイムアウト
});

// トークン使用量の監視
import { TokenUsage } from '@langchain/core/language_models/base';

const tokenUsageCallback = {
  handleLLMEnd: (output: { llmOutput?: { tokenUsage?: TokenUsage } }) => {
    const usage = output.llmOutput?.tokenUsage;
    if (usage) {
      console.log(`トークン使用量 - プロンプト: ${usage.promptTokens}, 完了: ${usage.completionTokens}`);
      // コスト計算（gpt-4oの場合）
      const cost =
        ((usage.promptTokens ?? 0) / 1_000_000) * 2.5 +
        ((usage.completionTokens ?? 0) / 1_000_000) * 10;
      console.log(`推定コスト: $${cost.toFixed(6)}`);
    }
  },
};
```

### ストリーミングAPIエンドポイント（Next.js）

```typescript
// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { StreamingTextResponse, LangChainStream } from 'ai'; // Vercel AI SDK

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const { stream, handlers } = LangChainStream();

  const model = new ChatOpenAI({
    model: 'gpt-4o',
    streaming: true,
    callbacks: [handlers],
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'あなたは親切なアシスタントです。'],
    ['placeholder', '{messages}'],
  ]);

  const chain = prompt.pipe(model);

  // バックグラウンドで実行（ストリーミング）
  chain.invoke({ messages }).catch(console.error);

  return new StreamingTextResponse(stream);
}
```

### コスト最適化の戦略

```typescript
// 1. モデルの使い分け（タスクの複雑さに応じて選択）
const lightModel = new ChatOpenAI({ model: 'gpt-4o-mini' });  // 単純タスク
const heavyModel = new ChatOpenAI({ model: 'gpt-4o' });        // 複雑な推論

// 2. プロンプトの圧縮
import { trimMessages } from '@langchain/core/messages';

const trimmedMessages = await trimMessages(messages, {
  maxTokens: 4000,
  strategy: 'last',          // 最新のメッセージを優先
  tokenCounter: lightModel,  // トークンカウントに使用するモデル
  includeSystem: true,       // システムメッセージは必ず保持
});

// 3. 構造化出力でJSON解析エラーを削減
const structuredModel = heavyModel.withStructuredOutput(
  z.object({ result: z.string(), confidence: z.number() })
);

// 4. バッチ処理でAPI呼び出し回数を削減
const batchResults = await chain.batch(
  queries.map(q => ({ input: q })),
  { maxConcurrency: 3 } // 同時3リクエスト
);
```

### 本番監視ダッシュボード

```typescript
// LangSmithでカスタムメトリクスを記録
import { Client } from 'langsmith';

const langsmithClient = new Client();

async function recordMetrics(runId: string, metrics: Record<string, number>) {
  await langsmithClient.createFeedback(runId, 'latency_ms', {
    score: metrics.latencyMs,
    comment: `API latency: ${metrics.latencyMs}ms`,
  });
  
  await langsmithClient.createFeedback(runId, 'cost_usd', {
    score: metrics.costUsd,
    comment: `Estimated cost: $${metrics.costUsd}`,
  });
}
```

---

## まとめ — LangChainエコシステム全体像

本記事で解説したLangChainエコシステムを整理する。

| コンポーネント | 役割 | 主要API |
|-------------|------|--------|
| LCEL | パイプライン記法 | `pipe`, `batch`, `stream` |
| ChatPromptTemplate | プロンプト管理 | `fromMessages`, `fromTemplate` |
| OutputParser | 出力構造化 | `StructuredOutputParser`, `JsonOutputParser` |
| Document Loaders | データ読み込み | `PDFLoader`, `CheerioWebBaseLoader` |
| TextSplitter | チャンク分割 | `RecursiveCharacterTextSplitter` |
| VectorStore | ベクトル検索 | Chroma, Pinecone, pgvector |
| Memory | 会話履歴 | `BufferMemory`, `SummaryMemory` |
| Tools | 外部ツール連携 | `tool()`, `ToolNode` |
| Agents | 自律的タスク実行 | `createReactAgent`, `AgentExecutor` |
| LangGraph | 複雑フロー制御 | `StateGraph`, `Annotation` |
| LangSmith | 監視・評価 | `traceable`, `evaluate` |

### LangChainを採用すべきプロジェクト

- 複数のLLMプロバイダーを切り替えながら開発したい
- RAGシステムを素早くプロトタイプしたい
- 複雑な条件分岐を持つエージェントを構築したい
- LLMアプリの品質評価・コスト監視を体系的に行いたい

### JSON出力の検証について

LLMからのJSON出力は、スキーマ通りに返ってこないケースがある。開発中のデバッグでは、[DevToolBox](https://usedevtools.com/) のJSON Formatter / Validator ツールが役立つ。ブラウザ上でJSONを貼り付けるだけで、構文エラーの特定・整形・スキーマ比較が即座に行えるため、LangChainのOutputParserと組み合わせて活用することを推奨する。特に `ZodOutputParser` でパースエラーが発生した際、LLMの生出力を視覚的に確認するのに有用である。

---

LangChainは急速に進化しているフレームワークであり、本記事執筆時点（2026年2月）の情報を基にしている。特にLangGraphのAPIは定期的に更新されるため、[公式ドキュメント](https://langchain.com/)を定期的に参照することを推奨する。


---

## スキルアップ・キャリアアップのおすすめリソース

LangChainとAIアプリ開発のスキルは、現在最も需要が高い技術領域のひとつだ。

### 転職・キャリアアップ
- **[レバテックキャリア](https://levtech.jp)** — ITエンジニア専門の転職エージェント。AIエンジニア・LLMアプリ開発者の求人が急増中。年収800万円以上の案件も多数。無料相談可能。
- **[Findy](https://findy-job.com)** — GitHubのAI・LLM関連プロジェクトが評価対象。スカウト型でAIスタートアップや大手Tech企業からオファーが届きやすい。

### オンライン学習
- **[Udemy](https://www.udemy.com)** — LangChain・LangGraph・RAGシステム構築の実践コースが充実。最新のLLMアプリ開発手法を動画で体系的に学べる。セール時は90%オフになることも。
- **[Coursera](https://www.coursera.org)** — DeepLearning.AIのLLM・プロンプトエンジニアリングコースを受講可能。Andrew Ng監修のAI基礎から応用まで体系的に習得できる。
