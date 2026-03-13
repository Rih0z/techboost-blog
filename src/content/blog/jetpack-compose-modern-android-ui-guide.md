---
title: "Jetpack Composeで始めるモダンAndroid UI開発"
description: "Jetpack Composeを使ったモダンAndroid UI開発の方法を解説。宣言的UIの基本、Composable関数、状態管理、Material Design 3対応、Navigation、アニメーションまで実践コード付きで紹介します。"
pubDate: "2026-03-09"
tags: ["Android", "Kotlin", "mobile", "エンジニア"]
heroImage: '../../assets/thumbnails/jetpack-compose-modern-android-ui-guide.jpg'
---

## はじめに

Android UI開発は長らくXMLレイアウトとViewベースのシステムに依存してきた。しかしJetpack Composeの登場により、宣言的UIという新しいパラダイムがAndroid開発の標準となった。

Jetpack Composeは、Kotlinで記述する宣言的UIフレームワークだ。XMLレイアウトの作成、findViewById、ViewBindingといった従来の煩雑な作業から解放され、UIの構築と更新をシンプルなKotlinコードで実現できる。

この記事では、Composeの基本概念からComposable関数、状態管理、Material Design 3対応、Navigation、アニメーション、テストまで、実践的なコード付きで解説する。

---

## Jetpack Composeとは

### 宣言的UIの概念

従来の命令的UIでは、「ボタンを取得して色を変える」という操作手順を記述する。宣言的UIでは、「このState状態のときUIはこう見える」という最終状態を宣言する。

```kotlin
// 命令的UI（従来のView方式）
val button = findViewById<Button>(R.id.myButton)
button.text = "Click me"
button.setBackgroundColor(Color.RED)
button.setOnClickListener { /* ... */ }

// 宣言的UI（Compose方式）
@Composable
fun MyButton(onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Red
        )
    ) {
        Text("Click me")
    }
}
```

### XMLレイアウトとの比較

| 比較項目 | XMLレイアウト | Jetpack Compose |
|---------|-------------|-----------------|
| **記述言語** | XML + Kotlin/Java | Kotlinのみ |
| **プレビュー** | Layout Editor | @Preview アノテーション |
| **状態管理** | LiveData/ViewModel + Observer | State + remember |
| **リスト表示** | RecyclerView + Adapter | LazyColumn/LazyRow |
| **テーマ** | styles.xml/themes.xml | MaterialTheme composable |
| **ナビゲーション** | Navigation Component + XML | Navigation Compose |
| **アニメーション** | Animator/Transition API | animate*AsState / AnimatedVisibility |
| **再利用性** | Custom View + XML include | Composable関数 |
| **ビルド速度** | データバインディングで遅延あり | インクリメンタルコンパイル |
| **コード量** | 多い（XML + Kotlin） | 少ない（Kotlinのみ） |

---

## プロジェクトセットアップ

### Gradle設定

```kotlin
// app/build.gradle.kts
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.example.composeapp"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.composeapp"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    // Compose BOM（バージョン統合管理）
    val composeBom = platform("androidx.compose:compose-bom:2025.03.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    // Compose UI
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    // Material Design 3
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Activity Compose
    implementation("androidx.activity:activity-compose:1.10.0")

    // ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.8.8")

    // Coil（画像読み込み）
    implementation("io.coil-kt.coil3:coil-compose:3.1.0")

    // テスト
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
```

### エントリーポイント

```kotlin
// MainActivity.kt
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.example.composeapp.ui.theme.AppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AppTheme {
                MainApp()
            }
        }
    }
}
```

---

## Composable関数の基本

### 最初のComposable

```kotlin
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Hello, $name!",
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = "Welcome to Jetpack Compose",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    AppTheme {
        Greeting("Android Developer")
    }
}
```

### レイアウトの基本

Composeのレイアウトは、Column（縦並び）、Row（横並び）、Box（重ね合わせ）の3つの基本コンポーネントで構成する。

```kotlin
@Composable
fun ProfileCard(
    name: String,
    role: String,
    avatarUrl: String?,
    onEditClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // アバター
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                if (avatarUrl != null) {
                    AsyncImage(
                        model = avatarUrl,
                        contentDescription = "Avatar",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Text(
                        text = name.first().toString(),
                        style = MaterialTheme.typography.headlineSmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }

            // 名前とロール
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = role,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // 編集ボタン
            IconButton(onClick = onEditClick) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = "Edit profile"
                )
            }
        }
    }
}
```

---

## 状態管理

