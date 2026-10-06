# Typing `c.var`

Everything `di` and `expose` set on `c.var` is typed by the Container. How the
types reach a handler depends on how the app is written.

## Chained: inferred

Hono carries each middleware's variables into what is chained after it, so a
chained app needs no annotation:

```ts
import { container, token } from '@nxgt/di';
import { di } from '@nxgt/di-hono';
import { Hono } from 'hono';

interface Orders { list(): Promise<string[]> }
declare const orders: Orders;
const OrdersT = token<Orders>()('orders');

const deps = di(
  container().provide(OrdersT, () => orders, { lifetime: 'scoped' }),
);

const app = new Hono()
  .use(deps) // c.var.scope from here on
  .use('/orders/*', deps.expose({ orders: OrdersT })) // c.var.orders from here on
  .get('/orders', async (c) => c.json(await c.var.orders.list()));
```

A middleware given to one route types that route only:

```ts
const single = new Hono()
  .use(deps)
  .get('/count', deps.expose({ orders: OrdersT }), async (c) =>
    c.json((await c.var.orders.list()).length),
  );
```

## Declared: `DiEnv`

An app written as statements (`app.use(...)` on one line, `app.get(...)` on
the next) or split across files does not carry the variables: each statement
sees the `Env` the app was declared with. `DiEnv` builds that `Env` from the
same values:

```ts
import { type DiEnv } from '@nxgt/di-hono';

const exposed = { orders: OrdersT };

const declared = new Hono<DiEnv<typeof deps, typeof exposed>>();
declared.use(deps);
declared.use('/orders/*', deps.expose(exposed));
declared.get('/orders', async (c) => c.json(await c.var.orders.list()));
```

- `DiEnv<typeof deps>` alone gives `c.var.scope`.
- The second argument is the map passed to `expose`; for two maps, spread them
  into one type: `DiEnv<typeof deps, typeof a & typeof b>`.
- **It claims the variables on every route of the app.** A route the `expose`
  is not mounted on still compiles, and reads `undefined`. Mount the `expose`
  on every path that reads its variables, or keep `DiEnv` to a sub-app that is
  entirely behind it:

```ts
const ordersApi = new Hono<DiEnv<typeof deps, typeof exposed>>();
ordersApi.use(deps.expose(exposed));
ordersApi.get('/', async (c) => c.json(await c.var.orders.list()));

const root = new Hono().use(deps).route('/orders', ordersApi);
```

Here the `expose` covers every route of `ordersApi`, and `deps` is mounted on
`root` before it.

## Why not a global `ContextVariableMap`

Some Hono middleware augment `ContextVariableMap` so that `c.get('x')` is typed
in every app. The type of `c.var.scope` depends on your Container, which a
library cannot know, so `@nxgt/di-hono` does not augment it. You may, in your
application:

```ts
type DiVariables = DiEnv<typeof deps>['Variables'];

declare module 'hono' {
  interface ContextVariableMap extends DiVariables {}
}
```

With the same caveat as `DiEnv`, on every app of the program.
