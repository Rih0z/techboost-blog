---
title: 'LangChain.js RAG実装ガイド'
description: 'LangChain.jsを使ったRAG（Retrieval-Augmented Generation）の実践的な実装方法。ベクトルストア、テキスト分割、リトリーバル、チェーン構成、パフォーマンス最適化を詳しく解説します。'
pubDate: 'Feb 06 2026'
tags: ['LangChain', 'RAG', 'AI', 'TypeScript', 'ベクトル検索']
---

# LangChain.js RAG実装ガイド

RAG（Retrieval-Augmented Generation）は、大規模言語モデル（LLM）に外部知識を組み合わせることで、より正確で最新の情報を提供できる手法です。LangChain.jsを使えば、TypeScriptでRAGシステムを簡単に構築できます。

この記事では、LangChain.jsを使ったRAGの実装方法を、基本から応用まで詳しく解説します。

## RAGの基本アーキテクチャ

RAGシステムは以下の3つのステップで動作します。

1. **インデキシング**: ドキュメントをチャンク化し、ベクトル化して保存
2. **リトリーバル**: ユーザーのクエリに関連するドキュメントを検索
3. **ジェネレーション**: 検索結果を使ってLLMが回答を生成

```
ユーザークエリ
    ↓
[ベクトル化]
    ↓
[ベクトル検索]
    ↓
関連ドキュメント取得
    ↓
[プロンプト構築]
    ↓
[LLM生成]
    ↓
回答
```

## セットアップ

### インストール

```bash
npm install langchain @langchain/openai @langchain/community
npm install hnswlib-node  # ベクトルストア
npm install cheerio        # HTMLパース
npm install pdf-parse      # PDF読み込み
```

### 環境設定

```typescript
// .env
OPENAI_API_KEY=your_api_key_here
```

## テキスト分割

### 基本的な分割

```typescript
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

const text = `
長いドキュメントの内容...
複数の段落があり、様々なトピックが含まれています。
`

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,      // 1チャンクのサイズ
  chunkOverlap: 200,    // チャンク間のオーバーラップ
})

const chunks = await splitter.createDocuments([text])

console.log(`${chunks.length}個のチャンクに分割されました`)
```

### Markdownの分割

```typescript
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

const markdownSplitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
  chunkSize: 1000,
  chunkOverlap: 200,
})

const markdownText = `
# タイトル

## セクション1
内容...

## セクション2
内容...
`

const chunks = await markdownSplitter.createDocuments([markdownText])
```

### コードの分割

```typescript
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

const codeSplitter = RecursiveCharacterTextSplitter.fromLanguage('js', {
  chunkSize: 1000,
  chunkOverlap: 200,
})

const code = `
function example() {
  // コード内容
}
`

const chunks = await codeSplitter.createDocuments([code])
```

### メタデータ付き分割

```typescript
import { Document } from 'langchain/document'

const documents = [
  new Document({
    pageContent: 'ドキュメント1の内容',
    metadata: {
      source: 'doc1.txt',
      author: 'Alice',
      date: '2026-01-01',
    },
  }),
  new Document({
    pageContent: 'ドキュメント2の内容',
    metadata: {
      source: 'doc2.txt',
      author: 'Bob',
      date: '2026-01-02',
    },
  }),
]

const chunks = await splitter.splitDocuments(documents)

// メタデータは各チャンクに継承される
console.log(chunks[0].metadata) // { source: 'doc1.txt', author: 'Alice', ... }
```

## ベクトルストア

### HNSWLib（ローカルベクトルストア）

```typescript
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'
import { OpenAIEmbeddings } from '@langchain/openai'

const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small',
})

// ベクトルストアを作成
const vectorStore = await HNSWLib.fromDocuments(chunks, embeddings)

// ディスクに保存
await vectorStore.save('vectorstore')

// 後で読み込み
const loadedVectorStore = await HNSWLib.load('vectorstore', embeddings)
```

### Pinecone（クラウドベクトルストア）

