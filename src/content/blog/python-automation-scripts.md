---
title: '【コピペOK】仕事を自動化するPythonスクリプト10選 - 業務効率化の決定版'
description: 'コピペですぐ使えるPython自動化スクリプト10選。ファイル整理、Excel・CSV操作、Web情報収集、メール自動送信など、今日から業務を効率化できるスクリプトを紹介。初心者でもすぐ導入できるサンプルコード付き実用ガイドです。'
pubDate: '2026-02-03'
tags: ['Python', 'バックエンド']
heroImage: '../../assets/thumbnails/python-automation-scripts.jpg'
---
毎日の退屈な作業をPythonで自動化しましょう。この記事のスクリプトはコピペですぐに使えます。

## 環境準備

```bash
pip install openpyxl requests beautifulsoup4 schedule
```

## 1. ファイル自動整理スクリプト

ダウンロードフォルダのファイルを拡張子別に自動仕分け。

```python
import os
import shutil
from pathlib import Path

def organize_files(directory):
    """ファイルを拡張子別のフォルダに整理"""
    categories = {
        "Images": [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"],
        "Documents": [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".pptx"],
        "Videos": [".mp4", ".avi", ".mov", ".mkv"],
        "Audio": [".mp3", ".wav", ".flac"],
        "Archives": [".zip", ".rar", ".7z", ".tar", ".gz"],
        "Code": [".py", ".js", ".ts", ".html", ".css", ".json"],
    }

    path = Path(directory)
    for file in path.iterdir():
        if file.is_file():
            ext = file.suffix.lower()
            dest_folder = "Others"
            for folder, extensions in categories.items():
                if ext in extensions:
                    dest_folder = folder
                    break
            dest = path / dest_folder
            dest.mkdir(exist_ok=True)
            shutil.move(str(file), str(dest / file.name))
            print(f"Moved: {file.name} -> {dest_folder}/")

# 使い方
organize_files(os.path.expanduser("~/Downloads"))
```

## 2. CSV→Excel自動変換（書式付き）

```python
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill
import csv

def csv_to_styled_excel(csv_path, excel_path):
    """CSVをスタイル付きExcelに変換"""
    wb = openpyxl.Workbook()
    ws = wb.active

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row_idx, row in enumerate(reader, 1):
            for col_idx, value in enumerate(row, 1):
                cell = ws.cell(row=row_idx, column=col_idx, value=value)
                if row_idx == 1:  # ヘッダー行
                    cell.font = Font(bold=True, color="FFFFFF")
                    cell.fill = PatternFill("solid", fgColor="4472C4")
                    cell.alignment = Alignment(horizontal="center")

    # 列幅の自動調整
    for col in ws.columns:
        max_length = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = max_length + 4

    wb.save(excel_path)
    print(f"Saved: {excel_path}")

# 使い方
csv_to_styled_excel("data.csv", "report.xlsx")
```

## 3. Webページ情報収集

```python
import requests
from bs4 import BeautifulSoup

def scrape_headlines(url):
    """Webページの見出しを取得"""
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, "html.parser")

    headlines = []
    for tag in ["h1", "h2", "h3"]:
        for heading in soup.find_all(tag):
            text = heading.get_text(strip=True)
            if text:
                headlines.append({"level": tag, "text": text})

    return headlines

# 使い方（自分のサイトに対して使用）
for h in scrape_headlines("https://example.com"):
    print(f"[{h['level']}] {h['text']}")
```

## 4. 重複ファイル検出

```python
import hashlib
from pathlib import Path
from collections import defaultdict

def find_duplicates(directory):
    """ハッシュ値で重複ファイルを検出"""
    hash_map = defaultdict(list)

    for file in Path(directory).rglob("*"):
        if file.is_file() and file.stat().st_size > 0:
            h = hashlib.md5(file.read_bytes()).hexdigest()
            hash_map[h].append(str(file))

    duplicates = {h: files for h, files in hash_map.items() if len(files) > 1}

    for h, files in duplicates.items():
        print(f"\n重複グループ (hash: {h[:8]}...):")
        for f in files:
            print(f"  {f}")

    return duplicates

# 使い方
find_duplicates(os.path.expanduser("~/Documents"))
```

## 5. 定期実行タスクランナー

```python
import schedule
import time

def daily_report():
    print("日次レポートを生成中...")
    # ここにレポート生成ロジック

def hourly_check():
    print("定期チェック実行中...")
    # ここにチェックロジック

schedule.every().day.at("09:00").do(daily_report)
schedule.every().hour.do(hourly_check)

while True:
    schedule.run_pending()
    time.sleep(60)
```

## 6. 画像一括リサイズ

