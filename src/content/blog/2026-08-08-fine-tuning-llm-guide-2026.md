---
title: "LLMファインチューニング実践ガイド2026【LoRA・QLoRA・データ準備】"
description: "LLMファインチューニングを基礎から解説。LoRA・QLoRAの仕組み、学習データの準備方法、Hugging Face Transformersでの実装、評価手法、コスト最適化までPython・TypeScriptコード付きで実践的に紹介します。"
pubDate: "2026-03-14"
tags: ["AI", "LLM", "ファインチューニング", "LoRA", "機械学習"]
heroImage: '../../assets/thumbnails/ai-agent-development-2026.jpg'
---

## はじめに

LLMのファインチューニング（微調整）は「汎用モデルを特定のタスクや業界に特化させる」技術だ。プロンプトエンジニアリングやRAGで対応しきれないケースで威力を発揮する。

2026年現在、LoRA/QLoRAの普及により、消費者向けGPUでも効率的にファインチューニングが可能になった。この記事では、データ準備から学習、評価、デプロイまでを実践的に解説する。

---

## 1. ファインチューニングが必要なケース

### 1.1 判断フロー

```
タスク要件
│
├── 外部知識が必要 → RAGを使う（§ファインチューニング不要）
│
├── 出力形式を統一したい → プロンプトエンジニアリングで対応可能か？
│   ├── 対応可能 → プロンプトで解決
│   └── 対応不可（精度不足・一貫性不足） → ファインチューニング
│
├── 業界固有の用語・知識 → ファインチューニング
│
├── 応答のトーン・スタイル統一 → ファインチューニング
│
└── レイテンシ・コスト最適化 → 小モデルをファインチューニング
```

### 1.2 手法の比較

| 手法 | コスト | 精度向上 | 適用場面 |
|------|--------|---------|---------|
| **プロンプトエンジニアリング** | 低 | 中 | ほとんどのケース |
| **RAG** | 中 | 高（外部知識） | ドキュメントQA |
| **API経由ファインチューニング** | 中 | 高 | 出力形式・スタイル統一 |
| **フルファインチューニング** | 超高 | 最高 | 研究・特殊用途 |
| **LoRA/QLoRA** | 低〜中 | 高 | 実用的なカスタマイズ |

---

## 2. LoRA / QLoRA の仕組み

### 2.1 LoRA（Low-Rank Adaptation）

```
従来のファインチューニング:
  全パラメータ(7B=70億)を更新 → VRAM 28GB+ 必要

LoRA:
  元のパラメータは固定（凍結）
  低ランク行列（A, B）のみを学習

  W_original (d × d)  → 凍結
  ΔW = A × B          → Aは(d × r), Bは(r × d)
                         r=16 なら学習パラメータ ≈ 0.1% に削減

  推論時: W = W_original + α × (A × B)
  α: スケーリング係数
```

### 2.2 QLoRA（Quantized LoRA）

```
QLoRA = 4bit量子化 + LoRA

1. ベースモデルを4bit量子化（NF4） → メモリ使用量 1/4
2. 量子化されたモデルの上にLoRAアダプタを追加
3. LoRAアダプタのみをFP16で学習

結果:
  7Bモデル: VRAM 6GB で学習可能（RTX 3060で動作）
  13Bモデル: VRAM 10GB で学習可能
  70Bモデル: VRAM 48GB で学習可能（A100 1枚）
```

---

## 3. 学習データの準備

### 3.1 データ形式

