---
title: "Mistral AI API完全ガイド2026 - 高速・低コストなLLM APIの実践活用"
description: "Mistral AIのAPIを使ったアプリ開発を解説。Mistral Large・Small・Codestral・Mixtralの特徴比較から、Function Calling・JSON Mode・RAG・エージェント実装まで実践例付きで紹介。"
pubDate: "2026-03-04"
tags: ["AI", "Mistral", "LLM", "Python", "JavaScript", "API"]
---

## はじめに

Mistral AIはフランスのAIスタートアップで、**オープンソースと商用モデルの両方を提供**しています。特にコスト効率と速度に優れており、2026年現在、OpenAIに次ぐ第2のLLM APIプロバイダーとして注目されています。

## Mistralモデル一覧

| モデル | コンテキスト長 | 特徴 | 用途 |
|--------|-------------|------|------|
| **Mistral Large 2** | 128K | 最高精度・推論強い | 複雑なタスク |
| **Mistral Small** | 32K | 高速・低コスト | 汎用 |
| **Codestral** | 256K | コード特化 | コード生成 |
| **Mixtral 8x7B** | 32K | MoE・オープンソース | 自ホスト可能 |
| **Mixtral 8x22B** | 64K | 大規模MoE | 高精度 |
| **Pixtral Large** | 128K | マルチモーダル | 画像理解 |

## セットアップ

```bash
pip install mistralai

# Node.js
npm install @mistralai/mistralai
```

```python
import os
from mistralai import Mistral

client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))
```

## 基本的なテキスト生成

### Python

```python
from mistralai import Mistral

client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

# シンプルなチャット
response = client.chat.complete(
    model="mistral-small-latest",
    messages=[
        {"role": "user", "content": "TypeScriptのunion型について説明してください"}
    ]
)
print(response.choices[0].message.content)

# システムプロンプト付き
response = client.chat.complete(
    model="mistral-large-latest",
    messages=[
        {
            "role": "system",
            "content": "あなたはシニアエンジニアです。常に実用的なコード例を含めてください。"
        },
        {
            "role": "user",
            "content": "Next.jsのApp RouterとPages Routerの違いを説明してください"
        }
    ]
)
print(response.choices[0].message.content)
```

### Node.js / TypeScript

```typescript
import Mistral from "@mistralai/mistralai";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

const response = await client.chat.complete({
  model: "mistral-small-latest",
  messages: [
    { role: "user", content: "Reactのレンダリング最適化手法を教えてください" }
  ],
});

console.log(response.choices![0].message.content);
```

## ストリーミング

```python
from mistralai import Mistral

client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

# ストリーミングで受け取る
with client.chat.stream(
    model="mistral-large-latest",
    messages=[{"role": "user", "content": "Dockerの基礎から応用まで説明してください"}]
) as stream:
    for text in stream.get_text_stream():
        print(text, end="", flush=True)
```

```typescript
// TypeScriptでのストリーミング
const stream = client.chat.stream({
  model: "mistral-small-latest",
  messages: [{ role: "user", content: "KubernetesのPodとDeploymentの違いは？" }],
});

for await (const event of stream) {
  process.stdout.write(event.data.choices[0]?.delta?.content || "");
}
```

## JSON Mode（構造化出力）

```python
from mistralai import Mistral
import json
from pydantic import BaseModel

client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

class TechArticle(BaseModel):
    title: str
    summary: str
    tags: list[str]
    difficulty: str  # beginner, intermediate, advanced

response = client.chat.complete(
    model="mistral-large-latest",
    messages=[
        {
            "role": "user",
            "content": """次の技術トピックのメタデータをJSON形式で返してください：
            スキーマ: title(str), summary(str), tags(list), difficulty(str)
            トピック: Rustの所有権システムとライフタイム"""
        }
    ],
    response_format={"type": "json_object"}  # JSONモードを有効化
)

data = json.loads(response.choices[0].message.content)
article = TechArticle(**data)
print(f"タイトル: {article.title}")
print(f"難易度: {article.difficulty}")
print(f"タグ: {', '.join(article.tags)}")
```

## Function Calling（ツール使用）

```python
from mistralai import Mistral
import json

client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

# ツールの定義
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "指定した都市の天気を取得します",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "都市名（例：東京、大阪）"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "温度の単位"
                    }
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_github",
            "description": "GitHubリポジトリを検索します",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "検索クエリ"},
                    "language": {"type": "string", "description": "プログラミング言語"}
                },
                "required": ["query"]
            }
        }
    }
]

# ツール実装
def execute_tool(name: str, args: dict) -> str:
    if name == "get_weather":
        return json.dumps({"temperature": 22, "condition": "晴れ", "city": args["city"]})
    elif name == "search_github":
        return json.dumps({"repos": ["repo1", "repo2"], "total": 100})
    return "{}"

# エージェントループ
messages = [{"role": "user", "content": "東京の天気と、最新のRustリポジトリを教えてください"}]

while True:
    response = client.chat.complete(
        model="mistral-large-latest",
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )

    message = response.choices[0].message
    messages.append(message.model_dump())

    # ツール呼び出しがなければ終了
    if not message.tool_calls:
        print(message.content)
        break

    # ツールを実行して結果を返す
    for tool_call in message.tool_calls:
        result = execute_tool(
            tool_call.function.name,
            json.loads(tool_call.function.arguments)
        )
        messages.append({
            "role": "tool",
            "content": result,
            "tool_call_id": tool_call.id
        })
```

