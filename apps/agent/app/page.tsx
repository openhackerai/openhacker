"use client";

import { type SyntheticEvent, useState } from "react";
import { useEveAgent } from "eve/react";

import { validateGitHubRepository } from "@/lib/repository";

export default function Home() {
  const [repo, setRepo] = useState("");
  const [error, setError] = useState("");
  const agent = useEveAgent();

  const busy = agent.status === "submitted" || agent.status === "streaming";

  function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    const validation = validateGitHubRepository(repo);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setError("");
    agent.reset();
    agent.send({
      message: `Analyze the GitHub repository ${validation.repository} for security vulnerabilities. Reply with only the final report.`,
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
          aria-label="GitHub repository"
        />
        <button type="submit" disabled={busy || !repo.trim()}>
          {busy ? "Analyzing…" : "Analyze"}
        </button>
      </form>

      {result || busy ? (
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

      {error || agent.status === "error" ? (
        <div className="banner">
          {error || String(agent.error ?? "Something went wrong.")}
        </div>
      ) : null}
    </main>
  );
}
