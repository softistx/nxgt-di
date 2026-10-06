import { describe, expect, test } from 'bun:test';
import { ContainerDisposedError } from '../errors/errors';
import { token } from '../token/token';
import { container } from './container';

const A = token<string>()('a');
const B = token<string>()('b');
const S = token<string>()('s');
const T = token<string>()('t');

describe('init', () => {
	test('creates every singleton, in provide order, and nothing else', async () => {
		const made: string[] = [];
		const record = (name: string) => () => {
			made.push(name);
			return name;
		};
		const app = container()
			.provide(A, () => {
				made.push('a');
				return 'a';
			})
			.provide(S, record('s'), { lifetime: 'scoped' })
			.provide(T, record('t'), { lifetime: 'transient' })
			.provide(B, async ({ get }) => {
				made.push(`b(${await get(A)})`);
				return 'b';
			});
		await app.init();
		expect(made).toEqual(['a', 'b(a)']);
		await app.resolve(B);
		expect(made).toEqual(['a', 'b(a)']);
	});

	test('rejects with the first failing factory, and a later resolve retries', async () => {
		let attempts = 0;
		const made: string[] = [];
		const app = container()
			.provide(A, () => {
				if (++attempts === 1) throw new Error('connection refused');
				return 'a';
			})
			.provide(B, () => {
				made.push('b');
				return 'b';
			});
		await expect(app.init()).rejects.toThrow('connection refused');
		expect(made).toEqual([]);
		expect(await app.resolve(A)).toBe('a');
		await app.init();
		expect(made).toEqual(['b']);
	});

	test('rejects once the Container is disposed, even with no singleton', async () => {
		const withOne = container().provide(A, () => 'a');
		const empty = container();
		for (const app of [withOne, empty]) {
			await app[Symbol.asyncDispose]();
			const error = await app.init().catch((e) => e);
			expect(error).toBeInstanceOf(ContainerDisposedError);
			expect(error.message).toBe(
				'Cannot init: the Container has been disposed',
			);
		}
	});

	test('is bound', async () => {
		const { init } = container().provide(A, () => 'a');
		await init();
	});
});