## Codestral（コード特化モデル）

```python
from mistralai import Mistral

client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

# コード生成
response = client.chat.complete(
    model="codestral-latest",
    messages=[
        {
            "role": "user",
            "content": """Pythonで以下の機能を実装してください：
            - FastAPIでファイルアップロードエンドポイント
            - S3へのアップロード
            - データベースへのメタデータ保存
            - エラーハンドリング"""
        }
    ]
)
print(response.choices[0].message.content)

# コード補完（Fill-in-the-Middle）
response = client.fim.complete(
    model="codestral-latest",
    prompt="def fibonacci(n: int) -> int:\n    \"\"\"フィボナッチ数列のn番目を返す\"\"\"\n",
    suffix="\n\n# テスト\nprint(fibonacci(10))  # 55"
)
print(response.choices[0].message.content)
```

## Pixtral（マルチモーダル）

```python
from mistralai import Mistral
import base64

client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

# 画像をbase64エンコード
with open("diagram.png", "rb") as f:
    image_data = base64.b64encode(f.read()).decode()

response = client.chat.complete(
    model="pixtral-large-latest",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "このアーキテクチャ図を分析して、改善点を指摘してください"
                },
                {
                    "type": "image_url",
                    "image_url": f"data:image/png;base64,{image_data}"
                }
            ]
        }
    ]
)
print(response.choices[0].message.content)
```

## Embedding（ベクトル化）

```python
from mistralai import Mistral

client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

# テキストをベクトルに変換
response = client.embeddings.create(
    model="mistral-embed",
    inputs=[
        "TypeScriptの型システムについて",
        "JavaScriptのプロトタイプ継承",
        "PythonのデコレーターパターN"
    ]
)

for i, embedding in enumerate(response.data):
    print(f"テキスト{i}: {len(embedding.embedding)}次元のベクトル")
    print(f"  最初の5要素: {embedding.embedding[:5]}")
```

## RAGシステムの構築

```python
from mistralai import Mistral
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))

# ドキュメントの準備
documents = [
    "FastAPIはPythonの高速Webフレームワークです。Pydanticを使った型検証が特徴です。",
    "Next.jsはReactベースのフルスタックフレームワークです。SSRとSSGをサポートします。",
    "TypeScriptはJavaScriptのスーパーセットで、静的型付けが特徴です。",
    "DockerはコンテナベースのアプリケーションデプロイツールでOSに依存しません。",
]

def embed_text(texts: list[str]) -> np.ndarray:
    response = client.embeddings.create(
        model="mistral-embed",
        inputs=texts
    )
    return np.array([e.embedding for e in response.data])

# ドキュメントをベクトル化して保存
doc_embeddings = embed_text(documents)

def rag_query(question: str, top_k: int = 2) -> str:
    # 質問をベクトル化
    q_embedding = embed_text([question])

    # コサイン類似度で関連ドキュメントを検索
    similarities = cosine_similarity(q_embedding, doc_embeddings)[0]
    top_indices = np.argsort(similarities)[::-1][:top_k]

    # 関連ドキュメントをコンテキストとしてLLMに渡す
    context = "\n".join([documents[i] for i in top_indices])

    response = client.chat.complete(
        model="mistral-small-latest",
        messages=[
            {
                "role": "system",
                "content": f"以下のコンテキストを基に質問に答えてください：\n{context}"
            },
            {"role": "user", "content": question}
        ]
    )
    return response.choices[0].message.content

print(rag_query("FastAPIの特徴を教えてください"))
print(rag_query("TypeScriptとJavaScriptの違いは何ですか？"))
```

## OpenAI SDK との互換性

MistralはOpenAI互換エンドポイントを提供しており、既存コードをほぼそのまま移行できます：

```python
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("MISTRAL_API_KEY"),
    base_url="https://api.mistral.ai/v1"
)

response = client.chat.completions.create(
    model="mistral-small-latest",
    messages=[{"role": "user", "content": "こんにちは"}]
)
print(response.choices[0].message.content)
```

## コスト比較（2026年3月時点）

| モデル | 入力 (1M tokens) | 出力 (1M tokens) |
|--------|----------------|----------------|
| Mistral Small | $0.20 | $0.60 |
| Mistral Large 2 | $2.00 | $6.00 |
| GPT-4o | $2.50 | $10.00 |
| Claude Sonnet 4.6 | $3.00 | $15.00 |

Mistral Smallは**GPT-4oの約12分の1のコスト**で高品質な出力を提供します。

## まとめ

Mistral AIは**コスト効率・オープンソース・欧州プライバシー規制準拠**で差別化されています。

**Mistralが特に向いているシナリオ:**
- コストを抑えた大量バッチ処理
- コード生成・補完（Codestral）
- 欧州のGDPR準拠が必要なアプリ
- セルフホスト（Mixtralのオープンソース版）

## 関連記事

- [Gemini API完全ガイド](/gemini-api-guide)
- [OpenAI API完全ガイド](/openai-api-guide-2026)
- [Ollama ローカルLLMガイド](/ollama-local-llm-guide)
