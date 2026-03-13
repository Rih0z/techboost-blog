---
title: "ローカルLLM開発環境構築完全ガイド - Ollama, llama.cpp, LM Studio徹底比較"
description: "ローカルでLLMを動かす環境を構築する完全ガイド。Ollama、llama.cpp、LM Studioの比較から、モデル選択、API統合、RAG実装まで実践的に解説します。"
pubDate: "2025-02-05"
tags: ["LLM", "Ollama", "llama.cpp", "AI", "Local Development", "プログラミング"]
heroImage: '../../assets/thumbnails/llm-local-development.jpg'
---
## はじめに

2026年現在、ローカル環境でLLM（大規模言語モデル）を実行することが一般的になりました。プライバシー保護、コスト削減、オフライン動作など、多くのメリットがあります。

### なぜローカルLLMなのか

```
メリット:
✅ データがローカルに残る（プライバシー保護）
✅ API料金不要（ランニングコストゼロ）
✅ オフラインで動作
✅ カスタマイズ自由
✅ レスポンス速度の最適化可能

デメリット:
❌ 初期セットアップが必要
❌ GPUメモリが必要（大規模モデル）
❌ 最新の巨大モデルは動かせない
```

### 主要なツール比較

| ツール | 難易度 | 速度 | UI | API | おすすめ用途 |
|---|---|---|---|---|---|
| **Ollama** | 低 | 速い | CLI | ○ | 開発者向け |
| **LM Studio** | 最低 | 速い | GUI | ○ | 初心者向け |
| **llama.cpp** | 高 | 最速 | CLI | △ | 上級者向け |
| **GPT4All** | 低 | 普通 | GUI | × | 一般ユーザー向け |

## Ollama - 最もシンプルな選択肢

### インストール

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# https://ollama.com/download からインストーラーをダウンロード
```

### 基本的な使い方

```bash
# モデルのダウンロードと実行
ollama run llama3.2

# チャット開始
>>> Hello!
Hi! How can I help you today?

>>> /bye
```

### 利用可能なモデル

```bash
# 人気モデル一覧
ollama list

# モデル検索
ollama search llama

# おすすめモデル
ollama pull llama3.2           # Meta Llama 3.2 (3B)
ollama pull llama3.2:70b       # Llama 3.2 70B（高性能）
ollama pull mistral            # Mistral 7B
ollama pull codellama          # Code Llama（コード特化）
ollama pull gemma2             # Google Gemma 2
ollama pull qwen2.5            # Alibaba Qwen 2.5
ollama pull phi3               # Microsoft Phi-3（軽量）
```

### モデルサイズの選択

```
小規模（3-7B）: メモリ8GB以上
  - llama3.2 (3B): 2GB VRAM
  - mistral (7B): 4GB VRAM
  - phi3 (3.8B): 2.3GB VRAM

中規模（13-34B）: メモリ16GB以上
  - llama3.2:13b: 7GB VRAM
  - codellama:34b: 20GB VRAM

大規模（70B以上）: メモリ48GB以上
  - llama3.2:70b: 40GB VRAM
  - 量子化版推奨
```

### API統合

```javascript
// Node.js
import fetch from 'node-fetch';

async function chat(prompt) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      prompt: prompt,
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response;
}

// 使用例
const answer = await chat('Explain quantum computing');
console.log(answer);
```

```python
# Python
import requests

def chat(prompt: str) -> str:
    response = requests.post(
        'http://localhost:11434/api/generate',
        json={
            'model': 'llama3.2',
            'prompt': prompt,
            'stream': False,
        }
    )
    return response.json()['response']

# 使用例
answer = chat('Explain quantum computing')
print(answer)
```

### ストリーミング対応

```typescript
// TypeScript
async function* chatStream(prompt: string) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      prompt: prompt,
      stream: true,
    }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(Boolean);

    for (const line of lines) {
      const data = JSON.parse(line);
      if (data.response) {
        yield data.response;
      }
    }
  }
}

// 使用例
for await (const chunk of chatStream('Write a story')) {
  process.stdout.write(chunk);
}
```

### Modelfile - カスタムモデル

```dockerfile
# Modelfile
FROM llama3.2

# システムプロンプト
SYSTEM """
You are a helpful assistant specialized in TypeScript development.
Always provide code examples and explain best practices.
"""

# パラメータ
PARAMETER temperature 0.8
PARAMETER top_p 0.9
PARAMETER top_k 40

# テンプレート
TEMPLATE """
{{ if .System }}System: {{ .System }}{{ end }}
User: {{ .Prompt }}
Assistant:
"""
```

```bash
# カスタムモデル作成
ollama create typescript-expert -f Modelfile

