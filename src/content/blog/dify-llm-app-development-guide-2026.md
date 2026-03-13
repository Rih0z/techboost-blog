---
title: "Dify入門 — LLMアプリをノーコードで開発する方法"
description: "DifyでLLMアプリケーションを構築する方法を徹底解説。RAGパイプライン・AIエージェント・ワークフロー自動化・API公開の実践例をDocker環境構築手順とともにコード付きで紹介。LangChainとの違いやセルフホスト運用のコツも。"
pubDate: "2026-03-05"
tags: ["AI", "開発ツール", "LLM", "Python", "開発効率化"]
heroImage: '../../assets/thumbnails/dify-llm-app-development-guide-2026.jpg'
---

Difyは、LLM（大規模言語モデル）を活用したアプリケーションを**ノーコード/ローコード**で構築できるオープンソースプラットフォームである。2023年のリリース以来、急速にコミュニティが拡大し、2026年3月現在ではGitHub Star数が90,000を超え、エンタープライズ向けのAIアプリ開発基盤として広く採用されている。

本記事では、Difyの基本概念から、Dockerによるセルフホスト環境構築、RAGパイプライン、AIエージェント、ワークフロー自動化、API公開、そしてLangChainとの使い分けまで、実践的なコード例を交えて徹底解説する。

---

## 1. Difyとは — なぜ今、注目されているのか

### Difyが解決する課題

LLMアプリ開発で開発者が直面する共通の課題がある。

- **環境構築が重い**: LangChainやLlamaIndexは柔軟だが、ベクトルDB・エンベディング・プロンプト管理を全て自前で構築する必要がある
- **プロトタイプから本番までのギャップ**: PoC段階では動くが、本番運用に必要な認証・ログ・レート制限の実装が大変
- **非エンジニアが参加できない**: プロンプト調整や知識ベースの更新にコードの変更が必要
- **モデル切り替えのコスト**: GPT-4からClaude、ローカルLLMへの切り替えで大幅な改修が発生する
- **可観測性の欠如**: プロンプトのパフォーマンスやコストの可視化が困難

Difyはこれらの課題を**GUI駆動のプラットフォーム**として一気に解決する。ビジュアルワークフロー、ドラッグ&ドロップのRAG構築、組み込みのAPIエンドポイント公開、マルチモデル対応を全てブラウザ上で提供する。

### Difyの主要機能一覧

| 機能 | 概要 |
|------|------|
| **ワークフロービルダー** | ビジュアルキャンバスでAIワークフローを設計・テスト |
| **RAGパイプライン** | PDF・PPT・Webページなどのドキュメントを取り込みベクトル検索 |
| **AIエージェント** | Function CallingまたはReActベースのエージェントを構築 |
| **プロンプトIDE** | プロンプトの設計・A/Bテスト・モデル比較をGUI上で実行 |
| **マルチモデル対応** | OpenAI・Anthropic・Google・Ollama等100以上のモデルを統一インターフェースで管理 |
| **Backend-as-a-Service** | 全機能をREST API経由で外部システムから呼び出し可能 |
| **LLMOps** | アプリのログ・パフォーマンス・コストをリアルタイム監視 |
| **MCPプロトコル対応** | Model Context Protocolによる外部ツール連携 |
| **プラグインエコシステム** | v1.0以降、コミュニティプラグインで機能拡張可能 |
| **Knowledge Pipeline** | 生データを高品質なLLMコンテキストに変換するビジュアルパイプライン |

### クラウド版とセルフホスト版

Difyには2つのデプロイ形態がある。

| プラン | 月額料金 | メッセージクレジット | アプリ数 | ベクトルストレージ |
|--------|----------|---------------------|----------|-------------------|
| **Sandbox（無料）** | $0 | 200 | 10 | 5MB |
| **Professional** | $59 | 5,000 | 50 | 5GB |
| **Team** | $159 | 10,000 | 制限緩和 | 20GB |
| **Enterprise** | 要問合 | カスタム | 無制限 | カスタム |
| **セルフホスト** | $0（インフラ費のみ） | 無制限 | 無制限 | 無制限 |

学習目的や個人開発であれば**セルフホスト版が圧倒的にコスパが良い**。本番運用でセキュリティや可用性を求める場合はクラウド版のTeam以上が選択肢になる。

---

## 2. セットアップ — Docker Composeでのセルフホスト

### 前提条件

Difyのセルフホストには以下が必要になる。

- Docker Engine 20.10以上
- Docker Compose v2.0以上
- 最低2 vCPU / 8GB RAM
- 10GB以上のディスク空き容量

