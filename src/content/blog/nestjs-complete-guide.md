---
title: 'NestJS完全ガイド：TypeScript対応エンタープライズNode.jsフレームワーク'
description: 'NestJSの基本から応用まで完全解説。モジュール・コントローラー・サービス・依存性注入・Guard・Interceptor・WebSocket・マイクロサービス対応まで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['NestJS', 'TypeScript', 'Backend']
---

NestJSは、TypeScriptをファーストクラスでサポートするNode.jsフレームワークであり、エンタープライズグレードのサーバーサイドアプリケーション構築に特化した設計思想を持つ。Angularのアーキテクチャパターンに強く影響を受けており、モジュール・コントローラー・サービスという3層構造でアプリケーションを整理する。本ガイドでは、NestJSの基礎から実践的な応用まで、豊富なコード例とともに体系的に解説する。

## NestJSとは何か・なぜ使うか

### NestJSの概要

NestJSは2017年にKamil Mysliwiecによって開発されたNode.jsフレームワークである。Express.jsやFastifyをベースに動作し、その上にAngularライクな構造とDI（依存性注入）システムを提供する。

Node.jsのエコシステムでは、Express.jsのような軽量フレームワークが広く使われてきた。しかしExpressは自由度が高い反面、プロジェクト構造の設計は完全に開発者に委ねられており、チームや規模が大きくなるにつれてコードの整合性を保つことが難しくなる。NestJSはこの課題を解決するために、明示的なアーキテクチャパターンを強制する。

### TypeScriptファーストの設計

NestJSはTypeScriptを前提として設計されている。すべてのAPIとデコレータはTypeScriptの型システムと深く統合されており、コード補完・型チェック・リファクタリングが快適に行える。JavaScriptでの記述も可能だが、TypeScriptを使うことでNestJSの機能を最大限に活用できる。

```typescript
// TypeScript + NestJSの型安全な例
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): string {
    // idはnumber型として保証される
    return `ユーザーID: ${id}`;
  }
}
```

### Angularライクな設計思想

NestJSのアーキテクチャはAngularから多くのコンセプトを借用している。

- **モジュール（Module）**: 関連するコンポーネントをまとめる単位
- **コントローラー（Controller）**: HTTPリクエストの受け口
- **サービス（Service）**: ビジネスロジックを担う
- **依存性注入（Dependency Injection）**: 疎結合な設計を実現

Angularを経験した開発者はNestJSに素早く適応できる。フロントエンドとバックエンドで同じ設計パターンを使えることは、フルスタック開発チームの生産性向上につながる。

### 企業採用実績

NestJSは多くのグローバル企業で採用されている。Adidas、Autodesk、Decathlon、ING銀行などの大規模な商用システムで利用されており、エンタープライズ環境での信頼性が実証されている。GitHubスター数は6万を超え、Node.jsフレームワークの中でも上位の人気を誇る。

### Express.jsとの比較

| 観点 | Express.js | NestJS |
|------|-----------|--------|
| 構造 | 自由形式 | 規約ベース |
| TypeScript | 任意 | 標準 |
| DI | なし | 内蔵 |
| テスト | 自前で整備 | 標準サポート |
| 学習コスト | 低い | 中程度 |
| スケーラビリティ | 開発者依存 | 高い |

小規模なAPIやプロトタイプにはExpressが適切だが、チームで長期運用するプロダクトにはNestJSの構造化されたアプローチが有利に働く。

---

## セットアップとプロジェクト作成

### 前提条件

NestJSを始めるにはNode.js 16以上とnpmが必要である。

```bash
node --version  # v18.0.0以上を推奨
npm --version   # v8以上
```

### @nestjs/cliのインストール

NestJSはCLIツールを提供しており、プロジェクトの雛形生成やコード生成を効率化できる。

```bash
npm install -g @nestjs/cli
nest --version
```

### 新規プロジェクトの作成

```bash
nest new my-nestjs-app
```

プロジェクト名を指定すると、パッケージマネージャー（npm/yarn/pnpm）の選択を求められる。選択後、依存パッケージが自動的にインストールされる。

```bash
cd my-nestjs-app
npm run start:dev
```

`http://localhost:3000` にアクセスすると "Hello World!" が表示される。

### ディレクトリ構造

生成されたプロジェクトの構造を確認する。

