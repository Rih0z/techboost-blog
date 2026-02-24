---
title: 'D3.js完全ガイド — データビジュアライゼーション・インタラクティブグラフ・React統合'
description: 'D3.jsでインタラクティブなデータビジュアライゼーションを構築する完全ガイド。SVG・スケール・軸・棒グラフ・折れ線グラフ・散布図・地図・React統合・アニメーションまで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['D3.js', 'データビジュアライゼーション', 'SVG', 'TypeScript', 'React']
---

D3.js（Data-Driven Documents）はMike Bostockが2011年に開発したJavaScriptライブラリで、「データに基づいてDOMを操作する」という哲学のもと設計されている。Chart.jsやRechartsのような「すぐ使えるチャートライブラリ」とは根本的に異なり、SVGやCanvas、HTMLを直接操作する低レベルのツールセットだ。その代わり、実現できるビジュアライゼーションの自由度は他の追随を許さない。

本記事ではD3.jsの基礎からReact統合・アニメーション・レスポンシブ対応まで、実務で必要なすべての技術要素を実装例とともに徹底解説する。

---

## 1. D3.jsとは — Chart.js・Rechartsとの比較・適用場面

### ライブラリ比較

データビジュアライゼーションライブラリには大きく2種類ある。「宣言的チャートライブラリ」と「低レベル描画ライブラリ」だ。

| 比較項目 | D3.js | Chart.js | Recharts | Nivo |
|----------|-------|----------|----------|------|
| 学習コスト | 高い | 低い | 中程度 | 中程度 |
| カスタマイズ性 | 無制限 | 中程度 | 高い | 高い |
| React統合 | 手動実装 | プラグイン | ネイティブ | ネイティブ |
| バンドルサイズ | 分割可能 | 約200KB | 約300KB | 約500KB |
| SVG制御 | 完全制御 | 不可 | 部分的 | 部分的 |
| インタラクション | 完全自由 | 限定的 | 中程度 | 中程度 |
| アニメーション | 細粒度制御 | 基本的 | 基本的 | 中程度 |
| 地図描画 | 強力 | 不可 | 不可 | 対応 |

### D3.jsが適している場面

**カスタムビジュアライゼーション**
既存のチャートタイプに収まらない独自の表現が必要な場合。ネットワークグラフ、ツリーマップ、サンキーダイアグラム、コードをアニメーションで表現するなど、想像力の限界まで実装できる。

**インタラクティブなデータ探索ツール**
ズーム・パン・ブラッシング・フィルタリングなど、ユーザーがデータを自由に探索できるツールの構築に最適。NYT、The Guardian、FiveThirtyEightなどの報道機関はD3.jsで驚くほどリッチなデータジャーナリズム作品を制作している。

**リアルタイムデータ更新**
WebSocketやSSEで流れてくるデータをスムーズなアニメーションで更新する場合、D3のトランジションシステムが威力を発揮する。

**D3.jsを使わなくていい場面**
- シンプルな棒グラフ・折れ線グラフのみ → Chart.js / Recharts
- Reactコンポーネントとして管理したい → Recharts / Victory
- 素早くプロトタイプを作りたい → Observable Plot

### インストール

```bash
npm install d3
npm install --save-dev @types/d3
```

モジュールを個別にインポートしてバンドルサイズを最小化することも可能だ。

```typescript
// 全体インポート（開発時に便利）
import * as d3 from 'd3';

// 必要なモジュールのみインポート（本番推奨）
import { select, selectAll } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { line, area } from 'd3-shape';
```

---

## 2. SVG基礎 — rect・circle・path・text・g

D3.jsはSVG（Scalable Vector Graphics）を主要な描画対象とする。SVGの基本要素を理解することがD3.js習得の第一歩だ。

### SVGの座標系

SVGの座標系は左上が原点（0, 0）で、X軸は右方向に、Y軸は下方向に増加する。これは数学のグラフとは逆なので注意が必要だ。

```svg
<!-- 基本的なSVG構造 -->
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <!-- (0,0) は左上隅 -->
</svg>
```

### 基本図形要素

