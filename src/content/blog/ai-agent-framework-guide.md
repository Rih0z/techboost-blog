---
title: 'AIエージェントフレームワーク完全比較ガイド2026'
description: 'LangChain、LlamaIndex、CrewAI、AutoGPT、Claude Code SDKを徹底比較。AIエージェント開発のフレームワーク選定からユースケース別実装まで完全解説。AI・LangChain・LlamaIndexに関する実践情報。'
pubDate: '2026-02-05'
tags: ['AI', 'LangChain', 'LlamaIndex', 'CrewAI', 'AutoGPT', 'プログラミング']
heroImage: '../../assets/thumbnails/ai-agent-framework-guide.jpg'
---

AIエージェント開発が急速に普及する中、適切なフレームワーク選択がプロジェクト成功の鍵となります。本記事では主要なAIエージェントフレームワークを徹底比較し、ユースケース別の選択ガイドを提供します。

## 目次

1. AIエージェントフレームワーク概要
2. LangChain - 汎用AIアプリケーション構築
3. LlamaIndex - データ中心のRAGシステム
4. CrewAI - マルチエージェント協調
5. AutoGPT - 自律型タスク実行
6. Claude Code SDK - 開発者向けエージェント
7. フレームワーク比較表
8. ユースケース別選択ガイド
9. 実装例とベストプラクティス

## AIエージェントフレームワーク概要

### AIエージェントとは

AIエージェントは、以下の特徴を持つシステムです。

```typescript
// AIエージェントの基本構造
interface AIAgent {
  // 環境の認識
  perceive: (environment: Environment) => Observation;

  // 意思決定
  decide: (observation: Observation, memory: Memory) => Action;

  // アクションの実行
  act: (action: Action) => Result;

  // 学習とメモリ更新
  learn: (result: Result) => void;
}
```

### フレームワーク選択の重要性

適切なフレームワーク選択により、以下のメリットが得られます。

- **開発速度の向上**: 再利用可能なコンポーネント
- **保守性の向上**: 標準化されたパターン
- **スケーラビリティ**: エコシステムとの統合
- **コミュニティサポート**: ドキュメントと事例

## LangChain - 汎用AIアプリケーション構築

### 概要と特徴

LangChainは最も広く使われているAIアプリケーションフレームワークです。

**主な特徴**:
- 豊富なLLM統合（OpenAI、Anthropic、Google、ローカルモデル）
- チェーン、エージェント、ツールの抽象化
- メモリ管理とコンテキスト保持
- 大規模なエコシステム

### 基本的な使い方

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

// LLMの初期化
const model = new ChatAnthropic({
  modelName: "claude-3-5-sonnet-20241022",
  temperature: 0.7,
});

// プロンプトテンプレート
const promptTemplate = PromptTemplate.fromTemplate(
  `あなたは{role}です。以下の質問に答えてください。

質問: {question}

回答:`
);

// チェーンの構築
const chain = RunnableSequence.from([
  promptTemplate,
  model,
  new StringOutputParser(),
]);

// 実行
const result = await chain.invoke({
  role: "技術コンサルタント",
  question: "マイクロサービス化のメリットは？",
});

console.log(result);
```

### エージェント実装

```typescript
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { DynamicTool } from "@langchain/core/tools";
import { pull } from "langchain/hub";

// ツールの定義
const searchTool = new DynamicTool({
  name: "web_search",
  description: "インターネットで情報を検索します",
  func: async (query: string) => {
    // 実際の検索API呼び出し
    const results = await performWebSearch(query);
    return JSON.stringify(results);
  },
});

const calculatorTool = new DynamicTool({
  name: "calculator",
  description: "数学的計算を実行します",
  func: async (expression: string) => {
    try {
      const result = eval(expression); // 本番環境では安全な計算ライブラリを使用
      return result.toString();
    } catch (error) {
      return "計算エラー";
    }
  },
});

