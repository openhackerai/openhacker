import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authenticateAgentRequest } from "../../../../../../lib/agent-auth";
import { scanRun } from "../../../../../../lib/db/app-schema";
import { db } from "../../../../../../lib/db";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const token = await authenticateAgentRequest(request);

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { runId } = await context.params;
  const body = await request.json().catch(() => null);
  const message =
    typeof body?.error === "string" && body.error.trim()
      ? body.error.trim().slice(0, 1000)
      : "The agent could not complete this run.";

  const [runRecord] = await db
    .select()
    .from(scanRun)
    .where(
      and(eq(scanRun.id, runId), eq(scanRun.organizationId, token.organizationId)),
    )
    .limit(1);

  if (!runRecord) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (runRecord.claimedByTokenId !== token.id) {
    return NextResponse.json(
      { error: "This run was not claimed by the current agent token." },
      { status: 403 },
    );
  }

  if (runRecord.status === "completed" || runRecord.status === "failed") {
    return NextResponse.json(
      { error: "This run has already finished." },
      { status: 409 },
    );
  }

  if (runRecord.status !== "running") {
    return NextResponse.json(
      { error: "Only running scans can be marked failed." },
      { status: 409 },
    );
  }

  const [updatedRun] = await db
    .update(scanRun)
    .set({
      status: "failed",
      completedAt: new Date(),
      errorMessage: message,
    })
    .where(
      and(
        eq(scanRun.id, runId),
        eq(scanRun.organizationId, token.organizationId),
        eq(scanRun.status, "running"),
        eq(scanRun.claimedByTokenId, token.id),
      ),
    )
    .returning();

  if (!updatedRun) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({ run: updatedRun });
}