Composeの状態管理は、UIの正確性と効率性を左右する最重要トピックだ。

### remember と mutableStateOf

```kotlin
@Composable
fun Counter() {
    // rememberで再コンポジション間の状態を保持
    var count by remember { mutableIntStateOf(0) }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Count: $count",
            style = MaterialTheme.typography.displaySmall
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { count-- }) {
                Text("-")
            }
            Button(onClick = { count++ }) {
                Text("+")
            }
            OutlinedButton(onClick = { count = 0 }) {
                Text("Reset")
            }
        }
    }
}
```

### rememberSaveable

画面回転などのConfiguration Change後も状態を保持する場合は`rememberSaveable`を使う。

```kotlin
@Composable
fun SearchBar(
    onSearch: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    // 画面回転後も入力値を保持
    var query by rememberSaveable { mutableStateOf("") }
    var isActive by rememberSaveable { mutableStateOf(false) }

    OutlinedTextField(
        value = query,
        onValueChange = { query = it },
        modifier = modifier.fillMaxWidth(),
        placeholder = { Text("Search...") },
        leadingIcon = {
            Icon(Icons.Default.Search, contentDescription = null)
        },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = {
                    query = ""
                    onSearch("")
                }) {
                    Icon(Icons.Default.Clear, contentDescription = "Clear")
                }
            }
        },
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(
            onSearch = { onSearch(query) }
        ),
        singleLine = true
    )
}
```

### 状態ホイスティング

Composeのベストプラクティスとして、状態をComposable関数の外側に持ち上げる「状態ホイスティング」がある。これにより、Composable関数はステートレスになり、テストと再利用が容易になる。

```kotlin
// ステートフル（状態を内部に持つ）
@Composable
fun StatefulCounter() {
    var count by remember { mutableIntStateOf(0) }
    StatelessCounter(
        count = count,
        onIncrement = { count++ },
        onDecrement = { count-- }
    )
}

// ステートレス（状態を外部から受け取る）- テスト・プレビューが容易
@Composable
fun StatelessCounter(
    count: Int,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        IconButton(onClick = onDecrement) {
            Icon(Icons.Default.Remove, contentDescription = "Decrement")
        }
        Text(
            text = "$count",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.widthIn(min = 48.dp),
            textAlign = TextAlign.Center
        )
        IconButton(onClick = onIncrement) {
            Icon(Icons.Default.Add, contentDescription = "Increment")
        }
    }
}
```

### ViewModelとの連携

```kotlin
// UserListViewModel.kt
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class UserListUiState(
    val users: List<User> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val selectedFilter: UserFilter = UserFilter.ALL,
)

enum class UserFilter { ALL, ADMIN, EDITOR, USER }

class UserListViewModel(
    private val repository: UserRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(UserListUiState())
    val uiState: StateFlow<UserListUiState> = _uiState.asStateFlow()

    init {
        loadUsers()
    }

    fun loadUsers() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val users = repository.getUsers()
                _uiState.update {
                    it.copy(users = users, isLoading = false)
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "Unknown error",
                        isLoading = false
                    )
                }
            }
        }
    }

    fun setFilter(filter: UserFilter) {
        _uiState.update { it.copy(selectedFilter = filter) }
    }

    fun deleteUser(userId: Long) {
        viewModelScope.launch {
            try {
                repository.deleteUser(userId)
                loadUsers()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = "Failed to delete user")
                }
            }
        }
    }
}
```

```kotlin
// UserListScreen.kt
@Composable
fun UserListScreen(
    viewModel: UserListViewModel = viewModel(),
    onNavigateToDetail: (Long) -> Unit,
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    UserListContent(
        uiState = uiState,
        onRefresh = viewModel::loadUsers,
        onFilterChange = viewModel::setFilter,
        onDeleteUser = viewModel::deleteUser,
        onUserClick = onNavigateToDetail,
    )
}

@Composable
private fun UserListContent(
    uiState: UserListUiState,
    onRefresh: () -> Unit,
    onFilterChange: (UserFilter) -> Unit,
    onDeleteUser: (Long) -> Unit,
    onUserClick: (Long) -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // フィルターチップ
        FilterChipRow(
            selectedFilter = uiState.selectedFilter,
            onFilterChange = onFilterChange,
        )

        // コンテンツ
        Box(modifier = Modifier.fillMaxSize()) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                uiState.error != null -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(uiState.error, color = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(onClick = onRefresh) { Text("Retry") }
                    }
                }
                else -> {
                    val filtered = when (uiState.selectedFilter) {
                        UserFilter.ALL -> uiState.users
                        else -> uiState.users.filter {
                            it.role.name == uiState.selectedFilter.name
                        }
                    }
                    UserLazyColumn(
                        users = filtered,
                        onUserClick = onUserClick,
                        onDeleteUser = onDeleteUser,
                    )
                }
            }
        }
    }
}

@Composable
private fun FilterChipRow(
    selectedFilter: UserFilter,
    onFilterChange: (UserFilter) -> Unit,
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(UserFilter.entries.toTypedArray()) { filter ->
            FilterChip(
                selected = selectedFilter == filter,
                onClick = { onFilterChange(filter) },
                label = { Text(filter.name) }
            )
        }
    }
}
```

