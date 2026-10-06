import {
	type Container,
	container,
	defineModule,
	type Module,
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
const Repo = token<string>()('repo');
const Principal = token<User>()('principal');
const Audit = token<string>()('audit');

declare const db: Db;
/** Returns `value` once `dependency` was awaited. */
const after = <T>(_dependency: unknown, value: T): T => value;

// A Module states what it needs, one map each, and its type lists what it adds.
const data = defineModule<{ singletons: { config: Config } }>()((c) =>
	c
		.provide(Database, async ({ get }) => after(await get(Settings), db))
		.provide(Repo, () => 'repo', { lifetime: 'scoped' }),
);
export type Data = Expect<
	Equal<
		typeof data,
		Module<
			{ singletons: { config: Config } },
			{ db: Db },
			{ repo: string },
			NoTokens
		>
	>
>;
const web = defineModule<{
	scoped: { repo: string };
	slots: { principal: User };
}>()((c) =>
	c.provide(
		Audit,
		async ({ get }) => `${(await get(Principal)).id}:${await get(Repo)}`,
		{ lifetime: 'scoped' },
	),
);

// Inside build, only the requirements are visible.
defineModule<{ singletons: { config: Config } }>()((c) =>
	c.provide(Audit, async ({ get }) => {
		// @ts-expect-error Token 'db' is not provided
		await get(Database);
		return 'x';
	}),
);
// probe: a requirement is.
defineModule<{ singletons: { config: Config } }>()((c) =>
	c.provide(Audit, async ({ get }) => (await get(Settings)).url),
);
// A singleton requirement is a singleton inside: no captive through a Module.
defineModule<{ scoped: { repo: string } }>()((c) =>
	c.provide(Audit, async ({ get }) => {
		// @ts-expect-error Token 'repo' is scoped, captured by a singleton
		return get(Repo);
	}),
);

const base = container()
	.provide(Settings, () => ({ url: 'x' }))
	.slot(Principal);

// `use` adds what the Module provides, to what comes after.
const app = base.use(data).use(web);
export type App = Expect<
	Equal<
		typeof app,
		Container<
			{ config: Config; db: Db },
			{ principal: User; repo: string; audit: string },
			{ principal: User }
		>
	>
>;

// A missing requirement is refused...
// @ts-expect-error Module needs Token 'repo', which is not provided
base.use(web);
// @ts-expect-error Module needs Token 'config', which is not provided
container().use(data);
// probe: met, in order, it compiles.
base.use(data).use(web);

// ...and so is one with another value type,
const wrongConfig = container().provide(token<string>()('config'), () => 'x');
// @ts-expect-error Module needs Token 'config' with another value type
wrongConfig.use(data);
// ...a singleton requirement met only by a scoped entry (captive safety),
container()
	.provide(Settings, () => ({ url: 'x' }), { lifetime: 'scoped' })
	// @ts-expect-error Module needs Token 'config' as a singleton, but it is scoped
	.use(data);
// ...a Slot requirement met by a scoped Provider,
container()
	.provide(Settings, () => ({ url: 'x' }))
	.provide(Principal, () => ({ id: 'u' }), { lifetime: 'scoped' })
	.use(data)
	// @ts-expect-error Module needs Token 'principal' as a Slot
	.use(web);
// ...and a Module that adds a name the Container already has.
// @ts-expect-error Module provides Token 'db', which is already provided
base.provide(Database, () => db).use(data);
// probe: a scoped requirement may be met by a singleton.
container()
	.provide(Settings, () => ({ url: 'x' }))
	.provide(Repo, () => 'repo')
	.slot(Principal)
	.use(web);