# 使用
ollama run typescript-expert
```

### マルチモーダル対応

```bash
# 画像認識モデル
ollama pull llava

# 画像を読み込んで質問
ollama run llava "What's in this image?" --image photo.jpg
```

```javascript
// API経由
const fs = require('fs');

async function analyzeImage(imagePath, question) {
  const imageBase64 = fs.readFileSync(imagePath).toString('base64');

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llava',
      prompt: question,
      images: [imageBase64],
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response;
}

const answer = await analyzeImage('photo.jpg', 'What objects are in this image?');
console.log(answer);
```

## llama.cpp - 最高のパフォーマンス

### ビルドとインストール

```bash
# macOS/Linux
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make

# GPUサポート（CUDA）
make LLAMA_CUDA=1

# GPUサポート（Metal - macOS）
make LLAMA_METAL=1

# GPUサポート（ROCm - AMD）
make LLAMA_HIPBLAS=1
```

### モデルのダウンロード

```bash
# Hugging Faceからダウンロード
# 例: Llama 3.2 3B
wget https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct-GGUF/resolve/main/llama-3.2-3b-instruct-q4_k_m.gguf

# 保存先
mkdir -p models
mv llama-3.2-3b-instruct-q4_k_m.gguf models/
```

### 実行

```bash
# 基本実行
./llama-cli \
  -m models/llama-3.2-3b-instruct-q4_k_m.gguf \
  -p "Explain quantum computing" \
  -n 512

# インタラクティブモード
./llama-cli \
  -m models/llama-3.2-3b-instruct-q4_k_m.gguf \
  --interactive

# GPUレイヤー数指定（高速化）
./llama-cli \
  -m models/llama-3.2-3b-instruct-q4_k_m.gguf \
  -ngl 32 \
  -p "Hello"
```

### サーバーモード

```bash
# APIサーバー起動
./llama-server \
  -m models/llama-3.2-3b-instruct-q4_k_m.gguf \
  -ngl 32 \
  --host 0.0.0.0 \
  --port 8080

# テスト
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.2-3b",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### パラメータチューニング

```bash
# 温度（ランダム性）
-temp 0.8

# Top-P（確率分布）
--top-p 0.9

# Top-K（候補数）
--top-k 40

# コンテキスト長
-c 4096

# バッチサイズ
-b 512

# スレッド数
-t 8

# 実例
./llama-cli \
  -m models/llama-3.2-3b-instruct-q4_k_m.gguf \
  -ngl 32 \
  -temp 0.7 \
  --top-p 0.9 \
  --top-k 40 \
  -c 8192 \
  -t 8 \
  -p "Write a story"
```

## LM Studio - 初心者に最適

### インストール

1. https://lmstudio.ai/ からダウンロード
2. インストーラー実行
3. 起動してモデル検索

### GUI操作

```
1. 左サイドバーで「Search」
2. モデル名入力（例: llama-3.2）
3. ダウンロードボタンクリック
4. 「Chat」タブで会話開始
```

### ローカルサーバー起動

```
1. 「Local Server」タブ
2. モデル選択
3. 「Start Server」
4. http://localhost:1234 で起動
```

### OpenAI互換API

```typescript
// LM StudioはOpenAI APIと互換性あり
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:1234/v1',
  apiKey: 'not-needed',
});

async function chat(prompt: string) {
  const completion = await client.chat.completions.create({
    model: 'local-model',
    messages: [{ role: 'user', content: prompt }],
  });

  return completion.choices[0].message.content;
}

const answer = await chat('Explain TypeScript generics');
console.log(answer);
```

## RAG（Retrieval-Augmented Generation）実装

### シンプルなRAGシステム

```typescript
// rag-simple.ts
import fs from 'fs';
import fetch from 'node-fetch';

// ドキュメント読み込み
function loadDocuments(dir: string): string[] {
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.txt'))
    .map(file => fs.readFileSync(`${dir}/${file}`, 'utf-8'));
}

// シンプルな検索（キーワードマッチ）
function search(query: string, documents: string[]): string[] {
  const keywords = query.toLowerCase().split(' ');

  return documents
    .filter(doc =>
      keywords.some(keyword => doc.toLowerCase().includes(keyword))
    )
    .slice(0, 3); // 上位3件
}

// RAGチャット
async function ragChat(query: string, documents: string[]) {
  // 関連ドキュメント検索
  const relevantDocs = search(query, documents);

  // コンテキスト作成
  const context = relevantDocs.join('\n\n---\n\n');

  // プロンプト作成
  const prompt = `
