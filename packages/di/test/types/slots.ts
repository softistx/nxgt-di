import {
	type Container,
	container,
	type NoTokens,
	token,
} from '../../src/index';
import type { Equal, Expect } from './assert';
import type { Db } from './fixtures';

interface User {
	readonly id: string;
}
const Principal = token<User>()('principal');
const Tenant = token<string>()('tenant');
const Database = token<Db>()('db');

declare const db: Db;
declare const user: User;

const app = container()
	.provide(Database, () => db)
	.slot(Principal)
	.slot(Tenant);

// A Slot is a scoped entry, and listed in the Container's Slots.
export type Maps = Expect<
	Equal<
		typeof app,
		Container<
			{ db: Db },
			{ principal: User; tenant: string },
			{ principal: User; tenant: string }
		>
	>
>;

// createScope takes a value for every Slot, keyed by Token name.
// @ts-expect-error Slot 'tenant' is missing
app.createScope({ principal: user });
// @ts-expect-error no Slots given at all
app.createScope();
// @ts-expect-error 'role' is not a Slot of this Container
app.createScope({ principal: user, tenant: 't', role: 'admin' });
// @ts-expect-error the 'tenant' Slot is a string
app.createScope({ principal: user, tenant: 42 });
// probe: exactly the Slots, with their value types, compile.
app.createScope({ principal: user, tenant: 't' });

// An extra key is refused from a variable too, not only from a literal.
const extra = { principal: user, tenant: 't', role: 'admin' };
// @ts-expect-error 'role' is not a Slot of this Container
app.createScope(extra);
// probe: a variable holding exactly the Slots compiles.
const exact = { principal: user, tenant: 't' };
app.createScope(exact);

// A Container with no Slot takes no argument, or an empty object.
const plain = container().provide(Database, () => db);
plain.createScope();
plain.createScope({});
// @ts-expect-error 'principal' is not a Slot of this Container
plain.createScope({ principal: user });

// A Slot's name is taken like any other.
// @ts-expect-error Token name 'db' is already provided
app.slot(token<Db>()('db'));
// probe: a fresh name compiles.
app.slot(token<Db>()('replica'));

// A Slot is scoped: a singleton may not capture it, a scoped Provider may.
app.provide(token<string>()('greeting'), async ({ get }) => {
	// @ts-expect-error Token 'principal' is scoped, captured by a singleton
	return (await get(Principal)).id;
});
app.provide(
	token<string>()('greeting'),
	async ({ get }) => (await get(Principal)).id,
	{ lifetime: 'scoped' },
);

// A Slot name must be one literal, as for provide.
declare const wide: import('../../src/index').Token<string, User>;
// @ts-expect-error a Token name must be exactly one string literal
container().slot(wide);
// probe: a literal compiles.
container().slot(Principal);

export const none: Container<
	NoTokens,
	{ principal: User },
	{ principal: User }
> = container().slot(Principal);
