---
title: 'Flutter完全ガイド2026：クロスプラットフォームモバイルアプリ開発'
description: 'Flutterの基本から応用まで完全解説。Widget・Riverpod・Bloc・Flutter Hooks・Firebase連携・REST API・アニメーション・テスト・App Store公開まで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

Flutterは2018年にGoogleが正式リリースしたクロスプラットフォームUIフレームワークだ。一つのコードベースからiOS・Android・Web・Desktop（Windows/macOS/Linux）向けのアプリを生成できる。2026年現在、モバイルアプリ開発の主流として広く採用されており、世界中の開発者が利用している。

本記事では、Flutter入門から実際のApp Store/Play Store公開まで、実践的なコード例を交えながら体系的に解説する。

---

## 目次

1. Flutterとは・React Nativeとの比較
2. 開発環境のセットアップ
3. Widget基礎
4. レイアウトシステム
5. ナビゲーション（go_router）
6. 状態管理（Riverpod・Bloc）
7. HTTPリクエスト・API連携
8. Firebase連携
9. ローカルストレージ
10. アニメーション
11. カメラ・位置情報・プッシュ通知
12. テスト
13. CI/CD
14. App Store/Play Store公開

---

## 1. Flutterとは・React Nativeとの比較

### Flutterの概要

FlutterはDartというプログラミング言語を使用する。DartはGoogleが開発した静的型付け言語で、JavaScriptやJavaに近い構文を持つ。FlutterはネイティブのUIコンポーネントをブリッジ経由で呼び出すのではなく、自前のレンダリングエンジン（Skia、現在はImpeller）を使ってUIを描画する。この設計思想が、Flutterの高いパフォーマンスと一貫したUI表現を実現している。

Flutterの主な特徴は以下の通りだ。

- **クロスプラットフォーム対応**: iOS・Android・Web・Windows・macOS・Linuxを単一コードベースでカバー
- **ホットリロード**: コード変更を保存すると瞬時にシミュレーターへ反映
- **自前レンダリング**: ネイティブUIコンポーネントに依存しないため、全プラットフォームで同一の見た目を実現
- **Widget中心の設計**: UIのすべてをWidgetとして表現する宣言的UIアーキテクチャ
- **豊富なパッケージ**: pub.devに12万件以上のパッケージが登録されている

### React Nativeとの比較

React NativeはMetaが開発したJavaScriptベースのクロスプラットフォームフレームワークだ。FlutterとReact Nativeはどちらも主要な選択肢だが、設計思想が大きく異なる。

| 項目 | Flutter | React Native |
|------|---------|--------------|
| 言語 | Dart | JavaScript / TypeScript |
| レンダリング | 自前エンジン（Impeller） | ネイティブコンポーネント |
| パフォーマンス | 非常に高い（60/120fps安定） | 高い（JSブリッジがボトルネックになる場合あり） |
| UIの一貫性 | 全プラットフォームで完全一致 | プラットフォームごとに若干異なる |
| 学習曲線 | Dart習得が必要 | React経験者はすぐ習得可能 |
| エコシステム | pub.dev（急成長中） | npm（成熟している） |
| 採用企業 | Google Pay・BMW・eBay | Meta・Shopify・Microsoft |
| Web対応 | 対応済み（Flutter Web） | 対応済み（React Native Web） |

**どちらを選ぶべきか**

- UIの完全な制御とパフォーマンスを重視するならFlutter
- 既存のReact/JavaScript資産を活用したいならReact Native
- Google系サービスとの連携を重視するならFlutter
- 大規模なJSエコシステムを活用したいならReact Native

2026年現在、FlutterはGoogle・BMW・eBay・Alibaba・ByteDanceなど多くの企業で採用されており、GitHubのスター数もReact Nativeを大きく上回っている。新規プロジェクトであれば、Flutterを強く推奨する。

---

## 2. 開発環境のセットアップ

### Flutter SDKのインストール（macOS）

まずFlutter SDKをダウンロードする。公式サイト（flutter.dev）から最新版を取得するか、FVMを使ってバージョン管理することを推奨する。

```bash
# FVM（Flutter Version Manager）を使う場合
brew tap leoafarias/fvm
brew install fvm

# 最新のstable版をインストール
fvm install stable
fvm global stable

# パスの設定（.zshrcまたは.bashrcに追加）
export PATH="$PATH:$HOME/fvm/default/bin"

# インストール確認
flutter --version
```

FVMを使わずに直接インストールする場合は以下の手順を取る。

```bash
# Flutter SDKのダウンロードと配置
cd ~/development
git clone https://github.com/flutter/flutter.git -b stable

# パスの設定
export PATH="$PATH:$HOME/development/flutter/bin"

# 環境診断
flutter doctor
```

`flutter doctor`の出力を確認し、すべての項目にチェックが入るまで対応する。

### Android Studioのセットアップ

Android Studioをダウンロードしてインストールした後、以下の設定を行う。

```bash
# Android SDKコマンドラインツールのパスを設定
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# ライセンスへの同意
flutter doctor --android-licenses
```

Android Studioで仮想デバイス（AVD）を作成する。

1. Android Studio を起動
2. Virtual Device Manager を開く
3. 「Create Device」をクリック
4. Pixel 8 Proなどのデバイスを選択
5. API Level 35（Android 15）のシステムイメージをダウンロード
6. AVDを作成して起動

### Xcodeのセットアップ（iOS開発）

macOSでのiOS開発にはXcodeが必要だ。

```bash
# App StoreからXcodeをインストール後
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch

# CocoaPodsのインストール
sudo gem install cocoapods
# または（Apple Silicon Macの場合）
brew install cocoapods

# iOSシミュレーターの確認
open -a Simulator
```

### 最初のFlutterプロジェクト作成

```bash
# 新規プロジェクトの作成
flutter create my_first_app

# プロジェクトディレクトリに移動
cd my_first_app

# アプリを起動（デバイスまたはシミュレーターが起動している必要がある）
flutter run

# 特定のデバイスで起動
flutter run -d "iPhone 15 Pro"
flutter run -d emulator-5554
```

### プロジェクト構造

Flutterプロジェクトの基本的なディレクトリ構造は以下の通りだ。

```
my_first_app/
├── android/          # Android固有のコード・設定
├── ios/              # iOS固有のコード・設定
├── lib/              # Dartソースコード（メイン）
│   └── main.dart     # エントリーポイント
├── test/             # テストコード
├── web/              # Web固有のコード（Flutter Web）
├── windows/          # Windows固有のコード
├── macos/            # macOS固有のコード
├── linux/            # Linux固有のコード
├── pubspec.yaml      # 依存関係・アセット設定
└── analysis_options.yaml  # 静的解析設定
```

### pubspec.yamlの基本設定

```yaml
name: my_first_app
description: "My first Flutter application"
publish_to: 'none'

version: 1.0.0+1

environment:
  sdk: '>=3.3.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # UI関連
  cupertino_icons: ^1.0.8
  google_fonts: ^6.2.1

  # 状態管理
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5

  # ナビゲーション
  go_router: ^14.2.0

  # HTTP通信
  dio: ^5.6.0

  # Firebase
  firebase_core: ^3.3.0
  firebase_auth: ^5.1.4
  cloud_firestore: ^5.2.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  build_runner: ^2.4.12
  riverpod_generator: ^2.4.3

flutter:
  uses-material-design: true
  assets:
    - assets/images/
    - assets/icons/
  fonts:
    - family: Roboto
      fonts:
        - asset: fonts/Roboto-Regular.ttf
        - asset: fonts/Roboto-Bold.ttf
          weight: 700
```

---

## 3. Widget基礎

### Widgetとは

Flutterでは、UIを構成するすべての要素がWidgetだ。テキスト・ボタン・レイアウト・アニメーション・ジェスチャー検出まで、あらゆるものがWidgetとして表現される。Widgetはイミュータブル（不変）なオブジェクトであり、状態が変化するとWidgetツリー全体が再構築される。

### StatelessWidget

状態を持たないWidgetだ。表示するデータが外部から与えられ、変化しない場合に使用する。

```dart
import 'package:flutter/material.dart';

// シンプルなStatelessWidgetの例
class UserCard extends StatelessWidget {
  final String name;
  final String email;
  final String avatarUrl;

  const UserCard({
    super.key,
    required this.name,
    required this.email,
    required this.avatarUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 32,
              backgroundImage: NetworkImage(avatarUrl),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    email,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

### StatefulWidget

状態を持つWidgetだ。ユーザーの操作やデータの変化に応じてUIを更新する必要がある場合に使用する。

```dart
import 'package:flutter/material.dart';

// カウンターアプリの例（StatefulWidget）
class CounterWidget extends StatefulWidget {
  const CounterWidget({super.key});

  @override
  State<CounterWidget> createState() => _CounterWidgetState();
}

class _CounterWidgetState extends State<CounterWidget> {
  int _count = 0;
  bool _isLoading = false;