Context:
${context}

Question: ${query}

Answer based on the context above:
`;

  // LLMに送信
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      prompt: prompt,
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response;
}

// 使用例
const docs = loadDocuments('./knowledge');
const answer = await ragChat('What is TypeScript?', docs);
console.log(answer);
```

### ベクトルDBを使ったRAG

```bash
npm install chromadb
```

```typescript
// rag-vector.ts
import { ChromaClient } from 'chromadb';
import fetch from 'node-fetch';

const client = new ChromaClient();

// コレクション作成
async function createCollection() {
  return await client.createCollection({
    name: 'documents',
  });
}

// ドキュメント追加
async function addDocuments(collection: any, documents: string[]) {
  const ids = documents.map((_, i) => `doc_${i}`);

  await collection.add({
    ids: ids,
    documents: documents,
  });
}

// ベクトル検索
async function vectorSearch(collection: any, query: string) {
  const results = await collection.query({
    queryTexts: [query],
    nResults: 3,
  });

  return results.documents[0];
}

// RAGチャット
async function ragChatVector(query: string) {
  const collection = await client.getCollection({ name: 'documents' });

  // ベクトル検索
  const relevantDocs = await vectorSearch(collection, query);

  // コンテキスト作成
  const context = relevantDocs.join('\n\n---\n\n');

  // プロンプト作成
  const prompt = `
Context:
${context}

Question: ${query}

Answer based on the context above:
`;

  // LLMに送信
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      prompt: prompt,
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response;
}
```

## パフォーマンス最適化

### 量子化（Quantization）

```
FP16: 高精度、メモリ大
  - 70Bモデル: 140GB

Q8: 8-bit量子化
  - 70Bモデル: 70GB

Q4_K_M: 4-bit量子化（推奨）
  - 70Bモデル: 40GB
  - 精度とサイズのバランス良好

Q2: 2-bit量子化
  - 70Bモデル: 20GB
  - 精度低下あり
```

### GPU最適化

```bash
# Ollama（自動）
ollama run llama3.2

# llama.cpp
# -ngl でGPUレイヤー数指定
./llama-cli -m model.gguf -ngl 32

# 最適値の見つけ方
# 全レイヤーをGPUに: -ngl 99
# メモリ不足なら徐々に減らす
```

### メモリ管理

```bash
# Ollama
# メモリ制限
OLLAMA_MAX_LOADED_MODELS=1 ollama serve

# llama.cpp
# コンテキスト長を減らす
./llama-cli -m model.gguf -c 2048
```

## 実践的なユースケース

### コード生成アシスタント

```typescript
// code-assistant.ts
import fetch from 'node-fetch';

async function generateCode(description: string, language: string) {
  const prompt = `
You are a code generation expert.

Task: Generate ${language} code for the following:
${description}

Requirements:
- Clean, readable code
- Add comments
- Follow best practices

Code:
`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'codellama',
      prompt: prompt,
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response;
}

// 使用例
const code = await generateCode(
  'Create a React component for a todo list',
  'TypeScript'
);
console.log(code);
```

### ドキュメント要約

```typescript
async function summarize(text: string) {
  const prompt = `
Summarize the following text in 3-5 bullet points:

${text}

Summary:
`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      prompt: prompt,
      temperature: 0.3, // 低温度で安定した要約
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response;
}
```

### 翻訳

```typescript
async function translate(text: string, from: string, to: string) {
  const prompt = `
Translate the following text from ${from} to ${to}:

${text}

Translation:
`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      prompt: prompt,
      temperature: 0.3,
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response;
}

// 使用例
const translated = await translate(
  'Hello, how are you?',
  'English',
  'Japanese'
);
```

## まとめ

### ツール選択ガイド

```
初心者:
  → LM Studio（GUI、簡単）

開発者:
  → Ollama（CLI、API統合しやすい）

上級者/最高性能:
  → llama.cpp（最速、カスタマイズ自由）
```

### おすすめモデル

```
汎用:
  - llama3.2 (3B): 軽量、高速
  - mistral (7B): バランス良好

コード:
  - codellama: コード生成特化

日本語:
  - qwen2.5: 日本語対応良好

画像認識:
  - llava: マルチモーダル
```

### 次のステップ

- Ollama: https://ollama.com/
- llama.cpp: https://github.com/ggerganov/llama.cpp
- LM Studio: https://lmstudio.ai/
- モデル: https://huggingface.co/models

ローカルLLMで、プライバシーを守りながら開発を加速させましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
