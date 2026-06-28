import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AgentTokenPanel } from "../../components/agent-token-panel";
import { RunScanForm } from "../../components/run-scan-form";
import {
  agentToken,
  finding,
  project,
  report,
  scanRun,
} from "../../lib/db/app-schema";
import { db } from "../../lib/db";
import { getTeamPageContext } from "../../lib/team";

type TeamPageProps = {
  params: Promise<{
    team: string;
  }>;
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { team } = await params;
  const { organization } = await getTeamPageContext(team);

  const [
    projects,
    latestReports,
    recentFindings,
    recentRuns,
    activeTokens,
  ] = await Promise.all([
    db
      .select()
      .from(project)
      .where(eq(project.organizationId, organization.id))
      .orderBy(desc(project.updatedAt))
      .limit(6),
    db
      .select({
        report,
        project,
      })
      .from(report)
      .leftJoin(project, eq(report.projectId, project.id))
      .where(eq(report.organizationId, organization.id))
      .orderBy(desc(report.createdAt))
      .limit(5),
    db
      .select({
        finding,
        project,
      })
      .from(finding)
      .leftJoin(project, eq(finding.projectId, project.id))
      .where(eq(finding.organizationId, organization.id))
      .orderBy(desc(finding.lastSeenAt))
      .limit(50),
    db
      .select({
        run: scanRun,
        project,
      })
      .from(scanRun)
      .innerJoin(project, eq(scanRun.projectId, project.id))
      .where(eq(scanRun.organizationId, organization.id))
      .orderBy(desc(scanRun.requestedAt))
      .limit(5),
    db
      .select()
      .from(agentToken)
      .where(eq(agentToken.organizationId, organization.id))
      .orderBy(desc(agentToken.createdAt))
      .limit(5),
  ]);

  const visibleTokens = activeTokens.filter((token) => !token.revokedAt);
  const severityCounts = countSeverities(
    recentFindings.map((item) => item.finding.severity),
  );
  const openFindings = recentFindings.filter(
    (item) => item.finding.status === "open",
  );
  const pendingRuns = recentRuns.filter((item) => item.run.status === "pending");
  const runningRuns = recentRuns.filter((item) => item.run.status === "running");

  return (
    <>
      <section className="panel team-hero">
        <p className="eyebrow">Team workspace</p>
        <h1>{organization.name}</h1>
        <p className="lede">
          Connect repositories, queue Eve scans, and review findings reported by
          agents running in your own network.
        </p>
      </section>

      <section className="metric-grid" aria-label="Dashboard summary">
        <article className="panel metric-card">
          <span>Projects</span>
          <strong>{projects.length}</strong>
          <p>Connected GitHub repositories</p>
        </article>
        <article className="panel metric-card">
          <span>Open findings</span>
          <strong>{openFindings.length}</strong>
          <p>{severityCounts.critical + severityCounts.high} urgent findings</p>
        </article>
        <article className="panel metric-card">
          <span>Agent queue</span>
          <strong>{pendingRuns.length + runningRuns.length}</strong>
          <p>
            {pendingRuns.length} pending, {runningRuns.length} running
          </p>
        </article>
        <article className="panel metric-card">
          <span>Agents</span>
          <strong>{visibleTokens.length}</strong>
          <p>Active platform tokens</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dashboard-card scan-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Manual invocation</p>
              <h2>Run Eve against a repository</h2>
            </div>
          </div>
          <RunScanForm team={team} />
        </article>

        <article className="panel dashboard-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Agent connection</p>
              <h2>Connect local agents</h2>
            </div>
          </div>
          <AgentTokenPanel team={team} />
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dashboard-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Connected projects</p>
              <h2>Repositories</h2>
            </div>
          </div>
          {projects.length > 0 ? (
            <div className="resource-list">
              {projects.map((item) => (
                <a href={item.url} key={item.id} rel="noreferrer" target="_blank">
                  <strong>{item.fullName}</strong>
                  <span>GitHub</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="muted">
              Queue a manual scan to connect your first repository.
            </p>
          )}
        </article>

        <article className="panel dashboard-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Findings</p>
              <h2>Severity mix</h2>
            </div>
          </div>
          <div className="severity-grid">
            {Object.entries(severityCounts).map(([severity, count]) => (
              <div className={`severity-pill ${severity}`} key={severity}>
                <span>{severity}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          {openFindings.slice(0, 4).map((item) => (
            <div className="finding-row" key={item.finding.id}>
              <span className={`status-dot ${item.finding.severity}`} />
              <div>
                <strong>{item.finding.title}</strong>
                <span>{item.project?.fullName ?? "Unknown project"}</span>
              </div>
            </div>
          ))}
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dashboard-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Reports</p>
              <h2>Latest reports</h2>
            </div>
            <Link className="text-link" href={`/${team}/reports`}>
              View all
            </Link>
          </div>
          {latestReports.length > 0 ? (
            <div className="report-list">
              {latestReports.map((item) => (
                <Link
                  className="report-row"
                  href={`/${team}/reports/${item.report.id}`}
                  key={item.report.id}
                >
                  <div>
                    <strong>{item.report.title}</strong>
                    <span>{item.project?.fullName ?? "Organization report"}</span>
                  </div>
                  <time dateTime={item.report.createdAt.toISOString()}>
                    {formatDate(item.report.createdAt)}
                  </time>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">Completed agent runs will appear here.</p>
          )}
        </article>

        <article className="panel dashboard-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Queue</p>
              <h2>Recent runs</h2>
            </div>
          </div>
          {recentRuns.length > 0 ? (
            <div className="run-list">
              {recentRuns.map((item) => (
                <div className="run-row" key={item.run.id}>
                  <div>
                    <strong>{item.project.fullName}</strong>
                    <span>{formatDate(item.run.requestedAt)}</span>
                  </div>
                  <span className={`run-status ${item.run.status}`}>
                    {item.run.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No scans have been requested yet.</p>
          )}
        </article>
      </section>

      <section className="team-grid">
        <article className="panel dashboard-card">
          <h2>Members</h2>
          <div className="member-list">
            {organization.members.map((member) => (
              <div className="member-row" key={member.id}>
                <div>
                  <strong>{member.user.name}</strong>
                  <span>{member.user.email}</span>
                </div>
                <span className="role-pill">{member.role}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel dashboard-card">
          <h2>Connection model</h2>
          <p className="muted">
            Agents authenticate with a team token, poll openhacker.ai for work,
            run scans from the customer network, and post results back over
            outbound HTTPS.
          </p>
        </article>
      </section>
    </>
  );
}

function countSeverities(values: readonly string[]) {
  return values.reduce(
    (counts, severity) => {
      if (severity in counts) {
        counts[severity as keyof typeof counts] += 1;
      }

      return counts;
    },
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
