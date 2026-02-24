---
title: 'Elasticsearch完全ガイド — 全文検索・Node.js統合・Kibana・パフォーマンスチューニング'
description: 'Elasticsearchで高速全文検索を実装する完全ガイド。インデックス設計・マッピング・クエリDSL・Aggregation・Node.js統合・Kibana・オートコンプリート・ベクトル検索まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['Elasticsearch', '全文検索', 'Node.js', 'TypeScript', 'Kibana']
---

Elasticsearchは、Apache Luceneをベースに構築された分散型全文検索・分析エンジンです。ログ解析、ECサイトの商品検索、ドキュメント管理システムなど、あらゆるスケールの検索要件に対応できます。本記事では、ローカル環境の構築からプロダクション運用まで、実装例を交えながら体系的に解説します。

---

## 1. Elasticsearchとは — RDB・Redisとの比較

### Elasticsearchの基本概念

Elasticsearchは「インデックス（Index）」という単位でデータを管理します。RDBのテーブルに相当しますが、スキーマレスで非常に柔軟です。データはJSONドキュメントとして保存され、Luceneの転置インデックスにより高速な全文検索を実現します。

主なコンセプトは以下の通りです。

| Elasticsearch | RDB | 説明 |
|---|---|---|
| Index | Table | データの集合 |
| Document | Row | 1件のデータ（JSON） |
| Field | Column | データの属性 |
| Mapping | Schema | フィールド定義 |
| Shard | Partition | データの分割単位 |

### RDB・Redisとの使い分け

**PostgreSQL / MySQLとの比較**

RDBは構造化データのトランザクション処理に優れています。一方、Elasticsearchは以下のユースケースで圧倒的な優位性を持ちます。

- 大量ドキュメントのフリーテキスト検索（`LIKE '%keyword%'`の代替）
- 形態素解析を使った日本語全文検索
- ファセット検索・Aggregation（絞り込み条件の件数集計）
- ログ・メトリクスのリアルタイム分析

**Redisとの比較**

Redisはインメモリキャッシュとして高速なKey-Valueアクセスに特化しています。Elasticsearchはディスクベースで大容量データを扱い、複雑なクエリ・集計に適しています。オートコンプリートはRedisのSortedSetでも実現できますが、形態素解析が必要な日本語検索ではElasticsearchの方が適切です。

**適用場面の判断基準**

```
検索要件の複雑度
├── シンプルなID引き当て → Redis / RDB
├── 完全一致・前方一致 → Redis（ZADD）/ RDB（INDEX）
├── 部分一致・全文検索 → Elasticsearch
├── 日本語形態素解析 → Elasticsearch（kuromoji）
├── ログ分析・時系列 → Elasticsearch（+ Kibana）
└── ベクトル類似検索 → Elasticsearch（kNN）
```

---

## 2. ローカル環境（Docker Compose + Kibana）

### Docker Compose設定

まずDocker Composeで開発環境を構築します。Elasticsearch 8.x系を使用します。

```yaml
# docker-compose.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    container_name: elasticsearch
    environment:
      - node.name=elasticsearch
      - cluster.name=es-docker-cluster
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - xpack.security.enabled=false
      - xpack.security.enrollment.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
      - "9300:9300"
    networks:
      - elastic

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    container_name: kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - xpack.security.enabled=false
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - elastic

volumes:
  elasticsearch-data:
    driver: local

networks:
  elastic:
    driver: bridge
```

```bash
# 起動
docker compose up -d

# 動作確認
curl http://localhost:9200

# Kibana: http://localhost:5601
```

起動後、`http://localhost:9200` にアクセスしてクラスター情報が返ってくれば準備完了です。

### クラスターヘルスチェック

```bash
# クラスターの状態確認
curl http://localhost:9200/_cluster/health?pretty

# インデックス一覧
curl http://localhost:9200/_cat/indices?v

# ノード情報
curl http://localhost:9200/_cat/nodes?v
```

---

## 3. インデックス設計（Mapping・Analyzer・Tokenizer）

### マッピングの基本

マッピングはRDBのスキーマ定義に相当します。フィールドのデータ型・アナライザーを明示的に定義することで、検索精度とパフォーマンスが向上します。

