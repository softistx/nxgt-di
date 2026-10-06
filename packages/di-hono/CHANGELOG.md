# @nxgt/di-hono

## 0.1.0

### Minor Changes

- [#8](https://github.com/softistx/nxgt-di/pull/8) [`16f68de`](https://github.com/softistx/nxgt-di/commit/16f68defed22b47e922f94e327933131a8fa8b06) Thanks [@SteveGT96](https://github.com/SteveGT96)! - First public release, published together with `@nxgt/di` 0.2.0, which its peer range requires.

- [#6](https://github.com/softistx/nxgt-di/pull/6) [`7909928`](https://github.com/softistx/nxgt-di/commit/7909928167299db68da4f09c2b1fc0b67c9c69be) Thanks [@SteveGT96](https://github.com/SteveGT96)! - A Hono middleware for `@nxgt/di`. `di(container, { slots })` gives each request a lazy Scope on `c.var.scope`, created on its first `resolve` and disposed of once the request ends, whether the handler returned or threw; a disposal failure goes to `onDisposeError` and never replaces the response. `deps.expose({ key: Token })` resolves Tokens in the request's Scope and sets them on `c.var`, each checked against the Container at compile time. `DiEnv` types an app that is declared rather than chained. `ScopeNotMountedError` (`DI_SCOPE_NOT_MOUNTED`) reports an `expose` whose `di` is not mounted.

### Patch Changes

- Updated dependencies [[`82fbf8b`](https://github.com/softistx/nxgt-di/commit/82fbf8ba9d1dd7cd30018cdfba641b15e5ba929f)]:
  - @nxgt/di@0.2.0
