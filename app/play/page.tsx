"use client";

import { useEffect, useMemo, useState } from "react";

const stories = [
  { title: "You got kicked out", body: "Your host says you need to leave tonight. You have ₦1,500 and a damaged phone.", choices: ["Find street work", "Call a friend", "Look for a cheap bedspace"] },
  { title: "A small chance", body: "A bus conductor needs help loading passengers at Oshodi. It is not glamorous, but it pays today.", choices: ["Take the work", "Keep looking", "Ask for a better cut"] },
  { title: "Somebody noticed", body: "A shop owner saw how hard you worked and asks if you can help with deliveries for the week.", choices: ["Accept", "Negotiate", "Decline"] },
];

export default function PlayPage() {
  const [nickname, setNickname] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [cash, setCash] = useState(1500);
  const [taps, setTaps] = useState(0);
  const [zone, setZone] = useState(70);
  const [story, setStory] = useState(0);
  const [busy, setBusy] = useState(false);
  const multiplier = useMemo(() => zone <= 30 ? 4 : zone <= 50 ? 2.5 : zone <= 70 ? 1.5 : 1, [zone]);

  useEffect(() => { const saved = localStorage.getItem("lagos_player_id"); if (saved) setPlayerId(saved); }, []);

  async function createLife() {
    if (!nickname.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/players", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname }) });
    const data = await res.json();
    setBusy(false);
    if (res.ok) { setPlayerId(data.publicId); setCash(data.cash); localStorage.setItem("lagos_player_id", data.publicId); }
  }

  async function registerTap() {
    if (!playerId) return;
    const earned = Math.max(1, Math.floor(multiplier));
    setTaps(v => v + 1); setCash(v => v + earned);
    if ((taps + 1) % 20 === 0) {
      await fetch("/api/tap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicId: playerId, tapCount: 20, tapZone: zone, durationMs: 3500 }) });
    }
  }

  if (!playerId) return <main className="authShell"><div className="authCard"><div className="eyebrow">Your story starts here</div><h1>Enter Lagos</h1><p>You can begin with almost nothing and work your way up. Your choices will change what happens next.</p><div className="field"><label>WHAT SHOULD PEOPLE CALL YOU?</label><input maxLength={24} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="e.g. Big Mike" /></div><button className="darkbtn" onClick={createLife}>{busy ? "Creating life..." : "Create my life"}</button></div></main>;

  const current = stories[story % stories.length];
  return <main className="authShell"><div style={{maxWidth:520,margin:"0 auto"}}>
    <div className="adminTop"><a href="/" className="brand"><span>LAGOS</span> MODE</a><b>₦{cash.toLocaleString()}</b></div>
    <div className="phone" style={{width:"100%",maxWidth:440}}><div className="screen">
      <div className="status"><span>YOUR PHONE</span><span>⚡ 100%</span></div>
      <div className="gamecard"><small>STORY</small><h2 style={{margin:"5px 0 6px"}}>{current.title}</h2><p>{current.body}</p>{current.choices.map(c=><button key={c} className="linkbtn" style={{display:"block",width:"100%",marginTop:8}} onClick={()=>setStory(v=>v+1)}>{c}</button>)}</div>
      <div className="gamecard"><small>WORK MODE</small><div className="money">₦{cash.toLocaleString()}</div><div style={{fontWeight:800}}>Street Hustler • {taps.toLocaleString()} taps</div>
        <button className="tapzone" style={{width:`${zone}%`,marginLeft:"auto",marginRight:"auto"}} onPointerDown={registerTap}>TAP 👆<br/><small>x{multiplier} reward</small></button>
        <div className="field"><label>TAP AREA — SMALLER IS HARDER, BUT PAYS MORE</label><input type="range" min="22" max="100" value={zone} onChange={e=>setZone(Number(e.target.value))}/></div>
      </div>
      <div className="minirow"><div className="mini">📱 Phone<br/>Tier 1</div><div className="mini">💼 Work<br/>Street</div><div className="mini">🏪 Market<br/>Soon</div></div>
    </div></div>
  </div></main>;
}
