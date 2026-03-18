---
title: "プロンプトエンジニアリング実践ガイド2026【CoT・Few-Shot・構造化】"
description: "プロンプトエンジニアリングの実践テクニックを体系的に解説。Chain-of-Thought・Few-Shot・構造化プロンプト・メタプロンプティングの手法とTypeScript/Pythonでの自動化実装を詳しく紹介します。"
pubDate: "2026-03-13"
tags: ["AI", "プロンプトエンジニアリング", "LLM", "ChatGPT", "Claude"]
heroImage: '../../assets/thumbnails/ai-agent-development-2026.jpg'
---

## はじめに

LLMの性能は日々向上しているが、同じモデルでも **プロンプトの書き方** で回答品質が大きく変わる。「AIに上手く指示を出す技術」であるプロンプトエンジニアリングは、2026年のエンジニアにとって必須スキルになった。

この記事では、基礎的なテクニックから最新の高度な手法まで、体系的に解説する。各手法はTypeScript/Pythonのコード例付きで、すぐにプロジェクトに適用できる。

---

## 1. プロンプトエンジニアリングの基本原則

### 1.1 効果的なプロンプトの5要素

```
┌─────────────────────────────────────────┐
│         効果的なプロンプトの構造          │
├─────────────────────────────────────────┤
│ 1. Role（役割）    誰として回答するか    │
│ 2. Context（文脈）  背景情報・制約条件    │
│ 3. Task（タスク）   具体的に何をするか    │
│ 4. Format（形式）   出力の形式・構造      │
│ 5. Example（例示）  期待する出力の具体例  │
└─────────────────────────────────────────┘
```

### 1.2 悪いプロンプト vs 良いプロンプト

```
❌ 悪い例:
「Pythonのコードを書いて」

✅ 良い例:
「あなたはPython 3.12の経験豊富なバックエンドエンジニアです。
以下の要件でRESTful APIエンドポイントを実装してください。

## 要件
- FastAPIフレームワークを使用
- PostgreSQLのユーザーテーブルからデータを取得
- ページネーション対応（limit/offset）
- Pydanticモデルでレスポンスを型定義

## 出力形式
- コードブロックで提供
- 各関数にdocstringを付与
- エラーハンドリングを含む」
```

---

## 2. Chain-of-Thought（CoT）プロンプティング

### 2.1 基本的なCoT

LLMに「段階的に考える」よう指示することで、推論精度が大幅に向上する。

```python
# cot_basic.py
from openai import OpenAI

client = OpenAI()

# ❌ CoTなし（誤答しやすい）
simple_prompt = "17 × 23 + 45 ÷ 9 の答えは？"

# ✅ CoT あり（正確な推論）
cot_prompt = """以下の計算を段階的に解いてください。
各ステップを明示し、最後に最終回答を示してください。

問題: 17 × 23 + 45 ÷ 9

## ステップバイステップで解く
"""

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": cot_prompt}],
    temperature=0,
)
print(response.choices[0].message.content)
# ステップ1: 17 × 23 = 391
# ステップ2: 45 ÷ 9 = 5
# ステップ3: 391 + 5 = 396
# 最終回答: 396
```

### 2.2 Zero-Shot CoT

「ステップバイステップで考えてください」の一言を加えるだけで推論精度が向上する、最もシンプルなCoT。

```python
# zero_shot_cot.py

def ask_with_cot(question: str) -> str:
    """Zero-Shot CoTで質問に回答する"""
    prompt = f"""{question}

ステップバイステップで考えてください。"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )
    return response.choices[0].message.content

# コードレビューにCoTを適用
review_result = ask_with_cot("""
以下のPythonコードにバグがないか確認してください。

```python
def find_duplicates(lst):
    seen = set()
    duplicates = []
    for item in lst:
        if item in seen:
            duplicates.append(item)
        seen.add(item)
    return list(set(duplicates))
```
""")
```

### 2.3 Self-Consistency CoT

同じ質問を複数回実行し、最も多い回答を採用する手法。

