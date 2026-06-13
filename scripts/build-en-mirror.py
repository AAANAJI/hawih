#!/usr/bin/env python3
"""
build-en-mirror.py — Phase 3 bilingual /en/ mirror builder.

Walks every public *.html in the repo root, clones each file into
/en/<filename>, and applies these transformations to the EN clone:

  1. <html lang="ar" dir="rtl">     →  <html lang="en" dir="ltr">
  2. Every <span class="lang-string" data-ar="X" data-en="Y">…</span>
     gets its inner text replaced with Y.
  3. Every <img class="lang-attr" data-attr="alt" data-alt-en="Y" …>
     gets alt="Y".
  4. Every <input class="lang-input" data-placeholder-en="Y" …> gets
     placeholder="Y".
  5. Every internal href="/<path>" (not /assets/, /uc-assets/, /api/,
     /en/, external, or anchor) gets rewritten to href="/en/<path>".
  6. Canonical URL is updated to /en/<path>.
  7. og:url is updated to /en/<path>.
  8. Hreflang trio is injected (idempotent).
  9. Form action="/api/lead.php" gets a hidden <input name="lang"
     value="en"> appended so lead.php can route/label by language.

In every AR original (in place): the same hreflang trio is injected
between anchor comments so re-runs replace cleanly.

Idempotent. The /en/ tree is fully regenerated each run (deleted +
rewritten), so editing /en/ files by hand is futile.

Excluded from mirroring: use-cases.html, theme-assets.html, reference/.

Usage:
  python3 scripts/build-en-mirror.py            # build /en/ mirror
  python3 scripts/build-en-mirror.py --check    # dry-run; exit 1 if
                                                  any file would change
"""
from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EN_DIR = REPO_ROOT / "en"
SITE_ORIGIN = "https://hawih.com.sa"
EXCLUDE_FILES = {"use-cases.html", "theme-assets.html"}

HREFLANG_START = "<!-- HAWIH_HREFLANG_START -->"
HREFLANG_END = "<!-- HAWIH_HREFLANG_END -->"
JSONLD_START = "<!-- HAWIH_JSONLD_START -->"
JSONLD_END = "<!-- HAWIH_JSONLD_END -->"

# Internal paths that should NOT be rewritten to /en/.
PATH_SKIP_PREFIXES = (
    "/assets/", "/uc-assets/", "/api/", "/en/", "/sitemap.xml",
    "/robots.txt", "/favicon.ico",
)


def clean_url(filename: str) -> str:
    if filename == "index.html":
        return "/"
    return f"/{filename[:-5]}"


def en_url(filename: str) -> str:
    if filename == "index.html":
        return "/en/"
    return f"/en/{filename[:-5]}"


def ar_canonical(filename: str) -> str:
    return f"{SITE_ORIGIN}{clean_url(filename)}"


def en_canonical(filename: str) -> str:
    return f"{SITE_ORIGIN}{en_url(filename)}"


# --- lang-string span rewriting -------------------------------------

# Match <span class="lang-string" ... data-en="Y" ...>CONTENT</span>
# Attribute order is variable; class must be lang-string (alone or
# with other tokens). We capture data-en's value via a separate
# search after we've located the span.
LANG_SPAN_RE = re.compile(
    r'<span\b([^>]*\bclass\s*=\s*"[^"]*\blang-string\b[^"]*"[^>]*)>'
    r"([^<]*)</span>",
    re.IGNORECASE,
)
DATA_EN_RE = re.compile(r'\bdata-en\s*=\s*"([^"]*)"', re.IGNORECASE)


def swap_lang_spans(content: str) -> str:
    def replace(match: re.Match) -> str:
        attrs = match.group(1)
        en_match = DATA_EN_RE.search(attrs)
        if not en_match:
            return match.group(0)
        en_text = en_match.group(1)
        # If en is empty, leave the AR content (some spans use empty
        # data-en as a deliberate "no English here" marker).
        if not en_text:
            return match.group(0)
        return f"<span{attrs}>{en_text}</span>"

    return LANG_SPAN_RE.sub(replace, content)


# --- lang-attr image alt rewriting ----------------------------------

# Match <img ... class="... lang-attr ..." ... data-attr="alt" ...
# ... data-alt-en="..." ...>
LANG_IMG_RE = re.compile(
    r"<img\b([^>]*)>",
    re.IGNORECASE,
)
DATA_ALT_EN_RE = re.compile(r'\bdata-alt-en\s*=\s*"([^"]*)"', re.IGNORECASE)
HAS_LANG_ATTR_RE = re.compile(r'\bclass\s*=\s*"[^"]*\blang-attr\b[^"]*"',
                              re.IGNORECASE)
ATTR_RE = re.compile(r'\b(alt)\s*=\s*"[^"]*"', re.IGNORECASE)


