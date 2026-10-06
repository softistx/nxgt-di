# @nxgt/di-hono

A [Hono](https://hono.dev) middleware for [`@nxgt/di`](https://www.npmjs.com/package/@nxgt/di):
each request gets its own Scope, created only if the request uses it and
disposed of when the request ends. Routes get the values they need as plain,
typed `c.var` entries, and a Token the Container does not provide fails to
compile.

## Install

```sh
bun add @nxgt/di-hono @nxgt/di hono typescript
```

`@nxgt/di`, `hono` (`^4.8.0`) and `typescript` (`^6.0.3`) are **required**
peers. Your `tsconfig.json` needs:

```jsonc
{
  "compilerOptions": {
    "moduleResolution": "bundler", // `nodenext` is not supported
    "strict": true
  }
}
```

## Usage

```ts
import { container, token } from '@nxgt/di';
import { di } from '@nxgt/di-hono';
import { Hono } from 'hono';

interface Principal { id: string }
interface Orders { list(): Promise<string[]> }
declare function ordersFor(user: Principal): Orders;

const User = token<Principal>()('user');
const OrdersT = token<Orders>()('orders');

const services = container()
  .slot(User) // a value each request brings
  .provide(OrdersT, async ({ get }) => ordersFor(await get(User)), {
    lifetime: 'scoped',
  });

// The Container has a Slot, so `slots` is required: it computes the
// request's Slot values from its Context.
const deps = di(services, {
  slots: (c) => ({ user: { id: c.req.header('x-user') ?? 'anonymous' } }),
});

const app = new Hono()
  .use(deps) // a lazy Scope per request, on c.var.scope
  .use('/orders/*', deps.expose({ orders: OrdersT })) // resolved, on c.var.orders
  .get('/orders', async (c) => c.json(await c.var.orders.list()))
  .get('/health', (c) => c.text('ok')); // creates no Scope, calls no `slots`

export default app;
```

- **`di(container, options)`** returns the middleware. Mount it once, before
  any route that uses the Scope. `c.var.scope` is the request's Scope, typed
  by the Container: `await c.var.scope.resolve(OrdersT)`.
- **The Scope is lazy.** It is created, and `slots` called, on its first
  `resolve`. A request that resolves nothing costs nothing.
- **`deps.expose({ key: Token })`** resolves each Token in the request's Scope
  and sets it on `c.var` under its key. Every Token is checked against the
  Container at compile time: a singleton, a scoped Provider or a Slot.
- **Disposal** runs after the rest of the chain, whether the handler returned
  or threw. A failure goes to `onDisposeError` (by default `console.error`)
  and never replaces the response. A streamed body must not use scoped values
  after its handler has returned: see [the guide](docs/guide/request-scopes.md#streaming).

### Typing `c.var` without chaining

Hono carries a middleware's variables into the routes **chained** after it.
For an app declared first and filled in later, `DiEnv` builds its `Env` from
the same values:

```ts
import { type DiEnv } from '@nxgt/di-hono';

const exposed = { orders: OrdersT };
const api = new Hono<DiEnv<typeof deps, typeof exposed>>();
api.use(deps);
api.use('/orders/*', deps.expose(exposed));
api.get('/orders', async (c) => c.json(await c.var.orders.list()));
```

`DiEnv` claims the variables on every route of that app, so mount the
`expose` on every path that reads them. See
[Typing `c.var`](docs/guide/typing-c-var.md).

## API

| Export | Kind | What it is |
| --- | --- | --- |
| `di` | function | `di(container, options?)`: the middleware, with `expose` on it |
| `Di` | type | what `di` returns |
| `DiOptions` | type | `di`'s options: `slots` (required exactly when the Container has Slots), `onDisposeError` |
| `DiEnv` | type | `DiEnv<typeof deps, typeof exposed?>`: an app `Env` with `scope` and the exposed variables |
| `AnyDi` | type | any `di` middleware, for a helper of your own |
| `Exposed` | type | the variables an `expose` map sets |
| `ScopeVariables` | type | the variable `di` sets: `{ scope }` |
| `ScopeNotMountedError` | class | see Errors |

### Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `slots` | `(c: Context) => Slots \| Promise<Slots>` | none | computes the request's Slot values, once, when the Scope is first resolved from. Required exactly when the Container has Slots, refused when it has none |
| `onDisposeError` | `(error: unknown, c: Context) => void` | logs with `console.error` | called when disposing of a request's Scope fails. What it throws is ignored |

## Errors

The runtime errors extend `@nxgt/di`'s `DiError` and carry a stable `code`:
match on it or on the class, never on the message.

| Class | `code` | Meaning |
| --- | --- | --- |
| `ScopeNotMountedError` | `DI_SCOPE_NOT_MOUNTED` | an `expose` ran on a request its `di` middleware is not mounted on |

The types cannot see the order middleware is mounted in, so this one is a
runtime error. The errors of `@nxgt/di` itself (a disposed Container, a failing
factory) reach your `app.onError` unchanged.

## Documentation

- [Documentation index](docs/README.md)
- Guides: [Request Scopes](docs/guide/request-scopes.md),
  [Typing `c.var`](docs/guide/typing-c-var.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Roadmap](docs/roadmap.md)
