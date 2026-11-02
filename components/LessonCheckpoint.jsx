"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { LESSON_CHECKPOINTS } from "@/lib/lessonCheckpoints";
export default function LessonCheckpoint({ slug }) {
  const { data: session, status } = useSession();
  const [answer, setAnswer] = useState(null), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const checkpoint = LESSON_CHECKPOINTS[slug]; if (!checkpoint) return null;
  async function submit(event) {
    event.preventDefault(); if (status === "loading") return; setBusy(true);
    try {
      let value = { correct: answer === checkpoint.correct, explanation: checkpoint.explanation };
      if (session?.user) {
        const response = await fetch("/api/academy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lessonCheckpoint", slug, answer }) });
        value = await response.json(); if (!response.ok) throw new Error(value.error || "Could not save checkpoint.");
      }
      setMessage(`${value.correct ? "Correct." : "Try again."} ${value.explanation}${value.correct ? session?.user ? " Checkpoint saved. You can complete this step in the course." : " Sign in to save assessed course progress." : ""}`);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <section className="lesson-walkthrough"><h2>Check your understanding</h2><form onSubmit={submit}><fieldset className="checkpoint-choices"><legend>{checkpoint.prompt}</legend>{checkpoint.choices.map((choice, index) => <label key={choice}><input type="radio" name={`checkpoint-${slug}`} checked={answer === index} onChange={() => setAnswer(index)} />{choice}</label>)}</fieldset><button className="btn primary" disabled={answer === null || busy || status === "loading"}>Check answer</button></form><p role="status">{message}</p></section>;
}
