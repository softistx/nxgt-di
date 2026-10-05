# Troubleshooting

One entry for each error you can hit, headed by the message you will search
for. Runtime errors carry a stable `code`, so match on the `code` or the class,
never on the message.

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

### `a Token name must be a string literal`

**When:** you passed `token()` a name that is a variable widened to `string`.

**Fix:** pass a literal (`token<Db>()('db')`), or declare the variable
`as const`.

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

### `Disposing the Container failed for 1 value(s): 'db'`

`DisposeError` (an `AggregateError`), code `DI_DISPOSE_FAILED`.

**When:** one or more `dispose` functions threw. Every other value was still
disposed.

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
