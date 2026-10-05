import { describe, expect, test } from 'bun:test';
import { token } from '../token/token';
import { container } from './container';

const Config = token<{ url: string }>()('config');
const Db = token<{ url: string; id: number }>()('db');
const Request = token<{ id: number }>()('request');

describe('resolve', () => {
	test('always returns a Promise, even for a sync factory', () => {
		const app = container().provide(Config, () => ({ url: 'x' }));
		expect(app.resolve(Config)).toBeInstanceOf(Promise);
	});

	test('a singleton is created once per Container', async () => {
		let made = 0;
		const app = container().provide(Config, () => ({ url: `x${++made}` }));
		const first = await app.resolve(Config);
		expect(await app.resolve(Config)).toBe(first);
		expect(made).toBe(1);
	});

	test('two Containers built from one chain do not share singletons', async () => {
		const base = container().provide(Config, () => ({ url: 'x' }));
		const extended = base.provide(Request, () => ({ id: 1 }));
		expect(await base.resolve(Config)).not.toBe(await extended.resolve(Config));
	});

	test('a transient is created on every resolve', async () => {
		let made = 0;
		const app = container().provide(Request, () => ({ id: ++made }), {
			lifetime: 'transient',
		});
		expect(await app.resolve(Request)).toEqual({ id: 1 });
		expect(await app.resolve(Request)).toEqual({ id: 2 });
	});

	test('a factory gets earlier Tokens through `get`, sync or async', async () => {
		let made = 0;
		const app = container()
			.provide(Config, async () => ({ url: 'mongodb://x' }))
			.provide(Db, async ({ get }) => ({ ...(await get(Config)), id: ++made }));
		expect(await app.resolve(Db)).toEqual({ url: 'mongodb://x', id: 1 });
		expect(await app.resolve(Db)).toEqual({ url: 'mongodb://x', id: 1 });
	});

	test('a factory error rejects the resolve, sync throw included', async () => {
		const app = container().provide(Config, () => {
			throw new Error('no config');
		});
		await expect(app.resolve(Config)).rejects.toThrow('no config');
	});

	test('a singleton whose factory failed is tried again', async () => {
		let calls = 0;
		const app = container().provide(Config, async () => {
			if (++calls === 1) throw new Error('down');
			return { url: 'x' };
		});
		await expect(app.resolve(Config)).rejects.toThrow('down');
		expect(await app.resolve(Config)).toEqual({ url: 'x' });
	});

	test('concurrent resolves of a singleton share one creation', async () => {
		let made = 0;
		const app = container().provide(Config, async () => {
			made++;
			await Promise.resolve();
			return { url: 'x' };
		});
		const [a, b] = await Promise.all([
			app.resolve(Config),
			app.resolve(Config),
		]);
		expect(a).toBe(b);
		expect(made).toBe(1);
	});

	test('concurrent resolves of a failing singleton share one run and one rejection', async () => {
		let calls = 0;
		const app = container().provide(Config, async () => {
			calls++;
			await Promise.resolve();
			if (calls === 1) throw new Error('down');
			return { url: 'x' };
		});
		const [a, b] = await Promise.all([
			app.resolve(Config).catch((e) => e),
			app.resolve(Config).catch((e) => e),
		]);
		expect(calls).toBe(1);
		expect(a).toBeInstanceOf(Error);
		expect(b).toBe(a);
		expect(await app.resolve(Config)).toEqual({ url: 'x' });
		expect(calls).toBe(2);
	});
});
