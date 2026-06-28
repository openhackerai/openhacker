const CHANNEL_PATH = "/channels/openhacker";
const ALLOWED_QUERY_PARAMS = new Set([
  "x-vercel-protection-bypass",
  "x-vercel-set-bypass-cookie",
]);

export function normalizeAgentChannelUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false as const, error: "Enter the deployed agent channel URL." };
  }

  try {
    const url = new URL(value.trim());

    if (url.username || url.password) {
      return {
        ok: false as const,
        error: "Agent channel URL cannot include credentials.",
      };
    }

    if (url.hash) {
      return {
        ok: false as const,
        error: "Agent channel URL cannot include a hash fragment.",
      };
    }

    for (const key of url.searchParams.keys()) {
      if (!ALLOWED_QUERY_PARAMS.has(key)) {
        return {
          ok: false as const,
          error:
            "Agent channel URL may only include Vercel protection bypass query parameters.",
        };
      }
    }

    if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
      return {
        ok: false as const,
        error: "Agent channel URL must use HTTPS in production.",
      };
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { ok: false as const, error: "Agent channel URL must be HTTP or HTTPS." };
    }

    url.pathname = normalizeChannelPath(url.pathname);

    if (url.pathname !== CHANNEL_PATH) {
      return {
        ok: false as const,
        error: `Agent channel URL must point to ${CHANNEL_PATH}.`,
      };
    }

    return { ok: true as const, url: url.toString() };
  } catch {
    return { ok: false as const, error: "Enter a valid agent channel URL." };
  }
}

function normalizeChannelPath(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "") || "/";

  if (trimmed === "/") {
    return CHANNEL_PATH;
  }

  return trimmed;
}
