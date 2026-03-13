---
title: "React Native + Expo Router：ファイルベースルーティングでモバイルアプリ開発"
description: "Expo Routerを使ったReact Nativeアプリの開発方法を解説。ファイルベースルーティング、ナビゲーション、ディープリンクまで実践的に学びます。TypeScript対応のレイアウト設計やタブナビゲーションの実装パターンも詳しく紹介します。"
pubDate: "2025-02-06"
tags: ["React Native", "Expo", "Mobile", "Router", "TypeScript"]
heroImage: '../../assets/thumbnails/react-native-expo-router.jpg'
---

React Nativeのナビゲーション管理は、従来React Navigationを使った命令的なアプローチが主流でした。しかし、**Expo Router**の登場により、Next.jsのようなファイルベースルーティングがモバイルアプリ開発にもたらされました。本記事では、Expo Routerを使った現代的なReact Nativeアプリ開発を徹底解説します。

## Expo Routerとは

Expo Routerは、ファイルシステムベースのルーティングをReact Nativeに実装するライブラリです。内部的にはReact Navigationを使用していますが、宣言的で直感的なAPIを提供します。

### 主な特徴

- **ファイルベースルーティング**: ファイル構造がそのままルート構造に
- **TypeScript完全サポート**: 型安全なナビゲーション
- **ディープリンク対応**: URLから直接画面へ遷移
- **レイアウトコンポーネント**: 共通UIの再利用
- **ネイティブナビゲーション**: iOS/Androidのネイティブ動作
- **Web対応**: 同じコードでWebアプリも構築可能

### React Navigationとの比較

```typescript
// React Navigation（従来）
const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Expo Router（新しいアプローチ）
// ファイル構造だけでルーティングが完成
// app/index.tsx → "/"
// app/profile.tsx → "/profile"
```

## プロジェクトセットアップ

### 新規プロジェクトの作成

```bash
# Expo Routerテンプレートでプロジェクト作成
npx create-expo-app@latest my-app --template tabs

# または既存プロジェクトに追加
npx create-expo-app@latest my-app
cd my-app
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

### package.jsonの設定

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~50.0.0",
    "expo-router": "~3.4.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.45",
    "typescript": "^5.3.0"
  }
}
```

### app.jsonの設定

```json
{
  "expo": {
    "name": "my-app",
    "slug": "my-app",
    "scheme": "myapp",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

## ファイルベースルーティングの基本

### ディレクトリ構造

```
app/
├── _layout.tsx          # ルートレイアウト
├── index.tsx            # / (ホーム画面)
├── about.tsx            # /about
├── (tabs)/              # タブグループ
│   ├── _layout.tsx
│   ├── home.tsx         # /home
│   └── profile.tsx      # /profile
├── (auth)/              # 認証グループ
│   ├── _layout.tsx
│   ├── login.tsx        # /login
│   └── signup.tsx       # /signup
├── posts/               # 動的ルート
│   ├── [id].tsx         # /posts/:id
│   └── index.tsx        # /posts
└── [...missing].tsx     # 404ページ
```

### 基本的な画面の作成

`app/index.tsx`:

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Expo Router</Text>
      <Link href="/about" style={styles.link}>
        About Page
      </Link>
      <Link href="/posts/1" style={styles.link}>
        Post #1
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  link: {
    fontSize: 18,
    color: '#007AFF',
    marginTop: 10,
  },
});
```

## レイアウトコンポーネント

### ルートレイアウト

`app/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

// スプラッシュスクリーンを表示し続ける
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // 初期化後にスプラッシュスクリーンを隠す
    SplashScreen.hideAsync();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ title: 'Home' }} 
      />
      <Stack.Screen 
        name="about" 
        options={{ title: 'About' }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false }} 
      />
    </Stack>
  );
}
```

### タブナビゲーション

`app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

## ナビゲーション

### プログラマティックナビゲーション

```typescript
import { router, useRouter } from 'expo-router';
import { Button, View } from 'react-native';

