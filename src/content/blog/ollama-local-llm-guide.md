---
title: "OllamaでローカルにLLMを動かす完全ガイド2026 - インストールからAPI連携まで"
description: "Ollamaを使ってLlama 3、Mistral、Gemmaなどのオープンソースモデルをローカル環境で動かす方法を解説。プライバシー重視のAI開発、REST API、Python/JS連携も網羅。AI・LLM・Ollamaに関する実践情報。"
pubDate: "2026-03-04"
tags: ["AI", "LLM", "Ollama", "Python", "ローカルAI", "プライバシー"]
---
## はじめに

Ollamaは、オープンソースのLLM（大規模言語モデル）をローカル環境で簡単に動かすためのツールです。クラウドAPIに依存せず、**データをローカルに保ちながらAIアプリを開発**できます。

2026年現在、Ollamaはエンジニアの標準ツールになりつつあります。本記事では、インストールから実際のアプリ開発まで、実践的に解説します。

## Ollamaとは

Ollamaは、LLMをローカルで実行するためのフレームワークです。

**主な特徴:**
- **ワンコマンドインストール**: macOS、Linux、Windowsに対応
- **多数のモデル対応**: Llama 3、Mistral、Gemma、Phi、CodeLlamaなど
- **REST API内蔵**: OpenAI互換APIを提供
- **GPU加速**: NVIDIA/AMDのGPU、Apple Silicon（Metal）に対応
- **完全プライベート**: データがクラウドに送信されない

## インストール

### macOS

```bash
# 公式サイトからダウンロード
brew install ollama

# または curl でインストール
curl -fsSL https://ollama.com/install.sh | sh
```

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows

公式サイト（https://ollama.com）からインストーラーをダウンロードして実行します。

## モデルの取得と実行

```bash
# Ollamaサーバーを起動
ollama serve

# モデルをダウンロードして対話開始（別ターミナル）
ollama run llama3.2

# 軽量なモデル（3B）
ollama run llama3.2:3b

# コード生成特化
ollama run codellama

# 日本語に強いモデル
ollama run command-r

# Googleのモデル
ollama run gemma2
```

## 主要モデル一覧

| モデル | サイズ | 特徴 | 推奨用途 |
|--------|--------|------|---------|
| llama3.2:3b | 2GB | 軽量・高速 | 開発・テスト |
| llama3.2:70b | 40GB | 高精度 | 本番・高品質 |
| mistral:7b | 4.1GB | 英語・コード強い | 汎用 |
| gemma2:9b | 5.5GB | Google製・バランス良好 | 汎用 |
| codellama | 3.8GB | コード特化 | コード生成 |
| deepseek-coder-v2 | 8.9GB | 最強クラスコード | コード生成 |
| phi4 | 8.5GB | Microsoft製・軽量高精度 | 軽量高精度 |
| qwen2.5-coder | 4.7GB | Alibaba製コード特化 | コード生成 |

```bash
# インストール済みモデル一覧
ollama list

# モデルを削除
ollama rm llama3.2:3b

# モデルの詳細情報
ollama show llama3.2
```

## REST API の利用

OllamaはデフォルトでRESTサーバーを `http://localhost:11434` で起動します。

### テキスト生成（ストリーミング）

```bash
curl http://localhost:11434/api/generate \
  -d '{
    "model": "llama3.2",
    "prompt": "TypeScriptでHello Worldを書いてください",
    "stream": false
  }'
```

### チャット形式

```bash
curl http://localhost:11434/api/chat \
  -d '{
    "model": "llama3.2",
    "messages": [
      {
        "role": "user",
        "content": "Pythonで素数判定関数を書いてください"
      }
    ],
    "stream": false
  }'
```

## Python からの利用

### ollama ライブラリを使う（推奨）

```bash
pip install ollama
```

```python
import ollama

# シンプルなチャット
response = ollama.chat(
    model='llama3.2',
    messages=[
        {
            'role': 'user',
            'content': 'Pythonでフィボナッチ数列を生成する関数を書いてください。',
        },
    ]
)
print(response['message']['content'])
```

### ストリーミング対応

```python
import ollama

# ストリーミングで受け取る
for chunk in ollama.chat(
    model='llama3.2',
    messages=[{'role': 'user', 'content': '量子コンピューターを説明してください'}],
    stream=True
):
    print(chunk['message']['content'], end='', flush=True)
```

### OpenAI互換クライアントで使う

OllamaはOpenAI APIと互換性があるため、既存コードをほぼそのまま使えます：

```python
from openai import OpenAI

# OllamaのエンドポイントをOpenAIクライアントで使用
client = OpenAI(
    base_url='http://localhost:11434/v1',
    api_key='ollama',  # ダミーキーでOK
)

response = client.chat.completions.create(
    model='llama3.2',
    messages=[
        {
            'role': 'system',
            'content': 'あなたは熟練したPythonエンジニアです。'
        },
        {
            'role': 'user',
            'content': 'FastAPIでCRUD APIを実装してください。'
        }
    ]
)
print(response.choices[0].message.content)
```

## Node.js / TypeScript からの利用

```bash
npm install ollama
```

```typescript
import ollama from 'ollama';

// チャット
const response = await ollama.chat({
  model: 'llama3.2',
  messages: [
    { role: 'user', content: 'TypeScriptのジェネリクスを説明してください' }
  ],
});

console.log(response.message.content);
```

