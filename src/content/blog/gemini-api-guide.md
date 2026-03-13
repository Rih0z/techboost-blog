---
title: "Gemini API完全ガイド2026 - Google AIで次世代アプリを構築する実践入門"
description: "Google GeminiのAPIを使ったアプリ開発を徹底解説。テキスト生成・マルチモーダル・コード生成・RAG・Function Callingまで、Python/JavaScript実装例付きで解説。Gemini 2.0 Flashの新機能も紹介。"
pubDate: "2026-03-04"
tags: ["AI", "Gemini", "Google AI", "Python", "JavaScript", "マルチモーダル"]
heroImage: '../../assets/thumbnails/gemini-api-guide.jpg'
---

## はじめに

Googleが開発した**Gemini**は、マルチモーダル対応の大規模言語モデルです。テキスト・画像・音声・動画・コードを統合的に処理できる次世代のAIモデルで、Google AI StudioのAPIから誰でも利用できます。

2026年現在、Gemini 2.0 Flashは**コスト効率と速度で業界トップクラス**の性能を示しており、本番システムへの採用が急増しています。

## Geminiモデル一覧

| モデル | 特徴 | 用途 |
|--------|------|------|
| **Gemini 2.0 Flash** | 高速・低コスト・マルチモーダル | 本番API、リアルタイム処理 |
| **Gemini 2.0 Pro** | 最高精度・長いコンテキスト | 複雑な推論、ロングコンテキスト |
| **Gemini 1.5 Flash-8B** | 超軽量・高速 | 大量処理、低レイテンシ |
| **Gemini 2.0 Flash Thinking** | 思考プロセス可視化 | 数学・科学・コーディング |

## セットアップ

### APIキーの取得

1. [Google AI Studio](https://aistudio.google.com)にアクセス
2. 「Get API key」をクリック
3. APIキーをコピー

### インストール

```bash
# Python
pip install google-generativeai

# Node.js
npm install @google/generative-ai
```

## 基本的な使い方

### Python

```python
import google.generativeai as genai
import os

# APIキーの設定
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# モデルの初期化
model = genai.GenerativeModel('gemini-2.0-flash')

# テキスト生成
response = model.generate_content("Pythonの非同期処理について説明してください")
print(response.text)

# システムプロンプト付き
model_with_system = genai.GenerativeModel(
    'gemini-2.0-flash',
    system_instruction="あなたはシニアPythonエンジニアです。コード例を必ず含めてください。"
)

response = model_with_system.generate_content("FastAPIのベストプラクティスを教えてください")
print(response.text)
```

### Node.js / TypeScript

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// テキスト生成
const result = await model.generateContent(
  "TypeScriptのジェネリクスについて説明してください"
);
console.log(result.response.text());

// ストリーミング
const streamResult = await model.generateContentStream(
  "Reactのカスタムフックを5つ紹介してください"
);

for await (const chunk of streamResult.stream) {
  process.stdout.write(chunk.text());
}
```

## マルチモーダル処理（画像・動画・音声）

### 画像理解

```python
import google.generativeai as genai
from PIL import Image
import httpx

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-2.0-flash')

# ローカル画像の分析
image = Image.open("screenshot.png")
response = model.generate_content([
    "このスクリーンショットのUIを分析して、改善点を5つ挙げてください",
    image
])
print(response.text)

# URLの画像を分析
image_bytes = httpx.get("https://example.com/chart.png").content
response = model.generate_content([
    {"mime_type": "image/png", "data": image_bytes},
    "このグラフから読み取れるトレンドを日本語で分析してください"
])
print(response.text)
```

### 動画分析

```python
import google.generativeai as genai

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-2.0-flash')

# 動画ファイルをアップロードして分析
video_file = genai.upload_file("product_demo.mp4")

response = model.generate_content([
    video_file,
    "この製品デモ動画の主要な機能を箇条書きでまとめてください"
])
print(response.text)
```

### PDF分析

```python
import google.generativeai as genai
import pathlib

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-2.0-flash')

# PDFをアップロード
pdf_file = genai.upload_file("report.pdf")

response = model.generate_content([
    pdf_file,
    "このレポートのエグゼクティブサマリーを作成してください"
])
print(response.text)
```

## 構造化出力（JSON）

```python
import google.generativeai as genai
from pydantic import BaseModel
import json

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

class ProductInfo(BaseModel):
    name: str
    price: int
    features: list[str]
    rating: float
    availability: bool

model = genai.GenerativeModel(
    'gemini-2.0-flash',
    generation_config={
        "response_mime_type": "application/json",
    }
)

response = model.generate_content(
    """以下のテキストから商品情報を抽出してJSON形式で返してください：
    スキーマ: name(str), price(int), features(list[str]), rating(float), availability(bool)

    テキスト: 「新型ワイヤレスイヤホン XR-500、価格¥24,800。
    ノイズキャンセリング機能搭載、バッテリー30時間、IPX5防水、
    Bluetoth 5.3対応。評価4.7/5。在庫あり。」"""
)

product = ProductInfo.model_validate_json(response.text)
print(f"商品名: {product.name}")
print(f"価格: ¥{product.price:,}")
print(f"評価: {product.rating}")
```

## Function Calling（ツール呼び出し）

```python
import google.generativeai as genai

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# ツールの定義
get_weather = genai.protos.FunctionDeclaration(
    name="get_weather",
    description="指定した都市の現在の天気を取得します",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "city": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="天気を調べる都市名"
            ),
            "unit": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="温度の単位: celsius または fahrenheit",
                enum=["celsius", "fahrenheit"]
            )
        },
        required=["city"]
    )
)

