import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: text("provider").default("github").notNull(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    url: text("url").notNull(),
    defaultBranch: text("default_branch"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("project_organizationId_idx").on(table.organizationId),
    uniqueIndex("project_organizationId_fullName_uidx").on(
      table.organizationId,
      table.fullName,
    ),
  ],
);

export const agentToken = pgTable(
  "agent_token",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    index("agentToken_organizationId_idx").on(table.organizationId),
    uniqueIndex("agentToken_tokenHash_uidx").on(table.tokenHash),
  ],
);

export const scanRun = pgTable(
  "scan_run",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    status: text("status").default("pending").notNull(),
    trigger: text("trigger").default("manual").notNull(),
    requestedByUserId: text("requested_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    claimedByTokenId: text("claimed_by_token_id").references(
      () => agentToken.id,
      { onDelete: "set null" },
    ),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    claimedAt: timestamp("claimed_at"),
    completedAt: timestamp("completed_at"),
    errorMessage: text("error_message"),
    eveSessionId: text("eve_session_id"),
  },
  (table) => [
    index("scanRun_organizationId_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("scanRun_projectId_idx").on(table.projectId),
  ],
);

export const report = pgTable(
  "report",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    scanRunId: text("scan_run_id").references(() => scanRun.id, {
      onDelete: "set null",
    }),
    format: text("format").default("markdown").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    content: text("content").notNull(),
    criticalCount: integer("critical_count").default(0).notNull(),
    highCount: integer("high_count").default(0).notNull(),
    mediumCount: integer("medium_count").default(0).notNull(),
    lowCount: integer("low_count").default(0).notNull(),
    infoCount: integer("info_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("report_organizationId_createdAt_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("report_scanRunId_idx").on(table.scanRunId),
  ],
);

export const finding = pgTable(
  "finding",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    scanRunId: text("scan_run_id").references(() => scanRun.id, {
      onDelete: "set null",
    }),
    reportId: text("report_id").references(() => report.id, {
      onDelete: "cascade",
    }),
    severity: text("severity").default("info").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    remediation: text("remediation"),
    packageName: text("package_name"),
    packageVersion: text("package_version"),
    advisoryId: text("advisory_id"),
    filePath: text("file_path"),
    lineStart: integer("line_start"),
    lineEnd: integer("line_end"),
    fingerprint: text("fingerprint").notNull(),
    status: text("status").default("open").notNull(),
    firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  },
  (table) => [
    index("finding_organizationId_severity_idx").on(
      table.organizationId,
      table.severity,
    ),
    index("finding_reportId_idx").on(table.reportId),
    uniqueIndex("finding_scanRunId_fingerprint_uidx").on(
      table.scanRunId,
      table.fingerprint,
    ),
  ],
);

export const projectRelations = relations(project, ({ one, many }) => ({
  organization: one(organization, {
    fields: [project.organizationId],
    references: [organization.id],
  }),
  scanRuns: many(scanRun),
  reports: many(report),
  findings: many(finding),
}));

export const agentTokenRelations = relations(agentToken, ({ one, many }) => ({
  organization: one(organization, {
    fields: [agentToken.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [agentToken.createdByUserId],
    references: [user.id],
  }),
  claimedRuns: many(scanRun),
}));

export const scanRunRelations = relations(scanRun, ({ one, many }) => ({
  organization: one(organization, {
    fields: [scanRun.organizationId],
    references: [organization.id],
  }),
  project: one(project, {
    fields: [scanRun.projectId],
    references: [project.id],
  }),
  claimedByToken: one(agentToken, {
    fields: [scanRun.claimedByTokenId],
    references: [agentToken.id],
  }),
  requestedBy: one(user, {
    fields: [scanRun.requestedByUserId],
    references: [user.id],
  }),
  reports: many(report),
  findings: many(finding),
}));

export const reportRelations = relations(report, ({ one, many }) => ({
  organization: one(organization, {
    fields: [report.organizationId],
    references: [organization.id],
  }),
  project: one(project, {
    fields: [report.projectId],
    references: [project.id],
  }),
  scanRun: one(scanRun, {
    fields: [report.scanRunId],
    references: [scanRun.id],
  }),
  findings: many(finding),
}));

export const findingRelations = relations(finding, ({ one }) => ({
  organization: one(organization, {
    fields: [finding.organizationId],
    references: [organization.id],
  }),
  project: one(project, {
    fields: [finding.projectId],
    references: [project.id],
  }),
  scanRun: one(scanRun, {
    fields: [finding.scanRunId],
    references: [scanRun.id],
  }),
  report: one(report, {
    fields: [finding.reportId],
    references: [report.id],
  }),
}));