```
my-nestjs-app/
├── src/
│   ├── app.controller.ts       # ルートコントローラー
│   ├── app.controller.spec.ts  # コントローラーのテスト
│   ├── app.module.ts           # ルートモジュール
│   ├── app.service.ts          # ルートサービス
│   └── main.ts                 # エントリーポイント
├── test/
│   ├── app.e2e-spec.ts        # E2Eテスト
│   └── jest-e2e.json          # E2Eテスト設定
├── nest-cli.json               # NestJS CLI設定
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### main.tsの解説

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // グローバルプレフィックスの設定
  app.setGlobalPrefix('api');
  
  // CORSの有効化
  app.enableCors({
    origin: ['http://localhost:3000', 'https://example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });
  
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
```

### CLIによるコード生成

NestJS CLIはモジュール・コントローラー・サービスを自動生成できる。

```bash
# モジュールの生成
nest generate module users
# または短縮形
nest g mo users

# コントローラーの生成
nest g co users

# サービスの生成
nest g s users

# リソース全体（CRUD付き）の生成
nest g resource products
```

`nest g resource` コマンドはCRUDのベースコードをすべて生成し、REST APIかGraphQLかWebSocketかを選択できる。

---

## 基本概念

### モジュール（Module）

モジュールはNestJSアプリケーションの基本構成単位である。関連するコントローラー・サービス・プロバイダーをひとまとめにして、アプリケーションを論理的な機能単位に分割する。

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],  // 依存モジュールのインポート
  controllers: [UsersController],                // このモジュールのコントローラー
  providers: [UsersService],                     // このモジュールのプロバイダー
  exports: [UsersService],                       // 他モジュールへの公開
})
export class UsersModule {}
```

`@Module()` デコレータには4つのプロパティがある。

- **imports**: このモジュールが依存する他のモジュール
- **controllers**: このモジュールが定義するコントローラー
- **providers**: このモジュールが定義するサービス・プロバイダー
- **exports**: 他のモジュールから利用可能にするプロバイダー

#### ルートモジュール

すべてのモジュールはルートモジュール（AppModule）に集約される。

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,      // アプリ全体でConfigServiceを利用可能にする
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
  ],
})
export class AppModule {}
```

#### グローバルモジュール

特定のモジュールをアプリケーション全体で利用可能にしたい場合は `@Global()` デコレータを使う。

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class GlobalConfigModule {}
```

### コントローラー（Controller）

コントローラーはHTTPリクエストを受け取り、適切なサービスに処理を委譲する役割を持つ。

```typescript
// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')  // ベースパス: /users
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.usersService.findAll({ page, limit });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
```

### サービス（Service）

サービスはビジネスロジックを担うクラスである。コントローラーから呼び出され、データベース操作や外部API連携などを行う。

```typescript
// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await this.usersRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`ユーザーID ${id} が見つかりません`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('このメールアドレスは既に使用されています');
    }

    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
```

### 依存性注入（Dependency Injection）

NestJSはAngular同様に強力なDIコンテナを内蔵している。`@Injectable()` デコレータを付けたクラスはDIコンテナに登録され、コンストラクタインジェクションで利用できる。

```typescript
// カスタムプロバイダーの例
import { Module } from '@nestjs/common';

// 値プロバイダー
const configProvider = {
  provide: 'APP_CONFIG',
  useValue: {
    apiKey: process.env.API_KEY,
    apiUrl: process.env.API_URL,
  },
};

// ファクトリープロバイダー
const databaseProvider = {
  provide: 'DATABASE_CONNECTION',
  useFactory: async () => {
    const connection = await createDatabaseConnection();
    return connection;
  },
};

// クラスプロバイダー（インターフェースの実装切り替え）
const mailerProvider = {
  provide: 'IMailer',
  useClass: process.env.NODE_ENV === 'test' ? MockMailer : SmtpMailer,
};

