import {
	type Container,
	container,
	type NoTokens,
	token,
} from '../../src/index';
import type { Equal, Expect } from './assert';
import type { Config, Db } from './fixtures';

interface User {
	readonly id: string;
}
const Settings = token<Config>()('config');
const Database = token<Db>()('db');
const RequestId = token<string>()('requestId');
const Principal = token<User>()('principal');

declare const db: Db;
declare const fakeDb: Db;

const app = container()
	.provide(Settings, () => ({ url: 'x' }))
	.provide(Database, () => db, { lifetime: 'transient' })
	.provide(RequestId, () => 'r', { lifetime: 'scoped' })
	.slot(Principal);

// An override keeps the Container's type, whatever the lifetime overridden.
const faked = app
	.override(Settings, { url: 'fake' })
	.override(Database, fakeDb)
	.override(RequestId, 'fixed');
export type SameType = Expect<Equal<typeof faked, typeof app>>;
export type Listed = Expect<
	Equal<
		typeof faked,
		Container<
			{ config: Config; db: Db },
			{ requestId: string; principal: User },
			{ principal: User }
		>
	>
>;

// The value must be the Token's value type.
// @ts-expect-error a string is not a Db
app.override(Database, 'not a db');
// probe: a Db is.
app.override(Database, fakeDb);

// A Token the Container lacks cannot be overridden.
// @ts-expect-error Token 'cache' is not provided
app.override(token<string>()('cache'), 'x');
// probe: a provided one can.
app.override(RequestId, 'x');

// A Slot is refused: its value is given to createScope, fake or not.
// @ts-expect-error Token 'principal' is a Slot: pass its value to createScope instead
app.override(Principal, { id: 'fake' });
// probe: the fake goes through createScope.
app.createScope({ principal: { id: 'fake' } });

// One Token at a time, as for resolve.
declare const either: boolean;
// @ts-expect-error resolve one Token at a time
app.override(either ? Settings : RequestId, 'x');
// probe: a single Token compiles.
app.override(Settings, { url: 'y' });

// init is a Promise of nothing, on any Container.
export type Init = Expect<Equal<ReturnType<typeof app.init>, Promise<void>>>;
export const empty: Promise<void> = container().init();
export const none: Container<NoTokens> = container().override(
	// @ts-expect-error an empty Container has nothing to override
	Settings,
	{ url: 'x' },
);
// probe: a Container that provides it can.
export const some = container()
	.provide(Settings, () => ({ url: 'x' }))
	.override(Settings, { url: 'y' });
