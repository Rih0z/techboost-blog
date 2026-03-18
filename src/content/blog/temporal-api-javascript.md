---
title: "Temporal API入門 — JavaScriptの日付操作が劇的に変わる"
description: "TC39 Stage 3のTemporal APIを徹底解説。Date()の問題点を解決する新しい日付API、PlainDate/PlainTime/ZonedDateTimeの使い方を実例とともに紹介します。"
pubDate: "2026-02-05"
tags: ["JavaScript", "Temporal API", "Date", "ECMAScript", "Web API"]
---

JavaScriptの`Date`オブジェクトは、開発者にとって長年の悩みの種でした。タイムゾーンの扱いにくさ、イミュータブルではない設計、直感的でないAPIなど、多くの問題を抱えています。Temporal APIは、これらの問題を根本から解決する新しい日付・時刻APIです。現在TC39 Stage 3で、主要ブラウザでの実装が進んでいます。

## Date()の問題点

まず、従来の`Date`オブジェクトの問題点を確認しましょう。

```javascript
// 問題1: ミュータブル
const date = new Date('2026-02-05');
date.setMonth(11); // dateが変更されてしまう

// 問題2: タイムゾーンの扱いが難しい
const date1 = new Date('2026-02-05T10:00:00');
console.log(date1.toISOString()); // ローカルタイムゾーンに依存

// 問題3: 月が0始まり
const date2 = new Date(2026, 1, 5); // 2月ではなく2月5日

// 問題4: APIが直感的でない
const diff = date2 - date1; // ミリ秒で返される
```

## Temporal APIの基本概念

Temporal APIは、用途に応じて複数のオブジェクトを提供します。

- **PlainDate** - 日付のみ（2026-02-05）
- **PlainTime** - 時刻のみ（14:30:00）
- **PlainDateTime** - 日付と時刻（タイムゾーンなし）
- **ZonedDateTime** - タイムゾーン付き日時
- **Instant** - UTCタイムスタンプ
- **Duration** - 期間
- **PlainYearMonth** - 年月のみ
- **PlainMonthDay** - 月日のみ

## PlainDateの使い方

日付のみを扱う場合は`PlainDate`を使います。

```javascript
import { Temporal } from '@js-temporal/polyfill';

// 日付の作成
const today = Temporal.Now.plainDateISO();
const birthday = Temporal.PlainDate.from('2000-05-15');
const custom = new Temporal.PlainDate(2026, 2, 5); // 月は1始まり!

// 日付の操作（イミュータブル）
const tomorrow = today.add({ days: 1 });
const nextWeek = today.add({ weeks: 1 });
const nextMonth = today.add({ months: 1 });

// 差分の計算
const age = birthday.until(today, { largestUnit: 'years' });
console.log(`${age.years}歳`);

// 比較
if (birthday.equals(custom)) {
  console.log('同じ日付です');
}

if (today.compare(tomorrow) < 0) {
  console.log('todayの方が過去');
}

// フォーマット
console.log(today.toString()); // "2026-02-05"
console.log(today.toLocaleString('ja-JP', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})); // "2026年2月5日"
```

## PlainTimeの使い方

時刻のみを扱う場合は`PlainTime`を使います。

```javascript
// 時刻の作成
const now = Temporal.Now.plainTimeISO();
const morning = Temporal.PlainTime.from('09:00:00');
const custom = new Temporal.PlainTime(14, 30, 0); // 14:30:00

// 時刻の操作
const inOneHour = now.add({ hours: 1 });
const inThirtyMinutes = now.add({ minutes: 30 });

// 差分の計算
const duration = morning.until(custom);
console.log(`${duration.hours}時間${duration.minutes}分`);

// 比較
if (morning.compare(custom) < 0) {
  console.log('朝の方が早い');
}

// フォーマット
console.log(morning.toString()); // "09:00:00"
```

## ZonedDateTimeの使い方

タイムゾーンを考慮した日時を扱う場合は`ZonedDateTime`を使います。

```javascript
// 現在の日時（タイムゾーン付き）
const now = Temporal.Now.zonedDateTimeISO();

// 特定のタイムゾーンで日時を作成
const tokyo = Temporal.ZonedDateTime.from({
  timeZone: 'Asia/Tokyo',
  year: 2026,
  month: 2,
  day: 5,
  hour: 14,
  minute: 30,
});

const newYork = Temporal.ZonedDateTime.from({
  timeZone: 'America/New_York',
  year: 2026,
  month: 2,
  day: 5,
  hour: 14,
  minute: 30,
});

// タイムゾーンの変換
const tokyoToNY = tokyo.withTimeZone('America/New_York');
console.log(tokyoToNY.toString());

// 日時の操作
const tomorrow = tokyo.add({ days: 1 });
const nextHour = tokyo.add({ hours: 1 });

// 夏時間を考慮した計算
const summer = Temporal.ZonedDateTime.from({
  timeZone: 'America/New_York',
  year: 2026,
  month: 7,
  day: 1,
  hour: 12,
});

// オフセットの取得
console.log(summer.offset); // "-04:00" (夏時間)
console.log(tokyo.offset); // "+09:00"
```

## Durationの使い方

期間を表現する場合は`Duration`を使います。

