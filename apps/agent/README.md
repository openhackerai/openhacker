# openhacker instance

Your self-hosted OpenHacker security agent. This is a headless
[eve](https://eve.dev) app wrapped by Next.js only so it can be deployed on
Vercel. It does not ship a customer-facing web UI.

## What it does

- Runs the OpenHacker Eve agent inside the customer's deployment boundary.
- Uses the repository and scan instructions sent by the OpenHacker platform.
- Authenticates platform communication with `OPENHACKER_TOKEN`.
- Polls openhacker.ai on a Vercel Cron schedule, runs queued scans, and sends
  reports back to the platform.

## Deploy to Vercel

1. Push this directory to a Git repository.
2. Import it into Vercel.
3. Generate an agent token from `openhacker.ai/{team}`.
4. Add `OPENHACKER_TOKEN` to the deployment environment. Set
   `OPENHACKER_PLATFORM_URL` only when connecting to a non-production platform.
5. Enable Vercel Deployment Protection or equivalent network controls for the
   project so only the intended platform path can reach Eve routes.

Inference runs through the Vercel AI Gateway and authenticates automatically via Vercel
OIDC — no model API key required in production.

This package intentionally does not include a dashboard, forms, or local report
storage. Reports and findings belong in the OpenHacker platform.

The sync schedule claims one pending run at a time from:

```text
GET /api/agent/runs/next
```

It then runs Eve in this deployment and posts either:

```text
POST /api/agent/runs/{runId}/result
POST /api/agent/runs/{runId}/failure
```

## Local development

```bash
pnpm install
cp .env.example .env.local   # set AI_GATEWAY_API_KEY and OPENHACKER_TOKEN
pnpm dev
```

For local end-to-end testing with openhacker.ai running on port 3000 and this
agent running on port 3001, set:

```env
OPENHACKER_PLATFORM_URL=http://localhost:3000
OPENHACKER_AGENT_URL=http://localhost:3001
```

`pnpm dev` runs the Eve-enabled Next.js service locally. There is no local web
dashboard; use `pnpm eve:info` to inspect the discovered agent configuration.
