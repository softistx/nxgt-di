# Modules

A **Module** is a reusable group of Providers that states which Tokens it
needs, and is added to a Container that already provides them.

```ts
import { container, defineModule, token } from '@nxgt/di';
import { Database, UserRepository } from './db'; // your own classes

interface AppConfig {
  url: string;
}

export const Config = token<AppConfig>()('config');
export const Db = token<Database>()('db');
export const Users = token<UserRepository>()('users');

// Needs a singleton 'config'; adds 'db' (singleton) and 'users' (scoped).
export const data = defineModule<{ singletons: { config: AppConfig } }>()((c) =>
  c
    .provide(Db, async ({ get }) => Database.connect((await get(Config)).url), {
      dispose: (db) => db.close(),
    })
    .provide(Users, async ({ get }) => new UserRepository(await get(Db)), { lifetime: 'scoped' }),
);

const app = container()
  .provide(Config, () => ({ url: 'mongodb://localhost/app' }))
  .use(data); // now provides 'config', 'db' and 'users'
```

`defineModule<Requirements>()(build)` is curried for the same reason `token` is:
you spell out the requirements, and TypeScript infers what `build` adds.

## Requirements, one map each

The Container's type is exact, so a Module states what it needs per map
rather than as a Container type:

| key | what it means | met by |
| --- | --- | --- |
| `singletons` | the Module's singletons may depend on these | a singleton only |
| `scoped` | only the Module's scoped Providers use these | a singleton, a scoped entry or a Slot |
| `slots` | the Module needs these declared as Slots | a Slot only |

```ts
defineModule<{
  singletons: { db: Database };
  scoped: { requestId: string };
  slots: { principal: User };
}>()((c) => c.provide(Audit, async ({ get }) => new Audit(await get(Db), await get(Principal)), {
  lifetime: 'scoped',
}));
```

Inside `build`, the Container has exactly the requirements: a singleton
requirement is a singleton there, a scoped or Slot requirement is scoped, so
the captive check holds across the Module boundary. A Token the Module did
not require is not visible, as with any Provider declared too early.

## `use`

`app.use(module)` returns a new Container with the Module's Providers added.
It fails to compile, with a message naming each gap, when:

- a requirement is missing: `Module needs Token 'config', which is not provided`
- it has another value type: `Module needs Token 'config' with another value type`
- a singleton requirement is met only by a scoped entry:
  `Module needs Token 'config' as a singleton, but it is scoped`
- a Slot requirement is met by something that is not a Slot:
  `Module needs Token 'principal' as a Slot`
- the Module adds a name the Container already has:
  `Module provides Token 'db', which is already provided`

As with `provide`, what a Module adds is visible only to what comes after
`use`.

`build` must return the Container it was handed, with Providers added. A
`build` that returns a Container of its own, or one it kept from an earlier
`use`, would hand the app values it never declared; `use` throws
`ModuleEscapedError` (`DI_MODULE_ESCAPED`) instead. Keep `build` a plain
chain on its argument. One Module may be used by any number of Containers; each gets its own
values.
