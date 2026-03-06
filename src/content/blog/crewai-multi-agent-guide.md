---
title: "CrewAIでマルチエージェントシステムを開発する完全ガイド2026 - 役割分担AIチームの構築"
description: "CrewAIを使ってAIエージェントのチームを構築する方法を徹底解説。エージェント・タスク・クルーの定義から、実践的なユースケース（リサーチ・コンテンツ生成・データ分析）まで実装例付きで解説。AI・CrewAI・マルチエージェントに関する実践情報。"
pubDate: "2026-03-04"
tags: ["AI", "CrewAI", "マルチエージェント", "Python", "LLM", "エージェント"]
---
## はじめに

CrewAIは、複数のAIエージェントが**役割を分担して協調作業**するマルチエージェントフレームワークです。人間のチームのように、それぞれ専門スキルを持つエージェントがタスクを分担して複雑な問題を解決します。

2026年、AIエージェントの実用化が進む中、CrewAIは最も人気のある多エージェントフレームワークの一つになっています。

## CrewAIとは

### コアコンセプト

```
               ┌─────────────────────────────────┐
               │            Crew（クルー）          │
               │  ┌──────────┐  ┌──────────┐      │
               │  │Agent     │  │Agent     │      │
               │  │リサーチャー│  │ライター   │      │
               │  └──────────┘  └──────────┘      │
               │       ↓              ↓            │
               │  ┌──────────┐  ┌──────────┐      │
               │  │Task      │  │Task      │      │
               │  │情報収集   │  │記事作成   │      │
               │  └──────────┘  └──────────┘      │
               └─────────────────────────────────┘
```

**主要コンポーネント:**
- **Agent**: 役割・目標・バックストーリーを持つAIエージェント
- **Task**: エージェントが実行する具体的なタスク
- **Crew**: エージェントとタスクをまとめるオーケストレーター
- **Tool**: エージェントが使用できるツール（検索、コード実行など）
- **Process**: タスクの実行順序（Sequential / Hierarchical）

## インストール

```bash
pip install crewai crewai-tools

# または最新版
pip install 'crewai[tools]'
```

## 基本的な使い方

### シンプルなクルーの作成

```python
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool, WebsiteSearchTool
from langchain_openai import ChatOpenAI

# ツールの準備
search_tool = SerperDevTool()  # Google検索ツール

# エージェントの定義
researcher = Agent(
    role="シニアリサーチャー",
    goal="指定されたトピックについて最新かつ正確な情報を収集する",
    backstory="""あなたは10年以上の経験を持つリサーチャーです。
    常に信頼できるソースから情報を収集し、データに基づいた洞察を提供します。
    最新のAI技術トレンドに精通しています。""",
    verbose=True,
    allow_delegation=False,
    tools=[search_tool],
    llm=ChatOpenAI(model="gpt-4o")
)

writer = Agent(
    role="テクニカルライター",
    goal="複雑な技術情報を分かりやすい日本語記事にまとめる",
    backstory="""あなたは技術系メディアで活躍するライターです。
    エンジニア読者を対象に、実践的で読みやすい技術記事を書くことを得意としています。
    SEOも意識した構成で記事を作成します。""",
    verbose=True,
    allow_delegation=False,
    llm=ChatOpenAI(model="gpt-4o")
)

# タスクの定義
research_task = Task(
    description="""2026年のAIエージェント開発トレンドについて調査してください。
    特に以下の点に焦点を当ててください：
    1. 主要なフレームワーク（LangGraph、CrewAI、AutoGen）の特徴
    2. 企業での実用事例
    3. 今後6ヶ月の予測

    調査結果は箇条書きで整理してください。""",
    expected_output="調査結果のレポート（箇条書き、500文字以上）",
    agent=researcher
)

writing_task = Task(
    description="""リサーチャーの調査結果を基に、エンジニア向けの技術記事を作成してください。

    記事の要件：
    - タイトル：SEOキーワードを含む
    - 長さ：1000〜1500文字
    - 構成：導入→本文（3セクション）→まとめ
    - コード例を1つ以上含める
    - 読者：Webエンジニア（経験3年以上）""",
    expected_output="完成した技術記事（マークダウン形式）",
    agent=writer,
    context=[research_task]  # research_taskの結果を使用
)

# クルーの作成と実行
crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    process=Process.sequential,  # タスクを順番に実行
    verbose=True
)

result = crew.kickoff()
print(result)
```

## Hierarchicalプロセス（マネージャー型）

