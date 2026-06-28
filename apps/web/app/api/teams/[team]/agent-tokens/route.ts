import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createAgentTokenSecret } from "../../../../../lib/agent-auth";
import { normalizeAgentChannelUrl } from "../../../../../lib/agent-channel-url";
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
  const channelUrl = normalizeAgentChannelUrl(body?.agentChannelUrl);

  if (!channelUrl.ok) {
    return NextResponse.json({ error: channelUrl.error }, { status: 400 });
  }

  const label = "Team agent";
  const { secret, hash } = createAgentTokenSecret();

  const [existingToken] = await db
    .select()
    .from(agentToken)
    .where(
      and(
        eq(agentToken.organizationId, teamContext.organization.id),
        isNull(agentToken.revokedAt),
      ),
    )
    .limit(1);

  const [savedToken] = existingToken
    ? await db
        .update(agentToken)
        .set({
          label,
          tokenHash: hash,
          agentChannelUrl: channelUrl.url,
          createdByUserId: teamContext.session.user.id,
          createdAt: new Date(),
          lastUsedAt: null,
        })
        .where(eq(agentToken.id, existingToken.id))
        .returning()
    : await db
        .insert(agentToken)
        .values({
          id: randomUUID(),
          organizationId: teamContext.organization.id,
          label,
          tokenHash: hash,
          agentChannelUrl: channelUrl.url,
          createdByUserId: teamContext.session.user.id,
        })
        .returning();

  return NextResponse.json(
    {
      token: secret,
      id: savedToken.id,
      label: savedToken.label,
      agentChannelUrl: savedToken.agentChannelUrl,
    },
    { status: 201 },
  );
}
