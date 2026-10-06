# Roadmap

Where `@nxgt/di` is going. A direction, not a commitment: the version an item
shipped in is the only number on this page.

## Now

_Nothing in progress._

## Next

- **@nxgt/di-hono** — one lazy Scope per Hono request, disposed when the request ends, with the dependencies a route needs handed to it as plain `c.var` values.

## Later

_Nothing here yet._

## Not planned

_Nothing here yet._

## Shipped

- **@nxgt/di** (0.1.0): wire an application's services with typed Tokens, so that a missing or captive dependency fails to compile. Covers singleton, scoped and transient lifetimes, Scopes and Slots, Modules, overrides, `init`, and disposal in reverse order.
