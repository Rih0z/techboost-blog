---
title: 'Spring Boot 3 + Kotlin完全ガイド2026｜コルーチン・WebFlux・GraalVM対応'
description: 'Spring Boot 3とKotlinによるモダンなバックエンド開発を解説。Kotlin DSL、コルーチン対応、WebFlux、Spring Security、テスト、GraalVMネイティブイメージまで。'
pubDate: '2026-03-05'
tags: ['Spring Boot', 'Kotlin', 'Java', 'バックエンド', 'Web開発']
---

## Spring Boot 3 + Kotlinの魅力

Spring Boot 3はKotlinを**ファーストクラスサポート**しています。Kotlinの簡潔な構文、null安全性、コルーチンと組み合わせることで、Javaよりも少ないコードで安全なアプリケーションを構築できます。

### なぜKotlinか

| 比較項目 | Kotlin | Java |
|---------|--------|------|
| Null安全 | ◎（言語レベル） | △（Optional） |
| ボイラープレート | 少ない | 多い |
| Data Class | `data class` | Record（制限あり） |
| コルーチン | ◎（ネイティブ） | Virtual Threads |
| Spring対応 | ◎ | ◎ |
| 拡張関数 | ◎ | × |
| DSL | ◎ | △ |

---

## セットアップ

### Spring Initializrでプロジェクト作成

```bash
# CLIで作成
curl https://start.spring.io/starter.tgz \
  -d type=gradle-project-kotlin \
  -d language=kotlin \
  -d bootVersion=3.3.0 \
  -d dependencies=web,webflux,data-jpa,security,validation,actuator \
  -d javaVersion=21 \
  -d name=my-app \
  | tar -xzvf -
```

### build.gradle.kts

```kotlin
plugins {
    id("org.springframework.boot") version "3.3.0"
    id("io.spring.dependency-management") version "1.1.5"
    kotlin("jvm") version "2.0.0"
    kotlin("plugin.spring") version "2.0.0"
    kotlin("plugin.jpa") version "2.0.0"
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    // コルーチン
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor")

    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
```

### プロジェクト構成

```
src/main/kotlin/com/example/myapp/
├── MyAppApplication.kt
├── config/
│   └── SecurityConfig.kt
├── controller/
│   ├── AuthController.kt
│   └── UserController.kt
├── domain/
│   ├── entity/
│   │   └── User.kt
│   └── repository/
│       └── UserRepository.kt
├── dto/
│   ├── UserRequest.kt
│   └── UserResponse.kt
├── exception/
│   └── GlobalExceptionHandler.kt
└── service/
    └── UserService.kt
```

---

## エンティティとリポジトリ

### Kotlin Data Classで簡潔に

```kotlin
// domain/entity/User.kt
@Entity
@Table(name = "users")
data class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false, length = 50)
    val name: String,

    @Column(nullable = false, unique = true)
    val email: String,

    @Column(nullable = false)
    val hashedPassword: String,

    val age: Int? = null,

    @Column(updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
)
```

### Spring Data JPA

```kotlin
// domain/repository/UserRepository.kt
interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?
    fun findByNameContainingIgnoreCase(name: String, pageable: Pageable): Page<User>
    fun existsByEmail(email: String): Boolean

    @Query("SELECT u FROM User u WHERE u.age BETWEEN :min AND :max")
    fun findByAgeRange(
        @Param("min") min: Int,
        @Param("max") max: Int,
    ): List<User>
}
```

---

## DTO（リクエスト/レスポンス）

```kotlin
// dto/UserRequest.kt
data class CreateUserRequest(
    @field:NotBlank(message = "名前は必須です")
    @field:Size(min = 2, max = 50, message = "名前は2〜50文字で入力してください")
    val name: String,

    @field:Email(message = "有効なメールアドレスを入力してください")
    val email: String,

    @field:Size(min = 8, message = "パスワードは8文字以上で入力してください")
    val password: String,

    @field:Min(0) @field:Max(150)
    val age: Int? = null,
)

data class UpdateUserRequest(
    @field:Size(min = 2, max = 50)
    val name: String? = null,

    @field:Min(0) @field:Max(150)
    val age: Int? = null,
)

// dto/UserResponse.kt
data class UserResponse(
    val id: Long,
    val name: String,
    val email: String,
    val age: Int?,
    val createdAt: LocalDateTime,
) {
    companion object {
        fun from(user: User) = UserResponse(
            id = user.id,
            name = user.name,
            email = user.email,
            age = user.age,
            createdAt = user.createdAt,
        )
    }
}

data class PagedResponse<T>(
    val items: List<T>,
    val total: Long,
    val page: Int,
    val perPage: Int,
    val totalPages: Int,
)
```

