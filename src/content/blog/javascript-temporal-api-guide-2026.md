---
title: "JavaScript Temporal API完全入門【Date廃止後の新標準2026年版】"
description: "JavaScriptの新しい日付・時刻APIであるTemporal APIを徹底解説。DateオブジェクトのなぜTemporalに置き換えられるのか、PlainDate・ZonedDateTime・Durationの使い方、タイムゾーン処理をコード例付きで紹介します。"
pubDate: "2026-03-10"
tags: ["エンジニア", "プログラミング", "TypeScript", "フロントエンド"]
heroImage: '../../assets/thumbnails/javascript-temporal-api-guide-2026.jpg'
---

## はじめに

JavaScriptの `Date` オブジェクトは長年にわたって開発者を悩ませてきた。

タイムゾーン処理の複雑さ、ミュータブルな設計、直感的でないAPIなど、多くの問題がある。これを解決するために TC39 で策定が進んでいるのが **Temporal API** だ。

2026年現在、Temporal APIは Stage 3（候補段階）にあり、主要ブラウザでフラグ付きで利用可能になっている。

---

## なぜ Date は問題だったのか

### 問題1: ミュータブル設計

```javascript
// Dateオブジェクトはミュータブル（変更可能）
const date = new Date('2026-03-10');
const nextWeek = date;

// 破壊的変更！dateもnextWeekも同じオブジェクトを参照
nextWeek.setDate(date.getDate() + 7);
console.log(date.toDateString()); // 意図せず変わっている！
```

### 問題2: タイムゾーンの扱いが難しい

```javascript
// Dateはタイムゾーンを直接サポートしない
const date = new Date('2026-03-10T00:00:00');
// これはローカルタイム？UTC？JST？コンテキストで変わる
```

### 問題3: 月が0始まりという罠

```javascript
// 月は0始まり（0 = 1月、11 = 12月）
const date = new Date(2026, 2, 10); // 実は2026年3月10日
// 直感的でない！バグの温床
```

### 問題4: 日時計算が面倒

```javascript
// 「30日後」を計算するのにこんなに書く必要がある
const date = new Date();
const futureDate = new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000);
```

---

## Temporal API の基本型

Temporal APIには複数の型があり、それぞれ異なる用途に使う。

| 型 | 説明 | 例 |
|----|------|-----|
| `Temporal.PlainDate` | タイムゾーンなしの日付 | 2026-03-10 |
| `Temporal.PlainTime` | タイムゾーンなしの時刻 | 14:30:00 |
| `Temporal.PlainDateTime` | タイムゾーンなしの日時 | 2026-03-10T14:30:00 |
| `Temporal.ZonedDateTime` | タイムゾーンありの日時 | 2026-03-10T14:30:00+09:00[Asia/Tokyo] |
| `Temporal.Instant` | UTC基準のタイムスタンプ | 1741600200000000000（ナノ秒） |
| `Temporal.Duration` | 時間の長さ | P30DT4H（30日4時間） |
| `Temporal.PlainMonthDay` | 月と日（年なし） | --03-10（3月10日） |
| `Temporal.PlainYearMonth` | 年と月 | 2026-03 |

---

## PlainDate: タイムゾーンなしの日付処理

日付のみ（時刻・タイムゾーン不要）のケースで使う。

```javascript
// 日付の作成
const today = Temporal.Now.plainDateISO();
console.log(today.toString()); // "2026-03-10"

const specificDate = Temporal.PlainDate.from('2026-12-25');
const fromParts = new Temporal.PlainDate(2026, 3, 10); // 月が1始まり！

// イミュータブル: 元のオブジェクトは変わらない
const tomorrow = today.add({ days: 1 });
console.log(today.toString());    // "2026-03-10" (変わらない)
console.log(tomorrow.toString()); // "2026-03-11"

// 日付計算
const birthday = Temporal.PlainDate.from('1990-05-15');
const now = Temporal.Now.plainDateISO();
const age = now.since(birthday);
console.log(age.years); // 35 (2026年時点)

// 日付比較
const date1 = Temporal.PlainDate.from('2026-03-10');
const date2 = Temporal.PlainDate.from('2026-04-01');
console.log(Temporal.PlainDate.compare(date1, date2)); // -1 (date1 < date2)
console.log(date1.equals(date2)); // false

// 月末を取得
const march2026 = Temporal.PlainDate.from('2026-03-01');
const lastDay = march2026.with({ day: march2026.daysInMonth });
console.log(lastDay.toString()); // "2026-03-31"
```

