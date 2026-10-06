# Request Scopes

`di` gives each Hono request a Scope of your Container. This page covers how
it is created, how routes get their values, and when it is disposed of.

## Mounting

```ts
import { container, token } from '@nxgt/di';
import { di } from '@nxgt/di-hono';
import { Hono } from 'hono';

interface Db { query(sql: string): Promise<unknown[]> }
declare function connect(): Promise<Db>;

const DbT = token<Db>()('db');
const RequestId = token<string>()('requestId');

const services = container()
  .provide(DbT, () => connect())
  .provide(RequestId, () => crypto.randomUUID(), { lifetime: 'scoped' });

const deps = di(services); // no Slot, so no options needed

const app = new Hono()
  .use(deps)
  .get('/id', async (c) => c.text(await c.var.scope.resolve(RequestId)));
```

Mount `deps` once, with `app.use`, before every route that uses it. Mounting it
a second time on the same request does nothing: the outer one keeps the Scope
and disposes of it.

Two `di` of different Containers can be nested, the inner one mounted on a
narrower path. Inside it, `c.var.scope` is the inner Scope; once the inner
middleware has disposed of it, `c.var.scope` is the outer Scope again, so an
outer middleware's code after its `await next()` resolves from its own Scope.
Each `expose` always uses the Scope of the `di` it came from.

`c.var.scope` is a Scope of `@nxgt/di`: `resolve` takes any Token the Container
provides, singletons included, and always returns a Promise. Its `resolve` is
bound, so `const { resolve } = c.var.scope` works.

## The Scope is lazy

Nothing happens when the middleware runs. The Scope is created on the first
`resolve`, from the handler or from an `expose`, and only then is `slots`
called. A `/health` route that resolves nothing creates no Scope and never
reads a header to compute a Slot.

## Slots

When the Container has Slots, `slots` is required, and its return type must
give a value of the right type for each:

```ts
interface Principal { id: string }
const User = token<Principal>()('user');
const Tenant = token<string>()('tenant');

const withSlots = container().slot(User).slot(Tenant);

const scoped = di(withSlots, {
  slots: async (c) => ({
    user: { id: c.req.header('x-user') ?? 'anonymous' },
    tenant: c.req.header('x-tenant') ?? 'public',
  }),
});
```

It runs at most once per request, even under concurrent resolves. When it
throws, every `resolve` of that request rejects with its error, and there is
no Scope to dispose of.

A key that is no Slot is ignored. TypeScript does not check a function's
returned object for extra keys, so a misspelt Slot name shows up as the
missing one, not as the extra one.

## Exposing values on `c.var`

`deps.expose({ key: Token })` is a middleware that resolves each Token in the
request's Scope and sets it on `c.var` under its key:

```ts
const routes = new Hono()
  .use(deps)
  .use('/reports/*', deps.expose({ db: DbT, requestId: RequestId }))
  .get('/reports/daily', async (c) => {
    const rows = await c.var.db.query('select 1');
    return c.json({ id: c.var.requestId, rows });
  })
  // On one route, between the path and the handler:
  .get('/me', deps.expose({ requestId: RequestId }), (c) =>
    c.text(c.var.requestId),
  );
```

- The Tokens are resolved together, before the handler runs. A failing factory
  goes to `app.onError`, and the Scope is still disposed of.
- A value is resolved in the request's Scope, so a handler that also calls
  `c.var.scope.resolve(RequestId)` gets the same one.
- Each Token is checked against the Container at compile time. `scope` is
  refused as a key: it is the Scope's own variable.
- `expose` is reachable only from what `di` returned, so it always knows its
  Container. Mounted on a request that `deps` itself did not go through, it
  throws `ScopeNotMountedError` (`DI_SCOPE_NOT_MOUNTED`). The types cannot see
  middleware order, so check that `app.use(deps)` comes first.

## Disposal

The Scope is disposed of once the rest of the chain has run, whether the
handler returned a response or threw. Its scoped values and the transients it
resolved are disposed of in reverse creation order; singletons belong to the
Container and are left alone.

A failure while disposing goes to `onDisposeError`, after the response is
decided, so it never replaces the handler's response or error:

```ts
declare const logger: { error(message: string, error: unknown): void };

const logged = di(services, {
  onDisposeError: (error, c) => logger.error(`dispose failed: ${c.req.path}`, error),
});
```

By default it is `console.error`. What `onDisposeError` itself throws is
ignored.

### Streaming

The Scope is disposed of when the handler returns, which for a streamed
response is before the body has been written. Resolve what the stream needs
first, and do not use a scoped value from inside the stream once it may be
disposed of:

```ts
import { streamText } from 'hono/streaming';

const streaming = new Hono().use(deps).get('/export', async (c) => {
  // Resolved while the request's Scope is alive.
  const db = await c.var.scope.resolve(DbT);
  const rows = await db.query('select * from orders');
  return streamText(c, async (stream) => {
    for (const row of rows) await stream.writeln(JSON.stringify(row));
  });
});
```

A `resolve` made after disposal rejects with `ScopeDisposedError`. A
singleton, like `db` above, outlives the request and is safe to keep using;
a scoped value may already have been closed.

## The Container's own lifecycle

`di` never creates or disposes of the Container. Boot it with
`await services.init()` before the server listens, and dispose of it when the
server stops:

```ts
await services.init();
const server = Bun.serve({ fetch: app.fetch });
process.on('SIGTERM', async () => {
  await server.stop();
  await services[Symbol.asyncDispose]();
});
```

After that, a request's first `resolve` rejects with `ContainerDisposedError`.

## Testing a route

Build the app from a Container whose Providers you `override`, and send it
requests with `app.request()`: no server needed.

```ts
// Builds the app from the Container it is given.
function makeApp(services: typeof withDb) {
  const deps = di(services);
  return new Hono().use(deps).get('/rows', async (c) => {
    const db = await c.var.scope.resolve(DbT);
    return c.json(await db.query('select 1'));
  });
}
const withDb = container().provide(DbT, () => connect());

export const production = makeApp(withDb);

// In a test:
const fake: Db = { query: async () => [{ id: 1 }] };
const res = await makeApp(withDb.override(DbT, fake)).request('/rows');
// await res.json() → [{ id: 1 }]
```

A Slot is not overridden: give `slots` the value the test needs.
