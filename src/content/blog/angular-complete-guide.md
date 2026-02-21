---
title: 'Angular完全ガイド2026：モダンWebアプリケーション開発の決定版'
description: 'Angularの基本から応用まで完全解説。コンポーネント・サービス・RxJS・Angular Signals・Standalone Components・NgRx・テストまで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['Angular', 'TypeScript', 'Frontend']
---

Angularは、Googleが開発・メンテナンスするエンタープライズグレードのフロントエンドフレームワークである。ReactやVueとは異なり、ルーティング・フォーム・HTTPクライアント・状態管理まで揃った「フルフレームワーク」として設計されており、大規模チームでの開発に強みを持つ。

本ガイドでは、Angular CLIによるプロジェクト作成からコンポーネント・サービス・RxJS・Angular Signals・NgRx・テスト・デプロイまで、実践的なコード例とともに体系的に解説する。

---

## 目次

1. Angularとは・なぜ使うか
2. 環境構築とプロジェクトセットアップ
3. コンポーネントの基礎
4. テンプレート構文とデータバインディング
5. 組み込みディレクティブ（@if・@for・@switch・ngClass・ngStyle）
6. サービスと依存性注入（DI）
7. ルーティング
8. リアクティブフォーム
9. HTTPクライアント
10. RxJS
11. Angular Signals（新しい状態管理）
12. NgRxによる状態管理
13. テスト（Jasmine・TestBed）
14. パフォーマンス最適化
15. デプロイ
16. まとめ

---

## 1. Angularとは・なぜ使うか

### フルフレームワークとしての設計思想

Angularは2016年にAngular 2としてリリースされ、旧AngularJS（1.x）を完全に書き直した次世代フレームワークである。現在はバージョン17・18と進化し、2026年現在は Angular 19 が最新安定版となっている。

Reactと比較したときのAngularの最大の特徴は「フルフレームワーク」であることだ。Reactはビューライブラリに特化しており、ルーティングには React Router、状態管理には Redux や Zustand などのサードパーティライブラリを組み合わせる必要がある。対してAngularは以下をすべて標準で提供する。

- コンポーネントシステム
- テンプレートエンジン
- 双方向データバインディング
- ルーティング（Angular Router）
- フォーム管理（リアクティブフォーム・テンプレート駆動フォーム）
- HTTPクライアント（HttpClient）
- 依存性注入（DI）コンテナ
- アニメーション（Angular Animations）
- 国際化（i18n）
- テストユーティリティ（TestBed）

この「全部入り」の設計により、チーム全員が同じ規約・同じパターンでコードを書くことができる。大規模プロジェクトや複数チームが並走する開発現場では、標準化の恩恵が非常に大きい。

### TypeScriptネイティブ

AngularはTypeScriptを第一言語として採用している。すべてのAngularコードはTypeScriptで書かれており、型安全性が言語レベルで保証される。デコレーター（`@Component`・`@Injectable`・`@NgModule`など）を活用したメタプログラミングにより、依存性注入やコンポーネント登録が宣言的に行える。

### Google製・長期サポート

AngularはGoogleが自社プロダクト（Google Ads・Google Cloudコンソールなど）に実際に使用しており、長期的なメンテナンスが約束されている。6ヶ月ごとのメジャーバージョンリリースサイクルと、LTS（Long Term Support）ポリシーにより、エンタープライズ環境での採用に適している。

### Angularが向いているユースケース

- 大規模なSPA（Single Page Application）
- 複数チームが分担して開発するモノレポ構成
- エンタープライズ社内システム
- 厳格な型安全性が求められるプロジェクト
- Angular Universalを使ったSSR（サーバーサイドレンダリング）

---

## 2. 環境構築とプロジェクトセットアップ

### 前提条件

Angular開発には以下が必要だ。

- Node.js 18.x 以上（LTS推奨）
- npm 9.x 以上（または yarn・pnpm）

バージョン確認は以下のコマンドで行う。

```bash
node --version
npm --version
```

### Angular CLIのインストール

Angular CLIはAngularプロジェクトの作成・ビルド・テスト・デプロイを担うコマンドラインツールだ。グローバルにインストールする。

```bash
npm install -g @angular/cli
```

インストール後、バージョンを確認する。

```bash
ng version
```

出力例：

```
Angular CLI: 19.1.0
Node: 20.11.0
Package Manager: npm 10.2.4
OS: darwin arm64
```

### 新規プロジェクトの作成

```bash
ng new my-angular-app
```

対話形式でいくつかの設問が表示される。

```
? Which stylesheet format would you like to use? SCSS
? Do you want to enable Server-Side Rendering (SSR) and Static Site Generation (SSG/Prerendering)? No
```

プロジェクトが作成されたら、ディレクトリに移動して開発サーバーを起動する。

```bash
cd my-angular-app
ng serve
```

ブラウザで `http://localhost:4200` を開くと、Angularのウェルカムページが表示される。

### ディレクトリ構造

```
my-angular-app/
├── src/
│   ├── app/
│   │   ├── app.component.ts      # ルートコンポーネント
│   │   ├── app.component.html    # ルートコンポーネントのテンプレート
│   │   ├── app.component.scss    # ルートコンポーネントのスタイル
│   │   ├── app.component.spec.ts # ルートコンポーネントのテスト
│   │   └── app.config.ts         # アプリケーション設定
│   ├── assets/                   # 静的ファイル
│   ├── index.html                # エントリーHTML
│   ├── main.ts                   # ブートストラップエントリーポイント
│   └── styles.scss               # グローバルスタイル
├── angular.json                  # Angular CLIの設定
├── package.json
├── tsconfig.json
└── tsconfig.app.json
```

### `main.ts` の構造

Angular 17以降のデフォルトは Standalone API を使ったブートストラップ方式だ。

```typescript
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
```

```typescript
// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
  ],
};
```

---

## 3. コンポーネントの基礎

### コンポーネントとは

Angularアプリケーションはコンポーネントのツリーで構成される。各コンポーネントは以下の3要素を持つ。

- TypeScriptクラス（ロジック）
- HTMLテンプレート（表示）
- CSSスタイル（スタイリング）

### Standalone Componentsの作成

Angular 14から導入され、Angular 17以降でデフォルトとなったStandalone Componentsは、NgModuleなしで独立して動作するコンポーネントだ。

Angular CLIで生成する場合：

```bash
ng generate component features/product-list
# または省略形
ng g c features/product-list
```

生成されるコードの例：

```typescript
// src/app/features/product-list/product-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})
export class ProductListComponent implements OnInit {
  title = '商品一覧';
  products: string[] = [];

  ngOnInit(): void {
    this.products = ['MacBook Pro', 'iPad Air', 'iPhone 15'];
  }
}
```

```html
<!-- src/app/features/product-list/product-list.component.html -->
<div class="product-list">
  <h1>{{ title }}</h1>
  <ul>
    @for (product of products; track product) {
      <li>{{ product }}</li>
    }
  </ul>
</div>
```

### @Componentデコレーターのオプション