```typescript
// self-consistency.ts
import OpenAI from 'openai';

const client = new OpenAI();

async function selfConsistencyCoT(
  question: string,
  numSamples: number = 5
): Promise<string> {
  const responses: string[] = [];

  // 同じ質問を複数回実行（temperature > 0 でばらつきを出す）
  const promises = Array.from({ length: numSamples }, () =>
    client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `${question}\n\nステップバイステップで考え、最後に【最終回答: 〇〇】の形式で答えてください。`,
        },
      ],
      temperature: 0.7,
    })
  );

  const results = await Promise.all(promises);

  for (const result of results) {
    const content = result.choices[0].message.content ?? '';
    // 最終回答を抽出
    const match = content.match(/最終回答[:：]\s*(.+)/);
    if (match) {
      responses.push(match[1].trim());
    }
  }

  // 多数決で最終回答を決定
  const counts = new Map<string, number>();
  for (const resp of responses) {
    counts.set(resp, (counts.get(resp) ?? 0) + 1);
  }

  let bestAnswer = '';
  let bestCount = 0;
  for (const [answer, count] of counts) {
    if (count > bestCount) {
      bestAnswer = answer;
      bestCount = count;
    }
  }

  console.log(`多数決結果: "${bestAnswer}" (${bestCount}/${numSamples})`);
  return bestAnswer;
}
```

---

## 3. Few-Shot プロンプティング

### 3.1 基本的なFew-Shot

```python
# few_shot.py

def classify_sentiment_few_shot(text: str) -> str:
    """Few-Shotで感情分類を実行"""
    prompt = """以下のテキストの感情を「ポジティブ」「ネガティブ」「ニュートラル」の3つに分類してください。

## 例
テキスト: 「このプロダクトは使いやすくて最高です！」
感情: ポジティブ

テキスト: 「バグが多すぎて仕事にならない。サポートも遅い。」
感情: ネガティブ

テキスト: 「昨日アップデートがリリースされました。」
感情: ニュートラル

テキスト: 「性能は良いが、UIが直感的でない部分がある。」
感情: ニュートラル

## 分類対象
テキスト: 「{text}」
感情: """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt.format(text=text)}],
        temperature=0,
        max_tokens=10,
    )
    return response.choices[0].message.content.strip()

# テスト
print(classify_sentiment_few_shot("新機能のおかげで作業時間が半分になった"))
# → ポジティブ
```

### 3.2 動的Few-Shot（類似例の自動選択）

```python
# dynamic_few_shot.py
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

class DynamicFewShotSelector:
    """入力に最も類似した例を動的に選択"""

    def __init__(self):
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        self.examples_store = Chroma(
            embedding_function=self.embeddings,
            collection_name="few_shot_examples",
        )

    def add_examples(self, examples: list[dict]) -> None:
        """例を追加"""
        docs = [
            Document(
                page_content=ex["input"],
                metadata={"output": ex["output"], "category": ex.get("category", "")},
            )
            for ex in examples
        ]
        self.examples_store.add_documents(docs)

    def select_examples(self, query: str, k: int = 3) -> list[dict]:
        """入力に最も類似した例をk個選択"""
        results = self.examples_store.similarity_search(query, k=k)
        return [
            {"input": doc.page_content, "output": doc.metadata["output"]}
            for doc in results
        ]

    def build_prompt(self, query: str, task_description: str, k: int = 3) -> str:
        """動的Few-Shotプロンプトを構築"""
        examples = self.select_examples(query, k)
        examples_text = "\n\n".join(
            f"入力: {ex['input']}\n出力: {ex['output']}"
            for ex in examples
        )
        return f"""{task_description}

## 例
{examples_text}

## 対象
入力: {query}
出力: """

# 使用例
selector = DynamicFewShotSelector()
selector.add_examples([
    {"input": "def add(a, b): return a + b", "output": "関数名addは2つの引数を受け取り、合計を返す"},
    {"input": "class User: pass", "output": "空のUserクラスを定義"},
    {"input": "import os; os.listdir('.')", "output": "osモジュールをインポートし、カレントディレクトリのファイル一覧を取得"},
])

prompt = selector.build_prompt(
    "for i in range(10): print(i)",
    "以下のPythonコードを日本語で説明してください"
)
```

---

## 4. 構造化プロンプト

### 4.1 JSON出力の強制

