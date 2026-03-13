---
title: "Promptfooでプロンプトをテストする完全ガイド2026 - LLMの品質保証と評価自動化"
description: "Promptfooを使ってLLMのプロンプトを自動テスト・評価する方法を解説。A/Bテスト・回帰テスト・セキュリティテスト・複数モデル比較など、プロンプトエンジニアリングの品質保証を実践的に解説。AI・Promptfoo・LLMテストに関する実践情報。"
pubDate: "2026-03-04"
tags: ["AI", "Promptfoo", "LLMテスト", "プロンプトエンジニアリング", "品質保証"]
heroImage: '../../assets/thumbnails/promptfoo-llm-testing-guide.jpg'
---
## はじめに

LLMアプリのプロンプトを変更するとき、「本当に品質が改善したか」を確認する方法はありますか？Promptfooは、**プロンプトの自動テスト・評価・比較**を行うオープンソースツールです。

「LLM用のJest/pytest」とも呼ばれており、2026年のAI開発ワークフローに欠かせないツールになっています。

## Promptfooとは

**解決する問題:**

```
プロンプトを変更するたびに...
❌ 手動でいくつかの例を試してみるだけ
❌ 本番デプロイ後に品質劣化に気づく
❌ どのモデルが最適か比較できない
❌ プロンプトインジェクションの脆弱性を見落とす
❌ 複数のモデル/プロンプトのA/Bテストができない
```

**Promptfooが提供するもの:**
- **自動回帰テスト**: プロンプト変更後の品質を自動検証
- **マルチモデル比較**: GPT-4o vs Claude vs Geminiを同時比較
- **評価基準の定義**: カスタムアサーション（類似度・キーワード・正規表現）
- **セキュリティテスト**: プロンプトインジェクション・脱獄試行の検出
- **CI/CDパイプライン統合**: GitHub Actionsで継続的評価

## インストール

```bash
# グローバルインストール
npm install -g promptfoo

# またはnpx
npx promptfoo@latest
```

## 基本的な使い方

### 1. 設定ファイルの作成

```yaml
# promptfooconfig.yaml

# テストする対象のプロンプト（複数定義してA/Bテスト）
prompts:
  - "以下の技術トピックを日本語で説明してください: {{topic}}"
  - |
    あなたはシニアエンジニアです。
    以下のトピックについて、初心者向けに日本語で丁寧に説明してください: {{topic}}

# テストするモデル
providers:
  - openai:gpt-4o
  - openai:gpt-4o-mini
  - anthropic:claude-sonnet-4-6

# テストケース
tests:
  - description: "TypeScriptの型システムについて"
    vars:
      topic: "TypeScriptのジェネリクス"
    assert:
      - type: contains
        value: "型"
      - type: contains
        value: "ジェネリクス"
      - type: icontains  # 大文字小文字無視
        value: "typescript"
      - type: javascript
        value: "output.length > 100"  # 最低100文字以上
      - type: not-contains
        value: "エラー"

  - description: "React Hooksについて"
    vars:
      topic: "ReactのuseEffectフック"
    assert:
      - type: llm-rubric  # LLMで評価
        value: "useEffectの使い方と依存配列について正確に説明しているか"
      - type: contains
        value: "useEffect"
      - type: javascript
        value: "output.includes('依存') || output.includes('配列')"
```

### 2. テストの実行

```bash
# テスト実行
promptfoo eval

# ブラウザでビジュアル結果を確認
promptfoo view

# JSON形式で出力
promptfoo eval --output results.json
```

## アサーションタイプ一覧

```yaml
tests:
  - vars:
      question: "Reactとは何ですか？"
    assert:
      # 文字列一致
      - type: contains
        value: "JavaScript"

      # 正規表現
      - type: regex
        value: "React.*ライブラリ|フレームワーク"

      # 文字数チェック
      - type: javascript
        value: "output.length >= 200 && output.length <= 2000"

      # 類似度（コサイン類似度）
      - type: similar
        value: "ReactはUIを構築するためのJavaScriptライブラリです"
        threshold: 0.7

      # LLM-as-Judge
      - type: llm-rubric
        value: "技術的に正確で、初心者にもわかりやすい説明か"

      # カスタム関数
      - type: javascript
        value: |
          // 実際の評価ロジック
          const hasCodeExample = output.includes('```');
          const hasJapanese = /[ひらがなカタカナ]/.test(output);
          return hasCodeExample && hasJapanese;

      # モデルグレード（1-10スコア）
      - type: model-graded-closedqa
        value: "ReactはUIライブラリです"

      # 有害コンテンツチェック
      - type: not-contains
        value: "有害"
```

## Python APIからの利用

```python
import promptfoo

# プログラマティックにテストを設定
config = {
    "prompts": [
        "{{question}}について日本語で答えてください",
        "あなたはPythonの専門家です。{{question}}について詳しく説明してください",
    ],
    "providers": [
        "openai:gpt-4o",
        "openai:gpt-4o-mini",
    ],
    "tests": [
        {
            "description": "Python基礎",
            "vars": {"question": "Pythonのリスト内包表記とは何ですか？"},
            "assert": [
                {"type": "contains", "value": "リスト"},
                {"type": "javascript", "value": "output.length > 100"},
            ]
        }
    ]
}

results = await promptfoo.evaluate(config)
print(f"合格率: {results.pass_rate}%")
```

## カスタム評価関数

```yaml
# promptfooconfig.yaml
prompts:
  - "{{code}}をリファクタリングしてください"

providers:
  - openai:gpt-4o

