# openhacker instance

Your self-hosted OpenHacker security agent. This is a headless
[eve](https://eve.dev) app wrapped by Next.js only so it can be deployed on
Vercel. It does not ship a customer-facing web UI.

## What it does

- Runs the OpenHacker Eve agent inside the customer's deployment boundary.
- Uses the repository and scan instructions sent by the OpenHacker platform.
- Authenticates platform communication with `OPENHACKER_TOKEN`.

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

## Local development

```bash
pnpm install
cp .env.example .env.local   # set AI_GATEWAY_API_KEY and OPENHACKER_TOKEN
pnpm dev
```

`pnpm dev` runs the Eve-enabled Next.js service locally. There is no local web
dashboard; use `pnpm eve:info` to inspect the discovered agent configuration.
