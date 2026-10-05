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
already provided fails to compile. `lifetime: 'transient'` makes a new value on
every resolve; the Container still owns it and disposes of it, in reverse
creation order with everything else. Errors carry a stable `code`
(`DI_TOKEN_NOT_PROVIDED`, `DI_DUPLICATE_TOKEN_NAME`, `DI_CONTAINER_DISPOSED`,
`DI_DISPOSE_FAILED`).

## Documentation

See [`docs/`](docs/README.md) and the [roadmap](docs/roadmap.md).
