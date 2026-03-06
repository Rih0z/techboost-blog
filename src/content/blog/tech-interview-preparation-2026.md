---
title: "エンジニア技術面接対策2026完全ガイド - コーディングテスト・システムデザイン・行動面接"
description: "2026年最新の技術面接対策を徹底解説。データ構造・アルゴリズム、システムデザイン、コーディングテスト、行動面接（STAR法）、おすすめ学習リソースまで網羅した完全ガイドです。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2026-02-05"
tags: ["技術面接", "アルゴリズム", "システムデザイン", "キャリア", "LeetCode"]
---
## はじめに

エンジニアの技術面接は、2026年現在、以下の要素で構成されています。

1. **コーディングテスト**: データ構造・アルゴリズム
2. **システムデザイン面接**: スケーラブルなアーキテクチャ設計
3. **行動面接**: STAR法による過去の経験の共有
4. **技術的な会話**: プロジェクト経験、技術選定の理由

この記事では、GAFAM（Google、Apple、Facebook（Meta）、Amazon、Microsoft）レベルの企業から、スタートアップまで、幅広い企業の技術面接を突破するための対策を解説します。

## 技術面接の全体像

### 企業別面接プロセス（2026年）

#### Google
1. 電話スクリーニング（コーディング）
2. オンサイト4〜5回
   - コーディング×2〜3
   - システムデザイン×1
   - 行動面接×1
3. Team Matching（チーム配属）

#### Meta（Facebook）
1. リクルータースクリーニング
2. 電話スクリーニング（コーディング）
3. オンサイト4〜5回
   - コーディング×2
   - システムデザイン×1〜2
   - 行動面接×1
4. 最終面接

#### Amazon
1. オンライン評価（OA: Online Assessment）
2. 電話スクリーニング
3. オンサイト（Virtual Onsite）
   - コーディング×1〜2
   - システムデザイン×1
   - バーレイザー（行動面接）×1〜2

#### Microsoft
1. リクルータースクリーニング
2. 電話スクリーニング
3. オンサイト4〜5回
   - コーディング×2〜3
   - システムデザイン×1
   - 行動面接×1

### 日本企業（メルカリ、LINE、楽天等）
- コーディングテスト（AtCoder、独自問題）
- 技術面接（アルゴリズム + プロジェクト経験）
- システムデザイン（シニア以上）
- カルチャーフィット面接

## 1. データ構造とアルゴリズム

### 必須の基礎知識

#### データ構造

| データ構造 | 計算量（平均） | 用途 |
|---|---|---|
| **配列（Array）** | 参照: O(1)、挿入/削除: O(n) | 固定サイズのデータ |
| **連結リスト（Linked List）** | 参照: O(n)、挿入/削除: O(1) | 動的なデータ |
| **スタック（Stack）** | push/pop: O(1) | DFS、括弧検証 |
| **キュー（Queue）** | enqueue/dequeue: O(1) | BFS、タスク処理 |
| **ハッシュテーブル（HashMap）** | 参照/挿入/削除: O(1) | 高速検索 |
| **ヒープ（Heap）** | 挿入/削除: O(log n) | 優先度付きキュー |
| **二分探索木（BST）** | 参照/挿入/削除: O(log n) | ソート済みデータ |
| **グラフ（Graph）** | - | ネットワーク、経路探索 |
| **トライ木（Trie）** | 挿入/検索: O(m) | 文字列検索 |

#### アルゴリズム

| 分野 | 重要アルゴリズム |
|---|---|
| **ソート** | クイックソート、マージソート、ヒープソート |
| **探索** | 二分探索、DFS、BFS |
| **動的計画法** | ナップサック、最長共通部分列（LCS） |
| **グラフ** | ダイクストラ法、ベルマンフォード、Union-Find |
| **文字列** | KMP法、ローリングハッシュ |
| **その他** | スライディングウィンドウ、Two Pointers |

### 頻出パターン別攻略

#### パターン1: Two Pointers（2つのポインタ）

**問題例**: 「ソート済み配列から、合計がターゲット値になる2つの数を見つける」

```typescript
function twoSum(nums: number[], target: number): number[] {
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const sum = nums[left] + nums[right];

    if (sum === target) {
      return [left, right];
    } else if (sum < target) {
      left++;
    } else {
      right--;
    }
  }

  return [-1, -1];
}

// 時間計算量: O(n)
// 空間計算量: O(1)
```

**適用問題**:
- LeetCode 167: Two Sum II
- LeetCode 15: 3Sum
- LeetCode 11: Container With Most Water

#### パターン2: Sliding Window（スライディングウィンドウ）

