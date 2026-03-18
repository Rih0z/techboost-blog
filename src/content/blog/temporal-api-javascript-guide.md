---
title: 'JavaScript Temporal API完全ガイド'
description: 'JavaScript Temporal APIによる日時操作の完全解説。タイムゾーン、Duration、ZonedDateTimeの実践的な使い方'
pubDate: 2025-02-05
tags: ['JavaScript', 'Temporal API', 'Date', 'Time', 'Timezone', 'ES2024']
---

JavaScript Temporal APIは、従来のDateオブジェクトの問題を解決する新しい標準APIです。本記事では、Temporal APIの実践的な使い方について詳しく解説します。

## Temporal APIの必要性

### Dateオブジェクトの問題点

従来のDateオブジェクトには多くの問題がありました。

```javascript
// ❌ 月が0始まり（混乱の元）
const date = new Date(2024, 0, 15); // 2024年1月15日

// ❌ タイムゾーンの扱いが困難
const now = new Date(); // ローカルタイムゾーン固定

// ❌ 日付操作が複雑
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

// ❌ 不変性がない（ミュータブル）
const original = new Date();
const copy = original;
copy.setDate(10);
console.log(original); // originalも変更される
```

### Temporal APIの利点

```javascript
// ✅ 直感的なAPI
const date = Temporal.PlainDate.from('2024-01-15');

// ✅ タイムゾーンサポート
const zonedDate = Temporal.ZonedDateTime.from('2024-01-15T12:00:00+09:00[Asia/Tokyo]');

// ✅ 簡単な日付操作
const tomorrow = date.add({ days: 1 });

// ✅ 不変性（イミュータブル）
const original = Temporal.Now.plainDateISO();
const modified = original.add({ days: 1 });
console.log(original); // originalは変更されない
```

## 基本的な型

### PlainDate - 日付のみ

時刻やタイムゾーンを含まない純粋な日付。

```javascript
// 作成
const date = Temporal.PlainDate.from('2024-01-15');
const dateFromObject = Temporal.PlainDate.from({
  year: 2024,
  month: 1,
  day: 15,
});

// 現在の日付を取得
const today = Temporal.Now.plainDateISO();

// プロパティへのアクセス
console.log(date.year); // 2024
console.log(date.month); // 1
console.log(date.day); // 15
console.log(date.dayOfWeek); // 1-7 (月曜日が1)
console.log(date.dayOfYear); // 1-366
console.log(date.weekOfYear); // 1-53

// 文字列化
console.log(date.toString()); // "2024-01-15"
console.log(date.toJSON()); // "2024-01-15"
```

### PlainTime - 時刻のみ

日付やタイムゾーンを含まない純粋な時刻。

```javascript
// 作成
const time = Temporal.PlainTime.from('14:30:00');
const timeFromObject = Temporal.PlainTime.from({
  hour: 14,
  minute: 30,
  second: 0,
});

// 現在の時刻を取得
const now = Temporal.Now.plainTimeISO();

// プロパティへのアクセス
console.log(time.hour); // 14
console.log(time.minute); // 30
console.log(time.second); // 0
console.log(time.millisecond); // 0
console.log(time.microsecond); // 0
console.log(time.nanosecond); // 0

// 文字列化
console.log(time.toString()); // "14:30:00"
```

### PlainDateTime - 日付と時刻

タイムゾーンを含まない日付と時刻。

```javascript
// 作成
const dateTime = Temporal.PlainDateTime.from('2024-01-15T14:30:00');
const dateTimeFromObject = Temporal.PlainDateTime.from({
  year: 2024,
  month: 1,
  day: 15,
  hour: 14,
  minute: 30,
});

// PlainDateとPlainTimeから結合
const date = Temporal.PlainDate.from('2024-01-15');
const time = Temporal.PlainTime.from('14:30:00');
const combined = date.toPlainDateTime(time);

// 分割
const { date: extractedDate, time: extractedTime } = dateTime;
console.log(extractedDate.toString()); // "2024-01-15"
console.log(extractedTime.toString()); // "14:30:00"
```

### ZonedDateTime - タイムゾーン付き日時

タイムゾーン情報を含む完全な日時。

