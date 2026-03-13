---
title: "Kotlin Multiplatformでクロスプラットフォーム開発入門"
description: "Kotlin Multiplatform（KMP）を使ったクロスプラットフォーム開発の方法を解説。共有ロジックの設計、expect/actual宣言、Compose Multiplatform、iOS/Android/デスクトップ対応まで実践コード付きで紹介します。"
pubDate: "2026-03-09"
tags: ["Kotlin", "mobile", "cross-platform", "エンジニア"]
heroImage: '../../assets/thumbnails/kotlin-multiplatform-cross-platform-guide-2026.jpg'
---

## はじめに

モバイルアプリ開発において、iOS/Androidの両プラットフォーム対応は避けて通れない課題だ。Flutter、React Nativeなどのクロスプラットフォームフレームワークが台頭する中、JetBrainsが推進するKotlin Multiplatform（KMP）は独自のアプローチで注目を集めている。

KMPの最大の特徴は「UIは各プラットフォームのネイティブ技術で実装し、ビジネスロジックのみを共有する」という戦略だ。さらにCompose Multiplatformの登場により、UIの共有も選択肢に加わった。

この記事では、KMPの基本概念からプロジェクト構成、expect/actual宣言、Compose Multiplatform、ネットワーク通信、ローカルストレージまで、実践的なコード付きで解説する。

---

## Kotlin Multiplatformとは

### 基本概念

Kotlin Multiplatform（KMP）は、Kotlinで書いたコードを複数のプラットフォーム（JVM、Native、JS/WASM）にコンパイルする技術だ。2023年にStable版がリリースされ、Google公式にもAndroid開発で推奨されている。

KMPの核となる考え方は以下の通りだ。

| 概念 | 説明 |
|------|------|
| **共有コード（commonMain）** | 全プラットフォームで共有するビジネスロジック |
| **プラットフォーム固有コード** | 各プラットフォーム専用の実装 |
| **expect/actual** | 共有コードからプラットフォーム固有機能を呼び出す仕組み |
| **ソースセット** | コードの階層構造（common → intermediate → platform） |

### クロスプラットフォーム技術の比較

| 比較項目 | Kotlin Multiplatform | Flutter | React Native |
|---------|---------------------|---------|-------------|
| **言語** | Kotlin | Dart | JavaScript/TypeScript |
| **UI共有** | Compose Multiplatform（選択可） | 完全共有 | 完全共有 |
| **ネイティブUI** | 各プラットフォームのUI技術を使用可能 | 独自レンダリング | ネイティブコンポーネントにブリッジ |
| **パフォーマンス** | ネイティブ同等 | 高い（Skia） | ブリッジ経由でやや劣る |
| **既存アプリへの導入** | 段階的に導入可能 | 全面書き換えが基本 | 部分的に導入可能 |
| **プラットフォーム** | Android, iOS, Desktop, Web | Android, iOS, Web, Desktop | Android, iOS |
| **エコシステム** | Kotlin/JVM資産を活用 | 独自エコシステム | npm資産を活用 |
| **学習コスト** | Kotlin経験者なら低い | Dart学習が必要 | JS/TS経験者なら低い |
| **Google公式サポート** | 推奨 | 推奨 | なし |

### KMPが適しているケース

- 既存のAndroid（Kotlin）アプリにiOS対応を追加したい
- ビジネスロジックの品質を統一しつつ、UIはネイティブの操作感を維持したい
- 段階的にクロスプラットフォーム化を進めたい
- Kotlin/JVMエコシステムのライブラリ資産を活用したい

---

## プロジェクトセットアップ

### KMPプロジェクトの作成

JetBrainsが提供するKotlin Multiplatform Wizardを使うか、Android Studioのテンプレートからプロジェクトを作成する。

```bash
# Kotlin Multiplatform Wizard（Webベース）
# https://kmp.jetbrains.com/ にアクセスしてプロジェクトを生成

# または Fleet / Android Studio でプロジェクトを作成
```