search_web = genai.protos.FunctionDeclaration(
    name="search_web",
    description="Webを検索して情報を取得します",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "query": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="検索クエリ"
            )
        },
        required=["query"]
    )
)

tools = genai.protos.Tool(function_declarations=[get_weather, search_web])

model = genai.GenerativeModel('gemini-2.0-flash', tools=[tools])

# 会話の開始
chat = model.start_chat()
response = chat.send_message("東京の今日の天気を教えてください")

# ツール呼び出しの処理
if response.candidates[0].content.parts[0].function_call:
    fc = response.candidates[0].content.parts[0].function_call
    print(f"ツール呼び出し: {fc.name}({dict(fc.args)})")

    # ツールを実行して結果を返す（実際にはAPIを呼ぶ）
    tool_result = {
        "temperature": 22,
        "condition": "晴れ",
        "humidity": 60
    }

    response2 = chat.send_message(
        genai.protos.Content(parts=[
            genai.protos.Part(
                function_response=genai.protos.FunctionResponse(
                    name=fc.name,
                    response={"result": tool_result}
                )
            )
        ])
    )
    print(response2.text)
```

## チャット（マルチターン会話）

```python
import google.generativeai as genai

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

model = genai.GenerativeModel(
    'gemini-2.0-flash',
    system_instruction="あなたはコードレビューの専門家です。"
)

# チャットセッションの開始
chat = model.start_chat(history=[])

def chat_with_gemini(user_message: str) -> str:
    response = chat.send_message(user_message)
    return response.text

# 会話例
print(chat_with_gemini("このPythonコードをレビューしてください:\ndef add(a, b): return a+b"))
print(chat_with_gemini("型アノテーションを追加するとどうなりますか？"))
print(chat_with_gemini("テストコードも書いてください"))
```

## コンテキストキャッシング（コスト削減）

大きなドキュメントを繰り返し参照する場合にコストを削減できます：

```python
import google.generativeai as genai
from datetime import timedelta

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# ドキュメントをキャッシュ
cache = genai.caching.CachedContent.create(
    model="gemini-2.0-flash-001",
    system_instruction="あなたは技術文書の分析専門家です。",
    contents=[{
        "parts": [{"text": "# 技術仕様書\n" * 1000}],  # 大きなドキュメント
        "role": "user"
    }],
    ttl=timedelta(hours=1)
)

