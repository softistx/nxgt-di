# @nxgt/di

Wire an application's services with typed Tokens: a missing or Captive
dependency fails to compile. No decorators, no `reflect-metadata`, and no
runtime dependency. It is Bun-first (ESM, tested with `bun test`) and uses no
Bun-only API, so it also runs on Node.

## Install

```sh
bun add @nxgt/di typescript
```

`typescript` (`^6.0.3`) is a **required** peer: the checks are in the types.
Your `tsconfig.json` needs:

```jsonc
{
  "compilerOptions": {
    "moduleResolution": "bundler", // `nodenext` is not supported
    "strict": true // strictFunctionTypes: provide order for annotated factories
  }
}
```

With `strictFunctionTypes` off, a factory whose parameter is annotated can
claim a Token that is provided further down, and the mistake only shows at
runtime.

## Usage

The snippets below build on each other: a Token declared in one is imported or
redeclared where it is used. `Database` stands for your own class.

### Tokens and Providers

A Token is a typed, named key; a Provider says how to make its value. A
factory sees only the Tokens provided before it, so a missing dependency, or
a cycle, fails to compile.

```ts
import { container, token } from '@nxgt/di';

declare class Database {
  static connect(url: string): Promise<Database>;
  close(): Promise<void>;
}

export const Config = token<{ url: string }>()('config');
export const Db = token<Database>()('db');

export const app = container()
  .provide(Config, () => ({ url: 'mongodb://localhost/app' }))
  .provide(Db, async ({ get }) => Database.connect((await get(Config)).url), {
    dispose: (db) => db.close(), // else Symbol.asyncDispose, else Symbol.dispose
  });

const db = await app.resolve(Db); // always a Promise; a singleton by default
```

A Token's name is its key in the Container's type: a second Token with a name
already provided fails to compile. Every `provide` returns a new Container.

### Lifetimes and the captive check

`lifetime` is `'singleton'` (the default, one per Container), `'scoped'` (one
per Scope) or `'transient'` (new on every resolve). A singleton must not hold
a scoped value: that is a Captive dependency, and it does not compile.

```ts
import { container, token } from '@nxgt/di';

const RequestId = token<string>()('requestId');
const Audit = token<{ requestId: string }>()('audit');

container()
  .provide(RequestId, () => crypto.randomUUID(), { lifetime: 'scoped' })
  // @ts-expect-error Token 'requestId' is scoped, captured by a singleton
  .provide(Audit, async ({ get }) => ({ requestId: await get(RequestId) }));
```

A transient declares the longest Lifetime that may capture it with
`bound: 'singleton' | 'scoped'`.

### Scopes and Slots

A Scope is a short-lived child of a Container, usually one per request. A Slot
is a scoped Token whose value comes from outside; every `createScope` must be
given each Slot, keyed by the Token's name.

```ts
import { container, token } from '@nxgt/di';

interface User {
  id: string;
}

const Principal = token<User>()('principal');
const Audit = token<{ who: string }>()('audit');

const web = container()
  .slot(Principal)
  .provide(Audit, async ({ get }) => ({ who: (await get(Principal)).id }), {
    lifetime: 'scoped', // once per Scope
  });

await using scope = web.createScope({ principal: { id: 'ada' } });
const audit = await scope.resolve(Audit);
```

A `createScope` missing a Slot fails to compile. A Scope disposes of what it
made, never the singletons; disposing the Container leaves live Scopes to
their owners.

### Modules

A Module is a reusable group of Providers that states which Tokens it needs.
`use` fails to compile if the Container does not provide them.

```ts
import { container, defineModule, token } from '@nxgt/di';

declare class Database {
  static connect(url: string): Promise<Database>;
}

const Config = token<{ url: string }>()('config');
const Db = token<Database>()('db');

const data = defineModule<{ singletons: { config: { url: string } } }>()((c) =>
  c.provide(Db, async ({ get }) => Database.connect((await get(Config)).url)),
);

const app = container()
  .provide(Config, () => ({ url: 'mongodb://localhost/app' }))
  .use(data); // without the Config line, this fails to compile
```

### Override in tests

`override` returns a new Container with one Token bound to a value you give;
the original is unchanged. The Container does not dispose of that value.