// エージェントの作成
const prompt = await pull("hwchase17/openai-functions-agent");
const tools = [searchTool, calculatorTool];

const agent = await createOpenAIFunctionsAgent({
  llm: model,
  tools,
  prompt,
});

const agentExecutor = new AgentExecutor({
  agent,
  tools,
  verbose: true,
});

// エージェント実行
const response = await agentExecutor.invoke({
  input: "2024年のAI市場規模を調べて、2026年予測を計算してください",
});

console.log(response.output);
```

### メモリ管理

```typescript
import { BufferMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";

// 会話メモリの初期化
const memory = new BufferMemory({
  memoryKey: "chat_history",
  returnMessages: true,
});

// 会話チェーンの作成
const conversationChain = new ConversationChain({
  llm: model,
  memory,
});

// 会話の実行
await conversationChain.call({
  input: "私の名前は太郎です",
});

const response = await conversationChain.call({
  input: "私の名前は何ですか？",
});

console.log(response.response); // "太郎さんですね"
```

### RAG（検索拡張生成）実装

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";

// ドキュメントの準備
const documents = [
  { pageContent: "LangChainはAIアプリケーション開発フレームワークです", metadata: {} },
  { pageContent: "LlamaIndexはRAGに特化したフレームワークです", metadata: {} },
  // ... その他のドキュメント
];

// テキスト分割
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const splits = await textSplitter.createDocuments(
  documents.map(d => d.pageContent)
);

// ベクトルストアの作成
const embeddings = new OpenAIEmbeddings();
const vectorStore = await MemoryVectorStore.fromDocuments(
  splits,
  embeddings
);

// 検索チェーンの作成
const retriever = vectorStore.asRetriever({
  k: 3, // 上位3件を取得
});

const combineDocsChain = await createStuffDocumentsChain({
  llm: model,
  prompt: PromptTemplate.fromTemplate(
    `以下のコンテキストを使用して質問に答えてください:

{context}

質問: {input}`
  ),
});

const retrievalChain = await createRetrievalChain({
  retriever,
  combineDocsChain,
});

// 質問応答
const answer = await retrievalChain.invoke({
  input: "LangChainとLlamaIndexの違いは？",
});

console.log(answer.answer);
```

### LangChainの長所と短所

**長所**:
- 最も成熟したエコシステム
- 豊富なLLMとツールの統合
- 充実したドキュメント
- アクティブなコミュニティ

**短所**:
- APIの頻繁な変更
- 抽象化が多く学習コストが高い
- パフォーマンスオーバーヘッド

## LlamaIndex - データ中心のRAGシステム

### 概要と特徴

LlamaIndexはRAG（Retrieval-Augmented Generation）に特化したフレームワークです。

**主な特徴**:
- データインジェストとインデックス作成の最適化
- 高度な検索アルゴリズム
- 構造化・非構造化データの統合
- エンタープライズグレードのRAG機能

### 基本的な使い方

```typescript
import {
  Document,
  VectorStoreIndex,
  SimpleDirectoryReader,
  OpenAI,
  Settings,
} from "llamaindex";

// グローバル設定
Settings.llm = new OpenAI({
  model: "gpt-4-turbo-preview",
  temperature: 0.1,
});

// ドキュメントの読み込み
const reader = new SimpleDirectoryReader();
const documents = await reader.loadData("./docs");

// インデックスの作成
const index = await VectorStoreIndex.fromDocuments(documents);

// クエリエンジンの作成
const queryEngine = index.asQueryEngine();

// 質問応答
const response = await queryEngine.query({
  query: "この製品の主な機能は何ですか？",
});

console.log(response.toString());
```

### 高度なインデックス戦略

```typescript
import {
  VectorStoreIndex,
  TreeIndex,
  KeywordTableIndex,
  ComposableGraph,
} from "llamaindex";

// 複数のインデックス戦略を組み合わせる
class MultiIndexRAG {
  private vectorIndex: VectorStoreIndex;
  private treeIndex: TreeIndex;
  private keywordIndex: KeywordTableIndex;

  async initialize(documents: Document[]) {
    // ベクトルインデックス（セマンティック検索）
    this.vectorIndex = await VectorStoreIndex.fromDocuments(documents);

    // ツリーインデックス（階層的要約）
    this.treeIndex = await TreeIndex.fromDocuments(documents);

    // キーワードインデックス（キーワード検索）
    this.keywordIndex = await KeywordTableIndex.fromDocuments(documents);
  }

  async hybridQuery(query: string) {
    // 各インデックスからの結果を取得
    const vectorResults = await this.vectorIndex.asQueryEngine().query({ query });
    const treeResults = await this.treeIndex.asQueryEngine().query({ query });
    const keywordResults = await this.keywordIndex.asQueryEngine().query({ query });

    // 結果を統合
    return this.combineResults([vectorResults, treeResults, keywordResults]);
  }

  private combineResults(results: any[]) {
    // スコアベースの結果統合ロジック
    // ...
  }
}
```

### カスタムデータコネクタ

```typescript
import { BaseReader, Document } from "llamaindex";

// カスタムデータソースリーダー
class NotionReader extends BaseReader {
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async loadData(databaseId: string): Promise<Document[]> {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Notion-Version": "2022-06-28",
        },
      }
    );

    const data = await response.json();

    return data.results.map((page: any) => {
      return new Document({
        text: this.extractText(page),
        metadata: {
          source: "notion",
          pageId: page.id,
          createdTime: page.created_time,
        },
      });
    });
  }

  private extractText(page: any): string {
    // Notionページからテキストを抽出
    // ...
  }
}

// 使用例
const notionReader = new NotionReader(process.env.NOTION_API_KEY);
const documents = await notionReader.loadData("database-id");
const index = await VectorStoreIndex.fromDocuments(documents);
```

### クエリ変換とルーティング

```typescript
import {
  QueryEngine,
  RouterQueryEngine,
  SubQuestionQueryEngine,
} from "llamaindex";

// サブクエスチョン分解
class AdvancedQueryEngine {
  private indexes: Map<string, VectorStoreIndex>;

  constructor() {
    this.indexes = new Map();
  }

  async addIndex(name: string, documents: Document[]) {
    const index = await VectorStoreIndex.fromDocuments(documents);
    this.indexes.set(name, index);
  }

  async queryWithDecomposition(query: string) {
    // クエリを複数のサブクエスチョンに分解
    const subQuestions = await this.decompose(query);

    // 各サブクエスチョンに対して最適なインデックスを選択
    const results = await Promise.all(
      subQuestions.map(async (sq) => {
        const indexName = this.selectIndex(sq);
        const index = this.indexes.get(indexName);
        return await index.asQueryEngine().query({ query: sq.question });
      })
    );

    // サブクエスチョンの結果を統合
    return this.synthesize(query, results);
  }

  private async decompose(query: string): Promise<SubQuestion[]> {
    // LLMを使用してクエリを分解
    const prompt = `以下の質問を、複数の具体的なサブクエスチョンに分解してください:

${query}

各サブクエスチョンをJSON配列で返してください。`;

    // ...
  }

  private selectIndex(subQuestion: SubQuestion): string {
    // サブクエスチョンの内容に基づいて最適なインデックスを選択
    // ...
  }

  private async synthesize(originalQuery: string, results: any[]): Promise<string> {
    // 複数の結果を統合して最終的な回答を生成
    // ...
  }
}
```

### LlamaIndexの長所と短所

**長所**:
- RAGに最適化された設計
- 柔軟なインデックス戦略
- データソース統合が容易
- エンタープライズ向け機能

**短所**:
- RAG以外のユースケースには不向き
- LangChainよりもエコシステムが小さい
- ドキュメントが不足している部分がある

## CrewAI - マルチエージェント協調

### 概要と特徴

CrewAIは複数のAIエージェントが協調してタスクを実行するフレームワークです。

**主な特徴**:
- ロールベースのエージェント設計
- タスクの自動分配と実行
- エージェント間コミュニケーション
- プロセス制御（順次、並列、階層）

### 基本的な使い方

```python
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

# LLMの設定
llm = ChatOpenAI(model="gpt-4-turbo-preview")

# エージェントの定義
researcher = Agent(
    role='リサーチャー',
    goal='最新の技術トレンドを調査する',
    backstory='あなたは経験豊富な技術リサーチャーです',
    llm=llm,
    verbose=True,
)

writer = Agent(
    role='ライター',
    goal='技術記事を執筆する',
    backstory='あなたはテクニカルライターです',
    llm=llm,
    verbose=True,
)

editor = Agent(
    role='編集者',
    goal='記事をレビューして改善する',
    backstory='あなたは厳格な編集者です',
    llm=llm,
    verbose=True,
)

# タスクの定義
research_task = Task(
    description='2026年のAI技術トレンドを調査してください',
    agent=researcher,
    expected_output='調査レポート（1000文字以上）',
)

write_task = Task(
    description='調査結果に基づいてブログ記事を執筆してください',
    agent=writer,
    expected_output='ブログ記事（2000文字以上）',
)

edit_task = Task(
    description='記事をレビューして改善提案をしてください',
    agent=editor,
    expected_output='編集後の記事と改善点リスト',
)

# Crewの作成
crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[research_task, write_task, edit_task],
    process=Process.sequential,  # 順次実行
    verbose=True,
)

# 実行
result = crew.kickoff()
print(result)
```

### カスタムツールの実装

```python
from crewai_tools import BaseTool
from typing import Type
from pydantic import BaseModel, Field

# ツール入力スキーマ
class GitHubSearchInput(BaseModel):
    query: str = Field(..., description="検索クエリ")
    language: str = Field(default="", description="プログラミング言語フィルタ")

# カスタムツールの実装
class GitHubSearchTool(BaseTool):
    name: str = "GitHub Repository Search"
    description: str = "GitHubでリポジトリを検索します"
    args_schema: Type[BaseModel] = GitHubSearchInput

    def _run(self, query: str, language: str = "") -> str:
        import requests

        url = "https://api.github.com/search/repositories"
        params = {
            "q": f"{query} language:{language}" if language else query,
            "sort": "stars",
            "order": "desc",
        }

        response = requests.get(url, params=params)
        repos = response.json()["items"][:5]

        results = []
        for repo in repos:
            results.append({
                "name": repo["name"],
                "url": repo["html_url"],
                "stars": repo["stargazers_count"],
                "description": repo["description"],
            })

        return str(results)

# エージェントにツールを追加
developer = Agent(
    role='開発者',
    goal='最適なライブラリを見つける',
    backstory='あなたは経験豊富な開発者です',
    tools=[GitHubSearchTool()],
    llm=llm,
)
```

### 階層的プロセス制御

```python
from crewai import Crew, Process, Agent, Task

# マネージャーエージェント
manager = Agent(
    role='プロジェクトマネージャー',
    goal='チームを統括してプロジェクトを成功させる',
    backstory='あなたは経験豊富なPMです',
    llm=llm,
    allow_delegation=True,  # 他のエージェントに委譲可能
)

# 専門エージェント
frontend_dev = Agent(
    role='フロントエンド開発者',
    goal='UIを実装する',
    backstory='React/TypeScriptの専門家',
    llm=llm,
)

backend_dev = Agent(
    role='バックエンド開発者',
    goal='APIを実装する',
    backstory='Node.js/Pythonの専門家',
    llm=llm,
)

# 階層的Crew
hierarchical_crew = Crew(
    agents=[manager, frontend_dev, backend_dev],
    tasks=[
        Task(
            description='タスク管理アプリを開発してください',
            agent=manager,
        )
    ],
    process=Process.hierarchical,  # 階層的実行
    manager_llm=ChatOpenAI(model="gpt-4-turbo-preview", temperature=0),
)

result = hierarchical_crew.kickoff()
```

### メモリと学習

```python
from crewai import Agent, Task, Crew
from crewai.memory import ShortTermMemory, LongTermMemory, EntityMemory

# メモリ機能を持つエージェント
learning_agent = Agent(
    role='学習エージェント',
    goal='過去の経験から学習して改善する',
    backstory='継続的に学習するエージェント',
    llm=llm,
    memory=True,  # メモリ機能を有効化
)

# メモリ設定付きCrew
crew_with_memory = Crew(
    agents=[learning_agent],
    tasks=[
        Task(
            description='タスク1を実行',
            agent=learning_agent,
        )
    ],
    memory=True,
    memory_config={
        "provider": "local",  # ローカルストレージ
        "storage_path": "./memory",
    }
)

# 実行（2回目以降は過去の経験を参照）
result1 = crew_with_memory.kickoff()
result2 = crew_with_memory.kickoff()  # 1回目の経験を活用
```

### CrewAIの長所と短所

**長所**:
- マルチエージェントシステムに最適
- 直感的なAPI設計
- プロセス制御が柔軟
- ロールベースで理解しやすい

**短所**:
- 単一エージェントには過剰
- Pythonのみサポート（TypeScript版は開発中）
- 実行コストが高い（複数LLM呼び出し）

## AutoGPT - 自律型タスク実行

### 概要と特徴

AutoGPTは目標を設定すると自律的にタスクを分解・実行するフレームワークです。

**主な特徴**:
- 完全自律型の実行
- 動的なタスク生成
- メモリと学習
- ブラウザ自動操作

### 基本的な使い方

```python
from autogpt import AutoGPT
from autogpt.config import Config
from autogpt.memory import VectorMemory

# 設定
config = Config()
config.set_openai_api_key(os.getenv("OPENAI_API_KEY"))

# メモリ初期化
memory = VectorMemory(config)

# AutoGPTインスタンス作成
agent = AutoGPT(
    ai_name="ResearchBot",
    ai_role="技術リサーチャー",
    ai_goals=[
        "Rust言語の最新動向を調査する",
        "主要なライブラリとツールをリストアップする",
        "調査結果をMarkdownレポートにまとめる",
    ],
    config=config,
    memory=memory,
)

# 実行
agent.run()
```

### カスタムコマンドの追加

```python
from autogpt.commands import command
from autogpt.agent import Agent

class CustomCommands:
    @command(
        "analyze_code",
        "コードを解析する",
        '"file_path": "<ファイルパス>"',
    )
    def analyze_code(file_path: str, agent: Agent) -> str:
        """コード品質を解析する"""
        with open(file_path, 'r') as f:
            code = f.read()

        # 静的解析ツールを実行
        from pylint import epylint as lint

        (pylint_stdout, pylint_stderr) = lint.py_run(
            file_path,
            return_std=True
        )

        results = pylint_stdout.getvalue()
        return f"解析結果:\n{results}"

# カスタムコマンドを登録
agent.command_registry.register(CustomCommands())
```

### プラグインシステム

```python
from autogpt.plugins import BasePlugin

class GitHubPlugin(BasePlugin):
    """GitHub連携プラグイン"""

    def __init__(self):
        super().__init__()
        self.name = "GitHubPlugin"
        self.version = "1.0.0"

    def can_handle_post_prompt(self) -> bool:
        return True

    def post_prompt(self, prompt: str) -> str:
        """プロンプトを拡張してGitHub機能を追加"""
        github_commands = """

追加コマンド:
- github_search: GitHubでリポジトリを検索
- github_clone: リポジトリをクローン
- github_analyze: コードベースを解析
"""
        return prompt + github_commands

    @command("github_search", "GitHub検索", '"query": "<検索クエリ>"')
    def search_repositories(self, query: str) -> str:
        """GitHubでリポジトリを検索"""
        import requests

        response = requests.get(
            "https://api.github.com/search/repositories",
            params={"q": query, "sort": "stars"}
        )

        repos = response.json()["items"][:5]
        return "\n".join([
            f"- {r['name']}: {r['html_url']} ({r['stargazers_count']} stars)"
            for r in repos
        ])

# プラグインを読み込み
agent.load_plugin(GitHubPlugin())
```

### AutoGPTの長所と短所

**長所**:
- 完全自律型で人間の介入不要
- 複雑なタスクを自動分解
- ブラウザ操作などの高度な機能

**短所**:
- 制御が難しい（暴走のリスク）
- コストが予測不能
- デバッグが困難
- 本番環境での使用は非推奨

## Claude Code SDK - 開発者向けエージェント

### 概要と特徴

Claude Code SDKはAnthropic提供の開発者向けエージェントフレームワークです。

**主な特徴**:
- コード生成・編集に最適化
- ファイルシステム操作
- コマンド実行
- 安全なサンドボックス環境

### 基本的な使い方

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ツール定義
const tools = [
  {
    name: "read_file",
    description: "ファイルを読み込む",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "ファイルパス",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "ファイルに書き込む",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
  },
];

// エージェント実行ループ
async function runAgent(userMessage: string) {
  const messages: any[] = [{ role: "user", content: userMessage }];

  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      tools,
      messages,
    });

    // ツール使用チェック
    const toolUse = response.content.find(
      (block: any) => block.type === "tool_use"
    );

    if (!toolUse) {
      // 最終回答
      const textBlock = response.content.find(
        (block: any) => block.type === "text"
      );
      return textBlock?.text;
    }

    // ツール実行
    const toolResult = await executeToolFunction(
      toolUse.name,
      toolUse.input
    );

    // 結果を会話に追加
    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: toolResult,
      }],
    });
  }
}

