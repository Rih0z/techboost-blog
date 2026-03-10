---
title: "ConoHa WINGでWordPressを始める完全ガイド【2026年版】"
description: "ConoHa WINGでWordPressを始める手順を徹底解説。料金プラン・速度・使いやすさをXserverと比較し、ブログ・ポートフォリオ・副業サイトに最適な選び方を詳しく紹介します。初心者でも迷わない設定手順付き。"
pubDate: "2026-03-10"
tags: ["server", "WordPress", "インフラ", "ホスティング"]
heroImage: "../../assets/blog-placeholder-3.jpg"
---

## はじめに

WordPressでブログ・ポートフォリオ・副業サイトを作りたいエンジニアにとって、サーバー選びは最初の関門だ。

**ConoHa WING** は国内シェアNo.1クラスのレンタルサーバーで、WordPressとの親和性が非常に高い。本記事では ConoHa WING の特徴・料金・設定手順を詳しく解説し、XserverやさくらのレンタルサーバーとA比較する。

---

## ConoHa WING の基本スペック（2026年版）

### プラン一覧

| プラン | 月額料金（税込・3年契約） | 容量 | 転送量 | ドメイン永久無料 |
|--------|--------------------------|------|--------|----------------|
| **ベーシック** | 643円 | 300GB SSD | 無制限 | 1個 |
| **スタンダード** | 1,078円 | 400GB SSD | 無制限 | 2個 |
| **プレミアム** | 2,596円 | 500GB SSD | 無制限 | 3個 |

**ポイント:**
- 3年契約で月643円（ベーシック）は業界最安値クラス
- 全プランで高速NVMe SSD採用
- 無料SSL（Let's Encrypt）標準装備
- PHP 8.x / MySQL 8.x に完全対応

---

## ConoHa WING の強み

### 1. 圧倒的な表示速度（LiteSpeed採用）

ConoHa WINGは業界でもまだ少ない **LiteSpeed Webサーバー** を採用している。

- Apacheと比べて最大6倍の処理速度
- LSCacheプラグインとの組み合わせで WordPress のキャッシュが爆速になる
- Core Web Vitals のスコアが改善されやすい

```bash
# PageSpeed InsightsでConoHa WINGのスコア確認例
# LCPが2.5秒未満を達成しやすい
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://your-site.com&strategy=mobile" \
  | jq '.lighthouseResult.categories.performance.score'
# 出力例: 0.92 (92点)
```

### 2. WordPress簡単インストール（WING PACK）

ConoHa WINGは **WING PACK** という独自機能で、サーバー申し込みと同時にWordPressの設定が完了する。

設定できる項目:
- サイトURL
- ブログ名
- WordPressユーザー名・パスワード
- 無料テーマの選択

通常は「サーバー申込 → ドメイン取得 → DNS設定 → WordPress手動インストール」という4ステップが、**WING PACK で1ステップに短縮**される。

### 3. 自動バックアップ（14日間）

無料で14日間の自動バックアップ機能が付いている。

- データベース（MySQLダンプ）
- ファイルシステム（wp-content含む）
- 1クリックで復元可能

有料のバックアッププラグイン（UpdraftPlus等）が不要になるのは大きなコスト削減だ。

### 4. 無料独自ドメイン（永久無料）

ベーシックプランでも1ドメインが **永久無料**。更新料が0円なのは大きい。

.com / .net / .jp / .info など主要ドメインが対象。

---

## ConoHa WING のデメリット

### 1. マルチサイト構成が少し複雑

WordPressのマルチサイト（Multisite）機能を使う場合、サブディレクトリ構成は問題ないが、**サブドメイン構成**はDNS設定が少し手間になる。

### 2. SSH接続がデフォルトで無効

SSH接続（ターミナルからサーバー操作）はデフォルトで無効になっており、コントロールパネルから有効化が必要。エンジニアにとっては若干手間。

```bash
# SSH有効化後の接続コマンド
ssh -p 22 username@sv1234.conoha.ne.jp
```

### 3. メールサーバーは別途費用

ConoHa WINGにはメールサーバーが付いているが、**独自ドメインメール**を本格運用したい場合はGoogle Workspace（月680円〜）の追加が推奨される。

---

## Xserver vs ConoHa WING 比較表