```json
PUT /products
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "analysis": {
      "analyzer": {
        "japanese": {
          "type": "custom",
          "tokenizer": "kuromoji_tokenizer",
          "filter": [
            "kuromoji_baseform",
            "kuromoji_part_of_speech",
            "cjk_width",
            "ja_stop",
            "kuromoji_stemmer",
            "lowercase"
          ]
        },
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "edge_ngram_tokenizer",
          "filter": ["lowercase"]
        },
        "autocomplete_search": {
          "type": "custom",
          "tokenizer": "keyword",
          "filter": ["lowercase"]
        }
      },
      "tokenizer": {
        "edge_ngram_tokenizer": {
          "type": "edge_ngram",
          "min_gram": 1,
          "max_gram": 20,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": {
        "type": "keyword"
      },
      "name": {
        "type": "text",
        "analyzer": "japanese",
        "fields": {
          "keyword": {
            "type": "keyword"
          },
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete_analyzer",
            "search_analyzer": "autocomplete_search"
          }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "japanese"
      },
      "price": {
        "type": "integer"
      },
      "category": {
        "type": "keyword"
      },
      "tags": {
        "type": "keyword"
      },
      "rating": {
        "type": "float"
      },
      "stock": {
        "type": "integer"
      },
      "created_at": {
        "type": "date",
        "format": "yyyy-MM-dd'T'HH:mm:ss||yyyy-MM-dd||epoch_millis"
      },
      "location": {
        "type": "geo_point"
      }
    }
  }
}
```

### 主要なフィールドデータ型

| 型 | 用途 |
|---|---|
| `text` | 全文検索対象のテキスト（アナライズされる） |
| `keyword` | 完全一致・ソート・Aggregation用 |
| `integer` / `long` / `float` / `double` | 数値 |
| `date` | 日付・時刻 |
| `boolean` | true / false |
| `object` | ネストしたJSONオブジェクト |
| `nested` | 独立してクエリできるオブジェクト配列 |
| `geo_point` | 緯度・経度 |
| `dense_vector` | ベクトル検索用 |

---

## 4. アナライザー（日本語対応・kuromoji・ICU）

### Kuromojiアナライザー

日本語の形態素解析には`analysis-kuromoji`プラグインを使用します。Dockerイメージにはデフォルトで含まれています。

```json
POST /products/_analyze
{
  "analyzer": "japanese",
  "text": "高性能ノートパソコンを安く購入したい"
}
```

レスポンスでトークン分割結果を確認できます。

```json
{
  "tokens": [
    { "token": "高性能", "start_offset": 0, "end_offset": 3 },
    { "token": "ノート", "start_offset": 3, "end_offset": 6 },
    { "token": "パソコン", "start_offset": 6, "end_offset": 10 },
    { "token": "安い", "start_offset": 12, "end_offset": 14 },
    { "token": "購入", "start_offset": 15, "end_offset": 17 }
  ]
}
```

Kuromojiフィルターの主な種類を以下に示します。

- `kuromoji_baseform`: 動詞・形容詞を基本形に統一（走っている→走る）
- `kuromoji_part_of_speech`: 助詞・助動詞・句読点を除去
- `kuromoji_stemmer`: 長音符の正規化（コンピューター→コンピュータ）
- `kuromoji_readingform`: よみがなトークン生成

### ICUアナライザー

`analysis-icu`プラグインは、Unicode文字の正規化・大文字小文字統一・全角半角変換などを処理します。Kuromojiと組み合わせると、より堅牢な日本語検索が実現できます。

```json
PUT /articles
{
  "settings": {
    "analysis": {
      "char_filter": {
        "icu_normalizer": {
          "type": "icu_normalizer",
          "name": "nfkc_cf"
        }
      },
      "analyzer": {
        "japanese_icu": {
          "type": "custom",
          "char_filter": ["icu_normalizer"],
          "tokenizer": "kuromoji_tokenizer",
          "filter": [
            "kuromoji_baseform",
            "kuromoji_part_of_speech",
            "kuromoji_stemmer",
            "icu_folding",
            "lowercase"
          ]
        }
      }
    }
  }
}
```

---

## 5. クエリDSL（match・term・bool・range・fuzzy）

### match クエリ

`match`はテキストフィールドへの全文検索に使います。アナライザーが適用されます。

