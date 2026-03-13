---
title: "SwiftUIで始めるiOSアプリ開発実践ガイド2026"
description: "SwiftUIを使ったiOSアプリ開発の実践方法を解説。宣言的UI構築、データフロー（@State/@Binding/@Observable）、NavigationStack、Swift Concurrency連携まで最新のコード例付きで紹介します。"
pubDate: "2026-03-09"
tags: ["iOS", "Swift", "mobile", "エンジニア"]
heroImage: '../../assets/thumbnails/swiftui-ios-development-guide-2026.jpg'
---

## はじめに

SwiftUIは、Appleが2019年のWWDCで発表した宣言的UIフレームワークである。2026年現在、SwiftUIはiOS・macOS・watchOS・tvOS・visionOSの全プラットフォームで統一的なUI構築手段として定着した。UIKitの命令的なアプローチと異なり、「UIがどう見えるべきか」を記述するだけで、フレームワークが差分更新を自動処理する。

本記事では、SwiftUIの基礎から実践的なアプリ構築まで、2026年時点の最新APIを踏まえて体系的に解説する。Swift Concurrency（async/await）との統合、SwiftDataによるデータ永続化、NavigationStackによる画面遷移など、実務で必要となる知識を網羅する。

### 対象読者

- iOSアプリ開発をこれから始めるエンジニア
- UIKitからSwiftUIへ移行を検討している開発者
- SwiftUIの最新APIをキャッチアップしたい中級者

### 前提環境

| 項目 | バージョン |
|------|-----------|
| Xcode | 17.0以降 |
| Swift | 6.0以降 |
| 最低デプロイターゲット | iOS 17.0 |
| macOS（開発機） | macOS 15 Sequoia以降 |

## SwiftUIの基本概念 - View Protocol

SwiftUIのすべてのUI要素は`View`プロトコルに準拠する。`View`プロトコルが要求するのは`body`プロパティただ1つである。

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("SwiftUI実践ガイド")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("2026年版の包括的なガイドです")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Image(systemName: "swift")
                .font(.system(size: 60))
                .foregroundStyle(.orange)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
```

`some View`はOpaque Return Typeと呼ばれる仕組みで、具体的な型を隠蔽しつつコンパイラに型推論を委ねる。これにより、複雑にネストしたView階層でも型安全性が維持される。

### レイアウトの基本 - Stack系コンテナ

SwiftUIのレイアウトは3つの基本スタックで構成する。

```swift
struct LayoutBasicsView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 水平方向の配置
            HStack(spacing: 8) {
                Image(systemName: "person.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.blue)

                VStack(alignment: .leading) {
                    Text("山田太郎")
                        .font(.headline)
                    Text("iOSエンジニア")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Text("オンライン")
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.green.opacity(0.2))
                    .clipShape(Capsule())
            }

            Divider()

            // ZStackで重ね合わせ
            ZStack(alignment: .bottomTrailing) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(.blue.gradient)
                    .frame(height: 120)

                Text("プロフィールカード")
                    .font(.caption)
                    .padding(8)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .padding(8)
            }
        }
        .padding()
    }
}
```

| スタック | 方向 | 主な用途 |
|---------|------|---------|
| `VStack` | 垂直方向 | リスト的なレイアウト |
| `HStack` | 水平方向 | ツールバー、行アイテム |
| `ZStack` | 奥行き方向 | オーバーレイ、バッジ |

## データフロー - Property Wrappers

SwiftUIの核心はリアクティブなデータフローにある。データが変更されると、それを参照しているViewが自動的に再描画される。この仕組みを支えるのがProperty Wrappersである。

### @State - ローカル状態管理

`@State`はView内部のローカルな状態を管理する。値が変わるとViewが再描画される。

```swift
struct CounterView: View {
    @State private var count = 0
    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: 20) {
            Text("\(count)")
                .font(.system(size: 72, weight: .bold, design: .rounded))
                .scaleEffect(isAnimating ? 1.2 : 1.0)
                .animation(.spring(duration: 0.3), value: isAnimating)

            HStack(spacing: 16) {
                Button("減らす") {
                    count -= 1
                    triggerAnimation()
                }
                .buttonStyle(.bordered)

                Button("リセット") {
                    count = 0
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)

                Button("増やす") {
                    count += 1
                    triggerAnimation()
                }
                .buttonStyle(.bordered)
            }
        }
        .padding()
    }

    private func triggerAnimation() {
        isAnimating = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            isAnimating = false
        }
    }
}
```

### @Binding - 親子間のデータ共有

`@Binding`は親Viewが持つ`@State`への参照を子Viewに渡す仕組みである。子Viewが値を変更すると、親Viewの状態も更新される。

```swift
struct SettingsView: View {
    @State private var isDarkMode = false
    @State private var fontSize: Double = 16
    @State private var notificationsEnabled = true