```python
# data_preparation.py
import json

# 形式1: Instruction形式（最も一般的）
instruction_data = [
    {
        "instruction": "以下のPythonコードのバグを見つけて修正してください。",
        "input": "def factorial(n):\n    if n == 0:\n        return 0\n    return n * factorial(n-1)",
        "output": "バグ: `return 0` は `return 1` であるべきです。\n\n修正版:\n```python\ndef factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n-1)\n```"
    },
    {
        "instruction": "以下のSQLクエリを最適化してください。",
        "input": "SELECT * FROM users WHERE name LIKE '%田中%' ORDER BY created_at DESC",
        "output": "最適化ポイント:\n1. `SELECT *` → 必要なカラムのみ選択\n2. `LIKE '%田中%'` → 全文検索インデックス使用\n\n```sql\nSELECT id, name, email\nFROM users\nWHERE to_tsvector('japanese', name) @@ to_tsquery('japanese', '田中')\nORDER BY created_at DESC\nLIMIT 100;\n```"
    },
]

# 形式2: 会話形式（ChatML）
chat_data = [
    {
        "messages": [
            {"role": "system", "content": "あなたはセキュリティの専門家です。"},
            {"role": "user", "content": "SQLインジェクションの対策方法を教えてください。"},
            {"role": "assistant", "content": "SQLインジェクション対策には以下の方法があります:\n\n1. **パラメータバインディング**（最重要）\n2. **入力値のバリデーション**\n3. **ORM/クエリビルダーの使用**\n4. **最小権限の原則**"}
        ]
    }
]

# JSONLファイルに保存
with open("train_data.jsonl", "w", encoding="utf-8") as f:
    for item in instruction_data:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")
```

### 3.2 データ品質チェック

```python
# data_quality.py
import json
from collections import Counter

def validate_dataset(file_path: str) -> dict:
    """データセットの品質を検証"""
    stats = {
        "total": 0,
        "valid": 0,
        "issues": [],
        "avg_input_length": 0,
        "avg_output_length": 0,
        "duplicate_count": 0,
    }

    seen_instructions = set()
    input_lengths = []
    output_lengths = []

    with open(file_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            stats["total"] += 1
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                stats["issues"].append(f"行{line_num}: JSONパースエラー")
                continue

            # 必須フィールドチェック
            if "instruction" not in item:
                stats["issues"].append(f"行{line_num}: instructionフィールドがない")
                continue
            if "output" not in item:
                stats["issues"].append(f"行{line_num}: outputフィールドがない")
                continue

            # 長さチェック
            if len(item["output"]) < 10:
                stats["issues"].append(f"行{line_num}: outputが短すぎる ({len(item['output'])} 文字)")

            if len(item["instruction"]) < 5:
                stats["issues"].append(f"行{line_num}: instructionが短すぎる")

            # 重複チェック
            inst_hash = hash(item["instruction"])
            if inst_hash in seen_instructions:
                stats["duplicate_count"] += 1
            seen_instructions.add(inst_hash)

            input_lengths.append(len(item.get("input", "")))
            output_lengths.append(len(item["output"]))
            stats["valid"] += 1

    stats["avg_input_length"] = sum(input_lengths) / len(input_lengths) if input_lengths else 0
    stats["avg_output_length"] = sum(output_lengths) / len(output_lengths) if output_lengths else 0

    return stats

# 実行
report = validate_dataset("train_data.jsonl")
print(f"総データ数: {report['total']}")
print(f"有効データ: {report['valid']}")
print(f"重複: {report['duplicate_count']}")
print(f"問題: {len(report['issues'])} 件")
for issue in report["issues"][:10]:
    print(f"  - {issue}")
```

### 3.3 データ生成（合成データ）

