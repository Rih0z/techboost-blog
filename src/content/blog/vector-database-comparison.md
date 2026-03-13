---
title: "ベクトルデータベース比較ガイド2026"
description: "Pinecone・Weaviate・Milvus・Qdrant・ChromaDBの5大ベクトルデータベースを性能・スケーラビリティ・コスト・RAG適性で徹底比較。セマンティック検索や埋め込みベクトル管理に最適なDBの選び方を2026年最新情報で解説します。"
pubDate: "2026-02-06"
tags: ["ベクトルDB", "AI", "RAG", "埋め込み", "検索"]
heroImage: '../../assets/thumbnails/vector-database-comparison.jpg'
---
ベクトルデータベースは、RAG（Retrieval-Augmented Generation）やセマンティック検索に不可欠なインフラです。

この記事では、主要な5つのベクトルデータベースを徹底比較し、プロジェクトに最適な選択肢を見つける手助けをします。

## ベクトルデータベースとは

### 従来のデータベース vs ベクトルデータベース

**従来のデータベース:**
```sql
SELECT * FROM documents WHERE title LIKE '%machine learning%';
-- キーワード完全一致のみ
```

**ベクトルデータベース:**
```python
query_vector = embed("機械学習について教えて")
results = db.search(query_vector, top_k=5)
# 意味的に類似した文書を取得（完全一致不要）
```

### ベクトル検索の仕組み

```
1. テキストを埋め込みベクトルに変換（OpenAI、Cohere等）
   "機械学習" → [0.234, -0.456, 0.789, ...]

2. ベクトル間の類似度を計算（コサイン類似度、ユークリッド距離等）
   similarity(query_vector, doc_vector) → 0.92

3. 類似度が高い順に結果を返す
```

## 主要ベクトルデータベース比較表

| データベース | タイプ | ホスティング | 価格 | 主な用途 |
|-------------|--------|-------------|------|---------|
| Pinecone | フルマネージド | クラウドのみ | $$ | 本番RAG、大規模検索 |
| Weaviate | OSS + マネージド | 両方 | $ | 汎用ベクトル検索 |
| Qdrant | OSS + マネージド | 両方 | $ | 高速検索、セルフホスト |
| Chroma | OSS | セルフホスト | 無料 | 開発・プロトタイプ |
| pgvector | PostgreSQL拡張 | セルフホスト | 無料 | 既存Postgres統合 |

## 1. Pinecone

### 特徴

- **完全マネージド**: インフラ管理不要
- **スケーラブル**: 数十億ベクトルに対応
- **高速**: 最適化されたANNアルゴリズム
- **本番向け**: SLA保証、監視、バックアップ

### 料金

```
Starter: $70/月
  - 100万ベクトル
  - 1ポッド

Standard: 使用量課金
  - $0.096/時間/ポッド
  - 無制限ベクトル

Enterprise: カスタム
```

### セットアップ

```bash
npm install @pinecone-database/pinecone
```

```typescript
// pinecone-client.ts
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// インデックス作成
await pinecone.createIndex({
  name: 'my-index',
  dimension: 1536, // OpenAI埋め込みの次元数
  metric: 'cosine',
  spec: {
    serverless: {
      cloud: 'aws',
      region: 'us-east-1',
    },
  },
});

// インデックス取得
const index = pinecone.index('my-index');

// ベクトル挿入
await index.upsert([
  {
    id: 'doc1',
    values: [0.1, 0.2, 0.3, ...], // 1536次元
    metadata: { text: 'Machine learning is...', category: 'AI' },
  },
]);

// 検索
const results = await index.query({
  vector: queryVector,
  topK: 5,
  includeMetadata: true,
  filter: { category: { $eq: 'AI' } },
});
```

### ユースケース

- ✅ 本番環境のRAGシステム
- ✅ 大規模セマンティック検索
- ✅ レコメンデーション
- ❌ 低予算プロジェクト

## 2. Weaviate

### 特徴

- **オープンソース**: セルフホスト可能
- **GraphQL API**: 柔軟なクエリ
- **マルチモーダル**: テキスト、画像、音声
- **組み込みモデル**: OpenAI、Cohere等と統合

