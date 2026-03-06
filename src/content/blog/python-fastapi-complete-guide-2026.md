---
title: 'Python FastAPI完全ガイド2026｜非同期API開発・自動ドキュメント・認証・デプロイ'
description: 'Python FastAPIによるモダンAPI開発を解説。非同期処理、Pydanticバリデーション、自動OpenAPIドキュメント生成、OAuth2認証、SQLAlchemy連携、Docker/クラウドデプロイまで。'
pubDate: '2026-03-05'
tags: ['Python', 'FastAPI', 'API', 'バックエンド', 'Web開発']
---

## FastAPIとは

FastAPIは、Python 3.7以降で動作する高性能なWebフレームワークだ。型ヒントを活用した自動バリデーション、自動ドキュメント生成、非同期処理のネイティブサポートなど、モダンAPI開発に必要な機能を備えている。

Starlette（ASGI）とPydantic（データバリデーション）の上に構築されており、Node.jsやGoに匹敵するパフォーマンスを発揮する。

### Django / Flask / FastAPI 比較

| 特徴 | Django | Flask | FastAPI |
|------|--------|-------|---------|
| アーキテクチャ | フルスタック（MTV） | マイクロフレームワーク | マイクロフレームワーク |
| 型ヒント活用 | 限定的 | なし | 全面的 |
| 非同期サポート | Django 4.1以降（部分的） | Flask 2.0以降（部分的） | ネイティブ対応 |
| 自動ドキュメント | なし（DRF別途） | なし | Swagger UI / ReDoc 組み込み |
| バリデーション | Django Forms / DRF Serializer | 手動 / Marshmallow | Pydantic（自動） |
| ORM | Django ORM 組み込み | 外部（SQLAlchemy等） | 外部（SQLAlchemy等） |
| 学習コスト | 高い | 低い | 中程度 |
| 管理画面 | 組み込み | なし | なし |

### ベンチマーク

TechEmpower Round 22のJSON Serializationベンチマークを参考にした相対性能比較は以下の通りだ。

```
FastAPI (Uvicorn)  : ████████████████████████ ~24,000 req/s
Flask (Gunicorn)   : ████████               ~8,000 req/s
Django (Gunicorn)  : ██████                 ~6,000 req/s
Express.js (Node)  : ██████████████████████ ~22,000 req/s
Gin (Go)           : ████████████████████████████ ~28,000 req/s
```

FastAPIはPythonフレームワークの中では圧倒的に高速で、Node.jsのExpressに迫る性能を持つ。

### FastAPIを選ぶべきケース

- REST API / GraphQL APIの構築
- マイクロサービスアーキテクチャ
- 機械学習モデルのサービング
- リアルタイム通信が必要なアプリケーション
- 型安全性を重視するプロジェクト

## セットアップ

### uvを使ったプロジェクト作成（推奨）

uvはRust製の高速Pythonパッケージマネージャーで、2026年現在のデファクトスタンダードになりつつある。

```bash
# uvのインストール
curl -LsSf https://astral.sh/uv/install.sh | sh

# プロジェクト作成
uv init fastapi-project
cd fastapi-project

# 依存関係の追加
uv add fastapi uvicorn[standard]

# 開発用依存関係
uv add --dev pytest httpx pytest-asyncio
```

### pipを使う場合

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install fastapi uvicorn[standard]
```

### 最小構成のアプリケーション

`main.py`を作成する。

```python
from fastapi import FastAPI

app = FastAPI(
    title="My API",
    description="FastAPIで構築したAPI",
    version="1.0.0",
)