```python
# data_generation.py
import openai
import json

client = openai.OpenAI()

def generate_training_data(
    topic: str,
    num_samples: int = 50,
    output_file: str = "synthetic_data.jsonl",
) -> None:
    """LLMを使って学習データを自動生成"""

    generation_prompt = f"""以下のトピックについて、学習データを生成してください。

トピック: {topic}

以下のJSON形式で5件生成してください:
[
  {{
    "instruction": "具体的な指示文",
    "input": "入力データ（必要な場合）",
    "output": "模範回答（200文字以上）"
  }}
]

## 品質要件
- instructionは多様性を持たせる（同じパターンの繰り返し禁止）
- outputは正確で詳細に
- 実務で使える具体的な内容にする
"""

    all_data = []
    for batch in range(num_samples // 5):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": generation_prompt}],
            temperature=0.8,
            response_format={"type": "json_object"},
        )

        try:
            batch_data = json.loads(response.choices[0].message.content)
            if isinstance(batch_data, dict) and "data" in batch_data:
                batch_data = batch_data["data"]
            elif isinstance(batch_data, list):
                pass
            else:
                batch_data = [batch_data]
            all_data.extend(batch_data)
        except (json.JSONDecodeError, KeyError):
            continue

    # 保存
    with open(output_file, "w", encoding="utf-8") as f:
        for item in all_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    print(f"{len(all_data)} 件の学習データを生成しました")

# 使用例
generate_training_data("Pythonのコードレビュー", num_samples=100)
```

---

## 4. LoRAファインチューニング実装

### 4.1 セットアップ

```bash
pip install torch transformers datasets peft accelerate bitsandbytes
pip install trl  # Transformer Reinforcement Learning
pip install wandb  # 学習ログ（任意）
```

### 4.2 QLoRAファインチューニング

```python
# finetune_qlora.py
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
from datasets import load_dataset

# 1. 量子化設定
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",           # Normal Float 4
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,       # 二重量子化でさらに圧縮
)

# 2. モデル読み込み
model_name = "meta-llama/Llama-3.1-8B-Instruct"

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)

tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

# 3. LoRA設定
lora_config = LoraConfig(
    r=16,                    # ランク（8-64、大きいほど表現力↑コスト↑）
    lora_alpha=32,           # スケーリング係数（通常 r の2倍）
    lora_dropout=0.05,       # ドロップアウト率
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=[         # LoRAを適用するレイヤー
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
)

# 4. モデル準備
model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, lora_config)

# 学習パラメータ数の確認
model.print_trainable_parameters()
# → trainable params: 13,631,488 || all params: 8,030,261,248
# → trainable%: 0.1697%

# 5. データセット準備
dataset = load_dataset("json", data_files="train_data.jsonl", split="train")

def format_instruction(sample):
    """Instruction形式をチャットテンプレートに変換"""
    if sample.get("input"):
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
あなたは優秀なプログラミングアシスタントです。<|eot_id|>
<|start_header_id|>user<|end_header_id|>
{sample['instruction']}

{sample['input']}<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
{sample['output']}<|eot_id|>"""
    else:
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
あなたは優秀なプログラミングアシスタントです。<|eot_id|>
<|start_header_id|>user<|end_header_id|>
{sample['instruction']}<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
{sample['output']}<|eot_id|>"""
    return {"text": prompt}

dataset = dataset.map(format_instruction)

# 6. 学習設定
training_args = TrainingArguments(
    output_dir="./lora-output",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,   # 実効バッチサイズ = 4 × 4 = 16
    learning_rate=2e-4,
    weight_decay=0.01,
    warmup_ratio=0.03,
    lr_scheduler_type="cosine",
    logging_steps=10,
    save_strategy="epoch",
    fp16=True,
    optim="paged_adamw_8bit",        # メモリ効率的なオプティマイザ
    max_grad_norm=0.3,
    group_by_length=True,            # 類似長さのサンプルをグループ化
    report_to="wandb",               # Weights & Biases（任意）
)

# 7. トレーナー作成・学習実行
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    args=training_args,
    tokenizer=tokenizer,
    dataset_text_field="text",
    max_seq_length=2048,
    packing=True,                    # 短いサンプルを詰めて効率化
)

# 学習開始
trainer.train()

# 8. LoRAアダプタを保存
trainer.save_model("./lora-adapter")
tokenizer.save_pretrained("./lora-adapter")

print("ファインチューニング完了！")
```

### 4.3 推論（LoRAアダプタ使用）

