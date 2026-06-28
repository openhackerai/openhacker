import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { finding, project, report, scanRun } from "../../../../lib/db/app-schema";
import { db } from "../../../../lib/db";
import { getTeamPageContext } from "../../../../lib/team";

type ReportDetailPageProps = {
  params: Promise<{
    team: string;
    reportId: string;
  }>;
};

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { team, reportId } = await params;
  const { organization } = await getTeamPageContext(team);
  const [record] = await db
    .select({
      report,
      project,
      run: scanRun,
    })
    .from(report)
    .leftJoin(project, eq(report.projectId, project.id))
    .leftJoin(scanRun, eq(report.scanRunId, scanRun.id))
    .where(and(eq(report.id, reportId), eq(report.organizationId, organization.id)))
    .limit(1);

  if (!record) {
    notFound();
  }

  const findings = await db
    .select()
    .from(finding)
    .where(eq(finding.reportId, record.report.id))
    .orderBy(desc(finding.firstSeenAt));

  return (
    <>
      <section className="panel team-hero report-hero">
        <p className="eyebrow">Report detail</p>
        <h1>{record.report.title}</h1>
        <p className="lede">
          {record.project?.fullName ?? "Organization report"} ·{" "}
          {formatDate(record.report.createdAt)}
        </p>
        <div className="team-links">
          <Link href={`/${team}/reports`}>Back to reports</Link>
          {record.project ? (
            <a href={record.project.url} rel="noreferrer" target="_blank">
              Open repository
            </a>
          ) : null}
        </div>
      </section>

      <section className="metric-grid" aria-label="Report severity summary">
        <article className="panel metric-card">
          <span>Critical</span>
          <strong>{record.report.criticalCount}</strong>
          <p>Immediate attention</p>
        </article>
        <article className="panel metric-card">
          <span>High</span>
          <strong>{record.report.highCount}</strong>
          <p>Prioritize fixes</p>
        </article>
        <article className="panel metric-card">
          <span>Medium</span>
          <strong>{record.report.mediumCount}</strong>
          <p>Planned remediation</p>
        </article>
        <article className="panel metric-card">
          <span>Low / info</span>
          <strong>{record.report.lowCount + record.report.infoCount}</strong>
          <p>Track and review</p>
        </article>
      </section>

      <section className="dashboard-grid report-detail-grid">
        <article className="panel dashboard-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Structured findings</p>
              <h2>{findings.length} findings</h2>
            </div>
          </div>
          {findings.length > 0 ? (
            <div className="finding-detail-list">
              {findings.map((item) => (
                <div className="finding-detail" key={item.id}>
                  <div className="finding-detail-title">
                    <span className={`run-status ${item.severity}`}>
                      {item.severity}
                    </span>
                    <strong>{item.title}</strong>
                  </div>
                  {item.description ? <p>{item.description}</p> : null}
                  {item.remediation ? (
                    <p className="muted">Fix: {item.remediation}</p>
                  ) : null}
                  <div className="finding-meta">
                    {item.filePath ? <span>{item.filePath}</span> : null}
                    {item.advisoryId ? <span>{item.advisoryId}</span> : null}
                    {item.packageName ? <span>{item.packageName}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              This report did not include structured findings. Review the raw
              report below.
            </p>
          )}
        </article>

        <article className="panel dashboard-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Run metadata</p>
              <h2>{record.run?.status ?? "completed"}</h2>
            </div>
          </div>
          <dl className="metadata-list">
            <div>
              <dt>Project</dt>
              <dd>{record.project?.fullName ?? "Organization"}</dd>
            </div>
            <div>
              <dt>Requested</dt>
              <dd>
                {record.run ? formatDate(record.run.requestedAt) : "Unknown"}
              </dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{formatDate(record.report.createdAt)}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="panel dashboard-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Raw report</p>
            <h2>Markdown from Eve</h2>
          </div>
        </div>
        <pre className="markdown-report">{record.report.content}</pre>
      </section>
    </>
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