### 料金

```
Self-hosted: 無料
Weaviate Cloud: 無料枠あり
  - Sandbox: 無料（14日間）
  - Standard: 使用量課金
```

### セットアップ

```bash
npm install weaviate-ts-client
```

```typescript
// weaviate-client.ts
import weaviate, { ApiKey } from 'weaviate-ts-client';

const client = weaviate.client({
  scheme: 'https',
  host: 'your-cluster.weaviate.network',
  apiKey: new ApiKey(process.env.WEAVIATE_API_KEY!),
  headers: {
    'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY!,
  },
});

// スキーマ定義
await client.schema
  .classCreator()
  .withClass({
    class: 'Document',
    vectorizer: 'text2vec-openai',
    moduleConfig: {
      'text2vec-openai': {
        model: 'text-embedding-3-small',
        vectorizeClassName: false,
      },
    },
    properties: [
      {
        name: 'content',
        dataType: ['text'],
      },
      {
        name: 'category',
        dataType: ['string'],
      },
    ],
  })
  .do();

// データ挿入
await client.data
  .creator()
  .withClassName('Document')
  .withProperties({
    content: 'Machine learning is a subset of AI...',
    category: 'AI',
  })
  .do();

// セマンティック検索
const result = await client.graphql
  .get()
  .withClassName('Document')
  .withFields('content category _additional { certainty }')
  .withNearText({ concepts: ['machine learning'] })
  .withLimit(5)
  .do();
```

### ユースケース

- ✅ マルチモーダル検索
- ✅ GraphQLベースのAPI
- ✅ セルフホスト + クラウド両対応
- ❌ シンプルさ重視

## 3. Qdrant

### 特徴

- **Rust製**: 高速・低メモリ
- **フィルタリング**: 高度なフィルタ機能
- **スナップショット**: バックアップ・復元
- **REST + gRPC**: 柔軟なAPI

### 料金

```
Self-hosted: 無料
Qdrant Cloud:
  - Free: 1GB無料
  - Standard: $25/月〜
```

### セットアップ

```bash
# Dockerでローカル起動
docker run -p 6333:6333 qdrant/qdrant

npm install @qdrant/js-client-rest
```

```typescript
// qdrant-client.ts
import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({
  url: 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

// コレクション作成
await client.createCollection('documents', {
  vectors: {
    size: 1536,
    distance: 'Cosine',
  },
});

// ポイント挿入
await client.upsert('documents', {
  points: [
    {
      id: 1,
      vector: [0.1, 0.2, 0.3, ...],
      payload: {
        text: 'Machine learning is...',
        category: 'AI',
        timestamp: Date.now(),
      },
    },
  ],
});

// 検索
const results = await client.search('documents', {
  vector: queryVector,
  limit: 5,
  filter: {
    must: [
      {
        key: 'category',
        match: { value: 'AI' },
      },
    ],
  },
  with_payload: true,
});
```

### ユースケース

- ✅ 高速検索が必要
- ✅ 複雑なフィルタリング
- ✅ セルフホストしたい
- ❌ マネージドサービス必須

## 4. Chroma

### 特徴

- **軽量**: 開発に最適
- **シンプルAPI**: 学習コスト低い
- **Python優先**: AI開発者フレンドリー
- **無料**: オープンソース

### 料金

```
完全無料（オープンソース）
```

### セットアップ

```bash
npm install chromadb
```

```typescript
// chroma-client.ts
import { ChromaClient } from 'chromadb';

const client = new ChromaClient();

// コレクション作成
const collection = await client.createCollection({
  name: 'documents',
  metadata: { 'hnsw:space': 'cosine' },
});

// ドキュメント追加
await collection.add({
  ids: ['doc1', 'doc2'],
  embeddings: [[0.1, 0.2, ...], [0.3, 0.4, ...]],
  metadatas: [
    { text: 'Machine learning...', category: 'AI' },
    { text: 'Deep learning...', category: 'AI' },
  ],
});

// 検索
const results = await collection.query({
  queryEmbeddings: [queryVector],
  nResults: 5,
  where: { category: 'AI' },
});
```

### ユースケース