```typescript
// SVGコンテナの作成
const svg = d3.select('#chart')
  .append('svg')
  .attr('width', 400)
  .attr('height', 300);

// rect（矩形）
svg.append('rect')
  .attr('x', 50)        // 左上X座標
  .attr('y', 50)        // 左上Y座標
  .attr('width', 100)   // 幅
  .attr('height', 80)   // 高さ
  .attr('fill', '#4e79a7')
  .attr('rx', 4)        // 角丸（X方向）
  .attr('ry', 4);       // 角丸（Y方向）

// circle（円）
svg.append('circle')
  .attr('cx', 200)      // 中心X座標
  .attr('cy', 150)      // 中心Y座標
  .attr('r', 40)        // 半径
  .attr('fill', '#f28e2b')
  .attr('stroke', '#fff')
  .attr('stroke-width', 2);

// ellipse（楕円）
svg.append('ellipse')
  .attr('cx', 300)
  .attr('cy', 150)
  .attr('rx', 60)       // X方向半径
  .attr('ry', 30)       // Y方向半径
  .attr('fill', '#59a14f');

// line（直線）
svg.append('line')
  .attr('x1', 50).attr('y1', 250)
  .attr('x2', 350).attr('y2', 250)
  .attr('stroke', '#333')
  .attr('stroke-width', 2);

// text（テキスト）
svg.append('text')
  .attr('x', 200)
  .attr('y', 280)
  .attr('text-anchor', 'middle')    // 水平位置（start/middle/end）
  .attr('dominant-baseline', 'middle') // 垂直位置
  .attr('font-size', '14px')
  .attr('fill', '#333')
  .text('D3.js チャート');

// path（任意の形状）
svg.append('path')
  .attr('d', 'M 50 100 L 150 50 L 250 100 L 200 200 L 100 200 Z')
  .attr('fill', '#e15759')
  .attr('opacity', 0.7);
```

### グループ要素（g）

`<g>` 要素はSVG要素をグループ化し、変換（transform）を一括適用するために使う。D3.jsではマージン規約（margin convention）と組み合わせて使うのが定番だ。

```typescript
// マージン規約（D3.jsの標準パターン）
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const width = 500 - margin.left - margin.right;
const height = 300 - margin.top - margin.bottom;

const svg = d3.select('#chart')
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom);

// グループを作成してマージン分だけ移動
const g = svg.append('g')
  .attr('transform', `translate(${margin.left}, ${margin.top})`);

// これ以降はgに要素を追加することで
// 自動的にマージンが適用される
g.append('rect')
  .attr('x', 0)   // 実際の描画位置はmargin.leftだけオフセットされる
  .attr('y', 0)
  .attr('width', 100)
  .attr('height', 50)
  .attr('fill', '#4e79a7');
```

---

## 3. Selection — d3.select・selectAll・data・enter・exit

D3.jsのコアコンセプトが「データ結合（Data Join）」だ。データの配列とDOM要素を結びつけ、データに基づいてDOMを操作する。

### 基本的なセレクション

```typescript
// 単一要素のセレクション
const svg = d3.select('#chart');
const circle = d3.select('circle');

// 複数要素のセレクション
const allCircles = d3.selectAll('circle');
const dataPoints = d3.selectAll('.data-point');

// チェーン操作でスタイルを設定
d3.selectAll('.bar')
  .attr('fill', '#4e79a7')
  .attr('opacity', 0.8)
  .style('cursor', 'pointer');

// セレクション内での反復処理
d3.selectAll('.label').each(function(d, i) {
  // this はDOM要素、d はバインドされたデータ、i はインデックス
  d3.select(this).text(`Item ${i}: ${d}`);
});
```

### データ結合（Data Join）— enter・update・exit

```typescript
interface DataPoint {
  label: string;
  value: number;
}

const data: DataPoint[] = [
  { label: 'A', value: 30 },
  { label: 'B', value: 80 },
  { label: 'C', value: 45 },
  { label: 'D', value: 60 },
  { label: 'E', value: 20 },
];

const g = d3.select('svg').append('g');

// データ結合: セレクションにデータを束ねる
const bars = g.selectAll('rect').data(data);

// enter: データはあるがDOM要素がない → 新規追加
bars.enter()
  .append('rect')
  .attr('x', (d, i) => i * 60 + 10)
  .attr('y', d => 200 - d.value)
  .attr('width', 40)
  .attr('height', d => d.value)
  .attr('fill', '#4e79a7');

// update: データもDOM要素もある → 更新
bars
  .attr('fill', '#f28e2b');  // 既存要素の色を変更

// exit: DOM要素はあるがデータがない → 削除
bars.exit().remove();
```

### Modern D3: join() メソッド（D3 v5以降推奨）

```typescript
// join()メソッドでenter・update・exitを統合管理
function updateChart(data: DataPoint[]) {
  const bars = g.selectAll<SVGRectElement, DataPoint>('rect')
    .data(data, d => d.label);  // キー関数でデータを識別

  bars.join(
    // enter: 新規追加
    enter => enter.append('rect')
      .attr('x', (d, i) => i * 60 + 10)
      .attr('y', 200)             // アニメーション開始位置
      .attr('width', 40)
      .attr('height', 0)
      .attr('fill', '#4e79a7')
      .call(enter => enter.transition().duration(500)
        .attr('y', d => 200 - d.value)
        .attr('height', d => d.value)
      ),
    // update: 更新
    update => update
      .call(update => update.transition().duration(500)
        .attr('x', (d, i) => i * 60 + 10)
        .attr('y', d => 200 - d.value)
        .attr('height', d => d.value)
      ),
    // exit: 削除
    exit => exit
      .call(exit => exit.transition().duration(300)
        .attr('height', 0)
        .attr('y', 200)
        .remove()
      )
  );
}
```