```json
GET /products/_search
{
  "query": {
    "match": {
      "name": {
        "query": "ノートパソコン 高性能",
        "operator": "and",
        "fuzziness": "AUTO"
      }
    }
  }
}
```

### match_phrase クエリ

語順を保持したフレーズ検索です。

```json
GET /products/_search
{
  "query": {
    "match_phrase": {
      "description": {
        "query": "高性能グラフィック",
        "slop": 2
      }
    }
  }
}
```

### multi_match クエリ

複数フィールドを横断して検索します。

```json
GET /products/_search
{
  "query": {
    "multi_match": {
      "query": "MacBook Pro",
      "fields": ["name^3", "description^1", "tags^2"],
      "type": "best_fields",
      "tie_breaker": 0.3
    }
  }
}
```

`^3`はフィールドのブースト値です。`name`フィールドにマッチした場合のスコアが3倍になります。

### term クエリ

アナライズされない完全一致検索です。`keyword`型フィールドや数値・日付に使います。

```json
GET /products/_search
{
  "query": {
    "term": {
      "category": {
        "value": "electronics"
      }
    }
  }
}
```

### terms クエリ

複数の値のいずれかに一致するドキュメントを検索します。

```json
GET /products/_search
{
  "query": {
    "terms": {
      "category": ["electronics", "computers", "peripherals"]
    }
  }
}
```

### range クエリ

数値・日付の範囲検索です。

```json
GET /products/_search
{
  "query": {
    "range": {
      "price": {
        "gte": 50000,
        "lte": 200000
      }
    }
  }
}
```

日付範囲の例。

```json
GET /products/_search
{
  "query": {
    "range": {
      "created_at": {
        "gte": "now-30d/d",
        "lte": "now/d",
        "format": "strict_date_optional_time"
      }
    }
  }
}
```

### bool クエリ

複数のクエリを組み合わせる最も重要なクエリです。

```json
GET /products/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "name": "ノートパソコン"
          }
        }
      ],
      "filter": [
        {
          "term": {
            "category": "electronics"
          }
        },
        {
          "range": {
            "price": {
              "lte": 150000
            }
          }
        }
      ],
      "should": [
        {
          "term": {
            "tags": "sale"
          }
        }
      ],
      "must_not": [
        {
          "term": {
            "stock": 0
          }
        }
      ],
      "minimum_should_match": 0
    }
  }
}
```

各節の役割は以下の通りです。

- `must`: 必ずマッチ（スコアに影響）
- `filter`: 必ずマッチ（スコアに影響しない・キャッシュされる）
- `should`: マッチするとスコアが上がる
- `must_not`: マッチしないこと（スコアに影響しない）

### fuzzy クエリ

スペルミスに対応したあいまい検索です。

```json
GET /products/_search
{
  "query": {
    "fuzzy": {
      "name": {
        "value": "Macbok",
        "fuzziness": "AUTO",
        "prefix_length": 2
      }
    }
  }
}
```

---

## 6. フィルタリング（filter context vs query context）

### クエリコンテキストとフィルターコンテキスト

Elasticsearchのクエリには2つのコンテキストがあります。

**クエリコンテキスト（query context）**

スコアを計算します。「どのくらい関連しているか」を評価します。`must`・`should`に書いたクエリが該当します。

**フィルターコンテキスト（filter context）**

スコアを計算せず、条件に合致するかどうかだけを判定します。`filter`・`must_not`に書いたクエリが該当します。フィルターコンテキストのクエリはキャッシュされるため、高速です。

```json
GET /products/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "description": "高解像度ディスプレイ"
          }
        }
      ],
      "filter": [
        { "term": { "category": "laptops" } },
        { "range": { "price": { "gte": 80000 } } },
        { "term": { "in_stock": true } }
      ]
    }
  }
}
```

フィルター条件（カテゴリ・価格・在庫）はスコアに影響せず、キャッシュされるため繰り返し実行時のパフォーマンスが向上します。

### exists クエリ

フィールドが存在するドキュメントを検索します。

```json
GET /products/_search
{
  "query": {
    "bool": {
      "filter": [
        { "exists": { "field": "discount_price" } }
      ]
    }
  }
}
```

---

## 7. Aggregation（terms・histogram・avg・min・max・nested）

