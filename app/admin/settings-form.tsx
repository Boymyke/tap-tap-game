"use client";

import { FormEvent, useState } from "react";

export default function SettingsForm({ publicKey, secretConfigured }: { publicKey: string; secretConfigured: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMessage("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicKey: form.get("publicKey"), secretKey: form.get("secretKey") }),
    });
    const data = await res.json();
    setBusy(false);
    setMessage(res.ok ? "Payment settings saved securely." : (data.error || "Could not save settings."));
  }

  return <form onSubmit={save}>
    {message && <div className="notice">{message}</div>}
    <div className="field"><label>PAYSTACK PUBLIC KEY</label><input name="publicKey" defaultValue={publicKey} placeholder="pk_live_... or pk_test_..." autoComplete="off" /></div>
    <div className="field"><label>PAYSTACK SECRET KEY</label><input name="secretKey" type="password" placeholder={secretConfigured ? "Configured — enter a new key only to replace it" : "sk_live_... or sk_test_..."} autoComplete="new-password" /></div>
    <button className="darkbtn" disabled={busy}>{busy ? "Saving..." : "Save payment settings"}</button>
  </form>;
}
