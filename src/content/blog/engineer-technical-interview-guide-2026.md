---
title: "エンジニア技術面接完全対策2026：コーディング・システム設計"
description: "2026年版エンジニア技術面接の完全対策ガイド。書類選考・ポートフォリオ準備からコーディングテストのアルゴリズム頻出問題（TypeScript例付き）、システム設計面接の回答フレームワーク、行動面接のSTAR法まで4フェーズ別に実践的な準備方法を解説します。"
pubDate: "2026-03-06"
tags: ['career', 'キャリア', 'TypeScript']
heroImage: '../../assets/thumbnails/engineer-technical-interview-guide-2026.jpg'
---

## はじめに：2026年の技術面接の全体像

2026年のエンジニア技術面接は、以下の4つのフェーズで構成されることが一般的です。

| フェーズ | 内容 | 時間 | 評価基準 |
|---------|------|------|---------|
| 書類選考 | 職務経歴書・ポートフォリオ | - | 経験・スキルマッチ |
| コーディングテスト | アルゴリズム・データ構造 | 60-90分 | 問題解決能力、コード品質 |
| システム設計面接 | スケーラブルなアーキテクチャ設計 | 45-60分 | 設計思考、トレードオフの判断 |
| 行動面接 | STAR法による過去経験 | 30-45分 | コミュニケーション、チームワーク |

この記事では、各フェーズの具体的な対策方法をTypeScriptのコード例とシステム設計図付きで解説します。

参照: Levels.fyi（https://www.levels.fyi/）やGlassdoor（https://www.glassdoor.com/）で企業別の面接プロセスと出題傾向を確認できます。

---

## コーディングテスト対策

### 出題頻度の高いカテゴリ

| カテゴリ | 出題頻度 | 代表的な問題 |
|---------|---------|------------|
| 配列・文字列操作 | 非常に高い | Two Sum、回文判定、アナグラム |
| ハッシュマップ | 非常に高い | 頻度カウント、重複検出 |
| スタック・キュー | 高い | 括弧の整合性、BFS |
| 連結リスト | 高い | 反転、マージ、サイクル検出 |
| 二分探索 | 高い | 回転ソート配列、挿入位置 |
| 木構造（二分木） | 高い | 走査、最大深度、最小共通祖先 |
| 動的計画法 | 中程度 | 階段上り、ナップサック、最長部分列 |
| グラフ | 中程度 | BFS/DFS、最短経路 |
| スライディングウィンドウ | 中程度 | 部分配列の最大和 |
| 貪欲法 | 中程度 | 区間スケジューリング |

### パターン1: Two Sum（ハッシュマップ）

面接で最もよく出る問題の一つです。

```typescript
/**
 * Two Sum: 配列から合計がtargetになる2つの要素のインデックスを返す
 *
 * 例: nums = [2, 7, 11, 15], target = 9
 * 出力: [0, 1] (2 + 7 = 9)
 *
 * 時間計算量: O(n)
 * 空間計算量: O(n)
 */
function twoSum(nums: number[], target: number): [number, number] | null {
  // ハッシュマップで「targetから現在の値を引いた差分」を記録する
  const seen = new Map<number, number>(); // value -> index

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];

    if (seen.has(complement)) {
      return [seen.get(complement)!, i];
    }

    seen.set(nums[i], i);
  }

  return null; // 見つからない場合
}

// テスト
console.log(twoSum([2, 7, 11, 15], 9));  // [0, 1]
console.log(twoSum([3, 2, 4], 6));       // [1, 2]
console.log(twoSum([3, 3], 6));          // [0, 1]
```

**面接での説明ポイント:**
- ブルートフォース（O(n^2)）ではなくハッシュマップで O(n) に最適化している
- 1回のループで完結している（ワンパスアプローチ）
- エッジケース（同じ値の重複、見つからない場合）をカバーしている

### パターン2: 有効な括弧（スタック）

