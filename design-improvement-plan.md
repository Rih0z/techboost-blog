# TechBoost Blog デザイン改修計画

> **技術スタック**: Astro（`sites/blog/`）
> **関連スキル**: [`.claude/skills/project-techboost.md`](../../.claude/skills/project-techboost.md)
> **関連宣言**: 宣言7（ブログ記事作成）、宣言4（UI/Webデザイン）
> **デザインシステム参照**: [`docs/design/design-system.md`](../../docs/design/design-system.md)

---

## Step 0: ペルソナ分析（デザイン起点）

> **設計哲学**: ペルソナを定義してからデザインを始める（`docs/design/design-system.md § Design Process` 参照）。
> ブログのレイアウト・フォント・記事構成・CTA設計の全意思決定はこのペルソナに基づく。

### P1 — メインターゲット「学び中の若手エンジニア」

```yaml
persona:
  id: "P1"
  label: "メインターゲット"

  name: "大野 ひかり"
  age: 24
  gender: "女性"
  occupation: "Web制作会社 フロントエンドエンジニア（1年目）"
  income_range: "300〜380万円"
  location: "名古屋市（週3リモート）"

  personality:
    - "インプット好き。知識を蓄えることに喜びを感じる"
    - "メモ魔。QiitaやZennに実装ログを書く習慣がある"
    - "わからないことへの不安感が強い（スタートアップとは違い正解を求める）"
    - "デザインに興味があり、UIの細部が気になる"

  values:
    - "スキルアップを最優先（自己投資を厭わない）"
    - "プロからの一次情報を信頼する（公式ドキュメント・権威あるブログ）"
    - "手を動かして覚える（コピペではなく理解から）"

  future_dreams:
    - "3年でフルスタックになり、フリーランスとして独立したい"
    - "自分でサービスを作ってリリースしたい"
    - "英語でコミュニケーションして海外チームで働きたい"

  pain_points:
    functional:
      - "公式ドキュメントは英語・難解で、日本語の質の高い解説が少ない"
      - "コピペしても動く理由が分からない（原理を理解したい）"
      - "Next.js・Astro・Tailwind等、選択肢が多すぎてどれを学ぶべきか迷う"
    emotional:
      - "「こんなことも知らないのか」と思われるのが怖く質問できない"
      - "勉強しても追いつけない焦り（技術の進化が早すぎる）"
    social:
      - "GitHubのコントリビューションやQiita記事数を同僚と比較してしまう"
      - "チーム内で「技術に詳しい人」として認められたい"

  usage_context:
    when: "通勤中（電車・バス 片道40分）、昼休み、就寝前（23時〜）"
    where: "iPhone で検索してそのまま読む"
    device: "iPhone SE（小さい画面）/ 会社では MacBook"
    trigger: "実装中につまずいたとき（エラー解決目的）/ Twitterで記事シェアを見たとき"

  goals:
    primary: "わかりやすい日本語で原理から理解できる解説を読みたい"
    secondary: "ページをブックマーク/Notionに保存してあとで参照したい"
    implicit: "この記事を書いた人（エンジニア）を信頼して、今後も読み続けたい"

  design_implications:
    tone: "親しみやすく・丁寧・わかりやすさ最優先（権威はありつつも威圧しない）"
    readability: "本文フォントサイズ16-18px以上、行間1.8以上。SP最優先"
    code_blocks: "コードブロックのシンタックスハイライト必須。コピーボタン必要"
    cta: "メルマガ・次の記事への誘導（「次はこれを読もう」型）"
    device_priority: "SP最優先（電車・就寝前の iPhone 閲覧が主な発見経路）"
```

---

### P2 — サブターゲット「課題解決型の中堅エンジニア」

