# Roadmap

Where `@nxgt/di` is going. A direction, not a commitment: the version an item
shipped in is the only number on this page.

## Now

_Nothing in progress._

## Next

_Nothing here yet._

## Later

_Nothing here yet._

## Not planned

_Nothing here yet._

## Shipped

- **Integrations** (0.2.0): `ScopeResolvable` lets an integration check Tokens before a Scope exists, and `DiErrorCode` includes the integrations' codes. `@nxgt/di-hono` is the first package built on them.
- **@nxgt/di** (0.1.0): wire an application's services with typed Tokens, so that a missing or captive dependency fails to compile. Covers singleton, scoped and transient lifetimes, Scopes and Slots, Modules, overrides, `init`, and disposal in reverse order.
