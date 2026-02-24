---
title: 'React Native + Expo完全ガイド — TypeScript・Navigation・状態管理・ネイティブAPI'
description: 'React Native + ExpoでiOS/Androidアプリを開発する完全ガイド。Expo Router・TypeScript・React Navigation・Zustand・Expo SDK（Camera/Location/Notifications）・OTA更新・App Store公開まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['React Native', 'Expo', 'TypeScript', 'モバイル', 'iOS/Android']
---

# React Native + Expo完全ガイド — TypeScript・Navigation・状態管理・ネイティブAPI

React NativeとExpoの組み合わせは、JavaScriptエンジニアがiOS/Androidアプリを開発するための最強の選択肢のひとつだ。Web開発の知識をそのまま活かしながら、真のネイティブパフォーマンスと豊富なプラットフォームAPIにアクセスできる。本記事では、プロジェクト作成から本番公開まで、実務で通用するレベルの実装を一気通貫で解説する。

---

## 1. React Native + Expoとは — Flutter・Swift・Kotlinとの比較

### React Nativeの仕組み

React Nativeは、JavaScriptで書いたコードをネイティブのUIコンポーネントにレンダリングするフレームワークだ。WebViewを使ったハイブリッドアプリとは根本的に異なり、`UIView`（iOS）や`android.view.View`（Android）といった本物のネイティブコンポーネントが動く。

新アーキテクチャ（Fabric + JSI）では、JavaScriptとネイティブ間の通信がブリッジを経由せずに直接呼び出せるようになり、パフォーマンスが大幅に向上した。

### Expoとは

Expoは、React Nativeの開発体験を劇的に改善するプラットフォームだ。

- **Expo SDK**: Camera・Location・Notificationsなど50以上のAPIをすぐに使える
- **Expo Router**: ファイルベースのルーティング（Next.jsライク）
- **EAS (Expo Application Services)**: クラウドビルド・OTA更新・App Store提出
- **Expo Go**: 実機でのクイックプレビュー（開発中はビルド不要）

### 他フレームワークとの比較

| 観点 | React Native + Expo | Flutter | Swift (iOS) | Kotlin (Android) |
|------|--------------------|---------|-----------|--------------------|
| 言語 | TypeScript/JavaScript | Dart | Swift | Kotlin |
| Web知識の流用 | 高い | 低い | なし | なし |
| UI描画 | ネイティブコンポーネント | 独自レンダラ | ネイティブ | ネイティブ |
| コード共有率 | ~90% | ~95% | 0% | 0% |
| エコシステム | npm (巨大) | pub.dev | CocoaPods | Maven |
| OTA更新 | Expo Updatesで可能 | shorebird等 | 不可 | 不可 |
| 学習コスト(Web経験者) | 低い | 中程度 | 高い | 高い |

Webエンジニアが最速でマルチプラットフォームアプリを出荷するなら、React Native + Expoは現時点で最善の選択肢だ。

---

## 2. Expoセットアップ — create-expo-app・TypeScript

### 必要環境

```bash
# Node.js 18以上を確認
node --version

# Expo CLIをインストール
npm install -g expo-cli eas-cli
```

### プロジェクト作成

```bash
# TypeScriptテンプレートで作成
npx create-expo-app@latest MyApp --template

# テンプレート選択: "Blank (TypeScript)" を選択
cd MyApp
```

生成されるプロジェクト構造（Expo Router使用時）:

```
MyApp/
├── app/                    # ルート定義（Expo Router）
│   ├── _layout.tsx         # ルートレイアウト
│   ├── index.tsx           # ホーム画面 (/)
│   └── (tabs)/             # タブグループ
│       ├── _layout.tsx
│       ├── index.tsx
│       └── explore.tsx
├── components/             # 共通コンポーネント
├── constants/              # 定数（Colors等）
├── hooks/                  # カスタムフック
├── assets/                 # 画像・フォント
├── app.json                # Expoアプリ設定
├── tsconfig.json
└── package.json
```

### TypeScript設定