```ts
import { container, token } from '@nxgt/di';

interface Mailer {
  send(to: string): Promise<void>;
}

const Mail = token<Mailer>()('mail');

const app = container().provide(Mail, () => ({
  send: async (_to: string) => {
    /* talks to a real server */
  },
}));

const sent: string[] = [];
await using faked = app.override(Mail, { send: async (to) => void sent.push(to) });
await (await faked.resolve(Mail)).send('ada@example.com');
```

### Init and shutdown

Singletons are made on first resolve. `init()` makes them all at boot, in
provide order, so a failing connection stops the start-up. Disposing the
Container (or leaving an `await using` block) disposes of every value it made,
in reverse creation order.

```ts
import { container, token } from '@nxgt/di';

const Conn = token<{ close(): Promise<void> }>()('conn');

await using app = container().provide(Conn, async () => ({ close: async () => {} }), {
  dispose: (conn) => conn.close(),
});

await app.init(); // rejects with the first factory's error
// leaving the block disposes of everything; or call `await app[Symbol.asyncDispose]()`
```

## Exports

`@nxgt/di` is the only subpath.

| Export | Kind | What it is |
| --- | --- | --- |
| `container` | function | `container()` makes an empty Container; `provide`, `slot`, `use`, `override`, `resolve`, `init` and `createScope` are its methods |
| `token` | function | `token<T>()('name')` makes a Token |
| `defineModule` | function | `defineModule<Requirements>()(build)` makes a Module |
| `DiError` | class | base class of every error below except `DisposeError` |
| `TokenNotProvidedError` | class | see Errors |
| `DuplicateTokenNameError` | class | see Errors |
| `ContainerDisposedError` | class | see Errors |
| `ScopeDisposedError` | class | see Errors |
| `ScopeRequiredError` | class | see Errors |
| `MissingSlotError` | class | see Errors |
| `SlotOverrideError` | class | see Errors |
| `ModuleEscapedError` | class | see Errors |
| `DisposeError` | class | see Errors |
| `DiErrorCode` | type | the union of every `code` |
| `Container` | type | the Container, typed by its Singletons, Scoped and Slots maps |
| `NoTokens` | type | the map of an empty Container |
| `Scope` | type | what `createScope` returns |
| `Token` | type | a Token: its name and value type |
| `AnyToken` | type | any Token, for a helper of your own |
| `TokenValue` | type | reads a Token's value type back |
| `Lifetime` | type | `'singleton' \| 'scoped' \| 'transient'` |
| `Bound` | type | `'singleton' \| 'scoped'`, a transient's bound |
| `ProvideOptions` | type | the third argument of `provide`: `lifetime`, `bound`, `dispose` |
| `Factory` | type | a factory typed by what it may see, to declare one apart |
| `Resolver` | type | the `{ get }` a factory receives |
| `Module` | type | what `defineModule` returns |
| `Requirements` | type | the shape of a Module's requirements: `singletons`, `scoped`, `slots` |

## Errors

Every error carries a stable `code`: match on it or on the class, never on the
message. The compile errors, and each runtime one by its message, are in
[Troubleshooting](docs/troubleshooting.md).

| Class | `code` | Meaning |
| --- | --- | --- |
| `TokenNotProvidedError` | `DI_TOKEN_NOT_PROVIDED` | resolved a Token the Container does not provide |
| `DuplicateTokenNameError` | `DI_DUPLICATE_TOKEN_NAME` | two Tokens with one name (past a cast) |
| `ContainerDisposedError` | `DI_CONTAINER_DISPOSED` | used the Container after disposing it |
| `ScopeDisposedError` | `DI_SCOPE_DISPOSED` | resolved from a Scope after disposing it |
| `ScopeRequiredError` | `DI_SCOPE_REQUIRED` | resolved a scoped Token from the Container, not a Scope |
| `MissingSlotError` | `DI_SLOT_MISSING` | `createScope` was not given a Slot's value |
| `SlotOverrideError` | `DI_SLOT_OVERRIDE` | `override` of a Slot |
| `ModuleEscapedError` | `DI_MODULE_ESCAPED` | a Module's `build` returned a Container it was not given |
| `DisposeError` | `DI_DISPOSE_FAILED` | one or more `dispose` functions threw; holds every failure |

## Documentation

- [Documentation index](docs/README.md)
- Guides: [Tokens and Providers](docs/guide/tokens-and-providers.md),
  [Scopes and Slots](docs/guide/scopes-and-slots.md),
  [Modules](docs/guide/modules.md), [Testing](docs/guide/testing.md),
  [Lifecycle](docs/guide/lifecycle.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Roadmap](docs/roadmap.md)
