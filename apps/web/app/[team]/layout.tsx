import Link from "next/link";
import { SignOutButton } from "../../components/sign-out-button";
import { getTeamPageContext } from "../../lib/team";

type TeamLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    team: string;
  }>;
};

export default async function TeamLayout({ children, params }: TeamLayoutProps) {
  const { team } = await params;
  const { organization } = await getTeamPageContext(team);

  return (
    <main className="page team-page">
      <header className="team-header">
        <Link className="brand" href="/">
          openhacker
        </Link>
        <nav aria-label={`${organization.name} navigation`} className="team-nav">
          <Link href={`/${team}`}>Overview</Link>
          <Link href={`/${team}/reports`}>Reports</Link>
        </nav>
        <div className="team-actions">
          <SignOutButton />
        </div>
      </header>
      {children}
    </main>
  );
}