---

## 4. スケール — scaleLinear・scaleBand・scaleTime・scaleOrdinal

スケール（Scale）はデータの値域（domain）をSVGの描画範囲（range）に変換する関数だ。D3.jsで最も重要なコンセプトの一つ。

### scaleLinear（線形スケール）

数値データを連続的にマッピングする。

```typescript
// 基本的な線形スケール
const yScale = d3.scaleLinear()
  .domain([0, 100])        // データの最小値〜最大値
  .range([height, 0]);      // SVGの描画範囲（下→上 で反転）

// 使用例
yScale(0);    // → height（底）
yScale(50);   // → height/2（中央）
yScale(100);  // → 0（上端）

// データから自動でdomain設定
const maxValue = d3.max(data, d => d.value) ?? 0;
const yScale2 = d3.scaleLinear()
  .domain([0, maxValue * 1.1])  // 10%余白
  .range([height, 0])
  .nice();  // 目盛りをキリのいい数値に丸める

// クランプ（domain外の値を範囲内に制限）
const clampedScale = d3.scaleLinear()
  .domain([0, 100])
  .range([0, 500])
  .clamp(true);  // 0未満→0, 100超→500 に制限
```

### scaleBand（帯状スケール）

カテゴリデータを等幅のバンドにマッピングする。棒グラフのX軸に使う。

```typescript
const xScale = d3.scaleBand()
  .domain(data.map(d => d.label))   // カテゴリ名の配列
  .range([0, width])
  .padding(0.2);                     // バンド間のパディング（0〜1）

// bandwidthでバーの幅を取得
const barWidth = xScale.bandwidth();

// 使用例
xScale('A');  // → バンドAの左端座標
xScale('B');  // → バンドBの左端座標

// グループ棒グラフ用にネストされたscaleBand
const xSubScale = d3.scaleBand()
  .domain(['category1', 'category2'])
  .range([0, xScale.bandwidth()])
  .padding(0.05);
```

### scaleTime（時間スケール）

日付・時刻データを扱う際に使う。

```typescript
const timeScale = d3.scaleTime()
  .domain([new Date('2024-01-01'), new Date('2024-12-31')])
  .range([0, width]);

// 実際の日付データから設定
const dates = data.map(d => new Date(d.date));
const timeScale2 = d3.scaleTime()
  .domain(d3.extent(dates) as [Date, Date])
  .range([0, width]);

// 時刻フォーマットと組み合わせ
const formatMonth = d3.timeFormat('%Y年%m月');
timeScale2.ticks(d3.timeMonth.every(2))
  .forEach(tick => console.log(formatMonth(tick)));
```

### scaleOrdinal（順序スケール）

カテゴリデータを色などの離散値にマッピングする。

```typescript
// カラースケール（D3.jsの組み込みカラーパレット）
const colorScale = d3.scaleOrdinal<string>()
  .domain(['A', 'B', 'C', 'D', 'E'])
  .range(d3.schemeTableau10);  // Tableau 10色パレット

// 他の組み込みカラースキーム
// d3.schemeSet1        → 9色
// d3.schemePastel1     → パステル系9色
// d3.schemeCategory10  → 10色（旧来）
// d3.interpolateViridis → 連続グラデーション

// 連続値をカラーにマッピング
const sequentialColor = d3.scaleSequential()
  .domain([0, 100])
  .interpolator(d3.interpolateBlues);

sequentialColor(0);    // → 薄い青
sequentialColor(100);  // → 濃い青

// 発散型カラースケール（中央値を起点）
const divergingColor = d3.scaleDiverging()
  .domain([-50, 0, 50])
  .interpolator(d3.interpolateRdYlGn);
```

---

## 5. 軸 — axisBottom・axisLeft・tickFormat・tickSize

軸はスケールをもとに目盛りとラベルを自動生成するコンポーネントだ。

```typescript
const margin = { top: 20, right: 30, bottom: 60, left: 60 };
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select('#chart')
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom);

const g = svg.append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

// スケール定義
const xScale = d3.scaleBand()
  .domain(data.map(d => d.label))
  .range([0, width])
  .padding(0.2);

const yScale = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value) ?? 0])
  .range([height, 0])
  .nice();

// X軸（下側）
const xAxis = d3.axisBottom(xScale)
  .tickSize(6)          // 目盛りの長さ
  .tickPadding(8);      // ラベルと目盛りの間隔

const xAxisGroup = g.append('g')
  .attr('class', 'x-axis')
  .attr('transform', `translate(0, ${height})`)
  .call(xAxis);

// X軸のラベルを回転
xAxisGroup.selectAll('text')
  .attr('transform', 'rotate(-45)')
  .style('text-anchor', 'end')
  .attr('dx', '-0.5em')
  .attr('dy', '0.15em');

// Y軸（左側）
const yAxis = d3.axisLeft(yScale)
  .ticks(6)                           // 目盛りの概算数
  .tickFormat(d => `${d}件`)           // カスタムフォーマット
  .tickSize(-width);                  // グリッド線を描画（負の値）

const yAxisGroup = g.append('g')
  .attr('class', 'y-axis')
  .call(yAxis);

// グリッド線のスタイル調整
yAxisGroup.selectAll('.tick line')
  .attr('stroke', '#e0e0e0')
  .attr('stroke-dasharray', '3,3');

// 軸のドメインライン（外枠）を非表示
yAxisGroup.select('.domain').remove();
xAxisGroup.select('.domain').attr('stroke', '#ccc');

// 数値フォーマットのカスタム例
const formatCurrency = d3.format(',.0f');  // 1,234 形式
const formatPercent = d3.format('.1%');    // 12.3% 形式
const formatSI = d3.format('.2s');         // 1.2k / 3.4M 形式

const yAxis2 = d3.axisLeft(yScale)
  .tickFormat(d => `¥${formatCurrency(d as number)}`);
```

