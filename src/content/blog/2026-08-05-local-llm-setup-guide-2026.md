---
title: "ローカルLLM環境構築ガイド2026【Ollama・llama.cpp・GPU活用】"
description: "ローカルLLMの環境構築を完全解説。Ollama・llama.cppの導入、Llama 3.1・Gemma 2・Phi-3モデル比較、GPU/CPU最適化、量子化、APIサーバー構築までTypeScript・Pythonコード付きで紹介します。"
pubDate: "2026-08-05"
tags: ["AI", "LLM", "Ollama", "ローカルAI", "GPU"]
heroImage: '../../assets/thumbnails/2026-04-14-engineer-portfolio-creation-guide-2026.jpg'
---

## はじめに

クラウドLLM APIは便利だが、データプライバシー、レイテンシ、コスト、オフライン利用の観点から **ローカルLLM** の需要が急増している。2026年現在、高品質なオープンソースモデルが数多く公開され、消費者向けGPUでも実用的な推論が可能になった。

この記事では、ローカルLLM環境の構築方法を、初心者でも迷わないステップバイステップで解説する。

---

## 1. ローカルLLMの選択肢

### 1.1 ツール比較

| ツール | 特徴 | 難易度 | GPU必須 | 対応OS |
|--------|------|--------|---------|--------|
| **Ollama** | 最も簡単。ワンコマンド起動 | 低 | 不要（推奨） | Mac/Linux/Windows |
| **llama.cpp** | 最もカスタマイズ性が高い | 中 | 不要 | 全OS |
| **vLLM** | 高スループット推論サーバー | 高 | 必須（NVIDIA） | Linux |
| **text-generation-webui** | WebUI付きオールインワン | 中 | 推奨 | 全OS |
| **LM Studio** | GUIアプリ。初心者向け | 低 | 不要 | Mac/Windows |

### 1.2 推奨ハードウェア

```
┌─────────────────────────────────────────────────┐
│              ハードウェア推奨スペック             │
├───────────┬──────────────┬───────────────────────┤
│ モデルサイズ │ VRAM / RAM    │ 推奨GPU              │
├───────────┼──────────────┼───────────────────────┤
│ 7B (Q4)   │ 4-6 GB       │ RTX 3060 / M1 8GB    │
│ 13B (Q4)  │ 8-10 GB      │ RTX 3070 / M1 16GB   │
│ 34B (Q4)  │ 20-24 GB     │ RTX 4090 / M2 32GB   │
│ 70B (Q4)  │ 40-48 GB     │ A100 / M2 Ultra 64GB │
└───────────┴──────────────┴───────────────────────┘
※ Q4 = 4bit量子化。元のFP16モデルより大幅に軽い
```

---

## 2. Ollama セットアップ（最推奨）

### 2.1 インストール

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS (Homebrew)
brew install ollama

# Windows
# https://ollama.com/download からインストーラーをダウンロード

# バージョン確認
ollama --version
```

### 2.2 モデルのダウンロードと実行

```bash
# 主要モデルのダウンロード
ollama pull llama3.1:8b          # Meta Llama 3.1 8B（汎用、日本語対応改善）
ollama pull llama3.1:70b         # Meta Llama 3.1 70B（高性能、要高スペック）
ollama pull gemma2:9b            # Google Gemma 2 9B（コンパクト高性能）
ollama pull phi3:14b             # Microsoft Phi-3 14B（推論特化）
ollama pull codestral:22b        # Mistral Codestral（コード特化）
ollama pull qwen2.5:7b           # Alibaba Qwen 2.5（日本語優秀）

# モデル一覧
ollama list

# 対話型チャット
ollama run llama3.1:8b

# ワンショット実行
echo "Pythonのリスト内包表記を説明してください" | ollama run llama3.1:8b

# モデルの削除
ollama rm gemma2:9b
```

### 2.3 Ollama APIサーバー

Ollamaは起動するとローカルAPIサーバーが立ち上がる（デフォルト: `http://localhost:11434`）。

```bash
# サーバー起動（バックグラウンド）
ollama serve &

# ヘルスチェック
curl http://localhost:11434/api/tags
```

