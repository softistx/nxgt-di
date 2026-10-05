# Tokens and Providers

## Tokens

A **Token** stands for one dependency. You give it its value type and a name:

```ts
import { token } from '@nxgt/di';

export const Config = token<{ url: string }>()('config');
export const Db = token<Database>()('db');
```

The call is curried (`token<T>()(name)`) because TypeScript cannot infer the
name while you spell out `T`. The name is a literal type. It is the Token's
key in the Container's type, and it appears in error messages. At runtime,
each Token's identity is a unique Symbol, so calling `token<Database>()('db')`
twice gives two different Tokens. Create each Token once and import it.

## Providers

`provide(token, factory, options?)` tells the Container how to make a Token's
value. The factory receives `{ get }`, and it may be sync or async:

```ts
import { container } from '@nxgt/di';

const app = container()
  .provide(Config, () => ({ url: process.env.MONGO_URI ?? '' }))
  .provide(Db, async ({ get }) => Database.connect((await get(Config)).url));
```

- **Order is imposed.** A factory sees only the Tokens provided above it, so a
  missing dependency fails to compile and a cycle cannot be written.
- **`get` and `resolve` always return a Promise**, even when the factory is
  sync. A factory that later becomes async breaks no caller.
- **Every `provide` returns a new Container.** It does not change the
  previous one.

## Lifetimes

| `lifetime` | what you get |
| --- | --- |
| `'singleton'` (default) | one value per Container, made on first resolve |
| `'transient'` | a new value on every resolve |

```ts
.provide(RequestId, () => crypto.randomUUID(), { lifetime: 'transient' })
```

Two concurrent resolves of a singleton share one creation. If the factory
throws, nothing is cached, and the next resolve tries again.

## Disposal

A Container is `AsyncDisposable`. Disposing of it disposes of every value it
created, transients included, in reverse creation order:

```ts
await using app = container()
  .provide(Db, async () => Database.connect(url), { dispose: (db) => db.close() });
// leaving the block closes db
```

- When a Provider gives no `dispose`, the Container calls the value's own
  `Symbol.asyncDispose`, and failing that its `Symbol.dispose`.
- Disposing twice does nothing. Resolving after disposal rejects with
  `ContainerDisposedError`.
- When several `dispose` functions throw, the rest still run, and you get one
  `DisposeError` that holds every failure. See
  [troubleshooting](../troubleshooting.md).
