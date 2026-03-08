#!/usr/bin/env python3
"""SEO Duplicate / Cannibalization Analysis for TechBoost Blog"""

import os
import re
import sys
from collections import defaultdict, Counter
from difflib import SequenceMatcher
from pathlib import Path

BLOG_DIR = Path(__file__).resolve().parent.parent / "src" / "content" / "blog"

# Words to strip when normalizing titles for core-topic extraction
STOP_WORDS = set(
    "ガイド 入門 完全 実践 比較 おすすめ 徹底 解説 使い方 活用 "
    "基本 基礎 まとめ 方法 やり方 始め方 書き方 作り方 設定 "
    "チュートリアル 手順 ハンズオン 紹介 最新 対応 版 "
    "guide complete practical tutorial introduction handbook "
    "best practices tips tricks comprehensive ultimate".split()
)

YEAR_RE = re.compile(r"20\d{2}")


def parse_frontmatter(filepath: Path):
    """Extract title and tags from YAML frontmatter."""
    text = filepath.read_text(encoding="utf-8", errors="replace")
    # Find frontmatter block
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return None, []
    fm = m.group(1)

    # title
    tm = re.search(r"^title:\s*['\"]?(.*?)['\"]?\s*$", fm, re.MULTILINE)
    title = tm.group(1).strip("'\" ") if tm else ""

    # tags - handle both ['a','b'] and YAML list
    tgm = re.search(r"^tags:\s*\[(.+?)\]", fm, re.MULTILINE)
    if tgm:
        tags = [t.strip().strip("'\" ") for t in tgm.group(1).split(",")]
    else:
        tags = []
        in_tags = False
        for line in fm.split("\n"):
            if re.match(r"^tags:\s*$", line):
                in_tags = True
                continue
            if in_tags:
                tm2 = re.match(r"^\s*-\s*(.+)", line)
                if tm2:
                    tags.append(tm2.group(1).strip("'\" "))
                else:
                    in_tags = False
    return title, tags


def normalize_title(title: str) -> str:
    """Remove year numbers, stop words, punctuation for core topic extraction."""
    t = title.lower()
    t = YEAR_RE.sub("", t)
    # Remove punctuation / special chars
    t = re.sub(r"[^\w\s]", " ", t)
    words = t.split()
    words = [w for w in words if w not in STOP_WORDS and len(w) > 1]
    return " ".join(words)


def extract_tech_keywords(title: str) -> set:
    """Extract technology/topic keywords from title."""
    t = title.lower()
    t = YEAR_RE.sub("", t)
    # Known tech terms to detect (case-insensitive patterns)
    tech_patterns = [
        r"\bcss\b", r"\bhtml\b", r"\bjs\b", r"\bjavascript\b", r"\btypescript\b",
        r"\bts\b", r"\breact\b", r"\bnext\.?js\b", r"\bvue\b", r"\bnuxt\b",
        r"\bsvelte\b", r"\bastro\b", r"\bnode\b", r"\bdeno\b", r"\bbun\b",
        r"\brust\b", r"\bgo\b", r"\bpython\b", r"\bdocker\b", r"\bkubernetes\b",
        r"\bk8s\b", r"\btailwind\b", r"\bgit\b", r"\bgithub\b", r"\bvite\b",
        r"\bwebpack\b", r"\btdd\b", r"\bci\/?cd\b", r"\bgraphql\b", r"\brest\b",
        r"\bapi\b", r"\baws\b", r"\bvercel\b", r"\bcloudflare\b",
        r"\bwasm\b", r"\bwebassembly\b", r"\bpostgres\b", r"\bmongodb\b",
        r"\bredis\b", r"\bsqlite\b", r"\bprisma\b", r"\bdrizzle\b",
        r"\btrpc\b", r"\bzustand\b", r"\bjotai\b", r"\bswr\b",
        r"\btanstack\b", r"\bshadcn\b", r"\bradix\b",
        r"\bcontainer\b", r"\banchor\b", r"\bcolor\b", r"\banimation\b",
        r"\bviewport\b", r"\bfield\b", r"\bform\b", r"\bvalidation\b",
    ]
    found = set()
    for pat in tech_patterns:
        if re.search(pat, t):
            found.add(re.sub(r"[\\b\.\?\/]", "", pat))
    return found