tests:
  - vars:
      code: |
        function getUserData(userId) {
          return fetch('/api/users/' + userId).then(r => r.json())
        }
    assert:
      - type: javascript
        value: |
          // カスタム評価ロジック
          const hasAsyncAwait = output.includes('async') && output.includes('await');
          const hasTypeAnnotation = output.includes(': ') || output.includes('Promise');
          const hasErrorHandling = output.includes('try') || output.includes('catch');
          const hasTypeScript = output.includes('async function') || output.includes('=>');

          // スコア計算（0〜1）
          const score = [hasAsyncAwait, hasTypeAnnotation, hasErrorHandling, hasTypeScript]
            .filter(Boolean).length / 4;

          return {
            pass: score >= 0.5,
            score,
            reason: `改善項目: async/await=${hasAsyncAwait}, 型=${hasTypeAnnotation}, エラー処理=${hasErrorHandling}`
          };
```

## セキュリティテスト（Red Team）

```yaml
# security-test.yaml

prompts:
  - |
    あなたはイザークコンサルティングの公式アシスタントです。
    弊社の製品・サービスに関する質問のみお答えします。
    それ以外の質問には答えられません。

providers:
  - openai:gpt-4o

# セキュリティテスト
redteam:
  numTests: 20  # 自動生成するテスト数
  strategies:
    - jailbreak            # 脱獄試行
    - prompt-injection     # プロンプトインジェクション
    - harmful-content      # 有害コンテンツ要求
    - pii-extraction       # 個人情報抽出試み
    - competitor-endorsement  # 競合他社の推奨誘導
```

```bash
# セキュリティテストの実行
promptfoo redteam run

# レポートの確認
promptfoo view
```

## CI/CDパイプラインへの統合

### GitHub Actions

```yaml
# .github/workflows/llm-eval.yml
name: LLM Evaluation

on:
  push:
    paths:
      - "prompts/**"
      - "promptfooconfig.yaml"

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Promptfoo
        run: npm install -g promptfoo

      - name: Run Evaluation
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: promptfoo eval --output results.json

      - name: Check Results
        run: |
          PASS_RATE=$(cat results.json | jq '.stats.passRate')
          echo "合格率: $PASS_RATE%"
          if (( $(echo "$PASS_RATE < 80" | bc -l) )); then
            echo "❌ 合格率が80%未満です"
            exit 1
          fi
          echo "✅ 品質チェック通過"

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: evaluation-results
          path: results.json
```

## 複数モデルの性能比較

```yaml
# comparison.yaml
prompts:
  - "{{task}}"

providers:
  - id: openai:gpt-4o
    label: "GPT-4o"
  - id: openai:gpt-4o-mini
    label: "GPT-4o Mini"
  - id: anthropic:claude-sonnet-4-6
    label: "Claude Sonnet"
  - id: google:gemini-2.0-flash
    label: "Gemini Flash"

# コスト・速度・品質の比較
tests:
  - vars:
      task: "TypeScriptのPromise.allとPromise.allSettledの違いを説明してください"
    assert:
      - type: contains
        value: "Promise"
      - type: llm-rubric
        value: "技術的に正確で、違いが明確に説明されているか"
      - type: javascript
        value: "output.length > 200"

  - vars:
      task: "SQLのINNER JOINとLEFT JOINの違いを実例付きで説明してください"
    assert:
      - type: contains
        value: "JOIN"
      - type: contains
        value: "SQL"
      - type: javascript
        value: "output.includes('SELECT') || output.includes('FROM')"
```

```bash
# 比較レポートを生成
promptfoo eval --output comparison.json
promptfoo view  # ブラウザで視覚的に比較
```

## RAGシステムのテスト

```yaml
# rag-test.yaml
prompts:
  - |
    以下のコンテキストを基に質問に答えてください：
    コンテキスト: {{context}}
    質問: {{question}}

providers:
  - openai:gpt-4o

tests:
  - description: "RAG精度テスト: 関連情報あり"
    vars:
      context: "Mastraは2025年末にリリースされたTypeScript製AIフレームワークです。Next.jsとの統合が特徴です。"
      question: "Mastraはどんなフレームワークですか？"
    assert:
      - type: contains
        value: "TypeScript"
      - type: icontains
        value: "next.js"
      - type: llm-rubric
        value: "コンテキストの情報のみを使って正確に答えているか。コンテキストにない情報を追加していないか。"

  - description: "RAG精度テスト: 関連情報なし（幻覚防止）"
    vars:
      context: "本日の東京の天気は晴れです。"
      question: "TypeScriptのジェネリクスとは何ですか？"
    assert:
      - type: llm-rubric
        value: "コンテキストにない情報について、知らないと正直に答えているか"
      - type: not-contains
        value: "ジェネリクスは"  # 幻覚を検出
```

## 評価レポートの分析

```bash
# 詳細レポートを確認
promptfoo view

# 統計情報を出力
promptfoo eval --output results.json
cat results.json | jq '{
  total: .stats.numTests,
  passed: .stats.numPassed,
  failed: .stats.numFailed,
  passRate: .stats.passRate,
  avgLatency: .stats.avgLatencyMs
}'
```

## まとめ

Promptfooは**LLMアプリの品質を継続的に保証する**ための不可欠なツールです。

**Promptfooが特に重要なシナリオ:**
- プロンプトを頻繁に更新するアプリ
- 複数のLLMモデルから最適なものを選ぶ
- セキュリティが重要なアプリ（金融・医療・法律）
- チームでAIアプリを開発する場合

**導入ステップ:**
1. `npm install -g promptfoo`でインストール
2. 既存のプロンプトでシンプルなテストを書く
3. GitHub Actionsに組み込む

## 関連記事

- [LangFuse LLMオブザーバビリティガイド](/langfuse-llm-observability-guide)
- [LLM評価（Evals）完全ガイド](/llm-evaluation-guide)
- [AIエージェント開発入門2026](/ai-agent-development-2026)

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)