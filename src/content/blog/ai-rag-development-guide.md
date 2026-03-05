---
title: 'RAG（検索拡張生成）開発実践ガイド - 精度の高いAIチャットボット構築【2026年版】'
description: 'Retrieval-Augmented Generation（RAG）の基礎から実装まで。ベクトルDB選定、埋め込み生成、チャンク戦略など、実践的なRAGシステムの作り方を解説します。'
pubDate: 'Feb 05 2026'
tags: ['RAG', 'AI', 'LLM', 'プログラミング']
---

RAG（Retrieval-Augmented Generation：検索拡張生成）は、大規模言語モデル（LLM）に外部知識を与えることで、より正確で最新の情報を含む回答を生成する技術です。

2026年現在、ほとんどの本格的なAIチャットボットやアシスタントがRAGを採用しています。

## RAGとは

### 従来のLLMの課題

**問題点:**
- 学習データの日付以降の情報を知らない
- 社内文書など非公開情報にアクセスできない
- ハルシネーション（嘘の情報を自信満々に語る）

### RAGの解決策

RAGは以下のステップで動作します:

1. **ユーザーの質問を受け取る**
2. **関連する文書を検索する**（ベクトル検索）
3. **検索結果をコンテキストとしてLLMに渡す**
4. **LLMが回答を生成**

これにより、LLMが最新情報や特定領域の知識を使って回答できます。

## RAGシステムの構成要素

### 1. ドキュメントローダー

テキスト、PDF、Markdown、Webページなどから文書を読み込みます。

### 2. テキスト分割（Chunking）

長い文書を適切なサイズに分割します。

### 3. 埋め込みモデル（Embedding Model）

テキストを数値ベクトルに変換します。

### 4. ベクトルデータベース

埋め込みベクトルを保存・検索します。

### 5. LLM

最終的な回答を生成します。

## 実装例（LangChain + OpenAI）

### 必要なパッケージ

```bash
npm install langchain @langchain/openai @langchain/community \
  @langchain/pinecone hnswlib-node pdf-parse
```

### ドキュメントの読み込みと分割

```typescript
// src/ingest.ts
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";

async function ingestDocuments() {
  // 1. PDFを読み込み
  const loader = new PDFLoader("./data/company-handbook.pdf");
  const docs = await loader.load();

  // 2. チャンク分割
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const splitDocs = await splitter.splitDocuments(docs);

  console.log(`Split into ${splitDocs.length} chunks`);

  // 3. 埋め込み生成
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small", // コスパ最高
  });

  // 4. Pineconeに保存
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

  await PineconeStore.fromDocuments(splitDocs, embeddings, {
    pineconeIndex: index,
    namespace: "company-docs",
  });

  console.log("Ingestion complete!");
}

ingestDocuments();
```

### 質問応答システム

```typescript
// src/query.ts
import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { RetrievalQAChain } from "langchain/chains";

async function query(question: string) {
  // 1. Pineconeに接続
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

  // 2. ベクトルストア初期化
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
  });

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace: "company-docs",
  });

  // 3. LLM初期化
  const llm = new OpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  });

  // 4. RetrievalQAチェーン作成
  const chain = RetrievalQAChain.fromLLM(llm, vectorStore.asRetriever(4));

  // 5. 質問実行
  const result = await chain.invoke({ query: question });

  return result.text;
}

// 使用例
const answer = await query("有給休暇の申請方法は？");
console.log(answer);
```

## ローカルベクトルDB（HNSWLib）

Pineconeの代わりに、ローカルで動くHNSWLibも使えます。

```typescript
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "@langchain/openai";

// 保存
const vectorStore = await HNSWLib.fromDocuments(
  splitDocs,
  new OpenAIEmbeddings()
);

await vectorStore.save("./data/vectorstore");

// 読み込み
const loadedVectorStore = await HNSWLib.load(
  "./data/vectorstore",
  new OpenAIEmbeddings()
);
```

小規模なら十分です。

## チャンク戦略の最適化

### 固定サイズチャンク

```typescript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
```

### セマンティックチャンク

意味のある単位で分割:

```typescript
import { MarkdownTextSplitter } from "langchain/text_splitter";

const splitter = new MarkdownTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 100,
});
```

見出しごとに自然に分割されます。

### 親子チャンク

大きなチャンクと小さなチャンクを組み合わせる高度な手法:

```typescript
// 親チャンク（1500文字）
const parentSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 100,
});

// 子チャンク（500文字）
const childSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
});

// 子チャンクで検索し、親チャンクをLLMに渡す
```

## ストリーミング応答

リアルタイムに回答を表示:

```typescript
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  streaming: true,
});

const chain = RetrievalQAChain.fromLLM(
  llm,
  vectorStore.asRetriever()
);

const stream = await chain.stream({ query: "質問内容" });

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

## 会話履歴の保持

```typescript
import { BufferMemory } from "langchain/memory";
import { ConversationalRetrievalQAChain } from "langchain/chains";

const memory = new BufferMemory({
  memoryKey: "chat_history",
  returnMessages: true,
});

const chain = ConversationalRetrievalQAChain.fromLLM(
  llm,
  vectorStore.asRetriever(),
  { memory }
);

// 1回目
await chain.invoke({ question: "RAGとは何ですか？" });

// 2回目（前の会話を覚えている）
await chain.invoke({ question: "具体的な使用例を教えて" });
```

## Next.js APIルート実装

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { RetrievalQAChain } from "langchain/chains";

let vectorStore: HNSWLib | null = null;

async function getVectorStore() {
  if (!vectorStore) {
    vectorStore = await HNSWLib.load(
      "./data/vectorstore",
      new OpenAIEmbeddings()
    );
  }
  return vectorStore;
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    const store = await getVectorStore();

    const llm = new OpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
    });

    const chain = RetrievalQAChain.fromLLM(
      llm,
      store.asRetriever(4)
    );

    const result = await chain.invoke({ query: question });

    return NextResponse.json({ answer: result.text });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## ハイブリッド検索（キーワード + ベクトル）

ベクトル検索だけでなく、キーワード検索も組み合わせるとより精度向上:

```typescript
import { ScoreThresholdRetriever } from "langchain/retrievers/score_threshold";

const retriever = ScoreThresholdRetriever.fromVectorStore(vectorStore, {
  minSimilarityScore: 0.7,
  maxK: 5,
  kIncrement: 1,
});
```

## メタデータフィルタリング

```typescript
// ドキュメントにメタデータを追加
const docsWithMetadata = splitDocs.map((doc, i) => ({
  ...doc,
  metadata: {
    ...doc.metadata,
    source: "handbook",
    category: "hr",
    timestamp: new Date().toISOString(),
  },
}));

// フィルタ付きで検索
const results = await vectorStore.similaritySearch(
  "有給休暇",
  4,
  { category: "hr" }
);
```

## コスト削減のヒント

### 埋め込みモデルの選択

- `text-embedding-3-small`: 安い、速い、精度も十分
- `text-embedding-3-large`: 高精度、やや高い

### キャッシング

同じ質問への回答をキャッシュ:

```typescript
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

const cacheKey = `rag:${hashQuestion(question)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const answer = await chain.invoke({ query: question });
await redis.setex(cacheKey, 3600, JSON.stringify(answer));
```

## よくある問題と対処法

### 1. 回答が不正確

- チャンクサイズを調整（小さくする）
- 検索件数を増やす（`k=4` → `k=8`）
- プロンプトを改善

### 2. レイテンシが高い

- 埋め込みモデルを軽量化
- ベクトルDBを最適化
- キャッシング導入

### 3. 関連性の低い文書が返ってくる

- スコア閾値を設定
- メタデータフィルタリング
- リランキングを導入

## まとめ

RAGは、LLMの可能性を大きく広げる技術です。実装の流れは:

1. 文書を収集
2. チャンク分割
3. 埋め込み生成
4. ベクトルDB保存
5. 検索 + LLM生成

LangChainを使えば、複雑な部分を抽象化して簡単に構築できます。まずは小規模なデータセットで試し、徐々に改善していくのがおすすめです。