  void _increment() {
    setState(() {
      _count++;
    });
  }

  void _decrement() {
    if (_count > 0) {
      setState(() {
        _count--;
      });
    }
  }

  Future<void> _reset() async {
    setState(() {
      _isLoading = true;
    });

    // 非同期処理のシミュレーション
    await Future.delayed(const Duration(seconds: 1));

    setState(() {
      _count = 0;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('カウンター'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'カウント:',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            Text(
              '$_count',
              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: _count > 10 ? Colors.red : Colors.blue,
                  ),
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FloatingActionButton(
                  onPressed: _decrement,
                  child: const Icon(Icons.remove),
                ),
                const SizedBox(width: 24),
                FloatingActionButton(
                  onPressed: _increment,
                  child: const Icon(Icons.add),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _isLoading
                ? const CircularProgressIndicator()
                : TextButton(
                    onPressed: _reset,
                    child: const Text('リセット'),
                  ),
          ],
        ),
      ),
    );
  }
}
```

### WidgetツリーとBuildContext

FlutterのWidgetは木構造（ツリー）を形成する。`BuildContext`はWidgetがツリー内のどこにあるかを示すオブジェクトで、テーマやローカライゼーションなどの情報にアクセスするために使われる。

```dart
import 'package:flutter/material.dart';

// BuildContextの活用例
class ThemeAwareWidget extends StatelessWidget {
  const ThemeAwareWidget({super.key});

  @override
  Widget build(BuildContext context) {
    // テーマ情報へのアクセス
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    // MediaQueryで画面サイズを取得
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth > 600;

    // SafeAreaでノッチ・ホームバーを避ける
    return SafeArea(
      child: Container(
        color: colorScheme.surface,
        padding: EdgeInsets.symmetric(
          horizontal: isTablet ? 32 : 16,
          vertical: 24,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ヘッドライン',
              style: textTheme.headlineMedium?.copyWith(
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'ボディテキスト',
              style: textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

### よく使われる基本Widget

```dart
import 'package:flutter/material.dart';

class BasicWidgetsDemo extends StatelessWidget {
  const BasicWidgetsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('基本Widget一覧')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // テキスト
            const Text(
              'シンプルなテキスト',
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 8),
            // リッチテキスト
            const Text.rich(
              TextSpan(
                text: '通常テキスト ',
                children: [
                  TextSpan(
                    text: '太字テキスト',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  TextSpan(
                    text: ' 色付きテキスト',
                    style: TextStyle(color: Colors.blue),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ボタン各種
            ElevatedButton(
              onPressed: () {},
              child: const Text('ElevatedButton'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () {},
              child: const Text('OutlinedButton'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () {},
              child: const Text('TextButton'),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () {},
              child: const Text('FilledButton（Material 3）'),
            ),
            const SizedBox(height: 16),

            // 入力フィールド
            const TextField(
              decoration: InputDecoration(
                labelText: 'メールアドレス',
                hintText: 'example@email.com',
                prefixIcon: Icon(Icons.email),
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 8),
            const TextField(
              decoration: InputDecoration(
                labelText: 'パスワード',
                prefixIcon: Icon(Icons.lock),
                suffixIcon: Icon(Icons.visibility),
                border: OutlineInputBorder(),
              ),
              obscureText: true,
            ),
            const SizedBox(height: 16),

            // 画像
            Image.network(
              'https://picsum.photos/200/100',
              width: double.infinity,
              height: 100,
              fit: BoxFit.cover,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) return child;
                return const Center(child: CircularProgressIndicator());
              },
              errorBuilder: (context, error, stackTrace) {
                return const Icon(Icons.error, color: Colors.red);
              },
            ),
            const SizedBox(height: 16),

            // リストタイル
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person)),
              title: const Text('田中太郎'),
              subtitle: const Text('エンジニア'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {},
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.settings),
              title: const Text('設定'),
              onTap: () {},
            ),

            const SizedBox(height: 16),

            // チップ
            Wrap(
              spacing: 8,
              children: [
                const Chip(label: Text('Flutter')),
                const Chip(label: Text('Dart')),
                ActionChip(
                  label: const Text('クリック可能'),
                  onPressed: () {},
                ),
                FilterChip(
                  label: const Text('フィルター'),
                  selected: true,
                  onSelected: (bool selected) {},
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 4. レイアウトシステム

### Column・Row

FlutterのレイアウトはColumnとRowを組み合わせることで構築する。CSSのFlexboxに近い概念だ。

```dart
import 'package:flutter/material.dart';

class LayoutDemo extends StatelessWidget {
  const LayoutDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('レイアウトデモ')),
      body: Column(
        // 主軸（縦）の配置
        mainAxisAlignment: MainAxisAlignment.center,
        // 交差軸（横）の配置
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Expanded: 残りのスペースを埋める
          Expanded(
            flex: 2,
            child: Container(
              color: Colors.blue.shade100,
              child: const Center(child: Text('Expanded（flex: 2）')),
            ),
          ),
          Expanded(
            flex: 1,
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    color: Colors.green.shade100,
                    child: const Center(child: Text('Row左')),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    color: Colors.orange.shade100,
                    child: const Center(child: Text('Row右')),
                  ),
                ),
              ],
            ),
          ),
          // SizedBox: 固定サイズのスペース
          const SizedBox(height: 16),
          // Flexible: 柔軟なサイズ
          Flexible(
            child: Container(
              constraints: const BoxConstraints(maxHeight: 100),
              color: Colors.purple.shade100,
              child: const Center(child: Text('Flexible（最大高さ100）')),
            ),
          ),
        ],
      ),
    );
  }
}
```

### Stack

重ね合わせレイアウトにはStackを使う。絶対位置での配置が可能だ。

```dart
class StackDemo extends StatelessWidget {
  const StackDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // 背景画像
        Image.network(
          'https://picsum.photos/400/300',
          width: double.infinity,
          height: 300,
          fit: BoxFit.cover,
        ),
        // グラデーションオーバーレイ
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Colors.black.withOpacity(0.7),
                ],
              ),
            ),
          ),
        ),
        // テキストを下部に配置
        const Positioned(
          bottom: 16,
          left: 16,
          right: 16,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '見出しテキスト',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 4),
              Text(
                'サブテキスト',
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ],
          ),
        ),
        // バッジを右上に配置
        const Positioned(
          top: 16,
          right: 16,
          child: Chip(
            label: Text('NEW', style: TextStyle(color: Colors.white)),
            backgroundColor: Colors.red,
          ),
        ),
      ],
    );
  }
}
```

### GridViewとListView

```dart
class GridAndListDemo extends StatelessWidget {
  final List<String> items = List.generate(20, (i) => 'アイテム ${i + 1}');

  GridAndListDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('GridView / ListView'),
          bottom: const TabBar(
            tabs: [Tab(text: 'グリッド'), Tab(text: 'リスト')],
          ),
        ),
        body: TabBarView(
          children: [
            // GridView
            GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.2,
              ),
              itemCount: items.length,
              itemBuilder: (context, index) {
                return Card(
                  child: Center(
                    child: Text(
                      items[index],
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                );
              },
            ),

            // ListView（高パフォーマンスのBuilder版）
            ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.blue.shade100,
                    child: Text('${index + 1}'),
                  ),
                  title: Text(items[index]),
                  subtitle: Text('説明テキスト $index'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {},
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
```

### CustomScrollView・Sliver

より高度なスクロール体験にはSliverを使う。

```dart
class SliverDemo extends StatelessWidget {
  const SliverDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // 折りたたみ可能なAppBar
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: const Text('SliverAppBar'),
              background: Image.network(
                'https://picsum.photos/400/200',
                fit: BoxFit.cover,
              ),
            ),
          ),
          // ヘッダー
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'コンテンツセクション',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          // グリッドリスト
          SliverGrid(
            delegate: SliverChildBuilderDelegate(
              (context, index) => Card(
                margin: const EdgeInsets.all(4),
                child: Center(child: Text('カード $index')),
              ),
              childCount: 6,
            ),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 1.5,
            ),
          ),
          // 通常のリスト
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) => ListTile(
                title: Text('リストアイテム $index'),
              ),
              childCount: 10,
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## 5. ナビゲーション（go_router）

### go_routerの基本設定

go_routerはFlutter公式推奨のルーティングパッケージだ。URLベースのナビゲーションをサポートしており、Web・モバイル両方で一貫したルーティングを実現できる。

