#!/usr/bin/env python3
"""
SEO Content Quality Audit for TechBoost Blog
Analyzes all .md files in src/content/blog/ for thin content and quality signals.
READ-ONLY: does not modify any files.
"""

import os
import re
from pathlib import Path
from collections import defaultdict

BLOG_DIR = Path("src/content/blog")


def parse_article(filepath):
    """Parse a markdown article and extract metrics."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")
    total_lines = len(lines)

    # Find frontmatter boundaries
    fm_boundaries = []
    for i, line in enumerate(lines):
        if line.strip() == "---":
            fm_boundaries.append(i)
        if len(fm_boundaries) == 2:
            break

    if len(fm_boundaries) >= 2:
        body_lines = lines[fm_boundaries[1] + 1:]
    else:
        body_lines = lines

    body_text = "\n".join(body_lines)
    body_line_count = len(body_lines)

    # Word count (whitespace split, rough for mixed JP/EN)
    word_count = len(body_text.split())

    # Code blocks (``` pairs)
    code_blocks = len(re.findall(r"^```", body_text, re.MULTILINE)) // 2

    # Headings (## or ###)
    headings = len(re.findall(r"^#{2,3}\s", body_text, re.MULTILINE))

    # Links
    internal_links = len(re.findall(r"\]\(/", body_text))
    external_links = len(re.findall(r"\]\(https?://", body_text))

    # Images
    images = len(re.findall(r"!\[", body_text))

    # Extract title from frontmatter
    title = filepath.stem
    for line in lines[fm_boundaries[0]+1:fm_boundaries[1]] if len(fm_boundaries) >= 2 else []:
        m = re.match(r'^title:\s*["\']?(.+?)["\']?\s*$', line)
        if m:
            title = m.group(1)
            break

    return {
        "filename": filepath.name,
        "title": title,
        "total_lines": total_lines,
        "body_lines": body_line_count,
        "word_count": word_count,
        "code_blocks": code_blocks,
        "headings": headings,
        "internal_links": internal_links,
        "external_links": external_links,
        "images": images,
    }


def main():
    md_files = sorted(BLOG_DIR.glob("*.md"))
    if not md_files:
        print(f"No .md files found in {BLOG_DIR}")
        return

    articles = []
    for f in md_files:
        try:
            articles.append(parse_article(f))
        except Exception as e:
            print(f"ERROR parsing {f.name}: {e}")

    total = len(articles)
    print(f"=" * 80)
    print(f"SEO CONTENT QUALITY AUDIT - TechBoost Blog")
    print(f"Total articles analyzed: {total}")
    print(f"=" * 80)

    # --- Thin articles (<200 lines) ---
    thin = sorted([a for a in articles if a["total_lines"] < 200], key=lambda x: x["total_lines"])
    print(f"\n{'='*80}")
    print(f"THIN ARTICLES (<200 lines): {len(thin)} articles")
    print(f"{'='*80}")
    if thin:
        print(f"{'Lines':>6} {'Words':>7} {'Code':>5} {'H':>3} {'File'}")
        print(f"{'-'*6} {'-'*7} {'-'*5} {'-'*3} {'-'*50}")
        for a in thin:
            print(f"{a['total_lines']:>6} {a['word_count']:>7} {a['code_blocks']:>5} {a['headings']:>3} {a['filename']}")
    else:
        print("None found.")

    # --- Short articles (200-300 lines) ---
    short = sorted([a for a in articles if 200 <= a["total_lines"] < 300], key=lambda x: x["total_lines"])
    print(f"\n{'='*80}")
    print(f"SHORT ARTICLES (200-300 lines): {len(short)} articles")
    print(f"{'='*80}")
    if short:
        print(f"{'Lines':>6} {'Words':>7} {'Code':>5} {'H':>3} {'File'}")
        print(f"{'-'*6} {'-'*7} {'-'*5} {'-'*3} {'-'*50}")
        for a in short:
            print(f"{a['total_lines']:>6} {a['word_count']:>7} {a['code_blocks']:>5} {a['headings']:>3} {a['filename']}")
    else:
        print("None found.")

    # --- No code blocks ---
    no_code = [a for a in articles if a["code_blocks"] == 0]
    print(f"\n{'='*80}")
    print(f"ARTICLES WITH NO CODE BLOCKS: {len(no_code)} / {total}")
    print(f"{'='*80}")
    if no_code:
        for a in sorted(no_code, key=lambda x: x["filename"]):
            print(f"  {a['total_lines']:>5} lines | {a['filename']}")

    # --- No internal links ---
    no_internal = [a for a in articles if a["internal_links"] == 0]
    print(f"\n{'='*80}")
    print(f"ARTICLES WITH NO INTERNAL LINKS: {len(no_internal)} / {total}")
    print(f"{'='*80}")
    if no_internal:
        for a in sorted(no_internal, key=lambda x: x["filename"]):
            print(f"  {a['total_lines']:>5} lines | {a['filename']}")

    # --- No external links ---
    no_external = [a for a in articles if a["external_links"] == 0]
    print(f"\n{'='*80}")
    print(f"ARTICLES WITH NO EXTERNAL LINKS: {len(no_external)} / {total}")
    print(f"{'='*80}")
    if no_external:
        for a in sorted(no_external, key=lambda x: x["filename"]):
            print(f"  {a['total_lines']:>5} lines | {a['filename']}")

    # --- No images ---
    no_images = [a for a in articles if a["images"] == 0]
    print(f"\n{'='*80}")
    print(f"ARTICLES WITH NO IMAGES: {len(no_images)} / {total}")
    print(f"{'='*80}")
    if no_images:
        for a in sorted(no_images, key=lambda x: x["filename"]):
            print(f"  {a['total_lines']:>5} lines | {a['filename']}")

    # --- Content length distribution ---
    buckets = {"0-100": 0, "100-200": 0, "200-300": 0, "300-500": 0, "500-1000": 0, "1000+": 0}
    for a in articles:
        l = a["total_lines"]
        if l < 100:
            buckets["0-100"] += 1
        elif l < 200:
            buckets["100-200"] += 1
        elif l < 300:
            buckets["200-300"] += 1
        elif l < 500:
            buckets["300-500"] += 1
        elif l < 1000:
            buckets["500-1000"] += 1
        else:
            buckets["1000+"] += 1

    print(f"\n{'='*80}")
    print(f"CONTENT LENGTH DISTRIBUTION (total lines)")
    print(f"{'='*80}")
    max_count = max(buckets.values()) if buckets.values() else 1
    for label, count in buckets.items():
        bar = "#" * int(count / max_count * 40) if max_count > 0 else ""
        pct = count / total * 100
        print(f"  {label:>8}: {count:>4} ({pct:5.1f}%) {bar}")

    # --- Average stats ---
    avg_lines = sum(a["total_lines"] for a in articles) / total
    avg_body = sum(a["body_lines"] for a in articles) / total
    avg_words = sum(a["word_count"] for a in articles) / total
    avg_code = sum(a["code_blocks"] for a in articles) / total
    avg_headings = sum(a["headings"] for a in articles) / total
    avg_internal = sum(a["internal_links"] for a in articles) / total
    avg_external = sum(a["external_links"] for a in articles) / total
    avg_images = sum(a["images"] for a in articles) / total

    print(f"\n{'='*80}")
    print(f"AVERAGE STATS")
    print(f"{'='*80}")
    print(f"  Avg total lines:    {avg_lines:.1f}")
    print(f"  Avg body lines:     {avg_body:.1f}")
    print(f"  Avg word count:     {avg_words:.1f}")
    print(f"  Avg code blocks:    {avg_code:.1f}")
    print(f"  Avg headings:       {avg_headings:.1f}")
    print(f"  Avg internal links: {avg_internal:.1f}")
    print(f"  Avg external links: {avg_external:.1f}")
    print(f"  Avg images:         {avg_images:.1f}")

    # --- Top 10 longest ---
    print(f"\n{'='*80}")
    print(f"TOP 10 LONGEST ARTICLES")
    print(f"{'='*80}")
    for a in sorted(articles, key=lambda x: x["total_lines"], reverse=True)[:10]:
        print(f"  {a['total_lines']:>5} lines | {a['code_blocks']:>3} code | {a['headings']:>3} H | {a['filename']}")

    # --- Summary ---
    print(f"\n{'='*80}")
    print(f"SUMMARY")
    print(f"{'='*80}")
    print(f"  Total articles:         {total}")
    print(f"  Thin (<200 lines):      {len(thin)} ({len(thin)/total*100:.1f}%)")
    print(f"  Short (200-300 lines):  {len(short)} ({len(short)/total*100:.1f}%)")
    print(f"  No code blocks:         {len(no_code)} ({len(no_code)/total*100:.1f}%)")
    print(f"  No internal links:      {len(no_internal)} ({len(no_internal)/total*100:.1f}%)")
    print(f"  No external links:      {len(no_external)} ({len(no_external)/total*100:.1f}%)")
    print(f"  No images:              {len(no_images)} ({len(no_images)/total*100:.1f}%)")


if __name__ == "__main__":
    main()