```typescript
/**
 * Valid Parentheses: 文字列内の括弧が正しく対応しているか判定する
 *
 * 例: "({[]})" -> true
 *     "([)]"   -> false
 *     "{[]}"   -> true
 *
 * 時間計算量: O(n)
 * 空間計算量: O(n)
 */
function isValidParentheses(s: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = {
    ')': '(',
    ']': '[',
    '}': '{'
  };

  for (const char of s) {
    if (char === '(' || char === '[' || char === '{') {
      // 開き括弧はスタックにpush
      stack.push(char);
    } else if (char in pairs) {
      // 閉じ括弧の場合、スタックのトップと照合
      if (stack.length === 0 || stack.pop() !== pairs[char]) {
        return false;
      }
    }
  }

  // 全ての括弧が閉じられていればスタックは空
  return stack.length === 0;
}

// テスト
console.log(isValidParentheses('()'));       // true
console.log(isValidParentheses('()[]{}'));   // true
console.log(isValidParentheses('(]'));       // false
console.log(isValidParentheses('([)]'));     // false
console.log(isValidParentheses('{[]}'));     // true
```

### パターン3: 二分探索

```typescript
/**
 * Binary Search: ソート済み配列からtargetを探す
 *
 * 時間計算量: O(log n)
 * 空間計算量: O(1)
 */
function binarySearch(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    // オーバーフロー防止のための計算方法
    const mid = left + Math.floor((right - left) / 2);

    if (nums[mid] === target) {
      return mid;
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1; // 見つからない
}

/**
 * 応用: 回転ソート配列での探索
 * 例: [4, 5, 6, 7, 0, 1, 2] でtarget=0 -> index 4
 *
 * 時間計算量: O(log n)
 */
function searchRotatedArray(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);

    if (nums[mid] === target) return mid;

    // 左半分がソート済みか判定
    if (nums[left] <= nums[mid]) {
      // targetが左半分の範囲内か
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      // 右半分がソート済み
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }

  return -1;
}

// テスト
console.log(searchRotatedArray([4, 5, 6, 7, 0, 1, 2], 0)); // 4
console.log(searchRotatedArray([4, 5, 6, 7, 0, 1, 2], 3)); // -1
```

### パターン4: 二分木の走査

```typescript
/**
 * 二分木のノード定義
 */
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;

  constructor(val: number, left?: TreeNode | null, right?: TreeNode | null) {
    this.val = val;
    this.left = left ?? null;
    this.right = right ?? null;
  }
}

/**
 * 二分木の最大深度
 * 時間計算量: O(n) - 全ノードを訪問
 * 空間計算量: O(h) - hは木の高さ（再帰スタック）
 */
function maxDepth(root: TreeNode | null): number {
  if (root === null) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

/**
 * 二分木の反転（左右入れ替え）
 * 時間計算量: O(n)
 * 空間計算量: O(h)
 */
function invertTree(root: TreeNode | null): TreeNode | null {
  if (root === null) return null;

  // 左右の子を入れ替える
  const temp = root.left;
  root.left = invertTree(root.right);
  root.right = invertTree(temp);

  return root;
}

/**
 * 二分探索木の検証
 * 時間計算量: O(n)
 * 空間計算量: O(h)
 */
function isValidBST(root: TreeNode | null): boolean {
  function validate(
    node: TreeNode | null,
    min: number,
    max: number
  ): boolean {
    if (node === null) return true;

    if (node.val <= min || node.val >= max) {
      return false;
    }

    return (
      validate(node.left, min, node.val) &&
      validate(node.right, node.val, max)
    );
  }

  return validate(root, -Infinity, Infinity);
}

/**
 * 二分木のレベル順走査（BFS）
 * 時間計算量: O(n)
 * 空間計算量: O(w) - wは木の最大幅
 */
function levelOrderTraversal(root: TreeNode | null): number[][] {
  if (root === null) return [];

  const result: number[][] = [];
  const queue: TreeNode[] = [root];

  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: number[] = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      currentLevel.push(node.val);

      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(currentLevel);
  }

  return result;
}

// テスト
const tree = new TreeNode(
  3,
  new TreeNode(9),
  new TreeNode(20, new TreeNode(15), new TreeNode(7))
);

console.log(maxDepth(tree));            // 3
console.log(levelOrderTraversal(tree)); // [[3], [9, 20], [15, 7]]
```

### パターン5: 動的計画法