| 項目 | ConoHa WING（ベーシック） | Xserver（スタンダード） |
|------|--------------------------|------------------------|
| 月額（税込・3年） | **643円** | 990円 |
| 容量 | 300GB | 300GB |
| Webサーバー | **LiteSpeed** | Nginx + Apache |
| 無料ドメイン | **永久無料1個** | 契約中無料1個 |
| バックアップ | **14日間自動（無料）** | 28日間自動（無料） |
| SSH | 有効化必要 | デフォルト有効 |
| WordPressインストール | **WING PACK（超簡単）** | クイックインストール |
| サポート | チャット・電話・メール | チャット・電話・メール |

**結論:**
- **費用重視 → ConoHa WING**（月643円は業界最安値クラス）
- **機能・実績重視 → Xserver**（老舗の安定感。SSHがすぐ使える）

---

## ConoHa WINGの登録手順（ステップバイステップ）

### Step 1: アカウント作成

1. ConoHa WINGの公式サイトにアクセス
2. 「今すぐ申し込む」をクリック
3. メールアドレス・パスワードを入力してアカウント作成

### Step 2: プランとWING PACK選択

1. **ベーシック** を選択（個人ブログ・ポートフォリオなら十分）
2. 契約期間: **36ヶ月**（月643円で最安）
3. 「WordPressかんたんセットアップ」を有効化

```
【WING PACK 入力項目】
- 新規インストール or 他社からの移行
- セットアップ方法: 新規インストール を選択
- 独自ドメイン: your-domain.com を入力
- 作成サイト名: ブログ名を入力
- WordPressユーザー名: admin等（推測しにくいもの）
- WordPressパスワード: 強いパスワード（記録すること）
- テーマ: Cocoon（無料で高機能）を推奨
```

### Step 3: 支払い情報入力

- クレジットカード or ConoHaチャージ
- 3年分を一括払い（月643円 × 36ヶ月 = 23,148円）

### Step 4: 申し込み完了 → 即時利用可能

申し込み完了後、**約10分〜30分** でWordPressが使えるようになる。

```
完了通知メールに含まれる情報:
- WordPressログインURL: https://your-domain.com/wp-admin/
- ユーザー名・パスワード（登録時に設定したもの）
- MySQLデータベース情報
```

---

## WordPress初期設定（エンジニア向け）

### パーマリンク設定

```
管理画面 → 設定 → パーマリンク設定
↓
「投稿名」を選択: /%postname%/
（SEO的に最も推奨されるURL構造）
```

### 必須プラグインのインストール

```
推奨プラグイン一覧:
1. EWWW Image Optimizer - 画像圧縮
2. LiteSpeed Cache - キャッシュ最適化（ConoHa WINGに最適化済み）
3. Yoast SEO or SEO SIMPLE PACK - SEO設定
4. WP Fastest Cache - 追加キャッシュ（LiteSpeedない環境用）
5. Contact Form 7 - お問い合わせフォーム
```

### Nginxリバースプロキシ設定（中級以上）

ConoHa WINGはコントロールパネルからNginxの設定をカスタマイズできる。

```nginx
# コントロールパネル → サイト管理 → 応用設定 → Nginx設定
server {
    # Gzip圧縮有効化
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # ブラウザキャッシュ
    location ~* \.(css|js|png|jpg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### SSH接続の有効化

```bash
# 1. ConoHaコントロールパネル → サイト管理 → SSH設定 → 有効
# 2. SSHキーの登録（公開鍵認証推奨）

# 公開鍵生成（ローカルPCで実行）
ssh-keygen -t ed25519 -C "your-email@example.com"

# 公開鍵をコントロールパネルに登録後
ssh -i ~/.ssh/id_ed25519 -p 22 conoha@sv1234.conoha.ne.jp
```

---

## WordPress on ConoHa WING のパフォーマンス最適化

### LiteSpeed Cache プラグイン設定

ConoHa WINGのLiteSpeedサーバーと組み合わせると、パフォーマンスが劇的に向上する。

```
LiteSpeed Cache 推奨設定:
- ページキャッシュ: 有効
- ブラウザキャッシュ: 有効（TTL: 604800秒 = 7日）
- CSS結合・圧縮: 有効
- JavaScript遅延読み込み: 有効
- 画像遅延読み込み: 有効
- CDN: ConoHa CDN（無料）を接続
```

### Core Web Vitals 改善チェックリスト

```
LCP（Largest Contentful Paint）改善:
[ ] ヒーロー画像をWebP形式に変換
[ ] LiteSpeed Cacheのページキャッシュを有効化
[ ] CDN有効化でサーバーレイテンシ削減