```yaml
persona:
  id: "P2"
  label: "サブターゲット"

  name: "中村 隆之"
  age: 33
  gender: "男性"
  occupation: "Web系スタートアップ テックリード"
  income_range: "650〜900万円"
  location: "東京都世田谷区（フルリモート）"

  personality:
    - "問題解決志向。答えを素早く見つけることを最優先する"
    - "良い記事はすぐにチームSlackで共有する（影響力がある）"
    - "長すぎる前置きに苛立ちを感じる（結論を先に書いてほしい）"
    - "コードの品質・セキュリティに高い意識を持つ"

  values:
    - "チームの生産性を上げることが自分の評価に直結する"
    - "信頼できる情報源からのみ情報を取る（Zenn・信頼できるブログ）"
    - "技術負債を生まないコードへのこだわり"

  future_dreams:
    - "CTO/VPoEとして技術戦略を牽引したい"
    - "自分の技術的判断で会社の成長に貢献した実績を作りたい"
    - "技術書・OSSで業界に貢献したい"

  pain_points:
    functional:
      - "Next.js App Router / Astro / Turborepo の最新情報が散在していてキャッチアップが大変"
      - "パフォーマンス改善・WCAG対応のベストプラクティスをすぐ参照できる場所が欲しい"
      - "メンバーに共有できるレベルの丁寧な技術解説記事が少ない"
    emotional:
      - "情報が古い記事に気づかず実装してしまうことへの恐怖"
      - "メンバーへの共有記事の品質が自分の信頼性に影響することへのプレッシャー"
    social:
      - "「この記事をチームで読もう」と言える記事がなかなか見つからない"
      - "技術選定の根拠をメンバーに説明できる材料が欲しい"

  usage_context:
    when: "始業前（8〜9時）の情報収集、課題にぶつかったとき随時"
    where: "MacBook Pro（デスクトップ）/ RSS リーダー or Feedly で購読"
    device: "MacBook Pro、外部モニター接続（ダークモード）"
    trigger: "「Next.js のあの機能どう使うんだっけ」/ チームでの技術選定議論中"

  goals:
    primary: "最新・正確・実践的な技術情報をすばやく入手したい"
    secondary: "記事をメンバーに共有して議論のたたき台にしたい"
    implicit: "TechBoost を「信頼できる情報源」として継続購読したい（RSSリーダー登録）"

  design_implications:
    tone: "プロフェッショナル・情報密度高め・無駄のないUI"
    readability: "目次の自動生成（H2/H3構造必須）、ジャンプリンク対応"
    code_blocks: "言語表示・コピーボタン・行番号表示。長いコードは折りたたみ検討"
    cta: "RSSフィード・メルマガ購読への誘導（継続購読を促す）"
    device_priority: "PC/デスクトップも重要（SP偏重にしすぎない）"
    dark_mode: "必須（ダークモード常用者。ライトモードの白すぎる背景は目に痛い）"
```

---

### ペルソナ分析 → デザイン意思決定マッピング

| ペルソナの発見 | デザイン上の意思決定 | 優先度 |
|-------------|-------------------|------|
| P1: 電車・就寝前のスマホ閲覧が主 | **SP最優先レイアウト・本文フォント18px以上** | 最高 |
| P2: ダークモード常用 | **ダークモード必須実装** | 最高 |
| P1/P2: コードブロックのUQが命 | **シンタックスハイライト + コピーボタン** | 最高 |
| P2: 「長い前置き」への苛立ち | **目次を記事トップに固定表示** | 高 |
| P1: 「この人を信頼したい」 | プロフィール・著者情報を記事末に必ず表示 | 高 |
| P2: RSS購読者への対応 | RSSフィード整備・OGP画像必須 | 高 |
| P1: ブックマーク保存して後で参照 | 記事URLのパーマリンク設計（変更しない） | 中 |
| P2: チームSlackで共有する | OGP画像の品質（タイトル・サムネイル） | 中 |

---

## Phase 1: 基盤修正（最優先）

### 1.1 SP最適化（P1ペルソナ対応） ⭐⭐⭐