```typescript
/**
 * 階段上り問題: n段の階段を1段または2段ずつ上るとき、何通りの上り方があるか
 *
 * 例: n=3 -> 3通り (1+1+1, 1+2, 2+1)
 *
 * 時間計算量: O(n)
 * 空間計算量: O(1)
 */
function climbStairs(n: number): number {
  if (n <= 2) return n;

  let prev2 = 1; // n-2段目の通り数
  let prev1 = 2; // n-1段目の通り数

  for (let i = 3; i <= n; i++) {
    const current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }

  return prev1;
}

/**
 * 最長増加部分列（LIS: Longest Increasing Subsequence）
 *
 * 例: [10, 9, 2, 5, 3, 7, 101, 18]
 * LIS = [2, 3, 7, 101] -> 長さ4
 *
 * 時間計算量: O(n log n) - 二分探索を利用
 * 空間計算量: O(n)
 */
function lengthOfLIS(nums: number[]): number {
  if (nums.length === 0) return 0;

  // tailsは各長さのLISの末尾の最小値を格納する
  const tails: number[] = [];

  for (const num of nums) {
    // 二分探索でnumを挿入すべき位置を見つける
    let left = 0;
    let right = tails.length;

    while (left < right) {
      const mid = left + Math.floor((right - left) / 2);
      if (tails[mid] < num) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    tails[left] = num;
  }

  return tails.length;
}

/**
 * 0/1ナップサック問題
 *
 * 重さと価値を持つアイテムの集合から、
 * 容量制限内で価値の合計を最大化する
 *
 * 時間計算量: O(n * capacity)
 * 空間計算量: O(capacity)
 */
function knapsack(
  weights: number[],
  values: number[],
  capacity: number
): number {
  const n = weights.length;
  // 1次元DPテーブル（空間最適化版）
  const dp = new Array(capacity + 1).fill(0);

  for (let i = 0; i < n; i++) {
    // 逆順にループ（同じアイテムを2回使わないため）
    for (let w = capacity; w >= weights[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }

  return dp[capacity];
}

// テスト
console.log(climbStairs(5));                          // 8
console.log(lengthOfLIS([10, 9, 2, 5, 3, 7, 101, 18])); // 4
console.log(knapsack([2, 3, 4, 5], [3, 4, 5, 6], 8));    // 10
```

### パターン6: スライディングウィンドウ

```typescript
/**
 * 最大部分配列和（サイズk）
 *
 * 例: nums = [2, 1, 5, 1, 3, 2], k = 3
 * 部分配列: [5, 1, 3] -> 和 = 9
 *
 * 時間計算量: O(n)
 * 空間計算量: O(1)
 */
function maxSubarraySum(nums: number[], k: number): number {
  if (nums.length < k) return -1;

  // 最初のウィンドウの合計を計算
  let windowSum = 0;
  for (let i = 0; i < k; i++) {
    windowSum += nums[i];
  }

  let maxSum = windowSum;

  // ウィンドウをスライドさせる
  for (let i = k; i < nums.length; i++) {
    windowSum += nums[i] - nums[i - k];
    maxSum = Math.max(maxSum, windowSum);
  }

  return maxSum;
}

/**
 * 重複のない最長部分文字列
 *
 * 例: "abcabcbb" -> "abc" -> 長さ3
 *
 * 時間計算量: O(n)
 * 空間計算量: O(min(n, m)) - mは文字種の数
 */
function lengthOfLongestSubstring(s: string): number {
  const charIndex = new Map<string, number>();
  let maxLen = 0;
  let start = 0;

  for (let end = 0; end < s.length; end++) {
    const char = s[end];

    // 重複文字が現在のウィンドウ内にある場合
    if (charIndex.has(char) && charIndex.get(char)! >= start) {
      start = charIndex.get(char)! + 1;
    }

    charIndex.set(char, end);
    maxLen = Math.max(maxLen, end - start + 1);
  }

  return maxLen;
}

// テスト
console.log(maxSubarraySum([2, 1, 5, 1, 3, 2], 3));     // 9
console.log(lengthOfLongestSubstring('abcabcbb'));        // 3
console.log(lengthOfLongestSubstring('bbbbb'));           // 1
console.log(lengthOfLongestSubstring('pwwkew'));          // 3
```

### コーディングテストの進め方

面接官の前でコードを書く際は、以下の手順を踏んでください。