### プロジェクト構造

KMPプロジェクトの典型的なディレクトリ構造を示す。

```
my-kmp-app/
├── build.gradle.kts             # ルートビルドファイル
├── settings.gradle.kts
├── composeApp/                  # Compose Multiplatform アプリ
│   ├── build.gradle.kts
│   └── src/
│       ├── commonMain/          # 共有コード
│       │   └── kotlin/
│       │       ├── App.kt
│       │       └── Platform.kt
│       ├── androidMain/         # Android固有コード
│       │   └── kotlin/
│       │       └── Platform.android.kt
│       ├── iosMain/             # iOS固有コード
│       │   └── kotlin/
│       │       └── Platform.ios.kt
│       └── desktopMain/         # デスクトップ固有コード
│           └── kotlin/
│               └── Platform.desktop.kt
├── shared/                      # 共有ライブラリモジュール
│   ├── build.gradle.kts
│   └── src/
│       ├── commonMain/
│       ├── commonTest/
│       ├── androidMain/
│       ├── iosMain/
│       └── desktopMain/
├── androidApp/                  # Androidアプリ（ネイティブUIの場合）
├── iosApp/                      # iOSアプリ（Xcodeプロジェクト）
└── desktopApp/                  # デスクトップアプリ
```

### Gradle設定

```kotlin
// shared/build.gradle.kts
plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidLibrary)
    alias(libs.plugins.kotlinSerialization)
}

kotlin {
    // ターゲットプラットフォームの定義
    androidTarget {
        compilations.all {
            kotlinOptions {
                jvmTarget = "17"
            }
        }
    }

    listOf(
        iosX64(),
        iosArm64(),
        iosSimulatorArm64()
    ).forEach {
        it.binaries.framework {
            baseName = "shared"
            isStatic = true
        }
    }

    jvm("desktop")

    sourceSets {
        val commonMain by getting {
            dependencies {
                // Ktor（HTTP通信）
                implementation(libs.ktor.client.core)
                implementation(libs.ktor.client.content.negotiation)
                implementation(libs.ktor.serialization.kotlinx.json)

                // Kotlinx（シリアライゼーション・コルーチン・日時）
                implementation(libs.kotlinx.serialization.json)
                implementation(libs.kotlinx.coroutines.core)
                implementation(libs.kotlinx.datetime)

                // SQLDelight（ローカルDB）
                implementation(libs.sqldelight.runtime)
                implementation(libs.sqldelight.coroutines)

                // Koin（DI）
                implementation(libs.koin.core)
            }
        }

        val commonTest by getting {
            dependencies {
                implementation(libs.kotlin.test)
                implementation(libs.kotlinx.coroutines.test)
            }
        }

        val androidMain by getting {
            dependencies {
                implementation(libs.ktor.client.android)
                implementation(libs.sqldelight.android.driver)
                implementation(libs.koin.android)
            }
        }

        val iosMain by creating {
            dependsOn(commonMain)
            dependencies {
                implementation(libs.ktor.client.darwin)
                implementation(libs.sqldelight.native.driver)
            }
        }

        val desktopMain by getting {
            dependencies {
                implementation(libs.ktor.client.cio)
                implementation(libs.sqldelight.sqlite.driver)
            }
        }
    }
}

android {
    namespace = "com.example.shared"
    compileSdk = 35
    defaultConfig {
        minSdk = 26
    }
}
```

---

## expect/actual宣言

KMPの中核機能であるexpect/actualは、共有コードからプラットフォーム固有の実装を呼び出すための仕組みだ。

### 基本的なexpect/actual

```kotlin
// commonMain/kotlin/Platform.kt
expect class Platform {
    val name: String
    val version: String
}

expect fun getPlatform(): Platform
```

```kotlin
// androidMain/kotlin/Platform.android.kt
import android.os.Build

actual class Platform {
    actual val name: String = "Android"
    actual val version: String = "${Build.VERSION.SDK_INT}"
}

actual fun getPlatform(): Platform = Platform()
```

