---
title: 'shadcn/ui Charts完全ガイド - Rechartsベースの美しいチャートコンポーネント'
description: 'shadcn/ui Chartsを使ったデータ可視化を徹底解説。折れ線グラフ、棒グラフ、円グラフなど、カスタマイズ可能なチャートコンポーネントの実装方法。Tailwind CSSとの統合やダッシュボード構築に使えるカスタマイズ手法も詳しく解説します。'
pubDate: '2026-02-05'
tags: ['shadcn', 'React', 'データ可視化', 'Charts']
heroImage: '../../assets/thumbnails/shadcn-charts-guide.jpg'
---

shadcn/ui Chartsは、Rechartsをベースにした美しく、カスタマイズ可能なチャートコンポーネントライブラリです。shadcn/uiのデザインシステムと完全に統合され、TypeScript完全対応で型安全なデータ可視化が可能です。

この記事では、shadcn/ui Chartsの基本から高度なカスタマイズまで、実践的な使い方を解説します。

## shadcn/ui Chartsとは

shadcn/ui Chartsは、Rechartsをラップした使いやすいチャートコンポーネント集です。

### 主な特徴

- **shadcn/ui統合**: 一貫したデザインシステム
- **TypeScript対応**: 完全な型安全性
- **Recharts基盤**: 強力なチャート機能
- **カスタマイズ可能**: テーマとスタイルの柔軟性
- **レスポンシブ**: モバイルフレンドリー
- **アクセシビリティ**: ARIA対応

## セットアップ

### 前提条件

```bash
# Next.jsプロジェクト作成
npx create-next-app@latest my-charts-app

cd my-charts-app
```

### shadcn/ui初期化

```bash
# shadcn/ui CLI
npx shadcn-ui@latest init
```

### Chartsコンポーネント追加

```bash
# Chartコンポーネントをインストール
npx shadcn-ui@latest add chart
```

これにより以下がインストールされます:

- `recharts`
- `@/components/ui/chart`

## 基本的なチャート

### 折れ線グラフ

```tsx
// components/line-chart-demo.tsx
'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Line, LineChart, XAxis, YAxis } from 'recharts'

const data = [
  { month: '1月', sales: 4000 },
  { month: '2月', sales: 3000 },
  { month: '3月', sales: 5000 },
  { month: '4月', sales: 4500 },
  { month: '5月', sales: 6000 },
  { month: '6月', sales: 5500 },
]

export function LineChartDemo() {
  return (
    <ChartContainer
      config={{
        sales: {
          label: '売上',
          color: 'hsl(var(--chart-1))',
        },
      }}
      className="h-[300px]"
    >
      <LineChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="sales"
          stroke="var(--color-sales)"
          strokeWidth={2}
        />
      </LineChart>
    </ChartContainer>
  )
}
```

### 棒グラフ

```tsx
// components/bar-chart-demo.tsx
'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'

const data = [
  { category: 'A', value: 400 },
  { category: 'B', value: 300 },
  { category: 'C', value: 500 },
  { category: 'D', value: 200 },
]

export function BarChartDemo() {
  return (
    <ChartContainer
      config={{
        value: {
          label: '値',
          color: 'hsl(var(--chart-2))',
        },
      }}
      className="h-[300px]"
    >
      <BarChart data={data}>
        <XAxis dataKey="category" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={8} />
      </BarChart>
    </ChartContainer>
  )
}
```

### 円グラフ

```tsx
// components/pie-chart-demo.tsx
'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Pie, PieChart, Cell } from 'recharts'

const data = [
  { name: 'カテゴリA', value: 400 },
  { name: 'カテゴリB', value: 300 },
  { name: 'カテゴリC', value: 300 },
  { name: 'カテゴリD', value: 200 },
]

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
]

export function PieChartDemo() {
  return (
    <ChartContainer
      config={{
        value: {
          label: '値',
        },
      }}
      className="h-[300px]"
    >
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
```

## 複数系列チャート

### マルチラインチャート

```tsx
'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Line, LineChart, XAxis, YAxis } from 'recharts'

const data = [
  { month: '1月', revenue: 4000, profit: 2400 },
  { month: '2月', revenue: 3000, profit: 1398 },
  { month: '3月', revenue: 5000, profit: 3800 },
  { month: '4月', revenue: 4500, profit: 3908 },
  { month: '5月', revenue: 6000, profit: 4800 },
  { month: '6月', revenue: 5500, profit: 3800 },
]

export function MultiLineChart() {
  return (
    <ChartContainer
      config={{
        revenue: {
          label: '売上',
          color: 'hsl(var(--chart-1))',
        },
        profit: {
          label: '利益',
          color: 'hsl(var(--chart-2))',
        },
      }}
      className="h-[400px]"
    >
      <LineChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-revenue)"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="profit"
          stroke="var(--color-profit)"
          strokeWidth={2}
        />
      </LineChart>
    </ChartContainer>
  )
}
```

