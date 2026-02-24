---
title: 'Linux・コマンドライン完全ガイド：開発者が必ず知るべきシェル操作'
description: 'Linuxコマンドラインとシェルスクリプトを徹底解説。ファイル操作・プロセス管理・ネットワーク・sed/awk・bash scripting・zsh・tmux・vim・systemd・cron・セキュリティまで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['Linux', 'CLI', 'DevOps']
---

Linuxのコマンドラインは、すべての開発者が習得すべき強力なインターフェースだ。GUIツールに頼るだけでは到達できない領域——サーバー管理、自動化、高速なファイル操作、プロセス制御——はすべてシェルの世界にある。本記事ではLinuxコマンドラインの基礎から高度なシェルスクリプト、tmux、vim、systemd、セキュリティ設定まで、実用的なコード例とともに体系的に解説する。

---

## 1. Linuxコマンドラインの基本：ファイルとディレクトリ操作

### ディレクトリナビゲーション

シェルを開いたときにまず使うのはディレクトリの移動と確認だ。

```bash
# 現在のディレクトリを確認
pwd
# /home/user/projects

# ホームディレクトリへ移動
cd ~
cd $HOME

# 一つ上のディレクトリへ
cd ..

# 直前のディレクトリへ戻る（非常に便利）
cd -

# 絶対パスで移動
cd /var/log/nginx

# 相対パスで移動
cd ./src/components
```

`cd -` は直前にいたディレクトリへ瞬時に戻るコマンドで、2つのディレクトリを行き来するときに重宝する。

### ディレクトリの内容を確認する

```bash
# 基本的なリスト表示
ls

# 詳細表示（パーミッション・サイズ・日時）
ls -l

# 隠しファイルも含めて表示
ls -la

# サイズを人間が読みやすい形式で表示
ls -lh

# 更新日時順で新しいものから表示
ls -lt

# 再帰的にすべてのサブディレクトリも表示
ls -lR

# ファイルタイプを区別する記号を付与（/=ディレクトリ, *=実行ファイル）
ls -lF

# 実用的な組み合わせ：隠しファイル含む詳細・サイズ人間可読・新しい順
ls -lahF --sort=time
```

### ファイルとディレクトリの作成・削除・移動

```bash
# ディレクトリ作成
mkdir myproject

# 複数階層のディレクトリを一度に作成
mkdir -p myproject/src/components
mkdir -p myproject/{src,tests,docs}

# ファイル作成（空ファイル）
touch index.html style.css app.js

# タイムスタンプ更新にも使える
touch existing-file.txt

# ファイルコピー
cp source.txt destination.txt

# ディレクトリごとコピー（-r で再帰的）
cp -r src/ backup/

# コピー時に進捗表示
cp -rv large-directory/ /mnt/backup/

# ファイル移動・リネーム
mv old-name.txt new-name.txt
mv file.txt /var/www/html/

# 複数ファイルをディレクトリへ移動
mv *.js src/

# ファイル削除
rm file.txt

# ディレクトリごと削除
rm -rf old-directory/

# 削除前に確認を求める
rm -i file.txt

# 削除対象を表示しながら削除
rm -rv old-directory/
```

`rm -rf` は非常に危険だ。カレントディレクトリを確認してから実行すること。`rm -rf /` はシステム全体を破壊する。

### ファイル内容の表示

```bash
# ファイル全体を表示
cat README.md

# 行番号付きで表示
cat -n README.md

# 先頭10行を表示
head README.md

# 先頭20行を表示
head -n 20 README.md

# 末尾10行を表示
tail README.md

# 末尾20行を表示
tail -n 20 README.md

# ファイルの追記を監視（ログ監視に必須）
tail -f /var/log/nginx/access.log

# 複数ファイルを監視
tail -f /var/log/nginx/*.log

# ページャで表示（スペースで次ページ、qで終了）
less README.md

# less の便利なショートカット
# / で前方検索、? で後方検索
# G で最終行、gg で先頭行
# q で終了
```

### ファイルの情報確認

```bash
# ファイルタイプを判定
file document.pdf
# document.pdf: PDF document, version 1.7

file unknown-binary
# unknown-binary: ELF 64-bit LSB executable, x86-64

# ファイルサイズと使用ディスク容量
du -sh myproject/
# 4.2M    myproject/

# ディレクトリ内のサイズを一覧表示
du -sh *

# 深さを指定してディレクトリサイズを確認
du -h --max-depth=2 /var/

# ディスク使用量全体を確認
df -h
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        50G   15G   33G  32% /

# inode使用量を確認
df -i
```

### リンクの作成

```bash
# シンボリックリンク（ソフトリンク）作成
ln -s /usr/local/bin/python3 /usr/local/bin/python

# ハードリンク作成
ln original.txt hardlink.txt

# シンボリックリンクの実体を確認
readlink -f /usr/local/bin/python
# /usr/bin/python3.11

# シンボリックリンクの一覧を確認
ls -la | grep "^l"
```

---

## 2. ファイル検索：find・fd・ripgrep

### find コマンドの完全活用

`find` はLinuxで最もパワフルなファイル検索ツールだ。

```bash
# 名前でファイルを検索
find . -name "*.js"
find /var/log -name "*.log"

# 大文字小文字を区別しない検索
find . -iname "readme*"

# ファイルのみ検索（ディレクトリを除外）
find . -type f -name "*.py"

# ディレクトリのみ検索
find . -type d -name "node_modules"

# node_modules を除外して検索
find . -name "*.js" -not -path "*/node_modules/*"

# 複数の除外条件
find . -name "*.ts" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*"

# サイズで検索（100MB以上のファイル）
find / -size +100M -type f

# 10MBから50MBのファイル
find . -size +10M -size -50M

# 更新日時で検索（7日以内に変更されたファイル）
find . -mtime -7 -type f

# 30日以上前に変更されたファイル
find /tmp -mtime +30 -type f

# 1時間以内に変更されたファイル
find . -mmin -60 -type f

# パーミッションで検索
find . -perm 755 -type f
find . -perm /u+x -type f  # 実行権限があるファイル

# 空のファイルとディレクトリを検索
find . -empty

# 検索結果に対してコマンドを実行（xargs より安全）
find . -name "*.log" -older /etc/hosts -delete

# 検索して削除（確認なし）
find /tmp -name "*.tmp" -type f -delete

# 検索して特定のコマンドを実行
find . -name "*.py" -exec chmod 644 {} \;

# xargs と組み合わせる（高速）
find . -name "*.js" -print0 | xargs -0 grep "TODO"

# 深さを制限して検索
find . -maxdepth 2 -name "*.json"
find . -mindepth 1 -maxdepth 3 -name "*.md"
```

### fd：モダンな find の代替

`fd` はfind の現代的な代替ツールで、シンプルな構文と高速な動作が特徴だ。

```bash
# インストール
sudo apt install fd-find   # Debian/Ubuntu
brew install fd            # macOS

# 基本的な使い方（デフォルトで隠しファイルと.gitignoreを除外）
fd pattern

# 特定の拡張子を検索
fd -e js
fd -e ts -e tsx

# 特定のディレクトリから検索
fd pattern /path/to/search

# ファイルタイプで絞り込み
fd -t f pattern   # ファイルのみ
fd -t d pattern   # ディレクトリのみ

# 大文字小文字を区別しない（デフォルトはスマートケース）
fd -i PATTERN

# 隠しファイルも含める
fd -H pattern

# .gitignore を無視して検索
fd -I pattern

# 検索してコマンドを実行
fd -e py -x chmod 644 {}

# 並列実行（高速）
fd -e js -X prettier --write {}
```

### ripgrep：超高速テキスト検索

`rg`（ripgrep）はgrepの現代的な代替で、.gitignoreを自動的に尊重し非常に高速だ。

```bash
# インストール
sudo apt install ripgrep   # Debian/Ubuntu
brew install ripgrep       # macOS

# 基本的な検索
rg "search pattern"
rg "TODO" src/

# ファイルタイプを指定
rg -t js "console.log"
rg -t py "import numpy"

# 大文字小文字を区別しない
rg -i "error"

# 行番号付きで表示（デフォルト）
rg "TODO"

# ファイル名のみ表示
rg -l "TODO"

# マッチした行の前後も表示（コンテキスト）
rg -A 3 -B 3 "function main"  # 前後3行

rg -C 5 "critical error"      # 前後5行

# 正規表現を使用
rg "fn \w+\(" src/   # Rustの関数定義を検索

# 特定のディレクトリを除外
rg "pattern" --glob '!node_modules/**'

# 複数のパターンを検索
rg -e "TODO" -e "FIXME" -e "HACK"

# ワード境界でマッチ
rg -w "log"  # "blog"はマッチしない

# カウントのみ表示
rg -c "import" src/

# マッチしないファイルを表示
rg --files-without-match "test"

# 隠しファイルも検索
rg --hidden "pattern"

# バイナリファイルも検索
rg -a "pattern"

# JSON形式で出力（他のツールとの連携）
rg --json "pattern" | jq '.data.lines.text'
```

---

## 3. テキスト処理：grep・sed・awk・cut・sort・uniq

### grep：テキスト検索の基本