```kotlin
// iosMain/kotlin/Platform.ios.kt
import platform.UIKit.UIDevice

actual class Platform {
    actual val name: String = "iOS"
    actual val version: String = UIDevice.currentDevice.systemVersion
}

actual fun getPlatform(): Platform = Platform()
```

```kotlin
// desktopMain/kotlin/Platform.desktop.kt
actual class Platform {
    actual val name: String = "Desktop"
    actual val version: String = System.getProperty("os.version") ?: "unknown"
}

actual fun getPlatform(): Platform = Platform()
```

### UUIDの生成

```kotlin
// commonMain/kotlin/util/Uuid.kt
expect fun generateUuid(): String
```

```kotlin
// androidMain/kotlin/util/Uuid.android.kt
import java.util.UUID

actual fun generateUuid(): String = UUID.randomUUID().toString()
```

```kotlin
// iosMain/kotlin/util/Uuid.ios.kt
import platform.Foundation.NSUUID

actual fun generateUuid(): String = NSUUID().UUIDString()
```

```kotlin
// desktopMain/kotlin/util/Uuid.desktop.kt
import java.util.UUID

actual fun generateUuid(): String = UUID.randomUUID().toString()
```

### ファイルストレージ

```kotlin
// commonMain/kotlin/storage/FileStorage.kt
expect class FileStorage {
    fun read(path: String): String?
    fun write(path: String, content: String)
    fun delete(path: String): Boolean
}
```

```kotlin
// androidMain/kotlin/storage/FileStorage.android.kt
import android.content.Context
import java.io.File

actual class FileStorage(private val context: Context) {
    actual fun read(path: String): String? {
        val file = File(context.filesDir, path)
        return if (file.exists()) file.readText() else null
    }

    actual fun write(path: String, content: String) {
        val file = File(context.filesDir, path)
        file.parentFile?.mkdirs()
        file.writeText(content)
    }

    actual fun delete(path: String): Boolean {
        return File(context.filesDir, path).delete()
    }
}
```

```kotlin
// iosMain/kotlin/storage/FileStorage.ios.kt
import platform.Foundation.*

actual class FileStorage {
    private val fileManager = NSFileManager.defaultManager
    private val documentsPath: String
        get() {
            val paths = NSSearchPathForDirectoriesInDomains(
                NSDocumentDirectory,
                NSUserDomainMask,
                true
            )
            return paths.first() as String
        }

    actual fun read(path: String): String? {
        val fullPath = "$documentsPath/$path"
        return NSString.stringWithContentsOfFile(
            fullPath,
            encoding = NSUTF8StringEncoding,
            error = null
        )
    }

    actual fun write(path: String, content: String) {
        val fullPath = "$documentsPath/$path"
        (content as NSString).writeToFile(
            fullPath,
            atomically = true,
            encoding = NSUTF8StringEncoding,
            error = null
        )
    }

    actual fun delete(path: String): Boolean {
        val fullPath = "$documentsPath/$path"
        return fileManager.removeItemAtPath(fullPath, error = null)
    }
}
```

---

## 共有ビジネスロジックの設計

### データモデル

```kotlin
// commonMain/kotlin/model/User.kt
import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

@Serializable
data class User(
    val id: Long,
    val name: String,
    val email: String,
    val avatarUrl: String? = null,
    val role: UserRole = UserRole.USER,
    val createdAt: Instant,
)

@Serializable
enum class UserRole {
    ADMIN, EDITOR, USER
}
```

```kotlin
// commonMain/kotlin/model/Post.kt
import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

@Serializable
data class Post(
    val id: Long,
    val title: String,
    val body: String,
    val authorId: Long,
    val status: PostStatus = PostStatus.DRAFT,
    val tags: List<String> = emptyList(),
    val createdAt: Instant,
    val updatedAt: Instant,
)

@Serializable
enum class PostStatus {
    DRAFT, PUBLISHED, ARCHIVED
}
```