**問題例**: 「最大K個の異なる文字を含む最長部分文字列の長さ」

```typescript
function lengthOfLongestSubstringKDistinct(s: string, k: number): number {
  const charCount = new Map<string, number>();
  let left = 0;
  let maxLength = 0;

  for (let right = 0; right < s.length; right++) {
    // 右端の文字を追加
    charCount.set(s[right], (charCount.get(s[right]) || 0) + 1);

    // ウィンドウが条件を満たさない場合、左端を縮める
    while (charCount.size > k) {
      charCount.set(s[left], charCount.get(s[left])! - 1);
      if (charCount.get(s[left]) === 0) {
        charCount.delete(s[left]);
      }
      left++;
    }

    maxLength = Math.max(maxLength, right - left + 1);
  }

  return maxLength;
}

// 時間計算量: O(n)
```

**適用問題**:
- LeetCode 3: Longest Substring Without Repeating Characters
- LeetCode 76: Minimum Window Substring
- LeetCode 438: Find All Anagrams in a String

#### パターン3: Dynamic Programming（動的計画法）

**問題例**: 「コインの組み合わせで金額を作る最小枚数」

```typescript
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (i >= coin) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}

// 時間計算量: O(amount × coins.length)
// 空間計算量: O(amount)
```

**適用問題**:
- LeetCode 70: Climbing Stairs
- LeetCode 139: Word Break
- LeetCode 300: Longest Increasing Subsequence

#### パターン4: BFS/DFS（幅優先探索/深さ優先探索）

**BFS例**: 「グリッド内の最短経路」

```typescript
function shortestPath(grid: number[][]): number {
  const rows = grid.length;
  const cols = grid[0].length;
  const queue: [number, number, number][] = [[0, 0, 1]]; // [row, col, distance]
  const visited = new Set<string>();
  visited.add('0,0');

  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  while (queue.length > 0) {
    const [row, col, dist] = queue.shift()!;

    // ゴール到達
    if (row === rows - 1 && col === cols - 1) {
      return dist;
    }

    // 4方向に探索
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      const key = `${newRow},${newCol}`;

      if (
        newRow >= 0 && newRow < rows &&
        newCol >= 0 && newCol < cols &&
        grid[newRow][newCol] === 0 &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push([newRow, newCol, dist + 1]);
      }
    }
  }

  return -1;
}
```

**DFS例**: 「島の数」

```typescript
function numIslands(grid: string[][]): number {
  if (grid.length === 0) return 0;

  let count = 0;
  const rows = grid.length;
  const cols = grid[0].length;

  function dfs(row: number, col: number) {
    if (
      row < 0 || row >= rows ||
      col < 0 || col >= cols ||
      grid[row][col] === '0'
    ) {
      return;
    }

    grid[row][col] = '0'; // 訪問済みマーク

    dfs(row + 1, col);
    dfs(row - 1, col);
    dfs(row, col + 1);
    dfs(row, col - 1);
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col] === '1') {
        count++;
        dfs(row, col);
      }
    }
  }

  return count;
}
```

**適用問題**:
- LeetCode 200: Number of Islands
- LeetCode 102: Binary Tree Level Order Traversal
- LeetCode 133: Clone Graph

### 学習ステップ（3ヶ月プラン）

#### 1ヶ月目: 基礎固め

**Week 1-2: データ構造**
- 配列、連結リスト、スタック、キュー
- LeetCode Easy: 10問/週

**Week 3-4: 基本アルゴリズム**
- ソート、二分探索
- LeetCode Easy: 15問/週

#### 2ヶ月目: パターン習得

**Week 5-6: 頻出パターン**
- Two Pointers、Sliding Window
- LeetCode Medium: 10問/週

**Week 7-8: グラフ・DP**
- BFS/DFS、動的計画法入門
- LeetCode Medium: 10問/週

#### 3ヶ月目: 実践

**Week 9-10: 難問チャレンジ**
- LeetCode Hard: 5問/週
- 過去に解いた問題の復習

**Week 11-12: 模擬面接**
- モックインタビュー（Pramp、Interviewing.io）
- 時間制限付き（45分）で問題を解く

## 2. システムデザイン面接

### システムデザイン面接の流れ

1. **要件定義**（5分）
   - 機能要件の確認
   - 非機能要件（スケール、レイテンシ等）の確認

2. **概算見積もり**（5分）
   - ユーザー数、トラフィック、ストレージ

3. **高レベル設計**（10分）
   - システム全体の構成図
   - 主要コンポーネント

4. **詳細設計**（20分）
   - データベース設計
   - API設計
   - スケーリング戦略

