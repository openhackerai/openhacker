import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";

export default async function PostSignInPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect("/sign-in");
  }

  const organizations = await auth.api.listOrganizations({
    headers: requestHeaders,
  });

  const activeOrganizationId = session.session.activeOrganizationId;
  const activeOrganization = organizations.find(
    (organization) => organization.id === activeOrganizationId,
  );

  if (activeOrganizationId && !activeOrganization) {
    await auth.api.setActiveOrganization({
      headers: requestHeaders,
      body: { organizationId: null },
    });
  }

  const organization = activeOrganization ?? organizations[0];

  if (organization?.slug) {
    redirect(`/${organization.slug}`);
  }

  redirect("/new-team");
}
