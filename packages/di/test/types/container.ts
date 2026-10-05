import { type Container, container, token } from '../../src/index';
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
