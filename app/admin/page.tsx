import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminCookie, verifyAdminToken } from "@/lib/security";
import { appSettings, auditLogs, players, tapBatches } from "@/lib/schema";
import SettingsForm from "./settings-form";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = await verifyAdminToken(cookieStore.get(adminCookie.name)?.value);
  if (!session) redirect("/admin/login");

  const [[p], [t], settings, logs] = await Promise.all([
    db.select({ value: count() }).from(players),
    db.select({ value: count() }).from(tapBatches),
    db.select().from(appSettings),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8),
  ]);

  const publicKey = settings.find(s => s.key === "paystack_public_key")?.publicValue || "";
  const secretConfigured = Boolean(settings.find(s => s.key === "paystack_secret_key")?.encryptedValue);

  return <main className="adminShell"><div style={{maxWidth:1100,margin:"0 auto"}}>
    <div className="adminTop"><div><div className="eyebrow">Lagos Mode</div><h1 style={{margin:"4px 0"}}>Admin Control Room</h1><div>{session.email}</div></div><form action="/api/admin/logout" method="post"><button className="linkbtn">Sign out</button></form></div>
    <div className="stats"><div className="stat"><span>Players</span><b>{p.value}</b></div><div className="stat"><span>Tap batches</span><b>{t.value}</b></div><div className="stat"><span>Paystack</span><b>{secretConfigured ? "ON" : "OFF"}</b></div><div className="stat"><span>Admin session</span><b>SECURE</b></div></div>
    <div className="adminGrid">
      <section className="panel"><h2>Payment settings</h2><p>The Paystack secret key is encrypted before it is stored. It is never returned to the browser after saving.</p><SettingsForm publicKey={publicKey} secretConfigured={secretConfigured}/></section>
      <section className="panel"><h2>Security</h2><p><b>Admin protections active:</b></p><ul><li>HTTP-only, SameSite session cookie</li><li>8-hour signed admin session</li><li>5 failed attempts → 30-minute lockout</li><li>Optional IP allowlist</li><li>Origin check on sensitive POST requests</li><li>Encrypted payment secret at rest</li><li>Hashed IP audit logging</li><li>Security response headers and CSP</li></ul></section>
    </div>
    <section className="panel"><h2>Recent admin audit</h2>{logs.length ? logs.map(log=><div key={log.id} style={{padding:"10px 0",borderTop:"1px solid #ddd"}}><b>{log.action}</b> <span style={{opacity:.6}}>• {log.createdAt.toLocaleString()}</span></div>) : <p>No audit events yet.</p>}</section>
  </div></main>;
}
