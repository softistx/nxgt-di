# @nxgt/di

Wire an application's services with typed Tokens: a missing or captive
dependency fails to compile.

> Work in progress. Nothing is published yet; the package is `private` until
> its first release.

## Install

```sh
bun add @nxgt/di
```

TypeScript must resolve modules as a bundler does, which `"moduleResolution":
"bundler"` in your `tsconfig.json` does. `nodenext` is not supported.

## Usage

```ts
import { container, token } from '@nxgt/di';

const Config = token<{ url: string }>()('config');
const Db = token<Database>()('db');

const app = container()
  .provide(Config, () => ({ url: process.env.MONGO_URI ?? '' }))
  // A factory sees only the Tokens provided before it: reorder these two
  // lines and `get(Config)` fails to compile.
  .provide(Db, async ({ get }) => Database.connect((await get(Config)).url), {
    dispose: (db) => db.close(), // else Symbol.asyncDispose, else Symbol.dispose
  });

const db = await app.resolve(Db); // always a Promise; a singleton by default
await app[Symbol.asyncDispose](); // or `await using app = ...`
```

A Token's name is its key in the Container's type: a second Token with a name
already provided fails to compile (and, past a cast, throws
`DI_DUPLICATE_TOKEN_NAME`). `lifetime: 'transient'` makes a new value on
every resolve; the Container still owns it and disposes of it, in reverse
creation order with everything else. Errors carry a stable `code`
(`DI_TOKEN_NOT_PROVIDED`, `DI_DUPLICATE_TOKEN_NAME`, `DI_CONTAINER_DISPOSED`,
`DI_SCOPE_DISPOSED`, `DI_SCOPE_REQUIRED`, `DI_SLOT_MISSING`,
`DI_DISPOSE_FAILED`).

### Scopes and Slots

```ts
const Principal = token<User>()('principal');
const Audit = token<AuditLog>()('audit');

const web = app
  .slot(Principal) // a value each Scope is given
  .provide(Audit, async ({ get }) => new AuditLog(await get(Db), await get(Principal)), {
    lifetime: 'scoped', // once per Scope
  });

await using scope = web.createScope({ principal: user }); // every Slot, by name
const audit = await scope.resolve(Audit);
```

A singleton that depends on a scoped value fails to compile (a Captive
dependency), and so does a `createScope` missing a Slot. A transient declares
the longest lifetime that may capture it with `bound: 'singleton' | 'scoped'`.
A Scope disposes of what it made, never the singletons; disposing the
Container leaves live Scopes to their owners.

## Documentation

See [`docs/`](docs/README.md) and the [roadmap](docs/roadmap.md).
