---
"@nxgt/di": minor
---

For integrations: `ScopeResolvable<K, Singletons, Scoped>` is exported, the check `Scope.resolve` applies to a Token, so an integration can check Tokens before any Scope exists. `DiErrorCode` gains `DI_SCOPE_NOT_MOUNTED`, the code of `@nxgt/di-hono`'s `ScopeNotMountedError`, which extends `DiError`. An exhaustive `switch` over `DiErrorCode` needs the new case.
