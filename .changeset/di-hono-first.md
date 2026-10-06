---
"@nxgt/di-hono": minor
---

A Hono middleware for `@nxgt/di`. `di(container, { slots })` gives each request a lazy Scope on `c.var.scope`, created on its first `resolve` and disposed of once the request ends, whether the handler returned or threw; a disposal failure goes to `onDisposeError` and never replaces the response. `deps.expose({ key: Token })` resolves Tokens in the request's Scope and sets them on `c.var`, each checked against the Container at compile time. `DiEnv` types an app that is declared rather than chained. `ScopeNotMountedError` (`DI_SCOPE_NOT_MOUNTED`) reports an `expose` whose `di` is not mounted.