```bash
# 基本的な検索
grep "pattern" file.txt

# 大文字小文字を区別しない
grep -i "error" /var/log/syslog

# 行番号を表示
grep -n "TODO" *.py

# マッチしない行を表示
grep -v "DEBUG" app.log

# 再帰的に検索
grep -r "config" /etc/nginx/

# ファイル名のみ表示
grep -l "main" *.c

# マッチ数を表示
grep -c "ERROR" app.log

# コンテキスト表示
grep -A 5 "Exception" error.log   # マッチ後5行
grep -B 5 "Exception" error.log   # マッチ前5行
grep -C 5 "Exception" error.log   # 前後5行

# 拡張正規表現を使用
grep -E "^(ERROR|WARN)" app.log
grep -E "[0-9]{3}\.[0-9]{3}\.[0-9]{3}\.[0-9]{3}" access.log  # IPアドレス

# ワード境界
grep -w "log" file.txt

# 複数パターン
grep -e "ERROR" -e "CRITICAL" app.log

# バイナリファイルから検索
grep -a "pattern" binary-file

# 色付きでハイライト
grep --color=always "ERROR" app.log | less -R

# パイプと組み合わせた実用例
ps aux | grep nginx | grep -v grep
cat /etc/passwd | grep -E "^root|^www-data"
```

### sed：ストリームエディタ

`sed` はテキストの変換・置換に特化したツールだ。

```bash
# 基本的な置換（最初にマッチした箇所のみ）
sed 's/old/new/' file.txt

# 全ての箇所を置換（gフラグ）
sed 's/old/new/g' file.txt

# ファイルを直接書き換える（-i フラグ）
sed -i 's/localhost/production.example.com/g' config.py

# バックアップを作成しながら書き換え
sed -i.bak 's/debug=true/debug=false/g' config.ini

# 大文字小文字を区別しない置換
sed 's/error/ERROR/gi' app.log

# 特定の行に対して操作
sed '5s/old/new/' file.txt          # 5行目のみ
sed '2,10s/old/new/g' file.txt      # 2〜10行目

# 特定のパターンを含む行に対して操作
sed '/pattern/s/old/new/g' file.txt

# 行を削除
sed '/^#/d' config.conf             # コメント行を削除
sed '/^$/d' file.txt                # 空行を削除
sed '1d' file.txt                   # 1行目を削除
sed '1,5d' file.txt                 # 1〜5行目を削除

# 行の挿入と追加
sed '3i\新しい行' file.txt           # 3行目の前に挿入
sed '3a\新しい行' file.txt           # 3行目の後に追加

# 特定の行を表示
sed -n '5p' file.txt                # 5行目のみ表示
sed -n '5,10p' file.txt             # 5〜10行目を表示

# 区切り文字を変更（URLの置換に便利）
sed 's|http://old.com|https://new.com|g' urls.txt

# 複数の操作を一度に
sed -e 's/foo/bar/g' -e 's/baz/qux/g' file.txt

# スクリプトファイルを使用
sed -f substitutions.sed file.txt

# 実用例：設定ファイルのコメントを除去して表示
sed -e '/^#/d' -e '/^$/d' /etc/nginx/nginx.conf

# 実用例：CSVの特定列を変換
echo "2024-01-15,user,login" | sed 's/,/ | /g'
# 2024-01-15 | user | login
```

### awk：パターンスキャンとテキスト処理

`awk` はフィールド（列）ベースのテキスト処理に特化した言語だ。

```bash
# 基本構造：パターン { アクション }

# 特定のフィールドを抽出（デフォルト区切り：空白）
awk '{print $1}' file.txt           # 1列目
awk '{print $1, $3}' file.txt       # 1列目と3列目
awk '{print NR, $0}' file.txt       # 行番号付きで全体を表示

# 区切り文字を指定（-F オプション）
awk -F: '{print $1}' /etc/passwd    # ユーザー名一覧
awk -F, '{print $2}' data.csv       # CSVの2列目
awk -F'\t' '{print $3}' data.tsv    # TSVの3列目

# 条件でフィルタリング
awk '$3 > 100' data.txt             # 3列目が100より大きい行
awk '/ERROR/ {print}' app.log       # ERRORを含む行

# 計算
awk '{sum += $1} END {print sum}' numbers.txt    # 合計
awk '{sum += $1; count++} END {print sum/count}' numbers.txt  # 平均

# BEGIN と END ブロック
awk 'BEGIN {print "ヘッダー"} {print $0} END {print "フッター"}' file.txt

# 変数の使用
awk '{count[$1]++} END {for (key in count) print key, count[key]}' access.log

# 実用例：nginxアクセスログ分析
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10
# 上位10IPアドレスのアクセス数

# 実用例：プロセスリストからメモリ使用量を合計
ps aux | awk '{sum += $6} END {print sum/1024 " MB"}'

# 実用例：CSVから特定条件の行を抽出して整形
awk -F, '$4 > 1000 {printf "%-20s %10.2f\n", $1, $4}' sales.csv

# 実用例：ログから特定時間帯のエラーを集計
awk '/2024-01-15 1[0-9]:/ && /ERROR/ {count++} END {print count " errors"}' app.log

# フィールド数が異なる行を処理
awk 'NF > 3 {print NR": "$0}' file.txt  # フィールドが3個超の行

# 複数ファイルを処理
awk 'FNR==1 {print FILENAME} {total++} END {print total " lines total"}' *.log
```

### cut・sort・uniq・tr：テキスト処理の便利コマンド

```bash
# cut：列の抽出
cut -d: -f1 /etc/passwd             # コロン区切りの1列目
cut -d, -f2,4 data.csv              # CSV の2列目と4列目
cut -c1-10 file.txt                 # 各行の1〜10文字目
cut -c10- file.txt                  # 10文字目以降

# sort：ソート
sort file.txt                       # アルファベット順
sort -r file.txt                    # 逆順
sort -n numbers.txt                 # 数値順
sort -rn numbers.txt                # 数値の逆順
sort -k2 data.txt                   # 2列目でソート
sort -t: -k3 -n /etc/passwd         # コロン区切りの3列目で数値ソート
sort -u file.txt                    # 重複を除去してソート
sort -k1,1 -k2,2n data.txt          # 1列目でソート後、2列目で数値ソート

# uniq：重複行の処理（sortの後に使うことが多い）
sort file.txt | uniq                # 重複を除去
sort file.txt | uniq -c             # 各行の出現回数を表示
sort file.txt | uniq -d             # 重複している行のみ表示
sort file.txt | uniq -u             # 重複していない行のみ表示

# 実用例：最も多いHTTPステータスコードを集計
awk '{print $9}' access.log | sort | uniq -c | sort -rn
# 出力例：
#   5234 200
#    432 404
#     89 500

# tr：文字変換・削除
echo "HELLO WORLD" | tr 'A-Z' 'a-z'    # 大文字→小文字
echo "hello world" | tr 'a-z' 'A-Z'    # 小文字→大文字
echo "a:b:c" | tr ':' ','              # 区切り文字変換
echo "hello   world" | tr -s ' '       # 連続スペースを1つに
echo "Hello World" | tr -d 'aeiou'     # 母音を削除
echo "line1\nline2" | tr '\n' ' '      # 改行をスペースに変換

# paste：ファイルを列として結合
paste file1.txt file2.txt              # タブ区切りで結合
paste -d, file1.txt file2.txt          # カンマ区切りで結合

# wc：行数・単語数・文字数をカウント
wc file.txt                            # 行数・単語数・文字数
wc -l file.txt                         # 行数のみ
wc -w file.txt                         # 単語数のみ
wc -c file.txt                         # バイト数のみ
find . -name "*.py" | wc -l            # Pythonファイルの数
```

---

## 4. プロセス管理：ps・top・htop・kill・jobs

### ps：プロセス一覧の確認

```bash
# 現在のシェルのプロセスを表示
ps

# すべてのプロセスを表示（BSD形式）
ps aux

# すべてのプロセスを表示（Unix形式）
ps -ef

# 特定のプロセスを検索
ps aux | grep nginx

# プロセスをツリー形式で表示
ps auxf
pstree

# 特定ユーザーのプロセスを表示
ps -u www-data

# 特定のプロセスIDを指定
ps -p 1234

# メモリ使用量でソート
ps aux --sort=-%mem | head -10

# CPU使用量でソート
ps aux --sort=-%cpu | head -10

# カスタムフォーマットで表示
ps -eo pid,ppid,user,stat,start,time,cmd | head -20
```

### top・htop：リアルタイムプロセス監視

```bash
# top の起動
top

# top の主要ショートカット
# q     : 終了
# k     : プロセスをkill（PIDを入力）
# r     : renice（優先度変更）
# M     : メモリ使用量でソート
# P     : CPU使用量でソート
# 1     : CPUコアを個別に表示
# u     : 特定ユーザーでフィルタ
# d     : 更新間隔を変更

# バッチモード（スクリプトからの使用）
top -b -n 1 | head -20

# htop（より使いやすいtopの代替）
sudo apt install htop
htop

# htop の主要ショートカット
# F3    : 検索
# F4    : フィルタ
# F5    : ツリービュー
# F6    : ソート
# F9    : kill
# F10   : 終了

# glances（さらに高機能な監視ツール）
pip install glances
glances
```

### kill：プロセスへのシグナル送信