### OpenAI SDKとの互換性

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
});

const completion = await client.chat.completions.create({
  model: 'codellama',
  messages: [
    { role: 'user', content: 'Reactでカスタムフックを書いてください' }
  ],
  stream: true,
});

for await (const chunk of completion) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

## LangChain との連携

```python
from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate

# モデルの初期化
llm = OllamaLLM(model="llama3.2")

# プロンプトテンプレート
prompt = ChatPromptTemplate.from_template(
    "次の技術トピックについて日本語で説明してください：{topic}"
)

# チェーンの作成
chain = prompt | llm

# 実行
result = chain.invoke({"topic": "マイクロサービスアーキテクチャ"})
print(result)
```

## Modelfile でカスタムモデルを作成

Ollamaでは`Modelfile`を使ってカスタムモデルを定義できます：

```dockerfile
# Modelfile
FROM llama3.2

# システムプロンプトの設定
SYSTEM """
あなたはイザークコンサルティング株式会社のAIアシスタントです。
日本語で丁寧かつ簡潔に回答してください。
コードの質問には必ず実際に動くコード例を添えてください。
"""

# パラメータのカスタマイズ
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx 4096
```

```bash
# カスタムモデルを作成
ollama create my-assistant -f Modelfile

# 実行
ollama run my-assistant
```

## マルチモーダル（画像理解）

```python
import ollama

# 画像を含むメッセージ（llava等のモデルが必要）
response = ollama.chat(
    model='llava',
    messages=[
        {
            'role': 'user',
            'content': 'この画像に何が写っていますか？',
            'images': ['/path/to/image.jpg']
        }
    ]
)
print(response['message']['content'])
```

## 実践: RAGシステムの構築

```python
import ollama
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

# Embeddingモデルでベクトル生成
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# ドキュメントをベクトルDBに保存
docs = [
    Document(page_content="OllamaはオープンソースのローカルLLMフレームワークです"),
    Document(page_content="Ollama APIはOpenAI APIと互換性があります"),
    Document(page_content="OllamaはGPUを活用してモデルを高速実行します"),
]

vectorstore = Chroma.from_documents(docs, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

def rag_query(question: str) -> str:
    # 関連ドキュメントを検索
    relevant_docs = retriever.invoke(question)
    context = "\n".join([doc.page_content for doc in relevant_docs])

    # LLMで回答生成
    response = ollama.chat(
        model="llama3.2",
        messages=[
            {
                "role": "system",
                "content": f"以下のコンテキストを基に質問に答えてください：\n{context}"
            },
            {
                "role": "user",
                "content": question
            }
        ]
    )
    return response['message']['content']

# クエリ実行
print(rag_query("OllamaのAPIはどのSDKと互換性がありますか？"))
```

## パフォーマンスチューニング

### GPU メモリの管理

```bash
# 利用するGPUを指定
OLLAMA_GPU_LAYERS=35 ollama run llama3.2

# CPUのみで実行（低速だが確実）
OLLAMA_GPU_LAYERS=0 ollama run llama3.2

# 並行リクエスト数の設定
OLLAMA_NUM_PARALLEL=2 ollama serve
```

### モデルの量子化

量子化レベルが低いほど精度が高く、メモリも多く必要です：

```bash
# Q4（バランス型、推奨）
ollama run llama3.2:8b-instruct-q4_0

# Q8（高精度、メモリ多め）
ollama run llama3.2:8b-instruct-q8_0

# fp16（最高精度、GPUメモリ大量）
ollama run llama3.2:8b-instruct-fp16
```

## Dockerでの実行

```yaml
# docker-compose.yml
services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # GPU使用（NVIDIA）
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

volumes:
  ollama_data:
```

```bash
# 起動
docker-compose up -d

# モデルのダウンロード
docker exec -it ollama-1 ollama pull llama3.2
```

## セキュリティと本番環境

### 外部からのアクセスを制限

```bash
# デフォルトはローカルのみ（0.0.0.0で全公開）
OLLAMA_HOST=127.0.0.1 ollama serve

# 特定IPのみ許可（Nginxでリバースプロキシ推奨）
```

### Nginxでの認証設定

```nginx
server {
    listen 443 ssl;
    server_name ollama.example.com;

    location / {
        # Basic認証
        auth_basic "Ollama API";
        auth_basic_user_file /etc/nginx/.htpasswd;

        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
    }
}
```

## まとめ

Ollamaは**プライバシーを守りながらLLMを活用したい開発者**にとって最強のツールです。

**Ollamaが特に向いているシナリオ:**
- 機密データを扱うアプリケーション開発
- クラウドAPIコストを削減したい場合
- オフライン環境でのAI活用
- ローカルでの実験・プロトタイプ開発
- OpenAI APIからの移行（互換API）

**次のステップ:**
- `ollama run llama3.2`でまず動かしてみる
- LangChainや自社フレームワークと連携
- RAGシステムを構築して実務活用

## 関連記事

- [LangChainでRAGシステムを構築する](/langchain-ai-app-guide)
- [AIエージェント開発入門2026](/ai-agent-development-2026)
- [OpenAI API完全ガイド](/openai-api-guide-2026)
