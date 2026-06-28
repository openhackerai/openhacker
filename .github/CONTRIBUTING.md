# Contributing

Thanks for your interest in openhacker. This guide covers how to work on the monorepo locally.

## Packages

| Package                                        | Description                                                                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/agent`](../apps/agent)                   | The headless deployable [eve](https://eve.dev) agent. This is the template `openhacker init` emits.                            |
| [`apps/web`](../apps/web)                       | openhacker.ai site (openhacker.ai)                                                                                                |
| [`packages/openhacker`](../packages/openhacker) | npm package: the `openhacker` (`npx openhacker`) scaffolder                                                                       |

## Setup

```bash
pnpm install
```

## Develop

```bash
pnpm dev          # marketing site (apps/web)
pnpm agent:dev    # the headless Eve agent service
pnpm agent:info   # inspect eve discovery (tools, schedules)
```

## Scaffold an instance from the repo

To test the scaffolder template without publishing:

```bash
pnpm run init my-instance
cd my-instance
pnpm dev
```

See [`apps/agent/README.md`](../apps/agent/README.md) and
[`apps/agent/.env.example`](../apps/agent/.env.example) for the full instance setup.