```javascript
// 期間の作成
const oneDay = Temporal.Duration.from({ days: 1 });
const twoHours = Temporal.Duration.from({ hours: 2, minutes: 30 });

// 期間の計算
const date1 = Temporal.PlainDate.from('2026-02-05');
const date2 = Temporal.PlainDate.from('2026-03-15');
const duration = date1.until(date2);

console.log(`${duration.days}日間`);

// 期間の操作
const doubled = duration.multiply(2);
const half = duration.divide(2);

// 期間の比較
const longer = Temporal.Duration.from({ days: 10 });
const shorter = Temporal.Duration.from({ days: 5 });
console.log(longer.compare(shorter)); // 1

// 人間が読める形式
console.log(duration.toString()); // "P38D"
console.log(twoHours.toString()); // "PT2H30M"
```

## 実用例

### 1. 営業日の計算

```javascript
function addBusinessDays(startDate, daysToAdd) {
  let current = Temporal.PlainDate.from(startDate);
  let added = 0;

  while (added < daysToAdd) {
    current = current.add({ days: 1 });
    const dayOfWeek = current.dayOfWeek;

    // 土曜日(6)と日曜日(7)をスキップ
    if (dayOfWeek !== 6 && dayOfWeek !== 7) {
      added++;
    }
  }

  return current;
}

const today = Temporal.Now.plainDateISO();
const deadline = addBusinessDays(today, 5);
console.log(`5営業日後: ${deadline.toString()}`);
```

### 2. タイムゾーンを跨ぐ会議時間の調整

```javascript
function convertMeetingTime(dateTime, fromZone, toZone) {
  const meeting = Temporal.ZonedDateTime.from({
    timeZone: fromZone,
    year: dateTime.year,
    month: dateTime.month,
    day: dateTime.day,
    hour: dateTime.hour,
    minute: dateTime.minute,
  });

  return meeting.withTimeZone(toZone);
}

// 東京時間で14:00の会議をニューヨーク時間に変換
const tokyoMeeting = {
  year: 2026,
  month: 2,
  day: 5,
  hour: 14,
  minute: 0,
};

const nyTime = convertMeetingTime(
  tokyoMeeting,
  'Asia/Tokyo',
  'America/New_York'
);

console.log(`東京: ${tokyoMeeting.hour}:00`);
console.log(`ニューヨーク: ${nyTime.hour}:${nyTime.minute.toString().padStart(2, '0')}`);
```

### 3. 相対的な日時の表示

```javascript
function timeAgo(pastDate) {
  const now = Temporal.Now.plainDateISO();
  const past = Temporal.PlainDate.from(pastDate);
  const duration = past.until(now, { largestUnit: 'days' });

  if (duration.days === 0) return '今日';
  if (duration.days === 1) return '昨日';
  if (duration.days < 7) return `${duration.days}日前`;
  if (duration.days < 30) return `${Math.floor(duration.days / 7)}週間前`;
  if (duration.days < 365) return `${Math.floor(duration.days / 30)}ヶ月前`;
  return `${Math.floor(duration.days / 365)}年前`;
}

console.log(timeAgo('2026-02-04')); // "昨日"
console.log(timeAgo('2026-01-29')); // "1週間前"
console.log(timeAgo('2025-12-05')); // "2ヶ月前"
```

### 4. 定期予定の計算

```javascript
function getRecurringDates(startDate, endDate, interval) {
  const dates = [];
  let current = Temporal.PlainDate.from(startDate);
  const end = Temporal.PlainDate.from(endDate);

  while (current.compare(end) <= 0) {
    dates.push(current);
    current = current.add(interval);
  }

  return dates;
}

// 毎週月曜日を取得
const mondays = getRecurringDates(
  '2026-02-02', // 月曜日
  '2026-03-31',
  { weeks: 1 }
);

console.log('2月〜3月の月曜日:');
mondays.forEach(date => console.log(date.toString()));
```

## Date()との比較

```javascript
// Date()の場合
const date1 = new Date('2026-02-05T14:30:00');
const date2 = new Date(date1);
date2.setDate(date2.getDate() + 1);
console.log(date1.toISOString()); // 変更されてしまう可能性

// Temporal APIの場合（イミュータブル）
const temporal1 = Temporal.PlainDateTime.from('2026-02-05T14:30:00');
const temporal2 = temporal1.add({ days: 1 });
console.log(temporal1.toString()); // "2026-02-05T14:30:00"
console.log(temporal2.toString()); // "2026-02-06T14:30:00"
```

## ブラウザサポートと使い方

現在Temporal APIは実装中です。本番で使用するにはpolyfillが必要です。

```bash
npm install @js-temporal/polyfill
```

```javascript
import { Temporal } from '@js-temporal/polyfill';

const now = Temporal.Now.plainDateISO();
console.log(now.toString());
```

## まとめ

Temporal APIは、JavaScriptの日付操作を根本から改善します。

**主な利点:**
- イミュータブルな設計
- 明確なタイムゾーン処理
- 直感的なAPI
- 型安全（TypeScript完全対応）
- 用途別の専用オブジェクト

現時点ではpolyfillが必要ですが、将来的にはネイティブサポートされる予定です。新しいプロジェクトでは、積極的にTemporal APIの導入を検討しましょう。