```typescript
// structured-output.ts
import OpenAI from 'openai';
import { z } from 'zod';

const client = new OpenAI();

// 出力スキーマを定義
const ProductReviewSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  key_points: z.array(z.string()),
  summary: z.string(),
});

type ProductReview = z.infer<typeof ProductReviewSchema>;

async function analyzeReview(reviewText: string): Promise<ProductReview> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `あなたは商品レビューの分析AIです。
以下のJSON形式で回答してください。他のテキストは出力しないでください。

{
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": 0.0〜1.0の確信度,
  "key_points": ["要点1", "要点2", ...],
  "summary": "50文字以内の要約"
}`,
      },
      {
        role: 'user',
        content: reviewText,
      },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content ?? '{}');
  return ProductReviewSchema.parse(parsed);
}

// 使用例
const review = await analyzeReview(
  '画質は素晴らしいが、バッテリーの持ちが悪い。価格を考えると微妙。'
);
console.log(review);
// { sentiment: 'neutral', confidence: 0.75,
//   key_points: ['画質が良い', 'バッテリー持ちが悪い', 'コスパが微妙'],
//   summary: '画質は高評価だがバッテリーとコスパに不満' }
```

### 4.2 XMLタグによる構造化（Claude推奨）

```python
# xml_structured.py
import anthropic

client = anthropic.Anthropic()

def analyze_code_claude(code: str) -> dict:
    """XMLタグで構造化した出力をClaudeに求める"""
    prompt = f"""以下のコードを分析してください。

<code>
{code}
</code>

以下のXML形式で回答してください:

<analysis>
  <summary>コードの概要（1-2文）</summary>
  <complexity>low | medium | high</complexity>
  <issues>
    <issue severity="low|medium|high">問題の説明</issue>
  </issues>
  <suggestions>
    <suggestion>改善提案</suggestion>
  </suggestions>
  <refactored_code>改善後のコード</refactored_code>
</analysis>
"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text

result = analyze_code_claude("""
def process(data):
    result = []
    for i in range(len(data)):
        if data[i] != None:
            result.append(data[i] * 2)
    return result
""")
```

### 4.3 Markdownテーブル形式

```python
# markdown_output.py

def compare_technologies(tech_list: list[str]) -> str:
    """技術比較表をMarkdown形式で生成"""
    prompt = f"""以下の技術を比較する表をMarkdown形式で作成してください。

比較対象: {', '.join(tech_list)}

## 出力形式
以下の列を含むMarkdownテーブルを出力してください:
| 技術名 | カテゴリ | 学習コスト | パフォーマンス | エコシステム | 推奨ユースケース |

テーブルの後に、各技術について2-3行の補足説明を加えてください。
"""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )
    return response.choices[0].message.content

result = compare_technologies(["React", "Vue", "Svelte", "SolidJS"])
print(result)
```

---

## 5. メタプロンプティング

### 5.1 プロンプトを生成するプロンプト

```python
# meta_prompting.py

def generate_optimal_prompt(task_description: str) -> str:
    """タスクに最適なプロンプトを自動生成する"""
    meta_prompt = f"""あなたはプロンプトエンジニアリングの専門家です。
以下のタスクを達成するための最適なプロンプトを設計してください。

## タスク
{task_description}

## プロンプト設計要件
1. 明確な役割定義を含む
2. 具体的な制約条件を含む
3. 出力形式を明示する
4. 2-3個のFew-Shot例を含む
5. エッジケースへの対応指示を含む

## 出力
設計したプロンプトのみを出力してください。
メタ的な説明は不要です。
"""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": meta_prompt}],
        temperature=0.3,
    )
    return response.choices[0].message.content

# 使用例
optimal_prompt = generate_optimal_prompt(
    "ユーザーのTypeScriptコードをレビューし、改善提案をJSON形式で返すプロンプト"
)
print(optimal_prompt)
```

### 5.2 プロンプトの自動最適化

```typescript
// prompt-optimizer.ts
import OpenAI from 'openai';

const client = new OpenAI();

interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  changes: string[];
  expectedImprovement: string;
}

async function optimizePrompt(
  prompt: string,
  failureCases: string[]
): Promise<OptimizationResult> {
  const optimizationPrompt = `