---

## 6. 棒グラフ実装 — 垂直・水平・グループ・スタック

### 垂直棒グラフ（基本実装）

```typescript
interface SalesData {
  month: string;
  sales: number;
}

function createBarChart(
  selector: string,
  data: SalesData[]
): void {
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // SVG作成
  const svg = d3.select(selector)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // スケール
  const x = d3.scaleBand()
    .domain(data.map(d => d.month))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.sales) ?? 0])
    .range([height, 0])
    .nice();

  // グリッド線
  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ''))
    .selectAll('line')
    .attr('stroke', '#e0e0e0')
    .attr('stroke-dasharray', '3,3');

  // バー描画
  g.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.month) ?? 0)
    .attr('y', d => y(d.sales))
    .attr('width', x.bandwidth())
    .attr('height', d => height - y(d.sales))
    .attr('fill', '#4e79a7')
    .attr('rx', 2)
    // ホバーインタラクション
    .on('mouseover', function(event, d) {
      d3.select(this).attr('fill', '#2d5f8a');
      tooltip.style('opacity', 1)
        .html(`<strong>${d.month}</strong><br/>売上: ${d.sales.toLocaleString()}`)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 28}px`);
    })
    .on('mouseout', function() {
      d3.select(this).attr('fill', '#4e79a7');
      tooltip.style('opacity', 0);
    });

  // 軸
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x));

  g.append('g')
    .call(d3.axisLeft(y).tickFormat(d => `¥${d3.format('.2s')(d as number)}`));

  // ツールチップ
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .style('position', 'absolute')
    .style('background', 'rgba(0,0,0,0.8)')
    .style('color', '#fff')
    .style('padding', '8px 12px')
    .style('border-radius', '4px')
    .style('font-size', '13px')
    .style('pointer-events', 'none');
}
```

### 水平棒グラフ

```typescript
function createHorizontalBarChart(
  selector: string,
  data: { label: string; value: number }[]
): void {
  const margin = { top: 10, right: 30, bottom: 30, left: 120 };
  const width = 500 - margin.left - margin.right;
  const height = data.length * 35;

  const svg = d3.select(selector)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // スケール（X/Yが入れ替わる）
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value) ?? 0])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([0, height])
    .padding(0.2);

  // バー
  g.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', 0)
    .attr('y', d => y(d.label) ?? 0)
    .attr('width', d => x(d.value))
    .attr('height', y.bandwidth())
    .attr('fill', (d, i) => d3.schemeTableau10[i % 10]);

  // バー内のラベル
  g.selectAll('.bar-label')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'bar-label')
    .attr('x', d => x(d.value) - 5)
    .attr('y', d => (y(d.label) ?? 0) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('fill', '#fff')
    .attr('font-size', '12px')
    .text(d => d.value.toLocaleString());

  // 軸
  g.append('g').call(d3.axisLeft(y));
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x));
}
```

### スタック棒グラフ

```typescript
interface StackData {
  month: string;
  sales: number;
  returns: number;
  other: number;
}

function createStackedBarChart(
  selector: string,
  data: StackData[]
): void {
  const keys = ['sales', 'returns', 'other'];
  const colors = d3.scaleOrdinal<string>()
    .domain(keys)
    .range(['#4e79a7', '#f28e2b', '#e15759']);

  // スタック計算
  const stack = d3.stack<StackData>()
    .keys(keys)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);

  const stackedData = stack(data);

  const margin = { top: 20, right: 80, bottom: 50, left: 60 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select(selector)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.month))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(stackedData, series => d3.max(series, d => d[1])) ?? 0])
    .range([height, 0])
    .nice();

  // スタックバー描画
  g.selectAll('.series')
    .data(stackedData)
    .enter()
    .append('g')
    .attr('class', 'series')
    .attr('fill', d => colors(d.key))
    .selectAll('rect')
    .data(d => d)
    .enter()
    .append('rect')
    .attr('x', (d) => x((d.data as StackData).month) ?? 0)
    .attr('y', d => y(d[1]))
    .attr('height', d => y(d[0]) - y(d[1]))
    .attr('width', x.bandwidth());

  // 凡例
  const legend = svg.append('g')
    .attr('transform', `translate(${width + margin.left + 10}, ${margin.top})`);

  keys.forEach((key, i) => {
    const legendItem = legend.append('g')
      .attr('transform', `translate(0, ${i * 22})`);

    legendItem.append('rect')
      .attr('width', 14)
      .attr('height', 14)
      .attr('fill', colors(key));

    legendItem.append('text')
      .attr('x', 20)
      .attr('y', 7)
      .attr('dy', '0.35em')
      .attr('font-size', '13px')
      .text(key);
  });

  g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y));
}
```

---

## 7. 折れ線グラフ — line・area・curve

### 基本的な折れ線グラフ

```typescript
interface TimeSeriesData {
  date: Date;
  value: number;
}

