import Link from "next/link";

const features = [
  ["01", "Live a different Lagos life", "Every player gets a different starting point, choices, jobs, setbacks and opportunities."],
  ["02", "Tap to work your way up", "Street hustle, 9–5, freelancing and business all feed into one simple tap-powered progression system."],
  ["03", "Own, sell and advertise", "Upgrade phones, buy virtual goods, open businesses and compete for billboard space across the city."],
];

const rules = [
  ["01", "One life, many outcomes", "Your choices change your story. There is no single correct path and no guaranteed rich ending."],
  ["02", "Tap fairly", "Bots, auto-clickers, scripted taps and attempts to manipulate rewards can result in suspension."],
  ["03", "Game cash is not real cash", "Life Cash is an in-game currency unless a specific feature is explicitly marked as a real-money transaction."],
  ["04", "Respect other players", "Harassment, scams, impersonation and harmful uploads are not allowed. Player content can be reported and moderated."],
  ["05", "Real-money purchases are clearly marked", "Any Paystack-powered purchase will show the actual NGN amount and confirmation before payment."],
  ["06", "18+ for paid features", "Paid or regulated competition features remain disabled until the required compliance and age controls are in place."],
];

export default function Home() {
  return (
    <main className="page">
      <nav className="wrap nav">
        <Link href="/" className="brand"><span>LAGOS</span> MODE</Link>
        <div className="navlinks">
          <a href="#how">How it works</a>
          <a href="#rules">Rules</a>
          <Link href="/play" className="primary">Start your life</Link>
        </div>
      </nav>

      <section className="wrap hero">
        <div>
          <div className="eyebrow">Shine your eye • build your story</div>
          <h1>Welcome<br/>to Lagos</h1>
          <p>Start from the street, a family house or a comfortable home. Tap to work, take risks, build businesses, upgrade your phone and create a life nobody else has.</p>
          <div className="actions">
            <Link href="/play" className="darkbtn">Start playing</Link>
            <a href="#rules" className="linkbtn">Read the rules</a>
          </div>
        </div>

        <div className="phone" aria-label="Game preview">
          <div className="screen">
            <div className="status"><span>9:41</span><span>LAGOS MODE • 87%</span></div>
            <div className="billboard">KEEP<br/>LAGOS MOVING</div>
            <div className="road"><div className="danfo" /></div>
            <div className="gamecard">
              <small>YOUR LIFE CASH</small>
              <div className="money">₦1,500</div>
              <div style={{fontWeight:800,marginTop:4}}>Street Hustler • Day 1</div>
              <div className="tapzone">TAP TO HUSTLE 👆</div>
              <div className="minirow">
                <div className="mini">⚡ 100<br/>Energy</div>
                <div className="mini">📱 Tier 1<br/>Phone</div>
                <div className="mini">🏠 Street<br/>Housing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="section white">
        <div className="wrap">
          <div className="eyebrow">A simple game with a deep life behind it</div>
          <h2>Start anywhere.<br/>Become anything.</h2>
          <div className="grid3">
            {features.map(([n,t,d]) => <article className="card" key={n}><div className="ruleNo">{n}</div><h3>{t}</h3><p>{d}</p></article>)}
          </div>
        </div>
      </section>

      <section id="rules" className="section">
        <div className="wrap">
          <div className="eyebrow">Before you enter</div>
          <h2>Rules of Lagos Mode</h2>
          <div className="rules">
            {rules.map(([n,t,d]) => <div className="rule" key={n}><strong>{n}</strong><div><b>{t}</b><p>{d}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="adminstrip">
        <div className="wrap">
          <div><b>Game administration</b><div style={{opacity:.72,marginTop:6}}>Restricted access for authorised administrators only.</div></div>
          <Link href="/admin/login" className="primary">Admin login</Link>
        </div>
      </section>

      <footer className="footer"><div className="wrap"><b>LAGOS MODE</b><span>Shine your eye. Your choices become your story.</span></div></footer>
    </main>
  );
}
