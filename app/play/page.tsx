"use client";

import { useMemo, useState } from "react";

export default function PlayPage() {
  const [taps, setTaps] = useState(0);
  const [pending, setPending] = useState(0);

  const rank = useMemo(() => {
    if (taps >= 1000) return "Tapper";
    return "Rookie";
  }, [taps]);

  function tap() {
    setTaps((value) => value + 1);
    setPending((value) => value + 1);
  }

  function syncDemo() {
    setPending(0);
  }

  return (
    <section className="game-shell">
      <div className="game-top">
        <div className="stat"><small>Demo Pool</small><strong>NAK AM Open Pool</strong></div>
        <div className="stat"><small>Verified Taps</small><strong>{taps - pending}</strong></div>
        <div className="stat"><small>Pending</small><strong>{pending}</strong></div>
        <div className="stat"><small>Rank</small><strong>{rank}</strong></div>
      </div>

      <button className="tap-button" onClick={tap}>NAK AM<br/><span style={{fontSize:18}}>{taps.toLocaleString()} taps</span></button>

      <div className="actions" style={{justifyContent:"center"}}>
        <button className="button" onClick={syncDemo}>Sync Demo Taps</button>
      </div>

      <div className="leaderboard">
        <h2>Live Leaderboard</h2>
        <div className="leaderboard-row"><span>1. You</span><strong>{taps.toLocaleString()}</strong></div>
        <div className="leaderboard-row"><span>2. Demo Player</span><strong>0</strong></div>
        <div className="leaderboard-row"><span>3. Demo Player</span><strong>0</strong></div>
      </div>

      <div className="ad-slot" style={{marginTop:28}}>Game Page Advertisement<br/>300 × 250 placement</div>
    </section>
  );
}