export default function NavigationExample() {
  const router = useRouter();

  return (
    <View>
      {/* 基本的な遷移 */}
      <Button 
        title="Go to About" 
        onPress={() => router.push('/about')} 
      />

      {/* パラメータ付き遷移 */}
      <Button 
        title="Go to Post #42" 
        onPress={() => router.push('/posts/42')} 
      />

      {/* オブジェクト形式でのパラメータ渡し */}
      <Button 
        title="Go to User Profile" 
        onPress={() => router.push({
          pathname: '/user/[id]',
          params: { id: '123', from: 'home' }
        })} 
      />

      {/* スタックをリセット（戻れなくする） */}
      <Button 
        title="Login" 
        onPress={() => router.replace('/login')} 
      />

      {/* 戻る */}
      <Button 
        title="Go Back" 
        onPress={() => router.back()} 
      />

      {/* 履歴の確認 */}
      <Button 
        title="Can Go Back?" 
        onPress={() => console.log(router.canGoBack())} 
      />
    </View>
  );
}
```

### Linkコンポーネント

```typescript
import { Link } from 'expo-router';
import { Text } from 'react-native';

export default function LinkExample() {
  return (
    <>
      {/* 基本的なリンク */}
      <Link href="/about">
        <Text>About Page</Text>
      </Link>

      {/* パラメータ付き */}
      <Link href="/posts/42">
        <Text>Post #42</Text>
      </Link>

      {/* オブジェクト形式 */}
      <Link 
        href={{
          pathname: '/user/[id]',
          params: { id: '123' }
        }}
      >
        <Text>User Profile</Text>
      </Link>

      {/* replaceモード（履歴に残さない） */}
      <Link href="/login" replace>
        <Text>Login</Text>
      </Link>

      {/* 外部リンク */}
      <Link href="https://expo.dev" target="_blank">
        <Text>Expo Website</Text>
      </Link>
    </>
  );
}
```

## 動的ルートとパラメータ

### 動的セグメント

`app/posts/[id].tsx`:

```typescript
import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Post #{id}</Text>
      <Text>Content for post {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
```

### キャッチオールルート

`app/blog/[...slug].tsx`:

```typescript
import { useLocalSearchParams } from 'expo-router';
import { View, Text } from 'react-native';

export default function BlogPost() {
  const { slug } = useLocalSearchParams<{ slug: string[] }>();
  
  // /blog/2025/02/my-post → slug = ['2025', '02', 'my-post']
  const [year, month, postSlug] = slug;

  return (
    <View>
      <Text>Year: {year}</Text>
      <Text>Month: {month}</Text>
      <Text>Post: {postSlug}</Text>
    </View>
  );
}
```

### クエリパラメータ

```typescript
import { useLocalSearchParams } from 'expo-router';

export default function SearchResults() {
  const { q, category, sort } = useLocalSearchParams<{
    q: string;
    category?: string;
    sort?: string;
  }>();

  // /search?q=expo&category=tech&sort=recent
  // q = 'expo'
  // category = 'tech'
  // sort = 'recent'

  return (
    <View>
      <Text>Search: {q}</Text>
      <Text>Category: {category || 'All'}</Text>
      <Text>Sort: {sort || 'relevance'}</Text>
    </View>
  );
}
```

## 認証フロー

### 認証状態の管理

`contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        // トークンからユーザー情報を取得
        const user = await fetchUserFromToken(token);
        setUser(user);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { token, user } = await authenticateUser(email, password);
    await SecureStore.setItemAsync('authToken', token);
    setUser(user);
    router.replace('/(tabs)/home');
  }

  async function signOut() {
    await SecureStore.deleteItemAsync('authToken');
    setUser(null);
    router.replace('/login');
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### 認証ガード

`app/_layout.tsx`:

```typescript
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // 未認証なら認証画面へ
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // 認証済みなら保護された画面へ
      router.replace('/(tabs)/home');
    }
  }, [user, segments, isLoading]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
```

## ディープリンクとユニバーサルリンク

### スキーム設定

`app.json`:

```json
{
  "expo": {
    "scheme": "myapp",
    "ios": {
      "bundleIdentifier": "com.mycompany.myapp",
      "associatedDomains": ["applinks:myapp.com"]
    },
    "android": {
      "package": "com.mycompany.myapp",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "myapp.com"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### ディープリンクの処理

```typescript
// myapp://posts/42 → /posts/42
// https://myapp.com/posts/42 → /posts/42

import { useEffect } from 'react';
import * as Linking from 'expo-linking';

export default function PostDetail() {
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { hostname, path, queryParams } = Linking.parse(event.url);
      console.log(`Deep link opened: ${path}`);
      console.log('Query params:', queryParams);
    };

    // 初回起動時のURLを取得
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // アプリ起動中のディープリンクをリッスン
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove();
  }, []);

  return (
    // ...
  );
}
```

### 共有機能

```typescript
import { Share } from 'react-native';
import * as Linking from 'expo-linking';