---

## Material Design 3

### テーマの設定

```kotlin
// ui/theme/Theme.kt
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.foundation.isSystemInDarkTheme

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF1976D2),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFBBDEFB),
    onPrimaryContainer = Color(0xFF0D47A1),
    secondary = Color(0xFF00897B),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFB2DFDB),
    onSecondaryContainer = Color(0xFF004D40),
    tertiary = Color(0xFFFF8F00),
    onTertiary = Color.White,
    background = Color(0xFFFAFAFA),
    onBackground = Color(0xFF212121),
    surface = Color.White,
    onSurface = Color(0xFF212121),
    surfaceVariant = Color(0xFFF5F5F5),
    onSurfaceVariant = Color(0xFF616161),
    error = Color(0xFFD32F2F),
    onError = Color.White,
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF90CAF9),
    onPrimary = Color(0xFF0D47A1),
    primaryContainer = Color(0xFF1565C0),
    onPrimaryContainer = Color(0xFFBBDEFB),
    secondary = Color(0xFF80CBC4),
    onSecondary = Color(0xFF004D40),
    secondaryContainer = Color(0xFF00695C),
    onSecondaryContainer = Color(0xFFB2DFDB),
    tertiary = Color(0xFFFFCC02),
    onTertiary = Color(0xFF3E2723),
    background = Color(0xFF121212),
    onBackground = Color(0xFFE0E0E0),
    surface = Color(0xFF1E1E1E),
    onSurface = Color(0xFFE0E0E0),
    surfaceVariant = Color(0xFF2C2C2C),
    onSurfaceVariant = Color(0xFFBDBDBD),
    error = Color(0xFFEF5350),
    onError = Color(0xFF212121),
)

@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && android.os.Build.VERSION.SDK_INT >= 31 -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        shapes = AppShapes,
        content = content
    )
}
```

### タイポグラフィ

```kotlin
// ui/theme/Type.kt
import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val AppTypography = Typography(
    displayLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 57.sp,
        lineHeight = 64.sp,
        letterSpacing = (-0.25).sp
    ),
    headlineLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 40.sp
    ),
    headlineMedium = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 28.sp,
        lineHeight = 36.sp
    ),
    titleLarge = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 22.sp,
        lineHeight = 28.sp
    ),
    titleMedium = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.15.sp
    ),
    bodyLarge = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp
    ),
    bodyMedium = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.25.sp
    ),
    labelLarge = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp
    ),
)
```

---

## Navigation

### Navigation Composeのセットアップ

```kotlin
// navigation/AppNavigation.kt
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.NavType
import androidx.navigation.navArgument

// ルート定義
sealed class Screen(val route: String) {
    data object UserList : Screen("users")
    data object UserDetail : Screen("users/{userId}") {
        fun createRoute(userId: Long): String = "users/$userId"
    }
    data object UserEdit : Screen("users/{userId}/edit") {
        fun createRoute(userId: Long): String = "users/$userId/edit"
    }
    data object Settings : Screen("settings")
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.People, contentDescription = null) },
                    label = { Text("Users") },
                    selected = /* current route check */  false,
                    onClick = {
                        navController.navigate(Screen.UserList.route) {
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Settings, contentDescription = null) },
                    label = { Text("Settings") },
                    selected = false,
                    onClick = {
                        navController.navigate(Screen.Settings.route) {
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.UserList.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.UserList.route) {
                UserListScreen(
                    onNavigateToDetail = { userId ->
                        navController.navigate(Screen.UserDetail.createRoute(userId))
                    }
                )
            }

            composable(
                route = Screen.UserDetail.route,
                arguments = listOf(
                    navArgument("userId") { type = NavType.LongType }
                )
            ) { backStackEntry ->
                val userId = backStackEntry.arguments?.getLong("userId") ?: return@composable
                UserDetailScreen(
                    userId = userId,
                    onNavigateToEdit = {
                        navController.navigate(Screen.UserEdit.createRoute(userId))
                    },
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.UserEdit.route,
                arguments = listOf(
                    navArgument("userId") { type = NavType.LongType }
                )
            ) { backStackEntry ->
                val userId = backStackEntry.arguments?.getLong("userId") ?: return@composable
                UserEditScreen(
                    userId = userId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Settings.route) {
                SettingsScreen()
            }
        }
    }
}
```

