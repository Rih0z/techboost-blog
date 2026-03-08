---
title: 'Expo + React Native完全ガイド - モバイルアプリ開発を最速で始める'
description: 'ExpoとReact Nativeを使ったモバイルアプリ開発の完全ガイド。セットアップからビルド、デプロイまで実践的に解説。iOS/Androidアプリを一つのコードベースで開発する方法を学びます。React Native・Expo・モバイル開発に関する実践情報。'
pubDate: '2026-02-05'
tags: ['React Native', 'Expo', 'モバイル開発', 'TypeScript', 'iOS', 'Android']
heroImage: '../../assets/thumbnails/expo-react-native-guide.jpg'
---
ExpoとReact Nativeを使えば、JavaScriptとReactの知識だけで、iOS/Androidの両方に対応したネイティブアプリを開発できます。この記事では、Expoを使った最新のモバイルアプリ開発手法を解説します。

## ExpoとReact Nativeの違い

### React Native
- Metaが開発したモバイルアプリフレームワーク
- JavaScriptでネイティブアプリを構築
- ネイティブコード（Objective-C、Swift、Java、Kotlin）との統合が可能

### Expo
- React Nativeのラッパーフレームワーク
- 開発環境の構築を簡素化
- ビルド、デプロイツールが統合済み
- 多数のネイティブ機能をすぐに使用可能

**選択基準:**
- **Expo推奨** - 多くのアプリ、特にスタートアップや個人開発
- **Bare React Native推奨** - 特殊なネイティブモジュールが必要な場合

## 環境構築

### 必要なもの

```bash
# Node.js 18以上が必要
node --version  # v18.0.0以上であることを確認
```

### Expoプロジェクトの作成

```bash
# Expoプロジェクトを作成
npx create-expo-app my-app --template

# プロジェクトディレクトリに移動
cd my-app

# 開発サーバーを起動
npx expo start
```

テンプレート選択肢:
- **Blank** - 最小構成
- **Blank (TypeScript)** - TypeScript対応の最小構成
- **Tabs (TypeScript)** - タブナビゲーション付き

### Expo Goアプリで実機テスト

1. スマートフォンに**Expo Go**アプリをインストール
   - iOS: App Store
   - Android: Google Play

2. `npx expo start`でQRコードが表示される

3. Expo GoアプリでQRコードをスキャン

これだけで実機でアプリが動作します。ビルド不要で即座に確認できるのがExpoの最大の利点です。

## 基本的なアプリ構造

### App.tsx（エントリーポイント）

```typescript
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello, Expo!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
```

## React Nativeの基本コンポーネント

### View（コンテナ）

HTMLの`div`に相当します。

```typescript
import { View } from 'react-native';

<View style={{ padding: 20, backgroundColor: '#f0f0f0' }}>
  {/* 子要素 */}
</View>
```

### Text（テキスト）

すべてのテキストは`Text`コンポーネント内に配置する必要があります。

```typescript
import { Text } from 'react-native';

<Text style={{ fontSize: 16, color: '#333' }}>
  こんにちは
</Text>
```

### Button（ボタン）

```typescript
import { Button, Alert } from 'react-native';

<Button
  title="クリック"
  onPress={() => Alert.alert('ボタンが押されました')}
  color="#007AFF"
/>
```

### TextInput（入力フィールド）

```typescript
import { TextInput, useState } from 'react-native';

const [text, setText] = useState('');

<TextInput
  style={{
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
  }}
  value={text}
  onChangeText={setText}
  placeholder="入力してください"
/>
```

### ScrollView（スクロール可能な領域）

```typescript
import { ScrollView, Text } from 'react-native';

<ScrollView>
  {Array.from({ length: 50 }, (_, i) => (
    <Text key={i}>アイテム {i + 1}</Text>
  ))}
</ScrollView>
```

### FlatList（効率的なリスト表示）

大量のデータを効率的に表示します。