@Module({
  providers: [configProvider, databaseProvider, mailerProvider],
})
export class AppModule {}
```

```typescript
// カスタムプロバイダーの利用
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class NotificationService {
  constructor(
    @Inject('APP_CONFIG') private config: Record<string, string>,
    @Inject('IMailer') private mailer: IMailer,
  ) {}

  async sendWelcomeEmail(email: string) {
    await this.mailer.send({
      to: email,
      subject: 'ようこそ！',
      body: `${this.config.appName}へのご登録ありがとうございます。`,
    });
  }
}
```

---

## HTTPリクエスト処理

### デコレータ一覧

NestJSはHTTPメソッドとリクエストデータを扱うための豊富なデコレータを提供する。

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Head,
  Options,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Redirect,
  Header,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Controller('examples')
export class ExamplesController {
  // GETリクエスト
  @Get()
  getAll() {
    return [];
  }

  // パスパラメータ
  @Get(':id')
  getOne(@Param('id') id: string) {
    return { id };
  }

  // クエリパラメータ
  @Get('search')
  search(
    @Query('q') keyword: string,
    @Query('page') page: string,
    @Query('sort') sort: 'asc' | 'desc' = 'asc',
  ) {
    return { keyword, page: parseInt(page), sort };
  }

  // POSTリクエスト・リクエストボディ
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) {
    return body;
  }

  // リクエストヘッダーの取得
  @Get('headers')
  getHeaders(@Headers('authorization') auth: string) {
    return { auth };
  }

  // リダイレクト
  @Get('redirect')
  @Redirect('https://nestjs.com', 301)
  redirectToNest() {}

  // カスタムレスポンスヘッダー
  @Get('custom-header')
  @Header('Cache-Control', 'no-cache')
  withCustomHeader() {
    return { message: 'カスタムヘッダー付きレスポンス' };
  }

  // Expressのreq/resオブジェクトへの直接アクセス
  @Get('raw')
  rawAccess(@Req() req: Request, @Res() res: Response) {
    res.status(200).json({ ip: req.ip });
  }
}
```

### DTOとバリデーション

DTO（Data Transfer Object）はリクエストデータの型定義とバリデーションルールを定義するクラスである。`class-validator` と `class-transformer` ライブラリと組み合わせて使う。

```bash
npm install class-validator class-transformer
```

```typescript
// src/users/dto/create-user.dto.ts
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: '名前は必須です' })
  @MinLength(2, { message: '名前は2文字以上必要です' })
  @MaxLength(50, { message: '名前は50文字以内にしてください' })
  name: string;

  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8, { message: 'パスワードは8文字以上必要です' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'パスワードは大文字・小文字・数字を含む必要があります',
  })
  password: string;

  @IsOptional()
  @IsEnum(UserRole, { message: '有効なロールを指定してください' })
  role?: UserRole = UserRole.USER;

  @IsOptional()
  @IsDateString({}, { message: '有効な日付形式で入力してください' })
  birthDate?: string;
}
```

```typescript
// src/users/dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// PartialTypeはCreateUserDtoのすべてのフィールドをオプションにする
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

グローバルバリデーションパイプの設定：

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // DTOで定義されていないプロパティを除去
      forbidNonWhitelisted: true, // 未定義プロパティがあればエラー
      transform: true,         // リクエストデータをDTOクラスに変換
      transformOptions: {
        enableImplicitConversion: true, // 型の暗黙的な変換を許可
      },
    }),
  );

  await app.listen(3000);
}

bootstrap();
```

### レスポンス形式の統一

一貫したAPIレスポンス形式を実装するためのインターセプターパターン：

```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

---

## データベース連携

### TypeORMの設定

TypeORMはNestJSと最もよく統合されているORMの一つである。

```bash
npm install @nestjs/typeorm typeorm pg
```

```typescript
// src/app.module.ts（TypeORM設定）
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'password',
      database: process.env.DB_NAME || 'nestdb',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
      synchronize: false,  // 本番環境ではfalse
      logging: process.env.NODE_ENV !== 'production',
    }),
  ],
})
export class AppModule {}
```

### エンティティの定義

```typescript
// src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Post } from '../../posts/entities/post.entity';
import { UserRole } from '../dto/create-user.dto';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ select: false })  // デフォルトでSELECTから除外
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ nullable: true })
  birthDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  refreshToken: string;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()  // ソフトデリートを有効化
  deletedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }
}
```

### Prismaを使ったデータベース連携

Prismaはスキーマファーストのアプローチで、型安全なクエリを生成するモダンなORMである。

```bash
npm install @prisma/client prisma
npx prisma init
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@map("users")
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  published Boolean  @default(false)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  tags      Tag[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("posts")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]

  @@map("tags")
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;
    const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;
    for (const { tablename } of tablenames) {
      await this.$executeRawUnsafe(
        `TRUNCATE TABLE "public"."${tablename}" CASCADE;`,
      );
    }
  }
}
```

```typescript
// Prismaを使ったユーザーサービス
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
      include: { posts: true },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { posts: { where: { published: true } } },
    });
    if (!user) {
      throw new NotFoundException(`ユーザーID ${id} が見つかりません`);
    }
    return user;
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async remove(id: number): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }
}
```

---

## 認証・認可

### JWTとPassport.jsの設定

NestJSでは `@nestjs/passport` と `@nestjs/jwt` を使って認証を実装する。

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt passport-local
npm install -D @types/passport-jwt @types/passport-local
```