```typescript
import { PineconeStore } from '@langchain/pinecone'
import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAIEmbeddings } from '@langchain/openai'

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
})

const pineconeIndex = pinecone.Index('my-index')

const vectorStore = await PineconeStore.fromDocuments(
  chunks,
  new OpenAIEmbeddings(),
  {
    pineconeIndex,
    namespace: 'my-namespace',
  }
)
```

### Supabase（PostgreSQL + pgvector）

```typescript
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { createClient } from '@supabase/supabase-js'
import { OpenAIEmbeddings } from '@langchain/openai'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

const vectorStore = await SupabaseVectorStore.fromDocuments(
  chunks,
  new OpenAIEmbeddings(),
  {
    client: supabase,
    tableName: 'documents',
    queryName: 'match_documents',
  }
)
```

## リトリーバル

### 基本的な類似度検索

```typescript
// 最も類似した3件のドキュメントを取得
const results = await vectorStore.similaritySearch('TypeScriptの特徴は？', 3)

results.forEach((doc) => {
  console.log(doc.pageContent)
  console.log(doc.metadata)
})
```

### スコア付き検索

```typescript
// スコア付きで取得
const resultsWithScores = await vectorStore.similaritySearchWithScore(
  'TypeScriptの特徴は？',
  3
)

resultsWithScores.forEach(([doc, score]) => {
  console.log(`スコア: ${score}`)
  console.log(doc.pageContent)
})
```

### メタデータフィルタリング

```typescript
// 特定の著者のドキュメントのみ検索
const filteredResults = await vectorStore.similaritySearch(
  'TypeScriptの特徴は？',
  3,
  {
    author: 'Alice',
  }
)
```

### リトリーバーの作成

```typescript
const retriever = vectorStore.asRetriever({
  k: 3,                    // 取得する件数
  searchType: 'similarity', // 検索タイプ
})

// リトリーバーを使った検索
const docs = await retriever.getRelevantDocuments('TypeScriptの特徴は？')
```

### MMR（Maximum Marginal Relevance）

多様性を考慮した検索。類似度が高いだけでなく、互いに異なるドキュメントを取得します。

```typescript
const retriever = vectorStore.asRetriever({
  k: 5,
  searchType: 'mmr',
  searchKwargs: {
    fetchK: 20,          // 候補を20件取得
    lambda: 0.5,         // 多様性のバランス（0〜1）
  },
})
```

## RAGチェーンの構築

### 基本的なRAGチェーン

```typescript
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { StringOutputParser } from '@langchain/core/output_parsers'

const llm = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0,
})

const prompt = ChatPromptTemplate.fromTemplate(`
以下のコンテキストを使って質問に答えてください。
コンテキストに情報がない場合は「わかりません」と答えてください。

コンテキスト:
{context}

質問: {question}

回答:
`)

const ragChain = RunnableSequence.from([
  {
    context: async (input: { question: string }) => {
      const docs = await retriever.getRelevantDocuments(input.question)
      return docs.map((doc) => doc.pageContent).join('\n\n')
    },
    question: (input: { question: string }) => input.question,
  },
  prompt,
  llm,
  new StringOutputParser(),
])

// 実行
const answer = await ragChain.invoke({
  question: 'TypeScriptの主な特徴は何ですか？',
})

console.log(answer)
```

### ソース付きRAG

```typescript
import { RunnableMap } from '@langchain/core/runnables'

const ragChainWithSources = RunnableSequence.from([
  RunnableMap.from({
    context: async (input: { question: string }) => {
      return await retriever.getRelevantDocuments(input.question)
    },
    question: (input: { question: string }) => input.question,
  }),
  {
    answer: RunnableSequence.from([
      {
        context: (input: { context: Document[] }) =>
          input.context.map((doc) => doc.pageContent).join('\n\n'),
        question: (input: { question: string }) => input.question,
      },
      prompt,
      llm,
      new StringOutputParser(),
    ]),
    sources: (input: { context: Document[] }) => input.context,
  },
])

const result = await ragChainWithSources.invoke({
  question: 'TypeScriptの特徴は？',
})

console.log('回答:', result.answer)
console.log('ソース:')
result.sources.forEach((doc) => {
  console.log(`- ${doc.metadata.source}`)
})
```