function createLineChart(
  selector: string,
  data: TimeSeriesData[]
): void {
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const width = 700 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select(selector)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // スケール
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date) as [Date, Date])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value) ?? 0])
    .range([height, 0])
    .nice();

  // エリア（塗りつぶし）
  const area = d3.area<TimeSeriesData>()
    .x(d => x(d.date))
    .y0(height)
    .y1(d => y(d.value))
    .curve(d3.curveMonotoneX);  // スムーズな曲線

  g.append('path')
    .datum(data)
    .attr('fill', '#4e79a7')
    .attr('opacity', 0.15)
    .attr('d', area);

  // ライン生成関数
  const line = d3.line<TimeSeriesData>()
    .x(d => x(d.date))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX)   // 補間方法
    .defined(d => d.value !== null);  // null値をスキップ

  // ライン描画
  g.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#4e79a7')
    .attr('stroke-width', 2.5)
    .attr('d', line);

  // データポイント（ドット）
  g.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => x(d.date))
    .attr('cy', d => y(d.value))
    .attr('r', 4)
    .attr('fill', '#4e79a7')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);

  // 軸
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%m/%d')));

  g.append('g')
    .call(d3.axisLeft(y));

  // マウストラッキング（ビスケクター）
  const bisect = d3.bisector<TimeSeriesData, Date>(d => d.date).left;
  const focusLine = g.append('line')
    .attr('class', 'focus-line')
    .attr('stroke', '#333')
    .attr('stroke-dasharray', '4,4')
    .attr('y1', 0)
    .attr('y2', height)
    .style('opacity', 0);

  svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('transform', `translate(${margin.left},${margin.top})`)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('mousemove', function(event) {
      const [mx] = d3.pointer(event);
      const x0 = x.invert(mx);
      const i = bisect(data, x0, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      const nearest = x0.getTime() - d0.date.getTime() >
        d1.date.getTime() - x0.getTime() ? d1 : d0;

      focusLine
        .style('opacity', 1)
        .attr('x1', x(nearest.date))
        .attr('x2', x(nearest.date));
    })
    .on('mouseout', () => focusLine.style('opacity', 0));
}
```

### カーブタイプ比較

```typescript
// D3.jsの主要なカーブ補間タイプ
const curves = {
  linear: d3.curveLinear,           // 直線で繋ぐ
  monotoneX: d3.curveMonotoneX,     // スムーズ（時系列推奨）
  natural: d3.curveNatural,         // 自然なスプライン
  catmullRom: d3.curveCatmullRom,   // Catmull-Romスプライン
  step: d3.curveStep,               // 階段状
  stepBefore: d3.curveStepBefore,   // 前の値を維持
  stepAfter: d3.curveStepAfter,     // 後の値まで維持
  basis: d3.curveBasis,             // B-スプライン（滑らか、点を通らない）
};
```

---

## 8. 散布図・バブルチャート

### 散布図

```typescript
interface ScatterPoint {
  x: number;
  y: number;
  category: string;
  label: string;
}

function createScatterPlot(
  selector: string,
  data: ScatterPoint[]
): void {
  const margin = { top: 20, right: 120, bottom: 50, left: 60 };
  const width = 700 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const svg = d3.select(selector)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.x) as [number, number])
    .range([0, width])
    .nice();

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.y) as [number, number])
    .range([height, 0])
    .nice();

  const categories = [...new Set(data.map(d => d.category))];
  const color = d3.scaleOrdinal<string>()
    .domain(categories)
    .range(d3.schemeTableau10);

  // データポイント
  g.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => x(d.x))
    .attr('cy', d => y(d.y))
    .attr('r', 6)
    .attr('fill', d => color(d.category))
    .attr('opacity', 0.75)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5);

  // 軸
  g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y));

  // 軸ラベル
  g.append('text')
    .attr('x', width / 2).attr('y', height + 40)
    .attr('text-anchor', 'middle')
    .text('X軸の指標');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2).attr('y', -45)
    .attr('text-anchor', 'middle')
    .text('Y軸の指標');
}
```

### バブルチャート

```typescript
interface BubbleData {
  x: number;
  y: number;
  size: number;   // バブルの大きさに使う値
  label: string;
  category: string;
}