```dart
// router.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// アプリのルーティング設定
final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  debugLogDiagnostics: true,
  routes: [
    GoRoute(
      path: '/',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/profile/:userId',
      name: 'profile',
      builder: (context, state) {
        final userId = state.pathParameters['userId']!;
        return ProfileScreen(userId: userId);
      },
    ),
    GoRoute(
      path: '/search',
      name: 'search',
      builder: (context, state) {
        final query = state.uri.queryParameters['q'];
        return SearchScreen(initialQuery: query);
      },
    ),
    // シェルルート（BottomNavigationBarと組み合わせ）
    ShellRoute(
      builder: (context, state, child) {
        return MainShell(child: child);
      },
      routes: [
        GoRoute(
          path: '/feed',
          builder: (context, state) => const FeedScreen(),
        ),
        GoRoute(
          path: '/explore',
          builder: (context, state) => const ExploreScreen(),
        ),
        GoRoute(
          path: '/notifications',
          builder: (context, state) => const NotificationsScreen(),
        ),
      ],
    ),
  ],
  // エラーページ
  errorBuilder: (context, state) => ErrorScreen(error: state.error),
  // リダイレクト（認証ガード）
  redirect: (context, state) {
    final isAuthenticated = AuthService.instance.isLoggedIn;
    final isAuthRoute = state.matchedLocation == '/login' ||
        state.matchedLocation == '/register';

    if (!isAuthenticated && !isAuthRoute) {
      return '/login';
    }
    if (isAuthenticated && isAuthRoute) {
      return '/feed';
    }
    return null;
  },
);
```

### BottomNavigationBarとShellRoute

```dart
// main_shell.dart
class MainShell extends StatelessWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _calculateSelectedIndex(context),
        onDestinationSelected: (index) => _onItemTapped(index, context),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'フィード',
          ),
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore),
            label: '探す',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: '通知',
          ),
        ],
      ),
    );
  }

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/feed')) return 0;
    if (location.startsWith('/explore')) return 1;
    if (location.startsWith('/notifications')) return 2;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/feed');
      case 1:
        context.go('/explore');
      case 2:
        context.go('/notifications');
    }
  }
}
```

### ナビゲーション操作

```dart
// 画面遷移の各種メソッド
class NavigationExamples extends StatelessWidget {
  const NavigationExamples({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // パスで遷移（スタックを置き換え）
        ElevatedButton(
          onPressed: () => context.go('/profile/123'),
          child: const Text('プロフィールへ移動'),
        ),

        // プッシュ（スタックに追加）
        ElevatedButton(
          onPressed: () => context.push('/profile/123'),
          child: const Text('プロフィールをプッシュ'),
        ),

        // 名前付きルートで遷移
        ElevatedButton(
          onPressed: () => context.goNamed(
            'profile',
            pathParameters: {'userId': '456'},
            queryParameters: {'tab': 'posts'},
          ),
          child: const Text('名前付きルートで遷移'),
        ),

        // 戻る
        ElevatedButton(
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            }
          },
          child: const Text('戻る'),
        ),

        // 戻るときに結果を渡す
        ElevatedButton(
          onPressed: () => context.pop({'result': 'selected'}),
          child: const Text('結果を持って戻る'),
        ),
      ],
    );
  }
}
```

---

## 6. 状態管理

### Riverpodの基本

Riverpodはコンパイル時の安全性を持つFlutterの状態管理ライブラリだ。2026年現在、最も広く採用されている選択肢の一つだ。

```dart
// providers/user_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'user_provider.g.dart';

// ユーザーモデル
class User {
  final String id;
  final String name;
  final String email;
  final String avatarUrl;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.avatarUrl,
  });

  User copyWith({String? name, String? email, String? avatarUrl}) {
    return User(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }
}

// シンプルなProviderの例（コード生成を使用）
@riverpod
Future<User> currentUser(CurrentUserRef ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.getCurrentUser();
}

// Notifierを使った状態管理
@riverpod
class AuthNotifier extends _$AuthNotifier {
  @override
  AsyncValue<User?> build() {
    return const AsyncValue.data(null);
  }

  Future<void> signIn(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final user = await ref.read(authServiceProvider).signIn(email, password);
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> signOut() async {
    await ref.read(authServiceProvider).signOut();
    state = const AsyncValue.data(null);
  }
}
```

### Riverpodを使ったUIコード

```dart
// screens/home_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Providerを監視
    final userAsync = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('ホーム'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              ref.read(authNotifierProvider.notifier).signOut();
            },
          ),
        ],
      ),
      body: userAsync.when(
        // ローディング状態
        loading: () => const Center(child: CircularProgressIndicator()),
        // エラー状態
        error: (error, stackTrace) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('エラー: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(currentUserProvider),
                child: const Text('再試行'),
              ),
            ],
          ),
        ),
        // データ取得成功
        data: (user) => UserProfile(user: user),
      ),
    );
  }
}

class UserProfile extends StatelessWidget {
  final User user;

  const UserProfile({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          CircleAvatar(
            radius: 48,
            backgroundImage: NetworkImage(user.avatarUrl),
          ),
          const SizedBox(height: 16),
          Text(user.name,
              style: Theme.of(context).textTheme.headlineMedium),
          Text(user.email,
              style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}
```

### Blocパターン

BlocはビジネスロジックをUIから完全に分離するアーキテクチャパターンだ。Eventを入力とし、Stateを出力する。

```dart
// blocs/todo/todo_event.dart
abstract class TodoEvent {}

class LoadTodosEvent extends TodoEvent {}

class AddTodoEvent extends TodoEvent {
  final String title;
  final String description;
  AddTodoEvent({required this.title, required this.description});
}

class ToggleTodoEvent extends TodoEvent {
  final String todoId;
  ToggleTodoEvent(this.todoId);
}

class DeleteTodoEvent extends TodoEvent {
  final String todoId;
  DeleteTodoEvent(this.todoId);
}

// blocs/todo/todo_state.dart
abstract class TodoState {}

class TodoInitial extends TodoState {}

class TodoLoading extends TodoState {}

class TodoLoaded extends TodoState {
  final List<Todo> todos;
  final List<Todo> completedTodos;

  TodoLoaded({required this.todos})
      : completedTodos = todos.where((t) => t.isCompleted).toList();

  int get totalCount => todos.length;
  int get completedCount => completedTodos.length;
}

class TodoError extends TodoState {
  final String message;
  TodoError(this.message);
}

// blocs/todo/todo_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';

class TodoBloc extends Bloc<TodoEvent, TodoState> {
  final TodoRepository _repository;

  TodoBloc({required TodoRepository repository})
      : _repository = repository,
        super(TodoInitial()) {
    on<LoadTodosEvent>(_onLoadTodos);
    on<AddTodoEvent>(_onAddTodo);
    on<ToggleTodoEvent>(_onToggleTodo);
    on<DeleteTodoEvent>(_onDeleteTodo);
  }

  Future<void> _onLoadTodos(
    LoadTodosEvent event,
    Emitter<TodoState> emit,
  ) async {
    emit(TodoLoading());
    try {
      final todos = await _repository.fetchTodos();
      emit(TodoLoaded(todos: todos));
    } catch (e) {
      emit(TodoError('TODOの読み込みに失敗しました: $e'));
    }
  }

  Future<void> _onAddTodo(
    AddTodoEvent event,
    Emitter<TodoState> emit,
  ) async {
    final currentState = state;
    if (currentState is! TodoLoaded) return;

    try {
      final newTodo = await _repository.addTodo(
        title: event.title,
        description: event.description,
      );
      emit(TodoLoaded(todos: [...currentState.todos, newTodo]));
    } catch (e) {
      emit(TodoError('TODOの追加に失敗しました: $e'));
    }
  }

  Future<void> _onToggleTodo(
    ToggleTodoEvent event,
    Emitter<TodoState> emit,
  ) async {
    final currentState = state;
    if (currentState is! TodoLoaded) return;

    final updatedTodos = currentState.todos.map((todo) {
      if (todo.id == event.todoId) {
        return todo.copyWith(isCompleted: !todo.isCompleted);
      }
      return todo;
    }).toList();

    emit(TodoLoaded(todos: updatedTodos));

    // バックグラウンドで同期
    await _repository.updateTodo(event.todoId);
  }

  Future<void> _onDeleteTodo(
    DeleteTodoEvent event,
    Emitter<TodoState> emit,
  ) async {
    final currentState = state;
    if (currentState is! TodoLoaded) return;

    emit(TodoLoaded(
      todos: currentState.todos.where((t) => t.id != event.todoId).toList(),
    ));

    await _repository.deleteTodo(event.todoId);
  }
}
```

### BlocをUIで使う

