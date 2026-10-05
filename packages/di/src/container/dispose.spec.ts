import { describe, expect, test } from 'bun:test';
import { ContainerDisposedError, DisposeError } from '../errors/errors';
import { token } from '../token/token';
import { container } from './container';

const A = token<string>()('a');
const B = token<string>()('b');
const T = token<string>()('t');

/** A Container that records each dispose in `log`. */
function recorded(log: string[]) {
	let n = 0;
	const record = (value: string) => {
		log.push(value);
	};
	return container()
		.provide(A, () => 'a', { dispose: record })
		.provide(B, async ({ get }) => `b(${await get(A)})`, { dispose: record })
		.provide(T, async ({ get }) => `t${++n}(${await get(B)})`, {
			lifetime: 'transient',
			dispose: record,
		});
}

describe('dispose', () => {
	test('disposes in reverse creation order, transients included', async () => {
		const log: string[] = [];
		const app = recorded(log);
		await app.resolve(T);
		await app.resolve(T);
		await app[Symbol.asyncDispose]();
		expect(log).toEqual(['t2(b(a))', 't1(b(a))', 'b(a)', 'a']);
	});

	test('disposes only what was created', async () => {
		const log: string[] = [];
		const app = recorded(log);
		await app.resolve(A);
		await app[Symbol.asyncDispose]();
		expect(log).toEqual(['a']);
	});

	test('the Provider’s dispose wins over the value’s own', async () => {
		const log: string[] = [];
		const value = {
			[Symbol.asyncDispose]: async () => void log.push('async'),
		};
		const Res = token<typeof value>()('res');
		const app = container().provide(Res, () => value, {
			dispose: () => void log.push('option'),
		});
		await app.resolve(Res);
		await app[Symbol.asyncDispose]();
		expect(log).toEqual(['option']);
	});

	test('without one, Symbol.asyncDispose wins over Symbol.dispose', async () => {
		const log: string[] = [];
		const value = {
			[Symbol.asyncDispose]: async () => void log.push('async'),
			[Symbol.dispose]: () => void log.push('sync'),
		};
		const Res = token<typeof value>()('res');
		const app = container().provide(Res, () => value);
		await app.resolve(Res);
		await app[Symbol.asyncDispose]();
		expect(log).toEqual(['async']);
	});

	test('failing those, Symbol.dispose is called, with the value as this', async () => {
		const value = {
			disposed: false,
			[Symbol.dispose]() {
				this.disposed = true;
			},
		};
		const Res = token<typeof value>()('res');
		const app = container().provide(Res, () => value);
		await app.resolve(Res);
		await app[Symbol.asyncDispose]();
		expect(value.disposed).toBe(true);
	});

	test('a value with nothing to dispose, or none at all, is left alone', async () => {
		const Num = token<number>()('num');
		const Nil = token<null>()('nil');
		const app = container()
			.provide(Num, () => 1)
			.provide(Nil, () => null);
		await app.resolve(Num);
		await app.resolve(Nil);
		await expect(app[Symbol.asyncDispose]()).resolves.toBeUndefined();
	});

	test('disposing twice does nothing', async () => {
		const log: string[] = [];
		const app = recorded(log);
		await app.resolve(B);
		await Promise.all([app[Symbol.asyncDispose](), app[Symbol.asyncDispose]()]);
		await app[Symbol.asyncDispose]();
		expect(log).toEqual(['b(a)', 'a']);
	});

	test('a resolve after disposal rejects, naming the Token', async () => {
		const app = recorded([]);
		await app.resolve(A);
		await app[Symbol.asyncDispose]();
		const error = await app.resolve(A).catch((e) => e);
		expect(error).toBeInstanceOf(ContainerDisposedError);
		expect(error.message).toBe(
			"Cannot resolve Token 'a': the Container has been disposed",
		);
	});

	test('a failing dispose does not stop the rest; all failures are thrown together', async () => {
		const log: string[] = [];
		const C = token<string>()('c');
		const app = container()
			.provide(A, () => 'a', { dispose: () => void log.push('a') })
			.provide(B, () => 'b', {
				dispose: () => {
					throw new Error('b failed');
				},
			})
			.provide(C, () => 'c', {
				dispose: async () => {
					throw new Error('c failed');
				},
			});
		await app.resolve(A);
		await app.resolve(B);
		await app.resolve(C);
		const error = await app[Symbol.asyncDispose]().catch((e) => e);
		expect(error).toBeInstanceOf(DisposeError);
		expect(error.tokens).toEqual(['c', 'b']);
		expect(error.errors.map((e: Error) => e.message)).toEqual([
			'c failed',
			'b failed',
		]);
		expect(log).toEqual(['a']);
		// The second call does not throw what the first one reported.
		await expect(app[Symbol.asyncDispose]()).resolves.toBeUndefined();
	});

	test('a value still being made when disposal begins is disposed, and its resolve rejects', async () => {
		const log: string[] = [];
		let release = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const app = container().provide(
			A,
			async () => {
				await gate;
				return 'late';
			},
			{ dispose: (value) => void log.push(value) },
		);
		const pending = app.resolve(A);
		const disposal = app[Symbol.asyncDispose]();
		release();
		await expect(pending).rejects.toBeInstanceOf(ContainerDisposedError);
		await disposal;
		expect(log).toEqual(['late']);
	});
});