---

## LazyColumn / LazyGrid

### パフォーマンスの良いリスト表示

```kotlin
@Composable
fun UserLazyColumn(
    users: List<User>,
    onUserClick: (Long) -> Unit,
    onDeleteUser: (Long) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // ヘッダー
        item(key = "header") {
            Text(
                text = "${users.size} users",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 8.dp)
            )
        }

        // ユーザーリスト（keyで効率的な差分更新）
        items(
            items = users,
            key = { it.id }
        ) { user ->
            UserListItem(
                user = user,
                onClick = { onUserClick(user.id) },
                onDelete = { onDeleteUser(user.id) },
                modifier = Modifier.animateItem()
            )
        }

        // フッター
        item(key = "footer") {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun UserListItem(
    user: User,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showDeleteDialog by remember { mutableStateOf(false) }

    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth()
    ) {
        ListItem(
            headlineContent = {
                Text(user.name, maxLines = 1, overflow = TextOverflow.Ellipsis)
            },
            supportingContent = {
                Text(user.email)
            },
            leadingContent = {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = user.name.first().toString(),
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            },
            trailingContent = {
                IconButton(onClick = { showDeleteDialog = true }) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete")
                }
            }
        )
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete User") },
            text = { Text("Are you sure you want to delete ${user.name}?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDelete()
                        showDeleteDialog = false
                    }
                ) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
```

### LazyVerticalGridによるグリッド表示

```kotlin
@Composable
fun ProductGrid(
    products: List<Product>,
    onProductClick: (Long) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 160.dp),
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(
            items = products,
            key = { it.id }
        ) { product ->
            ProductCard(
                product = product,
                onClick = { onProductClick(product.id) }
            )
        }
    }
}

@Composable
private fun ProductCard(
    product: Product,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            AsyncImage(
                model = product.imageUrl,
                contentDescription = product.name,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f),
                contentScale = ContentScale.Crop
            )
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${product.price}",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}
```

---

## Side Effects

Composeでは、Composable関数の外側の世界（API呼び出し、ログ出力等）と副作用を安全に扱うためのAPIが用意されている。

### LaunchedEffect

```kotlin
@Composable
fun UserDetailScreen(
    userId: Long,
    viewModel: UserDetailViewModel = viewModel(),
    onNavigateToEdit: () -> Unit,
    onNavigateBack: () -> Unit,
) {
    // userIdが変わるたびに実行
    LaunchedEffect(userId) {
        viewModel.loadUser(userId)
    }

    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // エラー時のSnackbar表示
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(
                message = error,
                actionLabel = "Retry",
                duration = SnackbarDuration.Long
            ).let { result ->
                if (result == SnackbarResult.ActionPerformed) {
                    viewModel.loadUser(userId)
                }
            }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(uiState.user?.name ?: "User Detail") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        // Content
    }
}
```

### DisposableEffect

```kotlin
@Composable
fun LifecycleAwareComponent() {
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> {
                    // 画面復帰時の処理（データリフレッシュなど）
                }
                Lifecycle.Event.ON_PAUSE -> {
                    // 画面離脱時の処理（リソース解放など）
                }
                else -> {}
            }
        }

        lifecycleOwner.lifecycle.addObserver(observer)

        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }
}
```

### derivedStateOf

```kotlin
@Composable
fun FilterableList(items: List<String>) {
    var searchQuery by remember { mutableStateOf("") }

    // searchQueryまたはitemsが変わったときのみ再計算
    val filteredItems by remember(items) {
        derivedStateOf {
            if (searchQuery.isBlank()) items
            else items.filter { it.contains(searchQuery, ignoreCase = true) }
        }
    }

    Column {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            placeholder = { Text("Search...") }
        )

        LazyColumn {
            items(filteredItems) { item ->
                ListItem(headlineContent = { Text(item) })
            }
        }
    }
}
```

---

## アニメーション

### AnimatedVisibility

