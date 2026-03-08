#!/usr/bin/env python3
"""
Extend short descriptions (< 120 chars) to 120-155 chars range.
Strategy: append relevant context from the title and tags to pad the description.
"""
import os
import re
import yaml

BLOG_DIR = "/Users/kokiriho/Documents/Projects/makemoney/sites/blog/src/content/blog"

# Suffix phrases to pad descriptions (context-appropriate)
SUFFIX_POOL = [
    "初心者から実務レベルまで対応。",
    "サンプルコード付きで実践的に解説。",
    "現場で使える知識を体系的にまとめました。",
    "具体的なコード例とともに詳しく紹介します。",
    "導入から応用まで段階的に学べます。",
    "2026年最新の情報を反映しています。",
    "実務で役立つポイントを厳選して解説。",
    "基礎から応用まで幅広くカバーしています。",
    "ベストプラクティスと注意点も紹介します。",
    "開発効率を上げるヒントが満載です。",
]

stats = {"fixed": 0, "already_ok": 0, "too_long": 0, "errors": 0}

def parse_frontmatter(content):
    """Extract frontmatter as dict and body."""
    m = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not m:
        return None, content
    try:
        fm = yaml.safe_load(m.group(1))
        body = content[m.end():]
        return fm, body
    except:
        return None, content

def rebuild_file(fm_text, body):
    return f"---\n{fm_text}---\n{body}"

def extend_description(desc, title, tags, idx):
    """Extend description to 120-155 chars."""
    if not desc:
        return desc

    original_len = len(desc)
    if 120 <= original_len <= 155:
        return desc
    if original_len > 155:
        return desc  # Don't touch too-long ones here

    # Strategy 1: Add a suffix from the pool
    suffix = SUFFIX_POOL[idx % len(SUFFIX_POOL)]
    candidate = desc.rstrip("。") + "。" + suffix
    if 120 <= len(candidate) <= 155:
        return candidate

    # Strategy 2: Try shorter suffixes
    short_suffixes = [
        "実践的に解説します。",
        "わかりやすく紹介。",
        "詳しく解説します。",
        "基礎から応用まで。",
        "コード例付きで解説。",
        "初心者にもおすすめ。",
        "現場で役立つ情報。",
        "ステップバイステップで解説。",
    ]
    for s in short_suffixes:
        candidate = desc.rstrip("。") + "。" + s
        if 120 <= len(candidate) <= 155:
            return candidate

    # Strategy 3: Use tags to build context
    if tags and len(tags) > 0:
        tag_str = "・".join(tags[:3])
        candidate = desc.rstrip("。") + f"。{tag_str}に関する実践情報。"
        if 120 <= len(candidate) <= 155:
            return candidate

    # Strategy 4: Repeat with title keywords
    title_words = re.findall(r'[A-Za-z]+|[\u3040-\u9fff]+', title)
    if title_words:
        kw = title_words[0] if len(title_words[0]) > 2 else (title_words[1] if len(title_words) > 1 else title_words[0])
        candidate = desc.rstrip("。") + f"。{kw}の基礎から実践的な活用法までカバー。"
        if 120 <= len(candidate) <= 155:
            return candidate

    # Strategy 5: Just pad with generic text, trim to 155
    padded = desc.rstrip("。") + "。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
    if len(padded) > 155:
        padded = padded[:155]
        # Trim to last 。
        last_period = padded.rfind("。")
        if last_period > 120:
            padded = padded[:last_period + 1]
    if 120 <= len(padded) <= 155:
        return padded

    # If still too short or too long, just pad to exactly 120
    if len(padded) < 120:
        padded = desc.rstrip("。") + "。" + "実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
        if len(padded) > 155:
            padded = padded[:155]
            last_period = padded.rfind("。")
            if last_period > 110:
                padded = padded[:last_period + 1]

    return padded


fixed_files = []
idx = 0
for f in sorted(os.listdir(BLOG_DIR)):
    if not f.endswith('.md'):
        continue

    path = os.path.join(BLOG_DIR, f)
    with open(path, 'r', encoding='utf-8') as fh:
        content = fh.read()

    fm, body = parse_frontmatter(content)
    if fm is None:
        stats["errors"] += 1
        continue

    desc = fm.get('description', '')
    title = fm.get('title', '')
    tags = fm.get('tags', [])

    if not desc:
        stats["errors"] += 1
        continue

    desc_len = len(desc)

    if 120 <= desc_len <= 155:
        stats["already_ok"] += 1
        continue

    if desc_len > 155:
        stats["too_long"] += 1
        continue

    # Need to extend
    new_desc = extend_description(desc, title, tags, idx)
    idx += 1
    new_len = len(new_desc)

    if new_desc == desc:
        stats["errors"] += 1
        continue

    # Replace in file content (careful with YAML quoting)
    # Find and replace the description line in frontmatter
    # Use raw string replacement in the frontmatter section
    fm_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    fm_text = fm_match.group(1)

    # Escape special regex chars in old desc
    old_desc_escaped = re.escape(desc)
    new_fm_text = re.sub(
        r'(description:\s*["\']?)' + old_desc_escaped + r'(["\']?\s*$)',
        lambda m: m.group(1) + new_desc + m.group(2),
        fm_text,
        count=1,
        flags=re.MULTILINE
    )

    if new_fm_text == fm_text:
        # Try without quotes
        new_fm_text = fm_text.replace(desc, new_desc, 1)

    if new_fm_text == fm_text:
        stats["errors"] += 1
        continue

    new_content = f"---\n{new_fm_text}\n---\n{body}"

    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(new_content)

    stats["fixed"] += 1
    if stats["fixed"] <= 10:
        fixed_files.append(f"  {f}: {desc_len} -> {new_len} chars")

print(f"=== Description Extension Results ===")
print(f"Fixed (extended): {stats['fixed']}")
print(f"Already OK (120-155): {stats['already_ok']}")
print(f"Too long (>155): {stats['too_long']}")
print(f"Errors/skipped: {stats['errors']}")
print()
if fixed_files:
    print("Sample fixes:")
    for line in fixed_files:
        print(line)
