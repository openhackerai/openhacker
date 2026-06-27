import Link from "next/link";
import { getStore, isPersistent } from "@/agent/lib/store";
import { SeverityCounts } from "./_components/ui";
import { addTarget, deleteTarget, scanTarget } from "./actions";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const store = getStore();
  const targets = await store.listTargets();
  const findingsByTarget = new Map(
    await Promise.all(
      targets.map(async (t) => [t.id, await store.listFindings(t.id)] as const),
    ),
  );

  return (
    <main className="container">
      <h1>Targets</h1>
      <p className="sub">
        Repositories continuously scans for vulnerabilities.
      </p>

      {!isPersistent() ? (
        <div className="banner">
          Using an in-memory store — data will not persist across
          restarts/deploys. Add a Vercel KV or Upstash Redis integration and set{" "}
          <code>KV_REST_API_URL</code> / <code>KV_REST_API_TOKEN</code> to
          persist.
        </div>
      ) : null}
      {error === "invalid-repo" ? (
        <div className="banner">
          Enter a valid GitHub repository (owner/name or a github.com URL).
        </div>
      ) : null}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Add a target</h2>
        <form action={addTarget}>
          <label htmlFor="repo">GitHub repository</label>
          <input
            id="repo"
            name="repo"
            type="text"
            placeholder="owner/name or URL"
            required
          />
          <button type="submit" style={{ marginTop: 14 }}>
            Add target
          </button>
        </form>
      </div>

      <h2>Configured targets</h2>
      {targets.length === 0 ? (
        <div className="empty">
          No targets yet. Add a repository above to start scanning.
        </div>
      ) : (
        targets.map((t) => {
          const findings = findingsByTarget.get(t.id) ?? [];
          return (
            <div className="card" key={t.id}>
              <div className="grow">
                <div className="repo">
                  <Link href={`/targets/${t.id}`}>{t.repo}</Link>
                </div>
                <div className="meta">
                  {t.lastScanAt
                    ? `last scan ${new Date(t.lastScanAt).toLocaleString()}${
                        t.lastScanStatus === "error"
                          ? ` — error: ${t.lastScanError}`
                          : ""
                      }`
                    : "never scanned"}
                </div>
                <div style={{ marginTop: 8 }}>
                  <SeverityCounts findings={findings} />
                </div>
              </div>
              <div className="actions">
                <form action={scanTarget} className="inline">
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit">Scan now</button>
                </form>
                <Link className="btn btn-ghost" href={`/targets/${t.id}`}>
                  View
                </Link>
                <form action={deleteTarget} className="inline">
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="btn-danger">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          );
        })
      )}
    </main>
  );
}