```typescript
@Component({
  selector: 'app-my-component',   // CSSセレクター（タグ名・クラス・属性）
  standalone: true,                // Standalone Component
  imports: [CommonModule, ...],    // 依存するモジュール・コンポーネント
  template: `<h1>インラインテンプレート</h1>`, // インラインテンプレート
  templateUrl: './my.component.html', // 外部テンプレートファイル
  styleUrl: './my.component.scss',    // 外部スタイルファイル
  styles: [`h1 { color: red; }`],     // インラインスタイル
  changeDetection: ChangeDetectionStrategy.OnPush, // 変更検知戦略
  encapsulation: ViewEncapsulation.Emulated,        // スタイルカプセル化
})
```

### コンポーネントのライフサイクルフック

Angularコンポーネントには明確なライフサイクルがある。各フェーズでフックを使って処理を挟み込める。

```typescript
import {
  Component,
  OnInit,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  AfterContentInit,
  DoCheck,
  Input,
  SimpleChanges,
} from '@angular/core';

@Component({
  selector: 'app-lifecycle-demo',
  standalone: true,
  template: `<p>ライフサイクルデモ: {{ value }}</p>`,
})
export class LifecycleDemoComponent
  implements OnInit, OnChanges, OnDestroy, AfterViewInit, AfterContentInit, DoCheck
{
  @Input() value: string = '';

  // コンストラクター：DIによる依存注入のタイミング
  constructor() {
    console.log('constructor: コンポーネントインスタンス生成');
  }

  // @Inputプロパティが変化したとき
  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges:', changes);
    if (changes['value']) {
      const { currentValue, previousValue, firstChange } = changes['value'];
      console.log(`value changed: ${previousValue} -> ${currentValue}`);
    }
  }

  // コンポーネント初期化後（最初の1回のみ）
  ngOnInit(): void {
    console.log('ngOnInit: 初期化処理');
    // APIコール・データ取得はここで行う
  }

  // 変更検知が実行されるたびに呼ばれる
  ngDoCheck(): void {
    console.log('ngDoCheck: 変更検知');
  }

  // コンテンツ（ng-content）の初期化後
  ngAfterContentInit(): void {
    console.log('ngAfterContentInit');
  }

  // テンプレートのDOMが初期化された後
  ngAfterViewInit(): void {
    console.log('ngAfterViewInit: DOM操作はここで');
  }

  // コンポーネント破棄時
  ngOnDestroy(): void {
    console.log('ngOnDestroy: サブスクリプション解除などクリーンアップ');
  }
}
```

### 親子コンポーネント間の通信

#### 親から子へ：@Input

```typescript
// 子コンポーネント
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-user-card',
  standalone: true,
  template: `
    <div class="card">
      <h2>{{ user.name }}</h2>
      <p>{{ user.email }}</p>
    </div>
  `,
})
export class UserCardComponent {
  @Input({ required: true }) user!: { name: string; email: string };
  @Input() showEmail: boolean = true;
}
```

```typescript
// 親コンポーネント
import { Component } from '@angular/core';
import { UserCardComponent } from './user-card/user-card.component';

@Component({
  selector: 'app-parent',
  standalone: true,
  imports: [UserCardComponent],
  template: `
    <app-user-card
      [user]="currentUser"
      [showEmail]="true"
    />
  `,
})
export class ParentComponent {
  currentUser = { name: '山田太郎', email: 'yamada@example.com' };
}
```

#### 子から親へ：@Output と EventEmitter

```typescript
// 子コンポーネント
import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    <button (click)="increment()">カウントアップ</button>
    <span>{{ count }}</span>
  `,
})
export class CounterComponent {
  @Output() countChanged = new EventEmitter<number>();
  count = 0;

  increment(): void {
    this.count++;
    this.countChanged.emit(this.count);
  }
}
```

```typescript
// 親コンポーネント
import { Component } from '@angular/core';
import { CounterComponent } from './counter/counter.component';

@Component({
  selector: 'app-parent',
  standalone: true,
  imports: [CounterComponent],
  template: `
    <app-counter (countChanged)="onCountChanged($event)" />
    <p>現在のカウント: {{ currentCount }}</p>
  `,
})
export class ParentComponent {
  currentCount = 0;

  onCountChanged(count: number): void {
    this.currentCount = count;
  }
}
```

### ViewChildとContentChild

```typescript
import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';

@Component({
  selector: 'app-view-child-demo',
  standalone: true,
  template: `
    <input #nameInput type="text" placeholder="名前を入力" />
    <button (click)="focusInput()">フォーカス</button>
  `,
})
export class ViewChildDemoComponent implements AfterViewInit {
  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

  ngAfterViewInit(): void {
    // DOMが初期化された後にアクセス可能
    console.log(this.nameInput.nativeElement.value);
  }

  focusInput(): void {
    this.nameInput.nativeElement.focus();
  }
}
```

---

## 4. テンプレート構文とデータバインディング

### 補間（Interpolation）

二重中括弧 `{{ }}` を使って、TypeScriptの値をHTMLに展開する。

```html
<h1>{{ title }}</h1>
<p>価格: {{ price | currency:'JPY' }}</p>
<p>計算結果: {{ 1 + 2 }}</p>
<p>メソッドの結果: {{ getFullName() }}</p>
```

### プロパティバインディング

角括弧 `[ ]` を使って、TypeScriptの値をHTML要素のプロパティに設定する。

```html
<!-- 属性バインディング -->
<img [src]="imageUrl" [alt]="imageAlt" />
<button [disabled]="isLoading">送信</button>
<input [value]="inputValue" />

<!-- クラスバインディング -->
<div [class.active]="isActive">...</div>
<div [class]="cssClasses">...</div>

<!-- スタイルバインディング -->
<div [style.color]="textColor">...</div>
<div [style.font-size.px]="fontSize">...</div>
```

### イベントバインディング

丸括弧 `( )` を使って、DOMイベントをTypeScriptのメソッドに繋げる。

```html
<button (click)="handleClick()">クリック</button>
<input (input)="handleInput($event)" />
<form (submit)="handleSubmit($event)">...</form>
<div (keydown.enter)="handleEnter()">...</div>
<div (mouseover)="onMouseOver($event)">...</div>
```

```typescript
@Component({
  selector: 'app-event-demo',
  standalone: true,
  template: `
    <input
      (input)="onInput($event)"
      (keydown.escape)="onEscape()"
    />
    <p>入力値: {{ inputValue }}</p>
  `,
})
export class EventDemoComponent {
  inputValue = '';

  onInput(event: Event): void {
    this.inputValue = (event.target as HTMLInputElement).value;
  }

  onEscape(): void {
    this.inputValue = '';
  }
}
```

### 双方向バインディング

`[(ngModel)]` を使って、フォームの値とTypeScriptプロパティを双方向に同期する。

```typescript
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-two-way-demo',
  standalone: true,
  imports: [FormsModule],
  template: `
    <input [(ngModel)]="username" />
    <p>こんにちは、{{ username }}さん</p>
  `,
})
export class TwoWayDemoComponent {
  username = '';
}
```

### パイプ（Pipe）

テンプレート内でデータを変換するための仕組みだ。標準パイプが多数用意されている。

```html
<!-- 日付フォーマット -->
<p>{{ today | date:'yyyy年MM月dd日' }}</p>
<p>{{ today | date:'short' }}</p>

