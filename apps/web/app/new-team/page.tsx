import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CreateTeamForm } from "../../components/create-team-form";
import { auth } from "../../lib/auth";

export default async function NewTeamPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect("/sign-in");
  }

  const organizations = await auth.api.listOrganizations({
    headers: requestHeaders,
  });

  if (organizations[0]?.slug) {
    redirect(`/${organizations[0].slug}`);
  }

  return (
    <main className="page auth-page">
      <section className="panel auth-panel">
        <p className="eyebrow">One more step</p>
        <h1>Create your team</h1>
        <p className="muted">
          Teams get their own URL, so your workspace will be easy to share:
          openhacker.ai/team.
        </p>
        <CreateTeamForm />
      </section>
    </main>
  );
}
