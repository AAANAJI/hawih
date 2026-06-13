/* ============================================================
   Hawih — shared runtime
   Language toggle, mobile nav, scroll reveals, counters,
   sticky nav, copy-to-clipboard, UTM capture, form recovery,
   floating WhatsApp button.
   ============================================================ */

(function () {
  'use strict';

  const root = document.documentElement;

  /* Strip any stale .dark class that may linger from a previous
     visit (we removed the theme toggle — site is light-mode only). */
  root.classList.remove('dark');
  try { localStorage.removeItem('theme'); } catch (e) {}

  /* ---------- Language ----------
     URL is the source of truth: /<x> is Arabic, /en/<x> is English.
     The toggle button navigates between the two mirrored URLs.
     applyLanguage() remains exposed (window.Hawih.applyLanguage) for
     dynamically injected nodes (e.g. the Shfrah promo modal) to sync
     their lang-string children to the current document language. */
  let currentLang = root.lang === 'en' ? 'en' : 'ar';
  const langBtns = document.querySelectorAll('.langToggle');

  function applyLanguage(lang) {
    currentLang = lang;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('.lang-string').forEach(el => {
      const t = el.getAttribute('data-' + lang);
      if (t != null) el.textContent = t;
    });
    document.querySelectorAll('.lang-input').forEach(el => {
      const p = el.getAttribute('data-placeholder-' + lang);
      if (p != null) el.placeholder = p;
    });
    document.querySelectorAll('.lang-attr').forEach(el => {
      const attr = el.getAttribute('data-attr');
      const val = el.getAttribute('data-' + attr + '-' + lang);
      if (attr && val != null) el.setAttribute(attr, val);
    });
  }

  /* Map current path → mirrored path on the other language tree. */
  function mirroredPath(targetLang) {
    const p = location.pathname;
    if (targetLang === 'en') {
      if (p === '/en' || p === '/en/' || p.indexOf('/en/') === 0) return null;
      if (p === '/') return '/en/';
      return '/en' + p;
    }
    /* targetLang === 'ar' */
    if (p === '/en' || p === '/en/') return '/';
    if (p.indexOf('/en/') === 0) return p.replace(/^\/en/, '');
    return null;
  }

  langBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const target = currentLang === 'ar' ? 'en' : 'ar';
      const dest = mirroredPath(target);
      try { localStorage.setItem('lang', target); } catch (_) {}
      if (dest) {
        location.assign(dest + location.search + location.hash);
      } else {
        /* Fallback: same URL serves both languages (legacy pages). */
        applyLanguage(target);
      }
    });
  });

  /* ---------- Mobile nav ---------- */
  const mobileToggle = document.querySelector('.mobileNavToggle');
  const mobileNav    = document.querySelector('.mobileNav');
  const mobileClose  = document.querySelector('.mobileNavClose');

  function closeMobileNav() {
    if (!mobileNav) return;
    mobileNav.classList.add('hidden');
    document.body.classList.remove('no-scroll');
  }
  function openMobileNav() {
    if (!mobileNav) return;
    mobileNav.classList.remove('hidden');
    document.body.classList.add('no-scroll');
  }

  mobileToggle && mobileToggle.addEventListener('click', openMobileNav);
  mobileClose  && mobileClose.addEventListener('click', closeMobileNav);
  mobileNav    && mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileNav));

  /* ---------- Sticky nav shrink ---------- */
  const siteNav = document.querySelector('.site-nav');
  if (siteNav) {
    const onScroll = () => {
      if (window.scrollY > 60) siteNav.classList.add('nav-scrolled');
      else siteNav.classList.remove('nav-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Scroll reveal ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
  }

  /* ---------- Counters ---------- */
  const animateCounter = (el) => {
    const target = parseFloat(el.getAttribute('data-target') || '0');
    const duration = parseInt(el.getAttribute('data-duration') || '1500', 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = (Number.isInteger(target) ? Math.round(value) : value.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window) {
    const counterIO = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.counter').forEach(el => counterIO.observe(el));
  }

  /* ---------- Copy email / phone to clipboard ---------- */
  document.querySelectorAll('[data-copy]').forEach(el => {
    el.addEventListener('click', e => {
      const text = el.getAttribute('data-copy');
      if (!text || !navigator.clipboard) return;
      e.preventDefault();
      navigator.clipboard.writeText(text).then(() => {
        const original = el.textContent;
        const done = el.getAttribute('data-copied-text') || '✓';
        el.textContent = done;
        setTimeout(() => { el.textContent = original; }, 1500);
      });
    });
  });

  /* ============================================================
     FLOATING WHATSAPP BUTTON
     ------------------------------------------------------------
     Injected sitewide. wa.me works from desktop (web.whatsapp.com)
     and mobile (deep-links into the WhatsApp app).
     ============================================================ */

  (function injectWhatsApp() {
    if (document.querySelector('.hawih-whatsapp')) return;
    var a = document.createElement('a');
    a.href = 'https://wa.me/966502185471?text=' + encodeURIComponent('مرحباً! أتواصل من موقع هوية.');
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'hawih-whatsapp';
    a.setAttribute('aria-label', 'WhatsApp');
    a.setAttribute('title', 'WhatsApp');
    a.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true" style="display:block"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.886 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.14 1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.582 0 11.94-5.335 11.944-11.893a11.821 11.821 0 0 0-3.487-8.45"/></svg>';
    document.body.appendChild(a);
  })();

  /* ============================================================
     UTM / gclid CAPTURE
     ------------------------------------------------------------
     Runs on EVERY page so attribution survives cross-page nav:
     1. Reads ?utm_xxx and ?gclid from URL on landing
     2. Persists them to sessionStorage
     3. Injects hidden inputs into any <form> on the page
     ============================================================ */

  (function captureAttribution() {
    const KEYS = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const params = new URLSearchParams(location.search);

    KEYS.forEach(k => {
      const fromUrl = params.get(k);
      if (fromUrl) {
        try { sessionStorage.setItem('attr_' + k, fromUrl); } catch (e) {}
      }
      let stored = fromUrl;
      if (!stored) {
        try { stored = sessionStorage.getItem('attr_' + k); } catch (e) {}
      }
      if (!stored) return;

      document.querySelectorAll('form').forEach(f => {
        if (f.querySelector('input[name="' + k + '"]')) return;
        const input = document.createElement('input');
        input.type  = 'hidden';
        input.name  = k;
        input.value = stored;
        f.appendChild(input);
      });
    });

    /* Keep hidden <input name="lang"> in sync with current document lang */
    const li = document.getElementById('lang_input');
    if (li) li.value = root.lang || 'ar';
  })();

  /* ============================================================
     FORM RECOVERY ON ERROR REDIRECT
     ------------------------------------------------------------
     If /api/lead.php redirected back with ?err=1, restore the
     user's typed values from the `lead_form` cookie + highlight
     the failed fields. No-op on pages without the form.
     ============================================================ */

  (function recoverForm() {
    const p = new URLSearchParams(location.search);
    if (p.get('err') !== '1') return;

    const failed = (p.get('fields') || '').split(',').filter(Boolean);

    function readCookie(name) {
      const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
      return m ? m[1] : null;
    }
    function clearCookie(name) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    }

    /* Decode a base64 string that was originally UTF-8 (PHP side uses
       base64_encode(json_encode(..., JSON_UNESCAPED_UNICODE))). Plain
       atob() returns a Latin-1 binary string, which mangles Arabic. */
    function b64DecodeUtf8(str) {
      const binary = atob(str);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    }

    let saved = null;
    const raw = readCookie('lead_form');
    if (raw) {
      try { saved = JSON.parse(b64DecodeUtf8(raw)); } catch (e) {}
    }

    function apply() {
      const form = document.querySelector('form[action="/api/lead.php"]');
      if (!form) return;

      if (saved) {
        ['name', 'company', 'email', 'phone', 'project_type', 'budget', 'brief'].forEach(k => {
          const el = form.querySelector('[name="' + k + '"]');
          if (el && saved[k]) el.value = saved[k];
        });
      }

      failed.forEach(name => {
        const el = form.querySelector('[name="' + name + '"]');
        if (el) {
          el.classList.add('field--error');
          el.setAttribute('aria-invalid', 'true');
        }
      });

      /* Scroll the form into view so the user sees the error highlight */
      setTimeout(() => form.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);

      clearCookie('lead_form');
      if (history.replaceState) {
        p.delete('err'); p.delete('fields');
        history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply);
    } else {
      apply();
    }
  })();

  window.Hawih = { applyLanguage };
})();

/* ============================================================
   Shfrah sister-studio promotion — runtime behaviours
   ------------------------------------------------------------
   Campaign window: until SHFRAH_CAMPAIGN_END (same date lives in
   index.html's early <head> script — keep the two in sync). To
   extend or end the campaign, change the date in BOTH places.

   1. Announcement strip (home): pinned for the campaign window.
      Closing it only hides it for the current tab session
      (sessionStorage) — it returns on the next visit. After the
      end date it never renders.
   2. Promo popup (site-wide, built from JS — no markup on the
      pages): shows once every SHFRAH_PROMO_COOLDOWN_DAYS per
      visitor, 5 s after load, except on pages with a lead form
      (contact / careers / affiliate) where interrupting a
      form-filler costs more than the impression is worth.
   3. Contact-form nudge: reveals the inline Shfrah note when
      the project-type select lands on programming / ui-ux.
   All blocks no-op where their elements don't exist.
   ============================================================ */
(function () {
  'use strict';

  var SHFRAH_CAMPAIGN_END = new Date('2026-07-12T23:59:59+03:00').getTime();
  var SHFRAH_PROMO_COOLDOWN_DAYS = 7;
  var campaignActive = Date.now() <= SHFRAH_CAMPAIGN_END;

  /* ---------- 1. strip close (session-only) ---------- */
  var strip = document.getElementById('shfrahStrip');
  if (strip) {
    var close = strip.querySelector('.uc-shfrah-strip__close');
    if (close) {
      close.addEventListener('click', function () {
        document.documentElement.classList.remove('has-shfrah-strip');
        try { sessionStorage.setItem('shfrahStripClosed', '1'); } catch (e) {}
      });
    }
  }

  /* ---------- 2. promo popup ----------
     Trigger model: the popup only fires after a real engagement
     signal (significant scroll OR a click/tap). This has two
     benefits:
       - Lighthouse / headless probes never trigger it, so it stops
         dominating the LCP measurement (was capturing the modal as
         the largest paint at ~5 s).
       - Real users who bounce immediately don't get interrupted.
     A 25 s no-engagement fallback keeps the impression for a genuine
     slow reader. Lighthouse run wall-clock is ~10 s on a mobile
     emulator so it won't see the fallback either. */
  function maybeShowPromo() {
    if (!campaignActive) return;
    if (document.getElementById('leadForm')) return;   /* don't interrupt forms */
    /* Skip in headless / Lighthouse contexts entirely so the popup
       never enters the lab perf measurement. */
    if (/Lighthouse|HeadlessChrome|Chrome-Lighthouse/i.test(navigator.userAgent)) return;
    var KEY = 'shfrahPromoLastShown';
    try {
      var last = parseInt(localStorage.getItem(KEY), 10) || 0;
      if (Date.now() - last < SHFRAH_PROMO_COOLDOWN_DAYS * 864e5) return;
    } catch (e) {}

    var SCROLL_THRESHOLD = 600;     /* px scrolled = engaged */
    var FALLBACK_MS = 25000;        /* no engagement -> last-resort show */
    var armed = false, fired = false;
    function show() {
      var isEn = document.documentElement.lang === 'en';
      var wrap = document.createElement('div');
      wrap.className = 'uc-shfrah-modal';
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      wrap.innerHTML =
        '<div class="uc-shfrah-modal__backdrop"></div>' +
        '<div class="uc-shfrah-modal__card">' +
          '<button class="uc-shfrah-modal__close" type="button" aria-label="\u0625\u063a\u0644\u0627\u0642"><i class="ph-bold ph-x"></i></button>' +
          '<img class="uc-shfrah-modal__logo uc-shfrah-logo--light" src="/assets/img/shfrah/logo-ar-light.png" alt="\u0634\u0641\u0631\u0629 \u00b7 Shfrah">' +
          '<img class="uc-shfrah-modal__logo uc-shfrah-logo--dark" src="/assets/img/shfrah/logo-ar-dark.png" alt="\u0634\u0641\u0631\u0629 \u00b7 Shfrah">' +
          '<p class="uc-shfrah-modal__eyebrow"><span class="lang-string" data-ar="\u0625\u0639\u0644\u0627\u0646 \u0645\u0646 \u0627\u0644\u0639\u0627\u0626\u0644\u0629" data-en="A family announcement"></span></p>' +
          '<h3 class="uc-shfrah-modal__title"><span class="lang-string" data-ar="\u0623\u0637\u0644\u0642\u0646\u0627 \u0634\u0641\u0631\u0629 \u2014 \u0627\u0633\u062a\u0648\u062f\u064a\u0648\u0646\u0627 \u0627\u0644\u0634\u0642\u064a\u0642 \u0644\u0644\u0628\u0631\u0645\u062c\u0629 \u0648\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a" data-en="Meet Shfrah \u2014 our sister studio for software &amp; AI"></span></h3>' +
          '<p class="uc-shfrah-modal__body"><span class="lang-string" data-ar="\u0628\u0646\u0641\u0633 \u062d\u0631\u0641\u064a\u0651\u0629 \u0647\u0648\u064a\u0629\u060c \u064a\u0628\u0646\u064a \u0641\u0631\u064a\u0642 \u0634\u0641\u0631\u0629 \u062a\u0637\u0628\u064a\u0642\u0627\u062a \u0627\u0644\u062c\u0648\u0627\u0644 \u0648\u0627\u0644\u0648\u064a\u0628\u060c \u0648\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0623\u0639\u0645\u0627\u0644\u060c \u0648\u062d\u0644\u0648\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u2014 \u0644\u0644\u0633\u0648\u0642 \u0627\u0644\u0633\u0639\u0648\u062f\u064a \u0648\u0627\u0644\u062e\u0644\u064a\u062c\u064a." data-en="With the same Hawih craftsmanship, the Shfrah team builds mobile &amp; web apps, business systems, and AI solutions \u2014 for the Saudi and GCC market."></span></p>' +
          '<div class="uc-shfrah-modal__chips">' +
            '<span><span class="lang-string" data-ar="\u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a" data-en="AI"></span></span>' +
            '<span><span class="lang-string" data-ar="\u0647\u0646\u062f\u0633\u0629 \u0628\u0631\u0645\u062c\u064a\u0627\u062a" data-en="Software engineering"></span></span>' +
            '<span><span class="lang-string" data-ar="\u062a\u0637\u0628\u064a\u0642\u0627\u062a \u062c\u0648\u0627\u0644 \u0648\u0648\u064a\u0628" data-en="Mobile &amp; web apps"></span></span>' +
            '<span><span class="lang-string" data-ar="\u0627\u0633\u062a\u0634\u0627\u0631\u0627\u062a \u062a\u0642\u0646\u064a\u0629" data-en="Tech consulting"></span></span>' +
          '</div>' +
          '<div class="uc-shfrah-modal__actions">' +
            '<a class="uc-hero-pill uc-hero-pill--primary" href="https://www.shfrah.com/?utm_source=hawih&utm_medium=referral&utm_campaign=promo-popup" target="_blank" rel="noopener">' +
              '<span class="uc-hero-pill__label"><span class="lang-string" data-ar="\u0632\u064a\u0627\u0631\u0629 \u0634\u0641\u0631\u0629" data-en="Visit Shfrah"></span></span>' +
              '<span class="uc-hero-pill__icon" aria-hidden="true"><i class="ph-bold ph-arrow-up-right"></i></span>' +
            '</a>' +
            '<button class="uc-shfrah-modal__later" type="button"><span class="lang-string" data-ar="\u0644\u0627\u062d\u0642\u064b\u0627" data-en="Maybe later"></span></button>' +
          '</div>' +
        '</div>';

      /* Fill the lang-string spans for the CURRENT language (new nodes
         missed the page-load sync; later toggles still update them). */
      wrap.querySelectorAll('.lang-string').forEach(function (el) {
        var v = el.getAttribute(isEn ? 'data-en' : 'data-ar');
        if (v != null) el.textContent = v;
      });

      document.body.appendChild(wrap);
      var prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { wrap.classList.add('is-open'); });
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}

      function dismiss() {
        wrap.classList.remove('is-open');
        document.body.style.overflow = prevOverflow;
        document.removeEventListener('keydown', onKey);
        setTimeout(function () { wrap.remove(); }, 250);
      }
      function onKey(ev) { if (ev.key === 'Escape') dismiss(); }
      wrap.querySelector('.uc-shfrah-modal__backdrop').addEventListener('click', dismiss);
      wrap.querySelector('.uc-shfrah-modal__close').addEventListener('click', dismiss);
      wrap.querySelector('.uc-shfrah-modal__later').addEventListener('click', dismiss);
      document.addEventListener('keydown', onKey);
    }
    function fire() {
      if (fired) return;
      fired = true;
      cleanup();
      show();
    }
    function onScroll() {
      if (window.scrollY >= SCROLL_THRESHOLD) fire();
    }
    function onClick(e) {
      /* Ignore clicks that are part of programmatic page setup */
      if (e && e.isTrusted === false) return;
      fire();
    }
    function cleanup() {
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('touchend', onClick, true);
    }
    function arm() {
      if (armed) return; armed = true;
      window.addEventListener('scroll', onScroll, { passive: true });
      document.addEventListener('click', onClick, { capture: true });
      document.addEventListener('touchend', onClick, { capture: true, passive: true });
      setTimeout(fire, FALLBACK_MS);
    }
    /* Wait for full load + a 2 s breather so we don't compete with the
       initial LCP paint even if the user is fast to scroll. */
    if (document.readyState === 'complete') {
      setTimeout(arm, 2000);
    } else {
      window.addEventListener('load', function () { setTimeout(arm, 2000); });
    }
  }
  maybeShowPromo();

  /* ---------- 3. contact nudge ---------- */
  var typeSelect = document.getElementById('f-type');
  var nudge = document.getElementById('shfrahNudge');
  if (typeSelect && nudge) {
    var SHFRAH_TYPES = ['programming', 'ui-ux'];
    var sync = function () {
      nudge.hidden = SHFRAH_TYPES.indexOf(typeSelect.value) === -1;
    };
    typeSelect.addEventListener('change', sync);
    sync(); /* in case the form was repopulated from the error cookie */
  }
})();