### 認証モジュールの構成

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

### ローカル認証ストラテジー

```typescript
// src/auth/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    }
    return user;
  }
}
```

### JWTストラテジー

```typescript
// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('トークンが無効です');
    }
    return user;
  }
}
```

### 認証サービス

```typescript
// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async register(createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return this.login(user);
  }

  async refresh(userId: number, refreshToken: string) {
    const user = await this.usersService.findOne(userId);
    if (!user.refreshToken) {
      throw new UnauthorizedException('リフレッシュトークンが無効です');
    }
    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('リフレッシュトークンが一致しません');
    }
    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: number) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
```

### 認証コントローラー

```typescript
// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  async refresh(@Request() req) {
    return this.authService.refresh(req.user.id, req.user.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  async logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }
}
```

### カスタムGuard（認可）

Guardはルートハンドラーへのアクセスを制御する。認証済みかどうか、特定のロールを持つかどうかを検証する。

```typescript
// src/common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // @Public()デコレータが付いたルートはスキップ
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

```typescript
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/dto/create-user.dto';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/dto/create-user.dto';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
// Guardとデコレータの使用例
import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from './dto/create-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  @Get()
  @Public()  // 認証不要
  findAll() {
    return [];
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)  // ADMINロールのみアクセス可
  remove(@Param('id') id: string) {
    return { deleted: id };
  }
}
```

---

## Interceptors・Pipes・Filters

### インターセプター（Interceptor）

インターセプターはリクエスト前後の処理を横断的に追加できるミドルウェアパターンである。ログ記録・キャッシュ・レスポンス変換などに使う。

```typescript
// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const startTime = Date.now();

    this.logger.log(`リクエスト開始: ${method} ${url} (ユーザー: ${user?.email || '未認証'})`);

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsed = Date.now() - startTime;
          this.logger.log(`リクエスト完了: ${method} ${url} - ${elapsed}ms`);
        },
        error: (err) => {
          const elapsed = Date.now() - startTime;
          this.logger.error(`リクエストエラー: ${method} ${url} - ${elapsed}ms - ${err.message}`);
        },
      }),
    );
  }
}
```

```typescript
// src/common/interceptors/cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

const cache = new Map<string, { data: any; expiredAt: number }>();

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = `${request.method}:${request.url}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.expiredAt > Date.now()) {
      return of(cached.data);
    }

    return next.handle().pipe(
      tap((data) => {
        cache.set(cacheKey, {
          data,
          expiredAt: Date.now() + 60 * 1000,  // 60秒キャッシュ
        });
      }),
    );
  }
}
```

### カスタムパイプ（Pipe）

パイプはリクエストデータの変換・バリデーションを行う。NestJSには組み込みパイプが多数用意されているが、カスタムパイプを作成することもできる。

```typescript
// src/common/pipes/parse-sort.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

interface SortOptions {
  field: string;
  order: 'ASC' | 'DESC';
}

@Injectable()
export class ParseSortPipe implements PipeTransform {
  private readonly allowedFields = ['createdAt', 'name', 'email', 'id'];

  transform(value: string): SortOptions {
    if (!value) {
      return { field: 'createdAt', order: 'DESC' };
    }

    const [field, order = 'ASC'] = value.split(':');

    if (!this.allowedFields.includes(field)) {
      throw new BadRequestException(
        `ソートフィールドは次のいずれかを指定してください: ${this.allowedFields.join(', ')}`,
      );
    }

    if (!['ASC', 'DESC'].includes(order.toUpperCase())) {
      throw new BadRequestException('ソート順はASCまたはDESCを指定してください');
    }

    return { field, order: order.toUpperCase() as 'ASC' | 'DESC' };
  }
}
```

```typescript
// カスタムパイプの使用
@Get()
findAll(@Query('sort', ParseSortPipe) sort: SortOptions) {
  return this.usersService.findAll({ orderBy: { [sort.field]: sort.order } });
}
```

### 例外フィルター（Exception Filter）

