---
title: 'Capacitor：WebアプリをiOS/Androidネイティブアプリに変換'
description: 'Capacitorを使ってWebアプリケーションをiOS/Androidネイティブアプリに変換する方法。プラグイン活用、カメラ・通知機能、App Store/Play Store公開フローを解説します。ベストプラクティスと注意点も紹介します。'
pubDate: 'Feb 05 2026'
tags: ['Capacitor', 'React', 'iOS', 'Android', 'モバイルアプリ', 'ハイブリッドアプリ']
---
# Capacitor：WebアプリをiOS/Androidネイティブアプリに変換

モバイルアプリを開発する際、Swift/Kotlin/React Nativeを学ぶのは時間がかかります。Capacitorを使えば、既存のWeb技術（React、Vue、Angularなど）で作ったアプリを、そのままiOSとAndroidのネイティブアプリに変換できます。

この記事では、Capacitorの基本からアプリストア公開まで、実践的に解説します。

## Capacitorとは

Capacitorは、Ionic Teamが開発したクロスプラットフォームのネイティブランタイムです。Webアプリケーションをラップし、ネイティブアプリとして動作させます。

### 主な特徴

- **Web標準ベース**: 既存のWeb技術をそのまま活用
- **ネイティブAPI**: カメラ、位置情報、プッシュ通知などにアクセス
- **フレームワーク非依存**: React、Vue、Svelte、Angularなど何でも対応
- **完全なネイティブアクセス**: Xcode/Android Studioで直接編集可能
- **プラグインエコシステム**: 公式・コミュニティプラグイン多数
- **PWA対応**: 同じコードベースでWebアプリとしても動作
- **ライブリロード**: ネイティブアプリ開発中もホットリロード可能

### 競合との比較

**Capacitor vs React Native**
- React Nativeは完全なネイティブUI
- Capacitorは既存のWebアプリをそのまま利用可能
- React Nativeはパフォーマンスがやや有利
- Capacitorは学習コストが低い

**Capacitor vs Cordova**
- 両方ともIonic Teamが開発
- Capacitorはより現代的なアーキテクチャ
- Capacitorはネイティブプロジェクトへの直接アクセスが容易
- Capacitorはプラグイン管理がシンプル

**Capacitor vs Electron（デスクトップ向け）**
- Capacitorはモバイル専用
- Electronはデスクトップアプリ向け
- 技術スタックは似ている

## セットアップ

### 前提条件

**開発環境:**
- Node.js 16以降
- npm/pnpm/yarn
- iOS開発: macOS + Xcode
- Android開発: Android Studio

### 既存のWebアプリに追加

React、Vue、その他のWebアプリケーションにCapacitorを追加します。

```bash
# Capacitorのインストール
npm install @capacitor/core @capacitor/cli

# Capacitorの初期化
npx cap init
```

対話式のセットアップ：

```
? App name: My Awesome App
? App Package ID (in Java package format): com.example.myapp
? (Optional) Web asset directory: dist (or build, public, etc.)
```

Package IDは、逆ドメイン形式で一意にする必要があります。

### プラットフォームの追加

```bash
# iOSとAndroidを追加
npm install @capacitor/ios @capacitor/android

npx cap add ios
npx cap add android
```

これにより、`ios/`と`android/`ディレクトリが作成されます。

### プロジェクト構造

```
my-app/
├── src/              # Webアプリのソース
├── dist/             # ビルド済みWebアプリ
├── ios/              # iOSネイティブプロジェクト
├── android/          # Androidネイティブプロジェクト
├── capacitor.config.ts
└── package.json
```

### Capacitor設定

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.myapp',
  appName: 'My Awesome App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
  },
};

export default config;
```

## 開発ワークフロー

### 1. Webアプリのビルド

まず、通常通りWebアプリをビルドします。

```bash
# React
npm run build

# Next.js（静的エクスポート）
npm run build && npm run export

# Vite
npm run build
```

### 2. ネイティブプロジェクトに同期

ビルド済みのWebアプリをネイティブプロジェクトにコピーします。

```bash
npx cap sync
```

これは以下を実行します：
1. `dist/`の内容を各プラットフォームにコピー
2. ネイティブ依存関係を更新
3. Capacitorプラグインを同期

### 3. ネイティブアプリの実行

```bash
# iOS（macOSのみ）
npx cap open ios

# Android
npx cap open android
```

Xcode/Android Studioが開くので、エミュレーターや実機で実行できます。

### ライブリロード開発

開発中は、ライブリロードを使うと効率的です。

```bash
# 開発サーバーを起動
npm run dev
```

```typescript
// capacitor.config.ts（開発時のみ）
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.myapp',
  appName: 'My Awesome App',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.100:5173', // 開発サーバーのURL
    cleartext: true,
  },
};

