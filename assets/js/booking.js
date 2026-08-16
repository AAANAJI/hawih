/* ============================================================
   booking.js — /book-meeting front-end for the Meeting Booking module.

   Talks ONLY to /api/booking.php (the same-origin proxy), never the CRM.
   Three steps on one screen: type → date & time → details, then a
   pending-confirmation panel. The slot grid and everything the calendar
   greys out come from the server (op=slots) so the browser can never
   offer a slot that was taken 30s ago; on submit the server re-validates
   and a 409 slot_taken refreshes that day.  See spec §4, §7, §10.
   ============================================================ */
(function () {
  'use strict';
  var root = document.getElementById('booking');
  if (!root) return;

  var API = '/api/booking.php';
  var lang = (location.pathname === '/en' || location.pathname.indexOf('/en/') === 0)
    ? 'en' : 'ar';

  var STR = {
    noslots:   { ar: 'لا تتوفّر مواعيد في هذا اليوم.', en: 'No times available on this day.' },
    pickday:   { ar: 'اختر يوماً من التقويم لعرض المواعيد.', en: 'Pick a day from the calendar to see times.' },
    loading:   { ar: 'جارٍ التحميل…', en: 'Loading…' },
    noavail:   { ar: 'لا تتوفّر مواعيد لهذا النوع حالياً.', en: 'No availability for this type right now.' },
    taken:     { ar: 'عذراً، هذا الموعد لم يعد متاحاً. اخترنا لك المواعيد المحدثة.', en: 'Sorry, that time was just taken. We refreshed the available times.' },
    err:       { ar: 'تعذّر إتمام الحجز. حاول مجدداً أو تواصل عبر واتساب.', en: 'Could not complete the booking. Please try again or reach us on WhatsApp.' },
    offline:   { ar: 'استلمنا طلبك وسنؤكّده يدوياً قريباً.', en: 'We received your request and will confirm it manually shortly.' },
    prev:      { ar: 'الشهر السابق', en: 'Previous month' },
    next:      { ar: 'الشهر التالي', en: 'Next month' }
  };
  function t(k) { return (STR[k] || {})[lang] || (STR[k] || {}).ar || ''; }

  var stepType    = root.querySelector('[data-step="type"]');
  var stepWhen    = root.querySelector('[data-step="when"]');
  var stepDetails = root.querySelector('[data-step="details"]');
  var doneEl      = root.querySelector('.bk-done');
  var calEl       = root.querySelector('.bk-cal');
  var slotsEl     = root.querySelector('.bk-slots');
  var form        = root.querySelector('#bookingForm');
  var summaryEl   = root.querySelector('.bk-summary');

  var state = {
    type: null, cfg: null, view: firstOfMonth(new Date()),
    date: null, start: null, end: null, byDate: {}, horizon: 30
  };

  /* ---------- helpers ---------- */
  function firstOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function ymd(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function j(res) { return res.text().then(function (x) { try { return JSON.parse(x); } catch (e) { return {}; } }); }

  function goto(step) {
    hide(stepType); hide(stepWhen); hide(stepDetails); hide(doneEl);
    if (step === 'type')    show(stepType);
    if (step === 'when')    show(stepWhen);
    if (step === 'details') show(stepDetails);
    if (step === 'done')    show(doneEl);
    var idx = { type: 1, when: 2, details: 3, done: 3 }[step] || 1;
    root.querySelectorAll('.bk-steps [data-n]').forEach(function (li) {
      li.classList.toggle('is-active', +li.getAttribute('data-n') === idx);
      li.classList.toggle('is-done', +li.getAttribute('data-n') < idx);
    });
    try { root.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
  }

  /* ---------- config (optional; graceful fallback) ---------- */
  fetch(API + '?op=config', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? j(r) : null; })
    .catch(function () { return null; })
    .then(function (cfg) {
      state.cfg = cfg || {};
      if (state.cfg.horizon_days) state.horizon = +state.cfg.horizon_days;
      // Hide a type card only when config explicitly disables it.
      if (cfg) {
        if (cfg.online_enabled === false || cfg.online_enabled === 0) hideType('online');
        if (cfg.office_enabled === false || cfg.office_enabled === 0) hideType('office');
      }
      var visible = root.querySelectorAll('.bk-type:not([hidden])');
      if (visible.length === 1) { visible[0].click(); }   // one type → skip the chooser
    });

  function hideType(type) {
    var c = root.querySelector('.bk-type[data-type="' + type + '"]');
    if (c) c.hidden = true;
  }

  /* ---------- step 1: type ---------- */
  root.querySelectorAll('.bk-type').forEach(function (card) {
    card.addEventListener('click', function () {
      state.type = card.getAttribute('data-type');
      root.querySelectorAll('.bk-type').forEach(function (c) { c.classList.remove('is-sel'); });
      card.classList.add('is-sel');
      var mt = form.querySelector('input[name="meeting_type"]');
      if (mt) mt.value = state.type;
      goto('when');
      state.view = firstOfMonth(new Date());
      loadMonth();
    });
  });

  /* ---------- step 2: calendar + slots ---------- */
  function loadMonth() {
    calEl.innerHTML = '<p class="bk-muted">' + t('loading') + '</p>';
    slotsEl.innerHTML = '<p class="bk-muted">' + t('pickday') + '</p>';
    var start = state.view;
    var end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    var from = ymd(start), to = ymd(end);
    fetch(API + '?op=slots&from=' + from + '&to=' + to + '&type=' + encodeURIComponent(state.type),
      { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? j(r) : { days: [] }; })
      .catch(function () { return { days: [] }; })
      .then(function (data) {
        (data.days || []).forEach(function (d) { state.byDate[d.date] = d.slots || []; });
        renderCalendar(data);
      });
  }

  function renderCalendar(data) {
    var y = state.view.getFullYear(), m = state.view.getMonth();
    var monthName = new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'ar', { month: 'long', year: 'numeric' })
      .format(state.view);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var canPrev = state.view > firstOfMonth(today);
    var maxView = firstOfMonth(new Date(today.getFullYear(), today.getMonth(), today.getDate() + state.horizon));
    var canNext = state.view < maxView;

    var html = '<div class="bk-cal__head">'
      + '<button type="button" class="bk-nav" data-dir="-1" aria-label="' + t('prev') + '"' + (canPrev ? '' : ' disabled') + '>&#8250;</button>'
      + '<span class="bk-cal__month">' + monthName + '</span>'
      + '<button type="button" class="bk-nav" data-dir="1" aria-label="' + t('next') + '"' + (canNext ? '' : ' disabled') + '>&#8249;</button>'
      + '</div>';

    var wd = lang === 'en'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    html += '<div class="bk-cal__grid">';
    wd.forEach(function (w) { html += '<span class="bk-cal__wd">' + w + '</span>'; });

    var firstDow = new Date(y, m, 1).getDay();          // 0=Sun
    for (var i = 0; i < firstDow; i++) html += '<span class="bk-cal__pad"></span>';
    var days = new Date(y, m + 1, 0).getDate();
    for (var day = 1; day <= days; day++) {
      var ds = y + '-' + pad(m + 1) + '-' + pad(day);
      var cellDate = new Date(y, m, day);
      var has = (state.byDate[ds] || []).length > 0;
      var past = cellDate < today;
      var cls = 'bk-day' + (has && !past ? '' : ' is-off') + (state.date === ds ? ' is-sel' : '');
      html += '<button type="button" class="' + cls + '" data-date="' + ds + '"'
        + (has && !past ? '' : ' disabled') + '>' + day + '</button>';
    }
    html += '</div>';
    calEl.innerHTML = html;

    calEl.querySelectorAll('.bk-nav').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        var dir = +b.getAttribute('data-dir');
        state.view = new Date(state.view.getFullYear(), state.view.getMonth() + dir, 1);
        loadMonth();
      });
    });
    calEl.querySelectorAll('.bk-day:not([disabled])').forEach(function (b) {
      b.addEventListener('click', function () {
        state.date = b.getAttribute('data-date');
        calEl.querySelectorAll('.bk-day').forEach(function (d) { d.classList.remove('is-sel'); });
        b.classList.add('is-sel');
        renderSlots(state.date);
      });
    });

    var withSlots = (data.days || []).some(function (d) { return (d.slots || []).length; });
    if (!withSlots && !canNext && !canPrev) {
      slotsEl.innerHTML = '<p class="bk-muted">' + t('noavail') + '</p>';
    }
  }

  function renderSlots(date) {
    var slots = state.byDate[date] || [];
    if (!slots.length) { slotsEl.innerHTML = '<p class="bk-muted">' + t('noslots') + '</p>'; return; }
    var lbl = new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'ar-SA',
      { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(date + 'T00:00:00'));
    var html = '<p class="bk-slots__day">' + lbl + '</p><div class="bk-slots__grid">';
    slots.forEach(function (s) {
      html += '<button type="button" class="bk-slot" data-start="' + s.start + '" data-end="' + (s.end || '') + '">' + s.start + '</button>';
    });
    html += '</div>';
    slotsEl.innerHTML = html;
    slotsEl.querySelectorAll('.bk-slot').forEach(function (b) {
      b.addEventListener('click', function () {
        state.start = b.getAttribute('data-start');
        state.end = b.getAttribute('data-end');
        goToDetails();
      });
    });
  }

  /* ---------- step 3: details ---------- */
  function goToDetails() {
    var lbl = new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'ar-SA',
      { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(state.date + 'T00:00:00'));
    if (summaryEl) {
      summaryEl.textContent = (lang === 'en'
        ? (state.type === 'online' ? 'Online' : 'At our office')
        : (state.type === 'online' ? 'اجتماع أونلاين' : 'في مكتبنا'))
        + ' · ' + lbl + ' · ' + state.start;
    }
    form.querySelector('input[name="date"]').value = state.date;
    form.querySelector('input[name="start"]').value = state.start;
    // tracking fields (from the URL; source_page = this page)
    var p = new URLSearchParams(location.search);
    setHidden('source_page', location.pathname);
    ['utm_source', 'utm_medium', 'utm_campaign', 'gclid'].forEach(function (k) {
      setHidden(k, p.get(k) || '');
    });
    setHidden('language', lang);
    goto('details');
  }
  function setHidden(name, val) {
    var el = form.querySelector('input[name="' + name + '"]');
    if (el) el.value = val;
  }

  root.querySelectorAll('[data-back]').forEach(function (b) {
    b.addEventListener('click', function () { goto(b.getAttribute('data-back')); });
  });

  /* ---------- submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = form.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.classList.add('is-busy'); }
    var errBox = form.querySelector('.bk-form-err');
    if (errBox) errBox.hidden = true;

    fetch(API, { method: 'POST', body: new FormData(form),
      headers: { Accept: 'application/json' } })
      .then(function (r) { return j(r).then(function (data) { return { status: r.status, data: data }; }); })
      .then(function (res) {
        if (res.status === 200 && res.data && res.data.success) {
          renderDone(res.data);
        } else if (res.status === 409) {
          // slot taken — go back to the calendar and refresh that day
          goto('when'); loadMonth();
          slotsEl.innerHTML = '<p class="bk-alert">' + t('taken') + '</p>';
        } else if (res.status === 502 || (res.data && res.data.error === 'crm_unreachable')) {
          renderDone({ status: 'pending', offline: true });
        } else {
          formError(res.data && res.data.fields);
        }
      })
      .catch(function () { formError(); })
      .then(function () { if (btn) { btn.disabled = false; btn.classList.remove('is-busy'); } });
  });

  function formError(fields) {
    var box = form.querySelector('.bk-form-err');
    if (box) { box.textContent = t('err'); box.hidden = false; }
    (fields || []).forEach(function (f) {
      var el = form.querySelector('[name="' + f + '"]');
      if (el) el.classList.add('is-invalid');
    });
  }

  function renderDone(data) {
    var lbl = state.date ? new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'ar-SA',
      { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(state.date + 'T00:00:00')) : '';
    var when = lbl + (state.start ? ' · ' + state.start : '');
    var manage = data.manage_url
      ? '<a class="bk-managelink" href="' + data.manage_url + '">'
        + (lang === 'en' ? 'Manage / cancel your booking' : 'إدارة أو إلغاء الحجز') + '</a>'
      : '';
    var msg = data.offline ? t('offline')
      : (lang === 'en'
          ? 'Your request is received and is pending our confirmation. We’ll email you shortly.'
          : 'استلمنا طلبك وهو بانتظار تأكيدنا. سنراسلك عبر البريد قريباً.');
    doneEl.querySelector('.bk-done__when').textContent = when;
    doneEl.querySelector('.bk-done__msg').textContent = msg;
    doneEl.querySelector('.bk-done__manage').innerHTML = manage;
    goto('done');
  }
})();
