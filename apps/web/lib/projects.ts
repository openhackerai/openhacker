import { randomUUID } from "node:crypto";
import { project } from "./db/app-schema";
import { db } from "./db";

type GitHubRepository = {
  readonly owner: string;
  readonly name: string;
  readonly repository: string;
  readonly url: string;
};

export async function ensureProject(
  organizationId: string,
  repository: GitHubRepository,
) {
  const [existingProject] = await db
    .insert(project)
    .values({
      id: randomUUID(),
      organizationId,
      provider: "github",
      owner: repository.owner,
      name: repository.name,
      fullName: repository.repository,
      url: repository.url,
    })
    .onConflictDoUpdate({
      target: [project.organizationId, project.fullName],
      set: {
        owner: repository.owner,
        name: repository.name,
        url: repository.url,
        updatedAt: new Date(),
      },
    })
    .returning();

  return existingProject;
}