AggregationはSQLの`GROUP BY`と集計関数に相当します。検索結果に対して統計情報を計算できます。

### terms Aggregation

カテゴリごとの件数を集計します。

```json
GET /products/_search
{
  "size": 0,
  "aggs": {
    "categories": {
      "terms": {
        "field": "category",
        "size": 10,
        "order": { "_count": "desc" }
      }
    }
  }
}
```

`size: 0`で検索結果のヒットを返さず集計結果のみを取得します。

### histogram Aggregation

価格帯ごとの件数を集計します。

```json
GET /products/_search
{
  "size": 0,
  "aggs": {
    "price_ranges": {
      "histogram": {
        "field": "price",
        "interval": 10000,
        "min_doc_count": 1
      }
    }
  }
}
```

### date_histogram Aggregation

日付単位での集計です。

```json
GET /logs/_search
{
  "size": 0,
  "aggs": {
    "requests_per_day": {
      "date_histogram": {
        "field": "timestamp",
        "calendar_interval": "day",
        "format": "yyyy-MM-dd"
      }
    }
  }
}
```

### 統計Aggregation

```json
GET /products/_search
{
  "size": 0,
  "aggs": {
    "avg_price": {
      "avg": { "field": "price" }
    },
    "min_price": {
      "min": { "field": "price" }
    },
    "max_price": {
      "max": { "field": "price" }
    },
    "price_stats": {
      "stats": { "field": "price" }
    },
    "price_percentiles": {
      "percentiles": {
        "field": "price",
        "percents": [25, 50, 75, 95]
      }
    }
  }
}
```

### ネストしたAggregation（サブ集計）

カテゴリごとの平均価格を計算します。

```json
GET /products/_search
{
  "size": 0,
  "aggs": {
    "by_category": {
      "terms": {
        "field": "category",
        "size": 10
      },
      "aggs": {
        "avg_price": {
          "avg": { "field": "price" }
        },
        "price_range": {
          "stats": { "field": "price" }
        }
      }
    }
  }
}
```

### nested Aggregation

`nested`型フィールドに対する集計です。

```json
PUT /orders
{
  "mappings": {
    "properties": {
      "order_id": { "type": "keyword" },
      "items": {
        "type": "nested",
        "properties": {
          "product_id": { "type": "keyword" },
          "quantity": { "type": "integer" },
          "price": { "type": "float" }
        }
      }
    }
  }
}

GET /orders/_search
{
  "size": 0,
  "aggs": {
    "items_agg": {
      "nested": { "path": "items" },
      "aggs": {
        "top_products": {
          "terms": {
            "field": "items.product_id",
            "size": 5
          }
        }
      }
    }
  }
}
```

---

## 8. Node.js統合（@elastic/elasticsearch TypeScript）

### インストールと接続

```bash
npm install @elastic/elasticsearch
npm install -D @types/node
```

```typescript
// src/lib/elasticsearch.ts
import { Client } from '@elastic/elasticsearch';

export const client = new Client({
  node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_API_KEY
    ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
    : undefined,
  tls: {
    rejectUnauthorized: false,
  },
  maxRetries: 3,
  requestTimeout: 30000,
  compression: 'gzip',
});

// 接続確認
export async function checkConnection(): Promise<boolean> {
  try {
    const info = await client.info();
    console.log('Elasticsearch connected:', info.version.number);
    return true;
  } catch (error) {
    console.error('Elasticsearch connection failed:', error);
    return false;
  }
}
```

### 型定義

```typescript
// src/types/product.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  rating: number;
  stock: number;
  created_at: string;
}

export interface SearchResult<T> {
  total: number;
  hits: Array<{
    id: string;
    score: number;
    source: T;
  }>;
  aggregations?: Record<string, unknown>;
}
```

---

## 9. CRUD操作（index・get・update・delete・bulk）

### ドキュメントの作成（index）

```typescript
// src/services/productService.ts
import { client } from '../lib/elasticsearch';
import type { Product } from '../types/product';

const INDEX = 'products';

export async function createProduct(product: Product): Promise<string> {
  const response = await client.index({
    index: INDEX,
    id: product.id,
    document: product,
    refresh: 'wait_for',
  });
  return response._id;
}
```

### ドキュメントの取得（get）