---

## コントローラー

```kotlin
// controller/UserController.kt
@RestController
@RequestMapping("/api/users")
class UserController(
    private val userService: UserService,
) {
    @GetMapping
    fun listUsers(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "20") perPage: Int,
        @RequestParam(required = false) search: String?,
    ): PagedResponse<UserResponse> {
        return userService.listUsers(page, perPage, search)
    }

    @GetMapping("/{id}")
    fun getUser(@PathVariable id: Long): UserResponse {
        return userService.getUser(id)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createUser(@Valid @RequestBody request: CreateUserRequest): UserResponse {
        return userService.createUser(request)
    }

    @PatchMapping("/{id}")
    fun updateUser(
        @PathVariable id: Long,
        @Valid @RequestBody request: UpdateUserRequest,
    ): UserResponse {
        return userService.updateUser(id, request)
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteUser(@PathVariable id: Long) {
        userService.deleteUser(id)
    }
}
```

---

## サービス層

```kotlin
// service/UserService.kt
@Service
@Transactional(readOnly = true)
class UserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    fun listUsers(page: Int, perPage: Int, search: String?): PagedResponse<UserResponse> {
        val pageable = PageRequest.of(page - 1, perPage, Sort.by("createdAt").descending())

        val result = if (search != null) {
            userRepository.findByNameContainingIgnoreCase(search, pageable)
        } else {
            userRepository.findAll(pageable)
        }

        return PagedResponse(
            items = result.content.map { UserResponse.from(it) },
            total = result.totalElements,
            page = page,
            perPage = perPage,
            totalPages = result.totalPages,
        )
    }

    fun getUser(id: Long): UserResponse {
        val user = userRepository.findById(id)
            .orElseThrow { NotFoundException("ユーザーが見つかりません") }
        return UserResponse.from(user)
    }

    @Transactional
    fun createUser(request: CreateUserRequest): UserResponse {
        if (userRepository.existsByEmail(request.email)) {
            throw ConflictException("このメールアドレスは既に登録されています")
        }

        val user = User(
            name = request.name,
            email = request.email,
            hashedPassword = passwordEncoder.encode(request.password),
            age = request.age,
        )

        return UserResponse.from(userRepository.save(user))
    }

    @Transactional
    fun updateUser(id: Long, request: UpdateUserRequest): UserResponse {
        val user = userRepository.findById(id)
            .orElseThrow { NotFoundException("ユーザーが見つかりません") }

        val updated = user.copy(
            name = request.name ?: user.name,
            age = request.age ?: user.age,
        )

        return UserResponse.from(userRepository.save(updated))
    }

    @Transactional
    fun deleteUser(id: Long) {
        if (!userRepository.existsById(id)) {
            throw NotFoundException("ユーザーが見つかりません")
        }
        userRepository.deleteById(id)
    }
}
```

---

## 例外ハンドリング

```kotlin
// exception/GlobalExceptionHandler.kt
@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException::class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    fun handleNotFound(e: NotFoundException) = ErrorResponse(
        status = 404,
        message = e.message ?: "リソースが見つかりません",
    )

    @ExceptionHandler(ConflictException::class)
    @ResponseStatus(HttpStatus.CONFLICT)
    fun handleConflict(e: ConflictException) = ErrorResponse(
        status = 409,
        message = e.message ?: "リソースが競合しています",
    )

    @ExceptionHandler(MethodArgumentNotValidException::class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun handleValidation(e: MethodArgumentNotValidException): ErrorResponse {
        val errors = e.bindingResult.fieldErrors.associate {
            it.field to (it.defaultMessage ?: "入力値が不正です")
        }
        return ErrorResponse(status = 400, message = "バリデーションエラー", errors = errors)
    }
}

data class ErrorResponse(
    val status: Int,
    val message: String,
    val errors: Map<String, String>? = null,
)

class NotFoundException(message: String) : RuntimeException(message)
class ConflictException(message: String) : RuntimeException(message)
```