例外フィルターはアプリケーション全体で発生する例外を一元的にハンドリングし、一貫したエラーレスポンスを返す。

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof exceptionResponse === 'object' &&
        'message' in (exceptionResponse as object)
          ? (exceptionResponse as any).message
          : exception.message,
      errors:
        typeof exceptionResponse === 'object' &&
        'errors' in (exceptionResponse as object)
          ? (exceptionResponse as any).errors
          : undefined,
    };

    this.logger.error(
      `${request.method} ${request.url} - ${status}: ${JSON.stringify(errorResponse)}`,
    );

    response.status(status).json(errorResponse);
  }
}
```

```typescript
// すべての例外をキャッチするフィルター
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : '内部サーバーエラーが発生しました';

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error('予期しないエラー:', exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

グローバルへの登録：

```typescript
// src/main.ts
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // グローバルフィルターの登録（登録順が適用順）
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
  );

  // グローバルインターセプターの登録
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  await app.listen(3000);
}
```

---

## WebSocket実装

### @nestjs/websocketsの設定

NestJSはWebSocketをファーストクラスでサポートしており、Socket.ioまたはws（純粋なWebSocket）を使える。

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install -D @types/socket.io
```

### WebSocketゲートウェイ

```typescript
// src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';

@WebSocketGateway(3001, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(private readonly chatService: ChatService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocketゲートウェイを初期化しました');
  }

  handleConnection(client: Socket) {
    this.logger.log(`クライアント接続: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);
    if (userId) {
      this.server.emit('userOffline', { userId });
    }
    this.logger.log(`クライアント切断: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const { roomId, userId } = data;
    await client.join(roomId);
    this.connectedUsers.set(client.id, userId);

    // 入室したルームの過去メッセージを送信
    const messages = await this.chatService.getRoomMessages(roomId);
    client.emit('messageHistory', messages);

    // 他のユーザーに入室を通知
    client.to(roomId).emit('userJoined', { userId, roomId });
    this.logger.log(`ユーザー ${userId} がルーム ${roomId} に入室`);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.leave(data.roomId);
    client.to(data.roomId).emit('userLeft', {
      userId: this.connectedUsers.get(client.id),
      roomId: data.roomId,
    });
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() createMessageDto: CreateMessageDto,
  ) {
    const message = await this.chatService.createMessage(createMessageDto);

    // ルーム内の全クライアントにメッセージを送信（送信者含む）
    this.server.to(createMessageDto.roomId).emit('newMessage', message);

    return { event: 'messageSent', data: message };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    const userId = this.connectedUsers.get(client.id);
    client.to(data.roomId).emit('userTyping', {
      userId,
      isTyping: data.isTyping,
    });
  }

  // サーバーからクライアントへのプッシュ通知
  sendNotificationToUser(userId: string, notification: any) {
    for (const [socketId, uid] of this.connectedUsers.entries()) {
      if (uid === userId) {
        this.server.to(socketId).emit('notification', notification);
      }
    }
  }
}
```

### チャットサービス

```typescript
// src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async createMessage(dto: CreateMessageDto): Promise<Message> {
    const message = this.messageRepository.create({
      content: dto.content,
      roomId: dto.roomId,
      authorId: dto.authorId,
    });
    return this.messageRepository.save(message);
  }

  async getRoomMessages(
    roomId: string,
    limit = 50,
  ): Promise<Message[]> {
    return this.messageRepository.find({
      where: { roomId },
      order: { createdAt: 'ASC' },
      take: limit,
      relations: ['author'],
    });
  }
}
```

---

## マイクロサービスアーキテクチャ

### マイクロサービスとは

NestJSはモノリシックアプリケーションだけでなく、マイクロサービスアーキテクチャもサポートしている。サービス間の通信にはTCP・Redis・RabbitMQ・Kafkaなどのトランスポートを使える。

```bash
npm install @nestjs/microservices
# Redisを使う場合
npm install redis ioredis
# RabbitMQを使う場合
npm install amqplib amqp-connection-manager
```

### マイクロサービスの起動

```typescript
// apps/user-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { UserServiceModule } from './user-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 3001,
      },
    },
  );
  await app.listen();
  console.log('ユーザーマイクロサービスが起動しました (port: 3001)');
}

