#!/usr/bin/env python3
"""
inject-head.py — Phase 0 SEO head injector for Hawih.

Walks every public *.html file in the repo root (excluding reference/,
use-cases.html, theme-assets.html, and the generated en/ tree) and
inserts a bracketed SEO meta block after the existing
"<!-- Facebook Metadata End -->" anchor.

The injected block carries:
  - <link rel="canonical">
  - <meta name="robots">
  - og:type, og:locale, og:locale:alternate, og:site_name
  - Twitter Cards (summary_large_image)

Idempotent: bracketed by <!-- HAWIH_SEO_HEAD_START --> /
<!-- HAWIH_SEO_HEAD_END -->. Re-running atomically replaces the block.

Usage:
  python3 scripts/inject-head.py            # walk and write
  python3 scripts/inject-head.py --check    # dry-run, exits 1 if any
                                              file would change
"""
from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SITE_ORIGIN = "https://hawih.com.sa"
EXCLUDE_FILES = {"use-cases.html", "theme-assets.html"}
EXCLUDE_DIRS = {"reference", "en", "scripts", "seo", "assets",
                "uc-assets", "api", "node_modules", ".git"}

MEASUREMENT_CONFIG_PATH = REPO_ROOT / "seo" / "measurement.yaml"
MEASUREMENT_START = "<!-- HAWIH_MEASUREMENT_START -->"
MEASUREMENT_END = "<!-- HAWIH_MEASUREMENT_END -->"

START_ANCHOR = "<!-- HAWIH_SEO_HEAD_START -->"
END_ANCHOR = "<!-- HAWIH_SEO_HEAD_END -->"
FB_END_ANCHOR = "<!-- Facebook Metadata End -->"

# Perf head block — injected AFTER the template stylesheets so its
# @font-face rules override the ones from plugins.min.css (Phosphor
# icon fonts with font-display:block → swap).
PERF_START = "<!-- HAWIH_PERF_HEAD_START -->"
PERF_END = "<!-- HAWIH_PERF_HEAD_END -->"
TEMPLATE_STYLES_END_ANCHOR = "<!-- Template Styles End -->"
PERF_BLOCK = (
    f"    {PERF_START}\n"
    f"    <!-- Perf: Phosphor font-display:swap override + Tailwind utility shim -->\n"
    f'    <link rel="stylesheet" type="text/css" href="/assets/css/font-display-fix.css">\n'
    f'    <link rel="stylesheet" type="text/css" href="/assets/css/tailwind-shim.css">\n'
    f"    {PERF_END}"
)

# URL-aware FOUC language guard. Replaces the legacy localStorage-only
# version with one that derives lang from the URL (/en/* = en; / = ar).
# This is the only correct behaviour now that /en/ pages exist —
# trusting localStorage alone would flash AR styling on EN URLs.
FOUC_GUARD_BLOCK = """    <!-- FOUC guard: pick lang before paint -->
    <script>
      (function () {
        try {
          var p = location.pathname;
          var lang = (p === '/en' || p.indexOf('/en/') === 0) ? 'en' : 'ar';
          document.documentElement.lang = lang;
          document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
        } catch (e) {}
      })();
    </script>"""

# Legacy FOUC guard regex — matches the previous localStorage-based
# implementation so we can replace it idempotently.
LEGACY_FOUC_RE = re.compile(
    r"[ \t]*<!--\s*FOUC guard[^>]*-->\s*"
    r"<script>\s*\(function\s*\(\)\s*\{.*?\}\)\(\);\s*</script>",
    re.DOTALL,
)

ARTICLE_PREFIXES = ("service-", "work-")


def canonical_for(filename: str, prefix: str = "") -> str:
    """Map an HTML filename to its public clean URL.

    `prefix` is "" for AR files in repo root, "/en" for EN files."""
    if filename == "index.html":
        return f"{SITE_ORIGIN}{prefix}/"
    return f"{SITE_ORIGIN}{prefix}/{filename[:-5]}"


def og_locales_for(prefix: str) -> tuple[str, str]:
    """Return (primary, alternate) og:locale values."""
    if prefix == "/en":
        return "en_US", "ar_SA"
    return "ar_SA", "en_US"


def og_type_for(filename: str) -> str:
    if any(filename.startswith(p) for p in ARTICLE_PREFIXES):
        return "article"
    return "website"


def read_meta(content: str, attr: str, value: str) -> str | None:
    """Pull the content="..." value from a <meta {attr}="{value}"> tag."""
    pattern = (
        rf'<meta\s+(?:[^>]*\s)?{re.escape(attr)}\s*=\s*'
        rf'["\']{re.escape(value)}["\'][^>]*\scontent\s*=\s*'
        rf'["\']([^"\']*)["\']'
    )
    m = re.search(pattern, content, re.IGNORECASE)
    return m.group(1) if m else None


