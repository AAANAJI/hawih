#!/usr/bin/env python3
"""
build-careers.py — the /careers page (Careers module, website side).

On the official site shell (via _shell) with a scoped widget driven by
assets/js/careers.js, which talks only to the same-origin proxy
/api/careers.php. Three views on one page:

  /careers                 open vacancies (cards) + general-application card
  /careers?job=SLUG        one vacancy: header, formatted sections, sticky
                           summary, and the application form
  /careers?apply=general   general application (talent pool, no vacancy)

Sizes are px on purpose: the template sets a 10px root font-size, so rem
values render too small. Detail views hide the generic page hero via an
early <html class="cr-detail"> flag set in <head> (no flash).

Writes the AR root page (lang-string spans); build-en-mirror.py produces
/en/careers.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _shell  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
ls = _shell.ls

CHECK_SVG = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' "
             "fill='none' stroke='%231F1FFE' stroke-width='3.2' stroke-linecap='round' "
             "stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E")
CHEVRON_SVG = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' "
               "fill='none' stroke='%23777' stroke-width='2.4' stroke-linecap='round' "
               "stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")

CR_STYLE = """    <!-- careers: early view flag (hides the page hero on job/apply views, no flash) -->
    <script>(function(){try{if(/[?&](job|apply)=/.test(location.search))document.documentElement.classList.add('cr-detail')}catch(e){}})();</script>
    <!-- careers: scoped widget styles (px — template root font-size is 10px) -->
    <style>
    /* colours ride on the template's own theme vars, so the widget follows
       light/dark exactly as the rest of the site ([color-scheme] + OS pref) */
    .cr{--cr-text:var(--t-bright,#161616);--cr-muted:var(--t-muted,#585858);--cr-card:var(--base-tint,#fff);
      --cr-soft:var(--base,#FAF7F6);--cr-line:var(--st-muted,#E0DDDB);
      --cr-line-2:rgba(22,22,22,.18);--cr-line-2:color-mix(in srgb,var(--t-bright,#161616) 20%,transparent);
      --cr-blue:var(--hawih-blue,#1F1FFE);--cr-blue-soft:var(--hawih-blue-soft,rgba(31,31,254,.10));
      --cr-ok:#12B76A;--cr-err:#D92D20;color:var(--cr-text);max-width:1120px;margin:0 auto;font-size:16px;line-height:1.7}
    .cr h1,.cr h2,.cr h3,.cr .cr-aside__t,.cr .cr-fact b,.cr .cr-label{color:var(--cr-text)}
    .cr .cr-card__x,.cr .cr-dlead,.cr .cr-form__s,.cr .cr-empty__s,.cr .cr-done__m,.cr .cr-meta,.cr .cr-hint{color:var(--cr-muted)}
    .cr *,.cr *::before,.cr *::after{box-sizing:border-box}
    .cr [hidden]{display:none!important}
    html.cr-detail .mxd-section-inner-headline{display:none!important}
    html.cr-detail #cr-section{padding-top:clamp(28px,4.4vw,56px)}

    /* list */
    .cr-view--list{max-width:920px;margin:0 auto}
    .cr-listhead{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:0 0 24px}
    .cr .cr-kicker{margin:0 0 6px;font-size:14px;font-weight:600;color:var(--cr-blue)}
    .cr-h2{margin:0;font-size:clamp(26px,3.6vw,36px);line-height:1.25;font-weight:700}
    .cr-count{display:inline-flex;align-items:center;gap:9px;font-size:14px;font-weight:600;padding:9px 16px;border-radius:999px;
      background:var(--cr-card);border:1px solid var(--cr-line)}
    .cr-count::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--cr-ok);box-shadow:0 0 0 4px rgba(18,183,106,.16)}
    .cr-list{display:flex;flex-direction:column;gap:14px}
    .cr-card{position:relative;display:flex;align-items:center;gap:22px;padding:26px 28px;border-radius:22px;background:var(--cr-card);
      border:1px solid var(--cr-line);color:inherit;text-decoration:none;
      transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;animation:cr-up .5s both;animation-delay:calc(var(--i,0) * 70ms)}
    .cr-card:hover{transform:translateY(-3px);border-color:var(--cr-blue);color:inherit;box-shadow:0 20px 44px -26px rgba(31,31,254,.55)}
    .cr-card:focus-visible{outline:3px solid var(--cr-blue);outline-offset:3px}
    .cr-card__main{flex:1;min-width:0}
    .cr-card__t{margin:0 0 6px;font-size:clamp(19px,2.3vw,23px);font-weight:700;line-height:1.4}
    .cr-card__x{margin:0;font-size:15px;line-height:1.8;color:var(--cr-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .cr-meta{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:12px;font-size:14px;color:var(--cr-muted)}
    .cr-meta span{display:inline-flex;align-items:center;gap:6px}
    .cr-meta i{font-size:16px}
    .cr-card__go{flex:none;display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;
      border:1.5px solid var(--cr-line-2);font-size:21px;transition:background .25s ease,border-color .25s ease,color .25s ease}
    .cr-card:hover .cr-card__go{background:var(--cr-blue);border-color:var(--cr-blue);color:#fff}
    .cr-card--general{background:transparent;border:1.5px dashed var(--cr-line-2)}
    .cr-card__ico{flex:none;display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:16px;
      background:var(--cr-blue-soft);color:var(--cr-blue);font-size:25px}
    .cr-tags{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
    .cr-tag{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;line-height:1;padding:8px 12px;border-radius:999px;
      background:var(--cr-soft);border:1px solid var(--cr-line);color:inherit;white-space:nowrap}
    .cr-tag i{font-size:15px}
    .cr-tag--blue{background:var(--cr-blue-soft);border-color:transparent;color:var(--cr-blue)}
    .cr-tag--ok{background:rgba(18,183,106,.12);border-color:transparent;color:#0E9F5C}
    .cr-skel{height:148px;border-radius:22px;border:1px solid var(--cr-line);
      background:linear-gradient(90deg,var(--cr-soft) 25%,var(--cr-line) 37%,var(--cr-soft) 63%);background-size:400% 100%;animation:cr-shim 1.3s ease infinite}
    .cr-skel--sm{height:22px;width:40%;border-radius:8px;margin:0 0 14px}
    .cr-skel--lg{height:52px;width:72%;border-radius:12px;margin:0 0 22px}
    .cr-empty{text-align:center;padding:52px 24px;border:1.5px dashed var(--cr-line-2);border-radius:22px}
    .cr-empty__ico{display:inline-flex;width:66px;height:66px;border-radius:50%;align-items:center;justify-content:center;
      background:var(--cr-blue-soft);color:var(--cr-blue);font-size:30px;margin-bottom:16px}
    .cr-empty__t{margin:0 0 6px;font-size:21px;font-weight:700}
    .cr-empty__s{margin:0 auto 22px;max-width:460px;color:var(--cr-muted);font-size:15.5px}
    .cr-row{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}

    /* buttons */
    .cr-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:52px;padding:0 24px;border-radius:999px;
      font-family:inherit;font-size:16px;font-weight:600;line-height:1;text-decoration:none;cursor:pointer;border:1.5px solid transparent;
      transition:background .2s,border-color .2s,color .2s,transform .2s;white-space:nowrap}
    .cr-btn i{font-size:19px}
    .cr-btn--primary{background:var(--cr-blue);color:#fff}
    .cr-btn--primary:hover{background:var(--hawih-blue-hover,#1414D6);color:#fff;transform:translateY(-1px)}
    .cr-btn--ghost{background:transparent;border-color:var(--cr-line-2);color:inherit}
    .cr-btn--ghost:hover{border-color:currentColor;color:inherit}
    .cr-btn--wa{background:#25D366;color:#fff}
    .cr-btn--wa:hover{background:#1EBE5B;color:#fff}
    .cr-btn--block{width:100%}

    /* detail */
    .cr-back{display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:var(--cr-blue);text-decoration:none;margin:0 0 24px}
    .cr-back:hover{color:var(--cr-blue);gap:11px}
    [dir="ltr"] .cr-back__i{transform:scaleX(-1)}
    .cr-dhead{padding:0 0 32px;margin:0 0 34px;border-bottom:1px solid var(--cr-line)}
    .cr-dtitle{margin:0 0 14px;font-size:clamp(32px,5.4vw,56px);line-height:1.15;font-weight:700}
    .cr-dlead{margin:0 0 20px;max-width:760px;font-size:18px;line-height:1.85;color:var(--cr-muted)}
    .cr-dhead .cr-meta{margin:0 0 24px;font-size:15px}
    .cr-dactions{display:flex;flex-wrap:wrap;gap:12px}
    .cr-dgrid{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:40px;align-items:start}
    .cr-dgrid.is-solo{grid-template-columns:minmax(0,760px);justify-content:center}
    .cr-aside{position:sticky;top:120px}
    .cr-sec{background:var(--cr-card);border:1px solid var(--cr-line);border-radius:22px;padding:28px 30px;margin:0 0 18px}
    .cr-sec__h{display:flex;align-items:center;gap:12px;margin:0 0 16px;font-size:20px;font-weight:700;line-height:1.3}
    .cr-sec__h i{display:inline-flex;width:38px;height:38px;border-radius:11px;align-items:center;justify-content:center;
      background:var(--cr-blue-soft);color:var(--cr-blue);font-size:20px}
    .cr-rich p{margin:0 0 12px;font-size:16.5px;line-height:1.95}
    .cr-rich p:last-child{margin-bottom:0}
    .cr-rich ul{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:11px}
    .cr-rich ul:last-child{margin-bottom:0}
    .cr-rich li{position:relative;padding-inline-start:32px;font-size:16.5px;line-height:1.85}
    .cr-rich li::before{content:"";position:absolute;inset-inline-start:0;top:6px;width:20px;height:20px;border-radius:50%;
      background:var(--cr-blue-soft) url("__CHECK__") center/12px no-repeat}
    .cr-aside__card{background:var(--cr-card);border:1px solid var(--cr-line);border-radius:22px;padding:24px}
    .cr-aside__t{margin:0 0 6px;font-size:16px;font-weight:700}
    .cr-facts{margin:0 0 20px}
    .cr-fact{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--cr-line)}
    .cr-fact:last-child{border-bottom:0}
    .cr-fact>i{flex:none;display:inline-flex;width:36px;height:36px;border-radius:11px;align-items:center;justify-content:center;background:var(--cr-soft);font-size:18px}
    .cr-fact small{display:block;font-size:12.5px;color:var(--cr-muted);line-height:1.35}
    .cr-fact b{display:block;font-size:15px;font-weight:600;line-height:1.5}
    .cr-aside__note{display:flex;align-items:center;justify-content:center;gap:6px;margin:12px 0 0;font-size:13px;color:var(--cr-muted)}

    /* form */
    .cr-apply{scroll-margin-top:120px}
    .cr-form,.cr-done{background:var(--cr-card);border:1px solid var(--cr-line);border-radius:24px;padding:32px;
      box-shadow:0 30px 70px -48px rgba(11,11,16,.45)}
    .cr-form__head{display:flex;align-items:flex-start;gap:14px;margin:0 0 26px}
    .cr-form__ico{flex:none;display:inline-flex;width:50px;height:50px;border-radius:15px;align-items:center;justify-content:center;
      background:var(--cr-blue);color:#fff;font-size:23px}
    .cr-form__t{margin:0 0 4px;font-size:23px;font-weight:700;line-height:1.35}
    .cr-form__s{margin:0;font-size:14.5px;line-height:1.7;color:var(--cr-muted)}
    .cr-alert{display:flex;gap:10px;align-items:flex-start;padding:14px 16px;border-radius:14px;background:rgba(217,45,32,.08);
      color:var(--cr-err);font-size:15px;font-weight:600;line-height:1.7;margin:0 0 22px}
    .cr-alert i{font-size:20px;flex:none;margin-top:2px}
    .cr-alert a{color:inherit;text-decoration:underline}
    .cr-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px 16px}
    .cr-f{display:flex;flex-direction:column;gap:8px;min-width:0}
    .cr-f--full{grid-column:1/-1}
    .cr-label{font-size:14.5px;font-weight:600;line-height:1.4}
    .cr-req{color:var(--cr-err);margin-inline-start:3px}
    .cr-hint{font-size:13px;font-weight:400;color:var(--cr-muted)}
    .cr-form .cr-input{display:block;width:100%;height:54px;margin:0;padding:0 16px;font-family:inherit;font-size:16px;font-weight:400;
      line-height:1.4;color:inherit;background:var(--cr-soft);border:1.5px solid var(--cr-line-2);border-radius:14px;outline:0;
      box-shadow:none;transition:border-color .2s,box-shadow .2s,background .2s;-webkit-appearance:none;appearance:none}
    .cr-form textarea.cr-input{height:auto;min-height:124px;padding:14px 16px;line-height:1.75;resize:vertical}
    .cr-form .cr-input:focus{border-color:var(--cr-blue);background:var(--cr-card);box-shadow:0 0 0 4px var(--cr-blue-soft)}
    .cr-form .cr-input::placeholder{color:var(--cr-muted);opacity:.65}
    .cr-form .cr-input.is-bad{border-color:var(--cr-err);box-shadow:0 0 0 4px rgba(217,45,32,.10)}
    .cr-form select.cr-input{padding-inline-end:46px;cursor:pointer;background-image:url("__CHEVRON__");background-repeat:no-repeat;
      background-size:16px;background-position:left 16px center}
    [dir="ltr"] .cr-form select.cr-input{background-position:right 16px center}
    .cr-ferr{font-size:13px;font-weight:600;color:var(--cr-err)}
    .cr-drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:4px;
      padding:28px 18px;border:2px dashed var(--cr-line-2);border-radius:16px;background:var(--cr-soft);cursor:pointer;
      transition:border-color .2s,background .2s}
    .cr-drop:hover,.cr-drop.is-over{border-color:var(--cr-blue);background:var(--cr-blue-soft)}
    .cr-drop.is-bad{border-color:var(--cr-err)}
    .cr-form .cr-drop__input{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;opacity:0;cursor:pointer;font-size:0;line-height:0}
    .cr-drop__ico{display:inline-flex;width:50px;height:50px;border-radius:50%;align-items:center;justify-content:center;
      background:var(--cr-card);color:var(--cr-blue);font-size:25px;margin-bottom:6px;box-shadow:0 8px 18px -10px rgba(11,11,16,.35)}
    .cr-drop__t{font-size:15.5px;font-weight:600}
    .cr-drop__t u{color:var(--cr-blue);text-underline-offset:4px}
    .cr-drop__s{font-size:13px;color:var(--cr-muted)}
    .cr-file{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px solid var(--cr-line-2);border-radius:14px;background:var(--cr-soft)}
    .cr-file__ico{flex:none;display:inline-flex;width:42px;height:42px;border-radius:11px;align-items:center;justify-content:center;
      background:var(--cr-blue-soft);color:var(--cr-blue);font-size:21px}
    .cr-file__body{flex:1;min-width:0}
    .cr-file__n{display:block;font-size:14.5px;font-weight:600;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cr-file__z{display:block;font-size:12.5px;color:var(--cr-muted)}
    .cr-file__x{flex:none;display:inline-flex;width:38px;height:38px;border-radius:50%;align-items:center;justify-content:center;
      border:0;background:transparent;color:inherit;cursor:pointer;font-size:19px;padding:0}
    .cr-file__x:hover{background:rgba(217,45,32,.10);color:var(--cr-err)}
    .cr-submit{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:58px;margin:28px 0 0;padding:0 24px;
      border:0;border-radius:999px;background:var(--cr-blue);color:#fff;font-family:inherit;font-size:17px;font-weight:700;cursor:pointer;
      box-shadow:0 16px 32px -16px var(--hawih-blue-glow,rgba(31,31,254,.45));transition:background .2s,transform .2s}
    .cr-submit:hover{background:var(--hawih-blue-hover,#1414D6);transform:translateY(-1px)}
    .cr-submit:disabled{opacity:.8;cursor:progress;transform:none}
    .cr-submit i{font-size:20px}
    .cr-spin{display:inline-block;animation:cr-spin .9s linear infinite}
    .cr-privacy{display:flex;align-items:center;justify-content:center;gap:6px;margin:14px 0 0;font-size:13px;color:var(--cr-muted);text-align:center}
    .cr-hp{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .cr-done{text-align:center;padding:46px 28px}
    .cr-done__ico{display:inline-flex;width:78px;height:78px;border-radius:50%;align-items:center;justify-content:center;
      background:rgba(18,183,106,.12);color:var(--cr-ok);font-size:42px;margin-bottom:16px;animation:cr-pop .45s cubic-bezier(.2,1.4,.4,1) both}
    .cr-done__t{margin:0 0 8px;font-size:26px;font-weight:700}
    .cr-done__m{margin:0 auto 26px;max-width:480px;font-size:16px;line-height:1.85;color:var(--cr-muted)}

    @keyframes cr-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    @keyframes cr-shim{0%{background-position:100% 50%}100%{background-position:0 50%}}
    @keyframes cr-spin{to{transform:rotate(360deg)}}
    @keyframes cr-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion:reduce){.cr-card,.cr-skel,.cr-done__ico{animation:none}.cr-card,.cr-btn,.cr-submit{transition:none}}
    @media (max-width:991px){.cr-dgrid{grid-template-columns:1fr}.cr-aside{display:none}}
    @media (max-width:767px){
      .cr-card{padding:20px;gap:14px;border-radius:20px;align-items:flex-start}
      .cr-card__go{width:44px;height:44px;font-size:18px}
      .cr-card__ico{width:46px;height:46px;font-size:22px}
      .cr-sec{padding:22px 20px;border-radius:20px}
      .cr-form,.cr-done{padding:24px 18px;border-radius:20px}
      .cr-grid{grid-template-columns:1fr;gap:18px}
      .cr-dactions .cr-btn{flex:1 1 auto}
      .cr-dlead{font-size:16.5px}
    }
    </style>""".replace("__CHECK__", CHECK_SVG).replace("__CHEVRON__", CHEVRON_SVG)


def field(idn, name, label_ar, label_en, typ="text", extra="", ph="", ph_en="",
          full=False, req=False, hint_ar="", hint_en=""):
    star = '<span class="cr-req" aria-hidden="true">*</span>' if req else ""
    hint = f' <span class="cr-hint">{ls(hint_ar, hint_en)}</span>' if hint_ar else ""
    ph_attr = f' placeholder="{ph}"' if ph else ""
    ph_en_attr = f' data-ph-en="{ph_en}"' if ph_en else ""
    req_attr = " required" if req else ""
    return (
        f'<div class="cr-f{" cr-f--full" if full else ""}">'
        f'<label class="cr-label" for="{idn}">{ls(label_ar, label_en)}{star}{hint}</label>'
        f'<input class="cr-input" type="{typ}" id="{idn}" name="{name}"{req_attr} {extra}{ph_attr}{ph_en_attr}>'
        '<small class="cr-ferr" hidden></small></div>'
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
        f'<option value="{v}" data-en="{en}">{ar}</option>' for v, ar, en in [
            ("", "اختر…", "Select…"),
            ("0-1", "أقل من سنة", "Less than 1 year"),
            ("1-3", "١–٣ سنوات", "1–3 years"),
            ("3-5", "٣–٥ سنوات", "3–5 years"),
            ("5-10", "٥–١٠ سنوات", "5–10 years"),
            ("10+", "أكثر من ١٠ سنوات", "10+ years")])

    list_view = (
        '<div class="cr-view cr-view--list">'
        '<div class="cr-listhead"><div>'
        f'<p class="cr-kicker">{ls("الفرص المتاحة", "Open roles")}</p>'
        f'<h2 class="cr-h2">{ls("انضم إلى فريق هوية", "Join the Hawih team")}</h2>'
        '</div><span class="cr-count" hidden></span></div>'
        '<div class="cr-list" aria-live="polite"></div>'
        '<div class="cr-empty" hidden>'
        '<span class="cr-empty__ico"><i class="ph-bold ph-briefcase"></i></span>'
        f'<h3 class="cr-empty__t">{ls("لا توجد وظائف شاغرة حالياً", "No open roles right now")}</h3>'
        f'<p class="cr-empty__s">{ls("نضيف الفرص الجديدة هنا أولاً بأول. أرسل سيرتك الآن لنتواصل معك عند توفر فرصة مناسبة.", "New roles appear here first. Send us your CV now and we will reach out when a fitting role opens.")}</p>'
        '<div class="cr-row">'
        f'<a class="cr-btn cr-btn--primary" href="?apply=general">{ls("أرسل سيرتك الذاتية", "Send your CV")}<i class="ph-bold ph-paper-plane-tilt"></i></a>'
        f'<a class="cr-btn cr-btn--ghost" href="{wa}" target="_blank" rel="noopener">{ls("تواصل عبر واتساب", "Chat on WhatsApp")}<i class="ph-bold ph-whatsapp-logo"></i></a>'
        '</div></div>'
        '</div>'
    )

    form = (
        '<section id="apply" class="cr-apply">'
        '<form id="careersForm" class="cr-form" novalidate>'
        '<input type="hidden" name="job_opening_id" value="0">'
        '<input type="hidden" name="position" value="">'
        '<div class="cr-hp" aria-hidden="true"><label>Leave this empty<input type="text" name="cr_hp_note" tabindex="-1" autocomplete="off"></label></div>'
        '<div class="cr-form__head"><span class="cr-form__ico"><i class="ph-bold ph-paper-plane-tilt"></i></span><div>'
        f'<h2 class="cr-form__t">{ls("قدّم على هذه الوظيفة", "Apply for this role")}</h2>'
        f'<p class="cr-form__s">{ls("يصل طلبك مباشرة إلى فريق التوظيف في هوية. يستغرق أقل من دقيقتين.", "Your application goes straight to the Hawih hiring team. It takes under two minutes.")}</p>'
        '</div></div>'
        '<div class="cr-alert" role="alert" hidden></div>'
        '<div class="cr-grid">'
        + field("cr-first", "first_name", "الاسم الأول", "First name", req=True,
                extra='maxlength="100" autocomplete="given-name"')
        + field("cr-last", "last_name", "اسم العائلة", "Last name",
                extra='maxlength="100" autocomplete="family-name"')
        + field("cr-email", "email", "البريد الإلكتروني", "Email", typ="email", req=True,
                extra='dir="ltr" maxlength="191" autocomplete="email" inputmode="email"', ph="name@email.com")
        + field("cr-phone", "phone", "رقم الجوّال", "Phone", typ="tel",
                extra='dir="ltr" maxlength="50" autocomplete="tel" inputmode="tel"', ph="+966 5x xxx xxxx")
        + '<div class="cr-f">'
        + f'<label class="cr-label" for="cr-exp">{ls("سنوات الخبرة", "Experience")}</label>'
        + f'<select class="cr-input" id="cr-exp" name="years_experience">{exp_opts}</select>'
        + '<small class="cr-ferr" hidden></small></div>'
        + field("cr-city", "city", "المدينة", "City", extra='maxlength="100" autocomplete="address-level2"',
                ph="الرياض", ph_en="Riyadh")
        + field("cr-link", "linkedin_url", "رابط البروفايل", "Profile link", typ="url", full=True,
                extra='dir="ltr" maxlength="255" inputmode="url"', ph="https://linkedin.com/in/…",
                hint_ar="(LinkedIn أو معرض أعمالك)", hint_en="(LinkedIn or portfolio)")
        + '<div class="cr-f cr-f--full">'
        + f'<span class="cr-label">{ls("السيرة الذاتية", "CV / Résumé")}<span class="cr-req" aria-hidden="true">*</span> '
        + f'<span class="cr-hint">{ls("(أو أضف رابط بروفايلك أعلاه)", "(or add your profile link above)")}</span></span>'
        + '<label class="cr-drop" for="cr-cv">'
        + '<input class="cr-drop__input" type="file" id="cr-cv" name="cv" '
        + 'accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document">'
        + '<span class="cr-drop__ico"><i class="ph-bold ph-cloud-arrow-up"></i></span>'
        + f'<span class="cr-drop__t">{ls("اسحب ملفك هنا أو", "Drop your file here or")} <u>{ls("اختر ملفاً", "browse")}</u></span>'
        + f'<span class="cr-drop__s">{ls("PDF أو Word · حتى ٥٠ ميجابايت", "PDF or Word · up to 50MB")}</span>'
        + '</label>'
        + '<div class="cr-file" hidden><span class="cr-file__ico"><i class="ph-bold ph-file-text"></i></span>'
        + '<span class="cr-file__body"><span class="cr-file__n"></span><span class="cr-file__z"></span></span>'
        + '<button type="button" class="cr-file__x" aria-label="Remove file"><i class="ph-bold ph-x"></i></button></div>'
        + '<small class="cr-ferr" hidden></small></div>'
        + '<div class="cr-f cr-f--full">'
        + f'<label class="cr-label" for="cr-notes">{ls("نبذة قصيرة", "A short note")} <span class="cr-hint">{ls("(اختياري)", "(optional)")}</span></label>'
        + '<textarea class="cr-input" id="cr-notes" name="notes" maxlength="4000" rows="4" '
        + 'placeholder="ما الذي يميّزك؟ مشروع تفخر به؟" data-ph-en="What sets you apart? A project you are proud of?"></textarea>'
        + '<small class="cr-ferr" hidden></small></div>'
        + '</div>'
        + f'<button class="cr-submit" type="submit"><span class="cr-submit__t">{ls("أرسل الطلب", "Submit application")}</span>'
        + '<i class="ph-bold ph-paper-plane-tilt"></i></button>'
        + f'<p class="cr-privacy"><i class="ph-bold ph-lock-simple"></i>{ls("بياناتك سرّية وتُستخدم لأغراض التوظيف فقط.", "Your data is confidential and used for hiring only.")}</p>'
        + '</form>'
        + '<div class="cr-done" hidden>'
        + '<span class="cr-done__ico"><i class="ph-fill ph-check-circle"></i></span>'
        + f'<h2 class="cr-done__t">{ls("تم استلام طلبك", "Application received")}</h2>'
        + '<p class="cr-done__m"></p>'
        + '<div class="cr-row">'
        + f'<a class="cr-btn cr-btn--primary" href="/careers">{ls("تصفّح وظائف أخرى", "Browse other roles")}<i class="ph-bold ph-briefcase"></i></a>'
        + f'<a class="cr-btn cr-btn--ghost" href="{wa}" target="_blank" rel="noopener">{ls("تواصل عبر واتساب", "Chat on WhatsApp")}<i class="ph-bold ph-whatsapp-logo"></i></a>'
        + '</div></div>'
        + '</section>'
    )

    detail_view = (
        '<div class="cr-view cr-view--detail" hidden>'
        f'<a class="cr-back" href="/careers"><i class="ph-bold ph-arrow-right cr-back__i"></i>{ls("كل الوظائف", "All roles")}</a>'
        '<header class="cr-dhead">'
        '<div class="cr-tags"></div>'
        '<h1 class="cr-dtitle"></h1>'
        '<p class="cr-dlead" hidden></p>'
        '<div class="cr-meta"></div>'
        '<div class="cr-dactions">'
        f'<a class="cr-btn cr-btn--primary cr-go-apply" href="#apply">{ls("قدّم الآن", "Apply now")}<i class="ph-bold ph-paper-plane-tilt"></i></a>'
        f'<button type="button" class="cr-btn cr-btn--ghost cr-share">{ls("مشاركة الوظيفة", "Share this role")}<i class="ph-bold ph-share-network"></i></button>'
        '</div></header>'
        '<div class="cr-dgrid">'
        '<div class="cr-dmain">'
        '<section class="cr-sec cr-sec--about" hidden>'
        f'<h2 class="cr-sec__h"><i class="ph-bold ph-file-text"></i>{ls("عن الوظيفة", "About the role")}</h2>'
        '<div class="cr-rich"></div></section>'
        '<section class="cr-sec cr-sec--req" hidden>'
        f'<h2 class="cr-sec__h"><i class="ph-bold ph-check-circle"></i>{ls("المتطلبات", "Requirements")}</h2>'
        '<div class="cr-rich"></div></section>'
        + form +
        '</div>'
        '<aside class="cr-aside"><div class="cr-aside__card">'
        f'<p class="cr-aside__t">{ls("تفاصيل الوظيفة", "Role details")}</p>'
        '<div class="cr-facts"></div>'
        f'<a class="cr-btn cr-btn--primary cr-btn--block cr-go-apply" href="#apply">{ls("قدّم الآن", "Apply now")}<i class="ph-bold ph-paper-plane-tilt"></i></a>'
        f'<p class="cr-aside__note"><i class="ph-bold ph-clock"></i>{ls("التقديم يستغرق أقل من دقيقتين", "Applying takes under two minutes")}</p>'
        '</div></aside>'
        '</div>'
        '</div>'
    )

    widget = (
        '      <div id="cr-section" class="mxd-section padding-default"><div class="mxd-container grid-container"><div class="mxd-block">'
        '<div id="careers" class="cr">'
        + list_view + detail_view +
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