```typescript
export async function getProduct(id: string): Promise<Product | null> {
  try {
    const response = await client.get<Product>({
      index: INDEX,
      id,
    });
    return response._source ?? null;
  } catch (error: unknown) {
    if ((error as { statusCode: number }).statusCode === 404) {
      return null;
    }
    throw error;
  }
}
```

### ドキュメントの更新（update）

```typescript
export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<void> {
  await client.update({
    index: INDEX,
    id,
    doc: updates,
    refresh: 'wait_for',
  });
}

// スクリプトによる部分更新（在庫数の増減など）
export async function adjustStock(id: string, delta: number): Promise<void> {
  await client.update({
    index: INDEX,
    id,
    script: {
      source: 'ctx._source.stock += params.delta',
      lang: 'painless',
      params: { delta },
    },
    refresh: 'wait_for',
  });
}
```

### ドキュメントの削除（delete）

```typescript
export async function deleteProduct(id: string): Promise<void> {
  await client.delete({
    index: INDEX,
    id,
    refresh: 'wait_for',
  });
}

// クエリによる一括削除
export async function deleteByCategory(category: string): Promise<void> {
  await client.deleteByQuery({
    index: INDEX,
    query: {
      term: { category },
    },
    refresh: true,
  });
}
```

### バルク操作（bulk）

大量データを一括処理する場合はBulk APIを使います。

```typescript
export async function bulkIndexProducts(products: Product[]): Promise<void> {
  const operations = products.flatMap((product) => [
    { index: { _index: INDEX, _id: product.id } },
    product,
  ]);

  const response = await client.bulk({
    operations,
    refresh: 'wait_for',
  });

  if (response.errors) {
    const errors = response.items
      .filter((item) => item.index?.error)
      .map((item) => item.index?.error);
    console.error('Bulk index errors:', errors);
    throw new Error(`Bulk operation had ${errors.length} errors`);
  }

  console.log(`Indexed ${response.items.length} products`);
}
```

### 全文検索の実装

```typescript
export async function searchProducts(params: {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  page?: number;
  pageSize?: number;
}): Promise<SearchResult<Product>> {
  const {
    query,
    category,
    minPrice,
    maxPrice,
    tags,
    page = 1,
    pageSize = 20,
  } = params;

  const from = (page - 1) * pageSize;

  const response = await client.search<Product>({
    index: INDEX,
    from,
    size: pageSize,
    query: {
      bool: {
        must: query
          ? [
              {
                multi_match: {
                  query,
                  fields: ['name^3', 'description^1', 'tags^2'],
                  type: 'best_fields',
                  fuzziness: 'AUTO',
                },
              },
            ]
          : [{ match_all: {} }],
        filter: [
          ...(category ? [{ term: { category } }] : []),
          ...(minPrice !== undefined || maxPrice !== undefined
            ? [
                {
                  range: {
                    price: {
                      ...(minPrice !== undefined ? { gte: minPrice } : {}),
                      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                    },
                  },
                },
              ]
            : []),
          ...(tags && tags.length > 0 ? [{ terms: { tags } }] : []),
          { range: { stock: { gt: 0 } } },
        ],
      },
    },
    sort: query
      ? [{ _score: 'desc' }, { rating: 'desc' }]
      : [{ created_at: 'desc' }],
    aggs: {
      categories: {
        terms: { field: 'category', size: 20 },
      },
      price_stats: {
        stats: { field: 'price' },
      },
    },
    highlight: {
      fields: {
        name: { number_of_fragments: 0 },
        description: { fragment_size: 150, number_of_fragments: 3 },
      },
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
    },
  });

  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : (response.hits.total?.value ?? 0);

  return {
    total,
    hits: response.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score ?? 0,
      source: hit._source as Product,
    })),
    aggregations: response.aggregations,
  };
}
```

---

## 10. オートコンプリート（edge_ngram・search_as_you_type）

### edge_ngram を使ったオートコンプリート

インデックス設計のセクションで定義した`autocomplete_analyzer`を活用します。

```typescript
export async function autocomplete(
  prefix: string,
  size = 10
): Promise<string[]> {
  const response = await client.search<Product>({
    index: INDEX,
    size,
    query: {
      match: {
        'name.autocomplete': {
          query: prefix,
          operator: 'and',
        },
      },
    },
    _source: ['name'],
  });

  return response.hits.hits.map((hit) => hit._source?.name ?? '');
}
```