```dart
class TodoScreen extends StatelessWidget {
  const TodoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => TodoBloc(
        repository: context.read<TodoRepository>(),
      )..add(LoadTodosEvent()),
      child: const TodoView(),
    );
  }
}

class TodoView extends StatelessWidget {
  const TodoView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('TODO リスト')),
      body: BlocBuilder<TodoBloc, TodoState>(
        builder: (context, state) {
          if (state is TodoLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is TodoError) {
            return Center(child: Text(state.message));
          }
          if (state is TodoLoaded) {
            return Column(
              children: [
                // 進捗バー
                LinearProgressIndicator(
                  value: state.totalCount > 0
                      ? state.completedCount / state.totalCount
                      : 0,
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    '${state.completedCount} / ${state.totalCount} 完了',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                // TODOリスト
                Expanded(
                  child: ListView.builder(
                    itemCount: state.todos.length,
                    itemBuilder: (context, index) {
                      final todo = state.todos[index];
                      return Dismissible(
                        key: Key(todo.id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          color: Colors.red,
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 16),
                          child: const Icon(Icons.delete, color: Colors.white),
                        ),
                        onDismissed: (_) {
                          context.read<TodoBloc>().add(DeleteTodoEvent(todo.id));
                        },
                        child: CheckboxListTile(
                          value: todo.isCompleted,
                          onChanged: (_) {
                            context
                                .read<TodoBloc>()
                                .add(ToggleTodoEvent(todo.id));
                          },
                          title: Text(
                            todo.title,
                            style: TextStyle(
                              decoration: todo.isCompleted
                                  ? TextDecoration.lineThrough
                                  : null,
                            ),
                          ),
                          subtitle: Text(todo.description),
                        ),
                      );
                    },
                  ),
                ),
              ],
            );
          }
          return const SizedBox.shrink();
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddTodoDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showAddTodoDialog(BuildContext context) {
    final titleController = TextEditingController();
    final descController = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('TODOを追加'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleController,
              decoration: const InputDecoration(labelText: 'タイトル'),
              autofocus: true,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: descController,
              decoration: const InputDecoration(labelText: '説明'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('キャンセル'),
          ),
          FilledButton(
            onPressed: () {
              if (titleController.text.isNotEmpty) {
                context.read<TodoBloc>().add(AddTodoEvent(
                      title: titleController.text,
                      description: descController.text,
                    ));
                Navigator.pop(dialogContext);
              }
            },
            child: const Text('追加'),
          ),
        ],
      ),
    );
  }
}
```

---

## 7. HTTPリクエスト・API連携

### Dioを使ったHTTP通信

DioはFlutter向けの高機能HTTPクライアントだ。インターセプター・タイムアウト・キャンセル・フォームデータなど、実務に必要な機能がすべて揃っている。

```dart
// services/api_service.dart
import 'package:dio/dio.dart';

class ApiService {
  late final Dio _dio;
  static const String baseUrl = 'https://api.example.com/v1';

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // インターセプターの設定
    _dio.interceptors.addAll([
      _AuthInterceptor(),
      _LoggingInterceptor(),
      _ErrorInterceptor(),
    ]);
  }

  // GETリクエスト
  Future<List<Post>> fetchPosts({int page = 1, int limit = 20}) async {
    final response = await _dio.get(
      '/posts',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
    );

    final List<dynamic> data = response.data['data'];
    return data.map((json) => Post.fromJson(json)).toList();
  }

  // POSTリクエスト
  Future<Post> createPost({
    required String title,
    required String body,
    required List<String> tags,
  }) async {
    final response = await _dio.post(
      '/posts',
      data: {
        'title': title,
        'body': body,
        'tags': tags,
      },
    );
    return Post.fromJson(response.data);
  }

  // ファイルアップロード
  Future<String> uploadImage(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        filePath,
        filename: filePath.split('/').last,
      ),
    });

    final response = await _dio.post(
      '/upload',
      data: formData,
      onSendProgress: (sent, total) {
        final progress = (sent / total * 100).toStringAsFixed(0);
        print('アップロード進捗: $progress%');
      },
    );

    return response.data['url'] as String;
  }

  // PATCHリクエスト（部分更新）
  Future<Post> updatePost(String id, Map<String, dynamic> updates) async {
    final response = await _dio.patch('/posts/$id', data: updates);
    return Post.fromJson(response.data);
  }

  // DELETEリクエスト
  Future<void> deletePost(String id) async {
    await _dio.delete('/posts/$id');
  }
}

// 認証インターセプター
class _AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = TokenStorage.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // トークンをリフレッシュして再試行
      try {
        final newToken = await AuthService.refreshToken();
        TokenStorage.saveToken(newToken);
        err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
        final response = await Dio().fetch(err.requestOptions);
        handler.resolve(response);
        return;
      } catch (_) {
        // リフレッシュ失敗 → ログアウト
        AuthService.signOut();
      }
    }
    handler.next(err);
  }
}

// ログインターセプター
class _LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    print('[API Request] ${options.method} ${options.uri}');
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    print('[API Response] ${response.statusCode} ${response.requestOptions.uri}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    print('[API Error] ${err.response?.statusCode} ${err.message}');
    handler.next(err);
  }
}
```

### JSONシリアライゼーション

```dart
// models/post.dart
import 'package:json_annotation/json_annotation.dart';

part 'post.g.dart';

@JsonSerializable()
class Post {
  final String id;
  final String title;
  final String body;
  final List<String> tags;
  final Author author;

  @JsonKey(name: 'created_at')
  final DateTime createdAt;

  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;

  const Post({
    required this.id,
    required this.title,
    required this.body,
    required this.tags,
    required this.author,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Post.fromJson(Map<String, dynamic> json) => _$PostFromJson(json);
  Map<String, dynamic> toJson() => _$PostToJson(this);

  Post copyWith({
    String? title,
    String? body,
    List<String>? tags,
  }) {
    return Post(
      id: id,
      title: title ?? this.title,
      body: body ?? this.body,
      tags: tags ?? this.tags,
      author: author,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
    );
  }
}

@JsonSerializable()
class Author {
  final String id;
  final String name;
  final String? avatarUrl;

  const Author({
    required this.id,
    required this.name,
    this.avatarUrl,
  });

  factory Author.fromJson(Map<String, dynamic> json) => _$AuthorFromJson(json);
  Map<String, dynamic> toJson() => _$AuthorToJson(this);
}

// コード生成コマンド
// dart run build_runner build --delete-conflicting-outputs
```

### 無限スクロール（Pagination）

```dart
// RiverpodでのPagination実装
@riverpod
class PostsNotifier extends _$PostsNotifier {
  static const _pageSize = 20;

  @override
  Future<List<Post>> build() async {
    return _fetchPage(1);
  }

  Future<List<Post>> _fetchPage(int page) async {
    final api = ref.read(apiServiceProvider);
    return api.fetchPosts(page: page, limit: _pageSize);
  }

  int _currentPage = 1;
  bool _hasMore = true;
  bool _isLoadingMore = false;

  Future<void> loadMore() async {
    if (_isLoadingMore || !_hasMore) return;

    _isLoadingMore = true;
    try {
      _currentPage++;
      final newPosts = await _fetchPage(_currentPage);

      if (newPosts.length < _pageSize) {
        _hasMore = false;
      }

      state = AsyncValue.data([
        ...(state.value ?? []),
        ...newPosts,
      ]);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    } finally {
      _isLoadingMore = false;
    }
  }

  Future<void> refresh() async {
    _currentPage = 1;
    _hasMore = true;
    _isLoadingMore = false;
    state = const AsyncValue.loading();
    state = AsyncValue.data(await _fetchPage(1));
  }
}
```

---

## 8. Firebase連携

### Firebase初期設定

FlutterFireCLIを使うと設定が大幅に簡略化される。

```bash
# Firebase CLIをインストール
npm install -g firebase-tools

# ログイン
firebase login

# FlutterFire CLIをインストール
dart pub global activate flutterfire_cli

# Firebaseプロジェクトを設定（自動でgoogle-services.json等を生成）
flutterfire configure --project=your-firebase-project-id
```

```dart
// main.dart
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}
```

### Firebase Authentication

```dart
// services/firebase_auth_service.dart
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

class FirebaseAuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  // ユーザーの状態変化を監視
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // メール/パスワードでサインアップ
  Future<UserCredential> signUpWithEmail({
    required String email,
    required String password,
    required String displayName,
  }) async {
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );

    // プロフィール情報を設定
    await credential.user?.updateDisplayName(displayName);
    await credential.user?.sendEmailVerification();

    return credential;
  }

  // メール/パスワードでサインイン
  Future<UserCredential> signInWithEmail({
    required String email,
    required String password,
  }) async {
    return _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  // Googleサインイン
  Future<UserCredential?> signInWithGoogle() async {
    final googleUser = await _googleSignIn.signIn();
    if (googleUser == null) return null;

    final googleAuth = await googleUser.authentication;
    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );

    return _auth.signInWithCredential(credential);
  }

  // Appleサインイン
  Future<UserCredential> signInWithApple() async {
    final appleProvider = AppleAuthProvider()
      ..addScope('email')
      ..addScope('fullName');

    return _auth.signInWithProvider(appleProvider);
  }

  // パスワードリセット
  Future<void> sendPasswordResetEmail(String email) async {
    await _auth.sendPasswordResetEmail(email: email);
  }

  // サインアウト
  Future<void> signOut() async {
    await Future.wait([
      _auth.signOut(),
      _googleSignIn.signOut(),
    ]);
  }

  // メールアドレス変更
  Future<void> updateEmail(String newEmail) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('ログインしていません');
    await user.verifyBeforeUpdateEmail(newEmail);
  }

  // パスワード変更
  Future<void> updatePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final user = _auth.currentUser;
    if (user == null || user.email == null) throw Exception('ログインしていません');

    // 再認証
    final credential = EmailAuthProvider.credential(
      email: user.email!,
      password: currentPassword,
    );
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(newPassword);
  }
}
```