```bash
# プロセスを正常終了（SIGTERM = 15）
kill 1234
kill -15 1234
kill -SIGTERM 1234

# プロセスを強制終了（SIGKILL = 9）
kill -9 1234
kill -SIGKILL 1234

# プロセス名で終了
pkill nginx
pkill -9 firefox

# パターンマッチでkill
pkill -f "python.*worker"

# シグナルを確認
kill -l

# ユーザーのすべてのプロセスにシグナル送信
pkill -u username

# 特定のプロセスグループにシグナル送信
kill -9 -1234  # マイナス記号でプロセスグループ指定

# HUP シグナル（設定を再読み込み）
kill -HUP $(cat /var/run/nginx.pid)
kill -1 $(pgrep nginx)

# 全nginxプロセスを安全に終了
killall nginx
killall -s SIGTERM nginx
```

### jobs・bg・fg：バックグラウンドジョブ管理

```bash
# コマンドをバックグラウンドで実行
long-command &

# 実行中のジョブ一覧
jobs
jobs -l   # PIDも表示

# フォアグラウンドに戻す
fg
fg %1     # ジョブ番号1を指定

# バックグラウンドに送る（Ctrl+Z で一時停止後）
# Ctrl+Z でサスペンド
bg
bg %1

# バックグラウンドで起動、シェル終了後も継続
nohup ./server.sh &

# nohup と出力リダイレクト
nohup ./long-script.sh > output.log 2>&1 &

# disown でジョブをシェルから切り離す
./server.sh &
disown %1

# setsid でプロセスグループを分離
setsid ./server.sh &
```

### プロセスの優先度管理

```bash
# nice でCPU優先度を下げて起動（-20〜19、デフォルト0、高い数値ほど低優先度）
nice -n 10 ./heavy-process.sh

# renice で実行中のプロセスの優先度を変更
renice -n 5 -p 1234
renice -n -5 -p 1234   # 高優先度に変更（rootのみ）

# ionice でI/O優先度を設定
ionice -c 3 ./backup.sh    # アイドルクラス（最低I/O優先度）
ionice -c 2 -n 4 ./app     # ベストエフォートクラス

# /proc でプロセス詳細情報を確認
cat /proc/1234/status
cat /proc/1234/cmdline | tr '\0' ' '
ls /proc/1234/fd   # オープンしているファイルディスクリプタ

# lsof でオープンファイルを確認
lsof -p 1234              # 特定プロセスのオープンファイル
lsof /var/log/app.log     # 特定ファイルをオープンしているプロセス
lsof -i :8080             # 特定ポートを使用しているプロセス
lsof -u www-data          # 特定ユーザーのオープンファイル
```

---

## 5. ネットワークコマンド：curl・wget・netstat・ss・nmap

### curl：HTTP クライアントの最強ツール

```bash
# GETリクエスト
curl https://api.example.com/users

# レスポンスヘッダーも表示
curl -i https://api.example.com/users

# ヘッダーのみ表示
curl -I https://api.example.com/users

# POSTリクエスト（JSON）
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token123" \
  -d '{"name": "John", "email": "john@example.com"}'

# POSTリクエスト（フォームデータ）
curl -X POST https://api.example.com/login \
  -F "username=admin" \
  -F "password=secret"

# ファイルアップロード
curl -X POST https://api.example.com/upload \
  -F "file=@/path/to/file.pdf"

# 認証
curl -u username:password https://api.example.com/protected
curl -H "Authorization: Bearer TOKEN" https://api.example.com/api

# ファイルにダウンロード
curl -o output.html https://example.com
curl -O https://example.com/file.tar.gz   # 元のファイル名を保存

# リダイレクトに従う
curl -L https://short.url/abc

# タイムアウト設定
curl --connect-timeout 10 --max-time 30 https://api.example.com

# リトライ設定
curl --retry 3 --retry-delay 5 https://api.example.com

# 詳細デバッグ情報
curl -v https://api.example.com
curl --trace debug.log https://api.example.com

# プロキシを使用
curl -x http://proxy.example.com:8080 https://api.example.com

# SSL証明書検証を無効化（開発環境のみ）
curl -k https://self-signed.example.com

# クッキーの送受信
curl -c cookies.txt -b cookies.txt https://www.example.com/login

# 進捗バー表示でダウンロード
curl -# -O https://example.com/large-file.zip

# HTTPバージョンを指定
curl --http2 https://api.example.com

# 実用例：APIヘルスチェックスクリプト
response=$(curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health)
if [ "$response" = "200" ]; then
  echo "API is healthy"
else
  echo "API returned $response"
fi
```

### wget：ファイルダウンロードツール

```bash
# 基本的なダウンロード
wget https://example.com/file.tar.gz

# バックグラウンドでダウンロード
wget -b https://example.com/large-file.iso

# 再開可能なダウンロード（中断からの再開）
wget -c https://example.com/large-file.iso

# 再帰的にサイトをダウンロード
wget -r -l 2 https://docs.example.com/

# 認証が必要なサイト
wget --user=username --password=secret https://secure.example.com/file

# カスタムヘッダー
wget --header="Authorization: Bearer TOKEN" https://api.example.com/data

# タイムアウト設定
wget --timeout=30 --tries=3 https://example.com/file

# ミラーリング
wget --mirror --convert-links https://example.com/
```

### ss・netstat：ネットワーク接続の確認

```bash
# ss（netstatの現代的な代替）
# すべてのポートを表示
ss -tunap

# LISTENしているポートのみ
ss -tlnp

# 確立済み接続のみ
ss -tn state established

# 特定ポートの接続を確認
ss -tnp sport = :8080

# UDPソケット
ss -unp

# オプション説明：
# -t: TCP
# -u: UDP
# -n: 名前解決しない（数値表示）
# -a: すべての状態
# -p: プロセス情報を表示
# -l: LISTENのみ

# netstat（古いが広く使われている）
netstat -tunap
netstat -tlnp
netstat -rn    # ルーティングテーブル

# ポートが使用中か確認
ss -tlnp | grep :3000
lsof -i :3000

# TCP接続状態の集計
ss -tn | awk '{print $1}' | sort | uniq -c
```

### nmap・その他ネットワークツール

```bash
# nmap：ネットワークスキャン（自分のシステムのみに使用すること）
# ホストが生きているか確認
nmap -sn 192.168.1.0/24

# 開いているポートを確認
nmap -sT localhost
nmap -p 80,443,8080 example.com

# サービスバージョン検出
nmap -sV -p 1-1000 localhost

# OSの検出
sudo nmap -O localhost

# ping：疎通確認
ping google.com
ping -c 5 google.com    # 5回送信
ping -i 0.5 -c 10 192.168.1.1  # 0.5秒間隔で10回

# traceroute：経路確認
traceroute google.com
tracepath google.com

# dig：DNS確認
dig example.com
dig example.com A        # Aレコード
dig example.com MX       # MXレコード
dig +short example.com   # IPアドレスのみ
dig @8.8.8.8 example.com  # 特定DNSサーバーに問い合わせ

# nslookup
nslookup example.com
nslookup -type=MX example.com

# ip：ネットワークインターフェース管理
ip addr show
ip route show
ip -s link show

# iptraf-ng, nethogs：ネットワーク使用量監視
nethogs eth0   # プロセスごとの通信量
iftop          # ホストごとの通信量
```

---

## 6. パーミッションとユーザー管理

### ファイルパーミッションの基本

Linuxのパーミッションは3つの主体（オーナー・グループ・その他）それぞれに読み取り・書き込み・実行の権限を設定する。

```bash
# パーミッションの確認
ls -l file.txt
# -rw-r--r-- 1 user group 1234 Jan 15 10:00 file.txt
# ↑ [ファイルタイプ][オーナー][グループ][その他] [リンク数] [オーナー] [グループ] [サイズ] [日時] [ファイル名]

# パーミッションの読み方
# r = 読み取り (4)
# w = 書き込み (2)
# x = 実行 (1)
# - = なし (0)

# chmod：パーミッション変更（数値形式）
chmod 755 script.sh       # rwxr-xr-x
chmod 644 file.txt        # rw-r--r--
chmod 600 secret.key      # rw-------
chmod 777 public/         # rwxrwxrwx（非推奨）

# chmod：パーミッション変更（シンボリック形式）
chmod u+x script.sh       # オーナーに実行権限を追加
chmod g-w file.txt        # グループの書き込み権限を削除
chmod o= file.txt         # その他の全権限を削除
chmod a+r file.txt        # 全員に読み取り権限を追加
chmod u=rwx,g=rx,o=r script.sh  # 完全指定

# 再帰的に変更
chmod -R 755 public/
chmod -R 644 config/      # ディレクトリも644になるので注意

# ディレクトリとファイルで別々に設定
find /var/www -type f -exec chmod 644 {} \;
find /var/www -type d -exec chmod 755 {} \;

# chown：オーナー変更
chown user file.txt
chown user:group file.txt
chown -R www-data:www-data /var/www/html/
chown :group file.txt     # グループのみ変更

# chgrp：グループ変更
chgrp developers project/
chgrp -R webteam /var/www/

# 特殊パーミッション
# SUID (Set User ID): 実行時にファイルオーナーの権限で実行
chmod u+s /usr/bin/passwd  # 例
ls -l /usr/bin/passwd
# -rwsr-xr-x ... (sはSUID)

# SGID (Set Group ID): 実行時にグループ権限で実行
chmod g+s /shared/dir

# Sticky Bit: /tmpのような共有ディレクトリで自分のファイルのみ削除可能
chmod +t /tmp
ls -la /
# drwxrwxrwt ... tmp (tはsticky bit)

# umask：デフォルトパーミッションのマスク設定
umask          # 現在の設定を確認（通常022）
umask 022      # 新規ファイル=644, 新規ディレクトリ=755
umask 027      # 新規ファイル=640, 新規ディレクトリ=750
```