---

## ZonedDateTime: タイムゾーンを考慮した日時処理

タイムゾーンを扱う必要がある場合は `ZonedDateTime` を使う。

```javascript
// 現在の日時をタイムゾーン付きで取得
const tokyoNow = Temporal.Now.zonedDateTimeISO('Asia/Tokyo');
console.log(tokyoNow.toString());
// "2026-03-10T14:30:00+09:00[Asia/Tokyo]"

// タイムゾーン変換
const nycTime = tokyoNow.withTimeZone('America/New_York');
console.log(nycTime.toString());
// "2026-03-10T01:30:00-04:00[America/New_York]" （同じ瞬間）

// 特定の日時をタイムゾーン付きで作成
const meeting = Temporal.ZonedDateTime.from({
  year: 2026,
  month: 3,
  day: 15,
  hour: 10,
  minute: 0,
  timeZone: 'Asia/Tokyo',
});

// サマータイムを自動考慮
const losAngeles = Temporal.ZonedDateTime.from('2026-03-08T10:00:00-08:00[America/Los_Angeles]');
const dayLater = losAngeles.add({ days: 1 });
// アメリカのDST切り替え日でも正確に計算される
```

---

## Duration: 期間の計算

```javascript
// Durationの作成
const twoWeeks = Temporal.Duration.from({ weeks: 2 });
const threeMonths = new Temporal.Duration(0, 3); // (years, months)
const complex = Temporal.Duration.from('P1Y2M3DT4H5M6S'); // ISO 8601形式

// 期間の加減算
const start = Temporal.PlainDate.from('2026-01-01');
const afterThreeMonths = start.add(threeMonths);
console.log(afterThreeMonths.toString()); // "2026-04-01"

// 2つの日付の差
const date1 = Temporal.PlainDate.from('2026-01-01');
const date2 = Temporal.PlainDate.from('2026-12-31');
const diff = date1.until(date2, { largestUnit: 'month' });
console.log(diff.months); // 11
console.log(diff.days);   // 30

// 期間の比較
const d1 = Temporal.Duration.from({ days: 30 });
const d2 = Temporal.Duration.from({ months: 1 });
// 注意: 月は固定日数でないため直接比較できない
// 特定の基準日が必要
```

---

## Instant: 機械的な時刻処理

Instantは「ある瞬間」をUTCのナノ秒精度で表す。

```javascript
// 現在時刻のInstant
const now = Temporal.Now.instant();
console.log(now.epochMilliseconds); // Dateのgettime()相当
console.log(now.epochNanoseconds);  // ナノ秒精度（BigInt）

// Dateとの相互変換
const oldDate = new Date('2026-03-10T00:00:00Z');
const instant = Temporal.Instant.fromEpochMilliseconds(oldDate.getTime());
console.log(instant.toString()); // "2026-03-10T00:00:00Z"

// Instantからタイムゾーン付きに変換
const tokyo = instant.toZonedDateTimeISO('Asia/Tokyo');
console.log(tokyo.toString());
// "2026-03-10T09:00:00+09:00[Asia/Tokyo]"

// 2つのInstantの差
const start = Temporal.Instant.from('2026-03-10T00:00:00Z');
const end = Temporal.Instant.from('2026-03-10T12:00:00Z');
const diff = end.since(start);
console.log(diff.hours); // 12
```

---

## 実践例: よくある日付処理をTemporalで書く

### 例1: 日付フォーマット

```javascript
// Temporal + Intl.DateTimeFormat の組み合わせ
const date = Temporal.PlainDate.from('2026-03-10');

const formatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  calendar: 'japanese',
});

// PlainDateをDateに変換してから (現在の実装ではこの手順が必要)
const jsDate = new Date(date.toString());
console.log(formatter.format(jsDate));
// "2026年3月10日"

// または単純なフォーマット
console.log(`${date.year}年${date.month}月${date.day}日`);
```

### 例2: 業務日の計算（週末スキップ）

```javascript
function addBusinessDays(date, days) {
  let current = date;
  let added = 0;

  while (added < days) {
    current = current.add({ days: 1 });

    // 土曜(6)・日曜(7)はスキップ
    if (current.dayOfWeek <= 5) {
      added++;
    }
  }

  return current;
}

const today = Temporal.PlainDate.from('2026-03-10'); // 火曜日
const deadline = addBusinessDays(today, 5);
console.log(deadline.toString()); // "2026-03-17" (月曜日)
```

