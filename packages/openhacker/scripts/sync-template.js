import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const packageRoot = path.resolve(here, "..");
const source = path.resolve(
  process.env.OPENHACKER_TEMPLATE_DIR ??
    path.join(packageRoot, "../../apps/agent"),
);
const dest = path.join(packageRoot, "templates/agent");

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function shouldCopyTemplatePath(src) {
  const relative = path.relative(source, src);
  const segments = relative.split(path.sep);

  return (
    !segments.some((seg) => EXCLUDE.has(seg)) &&
    !relative.endsWith("next-env.d.ts") &&
    !relative.endsWith("tsconfig.tsbuildinfo")
  );
}

if (!(await exists(path.join(source, "agent", "agent.ts")))) {
  throw new Error(`Could not find the openhacker app template at ${source}`);
}

await rm(dest, { recursive: true, force: true });
await mkdir(path.dirname(dest), { recursive: true });
await cp(source, dest, {
  recursive: true,
  filter: shouldCopyTemplatePath,
});

console.log(`Synced openhacker template from ${source}`);