### ユーザーとグループの管理

```bash
# ユーザー情報の確認
id                         # 現在のユーザー情報
id username                # 特定ユーザーの情報
whoami                     # 現在のユーザー名
who                        # ログイン中のユーザー一覧
w                          # ログイン中ユーザーと作業内容
last                       # 最近のログイン履歴

# ユーザーの作成・管理（root権限が必要）
sudo useradd -m -s /bin/bash newuser   # ホームディレクトリ付きでユーザー作成
sudo useradd -m -G sudo,www-data newuser  # グループも指定
sudo usermod -aG sudo existinguser    # 既存ユーザーをsudoグループに追加
sudo passwd newuser                    # パスワードを設定
sudo userdel -r olduser               # ユーザーとホームディレクトリを削除

# グループの管理
sudo groupadd developers
sudo groupmod -n newname oldname
sudo groupdel developers
groups username                        # ユーザーが属するグループ一覧

# su・sudo
su username                           # 別ユーザーに切り替え
su -                                  # rootに切り替え
sudo command                          # root権限でコマンドを実行
sudo -i                               # root権限のシェルを起動
sudo -u username command              # 特定ユーザーでコマンドを実行

# /etc/sudoers の編集（必ずvisudoを使う）
sudo visudo
# ユーザーに特定コマンドのみ許可
# username ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx

# ACL（アクセス制御リスト）：より細かいパーミッション制御
getfacl file.txt                      # ACLを確認
setfacl -m u:user:rwx file.txt        # ユーザーにrwx権限を付与
setfacl -m g:group:rx directory/      # グループにrx権限を付与
setfacl -x u:user file.txt            # ユーザーのACLを削除
setfacl -b file.txt                   # すべてのACLを削除
```

---

## 7. Bashスクリプト基礎：変数・条件分岐・ループ・関数

### スクリプトの基本構造

```bash
#!/bin/bash
# シバン行：どのインタプリタで実行するかを指定

# スクリプトを安全にするオプション
set -euo pipefail
# -e: エラーが発生したら即座に終了
# -u: 未定義変数を参照したらエラー
# -o pipefail: パイプラインの一部が失敗したら全体を失敗扱い

# IFS（Internal Field Separator）の設定
IFS=$'\n\t'

echo "スクリプト開始: $(date)"
```

### 変数

```bash
#!/bin/bash

# 変数の代入（= の前後にスペースは不可）
name="World"
count=42
pi=3.14

# 変数の参照
echo "Hello, $name!"
echo "Count: ${count}"

# 波括弧を使う理由（文字列の結合）
prefix="file"
echo "${prefix}_001.txt"   # file_001.txt（正しい）
echo "$prefix_001.txt"     # 変数$prefix_001を参照してしまう

# コマンド置換
current_date=$(date +%Y-%m-%d)
file_count=$(ls | wc -l)
uptime_info=$(uptime)

# 算術演算
a=10
b=3
echo $((a + b))    # 13
echo $((a - b))    # 7
echo $((a * b))    # 30
echo $((a / b))    # 3（整数除算）
echo $((a % b))    # 1（余り）
echo $((a ** b))   # 1000（べき乗）

# 算術演算（let コマンド）
let "result = a * b + 5"
echo $result   # 35

# 環境変数
export DATABASE_URL="postgresql://localhost/mydb"
echo $PATH
echo $HOME
echo $USER
echo $SHELL
echo $PWD
echo $$       # 現在のプロセスID
echo $?       # 直前のコマンドの終了コード（0=成功）
echo $!       # 直前のバックグラウンドプロセスのPID
echo $0       # スクリプトの名前
echo $1       # 第1引数
echo $@       # すべての引数（配列として）
echo $*       # すべての引数（1つの文字列として）
echo $#       # 引数の数

# readonly（読み取り専用変数）
readonly MAX_RETRY=3
readonly BASE_DIR="/opt/app"

# 変数のデフォルト値
echo "${name:-デフォルト値}"    # nameが未設定ならデフォルト値を使用
echo "${name:=デフォルト値}"    # nameが未設定ならデフォルト値をセット
echo "${name:+代替値}"          # nameが設定済みなら代替値を使用
echo "${name:?エラーメッセージ}" # nameが未設定ならエラーを出力して終了

# 文字列操作
str="Hello, World!"
echo ${#str}              # 文字列長: 13
echo ${str:0:5}           # 部分文字列: Hello
echo ${str:7}             # 7文字目以降: World!
echo ${str/World/Linux}   # 最初の置換: Hello, Linux!
echo ${str//l/L}          # 全置換: HeLLo, WorLd!
echo ${str,,}             # 小文字変換: hello, world!
echo ${str^^}             # 大文字変換: HELLO, WORLD!

# パス操作
path="/home/user/documents/file.txt"
echo ${path##*/}          # ベース名: file.txt
echo ${path%/*}           # ディレクトリ名: /home/user/documents
echo ${path##*.}          # 拡張子: txt
echo ${path%.*}           # 拡張子なし: /home/user/documents/file
```

### 条件分岐

```bash
#!/bin/bash

# if 文の基本
if [ condition ]; then
  echo "条件が真"
elif [ other_condition ]; then
  echo "別の条件が真"
else
  echo "いずれも偽"
fi

# 数値の比較
a=10
b=20
if [ $a -eq $b ]; then echo "等しい"; fi       # equal
if [ $a -ne $b ]; then echo "等しくない"; fi   # not equal
if [ $a -lt $b ]; then echo "より小さい"; fi   # less than
if [ $a -le $b ]; then echo "以下"; fi         # less or equal
if [ $a -gt $b ]; then echo "より大きい"; fi   # greater than
if [ $a -ge $b ]; then echo "以上"; fi         # greater or equal

# 文字列の比較
name="Alice"
if [ "$name" = "Alice" ]; then echo "一致"; fi
if [ "$name" != "Bob" ]; then echo "不一致"; fi
if [ -z "$name" ]; then echo "空文字列"; fi    # zero length
if [ -n "$name" ]; then echo "空でない"; fi    # non-zero length

# ファイルのテスト
file="/etc/hosts"
if [ -e "$file" ]; then echo "存在する"; fi
if [ -f "$file" ]; then echo "通常ファイル"; fi
if [ -d "$file" ]; then echo "ディレクトリ"; fi
if [ -r "$file" ]; then echo "読み取り可能"; fi
if [ -w "$file" ]; then echo "書き込み可能"; fi
if [ -x "$file" ]; then echo "実行可能"; fi
if [ -s "$file" ]; then echo "空でない（サイズ>0）"; fi
if [ -L "$file" ]; then echo "シンボリックリンク"; fi

# 論理演算子
if [ $a -gt 5 ] && [ $a -lt 15 ]; then echo "5〜15の間"; fi
if [ $a -eq 10 ] || [ $b -eq 10 ]; then echo "どちらかが10"; fi
if ! [ -e "$file" ]; then echo "ファイルが存在しない"; fi

# [[ ]] (bash 拡張テスト)：より強力
if [[ "$name" == A* ]]; then echo "Aで始まる"; fi   # グロブパターン
if [[ "$name" =~ ^[A-Z] ]]; then echo "大文字で始まる"; fi  # 正規表現
if [[ -f "$file" && -r "$file" ]]; then echo "読み取り可能なファイル"; fi

# case 文
os_type="linux"
case $os_type in
  linux)
    echo "Linux"
    ;;
  darwin|macos)
    echo "macOS"
    ;;
  windows|win*)
    echo "Windows"
    ;;
  *)
    echo "不明なOS: $os_type"
    ;;
esac

# 三項演算子的な書き方
[ $a -gt 0 ] && echo "正の数" || echo "0以下"
```

### ループ

```bash
#!/bin/bash

# for ループ（リスト）
for fruit in apple banana cherry; do
  echo "果物: $fruit"
done

# for ループ（数値範囲）
for i in {1..10}; do
  echo "番号: $i"
done

# for ループ（ステップ付き）
for i in {0..100..10}; do
  echo "$i"
done

# for ループ（C言語スタイル）
for ((i=0; i<10; i++)); do
  echo "i = $i"
done

# for ループ（ファイル一覧）
for file in *.txt; do
  echo "処理中: $file"
  wc -l "$file"
done

# コマンド出力をループ
for line in $(cat hostnames.txt); do
  ping -c 1 "$line" > /dev/null && echo "$line: UP" || echo "$line: DOWN"
done

# find と for の組み合わせ
while IFS= read -r file; do
  echo "ファイル: $file"
done < <(find . -name "*.log" -mtime +7)

# while ループ
count=0
while [ $count -lt 5 ]; do
  echo "カウント: $count"
  ((count++))
done

# ファイルを1行ずつ読み込む
while IFS= read -r line; do
  echo "行: $line"
done < input.txt

# until ループ（whileの逆：条件が偽の間実行）
count=0
until [ $count -ge 5 ]; do
  echo "カウント: $count"
  ((count++))
done

# break と continue
for i in {1..10}; do
  if [ $i -eq 5 ]; then
    continue    # 5をスキップ
  fi
  if [ $i -eq 8 ]; then
    break       # 8で終了
  fi
  echo $i
done

# select ループ（メニュー作成）
PS3="選択してください: "
select option in "開始" "停止" "再起動" "終了"; do
  case $option in
    "開始") echo "サービス開始"; break ;;
    "停止") echo "サービス停止"; break ;;
    "再起動") echo "サービス再起動"; break ;;
    "終了") echo "終了"; break ;;
    *) echo "無効な選択" ;;
  esac
done
```