`tsconfig.json`はExpoが自動生成する。パスエイリアスを追加すると便利だ。

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@components/*": ["./components/*"],
      "@hooks/*": ["./hooks/*"],
      "@store/*": ["./store/*"]
    }
  }
}
```

### 開発サーバー起動

```bash
npx expo start
```

ターミナルにQRコードが表示される。iOS/AndroidのExpo Goアプリで読み取るだけで実機確認できる。シミュレータを使う場合は`i`（iOS）または`a`（Android）キーを押す。

---

## 3. Expo Routerファイルベースルーティング

Expo Routerは、Next.js App Routerと同じ思想でモバイルナビゲーションを実現する。`app/`ディレクトリのファイル構造がそのままURLとルートになる。

### 基本的なルート定義

```tsx
// app/_layout.tsx — ルートレイアウト
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'ホーム' }} />
        <Stack.Screen name="profile/[id]" options={{ title: 'プロフィール' }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: '設定' }}
        />
      </Stack>
    </>
  );
}
```

```tsx
// app/index.tsx — ホーム画面
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ホーム画面</Text>
      <Pressable
        style={styles.button}
        onPress={() => router.push('/profile/123')}
      >
        <Text style={styles.buttonText}>プロフィールへ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
```

### 動的ルート

```tsx
// app/profile/[id].tsx
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';

type ProfileParams = {
  id: string;
};

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<ProfileParams>();

  return (
    <>
      <Stack.Screen options={{ title: `ユーザー #${id}` }} />
      <View style={styles.container}>
        <Text style={styles.text}>ユーザーID: {id}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  text: { fontSize: 18 },
});
```

### タブナビゲーション

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '探索',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### 認証フロー（Protected Routes）

```tsx
// app/_layout.tsx — 認証状態に応じたリダイレクト
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@store/auth';

export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Stack>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/[id]" />
      </Stack.Protected>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/register" />
    </Stack>
  );
}
```

---

## 4. スタイリング — StyleSheet・NativeWind

### StyleSheet API

React NativeはCSSではなくJavaScriptオブジェクトでスタイルを定義する。`StyleSheet.create()`を使うとパフォーマンス最適化とIDEサポートが得られる。

```tsx
import { View, Text, StyleSheet, Platform } from 'react-native';

export function Card({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    // プラットフォーム別シャドウ
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});
```

### NativeWind（Tailwind CSS for React Native）

NativeWindを使うとTailwindのクラス名でスタイリングできる。

```bash
npx expo install nativewind tailwindcss
npx tailwindcss init
```

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        secondary: '#5856D6',
      },
    },
  },
};
```

```tsx
// NativeWindを使ったコンポーネント
import { View, Text, Pressable } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

export function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <StyledPressable
      className="bg-primary rounded-xl py-3 px-6 items-center active:opacity-80"
      onPress={onPress}
    >
      <StyledText className="text-white font-semibold text-base">
        {label}
      </StyledText>
    </StyledPressable>
  );
}
```

---

## 5. Expo SDK — Camera・Location・Notifications・FileSystem

### expo-camera — カメラ機能

```bash
npx expo install expo-camera
```

```tsx
import { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

export function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text>カメラへのアクセス許可が必要です</Text>
        <Pressable onPress={requestPermission}>
          <Text>許可する</Text>
        </Pressable>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
    });
    console.log('撮影した写真:', photo?.uri);
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        <View style={styles.controls}>
          <Pressable
            style={styles.flipButton}
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
          >
            <Text style={styles.controlText}>反転</Text>
          </Pressable>
          <Pressable style={styles.shutterButton} onPress={takePicture} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  controls: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  controlText: { color: '#fff', fontWeight: '600' },
});
```

### expo-location — 位置情報

```bash
npx expo install expo-location
```

```tsx
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export function useCurrentLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('位置情報へのアクセス許可が必要です');
        setLoading(false);
        return;
      }

      // リアルタイム位置追跡
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
          });
          setLoading(false);
        }
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  return { location, error, loading };
}
```

### expo-file-system — ファイル操作

```bash
npx expo install expo-file-system
```

```tsx
import * as FileSystem from 'expo-file-system';

// ファイルのダウンロードと保存
export async function downloadAndSaveFile(url: string, filename: string) {
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  const downloadResult = await FileSystem.downloadAsync(url, fileUri);

  if (downloadResult.status !== 200) {
    throw new Error('ダウンロード失敗');
  }

  return downloadResult.uri;
}

// ファイルの読み書き
export async function readJsonFile<T>(filename: string): Promise<T | null> {
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) return null;

  const content = await FileSystem.readAsStringAsync(fileUri);
  return JSON.parse(content) as T;
}

export async function writeJsonFile(filename: string, data: unknown): Promise<void> {
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
}
```

---

## 6. 状態管理 — Zustand・AsyncStorage永続化

### Zustandセットアップ

```bash
npm install zustand
npx expo install @react-native-async-storage/async-storage
```

### ストア定義（TypeScript完全対応）

```typescript
// store/auth.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
};

type AuthActions = {
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (!currentUser) return;
        set({ user: { ...currentUser, ...updates } });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // tokenはセキュアストレージに移すべきだが、ここではシンプルに
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### カートストア（複雑な状態管理例）

```typescript
// store/cart.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

type CartState = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
};

type CartActions = {
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

const computeTotals = (items: CartItem[]) => ({
  totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
  totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
});

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,

      addItem: (newItem) => {
        const items = get().items;
        const existing = items.find((i) => i.id === newItem.id);

        let updatedItems: CartItem[];
        if (existing) {
          updatedItems = items.map((i) =>
            i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        } else {
          updatedItems = [...items, { ...newItem, quantity: 1 }];
        }

        set({ items: updatedItems, ...computeTotals(updatedItems) });
      },

      removeItem: (id) => {
        const updatedItems = get().items.filter((i) => i.id !== id);
        set({ items: updatedItems, ...computeTotals(updatedItems) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        const updatedItems = get().items.map((i) =>
          i.id === id ? { ...i, quantity } : i
        );
        set({ items: updatedItems, ...computeTotals(updatedItems) });
      },

      clearCart: () => set({ items: [], totalItems: 0, totalPrice: 0 }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## 7. ネットワーク通信 — fetch・React Query・tRPC

### React Queryセットアップ

```bash
npm install @tanstack/react-query
```

```tsx
// app/_layout.tsx にQueryClientProviderを追加
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1分
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        {/* ... */}
      </Stack>
    </QueryClientProvider>
  );
}
```

### APIクライアントとフック

```typescript
// lib/api.ts
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options?: RequestInit,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'GET' }, token),
  post: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }, token),
  put: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }, token),
  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'DELETE' }, token),
};
```

```typescript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@store/auth';

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
};