```javascript
// 作成
const zonedDateTime = Temporal.ZonedDateTime.from(
  '2024-01-15T14:30:00+09:00[Asia/Tokyo]'
);

// 現在の日時をタイムゾーン付きで取得
const nowInTokyo = Temporal.Now.zonedDateTimeISO('Asia/Tokyo');
const nowInNewYork = Temporal.Now.zonedDateTimeISO('America/New_York');

// タイムゾーン変換
const tokyoTime = Temporal.ZonedDateTime.from(
  '2024-01-15T14:30:00+09:00[Asia/Tokyo]'
);
const newYorkTime = tokyoTime.withTimeZone('America/New_York');

console.log(tokyoTime.toString());
// "2024-01-15T14:30:00+09:00[Asia/Tokyo]"
console.log(newYorkTime.toString());
// "2024-01-15T00:30:00-05:00[America/New_York]"

// タイムゾーン情報へのアクセス
console.log(zonedDateTime.timeZone.id); // "Asia/Tokyo"
console.log(zonedDateTime.offset); // "+09:00"
```

## Duration - 期間の表現

時間の長さを表現します。

```javascript
// 作成
const duration = Temporal.Duration.from({
  days: 5,
  hours: 3,
  minutes: 30,
});

// 文字列から
const durationFromString = Temporal.Duration.from('P5DT3H30M');

// プロパティへのアクセス
console.log(duration.days); // 5
console.log(duration.hours); // 3
console.log(duration.minutes); // 30

// 期間の計算
const date1 = Temporal.PlainDate.from('2024-01-15');
const date2 = Temporal.PlainDate.from('2024-01-20');
const diff = date1.until(date2);
console.log(diff.days); // 5

// 期間の加算
const sum = duration.add({ hours: 2, minutes: 15 });
console.log(sum.hours); // 5
console.log(sum.minutes); // 45

// 負の期間
const negativeDuration = Temporal.Duration.from({ days: -5 });
```

## 日付操作

### 日付の加算と減算

```javascript
const date = Temporal.PlainDate.from('2024-01-15');

// 加算
const tomorrow = date.add({ days: 1 });
const nextWeek = date.add({ weeks: 1 });
const nextMonth = date.add({ months: 1 });
const nextYear = date.add({ years: 1 });

console.log(tomorrow.toString()); // "2024-01-16"
console.log(nextWeek.toString()); // "2024-01-22"
console.log(nextMonth.toString()); // "2024-02-15"
console.log(nextYear.toString()); // "2025-01-15"

// 減算
const yesterday = date.subtract({ days: 1 });
const lastWeek = date.subtract({ weeks: 1 });
const lastMonth = date.subtract({ months: 1 });

console.log(yesterday.toString()); // "2024-01-14"
console.log(lastWeek.toString()); // "2024-01-08"
console.log(lastMonth.toString()); // "2023-12-15"

// 複数単位の組み合わせ
const future = date.add({ months: 2, days: 10 });
console.log(future.toString()); // "2024-03-25"
```

### 日付の比較

```javascript
const date1 = Temporal.PlainDate.from('2024-01-15');
const date2 = Temporal.PlainDate.from('2024-01-20');

// 比較メソッド
console.log(Temporal.PlainDate.compare(date1, date2)); // -1 (date1 < date2)
console.log(Temporal.PlainDate.compare(date2, date1)); // 1 (date2 > date1)
console.log(Temporal.PlainDate.compare(date1, date1)); // 0 (equal)

// 等価性チェック
console.log(date1.equals(date2)); // false
console.log(date1.equals(date1)); // true

// 期間の計算
const duration = date1.until(date2);
console.log(duration.days); // 5

const durationInWeeks = date1.until(date2, { largestUnit: 'weeks' });
console.log(durationInWeeks.weeks); // 0
console.log(durationInWeeks.days); // 5
```

### 特定の日付への変更

```javascript
const date = Temporal.PlainDate.from('2024-01-15');

// 特定のフィールドを変更
const newDate = date.with({
  day: 20,
});
console.log(newDate.toString()); // "2024-01-20"

const newMonth = date.with({
  month: 6,
  day: 30,
});
console.log(newMonth.toString()); // "2024-06-30"

// 月の最初/最後の日
const firstDayOfMonth = date.with({ day: 1 });
const lastDayOfMonth = date.with({ day: date.daysInMonth });

console.log(firstDayOfMonth.toString()); // "2024-01-01"
console.log(lastDayOfMonth.toString()); // "2024-01-31"
```

## タイムゾーン操作

### タイムゾーン間の変換

```javascript
// 同じ瞬間を異なるタイムゾーンで表現
const instant = Temporal.Instant.from('2024-01-15T14:30:00Z');

const inTokyo = instant.toZonedDateTimeISO('Asia/Tokyo');
const inNewYork = instant.toZonedDateTimeISO('America/New_York');
const inLondon = instant.toZonedDateTimeISO('Europe/London');

console.log(inTokyo.toString());
// "2024-01-15T23:30:00+09:00[Asia/Tokyo]"
console.log(inNewYork.toString());
// "2024-01-15T09:30:00-05:00[America/New_York]"
console.log(inLondon.toString());
// "2024-01-15T14:30:00+00:00[Europe/London]"
```