---

## Spring Security

```kotlin
// config/SecurityConfig.kt
@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http {
            csrf { disable() }
            authorizeHttpRequests {
                authorize("/api/auth/**", permitAll)
                authorize("/api/health", permitAll)
                authorize("/actuator/**", permitAll)
                authorize(anyRequest, authenticated)
            }
            sessionManagement {
                sessionCreationPolicy = SessionCreationPolicy.STATELESS
            }
            addFilterBefore<UsernamePasswordAuthenticationFilter>(jwtAuthFilter())
        }
        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()
}
```

---

## コルーチン対応（WebFlux）

```kotlin
// コルーチンベースのコントローラー
@RestController
@RequestMapping("/api/async")
class AsyncController(
    private val externalApiClient: ExternalApiClient,
) {
    @GetMapping("/aggregated")
    suspend fun getAggregatedData(): AggregatedData {
        // 複数のAPI呼び出しを並列実行
        return coroutineScope {
            val users = async { externalApiClient.fetchUsers() }
            val posts = async { externalApiClient.fetchPosts() }
            val stats = async { externalApiClient.fetchStats() }

            AggregatedData(
                users = users.await(),
                posts = posts.await(),
                stats = stats.await(),
            )
        }
    }
}

// リアクティブリポジトリ
interface UserReactiveRepository : CoroutineCrudRepository<User, Long> {
    fun findByEmail(email: String): Flow<User>
}
```

---

## テスト

```kotlin
// テスト
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class UserControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @Test
    fun `ユーザーを作成できる`() {
        val request = CreateUserRequest(
            name = "田中太郎",
            email = "tanaka@example.com",
            password = "password123",
        )

        mockMvc.post("/api/users") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.name") { value("田中太郎") }
            jsonPath("$.email") { value("tanaka@example.com") }
            jsonPath("$.id") { isNumber() }
        }
    }

    @Test
    fun `バリデーションエラーが返る`() {
        val request = mapOf(
            "name" to "A",  // 2文字未満
            "email" to "invalid",
            "password" to "short",
        )

        mockMvc.post("/api/users") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.errors.name") { exists() }
            jsonPath("$.errors.email") { exists() }
        }
    }

    @Test
    fun `存在しないユーザーは404`() {
        mockMvc.get("/api/users/999")
            .andExpect { status { isNotFound() } }
    }
}
```

---

## GraalVMネイティブイメージ

Spring Boot 3はGraalVMネイティブイメージを公式サポートしています。

```bash
# ネイティブイメージのビルド
./gradlew nativeCompile

# 起動時間の比較
# JVM起動:           ████████████████ 2.5秒
# ネイティブイメージ: ██              0.05秒
```

```kotlin
// build.gradle.kts
plugins {
    id("org.graalvm.buildtools.native") version "0.10.1"
}

graalvmNative {
    binaries {
        named("main") {
            buildArgs.add("--enable-preview")
            javaLauncher.set(javaToolchains.launcherFor {
                languageVersion.set(JavaLanguageVersion.of(21))
                vendor.set(JvmVendorSpec.GRAALVM_CE)
            })
        }
    }
}
```

---

## まとめ

| 機能 | Spring Boot 3 + Kotlin |
|------|----------------------|
| Null安全 | Kotlin言語レベル |
| 非同期 | コルーチン + WebFlux |
| DI | Spring標準（コンストラクタインジェクション） |
| バリデーション | Bean Validation |
| ORM | Spring Data JPA |
| セキュリティ | Spring Security |
| テスト | MockMvc + JUnit 5 |
| ネイティブ | GraalVM対応 |

Spring Boot + Kotlinは、**エンタープライズグレードの堅牢性**とKotlinの**簡潔さ・安全性**を両立する組み合わせです。Java資産をそのまま活かしつつ、モダンな開発体験を得られます。
