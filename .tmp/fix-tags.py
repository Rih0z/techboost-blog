#!/usr/bin/env python3
"""
Fix articles with only generic tags (e.g., just ['プログラミング']).
Adds specific technology tags based on title/content analysis.
"""
import os
import re

BLOG_DIR = "/Users/kokiriho/Documents/Projects/makemoney/sites/blog/src/content/blog"

# Mapping: keyword in title/filename -> tags to add
TAG_RULES = [
    # Frontend
    (r'react|jsx|hooks|usestate|useeffect', ['React', 'フロントエンド']),
    (r'next\.?js|nextjs|app.?router|server.?component', ['Next.js', 'React', 'フロントエンド']),
    (r'vue|vuejs|nuxt|composition.?api', ['Vue.js', 'フロントエンド']),
    (r'angular', ['Angular', 'フロントエンド']),
    (r'svelte|sveltekit', ['Svelte', 'フロントエンド']),
    (r'solid\.?js|solidjs|solidstart', ['SolidJS', 'フロントエンド']),
    (r'typescript|ts ', ['TypeScript', 'フロントエンド']),
    (r'javascript|js |ecmascript|es20', ['JavaScript', 'フロントエンド']),
    (r'css|tailwind|スタイル|scss|sass', ['CSS', 'フロントエンド']),
    (r'html|web.?component|dom ', ['HTML', 'フロントエンド']),

    # Backend
    (r'node\.?js|nodejs|express|fastify|nest\.?js', ['Node.js', 'バックエンド']),
    (r'python|django|flask|fastapi', ['Python', 'バックエンド']),
    (r'rust ', ['Rust', 'バックエンド']),
    (r'go |golang', ['Go', 'バックエンド']),
    (r'graphql|apollo', ['GraphQL', 'バックエンド']),
    (r'rest.?api|api設計|openapi', ['API', 'バックエンド']),
    (r'prisma|drizzle|orm|database|sql|postgres|mysql|sqlite', ['データベース', 'バックエンド']),

    # DevOps/Infra
    (r'docker|container|コンテナ', ['Docker', 'インフラ']),
    (r'kubernetes|k8s', ['Kubernetes', 'インフラ']),
    (r'aws|amazon', ['AWS', 'クラウド']),
    (r'ci.?cd|github.?actions|pipeline', ['CI/CD', 'DevOps']),
    (r'terraform|iac|infrastructure', ['インフラ', 'DevOps']),
    (r'linux|ubuntu|debian', ['Linux', 'インフラ']),
    (r'nginx|caddy|server', ['インフラ']),

    # Tools
    (r'git |github|gitops', ['Git', '開発ツール']),
    (r'vscode|vim|neovim|ide|editor', ['開発ツール']),
    (r'webpack|vite|esbuild|rspack|bundle', ['ビルドツール', 'フロントエンド']),
    (r'test|jest|vitest|playwright|cypress|e2e', ['テスト', '開発効率化']),
    (r'monorepo|turborepo|nx ', ['開発ツール']),

    # AI
    (r'ai|claude|chatgpt|gpt|llm|prompt|copilot|機械学習', ['AI', '開発効率化']),

    # Career/Business
    (r'転職|キャリア|年収|career', ['キャリア']),
    (r'副業|フリーランス|freelance', ['フリーランス']),
    (r'確定申告|税金|節税|会計|freee', ['確定申告', 'フリーランス']),
]

GENERIC_TAGS = {'プログラミング', 'Web開発', 'web開発'}

stats = {"fixed": 0, "already_ok": 0, "errors": 0}

for f in sorted(os.listdir(BLOG_DIR)):
    if not f.endswith('.md'):
        continue

    path = os.path.join(BLOG_DIR, f)
    with open(path, 'r', encoding='utf-8') as fh:
        content = fh.read()

    # Extract frontmatter
    fm_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not fm_match:
        continue

    fm_text = fm_match.group(1)

    # Extract current tags
    tags_match = re.search(r"tags:\s*\[(.*?)\]", fm_text, re.DOTALL)
    if not tags_match:
        continue

    tags_str = tags_match.group(1)
    current_tags = [t.strip().strip("'\"") for t in tags_str.split(',')]
    current_tags = [t for t in current_tags if t]

    # Check if only generic tags
    non_generic = [t for t in current_tags if t not in GENERIC_TAGS]
    if len(non_generic) >= 2:
        stats["already_ok"] += 1
        continue

    # Determine tags from title + filename
    title_match = re.search(r"title:\s*['\"]?(.*?)['\"]?\s*$", fm_text, re.MULTILINE)
    title = title_match.group(1) if title_match else ''
    search_text = (title + ' ' + f).lower()

    new_tags = set(current_tags)
    for pattern, tags_to_add in TAG_RULES:
        if re.search(pattern, search_text, re.IGNORECASE):
            for tag in tags_to_add:
                new_tags.add(tag)

    # Remove bare 'プログラミング' if we have better tags
    specific_tags = new_tags - GENERIC_TAGS
    if len(specific_tags) >= 2 and 'プログラミング' in new_tags:
        new_tags.discard('プログラミング')

    # Limit to 5 tags
    new_tags_list = sorted(new_tags)[:5]

    if set(new_tags_list) == set(current_tags):
        stats["already_ok"] += 1
        continue

    # Build new tags string
    new_tags_yaml = "[" + ", ".join(f"'{t}'" for t in new_tags_list) + "]"
    new_fm_text = re.sub(r"tags:\s*\[.*?\]", f"tags: {new_tags_yaml}", fm_text, flags=re.DOTALL)

    if new_fm_text == fm_text:
        stats["errors"] += 1
        continue

    body = content[fm_match.end():]
    new_content = f"---\n{new_fm_text}\n---\n{body}"

    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(new_content)

    stats["fixed"] += 1
    if stats["fixed"] <= 15:
        print(f"  {f}: {current_tags} -> {new_tags_list}")

print(f"\n=== Tag Normalization Results ===")
print(f"Fixed: {stats['fixed']}")
print(f"Already OK: {stats['already_ok']}")
print(f"Errors: {stats['errors']}")