<!-- 通貨フォーマット -->
<p>{{ price | currency:'JPY':'symbol':'1.0-0' }}</p>

<!-- 数値フォーマット -->
<p>{{ ratio | percent:'1.1-2' }}</p>
<p>{{ bigNumber | number:'1.0-0' }}</p>

<!-- 文字列変換 -->
<p>{{ name | uppercase }}</p>
<p>{{ name | lowercase }}</p>
<p>{{ text | slice:0:100 }}...</p>

<!-- JSON変換（デバッグ用） -->
<pre>{{ data | json }}</pre>

<!-- Async Pipe（Observableの自動購読） -->
<div *ngIf="data$ | async as data">
  {{ data.name }}
</div>
```

#### カスタムパイプの作成

```typescript
// src/app/pipes/truncate.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true,
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, maxLength: number = 100, suffix: string = '...'): string {
    if (value.length <= maxLength) {
      return value;
    }
    return value.substring(0, maxLength) + suffix;
  }
}
```

```html
<!-- 使用例 -->
<p>{{ longText | truncate:50:'...' }}</p>
```

---

## 5. 組み込みディレクティブ

### 新しいテンプレートブロック構文（Angular 17以降）

Angular 17から、従来の構造ディレクティブ（`*ngIf`・`*ngFor`・`*ngSwitch`）に代わる新しいブロック構文が導入された。

### @if ブロック

```html
<!-- 基本的な条件分岐 -->
@if (isLoggedIn) {
  <p>ようこそ、{{ user.name }}さん</p>
} @else if (isLoading) {
  <p>読み込み中...</p>
} @else {
  <a href="/login">ログインしてください</a>
}
```

```typescript
@Component({
  selector: 'app-auth-status',
  standalone: true,
  template: `
    @if (authState === 'loading') {
      <div class="spinner">認証確認中...</div>
    } @else if (authState === 'authenticated') {
      <div class="user-info">
        <img [src]="user.avatar" [alt]="user.name" />
        <span>{{ user.name }}</span>
      </div>
    } @else {
      <button (click)="login()">ログイン</button>
    }
  `,
})
export class AuthStatusComponent {
  authState: 'loading' | 'authenticated' | 'unauthenticated' = 'unauthenticated';
  user = { name: '', avatar: '' };

  login(): void {
    // ログイン処理
  }
}
```

### @for ブロック

```html
<!-- 基本的なリスト表示 -->
@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <li>アイテムがありません</li>
}
```

`track` 式は必須で、各アイテムを識別するためのキーを指定する。パフォーマンスの最適化に重要だ。

```typescript
@Component({
  selector: 'app-product-list',
  standalone: true,
  template: `
    <ul class="product-list">
      @for (product of products; track product.id; let i = $index; let isFirst = $first; let isLast = $last; let isEven = $even) {
        <li
          [class.first-item]="isFirst"
          [class.last-item]="isLast"
          [class.even-row]="isEven"
        >
          <span class="index">{{ i + 1 }}</span>
          <span class="name">{{ product.name }}</span>
          <span class="price">{{ product.price | currency:'JPY' }}</span>
        </li>
      } @empty {
        <li class="empty-message">商品が見つかりませんでした</li>
      }
    </ul>
  `,
})
export class ProductListComponent {
  products: Array<{ id: number; name: string; price: number }> = [
    { id: 1, name: 'MacBook Pro', price: 298000 },
    { id: 2, name: 'iPad Air', price: 98800 },
    { id: 3, name: 'AirPods Pro', price: 39800 },
  ];
}
```

### @switch ブロック

```html
@switch (status) {
  @case ('pending') {
    <span class="badge pending">処理待ち</span>
  }
  @case ('processing') {
    <span class="badge processing">処理中</span>
  }
  @case ('completed') {
    <span class="badge completed">完了</span>
  }
  @case ('failed') {
    <span class="badge failed">失敗</span>
  }
  @default {
    <span class="badge unknown">不明</span>
  }
}
```

### ngClass ディレクティブ

```html
<!-- オブジェクト形式 -->
<div [ngClass]="{
  'active': isActive,
  'disabled': isDisabled,
  'loading': isLoading
}">
  コンテンツ
</div>

<!-- 配列形式 -->
<div [ngClass]="['btn', 'btn-primary', isLarge ? 'btn-lg' : 'btn-sm']">
  ボタン
</div>

<!-- 文字列形式 -->
<div [ngClass]="dynamicClass">コンテンツ</div>
```

### ngStyle ディレクティブ

```html
<div [ngStyle]="{
  'color': textColor,
  'font-size': fontSize + 'px',
  'background-color': bgColor,
  'display': isVisible ? 'block' : 'none'
}">
  スタイル適用済みコンテンツ
</div>
```

### 属性ディレクティブの作成

```typescript
// src/app/directives/highlight.directive.ts
import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnInit,
} from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  standalone: true,
})
export class HighlightDirective implements OnInit {
  @Input() appHighlight: string = 'yellow';
  @Input() defaultColor: string = 'transparent';

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.el.nativeElement.style.backgroundColor = this.defaultColor;
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.el.nativeElement.style.backgroundColor = this.appHighlight;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.el.nativeElement.style.backgroundColor = this.defaultColor;
  }
}
```

```html
<!-- 使用例 -->
<p [appHighlight]="'lightblue'" [defaultColor]="'white'">
  マウスを乗せるとハイライト
</p>
```

---

## 6. サービスと依存性注入（DI）

### サービスとは

サービスはコンポーネント間で共有するロジックをカプセル化したクラスだ。データの取得・加工・状態管理などをコンポーネントから切り離し、単一責任原則を実現する。

### サービスの作成

```bash
ng generate service services/user
```

```typescript
// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

@Injectable({
  providedIn: 'root', // アプリケーション全体でシングルトン
})
export class UserService {
  private readonly apiUrl = 'https://api.example.com/users';

  // 内部状態の管理
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  createUser(user: Omit<User, 'id'>): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  updateUser(id: number, updates: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, updates).pipe(
      tap((updatedUser) => {
        if (this.currentUserSubject.value?.id === id) {
          this.currentUserSubject.next(updatedUser);
        }
      })
    );
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }
}
```

### 依存性注入のスコープ

`providedIn` の値によってサービスのスコープが変わる。

```typescript
// アプリ全体でシングルトン（最も一般的）
@Injectable({ providedIn: 'root' })
export class AppWideService {}

// 特定のコンポーネントツリーでシングルトン
@Component({
  providers: [ScopedService], // このコンポーネントとその子のみ
})
export class ScopedComponent {}

// プラットフォームレベル（SSRなど複数アプリ共存時）
@Injectable({ providedIn: 'platform' })
export class PlatformService {}
```

### コンストラクターインジェクションと`inject()`関数

Angular 14以降、`inject()` 関数を使ってDIが行える。

```typescript
import { Component, inject } from '@angular/core';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `<p>ダッシュボード</p>`,
})
export class DashboardComponent {
  // inject() 関数を使う方法（Angular 14以降）
  private userService = inject(UserService);
  private authService = inject(AuthService);

