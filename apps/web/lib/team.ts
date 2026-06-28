import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "./auth";

function isOrganizationAccessError(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("body" in error) ||
    typeof error.body !== "object" ||
    error.body === null ||
    !("code" in error.body)
  ) {
    return false;
  }

  const code = error.body.code;
  return (
    code === "ORGANIZATION_NOT_FOUND" ||
    code === "USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION"
  );
}

async function loadOrganization(team: string, requestHeaders: Headers) {
  try {
    return await auth.api.getFullOrganization({
      headers: requestHeaders,
      query: {
        organizationSlug: team,
        membersLimit: 100,
      },
    });
  } catch (error) {
    if (isOrganizationAccessError(error)) {
      return null;
    }

    throw error;
  }
}

export const getTeamPageContext = cache(async (team: string) => {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect(`/sign-in?next=/${team}`);
  }

  const organization = await loadOrganization(team, requestHeaders);

  if (!organization) {
    redirect("/post-sign-in");
  }

  const membership = organization.members.find(
    (member) => member.userId === session.user.id,
  );

  if (!membership) {
    notFound();
  }

  return { session, organization, membership };
});

export async function getTeamRouteContext(team: string, requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    return null;
  }

  const organization = await loadOrganization(team, requestHeaders);

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