export function useProducts(categoryId?: string) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ['products', categoryId],
    queryFn: () =>
      api.get<Product[]>(
        categoryId ? `/products?category=${categoryId}` : '/products',
        token ?? undefined
      ),
    enabled: true,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (data: Omit<Product, 'id'>) =>
      api.post<Product>('/products', data, token ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

---

## 8. 認証 — Expo Auth Session・Google OAuth・Apple Sign-In

```bash
npx expo install expo-auth-session expo-crypto expo-web-browser
```

### Google OAuth実装

```typescript
// hooks/useGoogleAuth.ts
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { useAuthStore } from '@store/auth';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const login = useAuthStore((s) => s.login);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        fetchGoogleUser(authentication.accessToken);
      }
    }
  }, [response]);

  const fetchGoogleUser = async (accessToken: string) => {
    const userInfo = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json());

    // サーバーでトークン検証 & JWTを取得
    const { token } = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    }).then((r) => r.json());

    login(
      {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        avatarUrl: userInfo.picture,
      },
      token
    );
  };

  return {
    signInWithGoogle: () => promptAsync(),
    isReady: !!request,
  };
}
```

### Apple Sign-In

```bash
npx expo install expo-apple-authentication
```

```tsx
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, View } from 'react-native';
import { useAuthStore } from '@store/auth';

export function AppleSignInButton() {
  const login = useAuthStore((s) => s.login);

  if (Platform.OS !== 'ios') return null;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={12}
      style={{ width: '100%', height: 50 }}
      onPress={async () => {
        try {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });

          // identityTokenをサーバーで検証
          const { token, user } = await fetch('/api/auth/apple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identityToken: credential.identityToken,
              fullName: credential.fullName,
            }),
          }).then((r) => r.json());

          login(user, token);
        } catch (error) {
          if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
            console.error('Apple Sign-In失敗:', error);
          }
        }
      }}
    />
  );
}
```

---

## 9. プッシュ通知 — Expo Notifications・FCM

```bash
npx expo install expo-notifications expo-device
```

### プッシュトークン取得と通知受信

```typescript
// lib/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// フォアグラウンド通知の表示設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('実機でのみプッシュ通知を使用できます');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('プッシュ通知の許可が拒否されました');
    return null;
  }

  // Androidチャンネル設定
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '通知',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  return token.data;
}

// ローカル通知のスケジュール
export async function scheduleLocalNotification(
  title: string,
  body: string,
  delaySeconds: number
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
    },
  });
}
```

```tsx
// hooks/usePushNotifications.ts
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '@/lib/notifications';
import { useAuthStore } from '@store/auth';
import { api } from '@/lib/api';

export function usePushNotifications() {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    // トークン取得 & サーバーに登録
    registerForPushNotifications().then(async (token) => {
      if (token) {
        setPushToken(token);
        // バックエンドにプッシュトークンを登録
        await api.post('/users/push-token', { token }, token ?? undefined);
      }
    });

    // 通知受信ハンドラ（フォアグラウンド）
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('通知受信:', notification.request.content);
      });

    // 通知タップハンドラ
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        // ディープリンクや画面遷移の処理
        console.log('通知がタップされました:', data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { pushToken };
}
```

---

## 10. ネイティブモジュール — expo-modules-core

Expoが提供しないネイティブ機能が必要な場合、`expo-modules-core`を使ってカスタムネイティブモジュールを作成できる。

```bash
npx create-expo-module my-custom-module
```

TypeScript側のインターフェース定義:

```typescript
// modules/my-custom-module/src/index.ts
import MyCustomModuleModule from './MyCustomModuleModule';

export type SensorData = {
  timestamp: number;
  value: number;
  unit: string;
};

// ネイティブモジュールのメソッドをexport
export async function readSensorData(): Promise<SensorData> {
  return MyCustomModuleModule.readSensorData();
}

export function startMonitoring(callback: (data: SensorData) => void): () => void {
  const subscription = MyCustomModuleModule.addListener('onSensorData', callback);
  return () => subscription.remove();
}
```

既存のReact Nativeサードパーティライブラリも多くはExpo Managed Workflowで動く。`expo-modules-core`との統合が確認されているライブラリは`npx expo install`経由でインストールすると依存関係が自動調整される。

---

## 11. EAS Build — iOS/Android本番ビルド・証明書管理

EAS (Expo Application Services) Buildは、クラウド上でiOS/Androidの本番バイナリを生成するサービスだ。

### EASセットアップ

```bash
npm install -g eas-cli
eas login
eas build:configure
```

`eas.json`が生成される:

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.example.com"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@apple.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### ビルド実行

```bash
# iOS本番ビルド（.ipaを生成）
eas build --platform ios --profile production

# Android本番ビルド（.aabを生成）
eas build --platform android --profile production

# 両プラットフォーム同時ビルド
eas build --platform all --profile production
```

### 証明書管理

EASは証明書を自動管理する（推奨）。初回ビルド時に対話的に設定される。

```bash
# iOS証明書の確認・管理
eas credentials --platform ios

# Android keystoreの管理
eas credentials --platform android
```

### 環境変数の管理

```bash
# EAS Secretsに機密情報を登録（ビルド時に注入される）
eas secret:create --scope project --name SENTRY_DSN --value "https://xxx@sentry.io/xxx"
eas secret:create --scope project --name API_KEY --value "your-secret-api-key"

# 登録済みシークレットの確認
eas secret:list
```

---

## 12. OTA更新 — Expo Updates

OTA（Over-The-Air）更新により、App Storeのレビューを経ずにJavaScriptバンドルとアセットを更新できる。ネイティブコードの変更は不可能だが、UIやロジックの修正は即座にユーザーに届く。

```bash
npx expo install expo-updates
```

### app.json設定

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/your-project-id"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### 手動更新チェックの実装

```tsx
// hooks/useAppUpdate.ts
import { useState, useEffect } from 'react';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export function useAppUpdate() {
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdate = async () => {
    if (__DEV__) return; // 開発環境ではスキップ

    setIsChecking(true);
    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        Alert.alert(
          'アップデートあり',
          'アプリの新しいバージョンが利用可能です。今すぐ更新しますか？',
          [
            { text: 'あとで', style: 'cancel' },
            {
              text: '更新する',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('更新チェック失敗:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return { checkForUpdate, isChecking };
}
```

### OTA更新のデプロイ

```bash
# EAS Updateで公開（production チャンネルへ）
eas update --channel production --message "バグ修正: ログイン画面のクラッシュを修正"

# 特定ブランチへの更新
eas update --branch feature/new-ui --message "新UIのプレビュー"
```

---

## 13. App Store / Google Play公開手順

### App Store（iOS）

**事前準備:**
1. Apple Developer Program加入（$99/年）
2. App Store Connect でアプリ登録
3. バンドルID設定（`app.json`の`ios.bundleIdentifier`）

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "プロフィール写真の撮影に使用します",
        "NSLocationWhenInUseUsageDescription": "近くの店舗を表示するために使用します",
        "NSPhotoLibraryUsageDescription": "写真の選択に使用します"
      }
    }
  }
}
```

**EAS Submit でApp Storeに提出:**

```bash
# ビルド後に自動提出
eas submit --platform ios --profile production

