---
title: 'FastAPI完全ガイド — 高速Python APIフレームワーク・型安全・非同期・本番運用'
description: 'FastAPIで高速なPython APIを構築する完全ガイド。Pydantic v2・依存性注入・認証（JWT/OAuth2）・非同期処理・SQLAlchemy統合・テスト・Dockerデプロイまで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['FastAPI', 'Python', 'API', '非同期', 'バックエンド']
---

FastAPIはPythonのWebフレームワークの中で最も急成長しているプロジェクトの一つだ。GitHub上のスター数は急速に増加し、Netflix・Uber・Microsoftといった大企業が本番環境で採用している。なぜこれほどまでに支持されるのか。その答えは「速度」「型安全性」「開発体験」の三位一体にある。

この記事では、FastAPIの基礎から本番運用まで、実際のコード例を交えながら体系的に解説する。読み終えた後には、FastAPIで本格的なAPIサーバーを構築できるようになっているはずだ。

---

## 1. FastAPIとは — Flask・Djangoとの比較

### 誕生の背景

FastAPIは2018年にSebastián Ramírez（tiangolo）が開発した。Pythonの型ヒント（Type Hints）を最大限に活用し、OpenAPI仕様の自動生成・Pydanticによるデータ検証・Starletteによる非同期処理を組み合わせた革新的なフレームワークだ。

### パフォーマンス比較

TechEmpower Framework Benchmarksによると、FastAPIはFlaskと比較して約3〜10倍高速だ。Djangoとの比較では更に大きな差が開く場合もある。

| フレームワーク | リクエスト/秒（目安） | 非同期サポート | 型チェック | OpenAPI自動生成 |
|---|---|---|---|---|
| FastAPI | ~30,000 | ネイティブ | Pydantic v2 | 自動 |
| Flask | ~8,000 | 別途設定 | なし | 手動 |
| Django REST | ~5,000 | 別途設定 | なし | 手動 |
| Express（Node.js） | ~25,000 | ネイティブ | 手動（TS） | 手動 |

この速度はStarlette（ASGIフレームワーク）とuvicorn（ASGIサーバー）の組み合わせによって実現されている。

### FastAPIが選ばれる理由

```
1. 型ヒントによる自動バリデーション
2. 対話型APIドキュメント（Swagger UI / ReDoc）の自動生成
3. async/awaitによるネイティブ非同期処理
4. Pydantic v2による高速なデータ検証
5. Python 3.10+の最新機能をフル活用
6. 本番実績（Netflix・Uber・Microsoft）
```

---

## 2. プロジェクト設定

### 推奨プロジェクト構造

```
myapi/
├── pyproject.toml
├── .env
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── alembic/
│   ├── alembic.ini
│   └── versions/
└── app/
    ├── __init__.py
    ├── main.py
    ├── config.py
    ├── database.py
    ├── models/
    │   ├── __init__.py
    │   └── user.py
    ├── schemas/
    │   ├── __init__.py
    │   └── user.py
    ├── routers/
    │   ├── __init__.py
    │   ├── users.py
    │   └── auth.py
    ├── dependencies/
    │   ├── __init__.py
    │   └── auth.py
    └── services/
        ├── __init__.py
        └── user_service.py
```

### pyproject.toml

```toml
[project]
name = "myapi"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi[standard]>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.7.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "python-multipart>=0.0.20",
    "httpx>=0.28.0",
    "redis>=5.2.0",
    "celery>=5.4.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.25.0",
    "anyio>=4.8.0",
    "ruff>=0.9.0",
    "mypy>=1.14.0",
]

[tool.ruff]
line-length = 88
target-version = "py311"

[tool.mypy]
strict = true
plugins = ["pydantic.mypy"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

### 環境変数設定（config.py）

```python
# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # アプリ設定
    app_name: str = "MyAPI"
    app_version: str = "1.0.0"
    debug: bool = False
    allowed_hosts: list[str] = ["*"]

    # データベース
    database_url: str = "postgresql+asyncpg://user:pass@localhost/mydb"

    # 認証
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

### エントリーポイント（main.py）

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.routers import users, auth, items
from app.middleware import RateLimitMiddleware, LoggingMiddleware

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時処理
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created.")
    yield
    # シャットダウン時処理
    await engine.dispose()
    print("Database connection closed.")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="FastAPI完全ガイドのサンプルAPI",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ミドルウェア（後入れ先出し順で実行）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