// ツール実行関数
async function executeToolFunction(name: string, input: any): Promise<string> {
  switch (name) {
    case "read_file":
      const content = await fs.readFile(input.path, "utf-8");
      return content;

    case "write_file":
      await fs.writeFile(input.path, input.content);
      return "ファイルを書き込みました";

    default:
      return "未知のツール";
  }
}
```

### コード編集エージェント

```typescript
class CodeEditingAgent {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async refactorCode(filePath: string, instruction: string): Promise<void> {
    // ファイルを読み込む
    const originalCode = await fs.readFile(filePath, "utf-8");

    // Claudeにリファクタリングを依頼
    const response = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: `以下のコードをリファクタリングしてください。

指示: ${instruction}

元のコード:
\`\`\`typescript
${originalCode}
\`\`\`

リファクタリング後のコードを返してください。`,
      }],
    });

    // コードブロックを抽出
    const textContent = response.content.find(
      (block: any) => block.type === "text"
    );

    const refactoredCode = this.extractCodeBlock(textContent.text);

    // バックアップを作成
    await fs.copyFile(filePath, `${filePath}.backup`);

    // リファクタリング後のコードを保存
    await fs.writeFile(filePath, refactoredCode);

    console.log(`✓ ${filePath} をリファクタリングしました`);
  }

  private extractCodeBlock(text: string): string {
    const match = text.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]+?)\n```/);
    return match ? match[1] : text;
  }
}

// 使用例
const agent = new CodeEditingAgent(process.env.ANTHROPIC_API_KEY);
await agent.refactorCode(
  "./src/legacy-code.ts",
  "async/awaitを使用するように書き換えてください"
);
```