```kotlin
// commonMain/kotlin/model/ApiResponse.kt
import kotlinx.serialization.Serializable

@Serializable
data class ApiResponse<T>(
    val data: T,
    val message: String? = null,
)

@Serializable
data class PaginatedResponse<T>(
    val data: List<T>,
    val total: Int,
    val page: Int,
    val limit: Int,
)
```

### リポジトリパターン

```kotlin
// commonMain/kotlin/repository/UserRepository.kt
import kotlinx.coroutines.flow.Flow

interface UserRepository {
    suspend fun getUsers(page: Int = 1, limit: Int = 20): PaginatedResponse<User>
    suspend fun getUser(id: Long): User
    suspend fun createUser(name: String, email: String): User
    suspend fun updateUser(id: Long, name: String?, email: String?): User
    suspend fun deleteUser(id: Long)
    fun observeUsers(): Flow<List<User>>
}
```

```kotlin
// commonMain/kotlin/repository/UserRepositoryImpl.kt
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class UserRepositoryImpl(
    private val apiClient: ApiClient,
    private val userDao: UserDao,
) : UserRepository {

    private val _usersFlow = MutableStateFlow<List<User>>(emptyList())

    override suspend fun getUsers(page: Int, limit: Int): PaginatedResponse<User> {
        return try {
            val response = apiClient.getUsers(page, limit)
            // ローカルキャッシュを更新
            userDao.insertAll(response.data)
            _usersFlow.value = userDao.getAll()
            response
        } catch (e: Exception) {
            // オフライン時はローカルデータを返す
            val localUsers = userDao.getAll()
            PaginatedResponse(
                data = localUsers,
                total = localUsers.size,
                page = 1,
                limit = localUsers.size
            )
        }
    }

    override suspend fun getUser(id: Long): User {
        return try {
            val user = apiClient.getUser(id)
            userDao.insert(user)
            user
        } catch (e: Exception) {
            userDao.getById(id) ?: throw e
        }
    }

    override suspend fun createUser(name: String, email: String): User {
        val user = apiClient.createUser(name, email)
        userDao.insert(user)
        _usersFlow.value = userDao.getAll()
        return user
    }

    override suspend fun updateUser(id: Long, name: String?, email: String?): User {
        val user = apiClient.updateUser(id, name, email)
        userDao.insert(user)
        _usersFlow.value = userDao.getAll()
        return user
    }

    override suspend fun deleteUser(id: Long) {
        apiClient.deleteUser(id)
        userDao.delete(id)
        _usersFlow.value = userDao.getAll()
    }

    override fun observeUsers(): Flow<List<User>> = _usersFlow.asStateFlow()
}
```

### ユースケース（ドメイン層）

```kotlin
// commonMain/kotlin/usecase/GetUsersUseCase.kt
class GetUsersUseCase(
    private val userRepository: UserRepository,
) {
    suspend operator fun invoke(
        page: Int = 1,
        limit: Int = 20,
    ): Result<PaginatedResponse<User>> {
        return runCatching {
            userRepository.getUsers(page, limit)
        }
    }
}

// commonMain/kotlin/usecase/CreateUserUseCase.kt
class CreateUserUseCase(
    private val userRepository: UserRepository,
) {
    suspend operator fun invoke(
        name: String,
        email: String,
    ): Result<User> {
        // バリデーション
        require(name.isNotBlank()) { "Name must not be blank" }
        require(email.contains("@")) { "Invalid email format" }

        return runCatching {
            userRepository.createUser(name, email)
        }
    }
}
```

---

## Ktor Clientによるネットワーク通信

### HTTPクライアントの設定

