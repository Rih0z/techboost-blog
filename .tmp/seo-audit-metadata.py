#!/usr/bin/env python3
"""SEO Metadata Audit for TechBoost blog articles."""

import os
import re
import yaml
from pathlib import Path

BLOG_DIR = Path(__file__).resolve().parent.parent / "src" / "content" / "blog"

def parse_frontmatter(filepath):
    """Parse YAML frontmatter from a markdown file."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not m:
        return None
    try:
        return yaml.safe_load(m.group(1))
    except yaml.YAMLError:
        return None

def main():
    md_files = sorted(BLOG_DIR.glob("*.md"))
    total = len(md_files)

    title_too_long = []  # (filename, title, length)
    desc_too_long = []   # (filename, desc, length)
    desc_too_short = []  # (filename, desc, length)
    desc_missing = []
    hero_missing = []
    tags_too_few = []    # (filename, count)
    tags_too_many = []   # (filename, count)
    tags_missing = []
    pubdate_missing = []
    parse_errors = []

    for fp in md_files:
        fname = fp.name
        fm = parse_frontmatter(fp)
        if fm is None:
            parse_errors.append(fname)
            continue

        # Title
        title = fm.get("title", "")
        if title:
            tlen = len(title)
            if tlen > 60:
                title_too_long.append((fname, title, tlen))

        # Description
        desc = fm.get("description", "")
        if not desc:
            desc_missing.append(fname)
        else:
            dlen = len(desc)
            if dlen > 155:
                desc_too_long.append((fname, desc, dlen))
            elif dlen < 120:
                desc_too_short.append((fname, desc, dlen))

        # heroImage
        hero = fm.get("heroImage", None)
        if not hero:
            hero_missing.append(fname)

        # Tags
        tags = fm.get("tags", None)
        if tags is None or (isinstance(tags, list) and len(tags) == 0):
            tags_missing.append(fname)
        elif isinstance(tags, list):
            tc = len(tags)
            if tc < 2:
                tags_too_few.append((fname, tc))
            elif tc > 5:
                tags_too_many.append((fname, tc))

        # pubDate
        if not fm.get("pubDate"):
            pubdate_missing.append(fname)

    # Sort by severity
    title_too_long.sort(key=lambda x: -x[2])
    desc_too_long.sort(key=lambda x: -x[2])
    desc_too_short.sort(key=lambda x: x[2])

    # Report
    print("=" * 80)
    print("SEO METADATA AUDIT REPORT - TechBoost Blog")
    print("=" * 80)
    print(f"\nTotal articles: {total}")
    if parse_errors:
        print(f"Parse errors: {len(parse_errors)}")
        for f in parse_errors:
            print(f"  - {f}")

    # Title
    print(f"\n{'='*80}")
    print(f"TITLE ISSUES (>60 chars): {len(title_too_long)} articles")
    print(f"{'='*80}")
    for fname, title, tlen in title_too_long[:20]:
        print(f"  [{tlen} chars] {fname}")
        print(f"    {title[:80]}{'...' if len(title)>80 else ''}")
    if len(title_too_long) > 20:
        print(f"  ... and {len(title_too_long)-20} more")

    # Description too long
    print(f"\n{'='*80}")
    print(f"DESCRIPTION TOO LONG (>155 chars): {len(desc_too_long)} articles")
    print(f"{'='*80}")
    for fname, desc, dlen in desc_too_long[:20]:
        print(f"  [{dlen} chars] {fname}")
        print(f"    {desc[:100]}{'...' if len(desc)>100 else ''}")
    if len(desc_too_long) > 20:
        print(f"  ... and {len(desc_too_long)-20} more")

    # Description too short
    print(f"\n{'='*80}")
    print(f"DESCRIPTION TOO SHORT (<120 chars): {len(desc_too_short)} articles")
    print(f"{'='*80}")
    for fname, desc, dlen in desc_too_short[:20]:
        print(f"  [{dlen} chars] {fname}")
        print(f"    {desc}")
    if len(desc_too_short) > 20:
        print(f"  ... and {len(desc_too_short)-20} more")

    # Description missing
    if desc_missing:
        print(f"\n{'='*80}")
        print(f"DESCRIPTION MISSING: {len(desc_missing)} articles")
        print(f"{'='*80}")
        for f in desc_missing:
            print(f"  - {f}")

    # heroImage missing
    print(f"\n{'='*80}")
    print(f"HERO IMAGE MISSING: {len(hero_missing)} articles")
    print(f"{'='*80}")
    for f in hero_missing:
        print(f"  - {f}")

    # Tags
    print(f"\n{'='*80}")
    print(f"TAG ISSUES: {len(tags_too_few)} with <2 tags, {len(tags_too_many)} with >5 tags, {len(tags_missing)} missing")
    print(f"{'='*80}")
    if tags_too_few:
        print("  Too few tags (<2):")
        for fname, tc in tags_too_few:
            print(f"    [{tc} tags] {fname}")
    if tags_too_many:
        print("  Too many tags (>5):")
        for fname, tc in tags_too_many:
            print(f"    [{tc} tags] {fname}")
    if tags_missing:
        print("  Missing tags:")
        for f in tags_missing:
            print(f"    - {f}")

    # pubDate
    print(f"\n{'='*80}")
    print(f"PUBDATE MISSING: {len(pubdate_missing)} articles")
    print(f"{'='*80}")
    if pubdate_missing:
        for f in pubdate_missing:
            print(f"  - {f}")

    # Summary
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    ok_count = total - len(parse_errors)
    issues = {
        "Title >60 chars": len(title_too_long),
        "Desc >155 chars": len(desc_too_long),
        "Desc <120 chars": len(desc_too_short),
        "Desc missing": len(desc_missing),
        "heroImage missing": len(hero_missing),
        "Tags <2": len(tags_too_few),
        "Tags >5": len(tags_too_many),
        "Tags missing": len(tags_missing),
        "pubDate missing": len(pubdate_missing),
    }
    total_issues = sum(issues.values())
    print(f"  Total articles: {total}")
    print(f"  Parseable: {ok_count}")
    print(f"  Total issues found: {total_issues}")
    for label, count in issues.items():
        pct = (count / ok_count * 100) if ok_count else 0
        bar = "#" * int(pct / 2)
        print(f"  {label:20s}: {count:4d} ({pct:5.1f}%) {bar}")

if __name__ == "__main__":
    main()
