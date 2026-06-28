CREATE TABLE "agent_token" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"label" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "finding" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"scan_run_id" text,
	"report_id" text,
	"severity" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"remediation" text,
	"package_name" text,
	"package_version" text,
	"advisory_id" text,
	"file_path" text,
	"line_start" integer,
	"line_end" integer,
	"fingerprint" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text DEFAULT 'github' NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"url" text NOT NULL,
	"default_branch" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"scan_run_id" text,
	"format" text DEFAULT 'markdown' NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"critical_count" integer DEFAULT 0 NOT NULL,
	"high_count" integer DEFAULT 0 NOT NULL,
	"medium_count" integer DEFAULT 0 NOT NULL,
	"low_count" integer DEFAULT 0 NOT NULL,
	"info_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_run" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"requested_by_user_id" text,
	"claimed_by_token_id" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"claimed_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"eve_session_id" text
);
--> statement-breakpoint
ALTER TABLE "agent_token" ADD CONSTRAINT "agent_token_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_token" ADD CONSTRAINT "agent_token_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding" ADD CONSTRAINT "finding_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding" ADD CONSTRAINT "finding_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding" ADD CONSTRAINT "finding_scan_run_id_scan_run_id_fk" FOREIGN KEY ("scan_run_id") REFERENCES "public"."scan_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding" ADD CONSTRAINT "finding_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_scan_run_id_scan_run_id_fk" FOREIGN KEY ("scan_run_id") REFERENCES "public"."scan_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_run" ADD CONSTRAINT "scan_run_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_run" ADD CONSTRAINT "scan_run_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_run" ADD CONSTRAINT "scan_run_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_run" ADD CONSTRAINT "scan_run_claimed_by_token_id_agent_token_id_fk" FOREIGN KEY ("claimed_by_token_id") REFERENCES "public"."agent_token"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agentToken_organizationId_idx" ON "agent_token" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agentToken_tokenHash_uidx" ON "agent_token" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "finding_organizationId_severity_idx" ON "finding" USING btree ("organization_id","severity");--> statement-breakpoint
CREATE INDEX "finding_reportId_idx" ON "finding" USING btree ("report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "finding_scanRunId_fingerprint_uidx" ON "finding" USING btree ("scan_run_id","fingerprint");--> statement-breakpoint
CREATE INDEX "project_organizationId_idx" ON "project" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_organizationId_fullName_uidx" ON "project" USING btree ("organization_id","full_name");--> statement-breakpoint
CREATE INDEX "report_organizationId_createdAt_idx" ON "report" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "report_scanRunId_idx" ON "report" USING btree ("scan_run_id");--> statement-breakpoint
CREATE INDEX "scanRun_organizationId_status_idx" ON "scan_run" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "scanRun_projectId_idx" ON "scan_run" USING btree ("project_id");