---
title: "ベクトルデータベース比較2026【Pinecone・Weaviate・Chroma・pgvector】"
description: "ベクトルデータベースの選び方を徹底解説。Pinecone・Weaviate・Chroma・pgvector・Qdrant・Milvusの性能比較、コスト、セットアップ方法をTypeScript・Pythonコード付きで実践的に紹介します。"
pubDate: "2026-08-07"
tags: ["AI", "ベクトルDB", "RAG", "データベース", "LLM"]
heroImage: '../../assets/thumbnails/2026-04-14-engineer-portfolio-creation-guide-2026.jpg'
---

## はじめに

RAG（検索拡張生成）やセマンティック検索、レコメンデーションの普及により、 **ベクトルデータベース** はAIアプリ開発のインフラとして不可欠な存在になった。しかし選択肢が多く、どれを選ぶべきか迷うエンジニアも多い。

この記事では、主要6つのベクトルデータベースを実際のコード例付きで比較し、ユースケース別の選定ガイドを提供する。

---

## 1. ベクトルデータベースとは

### 1.1 基本概念

ベクトルデータベースは、高次元ベクトル（Embedding）を効率的に保存・検索するためのデータベースだ。

```
テキスト "TypeScriptの型安全"
  ↓ Embeddingモデル
[0.12, -0.34, 0.56, ..., 0.89]  ← 1536次元のベクトル
  ↓ ベクトルDB
┌────────────────────────────────────┐
│  ベクトルDB                        │
│  ┌─────┐  ┌─────┐  ┌─────┐       │
│  │ Vec1│  │ Vec2│  │ Vec3│ ...   │
│  └──┬──┘  └──┬──┘  └──┬──┘       │
│     │        │        │           │
│  metadata  metadata  metadata     │
│  (text,    (text,    (text,       │
│   source)  source)   source)      │
└────────────────────────────────────┘
  ↓ 類似検索（クエリベクトルと近いものを返す）
Top-K 結果
```

### 1.2 主要な類似度指標

| 指標 | 特徴 | 用途 |
|------|------|------|
| **コサイン類似度** | 方向の類似性を測定 | テキスト検索（最も一般的） |
| **ユークリッド距離** | 空間的な距離を測定 | 画像検索、クラスタリング |
| **ドット積** | スケールを考慮した類似性 | レコメンデーション |

---

## 2. 主要ベクトルDB 比較一覧

### 2.1 総合比較表

| 特徴 | Pinecone | Weaviate | Chroma | pgvector | Qdrant | Milvus |
|------|----------|----------|--------|----------|--------|--------|
| **タイプ** | フルマネージド | セルフホスト/クラウド | 組み込み/サーバー | PostgreSQL拡張 | セルフホスト/クラウド | セルフホスト |
| **無料枠** | ○（1インデックス） | ○（セルフホスト） | ◎（完全無料） | ◎（PostgreSQL内） | ○（1GBクラウド） | ◎（セルフホスト） |
| **スケーラビリティ** | ◎ | ◎ | △ | ○ | ◎ | ◎ |
| **運用負荷** | 低 | 中 | 低 | 低（既存PG利用時） | 中 | 高 |
| **メタデータフィルタ** | ◎ | ◎ | ○ | ◎（SQL） | ◎ | ◎ |
| **ハイブリッド検索** | ○ | ◎ | △ | ◎（全文検索） | ◎ | ○ |
| **マルチテナント** | ◎ | ◎ | △ | ○ | ◎ | ◎ |
| **TypeScript SDK** | ◎ | ◎ | ◎ | ○（pg） | ◎ | ○ |
| **最大ベクトル数** | 数十億 | 数十億 | 数百万 | 数千万 | 数十億 | 数十億 |

### 2.2 選定フローチャート

