import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="eyebrow">Powered by Ferrn Agency</div>
          <h1>NAK AM</h1>
          <p>A competitive tapping game built around timed pools, live rankings, badges, boosters and account tiers. This first release focuses on making the game work correctly before the custom visual design is added.</p>
          <div className="actions">
            <Link className="button" href="/play">Start Tapping</Link>
            <Link className="button secondary" href="/how-to-play">How to Play</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>How it works</h2>
          <p className="section-intro">Join an available pool, tap as much as you can during the live period, and climb the leaderboard before the pool closes.</p>
          <div className="grid">
            <div className="card"><h3>1. Join a pool</h3><p>Choose an available competition pool and enter before it starts.</p></div>
            <div className="card"><h3>2. Tap</h3><p>Tap during the live period. The server will validate and count accepted taps.</p></div>
            <div className="card"><h3>3. Rank</h3><p>See your live position and compete for the top of the leaderboard.</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Free & Odogwo</h2>
          <div className="grid">
            <div className="card"><h3>Free</h3><p>Standard access to public pools, rankings, badges and normal game features.</p></div>
            <div className="card"><h3>Odogwo</h3><p>Premium account tier for special pools, additional perks and expanded booster access.</p></div>
            <div className="card"><h3>Badges</h3><p>Earn rank badges as your verified lifetime tap count grows.</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Advertise on NAK AM</h2>
          <p className="section-intro">Reserved advertising placements are included from the start so sponsored banners and campaigns can be added without redesigning the product.</p>
          <div className="grid">
            <div className="ad-slot">Top Banner Ad Slot<br/>970 × 250</div>
            <div className="ad-slot">Game Page Ad Slot<br/>300 × 250</div>
            <div className="ad-slot">Sponsored Pool / Partner Slot</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Help us improve NAK AM</h2>
          <p className="section-intro">Players can submit ideas and feature suggestions as the game evolves.</p>
          <div className="actions"><Link className="button" href="/suggest">Suggest a Feature</Link></div>
        </div>
      </section>
    </>
  );
}
