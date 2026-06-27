# Openhacker

OpenHacker is a self-hosted autonomous application-security agent. You scaffold an
instance, deploy it to Vercel, then manage everything from its dashboard: connect
repositories, pick a model, and let it continuously scan for vulnerabilities and open
remediation PRs.

## Packages

| Package | Description |
| --- | --- |
| [`apps/agent`](./apps/agent) | The deployable instance: Next.js dashboard + embedded [eve](https://eve.dev) agent. This is the template `openhacker init` emits. |
| [`apps/web`](./apps/web) | Marketing site (openhacker.ai) + release installer |
| [`packages/cli`](./packages/cli) | `openhacker init` scaffolder |
| [`packages/openhacker`](./packages/openhacker) | npm package |

## Create and run an instance

```bash
# scaffold a deployable instance (uses apps/agent as the template)
npx openhacker my-instance   # or from this repo: pnpm run init -- my-instance

cd my-instance
pnpm install
pnpm dev                     # dashboard + eve agent together
```

Then open the printed URL, add a GitHub repo as a target, and click **Scan now**.

## How the instance works

- **One Vercel deploy.** `next.config.ts` wraps the app with `withEve`, so the dashboard
  and the eve agent (routes, tools, schedules) ship as a single project.
- **Inference via Vercel AI Gateway.** On Vercel it authenticates automatically through
  `VERCEL_OIDC_TOKEN` — no model key needed. Locally, set `AI_GATEWAY_API_KEY`.
- **Continuous scanning.** The `daily_audit` schedule becomes a Vercel Cron Job and
  re-checks every target's dependencies against [OSV](https://osv.dev), so newly
  disclosed advisories are caught without a code change.
- **Persistence.** Add a Vercel KV / Upstash Redis integration (`KV_REST_API_URL` /
  `KV_REST_API_TOKEN`). Without it, an in-memory store is used (non-persistent).

See [`apps/agent/README.md`](./apps/agent/README.md) and
[`apps/agent/.env.example`](./apps/agent/.env.example) for the full instance setup.

## Develop the monorepo

```bash
pnpm install
pnpm dev          # marketing site (apps/web)
pnpm agent:dev    # the instance (apps/agent): dashboard + eve agent
pnpm agent:info   # inspect eve discovery (tools, schedules)
```

## Install CLI from releases

```bash
curl -fsSL https://openhacker.ai/install | bash
```

## Publish release assets

Push a version tag and GitHub Actions will build and publish the release archives used by the installer:

```bash
git tag v0.1.0
git push origin v0.1.0
```