### インストール手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/langgenius/dify.git
cd dify/docker

# 2. 環境変数ファイルをコピー
cp .env.example .env

# 3. 必要に応じて.envを編集
# 主要な設定項目:
#   SECRET_KEY: アプリケーションの暗号化キー（本番では必ず変更）
#   INIT_PASSWORD: 管理者の初期パスワード
#   LOG_LEVEL: ログレベル（INFO推奨）
#   STORAGE_TYPE: ファイルストレージの種類（local/s3/azure-blob等）

# 4. コンテナを起動
docker compose up -d

# 5. 起動状態を確認
docker compose ps
```

正常に起動すると以下のコンテナが稼働する。

```
NAME                  IMAGE                    STATUS
dify-api-1            langgenius/dify-api      Up
dify-worker-1         langgenius/dify-api      Up
dify-web-1            langgenius/dify-web      Up
dify-db-1             postgres:15              Up
dify-redis-1          redis:7                  Up
dify-weaviate-1       semitechnologies/weaviate Up
dify-nginx-1          nginx:latest             Up
dify-sandbox-1        langgenius/dify-sandbox  Up
dify-ssrf_proxy-1     ubuntu/squid             Up
```

ブラウザで `http://localhost/install` にアクセスし、管理者アカウントを作成すればセットアップ完了だ。

### LLMプロバイダーの設定

初期セットアップ後、まずLLMプロバイダーのAPIキーを登録する。

1. **Settings > Model Providers** に移動
2. 使いたいプロバイダーを選択（OpenAI、Anthropic、Google等）
3. APIキーを入力して保存

ローカルLLMを使う場合は[Ollamaとの連携](/blog/ollama-local-llm-guide)が便利だ。

```bash
# Ollama側でモデルを起動しておく
ollama serve
ollama pull llama3.1:8b

# DifyのModel Providersで「Ollama」を追加
# Base URL: http://host.docker.internal:11434
# Model Name: llama3.1:8b
```

Docker環境からホストマシンのOllamaに接続するには `host.docker.internal` を使う点がポイントだ。Linux環境では `--add-host=host.docker.internal:host-gateway` をdocker-compose.ymlに追加する必要がある場合もある。

### アップデート手順

Difyは活発に開発されており、2026年3月現在のメジャーバージョンはv1.13系だ。アップデートは以下の手順で行う。

```bash
cd dify/docker

# 1. 最新のコードを取得
git pull origin main

# 2. .envファイルの差分を確認（新しい環境変数が追加されている場合がある）
diff .env .env.example

# 3. コンテナを再構築して起動
docker compose down
docker compose up -d --build

# 4. 起動確認
docker compose ps
```

`.env.example` に新しい変数が追加されていたら、自分の `.env` にも反映する必要がある。特にバージョンアップ時のマイグレーションはAPI起動時に自動実行されるため、手動での対応は不要だ。

---

## 3. RAGパイプライン — 社内ドキュメントをLLMに統合する

RAG（Retrieval-Augmented Generation）は、LLMに外部知識を注入する最も実用的な手法である。Difyでは[コードを書かずにRAGパイプライン](/blog/ai-rag-development-guide)を構築できる。

### ナレッジベースの作成

1. 左メニューの **Knowledge** をクリック
2. **Create Knowledge** を選択
3. データソースを選ぶ:
   - **ファイルアップロード**: PDF、DOCX、TXT、Markdown、CSV、XLSX、PPTXに対応
   - **Notion同期**: Notionのデータベースと自動同期
   - **Web同期**: 指定URLのコンテンツをクロールして取り込み

### チャンク設定の最適化

ドキュメントの分割方法はRAGの精度に直結する。Difyでは以下のモードが選択できる。

```yaml
# 自動モード（推奨: 初回はこれで十分）
segmentation_mode: automatic

# カスタムモード（精度を追求する場合）
segmentation_mode: custom
chunk_size: 500        # チャンクの最大文字数
chunk_overlap: 50      # チャンク間のオーバーラップ文字数
separator: "\n\n"      # 分割区切り文字
```

**実践的なチャンク設定の指針:**

| ドキュメントの種類 | チャンクサイズ | オーバーラップ | 理由 |
|-------------------|-------------|-------------|------|
| 技術マニュアル | 500-800 | 50 | セクション単位で意味が完結 |
| FAQ | 200-400 | 20 | Q&Aペアが短い |
| 法務文書 | 800-1200 | 100 | 条項の文脈を保持 |
| 議事録 | 400-600 | 50 | 話題の切り替わりが多い |

### Knowledge Pipeline（v1.12+の新機能）

