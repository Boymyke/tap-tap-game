/* Tap Am game client: taps (batched to the server), finger limits by tier, multi-pool, boosters
   (queued, with live tips), live board strip, combos and milestones, tap sounds, vibration,
   connection state on the card, ads around the game (close after 5, 10 or 30s) and the end screen.
   The server is the source of truth: it caps tap speed per tier and keeps the official score. */
(function () {
  'use strict';
  function boot() {
    var TA = window.TA, $ = function (id) { return document.getElementById(id); };
    var D = JSON.parse($('game-data').textContent), ME = D.me;
    var skew = Date.parse(D.serverNow) - Date.now();
    var now = function () { return Date.now() + skew; };
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
    var fmtN = function (n) { return TA.short(n); };

    var pools = D.pools.map(function (p) { return { id: p.id, name: p.name, starts: Date.parse(p.startsAt), ends: Date.parse(p.endsAt), boosters: p.boosters, sideA: p.sideA, sideB: p.sideB, side: p.side, prize: p.prize, sponsor: p.sponsor, kind: p.kind, score: 0, rank: 0, total: 0, mult: 1, multUntil: 0, queued: 0, used: {}, ended: p.state === 'ended' || p.state === 'cancelled', seenTop: 999, top: [], near: [] }; });
    var byId = {}; pools.forEach(function (p) { byId[p.id] = p; });
    var focus = pools[0];
    var boosters = D.boosters || [];

    var pad = $('pad'), fx = $('fx'), msg = $('msg'), scoreEl = $('score'), timeEl = $('time'), timeLbl = $('time-lbl'), posEl = $('pos'), comboEl = $('combo'), endEl = $('end'), netEl = $('net'), netT = $('net-t');

    /* ── sound + vibration ── */
    var S = window.TASound || { play: function () {}, fanfare: function () {}, thud: function () {}, combo: function () {} };
    var snd = $('snd'), savedMute = store.get('ta-muted');
    S.muted = savedMute === null ? !!ME.muted : savedMute === '1';
    function paintSnd() { snd.setAttribute('data-muted', S.muted ? '1' : '0'); snd.setAttribute('aria-label', S.muted ? 'Sound off. Tap to turn on' : 'Sound on. Tap to mute'); }
    paintSnd(); snd.addEventListener('click', function () { S.muted = !S.muted; store.set('ta-muted', S.muted ? '1' : '0'); paintSnd(); if (!S.muted) S.play(ME.sound, 4, true); });
    function buzz(p) { if (ME.vibrate && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

    /* ── effects ── */
    var COLORS = ['#ffffff', '#00FF6E', '#FFD23F', '#FF4FA3', '#2E8BFF', '#FF8A2A'];
    function make(cls, n) { var a = []; for (var i = 0; i < n; i++) { var e = document.createElement('span'); e.className = cls; fx.appendChild(e); a.push(e); } return a; }
    var pluses = make('fx-plus', 40), rings = make('fx-ring', 8), bits = make('fx-bit', 40), ban = make('fx-banner', 1)[0];
    var pi = 0, ri = 0, bi = 0;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function shootPlus(x, y, label, big) {
      var el = pluses[pi++ % pluses.length], r = pad.getBoundingClientRect(), reach = Math.min(r.width, r.height);
      var ang = rnd(0, Math.PI * 2), dist = rnd(0.22, 0.5) * reach, dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - reach * 0.08;
      var s = rnd(1, 1.9) + Math.min(combo, 40) / 40 + (big ? 0.6 : 0), rot = rnd(-35, 35), dur = rnd(700, 1050);
      el.textContent = label; el.style.color = big ? '#FFD23F' : COLORS[(Math.random() * COLORS.length) | 0]; el.style.fontSize = (rnd(40, 62) | 0) + 'px';
      el.animate([{ transform: 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(.4)' }, { transform: 'translate(' + (x + dx * 0.7) + 'px,' + (y + dy * 0.7) + 'px) translate(-50%,-50%) scale(' + s + ') rotate(' + rot * 0.6 + 'deg)', offset: 0.35 }, { transform: 'translate(' + (x + dx) + 'px,' + (y + dy) + 'px) translate(-50%,-50%) scale(' + s * 0.85 + ') rotate(' + rot + 'deg)' }], { duration: dur, easing: 'cubic-bezier(.15,.85,.25,1)' });
      el.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: dur, easing: 'linear' });
    }
    function ring(x, y) { var el = rings[ri++ % rings.length]; el.animate([{ transform: 'translate(' + x + 'px,' + y + 'px) scale(.3)', opacity: 0.9 }, { transform: 'translate(' + x + 'px,' + y + 'px) scale(2.3)', opacity: 0 }], { duration: 420, easing: 'ease-out' }); }
    function confetti(x, y, n) { for (var i = 0; i < n; i++) { var el = bits[bi++ % bits.length], a = rnd(0, Math.PI * 2), d = rnd(80, 260); el.style.background = COLORS[(Math.random() * COLORS.length) | 0]; el.animate([{ transform: 'translate(' + x + 'px,' + y + 'px) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + (x + Math.cos(a) * d) + 'px,' + (y + Math.sin(a) * d + 130) + 'px) rotate(' + rnd(-540, 540) + 'deg)', opacity: 0 }], { duration: rnd(800, 1400), easing: 'cubic-bezier(.2,.7,.3,1)' }); } }
    function banner(text, gold) { ban.textContent = text; ban.className = 'fx-banner' + (gold ? ' gold' : ''); ban.animate([{ transform: 'translate(-50%,-50%) scale(.3) rotate(-12deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15) rotate(-4deg)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-4deg)', opacity: 1, offset: 0.75 }, { transform: 'translate(-50%,-70%) scale(.9) rotate(-4deg)', opacity: 0 }], { duration: gold ? 1400 : 900, easing: 'linear' }); }
    function kick(cls) { pad.classList.remove(cls); void pad.offsetWidth; pad.classList.add(cls); }
    function centre() { var r = pad.getBoundingClientRect(); return [r.width / 2, r.height / 2.4]; }
    function party(text) { var c = centre(); banner(text, true); kick('flash'); kick('shake'); buzz([40, 50, 40, 50, 80]); S.fanfare(); if (!reduce) { confetti(c[0], c[1], 40); for (var i = 0; i < 6; i++) shootPlus(c[0], c[1], ['+1', 'OYA!', 'TAP!', '+1'][i % 4], true); } }

    /* ── state helpers ── */
    function stateOf(p) { var t = now(); return p.ended ? 'ended' : t < p.starts ? 'soon' : t < p.ends ? 'live' : 'ended'; }
    function livePools() { return pools.filter(function (p) { return stateOf(p) === 'live'; }); }
    function multOf(p) { return p.multUntil > now() ? p.mult : 1; }

    /* ── connection state on the card ── */
    var netDown = false, netTimer = 0;
    function setNet(down, text) {
      clearTimeout(netTimer);
      if (down) { netDown = true; netEl.hidden = false; netEl.classList.remove('ok'); netEl.querySelector('.ring').hidden = false; netT.textContent = text || 'Connection lost — taps paused'; pad.classList.add('offline'); return; }
      if (!netDown) return;
      netDown = false; pad.classList.remove('offline'); netEl.classList.add('ok'); netEl.querySelector('.ring').hidden = true; netT.textContent = 'Back online. Keep tapping!';
      netTimer = setTimeout(function () { netEl.hidden = true; }, 1600);
    }
    window.addEventListener('offline', function () { setNet(true); });
    window.addEventListener('online', function () { setNet(false); flush(); loadBoard(); });
    if (!TA.isOnline()) setNet(true);

    /* ── tapping ── */
    var pending = 0, inflight = 0, sending = false, combo = 0, lastTap = 0, recent = [];
    var MILESTONES = [50, 100, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 250000, 500000, 1000000];
    var nextMs = 0, fingerHint = false, active = {}, activeCount = 0;
    function displayScore() { return focus.score + Math.round((pending + inflight) * multOf(focus)); }
    function hit(x, y) {
      var st = stateOf(focus);
      if (st !== 'live') { kick('shake'); S.thud(); if (st === 'soon') msg.textContent = 'Hold on — the pool never start. Watch the countdown.'; return; }
      if (netDown || !TA.isOnline()) { kick('shake'); msg.textContent = 'Your internet don cut. Taps no fit count now.'; return; }
      var t = performance.now(); combo = (t - lastTap < 260) ? combo + 1 : 1; lastTap = t; pending++; recent.push(t);
      var m = multOf(focus);
      pad.animate([{ transform: 'scale(.985)' }, { transform: 'scale(1)' }], { duration: 110 });
      if (!reduce) { shootPlus(x, y, m > 1 ? '+' + m : '+1', m > 1); if (combo > 15 && Math.random() < 0.5) shootPlus(x, y, m > 1 ? '+' + m : '+1'); ring(x, y); }
      S.play(ME.sound, combo);
      if (m === 1) comboEl.textContent = 'Combo ' + combo;
      if (combo > 0 && combo % 10 === 0) { banner('COMBO x' + combo); kick('shake'); buzz(combo % 50 === 0 ? [40, 30, 40] : 30); S.combo(); if (!reduce) confetti(x, y, 12); }
      var sc = displayScore();
      while (nextMs < MILESTONES.length && sc >= MILESTONES[nextMs]) { party(fmtN(MILESTONES[nextMs]) + ' POINTS!'); nextMs++; }
      paintScore();
    }
    // Finger limit by tier: Lapo 1, Mapo 3, Nepo unlimited (the server also caps taps per second).
    pad.addEventListener('pointerdown', function (e) {
      if (endEl.contains(e.target)) return;
      e.preventDefault();
      if (ME.fingers > 0 && activeCount >= ME.fingers) {
        if (!fingerHint) { fingerHint = true; TA.toast(ME.fingers === 1 ? 'Lapo babies tap with one finger at a time. Mapo gets 3, Nepo unlimited.' : 'Mapo babies tap with 3 fingers. Nepo babies get unlimited.', 'err', '/plans', 'See plans'); }
        return;
      }
      active[e.pointerId] = 1; activeCount++;
      var r = pad.getBoundingClientRect(); hit(e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    function lift(e) { if (active[e.pointerId]) { delete active[e.pointerId]; activeCount = Math.max(0, activeCount - 1); } }
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { pad.addEventListener(ev, lift); });
    pad.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !endEl.contains(e.target)) { e.preventDefault(); if (e.repeat) return; var c = centre(); hit(c[0], c[1]); } });
    pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    ['gesturestart', 'gesturechange', 'dblclick'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false }); });
    document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });

    function flush() {
      if (sending || pending <= 0 || netDown) return;
      var ids = livePools().map(function (p) { return p.id; });
      if (!ids.length) { pending = 0; return; }
      var n = Math.min(pending, 200); pending -= n; inflight = n; sending = true;
      TA.api('/api/tap', { pools: ids, taps: n }).then(function (j) {
        sending = false; inflight = 0;
        if (!j._ok) {
          if (j._status === undefined) { pending = Math.min(pending + n, 60); setNet(true, TA.isOnline() ? 'Reconnecting…' : 'Connection lost — taps paused'); retry(); return; }
          if (j.error) TA.fail(j);
          return;
        }
        setNet(false);
        if (j.limit) msg.textContent = j.limit;
        var slow = false;
        Object.keys(j.results || {}).forEach(function (id) {
          var r = j.results[id], p = byId[id]; if (!p || !r) return;
          if (r.code === 'ENDED') { p.ended = true; return; }
          if (typeof r.score === 'number') { p.score = r.score; p.rank = r.rank; p.total = r.total; p.mult = r.mult || 1; p.multUntil = r.multUntil || 0; p.queued = r.queued || 0; p.above = r.above; }
          if (r.rejected > 0 && r.rejected >= r.accepted) slow = true;
          checkPosition(p);
        });
        if (slow) msg.textContent = 'Easy small — taps wey pass your tier speed no dey count.';
        paintChips(); paintScore(); paintStrip();
      });
    }
    var retryT = 0;
    function retry() { clearTimeout(retryT); retryT = setTimeout(function () { if (TA.isOnline()) TA.api('/api/pools/' + encodeURIComponent(focus.id) + '/board?n=3', undefined, 'GET').then(function (j) { if (j._ok) { setNet(false); flush(); } else retry(); }); else retry(); }, 2500); }
    setInterval(flush, 320);

    function checkPosition(p) {
      if (!p.rank || p !== focus) { p.seenTop = Math.min(p.seenTop, p.rank || 999); return; }
      var marks = [[1, 'YOU DEY #1!'], [3, 'TOP 3!'], [10, 'TOP 10!']];
      for (var i = 0; i < marks.length; i++) { var m = marks[i]; if (p.rank <= m[0] && p.seenTop > m[0] && p.total > m[0]) { p.seenTop = p.rank; party(m[1]); return; } }
      p.seenTop = Math.min(p.seenTop, p.rank);
    }

    /* ── painting ── */
    var shownScore = -1;
    function paintScore() { var s = displayScore(); if (s !== shownScore) { scoreEl.textContent = fmtN(s); shownScore = s; } posEl.textContent = focus.rank ? '#' + focus.rank + ' of ' + fmtN(focus.total) : '#— of ' + (focus.total ? fmtN(focus.total) : '—'); }
    function paintChips() {
      document.querySelectorAll('[data-pool]').forEach(function (b) { var p = byId[b.getAttribute('data-pool')], st = stateOf(p); b.classList.toggle('ended', st === 'ended'); b.querySelector('[data-chip-rank]').textContent = st === 'soon' ? 'Starts in ' + TA.fmtFull(p.starts - now()) : st === 'ended' ? 'Ended' + (p.rank ? ' · #' + p.rank : '') : (p.rank ? '#' + p.rank + ' · ' + fmtN(p.score) : 'Live'); });
    }
    // Live board: a scrollable list (5 rows in view) with the top players, then the ones around you.
    // It scrolls back to the top by itself, unless you scrolled it in the last few seconds.
    var lastStripRank = 0, listTouched = 0, stripList = $('lb-list');
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) { stripList.addEventListener(ev, function () { listTouched = Date.now(); }, { passive: true }); });
    function nameCell(el, r) {
      el.textContent = r.me ? 'You' : r.n;
      if (r.e) { var em = document.createElement('span'); em.className = 'nemoji'; em.setAttribute('aria-hidden', 'true'); em.textContent = r.e; el.appendChild(em); }
    }
    function stripRows(p) {
      var rows = (p.top || []).slice(), seen = {};
      rows.forEach(function (r) { seen[r.r] = 1; });
      var extra = (p.near || []).filter(function (r) { return !seen[r.r]; });
      if (p.rank && !seen[p.rank] && !extra.some(function (r) { return r.me; })) extra.push({ r: p.rank, n: 'You', s: displayScore(), me: true });
      extra.sort(function (a, b) { return a.r - b.r; });
      if (extra.length && rows.length && extra[0].r > rows[rows.length - 1].r + 1) rows.push({ gap: true });
      return rows.concat(extra);
    }
    function paintStrip() {
      var p = focus, list = stripList, meEl = $('lb-me');
      meEl.textContent = p.rank ? '#' + p.rank : '#—';
      var rows = stripRows(p);
      list.textContent = '';
      if (!rows.length) { var e = document.createElement('div'); e.className = 'lb-row'; e.innerHTML = '<span class="n" style="padding-left:6px">Nobody don tap yet. Be the first!</span>'; list.appendChild(e); }
      rows.forEach(function (r) {
        var d = document.createElement('div');
        if (r.gap) { d.className = 'lb-row gap'; d.textContent = '• • •'; list.appendChild(d); return; }
        d.className = 'lb-row' + (r.me ? ' me' : '') + (r.me && lastStripRank && p.rank < lastStripRank ? ' up' : '');
        d.innerHTML = '<span class="r"></span><span class="n"></span><span class="s"></span>';
        d.children[0].textContent = '#' + r.r; nameCell(d.children[1], r); d.children[2].textContent = fmtN(r.me ? displayScore() : r.s);
        list.appendChild(d);
      });
      if (Date.now() - listTouched > 6000 && list.scrollTop) list.scrollTop = 0;
      if (p.rank) lastStripRank = p.rank;
    }
    var lastState = null;
    function tick() {
      var st = stateOf(focus), t = now();
      if (st === 'soon') { timeLbl.textContent = 'Starts in'; timeEl.textContent = TA.fmtFull(focus.starts - t); }
      else if (st === 'live') { timeLbl.textContent = 'Ends in'; timeEl.textContent = TA.fmtFull(focus.ends - t); }
      else { timeLbl.textContent = 'Ended'; timeEl.textContent = '0s'; }
      if (st !== lastState) {
        pad.classList.toggle('locked', st !== 'live');
        if (st === 'soon') msg.textContent = 'Lobby — the pool go start soon. Warm your finger.';
        else if (st === 'live') { msg.textContent = pools.length > 1 ? 'Tap! Every tap counts in ' + livePools().length + ' pools.' : 'Tap anywhere on this card!'; if (lastState === 'soon') { banner('GO GO GO!', true); buzz([60, 40, 60]); S.fanfare(); } }
        else if (st === 'ended') onEnd(focus);
        lastState = st; paintChips();
      }
      var m = multOf(focus);
      pad.classList.toggle('boosted', m > 1);
      if (m > 1) { comboEl.textContent = m + '× · ' + TA.fmtFull(focus.multUntil - t) + (focus.queued ? ' · +' + focus.queued + ' queued' : ''); comboEl.classList.add('boost'); }
      else if (comboEl.classList.contains('boost')) { comboEl.classList.remove('boost'); comboEl.textContent = 'Combo ' + combo; }
      pools.forEach(function (p) { if (p !== focus && !p._endNoted && stateOf(p) === 'ended') { p._endNoted = true; TA.toast(p.name + ' don end.'); } });
      if (st === 'soon') paintChips();
      paintBoostBtn();
    }
    setInterval(tick, 250);

    function setFocus(p) {
      focus = p; lastState = null; shownScore = -1; nextMs = 0; lastStripRank = 0;
      var s = focus.score; while (nextMs < MILESTONES.length && s >= MILESTONES[nextMs]) nextMs++;
      document.querySelectorAll('[data-pool]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-pool') === p.id)); });
      $('g-name').textContent = p.name; endEl.hidden = true; paintMeta(); paintScore(); tick(); loadBoard(); paintStrip();
    }
    $('chips').addEventListener('click', function (e) { var b = e.target.closest('[data-pool]'); if (b) setFocus(byId[b.getAttribute('data-pool')]); });
    function paintMeta() { var p = focus; var t = (p.prize ? 'Prize pool ' + TA.naira(p.prize) : 'Prize: Akara') + (p.sponsor ? ' · by ' + p.sponsor : '') + (p.side ? ' · Team ' + p.side : ''); $('g-meta').textContent = t; }

    /* ── leaderboard ── */
    function renderBoard(list, el) {
      el.textContent = '';
      list.forEach(function (r) { var li = document.createElement('li'); if (r.me) li.className = 'me'; li.innerHTML = '<span class="r"></span><span class="n"></span><span class="s"></span>'; li.children[0].textContent = '#' + r.r; nameCell(li.children[1], r); if (r.side) li.children[1].appendChild(document.createTextNode(' · ' + r.side)); li.children[2].textContent = fmtN(r.s); el.appendChild(li); });
      if (!list.length) { var li = document.createElement('li'); li.innerHTML = '<span class="n" style="font-weight:600">Nobody don tap yet. Be the first!</span>'; el.appendChild(li); }
    }
    var boardBusy = false;
    function loadBoard() {
      if (boardBusy || document.hidden || netDown) return; boardBusy = true;
      var p = focus;
      TA.api('/api/pools/' + encodeURIComponent(p.id) + '/board?n=10', undefined, 'GET').then(function (j) {
        boardBusy = false; if (!j._ok) { if (j._status === undefined) setNet(true, TA.isOnline() ? 'Reconnecting…' : undefined); return; }
        setNet(false);
        if (p !== focus) return;
        if (j.me) { if (!sending && !pending) p.score = j.me.score; p.rank = j.me.rank; p.mult = j.me.mult || 1; p.multUntil = j.me.multUntil || 0; p.queued = j.me.queued || 0; p.used = j.me.used || {}; }
        p.total = j.total; p.top = j.top || []; p.near = j.near || [];
        renderBoard(stripRows(p).filter(function (r) { return !r.gap; }), $('board-side'));
        var teams = $('teams');
        if (p.sideA && j.teams) { var a = j.teams[p.sideA] || 0, b = j.teams[p.sideB] || 0, sum = a + b || 1; teams.hidden = false; teams.children[0].style.flexGrow = Math.max(0.15, a / sum); teams.children[1].style.flexGrow = Math.max(0.15, b / sum); teams.children[0].textContent = p.sideA + ' ' + fmtN(a); teams.children[1].textContent = fmtN(b) + ' ' + p.sideB; }
        checkPosition(p); paintScore(); paintChips(); paintStrip();
      });
    }
    setInterval(loadBoard, 2500);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) loadBoard(); });

    /* ── sheets ── */
    function openSheet(id) { var s = $(id); s.hidden = false; var f = s.querySelector('button,a'); if (f) f.focus(); }
    function closeSheets() { document.querySelectorAll('.gsheet').forEach(function (s) { s.hidden = true; }); pad.focus({ preventScroll: true }); }
    document.querySelectorAll('.gsheet').forEach(function (s) { s.addEventListener('click', function (e) { if (e.target === s || e.target.closest('[data-close]')) closeSheets(); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeSheets(); } });

    /* ── boosters (button bottom left) ── */
    var boostBtn = $('boost-btn');
    function usable(b) { return !b.lock && b.qty > 0 && !(b.perGame && (focus.used[b.id] || 0) >= b.perGame); }
    function boosterTotal() { return boosters.reduce(function (s, b) { return s + (usable(b) ? b.qty : 0); }, 0); }
    function paintBoostBtn() {
      var st = stateOf(focus), n = boosterTotal();
      $('boost-count').textContent = n > 99 ? '99+' : String(n); $('boost-count').hidden = !n;
      boostBtn.disabled = !focus.boosters || st === 'ended';
      boostBtn.title = !focus.boosters ? 'Boosters are off for this pool' : '';
    }
    boostBtn.addEventListener('click', function () {
      var list = $('boost-list'); list.textContent = '';
      if (!boosters.length) { var p = document.createElement('p'); p.textContent = 'You no get any booster. Buy some for the store.'; list.appendChild(p); }
      boosters.forEach(function (b) {
        var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'bopt' + (b.lock ? ' locked' : ''); btn.style.setProperty('--c', b.color || '#2E8BFF');
        var limitHit = b.perGame && (focus.used[b.id] || 0) >= b.perGame;
        btn.innerHTML = '<span class="m"></span><span class="t"></span><span class="q"></span>';
        btn.querySelector('.m').textContent = String(b.mult).replace(/\.0$/, '') + '×';
        btn.querySelector('.t').appendChild(document.createTextNode(b.name));
        var sm = document.createElement('small'); sm.textContent = b.lock ? 'Locked: ' + b.lock.why : (b.mult + '× every tap for ' + b.dur + 's' + (b.perGame ? ' · ' + b.perGame + ' per game' : '') + (limitHit ? ' · used' : '')); btn.querySelector('.t').appendChild(sm);
        btn.querySelector('.q').textContent = b.lock ? (b.lock.need === 'RANK' ? 'Rank up' : 'Upgrade') : '×' + b.qty;
        if (!b.lock && (b.qty < 1 || limitHit)) btn.disabled = true;
        btn.addEventListener('click', function () { if (b.lock) { closeSheets(); TA.upgrade(b.lock.need || 'MAPO', b.name); return; } useBooster(b); });
        list.appendChild(btn);
      });
      openSheet('boost-sheet');
    });
    var boosting = false;
    function useBooster(b, fromTip) {
      if (boosting) return; boosting = true;
      var p = focus; if (!fromTip) closeSheets();
      TA.api('/api/pools/' + encodeURIComponent(p.id) + '/boost', { item: b.id }).then(function (j) {
        boosting = false;
        if (!j._ok) { TA.fail(j); return; }
        p.mult = j.mult; p.multUntil = j.multUntil; p.queued = j.queued || 0; b.qty--; p.used[b.id] = (p.used[b.id] || 0) + 1;
        if (j.mult === b.mult && !j.queued) party(String(b.mult).replace(/\.0$/, '') + '× BOOST!'); else TA.toast(j.message || 'Booster queued');
        paintBoostBtn(); if (!fromTip) clearTips();
      });
    }

    /* ── booster tips (Mapo + Nepo): the calculator in the game. Up to 3 cards slide in from the left now
       and then: "Use Turbo 2× → you'll reach the top 2". Tap a card to use that booster; that card leaves. ── */
    var tipsEl = $('tips'), lastTipAt = 0, MAX_TIPS = 3;
    function tipCards() { return Array.prototype.slice.call(tipsEl.querySelectorAll('.tipcard:not(.out)')); }
    function dropTip(c) { if (!c || c.classList.contains('out')) return; c.classList.add('out'); setTimeout(function () { c.remove(); }, 450); }
    function clearTips() { tipCards().forEach(dropTip); }
    function rateNow() { var t = performance.now(); recent = recent.filter(function (x) { return t - x < 5000; }); return Math.max(3, recent.length / 5); }
    // Where would this booster take me? Best rank I'd pass, using my current speed.
    function reachWith(b, rate, my, top) {
      var extra = rate * b.dur * (b.mult - 1), best = 0;
      for (var i = 0; i < top.length; i++) { var row = top[i]; if (row.me) continue; if (my + extra > row.s && (!focus.rank || row.r < focus.rank)) { best = row.r; break; } }
      return best;
    }
    function suggest() {
      if (!ME.calc || stateOf(focus) !== 'live' || !focus.boosters || document.hidden) return;
      var open = tipCards();
      if (open.length >= MAX_TIPS || Date.now() - lastTipAt < (open.length ? 9000 : 25000)) return;
      var rate = rateNow(), my = displayScore(), top = focus.top || [];
      if (!top.length || focus.rank === 1) return;
      var shown = {}; open.forEach(function (c) { shown[c.getAttribute('data-b')] = 1; shown['r' + c.getAttribute('data-r')] = 1; });
      var picks = [];
      boosters.forEach(function (b) { if (!usable(b) || shown[b.id]) return; var r = reachWith(b, rate, my, top); if (r && !shown['r' + r]) picks.push({ b: b, r: r }); });
      if (!picks.length) return;
      picks.sort(function (a, b) { return a.r - b.r || a.b.mult - b.b.mult; });
      var pick = picks[0];
      // prefer the cheapest booster that still reaches a new rank
      for (var i = 0; i < picks.length; i++) if (picks[i].r === pick.r && picks[i].b.mult < pick.b.mult) pick = picks[i];
      showTip(pick.b, pick.r);
    }
    function showTip(b, rank) {
      lastTipAt = Date.now();
      var c = document.createElement('button'); c.type = 'button'; c.className = 'tipcard'; c.setAttribute('data-b', b.id); c.setAttribute('data-r', String(rank));
      c.style.setProperty('--c', b.color || '#2E8BFF');
      c.innerHTML = '<span class="m"></span><span class="tx"><b></b><span></span></span><span class="go">Use</span>';
      c.querySelector('.m').textContent = String(b.mult).replace(/\.0$/, '') + '×';
      c.querySelector('.tx b').textContent = b.name;
      c.querySelector('.tx span').textContent = rank === 1 ? 'You go reach #1' : 'You go reach the top ' + rank;
      c.setAttribute('aria-label', 'Use ' + b.name + '. ' + c.querySelector('.tx span').textContent);
      c.addEventListener('click', function () { dropTip(c); useBooster(b, true); });
      tipsEl.appendChild(c);
      requestAnimationFrame(function () { requestAnimationFrame(function () { c.classList.add('in'); }); });
      setTimeout(function () { dropTip(c); }, 14000);
    }
    setInterval(suggest, 2000);

    /* ── ads: when you open the game, in the lobby, and before results. The sponsor picks 5, 10 or 30 seconds;
       a line fills left to right, then the ad can close (and closes by itself a moment later). ── */
    var promoEl = $('promo'), promoBody = $('promo-body'), promoX = $('promo-x'), promoWait = $('promo-wait'), promoLine = $('promo-line'), promoAfter = null, promoTimer = 0, promoAuto = 0;
    function closePromo() { if (promoEl.hidden || promoX.disabled) return; promoEl.hidden = true; promoBody.textContent = ''; clearInterval(promoTimer); clearTimeout(promoAuto); var f = promoAfter; promoAfter = null; if (f) f(); }
    promoX.addEventListener('click', closePromo);
    function showPromo(at, then) {
      var key = 'ta-promo-' + at + '-' + focus.id;
      try { if (at !== 'POST' && sessionStorage.getItem(key)) { if (then) then(); return; } sessionStorage.setItem(key, '1'); } catch (e) {}
      TA.api('/api/promo?at=' + at + '&pool=' + encodeURIComponent(focus.id), undefined, 'GET').then(function (j) {
        var p = j && j.promo; if (!p) { if (then) then(); return; }
        promoBody.textContent = '';
        $('promo-by').textContent = 'Sponsored' + (p.company ? ' · ' + p.company : '');
        var media;
        if (p.kind === 'YOUTUBE' && /^[A-Za-z0-9_-]{11}$/.test(p.video_id || '')) {
          media = document.createElement('div'); media.className = 'promo-media';
          var f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + p.video_id + '?autoplay=1&mute=1&playsinline=1&rel=0&loop=1&playlist=' + p.video_id + '&enablejsapi=1&origin=' + encodeURIComponent(location.origin); f.title = p.title || 'Sponsored video'; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.setAttribute('allowfullscreen', ''); f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
          // Muted autoplay works on phones; the nudge below covers browsers that wait for the player to load.
          f.addEventListener('load', function () { try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), 'https://www.youtube-nocookie.com'); } catch (e) {} });
          media.appendChild(f);
        } else if (p.image_url) {
          media = document.createElement(p.target_url ? 'a' : 'div'); media.className = 'promo-media';
          if (p.target_url) { media.href = '/go/' + encodeURIComponent(p.id); media.target = '_blank'; media.rel = 'noopener sponsored'; }
          var img = document.createElement('img'); img.src = p.image_url; img.alt = p.title || 'Sponsored'; media.appendChild(img);
        }
        if (media) promoBody.appendChild(media);
        if (p.title) { var h = document.createElement('h3'); h.textContent = p.title; promoBody.appendChild(h); }
        if (p.lead_capture && !p.lead_done) promoBody.appendChild(leadForm(p));
        var row = document.createElement('div'); row.className = 'actions';
        if (p.target_url) { var a = document.createElement('a'); a.className = 'btn btn--green btn--sm'; a.href = '/go/' + encodeURIComponent(p.id); a.target = '_blank'; a.rel = 'noopener sponsored'; a.textContent = 'Check am out'; row.appendChild(a); }
        promoBody.appendChild(row);
        promoAfter = then || null; promoEl.hidden = false;
        // close button unlocks after the ad's length (5, 10 or 30 seconds)
        var secs = [5, 10, 30].indexOf(Number(p.duration_seconds)) > -1 ? Number(p.duration_seconds) : 5, left = secs;
        promoX.disabled = true; promoWait.textContent = 'Wait ' + left + 's';
        promoLine.getAnimations && promoLine.getAnimations().forEach(function (a) { a.cancel(); });
        if (promoLine.animate) promoLine.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: secs * 1000, easing: 'linear', fill: 'forwards' });
        clearInterval(promoTimer); clearTimeout(promoAuto);
        promoTimer = setInterval(function () {
          left--; if (left > 0) { promoWait.textContent = 'Wait ' + left + 's'; return; }
          clearInterval(promoTimer); promoX.disabled = false; promoWait.textContent = 'Close'; promoX.focus();
          promoAuto = setTimeout(closePromo, p.lead_capture && !p.lead_done ? 15000 : 3000);
        }, 1000);
      });
    }
    function leadForm(p) {
      var f = document.createElement('form'); f.className = 'lead'; f.noValidate = true;
      f.innerHTML = '<b style="font:900 16px var(--display)">Want this offer? Leave your details</b><input class="ta-input" name="name" placeholder="Your name" maxlength="80" autocomplete="name"><input class="ta-input" name="email" type="email" placeholder="Email" maxlength="254" autocomplete="email"><input class="ta-input" name="phone" type="tel" placeholder="Phone (optional)" maxlength="16" autocomplete="tel"><label class="ta-check"><input type="checkbox" name="consent"><span></span></label><p class="ta-error" data-err></p><button class="btn btn--sm" type="submit">Send my details</button>';
      f.querySelector('.ta-check span').textContent = 'I agree to share my name, email and phone with ' + (p.company || 'this sponsor') + ' so they can contact me about this offer. See the Privacy Policy.';
      f.addEventListener('submit', function (e) {
        e.preventDefault(); var err = f.querySelector('[data-err]'); err.textContent = '';
        var btn = f.querySelector('button'); btn.classList.add('is-loading');
        TA.api('/api/leads', { promo: p.id, name: f.name.value, email: f.email.value, phone: f.phone.value, consent: f.consent.checked }).then(function (j) {
          btn.classList.remove('is-loading');
          if (j._ok) { f.textContent = ''; var b = document.createElement('b'); b.textContent = j.message || 'Sent'; f.appendChild(b); clearTimeout(promoAuto); } else err.textContent = j.error || 'Something no work.';
        });
      });
      return f;
    }

    /* ── end of a pool: ad first, then results ── */
    function rankTitle(r) { return r === 1 ? 'Odogwu! You win am!' : r && r <= 3 ? 'Top 3! Correct finger' : r && r <= 10 ? 'Top 10. You try well' : 'Time up!'; }
    function onEnd(p) {
      if (p._endShown) return; p._endShown = true;
      pending = 0; flush(); clearTips();
      setTimeout(function () {
        var others = livePools().length;
        var show = function () { results(p); };
        if (!others && p === focus) showPromo('POST', show); else show();
      }, 900);
    }
    function results(p) {
      TA.api('/api/pools/' + encodeURIComponent(p.id) + '/board?n=3', undefined, 'GET').then(function (j) {
        if (j._ok && j.me) { p.score = j.me.score; p.rank = j.me.rank; p.total = j.total; }
        if (p !== focus) return;
        endEl.textContent = '';
        var t = document.createElement('div'); t.className = 'ttl'; t.textContent = rankTitle(p.rank);
        var big = document.createElement('div'); big.className = 'big'; big.textContent = fmtN(p.score);
        var sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = p.rank ? 'You finish #' + p.rank + ' of ' + fmtN(p.total) + '. Prizes land for your winnings in a few seconds.' : 'You no tap for this one. Next time!';
        var act = document.createElement('div'); act.className = 'actions';
        var a1 = document.createElement('a'); a1.className = 'btn btn--green btn--shine'; a1.href = '/pool/' + encodeURIComponent(p.id); a1.textContent = 'See results';
        var a2 = document.createElement('a'); a2.className = 'btn btn--white'; a2.href = '/pools'; a2.textContent = 'Play another';
        act.appendChild(a1); act.appendChild(a2);
        [t, big, sub, act].forEach(function (n) { endEl.appendChild(n); });
        endEl.hidden = false;
        if (p.rank && p.rank <= 3) party(p.rank === 1 ? 'WINNER!' : 'PODIUM!'); else { buzz(80); S.thud(); }
        checkRankUp();
      });
    }
    function checkRankUp() {
      setTimeout(function () {
        TA.api('/api/me', undefined, 'GET').then(function (j) {
          if (j._ok && j.rank && j.rank.level > ME.rank) { ME.rank = j.rank.level; if (TA.celebrate) TA.celebrate('Rank up!', j.rank.name); }
        });
      }, 2500);
    }

    /* ── start ── */
    paintChips(); setFocus(focus);
    var st0 = stateOf(focus);
    if (st0 === 'live') showPromo('PRE'); else if (st0 === 'soon') showPromo('LOBBY');
    pad.focus({ preventScroll: true });
    window.addEventListener('pagehide', function () { if (pending > 0 && livePools().length) { try { fetch('/api/tap', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pools: livePools().map(function (p) { return p.id; }), taps: Math.min(pending, 200) }) }); } catch (e) {} } });
    window.TAGame = { focus: function () { return focus; }, pools: pools };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