5. **トレードオフ議論**（5分）
   - 設計の長所・短所
   - 代替案の検討

### 例題: Twitterライクなシステム

#### 1. 要件定義

**機能要件:**
- ツイート投稿（280文字、画像/動画）
- タイムライン表示（フォロー中のユーザー）
- フォロー/フォロー解除
- いいね、リツイート

**非機能要件:**
- DAU: 3億人
- ツイート: 5億件/日（6,000/秒、ピーク時30,000/秒）
- タイムライン読み込み: 100msec以下
- 可用性: 99.99%

#### 2. 概算見積もり

**ストレージ:**
- ツイート: 300バイト/件
- 5億件/日 × 300バイト = 150GB/日 ≈ 5TB/月
- 5年間: 300TB

**帯域幅:**
- 書き込み: 30,000 req/s × 300バイト ≈ 9MB/s
- 読み込み: 書き込みの10倍 ≈ 90MB/s

#### 3. 高レベル設計

```
[クライアント]
     ↓
[CDN]（静的コンテンツ）
     ↓
[Load Balancer]
     ↓
┌───────────────────┐
│  Application Tier │
│  (API Servers)    │
└───────────────────┘
     ↓          ↓
[Cache]    [DB Cluster]
 (Redis)    (PostgreSQL)
     ↓
[Message Queue]
 (Kafka)
     ↓
[Background Workers]
 (タイムライン生成)
```

#### 4. 詳細設計

**データベース設計:**

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ツイートテーブル
CREATE TABLE tweets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  content TEXT NOT NULL,
  media_urls TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_created (user_id, created_at DESC)
);

-- フォローテーブル
CREATE TABLE follows (
  follower_id BIGINT REFERENCES users(id),
  followee_id BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id),
  INDEX idx_followee (followee_id)
);

-- いいねテーブル
CREATE TABLE likes (
  user_id BIGINT REFERENCES users(id),
  tweet_id BIGINT REFERENCES tweets(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, tweet_id),
  INDEX idx_tweet (tweet_id)
);
```

**API設計:**

```
POST   /api/v1/tweets              # ツイート投稿
GET    /api/v1/timeline             # タイムライン取得
GET    /api/v1/tweets/:id           # ツイート取得
POST   /api/v1/users/:id/follow     # フォロー
DELETE /api/v1/users/:id/follow     # フォロー解除
POST   /api/v1/tweets/:id/like      # いいね
```

**タイムライン生成戦略:**

**方法1: Fan-out on Write（書き込み時配信）**

```
ツイート投稿時:
1. ツイートをDBに保存
2. フォロワー全員のタイムラインキャッシュにツイートIDを追加
   （Redisの Sorted Set: key=user:{id}:timeline, score=timestamp）

