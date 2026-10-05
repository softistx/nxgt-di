# nxgt-di

A dependency-injection container for applications built on the nxgt packages,
with typed Tokens: a missing or captive dependency fails to compile.

| Package | |
| --- | --- |
| [`@nxgt/di`](packages/di) | the container: Tokens, Providers, lifetimes, Scopes, disposal. No dependency. Not yet published |

The vocabulary is in [CONTEXT.md](CONTEXT.md); the decisions behind it are in
[docs/adr/](docs/adr).

## Develop

```sh
bun install
bun run build && bun run typecheck && bun run test
bunx biome ci
bun run verify:artifacts
```

[AGENTS.md](AGENTS.md) has the rules.