v1.12以降で追加されたKnowledge Pipelineは、生データを高品質なコンテキストに変換するビジュアルパイプラインだ。従来の「アップロード→チャンク→埋め込み」という固定フローではなく、前処理・フィルタリング・変換のステップをノードとして自由に組み立てられる。

主な活用パターン:

- **テーブル抽出**: PDFからテーブルを構造化データとして抽出
- **多言語統合**: 異なる言語のドキュメントを統一的にインデックス
- **要約付きチャンク**: 各チャンクにAI生成のサマリーを付与し、検索精度を向上

### Summary Index（v1.12の注目機能）

Summary Indexは、チャンクにAI生成のサマリーを付与する機能だ。関連するコンテンツがまとまって返却されるため、特に長いドキュメントのRAGで検索精度が向上する。

```
# Summary Indexの有効化
Knowledge > 対象ナレッジベース > Settings
→ Retrieval Settings > Summary Index: ON
```

### 検索モードの選択

Difyは3つの検索モードを提供する。

1. **セマンティック検索（Embedding）**: ベクトル類似度による意味的な検索。デフォルトで推奨
2. **全文検索（Full-text）**: キーワードベースの従来型検索。固有名詞や型番に強い
3. **ハイブリッド検索**: セマンティック+全文を組み合わせたRRF（Reciprocal Rank Fusion）。精度が最も高い

```python
# APIからのナレッジベース検索（Pythonの例）
import requests

API_BASE = "http://localhost/v1"
API_KEY = "app-xxxxxxxxxxxxxxxxxx"

response = requests.post(
    f"{API_BASE}/datasets/{dataset_id}/retrieve",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "query": "Dockerのセットアップ方法を教えてください",
        "retrieval_model": {
            "search_method": "hybrid_search",
            "reranking_enable": True,
            "reranking_model": {
                "provider": "cohere",
                "model": "rerank-multilingual-v3.0"
            },
            "top_k": 5,
            "score_threshold_enabled": True,
            "score_threshold": 0.5
        }
    }
)

results = response.json()
for record in results["records"]:
    print(f"Score: {record['score']:.3f}")
    print(f"Content: {record['segment']['content'][:200]}")
    print("---")
```

**リランキングを有効にすると精度が飛躍的に向上する。** Cohereの `rerank-multilingual-v3.0` は日本語にも対応しており、ハイブリッド検索と組み合わせることで、従来のセマンティック検索のみの構成と比較して体感で2〜3割の精度向上が見込める。

---

## 4. AIエージェントの構築

### エージェントとは

Difyにおけるエージェントは、LLMが自律的にツールを選択・実行して目標を達成する仕組みだ。チャットボットが「聞かれたら答える」のに対し、エージェントは「目標達成のために考えて行動する」点が異なる。

### エージェントの作成手順

1. **Studio > Create Application > Agent** を選択
2. 基本設定を行う:

```yaml
# エージェント設定の例
name: "テクニカルサポートAgent"
description: "社内ナレッジベースを検索し、技術的な質問に回答するエージェント"
model: gpt-4o  # または claude-3.5-sonnet
agent_mode: function_call  # function_call / react
max_iterations: 5  # 最大ツール呼び出し回数
```

3. **ツールを追加**する:

Difyは50以上のビルトインツールを提供している。

| カテゴリ | 主要なツール |
|---------|------------|
| 検索 | Google Search、Bing Search、DuckDuckGo、Tavily |
| 画像生成 | DALL-E 3、Stable Diffusion |
| 計算・分析 | WolframAlpha、Python Code Interpreter |
| Web操作 | Web Scraper、URL Reader |
| 外部サービス | Slack、GitHub、Notion |
| ナレッジベース | 自作のKnowledgeを参照 |

4. **プロンプトを設計**する:

```text
あなたは社内テクニカルサポートのエキスパートです。

## 行動指針
1. まず社内ナレッジベースを検索してください
2. ナレッジベースに情報がない場合、Web検索を行ってください
3. コードの実行が必要な場合、Code Interpreterを使ってください
4. 回答には必ず参照元のドキュメント名を含めてください

## 制約
- 推測で回答せず、必ずソースを確認すること
- 機密情報は外部検索に含めないこと
- 日本語で回答すること
```

### Function Calling vs ReAct

エージェントの推論方式として2つのアプローチがある。

**Function Calling（推奨）:**
- OpenAIやAnthropicのネイティブ関数呼び出し機能を利用
- 高速で安定している
- ツール選択の精度が高い
- 対応モデル: GPT-4o、Claude 3.5 Sonnet、Gemini Pro等