> **ペルソナ根拠**: P1「電車・就寝前のiPhone閲覧が主。iPhone SE（小さい画面）で読む」
> **デザインシステム根拠**: `docs/design/design-system.md § Foundations § Typography` — `--type-body-large` (1.125rem)、`--leading-relaxed` (1.75) を使用。`§ Responsive Design Principles` — モバイルファーストで実装

**問題**: Astroデフォルトテーマはモバイル最適化が不十分な場合がある。

**必須改善**:
- 本文フォントサイズ: `var(--type-body-large)` = 1.125rem (18px)
- 行間: `var(--leading-relaxed)` = 1.75
- 段落間余白: `var(--spacing-2)` = 1rem (16px) × 1.5em
- タップターゲット: 44×44px 以上（`docs/design/design-system.md § Iconography § Touch Target Padding` 準拠）

```css
/* src/styles/blog.css — design-system.md CSS変数を使用 */

/* design-system.md の変数をインポートして使用 */
.prose {
  font-family: var(--font-sans);
  font-size: var(--type-body-large);        /* 1.125rem = 18px */
  line-height: var(--leading-relaxed);      /* 1.75 */
  color: var(--color-on-surface);
}

.prose p {
  margin-bottom: calc(var(--spacing-2) * 1.5); /* 24px */
}

/* SP — design-system.md § Responsive § --breakpoint-sm: 640px */
@media (max-width: 640px) {
  .prose {
    font-size: var(--type-body-medium);     /* 1rem = 16px */
    padding: 0 var(--spacing-2);            /* 0 16px */
  }
}

/* タップターゲット */
.prose a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
```

**工数**: 1週間

---

### 1.2 ダークモード実装（P2ペルソナ対応） ⭐⭐⭐

> **ペルソナ根拠**: P2「ライトモードの白すぎる背景は目に痛い。ダークモード常用者」
> **デザインシステム根拠**: `docs/design/design-system.md § Dark Mode Strategy` — `[data-theme='dark']` CSS変数セット・ThemeProviderパターンに準拠。`§ Foundations § Color System` のダークモード変数（`--color-surface: #0f1117` 等）をそのまま適用

**問題**: Astroデフォルトテーマはダークモード非対応（または不完全）。

**実装**:
```astro
<!-- src/layouts/BlogPost.astro -->
<html lang="ja" data-theme={Astro.locals.theme ?? 'light'}>
  <head>
    <script is:inline>
      const stored = localStorage.getItem('theme');
      const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', stored ?? system);
    </script>
  </head>
</html>
```

**対象ファイル**:
- `src/layouts/Layout.astro`
- `src/layouts/BlogPost.astro`
- `src/styles/global.css`（`docs/design/design-system.md`のCSS変数を適用）

**工数**: 1週間

---

### 1.3 コードブロック強化（P1/P2共通最重要） ⭐⭐⭐

**問題**: Astroデフォルトのコードブロックはコピーボタン・言語表示がない。

**要件**:
- 言語ラベル表示（`js`, `tsx`, `css`等）
- ワンクリックコピーボタン
- シンタックスハイライト（Shiki統合、Astro標準で対応）
- ダークモード対応ハイライトテーマ

```astro
<!-- astro.config.mjs -->
import { defineConfig } from 'astro/config'

export default defineConfig({
  markdown: {
    shikiConfig: {
      theme: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
})
```

**コピーボタン実装**:
```astro
<!-- src/components/CodeBlock.astro -->
<div class="code-wrapper">
  <span class="code-lang">{lang}</span>
  <button class="copy-btn" onclick="copyCode(this)">コピー</button>
  <slot />
</div>
```

**工数**: 1週間

---

### 1.4 目次（TOC）自動生成（P2ペルソナ対応） ⭐⭐

**問題**: 長い技術記事でH2/H3構造への目次ジャンプ機能がない。

**実装**: Astroの`remark-toc`プラグイン or カスタムコンポーネント

