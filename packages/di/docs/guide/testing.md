# Testing

## Replace a dependency: `override`

`override(token, value)` returns a new Container with the same Providers,
except that `token` gives `value`. It is how a test swaps a real dependency
for a fake, with no monkey-patching:

```ts
import { describe, expect, test } from 'bun:test';
import { app, Mailer, Signup } from '../src/app';

test('signing up sends a welcome mail', async () => {
  const sent: string[] = [];
  await using faked = app.override(Mailer, { send: async (to) => void sent.push(to) });
  await (await faked.resolve(Signup)).run('ada@example.com');
  expect(sent).toEqual(['ada@example.com']);
});
```

- **The original is unchanged.** It resolves exactly as before, and the two
  Containers share no created value: each makes and disposes its own
  singletons.
- **Any lifetime may be overridden**, and keeps its lifetime. A scoped
  Token overridden gives the value in every Scope.
- **The value must match the Token's type**, and the Token must be provided.
- **The Container does not dispose of the value.** You passed it in, so you
  own it, as with a Slot's value.

## Fake a Slot: pass it to `createScope`

A Slot's value already comes from outside, so it is never overridden:
`app.override(Principal, …)` fails to compile with
`Token 'principal' is a Slot: pass its value to createScope instead`. Give the
fake to the Scope:

```ts
await using scope = app.createScope({ principal: { id: 'test-user', roles: ['admin'] } });
const audit = await scope.resolve(Audit);
```

## Check the boot

`init()` creates every singleton, so a test can check that the whole graph
builds with the fakes in place:

```ts
await using faked = app.override(Db, fakeDb);
await faked.init();
```
