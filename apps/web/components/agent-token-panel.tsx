"use client";

import { useMemo, useState } from "react";

export function AgentTokenPanel({ team }: { readonly team: string }) {
  const [label, setLabel] = useState("Vercel agent");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const platformUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "https://openhacker.ai";
    }

    return window.location.origin;
  }, []);

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsGenerating(true);

    const response = await fetch(`/api/teams/${team}/agent-tokens`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label: String(formData.get("label") ?? ""),
      }),
    });
    const payload = await response.json().catch(() => null);
    setIsGenerating(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not create an agent token.");
      return;
    }

    setToken(payload.token);
  }

  const envSnippet = token
    ? [
        `OPENHACKER_TOKEN=${token}`,
        `OPENHACKER_PLATFORM_URL=${platformUrl}`,
      ].join("\n")
    : "";

  async function copyEnvSnippet() {
    if (!envSnippet || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(envSnippet);
  }

  return (
    <div className="agent-token-panel">
      <form action={onSubmit} className="token-form">
        <label>
          <span>Agent label</span>
          <input
            name="label"
            onChange={(event) => setLabel(event.target.value)}
            value={label}
          />
        </label>
        <button className="button" disabled={isGenerating} type="submit">
          {isGenerating ? "Generating..." : "Generate token"}
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
      {token ? (
        <div className="token-reveal">
          <p className="eyebrow">Shown once</p>
          <input aria-label="Agent token" readOnly value={token} />
          <pre className="env-snippet">{envSnippet}</pre>
          <button className="button" onClick={copyEnvSnippet} type="button">
            Copy Vercel env vars
          </button>
          <p className="muted">
            Add these environment variables to the Vercel project created by{" "}
            <strong>npx openhacker</strong>. The deployed headless agent will
            poll this platform for queued scans and publish results back to this
            team.
          </p>
        </div>
      ) : null}
    </div>
  );
}