```python
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

# マネージャーが各エージェントに仕事を割り当てる
manager = Agent(
    role="プロジェクトマネージャー",
    goal="チーム全体の作業を調整し、最高品質の成果物を届ける",
    backstory="シニアPMとして、複数プロジェクトを同時管理してきた経験者。",
    allow_delegation=True,  # 他エージェントへの委任を許可
    llm=ChatOpenAI(model="gpt-4o")
)

developer = Agent(
    role="フルスタックエンジニア",
    goal="要件を満たす高品質なコードを実装する",
    backstory="React/Node.jsを得意とするフルスタックエンジニア。",
    tools=[],
    llm=ChatOpenAI(model="gpt-4o")
)

reviewer = Agent(
    role="コードレビュアー",
    goal="コードの品質・セキュリティ・パフォーマンスをレビューする",
    backstory="セキュリティとパフォーマンスに詳しいシニアエンジニア。",
    tools=[],
    llm=ChatOpenAI(model="gpt-4o")
)

# タスク
implementation_task = Task(
    description="""ユーザー認証システムをTypeScriptで実装してください。
    要件：
    - JWT認証
    - パスワードのbcryptハッシュ化
    - ログイン・ログアウト・リフレッシュトークン
    - Express.js使用""",
    expected_output="TypeScriptの実装コード",
    agent=developer
)

review_task = Task(
    description="実装されたコードのセキュリティレビューを実施してください。",
    expected_output="レビューレポートと改善提案",
    agent=reviewer,
    context=[implementation_task]
)

# Hierarchical処理でマネージャーが調整
crew = Crew(
    agents=[manager, developer, reviewer],
    tasks=[implementation_task, review_task],
    process=Process.hierarchical,  # マネージャーが調整
    manager_llm=ChatOpenAI(model="gpt-4o"),
    verbose=True
)

result = crew.kickoff()
```

## カスタムツールの作成

```python
from crewai_tools import BaseTool
from typing import Type
from pydantic import BaseModel, Field
import requests

class GitHubSearchInput(BaseModel):
    query: str = Field(description="GitHubで検索するクエリ")
    language: str = Field(description="プログラミング言語でフィルタ", default="")

class GitHubSearchTool(BaseTool):
    name: str = "GitHub検索ツール"
    description: str = "GitHubのリポジトリを検索します。コード例やOSSプロジェクトを探す際に使います。"
    args_schema: Type[BaseModel] = GitHubSearchInput

    def _run(self, query: str, language: str = "") -> str:
        url = "https://api.github.com/search/repositories"
        params = {"q": query, "sort": "stars"}
        if language:
            params["q"] += f" language:{language}"

        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            items = data.get("items", [])[:3]
            results = []
            for item in items:
                results.append(
                    f"- {item['name']} ⭐{item['stargazers_count']}: {item['description']}"
                )
            return "\n".join(results) if results else "結果が見つかりませんでした"
        except Exception as e:
            return f"エラー: {str(e)}"

# エージェントにカスタムツールを追加
github_tool = GitHubSearchTool()

oss_researcher = Agent(
    role="OSSリサーチャー",
    goal="最新のOSSプロジェクトトレンドを調査する",
    backstory="GitHub上のトレンドを日々追っているOSSコミュニティメンバー。",
    tools=[github_tool],
    llm=ChatOpenAI(model="gpt-4o")
)
```

## 入力変数と動的タスク

```python
from crewai import Agent, Task, Crew

# 変数を使ったタスク定義
analysis_task = Task(
    description="""以下の製品について市場分析を実施してください：

    製品名: {product_name}
    ターゲット市場: {target_market}
    分析期間: {time_period}

    競合他社との比較、市場機会、リスクを含む分析レポートを作成してください。""",
    expected_output="市場分析レポート（マークダウン形式）",
    agent=researcher
)

# 実行時に変数を渡す
result = crew.kickoff(inputs={
    "product_name": "CrewAI Enterprise Edition",
    "target_market": "日本のエンタープライズ企業",
    "time_period": "2026年Q1-Q2"
})
```

## 実践例: コンテンツ生成パイプライン

