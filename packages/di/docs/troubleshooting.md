# Troubleshooting

One entry for each error you can hit, headed by the message you will search
for. Runtime errors carry a stable `code`, so match on the `code` or the class,
never on the message. Each `DiError` also carries `token`, the name of the
Token it is about: a `string` on every class, except `ContainerDisposedError`,
where it is `string | undefined` (`undefined` when `createScope` was called).

## Compile errors

Each refusal shows up as a property named after the problem, inside a "not
assignable" message.

### `Token 'db' is not provided`

**When:** a factory calls `get(Db)`, or you call `resolve(Db)`, but no
Provider for `Db` comes before that point in the chain.

**Why:** a factory sees only the Tokens provided before it. That rule is what
makes a missing dependency or a cycle impossible to write.

**Fix:** provide the dependency first.

```ts
container()
  .provide(Config, () => loadConfig())
  .provide(Db, async ({ get }) => connect((await get(Config)).url)); // Config is above
```

### `Token 'db' is provided with another value type`

**When:** two Tokens share the name `'db'` but not the value type, and you pass
the one the Container did not receive.

**Fix:** create each Token once, in a module of its own, and import it
everywhere.

### `Token name 'db' is already provided`

**When:** you `provide` a Token whose name the Container already has.

**Fix:** a Token's name is its key in the Container's type, so give each Token
its own name.

### `a Token name must be exactly one string literal`

**When:** you passed `token()` a name that is a variable widened to `string`,
a template pattern such as `` `db-${string}` ``, or a union such as
`'primary' | 'replica'`; or you passed `provide` a Token whose name is one of
those.

**Why:** the name is the Token's key in the Container's type. A widened name
or a pattern would key every name at once, after which any Token would
resolve; a union would key two entries with one Token.

When a Token typed `any` reaches `provide`, the call itself compiles, but it
returns this refusal instead of a Container, so the next call on it fails
with "Property 'resolve' does not exist".

**Fix:** pass one literal (`token<Db>()('db')`), or declare the variable
`as const`. For a choice between two dependencies, create two Tokens.

### `not a resolvable Token`

**When:** you passed `resolve` or `get` something typed as a Token but with no
single name: an `AnyToken`, or a `Token<never, ...>` produced by a cast.

**Fix:** pass the Token you created with `token()`, typed as it was created.
If a helper takes "some Token", resolve at the call site and pass the value
to the helper. A helper that is generic over the Token cannot call `resolve`
without a cast, because a Container's type is exact (see the limit on generic
functions in the [guide](guide/tokens-and-providers.md)).

### `resolve one Token at a time`

**When:** you passed `resolve` or `get` a value typed as a union of Tokens,
such as `primary ? Db : Replica`.

**Why:** the result would be a union of values with no way to tell which, and
a Token the Container lacks could hide beside one it has.

**Fix:** branch around the call instead:
`primary ? app.resolve(Db) : app.resolve(Replica)`.

### `Token 'requestId' is scoped, captured by a singleton`

**When:** a singleton's factory, or a transient's bound to singleton (the
default), calls `get` with a scoped Token or a Slot.

**Why:** the singleton outlives the Scope. It would keep the first
request's value for every later request: a Captive dependency.

**Fix:** make the dependent scoped, or a transient with `bound: 'scoped'`, or
pass the scoped value to its methods instead of its factory. See
[the captive check](guide/tokens-and-providers.md#the-captive-check).

```ts
.provide(Audit, async ({ get }) => new Audit(await get(RequestId)), { lifetime: 'scoped' })
```

### `Token 'requestId' is scoped: resolve it from a Scope made by createScope`

**When:** you called the Container's `resolve` with a scoped Token, a Slot,
or a transient bound to scoped.

**Fix:** create a Scope and resolve it there.

```ts
await using scope = app.createScope({ principal });
const id = await scope.resolve(RequestId);
```

### `bound is only allowed with lifetime transient`

**When:** you passed `bound` to `provide` without `lifetime: 'transient'`
(the default lifetime is singleton).

**Fix:** a singleton or a scoped Provider's lifetime already says who may
capture it. Remove `bound`, or add `lifetime: 'transient'`.

### `not a Slot of this Container`

**When:** you passed `createScope` a key that no `slot(...)` declared.

**Fix:** remove the key, or declare the Slot: `.slot(token<Role>()('role'))`.

### `… is not assignable to parameter of type 'Factory<…>'`

**When:** a factory's parameter is annotated (or the factory is declared as a
`Factory<…>` apart) to see Tokens its Provider is not given: a scoped Token
in a singleton's factory, where the expected type reads
`CapturedMap<{ requestId: string }>`, or a Token provided later in the chain.

**Why:** a `Resolver` that sees more stands in for one that sees less, never
the reverse. The annotation would otherwise smuggle in a Captive dependency
or a cycle.

**Fix:** annotate with only what the factory uses, which fits any Container
that provides at least that, or give the Provider the lifetime it needs:

```ts
const audit: Factory<{ db: Db }, NoTokens, Audit> = async ({ get }) => new Audit(await get(Db));
app.provide(AuditToken, audit); // any Container with a singleton 'db'
```

### `Expected 3 arguments, but got 2` (in `provide`)

**When:** you gave `provide` a lifetime through its type arguments
(`provide<'out', number, 'scoped'>(…)`) but no `options`.

**Fix:** pass `{ lifetime: 'scoped' }`: the runtime reads the lifetime from
`options`, never from the types. Only a singleton may leave `options` out.

