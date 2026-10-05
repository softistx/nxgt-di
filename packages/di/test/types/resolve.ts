import { type Container, container, token } from '../../src/index';
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

// A Container is AsyncDisposable, so `await using` takes it.
export const disposable: AsyncDisposable = app;
// @ts-expect-error it is not synchronously Disposable
export const notSync: Disposable = app;
