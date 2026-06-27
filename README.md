# Openhacker

OpenHacker is a self-hosted autonomous application-security agent. You scaffold an
instance, deploy it to Vercel, then manage everything from its dashboard: connect
repositories, pick a model, and let it continuously scan for vulnerabilities and open
remediation PRs.

## Packages

| Package | Description |
| --- | --- |
| [`apps/agent`](./apps/agent) | The deployable instance: Next.js dashboard + embedded [eve](https://eve.dev) agent. This is the template `openhacker init` emits. |
| [`apps/web`](./apps/web) | Marketing site (openhacker.ai) |
| [`packages/openhacker`](./packages/openhacker) | npm package: the `openhacker` (`npx openhacker`) scaffolder |

## Create and run an instance

```bash
# scaffold a deployable instance (uses apps/agent as the template)
npx openhacker my-instance   # or from this repo: pnpm run init my-instance

cd my-instance
pnpm dev                     # dashboard + eve agent together
```

`npx openhacker` scaffolds the instance, runs `pnpm install`, and creates an initial
git commit automatically (pass `--skip-install` or `--skip-git` to opt out).

Then open the printed URL, add a GitHub repo as a target, and click **Scan now**.

## How the instance works

- **One Vercel deploy.** `next.config.ts` wraps the app with `withEve`, so the dashboard
  and the eve agent (routes, tools, schedules) ship as a single project.
- **Protected dashboard.** Deployments are intended to run behind Vercel
  Deployment Protection. The browser calls the eve channel directly, so the
  deployment gate is the production access boundary.
- **Inference via Vercel AI Gateway.** On Vercel it authenticates automatically through
  `VERCEL_OIDC_TOKEN` — no model key needed. Locally, set `AI_GATEWAY_API_KEY`.
- **Continuous scanning.** The `daily_audit` schedule becomes a Vercel Cron Job and
  re-checks every target's dependencies against [OSV](https://osv.dev), so newly
  disclosed advisories are caught without a code change.
- **Simple storage for now.** This starter intentionally does not configure
  external persistence yet.

See [`apps/agent/README.md`](./apps/agent/README.md) and
[`apps/agent/.env.example`](./apps/agent/.env.example) for the full instance setup.

## Develop the monorepo

```bash
pnpm install
pnpm dev          # marketing site (apps/web)
pnpm agent:dev    # the instance (apps/agent): dashboard + eve agent
pnpm agent:info   # inspect eve discovery (tools, schedules)
```
