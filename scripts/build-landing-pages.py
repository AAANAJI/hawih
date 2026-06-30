#!/usr/bin/env python3
"""
build-landing-pages.py — Hawih PPC / SEO service landing pages.

Generates the ad-group landing pages on the OFFICIAL site theme:
  logo-design.html  brand-identity.html  company-profile.html
  website-design.html  content-writing.html

Content lives in scripts/landing-content.json (PAGES + shared PROCESS);
rendering is shared with the article engine in scripts/_shell.py, which
clones the real template shell (header/nav/footer/CSS) so the pages are
visually native, and composes conversion sections: hero with WhatsApp /
call / portfolio-PDF CTAs, a prominent lead form (project_type pre-filled
→ auto-tagged in the CRM), a client trust strip, a real work showcase,
deliverables, process, FAQ, and a closing CTA band.

After running, run the SEO pipeline (build-en-mirror → inject-head →
inject-jsonld → generate-sitemap → version-assets) to build the /en
mirror and the per-page SEO/JSON-LD.

Idempotent: overwrites the AR root files + the FAQ sidecar each run.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _shell  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT = json.loads(
    (REPO_ROOT / "scripts" / "landing-content.json").read_text(encoding="utf-8"))
PAGES = CONTENT["PAGES"]
PROCESS = CONTENT["PROCESS"]


def main() -> int:
    faq_sidecar: dict = {}
    for page in PAGES:
        out = REPO_ROOT / f"{page['slug']}.html"
        out.write_text(_shell.render_landing(page, PROCESS), encoding="utf-8")
        faq_sidecar[page["slug"]] = [
            {"q_ar": q[0], "q_en": q[1], "a_ar": q[2], "a_en": q[3]}
            for q in page["faq"]
        ]
        print(f"  ~ {out.name}")
    sidecar = REPO_ROOT / "seo" / "jsonld" / "landing-faq.json"
    sidecar.write_text(json.dumps(faq_sidecar, ensure_ascii=False, indent=2)
                       + "\n", encoding="utf-8")
    print(f"  ~ {sidecar.relative_to(REPO_ROOT)}")
    print(f"\n{len(PAGES)} landing pages written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