app.add_middleware(LoggingMiddleware)

# ルーター登録
app.include_router(auth.router, prefix="/api/v1/auth", tags=["認証"])
app.include_router(users.router, prefix="/api/v1/users", tags=["ユーザー"])
app.include_router(items.router, prefix="/api/v1/items", tags=["アイテム"])


@app.get("/health", tags=["ヘルスチェック"])
async def health_check():
    return {"status": "ok", "version": settings.app_version}
```

---

## 3. Path Operation — ルーティングの基礎

### HTTPメソッドとデコレータ

```python
# app/routers/items.py
from fastapi import APIRouter, HTTPException, Query, Path, status
from typing import Annotated

from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse, ItemListResponse

router = APIRouter()


# GETエンドポイント（一覧取得）
@router.get(
    "/",
    response_model=ItemListResponse,
    summary="アイテム一覧取得",
    description="ページネーション対応のアイテム一覧を返す。",
)
async def list_items(
    page: Annotated[int, Query(ge=1, description="ページ番号")] = 1,
    per_page: Annotated[int, Query(ge=1, le=100, description="1ページあたりの件数")] = 20,
    search: Annotated[str | None, Query(description="検索キーワード")] = None,
):
    # 実装省略（後のSQLAlchemy節で詳述）
    return {"items": [], "total": 0, "page": page, "per_page": per_page}


# GETエンドポイント（単件取得）
@router.get(
    "/{item_id}",
    response_model=ItemResponse,
    summary="アイテム詳細取得",
    responses={
        404: {"description": "アイテムが見つからない"},
    },
)
async def get_item(
    item_id: Annotated[int, Path(ge=1, description="アイテムID")],
):
    # 存在確認
    item = None  # DBから取得する処理
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} not found",
        )
    return item


# POSTエンドポイント（作成）
@router.post(
    "/",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="アイテム作成",
)
async def create_item(item_data: ItemCreate):
    # DB保存処理
    return item_data


# PATCHエンドポイント（部分更新）
@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: Annotated[int, Path(ge=1)],
    item_data: ItemUpdate,
):
    return {"id": item_id, **item_data.model_dump(exclude_unset=True)}


# DELETEエンドポイント
@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="アイテム削除",
)
async def delete_item(item_id: Annotated[int, Path(ge=1)]):
    # 削除処理
    pass
```

### レスポンスモデルの高度な使い方

```python
from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
import json

router = APIRouter()

# カスタムレスポンスヘッダー
@router.get("/download/{file_id}")
async def download_file(file_id: int):
    return FileResponse(
        path=f"/tmp/files/{file_id}.pdf",
        filename="document.pdf",
        media_type="application/pdf",
    )

# ストリーミングレスポンス
@router.get("/stream")
async def stream_data():
    async def generate():
        for i in range(10):
            yield f"data: {json.dumps({'chunk': i})}\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream")

# 動的レスポンスモデル選択
@router.get(
    "/users/{user_id}",
    response_model=UserPublicResponse | UserPrivateResponse,
)
async def get_user_data(user_id: int, include_private: bool = False):
    user = await fetch_user(user_id)
    if include_private:
        return UserPrivateResponse.model_validate(user)
    return UserPublicResponse.model_validate(user)
```

---

## 4. Pydantic v2 — データバリデーションの要

### BaseModelの基本

```python
# app/schemas/user.py
from pydantic import (
    BaseModel,
    Field,
    EmailStr,
    field_validator,
    model_validator,
    ConfigDict,
    computed_field,
)
from datetime import datetime
from typing import Annotated


# カスタム型エイリアス
PositiveInt = Annotated[int, Field(gt=0)]
NonEmptyStr = Annotated[str, Field(min_length=1, max_length=255)]


