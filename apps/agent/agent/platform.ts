const DEFAULT_PLATFORM_URL = "https://openhacker.ai";

export type PlatformRun = {
  readonly id: string;
  readonly repository: string;
  readonly requestedAt?: string;
};

export type PlatformProject = {
  readonly id: string;
  readonly fullName: string;
  readonly url?: string;
};

export type ClaimedPlatformRun = {
  readonly run: PlatformRun;
  readonly project: PlatformProject;
};

export type StructuredFinding = {
  readonly severity?: string;
  readonly title?: string;
  readonly description?: string;
  readonly remediation?: string;
  readonly packageName?: string;
  readonly packageVersion?: string;
  readonly advisoryId?: string;
  readonly filePath?: string;
  readonly lineStart?: number;
  readonly lineEnd?: number;
  readonly fingerprint?: string;
};

export type PlatformRunResult = {
  readonly markdown: string;
  readonly findings: readonly StructuredFinding[];
  readonly title?: string;
  readonly summary?: string;
  readonly eveSessionId?: string;
};

type PlatformConfig =
  | { readonly ok: true; readonly token: string; readonly platformUrl: URL }
  | { readonly ok: false; readonly error: string };

export async function claimNextRun() {
  const config = getPlatformConfig();

  if (!config.ok) {
    return { ok: false as const, skipped: true as const, error: config.error };
  }

  const response = await platformFetch(config, "/api/agent/runs/next");
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false as const,
      skipped: false as const,
      error: readPayloadError(payload, "Could not claim the next scan run."),
    };
  }

  if (!payload?.run) {
    return { ok: true as const, run: null };
  }

  return {
    ok: true as const,
    run: payload as ClaimedPlatformRun,
  };
}

export async function postRunResult(runId: string, result: PlatformRunResult) {
  const config = getPlatformConfig();

  if (!config.ok) {
    throw new Error(config.error);
  }

  const response = await platformFetch(
    config,
    `/api/agent/runs/${encodeURIComponent(runId)}/result`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(result),
    },
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readPayloadError(payload, "Could not post scan results."));
  }

  return payload;
}

export async function postRunFailure(runId: string, error: unknown) {
  const config = getPlatformConfig();

  if (!config.ok) {
    throw new Error(config.error);
  }

  const response = await platformFetch(
    config,
    `/api/agent/runs/${encodeURIComponent(runId)}/failure`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: formatError(error) }),
    },
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readPayloadError(payload, "Could not post scan failure."));
  }

  return payload;
}

function getPlatformConfig(): PlatformConfig {
  const token = process.env.OPENHACKER_TOKEN?.trim();

  if (!token) {
    return {
      ok: false,
      error: "OPENHACKER_TOKEN is not configured; skipping platform sync.",
    };
  }

  const platformUrl = parsePlatformUrl(
    process.env.OPENHACKER_PLATFORM_URL ?? DEFAULT_PLATFORM_URL,
  );

  if (!platformUrl.ok) {
    return platformUrl;
  }

  return {
    ok: true,
    token,
    platformUrl: platformUrl.url,
  };
}

function parsePlatformUrl(
  value: string,
): { readonly ok: true; readonly url: URL } | { readonly ok: false; readonly error: string } {
  try {
    const url = new URL(value);
    const isLocalhost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1";

    if (url.protocol !== "https:" && !(isLocalhost && url.protocol === "http:")) {
      return {
        ok: false,
        error:
          "OPENHACKER_PLATFORM_URL must use https, except localhost may use http.",
      };
    }

    return { ok: true, url };
  } catch {
    return {
      ok: false,
      error: "OPENHACKER_PLATFORM_URL must be a valid URL.",
    };
  }
}

async function platformFetch(
  config: Extract<PlatformConfig, { ok: true }>,
  path: string,
  init: RequestInit = {},
) {
  return fetch(new URL(path, config.platformUrl), {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${config.token}`,
    },
    cache: "no-store",
    redirect: "error",
  });
}

function readPayloadError(payload: unknown, fallback: string) {
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
