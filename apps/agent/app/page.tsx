"use client";

import { useState } from "react";
import { useEveAgent } from "eve/react";

export default function Home() {
  const [repo, setRepo] = useState("");
  const agent = useEveAgent();

  const busy = agent.status === "submitted" || agent.status === "streaming";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = repo.trim();
    if (!value || busy) return;
    agent.reset();
    agent.send({
      message: `Analyze the GitHub repository "${value}" for security vulnerabilities. Reply with only the final report.`,
    });
  }

  const reply = [...agent.data.messages]
    .reverse()
    .find((m) => m.role === "assistant");

  const parts = reply?.parts ?? [];
  const lastStep = parts.reduce<number | undefined>((max, p) => {
    const idx = "stepIndex" in p ? p.stepIndex : undefined;
    if (typeof idx !== "number") return max;
    return max === undefined ? idx : Math.max(max, idx);
  }, undefined);

  let result = "";
  for (const p of parts) {
    if (p.type !== "text") continue;
    if (lastStep !== undefined && p.stepIndex !== lastStep) continue;
    result += p.text;
  }

  return (
    <main className="container">
      <h1>
        open<span>hacker</span>
      </h1>
      <p className="sub">
        Paste a GitHub repo and the agent will analyze it for vulnerabilities.
      </p>

      <form className="ask" onSubmit={onSubmit}>
        <input
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="owner/name or https://github.com/owner/name"
          autoFocus
        />
        <button type="submit" disabled={busy || !repo.trim()}>
          {busy ? "Analyzing…" : "Analyze"}
        </button>
      </form>

      {reply || busy ? (
        <section className="reply">
          {result ? <p className="text">{result}</p> : null}
          {busy && !result ? (
            <p className="hacking">
              hacking
              <span className="dots" aria-hidden />
            </p>
          ) : null}
        </section>
      ) : null}

      {agent.status === "error" ? (
        <div className="banner">
          {String(agent.error ?? "Something went wrong.")}
        </div>
      ) : null}
    </main>
  );
}