タイムライン取得時:
1. Redisから最新100件のツイートIDを取得
2. ツイート詳細をバッチ取得
```

**長所**: 読み込み高速（O(1)）
**短所**: フォロワー多数の場合、書き込みコスト大

**方法2: Fan-out on Read（読み込み時生成）**

```
タイムライン取得時:
1. フォロー中のユーザーリストを取得
2. 各ユーザーの最新ツイートを取得してマージ
```

**長所**: 書き込み高速
**短所**: 読み込み遅延

**ハイブリッド方式（推奨）:**
- 一般ユーザー: Fan-out on Write
- セレブ（フォロワー100万人以上）: Fan-out on Read
- タイムライン取得時に両方をマージ

#### 5. スケーリング戦略

**データベース:**
- **シャーディング**: ユーザーIDでハッシュ分割
- **レプリケーション**: マスター/スレーブ構成
- **パーティショニング**: 古いツイートは別パーティション

**キャッシュ:**
- **Redis Cluster**: タイムライン、ユーザー情報
- **TTL**: 1時間（タイムライン）、24時間（ユーザー情報）

**CDN:**
- 画像/動画をCloudflare CDNで配信
- CloudFront（AWS）との組み合わせ

**非同期処理:**
- Kafkaでツイート配信イベントをキュー
- Background Workerでタイムライン生成

### 学習リソース

- **本**: 『システム設計の面接試験』（Alex Xu著）
- **動画**: Gaurav Sen（YouTube）
- **コース**: Grokking the System Design Interview（Educative）

## 3. 行動面接（STAR法）

### STAR法とは

**S**ituation（状況）: 背景・文脈
**T**ask（課題）: あなたの役割・目標
**A**ction（行動）: 具体的に何をしたか
**R**esult（結果）: 成果・学び

### 頻出質問と回答例

#### Q1: 「困難なプロジェクトを乗り越えた経験を教えてください」

**回答例:**

**S（状況）:**
「前職で、レガシーシステムのマイグレーションプロジェクトに参加しました。10年前のPHPコードベースをNext.js + Supabaseに移行する、6ヶ月のプロジェクトでした。」

**T（課題）:**
「技術スタックの大幅変更により、3ヶ月時点で進捗が予定の50%しかなく、リリース延期のリスクがありました。私はフロントエンド開発のリーダーとして、納期を守る責任がありました。」

**A（行動）:**
「まず、ボトルネックを分析し、API統合部分が遅延の主因だと特定しました。そこで、以下の3つの施策を実行しました:
1. API Mockサーバーを構築し、フロント/バックの並行開発を実現
2. 週次の技術デモを導入し、早期フィードバックループを確立
3. 再利用可能なコンポーネントライブラリを作成し、開発速度を30%向上」

**R（結果）:**
「最終的に、予定通り6ヶ月でリリースを達成しました。さらに、新システムはページ読み込み速度が3秒→0.8秒に改善され、ユーザー満足度が15%向上しました。このプロジェクトで、リスク管理とチームコミュニケーションの重要性を学びました。」

#### Q2: 「チームでの意見対立をどう解決しましたか？」

**回答例:**

**S:** 「新機能の技術選定で、チーム内でReact vs Vue.jsの意見が対立しました。」

**T:** 「プロジェクトの開始が2週間遅れるリスクがあり、早期に合意形成する必要がありました。」

**A:** 「以下のアプローチで解決しました:
1. 双方の意見を整理し、判断基準（学習コスト、エコシステム、採用市場）を明確化
2. 小規模なPoCを両方で実施し、定量的なデータを取得
3. ステークホルダー（採用担当）にもヒアリングし、採用市場の観点を追加」

**R:** 「最終的にReactを選択し、全員が納得しました。このプロセスで、感情ではなくデータに基づく意思決定の重要性を学びました。」

### Amazonリーダーシップ・プリンシプル

Amazonの面接では、16のリーダーシップ・プリンシプルに基づいた質問があります。

1. **Customer Obsession（顧客志向）**
2. **Ownership（オーナーシップ）**
3. **Invent and Simplify（発明と簡素化）**
4. **Learn and Be Curious（学び続ける）**
5. **Hire and Develop the Best（最高の人材を採用・育成）**
...（全16項目）

**対策:** 各プリンシプルに対応するエピソードを2〜3個準備

## 4. おすすめ学習リソース

### コーディング練習

#### LeetCode
- **URL**: https://leetcode.com/
- **プラン**: Premium $35/月（企業別問題にアクセス）
- **推奨**: LeetCode 75（厳選75問）、Blind 75

#### AtCoder（日本語）
- **URL**: https://atcoder.jp/
- **特徴**: 日本企業の面接対策に最適
- **推奨**: 茶色〜緑色レベル（ABC問題）

#### HackerRank
- **URL**: https://www.hackerrank.com/
- **特徴**: SQL、Linux問題も充実

#### Pramp（モック面接）
- **URL**: https://www.pramp.com/
- **特徴**: 無料でピアと模擬面接

### システムデザイン

#### 書籍
- 『システム設計の面接試験』（Alex Xu）
- 『Designing Data-Intensive Applications』（Martin Kleppmann）

#### 動画
- **Gaurav Sen**: https://www.youtube.com/c/GauravSensei
- **System Design Interview**: https://www.youtube.com/@SystemDesignInterview

#### コース
- **Grokking the System Design Interview**（Educative）
- **ByteByteGo**（Alex Xu）

### 総合

#### Blind（コミュニティ）
- **URL**: https://www.teamblind.com/
- **特徴**: 現役エンジニアの面接体験談

## まとめ

### 3ヶ月対策ロードマップ

#### 1ヶ月目: 基礎
- LeetCode Easy: 50問
- データ構造の復習
- STAR法でエピソード整理

#### 2ヶ月目: 応用
- LeetCode Medium: 50問
- システムデザイン基礎学習
- モック面接（週1回）

#### 3ヶ月目: 実践
- LeetCode Hard: 20問
- システムデザイン模擬面接
- 企業別の過去問演習

### 面接当日のTips

1. **コーディング面接**
   - 問題を声に出して理解確認
   - エッジケースを質問
   - 計算量を明示

2. **システムデザイン**
   - 要件を必ず確認
   - 質問を恐れない
   - トレードオフを議論

3. **行動面接**
   - STAR法で簡潔に
   - 具体的な数字を使う
   - 学びを強調

技術面接は準備が全てです。この記事のロードマップを参考に、計画的に対策を進めてください。あなたの成功を祈っています！

Good luck!
