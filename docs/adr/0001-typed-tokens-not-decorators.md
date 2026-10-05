# Typed tokens and inferred container types, not decorators

Dependencies are declared with typed Tokens and factory functions, and the Container's type grows with each Provider, so a missing dependency or a Captive dependency fails to compile. We chose this over decorators for two reasons. Every consuming repository compiles with `experimentalDecorators` and `emitDecoratorMetadata` (TypeScript `~6.0.3`), so TC39 standard decorators would not work there without changing their configuration. Legacy decorators would tie the library to `reflect-metadata` and catch nothing at compile time.

## Consequences

- Classes stay plain, and a factory calls their constructor itself.
- A Provider must be declared after the Providers it depends on, because a factory's type sees only the Tokens provided before it. This makes cycles impossible by construction, at the cost of a fixed order.
- Resolution is always `await`ed, because any factory may be async.
