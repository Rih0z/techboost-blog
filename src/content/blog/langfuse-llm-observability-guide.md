---
title: "LangFuseでLLMアプリの可観測性を実現する完全ガイド2026 - トレーシング・評価・監視"
description: "LangFuseを使ってLLMアプリのトレーシング・コスト監視・品質評価を実装する方法を解説。OpenAI・LangChain・LlamaIndex・PydanticAI連携から、カスタム評価スコアの実装まで実践例付きで紹介。サンプルコード付きで実践的に解説。"
pubDate: "2026-03-04"
tags: ["AI", "LangFuse", "LLMOps", "可観測性", "Python", "モニタリング"]
---
## はじめに

LLMアプリを本番環境で運用するには、**何が起きているかを可視化する仕組み**が不可欠です。LangFuseは、LLMアプリの**トレーシング・コスト追跡・品質評価・デバッグ**を一元管理するオープンソースのLLMOpsプラットフォームです。

2026年、AIアプリの本番運用でLangFuseはデファクトスタンダードになりつつあります。

## LangFuseとは

### 解決する問題

LLMアプリ本番運用で直面する典型的な課題：

```
❌ なぜこのユーザーだけ回答品質が低いのか？
❌ 毎月のAPIコストがなぜこんなに高いのか？
❌ プロンプト変更後に品質が改善したか確認できない
❌ どのステップで処理が遅いのか分からない
❌ ユーザーがどの回答に不満を持っているか追跡できない
```

**LangFuseが提供するもの:**
- **トレーシング**: リクエストからレスポンスまでの全ステップを記録
- **コスト追跡**: モデル別・ユーザー別のAPIコストを可視化
- **品質評価**: 自動・人手によるLLM出力の評価
- **プロンプト管理**: バージョン管理付きプロンプトの一元管理
- **データセット**: 評価用テストセットの管理

## セットアップ

### クラウド版（推奨）

[https://cloud.langfuse.com](https://cloud.langfuse.com)でアカウント作成後、APIキーを取得します。

### セルフホスト（Docker）

```yaml
# docker-compose.yml
services:
  langfuse-server:
    image: langfuse/langfuse:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/langfuse
      - NEXTAUTH_SECRET=your-secret
      - SALT=your-salt
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: langfuse
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
docker-compose up -d
# → http://localhost:3000 でアクセス
```

### インストール

```bash
pip install langfuse

# Node.js
npm install langfuse
```

## 基本的なトレーシング

### OpenAIとの連携（最も簡単）

```python
from langfuse.openai import openai  # langfuseがopanaiをラップ
import os

# 環境変数で設定
os.environ["LANGFUSE_PUBLIC_KEY"] = "pk-..."
os.environ["LANGFUSE_SECRET_KEY"] = "sk-..."
os.environ["LANGFUSE_HOST"] = "https://cloud.langfuse.com"

# 通常のOpenAI APIと同じように使うだけ！
response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Pythonで素数判定関数を書いてください"}]
)
print(response.choices[0].message.content)
# → LangFuseのダッシュボードに自動でトレースが記録される
```

### 手動トレーシング

```python
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

langfuse = Langfuse(
    public_key="pk-...",
    secret_key="sk-...",
    host="https://cloud.langfuse.com"
)

# @observeデコレータで自動トレーシング
@observe()
def process_user_question(user_id: str, question: str) -> str:
    # トレースにメタデータを追加
    langfuse_context.update_current_observation(
        user_id=user_id,
        metadata={"question_length": len(question)}
    )

    # LLMを呼ぶ
    client = openai.OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "役立つアシスタントです"},
            {"role": "user", "content": question}
        ]
    )

    answer = response.choices[0].message.content

    # スコアを記録（例：文字数に基づく品質指標）
    langfuse_context.score_current_observation(
        name="response_length",
        value=len(answer)
    )

    return answer

# 実行
result = process_user_question("user_123", "TypeScriptの型ガードとは何ですか？")
print(result)
```

## LangChainとの連携

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.callbacks import LangfuseCallbackHandler

# LangFuseコールバックハンドラー
langfuse_handler = LangfuseCallbackHandler(
    public_key="pk-...",
    secret_key="sk-...",
    host="https://cloud.langfuse.com"
)

# LLMチェーン
llm = ChatOpenAI(model="gpt-4o")
prompt = ChatPromptTemplate.from_template(
    "以下の技術トピックについて日本語で詳しく説明してください：{topic}"
)
chain = prompt | llm

# コールバックを渡して実行
response = chain.invoke(
    {"topic": "マイクロサービスアーキテクチャのトレードオフ"},
    config={"callbacks": [langfuse_handler]}
)
print(response.content)
```

## 詳細なトレーシング（スパン・ジェネレーション）

```python
from langfuse import Langfuse
import openai

langfuse = Langfuse()

def rag_query_with_tracing(user_id: str, query: str) -> str:
    # トレースを開始
    trace = langfuse.trace(
        name="rag_query",
        user_id=user_id,
        input={"query": query},
        metadata={"version": "1.2.0"}
    )

    # Step 1: 埋め込みの生成
    embedding_span = trace.span(
        name="generate_embedding",
        input={"text": query}
    )
    embedding_response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )
    embedding = embedding_response.data[0].embedding
    embedding_span.end(
        output={"embedding_dim": len(embedding)}
    )

    # Step 2: ベクトル検索
    search_span = trace.span(
        name="vector_search",
        input={"query": query, "top_k": 3}
    )
    # 実際はVectorDBを検索
    contexts = ["関連コンテキスト1", "関連コンテキスト2"]
    search_span.end(
        output={"num_results": len(contexts)}
    )

    # Step 3: LLM生成
    generation = trace.generation(
        name="llm_generation",
        model="gpt-4o",
        model_parameters={"temperature": 0.7},
        input=[
            {"role": "system", "content": "コンテキストを基に回答してください"},
            {"role": "user", "content": query}
        ]
    )

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"コンテキスト:\n{''.join(contexts)}"},
            {"role": "user", "content": query}
        ]
    )
    answer = response.choices[0].message.content

    generation.end(
        output=answer,
        usage={
            "input": response.usage.prompt_tokens,
            "output": response.usage.completion_tokens,
        }
    )

    # トレース完了
    trace.update(output={"answer": answer})

    return answer
