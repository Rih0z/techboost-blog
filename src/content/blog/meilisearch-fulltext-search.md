---
title: 'Meilisearch全文検索エンジン入門：高速・タイポ耐性・簡単セットアップ'
description: 'オープンソース全文検索エンジンMeilisearchの完全ガイド。インデックス作成、ファセット検索、タイポ耐性、JavaScript SDKの使い方を実践的なコード例とともに詳しく解説します。Meilisearch・全文検索・Searchに関する実践情報。'
pubDate: '2026-02-06'
tags: ['Meilisearch', '全文検索', 'Search', 'JavaScript', 'TypeScript']
---
Meilisearchは、ElasticsearchやAlgoliaのようなパワフルな検索機能を、驚くほど簡単にセットアップできるオープンソース全文検索エンジンです。この記事では、Meilisearchの基本から実践的な活用法まで詳しく解説します。

## Meilisearchとは

Meilisearchは、Rustで書かれた高速・軽量・使いやすい全文検索エンジンです。

### 主な特徴

- **超高速** - ミリ秒単位でのレスポンス
- **タイポ耐性** - スペルミスを自動修正
- **シンプルAPI** - RESTful APIで簡単に統合
- **フィルタリング** - ファセット検索、範囲検索
- **ハイライト** - 検索結果のマッチ箇所を強調
- **多言語対応** - 日本語を含む多言語サポート
- **セルフホスト可能** - 完全にオープンソース

## インストール

### Docker（推奨）

```bash
# Dockerで起動
docker run -d \
  --name meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=YOUR_MASTER_KEY_HERE \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:latest

# 起動確認
curl http://localhost:7700/health
```

### バイナリで直接インストール

```bash
# macOS（Homebrew）
brew install meilisearch

# Linux
curl -L https://install.meilisearch.com | sh

# 起動
meilisearch --master-key=YOUR_MASTER_KEY_HERE
```

### Node.jsクライアントのインストール

```bash
npm install meilisearch
```

## 基本的な使い方

### インデックスの作成とドキュメント追加

```typescript
// meilisearch-client.ts
import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'YOUR_MASTER_KEY_HERE',
});

// インデックスを作成
const index = await client.createIndex('movies', {
  primaryKey: 'id',
});

// ドキュメントを追加
const movies = [
  {
    id: 1,
    title: 'The Shawshank Redemption',
    genre: 'Drama',
    year: 1994,
    rating: 9.3,
    director: 'Frank Darabont',
  },
  {
    id: 2,
    title: 'The Godfather',
    genre: 'Crime',
    year: 1972,
    rating: 9.2,
    director: 'Francis Ford Coppola',
  },
  {
    id: 3,
    title: 'The Dark Knight',
    genre: 'Action',
    year: 2008,
    rating: 9.0,
    director: 'Christopher Nolan',
  },
];

// ドキュメントを一括追加
const task = await client.index('movies').addDocuments(movies);
console.log('Task UID:', task.taskUid);

// タスクの完了を待つ
await client.waitForTask(task.taskUid);
```

### 基本的な検索

```typescript
// movies.ts
import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'YOUR_MASTER_KEY_HERE',
});

// シンプルな検索
const results = await client.index('movies').search('godfather');
console.log(results.hits);
// [{ id: 2, title: 'The Godfather', ... }]

// タイポ耐性（自動修正）
const typoResults = await client.index('movies').search('godfater');
console.log(typoResults.hits);
// [{ id: 2, title: 'The Godfather', ... }] ← スペルミスでも見つかる
```

## Next.jsとの統合

### サーバー側での検索API

```typescript
// app/api/search/route.ts
import { MeiliSearch } from 'meilisearch';
import { NextRequest, NextResponse } from 'next/server';

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY,
});

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const filter = searchParams.get('filter');

  try {
    const results = await client.index('movies').search(query, {
      limit: 20,
      filter: filter || undefined,
      attributesToHighlight: ['title'],
    });

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
```

### クライアント側の検索コンポーネント