class UserBase(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,      # ORMオブジェクトから変換可能
        populate_by_name=True,     # フィールド名エイリアスで投入可能
        str_strip_whitespace=True, # 文字列の前後空白を自動除去
        validate_default=True,     # デフォルト値もバリデーション対象
    )

    username: NonEmptyStr = Field(
        ...,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="英数字・アンダースコア・ハイフンのみ使用可",
        examples=["john_doe", "alice-123"],
    )
    email: EmailStr = Field(..., description="メールアドレス")
    full_name: str | None = Field(None, max_length=100)
    age: PositiveInt | None = Field(None, le=150, description="年齢（1〜150）")


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    password_confirm: str

    @field_validator("username")
    @classmethod
    def username_must_not_be_reserved(cls, v: str) -> str:
        reserved = {"admin", "root", "system", "api"}
        if v.lower() in reserved:
            raise ValueError(f"'{v}' は予約済みユーザー名です")
        return v

    @model_validator(mode="after")
    def passwords_must_match(self) -> "UserCreate":
        if self.password != self.password_confirm:
            raise ValueError("パスワードが一致しません")
        return self


class UserUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str | None = None
    age: PositiveInt | None = None

    # 更新時はすべてのフィールドをオプションにする
    model_config = ConfigDict(
        from_attributes=True,
        extra="forbid",  # 未定義フィールドは拒否
    )


class UserResponse(UserBase):
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    # 計算フィールド（DBに保存しない）
    @computed_field
    @property
    def display_name(self) -> str:
        return self.full_name or self.username


class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
    page: int
    per_page: int
    has_next: bool

    @computed_field
    @property
    def total_pages(self) -> int:
        return -(-self.total // self.per_page)  # ceil division
```

### 複雑なネスト構造

```python
from pydantic import BaseModel, Field
from enum import Enum
from decimal import Decimal


class Currency(str, Enum):
    JPY = "JPY"
    USD = "USD"
    EUR = "EUR"


class Address(BaseModel):
    postal_code: str = Field(..., pattern=r"^\d{3}-\d{4}$")
    prefecture: str
    city: str
    street: str
    building: str | None = None


class Price(BaseModel):
    amount: Decimal = Field(..., decimal_places=2, ge=0)
    currency: Currency = Currency.JPY

    def to_jpy(self) -> Decimal:
        rates = {Currency.JPY: 1, Currency.USD: 150, Currency.EUR: 162}
        return self.amount * rates[self.currency]


class OrderCreate(BaseModel):
    items: list[dict[str, int]] = Field(..., min_length=1)
    shipping_address: Address
    price: Price
    notes: str | None = Field(None, max_length=1000)

    @model_validator(mode="after")
    def validate_items_not_empty(self) -> "OrderCreate":
        if not any(qty > 0 for item in self.items for qty in item.values()):
            raise ValueError("注文数量は1以上である必要があります")
        return self
```

---

## 5. 依存性注入（Dependency Injection）

### Dependsの基本

FastAPIの依存性注入システムは非常に強力だ。認証・DB接続・ページネーション等の共通処理を再利用可能な形でまとめられる。

```python
# app/dependencies/common.py
from fastapi import Depends, Query
from dataclasses import dataclass
from typing import Annotated


@dataclass
class Pagination:
    page: int
    per_page: int
    offset: int

    @property
    def limit(self) -> int:
        return self.per_page


async def get_pagination(
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
) -> Pagination:
    offset = (page - 1) * per_page
    return Pagination(page=page, per_page=per_page, offset=offset)


# 使い方
@router.get("/items")
async def list_items(pagination: Annotated[Pagination, Depends(get_pagination)]):
    return {
        "page": pagination.page,
        "per_page": pagination.per_page,
        "offset": pagination.offset,
    }
```

### 依存性チェーン（依存の依存）

```python
# app/dependencies/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.services.auth_service import decode_access_token
from app.services.user_service import get_user_by_id
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報が無効です",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id: int | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = await get_user_by_id(db, user_id)
    if not user:
        raise credentials_exception
    return user


async def get_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="アカウントが無効です",
        )
    return current_user


async def get_admin_user(
    current_user: Annotated[User, Depends(get_active_user)],
) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です",
        )
    return current_user


# 型エイリアスで簡潔に
CurrentUser = Annotated[User, Depends(get_active_user)]
AdminUser = Annotated[User, Depends(get_admin_user)]
DB = Annotated[AsyncSession, Depends(get_db)]


# ルーターで使用
@router.get("/profile")
async def get_profile(current_user: CurrentUser, db: DB):
    return current_user


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin: AdminUser, db: DB):
    # 管理者のみアクセス可能
    pass
```

### クラスベースの依存性

```python
from fastapi import Depends, Request
from typing import Annotated


