---
title: "Angular 19新機能・完全ガイド2026年版【シグナル・SSR・Zoneless】"
description: "Angular 19の主要新機能を詳しく解説。Linked Signals・Resource API・Zoneless変更検知・Incremental HydrationをTypeScriptコード例で紹介。アップグレード手順・パフォーマンス比較も網羅した完全ガイドです。"
pubDate: "2026-03-10"
tags: ["エンジニア", "プログラミング", "フロントエンド", "TypeScript"]
heroImage: "../../assets/blog-placeholder-1.jpg"
---

## はじめに

Angular 19は2024年11月にリリースされた、Angularフレームワークのメジャーアップデートだ。

シグナルAPIの成熟、Zoneless変更検知の実験的サポート、ハイドレーション改善など、パフォーマンスとDeveloper Experienceの両面で大きな進化があった。

この記事では Angular 19 の主要新機能を実践的なコード例とともに解説する。

---

## Angular 19 の主要新機能一覧

| 機能 | 状態 | 概要 |
|------|------|------|
| Linked Signals | **安定** | 他のシグナルに依存するシグナル |
| Resource API | 実験的 | 非同期データ取得のシグナルベースAPI |
| Zoneless Change Detection | 実験的 | Zone.jsなしの変更検知 |
| Incremental Hydration | **安定** | 遅延読み込みと組み合わせたSSRハイドレーション |
| Hot Module Replacement | **安定** | 開発時のHMR完全対応 |
| Component Input Required | **安定** | required入力プロパティ |
| Event Replay | **安定** | SSR中のイベント記録・再生 |

---

## 1. Linked Signals（リンクシグナル）

Angular 19で正式に安定した `linkedSignal()` は、**他のシグナルに依存して自動更新されるシグナル**を作成する機能だ。

### 基本的な使い方

```typescript
import { Component, signal, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-shopping-cart',
  template: `
    <div>
      <label>数量: </label>
      <input type="number"
             [value]="quantity()"
             (input)="quantity.set(+$event.target.value)" />
      <p>単価: {{ unitPrice() }}円</p>
      <p>合計: {{ total() }}円</p>
    </div>
  `,
})
export class ShoppingCartComponent {
  unitPrice = signal(1000);
  quantity = signal(1);

  // unitPriceが変わるたびにtotalが自動更新
  total = linkedSignal(() => this.unitPrice() * this.quantity());
}
```

### linkedSignal vs computed の違い

```typescript
import { signal, computed, linkedSignal } from '@angular/core';

const counter = signal(0);

// computed: 読み取り専用
const doubled = computed(() => counter() * 2);
// doubled.set(10); // エラー！computedは書き込み不可

// linkedSignal: 読み書き両方可能
const doubledWritable = linkedSignal(() => counter() * 2);
doubledWritable.set(100); // OK！手動書き込みが可能
counter.set(5); // 再計算により doubledWritable() は 10 に戻る
```

### 実践例: 通貨変換フォーム

```typescript
import { Component, signal, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-currency-converter',
  template: `
    <div>
      <input [value]="yenAmount()"
             (input)="yenAmount.set(+$event.target.value)"
             placeholder="円を入力" />
      <span>= </span>
      <input [value]="dollarAmount()"
             (input)="dollarAmount.set(+$event.target.value)"
             placeholder="ドル" />
      <p>為替レート: {{ exchangeRate() }}円/ドル</p>
    </div>
  `,
})
export class CurrencyConverterComponent {
  exchangeRate = signal(150); // 150円/ドル

  yenAmount = signal(15000);

  // 円が変わればドルに自動変換、ドルを直接入力したら上書きできる
  dollarAmount = linkedSignal({
    source: this.yenAmount,
    computation: (yen, prev) => {
      return yen / this.exchangeRate();
    },
  });
}
```

---

## 2. Resource API（リソースAPI）

Angular 19で実験的に導入された `resource()` は、**非同期データ取得をシグナルベースで扱う**新しいAPI。

### 基本的な使い方

