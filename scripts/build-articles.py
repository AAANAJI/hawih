#!/usr/bin/env python3
"""
build-articles.py — Hawih bilingual SEO article engine.

Generates the article hub + guides on the OFFICIAL site theme:
  articles.html, article-<slug>.html

Content lives in scripts/articles-content.json (ARTICLES + LINK_TARGETS +
PUBLISH_DATE); rendering is shared with the landing pages in
scripts/_shell.py, which clones the real template shell so articles are
visually native (real header/nav/footer) and reads as long-form prose
with a TOC, related-service links, an FAQ, and a closing CTA band.

After running, run the SEO pipeline (build-en-mirror → inject-head →
inject-jsonld → generate-sitemap → version-assets). inject-jsonld reads
the article-meta sidecar this writes to emit Article + FAQPage schema.

Idempotent.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _shell  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT = json.loads(
    (REPO_ROOT / "scripts" / "articles-content.json").read_text(encoding="utf-8"))
ARTICLES = CONTENT["ARTICLES"]
LINK_TARGETS = CONTENT["LINK_TARGETS"]
PUBLISH_DATE = CONTENT["PUBLISH_DATE"]


def render_hub() -> str:
    prefix, main_open, suffix = _shell.load_shell()
    head = _shell.swap_head(
        prefix,
        title="مقالات ودلائل في التصميم والهوية البصرية | هوية Hawih",
        desc="دلائل عملية في تصميم الشعارات والهوية البصرية وبروفايل الشركات "
             "والمواقع والمحتوى — من استوديو هوية في الرياض.",
        keywords="مقالات تصميم, دلائل الهوية البصرية, مدونة هوية, design articles arabic",
        og_title="مقالات ودلائل التصميم | هوية",
        og_desc="دلائل عملية في التصميم والهوية البصرية من استوديو هوية.",
        title_en="Design & Branding Articles and Guides | Hawih",
        desc_en="Practical guides on logo design, brand identity, company "
                "profiles, websites, and content — from Hawih studio, Riyadh.",
        og_title_en="Design & Branding Guides | Hawih",
        og_desc_en="Practical design & branding guides from Hawih studio.")
    cards = []
    for a in ARTICLES:
        cards.append(
            '<div class="col-12 col-xl-6 mxd-grid-item anim-uni-in-up">'
            f'<a class="hx-card" href="/article-{a["slug"]}">'
            f'<i class="ph-bold ph-article" style="color:var(--hawih-blue,#1F1FFE);font-size:1.7rem"></i>'
            f'<h4>{_shell.ls(*a["kw"])}</h4>'
            f'<p>{_shell.ls(*a["excerpt"])}</p>'
            f'<span class="hx-card__more">{_shell.ls("اقرأ الدليل", "Read the guide")} {_shell.ARROW}</span>'
            '</a></div>'
        )
    body = (
        _shell.hero("المقالات والدلائل", "Articles & guides",
                    "دلائل عملية في التصميم والهوية البصرية",
                    "Practical guides on design & brand identity",
                    "مقالات تساعدك على اتخاذ قرارات أوضح حول علامتك التجارية — من فريق هوية.",
                    "Articles to help you make clearer decisions about your brand — from the Hawih team.",
                    _shell.btn("https://wa.me/966502185471", "تواصل عبر واتساب", "Chat on WhatsApp", "btn-opposite", blank=True, icon="ph-whatsapp-logo"))
        + _shell.open_section("padding-default")
        + '<div class="mxd-block"><div class="container-fluid px-0"><div class="row g-4">'
        + "".join(cards) + "</div></div></div>" + _shell.CLOSE_SECTION
        + _shell.promo_band("عندك مشروع في ذهنك؟", "Got a project in mind?",
                            "مرحباً، أرغب باستشارة حول مشروعي.")
    )
    return head + "\n" + main_open + "\n" + body + "\n    </main>\n" + suffix


def main() -> int:
    meta_sidecar: dict = {}
    for a in ARTICLES:
        (REPO_ROOT / f"article-{a['slug']}.html").write_text(
            _shell.render_article(a, LINK_TARGETS, PUBLISH_DATE),
            encoding="utf-8")
        meta_sidecar[f"article-{a['slug']}"] = {
            "headline_ar": a["kw"][0], "headline_en": a["kw"][1],
            "desc_ar": a["description"], "desc_en": a["description_en"],
            "date": PUBLISH_DATE,
            "faq": [{"q_ar": q[0], "q_en": q[1], "a_ar": q[2], "a_en": q[3]}
                    for q in a["faq"]],
        }
        print(f"  ~ article-{a['slug']}.html")
    (REPO_ROOT / "articles.html").write_text(render_hub(), encoding="utf-8")
    print("  ~ articles.html")
    sidecar = REPO_ROOT / "seo" / "jsonld" / "article-meta.json"
    sidecar.write_text(json.dumps(meta_sidecar, ensure_ascii=False, indent=2)
                       + "\n", encoding="utf-8")
    print(f"  ~ {sidecar.relative_to(REPO_ROOT)}")
    print(f"\n{len(ARTICLES)} articles + hub written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
