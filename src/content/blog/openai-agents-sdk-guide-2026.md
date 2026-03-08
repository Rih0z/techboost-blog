---
title: 'OpenAI Agents SDK入門2026 - マルチエージェント構築、ツール統合、Guardrails実装の完全ガイド'
description: 'OpenAI Agents SDKの基礎から実践まで。Agent/Tool/Guardrails/Handoff/Tracingの5コアコンセプトを実例付きで解説。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2026-03-07'
tags: ['AI', 'OpenAI', 'エージェント', 'Python']
heroImage: '../../assets/thumbnails/openai-agents-sdk-guide-2026.jpg'
---

## OpenAI Agents SDKとは何か

2025年3月にOpenAIが公開した**Agents SDK**（旧称: OpenAI Swarm）は、マルチエージェントシステムを構築するための軽量Pythonフレームワークです。

従来のLLMアプリケーション開発では、プロンプトの管理、ツールの呼び出し、エラーハンドリング、複数エージェント間の連携など、多くのボイラープレートコードが必要でした。Agents SDKはこれらを**最小限のコード**で実現できるよう設計されています。

特徴をまとめると以下の通りです。

| 特徴 | 説明 |
|------|------|
| **軽量設計** | 数行のコードでエージェントを定義・実行可能 |
| **5つのコアプリミティブ** | Agent, Tool, Guardrails, Handoff, Tracing |
| **OpenAI API完全統合** | GPT-4o, o3-miniなど最新モデルをそのまま利用 |
| **型安全** | Pydanticベースの入出力スキーマ定義 |
| **可観測性** | Tracingによる実行フローの完全な可視化 |
| **OSS** | MITライセンスで商用利用可能 |

本記事では、Agents SDKの5つのコアコンセプトを実際のコード例とともに段階的に解説します。

---

## 目次