```typescript
import { Component, signal, resource } from '@angular/core';

interface User {
  id: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-user-profile',
  template: `
    @if (userResource.isLoading()) {
      <p>読み込み中...</p>
    } @else if (userResource.error()) {
      <p>エラー: {{ userResource.error() }}</p>
    } @else {
      <div>
        <h2>{{ userResource.value()?.name }}</h2>
        <p>{{ userResource.value()?.email }}</p>
      </div>
    }
  `,
})
export class UserProfileComponent {
  userId = signal(1);

  userResource = resource({
    request: this.userId,
    loader: async ({ request: id }) => {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) throw new Error('ユーザー取得失敗');
      return response.json() as Promise<User>;
    },
  });
}
```

### httpResource（HTTP統合版）

```typescript
import { Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

@Component({
  selector: 'app-product-list',
  template: `
    <ul>
      @for (product of products.value(); track product.id) {
        <li>{{ product.name }} - {{ product.price }}円</li>
      }
    </ul>
  `,
})
export class ProductListComponent {
  categoryId = signal(1);

  // HttpClientを使う版 (より推奨)
  products = httpResource<Product[]>({
    url: () => `/api/products?category=${this.categoryId()}`,
  });
}
```

### Resource API の状態管理

```typescript
// Resourceが持つ状態
resource.status()   // 'idle' | 'loading' | 'resolved' | 'error' | 'local'
resource.value()    // 取得したデータ（undefinedの可能性あり）
resource.error()    // エラーオブジェクト
resource.isLoading() // ローディング中かどうか

// 手動リフレッシュ
resource.reload();

// ローカル書き込み（楽観的更新）
resource.update(current => ({ ...current, name: '新しい名前' }));
```

---

## 3. Zoneless 変更検知（実験的）

Zone.jsなしでAngularを動かす **Zoneless Change Detection** が実験的に使用可能になった。

### 従来のZone.jsベース変更検知の問題

```typescript
// Zone.jsは全ての非同期処理（setTimeout, Promise, HTTP等）を
// monkey-patchして変更検知を自動化していた

// 問題点:
// - バンドルサイズが増える（Zone.js は約13KB gzip後）
// - 無関係なコンポーネントまで変更検知が走る
// - Web Workerで使いにくい
```

### Zoneless を有効化する方法

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(), // Zonelessを有効化
    // Zone.jsを使わないのでzone.js importも不要
  ],
};
```

```
// angular.json からも zone.js を除外
"polyfills": [
  // "zone.js" を削除
]
```

### Zoneless でシグナルを使う

```typescript
import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <button (click)="decrement()">-</button>
    <span>{{ count() }}</span>
    <button (click)="increment()">+</button>
  `,
  // Zoneless では OnPush が基本
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent {
  count = signal(0);

  increment() { this.count.update(n => n + 1); }
  decrement() { this.count.update(n => n - 1); }
}
```

---

## 4. Incremental Hydration（インクリメンタルハイドレーション）

Angular 19でSSR時の**Incremental Hydration**が安定リリースされた。

`@defer` ブロックと組み合わせることで、**ページの一部だけを後からハイドレーション**できる。

### 設定方法

```typescript
// app.config.ts
import { ApplicationConfig, provideClientHydration } from '@angular/platform-browser';
import { withIncrementalHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(
      withIncrementalHydration() // インクリメンタルハイドレーション有効化
    ),
  ],
};
```

### テンプレートでの使い方

```html
<!-- コメント欄はスクロールされてから初めてハイドレーション -->
@defer (hydrate on viewport) {
  <app-comments-section />
}

<!-- ユーザーがホバーしたときにハイドレーション -->
@defer (hydrate on hover) {
  <app-product-quick-view />
}

<!-- idleタイム（ブラウザが暇なとき）にハイドレーション -->
@defer (hydrate on idle) {
  <app-recommendation-panel />
}

<!-- 条件が真になったときにハイドレーション -->
@defer (hydrate when isUserLoggedIn()) {
  <app-user-dashboard />
}
```

### パフォーマンス効果

```
Incremental Hydrationの効果（測定値の目安）:
- 初回ロード時のJavaScript実行量: 最大40%削減
- Time to Interactive: 最大30%改善
- LCP: 5〜15%改善（コンテンツ表示はSSRで即座に）
```

---

## 5. Hot Module Replacement（HMR）の完全対応

Angular 19では開発サーバーでの **HMR（Hot Module Replacement）** が完全に対応した。

### Angular 19以前

