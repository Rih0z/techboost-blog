---
title: "LLM評価（Evals）完全ガイド2026 - AIアウトプットの品質を測る実践手法"
description: "LLMの出力品質を評価する手法を体系的に解説。人手評価・自動評価・LLM-as-Judge・RAGas・BERTScoreなど各評価手法の使い方から、本番運用での評価パイプライン構築まで実践的に解説。基礎から応用まで幅広くカバーしています。"
pubDate: "2026-03-04"
tags: ["AI", "LLM評価", "Evals", "品質保証", "Python", "LLMOps"]
heroImage: '../../assets/thumbnails/llm-evaluation-guide.jpg'
---
## はじめに

「AIの回答は本当に正確か？」「プロンプト変更で品質は改善したか？」を測定する仕組みが**LLM評価（Evals）**です。

2026年、AIアプリが本番環境で使われるようになり、評価の仕組みを持つことは必須要件になっています。この記事では、LLMの品質評価の全体像と実装方法を解説します。

## LLM評価の全体像

```
評価の階層
│
├── 1. タスク固有の評価（What）
│   ├── 正確性（Accuracy）
│   ├── 適切性（Relevance）
│   ├── 一貫性（Consistency）
│   └── 流暢さ（Fluency）
│
├── 2. 評価手法（How）
│   ├── 人手評価（Human Evaluation）
│   ├── 参照ベース自動評価（BLEU, ROUGE, BERTScore）
│   ├── LLM-as-Judge
│   └── タスク固有メトリクス
│
└── 3. 評価フレームワーク（With）
    ├── Promptfoo
    ├── LangFuse
    ├── RAGas
    └── DeepEval
```

## 評価手法の種類

### 1. 人手評価

最も信頼性が高いが、スケールしない：

```python
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

class QualityScore(Enum):
    EXCELLENT = 5
    GOOD = 4
    ACCEPTABLE = 3
    POOR = 2
    UNACCEPTABLE = 1

@dataclass
class HumanEvaluation:
    question: str
    model_output: str
    accuracy: QualityScore        # 正確性
    relevance: QualityScore       # 関連性
    clarity: QualityScore         # 明確さ
    helpfulness: QualityScore     # 役立つか
    overall: QualityScore         # 総合
    feedback: str                 # コメント
    evaluator: str
    timestamp: datetime = None

    def to_score(self) -> float:
        scores = [
            self.accuracy.value * 0.3,    # 正確性に高いウェイト
            self.relevance.value * 0.25,
            self.clarity.value * 0.2,
            self.helpfulness.value * 0.25
        ]
        return sum(scores) / 5  # 0〜1に正規化
```

### 2. 参照ベース自動評価

```python
# BERTScore（意味的類似度）
from bert_score import score

def evaluate_with_bertscore(predictions: list[str], references: list[str]) -> dict:
    """
    BERTScoreで生成文と参照文の意味的類似度を計算
    精度(P)・再現率(R)・F1スコアを返す
    """
    P, R, F1 = score(predictions, references, lang="ja")

    return {
        "precision": P.mean().item(),
        "recall": R.mean().item(),
        "f1": F1.mean().item()
    }

# 使用例
predictions = [
    "TypeScriptはJavaScriptに静的型付けを加えた言語です。"
]
references = [
    "TypeScriptはMicrosoftが開発した、JavaScriptのスーパーセットで型システムを持つ言語です。"
]

scores = evaluate_with_bertscore(predictions, references)
print(f"意味的類似度(F1): {scores['f1']:.3f}")
```

```python
# ROUGE（テキスト要約の評価）
from rouge_score import rouge_scorer

def evaluate_with_rouge(prediction: str, reference: str) -> dict:
    """ROUGE-1, ROUGE-2, ROUGE-Lスコアを計算"""
    scorer = rouge_scorer.RougeScorer(
        ['rouge1', 'rouge2', 'rougeL'],
        use_stemmer=True
    )
    scores = scorer.score(reference, prediction)

    return {
        "rouge1_f1": scores['rouge1'].fmeasure,
        "rouge2_f1": scores['rouge2'].fmeasure,
        "rougeL_f1": scores['rougeL'].fmeasure,
    }
```

### 3. LLM-as-Judge

