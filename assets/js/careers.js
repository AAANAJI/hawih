/* ============================================================
   careers.js — /careers front-end for the Careers module.

   Talks only to /api/careers.php (same-origin proxy), never the CRM.
     /careers                 → vacancy cards (+ general-application card)
     /careers?job=SLUG        → vacancy detail + application form
     /careers?apply=general   → general application (talent pool)
   The form posts multipart via XHR so large CVs show upload progress.
   Language comes from the /en path.
   ============================================================ */
(function () {
  'use strict';
  var root = document.getElementById('careers');
  if (!root) return;

  var API = '/api/careers.php';
  var WA = 'https://wa.me/966502185471';
  var MAX = 50 * 1024 * 1024;
  var EXT = ['pdf', 'doc', 'docx'];
  var en = location.pathname === '/en' || location.pathname.indexOf('/en/') === 0;
  var lang = en ? 'en' : 'ar';
  function L(ar, e) { return en ? e : ar; }
  var NUM = new Intl.NumberFormat(en ? 'en' : 'ar-SA');
  function num(n) { return NUM.format(n); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pick(o) { return o ? (en ? (o.en || o.ar || '') : (o.ar || o.en || '')) : ''; }
  function $(s, el) { return (el || root).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); }
  function getJSON(url) {
    return fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.text(); })
      .then(function (t) { try { return JSON.parse(t); } catch (e) { return {}; } })
      .catch(function () { return {}; });
  }

  var TYPE = {
    full_time: L('دوام كامل', 'Full-time'), part_time: L('دوام جزئي', 'Part-time'),
    contract: L('عقد', 'Contract'), internship: L('تدريب', 'Internship'), temporary: L('مؤقت', 'Temporary')
  };
  var GO_ICON = en ? 'ph-arrow-up-right' : 'ph-arrow-up-left';

  function posted(d) {
    if (!d) return '';
    var t = Date.parse(d + 'T00:00:00');   // local midnight of the post date
    if (isNaN(t)) return '';
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var days = Math.round((today - t) / 86400000);   // whole calendar days
    if (days < 0) days = 0;
    if (days > 45) {
      return L('نُشرت ', 'Posted ') + new Intl.DateTimeFormat(en ? 'en' : 'ar-SA', { day: 'numeric', month: 'long' }).format(t);
    }
    try {
      return L('نُشرت ', 'Posted ') + new Intl.RelativeTimeFormat(en ? 'en' : 'ar-SA', { numeric: 'auto' }).format(-days, 'day');
    } catch (e) { return ''; }
  }
  function tagsHTML(j) {
    var h = '';
    var dep = pick(j.department);
    if (dep) h += '<span class="cr-tag cr-tag--blue"><i class="ph-bold ph-buildings"></i>' + esc(dep) + '</span>';
    if (TYPE[j.employment_type]) h += '<span class="cr-tag"><i class="ph-bold ph-briefcase"></i>' + TYPE[j.employment_type] + '</span>';
    if (+j.is_remote) h += '<span class="cr-tag cr-tag--ok"><i class="ph-bold ph-globe"></i>' + L('عن بُعد', 'Remote') + '</span>';
    return h;
  }
  function metaHTML(j) {
    var h = '';
    var loc = pick(j.location);
    if (loc) h += '<span><i class="ph-bold ph-map-pin"></i>' + esc(loc) + '</span>';
    var p = posted(j.date_posted);
    if (p) h += '<span><i class="ph-bold ph-clock"></i>' + esc(p) + '</span>';
    return h;
  }

  /* Text → HTML: blank lines split paragraphs; lines starting with
     - • * – or "1." / "1)" become list items. asList forces one item
     per non-empty line (typical for requirements). */
  function rich(text, asList) {
    var lines = String(text || '').replace(/\r/g, '').split('\n');
    var out = '', para = [], items = [];
    function flushP() { if (para.length) { out += '<p>' + esc(para.join(' ')) + '</p>'; para = []; } }
    function flushL() { if (items.length) { out += '<ul>' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>'; items = []; } }
    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) { flushP(); flushL(); return; }
      var m = line.match(/^(?:[-•*–·]|\d+[.)])\s*(.+)$/);
      if (m || asList) { flushP(); items.push(m ? m[1] : line); }
      else { flushL(); para.push(line); }
    });
    flushP(); flushL();
    return out;
  }

  /* ---------- localise static bits the en-mirror can't (options, placeholders) ---------- */
  if (en) {
    $$('option[data-en]').forEach(function (o) { o.textContent = o.getAttribute('data-en'); });
    $$('[data-ph-en]').forEach(function (el) { el.setAttribute('placeholder', el.getAttribute('data-ph-en')); });
  }

  /* ---------- routing ---------- */
  var q = new URLSearchParams(location.search);
  var listView = $('.cr-view--list'), detailView = $('.cr-view--detail');
  var current = null;   // the opening being applied to (null = general)


  /* ---------- list ---------- */
  function showList() {
    var list = $('.cr-list');
    list.innerHTML = '<div class="cr-skel"></div><div class="cr-skel"></div>';
    getJSON(API + '?op=list').then(function (d) {
      var jobs = (d && d.jobs) || [];
      if (!jobs.length) { list.innerHTML = ''; $('.cr-empty').hidden = false; return; }
      var n = jobs.length;
      var c = $('.cr-count');
      c.textContent = en ? (n === 1 ? '1 open role' : num(n) + ' open roles')
        : (n === 1 ? 'وظيفة واحدة متاحة' : n === 2 ? 'وظيفتان متاحتان' : n <= 10 ? num(n) + ' وظائف متاحة' : num(n) + ' وظيفة متاحة');
      c.hidden = false;
      var h = jobs.map(function (j, i) {
        var sum = pick(j.summary);
        return '<a class="cr-card" style="--i:' + i + '" href="?job=' + encodeURIComponent(j.slug) + '">'
          + '<div class="cr-card__main">'
          + '<div class="cr-tags">' + tagsHTML(j) + '</div>'
          + '<h3 class="cr-card__t">' + esc(pick(j.title)) + '</h3>'
          + (sum ? '<p class="cr-card__x">' + esc(sum) + '</p>' : '')
          + '<div class="cr-meta">' + metaHTML(j) + '</div>'
          + '</div>'
          + '<span class="cr-card__go" aria-hidden="true"><i class="ph-bold ' + GO_ICON + '"></i></span>'
          + '</a>';
      }).join('');
      h += '<a class="cr-card cr-card--general" style="--i:' + n + '" href="?apply=general">'
        + '<span class="cr-card__ico"><i class="ph-bold ph-paper-plane-tilt"></i></span>'
        + '<div class="cr-card__main"><h3 class="cr-card__t">' + L('لم تجد الوظيفة المناسبة؟', 'Don’t see the right role?') + '</h3>'
        + '<p class="cr-card__x">' + L('أرسل سيرتك الذاتية وسنتواصل معك عند توفر فرصة تناسبك.', 'Send us your CV and we will reach out when a fitting role opens.') + '</p></div>'
        + '<span class="cr-card__go" aria-hidden="true"><i class="ph-bold ' + GO_ICON + '"></i></span></a>';
      list.innerHTML = h;
    });
  }

  /* ---------- detail ---------- */
  function openDetail() {
    listView.hidden = true;
    detailView.hidden = false;
    document.documentElement.classList.add('cr-detail');
  }

  function showJob(slug) {
    openDetail();
    $('.cr-dtitle').innerHTML = '<span class="cr-skel cr-skel--lg" style="display:block"></span>';
    $('.cr-tags', detailView).innerHTML = '<span class="cr-skel cr-skel--sm" style="display:block"></span>';
    getJSON(API + '?op=get&slug=' + encodeURIComponent(slug)).then(function (d) {
      if (!d || !d.success || !d.job) return notFound();
      var j = d.job;
      current = j;
      var title = pick(j.title);
      document.title = title + L(' | وظائف هوية', ' | Hawih Careers');
      $('.cr-tags', detailView).innerHTML = tagsHTML(j);
      $('.cr-dtitle').textContent = title;
      $('.cr-meta', detailView).innerHTML = metaHTML(j);
      var about = pick(j.description), req = pick(j.requirements);
      if (about) { $('.cr-sec--about .cr-rich').innerHTML = rich(about, false); $('.cr-sec--about').hidden = false; }
      if (req) { $('.cr-sec--req .cr-rich').innerHTML = rich(req, true); $('.cr-sec--req').hidden = false; }
      facts(j);
      setupForm(j.id, title, L('قدّم على وظيفة ', 'Apply for ') + title);
    });
  }

  function showGeneral() {
    openDetail();
    current = null;
    document.title = L('تقديم عام | وظائف هوية', 'General application | Hawih Careers');
    $('.cr-tags', detailView).innerHTML = '<span class="cr-tag cr-tag--blue"><i class="ph-bold ph-users-three"></i>' + L('بنك المواهب', 'Talent pool') + '</span>';
    $('.cr-dtitle').textContent = L('تقديم عام', 'General application');
    var lead = $('.cr-dlead');
    lead.textContent = L('لم تجد الوظيفة المناسبة؟ أرسل سيرتك الذاتية وسنحتفظ بها في بنك المواهب، ونتواصل معك عند توفر فرصة تناسب خبرتك.',
      'Don’t see the right role? Send your CV — we keep it in our talent pool and reach out when a role fits your experience.');
    lead.hidden = false;
    $('.cr-share').hidden = true;
    $('.cr-dgrid').classList.add('is-solo');
    $('.cr-aside').hidden = true;
    setupForm(0, L('تقديم عام', 'General application'), L('أرسل سيرتك الذاتية', 'Send your CV'));
  }

  function notFound() {
    $('.cr-tags', detailView).innerHTML = '';
    $('.cr-dtitle').textContent = L('هذه الوظيفة لم تعد متاحة', 'This role is no longer open');
    var lead = $('.cr-dlead');
    lead.textContent = L('ربما أُغلقت الوظيفة أو تغيّر رابطها. تصفّح الوظائف المتاحة، أو أرسل سيرتك لبنك المواهب.',
      'It may have closed or moved. Browse the open roles, or send your CV to our talent pool.');
    lead.hidden = false;
    $('.cr-dactions').innerHTML = '<a class="cr-btn cr-btn--primary" href="' + location.pathname + '">' + L('كل الوظائف', 'All roles') + '<i class="ph-bold ph-briefcase"></i></a>'
      + '<a class="cr-btn cr-btn--ghost" href="?apply=general">' + L('أرسل سيرتك', 'Send your CV') + '<i class="ph-bold ph-paper-plane-tilt"></i></a>';
    $('.cr-dgrid').hidden = true;
  }

  function facts(j) {
    var rows = [
      ['ph-buildings', L('القسم', 'Department'), pick(j.department)],
      ['ph-map-pin', L('الموقع', 'Location'), pick(j.location)],
      ['ph-briefcase', L('نوع الدوام', 'Employment'), TYPE[j.employment_type] || ''],
      ['ph-globe', L('طريقة العمل', 'Work mode'), +j.is_remote ? L('عن بُعد', 'Remote') : L('من المكتب', 'On-site')]
    ];
    $('.cr-facts').innerHTML = rows.filter(function (r) { return r[2]; }).map(function (r) {
      return '<div class="cr-fact"><i class="ph-bold ' + r[0] + '"></i><span><small>' + r[1] + '</small><b>' + esc(r[2]) + '</b></span></div>';
    }).join('');
  }

  /* apply buttons → smooth scroll to the form, then focus the first field */
  $$('.cr-go-apply').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var t = document.getElementById('apply');
      if (!t) return;
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { var f = document.getElementById('cr-first'); if (f) f.focus({ preventScroll: true }); }, 650);
    });
  });

  /* share: native sheet on mobile, WhatsApp otherwise */
  var share = $('.cr-share');
  if (share) share.addEventListener('click', function () {
    var title = current ? pick(current.title) : '';
    var text = L('وظيفة في هوية: ', 'Role at Hawih: ') + title;
    if (navigator.share) { navigator.share({ title: text, url: location.href }).catch(function () {}); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + location.href), '_blank', 'noopener');
  });

  /* ---------- form ---------- */
  var form = document.getElementById('careersForm');
  var done = $('.cr-done');
  var alertBox = $('.cr-alert');
  var drop = $('.cr-drop'), fileIn = document.getElementById('cr-cv'), chip = $('.cr-file');
  var applyTitle = '';

  function setupForm(id, title, heading) {
    applyTitle = title;
    form.elements.job_opening_id.value = id || 0;
    form.elements.position.value = title;
    $('.cr-form__t').textContent = heading;
  }

  function fieldErr(el, msg) {
    var wrap = el.closest('.cr-f');
    var box = wrap && wrap.querySelector('.cr-ferr');
    if (el.classList.contains('cr-drop__input')) drop.classList.toggle('is-bad', !!msg);
    else el.classList.toggle('is-bad', !!msg);
    if (box) { box.textContent = msg || ''; box.hidden = !msg; }
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function showAlert(html) { alertBox.innerHTML = '<i class="ph-bold ph-warning-circle"></i><span>' + html + '</span>'; alertBox.hidden = false; }
  function hideAlert() { alertBox.hidden = true; }

  function sizeLabel(b) {
    return b >= 1048576 ? num(Math.round(b / 104857.6) / 10) + L(' ميجابايت', ' MB') : num(Math.max(1, Math.round(b / 1024))) + L(' كيلوبايت', ' KB');
  }
  function checkFile(f) {
    if (!f) return '';
    var ext = (f.name.split('.').pop() || '').toLowerCase();
    if (EXT.indexOf(ext) < 0) return L('صيغة غير مدعومة — استخدم PDF أو Word.', 'Unsupported file — use PDF or Word.');
    if (f.size > MAX) return L('الملف أكبر من ٥٠ ميجابايت.', 'The file is larger than 50MB.');
    return '';
  }
  function renderFile() {
    var f = fileIn.files && fileIn.files[0];
    var bad = checkFile(f);
    if (f && !bad) {
      chip.querySelector('.cr-file__n').textContent = f.name;
      chip.querySelector('.cr-file__z').textContent = sizeLabel(f.size);
      chip.hidden = false; drop.hidden = true;
      fieldErr(fileIn, '');
    } else {
      chip.hidden = true; drop.hidden = false;
      if (bad) { fileIn.value = ''; }
      fieldErr(fileIn, bad);
    }
  }
  fileIn.addEventListener('change', renderFile);
  chip.querySelector('.cr-file__x').addEventListener('click', function () { fileIn.value = ''; renderFile(); });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('is-over'); }); });

  // clear a field's error as soon as the user edits it
  $$('.cr-input', form).forEach(function (el) {
    el.addEventListener('input', function () { if (el.classList.contains('is-bad')) fieldErr(el, ''); });
  });

  function validate() {
    var E = form.elements, firstBad = null;
    function bad(el, msg) { fieldErr(el, msg); if (msg && !firstBad) firstBad = el; }
    bad(E.first_name, E.first_name.value.trim() ? '' : L('اكتب اسمك الأول.', 'Enter your first name.'));
    var em = E.email.value.trim();
    bad(E.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em) ? '' : L('اكتب بريداً إلكترونياً صحيحاً.', 'Enter a valid email address.'));
    var ph = E.phone.value.replace(/\D/g, '');
    bad(E.phone, !E.phone.value.trim() || ph.length >= 8 ? '' : L('رقم الجوّال غير صحيح.', 'Enter a valid phone number.'));
    var link = E.linkedin_url.value.trim();
    if (link && !/^https?:\/\//i.test(link)) { link = 'https://' + link; E.linkedin_url.value = link; }
    bad(E.linkedin_url, !link || /^https?:\/\/[^\s.]+\.[^\s]{2,}/i.test(link) ? '' : L('الرابط غير صحيح.', 'Enter a valid link.'));
    var f = fileIn.files && fileIn.files[0];
    var fbad = checkFile(f);
    if (!fbad && !f && !link) fbad = L('أرفق سيرتك الذاتية أو أضف رابط بروفايلك.', 'Attach your CV or add your profile link.');
    bad(fileIn, fbad);
    if (firstBad) {
      var t = firstBad.classList.contains('cr-drop__input') ? drop : firstBad;
      t.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (t === firstBad) setTimeout(function () { firstBad.focus({ preventScroll: true }); }, 350);
    }
    return !firstBad;
  }

  var btn = form.querySelector('.cr-submit'), btnText = btn.querySelector('.cr-submit__t'), btnIcon = btn.querySelector('i');
  var btnLabel = btnText.textContent;
  function busy(on, label) {
    btn.disabled = on;
    btnText.textContent = on ? (label || L('جارٍ الإرسال…', 'Sending…')) : btnLabel;
    btnIcon.className = on ? 'ph-bold ph-circle-notch cr-spin' : 'ph-bold ph-paper-plane-tilt';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideAlert();
    if (!validate()) return;
    var hasFile = !!(fileIn.files && fileIn.files[0]);
    busy(true);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', API, true);
    xhr.setRequestHeader('Accept', 'application/json');
    if (hasFile && xhr.upload) {
      xhr.upload.onprogress = function (ev) {
        if (!ev.lengthComputable) return;
        var p = Math.min(99, Math.round(ev.loaded / ev.total * 100));
        btnText.textContent = L('جارٍ رفع الملف… ', 'Uploading… ') + num(p) + L('٪', '%');
      };
    }
    xhr.onload = function () {
      var d = {};
      try { d = JSON.parse(xhr.responseText || '{}'); } catch (err) {}
      handle(xhr.status, d);
    };
    xhr.onerror = function () { handle(0, {}); };
    xhr.send(new FormData(form));
  });

  function handle(status, d) {
    busy(false);
    if (status >= 200 && status < 300 && d && d.success) return success();
    if (status === 413 || (d && d.error === 'cv_too_large')) return fieldErr(fileIn, L('الملف أكبر من ٥٠ ميجابايت.', 'The file is larger than 50MB.'));
    if (d && d.error === 'cv_type') return fieldErr(fileIn, L('صيغة غير مدعومة — استخدم PDF أو Word.', 'Unsupported file — use PDF or Word.'));
    if (status === 422 && d && d.fields) {
      d.fields.forEach(function (n) { if (form.elements[n]) fieldErr(form.elements[n], L('تحقّق من هذا الحقل.', 'Please check this field.')); });
      return;
    }
    showAlert(L('تعذّر إرسال الطلب حالياً. حاول مرة أخرى بعد قليل، أو ',
      'We couldn’t submit your application right now. Please try again shortly, or ')
      + '<a href="' + WA + '" target="_blank" rel="noopener">' + L('أرسل سيرتك عبر واتساب', 'send your CV on WhatsApp') + '</a>.');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function success() {
    var name = form.elements.first_name.value.trim();
    $('.cr-done__m').textContent = current
      ? L('شكراً ' + name + '! استلمنا طلبك لوظيفة «' + applyTitle + '». سيراجعه فريق التوظيف ويتواصل معك إن كان مناسباً.',
          'Thanks ' + name + '! We received your application for “' + applyTitle + '”. Our hiring team will review it and reach out if there is a fit.')
      : L('شكراً ' + name + '! أضفنا سيرتك إلى بنك المواهب، وسنتواصل معك عند توفر فرصة تناسبك.',
          'Thanks ' + name + '! Your CV is in our talent pool — we will reach out when a fitting role opens.');
    form.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try {
      (window.dataLayer = window.dataLayer || []).push({
        event: 'job_application_submit',
        job_id: current ? current.id : 0,
        job_title: applyTitle
      });
    } catch (e) {}
  }

  /* ---------- route (last: every handler above is wired first) ---------- */
  if (q.get('job')) showJob(q.get('job'));
  else if (q.get('apply') === 'general') showGeneral();
  else showList();
})();