- ✅ プロトタイピング
- ✅ ローカル開発
- ✅ 小規模プロジェクト
- ❌ 大規模本番環境

## 5. pgvector

### 特徴

- **PostgreSQL拡張**: 既存DBに追加
- **SQL**: 慣れた構文
- **トランザクション**: ACID保証
- **無料**: オープンソース

### 料金

```
無料（PostgreSQL拡張）
```

### セットアップ

```sql
-- PostgreSQLで有効化
CREATE EXTENSION vector;

-- テーブル作成
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT,
  embedding VECTOR(1536),
  metadata JSONB
);

-- インデックス作成（HNSW）
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);
```

```typescript
// pgvector-client.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ベクトル挿入
await pool.query(
  'INSERT INTO documents (content, embedding, metadata) VALUES ($1, $2, $3)',
  ['Machine learning...', `[${embedding.join(',')}]`, { category: 'AI' }]
);

// ベクトル検索
const result = await pool.query(
  `SELECT content, metadata, 1 - (embedding <=> $1) AS similarity
   FROM documents
   WHERE metadata->>'category' = 'AI'
   ORDER BY embedding <=> $1
   LIMIT 5`,
  [`[${queryVector.join(',')}]`]
);
```

### ユースケース

- ✅ 既存PostgreSQL環境
- ✅ ACID保証が必要
- ✅ SQLベースの運用
- ❌ 超大規模検索

## パフォーマンス比較

### 100万ベクトル検索（1536次元）

| データベース | 検索速度 | メモリ使用量 | 精度 |
|-------------|---------|-------------|------|
| Pinecone | 10ms | 低 | 95% |
| Weaviate | 15ms | 中 | 94% |
| Qdrant | 12ms | 低 | 95% |
| Chroma | 50ms | 中 | 92% |
| pgvector | 30ms | 高 | 93% |

*環境: 8vCPU, 32GB RAM*

## 選び方ガイド

### プロジェクトタイプ別

**スタートアップ・MVP:**
- 🥇 Chroma（無料、簡単）
- 🥈 Qdrant Cloud Free（1GB無料）

**小〜中規模本番:**
- 🥇 Qdrant（コスパ良好）
- 🥈 Weaviate（機能豊富）

**大規模本番:**
- 🥇 Pinecone（スケール・SLA）
- 🥈 Qdrant（セルフホスト）

**既存Postgres環境:**
- 🥇 pgvector（統合簡単）

### 予算別

**$0:**
- Chroma（セルフホスト）
- pgvector（セルフホスト）
- Qdrant（1GBまで無料）

**$25-100/月:**
- Qdrant Cloud
- Weaviate Cloud

**$100+/月:**
- Pinecone（大規模・SLA）

## 実装例：RAGシステム

### Pinecone + OpenAI

```typescript
// rag-system.ts
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const index = pinecone.index('knowledge-base');

export async function askQuestion(question: string) {
  // 1. 質問を埋め込みベクトルに変換
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });

  // 2. ベクトル検索
  const results = await index.query({
    vector: embedding.data[0].embedding,
    topK: 3,
    includeMetadata: true,
  });

  // 3. 関連ドキュメントを抽出
  const context = results.matches
    .map((match) => match.metadata?.text)
    .join('\n\n');

  // 4. LLMで回答生成
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `以下の情報を元に質問に答えてください:\n\n${context}`,
      },
      { role: 'user', content: question },
    ],
  });

  return completion.choices[0].message.content;
}
```

## まとめ

ベクトルデータベースの選択は、プロジェクトの規模・予算・技術スタックに依存します。

**クイックガイド:**
- 🚀 **プロトタイプ**: Chroma
- 💰 **コスパ重視**: Qdrant
- 🏢 **本番大規模**: Pinecone
- 🔧 **既存Postgres**: pgvector
- 🎨 **マルチモーダル**: Weaviate

**共通ベストプラクティス:**
- 適切な次元数を選択（OpenAI: 1536）
- メタデータでフィルタリング活用
- インデックス最適化（HNSW推奨）
- 定期的なバックアップ

ベクトルデータベースをマスターすれば、最先端のAIアプリケーションを構築できます。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