bootstrap();
```

### メッセージパターンハンドラー

```typescript
// apps/user-service/src/users/users.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // リクエスト-レスポンスパターン
  @MessagePattern({ cmd: 'get_user' })
  async getUser(@Payload() data: { id: number }) {
    return this.usersService.findOne(data.id);
  }

  @MessagePattern({ cmd: 'create_user' })
  async createUser(@Payload() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @MessagePattern({ cmd: 'validate_user' })
  async validateUser(@Payload() data: { email: string; password: string }) {
    return this.usersService.validateCredentials(data.email, data.password);
  }

  // イベント（fire-and-forget）パターン
  @EventPattern('user_created')
  async handleUserCreated(@Payload() data: any) {
    await this.usersService.sendWelcomeEmail(data);
  }
}
```

### APIゲートウェイからマイクロサービスを呼び出す

```typescript
// apps/api-gateway/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UsersController } from './users.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.USER_SERVICE_HOST || 'localhost',
          port: parseInt(process.env.USER_SERVICE_PORT) || 3001,
        },
      },
    ]),
  ],
  controllers: [UsersController],
})
export class UsersModule {}
```

```typescript
// apps/api-gateway/src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Inject,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('users')
export class UsersController {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    // マイクロサービスにリクエストを送信し、レスポンスを待つ
    return firstValueFrom(
      this.userClient.send({ cmd: 'get_user' }, { id }),
    );
  }

  @Post()
  async create(@Body() createUserDto: any) {
    const user = await firstValueFrom(
      this.userClient.send({ cmd: 'create_user' }, createUserDto),
    );
    // イベントを発行（レスポンスを待たない）
    this.userClient.emit('user_created', user);
    return user;
  }
}
```

### Redisを使ったイベントバス

```typescript
// Redis Pub/Sub によるマイクロサービス設定
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    transport: Transport.REDIS,
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      retryAttempts: 5,
      retryDelay: 3000,
    },
  },
);
```

---

## テスト

### ユニットテスト

NestJSはJestをデフォルトのテストフレームワークとして採用しており、`@nestjs/testing` パッケージがテスト用のユーティリティを提供する。

```typescript
// src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto, UserRole } from './dto/create-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 1,
    name: 'テストユーザー',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: UserRole.USER,
    isActive: true,
    birthDate: null,
    refreshToken: null,
    posts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    hashPassword: jest.fn(),
    validatePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  describe('findOne', () => {
    it('存在するユーザーを返す', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      const result = await service.findOne(1);
      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('存在しないユーザーでNotFoundExceptionをスロー', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreateUserDto = {
      name: '新規ユーザー',
      email: 'new@example.com',
      password: 'Password123',
    };

    it('新規ユーザーを作成する', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);

      const result = await service.create(createDto);
      expect(result).toEqual(mockUser);
      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(mockUser);
    });

    it('重複メールアドレスでConflictExceptionをスロー', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });
});
```

### コントローラーのテスト

```typescript
// src/users/users.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  describe('findAll', () => {
    it('ユーザー一覧を返す', async () => {
      const mockResult = { data: [], total: 0, page: 1, lastPage: 1 };
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(1, 10);
      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });
});
```

### E2Eテスト

```typescript
// test/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    prisma = app.get<PrismaService>(PrismaService);

    await app.init();

    // テスト用ユーザーを作成してトークンを取得
    const loginRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'テスト管理者',
        email: 'admin@test.com',
        password: 'Admin1234',
        role: 'admin',
      });
    authToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.cleanDatabase();
    await app.close();
  });

  describe('GET /users', () => {
    it('ユーザー一覧を取得できる', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data.data)).toBe(true);
        });
    });
  });

  describe('POST /users', () => {
    it('新規ユーザーを作成できる', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '新規ユーザー',
          email: 'newuser@test.com',
          password: 'Password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.email).toBe('newuser@test.com');
        });
    });

    it('バリデーションエラーを返す', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'x', email: 'invalid-email', password: '123' })
        .expect(400);
    });
  });
});
```

---

## デプロイ

### Dockerによるコンテナ化

```dockerfile
# Dockerfile
# ビルドステージ
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

# 本番ステージ
FROM node:20-alpine AS production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      target: production
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASS: ${DB_PASS}
      DB_NAME: ${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      REDIS_HOST: redis
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER}']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

### Kubernetesデプロイ

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nestjs-api
  namespace: production
  labels:
    app: nestjs-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nestjs-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: nestjs-api
    spec:
      containers:
        - name: nestjs-api
          image: your-registry/nestjs-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: db-secrets
                  key: host
            - name: DB_PASS
              valueFrom:
                secretKeyRef:
                  name: db-secrets
                  key: password
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: nestjs-api-service
  namespace: production