```bash
# 以前はスタイルのみHMR対応、コンポーネントはフルリロード
ng serve
# コンポーネントのHTMLを変更 → ページ全体リロード（数秒かかる）
```

### Angular 19以降

```bash
ng serve
# コンポーネントのHTMLを変更 → 即時HMR更新（ページ状態を保持したまま）
# テンプレート変更: ~100ms
# スタイル変更: ~50ms
```

### 有効化設定（angular.json）

```json
{
  "serve": {
    "options": {
      "hmr": true  // Angular 19ではデフォルトでtrueになった
    }
  }
}
```

---

## 6. Component Input: required プロパティ

Angular 15から導入された `required` Inputが Angular 19でさらに型安全になった。

```typescript
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-user-card',
  template: `
    <div>
      <h3>{{ name() }}</h3>
      <p>{{ role() }}</p>
      <p>{{ bio() }}</p>
    </div>
  `,
})
export class UserCardComponent {
  // 必須入力（省略するとコンパイルエラー）
  name = input.required<string>();

  // オプション入力（デフォルト値あり）
  role = input<string>('一般ユーザー');

  // オプション入力（undefinedを許容）
  bio = input<string | undefined>();
}
```

```html
<!-- 使用例 -->
<app-user-card
  [name]="'田中太郎'"      <!-- 必須 -->
  [role]="'管理者'"        <!-- 任意 -->
/>                          <!-- bioは省略OK -->

<!-- nameを省略するとTypeScriptコンパイルエラー -->
<app-user-card />  <!-- エラー: Required input 'name' is not set -->
```

---

## 7. Event Replay（イベントリプレイ）

SSRでHTMLがレンダリングされてから、JavaScriptがハイドレーションされるまでの間に発生したユーザーイベントを記録し、ハイドレーション後に再生する機能。

### 設定

```typescript
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
  ],
};
```

### 動作の仕組み

```
1. サーバーでHTMLレンダリング（コンテンツが即表示）
2. クライアントでJavaScriptダウンロード・解析中...
3. ユーザーがボタンをクリック（通常はイベント無視される）
   → Event Replayが「このクリックがあった」を記録
4. ハイドレーション完了
5. 記録されたクリックイベントを再生 → ボタンのアクションが実行
```

---

## Angular 19 へのアップグレード手順

```bash
# Angular CLIのアップデート
ng update @angular/core@19 @angular/cli@19

# 依存パッケージも更新
ng update

# 変更内容の確認
ng update @angular/core@19 --dry-run
```

### 主な破壊的変更

```typescript
// 1. TestBed.inject() の型変更
// Angular 18以前
const service = TestBed.inject(MyService); // MyService | undefined
// Angular 19
const service = TestBed.inject(MyService); // MyService（undefinedなし）

// 2. standalone コンポーネントのデフォルト化
// Angular 19ではstandalone: trueがデフォルト
// @Component() = @Component({ standalone: true })
@Component({
  selector: 'app-my',
  template: '...',
  // standalone: true は省略可能になった
})
export class MyComponent {}
```

---

## Angular 19 パフォーマンス比較

| 指標 | Angular 17 | Angular 18 | Angular 19 |
|------|-----------|-----------|-----------|
| 初期バンドルサイズ（+Zoneless） | ベースライン | -5% | -12% |
| 変更検知サイクル（Signal使用） | ベースライン | -20% | -35% |
| SSR Time to First Byte | ベースライン | -10% | -18% |
| HMR更新速度 | 3〜5秒 | 1〜2秒 | 100ms以下 |

---

## まとめ

Angular 19は**シグナルAPIの成熟とパフォーマンス改善**が主役のリリースだ。

### 今すぐ採用すべき機能
- `input.required()` と `linkedSignal()` はすでに安定APIなので積極活用
- HMRは自動で有効化されるので設定不要
- Incremental Hydrationは SSR プロジェクトで大きな効果

### 段階的に移行すべき機能
- Zoneless Change Detection: 実験的だが既存プロジェクトへの段階移行が可能
- Resource API: 現時点は実験的。SWR/TanStack Queryからの移行は様子見

### 参考リソース

- [Angular 19 公式ブログ](https://blog.angular.dev/)
- [Angular公式ドキュメント](https://angular.dev/)
- [Angular Signals RFC](https://github.com/angular/angular/discussions/49685)
