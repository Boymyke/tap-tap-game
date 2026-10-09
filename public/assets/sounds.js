/* Tap Am tap sounds — synthesised with Web Audio, so there are no sound files to download.
   TASound.play(id, combo, force)   TASound.fanfare()   TASound.muted = true|false */
(function () {
  'use strict';
  var ac = null, noiseBuf = null, master = null;
  function ctx() {
    if (!ac) {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ac = new C(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function noise() {
    if (noiseBuf) return noiseBuf;
    var len = ac.sampleRate * 0.25; noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function tone(type, f0, f1, dur, vol, at) {
    var o = ac.createOscillator(), g = ac.createGain(), t = at || ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(freq, q, dur, vol) {
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime;
    s.buffer = noise(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  var SOUNDS = {
    pop: function (c) { tone('sine', 520 + c * 12, 220, 0.07, 0.35); },
    drum: function (c) { var f = 170 + (c % 8) * 18; tone('sine', f * 1.8, f, 0.16, 0.5); hiss(900, 1, 0.04, 0.15); },
    coin: function (c) { var t = ac.currentTime; tone('square', 988, 0, 0.06, 0.12, t); tone('square', 1319 + (c % 4) * 40, 0, 0.12, 0.12, t + 0.05); },
    bubble: function (c) { tone('sine', 300 + c * 6, 900 + c * 10, 0.09, 0.3); },
    clap: function () { hiss(1500, 0.8, 0.09, 0.6); hiss(2500, 1.2, 0.05, 0.3); },
    laser: function (c) { tone('sawtooth', 1800 + c * 10, 180, 0.12, 0.12); },
    kalimba: function (c) { var notes = [523, 587, 659, 784, 880, 1047], f = notes[c % notes.length]; tone('sine', f, 0, 0.35, 0.3); tone('sine', f * 3.01, 0, 0.08, 0.06); },
    bell: function (c) { var f = 220 + (c % 5) * 30; tone('sine', f, 0, 0.9, 0.25); tone('sine', f * 2.76, 0, 0.5, 0.1); tone('sine', f * 5.4, 0, 0.25, 0.05); }
  };
  var last = 0;
  var api = window.TASound = {
    muted: false,
    play: function (id, combo, force) {
      if (api.muted && !force) return;
      var now = performance.now(); if (!force && now - last < 28) return; last = now;   // don't stack 100 sounds a second
      if (!ctx()) return;
      try { (SOUNDS[id] || SOUNDS.pop)(Math.max(0, combo | 0)); } catch (e) {}
    },
    fanfare: function () {
      if (api.muted || !ctx()) return;
      var t = ac.currentTime; [523, 659, 784, 1047].forEach(function (f, i) { tone('triangle', f, 0, 0.22, 0.25, t + i * 0.1); });
    },
    thud: function () { if (api.muted || !ctx()) return; tone('sine', 140, 60, 0.15, 0.4); },
    combo: function () { if (api.muted || !ctx()) return; tone('sawtooth', 660, 990, 0.12, 0.12); },
    unlock: function () { ctx(); }
  };
})();
