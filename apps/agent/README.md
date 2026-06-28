# openhacker instance

Your self-hosted openhacker security agent — a Next.js dashboard with an embedded
[eve](https://eve.dev) agent, deployable to Vercel as a single project.

## What it does

- Continuously scans the repositories you connect for vulnerable dependencies (via OSV).
- Records findings with computed CVSS severity and fix versions.
- A daily schedule (Vercel Cron) re-scans every target so newly disclosed advisories are
  caught even when your code hasn't changed.
- The eve agent layers code-level analysis (reachability, injection, authz) on top.

## Deploy to Vercel

1. Push this directory to a Git repository.
2. Import it into Vercel (it deploys as one project — UI + agent + cron).
3. Enable Vercel Deployment Protection for the project so only approved users
   can reach the dashboard and eve routes.
4. Open the deployment URL and add a target repository.

Inference runs through the Vercel AI Gateway and authenticates automatically via Vercel
OIDC — no model API key required in production.

The main screen calls the eve channel directly. This is safe only when the
deployment is protected by Vercel Deployment Protection; without that gate,
`/eve/v1/*` is a public compute endpoint. The UI validates GitHub repository
names before it sends the agent message.

This starter intentionally does not configure external persistence yet.

## Local development

```bash
pnpm install
cp .env.example .env.local   # set AI_GATEWAY_API_KEY for local agent runs
pnpm dev
```

`pnpm dev` runs the Next.js dashboard and the eve agent together. Open the printed URL,
add a target, and click **Scan now**.
