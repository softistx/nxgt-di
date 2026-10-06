import {
	type Container,
	container,
	type NoTokens,
	token,
} from '../../src/index';
import type { Config, Db } from './fixtures';

const Database = token<Db>()('db');
const Settings = token<Config>()('config');

declare const db: Db;

// A Container's type is exact: one that lacks a Token is not one that has it.
// @ts-expect-error an empty Container does not provide 'db'
export const empty: Container<{ db: Db }> = container();
// probe: once 'db' is provided, it is.
export const ok: Container<{ db: Db }> = container().provide(
	Database,
	() => db,
);

// Nor is one whose name maps to another value type.
// @ts-expect-error 'db' is provided as a Db, not a Config
export const otherValue: Container<{ db: Config }> = container().provide(
	Database,
	() => db,
);
// probe: the matching value type compiles.
export const sameValue: Container<{ config: Config }> = container().provide(
	Settings,
	() => ({ url: 'x' }),
);

// The same holds when the Container is passed to a function.
async function boot(app: Container<{ db: Db }>): Promise<Db> {
	return app.resolve(Database);
}
// @ts-expect-error an empty Container does not provide 'db'
boot(container());
// probe: one that provides it compiles.
boot(container().provide(Database, () => db));

// An `any` Token gets past `provide`'s parameter, but not its result: what
// comes back is a refusal, not a Container that would resolve anything.
declare const anything: any;
const viaAny = container().provide(anything, () => db);
// @ts-expect-error a Token name must be exactly one string literal
viaAny.resolve(Database);
// probe: a real Token gives a Container that resolves.
container()
	.provide(Database, () => db)
	.resolve(Database);

// Two Containers that differ only in a lifetime are not interchangeable: a
// scoped 'db' is no singleton 'db', either way round.
const scopedDb = container().provide(Database, () => db, {
	lifetime: 'scoped',
});
// @ts-expect-error 'db' is scoped here, not a singleton
export const asSingleton: Container<{ db: Db }> = scopedDb;
// @ts-expect-error 'db' is a singleton here, not scoped
export const asScoped: Container<NoTokens, { db: Db }> = container().provide(
	Database,
	() => db,
);
// probe: the matching maps compile.
export const scopedOk: Container<NoTokens, { db: Db }> = scopedDb;

// Nor do two that differ only in Slots: a Slot is not a scoped Provider.
const slotDb = container().slot(Database);
// @ts-expect-error 'db' is a Slot here, which createScope must be given
export const slotAsScoped: Container<NoTokens, { db: Db }> = slotDb;
// @ts-expect-error 'db' is a scoped Provider here, not a Slot
export const scopedAsSlot: Container<NoTokens, { db: Db }, { db: Db }> =
	scopedDb;
// probe: the matching maps compile.
export const slotOk: Container<NoTokens, { db: Db }, { db: Db }> = slotDb;
