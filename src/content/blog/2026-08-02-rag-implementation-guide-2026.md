---
title: "RAG実装完全ガイド2026【LangChain・ベクトルDB活用】"
description: "RAG（検索拡張生成）の実装を基礎から解説。LangChain/LlamaIndexでの構築、Chroma/Pineconeベクトルデータベース活用、チャンキング戦略、リランキング、評価手法までTypeScript・Pythonコード付きで実践的に紹介します。"
pubDate: "2026-03-12"
tags: ["AI", "RAG", "LangChain", "ベクトルDB", "LLM"]
heroImage: '../../assets/thumbnails/ai-agent-development-2026.jpg'
---

## はじめに

LLMは膨大な知識を持つが、「自社の社内文書に基づいて回答してほしい」「最新情報を反映した回答がほしい」といったケースでは、そのままでは使えない。ここで登場するのが **RAG（Retrieval-Augmented Generation: 検索拡張生成）** だ。

RAGは「関連文書を検索し、その内容をLLMに渡して回答を生成する」アーキテクチャ。ファインチューニングよりもコストが低く、データの更新も容易なため、2026年現在、LLMアプリ開発の標準パターンとなっている。

この記事では、RAGの仕組みから実装、最適化、評価まで、実践的に解説する。

---

## 1. RAGの基本アーキテクチャ

### 1.1 全体フロー

```
┌──────────┐    ┌───────────────┐    ┌──────────────┐
│ ユーザー  │    │  Embedding    │    │ ベクトル      │
│ クエリ    │───▶│  モデル       │───▶│ データベース   │
└──────────┘    └───────────────┘    │ (類似検索)    │
                                     └──────┬───────┘
                                            │ Top-K文書
                                     ┌──────▼───────┐
                                     │ コンテキスト   │
┌──────────┐    ┌───────────────┐    │ + クエリ      │
│ 回答      │◀───│  LLM          │◀───│ → プロンプト  │
└──────────┘    └───────────────┘    └──────────────┘
```

### 1.2 RAGの3フェーズ

| フェーズ | 処理内容 | 主要技術 |
|----------|----------|----------|
| **Indexing** | ドキュメントの分割・埋め込み・保存 | テキスト分割、Embeddingモデル、ベクトルDB |
| **Retrieval** | クエリに関連する文書の検索 | ベクトル類似検索、ハイブリッド検索、リランキング |
| **Generation** | 検索結果を元にLLMが回答生成 | プロンプトテンプレート、出力パース |

---

## 2. 開発環境セットアップ

### 2.1 Python環境（推奨）

```bash
python -m venv .venv
source .venv/bin/activate

# コアライブラリ
pip install langchain langchain-openai langchain-community
pip install llama-index

# ベクトルDB
pip install chromadb          # ローカル用
pip install pinecone-client   # クラウド用

# ドキュメントローダー
pip install pypdf             # PDF読み込み
pip install unstructured       # 汎用ドキュメント解析
pip install tiktoken           # トークンカウント
```

### 2.2 TypeScript環境

```bash
npm install langchain @langchain/openai @langchain/community
npm install chromadb
npm install pdf-parse
npm install tiktoken
```

---

## 3. Phase 1: Indexing（文書のインデックス化）

### 3.1 ドキュメントの読み込み

```python
# indexing.py
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    DirectoryLoader,
    UnstructuredMarkdownLoader,
)

# 単一PDFの読み込み
pdf_loader = PyPDFLoader("docs/company-manual.pdf")
pdf_docs = pdf_loader.load()
print(f"PDF: {len(pdf_docs)} ページ読み込み")

# ディレクトリ内の全Markdownファイルを読み込み
md_loader = DirectoryLoader(
    "docs/",
    glob="**/*.md",
    loader_cls=UnstructuredMarkdownLoader,
)
md_docs = md_loader.load()
print(f"Markdown: {len(md_docs)} ファイル読み込み")

# ドキュメントにメタデータを付与
for doc in pdf_docs:
    doc.metadata["source_type"] = "company_manual"
    doc.metadata["department"] = "engineering"
```

### 3.2 チャンキング戦略（最重要）

チャンキング（テキスト分割）はRAGの精度を最も大きく左右する要素だ。