function createBubbleChart(
  selector: string,
  data: BubbleData[]
): void {
  // ... （散布図の設定と同じ）

  // バブルサイズスケール（面積でマッピング）
  const sizeScale = d3.scaleSqrt()  // 面積を正しく表現するため平方根スケール
    .domain([0, d3.max(data, d => d.size) ?? 0])
    .range([4, 40]);  // 最小〜最大半径

  g.selectAll('.bubble')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.x))
    .attr('cy', d => y(d.y))
    .attr('r', d => sizeScale(d.size))  // 平方根スケールで面積を正確に表現
    .attr('fill', d => color(d.category))
    .attr('opacity', 0.65)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5);
}
```

---

## 9. 地図 — geoPath・geoMercator・TopoJSON

D3.jsの地図描画機能は非常に強力で、GeoJSONやTopoJSONデータと組み合わせてインタラクティブな地図を作成できる。

```bash
npm install topojson-client
npm install --save-dev @types/topojson-client
```

```typescript
import * as topojson from 'topojson-client';

async function createJapanMap(selector: string): Promise<void> {
  // GeoJSONデータの読み込み
  const japanData = await d3.json<any>('/data/japan.topojson');

  const width = 800;
  const height = 600;

  const svg = d3.select(selector)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // 投影法の設定
  const projection = d3.geoMercator()
    .center([136, 36])     // 地図の中心（経度, 緯度）
    .scale(1600)           // ズームスケール
    .translate([width / 2, height / 2]);  // SVG中心に配置

  // パスジェネレーター
  const path = d3.geoPath().projection(projection);

  // TopoJSONをGeoJSONに変換
  const prefectures = topojson.feature(
    japanData,
    japanData.objects.prefectures
  );

  // 都道府県の塗り分け（コロプレス）
  const populationData = new Map<string, number>([
    ['東京都', 14000000],
    ['大阪府', 8800000],
    // ...
  ]);

  const colorScale = d3.scaleSequential()
    .domain([0, 14000000])
    .interpolator(d3.interpolateBlues);

  // 地図を描画
  svg.selectAll('.prefecture')
    .data((prefectures as any).features)
    .enter()
    .append('path')
    .attr('class', 'prefecture')
    .attr('d', path as any)
    .attr('fill', (d: any) => {
      const pop = populationData.get(d.properties.name);
      return pop ? colorScale(pop) : '#ccc';
    })
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.5)
    .on('mouseover', function(event, d: any) {
      d3.select(this)
        .attr('stroke', '#333')
        .attr('stroke-width', 2);
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5);
    });

  // 他の投影法
  // d3.geoOrthographic()    → 3D地球儀
  // d3.geoAlbers()          → 等積円錐図法（米国でよく使用）
  // d3.geoNaturalEarth1()   → 自然地球図法（世界地図向き）
  // d3.geoEquirectangular() → 正距円筒図法（シンプル）
}
```

---

## 10. トランジション・アニメーション — transition・duration・ease

### 基本的なトランジション

```typescript
// 単純なトランジション
d3.select('.bar')
  .transition()
  .duration(500)          // ミリ秒
  .delay(100)             // 開始遅延
  .ease(d3.easeElasticOut)// イージング関数
  .attr('height', 200)
  .attr('fill', '#f28e2b');

// 順番にアニメーション（staggered）
d3.selectAll('.bar')
  .transition()
  .duration(400)
  .delay((d, i) => i * 50)  // インデックスに応じた遅延
  .attr('y', d => y(d.value))
  .attr('height', d => height - y(d.value));