    var body: some View {
        Form {
            Section("表示設定") {
                ToggleRow(
                    title: "ダークモード",
                    icon: "moon.fill",
                    isOn: $isDarkMode
                )

                SliderRow(
                    title: "フォントサイズ",
                    value: $fontSize,
                    range: 12...24
                )
            }

            Section("通知") {
                ToggleRow(
                    title: "通知を有効化",
                    icon: "bell.fill",
                    isOn: $notificationsEnabled
                )
            }
        }
    }
}

struct ToggleRow: View {
    let title: String
    let icon: String
    @Binding var isOn: Bool

    var body: some View {
        Toggle(isOn: $isOn) {
            Label(title, systemImage: icon)
        }
    }
}

struct SliderRow: View {
    let title: String
    @Binding var value: Double
    let range: ClosedRange<Double>

    var body: some View {
        VStack(alignment: .leading) {
            Text("\(title): \(Int(value))pt")
                .font(.subheadline)
            Slider(value: $value, in: range, step: 1)
        }
    }
}
```

### @Observable - iOS 17以降の推奨パターン

iOS 17で導入された`@Observable`マクロは、従来の`ObservableObject`プロトコルと`@Published`を置き換える。コードが大幅に簡潔になり、パフォーマンスも向上する。

```swift
import SwiftUI
import Observation

@Observable
class TaskStore {
    var tasks: [TaskItem] = []
    var filterText: String = ""

    var filteredTasks: [TaskItem] {
        if filterText.isEmpty {
            return tasks
        }
        return tasks.filter {
            $0.title.localizedCaseInsensitiveContains(filterText)
        }
    }

    func addTask(title: String) {
        let task = TaskItem(title: title)
        tasks.append(task)
    }

    func toggleCompletion(for task: TaskItem) {
        if let index = tasks.firstIndex(where: { $0.id == task.id }) {
            tasks[index].isCompleted.toggle()
        }
    }

    func deleteTask(at offsets: IndexSet) {
        tasks.remove(atOffsets: offsets)
    }
}

struct TaskItem: Identifiable {
    let id = UUID()
    var title: String
    var isCompleted: Bool = false
    var createdAt: Date = .now
}
```

`@Observable`を使うViewは以下のようになる。

```swift
struct TaskListView: View {
    @State private var store = TaskStore()
    @State private var newTaskTitle = ""
    @State private var showingAddSheet = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.filteredTasks) { task in
                    TaskRow(task: task) {
                        store.toggleCompletion(for: task)
                    }
                }
                .onDelete(perform: store.deleteTask)
            }
            .searchable(text: $store.filterText, prompt: "タスクを検索")
            .navigationTitle("タスク一覧")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("追加", systemImage: "plus") {
                        showingAddSheet = true
                    }
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                AddTaskSheet(store: store)
            }
        }
    }
}

struct TaskRow: View {
    let task: TaskItem
    let onToggle: () -> Void

