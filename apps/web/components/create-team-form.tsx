"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";

const RESERVED_SLUGS = new Set([
  "api",
  "_next",
  "new-team",
  "post-sign-in",
  "sign-in",
  "sign-up",
]);

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewSlug = useMemo(() => slug || toSlug(name), [name, slug]);

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const teamName = String(formData.get("name") ?? "").trim();
    const teamSlug = toSlug(String(formData.get("slug") ?? "") || teamName);

    if (teamSlug.length < 2) {
      setError("Team URL must be at least 2 characters.");
      setIsSubmitting(false);
      return;
    }

    if (RESERVED_SLUGS.has(teamSlug)) {
      setError("That team URL is reserved.");
      setIsSubmitting(false);
      return;
    }

    const slugCheck = await authClient.organization.checkSlug({
      slug: teamSlug,
    });

    if (slugCheck.error || slugCheck.data?.status === false) {
      setError("That team URL is already taken.");
      setIsSubmitting(false);
      return;
    }

    const response = await authClient.organization.create({
      name: teamName,
      slug: teamSlug,
      keepCurrentActiveOrganization: false,
    });

    if (response.error) {
      setError(response.error.message ?? "Could not create that team.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/${teamSlug}`);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="auth-form">
      <label>
        <span>Team name</span>
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Acme Labs"
          required
          minLength={2}
        />
      </label>
      <label>
        <span>Team URL</span>
        <div className="slug-input">
          <span>openhacker.ai/</span>
          <input
            name="slug"
            value={slug}
            onChange={(event) => setSlug(toSlug(event.target.value))}
            placeholder={toSlug(name) || "acme"}
            minLength={2}
          />
        </div>
      </label>
      <p className="form-hint">
        Your team will live at{" "}
        <strong>openhacker.ai/{previewSlug || "team"}</strong>.
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating..." : "Create team"}
      </button>
    </form>
  );
}
