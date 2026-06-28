import { spawnSync } from "node:child_process";
import { cp, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ORANGE = "\x1b[38;5;214m";
const MUTED = "\x1b[0;2m";
const RED = "\x1b[0;31m";
const NC = "\x1b[0m";

const EXCLUDE = new Set([
  ".env",
  ".env.local",
  "node_modules",
  ".eve",
  ".next",
  ".output",
  ".git",
  ".vercel",
  ".turbo",
]);

// Written into scaffolded projects directly rather than shipped as a template
// file, because npm renames a packaged `.gitignore` to `.npmignore` on publish.
const GITIGNORE = `# dependencies
node_modules

# next.js
.next
next-env.d.ts

# eve build artifacts
.eve
.output

# vercel / turbo
.vercel
.turbo

# typescript
tsconfig.tsbuildinfo

# env files (keep the example)
.env
.env.*
!.env.example

# misc
.DS_Store
*.log
`;

const here = path.dirname(fileURLToPath(import.meta.url));

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveTemplateDir() {
  const candidates = [];

  if (process.env.OPENHACKER_TEMPLATE_DIR) {
    candidates.push(path.resolve(process.env.OPENHACKER_TEMPLATE_DIR));
  }

  candidates.push(
    // npm package layout: packages/openhacker/src -> packages/openhacker/templates/agent
    path.resolve(here, "../templates/agent"),
    // monorepo layout: packages/openhacker/src -> repo root -> apps/agent
    path.resolve(here, "../../../apps/agent"),
  );

  for (const candidate of candidates) {
    if (await exists(path.join(candidate, "agent", "agent.ts"))) {
      return candidate;
    }
  }

  return candidates[0];
}

function packageNameFor(dest) {
  return (
    path
      .basename(dest)
      .replace(/[^a-z0-9-]+/gi, "-")
      .toLowerCase() || "openhacker"
  );
}

function shouldCopyTemplatePath(src, root) {
  const relative = path.relative(root, src);
  const segments = relative.split(path.sep);

  return (
    !segments.some((seg) => EXCLUDE.has(seg)) &&
    !relative.endsWith("next-env.d.ts") &&
    !relative.endsWith("tsconfig.tsbuildinfo")
  );
}

function runStep(command, args, cwd, { quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: quiet ? "ignore" : "inherit",
    shell: process.platform === "win32",
  });

  return !result.error && result.status === 0;
}

