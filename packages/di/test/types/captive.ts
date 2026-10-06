import {
	type Container,
	container,
	type Lifetime,
	type NoTokens,
	token,
} from '../../src/index';
import type { Equal, Expect } from './assert';
import type { Config, Db, Users } from './fixtures';

const Settings = token<Config>()('config');
const Database = token<Db>()('db');
const UserRepo = token<Users>()('users');
const RequestId = token<string>()('requestId');

declare const db: Db;
declare const users: Users;
/** Returns `value` once `dependency` was awaited. */
const after = <T>(_dependency: unknown, value: T): T => value;

// Each Provider lands in the map its lifetime counts as.
const app = container()
	.provide(Settings, () => ({ url: 'x' }))
	.provide(RequestId, () => 'r', { lifetime: 'scoped' })
	.provide(Database, () => db, { lifetime: 'transient' })
	.provide(UserRepo, () => users, { lifetime: 'transient', bound: 'scoped' });
export type Maps = Expect<
	Equal<
		typeof app,
		Container<
			{ config: Config; db: Db },
			{ requestId: string; users: Users },
			NoTokens
		>
	>
>;

const base = container()
	.provide(Settings, () => ({ url: 'x' }))
	.provide(RequestId, () => 'r', { lifetime: 'scoped' });

// A singleton that depends on a scoped value is a Captive dependency.
base.provide(Database, async ({ get }) => {
	// @ts-expect-error Token 'requestId' is scoped, captured by a singleton
	await get(RequestId);
	return db;
});
// probe: a singleton may depend on a singleton...
base.provide(Database, async ({ get }) => (await get(Settings)) && db);
// ...and a scoped Provider on a scoped value.
base.provide(Database, async ({ get }) => after(await get(RequestId), db), {
	lifetime: 'scoped',
});

// A transient counts by its bound: bound to singleton (the default), it is
// captured by singletons, so it may not see scoped values either.
base.provide(
	Database,
	async ({ get }) => {
		// @ts-expect-error Token 'requestId' is scoped, captured by a singleton
		await get(RequestId);
		return db;
	},
	{ lifetime: 'transient' },
);
// probe: bound to scoped, it may.
base.provide(Database, async ({ get }) => after(await get(RequestId), db), {
	lifetime: 'transient',
	bound: 'scoped',
});

// A transient bound to scoped counts as scoped: a singleton cannot capture
// it, which is how a singleton is kept from reaching a scoped value through
// a transient.
const viaTransient = base.provide(
	UserRepo,
	async ({ get }) => after(await get(RequestId), users),
	{ lifetime: 'transient', bound: 'scoped' },
);
viaTransient.provide(Database, async ({ get }) => {
	// @ts-expect-error Token 'users' is scoped, captured by a singleton
	await get(UserRepo);
	return db;
});
// probe: a transient bound to singleton may be captured by a singleton.
base
	.provide(UserRepo, () => users, { lifetime: 'transient' })
	.provide(Database, async ({ get }) => (await get(UserRepo)) && db);

// `bound` is only allowed with lifetime 'transient'.
base.provide(Database, () => db, {
	lifetime: 'singleton',
	// @ts-expect-error bound is only allowed with lifetime transient
	bound: 'scoped',
});
base.provide(Database, () => db, {
	lifetime: 'scoped',
	// @ts-expect-error bound is only allowed with lifetime transient
	bound: 'singleton',
});
// @ts-expect-error bound is only allowed with lifetime transient (the default is singleton)
base.provide(Database, () => db, { bound: 'scoped' });
// probe: with 'transient', either bound compiles.
base.provide(Database, () => db, { lifetime: 'transient', bound: 'singleton' });

// The Container itself resolves only singletons: a scoped value needs a Scope.
// @ts-expect-error Token 'requestId' is scoped: resolve it from a Scope made by createScope
base.resolve(RequestId);
// @ts-expect-error a transient bound to scoped needs a Scope as well
viaTransient.resolve(UserRepo);
// probe: a singleton resolves from the Container, and a scoped value from a Scope.
base.resolve(Settings);
base.createScope().resolve(RequestId);

// A lifetime typed as a union counts as scoped and sees singletons only: the
// conservative side both ways.
declare const someLifetime: 'singleton' | 'scoped';
const unsure = base.provide(Database, () => db, { lifetime: someLifetime });
// @ts-expect-error 'db' might be scoped, so the Container does not resolve it
unsure.resolve(Database);
base.provide(
	Database,
	async ({ get }) => {
		// @ts-expect-error 'requestId' is not visible to what might be a singleton
		await get(RequestId);
		return db;
	},
	{ lifetime: someLifetime },
);
// probe: a Scope resolves it.
unsure.createScope().resolve(Database);

// An `undefined` lifetime means singleton, as at runtime.
const undefinedLifetime = base.provide(Database, () => db, {
	lifetime: undefined,
});
export type UndefinedIsSingleton = Expect<
	Equal<
		typeof undefinedLifetime,
		Container<{ config: Config; db: Db }, { requestId: string }, NoTokens>
	>
>;
// A `Lifetime | undefined` variable compiles, and counts as scoped, like any
// union of lifetimes.
declare const maybeLifetime: Lifetime | undefined;
const maybe = base.provide(Database, () => db, { lifetime: maybeLifetime });
// @ts-expect-error 'db' might be scoped, so the Container does not resolve it
maybe.resolve(Database);
// probe: a Scope does.
maybe.createScope().resolve(Database);
// But options whose lifetime may be left out cannot say 'transient': the
// runtime would read singleton.
declare const loose: { lifetime?: 'transient' };
// @ts-expect-error lifetime is required for a transient
base.provide(Database, () => db, loose);
// probe: a required 'transient' compiles.
declare const firm: { lifetime: 'transient' };
base.provide(Database, () => db, firm);