```
1. 問題の理解（2-3分）
   - 問題文を読み直し、不明点を質問する
   - 入出力の例を確認する
   - エッジケースを確認する（空配列、1要素、負数等）

2. アプローチの説明（3-5分）
   - ブルートフォース解法をまず説明する
   - 最適化のアイデアを説明する
   - 時間計算量・空間計算量を伝える
   - 面接官の同意を得てからコーディングに入る

3. 実装（15-25分）
   - 関数のシグネチャから書く
   - コメントで処理の流れを先に書く
   - 変数名は意味のある名前にする
   - 完成したらテストケースで検証する

4. テストと最適化（5-10分）
   - 通常ケースでのトレース
   - エッジケースでのトレース
   - さらなる最適化の可能性を議論する
```

---

## システム設計面接対策

### システム設計面接の流れ

システム設計面接では、45-60分で大規模システムの設計を議論します。

```
1. 要件の明確化（5-10分）
   - 機能要件の確認
   - 非機能要件の確認（ユーザー数、データ量、可用性、レイテンシ）
   - スコープの絞り込み

2. 概算見積もり（5分）
   - DAU（日次アクティブユーザー）
   - QPS（秒間クエリ数）
   - ストレージ容量
   - 帯域幅

3. 高レベル設計（10-15分）
   - コンポーネント図の作成
   - データフローの説明
   - APIの定義

4. 詳細設計（15-20分）
   - データベーススキーマ
   - 特定コンポーネントの深掘り
   - ボトルネックの特定と対策

5. まとめと議論（5-10分）
   - トレードオフの説明
   - さらなるスケーリング戦略
```

### 設計例1: URL短縮サービス

**要件:**
- 長いURLを短いURLに変換する
- 短いURLにアクセスすると元のURLにリダイレクトする
- DAU: 1,000万人、新規URL作成: 1日100万件

**概算見積もり:**

```
書き込みQPS: 1,000,000 / 86,400 = 約12 QPS
読み取りQPS: 約120 QPS（読み書き比率 10:1 と仮定）
ストレージ: 100万件/日 * 500B * 365日 * 5年 = 約912GB
```

**システムアーキテクチャ:**

```
[テキストベースのアーキテクチャ図]

クライアント
    |
    v
[ロードバランサー] (L7 / ALB)
    |
    +-----> [API Server群]  (水平スケーリング)
    |          |
    |          +-----> [Redis Cache]  (読み取りキャッシュ)
    |          |          |
    |          +-----> [Database]
    |                    |
    |                    +-- Primary (書き込み)
    |                    +-- Replica 1 (読み取り)
    |                    +-- Replica 2 (読み取り)
    |
    +-----> [CDN]  (静的アセット + 一部リダイレクト)
```

**API設計:**

```typescript
// POST /api/shorten - URL短縮
interface ShortenRequest {
  longUrl: string;
  customAlias?: string;  // オプション: カスタムエイリアス
  expiresAt?: string;    // オプション: 有効期限
}

interface ShortenResponse {
  shortUrl: string;
  longUrl: string;
  shortCode: string;
  createdAt: string;
  expiresAt?: string;
}

// GET /:shortCode - リダイレクト
// Response: 301 Moved Permanently
//   Location: https://example.com/very-long-url
```

**データベーススキーマ:**

```sql
CREATE TABLE urls (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  short_code VARCHAR(8) UNIQUE NOT NULL,
  long_url TEXT NOT NULL,
  user_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  click_count BIGINT DEFAULT 0,
  INDEX idx_short_code (short_code),
  INDEX idx_user_id (user_id)
);
```

**短縮コードの生成戦略:**

```typescript
// 方法1: Base62エンコーディング
function generateShortCode(id: number): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  let num = id;

  while (num > 0) {
    code = chars[num % 62] + code;
    num = Math.floor(num / 62);
  }

  // 最低7文字にパディング
  return code.padStart(7, '0');
}

// 方法2: ハッシュベース（衝突チェック付き）
import { createHash } from 'crypto';

function generateHashCode(url: string): string {
  const hash = createHash('md5').update(url).digest('base64url');
  return hash.substring(0, 7);
}
```

**スケーリングのポイント:**

