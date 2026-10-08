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

  /* ── toast + confirm dialog ─────────────────────────────────────── */
  var toastEl = null, toastTimer = 0;
  TA.toast = function (text, kind, link) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div'); toastEl.className = 'toast' + (kind === 'err' ? ' err' : ''); toastEl.setAttribute('role', 'status');
    toastEl.textContent = text;
    if (link) { var a = document.createElement('a'); a.href = link; a.textContent = ' Go →'; toastEl.appendChild(a); }
    document.body.appendChild(toastEl); clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (toastEl) { toastEl.remove(); toastEl = null; } }, 4200);
  };
  TA.confirm = function (text, okLabel) {
    return new Promise(function (resolve) {
      var d = document.createElement('div'); d.className = 'dlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
      d.innerHTML = '<div class="tcard tcard--ink"><h3>Sure?</h3><p></p><div class="actions"><button type="button" class="btn btn--ghost" data-no>Cancel</button><button type="button" class="btn" data-yes></button></div></div>';
      d.querySelector('p').textContent = text; d.querySelector('[data-yes]').textContent = okLabel || 'Yes, do it';
      function done(v) { d.remove(); resolve(v); }
      d.addEventListener('click', function (e) { if (e.target === d || e.target.hasAttribute('data-no')) done(false); if (e.target.hasAttribute('data-yes')) done(true); });
      document.body.appendChild(d); d.querySelector('[data-yes]').focus();
    });
  };

  /* ── JSON API helper ────────────────────────────────────────────── */
  TA.api = function (url, body, method) {
    return fetch(url, { method: method || 'POST', credentials: 'same-origin', headers: body !== undefined ? { 'content-type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._ok = r.ok; j._status = r.status; return j; }); })
      .catch(function () { TA.netFailed(); return { _ok: false, error: 'Network wahala. Check your connection.' }; });
  };
  function after(j, el) {
    var ok = el.getAttribute('data-ok') || '';
    if (j.redirect && (j._ok || j.code === 'FUNDS')) { if (!j._ok) { TA.toast(j.error, 'err', j.redirect); return; } location.href = j.redirect; return; }
    if (ok === 'reload' || j.reload) { if (j.message) sessionStorage.setItem('ta-flash', j.message); location.reload(); return; }
    if (ok.indexOf('redirect:') === 0) { location.href = ok.slice(9); return; }
    if (j.message) TA.toast(j.message);
  }
  try { var flash = sessionStorage.getItem('ta-flash'); if (flash) { sessionStorage.removeItem('ta-flash'); setTimeout(function () { TA.toast(flash); }, 50); } } catch (e) {}

  /* ── generic forms: <form data-api="/api/..."> ─────────────────── */
  function collect(f) {
    var out = {};
    f.querySelectorAll('input[name],select[name],textarea[name]').forEach(function (i) {
      if (i.type === 'radio') { if (i.checked) out[i.name] = i.value; return; }
      if (i.type === 'checkbox') { out[i.name] = i.checked; return; }
      if (i.type === 'file') return;
      if (i.type === 'datetime-local') { out[i.name] = i.value ? new Date(i.value).toISOString() : ''; return; }
      out[i.name] = i.value;
    });
    return out;
  }
  function clearErrs(f) { f.querySelectorAll('[data-err]').forEach(function (e) { e.textContent = ''; }); f.querySelectorAll('.is-invalid').forEach(function (e) { e.classList.remove('is-invalid'); }); var m = f.querySelector('.ta-msg'); if (m) { m.className = 'ta-msg'; m.textContent = ''; } }
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.matches || !f.matches('form[data-api]')) return;
    e.preventDefault(); clearErrs(f);
    var btn = f.querySelector('button[type=submit]'), label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Small wait…'; }
    TA.api(f.getAttribute('data-api'), collect(f)).then(function (j) {
      if (btn) { btn.disabled = false; btn.textContent = label; }
      if (j._ok) { after(j, f); if (f.hasAttribute('data-reset')) f.reset(); if (f._onok) f._onok(j); return; }
      var errEl = j.field && f.querySelector('[data-err="' + j.field + '"]');
      if (errEl) { errEl.textContent = j.error; var inp = f.querySelector('[name="' + j.field + '"]'); if (inp) { inp.classList.add('is-invalid'); inp.focus(); } }
      else { var m = f.querySelector('.ta-msg'); if (m) { m.className = 'ta-msg err'; m.textContent = j.error || 'Something no work. Try again.'; } }
      if (j.redirect && j.code === 'FUNDS') TA.toast(j.error, 'err', j.redirect);
    });
  });
  /* ── post buttons: <button data-post="/api/..." data-body='{}' data-confirm="..."> ── */
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-post]') : null; if (!b) return;
    e.preventDefault();
    var go = function () {
      var body = {}; try { body = JSON.parse(b.getAttribute('data-body') || '{}'); } catch (x) {}
      b.disabled = true;
      TA.api(b.getAttribute('data-post'), body).then(function (j) { b.disabled = false; if (j._ok) after(j, b); else TA.toast(j.error || 'Something no work.', 'err', j.code === 'FUNDS' ? j.redirect : null); });
    };
    var c = b.getAttribute('data-confirm'); if (c) TA.confirm(c).then(function (y) { if (y) go(); }); else go();
  });
  /* ── image uploads: <input type=file data-upload="fieldName"> ───── */
  document.addEventListener('change', function (e) {
    var i = e.target; if (!i.matches || !i.matches('input[type=file][data-upload]') || !i.files[0]) return;
    var name = i.getAttribute('data-upload'), f = i.closest('form'), fd = new FormData(); fd.append('file', i.files[0]);
    TA.toast('Uploading…');
    fetch('/api/upload', { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.url) { TA.toast(j.error || 'Upload failed', 'err'); return; }
      var h = f.querySelector('input[name="' + name + '"]'); if (h) h.value = j.url;
      var p = f.querySelector('[data-preview="' + name + '"]'); if (p) p.src = j.url;
      TA.toast('Image ready');
    }).catch(function () { TA.toast('Upload failed', 'err'); });
  });
  /* ── live countdowns: <span class="seg" data-countdown="ISO"> ───── */
  function fmtLeft(ms) {
    if (ms <= 0) return '00:00:00';
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); s %= 60;
    if (d > 0) return (d > 99 ? 99 : d) + 'd:' + ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
    return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
  }
  TA.fmtLeft = fmtLeft;
  function tickCountdowns() {
    var now = Date.now();
    document.querySelectorAll('[data-countdown]').forEach(function (el) {
      var t = Date.parse(el.getAttribute('data-countdown')); if (!t) return;
      var v = fmtLeft(t - now).replace('d', '');
      TA.seg(el, v);
      if (t - now <= 0 && el.hasAttribute('data-reload-at-zero') && !el._done) { el._done = true; setTimeout(function () { location.reload(); }, 1200); }
    });
  }

  /* ── big celebration (rank ups) ─────────────────────────────────── */
  TA.celebrate = function (title, sub) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var d = document.createElement('div'); d.className = 'cele'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', title);
    d.innerHTML = '<div class="cele-rays"></div><div class="cele-in"><div class="cele-k"></div><div class="cele-t"></div><button type="button" class="btn btn--shine">Oya, continue</button></div>';
    d.querySelector('.cele-k').textContent = title; d.querySelector('.cele-t').textContent = sub || '';
    document.body.appendChild(d);
    if (navigator.vibrate) { try { navigator.vibrate([60, 40, 60, 40, 120]); } catch (e) {} }
    if (!reduce) {
      var C = ['#ffffff', '#00ff6e', '#efc032', '#e2802a', '#9fb0ff', '#59ffb4'], w = innerWidth, h = innerHeight;
      for (var i = 0; i < 70; i++) { var b = document.createElement('i'); b.className = 'cele-bit'; b.style.background = C[i % C.length]; d.appendChild(b);
        var a = Math.random() * Math.PI * 2, r = 120 + Math.random() * Math.max(w, h) * 0.6;
        b.animate([{ transform: 'translate(' + w / 2 + 'px,' + h / 2 + 'px) rotate(0)', opacity: 1 }, { transform: 'translate(' + (w / 2 + Math.cos(a) * r) + 'px,' + (h / 2 + Math.sin(a) * r + 200) + 'px) rotate(' + (Math.random() * 1080 - 540) + 'deg)', opacity: 0 }], { duration: 1400 + Math.random() * 1200, easing: 'cubic-bezier(.15,.7,.3,1)', delay: Math.random() * 300 }); }
    }
    var close = function () { d.remove(); };
    d.querySelector('button').addEventListener('click', close); d.querySelector('button').focus();
    setTimeout(close, 9000);
  };
  function rankCheck() {
    var el = document.querySelector('[data-rank-level]'); if (!el) return;
    var lvl = +el.getAttribute('data-rank-level'), seen = 0;
    try { seen = +(localStorage.getItem('ta-rank-seen') || 0); localStorage.setItem('ta-rank-seen', String(lvl)); } catch (e) { return; }
    if (seen && lvl > seen) setTimeout(function () { TA.celebrate('Rank up!', el.getAttribute('data-rank-name')); }, 500);
  }

  function ready() {
    rankCheck();
    initSegs();
    if (document.querySelector('[data-countdown]')) { tickCountdowns(); setInterval(tickCountdowns, 1000); }
    if (isIOS && !standalone) showInstallButtons();
    if (!TA.isOnline()) showNet(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
