---
title: 'Linux/Macコマンドチートシート — 開発者が毎日使う50コマンド'
description: 'ファイル操作、テキスト処理、ネットワーク、プロセス管理など開発者必須のLinux/Macコマンド50個を実例付きで解説。コピペですぐ使えるチートシート。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 'Feb 05 2026'
tags: ['Linux', 'インフラ']
---
# Linux/Macコマンドチートシート — 開発者が毎日使う50コマンド

開発者にとって、**ターミナル（コマンドライン）の習熟度**は生産性に直結します。GUIより圧倒的に速く、自動化も容易です。

この記事では、Linux/Macで毎日使う**50の必須コマンド**を、実例とともに解説します。初心者から中級者まで、即戦力になる内容です。

## 目次
1. [ファイル・ディレクトリ操作](#ファイルディレクトリ操作)
2. [ファイル内容の表示・検索](#ファイル内容の表示検索)
3. [テキスト処理](#テキスト処理)
4. [権限・所有者管理](#権限所有者管理)
5. [プロセス管理](#プロセス管理)
6. [ネットワーク](#ネットワーク)
7. [圧縮・解凍](#圧縮解凍)
8. [システム情報](#システム情報)
9. [Git関連](#git関連)
10. [便利な組み合わせ技](#便利な組み合わせ技)

## ファイル・ディレクトリ操作

### 1. `ls` — ファイル一覧表示

```bash
# 基本
ls

# 詳細表示（権限、所有者、サイズ、更新日時）
ls -l

# 隠しファイルも表示
ls -la

# 人間が読みやすいサイズ表示
ls -lh

# 更新日時順にソート
ls -lt

# サイズ順にソート
ls -lS

# 再帰的に表示
ls -R
```

**よく使う組み合わせ**: `ls -lhat` （全ファイルを人間が読みやすい形式で、更新日時順に）

### 2. `cd` — ディレクトリ移動

```bash
# ホームディレクトリへ
cd ~
cd

# 親ディレクトリへ
cd ..

# 2つ上の親へ
cd ../..

# 前回いたディレクトリへ戻る
cd -

# 絶対パス指定
cd /var/log

# 相対パス指定
cd ./subdirectory
```

### 3. `mkdir` — ディレクトリ作成

```bash
# 基本
mkdir new_directory

# 親ディレクトリも同時作成
mkdir -p project/src/components

# 複数ディレクトリ一度に作成
mkdir dir1 dir2 dir3

# 権限指定して作成
mkdir -m 755 public_dir
```

### 4. `touch` — ファイル作成・更新日時変更

```bash
# 空ファイル作成
touch newfile.txt

# 複数ファイル作成
touch file1.txt file2.txt file3.txt

# タイムスタンプだけ更新
touch existing_file.txt
```

### 5. `cp` — ファイル・ディレクトリコピー

```bash
# ファイルコピー
cp source.txt destination.txt

# ディレクトリごとコピー（再帰的）
cp -r source_dir/ destination_dir/

# 上書き確認
cp -i source.txt destination.txt

# 元の属性（タイムスタンプ等）を保持
cp -p source.txt destination.txt

# バックアップ作成
cp file.txt file.txt.bak
```

### 6. `mv` — 移動・リネーム

```bash
# ファイル移動
mv file.txt /path/to/destination/

# リネーム
mv oldname.txt newname.txt

# 複数ファイルを一度に移動
mv file1.txt file2.txt file3.txt /destination/

# 上書き確認
mv -i source.txt destination.txt
```

### 7. `rm` — 削除

```bash
# ファイル削除
rm file.txt

# 削除確認
rm -i file.txt

# ディレクトリごと削除（再帰的）
rm -r directory/

# 強制削除（確認なし） ⚠️ 危険
rm -rf directory/

# 複数ファイル削除
rm file1.txt file2.txt

# ワイルドカード使用
rm *.log
```

**注意**: `rm -rf /`（ルートディレクトリ削除）は絶対にやってはいけません。

### 8. `find` — ファイル検索

```bash
# 名前で検索
find . -name "*.js"

# 大文字小文字を区別しない
find . -iname "readme.md"

# ディレクトリのみ検索
find . -type d

# ファイルのみ検索
find . -type f

# サイズで検索（100MB以上）
find . -size +100M

# 更新日時で検索（7日以内）
find . -mtime -7

# 検索結果に対してコマンド実行
find . -name "*.tmp" -exec rm {} \;

# 空のファイルを検索
find . -empty
```

## ファイル内容の表示・検索

### 9. `cat` — ファイル内容表示

```bash
# 基本
cat file.txt

# 複数ファイル連結
cat file1.txt file2.txt

# 行番号付き表示
cat -n file.txt

# ファイル作成（Ctrl+Dで終了）
cat > newfile.txt
```

### 10. `less` / `more` — ページャー

```bash
# ページ送りで表示
less file.txt

# 検索（/で検索、nで次へ、Nで前へ）
# qで終了

# ログファイル監視
less +F /var/log/system.log
```

### 11. `head` / `tail` — 先頭・末尾表示

```bash
# 先頭10行（デフォルト）
head file.txt

# 先頭20行
head -n 20 file.txt

# 末尾10行
tail file.txt

# 末尾20行
tail -n 20 file.txt

# リアルタイム監視（ログ監視に便利）
tail -f /var/log/app.log

# 複数ファイル同時監視
tail -f file1.log file2.log
```

### 12. `grep` — テキスト検索

```bash
# 基本検索
grep "error" app.log

# 大文字小文字を区別しない
grep -i "error" app.log

# 再帰的に検索
grep -r "TODO" ./src/

# 行番号付き
grep -n "error" app.log

# マッチした行の前後も表示
grep -C 3 "error" app.log  # 前後3行
grep -A 3 "error" app.log  # 後3行
grep -B 3 "error" app.log  # 前3行

# マッチしない行を表示
grep -v "debug" app.log

# 正規表現使用
grep -E "error|warning" app.log

# ファイル名のみ表示
grep -l "error" *.log

# カウント
grep -c "error" app.log
```

### 13. `wc` — 文字数・行数カウント

```bash
# 行数、単語数、バイト数
wc file.txt

# 行数のみ
wc -l file.txt

# 単語数のみ
wc -w file.txt

# 文字数のみ
wc -m file.txt

# 複数ファイルの合計
wc -l *.txt
```

## テキスト処理

### 14. `sed` — ストリームエディタ

```bash
# 文字列置換（最初のマッチのみ）
sed 's/old/new/' file.txt

# 文字列置換（全て）
sed 's/old/new/g' file.txt

# ファイル内容を直接編集
sed -i '' 's/old/new/g' file.txt  # Mac
sed -i 's/old/new/g' file.txt     # Linux

# 特定行を削除
sed '3d' file.txt  # 3行目削除
sed '1,5d' file.txt  # 1-5行目削除

# 特定行のみ表示
sed -n '10,20p' file.txt
```

### 15. `awk` — テキスト処理言語

```bash
# 特定列のみ表示
awk '{print $1}' file.txt  # 1列目
awk '{print $1, $3}' file.txt  # 1列目と3列目

# CSVの2列目を合計
awk -F',' '{sum += $2} END {print sum}' data.csv

# 条件付き表示
awk '$3 > 100' data.txt  # 3列目が100より大きい行

# カスタム区切り文字
awk -F':' '{print $1}' /etc/passwd
```

### 16. `sort` — ソート

```bash
# 昇順ソート
sort file.txt

# 降順ソート
sort -r file.txt

# 数値としてソート
sort -n numbers.txt

# ユニーク化
sort -u file.txt

# 2列目でソート
sort -k2 file.txt
```

### 17. `uniq` — 重複除去

```bash
# 重複行を除去（事前にsortが必要）
sort file.txt | uniq

# 重複行のみ表示
sort file.txt | uniq -d

# 重複回数をカウント
sort file.txt | uniq -c
```

### 18. `cut` — 列抽出

```bash
# 1列目を抽出（タブ区切り）
cut -f1 file.txt

# 1-3列目を抽出
cut -f1-3 file.txt

# カンマ区切り
cut -d',' -f2 data.csv

# 文字位置で抽出（1-10文字目）
cut -c1-10 file.txt
```

## 権限・所有者管理

### 19. `chmod` — 権限変更

```bash
# 実行権限付与
chmod +x script.sh

# 所有者に読み書き、その他に読み取りのみ
chmod 644 file.txt

# ディレクトリとファイルに実行権限
chmod 755 directory/

# 再帰的に権限変更
chmod -R 755 directory/

# シンボリックモード
chmod u+x script.sh  # 所有者に実行権限
chmod g-w file.txt   # グループから書き込み権限削除
chmod o=r file.txt   # その他は読み取りのみ
```

**権限の数字表記**:
- `4` = 読み取り (r)
- `2` = 書き込み (w)
- `1` = 実行 (x)
- `7 = 4+2+1` = 全権限
- `6 = 4+2` = 読み書き
- `5 = 4+1` = 読み取り・実行

詳しくは[chmod計算機](/tools/chmod-calculator)で確認できます。

### 20. `chown` — 所有者変更

```bash
# 所有者変更
sudo chown user file.txt

# 所有者とグループ変更
sudo chown user:group file.txt

# 再帰的に変更
sudo chown -R user:group directory/
```

## プロセス管理

### 21. `ps` — プロセス一覧

```bash
# 自分のプロセス
ps

# 全プロセス
ps aux

# 特定プロセス検索
ps aux | grep nginx

# ツリー表示
ps auxf
```

### 22. `top` / `htop` — リソース監視

```bash
# リアルタイムプロセス監視
top

# より見やすいhtop（要インストール）
htop

# topの便利なキー
# M: メモリ使用量順
# P: CPU使用量順
# k: プロセスKill
# q: 終了
```

### 23. `kill` — プロセス終了

```bash
# プロセスID指定
kill 1234

# 強制終了
kill -9 1234

# 名前で終了
pkill process_name

# 全関連プロセス終了
killall process_name
```

### 24. バックグラウンド実行

```bash
# バックグラウンドで実行
command &

# フォアグラウンドに戻す
fg

# バックグラウンドに送る（Ctrl+Z後）
bg

# ジョブ一覧
jobs

# nohup（ログアウトしても継続）
nohup long_running_command &
```

## ネットワーク

### 25. `curl` — HTTP通信

```bash
# GETリクエスト
curl https://api.example.com/users

# レスポンスヘッダー表示
curl -I https://example.com

# POSTリクエスト
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"太郎"}' \
  https://api.example.com/users

# ファイルダウンロード
curl -O https://example.com/file.zip

# リダイレクト追従
curl -L https://example.com

# Basic認証
curl -u username:password https://api.example.com

# Cookie保存
curl -c cookies.txt https://example.com
```

### 26. `wget` — ファイルダウンロード

```bash
# ファイルダウンロード
wget https://example.com/file.zip

# 別名で保存
wget -O newname.zip https://example.com/file.zip

# 再帰的ダウンロード
wget -r https://example.com/

# バックグラウンド
wget -b https://example.com/large-file.zip
```

### 27. `ping` — 疎通確認

```bash
# 基本
ping google.com

# 回数指定
ping -c 4 google.com

# タイムアウト設定
ping -W 1 google.com
```

### 28. `netstat` / `ss` — ネットワーク接続

```bash
# リスニングポート一覧
netstat -tuln

# ssコマンド（新しい）
ss -tuln

# 特定ポートを使用しているプロセス
lsof -i :3000
```

### 29. `ssh` — リモート接続

```bash
# 基本接続
ssh user@hostname

# ポート指定
ssh -p 2222 user@hostname

# 秘密鍵指定
ssh -i ~/.ssh/id_rsa user@hostname

# ローカルポートフォワーディング
ssh -L 8080:localhost:80 user@remote-host

# リモートコマンド実行
ssh user@hostname 'ls -la'
```

### 30. `scp` — ファイル転送

```bash
# ローカル → リモート
scp file.txt user@remote:/path/

# リモート → ローカル
scp user@remote:/path/file.txt ./

# ディレクトリごと
scp -r directory/ user@remote:/path/

# ポート指定
scp -P 2222 file.txt user@remote:/path/
```

## 圧縮・解凍

### 31. `tar` — アーカイブ

```bash
# 圧縮（.tar.gz作成）
tar -czf archive.tar.gz directory/

# 解凍
tar -xzf archive.tar.gz

# 内容確認（解凍せず）
tar -tzf archive.tar.gz

# .tar.bz2（高圧縮率）
tar -cjf archive.tar.bz2 directory/
tar -xjf archive.tar.bz2

# よく使うオプション
# c: 作成
# x: 解凍
# z: gzip
# j: bzip2
# f: ファイル指定
# v: 詳細表示
```

### 32. `zip` / `unzip`

```bash
# ZIP作成
zip archive.zip file1.txt file2.txt

# ディレクトリごと
zip -r archive.zip directory/

# 解凍
unzip archive.zip

# 特定ディレクトリに解凍
unzip archive.zip -d /path/to/destination/

# 内容確認
unzip -l archive.zip
```

### 33. `gzip` / `gunzip`

```bash
# 圧縮
gzip file.txt  # file.txt.gzが作成され、元ファイルは削除

# 元ファイルを残す
gzip -k file.txt

# 解凍
gunzip file.txt.gz
```

## システム情報

### 34. `df` — ディスク使用量

```bash
# 基本
df

# 人間が読みやすい形式
df -h

# 特定ファイルシステム
df -h /dev/sda1
```

### 35. `du` — ディレクトリ使用量

```bash
# カレントディレクトリ
du -sh .

# 各サブディレクトリのサイズ
du -sh *

# 上位10個を表示
du -sh * | sort -h | tail -10

# 特定ディレクトリの詳細
du -h --max-depth=1 /var/
```

### 36. `free` — メモリ使用量

```bash
# Linux
free -h

# Mac（代替）
vm_stat
```

### 37. `uname` — システム情報

```bash
# 全情報
uname -a

# OS名
uname -s

# カーネルバージョン
uname -r

# アーキテクチャ
uname -m
```

### 38. `uptime` — 稼働時間

```bash
uptime
# 出力例: 14:23  up 5 days, 3:45, 2 users, load averages: 2.1 1.8 1.5
```

### 39. `which` — コマンドのパス

```bash
# pythonの場所
which python

# 複数
which python python3
```

### 40. `alias` — エイリアス設定

```bash
# エイリアス設定
alias ll='ls -la'
alias gs='git status'
alias ..='cd ..'

# 永続化（~/.bashrc または ~/.zshrc に追記）
echo "alias ll='ls -la'" >> ~/.zshrc
source ~/.zshrc

# エイリアス一覧
alias

# エイリアス削除
unalias ll
```

## Git関連

### 41. `git status` — 状態確認

```bash
git status

# 短縮形式
git status -s
```

### 42. `git log` — コミット履歴

```bash
# 基本
git log

# 1行表示
git log --oneline

# グラフ表示
git log --graph --oneline --all

# 特定ファイルの履歴
git log -- file.txt

# 特定期間
git log --since="2 weeks ago"

# 特定作者
git log --author="Taro"
```

### 43. `git diff` — 差分表示

```bash
# 作業ディレクトリの変更
git diff

# ステージング済みの変更
git diff --staged

# 特定ファイル
git diff file.txt

# ブランチ間
git diff main feature-branch
```

### 44. `git branch` — ブランチ操作

```bash
# ブランチ一覧
git branch

# リモートブランチも表示
git branch -a

# ブランチ作成
git branch feature-branch

# ブランチ削除
git branch -d feature-branch

# 強制削除
git branch -D feature-branch

# ブランチ名変更
git branch -m old-name new-name
```

### 45. よく使うGitコマンド組み合わせ

```bash
# 全変更をコミット
git add . && git commit -m "メッセージ" && git push

# 前回のコミットを修正
git commit --amend --no-edit

# 特定コミットを打ち消す
git revert <commit-hash>

# 未追跡ファイルを削除
git clean -fd

# リモートの変更を取得してマージ
git pull --rebase
```

## 便利な組み合わせ技

### 46. パイプ（|）を使った連携

```bash
# ログから特定エラーを抽出して行数カウント
cat app.log | grep "ERROR" | wc -l

# プロセスをメモリ使用量順にソート
ps aux | sort -k4 -r | head -10

# 特定拡張子のファイルをサイズ順に表示
find . -name "*.js" -exec ls -lh {} \; | sort -k5 -h

# アクセスログのIP別アクセス数
cat access.log | awk '{print $1}' | sort | uniq -c | sort -rn
```

### 47. xargs — 引数を渡す

```bash
# 検索結果を削除
find . -name "*.tmp" | xargs rm

# 複数ファイルに対してgrep
find . -name "*.js" | xargs grep "TODO"

# 並列実行
find . -name "*.jpg" | xargs -P 4 -I {} convert {} {}.png
```

### 48. tee — 出力を画面とファイルに同時出力

```bash
# ログファイルに保存しつつ画面にも表示
command | tee output.log

# 追記モード
command | tee -a output.log

# 複数ファイル
command | tee file1.log file2.log
```

### 49. watch — コマンドを定期実行

```bash
# 2秒ごとにディスク使用量を表示
watch -n 2 df -h

# Git statusを監視
watch -n 1 git status
```

### 50. history — コマンド履歴

```bash
# 履歴表示
history

# 最近10件
history 10

# 特定コマンド検索
history | grep git

# 番号指定で実行
!123

# 前回のコマンド再実行
!!

# 前回のコマンドの引数を使用
!$

# 履歴検索（Ctrl+R）
# Ctrl+R を押して検索ワード入力
```

## 実践シナリオ

### シナリオ1: ログ解析

```bash
# エラー件数と種類を集計
grep "ERROR" app.log | awk '{print $5}' | sort | uniq -c | sort -rn

# 特定時刻のエラーログ抽出
sed -n '/2026-02-05 10:00/,/2026-02-05 11:00/p' app.log | grep ERROR
```

### シナリオ2: ディスク容量調査

```bash
# 大きいディレクトリTOP10
du -sh */ | sort -h | tail -10

# 100MB以上のファイル検索
find / -type f -size +100M 2>/dev/null

# 古いログファイル削除（30日以上前）
find /var/log -name "*.log" -mtime +30 -delete
```

### シナリオ3: プロセストラブルシューティング

```bash
# ポート3000を使用しているプロセス特定
lsof -i :3000

# CPU使用率TOP10
ps aux | sort -k3 -r | head -10

# 特定プロセスの詳細
ps -p <PID> -o pid,ppid,cmd,%mem,%cpu
```

### シナリオ4: バッチ処理

```bash
# 画像を一括リサイズ（ImageMagick必要）
for file in *.jpg; do
  convert "$file" -resize 800x600 "resized_$file"
done

# CSVファイルを一括処理
for file in *.csv; do
  awk -F',' '{sum+=$2} END {print FILENAME, sum}' "$file"
done
```

## エイリアス・関数のおすすめ設定

```bash
# ~/.zshrc または ~/.bashrc に追記

# ショートカット
alias ll='ls -lah'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# Git
alias gs='git status'
alias gd='git diff'
alias gl='git log --oneline --graph --all'
alias gp='git push'
alias gc='git commit'

# Docker
alias dc='docker-compose'
alias dps='docker ps'
alias di='docker images'

# カスタム関数
mkcd() {
  mkdir -p "$1" && cd "$1"
}

# ディレクトリサイズTOP10
bigdir() {
  du -sh */ | sort -h | tail -10
}

# プロセスをポート番号で検索
port() {
  lsof -i :$1
}
```

## よく使うキーボードショートカット

```bash
# カーソル移動
Ctrl+A    # 行頭へ
Ctrl+E    # 行末へ
Ctrl+U    # カーソルから行頭まで削除
Ctrl+K    # カーソルから行末まで削除
Ctrl+W    # 単語削除

# 履歴
Ctrl+R    # 履歴検索
Ctrl+P    # 前のコマンド（↑と同じ）
Ctrl+N    # 次のコマンド（↓と同じ）

# プロセス制御
Ctrl+C    # 中断
Ctrl+Z    # 一時停止
Ctrl+D    # EOF（終了）

# 画面制御
Ctrl+L    # 画面クリア（clearと同じ）
```

## セキュリティ注意事項

```bash
# 危険なコマンド（実行注意）
rm -rf /          # ルートディレクトリ削除
:(){ :|:& };:     # フォーク爆弾
chmod 777 -R /    # 全ファイルの権限を777に

# パスワード等を履歴に残さない方法
# 先頭にスペースを入れる（HISTCONTROLの設定が必要）
 mysql -u root -p<password>
```

## まとめ

この50コマンドをマスターすれば、日常的な開発作業の90%をカバーできます。

**学習のコツ**:
1. `man コマンド名` でマニュアル参照
2. `コマンド名 --help` で簡易ヘルプ
3. エイリアス・関数で効率化
4. Tab補完を活用
5. 毎日少しずつ使う

**おすすめツール**:
- [DevToolBox](/tools) — Base64エンコード、JSON整形など
- [chmod計算機](/tools/chmod-calculator) — 権限の数値計算

**関連記事**:
- [Python入門完全ガイド](/blog/python-beginner-guide-2026)
- [Webセキュリティ入門](/blog/web-security-basics-2026)

ターミナルは開発者の最強の武器です。今日から使い倒しましょう。

Happy Hacking!