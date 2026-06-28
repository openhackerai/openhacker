import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authenticateAgentRequest } from "../../../../../../lib/agent-auth";
import {
  finding,
  project,
  report,
  scanRun,
} from "../../../../../../lib/db/app-schema";
import { db } from "../../../../../../lib/db";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

type NormalizedFinding = {
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string | null;
  remediation: string | null;
  packageName: string | null;
  packageVersion: string | null;
  advisoryId: string | null;
  filePath: string | null;
  lineStart: number | null;
  lineEnd: number | null;
  fingerprint: string;
};

const SEVERITIES = new Set(["critical", "high", "medium", "low", "info"]);

export async function POST(request: Request, context: RouteContext) {
  const token = await authenticateAgentRequest(request);

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { runId } = await context.params;
  const body = await request.json().catch(() => null);
  const markdown = normalizeString(body?.markdown ?? body?.report ?? "");

  if (!markdown) {
    return NextResponse.json(
      { error: "Report markdown is required." },
      { status: 400 },
    );
  }

  const [runRecord] = await db
    .select({
      run: scanRun,
      project,
    })
    .from(scanRun)
    .innerJoin(project, eq(scanRun.projectId, project.id))
    .where(
      and(eq(scanRun.id, runId), eq(scanRun.organizationId, token.organizationId)),
    )
    .limit(1);

  if (!runRecord) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (runRecord.run.claimedByTokenId !== token.id) {
    return NextResponse.json(
      { error: "This run was not claimed by the current agent token." },
      { status: 403 },
    );
  }

  if (runRecord.run.status === "completed") {
    return NextResponse.json(
      { error: "This run has already been completed." },
      { status: 409 },
    );
  }

  if (runRecord.run.status !== "running") {
    return NextResponse.json(
      { error: "Only running scans can receive results." },
      { status: 409 },
    );
  }

  const findings = normalizeFindings(body?.findings);
  const counts = countSeverities(findings);
  const reportId = randomUUID();
  const title = normalizeString(body?.title) || `Security report for ${runRecord.project.fullName}`;
  const summary =
    normalizeString(body?.summary) || markdown.replace(/\s+/g, " ").slice(0, 240);

  const [createdReport] = await db
    .insert(report)
    .values({
      id: reportId,
      organizationId: token.organizationId,
      projectId: runRecord.project.id,
      scanRunId: runRecord.run.id,
      title,
      summary,
      content: markdown,
      criticalCount: counts.critical,
      highCount: counts.high,
      mediumCount: counts.medium,
      lowCount: counts.low,
      infoCount: counts.info,
    })
    .returning();

  if (findings.length > 0) {
    await db
      .insert(finding)
      .values(
        findings.map((item) => ({
          id: randomUUID(),
          organizationId: token.organizationId,
          projectId: runRecord.project.id,
          scanRunId: runRecord.run.id,
          reportId: createdReport.id,
          severity: item.severity,
          title: item.title,
          description: item.description,
          remediation: item.remediation,
          packageName: item.packageName,
          packageVersion: item.packageVersion,
          advisoryId: item.advisoryId,
          filePath: item.filePath,
          lineStart: item.lineStart,
          lineEnd: item.lineEnd,
          fingerprint: item.fingerprint,
        })),
      )
      .onConflictDoNothing();
  }

  await db
    .update(scanRun)
    .set({
      status: "completed",
      completedAt: new Date(),
      errorMessage: null,
      eveSessionId: normalizeString(body?.eveSessionId) || null,
    })
    .where(
      and(
        eq(scanRun.id, runRecord.run.id),
        eq(scanRun.status, "running"),
        eq(scanRun.claimedByTokenId, token.id),
      ),
    );

  return NextResponse.json({
    report: createdReport,
    findingsAccepted: findings.length,
  });
}

function normalizeFindings(value: unknown): NormalizedFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeFinding(item))
    .filter((item): item is NormalizedFinding => item !== null)
    .slice(0, 100);
}

function normalizeFinding(value: unknown): NormalizedFinding | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const title = normalizeString(record.title).slice(0, 240);

  if (!title) {
    return null;
  }

  const severity = normalizeSeverity(record.severity);
  const description = nullableString(record.description);
  const remediation = nullableString(record.remediation ?? record.recommendation);
  const packageName = nullableString(record.packageName ?? record.package);
  const packageVersion = nullableString(record.packageVersion ?? record.version);
  const advisoryId = nullableString(record.advisoryId ?? record.cve ?? record.ghsa);
  const filePath = nullableString(record.filePath ?? record.path);
  const lineStart = nullableInteger(record.lineStart ?? record.line);
  const lineEnd = nullableInteger(record.lineEnd);
  const providedFingerprint = nullableString(record.fingerprint);

  return {
    severity,
    title,
    description,
    remediation,
    packageName,
    packageVersion,
    advisoryId,
    filePath,
    lineStart,
    lineEnd,
    fingerprint:
      providedFingerprint ??
      createFindingFingerprint({
        severity,
        title,
        advisoryId,
        filePath,
        packageName,
      }),
  };
}

function normalizeSeverity(value: unknown): NormalizedFinding["severity"] {
  const severity = normalizeString(value).toLowerCase();

  if (SEVERITIES.has(severity)) {
    return severity as NormalizedFinding["severity"];
  }

  return "info";
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized ? normalized.slice(0, 1000) : null;
}

function nullableInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }

  return null;
}

function createFindingFingerprint(parts: Record<string, string | null>) {
  return createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("hex")
    .slice(0, 32);
}

function countSeverities(findings: readonly NormalizedFinding[]) {
  return findings.reduce(
    (counts, item) => {
      counts[item.severity] += 1;
      return counts;
    },
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  );
}