def swap_lang_attr_alts(content: str) -> str:
    def replace(match: re.Match) -> str:
        attrs = match.group(1)
        if not HAS_LANG_ATTR_RE.search(attrs):
            return match.group(0)
        en_match = DATA_ALT_EN_RE.search(attrs)
        if not en_match:
            return match.group(0)
        en_alt = en_match.group(1)
        if ATTR_RE.search(attrs):
            new_attrs = ATTR_RE.sub(f'alt="{en_alt}"', attrs, count=1)
        else:
            new_attrs = attrs + f' alt="{en_alt}"'
        return f"<img{new_attrs}>"

    return LANG_IMG_RE.sub(replace, content)


# --- lang-input placeholder rewriting -------------------------------

LANG_INPUT_RE = re.compile(r"<input\b([^>]*)>", re.IGNORECASE)
DATA_PH_EN_RE = re.compile(r'\bdata-placeholder-en\s*=\s*"([^"]*)"',
                           re.IGNORECASE)
HAS_LANG_INPUT_RE = re.compile(r'\bclass\s*=\s*"[^"]*\blang-input\b[^"]*"',
                               re.IGNORECASE)
PLACEHOLDER_RE = re.compile(r'\bplaceholder\s*=\s*"[^"]*"', re.IGNORECASE)


def swap_lang_inputs(content: str) -> str:
    def replace(match: re.Match) -> str:
        attrs = match.group(1)
        if not HAS_LANG_INPUT_RE.search(attrs):
            return match.group(0)
        en_match = DATA_PH_EN_RE.search(attrs)
        if not en_match:
            return match.group(0)
        en_ph = en_match.group(1)
        if PLACEHOLDER_RE.search(attrs):
            new_attrs = PLACEHOLDER_RE.sub(
                f'placeholder="{en_ph}"', attrs, count=1)
        else:
            new_attrs = attrs + f' placeholder="{en_ph}"'
        return f"<input{new_attrs}>"

    return LANG_INPUT_RE.sub(replace, content)


# --- internal href rewriting ----------------------------------------

# href="/X" where X doesn't start with any skip prefix.
INTERNAL_HREF_RE = re.compile(r'\b(href|action)\s*=\s*"(/[^"#]*?)"',
                              re.IGNORECASE)


def rewrite_hrefs(content: str) -> str:
    def replace(match: re.Match) -> str:
        attr = match.group(1)
        path = match.group(2)
        if path == "/":
            # Index → /en/
            return f'{attr}="/en/"'
        if any(path.startswith(p) for p in PATH_SKIP_PREFIXES):
            return match.group(0)
        # Note: /api/ is in PATH_SKIP_PREFIXES, so form actions to
        # /api/lead.php are preserved as-is — never rewritten.
        return f'{attr}="/en{path}"'

    return INTERNAL_HREF_RE.sub(replace, content)


# --- html lang/dir attributes ---------------------------------------

HTML_LANG_RE = re.compile(
    r'<html\b([^>]*)>',
    re.IGNORECASE,
)


def swap_html_lang(content: str) -> str:
    def replace(match: re.Match) -> str:
        attrs = match.group(1)
        # Replace lang="ar" with lang="en"; dir="rtl" with dir="ltr".
        attrs = re.sub(r'\blang\s*=\s*"[^"]*"', 'lang="en"', attrs)
        attrs = re.sub(r'\bdir\s*=\s*"[^"]*"', 'dir="ltr"', attrs)
        return f"<html{attrs}>"

    return HTML_LANG_RE.sub(replace, content, count=1)


# --- meta / link updates --------------------------------------------

def update_canonical(content: str, en_url_abs: str) -> str:
    pattern = re.compile(
        r'<link\s+rel="canonical"\s+href="[^"]*"\s*>',
        re.IGNORECASE,
    )
    return pattern.sub(
        f'<link rel="canonical" href="{en_url_abs}">',
        content,
        count=1,
    )


def update_og_url(content: str, en_url_abs: str) -> str:
    pattern = re.compile(
        r'<meta\s+property="og:url"\s+content="[^"]*"\s*>',
        re.IGNORECASE,
    )
    return pattern.sub(
        f'<meta property="og:url" content="{en_url_abs}">',
        content,
        count=1,
    )


def update_og_locale(content: str) -> str:
    """On the EN page, swap og:locale to en_US and alternate to ar_SA."""
    content = re.sub(
        r'<meta\s+property="og:locale"\s+content="[^"]*"\s*>',
        '<meta property="og:locale" content="en_US">',
        content, count=1,
    )
    content = re.sub(
        r'<meta\s+property="og:locale:alternate"\s+content="[^"]*"\s*>',
        '<meta property="og:locale:alternate" content="ar_SA">',
        content, count=1,
    )
    return content


# --- hreflang injection ---------------------------------------------

def build_hreflang_block(ar_abs: str, en_abs: str) -> str:
    return (
        f"    {HREFLANG_START}\n"
        f'    <link rel="alternate" hreflang="ar-SA" href="{ar_abs}">\n'
        f'    <link rel="alternate" hreflang="en" href="{en_abs}">\n'
        f'    <link rel="alternate" hreflang="x-default" href="{ar_abs}">\n'
        f"    {HREFLANG_END}"
    )