```typescript
// ollama-api.ts
// Ollama API（OpenAI互換）を使ったTypeScript実装

import OpenAI from 'openai';

// Ollama は OpenAI互換APIを提供
const ollama = new OpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama', // ダミー（認証不要）
});

async function chatLocal(message: string, model = 'llama3.1:8b'): Promise<string> {
  const response = await ollama.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'あなたは親切なアシスタントです。日本語で簡潔に回答してください。',
      },
      {
        role: 'user',
        content: message,
      },
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content ?? '';
}

// ストリーミング
async function streamLocal(message: string): Promise<void> {
  const stream = await ollama.chat.completions.create({
    model: 'llama3.1:8b',
    messages: [{ role: 'user', content: message }],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) process.stdout.write(content);
  }
  console.log();
}

// 使用例
const answer = await chatLocal('TypeScriptのジェネリクスについて教えてください');
console.log(answer);
```

```python
# ollama_api.py
import requests
import json

def chat_ollama(message: str, model: str = "llama3.1:8b") -> str:
    """Ollama APIで推論を実行"""
    response = requests.post(
        "http://localhost:11434/api/chat",
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": "日本語で簡潔に回答してください。"},
                {"role": "user", "content": message},
            ],
            "stream": False,
        },
    )
    return response.json()["message"]["content"]

def stream_ollama(message: str, model: str = "llama3.1:8b"):
    """ストリーミングで推論"""
    response = requests.post(
        "http://localhost:11434/api/chat",
        json={
            "model": model,
            "messages": [{"role": "user", "content": message}],
            "stream": True,
        },
        stream=True,
    )
    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            if not data.get("done"):
                print(data["message"]["content"], end="", flush=True)
    print()

# Embeddingも可能
def get_embedding(text: str, model: str = "llama3.1:8b") -> list[float]:
    """テキストのEmbeddingを取得"""
    response = requests.post(
        "http://localhost:11434/api/embeddings",
        json={"model": model, "prompt": text},
    )
    return response.json()["embedding"]
```

### 2.4 カスタムモデル（Modelfile）

```dockerfile
# Modelfile
FROM llama3.1:8b

# システムプロンプトを固定
SYSTEM """あなたは日本語のテクニカルライターです。
技術文書を正確かつ読みやすく執筆します。
専門用語には必ず補足説明を加えてください。"""

# パラメータ調整
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 8192
PARAMETER stop "<|end|>"
```

```bash
# カスタムモデルの作成
ollama create tech-writer -f Modelfile

# カスタムモデルの実行
ollama run tech-writer "RESTful APIの設計原則を解説してください"
```

---

## 3. llama.cpp セットアップ（高度なカスタマイズ）

### 3.1 ビルド

```bash
# リポジトリクローン
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp

# macOS（Metal GPU加速）
make LLAMA_METAL=1

# Linux（CUDA GPU加速）
make LLAMA_CUDA=1

# CPU のみ
make

# CMake（推奨）
mkdir build && cd build
cmake .. -DLLAMA_METAL=ON  # or -DLLAMA_CUDA=ON
cmake --build . --config Release -j $(nproc)
```

### 3.2 モデルの取得と変換

```bash
# Hugging Faceからモデルをダウンロード
pip install huggingface-hub

# GGUF形式のモデルを直接ダウンロード（推奨）
huggingface-cli download \
  TheBloke/Llama-2-7B-GGUF \
  llama-2-7b.Q4_K_M.gguf \
  --local-dir ./models

# safetensorsからGGUFに変換する場合
python convert_hf_to_gguf.py \
  ./models/llama-3.1-8b/ \
  --outfile ./models/llama-3.1-8b.gguf \
  --outtype q4_k_m
```

### 3.3 推論実行

```bash
# 対話モード
./llama-cli \
  -m models/llama-3.1-8b-q4_k_m.gguf \
  -c 4096 \
  -n 512 \
  --interactive \
  --color \
  -ngl 99  # GPUレイヤー数（Metalの場合全レイヤー）

# APIサーバーモード（OpenAI互換）
./llama-server \
  -m models/llama-3.1-8b-q4_k_m.gguf \
  -c 4096 \
  --host 0.0.0.0 \
  --port 8080 \
  -ngl 99
```