export default config;
```

これで、Webアプリを編集すると、ネイティブアプリも即座に更新されます。

## コアプラグイン

Capacitorには、よく使われる機能のための公式プラグインがあります。

### App Plugin

アプリのライフサイクルとステート管理。

```typescript
import { App } from '@capacitor/app';

// アプリがフォアグラウンドに戻ったとき
App.addListener('appStateChange', ({ isActive }) => {
  console.log('App state changed. Is active?', isActive);
});

// バックボタン（Android）
App.addListener('backButton', ({ canGoBack }) => {
  if (!canGoBack) {
    App.exitApp();
  } else {
    window.history.back();
  }
});

// アプリ情報の取得
const info = await App.getInfo();
console.log('App version:', info.version);
```

### Camera Plugin

カメラとフォトギャラリーへのアクセス。

```bash
npm install @capacitor/camera
npx cap sync
```

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function takePicture() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });

    // image.webPathはファイルパス
    return image.webPath;
  } catch (error) {
    console.error('Camera error:', error);
  }
}

export async function pickFromGallery() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Photos,
  });

  // image.dataUrlはbase64エンコードされた画像
  return image.dataUrl;
}
```

Reactコンポーネント例：

```typescript
import { useState } from 'react';
import { Camera, CameraResultType } from '@capacitor/camera';

export function CameraComponent() {
  const [photo, setPhoto] = useState<string>();

  const takePhoto = async () => {
    const image = await Camera.getPhoto({
      quality: 90,
      resultType: CameraResultType.Uri,
    });

    setPhoto(image.webPath);
  };

  return (
    <div>
      <button onClick={takePhoto}>Take Photo</button>
      {photo && <img src={photo} alt="Captured" />}
    </div>
  );
}
```

### Geolocation Plugin

位置情報の取得。

```bash
npm install @capacitor/geolocation
npx cap sync
```

```typescript
import { Geolocation } from '@capacitor/geolocation';

export async function getCurrentPosition() {
  const coordinates = await Geolocation.getCurrentPosition();

  console.log('Current position:', coordinates);
  // {
  //   coords: {
  //     latitude: 35.6762,
  //     longitude: 139.6503,
  //     accuracy: 10,
  //     altitude: null,
  //     ...
  //   }
  // }

  return coordinates.coords;
}

export function watchPosition(callback: (position: any) => void) {
  const id = Geolocation.watchPosition({}, (position, err) => {
    if (position) {
      callback(position);
    }
  });

  // クリーンアップ関数を返す
  return () => Geolocation.clearWatch({ id });
}
```

Reactフック：

```typescript
import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export function useGeolocation() {
  const [position, setPosition] = useState<any>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let watchId: string;

    const startWatch = async () => {
      try {
        watchId = await Geolocation.watchPosition({}, (position, err) => {
          if (err) {
            setError(err.message);
          } else if (position) {
            setPosition(position.coords);
          }
        });
      } catch (err: any) {
        setError(err.message);
      }
    };

    startWatch();

    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, []);

  return { position, error };
}
```

### Push Notifications

プッシュ通知の実装。

```bash
npm install @capacitor/push-notifications
npx cap sync
```

```typescript
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';

export async function initializePushNotifications() {
  // パーミッションリクエスト
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    throw new Error('Push notification permission denied');
  }

  // 登録
  await PushNotifications.register();

  // リスナー設定
  PushNotifications.addListener('registration', (token: Token) => {
    console.log('Push registration success, token:', token.value);
    // トークンをバックエンドに送信
    sendTokenToServer(token.value);
  });

  PushNotifications.addListener('registrationError', (error: any) => {
    console.error('Push registration error:', error);
  });

  PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
    }
  );

  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (notification: ActionPerformed) => {
      console.log('Push notification action performed', notification);
      // 通知タップ時の処理
    }
  );
}

async function sendTokenToServer(token: string) {
  await fetch('https://api.example.com/push-tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}
```

### Local Notifications

ローカル通知（デバイス内で生成）。

```bash
npm install @capacitor/local-notifications
npx cap sync
```

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

export async function scheduleNotification() {
  await LocalNotifications.requestPermissions();

  await LocalNotifications.schedule({
    notifications: [
      {
        title: 'Reminder',
        body: 'Don\'t forget to check your tasks!',
        id: 1,
        schedule: {
          at: new Date(Date.now() + 1000 * 60 * 60), // 1時間後
        },
        sound: 'beep.wav',
        attachments: undefined,
        actionTypeId: '',
        extra: null,
      },
    ],
  });
}

