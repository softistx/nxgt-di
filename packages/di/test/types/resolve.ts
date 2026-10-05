import {
	type AnyToken,
	type Container,
	container,
	type Token,
	token,
} from '../../src/index';
import type { Equal, Expect } from './assert';
import type { Db, Users } from './fixtures';

const Database = token<Db>()('db');
const UserRepo = token<Users>()('users');

declare const db: Db;
declare const users: Users;

const app = container()
	.provide(Database, () => db)
	.provide(UserRepo, async () => users, { lifetime: 'transient' });

// `resolve` always returns a Promise, whatever the factory and the lifetime.
const syncSingleton = app.resolve(Database);
const asyncTransient = app.resolve(UserRepo);
export type SyncFactory = Expect<Equal<typeof syncSingleton, Promise<Db>>>;
export type AsyncFactory = Expect<Equal<typeof asyncTransient, Promise<Users>>>;

// So does `get`, inside a factory.
container()
	.provide(Database, () => db)
	.provide(UserRepo, ({ get }) => {
		const pending = get(Database);
		const isPromise: Expect<Equal<typeof pending, Promise<Db>>> = true;
		return isPromise && users;
	});

// The Container's type lists what it provides, by name.
export type Listed = Expect<
	Equal<typeof app, Container<{ db: Db; users: Users }>>
>;

// A Token the Container does not provide does not compile.
const Cache = token<Map<string, string>>()('cache');
// @ts-expect-error 'cache' is not provided
app.resolve(Cache);
// probe: a Token it provides compiles.
app.resolve(Database);

// Nor does another Token of the same name and another value type.
const WrongDatabase = token<string>()('db');
// @ts-expect-error 'db' is provided as a Db, not a string
app.resolve(WrongDatabase);
// probe: another Token of the same name and value type compiles; the
// runtime still refuses it, since identity is the Symbol.
app.resolve(token<Db>()('db'));

// A union of Tokens is refused: its value would be a union with no way to
// tell which, and a missing member would slip through beside a provided one.
declare const either: boolean;
// @ts-expect-error resolve one Token at a time
app.resolve(either ? Database : Cache);
// probe: each Token on its own compiles, provided.
export const one = either ? app.resolve(Database) : app.resolve(UserRepo);

// A Token of `never` is reported like any other: not provided...
const Nothing = token<never>()('nothing');
// @ts-expect-error 'nothing' is not provided
app.resolve(Nothing);
// probe: ...and once provided (a factory that always throws), it resolves.
container()
	.provide(Nothing, () => {
		throw new Error('never made');
	})
	.resolve(Nothing);
// With a provided name, the refusal is the value type instead.
// @ts-expect-error 'db' is provided with another value type
app.resolve(token<never>()('db'));

// Something that is not a Token with one name is refused, and says so.
declare const unnamed: Token<never, Db>;
declare const someToken: AnyToken;
// @ts-expect-error not a resolvable Token
app.resolve(unnamed);
// @ts-expect-error not a resolvable Token
app.resolve(someToken);
// probe: the Token itself compiles.
app.resolve(Database);

// `resolve` is bound: it may be taken off the Container.
const { resolve } = app;
export type Bound = Expect<
	Equal<ReturnType<typeof resolve<typeof Database>>, Promise<Db>>
>;

// A Container is AsyncDisposable, so `await using` takes it.
export const disposable: AsyncDisposable = app;
// @ts-expect-error it is not synchronously Disposable
export const notSync: Disposable = app;
