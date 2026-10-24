"use client";
import { useEffect } from "react";
export default function ErrorPage({ reset }) { useEffect(() => { fetch("/api/telemetry", { method: "POST" }).catch(() => {}); }, []); return <main className="content-page"><h1>Let’s try that again</h1><p>This page could not load. Your completed games remain saved.</p><button className="btn primary" onClick={reset}>Retry page</button><p><a href="/">Return to the board</a></p></main>; }
