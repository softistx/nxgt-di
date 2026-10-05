Type tests for `@nxgt/di`: files that must compile (and `@ts-expect-error`
lines that must not). Typechecked by the package's `tsc --noEmit`, and a second
time under `test/consumer/tsconfig.json`, the way an application would see them.