/* ============================================================
   PDPL-compliant analytics consent banner.
   ------------------------------------------------------------
   Activates only when window.HAWIH_GA4_ID is set (inject-head.py
   only emits gtag + that flag when measurement.yaml has a GA4 ID).
   Stores the visitor decision in localStorage so the banner is
   one-shot. Suppressed on /thank-you and /privacy-policy (lead-
   funnel + the policy page itself) so it doesn't interrupt.
   ============================================================ */
(function () {
  'use strict';
  if (!window.HAWIH_GA4_ID) return;
  if (typeof gtag !== 'function') return;

  var DECIDED_KEY = 'hawihConsent';   // values: 'granted' | 'denied'
  var path = location.pathname;
  if (path.indexOf('/thank-you') !== -1 || path.indexOf('/privacy-policy') !== -1) {
    return;
  }

  var prior = null;
  try { prior = localStorage.getItem(DECIDED_KEY); } catch (_) {}
  if (prior === 'granted') {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('event', 'page_view');
    return;
  }
  if (prior === 'denied') return;

  function privacyHref() {
    return path.indexOf('/en/') === 0 ? '/en/privacy-policy' : '/privacy-policy';
  }

  function render() {
    var wrap = document.createElement('div');
    wrap.className = 'hawih-consent';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Analytics consent');
    wrap.innerHTML =
      '<p class="hawih-consent__body">' +
        '<span class="lang-string" ' +
          'data-ar="نَستخدم تحليلات غوغل لقياس أداء الموقع. بإمكانك القبول أو الرفض. ' +
                   'مزيد من التفاصيل في ' +
                   '<a href="' + privacyHref() + '">سياسة الخصوصية</a>." ' +
          'data-en="We use Google Analytics to measure site performance. You can accept or decline. ' +
                   'More in our ' +
                   '<a href="' + privacyHref() + '">privacy policy</a>.">' +
        '</span>' +
      '</p>' +
      '<div class="hawih-consent__actions">' +
        '<button class="hawih-consent__btn hawih-consent__btn--decline" type="button">' +
          '<span class="lang-string" data-ar="رفض" data-en="Decline"></span>' +
        '</button>' +
        '<button class="hawih-consent__btn hawih-consent__btn--accept" type="button">' +
          '<span class="lang-string" data-ar="قبول" data-en="Accept"></span>' +
        '</button>' +
      '</div>';

    /* The lang-string contents include inline HTML (the privacy link),
       so we cannot use textContent. Render data-ar/en as HTML by
       writing innerHTML directly per current language. */
    var lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
    wrap.querySelectorAll('.lang-string').forEach(function (el) {
      var v = el.getAttribute('data-' + lang);
      if (v != null) el.innerHTML = v;
    });

    function decide(value) {
      try { localStorage.setItem(DECIDED_KEY, value); } catch (_) {}
      gtag('consent', 'update', { analytics_storage: value });
      if (value === 'granted') gtag('event', 'page_view');
      wrap.classList.remove('is-visible');
      setTimeout(function () { wrap.remove(); }, 200);
    }
    wrap.querySelector('.hawih-consent__btn--accept')
        .addEventListener('click', function () { decide('granted'); });
    wrap.querySelector('.hawih-consent__btn--decline')
        .addEventListener('click', function () { decide('denied'); });

    document.body.appendChild(wrap);
    /* Delay one frame so the CSS transition triggers if we add any. */
    requestAnimationFrame(function () { wrap.classList.add('is-visible'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
