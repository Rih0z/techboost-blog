---
title: "LangGraphでAIワークフローを構築する実践ガイド2026 - ステートマシン型エージェント開発"
description: "LangGraphを使ってグラフベースのAIエージェントとワークフローを構築する方法を解説。状態管理、条件分岐、ループ処理、マルチエージェント連携まで実装例付きで完全網羅。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2026-03-04"
tags: ["AI", "LangGraph", "LangChain", "エージェント", "Python", "LLM"]
---
## はじめに

LangGraphは、LangChainチームが開発した**グラフベースのAIワークフローフレームワーク**です。複雑なAIエージェントを「状態機械（ステートマシン）」として定義し、条件分岐・ループ・並列処理を直感的に実装できます。

2026年、エンタープライズレベルのAIアプリ開発でLangGraphはデファクトスタンダードになりつつあります。

## LangGraphとは

### 従来のLLMチェーンの限界

```
入力 → LLM1 → LLM2 → LLM3 → 出力
（直線的なパイプライン）
```

複雑なタスクには不十分でした：ツール呼び出しの失敗時のリトライ、複数のエージェントが協調作業、人間の確認を挟む（Human-in-the-loop）。

### LangGraphのアプローチ

```
            [検索]
           /       \
開始 → [計画] → [コード生成] → [実行] → [終了]
           \                  /
            [エラー処理] ←---
（グラフ構造で複雑なフローを表現）
```

**主な特徴:**
- **ステート管理**: ワークフロー全体の状態を型安全に管理
- **条件分岐**: 状態に基づいて次のノードを動的に決定
- **サイクル（ループ）**: LLMが「続ける」か「終了」かを判断
- **ストリーミング**: 各ステップの進捗をリアルタイムに取得
- **Human-in-the-loop**: 人間の承認を挟む処理
- **永続化**: チェックポイントで状態を保存・再開

## インストール

```bash
pip install langgraph langchain-openai langchain-community

# またはAnthropicと一緒に
pip install langgraph langchain-anthropic
```

## 基本: シンプルなエージェント

### ステート定義

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage
import operator

# グラフ全体で共有される状態の型定義
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]  # メッセージ履歴を追記
    current_step: str
    result: str
```

### ノード（処理単位）の定義

```python
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode

# ツールの定義
@tool
def search_web(query: str) -> str:
    """Webを検索します。"""
    # 実際にはAPIを呼ぶ
    return f"'{query}'の検索結果: 最新情報が見つかりました..."

@tool
def calculate(expression: str) -> str:
    """数式を計算します。"""
    try:
        result = eval(expression)
        return str(result)
    except:
        return "計算エラー"

tools = [search_web, calculate]

# LLMにツールを紐付け
llm = ChatOpenAI(model="gpt-4o")
llm_with_tools = llm.bind_tools(tools)

# エージェントノード
def agent_node(state: AgentState):
    messages = state["messages"]
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}

# ツール実行ノード
tool_node = ToolNode(tools)
```

### グラフの構築

```python
from langgraph.graph import StateGraph, END

# グラフの作成
graph = StateGraph(AgentState)

# ノードを追加
graph.add_node("agent", agent_node)
graph.add_node("tools", tool_node)

# 条件分岐: ツール呼び出しがあればtools、なければENDへ
def should_use_tools(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]

    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

# エッジの追加
graph.set_entry_point("agent")
graph.add_conditional_edges("agent", should_use_tools)
graph.add_edge("tools", "agent")  # ツール実行後はエージェントへ戻る

# コンパイル
app = graph.compile()
```

### 実行

```python
# 同期実行
result = app.invoke({
    "messages": [HumanMessage(content="東京の明日の天気を調べて、摂氏と華氏で教えて")]
})

for msg in result["messages"]:
    print(f"{msg.__class__.__name__}: {msg.content}")

# ストリーミング実行
for event in app.stream({
    "messages": [HumanMessage(content="1234 * 5678を計算してください")]
}):
    for key, value in event.items():
        print(f"[{key}]", value)
```

## 中級: ReActエージェント

ReAct（Reasoning + Acting）パターンをLangGraphで実装します：

```python
from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
import operator

