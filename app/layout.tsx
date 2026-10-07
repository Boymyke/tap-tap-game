import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NAK AM",
  description: "NAK AM — tap, compete and climb the leaderboard. Powered by Ferrn Agency.",
};

const links = [
  ["Home", "/"],
  ["Play", "/play"],
  ["How to Play", "/how-to-play"],
  ["Policy", "/policy"],
  ["Suggestions", "/suggest"],
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">NAK AM</Link>
          <nav>
            {links.map(([label, href]) => (
              <Link key={href} href={href}>{label}</Link>
            ))}
          </nav>
          <Link className="button small" href="/play">Play Now</Link>
        </header>
        <main>{children}</main>
        <footer>
          <strong>NAK AM</strong>
          <span>Powered by Ferrn Agency</span>
        </footer>
      </body>
    </html>
  );
}
