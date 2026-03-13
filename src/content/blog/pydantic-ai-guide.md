---
title: "PydanticAIで型安全なAIアプリを開発する完全ガイド2026 - Pythonエンジニア向け"
description: "Pydanticチームが開発したAIフレームワーク「PydanticAI」を徹底解説。型安全なエージェント・構造化出力・ツール呼び出し・依存性注入を実装例付きで解説。FastAPIと組み合わせた本番実装も紹介。開発効率を上げるヒントが満載です。"
pubDate: "2026-03-04"
tags: ["AI", "PydanticAI", "Python", "Pydantic", "型安全", "エージェント"]
heroImage: '../../assets/thumbnails/pydantic-ai-guide.jpg'
---
## はじめに

PydanticAIは、Pythonの型システムを最大限に活用したAIフレームワークです。LangChainやLlamaIndexとは異なり、**Pythonの標準的なコーディングスタイル**でLLMアプリを構築できます。

FastAPIの開発チームが作った信頼性の高いフレームワークで、2026年のPythonエコシステムで急速に普及しています。

## PydanticAIとは

### 設計思想

```python
# 従来のアプローチ（複雑）
from langchain.agents import initialize_agent
agent = initialize_agent(tools, llm, agent="react-docstore", ...)

# PydanticAIのアプローチ（シンプル・型安全）
from pydantic_ai import Agent

agent = Agent('openai:gpt-4o', result_type=MyTypedResponse)
result = await agent.run("質問")
print(result.data)  # 型安全！
```

**主な特徴:**
- **型安全**: Pydanticモデルで入出力を定義
- **マルチモデル対応**: OpenAI、Anthropic、Gemini、Groq、Ollama対応
- **依存性注入**: FastAPIスタイルの依存性注入でテストが容易
- **ストリーミング**: 非同期ストリーミングをファーストクラスサポート
- **テスト**: TestModelで実際のAPIを呼ばずにテスト可能

## インストール

```bash
pip install 'pydantic-ai[openai]'

# Anthropic対応
pip install 'pydantic-ai[anthropic]'

# 全プロバイダー
pip install 'pydantic-ai[all]'
```

## 基本的な使い方

### シンプルなエージェント

```python
from pydantic_ai import Agent

# シンプルなエージェント
agent = Agent(
    'openai:gpt-4o',
    system_prompt="あなたは役立つPythonエンジニアのアシスタントです。"
)

# 同期実行
result = agent.run_sync("Pythonでsorted()とsort()の違いを教えてください")
print(result.data)  # str型
```

### 型安全な出力

```python
from pydantic import BaseModel, Field
from pydantic_ai import Agent

class CodeReview(BaseModel):
    score: int = Field(ge=1, le=10, description="コード品質スコア（1-10）")
    issues: list[str] = Field(description="発見した問題点")
    suggestions: list[str] = Field(description="改善提案")
    summary: str = Field(description="総合評価コメント")

# 構造化された出力を持つエージェント
reviewer = Agent(
    'openai:gpt-4o',
    result_type=CodeReview,
    system_prompt="コードレビューの専門家として、提供されたコードを評価してください。"
)

code = """
def get_user(id):
    sql = f"SELECT * FROM users WHERE id = {id}"
    return db.execute(sql)
"""

result = reviewer.run_sync(f"このコードをレビューしてください:\n```python\n{code}\n```")
review: CodeReview = result.data

print(f"スコア: {review.score}/10")
print(f"問題点:\n" + "\n".join(f"  - {i}" for i in review.issues))
print(f"改善提案:\n" + "\n".join(f"  - {s}" for s in review.suggestions))
# > スコア: 2/10
# > 問題点:
# >   - SQLインジェクション脆弱性がある
# >   - 型アノテーションがない
# >   - エラーハンドリングがない
```

## ツールの定義