### プロジェクト解析エージェント

```typescript
class ProjectAnalyzer {
  private anthropic: Anthropic;

  async analyzeProject(rootDir: string): Promise<AnalysisReport> {
    // プロジェクト構造を取得
    const structure = await this.getProjectStructure(rootDir);

    // 主要ファイルを読み込む
    const files = await this.readKeyFiles(rootDir);

    // Claudeに解析を依頼
    const response = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: `このプロジェクトを解析してください。

プロジェクト構造:
${structure}

主要ファイル:
${files.map(f => `--- ${f.path} ---\n${f.content}`).join("\n\n")}

以下の観点で解析してください:
1. アーキテクチャパターン
2. 使用技術スタック
3. コード品質の問題
4. 改善提案`,
      }],
    });

    return this.parseAnalysisReport(response);
  }

  private async getProjectStructure(dir: string): Promise<string> {
    // ディレクトリツリーを生成
    // ...
  }

  private async readKeyFiles(dir: string): Promise<FileInfo[]> {
    // package.json, tsconfig.json, README.mdなどを読み込む
    // ...
  }
}
```

### Claude Code SDKの長所と短所

**長所**:
- コード生成・編集に特化
- 安全なツール実行
- 高品質なコード出力
- デバッグ機能

**短所**:
- Claude APIにロックイン
- コストが高い（長いコンテキスト）
- エコシステムが小さい

