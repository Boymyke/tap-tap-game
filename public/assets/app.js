/* Tap Am shared client (loaded deferred on every page):
   instant page switches (prefetch + swap), loading ring, toasts with "go" buttons, upgrade
   pop-ups, forms, copy/share, tooltips, live countdowns, comma number inputs, connection
   banner, install prompt, service worker, 7-segment displays and celebrations. */
(function () {
  'use strict';
  var TA = window.TA = window.TA || {};
  var NONCE = (document.currentScript && (document.currentScript.nonce || document.currentScript.getAttribute('nonce'))) || '';
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ── 7-segment display ───────────────────────────────────────────── */
  var SEGS = { a: '10,8 15,3 45,3 50,8 45,13 15,13', b: '52,10 57,15 57,43 52,48 47,43 47,15', c: '52,52 57,57 57,85 52,90 47,85 47,57',
    d: '10,92 15,87 45,87 50,92 45,97 15,97', e: '8,52 13,57 13,85 8,90 3,85 3,57', f: '8,10 13,15 13,43 8,48 3,43 3,15', g: '10,50 15,45 45,45 50,50 45,55 15,55' };
  var MAP = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '', 'm': 'ceg', 'k': 'fegc', 'b': 'fedcg' };
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
    if (el._sig !== sig) { el.textContent = ''; glyphs.forEach(function (g) { el.appendChild(g.t === 'c' ? colonSvg() : digitSvg()); }); el._sig = sig; el.setAttribute('role', 'img'); }
    var svgs = el.children;
    glyphs.forEach(function (g, i) {
      if (g.t !== 'd') return;
      var on = MAP[g.ch] !== undefined ? MAP[g.ch] : '', parts = svgs[i].children;
      for (var j = 0; j < parts.length; j++) { var s = parts[j].getAttribute('data-s'); parts[j].classList.toggle('on', s === 'p' ? g.dp : on.indexOf(s) > -1); }
    });
    el.setAttribute('aria-label', (el.getAttribute('data-label') ? el.getAttribute('data-label') + ' ' : '') + str.trim());
  };

  /* ── numbers ─────────────────────────────────────────────────────── */
  TA.short = function (n) { n = Number(n || 0); var a = Math.abs(n), f = function (v, s) { return (Math.round(v * 10) / 10).toString().replace(/\.0$/, '') + s; }; return a >= 1e9 ? f(n / 1e9, 'b') : a >= 1e6 ? f(n / 1e6, 'm') : Math.round(n).toLocaleString('en-NG'); };
  TA.naira = function (k) { return '₦' + (Number(k || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 }); };
  // Full countdown text: "2d 03h 14m 09s", "03h 14m 09s", "14m 09s", "09s"
  TA.fmtFull = function (ms) {
    if (ms <= 0) return '0s';
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); s %= 60;
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    if (d) return d + 'd ' + p(h) + 'h ' + p(m) + 'm ' + p(s) + 's';
    if (h) return h + 'h ' + p(m) + 'm ' + p(s) + 's';
    if (m) return m + 'm ' + p(s) + 's';
    return s + 's';
  };
  TA.fmtLeft = function (ms) {
    if (ms <= 0) return '00:00:00';
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); s %= 60;
    if (d > 0) return Math.min(d, 99) + ':' + ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
    return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
  };

  /* ── menu sheet ──────────────────────────────────────────────────── */
  var lastFocus = null;
  function openMenu() { var m = document.getElementById('menu'); if (!m) return; lastFocus = document.activeElement; m.hidden = false; document.body.style.overflow = 'hidden'; var f = m.querySelector('a,button'); if (f) f.focus(); }
  function closeMenu() { var m = document.getElementById('menu'); if (!m || m.hidden) return; m.hidden = true; document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  TA.closeMenu = closeMenu;

  /* ── logout (also clears cached pages for privacy) ───────────────── */
  function logout(btn) {
    btn.classList.add('is-loading');
    cache = {};
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(function () {}).then(function () {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'clear-pages' });
      setTimeout(function () { location.href = document.body.getAttribute('data-after-logout') || '/'; }, 80);
    });
  }

  /* ── connection banner ───────────────────────────────────────────── */
  var bar = null, hideTimer = null;
  function showNet(online) {
    if (!bar) { bar = document.createElement('div'); bar.className = 'netbar'; bar.setAttribute('role', 'status'); bar.setAttribute('aria-live', 'polite'); bar.innerHTML = '<span class="netbar-dot"></span><span class="netbar-text"></span>'; }
    if (!bar.isConnected) document.body.appendChild(bar);
    clearTimeout(hideTimer); bar.hidden = false; bar.classList.toggle('ok', online);
    bar.querySelector('.netbar-text').textContent = online ? 'You don come back online' : 'Your internet don cut. Check your data or Wi-Fi.';
    if (online) hideTimer = setTimeout(function () { bar.hidden = true; }, 2800);
    document.documentElement.classList.toggle('is-offline', !online);
  }
  TA.isOnline = function () { return navigator.onLine !== false; };
  window.addEventListener('offline', function () { showNet(false); document.dispatchEvent(new Event('ta:offline')); });
  window.addEventListener('online', function () { showNet(true); document.dispatchEvent(new Event('ta:online')); });
  TA.netFailed = function () { if (!TA.isOnline()) showNet(false); };

  /* ── install (add to home screen) ────────────────────────────────── */
  var deferred = null;
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  function showInstallButtons() { if (standalone) return; $$('[data-install]').forEach(function (b) { b.hidden = false; }); }
  // Step-by-step install help for the device in hand.
  function installSteps() {
    var ua = navigator.userAgent, ipad = /ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (isIOS || ipad) {
      if (/crios|fxios|edgios/i.test(ua)) return { title: 'Install on iPhone / iPad', steps: ['Tap the Share button (square with an arrow) in this browser. If you don’t see “Add to Home Screen”, open www.tapammm.live in Safari instead.', 'Scroll down and tap “Add to Home Screen”.', 'Tap “Add”. Tap Am now sits on your home screen like an app.'] };
      return { title: 'Install on iPhone / iPad', steps: ['Tap the Share button (square with an arrow up) at the bottom of Safari.', 'Scroll down and tap “Add to Home Screen”.', 'Tap “Add” at the top right. Open Tap Am from your home screen.'] };
    }
    if (/samsungbrowser/i.test(ua)) return { title: 'Install on Samsung', steps: ['Tap the menu (three lines) at the bottom right.', 'Tap “Add page to”, then “Home screen”.', 'Tap “Add”. Open Tap Am from your home screen.'] };
    if (/android/i.test(ua)) return { title: 'Install on Android', steps: ['Tap the menu (three dots) at the top right of Chrome.', 'Tap “Install app” or “Add to Home screen”.', 'Tap “Install”. Tap Am shows up with your other apps.'] };
    if (/firefox/i.test(ua)) return { title: 'Install on computer', steps: ['Firefox can’t install web apps. Open www.tapammm.live in Chrome or Edge.', 'Click the install icon at the right end of the address bar.', 'Click “Install”. Tap Am opens in its own window.'] };
    return { title: 'Install on computer', steps: ['Look at the right end of the address bar (Chrome or Edge).', 'Click the install icon (a screen with a down arrow), or open the browser menu and choose “Install Tap Am”.', 'Click “Install”. Tap Am opens in its own window and stays in your apps.'] };
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; showInstallButtons(); });
  window.addEventListener('appinstalled', function () { deferred = null; $$('[data-install]').forEach(function (b) { b.hidden = true; }); });
  function install() {
    var info = installSteps();
    var d = dialog('<h3></h3><p>Put Tap Am on your home screen: it opens fast, full screen, and keeps you logged in.</p><ol class="isteps"></ol><div class="actions">' + (deferred ? '<button type="button" class="btn btn--green" data-yes>Install now</button>' : '') + '<button type="button" class="btn btn--soft" data-no>Close</button></div>', function (e, close) {
      if (!e) return;
      if (e.target.closest('[data-yes]') && deferred) { close(); deferred.prompt(); deferred.userChoice.finally(function () { deferred = null; }); }
      else if (e.target.closest('[data-no]')) close();
    });
    d.querySelector('h3').textContent = info.title;
    info.steps.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; d.querySelector('.isteps').appendChild(li); });
  }

  /* ── service worker ──────────────────────────────────────────────── */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {}); });
  }

  /* ── toast (with a "where to go" button) ─────────────────────────── */
  var toastEl = null, toastTimer = 0;
  TA.toast = function (text, kind, link, linkLabel) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div'); toastEl.className = 'toast' + (kind === 'err' ? ' err' : ''); toastEl.setAttribute('role', kind === 'err' ? 'alert' : 'status');
    var ico = document.createElement('span'); ico.className = 'ico'; if (kind === 'err') ico.textContent = '!'; else ico.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    var m = document.createElement('span'); m.className = 'msg'; m.textContent = text;
    toastEl.appendChild(ico); toastEl.appendChild(m);
    if (link && /^\/(?!\/)/.test(link)) { var a = document.createElement('a'); a.className = 'go'; a.href = link; a.textContent = linkLabel || 'Go'; toastEl.appendChild(a); }
    document.body.appendChild(toastEl); clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (toastEl) { toastEl.remove(); toastEl = null; } }, link ? 6500 : 4200);
  };
  TA.fail = function (j) { TA.toast(j.error || 'Something no work. Try again.', 'err', j.redirect, j.go || (j.code === 'FUNDS' ? 'Fund wallet' : j.code === 'UPGRADE' ? 'See plans' : null)); };

  /* ── dialogs ─────────────────────────────────────────────────────── */
  function dialog(html, onClick) {
    var d = document.createElement('div'); d.className = 'dlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = '<div class="dlg-in">' + html + '</div>';
    function close() { d.remove(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') { close(); onClick && onClick(null, close); } }
    d.addEventListener('click', function (e) { if (e.target === d) { close(); onClick && onClick(null, close); return; } onClick && onClick(e, close); });
    document.addEventListener('keydown', key);
    document.body.appendChild(d);
    var f = d.querySelector('[data-yes],a,button'); if (f) f.focus();
    return d;
  }
  TA.dialog = dialog;

  /* ── YouTube ads: play by themselves with no YouTube controls; the player can only mute or unmute ── */
  TA.ytAd = function (id, title) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return null;
    var YT = 'https://www.youtube-nocookie.com';
    var box = document.createElement('div'); box.className = 'yt';
    var f = document.createElement('iframe');
    f.src = YT + '/embed/' + id + '?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=' + id + '&enablejsapi=1&origin=' + encodeURIComponent(location.origin);
    f.title = title || 'Sponsored video'; f.allow = 'autoplay; encrypted-media'; f.tabIndex = -1;
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    var cover = document.createElement('div'); cover.className = 'yt-cover'; cover.setAttribute('aria-hidden', 'true');
    var b = document.createElement('button'); b.type = 'button'; b.className = 'yt-mute'; var muted = true;
    function cmd(func) { try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), YT); } catch (e) {} }
    function label() { b.textContent = muted ? '🔇 Tap for sound' : '🔊 Sound on'; b.setAttribute('aria-pressed', muted ? 'false' : 'true'); b.setAttribute('aria-label', muted ? 'Turn sound on' : 'Mute'); }
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); muted = !muted; cmd(muted ? 'mute' : 'unMute'); if (!muted) cmd('playVideo'); label(); });
    // Muted autoplay works on phones; this nudge covers browsers that wait for the player to load.
    f.addEventListener('load', function () { cmd('playVideo'); setTimeout(function () { cmd('playVideo'); }, 800); });
    label(); box.appendChild(f); box.appendChild(cover); box.appendChild(b);
    return box;
  };
  TA.confirm = function (text, okLabel) {
    return new Promise(function (resolve) {
      var dd = dialog('<h3>Sure?</h3><p></p><div class="actions"><button type="button" class="btn btn--soft" data-no>Cancel</button><button type="button" class="btn btn--green" data-yes></button></div>', function (e, close) {
        if (!e) return resolve(false);
        if (e.target.closest('[data-no]')) { close(); resolve(false); }
        if (e.target.closest('[data-yes]')) { close(); resolve(true); }
      });
      dd.querySelector('p').textContent = text; dd.querySelector('[data-yes]').textContent = okLabel || 'Yes, do it';
    });
  };
  var TIERNAME = { MAPO: 'Mapo or Nepo', NEPO: 'Nepo' };
  TA.upgrade = function (need, feature) {
    var rank = need === 'RANK';
    var d = dialog('<div class="dlg-art">' + (rank ? STICK.lock : STICK.star) + '</div><h3></h3><p></p><div class="actions"><button type="button" class="btn btn--soft" data-no>Not now</button>' + (rank ? '<a class="btn btn--green" href="/ranks">See ranks</a>' : '<a class="btn btn--green" href="/plans">See plans</a>') + '</div>', function (e, close) { if (e && (e.target.closest('[data-no]') || e.target.closest('a'))) close(); });
    d.querySelector('h3').textContent = rank ? 'Keep tapping to unlock' : 'Upgrade to ' + (TIERNAME[need] || 'Mapo');
    d.querySelector('p').textContent = (feature ? feature + ' ' : 'This ') + (rank ? 'unlocks as you rank up. Play more games to climb.' : 'is for ' + (TIERNAME[need] || 'Mapo or Nepo') + ' babies. Upgrade to open it.');
  };
  var STICK = {
    star: '<svg viewBox="0 0 40 40" width="96" height="96"><path d="M20 2l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" fill="#FFD23F" stroke="#150B33" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    lock: '<svg viewBox="0 0 40 40" width="96" height="96"><rect x="8" y="17" width="24" height="19" rx="5" fill="#FFD23F" stroke="#150B33" stroke-width="2.2"/><path d="M13 17v-4a7 7 0 0114 0v4" fill="none" stroke="#150B33" stroke-width="3"/><circle cx="20" cy="26" r="3" fill="#150B33"/></svg>'
  };

  /* ── JSON API helper ─────────────────────────────────────────────── */
  TA.api = function (url, body, method) {
    return fetch(url, { method: method || 'POST', credentials: 'same-origin', headers: body !== undefined ? { 'content-type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._ok = r.ok; j._status = r.status; return j; }); })
      .catch(function () { TA.netFailed(); return { _ok: false, error: TA.isOnline() ? 'Network wahala. Try again.' : 'Your internet don cut. Check your connection.' }; });
  };
  function after(j, el) {
    var ok = el.getAttribute('data-ok') || '';
    if (j.redirect && j._ok) { if (j.message) flash(j.message); TA.go(j.redirect); return; }
    if (ok === 'reload' || j.reload) { if (j.message) flash(j.message); TA.go(location.pathname + location.search, { replace: true, fresh: true }); return; }
    if (ok.indexOf('redirect:') === 0) { TA.go(ok.slice(9)); return; }
    if (j.message) TA.toast(j.message);
  }
  function flash(m) { try { sessionStorage.setItem('ta-flash', m); } catch (e) {} }
  function showFlash() { try { var f = sessionStorage.getItem('ta-flash'); if (f) { sessionStorage.removeItem('ta-flash'); setTimeout(function () { TA.toast(f); }, 60); } } catch (e) {} }

  /* ── generic forms: <form data-api="/api/..."> ───────────────────── */
  function collect(f) {
    var out = {};
    $$('input[name],select[name],textarea[name]', f).forEach(function (i) {
      if (i.disabled) return;
      if (i.type === 'radio') { if (i.checked) out[i.name] = i.value; return; }
      if (i.type === 'checkbox') { out[i.name] = i.checked; return; }
      if (i.type === 'file') return;
      if (i.type === 'datetime-local') { out[i.name] = i.value ? new Date(i.value).toISOString() : ''; return; }
      out[i.name] = i.hasAttribute('data-num') ? i.value.replace(/[,\s]/g, '') : i.value;
    });
    return out;
  }
  function clearErrs(f) { $$('[data-err]', f).forEach(function (e) { e.textContent = ''; }); $$('.is-invalid', f).forEach(function (e) { e.classList.remove('is-invalid'); }); var m = f.querySelector('.ta-msg'); if (m) { m.className = 'ta-msg'; m.textContent = ''; } }
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.matches || !f.matches('form[data-api]')) return;
    e.preventDefault(); clearErrs(f);
    if (f._busy) return;
    var btn = f.querySelector('button[type=submit]');
    f._busy = true; if (btn) btn.classList.add('is-loading');
    var send = function (extra) {
      var body = collect(f); if (extra) for (var k in extra) body[k] = extra[k];
      TA.api(f.getAttribute('data-api'), body).then(function (j) {
        f._busy = false; if (btn) btn.classList.remove('is-loading');
        if (j._ok) { after(j, f); if (f.hasAttribute('data-reset')) f.reset(); if (f._onok) f._onok(j); return; }
        if (j.code === 'ADULT') { askAdult(function () { f._busy = true; if (btn) btn.classList.add('is-loading'); send({ adult: true }); }); return; }
        var vis = function (sel) { return $$(sel, f).filter(function (e) { return !e.closest('[hidden]'); })[0]; };
        var errEl = j.field && vis('[data-err="' + j.field + '"]');
        if (errEl) { errEl.textContent = j.error; var inp = vis('[name="' + j.field + '"]'); if (inp) { inp.classList.add('is-invalid'); try { inp.focus({ preventScroll: false }); } catch (x) {} } }
        else { var m = f.querySelector('.ta-msg'); if (m) { m.className = 'ta-msg err'; m.textContent = j.error || 'Something no work. Try again.'; } }
        if (j.redirect) TA.fail(j);
      });
    };
    send();
  });
  // One-time "I'm 18+" confirmation the first time money is used.
  function askAdult(yes) {
    var d = dialog('<h3>Quick check</h3><p>Paid pools, wallet funding and withdrawals are for people aged <b>18 or older</b>. Confirm to continue.</p><label class="ta-check" style="margin:6px 0 12px"><input type="checkbox" data-adult><span>I confirm I am 18 or older.</span></label><div class="actions"><button type="button" class="btn btn--soft" data-no>Cancel</button><button type="button" class="btn btn--green" data-yes disabled>Continue</button></div>', function (e, close) {
      if (!e) return;
      if (e.target.closest('[data-no]')) close();
      if (e.target.closest('[data-yes]') && d.querySelector('[data-adult]').checked) { close(); yes(); }
    });
    d.querySelector('[data-adult]').addEventListener('change', function () { d.querySelector('[data-yes]').disabled = !this.checked; });
  }
  TA.askAdult = askAdult;

  /* ── post buttons: <button data-post="/api/..." data-body='{}' data-confirm="..."> ── */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null; if (!t) return;
    var b;
    if ((b = t.closest('[data-menu-open]'))) return openMenu();
    if ((b = t.closest('[data-menu-close]'))) return closeMenu();
    if ((b = t.closest('[data-logout]'))) return logout(b);
    if ((b = t.closest('[data-install]'))) return install();
    if ((b = t.closest('[data-upgrade]'))) { e.preventDefault(); return TA.upgrade(b.getAttribute('data-upgrade'), b.getAttribute('data-feature')); }
    if ((b = t.closest('[data-copy]'))) { e.preventDefault(); return copy(b); }
    if ((b = t.closest('[data-tip]'))) { e.preventDefault(); return tip(b); }
    if ((b = t.closest('[data-share-url]'))) { e.preventDefault(); return share(b); }
    if ((b = t.closest('[data-share-card]'))) { e.preventDefault(); return shareCard(b); }
    if ((b = t.closest('[data-post]'))) {
      e.preventDefault();
      var run = function (extra) {
        var body = {}; try { body = JSON.parse(b.getAttribute('data-body') || '{}'); } catch (x) {}
        if (extra) for (var k in extra) body[k] = extra[k];
        b.classList.add('is-loading');
        TA.api(b.getAttribute('data-post'), body).then(function (j) {
          b.classList.remove('is-loading');
          if (j._ok) after(j, b);
          else if (j.code === 'ADULT') askAdult(function () { run({ adult: true }); });
          else TA.fail(j);
        });
      };
      var c = b.getAttribute('data-confirm'); if (c) TA.confirm(c).then(function (y) { if (y) run(); }); else run();
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); closeTip(); } });

  /* ── copy, share, tooltips ───────────────────────────────────────── */
  function copy(b) {
    var v = b.getAttribute('data-copy'), lbl = b.querySelector('span') || b, old = lbl.textContent;
    var done = function () { b.classList.add('done'); lbl.textContent = 'Copied'; clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('done'); lbl.textContent = old; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, function () { fallbackCopy(v); done(); });
    else { fallbackCopy(v); done(); }
  }
  function fallbackCopy(v) { var t = document.createElement('textarea'); t.value = v; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove(); }
  function share(b) {
    var url = b.getAttribute('data-share-url'), text = b.getAttribute('data-share-text') || 'Come tap with me for Tap Am!';
    if (navigator.share) navigator.share({ title: 'Tap Am', text: text, url: url }).catch(function () {});
    else { fallbackCopy(url); TA.toast('Link copied. Paste am anywhere.'); }
  }
  // QR code + share card live in a separate file, loaded only when needed.
  function shareCard(b) {
    b.classList.add('is-loading');
    loadScript('/assets/share.js?v=7').then(function () { b.classList.remove('is-loading'); window.TAShare.open(JSON.parse(b.getAttribute('data-share-card') || '{}')); })
      .catch(function () { b.classList.remove('is-loading'); TA.toast('Could not load the share card. Check your connection.', 'err'); });
  }
  function loadScript(src) {
    return new Promise(function (res, rej) { if (document.querySelector('script[src="' + src + '"]')) return res(); var s = document.createElement('script'); s.src = src; s.nonce = NONCE; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  TA.loadScript = loadScript;
  var tipEl = null;
  function closeTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }
  function tip(b) {
    if (tipEl && tipEl.parentNode === b) return closeTip();
    closeTip(); tipEl = document.createElement('span'); tipEl.className = 'tip-pop'; tipEl.setAttribute('role', 'tooltip'); tipEl.textContent = b.getAttribute('data-tip'); b.appendChild(tipEl);
    var r = tipEl.getBoundingClientRect(); if (r.left < 8) tipEl.style.transform = 'translateX(calc(-50% + ' + (8 - r.left) + 'px))'; else if (r.right > innerWidth - 8) tipEl.style.transform = 'translateX(calc(-50% - ' + (r.right - innerWidth + 8) + 'px))';
  }
  document.addEventListener('pointerdown', function (e) { if (tipEl && !e.target.closest('[data-tip]')) closeTip(); });

  /* ── comma number inputs: <input data-num> ───────────────────────── */
  document.addEventListener('input', function (e) {
    var i = e.target; if (!i.matches || !i.matches('input[data-num]')) return;
    var pos = i.selectionStart, before = i.value.slice(0, pos).replace(/[^0-9.]/g, '').length;
    var raw = i.value.replace(/[^0-9.]/g, ''), parts = raw.split('.');
    var whole = parts[0].replace(/^0+(?=\d)/, ''), dec = parts.length > 1 ? '.' + parts.slice(1).join('').slice(0, 2) : '';
    var out = (whole ? Number(whole).toLocaleString('en-NG') : '') + dec;
    if (out === i.value) return;
    i.value = out;
    var n = 0, p = 0; while (p < out.length && n < before) { if (/[0-9.]/.test(out[p])) n++; p++; }
    try { i.setSelectionRange(p, p); } catch (x) {}
  });

  /* ── fields that only show for some choices: <div data-show="kind=PAID|SPONSORED"> ── */
  function valueOf(f, name) {
    var r = f.querySelector('input[type=radio][name="' + name + '"]:checked'); if (r) return r.value;
    var el = f.querySelector('[name="' + name + '"]:not([type=radio])'); return el ? (el.type === 'checkbox' ? String(el.checked) : el.value) : '';
  }
  function syncShow(f) {
    $$('[data-show]', f).forEach(function (blk) {
      var spec = blk.getAttribute('data-show').split('='), on = spec[1].split('|').indexOf(valueOf(f, spec[0])) > -1;
      blk.hidden = !on;
      $$('input,select,textarea', blk).forEach(function (i) { i.disabled = !on; });
    });
  }
  document.addEventListener('change', function (e) { var f = e.target.form || (e.target.closest && e.target.closest('form')); if (f) syncShow(f); });

  /* ── image uploads: <input type=file data-upload="fieldName"> ────── */
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

  /* ── live countdowns ─────────────────────────────────────────────── */
  var cdTimer = 0;
  function tickCountdowns() {
    var now = Date.now(), any = false;
    $$('[data-when]').forEach(function (el) {
      any = true;
      var t = Date.parse(el.getAttribute('data-when')); if (!t) return;
      var left = t - now, label = el.getAttribute('data-label') || 'Ends in';
      el.textContent = left > 0 ? label + ' ' + TA.fmtFull(left) : (label === 'Starts in' ? 'Starting now…' : 'Ending now…');
      if (left <= 0 && el.hasAttribute('data-reload-at-zero') && !el._done) { el._done = true; setTimeout(function () { TA.go(location.pathname + location.search, { replace: true, fresh: true }); }, 1500); }
    });
    $$('[data-countdown]').forEach(function (el) {
      any = true;
      var t = Date.parse(el.getAttribute('data-countdown')); if (!t) return;
      TA.seg(el, TA.fmtLeft(t - now));
    });
    if (!any) { clearInterval(cdTimer); cdTimer = 0; }
  }
  function startCountdowns() { if (!cdTimer && document.querySelector('[data-when],[data-countdown]')) { tickCountdowns(); cdTimer = setInterval(tickCountdowns, 1000); } }

  /* ── slideshow: <div data-slides> with .slide children ───────────── */
  function initSlides(root) {
    $$('[data-slides]', root).forEach(function (s) {
      if (s._init) return; s._init = true;
      var track = s.querySelector('.slides-track'), slides = $$('.slide', s), dots = $$('.slides-dots button', s), i = 0, timer = 0;
      if (slides.length < 2 || !track) return;
      function go(n) { i = (n + slides.length) % slides.length; track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: 'smooth' }); }
      function paint() { var w = track.clientWidth || 1; i = Math.round(track.scrollLeft / w); dots.forEach(function (d, k) { d.setAttribute('aria-current', String(k === i)); }); }
      track.addEventListener('scroll', function () { clearTimeout(track._p); track._p = setTimeout(paint, 60); }, { passive: true });
      dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); restart(); }); });
      function restart() { clearInterval(timer); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(function () { if (!document.hidden && s.isConnected) go(i + 1); else if (!s.isConnected) clearInterval(timer); }, 5000); }
      track.addEventListener('pointerdown', function () { clearInterval(timer); }); track.addEventListener('pointerup', restart);
      restart();
    });
  }

  /* ── big celebration (rank ups, wins) ────────────────────────────── */
  TA.celebrate = function (title, sub) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var d = document.createElement('div'); d.className = 'cele'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', title);
    d.innerHTML = '<div class="cele-rays"></div><div class="cele-in"><div class="cele-k"></div><div class="cele-t"></div><button type="button" class="btn btn--green btn--shine">Oya, continue</button></div>';
    d.querySelector('.cele-k').textContent = title; d.querySelector('.cele-t').textContent = sub || '';
    document.body.appendChild(d);
    if (navigator.vibrate) { try { navigator.vibrate([60, 40, 60, 40, 120]); } catch (e) {} }
    if (!reduce && d.animate) {
      var C = ['#ffffff', '#00FF6E', '#FFD23F', '#FF4FA3', '#2E8BFF', '#FF8A2A'], w = innerWidth, h = innerHeight;
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

  /* ── instant page switching ──────────────────────────────────────── */
  // Pages inside the app shell are fetched in the background (on touch/hover) and swapped in
  // without a full reload. Anything unusual falls back to a normal page load.
  var cache = {}, TTL = 15000, navSeq = 0;
  function eligible(a) {
    if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-no-swap')) return false;
    if (!document.body.classList.contains('app-body')) return false;
    var u; try { u = new URL(a.href, location.href); } catch (e) { return false; }
    if (u.origin !== location.origin) return false;
    if (/^\/(api|go|media|play|pay|login|signup)(\/|$)/.test(u.pathname) || /\/(login|setup)$/.test(u.pathname) || u.pathname === '/') return false;
    if (u.pathname === location.pathname && u.search === location.search && u.hash) return false;
    return u;
  }
  function getPage(url, fresh) {
    var c = cache[url];
    if (!fresh && c && Date.now() - c.at < TTL) return c.p;
    var p = fetch(url, { credentials: 'same-origin', headers: { 'x-tapam-swap': '1' } }).then(function (r) {
      return r.text().then(function (t) { return { ok: r.ok || r.status === 404, url: r.url, status: r.status, html: t }; });
    });
    cache[url] = { at: Date.now(), p: p };
    p.catch(function () { delete cache[url]; });
    return p;
  }
  function prefetch(e) { var a = e.target.closest && e.target.closest('a'); var u = eligible(a); if (u && TA.isOnline()) getPage(u.pathname + u.search); }
  document.addEventListener('pointerdown', prefetch, { passive: true });
  document.addEventListener('mouseover', function (e) { var a = e.target.closest && e.target.closest('a'); if (!a || a._pf) return; a._pf = setTimeout(function () { prefetch(e); }, 70); a.addEventListener('mouseleave', function () { clearTimeout(a._pf); a._pf = 0; }, { once: true }); }, { passive: true });
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a'); var u = eligible(a); if (!u) return;
    e.preventDefault(); closeMenu(); TA.go(u.pathname + u.search + u.hash);
  });
  function progress(on) {
    var p = document.querySelector('.navbar-progress');
    if (!p) { p = document.createElement('div'); p.className = 'navbar-progress'; document.body.appendChild(p); }
    if (on) { p.style.opacity = '1'; p.style.width = '0'; void p.offsetWidth; p.style.width = '70%'; }
    else { p.style.width = '100%'; setTimeout(function () { p.style.opacity = '0'; p.style.width = '0'; }, 250); }
  }
  TA.go = function (url, opts) {
    opts = opts || {};
    if (!document.body.classList.contains('app-body') || !window.DOMParser || !history.pushState) { location.href = url; return; }
    var seq = ++navSeq;
    document.documentElement.classList.add('is-nav'); progress(true);
    getPage(url, opts.fresh).then(function (res) {
      if (seq !== navSeq) return;
      var finalPath = new URL(res.url || url, location.href);
      if (finalPath.pathname !== new URL(url, location.href).pathname || !res.ok) { location.href = res.url || url; return; }
      var doc = new DOMParser().parseFromString(res.html, 'text/html');
      var app = doc.querySelector('.app'), cur = document.querySelector('.app');
      // Different kind of page (game screen, extra scripts…): load it normally.
      var extra = $$('script[src]', doc).some(function (s) { return !document.querySelector('script[src="' + s.getAttribute('src') + '"]'); });
      if (!app || !cur || !doc.body.classList.contains('app-body') || extra) { location.href = url; return; }
      var styleNew = doc.querySelector('style'), styleCur = document.querySelector('head style');
      if (styleNew && styleCur && styleNew.textContent !== styleCur.textContent) styleCur.textContent = styleNew.textContent;
      document.documentElement.setAttribute('style', doc.documentElement.getAttribute('style') || '');
      var tc = doc.querySelector('meta[name=theme-color]'), tcc = document.querySelector('meta[name=theme-color]'); if (tc && tcc) tcc.content = tc.content;
      document.title = doc.title;
      cur.replaceWith(document.adoptNode(app));
      var menuNew = doc.getElementById('menu'), menuCur = document.getElementById('menu'); if (menuNew && menuCur) menuCur.replaceWith(document.adoptNode(menuNew));
      if (opts.replace) history.replaceState({ ta: 1 }, '', url); else if (!opts.pop) history.pushState({ ta: 1 }, '', url);
      if (!opts.pop) window.scrollTo(0, 0);
      $$('script[data-page]', doc).forEach(function (old) { var s = document.createElement('script'); s.nonce = NONCE; s.setAttribute('data-page', ''); s.textContent = old.textContent; document.body.appendChild(s); s.remove(); });
      delete cache[url];
      ready(true);
      var m = document.getElementById('main'); if (m && !opts.pop) { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); }
    }).catch(function () {
      if (seq !== navSeq) return;
      TA.netFailed();
      TA.toast(TA.isOnline() ? 'That page no load. Try again.' : 'Your internet don cut. Check your connection.', 'err');
    }).then(function () { if (seq === navSeq) { document.documentElement.classList.remove('is-nav'); progress(false); } });
  };
  window.addEventListener('popstate', function () { depth(-1); if (document.body.classList.contains('app-body')) TA.go(location.pathname + location.search, { pop: true }); });

  /* ── back button ─────────────────────────────────────────────────── */
  // [data-back] goes to the previous page when it was a page of this site in this tab,
  // otherwise to the link's own href (the role's home page).
  function depth(delta) {
    var d = 0; try { d = Number(sessionStorage.getItem('ta-depth') || 0); } catch (e) {}
    if (delta) { d = Math.max(0, d + delta); try { sessionStorage.setItem('ta-depth', String(d)); } catch (e) {} }
    return d;
  }
  (function () {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0], type = nav ? nav.type : 'navigate';
    var sameSite = false; try { sameSite = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
    if (type === 'navigate') { if (sameSite) depth(1); else try { sessionStorage.setItem('ta-depth', '0'); } catch (e) {} }
    else if (type === 'back_forward') depth(-1);
  })();
  var pushState = history.pushState;
  history.pushState = function () { depth(1); return pushState.apply(history, arguments); };
  function goBack(fallback) { if (depth() > 0 && history.length > 1) history.back(); else TA.go(fallback || '/'); }
  TA.back = goBack;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('a[data-back],button[data-back]'); if (!b || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); e.stopImmediatePropagation(); goBack(b.getAttribute('href') || b.getAttribute('data-back') || '/');
  }, true);

  /* ── "just won" toasts (landing + sign-up): real recent winners, one at a time ── */
  function winners() {
    if (!document.querySelector('[data-winners]') || winners.on) return; winners.on = true;
    fetch('/api/winners', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var list = (j && j.winners) || []; if (!list.length) return;
      var i = 0, el = document.createElement('div'); el.className = 'wtoast'; el.setAttribute('role', 'status'); el.hidden = true; document.body.appendChild(el);
      function show() {
        if (document.hidden) return;
        var w = list[i++ % list.length];
        el.innerHTML = '<span class="wt-ic" aria-hidden="true">\u20A6</span><span><b></b> just won <b class="wt-amt"></b><small></small></span>';
        el.querySelector('b').textContent = w.who; el.querySelector('.wt-amt').textContent = TA.naira(w.amount); el.querySelector('small').textContent = 'in ' + w.pool;
        el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
        setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.hidden = true; }, 400); }, 4500);
      }
      setTimeout(show, 3000); setInterval(show, 11000);
    }).catch(function () {});
  }

  /* ── GET forms that reload on change (year / month pickers) ── */
  document.addEventListener('change', function (e) {
    var f = e.target.form; if (!f || !f.hasAttribute('data-autosubmit')) return;
    var q = new URLSearchParams(new FormData(f)).toString();
    TA.go((f.getAttribute('action') || location.pathname) + (q ? '?' + q : ''));
  });

  /* ── name emoji: only the owner sees a button; it shows what the emoji means ── */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-emoji-meaning]'); if (!b) return;
    e.preventDefault();
    var d = dialog('<div class="dlg-art" style="font-size:64px;line-height:96px"></div><h3>Your emoji</h3><p></p><div class="actions"><button type="button" class="btn btn--green" data-yes>Correct</button></div>', function (ev, close) { if (ev && ev.target.closest('[data-yes]')) close(); });
    d.querySelector('.dlg-art').textContent = b.getAttribute('data-emoji') || '';
    d.querySelector('p').textContent = b.getAttribute('data-emoji-meaning') || '';
  });
  if (history.state === null && history.replaceState) { try { history.replaceState({ ta: 1 }, ''); } catch (e) {} }

  /* ── start ───────────────────────────────────────────────────────── */
  function ready(swapped) {
    rankCheck(); winners();
    $$('[data-seg]').forEach(function (el) { TA.seg(el, el.getAttribute('data-seg')); });
    startCountdowns();
    initSlides(document);
    $$('form').forEach(syncShow);
    showInstallButtons();
    // keep the selected tab in view (Pools: Results, Top tappers, admin tabs…)
    $$('.tabs [aria-current="page"], .doc-tabs [aria-current="page"], .fbar [aria-pressed="true"]').forEach(function (a) { var p = a.parentNode; if (p.scrollWidth > p.clientWidth) p.scrollLeft = a.offsetLeft - p.offsetLeft - (p.clientWidth - a.offsetWidth) / 2; });
    if (!swapped && !TA.isOnline()) showNet(false);
    showFlash();
  }
  function boot() {
    ready(false);
    var q = window.TAQ || [];
    window.TAQ = { push: function (f) { try { f(); } catch (e) { console.error(e); } } };
    for (var i = 0; i < q.length; i++) window.TAQ.push(q[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