```kotlin
// commonMain/kotlin/network/ApiClient.kt
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

class ApiClient(engine: HttpClientEngine) {
    private val baseUrl = "https://api.example.com"

    private val httpClient = HttpClient(engine) {
        // JSONシリアライゼーション
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
                encodeDefaults = true
            })
        }

        // デフォルトリクエスト設定
        defaultRequest {
            contentType(ContentType.Application.Json)
            header("Accept", "application/json")
        }

        // タイムアウト設定
        install(HttpTimeout) {
            requestTimeoutMillis = 30_000
            connectTimeoutMillis = 10_000
            socketTimeoutMillis = 30_000
        }

        // リトライ設定
        install(HttpRequestRetry) {
            retryOnServerErrors(maxRetries = 3)
            exponentialDelay()
        }

        // レスポンスバリデーション
        HttpResponseValidator {
            validateResponse { response ->
                if (response.status.value >= 400) {
                    throw ApiException(
                        statusCode = response.status.value,
                        message = "API error: ${response.status.description}"
                    )
                }
            }
        }
    }

    suspend fun getUsers(page: Int, limit: Int): PaginatedResponse<User> {
        return httpClient.get("$baseUrl/api/users") {
            parameter("page", page)
            parameter("limit", limit)
        }.body()
    }

    suspend fun getUser(id: Long): User {
        val response: ApiResponse<User> = httpClient.get("$baseUrl/api/users/$id").body()
        return response.data
    }

    suspend fun createUser(name: String, email: String): User {
        val response: ApiResponse<User> = httpClient.post("$baseUrl/api/users") {
            setBody(mapOf("name" to name, "email" to email))
        }.body()
        return response.data
    }

    suspend fun updateUser(id: Long, name: String?, email: String?): User {
        val response: ApiResponse<User> = httpClient.put("$baseUrl/api/users/$id") {
            setBody(buildMap {
                name?.let { put("name", it) }
                email?.let { put("email", it) }
            })
        }.body()
        return response.data
    }

    suspend fun deleteUser(id: Long) {
        httpClient.delete("$baseUrl/api/users/$id")
    }
}

class ApiException(val statusCode: Int, override val message: String) : Exception(message)
```

### プラットフォーム別エンジンの提供

```kotlin
// commonMain/kotlin/di/NetworkModule.kt
import org.koin.dsl.module

// expect宣言でエンジンファクトリを定義
expect fun createHttpEngine(): HttpClientEngine

val networkModule = module {
    single { createHttpEngine() }
    single { ApiClient(get()) }
}
```

```kotlin
// androidMain/kotlin/di/NetworkModule.android.kt
import io.ktor.client.engine.android.*

actual fun createHttpEngine(): HttpClientEngine = Android.create {
    connectTimeout = 10_000
    socketTimeout = 30_000
}
```

```kotlin
// iosMain/kotlin/di/NetworkModule.ios.kt
import io.ktor.client.engine.darwin.*

actual fun createHttpEngine(): HttpClientEngine = Darwin.create {
    configureRequest {
        setAllowsCellularAccess(true)
    }
}
```

```kotlin
// desktopMain/kotlin/di/NetworkModule.desktop.kt
import io.ktor.client.engine.cio.*

actual fun createHttpEngine(): HttpClientEngine = CIO.create {
    maxConnectionsCount = 100
    endpoint {
        maxConnectionsPerRoute = 10
        keepAliveTime = 5000
        connectTimeout = 10_000
    }
}
```

---

## SQLDelightによるローカルストレージ

### スキーマ定義

```sql
-- shared/src/commonMain/sqldelight/com/example/db/User.sq

CREATE TABLE UserEntity (
    id INTEGER NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'USER',
    created_at TEXT NOT NULL,
    synced_at TEXT
);

getAll:
SELECT * FROM UserEntity ORDER BY created_at DESC;

getById:
SELECT * FROM UserEntity WHERE id = ?;

insert:
INSERT OR REPLACE INTO UserEntity(id, name, email, avatar_url, role, created_at, synced_at)
VALUES (?, ?, ?, ?, ?, ?, ?);

delete:
DELETE FROM UserEntity WHERE id = ?;

deleteAll:
DELETE FROM UserEntity;

searchByName:
SELECT * FROM UserEntity WHERE name LIKE '%' || ? || '%' ORDER BY name;

countByRole:
SELECT role, COUNT(*) AS count FROM UserEntity GROUP BY role;
```