### 関数

```bash
#!/bin/bash

# 関数の定義
function greet() {
  local name="$1"    # local で関数スコープの変数
  echo "こんにちは、${name}さん！"
}

# 省略形（function キーワードなし）
say_goodbye() {
  echo "さようなら、$1さん！"
}

# 関数の呼び出し
greet "田中"
say_goodbye "鈴木"

# 戻り値（0〜255の整数のみ）
is_even() {
  local num=$1
  if [ $((num % 2)) -eq 0 ]; then
    return 0    # 成功（偶数）
  else
    return 1    # 失敗（奇数）
  fi
}

if is_even 4; then
  echo "偶数"
else
  echo "奇数"
fi

# 文字列を返す（echoを使用）
get_timestamp() {
  echo "$(date +%Y%m%d_%H%M%S)"
}
timestamp=$(get_timestamp)
echo "タイムスタンプ: $timestamp"

# 複数の値を返す（グローバル変数を使用）
parse_version() {
  local version="$1"
  MAJOR=$(echo "$version" | cut -d. -f1)
  MINOR=$(echo "$version" | cut -d. -f2)
  PATCH=$(echo "$version" | cut -d. -f3)
}

parse_version "2.14.3"
echo "メジャー: $MAJOR, マイナー: $MINOR, パッチ: $PATCH"

# 実用的な関数例：ログ関数
LOG_FILE="/var/log/myapp.log"
log() {
  local level="$1"
  local message="$2"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log "INFO" "アプリケーション起動"
log "ERROR" "データベース接続失敗"

# 実用的な関数例：エラーチェック
check_dependency() {
  local cmd="$1"
  if ! command -v "$cmd" &> /dev/null; then
    echo "エラー: $cmd がインストールされていません" >&2
    return 1
  fi
  return 0
}

check_dependency "docker" || exit 1
check_dependency "kubectl" || exit 1
echo "すべての依存関係が満たされています"
```

---

## 8. 高度なBashスクリプト：配列・正規表現・エラーハンドリング

### 配列

```bash
#!/bin/bash

# 配列の定義
fruits=("apple" "banana" "cherry" "date")
numbers=(1 2 3 4 5)

# 要素へのアクセス
echo ${fruits[0]}      # apple
echo ${fruits[2]}      # cherry
echo ${fruits[-1]}     # date（最後の要素）

# 全要素を表示
echo ${fruits[@]}
echo ${fruits[*]}

# 配列の長さ
echo ${#fruits[@]}     # 4

# 配列の一部を取得（スライス）
echo ${fruits[@]:1:2}  # banana cherry（インデックス1から2個）

# 要素の追加
fruits+=("elderberry")
fruits[5]="fig"

# 配列の削除
unset fruits[2]        # cherry を削除
unset fruits           # 配列全体を削除

# 配列のループ
for fruit in "${fruits[@]}"; do
  echo "果物: $fruit"
done

# インデックス付きでループ
for i in "${!fruits[@]}"; do
  echo "$i: ${fruits[$i]}"
done

# 連想配列（Bash 4.0+）
declare -A user_info
user_info["name"]="田中太郎"
user_info["email"]="tanaka@example.com"
user_info["role"]="admin"

echo ${user_info["name"]}
echo ${!user_info[@]}   # すべてのキーを表示
echo ${user_info[@]}    # すべての値を表示

for key in "${!user_info[@]}"; do
  echo "$key: ${user_info[$key]}"
done

# ファイルを配列に読み込む
readarray -t lines < /etc/hosts
for line in "${lines[@]}"; do
  echo "$line"
done

# コマンド出力を配列に変換
mapfile -t files < <(find . -name "*.sh" -type f)
echo "シェルスクリプトの数: ${#files[@]}"
```

### 正規表現と文字列処理

```bash
#!/bin/bash

# bash の正規表現マッチング（=~ 演算子）
email="user@example.com"
if [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
  echo "有効なメールアドレス"
fi

# マッチングのキャプチャ
version="v2.14.3-beta"
if [[ "$version" =~ v([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
  echo "フルマッチ: ${BASH_REMATCH[0]}"
  echo "メジャー: ${BASH_REMATCH[1]}"
  echo "マイナー: ${BASH_REMATCH[2]}"
  echo "パッチ: ${BASH_REMATCH[3]}"
fi

# IPアドレスの検証
validate_ip() {
  local ip="$1"
  local pattern='^([0-9]{1,3}\.){3}[0-9]{1,3}$'
  if [[ "$ip" =~ $pattern ]]; then
    # 各オクテットを確認
    IFS='.' read -ra octets <<< "$ip"
    for octet in "${octets[@]}"; do
      if [ "$octet" -gt 255 ]; then
        return 1
      fi
    done
    return 0
  fi
  return 1
}

if validate_ip "192.168.1.100"; then
  echo "有効なIPアドレス"
fi

# パラメータ展開による高度な文字列処理
filename="document_2024-01-15_v2.pdf"

# プレフィックスを削除
echo "${filename#document_}"    # 2024-01-15_v2.pdf

# サフィックスを削除
echo "${filename%.pdf}"         # document_2024-01-15_v2

# 最長一致でプレフィックスを削除
path="/usr/local/bin/python3"
echo "${path##*/}"              # python3

# 最長一致でサフィックスを削除
echo "${path%/*}"               # /usr/local/bin

# 大文字小文字変換（Bash 4.0+）
str="Hello World"
echo "${str,,}"                 # hello world（全て小文字）
echo "${str^^}"                 # HELLO WORLD（全て大文字）
echo "${str,}"                  # hELLO WORLD（最初の文字のみ小文字）

# 文字列の置換
str="the cat sat on the mat"
echo "${str/cat/dog}"           # the dog sat on the mat（最初のみ）
echo "${str//at/ot}"            # the cot sot on the mot（全て）
echo "${str/#the/a}"            # a cat sat on the mat（先頭のみ）
echo "${str/%mat/rug}"          # the cat sat on the rug（末尾のみ）
```

### エラーハンドリングとデバッグ

```bash
#!/bin/bash
set -euo pipefail

# エラートラップ
cleanup() {
  local exit_code=$?
  echo "スクリプト終了: 終了コード=$exit_code" >&2
  # 一時ファイルの削除など
  rm -f /tmp/myapp_*.tmp
}
trap cleanup EXIT

# エラーハンドリング関数
error_handler() {
  local exit_code=$?
  local line_number=$1
  echo "エラー発生: 行 $line_number, 終了コード $exit_code" >&2
  exit $exit_code
}
trap 'error_handler $LINENO' ERR

# シグナルハンドリング
sigterm_handler() {
  echo "SIGTERMを受信。正常終了中..." >&2
  # クリーンアップ処理
  exit 0
}
trap sigterm_handler SIGTERM SIGINT

# エラー処理の実用例
backup_database() {
  local db_name="$1"
  local backup_dir="$2"
  local backup_file="${backup_dir}/${db_name}_$(date +%Y%m%d_%H%M%S).sql"

  echo "バックアップ開始: $db_name"

  # エラーが発生しても継続する場合
  if ! pg_dump "$db_name" > "$backup_file" 2>/dev/null; then
    echo "警告: $db_name のバックアップに失敗しました" >&2
    return 1
  fi

  echo "バックアップ完了: $backup_file"
  return 0
}

# retry 関数
retry() {
  local max_attempts="$1"
  local delay="$2"
  shift 2
  local cmd="$@"

  local attempt=1
  while [ $attempt -le $max_attempts ]; do
    echo "試行 $attempt/$max_attempts: $cmd"
    if eval "$cmd"; then
      return 0
    fi
    echo "失敗。${delay}秒後にリトライ..." >&2
    sleep "$delay"
    ((attempt++))
  done

  echo "エラー: $max_attempts 回の試行が全て失敗しました" >&2
  return 1
}

retry 3 5 curl -f https://api.example.com/health

# デバッグモード
debug_mode=false
if [ "${DEBUG:-false}" = "true" ]; then
  set -x  # コマンドを実行前にエコー
  debug_mode=true
fi

log_debug() {
  if [ "$debug_mode" = "true" ]; then
    echo "[DEBUG] $*" >&2
  fi
}

log_debug "設定を読み込み中..."

# 実用的なスクリプトテンプレート
SCRIPT_NAME=$(basename "$0")
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
LOG_FILE="/var/log/${SCRIPT_NAME%.sh}.log"

usage() {
  cat <<EOF
使用方法: $SCRIPT_NAME [オプション] <引数>

オプション:
  -h, --help      このヘルプを表示
  -v, --verbose   詳細出力
  -d, --dry-run   実際には実行しない
  -c, --config    設定ファイルのパス（デフォルト: /etc/myapp/config.conf）

例:
  $SCRIPT_NAME -v input.txt
  $SCRIPT_NAME --config /etc/myapp/prod.conf data/
EOF
}

# 引数のパース
VERBOSE=false
DRY_RUN=false
CONFIG="/etc/myapp/config.conf"

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)    usage; exit 0 ;;
    -v|--verbose) VERBOSE=true ;;
    -d|--dry-run) DRY_RUN=true ;;
    -c|--config)  CONFIG="$2"; shift ;;
    --)           shift; break ;;
    -*)           echo "不明なオプション: $1" >&2; usage; exit 1 ;;
    *)            break ;;
  esac
  shift
done

if [ $# -eq 0 ]; then
  echo "エラー: 引数が必要です" >&2
  usage
  exit 1
fi
```