```
1. キャッシュ戦略
   - Redisに短縮コード -> 元URLのマッピングをキャッシュ
   - キャッシュヒット率: 80-90%が目標（パレートの法則）
   - TTL: 24時間（アクセス頻度が低いURLは自然にキャッシュから消える）

2. データベーススケーリング
   - 読み取り: Replicaで水平スケール
   - 書き込み: シャーディング（short_codeの先頭文字で分割）
   - 書き込みは比較的少ない（12 QPS）ので、当面は不要

3. CDN活用
   - 人気のある短縮URLはCDNエッジでリダイレクト
   - 301ではなく302を使うことでアクセス解析を維持する選択肢もある
```

### 設計例2: チャットシステム

**要件:**
- 1対1チャットとグループチャット
- リアルタイムメッセージ配信
- メッセージ履歴の保存と検索
- DAU: 500万人、同時接続: 50万人

**システムアーキテクチャ:**

```
[テキストベースのアーキテクチャ図]

クライアント (Web/Mobile)
    |
    +--- WebSocket ---+
    |                 |
    v                 v
[WS Gateway群]   [API Server群]
    |                 |
    |   +-------------+
    |   |
    v   v
[Message Queue] (Kafka / RabbitMQ)
    |
    +-----> [Chat Service]
    |          |
    |          +-----> [Message DB] (Cassandra)
    |          +-----> [User DB] (PostgreSQL)
    |
    +-----> [Notification Service]
    |          |
    |          +-----> [Push Gateway] (FCM / APNs)
    |
    +-----> [Presence Service]
               |
               +-----> [Redis] (オンライン状態管理)
```

**メッセージのデータモデル:**

```typescript
interface Message {
  messageId: string;       // UUID v7（時系列ソート可能）
  conversationId: string;  // チャットルームのID
  senderId: string;
  content: string;
  contentType: 'text' | 'image' | 'file';
  createdAt: Date;
  readBy: string[];        // 既読ユーザーのID
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  lastMessage?: Message;
  updatedAt: Date;
}

// Cassandraのテーブル設計
// パーティションキー: conversation_id
// クラスタリングキー: created_at DESC
```

**WebSocket接続管理:**

```typescript
// WebSocket Gateway（簡略版）
class WebSocketGateway {
  // userId -> WebSocket接続のマッピング
  private connections: Map<string, WebSocket> = new Map();

  handleConnection(ws: WebSocket, userId: string): void {
    this.connections.set(userId, ws);
    console.log(`User ${userId} connected. Total: ${this.connections.size}`);

    ws.on('message', (data: string) => {
      const message = JSON.parse(data);
      this.handleMessage(userId, message);
    });

    ws.on('close', () => {
      this.connections.delete(userId);
      console.log(`User ${userId} disconnected`);
    });
  }

  async handleMessage(senderId: string, payload: {
    type: string;
    conversationId: string;
    content: string;
  }): Promise<void> {
    if (payload.type === 'chat_message') {
      // メッセージをDBに保存
      const message = await this.saveMessage({
        conversationId: payload.conversationId,
        senderId,
        content: payload.content,
        contentType: 'text'
      });

      // 同じ会話の参加者全員に配信
      const participants = await this.getParticipants(payload.conversationId);

      for (const participantId of participants) {
        if (participantId === senderId) continue;

        const conn = this.connections.get(participantId);
        if (conn && conn.readyState === WebSocket.OPEN) {
          conn.send(JSON.stringify({
            type: 'new_message',
            message
          }));
        } else {
          // オフラインユーザーにはプッシュ通知
          await this.sendPushNotification(participantId, message);
        }
      }
    }
  }

  private async saveMessage(data: Omit<Message, 'messageId' | 'createdAt' | 'readBy'>): Promise<Message> {
    // 実際のDB保存処理
    return {
      messageId: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
      readBy: []
    };
  }

  private async getParticipants(conversationId: string): Promise<string[]> {
    // DB から参加者リストを取得
    return [];
  }

  private async sendPushNotification(userId: string, message: Message): Promise<void> {
    // プッシュ通知サービスに委譲
  }
}
```

**スケーリングの議論ポイント:**

