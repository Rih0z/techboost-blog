---
title: 'LLMファインチューニング完全ガイド：カスタムAIモデルの作り方'
description: 'LLMファインチューニングの理論から実践まで徹底解説。LoRA・QLoRA・Unsloth・Hugging Face・OpenAI Fine-tuning API・データセット準備・評価・デプロイまで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

大規模言語モデル（LLM）のファインチューニングは、汎用的なベースモデルを特定のドメインやタスクに特化させる最も効果的な手法の一つだ。GPT-4やClaude、Geminiのような強力なモデルが登場した今日でも、ファインチューニングは依然として重要な技術である。特定のトーン・スタイル・専門知識・フォーマットが求められる場面では、プロンプトエンジニアリングだけでは限界があり、ファインチューニングが真価を発揮する。

本ガイドでは、ファインチューニングの基礎理論から実際のコード実装、評価、デプロイまでを体系的に解説する。LoRA、QLoRA、Unsloth、Hugging Face Transformers、OpenAI Fine-tuning APIをすべてカバーし、実務で即使えるレベルの知識を提供する。

---

## 目次

1. ファインチューニングとは何か
2. RAGとの違いと使い分け
3. ファインチューニングの仕組み（Full Fine-tuning・LoRA・QLoRA）
4. データセット準備
5. Hugging Face Transformersによるファインチューニング
6. LoRA / QLoRAの実装（PEFT・bitsandbytes）
7. Unslothによる高速ファインチューニング
8. OpenAI Fine-tuning API
9. Gemini・Claude APIのファインチューニング
10. 評価指標とベンチマーク
11. Ollamaによるローカルデプロイ
12. Hugging Face Hubへのモデル公開
13. コスト試算
14. 実践例
15. ベストプラクティスとよくある失敗

---

## 1. ファインチューニングとは何か

### 定義と目的

ファインチューニング（Fine-tuning）とは、事前学習済みモデル（Pre-trained Model）の重みを、特定のタスクやドメインのデータを使ってさらに学習させることで、そのタスクへの適合度を高めるプロセスだ。

事前学習済みLLMは、インターネット上の膨大なテキストデータから汎用的な言語理解能力を獲得している。しかし、医療診断支援・法律文書の解析・社内ナレッジベースへの対応・特定ブランドの口調維持といった専門的なユースケースでは、汎用モデルの性能は不十分なことが多い。

ファインチューニングを行うことで以下の効果が得られる。

- ドメイン特化の語彙・概念への理解向上
- 特定フォーマット（JSON・Markdown・特定の構造）での出力安定化
- 特定のトーン・ブランドボイスの維持
- 指示遵守率の向上（Instruction Following）
- プロンプト長の削減（コスト削減）
- レイテンシの改善（小さなモデルで同等の精度）

### ファインチューニングが必要なシナリオ

以下のような状況ではファインチューニングが特に有効だ。

**1. スタイル・トーンの固定が必要な場合**

カスタマーサポートbotが常に丁寧な敬語で、特定の挨拶フレーズを使い、ネガティブな表現を避けるべき場合、プロンプトで毎回指定するよりもファインチューニングした方が一貫性が高い。

**2. ドメイン特化の専門知識が必要な場合**

医療・法律・金融など、高度に専門的なドメインでは、ベースモデルの知識が浅かったり誤っていたりする場合がある。ファインチューニングにより、正確なドメイン知識を埋め込める。

**3. 特定フォーマットの出力が必要な場合**

常に特定のJSONスキーマや構造化されたフォーマットで出力させたい場合、ファインチューニングは非常に効果的だ。

**4. レイテンシ・コストの最適化が必要な場合**

GPT-4は高性能だが高コストだ。7Bや13Bクラスの小型モデルをファインチューニングすることで、特定タスクにおいてはGPT-4に匹敵する性能を低コストで実現できる。

---

## 2. RAGとの違いと使い分け

### RAG（Retrieval-Augmented Generation）とは

RAGは、ユーザーの質問に関連するドキュメントをベクトルデータベースから検索し、そのコンテキストをプロンプトに追加してLLMに回答させる手法だ。モデルの重みは変えない。

### ファインチューニング vs RAG の比較

| 観点 | ファインチューニング | RAG |
|------|-------------------|-----|
| 知識の更新 | 再学習が必要 | ドキュメント追加のみ |
| コスト（初期） | GPU時間・高コスト | ベクトルDB構築コスト |
| コスト（運用） | 低（小モデル可） | 検索 + LLMトークン費用 |
| レイテンシ | 低い | 検索オーバーヘッドあり |
| 最新情報への対応 | 弱い | 強い（ドキュメント追加で対応） |
| スタイル・トーン固定 | 非常に強い | 弱い（プロンプトに依存） |
| 幻覚（Hallucination）リスク | ある | 低減できる |
| データプライバシー | 学習データが必要 | ドキュメントのみでOK |

### 使い分けの判断基準

**ファインチューニングを選ぶべき場合：**

- モデルの振る舞い・スタイルを根本的に変えたい
- 特定のタスクで高い精度が必要で、データが十分ある
- プロンプトが長くなりすぎてコストがかかっている
- レイテンシを極限まで下げたい
- オフライン環境で動作させたい

**RAGを選ぶべき場合：**

- 知識ベースが頻繁に更新される
- 回答の根拠を示す必要がある（引用・ソース表示）
- 学習データが少ない
- 素早く実装したい
- 最新情報への対応が必要

**両方を組み合わせるべき場合：**

実際のプロダクションシステムでは、ファインチューニングとRAGを組み合わせるのが最も強力だ。ファインチューニングでモデルのスタイル・振る舞いを最適化し、RAGで最新の知識を補完するアーキテクチャが増えている。

---

## 3. ファインチューニングの仕組み

### Full Fine-tuning（フルファインチューニング）

最もシンプルな手法で、モデルのすべての重みをタスク固有のデータで更新する。

**仕組み：**

1. 事前学習済みモデルをロード
2. タスク固有のデータセットで勾配降下法を実行
3. すべての重みが更新される

**メリット：**
- 理論上の性能が最も高い
- モデルの表現力をフルに活用できる

**デメリット：**
- 膨大なVRAMが必要（70Bモデルなら数百GB）
- 学習コストが高い
- Catastrophic Forgetting（旧知識の忘却）が起きやすい
- ベースモデルごとに別々の重みを保持する必要がある

### LoRA（Low-Rank Adaptation）

2021年にMicrosoftが提案した手法で、フルファインチューニングの問題を解決する画期的なアプローチだ。

**仕組み：**

LoRAの核心的なアイデアは、「重みの更新行列を低ランク行列の積で近似できる」という洞察だ。

元のモデルの重み行列 `W`（サイズ d×d）を直接更新する代わりに、以下の低ランク分解を使用する。

```
W' = W + ΔW = W + BA
```

ここで：
- `B` は d×r の行列（rはランク、通常4〜64）
- `A` は r×d の行列
- 元の重み `W` はフリーズ（更新しない）

たとえば d=1024、r=8 の場合：
- 元の更新行列のパラメータ数：1024 × 1024 = 1,048,576
- LoRAのパラメータ数：1024×8 + 8×1024 = 16,384

つまり **学習するパラメータが約64分の1** に削減される。

**学習プロセス：**

```python
# LoRAの疑似コード
class LoRALinear(nn.Module):
    def __init__(self, in_features, out_features, rank=8, alpha=16):
        super().__init__()
        # 元の重みはフリーズ
        self.weight = nn.Parameter(
            torch.randn(out_features, in_features),
            requires_grad=False
        )
        # LoRAの低ランク行列（学習対象）
        self.lora_A = nn.Parameter(torch.randn(rank, in_features))
        self.lora_B = nn.Parameter(torch.zeros(out_features, rank))
        self.scaling = alpha / rank

    def forward(self, x):
        # 元の重みによる出力 + LoRAによるデルタ
        return (x @ self.weight.T) + (x @ self.lora_A.T @ self.lora_B.T) * self.scaling
```

**メリット：**
- VRAMが大幅に削減される（7Bモデルなら16GB程度で学習可能）
- 複数のLoRAアダプターを切り替えられる（マルチテナント対応）
- ベースモデルの重みを保持するため、複数のLoRAを管理しやすい
- Catastrophic Forgettingが起きにくい

**重要なハイパーパラメータ：**
- `r`（ランク）：4〜64。大きいほど表現力が上がるが、パラメータも増える
- `alpha`（スケール係数）：通常はrと同じかその2倍
- `target_modules`：LoRAを適用するレイヤー（通常はAttentionのq_proj、v_proj等）
- `dropout`：過学習防止

### QLoRA（Quantized LoRA）

2023年にUW（ワシントン大学）が提案した手法。LoRAを4ビット量子化と組み合わせることで、さらに低いVRAMでの学習を可能にした。

**仕組み：**

1. ベースモデルを4ビット（NF4形式）に量子化してロード
2. 量子化されたモデルにLoRAを適用
3. LoRAの重みはbfloat16で保持して精度を維持
4. 勾配計算時は一時的にbfloat16にデコード