@app.get("/")
async def root():
    return {"message": "Hello, FastAPI!"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

開発サーバーを起動する。

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

ブラウザで `http://localhost:8000` にアクセスすると、JSONレスポンスが返る。`--reload` オプションにより、ファイル変更時に自動でサーバーが再起動する。

## ルーティングとパスパラメータ

### 基本的なルーティング

FastAPIはHTTPメソッドに対応するデコレータを提供している。

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/items")
async def list_items():
    return {"items": ["item1", "item2"]}


@app.post("/items")
async def create_item():
    return {"message": "Item created"}


@app.put("/items/{item_id}")
async def update_item(item_id: int):
    return {"message": f"Item {item_id} updated"}


@app.delete("/items/{item_id}")
async def delete_item(item_id: int):
    return {"message": f"Item {item_id} deleted"}
```

### パスパラメータと型変換

パスパラメータに型アノテーションを付けると、自動的に型変換とバリデーションが行われる。

```python
from enum import Enum


class ItemCategory(str, Enum):
    electronics = "electronics"
    books = "books"
    clothing = "clothing"


@app.get("/items/{item_id}")
async def get_item(item_id: int):
    # item_idは自動的にintに変換される
    # 文字列が渡された場合は422エラーが返る
    return {"item_id": item_id}


@app.get("/categories/{category}")
async def get_category(category: ItemCategory):
    # Enumによるバリデーション
    return {"category": category, "message": f"{category.value}カテゴリの商品一覧"}
```

### クエリパラメータ

関数の引数のうち、パスパラメータに含まれないものは自動的にクエリパラメータとして扱われる。

```python
from fastapi import Query


@app.get("/items")
async def list_items(
    skip: int = 0,
    limit: int = Query(default=10, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1, max_length=50),
):
    results = {"skip": skip, "limit": limit}
    if q:
        results["query"] = q
    return results
```

`Query`を使うと、バリデーションルールを細かく指定できる。`ge`は「以上」、`le`は「以下」を意味する。

### APIRouterによるモジュール分割

アプリケーションが大きくなったら、`APIRouter`でエンドポイントを分割する。

```python
# routers/users.py
from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/")
async def list_users():
    return [{"id": 1, "name": "Tanaka"}]


@router.get("/{user_id}")
async def get_user(user_id: int):
    return {"id": user_id, "name": "Tanaka"}
```

```python
# main.py
from fastapi import FastAPI
from routers import users, items

app = FastAPI()
app.include_router(users.router)
app.include_router(items.router)
```

## Pydanticモデルとバリデーション

FastAPIのバリデーション機構の中核を担うのがPydanticだ。型ヒントベースでデータの検証・変換・シリアライズを自動的に行う。

### リクエストボディの定義

```python
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["山田太郎"])
    email: EmailStr
    age: int = Field(..., ge=0, le=150)
    bio: str | None = Field(default=None, max_length=500)


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    age: int
    bio: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


@app.post("/users", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate):
    # userは自動的にバリデーション済み
    # 不正なデータが送られた場合は422 Unprocessable Entityが返る
    new_user = {
        "id": 1,
        "name": user.name,
        "email": user.email,
        "age": user.age,
        "bio": user.bio,
        "created_at": datetime.now(),
    }
    return new_user
```

### カスタムバリデーター

```python
from pydantic import BaseModel, field_validator, model_validator


class OrderCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)
    discount_code: str | None = None
    shipping_address: str
    billing_address: str | None = None

    @field_validator("shipping_address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("住所は10文字以上で入力してください")
        return v.strip()

    @model_validator(mode="after")
    def set_billing_address(self):
        if self.billing_address is None:
            self.billing_address = self.shipping_address
        return self
```

### ネストされたモデル

```python
class Address(BaseModel):
    postal_code: str = Field(..., pattern=r"^\d{3}-\d{4}$")
    prefecture: str
    city: str
    street: str


class Company(BaseModel):
    name: str
    address: Address
    employees: list[str] = []


@app.post("/companies")
async def create_company(company: Company):
    return company
```

リクエストボディの例は以下の通りだ。

```json
{
  "name": "テック株式会社",
  "address": {
    "postal_code": "100-0001",
    "prefecture": "東京都",
    "city": "千代田区",
    "street": "千代田1-1"
  },
  "employees": ["田中", "佐藤"]
}
```

## 非同期処理（async / await）

FastAPIはASGI上で動作するため、非同期処理をネイティブにサポートしている。I/Oバウンドな処理で大きなパフォーマンス向上が見込める。

### 基本的な非同期エンドポイント

```python
import asyncio
import httpx


@app.get("/external-data")
async def fetch_external_data():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        return response.json()


@app.get("/parallel-fetch")
async def parallel_fetch():
    async with httpx.AsyncClient() as client:
        # 複数のAPIを並行して呼び出す
        results = await asyncio.gather(
            client.get("https://api.example.com/users"),
            client.get("https://api.example.com/products"),
            client.get("https://api.example.com/orders"),
        )
        return {
            "users": results[0].json(),
            "products": results[1].json(),
            "orders": results[2].json(),
        }
```

### 同期関数と非同期関数の使い分け

```python
# 非同期関数: I/Oバウンドな処理に使う
@app.get("/async-endpoint")
async def async_endpoint():
    # await可能な処理
    data = await some_async_operation()
    return data


# 同期関数: CPUバウンドな処理や同期ライブラリを使う場合
# FastAPIが自動的にスレッドプールで実行する
@app.get("/sync-endpoint")
def sync_endpoint():
    # 重い計算処理
    result = heavy_computation()
    return {"result": result}
```

`async def`で定義したエンドポイントはイベントループ上で実行される。`def`（asyncなし）で定義した場合はスレッドプールで実行されるため、同期的なブロッキング処理も安全に使える。

### バックグラウンドタスク

レスポンスを返した後にバックグラウンドで処理を実行できる。

```python
from fastapi import BackgroundTasks


def send_notification_email(email: str, message: str):
    # メール送信処理（時間がかかる）
    print(f"Sending email to {email}: {message}")


@app.post("/orders")
async def create_order(order: OrderCreate, background_tasks: BackgroundTasks):
    # 注文処理
    order_id = 12345

    # バックグラウンドでメール送信
    background_tasks.add_task(
        send_notification_email,
        "customer@example.com",
        f"注文 #{order_id} を受け付けました",
    )

    # レスポンスは即座に返る
    return {"order_id": order_id, "status": "created"}
```

## 自動ドキュメント（Swagger UI / ReDoc）

FastAPIはOpenAPI仕様に基づいたAPIドキュメントを自動生成する。追加の設定やコードは不要だ。

### アクセス方法

サーバー起動後、以下のURLでドキュメントにアクセスできる。

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

Swagger UIではブラウザ上から直接APIを試すことも可能だ。

### ドキュメントのカスタマイズ

```python
from fastapi import FastAPI

app = FastAPI(
    title="ECサイトAPI",
    description="""
## 概要
ECサイトのバックエンドAPI。

## 認証
Bearer Tokenを使用。`/auth/token`エンドポイントでトークンを取得してください。
    """,
    version="2.0.0",
    contact={
        "name": "API Support",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT",
    },
)
```

### エンドポイントごとのドキュメント

```python
@app.get(
    "/items/{item_id}",
    summary="商品の取得",
    description="指定されたIDの商品情報を返す。在庫状況も含む。",
    response_description="商品情報",
    tags=["items"],
)
async def get_item(item_id: int):
    """
    商品IDを指定して商品情報を取得する。

    - **item_id**: 商品の一意なID（正の整数）
    """
    return {"item_id": item_id, "name": "サンプル商品"}
```

## SQLAlchemy + Alembicでデータベース

### SQLAlchemy 2.0スタイルでのセットアップ

```bash
uv add sqlalchemy[asyncio] asyncpg alembic
```

```python
# database.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/mydb"

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

### モデル定義

```python
# models.py
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    posts: Mapped[list["Post"]] = relationship(back_populates="author")


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str]
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    author: Mapped["User"] = relationship(back_populates="posts")
```

### CRUDエンドポイント

```python
# crud.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import User, Post


async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()


async def create_user(db: AsyncSession, name: str, email: str) -> User:
    user = User(name=name, email=email)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

```python
# routers/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
import crud
from schemas import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    users = await crud.get_users(db, skip=skip, limit=limit)
    return users


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    user = await crud.create_user(db, name=user_in.name, email=user_in.email)
    return user
```

### Alembicによるマイグレーション

```bash
# Alembic初期化
alembic init alembic

# alembic/env.py を編集して非同期対応にする
```

`alembic/env.py`の主要な変更点は以下の通りだ。

```python
# alembic/env.py
from models import Base

target_metadata = Base.metadata

# 非同期マイグレーション用の設定
from sqlalchemy.ext.asyncio import async_engine_from_config


async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()
```

```bash
# マイグレーションファイル生成
alembic revision --autogenerate -m "create users and posts tables"

# マイグレーション実行
alembic upgrade head

# ロールバック
alembic downgrade -1
```

## OAuth2 + JWT認証

### 依存関係のインストール

```bash
uv add python-jose[cryptography] passlib[bcrypt]
```

### 認証モジュールの実装

```python
# auth.py
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報が無効です",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # データベースからユーザーを取得する処理
    user = await fetch_user_by_username(username)
    if user is None:
        raise credentials_exception
    return user
```

### 認証エンドポイント

```python
# routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from auth import verify_password, create_access_token, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザー名またはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return Token(access_token=access_token, token_type="bearer")
```

### 保護されたエンドポイント

```python
from auth import get_current_user
from models import User


@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/admin-only")
async def admin_endpoint(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    return {"message": "管理者用データ"}
```

## ミドルウェアとCORS

### CORS設定

フロントエンドとバックエンドを別ドメインで運用する場合、CORS設定が必須だ。

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://myapp.example.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### カスタムミドルウェア

リクエスト/レスポンスの前後に処理を挟むことができる。

```python
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()

        response = await call_next(request)

        duration = time.perf_counter() - start_time
        logger.info(
            f"{request.method} {request.url.path} "
            f"- {response.status_code} "
            f"- {duration:.3f}s"
        )

        response.headers["X-Process-Time"] = str(duration)
        return response


app.add_middleware(RequestLoggingMiddleware)
```

### レート制限ミドルウェア

```python
from collections import defaultdict
from datetime import datetime, timezone


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        now = datetime.now(timezone.utc).timestamp()

        # ウィンドウ外のリクエストを削除
        self.requests[client_ip] = [
            t for t in self.requests[client_ip]
            if now - t < self.window_seconds
        ]

        if len(self.requests[client_ip]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "リクエスト数が上限を超えました"},
            )

        self.requests[client_ip].append(now)
        return await call_next(request)
```

## WebSocket

FastAPIはWebSocketもネイティブにサポートしている。リアルタイム通信が必要なチャットアプリケーションや通知システムに活用できる。

### 基本的なWebSocket

```python
from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


@app.websocket("/ws/chat/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"Room {room_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"ユーザーが退出しました")
```

### WebSocket + JSON通信

```python
from pydantic import BaseModel


class ChatMessage(BaseModel):
    username: str
    content: str
    timestamp: str | None = None


@app.websocket("/ws/chat-json")
async def websocket_json(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_json()
            message = ChatMessage(**raw)
            message.timestamp = datetime.now(timezone.utc).isoformat()
            await websocket.send_json(message.model_dump())
    except WebSocketDisconnect:
        pass
```

## テスト（pytest + httpx）

FastAPIはpytestとhttpxを使ったテストが非常に書きやすい。

### テスト用のセットアップ

```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

### エンドポイントのテスト

```python
# test_main.py
import pytest


@pytest.mark.anyio
async def test_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, FastAPI!"}


@pytest.mark.anyio
async def test_create_user(client: AsyncClient):
    user_data = {
        "name": "田中太郎",
        "email": "tanaka@example.com",
        "age": 30,
    }
    response = await client.post("/users", json=user_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "田中太郎"
    assert data["email"] == "tanaka@example.com"


@pytest.mark.anyio
async def test_create_user_invalid_email(client: AsyncClient):
    user_data = {
        "name": "田中太郎",
        "email": "invalid-email",
        "age": 30,
    }
    response = await client.post("/users", json=user_data)
    assert response.status_code == 422


@pytest.mark.anyio
async def test_get_item_not_found(client: AsyncClient):
    response = await client.get("/items/99999")
    assert response.status_code == 404
```

### データベースを含むテスト

```python
# conftest.py（データベーステスト用）
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from models import Base
from database import get_db
from main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"
test_engine = create_async_engine(TEST_DATABASE_URL)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession)


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session():
    async with TestSession() as session:
        yield session


@pytest.fixture
async def client(db_session):
    def override_get_db():
        return db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

テストの実行は以下のコマンドで行う。

```bash
# 全テスト実行
pytest -v

# カバレッジ付き
pytest --cov=. --cov-report=html

# 特定のテストファイルのみ
pytest tests/test_users.py -v
```

## Docker + クラウドデプロイ

### Dockerfile

```dockerfile
FROM python:3.12-slim AS base

WORKDIR /app

# uvのインストール
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 依存関係のインストール
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# アプリケーションコードのコピー
COPY . .

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml

```yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/mydb
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 本番環境向けの起動設定

```python
# gunicorn.conf.py
import multiprocessing

bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
keepalive = 120
accesslog = "-"
errorlog = "-"
loglevel = "info"
```

```bash
gunicorn main:app -c gunicorn.conf.py
```

### クラウドデプロイの選択肢

**Fly.io（無料枠あり）**

```bash
# Fly.ioにデプロイ
fly launch
fly deploy
```

**Railway / Render**

GitHubリポジトリを接続するだけで自動デプロイが可能。`Dockerfile`があれば自動検出される。

**AWS Lambda + Mangum**

サーバーレスデプロイの場合は、MangumアダプタでAWS Lambdaに対応できる。

```python
from mangum import Mangum
from main import app

handler = Mangum(app)
```

### プロジェクト構成の全体像

最終的なプロジェクト構成は以下のようになる。

```
fastapi-project/
├── alembic/
│   ├── versions/
│   └── env.py
├── routers/
│   ├── __init__.py
│   ├── auth.py
│   ├── users.py
│   └── items.py
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_users.py
│   └── test_items.py
├── auth.py
├── crud.py
├── database.py
├── main.py
├── models.py
├── schemas.py
├── alembic.ini
├── docker-compose.yml
├── Dockerfile
├── gunicorn.conf.py
├── pyproject.toml
└── uv.lock
```

## まとめ

FastAPIは、Pythonで高性能なAPIを構築するための最有力フレームワークだ。型ヒントを軸にしたバリデーション、自動ドキュメント生成、非同期処理のネイティブサポートにより、開発速度と実行速度の両方で優れた結果を出せる。

本記事で扱った主要なポイントを振り返る。

- **Pydantic**: 型ヒントベースの自動バリデーションでリクエスト/レスポンスの整合性を保証
- **非同期処理**: `async/await`によるI/O並行処理で高スループットを実現
- **自動ドキュメント**: Swagger UIとReDocがゼロ設定で利用可能
- **SQLAlchemy 2.0**: 非同期ORMとAlembicマイグレーションで堅牢なデータ層を構築
- **JWT認証**: OAuth2フローとJWTトークンによるセキュアな認証基盤
- **テスト**: pytest + httpxの組み合わせで非同期テストも簡潔に記述可能
- **デプロイ**: DockerコンテナとGunicorn + Uvicornワーカーで本番運用に対応

Django（フルスタック・管理画面重視）やFlask（軽量・学習コスト低）にもそれぞれの強みがある。プロジェクトの要件に応じて適切なフレームワークを選択するのが重要だが、API開発が主目的であればFastAPIが第一候補になるだろう。
