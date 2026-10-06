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

The name must be exactly one string literal. A name widened to `string`, a
template pattern such as `` `db-${string}` ``, or a union such as
`'primary' | 'replica'` would key many entries with one Token, so `token()`
and `provide` both refuse it. Likewise, `resolve` and `get` take one Token at
a time, never a union of Tokens.

To accept any Token in a helper of your own, type the parameter as `AnyToken`.
`TokenValue<K>` reads a Token's value type back:

```ts
import type { AnyToken, TokenValue } from '@nxgt/di';

function describe<K extends AnyToken>(t: K): string {
  return `Token '${t.name}'`;
}
type Db = TokenValue<typeof Db>; // Database
```

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
- **A Container's type is exact.** `Container<{ db: Db }>` accepts only a
  Container that provides exactly `db`, as a `Db`. A function generic over
  what is provided, such as
  `<P extends { db: Db }>(app: Container<P>) => app.resolve(Db)`, does not
  compile, because a Container is invariant in that type. Take the concrete
  Container type (`typeof app`) instead. Modules, which are coming, are the
  way to write code that needs only some of a Container's Tokens.

## Lifetimes

| `lifetime` | what you get |
| --- | --- |
| `'singleton'` (default) | one value per Container, made on first resolve |
| `'scoped'` | one value per Scope (see [Scopes and Slots](scopes-and-slots.md)) |
| `'transient'` | a new value on every resolve |

```ts
.provide(RequestId, () => crypto.randomUUID(), { lifetime: 'transient' })
```

Two concurrent resolves of a singleton share one creation. If the factory
throws, nothing is cached, and the next resolve tries again. The same holds
for a scoped value within its Scope.

### The captive check

A singleton lives as long as the Container, so it must not hold on to a
scoped value, which belongs to one request. That is a **Captive dependency**,
and it fails to compile: a singleton factory's `get` does not see scoped
Tokens.

```ts
container()
  .provide(RequestId, () => crypto.randomUUID(), { lifetime: 'scoped' })
  .provide(Audit, async ({ get }) => new Audit(await get(RequestId)));
  // ^ Token 'requestId' is scoped, captured by a singleton
```

Make `Audit` scoped, or pass the request id to its methods instead.

### A transient's `bound`

A transient is new on every resolve, but whoever resolves it may keep it. So
it declares the longest Lifetime that may capture it, its `bound`:

- `bound: 'singleton'` (the default): a singleton may depend on it, so its
  own factory sees only singletons, like a singleton's. The Container itself
  can resolve it.
- `bound: 'scoped'`: its factory may use scoped values, and it counts as
  scoped. A singleton cannot depend on it, and only a Scope resolves it.

```ts
.provide(Logger, async ({ get }) => base.child({ requestId: await get(RequestId) }), {
  lifetime: 'transient',
  bound: 'scoped',
})
```

`options` may be left out only for a singleton: any other lifetime must be
passed in `options`, which is what the runtime reads, even when the type
arguments already say it.

`bound` is only allowed with `lifetime: 'transient'`. Without the bound, a
singleton could reach a scoped value through a transient, which is the
captive dependency again by another road.

### Reusable factories

> These checks rely on `strictFunctionTypes`, which `strict: true` turns on.
> With it off, a factory whose parameter is annotated can claim a Token that
> is provided further down, and the mistake only shows at runtime.

A factory declared apart is typed by what it uses, and fits every Container
that provides at least that:

```ts
import type { Factory, NoTokens } from '@nxgt/di';

const audit: Factory<{ db: Db }, NoTokens, Audit> = async ({ get }) => new Audit(await get(Db));
app.provide(AuditToken, audit);
```

The reverse is refused: a factory typed to see a scoped Token cannot be given
to a singleton, nor one typed to see a Token provided later in the chain.

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
- Whoever resolves a transient owns it: the Container, or the Scope that
  resolved it. A Container's disposal never touches its Scopes; see
  [Scopes and Slots](scopes-and-slots.md#disposal).
- A transient is disposed once per resolve. A transient factory that returns
  the same object every time gets that object disposed as many times as it
  was resolved; make such a value a singleton instead.
- Disposal first waits for the factories still running, so that what they
  make is disposed too, and the resolves waiting on them reject with
  `ContainerDisposedError`. This wait has no time limit, as `await using`
  has none: a factory that never settles keeps disposal waiting for ever.
  That is deliberate. Bound it yourself where you stop the application,
  either with your framework's stop timeout or with a race against a timer:

  ```ts
  await Promise.race([
    app[Symbol.asyncDispose](),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('disposal timed out')), 10_000),
    ),
  ]);
  ```