**NF4（Normal Float 4-bit）：**

通常の整数量子化ではなく、正規分布に最適化された4ビット形式を使用。LLMの重みが正規分布に従うことを利用した効率的な表現だ。

**Double Quantization：**

量子化のスケールファクター自体も量子化することで、メモリをさらに削減する。

**メリット：**
- 65Bモデルが48GB VRAM（2×24GB GPU）で学習可能
- 7Bモデルなら6〜8GB VRAMのコンシューマGPUで学習可能
- フルファインチューニングと比較して性能の低下が少ない

**パラメータ比較（7Bモデルの場合）：**

| 手法 | 必要VRAM | 学習パラメータ数 |
|------|---------|--------------|
| Full Fine-tuning | ~80GB | 7B (100%) |
| LoRA (r=8) | ~30GB | ~4M (0.06%) |
| QLoRA (r=8) | ~8GB | ~4M (0.06%) |

---

## 4. データセット準備

データセットの質はファインチューニングの結果を最も大きく左右する。「Garbage in, garbage out」の原則はLLMでも例外なく適用される。

### データ形式

#### Alpacaフォーマット

Stanford Alpacaが普及させたフォーマット。最もシンプルで広く使われている。

```json
{
  "instruction": "以下の文章を要約してください。",
  "input": "人工知能（AI）は近年急速に発展しており...",
  "output": "AIの急速な発展により、社会構造や働き方が変化している。"
}
```

インストラクションだけで入力テキストが不要な場合は `input` を空文字にする。

#### ShareGPTフォーマット

マルチターンの会話データに適したフォーマット。

```json
{
  "conversations": [
    {
      "from": "human",
      "value": "Pythonでリストを逆順にする方法を教えてください。"
    },
    {
      "from": "gpt",
      "value": "Pythonでリストを逆順にする方法はいくつかあります。\n\n1. スライスを使う方法：\n```python\nmy_list = [1, 2, 3, 4, 5]\nreversed_list = my_list[::-1]\n```\n\n2. reverse()メソッドを使う方法（インプレース）：\n```python\nmy_list.reverse()\n```\n\n3. reversed()関数を使う方法：\n```python\nreversed_list = list(reversed(my_list))\n```"
    },
    {
      "from": "human",
      "value": "それぞれの違いを教えてください。"
    },
    {
      "from": "gpt",
      "value": "各方法の主な違いは以下の通りです：\n\n- `[::-1]`：元のリストを変更せず新しいリストを返す。最もPythonicな書き方。\n- `.reverse()`：元のリストを直接変更（インプレース）。Noneを返す。\n- `reversed()`：イテレータを返す。大きなリストでメモリ効率が良い。"
    }
  ]
}
```

#### ChatMLフォーマット

OpenAIのChatフォーマットに近い形式。

```json
{
  "messages": [
    {"role": "system", "content": "あなたは親切なコーディングアシスタントです。"},
    {"role": "user", "content": "Pythonでファイルを読み込む方法は？"},
    {"role": "assistant", "content": "Pythonでファイルを読み込むには、open()関数を使います..."}
  ]
}
```

### データ品質の確保

#### 品質チェックリスト

```python
import json
import re
from typing import List, Dict

def validate_dataset(data: List[Dict]) -> Dict:
    """データセットの品質チェック"""
    issues = {
        "empty_output": [],
        "too_short_output": [],
        "too_long_output": [],
        "duplicate_instructions": [],
        "contains_pii": [],
    }

    seen_instructions = set()
    pii_pattern = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b|'  # Email
        r'\b\d{3}[-.]?\d{4}[-.]?\d{4}\b|'  # 電話番号
        r'\b\d{3}-\d{2}-\d{4}\b'  # SSN
    )

    for i, item in enumerate(data):
        output = item.get("output", "")
        instruction = item.get("instruction", "")

        # 空の出力チェック
        if not output.strip():
            issues["empty_output"].append(i)

        # 短すぎる出力チェック
        if len(output) < 20:
            issues["too_short_output"].append(i)

        # 長すぎる出力チェック（トークン制限を考慮）
        if len(output) > 4000:
            issues["too_long_output"].append(i)

        # 重複チェック
        if instruction in seen_instructions:
            issues["duplicate_instructions"].append(i)
        seen_instructions.add(instruction)

        # PII（個人情報）チェック
        if pii_pattern.search(output) or pii_pattern.search(instruction):
            issues["contains_pii"].append(i)

    return issues


def clean_dataset(data: List[Dict]) -> List[Dict]:
    """データセットのクリーニング"""
    cleaned = []
    seen = set()

    for item in data:
        instruction = item.get("instruction", "").strip()
        output = item.get("output", "").strip()
        input_text = item.get("input", "").strip()

        # 空データをスキップ
        if not instruction or not output:
            continue

        # 重複をスキップ
        key = instruction + input_text
        if key in seen:
            continue
        seen.add(key)

        # テキストのクリーニング
        output = re.sub(r'\s+', ' ', output)  # 余分な空白を削除
        output = output.strip()

        cleaned.append({
            "instruction": instruction,
            "input": input_text,
            "output": output,
        })

    return cleaned
```

#### データ量の目安

| タスクの複雑さ | 推奨データ量 | 備考 |
|------------|-----------|------|
| スタイル・フォーマット変換 | 100〜500件 | シンプルなタスク |
| 特定ドメインの Q&A | 500〜2,000件 | ドメイン知識の注入 |
| 複雑な推論タスク | 2,000〜10,000件 | 多様なケースが必要 |
| 汎用インストラクション | 10,000件以上 | InstructモデルのFT |

### データセットの準備と分割

```python
from datasets import Dataset, DatasetDict
import pandas as pd
from sklearn.model_selection import train_test_split

def prepare_dataset(data_path: str) -> DatasetDict:
    """データセットを訓練・検証・テストに分割"""

    # JSONLファイルの読み込み
    data = []
    with open(data_path, 'r', encoding='utf-8') as f:
        for line in f:
            data.append(json.loads(line.strip()))

    df = pd.DataFrame(data)

    # 8:1:1で分割
    train_df, temp_df = train_test_split(df, test_size=0.2, random_state=42)
    val_df, test_df = train_test_split(temp_df, test_size=0.5, random_state=42)

    # Hugging Face Dataset形式に変換
    dataset = DatasetDict({
        'train': Dataset.from_pandas(train_df),
        'validation': Dataset.from_pandas(val_df),
        'test': Dataset.from_pandas(test_df),
    })

    print(f"Train: {len(dataset['train'])} samples")
    print(f"Validation: {len(dataset['validation'])} samples")
    print(f"Test: {len(dataset['test'])} samples")

    return dataset


def format_alpaca_prompt(sample: Dict) -> str:
    """Alpacaフォーマットのプロンプト生成"""
    if sample.get("input"):
        prompt = f"""以下の指示とコンテキストに基づいて適切に回答してください。

### 指示:
{sample['instruction']}

### コンテキスト:
{sample['input']}

### 回答:
{sample['output']}"""
    else:
        prompt = f"""以下の指示に基づいて適切に回答してください。

### 指示:
{sample['instruction']}

### 回答:
{sample['output']}"""

    return prompt
```

### 合成データの活用

高品質な人手データが少ない場合、GPT-4やClaudeを使って合成データを生成することも有効だ。

```python
from openai import OpenAI

client = OpenAI()

def generate_synthetic_data(
    topic: str,
    num_samples: int = 100,
    model: str = "gpt-4o"
) -> List[Dict]:
    """合成トレーニングデータを生成"""

    system_prompt = """あなたはトレーニングデータ生成の専門家です。
    指定されたトピックに関する高品質なQ&Aペアを生成してください。
    多様な質問スタイルと詳細な回答を作成すること。
    出力はJSON配列形式で。"""

    user_prompt = f"""トピック「{topic}」に関して、
    以下の形式でQ&Aペアを{num_samples}件生成してください:
    [
      {{
        "instruction": "質問内容",
        "input": "",
        "output": "詳細な回答"
      }}
    ]"""

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.8,
    )

    data = json.loads(response.choices[0].message.content)
    return data.get("items", data)
```

---

## 5. Hugging Face Transformersによるファインチューニング

### 環境構築

```bash
# 必要なパッケージのインストール
pip install transformers datasets accelerate bitsandbytes peft trl

# GPU確認
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

### 基本的なファインチューニングスクリプト

```python
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling,
)
from datasets import load_dataset

