import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authenticateAgentRequest } from "../../../../../lib/agent-auth";
import { project, scanRun } from "../../../../../lib/db/app-schema";
import { db } from "../../../../../lib/db";

export async function GET(request: Request) {
  const token = await authenticateAgentRequest(request);

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [candidate] = await db
    .select({
      run: scanRun,
      project,
    })
    .from(scanRun)
    .innerJoin(project, eq(scanRun.projectId, project.id))
    .where(
      and(
        eq(scanRun.organizationId, token.organizationId),
        eq(scanRun.status, "pending"),
      ),
    )
    .orderBy(asc(scanRun.requestedAt))
    .limit(1);

  if (!candidate) {
    return NextResponse.json({ run: null });
  }

  const [claimedRun] = await db
    .update(scanRun)
    .set({
      status: "running",
      claimedAt: new Date(),
      claimedByTokenId: token.id,
    })
    .where(
      and(
        eq(scanRun.id, candidate.run.id),
        eq(scanRun.organizationId, token.organizationId),
        eq(scanRun.status, "pending"),
      ),
    )
    .returning();

  if (!claimedRun) {
    return NextResponse.json({ run: null });
  }

  return NextResponse.json({
    run: {
      id: claimedRun.id,
      repository: candidate.project.fullName,
      requestedAt: claimedRun.requestedAt,
    },
    project: {
      id: candidate.project.id,
      fullName: candidate.project.fullName,
      url: candidate.project.url,
    },
  });
}