```python
# chunking.py
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    MarkdownHeaderTextSplitter,
    TokenTextSplitter,
)

# 方法1: 再帰的文字分割（最も汎用的）
recursive_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,        # チャンクの最大文字数
    chunk_overlap=200,      # チャンク間のオーバーラップ
    separators=[
        "\n\n",   # 段落区切り（最優先）
        "\n",     # 行区切り
        "。",     # 日本語文末
        ".",      # 英語文末
        " ",      # スペース
        "",       # 最終手段
    ],
    length_function=len,
)

chunks = recursive_splitter.split_documents(pdf_docs)
print(f"チャンク数: {len(chunks)}")
print(f"平均チャンクサイズ: {sum(len(c.page_content) for c in chunks) / len(chunks):.0f} 文字")

# 方法2: Markdownヘッダーベース分割
md_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[
        ("#", "h1"),
        ("##", "h2"),
        ("###", "h3"),
    ]
)

md_chunks = md_splitter.split_text(md_docs[0].page_content)

# 方法3: トークンベース分割（LLMのコンテキスト管理に最適）
token_splitter = TokenTextSplitter(
    chunk_size=500,          # トークン数
    chunk_overlap=50,
    encoding_name="cl100k_base",  # GPT-4用エンコーディング
)
```

### 3.3 チャンキング最適化ガイド

```
チャンクサイズの選び方:
│
├── 小さい (200-500文字)
│   ├── ✅ 検索精度が高い（ピンポイント）
│   ├── ❌ コンテキスト不足で回答品質が低下
│   └── 用途: FAQ、定義集
│
├── 中 (500-1500文字) ← 推奨
│   ├── ✅ バランスが良い
│   └── 用途: 一般的な文書、マニュアル
│
└── 大きい (1500-3000文字)
    ├── ✅ 十分なコンテキストを提供
    ├── ❌ 検索精度が下がる（ノイズ混入）
    └── 用途: 技術文書、論文
```

### 3.4 Embeddingとベクトルストア

```python
# vectorstore.py
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

# Embeddingモデル
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",  # コスパ最高
    # model="text-embedding-3-large",  # 精度重視
)

# Chromaベクトルストアに保存
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db",      # ローカル永続化
    collection_name="company_docs",
)

print(f"ベクトルストアに {vectorstore._collection.count()} チャンクを保存")
```

TypeScript版:

```typescript
// vectorstore.ts
import { OpenAIEmbeddings } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';

const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small',
});

// ドキュメントをベクトルストアに保存
const vectorstore = await Chroma.fromDocuments(
  documents,       // Document[]
  embeddings,
  {
    collectionName: 'company_docs',
    url: 'http://localhost:8000',  // Chroma サーバー
  }
);
```

---

## 4. Phase 2: Retrieval（検索）

### 4.1 基本的なベクトル検索

```python
# retrieval.py
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma(
    persist_directory="./chroma_db",
    embedding_function=embeddings,
    collection_name="company_docs",
)

# 基本検索（Top-K）
query = "有給休暇の申請方法を教えてください"
results = vectorstore.similarity_search(query, k=5)

for i, doc in enumerate(results):
    print(f"--- 結果 {i+1} ---")
    print(f"スコア: (類似度検索)")
    print(f"ソース: {doc.metadata.get('source', 'N/A')}")
    print(f"内容: {doc.page_content[:200]}...")
    print()

# スコア付き検索
results_with_scores = vectorstore.similarity_search_with_score(query, k=5)
for doc, score in results_with_scores:
    print(f"スコア: {score:.4f} | {doc.page_content[:80]}...")
```

### 4.2 ハイブリッド検索（ベクトル + キーワード）

```python
# hybrid_search.py
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever

# BM25（キーワードベース）リトリーバー
bm25_retriever = BM25Retriever.from_documents(
    chunks,
    k=5,
)

# ベクトルリトリーバー
vector_retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5},
)

# ハイブリッド（アンサンブル）リトリーバー
hybrid_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.4, 0.6],  # キーワード40% + ベクトル60%
)

results = hybrid_retriever.invoke("有給休暇の申請方法")
print(f"ハイブリッド検索結果: {len(results)} 件")
```

### 4.3 リランキング

```python
# reranking.py
from langchain.retrievers import ContextualCompressionRetriever
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain.retrievers.document_compressors import CrossEncoderReranker

# Cross-Encoder リランカー
cross_encoder = HuggingFaceCrossEncoder(model_name="cross-encoder/ms-marco-MiniLM-L-6-v2")
reranker = CrossEncoderReranker(model=cross_encoder, top_n=3)

# リランキング付きリトリーバー
compression_retriever = ContextualCompressionRetriever(
    base_compressor=reranker,
    base_retriever=vector_retriever,
)

results = compression_retriever.invoke("有給休暇の申請方法")
for doc in results:
    print(f"[リランク済み] {doc.page_content[:100]}...")
```

### 4.4 メタデータフィルタリング