---

## 9. Zsh・Oh My Zsh・Starship設定

### Zshの基本設定

Zshはbashより多機能で、現代的な開発者に人気のシェルだ。

```bash
# Zshのインストール
sudo apt install zsh      # Debian/Ubuntu
brew install zsh          # macOS

# デフォルトシェルをzshに変更
chsh -s $(which zsh)

# .zshrc の基本設定
cat > ~/.zshrc << 'EOF'
# 履歴の設定
HISTFILE=~/.zsh_history
HISTSIZE=50000
SAVEHIST=50000
setopt HIST_IGNORE_ALL_DUPS    # 重複履歴を保存しない
setopt HIST_SAVE_NO_DUPS       # 重複を保存しない
setopt HIST_REDUCE_BLANKS      # 余分なスペースを削除
setopt SHARE_HISTORY           # 複数のzshで履歴を共有
setopt HIST_VERIFY             # 履歴展開後に確認

# ディレクトリの移動
setopt AUTO_CD                 # ディレクトリ名のみで移動
setopt AUTO_PUSHD              # cd で自動的にスタックに積む
setopt PUSHD_IGNORE_DUPS       # 重複ディレクトリをスタックに積まない

# 補完設定
autoload -Uz compinit && compinit
zstyle ':completion:*' menu select
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'  # 大文字小文字を区別しない

# グロブ展開
setopt EXTENDED_GLOB
setopt GLOB_DOTS               # ドットファイルもグロブ対象

# エイリアス
alias ls='ls --color=auto'
alias ll='ls -alFh'
alias la='ls -A'
alias grep='grep --color=auto'
alias df='df -h'
alias du='du -h'
alias free='free -h'
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias g='git'
alias d='docker'
alias k='kubectl'

# git エイリアス
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline --graph --decorate'
EOF
```

### Oh My Zsh のインストールと設定

```bash
# Oh My Zsh インストール
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# .zshrc でテーマとプラグインを設定
# ZSH_THEME="agnoster"   # 人気テーマ
# ZSH_THEME="powerlevel10k/powerlevel10k"  # 最も人気

# Powerlevel10k テーマのインストール
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git \
  ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k

# 便利なプラグインのインストール
# zsh-autosuggestions（コマンド補完）
git clone https://github.com/zsh-users/zsh-autosuggestions \
  ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

# zsh-syntax-highlighting（シンタックスハイライト）
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git \
  ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

# .zshrc でプラグインを有効化
# plugins=(
#   git
#   docker
#   kubectl
#   node
#   npm
#   python
#   sudo
#   zsh-autosuggestions
#   zsh-syntax-highlighting
#   z  # ディレクトリジャンプ
#   fzf  # ファジーファインダー
# )
```

### Starship：クロスシェルプロンプト

```bash
# インストール
curl -sS https://starship.rs/install.sh | sh

# .zshrc に追加
echo 'eval "$(starship init zsh)"' >> ~/.zshrc

# Starship の設定（~/.config/starship.toml）
cat > ~/.config/starship.toml << 'EOF'
# 全体的なフォーマット
format = """
[╭─](bold green)$username$hostname$directory$git_branch$git_status$nodejs$python$rust$golang
[╰─](bold green)$character"""

# ユーザー名
[username]
show_always = false
format = "[$user]($style) "
style_user = "bold yellow"

# ホスト名
[hostname]
ssh_only = true
format = "[@$hostname]($style) "
style = "bold blue"

# ディレクトリ
[directory]
truncation_length = 4
truncate_to_repo = false
format = "[$path]($style)[$read_only]($read_only_style) "
style = "bold cyan"

# Git ブランチ
[git_branch]
format = "[$symbol$branch]($style) "
style = "bold purple"

# Git ステータス
[git_status]
format = '([\[$all_status$ahead_behind\]]($style) )'
style = "bold red"

# Node.js
[nodejs]
format = "[$symbol($version)]($style) "
style = "bold green"
EOF
```

### fzf：ファジーファインダー

```bash
# インストール
git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
~/.fzf/install

# または
sudo apt install fzf   # Debian/Ubuntu
brew install fzf       # macOS

# .zshrc/.bashrc に設定を追加
cat >> ~/.zshrc << 'EOF'
# fzf の設定
export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow --exclude .git'
export FZF_DEFAULT_OPTS='--height 40% --layout=reverse --border'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
export FZF_ALT_C_COMMAND='fd --type d --hidden --follow --exclude .git'

# Ctrl+T: ファイル検索
# Ctrl+R: 履歴検索
# Alt+C: ディレクトリ移動

# fzf を使ったカスタム関数

# インタラクティブなファイル編集
fe() {
  local file
  file=$(fzf --query="$1" --multi --select-1 --exit-0)
  [ -n "$file" ] && ${EDITOR:-vim} "$file"
}

# インタラクティブなプロセスkill
fkill() {
  local pid
  pid=$(ps aux | fzf --multi | awk '{print $2}')
  [ -n "$pid" ] && echo "$pid" | xargs kill -${1:-9}
}

# gitブランチをfzfで選択してチェックアウト
fbr() {
  local branch
  branch=$(git branch --all | grep -v HEAD | fzf)
  git checkout "${branch#remotes/origin/}"
}
EOF
```

---

## 10. tmux：ターミナルマルチプレクサ

### tmuxの基本

tmuxはターミナルのウィンドウ分割・セッション管理を可能にするツールだ。SSHセッションを保持し続けるためにも不可欠だ。

```bash
# インストール
sudo apt install tmux   # Debian/Ubuntu
brew install tmux       # macOS

# セッションの基本操作
tmux                              # 新規セッション開始
tmux new-session -s mywork        # 名前付きセッション開始
tmux ls                           # セッション一覧
tmux attach -t mywork             # セッションに接続
tmux kill-session -t mywork       # セッションを削除
tmux kill-server                  # すべてのセッションを削除

# デタッチ（セッションを維持したままターミナルから切り離す）
# Ctrl+b, d でデタッチ

# キーバインド（プレフィックス: Ctrl+b）
# Ctrl+b, c      : 新規ウィンドウ
# Ctrl+b, ,      : ウィンドウ名を変更
# Ctrl+b, n      : 次のウィンドウ
# Ctrl+b, p      : 前のウィンドウ
# Ctrl+b, 0-9    : ウィンドウ番号で移動
# Ctrl+b, %      : 垂直分割（左右）
# Ctrl+b, "      : 水平分割（上下）
# Ctrl+b, 矢印   : ペインの移動
# Ctrl+b, z      : ペインのズーム（フォーカス）
# Ctrl+b, x      : ペインを閉じる
# Ctrl+b, [      : コピーモード開始
# Ctrl+b, ]      : ペースト
# Ctrl+b, ?      : キーバインド一覧
# Ctrl+b, :      : コマンドモード
```

### tmuxの設定ファイル

```bash
cat > ~/.tmux.conf << 'EOF'
# プレフィックスをCtrl+bからCtrl+aに変更（screenユーザー向け）
# unbind C-b
# set -g prefix C-a
# bind C-a send-prefix

# マウス操作を有効化
set -g mouse on

# ウィンドウ番号を1から開始
set -g base-index 1
setw -g pane-base-index 1

# ウィンドウを閉じたら番号を詰める
set -g renumber-windows on

# 256色サポート
set -g default-terminal "screen-256color"
set -ag terminal-overrides ",xterm-256color:RGB"

# ヒストリーを増やす
set -g history-limit 50000

# ペイン分割のキーバインドを直感的に
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
unbind '"'
unbind %

# ペイン移動をvimスタイルに
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# ペインのリサイズ
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5

# 設定の再読み込み
bind r source-file ~/.tmux.conf \; display-message "設定を再読み込みしました"

# コピーモードをviスタイルに
setw -g mode-keys vi
bind -T copy-mode-vi v send-keys -X begin-selection
bind -T copy-mode-vi y send-keys -X copy-pipe-and-cancel "xclip -in -selection clipboard"

# ステータスバーのカスタマイズ
set -g status-position bottom
set -g status-bg colour234
set -g status-fg colour137
set -g status-left ''
set -g status-right '#[fg=colour233,bg=colour241,bold] %d/%m #[fg=colour233,bg=colour245,bold] %H:%M:%S '
set -g status-right-length 50
set -g status-left-length 20

setw -g window-status-current-format ' #I#[fg=colour250]:#[fg=colour255]#W#[fg=colour50]#F '
setw -g window-status-format ' #I#[fg=colour237]:#[fg=colour250]#W#[fg=colour244]#F '
EOF
```

### tmuxスクリプトで開発環境を自動構築

