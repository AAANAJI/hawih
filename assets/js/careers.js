/* ============================================================
   careers.js — /careers front-end for the Careers module.

   Talks only to /api/careers.php (same-origin proxy), never the CRM.
   Lists open vacancies (op=list); ?job=SLUG shows one vacancy (op=get)
   plus the apply form; submit posts multipart (incl. the CV file) and
   shows a confirmation. Language from the /en path.
   ============================================================ */
(function () {
  'use strict';
  var root = document.getElementById('careers');
  if (!root) return;
  var API = '/api/careers.php';
  var lang = (location.pathname === '/en' || location.pathname.indexOf('/en/') === 0) ? 'en' : 'ar';
  function L(ar, en) { return lang === 'en' ? en : ar; }

  var listEl   = root.querySelector('.cr-list');
  var detailEl = root.querySelector('.cr-detail');
  var jobEl    = root.querySelector('.cr-job');
  var emptyEl  = root.querySelector('.cr-empty');
  var form     = root.querySelector('#careersForm');
  var doneEl   = root.querySelector('.cr-done');
  var typeLbl  = {
    full_time:  L('دوام كامل', 'Full-time'),
    part_time:  L('دوام جزئي', 'Part-time'),
    contract:   L('عقد', 'Contract'),
    internship: L('تدريب', 'Internship'),
    temporary:  L('مؤقت', 'Temporary')
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function pick(o) { return o ? (lang === 'en' ? (o.en || o.ar) : (o.ar || o.en)) : ''; }
  function jparse(r) { return r.text().then(function (t) { try { return JSON.parse(t); } catch (e) { return {}; } }); }
  function meta(job) {
    var bits = [];
    var loc = pick(job.location); if (loc) bits.push(esc(loc));
    if (job.is_remote) bits.push(L('عن بُعد', 'Remote'));
    if (typeLbl[job.employment_type]) bits.push(typeLbl[job.employment_type]);
    var dep = pick(job.department); if (dep) bits.push(esc(dep));
    return bits.join(' · ');
  }

  var slug = new URLSearchParams(location.search).get('job');
  if (slug) { showDetail(slug); } else { showList(); }

  /* ---------- list ---------- */
  function showList() {
    detailEl.hidden = true; listEl.hidden = false;
    listEl.innerHTML = '<p class="cr-muted">' + L('جارٍ التحميل…', 'Loading…') + '</p>';
    fetch(API + '?op=list', { headers: { Accept: 'application/json' } })
      .then(function (r) { return jparse(r); })
      .catch(function () { return {}; })
      .then(function (d) {
        var jobs = (d && d.jobs) || [];
        if (!jobs.length) { listEl.innerHTML = ''; emptyEl.hidden = false; return; }
        emptyEl.hidden = true;
        listEl.innerHTML = jobs.map(function (j) {
          return '<a class="cr-card" href="?job=' + encodeURIComponent(j.slug) + '">'
            + '<span class="cr-card__t">' + esc(pick(j.title)) + '</span>'
            + '<span class="cr-card__m">' + meta(j) + '</span>'
            + '<span class="cr-card__go">' + L('التفاصيل والتقديم', 'View & apply') + ' <i class="ph-bold ph-arrow-left"></i></span>'
            + '</a>';
        }).join('');
      });
  }

  /* ---------- detail + apply ---------- */
  function showDetail(slug) {
    listEl.hidden = true; emptyEl.hidden = true; detailEl.hidden = false;
    doneEl.hidden = true; form.hidden = true;
    jobEl.innerHTML = '<p class="cr-muted">' + L('جارٍ التحميل…', 'Loading…') + '</p>';
    fetch(API + '?op=get&slug=' + encodeURIComponent(slug), { headers: { Accept: 'application/json' } })
      .then(function (r) { return jparse(r); })
      .catch(function () { return {}; })
      .then(function (d) {
        if (!d || !d.success || !d.job) {
          jobEl.innerHTML = '<p class="cr-muted">' + L('هذه الوظيفة لم تعد متاحة.', 'This opening is no longer available.') + '</p>';
          return;
        }
        var j = d.job;
        var html = '<h2 class="cr-job__t">' + esc(pick(j.title)) + '</h2>'
          + '<p class="cr-job__m">' + meta(j) + '</p>';
        var desc = pick(j.description); if (desc) html += block(L('عن الوظيفة', 'About the role'), desc);
        var req = pick(j.requirements); if (req) html += block(L('المتطلبات', 'Requirements'), req);
        jobEl.innerHTML = html;
        form.querySelector('input[name="job_opening_id"]').value = j.id;
        form.querySelector('input[name="position"]').value = pick(j.title);
        form.hidden = false;
      });
  }
  function block(h, body) {
    return '<h3 class="cr-job__h">' + esc(h) + '</h3><div class="cr-job__b">' + esc(body).replace(/\n/g, '<br>') + '</div>';
  }

  var back = root.querySelector('.cr-back');
  if (back) back.addEventListener('click', function () { location.href = location.pathname; });

  /* ---------- submit ---------- */
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = form.querySelector('[type="submit"]');
    var errBox = form.querySelector('.cr-form-err');
    if (errBox) errBox.hidden = true;
    var cv = form.querySelector('input[name="cv"]');
    if (cv && cv.files[0] && cv.files[0].size > 50 * 1024 * 1024) {
      return formErr(L('حجم الملف أكبر من 50 ميجابايت.', 'File is larger than 50MB.'));
    }
    if (btn) btn.disabled = true;
    fetch(API, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) { return jparse(r).then(function (d) { return { s: r.status, d: d }; }); })
      .then(function (res) {
        if ((res.s === 200 || res.s === 201) && res.d && res.d.success) {
          form.hidden = true; doneEl.hidden = false;
          try { doneEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
        } else if (res.s === 413 || (res.d && res.d.error === 'cv_too_large')) {
          formErr(L('حجم السيرة الذاتية أكبر من 50 ميجابايت.', 'Your CV is larger than 50MB.'));
        } else if (res.d && res.d.error === 'cv_type') {
          formErr(L('صيغة الملف غير مدعومة. استخدم PDF أو Word.', 'Unsupported file. Use PDF or Word.'));
        } else {
          formErr(L('تعذّر إرسال الطلب. حاول مجدداً.', 'Could not submit. Please try again.'));
        }
      })
      .catch(function () { formErr(L('تعذّر إرسال الطلب. حاول مجدداً.', 'Could not submit. Please try again.')); })
      .then(function () { if (btn) btn.disabled = false; });
  });
  function formErr(msg) {
    var box = form.querySelector('.cr-form-err');
    if (box) { box.textContent = msg; box.hidden = false; }
  }
})();