```python
# inference.py
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

# ベースモデル読み込み
base_model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.1-8B-Instruct",
    torch_dtype=torch.bfloat16,
    device_map="auto",
)

# LoRAアダプタを適用
model = PeftModel.from_pretrained(base_model, "./lora-adapter")

# 推論モードにマージ（速度向上）
model = model.merge_and_unload()

tokenizer = AutoTokenizer.from_pretrained("./lora-adapter")

def generate(instruction: str, input_text: str = "") -> str:
    prompt = f"""<|begin_of_text|><|start_header_id|>user<|end_header_id|>
{instruction}
{input_text}<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
"""
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=512,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
        )

    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return response.split("assistant")[-1].strip()

# テスト
answer = generate(
    "以下のコードをリファクタリングしてください。",
    "for i in range(len(lst)):\n    if lst[i] > 0:\n        result.append(lst[i])"
)
print(answer)
```

---

## 5. OpenAI API経由のファインチューニング

### 5.1 データ準備

```python
# openai_finetune.py
import openai
import json

client = openai.OpenAI()

# 学習データをOpenAI形式に変換
training_data = [
    {
        "messages": [
            {"role": "system", "content": "あなたは技術文書のレビュアーです。"},
            {"role": "user", "content": "以下のREADMEをレビューしてください。\n\n# My Project\nこれはプロジェクトです。"},
            {"role": "assistant", "content": "## レビュー結果\n\n### 改善点\n1. **プロジェクト概要が不十分** - 目的、技術スタック、使い方を追加\n2. **インストール手順がない** - セットアップ手順を追加\n3. **ライセンス表記がない** - ライセンスセクションを追加\n\n### 修正例\n```markdown\n# My Project\n\n○○を実現するプロジェクトです。\n\n## セットアップ\n...\n```"}
        ]
    }
]

# JSONLファイルに保存
with open("openai_train.jsonl", "w", encoding="utf-8") as f:
    for item in training_data:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")
```

### 5.2 ファインチューニング実行

```python
# ファイルアップロード
file = client.files.create(
    file=open("openai_train.jsonl", "rb"),
    purpose="fine-tune",
)
print(f"ファイルID: {file.id}")

# ファインチューニングジョブ作成
job = client.fine_tuning.jobs.create(
    training_file=file.id,
    model="gpt-4o-mini-2024-07-18",
    hyperparameters={
        "n_epochs": 3,
        "batch_size": "auto",
        "learning_rate_multiplier": "auto",
    },
    suffix="tech-reviewer",  # モデル名のサフィックス
)
print(f"ジョブID: {job.id}")

# 進捗確認
import time
while True:
    status = client.fine_tuning.jobs.retrieve(job.id)
    print(f"ステータス: {status.status}")
    if status.status in ("succeeded", "failed"):
        break
    time.sleep(60)

# 完成したモデルで推論
if status.status == "succeeded":
    fine_tuned_model = status.fine_tuned_model
    print(f"モデル名: {fine_tuned_model}")

    response = client.chat.completions.create(
        model=fine_tuned_model,
        messages=[
            {"role": "system", "content": "あなたは技術文書のレビュアーです。"},
            {"role": "user", "content": "以下のREADMEをレビューしてください。\n\n# API Server\nFastAPIで作ったAPIです。"},
        ],
    )
    print(response.choices[0].message.content)
```

### 5.3 TypeScript版

```typescript
// openai-finetune.ts
import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI();

async function startFineTuning() {
  // ファイルアップロード
  const file = await client.files.create({
    file: fs.createReadStream('openai_train.jsonl'),
    purpose: 'fine-tune',
  });

  // ジョブ作成
  const job = await client.fineTuning.jobs.create({
    training_file: file.id,
    model: 'gpt-4o-mini-2024-07-18',
    hyperparameters: { n_epochs: 3 },
    suffix: 'tech-reviewer',
  });

  console.log(`ジョブID: ${job.id}`);

  // 完了待機
  let status = await client.fineTuning.jobs.retrieve(job.id);
  while (status.status !== 'succeeded' && status.status !== 'failed') {
    await new Promise((r) => setTimeout(r, 60000));
    status = await client.fineTuning.jobs.retrieve(job.id);
    console.log(`ステータス: ${status.status}`);
  }

  if (status.fine_tuned_model) {
    console.log(`完成モデル: ${status.fine_tuned_model}`);
  }
}

