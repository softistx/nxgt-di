# Troubleshooting

One entry for each error you can hit, headed by the message you will search
for. Runtime errors carry a stable `code`, so match on the `code` or the class,
never on the message. The errors of `@nxgt/di` itself, such as
`Token 'db' is not provided` on `c.var.scope.resolve`, are in
[its troubleshooting page](https://github.com/softistx/nxgt-di/blob/develop/packages/di/docs/troubleshooting.md).

## Compile errors

### `Expected 2 arguments, but got 1` on `di(container)`

**When:** the Container has a Slot, and `di` was given no options.

**Why:** a Scope cannot be created without a value for every Slot, so `slots`
is required exactly when there is one.

**Fix:** compute the Slots from the request:

```ts
const deps = di(services, {
  slots: (c) => ({ tenant: c.req.header('x-tenant') ?? 'public' }),
});
```

### `Type '() => {}' is not assignable to type 'undefined'` on `slots`

**When:** you passed `slots` for a Container that has no Slot.

**Fix:** drop `slots`; nothing would read it. To give a request a value, declare
a Slot with `.slot(Token)` first.

### `Token 'orders' is not provided` on `expose`

**When:** an `expose` map holds a Token this `di`'s Container does not provide,
or provides with another value type.

**Fix:** provide it in the Container you passed to `di`, or expose it from the
`di` of the Container that has it.

### `'scope' is the Scope's own variable: expose under another name`

**When:** an `expose` map has the key `scope`.

**Fix:** `c.var.scope` is the request's Scope; give the value another key.

### `not a resolvable Token` on `expose`

**When:** an `expose` map holds something that is not a Token, such as its
name as a string.

**Fix:** pass the Token itself: `deps.expose({ orders: OrdersT })`.

### `Property 'scope' does not exist` on `c.var`

**When:** the handler is not chained after `.use(deps)`, so Hono did not carry
its variables there; for example `app.use(deps)` and `app.get(...)` as two
statements.

**Fix:** chain them, or declare the app with `DiEnv`. See
[Typing `c.var`](guide/typing-c-var.md).

```ts
const app = new Hono<DiEnv<typeof deps>>();
```

## Runtime errors

### `expose('orders') ran on a request with no Scope: mount its di() middleware first, with app.use(deps)`

`ScopeNotMountedError`, code `DI_SCOPE_NOT_MOUNTED`. It extends `@nxgt/di`'s
`DiError`; `token` is `undefined`, and `variables` lists the keys of the map.

**When:** an `expose` middleware ran on a request that the `di` it came from
did not go through: `app.use(deps)` is missing, is mounted after the `expose`,
or is mounted on a path that does not cover the route. It is also thrown when
the request went through another `di` (another Container) but not this one.

**Why:** middleware order is decided at runtime, where the types cannot see it.

**Fix:** mount `deps` before every `expose` built from it, on a path that
covers it:

```ts
app.use(deps); // first, on every path
app.use('/orders/*', deps.expose({ orders: OrdersT }));
```

### `Cannot resolve Token 'orders': the Scope has been disposed`

`ScopeDisposedError`, from `@nxgt/di`, code `DI_SCOPE_DISPOSED`.

**When:** something resolved from `c.var.scope` after the request's chain had
returned: usually the body of a streamed response, or a promise left running
after the handler.

**Fix:** resolve what the stream needs before returning the response, and do
not keep scoped values past the request. See
[Streaming](guide/request-scopes.md#streaming).

### `@nxgt/di-hono: disposing the Scope of GET /orders failed`

Logged by the default `onDisposeError`, followed by the error, often a
`DisposeError` (`DI_DISPOSE_FAILED`) from `@nxgt/di` that holds each failure.

**When:** a scoped value's `dispose` threw. The response was sent unchanged.

**Fix:** fix the `dispose` that threw, and pass `onDisposeError` to send the
error to your own logger.

### Every resolve of a request rejects with the same error

**When:** `slots` threw or rejected. The Scope was never created, so each
`resolve` of that request rejects with that error, and nothing is disposed of.

**Fix:** make `slots` total (default a missing header), or reject the request
in an earlier middleware before anything resolves.