  // または従来のコンストラクターインジェクション
  // constructor(
  //   private userService: UserService,
  //   private authService: AuthService,
  // ) {}
}
```

### DIトークンとInjectionToken

```typescript
// src/app/tokens/app.tokens.ts
import { InjectionToken } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
  maxRetries: number;
  debugMode: boolean;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
```

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { APP_CONFIG } from './tokens/app.tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_CONFIG,
      useValue: {
        apiUrl: 'https://api.example.com',
        maxRetries: 3,
        debugMode: false,
      },
    },
  ],
};
```

```typescript
// サービス内での使用
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../tokens/app.tokens';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private config = inject(APP_CONFIG);

  getApiUrl(): string {
    return this.config.apiUrl;
  }
}
```

---

## 7. ルーティング

### ルート設定

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'ホーム',
  },
  {
    path: 'products',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/products/product-list/product-list.component').then(
            (m) => m.ProductListComponent
          ),
        title: '商品一覧',
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/products/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent
          ),
        title: '商品詳細',
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadChildren: () =>
      import('./pages/admin/admin.routes').then((m) => m.adminRoutes),
    title: '管理画面',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
    title: 'ページが見つかりません',
  },
];
```

### RouterOutletとRouterLink

```typescript
// app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/home" routerLinkActive="active">ホーム</a>
      <a routerLink="/products" routerLinkActive="active">商品</a>
      <a
        routerLink="/admin"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{ exact: true }"
      >
        管理画面
      </a>
    </nav>
    <main>
      <router-outlet />
    </main>
  `,
})
export class AppComponent {}
```

### パラメーターの取得

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  template: `
    @if (product) {
      <div>
        <h1>{{ product.name }}</h1>
        <p>{{ product.description }}</p>
        <button (click)="goBack()">戻る</button>
      </div>
    }
  `,
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);

  product: any = null;

  ngOnInit(): void {
    // スナップショットで取得（ナビゲーションで再初期化される場合）
    const id = this.route.snapshot.paramMap.get('id');

    // または Observable で取得（同一コンポーネント内でパラメーターが変わる場合）
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const productId = Number(params.get('id'));
          return this.productService.getById(productId);
        })
      )
      .subscribe((product) => {
        this.product = product;
      });
  }

  goBack(): void {
    this.router.navigate(['/products']);
  }
}
```

### ルートガード（Route Guards）

```typescript
// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // 未認証の場合はログインページにリダイレクト
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
```

```typescript
// src/app/guards/admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user.service';

export const adminGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (userService.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/forbidden']);
};
```

### リゾルバー（Route Resolver）

```typescript
// src/app/resolvers/product.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { ProductService } from '../services/product.service';

export const productResolver: ResolveFn<Product> = (route) => {
  const productService = inject(ProductService);
  const id = Number(route.paramMap.get('id'));
  return productService.getById(id);
};
```

```typescript
// ルート定義にリゾルバーを追加
{
  path: 'products/:id',
  component: ProductDetailComponent,
  resolve: { product: productResolver },
}
```

---

## 8. リアクティブフォーム

### ReactiveFormsModuleの設定

```typescript
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-registration-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './registration-form.component.html',
})
export class RegistrationFormComponent {
  private fb = inject(FormBuilder);

  registrationForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    ]],
    confirmPassword: ['', Validators.required],
    phoneNumber: ['', Validators.pattern(/^0\d{9,10}$/)],
    agreeToTerms: [false, Validators.requiredTrue],
  }, {
    validators: this.passwordMatchValidator,
  });

  // カスタムバリデーター
  private passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  // ゲッター（テンプレートでエラー取得を簡潔にする）
  get firstName() { return this.registrationForm.get('firstName'); }
  get email() { return this.registrationForm.get('email'); }
  get password() { return this.registrationForm.get('password'); }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      const formData = this.registrationForm.value;
      console.log('フォームデータ:', formData);
      // API送信処理
    } else {
      this.registrationForm.markAllAsTouched();
    }
  }

  onReset(): void {
    this.registrationForm.reset();
  }
}
```

```html
<!-- registration-form.component.html -->
<form [formGroup]="registrationForm" (ngSubmit)="onSubmit()">
  <div class="form-group">
    <label for="firstName">名前（名）</label>
    <input
      id="firstName"
      type="text"
      formControlName="firstName"
      [class.invalid]="firstName?.invalid && firstName?.touched"
    />
    @if (firstName?.invalid && firstName?.touched) {
      <div class="error-messages">
        @if (firstName?.errors?.['required']) {
          <span>名前は必須です</span>
        }
        @if (firstName?.errors?.['minlength']) {
          <span>2文字以上で入力してください</span>
        }
      </div>
    }
  </div>

  <div class="form-group">
    <label for="email">メールアドレス</label>
    <input
      id="email"
      type="email"
      formControlName="email"
      [class.invalid]="email?.invalid && email?.touched"
    />
    @if (email?.invalid && email?.touched) {
      <div class="error-messages">
        @if (email?.errors?.['required']) {
          <span>メールアドレスは必須です</span>
        }
        @if (email?.errors?.['email']) {
          <span>有効なメールアドレスを入力してください</span>
        }
      </div>
    }
  </div>

  <div class="form-actions">
    <button type="submit" [disabled]="registrationForm.invalid">
      登録する
    </button>
    <button type="button" (click)="onReset()">リセット</button>
  </div>
</form>
```

### FormArrayの使用

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-skills-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div formArrayName="skills">
        @for (skill of skillsArray.controls; track $index; let i = $index) {
          <div [formGroupName]="i" class="skill-row">
            <input formControlName="name" placeholder="スキル名" />
            <input formControlName="level" type="number" min="1" max="5" />
            <button type="button" (click)="removeSkill(i)">削除</button>
          </div>
        }
      </div>
      <button type="button" (click)="addSkill()">スキルを追加</button>
      <button type="submit">保存</button>
    </form>
  `,
})
export class SkillsFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    skills: this.fb.array([this.createSkillGroup()]),
  });

  get skillsArray(): FormArray {
    return this.form.get('skills') as FormArray;
  }

  createSkillGroup() {
    return this.fb.group({
      name: ['', Validators.required],
      level: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    });
  }

  addSkill(): void {
    this.skillsArray.push(this.createSkillGroup());
  }

  removeSkill(index: number): void {
    this.skillsArray.removeAt(index);
  }

  onSubmit(): void {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
```

---

## 9. HTTPクライアント

### HttpClientの設定

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
  ],
};
```

### APIサービスの作成

```typescript
// src/app/services/api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.example.com/v1';

  get<T>(endpoint: string, params?: Record<string, string | number>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        httpParams = httpParams.set(key, String(value));
      });
    }

    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, { params: httpParams }).pipe(
      timeout(10000),
      retry(2),
      catchError(this.handleError)
    );
  }

  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body).pipe(
      catchError(this.handleError)
    );
  }

  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body).pipe(
      catchError(this.handleError)
    );
  }

  patch<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${endpoint}`, body).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = '予期せぬエラーが発生しました';

    if (error.status === 401) {
      errorMessage = '認証が必要です';
    } else if (error.status === 403) {
      errorMessage = 'アクセス権限がありません';
    } else if (error.status === 404) {
      errorMessage = 'リソースが見つかりません';
    } else if (error.status >= 500) {
      errorMessage = 'サーバーエラーが発生しました';
    }

    console.error('API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
```

### インターセプター（Interceptor）

```typescript
// src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(authReq);
  }

  return next(req);
};
```

```typescript
// src/app/interceptors/error.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        // トークン期限切れ：ログアウトしてログインページへ
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
```

```typescript
// src/app/interceptors/loading.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  loadingService.show();

  return next(req).pipe(
    finalize(() => {
      loadingService.hide();
    })
  );
};
```

---

## 10. RxJS

### RxJSとは

RxJS（Reactive Extensions for JavaScript）はAngularの中核をなすリアクティブプログラミングライブラリだ。非同期データストリームをObservableとして扱い、オペレーターで変換・合成できる。

### Observable・Subject・BehaviorSubject

```typescript
import {
  Observable,
  Subject,
  BehaviorSubject,
  ReplaySubject,
  AsyncSubject,
  of,
  from,
  interval,
  timer,
  fromEvent,
} from 'rxjs';

