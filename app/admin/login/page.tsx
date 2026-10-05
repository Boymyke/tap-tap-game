"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Login failed.");
    router.replace("/admin"); router.refresh();
  }

  return <main className="authShell"><div className="authCard">
    <div className="eyebrow">Restricted area</div><h1>Admin login</h1>
    <p>Authorised administrators only. Repeated failed attempts trigger a temporary lockout and are audit logged.</p>
    {error && <div className="notice">{error}</div>}
    <form onSubmit={submit}>
      <div className="field"><label>EMAIL</label><input name="email" type="email" autoComplete="username" required /></div>
      <div className="field"><label>PASSWORD</label><input name="password" type="password" autoComplete="current-password" minLength={12} required /></div>
      <button className="darkbtn" disabled={busy}>{busy ? "Checking..." : "Secure login"}</button>
    </form>
    <p style={{fontSize:12,opacity:.65,marginTop:22}}>Session cookies are HTTP-only, same-site restricted and time limited.</p>
  </div></main>;
}