def run_full_fine_tuning(
    base_model: str = "meta-llama/Llama-3.2-3B-Instruct",
    dataset_name: str = "your_dataset",
    output_dir: str = "./fine-tuned-model",
    num_epochs: int = 3,
):
    # トークナイザーのロード
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # モデルのロード
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        torch_dtype=torch.bfloat16,
        device_map="auto",
    )

    # データセットのロード
    dataset = load_dataset(dataset_name)

    # トークナイズ処理
    def tokenize_function(examples):
        texts = []
        for instruction, input_text, output in zip(
            examples["instruction"],
            examples["input"],
            examples["output"]
        ):
            if input_text:
                text = f"指示: {instruction}\nコンテキスト: {input_text}\n回答: {output}"
            else:
                text = f"指示: {instruction}\n回答: {output}"
            texts.append(text)

        tokenized = tokenizer(
            texts,
            truncation=True,
            max_length=2048,
            padding="max_length",
        )
        tokenized["labels"] = tokenized["input_ids"].copy()
        return tokenized

    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=dataset["train"].column_names,
    )

    # トレーニング引数
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=num_epochs,
        per_device_train_batch_size=4,
        per_device_eval_batch_size=4,
        gradient_accumulation_steps=4,
        warmup_ratio=0.1,
        learning_rate=2e-5,
        fp16=False,
        bf16=True,
        logging_steps=10,
        evaluation_strategy="steps",
        eval_steps=100,
        save_steps=100,
        save_total_limit=3,
        load_best_model_at_end=True,
        report_to="tensorboard",
        dataloader_num_workers=4,
    )

    # データコレクター
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
    )

    # トレーナーの初期化
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset["train"],
        eval_dataset=tokenized_dataset["validation"],
        data_collator=data_collator,
    )

    # 学習開始
    trainer.train()

    # モデルの保存
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"モデルを {output_dir} に保存しました")
```

### SFTTrainerを使ったより簡潔な実装

TRL（Transformer Reinforcement Learning）ライブラリの `SFTTrainer` を使うと、より簡潔に実装できる。

```python
from trl import SFTTrainer, SFTConfig
from transformers import AutoModelForCausalLM, AutoTokenizer

def run_sft_training(
    base_model: str,
    dataset,
    output_dir: str,
):
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        torch_dtype=torch.bfloat16,
        device_map="auto",
    )

    def formatting_func(example):
        """プロンプトのフォーマット"""
        text = f"<|im_start|>system\nあなたは親切なアシスタントです。<|im_end|>\n"
        text += f"<|im_start|>user\n{example['instruction']}<|im_end|>\n"
        text += f"<|im_start|>assistant\n{example['output']}<|im_end|>"
        return text

    sft_config = SFTConfig(
        output_dir=output_dir,
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-5,
        bf16=True,
        max_seq_length=2048,
        logging_steps=10,
        save_strategy="epoch",
    )

    trainer = SFTTrainer(
        model=model,
        args=sft_config,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        formatting_func=formatting_func,
    )

    trainer.train()
    trainer.save_model()
```

---

## 6. LoRA / QLoRAの実装

### PEFTライブラリを使ったLoRA実装

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training
from trl import SFTTrainer, SFTConfig
from datasets import load_dataset

def setup_qlora_model(
    base_model: str,
    lora_r: int = 16,
    lora_alpha: int = 32,
    lora_dropout: float = 0.05,
    use_4bit: bool = True,
):
    """QLoRAモデルのセットアップ"""

    # 4ビット量子化設定
    if use_4bit:
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",          # Normal Float 4-bit
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,     # Double Quantization
        )
    else:
        bnb_config = BitsAndBytesConfig(
            load_in_8bit=True,
        )

    # モデルのロード（量子化済み）
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )

    # kbit学習の準備（gradient checkpointing等）
    model = prepare_model_for_kbit_training(model)

    # LoRA設定
    lora_config = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        target_modules=[
            "q_proj",    # Query projection
            "k_proj",    # Key projection
            "v_proj",    # Value projection
            "o_proj",    # Output projection
            "gate_proj", # MLP gate
            "up_proj",   # MLP up
            "down_proj", # MLP down
        ],
        lora_dropout=lora_dropout,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )

    # PEFTモデルに変換
    model = get_peft_model(model, lora_config)

    # 学習可能パラメータ数を表示
    model.print_trainable_parameters()

    return model


def train_with_qlora(
    base_model: str = "meta-llama/Llama-3.1-8B-Instruct",
    dataset_path: str = "data/train.jsonl",
    output_dir: str = "./qlora-output",
):
    """QLoRAによるファインチューニングの実行"""

    # トークナイザー
    tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # モデルのセットアップ
    model = setup_qlora_model(base_model)

    # データセット
    dataset = load_dataset("json", data_files={"train": dataset_path})

    # Chat templateを使ったフォーマット
    def format_chat(example):
        messages = [
            {"role": "system", "content": "あなたは専門的なアシスタントです。"},
            {"role": "user", "content": example["instruction"]},
            {"role": "assistant", "content": example["output"]},
        ]
        return {"text": tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False,
        )}

    dataset = dataset.map(format_chat)

    # トレーニング設定
    training_args = SFTConfig(
        output_dir=output_dir,
        num_train_epochs=3,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=8,  # 実効バッチサイズ = 16
        optim="paged_adamw_32bit",      # メモリ効率の良いオプティマイザ
        save_steps=50,
        logging_steps=10,
        learning_rate=2e-4,
        weight_decay=0.001,
        fp16=False,
        bf16=True,
        max_grad_norm=0.3,
        max_steps=-1,
        warmup_ratio=0.03,
        group_by_length=True,           # 同程度の長さのサンプルをグループ化
        lr_scheduler_type="cosine",
        max_seq_length=2048,
        dataset_text_field="text",
        report_to="tensorboard",
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        tokenizer=tokenizer,
    )

    # 学習
    trainer.train()

    # LoRAアダプターの保存
    trainer.model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    print(f"LoRAアダプターを {output_dir} に保存しました")


def merge_lora_weights(
    base_model: str,
    lora_adapter_path: str,
    output_path: str,
):
    """LoRAの重みをベースモデルにマージ"""
    from peft import PeftModel

    print("ベースモデルをロード中...")
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        torch_dtype=torch.bfloat16,
        device_map="auto",
    )

    tokenizer = AutoTokenizer.from_pretrained(base_model)

    print("LoRAアダプターをロード中...")
    model = PeftModel.from_pretrained(model, lora_adapter_path)

    print("重みをマージ中...")
    model = model.merge_and_unload()

    print(f"マージ済みモデルを {output_path} に保存中...")
    model.save_pretrained(output_path, safe_serialization=True)
    tokenizer.save_pretrained(output_path)

    print("完了")
```

### target_modulesの選び方

```python
# アーキテクチャごとのtarget_modules

# LLaMA / Mistral系
LLAMA_TARGET_MODULES = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj"
]

# Falcon系
FALCON_TARGET_MODULES = [
    "query_key_value", "dense", "dense_h_to_4h", "dense_4h_to_h"
]

# GPT-NeoX系
NEOX_TARGET_MODULES = [
    "query_key_value", "dense", "dense_h_to_4h", "dense_4h_to_h"
]

# BLOOM系
BLOOM_TARGET_MODULES = [
    "query_key_value", "dense", "dense_h_to_4h", "dense_4h_to_h"
]


def get_target_modules(model) -> List[str]:
    """モデルのアーキテクチャから自動的にtarget_modulesを検出"""
    # 線形レイヤーの名前を収集
    linear_layers = []
    for name, module in model.named_modules():
        if isinstance(module, torch.nn.Linear):
            # 最後の部分（モジュール名）だけを取得
            layer_name = name.split(".")[-1]
            if layer_name not in linear_layers:
                linear_layers.append(layer_name)
    return linear_layers
```

---

## 7. Unslothによる高速ファインチューニング

Unslothは2023年末に登場したLoRA/QLoRAの高速化ライブラリで、標準的なHugging Face実装と比較して2〜5倍の高速化とメモリ削減を実現する。

### Unslothの主な特徴

- カーネルの最適化により学習速度が2〜5倍向上
- VRAMの使用量を最大60%削減
- Hugging Faceと完全互換のAPI
- 長いコンテキスト（Packing）のサポート
- RoPEスケーリングによるコンテキスト拡張

### インストール

```bash
# CUDA 12.1用
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install --no-deps trl peft accelerate bitsandbytes

# または公式の推奨インストール方法（CUDA バージョンを確認）
# conda install pytorch cudatoolkit=12.1 -c pytorch -c nvidia
# pip install unsloth
```

### Unslothを使った完全なファインチューニング例