あなたはプロンプト最適化の専門家です。
以下のプロンプトが期待通りに動作しなかったケースを分析し、改善版を提案してください。

## 元のプロンプト
${prompt}

## 失敗ケース
${failureCases.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## 出力形式（JSON）
{
  "optimizedPrompt": "改善後のプロンプト全文",
  "changes": ["変更点1", "変更点2"],
  "expectedImprovement": "期待される改善効果"
}
`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: optimizationPrompt }],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(response.choices[0].message.content ?? '{}');

  return {
    originalPrompt: prompt,
    optimizedPrompt: result.optimizedPrompt,
    changes: result.changes,
    expectedImprovement: result.expectedImprovement,
  };
}
```

---

## 6. 高度なテクニック集

### 6.1 ロールプレイプロンプティング

```python
# role_play.py

EXPERT_ROLES = {
    "security_auditor": """あなたはCISSP認定のセキュリティ監査官です。
15年以上のペネトレーションテスト経験を持ち、OWASP Top 10に精通しています。
コードを見るとき、まずセキュリティ脆弱性を探します。""",

    "performance_engineer": """あなたはFAANG企業で10年間パフォーマンス最適化を担当したエンジニアです。
Big-O表記、メモリ使用量、キャッシュ効率を常に意識します。
ボトルネックを発見し、具体的な改善策を提示します。""",

    "junior_developer_mentor": """あなたは新人エンジニアの教育を担当するシニアエンジニアです。
技術的な正確さを保ちつつ、初心者にもわかりやすい説明を心がけます。
専門用語を使う場合は必ず補足説明を加えます。""",
}

def get_expert_review(code: str, role: str) -> str:
    """特定の専門家ロールでコードレビュー"""
    system_prompt = EXPERT_ROLES.get(role, EXPERT_ROLES["security_auditor"])

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"以下のコードをレビューしてください:\n\n```\n{code}\n```"},
        ],
        temperature=0.3,
    )
    return response.choices[0].message.content
```

### 6.2 Tree-of-Thought（ToT）

```python
# tree_of_thought.py

def tree_of_thought(problem: str, num_branches: int = 3) -> str:
    """Tree-of-Thoughtで複数の思考経路を探索"""

    # Step 1: 複数のアプローチを生成
    branch_prompt = f"""以下の問題に対して、{num_branches}つの異なるアプローチを提案してください。
各アプローチは独立した解決策である必要があります。

問題: {problem}

各アプローチを以下の形式で出力:
アプローチ1: [説明]
アプローチ2: [説明]
アプローチ3: [説明]
"""
    branches_response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": branch_prompt}],
        temperature=0.7,
    )
    branches = branches_response.choices[0].message.content

    # Step 2: 各アプローチを評価
    eval_prompt = f"""以下の問題と提案されたアプローチを評価してください。

問題: {problem}

提案されたアプローチ:
{branches}

各アプローチについて以下を評価:
1. 実現可能性 (1-10)
2. 効率性 (1-10)
3. リスク (1-10, 高いほどリスクが高い)

最も優れたアプローチを選び、その理由を説明してください。
選んだアプローチで具体的な解決策を示してください。
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": eval_prompt}],
        temperature=0,
    )
    return response.choices[0].message.content

result = tree_of_thought(
    "Reactアプリのバンドルサイズを50%削減する方法"
)
print(result)
```

### 6.3 ReAct（Reasoning + Acting）パターン

```typescript
// react-pattern.ts

const REACT_SYSTEM_PROMPT = `あなたは問題解決AIです。
以下の思考プロセスに従ってください:

Thought: 現在の状況を分析し、次に何をすべきか考える
Action: 実行するアクション（ツール呼び出し）を決定する
Observation: アクションの結果を観察する
... (必要に応じて繰り返し)
Final Answer: 最終的な回答を提示する

利用可能なアクション:
- search(query): Web検索
- calculate(expression): 計算
- lookup(term): 用語の定義を調べる

必ず「Thought → Action → Observation」のサイクルを踏んでください。`;

async function reactLoop(question: string): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: REACT_SYSTEM_PROMPT },
    { role: 'user', content: question },
  ];

  for (let i = 0; i < 10; i++) {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0,
    });

    const content = response.choices[0].message.content ?? '';
    messages.push({ role: 'assistant', content });

    // Final Answerが含まれていれば終了
    if (content.includes('Final Answer:')) {
      return content.split('Final Answer:')[1].trim();
    }

    // アクションを実行して結果をフィードバック
    const actionMatch = content.match(/Action:\s*(\w+)\((.+?)\)/);
    if (actionMatch) {
      const [, action, args] = actionMatch;
      const result = await executeAction(action, args);
      messages.push({
        role: 'user',
        content: `Observation: ${result}`,
      });
    }
  }

  return '最大ステップ数に達しました';
}
```

---

## 7. プロンプトのテストと評価

### 7.1 体系的なプロンプトテスト

```python
# prompt_testing.py
import json
from dataclasses import dataclass

@dataclass
class PromptTestCase:
    input: str
    expected_contains: list[str]   # 含まれるべきキーワード
    expected_not_contains: list[str]  # 含まれてはいけないキーワード
    expected_format: str  # "json", "markdown", "text"

class PromptTester:
    def __init__(self, prompt_template: str, model: str = "gpt-4o"):
        self.prompt_template = prompt_template
        self.model = model
        self.client = OpenAI()

    def run_test(self, test_case: PromptTestCase) -> dict:
        """テストケースを実行"""
        prompt = self.prompt_template.format(input=test_case.input)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        output = response.choices[0].message.content

        results = {
            "input": test_case.input,
            "output": output,
            "tests": [],
        }

        # キーワード含有チェック
        for keyword in test_case.expected_contains:
            passed = keyword.lower() in output.lower()
            results["tests"].append({
                "type": "contains",
                "keyword": keyword,
                "passed": passed,
            })

        # 禁止キーワードチェック
        for keyword in test_case.expected_not_contains:
            passed = keyword.lower() not in output.lower()
            results["tests"].append({
                "type": "not_contains",
                "keyword": keyword,
                "passed": passed,
            })

        # フォーマットチェック
        if test_case.expected_format == "json":
            try:
                json.loads(output)
                results["tests"].append({"type": "format", "format": "json", "passed": True})
            except json.JSONDecodeError:
                results["tests"].append({"type": "format", "format": "json", "passed": False})

        results["all_passed"] = all(t["passed"] for t in results["tests"])
        return results

    def run_suite(self, test_cases: list[PromptTestCase]) -> dict:
        """テストスイートを実行"""
        results = [self.run_test(tc) for tc in test_cases]
        passed = sum(1 for r in results if r["all_passed"])
        return {
            "total": len(results),
            "passed": passed,
            "failed": len(results) - passed,
            "success_rate": f"{passed / len(results) * 100:.1f}%",
            "details": results,
        }

# テスト実行例
tester = PromptTester(
    prompt_template="以下のコードの問題点を指摘し、修正版を提示してください:\n\n{input}"
)

suite_results = tester.run_suite([
    PromptTestCase(
        input="for i in range(len(lst)): print(lst[i])",
        expected_contains=["enumerate", "改善", "修正"],
        expected_not_contains=["エラーはありません"],
        expected_format="text",
    ),
    PromptTestCase(
        input="password = '12345'",
        expected_contains=["セキュリティ", "ハードコード"],
        expected_not_contains=["問題ありません"],
        expected_format="text",
    ),
])
print(json.dumps(suite_results, ensure_ascii=False, indent=2))
```

### 7.2 A/Bテスト

```typescript
// prompt-ab-test.ts

interface ABTestResult {
  promptA: { name: string; avgScore: number; latencyMs: number };
  promptB: { name: string; avgScore: number; latencyMs: number };
  winner: string;
  sampleSize: number;
}

async function abTestPrompts(
  promptA: string,
  promptB: string,
  testInputs: string[],
  evaluationCriteria: string
): Promise<ABTestResult> {
  const scoresA: number[] = [];
  const scoresB: number[] = [];

  for (const input of testInputs) {
    // Prompt A 実行
    const responseA = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: promptA.replace('{input}', input) }],
      temperature: 0,
    });

    // Prompt B 実行
    const responseB = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: promptB.replace('{input}', input) }],
      temperature: 0,
    });

    // LLMによる評価
    const evalResponse = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `以下の2つの回答を比較評価してください。

評価基準: ${evaluationCriteria}

回答A: ${responseA.choices[0].message.content}
回答B: ${responseB.choices[0].message.content}

各回答を1-10でスコアリングしてJSON形式で出力:
{"scoreA": X, "scoreB": X}`,
        },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const scores = JSON.parse(evalResponse.choices[0].message.content ?? '{}');
    scoresA.push(scores.scoreA);
    scoresB.push(scores.scoreB);
  }

  const avgA = scoresA.reduce((a, b) => a + b, 0) / scoresA.length;
  const avgB = scoresB.reduce((a, b) => a + b, 0) / scoresB.length;

  return {
    promptA: { name: 'Prompt A', avgScore: avgA, latencyMs: 0 },
    promptB: { name: 'Prompt B', avgScore: avgB, latencyMs: 0 },
    winner: avgA > avgB ? 'Prompt A' : 'Prompt B',
    sampleSize: testInputs.length,
  };
}
```

---

## 8. 実務で使えるプロンプトテンプレート集

### 8.1 コードレビュー

```
あなたはシニアソフトウェアエンジニアです。
以下のコードを以下の観点でレビューしてください:

1. バグ・論理エラー
2. セキュリティ脆弱性
3. パフォーマンス問題
4. 可読性・保守性
5. テスト可能性

各問題には重要度（Critical/High/Medium/Low）を付与してください。
最後に修正後のコードを提示してください。
```

### 8.2 技術文書要約

```
以下の技術文書を要約してください。

## 制約
- 3つの箇条書きで要約（各50文字以内）
- 技術用語はそのまま使用
- 「〇〇について述べている」のようなメタ的表現は避ける
- 具体的な数値・バージョン番号を含める
```

### 8.3 SQL生成

```
あなたはPostgreSQL 16の専門家です。
以下の自然言語クエリをSQLに変換してください。

## テーブル定義
{schema}

## ルール
- サブクエリよりCTEを優先
- LIMIT句を必ず付ける（デフォルト100）
- インデックスを活用するクエリを心がける
- SQLインジェクション対策のパラメータバインディングを使用

## クエリ
{query}
```

---

## 9. まとめ

プロンプトエンジニアリングは「呪文」ではなく、再現性のある技術だ。

| テクニック | 最適なユースケース | 追加コスト |
|-----------|-------------------|-----------|
| Zero-Shot CoT | 推論タスク全般 | なし |
| Few-Shot | 分類・変換タスク | 例のトークン分 |
| 構造化出力 | API応答・データ処理 | なし |
| Self-Consistency | 正確性が最重要なタスク | N倍（サンプル数） |
| Tree-of-Thought | 複雑な意思決定 | 2-3倍 |
| メタプロンプティング | プロンプト自体の改善 | 1回分 |

**最も重要な原則**: 具体的に指示し、曖昧さを排除し、期待する出力形式を明示すること。

---

## 関連記事

- [LLM APIアプリ開発入門2026](/blog/2026-08-01-llm-api-development-guide-2026)
- [AIエージェント開発入門2026](/blog/2026-08-03-ai-agent-development-2026)
- [AI/LLMアプリのテスト・評価手法](/blog/2026-08-09-ai-testing-evaluation-2026)
- [Claude Code AIコーディングガイド2026](/blog/claude-code-ai-coding-guide-2026)

---

## FAQ

### Q. プロンプトエンジニアリングはいつまで有効？

A. モデルが賢くなるにつれ、シンプルなプロンプトでも高品質な回答が得られるようになる。しかし「タスクの要件を正確に伝える」技術は、モデルの進化に関係なく常に価値がある。

### Q. temperature は何に設定すべき？

A. 正確性が重要（コード生成、事実回答）なら0、創造性が必要（文章生成、アイデア出し）なら0.7-1.0。迷ったら0.3から始めて調整する。

### Q. システムプロンプトとユーザープロンプト、どちらに指示を書くべき？

A. 固定的な制約・ロール定義はシステムプロンプト、タスク固有の情報はユーザープロンプトに書く。OpenAI/Claudeともにシステムプロンプトの方が指示の遵守率が高い。