```python
from PIL import Image
from pathlib import Path

def resize_images(input_dir, output_dir, max_size=(800, 800)):
    """画像を一括リサイズ"""
    Path(output_dir).mkdir(exist_ok=True)

    for img_path in Path(input_dir).glob("*.{jpg,jpeg,png}"):
        img = Image.open(img_path)
        img.thumbnail(max_size, Image.LANCZOS)
        output_path = Path(output_dir) / img_path.name
        img.save(output_path, quality=85)
        print(f"Resized: {img_path.name}")

# 使い方（要: pip install Pillow）
resize_images("./photos", "./photos_resized")
```

## 7. JSON/YAML変換ツール

```python
import json
import yaml

def json_to_yaml(json_path, yaml_path):
    with open(json_path) as f:
        data = json.load(f)
    with open(yaml_path, "w") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True)
    print(f"Converted: {json_path} -> {yaml_path}")

def yaml_to_json(yaml_path, json_path):
    with open(yaml_path) as f:
        data = yaml.safe_load(f)
    with open(json_path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Converted: {yaml_path} -> {json_path}")
```

## 8. ログファイル分析

```python
import re
from collections import Counter

def analyze_log(log_path):
    """ログファイルからエラーを集計"""
    errors = Counter()
    with open(log_path) as f:
        for line in f:
            if "ERROR" in line:
                # エラーメッセージ部分を抽出
                match = re.search(r"ERROR[:\s]+(.+?)(?:\n|$)", line)
                if match:
                    errors[match.group(1).strip()] += 1

    print("=== エラー集計 ===")
    for error, count in errors.most_common(10):
        print(f"  {count:>5}回: {error[:80]}")

# 使い方
analyze_log("application.log")
```

## 9. Markdown→HTML変換

```python
import re

def markdown_to_html(md_text):
    """シンプルなMarkdown→HTML変換"""
    html = md_text
    html = re.sub(r"^### (.+)$", r"<h3>\1</h3>", html, flags=re.MULTILINE)
    html = re.sub(r"^## (.+)$", r"<h2>\1</h2>", html, flags=re.MULTILINE)
    html = re.sub(r"^# (.+)$", r"<h1>\1</h1>", html, flags=re.MULTILINE)
    html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html)
    html = re.sub(r"\*(.+?)\*", r"<em>\1</em>", html)
    html = re.sub(r"`(.+?)`", r"<code>\1</code>", html)
    html = re.sub(r"^- (.+)$", r"<li>\1</li>", html, flags=re.MULTILINE)
    html = re.sub(r"\n\n", r"</p>\n<p>", html)
    return f"<p>{html}</p>"
```

## 10. 環境変数管理

```python
from pathlib import Path

def check_env_vars(required_vars, env_file=".env"):
    """必要な環境変数が設定されているかチェック"""
    missing = []
    env_data = {}

    if Path(env_file).exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_data[key.strip()] = value.strip()

    for var in required_vars:
        if var not in env_data and var not in os.environ:
            missing.append(var)

    if missing:
        print("Missing environment variables:")
        for var in missing:
            print(f"  - {var}")
        return False

    print("All environment variables are set!")
    return True

# 使い方
check_env_vars(["DATABASE_URL", "API_KEY", "SECRET_KEY"])
```

## エラーハンドリングのパターン

自動化スクリプトを本番運用する際は、適切なエラーハンドリングが不可欠です。

### リトライ付きHTTPリクエスト

Web情報収集やAPI連携では、タイムアウトや一時的なサーバーエラーが頻繁に発生します。**指数バックオフ**（1秒→2秒→4秒と待機時間を倍増）でリトライする仕組みを入れましょう。

```python
import time, requests

def fetch_with_retry(url, max_retries=3, timeout=10):
    for attempt in range(max_retries):
        try:
            res = requests.get(url, timeout=timeout)
            res.raise_for_status()
            return res
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise
```

### ファイル操作の安全なパターン

ファイルを上書きする処理では、**バックアップ→処理→バックアップ削除**の3ステップが基本です。`try/except` で失敗時にバックアップから復元する仕組みを入れておくと、データ消失を防げます。

## cron での定期実行

前述の `schedule` ライブラリは手軽ですが、Pythonプロセスを常時起動し続ける必要があります。本番運用ではOSのcron（Linux/macOS）やタスクスケジューラ（Windows）を使うのが確実です。

```bash
# crontab を編集
crontab -e

# 毎日9時にファイル整理を実行（ログ出力付き）
0 9 * * * /usr/bin/python3 /home/user/scripts/organize_files.py >> /home/user/logs/organize.log 2>&1

# 毎時0分にログ分析を実行
0 * * * * /usr/bin/python3 /home/user/scripts/analyze_log.py >> /home/user/logs/analyze.log 2>&1
```

**cron設定のポイント:** Pythonとスクリプトは**フルパス**で指定し、出力は`>> ログファイル 2>&1`でリダイレクトして実行結果を記録します。

## まとめ

これらのスクリプトは、そのままコピペして使うことも、カスタマイズのベースにすることもできます。まずは「ファイル自動整理」や「CSV→Excel変換」から試してみてください。

日々の手作業を1つずつ自動化していくことで、年間で数百時間の作業時間を節約できます。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