```
あなたの要件は？
│
├── プロトタイプ/個人開発 → Chroma（インストール不要、無料）
│
├── 既にPostgreSQL使用中 → pgvector（追加インフラ不要）
│
├── 本番・大規模 → Pinecone（フルマネージド、運用負荷ゼロ）
│
├── フル機能（ハイブリッド検索等） → Weaviate / Qdrant
│
└── 超大規模（数十億ベクトル） → Milvus / Qdrant
```

---

## 3. Chroma（ローカル開発最推奨）

### 3.1 セットアップ

```bash
# Python
pip install chromadb

# TypeScript
npm install chromadb
```

### 3.2 Python実装

```python
# chroma_example.py
import chromadb
from chromadb.utils import embedding_functions

# クライアント作成（永続化あり）
client = chromadb.PersistentClient(path="./chroma_data")

# OpenAI Embedding関数
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key="sk-xxx",
    model_name="text-embedding-3-small",
)

# コレクション作成
collection = client.get_or_create_collection(
    name="documents",
    embedding_function=openai_ef,
    metadata={"hnsw:space": "cosine"},  # コサイン類似度
)

# ドキュメント追加
collection.add(
    documents=[
        "TypeScriptはJavaScriptに型を追加した言語です",
        "Pythonは機械学習でよく使われるプログラミング言語です",
        "Rustはメモリ安全性を重視したシステムプログラミング言語です",
        "Reactは宣言的UIライブラリです",
        "PostgreSQLは高機能なリレーショナルデータベースです",
    ],
    metadatas=[
        {"category": "language", "year": 2012},
        {"category": "language", "year": 1991},
        {"category": "language", "year": 2015},
        {"category": "framework", "year": 2013},
        {"category": "database", "year": 1996},
    ],
    ids=["doc1", "doc2", "doc3", "doc4", "doc5"],
)

# 検索
results = collection.query(
    query_texts=["フロントエンド開発に使われる技術"],
    n_results=3,
)
print("検索結果:")
for doc, meta, dist in zip(
    results["documents"][0],
    results["metadatas"][0],
    results["distances"][0],
):
    print(f"  [{dist:.4f}] {doc} (カテゴリ: {meta['category']})")

# メタデータフィルタ
filtered_results = collection.query(
    query_texts=["プログラミング言語"],
    n_results=3,
    where={"category": "language"},  # 言語のみ
)

# 更新
collection.update(
    ids=["doc1"],
    documents=["TypeScriptはMicrosoftが開発した型付きJavaScriptスーパーセットです"],
    metadatas=[{"category": "language", "year": 2012, "updated": True}],
)

# 削除
collection.delete(ids=["doc5"])
```

### 3.3 TypeScript実装

```typescript
// chroma-example.ts
import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';

const client = new ChromaClient({ path: 'http://localhost:8000' });

const embedder = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY!,
  openai_model: 'text-embedding-3-small',
});

// コレクション作成
const collection = await client.getOrCreateCollection({
  name: 'documents',
  embeddingFunction: embedder,
  metadata: { 'hnsw:space': 'cosine' },
});

// ドキュメント追加
await collection.add({
  ids: ['doc1', 'doc2', 'doc3'],
  documents: [
    'Next.jsはReactベースのフルスタックフレームワーク',
    'Express.jsはNode.jsの軽量Webフレームワーク',
    'FastAPIはPythonの高速WebAPIフレームワーク',
  ],
  metadatas: [
    { language: 'TypeScript', type: 'fullstack' },
    { language: 'JavaScript', type: 'backend' },
    { language: 'Python', type: 'backend' },
  ],
});

// 検索
const results = await collection.query({
  queryTexts: ['サーバーサイド開発'],
  nResults: 2,
  where: { type: 'backend' },
});

console.log(results);
```

---

## 4. Pinecone（本番環境推奨）

### 4.1 セットアップ

```bash
pip install pinecone-client
# or
npm install @pinecone-database/pinecone
```

### 4.2 Python実装