```typescript
import { FlatList, Text, View } from 'react-native';

const data = [
  { id: '1', title: 'アイテム 1' },
  { id: '2', title: 'アイテム 2' },
  { id: '3', title: 'アイテム 3' },
];

<FlatList
  data={data}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <View style={{ padding: 16 }}>
      <Text>{item.title}</Text>
    </View>
  )}
/>
```

## ナビゲーション（React Navigation）

画面遷移にはReact Navigationを使用します。

### インストール

```bash
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
```

### 基本的な使い方

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Button } from 'react-native';

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24 }}>ホーム画面</Text>
      <Button
        title="詳細へ"
        onPress={() => navigation.navigate('Details', { itemId: 42 })}
      />
    </View>
  );
}

function DetailsScreen({ route }) {
  const { itemId } = route.params;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>詳細画面</Text>
      <Text>アイテムID: {itemId}</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'ホーム' }} />
        <Stack.Screen name="Details" component={DetailsScreen} options={{ title: '詳細' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Expoの便利な機能

### カメラ

```bash
npx expo install expo-camera
```

```typescript
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Button onPress={requestPermission} title="カメラ権限を許可" />
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef) {
      const photo = await cameraRef.takePictureAsync();
      console.log(photo.uri);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={setCameraRef}>
        <View style={styles.buttonContainer}>
          <Button title="撮影" onPress={takePicture} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  buttonContainer: { position: 'absolute', bottom: 20, alignSelf: 'center' },
});
```

### 位置情報

```bash
npx expo install expo-location
```

```typescript
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export default function LocationScreen() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('権限が拒否されました');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  return (
    <View>
      {location && (
        <>
          <Text>緯度: {location.latitude}</Text>
          <Text>経度: {location.longitude}</Text>
        </>
      )}
    </View>
  );
}
```

### ローカルストレージ（AsyncStorage）

```bash
npx expo install @react-native-async-storage/async-storage
```

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// 保存
await AsyncStorage.setItem('user_name', 'Taro');

// 取得
const name = await AsyncStorage.getItem('user_name');

// 削除
await AsyncStorage.removeItem('user_name');
```

## スタイリング

### StyleSheetによるスタイリング

```typescript
import { StyleSheet, View, Text } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android用の影
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

<View style={styles.container}>
  <View style={styles.card}>
    <Text style={styles.title}>カードタイトル</Text>
  </View>
</View>
```

### NativeWindでTailwind CSS

```bash
npx expo install nativewind tailwindcss
```

これで、Tailwind CSSライクなスタイリングが可能になります。

## ビルドとデプロイ

### EAS Buildでアプリをビルド

```bash
# EAS CLIをインストール
npm install -g eas-cli

# ログイン
eas login

# ビルド設定
eas build:configure

# iOSビルド
eas build --platform ios

# Androidビルド
eas build --platform android
```

### App StoreとGoogle Playへの公開

1. **iOS（App Store）**
   - Apple Developer Program（年間$99）に登録
   - App Store Connectでアプリを登録
   - EASでビルドしたIPAをアップロード

2. **Android（Google Play）**
   - Google Play Developer（$25の一回払い）に登録
   - Play Consoleでアプリを登録
   - EASでビルドしたAAB/APKをアップロード

### Expo Goでのプレビュー公開

```bash
npx expo publish
```

これでExpo Go経由でアプリをシェアできます（開発中のプレビューに最適）。

## まとめ

Expo + React Nativeは、Webエンジニアがモバイルアプリ開発に参入する最速の手段です。

**主要な利点:**
- 一つのコードベースでiOS/Android対応
- React/TypeScriptの知識がそのまま活用可能
- 豊富なネイティブ機能（カメラ、位置情報、通知等）
- ホットリロードで高速な開発体験
- EAS Buildでクラウドビルド

公式ドキュメント: https://docs.expo.dev/

モバイルアプリ開発の敷居は、Expoによって劇的に下がりました。今日からあなたのアイデアをアプリにしましょう。