class ReActState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    iterations: int

# Claudeをベースにしたエージェント
llm = ChatAnthropic(model="claude-sonnet-4-6")

SYSTEM_PROMPT = """あなたは役立つAIアシスタントです。
タスクを達成するために、利用可能なツールを使ってください。
思考 → 行動 → 観察のサイクルで問題を解決します。"""

def react_agent(state: ReActState):
    messages = state["messages"]
    system = SystemMessage(content=SYSTEM_PROMPT)

    response = llm.bind_tools(tools).invoke([system] + messages)
    return {
        "messages": [response],
        "iterations": state["iterations"] + 1
    }

def should_continue(state: ReActState) -> Literal["tools", "end"]:
    messages = state["messages"]
    last_message = messages[-1]

    # 最大イテレーション数を超えたら終了
    if state["iterations"] >= 10:
        return "end"

    # ツール呼び出しがあれば続行
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"

    return "end"

# グラフ構築
react_graph = StateGraph(ReActState)
react_graph.add_node("agent", react_agent)
react_graph.add_node("tools", ToolNode(tools))
react_graph.set_entry_point("agent")
react_graph.add_conditional_edges(
    "agent",
    should_continue,
    {"tools": "tools", "end": END}
)
react_graph.add_edge("tools", "agent")

react_app = react_graph.compile()
```

## 高度: マルチエージェントシステム

複数の専門エージェントが協調するシステム：

```python
from langgraph.graph import StateGraph, END, MessagesState
from langchain_openai import ChatOpenAI

# 各エージェントの役割
PLANNER_PROMPT = """あなたはプランナーエージェントです。
タスクを分析し、具体的な実行計画を立ててください。
出力形式: {"plan": ["step1", "step2", ...]}"""

RESEARCHER_PROMPT = """あなたはリサーチャーエージェントです。
与えられた情報を調査・分析してください。"""

WRITER_PROMPT = """あなたはライターエージェントです。
調査結果を基に、明確で読みやすいレポートを書いてください。"""

class TeamState(TypedDict):
    task: str
    plan: list[str]
    research: str
    report: str
    next_agent: str

llm = ChatOpenAI(model="gpt-4o")

def planner_agent(state: TeamState):
    """タスクを分解してプランを立てる"""
    import json
    messages = [
        {"role": "system", "content": PLANNER_PROMPT},
        {"role": "user", "content": f"タスク: {state['task']}"}
    ]
    response = llm.invoke(messages)
    try:
        plan_data = json.loads(response.content)
        plan = plan_data.get("plan", [])
    except:
        plan = [state["task"]]

    return {"plan": plan, "next_agent": "researcher"}

def researcher_agent(state: TeamState):
    """情報を調査・収集する"""
    plan_text = "\n".join([f"- {step}" for step in state["plan"]])
    messages = [
        {"role": "system", "content": RESEARCHER_PROMPT},
        {"role": "user", "content": f"以下の計画を基に調査してください:\n{plan_text}"}
    ]
    response = llm.invoke(messages)
    return {"research": response.content, "next_agent": "writer"}

def writer_agent(state: TeamState):
    """レポートを作成する"""
    messages = [
        {"role": "system", "content": WRITER_PROMPT},
        {"role": "user", "content": f"調査結果:\n{state['research']}"}
    ]
    response = llm.invoke(messages)
    return {"report": response.content, "next_agent": "end"}

def route_agent(state: TeamState):
    return state["next_agent"]

# マルチエージェントグラフ
team_graph = StateGraph(TeamState)
team_graph.add_node("planner", planner_agent)
team_graph.add_node("researcher", researcher_agent)
team_graph.add_node("writer", writer_agent)

team_graph.set_entry_point("planner")
team_graph.add_conditional_edges(
    "planner", route_agent,
    {"researcher": "researcher", "end": END}
)
team_graph.add_conditional_edges(
    "researcher", route_agent,
    {"writer": "writer", "end": END}
)
team_graph.add_conditional_edges(
    "writer", route_agent,
    {"end": END}
)

team_app = team_graph.compile()

