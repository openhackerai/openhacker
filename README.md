# openhacker

openhacker is a security platform with a headless customer-deployed
[eve](https://eve.dev) agent. You scaffold the agent, deploy it to Vercel in
your own environment, connect it to openhacker.ai with a team token, then queue
repository scans from the openhacker.ai dashboard.

## Create and run an instance

```bash
npx openhacker my-openhacker-app

cd my-openhacker-app
pnpm eve:info
```

`npx openhacker` scaffolds the instance, runs `pnpm install`, and creates an initial
git commit automatically (pass `--skip-install` or `--skip-git` to opt out).

Then generate an agent token in openhacker.ai and set these Vercel environment
variables on the scaffolded agent project:

```env
OPENHACKER_TOKEN=ohag_...
```

Deploy the project to Vercel. The agent polls openhacker.ai for queued scans,
runs Eve inside your deployment boundary, and sends reports back to the
platform.

## How the instance works

- **Headless Vercel deploy.** `next.config.ts` wraps the app with `withEve`, so
  the Eve agent and its schedule deploy as one project.
- **Outbound sync.** The agent uses `OPENHACKER_TOKEN` to claim work from
  openhacker.ai and post scan results back to the platform.
- **Inference via Vercel AI Gateway.** On Vercel it authenticates automatically through
  `VERCEL_OIDC_TOKEN` — no model key needed. Locally, set `AI_GATEWAY_API_KEY`.
- **Platform storage.** Reports and findings are stored in openhacker.ai, not
  in the customer-deployed agent.

## Contributing

See [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md) for monorepo setup and development commands.