### 3.4 量子化の選び方

```
量子化レベルの比較:
│
├── Q2_K (2bit) — 最小サイズ、品質は最低
│   └── 用途: ストレージ極小の環境
│
├── Q4_K_M (4bit) ← 推奨バランス
│   ├── サイズ: 元の約25%
│   ├── 品質: FP16の95%程度を維持
│   └── 用途: 一般的な開発・テスト
│
├── Q5_K_M (5bit) — 品質重視
│   ├── サイズ: 元の約30%
│   └── 用途: 品質をあまり落としたくない場合
│
├── Q8_0 (8bit) — ほぼ無劣化
│   ├── サイズ: 元の約50%
│   └── 用途: VRAM/RAMに余裕がある場合
│
└── FP16 — 元の品質
    ├── サイズ: 100%
    └── 用途: 評価・ベンチマーク
```

---

## 4. ローカルLLMモデル比較

### 4.1 主要モデル一覧（2026年8月時点）

| モデル | サイズ | 日本語 | コード | 推論 | ライセンス |
|--------|--------|--------|--------|------|-----------|
| Llama 3.1 8B | 4.7GB (Q4) | ○ | ◎ | ◎ | Meta (商用可) |
| Llama 3.1 70B | 40GB (Q4) | ◎ | ◎ | ◎ | Meta (商用可) |
| Gemma 2 9B | 5.4GB (Q4) | ○ | ○ | ◎ | Google (商用可) |
| Phi-3 14B | 8.2GB (Q4) | △ | ◎ | ◎ | Microsoft (MIT) |
| Qwen 2.5 7B | 4.4GB (Q4) | ◎ | ○ | ○ | Apache 2.0 |
| Codestral 22B | 13GB (Q4) | △ | ◎◎ | ○ | Mistral (非商用) |
| Mistral Nemo 12B | 7GB (Q4) | ○ | ○ | ◎ | Apache 2.0 |
| DeepSeek Coder V2 | 9GB (Q4) | △ | ◎◎ | ○ | MIT |

### 4.2 用途別おすすめ

```
ユースケース
│
├── 日本語チャット → Qwen 2.5 7B / Llama 3.1 8B
│
├── コード生成 → Codestral 22B / DeepSeek Coder V2
│
├── 汎用（バランス） → Llama 3.1 8B（GPU 8GB以上）
│                     → Gemma 2 9B（より軽量）
│
├── 高精度が必要 → Llama 3.1 70B（GPU 48GB以上）
│
└── 最小リソース → Phi-3 3.8B / Gemma 2 2B
```

---

## 5. ローカルLLMをアプリに統合

### 5.1 LangChainとの統合

```python
# langchain_ollama.py
from langchain_community.llms import Ollama
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Chat Model
chat = ChatOllama(
    model="llama3.1:8b",
    temperature=0.3,
    num_ctx=4096,    # コンテキスト長
    num_gpu=99,      # GPU使用レイヤー数
)

# プロンプトテンプレート
prompt = ChatPromptTemplate.from_messages([
    ("system", "あなたはPythonの専門家です。"),
    ("human", "{question}"),
])

# チェーン
chain = prompt | chat | StrOutputParser()

answer = chain.invoke({"question": "async/awaitの仕組みを説明してください"})
print(answer)
```

### 5.2 RAGとの組み合わせ

```python
# local_rag.py
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.chat_models import ChatOllama

# ローカルEmbedding（APIコストゼロ）
embeddings = OllamaEmbeddings(
    model="llama3.1:8b",
)

# ベクトルストア作成
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./local_chroma",
)

# ローカルLLMでRAG
chat = ChatOllama(model="llama3.1:8b", temperature=0)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# 完全ローカルのRAGパイプライン（APIコストゼロ）
from langchain_core.runnables import RunnablePassthrough

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | chat
    | StrOutputParser()
)

answer = rag_chain.invoke("社内のセキュリティポリシーについて教えて")
print(answer)
```