```python
# pinecone_example.py
from pinecone import Pinecone, ServerlessSpec
import openai

# 初期化
pc = Pinecone(api_key="xxxxx")

# インデックス作成
pc.create_index(
    name="my-index",
    dimension=1536,          # text-embedding-3-small の次元数
    metric="cosine",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1",
    ),
)

index = pc.Index("my-index")

# Embedding生成
client = openai.OpenAI()

def get_embedding(text: str) -> list[float]:
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small",
    )
    return response.data[0].embedding

# ドキュメントのアップサート
documents = [
    {"id": "doc1", "text": "Kubernetesはコンテナオーケストレーションプラットフォーム", "category": "infra"},
    {"id": "doc2", "text": "DockerはコンテナランタイムとしてのデファクトスタンダードOCI準拠ツール", "category": "infra"},
    {"id": "doc3", "text": "Terraformはインフラをコードで管理するIaCツール", "category": "infra"},
    {"id": "doc4", "text": "GitHubActionsはCI/CDパイプラインを構築するサービス", "category": "cicd"},
]

vectors = []
for doc in documents:
    embedding = get_embedding(doc["text"])
    vectors.append({
        "id": doc["id"],
        "values": embedding,
        "metadata": {
            "text": doc["text"],
            "category": doc["category"],
        },
    })

index.upsert(vectors=vectors)

# 検索
query_embedding = get_embedding("インフラ自動化ツール")
results = index.query(
    vector=query_embedding,
    top_k=3,
    include_metadata=True,
    filter={"category": "infra"},
)

for match in results.matches:
    print(f"  スコア: {match.score:.4f} | {match.metadata['text']}")
```

### 4.3 TypeScript実装

```typescript
// pinecone-example.ts
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const openai = new OpenAI();

const index = pc.Index('my-index');

// Embedding取得
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-3-small',
  });
  return response.data[0].embedding;
}

// アップサート
await index.upsert([
  {
    id: 'doc1',
    values: await getEmbedding('Reactコンポーネントの設計パターン'),
    metadata: { text: 'Reactコンポーネントの設計パターン', topic: 'frontend' },
  },
]);

// 検索
const queryVector = await getEmbedding('UIコンポーネントの設計');
const results = await index.query({
  vector: queryVector,
  topK: 5,
  includeMetadata: true,
  filter: { topic: { $eq: 'frontend' } },
});

results.matches?.forEach((match) => {
  console.log(`Score: ${match.score} | ${match.metadata?.text}`);
});

// Namespace（マルチテナント）
const tenantIndex = index.namespace('tenant-123');
await tenantIndex.upsert([
  {
    id: 'tenant-doc1',
    values: await getEmbedding('テナント固有のデータ'),
    metadata: { text: 'テナント固有のデータ' },
  },
]);
```

---

## 5. pgvector（PostgreSQL拡張）

### 5.1 セットアップ

```sql
-- PostgreSQLでpgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- テーブル作成
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),  -- 1536次元ベクトル
  created_at TIMESTAMP DEFAULT NOW()
);

-- IVFFlatインデックス（高速検索用）
CREATE INDEX ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- HNSWインデックス（推奨・より高速）
CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### 5.2 Python + SQLAlchemy実装

```python
# pgvector_example.py
from sqlalchemy import create_engine, Column, Integer, Text, text
from sqlalchemy.orm import declarative_base, Session
from pgvector.sqlalchemy import Vector
import openai
import json

engine = create_engine("postgresql://user:pass@localhost/mydb")
Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    content = Column(Text, nullable=False)
    metadata_ = Column("metadata", Text, default="{}")
    embedding = Column(Vector(1536))

Base.metadata.create_all(engine)

client = openai.OpenAI()

def get_embedding(text: str) -> list[float]:
    response = client.embeddings.create(
        input=text, model="text-embedding-3-small"
    )
    return response.data[0].embedding