def get_title(content: str) -> str | None:
    m = re.search(r"<title>([^<]*)</title>", content, re.IGNORECASE)
    return m.group(1).strip() if m else None


def build_block(filename: str, content: str, prefix: str = "") -> str:
    canonical = canonical_for(filename, prefix)
    og_type = og_type_for(filename)
    og_locale, og_alt = og_locales_for(prefix)

    og_title = read_meta(content, "property", "og:title") or get_title(content) or ""
    og_desc = read_meta(content, "property", "og:description") or \
        read_meta(content, "name", "description") or ""

    # Escape for HTML attribute context.
    og_title_e = html.escape(og_title, quote=True)
    og_desc_e = html.escape(og_desc, quote=True)

    return (
        f"    {START_ANCHOR}\n"
        f"    <!-- SEO: canonical, robots, OG completion, Twitter Cards -->\n"
        f'    <link rel="canonical" href="{canonical}">\n'
        f'    <meta name="robots" content="index,follow,max-image-preview:large">\n'
        f'    <meta property="og:type" content="{og_type}">\n'
        f'    <meta property="og:locale" content="{og_locale}">\n'
        f'    <meta property="og:locale:alternate" content="{og_alt}">\n'
        f'    <meta property="og:site_name" content="Hawih">\n'
        f'    <meta name="twitter:card" content="summary_large_image">\n'
        f'    <meta name="twitter:site" content="@hawihcom">\n'
        f'    <meta name="twitter:title" content="{og_title_e}">\n'
        f'    <meta name="twitter:description" content="{og_desc_e}">\n'
        f'    <meta name="twitter:image" content="{SITE_ORIGIN}/assets/img/hawih-og.jpg">\n'
        f"    {END_ANCHOR}"
    )


def update_fouc_guard(content: str) -> str:
    """Idempotently replace the legacy FOUC guard with the URL-aware one."""
    if LEGACY_FOUC_RE.search(content):
        return LEGACY_FOUC_RE.sub(FOUC_GUARD_BLOCK, content, count=1)
    return content


def update_perf_block(content: str) -> str:
    """Inject (or replace) the perf head block.
    Sits AFTER `<!-- Template Styles End -->` so its @font-face rules
    and utility shim override the template's declarations. version-
    assets.py later stamps each link with `?v=<hash>`; we strip those
    stamps from the existing block before comparing so we only re-
    write when the SET of links actually changes."""
    if PERF_START in content and PERF_END in content:
        pattern = re.compile(
            rf"[ \t]*{re.escape(PERF_START)}.*?{re.escape(PERF_END)}",
            re.DOTALL,
        )
        m = pattern.search(content)
        if m:
            existing_stripped = re.sub(r"\?v=[a-f0-9]+", "", m.group(0))
            if existing_stripped == PERF_BLOCK:
                return content
        return pattern.sub(PERF_BLOCK, content, count=1)
    if TEMPLATE_STYLES_END_ANCHOR in content:
        return content.replace(
            TEMPLATE_STYLES_END_ANCHOR,
            f"{TEMPLATE_STYLES_END_ANCHOR}\n\n{PERF_BLOCK}",
            1,
        )
    return content


def load_measurement_config() -> dict:
    """Read seo/measurement.yaml. Returns empty dict if missing/invalid."""
    if not MEASUREMENT_CONFIG_PATH.is_file():
        return {}
    raw = MEASUREMENT_CONFIG_PATH.read_text(encoding="utf-8")
    # Tiny YAML subset parser — we only support `key: value` lines so we
    # don't drag in PyYAML just for this. Strings are unquoted scalars
    # or double-quoted; everything else is ignored as comment.
    cfg: dict = {}
    for line in raw.splitlines():
        line = line.split("#", 1)[0].rstrip()
        if not line or ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip()
        val = val.strip()
        if val.startswith('"') and val.endswith('"'):
            val = val[1:-1]
        cfg[key] = val
    return cfg


def build_measurement_block(cfg: dict) -> str:
    """Render the conditional measurement block.

    Always wraps in anchor comments so re-runs replace cleanly. If the
    config has no IDs set, the block is just the anchor pair (no body),
    which is still idempotent and removable later."""
    ga4 = (cfg.get("ga4_measurement_id") or "").strip()
    gsc = (cfg.get("gsc_verification") or "").strip()
    bing = (cfg.get("bing_verification") or "").strip()

    parts = [f"    {MEASUREMENT_START}"]
    if gsc:
        parts.append(
            f'    <meta name="google-site-verification" content="{gsc}">'
        )
    if bing:
        parts.append(f'    <meta name="msvalidate.01" content="{bing}">')
    if ga4:
        # GA4 + Consent Mode v2. Consent defaults to denied so no
        # identifying hits fire until the user explicitly accepts via
        # the consent banner (hawih.js).
        parts.extend([
            "    <!-- GA4: Consent Mode v2 + gtag.js. Hits only fire",
            "         after the user accepts via the consent banner. -->",
            "    <script>",
            "      window.dataLayer = window.dataLayer || [];",
            "      function gtag(){dataLayer.push(arguments);}",
            "      gtag('js', new Date());",
            "      gtag('consent', 'default', {",
            "        ad_storage: 'denied',",
            "        ad_user_data: 'denied',",
            "        ad_personalization: 'denied',",
            "        analytics_storage: 'denied',",
            "        wait_for_update: 500",
            "      });",
            f"      gtag('config', '{ga4}', {{",
            "        anonymize_ip: true,",
            "        send_page_view: false",
            "      });",
            f'      window.HAWIH_GA4_ID = "{ga4}";',
            "    </script>",
            (f'    <script async src="https://www.googletagmanager.com/'
             f'gtag/js?id={ga4}"></script>'),
        ])
    parts.append(f"    {MEASUREMENT_END}")
    return "\n".join(parts)


