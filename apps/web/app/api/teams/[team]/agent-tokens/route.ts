import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAgentTokenSecret } from "../../../../../lib/agent-auth";
import { agentToken } from "../../../../../lib/db/app-schema";
import { db } from "../../../../../lib/db";
import { getTeamRouteContext } from "../../../../../lib/team";

type RouteContext = {
  params: Promise<{
    team: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { team } = await context.params;
  const teamContext = await getTeamRouteContext(team, request.headers);

  if (!teamContext) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const rawLabel = typeof body?.label === "string" ? body.label.trim() : "";
  const label = rawLabel.slice(0, 80) || "Local agent";
  const { secret, hash } = createAgentTokenSecret();

  const [createdToken] = await db
    .insert(agentToken)
    .values({
      id: randomUUID(),
      organizationId: teamContext.organization.id,
      label,
      tokenHash: hash,
      createdByUserId: teamContext.session.user.id,
    })
    .returning();

  return NextResponse.json(
    {
      token: secret,
      id: createdToken.id,
      label: createdToken.label,
    },
    { status: 201 },
  );
}
