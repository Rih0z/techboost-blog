#!/usr/bin/env python3
"""Find duplicate article clusters in the blog."""
import os, re
from collections import defaultdict

BLOG_DIR = "/Users/kokiriho/Documents/Projects/makemoney/sites/blog/src/content/blog"

articles = {}
for f in sorted(os.listdir(BLOG_DIR)):
    if not f.endswith('.md'):
        continue
    path = os.path.join(BLOG_DIR, f)
    with open(path) as fh:
        content = fh.read()
    m = re.search(r"^title:\s*[\"'](.*?)[\"']\s*$", content, re.M)
    if not m:
        m = re.search(r"^title:\s*(.*?)\s*$", content, re.M)
    title = m.group(1) if m else ''
    lines = content.count('\n')
    articles[f] = {'title': title, 'lines': lines}

def normalize(title):
    t = title.lower()
    t = re.sub(r'20\d\d[年版]*', '', t)
    t = re.sub(r'完全ガイド|実践ガイド|入門ガイド|入門|徹底比較|新機能|移行|マイグレーション|ベストプラクティス|パターン集', '', t)
    t = re.sub(r'[：:—–\-\s]+', ' ', t).strip()
    t = re.sub(r'[\[\]「」（）\(\)\#]', '', t)
    words = t.split()[:2]
    return ' '.join(words)

groups = defaultdict(list)
for f, info in articles.items():
    key = normalize(info['title'])
    if key:
        groups[key].append((f, info['lines'], info['title']))

# Show groups with 3+ articles
for key, items in sorted(groups.items(), key=lambda x: -len(x[1])):
    if len(items) < 3:
        continue
    items_sorted = sorted(items, key=lambda x: -x[1])
    best = items_sorted[0]
    rest = items_sorted[1:]
    print(f"\n=== {key.upper()} ({len(items)} articles) ===")
    print(f"  KEEP [{best[1]:4d}] {best[0]}: {best[2]}")
    for f, lines, title in rest:
        print(f"  DEL  [{lines:4d}] {f}: {title}")
