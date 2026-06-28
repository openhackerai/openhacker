import { Client, type ClientAuth } from "eve/client";
import {
  claimNextRun,
  formatError,
  postRunFailure,
  postRunResult,
  type PlatformRunResult,
  type StructuredFinding,
} from "./platform";

type EveScanOutput = {
  readonly title?: string;
  readonly summary?: string;
  readonly markdown?: string;
  readonly findings?: readonly StructuredFinding[];
};

const SCAN_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    markdown: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: {
            type: "string",
            enum: ["critical", "high", "medium", "low", "info"],
          },
          title: { type: "string" },
          description: { type: "string" },
          remediation: { type: "string" },
          packageName: { type: "string" },
          packageVersion: { type: "string" },
          advisoryId: { type: "string" },
          filePath: { type: "string" },
          lineStart: { type: "number" },
          lineEnd: { type: "number" },
          fingerprint: { type: "string" },
        },
        required: ["severity", "title", "description", "remediation"],
      },
    },
  },
  required: ["title", "summary", "markdown", "findings"],
} as const;

export async function processNextPlatformRun() {
  const claimed = await claimNextRun();

  if (!claimed.ok) {
    console.log(`[openhacker] ${claimed.error}`);
    return;
  }

  if (!claimed.run) {
    console.log("[openhacker] no pending scan runs");
    return;
  }

  const { run, project } = claimed.run;
  console.log(`[openhacker] claimed scan ${run.id} for ${project.fullName}`);

  try {
    const result = await runEveScan(project.fullName);
    await postRunResult(run.id, result);
    console.log(`[openhacker] completed scan ${run.id}`);
  } catch (error) {
    console.error(`[openhacker] scan ${run.id} failed`, error);
    await postRunFailure(run.id, error);
  }
}

async function runEveScan(repository: string): Promise<PlatformRunResult> {
  const client = new Client({
    host: getAgentUrl(),
    auth: getAgentAuth(),
    redirect: "error",
    preserveCompletedSessions: false,
  });
  const session = client.session();
  const response = await session.send<EveScanOutput>({
    message: buildScanPrompt(repository),
    outputSchema: SCAN_OUTPUT_SCHEMA,
  });
  const result = await response.result();

  if (result.status === "failed") {
    throw new Error("Eve session failed.");
  }

  const data = result.data;
  const markdown = normalizeString(data?.markdown) || result.message || "";

  if (!markdown.trim()) {
    throw new Error("Eve did not return a report.");
  }

  return {
    markdown,
    findings:
      Array.isArray(data?.findings) && data.findings.length > 0
        ? data.findings
        : extractStructuredFindings(markdown),
    title:
      normalizeString(data?.title) ||
      `Security report for ${repository}`,
    summary:
      normalizeString(data?.summary) ||
      markdown.replace(/\s+/g, " ").slice(0, 240),
    eveSessionId: result.sessionId,
  };
}

function buildScanPrompt(repository: string) {
  return [
    `Analyze the GitHub repository ${repository} for security vulnerabilities.`,
    "Return a concise human-readable markdown report.",
    "Also satisfy the requested structured output schema with the same findings.",
    "Use severity values critical, high, medium, low, or info.",
  ].join("\n");
}

function getAgentUrl() {
  const configuredUrl = process.env.OPENHACKER_AGENT_URL?.trim();

  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  if (process.env.VERCEL_URL) {
    return normalizeUrl(`https://${process.env.VERCEL_URL}`);
  }

  return normalizeUrl(`http://localhost:${process.env.PORT ?? "3001"}`);
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error(`Invalid agent URL: ${value}`);
  }
}

function getAgentAuth(): ClientAuth | undefined {
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();

  if (!oidcToken) {
    return undefined;
  }

  return {
    vercelOidc: {
      token: oidcToken,
    },
  };
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractStructuredFindings(markdown: string): StructuredFinding[] {
  for (const match of markdown.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    try {
      const parsed = JSON.parse(match[1]?.trim() ?? "") as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { findings?: unknown }).findings)
      ) {
        return (parsed as { findings: StructuredFinding[] }).findings;
      }
    } catch {
      continue;
    }
  }

  return [];
}

export function describeRunError(error: unknown) {
  return formatError(error);
}
