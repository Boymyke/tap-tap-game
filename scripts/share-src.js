/* Share card + QR code (built into public/assets/share.js together with the MIT-licensed
   qrcode-generator by Kazuhiko Arase). Loaded only when someone taps a share button.
   TAShare.open({ url, title, line, code, color, kind, display }) */
(function () {
  'use strict';
  var TA = window.TA;
  function qrMatrix(text) {
    var q = qrcode(0, 'M'); q.addData(text); q.make();
    var n = q.getModuleCount(), m = [];
    for (var r = 0; r < n; r++) { m.push([]); for (var c = 0; c < n; c++) m[r].push(q.isDark(r, c)); }
    return m;
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function img(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }
  function drawQR(ctx, text, x, y, size) {
    var m = qrMatrix(text), n = m.length, cell = size / (n + 2);
    ctx.fillStyle = '#fff'; roundRect(ctx, x, y, size, size, 18); ctx.fill();
    ctx.fillStyle = '#150B33';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (m[r][c]) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + (c + 1) * cell, y + (r + 1) * cell, cell + 0.6, cell + 0.6, cell * 0.25) : ctx.rect(x + (c + 1) * cell, y + (r + 1) * cell, cell + 0.6, cell + 0.6); ctx.fill(); }
  }
  // Tone-on-tone diamonds, same as the cards in the app.
  function texture(ctx) {
    var t = document.createElement('canvas'); t.width = 56; t.height = 56; var c = t.getContext('2d');
    c.fillStyle = 'rgba(255,255,255,.07)'; [[0, 0, 14, 14, 0, 28], [28, 0, 42, 14, 28, 28], [14, 28, 28, 42, 14, 56], [42, 28, 56, 42, 42, 56]].forEach(function (p) { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.lineTo(p[4], p[5]); c.closePath(); c.fill(); });
    c.fillStyle = 'rgba(0,0,0,.09)'; [[28, 0, 14, 14, 28, 28], [56, 0, 42, 14, 56, 28], [28, 28, 14, 42, 28, 56], [56, 28, 42, 42, 56, 56]].forEach(function (p) { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.lineTo(p[4], p[5]); c.closePath(); c.fill(); });
    return ctx.createPattern(t, 'repeat');
  }
  var D = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif', B = 'Barlow, Arial, sans-serif';
  function svgImg(svg, w, h) {   // an inline SVG string (avatar, badge) as an image
    if (!svg) return Promise.resolve(null);
    svg = String(svg);
    if (svg.indexOf('xmlns=') < 0) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    svg = svg.replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1').replace('<svg', '<svg width="' + w + '" height="' + h + '"');
    return img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  }
  async function fonts() { try { await Promise.all([document.fonts.load('italic 900 80px "Barlow Condensed"'), document.fonts.load('900 80px "Barlow Condensed"'), document.fonts.load('800 40px "Barlow Condensed"'), document.fonts.load('700 40px Barlow')]); } catch (e) {} }
  function bg(ctx, W, H) {
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#7B45FF'); g.addColorStop(0.55, '#4B1FD8'); g.addColorStop(1, '#2A0F8F');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = texture(ctx); ctx.globalAlpha = 0.6; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    // soft glow behind the hero
    var r = ctx.createRadialGradient(W / 2, 420, 40, W / 2, 420, 620); r.addColorStop(0, 'rgba(0,255,110,.22)'); r.addColorStop(1, 'rgba(0,255,110,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  }
  async function header(ctx, W, chip) {
    var logo = await img('/assets/brand/logo-white.svg');
    if (logo) ctx.drawImage(logo, 72, 68, 300, 62);
    ctx.font = '800 34px ' + D; var tw = ctx.measureText(chip).width + 52;
    ctx.fillStyle = '#150B33'; roundRect(ctx, W - 72 - tw, 70, tw, 60, 30); ctx.fill();
    ctx.fillStyle = '#00FF6E'; ctx.textBaseline = 'middle'; ctx.fillText(chip, W - 72 - tw + 26, 101); ctx.textBaseline = 'alphabetic';
  }
  function footer(ctx, W, H, d, ask) {
    ctx.fillStyle = 'rgba(21,11,51,.55)'; roundRect(ctx, 72, H - 196, W - 144, 104, 26); ctx.fill();
    ctx.textBaseline = 'middle';
    var url = d.display || 'tapammm.live'; ctx.font = '900 ' + fit(ctx, url, 420, 40, '900', D) + 'px ' + D; var uw = ctx.measureText(url).width;
    ctx.fillStyle = '#00FF6E'; ctx.textAlign = 'right'; ctx.fillText(url, W - 108, H - 144); ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = 'italic 900 ' + fit(ctx, ask, W - 216 - uw - 30, 40, 'italic 900', D) + 'px ' + D; ctx.fillText(ask, 108, H - 144);
    ctx.font = '700 26px ' + B; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.textAlign = 'center'; ctx.fillText('Powered by Ferrn Agency', W / 2, H - 46); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function fit(ctx, text, maxW, size, weight, fam) { var s = size; do { ctx.font = weight + ' ' + s + 'px ' + fam; s -= 4; } while (ctx.measureText(text).width > maxW && s > 30); return s + 4; }
  function pill(ctx, x, y, text, bgc, fg) { ctx.font = '800 30px ' + D; var w = ctx.measureText(text).width + 40; ctx.fillStyle = bgc; roundRect(ctx, x, y, w, 52, 26); ctx.fill(); ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 20, y + 27); ctx.textBaseline = 'alphabetic'; return w; }

  // Profile: the rank character, name, rank, three numbers and the last three badges. No QR.
  async function renderProfile(d) {
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var ctx = cv.getContext('2d');
    await fonts(); bg(ctx, W, H); await header(ctx, W, 'MY TAP AM');
    // hero card
    var y0 = 176, hh = 470;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; roundRect(ctx, 72, y0 + 14, W - 144, hh, 40); ctx.fill();
    ctx.fillStyle = '#fff'; roundRect(ctx, 72, y0, W - 144, hh, 40); ctx.fill();
    ctx.fillStyle = d.color || '#9161FF'; ctx.beginPath(); ctx.arc(250, y0 + 235, 160, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(250, y0 + 235, 160, Math.PI * 1.05, Math.PI * 1.6); ctx.lineTo(250, y0 + 235); ctx.fill();
    var av = await svgImg(d.avatar, 300, 300); if (av) ctx.drawImage(av, 100, y0 + 85, 300, 300);
    ctx.fillStyle = '#150B33'; var nameSize = fit(ctx, d.title || 'Tap Am', W - 144 - 400, 96, '900', D);
    ctx.font = '900 ' + nameSize + 'px ' + D; ctx.fillText(d.title || 'Tap Am', 450, y0 + 150);
    ctx.font = '800 38px ' + D; ctx.fillStyle = '#5B4E86'; ctx.fillText((d.label || '').toUpperCase(), 452, y0 + 206);
    var px = 450; px += pill(ctx, px, y0 + 240, d.tier || 'Lapo baby', '#150B33', '#FFD23F') + 12; pill(ctx, px, y0 + 240, 'Rank ' + (d.level || 1), '#00FF6E', '#150B33');
    if (d.joined) { ctx.font = '700 28px ' + B; ctx.fillStyle = '#5B4E86'; ctx.fillText('Tapping since ' + d.joined, 452, y0 + 352); }
    // three numbers
    var sy = y0 + hh + 46, sw = (W - 144 - 40) / 3, cols = [['#00FF6E', '#150B33'], ['#FFD23F', '#150B33'], ['#FF4FA3', '#fff']];
    (d.numbers || []).slice(0, 3).forEach(function (n, i) {
      var x = 72 + i * (sw + 20);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; roundRect(ctx, x, sy + 10, sw, 170, 28); ctx.fill();
      ctx.fillStyle = cols[i][0]; roundRect(ctx, x, sy, sw, 170, 28); ctx.fill();
      ctx.fillStyle = cols[i][1]; ctx.textAlign = 'center'; ctx.font = '900 ' + fit(ctx, n[0], sw - 30, 78, '900', D) + 'px ' + D; ctx.fillText(n[0], x + sw / 2, sy + 96);
      ctx.font = '800 28px ' + D; ctx.fillText(String(n[1]).toUpperCase(), x + sw / 2, sy + 140); ctx.textAlign = 'left';
    });
    // last three badges
    var by = sy + 226;
    ctx.fillStyle = '#fff'; ctx.font = 'italic 900 44px ' + D; ctx.fillText('Latest badges', 72, by);
    ctx.font = '800 32px ' + D; ctx.fillStyle = '#00FF6E'; ctx.textAlign = 'right'; ctx.fillText((d.badgeTotal || 0) + ' won in total', W - 72, by); ctx.textAlign = 'left';
    var bs = (d.badges || []).slice(0, 3), bw = (W - 144 - 40) / 3;
    if (!bs.length) { ctx.fillStyle = 'rgba(255,255,255,.14)'; roundRect(ctx, 72, by + 26, W - 144, 170, 28); ctx.fill(); ctx.fillStyle = '#E4DAFF'; ctx.font = '700 34px ' + B; ctx.textAlign = 'center'; ctx.fillText('First badge loading… top the board to win one.', W / 2, by + 122); ctx.textAlign = 'left'; }
    for (var i = 0; i < bs.length; i++) {
      var x = 72 + i * (bw + 20), b = bs[i];
      ctx.fillStyle = 'rgba(255,255,255,.14)'; roundRect(ctx, x, by + 26, bw, 200, 28); ctx.fill();
      if (b.svg) { var bi = await svgImg(b.svg, 100, 120); if (bi) ctx.drawImage(bi, x + bw / 2 - 50, by + 40, 100, 120); }
      else { ctx.fillStyle = b.color || '#9161FF'; ctx.beginPath(); ctx.arc(x + bw / 2, by + 98, 52, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '900 40px ' + D; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.text || '★').slice(0, 3), x + bw / 2, by + 100); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; }
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 ' + fit(ctx, b.label || '', bw - 24, 28, '800', D) + 'px ' + D; ctx.fillText(b.label || '', x + bw / 2, by + 198); ctx.textAlign = 'left';
    }
    footer(ctx, W, H, d, 'Think you fit beat me?');
    return cv;
  }

  // Results: the pool, the podium with each winner's character and prize (or the two VS sides). No QR.
  async function renderResults(d) {
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var ctx = cv.getContext('2d');
    await fonts(); bg(ctx, W, H); await header(ctx, W, 'FINAL RESULTS');
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowOffsetY = 5;
    ctx.font = '900 92px ' + D; var lines = wrap(ctx, d.title || 'Tap Am', W - 144).slice(0, 2), y = 262;
    lines.forEach(function (l) { ctx.fillText(l, 72, y); y += 90; });
    ctx.shadowColor = 'transparent';
    ctx.font = '700 34px ' + B; ctx.fillStyle = '#E4DAFF'; ctx.fillText(d.line || '', 72, y - 18);
    var top = y + 30;
    if (d.vs && d.vs.length === 2) {
      var vw = (W - 144 - 30) / 2;
      d.vs.forEach(function (v, i) {
        var x = 72 + i * (vw + 30), c = i ? '#2E8BFF' : '#FF8A2A', h = 520;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; roundRect(ctx, x, top + 12, vw, h, 34); ctx.fill();
        ctx.fillStyle = c; roundRect(ctx, x, top, vw, h, 34); ctx.fill();
        if (v.win) { ctx.lineWidth = 10; ctx.strokeStyle = '#00FF6E'; roundRect(ctx, x + 5, top + 5, vw - 10, h - 10, 30); ctx.stroke(); pill(ctx, x + 30, top + 30, 'WINNER', '#00FF6E', '#150B33'); }
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 ' + fit(ctx, v.name, vw - 50, 88, '900', D) + 'px ' + D; ctx.fillText(v.name, x + vw / 2, top + 220);
        ctx.font = '900 110px ' + D; ctx.fillText(v.taps, x + vw / 2, top + 360); ctx.font = '800 32px ' + D; ctx.fillText('TAPS · ' + v.players, x + vw / 2, top + 410); ctx.textAlign = 'left';
      });
      ctx.fillStyle = '#150B33'; ctx.beginPath(); ctx.arc(W / 2, top + 260, 56, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFD23F'; ctx.font = 'italic 900 50px ' + D; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('VS', W / 2, top + 262); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    } else {
      // podium: 2nd, 1st, 3rd
      var pw = (W - 144 - 40) / 3, order = [1, 0, 2], hs = [610, 520, 450], colors = ['#FFD23F', '#2E8BFF', '#FF8A2A'], base = top + 700;
      for (var k = 0; k < 3; k++) {
        var idx = order[k], r = (d.podium || [])[idx]; if (!r) continue;
        var x = 72 + k * (pw + 20), h = hs[idx], yy = base - h;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; roundRect(ctx, x, yy + 12, pw, h, 30); ctx.fill();
        ctx.fillStyle = colors[idx]; roundRect(ctx, x, yy, pw, h, 30); ctx.fill();
        var a = await svgImg(r.avatar, 170, 170);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x + pw / 2, yy + 20, 92, 0, Math.PI * 2); ctx.fill();
        if (a) ctx.drawImage(a, x + pw / 2 - 85, yy - 70, 170, 170);
        ctx.fillStyle = '#150B33'; ctx.beginPath(); ctx.arc(x + pw / 2, yy + 120, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '900 36px ' + D; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(idx + 1), x + pw / 2, yy + 122); ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = idx === 0 ? '#150B33' : '#fff'; ctx.font = '900 ' + fit(ctx, r.n, pw - 30, 46, '900', D) + 'px ' + D; ctx.fillText(r.n, x + pw / 2, yy + 210);
        ctx.font = '800 32px ' + D; ctx.fillText(r.s + ' TAPS', x + pw / 2, yy + 256);
        if (r.prize) { ctx.fillStyle = '#150B33'; roundRect(ctx, x + 24, yy + 284, pw - 48, 66, 18); ctx.fill(); ctx.fillStyle = '#00FF6E'; ctx.font = '900 ' + fit(ctx, r.prize, pw - 80, 44, '900', D) + 'px ' + D; ctx.fillText(r.prize, x + pw / 2, yy + 332); }
        ctx.textAlign = 'left';
      }
    }
    footer(ctx, W, H, d, d.ask || 'Your turn: tap pass them');
    return cv;
  }

  async function render(d) {
    if (d.kind === 'profile') return renderProfile(d);
    if (d.kind === 'results') return renderResults(d);
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    try { await Promise.all([document.fonts.load('italic 900 80px "Barlow Condensed"'), document.fonts.load('900 80px "Barlow Condensed"'), document.fonts.load('800 40px "Barlow Condensed"'), document.fonts.load('700 40px Barlow')]); } catch (e) {}
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#7B45FF'); g.addColorStop(0.55, '#4B1FD8'); g.addColorStop(1, '#2A0F8F');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // top: logo, mark and the tagline
    var logo = await img('/assets/brand/logo-white.svg'), mark = await img('/assets/brand/mark-white.svg');
    if (logo) ctx.drawImage(logo, 90, 84, 390, 80);
    if (mark) ctx.drawImage(mark, W - 180, 66, 90, 103);
    ctx.fillStyle = '#fff'; ctx.font = 'italic 900 50px ' + D; ctx.textBaseline = 'alphabetic';
    ctx.fillText('tap ammm make you chop moneyyyy', 90, 238);
    // card
    var cardY = 290, cardH = 580;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; roundRect(ctx, 90, cardY + 14, W - 180, cardH, 36); ctx.fill();
    ctx.fillStyle = d.color || '#FF8A2A'; roundRect(ctx, 90, cardY, W - 180, cardH, 36); ctx.fill();
    ctx.save(); roundRect(ctx, 90, cardY, W - 180, cardH, 36); ctx.clip(); ctx.fillStyle = texture(ctx); ctx.fillRect(90, cardY, W - 180, cardH); ctx.restore();
    ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; roundRect(ctx, 94, cardY + 4, W - 188, cardH - 8, 32); ctx.stroke();
    ctx.fillStyle = '#150B33'; roundRect(ctx, 140, cardY + 50, 300, 64, 14); ctx.fill();
    ctx.fillStyle = '#00FF6E'; ctx.font = '800 36px ' + D; ctx.textBaseline = 'middle'; ctx.fillText(d.kind === 'invite' ? 'JOIN ME' : d.kind === 'profile' ? 'MY TAP AM' : 'TAP WITH ME', 168, cardY + 83);
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff'; ctx.font = '900 92px ' + D;
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowOffsetY = 5; ctx.shadowBlur = 0;
    var lines = wrap(ctx, d.title || 'Tap Am', W - 300), y = cardY + 220;
    lines.forEach(function (l) { ctx.fillText(l, 140, y); y += 92; });
    ctx.font = '700 44px ' + B; ctx.shadowOffsetY = 3;
    if (d.line) { wrap(ctx, d.line, W - 300).slice(0, d.stats ? 1 : 2).forEach(function (l) { ctx.fillText(l, 140, y + 10); y += 56; }); }
    if (d.stats && d.stats.length) {   // profile card: up to 6 small facts in two columns
      ctx.font = '700 36px ' + B; ctx.shadowOffsetY = 2;
      d.stats.slice(0, 6).forEach(function (t, i) { var cx = 140 + (i % 2) * 400, cy = y + 34 + Math.floor(i / 2) * 52; ctx.fillStyle = 'rgba(0,0,0,.25)'; roundRect(ctx, cx - 12, cy - 36, 384, 48, 10); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(String(t).slice(0, 22), cx, cy); });
    }
    ctx.shadowColor = 'transparent';
    if (d.code) { ctx.fillStyle = '#150B33'; roundRect(ctx, 140, cardY + cardH - 116, 520, 76, 14); ctx.fill(); ctx.fillStyle = '#FFD23F'; ctx.font = '900 44px ' + D; ctx.fillText('CODE  ' + d.code, 172, cardY + cardH - 64); }
    // QR + link
    drawQR(ctx, d.url, 90, 920, 310);
    ctx.fillStyle = '#fff'; ctx.font = 'italic 900 66px ' + D; ctx.fillText('Scan am.', 450, 1010);
    ctx.font = '700 36px ' + B; ctx.fillStyle = '#E6DCFF'; ctx.fillText('Or open:', 452, 1072);
    ctx.font = '900 48px ' + D; ctx.fillStyle = '#00FF6E'; ctx.fillText(d.display || 'www.tapammm.live', 450, 1130);
    // bottom: only the credit, centred
    ctx.font = '700 32px ' + B; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('Powered by Ferrn Agency', W / 2, H - 52); ctx.textAlign = 'left';
    return cv;
  }
  function open(d) {
    if (!d || !d.url) return;
    var box = TA.dialog('<h3>Share</h3><div data-card style="border-radius:var(--r-sm);overflow:hidden;background:#eee;aspect-ratio:1080/1350;display:grid;place-items:center"><span class="ring"></span></div><div class="actions"><button type="button" class="btn btn--green" data-share>Share</button><button type="button" class="btn btn--soft" data-save>Save image</button><button type="button" class="btn btn--soft" data-copy="' + String(d.url).replace(/"/g, '&quot;') + '"><span>Copy link</span></button></div>', function (e, close) { if (!e) return; if (e.target.closest('[data-share]')) doShare(); if (e.target.closest('[data-save]')) save(); });
    box.querySelector('.dlg-in').style.maxWidth = '380px';
    var canvas = null, blob = null;
    render(d).then(function (cv) {
      canvas = cv; var im = new Image(); im.alt = 'Share card'; im.style.width = '100%'; im.style.display = 'block';
      cv.toBlob(function (b) { blob = b; im.src = URL.createObjectURL(b); var slot = box.querySelector('[data-card]'); slot.textContent = ''; slot.appendChild(im); }, 'image/png');
    });
    function file() { return blob ? new File([blob], 'tap-am.png', { type: 'image/png' }) : null; }
    function doShare() {
      var f = file(), text = (d.title || 'Tap Am') + (d.line ? ' — ' + d.line : '') + (d.code ? ' · Code ' + d.code : '');
      if (f && navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'Tap Am', text: text + ' ' + d.url }).catch(function () {});
      else if (navigator.share) navigator.share({ title: 'Tap Am', text: text, url: d.url }).catch(function () {});
      else save();
    }
    function save() { if (!blob) return; var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tap-am-' + (d.code || 'invite').toLowerCase() + '.png'; document.body.appendChild(a); a.click(); a.remove(); }
  }
  window.TAShare = { open: open, render: render, qrMatrix: qrMatrix };
})();
