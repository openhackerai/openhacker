# openhacker

openhacker is a self-hosted autonomous security agent built using [eve](https://eve.dev). You scaffold an instance, deploy it to Vercel, then use its dashboard to paste a GitHub repository and have the agent analyze it for vulnerabilities.

## Create and run an instance

```bash
npx openhacker my-openhacker-app

cd my-openhacker-app
pnpm dev
```

`npx openhacker` scaffolds the instance, runs `pnpm install`, and creates an initial
git commit automatically (pass `--skip-install` or `--skip-git` to opt out).

Then open the printed URL, paste a GitHub repo, and click **Analyze**.

## How the instance works

- **One Vercel deploy.** `next.config.ts` wraps the app with `withEve`, so the dashboard
  and the eve agent ship as a single project.
- **Protected dashboard.** Deployments are intended to run behind Vercel
  Deployment Protection. The browser calls the eve channel directly, so the
  deployment gate is the production access boundary.
- **Inference via Vercel AI Gateway.** On Vercel it authenticates automatically through
  `VERCEL_OIDC_TOKEN` — no model key needed. Locally, set `AI_GATEWAY_API_KEY`.
- **Simple storage for now.** This starter intentionally does not configure
  external persistence yet.

## Contributing

See [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md) for monorepo setup and development commands.
