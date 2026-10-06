# Roadmap

Where `@nxgt/di-hono` is going. A direction, not a commitment: the version an
item shipped in is the only number on this page.

## Now

- **@nxgt/di-hono** — one lazy Scope per Hono request, disposed when the request ends, with the dependencies a route needs handed to it as typed `c.var` values. Not yet published.

## Next

_Nothing here yet._

## Later

_Nothing here yet._

## Not planned

- **A global `ContextVariableMap` augmentation** — the Scope's type depends on your Container, which the package cannot know; type `c.var` by chaining, or with `DiEnv`.

## Shipped

_Nothing yet._
