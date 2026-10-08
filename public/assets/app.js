/* Tap Am shared client: 7-segment displays, menu, offline banner, install prompt,
   service worker and logout. Loaded (deferred) on every themed page. */
(function () {
  'use strict';
  var TA = window.TA = window.TA || {};

  /* ── 7-segment display ─────────────────────────────────────────────
     <span class="seg" data-seg="0042"></span>  then  TA.seg(el, '0043')
     Supports 0-9, space, '-', ':' and a '.' after a digit.            */
  var SEGS = { a: '10,8 15,3 45,3 50,8 45,13 15,13', b: '52,10 57,15 57,43 52,48 47,43 47,15', c: '52,52 57,57 57,85 52,90 47,85 47,57',
    d: '10,92 15,87 45,87 50,92 45,97 15,97', e: '8,52 13,57 13,85 8,90 3,85 3,57', f: '8,10 13,15 13,43 8,48 3,43 3,15', g: '10,50 15,45 45,45 50,50 45,55 15,55' };
  var MAP = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
  var NS = 'http://www.w3.org/2000/svg';
  function digitSvg() {
    var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 66 100'); s.setAttribute('aria-hidden', 'true');
    for (var k in SEGS) { var p = document.createElementNS(NS, 'polygon'); p.setAttribute('points', SEGS[k]); p.setAttribute('data-s', k); s.appendChild(p); }
    var dp = document.createElementNS(NS, 'circle'); dp.setAttribute('cx', '62'); dp.setAttribute('cy', '93'); dp.setAttribute('r', '4.5'); dp.setAttribute('data-s', 'p'); s.appendChild(dp);
    return s;
  }
  function colonSvg() {
    var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 100'); s.setAttribute('class', 'c'); s.setAttribute('aria-hidden', 'true');
    [32, 68].forEach(function (y) { var c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', '12'); c.setAttribute('cy', String(y)); c.setAttribute('r', '5.5'); c.setAttribute('class', 'on'); s.appendChild(c); });
    return s;
  }
  function parse(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (ch === '.' && out.length && out[out.length - 1].t === 'd') { out[out.length - 1].dp = true; continue; }
      out.push(ch === ':' ? { t: 'c' } : { t: 'd', ch: ch, dp: false });
    }
    return out;
  }
  TA.seg = function (el, value) {
    var str = String(value), glyphs = parse(str), sig = glyphs.map(function (g) { return g.t; }).join('');
    if (el._sig !== sig) {
      el.textContent = '';
      glyphs.forEach(function (g) { el.appendChild(g.t === 'c' ? colonSvg() : digitSvg()); });
      el._sig = sig;
      el.setAttribute('role', 'img');
    }
    var svgs = el.children;
    glyphs.forEach(function (g, i) {
      if (g.t !== 'd') return;
      var on = MAP[g.ch] !== undefined ? MAP[g.ch] : '';
      var parts = svgs[i].children;
      for (var j = 0; j < parts.length; j++) {
        var s = parts[j].getAttribute('data-s');
        parts[j].classList.toggle('on', s === 'p' ? g.dp : on.indexOf(s) > -1);
      }
    });
    el.setAttribute('aria-label', el.getAttribute('data-label') ? el.getAttribute('data-label') + ' ' + str.trim() : str.trim());
  };
  function initSegs() { document.querySelectorAll('[data-seg]').forEach(function (el) { TA.seg(el, el.getAttribute('data-seg')); }); }

  /* ── menu sheet ─────────────────────────────────────────────────── */
  var lastFocus = null;
  function openMenu() {
    var m = document.getElementById('menu'); if (!m) return;
    lastFocus = document.activeElement; m.hidden = false; document.body.style.overflow = 'hidden';
    var f = m.querySelector('a,button'); if (f) f.focus();
  }
  function closeMenu() {
    var m = document.getElementById('menu'); if (!m || m.hidden) return;
    m.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-menu-open],[data-menu-close],[data-logout],[data-install]') : null;
    if (!t) return;
    if (t.hasAttribute('data-menu-open')) openMenu();
    else if (t.hasAttribute('data-menu-close')) closeMenu();
    else if (t.hasAttribute('data-logout')) logout(t);
    else if (t.hasAttribute('data-install')) install();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ── logout (also clears cached pages for privacy) ──────────────── */
  function logout(btn) {
    btn.disabled = true;
    var done = function () { location.href = '/'; };
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(function () {}).then(function () {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'clear-pages' });
      setTimeout(done, 80);
    });
  }

  /* ── offline / online banner ────────────────────────────────────── */
  var bar = null, hideTimer = null;
  function showNet(online) {
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'netbar'; bar.setAttribute('role', 'status'); bar.setAttribute('aria-live', 'polite');
      bar.innerHTML = '<span class="netbar-dot"></span><span class="netbar-text"></span>';
      document.body.appendChild(bar);
    }
    clearTimeout(hideTimer);
    bar.hidden = false;
    bar.classList.toggle('ok', online);
    bar.querySelector('.netbar-text').innerHTML = online
      ? '<b>You don come back online.</b> Everything dey work again.'
      : '<b>Your internet don cut.</b> Check your data or Wi-Fi. We go continue when e come back.';
    if (online) hideTimer = setTimeout(function () { bar.hidden = true; }, 3000);
    document.documentElement.classList.toggle('is-offline', !online);
  }
  TA.isOnline = function () { return navigator.onLine !== false; };
  window.addEventListener('offline', function () { showNet(false); });
  window.addEventListener('online', function () { showNet(true); document.dispatchEvent(new Event('ta:online')); });
  TA.netFailed = function () { if (!TA.isOnline()) showNet(false); };

  /* ── install (add to home screen) ───────────────────────────────── */
  var deferred = null;
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  function showInstallButtons() { if (standalone) return; document.querySelectorAll('[data-install]').forEach(function (b) { b.hidden = false; }); }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; showInstallButtons(); });
  window.addEventListener('appinstalled', function () { deferred = null; document.querySelectorAll('[data-install]').forEach(function (b) { b.hidden = true; }); });
  function install() {
    if (deferred) { deferred.prompt(); deferred.userChoice.finally(function () { deferred = null; }); return; }
    if (isIOS) alertBox('To install Tap Am on iPhone: tap the Share button in Safari, then “Add to Home Screen”.');
    else alertBox('Open your browser menu and choose “Install app” or “Add to Home screen”.');
  }
  function alertBox(text) {
    var d = document.createElement('div'); d.className = 'netbar ok'; d.setAttribute('role', 'status');
    d.innerHTML = '<span class="netbar-dot"></span><span></span>'; d.lastChild.textContent = text;
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 6000);
  }

  /* ── service worker ─────────────────────────────────────────────── */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {}); });
  }

  function ready() {
    initSegs();
    if (isIOS && !standalone) showInstallButtons();
    if (!TA.isOnline()) showNet(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