```bash
#!/bin/bash
# dev-session.sh - 開発環境を一発で立ち上げるスクリプト

SESSION="dev"
PROJECT_DIR="$HOME/projects/myapp"

# セッションが既に存在するか確認
tmux has-session -t $SESSION 2>/dev/null
if [ $? -eq 0 ]; then
  tmux attach-session -t $SESSION
  exit 0
fi

# 新規セッションを作成
tmux new-session -d -s $SESSION -c $PROJECT_DIR

# ウィンドウ1: エディタ
tmux rename-window -t $SESSION:1 'editor'
tmux send-keys -t $SESSION:1 "vim ." Enter

# ウィンドウ2: サーバー（3ペイン）
tmux new-window -t $SESSION:2 -n 'server' -c $PROJECT_DIR
tmux split-window -h -t $SESSION:2 -c $PROJECT_DIR
tmux split-window -v -t $SESSION:2.2 -c $PROJECT_DIR

# 各ペインでコマンドを実行
tmux send-keys -t $SESSION:2.1 "npm run dev" Enter
tmux send-keys -t $SESSION:2.2 "npm run test:watch" Enter
tmux send-keys -t $SESSION:2.3 "tail -f logs/app.log" Enter

# ウィンドウ3: データベース
tmux new-window -t $SESSION:3 -n 'db' -c $PROJECT_DIR
tmux send-keys -t $SESSION:3 "psql -d myapp" Enter

# ウィンドウ4: git操作用
tmux new-window -t $SESSION:4 -n 'git' -c $PROJECT_DIR

# 最初のウィンドウを選択して接続
tmux select-window -t $SESSION:1
tmux attach-session -t $SESSION
```

---

## 11. systemd：サービス管理

### systemctl の基本操作

```bash
# サービスの状態確認
systemctl status nginx
systemctl status postgresql

# サービスの起動・停止・再起動
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx    # 設定を再読み込み（停止なし）

# 自動起動の設定
sudo systemctl enable nginx    # OS起動時に自動起動
sudo systemctl disable nginx   # 自動起動を無効化
sudo systemctl enable --now nginx  # 有効化して即座に起動

# すべてのサービスを一覧表示
systemctl list-units --type=service
systemctl list-units --type=service --state=running
systemctl list-units --type=service --state=failed

# 失敗したサービスを確認
systemctl --failed

# サービスの依存関係を確認
systemctl list-dependencies nginx

# システム全体の状態
systemctl status  # 全体的なシステム状態
```

### カスタムサービスユニットの作成

```bash
# /etc/systemd/system/myapp.service
cat > /etc/systemd/system/myapp.service << 'EOF'
[Unit]
Description=My Application Server
Documentation=https://example.com/docs
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/myapp
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/etc/myapp/environment
ExecStart=/usr/bin/node /opt/myapp/server.js
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

# セキュリティ設定
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/myapp /var/log/myapp

# リソース制限
LimitNOFILE=65536
MemoryLimit=512M
CPUQuota=200%

[Install]
WantedBy=multi-user.target
EOF

# サービスを有効化して起動
sudo systemctl daemon-reload
sudo systemctl enable myapp
sudo systemctl start myapp
sudo systemctl status myapp
```

### journalctl：ログの確認

```bash
# サービスのログを確認
journalctl -u nginx
journalctl -u nginx -n 100              # 末尾100行
journalctl -u nginx -f                  # リアルタイムで追跡
journalctl -u nginx --since "1 hour ago"
journalctl -u nginx --since "2024-01-15" --until "2024-01-16"

# エラーのみ表示
journalctl -u nginx -p err
journalctl -p err..crit                 # error〜criticalのログ

# JSON形式で出力
journalctl -u nginx -o json-pretty | head -50

# ディスク使用量の確認と削除
journalctl --disk-usage
sudo journalctl --vacuum-time=30d       # 30日以上前のログを削除
sudo journalctl --vacuum-size=1G        # 合計サイズを1GBに制限

# システム全体のログ
journalctl --since today
journalctl -k                           # カーネルメッセージのみ
journalctl -b                           # 現在のブート以降のログ
journalctl -b -1                        # 前回のブートのログ
```

---

## 12. cron：タスクスケジューリング

### crontabの構文と設定

```bash
# crontabを編集
crontab -e

# crontabの一覧表示
crontab -l

# 別ユーザーのcrontabを確認・編集（root権限が必要）
crontab -u www-data -l
crontab -u www-data -e

# crontabの構文
# * * * * * command
# | | | | |
# | | | | +-- 曜日 (0-7, 0と7は日曜日)
# | | | +---- 月 (1-12)
# | | +------ 日 (1-31)
# | +-------- 時 (0-23)
# +---------- 分 (0-59)

# 例
# 毎分実行
* * * * * /path/to/script.sh

# 毎時0分に実行
0 * * * * /path/to/script.sh

# 毎日午前3時に実行
0 3 * * * /path/to/backup.sh

# 毎週月曜日の午前2時に実行
0 2 * * 1 /path/to/weekly-task.sh

# 毎月1日の午前0時に実行
0 0 1 * * /path/to/monthly-task.sh

# 毎15分に実行
*/15 * * * * /path/to/check.sh

# 平日（月〜金）の9時〜18時の毎時に実行
0 9-18 * * 1-5 /path/to/working-hours-task.sh

# 特定の時間に複数回実行
0 8,12,18 * * * /path/to/task.sh

# 出力をログファイルに記録
0 3 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1

# 特殊な書き方
@reboot /path/to/startup.sh     # 起動時に実行
@hourly /path/to/hourly.sh      # 毎時実行
@daily /path/to/daily.sh        # 毎日実行
@weekly /path/to/weekly.sh      # 毎週実行
@monthly /path/to/monthly.sh    # 毎月実行
@yearly /path/to/yearly.sh      # 毎年実行
```

### systemd timer：cronの現代的な代替

```bash
# /etc/systemd/system/backup.timer
cat > /etc/systemd/system/backup.timer << 'EOF'
[Unit]
Description=毎日バックアップを実行
Requires=backup.service

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 03:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
EOF

# /etc/systemd/system/backup.service
cat > /etc/systemd/system/backup.service << 'EOF'
[Unit]
Description=バックアップサービス

[Service]
Type=oneshot
User=backup
ExecStart=/usr/local/bin/backup.sh
StandardOutput=journal
StandardError=journal
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now backup.timer

# タイマーの状態確認
systemctl list-timers
systemctl status backup.timer
```

---

## 13. Vim/Neovim：基礎から実用まで

### Vimの基本操作

Vimはすべてのシステム管理者と開発者が押さえるべきエディタだ。サーバー上での設定ファイル編集に不可欠だ。

```
# Vimのモード
# ノーマルモード    : デフォルトのモード（移動・操作）
# インサートモード  : テキスト入力
# ビジュアルモード  : テキスト選択
# コマンドラインモード: ファイル保存・終了など

# インサートモードへの移行
i   カーソル位置の前に挿入
a   カーソル位置の後に追記
o   現在行の下に新しい行を挿入
O   現在行の上に新しい行を挿入
I   行頭に挿入
A   行末に追記

# ノーマルモードに戻る
Esc
Ctrl+c

# 保存と終了
:w          保存
:q          終了（変更がある場合は失敗）
:wq または :x   保存して終了
:q!         変更を破棄して終了
:w filename   別名で保存
ZZ          保存して終了
ZQ          保存せずに終了
```

### 移動コマンド

```
# 基本移動
h j k l     左下上右（矢印キーと同じ）
w           次の単語の先頭
b           前の単語の先頭
e           次の単語の末尾
0           行頭
^           行の最初の非空白文字
$           行末
gg          ファイルの先頭
G           ファイルの末尾
:50         50行目に移動
50G         50行目に移動
Ctrl+d      半ページ下
Ctrl+u      半ページ上
Ctrl+f      1ページ下
Ctrl+b      1ページ上
%           対応する括弧・括弧に移動
*           カーソル位置の単語を前方検索
#           カーソル位置の単語を後方検索
```

### 編集コマンド

```
# 削除
x           カーソル位置の1文字削除
X           カーソル位置の前の1文字削除
dd          現在行を削除
5dd         5行削除
dw          単語を削除
d$          カーソルから行末まで削除
d^          カーソルから行頭まで削除
D           カーソルから行末まで削除

# コピーとペースト
yy          現在行をコピー（yank）
5yy         5行コピー
yw          単語をコピー
y$          カーソルから行末までコピー
p           カーソルの後にペースト
P           カーソルの前にペースト

# 変更
cw          単語を変更（削除してインサートモード）
cc          現在行を変更
C           カーソルから行末まで変更
r           1文字置換（インサートモードに入らない）
R           上書きモード

# アンドゥとリドゥ
u           アンドゥ
Ctrl+r      リドゥ
.           直前の操作を繰り返す

# 検索と置換
/pattern    前方検索
?pattern    後方検索
n           次のマッチへ
N           前のマッチへ
:s/old/new/         現在行の最初の置換
:s/old/new/g        現在行の全置換
:%s/old/new/g       ファイル全体の置換
:%s/old/new/gc      確認しながら全置換
:10,20s/old/new/g   10〜20行目の置換
```

### vimrcの設定

