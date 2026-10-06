import { container, type Token, token } from '../../src/index';
import type { Config, Db, Users } from './fixtures';

const Settings = token<Config>()('config');
const Database = token<Db>()('db');
const UserRepo = token<Users>()('users');

declare const db: Db;
declare const users: Users;

// A factory sees the Tokens provided before it.
export const ordered = container()
	.provide(Settings, () => ({ url: 'mongodb://localhost' }))
	.provide(Database, async ({ get }) => {
		const { url }: Config = await get(Settings);
		return url ? db : db;
	})
	.provide(UserRepo, async ({ get }) => (await get(Database)) && users);

// A dependency provided AFTER its dependent does not compile...
export const reversed = container()
	// @ts-expect-error 'db' is not provided yet when 'users' is
	.provide(UserRepo, async ({ get }) => (await get(Database)) && users)
	.provide(Database, () => db);
// probe: ...and the same two, in dependency order, do.
export const inOrder = container()
	.provide(Database, () => db)
	.provide(UserRepo, async ({ get }) => (await get(Database)) && users);

// A dependency never provided at all does not compile.
container().provide(UserRepo, async ({ get }) => {
	// @ts-expect-error 'db' is never provided
	await get(Database);
	return users;
});
// probe: providing it first fixes it.
container()
	.provide(Database, () => db)
	.provide(UserRepo, async ({ get }) => {
		await get(Database);
		return users;
	});

// A factory cannot see its own Token, so a cycle cannot be written.
container().provide(Database, async ({ get }) => {
	// @ts-expect-error a factory does not see the Token it provides
	return get(Database);
});
// probe: once provided, a later factory may resolve it.
container()
	.provide(Database, () => db)
	.provide(UserRepo, async ({ get }) => (await get(Database)) && users);

// A second Token with a name already provided does not compile, even when it
// is a different Token object.
const OtherDatabase = token<Db>()('db');
container()
	.provide(Database, () => db)
	// @ts-expect-error Token name 'db' is already provided
	.provide(OtherDatabase, () => db);
// probe: a distinct name compiles.
const ReplicaDatabase = token<Db>()('replica');
container()
	.provide(Database, () => db)
	.provide(ReplicaDatabase, () => db);

// A union of names holding a taken one is refused whole, not member by member.
declare const Either: Token<'db' | 'replica', Db>;
container()
	.provide(Database, () => db)
	// @ts-expect-error a Token name must be exactly one string literal
	.provide(Either, () => db);
// probe: the replica alone, a free name, compiles.
container()
	.provide(Database, () => db)
	.provide(ReplicaDatabase, () => db);

// A Token whose name is widened to `string`, or a pattern, would key every
// name at once, and resolve anything after. It is refused.
declare const wide: Token<string, Db>;
declare const pattern: Token<`db-${string}`, Db>;
// @ts-expect-error a Token name must be exactly one string literal
container().provide(wide, () => db);
// @ts-expect-error a Token name must be exactly one string literal
container().provide(pattern, () => db);
// probe: a Token whose name is one literal compiles.
declare const narrow: Token<'db-main', Db>;
container().provide(narrow, () => db);

// A factory must return the Token's value type, sync or async.
container()
	// @ts-expect-error a Config is not a Db
	.provide(Database, () => ({ url: 'x' }));
container()
	// @ts-expect-error nor is a Promise of one
	.provide(Database, async () => ({ url: 'x' }));
// probe: a Db, or a Promise of one, is.
container()
	.provide(Database, () => db)
	.provide(ReplicaDatabase, async () => db);

// `dispose` is handed the value, and `lifetime` takes the two of this slice.
container().provide(Database, () => db, {
	lifetime: 'transient',
	// @ts-expect-error the value is a Db, which has no `close`
	dispose: (value) => value.close(),
});
// probe: a dispose that uses what a Db has compiles.
container().provide(Database, () => db, {
	lifetime: 'singleton',
	dispose: async (value) => {
		await value.query('select 1');
	},
});

// A lifetime is one of the three.
container().provide(Database, () => db, {
	// @ts-expect-error 'request' is not a Lifetime
	lifetime: 'request',
});
// probe: 'scoped' and 'transient' are.
container().provide(Database, () => db, { lifetime: 'scoped' });
container().provide(Database, () => db, { lifetime: 'transient' });