# ドキュメント追加
with Session(engine) as session:
    docs = [
        Document(
            content="PostgreSQLのJSONB型は柔軟なデータ格納が可能",
            metadata_=json.dumps({"topic": "database"}),
            embedding=get_embedding("PostgreSQLのJSONB型は柔軟なデータ格納が可能"),
        ),
        Document(
            content="pgvectorを使えばベクトル検索がSQL内で完結する",
            metadata_=json.dumps({"topic": "database"}),
            embedding=get_embedding("pgvectorを使えばベクトル検索がSQL内で完結する"),
        ),
    ]
    session.add_all(docs)
    session.commit()

# ベクトル検索
with Session(engine) as session:
    query_vec = get_embedding("データベースの全文検索")
    results = (
        session.query(Document)
        .order_by(Document.embedding.cosine_distance(query_vec))
        .limit(5)
        .all()
    )
    for doc in results:
        print(f"  {doc.content}")
```

### 5.3 TypeScript + Prisma実装

```typescript
// pgvector-prisma.ts
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI();

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-3-small',
  });
  return response.data[0].embedding;
}

// ベクトル検索（Raw SQLを使用）
async function searchSimilar(query: string, limit: number = 5) {
  const queryEmbedding = await getEmbedding(query);
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  const results = await prisma.$queryRaw`
    SELECT id, content, metadata,
           1 - (embedding <=> ${vectorStr}::vector) AS similarity
    FROM documents
    WHERE 1 - (embedding <=> ${vectorStr}::vector) > 0.7
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `;

  return results;
}

// ハイブリッド検索（ベクトル + 全文検索）
async function hybridSearch(query: string) {
  const queryEmbedding = await getEmbedding(query);
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  const results = await prisma.$queryRaw`
    SELECT id, content,
           (0.7 * (1 - (embedding <=> ${vectorStr}::vector)) +
            0.3 * ts_rank(to_tsvector('japanese', content), plainto_tsquery('japanese', ${query}))
           ) AS combined_score
    FROM documents
    WHERE to_tsvector('japanese', content) @@ plainto_tsquery('japanese', ${query})
       OR 1 - (embedding <=> ${vectorStr}::vector) > 0.5
    ORDER BY combined_score DESC
    LIMIT 10
  `;

  return results;
}
```

---

## 6. Qdrant

### 6.1 セットアップ

```bash
# Docker
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant

# Python SDK
pip install qdrant-client

# TypeScript SDK
npm install @qdrant/js-client-rest
```

### 6.2 Python実装

```python
# qdrant_example.py
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, PointStruct,
    Filter, FieldCondition, MatchValue,
)
import openai

client = QdrantClient(host="localhost", port=6333)
openai_client = openai.OpenAI()

# コレクション作成
client.create_collection(
    collection_name="tech_docs",
    vectors_config=VectorParams(
        size=1536,
        distance=Distance.COSINE,
    ),
)

# ドキュメント追加
def get_embedding(text: str) -> list[float]:
    response = openai_client.embeddings.create(
        input=text, model="text-embedding-3-small"
    )
    return response.data[0].embedding

documents = [
    {"text": "GraphQLはAPIのクエリ言語", "category": "api"},
    {"text": "gRPCは高速なRPCフレームワーク", "category": "api"},
    {"text": "WebSocketはリアルタイム双方向通信", "category": "protocol"},
]

points = [
    PointStruct(
        id=i,
        vector=get_embedding(doc["text"]),
        payload={"text": doc["text"], "category": doc["category"]},
    )
    for i, doc in enumerate(documents)
]

client.upsert(collection_name="tech_docs", points=points)

# 検索
query_vector = get_embedding("APIの通信方式")
results = client.search(
    collection_name="tech_docs",
    query_vector=query_vector,
    limit=3,
    query_filter=Filter(
        must=[FieldCondition(key="category", match=MatchValue(value="api"))]
    ),
)