```vim
" ~/.vimrc
set nocompatible               " Vi互換モードを無効化
filetype plugin indent on      " ファイルタイプ検出を有効化
syntax on                      " シンタックスハイライト

" 基本設定
set number                     " 行番号を表示
set relativenumber             " 相対行番号を表示
set ruler                      " カーソル位置を表示
set cursorline                 " 現在行をハイライト
set showcmd                    " コマンドを表示
set showmatch                  " 対応する括弧をハイライト
set incsearch                  " インクリメンタルサーチ
set hlsearch                   " 検索結果をハイライト
set ignorecase                 " 大文字小文字を区別しない
set smartcase                  " 大文字が含まれる場合は区別する
set wildmenu                   " コマンド補完を強化

" インデント設定
set autoindent                 " 自動インデント
set smartindent                " スマートインデント
set expandtab                  " タブをスペースに変換
set tabstop=2                  " タブ幅2
set shiftwidth=2               " インデント幅2
set softtabstop=2

" 表示設定
set wrap                       " 折り返し表示
set scrolloff=8                " スクロール時の余白
set signcolumn=yes             " サインカラムを常に表示

" エンコーディング
set encoding=utf-8
set fileencoding=utf-8

" バックアップとスワップ
set nobackup
set nowritebackup
set noswapfile
set undofile
set undodir=~/.vim/undodir

" カラースキーム
colorscheme desert

" キーマッピング
let mapleader = " "            " リーダーキーをスペースに

" ノーマルモード
nnoremap <leader>w :w<CR>
nnoremap <leader>q :q<CR>
nnoremap <Esc><Esc> :nohlsearch<CR>

" ウィンドウ移動
nnoremap <C-h> <C-w>h
nnoremap <C-j> <C-w>j
nnoremap <C-k> <C-w>k
nnoremap <C-l> <C-w>l
```

---

## 14. セキュリティ：SSH・ファイアウォール・sudo

### SSHの設定と運用

```bash
# SSH鍵ペアの生成
ssh-keygen -t ed25519 -C "your_email@example.com"
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 公開鍵をリモートサーバーにコピー
ssh-copy-id user@remote-server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@remote-server

# 手動でauthorized_keysに追加
cat ~/.ssh/id_ed25519.pub | ssh user@remote-server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# SSH設定ファイル（~/.ssh/config）
cat > ~/.ssh/config << 'EOF'
# デフォルト設定
Host *
  ServerAliveInterval 60
  ServerAliveCountMax 3
  AddKeysToAgent yes
  IdentityFile ~/.ssh/id_ed25519

# 本番サーバー
Host production
  HostName 192.168.1.100
  User admin
  Port 22
  IdentityFile ~/.ssh/production_key

# 踏み台サーバー経由の接続
Host internal-server
  HostName 10.0.0.50
  User appuser
  ProxyJump bastion.example.com

# ポートフォワーディング設定
Host tunnel-db
  HostName db.internal
  User dbuser
  LocalForward 5432 localhost:5432
  ProxyJump bastion
EOF

# SSH接続
ssh production                                  # 設定名で接続
ssh -p 2222 user@server.com                     # カスタムポート
ssh -i ~/.ssh/special_key user@server.com       # 鍵を指定
ssh -L 8080:localhost:80 user@server.com        # ローカルポートフォワード
ssh -R 8080:localhost:80 user@server.com        # リモートポートフォワード
ssh -D 1080 user@server.com                     # SOCKSプロキシ
ssh -N user@server.com                          # コマンド実行なし（トンネルのみ）

# /etc/ssh/sshd_config のセキュリティ設定
sudo vi /etc/ssh/sshd_config
# 以下の設定を推奨:
# Port 2222                          # デフォルトポートを変更
# PermitRootLogin no                 # rootログインを禁止
# PasswordAuthentication no         # パスワード認証を禁止（鍵認証のみ）
# PubkeyAuthentication yes          # 公開鍵認証を有効化
# AuthorizedKeysFile .ssh/authorized_keys
# MaxAuthTries 3                     # 認証試行回数の制限
# LoginGraceTime 30                  # タイムアウトを30秒に
# AllowUsers admin deploy            # 許可するユーザーを制限
# X11Forwarding no                   # X11転送を無効化

# 設定を確認して再起動
sudo sshd -t && sudo systemctl reload sshd

# ssh-agent の使用
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
ssh-add -l   # 追加済みの鍵を確認

# SSHのログを確認
sudo journalctl -u sshd -f
sudo tail -f /var/log/auth.log
```

### ufwとiptables：ファイアウォール設定

```bash
# ufw（Uncomplicated Firewall）：Ubuntu/Debianで推奨
sudo apt install ufw

# 基本設定
sudo ufw default deny incoming   # 受信をデフォルトで拒否
sudo ufw default allow outgoing  # 送信をデフォルトで許可

# ルールの追加
sudo ufw allow ssh               # SSH (22番ポート)
sudo ufw allow 2222/tcp          # カスタムSSHポート
sudo ufw allow http              # HTTP (80番)
sudo ufw allow https             # HTTPS (443番)
sudo ufw allow 8080/tcp          # カスタムポート
sudo ufw allow from 192.168.1.0/24  # 特定のIPレンジから許可
sudo ufw allow from 192.168.1.100 to any port 5432  # 特定IPからPostgres
sudo ufw deny 3306               # MySQLを拒否

# ufwを有効化
sudo ufw enable
sudo ufw status verbose

# ルールを削除
sudo ufw delete allow 8080/tcp
sudo ufw delete 3              # ルール番号で削除

# ロギング
sudo ufw logging on
sudo ufw logging medium

# iptables：より細かい制御が必要な場合
# ルール一覧の確認
sudo iptables -L -n -v
sudo iptables -L INPUT -n -v

# 基本的なルール追加
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -i lo -j ACCEPT          # ループバックを許可
sudo iptables -P INPUT DROP                      # それ以外を拒否

# fail2ban：ブルートフォース対策
sudo apt install fail2ban

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@example.com
action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-req-limit]
enabled = true
filter = nginx-req-limit
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

sudo systemctl enable --now fail2ban
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### セキュリティ監査ツール

```bash
# rkhunter：ルートキット検出
sudo apt install rkhunter
sudo rkhunter --update
sudo rkhunter --check

# lynis：セキュリティ監査
sudo apt install lynis
sudo lynis audit system

# auditd：システム監査
sudo apt install auditd
sudo systemctl enable --now auditd

# 重要ファイルの監視
sudo auditctl -w /etc/passwd -p wa -k passwd-changes
sudo auditctl -w /etc/shadow -p wa -k shadow-changes
sudo auditctl -w /etc/sudoers -p wa -k sudoers-changes

# 監査ログの確認
sudo ausearch -k passwd-changes
sudo aureport --auth          # 認証の概要
sudo aureport --login         # ログインの概要

# chkrootkit
sudo apt install chkrootkit
sudo chkrootkit

# openssl で証明書の確認
# SSL証明書の有効期限を確認
echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null \
  | openssl x509 -noout -dates

# 証明書の詳細を確認
openssl x509 -in certificate.crt -text -noout

# 自己署名証明書の作成（開発環境用）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout server.key -out server.crt \
  -subj "/C=JP/ST=Tokyo/L=Shinjuku/O=MyCompany/CN=localhost"
```

---

## まとめと次のステップ

本記事では、Linuxコマンドラインのほぼ全域をカバーした。重要なポイントを振り返る。

**ファイル操作の基本** から始まり、`ls`・`cp`・`mv`・`rm` などのコマンドはLinux操作の土台だ。パスの概念とディレクトリ構造を正確に理解することが、すべての操作の前提となる。

**テキスト処理の三種の神器** である `grep`・`sed`・`awk` はデータ変換と検索に不可欠で、それぞれの強みを理解して使い分けることが大切だ。`rg`（ripgrep）のような現代的なツールも積極的に活用すると作業効率が大幅に上がる。

**シェルスクリプト** は反復作業を自動化するためのツールだ。`set -euo pipefail` を冒頭に書くだけでスクリプトの信頼性が大幅に向上する。エラーハンドリングと `trap` の活用も実務では必須だ。

**tmux** はサーバー作業の生産性を10倍にする。セッションを保持しながらネットワーク切断に対応できる。

**systemd** の理解はLinuxサーバー管理の中核だ。カスタムサービスの作成から `journalctl` によるログ確認まで、日常的に使うスキルだ。

**セキュリティ** においては、SSHの鍵認証設定、ファイアウォールの適切な設定、fail2banによるブルートフォース対策が最低限の標準だ。

### 学習の次のステップ

1. 毎日の作業を積極的にコマンドラインで行い、GUIツールへの依存を減らす
2. 自分のよく使う操作をシェル関数やスクリプトとして `.zshrc`/`.bashrc` に蓄積する
3. 自分のdotfiles をGitHubで管理し、どのマシンでも同じ環境を再現できるようにする
4. `man` コマンドとドキュメントを読む習慣をつける
5. 実際のサーバーで小さなプロジェクトをデプロイして運用経験を積む

---

## 開発ツールを活用しよう

コマンドライン開発をさらに効率化するには、ツールの整理と一元管理が重要だ。[DevToolBox](https://usedevtools.com) は開発者向けのツールボックスプラットフォームで、よく使うユーティリティをブラウザからすぐに使える。JSON整形、Base64エンコード/デコード、正規表現テスト、Unix時間変換など、ターミナル作業と並行して使うと便利なツールが揃っている。ブックマークしておくと日々の開発作業でサッと参照できる。

コマンドラインは習得に時間がかかるが、一度体得すると開発効率が劇的に向上する。毎日少しずつ新しいコマンドや技法を試して、自分のシェル環境を育てていこう。