CLS（Cumulative Layout Shift）改善:
[ ] 画像にwidth/height属性を明示
[ ] Google Fontsを自己ホスティングに変更
[ ] アドセンスの動的広告をfixed heightコンテナで囲む

INP（Interaction to Next Paint）改善:
[ ] JavaScriptを遅延読み込みに変更
[ ] 不要なプラグインを削除（プラグイン数を最小化）
```

---

## エンジニアがConoHa WINGを選ぶべきケース

### 向いているケース

1. **WordPressブログを最安値で始めたい**: 月643円は他社と比べても最安値クラス
2. **複数サイトを運営する予定**: ベーシックプランで無制限サイト数
3. **初心者でも設定を簡単にしたい**: WING PACKで申込直後からWordPressが動く
4. **表示速度を重視する**: LiteSpeedサーバーで業界トップクラスの速度

### 向いていないケース

1. **本格的なサーバー管理・カスタマイズ**: VPS（XServerVPS・ConoHa VPS）を検討
2. **Node.js/Python等のアプリをデプロイしたい**: 共有レンタルサーバーは不向き → VPSかVercel/Render等を使用
3. **SSHをすぐに使いたい**: Xserverの方がSSHがデフォルト有効

---

## 移行手順（他社 → ConoHa WING）

既存サイトをConoHa WINGに移行する場合:

### WordPressファイル移行

```bash
# 旧サーバーでエクスポート
cd /path/to/wordpress
tar -czf wp-backup.tar.gz . --exclude=node_modules

# ConoHa WINGにSCPでアップロード
scp -P 22 wp-backup.tar.gz conoha@sv1234.conoha.ne.jp:~/public_html/
```

### データベース移行

```bash
# 旧サーバーでMySQLダンプ
mysqldump -u username -p database_name > backup.sql

# ConoHa WINGでインポート
# 方法1: phpMyAdminから（コントロールパネルで起動）
# 方法2: SSHからCLI
mysql -u conoha_user -p conoha_db < backup.sql
```

### wp-config.php の更新

```php
// ConoHa WINGの新しいDB設定に書き換え
define('DB_NAME', 'new_database_name');
define('DB_USER', 'new_database_user');
define('DB_PASSWORD', 'new_password');
define('DB_HOST', 'localhost');
```

### DNS切り替え

```
旧サーバーのAレコード → ConoHa WINGのIPアドレスに変更
（コントロールパネル → サイト管理 → サイトURL → IPアドレス確認）
DNS伝播: 最大48時間（通常は数時間〜12時間）
```

---

## ConoHa WING でのAdSense・アフィリエイト収益化

### Google AdSenseの申請条件

1. 独自ドメインであること（ConoHa WINGの無料ドメイン対象）
2. プライバシーポリシーページの設置
3. お問い合わせフォームの設置
4. 記事数10本以上（目安）
5. SSL（https）対応済み（ConoHa WINGは標準で対応）

```
申請手順:
1. Google AdSenseにサインアップ
2. サイトURLを登録
3. AdSenseコードをWordPressに設置
   → WordPressテーマの<head>タグに貼り付け
   → または「Ad Inserter」プラグイン使用
4. 審査完了まで数日〜2週間待機
```

---

## まとめ

ConoHa WINGはWordPressでブログや副業サイトを始めるエンジニアに非常に適したサービスだ。

| 評価項目 | 評価 | 理由 |
|---------|------|------|
| コスパ | ★★★★★ | 月643円は業界最安値クラス |
| 速度 | ★★★★★ | LiteSpeedサーバーで業界トップ |
| 使いやすさ | ★★★★☆ | WING PACKで超簡単。SSHは少し手間 |
| サポート | ★★★★☆ | チャット・電話対応あり |
| WordPress連携 | ★★★★★ | LiteSpeed Cacheとの組み合わせが最強 |

初めてWordPressを使う場合でも、WING PACKを使えば申し込み後30分以内にサイトが立ち上がる。費用対効果を最大化したいエンジニアに特におすすめだ。

---

## 参考リンク

- [ConoHa WING 公式ドキュメント](https://support.conoha.jp/w/)
- [LiteSpeed Cache WordPressプラグイン公式](https://docs.litespeedtech.com/lscache/lscwp/)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [WordPress.org 公式サイト](https://wordpress.org/)
