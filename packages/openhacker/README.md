# openhacker

Scaffold a headless OpenHacker Eve agent that connects to openhacker.ai.

## Create an instance

```bash
npx openhacker
cd openhacker
pnpm eve:info
```

Running `npx openhacker` with no arguments creates `./openhacker`.

Generate an agent token in openhacker.ai, set `OPENHACKER_TOKEN` on the Vercel
project, then deploy the generated app. The agent polls openhacker.ai for queued
repository scans and posts reports back to the platform.
