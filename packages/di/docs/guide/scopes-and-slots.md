# Scopes and Slots

A **Scope** is a short-lived child of a Container, usually one per HTTP
request. It makes the scoped values, holds the request's own values (its
**Slots**), and disposes of what it made when it ends.

## Scopes

```ts
import { container, token } from '@nxgt/di';

const Db = token<Database>()('db');
const RequestId = token<string>()('requestId');
const Users = token<UserRepository>()('users');

const app = container()
  .provide(Db, () => Database.connect(url), { dispose: (db) => db.close() })
  .provide(RequestId, () => crypto.randomUUID(), { lifetime: 'scoped' })
  .provide(Users, async ({ get }) => new UserRepository(await get(Db), await get(RequestId)), {
    lifetime: 'scoped',
  });

await using scope = app.createScope();
const users = await scope.resolve(Users); // always a Promise
```

- A Scope resolves every Token its Container provides. A scoped value is made
  once per Scope; a singleton is shared with the Container and every other
  Scope; a transient is new each time.
- The Container's own `resolve` takes singletons only, and transients bound
  to singleton. A scoped Token fails to compile there:
  `Token 'requestId' is scoped: resolve it from a Scope made by createScope`.
- `resolve` is bound, so `const { resolve } = scope` works.

## Slots

A **Slot** is a scoped Token whose value comes from outside, such as the
request's principal. Declare it with `slot`, then give its value to every
`createScope`, keyed by the Token's name:

```ts
const Principal = token<User>()('principal');

const app = container()
  .slot(Principal)
  .provide(Audit, async ({ get }) => new Audit(await get(Principal)), { lifetime: 'scoped' });

const scope = app.createScope({ principal: user });
```

`createScope` takes exactly the declared Slots: a missing one, a key that is
not a Slot, or a value of the wrong type fails to compile. From JavaScript, a
missing Slot throws `MissingSlotError` (`DI_SLOT_MISSING`). A Container with
no Slot takes `createScope()` with no argument.

A Slot behaves as scoped: a scoped factory may use it, a singleton may not.
Its value is not the Scope's to dispose of, since the Scope did not make it.

## Disposal

A Scope is `AsyncDisposable`, like the Container:

- Disposing of it disposes of what it made, its scoped values and the
  transients it resolved, in reverse creation order. Never a singleton, and
  never a Slot's value.
- Disposing twice does nothing. A resolve afterwards rejects with
  `ScopeDisposedError` (`DI_SCOPE_DISPOSED`).
- A failing `dispose` does not stop the rest: you get one `DisposeError`
  ("Disposing the Scope failed for ...") holding every failure.
- **Disposing the Container does not dispose its live Scopes.** Whoever
  created a Scope disposes of it, usually in a `finally`, or with
  `await using`. Once the Container is disposed, a Scope's resolve of a
  singleton rejects with `ContainerDisposedError`, so stop taking requests
  first, then dispose of the Container.

```ts
const scope = app.createScope({ principal });
try {
  return await handle(scope);
} finally {
  await scope[Symbol.asyncDispose]();
}
```
