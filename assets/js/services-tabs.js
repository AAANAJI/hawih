/* ============================================================
   Hawih — services tabbed panel
   Click + arrow-key switching with crossfade.
   Uses standard ARIA pairing: tab[aria-controls] → panel[id].
   ============================================================ */

(function () {
  'use strict';

  const tablist = document.getElementById('servicesTablist');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  if (!tabs.length) return;

  function panelFor(tab) {
    const id = tab.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  }

  function activate(tab, focus) {
    tabs.forEach(t => {
      const selected = t === tab;
      t.setAttribute('aria-selected', selected ? 'true' : 'false');
      t.setAttribute('tabindex', selected ? '0' : '-1');
      const p = panelFor(t);
      if (!p) return;
      if (selected) {
        p.hidden = false;
        p.style.opacity = '0';
        p.style.transform = 'translateY(8px)';
        requestAnimationFrame(() => {
          p.style.opacity = '1';
          p.style.transform = 'translateY(0)';
        });
      } else {
        p.hidden = true;
      }
    });
    if (focus) tab.focus();
  }

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => activate(tab, false));
    tab.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        activate(tabs[(idx + 1) % tabs.length], true);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        activate(tabs[(idx - 1 + tabs.length) % tabs.length], true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        activate(tabs[0], true);
      } else if (e.key === 'End') {
        e.preventDefault();
        activate(tabs[tabs.length - 1], true);
      }
    });
  });

  // Initialise from the tab that already has aria-selected="true"
  const initial = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
  activate(initial, false);
})();