1. [環境構築とインストール](#環境構築とインストール)
2. [コアコンセプト1: Agent - エージェントの定義](#コアコンセプト1-agent---エージェントの定義)
3. [コアコンセプト2: Tool - ツールの統合](#コアコンセプト2-tool---ツールの統合)
4. [コアコンセプト3: Guardrails - 安全性の確保](#コアコンセプト3-guardrails---安全性の確保)
5. [コアコンセプト4: Handoff - エージェント間の連携](#コアコンセプト4-handoff---エージェント間の連携)
6. [コアコンセプト5: Tracing - 実行の可視化](#コアコンセプト5-tracing---実行の可視化)
7. [実践: マルチエージェントパターン](#実践-マルチエージェントパターン)
8. [エラーハンドリングとリトライ](#エラーハンドリングとリトライ)
9. [LangChainとの比較](#langchainとの比較)
10. [本番運用のベストプラクティス](#本番運用のベストプラクティス)
11. [まとめ](#まとめ)

---

## 環境構築とインストール

### 前提条件

- Python 3.9以上
- OpenAI APIキー

### インストール

```bash
pip install openai-agents
```

Voiceサポート（音声エージェント）も使いたい場合は、追加の依存関係をインストールします。

```bash
pip install 'openai-agents[voice]'
```

### APIキーの設定

環境変数にOpenAI APIキーを設定します。

```bash
export OPENAI_API_KEY="sk-proj-xxxxxxxx"
```

Pythonコード内で設定する場合は以下の通りです。

```python
import os
os.environ["OPENAI_API_KEY"] = "sk-proj-xxxxxxxx"
```

本番環境では`.env`ファイルと`python-dotenv`を組み合わせるか、シークレット管理サービスを利用することを推奨します。

---

## コアコンセプト1: Agent - エージェントの定義

**Agent**はAgents SDKの最も基本的な構成要素です。LLMに「役割」と「振る舞い」を与える単位と考えてください。

### 最小構成のエージェント

```python
from agents import Agent, Runner

agent = Agent(
    name="アシスタント",
    instructions="あなたは親切な日本語アシスタントです。質問に簡潔に回答してください。",
)

result = Runner.run_sync(agent, "Pythonのリスト内包表記について教えてください")
print(result.final_output)
```

たったこれだけで、GPT-4oを使ったチャットエージェントが動作します。

### Agentの主要パラメータ

```python
agent = Agent(
    name="コードレビューア",
    instructions="""あなたは経験豊富なシニアエンジニアです。
    コードレビューを行い、以下の観点でフィードバックしてください：
    - バグの可能性
    - パフォーマンス
    - 可読性
    - セキュリティ""",
    model="gpt-4o",                # 使用するモデル
    output_type=ReviewResult,       # 構造化出力（後述）
    tools=[search_tool],            # 利用可能なツール
    handoffs=[escalation_agent],    # 引き継ぎ先エージェント
    guardrails=[content_filter],    # ガードレール
)
```

### 構造化出力（Structured Output）

Pydanticモデルを`output_type`に指定すると、エージェントの出力を型安全に受け取れます。

```python
from pydantic import BaseModel
from agents import Agent, Runner


class CodeReview(BaseModel):
    summary: str
    issues: list[str]
    severity: str  # "low" | "medium" | "high"
    approved: bool


agent = Agent(
    name="コードレビューア",
    instructions="提出されたコードをレビューし、結果を構造化して返してください。",
    output_type=CodeReview,
)

result = Runner.run_sync(agent, "def add(a, b): return a + b")
review: CodeReview = result.final_output_as(CodeReview)

print(f"承認: {review.approved}")
print(f"サマリ: {review.summary}")
for issue in review.issues:
    print(f"  - {issue}")
```

構造化出力を使うことで、後続の処理（データベースへの保存、API応答の生成など）が格段に楽になります。

---

## コアコンセプト2: Tool - ツールの統合

エージェントが外部システムと連携するための仕組みが**Tool**です。Agents SDKでは、Python関数をデコレータ1つでツールに変換できます。

### 関数ツール（Function Tool）

```python
from agents import Agent, Runner, function_tool


@function_tool
def get_weather(city: str) -> str:
    """指定された都市の天気を取得します。"""
    # 実際にはAPI呼び出しを行う
    weather_data = {
        "東京": "晴れ 25℃",
        "大阪": "曇り 22℃",
        "札幌": "雪 -3℃",
    }
    return weather_data.get(city, f"{city}の天気情報は見つかりませんでした")


agent = Agent(
    name="天気アシスタント",
    instructions="ユーザーが天気を聞いたら、get_weatherツールを使って回答してください。",
    tools=[get_weather],
)

result = Runner.run_sync(agent, "東京の天気を教えてください")
print(result.final_output)
```

`@function_tool`デコレータがやっていることは以下の通りです。

1. 関数のdocstringからツールの説明を自動生成
2. 型ヒントからパラメータスキーマを自動生成
3. OpenAI Function Calling形式に変換

### 非同期ツール

I/Oバウンドな処理（HTTP通信、DB問い合わせなど）には非同期版を使います。

```python
import httpx
from agents import Agent, Runner, function_tool


@function_tool
async def search_documentation(query: str) -> str:
    """技術ドキュメントを検索します。"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.example.com/search",
            params={"q": query},
        )
        data = response.json()
        return "\n".join([item["title"] for item in data["results"][:5]])


agent = Agent(
    name="ドキュメント検索アシスタント",
    instructions="技術的な質問にはsearch_documentationを使って回答してください。",
    tools=[search_documentation],
)

# 非同期実行
import asyncio

async def main():
    result = await Runner.run(agent, "FastAPIのミドルウェアについて教えて")
    print(result.final_output)

asyncio.run(main())
```

### 複数ツールの組み合わせ

実用的なエージェントでは複数のツールを組み合わせます。

```python
@function_tool
def read_file(path: str) -> str:
    """ファイルの内容を読み取ります。"""
    with open(path) as f:
        return f.read()


@function_tool
def list_files(directory: str) -> str:
    """ディレクトリ内のファイル一覧を返します。"""
    import os
    files = os.listdir(directory)
    return "\n".join(files)


@function_tool
def run_python(code: str) -> str:
    """Pythonコードを実行して結果を返します。"""
    import subprocess
    result = subprocess.run(
        ["python", "-c", code],
        capture_output=True,
        text=True,
        timeout=10,
    )
    if result.returncode != 0:
        return f"エラー: {result.stderr}"
    return result.stdout


coding_agent = Agent(
    name="コーディングアシスタント",
    instructions="""あなたはPython開発者です。
    ファイル操作やコード実行のツールを使って、
    ユーザーの開発タスクを支援してください。""",
    tools=[read_file, list_files, run_python],
)
```

---

## コアコンセプト3: Guardrails - 安全性の確保

**Guardrails**は、エージェントの入力・出力に対して安全性チェックを行う仕組みです。不適切なリクエストのブロックや、出力の品質保証に使います。

### 入力ガードレール

ユーザーの入力をチェックして、不適切な場合はエージェントの実行自体を止めます。

```python
from pydantic import BaseModel
from agents import (
    Agent,
    Runner,
    InputGuardrail,
    GuardrailFunctionOutput,
    input_guardrail,
)


class SafetyCheck(BaseModel):
    is_safe: bool
    reason: str


safety_agent = Agent(
    name="安全性チェッカー",
    instructions="ユーザーの入力が安全かどうか判定してください。個人情報の要求、違法行為の助長、有害コンテンツの生成要求はis_safe=Falseとしてください。",
    output_type=SafetyCheck,
)


@input_guardrail
async def content_safety_check(
    ctx, agent, input_data
) -> GuardrailFunctionOutput:
    """入力の安全性を検証するガードレール"""
    result = await Runner.run(safety_agent, input_data, context=ctx.context)
    check = result.final_output_as(SafetyCheck)
    return GuardrailFunctionOutput(
        output_info=check,
        tripwire_triggered=not check.is_safe,
    )


main_agent = Agent(
    name="メインアシスタント",
    instructions="ユーザーの質問に丁寧に回答してください。",
    input_guardrails=[content_safety_check],
)
```

`tripwire_triggered=True`が返された場合、メインエージェントの実行は即座に中断され、`InputGuardrailTripwireTriggered`例外が発生します。

### 出力ガードレール

エージェントの出力が要件を満たしているかチェックします。

```python
from agents import (
    Agent,
    Runner,
    OutputGuardrail,
    GuardrailFunctionOutput,
    output_guardrail,
)


class QualityCheck(BaseModel):
    has_code_example: bool
    is_accurate: bool
    confidence: float


quality_agent = Agent(
    name="品質チェッカー",
    instructions="技術的な回答の品質を評価してください。コード例が含まれているか、正確な情報か、信頼度を判定してください。",
    output_type=QualityCheck,
)


@output_guardrail
async def quality_check(ctx, agent, output) -> GuardrailFunctionOutput:
    """出力品質を検証するガードレール"""
    result = await Runner.run(quality_agent, str(output), context=ctx.context)
    check = result.final_output_as(QualityCheck)
    passed = check.is_accurate and check.confidence > 0.7
    return GuardrailFunctionOutput(
        output_info=check,
        tripwire_triggered=not passed,
    )


tech_agent = Agent(
    name="技術回答エージェント",
    instructions="プログラミングに関する質問に、コード例を交えて正確に回答してください。",
    output_guardrails=[quality_check],
)
```

ガードレールの実行は**並列**で行われるため、メインエージェントの応答速度に大きな影響を与えません。

---

## コアコンセプト4: Handoff - エージェント間の連携

**Handoff**は、あるエージェントが別のエージェントに会話を引き継ぐ仕組みです。これにより、専門性の異なるエージェントが協力して問題を解決できます。

### 基本的なHandoff

```python
from agents import Agent, Runner

# 専門エージェントを定義
billing_agent = Agent(
    name="請求担当",
    instructions="""あなたは請求・支払いの専門家です。
    料金プラン、請求書、支払い方法に関する質問に回答してください。
    技術的な質問はtriage_agentに戻してください。""",
    handoffs=[]  # 後で設定
)

tech_support_agent = Agent(
    name="技術サポート",
    instructions="""あなたは技術サポートの専門家です。
    API、SDK、技術的なトラブルシューティングに回答してください。
    請求に関する質問はtriage_agentに戻してください。""",
    handoffs=[]  # 後で設定
)

# トリアージ（振り分け）エージェント
triage_agent = Agent(
    name="受付",
    instructions="""あなたはカスタマーサポートの受付です。
    ユーザーの問い合わせ内容に応じて、適切な専門エージェントにhandoffしてください。
    - 料金・請求に関する質問 → billing_agent
    - 技術的な質問 → tech_support_agent
    自分では回答せず、必ず専門エージェントに引き継いでください。""",
    handoffs=[billing_agent, tech_support_agent],
)

# 循環参照を設定
billing_agent.handoffs = [triage_agent]
tech_support_agent.handoffs = [triage_agent]

result = Runner.run_sync(
    triage_agent,
    "APIのレート制限に引っかかっています。対処法を教えてください"
)
print(result.final_output)
```

Handoffの流れは次の通りです。

1. ユーザーの問い合わせが`triage_agent`に届く
2. 技術的な質問と判断し、`tech_support_agent`にhandoff
3. `tech_support_agent`が回答を生成
4. 結果がユーザーに返される

### カスタムHandoff

引き継ぎ時にコンテキスト情報を付加したい場合は、`handoff`関数を使います。

```python
from agents import Agent, handoff


def on_handoff_to_billing(ctx):
    """請求担当への引き継ぎ時に顧客情報を付加"""
    customer_id = ctx.context.get("customer_id", "unknown")
    return f"顧客ID: {customer_id} の問い合わせです。過去の請求履歴を確認してから回答してください。"


triage_agent = Agent(
    name="受付",
    instructions="問い合わせを適切な担当に振り分けてください。",
    handoffs=[
        handoff(
            agent=billing_agent,
            tool_name_override="transfer_to_billing",
            tool_description_override="請求・支払いに関する問い合わせを請求担当に転送します",
            on_handoff=on_handoff_to_billing,
        ),
    ],
)
```

---

## コアコンセプト5: Tracing - 実行の可視化

**Tracing**は、エージェントの実行フローを記録・可視化する仕組みです。デバッグ、パフォーマンス分析、コスト管理に不可欠な機能です。

### 自動トレーシング

Agents SDKはデフォルトでトレーシングが有効です。OpenAI Dashboardの「Traces」タブで実行ログを確認できます。

```python
from agents import Agent, Runner, trace

# トレースは自動的に記録される
result = Runner.run_sync(agent, "質問内容")

# カスタムトレース名をつける
with trace("カスタムワークフロー"):
    result1 = await Runner.run(agent_a, "ステップ1")
    result2 = await Runner.run(agent_b, result1.final_output)
```

### カスタムトレーシング

OpenTelemetryやLangfuseなど外部のオブザーバビリティツールと連携する場合は、カスタムのトレーシングプロセッサを実装します。

```python
from agents.tracing import TracingProcessor, Span, Trace, set_tracing_provider


class CustomTracingProcessor(TracingProcessor):
    def on_trace_start(self, trace: Trace) -> None:
        print(f"[TRACE START] {trace.name} (id={trace.trace_id})")

    def on_trace_end(self, trace: Trace) -> None:
        print(f"[TRACE END] {trace.name}")

    def on_span_start(self, span: Span) -> None:
        print(f"  [SPAN START] {span.span_type}: {span.name}")

    def on_span_end(self, span: Span) -> None:
        print(f"  [SPAN END] {span.name}")

    def shutdown(self) -> None:
        pass

    def force_flush(self) -> None:
        pass


# カスタムプロセッサを登録
set_tracing_provider(CustomTracingProcessor())
```

### トレーシングで取得できる情報

- **各エージェントの実行時間**: どのエージェントにどれくらい時間がかかったか
- **ツール呼び出し**: どのツールが何回呼ばれたか、引数は何か
- **Handoffの流れ**: どのエージェントからどのエージェントに引き継がれたか
- **トークン使用量**: 各ステップのトークン消費量
- **ガードレールの結果**: 入力/出力チェックの結果

---

## 実践: マルチエージェントパターン

ここからは、実務で使えるマルチエージェントパターンを紹介します。

### パターン1: パイプライン（直列処理）

複数のエージェントが順番に処理を行うパターンです。

```python
import asyncio
from agents import Agent, Runner


research_agent = Agent(
    name="リサーチャー",
    instructions="与えられたトピックについて、主要なポイントを5つ箇条書きでまとめてください。",
)

writer_agent = Agent(
    name="ライター",
    instructions="与えられた箇条書きの情報をもとに、読みやすいブログ記事の本文を日本語で書いてください。800文字程度でお願いします。",
)

editor_agent = Agent(
    name="エディター",
    instructions="与えられた記事を校正してください。誤字脱字、論理的な矛盾、読みにくい表現を修正し、最終版を出力してください。",
)


async def content_pipeline(topic: str) -> str:
    # Step 1: リサーチ
    research = await Runner.run(research_agent, f"トピック: {topic}")

    # Step 2: 執筆
    draft = await Runner.run(writer_agent, research.final_output)

    # Step 3: 校正
    final = await Runner.run(editor_agent, draft.final_output)

    return final.final_output


result = asyncio.run(content_pipeline("Python 3.13の新機能"))
print(result)
```

### パターン2: 並列実行 + 集約

複数のエージェントが同時に作業し、結果を1つのエージェントが集約するパターンです。

```python
import asyncio
from agents import Agent, Runner


security_reviewer = Agent(
    name="セキュリティレビューア",
    instructions="コードのセキュリティ上の問題点を指摘してください。SQLインジェクション、XSS、認証バイパスなどを重点的にチェックしてください。",
)

performance_reviewer = Agent(
    name="パフォーマンスレビューア",
    instructions="コードのパフォーマンス上の問題点を指摘してください。N+1問題、不要なメモリ割り当て、計算量の改善余地などをチェックしてください。",
)

readability_reviewer = Agent(
    name="可読性レビューア",
    instructions="コードの可読性を評価してください。命名規則、関数の長さ、コメントの適切さ、型ヒントの有無などをチェックしてください。",
)

summary_agent = Agent(
    name="レビューサマリー",
    instructions="複数の観点からのコードレビュー結果を統合し、優先度順にまとめた最終レポートを生成してください。",
)


async def parallel_code_review(code: str) -> str:
    # 3つのレビューを並列実行
    security_task = Runner.run(security_reviewer, code)
    performance_task = Runner.run(performance_reviewer, code)
    readability_task = Runner.run(readability_reviewer, code)

    results = await asyncio.gather(
        security_task, performance_task, readability_task
    )

    # 結果を集約
    combined = "\n\n".join([
        f"## {r.last_agent.name}\n{r.final_output}"
        for r in results
    ])

    final = await Runner.run(summary_agent, combined)
    return final.final_output


code_to_review = """
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    result = db.execute(query)
    return result.fetchone()
"""

result = asyncio.run(parallel_code_review(code_to_review))
print(result)
```

### パターン3: ルーティング（動的振り分け）

入力内容に応じて最適なエージェントに動的にルーティングするパターンです。Handoffを活用します。

```python
from agents import Agent, Runner

python_expert = Agent(
    name="Python専門家",
    instructions="Pythonに関する質問に、実行可能なコード例を交えて回答してください。",
)

rust_expert = Agent(
    name="Rust専門家",
    instructions="Rustに関する質問に、所有権やライフタイムの解説を交えて回答してください。",
)

go_expert = Agent(
    name="Go専門家",
    instructions="Goに関する質問に、goroutineやチャネルの活用例を交えて回答してください。",
)

router = Agent(
    name="技術質問ルーター",
    instructions="""ユーザーの技術質問を分析し、最も適切な専門家にhandoffしてください。
    - Python関連 → Python専門家
    - Rust関連 → Rust専門家
    - Go関連 → Go専門家
    判断に迷う場合はPython専門家にhandoffしてください。""",
    handoffs=[python_expert, rust_expert, go_expert],
)

result = Runner.run_sync(
    router,
    "goroutineでワーカープールを実装する方法を教えてください"
)
print(f"回答者: {result.last_agent.name}")
print(result.final_output)
```

---

## エラーハンドリングとリトライ

本番環境では、APIエラーやガードレール違反に対する適切なハンドリングが必要です。

### 基本的なエラーハンドリング

```python
from agents import Runner, InputGuardrailTripwireTriggered, MaxTurnsExceeded


async def safe_run(agent, prompt: str, max_retries: int = 3) -> str:
    for attempt in range(max_retries):
        try:
            result = await Runner.run(
                agent,
                prompt,
                max_turns=25,  # 無限ループ防止
            )
            return result.final_output

        except InputGuardrailTripwireTriggered as e:
            # ガードレール違反: リトライしても結果は変わらない
            return f"安全性チェックにより処理を中断しました: {e}"

        except MaxTurnsExceeded:
            # ターン数上限: プロンプトの見直しが必要
            return "処理が複雑すぎるため、質問を分割してください。"

        except Exception as e:
            if attempt < max_retries - 1:
                import asyncio
                wait_time = 2 ** attempt  # 指数バックオフ
                await asyncio.sleep(wait_time)
                continue
            return f"エラーが発生しました: {e}"
```

### RunConfigによる細かい制御

```python
from agents import Runner, RunConfig

config = RunConfig(
    model="gpt-4o",                  # デフォルトモデルの上書き
    max_turns=30,                     # 最大ターン数
    tracing_disabled=False,           # トレーシング有効
    model_provider=None,              # カスタムモデルプロバイダ
)

result = await Runner.run(agent, prompt, run_config=config)
```

### コンテキスト管理

複数のエージェント間で共有する情報は、コンテキストオブジェクトで管理します。

```python
from dataclasses import dataclass
from agents import Agent, Runner, RunContextWrapper


@dataclass
class AppContext:
    user_id: str
    is_premium: bool
    request_count: int = 0


@function_tool
async def get_account_info(
    ctx: RunContextWrapper[AppContext],
) -> str:
    """現在のユーザーのアカウント情報を取得します。"""
    context = ctx.context
    return f"ユーザーID: {context.user_id}, プレミアム: {context.is_premium}"


agent = Agent[AppContext](
    name="アカウントアシスタント",
    instructions="ユーザーのアカウント情報に基づいて回答してください。",
    tools=[get_account_info],
)

app_ctx = AppContext(user_id="usr_123", is_premium=True)
result = await Runner.run(agent, "私のアカウント情報を教えて", context=app_ctx)
```

---

## LangChainとの比較

Agents SDKとLangChainはどちらもLLMアプリケーション開発のフレームワークですが、設計思想が大きく異なります。

### 設計思想の違い

| 観点 | OpenAI Agents SDK | LangChain |
|------|------------------|-----------|
| **設計方針** | ミニマル・プリミティブ重視 | 包括的・抽象化重視 |
| **学習コスト** | 低い（5つのコンセプト） | 高い（多数の抽象レイヤー） |
| **モデル対応** | OpenAIモデル中心 | 多数のLLMプロバイダ対応 |
| **コード量** | 少ない | 多い（抽象レイヤーが多い） |
| **柔軟性** | 適度（規約 > 設定） | 高い（設定 > 規約） |
| **エコシステム** | OpenAI製品と緊密統合 | 広大なサードパーティ統合 |
| **デバッグ** | Tracingで直感的 | LangSmithが必要 |

### コード比較: 同じ処理を書いた場合

**Agents SDK版:**

```python
from agents import Agent, Runner, function_tool


@function_tool
def search(query: str) -> str:
    """ウェブ検索を行います。"""
    return f"{query}の検索結果..."


agent = Agent(
    name="検索アシスタント",
    instructions="検索ツールを使って質問に回答してください。",
    tools=[search],
)

result = Runner.run_sync(agent, "Python 3.13の新機能は？")
```

**LangChain版:**

```python
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool


@tool
def search(query: str) -> str:
    """ウェブ検索を行います。"""
    return f"{query}の検索結果..."


llm = ChatOpenAI(model="gpt-4o")
prompt = ChatPromptTemplate.from_messages([
    ("system", "検索ツールを使って質問に回答してください。"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])
agent = create_openai_functions_agent(llm, [search], prompt)
executor = AgentExecutor(agent=agent, tools=[search])
result = executor.invoke({"input": "Python 3.13の新機能は？"})
```

### 使い分けの指針

**Agents SDKが適している場合:**

- OpenAIモデルのみで構築する
- マルチエージェントのオーケストレーションが主目的
- できるだけシンプルなコードで実現したい
- OpenAI Dashboardでトレーシングを活用したい

**LangChainが適している場合:**

- 複数のLLMプロバイダを使い分けたい（Claude, Geminiなど）
- 既存のLangChainエコシステム（ベクトルストアなど）を活用したい
- RAG（検索拡張生成）パイプラインを構築したい
- LangSmith/LangGraphによる高度なワークフロー管理が必要

両者は排他的ではなく、プロジェクトの要件に応じて使い分けるのが現実的です。

---

## 本番運用のベストプラクティス

### 1. エージェントのinstructionsは具体的に

曖昧な指示はLLMの挙動を不安定にします。

```python
# 悪い例
agent = Agent(
    name="アシスタント",
    instructions="質問に答えてください。",
)

# 良い例
agent = Agent(
    name="技術サポート",
    instructions="""あなたはSaaS製品のテクニカルサポートです。

    回答のルール:
    1. まず問題を正確に理解するための質問をしてください
    2. 解決策は手順を番号付きで示してください
    3. 公式ドキュメントのURLがあれば添付してください
    4. 解決できない場合は「エンジニアチームにエスカレーションします」と伝えてください

    回答してはいけない内容:
    - 料金プランの変更（billing_agentにhandoff）
    - 社内の技術的な実装詳細
    - 他社製品との比較""",
)
```

### 2. max_turnsで無限ループを防止する

エージェントがツールを呼び続けるループに入ることがあります。

```python
result = await Runner.run(
    agent,
    prompt,
    max_turns=15,  # 適切な上限値を設定
)
```

### 3. コスト管理

モデル選択でコストを最適化します。

```python
# 高精度が必要なエージェント
critical_agent = Agent(
    name="重要判断",
    instructions="...",
    model="gpt-4o",
)

# 軽い処理のエージェント
simple_agent = Agent(
    name="分類器",
    instructions="...",
    model="gpt-4o-mini",
)
```

### 4. テストの書き方

エージェントのテストは決定論的ではないため、「振る舞い」を検証するスタイルで書きます。

```python
import pytest
from agents import Agent, Runner


@pytest.mark.asyncio
async def test_router_handoff():
    """ルーターが技術質問をtech_agentに正しく振り分けるか"""
    result = await Runner.run(
        router_agent,
        "Pythonの型ヒントの使い方を教えてください",
    )
    assert result.last_agent.name == "Python専門家"


@pytest.mark.asyncio
async def test_guardrail_blocks_unsafe_input():
    """ガードレールが不適切な入力をブロックするか"""
    from agents import InputGuardrailTripwireTriggered

    with pytest.raises(InputGuardrailTripwireTriggered):
        await Runner.run(
            guarded_agent,
            "他人のパスワードをハックする方法を教えて",
        )


@pytest.mark.asyncio
async def test_structured_output():
    """構造化出力が正しい型で返されるか"""
    result = await Runner.run(
        review_agent,
        "def hello(): print('hello')",
    )
    output = result.final_output_as(CodeReview)
    assert isinstance(output.approved, bool)
    assert isinstance(output.issues, list)
```

### 5. ストリーミング応答

ユーザー体験を向上させるため、ストリーミングを活用します。

```python
from agents import Agent, Runner


agent = Agent(
    name="ストリーミングアシスタント",
    instructions="質問に丁寧に回答してください。",
)


async def stream_response(prompt: str):
    result = Runner.run_streamed(agent, prompt)
    async for event in result.stream_events():
        if event.type == "raw_response_event" and hasattr(event.data, "delta"):
            print(event.data.delta, end="", flush=True)
    print()  # 改行
```

---

## まとめ

OpenAI Agents SDKは、マルチエージェントシステムの構築を驚くほどシンプルにしてくれるフレームワークです。

### 5つのコアコンセプトの要点

| コンセプト | 役割 | 一言まとめ |
|-----------|------|-----------|
| **Agent** | LLMに役割を与える | instructionsで振る舞いを定義 |
| **Tool** | 外部システムとの連携 | `@function_tool`で関数をツール化 |
| **Guardrails** | 安全性の担保 | 入力/出力のバリデーション |
| **Handoff** | エージェント間の連携 | 専門エージェントへの動的振り分け |
| **Tracing** | 実行の可視化 | デバッグ・コスト管理に必須 |

### 次のステップ

1. **公式ドキュメント**を読む: [https://openai.github.io/openai-agents-python/](https://openai.github.io/openai-agents-python/)
2. **公式サンプル**を動かす: [https://github.com/openai/openai-agents-python/tree/main/examples](https://github.com/openai/openai-agents-python/tree/main/examples)
3. **小さなプロジェクト**から始める: まずは単一エージェント + ツール1つの構成で試す
4. **段階的に拡張**: Handoffでマルチエージェント化 → Guardrailsで安全性追加 → Tracingで監視

LangChainのような大規模フレームワークに比べて学習コストが低く、OpenAI APIを使うプロジェクトであれば第一候補として検討する価値があります。

特にカスタマーサポートBotや社内ナレッジアシスタントのように、問い合わせの種類に応じて専門エージェントに振り分けるユースケースでは、Handoffの仕組みが非常に直感的で実装しやすいです。

まずは`pip install openai-agents`を実行して、最小構成のエージェントから始めてみてください。