# 既存ビルドを指定して提出
eas submit --platform ios --latest
```

**App Store Connect での審査提出:**
1. `TestFlight`でベータテスト（推奨）
2. プロモーション用スクリーンショット（iPhone 6.7", iPad等）
3. プライバシーポリシーURL
4. 年齢レーティング設定
5. 審査に提出（通常1〜3日）

### Google Play（Android）

**事前準備:**
1. Google Play Developer Console登録（$25一回）
2. アプリのパッケージ名設定（`app.json`の`android.package`）

```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.yourapp",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "RECEIVE_BOOT_COMPLETED"
      ],
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

**EAS Submit でPlay Storeに提出:**

```bash
eas submit --platform android --profile production
```

**Play Console での公開手順:**
1. 内部テスト → クローズドテスト → オープンテストの段階リリース
2. ストアの掲載情報（スクリーンショット・説明文・フィーチャーグラフィック）
3. コンテンツレーティング設定
4. 審査提出（通常数時間〜2日）

### スクリーンショット自動生成

```bash
# react-native-screenshotとAppium使用（省略）
# または手動でシミュレータのスクリーンショットを撮影
xcrun simctl io booted screenshot screenshot.png
```

---

## 実践的なTips

### パフォーマンス最適化

```tsx
import { memo, useCallback } from 'react';
import { FlatList, View, Text } from 'react-native';

// FlashListを使うとFlatListより大幅に高速
import { FlashList } from '@shopify/flash-list';

type Product = { id: string; name: string; price: number };

const ProductItem = memo(({ item }: { item: Product }) => (
  <View>
    <Text>{item.name}</Text>
    <Text>¥{item.price.toLocaleString()}</Text>
  </View>
));
ProductItem.displayName = 'ProductItem';

export function ProductList({ products }: { products: Product[] }) {
  const renderItem = useCallback(
    ({ item }: { item: Product }) => <ProductItem item={item} />,
    []
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  return (
    <FlashList
      data={products}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={80}
    />
  );
}
```

