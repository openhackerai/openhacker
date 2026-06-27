#!/usr/bin/env bun
import { cp, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ORANGE = "\x1b[38;5;214m";
const MUTED = "\x1b[0;2m";
const RED = "\x1b[0;31m";
const NC = "\x1b[0m";

const EXCLUDE = new Set([
  "node_modules",
  ".eve",
  ".next",
  ".output",
  ".git",
  ".vercel",
  ".turbo",
]);

function resolveTemplateDir(): string {
  if (process.env.OPENHACKER_TEMPLATE_DIR) {
    return path.resolve(process.env.OPENHACKER_TEMPLATE_DIR);
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  // packages/cli/src -> repo root -> apps/agent
  return path.resolve(here, "../../../apps/agent");
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function init(targetArg?: string): Promise<void> {
  const template = resolveTemplateDir();
  if (!(await exists(path.join(template, "agent", "agent.ts")))) {
    console.error(`${RED}Could not find the instance template at ${template}.${NC}`);
    console.error(`${MUTED}Set OPENHACKER_TEMPLATE_DIR to the template directory.${NC}`);
    process.exit(1);
  }

  const dest = path.resolve(process.cwd(), targetArg ?? "openhacker");
  if (await exists(dest)) {
    console.error(`${RED}Destination already exists: ${dest}${NC}`);
    process.exit(1);
  }

  console.log(`\n${MUTED}Creating OpenHacker instance in ${NC}${dest}`);
  await cp(template, dest, {
    recursive: true,
    filter: (src) =>
      !src.split(path.sep).some((seg) => EXCLUDE.has(seg)) &&
      !src.endsWith("tsconfig.tsbuildinfo"),
  });

  const pkgPath = path.join(dest, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8")) as Record<string, unknown>;
  pkg.name = path.basename(dest).replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "openhacker";
  pkg.private = true;
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  console.log(`${ORANGE}\u2713${NC} OpenHacker instance ready.\n`);
  console.log("Next steps:\n");
  console.log(`  cd ${path.relative(process.cwd(), dest) || "."}`);
  console.log("  pnpm install");
  console.log("  pnpm dev                 # run locally\n");
  console.log(`${MUTED}Deploy: push to a git repo and import it into Vercel (deploys as one project).`);
  console.log(`Add a Vercel KV / Upstash Redis integration to persist findings. See README.md.${NC}\n`);
}

function usage(): void {
  console.log(`OpenHacker\n`);
  console.log("Usage:");
  console.log("  openhacker init [dir]   Scaffold a deployable OpenHacker instance\n");
}

const [command, arg] = process.argv.slice(2);

switch (command) {
  case "init":
    await init(arg);
    break;
  case undefined:
  case "-h":
  case "--help":
    usage();
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    usage();
    process.exit(1);
}