spec:
  selector:
    app: nestjs-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nestjs-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nestjs-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### ヘルスチェックエンドポイント

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
}
```

---

## パフォーマンス最適化・ベストプラクティス

### キャッシュ戦略

NestJSはRedisを使ったキャッシュ機能を内蔵している。

```bash
npm install cache-manager cache-manager-redis-store@2 redis
```

```typescript
// src/app.module.ts（キャッシュ設定）
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        store: redisStore,
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        ttl: 300,  // デフォルト5分
      }),
    }),
  ],
})
export class AppModule {}
```

```typescript
// キャッシュの使用
import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class ProductsService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async findAll() {
    const cacheKey = 'products:all';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const products = await this.fetchFromDatabase();
    await this.cacheManager.set(cacheKey, products, 300);
    return products;
  }

  async update(id: number, data: any) {
    const product = await this.updateInDatabase(id, data);
    // キャッシュを無効化
    await this.cacheManager.del('products:all');
    await this.cacheManager.del(`products:${id}`);
    return product;
  }

  private async fetchFromDatabase() {
    // データベースからの取得処理
    return [];
  }

  private async updateInDatabase(id: number, data: any) {
    // データベースへの更新処理
    return data;
  }
}
```

### レート制限

```bash
npm install @nestjs/throttler
```

```typescript
// src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,    // 1秒
        limit: 10,    // 10リクエスト
      },
      {
        name: 'medium',
        ttl: 60000,   // 1分
        limit: 100,   // 100リクエスト
      },
      {
        name: 'long',
        ttl: 3600000, // 1時間
        limit: 1000,  // 1000リクエスト
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

```typescript
// 特定のルートにレート制限を設定
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // ログインには厳しい制限を設ける
  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } })  // 1分間に5回まで
  login(@Body() loginDto: any) {
    return this.authService.login(loginDto);
  }

  @Get('status')
  @SkipThrottle()  // レート制限をスキップ
  status() {
    return { status: 'ok' };
  }
}
```

### Swagger APIドキュメント

```bash
npm install @nestjs/swagger swagger-ui-express
```

```typescript
// src/main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NestJS API')
      .setDescription('APIドキュメント')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('users', 'ユーザー管理')
      .addTag('auth', '認証')
      .addTag('products', '商品管理')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(3000);
}
```

```typescript
// SwaggerデコレータをDTOに追加
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: '田中太郎', description: 'ユーザー名' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'tanaka@example.com', description: 'メールアドレス' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123', description: 'パスワード（大文字・小文字・数字を含む8文字以上）' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
```

```typescript
// コントローラーにSwaggerデコレータを追加
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  @Get()
  @ApiOperation({ summary: 'ユーザー一覧取得' })
  @ApiResponse({ status: 200, description: 'ユーザー一覧の取得に成功しました' })
  findAll() {}

  @Post()
  @ApiOperation({ summary: 'ユーザー作成' })
  @ApiResponse({ status: 201, description: 'ユーザーの作成に成功しました' })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 409, description: 'メールアドレスが既に使用されています' })
  create(@Body() createUserDto: CreateUserDto) {}
}
```

### 環境変数の管理

```typescript
// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    name: process.env.DB_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT, 10) || 587,
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM,
  },
});
```

```typescript
// ConfigServiceの型安全な使用
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getDatabaseUrl(): string {
    const host = this.configService.get<string>('database.host');
    const port = this.configService.get<number>('database.port');
    const name = this.configService.get<string>('database.name');
    return `postgresql://${host}:${port}/${name}`;
  }
}
```

### ロギング設定

```typescript
// src/main.ts（カスタムロガーの設定）
import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `${timestamp} [${context}] ${level}: ${message}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });

  await app.listen(3000);
}
```

### セキュリティのベストプラクティス

```typescript
// セキュリティ強化のための設定
import * as helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // セキュリティヘッダーの設定
  app.use(helmet());

  // レスポンスの圧縮
  app.use(compression());

  // CORSの適切な設定
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 3600,
  });

  await app.listen(3000);
}
```

### 非同期処理とキュー

```bash
npm install @nestjs/bull bull
npm install -D @types/bull
```

```typescript
// src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mail',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
```

```typescript
// src/mail/mail.processor.ts
import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  @Process('welcome')
  async sendWelcomeEmail(job: Job<{ email: string; name: string }>) {
    const { email, name } = job.data;
    this.logger.log(`ウェルカムメールを送信中: ${email}`);
    // メール送信処理
    await this.sendEmail({
      to: email,
      subject: `${name}さん、ようこそ！`,
      template: 'welcome',
      context: { name },
    });
  }

  @OnQueueFailed()
  onQueueFailed(job: Job, err: Error) {
    this.logger.error(
      `ジョブ失敗 ${job.name} (ID: ${job.id}): ${err.message}`,
      err.stack,
    );
  }

  private async sendEmail(options: any) {
    // 実装省略
  }
}
```

