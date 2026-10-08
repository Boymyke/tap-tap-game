/* Tap Am live voice (like X Spaces) on Cloudflare Realtime.
   Listen: anyone in the pool. Talk: Nepo + Para Para Boy or higher + top N in that pool.
   One voice room at a time — joining a new pool's voice leaves the old one. */
(function () {
  'use strict';
  function boot() {
    var TA = window.TA, $ = function (id) { return document.getElementById(id); };
    var mic = $('mic'); if (!mic || !window.RTCPeerConnection) { if (mic) mic.hidden = true; return; }
    var status = $('v-status'), list = $('v-list'), bListen = $('v-listen'), bTalk = $('v-talk'), bLeave = $('v-leave');
    var pc = null, sessionId = null, poolId = null, pulled = {}, localStream = null, hb = 0, poll = 0, audios = {};
    var queue = Promise.resolve();
    function serial(fn) { queue = queue.then(fn).catch(function (e) { console.warn('voice', e); }); return queue; }

    mic.addEventListener('click', function () { var s = $('voice-sheet'); s.hidden = false; bListen.focus(); });

    function setStatus(t) { status.textContent = t; }
    function paint() {
      var on = !!sessionId;
      mic.setAttribute('aria-pressed', String(on));
      bListen.hidden = on; bLeave.hidden = !on;
    }
    function currentPool() { return window.TAGame ? window.TAGame.focus().id : null; }

    function api(path, body) { return TA.api('/api/voice/' + path, body); }

    function newPc() {
      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }], bundlePolicy: 'max-bundle' });
      pc.ontrack = function (e) {
        var id = e.transceiver && e.transceiver.mid || String(Math.random());
        var a = audios[id] || (audios[id] = new Audio()); a.autoplay = true; a.srcObject = new MediaStream([e.track]);
        a.play().catch(function () {});
      };
      pc.onconnectionstatechange = function () { if (pc && pc.connectionState === 'failed') { setStatus('Voice connection drop. Tap Listen to join again.'); leave(); } };
    }

    function join() {
      var pid = currentPool(); if (!pid) return;
      bListen.disabled = true; setStatus('Joining voice…');
      return serial(function () {
        return (sessionId ? leave(true) : Promise.resolve()).then(function () { return api('join', { pool: pid }); }).then(function (j) {
          bListen.disabled = false;
          if (!j._ok) { setStatus(j.error || 'Voice no work now.'); return; }
          sessionId = j.sessionId; poolId = pid; pulled = {}; newPc();
          // Listening needs no local offer: pulling tracks returns an offer we answer (renegotiate).
          bTalk.hidden = !j.canTalk;
          setStatus(j.canTalk ? 'You dey inside. Tap Talk to speak — you go mute if you drop from the top.' : (j.why || 'You dey listen.'));
          paint(); refreshSpeakers();
          clearInterval(poll); poll = setInterval(refreshSpeakers, 5000);
          clearInterval(hb); hb = setInterval(heartbeat, 15000);
        });
      });
    }

    function refreshSpeakers() {
      if (!sessionId) return;
      TA.api('/api/voice/speakers?pool=' + encodeURIComponent(poolId), undefined, 'GET').then(function (j) {
        if (!j._ok) return;
        list.textContent = '';
        (j.speakers || []).forEach(function (s) { var d = document.createElement('div'); d.innerHTML = '<i></i><span></span>'; d.lastChild.textContent = s.name; list.appendChild(d); });
        if (!(j.speakers || []).length) { var d = document.createElement('div'); d.textContent = 'Nobody dey talk right now.'; list.appendChild(d); }
        var fresh = (j.speakers || []).filter(function (s) { return s.sessionId !== sessionId && !pulled[s.sessionId + s.trackName]; });
        if (fresh.length) serial(function () { return pull(fresh); });
      });
    }

    function pull(remotes) {
      return api('pull', { sessionId: sessionId, remotes: remotes.map(function (r) { return { sessionId: r.sessionId, trackName: r.trackName }; }) }).then(function (j) {
        if (!j._ok) return;
        remotes.forEach(function (r) { pulled[r.sessionId + r.trackName] = true; });
        if (j.renegotiate && j.sdp) {
          return pc.setRemoteDescription({ type: 'offer', sdp: j.sdp }).then(function () { return pc.createAnswer(); }).then(function (a) { return pc.setLocalDescription(a); }).then(function () { return api('renegotiate', { sessionId: sessionId, sdp: pc.localDescription.sdp }); });
        }
      });
    }

    function talk() {
      if (!sessionId) return;
      bTalk.disabled = true;
      serial(function () {
        return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
          localStream = stream;
          var tr = pc.addTransceiver(stream.getAudioTracks()[0], { direction: 'sendonly' });
          return pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).then(function () {
            return api('publish', { sessionId: sessionId, sdp: pc.localDescription.sdp, mid: tr.mid });
          }).then(function (j) {
            bTalk.disabled = false;
            if (!j._ok) { stopMic(); setStatus(j.error || 'You no fit talk now.'); return; }
            bTalk.hidden = true; setStatus('Your mic dey on. Everybody for this pool fit hear you.');
            return pc.setRemoteDescription({ type: 'answer', sdp: j.sdp });
          });
        }).catch(function () { bTalk.disabled = false; setStatus('We no fit open your mic. Allow microphone for this site.'); });
      });
    }
    function stopMic() { if (localStream) { localStream.getTracks().forEach(function (t) { t.stop(); }); localStream = null; } }

    function heartbeat() {
      if (!sessionId) return;
      api('heartbeat', { sessionId: sessionId }).then(function (j) {
        if (j._ok && j.mute) { stopMic(); setStatus(j.mute); TA.toast('Mic off: ' + j.mute); }
        if (!j._ok && j._status === 409) leave();
      });
    }

    function leave(silent) {
      clearInterval(poll); clearInterval(hb); stopMic();
      Object.keys(audios).forEach(function (k) { audios[k].srcObject = null; }); audios = {};
      if (pc) { try { pc.close(); } catch (e) {} pc = null; }
      var had = sessionId; sessionId = null; list.textContent = ''; bTalk.hidden = true; paint();
      if (!silent) setStatus('You don leave voice.');
      return had ? api('leave', { sessionId: had }) : Promise.resolve();
    }

    bListen.addEventListener('click', join);
    bTalk.addEventListener('click', talk);
    bLeave.addEventListener('click', function () { serial(function () { return leave(); }); });
    window.addEventListener('pagehide', function () { if (sessionId) { try { fetch('/api/voice/leave', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: sessionId }) }); } catch (e) {} } });
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