**ReAct（Reasoning + Acting）:**
- 思考→行動→観察のループを明示的に繰り返す
- 推論過程が可視化できる
- どのモデルでも利用可能（Ollamaのローカルモデル含む）
- 複雑な推論タスクに向いている

```
# ReActの実行ログ例
Thought: ユーザーは「先月のサーバー障害の原因」を知りたい。
         まずナレッジベースで障害報告書を検索する。
Action: knowledge_search("サーバー障害 原因 先月")
Observation: 2件の関連ドキュメントが見つかった。
             障害報告書_2026-02.pdf: メモリリークが原因...
Thought: 障害の原因がメモリリークだと特定できた。
         詳細を確認して回答をまとめる。
Action: knowledge_search("メモリリーク 対策 サーバー")
Observation: 対策ドキュメント_v3.md: JVMヒープサイズの調整と...
Thought: 原因と対策の両方が揃った。回答をまとめる。
Final Answer: 先月のサーバー障害の原因はJavaアプリケーションの
             メモリリークでした。具体的には...
```

### カスタムツールの作成

ビルトインツールでは足りない場合、OpenAPI（Swagger）仕様のAPIを**カスタムツール**として登録できる。

```yaml
# カスタムツールのOpenAPI定義例
openapi: "3.0.0"
info:
  title: "社内在庫管理API"
  version: "1.0.0"
servers:
  - url: "https://api.internal.example.com"
paths:
  /inventory/search:
    get:
      operationId: searchInventory
      summary: "商品在庫を検索する"
      parameters:
        - name: product_name
          in: query
          required: true
          schema:
            type: string
          description: "商品名（部分一致）"
        - name: warehouse
          in: query
          required: false
          schema:
            type: string
            enum: ["tokyo", "osaka", "fukuoka"]
          description: "倉庫の場所"
      responses:
        "200":
          description: "在庫情報のリスト"
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    product_id:
                      type: string
                    product_name:
                      type: string
                    quantity:
                      type: integer
                    warehouse:
                      type: string
```

これをDifyの **Tools > Custom > Create** から登録するだけで、エージェントが社内APIを直接呼び出せるようになる。

---

## 5. ワークフロー自動化 — ビジュアルで組むAIパイプライン

### ワークフローの概念

Difyのワークフローは、複雑なAI処理を**ノード（ブロック）の接続**で表現する機能だ。コードを書かずに条件分岐、ループ、外部API呼び出し、LLM処理を組み合わせた高度な処理パイプラインを構築できる。

ワークフローには2つのタイプがある。

| タイプ | 用途 | 入力 | 出力 |
|--------|------|------|------|
| **Workflow** | バッチ処理・自動化 | テキスト/ファイル | テキスト/ファイル |
| **Chatflow** | 対話型アプリ | ユーザーメッセージ | チャット応答 |

### 主要ノードの種類

Difyのワークフローで利用可能な主要ノードを整理する。

| ノード | 機能 | 主な用途 |
|--------|------|---------|
| **Start** | ワークフローの入力を定義 | 変数・ファイルの受け取り |
| **LLM** | LLMを呼び出して推論 | テキスト生成・分類・要約 |
| **Knowledge Retrieval** | ナレッジベースから情報取得 | RAG |
| **Question Classifier** | 入力を分類して分岐 | ルーティング |
| **IF/ELSE** | 条件分岐 | フロー制御 |
| **Code** | Python/JavaScriptコードを実行 | データ変換・計算 |
| **HTTP Request** | 外部APIを呼び出し | システム連携 |
| **Template** | Jinja2テンプレートで出力整形 | レスポンス整形 |
| **Iteration** | リストの各要素にサブフローを実行 | バッチ処理 |
| **Variable Aggregator** | 複数変数を集約 | データ統合 |
| **Parameter Extractor** | LLMで構造化データを抽出 | 情報抽出 |
| **End** | ワークフローの出力を定義 | 結果の返却 |
| **Human Input** | 人間の判断を待つ（v1.13新機能） | 承認フロー |
| **Agent** | エージェントノード | 自律的なタスク実行 |

### 実践例: 多言語カスタマーサポート自動化

以下は、ユーザーの問い合わせを自動分類し、ナレッジベースから回答を生成するワークフローの構成例だ。

```
[Start]
  │
  ▼
[Question Classifier] ── "技術的質問" ──→ [Knowledge Retrieval: 技術FAQ]
  │                                              │
  ├── "請求・契約" ──→ [Knowledge Retrieval: 契約FAQ]   │
  │                         │                    │
  ├── "苦情" ──→ [LLM: 謝罪文生成]                │
  │                │                             │
  ▼                ▼                             ▼
[Variable Aggregator] ◀─────────────────────────┘
  │
  ▼
[LLM: 最終回答生成]
  │
  ▼
[IF/ELSE: 言語判定]
  ├── 日本語 → [End: そのまま出力]
  └── その他 → [LLM: 翻訳] → [End: 翻訳済み出力]
```