### 会話型RAG

```typescript
import { BufferMemory } from 'langchain/memory'
import { ConversationChain } from 'langchain/chains'

const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: 'chat_history',
})

const conversationalPrompt = ChatPromptTemplate.fromTemplate(`
以下の会話履歴とコンテキストを使って質問に答えてください。

会話履歴:
{chat_history}

コンテキスト:
{context}

質問: {question}

回答:
`)

const conversationalRagChain = RunnableSequence.from([
  {
    context: async (input: { question: string; chat_history: string }) => {
      const docs = await retriever.getRelevantDocuments(input.question)
      return docs.map((doc) => doc.pageContent).join('\n\n')
    },
    question: (input: { question: string }) => input.question,
    chat_history: async (input: { question: string }) => {
      const history = await memory.loadMemoryVariables({})
      return history.chat_history || ''
    },
  },
  conversationalPrompt,
  llm,
  new StringOutputParser(),
])

// 会話
const answer1 = await conversationalRagChain.invoke({
  question: 'TypeScriptとは何ですか？',
})
await memory.saveContext(
  { input: 'TypeScriptとは何ですか？' },
  { output: answer1 }
)

const answer2 = await conversationalRagChain.invoke({
  question: 'それの主な利点は何ですか？',
})
console.log(answer2) // 「それ」がTypeScriptを指すことを理解
```

## ドキュメントローダー

### テキストファイル

```typescript
import { TextLoader } from 'langchain/document_loaders/fs/text'

const loader = new TextLoader('document.txt')
const docs = await loader.load()
```

### PDF

```typescript
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'

const loader = new PDFLoader('document.pdf')
const docs = await loader.load()
```

### Webページ

```typescript
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'

const loader = new CheerioWebBaseLoader('https://example.com')
const docs = await loader.load()
```

### GitHubリポジトリ

```typescript
import { GithubRepoLoader } from 'langchain/document_loaders/web/github'

const loader = new GithubRepoLoader(
  'https://github.com/username/repo',
  {
    branch: 'main',
    recursive: true,
    unknown: 'warn',
  }
)

const docs = await loader.load()
```

### JSON

```typescript
import { JSONLoader } from 'langchain/document_loaders/fs/json'

const loader = new JSONLoader(
  'data.json',
  ['/content', '/title'] // 抽出するフィールド
)

const docs = await loader.load()
```

## 実践的なRAGシステム

### ドキュメント管理システム

```typescript
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { OpenAIEmbeddings } from '@langchain/openai'
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'

class DocumentManager {
  private vectorStore: HNSWLib | null = null
  private embeddings: OpenAIEmbeddings
  private splitter: RecursiveCharacterTextSplitter

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
    })
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    })
  }

  async initialize(storagePath?: string) {
    if (storagePath) {
      this.vectorStore = await HNSWLib.load(storagePath, this.embeddings)
    }
  }

  async addDocument(filePath: string, metadata: Record<string, any> = {}) {
    let loader
    if (filePath.endsWith('.pdf')) {
      loader = new PDFLoader(filePath)
    } else {
      loader = new TextLoader(filePath)
    }

    const docs = await loader.load()

    // メタデータを追加
    docs.forEach((doc) => {
      doc.metadata = { ...doc.metadata, ...metadata, filePath }
    })

    const chunks = await this.splitter.splitDocuments(docs)

    if (!this.vectorStore) {
      this.vectorStore = await HNSWLib.fromDocuments(chunks, this.embeddings)
    } else {
      await this.vectorStore.addDocuments(chunks)
    }
  }

  async search(query: string, k = 5) {
    if (!this.vectorStore) {
      throw new Error('ベクトルストアが初期化されていません')
    }

    return await this.vectorStore.similaritySearchWithScore(query, k)
  }

  async save(path: string) {
    if (!this.vectorStore) {
      throw new Error('ベクトルストアが初期化されていません')
    }

    await this.vectorStore.save(path)
  }
}

// 使用例
const manager = new DocumentManager()

// ドキュメントを追加
await manager.addDocument('doc1.txt', { category: 'tech', author: 'Alice' })
await manager.addDocument('doc2.pdf', { category: 'business', author: 'Bob' })

// 検索
const results = await manager.search('TypeScriptについて教えて', 3)
results.forEach(([doc, score]) => {
  console.log(`スコア: ${score}`)
  console.log(`内容: ${doc.pageContent}`)
  console.log(`メタデータ: ${JSON.stringify(doc.metadata)}`)
})

// 保存
await manager.save('vectorstore')
```