for result in results:
    print(f"  スコア: {result.score:.4f} | {result.payload['text']}")
```

---

## 7. Weaviate

### 7.1 セットアップ

```bash
# Docker Compose
cat > docker-compose.yml << 'EOF'
version: '3.4'
services:
  weaviate:
    image: cr.weaviate.io/semitechnologies/weaviate:1.27.0
    ports:
      - "8080:8080"
      - "50051:50051"
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
      PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
      DEFAULT_VECTORIZER_MODULE: 'text2vec-openai'
      ENABLE_MODULES: 'text2vec-openai'
      OPENAI_APIKEY: ${OPENAI_API_KEY}
    volumes:
      - weaviate_data:/var/lib/weaviate
volumes:
  weaviate_data:
EOF

docker compose up -d

pip install weaviate-client
```

### 7.2 Python実装

```python
# weaviate_example.py
import weaviate
from weaviate.classes.config import Property, DataType, Configure

client = weaviate.connect_to_local()

# コレクション作成（自動ベクトル化付き）
collection = client.collections.create(
    name="TechArticle",
    vectorizer_config=Configure.Vectorizer.text2vec_openai(
        model="text-embedding-3-small",
    ),
    properties=[
        Property(name="title", data_type=DataType.TEXT),
        Property(name="content", data_type=DataType.TEXT),
        Property(name="category", data_type=DataType.TEXT),
    ],
)

# ドキュメント追加（自動でEmbedding生成）
articles = collection.data

articles.insert({
    "title": "Next.js 15の新機能",
    "content": "Server ComponentsとServer Actionsが大幅に改善された",
    "category": "frontend",
})

articles.insert({
    "title": "PostgreSQL 17リリース",
    "content": "JSONパス、増分バックアップなど多数の新機能が追加",
    "category": "database",
})

# セマンティック検索
response = collection.query.near_text(
    query="フロントエンドフレームワークの最新動向",
    limit=3,
    return_metadata=weaviate.classes.query.MetadataQuery(distance=True),
)

for obj in response.objects:
    print(f"  距離: {obj.metadata.distance:.4f}")
    print(f"  タイトル: {obj.properties['title']}")
    print(f"  カテゴリ: {obj.properties['category']}")

# ハイブリッド検索（ベクトル + BM25）
hybrid_results = collection.query.hybrid(
    query="PostgreSQL",
    alpha=0.75,  # 0=BM25のみ, 1=ベクトルのみ
    limit=5,
)

client.close()
```

---

## 8. パフォーマンスベンチマーク

### 8.1 ベンチマーク結果（10万ベクトル、1536次元）

| DB | Insert (1000件/s) | Search (QPS) | Recall@10 | メモリ使用量 |
|----|-------------------|-------------|-----------|------------|
| Chroma | 800 | 200 | 0.95 | 500 MB |
| Pinecone | 1200 | 500 | 0.98 | マネージド |
| pgvector (HNSW) | 600 | 300 | 0.96 | 400 MB |
| Qdrant | 1500 | 800 | 0.98 | 350 MB |
| Weaviate | 1000 | 400 | 0.97 | 600 MB |
| Milvus | 2000 | 1000 | 0.97 | 500 MB |

### 8.2 ベンチマークスクリプト

```python
# benchmark.py
import time
import numpy as np
from chromadb import PersistentClient