```kotlin
@Composable
fun ExpandableCard(
    title: String,
    content: String,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = modifier.fillMaxWidth(),
        onClick = { expanded = !expanded }
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = title, style = MaterialTheme.typography.titleMedium)
                Icon(
                    imageVector = if (expanded) Icons.Default.ExpandLess
                    else Icons.Default.ExpandMore,
                    contentDescription = if (expanded) "Collapse" else "Expand"
                )
            }

            AnimatedVisibility(
                visible = expanded,
                enter = expandVertically(
                    animationSpec = tween(300)
                ) + fadeIn(animationSpec = tween(300)),
                exit = shrinkVertically(
                    animationSpec = tween(300)
                ) + fadeOut(animationSpec = tween(200))
            ) {
                Text(
                    text = content,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = 12.dp)
                )
            }
        }
    }
}
```

### animate*AsState

```kotlin
@Composable
fun ProgressCard(
    progress: Float,
    label: String,
    modifier: Modifier = Modifier,
) {
    // プログレスの変化をアニメーション
    val animatedProgress by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = tween(
            durationMillis = 1000,
            easing = FastOutSlowInEasing
        ),
        label = "progress"
    )

    // 色の変化もアニメーション
    val progressColor by animateColorAsState(
        targetValue = when {
            progress < 0.3f -> MaterialTheme.colorScheme.error
            progress < 0.7f -> MaterialTheme.colorScheme.tertiary
            else -> MaterialTheme.colorScheme.primary
        },
        animationSpec = tween(500),
        label = "progressColor"
    )

    Card(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(label, style = MaterialTheme.typography.titleSmall)
                Text(
                    "${(animatedProgress * 100).toInt()}%",
                    style = MaterialTheme.typography.labelLarge
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { animatedProgress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = progressColor,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )
        }
    }
}
```

### Crossfade / AnimatedContent

```kotlin
@Composable
fun TabContent(selectedTab: Int) {
    AnimatedContent(
        targetState = selectedTab,
        transitionSpec = {
            if (targetState > initialState) {
                slideInHorizontally(
                    animationSpec = tween(300)
                ) { fullWidth -> fullWidth } + fadeIn(tween(300)) togetherWith
                    slideOutHorizontally(
                        animationSpec = tween(300)
                    ) { fullWidth -> -fullWidth } + fadeOut(tween(200))
            } else {
                slideInHorizontally(
                    animationSpec = tween(300)
                ) { fullWidth -> -fullWidth } + fadeIn(tween(300)) togetherWith
                    slideOutHorizontally(
                        animationSpec = tween(300)
                    ) { fullWidth -> fullWidth } + fadeOut(tween(200))
            }
        },
        label = "tabContent"
    ) { tab ->
        when (tab) {
            0 -> HomeContent()
            1 -> SearchContent()
            2 -> ProfileContent()
        }
    }
}
```

---

## テスト

### ComposeのUIテスト

```kotlin
// app/src/androidTest/kotlin/UserListScreenTest.kt
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import org.junit.Rule
import org.junit.Test

class UserListScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun userList_displaysUsers() {
        val users = listOf(
            User(id = 1, name = "Test User 1", email = "test1@example.com", role = UserRole.ADMIN),
            User(id = 2, name = "Test User 2", email = "test2@example.com", role = UserRole.USER),
        )

        composeTestRule.setContent {
            AppTheme {
                UserListContent(
                    uiState = UserListUiState(users = users),
                    onRefresh = {},
                    onFilterChange = {},
                    onDeleteUser = {},
                    onUserClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Test User 1").assertIsDisplayed()
        composeTestRule.onNodeWithText("Test User 2").assertIsDisplayed()
        composeTestRule.onNodeWithText("2 users").assertIsDisplayed()
    }

    @Test
    fun userList_showsLoadingIndicator() {
        composeTestRule.setContent {
            AppTheme {
                UserListContent(
                    uiState = UserListUiState(isLoading = true),
                    onRefresh = {},
                    onFilterChange = {},
                    onDeleteUser = {},
                    onUserClick = {},
                )
            }
        }

        composeTestRule
            .onNode(hasProgressBarRangeInfo(ProgressBarRangeInfo.Indeterminate))
            .assertIsDisplayed()
    }

    @Test
    fun userList_showsErrorAndRetryButton() {
        var retryClicked = false

        composeTestRule.setContent {
            AppTheme {
                UserListContent(
                    uiState = UserListUiState(error = "Network error"),
                    onRefresh = { retryClicked = true },
                    onFilterChange = {},
                    onDeleteUser = {},
                    onUserClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText("Network error").assertIsDisplayed()
        composeTestRule.onNodeWithText("Retry").performClick()
        assert(retryClicked)
    }

    @Test
    fun userList_filterChipsWork() {
        var selectedFilter: UserFilter? = null

        composeTestRule.setContent {
            AppTheme {
                UserListContent(
                    uiState = UserListUiState(users = emptyList()),
                    onRefresh = {},
                    onFilterChange = { selectedFilter = it },
                    onDeleteUser = {},
                    onUserClick = {},
                )
            }
        }

        composeTestRule.onNodeWithText("ADMIN").performClick()
        assert(selectedFilter == UserFilter.ADMIN)
    }

    @Test
    fun deleteDialog_showsOnDeleteClick() {
        val users = listOf(
            User(id = 1, name = "Test User", email = "test@example.com", role = UserRole.USER),
        )

        composeTestRule.setContent {
            AppTheme {
                UserListContent(
                    uiState = UserListUiState(users = users),
                    onRefresh = {},
                    onFilterChange = {},
                    onDeleteUser = {},
                    onUserClick = {},
                )
            }
        }

        // 削除ボタンをクリック
        composeTestRule
            .onNodeWithContentDescription("Delete")
            .performClick()

        // ダイアログが表示される
        composeTestRule
            .onNodeWithText("Are you sure you want to delete Test User?")
            .assertIsDisplayed()
    }
}
```

