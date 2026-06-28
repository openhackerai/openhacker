import { NextResponse } from "next/server";
import { ensureProject } from "../../../../../lib/projects";
import { validateGitHubRepository } from "../../../../../lib/repository";
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
  const repositoryInput = typeof body?.repository === "string" ? body.repository : "";
  const validation = validateGitHubRepository(repositoryInput);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const connectedProject = await ensureProject(
    teamContext.organization.id,
    validation,
  );

  return NextResponse.json({ project: connectedProject }, { status: 201 });
}