```
1. WebSocket接続の分散
   - 問題: 1サーバーあたり約65,000接続が上限
   - 対策: 複数のWSゲートウェイ + Redis Pub/Subでメッセージを転送
   - 50万同時接続 / 65,000 = 約8台のWSサーバーが必要

2. メッセージの順序保証
   - 同一会話内のメッセージはパーティション内で順序保証
   - Kafkaのパーティションキーにconversation_idを使用

3. 既読管理
   - 頻繁に更新されるため、Redisで管理
   - 定期的にDBにフラッシュ（Write-Behind Cache）

4. メッセージ検索
   - Elasticsearch + Kafka Connectで非同期インデックス構築
   - 全文検索とメタデータ検索をサポート
```

---

## 行動面接対策（STAR法）

### STAR法とは

| 要素 | 内容 | 例 |
|------|------|-----|
| **S**ituation | 状況の説明 | 「前職で新機能のリリースを担当していたとき...」 |
| **T**ask | 自分の役割・課題 | 「リリース直前にパフォーマンス問題が発見され、私が調査を任されました」 |
| **A**ction | 取った行動 | 「N+1クエリ問題を特定し、Eager Loadingに修正しました」 |
| **R**esult | 結果・成果 | 「レスポンス時間が3秒から200msに改善し、予定通りリリースできました」 |

### よくある質問と回答例

**Q1: 技術的に困難だった経験を教えてください**

```
S: ECサイトのリニューアルプロジェクトで、既存のモノリシックなPHPアプリケーション
   をReact + Node.jsのマイクロサービスに移行するプロジェクトに参加していました。

T: 私はフロントエンドの移行を担当していましたが、旧システムのビジネスロジックが
   フロントエンドに混在しており、単純な書き換えでは対応できない状況でした。

A: まず、旧システムの画面遷移とAPIコールを全て洗い出してドキュメント化しました。
   次に、ストラングラーフィグパターンを採用し、画面単位で段階的に新システムに
   移行する計画を立てました。共通コンポーネントを先に作成し、画面ごとにE2E
   テストを書いてから移行することで、品質を担保しました。

R: 6ヶ月かけて全画面の移行を完了しました。段階的な移行により、移行期間中も
   サービスを停止することなく運営できました。また、新システムのページロード時間は
   旧システムの1/3に改善されました。
```

**Q2: チームでの意見の対立をどう解決しましたか**

```
S: APIの設計方針について、RESTを推すメンバーとGraphQLを推すメンバーで
   意見が対立していました。

T: テックリードとして、チームの合意形成を行う必要がありました。

A: まず、両方のアプローチのメリット・デメリットをマトリックスにまとめ、
   プロジェクトの要件（フロントエンドの柔軟性、開発速度、チームの経験値）と
   照らし合わせました。さらに、2日間のプロトタイプ期間を設けて、
   両方のアプローチで同じ画面を実装し、開発体験を比較しました。

R: プロトタイプの結果、チームの学習コストとプロジェクトの規模を考慮して
   RESTを採用することで全員が納得しました。データ量の最適化が必要な画面には
   BFF（Backend For Frontend）パターンを併用することで、
   GraphQLの利点も一部取り入れることができました。
```

**Q3: 失敗した経験と、そこから何を学びましたか**

```
S: 本番環境でのデータベースマイグレーションを担当していたとき、
   カラムの型変更を行うマイグレーションを実行しました。

T: ダウンタイムなしでマイグレーションを完了させる必要がありました。

A: 事前にステージング環境でテストし、問題なかったため本番に適用しました。
   しかし、ステージング環境のデータ量が本番の1/100だったため、
   ALTER TABLEがテーブルロックを引き起こし、約5分のダウンタイムが発生しました。

R: 復旧後、以下の改善を行いました。
   1. ステージング環境に本番相当のデータ量を持たせるパイプラインを構築
   2. マイグレーション手順書にデータ量の影響評価を必須項目として追加
   3. pt-online-schema-changeのような無停止DDLツールの導入を提案・実装
   この経験から、テスト環境と本番環境の差異を常に意識するようになりました。
```

### 面接で評価されるポイント

