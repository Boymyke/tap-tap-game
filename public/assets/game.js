/* Tap Am game client: taps (batched to the server), multi-pool, boosters, combos,
   milestones, leaderboard, promos, sound, vibration and the end screen. */
(function () {
  'use strict';
  function boot() {
    var TA = window.TA, $ = function (id) { return document.getElementById(id); };
    var D = JSON.parse($('game-data').textContent);
    var skew = Date.parse(D.serverNow) - Date.now();
    var now = function () { return Date.now() + skew; };
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

    var pools = D.pools.map(function (p) { return { id: p.id, name: p.name, starts: Date.parse(p.startsAt), ends: Date.parse(p.endsAt), boosters: p.boosters, boosterUsed: p.boosterUsed, sideA: p.sideA, sideB: p.sideB, side: p.side, prize: p.prize, sponsor: p.sponsor, kind: p.kind, score: 0, rank: 0, total: 0, mult: 1, multUntil: 0, ended: p.state === 'ended' || p.state === 'cancelled', seenTop: 999 }; });
    var byId = {}; pools.forEach(function (p) { byId[p.id] = p; });
    var focus = pools[0];
    var boosters = D.boosters || [];

    var pad = $('pad'), fx = $('fx'), msg = $('msg'), scoreEl = $('score'), timeEl = $('time'), timeLbl = $('time-lbl'), posEl = $('pos'), comboEl = $('combo'), endEl = $('end');

    /* ── sound + vibration ── */
    var snd = $('snd'), muted = store.get('ta-muted') === '1', ac = null;
    function paintSnd() { snd.setAttribute('data-muted', muted ? '1' : '0'); snd.setAttribute('aria-label', muted ? 'Sound off. Tap to turn on' : 'Sound on. Tap to mute'); }
    paintSnd(); snd.addEventListener('click', function () { muted = !muted; store.set('ta-muted', muted ? '1' : '0'); paintSnd(); });
    function blip(f, d, type) { if (muted) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); var o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.value = 0.035; o.connect(g); g.connect(ac.destination); var t = ac.currentTime; o.start(t); g.gain.exponentialRampToValueAtTime(0.0001, t + (d || 0.06)); o.stop(t + (d || 0.06) + 0.01); } catch (e) {} }
    function buzz(p) { if (D.me.vibrate && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

    /* ── effects ── */
    var COLORS = ['#ffffff', '#00ff6e', '#efc032', '#e2802a', '#9fb0ff', '#59ffb4'];
    function make(cls, n) { var a = []; for (var i = 0; i < n; i++) { var e = document.createElement('span'); e.className = cls; fx.appendChild(e); a.push(e); } return a; }
    var pluses = make('fx-plus', 40), rings = make('fx-ring', 8), bits = make('fx-bit', 40), ban = make('fx-banner', 1)[0];
    var pi = 0, ri = 0, bi = 0;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function shootPlus(x, y, label, big) {
      var el = pluses[pi++ % pluses.length], r = pad.getBoundingClientRect(), reach = Math.min(r.width, r.height);
      var ang = rnd(0, Math.PI * 2), dist = rnd(0.22, 0.5) * reach, dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - reach * 0.08;
      var s = rnd(1, 1.9) + Math.min(combo, 40) / 40 + (big ? 0.6 : 0), rot = rnd(-35, 35), dur = rnd(700, 1050);
      el.textContent = label; el.style.color = big ? '#ffe37a' : COLORS[(Math.random() * COLORS.length) | 0]; el.style.fontSize = (rnd(40, 62) | 0) + 'px';
      el.animate([{ transform: 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(.4)' }, { transform: 'translate(' + (x + dx * 0.7) + 'px,' + (y + dy * 0.7) + 'px) translate(-50%,-50%) scale(' + s + ') rotate(' + rot * 0.6 + 'deg)', offset: 0.35 }, { transform: 'translate(' + (x + dx) + 'px,' + (y + dy) + 'px) translate(-50%,-50%) scale(' + s * 0.85 + ') rotate(' + rot + 'deg)' }], { duration: dur, easing: 'cubic-bezier(.15,.85,.25,1)' });
      el.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: dur, easing: 'linear' });
    }
    function ring(x, y) { var el = rings[ri++ % rings.length]; el.animate([{ transform: 'translate(' + x + 'px,' + y + 'px) scale(.3)', opacity: 0.9 }, { transform: 'translate(' + x + 'px,' + y + 'px) scale(2.3)', opacity: 0 }], { duration: 420, easing: 'ease-out' }); }
    function confetti(x, y, n) { for (var i = 0; i < n; i++) { var el = bits[bi++ % bits.length], a = rnd(0, Math.PI * 2), d = rnd(80, 260); el.style.background = COLORS[(Math.random() * COLORS.length) | 0]; el.animate([{ transform: 'translate(' + x + 'px,' + y + 'px) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + (x + Math.cos(a) * d) + 'px,' + (y + Math.sin(a) * d + 130) + 'px) rotate(' + rnd(-540, 540) + 'deg)', opacity: 0 }], { duration: rnd(800, 1400), easing: 'cubic-bezier(.2,.7,.3,1)' }); } }
    function banner(text, gold) { ban.textContent = text; ban.className = 'fx-banner' + (gold ? ' gold' : ''); ban.animate([{ transform: 'translate(-50%,-50%) scale(.3) rotate(-12deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15) rotate(-4deg)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-4deg)', opacity: 1, offset: 0.75 }, { transform: 'translate(-50%,-70%) scale(.9) rotate(-4deg)', opacity: 0 }], { duration: gold ? 1400 : 900, easing: 'linear' }); }
    function kick(cls) { pad.classList.remove(cls); void pad.offsetWidth; pad.classList.add(cls); }
    function centre() { var r = pad.getBoundingClientRect(); return [r.width / 2, r.height / 2.4]; }
    function party(text) { var c = centre(); banner(text, true); kick('flash'); kick('shake'); buzz([40, 50, 40, 50, 80]); blip(523, 0.12, 'triangle'); setTimeout(function () { blip(659, 0.12, 'triangle'); }, 110); setTimeout(function () { blip(784, 0.22, 'triangle'); }, 220); if (!reduce) { confetti(c[0], c[1], 40); for (var i = 0; i < 6; i++) shootPlus(c[0], c[1], ['🔥', '+1', '★', 'OYA!'][i % 4], true); } }

    /* ── state helpers ── */
    function stateOf(p) { var t = now(); return p.ended ? 'ended' : t < p.starts ? 'soon' : t < p.ends ? 'live' : 'ended'; }
    function livePools() { return pools.filter(function (p) { return stateOf(p) === 'live'; }); }
    function pad5(n) { n = Math.max(0, Math.floor(n)); var s = String(n); return s.length >= 5 ? s : ('00000' + s).slice(-5); }
    function mmss(ms) { if (ms <= 0) return '00:00'; var s = Math.ceil(ms / 1000); if (s >= 3600) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return ('0' + Math.min(h, 99)).slice(-2) + ':' + ('0' + m).slice(-2); } return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2); }
    function multOf(p) { return p.multUntil > now() ? p.mult : 1; }

    /* ── tapping ── */
    var pending = 0, inflight = 0, sending = false, combo = 0, lastTap = 0, shownScore = -1;
    var MILESTONES = [50, 100, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000];
    var nextMs = 0;
    function displayScore() { return focus.score + Math.round((pending + inflight) * multOf(focus)); }
    function hit(x, y) {
      var st = stateOf(focus);
      if (st !== 'live') { kick('shake'); blip(140, 0.08); if (st === 'soon') msg.textContent = 'Hold on — pool never start. Watch the countdown.'; return; }
      if (!TA.isOnline()) { kick('shake'); msg.textContent = 'Your internet don cut. Taps no fit count now.'; return; }
      var t = performance.now(); combo = (t - lastTap < 260) ? combo + 1 : 1; lastTap = t; pending++;
      var m = multOf(focus);
      pad.animate([{ transform: 'scale(.985)' }, { transform: 'scale(1)' }], { duration: 110 });
      if (!reduce) { shootPlus(x, y, m > 1 ? '+' + m : '+1', m > 1); if (combo > 15 && Math.random() < 0.5) shootPlus(x, y, m > 1 ? '+' + m : '+1'); ring(x, y); }
      blip(220 + Math.min(combo, 40) * 18, 0.05);
      if (m === 1) comboEl.textContent = 'Combo ' + combo;
      if (combo > 0 && combo % 10 === 0) { banner('COMBO x' + combo); kick('shake'); buzz(combo % 50 === 0 ? [40, 30, 40] : 30); blip(660, 0.12, 'sawtooth'); if (!reduce) confetti(x, y, 12); }
      var sc = displayScore();
      while (nextMs < MILESTONES.length && sc >= MILESTONES[nextMs]) { party(MILESTONES[nextMs].toLocaleString('en-NG') + ' POINTS!'); nextMs++; }
      paintScore();
    }
    pad.addEventListener('pointerdown', function (e) { if (endEl.contains(e.target)) return; e.preventDefault(); var r = pad.getBoundingClientRect(); hit(e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    pad.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !endEl.contains(e.target)) { e.preventDefault(); if (e.repeat) return; var c = centre(); hit(c[0], c[1]); } });
    pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

    function flush() {
      if (sending || pending <= 0) return;
      var ids = livePools().map(function (p) { return p.id; });
      if (!ids.length) { pending = 0; return; }
      var n = Math.min(pending, 200); pending -= n; inflight = n; sending = true;
      TA.api('/api/tap', { pools: ids, taps: n }).then(function (j) {
        sending = false; inflight = 0;
        if (!j._ok) {
          if (j._status === undefined) { pending = Math.min(pending + n, 60); return; }   // network: retry a little
          if (j.error) TA.toast(j.error, 'err');
          return;
        }
        var slow = false;
        Object.keys(j.results || {}).forEach(function (id) {
          var r = j.results[id], p = byId[id]; if (!p || !r) return;
          if (r.code === 'ENDED') { p.ended = true; return; }
          if (typeof r.score === 'number') { p.score = r.score; p.rank = r.rank; p.total = r.total; p.mult = r.mult || 1; p.multUntil = r.multUntil || 0; }
          if (r.rejected > 0 && r.rejected >= r.accepted) slow = true;
          checkPosition(p);
        });
        if (slow) msg.textContent = 'Easy small — taps wey pass human speed no dey count.';
        paintChips(); paintScore();
      });
    }
    setInterval(flush, 320);

    function checkPosition(p) {
      if (!p.rank || p !== focus) { p.seenTop = Math.min(p.seenTop, p.rank || 999); return; }
      var marks = [[1, 'YOU DEY #1!'], [3, 'TOP 3!'], [10, 'TOP 10!']];
      for (var i = 0; i < marks.length; i++) { var m = marks[i]; if (p.rank <= m[0] && p.seenTop > m[0] && p.total > m[0]) { p.seenTop = p.rank; party(m[1]); return; } }
      p.seenTop = Math.min(p.seenTop, p.rank);
    }

    /* ── painting ── */
    function paintScore() { var s = displayScore(); if (s !== shownScore) { TA.seg(scoreEl, pad5(s)); shownScore = s; } posEl.textContent = focus.rank ? '#' + focus.rank + ' of ' + focus.total : '#— of ' + (focus.total || '—'); }
    function paintChips() {
      document.querySelectorAll('[data-pool]').forEach(function (b) { var p = byId[b.getAttribute('data-pool')], st = stateOf(p); b.classList.toggle('ended', st === 'ended'); b.querySelector('[data-chip-rank]').textContent = st === 'soon' ? 'Starts soon' : st === 'ended' ? 'Ended' + (p.rank ? ' · #' + p.rank : '') : (p.rank ? '#' + p.rank + ' · ' + p.score.toLocaleString('en-NG') : 'Live'); });
    }
    var lastState = null;
    function tick() {
      var st = stateOf(focus), t = now();
      if (st === 'soon') { timeLbl.textContent = 'starts in'; TA.seg(timeEl, mmss(focus.starts - t)); }
      else { timeLbl.textContent = 'time left'; TA.seg(timeEl, mmss(focus.ends - t)); }
      if (st !== lastState) {
        pad.classList.toggle('locked', st !== 'live');
        if (st === 'soon') msg.textContent = 'Lobby — the pool go start soon. Warm your finger.';
        else if (st === 'live') { msg.textContent = pools.length > 1 ? 'Tap! Every tap counts in ' + livePools().length + ' pools.' : 'Tap anywhere on this card!'; if (lastState === 'soon') { banner('GO GO GO!', true); buzz([60, 40, 60]); blip(880, 0.2, 'triangle'); } }
        else if (st === 'ended') onEnd(focus);
        lastState = st; paintChips();
      }
      var m = multOf(focus);
      pad.classList.toggle('boosted', m > 1);
      if (m > 1) { comboEl.textContent = m + '× ' + mmss(focus.multUntil - t); comboEl.classList.add('boost'); }
      else if (comboEl.classList.contains('boost')) { comboEl.classList.remove('boost'); comboEl.textContent = 'Combo ' + combo; }
      pools.forEach(function (p) { if (p !== focus && !p._endNoted && stateOf(p) === 'ended') { p._endNoted = true; TA.toast(p.name + ' don end.'); } });
      paintBoostBtn();
    }
    setInterval(tick, 250);

    function setFocus(p) {
      focus = p; lastState = null; shownScore = -1; nextMs = 0;
      var s = focus.score; while (nextMs < MILESTONES.length && s >= MILESTONES[nextMs]) nextMs++;
      document.querySelectorAll('[data-pool]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-pool') === p.id)); });
      $('g-name').textContent = p.name; endEl.hidden = true; paintMeta(); paintScore(); tick(); loadBoard();
    }
    document.getElementById('chips').addEventListener('click', function (e) { var b = e.target.closest('[data-pool]'); if (b) setFocus(byId[b.getAttribute('data-pool')]); });
    function naira(k) { return '₦' + (Number(k || 0) / 100).toLocaleString('en-NG'); }
    function paintMeta() { var p = focus; var t = (p.prize ? 'Prize ' + naira(p.prize) : 'For glory') + (p.sponsor ? ' · by ' + p.sponsor : '') + (p.side ? ' · Team ' + p.side : ''); $('g-meta').textContent = t; $('bs-meta').textContent = p.name + ' · ' + t; }

    /* ── leaderboard ── */
    function renderBoard(list, el) {
      el.textContent = '';
      list.forEach(function (r) { var li = document.createElement('li'); if (r.me) li.className = 'me'; li.innerHTML = '<span class="r"></span><span class="n"></span><span class="s"></span>'; li.children[0].textContent = '#' + r.r; li.children[1].textContent = r.n + (r.side ? ' · ' + r.side : ''); li.children[2].textContent = Number(r.s).toLocaleString('en-NG'); el.appendChild(li); });
      if (!list.length) { var li = document.createElement('li'); li.innerHTML = '<span class="n" style="text-transform:none;font:600 14px var(--body);color:var(--muted)">Nobody don tap yet. Be the first!</span>'; el.appendChild(li); }
    }
    var boardBusy = false;
    function loadBoard() {
      if (boardBusy || document.hidden) return; boardBusy = true;
      var p = focus;
      TA.api('/api/pools/' + encodeURIComponent(p.id) + '/board?n=10', undefined, 'GET').then(function (j) {
        boardBusy = false; if (!j._ok || p !== focus) return;
        if (j.me) { if (!sending && !pending) p.score = j.me.score; p.rank = j.me.rank; p.mult = j.me.mult || 1; p.multUntil = j.me.multUntil || 0; if (j.me.boosted) p.boosterUsed = true; }
        p.total = j.total;
        renderBoard(j.top || [], $('board-side')); renderBoard(j.top || [], $('board-sheet-list'));
        var teams = $('teams');
        if (p.sideA && j.teams) { var a = j.teams[p.sideA] || 0, b = j.teams[p.sideB] || 0, sum = a + b || 1; teams.hidden = false; teams.children[0].style.flexGrow = Math.max(0.15, a / sum); teams.children[1].style.flexGrow = Math.max(0.15, b / sum); teams.children[0].textContent = p.sideA + ' ' + a.toLocaleString('en-NG'); teams.children[1].textContent = b.toLocaleString('en-NG') + ' ' + p.sideB; }
        checkPosition(p); paintScore(); paintChips();
      });
    }
    setInterval(loadBoard, 3000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) loadBoard(); });
    document.addEventListener('ta:online', loadBoard);

    /* ── sheets ── */
    function openSheet(id) { var s = $(id); s.hidden = false; var f = s.querySelector('button,a'); if (f) f.focus(); }
    function closeSheets() { document.querySelectorAll('.gsheet').forEach(function (s) { s.hidden = true; }); pad.focus({ preventScroll: true }); }
    document.querySelectorAll('.gsheet').forEach(function (s) { s.addEventListener('click', function (e) { if (e.target === s || e.target.closest('[data-close]')) closeSheets(); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeSheets(); closePromo(); } });
    document.querySelectorAll('[data-open-board]').forEach(function (b) { b.addEventListener('click', function () { loadBoard(); openSheet('board-sheet'); }); });

    /* ── boosters ── */
    var boostBtn = $('boost-btn');
    function boosterTotal() { return boosters.reduce(function (s, b) { return s + (b.blocked ? 0 : b.qty); }, 0); }
    function paintBoostBtn() {
      var st = stateOf(focus), why = !focus.boosters ? 'Off' : focus.boosterUsed ? 'Used' : st === 'ended' ? '' : 'x' + boosterTotal();
      $('boost-count').textContent = why; boostBtn.disabled = !focus.boosters || focus.boosterUsed || st === 'ended';
    }
    boostBtn.addEventListener('click', function () {
      var list = $('boost-list'); list.textContent = '';
      if (!boosters.length) { list.innerHTML = '<p>You no get any booster. Buy one for the store.</p>'; }
      boosters.forEach(function (b) {
        var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'bopt'; btn.disabled = !!b.blocked || b.qty < 1;
        btn.innerHTML = '<span class="segbox"><span class="seg" style="font-size:22px"></span></span><span class="t"></span><span class="q"></span>';
        TA.seg(btn.querySelector('.seg'), String(b.mult).replace(/\.0$/, ''));
        btn.querySelector('.t').innerHTML = ''; btn.querySelector('.t').appendChild(document.createTextNode(b.name));
        var sm = document.createElement('small'); sm.textContent = b.blocked ? b.blocked : b.mult + '× every tap for ' + b.dur + 's'; btn.querySelector('.t').appendChild(sm);
        btn.querySelector('.q').textContent = '×' + b.qty;
        btn.addEventListener('click', function () { useBooster(b); });
        list.appendChild(btn);
      });
      openSheet('boost-sheet');
    });
    function useBooster(b) {
      var p = focus; closeSheets();
      TA.api('/api/pools/' + encodeURIComponent(p.id) + '/boost', { item: b.id }).then(function (j) {
        if (!j._ok) { TA.toast(j.error || 'Booster no work.', 'err', j.redirect); return; }
        p.boosterUsed = true; p.mult = j.mult; p.multUntil = j.multUntil; b.qty--;
        party(b.mult + '× BOOST!'); paintBoostBtn();
      });
    }

    /* ── promos (pre-game, lobby, after) ── */
    var promoEl = $('promo'), promoBody = $('promo-body'), promoX = $('promo-x'), promoAfter = null;
    function closePromo() { if (promoEl.hidden) return; promoEl.hidden = true; promoBody.textContent = ''; var f = promoAfter; promoAfter = null; if (f) f(); }
    promoX.addEventListener('click', closePromo);
    promoEl.addEventListener('click', function (e) { if (e.target === promoEl) closePromo(); });
    function showPromo(at, then) {
      var key = 'ta-promo-' + at + '-' + focus.id;
      try { if (sessionStorage.getItem(key)) { if (then) then(); return; } sessionStorage.setItem(key, '1'); } catch (e) {}
      TA.api('/api/promo?at=' + at + '&pool=' + encodeURIComponent(focus.id), undefined, 'GET').then(function (j) {
        var p = j && j.promo; if (!p) { if (then) then(); return; }
        promoBody.textContent = '';
        var media;
        if (p.kind === 'YOUTUBE' && /^[A-Za-z0-9_-]{11}$/.test(p.video_id || '')) {
          media = document.createElement('div'); media.className = 'promo-media';
          var f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + p.video_id + '?autoplay=1&mute=1&playsinline=1&rel=0'; f.title = p.title || 'Sponsored video'; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.setAttribute('allowfullscreen', ''); f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
          media.appendChild(f);
        } else if (p.image_url) {
          media = document.createElement(p.target_url ? 'a' : 'div'); media.className = 'promo-media';
          if (p.target_url) { media.href = '/go/' + encodeURIComponent(p.id); media.target = '_blank'; media.rel = 'noopener sponsored'; }
          var img = document.createElement('img'); img.src = p.image_url; img.alt = p.title || 'Sponsored'; media.appendChild(img);
        }
        if (media) promoBody.appendChild(media);
        if (p.title) { var h = document.createElement('h3'); h.textContent = p.title; promoBody.appendChild(h); }
        var row = document.createElement('div'); row.className = 'actions';
        if (p.target_url) { var a = document.createElement('a'); a.className = 'btn btn--sm'; a.href = '/go/' + encodeURIComponent(p.id); a.target = '_blank'; a.rel = 'noopener sponsored'; a.textContent = 'Check am out'; row.appendChild(a); }
        var c = document.createElement('button'); c.type = 'button'; c.className = 'btn btn--ghost btn--sm'; c.textContent = at === 'POST' ? 'See my result' : 'Close and play'; c.addEventListener('click', closePromo); row.appendChild(c);
        promoBody.appendChild(row);
        promoAfter = then || null; promoEl.hidden = false; c.focus();
      });
    }

    /* ── end of a pool ── */
    function rankTitle(r, total) { return r === 1 ? 'Odogwu! You win am!' : r && r <= 3 ? 'Top 3! Correct finger' : r && r <= 10 ? 'Top 10. You try well' : 'Time up!'; }
    function onEnd(p) {
      if (p._endShown) return; p._endShown = true;
      pending = 0; flush();
      setTimeout(function () {
        TA.api('/api/pools/' + encodeURIComponent(p.id) + '/board?n=3', undefined, 'GET').then(function (j) {
          if (j._ok && j.me) { p.score = j.me.score; p.rank = j.me.rank; p.total = j.total; }
          if (p !== focus) return;
          endEl.textContent = '';
          var t = document.createElement('div'); t.className = 'ttl'; t.textContent = rankTitle(p.rank, p.total);
          var box = document.createElement('div'); box.className = 'segbox'; var s = document.createElement('span'); s.className = 'seg'; box.appendChild(s);
          var sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = p.rank ? 'You finish #' + p.rank + ' of ' + p.total + '. Prizes land for your winnings in a few seconds.' : 'You no tap for this one. Next time!';
          var act = document.createElement('div'); act.className = 'actions';
          var a1 = document.createElement('a'); a1.className = 'btn btn--shine'; a1.href = '/pool/' + encodeURIComponent(p.id); a1.textContent = 'See results';
          var a2 = document.createElement('a'); a2.className = 'btn btn--ghost'; a2.href = '/pools'; a2.textContent = 'Play another';
          act.appendChild(a1); act.appendChild(a2);
          [t, box, sub, act].forEach(function (n) { endEl.appendChild(n); });
          endEl.hidden = false; TA.seg(s, pad5(p.score));
          if (p.rank && p.rank <= 3) party(p.rank === 1 ? 'WINNER!' : 'PODIUM!'); else { buzz(80); blip(330, 0.25, 'triangle'); }
          var others = livePools().length;
          if (!others) setTimeout(function () { showPromo('POST', checkRankUp); }, 1600);
        });
      }, 900);
    }
    /* account rank-up after settlement */
    function checkRankUp() {
      setTimeout(function () {
        TA.api('/api/me', undefined, 'GET').then(function (j) {
          if (j._ok && j.rank && j.rank.level > D.me.rank) { D.me.rank = j.rank.level; if (TA.celebrate) TA.celebrate('Rank up!', j.rank.name); }
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