startFineTuning();
```

---

## 6. 評価

### 6.1 定量評価

```python
# evaluation.py
import json
from rouge_score import rouge_scorer
from nltk.translate.bleu_score import sentence_bleu

def evaluate_model(model, tokenizer, test_data: list[dict]) -> dict:
    """ファインチューニング済みモデルを評価"""
    scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=False)

    results = {
        "total": len(test_data),
        "rouge1_avg": 0,
        "rouge2_avg": 0,
        "rougeL_avg": 0,
        "exact_match": 0,
    }

    for item in test_data:
        # モデル出力を生成
        predicted = generate(item["instruction"], item.get("input", ""))
        expected = item["output"]

        # ROUGE スコア
        scores = scorer.score(expected, predicted)
        results["rouge1_avg"] += scores["rouge1"].fmeasure
        results["rouge2_avg"] += scores["rouge2"].fmeasure
        results["rougeL_avg"] += scores["rougeL"].fmeasure

        # 完全一致
        if predicted.strip() == expected.strip():
            results["exact_match"] += 1

    n = results["total"]
    results["rouge1_avg"] /= n
    results["rouge2_avg"] /= n
    results["rougeL_avg"] /= n
    results["exact_match_rate"] = results["exact_match"] / n

    return results
```

### 6.2 LLMによる評価（LLM-as-Judge）

```python
# llm_judge.py
import openai

client = openai.OpenAI()

def llm_evaluate(instruction: str, baseline_output: str, finetuned_output: str) -> dict:
    """GPT-4oでファインチューニング結果を評価"""
    eval_prompt = f"""以下の2つの回答を比較評価してください。

## 指示
{instruction}

## 回答A（ベースモデル）
{baseline_output}

## 回答B（ファインチューニング済み）
{finetuned_output}

## 評価基準
1. 正確性 (1-10)
2. 有用性 (1-10)
3. 一貫性 (1-10)
4. フォーマット遵守 (1-10)

JSON形式で出力:
{{"accuracy": X, "usefulness": X, "consistency": X, "format": X, "winner": "A" or "B", "reasoning": "..."}}
"""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": eval_prompt}],
        temperature=0,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)
```

---

## 7. LoRAハイパーパラメータチューニング

### 7.1 主要パラメータの影響

| パラメータ | 範囲 | 効果 |
|-----------|------|------|
| **r（ランク）** | 4-128 | 大きい→表現力↑メモリ↑。通常16-32 |
| **lora_alpha** | r〜4r | 学習率の実効スケーリング。通常2r |
| **lora_dropout** | 0-0.2 | 過学習防止。通常0.05-0.1 |
| **target_modules** | - | 多い→精度↑コスト↑。最低限q/v_proj |
| **learning_rate** | 1e-5〜5e-4 | QLoRAは2e-4前後が多い |
| **epochs** | 1-5 | 多すぎると過学習 |
| **batch_size** | 2-32 | 大きい→安定、メモリ要件↑ |

### 7.2 探索スクリプト

```python
# hyperparameter_search.py
import itertools

configs = {
    "r": [8, 16, 32],
    "lora_alpha": [16, 32, 64],
    "learning_rate": [1e-4, 2e-4, 5e-4],
    "epochs": [2, 3, 5],
}

best_score = 0
best_config = None