### DAO実装

```kotlin
// commonMain/kotlin/database/UserDao.kt
import com.example.db.AppDatabase
import kotlinx.coroutines.flow.Flow
import kotlinx.datetime.Instant

class UserDao(private val database: AppDatabase) {
    private val queries = database.userEntityQueries

    fun getAll(): List<User> {
        return queries.getAll().executeAsList().map { it.toUser() }
    }

    fun getById(id: Long): User? {
        return queries.getById(id).executeAsOneOrNull()?.toUser()
    }

    fun insert(user: User) {
        queries.insert(
            id = user.id,
            name = user.name,
            email = user.email,
            avatar_url = user.avatarUrl,
            role = user.role.name,
            created_at = user.createdAt.toString(),
            synced_at = kotlinx.datetime.Clock.System.now().toString()
        )
    }

    fun insertAll(users: List<User>) {
        database.transaction {
            users.forEach { user ->
                insert(user)
            }
        }
    }

    fun delete(id: Long) {
        queries.delete(id)
    }

    fun deleteAll() {
        queries.deleteAll()
    }

    private fun UserEntity.toUser(): User {
        return User(
            id = id,
            name = name,
            email = email,
            avatarUrl = avatar_url,
            role = UserRole.valueOf(role),
            createdAt = Instant.parse(created_at),
        )
    }
}
```

### プラットフォーム別ドライバー

```kotlin
// commonMain/kotlin/database/DatabaseDriverFactory.kt
expect class DatabaseDriverFactory {
    fun createDriver(): SqlDriver
}
```

```kotlin
// androidMain/kotlin/database/DatabaseDriverFactory.android.kt
import android.content.Context
import app.cash.sqldelight.driver.android.AndroidSqliteDriver

actual class DatabaseDriverFactory(private val context: Context) {
    actual fun createDriver(): SqlDriver {
        return AndroidSqliteDriver(
            schema = AppDatabase.Schema,
            context = context,
            name = "app.db"
        )
    }
}
```

```kotlin
// iosMain/kotlin/database/DatabaseDriverFactory.ios.kt
import app.cash.sqldelight.driver.native.NativeSqliteDriver

actual class DatabaseDriverFactory {
    actual fun createDriver(): SqlDriver {
        return NativeSqliteDriver(
            schema = AppDatabase.Schema,
            name = "app.db"
        )
    }
}
```

```kotlin
// desktopMain/kotlin/database/DatabaseDriverFactory.desktop.kt
import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver

actual class DatabaseDriverFactory {
    actual fun createDriver(): SqlDriver {
        val driver = JdbcSqliteDriver("jdbc:sqlite:app.db")
        AppDatabase.Schema.create(driver)
        return driver
    }
}
```

---

## Compose Multiplatform

Compose MultiplatformはJetBrainsが開発する宣言的UIフレームワークで、Android、iOS、Desktop、Webで共通のUIコードを使用できる。

### 共有UIコンポーネント