```python
from pydantic_ai import Agent, RunContext
from pydantic_ai.tools import ToolDefinition
import httpx
from datetime import datetime

# エージェントの定義
weather_agent = Agent(
    'anthropic:claude-sonnet-4-6',
    system_prompt="天気情報を提供する気象アシスタントです。",
)

# ツールデコレータで定義
@weather_agent.tool
async def get_current_weather(ctx: RunContext, city: str) -> dict:
    """指定した都市の現在の天気を取得します。

    Args:
        city: 天気を調べる都市名（例：東京、大阪）
    """
    # 実際にはAPIを呼ぶ
    async with httpx.AsyncClient() as client:
        # ここでは仮データを返す
        return {
            "city": city,
            "temperature": 18,
            "condition": "晴れ",
            "humidity": 65,
            "timestamp": datetime.now().isoformat()
        }

@weather_agent.tool
async def get_weather_forecast(ctx: RunContext, city: str, days: int = 3) -> list[dict]:
    """天気予報を取得します。

    Args:
        city: 都市名
        days: 予報日数（1-7）
    """
    return [
        {"date": f"2026-03-0{i+4}", "high": 20+i, "low": 10+i, "condition": "晴れ時々曇り"}
        for i in range(days)
    ]

# 実行
import asyncio

async def main():
    result = await weather_agent.run(
        "東京の今日の天気と3日間の予報を教えてください"
    )
    print(result.data)

asyncio.run(main())
```

## 依存性注入

FastAPIスタイルの依存性注入でテストが簡単になります：

```python
from dataclasses import dataclass
from pydantic_ai import Agent, RunContext
import httpx

# 依存関係の定義（データクラス）
@dataclass
class ApiDependencies:
    http_client: httpx.AsyncClient
    api_key: str
    database_url: str

# 依存関係を使うエージェント
api_agent = Agent(
    'openai:gpt-4o',
    deps_type=ApiDependencies,
    system_prompt="APIデータを分析するエージェントです。",
)

@api_agent.tool
async def fetch_user_data(ctx: RunContext[ApiDependencies], user_id: int) -> dict:
    """ユーザーデータを取得します。"""
    response = await ctx.deps.http_client.get(
        f"https://api.example.com/users/{user_id}",
        headers={"X-API-Key": ctx.deps.api_key}
    )
    return response.json()

@api_agent.tool
async def query_database(ctx: RunContext[ApiDependencies], query: str) -> list[dict]:
    """データベースを照会します。"""
    # データベースクエリ（実装は省略）
    return [{"id": 1, "name": "サンプルデータ"}]

# 本番での使用
async def run_production():
    deps = ApiDependencies(
        http_client=httpx.AsyncClient(),
        api_key="production-key",
        database_url="postgresql://prod/db"
    )
    result = await api_agent.run("ユーザーID 123のデータを分析してください", deps=deps)
    return result.data
```

## テスト

PydanticAIには`TestModel`があり、実際のAPIを呼ばずにテストできます：

```python
from pydantic_ai import Agent
from pydantic_ai.models.test import TestModel
from pydantic import BaseModel
import pytest

class Summary(BaseModel):
    title: str
    points: list[str]

summary_agent = Agent(
    'openai:gpt-4o',
    result_type=Summary,
)

# pytestでのテスト
def test_summary_agent():
    # TestModelで実際のAPIを呼ばずにテスト
    with summary_agent.override(model=TestModel()):
        result = summary_agent.run_sync("Next.jsの特徴をまとめてください")

    # TestModelはデフォルト値を返す
    assert isinstance(result.data, Summary)
    assert result.data.title is not None
    assert isinstance(result.data.points, list)

# カスタムレスポンスのモック
def test_with_custom_response():
    with summary_agent.override(
        model=TestModel(custom_result_text='{"title": "Next.js", "points": ["SSR", "SSG"]}')
    ):
        result = summary_agent.run_sync("...")

    assert result.data.title == "Next.js"
    assert "SSR" in result.data.points
```

## マルチモデル対応