### 実践例: コンテンツ生成パイプライン

ブログ記事を自動生成するワークフローの例を示す。

```
[Start: トピック入力]
  │
  ▼
[HTTP Request: Google検索で最新情報を取得]
  │
  ▼
[Code: 検索結果を整形]
  │
  ▼
[LLM: 記事構成案を生成]
  │
  ▼
[LLM: セクションごとに本文を生成]
  │
  ▼
[Template: Markdown形式に整形]
  │
  ▼
[LLM: 校正・ファクトチェック]
  │
  ▼
[End: 最終記事を出力]
```

### Codeノードの活用

Codeノードでは、PythonまたはJavaScriptで任意の処理を記述できる。ワークフロー内でのデータ変換や計算に活用する。

```python
# Codeノードの例: JSON形式のAPIレスポンスを整形
def main(arg1: str) -> dict:
    import json

    try:
        data = json.loads(arg1)
        # 必要なフィールドだけ抽出
        results = []
        for item in data.get("items", []):
            results.append({
                "title": item.get("title", ""),
                "summary": item.get("description", "")[:200],
                "url": item.get("link", "")
            })
        return {
            "result": json.dumps(results, ensure_ascii=False),
            "count": len(results)
        }
    except json.JSONDecodeError:
        return {
            "result": "[]",
            "count": 0
        }
```

### Human Inputノード（v1.13の新機能）

v1.13で追加されたHuman Inputノードは、ワークフローの途中で**人間の判断を挟む**機能だ。承認フローや品質チェックが必要なケースで重要になる。

```
[Start: 契約書ドラフト生成依頼]
  │
  ▼
[LLM: 契約書ドラフトを生成]
  │
  ▼
[Human Input: 法務担当者が内容を確認]  ← ここでワークフローが一時停止
  │
  ├── 承認 → [HTTP Request: 電子署名APIに送信]
  └── 却下 → [LLM: フィードバックに基づいて修正] → [Human Input]（再確認）
```

---

## 6. API公開 — DifyをバックエンドAPIとして使う

### DifyのBackend-as-a-Service

Difyで構築したアプリケーションは、全て**REST API**として公開される。フロントエンドやモバイルアプリから直接呼び出せるため、AIバックエンドの開発工数を大幅に削減できる。

### APIキーの取得

1. アプリの **Overview** ページを開く
2. **API Access** セクションでAPIキーを生成
3. API Base URLを確認（セルフホストの場合は `http://your-host/v1`）

### チャットアプリのAPI呼び出し

```python
import requests

API_BASE = "http://localhost/v1"
API_KEY = "app-xxxxxxxxxxxxxxxxxx"

# チャットメッセージの送信
response = requests.post(
    f"{API_BASE}/chat-messages",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "inputs": {},
        "query": "Pythonでファイルを読み込む方法を教えてください",
        "response_mode": "blocking",  # "blocking" or "streaming"
        "conversation_id": "",  # 空文字で新規会話
        "user": "user-123"
    }
)

result = response.json()
print(result["answer"])
print(f"トークン使用量: {result['metadata']['usage']['total_tokens']}")
```

### ストリーミングレスポンス

リアルタイムで回答を表示したい場合は、ストリーミングモードを使う。

```python
import requests
import json

def stream_chat(query: str, conversation_id: str = ""):
    response = requests.post(
        f"{API_BASE}/chat-messages",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "inputs": {},
            "query": query,
            "response_mode": "streaming",
            "conversation_id": conversation_id,
            "user": "user-123"
        },
        stream=True
    )

    full_answer = ""
    for line in response.iter_lines():
        if line:
            decoded = line.decode("utf-8")
            if decoded.startswith("data: "):
                data = json.loads(decoded[6:])
                event = data.get("event")

                if event == "message":
                    chunk = data.get("answer", "")
                    full_answer += chunk
                    print(chunk, end="", flush=True)

                elif event == "message_end":
                    print()  # 改行
                    return full_answer, data.get("conversation_id")

# 使用例
answer, conv_id = stream_chat("Dockerの基本的なコマンドを教えてください")

# 会話を継続
answer2, conv_id = stream_chat("docker composeについても教えてください", conv_id)
```

### ワークフローのAPI実行

ワークフロータイプのアプリはバッチ処理として実行できる。