### 5.3 Next.js APIルートとの統合

```typescript
// app/api/local-chat/route.ts
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  // Ollama API にフォワード（ストリーミング）
  const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b',
      messages: [
        { role: 'system', content: '日本語で簡潔に回答してください。' },
        { role: 'user', content: message },
      ],
      stream: true,
    }),
  });

  // Server-Sent Events でクライアントにストリーム
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = ollamaResponse.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: data.message.content })}\n\n`)
              );
            }
          } catch {
            // パースエラーは無視
          }
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

---

## 6. パフォーマンス最適化

### 6.1 GPU最適化

```bash
# NVIDIA GPU — CUDA設定
nvidia-smi  # GPU確認

# Ollama GPU設定
export OLLAMA_GPU_LAYERS=99     # 全レイヤーをGPUに
export OLLAMA_NUM_PARALLEL=2    # 並列リクエスト数

# llama.cpp GPU設定
./llama-cli \
  -m model.gguf \
  -ngl 99 \           # GPU レイヤー数
  --mlock \            # メモリロック（スワップ防止）
  -t 8                 # CPUスレッド数
```

### 6.2 Apple Silicon (Metal) 最適化

```bash
# macOS Metal 確認
system_profiler SPDisplaysDataType | grep Metal

# Ollama は自動でMetal加速を使用
# 確認方法
ollama run llama3.1:8b --verbose
# → "metal" が表示されればOK

# llama.cpp Metal
./llama-cli -m model.gguf -ngl 99
# Metal使用時はngl=99で全レイヤーGPU実行
```

### 6.3 ベンチマーク

```python
# benchmark.py
import time
import statistics

def benchmark_model(model: str, prompts: list[str], n_runs: int = 3) -> dict:
    """モデルのレイテンシをベンチマーク"""
    import requests

    latencies = []
    tokens_per_sec = []

    for prompt in prompts:
        for _ in range(n_runs):
            start = time.time()
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": 256},
                },
            )
            elapsed = time.time() - start
            data = response.json()

            latencies.append(elapsed)
            eval_count = data.get("eval_count", 0)
            eval_duration = data.get("eval_duration", 1) / 1e9  # ナノ秒→秒
            if eval_duration > 0:
                tokens_per_sec.append(eval_count / eval_duration)

    return {
        "model": model,
        "avg_latency_s": statistics.mean(latencies),
        "p95_latency_s": sorted(latencies)[int(len(latencies) * 0.95)],
        "avg_tokens_per_sec": statistics.mean(tokens_per_sec) if tokens_per_sec else 0,
        "total_runs": len(latencies),
    }

# ベンチマーク実行
test_prompts = [
    "Pythonでフィボナッチ数列を生成する関数を書いてください",
    "RESTful APIの設計原則を5つ挙げてください",
    "Dockerfileのベストプラクティスを教えてください",
]

for model in ["llama3.1:8b", "gemma2:9b", "qwen2.5:7b"]:
    result = benchmark_model(model, test_prompts)
    print(f"\n{result['model']}:")
    print(f"  平均レイテンシ: {result['avg_latency_s']:.2f}s")
    print(f"  平均トークン/秒: {result['avg_tokens_per_sec']:.1f}")
```

---

## 7. セキュリティとプライバシー

### 7.1 ネットワーク隔離

```bash
# Ollama をローカルホストのみにバインド
OLLAMA_HOST=127.0.0.1:11434 ollama serve

# llama.cpp サーバー
./llama-server -m model.gguf --host 127.0.0.1 --port 8080

# ファイアウォール設定（Linux）
sudo ufw deny 11434
sudo ufw deny 8080
```

### 7.2 Docker で隔離

```dockerfile
# Dockerfile
FROM ollama/ollama:latest

# モデルを事前にダウンロード
RUN ollama pull llama3.1:8b

EXPOSE 11434
CMD ["ollama", "serve"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "127.0.0.1:11434:11434"  # ローカルのみ
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  ollama_data:
```