```python
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.models.gemini import GeminiModel
import os

# OpenAI
openai_agent = Agent(OpenAIModel('gpt-4o'))

# Anthropic Claude
claude_agent = Agent(AnthropicModel('claude-sonnet-4-6'))

# Gemini
gemini_agent = Agent(GeminiModel('gemini-2.0-flash'))

# Ollama（ローカルLLM）
from pydantic_ai.models.openai import OpenAIModel
ollama_model = OpenAIModel(
    'llama3.2',
    base_url='http://localhost:11434/v1',
    api_key='ollama'
)
ollama_agent = Agent(ollama_model)

# 実行環境に応じてモデルを切り替え
def get_agent() -> Agent:
    env = os.getenv("APP_ENV", "development")
    if env == "production":
        return Agent('openai:gpt-4o')
    else:
        return Agent(ollama_model)  # 開発環境はローカルLLM
```

## FastAPIとの統合

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pydantic_ai import Agent
import httpx

app = FastAPI()

# リクエスト/レスポンスモデル
class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None

class ChatResponse(BaseModel):
    reply: str
    tokens_used: int

# エージェントの初期化
chat_agent = Agent(
    'anthropic:claude-sonnet-4-6',
    system_prompt="あなたはイザークコンサルティングのサポートボットです。"
)

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        result = await chat_agent.run(request.message)
        return ChatResponse(
            reply=result.data,
            tokens_used=result.usage().total_tokens
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ストリーミングエンドポイント
from fastapi.responses import StreamingResponse

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    async def generate():
        async with chat_agent.run_stream(request.message) as result:
            async for text in result.stream_text():
                yield f"data: {text}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

## 会話履歴の管理

```python
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage

# エージェント
conversation_agent = Agent('openai:gpt-4o')

# 会話履歴を維持
message_history: list[ModelMessage] = []

async def chat(user_message: str) -> str:
    result = await conversation_agent.run(
        user_message,
        message_history=message_history  # 履歴を渡す
    )

    # 今回の会話を履歴に追加
    message_history.extend(result.all_messages())

    return result.data

# 会話の例
import asyncio

async def main():
    print(await chat("Pythonの非同期処理について教えてください"))
    print(await chat("それを使ったFastAPIの実装例を見せてください"))  # 文脈を引き継ぐ
    print(await chat("先ほどの例のエラーハンドリングを改善してください"))  # さらに継続

asyncio.run(main())
```

## パフォーマンスモニタリング

```python
from pydantic_ai import Agent

agent = Agent('openai:gpt-4o')

async def monitored_run(query: str):
    result = await agent.run(query)

    # 使用量の確認
    usage = result.usage()
    print(f"入力トークン: {usage.request_tokens}")
    print(f"出力トークン: {usage.response_tokens}")
    print(f"合計トークン: {usage.total_tokens}")

    # メッセージ履歴の確認
    for msg in result.all_messages():
        print(f"[{msg.kind}] {str(msg)[:100]}...")

    return result.data
```

## LangChain vs PydanticAI 比較

| 観点 | PydanticAI | LangChain |
|------|-----------|-----------|
| 型安全性 | ✅ ネイティブ | △ 部分的 |
| 学習コスト | 低（Pythonネイティブ） | 高（独自概念多数） |
| 軽量さ | ✅ | ❌ 重い |
| エコシステム | 小（成長中） | 大（豊富） |
| テスト | TestModelで簡単 | モックが複雑 |
| 依存性注入 | ✅ FastAPI流 | ❌ |
| マルチモデル | ✅ | ✅ |

## まとめ

PydanticAIは**Pythonエンジニアが最も自然な形でAIアプリを開発できる**フレームワークです。

**特に向いているシナリオ:**
- 型安全性が重要な本番システム
- FastAPIと組み合わせたバックエンド
- テストが重要なエンタープライズ開発
- Pydanticをすでに使っているプロジェクト

**次のステップ:**
- `pip install 'pydantic-ai[openai]'`で始める
- シンプルな構造化出力エージェントを作る
- FastAPIと統合してAPIとして公開

## 関連記事

- [AIエージェント開発入門2026](/ai-agent-development-2026)
- [FastAPIでREST APIを構築する](/fastapi-rest-api-guide)
- [Pydanticデータバリデーション完全ガイド](/pydantic-data-validation)

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)