### Cloud Firestoreのデータ操作

```dart
// repositories/post_repository.dart
import 'package:cloud_firestore/cloud_firestore.dart';

class PostRepository {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  CollectionReference get _postsRef => _db.collection('posts');

  // 投稿の作成
  Future<String> createPost({
    required String userId,
    required String title,
    required String content,
    List<String> tags = const [],
  }) async {
    final docRef = await _postsRef.add({
      'userId': userId,
      'title': title,
      'content': content,
      'tags': tags,
      'likeCount': 0,
      'commentCount': 0,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    return docRef.id;
  }

  // リアルタイム投稿取得（Stream）
  Stream<List<Post>> watchPosts({int limit = 20}) {
    return _postsRef
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => Post.fromFirestore(doc))
          .toList();
    });
  }

  // 単一投稿の取得
  Future<Post?> getPost(String postId) async {
    final doc = await _postsRef.doc(postId).get();
    if (!doc.exists) return null;
    return Post.fromFirestore(doc);
  }

  // タグでフィルタリング
  Stream<List<Post>> watchPostsByTag(String tag) {
    return _postsRef
        .where('tags', arrayContains: tag)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => Post.fromFirestore(d)).toList());
  }

  // いいねのトグル（トランザクション使用）
  Future<void> toggleLike(String postId, String userId) async {
    final likeRef = _db
        .collection('posts')
        .doc(postId)
        .collection('likes')
        .doc(userId);

    await _db.runTransaction((transaction) async {
      final likeDoc = await transaction.get(likeRef);
      final postDoc = await transaction.get(_postsRef.doc(postId));

      if (likeDoc.exists) {
        // いいねを取り消す
        transaction.delete(likeRef);
        transaction.update(_postsRef.doc(postId), {
          'likeCount': FieldValue.increment(-1),
        });
      } else {
        // いいねを追加する
        transaction.set(likeRef, {
          'userId': userId,
          'createdAt': FieldValue.serverTimestamp(),
        });
        transaction.update(_postsRef.doc(postId), {
          'likeCount': FieldValue.increment(1),
        });
      }
    });
  }

  // バッチ書き込み
  Future<void> deleteUserData(String userId) async {
    final batch = _db.batch();

    final userPosts = await _postsRef
        .where('userId', isEqualTo: userId)
        .get();

    for (final doc in userPosts.docs) {
      batch.delete(doc.reference);
    }

    await batch.commit();
  }

  // ページネーション（カーソルベース）
  Future<List<Post>> fetchNextPage({
    required int pageSize,
    DocumentSnapshot? lastDocument,
  }) async {
    Query query = _postsRef
        .orderBy('createdAt', descending: true)
        .limit(pageSize);

    if (lastDocument != null) {
      query = query.startAfterDocument(lastDocument);
    }

    final snapshot = await query.get();
    return snapshot.docs.map((d) => Post.fromFirestore(d)).toList();
  }
}
```

### Firebase Cloud Messaging（プッシュ通知）

```dart
// services/push_notification_service.dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

// バックグラウンドメッセージハンドラ（トップレベル関数が必須）
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  print('バックグラウンドメッセージ受信: ${message.messageId}');
}

class PushNotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    // バックグラウンドハンドラを登録
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // 通知権限のリクエスト
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    print('通知権限: ${settings.authorizationStatus}');

    // FCMトークンの取得
    final token = await _messaging.getToken();
    print('FCMトークン: $token');

    // トークン更新の監視
    _messaging.onTokenRefresh.listen((newToken) {
      _saveTokenToServer(newToken);
    });

    // ローカル通知の初期化
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    await _localNotifications.initialize(
      const InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      ),
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // フォアグラウンドメッセージの処理
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // アプリ起動時（通知タップで起動）
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageNavigation(initialMessage);
    }

    // バックグラウンドから通知タップで復帰
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageNavigation);
  }

  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    // フォアグラウンドではローカル通知を表示
    await _localNotifications.show(
      message.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'default_channel',
          'デフォルト',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: message.data['route'],
    );
  }

  void _onNotificationTap(NotificationResponse details) {
    final route = details.payload;
    if (route != null) {
      // ルーティング処理
      NavigationService.navigateTo(route);
    }
  }

  void _handleMessageNavigation(RemoteMessage message) {
    final route = message.data['route'];
    if (route != null) {
      NavigationService.navigateTo(route);
    }
  }

  Future<void> _saveTokenToServer(String token) async {
    // サーバーにFCMトークンを保存する処理
    await ApiService.instance.updatePushToken(token);
  }

  // トピックの購読
  Future<void> subscribeToTopic(String topic) async {
    await _messaging.subscribeToTopic(topic);
  }

  Future<void> unsubscribeFromTopic(String topic) async {
    await _messaging.unsubscribeFromTopic(topic);
  }
}
```

---

## 9. ローカルストレージ

### Hiveを使ったNoSQLストレージ

Hiveは高速な組み込みデータベースで、シンプルなkey-valueストレージに最適だ。

```dart
// models/settings.dart
import 'package:hive/hive.dart';

part 'settings.g.dart';

@HiveType(typeId: 0)
class AppSettings extends HiveObject {
  @HiveField(0)
  late String theme;

  @HiveField(1)
  late String language;

  @HiveField(2)
  late bool notificationsEnabled;

  @HiveField(3)
  late String? authToken;
}

// Hiveの初期化と使用
class StorageService {
  late Box<AppSettings> _settingsBox;
  late Box<dynamic> _cacheBox;

  Future<void> initialize() async {
    // Flutter向けにHiveを初期化
    await Hive.initFlutter();

    // アダプターを登録
    Hive.registerAdapter(AppSettingsAdapter());

    // Boxを開く（暗号化ボックスも可能）
    _settingsBox = await Hive.openBox<AppSettings>('settings');
    _cacheBox = await Hive.openBox('cache');
  }

  // 設定の読み書き
  AppSettings get settings {
    return _settingsBox.get('app_settings') ??
        (AppSettings()
          ..theme = 'light'
          ..language = 'ja'
          ..notificationsEnabled = true);
  }

  Future<void> saveSettings(AppSettings settings) async {
    await _settingsBox.put('app_settings', settings);
  }

  // キャッシュ操作
  Future<void> cacheData(String key, dynamic value, {Duration? ttl}) async {
    await _cacheBox.put(key, value);
    if (ttl != null) {
      await _cacheBox.put(
        '${key}_expires',
        DateTime.now().add(ttl).millisecondsSinceEpoch,
      );
    }
  }

  T? getCachedData<T>(String key) {
    final expiresKey = '${key}_expires';
    if (_cacheBox.containsKey(expiresKey)) {
      final expires = _cacheBox.get(expiresKey) as int;
      if (DateTime.now().millisecondsSinceEpoch > expires) {
        _cacheBox.delete(key);
        _cacheBox.delete(expiresKey);
        return null;
      }
    }
    return _cacheBox.get(key) as T?;
  }

  Future<void> clearCache() async {
    await _cacheBox.clear();
  }
}
```

### SQLiteを使ったリレーショナルDB（drift）

driftはFlutter向けのSQLiteラッパーで、型安全なクエリを生成できる。

```dart
// database/app_database.dart
import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'app_database.g.dart';

// テーブル定義
class Notes extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get title => text().withLength(min: 1, max: 200)();
  TextColumn get content => text()();
  TextColumn get category => text().withDefault(const Constant('general'))();
  BoolColumn get isPinned => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
}

class Tags extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  TextColumn get color => text().withDefault(const Constant('#007AFF'))();
}

class NoteTags extends Table {
  IntColumn get noteId => integer().references(Notes, #id)();
  IntColumn get tagId => integer().references(Tags, #id)();

  @override
  Set<Column> get primaryKey => {noteId, tagId};
}

// データベースクラス
@DriftDatabase(tables: [Notes, Tags, NoteTags])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) => m.createAll(),
    onUpgrade: (m, from, to) async {
      if (from < 2) {
        await m.addColumn(notes, notes.category);
      }
    },
  );

  // ノート操作
  Future<List<Note>> getAllNotes() {
    return (select(notes)
          ..orderBy([(n) => OrderingTerm.desc(n.createdAt)]))
        .get();
  }

  Stream<List<Note>> watchAllNotes() {
    return (select(notes)
          ..orderBy([(n) => OrderingTerm.desc(n.createdAt)]))
        .watch();
  }

  Future<int> insertNote(NotesCompanion note) {
    return into(notes).insert(note);
  }

  Future<void> updateNote(Note note) {
    return (update(notes)..where((n) => n.id.equals(note.id))).write(
      NotesCompanion(
        title: Value(note.title),
        content: Value(note.content),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> deleteNote(int id) {
    return (delete(notes)..where((n) => n.id.equals(id))).go();
  }

  // 検索
  Stream<List<Note>> searchNotes(String query) {
    return (select(notes)
          ..where((n) =>
              n.title.contains(query) | n.content.contains(query)))
        .watch();
  }

  // ピン留めノートを取得
  Stream<List<Note>> watchPinnedNotes() {
    return (select(notes)
          ..where((n) => n.isPinned.equals(true))
          ..orderBy([(n) => OrderingTerm.desc(n.createdAt)]))
        .watch();
  }
}

QueryExecutor _openConnection() {
  return driftDatabase(name: 'app_database');
}
```