async function sharePost(postId: string) {
  const url = Linking.createURL(`/posts/${postId}`);
  
  await Share.share({
    message: 'Check out this post!',
    url: url,
  });
}
```

## データフェッチングとローディング状態

### useFocusEffectでのデータ取得

```typescript
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export default function PostsList() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadPosts() {
        setIsLoading(true);
        try {
          const response = await fetch('https://api.example.com/posts');
          const data = await response.json();
          setPosts(data);
        } catch (error) {
          console.error('Failed to load posts:', error);
        } finally {
          setIsLoading(false);
        }
      }

      loadPosts();
    }, [])
  );

  if (isLoading) {
    return <ActivityIndicator />;
  }

  return (
    <View>
      {posts.map((post) => (
        <Text key={post.id}>{post.title}</Text>
      ))}
    </View>
  );
}
```

### React Queryとの連携

```typescript
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { View, Text } from 'react-native';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PostsList />
    </QueryClientProvider>
  );
}

function PostsList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await fetch('https://api.example.com/posts');
      return response.json();
    },
  });

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <View>
      {data.map((post) => (
        <Text key={post.id}>{post.title}</Text>
      ))}
    </View>
  );
}
```

## モーダルとボトムシート

### モーダル画面

`app/modals/create-post.tsx`:

```typescript
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';

export default function CreatePostModal() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  async function handleSubmit() {
    await createPost({ title, content });
    router.back(); // モーダルを閉じる
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Post</Text>
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Content"
        value={content}
        onChangeText={setContent}
        multiline
      />
      <Button title="Create" onPress={handleSubmit} />
      <Button title="Cancel" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
});
```

レイアウトでモーダルを定義:

```typescript
// app/_layout.tsx
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen 
    name="modals/create-post" 
    options={{ 
      presentation: 'modal',
      title: 'New Post'
    }} 
  />
</Stack>
```

## Web対応とSEO

### メタタグの設定

```typescript
import { Stack } from 'expo-router';

export default function BlogPostLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Blog Post',
          // Webでのメタタグ
          headerTitle: 'My Blog Post',
        }}
      />
    </Stack>
  );
}
```

### ヘッドコンポーネント

```typescript
import { Stack } from 'expo-router';

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const post = usePost(id);

  return (
    <>
      <Stack.Screen
        options={{
          title: post.title,
        }}
      />
      <View>
        <Text>{post.content}</Text>
      </View>
    </>
  );
}
```

## まとめ

Expo Routerは、React Nativeアプリ開発に以下のメリットをもたらします：

1. **開発速度の向上**: ファイルベースルーティングによる直感的な構造
2. **型安全性**: TypeScriptとの完全な統合
3. **ディープリンク対応**: URLベースのナビゲーション
4. **Web互換性**: 同じコードでWebアプリも構築可能
5. **メンテナンス性**: 明確なディレクトリ構造とレイアウトの再利用

Next.jsの経験があれば、学習コストは最小限です。モバイルアプリ開発の新しいスタンダードとして、Expo Routerの採用を検討してみてください。

## 参考リンク

- [Expo Router公式ドキュメント](https://docs.expo.dev/router/introduction/)
- [Expo Router GitHub](https://github.com/expo/router)
- [React Navigation](https://reactnavigation.org/)
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
