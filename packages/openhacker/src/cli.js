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
  return path.basename(dest).replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "openhacker";
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

async function init(targetArg) {
  const template = await resolveTemplateDir();
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
    filter: (src) => shouldCopyTemplatePath(src, template),
  });

  const pkgPath = path.join(dest, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  pkg.name = packageNameFor(dest);
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

function usage() {
  console.log("OpenHacker\n");
  console.log("Usage:");
  console.log("  openhacker [dir]        Scaffold a deployable OpenHacker instance");
  console.log("  openhacker init [dir]   Same as above");
  console.log("  openhacker --help       Show help");
  console.log("  openhacker --version    Show version\n");
}

async function version() {
  const pkg = JSON.parse(await readFile(path.resolve(here, "../package.json"), "utf8"));
  console.log(pkg.version);
}

export async function run(args = process.argv.slice(2)) {
  const [command, target, ...rest] = args;

  if (rest.length > 0) {
    console.error(`${RED}Too many arguments.${NC}\n`);
    usage();
    process.exit(1);
  }

  switch (command) {
    case undefined:
      await init();
      break;
    case "init":
      await init(target);
      break;
    case "-h":
    case "--help":
      usage();
      break;
    case "-v":
    case "--version":
      await version();
      break;
    default:
      if (command.startsWith("-")) {
        console.error(`${RED}Unknown option: ${command}${NC}\n`);
        usage();
        process.exit(1);
      }
      await init(command);
  }
}