### search_as_you_type フィールドタイプ

Elasticsearch 7.2以降では`search_as_you_type`型が利用できます。

```json
PUT /products_v2
{
  "mappings": {
    "properties": {
      "name": {
        "type": "search_as_you_type",
        "analyzer": "japanese"
      }
    }
  }
}
```

```typescript
export async function suggestProducts(query: string): Promise<string[]> {
  const response = await client.search<Product>({
    index: 'products_v2',
    size: 5,
    query: {
      multi_match: {
        query,
        type: 'bool_prefix',
        fields: ['name', 'name._2gram', 'name._3gram'],
      },
    },
    _source: ['name'],
  });

  return response.hits.hits.map((hit) => hit._source?.name ?? '');
}
```

---

## 11. ハイライト・スペリング修正（highlight・suggest）

### ハイライト

検索キーワードをハイライト表示します。

```typescript
export async function searchWithHighlight(query: string) {
  const response = await client.search<Product>({
    index: INDEX,
    query: {
      multi_match: {
        query,
        fields: ['name', 'description'],
      },
    },
    highlight: {
      pre_tags: ['<em class="highlight">'],
      post_tags: ['</em>'],
      fields: {
        name: {
          number_of_fragments: 0,
        },
        description: {
          fragment_size: 200,
          number_of_fragments: 3,
          fragmenter: 'span',
        },
      },
      require_field_match: false,
    },
  });

  return response.hits.hits.map((hit) => ({
    source: hit._source,
    highlight: hit.highlight,
  }));
}
```

### Suggester（スペリング修正）

`term` suggesterと`phrase` suggesterでスペルミスを修正します。

```json
GET /products/_search
{
  "suggest": {
    "text": "ノートパソコ",
    "name_suggest": {
      "term": {
        "field": "name",
        "suggest_mode": "missing",
        "min_word_length": 2
      }
    }
  }
}
```

`phrase` suggesterで文単位の修正提案。

```json
GET /products/_search
{
  "suggest": {
    "phrase_suggest": {
      "text": "高性能ラップトプ",
      "phrase": {
        "field": "name",
        "size": 3,
        "gram_size": 3,
        "direct_generator": [
          {
            "field": "name",
            "suggest_mode": "always"
          }
        ],
        "highlight": {
          "pre_tag": "<em>",
          "post_tag": "</em>"
        }
      }
    }
  }
}
```

---

## 12. ベクトル検索（kNN・dense_vector）

Elasticsearch 8.0以降、ネイティブのkNN（k-nearest neighbor）ベクトル検索をサポートしています。OpenAIやローカルLLMで生成した埋め込みベクトルを使ったセマンティック検索が実現できます。

### マッピングの設定

```json
PUT /products_vector
{
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "description": { "type": "text" },
      "price": { "type": "integer" },
      "embedding": {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "cosine"
      }
    }
  }
}
```

### 埋め込みベクトルの生成とインデックス

```typescript
import OpenAI from 'openai';
import { client } from '../lib/elasticsearch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

export async function indexProductWithEmbedding(product: Product): Promise<void> {
  const text = `${product.name} ${product.description}`;
  const embedding = await generateEmbedding(text);

  await client.index({
    index: 'products_vector',
    id: product.id,
    document: {
      ...product,
      embedding,
    },
  });
}
```

### kNN検索

```typescript
export async function semanticSearch(
  queryText: string,
  k = 10
): Promise<SearchResult<Product>> {
  const queryEmbedding = await generateEmbedding(queryText);

  const response = await client.search<Product>({
    index: 'products_vector',
    knn: {
      field: 'embedding',
      query_vector: queryEmbedding,
      k,
      num_candidates: 100,
    },
    _source: { excludes: ['embedding'] },
  });

  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : (response.hits.total?.value ?? 0);

  return {
    total,
    hits: response.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score ?? 0,
      source: hit._source as Product,
    })),
  };
}
```

### ハイブリッド検索（全文検索 + ベクトル検索）

全文検索とベクトル検索を組み合わせることで、より精度の高い検索が実現できます。