```

### イージング関数

```typescript
// D3.jsの主要なイージング関数
const easings = {
  // 線形
  linear: d3.easeLinear,
  
  // 二次
  quadIn: d3.easeQuadIn,
  quadOut: d3.easeQuadOut,
  quadInOut: d3.easeQuadInOut,
  
  // 三次（デフォルト）
  cubicInOut: d3.easeCubicInOut,
  
  // バウンス
  bounceOut: d3.easeBounceOut,
  
  // 弾性
  elasticOut: d3.easeElasticOut,
  
  // バック（少しオーバーシュート）
  backOut: d3.easeBackOut,
  
  // サイン波
  sinInOut: d3.easeSinInOut,
};
```

### データ更新アニメーション

```typescript
function updateBarChart(
  g: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
  data: SalesData[],
  x: d3.ScaleBand<string>,
  y: d3.ScaleLinear<number, number>,
  height: number
): void {
  const t = d3.transition().duration(600).ease(d3.easeCubicInOut);

  // データ結合
  const bars = g.selectAll<SVGRectElement, SalesData>('.bar')
    .data(data, d => d.month);

  // enter: 新しいバーが右から現れる
  bars.enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.month) ?? 0)
    .attr('y', height)
    .attr('width', x.bandwidth())
    .attr('height', 0)
    .attr('fill', '#4e79a7')
    .merge(bars)  // enterとupdateを結合
    .transition(t)
    .attr('x', d => x(d.month) ?? 0)
    .attr('y', d => y(d.sales))
    .attr('height', d => height - y(d.sales));

  // exit: 削除されるバーが下に消える
  bars.exit()
    .transition(t)
    .attr('y', height)
    .attr('height', 0)
    .remove();

  // 軸更新もアニメーション
  g.select<SVGGElement>('.y-axis')
    .transition(t)
    .call(d3.axisLeft(y));
}
```

---

## 11. ズーム・パン — zoom・transform

```typescript
function addZoomBehavior(
  svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  g: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
  width: number,
  height: number
): void {
  // ズーム動作の定義
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 10])   // 最小〜最大ズーム倍率
    .translateExtent([[0, 0], [width, height]])  // パン範囲を制限
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      // グループ全体に変換を適用
      g.attr('transform', event.transform.toString());
    });

  // SVGにズーム動作を適用
  svg.call(zoom);

  // プログラム的なズーム操作
  const resetButton = d3.select('#reset-zoom');
  resetButton.on('click', () => {
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);  // リセット
  });

  const zoomInButton = d3.select('#zoom-in');
  zoomInButton.on('click', () => {
    svg.transition()
      .duration(300)
      .call(zoom.scaleBy, 1.5);  // 1.5倍ズームイン
  });
}

// ブラッシング（範囲選択）との組み合わせ
const brush = d3.brushX<unknown>()
  .extent([[0, 0], [width, height]])
  .on('end', function(event) {
    if (!event.selection) return;
    const [x0, x1] = event.selection as [number, number];
    // 選択範囲のデータをフィルタリング
    const filtered = data.filter(d =>
      x(d.date) >= x0 && x(d.date) <= x1
    );
    console.log('選択されたデータ:', filtered);
  });
```

---

## 12. React統合 — useRef・useEffect・D3 + React Hooks

### D3.jsとReactの統合パターン

ReactとD3.jsを統合する際、2つのアプローチがある。「D3がDOMを制御する」パターンと「ReactがDOMを制御する」パターンだ。

**アプローチ1: D3がDOMを制御（推奨）**

```tsx
import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface BarChartProps {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 600,
  height = 400,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();  // 再描画前にクリア

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerWidth])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) ?? 0])
      .range([innerHeight, 0])
      .nice();

    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.label) ?? 0)
      .attr('y', innerHeight)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', '#4e79a7')
      .transition().duration(600)
      .attr('y', d => y(d.value))
      .attr('height', d => innerHeight - y(d.value));

    g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x));
    g.append('g').call(d3.axisLeft(y));
  }, [data, width, height]);  // データや寸法が変わったら再描画

  return <svg ref={svgRef} width={width} height={height} />;
};
```

**アプローチ2: ReactがDOMを制御（軽量）**

```tsx
import React, { useMemo } from 'react';
import * as d3 from 'd3';

interface ReactD3BarChartProps {
  data: { label: string; value: number }[];
}

export const ReactD3BarChart: React.FC<ReactD3BarChartProps> = ({ data }) => {
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = 600;
  const height = 400;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // スケールはuseMemoで計算（レンダリングごとに再計算しない）
  const xScale = useMemo(() =>
    d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerWidth])
      .padding(0.2),
    [data, innerWidth]
  );

  const yScale = useMemo(() =>
    d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) ?? 0])
      .range([innerHeight, 0])
      .nice(),
    [data, innerHeight]
  );

  // 軸の目盛りをReactで生成
  const yTicks = yScale.ticks(5);

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* グリッド線 */}
        {yTicks.map(tick => (
          <line
            key={tick}
            x1={0} x2={innerWidth}
            y1={yScale(tick)} y2={yScale(tick)}
            stroke="#e0e0e0" strokeDasharray="3,3"
          />
        ))}
        {/* バー */}
        {data.map(d => (
          <rect
            key={d.label}
            x={xScale(d.label)}
            y={yScale(d.value)}
            width={xScale.bandwidth()}
            height={innerHeight - yScale(d.value)}
            fill="#4e79a7"
          />
        ))}
        {/* X軸ラベル */}
        {data.map(d => (
          <text
            key={d.label}
            x={(xScale(d.label) ?? 0) + xScale.bandwidth() / 2}
            y={innerHeight + 20}
            textAnchor="middle"
            fontSize={12}
          >
            {d.label}
          </text>
        ))}
      </g>
    </svg>
  );
};
```

### カスタムフックで再利用可能なD3ロジック

```typescript
// useD3.ts — D3.jsのセットアップを抽象化するカスタムフック
import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export function useD3<T>(
  renderFn: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void,
  dependencies: T[]
) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    renderFn(d3.select(ref.current));
    return () => {
      // クリーンアップ（必要に応じて）
    };
  }, dependencies);

  return ref;
}

