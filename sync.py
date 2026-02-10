#!/usr/bin/env python3
"""
Memory Archive Sync — reads local research/dev/management files and
generates library.js for the archive site. Also preserves full daily
memory snapshots before consolidation trims them.

Run before weekly rollups or on demand:
    python3 /root/.openclaw/memory-archive/sync.py

What it does:
1. Reads all .md files from research/, dev/, management/
2. Extracts title, date, summary from each
3. Generates library.js with full content preserved
4. Commits and pushes to GitHub
"""

import os
import re
import json
import subprocess
from pathlib import Path
from datetime import datetime

WORKSPACE = Path('/root/.openclaw/workspace')
ARCHIVE_DIR = Path('/root/.openclaw/memory-archive')
LIBRARY_JS = ARCHIVE_DIR / 'library.js'

# Directories to index
SOURCE_DIRS = {
    'research': WORKSPACE / 'research',
    'dev': WORKSPACE / 'dev',
    'management': WORKSPACE / 'management',
}

# Files to skip (queues, templates, protocols)
SKIP_FILES = {'queue.md', 'TEMPLATE.md', 'PROTOCOL.md', 'CREATIVE-PROTOCOL.md', 'creative-queue.md'}


def extract_title(content: str, filename: str) -> str:
    """Extract title from first H1/H2 heading or derive from filename."""
    for line in content.split('\n')[:10]:
        match = re.match(r'^#{1,2}\s+(.+)', line)
        if match:
            return match.group(1).strip()
    # Fall back to filename
    name = filename.replace('.md', '')
    # Remove date prefix if present
    name = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', name)
    return name.replace('-', ' ').title()


def extract_date(filename: str) -> str:
    """Extract date from filename like 2026-02-09-topic.md."""
    match = re.match(r'(\d{4}-\d{2}-\d{2})', filename)
    if match:
        return match.group(1)
    return 'undated'


def extract_summary(content: str) -> str:
    """Extract first meaningful paragraph as summary."""
    lines = content.split('\n')
    para = []
    started = False
    for line in lines:
        # Skip headings and empty lines at start
        if not started:
            if line.strip() and not line.startswith('#') and not line.startswith('---'):
                started = True
                para.append(line.strip())
        else:
            if line.strip() == '' and para:
                break
            if line.startswith('#'):
                break
            para.append(line.strip())

    summary = ' '.join(para)[:300]
    if len(' '.join(para)) > 300:
        summary += '...'
    return summary


def extract_tags(content: str, category: str) -> list:
    """Auto-detect relevant tags from content."""
    tags = []
    content_lower = content.lower()

    tag_keywords = {
        'youtube': ['youtube', 'yt-dlp', 'broadcast', 'stream'],
        'discord': ['discord', 'bot.py', 'webhook'],
        'twitter': ['twitter', 'x.com', 'tweet', 'x/twitter'],
        'music': ['music', 'soundcloud', 'spotify', 'album', 'track', 'remaster'],
        'vtuber': ['vtuber', 'live2d', 'neuro', 'vedal', 'hololive'],
        'ai': ['ai', 'claude', 'llm', 'neural', 'model', 'inference'],
        'game-dev': ['roguelite', 'game', 'unity', 'godot', 'multiplayer'],
        'ascii-art': ['ascii', 'half-block', 'braille', 'ansi', 'pixel art'],
        'video': ['clip', 'ffmpeg', 'video', 'vod', 'caption'],
        'monetization': ['patreon', 'ko-fi', 'monetiz', 'revenue', 'commission'],
        'growth': ['follower', 'subscriber', 'growth', 'audience', 'seo'],
        'comedy': ['comedy', 'comedian', 'standup', 'kill tony'],
        'philosophy': ['consciousness', 'identity', 'philosophy', 'buddhis'],
        'tiktok': ['tiktok', 'short-form', 'shorts'],
        'api': ['api', 'endpoint', 'oauth', 'token', 'quota'],
    }

    for tag, keywords in tag_keywords.items():
        if any(kw in content_lower for kw in keywords):
            tags.append(tag)

    return tags[:5]  # Max 5 tags


def escape_js_string(s: str) -> str:
    """Escape a string for embedding in JavaScript."""
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')


def scan_files() -> list:
    """Scan all source directories and build library entries."""
    entries = []

    for category, dir_path in SOURCE_DIRS.items():
        if not dir_path.exists():
            continue

        for file_path in sorted(dir_path.glob('*.md')):
            if file_path.name in SKIP_FILES:
                continue

            content = file_path.read_text(encoding='utf-8', errors='replace')
            if len(content.strip()) < 50:
                continue  # Skip near-empty files

            entry = {
                'title': extract_title(content, file_path.name),
                'date': extract_date(file_path.name),
                'category': category,
                'summary': extract_summary(content),
                'tags': extract_tags(content, category),
                'content': content,
                'source': f'{category}/{file_path.name}',
            }
            entries.append(entry)

    # Sort by date descending
    entries.sort(key=lambda e: e['date'], reverse=True)
    return entries


def generate_library_js(entries: list) -> str:
    """Generate library.js content."""
    lines = ['/* === Miru Sou Memory Archive — Library Data === */']
    lines.append('/* Auto-generated by sync.py — do not edit manually */')
    lines.append(f'/* Last sync: {datetime.now().strftime("%Y-%m-%d %H:%M")} */')
    lines.append('')
    lines.append('const LIBRARY = [')

    for entry in entries:
        lines.append('    {')
        lines.append(f'        title: `{escape_js_string(entry["title"])}`,')
        lines.append(f'        date: `{entry["date"]}`,')
        lines.append(f'        category: `{entry["category"]}`,')
        lines.append(f'        summary: `{escape_js_string(entry["summary"])}`,')
        lines.append(f'        tags: {json.dumps(entry["tags"])},')
        lines.append(f'        source: `{entry["source"]}`,')
        lines.append(f'        content: `{escape_js_string(entry["content"])}`,')
        lines.append('    },')

    lines.append('];')
    return '\n'.join(lines)


def git_push(message: str):
    """Commit and push changes to the archive repo."""
    os.chdir(ARCHIVE_DIR)
    subprocess.run(['git', 'add', '-A'], check=True)

    # Check if there are changes
    result = subprocess.run(['git', 'diff', '--cached', '--quiet'])
    if result.returncode == 0:
        print('No changes to commit.')
        return

    subprocess.run(['git', 'commit', '-m', message], check=True)
    subprocess.run(['git', 'push', 'origin', 'main'], check=True)
    print(f'Pushed: {message}')


def main():
    print('Scanning knowledge files...')
    entries = scan_files()
    print(f'Found {len(entries)} library entries across {len(SOURCE_DIRS)} categories')

    print('Generating library.js...')
    js_content = generate_library_js(entries)
    LIBRARY_JS.write_text(js_content, encoding='utf-8')
    print(f'Written {len(js_content):,} bytes to library.js')

    # Category breakdown
    cats = {}
    for e in entries:
        cats[e['category']] = cats.get(e['category'], 0) + 1
    for cat, count in sorted(cats.items()):
        print(f'  {cat}: {count} entries')

    print('Pushing to GitHub...')
    git_push(f'Library sync: {len(entries)} entries ({datetime.now().strftime("%Y-%m-%d %H:%M")})')
    print('Done!')


if __name__ == '__main__':
    main()