```
技術力:
  - 問題の本質を理解する力
  - 複数のアプローチを比較検討できる
  - 計算量（時間・空間）を意識している
  - エッジケースを考慮している

コミュニケーション:
  - 思考プロセスを言語化できる
  - 質問を適切にできる
  - フィードバックを素直に受け入れる
  - わからないことを正直に言える

問題解決:
  - 大きな問題を小さく分割できる
  - トレードオフを理解し、説明できる
  - 段階的に改善できる
  - 実装前に設計を考える

チームワーク:
  - 他者の意見を尊重できる
  - 建設的な提案ができる
  - 責任感がある
  - 学び続ける姿勢がある
```

---

## 面接準備のタイムライン

### 4週間プラン（転職活動直前）

```
Week 1: コーディング基礎（配列、文字列、ハッシュマップ）
  - LeetCode Easy 15問
  - 問題パターンの分類と整理
  - 毎日2問ずつ解く

Week 2: コーディング中級（スタック、キュー、木、二分探索）
  - LeetCode Easy 10問 + Medium 5問
  - 解法テンプレートの暗記
  - タイマーを使って制限時間内に解く練習

Week 3: システム設計 + 動的計画法
  - システム設計問題 3-4問を通しで練習
  - DP問題 5-8問
  - 友人や模擬面接サービスで練習

Week 4: 行動面接 + 総復習
  - STAR法で5-7つのエピソードを準備
  - 弱点分野の集中復習
  - 模擬面接（友人 or 面接練習サービス）
```

### 学習リソース

| リソース | URL | 内容 |
|---------|-----|------|
| LeetCode | https://leetcode.com/ | コーディング問題。NeetCode 150推奨 |
| NeetCode | https://neetcode.io/ | LeetCode問題の解説動画 |
| System Design Primer | https://github.com/donnemartin/system-design-primer | システム設計の教科書（GitHub） |
| Grokking System Design | grokking.org | システム設計の体系的なコース |
| AtCoder | https://atcoder.jp/ | 競技プログラミング。日本語対応 |

参照: LeetCode（https://leetcode.com/）はコーディング面接対策の事実上の標準プラットフォームです。NeetCode 150リスト（https://neetcode.io/roadmap）は最も効率的な問題セットとして知られています。

---

## コーディングテストの計算量チートシート

面接で計算量について質問されることが多いため、主要な計算量を整理します。

```
O(1)        - ハッシュマップのアクセス、配列のインデックスアクセス
O(log n)    - 二分探索、平衡二分木の操作
O(n)        - 線形探索、配列の走査
O(n log n)  - 効率的なソート（マージソート、ヒープソート）
O(n^2)      - ネスト2重ループ、バブルソート
O(2^n)      - 部分集合の列挙、再帰的な全探索
O(n!)       - 順列の列挙

データ構造別の操作計算量:

| データ構造    | アクセス  | 探索     | 挿入     | 削除     |
|-------------|---------|---------|---------|---------|
| 配列         | O(1)    | O(n)    | O(n)    | O(n)    |
| 連結リスト    | O(n)    | O(n)    | O(1)    | O(1)    |
| ハッシュマップ | O(1)    | O(1)    | O(1)    | O(1)    |
| 二分探索木    | O(log n)| O(log n)| O(log n)| O(log n)|
| ヒープ       | O(1)*   | O(n)    | O(log n)| O(log n)|
| スタック     | O(n)    | O(n)    | O(1)    | O(1)    |
| キュー       | O(n)    | O(n)    | O(1)    | O(1)    |

* ヒープのアクセスO(1)は最小/最大値のみ
```

---

## まとめ

エンジニア技術面接の対策は、以下の3つの軸で進めてください。

1. **コーディングテスト**: LeetCodeで頻出パターンを20-30問解き、解法テンプレートを身につける。TypeScriptで書く練習をしておくと実務に直結する
2. **システム設計**: 主要なシステム（URL短縮、チャット、SNSフィード等）の設計を一通り練習する。要件の確認→概算→設計→詳細のフローを体に染み込ませる
3. **行動面接**: STAR法で5-7つのエピソードを事前に準備する。技術的な困難、チームワーク、失敗経験のバリエーションを用意する

転職エージェントを活用することで、企業別の面接傾向や対策を把握できます。エンジニア専門のエージェントであれば、技術面接の模擬面接も実施しているケースがあります。

面接は準備がものを言います。この記事で紹介したパターンと対策を4週間の計画に落とし込み、計画的に準備を進めてください。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