```python
import openai
import json
from pydantic import BaseModel

class JudgementResult(BaseModel):
    score: int           # 1-5
    reasoning: str       # 評価理由
    strengths: list[str] # 良い点
    weaknesses: list[str] # 改善点

def llm_judge(
    question: str,
    response: str,
    rubric: str,
    model: str = "gpt-4o"
) -> JudgementResult:
    """GPT-4oを審判として使い、LLMの出力を評価する"""

    client = openai.OpenAI()

    prompt = f"""以下の基準に従って、AIの回答を評価してください。

【評価基準】
{rubric}

【質問】
{question}

【評価対象の回答】
{response}

【評価】
スコア（1-5）と理由をJSON形式で返してください：
{{
  "score": 1-5の整数,
  "reasoning": "評価の説明",
  "strengths": ["良い点1", "良い点2"],
  "weaknesses": ["改善点1", "改善点2"]
}}"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )

    data = json.loads(response.choices[0].message.content)
    return JudgementResult(**data)

# 使用例
result = llm_judge(
    question="Pythonのデコレーターとは何ですか？",
    response="デコレーターは関数を修飾するシンタックスシュガーです。@で始まります。",
    rubric="""
    5: 正確で網羅的、コード例があり、初心者にもわかりやすい
    4: 正確で詳細、コード例がある
    3: 基本的に正確だがやや不足
    2: 部分的に正確
    1: 不正確または不完全
    """
)
print(f"スコア: {result.score}/5")
print(f"理由: {result.reasoning}")
```

## RAG評価（RAGas）

RAGシステム専用の評価フレームワーク：

```bash
pip install ragas
```

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,        # 忠実性：回答はコンテキストに基づいているか
    answer_relevancy,   # 回答関連性：質問に対して適切か
    context_recall,     # コンテキスト再現率：必要な情報が含まれるか
    context_precision,  # コンテキスト精度：余分な情報がないか
)
from datasets import Dataset

# 評価データの準備
data = {
    "question": [
        "TypeScriptのジェネリクスとは何ですか？",
        "Next.jsのApp RouterはPages Routerと何が違いますか？",
    ],
    "answer": [
        "ジェネリクスは型をパラメータとして受け取れる機能で、再利用可能な型安全なコードを書けます。",
        "App RouterはReact Server Componentsを採用しており、より柔軟なデータフェッチングが可能です。",
    ],
    "contexts": [
        [
            "TypeScriptのジェネリクスは、型をパラメータとして受け取る機能です。<T>という記法で表されます。",
            "ジェネリクスを使うと、型に依存しない汎用的なコードを書けます。"
        ],
        [
            "Next.js App RouterはReact 18のServer Componentsをベースにしています。",
            "Pages Routerに比べて、より細かいデータフェッチング制御が可能です。",
        ],
    ],
    "ground_truth": [
        "ジェネリクスは型パラメータを使って汎用的なコードを書く機能です。",
        "App RouterはServer ComponentsとClient Componentsを組み合わせて使います。",
    ]
}

dataset = Dataset.from_dict(data)

# 評価実行
results = evaluate(
    dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_recall,
        context_precision,
    ]
)

print(results)
# {'faithfulness': 0.92, 'answer_relevancy': 0.88, 'context_recall': 0.85, 'context_precision': 0.90}
```

## DeepEval（包括的評価フレームワーク）

```bash
pip install deepeval
```

```python
from deepeval import evaluate
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualPrecisionMetric,
    HallucinationMetric,
    ToxicityMetric,
    BiasMetric,
)
from deepeval.test_case import LLMTestCase

# テストケースの作成
test_case = LLMTestCase(
    input="Dockerのコンテナとイメージの違いを説明してください",
    actual_output="コンテナはイメージのランタイムインスタンスです。イメージは静的なテンプレートで、コンテナはその動的な実行形式です。",
    expected_output="イメージはアプリケーションと依存関係を含む静的なスナップショット。コンテナはイメージから起動した実行中のプロセス。",
    retrieval_context=[
        "Dockerイメージはアプリケーションのすべての依存関係を含む読み取り専用のテンプレートです。",
        "Dockerコンテナはイメージのランタイムインスタンスで、実際のプロセスが動作します。"
    ]
)

# メトリクスの定義
metrics = [
    AnswerRelevancyMetric(threshold=0.7),
    FaithfulnessMetric(threshold=0.8),
    HallucinationMetric(threshold=0.1),  # 幻覚が低いほど良い
    ToxicityMetric(threshold=0.01),      # 毒性が低いほど良い
]

# 評価実行
results = evaluate([test_case], metrics)
print(f"全体合格: {results.test_cases[0].success}")
```

## 評価パイプラインの構築

```python
from dataclasses import dataclass, field
from typing import Callable
import pandas as pd
from datetime import datetime

@dataclass
class EvalPipeline:
    """評価パイプラインを管理するクラス"""
    name: str
    metrics: list[Callable]
    threshold: float = 0.7
    results: list[dict] = field(default_factory=list)

    def run(self, test_cases: list[dict]) -> pd.DataFrame:
        for case in test_cases:
            result = {
                "question": case["question"],
                "expected": case["expected"],
                "actual": case["actual"],
                "timestamp": datetime.now().isoformat()
            }

            # 各メトリクスを実行
            for metric in self.metrics:
                score = metric(
                    question=case["question"],
                    expected=case["expected"],
                    actual=case["actual"]
                )
                result[metric.__name__] = score

            # 総合判定
            metric_scores = [
                result[m.__name__] for m in self.metrics
            ]
            result["overall_score"] = sum(metric_scores) / len(metric_scores)
            result["passed"] = result["overall_score"] >= self.threshold

            self.results.append(result)

        df = pd.DataFrame(self.results)
        self._print_summary(df)
        return df

    def _print_summary(self, df: pd.DataFrame):
        print(f"\n{'='*50}")
        print(f"評価パイプライン: {self.name}")
        print(f"{'='*50}")
        print(f"総テスト数: {len(df)}")
        print(f"合格数: {df['passed'].sum()}")
        print(f"合格率: {df['passed'].mean()*100:.1f}%")
        print(f"平均スコア: {df['overall_score'].mean():.3f}")
        print(f"{'='*50}\n")