```typescript
export async function hybridSearch(
  queryText: string,
  k = 10
): Promise<SearchResult<Product>> {
  const queryEmbedding = await generateEmbedding(queryText);

  const response = await client.search<Product>({
    index: 'products_vector',
    query: {
      multi_match: {
        query: queryText,
        fields: ['name^2', 'description'],
      },
    },
    knn: {
      field: 'embedding',
      query_vector: queryEmbedding,
      k,
      num_candidates: 100,
      boost: 0.5,
    },
    _source: { excludes: ['embedding'] },
  });

  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : (response.hits.total?.value ?? 0);

  return {
    total,
    hits: response.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score ?? 0,
      source: hit._source as Product,
    })),
  };
}
```

---

## 13. パフォーマンスチューニング

### シャード設計

シャードはElasticsearchの水平スケーリングの基本単位です。シャード数の設計は後から変更が難しいため、最初に適切に設計することが重要です。

**シャード数の目安**

- 1シャードのサイズ: 10GB〜50GB
- 小規模インデックス（10GB未満）: 1シャード
- 中規模（10GB〜100GB）: 2〜5シャード
- 大規模（100GB以上）: データ量/30GB程度

```json
PUT /products
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "index.refresh_interval": "5s",
    "index.max_result_window": 10000
  }
}
```

### インデックステンプレート

新規インデックス作成時に自動でマッピング・設定を適用します。

```json
PUT /_index_template/products_template
{
  "index_patterns": ["products-*"],
  "priority": 100,
  "template": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1,
      "index.refresh_interval": "10s",
      "index.codec": "best_compression"
    },
    "mappings": {
      "dynamic": "strict",
      "properties": {
        "created_at": {
          "type": "date"
        }
      }
    }
  }
}
```

### クエリキャッシュとフィールドデータキャッシュ

```json
PUT /products/_settings
{
  "index": {
    "requests.cache.enable": true,
    "fielddata.cache.size": "30%"
  }
}
```

フィルターコンテキストのクエリは自動的にキャッシュされます。頻繁に使うフィルター（カテゴリ・価格帯・在庫あり/なし）は必ずfilterコンテキストで記述してください。

### インデックス時のパフォーマンス

大量データのインデックス時には以下の設定が効果的です。

```typescript
// バルクインデックス前の設定変更
async function prepareForBulkIndexing(index: string): Promise<void> {
  await client.indices.putSettings({
    index,
    settings: {
      'index.refresh_interval': '-1',
      'index.number_of_replicas': 0,
    },
  });
}

// インデックス後に元に戻す
async function restoreIndexSettings(index: string): Promise<void> {
  await client.indices.putSettings({
    index,
    settings: {
      'index.refresh_interval': '1s',
      'index.number_of_replicas': 1,
    },
  });

  await client.indices.forcemerge({
    index,
    max_num_segments: 5,
  });
}
```

### スクロールAPIとSearch After

10,000件を超えるページネーションには`search_after`を使います。

```typescript
export async function paginateWithSearchAfter(
  lastSort?: unknown[]
): Promise<{ hits: Product[]; searchAfter: unknown[] | null }> {
  const response = await client.search<Product>({
    index: INDEX,
    size: 100,
    sort: [
      { created_at: 'desc' },
      { _id: 'asc' },
    ],
    ...(lastSort ? { search_after: lastSort } : {}),
    query: { match_all: {} },
  });

  const hits = response.hits.hits;

  return {
    hits: hits.map((h) => h._source as Product),
    searchAfter:
      hits.length > 0
        ? (hits[hits.length - 1].sort as unknown[] ?? null)
        : null,
  };
}
```

### エイリアスとゼロダウンタイムインデックス再作成

インデックスのマッピング変更（再インデックス）をゼロダウンタイムで行います。

```typescript
async function reindexWithAlias(
  sourceIndex: string,
  destIndex: string,
  aliasName: string
): Promise<void> {
  // 1. 新しいインデックスを作成
  await client.indices.create({ index: destIndex });

  // 2. reindex APIでデータをコピー
  await client.reindex({
    source: { index: sourceIndex },
    dest: { index: destIndex },
    refresh: true,
  });

  // 3. エイリアスを原子的に切り替え
  await client.indices.updateAliases({
    actions: [
      { remove: { index: sourceIndex, alias: aliasName } },
      { add: { index: destIndex, alias: aliasName } },
    ],
  });

  // 4. 旧インデックスを削除
  await client.indices.delete({ index: sourceIndex });
}
```

