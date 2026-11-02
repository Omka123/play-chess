"use client";
import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import { canEditStudy, studyRole } from "@/lib/studyAccess";
export default function CollaborativeStudies({ data, act, refresh }) {
  const [selected, setSelected] = useState(""), [nodeId, setNodeId] = useState(""), [title, setTitle] = useState(""), [fen, setFen] = useState(""), [inviteId, setInviteId] = useState(""), [code, setCode] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ key: "", value: "", dirty: false, baseVersion: 0 });
  const study = data?.studies.find(entry => entry.id === selected) || data?.studies[0], node = study?.nodes.find(entry => entry.id === nodeId) || study?.nodes[0];
  const editable = canEditStudy(study, data?.profile.id), owner = study?.ownerId === data?.profile.id;
  const draftKey = study && node ? "gambit:study-draft:" + data.profile.id + ":" + study.id + ":" + node.id : "";
  useEffect(() => {
    if (!draftKey) return;
    setDraft(current => {
      if (current.key === draftKey && current.dirty) return current;
      let saved; try { saved = JSON.parse(sessionStorage.getItem(draftKey) || "null"); } catch { /* Memory-only draft. */ }
      return { key: draftKey, value: typeof saved?.value === "string" ? saved.value : node.comment || "", dirty: Boolean(saved), baseVersion: saved?.baseVersion || study.version };
    });
  }, [draftKey, node?.comment, study?.version]);
  useEffect(() => { const timer = setInterval(() => refresh().catch(() => {}), 10000); return () => clearInterval(timer); }, [refresh]);
  const conflict = draft.key === draftKey && draft.dirty && draft.baseVersion !== study?.version;
  function editComment(value) {
    const next = { key: draftKey, value, dirty: true, baseVersion: draft.baseVersion || study.version }; setDraft(next);
    try { sessionStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* Keep draft in memory. */ }
  }
  function discard() { try { sessionStorage.removeItem(draftKey); } catch {} setDraft({ key: draftKey, value: node.comment || "", dirty: false, baseVersion: study.version }); }
  async function send(action) {
    setBusy(true); setMessage("");
    try {
      const result = await act(action);
      if (["studyComment", "studyRestoreComment"].includes(action.type)) { try { sessionStorage.removeItem(draftKey); } catch {} setDraft({ key: "", value: "", dirty: false, baseVersion: 0 }); }
      await refresh(); if (result.id) { setSelected(result.id); setNodeId(""); } setMessage("Study updated.");
    } catch (error) { setMessage(error.message + " Unsaved comments are retained."); await refresh().catch(() => {}); }
    finally { setBusy(false); }
  }
  return <section><h2>Collaborative studies</h2><p>Invite editors or read-only viewers. Only the owner can manage access. Unsaved comments stay in this tab across reloads; polling does not replace your draft.</p>
    <div className="hub-grid"><form className="card hub-form" onSubmit={event => { event.preventDefault(); send({ type: "studyCreate", title, fen }); }}><label>Study title<input value={title} maxLength={80} onChange={event => setTitle(event.target.value)} required /></label><label>Starting FEN (optional)<input value={fen} onChange={event => setFen(event.target.value)} maxLength={120} /></label><button className="btn primary" disabled={!data || busy}>Create shared study</button></form>
    <form className="card hub-form" onSubmit={event => { event.preventDefault(); send({ type: "studyJoin", id: inviteId, code }); }}><label>Study ID<input value={inviteId} onChange={event => setInviteId(event.target.value)} required /></label><label>Invitation code<input value={code} onChange={event => setCode(event.target.value)} required /></label><button className="btn" disabled={!data || busy}>Join study</button></form></div><p role="status">{message}</p>
    {study && node && <><label className="field-label">Your studies<select value={study.id} onChange={event => { setSelected(event.target.value); setNodeId(""); }}>{data.studies.map(entry => <option key={entry.id} value={entry.id}>{entry.title} - v{entry.version}</option>)}</select></label><p>Your role: {studyRole(study, data.profile.id)}</p>
    <div className="training-layout"><section><Board game={new Chess(node.fen)} orient="w" myColor={new Chess(node.fen).turn()} canMove={!busy && editable} onMove={(from, to, promotion) => send({ type: "studyMove", id: study.id, version: study.version, nodeId: node.id, move: { from, to, promotion } })} /><p>{node.title || node.san || "Position"}</p><div className="row">{node.parent && <button className="btn" onClick={() => setNodeId(node.parent)}>Parent position</button>}{study.nodes.filter(entry => entry.parent === node.id).map(child => <button className="btn" key={child.id} onClick={() => setNodeId(child.id)}>{child.san}</button>)}</div></section>
    <section className="card hub-form"><label>Chapter<select value={study.nodes.find(entry => !entry.parent && entry.id === node.id)?.id || ""} onChange={event => setNodeId(event.target.value)}><option value="" disabled>Select a chapter</option>{study.nodes.filter(entry => !entry.parent).map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label>
    <label>Position comment<textarea value={draft.key === draftKey ? draft.value : node.comment || ""} readOnly={!editable} onChange={event => editComment(event.target.value)} maxLength={1500} /></label>
    {conflict && <div role="alert"><p>The study changed while you were writing. Latest saved comment: {node.comment || "(empty)"}</p><button className="btn" onClick={() => { const next = { ...draft, baseVersion: study.version }; setDraft(next); try { sessionStorage.setItem(draftKey, JSON.stringify(next)); } catch {} }}>Keep draft using latest version</button></div>}
    {draft.dirty && <button className="btn" onClick={discard}>Discard unsaved draft</button>}
    <button className="btn" disabled={busy || !editable || conflict} onClick={() => send({ type: "studyComment", id: study.id, version: study.version, nodeId: node.id, comment: draft.value })}>Save comment</button>
    <button className="btn" disabled={busy || !editable} onClick={() => send({ type: "studyChapter", id: study.id, version: study.version, title: title || "New chapter", fen })}>Add chapter using title/FEN above</button>
    {owner && <><p className="hub-code">Study ID: {study.id}<br />Editor code: {study.invite || "Rotate invitations to generate"}<br />Viewer code: {study.viewInvite || "Rotate invitations to generate"}</p><button className="btn" disabled={busy} onClick={() => send({ type: "studyRotateInvites", id: study.id, version: study.version })}>Rotate invitation codes</button>{study.members.filter(id => id !== data.profile.id).map(id => <div className="hub-item-block" key={id}><small>{id}</small><label>Member role<select aria-label={"Role for " + id} value={studyRole(study, id)} disabled={busy} onChange={event => send({ type: "studySetRole", id: study.id, version: study.version, userId: id, role: event.target.value })}><option value="editor">Editor</option><option value="viewer">Viewer</option></select></label><button className="btn" disabled={busy} onClick={() => send({ type: "studyRemoveMember", id: study.id, version: study.version, userId: id })}>Remove member</button></div>)}</>}
    <details><summary>Revision history</summary><p>Latest 100 edits. Comment revisions can restore the previous comment at this position; move/chapter entries record activity, not full snapshots.</p><ol>{[...(study.history || [])].reverse().map(entry => <li key={entry.version}>v{entry.version}: {entry.action.replace(/^study/, "")} - {new Date(entry.at).toLocaleString()}{entry.nodeId === node.id && typeof entry.beforeComment === "string" && <button className="btn" disabled={busy || !editable} onClick={() => send({ type: "studyRestoreComment", id: study.id, version: study.version, nodeId: node.id, revision: entry.version })}>Restore previous comment from v{entry.version}</button>}</li>)}</ol></details>
    </section></div></>}
  </section>;
}