### サマータイムの処理

```javascript
// サマータイム開始前
const beforeDST = Temporal.ZonedDateTime.from(
  '2024-03-10T01:00:00-05:00[America/New_York]'
);

// 2時間後（サマータイム開始をまたぐ）
const afterDST = beforeDST.add({ hours: 2 });

console.log(beforeDST.toString());
// "2024-03-10T01:00:00-05:00[America/New_York]"
console.log(afterDST.toString());
// "2024-03-10T04:00:00-04:00[America/New_York]"
// オフセットが-05:00から-04:00に変化
```

### タイムゾーン情報の取得

```javascript
const zoned = Temporal.Now.zonedDateTimeISO('Asia/Tokyo');

// タイムゾーンID
console.log(zoned.timeZone.id); // "Asia/Tokyo"

// UTCオフセット
console.log(zoned.offset); // "+09:00"
console.log(zoned.offsetNanoseconds); // 32400000000000

// Instant（絶対時刻）への変換
const instant = zoned.toInstant();
console.log(instant.toString()); // "2024-01-15T05:30:00Z"
```

## 実践例

### 営業日計算

```javascript
function isWeekday(date) {
  const dayOfWeek = date.dayOfWeek;
  return dayOfWeek >= 1 && dayOfWeek <= 5; // 月-金
}

function addBusinessDays(date, days) {
  let current = date;
  let remaining = days;

  while (remaining > 0) {
    current = current.add({ days: 1 });
    if (isWeekday(current)) {
      remaining--;
    }
  }

  return current;
}

const today = Temporal.PlainDate.from('2024-01-15'); // 月曜日
const fiveBusinessDaysLater = addBusinessDays(today, 5);
console.log(fiveBusinessDaysLater.toString()); // "2024-01-22"
```

### 年齢計算

```javascript
function calculateAge(birthDate, referenceDate = Temporal.Now.plainDateISO()) {
  const duration = birthDate.until(referenceDate, { largestUnit: 'years' });
  return duration.years;
}

const birthDate = Temporal.PlainDate.from('1990-05-15');
const age = calculateAge(birthDate);
console.log(`Age: ${age} years`);
```

### 会議スケジューラー

```javascript
function scheduleRecurringMeeting(startDate, occurrences, interval) {
  const meetings = [];
  let current = startDate;

  for (let i = 0; i < occurrences; i++) {
    meetings.push(current);
    current = current.add({ weeks: interval });
  }

  return meetings;
}

const firstMeeting = Temporal.PlainDateTime.from('2024-01-15T14:00:00');
const meetings = scheduleRecurringMeeting(firstMeeting, 5, 1);

meetings.forEach((meeting, index) => {
  console.log(`Meeting ${index + 1}: ${meeting.toString()}`);
});
```

### タイムゾーン変換ユーティリティ

```javascript
function convertMeetingTime(meetingTime, fromTZ, toTZ) {
  // ローカル時刻をタイムゾーン付きに変換
  const zonedTime = meetingTime.toZonedDateTime(fromTZ);

  // 別のタイムゾーンに変換
  const convertedTime = zonedTime.withTimeZone(toTZ);

  return {
    original: zonedTime.toPlainDateTime(),
    converted: convertedTime.toPlainDateTime(),
    originalTZ: fromTZ,
    convertedTZ: toTZ,
  };
}

const meeting = Temporal.PlainDateTime.from('2024-01-15T14:00:00');
const result = convertMeetingTime(meeting, 'Asia/Tokyo', 'America/New_York');

console.log(`Original: ${result.original} (${result.originalTZ})`);
console.log(`Converted: ${result.converted} (${result.convertedTZ})`);
```

## ポリフィルの使用

Temporal APIは比較的新しいため、ポリフィルが必要な場合があります。

```bash
npm install @js-temporal/polyfill
```

```javascript
import { Temporal } from '@js-temporal/polyfill';

const date = Temporal.PlainDate.from('2024-01-15');
console.log(date.toString());
```

## まとめ

Temporal APIは、JavaScriptにおける日時操作を劇的に改善します。

- **型システム**: 用途に応じた適切な型（PlainDate、PlainTime、ZonedDateTimeなど）
- **不変性**: すべての操作が新しいオブジェクトを返す
- **タイムゾーンサポート**: 完全なタイムゾーン対応
- **直感的なAPI**: 読みやすく理解しやすいメソッド名

従来のDateオブジェクトの問題を解決し、より安全で予測可能な日時操作を実現します。今後の標準として期待される重要なAPIです。