// Observable の作成
const static$ = of(1, 2, 3);                    // 固定値
const fromArray$ = from([10, 20, 30]);            // 配列から
const timer$ = timer(0, 1000);                    // タイマー
const interval$ = interval(500);                  // インターバル

// Subject：マルチキャスト可能な Observable
const subject = new Subject<string>();
subject.subscribe((val) => console.log('A:', val));
subject.subscribe((val) => console.log('B:', val));
subject.next('hello'); // A: hello, B: hello

// BehaviorSubject：最後の値を保持（初期値必須）
const behavior = new BehaviorSubject<number>(0);
behavior.subscribe((val) => console.log('現在値:', val)); // 0
behavior.next(1); // 1
console.log(behavior.value); // 1（同期的にアクセス可能）

// ReplaySubject：指定件数の過去の値を再生
const replay = new ReplaySubject<number>(3); // 直近3件を保持
replay.next(1);
replay.next(2);
replay.next(3);
replay.next(4);
replay.subscribe((val) => console.log(val)); // 2, 3, 4
```

### 主要オペレーター

```typescript
import {
  map,
  filter,
  switchMap,
  mergeMap,
  concatMap,
  exhaustMap,
  tap,
  catchError,
  retry,
  takeUntil,
  take,
  debounceTime,
  distinctUntilChanged,
  combineLatest,
  forkJoin,
  withLatestFrom,
  share,
  shareReplay,
  startWith,
  scan,
  reduce,
  finalize,
} from 'rxjs/operators';
import { combineLatest as combineLatest$, forkJoin as forkJoin$ } from 'rxjs';
```

#### 変換オペレーター

```typescript
// map：値を変換
of(1, 2, 3).pipe(
  map((x) => x * 2)
).subscribe(console.log); // 2, 4, 6

// filter：条件でフィルタリング
of(1, 2, 3, 4, 5).pipe(
  filter((x) => x % 2 === 0)
).subscribe(console.log); // 2, 4

// switchMap：新しいObservableに切り替え（前のを自動キャンセル）
// 検索ボックスで使うパターン
searchTerm$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((term) => this.searchService.search(term))
).subscribe((results) => {
  this.searchResults = results;
});

// mergeMap：並列実行（全て維持）
ids$.pipe(
  mergeMap((id) => this.http.get(`/api/item/${id}`))
).subscribe(console.log);

// concatMap：順番に実行（前が完了してから次）
saveActions$.pipe(
  concatMap((action) => this.http.post('/api/save', action))
).subscribe(console.log);

// exhaustMap：実行中は新しいを無視（ダブルクリック防止）
submitButton$.pipe(
  exhaustMap(() => this.http.post('/api/submit', data))
).subscribe(console.log);
```

#### 集計・状態オペレーター

```typescript
// scan：累積値を持つreduce（ストリームを維持）
const actions$ = new Subject<number>();
actions$.pipe(
  scan((acc, val) => acc + val, 0)
).subscribe((total) => console.log('合計:', total));

actions$.next(10); // 合計: 10
actions$.next(5);  // 合計: 15
actions$.next(20); // 合計: 35

// startWith：初期値を設定
interval(1000).pipe(
  startWith('開始'),
  take(4)
).subscribe(console.log); // '開始', 0, 1, 2
```

#### エラー処理

```typescript
// catchError：エラーをハンドリング
this.http.get('/api/data').pipe(
  catchError((error) => {
    console.error('エラー:', error);
    return of([]); // フォールバック値を返す
  })
).subscribe(console.log);

// retry：自動リトライ
this.http.get('/api/data').pipe(
  retry(3) // 最大3回リトライ
).subscribe(console.log);

// retryWhen：条件付きリトライ
import { retryWhen, delay, take } from 'rxjs/operators';

this.http.get('/api/data').pipe(
  retryWhen((errors) =>
    errors.pipe(
      delay(1000), // 1秒待ってからリトライ
      take(3)      // 最大3回
    )
  )
).subscribe(console.log);
```

#### メモリリーク防止

```typescript
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-safe-subscription',
  standalone: true,
  template: `<p>{{ data }}</p>`,
})
export class SafeSubscriptionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  data: any;

  private dataService = inject(DataService);

  ngOnInit(): void {
    this.dataService.getData().pipe(
      takeUntil(this.destroy$) // destroy$がemitしたら自動で購読解除
    ).subscribe((data) => {
      this.data = data;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

Angular 16以降では `takeUntilDestroyed()` が使える。

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, DestroyRef } from '@angular/core';

@Component({
  selector: 'app-modern',
  standalone: true,
  template: `<p>{{ data }}</p>`,
})
export class ModernComponent {
  data: any;
  private dataService = inject(DataService);

  constructor() {
    this.dataService.getData().pipe(
      takeUntilDestroyed() // コンポーネント破棄時に自動解除
    ).subscribe((data) => {
      this.data = data;
    });
  }
}
```

### 複数Observableの合成

```typescript
// combineLatest：全てのObservableが1回以上emitしたら、最新値の組み合わせを返す
combineLatest$([
  this.userService.currentUser$,
  this.settingsService.settings$,
  this.permissionsService.permissions$,
]).pipe(
  map(([user, settings, permissions]) => ({
    user,
    settings,
    canEdit: permissions.includes('edit'),
  }))
).subscribe((combined) => {
  this.viewModel = combined;
});

// forkJoin：全てのObservableが完了したら、最終値の配列を返す
forkJoin$({
  users: this.userService.getAll(),
  products: this.productService.getAll(),
  orders: this.orderService.getRecent(),
}).subscribe(({ users, products, orders }) => {
  this.dashboardData = { users, products, orders };
});

// withLatestFrom：別のObservableの最新値と組み合わせる
this.searchTerm$.pipe(
  withLatestFrom(this.filters$),
  switchMap(([term, filters]) => this.search(term, filters))
).subscribe(console.log);
```

---

## 11. Angular Signals（新しい状態管理）

### Signalsとは

Angular 16で導入されたSignalsは、リアクティブな状態管理のための新しいプリミティブだ。ZoneJSに依存しない細粒度の変更検知を実現し、従来のObservableよりシンプルに状態を管理できる。

### signal・computed・effect

```typescript
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-signals-demo',
  standalone: true,
  template: `
    <div>
      <h2>カート（{{ itemCount() }}件）</h2>
      <p>合計金額: {{ totalPrice() | currency:'JPY' }}</p>
      <button (click)="addItem()">商品を追加</button>
      <button (click)="clearCart()">カートをクリア</button>
    </div>
  `,
})
export class SignalsDemoComponent {
  // 基本的なsignal（書き込み可能）
  private items = signal<Array<{ name: string; price: number }>>([]);

