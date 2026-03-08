#!/usr/bin/env python3
"""Delete duplicate articles, keeping the longest/best one per cluster."""
import os

BLOG_DIR = "/Users/kokiriho/Documents/Projects/makemoney/sites/blog/src/content/blog"

# Each cluster: (keep, [delete list])
CLUSTERS = {
    "Tailwind CSS": (
        "tailwind-css-v4-guide.md",
        ["tailwind-css-practical-guide.md", "tailwind-v4-migration.md", "tailwind-v4-guide.md",
         "tailwindcss-tips-tricks.md", "tailwindcss-v4-migration-guide.md"]
    ),
    "React 19 (general)": (
        "react19-new-features-guide.md",
        ["react-19-complete-guide.md", "react-19-guide.md"]
    ),
    "React 19 Form/Server Actions": (
        "react-19-server-actions.md",
        ["react-19-form-actions.md"]
    ),
    "Cloudflare Workers": (
        "cloudflare-workers-guide.md",
        ["cloudflare-workers-ai-guide.md", "workers-ai-rag-guide.md", "workers-ai-guide.md"]
    ),
    "Core Web Vitals": (
        "web-vitals-optimization.md",
        ["web-performance-core-vitals.md", "core-web-vitals-performance-optimization.md",
         "core-web-vitals-optimization.md"]
    ),
    "Drizzle ORM (general)": (
        "drizzle-orm-guide.md",
        ["drizzle-orm-practical.md", "drizzle-orm-guide-2026.md", "drizzle-orm-v1-guide.md"]
    ),
    "GitHub Actions": (
        "github-actions-cicd-guide.md",
        ["github-actions-guide.md", "github-actions-cicd-tutorial.md"]
    ),
    "TanStack Query": (
        "tanstack-query-guide.md",
        ["tanstack-query-v5.md", "react-query-guide-2026.md", "react-query-v5-patterns.md"]
    ),
    "React Server Components": (
        "react-server-components-guide.md",
        ["react-server-components-patterns.md", "server-components-deep-dive.md",
         "react-server-components-deep.md"]
    ),
    "Rust + WebAssembly": (
        "rust-wasm-web-guide.md",  # Keep eBPF as separate topic
        ["rust-wasm-frontend.md"]
    ),
    "Web Components": (
        "web-components-guide.md",
        ["web-components-modern-guide.md", "web-components-2025.md", "web-components-2026.md"]
    ),
    "Vercel AI SDK": (
        "ai-sdk-vercel-guide.md",
        ["vercel-ai-sdk-guide.md", "vercel-ai-sdk-streaming.md"]
    ),
    "CSS Anchor Positioning": (
        "css-anchor-positioning-guide.md",
        ["css-anchor-positioning-complete-guide.md", "css-anchor-positioning.md"]
    ),
    "Docker Compose": (
        "docker-compose-practical-guide.md",
        ["docker-compose-v2-guide.md"]
    ),
    "Next.js 15": (
        "nextjs-15-complete-guide.md",
        ["nextjs-15-new-features.md", "nextjs15-app-router-complete-guide-2026.md"]
    ),
    "Payload CMS": (
        "payload-cms-guide.md",
        ["payload-cms-headless-guide.md", "payload-cms-v3-guide.md"]
    ),
    "TypeScript 5.x": (
        "typescript5-new-features-guide.md",
        ["typescript-5-features-guide.md", "typescript-5-best-practices.md"]
    ),
    "Val Town": (
        "val-town-guide.md",
        ["val-town-serverless.md", "val-town-serverless-scripts.md"]
    ),
    # Additional duplicates found in initial scan
    "Biome": (
        "biome-linter-formatter-guide.md",
        ["biome-formatter-linter.md", "biome-lint-format.md", "biome-linter-formatter.md",
         "biome-linter-guide.md"]
    ),
    "Bun (general)": (
        "bun-complete-guide-2026.md",
        ["bun-runtime-guide.md", "bun-runtime-guide-2026.md"]
    ),
    "Bun Test": (
        "bun-test-guide.md",
        ["bun-test-runner-guide.md"]
    ),
    "Bun + Hono": (
        "bun-hono-fullstack.md",
        ["bun-hono-api-guide.md"]
    ),
    "Supabase (general)": (
        "supabase-complete-guide-2026.md",
        ["supabase-complete-guide.md", "supabase-guide.md"]
    ),
    "AIコーディングツール比較": (
        "ai-coding-tools-guide.md",
        ["ai-coding-tools-comparison-2026.md", "ai-coding-tools-comparison.md",
         "ai-coding-assistant-comparison-2026.md"]
    ),
}

deleted = []
kept = []
errors = []

for cluster, (keep, delete_list) in CLUSTERS.items():
    keep_path = os.path.join(BLOG_DIR, keep)
    if not os.path.exists(keep_path):
        errors.append(f"KEEP file not found: {keep} ({cluster})")
        continue
    kept.append(f"  KEEP: {keep} ({cluster})")

    for del_file in delete_list:
        del_path = os.path.join(BLOG_DIR, del_file)
        if os.path.exists(del_path):
            os.remove(del_path)
            deleted.append(f"  DEL:  {del_file} ({cluster})")
        else:
            errors.append(f"  SKIP: {del_file} not found ({cluster})")

print(f"=== CONSOLIDATED {len(deleted)} DUPLICATE ARTICLES ===\n")
print(f"Kept: {len(kept)} canonical articles")
print(f"Deleted: {len(deleted)} duplicates")
if errors:
    print(f"Errors: {len(errors)}")
print()
for line in deleted:
    print(line)
if errors:
    print("\n=== ERRORS ===")
    for e in errors:
        print(e)
