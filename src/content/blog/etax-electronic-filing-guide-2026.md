---
title: 'e-Tax電子申告の完全手順2026：エンジニア向けセットアップから送信まで'
description: 'e-Taxによる確定申告の電子申告手順をエンジニア・フリーランス向けに徹底解説。マイナンバーカード方式の初期設定からfreee・マネーフォワード連携、XMLエクスポート取込、経費自動分類の自動化スクリプトまで2026年最新の実践ステップガイドです。'
pubDate: '2026-03-06'
tags: ['確定申告', 'フリーランス', 'accounting', '税金', 'e-Tax']
heroImage: '../../assets/thumbnails/etax-electronic-filing-guide-2026.jpg'
---

### はじめに

確定申告の季節になると、毎年のように税務署の長蛇の列がニュースになります。しかしエンジニアやフリーランスであれば、e-Taxを使った電子申告のほうが合理的です。自宅から24時間いつでも申告でき、還付金の処理も書面提出より早い。さらに青色申告特別控除65万円の適用にはe-Taxまたは電子帳簿保存が必須条件となっています。

この記事では、2026年（令和7年分）の確定申告を対象に、e-Taxの初期セットアップから実際の送信完了までを、エンジニアの視点でステップバイステップで解説します。freeeやマネーフォワードからのXMLエクスポート連携、よくあるエラーの対処法、そしてe-Tax APIを活用した自動化スクリプトまでカバーします。

