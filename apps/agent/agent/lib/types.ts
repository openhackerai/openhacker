export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FindingCategory =
  | "dependency"
  | "injection"
  | "authz"
  | "ssrf"
  | "secrets"
  | "xss"
  | "deserialization"
  | "other";

export type Target = {
  id: string;
  name: string;
  /** "owner/name" on GitHub. */
  repo: string;
  branch: string;
  provider: "github";
  hasToken: boolean;
  autoRemediate: boolean;
  createdAt: string;
  lastScanAt?: string;
  lastScanStatus?: "ok" | "error";
  lastScanError?: string;
};

export type Finding = {
  id: string;
  targetId: string;
  title: string;
  severity: Severity;
  category: FindingCategory;
  packageName?: string;
  installedVersion?: string;
  advisoryIds?: string[];
  location?: { file: string; startLine?: number; endLine?: number; symbol?: string };
  proof: { status: "proven" | "likely" | "unconfirmed"; evidence?: string; poc?: string };
  remediation?: { summary: string; fixedVersion?: string; prUrl?: string };
  status: "open" | "triaged" | "fixed" | "ignored" | "false_positive";
  references?: string[];
  firstSeen: string;
  lastSeen: string;
};