// 使用例
function MyChart({ data }: { data: DataPoint[] }) {
  const ref = useD3<DataPoint[]>(
    (svg) => {
      // SVGに対してD3の処理を書く
      svg.selectAll('*').remove();
      // ... チャートのロジック
    },
    [data]
  );

  return <svg ref={ref} width={600} height={400} />;
}
```

---

## 13. レスポンシブ対応 — viewBox・ResizeObserver

### viewBoxによるスケーリング

```typescript
// viewBoxを使ったレスポンシブSVG
const svg = d3.select('#chart')
  .append('svg')
  .attr('viewBox', `0 0 600 400`)           // 論理サイズ
  .attr('preserveAspectRatio', 'xMidYMid meet') // アスペクト比維持
  .style('width', '100%')                    // 親要素に合わせる
  .style('height', 'auto');                  // 高さ自動調整
```

### ResizeObserverによる動的リサイズ

```tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

interface ResponsiveChartProps {
  data: { label: string; value: number }[];
}

export const ResponsiveBarChart: React.FC<ResponsiveChartProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // ResizeObserverでコンテナサイズを監視
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // サイズが変わったらチャートを再描画
  useEffect(() => {
    if (!svgRef.current || !dimensions.width) return;
    drawChart(svgRef.current, data, dimensions.width, dimensions.height);
  }, [data, dimensions]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '400px' }}>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
    </div>
  );
};

function drawChart(
  svgEl: SVGSVGElement,
  data: { label: string; value: number }[],
  containerWidth: number,
  containerHeight: number
): void {
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  if (width <= 0 || height <= 0) return;

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value) ?? 0])
    .range([height, 0])
    .nice();

  // モバイル時はラベルを短縮
  const isMobile = containerWidth < 480;
  const tickFormat = isMobile
    ? (d: string) => d.slice(0, 3)
    : (d: string) => d;

  g.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.label) ?? 0)
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => height - y(d.value))
    .attr('fill', '#4e79a7');

  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(tickFormat));

  g.append('g').call(d3.axisLeft(y));
}
```

### D3.jsビジュアライゼーションのベストプラクティス

**パフォーマンス最適化**

```typescript
// 大量データの処理はCanvas + D3スケールを組み合わせる
const canvas = d3.select('#canvas').node() as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// 数十万点のデータ → SVGは限界
// Canvasは高速だが、インタラクションは手動実装が必要
function drawScatterCanvas(data: ScatterPoint[]): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  data.forEach(d => {
    ctx.beginPath();
    ctx.arc(x(d.x), y(d.y), 3, 0, 2 * Math.PI);
    ctx.fillStyle = color(d.category);
    ctx.fill();
  });
}

// D3のスケールをCanvasのクリックイベントで活用
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const mx = event.clientX - rect.left;
  const my = event.clientY - rect.top;
  
  // クリック位置からデータ値を逆引き
  const dataX = x.invert(mx);
  const dataY = y.invert(my);
  
  // 最近傍点を探索
  const nearest = data.reduce((prev, curr) => {
    const pd = Math.hypot(x(prev.x) - mx, y(prev.y) - my);
    const cd = Math.hypot(x(curr.x) - mx, y(curr.y) - my);
    return cd < pd ? curr : prev;
  });
});
```

---

## まとめ

D3.jsはデータビジュアライゼーションの世界で唯一無二のポジションを持つライブラリだ。学習コストは高いが、一度マスターすれば想像するほぼあらゆるビジュアライゼーションを実現できる。

本記事で解説した要素を組み合わせると:
- SVGの基本要素を自在に配置・スタイリングできる
- データ結合（Data Join）でDOMとデータを同期できる
- スケールで任意のデータ範囲をSVG座標に変換できる
- トランジションでスムーズなアニメーションを実装できる
- React統合でモダンな開発フローに乗せられる
- ResizeObserverでレスポンシブなグラフを実現できる

次のステップとして、D3.jsのネットワーク可視化（force-directed graph）、ツリーマップ（treemap）、サンキーダイアグラム（sankey）などの高度なビジュアライゼーションに挑戦することをお勧めする。

---

## データ前処理のヒント — DevToolBox

D3.jsでグラフを描画する前に、JSONデータの構造が正しいかどうかを確認することが非常に重要だ。`null` 値の混入、型の不一致、ネストの深さの違いなどが原因で、グラフが正しく描画されないケースは多い。

[DevToolBox](https://usedevtools.com/) には **JSON Formatter / Validator** が搭載されており、D3.jsに渡す前のデータを素早く検証・整形できる。APIから取得したデータやCSVから変換したJSONが正しい構造になっているかをブラウザ上で即座にチェックでき、D3.jsのデバッグ時間を大幅に短縮できる。React + D3.jsの開発環境と合わせてブックマークしておくと便利だ。