```python
# metadata_filter.py

# 部署でフィルタリング
results = vectorstore.similarity_search(
    query="セキュリティポリシー",
    k=5,
    filter={"department": "engineering"},  # メタデータフィルタ
)

# 日付範囲でフィルタリング（Pinecone等の場合）
results = vectorstore.similarity_search(
    query="最新のガイドライン",
    k=5,
    filter={
        "created_at": {"$gte": "2026-01-01"},
        "source_type": {"$in": ["policy", "guideline"]},
    },
)
```

---

## 5. Phase 3: Generation（回答生成）

### 5.1 基本的なRAGチェーン

```python
# rag_chain.py
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# LLM
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# プロンプトテンプレート
prompt = ChatPromptTemplate.from_template("""
以下の参考情報に基づいて、ユーザーの質問に正確に回答してください。

## ルール
- 参考情報に含まれない内容は「情報が見つかりませんでした」と回答する
- 回答の根拠となる参考情報のソースを明記する
- 推測は避け、事実に基づいて回答する

## 参考情報
{context}

## 質問
{question}

## 回答
""")

def format_docs(docs):
    """検索結果をコンテキスト文字列に変換"""
    formatted = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "不明")
        formatted.append(f"[{i}] (出典: {source})\n{doc.page_content}")
    return "\n\n---\n\n".join(formatted)

# RAGチェーンの構築
rag_chain = (
    {
        "context": vector_retriever | format_docs,
        "question": RunnablePassthrough(),
    }
    | prompt
    | llm
    | StrOutputParser()
)

# 実行
answer = rag_chain.invoke("有給休暇の申請方法を教えてください")
print(answer)
```

### 5.2 TypeScript版 RAGチェーン

```typescript
// rag-chain.ts
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';
import { Document } from '@langchain/core/documents';

const llm = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });

const prompt = ChatPromptTemplate.fromTemplate(`
以下の参考情報に基づいて、ユーザーの質問に正確に回答してください。

## 参考情報
{context}

## 質問
{question}

## 回答
`);

function formatDocs(docs: Document[]): string {
  return docs
    .map(
      (doc, i) =>
        `[${i + 1}] (出典: ${doc.metadata.source ?? '不明'})\n${doc.pageContent}`
    )
    .join('\n\n---\n\n');
}

const ragChain = RunnableSequence.from([
  {
    context: vectorRetriever.pipe(formatDocs),
    question: new RunnablePassthrough(),
  },
  prompt,
  llm,
  new StringOutputParser(),
]);

const answer = await ragChain.invoke('有給休暇の申請方法を教えてください');
console.log(answer);
```

### 5.3 会話履歴付きRAG

```python
# conversational_rag.py
from langchain_core.prompts import MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

conversational_prompt = ChatPromptTemplate.from_messages([
    ("system", """以下の参考情報に基づいて回答してください。

参考情報:
{context}
"""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])

# 会話履歴を保持
chat_history: list = []

def ask(question: str) -> str:
    """会話履歴を考慮してRAG回答を生成"""
    # 会話コンテキストを含めて検索クエリを改善
    search_query = question
    if chat_history:
        # 直前の会話を考慮した検索クエリに変換
        contextualize_prompt = ChatPromptTemplate.from_messages([
            ("system", "会話履歴を踏まえ、検索に最適なクエリを生成してください。クエリのみ出力。"),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}"),
        ])
        search_query = (contextualize_prompt | llm | StrOutputParser()).invoke({
            "chat_history": chat_history,
            "question": question,
        })

    # 検索 → 回答生成
    docs = vector_retriever.invoke(search_query)
    context = format_docs(docs)

    response = (conversational_prompt | llm | StrOutputParser()).invoke({
        "context": context,
        "chat_history": chat_history,
        "question": question,
    })

    # 会話履歴を更新
    chat_history.append(HumanMessage(content=question))
    chat_history.append(AIMessage(content=response))

    return response

# 使用例
print(ask("有給休暇は何日もらえますか？"))
print(ask("申請方法は？"))  # 「有給休暇の」を省略しても文脈を理解
print(ask("承認にかかる日数は？"))  # 引き続き有給休暇の文脈
```

---

## 6. Advanced: RAGの最適化テクニック

### 6.1 Parent Document Retriever

小さなチャンクで検索し、大きな親チャンクをコンテキストに渡す手法。