    var body: some View {
        HStack {
            Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(task.isCompleted ? .green : .secondary)
                .onTapGesture { onToggle() }

            VStack(alignment: .leading) {
                Text(task.title)
                    .strikethrough(task.isCompleted)
                Text(task.createdAt, style: .relative)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
```

### @Environment - 環境値の注入

`@Environment`はViewツリー全体で共有される値にアクセスする仕組みである。システム提供の値（カラースキーム、サイズクラスなど）や、カスタム値を注入できる。

```swift
struct ThemeAwareView: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 16) {
            Text("現在のテーマ: \(colorScheme == .dark ? "ダーク" : "ライト")")
                .font(.headline)

            Text("サイズクラス: \(sizeClass == .compact ? "コンパクト" : "レギュラー")")
                .font(.subheadline)

            Button("閉じる") {
                dismiss()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .background(colorScheme == .dark ? Color.black : Color.white)
    }
}
```

## NavigationStack - 画面遷移の実装

iOS 16以降、`NavigationView`は非推奨となり、`NavigationStack`が推奨される。型安全な画面遷移とプログラマティックなナビゲーション制御が可能になった。

```swift
struct AppNavigationView: View {
    @State private var navigationPath = NavigationPath()

    var body: some View {
        NavigationStack(path: $navigationPath) {
            List {
                Section("メニュー") {
                    NavigationLink(value: Route.profile) {
                        Label("プロフィール", systemImage: "person")
                    }

                    NavigationLink(value: Route.settings) {
                        Label("設定", systemImage: "gear")
                    }

                    NavigationLink(value: Route.articleDetail(id: 42)) {
                        Label("記事詳細（ID: 42）", systemImage: "doc.text")
                    }
                }
            }
            .navigationTitle("ホーム")
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .profile:
                    ProfileDetailView()
                case .settings:
                    AppSettingsView()
                case .articleDetail(let id):
                    ArticleDetailView(articleId: id)
                }
            }
        }
    }
}

enum Route: Hashable {
    case profile
    case settings
    case articleDetail(id: Int)
}

struct ArticleDetailView: View {
    let articleId: Int

    var body: some View {
        Text("記事ID: \(articleId)")
            .navigationTitle("記事詳細")
    }
}
```

`NavigationPath`を`@State`で保持することで、プログラムからの画面遷移制御（ディープリンク対応など）も容易になる。

## Lists & Grids - コレクション表示

### Listの基本と高度なカスタマイズ

```swift
struct ArticleListView: View {
    @State private var articles = Article.sampleData
    @State private var selectedArticle: Article?

    var body: some View {
        NavigationStack {
            List(articles, selection: $selectedArticle) { article in
                NavigationLink(value: article) {
                    ArticleCardView(article: article)
                }
                .swipeActions(edge: .trailing) {
                    Button(role: .destructive) {
                        withAnimation {
                            articles.removeAll { $0.id == article.id }
                        }
                    } label: {
                        Label("削除", systemImage: "trash")
                    }

                    Button {
                        // ブックマーク処理
                    } label: {
                        Label("保存", systemImage: "bookmark")
                    }
                    .tint(.blue)
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("記事一覧")
        }
    }
}

struct ArticleCardView: View {
    let article: Article

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(article.title)
                .font(.headline)
                .lineLimit(2)

            Text(article.summary)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(3)

            HStack {
                Label(article.author, systemImage: "person")
                Spacer()
                Label(article.readTime, systemImage: "clock")
            }
            .font(.caption)
            .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }
}

struct Article: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let summary: String
    let author: String
    let readTime: String

    static let sampleData: [Article] = [
        Article(title: "SwiftUI最新アップデート", summary: "WWDC26で発表された新機能を解説", author: "田中", readTime: "5分"),
        Article(title: "Swift Concurrency実践", summary: "async/awaitの実践的な使い方", author: "佐藤", readTime: "8分"),
        Article(title: "SwiftData入門", summary: "Core Dataの後継フレームワーク", author: "鈴木", readTime: "10分")
    ]
}
```

### LazyVGrid / LazyHGridによるグリッドレイアウト

```swift
struct PhotoGridView: View {
    let columns = [
        GridItem(.adaptive(minimum: 100, maximum: 200), spacing: 8)
    ]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(0..<30, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(hue: Double(index) / 30.0, saturation: 0.6, brightness: 0.9))
                        .aspectRatio(1, contentMode: .fit)
                        .overlay {
                            Text("\(index + 1)")
                                .font(.headline)
                                .foregroundStyle(.white)
                        }
                }
            }
            .padding()
        }
        .navigationTitle("フォトグリッド")
    }
}
```

## Swift Concurrency連携 - async/awaitとSwiftUI

SwiftUIはSwift Concurrencyとシームレスに統合されている。`.task`モディファイアを使えば、View表示時に非同期処理を安全に実行できる。

```swift
@Observable
class ArticleViewModel {
    var articles: [RemoteArticle] = []
    var isLoading = false
    var errorMessage: String?