### チャットボットAPI

```typescript
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { StringOutputParser } from '@langchain/core/output_parsers'

class RAGChatbot {
  private chain: any
  private retriever: any

  constructor(vectorStore: HNSWLib) {
    this.retriever = vectorStore.asRetriever({ k: 3 })

    const llm = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
    })

    const prompt = ChatPromptTemplate.fromTemplate(`
あなたは親切なアシスタントです。以下のコンテキストを使って質問に答えてください。
コンテキストに情報がない場合は、そのことを正直に伝えてください。

コンテキスト:
{context}

質問: {question}

回答:
    `)

    this.chain = RunnableSequence.from([
      {
        context: async (input: { question: string }) => {
          const docs = await this.retriever.getRelevantDocuments(input.question)
          return docs.map((doc) => doc.pageContent).join('\n\n')
        },
        question: (input: { question: string }) => input.question,
      },
      prompt,
      llm,
      new StringOutputParser(),
    ])
  }

  async chat(question: string) {
    return await this.chain.invoke({ question })
  }
}

// Express APIとして公開
import express from 'express'

const app = express()
app.use(express.json())

const manager = new DocumentManager()
await manager.initialize('vectorstore')

const chatbot = new RAGChatbot(manager['vectorStore']!)

app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body
    const answer = await chatbot.chat(question)
    res.json({ answer })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => {
  console.log('サーバー起動: http://localhost:3000')
})
```

## パフォーマンス最適化

### キャッシュ

```typescript
import { InMemoryCache } from '@langchain/core/caches'
import { ChatOpenAI } from '@langchain/openai'

const cache = new InMemoryCache()

const llm = new ChatOpenAI({
  modelName: 'gpt-4o',
  cache,
})

// 同じクエリは2回目以降キャッシュから返される
const answer1 = await llm.invoke('TypeScriptとは？')
const answer2 = await llm.invoke('TypeScriptとは？') // キャッシュから
```

### バッチ処理

```typescript
// 複数のクエリをバッチ処理
const questions = [
  'TypeScriptとは？',
  'JavaScriptとの違いは？',
  '型システムの利点は？',
]

const answers = await Promise.all(
  questions.map((q) => chatbot.chat(q))
)
```

### ストリーミング

```typescript
const streamingLLM = new ChatOpenAI({
  modelName: 'gpt-4o',
  streaming: true,
})

const stream = await streamingLLM.stream('TypeScriptについて詳しく教えて')

for await (const chunk of stream) {
  process.stdout.write(chunk.content)
}
```

## まとめ

LangChain.jsを使えば、TypeScriptで強力なRAGシステムを構築できます。

主なポイント:

- **テキスト分割**: RecursiveCharacterTextSplitter
- **ベクトルストア**: HNSWLib、Pinecone、Supabase
- **リトリーバル**: 類似度検索、MMR、メタデータフィルタリング
- **チェーン**: 基本RAG、ソース付きRAG、会話型RAG
- **ドキュメントローダー**: PDF、Web、GitHub、JSON
- **最適化**: キャッシュ、バッチ処理、ストリーミング

RAGを活用することで、LLMの知識を外部データで拡張し、より正確で信頼性の高いAIアプリケーションを構築できます。
