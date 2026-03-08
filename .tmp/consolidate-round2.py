#!/usr/bin/env python3
"""Round 2: Consolidate remaining duplicate article clusters."""
import os

BLOG_DIR = "/Users/kokiriho/Documents/Projects/makemoney/sites/blog/src/content/blog"

# Each cluster: (keep, [delete list]) - keep the longest/best article
CLUSTERS = {
    "CSS :has() selector": (
        "css-has-selector-complete-guide.md",
        ["css-has-selector-guide.md", "css-has-selector.md"]
    ),
    "Tauri desktop app": (
        "tauri-desktop-app-guide.md",
        ["tauri-desktop-app.md", "tauri-v2-desktop-app.md", "tauri-v2-desktop-apps.md"]
    ),
    "Coolify self-hosting": (
        "coolify-self-hosted-paas.md",
        ["coolify-self-hosting-guide.md"]
    ),
    "Claude Code guide": (
        "claude-code-practical-guide.md",
        ["claude-code-guide.md"]
    ),
    "CSS light-dark": (
        "css-light-dark-function.md",
        ["css-light-dark-guide.md"]
    ),
    "CSS Popover API": (
        "css-popover-api-guide.md",
        ["css-popover-api.md"]
    ),
    "Docker multi-stage": (
        "docker-multi-stage-builds.md",
        ["docker-multi-stage-guide.md"]
    ),
    "Effect-TS": (
        "effect-ts-guide.md",
        ["effect-ts-practical-guide.md"]
    ),
    "ElectricSQL": (
        "electric-sql-guide.md",
        ["electric-sql-sync.md"]
    ),
    "Fly.io deploy": (
        "fly-io-deploy-guide.md",
        ["fly-io-fullstack-deploy.md"]
    ),
    "GraphQL Federation": (
        "graphql-federation-guide.md",
        ["graphql-federation-microservices.md"]
    ),
    "Hono framework": (
        "hono-framework-guide.md",
        ["hono-api-framework.md"]
    ),
    "htmx": (
        "htmx-guide.md",
        ["htmx-modern-web.md"]
    ),
    "Kubernetes basics": (
        "kubernetes-basics-guide.md",
        ["kubernetes-fundamentals.md"]
    ),
    "Kysely SQL": (
        "kysely-type-safe-sql.md",
        ["kysely-typesafe-sql.md"]
    ),
    "Neon PostgreSQL": (
        "neon-serverless-postgres.md",
        ["neon-postgres-guide.md"]
    ),
    "Next.js Middleware": (
        "nextjs-middleware-guide.md",
        ["nextjs-middleware-patterns.md"]
    ),
    "OpenTelemetry Node.js": (
        "opentelemetry-nodejs-guide.md",
        ["opentelemetry-node-guide.md"]
    ),
    "Playwright E2E": (
        "playwright-e2e-testing.md",
        ["playwright-testing-guide.md"]
    ),
    "PostgreSQL performance": (
        "postgresql-performance-guide.md",
        ["postgresql-performance-tuning.md"]
    ),
    "Redis guide": (
        "redis-complete-guide.md",
        ["redis-guide.md"]
    ),
    "Remix v3": (
        "remix-v3-guide.md",
        ["remix-v3-framework.md"]
    ),
    "Rspack bundler": (
        "rspack-bundle-optimization.md",
        ["rspack-bundler-guide.md"]
    ),
    "shadcn/ui": (
        "shadcn-ui-components-guide.md",
        ["shadcn-ui-guide.md"]
    ),
    "SolidStart": (
        "solidstart-framework-guide.md",
        ["solidstart-meta-framework.md"]
    ),
    "SQLite WASM": (
        "sqlite-wasm-guide.md",
        ["sqlite-wasm-browser.md"]
    ),
    "SST Serverless": (
        "sst-serverless-guide.md",
        ["sst-v3-serverless.md"]
    ),
    "TanStack Router": (
        "tanstack-router-guide.md",
        ["tanstack-router-type-safe.md"]
    ),
    "Temporal API": (
        "temporal-api-guide.md",
        ["temporal-api-date-time.md"]
    ),
    "tRPC guide": (
        "trpc-guide.md",
        ["trpc-fullstack-typescript.md"]
    ),
    "Trigger.dev": (
        "trigger-dev-guide.md",
        ["trigger-dev-background-jobs.md"]
    ),
    "Turso libSQL": (
        "turso-libsql-guide.md",
        ["turso-edge-database.md"]
    ),
    "TypeScript satisfies": (
        "typescript-5-satisfies.md",
        ["typescript-satisfies.md"]
    ),
    "Waku React": (
        "waku-react-framework.md",
        ["waku-react-rsc.md"]
    ),
    "Zig language": (
        "zig-language-guide.md",
        ["zig-programming-intro.md"]
    ),
    "CSS Grid Subgrid": (
        "css-grid-flexbox-complete-guide.md",
        ["css-grid-subgrid-guide.md"]
    ),
}

deleted = []
kept = []
errors = []

for cluster, (keep, delete_list) in CLUSTERS.items():
    keep_path = os.path.join(BLOG_DIR, keep)

    # Find the longest file among all candidates
    candidates = [keep] + delete_list
    best = None
    best_lines = 0
    for c in candidates:
        p = os.path.join(BLOG_DIR, c)
        if os.path.exists(p):
            with open(p) as f:
                lines = f.read().count('\n')
            if lines > best_lines:
                best = c
                best_lines = lines

    if best is None:
        errors.append(f"CLUSTER MISSING: {cluster} - no files found")
        continue

    kept.append(f"  KEEP: {best} ({cluster}, {best_lines} lines)")
    for c in candidates:
        if c != best:
            p = os.path.join(BLOG_DIR, c)
            if os.path.exists(p):
                os.remove(p)
                deleted.append(f"  DEL:  {c} ({cluster})")

remaining = len([f for f in os.listdir(BLOG_DIR) if f.endswith('.md')])

print(f"=== ROUND 2 CONSOLIDATION ===")
print(f"Clusters processed: {len(CLUSTERS)}")
print(f"Articles kept: {len(kept)}")
print(f"Articles deleted: {len(deleted)}")
print(f"Skipped/errors: {len(errors)}")
print(f"Remaining articles: {remaining}")
print()
for line in deleted:
    print(line)
if errors:
    print(f"\n=== ERRORS ({len(errors)}) ===")
    for e in errors:
        print(e)