def slug_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def main():
    files = sorted(BLOG_DIR.glob("*.md"))
    print(f"Total .md files found: {len(files)}\n")

    articles = []
    for f in files:
        title, tags = parse_frontmatter(f)
        if title is None:
            continue
        slug = f.stem
        norm = normalize_title(title)
        articles.append({
            "file": f.name,
            "slug": slug,
            "title": title,
            "norm": norm,
            "tags": tuple(sorted(tags)),
            "tag_set": set(tags),
        })

    print(f"Articles with valid frontmatter: {len(articles)}\n")

    # ─────────────────────────────────────────────
    # 1. Title-based cannibalization detection
    # ─────────────────────────────────────────────
    print("=" * 80)
    print("1. POTENTIAL CANNIBALIZATION CLUSTERS (title-based)")
    print("=" * 80)

    # Strategy A: group by normalized title similarity using word-overlap
    # Build word-set per article, then cluster articles sharing >= 60% words
    clusters = defaultdict(list)
    processed = [False] * len(articles)

    for i, a in enumerate(articles):
        if processed[i]:
            continue
        cluster = [i]
        processed[i] = True
        a_words = set(a["norm"].split())
        if len(a_words) < 2:
            continue
        for j in range(i + 1, len(articles)):
            if processed[j]:
                continue
            b_words = set(articles[j]["norm"].split())
            if len(b_words) < 2:
                continue
            intersection = a_words & b_words
            union = a_words | b_words
            jaccard = len(intersection) / len(union) if union else 0
            # Also check substring containment of normalized
            seq_ratio = SequenceMatcher(None, a["norm"], articles[j]["norm"]).ratio()
            if jaccard >= 0.5 or seq_ratio >= 0.7:
                cluster.append(j)
                processed[j] = True
        if len(cluster) >= 2:
            key = " / ".join(sorted(set(a["norm"].split())))
            clusters[key] = cluster

    # Strategy B: also detect by slug prefix match
    slug_clusters = defaultdict(list)
    for i, a in enumerate(articles):
        # Extract a base slug by removing trailing -guide, -complete, -practical, etc.
        base = re.sub(r"-(guide|complete|practical|tutorial|introduction|入門|実践|比較|ガイド|解説|best-practices)$", "", a["slug"])
        base = re.sub(r"-20\d{2}$", "", base)
        slug_clusters[base].append(i)

    # Merge slug-based clusters into title-based
    already_clustered = set()
    for idxs in clusters.values():
        for idx in idxs:
            already_clustered.add(idx)

    for base, idxs in slug_clusters.items():
        if len(idxs) >= 2:
            new_idxs = [i for i in idxs if i not in already_clustered]
            if len(new_idxs) >= 2:
                clusters[f"slug:{base}"] = idxs
                for i in idxs:
                    already_clustered.add(i)
            elif new_idxs and any(i in already_clustered for i in idxs):
                # Add to existing cluster if partial overlap
                pass

    total_cannibal = 0
    sorted_clusters = sorted(clusters.items(), key=lambda x: -len(x[1]))
    for key, idxs in sorted_clusters:
        total_cannibal += len(idxs)
        print(f"\n--- Cluster ({len(idxs)} articles) ---")
        for idx in idxs:
            a = articles[idx]
            print(f"  [{a['file']}]")
            print(f"    Title: {a['title']}")
            print(f"    Tags:  {list(a['tags'])}")
        print()

    if not clusters:
        print("  No cannibalization clusters found.\n")
    else:
        print(f"TOTAL articles in cannibalization clusters: {total_cannibal}")
        print(f"Number of clusters: {len(clusters)}")

    # ─────────────────────────────────────────────
    # 2. Tag overlap analysis
    # ─────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("2. TAG ANALYSIS")
    print("=" * 80)

    # Tag frequency
    tag_counter = Counter()
    for a in articles:
        for t in a["tags"]:
            tag_counter[t] += 1

    print("\nTop 30 tags by frequency:")
    for tag, count in tag_counter.most_common(30):
        bar = "#" * min(count, 60)
        print(f"  {tag:40s} {count:4d}  {bar}")

    # Articles with identical tag sets
    tagset_groups = defaultdict(list)
    for a in articles:
        if a["tags"]:
            tagset_groups[a["tags"]].append(a["file"])

    print(f"\nTag-set groups with 5+ articles (identical tags):")
    for tags, files in sorted(tagset_groups.items(), key=lambda x: -len(x[1])):
        if len(files) >= 5:
            print(f"\n  Tags: {list(tags)}  ({len(files)} articles)")
            for f in files[:10]:
                print(f"    - {f}")
            if len(files) > 10:
                print(f"    ... and {len(files) - 10} more")

    # ─────────────────────────────────────────────
    # 3. Slug similarity analysis
    # ─────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("3. SIMILAR SLUG PAIRS (ratio >= 0.85)")
    print("=" * 80)

    similar_slugs = []
    for i in range(len(articles)):
        for j in range(i + 1, len(articles)):
            ratio = slug_similarity(articles[i]["slug"], articles[j]["slug"])
            if ratio >= 0.85:
                similar_slugs.append((ratio, articles[i], articles[j]))

    similar_slugs.sort(key=lambda x: -x[0])
    for ratio, a, b in similar_slugs:
        print(f"\n  Similarity: {ratio:.2f}")
        print(f"    A: {a['file']:60s}  {a['title'][:50]}")
        print(f"    B: {b['file']:60s}  {b['title'][:50]}")

    if not similar_slugs:
        print("  No highly similar slug pairs found.\n")

    # ─────────────────────────────────────────────
    # 4. Summary
    # ─────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("4. SUMMARY")
    print("=" * 80)
    print(f"  Total articles analyzed:              {len(articles)}")
    print(f"  Cannibalization clusters:              {len(clusters)}")
    print(f"  Articles in cannibal clusters:         {total_cannibal}")
    print(f"  Similar slug pairs (>=0.85):           {len(similar_slugs)}")
    print(f"  Unique tag values:                     {len(tag_counter)}")
    print(f"  Tag-set groups with identical tags:     {len([g for g in tagset_groups.values() if len(g) >= 2])}")
    print()


if __name__ == "__main__":
    main()