```typescript
// components/SearchBox.tsx
'use client';

import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

interface SearchResult {
  id: number;
  title: string;
  genre: string;
  year: number;
  rating: number;
  _formatted?: {
    title: string;
  };
}

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // デバウンス付き検索
  const search = debounce(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      setResults(data.hits);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    search(query);
  }, [query]);

  return (
    <div className="search-container">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movies..."
        className="search-input"
      />

      {loading && <div className="loading">Searching...</div>}

      <ul className="results">
        {results.map((result) => (
          <li key={result.id} className="result-item">
            {/* ハイライト表示 */}
            <h3
              dangerouslySetInnerHTML={{
                __html: result._formatted?.title || result.title,
              }}
            />
            <p>
              {result.genre} • {result.year} • ★{result.rating}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## フィルタリングとファセット検索

### 設定可能な属性を定義

```typescript
// インデックス設定
await client.index('movies').updateSettings({
  filterableAttributes: ['genre', 'year', 'rating'],
  sortableAttributes: ['year', 'rating'],
  searchableAttributes: ['title', 'director'],
});
```

### フィルタ検索

```typescript
// ジャンルでフィルタ
const results = await client.index('movies').search('', {
  filter: 'genre = Drama',
});

// 複数条件（AND）
const results2 = await client.index('movies').search('', {
  filter: ['genre = Drama', 'year > 1990'],
});

// 複数条件（OR）
const results3 = await client.index('movies').search('', {
  filter: 'genre = Drama OR genre = Action',
});

// 範囲検索
const results4 = await client.index('movies').search('', {
  filter: 'rating >= 9.0 AND year >= 2000',
});
```

### ファセットカウント

```typescript
// ファセットを取得
const results = await client.index('movies').search('action', {
  facets: ['genre', 'year'],
});

console.log(results.facetDistribution);
// {
//   genre: { Action: 15, Drama: 8, Comedy: 3 },
//   year: { 2020: 5, 2021: 8, 2022: 12 }
// }
```

### ファセット付き検索UI

```typescript
// components/FacetedSearch.tsx
'use client';

import { useState, useEffect } from 'react';

interface FacetDistribution {
  [key: string]: { [value: string]: number };
}

