import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { project, report } from "../../../lib/db/app-schema";
import { db } from "../../../lib/db";
import { getTeamPageContext } from "../../../lib/team";

type ReportsPageProps = {
  params: Promise<{
    team: string;
  }>;
};

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { team } = await params;
  const { organization } = await getTeamPageContext(team);
  const reports = await db
    .select({
      report,
      project,
    })
    .from(report)
    .leftJoin(project, eq(report.projectId, project.id))
    .where(eq(report.organizationId, organization.id))
    .orderBy(desc(report.createdAt))
    .limit(100);

  return (
    <>
      <section className="panel team-hero">
        <p className="eyebrow">Reports</p>
        <h1>Agent findings history</h1>
        <p className="lede">
          Every completed Eve run publishes a report here with the findings that
          came back from your customer-deployed agents.
        </p>
      </section>

      <section className="panel dashboard-card">
        {reports.length > 0 ? (
          <div className="reports-table">
            <div className="reports-table-header">
              <span>Report</span>
              <span>Project</span>
              <span>Findings</span>
              <span>Created</span>
            </div>
            {reports.map((item) => (
              <Link
                className="reports-table-row"
                href={`/${team}/reports/${item.report.id}`}
                key={item.report.id}
              >
                <span>
                  <strong>{item.report.title}</strong>
                  <small>{item.report.summary ?? "No summary provided."}</small>
                </span>
                <span>{item.project?.fullName ?? "Organization"}</span>
                <span>
                  {item.report.criticalCount + item.report.highCount} urgent /{" "}
                  {totalFindings(item.report)} total
                </span>
                <time dateTime={item.report.createdAt.toISOString()}>
                  {formatDate(item.report.createdAt)}
                </time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No reports yet</p>
            <h2>Queue a scan from Overview</h2>
            <p className="muted">
              Once a connected agent claims the run and posts results, the
              report will be available here.
            </p>
            <Link className="button primary" href={`/${team}`}>
              Back to overview
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

function totalFindings(item: {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
}) {
  return (
    item.criticalCount +
    item.highCount +
    item.mediumCount +
    item.lowCount +
    item.infoCount
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