class PermissionChecker:
    def __init__(self, required_permissions: list[str]):
        self.required_permissions = required_permissions

    async def __call__(
        self,
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        user_permissions = set(current_user.permissions)
        required = set(self.required_permissions)
        if not required.issubset(user_permissions):
            missing = required - user_permissions
            raise HTTPException(
                status_code=403,
                detail=f"権限が不足しています: {', '.join(missing)}",
            )
        return current_user


# 使い方
@router.post("/articles")
async def create_article(
    data: ArticleCreate,
    user: Annotated[User, Depends(PermissionChecker(["articles:write"]))],
):
    pass

@router.delete("/articles/{id}")
async def delete_article(
    article_id: int,
    user: Annotated[User, Depends(PermissionChecker(["articles:write", "articles:delete"]))],
):
    pass
```

---

## 6. 認証 — JWT・OAuth2・パスワードハッシュ

### パスワードハッシュ

```python
# app/services/auth_service.py
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Any

from app.config import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode["exp"] = expire
    to_encode["type"] = "access"
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    to_encode["exp"] = expire
    to_encode["type"] = "refresh"
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None
```

### 認証ルーター

```python
# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.schemas.auth import Token, TokenRefresh, UserRegister
from app.services.auth_service import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
)
from app.services.user_service import get_user_by_email, create_user

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    existing = await get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="このメールアドレスは既に登録されています",
        )
    user = await create_user(db, user_data)
    return {"message": "登録完了", "user_id": user.id}


@router.post("/token", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from app.services.auth_service import decode_access_token as decode_token
    from jose import jwt, JWTError
    from app.config import get_settings

    settings = get_settings()
    try:
        payload = jwt.decode(
            token_data.refresh_token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="無効なリフレッシュトークン")
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="無効なリフレッシュトークン")

    from app.services.user_service import get_user_by_id
    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="ユーザーが見つかりません")

    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})

    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )
```

---

## 7. 非同期処理 — async/await・httpx

### 非同期の基本

FastAPIはASGI（Asynchronous Server Gateway Interface）ベースなので、async/awaitをネイティブにサポートしている。

```python
import asyncio
import httpx
from fastapi import APIRouter

router = APIRouter()


# 非同期エンドポイント
@router.get("/async-demo")
async def async_demo():
    # 並列実行で速度向上
    result1, result2, result3 = await asyncio.gather(
        fetch_external_api("https://api.example.com/data1"),
        fetch_database_data(),
        fetch_cache_data(),
    )
    return {"data1": result1, "data2": result2, "cached": result3}


async def fetch_external_api(url: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()


# httpx クライアントの再利用（依存性注入パターン）
from functools import lru_cache

@lru_cache
def get_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0),
        limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
        headers={"User-Agent": "MyAPI/1.0"},
    )


@router.get("/weather/{city}")
async def get_weather(
    city: str,
    client: httpx.AsyncClient = Depends(get_http_client),
):
    response = await client.get(
        f"https://api.openweathermap.org/data/2.5/weather",
        params={"q": city, "appid": "YOUR_API_KEY", "lang": "ja"},
    )
    return response.json()
```

### 非同期タスクのタイムアウト制御

```python
import asyncio
from fastapi import HTTPException


async def with_timeout(coro, timeout_seconds: float = 5.0):
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"処理がタイムアウトしました（{timeout_seconds}秒）",
        )


@router.get("/slow-endpoint")
async def slow_endpoint():
    result = await with_timeout(slow_operation(), timeout_seconds=3.0)
    return result
```

---

## 8. SQLAlchemy 2.0 — AsyncSession・ORM・マイグレーション

### データベース設定

```python
# app/database.py
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # 接続が生きているか確認
    pool_recycle=3600,   # 1時間でコネクションを再作成
    echo=settings.debug, # デバッグ時にSQLをログ出力
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### ORMモデル定義

```python
# app/models/user.py
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime

from app.database import Base


class User(Base):
    __tablename__ = "users"

    # 複合インデックス
    __table_args__ = (
        Index("ix_users_email_active", "email", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # リレーション
    items: Mapped[list["Item"]] = relationship(
        "Item", back_populates="owner", lazy="noload"
    )


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[int] = mapped_column(Integer, default=0)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    owner: Mapped["User"] = relationship("User", back_populates="items")
```