function hasCommand(command) {
  const probe = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(probe, [command], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  return !result.error && result.status === 0;
}

function isInsideGitRepo(cwd) {
  const result = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd,
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  return !result.error && result.status === 0;
}

async function installDependencies(dest) {
  if (!hasCommand("pnpm")) {
    console.log(
      `${MUTED}pnpm not found — skipping install. Run \`pnpm install\` manually.${NC}`,
    );
    return false;
  }

  console.log(`\n${MUTED}Installing dependencies with pnpm…${NC}`);
  // --ignore-workspace keeps the install self-contained: without it, pnpm walks
  // up to a parent pnpm-workspace.yaml (e.g. when scaffolding inside a monorepo)
  // and installs that workspace instead of the new project's node_modules.
  const ok = runStep("pnpm", ["install", "--ignore-workspace"], dest);
  if (!ok) {
    console.log(
      `${RED}pnpm install failed.${NC} ${MUTED}You can re-run it inside the project.${NC}`,
    );
  }
  return ok;
}

async function initGitRepo(dest) {
  if (!hasCommand("git")) {
    console.log(`${MUTED}git not found — skipping repository init.${NC}`);
    return false;
  }

  if (isInsideGitRepo(dest)) {
    console.log(
      `${MUTED}Already inside a git repository — skipping git init.${NC}`,
    );
    return false;
  }

  const initialized =
    runStep("git", ["init"], dest, { quiet: true }) &&
    runStep("git", ["add", "-A"], dest, { quiet: true }) &&
    runStep("git", ["commit", "-m", "Initial commit from openhacker"], dest, {
      quiet: true,
    });

  if (initialized) {
    console.log(`${MUTED}Initialized a git repository.${NC}`);
  } else {
    console.log(
      `${MUTED}Could not create the initial git commit — you can do it manually.${NC}`,
    );
  }
  return initialized;
}

async function init(targetArg, { skipInstall = false, skipGit = false } = {}) {
  const template = await resolveTemplateDir();
  if (!(await exists(path.join(template, "agent", "agent.ts")))) {
    console.error(
      `${RED}Could not find the instance template at ${template}.${NC}`,
    );
    console.error(
      `${MUTED}Set OPENHACKER_TEMPLATE_DIR to the template directory.${NC}`,
    );
    process.exit(1);
  }

  const dest = path.resolve(process.cwd(), targetArg ?? "openhacker");
  if (await exists(dest)) {
    console.error(`${RED}Destination already exists: ${dest}${NC}`);
    process.exit(1);
  }

  console.log(`\n${MUTED}Creating openhacker instance in ${NC}${dest}`);
  await cp(template, dest, {
    recursive: true,
    filter: (src) => shouldCopyTemplatePath(src, template),
  });

  const pkgPath = path.join(dest, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  pkg.name = packageNameFor(dest);
  pkg.private = true;
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  // Write before git init so the initial commit doesn't include node_modules/.env.
  if (!(await exists(path.join(dest, ".gitignore")))) {
    await writeFile(path.join(dest, ".gitignore"), GITIGNORE);
  }

  const installed = skipInstall ? false : await installDependencies(dest);
  if (!skipGit) {
    await initGitRepo(dest);
  }

  console.log(`\n${ORANGE}✓${NC} openhacker instance ready.\n`);
  console.log("Next steps:\n");
  console.log(`  cd ${path.relative(process.cwd(), dest) || "."}`);
  if (skipInstall || !installed) {
    console.log("  pnpm install");
  }
  console.log(
    "  pnpm dlx vercel link    # link a Vercel project for AI/LLM access",
  );
  console.log("  pnpm eve:info            # verify the headless Eve agent\n");
  console.log("  pnpm dev                 # optional local agent service\n");
  console.log(
    "\nGenerate an agent token in openhacker.ai, then set these Vercel env vars:",
  );
  console.log("  OPENHACKER_TOKEN=ohag_...");
  console.log("  OPENHACKER_PLATFORM_URL=https://openhacker.ai\n");
  console.log(
    `${MUTED}Deploy: push to a git repo and import it into Vercel. The agent polls openhacker.ai for queued scans.${NC}`,
  );
  console.log(`${MUTED}See README.md for deployment and local model configuration.${NC}\n`);
}

function usage() {
  console.log("openhacker\n");
  console.log("Usage:");
  console.log(
    "  openhacker [dir]        Scaffold a deployable openhacker instance",
  );
  console.log("  openhacker init [dir]   Same as above");
  console.log("  openhacker --help       Show help");
  console.log("  openhacker --version    Show version\n");
  console.log("Options:");
  console.log("  --skip-install          Don't run pnpm install");
  console.log("  --skip-git              Don't create a git repository\n");
}

async function version() {
  const pkg = JSON.parse(
    await readFile(path.resolve(here, "../package.json"), "utf8"),
  );
  console.log(pkg.version);
}

export async function run(args = process.argv.slice(2)) {
  const options = { skipInstall: false, skipGit: false };
  const positionals = [];

  for (const arg of args) {
    switch (arg) {
      case "--skip-install":
        options.skipInstall = true;
        break;
      case "--skip-git":
        options.skipGit = true;
        break;
      case "-h":
      case "--help":
        usage();
        return;
      case "-v":
      case "--version":
        await version();
        return;
      default:
        if (arg.startsWith("-")) {
          console.error(`${RED}Unknown option: ${arg}${NC}\n`);
          usage();
          process.exit(1);
        }
        positionals.push(arg);
    }
  }

  const [command, target, ...rest] = positionals;

  if (rest.length > 0) {
    console.error(`${RED}Too many arguments.${NC}\n`);
    usage();
    process.exit(1);
  }

  if (command === "init") {
    await init(target, options);
    return;
  }

  await init(command, options);
}
