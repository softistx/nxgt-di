---
'@nxgt/di': minor
---

Add Modules, overrides and `init`. `module<Requirements>()(build)` declares a reusable group of Providers that states what it needs, one map each (`singletons`, `scoped`, `slots`), and `container.use(module)` adds it; a missing requirement, one with another value type, a singleton requirement met only by a scoped entry, or a name the Container already has fails to compile with a message naming the gap. `container.override(token, value)` returns a new Container in which `token` gives `value`, whatever its lifetime; the original is unchanged, the two share no created value, and the value is not disposed by the Container, since the caller owns it. A Slot cannot be overridden: give its fake to `createScope` (at runtime, `SlotOverrideError`, code `DI_SLOT_OVERRIDE`). `await container.init()` creates every singleton in provide order and rejects with the first failing factory's error; what failed is not cached, so a later resolve retries.