```python
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool, FileWriterTool
from langchain_anthropic import ChatAnthropic

# ツール
search = SerperDevTool()
file_writer = FileWriterTool()

# Claudeを使ったエージェント
keyword_researcher = Agent(
    role="SEOキーワードリサーチャー",
    goal="検索ボリュームが高く競合が少ないキーワードを特定する",
    backstory="SEO専門家として、Google検索アルゴリズムを熟知しています。",
    tools=[search],
    llm=ChatAnthropic(model="claude-sonnet-4-6")
)

content_strategist = Agent(
    role="コンテンツストラテジスト",
    goal="SEOと読者のニーズを両立した記事構成を設計する",
    backstory="コンテンツマーケターとして、バイラルコンテンツを多数制作した経験を持つ。",
    tools=[],
    llm=ChatAnthropic(model="claude-sonnet-4-6")
)

technical_writer = Agent(
    role="テクニカルライター",
    goal="エンジニアが実際に役立てられる技術記事を執筆する",
    backstory="エンジニア出身のライターで、実装経験に基づいた記事を得意とする。",
    tools=[file_writer],
    llm=ChatAnthropic(model="claude-sonnet-4-6")
)

# パイプラインのタスク
keyword_task = Task(
    description="「{topic}」に関連するSEOキーワードを10個リストアップし、月間検索ボリュームと競合度を評価してください。",
    expected_output="キーワードリスト（各キーワードに検索ボリュームと競合度の評価付き）",
    agent=keyword_researcher
)

outline_task = Task(
    description="SEOキーワードと読者ニーズを基に、技術記事の構成案を作成してください。H2/H3ヘッダーを含む詳細な目次を提供してください。",
    expected_output="記事構成案（見出し一覧とそれぞれのポイント）",
    agent=content_strategist,
    context=[keyword_task]
)

writing_task = Task(
    description="""提供された構成案に従って、以下の条件で技術記事を執筆してください：
    - 文字数：2000〜3000文字
    - コード例を3つ以上含める
    - 実践的なユースケースを含める
    - SEOキーワードを自然に含める
    完成したらMarkdownファイルとして保存してください。""",
    expected_output="完成した技術記事（マークダウン形式、2000文字以上）",
    agent=technical_writer,
    context=[keyword_task, outline_task]
)

# コンテンツ生成クルー
content_crew = Crew(
    agents=[keyword_researcher, content_strategist, technical_writer],
    tasks=[keyword_task, outline_task, writing_task],
    process=Process.sequential,
    verbose=True
)

# 実行
result = content_crew.kickoff(inputs={"topic": "TypeScript 5.8の新機能"})
print(result)
```

## メモリとコンテキスト管理

```python
from crewai import Crew, Process

# メモリを有効化
crew_with_memory = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    process=Process.sequential,
    memory=True,          # エージェント間でメモリを共有
    embedder={
        "provider": "openai",
        "config": {"model": "text-embedding-3-small"}
    },
    verbose=True
)

# 後続の実行でも過去の会話を参照できる
result1 = crew_with_memory.kickoff(inputs={"topic": "Python最新情報"})
result2 = crew_with_memory.kickoff(inputs={"topic": "先ほどのPython記事を英語に翻訳してください"})
```

## LangGraph vs CrewAI vs AutoGen 比較

| 観点 | CrewAI | LangGraph | AutoGen |
|------|--------|-----------|---------|
| 難易度 | ⭐⭐ 簡単 | ⭐⭐⭐ 中級 | ⭐⭐⭐ 中級 |
| 柔軟性 | 中 | 高 | 高 |
| 状態管理 | シンプル | 精緻 | 会話ベース |
| 適用場面 | 役割分担タスク | 複雑なワークフロー | 対話型協調 |
| エンタープライズ | ✅ | ✅ | △ |
| Python | ✅ | ✅ | ✅ |
| JavaScript | ❌ | ✅（JS版） | ❌ |

**選択の指針:**
- **CrewAI**: 役割が明確なビジネスタスク（コンテンツ生成、分析レポート）
- **LangGraph**: 状態管理が重要な複雑なエージェント（カスタマーサポート、長期タスク）
- **AutoGen**: 対話的な問題解決が必要な場合

## まとめ

CrewAIは**人間のチームを模倣したマルチエージェントシステム**を最短時間で構築できるフレームワークです。

**CrewAIが特に向いているシナリオ:**
- 複数のステップに分解できるビジネスタスク
- コンテンツ生成、リサーチ、データ分析パイプライン
- 専門知識を持つ役割分担が明確なワークフロー

**次のステップ:**
- `pip install crewai`でまず試してみる
- シンプルな2エージェントのクルーから始める
- カスタムツールで業務システムと連携

## 関連記事

- [LangGraphでAIワークフローを構築する](/langgraph-workflow-guide)
- [AIエージェント開発入門2026](/ai-agent-development-2026)
- [OpenAI API完全ガイド](/openai-api-guide-2026)