def update_measurement_block(content: str, block: str) -> str:
    if MEASUREMENT_START in content and MEASUREMENT_END in content:
        pattern = re.compile(
            rf"[ \t]*{re.escape(MEASUREMENT_START)}.*?{re.escape(MEASUREMENT_END)}",
            re.DOTALL,
        )
        return pattern.sub(block, content, count=1)
    # Insert AFTER the SEO head close anchor so the block lives outside
    # the SEO_HEAD bracketed region and isn't wiped by full-block
    # SEO_HEAD replacements on subsequent re-runs.
    if END_ANCHOR in content:
        return content.replace(
            END_ANCHOR,
            f"{END_ANCHOR}\n{block}",
            1,
        )
    return re.sub(
        r"[ \t]*</head>",
        f"{block}\n  </head>",
        content,
        count=1,
    )


def update_file(path: Path, check: bool,
                measurement_block: str = "",
                prefix: str = "") -> bool:
    """Return True if the file was (or would be) changed."""
    original = path.read_text(encoding="utf-8")
    new_block = build_block(path.name, original, prefix)

    # First normalize the FOUC guard (idempotent).
    working = update_fouc_guard(original)
    # Inject the perf head block (font-display-fix.css link).
    working = update_perf_block(working)

    # SEO head block (canonical, robots, OG, Twitter).
    if START_ANCHOR in working and END_ANCHOR in working:
        pattern = re.compile(
            rf"[ \t]*{re.escape(START_ANCHOR)}.*?{re.escape(END_ANCHOR)}",
            re.DOTALL,
        )
        updated = pattern.sub(new_block, working, count=1)
    elif FB_END_ANCHOR in working:
        updated = working.replace(
            FB_END_ANCHOR,
            f"{FB_END_ANCHOR}\n\n{new_block}",
            1,
        )
    else:
        print(f"  ! {path.name}: no FB anchor; skipped", file=sys.stderr)
        return False

    # Measurement block (GA4, GSC, Bing verification).
    if measurement_block:
        updated = update_measurement_block(updated, measurement_block)

    if updated == original:
        return False
    if not check:
        path.write_text(updated, encoding="utf-8")
    return True


def iter_html() -> list[tuple[Path, str]]:
    """Yield (path, prefix) pairs. prefix is '' for AR, '/en' for EN."""
    pairs = []
    for child in sorted(REPO_ROOT.iterdir()):
        if child.is_dir():
            continue
        if child.suffix != ".html":
            continue
        if child.name in EXCLUDE_FILES:
            continue
        pairs.append((child, ""))
    en_dir = REPO_ROOT / "en"
    if en_dir.is_dir():
        for child in sorted(en_dir.iterdir()):
            if child.suffix == ".html" and child.name not in EXCLUDE_FILES:
                pairs.append((child, "/en"))
    return pairs


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true",
                        help="dry-run; exit non-zero if anything would change")
    args = parser.parse_args()

    cfg = load_measurement_config()
    measurement_block = build_measurement_block(cfg)
    enabled = bool((cfg.get("ga4_measurement_id") or "").strip()
                   or (cfg.get("gsc_verification") or "").strip()
                   or (cfg.get("bing_verification") or "").strip())
    if enabled:
        print(f"Measurement config: GA4={bool(cfg.get('ga4_measurement_id'))}, "
              f"GSC={bool(cfg.get('gsc_verification'))}, "
              f"Bing={bool(cfg.get('bing_verification'))}")
    else:
        print("Measurement config: all empty (no GA4/GSC/Bing tags emitted)")

    pairs = iter_html()
    changed = 0
    for path, prefix in pairs:
        if update_file(path, args.check, measurement_block, prefix):
            changed += 1
            print(f"  ~ {path.relative_to(REPO_ROOT)}")
        else:
            print(f"  = {path.relative_to(REPO_ROOT)}")

    print(f"\n{changed}/{len(pairs)} files {'would change' if args.check else 'updated'}.")
    if args.check and changed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