```python
from unsloth import FastLanguageModel
from trl import SFTTrainer, SFTConfig
from datasets import load_dataset
import torch

def fine_tune_with_unsloth(
    model_name: str = "unsloth/llama-3-8b-Instruct",
    max_seq_length: int = 2048,
    output_dir: str = "./unsloth-output",
    num_epochs: int = 3,
):
    """Unslothを使った高速ファインチューニング"""

    # モデルとトークナイザーのロード（4ビット量子化）
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=max_seq_length,
        dtype=None,              # Noneで自動検出（bfloat16 or float16）
        load_in_4bit=True,
        # token="hf_...",        # プライベートモデルの場合
    )

    # LoRAアダプターの追加
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,                    # ランク
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
        lora_alpha=16,
        lora_dropout=0,          # Unslothでは0が最適
        bias="none",
        use_gradient_checkpointing="unsloth",  # Unsloth最適化
        random_state=42,
        use_rslora=False,        # Rank Stabilized LoRA
        loftq_config=None,
    )

    # データセットの準備
    dataset = load_dataset("json", data_files="data/train.jsonl", split="train")

    # Alpacaプロンプトテンプレート
    alpaca_prompt = """以下の指示に基づいて適切に回答してください。

### 指示:
{}

### 入力:
{}

### 回答:
{}"""

    EOS_TOKEN = tokenizer.eos_token

    def formatting_prompts_func(examples):
        instructions = examples["instruction"]
        inputs = examples.get("input", [""] * len(instructions))
        outputs = examples["output"]
        texts = []
        for instruction, input_text, output in zip(instructions, inputs, outputs):
            text = alpaca_prompt.format(instruction, input_text, output) + EOS_TOKEN
            texts.append(text)
        return {"text": texts}

    dataset = dataset.map(formatting_prompts_func, batched=True)

    # トレーナーの設定
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=SFTConfig(
            dataset_text_field="text",
            max_seq_length=max_seq_length,
            dataset_num_proc=2,
            packing=True,         # 効率的なパッキング（高速化）
            output_dir=output_dir,
            num_train_epochs=num_epochs,
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            warmup_steps=5,
            learning_rate=2e-4,
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=1,
            optim="adamw_8bit",   # メモリ効率の良いオプティマイザ
            weight_decay=0.01,
            lr_scheduler_type="linear",
            seed=42,
        ),
    )

    # GPU使用状況の表示
    gpu_stats = torch.cuda.get_device_properties(0)
    start_gpu_memory = round(torch.cuda.max_memory_reserved() / 1024 / 1024 / 1024, 3)
    max_memory = round(gpu_stats.total_memory / 1024 / 1024 / 1024, 3)
    print(f"GPU: {gpu_stats.name}")
    print(f"最大VRAM: {max_memory} GB")
    print(f"使用中VRAM: {start_gpu_memory} GB")

    # 学習
    trainer_stats = trainer.train()

    # 学習後のGPU使用状況
    used_memory = round(torch.cuda.max_memory_reserved() / 1024 / 1024 / 1024, 3)
    print(f"最大VRAM使用量（学習中）: {used_memory} GB")
    print(f"学習時間: {trainer_stats.metrics['train_runtime']:.2f}秒")

    # LoRAアダプターのみ保存
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    # マージして保存する場合
    # model.save_pretrained_merged(output_dir + "-merged", tokenizer, save_method="merged_16bit")

    # GGUF形式（Ollamaで使用）で保存する場合
    # model.save_pretrained_gguf(output_dir + "-gguf", tokenizer, quantization_method="q4_k_m")


def inference_with_unsloth(model_path: str, prompt: str):
    """Unslothでの推論"""
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_path,
        max_seq_length=2048,
        dtype=None,
        load_in_4bit=True,
    )

    # 推論モードに切り替え（2倍高速化）
    FastLanguageModel.for_inference(model)

    inputs = tokenizer(
        [f"### 指示:\n{prompt}\n\n### 回答:\n"],
        return_tensors="pt"
    ).to("cuda")

    outputs = model.generate(
        **inputs,
        max_new_tokens=512,
        temperature=0.7,
        top_p=0.9,
        repetition_penalty=1.1,
    )

    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return response
```

---

## 8. OpenAI Fine-tuning API

OpenAIのFine-tuning APIを使えば、GPT-4o miniやGPT-3.5 Turboなどのモデルをカスタマイズできる。自前のGPUが不要で、最も手軽にファインチューニングを試せる。

### 対応モデル（2026年2月時点）

- `gpt-4o-mini-2024-07-18`（推奨・コスパ最良）
- `gpt-4o-2024-08-06`
- `gpt-3.5-turbo-0125`
- `davinci-002`（レガシー）

### データ形式

OpenAIのFine-tuning APIはChatMLフォーマットのJSONLファイルを使用する。

```jsonl
{"messages": [{"role": "system", "content": "あなたはECサイトのカスタマーサポートです。"}, {"role": "user", "content": "注文のキャンセルはできますか？"}, {"role": "assistant", "content": "はい、発送前であればキャンセルが可能です。マイページの「注文履歴」から対象の注文を選択し、「キャンセル申請」ボタンをクリックしてください。"}]}
{"messages": [{"role": "system", "content": "あなたはECサイトのカスタマーサポートです。"}, {"role": "user", "content": "返品方法を教えてください。"}, {"role": "assistant", "content": "商品到着後7日以内であれば返品を承ります。返品ご希望の場合は、マイページの「注文履歴」から「返品申請」を行い、指定の住所に元払いでご返送ください。"}]}
```

### OpenAI Fine-tuning APIの実装

```python
from openai import OpenAI
import time
import json

client = OpenAI()  # OPENAI_API_KEY環境変数を使用

def upload_training_file(file_path: str) -> str:
    """トレーニングファイルをアップロード"""
    print(f"ファイルをアップロード中: {file_path}")

    with open(file_path, "rb") as f:
        response = client.files.create(
            file=f,
            purpose="fine-tune",
        )

    file_id = response.id
    print(f"アップロード完了。ファイルID: {file_id}")
    return file_id


def create_fine_tuning_job(
    training_file_id: str,
    validation_file_id: str = None,
    model: str = "gpt-4o-mini-2024-07-18",
    suffix: str = "custom-v1",
    n_epochs: int = 3,
    batch_size: int = None,
    learning_rate_multiplier: float = None,
) -> str:
    """ファインチューニングジョブの作成"""

    hyperparameters = {"n_epochs": n_epochs}
    if batch_size:
        hyperparameters["batch_size"] = batch_size
    if learning_rate_multiplier:
        hyperparameters["learning_rate_multiplier"] = learning_rate_multiplier

    kwargs = {
        "training_file": training_file_id,
        "model": model,
        "suffix": suffix,
        "hyperparameters": hyperparameters,
    }

    if validation_file_id:
        kwargs["validation_file"] = validation_file_id

    print(f"ファインチューニングジョブを作成中...")
    response = client.fine_tuning.jobs.create(**kwargs)

    job_id = response.id
    print(f"ジョブID: {job_id}")
    print(f"ステータス: {response.status}")
    return job_id


def wait_for_fine_tuning(job_id: str, poll_interval: int = 60) -> str:
    """ファインチューニングの完了を待機"""
    print(f"ジョブ {job_id} の完了を待機中...")

    while True:
        job = client.fine_tuning.jobs.retrieve(job_id)
        status = job.status

        print(f"ステータス: {status}")

        if status == "succeeded":
            fine_tuned_model = job.fine_tuned_model
            print(f"ファインチューニング完了！")
            print(f"モデル名: {fine_tuned_model}")
            return fine_tuned_model

        elif status in ["failed", "cancelled"]:
            print(f"ジョブが {status} で終了しました")
            # エラーの詳細を表示
            events = client.fine_tuning.jobs.list_events(job_id, limit=10)
            for event in events.data:
                print(f"  [{event.level}] {event.message}")
            raise RuntimeError(f"Fine-tuning failed with status: {status}")

        # イベントを表示
        events = client.fine_tuning.jobs.list_events(job_id, limit=5)
        for event in events.data[:3]:
            if event.level == "info":
                print(f"  {event.message}")

        time.sleep(poll_interval)


def test_fine_tuned_model(model_id: str, test_message: str):
    """ファインチューニング済みモデルのテスト"""
    response = client.chat.completions.create(
        model=model_id,
        messages=[
            {"role": "system", "content": "あなたはECサイトのカスタマーサポートです。"},
            {"role": "user", "content": test_message},
        ],
        max_tokens=500,
        temperature=0.7,
    )
    return response.choices[0].message.content


def full_fine_tuning_pipeline(
    train_file: str,
    val_file: str = None,
    model: str = "gpt-4o-mini-2024-07-18",
):
    """完全なファインチューニングパイプライン"""

    # ファイルのアップロード
    train_file_id = upload_training_file(train_file)
    val_file_id = upload_training_file(val_file) if val_file else None

    # ジョブの作成
    job_id = create_fine_tuning_job(
        training_file_id=train_file_id,
        validation_file_id=val_file_id,
        model=model,
        suffix="production-v1",
        n_epochs=3,
    )

    # 完了待機
    fine_tuned_model = wait_for_fine_tuning(job_id)

    # テスト
    print("\n--- テスト ---")
    test_queries = [
        "返品したいのですが手続きを教えてください。",
        "注文状況を確認したい。",
        "領収書の発行はできますか？",
    ]

    for query in test_queries:
        print(f"\nQ: {query}")
        response = test_fine_tuned_model(fine_tuned_model, query)
        print(f"A: {response}")

    return fine_tuned_model


# OpenAIデータセット検証ツール
def validate_openai_dataset(file_path: str):
    """OpenAI Fine-tuning用データセットの検証"""
    errors = []
    warnings = []
    token_counts = []

    with open(file_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            try:
                data = json.loads(line.strip())
            except json.JSONDecodeError as e:
                errors.append(f"行{i}: JSONパースエラー - {e}")
                continue

            messages = data.get("messages", [])

            if not messages:
                errors.append(f"行{i}: messagesフィールドが空")
                continue

            roles = [m.get("role") for m in messages]

            if "assistant" not in roles:
                errors.append(f"行{i}: assistantロールが存在しない")

            for msg in messages:
                if "role" not in msg:
                    errors.append(f"行{i}: roleフィールドが存在しない")
                if "content" not in msg:
                    errors.append(f"行{i}: contentフィールドが存在しない")
                if msg.get("role") not in ["system", "user", "assistant"]:
                    warnings.append(f"行{i}: 不正なロール - {msg.get('role')}")

            # 簡易トークン数推定（1トークン ≈ 4文字）
            total_chars = sum(len(m.get("content", "")) for m in messages)
            token_counts.append(total_chars // 4)

    print(f"データ件数: {i}")
    print(f"エラー数: {len(errors)}")
    print(f"警告数: {len(warnings)}")

    if token_counts:
        avg_tokens = sum(token_counts) / len(token_counts)
        max_tokens = max(token_counts)
        print(f"平均トークン数（推定）: {avg_tokens:.0f}")
        print(f"最大トークン数（推定）: {max_tokens}")

        if max_tokens > 4096:
            warnings.append(f"最大トークン数が4096を超えるサンプルがあります")

    for error in errors[:10]:
        print(f"ERROR: {error}")
    for warning in warnings[:10]:
        print(f"WARNING: {warning}")

    return len(errors) == 0
```