### エラーバウンダリ

```tsx
// components/ErrorBoundary.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Sentryや独自ログサービスに送信
    console.error('未処理のエラー:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>エラーが発生しました</Text>
          <Pressable onPress={() => this.setState({ hasError: false, error: null })}>
            <Text>再試行</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
```

### Expo開発ビルド（Development Client）

Expo Goで動かないサードパーティライブラリを使う場合、カスタムDevClientをビルドする。

```bash
# Development Clientをビルド（一回だけ）
eas build --profile development --platform ios

# 以後はDevClient + Expo Dev Serverで開発
npx expo start --dev-client
```

---

## DevToolBoxでReact Native開発を加速する

React Nativeアプリ開発で欠かせないのがAPIデバッグだ。バックエンドのレスポンスJSONが意図した構造になっているか確認したいとき、[DevToolBox](https://usedevtools.com/)のJSON Validatorが役立つ。

`fetch`でAPIを叩く前にスキーマ検証を行ったり、複雑なネストされたJSONを整形して確認したりする作業が、ブラウザなしでサクッとできる。型定義（TypeScript interface）をゼロから書くとき、実際のAPIレスポンスをDevToolBoxに貼り付けてフォーマットしてから型推論するワークフローも効果的だ。

モバイルアプリ特有のデバッグ（ネットワーク通信のインターセプト・JSONの差分比較）でも活用できる。

---

## まとめ

React Native + Expoのスタックは2026年現在、モバイルアプリ開発の実用的な最前線だ。本記事で解説した内容をまとめると:

| レイヤー | 採用技術 |
|---------|---------|
| フレームワーク | React Native + Expo SDK |
| ルーティング | Expo Router（ファイルベース） |
| 言語 | TypeScript（strict mode） |
| スタイリング | StyleSheet + NativeWind |
| 状態管理 | Zustand + AsyncStorage |
| データフェッチ | React Query + fetch |
| 認証 | Expo Auth Session（Google/Apple） |
| 通知 | Expo Notifications |
| ビルド | EAS Build |
| OTA更新 | Expo Updates |

Webエンジニアなら既存の知識の8割がそのまま使える。残り2割（StyleSheet・ネイティブAPI・証明書管理）さえ押さえれば、ひとりでiOS/Androidアプリを本番リリースできる時代だ。まずは`create-expo-app`でプロジェクトを作り、Expo Goで実機確認するところから始めよう。