export async function scheduleRepeatingNotification() {
  await LocalNotifications.schedule({
    notifications: [
      {
        title: 'Daily Reminder',
        body: 'Time for your daily task!',
        id: 2,
        schedule: {
          on: {
            hour: 9,
            minute: 0,
          },
          every: 'day',
        },
      },
    ],
  });
}
```

### Storage Plugin

永続的なキーバリューストレージ。

```bash
npm install @capacitor/preferences
npx cap sync
```

```typescript
import { Preferences } from '@capacitor/preferences';

// データの保存
export async function saveData(key: string, value: any) {
  await Preferences.set({
    key,
    value: JSON.stringify(value),
  });
}

// データの取得
export async function getData(key: string) {
  const { value } = await Preferences.get({ key });
  return value ? JSON.parse(value) : null;
}

// データの削除
export async function removeData(key: string) {
  await Preferences.remove({ key });
}

// すべてのデータをクリア
export async function clearAll() {
  await Preferences.clear();
}
```

Reactフック：

```typescript
import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

export function useStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    Preferences.get({ key }).then(({ value: stored }) => {
      if (stored) {
        setValue(JSON.parse(stored));
      }
    });
  }, [key]);

  const updateValue = async (newValue: T) => {
    setValue(newValue);
    await Preferences.set({
      key,
      value: JSON.stringify(newValue),
    });
  };

  return [value, updateValue] as const;
}

// 使用例
function MyComponent() {
  const [username, setUsername] = useStorage('username', '');

  return (
    <input
      value={username}
      onChange={(e) => setUsername(e.target.value)}
    />
  );
}
```

## カスタムプラグインの作成

独自のネイティブ機能を追加できます。

```bash
npm install @capacitor/cli
npx cap plugin:generate
```

```
? Plugin npm name: my-custom-plugin
? Plugin id: com.example.mycustomplugin
? Plugin class name: MyCustomPlugin
? Description: My awesome custom plugin
? Git repository:
? Author:
? License: MIT
```

これで、プラグインのテンプレートが生成されます。

## App Store / Play Store公開

### iOS（App Store）

#### 1. Xcodeでプロジェクトを開く

```bash
npx cap open ios
```

#### 2. 署名設定

Xcode → Signing & Capabilities → Team（Apple Developer Account）

#### 3. アプリアイコンとスプラッシュスクリーン

```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

1024x1024pxのアイコンを配置します。

#### 4. ビルド番号とバージョン

Xcode → General → Version & Build

#### 5. アーカイブとアップロード

```
Xcode → Product → Archive → Distribute App
```

App Store Connectにアップロードされます。

#### 6. App Store Connectで申請

- スクリーンショット追加
- アプリ説明記入
- プライバシーポリシー設定
- 審査提出

### Android（Play Store）

#### 1. Android Studioでプロジェクトを開く

```bash
npx cap open android
```

#### 2. アプリアイコン

```
android/app/src/main/res/mipmap-*/
```

各解像度のアイコンを配置します。

#### 3. 署名鍵の作成

```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

#### 4. 署名設定

```
android/app/build.gradle
```

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("my-release-key.keystore")
            storePassword "password"
            keyAlias "my-key-alias"
            keyPassword "password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### 5. AABのビルド

```
Build → Generate Signed Bundle / APK → Android App Bundle
```

#### 6. Play Consoleにアップロード

- Google Play Consoleでアプリ作成
- AABファイルをアップロード
- ストア掲載情報入力
- 審査提出

## ベストプラクティス

### 1. プラットフォーム検出

```typescript
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform(); // 'ios', 'android', 'web'

if (platform === 'ios') {
  // iOS固有の処理
} else if (platform === 'android') {
  // Android固有の処理
}
```

### 2. エラーハンドリング

```typescript
import { Camera } from '@capacitor/camera';

try {
  const photo = await Camera.getPhoto({...});
} catch (error: any) {
  if (error.message.includes('cancelled')) {
    // ユーザーがキャンセル
  } else if (error.message.includes('permission')) {
    // パーミッション拒否
    alert('Camera permission is required');
  }
}
```

### 3. パーミッション管理

```typescript
import { Camera } from '@capacitor/camera';

const checkPermissions = async () => {
  const status = await Camera.checkPermissions();

  if (status.camera !== 'granted') {
    const newStatus = await Camera.requestPermissions();
    return newStatus.camera === 'granted';
  }

  return true;
};
```

## まとめ

Capacitorは、Web技術でネイティブアプリを構築できる強力なツールです。主な利点は以下の通りです。

- **既存のスキル活用**: Web開発スキルをそのまま利用
- **コード共有**: Web、iOS、Androidで同じコードベース
- **ネイティブアクセス**: フルネイティブAPIへのアクセス
- **柔軟性**: 必要に応じてネイティブコードを追加可能

React、Vue、その他のWebフレームワークでアプリを構築し、Capacitorでネイティブアプリとして公開できます。学習コストが低く、開発効率が高いため、多くの企業やスタートアップで採用されています。