---

## 9. Gemini・Claude APIのファインチューニング

### Google Vertex AI / Gemini Fine-tuning

Googleは `gemini-1.0-pro` のファインチューニングをVertex AI経由で提供している。

```python
import vertexai
from vertexai.tuning import sft as vertex_sft

def fine_tune_gemini(
    project_id: str,
    location: str = "us-central1",
    train_dataset_uri: str = "gs://your-bucket/train.jsonl",
    validation_dataset_uri: str = "gs://your-bucket/val.jsonl",
):
    """Vertex AIを使ったGeminiのファインチューニング"""

    vertexai.init(project=project_id, location=location)

    # ファインチューニングジョブの作成
    sft_tuning_job = vertex_sft.train(
        source_model="gemini-1.0-pro-002",
        train_dataset=train_dataset_uri,
        validation_dataset=validation_dataset_uri,
        tuned_model_display_name="my-custom-gemini",
        epochs=3,
        adapter_size=4,           # LoRAランクに相当
        learning_rate_multiplier=1.0,
    )

    print(f"チューニングジョブ開始: {sft_tuning_job.resource_name}")

    # 完了を待機
    sft_tuning_job.wait()

    print(f"ステータス: {sft_tuning_job.state.name}")
    tuned_model = sft_tuning_job.tuned_model_name
    print(f"チューニング済みモデル: {tuned_model}")

    return tuned_model


def inference_tuned_gemini(tuned_model_name: str, prompt: str) -> str:
    """チューニング済みGeminiモデルで推論"""
    from vertexai.generative_models import GenerativeModel

    model = GenerativeModel(tuned_model_name)
    response = model.generate_content(prompt)
    return response.text
```

### Geminiのデータフォーマット

```jsonl
{"contents": [{"role": "user", "parts": [{"text": "Pythonのリスト内包表記を説明してください。"}]}, {"role": "model", "parts": [{"text": "リスト内包表記は、簡潔にリストを生成するPythonの構文です。例えば [x**2 for x in range(10)] は0から9の2乗のリストを生成します。"}]}]}
```

### Anthropic Claude Fine-tuning

2026年時点では、AnthropicはエンタープライズプランでClaude 3 Haikuのファインチューニングを提供している（限定ベータ）。

```python
import anthropic

def fine_tune_claude(
    training_data_path: str,
    model: str = "claude-haiku-20240307",
    output_name: str = "my-custom-claude",
):
    """Claude Fine-tuning（エンタープライズのみ）"""

    client = anthropic.Anthropic()

    # ファインチューニングジョブの作成（エンタープライズAPI経由）
    # 注意: 実際のAPIエンドポイントは公式ドキュメントを参照
    job = client.beta.fine_tuning.jobs.create(
        training_file=training_data_path,
        model=model,
        name=output_name,
        hyperparameters={
            "num_epochs": 3,
        },
    )

    print(f"ジョブID: {job.id}")
    return job.id
```

---

## 10. 評価指標とベンチマーク

### 自動評価指標

#### Perplexity（パープレキシティ）

言語モデルの基本的な評価指標。低いほど良い。

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from datasets import load_dataset
import math

def calculate_perplexity(
    model_path: str,
    test_texts: list,
    batch_size: int = 4,
) -> float:
    """Perplexityを計算"""

    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype=torch.bfloat16,
        device_map="auto",
    )
    model.eval()

    total_loss = 0
    total_tokens = 0

    for i in range(0, len(test_texts), batch_size):
        batch = test_texts[i:i + batch_size]

        inputs = tokenizer(
            batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
        ).to(model.device)

        with torch.no_grad():
            outputs = model(**inputs, labels=inputs["input_ids"])
            loss = outputs.loss

        # バッチ内のトークン数
        num_tokens = inputs["attention_mask"].sum().item()
        total_loss += loss.item() * num_tokens
        total_tokens += num_tokens

    avg_loss = total_loss / total_tokens
    perplexity = math.exp(avg_loss)

    return perplexity
```

#### ROUGE スコア

要約・翻訳タスクで使われる評価指標。

```python
from rouge_score import rouge_scorer

def evaluate_rouge(predictions: list, references: list) -> dict:
    """ROUGEスコアを計算"""
    scorer = rouge_scorer.RougeScorer(
        ['rouge1', 'rouge2', 'rougeL'],
        use_stemmer=False
    )

    scores = {
        'rouge1': {'precision': [], 'recall': [], 'fmeasure': []},
        'rouge2': {'precision': [], 'recall': [], 'fmeasure': []},
        'rougeL': {'precision': [], 'recall': [], 'fmeasure': []},
    }

    for pred, ref in zip(predictions, references):
        score = scorer.score(ref, pred)
        for metric in scores:
            scores[metric]['precision'].append(score[metric].precision)
            scores[metric]['recall'].append(score[metric].recall)
            scores[metric]['fmeasure'].append(score[metric].fmeasure)

    # 平均を計算
    avg_scores = {}
    for metric in scores:
        avg_scores[metric] = {
            k: sum(v) / len(v) for k, v in scores[metric].items()
        }

    return avg_scores
```

### LLM-as-a-Judge（GPT-4による評価）

人間の評価に最も近い結果が得られる手法。

```python
from openai import OpenAI

client = OpenAI()