## フレームワーク比較表

| 特徴 | LangChain | LlamaIndex | CrewAI | AutoGPT | Claude Code SDK |
|------|-----------|------------|--------|---------|-----------------|
| **主な用途** | 汎用AIアプリ | RAGシステム | マルチエージェント | 自律タスク実行 | コード生成・編集 |
| **学習曲線** | 中〜高 | 中 | 低〜中 | 高 | 低〜中 |
| **エコシステム** | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ |
| **ドキュメント** | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ | ★★★★☆ |
| **TypeScript対応** | ○ | ○ | △ | × | ○ |
| **Python対応** | ○ | ○ | ○ | ○ | × |
| **LLMサポート** | 多数 | 多数 | 多数 | OpenAI中心 | Claude |
| **RAG機能** | ○ | ★★★★★ | ○ | △ | △ |
| **エージェント機能** | ★★★★☆ | ★★☆☆☆ | ★★★★★ | ★★★★★ | ★★★★☆ |
| **本番環境利用** | ○ | ○ | ○ | △ | ○ |
| **コスト効率** | 中 | 中 | 低 | 低 | 中〜高 |

## ユースケース別選択ガイド

### チャットボット開発

**推奨**: LangChain

```typescript
// LangChainでのチャットボット実装例
import { ChatAnthropic } from "@langchain/anthropic";
import { BufferMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";

const chatbot = new ConversationChain({
  llm: new ChatAnthropic({ modelName: "claude-3-5-sonnet-20241022" }),
  memory: new BufferMemory(),
});

export async function handleUserMessage(message: string) {
  const response = await chatbot.call({ input: message });
  return response.response;
}
```