### CRUDサービス

```python
# app/services/user_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth_service import hash_password


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_users(
    db: AsyncSession,
    offset: int = 0,
    limit: int = 20,
    search: str | None = None,
) -> tuple[list[User], int]:
    query = select(User)
    count_query = select(func.count()).select_from(User)

    if search:
        like_pattern = f"%{search}%"
        filter_condition = (
            User.username.ilike(like_pattern) |
            User.email.ilike(like_pattern) |
            User.full_name.ilike(like_pattern)
        )
        query = query.where(filter_condition)
        count_query = count_query.where(filter_condition)

    total = (await db.execute(count_query)).scalar_one()
    users = (
        await db.execute(
            query.offset(offset).limit(limit).order_by(User.created_at.desc())
        )
    ).scalars().all()

    return list(users), total


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
    )
    db.add(user)
    await db.flush()  # commitせずにIDを取得
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession,
    user_id: int,
    update_data: UserUpdate,
) -> User | None:
    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        return await get_user_by_id(db, user_id)

    await db.execute(
        update(User).where(User.id == user_id).values(**update_dict)
    )
    return await get_user_by_id(db, user_id)


# ページネーション付きリレーション取得
async def get_user_with_items(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.items))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()
```

### Alembicマイグレーション

```bash
# Alembic初期化
alembic init alembic

# マイグレーションファイル生成（自動検出）
alembic revision --autogenerate -m "create_users_table"

# マイグレーション実行
alembic upgrade head

# 1つ前に戻す
alembic downgrade -1

# マイグレーション履歴確認
alembic history --verbose
```

```python
# alembic/env.py の非同期対応
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
from app.database import Base
from app.models import user, item  # モデルを全てインポート

config = context.config
fileConfig(config.config_file_name)
target_metadata = Base.metadata


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()
```

---

## 9. ミドルウェア — CORS・レート制限・ロギング

### カスタムミドルウェア

```python
# app/middleware.py
import time
import uuid
import logging
from collections import defaultdict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start_time = time.perf_counter()

        # リクエストID をヘッダーに付与
        request.state.request_id = request_id

        logger.info(
            "Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client": request.client.host if request.client else "unknown",
            },
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error(
                "Request failed",
                extra={"request_id": request_id, "error": str(exc)},
                exc_info=True,
            )
            raise

        duration_ms = (time.perf_counter() - start_time) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"

        logger.info(
            "Request completed",
            extra={
                "request_id": request_id,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
            },
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        max_requests: int = 100,
        window_seconds: int = 60,
    ):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self.window_seconds

        # ウィンドウ外のリクエストを削除
        self._requests[client_ip] = [
            t for t in self._requests[client_ip] if t > window_start
        ]

        if len(self._requests[client_ip]) >= self.max_requests:
            retry_after = int(
                self.window_seconds - (now - self._requests[client_ip][0])
            )
            return Response(
                content='{"detail": "レート制限に達しました"}',
                status_code=429,
                headers={
                    "Content-Type": "application/json",
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )

        self._requests[client_ip].append(now)
        remaining = self.max_requests - len(self._requests[client_ip])

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
```

---

## 10. バックグラウンドタスク

### FastAPI BackgroundTasks

```python
# app/routers/notifications.py
from fastapi import APIRouter, BackgroundTasks, Depends
from app.services.email_service import send_email, send_welcome_email

router = APIRouter()


async def send_notification_email(email: str, subject: str, body: str):
    """バックグラウンドで実行されるメール送信タスク"""
    try:
        await send_email(email, subject, body)
        print(f"Email sent to {email}")
    except Exception as e:
        print(f"Failed to send email to {email}: {e}")
        # エラーをログに記録（例外は再スローしない）


@router.post("/users/register")
async def register_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: DB,
):
    user = await create_user(db, user_data)

    # レスポンスを返した後にバックグラウンドで実行
    background_tasks.add_task(
        send_notification_email,
        email=user.email,
        subject="ご登録ありがとうございます",
        body=f"{user.username}様、登録が完了しました。",
    )
    background_tasks.add_task(
        send_welcome_email,
        user_id=user.id,
    )

    return {"message": "登録完了。確認メールを送信しました。", "user_id": user.id}
```

### Celery統合（本番向け非同期タスク）