参考: [国税庁 e-Tax公式サイト](https://www.e-tax.nta.go.jp/)

### e-Taxとは何か

e-Tax（国税電子申告・納税システム）は、国税庁が運営するオンライン申告・納税システムです。正式名称は「国税電子申告・納税システム」で、所得税、消費税、法人税などの申告や納税手続きをインターネット経由で行えます。

#### e-Taxのメリット

e-Taxを利用する具体的なメリットは以下の通りです。

**青色申告特別控除65万円の適用条件**

2020年分（令和2年分）以降、青色申告特別控除65万円を受けるためには、以下のいずれかが必要です。

- e-Taxによる電子申告
- 優良な電子帳簿保存

e-Taxを使わず書面で提出すると、控除額は55万円に減額されます。フリーランスエンジニアの場合、この10万円の差は所得税率に応じて実質的な節税効果を生みます。

**還付金の早期処理**

書面提出の場合、還付金の処理には通常1ヶ月から1ヶ月半程度かかります。e-Taxで申告すると、3週間程度に短縮されます。1月・2月に早期提出すれば、さらに早く処理されるケースもあります。

**24時間提出可能**

e-Taxの利用可能時間は、確定申告期間中（2026年2月16日から3月16日）であれば24時間対応です。通常期間は平日の8:30から24:00までですが、メンテナンス時間を除いて利用できます。

**添付書類の省略**

e-Taxで申告する場合、以下の書類の提出が省略できます（ただし5年間の保存義務あり）。

- 源泉徴収票
- 医療費の明細書に係る医療費の領収書
- セルフメディケーション税制の明細書に係る領収書
- 寄附金控除の証明書
- 特定口座年間取引報告書

参考: [国税庁 e-Taxを利用して所得税の確定申告書を提出する場合の第三者作成書類の添付省略](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1900.htm)

#### マイナンバーカード方式 vs ID・パスワード方式

e-Taxには2つの認証方式があります。

**マイナンバーカード方式（推奨）**

マイナンバーカードに格納された電子証明書を使って本人認証を行う方式です。ICカードリーダーまたはマイナンバーカード対応スマートフォンが必要です。

利点:
- 利用者識別番号の事前取得が不要（初回利用時に自動発行）
- 税務署への届出が不要
- セキュリティが高い（公開鍵暗号基盤を使用）

**ID・パスワード方式**

税務署で発行された利用者識別番号（16桁）と暗証番号で認証する方式です。

利点:
- ICカードリーダーやスマホが不要
- マイナンバーカードがなくても利用可能

制約:
- 事前に税務署窓口で本人確認を受ける必要がある
- 国税庁はマイナンバーカード方式への移行を推奨しており、暫定的な対応とされている

**エンジニア向けの判断基準**

技術的な観点からは、マイナンバーカード方式を選択すべきです。理由は以下の通りです。

1. JPKI（公的個人認証サービス）のライブラリを使ったプログラマブルな認証が可能
2. 将来的にe-Tax APIとの連携を考える場合、電子証明書ベースの認証が前提
3. マイナポータルとの連携で医療費や保険料の自動取得が可能

以降の解説では、マイナンバーカード方式を前提に進めます。

### 事前準備

#### 1. マイナンバーカードの取得と電子証明書の確認

マイナンバーカードを未取得の場合は、市区町村の窓口またはオンラインで申請できます。申請から受け取りまで通常1ヶ月程度かかるため、確定申告期間直前では間に合いません。早めに手配してください。

**電子証明書の有効期限確認**

マイナンバーカードに格納される電子証明書には有効期限があります。

- 署名用電子証明書: 発行日から5回目の誕生日まで
- 利用者証明用電子証明書: 発行日から5回目の誕生日まで

有効期限が切れていると、e-Taxで認証エラーが発生します。期限切れの場合は市区町村窓口で更新手続きが必要です。

確認方法として、JPKIクライアントソフトを使って電子証明書の有効期限を確認できます。

```bash
## macOSの場合、JPKIクライアントソフトのインストール確認
ls /Applications/JPKIUserCertUtl.app

## Windowsの場合
## C:\Program Files\JPKI\JPKIUserCertUtl.exe
```

#### 2. ICカードリーダーまたはスマートフォンの準備

マイナンバーカードを読み取るために、以下のいずれかが必要です。

**ICカードリーダーを使う場合**

接触型ICカードリーダーが必要です。以下はエンジニアに定番のモデルです。

| 製品名 | 接続 | 対応OS | 価格帯 |
|--------|------|--------|--------|
| SCR3310-NTTCom | USB | Windows/macOS | 2,000-3,000円 |
| ACR39-NTTCom | USB | Windows/macOS | 2,500-3,500円 |
| Sony RC-S380 | USB (NFC) | Windows/macOS | 3,000-4,000円（非接触型） |

非接触型（NFC）リーダーを使う場合、macOSでは追加のドライバ設定が必要な場合があります。

```bash
## macOSでNFCリーダーのドライバ確認
system_profiler SPUSBDataType | grep -A 5 "Card Reader\|Sony\|NTT"
```

**スマートフォンを使う場合（マイナポータルアプリ経由）**

NFC対応のスマートフォンであれば、ICカードリーダーの代わりに使用できます。iPhone 7以降、多くのAndroid端末が対応しています。

手順:
1. マイナポータルアプリをインストール
2. e-Tax側で「スマートフォンで読み取る」を選択
3. QRコードをスマートフォンで読み取り
4. スマートフォンにマイナンバーカードをかざして認証

#### 3. 利用者識別番号の取得

マイナンバーカード方式の場合、初回利用時にe-Taxの確定申告書等作成コーナーから直接取得できます。事前に税務署へ行く必要はありません。

既にID・パスワード方式で利用者識別番号を持っている場合は、マイナンバーカード方式に切り替えた際にその番号を引き継ぐことができます。

#### 4. 環境構築チェックリスト

e-Taxを利用する前に、以下の環境要件を確認してください。

```bash
#!/bin/bash
## e-Tax事前環境チェックスクリプト
## 対象: macOS

echo "=== e-Tax環境チェック ==="

## OS確認
echo "[OS] $(sw_vers -productName) $(sw_vers -productVersion)"

## ブラウザ確認（Safari, Chrome, Edge, Firefoxが対応）
echo ""
echo "[ブラウザ]"
for app in "Safari" "Google Chrome" "Microsoft Edge" "Firefox"; do
  if [ -d "/Applications/$app.app" ]; then
    version=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "/Applications/$app.app/Contents/Info.plist" 2>/dev/null)
    echo "  $app: $version (インストール済み)"
  fi
done

## Java確認（e-Taxソフト利用時に必要）
echo ""
echo "[Java]"
if command -v java &> /dev/null; then
  java -version 2>&1 | head -1
else
  echo "  未インストール（e-Taxソフト利用時に必要）"
fi

## JPKI利用者ソフト確認
echo ""
echo "[JPKI利用者ソフト]"
if [ -d "/Applications/JPKIUserCertUtl.app" ]; then
  echo "  インストール済み"
else
  echo "  未インストール"
  echo "  ダウンロード: https://www.jpki.go.jp/download/"
fi

## ICカードリーダー確認
echo ""
echo "[ICカードリーダー]"
system_profiler SPUSBDataType 2>/dev/null | grep -B 2 "Card Reader\|Sony RC-S\|SCR331\|ACR39" | head -5 || echo "  接続されたリーダーなし"

echo ""
echo "=== チェック完了 ==="
```

このスクリプトを実行することで、e-Taxに必要な環境が整っているか一括確認できます。

#### 5. JPKIクライアントソフトのインストール

公的個人認証サービス（JPKI）のクライアントソフトは、マイナンバーカードの電子証明書を利用するために必要です。

ダウンロード先: [公的個人認証サービス ダウンロード](https://www.jpki.go.jp/download/)

```bash
## macOS: インストール後のパス確認
ls -la /usr/local/lib/libpcsclite*
ls -la /Library/Frameworks/JPKI*

## macOS: PC/SCドライバの状態確認
sudo launchctl list | grep pcscd
```

Windows環境の場合:

```powershell
## Windows: JPKIソフトのインストール確認
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" |
  Where-Object { $_.DisplayName -like "*JPKI*" -or $_.DisplayName -like "*公的個人認証*" } |
  Select-Object DisplayName, DisplayVersion
```

### e-Taxソフト（WEB版）の使い方

e-Taxには複数のインターフェースがあります。

| 種類 | URL | 用途 |
|------|-----|------|
| 確定申告書等作成コーナー | https://www.keisan.nta.go.jp/ | 所得税の確定申告書作成・送信 |
| e-Taxソフト（WEB版） | https://clientweb.e-tax.nta.go.jp/ | 各種届出・申請の送信 |
| e-Taxソフト（ダウンロード版） | 国税庁サイトからDL | 大量データ処理・法人向け |

個人のフリーランスエンジニアが所得税の確定申告を行う場合、「確定申告書等作成コーナー」が最も効率的です。

#### 初回ログイン手順

1. 確定申告書等作成コーナー（https://www.keisan.nta.go.jp/）にアクセス
2. 「作成開始」をクリック
3. 「e-Taxで提出　マイナンバーカード方式」を選択
4. マイナポータルアプリまたはICカードリーダーで認証
5. 利用者識別番号が自動的に発行される（初回のみ）

#### 確定申告書の作成ステップ

以下は、フリーランスエンジニアが青色申告する場合の一般的なフローです。

**ステップ1: 申告書の種類選択**

「所得税」を選択します。令和7年分（2026年分ではなく、2025年中の所得が対象であることに注意）の申告の場合は「令和7年分の申告書等の作成」から進みます。

注意: 2026年3月に行う確定申告は、2025年（令和7年）1月1日から12月31日までの所得に対する申告です。

**ステップ2: 収入金額の入力**

事業所得の場合、以下の項目を入力します。

- 営業等の収入金額（売上高）
- 営業等の所得金額（収入 - 経費）

青色申告決算書を別途作成している場合は、その内容を転記します。

**ステップ3: 所得控除の入力**

エンジニア・フリーランスが該当しやすい所得控除は以下の通りです。

- 基礎控除: 48万円（合計所得2,400万円以下）
- 社会保険料控除: 国民健康保険料 + 国民年金保険料
- 小規模企業共済等掛金控除: iDeCo拠出額
- 生命保険料控除
- 医療費控除
- 寄附金控除（ふるさと納税等）

マイナポータル連携を設定していると、医療費や保険料のデータが自動取得されます。

**ステップ4: 税額計算の確認**

入力が完了すると、自動的に税額が計算されます。以下の項目を確認してください。

- 所得税額
- 復興特別所得税額
- 源泉徴収税額（クライアントから源泉徴収されている場合）
- 差引納付税額 or 還付される税金

**ステップ5: 青色申告特別控除額の確認**

e-Taxで送信する場合、青色申告特別控除65万円が適用されていることを必ず確認してください。確定申告書の第一表「青色申告特別控除額」欄に「650,000」と表示されているはずです。

**ステップ6: 送信**

内容を確認したら、マイナンバーカードで電子署名を行い、送信します。送信完了後、受付番号が表示されるので必ず控えてください。

### freee/マネーフォワードからのe-Tax連携

クラウド会計ソフトを使っている場合、確定申告のデータをe-Taxに連携する方法は主に2つあります。

#### 方法1: 会計ソフトから直接e-Tax送信

freeeとマネーフォワードの両方とも、ソフト内から直接e-Taxへ送信する機能を備えています。

**freeeの場合**

1. freeeの確定申告画面で「提出」ステップに進む
2. 「電子申告（e-Tax）」を選択
3. freee電子申告アプリを起動
4. マイナンバーカードで認証
5. 送信

**マネーフォワードの場合**

1. マネーフォワード確定申告の「提出」画面に進む
2. 「e-Taxで提出」を選択
3. マネーフォワード クラウド確定申告e-Tax連携アプリを起動
4. マイナンバーカードで認証
5. 送信

#### 方法2: XMLエクスポート → e-Tax取込

会計ソフトから直接送信せず、XMLファイルをエクスポートしてe-Taxに取り込む方法です。データの中身を確認したいエンジニアにはこちらが向いています。

**freeeからのXMLエクスポート**

1. freeeの確定申告画面で申告書を確定
2. 「xtxファイルをダウンロード」を選択
3. `.xtx` ファイル（実質的にはXML形式）がダウンロードされる

**マネーフォワードからのXMLエクスポート**

1. マネーフォワード確定申告の提出画面に進む
2. 「e-Tax用ファイルをダウンロード」を選択
3. `.xtx` ファイルがダウンロードされる

**e-Taxへの取込手順**

1. 確定申告書等作成コーナーにアクセス
2. 「作成開始」→「e-Taxで提出」を選択
3. 「作成済みデータの利用」から `.xtx` ファイルを読み込む
4. 内容を確認・修正
5. 電子署名して送信

#### XMLファイルの中身を確認するスクリプト

エンジニアであれば、送信前にXMLの中身を確認したくなるでしょう。以下のスクリプトで、`.xtx` ファイルから主要な申告情報を抽出できます。

```python
#!/usr/bin/env python3
"""
e-Tax XTXファイル（XML）パーサー
確定申告データの主要項目を抽出・表示する

使い方:
  python3 parse_xtx.py /path/to/your_file.xtx
"""

import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def parse_xtx(filepath: str) -> None:
    """XTXファイルを解析して主要項目を表示する"""
    path = Path(filepath)
    if not path.exists():
        print(f"エラー: ファイルが見つかりません: {filepath}")
        sys.exit(1)

    if not path.suffix.lower() == ".xtx":
        print(f"警告: 拡張子が .xtx ではありません: {path.suffix}")

    tree = ET.parse(filepath)
    root = tree.getroot()

    # 名前空間の取得
    namespaces = {}
    for event, elem in ET.iterparse(filepath, events=["start-ns"]):
        ns_prefix, ns_uri = elem
        if ns_prefix:
            namespaces[ns_prefix] = ns_uri

    print(f"=== e-Tax申告データ解析結果 ===")
    print(f"ファイル: {path.name}")
    print(f"ルート要素: {root.tag}")
    print(f"名前空間: {len(namespaces)}個")
    print()

    # 申告書の種類を特定
    for child in root.iter():
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
        text = child.text.strip() if child.text and child.text.strip() else None

        # 主要な金額フィールドを検出
        if text and text.isdigit() and int(text) > 0:
            attrs = " ".join(f'{k}="{v}"' for k, v in child.attrib.items())
            if attrs:
                print(f"  {tag} [{attrs}]: {int(text):,}円")
            elif int(text) >= 1000:
                print(f"  {tag}: {int(text):,}円")

    print()
    print("=== 解析完了 ===")
    print(f"ヒント: 詳細はXMLエディタまたは以下のコマンドで確認してください")
    print(f"  xmllint --format {filepath} | less")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"使い方: python3 {sys.argv[0]} <xtxファイルパス>")
        sys.exit(1)
    parse_xtx(sys.argv[1])
```

```bash
## xmllintで整形表示（macOSにはプリインストール済み）
xmllint --format your_file.xtx | less

## 特定のタグを検索
xmllint --format your_file.xtx | grep -i "所得\|控除\|税額"

## Pythonスクリプトで解析
python3 parse_xtx.py your_file.xtx
```

#### freee APIを使った申告データの自動取得

freeeはREST APIを公開しており、OAuth 2.0認証で帳簿データにプログラムからアクセスできます。確定申告の事前チェックを自動化する例を示します。

```python
#!/usr/bin/env python3
"""
freee API経由で確定申告の事前チェックを行うスクリプト

前提条件:
  - freee APIのアクセストークンを取得済み
  - pip install requests

freee API リファレンス:
  https://developer.freee.co.jp/docs/accounting/reference
"""

import json
import sys
from datetime import date

import requests

FREEE_API_BASE = "https://api.freee.co.jp/api/1"


def get_headers(access_token: str) -> dict:
    """APIリクエスト用ヘッダーを生成"""
    return {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def get_deals_summary(
    access_token: str,
    company_id: int,
    fiscal_year: int,
) -> dict:
    """指定年度の取引サマリーを取得"""
    headers = get_headers(access_token)

    start_date = f"{fiscal_year}-01-01"
    end_date = f"{fiscal_year}-12-31"

    # 収入（売上）の取得
    income_params = {
        "company_id": company_id,
        "start_issue_date": start_date,
        "end_issue_date": end_date,
        "type": "income",
    }
    income_resp = requests.get(
        f"{FREEE_API_BASE}/deals",
        headers=headers,
        params=income_params,
    )
    income_resp.raise_for_status()
    income_deals = income_resp.json().get("deals", [])

    # 支出（経費）の取得
    expense_params = {
        "company_id": company_id,
        "start_issue_date": start_date,
        "end_issue_date": end_date,
        "type": "expense",
    }
    expense_resp = requests.get(
        f"{FREEE_API_BASE}/deals",
        headers=headers,
        params=expense_params,
    )
    expense_resp.raise_for_status()
    expense_deals = expense_resp.json().get("deals", [])

    total_income = sum(
        detail.get("amount", 0)
        for deal in income_deals
        for detail in deal.get("details", [])
    )
    total_expense = sum(
        detail.get("amount", 0)
        for deal in expense_deals
        for detail in deal.get("details", [])
    )

    return {
        "fiscal_year": fiscal_year,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_income": total_income - total_expense,
        "income_count": len(income_deals),
        "expense_count": len(expense_deals),
    }


def check_tax_filing_readiness(summary: dict) -> list[str]:
    """確定申告の準備状況をチェック"""
    warnings = []

    if summary["income_count"] == 0:
        warnings.append("[要確認] 収入の取引が0件です。売上が正しく記帳されているか確認してください。")

    if summary["expense_count"] == 0:
        warnings.append("[要確認] 経費の取引が0件です。事業経費が未記帳の可能性があります。")

    if summary["net_income"] < 0:
        warnings.append("[注意] 所得がマイナス（赤字）です。青色申告の場合、損失の繰越控除が可能です。")

    if summary["total_income"] > 10_000_000:
        warnings.append("[情報] 売上が1,000万円を超えています。2年後から消費税の課税事業者になる可能性があります。")

    return warnings


def main():
    """メイン処理"""
    access_token = "YOUR_FREEE_ACCESS_TOKEN"  # 環境変数から取得推奨
    company_id = 0  # freeeの事業所ID

    if access_token == "YOUR_FREEE_ACCESS_TOKEN":
        print("エラー: freee APIのアクセストークンを設定してください")
        print("取得方法: https://app.secure.freee.co.jp/developers/demo_companies/description")
        sys.exit(1)

    current_year = date.today().year
    fiscal_year = current_year - 1  # 前年分の確定申告

    print(f"=== freee確定申告事前チェック（{fiscal_year}年分） ===")
    print()

    summary = get_deals_summary(access_token, company_id, fiscal_year)

    print(f"事業収入合計: {summary['total_income']:,}円 ({summary['income_count']}件)")
    print(f"事業経費合計: {summary['total_expense']:,}円 ({summary['expense_count']}件)")
    print(f"事業所得:     {summary['net_income']:,}円")
    print()

    warnings = check_tax_filing_readiness(summary)
    if warnings:
        print("[チェック結果]")
        for w in warnings:
            print(f"  {w}")
    else:
        print("[チェック結果] 問題ありません。確定申告の準備が整っています。")

    print()
    print("=== チェック完了 ===")


if __name__ == "__main__":
    main()
```

参考: [freee API リファレンス](https://developer.freee.co.jp/docs/accounting/reference)

### 確定申告書等作成コーナーの活用法

国税庁の「確定申告書等作成コーナー」は、ブラウザ上で確定申告書を作成し、そのままe-Taxで送信できるWebアプリケーションです。毎年1月上旬にその年度用のバージョンが公開されます。

URL: https://www.keisan.nta.go.jp/kyoutu/ky/sm/top#bsctrl

#### 対応ブラウザ

2026年（令和7年分）の確定申告書等作成コーナーの対応ブラウザは以下の通りです。

| OS | ブラウザ | バージョン |
|----|---------|-----------|
| Windows 11 | Microsoft Edge | 最新版 |
| Windows 11 | Google Chrome | 最新版 |
| macOS 14以降 | Safari | 最新版 |
| macOS 14以降 | Google Chrome | 最新版 |

注意点:
- Firefoxは公式にはサポート対象外（動作する場合もある）
- Linuxは公式サポート対象外
- ブラウザの拡張機能が干渉する場合があるため、シークレットモードでの利用を推奨

#### マイナポータル連携の設定

確定申告書等作成コーナーでは、マイナポータルと連携することで以下のデータを自動取得できます。

- 医療費データ（保険診療分）
- ふるさと納税データ（対応自治体）
- 生命保険料控除証明書
- 地震保険料控除証明書
- 国民年金保険料控除証明書（電子版）
- 公的年金等の源泉徴収票

```
設定手順:
1. マイナポータルにログイン
2. 「もっとつながる」でe-Taxと連携設定
3. 各種証明書発行サイトとマイナポータルを連携
4. 確定申告書等作成コーナーで「マイナポータルから取得」を実行
```

この連携を設定しておくと、手入力の手間が大幅に減ります。特に医療費控除の対象となる通院が多い場合は効果的です。

#### 途中保存と再開

確定申告書等作成コーナーは、作業途中でデータを保存し、後日再開することができます。

保存方法:
- 各ステップの画面下部にある「入力データの一時保存」をクリック
- `.data` ファイルがダウンロードされる

再開方法:
- 作成コーナーのトップページで「作成再開」を選択
- 保存した `.data` ファイルを読み込む

```bash
## 保存ファイルの管理（ディレクトリを作成して整理）
mkdir -p ~/tax-return/2025
mv ~/Downloads/*.data ~/tax-return/2025/

## 保存日時をファイル名に含めて管理
## 例: 2025_shotokuzei_20260301.data
ls -la ~/tax-return/2025/
```

#### 前年データの読み込み

前年にe-Taxで申告した場合、前年のデータを読み込んで今年の申告書のベースにできます。氏名・住所・口座情報などの基本情報が引き継がれるため、入力の手間が省けます。

### よくあるエラーと対処法

e-Taxの利用中に発生しやすいエラーとその対処法をまとめます。

#### JPKI関連のエラー

**「マイナンバーカードが読み取れません」**

原因と対処:

```
1. ICカードリーダーの接続を確認
   → USBケーブルを抜き差し
   → 別のUSBポートに接続

2. マイナンバーカードの向きを確認
   → ICチップ（金色の端子）を上にしてリーダーに挿入

3. PC/SCドライバの状態を確認
   macOS:
     sudo launchctl list | grep pcscd
   Windows:
     sc query SCardSvr

4. JPKIクライアントソフトの再インストール
   → 公的個人認証サービスのサイトから最新版をダウンロード
```

**「署名用電子証明書の暗証番号が違います」**

署名用電子証明書の暗証番号は6文字以上16文字以下の英数字です。利用者証明用電子証明書の暗証番号（4桁数字）とは別物です。

```
署名用電子証明書:   英数字6-16文字  → 確定申告の電子署名に使用
利用者証明用電子証明書: 数字4桁      → マイナポータルログインに使用
```

暗証番号を5回連続で間違えるとロックされます。ロック解除は市区町村窓口のみです。

**「電子証明書の有効期限が切れています」**

対処:
1. 市区町村窓口で電子証明書の更新手続きを行う
2. 更新後、JPKIクライアントソフトで有効期限を再確認
3. e-Taxを再起動して接続を試みる

#### ブラウザ関連のエラー

**「事前準備セットアップが見つかりません」**

e-Taxのマイナンバーカード方式では、ブラウザ拡張機能（e-Taxソフト事前準備セットアップ）が必要です。

```bash
## macOS: 事前準備セットアップのインストール確認
ls /Library/Internet\ Plug-Ins/ | grep -i etax
ls ~/Library/Application\ Support/Google/Chrome/Default/Extensions/ | head -20

## Chromeの拡張機能を確認
## chrome://extensions/ にアクセスして「e-Tax」で検索
```

**「Safariでポップアップがブロックされます」**

対処:
1. Safari → 環境設定 → Webサイト → ポップアップウィンドウ
2. e-tax.nta.go.jp と keisan.nta.go.jp に対して「許可」を設定

**「Chromeで認証画面が表示されない」**

対処:

```bash
## Chromeのキャッシュクリア（e-Tax関連のみ）
## 手動: chrome://settings/clearBrowserData から
## または開発者ツール(F12) → Application → Clear site data

## シークレットモードで試行
## macOS: Cmd+Shift+N
## Windows: Ctrl+Shift+N
```

#### ネットワーク・証明書関連のエラー

**「接続がタイムアウトしました」**

確定申告期間中（特に3月上旬）はアクセスが集中し、サーバーの応答が遅くなることがあります。

対策:
- 早朝（6:00-8:00）または深夜（22:00-24:00）に利用する
- 確定申告期間の初期（2月中）に提出する
- ネットワーク回線を有線LANに切り替える

**「SSL/TLS証明書エラー」**

社内ネットワークやVPNを経由している場合、SSL/TLSインスペクションが干渉する可能性があります。

```bash
## e-Taxサイトへの接続をcurlで確認
curl -v https://www.e-tax.nta.go.jp/ 2>&1 | grep -E "SSL|TLS|certificate"

## 証明書チェーンの確認
openssl s_client -connect www.e-tax.nta.go.jp:443 -showcerts < /dev/null 2>&1 | \
  grep -E "subject|issuer|verify"
```

#### 送信時のエラー

**「受付結果：エラー」が表示された場合**

送信後にメッセージボックスで「受付結果：エラー」が表示された場合、エラー内容を確認して修正後に再送信できます。

よくあるエラー:
- 必須項目の未入力
- 金額の整合性エラー（収入と決算書の不一致）
- 電子証明書とマイナンバーの不一致

```bash
## e-Taxメッセージボックスの確認
## https://clientweb.e-tax.nta.go.jp/ にログイン
## 「メッセージボックス」→「受信通知」で確認
```

### エンジニア向けTips

#### e-Tax APIの概要

e-Taxには、外部システムからの電子申告を可能にするAPIが存在します。正式名称は「e-Taxソフト（WEB版）API」で、税務ソフトベンダーや会計ソフトが利用しています。

**API仕様の参考情報**

国税庁は税務ソフトベンダー向けにAPIの技術仕様を公開しています。

- [国税電子申告・納税システム（e-Tax）技術情報](https://www.e-tax.nta.go.jp/software/e-taxsoft_download.htm)
- [e-Tax受付システムの仕様公開](https://www.e-tax.nta.go.jp/developers/)

API通信には電子証明書による相互認証（クライアント証明書認証）が必要で、一般個人が直接APIを叩くことは想定されていません。しかし、仕組みを理解しておくと会計ソフトの連携処理の裏側が見えてきます。

#### 経費データの自動集計スクリプト

確定申告の準備段階で最も時間がかかるのが、経費データの整理です。銀行やクレジットカードのCSVデータから経費を自動集計するスクリプトを紹介します。

```python
#!/usr/bin/env python3
"""
クレジットカード/銀行のCSV明細から事業経費を自動分類・集計するスクリプト

対応形式:
  - 一般的なCSV明細（日付, 内容, 金額 の3列）
  - カスタムマッピングファイルで勘定科目を自動判定

使い方:
  python3 expense_classifier.py --input statements.csv --year 2025 --mapping mapping.json
"""

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ExpenseRule:
    """経費分類ルール"""
    pattern: str
    category: str  # 勘定科目
    is_business: bool = True


@dataclass
class ClassifiedExpense:
    """分類済み経費"""
    date: str
    description: str
    amount: int
    category: str
    is_business: bool


## デフォルトの分類ルール（エンジニア・フリーランス向け）
DEFAULT_RULES: list[ExpenseRule] = [
    # 通信費
    ExpenseRule(r"(NTT|KDDI|ソフトバンク|楽天モバイル|IIJ|OCN)", "通信費"),
    ExpenseRule(r"(AWS|AZURE|GCP|GOOGLE CLOUD|HEROKU|VERCEL|NETLIFY)", "通信費"),
    ExpenseRule(r"(さくらインターネット|XSERVER|CONOHA)", "通信費"),

    # 消耗品費
    ExpenseRule(r"(AMAZON|アマゾン|ヨドバシ|ビックカメラ)", "消耗品費"),
    ExpenseRule(r"(APPLE|アップル)", "消耗品費"),

    # 新聞図書費
    ExpenseRule(r"(OREILLY|オライリー|技術評論社|翔泳社)", "新聞図書費"),
    ExpenseRule(r"(UDEMY|COURSERA|PLURALSIGHT)", "新聞図書費"),

    # 旅費交通費
    ExpenseRule(r"(SUICA|PASMO|ICOCA|JR |モバイルSuica)", "旅費交通費"),
    ExpenseRule(r"(タクシー|UBER|GO )", "旅費交通費"),

    # 外注費
    ExpenseRule(r"(CROWDWORKS|クラウドワークス|LANCERS|ランサーズ)", "外注費"),

    # 地代家賃（コワーキング）
    ExpenseRule(r"(WEWORK|コワーキング|REGUS)", "地代家賃"),

    # 接待交際費
    ExpenseRule(r"(スターバックス|STARBUCKS|タリーズ|ドトール)", "会議費"),

    # SaaS/サブスク
    ExpenseRule(r"(GITHUB|GITLAB|JETBRAINS|SLACK|NOTION|FIGMA)", "通信費"),
    ExpenseRule(r"(ADOBE|CREATIVE CLOUD)", "通信費"),
    ExpenseRule(r"(FREEE|マネーフォワード|MONEYFORWARD)", "支払手数料"),
]


def load_mapping(mapping_path: str | None) -> list[ExpenseRule]:
    """カスタムマッピングファイルを読み込む"""
    if not mapping_path:
        return DEFAULT_RULES

    path = Path(mapping_path)
    if not path.exists():
        print(f"警告: マッピングファイルが見つかりません: {mapping_path}")
        print("デフォルトルールを使用します")
        return DEFAULT_RULES

    with open(path) as f:
        data = json.load(f)

    rules = []
    for entry in data.get("rules", []):
        rules.append(ExpenseRule(
            pattern=entry["pattern"],
            category=entry["category"],
            is_business=entry.get("is_business", True),
        ))

    return rules + DEFAULT_RULES


def classify_expense(
    description: str,
    rules: list[ExpenseRule],
) -> tuple[str, bool]:
    """明細の説明文から勘定科目を判定"""
    description_upper = description.upper()
    for rule in rules:
        if re.search(rule.pattern, description_upper, re.IGNORECASE):
            return rule.category, rule.is_business
    return "未分類", True


def parse_csv(filepath: str, year: int) -> list[dict]:
    """CSVファイルをパース"""
    rows = []
    with open(filepath, encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            return rows

        for row in reader:
            if len(row) < 3:
                continue
            date_str = row[0].strip()
            description = row[1].strip()
            amount_str = row[2].strip().replace(",", "").replace("\\", "")

            # 年のフィルタリング
            if str(year) not in date_str and not date_str.startswith(str(year)):
                continue

            try:
                amount = abs(int(float(amount_str)))
            except ValueError:
                continue

            rows.append({
                "date": date_str,
                "description": description,
                "amount": amount,
            })

    return rows


def main():
    parser = argparse.ArgumentParser(description="経費自動分類・集計ツール")
    parser.add_argument("--input", "-i", required=True, help="CSV明細ファイルパス")
    parser.add_argument("--year", "-y", type=int, required=True, help="対象年度")
    parser.add_argument("--mapping", "-m", help="カスタムマッピングJSONファイル")
    parser.add_argument("--output", "-o", help="出力ファイル（省略時は標準出力）")
    args = parser.parse_args()

    rules = load_mapping(args.mapping)
    rows = parse_csv(args.input, args.year)

    if not rows:
        print(f"エラー: {args.year}年のデータが見つかりません")
        sys.exit(1)

    # 分類
    classified = []
    for row in rows:
        category, is_business = classify_expense(row["description"], rules)
        classified.append(ClassifiedExpense(
            date=row["date"],
            description=row["description"],
            amount=row["amount"],
            category=category,
            is_business=is_business,
        ))

    # 集計
    totals = defaultdict(int)
    counts = defaultdict(int)
    for exp in classified:
        if exp.is_business:
            totals[exp.category] += exp.amount
            counts[exp.category] += exp.amount

    # 出力
    output_lines = []
    output_lines.append(f"=== {args.year}年 事業経費集計 ===")
    output_lines.append("")

    grand_total = 0
    for category in sorted(totals.keys()):
        amount = totals[category]
        grand_total += amount
        output_lines.append(f"  {category}: {amount:>12,}円")

    output_lines.append(f"  {'─' * 30}")
    output_lines.append(f"  {'合計':　<8}: {grand_total:>12,}円")
    output_lines.append("")

    # 未分類の一覧
    unclassified = [e for e in classified if e.category == "未分類"]
    if unclassified:
        output_lines.append(f"[未分類: {len(unclassified)}件]")
        for exp in unclassified[:20]:
            output_lines.append(f"  {exp.date} | {exp.description} | {exp.amount:,}円")
        if len(unclassified) > 20:
            output_lines.append(f"  ... 他{len(unclassified) - 20}件")

    result = "\n".join(output_lines)
    if args.output:
        Path(args.output).write_text(result, encoding="utf-8")
        print(f"結果を保存しました: {args.output}")
    else:
        print(result)


if __name__ == "__main__":
    main()
```

カスタムマッピングファイルの例:

```json
{
  "rules": [
    {"pattern": "コワーキングスペースA", "category": "地代家賃", "is_business": true},
    {"pattern": "打ち合わせ用カフェ", "category": "会議費", "is_business": true},
    {"pattern": "家族での食事", "category": "食費", "is_business": false},
    {"pattern": "GITHUB SPONSORS", "category": "広告宣伝費", "is_business": true}
  ]
}
```

#### 申告データのバックアップ自動化

確定申告関連のデータは法定で5年から7年の保存義務があります。以下のスクリプトで、申告データと関連書類を年度ごとに整理・バックアップできます。

```bash
#!/bin/bash
## 確定申告データバックアップスクリプト
## 使い方: ./tax_backup.sh 2025

set -euo pipefail

YEAR="${1:?使い方: $0 <対象年度>}"
BASE_DIR="$HOME/tax-return"
BACKUP_DIR="$BASE_DIR/$YEAR"
ARCHIVE_NAME="tax-return-${YEAR}-$(date +%Y%m%d).tar.gz"

echo "=== 確定申告データバックアップ（${YEAR}年分） ==="

## ディレクトリ構成の作成
mkdir -p "$BACKUP_DIR"/{申告書,決算書,領収書,CSV明細,その他}

echo "[1/4] ダウンロードフォルダから申告関連ファイルを収集..."
## XTXファイル（e-Tax出力）
find ~/Downloads -name "*.xtx" -newer "$BACKUP_DIR" -exec cp -v {} "$BACKUP_DIR/申告書/" \; 2>/dev/null || true
## PDFファイル（申告書控え）
find ~/Downloads -name "*確定申告*" -o -name "*shotoku*" -o -name "*kessan*" | \
  while read -r f; do cp -v "$f" "$BACKUP_DIR/申告書/" 2>/dev/null || true; done
## CSVファイル（明細データ）
find ~/Downloads -name "*.csv" -newer "$BACKUP_DIR" -exec cp -v {} "$BACKUP_DIR/CSV明細/" \; 2>/dev/null || true

echo "[2/4] ファイル一覧の生成..."
find "$BACKUP_DIR" -type f | sort > "$BACKUP_DIR/file-list.txt"
echo "  $(wc -l < "$BACKUP_DIR/file-list.txt") ファイル"

echo "[3/4] チェックサムの計算..."
find "$BACKUP_DIR" -type f ! -name "checksums.sha256" | sort | \
  xargs shasum -a 256 > "$BACKUP_DIR/checksums.sha256"

echo "[4/4] アーカイブの作成..."
tar -czf "$BASE_DIR/$ARCHIVE_NAME" -C "$BASE_DIR" "$YEAR"
echo "  $BASE_DIR/$ARCHIVE_NAME ($(du -h "$BASE_DIR/$ARCHIVE_NAME" | cut -f1))"

echo ""
echo "=== バックアップ完了 ==="
echo "保存先: $BASE_DIR/$ARCHIVE_NAME"
echo ""
echo "[注意] 確定申告関連書類は以下の期間保存が必要です:"
echo "  - 確定申告書の控え: 5年間"
echo "  - 青色申告の帳簿書類: 7年間"
echo "  - 領収書・請求書: 5年間（前々年所得300万円超は7年間）"
```

#### シェルエイリアスで効率化

確定申告期間中に使うコマンドをエイリアスにまとめておくと便利です。

```bash
## ~/.bashrc または ~/.zshrc に追加

## e-Tax関連
alias etax='open "https://www.keisan.nta.go.jp/"'
alias etax-web='open "https://clientweb.e-tax.nta.go.jp/"'
alias etax-msg='open "https://clientweb.e-tax.nta.go.jp/UF_APP/lnk/loginCtlKak  "'

## 確定申告データ管理
alias tax-dir='cd ~/tax-return/$(date +%Y) && ls -la'
alias tax-backup='~/scripts/tax_backup.sh'

## JPKI確認
alias jpki-check='open /Applications/JPKIUserCertUtl.app'

## freee/MF
alias freee='open "https://secure.freee.co.jp/"'
alias mf='open "https://moneyforward.com/cf"'

## 経費集計
alias expenses='python3 ~/scripts/expense_classifier.py'
```

#### Git管理による帳簿のバージョン管理

エンジニアであれば、帳簿データもGitで管理するのが自然な発想です。ただし、以下の点に注意が必要です。

```bash
## 帳簿リポジトリの初期化
mkdir -p ~/tax-return && cd ~/tax-return
git init

## .gitignore の設定
cat > .gitignore << 'EOF'
## 個人情報を含むファイルはリモートにpushしない
*.xtx
*.data
マイナンバー*
## 大きなPDFやスキャン画像
*.pdf
*.jpg
*.png
## macOS
.DS_Store
EOF

## ただし、経費集計結果やスクリプトはバージョン管理する
## .gitignore にホワイトリストを追加
cat >> .gitignore << 'EOF'
## ホワイトリスト（追跡対象）
!scripts/
!mapping.json
!README.md
EOF
```

重要: マイナンバーや申告書原本など個人情報を含むファイルは、リモートリポジトリにプッシュしないでください。ローカルでのバージョン管理に留めるか、暗号化した上でプライベートリポジトリに保存してください。

#### Pythonによるe-Tax XTXファイルの差分比較

修正申告や前年との比較に使えるスクリプトです。

```python
#!/usr/bin/env python3
"""
2つのXTXファイル（e-Tax XML）を比較し、差分を表示するスクリプト

使い方:
  python3 diff_xtx.py previous.xtx current.xtx
"""

import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def extract_values(filepath: str) -> dict[str, str]:
    """XTXファイルから全てのタグ-値ペアを抽出"""
    tree = ET.parse(filepath)
    root = tree.getroot()

    values = {}
    for elem in root.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        text = elem.text.strip() if elem.text and elem.text.strip() else None
        if text:
            # 同名タグが複数ある場合はattribで区別
            key = tag
            attrs = sorted(elem.attrib.items())
            if attrs:
                attr_str = ",".join(f"{k}={v}" for k, v in attrs)
                key = f"{tag}[{attr_str}]"
            values[key] = text

    return values


def compare_xtx(file1: str, file2: str) -> None:
    """2つのXTXファイルを比較"""
    path1 = Path(file1)
    path2 = Path(file2)

    for p in [path1, path2]:
        if not p.exists():
            print(f"エラー: ファイルが見つかりません: {p}")
            sys.exit(1)

    vals1 = extract_values(file1)
    vals2 = extract_values(file2)

    all_keys = sorted(set(vals1.keys()) | set(vals2.keys()))

    print(f"=== XTXファイル差分比較 ===")
    print(f"  前: {path1.name}")
    print(f"  後: {path2.name}")
    print()

    changes = 0
    for key in all_keys:
        v1 = vals1.get(key)
        v2 = vals2.get(key)

        if v1 == v2:
            continue

        changes += 1
        if v1 is None:
            print(f"  [追加] {key}: {v2}")
        elif v2 is None:
            print(f"  [削除] {key}: {v1}")
        else:
            # 数値の場合は差額も表示
            try:
                n1, n2 = int(v1), int(v2)
                diff = n2 - n1
                sign = "+" if diff > 0 else ""
                print(f"  [変更] {key}: {n1:,} -> {n2:,} ({sign}{diff:,})")
            except ValueError:
                print(f"  [変更] {key}: {v1} -> {v2}")

    if changes == 0:
        print("  差分はありません")
    else:
        print(f"\n  合計: {changes}件の差分")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"使い方: python3 {sys.argv[0]} <前のXTX> <後のXTX>")
        sys.exit(1)
    compare_xtx(sys.argv[1], sys.argv[2])
```

#### マネーフォワードAPIによる仕訳データ取得

マネーフォワードもREST APIを公開しています。freee同様にOAuth 2.0認証です。

```python
#!/usr/bin/env python3
"""
マネーフォワード クラウド確定申告 API経由で
仕訳データのサマリーを取得するサンプル

API リファレンス:
  https://api.biz.moneyforward.com/doc/
"""

import os
import sys
from datetime import date

import requests

MF_API_BASE = "https://invoice.moneyforward.com/api/v3"


def get_journal_summary(access_token: str, office_id: str, year: int) -> dict:
    """指定年度の仕訳サマリーを取得"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    # 仕訳一覧の取得
    params = {
        "from_date": f"{year}-01-01",
        "to_date": f"{year}-12-31",
        "per_page": 100,
    }

    response = requests.get(
        f"{MF_API_BASE}/office/{office_id}/journals",
        headers=headers,
        params=params,
    )
    response.raise_for_status()
    data = response.json()

    journals = data.get("journals", [])

    summary = {
        "total_entries": len(journals),
        "year": year,
    }

    return summary


def main():
    access_token = os.environ.get("MF_ACCESS_TOKEN", "")
    office_id = os.environ.get("MF_OFFICE_ID", "")

    if not access_token or not office_id:
        print("環境変数を設定してください:")
        print("  export MF_ACCESS_TOKEN='your_token'")
        print("  export MF_OFFICE_ID='your_office_id'")
        sys.exit(1)

    fiscal_year = date.today().year - 1
    print(f"=== マネーフォワード仕訳サマリー（{fiscal_year}年分） ===")

    summary = get_journal_summary(access_token, office_id, fiscal_year)
    print(f"仕訳件数: {summary['total_entries']}件")

    print("=== 取得完了 ===")


if __name__ == "__main__":
    main()
```

参考: [マネーフォワード クラウド API ドキュメント](https://api.biz.moneyforward.com/doc/)

### 送信後の確認と控えの保存

#### 送信完了の確認

e-Taxで申告書を送信したら、以下の手順で受付が完了したことを確認してください。

**1. 即時通知の確認**

送信直後に表示される画面で、以下の情報を確認します。

- 受付番号（16桁）
- 受付日時
- 利用者識別番号

この画面はブラウザを閉じると再表示できないため、必ずスクリーンショットを撮影するか、PDFとして保存してください。

```bash
## macOSでのスクリーンショット保存
## Cmd+Shift+4 でスクリーンショット撮影
## 保存先:
mkdir -p ~/tax-return/2025/確認画面
## ダウンロードしたPDFもここに移動
mv ~/Downloads/*確定申告* ~/tax-return/2025/確認画面/
```

**2. メッセージボックスでの確認**

送信後、e-Taxのメッセージボックスに受付結果が届きます。

1. e-Taxソフト（WEB版）にログイン: https://clientweb.e-tax.nta.go.jp/
2. 「メッセージボックス」をクリック
3. 「受信通知」に受付結果が表示される
4. 「受付完了」と表示されていれば正常に処理されています

メッセージボックスの受信通知には、申告書の控え（PDF）も含まれています。必ずダウンロードして保存してください。

**3. 受信通知のダウンロード**

受信通知のPDFには以下の情報が記載されています。

- 納税者の氏名・住所
- 受付番号・受付日時
- 申告年分
- 申告書の種類（所得税及び復興特別所得税）
- 納付税額または還付税額

この受信通知は、住宅ローンの審査や各種証明書として使用できます。確実に保存してください。

#### 申告書控えの保存

確定申告書の控えは、以下の方法で保存できます。

**方法1: 確定申告書等作成コーナーからPDFを保存**

送信完了画面で「帳票表示・印刷」をクリックすると、申告書のPDFが生成されます。このPDFを保存してください。

**方法2: メッセージボックスからダウンロード**

メッセージボックスの受信通知から、申告書のPDFをダウンロードできます。

**方法3: 入力データの保存**

確定申告書等作成コーナーの「入力データの保存」から、`.data` ファイルをダウンロードできます。このファイルがあれば、来年の申告時に前年データとして読み込めます。

```bash
## 保存すべきファイル一覧
## ~/tax-return/2025/
##   申告書/
##     shotokuzei_r7.pdf      # 確定申告書の控え（PDF）
##     kessan_r7.pdf           # 青色申告決算書の控え（PDF）
##     jyushin_r7.pdf          # 受信通知（PDF）
##   データ/
##     r7_shotokuzei.data      # 入力データ（来年再利用可能）
##     r7_shotokuzei.xtx       # XTXファイル（XML形式の申告データ）
##   確認画面/
##     送信完了画面.png         # スクリーンショット
```

#### 還付金の処理状況確認

還付申告の場合、還付金の処理状況をオンラインで確認できます。

1. e-Taxソフト（WEB版）にログイン
2. 「還付金処理状況」を確認
3. 以下のステータスが表示されます
   - 受付済み
   - 処理中
   - 支払手続中
   - 支払完了

e-Tax申告の場合、通常3週間程度で還付処理が完了します。

#### 修正申告・更正の請求

送信後に誤りに気づいた場合の対処方法です。

**申告期限内（3月15日まで）の場合**

確定申告書を再送信するだけで、後から送信した申告書が有効になります。修正申告の手続きは不要です。

**申告期限後の場合**

- 税額が増える場合: 修正申告書を提出（e-Taxで送信可能）
- 税額が減る場合: 更正の請求書を提出（法定申告期限から5年以内）

```bash
## 修正申告の判断フロー
## 1. 確定申告書等作成コーナーで修正申告書を作成
## 2. 「修正申告書」を選択
## 3. 前回の申告データを読み込み
## 4. 修正箇所を入力
## 5. e-Taxで送信
```

### まとめ

e-Taxによる電子申告は、エンジニア・フリーランスにとって最も合理的な確定申告の方法です。本記事の要点を整理します。

**セットアップ**
- マイナンバーカード方式を選択し、ICカードリーダーまたはNFC対応スマートフォンを用意する
- JPKIクライアントソフトと対応ブラウザをインストールする
- 環境チェックスクリプトで事前に動作確認する

**申告書の作成と送信**
- 確定申告書等作成コーナーが最も簡単な方法
- freee/マネーフォワードからの直接送信またはXMLエクスポート連携が可能
- マイナポータル連携で控除証明書の自動取得ができる

**エンジニアならではの活用**
- XMLパーサーで申告データの内容を検証
- 経費自動分類スクリプトで帳簿整理を効率化
- バックアップスクリプトで法定保存義務に対応
- freee/マネーフォワードのAPIで申告前チェックを自動化

**送信後**
- メッセージボックスで受付完了を確認
- 申告書控え・受信通知・入力データを確実に保存
- 還付金の処理状況をオンラインで追跡

確定申告は毎年の作業です。一度環境を構築してスクリプトを整備すれば、翌年以降の作業は大幅に効率化できます。税務手続きを自動化・効率化するのは、エンジニアの得意分野です。

参考リンク:
- [国税庁 e-Tax公式サイト](https://www.e-tax.nta.go.jp/)
- [確定申告書等作成コーナー](https://www.keisan.nta.go.jp/)
- [公的個人認証サービス（JPKI）](https://www.jpki.go.jp/)
- [freee API リファレンス](https://developer.freee.co.jp/docs/accounting/reference)
- [マネーフォワード クラウド API](https://api.biz.moneyforward.com/doc/)

---

※この記事は2026年3月時点の情報に基づいています。e-Taxの仕様やブラウザの対応状況は変更される場合があります。最新情報は国税庁の公式サイトで確認してください。

※具体的な税額の計算や税務判断については、税理士・会計士にご相談ください。

※当記事で紹介しているfreee会計、マネーフォワードクラウド確定申告のリンクにはアフィリエイトリンク（PR）が含まれます。
