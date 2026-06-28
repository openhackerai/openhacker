import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "./auth";

export async function getTeamPageContext(team: string) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect(`/sign-in?next=/${team}`);
  }

  const organization = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: {
      organizationSlug: team,
      membersLimit: 100,
    },
  });

  if (!organization) {
    notFound();
  }

  const membership = organization.members.find(
    (member) => member.userId === session.user.id,
  );

  if (!membership) {
    notFound();
  }

  return { session, organization, membership };
}

export async function getTeamRouteContext(team: string, requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    return null;
  }

  const organization = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: {
      organizationSlug: team,
      membersLimit: 100,
    },
  });

  if (!organization) {
    return null;
  }

  const membership = organization.members.find(
    (member) => member.userId === session.user.id,
  );

  if (!membership) {
    return null;
  }

  return { session, organization, membership };
}