```python
# app/celery_app.py
from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "myapi",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Tokyo",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5分でタイムアウト
    task_soft_time_limit=240,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


# app/tasks.py
from app.celery_app import celery_app
import asyncio


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="send_bulk_email",
)
def send_bulk_email(self, email_list: list[str], subject: str, body: str):
    try:
        # 同期コンテキストから非同期関数を呼び出す
        asyncio.run(_send_bulk_email_async(email_list, subject, body))
    except Exception as exc:
        raise self.retry(exc=exc)


async def _send_bulk_email_async(emails: list[str], subject: str, body: str):
    import httpx
    async with httpx.AsyncClient() as client:
        tasks = [
            client.post(
                "https://api.sendgrid.com/v3/mail/send",
                json={"to": email, "subject": subject, "body": body},
            )
            for email in emails
        ]
        await asyncio.gather(*tasks)


# FastAPIエンドポイントからCeleryタスクを起動
@router.post("/campaigns/send")
async def send_campaign(campaign_data: CampaignCreate, admin: AdminUser):
    task = send_bulk_email.delay(
        email_list=campaign_data.recipient_emails,
        subject=campaign_data.subject,
        body=campaign_data.body,
    )
    return {"task_id": task.id, "status": "queued"}


@router.get("/campaigns/tasks/{task_id}")
async def get_task_status(task_id: str):
    from app.celery_app import celery_app
    task = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task.status,
        "result": task.result if task.ready() else None,
    }
```

---

## 11. WebSocket

### リアルタイム通信の実装

```python
# app/routers/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Any
import json
import asyncio

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # room_id -> {user_id -> WebSocket}
        self.active_connections: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][user_id] = websocket

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].pop(user_id, None)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def send_to_user(self, user_id: str, room_id: str, message: dict):
        ws = self.active_connections.get(room_id, {}).get(user_id)
        if ws:
            await ws.send_json(message)

    async def broadcast_to_room(
        self,
        room_id: str,
        message: dict,
        exclude_user_id: str | None = None,
    ):
        connections = self.active_connections.get(room_id, {})
        disconnected = []
        for user_id, ws in connections.items():
            if user_id == exclude_user_id:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(user_id)
        for user_id in disconnected:
            self.disconnect(room_id, user_id)


manager = ConnectionManager()


@router.websocket("/ws/chat/{room_id}")
async def websocket_chat(
    websocket: WebSocket,
    room_id: str,
    token: str,  # クエリパラメータで認証トークン受け取り
):
    # トークン検証
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001, reason="認証失敗")
        return

    user_id = str(payload["sub"])
    await manager.connect(websocket, room_id, user_id)

    # 入室通知
    await manager.broadcast_to_room(
        room_id,
        {"type": "join", "user_id": user_id, "message": f"{user_id}が入室しました"},
        exclude_user_id=user_id,
    )

    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type", "message")

            if message_type == "message":
                await manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "message",
                        "user_id": user_id,
                        "content": data.get("content", ""),
                        "timestamp": asyncio.get_event_loop().time(),
                    },
                )
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
        await manager.broadcast_to_room(
            room_id,
            {"type": "leave", "user_id": user_id, "message": f"{user_id}が退室しました"},
        )
```

---

## 12. テスト — pytest + httpx AsyncClient

### テスト設定