```

## 品質評価（スコアリング）

```python
from langfuse import Langfuse
import openai

langfuse = Langfuse()

# LLM-as-Judge評価
def evaluate_response(trace_id: str, question: str, answer: str):
    """LLMを使って回答品質を評価する"""
    client = openai.OpenAI()

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": """あなたはAI回答の品質評価者です。
                以下の基準で0〜5のスコアを付けてください：
                5: 完璧な回答
                4: とても良い回答
                3: 普通の回答
                2: 改善が必要
                1: 不適切な回答
                0: 完全に間違い

                JSON形式で{"score": X, "reason": "理由"}のみを返してください。"""
            },
            {
                "role": "user",
                "content": f"質問: {question}\n\n回答: {answer}"
            }
        ],
        response_format={"type": "json_object"}
    )

    import json
    result = json.loads(response.choices[0].message.content)

    # LangFuseにスコアを記録
    langfuse.score(
        trace_id=trace_id,
        name="llm_judge_quality",
        value=result["score"] / 5.0,  # 0〜1に正規化
        comment=result["reason"],
        data_type="NUMERIC"
    )

    return result

# ユーザーフィードバックの記録
def record_user_feedback(trace_id: str, thumbs_up: bool, comment: str = ""):
    langfuse.score(
        trace_id=trace_id,
        name="user_feedback",
        value=1 if thumbs_up else 0,
        comment=comment,
        data_type="BOOLEAN"
    )
```

## プロンプト管理

```python
from langfuse import Langfuse

langfuse = Langfuse()

# プロンプトを登録（LangFuseダッシュボードから管理）
prompt = langfuse.get_prompt("customer_support_prompt")

# プロンプトのコンパイル
compiled = prompt.compile(
    product_name="DevToolBox",
    user_name="山田太郎"
)

# バージョン管理でA/Bテスト
prompt_v1 = langfuse.get_prompt("article_writer", version=1)
prompt_v2 = langfuse.get_prompt("article_writer", version=2)
```

## データセットと評価パイプライン

```python
from langfuse import Langfuse
import openai

langfuse = Langfuse()

# 評価用データセットの作成
dataset = langfuse.create_dataset(
    name="tech_qa_evaluation_set",
    description="技術QAの評価用データセット"
)

# テストケースを追加
test_cases = [
    {
        "input": "ReactとVueの違いを教えてください",
        "expected_output": "Reactはライブラリ、Vueはフレームワーク..."
    },
    {
        "input": "TypeScriptの型推論とは何ですか？",
        "expected_output": "TypeScriptが型を自動的に推測する機能..."
    }
]

for case in test_cases:
    langfuse.create_dataset_item(
        dataset_name="tech_qa_evaluation_set",
        input=case["input"],
        expected_output=case["expected_output"]
    )

# 評価の実行
def run_evaluation(model: str, dataset_name: str):
    dataset = langfuse.get_dataset(dataset_name)
    client = openai.OpenAI()

    for item in dataset.items:
        with item.observe(
            run_name=f"eval_{model}",
            run_metadata={"model": model}
        ) as trace:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": item.input}]
            )
            output = response.choices[0].message.content

            # 簡単な評価（実際にはより複雑な評価ロジックを使用）
            if item.expected_output:
                score = 1 if any(
                    word in output
                    for word in item.expected_output.split()[:5]
                ) else 0
                langfuse.score(
                    trace_id=trace.id,
                    name="keyword_match",
                    value=score
                )

# 2つのモデルを比較評価
run_evaluation("gpt-4o", "tech_qa_evaluation_set")
run_evaluation("gpt-4o-mini", "tech_qa_evaluation_set")
```

## コスト追跡ダッシュボード活用

```python
from langfuse import Langfuse
from datetime import datetime, timedelta

langfuse = Langfuse()

# APIで統計情報を取得
# (実際にはLangFuseのダッシュボードが視覚的に確認しやすい)

# トレースのフィルタリング
traces = langfuse.fetch_traces(
    from_timestamp=datetime.now() - timedelta(days=7),
    tags=["production"],
    order_by="total_cost",
    limit=100
)

# コスト分析
total_cost = sum(t.total_cost for t in traces.data if t.total_cost)
print(f"過去7日間の合計コスト: ${total_cost:.4f}")
```

## Pythonデコレータを使った簡単統合

```python
from langfuse.decorators import observe, langfuse_context
from langchain_openai import ChatOpenAI
import openai

# 関数全体をトレース
@observe(name="main_pipeline")
def run_rag_pipeline(query: str) -> dict:
    langfuse_context.update_current_observation(
        metadata={"pipeline_version": "2.1"}
    )

    embedding = generate_embedding(query)
    contexts = search_vector_db(embedding)
    answer = generate_answer(query, contexts)

    return {"answer": answer, "contexts": len(contexts)}

@observe(name="generate_embedding")
def generate_embedding(text: str) -> list[float]:
    client = openai.OpenAI()
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

@observe(name="search_vector_db")
def search_vector_db(embedding: list[float]) -> list[str]:
    # ベクトルDB検索（省略）
    return ["context1", "context2"]

@observe(name="generate_answer", as_type="generation")
def generate_answer(query: str, contexts: list[str]) -> str:
    client = openai.OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"コンテキスト: {contexts}"},
            {"role": "user", "content": query}
        ]
    )
    return response.choices[0].message.content

# 実行
result = run_rag_pipeline("Next.jsのApp RouterでSEO最適化するには？")
print(result)
```

## まとめ

LangFuseは**LLMアプリを安心して本番運用するための必須ツール**です。

**LangFuseが特に重要なシナリオ:**
- プロダクションで使われているLLMアプリの品質監視
- コスト最適化（どのモデル・プロンプトが効率的か）
- A/Bテストによるプロンプト改善
- ユーザーフィードバックの収集と分析

**導入ステップ:**
1. `pip install langfuse`でインストール
2. OpenAIラッパーに切り替えるだけで基本的なトレーシング完了
3. カスタムスコアを追加して品質評価パイプライン構築

## 関連記事

- [Promptfoo: LLMのテスト・評価ガイド](/promptfoo-llm-testing-guide)
- [AIエージェント開発入門2026](/ai-agent-development-2026)
- [LangChainでRAGシステムを構築する](/langchain-ai-app-guide)