### スタックバーチャート

```tsx
'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'

const data = [
  { month: '1月', desktop: 186, mobile: 80, tablet: 40 },
  { month: '2月', desktop: 305, mobile: 200, tablet: 100 },
  { month: '3月', desktop: 237, mobile: 120, tablet: 60 },
  { month: '4月', desktop: 273, mobile: 190, tablet: 80 },
]

export function StackedBarChart() {
  return (
    <ChartContainer
      config={{
        desktop: {
          label: 'デスクトップ',
          color: 'hsl(var(--chart-1))',
        },
        mobile: {
          label: 'モバイル',
          color: 'hsl(var(--chart-2))',
        },
        tablet: {
          label: 'タブレット',
          color: 'hsl(var(--chart-3))',
        },
      }}
      className="h-[400px]"
    >
      <BarChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="desktop" stackId="a" fill="var(--color-desktop)" />
        <Bar dataKey="mobile" stackId="a" fill="var(--color-mobile)" />
        <Bar dataKey="tablet" stackId="a" fill="var(--color-tablet)" />
      </BarChart>
    </ChartContainer>
  )
}
```

## エリアチャート

### 基本的なエリアチャート

```tsx
'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Area, AreaChart, XAxis, YAxis } from 'recharts'

const data = [
  { date: '2024/01', value: 2400 },
  { date: '2024/02', value: 1398 },
  { date: '2024/03', value: 9800 },
  { date: '2024/04', value: 3908 },
  { date: '2024/05', value: 4800 },
  { date: '2024/06', value: 3800 },
]

export function AreaChartDemo() {
  return (
    <ChartContainer
      config={{
        value: {
          label: '値',
          color: 'hsl(var(--chart-1))',
        },
      }}
      className="h-[300px]"
    >
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          fillOpacity={1}
          fill="url(#colorValue)"
        />
      </AreaChart>
    </ChartContainer>
  )
}
```

### スタックエリアチャート

```tsx
'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Area, AreaChart, XAxis, YAxis } from 'recharts'

const data = [
  { month: '1月', email: 4000, social: 2400, direct: 2400 },
  { month: '2月', email: 3000, social: 1398, direct: 2210 },
  { month: '3月', email: 2000, social: 9800, direct: 2290 },
  { month: '4月', email: 2780, social: 3908, direct: 2000 },
]

export function StackedAreaChart() {
  return (
    <ChartContainer
      config={{
        email: {
          label: 'Eメール',
          color: 'hsl(var(--chart-1))',
        },
        social: {
          label: 'ソーシャル',
          color: 'hsl(var(--chart-2))',
        },
        direct: {
          label: 'ダイレクト',
          color: 'hsl(var(--chart-3))',
        },
      }}
      className="h-[400px]"
    >
      <AreaChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="email"
          stackId="1"
          stroke="var(--color-email)"
          fill="var(--color-email)"
        />
        <Area
          type="monotone"
          dataKey="social"
          stackId="1"
          stroke="var(--color-social)"
          fill="var(--color-social)"
        />
        <Area
          type="monotone"
          dataKey="direct"
          stackId="1"
          stroke="var(--color-direct)"
          fill="var(--color-direct)"
        />
      </AreaChart>
    </ChartContainer>
  )
}
```

## カスタムツールチップ

### リッチツールチップ

```tsx
'use client'

import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { Line, LineChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const data = [
  { date: '2024/01', sales: 4000, users: 240 },
  { date: '2024/02', sales: 3000, users: 139 },
  { date: '2024/03', sales: 5000, users: 380 },
]

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload) return null

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-sm">
          {payload[0].payload.date}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">売上</span>
          <span className="text-sm font-bold">
            ¥{payload[0].value.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">ユーザー</span>
          <span className="text-sm font-bold">
            {payload[1].value.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function CustomTooltipChart() {
  return (
    <ChartContainer
      config={{
        sales: {
          label: '売上',
          color: 'hsl(var(--chart-1))',
        },
        users: {
          label: 'ユーザー',
          color: 'hsl(var(--chart-2))',
        },
      }}
      className="h-[300px]"
    >
      <LineChart data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="sales"
          stroke="var(--color-sales)"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="users"
          stroke="var(--color-users)"
          strokeWidth={2}
        />
      </LineChart>
    </ChartContainer>
  )
}
```

## レスポンシブチャート

### ResponsiveContainer使用

