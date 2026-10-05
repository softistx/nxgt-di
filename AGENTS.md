# AGENTS.md

Instructions for any coding agent working in `nxgt-di`.

## What this repository is

A dependency-injection container for **applications** built on the nxgt
packages, published to the public npm registry. Applications are its only
consumers: no `@nxgt/*` library package depends on it.

| package | what it is |
| --- | --- |
| `@nxgt/di` | the core: typed Tokens, a Container whose type grows with each `provide`, lifetimes, Scopes, Slots, disposal. **No dependency at all**, and no `reflect-metadata` |
| `@nxgt/di-hono` | *(to come)* a Hono middleware: a lazy Scope per request, disposed in `finally` |

The vocabulary (Token, Provider, Container, Scope, Slot, Captive dependency...)
is in [CONTEXT.md](./CONTEXT.md); use those words. The decisions are in
[docs/adr/](./docs/adr): typed Tokens rather than decorators (0001), and the
Token's name as the type-level key (0002). A change that contradicts one needs a
new ADR, not a quiet edit.

It is **Bun-first**: ESM, tested with `bun test`, no Bun-only API in the library.

## Layering

`@nxgt/di` depends on nothing. `@nxgt/di-hono` will depend on it as a peer, and
on Hono as a peer. Never the other way round, and never a cycle. Siblings
depend on each other by `workspace:^`.

`@alxia/di` is built in the alxia repository, not here.

## Invariants

Each of these is a promise in the public API, and a spec or a type test proves
it. A change that weakens one is a breaking change, even when every spec stays
green.

- **A promised compile error has a type test, and the test has a probe.**
  The API promises that these fail to compile: a missing Token, a Provider
  declared before its dependencies, an unfilled Slot, a duplicate Token name, a
  Captive dependency (a transient counts by its declared `bound`), and `use` of
  a Module whose requirements are missing. Each `@ts-expect-error` needs a
  positive case beside it showing the same code compiles when it is correct.
  Without one, it can pass for the wrong reason.
- **No decorators and no `reflect-metadata`** (ADR 0001). Applications compile
  with `experimentalDecorators`, so a decorator-based API breaks there.
- **`get` and `resolve` always return a Promise.** That includes a Slot and a
  cached singleton. A synchronous fast path in the public types would break
  every caller the day a factory becomes async.
- **Disposal runs in reverse creation order and includes transients.** Whoever
  resolved a value owns it. Disposing twice does nothing, and resolving after
  disposal rejects. A Scope's disposal never touches singletons. When a
  Provider names no `dispose`, the value's `Symbol.asyncDispose` is called, and
  failing that its `Symbol.dispose`.
- **A factory that fails is not cached, and concurrent resolves share one
  in-flight promise.**
- **`override` never mutates.** It returns a new Container, and the original
  resolves exactly as before.
- **The type checker stays affordable.** `test/types/stress.ts` (60 Providers,
  once it exists) must not hit TS2589.

## The green bar

```sh
bun install
bunx biome ci
bun run build            # before typecheck: every `exports` points at dist/
bun run typecheck        # packages, scripts, and test/consumer
bun run test
bun run verify:artifacts # packs, installs and imports every declared subpath
bun run changeset:status # on a branch cut from develop
```

CI runs the same, in this order, with no service container.

## Traps

- **The type tests run twice.** `packages/*/test/types` is typechecked by each
  package under the strict `tsconfig.base.json`, and again by
  `test/consumer/tsconfig.json`, an application's looser config
  (`experimentalDecorators`, `emitDecoratorMetadata`, `noImplicitAny: false`, no
  `exactOptionalPropertyTypes`). A conditional type that resolves under one and
  not the other is the bug this catches. Do not add the strict flags to the
  consumer config.
- **Imports carry no extension** (`'./token'`, never `'./token.js'`), and
  consumers resolve as a bundler does. A failure only under `nodenext` is not a
  bug.
- **Nothing publishes yet.** Every package is `"private": true`; removing it is
  a deliberate commit of its own (the first-release slice), never a side effect.
- **The skeleton is nxgt-data's.** The shared root files are byte-for-byte
  copies; fix a drift in nxgt-data first. The `diff` loop is in the
  `nxgt-monorepo:lay-out-a-library-monorepo` skill.

## Declared divergences from nxgt-data

- `tsconfig.base.json` is nxgt-data's strict one (not nxgt-telemetry's, which
  still carries `experimentalDecorators`: this library's premise is that it does
  not need them).
- `ci.yml` has no service caches and no `newest-peers` job (no peer to widen
  yet); it does not run on `push` to `develop` (nothing is cached).
- No `check-nxgt-versions`, `meilisearch`, `redis`, `seaweedfs` or
  `newest-peers` scripts: they serve nxgt-data's servers and packages.
- `typecheck` adds `typecheck:consumer`.
- `.github/workflows/deprecate.yml` is nxgt-telemetry's, taken as is, because
  nxgt-data has none. `nxgt-versions.yml` is dropped along with
  `check-nxgt-versions`. The CI timeout is 15 minutes, against nxgt-data's 25,
  since there are no services to start.
- The artifact probe and the verify temp folder are named `nxgt-di-*`
  (`scripts/artifacts/install.ts`, `scripts/verify-artifacts.ts`), not
  `nxgt-data-*`.