def inject_hreflang(content: str, block: str) -> str:
    """Inject or replace the bracketed hreflang block."""
    if HREFLANG_START in content and HREFLANG_END in content:
        pattern = re.compile(
            rf"[ \t]*{re.escape(HREFLANG_START)}.*?{re.escape(HREFLANG_END)}",
            re.DOTALL,
        )
        return pattern.sub(block, content, count=1)
    # Insert AFTER HAWIH_SEO_HEAD_END (so the hreflang block lives
    # OUTSIDE the SEO_HEAD bracketed region — otherwise inject-head.py's
    # full-block replacement on re-run would wipe the hreflang block).
    # Falls back to before </head> on legacy files.
    if "<!-- HAWIH_SEO_HEAD_END -->" in content:
        return content.replace(
            "<!-- HAWIH_SEO_HEAD_END -->",
            f"<!-- HAWIH_SEO_HEAD_END -->\n{block}",
            1,
        )
    return re.sub(
        r"[ \t]*</head>",
        f"{block}\n  </head>",
        content,
        count=1,
    )


# --- form lang hidden input -----------------------------------------

FORM_LEAD_RE = re.compile(
    r'(<form\b[^>]*action\s*=\s*"/api/lead\.php"[^>]*>)',
    re.IGNORECASE,
)
HIDDEN_LANG_TAG = '<input type="hidden" name="lang" value="en">'


def inject_form_lang(content: str) -> str:
    if HIDDEN_LANG_TAG in content:
        return content
    return FORM_LEAD_RE.sub(
        lambda m: m.group(1) + "\n      " + HIDDEN_LANG_TAG,
        content,
    )


# --- main transformations -------------------------------------------

def strip_jsonld(content: str) -> str:
    """Remove the AR-side JSON-LD bracketed block; inject-jsonld.py
    regenerates EN-prefixed schemas on a subsequent pass. Reduces noise
    when build-en-mirror runs without the full pipeline behind it."""
    pattern = re.compile(
        rf"[ \t]*{re.escape(JSONLD_START)}.*?{re.escape(JSONLD_END)}\n?",
        re.DOTALL,
    )
    return pattern.sub("", content, count=1)


def transform_for_en(filename: str, original: str) -> str:
    en_abs = en_canonical(filename)
    ar_abs = ar_canonical(filename)

    content = original
    content = swap_html_lang(content)
    content = swap_lang_spans(content)
    content = swap_lang_attr_alts(content)
    content = swap_lang_inputs(content)
    content = rewrite_hrefs(content)
    content = update_canonical(content, en_abs)
    content = update_og_url(content, en_abs)
    content = update_og_locale(content)
    content = inject_hreflang(content, build_hreflang_block(ar_abs, en_abs))
    content = inject_form_lang(content)
    content = strip_jsonld(content)
    return content


def transform_for_ar(filename: str, original: str) -> str:
    """Only inject the hreflang trio into the AR original."""
    en_abs = en_canonical(filename)
    ar_abs = ar_canonical(filename)
    return inject_hreflang(original, build_hreflang_block(ar_abs, en_abs))


# --- driver ---------------------------------------------------------

def iter_public_html() -> list[Path]:
    files = []
    for child in sorted(REPO_ROOT.iterdir()):
        if child.is_dir() or child.suffix != ".html":
            continue
        if child.name in EXCLUDE_FILES:
            continue
        files.append(child)
    return files


def rebuild_en_tree(files: list[Path], check: bool) -> int:
    """Wipe + rewrite /en/. Return count of files written."""
    if not check:
        if EN_DIR.exists():
            shutil.rmtree(EN_DIR)
        EN_DIR.mkdir(parents=True)
    written = 0
    for src in files:
        content = src.read_text(encoding="utf-8")
        en_content = transform_for_en(src.name, content)
        dst = EN_DIR / src.name
        if check:
            if not dst.exists() or dst.read_text(encoding="utf-8") != en_content:
                written += 1
        else:
            dst.write_text(en_content, encoding="utf-8")
            written += 1
    return written


def update_ar_originals(files: list[Path], check: bool) -> int:
    changed = 0
    for src in files:
        original = src.read_text(encoding="utf-8")
        updated = transform_for_ar(src.name, original)
        if updated != original:
            changed += 1
            if not check:
                src.write_text(updated, encoding="utf-8")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    files = iter_public_html()
    print(f"Found {len(files)} public AR pages.")

    en_count = rebuild_en_tree(files, args.check)
    print(f"  /en/ tree: {en_count} files "
          f"{'would change' if args.check else 'written'}.")

    ar_count = update_ar_originals(files, args.check)
    print(f"  AR originals (hreflang inject): {ar_count} files "
          f"{'would change' if args.check else 'updated'}.")

    if args.check and (en_count or ar_count):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