```

## A/Bテストで最適なプロンプトを選ぶ

```python
import openai
import numpy as np
from scipy import stats

def ab_test_prompts(
    prompt_a: str,
    prompt_b: str,
    test_questions: list[str],
    evaluator: Callable
) -> dict:
    """2つのプロンプトをA/Bテストで比較する"""

    client = openai.OpenAI()
    scores_a, scores_b = [], []

    for question in test_questions:
        # プロンプトAで生成
        response_a = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt_a},
                {"role": "user", "content": question}
            ]
        )

        # プロンプトBで生成
        response_b = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt_b},
                {"role": "user", "content": question}
            ]
        )

        # 評価
        score_a = evaluator(question, response_a.choices[0].message.content)
        score_b = evaluator(question, response_b.choices[0].message.content)
        scores_a.append(score_a)
        scores_b.append(score_b)

    # 統計的検定（t検定）
    t_stat, p_value = stats.ttest_rel(scores_a, scores_b)

    return {
        "prompt_a_mean": np.mean(scores_a),
        "prompt_b_mean": np.mean(scores_b),
        "improvement": (np.mean(scores_b) - np.mean(scores_a)) / np.mean(scores_a) * 100,
        "p_value": p_value,
        "significant": p_value < 0.05,
        "winner": "B" if np.mean(scores_b) > np.mean(scores_a) else "A"
    }

# 使用例
result = ab_test_prompts(
    prompt_a="あなたは役立つアシスタントです。",
    prompt_b="あなたはシニアエンジニアです。実際のコード例を必ず含めて答えてください。",
    test_questions=[
        "Reactのレンダリング最適化方法を教えてください",
        "TypeScriptの型推論について教えてください",
    ],
    evaluator=lambda q, a: 1.0 if "```" in a else 0.5  # コード例があれば高スコア
)

print(f"勝者: プロンプト{result['winner']}")
print(f"改善率: {result['improvement']:.1f}%")
print(f"統計的有意差: {result['significant']}")
```

## 評価のベストプラクティス

### 評価の原則

```
1. タスク固有の評価基準を定義する
   → 「良い回答」の定義を明確にしてから評価ツールを選ぶ

2. 複数の評価手法を組み合わせる
   → LLM-as-Judge + BERTScore + タスク固有メトリクス

3. ゴールデンデータセットを整備する
   → 「正解」のある評価セットを100件以上用意

4. 評価を継続的に実施する
   → プロンプト変更のたびにCI/CDで自動評価

5. 人手評価でキャリブレーションする
   → 自動評価のスコアが人間の判断と一致するか定期確認
```

### コスト効率の良い評価戦略

```python
# 評価の階層化（全件でなく代表サンプルで評価）

EVAL_STRATEGY = {
    "fast_check": {
        "frequency": "every_commit",
        "sample_size": 50,
        "metrics": ["keyword_match", "length_check"],
        "model": "gpt-4o-mini",  # 安いモデルで素早く
    },
    "quality_check": {
        "frequency": "daily",
        "sample_size": 200,
        "metrics": ["llm_judge", "bertscore"],
        "model": "gpt-4o",
    },
    "full_eval": {
        "frequency": "weekly",
        "sample_size": 1000,
        "metrics": ["all"],
        "model": "gpt-4o",
    }
}
```

## まとめ

LLM評価は**AIアプリを継続的に改善するための基盤**です。

**評価導入のロードマップ:**
1. まずはシンプルなキーワードマッチで始める
2. LLM-as-Judgeを追加して品質を測る
3. RAGシステムにはRAGasを導入
4. CI/CDに組み込んで自動化
5. 人手評価でキャリブレーション

**ツール選択の指針:**
- **Promptfoo**: プロンプトのA/Bテスト、CI/CD統合
- **RAGas**: RAGシステム専用評価
- **DeepEval**: 包括的な評価フレームワーク
- **LangFuse**: 本番モニタリング＋評価

## 関連記事

- [Promptfoo LLMテストガイド](/promptfoo-llm-testing-guide)
- [LangFuse LLMオブザーバビリティガイド](/langfuse-llm-observability-guide)
- [AIエージェント開発入門2026](/ai-agent-development-2026)

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)