### 型安全なカスタムデコレータ

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;
    return data ? user[data] : user;
  },
);
```

```typescript
// カスタムデコレータの使用
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: User) {
  return user;
}

@Get('my-email')
@UseGuards(JwtAuthGuard)
getEmail(@CurrentUser('email') email: string) {
  return { email };
}
```

### エラーハンドリングのパターン

```typescript
// カスタム例外クラス
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    private readonly errorCode: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ errorCode, message }, statusCode);
  }

  getErrorCode(): string {
    return this.errorCode;
  }
}

export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, id: number | string) {
    super(
      'RESOURCE_NOT_FOUND',
      `${resource} (ID: ${id}) が見つかりません`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InsufficientPermissionsException extends BusinessException {
  constructor(action: string) {
    super(
      'INSUFFICIENT_PERMISSIONS',
      `この操作（${action}）を実行する権限がありません`,
      HttpStatus.FORBIDDEN,
    );
  }
}
```

### NestJSプロジェクト規約まとめ

実際のプロジェクトで有効なディレクトリ構造のベストプラクティスを示す。

```
src/
├── common/                    # 横断的な共通コード
│   ├── decorators/            # カスタムデコレータ
│   ├── dto/                   # 共通DTO
│   ├── entities/              # 共通エンティティ
│   ├── filters/               # 例外フィルター
│   ├── guards/                # Guardクラス
│   ├── interceptors/          # インターセプター
│   ├── interfaces/            # TypeScriptインターフェース
│   ├── middlewares/           # ミドルウェア
│   └── pipes/                 # カスタムパイプ
├── config/                    # 設定ファイル
│   ├── configuration.ts       # 設定ファクトリー
│   └── validation.ts          # 環境変数バリデーション
├── modules/                   # 機能モジュール
│   ├── auth/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── users/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── users.controller.ts
│   │   ├── users.module.ts
│   │   └── users.service.ts
│   └── products/
├── database/                  # データベース関連
│   ├── migrations/
│   └── seeds/
├── app.module.ts
└── main.ts
```

---

## まとめ

NestJSはTypeScriptネイティブのサーバーサイドフレームワークとして、以下の点で他のNode.jsフレームワークと大きく差別化されている。

まず、Angularからインスパイアされたモジュール・コントローラー・サービスという明確な3層アーキテクチャにより、チームの規模が大きくなっても一貫したコード品質を維持できる。次に、内蔵の依存性注入コンテナによって、コンポーネント間の結合度を低く保ちながら、テストが書きやすい設計が自然に実現する。

Guards・Interceptors・Pipes・Filtersという横断的関心事のレイヤーを体系的に分離できることも大きな強みである。認証・ロギング・バリデーション・エラーハンドリングを一箇所で管理することで、個々のコントローラーやサービスをシンプルに保てる。

WebSocketやマイクロサービスのサポートも標準的に組み込まれており、将来的にアーキテクチャを拡張する際のコスト増加を抑えられる。JestベースのテストユーティリティでユニットテストからE2Eテストまでを一貫した体験で記述できる点も、長期運用の観点から重要である。

初期学習コストはExpressより高いが、中規模以上のプロジェクトでは明確な構造がもたらす恩恵が学習コストを大幅に上回る。Swagger統合・レート制限・キャッシュ・キュー処理といったエンタープライズ機能がすべてファーストクラスでサポートされており、プロダクションレベルのAPIを構築するための基盤として申し分ない選択肢である。

## 開発ツールとリソース

NestJSでAPIを構築したあと、フロントエンドやバックエンドのデバッグ・検証作業を効率化するには適切な開発ツールが不可欠である。[DevToolBox](https://usedevtools.com) はJSON整形・Base64エンコード・JWT解析・正規表現テスト・コード差分比較など、Web開発で日常的に必要になるユーティリティを一箇所に集約したツール群を提供している。NestJSのJWTトークンをデコードして内容を検証したり、APIレスポンスのJSONを整形・比較したりする作業をブラウザ上でスムーズに行える。

### 参考リソース

- [NestJS公式ドキュメント](https://docs.nestjs.com)
- [TypeORM公式ドキュメント](https://typeorm.io)
- [Prisma公式ドキュメント](https://www.prisma.io/docs)
- [Passport.js公式ドキュメント](http://www.passportjs.org)
- [Socket.io公式ドキュメント](https://socket.io/docs)
- [DevToolBox - 開発者向けユーティリティツール](https://usedevtools.com)
