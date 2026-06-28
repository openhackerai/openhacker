"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AgentTokenPanelProps = {
  readonly agentChannelUrl?: string | null;
  readonly hasAgent: boolean;
  readonly team: string;
};

export function AgentTokenPanel({
  agentChannelUrl,
  hasAgent,
  team,
}: AgentTokenPanelProps) {
  const router = useRouter();
  const [channelUrl, setChannelUrl] = useState(agentChannelUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setMessage(null);
    setIsGenerating(true);

    const response = await fetch(`/api/teams/${team}/agent-tokens`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agentChannelUrl: String(formData.get("agentChannelUrl") ?? ""),
      }),
    });
    const payload = await response.json().catch(() => null);
    setIsGenerating(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not register this agent channel.");
      return;
    }

    setMessage("Agent channel registered. OpenHacker can now send scans directly.");
    router.refresh();
  }

  return (
    <div className="agent-token-panel">
      <p className="muted">
        {hasAgent
          ? "This team already has an agent registration. Updating it replaces the channel URL."
          : "Register the deployed OpenHacker channel for this team."}{" "}
        If your agent uses Vercel Deployment Protection, paste the protection-bypass
        URL from Vercel. OpenHacker will append <code>/channels/openhacker</code> when
        needed.
      </p>
      <form action={onSubmit} className="token-form">
        <label>
          <span>Agent channel URL</span>
          <input
            name="agentChannelUrl"
            onChange={(event) => setChannelUrl(event.target.value)}
            placeholder="https://your-agent.vercel.app/channels/openhacker?x-vercel-protection-bypass=..."
            value={channelUrl}
          />
        </label>
        <button className="button" disabled={isGenerating} type="submit">
          {isGenerating
            ? "Registering..."
            : hasAgent
              ? "Update agent channel"
              : "Register agent channel"}
        </button>
      </form>
      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
