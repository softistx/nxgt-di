import { describe, expect, test } from 'bun:test';
import { ContainerDisposedError } from '../errors/errors';
import { token } from '../token/token';
import { container } from './container';

const A = token<string>()('a');
const B = token<string>()('b');

/** A promise and the function that settles it. */
function gate() {
	let open = () => {};
	let fail = (_: Error) => {};
	const promise = new Promise<void>((resolve, reject) => {
		open = resolve;
		fail = reject;
	});
	return { promise, open, fail };
}

/** Whether `promise` has settled once pending callbacks have run. */
async function settled(promise: Promise<unknown>): Promise<boolean> {
	let done = false;
	promise.then(
		() => {
			done = true;
		},
		() => {
			done = true;
		},
	);
	for (let i = 0; i < 10; i++) await Promise.resolve();
	return done;
}

describe('dispose, with factories still running', () => {
	test('waits for a pending factory, and finishes once it settles', async () => {
		const log: string[] = [];
		const { promise, open } = gate();
		const app = container().provide(
			A,
			async () => {
				await promise;
				return 'late';
			},
			{ dispose: (value) => void log.push(value) },
		);
		const pending = app.resolve(A).catch((e) => e);
		const disposal = app[Symbol.asyncDispose]();
		expect(await settled(disposal)).toBe(false);
		open();
		await disposal;
		expect(log).toEqual(['late']);
		expect(await pending).toBeInstanceOf(ContainerDisposedError);
	});

	test('a transient that arrives after disposal began is disposed, and its resolve rejects', async () => {
		const log: string[] = [];
		const { promise, open } = gate();
		const app = container().provide(
			A,
			async () => {
				await promise;
				return 'late transient';
			},
			{ lifetime: 'transient', dispose: (value) => void log.push(value) },
		);
		const pending = app.resolve(A);
		const disposal = app[Symbol.asyncDispose]();
		open();
		await expect(pending).rejects.toBeInstanceOf(ContainerDisposedError);
		await disposal;
		expect(log).toEqual(['late transient']);
	});

	test('a factory that calls get after disposal began is rejected', async () => {
		const { promise, open } = gate();
		const app = container()
			.provide(A, () => 'a')
			.provide(B, async ({ get }) => {
				await promise;
				return `b(${await get(A)})`;
			});
		const pending = app.resolve(B).catch((e) => e);
		const disposal = app[Symbol.asyncDispose]();
		open();
		await disposal;
		const error = await pending;
		expect(error).toBeInstanceOf(ContainerDisposedError);
		expect(error.token).toBe('a');
	});

	test('a pending factory that then fails does not fail the disposal', async () => {
		const { promise, fail } = gate();
		const app = container().provide(A, async () => {
			await promise;
			return 'never';
		});
		const pending = app.resolve(A);
		const disposal = app[Symbol.asyncDispose]();
		fail(new Error('connect failed'));
		await expect(pending).rejects.toThrow('connect failed');
		await expect(disposal).resolves.toBeUndefined();
	});
});