    func fetchArticles() async {
        isLoading = true
        errorMessage = nil

        do {
            let url = URL(string: "https://api.example.com/articles")!
            let (data, response) = try await URLSession.shared.data(from: url)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw APIError.invalidResponse
            }

            let decoded = try JSONDecoder().decode([RemoteArticle].self, from: data)

            // MainActorで安全にUIを更新
            self.articles = decoded
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
}

struct RemoteArticle: Codable, Identifiable {
    let id: Int
    let title: String
    let body: String
}

enum APIError: LocalizedError {
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "サーバーからの応答が不正です"
        }
    }
}

struct AsyncArticleListView: View {
    @State private var viewModel = ArticleViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView("読み込み中...")
                } else if let error = viewModel.errorMessage {
                    ContentUnavailableView(
                        "読み込みに失敗しました",
                        systemImage: "exclamationmark.triangle",
                        description: Text(error)
                    )
                } else {
                    List(viewModel.articles) { article in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(article.title)
                                .font(.headline)
                            Text(article.body)
                                .font(.body)
                                .foregroundStyle(.secondary)
                                .lineLimit(3)
                        }
                    }
                }
            }
            .navigationTitle("記事一覧")
            .task {
                await viewModel.fetchArticles()
            }
            .refreshable {
                await viewModel.fetchArticles()
            }
        }
    }
}
```

`.task`モディファイアはViewのライフサイクルに連動し、Viewが消えるとタスクが自動キャンセルされる。`.refreshable`を使えばプルトゥリフレッシュの実装もワンライナーである。

## SwiftData - データ永続化

SwiftDataはCore Dataの後継として位置づけられるデータ永続化フレームワークである。Swiftマクロを活用した宣言的なモデル定義が特徴である。

```swift
import SwiftData

@Model
class Project {
    var name: String
    var projectDescription: String
    var createdAt: Date
    var isArchived: Bool

    @Relationship(deleteRule: .cascade)
    var tasks: [ProjectTask] = []

    init(name: String, description: String) {
        self.name = name
        self.projectDescription = description
        self.createdAt = .now
        self.isArchived = false
    }
}

@Model
class ProjectTask {
    var title: String
    var isCompleted: Bool
    var dueDate: Date?
    var priority: Int

    var project: Project?

    init(title: String, priority: Int = 0) {
        self.title = title
        self.isCompleted = false
        self.priority = priority
    }
}
```

### SwiftDataとSwiftUIの統合

```swift
@main
struct ProjectManagerApp: App {
    var body: some Scene {
        WindowGroup {
            ProjectListView()
        }
        .modelContainer(for: [Project.self, ProjectTask.self])
    }
}

struct ProjectListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Project.createdAt, order: .reverse) private var projects: [Project]
    @State private var showingNewProject = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(projects) { project in
                    NavigationLink(value: project) {
                        VStack(alignment: .leading) {
                            Text(project.name)
                                .font(.headline)

                            HStack {
                                Text("タスク: \(project.tasks.count)")
                                Text("完了: \(project.tasks.filter(\.isCompleted).count)")
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        }
                    }
                }
                .onDelete(perform: deleteProjects)
            }
            .navigationTitle("プロジェクト")
            .toolbar {
                Button("新規作成", systemImage: "plus") {
                    showingNewProject = true
                }
            }
            .sheet(isPresented: $showingNewProject) {
                NewProjectView()
            }
            .navigationDestination(for: Project.self) { project in
                ProjectDetailView(project: project)
            }
        }
    }

    private func deleteProjects(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(projects[index])
        }
    }
}