  // computed signal（派生値・自動再計算）
  itemCount = computed(() => this.items().length);
  totalPrice = computed(() =>
    this.items().reduce((sum, item) => sum + item.price, 0)
  );

  // effect（副作用・signalの変化を監視）
  constructor() {
    effect(() => {
      console.log(`カートに${this.itemCount()}件の商品があります`);
      // signalを読み取るだけで自動的に監視対象になる
    });
  }

  addItem(): void {
    // set：値を完全に置き換え
    // update：現在の値を元に更新
    this.items.update((current) => [
      ...current,
      { name: `商品 ${current.length + 1}`, price: Math.floor(Math.random() * 10000) },
    ]);
  }

  clearCart(): void {
    this.items.set([]);
  }
}
```

### Signalsを使った状態管理サービス

```typescript
// src/app/store/cart.store.ts
import { Injectable, signal, computed } from '@angular/core';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartStore {
  // プライベートな書き込み可能Signal
  private _items = signal<CartItem[]>([]);

  // パブリックな読み取り専用Signal
  readonly items = this._items.asReadonly();

  // 派生Signal（computed）
  readonly itemCount = computed(() =>
    this._items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly totalPrice = computed(() =>
    this._items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  readonly isEmpty = computed(() => this._items().length === 0);

  addItem(product: { id: number; name: string; price: number }): void {
    this._items.update((items) => {
      const existingItem = items.find((item) => item.id === product.id);

      if (existingItem) {
        return items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...items, { ...product, quantity: 1 }];
    });
  }

  removeItem(id: number): void {
    this._items.update((items) => items.filter((item) => item.id !== id));
  }

  updateQuantity(id: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(id);
      return;
    }

    this._items.update((items) =>
      items.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }

  clearCart(): void {
    this._items.set([]);
  }
}
```

### RxJSとSignalsの相互変換

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { Component, inject, signal } from '@angular/core';
import { interval } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-interop-demo',
  standalone: true,
  template: `
    <p>経過秒数: {{ elapsedSeconds() }}</p>
    <p>検索結果数: {{ resultCount() }}</p>
  `,
})
export class InteropDemoComponent {
  // Observable -> Signal（toSignal）
  private timer$ = interval(1000).pipe(map((n) => n + 1));
  elapsedSeconds = toSignal(this.timer$, { initialValue: 0 });

  // Signal -> Observable（toObservable）
  searchTerm = signal('');
  private searchTerm$ = toObservable(this.searchTerm);

  // searchTerm$ をパイプで変換し、再びSignalに
  private results$ = this.searchTerm$.pipe(
    // switchMap など非同期処理を挟める
    map((term) => term.length)
  );
  resultCount = toSignal(this.results$, { initialValue: 0 });
}
```

---

## 12. NgRxによる状態管理

### NgRxとは

NgRxはAngular向けのReduxパターン状態管理ライブラリだ。Store（単一のイミュータブルな状態）・Action（イベント）・Reducer（状態変換）・Effect（副作用）・Selector（状態取得）の5要素で構成される。

```bash
ng add @ngrx/store
ng add @ngrx/effects
ng add @ngrx/entity
ng add @ngrx/store-devtools
```

### State・Action・Reducer・Selector・Effectの定義

#### 商品管理の例

```typescript
// src/app/store/products/product.actions.ts
import { createAction, props } from '@ngrx/store';
import { Product } from '../../models/product.model';

// Action creators
export const loadProducts = createAction('[Product] Load Products');

export const loadProductsSuccess = createAction(
  '[Product] Load Products Success',
  props<{ products: Product[] }>()
);

export const loadProductsFailure = createAction(
  '[Product] Load Products Failure',
  props<{ error: string }>()
);

export const selectProduct = createAction(
  '[Product] Select Product',
  props<{ id: number }>()
);

export const addToCart = createAction(
  '[Product] Add To Cart',
  props<{ product: Product }>()
);
```

```typescript
// src/app/store/products/product.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Product } from '../../models/product.model';
import * as ProductActions from './product.actions';

export interface ProductState extends EntityState<Product> {
  selectedId: number | null;
  isLoading: boolean;
  error: string | null;
}

const adapter: EntityAdapter<Product> = createEntityAdapter<Product>();

const initialState: ProductState = adapter.getInitialState({
  selectedId: null,
  isLoading: false,
  error: null,
});

export const productReducer = createReducer(
  initialState,
  on(ProductActions.loadProducts, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(ProductActions.loadProductsSuccess, (state, { products }) =>
    adapter.setAll(products, { ...state, isLoading: false })
  ),
  on(ProductActions.loadProductsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),
  on(ProductActions.selectProduct, (state, { id }) => ({
    ...state,
    selectedId: id,
  }))
);

export const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
```

```typescript
// src/app/store/products/product.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProductState, selectAll } from './product.reducer';

const selectProductState = createFeatureSelector<ProductState>('products');

export const selectAllProducts = createSelector(
  selectProductState,
  selectAll
);

export const selectIsLoading = createSelector(
  selectProductState,
  (state) => state.isLoading
);

export const selectError = createSelector(
  selectProductState,
  (state) => state.error
);

export const selectSelectedId = createSelector(
  selectProductState,
  (state) => state.selectedId
);

export const selectSelectedProduct = createSelector(
  selectProductState,
  selectSelectedId,
  (state, id) => (id ? state.entities[id] : null)
);

export const selectExpensiveProducts = createSelector(
  selectAllProducts,
  (products) => products.filter((p) => p.price > 50000)
);
```

```typescript
// src/app/store/products/product.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ProductService } from '../../services/product.service';
import * as ProductActions from './product.actions';

@Injectable()
export class ProductEffects {
  private actions$ = inject(Actions);
  private productService = inject(ProductService);

  loadProducts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductActions.loadProducts),
      switchMap(() =>
        this.productService.getAll().pipe(
          map((products) =>
            ProductActions.loadProductsSuccess({ products })
          ),
          catchError((error) =>
            of(ProductActions.loadProductsFailure({ error: error.message }))
          )
        )
      )
    )
  );
}
```

```typescript
// コンポーネントでの使用
import { Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe } from '@angular/common';
import * as ProductActions from '../../store/products/product.actions';
import * as ProductSelectors from '../../store/products/product.selectors';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    @if (isLoading$ | async) {
      <div class="spinner">読み込み中...</div>
    }
    @if (error$ | async; as error) {
      <div class="error">{{ error }}</div>
    }
    <ul>
      @for (product of products$ | async; track product.id) {
        <li (click)="selectProduct(product.id)">
          {{ product.name }} - {{ product.price | currency:'JPY' }}
        </li>
      }
    </ul>
  `,
})
export class ProductPageComponent implements OnInit {
  private store = inject(Store);

