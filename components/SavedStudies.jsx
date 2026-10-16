"use client";
import { useEffect, useState } from "react";
export default function SavedStudies({ fens, onLoad }) {
  const [studies, setStudies] = useState(null), [title, setTitle] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function refresh() { const response = await fetch("/api/platform", { cache: "no-store" }); if (response.ok) setStudies((await response.json()).profile.studies || []); }
  useEffect(() => { refresh().catch(() => {}); }, []);
  async function act(action) { setBusy(true); setMessage(""); try { const response = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) }); const value = await response.json(); if (!response.ok) throw new Error(value.error); await refresh(); setMessage("Study saved."); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }
  return <section className="card"><h2>Private studies</h2>{studies === null ? <p><a href="/login">Sign in</a> to save your analysis positions across devices.</p> : <><form className="hub-form" onSubmit={(event) => { event.preventDefault(); act({ type: "saveStudy", title, fens }); }}><label>Study title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required /></label><button className="btn primary" disabled={busy}>Save these positions</button></form>{studies.map((study) => <div className="hub-item" key={study.id}><button className="btn" disabled={busy} onClick={() => onLoad(study.fens)}>{study.title} · {study.fens.length} positions</button><button className="btn" disabled={busy} onClick={() => act({ type: "deleteStudy", id: study.id })}>Remove</button></div>)}</>}<p role="status">{message}</p></section>;
}