```kotlin
// commonMain/kotlin/ui/UserListScreen.kt
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun UserListScreen(
    viewModel: UserListViewModel,
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Users") },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { viewModel.showCreateDialog() }) {
                Icon(Icons.Default.Add, contentDescription = "Add User")
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                state.error != null -> {
                    ErrorView(
                        message = state.error!!,
                        onRetry = { viewModel.refresh() },
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                state.users.isEmpty() -> {
                    EmptyView(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                else -> {
                    UserList(
                        users = state.users,
                        onUserClick = { viewModel.navigateToDetail(it.id) },
                        onDeleteClick = { viewModel.deleteUser(it.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun UserList(
    users: List<User>,
    onUserClick: (User) -> Unit,
    onDeleteClick: (User) -> Unit,
) {
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(users, key = { it.id }) { user ->
            UserCard(
                user = user,
                onClick = { onUserClick(user) },
                onDeleteClick = { onDeleteClick(user) }
            )
        }
    }
}

@Composable
private fun UserCard(
    user: User,
    onClick: () -> Unit,
    onDeleteClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = user.name,
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = user.email,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                AssistChip(
                    onClick = {},
                    label = { Text(user.role.name) },
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
            IconButton(onClick = onDeleteClick) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun ErrorView(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(text = message, color = MaterialTheme.colorScheme.error)
        Button(onClick = onRetry) {
            Text("Retry")
        }
    }
}

@Composable
private fun EmptyView(modifier: Modifier = Modifier) {
    Text(
        text = "No users found",
        modifier = modifier,
        style = MaterialTheme.typography.bodyLarge
    )
}
```

### ViewModel（共有）

```kotlin
// commonMain/kotlin/ui/UserListViewModel.kt
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class UserListState(
    val users: List<User> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val showCreateDialog: Boolean = false,
)

class UserListViewModel(
    private val getUsersUseCase: GetUsersUseCase,
    private val createUserUseCase: CreateUserUseCase,
    private val userRepository: UserRepository,
    private val scope: CoroutineScope,
) {
    private val _state = MutableStateFlow(UserListState())
    val state: StateFlow<UserListState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        scope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            getUsersUseCase()
                .onSuccess { response ->
                    _state.update {
                        it.copy(
                            users = response.data,
                            isLoading = false
                        )
                    }
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(
                            error = error.message ?: "Unknown error",
                            isLoading = false
                        )
                    }
                }
        }
    }

    fun deleteUser(id: Long) {
        scope.launch {
            runCatching { userRepository.deleteUser(id) }
                .onSuccess { refresh() }
                .onFailure { error ->
                    _state.update {
                        it.copy(error = "Failed to delete: ${error.message}")
                    }
                }
        }
    }

    fun createUser(name: String, email: String) {
        scope.launch {
            createUserUseCase(name, email)
                .onSuccess {
                    _state.update { it.copy(showCreateDialog = false) }
                    refresh()
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(error = error.message)
                    }
                }
        }
    }

    fun showCreateDialog() {
        _state.update { it.copy(showCreateDialog = true) }
    }

    fun dismissCreateDialog() {
        _state.update { it.copy(showCreateDialog = false) }
    }

    fun navigateToDetail(id: Long) {
        // Navigation implementation
    }
}
```

---

## DI（依存性注入）with Koin

```kotlin
// commonMain/kotlin/di/AppModule.kt
import org.koin.core.module.Module
import org.koin.dsl.module

val appModule = module {
    // Network
    single { createHttpEngine() }
    single { ApiClient(get()) }

    // Database
    single { get<DatabaseDriverFactory>().createDriver() }
    single { AppDatabase(get()) }
    single { UserDao(get()) }

    // Repository
    single<UserRepository> { UserRepositoryImpl(get(), get()) }

    // UseCase
    factory { GetUsersUseCase(get()) }
    factory { CreateUserUseCase(get()) }
}
```

```kotlin
// androidMain/kotlin/di/AppModule.android.kt
import org.koin.dsl.module

val androidModule = module {
    single { DatabaseDriverFactory(get()) }
}
```

```kotlin
// iosMain/kotlin/di/AppModule.ios.kt
import org.koin.dsl.module

val iosModule = module {
    single { DatabaseDriverFactory() }
}
```

---

## テスト

### 共有コードのユニットテスト

