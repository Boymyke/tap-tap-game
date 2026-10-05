"use client";

import { useEffect, useMemo, useState } from "react";

const stories = [
  { title: "You got kicked out", body: "Your host says you need to leave tonight. You have ₦1,500 and a damaged phone.", choices: ["Find street work", "Call a friend", "Look for a cheap bedspace"] },
  { title: "A small chance", body: "A bus conductor needs help loading passengers at Oshodi. It is not glamorous, but it pays today.", choices: ["Take the work", "Keep looking", "Ask for a better cut"] },
  { title: "Somebody noticed", body: "A shop owner saw how hard you worked and asks if you can help with deliveries for the week.", choices: ["Accept", "Negotiate", "Decline"] },
  { title: "First business idea", body: "You have saved a little money. A friend suggests buying drinks wholesale and reselling at the park.", choices: ["Start small", "Save the money", "Find a partner"] },
];

const shopItems = [
  { name: "Clean streetwear", price: 600, icon: "👕" },
  { name: "Power bank", price: 1200, icon: "🔋" },
  { name: "Bedspace — 1 night", price: 2500, icon: "🛏️" },
  { name: "Used smartphone", price: 8000, icon: "📱" },
];

export default function PlayPage() {
  const [nickname, setNickname] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [cash, setCash] = useState(1500);
  const [taps, setTaps] = useState(0);
  const [zone, setZone] = useState(70);
  const [story, setStory] = useState(0);
  const [phoneTier, setPhoneTier] = useState(1);
  const [tab, setTab] = useState<"story"|"work"|"shop"|"city">("story");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const multiplier = useMemo(() => zone <= 30 ? 4 : zone <= 50 ? 2.5 : zone <= 70 ? 1.5 : 1, [zone]);

  useEffect(() => { const saved = localStorage.getItem("lagos_player_id"); if (saved) setPlayerId(saved); }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 2200); return () => clearTimeout(timer); }, [toast]);

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

  function buy(name: string, price: number) {
    if (cash < price) return setToast("You never reach that level yet 😭");
    setCash(v => v - price); setToast(`${name} added to your life.`);
  }

  function upgradePhone() {
    const cost = phoneTier * 5000;
    if (cash < cost) return setToast(`You need ₦${cost.toLocaleString()} for the next phone.`);
    setCash(v => v - cost); setPhoneTier(v => v + 1); setToast("Phone upgraded. Bigger opportunities unlocked.");
  }

  if (!playerId) return <main className="authShell"><div className="authCard"><div className="eyebrow">Your story starts here</div><h1>Enter Lagos</h1><p>You can begin with almost nothing and work your way up. Your choices will change what happens next.</p><div className="field"><label>WHAT SHOULD PEOPLE CALL YOU?</label><input maxLength={24} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="e.g. Big Mike" /></div><button className="darkbtn" onClick={createLife}>{busy ? "Creating life..." : "Create my life"}</button></div></main>;

  const current = stories[story % stories.length];
  return <main className="authShell"><div style={{maxWidth:520,margin:"0 auto"}}>
    <div className="adminTop"><a href="/" className="brand"><span>LAGOS</span> MODE</a><b>₦{cash.toLocaleString()}</b></div>
    {toast && <div className="notice" style={{marginBottom:12}}>{toast}</div>}
    <div className="phone" style={{width:"100%",maxWidth:440}}><div className="screen">
      <div className="status"><span>9:41 • TIER {phoneTier}</span><span>⚡ 100%</span></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,margin:"14px 0"}}>
        {([['story','💬','Life'],['work','👆','Work'],['shop','🛍️','Shop'],['city','🏙️','City']] as const).map(([key,icon,label])=><button key={key} onClick={()=>setTab(key)} style={{border:"2px solid #111",background:tab===key?"#ffd60a":"#fff",padding:"9px 4px",fontWeight:900,cursor:"pointer"}}>{icon}<br/><small>{label}</small></button>)}
      </div>

      {tab === "story" && <div className="gamecard"><small>YOUR STORY</small><h2 style={{margin:"5px 0 6px"}}>{current.title}</h2><p>{current.body}</p>{current.choices.map(c=><button key={c} className="linkbtn" style={{display:"block",width:"100%",marginTop:8}} onClick={()=>{setStory(v=>v+1);setToast(`You chose: ${c}`)}}>{c}</button>)}</div>}

      {tab === "work" && <div className="gamecard"><small>WORK MODE • OSHODI PARK</small><div className="money">₦{cash.toLocaleString()}</div><div style={{fontWeight:800}}>Street Hustler • {taps.toLocaleString()} taps</div><p>Fill the bus, earn today's money and keep moving. Make your tap area smaller for a higher reward.</p>
        <button className="tapzone" style={{width:`${zone}%`,marginLeft:"auto",marginRight:"auto"}} onPointerDown={registerTap}>TAP 👆<br/><small>x{multiplier} reward</small></button>
        <div className="field"><label>TAP AREA — SMALLER = HARDER = MORE</label><input type="range" min="22" max="100" value={zone} onChange={e=>setZone(Number(e.target.value))}/></div>
      </div>}

      {tab === "shop" && <div className="gamecard"><small>BALOGUN MINI MARKET</small><h2 style={{margin:"6px 0"}}>Buy what your life needs</h2>{shopItems.map(item=><div key={item.name} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"11px 0",borderTop:"1px solid #bbb"}}><div><b>{item.icon} {item.name}</b><div>₦{item.price.toLocaleString()}</div></div><button className="primary" onClick={()=>buy(item.name,item.price)}>Buy</button></div>)}<div style={{marginTop:14,paddingTop:12,borderTop:"2px solid #111"}}><b>📱 Your Phone — Tier {phoneTier}</b><p>Better phones will unlock stronger batteries, apps and tap systems.</p><button className="darkbtn" onClick={upgradePhone}>Upgrade • ₦{(phoneTier*5000).toLocaleString()}</button></div></div>}

      {tab === "city" && <><div className="billboard">YOUR FACE<br/>COULD BE HERE</div><div className="gamecard"><small>LEKKI BILLBOARD AUCTION</small><h2 style={{margin:"5px 0"}}>Current bid ₦42,000</h2><p>Highest bidder owns this billboard for 24 hours and can promote their profile, crew or business.</p><button className="darkbtn" onClick={()=>setToast("Billboard bidding is coming in the next build.")}>View auction</button></div><div className="minirow"><div className="mini">🚌 Park<br/>Open</div><div className="mini">🏪 Market<br/>Open</div><div className="mini">🏠 Housing<br/>Locked</div></div></>}
    </div></div>
  </div></main>;
}
