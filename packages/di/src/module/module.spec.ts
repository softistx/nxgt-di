import { describe, expect, test } from 'bun:test';
import { container } from '../container/container';
import { DuplicateTokenNameError } from '../errors/errors';
import { token } from '../token/token';
import { module } from './module';

const Config = token<{ url: string }>()('config');
const Db = token<{ url: string }>()('db');
const Session = token<{ user: string }>()('session');
const Principal = token<string>()('principal');

const data = module<{ singletons: { config: { url: string } } }>()((c) =>
	c.provide(Db, async ({ get }) => ({ url: (await get(Config)).url })),
);
const web = module<{ slots: { principal: string } }>()((c) =>
	c.provide(Session, async ({ get }) => ({ user: await get(Principal) }), {
		lifetime: 'scoped',
	}),
);

describe('module and use', () => {
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
});