# 実行
result = team_app.invoke({"task": "2026年のAI開発トレンドについてレポートを作成してください"})
print("最終レポート:")
print(result["report"])
```

## Human-in-the-loop（人間の承認）

```python
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, END, interrupt

class ApprovalState(TypedDict):
    task: str
    draft: str
    approved: bool
    final: str

def draft_node(state: ApprovalState):
    """下書きを生成"""
    llm = ChatOpenAI(model="gpt-4o")
    response = llm.invoke([
        {"role": "user", "content": f"以下についてドラフトを作成: {state['task']}"}
    ])
    return {"draft": response.content}

def human_review(state: ApprovalState):
    """人間の確認を待つ（ここで処理が中断される）"""
    print("\n=== 人間のレビューが必要です ===")
    print(f"ドラフト:\n{state['draft']}")
    print("================================")
    # interrupt()で処理を中断し、人間の入力を待つ
    user_input = interrupt("このドラフトを承認しますか？ (yes/no)")
    return {"approved": user_input.lower() == "yes"}

def finalize(state: ApprovalState):
    if state["approved"]:
        return {"final": state["draft"]}
    else:
        return {"final": "ドラフトは却下されました。"}

def route_after_review(state: ApprovalState):
    return "finalize"

# チェックポイント（状態保存）
memory = MemorySaver()

approval_graph = StateGraph(ApprovalState)
approval_graph.add_node("draft", draft_node)
approval_graph.add_node("review", human_review)
approval_graph.add_node("finalize", finalize)
approval_graph.set_entry_point("draft")
approval_graph.add_edge("draft", "review")
approval_graph.add_edge("review", "finalize")
approval_graph.add_edge("finalize", END)

approval_app = approval_graph.compile(
    checkpointer=memory,
    interrupt_before=["review"]  # レビュー前に中断
)
```

## 状態の永続化

```python
from langgraph.checkpoint.postgres import PostgresSaver

# Postgresで状態を永続化
with PostgresSaver.from_conn_string(
    "postgresql://user:pass@localhost/db"
) as checkpointer:
    app = graph.compile(checkpointer=checkpointer)

    # 設定（スレッドIDで会話を識別）
    config = {"configurable": {"thread_id": "user_123"}}

    # 実行
    result = app.invoke(
        {"messages": [HumanMessage(content="こんにちは")]},
        config=config
    )

    # 続きから再開（同じthread_id）
    result2 = app.invoke(
        {"messages": [HumanMessage(content="先ほどの続きで...")]},
        config=config
    )
```

## ストリーミングと可視化

```python
# イベントのストリーミング
async def stream_agent(query: str):
    async for event in app.astream_events(
        {"messages": [HumanMessage(content=query)]},
        version="v2"
    ):
        kind = event["event"]

        if kind == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            if content:
                print(content, end="", flush=True)

        elif kind == "on_tool_start":
            print(f"\n[ツール実行: {event['name']}]")

        elif kind == "on_tool_end":
            print(f"[ツール完了]")

import asyncio
asyncio.run(stream_agent("最新のAI技術を調べてください"))
```

## LangGraph Studio（視覚的なデバッグ）

```bash
# LangGraph Studioをローカルで起動
pip install langgraph-cli
langgraph dev
```

`langgraph.json`の設定：

```json
{
  "dependencies": ["."],
  "graphs": {
    "my_agent": "./agent.py:app"
  }
}
```

## まとめ

LangGraphは**複雑なAIワークフローを構造化して管理**するための強力なフレームワークです。

**LangGraphが特に向いているシナリオ:**
- 複数ステップにわたる複雑なタスク
- ツール呼び出しを含むエージェント
- 人間の承認が必要なワークフロー
- 状態を保持した長期的な会話
- マルチエージェント協調システム

**次のステップ:**
- LangSmithでエージェントの動作を可視化・デバッグ
- PostgresSaverで本番環境の状態管理
- LangGraph Studioでリアルタイムデバッグ

## 関連記事

- [LangChainでRAGシステムを構築する](/langchain-ai-app-guide)
- [CrewAIマルチエージェント開発ガイド](/crewai-multi-agent-guide)
- [AIエージェント開発入門2026](/ai-agent-development-2026)
