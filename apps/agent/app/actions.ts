"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkRepoAccess } from "@/agent/lib/github";
import { runScan } from "@/agent/lib/scan";
import { getStore } from "@/agent/lib/store";
import type { Finding, Target } from "@/agent/lib/types";

function parseRepo(input: string): string | null {
  const trimmed = input.trim().replace(/\.git$/, "");
  const url = trimmed.match(/github\.com[/:]([^/]+\/[^/]+)/);
  const candidate = url ? url[1] : trimmed;
  return /^[^/\s]+\/[^/\s]+$/.test(candidate) ? candidate : null;
}

export async function addTarget(formData: FormData): Promise<void> {
  const repo = parseRepo(String(formData.get("repo") ?? ""));
  if (!repo) redirect("/?error=invalid-repo");

  const access = await checkRepoAccess(repo, null);
  const branch = access.defaultBranch || "main";

  const target: Target = {
    id: crypto.randomUUID(),
    name: repo.split("/")[1],
    repo,
    branch,
    provider: "github",
    hasToken: false,
    autoRemediate: false,
    createdAt: new Date().toISOString(),
  };

  const store = getStore();
  await store.saveTarget(target);

  revalidatePath("/");
  redirect(`/targets/${target.id}`);
}

export async function deleteTarget(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await getStore().deleteTarget(id);
  revalidatePath("/");
  redirect("/");
}

export async function scanTarget(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await runScan(id);
  revalidatePath("/");
  revalidatePath(`/targets/${id}`);
}

export async function setFindingStatus(formData: FormData): Promise<void> {
  const targetId = String(formData.get("targetId") ?? "");
  const findingId = String(formData.get("findingId") ?? "");
  const status = String(formData.get("status") ?? "open") as Finding["status"];

  const store = getStore();
  const findings = await store.listFindings(targetId);
  const match = findings.find((f) => f.id === findingId);
  if (match) await store.upsertFinding({ ...match, status });

  revalidatePath(`/targets/${targetId}`);
}