---

## 10. アニメーション

### AnimationControllerの基本

```dart
import 'package:flutter/material.dart';

class AnimatedCard extends StatefulWidget {
  const AnimatedCard({super.key});

  @override
  State<AnimatedCard> createState() => _AnimatedCardState();
}

class _AnimatedCardState extends State<AnimatedCard>
    with TickerProviderStateMixin {
  late final AnimationController _scaleController;
  late final AnimationController _fadeController;
  late final Animation<double> _scaleAnimation;
  late final Animation<double> _fadeAnimation;
  late final Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();

    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.elasticOut),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeIn),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.5),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOutCubic,
    ));

    // アニメーションを順番に再生
    _fadeController.forward().then((_) => _scaleController.forward());
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: ScaleTransition(
          scale: _scaleAnimation,
          child: Card(
            elevation: 8,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.star, size: 64, color: Colors.amber),
                  const SizedBox(height: 16),
                  const Text(
                    'アニメーションカード',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () async {
                      await _scaleController.reverse();
                      await _fadeController.reverse();
                      await _fadeController.forward();
                      await _scaleController.forward();
                    },
                    child: const Text('再生'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

### Hero アニメーション

```dart
// 一覧画面
class ProductListScreen extends StatelessWidget {
  final List<Product> products;

  const ProductListScreen({super.key, required this.products});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('商品一覧')),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.75,
        ),
        itemCount: products.length,
        itemBuilder: (context, index) {
          final product = products[index];
          return GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ProductDetailScreen(product: product),
                ),
              );
            },
            child: Card(
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Hero(
                      // タグはユニークである必要がある
                      tag: 'product-image-${product.id}',
                      child: Image.network(
                        product.imageUrl,
                        fit: BoxFit.cover,
                        width: double.infinity,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Text(product.name,
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// 詳細画面
class ProductDetailScreen extends StatelessWidget {
  final Product product;

  const ProductDetailScreen({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Hero(
                tag: 'product-image-${product.id}',
                child: Image.network(
                  product.imageUrl,
                  fit: BoxFit.cover,
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name,
                      style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 8),
                  Text('¥${product.price}',
                      style: const TextStyle(
                          fontSize: 24, color: Colors.deepOrange)),
                  const SizedBox(height: 16),
                  Text(product.description),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {},
                      child: const Text('カートに追加'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

### Lottieアニメーション

```dart
import 'package:lottie/lottie.dart';

class LottieDemo extends StatelessWidget {
  const LottieDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ネットワークから読み込み
        Lottie.network(
          'https://assets5.lottiefiles.com/packages/lf20_example.json',
          width: 200,
          height: 200,
          repeat: true,
        ),

        // アセットから読み込み
        Lottie.asset(
          'assets/animations/loading.json',
          width: 100,
          height: 100,
          repeat: true,
          animate: true,
        ),

        // コントローラーで制御
        LottieControlledWidget(),
      ],
    );
  }
}

class LottieControlledWidget extends StatefulWidget {
  const LottieControlledWidget({super.key});

  @override
  State<LottieControlledWidget> createState() => _LottieControlledWidgetState();
}

class _LottieControlledWidgetState extends State<LottieControlledWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Lottie.asset(
          'assets/animations/success.json',
          controller: _controller,
          onLoaded: (composition) {
            _controller.duration = composition.duration;
          },
        ),
        ElevatedButton(
          onPressed: () => _controller.forward(from: 0),
          child: const Text('再生'),
        ),
      ],
    );
  }
}
```

---

## 11. カメラ・位置情報・プッシュ通知

### カメラ機能

```dart
// services/camera_service.dart
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class CameraService {
  final ImagePicker _picker = ImagePicker();

  // ギャラリーから画像を選択
  Future<File?> pickImageFromGallery() async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1920,
      maxHeight: 1080,
      imageQuality: 85,
    );
    return image != null ? File(image.path) : null;
  }

  // カメラで撮影
  Future<File?> takePhoto() async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1920,
      maxHeight: 1080,
      imageQuality: 85,
    );
    return image != null ? File(image.path) : null;
  }

  // 複数画像の選択
  Future<List<File>> pickMultipleImages({int maxImages = 5}) async {
    final List<XFile> images = await _picker.pickMultiImage(
      maxWidth: 1920,
      maxHeight: 1080,
      imageQuality: 85,
    );
    return images.take(maxImages).map((x) => File(x.path)).toList();
  }

  // 動画撮影
  Future<File?> recordVideo() async {
    final XFile? video = await _picker.pickVideo(
      source: ImageSource.camera,
      maxDuration: const Duration(minutes: 5),
    );
    return video != null ? File(video.path) : null;
  }
}

// カメラプレビュー画面
class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  int _selectedCameraIndex = 0;
  bool _isRecording = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    _cameras = await availableCameras();
    if (_cameras!.isNotEmpty) {
      await _setupCamera(_cameras![0]);
    }
  }

  Future<void> _setupCamera(CameraDescription camera) async {
    _controller = CameraController(
      camera,
      ResolutionPreset.high,
      enableAudio: true,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );

    await _controller!.initialize();
    if (mounted) setState(() {});
  }

  Future<void> _switchCamera() async {
    _selectedCameraIndex =
        (_selectedCameraIndex + 1) % _cameras!.length;
    await _setupCamera(_cameras![_selectedCameraIndex]);
  }

  Future<void> _takePicture() async {
    if (_controller == null || !_controller!.value.isInitialized) return;

    final XFile image = await _controller!.takePicture();
    if (!mounted) return;

    Navigator.pop(context, File(image.path));
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_controller == null || !_controller!.value.isInitialized) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          CameraPreview(_controller!),
          Positioned(
            bottom: 48,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                IconButton(
                  icon: const Icon(Icons.flip_camera_ios, color: Colors.white, size: 32),
                  onPressed: _switchCamera,
                ),
                GestureDetector(
                  onTap: _takePicture,
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 4),
                      color: Colors.white30,
                    ),
                  ),
                ),
                const SizedBox(width: 64),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

### 位置情報

```dart
// services/location_service.dart
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

class LocationService {
  // 現在地の取得
  Future<Position> getCurrentLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('位置情報サービスが無効です');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('位置情報の権限が拒否されました');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw Exception('位置情報の権限が永久に拒否されています。設定から変更してください');
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10, // 10m以上移動したら更新
      ),
    );
  }

  // 位置情報の継続的な監視
  Stream<Position> watchPosition() {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    );
  }

  // 住所から座標へ変換
  Future<Location?> geocodeAddress(String address) async {
    final locations = await locationFromAddress(address);
    return locations.isNotEmpty ? locations.first : null;
  }

  // 座標から住所へ変換
  Future<String?> reverseGeocode(double lat, double lng) async {
    final placemarks = await placemarkFromCoordinates(lat, lng);
    if (placemarks.isEmpty) return null;

    final place = placemarks.first;
    return [
      place.postalCode,
      place.administrativeArea,
      place.subAdministrativeArea,
      place.locality,
      place.subLocality,
      place.thoroughfare,
      place.subThoroughfare,
    ].where((s) => s != null && s.isNotEmpty).join(' ');
  }

  // 2点間の距離（メートル）
  double calculateDistance({
    required double startLat,
    required double startLng,
    required double endLat,
    required double endLng,
  }) {
    return Geolocator.distanceBetween(startLat, startLng, endLat, endLng);
  }
}
```

---

## 12. テスト

### ユニットテスト

```dart
// test/services/api_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:dio/dio.dart';

import 'api_service_test.mocks.dart';

@GenerateMocks([Dio])
void main() {
  group('ApiService', () {
    late ApiService apiService;
    late MockDio mockDio;

    setUp(() {
      mockDio = MockDio();
      apiService = ApiService(dio: mockDio);
    });

    test('fetchPosts - 正常レスポンスの場合、Postリストを返す', () async {
      // モックの設定
      when(mockDio.get(
        '/posts',
        queryParameters: anyNamed('queryParameters'),
      )).thenAnswer((_) async => Response(
            data: {
              'data': [
                {
                  'id': '1',
                  'title': 'テスト投稿',
                  'body': 'テスト本文',
                  'tags': ['flutter', 'dart'],
                  'author': {'id': 'u1', 'name': '田中太郎'},
                  'created_at': '2026-01-01T00:00:00Z',
                  'updated_at': '2026-01-01T00:00:00Z',
                }
              ]
            },
            statusCode: 200,
            requestOptions: RequestOptions(path: '/posts'),
          ));

      // 実行
      final posts = await apiService.fetchPosts();

      // 検証
      expect(posts.length, 1);
      expect(posts[0].title, 'テスト投稿');
      expect(posts[0].tags, contains('flutter'));
    });

    test('fetchPosts - ネットワークエラーの場合、例外をスロー', () async {
      when(mockDio.get(
        any,
        queryParameters: anyNamed('queryParameters'),
      )).thenThrow(DioException(
        requestOptions: RequestOptions(path: '/posts'),
        type: DioExceptionType.connectionTimeout,
      ));

      expect(() => apiService.fetchPosts(), throwsA(isA<DioException>()));
    });
  });

  group('TodoRepository', () {
    late TodoRepository repository;

    setUp(() {
      repository = TodoRepository();
    });

    test('addTodo - 有効なタイトルの場合、新しいTODOを作成', () {
      final todo = repository.addTodo(
        title: 'テストタスク',
        description: '説明文',
      );

      expect(todo.title, 'テストタスク');
      expect(todo.isCompleted, false);
      expect(todo.id, isNotEmpty);
    });

    test('addTodo - 空のタイトルの場合、ArgumentErrorをスロー', () {
      expect(
        () => repository.addTodo(title: '', description: ''),
        throwsA(isA<ArgumentError>()),
      );
    });

    test('toggleTodo - 未完了TODOをトグルすると完了になる', () {
      final todo = repository.addTodo(title: 'タスク', description: '');
      expect(todo.isCompleted, false);

      final toggled = repository.toggleTodo(todo.id);
      expect(toggled.isCompleted, true);
    });
  });
}
```

### Widgetテスト

```dart
// test/widgets/user_card_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('UserCard Widget', () {
    testWidgets('名前とメールアドレスが表示される', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: UserCard(
              name: '田中太郎',
              email: 'tanaka@example.com',
              avatarUrl: 'https://example.com/avatar.jpg',
            ),
          ),
        ),
      );

      expect(find.text('田中太郎'), findsOneWidget);
      expect(find.text('tanaka@example.com'), findsOneWidget);
    });

    testWidgets('長い名前が省略表示される', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 200,
              child: UserCard(
                name: 'とても長い名前のユーザーで表示が省略される',
                email: 'user@example.com',
                avatarUrl: 'https://example.com/avatar.jpg',
              ),
            ),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(
        find.text('とても長い名前のユーザーで表示が省略される'),
      );
      expect(textWidget.overflow, TextOverflow.ellipsis);
    });

    testWidgets('タップ時にコールバックが呼ばれる', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: UserCard(
              name: 'テストユーザー',
              email: 'test@example.com',
              avatarUrl: '',
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      await tester.tap(find.byType(UserCard));
      expect(tapped, true);
    });
  });

  group('CounterWidget', () {
    testWidgets('初期値は0', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: CounterWidget()),
      );

      expect(find.text('0'), findsOneWidget);
    });

    testWidgets('インクリメントボタンをタップするとカウントが増える', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: CounterWidget()),
      );

      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();

      expect(find.text('1'), findsOneWidget);
    });

    testWidgets('デクリメントは0未満にならない', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: CounterWidget()),
      );

      await tester.tap(find.byIcon(Icons.remove));
      await tester.pump();

      expect(find.text('0'), findsOneWidget);
    });
  });
}
```

### インテグレーションテスト

```dart
// integration_test/app_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('ログインフロー', () {
    testWidgets('正しい認証情報でログインできる', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // ログイン画面が表示されていることを確認
      expect(find.text('ログイン'), findsOneWidget);

      // メールアドレスを入力
      await tester.enterText(
        find.byKey(const Key('email_field')),
        'test@example.com',
      );

      // パスワードを入力
      await tester.enterText(
        find.byKey(const Key('password_field')),
        'password123',
      );

      // ログインボタンをタップ
      await tester.tap(find.byKey(const Key('login_button')));
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // ホーム画面に遷移したことを確認
      expect(find.text('ホーム'), findsOneWidget);
    });

    testWidgets('誤った認証情報でエラーメッセージが表示される', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byKey(const Key('email_field')),
        'wrong@example.com',
      );
      await tester.enterText(
        find.byKey(const Key('password_field')),
        'wrongpassword',
      );

      await tester.tap(find.byKey(const Key('login_button')));
      await tester.pumpAndSettle();

      expect(find.text('メールアドレスまたはパスワードが正しくありません'), findsOneWidget);
    });
  });
}
```

```bash
# インテグレーションテストの実行
flutter test integration_test/app_test.dart -d "iPhone 15 Pro"
flutter test integration_test/app_test.dart -d emulator-5554
```

---

## 13. CI/CD（Fastlane・GitHub Actions）

### GitHub Actionsの設定

```yaml
# .github/workflows/flutter-ci.yml
name: Flutter CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  FLUTTER_VERSION: '3.27.0'
  JAVA_VERSION: '17'

