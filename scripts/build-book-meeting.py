#!/usr/bin/env python3
"""
build-book-meeting.py — the /book-meeting page for the Meeting Booking
module (spec §10). Renders on the official site shell (via _shell) with a
scoped booking widget in <main> driven by assets/js/booking.js, which
talks only to the same-origin proxy /api/booking.php.

Bilingual: this writes the AR root page (with lang-string spans);
build-en-mirror.py produces /en/book-meeting from it. The widget is inert
until the CRM's meetings_api is enabled (the proxy passes through the
CRM's 404), so the page is safe to ship ahead of the CRM side.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _shell  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
ls = _shell.ls

BK_STYLE = """    <!-- book-meeting: scoped widget styles -->
    <style>
    .bk{max-width:900px;margin:0 auto}
    .bk-steps{display:flex;flex-wrap:wrap;gap:10px;list-style:none;margin:0 0 30px;padding:0;justify-content:center}
    .bk-steps li{display:flex;align-items:center;gap:.5em;font-weight:600;opacity:.5;font-size:.98rem}
    .bk-steps li.is-active,.bk-steps li.is-done{opacity:1}
    .bk-steps li b{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;
      background:var(--hawih-paper-2,#E9E4D7);color:inherit;font-size:.9rem}
    .bk-steps li.is-active b{background:var(--hawih-blue,#1F1FFE);color:#fff}
    .dark .bk-steps li b{background:var(--hawih-ink-2,#14141C)}
    .bk-typecards{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .bk-type{display:flex;flex-direction:column;align-items:flex-start;gap:8px;text-align:start;cursor:pointer;
      padding:26px;border-radius:18px;border:1.5px solid var(--hawih-paper-line,rgba(11,11,16,.14));
      background:var(--hawih-paper-2,#E9E4D7);color:inherit;transition:border-color .18s ease,transform .18s ease}
    .bk-type:hover{transform:translateY(-3px)}
    .bk-type.is-sel{border-color:var(--hawih-blue,#1F1FFE)}
    .dark .bk-type{background:var(--hawih-ink-2,#14141C);border-color:var(--hawih-ink-line,rgba(255,255,255,.08))}
    .bk-type i{font-size:1.9rem;color:var(--hawih-blue,#1F1FFE)}
    .bk-type b{font-size:1.15rem;font-weight:700}
    .bk-type span{opacity:.72}
    .bk-when{display:grid;grid-template-columns:1fr 1fr;gap:26px;align-items:start}
    .bk-cal__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .bk-cal__month{font-weight:700;font-size:1.1rem}
    .bk-nav{width:38px;height:38px;border-radius:10px;border:1px solid var(--hawih-paper-line,rgba(11,11,16,.14));
      background:transparent;color:inherit;cursor:pointer;font-size:1.3rem;line-height:1}
    .bk-nav:disabled{opacity:.3;cursor:default}
    .bk-cal__grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
    .bk-cal__wd{text-align:center;font-size:.78rem;opacity:.6;padding:4px 0}
    .bk-cal__pad{aspect-ratio:1}
    .bk-day{aspect-ratio:1;border-radius:10px;border:1px solid transparent;background:var(--hawih-paper-2,#E9E4D7);
      color:inherit;cursor:pointer;font-weight:600;transition:background .15s ease}
    .dark .bk-day{background:var(--hawih-ink-2,#14141C)}
    .bk-day:hover{background:var(--hawih-blue-soft,rgba(31,31,254,.12))}
    .bk-day.is-off{opacity:.3;cursor:default;background:transparent}
    .bk-day.is-sel{background:var(--hawih-blue,#1F1FFE);color:#fff}
    .bk-slots__day{font-weight:700;margin:0 0 12px}
    .bk-slots__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px}
    .bk-slot{padding:.7em .5em;border-radius:10px;border:1px solid var(--hawih-paper-line,rgba(11,11,16,.14));
      background:transparent;color:inherit;cursor:pointer;font-weight:600;font-variant-numeric:tabular-nums}
    .bk-slot:hover{border-color:var(--hawih-blue,#1F1FFE);color:var(--hawih-blue,#1F1FFE)}
    .bk-muted{opacity:.6}
    .bk-alert{color:var(--hawih-blue,#1F1FFE);font-weight:600}
    .bk-back{background:none;border:0;color:var(--hawih-blue,#1F1FFE);font-weight:600;cursor:pointer;padding:0;margin-bottom:18px}
    .bk-summary{display:inline-block;background:var(--hawih-blue-soft,rgba(31,31,254,.10));color:var(--hawih-blue,#1F1FFE);
      font-weight:600;padding:.5em 1em;border-radius:999px;margin-bottom:22px}
    .bk-hp{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .bk-form-err{color:#c0392b;font-weight:600;margin-bottom:14px}
    .bk .is-invalid{border-color:#c0392b !important}
    .bk-done{text-align:center;padding:20px 0}
    .bk-done__icon{font-size:3rem;color:#25D366}
    .bk-done__when{font-weight:700;font-size:1.2rem;margin:10px 0}
    .bk-managelink,.bk-done__manage a{color:var(--hawih-blue,#1F1FFE);font-weight:600}
    @media (max-width:767px){.bk-typecards,.bk-when{grid-template-columns:1fr}}
    </style>"""


def field(idn, name, label_ar, label_en, typ="text", extra="", ph="—"):
    return (
        f'<div class="col-12 col-md-6 mxd-grid-item"><label class="uc-field-label" for="{idn}">'
        f'{ls(label_ar, label_en)}</label>'
        f'<input type="{typ}" id="{idn}" name="{name}" {extra} placeholder="{ph}"></div>'
    )


def build_body() -> str:
    wa = _shell.wa_url("مرحباً، أرغب بحجز موعد اجتماع مع فريق هوية.")
    hero = _shell.hero(
        "احجز موعداً · الرياض", "Book a meeting · Riyadh",
        "احجز اجتماعاً مع فريق هوية", "Book a meeting with the Hawih team",
        "اختر نوع الاجتماع والموعد المناسب واترك بياناتك — نؤكّد لك الموعد "
        "ونرسل رابط جوجل ميت أو عنوان المكتب.",
        "Pick a meeting type and a time that suits you and leave your "
        "details — we confirm the slot and send a Google Meet link or the "
        "office address.",
        _shell.btn(wa, "أو تواصل عبر واتساب", "Or chat on WhatsApp",
                   "btn-outline", blank=True, icon="ph-whatsapp-logo"))

    steps = (
        '<ol class="bk-steps">'
        f'<li data-n="1" class="is-active"><b>1</b>{ls("النوع", "Type")}</li>'
        f'<li data-n="2"><b>2</b>{ls("الموعد", "Date &amp; time")}</li>'
        f'<li data-n="3"><b>3</b>{ls("بياناتك", "Your details")}</li>'
        '</ol>'
    )

    type_step = (
        '<div class="bk-step" data-step="type"><div class="bk-typecards">'
        '<button type="button" class="bk-type" data-type="online"><i class="ph-bold ph-video-camera"></i>'
        f'<b>{ls("اجتماع أونلاين", "Online meeting")}</b>'
        f'<span>{ls("عبر جوجل ميت — رابط يصلك بعد التأكيد.", "Over Google Meet — link sent after confirmation.")}</span></button>'
        '<button type="button" class="bk-type" data-type="office"><i class="ph-bold ph-buildings"></i>'
        f'<b>{ls("في مكتبنا", "At our office")}</b>'
        f'<span>{ls("في الرياض — نرسل لك العنوان بعد التأكيد.", "In Riyadh — we send the address after confirmation.")}</span></button>'
        '</div></div>'
    )

    when_step = (
        '<div class="bk-step" data-step="when" hidden>'
        f'<button type="button" class="bk-back" data-back="type">&#8594; {ls("تغيير النوع", "Change type")}</button>'
        '<div class="bk-when"><div class="bk-cal"></div><div class="bk-slots"></div></div></div>'
    )

    details_step = (
        '<div class="bk-step" data-step="details" hidden>'
        f'<button type="button" class="bk-back" data-back="when">&#8594; {ls("تغيير الموعد", "Change time")}</button>'
        '<span class="bk-summary"></span>'
        '<form id="bookingForm" novalidate>'
        '<input type="hidden" name="meeting_type" value="">'
        '<input type="hidden" name="date" value="">'
        '<input type="hidden" name="start" value="">'
        '<input type="hidden" name="language" value="ar">'
        '<input type="hidden" name="source_page" value="">'
        '<input type="hidden" name="utm_source" value="">'
        '<input type="hidden" name="utm_medium" value="">'
        '<input type="hidden" name="utm_campaign" value="">'
        '<input type="hidden" name="gclid" value="">'
        '<div class="bk-hp" aria-hidden="true"><label>Leave this empty'
        '<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div>'
        f'<p class="bk-form-err" hidden></p>'
        '<div class="container-fluid p-0"><div class="row gx-0">'
        + field("bk-name", "name", "الاسم", "Full name", extra='required maxlength="120" autocomplete="name"')
        + field("bk-phone", "phone", "رقم الجوّال", "Phone", typ="tel",
                extra='dir="ltr" maxlength="40" autocomplete="tel"', ph="+966 5x xxx xxxx")
        + field("bk-email", "email", "البريد الإلكتروني", "Email", typ="email",
                extra='required dir="ltr" maxlength="200" autocomplete="email"', ph="you@brand.com")
        + field("bk-company", "company", "الجهة / الشركة", "Company / Entity",
                extra='maxlength="200" autocomplete="organization"')
        + f'<div class="col-12 mxd-grid-item"><label class="uc-field-label" for="bk-topic">'
        + ls("موضوع الاجتماع", "What's the meeting about?") + '</label>'
        + '<textarea id="bk-topic" name="topic" maxlength="2000" placeholder="—"></textarea></div>'
        + '<div class="col-12 mxd-grid-item uc-form-submit">'
        + f'<button class="btn btn-anim btn-default btn-large btn-opposite slide-right-up" type="submit">'
        + ls("أرسل طلب الحجز", "Request booking", "btn-caption")
        + '<i class="ph-bold ph-arrow-up-right"></i></button></div>'
        '</div></div></form></div>'
    )

    done = (
        '<div class="bk-done" hidden>'
        '<div class="bk-done__icon"><i class="ph-fill ph-check-circle"></i></div>'
        f'<h2>{ls("تم استلام طلبك", "Request received")}</h2>'
        '<p class="bk-done__when"></p>'
        '<p class="bk-done__msg"></p>'
        '<p class="bk-done__manage"></p></div>'
    )

    widget = (
        '      <div class="mxd-section padding-default"><div class="mxd-container grid-container">'
        '<div class="mxd-block"><div id="booking" class="bk">'
        + steps + type_step + when_step + details_step + done +
        '</div></div></div></div>'
        '\n      <script src="/assets/js/booking.js" defer></script>'
    )
    return hero + widget


def main() -> int:
    prefix, main_open, suffix = _shell.load_shell()
    head = _shell.swap_head(
        prefix,
        title="احجز اجتماعاً مع فريق هوية | Hawih",
        desc="احجز موعد اجتماع أونلاين أو في مكتبنا مع فريق هوية في الرياض — "
             "اختر الوقت المناسب واترك بياناتك، ونؤكّد لك الموعد.",
        keywords="حجز موعد, احجز اجتماع, استشارة تصميم, hawih book meeting, "
                 "تواصل هوية",
        og_title="احجز اجتماعاً مع فريق هوية",
        og_desc="اختر نوع الاجتماع والوقت المناسب واترك بياناتك — نؤكّد لك الموعد.",
        title_en="Book a Meeting with Hawih",
        desc_en="Book an online or in-office meeting with the Hawih team in "
                "Riyadh — pick a time and leave your details; we'll confirm.",
        og_title_en="Book a Meeting with Hawih",
        og_desc_en="Pick a meeting type and time and leave your details — "
                   "we'll confirm your slot.",
        extra_style=BK_STYLE)
    html = head + "\n" + main_open + "\n" + build_body() + "\n    </main>\n" + suffix
    out = REPO_ROOT / "book-meeting.html"
    out.write_text(html, encoding="utf-8")
    print(f"  ~ {out.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