```kotlin
// commonTest/kotlin/usecase/CreateUserUseCaseTest.kt
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.test.runTest

class CreateUserUseCaseTest {

    private val fakeRepository = FakeUserRepository()
    private val useCase = CreateUserUseCase(fakeRepository)

    @Test
    fun `valid input creates user successfully`() = runTest {
        val result = useCase("TestUser", "test@example.com")

        assertTrue(result.isSuccess)
        assertEquals("TestUser", result.getOrNull()?.name)
    }

    @Test
    fun `blank name returns failure`() = runTest {
        val result = useCase("", "test@example.com")

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `invalid email returns failure`() = runTest {
        val result = useCase("TestUser", "invalid-email")

        assertTrue(result.isFailure)
    }
}

// テスト用のフェイクリポジトリ
class FakeUserRepository : UserRepository {
    private val users = mutableListOf<User>()

    override suspend fun getUsers(page: Int, limit: Int): PaginatedResponse<User> {
        return PaginatedResponse(users, users.size, page, limit)
    }

    override suspend fun getUser(id: Long): User {
        return users.first { it.id == id }
    }

    override suspend fun createUser(name: String, email: String): User {
        val user = User(
            id = (users.maxOfOrNull { it.id } ?: 0) + 1,
            name = name,
            email = email,
            role = UserRole.USER,
            createdAt = kotlinx.datetime.Clock.System.now(),
        )
        users.add(user)
        return user
    }

    override suspend fun updateUser(id: Long, name: String?, email: String?): User {
        val index = users.indexOfFirst { it.id == id }
        val updated = users[index].copy(
            name = name ?: users[index].name,
            email = email ?: users[index].email,
        )
        users[index] = updated
        return updated
    }

    override suspend fun deleteUser(id: Long) {
        users.removeAll { it.id == id }
    }

    override fun observeUsers(): Flow<List<User>> = MutableStateFlow(users)
}
```

---

## CI/CD設定

### GitHub Actions

```yaml
# .github/workflows/kmp-ci.yml
name: KMP CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-common:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - uses: gradle/actions/setup-gradle@v3
      - name: Run common tests
        run: ./gradlew :shared:allTests

  build-android:
    runs-on: ubuntu-latest
    needs: test-common
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - uses: gradle/actions/setup-gradle@v3
      - name: Build Android
        run: ./gradlew :composeApp:assembleRelease

  build-ios:
    runs-on: macos-14
    needs: test-common
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - uses: gradle/actions/setup-gradle@v3
      - name: Build iOS Framework
        run: ./gradlew :shared:linkReleaseFrameworkIosArm64
      - name: Build iOS App
        run: |
          cd iosApp
          xcodebuild build \
            -project iosApp.xcodeproj \
            -scheme iosApp \
            -destination 'platform=iOS Simulator,name=iPhone 16' \
            -configuration Release

  build-desktop:
    runs-on: ubuntu-latest
    needs: test-common
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - uses: gradle/actions/setup-gradle@v3
      - name: Build Desktop
        run: ./gradlew :composeApp:packageDistributionForCurrentOS
```

---

## まとめ

Kotlin Multiplatform（KMP）は、ビジネスロジックの共有をコアとしたクロスプラットフォーム開発のアプローチだ。FlutterやReact Nativeとは異なり、「共有する範囲を選べる」柔軟性が最大の強みとなる。

本記事で紹介した内容を振り返る。

- **基本概念**: commonMain/platformMainのソースセット構造
- **expect/actual**: プラットフォーム固有機能へのアクセス手法
- **ビジネスロジック共有**: リポジトリパターンとユースケースの設計
- **Ktor Client**: プラットフォーム別エンジンによるHTTP通信
- **SQLDelight**: ローカルストレージのクロスプラットフォーム対応
- **Compose Multiplatform**: 共有UIの実装
- **CI/CD**: GitHub Actionsでのマルチプラットフォームビルド

KMPは既存のAndroidプロジェクトへの段階的な導入が可能で、リスクを最小限に抑えながらクロスプラットフォーム化を進められる。まずは共有モジュールにビジネスロジックを切り出すところから始めてみることを推奨する。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
