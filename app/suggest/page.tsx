"use client";

import { FormEvent, useState } from "react";

export default function SuggestPage(){
  const [sent,setSent]=useState(false);
  function submit(e:FormEvent){e.preventDefault();setSent(true)}
  return <section className="page"><div className="eyebrow">Community</div><h1>Suggest a Feature</h1><p>Tell us what you would like to see added or improved in NAK AM.</p>{sent?<div className="card"><h3>Suggestion received in this demo.</h3><p>The production version will save submissions to the database for admin review.</p></div>:<form className="form" onSubmit={submit}><input required placeholder="Your name"/><input type="email" placeholder="Email (optional)"/><textarea required placeholder="Your suggestion"/><button className="button" type="submit">Send Suggestion</button></form>}</section>
}