```python
# tests/conftest.py
import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)

from app.main import app
from app.database import Base, get_db
from app.config import get_settings

settings = get_settings()

# テスト用インメモリDB
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    """認証済みヘッダーを返すフィクスチャ"""
    # テストユーザー作成
    await client.post("/api/v1/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "TestPass123!",
        "password_confirm": "TestPass123!",
    })
    # ログイン
    response = await client.post("/api/v1/auth/token", data={
        "username": "test@example.com",
        "password": "TestPass123!",
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

### テストケース

```python
# tests/test_users.py
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestUserEndpoints:
    async def test_register_success(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/register", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
        })
        assert response.status_code == 201
        data = response.json()
        assert "user_id" in data
        assert data["message"] == "登録完了"

    async def test_register_duplicate_email(self, client: AsyncClient):
        payload = {
            "username": "user1",
            "email": "dup@example.com",
            "password": "Pass123!",
            "password_confirm": "Pass123!",
        }
        await client.post("/api/v1/auth/register", json=payload)
        payload["username"] = "user2"
        response = await client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 409

    async def test_login_success(self, client: AsyncClient):
        # ユーザー作成
        await client.post("/api/v1/auth/register", json={
            "username": "logintest",
            "email": "login@example.com",
            "password": "TestPass123!",
            "password_confirm": "TestPass123!",
        })
        # ログイン
        response = await client.post("/api/v1/auth/token", data={
            "username": "login@example.com",
            "password": "TestPass123!",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_get_profile_unauthorized(self, client: AsyncClient):
        response = await client.get("/api/v1/users/profile")
        assert response.status_code == 401

    async def test_get_profile_authorized(
        self, client: AsyncClient, auth_headers: dict
    ):
        response = await client.get(
            "/api/v1/users/profile",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "username" in data
        assert "email" in data

    async def test_update_profile(
        self, client: AsyncClient, auth_headers: dict
    ):
        response = await client.patch(
            "/api/v1/users/me",
            json={"full_name": "Test User"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["full_name"] == "Test User"

    async def test_pagination(self, client: AsyncClient, auth_headers: dict):
        response = await client.get(
            "/api/v1/users/?page=1&per_page=10",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert data["per_page"] == 10


# tests/test_items.py
@pytest.mark.asyncio
class TestItemCRUD:
    async def test_create_item(
        self, client: AsyncClient, auth_headers: dict
    ):
        response = await client.post(
            "/api/v1/items/",
            json={"title": "テストアイテム", "price": 1000},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "テストアイテム"
        assert data["price"] == 1000

    async def test_get_item_not_found(self, client: AsyncClient):
        response = await client.get("/api/v1/items/99999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
```

---

## 13. Dockerデプロイ — マルチステージビルド

### Dockerfile（マルチステージ）

```dockerfile
# Dockerfile

# ---- ビルドステージ ----
FROM python:3.12-slim AS builder

WORKDIR /build

# システム依存パッケージ
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# uv（高速パッケージマネージャ）を使用
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml .
RUN uv sync --no-dev --frozen

# ---- 本番ステージ ----
FROM python:3.12-slim AS production

WORKDIR /app

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --gid 1001 --no-create-home appuser

# ランタイム依存のみインストール
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ビルドステージから仮想環境をコピー
COPY --from=builder /build/.venv /app/.venv

# アプリコードをコピー
COPY --chown=appuser:appgroup app/ /app/app/
COPY --chown=appuser:appgroup alembic/ /app/alembic/
COPY --chown=appuser:appgroup alembic.ini /app/

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

USER appuser

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

# Gunicorn + uvicorn workers
CMD ["gunicorn", "app.main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "4", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "60", \
     "--keepalive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
```

### docker-compose.yml（本番向け）

```yaml
version: "3.9"

services:
  api:
    build:
      context: .
      target: production
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=false
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  celery-worker:
    build:
      context: .
      target: production
    command: celery -A app.celery_app worker --loglevel=info --concurrency=4
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/ssl/certs:ro
    depends_on:
      - api
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### Nginx設定

```nginx
# nginx.conf
upstream api_backend {
    server api:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/certs/privkey.pem;

    # セキュリティヘッダー
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }

    location /ws/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 3600s;
    }
}
```

---

## 本番運用のベストプラクティス

### エラーハンドリング（グローバル）

```python
# app/exception_handlers.py
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import logging

logger = logging.getLogger(__name__)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "入力値が不正です", "errors": errors},
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.error(
        "Unhandled exception",
        exc_info=True,
        extra={"path": str(request.url), "method": request.method},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "サーバー内部エラーが発生しました"},
    )


# main.pyに追加
from fastapi.exceptions import RequestValidationError
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)
```

### パフォーマンスチューニング

```python
# キャッシュ（Redis）
from redis.asyncio import Redis
import json
import hashlib


class CacheService:
    def __init__(self, redis: Redis, default_ttl: int = 300):
        self.redis = redis
        self.default_ttl = default_ttl

    def _make_key(self, prefix: str, **kwargs) -> str:
        params = json.dumps(kwargs, sort_keys=True)
        hash_val = hashlib.md5(params.encode()).hexdigest()[:8]
        return f"{prefix}:{hash_val}"

    async def get(self, key: str):
        value = await self.redis.get(key)
        if value:
            return json.loads(value)
        return None

    async def set(self, key: str, value, ttl: int | None = None):
        await self.redis.setex(
            key,
            ttl or self.default_ttl,
            json.dumps(value, default=str),
        )

    async def delete(self, key: str):
        await self.redis.delete(key)

    async def invalidate_pattern(self, pattern: str):
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)


# デコレータパターン
def cached(prefix: str, ttl: int = 300):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            cache_key = f"{prefix}:{hash(str(args) + str(kwargs))}"
            # キャッシュ確認・設定の処理
            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

---

## DevToolBoxでAPIレスポンスを検証する

FastAPIの開発中、エンドポイントが返すJSONレスポンスの構造を確認したい場面は多い。Swagger UI（`/docs`）でテストできるが、レスポンスJSONをさらに整形・検証・スキーマ確認したい時には外部ツールが便利だ。

[**DevToolBox**](https://usedevtools.com/) はブラウザ上で動作する開発者向けツールセットだ。JSONフォーマッター・バリデーター・スキーマジェネレーターをはじめ、Base64エンコード/デコード・JWT解析・正規表現テスターなど、APIデバッグに必要なツールが一か所にまとまっている。

特にFastAPIの開発で役立つ用途：

- **JSONフォーマッター**: `curl`や`httpx`で取得したAPIレスポンスを整形して可読性を上げる
- **JSON Schema Validator**: Pydanticモデルが期待するスキーマとレスポンスの構造が一致しているか検証
- **JWT Decoder**: `create_access_token`で生成したトークンのペイロードを即座にデコードして確認
- **Base64ツール**: バイナリデータのエンコードを検証する

インストール不要でブラウザからすぐ使えるため、ローカル開発環境の構築と並行して活用できる。

---

## まとめ

FastAPIは「速度・型安全・開発体験」を高い次元で両立させた現代的なPython APIフレームワークだ。この記事で取り上げたポイントを振り返る。

| 機能 | 要点 |
|---|---|
| 基礎設定 | pyproject.toml + pydantic-settings で型安全な環境変数管理 |
| ルーティング | Annotated + Path/Query/Body で宣言的な型バリデーション |
| Pydantic v2 | model_config・field_validator・computed_field で強力なスキーマ定義 |
| 依存性注入 | Depends チェーンで認証・DB・ページネーションを再利用 |
| 認証 | JWT + OAuth2 + passlib で本番品質の認証基盤 |
| 非同期 | asyncio.gather で並列処理・httpx で非同期HTTPクライアント |
| SQLAlchemy | AsyncSession + mapped_column で型安全なORM |
| テスト | AsyncClient + fixture でE2Eテストを自動化 |
| デプロイ | マルチステージDockerビルド + Gunicorn + Nginx |

FastAPIのドキュメントは非常に充実しており（fastapi.tiangolo.com）、公式チュートリアルと組み合わせてこの記事を活用することで、本番グレードのAPIを短期間で構築できるはずだ。

型ヒントを徹底することで、IDEのサポートが最大限に活かせ、実行時エラーを設計段階で潰せる。それがFastAPIの最大の価値だ。

---

*関連記事: [SQLAlchemy 2.0完全ガイド](/blog/drizzle-orm-guide) / [Dockerコンテナ本番運用](/blog/docker-complete-guide) / [JWT認証完全解説](/blog/jwt-authentication-complete-guide)*

---

## スキルアップ・キャリアアップのおすすめリソース

FastAPIのスキルはバックエンド・AI API開発の両面で高く評価される。次のキャリアステップに役立ててほしい。

### 転職・キャリアアップ
- **[レバテックキャリア](https://levtech.jp)** — ITエンジニア専門の転職エージェント。PythonバックエンドエンジニアやAI APIの開発案件が豊富。年収600万円以上の求人多数。無料相談可能。
- **[Findy](https://findy-job.com)** — GitHubのPython・FastAPIプロジェクトが評価対象。スカウト型でリモート求人が充実。バックエンド・MLエンジニアへの転職に人気。

### オンライン学習
- **[Udemy](https://www.udemy.com)** — FastAPI・Pydantic v2・SQLAlchemyを組み合わせた実践的なAPIサーバー構築コースが充実。Docker・AWS連携まで含めた本番対応のコースも多い。セール時は大幅割引。