  products$ = this.store.select(ProductSelectors.selectAllProducts);
  isLoading$ = this.store.select(ProductSelectors.selectIsLoading);
  error$ = this.store.select(ProductSelectors.selectError);

  ngOnInit(): void {
    this.store.dispatch(ProductActions.loadProducts());
  }

  selectProduct(id: number): void {
    this.store.dispatch(ProductActions.selectProduct({ id }));
  }
}
```

---

## 13. テスト（Jasmine・TestBed）

### テストの設定

AngularのデフォルトテストフレームワークはJasmineとKarmaだ。Angular 16以降ではJestも公式サポートされている。

```bash
# テストの実行
ng test

# カバレッジレポート付き
ng test --code-coverage

# ヘッドレスモードで実行（CI/CD用）
ng test --watch=false --browsers=ChromeHeadless
```

### コンポーネントのテスト

```typescript
// src/app/features/counter/counter.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CounterComponent } from './counter.component';
import { By } from '@angular/platform-browser';

describe('CounterComponent', () => {
  let component: CounterComponent;
  let fixture: ComponentFixture<CounterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent], // Standalone Componentの場合はimports
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('初期値が0であること', () => {
    expect(component.count).toBe(0);
  });

  it('incrementボタンをクリックするとcountが1増えること', () => {
    const button = fixture.debugElement.query(By.css('[data-testid="increment-btn"]'));
    button.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(component.count).toBe(1);
  });

  it('decrementボタンをクリックするとcountが1減ること', () => {
    component.count = 5;
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('[data-testid="decrement-btn"]'));
    button.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(component.count).toBe(4);
  });

  it('テンプレートに現在のカウントが表示されること', () => {
    component.count = 42;
    fixture.detectChanges();

    const countEl = fixture.debugElement.query(By.css('[data-testid="count-display"]'));
    expect(countEl.nativeElement.textContent).toContain('42');
  });

  it('countChangedイベントが正しくemitされること', () => {
    let emittedValue: number | undefined;
    component.countChanged.subscribe((value: number) => {
      emittedValue = value;
    });

    component.increment();
    expect(emittedValue).toBe(1);
  });
});
```

### サービスのテスト

```typescript
// src/app/services/user.service.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { UserService, User } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const mockUsers: User[] = [
    { id: 1, name: '山田太郎', email: 'yamada@example.com', role: 'admin' },
    { id: 2, name: '鈴木花子', email: 'suzuki@example.com', role: 'user' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService],
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // 未処理のHTTPリクエストがないか検証
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getUsers()がユーザー配列を返すこと', () => {
    service.getUsers().subscribe((users) => {
      expect(users.length).toBe(2);
      expect(users[0].name).toBe('山田太郎');
    });

    const req = httpMock.expectOne('https://api.example.com/users');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  it('getUserById()が指定ユーザーを返すこと', () => {
    service.getUserById(1).subscribe((user) => {
      expect(user.id).toBe(1);
      expect(user.role).toBe('admin');
    });

    const req = httpMock.expectOne('https://api.example.com/users/1');
    req.flush(mockUsers[0]);
  });

  it('APIエラー時にエラーをスローすること', () => {
    service.getUsers().subscribe({
      next: () => fail('エラーが発生するはずでした'),
      error: (error) => {
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne('https://api.example.com/users');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });
});
```

### NgRxストアのテスト

```typescript
// src/app/store/products/product.reducer.spec.ts
import { productReducer, ProductState } from './product.reducer';
import * as ProductActions from './product.actions';

describe('Product Reducer', () => {
  const initialState: ProductState = {
    ids: [],
    entities: {},
    selectedId: null,
    isLoading: false,
    error: null,
  };

  it('loadProductsアクションでisLoadingがtrueになること', () => {
    const action = ProductActions.loadProducts();
    const state = productReducer(initialState, action);

    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('loadProductsSuccessアクションで商品が追加されること', () => {
    const products = [
      { id: 1, name: 'Product 1', price: 1000 },
      { id: 2, name: 'Product 2', price: 2000 },
    ];
    const action = ProductActions.loadProductsSuccess({ products } as any);
    const state = productReducer(
      { ...initialState, isLoading: true },
      action
    );

    expect(state.isLoading).toBe(false);
    expect(state.ids.length).toBe(2);
  });
});
```

### E2Eテスト（Playwright）

Angular 17以降、Playwrightが推奨E2Eフレームワークだ。

```bash
npm install -D @playwright/test
npx playwright install
```

```typescript
// e2e/product-list.spec.ts
import { test, expect } from '@playwright/test';

test.describe('商品一覧ページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
  });

  test('商品一覧が表示されること', async ({ page }) => {
    await expect(page.locator('[data-testid="product-list"]')).toBeVisible();
    const items = page.locator('[data-testid="product-item"]');
    await expect(items).toHaveCount(3);
  });

  test('商品をクリックすると詳細ページに遷移すること', async ({ page }) => {
    await page.locator('[data-testid="product-item"]').first().click();
    await expect(page).toHaveURL(/\/products\/\d+/);
  });

  test('検索フィールドで商品をフィルタリングできること', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'MacBook');
    await expect(page.locator('[data-testid="product-item"]')).toHaveCount(1);
  });
});
```

---

## 14. パフォーマンス最適化

### OnPush変更検知戦略

デフォルトの`Default`戦略では、全てのコンポーネントが変更検知のたびにチェックされる。`OnPush`戦略を使うと、@Inputプロパティが参照変更されたとき・イベントが発生したとき・Observableが新しい値をemitしたときのみ再チェックされる。

```typescript
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-product-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush, // OnPush戦略を適用
  template: `
    <div class="product-card">
      <h3>{{ product.name }}</h3>
      <p>{{ product.price | currency:'JPY' }}</p>
    </div>
  `,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: { name: string; price: number };
}
```

### 遅延読み込み（Lazy Loading）

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'admin',
    // コンポーネントを遅延読み込みし、初回アクセス時にのみバンドルをダウンロード
    loadComponent: () =>
      import('./pages/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: 'features',
    // 子ルートごとルートを遅延読み込み
    loadChildren: () =>
      import('./pages/features/features.routes').then((m) => m.featuresRoutes),
  },
];
```

### @defer（Angular 17以降）

```html
<!-- メインコンテンツが表示された後に重いコンポーネントを遅延読み込み -->
@defer (on viewport) {
  <app-heavy-chart [data]="chartData" />
} @placeholder {
  <div class="chart-placeholder">グラフを読み込み中...</div>
} @loading (minimum 500ms) {
  <div class="spinner">読み込み中...</div>
} @error {
  <div class="error">読み込みに失敗しました</div>
}

<!-- ユーザーインタラクションで読み込み -->
@defer (on interaction) {
  <app-comments [postId]="postId" />
} @placeholder {
  <button>コメントを表示</button>
}

<!-- 特定の条件で読み込み -->
@defer (when isVisible) {
  <app-user-profile [userId]="userId" />
}
```

### TrackBy関数の使用

```typescript
@Component({
  selector: 'app-optimized-list',
  standalone: true,
  template: `
    <!-- @for の track 式で一意のキーを指定 -->
    @for (item of items; track item.id) {
      <app-list-item [item]="item" />
    }
  `,
})
export class OptimizedListComponent {
  items: Array<{ id: number; name: string }> = [];
}
```