### モニタリングとKibana

Kibanaの以下のツールを活用してパフォーマンスを監視します。

- **Dev Tools**: クエリのテスト・Explain APIでスコア分析
- **Stack Monitoring**: クラスターヘルス・シャード状態・JVMメモリ
- **Discover**: ログ・ドキュメントのリアルタイム確認
- **Dashboard**: カスタムKPIダッシュボードの作成

Explain APIはクエリスコアのデバッグに不可欠です。

```json
GET /products/_explain/document-id
{
  "query": {
    "match": {
      "name": "ノートパソコン"
    }
  }
}
```

### スロークエリログの設定

```json
PUT /products/_settings
{
  "index.search.slowlog.threshold.query.warn": "5s",
  "index.search.slowlog.threshold.query.info": "1s",
  "index.search.slowlog.threshold.fetch.warn": "1s",
  "index.indexing.slowlog.threshold.index.warn": "5s"
}
```

---

## 実践: ECサイト検索の完全実装

### Next.js APIルートでの実装例

```typescript
// app/api/products/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/services/productService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? undefined;
  const minPrice = searchParams.get('min_price')
    ? Number(searchParams.get('min_price'))
    : undefined;
  const maxPrice = searchParams.get('max_price')
    ? Number(searchParams.get('max_price'))
    : undefined;
  const page = Number(searchParams.get('page') ?? '1');

  try {
    const result = await searchProducts({
      query,
      category,
      minPrice,
      maxPrice,
      page,
      pageSize: 20,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
```

### Reactコンポーネントでの使用

```typescript
// components/ProductSearch.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  total: number;
  hits: Array<{ id: string; score: number; source: Product }>;
}

export function ProductSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      const response = await fetch(`/api/products/search?${params}`);
      const data: SearchResult = await response.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="商品を検索..."
        className="w-full border rounded px-4 py-2"
      />
      {loading && <p>検索中...</p>}
      {results && (
        <div>
          <p>{results.total}件の商品が見つかりました</p>
          {results.hits.map(({ id, source }) => (
            <div key={id}>
              <h3>{source.name}</h3>
              <p>{source.price.toLocaleString()}円</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## まとめ

Elasticsearchは単なる検索エンジンにとどまらず、ログ分析・ビジネスインテリジェンス・ベクトル検索まで幅広く活用できるプラットフォームです。本記事で解説したポイントを整理します。

**インデックス設計のポイント**

- マッピングは最初に正しく設計する（後から変更はreindex）
- 日本語はkuromojiアナライザーを必ず設定する
- 検索対象は`text`、集計・ソート・完全一致は`keyword`

**クエリ設計のポイント**

- 関連度スコアが必要な条件は`must`、スコア不要な絞り込みは`filter`
- `filter`はキャッシュされるため繰り返し使うフィルターは必ずfilterコンテキストで
- 大量データのページネーションは`search_after`を使う

**パフォーマンスのポイント**

- シャード数は最初に設計し、1シャード10〜50GBを目安にする
- 大量インデックス時は`refresh_interval: -1`で一時的に無効化する
- エイリアスを使えばゼロダウンタイムでインデックスを再作成できる

---

## 開発を加速するJSON検証ツール

ElasticsearchのクエリDSLはJSONで記述します。クエリを組み立てる際にJSONの構文エラーが発生すると、デバッグに時間を取られます。

[DevToolBox](https://usedevtools.com/) には**JSONフォーマッター・バリデーター**が含まれており、Elasticsearchクエリの構文検証に役立ちます。クエリをコピーしてそのまま貼り付けると、ネストの誤りやカンマ抜けをすぐに発見できます。Kibana Dev Toolsと組み合わせて使うと、開発サイクルをさらに短縮できます。

---

## 参考リンク

- [Elasticsearch 公式ドキュメント](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [analysis-kuromoji プラグイン](https://www.elastic.co/guide/en/elasticsearch/plugins/current/analysis-kuromoji.html)
- [@elastic/elasticsearch Node.js クライアント](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
- [Kibana ドキュメント](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Elasticsearch kNN search](https://www.elastic.co/guide/en/elasticsearch/reference/current/knn-search.html)