### 社内ドキュメント検索

**推奨**: LlamaIndex

```typescript
// LlamaIndexでのドキュメント検索
import { VectorStoreIndex, SimpleDirectoryReader } from "llamaindex";

const documents = await new SimpleDirectoryReader().loadData("./company-docs");
const index = await VectorStoreIndex.fromDocuments(documents);
const queryEngine = index.asQueryEngine();

export async function searchDocs(query: string) {
  const response = await queryEngine.query({ query });
  return response.toString();
}
```

### コンテンツ制作自動化

**推奨**: CrewAI

```python
# CrewAIでのコンテンツ制作
from crewai import Agent, Task, Crew

researcher = Agent(role='リサーチャー', goal='トピック調査')
writer = Agent(role='ライター', goal='記事執筆')
editor = Agent(role='編集者', goal='記事編集')

crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[research_task, write_task, edit_task],
)

result = crew.kickoff()
```

### コードレビュー自動化

**推奨**: Claude Code SDK

```typescript
// Claude Code SDKでのコードレビュー
async function reviewCode(filePath: string) {
  const code = await fs.readFile(filePath, "utf-8");

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    messages: [{
      role: "user",
      content: `以下のコードをレビューしてください:

\`\`\`typescript
${code}
\`\`\`

観点:
- バグの可能性
- パフォーマンス問題
- セキュリティ問題
- ベストプラクティス違反`,
    }],
  });

  return response.content;
}
```

### データ分析自動化

**推奨**: AutoGPT（実験的）またはLangChain

```python
# AutoGPTでのデータ分析
agent = AutoGPT(
    ai_name="DataAnalyst",
    ai_role="データアナリスト",
    ai_goals=[
        "sales_data.csvを読み込む",
        "売上トレンドを分析する",
        "可視化レポートを作成する",
    ],
)