```python
# parent_document.py
from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import InMemoryStore
from langchain.text_splitter import RecursiveCharacterTextSplitter

# 子チャンク（検索用）: 小さく分割
child_splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)

# 親チャンク（コンテキスト用）: 大きめに分割
parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)

# ストア
docstore = InMemoryStore()

parent_retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=docstore,
    child_splitter=child_splitter,
    parent_splitter=parent_splitter,
)

# インデックス作成
parent_retriever.add_documents(pdf_docs)

# 検索（小さなチャンクでマッチ → 親チャンクを返す）
results = parent_retriever.invoke("有給休暇の申請")
print(f"親チャンクサイズ: {len(results[0].page_content)} 文字")
```

### 6.2 Self-Query Retriever

ユーザーの自然言語クエリを構造化フィルタに変換する。

```python
# self_query.py
from langchain.retrievers.self_query.base import SelfQueryRetriever
from langchain.chains.query_constructor.schema import AttributeInfo

metadata_field_info = [
    AttributeInfo(name="department", description="部署名", type="string"),
    AttributeInfo(name="source_type", description="文書タイプ", type="string"),
    AttributeInfo(name="created_at", description="作成日", type="string"),
]

self_query_retriever = SelfQueryRetriever.from_llm(
    llm=llm,
    vectorstore=vectorstore,
    document_contents="社内規程・マニュアル・ガイドライン",
    metadata_field_info=metadata_field_info,
)

# 自然言語でフィルタ付き検索
results = self_query_retriever.invoke(
    "エンジニアリング部門の2026年以降のセキュリティポリシー"
)
# → 自動的に department="engineering", created_at>="2026-01-01" でフィルタ
```

### 6.3 Multi-Query Retriever

1つの質問を複数の視点で言い換えて検索精度を上げる。

```python
# multi_query.py
from langchain.retrievers.multi_query import MultiQueryRetriever

multi_retriever = MultiQueryRetriever.from_llm(
    retriever=vector_retriever,
    llm=llm,
)

# 1つの質問 → 3-5個のクエリに変換 → それぞれ検索 → 結果を統合
results = multi_retriever.invoke("リモートワークのルールは？")
# 生成されるクエリ例:
# 1. "在宅勤務の規定について"
# 2. "テレワーク申請の手続き"
# 3. "リモートワーク中のセキュリティ対策"
```

---

## 7. RAGの評価

### 7.1 RAGAS評価フレームワーク

```python
# evaluation.py
from ragas import evaluate
from ragas.metrics import (
    faithfulness,       # 回答がコンテキストに忠実か
    answer_relevancy,   # 回答が質問に関連しているか
    context_precision,  # 検索されたコンテキストの精度
    context_recall,     # 必要な情報が検索されたか
)
from datasets import Dataset

# 評価データセット
eval_data = {
    "question": [
        "有給休暇の申請方法は？",
        "セキュリティインシデント時の対応手順は？",
    ],
    "answer": [
        rag_chain.invoke("有給休暇の申請方法は？"),
        rag_chain.invoke("セキュリティインシデント時の対応手順は？"),
    ],
    "contexts": [
        [doc.page_content for doc in vector_retriever.invoke("有給休暇の申請方法は？")],
        [doc.page_content for doc in vector_retriever.invoke("セキュリティインシデント時の対応手順は？")],
    ],
    "ground_truth": [
        "社内ポータルの申請フォームから...",  # 正解データ
        "セキュリティチームに即座に連絡し...",
    ],
}

dataset = Dataset.from_dict(eval_data)

# 評価実行
results = evaluate(
    dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)

print(results)
# {'faithfulness': 0.92, 'answer_relevancy': 0.88,
#  'context_precision': 0.85, 'context_recall': 0.90}
```

### 7.2 カスタム評価指標

```python
# custom_eval.py

def evaluate_rag_response(question: str, answer: str, context: str) -> dict:
    """LLMベースの回答品質評価"""
    eval_prompt = f"""
以下のRAG回答を評価してください。

質問: {question}
コンテキスト: {context}
回答: {answer}

以下の基準で1-5のスコアをつけてください:
1. 正確性: コンテキストの情報に忠実か
2. 網羅性: 質問に十分に答えているか
3. ハルシネーション: コンテキストにない情報を捏造していないか

JSON形式で出力:
{{"accuracy": X, "completeness": X, "hallucination_free": X, "reasoning": "..."}}
"""
    result = llm.invoke(eval_prompt)
    return json.loads(result.content)
```

---

## 8. 本番運用のベストプラクティス

### 8.1 インデックス更新戦略