### Pure Pipeとmemoizeによるキャッシュ

```typescript
// デフォルトでPipeはPure（同じ入力には同じ出力をキャッシュ）
@Pipe({
  name: 'filterByCategory',
  standalone: true,
  pure: true, // デフォルトtrue
})
export class FilterByCategoryPipe implements PipeTransform {
  transform(products: Product[], category: string): Product[] {
    return products.filter((p) => p.category === category);
  }
}
```

### SSR（Angular Universal / Server-Side Rendering）

```bash
# SSRを有効化（プロジェクト作成時）
ng new my-app --ssr

# 既存プロジェクトにSSRを追加
ng add @angular/ssr
```

```typescript
// app.config.server.ts（SSR用設定）
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

#### SSRでのプラットフォーム判定

```typescript
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

@Component({
  selector: 'app-platform-aware',
  standalone: true,
  template: `<p>{{ message }}</p>`,
})
export class PlatformAwareComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  message = '';

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // ブラウザ専用のコード（localStorage、window等）
      this.message = `ブラウザ: ${window.innerWidth}px`;
    }

    if (isPlatformServer(this.platformId)) {
      // サーバー専用のコード
      this.message = 'サーバーサイドレンダリング中';
    }
  }
}
```

### バンドルサイズの最適化

```bash
# バンドルアナライザーのインストール
npm install -D webpack-bundle-analyzer

# バンドル統計ファイルを生成
ng build --stats-json

# 可視化
npx webpack-bundle-analyzer dist/my-app/browser/stats.json
```

```json
// angular.json のビルド最適化設定
{
  "configurations": {
    "production": {
      "optimization": {
        "scripts": true,
        "styles": { "minify": true, "inlineCritical": true },
        "fonts": { "inline": true }
      },
      "outputHashing": "all",
      "sourceMap": false,
      "budgets": [
        {
          "type": "initial",
          "maximumWarning": "500kb",
          "maximumError": "1mb"
        },
        {
          "type": "anyComponentStyle",
          "maximumWarning": "2kb",
          "maximumError": "4kb"
        }
      ]
    }
  }
}
```

---

## 15. デプロイ

### ビルドの実行

```bash
# 本番ビルド
ng build

# 特定の設定でビルド
ng build --configuration=production
```

ビルド成果物は `dist/` ディレクトリに出力される。

### Vercelへのデプロイ

```bash
# Vercel CLIのインストール
npm install -g vercel

# デプロイ（初回はプロジェクト設定を対話式で行う）
vercel

# 本番デプロイ
vercel --prod
```

`vercel.json` の設定：

```json
{
  "buildCommand": "ng build",
  "outputDirectory": "dist/my-angular-app/browser",
  "framework": "angular",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Netlifyへのデプロイ

`netlify.toml`：

```toml
[build]
  command = "ng build"
  publish = "dist/my-angular-app/browser"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### GitHub Pagesへのデプロイ

```bash
# angular-cli-ghpagesのインストール
npm install -g angular-cli-ghpages

# ベースhrefを指定してビルド・デプロイ
ng build --base-href "https://username.github.io/repo-name/"
npx angular-cli-ghpages --dir=dist/my-angular-app/browser
```

### Firebase Hostingへのデプロイ

```bash
# Firebase CLIのインストール
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# プロジェクトの初期化
firebase init hosting

# デプロイ
ng build && firebase deploy --only hosting
```

`firebase.json`：

```json
{
  "hosting": {
    "public": "dist/my-angular-app/browser",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Docker化

```dockerfile
# Dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Nginxで配信
FROM nginx:alpine

COPY --from=build /app/dist/my-angular-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
events {}

http {
  server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
      try_files $uri $uri/ /index.html;
    }

    # キャッシュ設定
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }
  }
}
```

### CI/CDパイプライン（GitHub Actions）

```yaml
# .github/workflows/deploy.yml
name: Angular CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Node.jsのセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 依存関係のインストール
        run: npm ci

      - name: Lintチェック
        run: npm run lint

      - name: ユニットテストの実行
        run: npm run test -- --watch=false --browsers=ChromeHeadless

      - name: ビルドの確認
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Node.jsのセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 依存関係のインストール
        run: npm ci

      - name: 本番ビルド
        run: npm run build

      - name: Vercelへデプロイ
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 16. まとめ

### Angularが提供する価値

本ガイドで学んだAngularのエコシステムを整理する。

**コンポーネントシステム**として、Standalone Componentsによりモジュール定義が不要になり、コンポーネント単体での独立性が高まった。`@if`・`@for`・`@switch`・`@defer`などの新しいテンプレートブロック構文により、可読性と型安全性が向上している。

**依存性注入**は、`inject()` 関数とコンストラクターインジェクションの両方をサポートし、テスタビリティの高いアーキテクチャを実現する。スコープ管理により、アプリ全体・機能モジュール・コンポーネントツリーそれぞれのレベルでサービスの共有範囲を制御できる。

**状態管理**については、Angular Signalsが新しいプリミティブとして導入され、ZoneJSに依存しないファインなリアクティビティが実現できるようになった。NgRxはエンタープライズ規模のアプリケーションで依然として有力な選択肢であり、Redux DevToolsとの統合による強力なデバッグ体験を提供する。

**テスト**は、TestBedによるAngular固有の依存性注入を活用したユニットテスト・統合テストが強力だ。HttpClientTestingModuleによるHTTPモックや、Playwright/Cypressを使ったE2Eテストと組み合わせることで、品質を担保しながら安心してリファクタリングできる。

**パフォーマンス**は、OnPush変更検知・遅延読み込み・`@defer`ブロック・SSRの組み合わせにより、大規模アプリケーションでも高いパフォーマンスを維持できる。

### 次のステップ

Angularの学習をさらに深めるには、以下のリソースが参考になる。

- **公式ドキュメント**（angular.dev）：Angular 17以降は新ドメインに統合されており、インタラクティブなチュートリアルも提供されている
- **Angular University**：有料コースだが体系的に学べる
- **Nx**：Angularプロジェクトのモノレポ管理ツール。複数アプリを効率的に管理できる
- **Angular Material**：GoogleのMaterial Designに準拠したUIコンポーネントライブラリ

### 開発ツールの活用

Angularプロジェクトを効率的に進めるためには、適切な開発ツールの選択が重要だ。DevToolBox（https://usedevtools.com）はAngular開発者に有用なユーティリティを提供しており、JSON整形・正規表現テスト・TypeScript Playground・APIテストなどの機能を一箇所で利用できる。開発中の細かな確認作業をブラウザだけで完結できるため、コンテキストスイッチを減らし開発効率を高められる。

Angular CLIのバージョン管理・プロジェクトのビルド設定・テスト設定など、プロジェクトを長期的に健全に保つための運用知識も、Angularエキスパートへの道において欠かせない要素だ。本ガイドで学んだ知識を基礎として、実際のプロジェクトで手を動かしながら理解を深めていくことを推奨する。

---

*本記事は Angular 19 / Angular CLI 19.1 を基準に執筆しています。*
