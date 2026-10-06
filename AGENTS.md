# AGENTS.md

Instructions for any coding agent working in `nxgt-di`.

## What this repository is

A dependency-injection container for **applications** built on the nxgt
packages, published to the public npm registry. Applications are its only
consumers: no `@nxgt/*` library package depends on it.

| package | what it is |
| --- | --- |
| `@nxgt/di` | the core: typed Tokens, a Container whose type grows with each `provide`, lifetimes, Scopes, Slots, disposal. **No dependency at all**, and no `reflect-metadata` |
| `@nxgt/di-hono` | a Hono middleware: a lazy Scope per request on `c.var.scope`, disposed in `finally`, and `expose` to put resolved values on `c.var` |

The vocabulary (Token, Provider, Container, Scope, Slot, Captive dependency...)
is in [CONTEXT.md](./CONTEXT.md); use those words. The decisions are in
[docs/adr/](./docs/adr): typed Tokens rather than decorators (0001), and the
Token's name as the type-level key (0002). A change that contradicts one needs a
new ADR, not a quiet edit.

It is **Bun-first**: ESM, tested with `bun test`, no Bun-only API in the library.

## Layering

`@nxgt/di` depends on nothing. `@nxgt/di-hono` depends on it as a peer
(`workspace:^`), and on Hono as a peer (`^4.8.0`, with `hono` pinned exactly
as a devDependency, as nxgt-telemetry's `telemetry-hono` does). Never the other
way round, and never a cycle: `@nxgt/di` names no integration, except that
`DiErrorCode` lists each integration's codes (`DI_SCOPE_NOT_MOUNTED`) so their
errors can extend `DiError`. Siblings depend on each other by `workspace:^`.

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
- **`@nxgt/di-hono`'s Scope is lazy and always disposed of.** A request that
  resolves nothing creates no Scope and never calls `slots`; one that does has
  its Scope disposed of after `next()`, whether the handler returned or threw,
  and a disposal failure goes to `onDisposeError`, never into the response.
  `expose` finds the Scope of its own `di` only (a `WeakMap` keyed by the
  Context), never whatever is on `c.var.scope`.
- **The type checker stays affordable.** `packages/di/test/types/stress.ts`
  (60 Providers mixing every lifetime, Slots and two Modules) must not hit
  TS2589. Its cost when slice 4 landed: 92,089 instantiations (`tsc
  --extendedDiagnostics` on that file alone, from a temp tsconfig extending
  `tsconfig.base.json` with `noEmit`). A change that raises it by more than
  about 20% says why in its commit.

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
- **Order and captive checks on an annotated factory need `strictFunctionTypes`.**
  A factory whose parameter is annotated with a `Resolver` is checked through
  function-parameter variance. Every consumer app compiles with `strict: true`,
  and so does `test/consumer`. Under `strictFunctionTypes: false` an annotation
  can claim a Token that is provided later. The captive refusal still holds, but
  provide order does not. Do not remove `strict` from the consumer config.
- **`@nxgt/di-hono` runs against `@nxgt/di`'s `dist/`.** Its specs and type
  tests import `@nxgt/di` through the workspace link, whose `exports` point at
  `dist/`. After changing `packages/di/src`, run `bun run build` before testing
  `di-hono`, or it tests the previous build.
- **Imports carry no extension** (`'./token'`, never `'./token.js'`), and
  consumers resolve as a bundler does. A failure only under `nodenext` is not a
  bug.
- **A new package starts `"private": true`.** Removing it is a deliberate commit of
  its own, made when the package's first release is ready, never as a side effect.
  `@nxgt/di` went public that way for 0.1.0, and `@nxgt/di-hono` for its own 0.1.0.
- **The skeleton is nxgt-data's.** The shared root files are byte-for-byte
  copies; fix a drift in nxgt-data first. The `diff` loop is in the
  `nxgt-monorepo:lay-out-a-library-monorepo` skill.
- **A build that exits 0 is not evidence the artifact loads.**
  `bun run verify:artifacts` packs every package, installs the tarballs as a
  consumer does, and runs these stages in order, stopping at the first that
  fails (`scripts/verify-artifacts.ts` only sequences them; each lives in
  `scripts/artifacts/`, one module per responsibility, a spec beside each pure
  one): `packages.ts` reads the workspace, `tarball.ts` a tarball's entries,
  `manifest.ts` its dependency fields, `registry.ts` asks npm, then `stale.ts`,
  `install.ts`, `load.ts`, `classes.ts`, `imports.ts` (which `declarations.ts`
  serves), `types.ts` (with `resolve-types.ts`), `load.ts` again for the bins,
  and `emit.ts`.
  - `manifest.ts` rejects a `link:`, `file:` or `workspace:` a consumer cannot
    resolve, a required peer on no registry, an exact pin on a sibling, a
    package listing itself, a licence other than MIT or no `LICENSE`, a `files`
    entry the tarball holds nothing under, test code shipped, and a scoped
    package without `publishConfig.access: "public"`. `siblings.ts` holds the
    sibling-range rule: a sibling range must be exactly the one its
    `workspace:` spec produces beside the sibling's version in the workspace,
    which is what a stale `bun.lock` gets wrong. `@nxgt/di-hono`'s `workspace:^`
    peer on `@nxgt/di` passes it with the current `bun.lock`.
  - `imports.ts` fails a built import (the `.js` through Bun's scanner, the
    `.d.ts` through `declarations.ts`) of a package the manifest does not
    declare in `dependencies`, `peerDependencies` or `optionalDependencies`;
    a sibling listed only as a devDependency loads in the install and fails
    for a consumer. `types.ts` fails a declaration import whose types do not
    reach a consumer (the package's own, or an `@types` package it declares).
  - `emit.ts` emits the declarations of each package's `test/declarations/*.ts`
    against the install under a consumer's strict settings (TS2883 when an
    inferred type names one the entry does not export).
  - An unbuilt package stops at the first stage with `<package>: no dist/`.
  These modules and their specs, and `verify-artifacts.ts`, are byte-for-byte
  nxgt-data's; fix a drift in nxgt-data first. Only `install.ts` and
  `verify-artifacts.ts` differ (see below).

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
  `nxgt-data-*`. These are the only two lines in `scripts/artifacts/` and
  `scripts/verify-artifacts.ts` that differ from nxgt-data's; every other file
  there is identical (`cmp`), `scripts/tsconfig.json` included.