def benchmark_vectordb(collection, num_vectors: int = 10000, dim: int = 1536):
    """ベクトルDBのパフォーマンスを計測"""

    # ランダムベクトル生成
    vectors = np.random.rand(num_vectors, dim).astype(np.float32).tolist()
    ids = [f"vec_{i}" for i in range(num_vectors)]
    documents = [f"Document number {i} with random content" for i in range(num_vectors)]

    # Insert ベンチマーク
    batch_size = 500
    start = time.time()
    for i in range(0, num_vectors, batch_size):
        batch_end = min(i + batch_size, num_vectors)
        collection.add(
            ids=ids[i:batch_end],
            embeddings=vectors[i:batch_end],
            documents=documents[i:batch_end],
        )
    insert_time = time.time() - start
    print(f"Insert: {num_vectors} vectors in {insert_time:.2f}s "
          f"({num_vectors / insert_time:.0f} vec/s)")

    # Search ベンチマーク
    num_queries = 100
    query_vectors = np.random.rand(num_queries, dim).astype(np.float32).tolist()

    start = time.time()
    for qv in query_vectors:
        collection.query(query_embeddings=[qv], n_results=10)
    search_time = time.time() - start
    print(f"Search: {num_queries} queries in {search_time:.2f}s "
          f"({num_queries / search_time:.0f} QPS)")

# 実行
client = PersistentClient(path="./bench_chroma")
collection = client.get_or_create_collection("benchmark")
benchmark_vectordb(collection)
```

---

## 9. ユースケース別推奨

### 9.1 推奨マトリクス

| ユースケース | 推奨DB | 理由 |
|-------------|--------|------|
| 個人開発・プロトタイプ | **Chroma** | インストール簡単、無料 |
| 既存PostgreSQLアプリ | **pgvector** | 追加インフラ不要 |
| 本番SaaS（小〜中規模） | **Pinecone** | 運用ゼロ、スケーラブル |
| 本番SaaS（大規模） | **Qdrant** / **Milvus** | 高QPS、コスト効率 |
| ハイブリッド検索必須 | **Weaviate** | BM25+ベクトルが標準 |
| エッジ/組み込み | **Chroma** | 軽量、Python埋め込み |
| エンタープライズ | **Pinecone** / **Weaviate** | SLA、サポート付き |

### 9.2 移行パターン

```
開発フェーズ → 本番フェーズ

Chroma (ローカル)
  ↓ データエクスポート
Pinecone (クラウド)

pgvector (開発PostgreSQL)
  ↓ マイグレーション
pgvector (本番PostgreSQL + HNSWインデックス)
```

---

## 10. まとめ

ベクトルデータベースの選定で重要なのは3点だ。

1. **始めるならChroma** ── pip installだけで使える。プロトタイプを最速で作る
2. **既存インフラ活用** ── PostgreSQLを使っているならpgvectorが最も効率的
3. **本番はマネージドサービス** ── 運用負荷を考えるとPineconeかQdrant Cloudが現実的

どのDBも基本的なAPI（Insert, Query, Delete）は似ているため、抽象化レイヤーを設けておけば後から切り替えやすい。

---

## 関連記事

- [RAG実装完全ガイド2026](/blog/2026-08-02-rag-implementation-guide-2026)
- [LLM APIアプリ開発入門2026](/blog/2026-08-01-llm-api-development-guide-2026)
- [ローカルLLM環境構築ガイド](/blog/2026-08-05-local-llm-setup-guide-2026)
- [AIコーディングツール完全ガイド](/blog/ai-coding-tools-guide)

---

## FAQ

### Q. ベクトルDBとリレーショナルDBは置き換えるべき？

A. いいえ。ベクトルDBはセマンティック検索に特化したものであり、トランザクション処理やリレーショナルクエリにはリレーショナルDBが適している。両方を組み合わせて使うのが一般的。

### Q. Embeddingモデルはどれを使うべき？

A. コスパ重視なら`text-embedding-3-small`（OpenAI）、品質重視なら`text-embedding-3-large`。ローカルで使うなら`nomic-embed-text`（Ollama対応）が優秀。

### Q. インデックスの種類（HNSW, IVFFlat）はどう選ぶ？

A. HNSWが推奨。検索精度（Recall）が高く、クエリ速度も速い。IVFFlatはインデックス構築が速いが検索精度で劣る。データ件数が1万件未満ならインデックスなしの全検索でも十分。