### 例3: 年齢計算

```javascript
function calculateAge(birthday, referenceDate = Temporal.Now.plainDateISO()) {
  const birth = Temporal.PlainDate.from(birthday);

  // 今年の誕生日
  const thisYearBirthday = birth.with({ year: referenceDate.year });

  // 誕生日が過ぎているかチェック
  const hasHadBirthdayThisYear = Temporal.PlainDate.compare(
    referenceDate,
    thisYearBirthday
  ) >= 0;

  const age = referenceDate.year - birth.year - (hasHadBirthdayThisYear ? 0 : 1);
  return age;
}

console.log(calculateAge('1990-05-15'));  // 35 (2026-03-10時点)
console.log(calculateAge('1990-01-01'));  // 36
```

### 例4: カウントダウン

```javascript
function countdown(targetDate) {
  const target = Temporal.PlainDate.from(targetDate);
  const today = Temporal.Now.plainDateISO();

  const diff = today.until(target, {
    largestUnit: 'day',
    smallestUnit: 'day',
  });

  if (diff.days < 0) {
    return `${Math.abs(diff.days)}日経過`;
  } else if (diff.days === 0) {
    return '今日です！';
  } else {
    return `あと${diff.days}日`;
  }
}

console.log(countdown('2026-12-25')); // "あと○○日"
```

### 例5: タイムゾーンをまたいだ会議時刻の表示

```javascript
// 東京時間で14時に予定した会議を、各拠点の時間で表示
function showMeetingTimes(tokyoDateTime) {
  const tokyo = Temporal.ZonedDateTime.from(
    `${tokyoDateTime}[Asia/Tokyo]`
  );

  const timezones = {
    '東京': 'Asia/Tokyo',
    'ニューヨーク': 'America/New_York',
    'ロンドン': 'Europe/London',
    'シドニー': 'Australia/Sydney',
  };

  Object.entries(timezones).forEach(([city, tz]) => {
    const localTime = tokyo.withTimeZone(tz);
    const formattedTime = `${localTime.hour}:${String(localTime.minute).padStart(2, '0')}`;
    console.log(`${city}: ${formattedTime}`);
  });
}

showMeetingTimes('2026-03-10T14:00:00');
// 東京: 14:00
// ニューヨーク: 01:00
// ロンドン: 05:00
// シドニー: 16:00
```

---

## 現時点での使い方（ポリフィル）

Temporal APIはまだネイティブサポートが全てのブラウザで完全ではないため、現時点では `@js-temporal/polyfill` を使う。

```bash
npm install @js-temporal/polyfill
```

```javascript
// TypeScriptでの使い方
import { Temporal } from '@js-temporal/polyfill';

const today = Temporal.Now.plainDateISO();
console.log(today.toString()); // "2026-03-10"
```

```typescript
// tsconfig.json に "lib": ["ESNext.Temporal"] を追加
{
  "compilerOptions": {
    "lib": ["ES2023", "ESNext.Temporal"]
  }
}
```

---

## Dateとの比較まとめ

| 機能 | Date | Temporal |
|------|------|---------|
| イミュータブル | × | ◎ |
| タイムゾーンサポート | △（手動変換必要） | ◎（ZonedDateTimeで完全対応） |
| 月が1始まり | × (0始まり) | ◎ (1始まり) |
| 型の明確さ | × (全て混在) | ◎ (用途別に分離) |
| 日付計算の直感性 | △ | ◎ |
| ナノ秒精度 | × (ミリ秒まで) | ◎ |
| 比較メソッド | × (手動変換) | ◎ (compare/equals) |

---

## まとめ

Temporal APIは、長年JavaScriptの弱点だった日付・時刻処理を根本から改善する仕様だ。

### 今すぐ始める方法

1. `@js-temporal/polyfill` をインストール
2. 新規プロジェクトではTemporalを使い始める
3. 既存の `Date` コードは段階的に移行

特に**タイムゾーンを扱うアプリケーション**や**複雑な日付計算が必要なシステム**では、Temporalに移行することで大幅にコードがシンプルになる。

---

## 参考リンク

- [TC39 Temporal Proposal](https://tc39.es/proposal-temporal/)
- [@js-temporal/polyfill npm](https://www.npmjs.com/package/@js-temporal/polyfill)
- [Temporal Cookbook（公式レシピ集）](https://tc39.es/proposal-temporal/docs/cookbook.html)
- [MDN Temporal API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