agent.run()
```

## 実装例とベストプラクティス

### エラーハンドリング

```typescript
// 堅牢なエージェント実装
class RobustAgent {
  private maxRetries = 3;
  private timeout = 30000;

  async executeWithRetry(task: () => Promise<any>) {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const result = await Promise.race([
          task(),
          this.timeoutPromise(),
        ]);

        return result;
      } catch (error) {
        console.error(`試行 ${i + 1} 失敗:`, error);

        if (i === this.maxRetries - 1) {
          throw new Error(`${this.maxRetries}回の試行後も失敗`);
        }

        // 指数バックオフ
        await this.sleep(Math.pow(2, i) * 1000);
      }
    }
  }

  private timeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("タイムアウト")), this.timeout);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### コスト管理

```typescript
// トークン使用量の監視
class CostMonitor {
  private totalTokens = 0;
  private costPerToken = 0.000003; // Claude Sonnetの料金

  trackUsage(inputTokens: number, outputTokens: number) {
    this.totalTokens += inputTokens + outputTokens;

    const cost = this.totalTokens * this.costPerToken;

    if (cost > 10) { // $10を超えたら警告
      console.warn(`警告: コストが $${cost.toFixed(2)} に達しました`);
    }
  }

  getReport() {
    return {
      totalTokens: this.totalTokens,
      estimatedCost: this.totalTokens * this.costPerToken,
    };
  }
}
```