### `Property 'principal' is missing` (in `createScope`)

Or `Expected 1 arguments, but got 0`.

**When:** `createScope` was not given a value for every Slot.

**Fix:** pass each Slot's value, keyed by its Token's name:
`app.createScope({ principal: user })`.

### `Module needs Token 'config', which is not provided`

**When:** you `use` a Module whose requirements the Container lacks.

**Fix:** provide the requirement before `use`, or `use` the Module that
provides it first. The same applies to the related messages:
`Module needs Token 'config' with another value type` (provide it with the
type the Module states) and `Module needs Token 'principal' as a Slot`
(declare it with `.slot(...)`).

### `Module needs Token 'config' as a singleton, but it is scoped`

**When:** the Module's `singletons` requirement is met only by a scoped
Provider, a Slot or a transient bound to scoped.

**Why:** the Module's singletons may depend on it, which would capture a
scoped value: a Captive dependency across the Module boundary.

**Fix:** provide it as a singleton, or, if the Module only uses it from its
scoped Providers, move it to the Module's `scoped` requirements.

### `Module provides Token 'db', which is already provided`

**When:** the Module adds a Token name the Container already has.

**Fix:** a name is unique per Container, Modules included: drop one of the
two Providers, or rename one Token.

### `Token 'principal' is a Slot: pass its value to createScope instead`

**When:** you called `override` with a Slot. At runtime, past a cast, it
throws `SlotOverrideError`, code `DI_SLOT_OVERRIDE`, with the same text.

**Fix:** a Slot's value already comes from outside: give the fake to
`createScope({ principal: fake })`. See [Testing](guide/testing.md).

## Runtime errors

### `Token 'db' is not provided by this Container`

`TokenNotProvidedError`, code `DI_TOKEN_NOT_PROVIDED`.

**When:** the types were bypassed (a cast, `any`, or a plain-JavaScript
caller) and the Token has no Provider.

**Fix:** remove the cast. The compile error above then points at the missing
Provider.

### `Token name 'db' is already provided by this Container; Token names must be unique`

`DuplicateTokenNameError`, code `DI_DUPLICATE_TOKEN_NAME`.

**When:** a cast or a loose config let a duplicate name past the types.

**Fix:** rename one of the Tokens.

### `Cannot resolve Token 'db': the Container has been disposed`

`ContainerDisposedError`, code `DI_CONTAINER_DISPOSED`.

**When:** something resolves after `[Symbol.asyncDispose]()` has begun. It is
often a request still in flight at shutdown, or a timer. If a factory was
still running when disposal began, its value is disposed and its resolve
rejects with this error.

**Fix:** stop taking work before you dispose of the Container.

```ts
await server.stop();
await app[Symbol.asyncDispose]();
```

### `Cannot create a Scope: the Container has been disposed`

`ContainerDisposedError`, code `DI_CONTAINER_DISPOSED`. Its `token` is
`undefined`, since no Token was being resolved; that is why
`ContainerDisposedError['token']` is typed `string | undefined`.

**When:** `createScope` was called after the Container's disposal began,
usually a request that arrived during shutdown.

**Fix:** stop taking requests before you dispose of the Container.

### `Disposing the Container failed for 1 value(s): 'db'`

`DisposeError` (an `AggregateError`), code `DI_DISPOSE_FAILED`.

**When:** one or more `dispose` functions threw. Every other value was still
disposed. A Scope reports "Disposing the Scope failed ...", with the same
`DisposeError`.

**Fix:** `error.errors` holds what each `dispose` threw, and `error.tokens`
names their Tokens, in disposal order. A second dispose call does not throw
again.

```ts
try {
  await app[Symbol.asyncDispose]();
} catch (error) {
  if (error instanceof DisposeError) log.error({ tokens: error.tokens, causes: error.errors });
}
```

### `Cannot resolve Token 'db': the Scope has been disposed`

`ScopeDisposedError`, code `DI_SCOPE_DISPOSED`.

**When:** something resolves from a Scope after its `[Symbol.asyncDispose]()`
has begun, often work the request started and did not await.

**Fix:** await the request's work before the Scope's `finally` disposes of it.

### `Token 'requestId' is scoped: resolve it from a Scope made by createScope` (at runtime)

`ScopeRequiredError`, code `DI_SCOPE_REQUIRED`.

**When:** a cast let a scoped Token reach the Container's `resolve`, or a
singleton's `get`. The compile error of the same text is the usual form.

**Fix:** remove the cast, then follow the compile error.

### `createScope was not given a value for Slot 'principal'`

`MissingSlotError`, code `DI_SLOT_MISSING`. `error.slots` lists every
missing Slot.

**When:** JavaScript code, or a cast, called `createScope` without a value
for each Slot. A Slot given `undefined` counts as given.

**Fix:** pass every Slot, keyed by Token name.

## Disposal never finishes

**When:** `await app[Symbol.asyncDispose]()` (or leaving an `await using`
block) hangs.

**Why:** disposal waits for every factory still running, so that what it
makes is disposed too. A factory that never settles, such as a connection
attempt with no timeout, keeps it waiting. This is deliberate, and it matches
`await using`, which has no time limit either.

**Fix:** give the factory's own I/O a timeout, and bound the shutdown where
you stop the application, with your framework's stop timeout or a race
against a timer:

```ts
await Promise.race([
  app[Symbol.asyncDispose](),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('disposal timed out')), 10_000),
  ),
]);
```