### Composableのスナップショットテスト

```kotlin
// Paparazziによるスナップショットテスト
class UserCardSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6,
        theme = "android:Theme.Material3.DayNight"
    )

    @Test
    fun userCard_lightMode() {
        paparazzi.snapshot {
            AppTheme(darkTheme = false) {
                ProfileCard(
                    name = "Test User",
                    role = "Admin",
                    avatarUrl = null,
                    onEditClick = {}
                )
            }
        }
    }

    @Test
    fun userCard_darkMode() {
        paparazzi.snapshot {
            AppTheme(darkTheme = true) {
                ProfileCard(
                    name = "Test User",
                    role = "Admin",
                    avatarUrl = null,
                    onEditClick = {}
                )
            }
        }
    }
}
```

---

## パフォーマンス最適化

### 再コンポジションの最小化

```kotlin
// 安定した型を使う（data classは自動的にStable）
@Stable
data class UserUiModel(
    val id: Long,
    val displayName: String,
    val avatarInitial: Char,
    val roleLabel: String,
)

// Listを渡す場合はImmutableListを使用
@Composable
fun OptimizedUserList(
    users: ImmutableList<UserUiModel>,
    onUserClick: (Long) -> Unit,
) {
    LazyColumn {
        items(
            items = users,
            key = { it.id },
            contentType = { "user" }
        ) { user ->
            // keyとcontentTypeの指定で差分更新を最適化
            UserRow(user = user, onClick = { onUserClick(user.id) })
        }
    }
}

// lambdaはrememberで安定化
@Composable
fun StableLambdaExample(viewModel: UserListViewModel) {
    val onUserClick = remember<(Long) -> Unit> {
        { userId -> viewModel.navigateToDetail(userId) }
    }

    UserLazyColumn(
        users = viewModel.users,
        onUserClick = onUserClick,
        onDeleteUser = viewModel::deleteUser
    )
}
```

---

## まとめ

Jetpack Composeは、Android UI開発の生産性と保守性を大幅に向上させる宣言的UIフレームワークだ。XMLレイアウトからの移行は段階的に進められるため、既存プロジェクトへの導入リスクも低い。

本記事で紹介した内容を振り返る。

- **基本概念**: 宣言的UIとComposable関数の仕組み
- **状態管理**: remember、mutableStateOf、状態ホイスティング、ViewModel連携
- **Material Design 3**: テーマ、カラースキーム、タイポグラフィの設定
- **Navigation**: Navigation Composeによる画面遷移
- **LazyColumn/LazyGrid**: パフォーマンスの良いリスト・グリッド表示
- **Side Effects**: LaunchedEffect、DisposableEffect、derivedStateOf
- **アニメーション**: AnimatedVisibility、animate*AsState、AnimatedContent
- **テスト**: UIテストとスナップショットテスト
- **パフォーマンス**: 再コンポジションの最小化とStable型

まずは新しい画面やコンポーネントからComposeを導入し、段階的にXMLレイアウトを置き換えていくアプローチを推奨する。Composeの宣言的UIに慣れれば、UIの構築と変更が驚くほどスムーズになるはずだ。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