def evaluate_with_llm_judge(
    question: str,
    model_answer: str,
    reference_answer: str,
    criteria: list = None,
) -> dict:
    """GPT-4を使った自動評価"""

    if criteria is None:
        criteria = ["正確性", "完全性", "明確さ", "有用性"]

    prompt = f"""以下の回答を評価してください。

質問:
{question}

モデルの回答:
{model_answer}

参照回答:
{reference_answer}

以下の基準でそれぞれ1〜5点で評価し、理由も説明してください:
{chr(10).join(f"- {c}" for c in criteria)}

JSONフォーマットで回答してください:
{{
  "scores": {{"正確性": X, "完全性": X, "明確さ": X, "有用性": X}},
  "total": X,
  "reasoning": "評価理由"
}}"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0,
    )

    result = json.loads(response.choices[0].message.content)
    return result


def batch_evaluate(
    test_cases: list,
    model_fn,
    judge_model: str = "gpt-4o",
) -> dict:
    """バッチ評価の実行"""
    all_scores = []

    for i, case in enumerate(test_cases):
        print(f"評価中 ({i+1}/{len(test_cases)})...")

        # モデルの回答生成
        model_answer = model_fn(case["question"])

        # LLM判定
        evaluation = evaluate_with_llm_judge(
            question=case["question"],
            model_answer=model_answer,
            reference_answer=case["reference"],
        )

        all_scores.append({
            "question": case["question"],
            "model_answer": model_answer,
            "reference": case["reference"],
            "evaluation": evaluation,
        })

    # 集計
    total_scores = [s["evaluation"]["total"] for s in all_scores]
    avg_score = sum(total_scores) / len(total_scores)

    print(f"\n平均スコア: {avg_score:.2f} / 20")
    return {"results": all_scores, "average_score": avg_score}
```

### ベンチマークとの比較

```python
def run_benchmark_evaluation(model_path: str):
    """標準ベンチマークでの評価"""

    # lm-evaluation-harnessを使った評価
    # pip install lm-eval
    import subprocess

    benchmarks = [
        "hellaswag",       # 常識推論
        "arc_challenge",   # 科学的推論
        "mmlu",            # 多分野知識
        "truthfulqa",      # 事実性
        "gsm8k",           # 数学的推論
    ]

    for benchmark in benchmarks:
        cmd = [
            "lm_eval",
            "--model", "hf",
            "--model_args", f"pretrained={model_path}",
            "--tasks", benchmark,
            "--device", "cuda",
            "--batch_size", "auto",
            "--output_path", f"./results/{benchmark}",
        ]

        print(f"ベンチマーク実行中: {benchmark}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        print(result.stdout)
```

---

## 11. Ollamaによるローカルデプロイ

Ollamaを使えば、ファインチューニングしたモデルをローカルで簡単に動かせる。

### GGUF形式への変換

```bash
# llama.cppのインストール
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make LLAMA_CUBLAS=1

# HuggingFaceモデルをGGUF形式に変換
python convert-hf-to-gguf.py \
    /path/to/merged-model \
    --outtype f16 \
    --outfile model-f16.gguf

# 量子化（Q4_K_M推奨）
./llama-quantize model-f16.gguf model-q4_k_m.gguf Q4_K_M
```

### Unslothを使ったGGUF変換

```python
# Unslothで直接GGUF形式に保存する場合
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="./fine-tuned-adapter",
    max_seq_length=2048,
    load_in_4bit=True,
)

# GGUF形式で保存（複数の量子化形式を選択可能）
# q4_k_m: 推奨バランス
# q5_k_m: 高品質
# q8_0: 最高品質
# f16: フル精度
model.save_pretrained_gguf(
    "./model-gguf",
    tokenizer,
    quantization_method="q4_k_m",
)
```

### Modelfileの作成

```dockerfile
# Modelfile（カスタムシステムプロンプト付き）
FROM ./model-q4_k_m.gguf

# システムプロンプト
SYSTEM """
あなたは専門的なコーディングアシスタントです。
- 質問には簡潔かつ正確に回答してください
- コード例は常に動作確認済みのものを提供してください
- エラーが発生した場合は原因と解決策を明示してください
"""

# パラメータ設定
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1
PARAMETER num_ctx 4096

# チャットテンプレート
TEMPLATE """{{- if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{- range .Messages }}<|im_start|>{{ .Role }}
{{ .Content }}<|im_end|>
{{ end }}<|im_start|>assistant
"""
```

```bash
# Ollamaにモデルを登録
ollama create my-custom-model -f Modelfile

# 動作確認
ollama run my-custom-model "Pythonでリストをソートする方法を教えてください。"

# APIサーバーとして使用
curl http://localhost:11434/api/generate \
  -d '{
    "model": "my-custom-model",
    "prompt": "Pythonでクイックソートを実装してください。",
    "stream": false
  }'
```

### OllamaのPython APIクライアント

```python
import ollama
from typing import Generator

def chat_with_local_model(
    model_name: str,
    messages: list,
    stream: bool = True,
) -> str:
    """Ollamaモデルとのチャット"""

    if stream:
        full_response = ""
        for chunk in ollama.chat(
            model=model_name,
            messages=messages,
            stream=True,
        ):
            content = chunk["message"]["content"]
            print(content, end="", flush=True)
            full_response += content
        print()
        return full_response
    else:
        response = ollama.chat(
            model=model_name,
            messages=messages,
        )
        return response["message"]["content"]


class LocalLLMClient:
    """ローカルLLMクライアント"""

    def __init__(self, model_name: str, system_prompt: str = ""):
        self.model_name = model_name
        self.system_prompt = system_prompt
        self.conversation_history = []

        if system_prompt:
            self.conversation_history.append({
                "role": "system",
                "content": system_prompt,
            })

    def chat(self, user_message: str) -> str:
        """ユーザーメッセージを送信して回答を取得"""
        self.conversation_history.append({
            "role": "user",
            "content": user_message,
        })

        response = ollama.chat(
            model=self.model_name,
            messages=self.conversation_history,
        )

        assistant_message = response["message"]["content"]
        self.conversation_history.append({
            "role": "assistant",
            "content": assistant_message,
        })

        return assistant_message

    def reset(self):
        """会話履歴をリセット"""
        self.conversation_history = []
        if self.system_prompt:
            self.conversation_history.append({
                "role": "system",
                "content": self.system_prompt,
            })
```

---

## 12. Hugging Face Hubへのモデル公開

ファインチューニングしたモデルをHugging Face Hubで公開することで、他のプロジェクトでも再利用できる。

### モデルカードの作成

```python
from huggingface_hub import HfApi, create_repo, upload_folder
import yaml

def create_model_card(
    model_id: str,
    base_model: str,
    language: list,
    license: str,
    tags: list,
    description: str,
    training_details: dict,
) -> str:
    """モデルカードのMarkdownを生成"""

    metadata = {
        "language": language,
        "license": license,
        "base_model": base_model,
        "tags": tags,
        "datasets": training_details.get("datasets", []),
        "metrics": training_details.get("metrics", []),
        "model-index": [
            {
                "name": model_id,
                "results": training_details.get("benchmark_results", []),
            }
        ],
    }

    card_content = f"""---
{yaml.dump(metadata, default_flow_style=False, allow_unicode=True)}---

# {model_id}

## モデルの概要

{description}

## ベースモデル

[{base_model}](https://huggingface.co/{base_model}) をベースにLoRAでファインチューニングしたモデルです。

## 使用方法

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained("{model_id}")
tokenizer = AutoTokenizer.from_pretrained("{model_id}")

inputs = tokenizer("こんにちは、", return_tensors="pt")
outputs = model.generate(**inputs, max_new_tokens=100)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

## トレーニング詳細

- **学習データ**: {training_details.get('num_samples', 'N/A')} サンプル
- **学習エポック**: {training_details.get('epochs', 'N/A')}
- **学習率**: {training_details.get('learning_rate', 'N/A')}
- **バッチサイズ**: {training_details.get('batch_size', 'N/A')}
- **LoRAランク**: {training_details.get('lora_r', 'N/A')}
- **GPU**: {training_details.get('gpu', 'N/A')}

## 制限事項

- このモデルは特定のドメイン・タスク向けにチューニングされています
- 汎用的な用途には元のベースモデルをご利用ください
- 生成される内容の正確性は保証されません

## ライセンス

{license}
"""

    return card_content


def push_model_to_hub(
    model_path: str,
    repo_id: str,
    private: bool = False,
    commit_message: str = "Upload fine-tuned model",
):
    """モデルをHugging Face Hubにアップロード"""

    api = HfApi()

    # リポジトリの作成（存在しない場合）
    try:
        create_repo(
            repo_id=repo_id,
            private=private,
            exist_ok=True,
        )
        print(f"リポジトリ作成: {repo_id}")
    except Exception as e:
        print(f"リポジトリの作成/確認中: {e}")

    # モデルファイルのアップロード
    print(f"モデルをアップロード中: {repo_id}")
    api.upload_folder(
        folder_path=model_path,
        repo_id=repo_id,
        commit_message=commit_message,
        ignore_patterns=["*.tmp", "__pycache__", ".git"],
    )

    print(f"アップロード完了: https://huggingface.co/{repo_id}")
```

---

## 13. コスト試算

ファインチューニングのコストは手法と規模によって大きく異なる。

### GPU クラウドサービスの料金比較（2026年2月時点）

| サービス | GPU | 料金/時間 | 備考 |
|---------|-----|---------|------|
| Google Colab Pro+ | A100 40GB | $0 (サブスク $49.99/月) | 月50コンピュートユニット |
| RunPod | RTX 4090 | $0.44/時 | スポット料金 |
| RunPod | A100 80GB | $1.99/時 | オンデマンド |
| Lambda Labs | A100 80GB x8 | $14.40/時 | 8GPU構成 |
| AWS SageMaker | ml.p3.2xlarge (V100) | $3.83/時 | 東京リージョン |
| Azure | NC6s v3 (V100) | $3.06/時 | 東日本リージョン |
| Vast.ai | RTX 3090 | $0.15〜0.25/時 | 個人レンタル |

### モデル別コスト試算

#### 7B モデル（QLoRAで学習）

```
環境: RTX 4090 (24GB VRAM) @ $0.44/時

データ量: 1,000件
学習時間: 約1〜2時間

コスト: $0.44 × 2 = $0.88
```

#### 13B モデル（QLoRAで学習）

```
環境: A100 40GB @ $1.50/時

データ量: 5,000件
学習時間: 約4〜6時間

コスト: $1.50 × 6 = $9.00
```

#### 70B モデル（QLoRAで学習）

```
環境: A100 80GB × 2 @ $3.00/時

データ量: 10,000件
学習時間: 約12〜24時間

コスト: $3.00 × 24 = $72.00
```

### OpenAI Fine-tuning APIのコスト

```
gpt-4o-mini のFine-tuning料金:
- 学習: $3.00 / 1Mトークン
- 推論: $0.30 / 1M入力トークン + $1.20 / 1M出力トークン

例: 1,000件 × 平均500トークン = 500,000トークン
学習コスト: $3.00 × 0.5 = $1.50

月間1,000クエリ × 平均200出力トークン = 200,000出力トークン
推論コスト: $1.20 × 0.2 = $0.24/月
```

### コスト最適化のヒント

```python
def estimate_training_cost(
    num_samples: int,
    avg_tokens_per_sample: int,
    model_size_b: int,  # 10億パラメータ
    num_epochs: int,
    gpu_cost_per_hour: float,
) -> dict:
    """学習コストの概算"""

    total_tokens = num_samples * avg_tokens_per_sample * num_epochs

    # 学習時間の推定（おおよそのガイドライン）
    # 7Bモデル on RTX4090: ~50,000 tokens/sec
    tokens_per_second = (50_000 / 7) * (7 / model_size_b)

    training_hours = total_tokens / tokens_per_second / 3600

    cost = training_hours * gpu_cost_per_hour

    return {
        "total_tokens": total_tokens,
        "estimated_hours": round(training_hours, 2),
        "estimated_cost_usd": round(cost, 2),
    }

# 例
estimate = estimate_training_cost(
    num_samples=2000,
    avg_tokens_per_sample=300,
    model_size_b=7,
    num_epochs=3,
    gpu_cost_per_hour=0.44,
)
print(estimate)
# {'total_tokens': 1800000, 'estimated_hours': 1.0, 'estimated_cost_usd': 0.44}
```

---

## 14. 実践例

### 実践例1: コードアシスタントの構築

特定の社内フレームワークやコーディング規約に従ったコードを生成するアシスタントを構築する例。

```python
import json
from pathlib import Path
from typing import List, Dict

class CodeAssistantDatasetBuilder:
    """コードアシスタント用データセット構築"""

    def __init__(self, codebase_path: str):
        self.codebase_path = Path(codebase_path)

    def extract_docstring_pairs(self) -> List[Dict]:
        """関数のdocstringと実装のペアを抽出"""
        import ast

        pairs = []

        for py_file in self.codebase_path.rglob("*.py"):
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    source = f.read()

                tree = ast.parse(source)

                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        docstring = ast.get_docstring(node)
                        if not docstring or len(docstring) < 20:
                            continue

                        # 関数の実装を取得
                        func_source = ast.get_source_segment(source, node)
                        if not func_source:
                            continue

                        pairs.append({
                            "instruction": f"次の仕様を満たすPython関数を実装してください:\n{docstring}",
                            "input": "",
                            "output": func_source,
                        })

            except Exception:
                continue

        return pairs

    def generate_qa_from_code(self, code_snippet: str) -> List[Dict]:
        """コードスニペットからQ&Aを生成（GPT-4を使用）"""
        from openai import OpenAI

        client = OpenAI()

        prompt = f"""以下のコードについて、開発者が知りたいQ&Aペアを5つ生成してください。
コードの動作説明、使用方法、エラーハンドリング、パフォーマンス等の観点から。

```python
{code_snippet}
```

JSON配列で出力:
[{{"instruction": "質問", "input": "", "output": "回答"}}]"""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )

        data = json.loads(response.choices[0].message.content)
        return data.get("items", [])


# 完全なコードアシスタントのファインチューニングパイプライン
def build_code_assistant(
    codebase_path: str,
    base_model: str = "unsloth/codellama-7b-instruct",
    output_dir: str = "./code-assistant",
):
    """コードアシスタントのファインチューニング"""

    from unsloth import FastLanguageModel
    from trl import SFTTrainer, SFTConfig
    from datasets import Dataset

    # データセット構築
    builder = CodeAssistantDatasetBuilder(codebase_path)
    pairs = builder.extract_docstring_pairs()
    print(f"抽出されたペア数: {len(pairs)}")

    # モデルのロード
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=base_model,
        max_seq_length=4096,
        load_in_4bit=True,
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
        lora_alpha=32,
        lora_dropout=0,
        use_gradient_checkpointing="unsloth",
    )

    # データセット準備
    dataset = Dataset.from_list(pairs)

    code_prompt = """以下の仕様に基づいてPythonコードを実装してください。

### 仕様:
{}

### 実装:
{}"""

    def formatting_func(example):
        return code_prompt.format(
            example["instruction"],
            example["output"],
        ) + tokenizer.eos_token

    dataset = dataset.map(
        lambda x: {"text": formatting_func(x)},
        remove_columns=dataset.column_names,
    )

    # 学習
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=SFTConfig(
            output_dir=output_dir,
            num_train_epochs=5,
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            learning_rate=2e-4,
            bf16=True,
            max_seq_length=4096,
            packing=True,
            dataset_text_field="text",
        ),
    )

    trainer.train()
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    print(f"コードアシスタントを {output_dir} に保存しました")
```

### 実践例2: カスタマーサポートbotの構築

```python
# カスタマーサポートbotのデータ準備
SUPPORT_BOT_SYSTEM = """あなたはABC株式会社のカスタマーサポート担当者です。

会社概要:
- 創業: 2015年
- 主要サービス: クラウド型ERPシステム「ABC Cloud ERP」
- サポート時間: 平日9:00〜18:00

対応ポリシー:
1. 常に丁寧な言葉遣いで対応する（敬語必須）
2. 技術的な質問は詳細に答える
3. 契約・料金に関する質問は営業担当への転送を案内する
4. 解決できない場合は上位サポートへのエスカレーションを提案する
5. 個人情報の入力を絶対に求めない"""

SUPPORT_EXAMPLES = [
    {
        "messages": [
            {"role": "system", "content": SUPPORT_BOT_SYSTEM},
            {"role": "user", "content": "ログインできないのですが、どうすればいいですか？"},
            {"role": "assistant", "content": "ご不便をおかけして申し訳ございません。ログインができない場合、以下の手順をお試しください。\n\n1. ブラウザのキャッシュとCookieをクリアする\n2. パスワードのリセットを行う（ログイン画面の「パスワードを忘れた方」から）\n3. 別のブラウザでお試しになる\n\n上記でも解決しない場合は、アカウントが一時停止されている可能性がございます。恐れ入りますが、登録メールアドレスと会社名をご準備の上、サポートダイヤル（0120-XXX-XXX）にご連絡いただけますでしょうか。"}
        ]
    },
    {
        "messages": [
            {"role": "system", "content": SUPPORT_BOT_SYSTEM},
            {"role": "user", "content": "CSVデータのインポートでエラーが出ます。"},
            {"role": "assistant", "content": "CSVインポートのエラーについてご案内いたします。\n\nよくあるエラーの原因として以下が考えられます:\n\n1. **文字コードの問題**: CSVファイルの文字コードはUTF-8（BOM付き）が必要です。Excelで保存する場合は「CSV UTF-8（コンマ区切り）」を選択してください。\n\n2. **列名の不一致**: テンプレートファイルの列名と一致していることをご確認ください。テンプレートは管理画面の「データインポート」→「テンプレートダウンロード」から取得できます。\n\n3. **必須項目の欠如**: 「取引先コード」「取引先名」は必須項目です。\n\nエラーメッセージの具体的な内容をお知らせいただけますでしょうか？より詳しいサポートが可能でございます。"}
        ]
    },
]


def train_support_bot(
    training_data: list,
    base_model: str = "gpt-4o-mini-2024-07-18",
):
    """カスタマーサポートbotのファインチューニング"""

    # JSONLファイルに保存
    with open("support_train.jsonl", "w", encoding="utf-8") as f:
        for item in training_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    # OpenAI Fine-tuning APIで学習
    pipeline_result = full_fine_tuning_pipeline(
        train_file="support_train.jsonl",
        model=base_model,
    )

    return pipeline_result
```

---

## 15. ベストプラクティスとよくある失敗

### ベストプラクティス

#### データ品質を最優先にする

```python
def data_quality_checklist(dataset: list) -> bool:
    """データ品質チェックリスト"""
    checks = {
        "最低データ量": len(dataset) >= 100,
        "多様性確保": len(set(d["instruction"][:50] for d in dataset)) > len(dataset) * 0.8,
        "出力の一貫性": all(len(d.get("output", "")) > 10 for d in dataset),
        "フォーマット統一": all("instruction" in d and "output" in d for d in dataset),
        "重複なし": len(dataset) == len({d["instruction"] + d.get("output", "") for d in dataset}),
    }

    for check, result in checks.items():
        status = "OK" if result else "FAIL"
        print(f"[{status}] {check}")

    return all(checks.values())
```

#### 学習率とエポック数の調整

```python
# 学習率のガイドライン
LEARNING_RATE_GUIDELINES = {
    "full_fine_tuning": {
        "range": (1e-6, 5e-5),
        "recommended": 2e-5,
        "note": "低すぎると収束しない、高すぎるとCatastrophic Forgetting",
    },
    "lora_fine_tuning": {
        "range": (1e-5, 5e-4),
        "recommended": 2e-4,
        "note": "LoRAはフルFTより高い学習率が使える",
    },
}

# エポック数のガイドライン
EPOCH_GUIDELINES = {
    "small_dataset_100_500": 5,        # 小規模データ
    "medium_dataset_500_2000": 3,      # 中規模データ
    "large_dataset_2000_plus": 1_to_2, # 大規模データ（過学習に注意）
}
```

#### Gradient AccumulationでバッチサイズをシミュレーションP

```python
# 実際のバッチサイズが小さい場合
# per_device_train_batch_size=2 × gradient_accumulation_steps=8
# = 実効バッチサイズ16

# 大きな実効バッチサイズの方が安定した学習が可能
```

#### チェックポイントの活用

```python
from transformers import TrainingArguments

training_args = TrainingArguments(
    # チェックポイント設定
    save_strategy="steps",
    save_steps=100,
    save_total_limit=3,           # 最新3つのみ保持（ディスク節約）
    load_best_model_at_end=True,  # 最良モデルで終了
    metric_for_best_model="eval_loss",
    greater_is_better=False,
    # 早期終了
    evaluation_strategy="steps",
    eval_steps=100,
)
```

### よくある失敗と対策

#### 失敗1: Catastrophic Forgetting（壊滅的忘却）

**症状**: ファインチューニング後、元の一般的な能力が失われる。

**原因**: 学習率が高すぎる、エポック数が多すぎる、データの多様性が低い。

**対策**:
```python
# 小さな学習率から始める
learning_rate = 1e-5  # 2e-4ではなく

# エポック数を少なくする
num_epochs = 1  # まず1エポックで評価

# Regularization（正則化）を追加
weight_decay = 0.01

# LoRAを使う（元の重みを保護）
use_lora = True
```

#### 失敗2: Mode Collapse（モードの崩壊）

**症状**: モデルが少数のパターンしか生成しなくなる。

**原因**: データセットの多様性不足、学習率が高すぎる。

**対策**:
```python
# データ多様性の確認
from collections import Counter

def check_output_diversity(dataset: list, top_n: int = 20):
    """出力の多様性をチェック"""
    first_words = Counter()
    for item in dataset:
        words = item["output"].split()[:5]
        first_words[tuple(words)] += 1

    print("最も多い出力の先頭5単語 (Top 20):")
    for pattern, count in first_words.most_common(top_n):
        print(f"  {' '.join(pattern)}: {count}件")

    # 多様性スコア（全サンプルに対するユニークパターンの割合）
    diversity_score = len(first_words) / len(dataset)
    print(f"多様性スコア: {diversity_score:.2f} (1.0が最大)")
    return diversity_score
```

#### 失敗3: データリーケージ（データ漏洩）

**症状**: 検証データで高いスコアだが、実際の使用では性能が低い。

**原因**: 訓練データと検証データが重複している。

**対策**:
```python
def check_data_leakage(train_data: list, val_data: list) -> bool:
    """データリーケージのチェック"""
    train_set = {json.dumps(item, ensure_ascii=False) for item in train_data}
    val_set = {json.dumps(item, ensure_ascii=False) for item in val_data}

    overlap = train_set & val_set
    if overlap:
        print(f"警告: {len(overlap)}件の重複データがあります")
        return True

    # テキストの類似性チェック（完全一致だけでなく）
    train_instructions = {item["instruction"] for item in train_data}
    val_instructions = {item["instruction"] for item in val_data}

    instruction_overlap = train_instructions & val_instructions
    if instruction_overlap:
        print(f"警告: {len(instruction_overlap)}件の指示文が重複しています")
        return True

    print("データリーケージなし")
    return False
```

#### 失敗4: 過学習（Overfitting）

**症状**: 訓練損失は下がるが、検証損失は上がる。

**対策**:
```python
import matplotlib.pyplot as plt

def plot_training_curves(log_file: str):
    """学習曲線のプロット（過学習の検出）"""
    import json

    train_losses = []
    eval_losses = []

    with open(log_file) as f:
        for line in f:
            data = json.loads(line)
            if "loss" in data:
                train_losses.append((data["step"], data["loss"]))
            if "eval_loss" in data:
                eval_losses.append((data["step"], data["eval_loss"]))

    fig, ax = plt.subplots(1, 1, figsize=(10, 6))

    if train_losses:
        steps, losses = zip(*train_losses)
        ax.plot(steps, losses, label="Train Loss", color="blue")

    if eval_losses:
        steps, losses = zip(*eval_losses)
        ax.plot(steps, losses, label="Eval Loss", color="red")

    ax.set_xlabel("Steps")
    ax.set_ylabel("Loss")
    ax.set_title("Training Curves")
    ax.legend()

    # 過学習の検出
    if eval_losses and train_losses:
        final_train = train_losses[-1][1]
        final_eval = eval_losses[-1][1]
        ratio = final_eval / final_train

        if ratio > 1.5:
            ax.set_title(f"Training Curves - 過学習の可能性あり (eval/train ratio: {ratio:.2f})")

    plt.savefig("training_curves.png")
    print("training_curves.png に保存しました")
```

#### 失敗5: VRAMのOOM（Out of Memory）

**対策チェックリスト**:

```python
def calculate_vram_requirements(
    model_params_b: float,  # 10億パラメータ
    batch_size: int,
    seq_length: int,
    dtype: str = "bf16",
) -> dict:
    """VRAM使用量の概算"""

    bytes_per_param = {"fp32": 4, "fp16": 2, "bf16": 2, "int8": 1, "int4": 0.5}
    param_bytes = bytes_per_param.get(dtype, 2)

    # モデルパラメータ
    model_vram_gb = model_params_b * 1e9 * param_bytes / 1024**3

    # 勾配（フルFTの場合はfloat32で保存）
    grad_vram_gb = model_params_b * 1e9 * 4 / 1024**3

    # オプティマイザ状態（AdamW: パラメータの2倍）
    optimizer_vram_gb = model_params_b * 1e9 * 4 * 2 / 1024**3

    # アクティベーション（おおよそ）
    activation_vram_gb = batch_size * seq_length * model_params_b * 0.1 / 1024**3

    total_full_ft = model_vram_gb + grad_vram_gb + optimizer_vram_gb + activation_vram_gb
    total_lora = model_vram_gb + activation_vram_gb  # LoRAはgrad/optimizer小さい
    total_qlora = model_vram_gb * 0.25 + activation_vram_gb  # 4bit量子化

    return {
        "model_vram_gb": round(model_vram_gb, 1),
        "full_fine_tuning_gb": round(total_full_ft, 1),
        "lora_gb": round(total_lora, 1),
        "qlora_gb": round(total_qlora, 1),
    }

# 使用例
req = calculate_vram_requirements(
    model_params_b=7,
    batch_size=4,
    seq_length=2048,
)
print(f"7Bモデルの必要VRAM:")
print(f"  フルFT: {req['full_fine_tuning_gb']} GB")
print(f"  LoRA: {req['lora_gb']} GB")
print(f"  QLoRA: {req['qlora_gb']} GB")
```

#### VRAMを削減するテクニック

```python
from transformers import TrainingArguments

# VRAMを最大限節約するための設定
memory_optimized_args = TrainingArguments(
    # Gradient Checkpointing（メモリ節約、速度は少し遅くなる）
    gradient_checkpointing=True,

    # 小さなバッチサイズ + 大きなGradient Accumulation
    per_device_train_batch_size=1,
    gradient_accumulation_steps=16,

    # bfloat16（float16よりも安定）
    bf16=True,

    # 効率的なオプティマイザ
    optim="paged_adamw_8bit",

    # Dataloader
    dataloader_pin_memory=False,
    dataloader_num_workers=0,
)
```

---

## まとめ

本ガイドで解説したポイントを整理する。

### 手法の選択指針

| 状況 | 推奨手法 |
|-----|--------|
| GPU がなく、すぐ試したい | OpenAI Fine-tuning API |
| 7B以下のモデル、コンシューマGPU | QLoRA (Unsloth) |
| 13B〜34Bモデル、A100/H100 | QLoRA (Unsloth) |
| 70B以上のモデル | QLoRA (複数GPU) |
| 最高性能が必要で予算あり | Full Fine-tuning |

### ファインチューニング成功の鍵

1. **データ品質が命**: 100件の高品質データは1,000件の低品質データに勝る
2. **小さく始める**: まず100件で動作確認、段階的にスケールアップ
3. **ベースラインを記録**: ファインチューニング前後の比較を必ず行う
4. **過学習に注意**: 訓練損失だけでなく検証損失を必ず監視する
5. **LoRAから始める**: まずLoRAで試し、性能不足なら別の手法を検討

### 次のステップ

ファインチューニングをマスターしたら、以下のトピックに進むことをお勧めする。

- **RLHF（Reinforcement Learning from Human Feedback）**: 人間のフィードバックを使った強化学習
- **DPO（Direct Preference Optimization）**: RLHFをシンプルにしたアライメント手法
- **Mergekit**: 複数のLoRAモデルをマージする技術
- **Speculative Decoding**: 推論速度を高速化するテクニック
- **vLLM**: 本番環境向けの高速推論エンジン

---

開発ツールの選定に困ったら、[DevToolBox](https://usedevtools.com) を活用してほしい。ファインチューニングの実験管理、モデル評価ツール、デプロイのCI/CDパイプラインなど、AI開発に必要なツールを一箇所で管理できる。AIモデルの開発から本番運用まで、生産性を大幅に向上させるためのツールセットが揃っている。