struct NewProjectView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var description = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("プロジェクト名", text: $name)
                TextField("説明", text: $description, axis: .vertical)
                    .lineLimit(3...6)
            }
            .navigationTitle("新規プロジェクト")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("作成") {
                        let project = Project(name: name, description: description)
                        modelContext.insert(project)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
}
```

`@Query`マクロはSwiftDataからのデータ取得を宣言的に記述する。ソート順やフィルタ条件をコンパイル時に型安全に指定できる。

## アニメーション - 滑らかなUI体験

SwiftUIのアニメーションは宣言的に記述する。`withAnimation`ブロックか`.animation`モディファイアで、状態変更に伴うUI変化を自動的にアニメーションさせる。

```swift
struct AnimationShowcaseView: View {
    @State private var isExpanded = false
    @State private var rotation: Double = 0
    @State private var items: [String] = ["Swift", "Kotlin", "Dart"]

    var body: some View {
        VStack(spacing: 24) {
            // 暗黙的アニメーション
            RoundedRectangle(cornerRadius: isExpanded ? 24 : 12)
                .fill(.blue.gradient)
                .frame(
                    width: isExpanded ? 300 : 150,
                    height: isExpanded ? 200 : 100
                )
                .animation(.spring(duration: 0.5, bounce: 0.3), value: isExpanded)
                .onTapGesture {
                    isExpanded.toggle()
                }

            // 明示的アニメーション
            Image(systemName: "gear")
                .font(.largeTitle)
                .rotationEffect(.degrees(rotation))

            Button("回転") {
                withAnimation(.easeInOut(duration: 0.8)) {
                    rotation += 360
                }
            }
            .buttonStyle(.bordered)

            // リストの挿入・削除アニメーション
            VStack {
                ForEach(items, id: \.self) { item in
                    Text(item)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .transition(.asymmetric(
                            insertion: .slide.combined(with: .opacity),
                            removal: .scale.combined(with: .opacity)
                        ))
                }

                Button("アイテム追加") {
                    withAnimation(.spring) {
                        items.append("言語\(items.count + 1)")
                    }
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }
}
```

### カスタムトランジション

```swift
struct CardFlipTransition: ViewModifier {
    let isFlipped: Bool

    func body(content: Content) -> some View {
        content
            .rotation3DEffect(
                .degrees(isFlipped ? 180 : 0),
                axis: (x: 0, y: 1, z: 0)
            )
            .opacity(isFlipped ? 0 : 1)
    }
}

extension AnyTransition {
    static var cardFlip: AnyTransition {
        .modifier(
            active: CardFlipTransition(isFlipped: true),
            identity: CardFlipTransition(isFlipped: false)
        )
    }
}
```

## Previews - 開発効率の最大化

Xcode Previewsは開発サイクルを劇的に短縮する。複数のプレビュー構成を並べて表示し、異なる条件でのUIを同時に確認できる。

```swift
#Preview("ライトモード") {
    TaskListView()
        .preferredColorScheme(.light)
}

#Preview("ダークモード") {
    TaskListView()
        .preferredColorScheme(.dark)
}

#Preview("大きいフォント") {
    TaskListView()
        .dynamicTypeSize(.xxxLarge)
}

#Preview("ランドスケープ", traits: .landscapeLeft) {
    TaskListView()
}
```

`#Preview`マクロはiOS 17で導入され、従来の`PreviewProvider`プロトコルよりも簡潔に記述できる。

## アプリアーキテクチャ - MVVM実践

SwiftUIアプリケーションでは、MVVMパターンが自然にフィットする。`@Observable`を使ったViewModelが状態を管理し、Viewは表示に専念する。

