# Lifecycle: boot and shutdown

## Boot: `init`

Singletons are made on first resolve. Call `init()` at boot to make them all
up front, so a failing connection stops the start-up instead of the first
request:

```ts
const app = container()
  .provide(Config, () => loadConfig())
  .provide(Db, async ({ get }) => Database.connect((await get(Config)).url), {
    dispose: (db) => db.close(),
  });

await app.init(); // rejects if Database.connect does
server.listen();
```

- `init()` creates every singleton, **one after another in provide order**,
  so each finds its dependencies made and a failure is reported by the first
  factory that failed. It rejects with that factory's error.
- What failed is not cached: a later `resolve`, or a second `init()`, tries
  again. What succeeded stays made.
- Scoped Providers, Slots and transients (even bound to singleton) are not
  created: nothing would cache them.

## Shutdown: dispose

Stop taking work first, then dispose of the Container. It disposes of every
value it made, in reverse creation order:

```ts
process.on('SIGTERM', async () => {
  await server.stop();
  await app[Symbol.asyncDispose]();
});
```

In a script or a test, `await using` does both ends for you:

```ts
await using app = container().provide(Db, connect, { dispose: (db) => db.close() });
await app.init();
// ... leaving the block disposes of everything
```

Disposing of the Container does not dispose of its live Scopes: whoever made
a Scope disposes of it (see [Scopes and Slots](scopes-and-slots.md)). Once the
Container is disposed, `createScope` throws and a resolve rejects with
`ContainerDisposedError`. Disposal waits for factories still running, without
a time limit; see [troubleshooting](../troubleshooting.md#disposal-never-finishes).