```tsx
'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Line, LineChart, XAxis, YAxis, ResponsiveContainer } from 'recharts'

const data = [
  { month: '1月', value: 4000 },
  { month: '2月', value: 3000 },
  { month: '3月', value: 5000 },
]

export function ResponsiveChart() {
  return (
    <div className="w-full h-[300px] md:h-[400px] lg:h-[500px]">
      <ChartContainer
        config={{
          value: {
            label: '値',
            color: 'hsl(var(--chart-1))',
          },
        }}
        className="h-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}
```

## インタラクティブチャート

### クリックイベント

```tsx
'use client'

import { useState } from 'react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'

const data = [
  { category: 'A', value: 400 },
  { category: 'B', value: 300 },
  { category: 'C', value: 500 },
]

export function InteractiveChart() {
  const [selectedBar, setSelectedBar] = useState<string | null>(null)

  const handleClick = (data: any) => {
    setSelectedBar(data.category)
  }

  return (
    <div>
      <ChartContainer
        config={{
          value: {
            label: '値',
            color: 'hsl(var(--chart-1))',
          },
        }}
        className="h-[300px]"
      >
        <BarChart data={data} onClick={handleClick}>
          <XAxis dataKey="category" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="value"
            fill="var(--color-value)"
            opacity={0.8}
            cursor="pointer"
          />
        </BarChart>
      </ChartContainer>
      {selectedBar && (
        <p className="mt-4 text-center">
          選択: カテゴリ {selectedBar}
        </p>
      )}
    </div>
  )
}
```

## リアルタイムデータ

### ライブアップデート

```tsx
'use client'

import { useState, useEffect } from 'react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Line, LineChart, XAxis, YAxis } from 'recharts'

export function LiveChart() {
  const [data, setData] = useState([
    { time: '0s', value: 0 },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newData = [
          ...prev,
          {
            time: `${prev.length}s`,
            value: Math.random() * 100,
          },
        ].slice(-20) // 最新20件のみ保持

        return newData
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <ChartContainer
      config={{
        value: {
          label: '値',
          color: 'hsl(var(--chart-1))',
        },
      }}
      className="h-[300px]"
    >
      <LineChart data={data}>
        <XAxis dataKey="time" />
        <YAxis domain={[0, 100]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
```

## ダッシュボード例

### 総合ダッシュボード

```tsx
// app/dashboard/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChartDemo } from '@/components/line-chart-demo'
import { BarChartDemo } from '@/components/bar-chart-demo'
import { PieChartDemo } from '@/components/pie-chart-demo'

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">ダッシュボード</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              総売上
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥45,231</div>
            <p className="text-xs text-muted-foreground">
              前月比 +20.1%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              新規ユーザー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2,350</div>
            <p className="text-xs text-muted-foreground">
              前月比 +180.1%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              アクティブユーザー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">
              前月比 +19%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              コンバージョン率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
            <p className="text-xs text-muted-foreground">
              前月比 +0.5%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>月次売上推移</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartDemo />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>カテゴリ別売上</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartDemo />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>地域別売上</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChartDemo />
        </CardContent>
      </Card>
    </div>
  )
}
```

## テーマカスタマイズ

### カスタムカラー

```css
/* app/globals.css */
@layer base {
  :root {
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }

  .dark {
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
```

## パフォーマンス最適化

### 大規模データセット

```tsx
'use client'

import { useMemo } from 'react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Line, LineChart, XAxis, YAxis } from 'recharts'

export function LargeDataChart({ rawData }: { rawData: any[] }) {
  // データをメモ化
  const processedData = useMemo(() => {
    return rawData.slice(0, 100) // 最新100件のみ
  }, [rawData])

  return (
    <ChartContainer
      config={{
        value: {
          label: '値',
          color: 'hsl(var(--chart-1))',
        },
      }}
      className="h-[300px]"
    >
      <LineChart data={processedData}>
        <XAxis dataKey="date" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false} // 大規模データではドットを非表示
          isAnimationActive={false} // アニメーション無効化
        />
      </LineChart>
    </ChartContainer>
  )
}
```

## まとめ

shadcn/ui Chartsは、Rechartsの強力な機能とshadcn/uiの美しいデザインを組み合わせた最適なチャートソリューションです。

主なメリット:

- **簡単統合**: shadcn/uiとシームレス
- **TypeScript**: 完全な型安全性
- **カスタマイズ性**: 柔軟なスタイリング
- **パフォーマンス**: 最適化された描画

データ可視化が必要なプロジェクトには、shadcn/ui Chartsが最適な選択です。

## 参考リンク

- [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/)
- [Next.js](https://nextjs.org/)
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
