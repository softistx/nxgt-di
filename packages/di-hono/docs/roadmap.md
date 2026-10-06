# Roadmap

Where `@nxgt/di-hono` is going. A direction, not a commitment: the version an
item shipped in is the only number on this page.

## Now

_Nothing in progress._

## Next

_Nothing here yet._

## Later

_Nothing here yet._

## Not planned

- **A global `ContextVariableMap` augmentation** — the Scope's type depends on your Container, which the package cannot know; type `c.var` by chaining, or with `DiEnv`.

## Shipped

- **@nxgt/di-hono** (0.1.0): one lazy Scope per Hono request, disposed of when the request ends. The dependencies a route needs reach it as typed `c.var` values through `expose`.