```astro
<!-- src/components/TableOfContents.astro -->
---
const { headings } = Astro.props
---
<nav class="toc" aria-label="目次">
  <h2 class="toc-title">目次</h2>
  <ol class="toc-list">
    {headings.filter(h => h.depth <= 3).map(h => (
      <li class={`toc-item depth-${h.depth}`}>
        <a href={`#${h.slug}`}>{h.text}</a>
      </li>
    ))}
  </ol>
</nav>
```

**工数**: 1週間

---

### 1.5 OGP画像・RSS整備（P2ペルソナ対応） ⭐⭐

**問題**: Slackシェア時のOGP表示が貧弱だと信頼性が落ちる。

**要件**:
- 記事タイトルを自動生成したOGP画像（1200×630px）
- RSSフィード（`/rss.xml`）整備
- Twitter Card対応（`twitter:card: summary_large_image`）

**工数**: 1週間

---

## Phase 2: 信頼構築（1-3ヶ月）

### 2.1 著者プロフィールセクション ⭐⭐⭐

**設計根拠**: P1ペルソナの「この人を信頼したい」ニーズに対応。

**必須要素**:
- プロフィール画像
- 名前・役職・経歴サマリー（100字以内）
- SNSリンク（GitHub, Twitter/X, Zenn）
- 「このブログについて」への内部リンク

---

### 2.2 関連記事レコメンド ⭐⭐⭐

**設計根拠**: P1の「ブックマーク・継続参照」、P2の「チーム共有」を促進。

**実装**: タグベースの関連記事表示（記事末に3件）

```astro
<!-- src/components/RelatedPosts.astro -->
---
const { currentPost, allPosts } = Astro.props
const related = allPosts
  .filter(p => p.slug !== currentPost.slug)
  .filter(p => p.data.tags.some(t => currentPost.data.tags.includes(t)))
  .slice(0, 3)
---
```

---

### 2.3 検索機能 ⭐⭐

**設計根拠**: P2の「キャッチアップ目的の課題解決型検索」に対応。

**実装**: Pagefind（Astro公式推奨の静的サイト検索）

```sh
npm install @pagefind/default-ui
```

---

## デプロイ前チェックリスト（ペルソナ視点）

### P1チェック（スマホで実際に確認）

- [ ] iPhone SE（375px）で本文が快適に読めるか
- [ ] コードブロックが横スクロールなく読めるか（または横スクロールが自然か）
- [ ] タップターゲット（リンク・ボタン）が太い指でも押せるか
- [ ] 通勤中の流し読みで「このブログまた来よう」と思えるか

### P2チェック（MacBook ダークモードで確認）

- [ ] ダークモードでコードブロックが読みやすいか
- [ ] 目次から各セクションへのジャンプが機能するか
- [ ] Slack共有時のOGPプレビューが整っているか
- [ ] RSSリーダーで購読できるか（フィードURL確認）
- [ ] 記事URLが変更されない設計になっているか

### 共通チェック

- [ ] Lighthouse Performance 90+（P2: 「遅いサイトは信用しない」）
- [ ] Lighthouse Accessibility 90+
- [ ] WCAG 2.2 AA準拠（コントラスト比等）
- [ ] OGP画像サイズ 1200×630px

---

## KPI（ペルソナ対応指標）

| 指標 | 目標値 | 対応ペルソナ | 測定方法 |
|------|--------|------------|---------|
| 平均滞在時間 | 3分以上 | P1（読み込み型） | Google Analytics |
| ページ/セッション | 1.8以上 | P1（関連記事誘導） | GA |
| RSSフィード購読者 | 100名（3ヶ月） | P2（継続購読） | Feedburner/Feedly |
| モバイル直帰率 | 70%以下 | P1（SP最適化） | GA |
| Lighthouseスコア | 全カテゴリ90+ | P2（信頼性） | Vercel Analytics |

---

**最終更新**: 2026-02-19
**次回レビュー**: 2026-03-19