### プロンプトエンジニアリング

```typescript
// 効果的なプロンプトテンプレート
const SYSTEM_PROMPT = `あなたは優秀なソフトウェアエンジニアです。

以下のルールに従ってください:
1. コードは常にTypeScriptで書く
2. エッジケースを考慮する
3. テストコードも含める
4. コメントは日本語で書く

出力形式:
\`\`\`typescript
// コード
\`\`\`

説明: [簡潔な説明]`;

// 具体的なタスクプロンプト
function createTaskPrompt(task: string, context: string) {
  return `${SYSTEM_PROMPT}

コンテキスト:
${context}

タスク:
${task}

上記のルールに従って実装してください。`;
}
```

## まとめ

AIエージェントフレームワークの選択は、プロジェクトの要件によって異なります。

**選択フローチャート**:

1. RAGシステムが主目的 → **LlamaIndex**
2. 複数エージェントの協調が必要 → **CrewAI**
3. コード生成・編集が中心 → **Claude Code SDK**
4. 完全自律型が必要（実験的） → **AutoGPT**
5. その他の汎用AIアプリ → **LangChain**

各フレームワークの長所を理解し、要件に最適なものを選択することで、効率的なAIエージェント開発が可能になります。

**2026年のトレンド予測**:
- マルチエージェントシステムの普及
- ローカルLLMとの統合強化
- エンタープライズ向けセキュリティ機能
- コスト最適化ツールの充実

適切なフレームワークを選択し、本記事のベストプラクティスを活用して、強力なAIエージェントシステムを構築してください。