```swift
// Model
struct User: Codable, Identifiable {
    let id: Int
    let name: String
    let email: String
    let avatarURL: URL?
}

// ViewModel
@Observable
class UserProfileViewModel {
    var user: User?
    var isLoading = false
    var error: String?

    private let userService: UserServiceProtocol

    init(userService: UserServiceProtocol = UserService()) {
        self.userService = userService
    }

    func loadProfile(userId: Int) async {
        isLoading = true
        error = nil

        do {
            user = try await userService.fetchUser(id: userId)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func updateName(_ newName: String) async {
        guard var currentUser = user else { return }

        do {
            let updated = User(
                id: currentUser.id,
                name: newName,
                email: currentUser.email,
                avatarURL: currentUser.avatarURL
            )
            try await userService.updateUser(updated)
            user = updated
        } catch {
            self.error = "更新に失敗しました: \(error.localizedDescription)"
        }
    }
}

// Service Protocol（テスタビリティ確保）
protocol UserServiceProtocol {
    func fetchUser(id: Int) async throws -> User
    func updateUser(_ user: User) async throws
}

struct UserService: UserServiceProtocol {
    func fetchUser(id: Int) async throws -> User {
        let url = URL(string: "https://api.example.com/users/\(id)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(User.self, from: data)
    }

    func updateUser(_ user: User) async throws {
        var request = URLRequest(url: URL(string: "https://api.example.com/users/\(user.id)")!)
        request.httpMethod = "PUT"
        request.httpBody = try JSONEncoder().encode(user)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let (_, _) = try await URLSession.shared.data(for: request)
    }
}

// View
struct UserProfileView: View {
    @State private var viewModel = UserProfileViewModel()
    let userId: Int

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
            } else if let user = viewModel.user {
                Form {
                    Section("基本情報") {
                        LabeledContent("名前", value: user.name)
                        LabeledContent("メール", value: user.email)
                    }
                }
            } else if let error = viewModel.error {
                ContentUnavailableView(
                    "エラー",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            }
        }
        .navigationTitle("プロフィール")
        .task {
            await viewModel.loadProfile(userId: userId)
        }
    }
}
```

### テスト戦略

ViewModelをプロトコル経由でサービスに依存させることで、テスト時にモックを注入できる。

```swift
struct MockUserService: UserServiceProtocol {
    var mockUser: User?
    var shouldThrow = false

    func fetchUser(id: Int) async throws -> User {
        if shouldThrow {
            throw NSError(domain: "test", code: -1)
        }
        return mockUser ?? User(id: id, name: "テストユーザー", email: "test@example.com", avatarURL: nil)
    }

    func updateUser(_ user: User) async throws {
        if shouldThrow {
            throw NSError(domain: "test", code: -1)
        }
    }
}

// XCTestでの使用例
// let mockService = MockUserService(mockUser: testUser)
// let viewModel = UserProfileViewModel(userService: mockService)
// await viewModel.loadProfile(userId: 1)
// XCTAssertEqual(viewModel.user?.name, "テストユーザー")
```

## まとめ

SwiftUIは2026年現在、iOS開発における標準的なUIフレームワークとしての地位を確立した。本記事で解説した内容を整理する。

| トピック | ポイント |
|---------|---------|
| View Protocol | `body`プロパティで宣言的にUI記述 |
| @State / @Binding | ローカル状態と親子間データ共有 |
| @Observable | iOS 17以降の推奨。ObservableObject置き換え |
| NavigationStack | 型安全な画面遷移、プログラマティック制御 |
| Swift Concurrency | `.task`と`async/await`のシームレス統合 |
| SwiftData | Core Data後継の宣言的データ永続化 |
| Animation | `withAnimation`と`.animation`の使い分け |
| MVVM | ViewModelにロジック集約、テスタビリティ確保 |

SwiftUIを学ぶ際は、まず小さなViewを作ることから始めるとよい。`@State`でローカルな状態管理を習得し、`@Observable`でデータフローの全体像を掴んだ上で、NavigationStackやSwiftDataへと段階的にステップアップしていくことを推奨する。Xcode Previewsを活用すれば、ビルド・実行のサイクルを大幅に短縮し、効率的な開発フローを構築できる。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
