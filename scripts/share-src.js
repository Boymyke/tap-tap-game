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
  async function render(d) {
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
    ctx.fillStyle = '#00FF6E'; ctx.font = '800 36px ' + D; ctx.textBaseline = 'middle'; ctx.fillText(d.kind === 'invite' ? 'JOIN ME' : 'TAP WITH ME', 168, cardY + 83);
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff'; ctx.font = '900 92px ' + D;
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowOffsetY = 5; ctx.shadowBlur = 0;
    var lines = wrap(ctx, d.title || 'Tap Am', W - 300), y = cardY + 220;
    lines.forEach(function (l) { ctx.fillText(l, 140, y); y += 92; });
    ctx.font = '700 44px ' + B; ctx.shadowOffsetY = 3;
    if (d.line) { wrap(ctx, d.line, W - 300).slice(0, 2).forEach(function (l) { ctx.fillText(l, 140, y + 10); y += 56; }); }
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
      canvas = cv; var im = new Image(); im.alt = 'Share card with QR code'; im.style.width = '100%'; im.style.display = 'block';
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