---

## 8. クラウドAPIとの使い分け

| 観点 | ローカルLLM | クラウドAPI |
|------|-----------|-----------|
| **コスト** | 初期HW投資のみ、ランニング0円 | 従量課金 |
| **プライバシー** | データがローカルに留まる | データがクラウドに送信される |
| **レイテンシ** | ネットワーク遅延なし | ネットワーク依存 |
| **品質** | GPT-4oには劣る（70B除く） | 最高品質 |
| **スケーラビリティ** | ハードウェアに依存 | 無制限にスケール |
| **可用性** | 電源・HW故障リスク | 99.9%+ SLA |

### 8.1 ハイブリッド構成（推奨）

```typescript
// hybrid-llm.ts

type TaskComplexity = 'simple' | 'moderate' | 'complex';

async function routeToLLM(
  message: string,
  complexity: TaskComplexity
): Promise<string> {
  switch (complexity) {
    case 'simple':
      // 簡単なタスク → ローカル（コスト0）
      return await callOllama(message, 'llama3.1:8b');

    case 'moderate':
      // 中程度 → ローカル大モデル
      return await callOllama(message, 'llama3.1:70b');

    case 'complex':
      // 複雑 → クラウドAPI
      return await callOpenAI(message, 'gpt-4o');
  }
}

// 自動分類
async function classifyComplexity(message: string): Promise<TaskComplexity> {
  // ローカルモデルでタスク複雑度を分類（コスト0）
  const response = await callOllama(
    `以下のタスクの複雑度を simple/moderate/complex で分類してください。分類のみ出力。\n\n${message}`,
    'llama3.1:8b'
  );
  return response.trim().toLowerCase() as TaskComplexity;
}
```

---

## 9. トラブルシューティング

| 問題 | 原因 | 解決策 |
|------|------|--------|
| モデルが遅い | GPU未使用 | `ollama run --verbose`でGPU確認、`-ngl 99`設定 |
| メモリ不足 | モデルが大きすぎる | Q4_K_Mなど小さい量子化に変更 |
| 日本語が崩れる | モデルの日本語能力不足 | Qwen 2.5やLlama 3.1に変更 |
| Ollama起動しない | ポート競合 | `lsof -i :11434`で確認、プロセスをkill |
| Metal使われない | macOS設定 | XcodeのCommand Line Toolsインストール |

---

## 10. まとめ

ローカルLLMの実用化は2026年に大きく前進した。

1. **始めるならOllama** ── ワンコマンドで起動、OpenAI互換API
2. **まずはLlama 3.1 8B** ── バランスの良いモデルで始め、必要に応じて大きくする
3. **GPU活用でスループット10倍** ── Apple SiliconのMetalも十分実用的
4. **ハイブリッド構成** ── ローカルとクラウドの使い分けがコスト最適

---

## 関連記事

- [LLM APIアプリ開発入門2026](/blog/2026-08-01-llm-api-development-guide-2026)
- [RAG実装完全ガイド2026](/blog/2026-08-02-rag-implementation-guide-2026)
- [ベクトルデータベース比較2026](/blog/2026-08-07-vector-database-comparison-2026)
- [LLMファインチューニング実践ガイド](/blog/2026-08-08-fine-tuning-llm-guide-2026)

---

## FAQ

### Q. ローカルLLMの品質はクラウドAPIに追いつく？

A. 7-8Bモデルは単純なタスク（要約、分類、コード補完）でGPT-4oに迫る。70Bモデルは多くのタスクでGPT-4oと同等。ただし複雑な推論や最新知識が必要なタスクではクラウドAPIが優位。

### Q. M1/M2 Macで十分動く？

A. M1 8GBで7Bモデルが快適に動作する（15-25 tokens/sec）。M2 Pro 16GBなら13Bモデルも実用的。M2 Ultra 64GBなら70Bモデルも可能。

### Q. Windowsで使うには？

A. OllamaのWindows版が最も簡単。NVIDIA GPUがあれば自動でCUDAを使用する。WSL2経由でLinux版を使う方法もある。