```python
# index_updater.py
import hashlib
from datetime import datetime

class IncrementalIndexer:
    """差分更新でインデックスを効率的に管理"""

    def __init__(self, vectorstore, splitter, embeddings):
        self.vectorstore = vectorstore
        self.splitter = splitter
        self.embeddings = embeddings
        self.indexed_hashes: set = set()

    def _hash_document(self, content: str) -> str:
        return hashlib.sha256(content.encode()).hexdigest()

    def update(self, documents: list) -> dict:
        """新規・変更ドキュメントのみインデックス更新"""
        stats = {"added": 0, "skipped": 0, "updated": 0}

        for doc in documents:
            doc_hash = self._hash_document(doc.page_content)

            if doc_hash in self.indexed_hashes:
                stats["skipped"] += 1
                continue

            # 既存ドキュメントを削除（更新の場合）
            source = doc.metadata.get("source")
            if source:
                self.vectorstore.delete(
                    filter={"source": source}
                )
                stats["updated"] += 1
            else:
                stats["added"] += 1

            # 新しいチャンクを追加
            chunks = self.splitter.split_documents([doc])
            self.vectorstore.add_documents(chunks)
            self.indexed_hashes.add(doc_hash)

        return stats
```

### 8.2 モニタリング

```python
# monitoring.py
import time
import logging

logger = logging.getLogger("rag")

class RAGMonitor:
    """RAGパイプラインのモニタリング"""

    def query_with_monitoring(self, question: str) -> dict:
        metrics = {}

        # 検索レイテンシ
        start = time.time()
        docs = self.retriever.invoke(question)
        metrics["retrieval_latency_ms"] = (time.time() - start) * 1000
        metrics["num_retrieved_docs"] = len(docs)

        # 生成レイテンシ
        start = time.time()
        answer = self.rag_chain.invoke(question)
        metrics["generation_latency_ms"] = (time.time() - start) * 1000

        # トークン使用量（LLMコールバックから取得）
        metrics["total_latency_ms"] = (
            metrics["retrieval_latency_ms"] + metrics["generation_latency_ms"]
        )

        logger.info(f"RAG Query Metrics: {metrics}")

        return {
            "answer": answer,
            "sources": [doc.metadata for doc in docs],
            "metrics": metrics,
        }
```

---

## 9. よくあるトラブルと対処法

| 問題 | 原因 | 対処法 |
|------|------|--------|
| 回答が不正確 | チャンクサイズが不適切 | チャンクサイズを調整（500-1500文字） |
| 関連文書が検索されない | Embeddingの質が低い | text-embedding-3-large に変更 |
| ハルシネーションが多い | プロンプトが甘い | 「コンテキストにない情報は回答しない」を明記 |
| レスポンスが遅い | チャンク数が多すぎる | Top-Kを減らす、リランキング導入 |
| コストが高い | 毎回全文書をEmbedding | 差分更新に切り替え |

---

## 10. まとめ

RAGの実装で最も重要なのは以下の3点だ。

1. **チャンキング戦略** ── チャンクサイズとオーバーラップの最適化が検索精度を決める
2. **検索の多層化** ── ベクトル検索 + キーワード検索 + リランキングの組み合わせ
3. **継続的な評価** ── RAGASなどのフレームワークで定量的に品質を監視する

まずはシンプルな構成（RecursiveCharacterTextSplitter + Chroma + GPT-4o）で始め、評価結果を見ながら段階的に最適化していくのが実践的なアプローチだ。

---

## 関連記事

- [LLM APIアプリ開発入門2026](/blog/2026-08-01-llm-api-development-guide-2026)
- [AIエージェント開発入門2026](/blog/2026-08-03-ai-agent-development-2026)
- [ベクトルデータベース比較2026](/blog/2026-08-07-vector-database-comparison-2026)
- [AIコーディングツール完全ガイド](/blog/ai-coding-tools-guide)

---

## FAQ

### Q. RAGとファインチューニング、どちらを使うべき？

A. RAGは「外部知識の参照」、ファインチューニングは「モデルの振る舞い変更」に向いている。社内文書QAならRAG、特定の文体やフォーマットで回答させたいならファインチューニング。多くのケースではRAGが費用対効果で勝る。

### Q. ベクトルDBの選び方は？

A. プロトタイプ段階ではChroma（ローカル・無料）、本番環境ではPinecone（フルマネージド）またはpgvector（既存PostgreSQL活用）を推奨。詳細は[ベクトルデータベース比較2026](/blog/2026-08-07-vector-database-comparison-2026)を参照。

### Q. 日本語ドキュメントのチャンキングで注意することは？

A. 日本語は英語と違ってスペースで区切られないため、句読点（。、）で分割するのが効果的。`separators`に`"。"`を高優先で含める。また、日本語はトークン効率が低いため、チャンクサイズは文字数ではなくトークン数で管理するのが望ましい。
