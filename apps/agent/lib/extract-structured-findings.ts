export type StructuredFinding = {
  severity?: string;
  title?: string;
  description?: string;
  remediation?: string;
  packageName?: string;
  packageVersion?: string;
  advisoryId?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  fingerprint?: string;
};

const JSON_BLOCK_PATTERN = /```(?:json)?\s*([\s\S]*?"findings"[\s\S]*?)```/gi;

export function extractStructuredFindings(
  markdown: string,
): StructuredFinding[] {
  for (const match of markdown.matchAll(JSON_BLOCK_PATTERN)) {
    const rawJson = match[1]?.trim();

    if (!rawJson) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawJson) as unknown;
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
