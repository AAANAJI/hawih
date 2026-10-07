#!/usr/bin/env python3
"""
build-careers.py — the /careers page (Careers module, website side).

On the official site shell (via _shell) with a scoped widget driven by
assets/js/careers.js, which talks only to the same-origin proxy
/api/careers.php. Lists open vacancies from the CRM, shows one vacancy +
apply form at ?job=SLUG, and submits the application (incl. CV upload)
back to the CRM.

Writes the AR root page (lang-string spans); build-en-mirror.py produces
/en/careers. The widget is inert-safe: if the CRM has no open openings it
shows an empty state.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _shell  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
ls = _shell.ls

CR_STYLE = """    <!-- careers: scoped widget styles -->
    <style>
    .cr{max-width:860px;margin:0 auto}
    .cr-muted{opacity:.6}
    .cr-list{display:flex;flex-direction:column;gap:14px}
    .cr-card{display:flex;flex-direction:column;gap:6px;padding:24px 26px;border-radius:18px;text-decoration:none;color:inherit;
      border:1px solid var(--hawih-paper-line,rgba(11,11,16,.12));background:var(--hawih-paper-2,#E9E4D7);transition:transform .18s ease,border-color .18s ease}
    .cr-card:hover{transform:translateY(-3px);border-color:var(--hawih-blue,#1F1FFE)}
    .dark .cr-card{background:var(--hawih-ink-2,#14141C);border-color:var(--hawih-ink-line,rgba(255,255,255,.08))}
    .cr-card__t{font-size:1.25rem;font-weight:700}
    .cr-card__m{opacity:.7;font-size:.95rem}
    .cr-card__go{color:var(--hawih-blue,#1F1FFE);font-weight:600;margin-top:6px}
    .cr-empty{text-align:center;padding:40px 0;opacity:.7}
    .cr-back{background:none;border:0;color:var(--hawih-blue,#1F1FFE);font-weight:600;cursor:pointer;padding:0;margin-bottom:18px}
    .cr-job__t{font-size:clamp(1.6rem,4vw,2.2rem);font-weight:700;margin:0 0 8px}
    .cr-job__m{opacity:.7;margin:0 0 24px}
    .cr-job__h{font-size:1.2rem;font-weight:700;margin:26px 0 10px}
    .cr-job__b{line-height:1.9;opacity:.9}
    .cr-apply-h{font-size:1.3rem;font-weight:700;margin:34px 0 18px;padding-top:26px;border-top:1px solid var(--hawih-paper-line,rgba(11,11,16,.12))}
    .cr-hp{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .cr-form-err{color:#c0392b;font-weight:600;margin:0 0 14px}
    .cr-file{display:block;width:100%;padding:.7em .9em;border:1.5px dashed var(--hawih-paper-line,rgba(11,11,16,.3));border-radius:12px;background:transparent;color:inherit;cursor:pointer}
    .cr-done{text-align:center;padding:30px 0}
    .cr-done__icon{font-size:3rem;color:#25D366}
    </style>"""


def field(idn, name, label_ar, label_en, typ="text", extra="", ph="—", md=True):
    col = "col-12 col-md-6" if md else "col-12"
    return (
        f'<div class="{col} mxd-grid-item"><label class="uc-field-label" for="{idn}">{ls(label_ar, label_en)}</label>'
        f'<input type="{typ}" id="{idn}" name="{name}" {extra} placeholder="{ph}"></div>'
    )


def build_body() -> str:
    wa = _shell.wa_url("مرحباً، لديّ سؤال حول الوظائف في هوية.")
    hero = _shell.hero(
        "انضم إلى الفريق · الرياض", "Join the team · Riyadh",
        "الوظائف الشاغرة", "Careers at Hawih",
        "نبني علامات يراها العالم. إن كنت تبحث عن أثرٍ حقيقي في عملك، "
        "اطّلع على الوظائف المتاحة وقدّم سيرتك.",
        "We build brands the world sees. If you want real impact in your "
        "work, browse the open roles and send us your CV.",
        _shell.btn(wa, "سؤال عبر واتساب", "Ask on WhatsApp", "btn-outline", blank=True, icon="ph-whatsapp-logo"))

    exp_opts = "".join(
        f'<option value="{v}">{t}</option>' for v, t in [
            ("", "—"), ("0-1", "أقل من سنة · < 1 yr"), ("1-3", "١–٣ سنوات · 1–3 yrs"),
            ("3-5", "٣–٥ سنوات · 3–5 yrs"), ("5-10", "٥–١٠ سنوات · 5–10 yrs"),
            ("10+", "أكثر من ١٠ · 10+ yrs")])

    form = (
        '<form id="careersForm" novalidate hidden>'
        '<input type="hidden" name="job_opening_id" value="0">'
        '<input type="hidden" name="position" value="">'
        '<div class="cr-hp" aria-hidden="true"><label>Leave empty<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div>'
        f'<p class="cr-apply-h">{ls("قدّم على هذه الوظيفة", "Apply for this role")}</p>'
        '<p class="cr-form-err" hidden></p>'
        '<div class="container-fluid p-0"><div class="row gx-0">'
        + field("cr-first", "first_name", "الاسم الأول", "First name", extra='required maxlength="100" autocomplete="given-name"')
        + field("cr-last", "last_name", "اسم العائلة", "Last name", extra='maxlength="100" autocomplete="family-name"')
        + field("cr-email", "email", "البريد الإلكتروني", "Email", typ="email", extra='required dir="ltr" maxlength="191" autocomplete="email"', ph="you@email.com")
        + field("cr-phone", "phone", "رقم الجوّال", "Phone", typ="tel", extra='dir="ltr" maxlength="50" autocomplete="tel"', ph="+966 5x xxx xxxx")
        + f'<div class="col-12 col-md-6 mxd-grid-item"><label class="uc-field-label" for="cr-exp">{ls("سنوات الخبرة", "Experience")}</label>'
        + f'<select id="cr-exp" name="years_experience" class="">{exp_opts}</select></div>'
        + field("cr-city", "city", "المدينة", "City", extra='maxlength="100"', ph="الرياض · Riyadh")
        + field("cr-link", "linkedin_url", "رابط البروفايل (LinkedIn / أعمالك)", "Profile link (LinkedIn / portfolio)", typ="url", extra='dir="ltr" maxlength="255"', ph="https://", md=False)
        + f'<div class="col-12 mxd-grid-item"><label class="uc-field-label" for="cr-cv">{ls("السيرة الذاتية (PDF / Word · حتى ٥٠ ميجابايت)", "CV (PDF / Word · up to 50MB)")}</label>'
        + '<input type="file" id="cr-cv" name="cv" class="cr-file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div>'
        + f'<div class="col-12 mxd-grid-item"><label class="uc-field-label" for="cr-notes">{ls("نبذة قصيرة (اختياري)", "A short note (optional)")}</label>'
        + '<textarea id="cr-notes" name="notes" maxlength="4000" placeholder="—"></textarea></div>'
        + '<div class="col-12 mxd-grid-item uc-form-submit">'
        + f'<button class="btn btn-anim btn-default btn-large btn-opposite slide-right-up" type="submit">{ls("أرسل الطلب", "Submit application", "btn-caption")}<i class="ph-bold ph-arrow-up-right"></i></button></div>'
        '</div></div></form>'
        '<div class="cr-done" hidden><div class="cr-done__icon"><i class="ph-fill ph-check-circle"></i></div>'
        f'<h2>{ls("تم استلام طلبك", "Application received")}</h2>'
        f'<p>{ls("شكراً لتقديمك. سيطّلع فريق التوظيف على طلبك ويتواصل معك إن كان مناسباً.", "Thanks for applying. Our recruiting team will review your application and reach out if there is a fit.")}</p></div>'
    )

    widget = (
        '      <div class="mxd-section padding-default"><div class="mxd-container grid-container"><div class="mxd-block">'
        '<div id="careers" class="cr">'
        '<div class="cr-list"></div>'
        f'<p class="cr-empty" hidden>{ls("لا توجد وظائف شاغرة حالياً. تابعنا أو راسلنا عبر واتساب.", "No open roles right now. Follow us or reach out on WhatsApp.")}</p>'
        '<div class="cr-detail" hidden>'
        f'<button type="button" class="cr-back">&#8594; {ls("كل الوظائف", "All roles")}</button>'
        '<div class="cr-job"></div>'
        + form +
        '</div>'
        '</div></div></div></div>'
        '\n      <script src="/assets/js/careers.js" defer></script>'
    )
    return hero + widget


def main() -> int:
    prefix, main_open, suffix = _shell.load_shell()
    head = _shell.swap_head(
        prefix,
        title="الوظائف الشاغرة في هوية | انضم إلى الفريق — Hawih Careers",
        desc="وظائف شاغرة في استوديو هوية بالرياض — تصميم، تطوير، محتوى، "
             "وتسويق. اطّلع على الوظائف المتاحة وقدّم سيرتك الذاتية مباشرة.",
        keywords="وظائف هوية, توظيف تصميم الرياض, وظائف تصميم جرافيك, hawih careers, "
                 "design jobs riyadh",
        og_title="الوظائف الشاغرة في هوية",
        og_desc="اطّلع على الوظائف المتاحة في استوديو هوية وقدّم سيرتك الذاتية.",
        title_en="Careers at Hawih — Join the Team",
        desc_en="Open roles at Hawih studio in Riyadh — design, development, "
                "content, and marketing. Browse the openings and send your CV.",
        og_title_en="Careers at Hawih",
        og_desc_en="Browse open roles at Hawih studio and send your CV.",
        extra_style=CR_STYLE)
    html = head + "\n" + main_open + "\n" + build_body() + "\n    </main>\n" + suffix
    out = REPO_ROOT / "careers.html"
    out.write_text(html, encoding="utf-8")
    print(f"  ~ {out.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
