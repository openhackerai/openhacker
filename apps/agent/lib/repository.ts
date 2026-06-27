const OWNER_PATTERN = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const REPO_PATTERN = /^[a-z\d._-]{1,100}$/i;

export type RepositoryValidationResult =
  | { ok: true; repository: string }
  | { ok: false; error: string };

export function validateGitHubRepository(
  input: string,
): RepositoryValidationResult {
  const value = input.trim();

  if (!value) {
    return { ok: false, error: "Enter a GitHub repository." };
  }

  if (value.length > 200) {
    return { ok: false, error: "Repository input is too long." };
  }

  const path = extractRepositoryPath(value);
  if (!path) {
    return {
      ok: false,
      error: "Use owner/name or https://github.com/owner/name.",
    };
  }

  const normalizedPath = path.endsWith(".git") ? path.slice(0, -4) : path;
  const parts = normalizedPath.split("/");
  if (parts.length !== 2) {
    return {
      ok: false,
      error: "Use owner/name or https://github.com/owner/name.",
    };
  }

  const [owner, repo] = parts;
  if (!owner || !repo || !OWNER_PATTERN.test(owner) || !REPO_PATTERN.test(repo)) {
    return {
      ok: false,
      error: "Repository must be a valid GitHub owner/name pair.",
    };
  }

  if (repo === "." || repo === "..") {
    return {
      ok: false,
      error: "Repository must be a valid GitHub owner/name pair.",
    };
  }

  return { ok: true, repository: `${owner}/${repo}` };
}

function extractRepositoryPath(value: string): string | null {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (
        url.hostname.toLowerCase() !== "github.com" ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      ) {
        return null;
      }

      return url.pathname.replace(/^\/|\/$/g, "");
    } catch {
      return null;
    }
  }

  if (value.includes(":") || value.includes("\\") || value.includes("?")) {
    return null;
  }

  return value.replace(/^\/|\/$/g, "");
}