for r, alpha, lr, epochs in itertools.product(
    configs["r"],
    configs["lora_alpha"],
    configs["learning_rate"],
    configs["epochs"],
):
    print(f"\n--- r={r}, alpha={alpha}, lr={lr}, epochs={epochs} ---")

    # 学習実行（省略: 上記のtrain関数を呼ぶ）
    # score = train_and_evaluate(r=r, alpha=alpha, lr=lr, epochs=epochs)

    # if score > best_score:
    #     best_score = score
    #     best_config = {"r": r, "alpha": alpha, "lr": lr, "epochs": epochs}

# print(f"\n最良構成: {best_config} (スコア: {best_score})")
```

---

## 8. デプロイと運用

### 8.1 Ollamaへのデプロイ

```bash
# LoRAアダプタをマージしたGGUFモデルを作成
python -c "
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

base = AutoModelForCausalLM.from_pretrained('meta-llama/Llama-3.1-8B-Instruct')
model = PeftModel.from_pretrained(base, './lora-adapter')
merged = model.merge_and_unload()
merged.save_pretrained('./merged-model')
"

# GGUFに変換（llama.cpp）
python llama.cpp/convert_hf_to_gguf.py \
  ./merged-model \
  --outfile ./my-finetuned.gguf \
  --outtype q4_k_m

# Ollamaにインポート
cat > Modelfile << EOF
FROM ./my-finetuned.gguf
SYSTEM "あなたは技術文書のレビュアーです。"
PARAMETER temperature 0.3
EOF

ollama create my-reviewer -f Modelfile
ollama run my-reviewer
```

### 8.2 vLLMによる高速推論サーバー

```python
# 起動コマンド
# vllm serve meta-llama/Llama-3.1-8B-Instruct \
#   --enable-lora \
#   --lora-modules reviewer=./lora-adapter \
#   --max-loras 4 \
#   --port 8000
```

---

## 9. コスト比較

| 手法 | 必要GPU | 学習時間(1000件) | 月額運用コスト |
|------|---------|----------------|--------------|
| OpenAI API FT | 不要 | 〜30分 | $0（推論のみ課金） |
| QLoRA 7B | RTX 3060 (12GB) | 〜2時間 | ¥0（ローカル） |
| QLoRA 13B | RTX 3070 (8GB) | 〜4時間 | ¥0（ローカル） |
| フルFT 7B | A100 (80GB) | 〜8時間 | $2-4/時（クラウドGPU） |

---

## 10. まとめ

1. **まずRAG/プロンプトを試す** ── ファインチューニングが本当に必要か確認する
2. **データ品質が最重要** ── 100件の高品質データ > 10,000件の低品質データ
3. **QLoRAで始める** ── 消費者GPUで学習可能、精度もフルFTに迫る
4. **継続的に評価** ── ベースモデルとの比較、LLM-as-Judgeで定量評価

---

## 関連記事

- [LLM APIアプリ開発入門2026](/blog/2026-08-01-llm-api-development-guide-2026)
- [ローカルLLM環境構築ガイド](/blog/2026-08-05-local-llm-setup-guide-2026)
- [AI/LLMアプリのテスト・評価手法](/blog/2026-08-09-ai-testing-evaluation-2026)
- [プロンプトエンジニアリング実践ガイド](/blog/2026-08-04-prompt-engineering-advanced-2026)

---

## FAQ

### Q. 学習データは何件必要？

A. タスクにより異なるが、最低50-100件の高品質データから始めるのがよい。OpenAIの推奨は最低10件、推奨50-100件。独自タスクに特化するなら500-1000件が目安。

### Q. 過学習の兆候は？

A. 学習損失が下がっているのに評価損失が上がる、出力が学習データの丸暗記になる、未知の入力への汎化性能が低下する。対策はエポック数を減らす、LoRAのランクを下げる、ドロップアウトを上げる。

### Q. ファインチューニングしたモデルを商用利用できる？

A. ベースモデルのライセンスに依存する。Llama 3.1は商用利用可（Meta License）。Mistralモデルも多くが商用可。OpenAI APIでファインチューニングしたモデルは利用規約に従う。必ずライセンスを確認すること。
