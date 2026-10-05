---
'@nxgt/di': minor
---

Wire services with typed Tokens: `token<T>()(name)` creates one, and `container().provide(token, factory, { lifetime, dispose })` adds a Provider whose factory sees only the Tokens provided before it, so a missing dependency, a cycle or a duplicate Token name fails to compile. `resolve` and `get` always return a Promise. Singletons are created once per Container, transients on every resolve, and `await using` (or `[Symbol.asyncDispose]()`) disposes of every created value in reverse creation order, transients included, falling back to the value's own `Symbol.asyncDispose` or `Symbol.dispose`. Errors carry stable codes: `DI_TOKEN_NOT_PROVIDED`, `DI_DUPLICATE_TOKEN_NAME`, `DI_CONTAINER_DISPOSED` and `DI_DISPOSE_FAILED`.