```python
# ワークフローの実行
response = requests.post(
    f"{API_BASE}/workflows/run",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "inputs": {
            "topic": "2026年のAI開発トレンド",
            "language": "ja",
            "word_count": 2000
        },
        "response_mode": "blocking",
        "user": "user-123"
    }
)

result = response.json()
print(result["data"]["outputs"])
```

### TypeScript/Next.jsからの呼び出し

フロントエンドからDify APIを呼び出す例を示す。

```typescript
// lib/dify-client.ts
const DIFY_API_BASE = process.env.DIFY_API_BASE || "http://localhost/v1";
const DIFY_API_KEY = process.env.DIFY_API_KEY || "";

interface ChatResponse {
  answer: string;
  conversation_id: string;
  metadata: {
    usage: {
      total_tokens: number;
      total_price: string;
    };
  };
}

export async function sendMessage(
  query: string,
  conversationId?: string
): Promise<ChatResponse> {
  const response = await fetch(`${DIFY_API_BASE}/chat-messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DIFY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: {},
      query,
      response_mode: "blocking",
      conversation_id: conversationId || "",
      user: "web-user",
    }),
  });

  if (!response.ok) {
    throw new Error(`Dify API error: ${response.status}`);
  }

  return response.json();
}

// ストリーミング版
export async function* streamMessage(
  query: string,
  conversationId?: string
): AsyncGenerator<string> {
  const response = await fetch(`${DIFY_API_BASE}/chat-messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DIFY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: {},
      query,
      response_mode: "streaming",
      conversation_id: conversationId || "",
      user: "web-user",
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.event === "message") {
            yield data.answer;
          }
        } catch {
          // パース失敗は無視
        }
      }
    }
  }
}
```

```tsx
// app/chat/page.tsx（Next.js App Routerの例）
"use client";

import { useState, useRef } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const conversationIdRef = useRef<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMessage,
          conversationId: conversationIdRef.current,
        }),
      });

      const data = await res.json();
      conversationIdRef.current = data.conversation_id;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg ${
              msg.role === "user"
                ? "bg-blue-100 ml-auto max-w-[80%]"
                : "bg-gray-100 mr-auto max-w-[80%]"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 border rounded-lg px-4 py-2"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          送信
        </button>
      </form>
    </div>
  );
}
```

---

## 7. MCPプロトコル対応 — 外部ツールとの標準連携

### MCPとは

MCP（Model Context Protocol）は、LLMアプリケーションと外部ツール・データソースを接続する標準プロトコルだ。Dify v1.10以降でネイティブサポートされており、MCPサーバーとして公開されたツールをDifyから直接利用できる。

### MCPサーバーの接続

DifyでMCPサーバーを利用するには、以下の手順を踏む。

1. **Settings > Tools > MCP** に移動
2. MCPサーバーのエンドポイントURLを登録
3. 認証方式を選択（不要 / API Key / OAuth）
4. ツールリストが自動的に読み込まれる

```yaml
# MCP設定の例
mcp_servers:
  - name: "filesystem"
    url: "http://host.docker.internal:3001/mcp"
    auth: none
  - name: "database-query"
    url: "https://mcp.internal.example.com/db"
    auth:
      type: api_key
      key: "mcp-xxxxxxxxxx"
```

### DifyをMCPサーバーとして公開

逆に、Difyで構築したエージェントやワークフローを**MCPサーバーとして外部に公開**することも可能だ。これにより、Claude DesktopやVS Code Copilotなど、MCP対応のクライアントからDifyの機能を呼び出せるようになる。

---

## 8. LLMOps — 運用・監視・改善

### アプリケーションの監視

Difyには組み込みのLLMOps機能がある。

```
# モニタリングダッシュボードで確認できる項目
- 総メッセージ数 / アクティブユーザー数
- 平均応答時間
- トークン消費量 / コスト
- ユーザー満足度（👍👎フィードバック）
- エラー率
```

### ログの分析

各メッセージのログから以下を確認できる。

- **完全な入出力ログ**: プロンプト→LLM応答の全履歴
- **ツール呼び出しのトレース**: エージェントがどのツールをどの順序で使ったか
- **RAG検索結果**: どのチャンクが検索されたか、スコアはいくつか
- **レイテンシの内訳**: 各ステップの所要時間

### アノテーション（教師データ）

ログから「良い回答」をアノテーションとして保存し、今後の回答品質向上に活用できる。

1. ログで高品質な回答を特定
2. **Annotate** ボタンで正解データとして登録
3. 類似の質問が来た際に、アノテーションされた回答が優先的に返される

これは簡易的なファインチューニングとも言える仕組みで、モデルそのものの再訓練なしに回答品質を改善できる。

---

## 9. Dify vs LangChain — 使い分けの指針

[LangChain](/blog/langchain-ai-app-guide)はLLMアプリ開発の代表的なフレームワークだ。Difyとは設計思想が大きく異なるため、プロジェクトの要件に応じて使い分ける必要がある。

### 比較表

| 観点 | Dify | LangChain |
|------|------|-----------|
| **アプローチ** | GUI/ノーコード | コードファースト |
| **対象ユーザー** | 開発者 + ビジネスユーザー | 開発者のみ |
| **学習コスト** | 低い（1日で基本操作を習得） | 中〜高（概念が多い） |
| **柔軟性** | 中（プラグインで拡張可能） | 高（コードレベルで自由） |
| **RAG構築** | GUIで数クリック | コードで細かく制御 |
| **デプロイ** | 組み込みAPI自動公開 | 自前でAPI/インフラ構築 |
| **マルチモデル切替** | GUIで即座に切替 | コード変更が必要 |
| **チーム協業** | 非エンジニアも参加可能 | エンジニアのみ |
| **テスト・CI/CD** | GUIのA/Bテスト | ユニットテスト・CI統合 |
| **カスタマイズ深度** | 中（Codeノード/プラグイン） | 高（フルコントロール） |
| **コスト（セルフホスト）** | 無料 | 無料 |
| **ライセンス** | Apache 2.0（カスタム制限あり） | MIT |

### どちらを選ぶべきか

**Difyが向いているケース:**

- プロトタイプを最速で作りたい
- 非エンジニアメンバーがプロンプトやナレッジベースを管理する
- 複数のLLMモデルを頻繁に切り替えて比較したい
- APIエンドポイントをすぐに公開したい
- 運用時のログ分析やコスト管理をGUIで行いたい
- LLMアプリ開発の経験が浅いチーム

**LangChainが向いているケース:**

- 高度にカスタマイズされたRAGパイプラインが必要
- 既存のPythonアプリケーションにLLM機能を統合したい
- マイクロサービスアーキテクチャに組み込みたい
- CI/CDパイプラインでテストを回したい
- LangGraphで複雑なマルチエージェントを構築したい
- ライブラリとしての軽量さが求められる

**併用パターンも有効だ。** 例えば、PoCやビジネスユーザー向けのデモはDifyで素早く作り、本番実装はLangChainで精密に構築するというアプローチを取っているチームも多い。DifyのAPIを通じてLangChainのアプリケーションからDifyの機能を呼び出すことも可能だ。

---

## 10. 実践ユースケース集

### ユースケース1: 社内FAQチャットボット

最もシンプルかつ効果の高いユースケースだ。

**構成:**
- アプリタイプ: Chatflow
- ナレッジベース: 社内規程PDF、人事マニュアル、IT FAQ
- モデル: GPT-4o-mini（コスト重視）/ Claude 3.5 Haiku

**実装ポイント:**
- ハイブリッド検索 + リランキングで精度確保
- 「わかりません」と正直に答える指示をプロンプトに含める
- ソースドキュメントへの参照リンクを回答に含める

### ユースケース2: 多言語メール自動翻訳ワークフロー

**構成:**
```
[Start: メール本文]
  → [LLM: 言語検出]
  → [IF/ELSE: 日本語以外か？]
    → Yes: [LLM: 日本語に翻訳] → [LLM: 要約生成]
    → No: [LLM: 要約生成]
  → [Template: 通知フォーマット]
  → [HTTP Request: Slackに通知]
  → [End]
```

### ユースケース3: レポート自動生成エージェント

**構成:**
- アプリタイプ: Agent
- ツール: HTTP Request（売上API）、Code Interpreter（グラフ生成）、Knowledge（過去レポート）
- モデル: Claude 3.5 Sonnet（分析力重視）

### ユースケース4: コードレビューアシスタント

**構成:**
- アプリタイプ: Chatflow
- ナレッジベース: コーディング規約、過去のレビューコメント集
- 入力: GitHubのdiff
- 出力: レビューコメント + 改善提案

---

## 11. セキュリティとベストプラクティス

### セルフホスト時のセキュリティ対策

```yaml
# docker-compose.ymlの推奨設定

# 1. SECRET_KEYは必ずランダムな文字列に変更
SECRET_KEY: "your-random-secret-key-minimum-32-chars"

# 2. デフォルトのDB/Redisパスワードを変更
DB_PASSWORD: "strong-postgres-password"
REDIS_PASSWORD: "strong-redis-password"

# 3. SSRF保護（デフォルトで有効）
SSRF_PROXY_HTTP_URL: "http://ssrf_proxy:3128"

# 4. サンドボックス（コード実行の隔離）
CODE_EXECUTION_ENDPOINT: "http://sandbox:8194"
```

### 本番運用のチェックリスト

- [ ] SECRET_KEYを安全な値に変更
- [ ] データベースのパスワードを強力なものに変更
- [ ] Nginx/リバースプロキシでHTTPS化
- [ ] APIキーのローテーション計画を策定
- [ ] バックアップの自動化（PostgreSQL + Weaviate）
- [ ] ログの外部転送（Fluentd/Loki等）
- [ ] リソースモニタリングの設定
- [ ] レート制限の設定

### APIキーの管理

```bash
# 環境変数でAPIキーを管理する（ハードコードしない）
export DIFY_API_KEY="app-xxxxxxxxxxxxxxxxxx"

# .envファイルに記載する場合
echo 'DIFY_API_KEY=app-xxxxxxxxxxxxxxxxxx' >> .env.local
echo '.env.local' >> .gitignore
```

---

## 12. トラブルシューティング

### よくある問題と解決策

**Q: Docker Composeの起動に失敗する**

```bash
# メモリ不足が原因の場合が多い（最低8GB必要）
docker stats  # メモリ使用量を確認

# ポート競合の場合
lsof -i :80  # 80番ポートを使っているプロセスを確認
# nginx.confでポートを変更するか、競合プロセスを停止
```

**Q: Ollamaに接続できない**

```bash
# Docker環境からホストのOllamaに接続する場合
# docker-compose.ymlにextra_hostsを追加
services:
  api:
    extra_hosts:
      - "host.docker.internal:host-gateway"

# Ollama側でリモートアクセスを許可
OLLAMA_HOST=0.0.0.0 ollama serve
```

**Q: RAGの回答精度が低い**

1. チャンクサイズを見直す（小さすぎると文脈が失われる）
2. ハイブリッド検索 + リランキングを有効にする
3. エンベディングモデルを変更する（`text-embedding-3-large` 推奨）
4. ナレッジベースのドキュメントの品質を確認する（ゴミデータが混ざっていないか）
5. プロンプトで「ナレッジベースの情報のみに基づいて回答してください」と明示する

**Q: ワークフローが途中で止まる**

```bash
# Workerのログを確認
docker compose logs -f worker

# Celeryキューの状態を確認
docker compose exec api celery -A app.celery inspect active
```

---

## まとめ — Difyで始めるLLMアプリ開発

Difyは、LLMアプリ開発の敷居を劇的に下げるプラットフォームだ。本記事で解説した内容を整理する。

| 機能 | Difyで実現できること |
|------|---------------------|
| **環境構築** | Docker Compose一発でセルフホスト。5分でLLMアプリ開発を開始 |
| **RAG** | PDF・Webページをアップロードするだけでナレッジベース構築 |
| **エージェント** | 50以上のビルトインツール + カスタムAPI連携で自律的AIを構築 |
| **ワークフロー** | ビジュアルエディタで条件分岐・ループ・API連携を組み合わせ |
| **API公開** | 構築したアプリをワンクリックでREST APIとして公開 |
| **LLMOps** | ログ・コスト・パフォーマンスをリアルタイム監視 |
| **MCP対応** | 標準プロトコルで外部ツール・サービスと連携 |

**最初のステップとして、以下を推奨する:**

1. Docker Composeでセルフホスト環境を構築する
2. 手元のPDFをアップロードしてRAGチャットボットを作る
3. ワークフローで簡単な自動化パイプラインを組む
4. APIキーを発行して自分のアプリから呼び出す

Difyは「AIアプリを作りたいが、インフラ構築に時間をかけたくない」という開発者にとっての最適解だ。特にRAGやエージェント開発の入門として、LangChainやLlamaIndexに取り組む前の第一歩としても活用できる。

より深くRAGの仕組みを理解したい場合は[RAG開発ガイド](/blog/ai-rag-development-guide)を、ローカルLLMとの連携を試したい場合は[Ollamaガイド](/blog/ollama-local-llm-guide)を、コードベースでの高度な制御が必要になったら[LangChain完全ガイド](/blog/langchain-ai-app-guide)を参照してほしい。

---

**参考リンク:**
- [Dify公式サイト](https://dify.ai/)
- [Dify公式ドキュメント](https://docs.dify.ai/)
- [Dify GitHubリポジトリ](https://github.com/langgenius/dify)
- [Dify公式プラグイン](https://github.com/langgenius/dify-official-plugins)
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