export default function FacetedSearch() {
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [results, setResults] = useState([]);
  const [facets, setFacets] = useState<FacetDistribution>({});

  const search = async () => {
    const params = new URLSearchParams({ q: query });
    if (selectedGenre) {
      params.append('filter', `genre = ${selectedGenre}`);
    }

    const response = await fetch(`/api/search?${params}`);
    const data = await response.json();

    setResults(data.hits);
    setFacets(data.facetDistribution || {});
  };

  useEffect(() => {
    search();
  }, [query, selectedGenre]);

  return (
    <div className="flex gap-4">
      {/* サイドバー: ファセット */}
      <aside className="w-64">
        <h3>Genre</h3>
        <ul>
          <li>
            <button onClick={() => setSelectedGenre(null)}>
              All ({Object.values(facets.genre || {}).reduce((a, b) => a + b, 0)})
            </button>
          </li>
          {Object.entries(facets.genre || {}).map(([genre, count]) => (
            <li key={genre}>
              <button
                onClick={() => setSelectedGenre(genre)}
                className={selectedGenre === genre ? 'font-bold' : ''}
              >
                {genre} ({count})
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* メイン: 検索結果 */}
      <main className="flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
        />

        <ul>
          {results.map((result: any) => (
            <li key={result.id}>{result.title}</li>
          ))}
        </ul>
      </main>
    </div>
  );
}
```

## ソート

```typescript
// 評価でソート（降順）
const results = await client.index('movies').search('', {
  sort: ['rating:desc'],
});

// 複数ソート条件
const results2 = await client.index('movies').search('', {
  sort: ['year:desc', 'rating:desc'],
});

// 検索結果の関連性とソート条件を組み合わせ
const results3 = await client.index('movies').search('action', {
  sort: ['rating:desc'],
});
```

## ページネーション

```typescript
// 基本的なページネーション
const results = await client.index('movies').search('action', {
  limit: 20,
  offset: 0,
});

console.log(results.hits);        // 検索結果
console.log(results.estimatedTotalHits);  // 総ヒット数

// ページ2
const page2 = await client.index('movies').search('action', {
  limit: 20,
  offset: 20,
});
```

## 日本語検索

Meilisearchは日本語検索にも対応しています。

```typescript
// 日本語ドキュメントを追加
const japaneseMovies = [
  {
    id: 1,
    title: '千と千尋の神隠し',
    director: '宮崎駿',
    year: 2001,
    genre: 'アニメ',
  },
  {
    id: 2,
    title: '君の名は。',
    director: '新海誠',
    year: 2016,
    genre: 'アニメ',
  },
];

await client.index('japanese-movies').addDocuments(japaneseMovies);

// 日本語検索
const results = await client.index('japanese-movies').search('千尋');
// [{ id: 1, title: '千と千尋の神隠し', ... }]

// 部分一致
const results2 = await client.index('japanese-movies').search('新海');
// [{ id: 2, title: '君の名は。', director: '新海誠', ... }]
```

## インデックスの更新と削除

```typescript
// ドキュメントを更新（部分更新）
await client.index('movies').updateDocuments([
  { id: 1, rating: 9.5 },  // ratingだけ更新
]);

// ドキュメントを完全に置き換え
await client.index('movies').addDocuments(
  [{ id: 1, title: 'Updated Title', genre: 'Drama', year: 1994, rating: 9.5 }],
  { primaryKey: 'id' }
);

// ドキュメントを削除
await client.index('movies').deleteDocument(1);

// 複数削除
await client.index('movies').deleteDocuments([1, 2, 3]);

// 条件に一致するドキュメントを削除
await client.index('movies').deleteDocuments({
  filter: 'year < 1990',
});

// インデックス全体を削除
await client.deleteIndex('movies');
```

## マルチテナント対応

```typescript
// テナントごとのインデックス
const createTenantIndex = async (tenantId: string) => {
  const indexName = `tenant_${tenantId}_products`;
  await client.createIndex(indexName, { primaryKey: 'id' });
  return client.index(indexName);
};

// 検索時にテナントIDを使う
const searchTenant = async (tenantId: string, query: string) => {
  const indexName = `tenant_${tenantId}_products`;
  return await client.index(indexName).search(query);
};
```

## パフォーマンス最適化

### インデックス設定の最適化

```typescript
await client.index('movies').updateSettings({
  // 検索対象の属性を制限
  searchableAttributes: ['title', 'director'],

  // 表示する属性を制限
  displayedAttributes: ['id', 'title', 'year', 'rating'],

  // ランキングルールをカスタマイズ
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
    'rating:desc',  // カスタムルール
  ],

  // タイポ耐性の設定
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 5,
      twoTypos: 9,
    },
  },
});
```

### バッチ処理

```typescript
// 大量のドキュメントを追加する場合はバッチで
const batchSize = 1000;
const allMovies = [...]; // 10000件のデータ

for (let i = 0; i < allMovies.length; i += batchSize) {
  const batch = allMovies.slice(i, i + batchSize);
  const task = await client.index('movies').addDocuments(batch);
  await client.waitForTask(task.taskUid);
  console.log(`Indexed ${i + batch.length} / ${allMovies.length}`);
}
```

## セキュリティ

### APIキーの管理

```typescript
// マスターキーで新しいAPIキーを作成
const searchKey = await client.createKey({
  description: 'Search-only key for frontend',
  actions: ['search'],
  indexes: ['movies'],
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
});

console.log('Search Key:', searchKey.key);
```

フロントエンドでは検索専用キーを使用します。

```typescript
// フロントエンドで使用
const client = new MeiliSearch({
  host: 'https://your-meilisearch.com',
  apiKey: 'SEARCH_ONLY_KEY',  // 検索専用キー
});
```

## まとめ

Meilisearchの主な利点をまとめます。

- **簡単セットアップ** - Docker一発で起動
- **超高速検索** - ミリ秒単位のレスポンス
- **タイポ耐性** - スペルミスを自動修正
- **ファセット検索** - フィルタとカウント
- **多言語対応** - 日本語も完全サポート
- **RESTful API** - あらゆる言語から利用可能

ElasticsearchやAlgoliaに比べて、Meilisearchは驚くほど簡単にセットアップでき、それでいてパワフルです。ECサイト、ブログ、ドキュメント検索など、あらゆる検索機能に最適です。

今すぐMeilisearchを試して、ユーザー体験を劇的に向上させましょう。
