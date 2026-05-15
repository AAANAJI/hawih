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

  /* ---------- Language ---------- */
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

    try { localStorage.setItem('lang', lang); } catch (e) {}
  }

  langBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      applyLanguage(currentLang === 'ar' ? 'en' : 'ar');
    });
  });

  try {
    const saved = localStorage.getItem('lang');
    if (saved && saved !== currentLang) applyLanguage(saved);
  } catch (e) {}

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
    a.innerHTML = '<iconify-icon icon="ri:whatsapp-fill" width="28" aria-hidden="true"></iconify-icon>';
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
