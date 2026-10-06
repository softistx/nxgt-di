import { describe, expect, test } from 'bun:test';
import { container } from '../container/container';
import type { Container } from '../container/types';
import { DuplicateTokenNameError, ModuleEscapedError } from '../errors/errors';
import { token } from '../token/token';
import { defineModule } from './define-module';

const Config = token<{ url: string }>()('config');
const Db = token<{ url: string }>()('db');
const Session = token<{ user: string }>()('session');
const Principal = token<string>()('principal');

const data = defineModule<{ singletons: { config: { url: string } } }>()((c) =>
	c.provide(Db, async ({ get }) => ({ url: (await get(Config)).url })),
);
const web = defineModule<{ slots: { principal: string } }>()((c) =>
	c.provide(Session, async ({ get }) => ({ user: await get(Principal) }), {
		lifetime: 'scoped',
	}),
);

describe('defineModule and use', () => {
	test('a Module’s Providers are added, and see what the Container has', async () => {
		const app = container()
			.provide(Config, () => ({ url: 'mongodb://x' }))
			.slot(Principal)
			.use(data)
			.use(web);
		expect(await app.resolve(Db)).toEqual({ url: 'mongodb://x' });
		const scope = app.createScope({ principal: 'ada' });
		expect(await scope.resolve(Session)).toEqual({ user: 'ada' });
	});

	test('use returns a new Container and leaves the original as it was', async () => {
		const base = container().provide(Config, () => ({ url: 'x' }));
		const app = base.use(data);
		expect(app).not.toBe(base);
		await expect(base.resolve(Db as never)).rejects.toThrow('not provided');
	});

	test('one Module may be used by several Containers', async () => {
		const a = container()
			.provide(Config, () => ({ url: 'a' }))
			.use(data);
		const b = container()
			.provide(Config, () => ({ url: 'b' }))
			.use(data);
		expect(await a.resolve(Db)).toEqual({ url: 'a' });
		expect(await b.resolve(Db)).toEqual({ url: 'b' });
	});

	test('a name the Container already has throws at runtime', () => {
		const base = container()
			.provide(Config, () => ({ url: 'x' }))
			.provide(Db, () => ({ url: 'y' }));
		expect(() => base.use(data as never)).toThrow(DuplicateTokenNameError);
	});

	test('a build that returns a Container of its own is refused', () => {
		const Repo = token<string>()('repo');
		const escaping = defineModule()((_c) =>
			container().provide(Repo, () => 'r'),
		);
		const app = container().provide(Config, () => ({ url: 'x' }));
		expect(() => app.use(escaping)).toThrow(ModuleEscapedError);
		expect(() => app.use(escaping)).toThrow(
			"A Module's build must return the Container it was given, with Providers added",
		);
	});

	test('a build that hands one app the Container it built for another is refused', async () => {
		type Built = Container<{ config: { url: string }; db: { url: string } }>;
		let kept: Built | undefined;
		const sticky = defineModule<{ singletons: { config: { url: string } } }>()(
			(c) => {
				kept ??= c.provide(Db, () => ({ url: 'db' }));
				return kept;
			},
		);
		const a = container()
			.provide(Config, () => ({ url: 'a' }))
			.use(sticky);
		expect(await a.resolve(Config)).toEqual({ url: 'a' });
		const b = container().provide(Config, () => ({ url: 'b' }));
		expect(() => b.use(sticky)).toThrow(ModuleEscapedError);
	});

	test('an override before use still counts as the same Container', async () => {
		const app = container()
			.provide(Config, () => ({ url: 'real' }))
			.override(Config, { url: 'fake' })
			.use(data);
		expect(await app.resolve(Db)).toEqual({ url: 'fake' });
	});

	test('a build that returns what it kept from an override of the same base is refused', async () => {
		let kept: unknown;
		const caching = defineModule<{ singletons: { config: { url: string } } }>()(
			(c) => {
				kept ??= c;
				return kept as typeof c;
			},
		);
		const base = container().provide(Config, () => ({ url: 'real' }));
		const sibling = base.override(Config, { url: 'A' });
		expect(await sibling.use(caching).resolve(Config)).toEqual({ url: 'A' });
		expect(() => base.use(caching)).toThrow(ModuleEscapedError);
	});

	test('a build that returns a sibling it kept, Providers and all, is refused', () => {
		const Other = token<string>()('other');
		let kept: unknown;
		const caching = defineModule<{ singletons: { config: { url: string } } }>()(
			(c) => {
				kept ??= c;
				return kept as typeof c;
			},
		);
		const base = container().provide(Config, () => ({ url: 'x' }));
		const sibling = base.provide(Other, () => 'other');
		expect(sibling.use(caching as never)).toBe(sibling as never);
		expect(() => base.use(caching)).toThrow(ModuleEscapedError);
	});
});