# キャッシュを使ったモデル
model = genai.GenerativeModel.from_cached_content(cached_content=cache)

# 複数の質問を同じドキュメントに対して実行（コスト削減）
response1 = model.generate_content("このドキュメントの要約を作成してください")
response2 = model.generate_content("セキュリティ要件を抽出してください")
response3 = model.generate_content("APIエンドポイントの一覧を作成してください")
```

## Vertex AI での本番デプロイ

```python
import vertexai
from vertexai.generative_models import GenerativeModel, Part

# Google Cloudプロジェクトの設定
vertexai.init(project="your-project-id", location="us-central1")

model = GenerativeModel("gemini-2.0-flash-001")

# テキスト生成
response = model.generate_content("Kubernetes Podのライフサイクルを説明してください")
print(response.text)

# 非同期処理（大量バッチ処理）
import asyncio

async def process_documents(documents: list[str]) -> list[str]:
    tasks = [
        model.generate_content_async(f"要約してください: {doc}")
        for doc in documents
    ]
    responses = await asyncio.gather(*tasks)
    return [r.text for r in responses]
```

## Google Cloudとの統合

```python
from google.cloud import bigquery
import google.generativeai as genai

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-2.0-flash')

# BigQueryと組み合わせたデータ分析
def analyze_query_results():
    client = bigquery.Client()
    query = "SELECT product, SUM(revenue) as total FROM sales GROUP BY product LIMIT 10"
    results = client.query(query).to_dataframe()

    # Geminiでデータを自然言語で分析
    data_str = results.to_string()
    response = model.generate_content(
        f"以下の売上データを分析して、ビジネスインサイトを提供してください:\n{data_str}"
    )
    return response.text

print(analyze_query_results())
```

## OpenAI APIからの移行

GeminiはOpenAI互換APIも提供しているため、既存コードをほぼそのまま移行できます：

```python
from openai import OpenAI

# Gemini のOpenAI互換エンドポイント
client = OpenAI(
    api_key=os.getenv("GOOGLE_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

response = client.chat.completions.create(
    model="gemini-2.0-flash",
    messages=[
        {"role": "system", "content": "あなたは役立つアシスタントです。"},
        {"role": "user", "content": "こんにちは、テストです"}
    ]
)
print(response.choices[0].message.content)
```

## コスト比較（2026年3月時点）

| モデル | 入力 (1M tokens) | 出力 (1M tokens) |
|--------|----------------|----------------|
| Gemini 2.0 Flash | $0.075 | $0.30 |
| Gemini 2.0 Pro | $1.25 | $5.00 |
| GPT-4o | $2.50 | $10.00 |
| Claude Sonnet 4.6 | $3.00 | $15.00 |

**Gemini 2.0 Flashは主要モデル中最安クラス**で、コスト重視の本番システムに最適です。

## まとめ

Gemini APIは**コスト効率・マルチモーダル機能・Google Cloud統合**の3点で優れています。

**Gemini APIが特に向いているシナリオ:**
- 大量の文書処理（コンテキストキャッシング活用）
- 画像・動画・音声を扱うマルチモーダルアプリ
- Google Cloudサービスと統合したシステム
- コストを抑えたいAPI集約サービス

**次のステップ:**
- [Google AI Studio](https://aistudio.google.com)でAPIキーを取得
- `pip install google-generativeai`でインストール
- 無料枠（1分あたり60リクエスト）で試してみる

## 関連記事

- [OpenAI API完全ガイド](/openai-api-guide-2026)
- [Anthropic Claude API完全ガイド](/anthropic-claude-api-guide)
- [AIエージェント開発入門2026](/ai-agent-development-2026)

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)