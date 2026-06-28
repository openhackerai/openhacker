"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunScanForm({ team }: { readonly team: string }) {
  const router = useRouter();
  const [repository, setRepository] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/teams/${team}/scan-runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        repository: String(formData.get("repository") ?? ""),
      }),
    });

    const payload = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not queue this scan.");
      return;
    }

    setRepository("");
    setMessage("Scan queued. A connected agent will claim it shortly.");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="scan-form">
      <label>
        <span>GitHub repository</span>
        <input
          name="repository"
          onChange={(event) => setRepository(event.target.value)}
          placeholder="owner/repo"
          value={repository}
        />
      </label>
      <button className="button primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Queueing..." : "Run scan"}
      </button>
      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