jobs:
  test:
    name: テスト実行
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Flutter SDKのセットアップ
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
          channel: stable
          cache: true

      - name: 依存関係のインストール
        run: flutter pub get

      - name: コード生成
        run: dart run build_runner build --delete-conflicting-outputs

      - name: 静的解析
        run: flutter analyze

      - name: フォーマットチェック
        run: dart format --set-exit-if-changed .

      - name: ユニット・Widgetテスト
        run: flutter test --coverage

      - name: カバレッジレポートのアップロード
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          file: coverage/lcov.info

  build-android:
    name: Android ビルド
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Java のセットアップ
        uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'

      - name: Flutter SDKのセットアップ
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
          channel: stable
          cache: true

      - name: Keystoreの設定
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 --decode > android/app/keystore.jks
          echo "storeFile=keystore.jks" >> android/key.properties
          echo "storePassword=${{ secrets.KEYSTORE_PASSWORD }}" >> android/key.properties
          echo "keyAlias=${{ secrets.KEY_ALIAS }}" >> android/key.properties
          echo "keyPassword=${{ secrets.KEY_PASSWORD }}" >> android/key.properties

      - name: 依存関係のインストール
        run: flutter pub get

      - name: コード生成
        run: dart run build_runner build --delete-conflicting-outputs

      - name: Android App Bundle ビルド
        run: flutter build appbundle --release

      - name: AABファイルをアーティファクトとして保存
        uses: actions/upload-artifact@v4
        with:
          name: release-aab
          path: build/app/outputs/bundle/release/app-release.aab

  build-ios:
    name: iOS ビルド
    runs-on: macos-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Flutter SDKのセットアップ
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
          channel: stable
          cache: true

      - name: 証明書とプロビジョニングプロファイルのインストール
        uses: apple-actions/import-codesign-certs@v2
        with:
          p12-file-base64: ${{ secrets.CERTIFICATES_P12 }}
          p12-password: ${{ secrets.CERTIFICATES_P12_PASSWORD }}

      - name: 依存関係のインストール
        run: flutter pub get

      - name: コード生成
        run: dart run build_runner build --delete-conflicting-outputs

      - name: iOS ipa ビルド
        run: flutter build ipa --release --export-options-plist=ios/ExportOptions.plist

      - name: ipaファイルをアーティファクトとして保存
        uses: actions/upload-artifact@v4
        with:
          name: release-ipa
          path: build/ios/ipa/*.ipa

  deploy-android:
    name: Play Store デプロイ
    runs-on: ubuntu-latest
    needs: build-android
    steps:
      - name: AARファイルのダウンロード
        uses: actions/download-artifact@v4
        with:
          name: release-aab

      - name: Play Storeへアップロード
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.SERVICE_ACCOUNT_JSON }}
          packageName: com.example.myapp
          releaseFiles: app-release.aab
          track: internal
          status: completed
```

### Fastlaneの設定

```ruby
# ios/fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "テストを実行"
  lane :test do
    run_tests(
      project: "Runner.xcodeproj",
      scheme: "Runner",
      devices: ["iPhone 15 Pro"]
    )
  end

  desc "TestFlightにアップロード"
  lane :beta do
    # 証明書の取得
    sync_code_signing(type: "appstore")

    # バージョン番号の更新
    increment_build_number(
      build_number: ENV["GITHUB_RUN_NUMBER"] || Time.now.to_i.to_s
    )

    # ビルド
    build_app(
      scheme: "Runner",
      export_method: "app-store"
    )

    # TestFlightにアップロード
    upload_to_testflight(
      api_key_path: "fastlane/api_key.json",
      skip_waiting_for_build_processing: true
    )

    # Slackに通知
    slack(
      message: "TestFlightへのアップロード完了",
      success: true,
      slack_url: ENV["SLACK_WEBHOOK_URL"]
    )
  end

  desc "App Storeにリリース"
  lane :release do
    sync_code_signing(type: "appstore")

    increment_build_number(
      build_number: Time.now.to_i.to_s
    )

    build_app(scheme: "Runner", export_method: "app-store")

    upload_to_app_store(
      api_key_path: "fastlane/api_key.json",
      submit_for_review: false,
      automatic_release: false,
      skip_metadata: false,
      skip_screenshots: false
    )
  end
end
```

---

## 14. App Store/Play Store公開手順

### Android: Google Play Store

**ステップ1: アプリの署名**

```bash
# キーストアの作成
keytool -genkey -v \
  -keystore ~/key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias upload

# android/key.propertiesファイルを作成
storePassword=<パスワード>
keyPassword=<パスワード>
keyAlias=upload
storeFile=<キーストアのパス>
```

```gradle
// android/app/build.gradle に署名設定を追加
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

**ステップ2: リリースビルドの作成**

```bash
# App Bundle（推奨）
flutter build appbundle --release

# または APK
flutter build apk --release --split-per-abi
```

**ステップ3: Play Consoleへのアップロード**

1. Google Play Console（play.google.com/console）にアクセス
2. 「アプリを作成」をクリック
3. アプリ情報を入力（名前・説明・カテゴリ）
4. 「内部テスト」または「製品版」トラックを選択
5. AABファイルをアップロード
6. コンテンツのレーティングを設定
7. プライバシーポリシーのURLを入力
8. ストアの掲載情報（スクリーンショット・フィーチャーグラフィック）をアップロード
9. 審査を申請

**必要なアセット（Android）:**
- アイコン: 512x512px（PNG）
- フィーチャーグラフィック: 1024x500px
- スクリーンショット: 最低2枚（電話・タブレット）
- 動画（任意）: YouTube URL

### iOS: Apple App Store

**ステップ1: App Store Connectの設定**

1. Apple Developer Program（年間$99）に登録
2. App Store Connect（appstoreconnect.apple.com）でアプリを登録
3. Bundle IDをDeveloper Portalで作成
4. App Store Connectでアプリを新規作成

**ステップ2: 証明書とプロビジョニングプロファイルの設定**

```bash
# Xcodeで自動管理（推奨）
# Xcode > Signing & Capabilities > Automatically manage signing をオン
# Teamを選択するだけで自動設定される

# 手動で管理する場合
# 1. Developer PortalでDistribution証明書を作成
# 2. App Store Distribution用のProvisioning Profileを作成
# 3. Xcodeに設定
```

**ステップ3: アプリのビルドとアーカイブ**

```bash
# ipaファイルのビルド
flutter build ipa --release

# またはXcodeでアーカイブ
# Xcode > Product > Archive

# Transporter経由でアップロード
# または Xcode Organizer からアップロード
xcrun altool --upload-app \
  --type ios \
  --file "build/ios/ipa/myapp.ipa" \
  --username "your@apple.com" \
  --password "@keychain:Application Loader: your@apple.com"
```

**ステップ4: App Store Connectでの申請**

1. アプリ情報を入力（名前・サブタイトル・説明・キーワード）
2. スクリーンショットをアップロード（必須サイズ複数）
3. プライバシーポリシーURLを設定
4. 価格と配信地域を設定
5. 年齢区分（App Rating）を入力
6. TestFlightでベータテストを実施
7. App Store審査を申請

**必要なスクリーンショットサイズ（iOS）:**
- iPhone 6.9インチ: 1320x2868px または 1290x2796px（必須）
- iPhone 6.5インチ: 1242x2688px（必須）
- iPad Pro 12.9インチ: 2048x2732px（任意だが推奨）

**审査ガイドラインの主なポイント:**
- アプリがクラッシュしてはいけない
- すべての機能が動作する必要がある
- プライバシーポリシーが必要（個人情報を収集する場合）
- App Tracking Transparency（ATT）の実装が必要（追跡する場合）
- In-App Purchase使用の場合はAppleのシステムを使う必要がある
- サインインにApple IDを提供する場合は「Appleでサインイン」も提供する必要がある

### バージョン管理

```yaml
# pubspec.yaml のバージョン管理
# version: <major>.<minor>.<patch>+<build_number>
version: 1.2.3+45
# 1.2.3 → CFBundleShortVersionString（人間が読むバージョン）
# 45 → CFBundleVersion / versionCode（ビルド番号）
```

```bash
# バージョンを更新してビルド
flutter build appbundle --build-name=1.2.3 --build-number=45
flutter build ipa --build-name=1.2.3 --build-number=45
```

---

## まとめと次のステップ

### 本記事で学んだこと

本記事では、FlutterとDartの基礎から実践的なアプリ開発まで幅広く解説した。主要な内容を振り返る。

- **Widget設計**: StatelessWidget・StatefulWidgetの使い分けと適切なWidgetツリーの構築
- **状態管理**: Riverpodによるリアクティブな状態管理とBlocによるイベント駆動アーキテクチャ
- **ナビゲーション**: go_routerを使ったURLベースのルーティングとShellRouteによるタブナビゲーション
- **API連携**: DioとJSON Serializationを使った型安全なHTTP通信
- **Firebase**: Authentication・Firestore・Cloud Messagingの連携
- **ローカルデータ**: HiveとDrift（SQLite）によるオフラインデータ管理
- **アニメーション**: AnimationController・Hero・Lottieを使ったリッチなUI表現
- **テスト**: ユニット・Widget・インテグレーションテストの実装方法
- **CI/CD**: GitHub ActionsとFastlaneによる自動化パイプライン
- **ストア公開**: App Store・Google Play Storeへの申請プロセス

### 推奨するフォルダ構成（Feature-first）

実際のプロダクト開発では、機能ごとにコードを整理するfeature-first構成を推奨する。

```
lib/
├── main.dart
├── app.dart                  # MaterialApp・テーマ設定
├── core/
│   ├── theme/               # テーマ・カラーパレット
│   ├── constants/           # 定数
│   ├── extensions/          # Dart拡張関数
│   ├── utils/               # ユーティリティ
│   └── widgets/             # 共通Widget
├── features/
│   ├── auth/
│   │   ├── data/            # リポジトリ・データソース
│   │   ├── domain/          # エンティティ・ユースケース
│   │   └── presentation/    # Screen・Widget・Provider
│   ├── home/
│   ├── profile/
│   └── settings/
└── shared/
    ├── providers/           # グローバルProvider
    └── services/            # グローバルサービス
```

### 開発効率を高めるツール

Flutterアプリの開発において、**DevToolBox（https://usedevtools.com）**は日々の開発作業を効率化するツールとして活用できる。JSON変換・正規表現テスト・カラーパレット生成・Base64エンコードなど、開発者が頻繁に使うユーティリティが一箇所にまとまっており、Webブラウザからすぐに利用できる。APIのレスポンスJSONをDartのモデルクラスに変換する際や、カラーコードを確認したいときに便利だ。

### 参考リソース

- Flutter公式ドキュメント: flutter.dev
- Dart公式ドキュメント: dart.dev
- pub.dev（パッケージリポジトリ）: pub.dev
- Flutter Awesome（厳選パッケージ集）: flutterawesome.com
- Riverpod公式ドキュメント: riverpod.dev
- go_router公式ドキュメント: pub.dev/packages/go_router
- Firebase Flutter: firebase.flutter.dev

Flutterは急速に進化しており、Impellerレンダリングエンジンの安定化・WebAssembly対応・AI機能との統合など、2026年も新機能が続々と追加されている。公式ブログ（medium.com/flutter）やFlutter公式YouTubeチャンネルを定期的にチェックして、最新情報を把握しておくことを推奨する。


---

## スキルアップ・キャリアアップのおすすめリソース

Flutterのクロスプラットフォーム開発スキルは、モバイルアプリ市場で高く評価される。

### 転職・キャリアアップ
- **[レバテックキャリア](https://levtech.jp)** — ITエンジニア専門の転職エージェント。Flutterエンジニアの求人は増加中。iOS・Android両対応できる人材は希少で高単価案件も多い。無料相談可能。
- **[Findy](https://findy-job.com)** — GitHubのFlutterプロジェクトが評価対象。スカウト型でモバイル・クロスプラットフォーム開発の求人が届きやすい。リモート求人が充実。

### オンライン学習
- **[Udemy](https://www.udemy.com)** — Flutter・Dart入門から応用（Riverpod・Firebase・BLoC）まで実践コースが充実。実際のアプリ開発を通じてスキルを習得できる。セール時は大幅割引。
